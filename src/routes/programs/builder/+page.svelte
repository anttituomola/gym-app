<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { EXERCISES } from '$lib/data/exercises';
  import { convex, api, authStore } from '$lib/convex';
  import type { ProgramWorkout, ProgramExercise, Exercise, UserExerciseSettings } from '$lib/types';
  
  // Form state
  let programName = '';
  let programDescription = '';
  let workouts: ProgramWorkout[] = [];
  let existingProgramId: string | null = null;
  let userExercises: Record<string, UserExerciseSettings> = {};
  
  // UI state
  let activeTab = 0;
  let showExerciseSelector = false;
  let exerciseSelectorTargetWorkout: number | null = null;
  let saving = false;
  let editingIncrementReps: { workoutIndex: number; exerciseIndex: number } | null = null;
  
  // Modal states
  let showRemoveWorkoutModal = false;
  let workoutToRemove: number | null = null;
  let showValidationModal = false;
  let validationMessage = '';
  let showErrorModal = false;
  let errorMessage = '';
  
  // Load existing program if editing
  onMount(async () => {
    // Redirect to login if not authenticated
    if (!$authStore.isLoading && !$authStore.userId) {
      goto('/login');
      return;
    }
    
    // Load user profile for exercise weights
    if ($authStore.userId) {
      try {
        const profile = await convex.query(api.userProfiles.get, { 
          userId: $authStore.userId as any 
        });
        if (profile?.exercises) {
          userExercises = profile.exercises as Record<string, UserExerciseSettings>;
        }
      } catch (err) {
        console.log('Could not load user profile');
      }
    }
    
    const params = new URLSearchParams($page.url.search);
    const programId = params.get('id');
    
    if (programId && $authStore.userId) {
      loadProgram(programId);
    } else {
      // Default: create with Workout A and B
      addWorkout('Workout A');
      addWorkout('Workout B');
    }
  });
  
  async function loadProgram(programId: string) {
    try {
      const program = await convex.query(api.programs.get, { 
        programId: programId as any 
      });
      if (program) {
        existingProgramId = programId;
        programName = program.name;
        programDescription = program.description || '';
        workouts = program.workouts;
      }
    } catch (err) {
      console.error('Failed to load program:', err);
    }
  }
  
  function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers (e.g. older Android WebView)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  function addWorkout(name?: string) {
    const newWorkout: ProgramWorkout = {
      id: generateId(),
      name: name || `Workout ${String.fromCharCode(65 + workouts.length)}`,
      exercises: [],
      restBetweenSets: 180
    };
    workouts = [...workouts, newWorkout];
    activeTab = workouts.length - 1;
  }
  
  function confirmRemoveWorkout(index: number) {
    workoutToRemove = index;
    showRemoveWorkoutModal = true;
  }
  
  function cancelRemoveWorkout() {
    showRemoveWorkoutModal = false;
    workoutToRemove = null;
  }
  
  function executeRemoveWorkout() {
    if (workoutToRemove === null) return;
    workouts = workouts.filter((_, i) => i !== workoutToRemove);
    if (activeTab >= workouts.length) {
      activeTab = Math.max(0, workouts.length - 1);
    }
    showRemoveWorkoutModal = false;
    workoutToRemove = null;
  }
  
  function openExerciseSelector(workoutIndex: number) {
    exerciseSelectorTargetWorkout = workoutIndex;
    showExerciseSelector = true;
  }
  

  
  function addExerciseToWorkout(exercise: Exercise) {
    if (exerciseSelectorTargetWorkout === null) return;
    
    // Get user's current weight for this exercise, or default to 20kg (empty bar)
    const userWeight = userExercises[exercise.id]?.currentWeight;
    const defaultWeight = userWeight ?? 20;
    
    const newExercise: ProgramExercise = {
      exerciseId: exercise.id,
      sets: 3,
      reps: 5,
      startingWeight: defaultWeight,
      progression: { ...exercise.defaultProgression }
    };
    
    workouts[exerciseSelectorTargetWorkout].exercises = [
      ...workouts[exerciseSelectorTargetWorkout].exercises,
      newExercise
    ];
    workouts = [...workouts];
    showExerciseSelector = false;
    exerciseSelectorTargetWorkout = null;
  }
  
  function removeExercise(workoutIndex: number, exerciseIndex: number) {
    workouts[workoutIndex].exercises = workouts[workoutIndex].exercises.filter((_, i) => i !== exerciseIndex);
    workouts = [...workouts];
  }
  
  function moveExercise(workoutIndex: number, exerciseIndex: number, direction: 'up' | 'down') {
    const exercises = workouts[workoutIndex].exercises;
    if (direction === 'up' && exerciseIndex === 0) return;
    if (direction === 'down' && exerciseIndex === exercises.length - 1) return;
    
    const newIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    [exercises[exerciseIndex], exercises[newIndex]] = [exercises[newIndex], exercises[exerciseIndex]];
    workouts = [...workouts];
  }
  
  function getExerciseName(exerciseId: string): string {
    return EXERCISES.find(e => e.id === exerciseId)?.name || exerciseId;
  }
  
  function getExercise(exerciseId: string): Exercise | undefined {
    return EXERCISES.find(e => e.id === exerciseId);
  }
  
  async function toggleBodyweightProgression(exerciseId: string, useBodyweight: boolean) {
    if (!$authStore.userId) return;
    
    try {
      await convex.mutation(api.userProfiles.updateExercise, {
        userId: $authStore.userId as any,
        exerciseId,
        settings: { useBodyweightProgression: useBodyweight },
      });
      
      // Update local state
      userExercises = {
        ...userExercises,
        [exerciseId]: {
          ...(userExercises[exerciseId] || {}),
          useBodyweightProgression: useBodyweight,
        },
      };
    } catch (err) {
      console.error('Failed to update progression mode:', err);
    }
  }
  
  async function updateIncrementReps(exerciseId: string, newIncrement: number) {
    if (!$authStore.userId) return;
    
    try {
      await convex.mutation(api.userProfiles.updateExercise, {
        userId: $authStore.userId as any,
        exerciseId,
        settings: { incrementReps: newIncrement },
      });
      
      // Update local state
      userExercises = {
        ...userExercises,
        [exerciseId]: {
          ...(userExercises[exerciseId] || {}),
          incrementReps: newIncrement,
        },
      };
    } catch (err) {
      console.error('Failed to update rep increment:', err);
    }
  }
  
  function showValidation(message: string) {
    validationMessage = message;
    showValidationModal = true;
  }
  
  function closeValidation() {
    showValidationModal = false;
    validationMessage = '';
  }
  
  function showError(message: string) {
    errorMessage = message;
    showErrorModal = true;
  }
  
  function closeError() {
    showErrorModal = false;
    errorMessage = '';
  }
  
  async function saveProgram() {
    if (!$authStore.userId) {
      showValidation('Please log in to save programs');
      return;
    }
    if (!programName.trim()) {
      showValidation('Please enter a program name');
      return;
    }
    if (workouts.some(w => w.exercises.length === 0)) {
      showValidation('All workouts must have at least one exercise');
      return;
    }
    
    saving = true;
    try {
      if (existingProgramId) {
        // Update existing
        await convex.mutation(api.programs.update, {
          programId: existingProgramId as any,
          userId: $authStore.userId as any,
          name: programName.trim(),
          description: programDescription.trim(),
          workouts: workouts as any,
        });
      } else {
        // Create new
        await convex.mutation(api.programs.create, {
          userId: $authStore.userId as any,
          name: programName.trim(),
          description: programDescription.trim(),
          workouts: workouts as any,
        });
      }
      goto('/programs');
    } catch (err) {
      console.error('Failed to save program:', err);
      showError('Failed to save program. Please try again.');
    } finally {
      saving = false;
    }
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Group exercises by category
  $: exercisesByCategory = EXERCISES.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);
  
  const categoryLabels: Record<string, string> = {
    legs: 'Legs',
    push: 'Push',
    pull: 'Pull',
    core: 'Core'
  };
