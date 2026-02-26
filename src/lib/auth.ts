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

export async function signUpWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; token?: string; userId?: string; linked?: boolean }> {
  try {
    const result = await convex.mutation(api.svelteAuth.register, { 
      email, 
      password 
    });
    
    // Store token
    if (result.token) {
      localStorage.setItem('authToken', result.token);
    }
    
    return { success: true, token: result.token, userId: result.userId, linked: result.linked };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sign up failed' 
    };
  }
}

export async function signInWithGoogle(): Promise<void> {
  // Build Google OAuth URL
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/callback`;
  const scope = 'openid email profile';
  const state = generateState();
  
  // Store state in sessionStorage for verification
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_provider', 'google');
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token id_token',
    scope,
    state,
    nonce: generateNonce(),
  });
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  window.location.href = googleAuthUrl;
}

export async function handleOAuthCallback(
  provider: string,
  accessToken: string,
  idToken?: string
): Promise<{ success: boolean; error?: string; token?: string; userId?: string; isNewUser?: boolean; linked?: boolean }> {
  try {
    // For Google, we need to fetch user info
    let userInfo: {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };
    
    if (provider === 'google') {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info from Google');
      }
      
      userInfo = await response.json();
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    
    // Call our Convex mutation to sign in / link account
    const result = await convex.mutation(api.svelteAuth.oauthSignIn, {
      provider,
      providerAccountId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      image: userInfo.picture,
    });
    
    if (result.token) {
      localStorage.setItem('authToken', result.token);
    }
    
    return { 
      success: true, 
      token: result.token, 
      userId: result.userId,
      isNewUser: result.isNewUser,
      linked: result.linked,
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'OAuth sign in failed' 
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

// Generate random state for OAuth
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate nonce for OAuth
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
