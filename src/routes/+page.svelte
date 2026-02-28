<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { convex, api, authStore } from '$lib/convex';
  import { DEFAULT_WORKOUT_A, DEFAULT_WORKOUT_B } from '$lib/data/exercises';
  import type { TrainingProgram } from '$lib/types';
  
  let profile: any = $state(null);
  let loading = $state(true);
  let activeProgram: TrainingProgram | null = $state(null);
  let needsOnboarding = $state(false);
  
  // Load profile and active program when user is available
  $effect(() => {
    if ($authStore.userId && loading) {
      loadData();
    }
  });
  
  // Also handle case where auth is already loaded
  onMount(() => {
    if (!$authStore.isLoading && loading) {
      loading = false;
    }
  });
  
  async function loadData() {
    if (!$authStore.userId) return;
    try {
      // Load profile
      profile = await convex.query(api.userProfiles.get, { 
        userId: $authStore.userId as any 
      });
      
      // Create profile if it doesn't exist
      if (!profile) {
        await convex.mutation(api.userProfiles.getOrCreate, { 
          userId: $authStore.userId as any 
        });
        profile = await convex.query(api.userProfiles.get, { 
          userId: $authStore.userId as any 
        });
      }
      
      // Check if onboarding is needed
      needsOnboarding = !profile?.onboardingCompleted;
      
      // Load active program
      const program = await convex.query(api.programs.getActive, {
        userId: $authStore.userId as any
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
  
  let recentWorkouts: any[] = [];
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
    
    <!-- Quick Start Section -->
    <section class="bg-surface rounded-xl p-4">
      <h2 class="text-lg font-semibold mb-3">Start Workout</h2>
      
      {#if loading}
        <div class="text-center py-8">
          <div class="animate-spin text-4xl mb-4">⏳</div>
          <p class="text-text-muted">Loading...</p>
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
      
      {:else if activeProgram}
        <!-- Active Program Workouts -->
        <div class="mb-3">
          <p class="text-sm text-text-muted mb-2">
            From: <span class="text-text font-medium">{activeProgram.name}</span>
          </p>
          <div class="grid grid-cols-2 gap-3">
            {#each activeProgram.workouts as workout, index}
              <button
                on:click={() => startProgramWorkout(index)}
                class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"
              >
                <span class="text-xl">{String.fromCharCode(65 + index)}</span>
                <span class="font-semibold text-sm">{workout.name}</span>
                <span class="text-xs text-white/70">{workout.exercises.length} exercises</span>
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <!-- Default Workouts -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <button
            on:click={startWorkoutA}
            class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <span class="text-2xl">🅰️</span>
            <span class="font-semibold">Workout A</span>
            <span class="text-xs text-white/70">Squat / Bench / Row</span>
          </button>
          
          <button
            on:click={startWorkoutB}
            class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <span class="text-2xl">🅱️</span>
            <span class="font-semibold">Workout B</span>
            <span class="text-xs text-white/70">Squat / OHP / Deadlift</span>
          </button>
        </div>
      {/if}
      
      <button
        on:click={startCustomWorkout}
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
            <div class="bg-surface-light rounded-lg p-3">
              <div class="flex justify-between items-center">
                <span class="font-medium">Workout {workout.type || 'A'}</span>
                <span class="text-sm text-text-muted">
                  {new Date(workout.startedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
    
  </main>
</div>
