# Feature Plan: AI Equipment Recognition from Photo

## Overview
Allow users to add gym equipment by taking a photo. The LLM (vision model) recognizes the equipment, creates a new equipment entry, and suggests relevant exercises that can be performed with it.

## User Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  USER FLOW                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐                    │
│  │   Settings   │────▶│  Photo Capture   │────▶│  AI Analysis     │                    │
│  │   Page       │     │ (1-3 images)     │     │  (LLM Vision)    │                    │
│  └──────────────┘     └──────────────────┘     └──────────────────┘                    │
│                                                           │                             │
│                                                           ▼                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐            │
│  │   Equipment  │◀────│  Save to DB  │◀────│     Review & Deduplication   │            │
│  │    Added!    │     │  (Convex)    │     │         (Modal)              │            │
│  └──────────────┘     └──────────────┘     └──────────────────────────────┘            │
│                                                    │                                    │
│                    ┌───────────────────────────────┼───────────────────────────────┐   │
│                    │                               │                               │   │
│                    ▼                               ▼                               ▼   │
│            ┌──────────────┐              ┌──────────────────┐              ┌──────────┐│
│            │   NEW: Add   │              │  EXISTS: Skip or │              │  UPDATE  ││
│            │  equipment   │              │   view existing  │              │  details ││
│            │  + exercises │              │                  │              │          ││
│            └──────────────┘              └──────────────────┘              └──────────┘│
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Deduplication Flow

**For Equipment:**
1. LLM suggests equipment name
2. Normalize name (lowercase, remove special chars)
3. Check against user's existing equipment
4. If match found (>90% similarity): Show "You already have this!"
5. If similar found (70-90%): Show "Did you mean: [existing]?"
6. If new: Show "New equipment detected"

**For Exercises:**
1. LLM suggests exercises for the equipment
2. Check each against: static EXERCISES + user's custom exercises
3. Categorize in UI:
   - ✅ Already in your library (skip by default)
   - 🆕 New exercises (checked by default)
   - 🔗 Link to existing (if LLM name differs from existing)

## Detailed Steps

### 1. Photo Capture (Multi-Image Support)
- User taps "Add Equipment by Photo" button in settings
- **Can add 1-3 images:**
  - **Primary:** Full equipment view (required)
  - **Secondary:** Detail/angle view (optional) - helps identify unique features
  - **Tertiary:** Usage guide plate (optional) - shows intended exercises from manufacturer
- Each image can be captured via camera or file picker
- Images are compressed/resized before upload
- User can preview and reorder images before analysis

**Why multiple images?**
- Some equipment is ambiguous from one angle (e.g., cable machine vs. functional trainer)
- Usage guide plates often show exercises the equipment supports
- Detail views help identify weight capacity, attachments, etc.

### 2. AI Analysis (Vision LLM)
- Send image to vision-capable LLM (GPT-4o, Claude 3 Sonnet, etc.)
- Prompt asks for:
  - Equipment name (standardized)
  - Equipment category (cardio, strength, free-weight, machine, etc.)
  - Description of what it is
  - List of exercises that can be performed
  - Confidence score

### 3. Deduplication Check
**Before showing results to user:**

**Equipment Deduplication:**
- Normalize suggested name: `"Cable Crossover Machine"` → `"cable-crossover-machine"`
- Query user's existing equipment by normalized name
- Calculate similarity with existing names
- Results:
  - **Exact match:** Show existing equipment card, offer to view or cancel
  - **High similarity (80-100%):** Show "Did you mean [existing]?"
  - **New:** Continue to exercise deduplication

**Exercise Deduplication:**
- For each suggested exercise:
  - Normalize name: `"Cable Chest Fly"` → `"cable-chest-fly"`
  - Check against:
    1. Static `EXERCISES` array
    2. User's `customExercises` from DB
  - Categorize:
    - **Exact match:** Pre-checked, labeled "Already exists"
    - **Similar name:** Show "Similar to: [existing]"
    - **New:** Pre-checked, labeled "New"

### 4. Review & Edit
- Show deduplication results clearly:
  - Equipment status (new/existing/similar)
  - Exercise list with checkboxes and badges (New/Exists/Similar)
- Allow editing:
  - Equipment name (warn if becomes similar to existing)
  - Category (if LLM guessed wrong)
  - Toggle which exercises to create
  - Edit exercise names and details
- Show preview of what will be created:
  - "1 new equipment + 3 new exercises will be added"
  - "2 exercises skipped (already exist)"

### 5. Save to Database
- Store images in Convex storage
- Create equipment entry (if new)
- Create exercise entries (if new, with equipment reference)
- Associate exercises with equipment
- Add equipment to user's gymEquipment list
- Return created/linked IDs for UI confirmation

---

## Multi-Image Support in LLM

Most vision LLMs (GPT-4o, Claude 3 Sonnet, Gemini) support multiple images in a single request:

