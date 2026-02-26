import { s as setContext, g as getContext, a as store_get, u as unsubscribe_stores, b as attr_class, c as slot, d as stringify } from "../../chunks/index2.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { g as goto } from "../../chunks/client.js";
import { n as navVisibilityStore, a as authStore } from "../../chunks/convex.js";
import { o as onDestroy } from "../../chunks/index-server.js";
import { QueryClient } from "@tanstack/query-core";
const _contextKey = /* @__PURE__ */ Symbol("QueryClient");
const setQueryClientContext = (client) => {
  setContext(_contextKey, client);
};
function QueryClientProvider($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { client = new QueryClient(), children } = $$props;
    setQueryClientContext(client);
    onDestroy(() => {
      client.unmount();
    });
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let currentPath, isLoginPage, hideNav;
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 1e3 * 60 * 5, refetchOnWindowFocus: false }
      }
    });
    currentPath = store_get($$store_subs ??= {}, "$page", page).url.pathname;
    isLoginPage = currentPath === "/login";
    hideNav = isLoginPage || store_get($$store_subs ??= {}, "$navVisibilityStore", navVisibilityStore).hideMainNav;
    if (!store_get($$store_subs ??= {}, "$authStore", authStore).isLoading && !store_get($$store_subs ??= {}, "$authStore", authStore).isAuthenticated && !isLoginPage) {
      goto();
    }
    if (!store_get($$store_subs ??= {}, "$authStore", authStore).isLoading && store_get($$store_subs ??= {}, "$authStore", authStore).isAuthenticated && isLoginPage) {
      goto();
    }
    QueryClientProvider($$renderer2, {
      client: queryClient,
      children: ($$renderer3) => {
        $$renderer3.push(`<div${attr_class("min-h-screen bg-bg text-text", void 0, { "pb-16": !hideNav, "md:pb-0": !hideNav })}>`);
        if (store_get($$store_subs ??= {}, "$authStore", authStore).isLoading) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="min-h-screen flex items-center justify-center"><div class="text-center"><div class="animate-spin text-4xl mb-4">⏳</div> <p>Loading...</p></div></div>`);
        } else if (store_get($$store_subs ??= {}, "$authStore", authStore).isAuthenticated || isLoginPage) {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<!--[-->`);
          slot($$renderer3, $$props, "default", {});
          $$renderer3.push(`<!--]-->`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (!hideNav && store_get($$store_subs ??= {}, "$authStore", authStore).isAuthenticated) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<nav${attr_class("fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light p-2 z-50 md:hidden", void 0, { "hidden": hideNav })}><div class="flex justify-around max-w-lg mx-auto"><a href="/"${attr_class(`flex flex-col items-center p-2 ${stringify(currentPath === "/" ? "text-primary" : "text-text-muted")}`)}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> <span class="text-xs mt-1">Home</span></a> <a href="/history"${attr_class(`flex flex-col items-center p-2 ${stringify(currentPath === "/history" ? "text-primary" : "text-text-muted")}`)}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> <span class="text-xs mt-1">History</span></a> <a href="/settings"${attr_class(`flex flex-col items-center p-2 ${stringify(currentPath === "/settings" ? "text-primary" : "text-text-muted")}`)}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> <span class="text-xs mt-1">Settings</span></a> <button class="flex flex-col items-center p-2 text-text-muted hover:text-danger"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg> <span class="text-xs mt-1">Logout</span></button></div></nav>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div>`);
      }
    });
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
