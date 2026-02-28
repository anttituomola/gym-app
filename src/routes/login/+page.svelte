<script lang="ts">
  import { goto } from '$app/navigation';
  import { signInWithGoogle, checkAuthenticated, verifyAuthToken, getAuthToken, setRememberMe, getRememberMe } from '$lib/auth';
  import { authStore, setAuthState, convex, api } from '$lib/convex';
  
  let email = '';
  let password = '';

  let error = '';
  let isLoading = false;
  let isGoogleLoading = false;
  // Default to true - keep users logged in by default
  let rememberMe = getRememberMe();
  
  // Check auth on mount - only run once when auth is ready
  let hasCheckedAuth = false;
  $: if (!hasCheckedAuth && $authStore.userId) {
    hasCheckedAuth = true;
    checkAuth();
  }
  
  async function checkAuth() {
    const isAuth = await checkAuthenticated();
    if (isAuth) {
      // Check if user needs onboarding
      await redirectBasedOnOnboarding();
    }
  }
  
  async function redirectBasedOnOnboarding() {
    // Ensure we have a userId before making the call
    if (!$authStore.userId) {
      console.error('redirectBasedOnOnboarding called without userId');
      return;
    }
    
    try {
      // Get or create profile to check onboarding status
      const profile = await convex.mutation(api.userProfiles.getOrCreate, {
        userId: $authStore.userId as any,
      });
      
      if (!profile.onboardingCompleted) {
        goto('/onboarding');
      } else {
        goto('/');
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
      // Default to home if error
      goto('/');
    }
  }
  
  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (!email || !password) {
      error = 'Please enter both email and password';
      return;
    }
    
    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }
    
    error = '';
    isLoading = true;
    
    try {
      // Try to sign in first
      console.log(`[Login] Attempting sign in for ${email}`);
      
      let result = await convex.action(api.auth.signIn, {
        provider: 'password',
        params: {
          flow: 'signIn',
          email,
          password,
        },
      });
      
      console.log('[Login] signIn result:', result);
      
      // Store the token from successful sign in
      if (result.tokens?.token) {
        localStorage.setItem('authToken', result.tokens.token);
        console.log('[Login] Token stored from sign in');
      }
      
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : '';
      console.log('[Login] Sign in error:', errorMsg);
      
      // If account doesn't exist, try to create it
      if (errorMsg.includes('InvalidAccountId')) {
        console.log(`[Login] Account not found, creating new account for ${email}`);
        try {
          const signUpResult = await convex.action(api.auth.signIn, {
            provider: 'password',
            params: {
              flow: 'signUp',
              email,
              password,
            },
          });
          console.log('[Login] Sign up result:', signUpResult);
          
          // Store the token from successful sign up
          if (signUpResult.tokens?.token) {
            localStorage.setItem('authToken', signUpResult.tokens.token);
            console.log('[Login] Token stored from sign up');
          }
        } catch (signUpError) {
          console.error('[Login] Sign up error:', signUpError);
          throw signUpError;
        }
      } else if (errorMsg.includes('InvalidSecret')) {
        error = 'Incorrect password. Please try again.';
        isLoading = false;
        return;
      } else {
        throw e;
      }
    }
    
    // Check if authentication succeeded
    const isAuth = await checkAuthenticated();
    console.log('[Login] checkAuthenticated:', isAuth);
    
    if (isAuth) {
      // Get user info to set auth state properly
      const userInfo = await verifyAuthToken();
      if (userInfo) {
        setAuthState(userInfo.userId, userInfo.email);
        await redirectBasedOnOnboarding();
      } else {
        error = 'Failed to get user info';
        isLoading = false;
      }
    } else {
      error = 'Authentication failed';
      isLoading = false;
    }
  }
  
  async function handleGoogleSignIn() {
    error = '';
    isGoogleLoading = true;
    console.log('[Login] Google sign in clicked');
    
    // Store remember me preference for the callback
    setRememberMe(rememberMe);
    
    try {
      // Use custom OAuth flow (cross-origin friendly)
      await signInWithGoogle();
      // Page will redirect to Google, then to callback
      // Callback will handle onboarding check
    } catch (err) {
      console.error('[Login] Google sign in error:', err);
      isGoogleLoading = false;
      error = err instanceof Error ? err.message : 'Google sign in failed';
    }
  }
  

</script>

<svelte:head>
  <title>Sign In - LiftLog</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 bg-bg">
  <div class="w-full max-w-sm">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="text-5xl mb-4">🏋️</div>
      <h1 class="text-2xl font-bold">LiftLog</h1>
      <p class="text-text-muted mt-1">Personal training log</p>
    </div>
    
    <!-- Form -->
    <div class="bg-surface rounded-2xl p-6 shadow-xl">
      <h2 class="text-xl font-semibold mb-4">Welcome Back</h2>
      
      {#if error}
        <div class="bg-danger/20 text-danger rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      {/if}
      
      <!-- Google Sign In Button -->
      <button
        on:click={handleGoogleSignIn}
        disabled={isGoogleLoading}
        class="w-full bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl p-3 font-medium mb-4 flex items-center justify-center gap-3 border border-gray-300"
      >
        {#if isGoogleLoading}
          <span class="animate-pulse">Connecting to Google...</span>
        {:else}
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        {/if}
      </button>
      
      <!-- Divider -->
      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-surface-light"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-surface text-text-muted">or continue with email</span>
        </div>
      </div>
      
      <form on:submit={handleSubmit} class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium mb-1">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            class="w-full bg-bg border border-surface-light rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
            required
          />
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium mb-1">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="••••••••"
            class="w-full bg-bg border border-surface-light rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
            required
          />
          <p class="text-xs text-text-muted mt-1">At least 8 characters</p>
        </div>
        
        <!-- Keep me logged in checkbox -->
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={rememberMe}
            class="w-4 h-4 rounded border-surface-light text-primary focus:ring-primary bg-bg"
          />
          <span class="text-sm text-text-muted">Keep me logged in</span>
        </label>
        
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl p-4 font-semibold mt-2"
        >
          {#if isLoading}
            <span class="animate-pulse">Continue...</span>
          {:else}
            Continue
          {/if}
        </button>
      </form>
      

    </div>
    
    <!-- Info notice -->
    <p class="text-center text-text-muted text-xs mt-6">
      Your data is securely stored in the cloud
    </p>
  </div>
</div>
