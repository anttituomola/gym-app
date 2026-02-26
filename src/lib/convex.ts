import { ConvexClient } from 'convex/browser';
import { env } from '$env/dynamic/public';
import { writable } from 'svelte/store';
import { api } from '$convex/_generated/api.js';

// Create a singleton Convex client
const convexUrl = env.PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    'PUBLIC_CONVEX_URL environment variable is not set. ' +
    'Please set it in your Vercel project settings: ' +
    'Project Settings > Environment Variables > Add PUBLIC_CONVEX_URL'
  );
}

export const convex = new ConvexClient(convexUrl);

// Export typed API
export { api };

// Auth state store
export const authStore = writable<{
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
}>({
  isLoading: true,
  isAuthenticated: false,
  userId: null,
  email: null,
});

// Navigation visibility store
export const navVisibilityStore = writable<{
  hideMainNav: boolean;
}>({
  hideMainNav: false,
});

// Initialize auth state
export async function initAuth() {
  try {
    const { checkAuthenticated } = await import('./auth');
    const isAuth = await checkAuthenticated();
    
    if (isAuth) {
      authStore.set({
        isLoading: false,
        isAuthenticated: true,
        userId: null,
        email: '',
      });
    } else {
      authStore.set({
        isLoading: false,
        isAuthenticated: false,
        userId: null,
        email: null,
      });
    }
  } catch (e) {
    authStore.set({
      isLoading: false,
      isAuthenticated: false,
      userId: null,
      email: null,
    });
  }
}

// Update auth state after login/signup
export function setAuthState(userId: string, email: string) {
  authStore.set({
    isLoading: false,
    isAuthenticated: true,
    userId,
    email,
  });
}
