# Personalized Onboarding Feature Plan

## Overview
Create a personalized onboarding experience for new users who are not importing from Stronglifts. The system will collect minimal biometric data and training goals, then generate a tailored two-part (A/B) training program with appropriate starting weights.

---

## Goals
1. **Minimal friction**: Ask only essential questions (4-5 inputs max)
2. **Smart defaults**: Calculate starting weights scientifically based on body metrics
3. **Goal-oriented**: Adapt program structure based on training goals
4. **Experience-aware**: Adjust volume and intensity based on training history
5. **Immediate readiness**: Generate program that user can start right away

---

## Data to Collect

### Required Fields (6 inputs)
| Field | Type | Options / Unit | Purpose |
|-------|------|----------------|---------|
| Sex | `enum` | male, female | Strength standards differ by sex |
| Body Weight | `number` | kg or lbs | Calculate relative strength, starting weights |
| Height | `number` | cm or inches | BMI context, body composition |
| Primary Goal | `enum` | strength, muscle, weight_loss, general | Program emphasis |
| **Time Available** | `enum` | 30min, 45min, 60min, 90min | Determines workout structure, rest periods, volume |
| **Weekly Frequency** | `enum` | 2, 3, 4, 5, 6 days | Determines split type (full body, upper/lower, PPL) |

### Optional Fields (1 input)
| Field | Type | Options | Purpose |
|-------|------|---------|---------|
| Training Experience | `enum` | beginner, intermediate, advanced | Starting weight multiplier |

*If not provided, default to "beginner" with a self-assessment question about lifting history.*

---

## Starting Weight Calculation Algorithm

### Base Multipliers (% of Body Weight)

The algorithm uses research-based strength-to-weight ratios:

#### For Beginners
| Exercise | Male | Female |
|----------|------|--------|
| Squat | 0.75x | 0.65x |
| Bench Press | 0.60x | 0.45x |
| Barbell Row | 0.55x | 0.40x |
| Overhead Press | 0.40x | 0.30x |
| Deadlift | 0.90x | 0.80x |

#### For Intermediate
| Exercise | Male | Female |
|----------|------|--------|
| Squat | 1.00x | 0.85x |
| Bench Press | 0.75x | 0.55x |
| Barbell Row | 0.70x | 0.50x |
| Overhead Press | 0.50x | 0.40x |
| Deadlift | 1.20x | 1.00x |

#### For Advanced
| Exercise | Male | Female |
|----------|------|--------|
| Squat | 1.25x | 1.05x |
| Bench Press | 1.00x | 0.70x |
| Barbell Row | 0.90x | 0.65x |
| Overhead Press | 0.65x | 0.50x |
| Deadlift | 1.50x | 1.25x |

### Goal Adjustments

| Goal | Adjustment | Rationale |
|------|------------|-----------|
| strength | +10% weight, -1 rep | Heavier, lower reps for strength |
| muscle | baseline | Standard hypertrophy range |
| weight_loss | -10% weight, +2 reps | Higher volume for calorie burn |
| general | baseline | Balanced approach |

### Final Calculation
```
startingWeight = bodyWeight × baseMultiplier × goalAdjustment
startingWeight = roundToNearestPlate(startingWeight)  // e.g., 2.5kg increments
startingWeight = max(startingWeight, minimumWeight)   // e.g., 20kg for barbell exercises
```

### Safety Caps
- Maximum starting weight: 1.5x body weight (safety limit for auto-calculation)
- Minimum: Bar weight (20kg) for barbell exercises

---

## Training Program Templates

Program generation is a matrix of **Frequency** × **Time Available** × **Goal**.

### Frequency-Based Split Design

| Frequency | Split Type | Workouts | Description |
|-----------|------------|----------|-------------|
| **2 days/week** | Full Body A/B | 2 workouts | Hit all muscle groups twice per week |
| **3 days/week** | Full Body A/B/A or A/B/C | 2-3 workouts | Classic 3-day full body |
| **4 days/week** | Upper/Lower Split | 2 workouts (ULUL) | Upper body / Lower body rotation |
| **5 days/week** | Modified PPL or Upper/Lower + Full | 3-5 workouts | Push/Pull/Legs or UL + Full Body |
| **6 days/week** | PPL Split | 3 workouts (PPLPPL) | Push/Pull/Legs twice per week |

### Time-Based Volume Adjustments

| Time Available | Sets per Exercise | Rest Periods | Notes |
|----------------|-------------------|--------------|-------|
| **30 min** | 2 sets | 90 sec | Focus on compound lifts only, minimal rest |
| **45 min** | 3 sets | 2-3 min | Standard workout, some accessories |
| **60 min** | 3-4 sets | 3 min | Full workout with accessories |
| **90 min** | 4 sets | 3-4 min | High volume, extended rest for strength |

### Program Templates by Frequency

