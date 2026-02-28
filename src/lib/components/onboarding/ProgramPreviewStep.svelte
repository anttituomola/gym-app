<script lang="ts">
  import type { BiometricsInput, TrainingGoalsInput } from '$lib/types';
  import { formatWeight } from '$lib/utils/units';
  import { convex, api } from '$lib/convex';

  interface ProgramExercise {
    exerciseId: string;
    name: string;
    sets: number;
    reps: number;
    weight: number;
  }

  interface ProgramWorkout {
    id: string;
    name: string;
    exercises: ProgramExercise[];
  }

  interface Props {
    biometrics: BiometricsInput;
    goals: TrainingGoalsInput;
    unitPreference: { weightUnit: 'kg' | 'lbs' };
    onConfirm: () => void;
    onBack: () => void;
  }

  let { biometrics, goals, unitPreference, onConfirm, onBack }: Props = $props();

  // Loading state
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  
  // Data
  let startingWeights = $state<Record<string, number>>({});
  let workouts = $state<ProgramWorkout[]>([]);
  let splitType = $state<string>('');

  // Exercise name mapping
  const exerciseNames: Record<string, string> = {
    'squat': 'Squat',
    'bench-press': 'Bench Press',
    'barbell-row': 'Barbell Row',
    'overhead-press': 'Overhead Press',
    'deadlift': 'Deadlift',
    'pull-up': 'Pull-ups',
    'dip': 'Dips',
    'plank': 'Plank',
    'hanging-knee-raise': 'Hanging Knee Raise',
    'dumbbell-curl': 'Dumbbell Curl',
    'romaninan-deadlift': 'Romanian Deadlift',
    'incline-bench-press': 'Incline Bench Press',
    'seated-row': 'Seated Row',
    'lat-pulldown': 'Lat Pulldown',
    'leg-press': 'Leg Press',
    'goblet-squat': 'Goblet Squat',
    'dumbbell-press': 'Dumbbell Press',
  };

  // Load preview data
  $effect(() => {
    loadPreview();
  });

  async function loadPreview() {
    isLoading = true;
    error = null;

    try {
      // Get starting weights preview
      const weights = await convex.query(api.onboarding.previewStartingWeights, {
        biometrics: {
          sex: biometrics.sex,
          bodyWeight: biometrics.bodyWeight,
          bodyWeightUnit: biometrics.bodyWeightUnit,
        },
        experienceLevel: goals.experienceLevel,
        primaryGoal: goals.primaryGoal,
      });

      startingWeights = weights;

      // Generate workout preview based on goals
      workouts = generateWorkoutPreview(goals, weights);
      splitType = getSplitTypeName(goals.workoutsPerWeek);

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate program preview';
    } finally {
      isLoading = false;
    }
  }

  function getSplitTypeName(frequency: number): string {
    switch (frequency) {
      case 2: return 'Full Body A/B';
      case 3: return 'Full Body A/B/A';
      case 4: return 'Upper/Lower Split';
      case 5: return 'Modified PPL';
      case 6: return 'Push/Pull/Legs';
      default: return 'Full Body';
    }
  }

  function generateWorkoutPreview(
    goals: TrainingGoalsInput,
    weights: Record<string, number>
  ): ProgramWorkout[] {
    const timeConfigs: Record<number, { sets: number; includeAccessories: boolean }> = {
      30: { sets: 2, includeAccessories: false },
      45: { sets: 3, includeAccessories: true },
      60: { sets: 3, includeAccessories: true },
      90: { sets: 4, includeAccessories: true },
    };

    const timeConfig = timeConfigs[goals.timePerWorkout];

    // Simplified workout generation for preview
    const workoutA: ProgramWorkout = {
      id: 'A',
      name: goals.workoutsPerWeek === 4 ? 'Upper Body' : 'Workout A',
      exercises: [
        { exerciseId: 'squat', name: 'Squat', sets: timeConfig.sets, reps: getReps(), weight: weights['squat'] || 60 },
        { exerciseId: 'bench-press', name: 'Bench Press', sets: timeConfig.sets, reps: getReps(), weight: weights['bench-press'] || 40 },
        { exerciseId: 'barbell-row', name: 'Barbell Row', sets: timeConfig.sets, reps: getReps(), weight: weights['barbell-row'] || 35 },
      ],
    };

    if (timeConfig.includeAccessories) {
      workoutA.exercises.push(
        { exerciseId: 'overhead-press', name: 'Overhead Press', sets: Math.max(2, timeConfig.sets - 1), reps: getReps() + 2, weight: weights['overhead-press'] || 25 },
        { exerciseId: 'plank', name: 'Plank', sets: 2, reps: 60, weight: 0 }
      );
    }

    const workoutB: ProgramWorkout = {
      id: 'B',
      name: goals.workoutsPerWeek === 4 ? 'Lower Body' : 'Workout B',
      exercises: [
        { exerciseId: 'squat', name: 'Squat', sets: timeConfig.sets, reps: getReps(), weight: weights['squat'] || 60 },
        { exerciseId: 'overhead-press', name: 'Overhead Press', sets: timeConfig.sets, reps: getReps(), weight: weights['overhead-press'] || 25 },
        { exerciseId: 'deadlift', name: 'Deadlift', sets: goals.primaryGoal === 'strength' ? 1 : Math.max(2, timeConfig.sets - 1), reps: getReps(), weight: weights['deadlift'] || 70 },
      ],
    };

    if (timeConfig.includeAccessories) {
      workoutB.exercises.push(
        { exerciseId: 'pull-up', name: 'Pull-ups', sets: 2, reps: 8, weight: 0 },
        { exerciseId: 'hanging-knee-raise', name: 'Hanging Knee Raise', sets: 2, reps: 10, weight: 0 }
      );
    }

    return [workoutA, workoutB];
  }

  function getReps(): number {
    switch (goals.primaryGoal) {
      case 'strength': return 5;
      case 'muscle': return 10;
      case 'weight_loss': return 12;
      case 'general': return 8;
      default: return 8;
    }
  }

  function getWeeklySchedule(): string[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const schedule: string[] = [];
    
    if (goals.workoutsPerWeek === 2) {
      schedule.push('Mon: Workout A', 'Thu: Workout B');
    } else if (goals.workoutsPerWeek === 3) {
      schedule.push('Mon: Workout A', 'Wed: Workout B', 'Fri: Workout A');
    } else if (goals.workoutsPerWeek === 4) {
      schedule.push('Mon: Upper', 'Tue: Lower', 'Thu: Upper', 'Fri: Lower');
    } else if (goals.workoutsPerWeek >= 5) {
      schedule.push('Mon: Workout A', 'Tue: Workout B', 'Wed: Workout A', 'Thu: Workout B', 'Fri: Workout A');
    }
    
    return schedule;
  }
