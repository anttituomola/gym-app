import { ConvexClient } from "convex/browser";
import { p as public_env } from "./shared-server.js";
import { w as writable } from "./index.js";
import { componentsGeneric, anyApi } from "convex/server";
const api = anyApi;
componentsGeneric();
const convexUrl = public_env.PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.warn("PUBLIC_CONVEX_URL not set");
}
const convex = new ConvexClient(convexUrl || "");
const authStore = writable({
  isLoading: true,
  isAuthenticated: false,
  userId: null,
  email: null
});
const navVisibilityStore = writable({
  hideMainNav: false
});
export {
  authStore as a,
  api as b,
  convex as c,
  navVisibilityStore as n
};
