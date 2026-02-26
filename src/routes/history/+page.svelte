<script lang="ts">
  import { goto } from '$app/navigation';
  
  // Placeholder for workout history - will come from Convex
  const workouts: any[] = [];
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
    {#if workouts.length === 0}
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
          <div class="bg-surface rounded-xl p-4">
            <div class="flex justify-between items-start mb-2">
              <span class="font-semibold">Workout</span>
              <span class="text-sm text-text-muted">
                {new Date(workout.startedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
  

</div>