</script>

<div class="flex flex-col h-full">
  {#if isLoading}
    <div class="flex-1 flex flex-col items-center justify-center">
      <div class="animate-spin text-4xl mb-4">⏳</div>
      <p class="text-text-muted">Generating your personalized program...</p>
    </div>
  {:else if error}
    <div class="flex-1 flex flex-col items-center justify-center">
      <div class="text-4xl mb-4">⚠️</div>
      <p class="text-danger mb-4">{error}</p>
      <button
        onclick={loadPreview}
        class="px-6 py-3 bg-primary hover:bg-primary-dark rounded-xl font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  {:else}
    <div class="flex-1 space-y-4 overflow-y-auto">
      <!-- Header -->
      <div>
        <h2 class="text-xl font-bold mb-2">Your Program</h2>
        <p class="text-text-muted text-sm">
          Based on your profile, here's your personalized training program
        </p>
      </div>

      <!-- Summary Card -->
      <div class="bg-surface-light rounded-xl p-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-text-muted">Split Type</div>
            <div class="font-medium">{splitType}</div>
          </div>
          <div>
            <div class="text-text-muted">Frequency</div>
            <div class="font-medium">{goals.workoutsPerWeek} days/week</div>
          </div>
          <div>
            <div class="text-text-muted">Time per Workout</div>
            <div class="font-medium">~{goals.timePerWorkout} min</div>
          </div>
          <div>
            <div class="text-text-muted">Goal</div>
            <div class="font-medium capitalize">{goals.primaryGoal.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      <!-- Weekly Schedule -->
      <div>
        <h3 class="font-medium mb-2">Weekly Schedule</h3>
        <div class="bg-surface-light rounded-xl p-3 space-y-1">
          {#each getWeeklySchedule() as day}
            <div class="flex items-center gap-2 text-sm">
              <div class="w-2 h-2 rounded-full bg-primary"></div>
              <span>{day}</span>
            </div>
          {/each}
          {#if goals.workoutsPerWeek < 7}
            <div class="flex items-center gap-2 text-sm text-text-muted">
              <div class="w-2 h-2 rounded-full bg-surface"></div>
              <span>Remaining days: Rest & Recovery</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Workouts -->
      <div class="space-y-3">
        {#each workouts as workout}
          <div class="bg-surface rounded-xl overflow-hidden">
            <div class="bg-primary/10 px-4 py-2 font-medium">
              {workout.name}
            </div>
            <div class="divide-y divide-surface-light">
              {#each workout.exercises as exercise}
                <div class="px-4 py-3 flex justify-between items-center">
                  <div>
                    <div class="font-medium">{exercise.name}</div>
                    <div class="text-sm text-text-muted">
                      {exercise.sets} sets × {exercise.reps} {exercise.exerciseId === 'plank' ? 'sec' : 'reps'}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold">
                      {#if exercise.weight > 0}
                        {formatWeight(exercise.weight, unitPreference.weightUnit, { decimals: 1 })}
                      {:else}
                        BW
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- Note -->
      <div class="bg-surface-light/50 rounded-xl p-3 text-sm text-text-muted flex items-start gap-2">
        <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Starting weights are estimates based on your body metrics. 
          You can adjust them anytime in Settings.
        </span>
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
        type="button"
        onclick={onConfirm}
        class="flex-1 py-3 bg-primary hover:bg-primary-dark rounded-xl font-semibold transition-all active:scale-95"
      >
        Start Training!
      </button>
    </div>
  {/if}
</div>
