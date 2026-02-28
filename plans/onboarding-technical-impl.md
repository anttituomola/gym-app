# Technical Implementation Plan

## Files to Create/Modify

### 1. Database Schema
**File**: `convex/schema.ts`

Changes:
- Add `biometrics` field to `userProfiles` table
- Add `trainingGoals` field to `userProfiles` table  
- Add `onboardingCompleted` field to `userProfiles` table

### 2. Backend Functions

#### New File: `convex/onboarding.ts`
```typescript
// completeOnboarding - Main mutation to save data and create program
// calculateStartingWeights - Pure function for weight calculations
// generateProgramFromTemplate - Creates A/B program based on goals
```

#### Update File: `convex/userProfiles.ts`
```typescript
// Add: updateBiometrics mutation
// Add: updateTrainingGoals mutation  
// Add: updateUnitPreference mutation
// Add: getOnboardingStatus query
// Modify: getOrCreate to set onboardingCompleted = false for new users
// Modify: completeOnboarding to set unitPreference from biometrics
```

#### Update File: `convex/programs.ts`
```typescript
// Add: createPersonalized mutation (can be internal)
```

### 3. Frontend Types

#### Update File: `src/lib/types/index.ts`
Add:
```typescript
export interface UserBiometrics {
  sex: 'male' | 'female';
  bodyWeight: number;
  bodyWeightUnit: 'kg' | 'lbs';
  height: number;
  heightUnit: 'cm' | 'inches';
  bmi?: number;
}

export interface TrainingGoals {
  primaryGoal: 'strength' | 'muscle' | 'weight_loss' | 'general';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  timePerWorkout: 30 | 45 | 60 | 90;
  workoutsPerWeek: 2 | 3 | 4 | 5 | 6;
}

export interface UnitPreference {
  weightUnit: 'kg' | 'lbs';
  distanceUnit: 'cm' | 'inches';
}

export interface OnboardingState {
  completed: boolean;
  completedAt?: number;
}
```

### 4. Utility Functions

#### New File: `src/lib/utils/onboarding.ts`
```typescript
// Client-side validation for biometrics
// BMI calculation
// Starting weight preview calculation (for UI)
```

#### New/Update File: `src/lib/utils/units.ts`
```typescript
// Weight conversions: kg ↔ lbs
// Distance conversions: cm ↔ inches
// Formatting utilities (e.g., 180 cm → 5'11")
// Display helpers that respect unitPreference
```

### 5. Svelte Components

#### New File: `src/lib/components/onboarding/OnboardingWizard.svelte`
Main container component with step management.

#### New File: `src/lib/components/onboarding/WelcomeStep.svelte`
Initial choice: new user vs import.

#### New File: `src/lib/components/onboarding/BiometricsStep.svelte`
Form for sex, weight, height inputs.

#### New File: `src/lib/components/onboarding/GoalsStep.svelte`
Form for primary goal and experience level.

#### New File: `src/lib/components/onboarding/ScheduleStep.svelte`
Form for time per workout and weekly frequency with smart recommendations.

#### New File: `src/lib/components/onboarding/ProgramPreviewStep.svelte`
Display generated program with starting weights and schedule overview.

#### New File: `src/lib/components/onboarding/ProgressBar.svelte`
Visual progress indicator.

#### New File: `src/lib/components/onboarding/UnitToggle.svelte`
Reusable kg/lbs or cm/in toggle.

### 6. Routes

#### New File: `src/routes/onboarding/+page.svelte`
Main onboarding page that hosts the wizard.

#### Update File: `src/routes/login/+page.svelte`
Modify redirect after auth to check onboarding status.

#### Update File: `src/routes/+page.svelte`
Add banner for incomplete onboarding.

#### Update File: `src/routes/settings/+page.svelte`
Add sections to view/edit:
- Biometrics and goals
- Unit preference (global toggle)
- Option to regenerate program

### 7. Shared Components

