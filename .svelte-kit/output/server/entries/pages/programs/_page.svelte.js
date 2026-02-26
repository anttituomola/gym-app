import { a as store_get, h as head, f as ensure_array_like, b as attr_class, d as stringify, e as escape_html, u as unsubscribe_stores } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import { a as authStore, c as convex, b as api } from "../../../chunks/convex.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let programs = [];
    let loading = true;
    let showErrorModal = false;
    let errorMessage = "";
    async function loadPrograms() {
      if (!store_get($$store_subs ??= {}, "$authStore", authStore).userId) return;
      loading = true;
      try {
        const data = await convex.query(api.programs.list, {
          userId: store_get($$store_subs ??= {}, "$authStore", authStore).userId
        });
        programs = data.map((p) => ({
          id: p._id,
          name: p.name,
          description: p.description,
          createdAt: p._creationTime,
          updatedAt: p._creationTime,
          workouts: p.workouts,
          isActive: p.isActive
        }));
      } catch (err) {
        console.error("Failed to load programs:", err);
        showError("Failed to load programs");
      } finally {
        loading = false;
      }
    }
    function showError(message) {
      errorMessage = message;
      showErrorModal = true;
    }
    function formatDate(timestamp) {
      return new Date(timestamp).toLocaleDateString();
    }
    if (store_get($$store_subs ??= {}, "$authStore", authStore).userId && loading) {
      loadPrograms();
    } else if (!store_get($$store_subs ??= {}, "$authStore", authStore).isLoading && loading) {
      loading = false;
    }
    head("19bqm8i", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Programs - LiftLog</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex flex-col"><header class="bg-surface p-4 border-b border-surface-light"><div class="flex items-center justify-between"><button class="text-text-muted hover:text-text flex items-center gap-1"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> <span class="text-sm">Back</span></button> <h1 class="text-xl font-bold">Training Programs</h1> <div class="w-16"></div></div></header> <main class="flex-1 p-4 pb-24"><button class="w-full bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 mb-6 flex items-center justify-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> <span class="font-semibold">Create New Program</span></button> `);
    if (loading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="text-center py-12"><div class="animate-spin text-4xl mb-4">⏳</div> <p class="text-text-muted">Loading...</p></div>`);
    } else if (!store_get($$store_subs ??= {}, "$authStore", authStore).userId) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="text-center py-12"><div class="text-6xl mb-4">🔒</div> <h2 class="text-lg font-semibold mb-2">Login Required</h2> <p class="text-text-muted mb-6">Please log in to manage your training programs</p> <a href="/login" class="inline-block bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl px-6 py-3 font-semibold">Go to Login</a></div>`);
    } else if (programs.length === 0) {
      $$renderer2.push("<!--[2-->");
      $$renderer2.push(`<div class="text-center py-12"><div class="text-6xl mb-4">📋</div> <h2 class="text-lg font-semibold mb-2">No Programs Yet</h2> <p class="text-text-muted mb-6">Create your first training program to get started</p> <button class="bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl px-6 py-3">Create Program</button></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="space-y-3"><!--[-->`);
      const each_array = ensure_array_like(programs);
      for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
        let program = each_array[$$index_1];
        $$renderer2.push(`<div${attr_class(`bg-surface rounded-xl p-4 ${stringify(program.isActive ? "ring-2 ring-primary" : "")}`)}><div class="flex items-start justify-between mb-3"><div><h3 class="font-semibold text-lg">${escape_html(program.name)}</h3> `);
        if (program.description) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-text-muted text-sm">${escape_html(program.description)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <p class="text-text-muted text-xs mt-1">${escape_html(program.workouts.length)} workout${escape_html(program.workouts.length !== 1 ? "s" : "")} • 
                  Created ${escape_html(formatDate(program.createdAt))}</p></div> `);
        if (program.isActive) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">Active</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="flex flex-wrap gap-2 mb-4"><!--[-->`);
        const each_array_1 = ensure_array_like(program.workouts);
        for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
          let workout = each_array_1[$$index];
          $$renderer2.push(`<span class="px-2 py-1 bg-surface-light rounded-lg text-xs">${escape_html(workout.name)}: ${escape_html(workout.exercises.length)} exercises</span>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="flex gap-2"><button class="flex-1 bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-lg py-2 text-sm">Edit</button> `);
        if (program.isActive) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<button class="flex-1 bg-primary/20 hover:bg-primary/30 text-primary active:scale-95 transition-all rounded-lg py-2 text-sm font-medium">Deactivate</button>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<button class="flex-1 bg-primary/20 hover:bg-primary/30 text-primary active:scale-95 transition-all rounded-lg py-2 text-sm font-medium">Activate</button>`);
        }
        $$renderer2.push(`<!--]--> <button class="px-3 py-2 text-danger hover:bg-danger/10 rounded-lg transition-colors" aria-label="Delete"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></main></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showErrorModal) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0"><div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation"><h3 class="text-xl font-bold mb-2">Error</h3> <p class="text-text-muted mb-6">${escape_html(errorMessage)}</p> <button class="w-full px-4 py-3 bg-primary hover:bg-primary-dark rounded-xl font-medium">OK</button></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
