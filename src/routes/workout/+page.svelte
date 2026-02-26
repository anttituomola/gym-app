<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { EXERCISES, DEFAULT_WORKOUT_A, DEFAULT_WORKOUT_B, getExerciseById, getPlateWeightPerSide, BAR_WEIGHT } from '$lib/data/exercises';
  import type { WorkoutSet, PlannedExercise, UserExerciseSettings } from '$lib/types';
  import type { ModificationResponse } from '$lib/types/ai';
  import { generateAllSets } from '$lib/utils/warmup';
  import { navVisibilityStore, convex, api, authStore } from '$lib/convex';
  import { aiSettingsStore, aiAvailable } from '$lib/stores/aiSettings';
  import WorkoutModificationModal from '$lib/components/WorkoutModificationModal.svelte';
  
  // Demo user data - will come from Convex
  const USER_ID = 'demo-user';
  
  // Default weights for demo
  const defaultWeights: Record<string, UserExerciseSettings> = {
    squat: { currentWeight: 80, weightUnit: 'kg', successCount: 0, failureCount: 0, incrementKg: 2.5, deloadAfterFailures: 3, deloadPercent: 0.1 },
    'bench-press': { currentWeight: 60, weightUnit: 'kg', successCount: 0, failureCount: 0, incrementKg: 2.5, deloadAfterFailures: 3, deloadPercent: 0.1 },
    'barbell-row': { currentWeight: 55, weightUnit: 'kg', successCount: 0, failureCount: 0, incrementKg: 2.5, deloadAfterFailures: 3, deloadPercent: 0.1 },
    'overhead-press': { currentWeight: 40, weightUnit: 'kg', successCount: 0, failureCount: 0, incrementKg: 1.25, deloadAfterFailures: 3, deloadPercent: 0.1 },
    deadlift: { currentWeight: 100, weightUnit: 'kg', successCount: 0, failureCount: 0, incrementKg: 5, deloadAfterFailures: 3, deloadPercent: 0.1 },
    'pull-up': { currentWeight: 0, weightUnit: 'kg', successCount: 0, failureCount: 0, incrementKg: 2.5, deloadAfterFailures: 3, deloadPercent: 0.1, useBodyweightProgression: true, targetReps: 8, incrementReps: 1 },
    'hanging-knee-raise': { currentWeight: 0, weightUnit: 'kg', successCount: 0, failureCount: 0, incrementKg: 2.5, deloadAfterFailures: 3, deloadPercent: 0.1, useBodyweightProgression: true, targetReps: 10, incrementReps: 2 },
  };
  
  let workoutType = '';
  let plan: PlannedExercise[] = [];
  let sets: WorkoutSet[] = [];
  let workoutStarted = false;
  let showCompleteConfirm = false;
  let userEquipment: string[] = ['barbell', 'squat-rack', 'bench', 'pull-up-bar'];
  let userExerciseWeights: Record<string, UserExerciseSettings> = {};
  
  // View state: 'overview' or 'exercise'
  let viewMode: 'overview' | 'exercise' = 'overview';
  let activeExerciseId: string | null = null;
  
  // Modal states
  let showCancelModal = false;
  let showFinishEarlyModal = false;
  let showRestoreModal = false;
  let showModificationModal = false;
  let workoutModified = false;
  let modificationSummary = '';
  
  // Auto-save state
  const STORAGE_KEY = 'ongoingWorkout';
  let saveInterval: ReturnType<typeof setInterval> | null = null;
  
  // Rest timer
  let restEndTime: number | null = null;
  let restRemaining = 0;
  let restInterval: ReturnType<typeof setInterval> | null = null;
  let restSoundPlayed = false;
  const REST_TIME_SUCCESS = 180; // 3 minutes in seconds
  const REST_TIME_FAILURE = 300; // 5 minutes in seconds
  
  // Audio for rest timer completion
  function playRestCompleteSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    // Create a simple beep using AudioContext for better browser support
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      // Audio not supported
    }
  }
  
  // Audio for timer-based exercise completion (higher pitch ping)
  function playTimerCompleteSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 1200;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio not supported
    }
  }
  
  // Rep counting
  let completedRepsCount = 0;
  let tapCount = 0;
  let setIsComplete = false;
  
  // Timer-based exercise state
  let exerciseTimerRemaining = 0;
  let exerciseTimerInterval: ReturnType<typeof setInterval> | null = null;
  let isTimerRunning = false;
  let timerCompleted = false;
  
  // Derived values for exercise view
  $: exerciseSets = activeExerciseId 
    ? sets.filter(s => s.exerciseId === activeExerciseId).sort((a, b) => a.setNumber - b.setNumber)
    : [];
  $: currentExerciseSetIndex = exerciseSets.findIndex(s => s.completedReps === undefined && s.completedTimeSeconds === undefined);
  $: currentSet = currentExerciseSetIndex >= 0 ? exerciseSets[currentExerciseSetIndex] : null;
  $: currentExercise = currentSet ? getExerciseById(currentSet.exerciseId) : null;
  
  // Check if current exercise uses bodyweight progression (rep-based instead of weight-based)
  $: useBodyweightProgression = currentExercise?.supportsBodyweightProgression && 
    defaultWeights[currentExercise.id]?.useBodyweightProgression;
  
  onMount(async () => {
    // Initialize AI settings
    aiSettingsStore.init();
    
    // Check for saved workout state first
    const savedState = loadWorkoutState();
    if (savedState) {
      // Ask user if they want to restore
      showRestoreModal = true;
      // Wait for user choice before proceeding
      return;
    }
    
    await initializeWorkout();
  });
  
  async function initializeWorkout() {
    const params = new URLSearchParams($page.url.search);
    const programId = params.get('program');
    const workoutIndex = parseInt(params.get('workout') || '0');
    workoutType = params.get('type') || 'A';
    
    // Get authenticated user ID
    const authState = $authStore;
    const userId = authState.isAuthenticated ? authState.userId : null;
    
    // Load user's exercise settings from profile if authenticated
    let userExercises: Record<string, UserExerciseSettings> = {};
    
    if (userId) {
      try {
        const profile = await convex.query(api.userProfiles.get, { userId: userId as any });
        if (profile?.exercises) {
          userExercises = profile.exercises as Record<string, UserExerciseSettings>;
        }
        if (profile?.gymEquipment) {
          userEquipment = profile.gymEquipment;
          console.log('Loaded user equipment:', userEquipment);
        } else {
          console.log('No gym equipment found in profile, using defaults');
        }
      } catch (e) {
        // Use default weights if profile not available
        console.log('Could not load profile, using defaults');
      }
    }
    
    // Merge defaults with user settings
    const exerciseWeights = { ...defaultWeights, ...userExercises };
    userExerciseWeights = exerciseWeights;
    
    // Load from program if specified
    if (programId) {
      try {
        const program = await convex.query(api.programs.get, { programId: programId as any });
        if (program && program.workouts[workoutIndex]) {
          const programWorkout = program.workouts[workoutIndex];
          workoutType = programWorkout.name;
          plan = programWorkout.exercises.map(ex => {
            const settings = exerciseWeights[ex.exerciseId];
            const exerciseData = getExerciseById(ex.exerciseId);
            const isTimeBased = exerciseData?.isTimeBased;
            const useBodyweightProgression = exerciseData?.supportsBodyweightProgression && settings?.useBodyweightProgression;
            
            return {
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: isTimeBased ? 0 : (useBodyweightProgression ? (settings?.targetReps || exerciseData?.defaultReps || ex.reps) : ex.reps),
              weight: useBodyweightProgression ? 0 : (ex.startingWeight ?? settings?.currentWeight ?? 20),
              timeSeconds: isTimeBased ? (exerciseData?.defaultTimeSeconds || 60) : undefined,
            };
          });
        } else {
          loadDefaultPlan(exerciseWeights);
        }
      } catch (e) {
        loadDefaultPlan(exerciseWeights);
      }
    } else {
      loadDefaultPlan(exerciseWeights);
    }
    
    function loadDefaultPlan(weights: Record<string, UserExerciseSettings>) {
      // Build plan based on workout type
      const exerciseIds = workoutType === 'A' 
        ? DEFAULT_WORKOUT_A 
        : workoutType === 'B' 
          ? DEFAULT_WORKOUT_B 
          : DEFAULT_WORKOUT_A;
      
      plan = exerciseIds.map(id => {
        const settings = weights[id];
        const exerciseData = getExerciseById(id);
        const isTimeBased = exerciseData?.isTimeBased;
        const useBodyweightProgression = exerciseData?.supportsBodyweightProgression && settings?.useBodyweightProgression;
        
        return {
          exerciseId: id,
          sets: id === 'deadlift' ? 1 : 3,
          reps: isTimeBased ? 0 : (useBodyweightProgression ? (settings?.targetReps || exerciseData?.defaultReps || 5) : 5),
          weight: useBodyweightProgression ? 0 : (settings?.currentWeight || 20),
          timeSeconds: isTimeBased ? (exerciseData?.defaultTimeSeconds || 60) : undefined,
        };
      });
    }
    
    // Generate all sets with warmup
    let allSets: WorkoutSet[] = [];
    for (const exercise of plan) {
      const exerciseData = getExerciseById(exercise.exerciseId);
      const timeSeconds = exerciseData?.isTimeBased 
        ? (exercise.timeSeconds || exerciseData?.defaultTimeSeconds || 60)
        : undefined;
      const exerciseSets = generateAllSets(
        exercise.exerciseId,
        exercise.sets,
        exercise.reps,
        exercise.weight,
        timeSeconds
      );
      allSets = [...allSets, ...exerciseSets];
    }
    sets = allSets;
    workoutStarted = true;
  }
  
  onDestroy(() => {
    if (restInterval) clearInterval(restInterval);
    if (exerciseTimerInterval) clearInterval(exerciseTimerInterval);
    navVisibilityStore.set({ hideMainNav: false });
  });
  
  // Track the current set ID to detect actual set changes
  let lastSetId: string | null = null;
  
  // Reset counters when set changes
  $: if (currentSet && viewMode === 'exercise' && currentSet.id !== lastSetId) {
    lastSetId = currentSet.id;
    completedRepsCount = currentSet.targetReps;
    tapCount = 0;
    setIsComplete = false;
    // Reset timer state
    timerCompleted = false;
    isTimerRunning = false;
    if (exerciseTimerInterval) {
      clearInterval(exerciseTimerInterval);
      exerciseTimerInterval = null;
    }
    // Initialize timer for time-based exercises
    if (currentSet.targetTimeSeconds && currentSet.targetTimeSeconds > 0) {
      exerciseTimerRemaining = currentSet.targetTimeSeconds;
    } else {
      exerciseTimerRemaining = 0;
    }
  }
  
  function startExercise(exerciseId: string) {
    activeExerciseId = exerciseId;
    viewMode = 'exercise';
    navVisibilityStore.set({ hideMainNav: true });
  }
  
  function startExerciseTimer() {
    if (!currentSet || !currentSet.targetTimeSeconds) return;
    
    // Clear any running rest timer - user is skipping rest to start exercise
    if (restInterval) {
      clearInterval(restInterval);
      restInterval = null;
    }
    restEndTime = null;
    
    isTimerRunning = true;
    timerCompleted = false;
    const startTime = Date.now();
    const targetTimeMs = currentSet.targetTimeSeconds * 1000;
    
    exerciseTimerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.ceil((targetTimeMs - elapsed) / 1000);
      exerciseTimerRemaining = Math.max(0, remaining);
      
      if (exerciseTimerRemaining <= 0) {
        // Timer completed successfully - play sound and complete
        playTimerCompleteSound();
        completeTimerSet(false);
      }
    }, 100);
  }
  
  function stopExerciseTimer(isFailure: boolean) {
    if (exerciseTimerInterval) {
      clearInterval(exerciseTimerInterval);
      exerciseTimerInterval = null;
    }
    isTimerRunning = false;
    completeTimerSet(isFailure);
  }
  
  function completeTimerSet(isFailure: boolean) {
    if (!currentSet) return;
    
    if (exerciseTimerInterval) {
      clearInterval(exerciseTimerInterval);
      exerciseTimerInterval = null;
    }
    
    timerCompleted = true;
    setIsComplete = true;
    
    // Calculate completed time (if failure, use elapsed time; if success, use full target)
    const completedTime = isFailure 
      ? (currentSet.targetTimeSeconds || 0) - exerciseTimerRemaining
      : (currentSet.targetTimeSeconds || 0);
    
    // Save the set immediately for timer-based exercises
    sets = sets.map((s) => 
      s.id === currentSet!.id 
        ? { ...s, completedTimeSeconds: completedTime, completedAt: Date.now(), failed: isFailure }
        : s
    );
    
    // Start rest timer
    startRest(isFailure);
    
    // If exercise is complete, go back to overview after a delay
    const remainingSets = exerciseSets.filter(s => s.id !== currentSet!.id && s.completedReps === undefined && s.completedTimeSeconds === undefined);
    if (remainingSets.length === 0) {
      setTimeout(() => backToOverview(), 1500);
    }
  }
  
  function backToOverview() {
    viewMode = 'overview';
    activeExerciseId = null;
    navVisibilityStore.set({ hideMainNav: false });
    if (restInterval) clearInterval(restInterval);
    if (exerciseTimerInterval) clearInterval(exerciseTimerInterval);
    restEndTime = null;
    isTimerRunning = false;
    lastSetId = null;
  }
  
  function moveExerciseUp(index: number) {
    if (index === 0) return;
    const newPlan = [...plan];
    [newPlan[index], newPlan[index - 1]] = [newPlan[index - 1], newPlan[index]];
    plan = newPlan;
    // Reorder sets to match
    reorderSets();
  }
  
  function moveExerciseDown(index: number) {
    if (index === plan.length - 1) return;
    const newPlan = [...plan];
    [newPlan[index], newPlan[index + 1]] = [newPlan[index + 1], newPlan[index]];
    plan = newPlan;
    reorderSets();
  }
  
  function reorderSets() {
    let newSets: WorkoutSet[] = [];
    for (const exercise of plan) {
      const exerciseSets = sets.filter(s => s.exerciseId === exercise.exerciseId);
      newSets = [...newSets, ...exerciseSets];
    }
    sets = newSets;
  }
  
  function startRest(isFailure: boolean) {
    const restTime = isFailure ? REST_TIME_FAILURE : REST_TIME_SUCCESS;
    restEndTime = Date.now() + restTime * 1000;
    restRemaining = restTime;
    restSoundPlayed = false;
    
    if (restInterval) clearInterval(restInterval);
    restInterval = setInterval(() => {
      if (restEndTime) {
        restRemaining = Math.ceil((restEndTime - Date.now()) / 1000);
        // Play sound when timer reaches zero (goes negative)
        if (restRemaining < 0 && !restSoundPlayed) {
          restSoundPlayed = true;
          playRestCompleteSound();
        }
      }
    }, 100);
  }
  
  function handleCircleTap() {
    if (!currentSet) return;
    
    // If at 0 reps, cycle back to full reps (accidental tap recovery)
    if (completedRepsCount === 0) {
      tapCount = 1;
      completedRepsCount = currentSet.targetReps;
    } else {
      tapCount++;
      completedRepsCount = currentSet.targetReps - (tapCount - 1);
      if (completedRepsCount < 0) {
        completedRepsCount = 0;
        tapCount = currentSet.targetReps + 1;
      }
    }
    
    // For warmup sets, save and move to next immediately (no rest)
    if (currentSet.type === 'warmup') {
      sets = sets.map((s) => 
        s.id === currentSet!.id 
          ? { ...s, completedReps: completedRepsCount, completedAt: Date.now(), failed: false }
          : s
      );
      
      // Check if exercise is complete
      const remainingSets = exerciseSets.filter(s => s.id !== currentSet!.id && s.completedReps === undefined);
      if (remainingSets.length === 0) {
        setTimeout(() => backToOverview(), 500);
      }
      return;
    }
    
    // For work sets, start/restart rest timer
    const isFailure = completedRepsCount < currentSet.targetReps;
    startRest(isFailure);
    setIsComplete = true;
  }
  
  function saveAndNextSet() {
    if (!currentSet || !setIsComplete) return;
    
    // For time-based exercises, saving is handled in completeTimerSet
    if (currentSet.targetTimeSeconds) return;
    
    const isFailure = completedRepsCount < currentSet.targetReps;
    
    sets = sets.map((s) => 
      s.id === currentSet!.id 
        ? { ...s, completedReps: completedRepsCount, completedAt: Date.now(), failed: isFailure }
        : s
    );
    
    // Check if exercise is complete
    const remainingSets = exerciseSets.filter(s => s.id !== currentSet!.id && s.completedReps === undefined);
    if (remainingSets.length === 0) {
      setTimeout(() => backToOverview(), 500);
    }
  }
  
  function skipRest() {
    if (restInterval) clearInterval(restInterval);
    restEndTime = null;
    saveAndNextSet();
  }
  
  function skipSet() {
    if (!currentSet) return;
    
    // Clear timer if running
    if (exerciseTimerInterval) {
      clearInterval(exerciseTimerInterval);
      exerciseTimerInterval = null;
      isTimerRunning = false;
    }
    
    sets = sets.map((s) => 
      s.id === currentSet!.id 
        ? { ...s, completedReps: 0, completedAt: Date.now(), failed: true, skipped: true }
        : s
    );
    
    const remainingSets = exerciseSets.filter(s => s.id !== currentSet!.id && s.completedReps === undefined && s.completedTimeSeconds === undefined);
    if (remainingSets.length === 0) {
      backToOverview();
    }
  }
  
  async function toggleProgressionMode(useBodyweight: boolean) {
    if (!currentExercise || !$authStore.userId) return;
    
    try {
      // Save to profile
      await convex.mutation(api.userProfiles.updateExercise, {
        userId: $authStore.userId as any,
        exerciseId: currentExercise.id,
        settings: { useBodyweightProgression: useBodyweight },
      });
      
      // Update local defaultWeights
      defaultWeights[currentExercise.id] = {
        ...(defaultWeights[currentExercise.id] || {}),
        useBodyweightProgression: useBodyweight,
      };
      
      // Regenerate sets for current exercise to reflect the change
      const exerciseData = currentExercise;
      const planExercise = plan.find(p => p.exerciseId === currentExercise!.id);
      if (planExercise) {
        const timeSeconds = exerciseData?.isTimeBased 
          ? (planExercise.timeSeconds || exerciseData?.defaultTimeSeconds || 60)
          : undefined;
        const newExerciseSets = generateAllSets(
          currentExercise.id,
          planExercise.sets,
          useBodyweight ? (planExercise.reps || exerciseData?.defaultReps || 5) : 5,
          useBodyweight ? 0 : (planExercise.weight || 20),
          timeSeconds
        );
        
        // Replace old sets with new ones, preserving completed sets
        sets = sets.map(s => {
          if (s.exerciseId === currentExercise!.id && s.completedReps === undefined && s.completedTimeSeconds === undefined) {
            const newSet = newExerciseSets.find(ns => ns.setNumber === s.setNumber);
            return newSet || s;
          }
          return s;
        });
      }
    } catch (err) {
      console.error('Failed to toggle progression mode:', err);
    }
  }
  
  function finishWorkout() {
    clearWorkoutState();
    goto('/');
  }
  
  function cancelWorkout() {
    showCancelModal = true;
  }
  
  function confirmCancel() {
    showCancelModal = false;
    clearWorkoutState();
    goto('/');
  }
  
  function finishEarly() {
    const completedSets = sets.filter(s => s.completedReps !== undefined).length;
    if (completedSets === 0) {
      // Nothing done, just cancel
      cancelWorkout();
      return;
    }
    showFinishEarlyModal = true;
  }
  
  function confirmFinishEarly() {
    showFinishEarlyModal = false;
    clearWorkoutState();
    showCompleteConfirm = true;
  }
  
  // Workout modification functions
  function openModificationModal() {
    showModificationModal = true;
  }
  
  function handleModificationConfirm(response: ModificationResponse) {
    // Validate the response has exercises
    if (!response.newPlan || response.newPlan.length === 0) {
      console.error('AI returned empty plan');
      alert('Error: AI returned an empty workout plan. Please try again.');
      return;
    }
    
    console.log('Applying modification:', response.summary);
    console.log('New plan:', response.newPlan);
    console.log('Changes:', response.changes);
    
    // Apply the modifications
    plan = response.newPlan;
    
    // Regenerate sets for the new plan, preserving completed sets
    const completedExerciseIds = new Set(
      sets.filter(s => s.completedReps !== undefined || s.completedTimeSeconds !== undefined)
        .map(s => s.exerciseId)
    );
    
    console.log('Completed exercises:', Array.from(completedExerciseIds));
    
    // Generate new sets
    let newSets: WorkoutSet[] = [];
    for (const exercise of plan) {
      const exerciseData = getExerciseById(exercise.exerciseId);
      const timeSeconds = exerciseData?.isTimeBased 
        ? (exercise.timeSeconds || exerciseData?.defaultTimeSeconds || 60)
        : undefined;
      
      // Check if this exercise was already completed
      if (completedExerciseIds.has(exercise.exerciseId)) {
        // Keep existing sets for this exercise
        const existingSets = sets.filter(s => s.exerciseId === exercise.exerciseId);
        console.log(`Keeping ${existingSets.length} existing sets for ${exercise.exerciseId}`);
        newSets = [...newSets, ...existingSets];
      } else {
        // Generate new sets
        console.log(`Generating new sets for ${exercise.exerciseId}: ${exercise.sets}x${exercise.reps} @ ${exercise.weight}kg`);
        const exerciseSets = generateAllSets(
          exercise.exerciseId,
          exercise.sets,
          exercise.reps,
          exercise.weight,
          timeSeconds
        );
        newSets = [...newSets, ...exerciseSets];
      }
    }
    
    console.log(`Total new sets: ${newSets.length}`);
    sets = newSets;
    workoutModified = true;
    modificationSummary = response.summary;
    showModificationModal = false;
    
    // Save the modified state
    saveWorkoutState();
  }
  
  function handleModificationCancel() {
    showModificationModal = false;
  }
  
  function formatTime(seconds: number): string {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    const sign = isNegative ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function getSetTypeLabel(type: string): string {
    return type === 'warmup' ? 'Warmup' : 'Work Set';
  }
  
  function getExerciseProgress(exerciseId: string): { completed: number; total: number } {
    const exerciseSets = sets.filter(s => s.exerciseId === exerciseId);
    const completed = exerciseSets.filter(s => s.completedReps !== undefined || s.completedTimeSeconds !== undefined).length;
    return { completed, total: exerciseSets.length };
  }
  
  function isExerciseComplete(exerciseId: string): boolean {
    const { completed, total } = getExerciseProgress(exerciseId);
    return completed === total && total > 0;
  }
  
  // Auto-save functions
  function saveWorkoutState() {
    if (!workoutStarted || sets.length === 0) return;
    
    const state = {
      workoutType,
      plan,
      sets,
      viewMode,
      activeExerciseId,
      restEndTime,
      restRemaining,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save workout state:', e);
    }
  }
  
  function loadWorkoutState(): any | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load workout state:', e);
    }
    return null;
  }
  
  function clearWorkoutState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear workout state:', e);
    }
  }
  
  function restoreWorkout(state: any) {
    workoutType = state.workoutType;
    plan = state.plan;
    sets = state.sets;
    viewMode = state.viewMode;
    activeExerciseId = state.activeExerciseId;
    restEndTime = state.restEndTime;
    restRemaining = state.restRemaining || 0;
    
    // Reset lastSetId to force re-initialization
    lastSetId = null;
    
    // Reset rep counter and timer state for the current set
    if (currentSet && viewMode === 'exercise') {
      completedRepsCount = currentSet.targetReps;
      tapCount = 0;
      setIsComplete = false;
      timerCompleted = false;
      isTimerRunning = false;
      if (currentSet.targetTimeSeconds && currentSet.targetTimeSeconds > 0) {
        exerciseTimerRemaining = currentSet.targetTimeSeconds;
      } else {
        exerciseTimerRemaining = 0;
      }
    }
    
    // Restart rest timer if it was running
    if (restEndTime && restRemaining > 0) {
      if (restInterval) clearInterval(restInterval);
      restInterval = setInterval(() => {
        if (restEndTime) {
          restRemaining = Math.ceil((restEndTime - Date.now()) / 1000);
          if (restRemaining < 0 && !restSoundPlayed) {
            restSoundPlayed = true;
            playRestCompleteSound();
          }
        }
      }, 100);
    }
    
    showRestoreModal = false;
    workoutStarted = true;
  }
  
  async function discardSavedWorkout() {
    clearWorkoutState();
    showRestoreModal = false;
    await initializeWorkout();
  }
  
  // Auto-save whenever sets change
  $: if (workoutStarted && sets.length > 0) {
    saveWorkoutState();
  }
