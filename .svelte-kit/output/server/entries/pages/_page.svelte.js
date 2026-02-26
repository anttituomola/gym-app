import { a as store_get, h as head, f as ensure_array_like, e as escape_html, u as unsubscribe_stores } from "../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { a as authStore, c as convex, b as api } from "../../chunks/convex.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let profile = null;
    let loading = true;
    let activeProgram = null;
    async function loadData() {
      if (!store_get($$store_subs ??= {}, "$authStore", authStore).userId) return;
      try {
        profile = await convex.query(api.userProfiles.get, {
          userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId
        });
        if (!profile) {
          await convex.mutation(api.userProfiles.getOrCreate, {
            userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId
          });
          profile = await convex.query(api.userProfiles.get, {
            userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId
          });
        }
        const program = await convex.query(api.programs.getActive, {
          userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId
        });
        if (program) {
          activeProgram = {
            id: program._id,
            name: program.name,
            description: program.description,
            createdAt: program._creationTime,
            updatedAt: program._creationTime,
            workouts: program.workouts,
            isActive: program.isActive
          };
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        loading = false;
      }
    }
    let recentWorkouts = [];
    if (store_get($$store_subs ??= {}, "$authStore", authStore).userId && loading) {
      loadData();
    }
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>LiftLog</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex flex-col"><header class="p-4 bg-surface border-b border-surface-light"><h1 class="text-2xl font-bold text-center">🏋️ LiftLog</h1> <p class="text-text-muted text-sm text-center mt-1">Personal training log</p></header> <main class="flex-1 p-4 flex flex-col gap-4 pb-24"><section class="bg-surface rounded-xl p-4"><h2 class="text-lg font-semibold mb-3">Start Workout</h2> `);
    if (loading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="text-center py-8"><div class="animate-spin text-4xl mb-4">⏳</div> <p class="text-text-muted">Loading...</p></div>`);
    } else if (activeProgram) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="mb-3"><p class="text-sm text-text-muted mb-2">From: <span class="text-text font-medium">${escape_html(activeProgram.name)}</span></p> <div class="grid grid-cols-2 gap-3"><!--[-->`);
      const each_array = ensure_array_like(activeProgram.workouts);
      for (let index = 0, $$length = each_array.length; index < $$length; index++) {
        let workout = each_array[index];
        $$renderer2.push(`<button class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"><span class="text-xl">${escape_html(String.fromCharCode(65 + index))}</span> <span class="font-semibold text-sm">${escape_html(workout.name)}</span> <span class="text-xs text-white/70">${escape_html(workout.exercises.length)} exercises</span></button>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="grid grid-cols-2 gap-3 mb-3"><button class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"><span class="text-2xl">🅰️</span> <span class="font-semibold">Workout A</span> <span class="text-xs text-white/70">Squat / Bench / Row</span></button> <button class="bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 flex flex-col items-center gap-2"><span class="text-2xl">🅱️</span> <span class="font-semibold">Workout B</span> <span class="text-xs text-white/70">Squat / OHP / Deadlift</span></button></div>`);
    }
    $$renderer2.push(`<!--]--> <button class="w-full bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-sm">Custom Workout...</button> <a href="/programs" class="w-full mt-3 bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl p-3 text-sm flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg> Manage Programs</a></section> <section class="bg-surface rounded-xl p-4 flex-1"><h2 class="text-lg font-semibold mb-3">Recent Workouts</h2> `);
    if (recentWorkouts.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="text-text-muted text-center py-8"><p>No workouts yet</p> <p class="text-sm mt-1">Start your first workout above!</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="space-y-3"><!--[-->`);
      const each_array_1 = ensure_array_like(recentWorkouts);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let workout = each_array_1[$$index_1];
        $$renderer2.push(`<div class="bg-surface-light rounded-lg p-3"><div class="flex justify-between items-center"><span class="font-medium">Workout ${escape_html(workout.type || "A")}</span> <span class="text-sm text-text-muted">${escape_html(new Date(workout.startedAt).toLocaleDateString())}</span></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></section></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