```typescript
// OpenAI example with multiple images
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Analyze this gym equipment..." },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image1}` } },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image2}` } },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image3}` } },
    ],
  }],
});
```

**Benefits:**
- LLM sees context from all angles
- Usage guide plate can inform exercise suggestions
- Higher confidence identification
- Better exercise recommendations

## Technical Implementation

### Database Schema Changes

```typescript
// convex/schema.ts additions

equipments: defineTable({
  userId: v.id("users"),           // Owner (or "system" for global)
  name: v.string(),                // "Cable Machine", "Dumbbell Set"
  normalizedName: v.string(),      // "cable-machine" (for deduplication)
  category: v.union(
    v.literal("barbell"),
    v.literal("dumbbell"),
    v.literal("machine"),
    v.literal("cable"),
    v.literal("bodyweight"),
    v.literal("kettlebell"),
    v.literal("cardio"),
    v.literal("other")
  ),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()), // Stored image reference
  isCustom: v.boolean(),           // User-created vs system
  createdAt: v.number(),
  metadata: v.optional(v.record(v.string(), v.any())), // AI extras
  imageStorageIds: v.optional(v.array(v.id("_storage"))), // Multiple images
})
  .index("by_user", ["userId"])
  .index("by_normalized_name", ["normalizedName"]),

customExercises: defineTable({
  userId: v.id("users"),
  equipmentId: v.id("equipments"),
  name: v.string(),
  normalizedName: v.string(),
  category: v.union(
    v.literal("legs"),
    v.literal("push"),
    v.literal("pull"),
    v.literal("core"),
    v.literal("cardio"),
    v.literal("full-body")
  ),
  primaryMuscles: v.array(v.string()),
  defaultProgression: v.object({
    incrementKg: v.number(),
    deloadAfterFailures: v.number(),
    deloadPercent: v.number(),
  }),
  warmupFormula: v.array(v.object({
    percentOfWork: v.number(),
    reps: v.number(),
  })),
  isTimeBased: v.optional(v.boolean()),
  defaultTimeSeconds: v.optional(v.number()),
  isCustom: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_equipment", ["equipmentId"]),
```

### New Services

```typescript
// src/lib/services/equipmentRecognition.ts

interface EquipmentRecognitionRequest {
  imageBase64: string;  // Compressed image
  mimeType: string;     // image/jpeg, image/png
}

interface EquipmentRecognitionResponse {
  equipment: {
    name: string;
    normalizedName: string;
    category: EquipmentCategory;
    description: string;
    confidence: number;  // 0-1
  };
  suggestedExercises: {
    name: string;
    category: ExerciseCategory;
    primaryMuscles: string[];
    description: string;
    confidence: number;
  }[];
}

async function recognizeEquipment(
  request: EquipmentRecognitionRequest,
  config: LlmConfig
): Promise<EquipmentRecognitionResponse>
```

### LLM Prompt for Vision Recognition

```
You are a fitness equipment expert. Analyze this gym equipment photo and identify:

1. EQUIPMENT IDENTIFICATION:
   - What is this equipment called? (standard gym terminology)
   - What category does it belong to? (barbell/dumbbell/machine/cable/kettlebell/cardio/bodyweight/other)
   - Brief description of what it is and how it's used
   - Confidence score (0.0-1.0)

2. EXERCISE SUGGESTIONS:
   List 3-8 exercises that can be performed with this equipment. For each:
   - Exercise name (standard terminology)
   - Category: legs/push/pull/core/cardio/full-body
   - Primary muscles targeted
   - Brief description of proper form
   - Confidence this exercise works with this equipment

Respond ONLY with valid JSON in this format:
{
  "equipment": {
    "name": "Equipment Name",
    "category": "machine",
    "description": "A machine for...",
    "confidence": 0.95
  },
  "suggestedExercises": [
    {
      "name": "Exercise Name",
      "category": "push",
      "primaryMuscles": ["chest", "triceps"],
      "description": "How to perform...",
      "confidence": 0.92
    }
  ]
}
```

### New Components

```typescript
// src/lib/components/equipment/
// - EquipmentPhotoCapture.svelte    // Camera/file picker
// - EquipmentRecognitionModal.svelte // Review AI results
// - EquipmentCard.svelte             // Display equipment with image
// - ExerciseSuggestionList.svelte    // List exercises to add
```

### New Convex Actions

```typescript
// convex/equipments.ts

// Upload and analyze equipment photo
export const analyzeEquipmentPhoto = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
  },
  returns: v.object({
    equipment: v.object({...}),
    suggestedExercises: v.array(v.object({...})),
  }),
  handler: async (ctx, args) => {
    // Call LLM vision API
    // Return results (don't save yet)
  },
});

// Save recognized equipment and exercises
export const saveRecognizedEquipment = mutation({
  args: {
    equipment: v.object({...}),
    exercises: v.array(v.object({...})),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Create equipment record
    // Create exercise records
    // Add to user's equipment list
  },
});

