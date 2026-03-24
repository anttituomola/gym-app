/**
 * Display label for a workout session. Default A/B use short codes in DB ('A', 'B');
 * program sessions store the workout name (e.g. "Workout A", "Upper Body").
 */
export function formatWorkoutTypeLabel(workoutType: string | undefined): string {
  if (workoutType === undefined || workoutType === '') return 'Workout A';
  if (workoutType === 'A' || workoutType === 'B') return `Workout ${workoutType}`;
  return workoutType;
}