---

#### Template: 2 Days/Week (Full Body A/B)
**Best for**: Beginners, busy schedules, maintenance

**Workout A**:
| Exercise | Sets x Reps | Rest |
|----------|-------------|------|
| Squat | 3 x 5 | 3 min |
| Bench Press | 3 x 5 | 3 min |
| Barbell Row | 3 x 5 | 2 min |
| Overhead Press | 2 x 8 | 2 min |
| Plank | 2 x 60s | 1 min |

**Workout B**:
| Exercise | Sets x Reps | Rest |
|----------|-------------|------|
| Squat | 3 x 5 | 3 min |
| Overhead Press | 3 x 5 | 3 min |
| Deadlift | 1 x 5 | 4 min |
| Pull-ups | 2 x 8 | 2 min |
| Hanging Knee Raise | 2 x 10 | 1 min |

**Time Adjustments**:
- 30 min: 2 sets each, 90s rest, drop last 2 exercises
- 45 min: 3 sets main lifts, 2 sets accessories
- 60 min: As written
- 90 min: Add 1-2 isolation exercises per workout

---

#### Template: 3 Days/Week (Full Body A/B/A)
**Best for**: Most beginners, classic starting strength approach

Rotating A/B/A in week 1, B/A/B in week 2.
Same exercises as 2-day template with slightly higher volume per session (add 1 set to main lifts in 60+ min sessions).

---

#### Template: 4 Days/Week (Upper/Lower Split)
**Best for**: Intermediate lifters, those wanting more volume

**Upper Body Day**:
| Exercise | Sets x Reps | Rest |
|----------|-------------|------|
| Bench Press | 3-4 x 5-8 | 3 min |
| Barbell Row | 3-4 x 5-8 | 2 min |
| Overhead Press | 3 x 8 | 2 min |
| Pull-ups | 3 x 8 | 2 min |
| Dumbbell Curl | 2-3 x 10 | 90 sec |
| Face Pulls | 2-3 x 15 | 60 sec |

**Lower Body Day**:
| Exercise | Sets x Reps | Rest |
|----------|-------------|------|
| Squat | 3-4 x 5 | 3 min |
| Romanian Deadlift | 3 x 8 | 2 min |
| Leg Press | 3 x 10 | 2 min |
| Calf Raise | 3 x 12 | 90 sec |
| Hanging Knee Raise | 3 x 10 | 90 sec |

**Time Adjustments**:
- 30 min: 2 sets compounds only, 90s rest
- 45 min: 3 sets compounds, 2 sets one accessory
- 60 min: 3-4 sets compounds, 2-3 accessories
- 90 min: 4 sets all, add 2-3 accessories, 3-4 min rest on compounds

---

#### Template: 5 Days/Week (Modified PPL or UL + Full)
**Best for**: Advanced beginners, dedicated lifters

**Option A: Push/Pull/Legs/Upper/Lower**
- Combines PPL with extra upper/lower for weak points

**Option B: PPL + Full Body + Weak Point**
- 3-day PPL + 1 full body + 1 focus day

**Push Day**:
| Exercise | Sets x Reps | Rest |
|----------|-------------|------|
| Bench Press | 3-4 x 5-8 | 3 min |
| Overhead Press | 3 x 8 | 2 min |
| Incline Dumbbell Press | 3 x 10 | 2 min |
| Dips | 2-3 x 8 | 2 min |
| Tricep Extension | 3 x 12 | 90 sec |

**Pull Day**:
| Exercise | Sets x Reps | Rest |
|----------|-------------|------|
| Deadlift | 3 x 5 | 3 min |
| Barbell Row | 3-4 x 5-8 | 2 min |
| Pull-ups | 3 x 8 | 2 min |
| Face Pulls | 3 x 15 | 60 sec |
| Dumbbell Curl | 3 x 12 | 90 sec |

**Legs Day**:
| Exercise | Sets x Reps | Rest |
|----------|-------------|------|
| Squat | 3-4 x 5 | 3 min |
| Romanian Deadlift | 3 x 8 | 2 min |
| Leg Press | 3 x 10 | 2 min |
| Calf Raise | 4 x 12 | 90 sec |
| Leg Curls | 3 x 12 | 90 sec |

---

#### Template: 6 Days/Week (PPL Split)
**Best for**: Intermediate-Advanced, high recovery capacity

Standard PPL done twice per week.

**Time Adjustments for All Templates**:
- 30 min: Reduce to 2 sets on compounds, 1 set on accessories, 90s rest
- 45 min: 2-3 sets compounds, 2 sets key accessories, 2 min rest
- 60 min: Standard as written
- 90 min: Add extra accessories, supersets, or extend rest for strength focus

---

### Goal-Specific Modifications (Applied to All Templates)