// Get user's custom equipment
export const getUserEquipment = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({...})),
  handler: async (ctx, args) => {
    // Return equipments + their exercises
  },
});
```

---

## UI/UX Design

### Settings Page Update
Add new section "Equipment from Photo":

```
┌─────────────────────────────────────────┐
│  Equipment from Photo                   │
├─────────────────────────────────────────┤
│                                         │
│  [📷 Take Photo / Upload Image]         │
│                                         │
│  Your Equipment:                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ [photo]  │ │ [photo]  │ │    +     ││
│  │ Cable    │ │ Dumbbell │ │   Add    ││
│  │ Machine  │ │  Set     │ │  New     ││
│  └──────────┘ └──────────┘ └──────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### Recognition Review Modal

```
┌─────────────────────────────────────────┐
│  ✓ Equipment Recognized                 │
├─────────────────────────────────────────┤
│                                         │
│  [Photo thumbnail]                      │
│                                         │
│  Equipment: ┌─────────────────────┐    │
│             │ Cable Crossover     │    │
│             └─────────────────────┘    │
│  Category:  [Cable ▼]                  │
│  Confidence: 95% 🟢                    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Suggested Exercises:                   │
│  ☑ Cable Chest Fly (Push - Chest)      │
│  ☑ Tricep Pushdown (Push - Triceps)    │
│  ☑ Lat Pulldown (Pull - Back)          │
│  ☐ Cable Crunch (Core - Abs)           │
│                                         │
│  [+ Add Custom Exercise]                │
│                                         │
│  [Cancel]              [Save Equipment] │
│                                         │
└─────────────────────────────────────────┘
```

---

## Implementation Phases (Updated)

### Phase 1: Basic Photo Recognition (MVP)
- [ ] Add `equipments` table to schema (with imageStorageIds array)
- [ ] Create `equipmentRecognition.ts` service (supports multi-image)
- [ ] Add multi-image capture component (1-3 photos)
- [ ] Create deduplication logic (equipment similarity check)
- [ ] Create recognition review modal with dedup UI
- [ ] Add Convex action to call LLM vision API
- [ ] Update settings page with "Add by Photo" button
- [ ] Save equipment + images to Convex

### Phase 2: Custom Exercises with Deduplication
- [ ] Add `customExercises` table to schema
- [ ] Extend LLM prompt to suggest exercises
- [ ] Create exercise deduplication logic (vs static + custom)
- [ ] Update review modal with exercise selection (New/Exists badges)
- [ ] Merge custom exercises with static EXERCISES list at runtime

### Phase 3: Enhanced Features
- [ ] Equipment gallery/grid view with photos in settings
- [ ] Equipment editing/deletion
- [ ] "Did you mean?" for similar equipment
- [ ] Image reordering (primary image selection)
- [ ] "Browse Common Equipment" mode (no photo needed)

### Phase 4: Smart Workout Integration
- [ ] AI can suggest exercises from user's equipment
- [ ] Workout builder filters by available equipment
- [ ] Equipment-aware workout modifications

---

## Key Design Decisions (✅ Finalized)

| Question | Decision |
|----------|----------|
| **Deduplication** | ✅ Check existing before creating. Show "already exists" / "did you mean" |
| **Image Storage** | ✅ Convex storage (`_storage` table) |
| **Exercise check** | ✅ Check both static EXERCISES and user's custom exercises |
| **Sharing** | ✅ User-specific only (local) for now |
| **Multiple images** | ✅ Support 1-3 images (primary, detail, usage plate) |

## Open Questions / Considerations

1. **Similarity Thresholds:**
   - What similarity % for "did you mean"? (suggest 80%)
   - Use Levenshtein distance or embedding similarity?

2. **LLM Cost Optimization:**
   - Vision API calls are ~$0.005-0.01 per image
   - 3 images = ~$0.015-0.03 per analysis
   - Consider caching: same user + similar images within 24h?
   - Add monthly limit (e.g., 50 analyses)?

3. **Offline Support:**
   - Queue photo for analysis when online
   - Store locally, sync later

4. **Usage Guide Plate Reading:**
   - LLM can OCR usage plates to suggest exercises
   - May need specific prompt section for "extract exercises from usage diagram"
   - Could significantly improve exercise suggestion accuracy

---

## File Changes Summary

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `equipments` and `customExercises` tables |
| `convex/equipments.ts` | New - equipment mutations/queries |
| `src/lib/services/equipmentRecognition.ts` | New - LLM vision service |
| `src/lib/types/equipment.ts` | New - equipment types |
| `src/lib/components/equipment/` | New - 4 components |
| `src/routes/settings/+page.svelte` | Add photo capture section |
| `src/lib/data/exercises.ts` | Merge custom exercises |

---

## Success Metrics

- Users add at least 1 equipment via photo
- Average 3+ exercises per recognized equipment
- Recognition confidence > 80%
- < 5 second response time for analysis
