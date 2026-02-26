import { convex, api } from './convex';

// Simple token-based auth that works with SvelteKit

export async function signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; token?: string; userId?: string }> {
  try {
    const result = await convex.mutation(api.svelteAuth.login, { 
      email, 
      password 
    });
    
    // Store token
    if (result.token) {
      localStorage.setItem('authToken', result.token);
    }
    
    return { success: true, token: result.token, userId: result.userId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sign in failed' 
    };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; token?: string; userId?: string }> {
  try {
    const result = await convex.mutation(api.svelteAuth.register, { 
      email, 
      password 
    });
    
    // Store token
    if (result.token) {
      localStorage.setItem('authToken', result.token);
    }
    
    return { success: true, token: result.token, userId: result.userId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sign up failed' 
    };
  }
}

export async function signOut(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (token) {
    try {
      await convex.mutation(api.svelteAuth.logout, { token });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('authToken');
  }
}

export function getAuthToken(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

export async function verifyAuthToken(): Promise<{ userId: string; email: string } | null> {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const user = await convex.query(api.svelteAuth.verifyToken, { token });
    if (user) {
      return { userId: user._id, email: user.email || '' };
    }
  } catch (err) {
    console.error('Token verification failed:', err);
  }
  
  return null;
}
