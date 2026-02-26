import { h as head, i as attr, e as escape_html, f as ensure_array_like, b as attr_class, d as stringify } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import { E as EXERCISES } from "../../../../chunks/exercises.js";
import "../../../../chunks/convex.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let programName = "";
    let programDescription = "";
    let workouts = [];
    let userExercises = {};
    let activeTab = 0;
    let saving = false;
    function getExerciseName(exerciseId) {
      return EXERCISES.find((e) => e.id === exerciseId)?.name || exerciseId;
    }
    function getExercise(exerciseId) {
      return EXERCISES.find((e) => e.id === exerciseId);
    }
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    EXERCISES.reduce(
      (acc, ex) => {
        if (!acc[ex.category]) acc[ex.category] = [];
        acc[ex.category].push(ex);
        return acc;
      },
      {}
    );
    head("xhsq0q", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Program Builder - LiftLog</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex flex-col"><header class="bg-surface p-4 border-b border-surface-light"><div class="flex items-center justify-between"><button class="text-text-muted hover:text-text flex items-center gap-1"${attr("disabled", saving, true)}><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> <span class="text-sm">Cancel</span></button> <h1 class="text-xl font-bold">Program Builder</h1> <button${attr("disabled", saving, true)} class="text-primary hover:text-primary-dark font-medium text-sm disabled:opacity-50">${escape_html("Save")}</button></div></header> <main class="flex-1 p-4 pb-40 overflow-y-auto"><section class="bg-surface rounded-xl p-4 mb-6"><h2 class="font-semibold mb-3">Program Details</h2> <div class="space-y-3"><div><label for="program-name" class="block text-sm text-text-muted mb-1">Name *</label> <input id="program-name" type="text"${attr("value", programName)} placeholder="e.g., Stronglifts 5x5"${attr("disabled", saving, true)} class="w-full bg-surface-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"/></div> <div><label for="program-description" class="block text-sm text-text-muted mb-1">Description (optional)</label> <textarea id="program-description" placeholder="Brief description of the program..." rows="2"${attr("disabled", saving, true)} class="w-full bg-surface-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50">`);
    const $$body = escape_html(programDescription);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></div></div></section> <section class="mb-4"><div class="flex items-center gap-2 overflow-x-auto pb-2"><!--[-->`);
    const each_array = ensure_array_like(workouts);
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      let workout = each_array[index];
      $$renderer2.push(`<button${attr("disabled", saving, true)}${attr_class(`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${stringify(activeTab === index ? "bg-primary text-white" : "bg-surface text-text-muted hover:text-text")} disabled:opacity-50`)}>${escape_html(workout.name)}</button>`);
    }
    $$renderer2.push(`<!--]--> <button type="button"${attr("disabled", saving, true)} class="px-4 py-2.5 rounded-lg bg-surface text-text-muted hover:text-text hover:bg-surface-light transition-colors disabled:opacity-50 flex items-center gap-2 font-medium min-h-[44px] select-none whitespace-nowrap"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg> <span class="hidden sm:inline">Add</span></button></div></section> `);
    if (workouts[activeTab]) {
      $$renderer2.push("<!--[-->");
      const workout = workouts[activeTab];
      $$renderer2.push(`<section class="space-y-4"><div class="bg-surface rounded-xl p-4"><div class="flex items-center gap-3 mb-3"><input type="text"${attr("value", workout.name)}${attr("disabled", saving, true)} class="flex-1 bg-surface-light rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"/> `);
      if (workouts.length > 1) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<button${attr("disabled", saving, true)} class="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50" aria-label="Remove workout"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> <div><label for="rest-between-sets" class="block text-sm text-text-muted mb-1">Rest between sets</label> <div class="flex items-center gap-2"><input id="rest-between-sets" type="range" min="30" max="600" step="30"${attr("value", workout.restBetweenSets)}${attr("disabled", saving, true)} class="flex-1 disabled:opacity-50"/> <span class="text-sm font-mono w-16 text-right">${escape_html(formatTime(workout.restBetweenSets))}</span></div></div></div> <div class="space-y-3"><!--[-->`);
      const each_array_1 = ensure_array_like(workout.exercises);
      for (let exerciseIndex = 0, $$length = each_array_1.length; exerciseIndex < $$length; exerciseIndex++) {
        let exercise = each_array_1[exerciseIndex];
        const exerciseData = getExercise(exercise.exerciseId);
        $$renderer2.push(`<div class="bg-surface rounded-xl p-4"><div class="flex items-start justify-between mb-3"><div><h4 class="font-medium">${escape_html(getExerciseName(exercise.exerciseId))}</h4> `);
        if (exerciseData) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-xs text-text-muted">${escape_html(exerciseData.category)} • ${escape_html(exerciseData.equipment.join(", "))}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="flex gap-1"><button${attr("disabled", exerciseIndex === 0, true)} class="p-1.5 text-text-muted hover:text-text hover:bg-surface-light rounded-lg transition-colors disabled:opacity-30" aria-label="Move exercise up"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg></button> <button${attr("disabled", exerciseIndex === workout.exercises.length - 1, true)} class="p-1.5 text-text-muted hover:text-text hover:bg-surface-light rounded-lg transition-colors disabled:opacity-30" aria-label="Move exercise down"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button> <button${attr("disabled", saving, true)} class="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50" aria-label="Remove exercise"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div></div> `);
        if (exerciseData?.supportsBodyweightProgression) {
          $$renderer2.push("<!--[-->");
          const useBodyweight = userExercises[exercise.exerciseId]?.useBodyweightProgression !== false;
          $$renderer2.push(`<div class="flex items-center gap-2 mb-3"><span class="text-xs text-text-muted">Progression:</span> <div class="flex bg-surface-light rounded-lg p-0.5 flex-1"><button type="button"${attr("disabled", saving, true)}${attr_class(`flex-1 px-2 py-1 text-xs rounded-md transition-all ${stringify(useBodyweight ? "bg-primary text-white" : "text-text-muted")}`)}>Bodyweight</button> <button type="button"${attr("disabled", saving, true)}${attr_class(`flex-1 px-2 py-1 text-xs rounded-md transition-all ${stringify(!useBodyweight ? "bg-primary text-white" : "text-text-muted")}`)}>Added Weight</button></div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="grid grid-cols-3 gap-3 mb-3"><div><label${attr("for", `sets-${stringify(activeTab + "-" + exerciseIndex)}`)} class="block text-xs text-text-muted mb-1">Sets</label> <input${attr("id", `sets-${stringify(activeTab + "-" + exerciseIndex)}`)} type="number" min="1" max="20"${attr("value", exercise.sets)}${attr("disabled", saving, true)} class="w-full bg-surface-light rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"/></div> `);
        if (exerciseData?.supportsBodyweightProgression && userExercises[exercise.exerciseId]?.useBodyweightProgression !== false) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div><label${attr("for", `reps-${stringify(activeTab + "-" + exerciseIndex)}`)} class="block text-xs text-text-muted mb-1">Reps</label> <input${attr("id", `reps-${stringify(activeTab + "-" + exerciseIndex)}`)} type="number" min="1" max="100"${attr("value", userExercises[exercise.exerciseId]?.targetReps || exerciseData?.defaultReps || 10)}${attr("disabled", true, true)} class="w-full bg-surface-light/50 rounded-lg px-2 py-1.5 text-sm text-center disabled:opacity-70"/></div> <div><span class="block text-xs text-text-muted mb-1">Weight</span> <div class="w-full bg-surface-light/50 rounded-lg px-2 py-1.5 text-sm text-center text-text-muted">Bodyweight</div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div><label${attr("for", `reps-${stringify(activeTab + "-" + exerciseIndex)}`)} class="block text-xs text-text-muted mb-1">Reps</label> <input${attr("id", `reps-${stringify(activeTab + "-" + exerciseIndex)}`)} type="number" min="1" max="100"${attr("value", exercise.reps)}${attr("disabled", saving, true)} class="w-full bg-surface-light rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"/></div> <div><label${attr("for", `weight-${stringify(activeTab + "-" + exerciseIndex)}`)} class="block text-xs text-text-muted mb-1">Start Wt (kg)</label> <input${attr("id", `weight-${stringify(activeTab + "-" + exerciseIndex)}`)} type="number" min="0" step="0.5"${attr("value", exercise.startingWeight)}${attr("disabled", saving, true)} class="w-full bg-surface-light rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"/></div>`);
        }
        $$renderer2.push(`<!--]--></div> `);
        if (exercise.progression) {
          $$renderer2.push("<!--[-->");
          const useBodyweightProg = exerciseData?.supportsBodyweightProgression && userExercises[exercise.exerciseId]?.useBodyweightProgression !== false;
          $$renderer2.push(`<div class="bg-surface-light/50 rounded-lg p-3"><p class="text-xs text-text-muted mb-2">Progression Rules</p> <div class="grid grid-cols-3 gap-2 text-xs"><div>`);
          if (useBodyweightProg) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<label${attr("for", `increment-${stringify(activeTab + "-" + exerciseIndex)}`)} class="block text-text-muted mb-0.5">+reps</label> `);
            {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`<button type="button" class="w-full bg-surface rounded px-2 py-1 text-center text-sm">+${escape_html(userExercises[exercise.exerciseId]?.incrementReps || exerciseData?.defaultIncrementReps || 1)}</button>`);
            }
            $$renderer2.push(`<!--]-->`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<label${attr("for", `increment-${stringify(activeTab + "-" + exerciseIndex)}`)} class="block text-text-muted mb-0.5">+kg</label> <input${attr("id", `increment-${stringify(activeTab + "-" + exerciseIndex)}`)} type="number" min="0" step="0.5"${attr("value", exercise.progression.incrementKg)}${attr("disabled", saving, true)} class="w-full bg-surface rounded px-2 py-1 text-center disabled:opacity-50"/>`);
          }
          $$renderer2.push(`<!--]--></div> <div><label${attr("for", `deload-after-${stringify(activeTab + "-" + exerciseIndex)}`)} class="block text-text-muted mb-0.5">Deload@</label> <input${attr("id", `deload-after-${stringify(activeTab + "-" + exerciseIndex)}`)} type="number" min="1" max="10"${attr("value", exercise.progression.deloadAfterFailures)}${attr("disabled", saving, true)} class="w-full bg-surface rounded px-2 py-1 text-center disabled:opacity-50"/></div> <div><label${attr("for", `deload-percent-${stringify(activeTab + "-" + exerciseIndex)}`)} class="block text-text-muted mb-0.5">Deload %</label> <input${attr("id", `deload-percent-${stringify(activeTab + "-" + exerciseIndex)}`)} type="number" min="0" max="100" step="5"${attr("value", Math.round((exercise.progression?.deloadPercent || 0.1) * 100))}${attr("disabled", saving, true)} class="w-full bg-surface rounded px-2 py-1 text-center disabled:opacity-50"/></div></div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--> <button type="button"${attr("disabled", saving, true)} class="w-full py-5 bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl text-white font-semibold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed min-h-[60px] mb-32"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg> Add Exercise</button></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></main> <footer class="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light p-4" style="z-index: 90;"><button${attr("disabled", saving, true)} class="w-full bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">${escape_html("Save Program")}</button></footer></div> `);
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
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
