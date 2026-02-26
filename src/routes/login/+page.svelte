<script lang="ts">
  import { goto } from '$app/navigation';
  import { signInWithEmail, signUpWithEmail } from '$lib/auth';
  import { authStore, setAuthState } from '$lib/convex';
  
  let email = '';
  let password = '';
  let isSignUp = false;
  let error = '';
  let isLoading = false;
  
  // Redirect if already authenticated
  $: if ($authStore.isAuthenticated && !$authStore.isLoading) {
    goto('/');
  }
  
  async function handleSubmit() {
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
    
    const result = isSignUp 
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);
    
    isLoading = false;
    
    if (!result.success) {
      error = result.error || 'Authentication failed';
    } else {
      // Update auth state and redirect
      setAuthState(result.userId || '', email);
      goto('/');
    }
  }
  
  function toggleMode() {
    isSignUp = !isSignUp;
    error = '';
  }
</script>

<svelte:head>
  <title>{isSignUp ? 'Sign Up' : 'Sign In'} - LiftLog</title>
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
      <h2 class="text-xl font-semibold mb-4">
        {isSignUp ? 'Create Account' : 'Welcome Back'}
      </h2>
      
      {#if error}
        <div class="bg-danger/20 text-danger rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
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
          {#if isSignUp}
            <p class="text-xs text-text-muted mt-1">At least 8 characters</p>
          {/if}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl p-4 font-semibold mt-2"
        >
          {#if isLoading}
            <span class="animate-pulse">{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
          {:else}
            {isSignUp ? 'Sign Up' : 'Sign In'}
          {/if}
        </button>
      </form>
      
      <div class="mt-6 text-center">
        <button
          on:click={toggleMode}
          class="text-text-muted hover:text-text text-sm"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
    
    <!-- Demo notice -->
    <p class="text-center text-text-muted text-xs mt-6">
      Your data is securely stored in the cloud
    </p>
  </div>
</div>
