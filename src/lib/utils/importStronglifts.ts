import type { PlannedExercise, WorkoutSet } from '$lib/types';

// Map Stronglifts exercise names to our internal IDs
const EXERCISE_NAME_MAP: Record<string, string> = {
  'Squat': 'squat',
  'Bench Press': 'bench-press',
  'Barbell Row': 'barbell-row',
  'Overhead Press': 'overhead-press',
  'Deadlift': 'deadlift',
  'Pullups': 'pull-up',
  'Dips': 'dip',
  'Dumbbell Curl': 'dumbbell-curl',
  'Barbell Curl': 'barbell-curl',
  'Planks': 'plank',
  'Lunges': 'lunge',
  'Incline Bench Press': 'incline-bench-press',
  'Hanging Knee Raise': 'hanging-knee-raise',
  'Kettlebell Swing': 'kettlebell-swing',
  'Bench Feet Up': 'bench-feet-up',
  'Sumo Deadlift': 'sumo-deadlift',
  'Seated Row': 'seated-row',
  'Dumbbell Fly': 'dumbbell-fly',
  'Side Planks': 'side-plank',
  'Seated Calf Raise': 'seated-calf-raise',
};

// CSV columns (0-indexed)
// Format: Date,Workout#,WorkoutName,Program,BodyWeight,Exercise,SetsxReps,?,BestSet,Volume,TotalReps,VolumeKg,DurationSec,?,StartTime,EndTime,?,Set1Reps,Set1Kg,Set2Reps,Set2Kg,...
const COL_DATE = 0;
const COL_WORKOUT = 1;
const COL_WORKOUT_NAME = 2;
const COL_BODY_WEIGHT = 4;
const COL_EXERCISE = 5;
const COL_SETS_REPS = 6;
const COL_DURATION = 12;  // Duration in seconds
const COL_START_TIME = 14;  // Shifted by 1 due to extra column at 13
const COL_END_TIME = 15;    // Shifted by 1
const COL_NOTES = 16;       // Shifted by 1
const COL_SET1_REPS = 17;   // Shifted by 1
const COL_SET1_KG = 18;     // Shifted by 1
const COL_SET2_REPS = 19;   // Shifted by 1
const COL_SET2_KG = 20;     // Shifted by 1
const COL_SET3_REPS = 21;   // Shifted by 1
const COL_SET3_KG = 22;     // Shifted by 1
const COL_SET4_REPS = 23;   // Shifted by 1
const COL_SET4_KG = 24;     // Shifted by 1
const COL_SET5_REPS = 25;   // Shifted by 1
const COL_SET5_KG = 26;     // Shifted by 1

interface ParsedSet {
  reps: number;
  weight: number;
}

interface ParsedExercise {
  exerciseId: string;
  exerciseName: string;
  sets: ParsedSet[];
}

interface ParsedWorkout {
  date: string;
  workoutNumber: string;
  workoutName: string;
  bodyWeight?: number;
  duration?: number; // in hours
  startTime?: string;
  endTime?: string;
  notes?: string;
  exercises: ParsedExercise[];
}

export interface ImportResult {
  workouts: ParsedWorkout[];
  exerciseIds: string[];
  stats: {
    totalWorkouts: number;
    totalExercises: number;
    totalSets: number;
    dateRange: { start: string; end: string };
  };
}

