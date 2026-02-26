<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { generateWorkoutModificationWithFallback, type FallbackOption } from '$lib/services/aiWorkoutModification';
  import { MODIFICATION_PRESETS, PRESET_CATEGORIES, INJURY_BODY_PARTS, EQUIPMENT_OPTIONS, buildCustomRequest } from '$lib/data/modificationPresets';
  import { aiSettingsStore, aiAvailable, getLlmConfig } from '$lib/stores/aiSettings';
  import type { ModificationResponse, ModificationRequest, QuickActionContext, ValidationError } from '$lib/types';
  import type { PlannedExercise, WorkoutSet } from '$lib/types';
  import { getExerciseById } from '$lib/data/exercises';
  import { goto } from '$app/navigation';
  
  // Props
  export let isOpen: boolean;
  export let currentPlan: PlannedExercise[];
  export let completedSets: WorkoutSet[];
  export let availableEquipment: string[];
  export let userExerciseSettings: Record<string, { currentWeight: number; weightUnit: 'kg' | 'lbs' }>;
  export let onConfirm: (response: ModificationResponse) => void;
  export let onCancel: () => void;
  
  // State
  type ModalState = 
    | { type: 'quick-select' }
    | { type: 'custom-input' }
    | { type: 'loading' }
    | { type: 'review'; response: ModificationResponse }
    | { type: 'refinement'; previousRequest: string }
    | { type: 'fallback'; options: FallbackOption[]; error?: string }
    | { type: 'error'; error: string; canRetry: boolean };
  
  let state: ModalState = { type: 'quick-select' };
  let selectedCategory: 'equipment' | 'injury' | 'intensity' | 'preference' | null = null;
  let selectedOptions: string[] = [];
  let customRequest = '';
  let previousRequests: string[] = [];
  
  // Check if AI is available
  $: hasAi = $aiAvailable;
  
  // Reset state when modal opens
  $: if (isOpen) {
    state = { type: 'quick-select' };
    selectedCategory = null;
    selectedOptions = [];
    customRequest = '';
    previousRequests = [];
  }
  
  // Get presets for selected category
  $: categoryPresets = selectedCategory 
    ? MODIFICATION_PRESETS.filter(p => p.category === selectedCategory)
    : [];
  
  // Build context for preset requests
  function buildContext(): QuickActionContext {
    return {
      currentPlan,
      availableEquipment,
      selectedBodyParts: selectedCategory === 'injury' ? selectedOptions : undefined,
      selectedEquipment: selectedCategory === 'equipment' ? selectedOptions : undefined,
    };
  }
  
  // Handle preset selection
  async function handlePresetSelect(presetId: string) {
    const preset = MODIFICATION_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    const request = preset.buildRequest(buildContext());
    await sendModificationRequest(request);
  }
  
  // Handle custom request submission
  async function handleCustomSubmit() {
    if (!customRequest.trim()) return;
    await sendModificationRequest(customRequest.trim());
  }
  
  // Handle category-specific submission (equipment/injury/intensity selection)
  async function handleCategorySubmit() {
    if (!selectedCategory || selectedOptions.length === 0) return;
    
    const request = buildCustomRequest(selectedCategory, selectedOptions, buildContext());
    await sendModificationRequest(request);
  }
  
  // Send the modification request to AI
  async function sendModificationRequest(requestText: string) {
    const config = getLlmConfig();
    
    if (!config) {
      state = { 
        type: 'error', 
        error: 'AI not configured. Please add your API key in settings.',
        canRetry: false
      };
      return;
    }
    
    state = { type: 'loading' };
    
    const request: ModificationRequest = {
      userRequest: requestText,
      currentPlan,
      availableEquipment,
      userExerciseSettings,
      completedSets,
      previousRequests: previousRequests.length > 0 ? previousRequests : undefined,
    };
    
    try {
      const result = await generateWorkoutModificationWithFallback(request, config);
      
      if (result.success) {
        state = { type: 'review', response: result.response };
        previousRequests.push(requestText);
      } else {
        if (result.fallbackOptions && result.fallbackOptions.length > 0) {
          state = { type: 'fallback', options: result.fallbackOptions, error: result.error };
        } else {
          state = { type: 'error', error: result.error, canRetry: true };
        }
      }
    } catch (e) {
      state = { 
        type: 'error', 
        error: e instanceof Error ? e.message : 'Unknown error occurred',
        canRetry: true
      };
    }
  }
  
  // Handle refinement request
  async function handleRefinement() {
    if (state.type !== 'review') return;
    state = { type: 'refinement', previousRequest: previousRequests[previousRequests.length - 1] };
  }
  
  // Submit refinement
  async function submitRefinement(additionalDetails: string) {
    const fullRequest = `Previous request: "${previousRequests[previousRequests.length - 1]}"
    
Additional details: ${additionalDetails}`;
    await sendModificationRequest(fullRequest);
  }
  
  // Apply fallback option
  function applyFallback(option: FallbackOption) {
    const newPlan = option.apply(currentPlan);
    const changes: ModificationResponse['changes'] = [];
    
    for (let i = 0; i < currentPlan.length; i++) {
      const ex = currentPlan[i];
      const newEx = newPlan[i];
      
      if (ex && newEx && ex.exerciseId !== newEx.exerciseId) {
        changes.push({
          type: 'replace',
          originalExerciseId: ex.exerciseId,
          newExerciseId: newEx.exerciseId,
          reason: option.description,
        });
      } else if (ex && newEx && ex.sets !== newEx.sets) {
        changes.push({
          type: 'modify_sets',
          originalExerciseId: ex.exerciseId,
          reason: option.description,
        });
      }
    }
    
    const response: ModificationResponse = {
      summary: option.description,
      newPlan,
      changes,
      warnings: [],
      metadata: {
        generatedAt: Date.now(),
        modelUsed: 'fallback',
      },
    };
    onConfirm(response);
  }
  
  // Confirm the modification
  function confirmModification() {
    if (state.type !== 'review') return;
    onConfirm(state.response);
  }
  
  // Go to settings
  function goToSettings() {
    onCancel();
    goto('/settings');
  }
  
  // Get exercise name
  function getExerciseName(id: string): string {
    return getExerciseById(id)?.name || id;
  }
  
  // Format change type for display
  function formatChangeType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
    on:click={onCancel}
  >
    <div 
      class="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
      transition:fly={{ y: 20, duration: 300, easing: quintOut }}
      on:click|stopPropagation
    >
      <!-- Header -->
      <header class="p-4 border-b border-surface-light flex items-center justify-between">
        <h2 class="text-xl font-bold">Modify Workout</h2>
        <button 
          on:click={onCancel}
          class="text-text-muted hover:text-text p-1"
          aria-label="Close"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        
        <!-- Quick Select State -->
        {#if state.type === 'quick-select'}
          {#if !hasAi}
            <div class="text-center py-8">
              <div class="text-4xl mb-4">🤖</div>
              <h3 class="text-lg font-semibold mb-2">AI Features Disabled</h3>
              <p class="text-text-muted mb-4">
                To use AI workout modifications, you need to add your own API key.
                Your key is stored locally and never sent to our servers.
              </p>
              <button 
                on:click={goToSettings}
                class="bg-primary hover:bg-primary-dark px-6 py-3 rounded-xl font-semibold"
              >
                Configure AI Settings
              </button>
            </div>
          {:else}
            <p class="text-text-muted mb-4">What would you like to adjust?</p>
            
            <!-- Category Selection -->
            {#if !selectedCategory}
              <div class="grid grid-cols-2 gap-3">
                {#each PRESET_CATEGORIES as category}
                  <button
                    on:click={() => selectedCategory = category.id}
                    class="p-4 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left transition-all"
                  >
                    <div class="text-2xl mb-2">{category.icon}</div>
                    <div class="font-semibold">{category.label}</div>
                  </button>
                {/each}
                
                <button
                  on:click={() => state = { type: 'custom-input' }}
                  class="p-4 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left transition-all"
                >
                  <div class="text-2xl mb-2">💬</div>
                  <div class="font-semibold">Custom Request</div>
                </button>
              </div>
            {:else}
              <!-- Sub-options for selected category -->
              <div class="mb-4">
                <button 
                  on:click={() => { selectedCategory = null; selectedOptions = []; }}
                  class="text-sm text-text-muted hover:text-text flex items-center gap-1"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </div>
              
              {#if selectedCategory === 'equipment'}
                <p class="text-sm text-text-muted mb-3">What's unavailable?</p>
                <div class="space-y-2">
                  {#each EQUIPMENT_OPTIONS as option}
                    <button
                      on:click={() => {
                        if (selectedOptions.includes(option.id)) {
                          selectedOptions = selectedOptions.filter(id => id !== option.id);
                        } else {
                          selectedOptions = [...selectedOptions, option.id];
                        }
                      }}
                      class="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all {
                        selectedOptions.includes(option.id)
                          ? 'bg-primary text-white'
                          : 'bg-surface-light hover:bg-surface-light/80'
                      }"
                    >
                      <span class="text-xl">{option.icon}</span>
                      <span>{option.label}</span>
                      {#if selectedOptions.includes(option.id)}
                        <span class="ml-auto">✓</span>
                      {/if}
                    </button>
                  {/each}
                </div>
                
              {:else if selectedCategory === 'injury'}
                <p class="text-sm text-text-muted mb-3">Where are you experiencing pain?</p>
                <div class="space-y-2">
                  {#each INJURY_BODY_PARTS as part}
                    <button
                      on:click={() => {
                        if (selectedOptions.includes(part.id)) {
                          selectedOptions = selectedOptions.filter(id => id !== part.id);
                        } else {
                          selectedOptions = [...selectedOptions, part.id];
                        }
                      }}
                      class="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all {
                        selectedOptions.includes(part.id)
                          ? 'bg-warning/20 text-warning border border-warning'
                          : 'bg-surface-light hover:bg-surface-light/80'
                      }"
                    >
                      <span class="text-xl">{part.icon}</span>
                      <span>{part.label}</span>
                      {#if selectedOptions.includes(part.id)}
                        <span class="ml-auto">✓</span>
                      {/if}
                    </button>
                  {/each}
                </div>
                
              {:else if selectedCategory === 'intensity'}
                <p class="text-sm text-text-muted mb-3">How are you feeling?</p>
                <div class="space-y-3">
                  <button
                    on:click={() => { selectedOptions = ['easier']; handleCategorySubmit(); }}
                    class="w-full p-4 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">😴</span>
                      <div>
                        <div class="font-semibold">Make it Easier</div>
                        <div class="text-sm text-text-muted">Reduce volume or intensity</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    on:click={() => { selectedOptions = ['harder']; handleCategorySubmit(); }}
                    class="w-full p-4 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">💪</span>
                      <div>
                        <div class="font-semibold">Make it Harder</div>
                        <div class="text-sm text-text-muted">Increase volume or intensity</div>
                      </div>
                    </div>
                  </button>
                </div>
                
              {:else}
                <!-- Preference presets -->
                <div class="space-y-2">
                  {#each categoryPresets as preset}
                    <button
                      on:click={() => handlePresetSelect(preset.id)}
                      class="w-full p-3 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left"
                    >
                      <div class="flex items-center gap-3">
                        <span class="text-xl">{preset.icon}</span>
                        <div>
                          <div class="font-semibold">{preset.label}</div>
                          <div class="text-sm text-text-muted">{preset.description}</div>
                        </div>
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
              
              {#if selectedCategory === 'equipment' || selectedCategory === 'injury'}
                {#if selectedOptions.length > 0}
                  <button
                    on:click={handleCategorySubmit}
                    class="w-full mt-4 bg-primary hover:bg-primary-dark p-4 rounded-xl font-semibold"
                  >
                    Continue
                  </button>
                {/if}
              {/if}
            {/if}
          {/if}
          
        <!-- Custom Input State -->
        {:else if state.type === 'custom-input'}
          <div class="mb-4">
            <button 
              on:click={() => state = { type: 'quick-select' }}
              class="text-sm text-text-muted hover:text-text flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Quick Options
            </button>
          </div>
          
          <p class="text-text-muted mb-3">Describe what you need:</p>
          <textarea
            bind:value={customRequest}
            placeholder="e.g., My right shoulder hurts, can you suggest something easier for pressing?"
            class="w-full h-32 bg-surface-light rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div class="text-right text-sm text-text-muted mt-1">
            {customRequest.length}/500
          </div>
          
          <button
            on:click={handleCustomSubmit}
            disabled={!customRequest.trim()}
            class="w-full mt-4 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-xl font-semibold"
          >
            Generate Modifications
          </button>
          
        <!-- Loading State -->
        {:else if state.type === 'loading'}
          <div class="text-center py-12">
            <div class="animate-spin text-4xl mb-4">🤖</div>
            <h3 class="text-lg font-semibold mb-2">Analyzing your request...</h3>
            <p class="text-text-muted">This may take a few seconds</p>
          </div>
          
        <!-- Review State -->
        {:else if state.type === 'review'}
          {@const response = state.response}
          {@const originalExerciseCount = currentPlan.length}
          {@const newExerciseCount = response.newPlan.length}
          <div class="space-y-4">
            <!-- Summary -->
            <div class="bg-primary/10 border border-primary/30 rounded-xl p-4">
              <h3 class="font-semibold text-primary mb-1">Summary</h3>
              <p>{response.summary}</p>
            </div>
            
            <!-- Plan Size Warning -->
            {#if newExerciseCount < originalExerciseCount}
              <div class="bg-danger/10 border border-danger/30 rounded-xl p-4">
                <h3 class="font-semibold text-danger mb-1">⚠️ Incomplete Plan</h3>
                <p class="text-sm">
                  The AI returned only {newExerciseCount} exercise{newExerciseCount === 1 ? '' : 's'} 
                  (you had {originalExerciseCount}). 
                  <strong>This may not be what you want.</strong>
                </p>
                <button
                  on:click={() => submitRefinement('Please include ALL exercises in the plan, not just the changed ones. Keep the original workout structure.')}
                  class="mt-2 text-sm text-primary hover:underline"
                >
                  Ask AI to include all exercises →
                </button>
              </div>
            {/if}
            
            <!-- Warnings -->
            {#if response.warnings.length > 0}
              <div class="bg-warning/10 border border-warning/30 rounded-xl p-4">
                <h3 class="font-semibold text-warning mb-1">⚠️ Warnings</h3>
                <ul class="list-disc list-inside text-sm space-y-1">
                  {#each response.warnings as warning}
                    <li>{warning}</li>
                  {/each}
                </ul>
              </div>
            {/if}
            
            <!-- Changes -->
            {#if response.changes.length > 0}
              <div>
                <h3 class="font-semibold mb-2">Changes Made</h3>
                <div class="space-y-2">
                  {#each response.changes as change}
                    <div class="bg-surface-light rounded-lg p-3 text-sm">
                      <span class="font-medium">{formatChangeType(change.type)}:</span>
                      {#if change.originalExerciseId}
                        <span class="line-through text-text-muted">{getExerciseName(change.originalExerciseId)}</span>
                        {#if change.newExerciseId}
                          <span class="mx-1">→</span>
                          <span class="text-success">{getExerciseName(change.newExerciseId)}</span>
                        {/if}
                      {:else}
                        {change.reason}
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            
            <!-- New Plan Preview -->
            <div>
              <h3 class="font-semibold mb-2">New Workout Plan</h3>
              <div class="space-y-2">
                {#each response.newPlan as exercise}
                  {@const exerciseData = getExerciseById(exercise.exerciseId)}
                  <div class="bg-surface-light rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <div class="font-medium">{exerciseData?.name || exercise.exerciseId}</div>
                      <div class="text-sm text-text-muted">
                        {exercise.sets} sets × {exercise.reps} reps
                        {#if exercise.weight > 0}
                          @ {exercise.weight}kg
                        {:else if exercise.timeSeconds}
                          @ {exercise.timeSeconds}s hold
                        {:else}
                          (bodyweight)
                        {/if}
                      </div>
                    </div>
                    {#if exerciseData}
                      <span class="text-xs px-2 py-1 bg-surface rounded text-text-muted">
                        {exerciseData.category}
                      </span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
            
            <!-- Actions -->
            <div class="space-y-2 pt-2">
              <button
                on:click={confirmModification}
                class="w-full bg-primary hover:bg-primary-dark p-4 rounded-xl font-semibold"
              >
                ✓ Looks Good - Start Modified Workout
              </button>
              <div class="flex gap-2">
                <button
                  on:click={handleRefinement}
                  class="flex-1 bg-surface-light hover:bg-surface-light/80 p-3 rounded-xl"
                >
                  Add Details...
                </button>
                <button
                  on:click={() => state = { type: 'quick-select' }}
                  class="flex-1 bg-surface-light hover:bg-surface-light/80 p-3 rounded-xl text-text-muted"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
          
        <!-- Refinement State -->
        {:else if state.type === 'refinement'}
          <div class="mb-4">
            <button 
              on:click={() => state = { type: 'review', response: (state as any).previousState?.response }}
              class="text-sm text-text-muted hover:text-text flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Review
            </button>
          </div>
          
          <p class="text-text-muted mb-3">What would you like to change?</p>
          <textarea
            class="w-full h-32 bg-surface-light rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Can you make the leg exercises lighter? I want to save energy for upper body."
            on:change={(e) => submitRefinement(e.currentTarget.value)}
          />
          
        <!-- Fallback State -->
        {:else if state.type === 'fallback'}
          <div class="text-center mb-4">
            <div class="text-3xl mb-2">🛠️</div>
            <h3 class="font-semibold">AI Response Issue</h3>
            {#if state.error}
              <div class="bg-danger/10 border border-danger/30 rounded-xl p-3 mt-2 mb-2">
                <p class="text-sm text-danger">{state.error}</p>
              </div>
            {:else}
              <p class="text-sm text-text-muted">Here are some manual options:</p>
            {/if}
          </div>
          
          <div class="space-y-2">
            {#each state.options as option}
              <button
                on:click={() => applyFallback(option)}
                class="w-full p-3 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left"
              >
                <div class="font-medium">{option.name}</div>
                <div class="text-sm text-text-muted">{option.description}</div>
              </button>
            {/each}
          </div>
          
          <button
            on:click={() => state = { type: 'quick-select' }}
            class="w-full mt-4 p-3 text-text-muted hover:text-text"
          >
            Back to Quick Options
          </button>
          
        <!-- Error State -->
        {:else if state.type === 'error'}
          <div class="text-center py-8">
            <div class="text-4xl mb-4">❌</div>
            <h3 class="text-lg font-semibold mb-2">Something went wrong</h3>
            <p class="text-text-muted mb-4">{state.error}</p>
            
            {#if state.canRetry}
              <button
                on:click={() => state = { type: 'quick-select' }}
                class="bg-primary hover:bg-primary-dark px-6 py-3 rounded-xl font-semibold"
              >
                Try Again
              </button>
            {:else}
              <button
                on:click={goToSettings}
                class="bg-primary hover:bg-primary-dark px-6 py-3 rounded-xl font-semibold"
              >
                Go to Settings
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
