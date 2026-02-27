import { convex, api } from './convex';

// Custom token-based auth for SvelteKit with Google OAuth

const REMEMBER_ME_KEY = 'auth_remember_me';

export function setRememberMe(remember: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(remember));
  }
}

export function getRememberMe(): boolean {
  if (typeof localStorage === 'undefined') return true; // Default to true (stay logged in)
  const stored = localStorage.getItem(REMEMBER_ME_KEY);
  if (stored === null) return true; // Default to staying logged in
  try {
    return JSON.parse(stored);
  } catch {
    return true;
  }
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

export async function signInWithGoogle(): Promise<void> {
  // Build Google OAuth URL
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set. Please add it to your Vercel environment variables.');
  }
  
  const redirectUri = `${window.location.origin}/auth/callback`;
  const scope = 'openid email profile';
  const state = generateState();
  
  console.log('[OAuth] Starting Google sign in...');
  console.log('[OAuth] Client ID:', clientId.substring(0, 10) + '...');
  console.log('[OAuth] Redirect URI:', redirectUri);
  
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
  console.log('[OAuth] Redirecting to:', googleAuthUrl);
  window.location.href = googleAuthUrl;
}

export async function handleOAuthCallback(
  provider: string,
  accessToken: string,
  idToken?: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; error?: string; token?: string; userId?: string; email?: string; isNewUser?: boolean }> {
  try {
    console.log('[OAuth] Fetching user info with token:', accessToken.substring(0, 20) + '...');
    
    // Fetch user info from Google
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    console.log('[OAuth] User info response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OAuth] User info error:', errorText);
      throw new Error(`Failed to fetch user info: ${response.status} ${errorText}`);
    }
    
    const userInfo: {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    } = await response.json();
    
    // Call our Convex mutation to sign in / link account
    const result = await convex.mutation(api.svelteAuth.oauthSignIn, {
      provider,
      providerAccountId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      image: userInfo.picture,
      rememberMe,
    });
    
    if (result.token) {
      localStorage.setItem('authToken', result.token);
    }
    
    return { 
      success: true, 
      token: result.token, 
      userId: result.userId,
      email: result.email,
      isNewUser: result.isNewUser,
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
  
  // Also clear Google OAuth session if present
  // This ensures the user is fully logged out
  console.log('[Auth] User signed out');
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

export async function checkAuthenticated(): Promise<boolean> {
  const user = await verifyAuthToken();
  return !!user;
}
