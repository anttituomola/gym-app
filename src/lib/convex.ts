import { ConvexClient } from 'convex/browser';
import { env } from '$env/dynamic/public';
import { writable } from 'svelte/store';
import { api } from '$convex/_generated/api.js';
import { getAuthToken, verifyAuthToken } from './auth';

// Create a singleton Convex client
const convexUrl = env.PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.warn('PUBLIC_CONVEX_URL not set');
}

export const convex = new ConvexClient(convexUrl || '');

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

// Navigation visibility store (for pages that want to hide the main nav)
export const navVisibilityStore = writable<{
  hideMainNav: boolean;
}>({
  hideMainNav: false,
});

// Initialize auth state
export async function initAuth() {
  const token = getAuthToken();
  
  if (!token) {
    authStore.set({
      isLoading: false,
      isAuthenticated: false,
      userId: null,
      email: null,
    });
    return;
  }
  
  // Verify token with server
  const user = await verifyAuthToken();
  
  if (user) {
    authStore.set({
      isLoading: false,
      isAuthenticated: true,
      userId: user.userId,
      email: user.email,
    });
  } else {
    // Token invalid or expired
    localStorage.removeItem('authToken');
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
