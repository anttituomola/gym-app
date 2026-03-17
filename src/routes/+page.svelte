<script lang="ts">
  import { goto } from '$app/navigation';
  import { convex, api, authStore } from '$lib/convex';
  import { DEFAULT_WORKOUT_A, DEFAULT_WORKOUT_B, getExerciseById } from '$lib/data/exercises';
  import type { TrainingProgram } from '$lib/types';
  import { formatDate, formatDateWithWeekday } from '$lib/utils/date';
  import { onMount } from 'svelte';
  
  let profile: any = $state(null);
  let loading = $state(true);
  let activeProgram: TrainingProgram | null = $state(null);
  let needsOnboarding = $state(false);
  let recentWorkouts: any[] = $state([]);
  let dataLoaded = $state(false);
  
  // In-progress workout state
  let inProgressWorkout: { workoutType: string; exercises: string[]; startedAt: number } | null = $state(null);
  
  // Next workout recommendation
  let nextWorkout: { type: 'A' | 'B' | 'program'; index?: number; name: string; description: string } | null = $state(null);
  
  // Workout detail modal state
  let selectedWorkout: any = $state(null);
  let showWorkoutDetailModal = $state(false);
  
  const STORAGE_KEY = 'ongoingWorkout';
  
  onMount(() => {
    checkInProgressWorkout();
  });
  
  function checkInProgressWorkout() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state && state.workoutType && Array.isArray(state.sets)) {
          // Get unique exercise names from sets
          const exerciseIds = [...new Set(state.sets.map((s: any) => s.exerciseId))] as string[];
          const exerciseNames = exerciseIds
            .map(id => getExerciseById(id)?.name || id)
            .slice(0, 3); // Show max 3 exercises
          inProgressWorkout = {
            workoutType: state.workoutType,
            exercises: exerciseNames,
            startedAt: state.timestamp || Date.now()
          };
        }
      }
    } catch (e) {
      console.error('Failed to check in-progress workout:', e);
    }
  }
  
  function resumeWorkout() {
    // Add ?resume=1 to skip the confirmation modal on the workout page
    goto('/workout?resume=1');
  }
  
  function discardWorkout() {
    if (confirm('Discard your in-progress workout? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      inProgressWorkout = null;
    }
  }
  
  function calculateNextWorkout() {
    if (activeProgram) {
      // For programs: find the next workout in sequence
      const lastProgramWorkout = recentWorkouts.find(w => w.programId === activeProgram!.id);
      if (lastProgramWorkout) {
        // Find which workout index was done last
        const lastIndex = activeProgram.workouts.findIndex((w, i) => 
          w.name === lastProgramWorkout.workoutType || 
          lastProgramWorkout.workoutType?.includes(String.fromCharCode(65 + i))
        );
        const nextIndex = (lastIndex + 1) % activeProgram.workouts.length;
        const nextWorkoutData = activeProgram.workouts[nextIndex];
        nextWorkout = {
          type: 'program',
          index: nextIndex,
          name: nextWorkoutData.name,
          description: `${nextWorkoutData.exercises.length} exercises`
        };
      } else {
        // No program workouts done yet, recommend first one
        nextWorkout = {
          type: 'program',
          index: 0,
          name: activeProgram.workouts[0].name,
          description: `${activeProgram.workouts[0].exercises.length} exercises`
        };
      }
    } else {
      // For default A/B workouts
      const lastWorkout = recentWorkouts[0];
      if (lastWorkout) {
        // Check if last workout was A or B (workoutType field stores 'A', 'B', or program name)
        const lastType = lastWorkout.workoutType || 'A';
        const nextType = lastType === 'A' ? 'B' : 'A';
        nextWorkout = {
          type: nextType,
          name: `Workout ${nextType}`,
          description: nextType === 'A' 
            ? 'Squat / Bench / Row' 
            : 'Squat / OHP / Deadlift'
        };
      } else {
        // No workouts yet, start with A
        nextWorkout = {
          type: 'A',
          name: 'Workout A',
          description: 'Squat / Bench / Row'
        };
      }
    }
  }
  
  function startNextWorkout() {
    if (!nextWorkout) return;
    
    if (nextWorkout.type === 'program' && nextWorkout.index !== undefined && activeProgram) {
      startProgramWorkout(nextWorkout.index);
    } else if (nextWorkout.type === 'A') {
      startWorkoutA();
    } else {
      startWorkoutB();
    }
  }
  
  function openWorkoutDetail(workout: any) {
    selectedWorkout = workout;
    showWorkoutDetailModal = true;
  }
  
  function closeWorkoutDetail() {
    showWorkoutDetailModal = false;
    selectedWorkout = null;
  }
  
  // Group sets by exercise for display
  function getExerciseSummary(sets: any[]) {
    const grouped = new Map();
    
    for (const set of sets) {
      if (!grouped.has(set.exerciseId)) {
        grouped.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          exerciseName: getExerciseById(set.exerciseId)?.name || set.exerciseId,
          sets: [],
          totalVolume: 0
        });
      }
      
      const group = grouped.get(set.exerciseId);
      group.sets.push(set);
      
      // Calculate volume for completed sets
      if (set.completedReps && set.targetWeight > 0) {
        group.totalVolume += set.completedReps * set.targetWeight;
      }
    }
    
    return Array.from(grouped.values());
  }
  
  // Subscribe to auth store and load data when ready
  $effect(() => {
    const unsub = authStore.subscribe((auth) => {
      console.log('Home auth state:', auth);
      if (!auth.isLoading && !dataLoaded) {
        if (auth.userId) {
          loadData(auth.userId);
        } else {
          loading = false;
        }
      }
    });
    return () => unsub();
  });
  
  async function loadData(userId: string) {
    dataLoaded = true;
    try {
      // Load profile
      profile = await convex.query(api.userProfiles.get, { 
        userId: userId as any 
      });
      
      // Create profile if it doesn't exist
      if (!profile) {
        await convex.mutation(api.userProfiles.getOrCreate, { 
          userId: userId as any 
        });
        profile = await convex.query(api.userProfiles.get, { 
          userId: userId as any 
        });
      }
      
      // Load active program first (users with existing programs should see them)
      const program = await convex.query(api.programs.getActive, {
        userId: userId as any
      });
      
      if (program) {
        activeProgram = {
          id: program._id,
          name: program.name,
          description: program.description,
          createdAt: program._creationTime,
          updatedAt: program._creationTime,
          workouts: program.workouts,
          isActive: program.isActive,
        };
      }
      
      // Check if onboarding is needed - only if no active program and onboarding not completed
      // Users with existing programs (from before onboarding) should see their workouts
      needsOnboarding = !profile?.onboardingCompleted && !activeProgram;
      
      // Load recent workouts
      try {
        const workouts = await convex.query(api.workouts.getHistory, { 
          userId: userId as any,
          limit: 5
        });
        console.log('Loaded recent workouts:', workouts);
        recentWorkouts = workouts || [];
        
        // Calculate next workout based on history
        calculateNextWorkout();
      } catch (e) {
        console.log('Could not load recent workouts:', e);
        recentWorkouts = [];
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      loading = false;
    }
  }
  
  async function startWorkoutA() {
    if (!$authStore.userId) return;
    goto('/workout?type=A');
  }
  
  async function startWorkoutB() {
    if (!$authStore.userId) return;
    goto('/workout?type=B');
  }
  
  function startCustomWorkout() {
    goto('/workout?type=custom');
  }
  
  function startProgramWorkout(workoutIndex: number) {
    if (!activeProgram) return;
    goto(`/workout?program=${activeProgram.id}&workout=${workoutIndex}`);
  }
  

</script>

<svelte:head>
  <title>LiftLog</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="p-4 bg-surface border-b border-surface-light">
    <h1 class="text-2xl font-bold text-center">🏋️ LiftLog</h1>
    <p class="text-text-muted text-sm text-center mt-1">Personal training log</p>
  </header>
  
  <!-- Main Content -->
  <main class="flex-1 p-4 flex flex-col gap-4 pb-24">
    
    <!-- In-Progress Workout Banner -->
    {#if inProgressWorkout}
      <section class="bg-warning/10 border border-warning/30 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <div class="text-2xl animate-pulse">🏃</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-semibold text-warning">Workout In Progress!</h3>
              <span class="text-xs text-text-muted">
                Started {formatDate(inProgressWorkout.startedAt)}
              </span>
            </div>
            <p class="text-sm text-text-muted mt-1 truncate">
              {inProgressWorkout.exercises.join(', ')}
            </p>
            <div class="flex gap-2 mt-3">
              <button
                onclick={resumeWorkout}
                class="flex-1 px-4 py-2 bg-warning hover:bg-warning/80 text-bg rounded-lg text-sm font-medium transition-colors"
              >
                Resume Workout
              </button>
              <button
                onclick={discardWorkout}
                class="px-4 py-2 bg-surface-light hover:bg-surface-light/80 text-text-muted rounded-lg text-sm transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      </section>
    {/if}
    
    <!-- Quick Start Section -->
    <section class="bg-surface rounded-xl p-4">
      <h2 class="text-lg font-semibold mb-3">Start Workout</h2>
      
      {#if loading}
        <div class="text-center py-8">
          <div class="animate-spin text-4xl mb-4">⏳</div>
          <p class="text-text-muted">Loading...</p>
        </div>
      {:else if nextWorkout && !inProgressWorkout}
        <!-- Next Workout Recommendation -->
        <div class="mb-4">
          <p class="text-xs text-text-muted uppercase tracking-wide mb-2">Up Next</p>
          <button
            onclick={startNextWorkout}
            class="w-full bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex items-center gap-4"
          >
            <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              {nextWorkout.type === 'program' ? '📋' : nextWorkout.type === 'A' ? '🅰️' : '🅱️'}
            </div>
            <div class="flex-1 text-left">
              <div class="font-semibold text-lg">{nextWorkout.name}</div>
              <div class="text-sm text-white/70">{nextWorkout.description}</div>
            </div>
            <svg class="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div class="border-t border-surface-light pt-4">
          <p class="text-xs text-text-muted uppercase tracking-wide mb-2">Other Options</p>
          <div class="flex gap-2">
            {#if activeProgram}
              {#each activeProgram.workouts as workout, index}
                {#if index !== nextWorkout.index}
                  <button
                    onclick={() => startProgramWorkout(index)}
                    class="flex-1 bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-center"
                  >
                    <span class="font-medium text-sm">{workout.name}</span>
                  </button>
                {/if}
              {/each}
            {:else}
              {#if nextWorkout.type !== 'A'}
                <button
                  onclick={startWorkoutA}
                  class="flex-1 bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-center"
                >
                  <span class="font-medium text-sm">Workout A</span>
                </button>
              {/if}
              {#if nextWorkout.type !== 'B'}
                <button
                  onclick={startWorkoutB}
                  class="flex-1 bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-center"
                >
                  <span class="font-medium text-sm">Workout B</span>
                </button>
              {/if}
            {/if}
          </div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-surface-light">
          <button
            onclick={startCustomWorkout}
            class="w-full bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-sm"
          >
            Custom Workout...
          </button>
        </div>
      {:else if needsOnboarding}
        <!-- Onboarding Banner -->
        <section class="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <div class="text-2xl">🎯</div>
            <div class="flex-1">
              <h3 class="font-semibold text-primary mb-1">Complete Your Profile</h3>
              <p class="text-sm text-text-muted mb-3">
                Set up your personalized training program based on your goals and schedule.
              </p>
              <a
                href="/onboarding"
                class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
              >
                Complete Setup
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </section>
        
        <button
          onclick={startCustomWorkout}
          class="w-full bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-sm"
        >
          Custom Workout...
        </button>
      
      {:else if activeProgram}
        <!-- Active Program Workouts -->
        <div class="mb-3">
          <p class="text-sm text-text-muted mb-2">
            From: <span class="text-text font-medium">{activeProgram.name}</span>
          </p>
          <div class="grid grid-cols-2 gap-3">
            {#each activeProgram.workouts as workout, index}
              <button
                onclick={() => startProgramWorkout(index)}
                class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"
              >
                <span class="text-xl">{String.fromCharCode(65 + index)}</span>
                <span class="font-semibold text-sm">{workout.name}</span>
                <span class="text-xs text-white/70">{workout.exercises.length} exercises</span>
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Create New Program Link -->
        <a
          href="/program/new"
          class="block w-full p-3 bg-primary/10 border border-primary/30 rounded-xl text-left transition-all hover:bg-primary/20 mb-3"
        >
          <div class="flex items-center gap-3">
            <div class="text-xl">🎯</div>
            <div class="flex-1">
              <div class="font-medium text-primary text-sm">Create New Program</div>
              <div class="text-xs text-text-muted">
                Generate a fresh program with updated preferences
              </div>
            </div>
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
        
        <button
          onclick={startCustomWorkout}
          class="w-full bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-sm"
        >
          Custom Workout...
        </button>
        
        <a
          href="/programs"
          class="w-full mt-3 bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-sm flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Manage Programs
        </a>
      {:else}
        <!-- Default Workouts (no history yet) -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <button
            onclick={startWorkoutA}
            class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <span class="text-2xl">🅰️</span>
            <span class="font-semibold">Workout A</span>
            <span class="text-xs text-white/70">Squat / Bench / Row</span>
          </button>
          
          <button
            onclick={startWorkoutB}
            class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <span class="text-2xl">🅱️</span>
            <span class="font-semibold">Workout B</span>
            <span class="text-xs text-white/70">Squat / OHP / Deadlift</span>
          </button>
        </div>
        
        <!-- Create Personalized Program -->
        <a
          href="/program/new"
          class="block w-full p-3 bg-primary/10 border border-primary/30 rounded-xl text-left transition-all hover:bg-primary/20 mb-3"
        >
          <div class="flex items-center gap-3">
            <div class="text-xl">✨</div>
            <div class="flex-1">
              <div class="font-medium text-primary text-sm">Create Personalized Program</div>
              <div class="text-xs text-text-muted">
                Get a custom program based on your goals
              </div>
            </div>
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
        
        <button
          onclick={startCustomWorkout}
          class="w-full bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-sm"
        >
          Custom Workout...
        </button>
        
        <a
          href="/programs"
          class="w-full mt-3 bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-sm flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Manage Programs
        </a>
      {/if}
    </section>
    
    <!-- Recent Activity -->
    <section class="bg-surface rounded-xl p-4 flex-1">
      <h2 class="text-lg font-semibold mb-3">Recent Workouts</h2>
      
      {#if recentWorkouts.length === 0}
        <div class="text-text-muted text-center py-8">
          <p>No workouts yet</p>
          <p class="text-sm mt-1">Start your first workout above!</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each recentWorkouts as workout}
            {@const completedSets = workout.sets?.filter((s: any) => s.completedReps !== undefined || s.completedTimeSeconds !== undefined).length || 0}
            {@const totalSets = workout.sets?.length || 0}
            <button
              onclick={() => openWorkoutDetail(workout)}
              class="w-full bg-surface-light hover:bg-surface-light/80 rounded-lg p-3 text-left transition-colors"
            >
              <div class="flex justify-between items-center">
                <div>
                  <span class="font-medium">Workout {workout.workoutType || 'A'}</span>
                  <span class="text-xs text-text-muted ml-2">
                    {completedSets}/{totalSets} sets
                  </span>
                </div>
                <span class="text-sm text-text-muted">
                  {formatDateWithWeekday(workout.completedAt || workout.startedAt)}
                </span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </section>
    
  </main>
</div>

<!-- Workout Detail Modal -->
{#if showWorkoutDetailModal && selectedWorkout}
  {@const exercises = getExerciseSummary(selectedWorkout.sets || [])}
  {@const totalVolume = exercises.reduce((sum, ex) => sum + ex.totalVolume, 0)}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onclick={closeWorkoutDetail}>
    <div class="bg-surface rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <header class="p-4 border-b border-surface-light flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold">Workout {selectedWorkout.workoutType || 'A'}</h3>
          <p class="text-sm text-text-muted">
            {formatDateWithWeekday(selectedWorkout.completedAt || selectedWorkout.startedAt)}
          </p>
        </div>
        <button onclick={closeWorkoutDetail} class="text-text-muted hover:text-text p-1">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-surface-light rounded-xl p-3 text-center">
            <div class="text-xl font-bold text-primary">
              {selectedWorkout.sets?.filter((s: any) => s.completedReps !== undefined || s.completedTimeSeconds !== undefined).length || 0}
            </div>
            <div class="text-xs text-text-muted">Sets Done</div>
          </div>
          <div class="bg-surface-light rounded-xl p-3 text-center">
            <div class="text-xl font-bold text-primary">{exercises.length}</div>
            <div class="text-xs text-text-muted">Exercises</div>
          </div>
          <div class="bg-surface-light rounded-xl p-3 text-center">
            <div class="text-xl font-bold text-primary">{Math.round(totalVolume)}</div>
            <div class="text-xs text-text-muted">kg Volume</div>
          </div>
        </div>
        
        <!-- Exercise Details -->
        <div class="space-y-4">
          {#each exercises as exercise}
            <div class="bg-surface-light rounded-xl p-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-semibold">{exercise.exerciseName}</h4>
                {#if exercise.totalVolume > 0}
                  <span class="text-xs text-text-muted">{Math.round(exercise.totalVolume)} kg</span>
                {/if}
              </div>
              
              <div class="space-y-1">
                {#each exercise.sets as set}
                  <div class="flex items-center justify-between text-sm py-1 border-b border-surface-light last:border-0">
                    <div class="flex items-center gap-2">
                      <span class="text-xs px-2 py-0.5 rounded {set.type === 'warmup' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'}">
                        {set.type === 'warmup' ? 'W' : set.setNumber}
                      </span>
                      {#if set.targetTimeSeconds}
                        <span class="text-text-muted">{set.targetTimeSeconds}s hold</span>
                      {:else}
                        <span class="text-text-muted">{set.targetWeight > 0 ? set.targetWeight + 'kg' : 'BW'} × {set.targetReps}</span>
                      {/if}
                    </div>
                    <div>
                      {#if set.skipped}
                        <span class="text-text-muted">Skipped</span>
                      {:else if set.completedReps !== undefined || set.completedTimeSeconds !== undefined}
                        {#if set.failed}
                          <span class="text-warning">{set.completedReps || set.completedTimeSeconds}{set.targetTimeSeconds ? 's' : ''} ✗</span>
                        {:else}
                          <span class="text-success">{set.completedReps || set.completedTimeSeconds}{set.targetTimeSeconds ? 's' : ''} ✓</span>
                        {/if}
                      {:else}
                        <span class="text-text-muted">-</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Footer -->
      <footer class="p-4 border-t border-surface-light">
        <button
          onclick={closeWorkoutDetail}
          class="w-full bg-surface-light hover:bg-surface-light/80 rounded-xl p-3 font-medium"
        >
          Close
        </button>
      </footer>
    </div>
  </div>
{/if}
