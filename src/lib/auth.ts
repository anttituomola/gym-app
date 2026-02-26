import { convex, api } from './convex';

// Simple token-based auth that works with SvelteKit

export async function signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; token?: string; userId?: string }> {
  console.log('[Auth] signInWithEmail called with:', email);
  try {
    console.log('[Auth] Calling convex mutation api.svelteAuth.login...');
    const result = await convex.mutation(api.svelteAuth.login, { 
      email, 
      password 
    });
    console.log('[Auth] Convex login result:', result);
    
    // Store token
    if (result.token) {
      localStorage.setItem('authToken', result.token);
      console.log('[Auth] Token stored in localStorage');
    }
    
    return { success: true, token: result.token, userId: result.userId };
  } catch (error) {
    console.error('[Auth] signInWithEmail error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sign in failed' 
    };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; token?: string; userId?: string; linked?: boolean }> {
  console.log('[Auth] signUpWithEmail called with:', email);
  try {
    console.log('[Auth] Calling convex mutation api.svelteAuth.register...');
    const result = await convex.mutation(api.svelteAuth.register, { 
      email, 
      password 
    });
    console.log('[Auth] Convex register result:', result);
    
    // Store token
    if (result.token) {
      localStorage.setItem('authToken', result.token);
      console.log('[Auth] Token stored in localStorage');
    }
    
    return { success: true, token: result.token, userId: result.userId, linked: result.linked };
  } catch (error) {
    console.error('[Auth] signUpWithEmail error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sign up failed' 
    };
  }
}

export async function signInWithGoogle(): Promise<void> {
  console.log('[Auth] signInWithGoogle called');
  // Build Google OAuth URL
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  console.log('[Auth] Google Client ID:', clientId ? 'Set (length: ' + clientId.length + ')' : 'NOT SET');
  
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
  console.log('[Auth] Redirecting to Google...');
  window.location.href = googleAuthUrl;
}

export async function handleOAuthCallback(
  provider: string,
  accessToken: string,
  idToken?: string
): Promise<{ success: boolean; error?: string; token?: string; userId?: string; isNewUser?: boolean; linked?: boolean }> {
  console.log('[Auth] handleOAuthCallback called, provider:', provider);
  try {
    // For Google, we need to fetch user info
    let userInfo: {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };
    
    if (provider === 'google') {
      console.log('[Auth] Fetching user info from Google...');
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info from Google');
      }
      
      userInfo = await response.json();
      console.log('[Auth] Google user info:', { sub: userInfo.sub, email: userInfo.email, name: userInfo.name });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    
    // Call our Convex mutation to sign in / link account
    console.log('[Auth] Calling convex mutation api.svelteAuth.oauthSignIn...');
    const result = await convex.mutation(api.svelteAuth.oauthSignIn, {
      provider,
      providerAccountId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      image: userInfo.picture,
    });
    console.log('[Auth] OAuth sign in result:', result);
    
    if (result.token) {
      localStorage.setItem('authToken', result.token);
      console.log('[Auth] Token stored in localStorage');
    }
    
    return { 
      success: true, 
      token: result.token, 
      userId: result.userId,
      isNewUser: result.isNewUser,
      linked: result.linked,
    };
  } catch (error) {
    console.error('[Auth] handleOAuthCallback error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'OAuth sign in failed' 
    };
  }
}

export async function signOut(): Promise<void> {
  console.log('[Auth] signOut called');
  const token = localStorage.getItem('authToken');
  if (token) {
    try {
      await convex.mutation(api.svelteAuth.logout, { token });
    } catch (err) {
      console.error('[Auth] Logout error:', err);
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
  console.log('[Auth] verifyAuthToken called');
  const token = getAuthToken();
  if (!token) {
    console.log('[Auth] No token found');
    return null;
  }
  
  try {
    console.log('[Auth] Calling convex query api.svelteAuth.verifyToken...');
    const user = await convex.query(api.svelteAuth.verifyToken, { token });
    console.log('[Auth] verifyToken result:', user);
    if (user) {
      return { userId: user._id, email: user.email || '' };
    }
  } catch (err) {
    console.error('[Auth] Token verification failed:', err);
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