#### Update/Create: `src/lib/components/ui/`
Potential shared UI components:
- `SegmentedControl.svelte` - For experience level and frequency selection
- `GoalCard.svelte` - For goal and time selection cards
- `StatPreview.svelte` - For displaying calculated weights
- `RecommendationBadge.svelte` - For smart recommendations

---

## Implementation Order

### Step 1: Schema & Backend (No UI)
1. Update `convex/schema.ts`
2. Create `convex/onboarding.ts` with core logic
3. Update `convex/userProfiles.ts`
4. Test mutations via Convex dashboard

### Step 2: Utilities & Types
1. Update `src/lib/types/index.ts`
2. Create `src/lib/utils/onboarding.ts`

### Step 3: Onboarding Route (Basic UI)
1. Create `src/routes/onboarding/+page.svelte`
2. Create `OnboardingWizard.svelte` with step management
3. Create basic step components (no styling polish)
4. Wire up to backend

### Step 4: Integration
1. Update login redirect logic
2. Update home page with onboarding check
3. Update settings page

### Step 5: Polish
1. Add proper styling with Tailwind
2. Add transitions/animations
3. Mobile responsiveness
4. Error handling and validation

---

## Component Props Interfaces

### OnboardingWizard
```typescript
interface Props {
  userId: string;
  onComplete?: () => void;
}
```

### BiometricsStep
```typescript
interface Props {
  initialData?: Partial<UserBiometrics>;
  onSubmit: (data: UserBiometrics) => void;
  onBack?: () => void;
}
```

### GoalsStep
```typescript
interface Props {
  initialData?: Partial<TrainingGoals>;
  onSubmit: (data: TrainingGoals) => void;
  onBack: () => void;
}
```

### ProgramPreviewStep
```typescript
interface Props {
  biometrics: UserBiometrics;
  goals: TrainingGoals;
  program: TrainingProgram;
  startingWeights: Record<string, number>;
  onConfirm: () => void;
  onBack: () => void;
  onAdjust?: () => void;
}
```

---

## State Management

### Wizard State (Svelte 5 Runes)
```typescript
let currentStep = $state(1);
let biometrics = $state<Partial<UserBiometrics>>({});
let goals = $state<Partial<TrainingGoals>>({});
let schedule = $state<Partial<Pick<TrainingGoals, 'timePerWorkout' | 'workoutsPerWeek'>>>({});
let unitPreference = $state<UnitPreference>({ weightUnit: 'kg', distanceUnit: 'cm' });
let isSubmitting = $state(false);
let error = $state<string | null>(null);
```

### Validation State
```typescript
interface ValidationErrors {
  sex?: string;
  bodyWeight?: string;
  height?: string;
  primaryGoal?: string;
  experienceLevel?: string;
  timePerWorkout?: string;
  workoutsPerWeek?: string;
}
```

---

## API Integration Points

### From Onboarding Flow
```typescript
// Save and complete - unitPreference derived from biometrics
const result = await convex.mutation(api.onboarding.completeOnboarding, {
  userId,
  biometrics: biometrics as UserBiometrics,
  trainingGoals: goals as TrainingGoals,
});

// Result contains programId and startingWeights
// unitPreference is automatically set based on biometrics units
```

### From Home Page
```typescript
// Check if onboarding needed
const profile = await convex.query(api.userProfiles.get, { userId });
if (!profile?.onboardingCompleted) {
  // Show banner
}
```

### From Login
```typescript
// After auth, check onboarding
const profile = await convex.mutation(api.userProfiles.getOrCreate, { userId });
if (!profile.onboardingCompleted) {
  goto('/onboarding');
} else {
  goto('/');
}
```

---

## Styling Guidelines

### Tailwind Classes to Use
- Container: `max-w-md mx-auto p-4` (mobile-first)
- Cards: `bg-surface rounded-xl p-6`
- Inputs: `bg-bg border border-surface-light rounded-xl px-4 py-3`
- Primary button: `bg-primary hover:bg-primary-dark rounded-xl p-4`
- Secondary button: `bg-surface-light hover:bg-surface rounded-xl p-3`

