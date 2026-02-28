<script lang="ts">
  import type { TrainingGoalsInput } from '$lib/types';
  import { 
    validateTrainingGoalField, 
    getFieldError, 
    getGoalDisplayName,
    getExperienceDisplayName,
    type ValidationError 
  } from '$lib/utils/onboardingValidation';

  interface Props {
    initialData?: Partial<TrainingGoalsInput>;
    onSubmit: (data: Pick<TrainingGoalsInput, 'primaryGoal' | 'experienceLevel'>) => void;
    onBack: () => void;
  }

  let { initialData, onSubmit, onBack }: Props = $props();

  // Form state
  let primaryGoal = $state<TrainingGoalsInput['primaryGoal'] | undefined>(initialData?.primaryGoal);
  let experienceLevel = $state<TrainingGoalsInput['experienceLevel'] | undefined>(initialData?.experienceLevel);
  
  // Validation state
  let touched = $state<Record<string, boolean>>({});
  let errors = $state<ValidationError[]>([]);

  // Goal options with icons and descriptions
  const goalOptions = [
    { 
      value: 'strength' as const, 
      icon: '💪', 
      title: 'Build Strength',
      description: 'Heavy weights, low reps (3-5)',
    },
    { 
      value: 'muscle' as const, 
      icon: '🏋️', 
      title: 'Build Muscle',
      description: 'Moderate volume, hypertrophy focused',
    },
    { 
      value: 'weight_loss' as const, 
      icon: '🔥', 
      title: 'Lose Weight',
      description: 'Higher reps, calorie burning',
    },
    { 
      value: 'general' as const, 
      icon: '⚡', 
      title: 'General Fitness',
      description: 'Balanced training approach',
    },
  ];

  // Experience options
  const experienceOptions = [
    { value: 'beginner' as const, label: 'Beginner', sublabel: '< 6 months' },
    { value: 'intermediate' as const, label: 'Intermediate', sublabel: '6 mo - 2 yr' },
    { value: 'advanced' as const, label: 'Advanced', sublabel: '2+ years' },
  ];

  // Computed
  let isValid = $derived(() => {
    return primaryGoal && experienceLevel && errors.length === 0;
  });

  // Validate on change
  $effect(() => {
    const newErrors: ValidationError[] = [];
    
    const goalError = validateTrainingGoalField('primaryGoal', primaryGoal);
    if (goalError) newErrors.push({ field: 'primaryGoal', message: goalError });
    
    const expError = validateTrainingGoalField('experienceLevel', experienceLevel);
    if (expError) newErrors.push({ field: 'experienceLevel', message: expError });
    
    errors = newErrors;
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    
    touched = { primaryGoal: true, experienceLevel: true };
    
    if (isValid() && primaryGoal && experienceLevel) {
      onSubmit({ primaryGoal, experienceLevel });
    }
  }

  function handleBlur(field: string) {
    touched = { ...touched, [field]: true };
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col h-full">
  <div class="flex-1 space-y-6 overflow-y-auto">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold mb-2">Your Goals</h2>
      <p class="text-text-muted text-sm">
        What's your primary fitness goal?
      </p>
    </div>

    <!-- Goal Selection -->
    <div>
      <label class="block text-sm font-medium mb-3">Primary Goal *</label>
      <div class="grid grid-cols-2 gap-3">
        {#each goalOptions as goal}
          <button
            type="button"
            class="p-4 rounded-xl border-2 transition-all text-left {primaryGoal === goal.value ? 'border-primary bg-primary bg-opacity-10' : 'border-surface-light bg-surface-light'}"
            onclick={() => {
              primaryGoal = goal.value;
              touched.primaryGoal = true;
            }}
            onblur={() => handleBlur('primaryGoal')}
          >
            <div class="text-2xl mb-2">{goal.icon}</div>
            <div class="font-medium text-sm {primaryGoal === goal.value ? 'text-primary' : ''}">
              {goal.title}
            </div>
            <div class="text-xs text-text-muted mt-1">{goal.description}</div>
          </button>
        {/each}
      </div>
      {#if touched.primaryGoal && getFieldError(errors, 'primaryGoal')}
        <p class="text-danger text-sm mt-2">{getFieldError(errors, 'primaryGoal')}</p>
      {/if}
    </div>

    <!-- Experience Level -->
    <div>
      <label class="block text-sm font-medium mb-3">Experience Level *</label>
      <div class="bg-surface-light rounded-xl p-1">
        {#each experienceOptions as exp, i}
          <button
            type="button"
            class="w-full p-3 rounded-lg text-left transition-all flex items-center justify-between {experienceLevel === exp.value ? 'bg-primary text-white' : 'text-text hover:bg-surface'}"
            onclick={() => {
              experienceLevel = exp.value;
              touched.experienceLevel = true;
            }}
            onblur={() => handleBlur('experienceLevel')}
          >
            <div>
              <div class="font-medium">{exp.label}</div>
              <div class="text-xs opacity-70">{exp.sublabel}</div>
            </div>
            {#if experienceLevel === exp.value}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            {/if}
          </button>
          {#if i < experienceOptions.length - 1}
            <div class="h-px bg-surface mx-2"></div>
          {/if}
        {/each}
      </div>
      {#if touched.experienceLevel && getFieldError(errors, 'experienceLevel')}
        <p class="text-danger text-sm mt-2">{getFieldError(errors, 'experienceLevel')}</p>
      {/if}
    </div>
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
