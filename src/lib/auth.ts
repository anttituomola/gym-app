import { convex, api } from './convex';

// Convex Auth integration for SvelteKit

export async function signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const result = await convex.action(api.auth.signIn, {
      provider: 'password',
      params: {
        flow: 'signIn',
        email,
        password,
      },
    });
    
    // Convex auth returns tokens directly (stored in httpOnly cookies)
    // The user is now authenticated
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sign in failed' 
    };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const result = await convex.action(api.auth.signIn, {
      provider: 'password',
      params: {
        flow: 'signUp',
        email,
        password,
      },
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sign up failed' 
    };
  }
}

export async function signInWithGoogle(): Promise<void> {
  // Call Convex auth signIn which returns a redirect URL for OAuth
  const result = await convex.action(api.auth.signIn, {
    provider: 'google',
  });
  
  if (result.redirect) {
    window.location.href = result.redirect;
  } else {
    throw new Error('No redirect URL received from Google OAuth');
  }
}

export async function signOut(): Promise<void> {
  try {
    await convex.action(api.auth.signOut, {});
  } catch (err) {
    console.error('Logout error:', err);
  }
}

// Check if user is authenticated using the isAuthenticated query
export async function checkAuthenticated(): Promise<boolean> {
  try {
    return await convex.query(api.auth.isAuthenticated, {});
  } catch (err) {
    return false;
  }
}

// Get current user info - Convex auth stores user in the users table
export async function getCurrentUser(): Promise<{ userId: string; email: string } | null> {
  try {
    // Use the isAuthenticated query and get user info from the session
    const isAuth = await convex.query(api.auth.isAuthenticated, {});
    if (!isAuth) return null;
    
    // We need to fetch user details - this requires a custom query
    // For now, return null - we'll get user info from the session
    return null;
  } catch (err) {
    return null;
  }
}
