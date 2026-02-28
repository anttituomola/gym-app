<script lang="ts">
  import { goto } from '$app/navigation';
  import type { BiometricsInput, TrainingGoalsInput, UnitPreference } from '$lib/types';
  import { convex, api } from '$lib/convex';
  import ProgressBar from './ProgressBar.svelte';
  import WelcomeStep from './WelcomeStep.svelte';
  import BiometricsStep from './BiometricsStep.svelte';
  import GoalsStep from './GoalsStep.svelte';
  import ScheduleStep from './ScheduleStep.svelte';
  import ProgramPreviewStep from './ProgramPreviewStep.svelte';

  interface Props {
    userId: string;
    onComplete?: () => void;
  }

  let { userId, onComplete }: Props = $props();

  // Steps: 0=Welcome, 1=Biometrics, 2=Goals, 3=Schedule, 4=Preview
  let currentStep = $state(0);
  const totalSteps = 5;

  // Form data
  let biometrics = $state<Partial<BiometricsInput>>({});
  let goals = $state<Partial<TrainingGoalsInput>>({});
  let schedule = $state<Partial<Pick<TrainingGoalsInput, 'timePerWorkout' | 'workoutsPerWeek'>>>({});

  // Loading state
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  // Derived unit preference from biometrics
  let unitPreference = $derived<UnitPreference>({
    weightUnit: biometrics.bodyWeightUnit || 'kg',
    distanceUnit: biometrics.heightUnit === 'inches' ? 'inches' : 'cm',
  });

  // Navigation handlers
  function goToStep(step: number) {
    currentStep = step;
    error = null;
  }

  function handleNewUser() {
    goToStep(1);
  }

  function handleImport() {
    // Navigate to import flow or show import modal
    // For now, just go to main page with import banner
    goto('/?import=true');
  }

  function handleBiometricsSubmit(data: BiometricsInput) {
    biometrics = data;
    goToStep(2);
  }

  function handleGoalsSubmit(data: Pick<TrainingGoalsInput, 'primaryGoal' | 'experienceLevel'>) {
    goals = { ...goals, ...data };
    goToStep(3);
  }

  function handleScheduleSubmit(data: Pick<TrainingGoalsInput, 'timePerWorkout' | 'workoutsPerWeek'>) {
    schedule = data;
    goals = { ...goals, ...data };
    goToStep(4);
  }

  async function handleConfirm() {
    if (!biometrics.sex || !goals.primaryGoal || !goals.timePerWorkout || !goals.workoutsPerWeek) {
      error = 'Missing required information';
      return;
    }

    isSubmitting = true;
    error = null;

    try {
      const result = await convex.mutation(api.onboarding.completeOnboarding, {
        userId,
        biometrics: biometrics as BiometricsInput,
        trainingGoals: goals as TrainingGoalsInput,
      });

      // Success - redirect to home or workout
      if (onComplete) {
        onComplete();
      } else {
        goto('/');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create program. Please try again.';
      isSubmitting = false;
    }
  }

  // Step titles for progress bar context
  const stepTitles = [
    'Welcome',
    'About You',
    'Your Goals',
    'Schedule',
    'Review',
  ];
</script>

<div class="min-h-screen bg-bg flex flex-col">
  <!-- Header with Progress -->
  {#if currentStep > 0}
    <header class="p-4 bg-surface border-b border-surface-light">
      <div class="max-w-md mx-auto">
        <div class="flex items-center gap-3 mb-4">
          <button
            onclick={() => goToStep(currentStep - 1)}
            class="p-2 -ml-2 hover:bg-surface-light rounded-lg transition-colors"
            aria-label="Go back"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 class="font-semibold">{stepTitles[currentStep]}</h1>
        </div>
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps - 1} />
      </div>
    </header>
  {/if}

  <!-- Error Banner -->
  {#if error}
    <div class="bg-danger/10 border-b border-danger/30 p-4">
      <div class="max-w-md mx-auto flex items-center gap-3">
        <svg class="w-5 h-5 text-danger flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-danger text-sm">{error}</p>
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <main class="flex-1 p-4">
    <div class="max-w-md mx-auto h-full">
      {#if currentStep === 0}
        <WelcomeStep
          onNewUser={handleNewUser}
          onImport={handleImport}
        />
      {:else if currentStep === 1}
        <BiometricsStep
          initialData={biometrics}
          onSubmit={handleBiometricsSubmit}
          onBack={() => goToStep(0)}
        />
      {:else if currentStep === 2}
        <GoalsStep
          initialData={goals}
          onSubmit={handleGoalsSubmit}
          onBack={() => goToStep(1)}
        />
      {:else if currentStep === 3}
        <ScheduleStep
          initialData={schedule}
          goal={goals.primaryGoal}
          experience={goals.experienceLevel}
          onSubmit={handleScheduleSubmit}
          onBack={() => goToStep(2)}
        />
      {:else if currentStep === 4}
        <ProgramPreviewStep
          biometrics={biometrics as BiometricsInput}
          goals={goals as TrainingGoalsInput}
          {unitPreference}
          onConfirm={handleConfirm}
          onBack={() => goToStep(3)}
        />
      {/if}
    </div>
  </main>

  <!-- Loading Overlay -->
  {#if isSubmitting}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-surface rounded-2xl p-8 flex flex-col items-center">
        <div class="animate-spin text-4xl mb-4">⏳</div>
        <p class="font-medium">Creating your program...</p>
        <p class="text-sm text-text-muted mt-1">This may take a moment</p>
      </div>
    </div>
  {/if}
</div>