### Animation
- Step transitions: fade + slide
- Progress bar: smooth width transition
- Buttons: `active:scale-95` for tactile feedback

---

## Error Handling

### Client-Side Validation
- Real-time validation on blur
- Show inline errors
- Disable next button until valid

### Server Errors
- Display in toast or banner
- Allow retry without losing form data
- Log to console for debugging

### Edge Cases
- Network failure during submission
- Concurrent modification (user already has program)
- Invalid unit conversions

---

## Program Generation Algorithm

The program generation is a multi-dimensional matrix considering:
1. **Frequency** (2-6 days) → Determines split type
2. **Time Available** (30-90 min) → Determines volume per session
3. **Goal** → Determines rep ranges, rest periods, exercise selection
4. **Experience** → Determines starting weights, complexity

### Frequency → Split Mapping

```typescript
function getSplitType(frequency: number): SplitType {
  switch (frequency) {
    case 2: return 'full-body-ab';        // A/B split
    case 3: return 'full-body-aba';       // A/B/A or A/B/C rotation
    case 4: return 'upper-lower';         // Upper/Lower/Upper/Lower
    case 5: return 'modified-ppl';        // Push/Pull/Legs/Upper/Lower or PPL + Weak Points
    case 6: return 'ppl';                 // Push/Pull/Legs × 2
    default: return 'full-body-ab';
  }
}
```

### Time → Volume & Rest Mapping

```typescript
interface TimeConfig {
  setsPerExercise: number;
  minSetsPerExercise: number;
  restSeconds: number;
  includeAccessories: boolean;
  accessoryCount: number;
  supersetRecommended: boolean;
}

function getTimeConfig(minutes: number): TimeConfig {
  switch (minutes) {
    case 30:
      return {
        setsPerExercise: 2,
        minSetsPerExercise: 2,
        restSeconds: 90,
        includeAccessories: false,
        accessoryCount: 0,
        supersetRecommended: true
      };
    case 45:
      return {
        setsPerExercise: 3,
        minSetsPerExercise: 2,
        restSeconds: 120,
        includeAccessories: true,
        accessoryCount: 1,
        supersetRecommended: false
      };
    case 60:
      return {
        setsPerExercise: 3,
        minSetsPerExercise: 3,
        restSeconds: 180,
        includeAccessories: true,
        accessoryCount: 2,
        supersetRecommended: false
      };
    case 90:
      return {
        setsPerExercise: 4,
        minSetsPerExercise: 3,
        restSeconds: 240,
        includeAccessories: true,
        accessoryCount: 3,
        supersetRecommended: false
      };
    default:
      return getTimeConfig(60);
  }
}
```

### Goal → Exercise Selection & Parameters

```typescript
interface GoalConfig {
  repRange: { min: number; max: number };
  compoundSets: number;  // Overrides time config for compounds
  restSeconds: number;   // Overrides time config
  cardioFinisher: boolean;
  focusAreas: string[];  // muscle groups to emphasize
}

function getGoalConfig(goal: Goal): GoalConfig {
  switch (goal) {
    case 'strength':
      return {
        repRange: { min: 3, max: 5 },
        compoundSets: 4,  // Always 4-5 sets for strength
        restSeconds: 240,
        cardioFinisher: false,
        focusAreas: ['squat', 'bench', 'deadlift', 'overhead-press']
      };
    case 'muscle':
      return {
        repRange: { min: 8, max: 12 },
        compoundSets: 3,  // Use time config
        restSeconds: 90,
        cardioFinisher: false,
        focusAreas: ['chest', 'back', 'legs', 'shoulders']
      };
    case 'weight_loss':
      return {
        repRange: { min: 10, max: 15 },
        compoundSets: 3,
        restSeconds: 60,
        cardioFinisher: true,
        focusAreas: ['full-body', 'compound']
      };
    case 'general':
      return {
        repRange: { min: 6, max: 10 },
        compoundSets: 3,
        restSeconds: 120,
        cardioFinisher: false,
        focusAreas: ['balanced']
      };
  }
}
```

