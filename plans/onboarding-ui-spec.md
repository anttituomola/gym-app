# UI/UX Specification

## Design Principles
1. **Mobile-first**: Most users will onboard via phone at the gym
2. **One question at a time**: Reduce cognitive load
3. **Visual feedback**: Show progress and what's coming
4. **Smart defaults**: Pre-select common options
5. **Skip-friendly**: Allow going back and editing

---

## Screen Specifications

### 1. Welcome Screen

**Layout**:
```
┌─────────────────────────────┐
│                             │
│         🏋️‍♂️                  │
│                             │
│   Welcome to LiftLog       │
│                             │
│   Let's set up your         │
│   personalized training     │
│   program                   │
│                             │
│   ┌─────────────────────┐   │
│   │  📊 Import from     │   │
│   │     Stronglifts     │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │  🚀 I'm new here    │   │
│   │     (Quick setup)   │   │
│   └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

**Interactions**:
- Import button → Navigate to import flow
- New user button → Advance to Step 2

---

### 2. Biometrics Screen

**Layout**:
```
┌─────────────────────────────┐
│ ← About You          2 of 5 │
│                             │
│   Tell us about yourself   │
│   to calculate your        │
│   starting weights         │
│                             │
│   Default units: [kg/cm ▼] │
│                             │
│   Sex *                     │
│   ┌────────┐  ┌────────┐   │
│   │  ♂     │  │  ♀     │   │
│   │  Male  │  │ Female │   │
│   └────────┘  └────────┘   │
│                             │
│   Body Weight *             │
│   ┌──────────────────┬────┐│
│   │ 70               │ kg ││
│   └──────────────────┴────┘│
│                             │
│   Height *                  │
│   ┌──────────────────┬────┐│
│   │ 175              │ cm ││
│   └──────────────────┴────┘│
│                             │
│   ℹ️ This sets your app's  │
│      default units          │
│                             │
│   ┌─────────────────────┐   │
│   │    Continue →       │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

**Note**: The units selected here (kg/cm vs lbs/inches) become the app's global unit preference. This affects how all weights are displayed throughout the app.

**Interactions**:
- Sex: Toggle buttons, single select, required
- Weight: Number input with unit toggle (kg/lbs)
- Height: Number input with unit toggle (cm/in)
- Continue disabled until all fields valid

**Validation**:
- Weight: 30-300 kg / 66-660 lbs
- Height: 100-250 cm / 39-98 inches

---

### 3. Goals Screen

**Layout**:
```
┌─────────────────────────────┐
│ ← Your Goals         3 of 5 │
│                             │
│   What's your primary      │
│   fitness goal?            │
│                             │
│   ┌─────────────────────┐   │
│   │ 💪                  │   │
│   │ Build Strength      │   │
│   │ Heavy, low reps     │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │ 🏋️                  │   │
│   │ Build Muscle        │   │
│   │ Moderate volume     │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │ 🔥                  │   │
│   │ Lose Weight         │   │
│   │ Higher reps, cardio │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │ ⚡                  │   │
│   │ General Fitness     │   │
│   │ Balanced approach   │   │
│   └─────────────────────┘   │
│                             │
│   Experience Level          │
│   ┌────────┬────────┬─────┐│
│   │Beginner│Intermed│Adv  ││
│   └────────┴────────┴─────┘│
│                             │
│   ┌─────────────────────┐   │
│   │    Continue →       │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

**Interactions**:
- Goal cards: Single select, highlighted when selected
- Experience: Segmented control, default to "Beginner"
- Show tooltip on long-press for goal descriptions

---

### 4. Schedule & Time Screen

**Layout**:
```
┌─────────────────────────────┐
│ ← Schedule           4 of 5 │
│                             │
│   How much time can you    │
│   dedicate to training?     │
│                             │
│   Time per workout *        │
│                             │
│   ┌──────────┐ ┌──────────┐│
│   │   ⚡     │ │   ⏱️     ││
│   │   30     │ │   45     ││
│   │   min    │ │   min    ││
│   │ Quick    │ │ Standard ││
│   └──────────┘ └──────────┘│
│                             │
│   ┌──────────┐ ┌──────────┐│
│   │   🕐     │ │   🕑     ││
│   │   60     │ │   90     ││
│   │   min    │ │   min    ││
│   │  Full    │ │  High    ││
│   │ Workout  │ │ Volume   ││
│   └──────────┘ └──────────┘│
│                             │
│   ───────────────────────── │
│                             │
│   Days per week *           │
│                             │
│   ┌────┬────┬────┬────┬────┐│
│   │ 2  │ 3  │ 4  │ 5  │ 6  ││
│   │days│days│days│days│days││
│   └────┴────┴────┴────┴────┘│
│                             │
│   💡 For muscle building    │
│   with your experience,    │
│   we recommend 4 days/week │
│                             │
│   ┌─────────────────────┐   │
│   │    Continue →       │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

**Interactions**:
- Time cards: 2x2 grid on mobile, single select
- Frequency: 5-segment control (2-6 days)
- Smart recommendation appears below based on goal + experience
- Continue disabled until both selected

**Smart Recommendations**:
| Goal + Experience | Recommended Frequency | Recommended Time |
|-------------------|----------------------|------------------|
| Beginner + Any | 3 days | 45-60 min |
| Strength + Int/Adv | 4 days | 60-90 min |
| Muscle + Any | 4-5 days | 60 min |
| Weight Loss + Beginner | 3 days | 45 min |
| General + Any | 3 days | 45-60 min |

