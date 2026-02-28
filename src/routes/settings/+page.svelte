<script lang="ts">
  import { EXERCISES } from '$lib/data/exercises';
  import { EQUIPMENT_LIST } from '$lib/types';
  import type { UserExerciseSettings } from '$lib/types';
  import ImportStronglifts from '$lib/components/ImportStronglifts.svelte';
  import AiSettingsForm from '$lib/components/AiSettingsForm.svelte';
  import { onMount } from 'svelte';
  import { convex, api, authStore } from '$lib/convex';
  
  let profile: any = $state(null);
  let loading = $state(true);
  
  // Local state that syncs with profile
  let exerciseSettings: Record<string, UserExerciseSettings> = $state({});
  let selectedEquipment: string[] = $state([]);
  let editingExercise: string | null = $state(null);
  let editingIncrement: string | null = $state(null);
  let importStatus: 'idle' | 'success' | 'error' = $state('idle');
  let importMessage = $state('');
  let equipmentSaveStatus: 'idle' | 'saving' | 'saved' = $state('idle');
  let unitSaveStatus: 'idle' | 'saving' | 'saved' = $state('idle');
  let unitPreference = $state({ weightUnit: 'kg' as 'kg' | 'lbs', distanceUnit: 'cm' as 'cm' | 'inches' });
  
  // Load profile when user is available
  $effect(() => {
    if ($authStore.userId && loading) {
      loadProfile();
    }
  });
  
  async function loadProfile() {
    if (!$authStore.userId) return;
    try {
      profile = await convex.query(api.userProfiles.get, { 
        userId: $authStore.userId as any 
      });
      
      // Create profile if it doesn't exist
      if (!profile) {
        profile = await convex.mutation(api.userProfiles.getOrCreate, { 
          userId: $authStore.userId as any 
        });
        profile = await convex.query(api.userProfiles.get, { 
          userId: $authStore.userId as any 
        });
      }
      
      // Sync local state
      if (profile) {
        exerciseSettings = profile.exercises || {};
        selectedEquipment = profile.gymEquipment || [];
        if (profile.unitPreference) {
          unitPreference = profile.unitPreference;
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      loading = false;
    }
  }
  
  async function toggleEquipment(equipment: string) {
    if (!$authStore.userId) return;
    
    let newEquipment: string[];
    if (selectedEquipment.includes(equipment)) {
      newEquipment = selectedEquipment.filter(e => e !== equipment);
    } else {
      newEquipment = [...selectedEquipment, equipment];
    }
    selectedEquipment = newEquipment;
    
    equipmentSaveStatus = 'saving';
    try {
      await convex.mutation(api.userProfiles.updateEquipment, {
        userId: $authStore.userId as any,
        equipment: newEquipment,
      });
      equipmentSaveStatus = 'saved';
      setTimeout(() => {
        if (equipmentSaveStatus === 'saved') {
          equipmentSaveStatus = 'idle';
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to save equipment:', err);
      equipmentSaveStatus = 'idle';
    }
  }
  
  async function updateWeight(exerciseId: string, newWeight: number) {
    if (!$authStore.userId) return;
    
    try {
      await convex.mutation(api.userProfiles.updateExercise, {
        userId: $authStore.userId as any,
        exerciseId,
        settings: { currentWeight: newWeight },
      });
      
      // Update local state
      exerciseSettings = {
        ...exerciseSettings,
        [exerciseId]: {
          ...exerciseSettings[exerciseId],
          currentWeight: newWeight,
        },
      };
    } catch (err) {
      console.error('Failed to update weight:', err);
    }
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
      const currentSettings = exerciseSettings[exerciseId] || {};
      exerciseSettings = {
        ...exerciseSettings,
        [exerciseId]: {
          ...currentSettings,
          useBodyweightProgression: useBodyweight,
        },
      };
    } catch (err) {
      console.error('Failed to update progression mode:', err);
    }
  }
  
  async function updateTargetReps(exerciseId: string, newReps: number) {
    if (!$authStore.userId) return;
    
    try {
      await convex.mutation(api.userProfiles.updateExercise, {
        userId: $authStore.userId as any,
        exerciseId,
        settings: { targetReps: newReps },
      });
      
      // Update local state
      const currentSettings = exerciseSettings[exerciseId] || {};
      exerciseSettings = {
        ...exerciseSettings,
        [exerciseId]: {
          ...currentSettings,
          targetReps: newReps,
        },
      };
    } catch (err) {
      console.error('Failed to update target reps:', err);
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
      const currentSettings = exerciseSettings[exerciseId] || {};
      exerciseSettings = {
        ...exerciseSettings,
        [exerciseId]: {
          ...currentSettings,
          incrementReps: newIncrement,
        },
      };
    } catch (err) {
      console.error('Failed to update rep increment:', err);
    }
  }
  
  function formatEquipmentName(name: string): string {
    return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  
  async function updateUnitPreference(weightUnit: 'kg' | 'lbs') {
    if (!$authStore.userId) return;
    
    const newPreference = {
      weightUnit,
      distanceUnit: weightUnit === 'kg' ? 'cm' : 'inches',
    };
    
    unitPreference = newPreference;
    unitSaveStatus = 'saving';
    
    try {
      await convex.mutation(api.userProfiles.updateUnitPreference, {
        userId: $authStore.userId as any,
        unitPreference: newPreference,
      });
      unitSaveStatus = 'saved';
      setTimeout(() => {
        if (unitSaveStatus === 'saved') {
          unitSaveStatus = 'idle';
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to save unit preference:', err);
      unitSaveStatus = 'idle';
    }
  }
  
  async function handleImport(data: {
    workouts: any[];
    currentWeights: Record<string, { weight: number; date: string }>;
  }) {
    if (!$authStore.userId) return;
    
    try {
      // Update exercise settings with imported weights
      for (const [exerciseId, weightData] of Object.entries(data.currentWeights)) {
        await convex.mutation(api.userProfiles.updateExercise, {
          userId: $authStore.userId as any,
          exerciseId,
          settings: { currentWeight: weightData.weight },
        });
      }
      
      // Import workouts
      await convex.mutation(api.import.importWorkouts, {
        userId: $authStore.userId as any,
        workouts: data.workouts,
        currentWeights: data.currentWeights,
      });
      
      importStatus = 'success';
      importMessage = `Imported ${data.workouts.length} workouts with ${Object.keys(data.currentWeights).length} exercises`;
      
      // Refresh profile
      await loadProfile();
    } catch (err) {
      importStatus = 'error';
      importMessage = err instanceof Error ? err.message : 'Import failed';
      console.error('Import error:', err);
    }
  }
</script>

<svelte:head>
  <title>Settings - LiftLog</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="p-4 bg-surface border-b border-surface-light">
    <h1 class="text-xl font-bold">Settings</h1>
  </header>
  
  <!-- Main Content -->
  <main class="flex-1 p-4 space-y-4 pb-24">
    
    <!-- AI Settings Section -->
    <AiSettingsForm />
    
    <!-- Import Section -->
    <ImportStronglifts onImport={handleImport} />
    
    {#if importStatus === 'success'}
      <div class="bg-success/20 text-success rounded-xl p-3 text-sm">
        {importMessage}
      </div>
    {:else if importStatus === 'error'}
      <div class="bg-danger/20 text-danger rounded-xl p-3 text-sm">
        {importMessage}
      </div>
    {/if}
    
    <!-- Exercise Settings -->
    <section class="bg-surface rounded-xl p-4">
      <h2 class="text-lg font-semibold mb-3">Exercise Settings</h2>
      
      <div class="space-y-3">
        {#each EXERCISES.filter(e => e.supportsBodyweightProgression) as exercise}
          {@const settings = exerciseSettings[exercise.id]}
          {@const useBodyweight = settings?.useBodyweightProgression !== false}
          <div class="py-3 border-b border-surface-light last:border-0">
            <div class="font-medium mb-2">{exercise.name}</div>
            
            <!-- Progression Mode Toggle -->
            <div class="flex items-center gap-2 mb-3">
              <span class="text-sm text-text-muted">Progression:</span>
              <div class="flex bg-surface-light rounded-lg p-1">
                <button
                  on:click={() => toggleBodyweightProgression(exercise.id, true)}
                  class="px-3 py-1 text-sm rounded-md transition-all {useBodyweight ? 'bg-primary text-white' : 'text-text-muted'}"
                >
                  Bodyweight
                </button>
                <button
                  on:click={() => toggleBodyweightProgression(exercise.id, false)}
                  class="px-3 py-1 text-sm rounded-md transition-all {!useBodyweight ? 'bg-primary text-white' : 'text-text-muted'}"
                >
                  Added Weight
                </button>
              </div>
            </div>
            
            {#if useBodyweight}
              <!-- Bodyweight Mode: Target Reps and Increment -->
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm text-text-muted">Target Reps</div>
                {#if editingExercise === exercise.id}
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings?.targetReps || exercise.defaultReps || 10}
                      on:blur={(e) => {
                        updateTargetReps(exercise.id, parseInt(e.currentTarget.value));
                        editingExercise = null;
                      }}
                      on:keydown={(e) => {
                        if (e.key === 'Enter') {
                          updateTargetReps(exercise.id, parseInt(e.currentTarget.value));
                          editingExercise = null;
                        }
                      }}
                      class="w-20 bg-bg rounded-lg px-2 py-1 text-right"
                      step="1"
                      autofocus
                    />
                    <span class="text-sm">reps</span>
                  </div>
                {:else}
                  <button
                    on:click={() => editingExercise = exercise.id}
                    class="text-right px-3 py-1 bg-surface-light rounded-lg"
                  >
                    <span class="font-semibold">{settings?.targetReps || exercise.defaultReps || 10}</span>
                    <span class="text-sm text-text-muted"> reps</span>
                  </button>
                {/if}
              </div>
              <div class="flex items-center justify-between">
                <div class="text-sm text-text-muted">Progression</div>
                {#if editingIncrement === exercise.id}
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-text-muted">+</span>
                    <input
                      type="number"
                      value={settings?.incrementReps || exercise.defaultIncrementReps || 1}
                      on:blur={(e) => {
                        updateIncrementReps(exercise.id, parseInt(e.currentTarget.value));
                        editingIncrement = null;
                      }}
                      on:keydown={(e) => {
                        if (e.key === 'Enter') {
                          updateIncrementReps(exercise.id, parseInt(e.currentTarget.value));
                          editingIncrement = null;
                        }
                      }}
                      class="w-16 bg-bg rounded-lg px-2 py-1 text-right"
                      step="1"
                      min="1"
                      max="5"
                      autofocus
                    />
                    <span class="text-sm">reps on success</span>
                  </div>
                {:else}
                  <button
                    on:click={() => editingIncrement = exercise.id}
                    class="text-right px-3 py-1 bg-surface-light rounded-lg"
                  >
                    <span class="text-sm text-text-muted">+</span>
                    <span class="font-semibold">{settings?.incrementReps || exercise.defaultIncrementReps || 1}</span>
                    <span class="text-sm text-text-muted"> reps on success</span>
                  </button>
                {/if}
              </div>
            {:else}
              <!-- Added Weight Mode: Current Weight -->
              <div class="flex items-center justify-between">
                <div class="text-sm text-text-muted">Current Weight</div>
                {#if editingExercise === exercise.id}
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings?.currentWeight || 0}
                      on:blur={(e) => {
                        updateWeight(exercise.id, parseFloat(e.currentTarget.value));
                        editingExercise = null;
                      }}
                      on:keydown={(e) => {
                        if (e.key === 'Enter') {
                          updateWeight(exercise.id, parseFloat(e.currentTarget.value));
                          editingExercise = null;
                        }
                      }}
                      class="w-20 bg-bg rounded-lg px-2 py-1 text-right"
                      step="1.25"
                      autofocus
                    />
                    <span class="text-sm">kg</span>
                  </div>
                {:else}
                  <button
                    on:click={() => editingExercise = exercise.id}
                    class="text-right px-3 py-1 bg-surface-light rounded-lg"
                  >
                    <span class="font-semibold">{settings?.currentWeight || 0}</span>
                    <span class="text-sm text-text-muted"> kg</span>
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>
    
    <!-- Standard Exercise Weights -->
    <section class="bg-surface rounded-xl p-4">
      <h2 class="text-lg font-semibold mb-3">Standard Exercise Weights</h2>
      
      <div class="space-y-2">
        {#each EXERCISES.slice(0, 5) as exercise}
          {@const settings = exerciseSettings[exercise.id]}
          <div class="flex items-center justify-between py-2 border-b border-surface-light last:border-0">
            <div>
              <div class="font-medium">{exercise.name}</div>
              <div class="text-xs text-text-muted">+{settings?.incrementKg || 2.5}kg on success</div>
            </div>
            
            {#if editingExercise === exercise.id}
              <div class="flex items-center gap-2">
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  type="number"
                  value={settings?.currentWeight || 20}
                  on:blur={(e) => {
                    updateWeight(exercise.id, parseFloat(e.currentTarget.value));
                    editingExercise = null;
                  }}
                  on:keydown={(e) => {
                    if (e.key === 'Enter') {
                      updateWeight(exercise.id, parseFloat(e.currentTarget.value));
                      editingExercise = null;
                    }
                  }}
                  class="w-20 bg-bg rounded-lg px-2 py-1 text-right"
                  step="1.25"
                  autofocus
                />
                <span class="text-sm">kg</span>
              </div>
            {:else}
              <button
                on:click={() => editingExercise = exercise.id}
                class="text-right px-3 py-1 bg-surface-light rounded-lg"
              >
                <span class="font-semibold">{settings?.currentWeight || 20}</span>
                <span class="text-sm text-text-muted">kg</span>
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </section>
    
    <!-- Gym Equipment -->
    <section class="bg-surface rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Available Equipment</h2>
        {#if equipmentSaveStatus === 'saving'}
          <span class="text-xs text-text-muted">Saving...</span>
        {:else if equipmentSaveStatus === 'saved'}
          <span class="text-xs text-success">Saved ✓</span>
        {/if}
      </div>
      <p class="text-sm text-text-muted mb-3">Select what you have access to</p>
      
      <div class="grid grid-cols-2 gap-2">
        {#each EQUIPMENT_LIST as equipment}
          <button
            on:click={() => toggleEquipment(equipment)}
            class="p-3 rounded-xl text-left transition-all {
              selectedEquipment.includes(equipment)
                ? 'bg-primary text-white'
                : 'bg-surface-light text-text hover:bg-surface-light/80'
            }"
          >
            <div class="flex items-center gap-2">
              <span class="text-lg">
                {selectedEquipment.includes(equipment) ? '✓' : '○'}
              </span>
              <span class="text-sm">{formatEquipmentName(equipment)}</span>
            </div>
          </button>
        {/each}
      </div>
    </section>
    
    <!-- Unit Preference -->
    <section class="bg-surface rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Units</h2>
        {#if unitSaveStatus === 'saving'}
          <span class="text-xs text-text-muted">Saving...</span>
        {:else if unitSaveStatus === 'saved'}
          <span class="text-xs text-success">Saved ✓</span>
        {/if}
      </div>
      <p class="text-sm text-text-muted mb-3">Choose your preferred units for weights and measurements</p>
      
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-2">Weight Display</label>
          <div class="flex bg-surface-light rounded-lg p-1">
            <button
              on:click={() => updateUnitPreference('kg')}
              class="flex-1 px-4 py-2 text-sm rounded-md transition-all {unitPreference.weightUnit === 'kg' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}"
            >
              Kilograms (kg)
            </button>
            <button
              on:click={() => updateUnitPreference('lbs')}
              class="flex-1 px-4 py-2 text-sm rounded-md transition-all {unitPreference.weightUnit === 'lbs' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}"
            >
              Pounds (lbs)
            </button>
          </div>
        </div>
      </div>
      
      <p class="text-xs text-text-muted mt-3">
        Changing units only affects how weights are displayed. Your workout data is always stored in kilograms.
      </p>
    </section>
    
    <!-- Program Management -->
    <section class="bg-surface rounded-xl p-4">
      <h2 class="text-lg font-semibold mb-3">Program</h2>
      <p class="text-sm text-text-muted mb-4">
        Create a new personalized training program based on your goals and schedule
      </p>
      <a
        href="/program/new"
        class="block w-full p-4 bg-primary/10 border border-primary/30 rounded-xl text-left transition-all hover:bg-primary/20"
      >
        <div class="flex items-center gap-3">
          <div class="text-2xl">🎯</div>
          <div class="flex-1">
            <div class="font-medium text-primary">Create New Program</div>
            <div class="text-sm text-text-muted">
              Generate a fresh program with your updated preferences
            </div>
          </div>
          <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </a>
    </section>
    
    <!-- About -->
    <section class="bg-surface rounded-xl p-4">
      <h2 class="text-lg font-semibold mb-3">About</h2>
      <div class="text-sm text-text-muted space-y-1">
        <p>LiftLog v0.1</p>
        <p>Personal gym training log</p>
        {#if $authStore.userId}
          <p class="text-xs mt-2">User: {$authStore.userId.slice(0, 8)}...</p>
        {/if}
      </div>
    </section>
    
  </main>
</div>
