<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { checkAuthenticated } from '$lib/auth';
  import { setAuthState } from '$lib/convex';
  
  let error = '';
  let isLoading = true;
  
  onMount(async () => {
    // Convex auth handles the OAuth callback via HTTP actions
    // After Google redirects back, we just need to check if we're authenticated
    try {
      const isAuth = await checkAuthenticated();
      
      if (isAuth) {
        setAuthState('', '');
        goto('/');
      } else {
        error = 'Authentication failed. Please try again.';
        isLoading = false;
      }
    } catch (err) {
      error = 'An error occurred during authentication.';
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
      {:else}
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
      {/if}
    </div>
  </div>
</div>
