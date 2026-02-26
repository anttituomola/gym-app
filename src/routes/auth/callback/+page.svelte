<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { handleOAuthCallback } from '$lib/auth';
  import { setAuthState } from '$lib/convex';
  
  let error = '';
  let isLoading = true;
  let successMessage = '';
  
  onMount(async () => {
    try {
      // Get the hash fragment from URL (for implicit flow)
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      
      const accessToken = params.get('access_token');
      const state = params.get('state');
      const errorParam = params.get('error');
      const errorDescription = params.get('error_description');
      
      // Verify state to prevent CSRF
      const savedState = sessionStorage.getItem('oauth_state');
      const provider = sessionStorage.getItem('oauth_provider') || 'google';
      
      // Clear stored state
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_provider');
      
      if (errorParam) {
        error = `Authentication failed: ${errorDescription || errorParam}`;
        isLoading = false;
        return;
      }
      
      if (!accessToken) {
        error = 'No access token received from authentication provider';
        isLoading = false;
        return;
      }
      
      if (state !== savedState) {
        error = 'Invalid state parameter. Please try again.';
        isLoading = false;
        return;
      }
      
      // Process the OAuth callback
      const result = await handleOAuthCallback(provider, accessToken);
      
      if (!result.success) {
        error = result.error || 'Authentication failed';
        isLoading = false;
        return;
      }
      
      // Show appropriate message
      if (result.isNewUser) {
        successMessage = 'Welcome! Your account has been created.';
      } else {
        successMessage = 'Successfully signed in!';
      }
      
      // Update auth state and redirect
      if (result.userId && result.email) {
        setAuthState(result.userId, result.email);
        setTimeout(() => {
          goto('/');
        }, 1000);
      }
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unexpected error occurred';
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Completing Sign In - LiftLog</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 bg-bg">
  <div class="w-full max-w-sm">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="text-5xl mb-4">🏋️</div>
      <h1 class="text-2xl font-bold">LiftLog</h1>
    </div>
    
    <!-- Status Card -->
    <div class="bg-surface rounded-2xl p-6 shadow-xl text-center">
      {#if isLoading}
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p class="text-text-muted">Completing sign in...</p>
        </div>
      {:else if error}
        <div class="text-danger mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 class="text-lg font-semibold mb-2">Sign In Failed</h2>
        </div>
        <div class="bg-danger/20 text-danger rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
        <button
          on:click={() => goto('/login')}
          class="w-full bg-primary hover:bg-primary-dark transition-all rounded-xl p-3 font-semibold"
        >
          Back to Sign In
        </button>
      {:else}
        <div class="text-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 class="text-lg font-semibold mb-2">Success!</h2>
        </div>
        <p class="text-text-muted mb-4">{successMessage}</p>
        <p class="text-sm text-text-muted">Redirecting you...</p>
      {/if}
    </div>
  </div>
</div>
