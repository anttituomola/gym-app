<script lang="ts">
  import { goto } from '$app/navigation';
  import { convex, api, authStore } from '$lib/convex';
  import { formatDate } from '$lib/utils/date';
  import { getExerciseById } from '$lib/data/exercises';
  
  let workouts: any[] = $state([]);
  let loading = $state(true);
  let authChecked = $state(false);
  
  // Modal state for workout details
  let selectedWorkout: any = $state(null);
  let showWorkoutModal = $state(false);
  
  // Subscribe to auth store and load when ready
  $effect(() => {
    const unsub = authStore.subscribe((auth) => {
      console.log('Auth state:', auth);
      if (!auth.isLoading) {
        authChecked = true;
        if (auth.userId) {
          loadWorkouts(auth.userId);
        } else {
          loading = false;
          workouts = [];
        }
      }
    });
    return () => unsub();
  });
  
  async function loadWorkouts(userId: string) {
    console.log('Loading workouts for user:', userId);
    
    try {
      const result = await convex.query(api.workouts.getHistory, { 
        userId: userId as any,
        limit: 50
      });
      console.log('Loaded workouts:', result);
      workouts = result || [];
    } catch (e) {
      console.error('Failed to load workouts:', e);
      workouts = [];
    } finally {
      loading = false;
    }
  }
  
  function openWorkoutModal(workout: any) {
    selectedWorkout = workout;
    showWorkoutModal = true;
  }
  
  function closeWorkoutModal() {
    showWorkoutModal = false;
    selectedWorkout = null;
  }
  
  function getExerciseName(exerciseId: string): string {
    return getExerciseById(exerciseId)?.name || exerciseId;
  }
</script>

<svelte:head>
  <title>History - LiftLog</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="p-4 bg-surface border-b border-surface-light">
    <h1 class="text-xl font-bold">Workout History</h1>
  </header>
  
  <!-- Main Content -->
  <main class="flex-1 p-4 pb-24">
    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin text-4xl mb-4">⏳</div>
        <p class="text-text-muted">Loading workouts...</p>
      </div>
    {:else if workouts.length === 0}
      <div class="text-center py-12">
        <div class="text-4xl mb-4">📊</div>
        <h2 class="text-lg font-semibold mb-2">No workouts yet</h2>
        <p class="text-text-muted mb-4">Complete your first workout to see history here</p>
        <button
          onclick={() => goto('/')}
          class="bg-primary hover:bg-primary-dark px-6 py-2 rounded-xl font-medium"
        >
          Start Workout
        </button>
      </div>
    {:else}
      <div class="space-y-3">
        {#each workouts as workout}
          {@const completedSets = workout.sets?.filter((s: any) => s.completedReps !== undefined || s.completedTimeSeconds !== undefined).length || 0}
          {@const totalSets = workout.sets?.length || 0}
          {@const totalVolume = workout.sets?.reduce((sum: number, s: any) => {
            if (s.completedReps && s.targetWeight > 0) {
              return sum + (s.completedReps * s.targetWeight);
            }
            return sum;
          }, 0) || 0}
          <button 
            class="bg-surface rounded-xl p-4 w-full text-left hover:bg-surface-light transition-colors"
            onclick={() => openWorkoutModal(workout)}
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="font-semibold">{workout.plan?.length || 0} Exercises</span>
                <span class="text-sm text-text-muted ml-2">({completedSets}/{totalSets} sets)</span>
              </div>
              <span class="text-sm text-text-muted">
                {formatDate(workout.startedAt)}
              </span>
            </div>
            {#if totalVolume > 0}
              <div class="text-sm text-primary">
                {Math.round(totalVolume)} kg total volume
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </main>
  
  <!-- Workout Detail Modal -->
  {#if showWorkoutModal && selectedWorkout}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onclick={closeWorkoutModal}>
      <div class="bg-surface rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-xl font-bold">Workout Details</h3>
            <p class="text-sm text-text-muted">{formatDate(selectedWorkout.startedAt)}</p>
          </div>
          <button
            onclick={closeWorkoutModal}
            class="text-text-muted hover:text-text p-2"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Exercises -->
        <div class="space-y-4">
          {#each selectedWorkout.plan as exercise}
            {@const exerciseSets = selectedWorkout.sets?.filter((s: any) => s.exerciseId === exercise.exerciseId) || []}
            {@const completedSets = exerciseSets.filter((s: any) => s.completedReps !== undefined || s.completedTimeSeconds !== undefined)}
            {@const exerciseVolume = completedSets.reduce((sum: number, s: any) => {
              if (s.completedReps && s.targetWeight > 0) {
                return sum + (s.completedReps * s.targetWeight);
              }
              return sum;
            }, 0)}
            <div class="bg-surface-light rounded-xl p-4">
              <h4 class="font-semibold mb-2">{getExerciseName(exercise.exerciseId)}</h4>
              <div class="text-sm text-text-muted mb-2">
                {exercise.sets} sets × {exercise.reps} reps @ {exercise.weight}kg
              </div>
              
              <!-- Sets detail -->
              <div class="space-y-1">
                {#each exerciseSets as set}
                  <div class="flex items-center justify-between text-sm py-1 px-2 rounded {set.completedReps !== undefined ? (set.failed ? 'bg-danger/10' : 'bg-success/10') : 'bg-surface'}" style="background-color: {set.completedReps === undefined ? 'transparent' : ''}">
                    <span class="text-text-muted">Set {set.setNumber}</span>
                    {#if set.completedReps !== undefined}
                      <span class={set.failed ? 'text-danger' : 'text-success'}>
                        {set.completedReps}/{set.targetReps} reps @ {set.targetWeight}kg
                        {#if set.failed}
                          <span class="ml-1">✗</span>
                        {:else}
                          <span class="ml-1">✓</span>
                        {/if}
                      </span>
                    {:else if set.completedTimeSeconds !== undefined}
                      <span class={set.failed ? 'text-danger' : 'text-success'}>
                        {set.completedTimeSeconds}s hold
                        {#if set.failed}
                          <span class="ml-1">✗</span>
                        {:else}
                          <span class="ml-1">✓</span>
                        {/if}
                      </span>
                    {:else}
                      <span class="text-text-muted">Not completed</span>
                    {/if}
                  </div>
                {/each}
              </div>
              
              {#if exerciseVolume > 0}
                <div class="text-xs text-primary mt-2">
                  Volume: {Math.round(exerciseVolume)} kg
                </div>
              {/if}
            </div>
          {/each}
        </div>
        
        <!-- Summary -->
        {@const totalVolume = selectedWorkout.sets?.reduce((sum: number, s: any) => {
          if (s.completedReps && s.targetWeight > 0) {
            return sum + (s.completedReps * s.targetWeight);
          }
          return sum;
        }, 0) || 0}
        {@const completedSets = selectedWorkout.sets?.filter((s: any) => s.completedReps !== undefined || s.completedTimeSeconds !== undefined).length || 0}
        {@const totalSets = selectedWorkout.sets?.length || 0}
        
        <div class="mt-6 pt-4 border-t border-surface-light">
          <div class="grid grid-cols-2 gap-4 text-center">
            <div class="bg-surface-light rounded-xl p-3">
              <div class="text-2xl font-bold text-primary">{Math.round(totalVolume)}</div>
              <div class="text-xs text-text-muted">kg total</div>
            </div>
            <div class="bg-surface-light rounded-xl p-3">
              <div class="text-2xl font-bold text-primary">{completedSets}/{totalSets}</div>
              <div class="text-xs text-text-muted">sets done</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
