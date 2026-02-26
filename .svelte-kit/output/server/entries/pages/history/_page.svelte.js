import { h as head, f as ensure_array_like, e as escape_html } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const workouts = [];
    head("1xl2tfr", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>History - LiftLog</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex flex-col"><header class="p-4 bg-surface border-b border-surface-light"><h1 class="text-xl font-bold">Workout History</h1></header> <main class="flex-1 p-4 pb-24">`);
    if (workouts.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="text-center py-12"><div class="text-4xl mb-4">📊</div> <h2 class="text-lg font-semibold mb-2">No workouts yet</h2> <p class="text-text-muted mb-4">Complete your first workout to see history here</p> <button class="bg-primary hover:bg-primary-dark px-6 py-2 rounded-xl font-medium">Start Workout</button></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="space-y-3"><!--[-->`);
      const each_array = ensure_array_like(workouts);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let workout = each_array[$$index];
        $$renderer2.push(`<div class="bg-surface rounded-xl p-4"><div class="flex justify-between items-start mb-2"><span class="font-semibold">Workout</span> <span class="text-sm text-text-muted">${escape_html(new Date(workout.startedAt).toLocaleDateString())}</span></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></main></div>`);
  });
}
export {
  _page as default
};