### Smart Recommendation Engine

```typescript
interface Recommendation {
  timePerWorkout: 30 | 45 | 60 | 90;
  workoutsPerWeek: 2 | 3 | 4 | 5 | 6;
  reasoning: string;
}

function getSmartRecommendation(
  goal: Goal,
  experience: ExperienceLevel
): Recommendation {
  // Matrix of optimal training parameters
  const recommendations: Record<Goal, Record<ExperienceLevel, Recommendation>> = {
    strength: {
      beginner: { timePerWorkout: 60, workoutsPerWeek: 3, reasoning: 'Focus on learning movements with adequate recovery' },
      intermediate: { timePerWorkout: 90, workoutsPerWeek: 4, reasoning: 'Higher volume and frequency for strength gains' },
      advanced: { timePerWorkout: 90, workoutsPerWeek: 4, reasoning: 'Specialized split with high volume' }
    },
    muscle: {
      beginner: { timePerWorkout: 60, workoutsPerWeek: 4, reasoning: 'Moderate frequency allows adequate volume per session' },
      intermediate: { timePerWorkout: 60, workoutsPerWeek: 5, reasoning: 'Higher frequency for increased weekly volume' },
      advanced: { timePerWorkout: 90, workoutsPerWeek: 5, reasoning: 'High volume split targeting all muscles 2x/week' }
    },
    weight_loss: {
      beginner: { timePerWorkout: 45, workoutsPerWeek: 3, reasoning: 'Sustainable starting point with cardio focus' },
      intermediate: { timePerWorkout: 60, workoutsPerWeek: 4, reasoning: 'Higher frequency increases calorie burn' },
      advanced: { timePerWorkout: 60, workoutsPerWeek: 5, reasoning: 'Maximum calorie expenditure with adequate recovery' }
    },
    general: {
      beginner: { timePerWorkout: 45, workoutsPerWeek: 3, reasoning: 'Balanced approach for overall fitness' },
      intermediate: { timePerWorkout: 60, workoutsPerWeek: 4, reasoning: 'Varied training for well-rounded fitness' },
      advanced: { timePerWorkout: 60, workoutsPerWeek: 4, reasoning: 'Maintain fitness with efficient programming' }
    }
  };
  
  return recommendations[goal][experience];
}
```

### Estimated Workout Duration Validation

Before finalizing the program, validate that the generated workout fits the time constraint:

```typescript
function estimateWorkoutDuration(
  exercises: ProgramExercise[],
  timeConfig: TimeConfig
): number {
  let totalMinutes = 0;
  
  for (const exercise of exercises) {
    // Each set: work time + rest time
    const workTimePerSet = 0.5; // 30 seconds of actual work
    const setDuration = workTimePerSet + (timeConfig.restSeconds / 60);
    totalMinutes += exercise.sets * setDuration;
    
    // Add warmup time for first 2-3 exercises
    // Add transition time between exercises
    totalMinutes += 1; // 1 min transition
  }
  
  // Add 5 min for warmup
  totalMinutes += 5;
  
  return Math.ceil(totalMinutes);
}

// If estimated > timeAvailable, reduce sets or remove accessories
```

---

## New Component: ScheduleStep

### Props Interface
```typescript
interface ScheduleStepProps {
  initialData?: {
    timePerWorkout?: 30 | 45 | 60 | 90;
    workoutsPerWeek?: 2 | 3 | 4 | 5 | 6;
  };
  goal?: Goal;
  experience?: ExperienceLevel;
  onSubmit: (data: { timePerWorkout: number; workoutsPerWeek: number }) => void;
  onBack: () => void;
}
```