| Goal | Reps | Sets | Rest | Notes |
|------|------|------|------|-------|
| **Strength** | 3-5 | Baseline | 3-4 min | Focus on big 3-4 lifts, drop accessories if time-limited |
| **Muscle** | 8-12 | +1 set | 60-120 sec | Add isolation work, focus on mind-muscle connection |
| **Weight Loss** | 10-15 | Baseline | 60 sec | Circuit style, shorter rest, add finishers |
| **General** | 6-10 | Baseline | 2-3 min | Balanced approach, variety of rep ranges |

---

## Database Schema Updates

### Update: `userProfiles` table

```typescript
userProfiles: defineTable({
  userId: v.id("users"),
  
  // Existing fields
  exercises: v.record(...),
  gymEquipment: v.array(v.string()),
  activeProgramId: v.optional(v.id("trainingPrograms")),
  
  // NEW: Biometric data
  biometrics: v.optional(v.object({
    sex: v.union(v.literal("male"), v.literal("female")),
    bodyWeight: v.number(),
    bodyWeightUnit: v.union(v.literal("kg"), v.literal("lbs")),
    height: v.number(),
    heightUnit: v.union(v.literal("cm"), v.literal("inches")),
    // Auto-calculated
    bmi: v.optional(v.number()),
  })),
  
  // NEW: Training preferences
  trainingGoals: v.optional(v.object({
    primaryGoal: v.union(
      v.literal("strength"),
      v.literal("muscle"), 
      v.literal("weight_loss"),
      v.literal("general")
    ),
    experienceLevel: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    timePerWorkout: v.union(
      v.literal(30),
      v.literal(45),
      v.literal(60),
      v.literal(90)
    ),
    workoutsPerWeek: v.union(
      v.literal(2),
      v.literal(3),
      v.literal(4),
      v.literal(5),
      v.literal(6)
    ),
  })),
  
  // NEW: Onboarding state
  onboardingCompleted: v.boolean(),
  onboardingCompletedAt: v.optional(v.number()), // timestamp
  
  // NEW: Global unit preference (derived from onboarding, editable in settings)
  unitPreference: v.optional(v.object({
    weightUnit: v.union(v.literal("kg"), v.literal("lbs")),
    distanceUnit: v.union(v.literal("cm"), v.literal("inches")),
  })),
})
```

### Migration Strategy
- Existing users: `onboardingCompleted = true` (they already have profiles)
- New users: `onboardingCompleted = false` until they complete the flow

---

## API Design

### New Mutations

#### `userProfiles.completeOnboarding`
Saves biometrics and goals, generates personalized program.

```typescript
args: {
  userId: v.id("users"),
  biometrics: v.object({
    sex: v.union(v.literal("male"), v.literal("female")),
    bodyWeight: v.number(),
    bodyWeightUnit: v.union(v.literal("kg"), v.literal("lbs")),
    height: v.number(),
    heightUnit: v.union(v.literal("cm"), v.literal("inches")),
  }),
  trainingGoals: v.object({
    primaryGoal: v.union(v.literal("strength"), v.literal("muscle"), v.literal("weight_loss"), v.literal("general")),
    experienceLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    timePerWorkout: v.union(v.literal(30), v.literal(45), v.literal(60), v.literal(90)),
    workoutsPerWeek: v.union(v.literal(2), v.literal(3), v.literal(4), v.literal(5), v.literal(6)),
  }),
}
returns: {
  programId: v.id("trainingPrograms"),
  startingWeights: v.record(v.string(), v.number()),
}
```

#### `programs.generatePersonalized`
Internal mutation called by completeOnboarding.

```typescript
args: {
  userId: v.id("users"),
  biometrics: v.object({...}),
  trainingGoals: v.object({...}),
}
returns: v.id("trainingPrograms")
```

### New Queries

#### `userProfiles.getOnboardingStatus`
```typescript
args: { userId: v.id("users") }
returns: {
  completed: v.boolean(),
  hasBiometrics: v.boolean(),
  hasGoals: v.boolean(),
}
```

---

## UI/UX Flow

### Route: `/onboarding`

#### Step 1: Welcome
- Brief welcome message
- Two options:
  1. "I'm new to lifting" → Continue to biometrics
  2. "Import from Stronglifts" → Redirect to import flow

#### Step 2: Body Metrics
Inputs:
- Sex (male/female toggle)
- Body weight (number input with kg/lbs toggle)
- Height (number input with cm/in toggle)

Validation:
- All fields required
- Reasonable ranges (e.g., weight: 30-300kg)

#### Step 3: Training Goals
Inputs:
- Primary goal (4-option cards with icons)
  - 💪 Build Strength
  - 🏋️ Build Muscle
  - 🔥 Lose Weight
  - ⚡ General Fitness
- Experience level (3-option segmented control)
  - Beginner (< 6 months)
  - Intermediate (6 months - 2 years)
  - Advanced (2+ years)

