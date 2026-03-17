# Gym App Dictionary / Domain Model

This document defines the terminology used throughout the codebase to ensure consistent communication.

---

## Core Concepts

### **Program** (aka Training Program)
A collection of workouts designed to work together over time to achieve specific fitness goals.
- **Contains**: Multiple `Workout`s (typically A/B split or more complex splits)
- **Example**: "Stronglifts 5x5", "Upper/Lower Split", "Push/Pull/Legs"
- **In code**: `TrainingProgram` interface, `trainingPrograms` table

### **Workout** (aka Training)
A single training session consisting of multiple exercises to be performed in one visit to the gym.
- **Contains**: Multiple `Exercise`s performed sequentially
- **Example**: "Workout A" (Squat, Bench Press, Row)
- **In code**: `ActiveWorkout` interface, `workouts` table
- **Note**: Often labeled A/B in simple programs, or custom names (e.g., "Upper Body", "Leg Day")

### **Exercise**
A specific movement performed in the gym, which may use bodyweight, free weights, machines, or other equipment.
- **Contains**: Multiple `Set`s of repetitions
- **Example**: "Barbell Squat", "Bench Press", "Deadlift"
- **In code**: `Exercise` interface (static definition), `exerciseId` references
- **Attributes**: 
  - `category`: legs, push, pull, core
  - `equipment`: barbell, dumbbell, etc.
  - `isTimeBased`: true for holds (planks), false for rep-based

---

## Workout Structure

### **Set**
One continuous block of work within an exercise, consisting of a number of repetitions (reps) performed without rest.
- **Types**:
  - **Warmup Set**: Lighter weight to prepare muscles, doesn't count toward progression
  - **Work Set**: The main training sets that drive adaptation and progression
- **Example**: "3 sets of 5 reps" = 3 × Set(5 reps)
- **In code**: `WorkoutSet` interface

### **Rep** (Repetition)
One complete execution of an exercise movement from starting position through the full range of motion and back.
- **Example**: One squat (down and up) = 1 rep
- **In code**: Stored as `targetReps` (planned) and `completedReps` (actual)

### **PlannedExercise** (Workout Exercise Configuration)
Configuration for an exercise within a workout plan - defines how many sets/reps/weight to do.
- **Fields**: `exerciseId`, `sets` (count), `reps` (target per set), `weight` (target), `timeSeconds` (for holds)
- **In code**: `PlannedExercise` interface, `ProgramExercise` interface

---

## Progression & Tracking

### **Progression**
Rules that determine when and how to increase weight/difficulty after successful workouts.
- **Fields**:
  - `incrementKg`: How much to add after success
  - `deloadAfterFailures`: How many failures before reducing weight
  - `deloadPercent`: How much to reduce weight on deload
- **In code**: `ProgressionRules` interface

### **Success/Failure**
- **Success**: Completed all target reps in a set (triggers progression counter)
- **Failure**: Failed to complete target reps (triggers failure counter, longer rest)
- **In code**: `failed` boolean on `WorkoutSet`, tracked per exercise in `UserExerciseSettings`

### **Deload**
Intentional reduction of weight after multiple consecutive failures to allow recovery and breakthrough plateaus.

---

## User-Related

### **User Profile**
User's persistent data including exercise settings, equipment availability, goals, and biometrics.
- **In code**: `UserProfile` interface, `userProfiles` table

### **Exercise Settings**
Per-exercise configuration stored in user profile including current weight, progression state, and personal records.
- **In code**: `UserExerciseSettings` interface

### **Gym Equipment**
Physical equipment available to the user at their gym, used to filter available exercises.
- **Examples**: barbell, squat-rack, bench, dumbbells, cable-machine
- **In code**: Stored as array in `UserProfile.gymEquipment`

---

## UI/UX Concepts

### **Exercise View**
The screen where user performs a single exercise, showing current set, weight, and rep counter.

### **Overview**
The workout summary screen showing all exercises with progress indicators.

### **Rest Timer**
Countdown timer between sets (3 min after success, 5 min after failure).
- **In code**: `restTimer` store

### **Exercise Timer**
Timer for time-based exercises (e.g., plank holds) instead of rep counting.

---

## Code Naming Conventions

| Concept | Variable Name | Interface | Database Table |
|---------|--------------|-----------|----------------|
| Program | `program` | `TrainingProgram` | `trainingPrograms` |
| Workout | `workout` | `ActiveWorkout` | `workouts` |
| Exercise (static) | `exercise` | `Exercise` | (static data) |
| Planned Exercise | `planExercise` | `PlannedExercise` | embedded |
| Program Exercise | `programExercise` | `ProgramExercise` | embedded |
| Set | `set` / `currentSet` | `WorkoutSet` | embedded in workout |
| Rep | `rep` / `completedReps` | - | - |
| User Settings | `settings` | `UserExerciseSettings` | in `userProfiles` |

---

## Quick Reference

```
Program (TrainingProgram)
  └── Workouts[] (ProgramWorkout[])
        └── Exercises[] (ProgramExercise[])
              └── sets: number (how many sets to do)

Workout (ActiveWorkout / workouts table record)
  ├── plan: PlannedExercise[] (what to do)
  └── sets: WorkoutSet[] (actual execution)
        
WorkoutSet
  ├── exerciseId → Exercise
  ├── type: 'warmup' | 'work'
  ├── targetReps / completedReps
  └── targetWeight

Exercise (static definition)
  ├── id, name, category
  ├── equipment[]
  └── defaultProgression
```

---

## Common Abbreviations

- **OHP**: Overhead Press
- **BW**: Bodyweight
- **1RM**: One Rep Max (maximum weight for one rep)
- **PR**: Personal Record
- **AMRAP**: As Many Reps As Possible
- **RPE**: Rate of Perceived Exertion

---

## Notes for Developers

1. **Workout vs Exercise naming**: Be careful - "workout" refers to the entire training session, not a single exercise
2. **Set ambiguity**: In casual speech "set" might mean a group of exercises ("my first set of squats"), but in code it always means one continuous block of reps
3. **TypeScript interfaces**: Always prefer using the domain types from `$lib/types` rather than inline object definitions
4. **Database storage**: Exercises are static data; only user settings and workout records are stored in DB
