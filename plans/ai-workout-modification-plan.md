# AI Workout Modification - Implementation Plan

## Overview
Allow users to modify a single workout session using natural language. The LLM suggests modifications, user confirms/rejects, and the modified workout runs as a one-time session without affecting the training program.

## Core Requirements
- ✅ User provides their own AI API token (OpenAI/Anthropic)
- ✅ Natural language input for modification requests
- ✅ LLM response validation (Zod schemas)
- ✅ Hard-coded exercise alternatives for common cases
- ✅ User confirmation/rejection/refinement workflow
- ✅ One-time modification (program continues unchanged)
- ✅ Modifications tracked in workout history

---

## ✅ Phase 1: API Token Management

### Schema Updates (`convex/schema.ts`)
Add to `userProfiles` table:
```typescript
aiApiToken: v.optional(v.string()),        // Encrypted
aiProvider: v.optional(v.union(
  v.literal('openai'), 
  v.literal('anthropic')
)),
aiTokenEncryptedAt: v.optional(v.number()),
```

### Settings UI (`src/routes/settings/+page.svelte`)
New "AI Configuration" section:
- Enable/disable AI toggle
- Provider selection (OpenAI/Anthropic)
- API key input (masked, encrypted)
- Test connection button
- Storage option: localStorage vs encrypted DB

### Convex Mutations (`convex/userProfiles.ts`)
- `updateAiSettings`: Encrypt and save token
- `removeAiSettings`: Clear AI configuration
- `getAiSettings`: Return provider (not token) for UI

---

## ✅ Phase 2: Exercise Substitution Database

### File: `src/lib/data/exerciseSubstitutions.ts` ✅ IMPLEMENTED

Mapping structure for hard-coded alternatives:
```typescript
interface SubstitutionRule {
  exerciseId: string;
  alternatives: {
    exerciseId: string;
    reason: 'equipment' | 'easier' | 'harder' | 'injury_friendly';
    requiredEquipment: string[];
    affectedBodyParts: string[];  // For injury matching
    intensityChange: 'lower' | 'similar' | 'higher';
  }[];
}
```

Covers all 5 core lifts + major alternatives with equipment requirements.

### Helper Functions
- `getSubstitutionsForExercise()`: Filter by equipment/reason/body part
- `getExercisesByEquipment()`: Filter available exercises
- `validateSubstitution()`: Check if substitution is valid for user

---

## ✅ Phase 3: LLM Integration with Zod Validation

### File: `src/lib/services/aiWorkoutModification.ts` ✅ IMPLEMENTED

#### Request Types
```typescript
interface ModificationRequest {
  userRequest: string;
  currentPlan: PlannedExercise[];
  availableEquipment: string[];
  userExerciseSettings: Record<string, UserExerciseSettings>;
  completedSets: WorkoutSet[];
}
```

#### Zod Validation Schema (CRITICAL)
```typescript
import { z } from 'zod';

const PlannedExerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  weight: z.number().min(0).max(1000),
  timeSeconds: z.number().optional(),
});

const ChangeSchema = z.object({
  type: z.enum(['replace', 'modify_sets', 'modify_reps', 'modify_weight', 'reorder', 'remove']),
  originalExerciseId: z.string().optional(),
  newExerciseId: z.string().optional(),
  reason: z.string(),
});

const ModificationResponseSchema = z.object({
  summary: z.string().min(10).max(500),
  newPlan: z.array(PlannedExerciseSchema).min(1),
  changes: z.array(ChangeSchema),
  warnings: z.array(z.string()),
});

type ModificationResponse = z.infer<typeof ModificationResponseSchema>;
```

#### Validation Strategy
1. **Parse**: Use `ModificationResponseSchema.safeParse()` on LLM response
2. **Validate Exercise IDs**: Check all `exerciseId`s exist in `EXERCISES`
3. **Validate Equipment**: Ensure new exercises match user's `availableEquipment`
4. **Validate Changes**: Verify changes reference valid exercises in current plan
5. **Sanity Checks**: 
   - Weight within reasonable range (0-1000kg)
   - Sets/reps within bounds
   - At least one exercise in plan
6. **Fallback**: If validation fails, return error and prompt user to try again

#### Error Handling
```typescript
interface ValidationError {
  type: 'parse_error' | 'invalid_exercise' | 'missing_equipment' | 'invalid_change';
  message: string;
  details?: string[];
}
```

### LLM Prompt Engineering

System prompt includes:
- Current workout plan (sets/reps/weights)
- Available equipment
- Already completed sets (preserve these)
- Valid exercise IDs with names
- Substitution rules as context
- **JSON schema requirement** with strict typing

