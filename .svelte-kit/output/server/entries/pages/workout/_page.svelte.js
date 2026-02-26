import { a as store_get, u as unsubscribe_stores, j as bind_props, f as ensure_array_like, e as escape_html, b as attr_class, d as stringify, i as attr, h as head } from "../../../chunks/index2.js";
import { o as onDestroy } from "../../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import { g as getExerciseById, E as EXERCISES } from "../../../chunks/exercises.js";
import { n as navVisibilityStore } from "../../../chunks/convex.js";
import { a as aiAvailable } from "../../../chunks/aiSettings.js";
const BAR_WEIGHT = 20;
const MIN_PLATE = 2.5;
function calculateWarmupSets(exerciseId, workWeight) {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return [];
  const sets = [];
  let setNumber = 1;
  for (const step of exercise.warmupFormula) {
    let weight;
    if (step.percentOfWork === 0) {
      weight = BAR_WEIGHT;
    } else {
      const rawWeight = workWeight * step.percentOfWork;
      weight = Math.round(rawWeight / (MIN_PLATE * 2)) * (MIN_PLATE * 2);
    }
    if (weight < workWeight - MIN_PLATE && !sets.find((s) => s.targetWeight === weight)) {
      sets.push({
        id: `${exerciseId}-warmup-${setNumber}`,
        exerciseId,
        setNumber: setNumber++,
        type: "warmup",
        targetReps: step.reps,
        targetWeight: weight,
        failed: false
      });
    }
  }
  return sets;
}
function calculateWorkSets(exerciseId, workSets, reps, weight, startSetNumber = 1, timeSeconds) {
  return Array.from({ length: workSets }, (_, i) => ({
    id: `${exerciseId}-work-${i + 1}`,
    exerciseId,
    setNumber: startSetNumber + i,
    type: "work",
    targetReps: timeSeconds ? 0 : reps,
    targetWeight: weight,
    targetTimeSeconds: timeSeconds,
    failed: false
  }));
}
function generateAllSets(exerciseId, workSets, reps, weight, timeSeconds) {
  const warmupSets = timeSeconds ? [] : calculateWarmupSets(exerciseId, weight);
  const workSetsList = calculateWorkSets(
    exerciseId,
    workSets,
    reps,
    weight,
    warmupSets.length + 1,
    timeSeconds
  );
  return [...warmupSets, ...workSetsList];
}
new Set(EXERCISES.map((e) => e.id));
new Map(EXERCISES.map((e) => [e.id, e.equipment]));
const MODIFICATION_PRESETS = [
  // Equipment Issues
  {
    id: "equipment-taken",
    label: "Equipment Taken",
    description: "Some equipment is unavailable",
    icon: "🚫",
    category: "equipment",
    buildRequest: (context) => {
      return `Some equipment I need is currently taken or unavailable. Please suggest alternatives using only: ${context.availableEquipment.join(", ")}.`;
    }
  },
  {
    id: "no-barbell",
    label: "No Barbell",
    description: "Barbell exercises not possible today",
    icon: "🏋️",
    category: "equipment",
    buildRequest: () => {
      return "I don't have access to a barbell today. Please replace all barbell exercises with dumbbell or bodyweight alternatives.";
    }
  },
  {
    id: "dumbbells-only",
    label: "Dumbbells Only",
    description: "Only have dumbbells available",
    icon: "🔩",
    category: "equipment",
    buildRequest: () => {
      return "I only have dumbbells available today. Please modify the workout to use only dumbbell exercises.";
    }
  },
  {
    id: "cables-taken",
    label: "Cables/Machines Taken",
    description: "Cable machines are occupied",
    icon: "🔗",
    category: "equipment",
    buildRequest: () => {
      return "Cable machines and weight machines are all taken. Please give me a workout using only free weights or bodyweight exercises.";
    }
  },
  // Injury/Pain Management
  {
    id: "shoulder-pain",
    label: "Shoulder Pain",
    description: "Need shoulder-friendly alternatives",
    icon: "🤕",
    category: "injury",
    buildRequest: () => {
      return "My shoulder is bothering me today. Please modify pressing movements to be more shoulder-friendly, and reduce or remove any overhead work.";
    }
  },
  {
    id: "lower-back-pain",
    label: "Lower Back Pain",
    description: "Need lower back-friendly options",
    icon: "🏥",
    category: "injury",
    buildRequest: () => {
      return "I'm experiencing some lower back discomfort. Please replace exercises that load the spine with machine-based or supported alternatives.";
    }
  },
  {
    id: "knee-pain",
    label: "Knee Pain",
    description: "Need knee-friendly leg exercises",
    icon: "🦵",
    category: "injury",
    buildRequest: () => {
      return "My knee is acting up today. Please modify leg exercises to reduce knee stress - focus on hip hinge movements or machine-based leg work.";
    }
  },
  {
    id: "wrist-pain",
    label: "Wrist Pain",
    description: "Need wrist-friendly grip options",
    icon: "✋",
    category: "injury",
    buildRequest: () => {
      return "My wrist is painful today. Please suggest exercises that don't require direct wrist loading, or use neutral grip positions.";
    }
  },
  // Intensity Adjustments
  {
    id: "feeling-tired",
    label: "Feeling Tired",
    description: "Reduce intensity today",
    icon: "😴",
    category: "intensity",
    buildRequest: () => {
      return "I'm feeling tired and low on energy today. Please reduce the workout volume or intensity while keeping the same exercise selection.";
    }
  },
  {
    id: "deload-day",
    label: "Deload Day",
    description: "Significantly lighter workout",
    icon: "🪶",
    category: "intensity",
    buildRequest: () => {
      return "This is a deload day. Please reduce all weights by about 20-30% and cut the volume in half. Keep the same exercises.";
    }
  },
  {
    id: "short-on-time",
    label: "Short on Time",
    description: "Quick workout under 30 min",
    icon: "⏱️",
    category: "intensity",
    buildRequest: () => {
      return "I'm short on time today. Please condense this into a 20-30 minute workout by reducing sets and focusing on the most important exercises.";
    }
  },
  {
    id: "feeling-strong",
    label: "Feeling Strong",
    description: "Make it harder",
    icon: "💪",
    category: "intensity",
    buildRequest: () => {
      return "I'm feeling great today and want to push harder. Please increase the intensity - add sets, reduce rest, or suggest more challenging variations.";
    }
  },
  // Preference/Variation
  {
    id: "want-variation",
    label: "Want Variation",
    description: "Try different exercises",
    icon: "🔄",
    category: "preference",
    buildRequest: (context) => {
      const exerciseNames = context.currentPlan.map((e) => getExerciseById(e.exerciseId)?.name || e.exerciseId).join(", ");
      return `I want to try some different exercises today instead of: ${exerciseNames}. Please suggest alternative exercises that work the same muscle groups.`;
    }
  },
  {
    id: "focus-upper",
    label: "Focus Upper Body",
    description: "More upper, less lower",
    icon: "👆",
    category: "preference",
    buildRequest: () => {
      return "I want to focus more on upper body today. Please reduce or remove leg exercises and add more pressing, pulling, or arm work.";
    }
  },
  {
    id: "focus-lower",
    label: "Focus Lower Body",
    description: "More lower, less upper",
    icon: "👇",
    category: "preference",
    buildRequest: () => {
      return "I want to focus more on lower body today. Please reduce upper body work and add more leg and posterior chain exercises.";
    }
  },
  {
    id: "add-isolation",
    label: "Add Isolation Work",
    description: "More accessory exercises",
    icon: "🎯",
    category: "preference",
    buildRequest: () => {
      return "I'd like to add some isolation work today for arms, shoulders, or calves. Please keep the main lifts but add 1-2 isolation exercises at the end.";
    }
  }
];
const PRESET_CATEGORIES = [
  { id: "equipment", label: "Equipment", icon: "🏋️" },
  { id: "injury", label: "Injury/Pain", icon: "🤕" },
  { id: "intensity", label: "Intensity", icon: "⚡" },
  { id: "preference", label: "Preference", icon: "⚙️" }
];
const INJURY_BODY_PARTS = [
  { id: "shoulder", label: "Shoulder", icon: "🦴" },
  { id: "lower-back", label: "Lower Back", icon: "🏥" },
  { id: "knee", label: "Knee", icon: "🦵" },
  { id: "wrist", label: "Wrist", icon: "✋" },
  { id: "elbow", label: "Elbow", icon: "💪" },
  { id: "hip", label: "Hip", icon: "🍑" },
  { id: "ankle", label: "Ankle", icon: "🦶" }
];
const EQUIPMENT_OPTIONS = [
  { id: "barbell", label: "Barbell", icon: "🏋️" },
  { id: "squat-rack", label: "Squat Rack", icon: "📦" },
  { id: "bench", label: "Bench", icon: "🪑" },
  { id: "dumbbells", label: "Dumbbells", icon: "🔩" },
  { id: "cable-machine", label: "Cable Machine", icon: "🔗" },
  { id: "leg-press", label: "Leg Press", icon: "🦵" },
  { id: "pull-up-bar", label: "Pull-up Bar", icon: "🪜" },
  { id: "kettlebells", label: "Kettlebells", icon: "☕" }
];
function WorkoutModificationModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let hasAi, categoryPresets;
    let isOpen = $$props["isOpen"];
    let currentPlan = $$props["currentPlan"];
    let completedSets = $$props["completedSets"];
    let availableEquipment = $$props["availableEquipment"];
    let userExerciseSettings = $$props["userExerciseSettings"];
    let onConfirm = $$props["onConfirm"];
    let onCancel = $$props["onCancel"];
    let state = { type: "quick-select" };
    let selectedCategory = null;
    let selectedOptions = [];
    let customRequest = "";
    function getExerciseName(id) {
      return getExerciseById(id)?.name || id;
    }
    function formatChangeType(type) {
      return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
    hasAi = store_get($$store_subs ??= {}, "$aiAvailable", aiAvailable);
    if (isOpen) {
      state = { type: "quick-select" };
      selectedCategory = null;
      selectedOptions = [];
      customRequest = "";
    }
    categoryPresets = selectedCategory ? MODIFICATION_PRESETS.filter((p) => p.category === selectedCategory) : [];
    if (
      // Build context for preset requests
      // Handle preset selection
      // Handle custom request submission
      // Handle category-specific submission (equipment/injury/intensity selection)
      // Send the modification request to AI
      // Handle refinement request
      // Submit refinement
      // Apply fallback option
      // Confirm the modification
      // Go to settings
      // Get exercise name
      // Format change type for display
      isOpen
    ) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"><div class="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"><header class="p-4 border-b border-surface-light flex items-center justify-between"><h2 class="text-xl font-bold">Modify Workout</h2> <button class="text-text-muted hover:text-text p-1" aria-label="Close"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></header> <div class="flex-1 overflow-y-auto p-4">`);
      if (state.type === "quick-select") {
        $$renderer2.push("<!--[-->");
        if (!hasAi) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="text-center py-8"><div class="text-4xl mb-4">🤖</div> <h3 class="text-lg font-semibold mb-2">AI Features Disabled</h3> <p class="text-text-muted mb-4">To use AI workout modifications, you need to add your own API key.
                Your key is stored locally and never sent to our servers.</p> <button class="bg-primary hover:bg-primary-dark px-6 py-3 rounded-xl font-semibold">Configure AI Settings</button></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<p class="text-text-muted mb-4">What would you like to adjust?</p> `);
          if (!selectedCategory) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div class="grid grid-cols-2 gap-3"><!--[-->`);
            const each_array = ensure_array_like(PRESET_CATEGORIES);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let category = each_array[$$index];
              $$renderer2.push(`<button class="p-4 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left transition-all"><div class="text-2xl mb-2">${escape_html(category.icon)}</div> <div class="font-semibold">${escape_html(category.label)}</div></button>`);
            }
            $$renderer2.push(`<!--]--> <button class="p-4 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left transition-all"><div class="text-2xl mb-2">💬</div> <div class="font-semibold">Custom Request</div></button></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<div class="mb-4"><button class="text-sm text-text-muted hover:text-text flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Back</button></div> `);
            if (selectedCategory === "equipment") {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<p class="text-sm text-text-muted mb-3">What's unavailable?</p> <div class="space-y-2"><!--[-->`);
              const each_array_1 = ensure_array_like(EQUIPMENT_OPTIONS);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let option = each_array_1[$$index_1];
                $$renderer2.push(`<button${attr_class(`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all ${stringify(selectedOptions.includes(option.id) ? "bg-primary text-white" : "bg-surface-light hover:bg-surface-light/80")}`)}><span class="text-xl">${escape_html(option.icon)}</span> <span>${escape_html(option.label)}</span> `);
                if (selectedOptions.includes(option.id)) {
                  $$renderer2.push("<!--[-->");
                  $$renderer2.push(`<span class="ml-auto">✓</span>`);
                } else {
                  $$renderer2.push("<!--[!-->");
                }
                $$renderer2.push(`<!--]--></button>`);
              }
              $$renderer2.push(`<!--]--></div>`);
            } else if (selectedCategory === "injury") {
              $$renderer2.push("<!--[1-->");
              $$renderer2.push(`<p class="text-sm text-text-muted mb-3">Where are you experiencing pain?</p> <div class="space-y-2"><!--[-->`);
              const each_array_2 = ensure_array_like(INJURY_BODY_PARTS);
              for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                let part = each_array_2[$$index_2];
                $$renderer2.push(`<button${attr_class(`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all ${stringify(selectedOptions.includes(part.id) ? "bg-warning/20 text-warning border border-warning" : "bg-surface-light hover:bg-surface-light/80")}`)}><span class="text-xl">${escape_html(part.icon)}</span> <span>${escape_html(part.label)}</span> `);
                if (selectedOptions.includes(part.id)) {
                  $$renderer2.push("<!--[-->");
                  $$renderer2.push(`<span class="ml-auto">✓</span>`);
                } else {
                  $$renderer2.push("<!--[!-->");
                }
                $$renderer2.push(`<!--]--></button>`);
              }
              $$renderer2.push(`<!--]--></div>`);
            } else if (selectedCategory === "intensity") {
              $$renderer2.push("<!--[2-->");
              $$renderer2.push(`<p class="text-sm text-text-muted mb-3">How are you feeling?</p> <div class="space-y-3"><button class="w-full p-4 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left"><div class="flex items-center gap-3"><span class="text-2xl">😴</span> <div><div class="font-semibold">Make it Easier</div> <div class="text-sm text-text-muted">Reduce volume or intensity</div></div></div></button> <button class="w-full p-4 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left"><div class="flex items-center gap-3"><span class="text-2xl">💪</span> <div><div class="font-semibold">Make it Harder</div> <div class="text-sm text-text-muted">Increase volume or intensity</div></div></div></button></div>`);
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`<div class="space-y-2"><!--[-->`);
              const each_array_3 = ensure_array_like(categoryPresets);
              for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                let preset = each_array_3[$$index_3];
                $$renderer2.push(`<button class="w-full p-3 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left"><div class="flex items-center gap-3"><span class="text-xl">${escape_html(preset.icon)}</span> <div><div class="font-semibold">${escape_html(preset.label)}</div> <div class="text-sm text-text-muted">${escape_html(preset.description)}</div></div></div></button>`);
              }
              $$renderer2.push(`<!--]--></div>`);
            }
            $$renderer2.push(`<!--]--> `);
            if (selectedCategory === "equipment" || selectedCategory === "injury") {
              $$renderer2.push("<!--[-->");
              if (selectedOptions.length > 0) {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<button class="w-full mt-4 bg-primary hover:bg-primary-dark p-4 rounded-xl font-semibold">Continue</button>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]-->`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      } else if (state.type === "custom-input") {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<div class="mb-4"><button class="text-sm text-text-muted hover:text-text flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Back to Quick Options</button></div> <p class="text-text-muted mb-3">Describe what you need:</p> <textarea placeholder="e.g., My right shoulder hurts, can you suggest something easier for pressing?" class="w-full h-32 bg-surface-light rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary">`);
        const $$body = escape_html(customRequest);
        if ($$body) {
          $$renderer2.push(`${$$body}`);
        }
        $$renderer2.push(`</textarea> <div class="text-right text-sm text-text-muted mt-1">${escape_html(customRequest.length)}/500</div> <button${attr("disabled", !customRequest.trim(), true)} class="w-full mt-4 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-xl font-semibold">Generate Modifications</button>`);
      } else if (state.type === "loading") {
        $$renderer2.push("<!--[2-->");
        $$renderer2.push(`<div class="text-center py-12"><div class="animate-spin text-4xl mb-4">🤖</div> <h3 class="text-lg font-semibold mb-2">Analyzing your request...</h3> <p class="text-text-muted">This may take a few seconds</p></div>`);
      } else if (state.type === "review") {
        $$renderer2.push("<!--[3-->");
        const response = state.response;
        const originalExerciseCount = currentPlan.length;
        const newExerciseCount = response.newPlan.length;
        $$renderer2.push(`<div class="space-y-4"><div class="bg-primary/10 border border-primary/30 rounded-xl p-4"><h3 class="font-semibold text-primary mb-1">Summary</h3> <p>${escape_html(response.summary)}</p></div> `);
        if (newExerciseCount < originalExerciseCount) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="bg-danger/10 border border-danger/30 rounded-xl p-4"><h3 class="font-semibold text-danger mb-1">⚠️ Incomplete Plan</h3> <p class="text-sm">The AI returned only ${escape_html(newExerciseCount)} exercise${escape_html(newExerciseCount === 1 ? "" : "s")} 
                  (you had ${escape_html(originalExerciseCount)}). <strong>This may not be what you want.</strong></p> <button class="mt-2 text-sm text-primary hover:underline">Ask AI to include all exercises →</button></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (response.warnings.length > 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="bg-warning/10 border border-warning/30 rounded-xl p-4"><h3 class="font-semibold text-warning mb-1">⚠️ Warnings</h3> <ul class="list-disc list-inside text-sm space-y-1"><!--[-->`);
          const each_array_4 = ensure_array_like(response.warnings);
          for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
            let warning = each_array_4[$$index_4];
            $$renderer2.push(`<li>${escape_html(warning)}</li>`);
          }
          $$renderer2.push(`<!--]--></ul></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (response.changes.length > 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div><h3 class="font-semibold mb-2">Changes Made</h3> <div class="space-y-2"><!--[-->`);
          const each_array_5 = ensure_array_like(response.changes);
          for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
            let change = each_array_5[$$index_5];
            $$renderer2.push(`<div class="bg-surface-light rounded-lg p-3 text-sm"><span class="font-medium">${escape_html(formatChangeType(change.type))}:</span> `);
            if (change.originalExerciseId) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<span class="line-through text-text-muted">${escape_html(getExerciseName(change.originalExerciseId))}</span> `);
              if (change.newExerciseId) {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<span class="mx-1">→</span> <span class="text-success">${escape_html(getExerciseName(change.newExerciseId))}</span>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]-->`);
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`${escape_html(change.reason)}`);
            }
            $$renderer2.push(`<!--]--></div>`);
          }
          $$renderer2.push(`<!--]--></div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div><h3 class="font-semibold mb-2">New Workout Plan</h3> <div class="space-y-2"><!--[-->`);
        const each_array_6 = ensure_array_like(response.newPlan);
        for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
          let exercise = each_array_6[$$index_6];
          const exerciseData = getExerciseById(exercise.exerciseId);
          $$renderer2.push(`<div class="bg-surface-light rounded-lg p-3 flex justify-between items-center"><div><div class="font-medium">${escape_html(exerciseData?.name || exercise.exerciseId)}</div> <div class="text-sm text-text-muted">${escape_html(exercise.sets)} sets × ${escape_html(exercise.reps)} reps `);
          if (exercise.weight > 0) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`@ ${escape_html(exercise.weight)}kg`);
          } else if (exercise.timeSeconds) {
            $$renderer2.push("<!--[1-->");
            $$renderer2.push(`@ ${escape_html(exercise.timeSeconds)}s hold`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`(bodyweight)`);
          }
          $$renderer2.push(`<!--]--></div></div> `);
          if (exerciseData) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span class="text-xs px-2 py-1 bg-surface rounded text-text-muted">${escape_html(exerciseData.category)}</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></div></div> <div class="space-y-2 pt-2"><button class="w-full bg-primary hover:bg-primary-dark p-4 rounded-xl font-semibold">✓ Looks Good - Start Modified Workout</button> <div class="flex gap-2"><button class="flex-1 bg-surface-light hover:bg-surface-light/80 p-3 rounded-xl">Add Details...</button> <button class="flex-1 bg-surface-light hover:bg-surface-light/80 p-3 rounded-xl text-text-muted">Start Over</button></div></div></div>`);
      } else if (state.type === "refinement") {
        $$renderer2.push("<!--[4-->");
        $$renderer2.push(`<div class="mb-4"><button class="text-sm text-text-muted hover:text-text flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Back to Review</button></div> <p class="text-text-muted mb-3">What would you like to change?</p> <textarea class="w-full h-32 bg-surface-light rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g., Can you make the leg exercises lighter? I want to save energy for upper body."></textarea>`);
      } else if (state.type === "fallback") {
        $$renderer2.push("<!--[5-->");
        $$renderer2.push(`<div class="text-center mb-4"><div class="text-3xl mb-2">🛠️</div> <h3 class="font-semibold">AI Response Issue</h3> `);
        if (state.error) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="bg-danger/10 border border-danger/30 rounded-xl p-3 mt-2 mb-2"><p class="text-sm text-danger">${escape_html(state.error)}</p></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<p class="text-sm text-text-muted">Here are some manual options:</p>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="space-y-2"><!--[-->`);
        const each_array_7 = ensure_array_like(state.options);
        for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
          let option = each_array_7[$$index_7];
          $$renderer2.push(`<button class="w-full p-3 bg-surface-light hover:bg-surface-light/80 rounded-xl text-left"><div class="font-medium">${escape_html(option.name)}</div> <div class="text-sm text-text-muted">${escape_html(option.description)}</div></button>`);
        }
        $$renderer2.push(`<!--]--></div> <button class="w-full mt-4 p-3 text-text-muted hover:text-text">Back to Quick Options</button>`);
      } else if (state.type === "error") {
        $$renderer2.push("<!--[6-->");
        $$renderer2.push(`<div class="text-center py-8"><div class="text-4xl mb-4">❌</div> <h3 class="text-lg font-semibold mb-2">Something went wrong</h3> <p class="text-text-muted mb-4">${escape_html(state.error)}</p> `);
        if (state.canRetry) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<button class="bg-primary hover:bg-primary-dark px-6 py-3 rounded-xl font-semibold">Try Again</button>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<button class="bg-primary hover:bg-primary-dark px-6 py-3 rounded-xl font-semibold">Go to Settings</button>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, {
      isOpen,
      currentPlan,
      completedSets,
      availableEquipment,
      userExerciseSettings,
      onConfirm,
      onCancel
    });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let exerciseSets, currentExerciseSetIndex, currentSet, currentExercise;
    const defaultWeights = {
      squat: {
        currentWeight: 80,
        weightUnit: "kg",
        successCount: 0,
        failureCount: 0,
        incrementKg: 2.5,
        deloadAfterFailures: 3,
        deloadPercent: 0.1
      },
      "bench-press": {
        currentWeight: 60,
        weightUnit: "kg",
        successCount: 0,
        failureCount: 0,
        incrementKg: 2.5,
        deloadAfterFailures: 3,
        deloadPercent: 0.1
      },
      "barbell-row": {
        currentWeight: 55,
        weightUnit: "kg",
        successCount: 0,
        failureCount: 0,
        incrementKg: 2.5,
        deloadAfterFailures: 3,
        deloadPercent: 0.1
      },
      "overhead-press": {
        currentWeight: 40,
        weightUnit: "kg",
        successCount: 0,
        failureCount: 0,
        incrementKg: 1.25,
        deloadAfterFailures: 3,
        deloadPercent: 0.1
      },
      deadlift: {
        currentWeight: 100,
        weightUnit: "kg",
        successCount: 0,
        failureCount: 0,
        incrementKg: 5,
        deloadAfterFailures: 3,
        deloadPercent: 0.1
      },
      "pull-up": {
        currentWeight: 0,
        weightUnit: "kg",
        successCount: 0,
        failureCount: 0,
        incrementKg: 2.5,
        deloadAfterFailures: 3,
        deloadPercent: 0.1,
        useBodyweightProgression: true,
        targetReps: 8,
        incrementReps: 1
      },
      "hanging-knee-raise": {
        currentWeight: 0,
        weightUnit: "kg",
        successCount: 0,
        failureCount: 0,
        incrementKg: 2.5,
        deloadAfterFailures: 3,
        deloadPercent: 0.1,
        useBodyweightProgression: true,
        targetReps: 10,
        incrementReps: 2
      }
    };
    let plan = [];
    let sets = [];
    let userEquipment = ["barbell", "squat-rack", "bench", "pull-up-bar"];
    let userExerciseWeights = {};
    let showModificationModal = false;
    onDestroy(() => {
      navVisibilityStore.set({ hideMainNav: false });
    });
    function handleModificationConfirm(response) {
      if (!response.newPlan || response.newPlan.length === 0) {
        console.error("AI returned empty plan");
        alert("Error: AI returned an empty workout plan. Please try again.");
        return;
      }
      console.log("Applying modification:", response.summary);
      console.log("New plan:", response.newPlan);
      console.log("Changes:", response.changes);
      plan = response.newPlan;
      const completedExerciseIds = new Set(sets.filter((s) => s.completedReps !== void 0 || s.completedTimeSeconds !== void 0).map((s) => s.exerciseId));
      console.log("Completed exercises:", Array.from(completedExerciseIds));
      let newSets = [];
      for (const exercise of plan) {
        const exerciseData = getExerciseById(exercise.exerciseId);
        const timeSeconds = exerciseData?.isTimeBased ? exercise.timeSeconds || exerciseData?.defaultTimeSeconds || 60 : void 0;
        if (completedExerciseIds.has(exercise.exerciseId)) {
          const existingSets = sets.filter((s) => s.exerciseId === exercise.exerciseId);
          console.log(`Keeping ${existingSets.length} existing sets for ${exercise.exerciseId}`);
          newSets = [...newSets, ...existingSets];
        } else {
          console.log(`Generating new sets for ${exercise.exerciseId}: ${exercise.sets}x${exercise.reps} @ ${exercise.weight}kg`);
          const exerciseSets2 = generateAllSets(exercise.exerciseId, exercise.sets, exercise.reps, exercise.weight, timeSeconds);
          newSets = [...newSets, ...exerciseSets2];
        }
      }
      console.log(`Total new sets: ${newSets.length}`);
      sets = newSets;
      response.summary;
      showModificationModal = false;
    }
    function handleModificationCancel() {
      showModificationModal = false;
    }
    exerciseSets = [];
    currentExerciseSetIndex = exerciseSets.findIndex((s) => s.completedReps === void 0 && s.completedTimeSeconds === void 0);
    currentSet = currentExerciseSetIndex >= 0 ? exerciseSets[currentExerciseSetIndex] : null;
    currentExercise = currentSet ? getExerciseById(currentSet.exerciseId) : null;
    currentExercise?.supportsBodyweightProgression && defaultWeights[currentExercise.id]?.useBodyweightProgression;
    head("1iztl5s", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Workout - LiftLog</title>`);
      });
    });
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="min-h-screen flex items-center justify-center"><div class="text-center"><div class="animate-spin text-4xl mb-4">⏳</div> <p>Loading workout...</p></div></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    WorkoutModificationModal($$renderer2, {
      isOpen: showModificationModal,
      currentPlan: plan,
      completedSets: sets,
      availableEquipment: userEquipment,
      userExerciseSettings: userExerciseWeights,
      onConfirm: handleModificationConfirm,
      onCancel: handleModificationCancel
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
