<script lang="ts">
  import { goto } from '$app/navigation';
  import { convex, api, authStore } from '$lib/convex';
  
  let workouts: any[] = $state([]);
  let loading = $state(true);
  let authChecked = $state(false);
  
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
          on:click={() => goto('/')}
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
          <div class="bg-surface rounded-xl p-4">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="font-semibold">{workout.plan?.length || 0} Exercises</span>
                <span class="text-sm text-text-muted ml-2">({completedSets}/{totalSets} sets)</span>
              </div>
              <span class="text-sm text-text-muted">
                {new Date(workout.startedAt).toLocaleDateString()}
              </span>
            </div>
            {#if totalVolume > 0}
              <div class="text-sm text-primary">
                {Math.round(totalVolume)} kg total volume
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </main>
  

</div>