Example prompt structure:
```
You are a fitness trainer modifying a single workout.

CURRENT PLAN:
- squat: 3 sets × 5 reps @ 80kg
- bench-press: 3 sets × 5 reps @ 60kg
...

COMPLETED: squat warmup sets 1-3

AVAILABLE EQUIPMENT: barbell, squat-rack, bench, dumbbells

VALID EXERCISES:
- squat (Barbell Squat) - needs: barbell, squat-rack
- leg-press (Leg Press) - needs: leg-press
...

USER REQUEST: "bench press station is taken, what else for chest?"

Respond ONLY with valid JSON matching this schema:
{
  "summary": "string (10-500 chars)",
  "newPlan": [{"exerciseId": "string", "sets": 1-20, "reps": 1-100, "weight": 0-1000}],
  "changes": [{"type": "replace|modify_sets|modify_reps|modify_weight|reorder|remove", "originalExerciseId": "string?", "newExerciseId": "string?", "reason": "string"}],
  "warnings": ["string"]
}
```

---

## ✅ Phase 4: UI Components

### `WorkoutModificationModal.svelte` ✅ IMPLEMENTED

**States:**
1. **Quick Actions** (default view)
   - "Equipment taken" → Equipment picker
   - "Injury/Pain" → Body part picker
   - "Make easier/harder"
   - "Custom request" → Text input

2. **Loading**
   - Spinner with "Analyzing your request..."
   - Cancel button

3. **Review** (after LLM response)
   - Summary text
   - Before/after comparison table
   - Change list with badges
   - Warnings (highlighted)
   - Action buttons: "Start Modified Workout", "Add Details", "Try Different", "Cancel"

4. **Refinement**
   - "What would you like to change?"
   - Text input with previous context shown
   - Submit button

### `ModificationReview.svelte`
Sub-component for before/after comparison:
- Side-by-side or diff view
- Color coding: green (added), red (removed), yellow (modified)
- Expandable exercise details

### Integration in `/workout/+page.svelte`
- "Modify Workout" button in header
- Only visible if: AI enabled + token configured
- Badge when workout is modified
- Show modification summary (expandable)

---

## Phase 5: Backend Integration

### Update `convex/workouts.ts`

#### Existing `modify` mutation enhancements:
- Accept `request: string` and `responseSummary: string`
- Preserve completed sets when regenerating
- Validate `newPlan` exercise IDs (defense in depth)

#### New `getModificationHistory` query:
Returns recent modified workouts for analytics.

### Workout Completion
In `complete` mutation:
- Check for `modifications` field
- Store modification in history
- Update weights based on MODIFIED workout (user did what they did)
- Do NOT update program template

---

## Phase 6: Data Flow

```
User Request
    ↓
Quick Action or Text Input
    ↓
Build ModificationRequest context
    ↓
Call OpenAI/Anthropic API
    ↓
Parse JSON response
    ↓
Zod Validation (ModificationResponseSchema)
    ↓ VALID?
    ├─ YES → Validate exercise IDs exist
    │        ↓
    │   Validate equipment compatibility
    │        ↓
    │   Show Review UI
    │        ↓
    │   User Confirms
    │        ↓
    │   Call convex.workouts.modify
    │        ↓
    │   Update local state
    │        ↓
    │   User completes workout
    │        ↓
    │   Save with modification record
    │
    └─ NO → Show error + "Try Again" or "Use Quick Options"
```

---

## Phase 7: Security & Error Handling

### API Token Security
- Encryption key in `CONVEX_ENCRYPTION_KEY` env var
- Simple AES encryption for tokens at rest
- Option for session-only (localStorage) storage
- Token never logged or sent to Convex unencrypted

### Error Scenarios
| Scenario | Handling |
|----------|----------|
| LLM returns invalid JSON | Show error, suggest trying again or using quick options |
| Zod validation fails | Display specific error, show raw response for debugging |
| Invalid exercise ID | Filter out invalid, show warning, proceed if possible |
| Missing equipment | Reject with clear message about what's needed |
| API rate limit | Show error, suggest waiting or using hard-coded options |
| Network error | Retry once, then show error with manual fallback |
| User has no token | Prompt to configure in settings |

### Fallback Strategy
If LLM fails 3 times or user prefers:
- Show hard-coded substitution picker
- Manual exercise swap UI
- Direct plan editor (sets/reps/weight)

---