</script>

<svelte:head>
  <title>Workout - LiftLog</title>
</svelte:head>

{#if !workoutStarted}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin text-4xl mb-4">⏳</div>
      <p>Loading workout...</p>
    </div>
  </div>
{:else if showCompleteConfirm}
  <!-- Workout Complete Screen -->
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-bg">
    <div class="text-6xl mb-4">🎉</div>
    <h1 class="text-2xl font-bold mb-2">Workout Complete!</h1>
    <p class="text-text-muted mb-6">Great job crushing those sets</p>
    
    <div class="bg-surface rounded-xl p-4 w-full max-w-sm mb-6">
      <h3 class="font-semibold mb-3">Summary</h3>
      {#each plan as exercise}
        {@const exerciseData = getExerciseById(exercise.exerciseId)}
        {@const exerciseSets = sets.filter(s => s.exerciseId === exercise.exerciseId && s.type === 'work')}
        {@const completed = exerciseData?.isTimeBased 
          ? exerciseSets.filter(s => s.completedTimeSeconds && !s.failed).length
          : exerciseSets.filter(s => s.completedReps && s.completedReps >= s.targetReps).length}
        <div class="flex justify-between py-2 border-b border-surface-light last:border-0">
          <span>{exerciseData?.name}</span>
          <span class={completed === exerciseSets.length ? 'text-success' : 'text-warning'}>
            {completed}/{exerciseSets.length} sets
          </span>
        </div>
      {/each}
    </div>
    
    <button
      on:click={finishWorkout}
      class="w-full max-w-sm bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 font-semibold"
    >
      Save & Finish
    </button>
  </div>
{:else if viewMode === 'overview'}
  <!-- Workout Overview Screen -->
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-surface p-4 border-b border-surface-light">
      <div class="flex items-center justify-between mb-2">
        <button on:click={cancelWorkout} class="text-text-muted hover:text-text" aria-label="Cancel workout">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div class="flex items-center gap-2">
          {#if workoutModified}
            <span class="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">Modified</span>
          {/if}
          <span class="text-sm text-text-muted">Workout {workoutType}</span>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">Today's Session</h1>
        {#if $aiAvailable}
          <button
            on:click={openModificationModal}
            class="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
            aria-label="Modify workout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Modify
          </button>
        {/if}
      </div>
      {#if workoutModified}
        <p class="text-xs text-primary mt-1">{modificationSummary}</p>
      {/if}
    </header>
    
    <!-- Main Content -->
    <main class="flex-1 p-4 space-y-3 overflow-y-auto">
      <p class="text-text-muted text-sm mb-4">Tap an exercise to start. Reorder if needed.</p>
      
      {#each plan as exercise, index}
        {@const progress = getExerciseProgress(exercise.exerciseId)}
        {@const isComplete = isExerciseComplete(exercise.exerciseId)}
        {@const exerciseData = getExerciseById(exercise.exerciseId)}
        <div class="bg-surface rounded-xl p-4 {isComplete ? 'opacity-60' : ''}">
          <div class="flex items-center gap-3">
            <!-- Reorder buttons -->
            <div class="flex flex-col">
              <button 
                on:click={() => moveExerciseUp(index)}
                class="text-text-muted hover:text-text {index === 0 ? 'invisible' : ''}"
                disabled={index === 0}
                aria-label="Move up"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button 
                on:click={() => moveExerciseDown(index)}
                class="text-text-muted hover:text-text {index === plan.length - 1 ? 'invisible' : ''}"
                disabled={index === plan.length - 1}
                aria-label="Move down"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            <!-- Exercise info -->
            <button 
              on:click={() => startExercise(exercise.exerciseId)}
              class="flex-1 text-left {isComplete ? '' : 'active:scale-98'}"
              disabled={isComplete}
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold {isComplete ? 'line-through text-text-muted' : ''}">{exerciseData?.name}</h3>
                  <p class="text-sm text-text-muted">
                    {#if exerciseData?.isTimeBased}
                      {exercise.sets} sets × {exercise.timeSeconds || exerciseData?.defaultTimeSeconds || 60} sec hold
                    {:else if exerciseData?.supportsBodyweightProgression && defaultWeights[exercise.exerciseId]?.useBodyweightProgression}
                      {exercise.sets} sets × {defaultWeights[exercise.exerciseId]?.targetReps || exerciseData?.defaultReps || exercise.reps} reps (bodyweight)
                    {:else}
                      {exercise.sets} sets × {exercise.reps} reps @ {exercise.weight}kg
                    {/if}
                  </p>
                </div>
                <div class="text-right">
                  {#if isComplete}
                    <span class="text-success text-2xl">✓</span>
                  {:else}
                    <span class="text-sm {progress.completed > 0 ? 'text-primary' : 'text-text-muted'}">
                      {progress.completed}/{progress.total}
                    </span>
                    <svg class="w-5 h-5 text-text-muted inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  {/if}
                </div>
              </div>
              
              <!-- Progress bar -->
              {#if !isComplete}
                <div class="w-full bg-surface-light rounded-full h-1.5 mt-3">
                  <div class="bg-primary h-1.5 rounded-full transition-all" style="width: {(progress.completed / progress.total) * 100}%"></div>
                </div>
              {/if}
            </button>
          </div>
        </div>
      {/each}
    </main>
    
    <!-- Footer with Finish button -->
    <footer class="bg-surface border-t border-surface-light p-4">
      <button
        on:click={finishEarly}
        class="w-full bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 font-semibold"
      >
        Finish Workout
      </button>
    </footer>
  </div>
{:else if currentSet && currentExercise}
  <!-- Active Exercise Screen -->
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-surface px-3 pt-3 pb-2 border-b border-surface-light">
      <div class="flex items-center justify-between">
        <button on:click={backToOverview} class="text-text-muted hover:text-text flex items-center gap-1" aria-label="Back to overview">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="text-sm">Back</span>
        </button>
        <span class="text-sm text-text-muted">{currentExerciseSetIndex + 1} / {exerciseSets.length}</span>
      </div>
      
      <!-- Progress Bar -->
      <div class="w-full bg-surface-light rounded-full h-1 mt-1.5">
        <div class="bg-primary h-1 rounded-full transition-all" style="width: {(currentExerciseSetIndex / exerciseSets.length) * 100}%"></div>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="flex-1 flex flex-col items-center px-4 pb-4 pt-3">
      
      <!-- Exercise Info - tighter spacing -->
      <div class="text-center mb-3">
        <h1 class="text-xl font-bold leading-tight">{currentExercise.name}</h1>
        <div class="flex items-center justify-center gap-2 mt-1.5">
          <span class="px-2.5 py-0.5 rounded-full text-xs {currentSet.type === 'warmup' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'}">
            {getSetTypeLabel(currentSet.type)}
          </span>
          <span class="text-text-muted text-sm">Set {currentSet.setNumber}</span>
        </div>
      </div>
      
      <!-- Weight/Time Display - more compact -->
      {#if currentSet.targetTimeSeconds}
        <!-- Time Display for time-based exercises -->
        <div class="bg-surface rounded-xl p-3 mb-4 text-center min-w-[160px]">
          <div class="text-text-muted text-xs mb-0.5">Target Time</div>
          <div class="text-3xl font-bold">{currentSet.targetTimeSeconds} <span class="text-lg">sec</span></div>
          <div class="text-xs text-primary mt-1">
            Hold position steady
          </div>
        </div>
      {:else if useBodyweightProgression}
        <!-- Bodyweight Progression Display (reps-based) -->
        <div class="bg-surface rounded-xl p-3 mb-4 text-center min-w-[160px]">
          <div class="text-text-muted text-xs mb-0.5">Target Reps</div>
          <div class="text-3xl font-bold">{currentSet.targetReps}</div>
          <div class="text-xs text-primary mt-1">
            Bodyweight only
          </div>
        </div>
        <!-- Progression Mode Toggle (for exercises that support it) -->
        {#if currentExercise?.supportsBodyweightProgression}
          <div class="mb-4">
            <button
              on:click={() => toggleProgressionMode(false)}
              class="text-sm px-3 py-1.5 bg-surface-light hover:bg-surface-light/80 rounded-lg text-text-muted transition-colors"
            >
              Switch to added weight →
            </button>
          </div>
        {/if}
      {:else}
        <!-- Weight Display for weight-based exercises -->
        <div class="bg-surface rounded-xl p-3 mb-4 text-center min-w-[160px]">
          <div class="text-text-muted text-xs mb-0.5">Weight</div>
          <div class="text-3xl font-bold">{currentSet.targetWeight} <span class="text-lg">kg</span></div>
          {#if currentExercise && currentExercise.equipment.includes('barbell')}
            {@const platePerSide = getPlateWeightPerSide(currentSet.targetWeight, currentSet.exerciseId)}
            {#if platePerSide !== null && platePerSide > 0}
              <div class="text-xs text-primary mt-1">
                {BAR_WEIGHT} kg bar + {platePerSide} kg each side
              </div>
            {:else if platePerSide === 0}
              <div class="text-xs text-primary mt-1">
                Just the {BAR_WEIGHT} kg bar
              </div>
            {/if}
          {/if}
        </div>
        <!-- Progression Mode Toggle (for exercises that support it) -->
        {#if currentExercise?.supportsBodyweightProgression}
          <div class="mb-4">
            <button
              on:click={() => toggleProgressionMode(true)}
              class="text-sm px-3 py-1.5 bg-surface-light hover:bg-surface-light/80 rounded-lg text-text-muted transition-colors"
            >
              ← Switch to bodyweight
            </button>
          </div>
        {/if}
      {/if}
      
      <!-- Timer/Reps Counter - slightly smaller -->
      {#if currentSet.targetTimeSeconds}
        <!-- Timer-based Exercise Circle -->
        <div class="relative">
          {#if !isTimerRunning && !timerCompleted}
            <!-- Ready to start -->
            <button
              on:click={startExerciseTimer}
              class="w-44 h-44 rounded-full bg-surface hover:opacity-90 active:scale-95 transition-all flex flex-col items-center justify-center shadow-2xl shadow-surface-light/20 border-2 border-surface-light"
            >
              <svg class="w-16 h-16 text-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-text-muted px-4 text-center leading-tight">
                Tap to start timer
              </span>
            </button>
          {:else if isTimerRunning}
            <!-- Timer running - tap to stop early (failure) -->
            <button
              on:click={() => stopExerciseTimer(true)}
              class="w-44 h-44 rounded-full bg-warning hover:opacity-90 active:scale-95 transition-all flex flex-col items-center justify-center shadow-2xl shadow-warning/20 border-2 border-warning animate-pulse"
            >
              <span class="text-5xl font-bold text-white">{exerciseTimerRemaining}</span>
              <span class="text-xs text-white/80 mt-1.5 px-4 text-center leading-tight">
                Tap to stop early
              </span>
            </button>
          {:else if timerCompleted}
            <!-- Timer completed successfully -->
            <div class="w-44 h-44 rounded-full bg-success flex flex-col items-center justify-center shadow-2xl shadow-success/20 border-2 border-success">
              <svg class="w-16 h-16 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-sm text-white/90 px-4 text-center leading-tight">
                Complete!
              </span>
            </div>
          {/if}
        </div>
        
        <!-- Timer status indicator -->
        {#if timerCompleted}
          <div class="mt-4 text-center">
            <span class="px-3 py-1.5 rounded-lg font-semibold bg-success/20 text-success text-sm">
              Held for {currentSet.targetTimeSeconds} seconds
            </span>
          </div>
        {/if}
      {:else}
        <!-- Reps Counter - slightly smaller -->
        <div class="relative">
          <button
            on:click={handleCircleTap}
            class="w-44 h-44 rounded-full {setIsComplete ? 'bg-primary' : 'bg-surface'} hover:opacity-90 active:scale-95 transition-all flex flex-col items-center justify-center shadow-2xl {setIsComplete ? 'shadow-primary/20' : 'shadow-surface-light/20'} border-2 {setIsComplete ? 'border-primary' : 'border-surface-light'}"
          >
            <span class="text-5xl font-bold {setIsComplete ? 'text-white' : 'text-text'}">{completedRepsCount}</span>
            <span class="text-xs {setIsComplete ? 'text-white/70' : 'text-text-muted'} mt-1.5 px-4 text-center leading-tight">
              {#if !setIsComplete}
                {#if currentSet.type === 'warmup'}
                  Tap to complete
                {:else}
                  Tap if you got all {currentSet.targetReps}
                {/if}
              {:else if completedRepsCount === 0}
                Tap again to reset
              {:else if completedRepsCount === currentSet.targetReps}
                All reps done!
              {:else}
                Tap again if fewer reps
              {/if}
            </span>
          </button>
        </div>
        
        <!-- Status indicator (only for partial reps or failed sets) -->
        {#if setIsComplete && completedRepsCount !== 0 && completedRepsCount !== currentSet.targetReps}
          <div class="mt-4 text-center">
            <span class="px-3 py-1.5 rounded-lg font-semibold bg-warning/20 text-warning text-sm">
              Got {completedRepsCount} reps
            </span>
          </div>
        {/if}
      {/if}
      
      <!-- Status indicator (only for partial reps or failed sets) -->
      {#if setIsComplete && completedRepsCount !== 0 && completedRepsCount !== currentSet.targetReps}
        <div class="mt-4 text-center">
          <span class="px-3 py-1.5 rounded-lg font-semibold bg-warning/20 text-warning text-sm">
            Got {completedRepsCount} reps
          </span>
        </div>
      {/if}
    </main>
    
    <!-- Fixed Rest Timer (visible when running) -->
    {#if restEndTime}
      <div class="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light p-3 z-40">
        <div class="flex items-center justify-between max-w-lg mx-auto">
          <button
            on:click={skipRest}
            class="px-4 py-2 text-primary hover:text-primary-dark font-medium text-sm"
          >
            Skip Rest
          </button>
          
          <div class="text-center">
            <div class="text-xs text-text-muted uppercase tracking-wide">Rest</div>
            <div class="text-2xl font-mono font-bold {restRemaining < 0 ? 'text-danger' : restRemaining < 30 ? 'text-success' : 'text-primary'}">
              {formatTime(restRemaining)}
            </div>
          </div>
          
          <div class="w-16"></div>
        </div>
      </div>
    {:else}
      <!-- Footer Actions -->
      <footer class="bg-surface border-t border-surface-light p-4">
        <div class="flex items-center justify-between">
          <button
            on:click={skipSet}
            class="px-4 py-2 text-text-muted hover:text-text"
          >
            Skip Set
          </button>
          
          {#if currentSet.type === 'warmup'}
            <div class="text-center text-text-muted text-sm">
              No rest on warmup
            </div>
          {:else}
            <div class="text-center text-text-muted text-sm">
              Rest: {formatTime(REST_TIME_SUCCESS)}
            </div>
          {/if}
          
          <button
            on:click={backToOverview}
            class="px-4 py-2 text-primary hover:text-primary-dark font-medium"
          >
            Done
          </button>
        </div>
      </footer>
    {/if}
  </div>
{/if}

<!-- Cancel Workout Modal -->
{#if showCancelModal}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0" on:click={() => showCancelModal = false} on:keydown={(e) => e.key === 'Enter' && (showCancelModal = false)}>
    <div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation" on:click|stopPropagation>
      <h3 class="text-xl font-bold mb-2">Cancel Workout?</h3>
      <p class="text-text-muted mb-6">Your progress will be lost. This action cannot be undone.</p>
      
      <div class="flex gap-3">
        <button
          on:click={() => showCancelModal = false}
          class="flex-1 px-4 py-3 bg-surface-light hover:bg-surface-light/80 rounded-xl font-medium"
        >
          Keep Working
        </button>
        <button
          on:click={confirmCancel}
          class="flex-1 px-4 py-3 bg-danger hover:bg-danger/80 text-white rounded-xl font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Finish Early Modal -->
{#if showFinishEarlyModal}
  {@const completedExercises = plan.filter(e => isExerciseComplete(e.exerciseId)).length}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0" on:click={() => showFinishEarlyModal = false} on:keydown={(e) => e.key === 'Enter' && (showFinishEarlyModal = false)}>
    <div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation" on:click|stopPropagation>
      <h3 class="text-xl font-bold mb-2">Finish Workout?</h3>
      <p class="text-text-muted mb-6">
        You've completed {completedExercises} of {plan.length} exercises. 
        Finish now and save your progress?
      </p>
      
      <div class="flex gap-3">
        <button
          on:click={() => showFinishEarlyModal = false}
          class="flex-1 px-4 py-3 bg-surface-light hover:bg-surface-light/80 rounded-xl font-medium"
        >
          Keep Going
        </button>
        <button
          on:click={confirmFinishEarly}
          class="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark rounded-xl font-medium"
        >
          Finish
        </button>
      </div>
    </div>
  </div>
{/if}


<!-- Restore Workout Modal -->
{#if showRestoreModal}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && discardSavedWorkout()}>
    <div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation" on:click|stopPropagation>
      <h3 class="text-xl font-bold mb-2">Resume Workout?</h3>
      <p class="text-text-muted mb-6">You have a workout in progress. Would you like to resume where you left off?</p>
      
      <div class="flex gap-3">
        <button
          on:click={discardSavedWorkout}
          class="flex-1 px-4 py-3 bg-surface-light hover:bg-surface-light/80 rounded-xl font-medium"
        >
          Start New
        </button>
        <button
          on:click={() => { const state = loadWorkoutState(); if (state) restoreWorkout(state); }}
          class="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark rounded-xl font-medium"
        >
          Resume
        </button>
      </div>
    </div>
  </div>
{/if}


<!-- Workout Modification Modal -->
<WorkoutModificationModal
  isOpen={showModificationModal}
  currentPlan={plan}
  completedSets={sets}
  availableEquipment={userEquipment}
  userExerciseSettings={userExerciseWeights}
  onConfirm={handleModificationConfirm}
  onCancel={handleModificationCancel}
/>