#### Step 4: Schedule & Time
Inputs:
- Time available per workout (4-option cards)
  - ⚡ 30 min (Quick & focused)
  - ⏱️ 45 min (Standard)
  - 🕐 60 min (Full workout)
  - 🕑 90 min (High volume)
- Weekly frequency (segmented control)
  - 2 days/week (Minimal)
  - 3 days/week (Recommended)
  - 4 days/week (Dedicated)
  - 5 days/week (Committed)
  - 6 days/week (Advanced)
- Smart recommendation shown based on goal + experience

#### Step 5: Program Preview
Show generated program:
- "Based on your profile, here's your personalized program"
- Display Workout A and Workout B side by side
- Show calculated starting weights for each exercise
- "Adjust weights if needed" link → opens settings
- "Start Training" button

#### Step 6: Success
- "Your program is ready!"
- Summary card showing:
  - X workouts per week
  - ~Y minutes per session
  - Z different workouts to rotate
- CTA: "Start Workout A" or "View Program"

---

## Integration Points

### Login Flow Changes
After successful auth, check onboarding status:
```
if (!profile.onboardingCompleted) {
  goto('/onboarding');
} else {
  goto('/');
}
```

### Home Page Changes
If onboarding incomplete, show banner:
- "Complete your profile to get a personalized program"
- Button: "Complete Setup"

### Settings Page Changes
Add section:
- "Onboarding Information" (editable)
- Can update biometrics and goals
- Option to regenerate program

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Update database schema
2. Create calculation utilities
3. Implement Convex mutations
4. Add API functions

### Phase 2: UI Components
1. Create onboarding wizard component
2. Build step forms (biometrics, goals, preview)
3. Add validation and error handling
4. Create progress indicators

### Phase 3: Integration
1. Add `/onboarding` route
2. Update login redirect logic
3. Update home page with onboarding banner
4. Add onboarding section to settings

### Phase 4: Polish
1. Add animations/transitions
2. Mobile responsiveness testing
3. Edge case handling
4. User testing

---

## Global Unit Preference

### Overview
The app uses a **global unit preference** that defaults to metric but can be set to imperial. This preference is:
- **Initialized during onboarding** based on the units selected for body weight/height
- **Applied throughout the app** for all weight displays, plate calculations, and logs
- **Editable in settings** at any time

### Default Behavior
```typescript
// Default for new users (before onboarding)
const DEFAULT_UNIT_PREFERENCE = {
  weightUnit: 'kg',
  distanceUnit: 'cm'
};
```

### Onboarding Initialization
When a user completes onboarding, derive the global preference:
```typescript
// If user entered weight in lbs during onboarding
unitPreference = {
  weightUnit: biometrics.bodyWeightUnit,  // 'lbs'
  distanceUnit: biometrics.heightUnit === 'inches' ? 'inches' : 'cm'
};
```

### Application Throughout App
| Feature | Metric Display | Imperial Display |
|---------|---------------|------------------|
| Exercise weights | 100 kg | 220 lbs |
| Plate calculations | 20 kg per side | 45 lbs per side |
| Body weight | 80 kg | 176 lbs |
| Height | 180 cm | 5'11" |
| Workout logs | 5×5 @ 80 kg | 5×5 @ 176 lbs |
| Progress charts | kg on y-axis | lbs on y-axis |

### Settings Integration
Users can toggle unit preference in Settings:
- Toggle: "Use imperial units (lbs/feet)"
- When changed: 
  - Convert all displayed values immediately
  - Store preference for future sessions
  - Do NOT convert historical workout data (keep as-recorded)

### Database Schema
```typescript
unitPreference: v.optional(v.object({
  weightUnit: v.union(v.literal("kg"), v.literal("lbs")),
  distanceUnit: v.union(v.literal("cm"), v.literal("inches")),
})),
```

### Conversion Utilities
```typescript
// lib/utils/units.ts
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

export function cmToInches(cm: number): number {
  return Math.round(cm / 2.54 * 10) / 10;
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}

export function formatHeight(cm: number, unit: 'cm' | 'inches'): string {
  if (unit === 'cm') return `${cm} cm`;
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}
```

---

## Open Questions

1. **Should we ask age?** 
   - Pros: Better strength standards, recovery recommendations
   - Cons: Additional input, privacy concern
   - Recommendation: Optional field, can be added later

2. **Should we allow program regeneration?**
   - Yes, from settings page
   - Preserves workout history

3. **What about equipment limitations?**
   - For MVP, assume full gym access
   - Future: Add equipment selection to modify exercise choices

---

## Success Metrics

- Completion rate: % of new users who finish onboarding
- Time to first workout: Average time from signup to first logged workout
- Starting weight adjustments: % of users who manually adjust suggested weights
- Program adherence: Workout frequency vs. planned frequency
