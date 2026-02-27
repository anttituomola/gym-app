<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { handleOAuthCallback, getRememberMe } from '$lib/auth';
  import { setAuthState } from '$lib/convex';
  
  let error = '';
  let isLoading = true;
  let successMessage = '';
  let debugInfo = '';
  
  // Check hash immediately and also in onMount
  if (typeof window !== 'undefined') {
    console.log('[Callback] Script executing, window.location.hash:', window.location.hash);
    debugInfo = 'Hash: ' + (window.location.hash ? 'present' : 'missing');
  }
  
  onMount(async () => {
    console.log('[Callback] onMount triggered');
    console.log('[Callback] window.location.hash:', window.location.hash);
    
    // Wait for any hydration to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const hash = window.location.hash;
    
    if (!hash || hash.length < 2) {
      console.error('[Callback] No hash found after delay');
      error = 'No authentication data received. Please try again.';
      isLoading = false;
      return;
    }
    
    try {
      const params = new URLSearchParams(hash.substring(1));
      
      const accessToken = params.get('access_token');
      const state = params.get('state');
      const errorParam = params.get('error');
      
      console.log('[Callback] access_token:', accessToken ? 'present' : 'missing');
      console.log('[Callback] state:', state ? 'present' : 'missing');
      
      if (errorParam) {
        error = `Auth error: ${errorParam}`;
        isLoading = false;
        return;
      }
      
      if (!accessToken) {
        error = 'No access token received';
        isLoading = false;
        return;
      }
      
      // Verify state
      const savedState = sessionStorage.getItem('oauth_state');
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_provider');
      
      if (state !== savedState) {
        error = 'Invalid state - possible security issue';
        isLoading = false;
        return;
      }
      
      // Process the callback - use rememberMe preference (defaults to true for persistent login)
      const rememberMe = getRememberMe();
      const result = await handleOAuthCallback('google', accessToken, undefined, rememberMe);
      
      if (!result.success) {
        error = result.error || 'Authentication failed';
        isLoading = false;
        return;
      }
      
      successMessage = result.isNewUser ? 'Welcome!' : 'Signed in!';
      
      if (result.userId && result.email) {
        setAuthState(result.userId, result.email);
        setTimeout(() => goto('/'), 1000);
      }
      
    } catch (err) {
      console.error('[Callback] Error:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Sign In - LiftLog</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 bg-bg">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <div class="text-5xl mb-4">🏋️</div>
      <h1 class="text-2xl font-bold">LiftLog</h1>
    </div>
    
    <div class="bg-surface rounded-2xl p-6 shadow-xl text-center">
      {#if isLoading}
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p class="text-text-muted">Completing sign in...</p>
          <p class="text-xs text-text-muted">{debugInfo}</p>
        </div>
      {:else if error}
        <div class="text-danger mb-4">
          <h2 class="text-lg font-semibold mb-2">Sign In Failed</h2>
          <p class="text-sm">{error}</p>
          <p class="text-xs mt-2 text-text-muted">{debugInfo}</p>
        </div>
        <button
          on:click={() => goto('/login')}
          class="w-full bg-primary hover:bg-primary-dark transition-all rounded-xl p-3 font-semibold"
        >
          Back to Sign In
        </button>
      {:else}
        <div class="text-success mb-4">
          <h2 class="text-lg font-semibold mb-2">Success!</h2>
          <p>{successMessage}</p>
        </div>
      {/if}
    </div>
  </div>
</div>
