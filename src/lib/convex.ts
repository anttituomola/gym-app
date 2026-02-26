import { ConvexClient } from 'convex/browser';
import { env } from '$env/dynamic/public';
import { writable } from 'svelte/store';
import { api } from '$convex/_generated/api.js';
import { getAuthToken, verifyAuthToken } from './auth';

// Create a singleton Convex client
const convexUrl = env.PUBLIC_CONVEX_URL;
console.log('[Convex] Initializing with URL:', convexUrl);

if (!convexUrl) {
  throw new Error(
    'PUBLIC_CONVEX_URL environment variable is not set. ' +
    'Please set it in your Vercel project settings: ' +
    'Project Settings > Environment Variables > Add PUBLIC_CONVEX_URL'
  );
}

export const convex = new ConvexClient(convexUrl);

// Add error handler
convex.onUpdate?.(() => {
  console.log('[Convex] Update received');
});

// Test connection immediately
(async () => {
  try {
    console.log('[Convex] Testing connection...');
    // Try a simple query to verify connection
    const result = await convex.query(api.svelteAuth.verifyToken, { token: 'test' });
    console.log('[Convex] Connection test result:', result);
  } catch (e) {
    console.error('[Convex] Connection test failed:', e);
  }
})();

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
  console.log('[Auth] Initializing auth state...');
  const token = getAuthToken();
  console.log('[Auth] Token exists:', !!token);
  
  if (!token) {
    authStore.set({
      isLoading: false,
      isAuthenticated: false,
      userId: null,
      email: null,
    });
    return;
  }
  
  try {
    // Verify token with server
    const user = await verifyAuthToken();
    console.log('[Auth] Token verification result:', user);
    
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
  } catch (e) {
    console.error('[Auth] initAuth error:', e);
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
  console.log('[Auth] Setting auth state:', { userId, email });
  authStore.set({
    isLoading: false,
    isAuthenticated: true,
    userId,
    email,
  });
}