### Key Features
1. **Smart Defaults**: Pre-select recommendation based on goal + experience
2. **Visual Feedback**: Show estimated workout structure preview
3. **Validation**: Warn if combination is unusual (e.g., 6 days × 90 min = very high volume)
4. **Contextual Help**: Explain trade-offs (e.g., "2 days = longer workouts needed")

---

## Updated ProgramPreviewStep

### Additional Props
```typescript
interface ProgramPreviewStepProps {
  // ... existing props
  schedule: {
    timePerWorkout: number;
    workoutsPerWeek: number;
  };
  splitType: string; // e.g., "Upper/Lower Split"
  estimatedDuration: number;
  weeklySchedule: string[]; // e.g., ["Mon: Workout A", "Tue: Workout B", ...]
}
```

### Display Elements
1. **Schedule Summary Card**
   - X workouts per week
   - ~Y minutes per session
   - Split type (Full Body / Upper-Lower / PPL)

2. **Weekly Calendar View**
   - Visual representation of workout days
   - Workout A/B labels
   - Rest days indicated

3. **Time Breakdown** (optional expand)
   - Warmup: 5 min
   - Main lifts: X min
   - Accessories: Y min
   - Rest periods included

---

## Example Program Configurations

### Example 1: Beginner, Muscle Building, 3 days, 45 min
- **Split**: Full Body A/B/A
- **Volume**: 3 sets per exercise
- **Rest**: 2 min
- **Accessories**: 1 per workout
- **Estimated**: ~40-45 min

### Example 2: Intermediate, Strength, 4 days, 90 min
- **Split**: Upper/Lower
- **Volume**: 4 sets compounds, 3 sets accessories
- **Rest**: 3-4 min on compounds, 2 min on accessories
- **Accessories**: 3 per workout
- **Estimated**: ~85-90 min

### Example 3: Beginner, Weight Loss, 3 days, 30 min
- **Split**: Full Body A/B
- **Volume**: 2 sets per exercise, circuit style
- **Rest**: 90 sec, minimal between exercises
- **Accessories**: None
- **Finisher**: 5 min cardio note
- **Estimated**: ~25-30 min


---

## Unit Conversion System

### Overview
A centralized unit conversion system that:
- Stores user preference in the database
- Provides conversion utilities
- Automatically formats displays based on preference
- Never converts stored data (only display values)

### Database Storage

**Storing Values**:
- Always store weights in **kg** in the database (normalized)
- Always store heights in **cm** in the database (normalized)
- Store user preference for display units

**Example**:
```typescript
// User enters 200 lbs during onboarding
// Store: 90.7 kg (normalized)
// Display: 200 lbs (based on preference)
```

### Conversion Utilities (`src/lib/utils/units.ts`)

```typescript
// Conversion factors
const KG_TO_LBS = 2.20462;
const CM_TO_INCHES = 0.393701;

// Weight conversions
export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / KG_TO_LBS) * 10) / 10;
}

// Distance conversions
export function cmToInches(cm: number): number {
  return Math.round(cm * CM_TO_INCHES * 10) / 10;
}

export function inchesToCm(inches: number): number {
  return Math.round((inches / CM_TO_INCHES) * 10) / 10;
}

// Height formatting
export function formatHeight(
  cm: number, 
  unit: 'cm' | 'inches' | 'ft-in'
): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  
  const totalInches = cm * CM_TO_INCHES;
  
  if (unit === 'inches') {
    return `${Math.round(totalInches)}"`;
  }
  
  // ft-in format (e.g., "5'11\"")
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

// Weight display with unit
export function formatWeight(
  kg: number, 
  unit: 'kg' | 'lbs',
  options?: { showUnit?: boolean; decimals?: number }
): string {
  const { showUnit = true, decimals = 1 } = options || {};
  
  let value: number;
  let unitLabel: string;
  
  if (unit === 'lbs') {
    value = kgToLbs(kg);
    unitLabel = 'lbs';
  } else {
    value = kg;
    unitLabel = 'kg';
  }
  
  const formatted = decimals === 0 
    ? Math.round(value).toString()
    : value.toFixed(decimals);
    
  return showUnit ? `${formatted} ${unitLabel}` : formatted;
}

