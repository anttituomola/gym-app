import { j as bind_props, b as attr_class, d as stringify, a as store_get, e as escape_html, i as attr, u as unsubscribe_stores, h as head, f as ensure_array_like } from "../../../chunks/index2.js";
import { E as EXERCISES } from "../../../chunks/exercises.js";
import { a as aiAvailable, b as aiSettingsStore } from "../../../chunks/aiSettings.js";
import { a as authStore, c as convex, b as api } from "../../../chunks/convex.js";
const EQUIPMENT_LIST = [
  "barbell",
  "squat-rack",
  "bench",
  "dumbbells",
  "cable-machine",
  "leg-press",
  "pull-up-bar",
  "kettlebells",
  "resistance-bands"
];
function ImportStronglifts($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let onImport = $$props["onImport"];
    $$renderer2.push(`<div class="bg-surface rounded-xl p-4"><h3 class="text-lg font-semibold mb-3">Import from Stronglifts</h3> `);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<input type="file" accept=".csv" class="hidden" id="stronglifts-file"/> <label for="stronglifts-file" class="block w-full p-4 border-2 border-dashed border-surface-light rounded-xl text-center cursor-pointer hover:border-primary hover:bg-surface-light/50 transition-all">`);
      {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="text-3xl mb-2">📁</div> <p class="font-medium">Tap to select Stronglifts CSV</p> <p class="text-sm text-text-muted mt-1">Export from Stronglifts app</p>`);
      }
      $$renderer2.push(`<!--]--></label> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { onImport });
  });
}
function AiSettingsForm($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let apiKey = "";
    let isTesting = false;
    let isSaving = false;
    $$renderer2.push(`<div class="bg-surface rounded-xl p-4"><div class="flex items-center justify-between mb-3"><div class="flex items-center gap-2"><h2 class="text-lg font-semibold">AI Workout Modifications</h2> <span${attr_class(`text-xs px-2 py-0.5 rounded-full ${stringify(store_get($$store_subs ??= {}, "$aiAvailable", aiAvailable) ? "bg-success/20 text-success" : "bg-text-muted/20 text-text-muted")}`)}>${escape_html(store_get($$store_subs ??= {}, "$aiAvailable", aiAvailable) ? "Active" : "Inactive")}</span></div> `);
    if (store_get($$store_subs ??= {}, "$aiSettingsStore", aiSettingsStore).hasToken) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button${attr_class(`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${stringify(store_get($$store_subs ??= {}, "$aiSettingsStore", aiSettingsStore).enabled ? "bg-primary" : "bg-surface-light")}`)} aria-label="Toggle AI"><span${attr_class(`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stringify(store_get($$store_subs ??= {}, "$aiSettingsStore", aiSettingsStore).enabled ? "translate-x-6" : "translate-x-1")}`)}></span></button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <p class="text-sm text-text-muted mb-4">Use AI to modify workouts on the fly. Your API key is stored locally in your browser and never sent to our servers.</p> `);
    if (!store_get($$store_subs ??= {}, "$aiSettingsStore", aiSettingsStore).hasToken) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-surface-light rounded-xl p-4 space-y-4"><div><label class="text-sm font-medium mb-2 block">AI Provider</label> <div class="flex gap-2"><button${attr_class(`flex-1 p-3 rounded-xl border-2 transition-all ${stringify(
        "border-primary bg-primary/10"
      )}`)}><div class="font-semibold">OpenAI</div> <div class="text-xs text-text-muted">GPT-4o Mini</div></button> <button${attr_class(`flex-1 p-3 rounded-xl border-2 transition-all ${stringify("border-surface-light hover:border-text-muted")}`)}><div class="font-semibold">Anthropic</div> <div class="text-xs text-text-muted">Claude 3 Haiku</div></button></div></div> <div><label class="text-sm font-medium mb-2 block">API Key</label> <div class="relative"><input${attr("type", "password")}${attr("value", apiKey)}${attr("placeholder", "sk-...")} class="w-full bg-bg rounded-xl px-4 py-3 pr-10"/> <button class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"${attr("aria-label", "Show key")}>`);
      {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`);
      }
      $$renderer2.push(`<!--]--></button></div> <p class="text-xs text-text-muted mt-1">Your key is stored locally in your browser's localStorage.</p></div> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div class="flex gap-2"><button${attr("disabled", !apiKey.trim() || isTesting, true)} class="flex-1 py-3 bg-surface-light hover:bg-surface-light/80 disabled:opacity-50 rounded-xl font-medium">${escape_html("Test Connection")}</button> <button${attr("disabled", !apiKey.trim() || isSaving, true)} class="flex-1 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 rounded-xl font-semibold">${escape_html("Save Key")}</button></div></div> <div class="mt-4 text-sm text-text-muted space-y-1"><p>Don't have an API key? `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" class="text-primary hover:underline">Get one from OpenAI →</a>`);
      }
      $$renderer2.push(`<!--]--></p> <p class="text-xs">Costs approximately $0.01-0.02 per workout modification.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="bg-success/10 border border-success/30 rounded-xl p-4"><div class="flex items-center gap-2 mb-2"><span class="text-success">✓</span> <span class="font-semibold">API Key Configured</span></div> <p class="text-sm text-text-muted mb-3">Provider: ${escape_html(store_get($$store_subs ??= {}, "$aiSettingsStore", aiSettingsStore).provider === "openai" ? "OpenAI" : "Anthropic")} <br/> Status: ${escape_html(store_get($$store_subs ??= {}, "$aiSettingsStore", aiSettingsStore).enabled ? "Enabled" : "Disabled")}</p> <button class="text-sm text-danger hover:underline">Remove API Key</button></div> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let profile = null;
    let loading = true;
    let exerciseSettings = {};
    let selectedEquipment = [];
    let editingExercise = null;
    let editingIncrement = null;
    let importStatus = "idle";
    let importMessage = "";
    async function loadProfile() {
      if (!store_get($$store_subs ??= {}, "$authStore", authStore).userId) return;
      try {
        profile = await convex.query(api.userProfiles.get, {
          userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId
        });
        if (!profile) {
          profile = await convex.mutation(api.userProfiles.getOrCreate, {
            userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId
          });
          profile = await convex.query(api.userProfiles.get, {
            userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId
          });
        }
        if (profile) {
          exerciseSettings = profile.exercises || {};
          selectedEquipment = profile.gymEquipment || [];
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        loading = false;
      }
    }
    function formatEquipmentName(name) {
      return name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    async function handleImport(data) {
      if (!store_get($$store_subs ??= {}, "$authStore", authStore).userId) return;
      try {
        for (const [exerciseId, weightData] of Object.entries(data.currentWeights)) {
          await convex.mutation(api.userProfiles.updateExercise, {
            userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId,
            exerciseId,
            settings: { currentWeight: weightData.weight }
          });
        }
        await convex.mutation(api.import.importWorkouts, {
          userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId,
          workouts: data.workouts,
          currentWeights: data.currentWeights
        });
        importStatus = "success";
        importMessage = `Imported ${data.workouts.length} workouts with ${Object.keys(data.currentWeights).length} exercises`;
        await loadProfile();
      } catch (err) {
        importStatus = "error";
        importMessage = err instanceof Error ? err.message : "Import failed";
        console.error("Import error:", err);
      }
    }
    if (store_get($$store_subs ??= {}, "$authStore", authStore).userId && loading) {
      loadProfile();
    }
    head("1i19ct2", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Settings - LiftLog</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex flex-col"><header class="p-4 bg-surface border-b border-surface-light"><h1 class="text-xl font-bold">Settings</h1></header> <main class="flex-1 p-4 space-y-4 pb-24">`);
    AiSettingsForm($$renderer2);
    $$renderer2.push(`<!----> `);
    ImportStronglifts($$renderer2, { onImport: handleImport });
    $$renderer2.push(`<!----> `);
    if (importStatus === "success") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-success/20 text-success rounded-xl p-3 text-sm">${escape_html(importMessage)}</div>`);
    } else if (importStatus === "error") {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="bg-danger/20 text-danger rounded-xl p-3 text-sm">${escape_html(importMessage)}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <section class="bg-surface rounded-xl p-4"><h2 class="text-lg font-semibold mb-3">Exercise Settings</h2> <div class="space-y-3"><!--[-->`);
    const each_array = ensure_array_like(EXERCISES.filter((e) => e.supportsBodyweightProgression));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let exercise = each_array[$$index];
      const settings = exerciseSettings[exercise.id];
      const useBodyweight = settings?.useBodyweightProgression !== false;
      $$renderer2.push(`<div class="py-3 border-b border-surface-light last:border-0"><div class="font-medium mb-2">${escape_html(exercise.name)}</div> <div class="flex items-center gap-2 mb-3"><span class="text-sm text-text-muted">Progression:</span> <div class="flex bg-surface-light rounded-lg p-1"><button${attr_class(`px-3 py-1 text-sm rounded-md transition-all ${stringify(useBodyweight ? "bg-primary text-white" : "text-text-muted")}`)}>Bodyweight</button> <button${attr_class(`px-3 py-1 text-sm rounded-md transition-all ${stringify(!useBodyweight ? "bg-primary text-white" : "text-text-muted")}`)}>Added Weight</button></div></div> `);
      if (useBodyweight) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="flex items-center justify-between mb-2"><div class="text-sm text-text-muted">Target Reps</div> `);
        if (editingExercise === exercise.id) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex items-center gap-2"><input type="number"${attr("value", settings?.targetReps || exercise.defaultReps || 10)} class="w-20 bg-bg rounded-lg px-2 py-1 text-right" step="1" autofocus=""/> <span class="text-sm">reps</span></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<button class="text-right px-3 py-1 bg-surface-light rounded-lg"><span class="font-semibold">${escape_html(settings?.targetReps || exercise.defaultReps || 10)}</span> <span class="text-sm text-text-muted">reps</span></button>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="flex items-center justify-between"><div class="text-sm text-text-muted">Progression</div> `);
        if (editingIncrement === exercise.id) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex items-center gap-2"><span class="text-sm text-text-muted">+</span> <input type="number"${attr("value", settings?.incrementReps || exercise.defaultIncrementReps || 1)} class="w-16 bg-bg rounded-lg px-2 py-1 text-right" step="1" min="1" max="5" autofocus=""/> <span class="text-sm">reps on success</span></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<button class="text-right px-3 py-1 bg-surface-light rounded-lg"><span class="text-sm text-text-muted">+</span> <span class="font-semibold">${escape_html(settings?.incrementReps || exercise.defaultIncrementReps || 1)}</span> <span class="text-sm text-text-muted">reps on success</span></button>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="flex items-center justify-between"><div class="text-sm text-text-muted">Current Weight</div> `);
        if (editingExercise === exercise.id) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex items-center gap-2"><input type="number"${attr("value", settings?.currentWeight || 0)} class="w-20 bg-bg rounded-lg px-2 py-1 text-right" step="1.25" autofocus=""/> <span class="text-sm">kg</span></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<button class="text-right px-3 py-1 bg-surface-light rounded-lg"><span class="font-semibold">${escape_html(settings?.currentWeight || 0)}</span> <span class="text-sm text-text-muted">kg</span></button>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> <section class="bg-surface rounded-xl p-4"><h2 class="text-lg font-semibold mb-3">Standard Exercise Weights</h2> <div class="space-y-2"><!--[-->`);
    const each_array_1 = ensure_array_like(EXERCISES.slice(0, 5));
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let exercise = each_array_1[$$index_1];
      const settings = exerciseSettings[exercise.id];
      $$renderer2.push(`<div class="flex items-center justify-between py-2 border-b border-surface-light last:border-0"><div><div class="font-medium">${escape_html(exercise.name)}</div> <div class="text-xs text-text-muted">+${escape_html(settings?.incrementKg || 2.5)}kg on success</div></div> `);
      if (editingExercise === exercise.id) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="flex items-center gap-2"><input type="number"${attr("value", settings?.currentWeight || 20)} class="w-20 bg-bg rounded-lg px-2 py-1 text-right" step="1.25" autofocus=""/> <span class="text-sm">kg</span></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<button class="text-right px-3 py-1 bg-surface-light rounded-lg"><span class="font-semibold">${escape_html(settings?.currentWeight || 20)}</span> <span class="text-sm text-text-muted">kg</span></button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> <section class="bg-surface rounded-xl p-4"><div class="flex items-center justify-between mb-3"><h2 class="text-lg font-semibold">Available Equipment</h2> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <p class="text-sm text-text-muted mb-3">Select what you have access to</p> <div class="grid grid-cols-2 gap-2"><!--[-->`);
    const each_array_2 = ensure_array_like(EQUIPMENT_LIST);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let equipment = each_array_2[$$index_2];
      $$renderer2.push(`<button${attr_class(`p-3 rounded-xl text-left transition-all ${stringify(selectedEquipment.includes(equipment) ? "bg-primary text-white" : "bg-surface-light text-text hover:bg-surface-light/80")}`)}><div class="flex items-center gap-2"><span class="text-lg">${escape_html(selectedEquipment.includes(equipment) ? "✓" : "○")}</span> <span class="text-sm">${escape_html(formatEquipmentName(equipment))}</span></div></button>`);
    }
    $$renderer2.push(`<!--]--></div></section> <section class="bg-surface rounded-xl p-4"><h2 class="text-lg font-semibold mb-3">About</h2> <div class="text-sm text-text-muted space-y-1"><p>LiftLog v0.1</p> <p>Personal gym training log</p> `);
    if (store_get($$store_subs ??= {}, "$authStore", authStore).userId) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-xs mt-2">User: ${escape_html(store_get($$store_subs ??= {}, "$authStore", authStore).userId.slice(0, 8))}...</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></section></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