function parseDate(dateStr: string | undefined): string {
  // Input: "2023/03/07" -> Output: "2023-03-07"
  if (!dateStr) return '';
  return dateStr.replace(/"/g, '').replace(/\//g, '-');
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/"/g, '').trim();
  if (!cleaned) return undefined;
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

function parseSets(row: string[]): ParsedSet[] {
  const sets: ParsedSet[] = [];
  const setColumns = [
    [COL_SET1_REPS, COL_SET1_KG],
    [COL_SET2_REPS, COL_SET2_KG],
    [COL_SET3_REPS, COL_SET3_KG],
    [COL_SET4_REPS, COL_SET4_KG],
    [COL_SET5_REPS, COL_SET5_KG],
  ];

  for (const [repsCol, kgCol] of setColumns) {
    const reps = parseNumber(row[repsCol]);
    const weight = parseNumber(row[kgCol]);
    
    if (reps !== undefined && weight !== undefined) {
      sets.push({ reps, weight });
    }
  }

  return sets;
}

export function parseStrongliftsCSV(csvContent: string): ImportResult {
  const lines = csvContent.split('\n');
  
  // Skip header row
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  const workoutsByDate = new Map<string, ParsedWorkout>();
  const exerciseIdSet = new Set<string>();
  let totalSets = 0;
  
  for (const line of dataLines) {
    // Parse CSV line (handle quoted values with commas inside)
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    
    const dateValue = row[COL_DATE];
    if (!dateValue) continue;
    
    const date = parseDate(dateValue);
    if (!date) continue;
    
    const exerciseName = row[COL_EXERCISE]?.replace(/"/g, '');
    if (!exerciseName) continue;
    
    const exerciseId = EXERCISE_NAME_MAP[exerciseName];
    
    if (!exerciseId) {
      console.warn(`Unknown exercise: ${exerciseName}`);
      continue;
    }
    
    exerciseIdSet.add(exerciseId);
    
    const sets = parseSets(row);
    
    // Skip if no valid sets found
    if (sets.length === 0) {
      console.warn(`No valid sets for ${exerciseName} on ${date}`);
      continue;
    }
    
    totalSets += sets.length;
    
    if (!workoutsByDate.has(date)) {
      workoutsByDate.set(date, {
        date,
        workoutNumber: row[COL_WORKOUT]?.replace(/"/g, '') ?? '',
        workoutName: row[COL_WORKOUT_NAME]?.replace(/"/g, '') ?? '',
        bodyWeight: parseNumber(row[COL_BODY_WEIGHT]),
        duration: parseNumber(row[COL_DURATION]),
        startTime: row[COL_START_TIME]?.replace(/"/g, '') ?? undefined,
        endTime: row[COL_END_TIME]?.replace(/"/g, '') ?? undefined,
        notes: row[COL_NOTES]?.replace(/"/g, '') ?? undefined,
        exercises: [],
      });
    }
    
    const workout = workoutsByDate.get(date)!;
    workout.exercises.push({
      exerciseId,
      exerciseName,
      sets,
    });
  }
  
  const workouts = Array.from(workoutsByDate.values());
  workouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return {
    workouts,
    exerciseIds: Array.from(exerciseIdSet),
    stats: {
      totalWorkouts: workouts.length,
      totalExercises: dataLines.length,
      totalSets,
      dateRange: {
        start: workouts[0]?.date || '',
        end: workouts[workouts.length - 1]?.date || '',
      },
    },
  };
}

// Convert parsed workout to our database format
export function convertToDbFormat(parsedWorkout: ParsedWorkout): {
  startedAt: number;
  completedAt: number;
  status: 'completed';
  plan: PlannedExercise[];
  sets: WorkoutSet[];
  currentSetIndex: number;
} {
  const date = new Date(parsedWorkout.date);
  const startedAt = date.getTime();
  // Estimate completion: add duration or default to 1 hour
  const durationMs = (parsedWorkout.duration || 1) * 60 * 60 * 1000;
  const completedAt = startedAt + durationMs;
  
  const plan: PlannedExercise[] = [];
  const allSets: WorkoutSet[] = [];
  let setCounter = 1;
  
  for (const exercise of parsedWorkout.exercises) {
    // Group sets by weight to determine plan
    const weightGroups = new Map<number, number>(); // weight -> count
    for (const set of exercise.sets) {
      weightGroups.set(set.weight, (weightGroups.get(set.weight) || 0) + 1);
    }
    
    // Use the most common weight as the "work weight"
    let workWeight = exercise.sets[0]?.weight || 0;
    let maxCount = 0;
    for (const [weight, count] of weightGroups) {
      if (count > maxCount) {
        maxCount = count;
        workWeight = weight;
      }
    }
    
    const targetReps = exercise.sets[0]?.reps || 5;
    const workSets = exercise.sets.filter(s => s.weight === workWeight).length;
    
    plan.push({
      exerciseId: exercise.exerciseId,
      sets: workSets,
      reps: targetReps,
      weight: workWeight,
    });
    
    // Create all sets (no warmup since we don't have that data from Stronglifts)
    for (let i = 0; i < exercise.sets.length; i++) {
      const set = exercise.sets[i];
      allSets.push({
        id: `set-${setCounter++}`,
        exerciseId: exercise.exerciseId,
        setNumber: i + 1,
        type: 'work',
        targetReps: set.reps,
        targetWeight: set.weight,
        completedReps: set.reps,
        completedAt: startedAt + (i * 3 * 60 * 1000), // Estimate 3 min rest between sets
        failed: false,
      });
    }
  }
  
  return {
    startedAt,
    completedAt,
    status: 'completed',
    plan,
    sets: allSets,
    currentSetIndex: allSets.length,
  };
}

// Extract current weights from import data (for initializing user profile)
export function extractCurrentWeights(result: ImportResult): Record<string, { weight: number; date: string }> {
  const latestByExercise = new Map<string, { weight: number; date: string }>();
  
  for (const workout of result.workouts) {
    for (const exercise of workout.exercises) {
      // Skip if no sets
      if (!exercise.sets || exercise.sets.length === 0) continue;
      
      // Find the heaviest weight for this exercise in this workout
      const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
      
      // Skip if maxWeight is not a valid number
      if (!isFinite(maxWeight) || maxWeight <= 0) continue;
      
      const existing = latestByExercise.get(exercise.exerciseId);
      if (!existing || new Date(workout.date) > new Date(existing.date)) {
        latestByExercise.set(exercise.exerciseId, { weight: maxWeight, date: workout.date });
      }
    }
  }
  
  return Object.fromEntries(latestByExercise);
}
