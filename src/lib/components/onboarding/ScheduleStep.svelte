<script lang="ts">
  import type { TrainingGoalsInput } from '$lib/types';
  import { 
    validateTrainingGoalField,
    getSmartRecommendation,
    formatTimePerWorkout,
    formatWorkoutsPerWeek,
    type ValidationError 
  } from '$lib/utils/onboardingValidation';

  interface Props {
    initialData?: Partial<Pick<TrainingGoalsInput, 'timePerWorkout' | 'workoutsPerWeek'>>;
    goal?: TrainingGoalsInput['primaryGoal'];
    experience?: TrainingGoalsInput['experienceLevel'];
    onSubmit: (data: Pick<TrainingGoalsInput, 'timePerWorkout' | 'workoutsPerWeek'>) => void;
    onBack: () => void;
  }

  let { initialData, goal = 'general', experience = 'beginner', onSubmit, onBack }: Props = $props();

  // Get smart recommendation
  let recommendation = $derived(getSmartRecommendation(goal, experience));

  // Form state
  let timePerWorkout = $state<TrainingGoalsInput['timePerWorkout'] | undefined>(
    initialData?.timePerWorkout ?? recommendation.timePerWorkout
  );
  let workoutsPerWeek = $state<TrainingGoalsInput['workoutsPerWeek'] | undefined>(
    initialData?.workoutsPerWeek ?? recommendation.workoutsPerWeek
  );

  // Validation state
  let touched = $state<Record<string, boolean>>({});
  let errors = $state<ValidationError[]>([]);

  // Time options
  const timeOptions = [
    { value: 30 as const, icon: '⚡', label: '30 min', sublabel: 'Quick & focused' },
    { value: 45 as const, icon: '⏱️', label: '45 min', sublabel: 'Standard' },
    { value: 60 as const, icon: '🕐', label: '60 min', sublabel: 'Full workout' },
    { value: 90 as const, icon: '🕑', label: '90 min', sublabel: 'High volume' },
  ];

  // Frequency options
  const frequencyOptions = [
    { value: 2 as const, label: '2', sublabel: 'Minimal' },
    { value: 3 as const, label: '3', sublabel: 'Recommended' },
    { value: 4 as const, label: '4', sublabel: 'Dedicated' },
    { value: 5 as const, label: '5', sublabel: 'Committed' },
    { value: 6 as const, label: '6', sublabel: 'Advanced' },
  ];

  // Computed
  let isValid = $derived(() => {
    return timePerWorkout && workoutsPerWeek && errors.length === 0;
  });

  let isRecommended = $derived(() => {
    return timePerWorkout === recommendation.timePerWorkout && 
           workoutsPerWeek === recommendation.workoutsPerWeek;
  });

  // Validate on change
  $effect(() => {
    const newErrors: ValidationError[] = [];
    
    const timeError = validateTrainingGoalField('timePerWorkout', timePerWorkout);
    if (timeError) newErrors.push({ field: 'timePerWorkout', message: timeError });
    
    const freqError = validateTrainingGoalField('workoutsPerWeek', workoutsPerWeek);
    if (freqError) newErrors.push({ field: 'workoutsPerWeek', message: freqError });
    
    errors = newErrors;
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    
    touched = { timePerWorkout: true, workoutsPerWeek: true };
    
    if (isValid() && timePerWorkout && workoutsPerWeek) {
      onSubmit({ timePerWorkout, workoutsPerWeek });
    }
  }

  function applyRecommendation() {
    timePerWorkout = recommendation.timePerWorkout;
    workoutsPerWeek = recommendation.workoutsPerWeek;
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col h-full">
  <div class="flex-1 space-y-6 overflow-y-auto">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold mb-2">Schedule & Time</h2>
      <p class="text-text-muted text-sm">
        How much time can you dedicate to training?
      </p>
    </div>

    <!-- Smart Recommendation Banner -->
    {#if !isRecommended()}
      <button
        type="button"
        onclick={applyRecommendation}
        class="w-full p-4 bg-primary/10 border border-primary/30 rounded-xl text-left transition-all hover:bg-primary/20"
      >
        <div class="flex items-start gap-3">
          <div class="text-xl">💡</div>
          <div class="flex-1">
            <div class="font-medium text-primary">Recommended for you</div>
            <div class="text-sm text-text-muted mt-1">
              {formatTimePerWorkout(recommendation.timePerWorkout)}, {formatWorkoutsPerWeek(recommendation.workoutsPerWeek)}
            </div>
            <div class="text-xs text-text-muted mt-1">{recommendation.reasoning}</div>
          </div>
          <span class="text-primary text-sm font-medium">Apply</span>
        </div>
      </button>
    {:else}
      <div class="p-4 bg-success/10 border border-success/30 rounded-xl">
        <div class="flex items-center gap-3">
          <div class="text-xl">✓</div>
          <div>
            <div class="font-medium text-success">Optimal choice for your goal</div>
            <div class="text-sm text-text-muted">{recommendation.reasoning}</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Time per Workout -->
    <div>
      <label class="block text-sm font-medium mb-3">Time per workout *</label>
      <div class="grid grid-cols-2 gap-3">
        {#each timeOptions as time}
          <button
            type="button"
            class="p-4 rounded-xl border-2 transition-all text-left relative {timePerWorkout === time.value ? 'border-primary bg-primary bg-opacity-10' : 'border-surface-light bg-surface-light'}"
            onclick={() => {
              timePerWorkout = time.value;
              touched.timePerWorkout = true;
            }}
          >
            {#if recommendation.timePerWorkout === time.value}
              <div class="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                Recommended
              </div>
            {/if}
            <div class="text-2xl mb-1">{time.icon}</div>
            <div class="font-medium">
              {time.label}
            </div>
            <div class="text-xs text-text-muted">{time.sublabel}</div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Days per Week -->
    <div>
      <label class="block text-sm font-medium mb-3">Days per week *</label>
      <div class="bg-surface-light rounded-xl p-1">
        <div class="grid grid-cols-5 gap-1">
          {#each frequencyOptions as freq}
            <button
              type="button"
              class="p-3 rounded-lg transition-all flex flex-col items-center {workoutsPerWeek === freq.value ? 'bg-primary text-white' : 'hover:bg-surface'}"
              onclick={() => {
                workoutsPerWeek = freq.value;
                touched.workoutsPerWeek = true;
              }}
            >
              <div class="font-bold text-lg">{freq.label}</div>
              <div class="text-xs opacity-70">{freq.sublabel}</div>
            </button>
          {/each}
        </div>
      </div>
      <p class="text-xs text-text-muted mt-2">
        Each workout includes warmup, main lifts, and accessories based on available time
      </p>
    </div>

    <!-- Summary -->
    {#if timePerWorkout && workoutsPerWeek}
      <div class="bg-surface-light/50 rounded-xl p-4">
        <div class="text-sm font-medium mb-2">Your schedule</div>
        <div class="flex justify-between text-sm">
          <span class="text-text-muted">Weekly commitment:</span>
          <span class="font-medium">~{(timePerWorkout * workoutsPerWeek / 60).toFixed(1)} hours</span>
        </div>
        <div class="flex justify-between text-sm mt-1">
          <span class="text-text-muted">Sessions:</span>
          <span class="font-medium">{workoutsPerWeek} × {timePerWorkout} min</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Navigation -->
  <div class="flex gap-3 pt-6 mt-auto">
    <button
      type="button"
      onclick={onBack}
      class="px-6 py-3 bg-surface-light hover:bg-surface rounded-xl font-medium transition-colors"
    >
      Back
    </button>
    <button
      type="submit"
      disabled={!isValid()}
      class="flex-1 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all active:scale-95"
    >
      Continue
    </button>
  </div>
</form>