</script>

<svelte:head>
  <title>Program Builder - LiftLog</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-surface p-4 border-b border-surface-light">
    <div class="flex items-center justify-between">
      <button 
        on:click={() => goto('/programs')}
        class="text-text-muted hover:text-text flex items-center gap-1"
        disabled={saving}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span class="text-sm">Cancel</span>
      </button>
      <h1 class="text-xl font-bold">Program Builder</h1>
      <button
        on:click={saveProgram}
        disabled={saving}
        class="text-primary hover:text-primary-dark font-medium text-sm disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </header>
  
  <!-- Main Content -->
  <main class="flex-1 p-4 pb-40 overflow-y-auto">
    <!-- Program Info -->
    <section class="bg-surface rounded-xl p-4 mb-6">
      <h2 class="font-semibold mb-3">Program Details</h2>
      <div class="space-y-3">
        <div>
          <label for="program-name" class="block text-sm text-text-muted mb-1">Name *</label>
          <input
            id="program-name"
            type="text"
            bind:value={programName}
            placeholder="e.g., Stronglifts 5x5"
            disabled={saving}
            class="w-full bg-surface-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>
        <div>
          <label for="program-description" class="block text-sm text-text-muted mb-1">Description (optional)</label>
          <textarea
            id="program-description"
            bind:value={programDescription}
            placeholder="Brief description of the program..."
            rows="2"
            disabled={saving}
            class="w-full bg-surface-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
          ></textarea>
        </div>
      </div>
    </section>
    
    <!-- Workout Tabs -->
    <section class="mb-4">
      <div class="flex items-center gap-2 overflow-x-auto pb-2">
        {#each workouts as workout, index}
          <button
            on:click={() => activeTab = index}
            disabled={saving}
            class="px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors {activeTab === index ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:text-text'} disabled:opacity-50"
          >
            {workout.name}
          </button>
        {/each}
        <button
          type="button"
          on:click={() => addWorkout()}
          disabled={saving}
          class="px-4 py-2.5 rounded-lg bg-surface text-text-muted hover:text-text hover:bg-surface-light transition-colors disabled:opacity-50 flex items-center gap-2 font-medium min-h-[44px] select-none whitespace-nowrap"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Add</span>
        </button>
      </div>
    </section>
    
    <!-- Active Workout Editor -->
    {#if workouts[activeTab]}
      {@const workout = workouts[activeTab]}
      <section class="space-y-4">
        <!-- Workout Header -->
        <div class="bg-surface rounded-xl p-4">
          <div class="flex items-center gap-3 mb-3">
            <input
              type="text"
              bind:value={workout.name}
              disabled={saving}
              class="flex-1 bg-surface-light rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            {#if workouts.length > 1}
              <button
                on:click={() => confirmRemoveWorkout(activeTab)}
                disabled={saving}
                class="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Remove workout"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            {/if}
          </div>
          
          <div>
            <label for="rest-between-sets" class="block text-sm text-text-muted mb-1">Rest between sets</label>
            <div class="flex items-center gap-2">
              <input
                id="rest-between-sets"
                type="range"
                min="30"
                max="600"
                step="30"
                bind:value={workout.restBetweenSets}
                disabled={saving}
                class="flex-1 disabled:opacity-50"
              />
              <span class="text-sm font-mono w-16 text-right">{formatTime(workout.restBetweenSets)}</span>
            </div>
          </div>
        </div>
        
        <!-- Exercises List -->
        <div class="space-y-3">
          {#each workout.exercises as exercise, exerciseIndex}
            {@const exerciseData = getExercise(exercise.exerciseId)}
            <div class="bg-surface rounded-xl p-4">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h4 class="font-medium">{getExerciseName(exercise.exerciseId)}</h4>
                  {#if exerciseData}
                    <p class="text-xs text-text-muted">{exerciseData.category} • {exerciseData.equipment.join(', ')}</p>
                  {/if}
                </div>
                <div class="flex gap-1">
                  <button
                    on:click={() => moveExercise(activeTab, exerciseIndex, 'up')}
                    disabled={saving || exerciseIndex === 0}
                    class="p-1.5 text-text-muted hover:text-text hover:bg-surface-light rounded-lg transition-colors disabled:opacity-30"
                    aria-label="Move exercise up"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    on:click={() => moveExercise(activeTab, exerciseIndex, 'down')}
                    disabled={saving || exerciseIndex === workout.exercises.length - 1}
                    class="p-1.5 text-text-muted hover:text-text hover:bg-surface-light rounded-lg transition-colors disabled:opacity-30"
                    aria-label="Move exercise down"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    on:click={() => removeExercise(activeTab, exerciseIndex)}
                    disabled={saving}
                    class="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Remove exercise"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- Progression Mode Toggle (for exercises that support it) -->
              {#if exerciseData?.supportsBodyweightProgression}
                {@const useBodyweight = userExercises[exercise.exerciseId]?.useBodyweightProgression !== false}
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-xs text-text-muted">Progression:</span>
                  <div class="flex bg-surface-light rounded-lg p-0.5 flex-1">
                    <button
                      type="button"
                      on:click={() => toggleBodyweightProgression(exercise.exerciseId, true)}
                      disabled={saving}
                      class="flex-1 px-2 py-1 text-xs rounded-md transition-all {useBodyweight ? 'bg-primary text-white' : 'text-text-muted'}"
                    >
                      Bodyweight
                    </button>
                    <button
                      type="button"
                      on:click={() => toggleBodyweightProgression(exercise.exerciseId, false)}
                      disabled={saving}
                      class="flex-1 px-2 py-1 text-xs rounded-md transition-all {!useBodyweight ? 'bg-primary text-white' : 'text-text-muted'}"
                    >
                      Added Weight
                    </button>
                  </div>
                </div>
              {/if}
              
              <!-- Exercise Settings -->
              <div class="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label for="sets-{activeTab + '-' + exerciseIndex}" class="block text-xs text-text-muted mb-1">Sets</label>
                  <input
                    id="sets-{activeTab + '-' + exerciseIndex}"
                    type="number"
                    min="1"
                    max="20"
                    bind:value={exercise.sets}
                    disabled={saving}
                    class="w-full bg-surface-light rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                {#if exerciseData?.supportsBodyweightProgression && userExercises[exercise.exerciseId]?.useBodyweightProgression !== false}
                  <!-- Bodyweight mode: show target reps -->
                  <div>
                    <label for="reps-{activeTab + '-' + exerciseIndex}" class="block text-xs text-text-muted mb-1">Reps</label>
                    <input
                      id="reps-{activeTab + '-' + exerciseIndex}"
                      type="number"
                      min="1"
                      max="100"
                      value={userExercises[exercise.exerciseId]?.targetReps || exerciseData?.defaultReps || 10}
                      disabled={true}
                      class="w-full bg-surface-light/50 rounded-lg px-2 py-1.5 text-sm text-center disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <span class="block text-xs text-text-muted mb-1">Weight</span>
                    <div class="w-full bg-surface-light/50 rounded-lg px-2 py-1.5 text-sm text-center text-text-muted">
                      Bodyweight
                    </div>
                  </div>
                {:else}
                  <!-- Weighted mode: normal inputs -->
                  <div>
                    <label for="reps-{activeTab + '-' + exerciseIndex}" class="block text-xs text-text-muted mb-1">Reps</label>
                    <input
                      id="reps-{activeTab + '-' + exerciseIndex}"
                      type="number"
                      min="1"
                      max="100"
                      bind:value={exercise.reps}
                      disabled={saving}
                      class="w-full bg-surface-light rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label for="weight-{activeTab + '-' + exerciseIndex}" class="block text-xs text-text-muted mb-1">Start Wt (kg)</label>
                    <input
                      id="weight-{activeTab + '-' + exerciseIndex}"
                      type="number"
                      min="0"
                      step="0.5"
                      bind:value={exercise.startingWeight}
                      disabled={saving}
                      class="w-full bg-surface-light rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                {/if}
              </div>
              
              <!-- Progression Rules -->
              {#if exercise.progression}
                {@const useBodyweightProg = exerciseData?.supportsBodyweightProgression && userExercises[exercise.exerciseId]?.useBodyweightProgression !== false}
                <div class="bg-surface-light/50 rounded-lg p-3">
                  <p class="text-xs text-text-muted mb-2">Progression Rules</p>
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      {#if useBodyweightProg}
                        {@const isEditingIncrement = editingIncrementReps?.workoutIndex === activeTab && editingIncrementReps?.exerciseIndex === exerciseIndex}
                        <label for="increment-{activeTab + '-' + exerciseIndex}" class="block text-text-muted mb-0.5">+reps</label>
                        {#if isEditingIncrement}
                          <input
                            id="increment-{activeTab + '-' + exerciseIndex}"
                            type="number"
                            min="1"
                            max="5"
                            step="1"
                            value={userExercises[exercise.exerciseId]?.incrementReps || exerciseData?.defaultIncrementReps || 1}
                            on:blur={(e) => {
                              updateIncrementReps(exercise.exerciseId, parseInt(e.currentTarget.value) || 1);
                              editingIncrementReps = null;
                            }}
                            on:keydown={(e) => {
                              if (e.key === 'Enter') {
                                updateIncrementReps(exercise.exerciseId, parseInt(e.currentTarget.value) || 1);
                                editingIncrementReps = null;
                              }
                            }}
                            class="w-full bg-surface rounded px-2 py-1 text-center"
                            autofocus
                          />
                        {:else}
                          <button
                            type="button"
                            on:click={() => editingIncrementReps = { workoutIndex: activeTab, exerciseIndex }}
                            class="w-full bg-surface rounded px-2 py-1 text-center text-sm"
                          >
                            +{userExercises[exercise.exerciseId]?.incrementReps || exerciseData?.defaultIncrementReps || 1}
                          </button>
                        {/if}
                      {:else}
                        <label for="increment-{activeTab + '-' + exerciseIndex}" class="block text-text-muted mb-0.5">+kg</label>
                        <input
                          id="increment-{activeTab + '-' + exerciseIndex}"
                          type="number"
                          min="0"
                          step="0.5"
                          bind:value={exercise.progression.incrementKg}
                          disabled={saving}
                          class="w-full bg-surface rounded px-2 py-1 text-center disabled:opacity-50"
                        />
                      {/if}
                    </div>
                    <div>
                      <label for="deload-after-{activeTab + '-' + exerciseIndex}" class="block text-text-muted mb-0.5">Deload@</label>
                      <input
                        id="deload-after-{activeTab + '-' + exerciseIndex}"
                        type="number"
                        min="1"
                        max="10"
                        bind:value={exercise.progression.deloadAfterFailures}
                        disabled={saving}
                        class="w-full bg-surface rounded px-2 py-1 text-center disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label for="deload-percent-{activeTab + '-' + exerciseIndex}" class="block text-text-muted mb-0.5">Deload %</label>
                      <input
                        id="deload-percent-{activeTab + '-' + exerciseIndex}"
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={Math.round(((exercise.progression?.deloadPercent) || 0.1) * 100)}
                        on:input={(e) => {
                          if (exercise.progression) {
                            exercise.progression.deloadPercent = parseInt(e.currentTarget.value) / 100;
                          }
                        }}
                        disabled={saving}
                        class="w-full bg-surface rounded px-2 py-1 text-center disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
          
          <!-- Add Exercise Button -->
          <button
            type="button"
            on:click={() => openExerciseSelector(activeTab)}
            disabled={saving}
            class="w-full py-5 bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl text-white font-semibold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed min-h-[60px] mb-32"
          >
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add Exercise
          </button>
        </div>
      </section>
    {/if}
  </main>
  
  <!-- Save Button Fixed Bottom -->
  <footer class="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light p-4" style="z-index: 90;">
    <button
      on:click={saveProgram}
      disabled={saving}
      class="w-full bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? 'Saving...' : 'Save Program'}
    </button>
  </footer>
</div>

<!-- Exercise Selector Modal -->
{#if showExerciseSelector}
  <div class="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" style="z-index: 100;" role="button" tabindex="0" on:click={() => showExerciseSelector = false} on:keydown={(e) => e.key === 'Enter' && (showExerciseSelector = false)}>
    <div class="bg-surface w-full max-w-lg max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col" role="presentation" on:click|stopPropagation>
      <!-- Modal Header -->
      <div class="p-4 border-b border-surface-light flex items-center justify-between">
        <h3 class="font-semibold">Select Exercise</h3>
        <button on:click={() => showExerciseSelector = false} class="p-2 hover:bg-surface-light rounded-lg" aria-label="Close exercise selector">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Exercise List -->
      <div class="flex-1 overflow-y-auto p-4">
        {#each Object.entries(exercisesByCategory) as [category, exercises]}
          <div class="mb-4">
            <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{categoryLabels[category] || category}</h4>
            <div class="space-y-1">
              {#each exercises as exercise}
                <button
                  on:click={() => addExerciseToWorkout(exercise)}
                  class="w-full text-left p-3 rounded-lg hover:bg-surface-light transition-colors flex items-center justify-between"
                >
                  <div>
                    <p class="font-medium text-sm">{exercise.name}</p>
                    <p class="text-xs text-text-muted">{exercise.equipment.join(', ')}</p>
                  </div>
                  <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}


<!-- Remove Workout Confirmation Modal -->
{#if showRemoveWorkoutModal}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0" on:click={cancelRemoveWorkout} on:keydown={(e) => e.key === 'Enter' && cancelRemoveWorkout()}>
    <div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation" on:click|stopPropagation>
      <h3 class="text-xl font-bold mb-2">Remove Workout?</h3>
      <p class="text-text-muted mb-6">This workout and all its exercises will be removed. This action cannot be undone.</p>
      
      <div class="flex gap-3">
        <button
          on:click={cancelRemoveWorkout}
          class="flex-1 px-4 py-3 bg-surface-light hover:bg-surface-light/80 rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          on:click={executeRemoveWorkout}
          class="flex-1 px-4 py-3 bg-danger hover:bg-danger/80 text-white rounded-xl font-medium"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Validation Modal -->
{#if showValidationModal}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0" on:click={closeValidation} on:keydown={(e) => e.key === 'Enter' && closeValidation()}>
    <div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation" on:click|stopPropagation>
      <h3 class="text-xl font-bold mb-2">Validation Error</h3>
      <p class="text-text-muted mb-6">{validationMessage}</p>
      
      <button
        on:click={closeValidation}
        class="w-full px-4 py-3 bg-primary hover:bg-primary-dark rounded-xl font-medium"
      >
        OK
      </button>
    </div>
  </div>
{/if}

<!-- Error Modal -->
{#if showErrorModal}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0" on:click={closeError} on:keydown={(e) => e.key === 'Enter' && closeError()}>
    <div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation" on:click|stopPropagation>
      <h3 class="text-xl font-bold mb-2">Error</h3>
      <p class="text-text-muted mb-6">{errorMessage}</p>
      
      <button
        on:click={closeError}
        class="w-full px-4 py-3 bg-primary hover:bg-primary-dark rounded-xl font-medium"
      >
        OK
      </button>
    </div>
  </div>
{/if}
