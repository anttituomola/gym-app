import { a as store_get, h as head, e as escape_html, i as attr, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { g as goto } from "../../../chunks/client.js";
import { a as authStore } from "../../../chunks/convex.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let email = "";
    let password = "";
    let isLoading = false;
    if (store_get($$store_subs ??= {}, "$authStore", authStore).isAuthenticated && !store_get($$store_subs ??= {}, "$authStore", authStore).isLoading) {
      goto();
    }
    head("1x05zx6", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html("Sign In")} - LiftLog</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen flex items-center justify-center p-4 bg-bg"><div class="w-full max-w-sm"><div class="text-center mb-8"><div class="text-5xl mb-4">🏋️</div> <h1 class="text-2xl font-bold">LiftLog</h1> <p class="text-text-muted mt-1">Personal training log</p></div> <div class="bg-surface rounded-2xl p-6 shadow-xl"><h2 class="text-xl font-semibold mb-4">${escape_html("Welcome Back")}</h2> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <form class="space-y-4"><div><label for="email" class="block text-sm font-medium mb-1">Email</label> <input id="email" type="email"${attr("value", email)} placeholder="you@example.com" class="w-full bg-bg border border-surface-light rounded-xl px-4 py-3 focus:outline-none focus:border-primary" required=""/></div> <div><label for="password" class="block text-sm font-medium mb-1">Password</label> <input id="password" type="password"${attr("value", password)} placeholder="••••••••" class="w-full bg-bg border border-surface-light rounded-xl px-4 py-3 focus:outline-none focus:border-primary" required=""/> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <button type="submit"${attr("disabled", isLoading, true)} class="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl p-4 font-semibold mt-2">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`${escape_html("Sign In")}`);
    }
    $$renderer2.push(`<!--]--></button></form> <div class="mt-6 text-center"><button class="text-text-muted hover:text-text text-sm">${escape_html("Don't have an account? Sign up")}</button></div></div> <p class="text-center text-text-muted text-xs mt-6">Your data is securely stored in the cloud</p></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