---

### 5. Program Preview Screen

**Layout**:
```
┌─────────────────────────────┐
│ ← Your Program       5 of 5 │
│                             │
│   🎉 Here's your           │
│   personalized program!     │
│                             │
│   Based on: 70kg male,     │
│   beginner, building muscle │
│   4 days/week, 60 min/day  │
│                             │
│   ─── Workout A ───        │
│   Push + Legs Focus         │
│                             │
│   Squat        3×5  55kg   │
│   Bench Press  3×5  45kg   │
│   Barbell Row  3×5  40kg   │
│   OHP          2×8  30kg   │
│   Plank        2×60s       │
│                             │
│   ─── Workout B ───        │
│   Pull + Legs Focus         │
│                             │
│   Squat        3×5  55kg   │
│   OHP          3×5  30kg   │
│   Deadlift     1×5  65kg   │
│   Pull-ups     2×8  BW     │
│   Knee Raise   2×10        │
│                             │
│   ℹ️ Weights are estimates  │
│   Adjust in settings anytime│
│                             │
│   ┌─────────────────────┐   │
│   │    Start Training!  │   │
│   └─────────────────────┘   │
│                             │
│   [ Adjust Starting Weights ]│
└─────────────────────────────┘
```

**Interactions**:
- Exercise rows: Tap to see details
- Show workout schedule summary (e.g., "Mon/Thu: Workout A, Tue/Fri: Workout B")
- "Adjust Starting Weights" → Modal with editable fields
- "Start Training!" → Completes onboarding, creates program, goes to workout

---

## Component Details

### Unit Toggle
```
┌─────────┬─────────┐
│   kg    │   lbs   │
│ selected│         │
└─────────┴─────────┘
```
- Slide indicator animation
- Updates displayed values immediately

### Segmented Control (3-option)
```
┌─────────┬─────────┬─────────┐
│Beginner │Intermediate│Advanced│
│selected │          │         │
└─────────┴─────────┴─────────┘
```
- Highlighted selection
- Equal width segments
- Optional: Icons above text

### Segmented Control (5-option - Frequency)
```
┌────┬────┬────┬────┬────┐
│ 2  │ 3  │ 4  │ 5  │ 6  │
│days│days│days│days│days│
└────┴────┴────┴────┴────┘
```
- Compact for 5 options
- Visual hierarchy on recommended option
- Scrollable on very small screens

### Goal Card (Selected vs Unselected)
```
Selected:                    Unselected:
┌─────────────────┐         ┌─────────────────┐
│ ┌───┐           │         │                 │
│ │ 💪│  Title    │         │      💪         │
│ └───┘  Subtitle │         │     Title       │
│     ✓           │         │    Subtitle     │
└─────────────────┘         └─────────────────┘
   bg-primary/20                bg-surface-light
   border-primary               border-transparent
```

---

## Animations

### Step Transitions
```css
/* Entering from right */
.step-enter {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Exiting to left */
.step-exit {
  animation: slideOut 0.3s ease-in;
}

@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0; }
}
```

### Progress Bar
```css
.progress-bar {
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Button Press
```css
.button {
  transition: transform 0.1s, background-color 0.2s;
}
.button:active {
  transform: scale(0.95);
}
```

---

## Responsive Behavior

### Mobile (< 640px)
- Full width cards
- Single column layout
- Larger touch targets (min 44px)
- Bottom fixed button on each screen

### Tablet (640px - 1024px)
- Centered container (max-w-md)
- Same layout as mobile
- More padding

### Desktop (> 1024px)
- Centered container (max-w-lg)
- Side-by-side goal cards possible
- Hover states enabled

---

## Accessibility

### Keyboard Navigation
- Tab order follows visual order
- Enter/Space to select cards/buttons
- Escape to go back

### Screen Readers
- Semantic HTML (fieldset for groups)
- Aria labels for icons
- Live regions for validation errors
- Progress announced on step change

### Visual
- Minimum 4.5:1 contrast ratio
- Focus indicators visible
- Error messages linked to inputs

---

## Loading States

### During Program Generation
```
┌─────────────────────────────┐
│                             │
│    ⚙️ Generating your      │
│       program...            │
│                             │
│    [=======>    ] 70%      │
│                             │
│    Calculating optimal     │
│    starting weights...      │
│                             │
└─────────────────────────────┘
```

### Skeleton Loading (Program Preview)
- Animated pulse on weight values
- Gray boxes for exercise names
- Prevents layout shift

---

## Error States

### Inline Validation
```
Body Weight *
┌──────────────────┬────┐
│ 20               │ kg │
└──────────────────┴────┘
⚠️ Please enter a weight between 30-300 kg
```

### Unit Display Examples

When user has **metric** preference:
```
Squat: 3×5 @ 80 kg
Plates: 30 kg per side
Body weight: 80 kg
```

When user has **imperial** preference:
```
Squat: 3×5 @ 176 lbs
Plates: 65 lbs per side  
Body weight: 176 lbs
```

### Network Error
```
┌─────────────────────────────┐
│                             │
│   ⚠️ Something went wrong  │
│                             │
│   We couldn't save your    │
│   profile. Please try      │
│   again.                    │
│                             │
│   [ Retry ]  [ Skip for now ]│
│                             │
└─────────────────────────────┘
```

### Validation Summary (Top of Form)
```
┌─────────────────────────────┐
│ ⚠️ Please fix these issues: │
│   • Body weight is required │
│   • Select your sex         │
└─────────────────────────────┘
```