## Phase 8: File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── WorkoutModificationModal.svelte
│   │   ├── ModificationReview.svelte
│   │   ├── QuickActionButtons.svelte
│   │   └── AiSettingsForm.svelte
│   ├── data/
│   │   ├── exercises.ts
│   │   └── exerciseSubstitutions.ts      # NEW
│   ├── services/
│   │   └── aiWorkoutModification.ts      # NEW (with Zod)
│   ├── utils/
│   │   └── encryption.ts                 # NEW (token encryption)
│   ├── types/
│   │   ├── index.ts
│   │   └── ai.ts                         # NEW
│   └── stores/
│       └── aiSettings.ts                 # NEW
├── routes/
│   ├── settings/
│   │   └── +page.svelte                  # +AI section
│   └── workout/
│       └── +page.svelte                  # +Modify button
convex/
├── schema.ts                             # +AI fields
├── userProfiles.ts                       # +AI mutations
└── workouts.ts                           # Enhancements
```

---

## Phase 9: Testing Checklist

- [ ] Zod schema validates correct responses
- [ ] Zod rejects invalid responses with clear errors
- [ ] Exercise ID validation catches unknown IDs
- [ ] Equipment validation prevents unavailable exercises
- [ ] Token encryption/decryption works
- [ ] Settings UI saves/loads AI config
- [ ] Quick action buttons populate correct context
- [ ] LLM prompt includes all necessary context
- [ ] Modification preserves completed sets
- [ ] Program continues unchanged after modified workout
- [ ] Fallback UI works when AI unavailable
- [ ] Error messages are user-friendly

---

## Implementation Order

1. **Phase 2**: Exercise substitution database (no dependencies)
2. **Phase 3**: LLM service with Zod validation (can test independently)
3. **Phase 1**: API token settings UI
4. **Phase 4**: Modification modal UI
5. **Phase 5**: Backend integration
6. **Polish**: Error handling, loading states, edge cases

---

## Open Questions

1. Should we support multiple LLM providers from start or just OpenAI?
2. How aggressive should we be with fallback to hard-coded options?
3. Should we cache successful modifications for similar future requests?
4. Do we want to track/analyze modification patterns (anonymized)?


---

## ✅ Implementation Summary

### Completed Features

| Component | Status | File |
|-----------|--------|------|
| Exercise Substitution Database | ✅ | `src/lib/data/exerciseSubstitutions.ts` |
| Modification Presets | ✅ | `src/lib/data/modificationPresets.ts` |
| AI Types & Zod Schemas | ✅ | `src/lib/types/ai.ts` |
| LLM Service | ✅ | `src/lib/services/aiWorkoutModification.ts` |
| AI Settings Store | ✅ | `src/lib/stores/aiSettings.ts` |
| AI Settings Form | ✅ | `src/lib/components/AiSettingsForm.svelte` |
| Workout Modification Modal | ✅ | `src/lib/components/WorkoutModificationModal.svelte` |
| Settings Integration | ✅ | `src/routes/settings/+page.svelte` |
| Workout Page Integration | ✅ | `src/routes/workout/+page.svelte` |

### Key Features Implemented

1. **Zod Validation**: All LLM responses are validated against strict schemas
2. **Multi-layer Validation**: JSON parse → Zod schema → Exercise IDs → Equipment → Safety checks
3. **Fallback Options**: Hard-coded substitutions when AI is unavailable
4. **Quick Actions**: One-tap presets for common scenarios
5. **Local Token Storage**: API keys stored only in browser localStorage
6. **Provider Support**: OpenAI (GPT-4o Mini) and Anthropic (Claude 3 Haiku)
7. **Preservation of Completed Sets**: Modifications only affect uncompleted exercises
8. **Visual Feedback**: Summary, warnings, and before/after comparison

### Validation Strategy

```
LLM Response
    ↓
JSON.parse()
    ↓
Zod Schema Validation (ModificationResponseSchema)
    ↓
Exercise ID Validation (exists in database)
    ↓
Equipment Validation (user has required equipment)
    ↓
Change Validation (references valid exercises)
    ↓
Safety Checks (weight/volume bounds)
    ↓
Convert to ModificationResponse
```

### User Flow

```
User taps "Modify Workout"
    ↓
Quick Action Selection (Equipment/Injury/Intensity/Preference)
    ↓
Or Custom Text Input
    ↓
AI Request with Full Context
    ↓
Zod-Validated Response
    ↓
Review Changes (Summary + Warnings + New Plan)
    ↓
Confirm or Refine
    ↓
Apply to Workout (Preserve Completed Sets)
    ↓
Continue Modified Workout
```

### Security Measures

- API tokens stored only in browser localStorage
- Tokens never sent to Convex or any server
- User must provide their own API key
- No API costs incurred by app owner

### Future Enhancements (Not Implemented)

- [ ] Encrypted token storage option
- [ ] Voice input for requests
- [ ] Caching successful modifications
- [ ] Analytics/anonymous usage patterns
- [ ] More exercise alternatives
- [ ] Multi-language support

---