// Plate weight calculation with unit
export function formatPlateWeight(
  totalWeightKg: number,
  exerciseId: string,
  unit: 'kg' | 'lbs'
): string | null {
  // Implementation depends on bar weight and plate math
  // Returns formatted string like "45 lbs per side" or "20 kg per side"
}

// Convert input value to kg for storage
export function normalizeWeightInput(
  value: number, 
  inputUnit: 'kg' | 'lbs'
): number {
  return inputUnit === 'lbs' ? lbsToKg(value) : value;
}

// Convert input value to cm for storage
export function normalizeDistanceInput(
  value: number,
  inputUnit: 'cm' | 'inches'
): number {
  return inputUnit === 'inches' ? inchesToCm(value) : value;
}
```

### Svelte Store for Unit Preference

```typescript
// src/lib/stores/units.ts
import { writable } from 'svelte/store';
import type { UnitPreference } from '$lib/types';

export const unitPreference = writable<UnitPreference>({
  weightUnit: 'kg',
  distanceUnit: 'cm'
});

// Helper to format weight reactively
export function formatWeightStore(kg: number, showUnit = true) {
  let formatted = $state('');
  
  unitPreference.subscribe(pref => {
    formatted = formatWeight(kg, pref.weightUnit, { showUnit });
  });
  
  return formatted;
}
```

### Component Integration

**Example: WeightDisplay Component**
```svelte
<script lang="ts">
  import { unitPreference } from '$lib/stores/units';
  import { formatWeight } from '$lib/utils/units';
  
  let { weightKg }: { weightKg: number } = $props();
</script>

<span>{formatWeight(weightKg, $unitPreference.weightUnit)}</span>
```

**Example: WeightInput Component**
```svelte
<script lang="ts">
  import { unitPreference } from '$lib/stores/units';
  import { normalizeWeightInput, formatWeight } from '$lib/utils/units';
  
  let { valueKg = $bindable() }: { valueKg: number } = $props();
  
  // Display value based on preference
  let displayValue = $derived(
    $unitPreference.weightUnit === 'lbs' 
      ? kgToLbs(valueKg) 
      : valueKg
  );
  
  function handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const numValue = parseFloat(input.value);
    if (!isNaN(numValue)) {
      // Convert to kg for storage
      valueKg = normalizeWeightInput(numValue, $unitPreference.weightUnit);
    }
  }
</script>

<input 
  type="number" 
  value={displayValue}
  oninput={handleInput}
/>
<span>{$unitPreference.weightUnit}</span>
```

### API Integration

**Loading User Preference**:
```typescript
// On app load / auth
const profile = await convex.query(api.userProfiles.get, { userId });
if (profile?.unitPreference) {
  unitPreference.set(profile.unitPreference);
}
```

**Updating Preference**:
```typescript
// In settings
await convex.mutation(api.userProfiles.updateUnitPreference, {
  userId,
  unitPreference: {
    weightUnit: 'lbs',
    distanceUnit: 'inches'
  }
});
unitPreference.set({ weightUnit: 'lbs', distanceUnit: 'inches' });
```

### Edge Cases

1. **Plate Calculations**: 
   - Metric: 20kg bar, plates in 1.25/2.5/5/10/15/20/25 kg
   - Imperial: 45lbs (~20kg) bar, plates in 2.5/5/10/25/35/45 lbs
   - Round to nearest available plate size

2. **Small Weights**:
   - Dumbbells often in 1kg or 2lb increments
   - Show appropriate precision based on unit

3. **Bodyweight Exercises**:
   - Display body weight in preferred unit
   - Calculated added weight in preferred unit
