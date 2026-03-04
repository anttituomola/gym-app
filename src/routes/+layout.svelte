<script lang="ts">
  import '../app.css';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore, initAuth, navVisibilityStore } from '$lib/convex';
  import { signOut } from '$lib/auth';
  import { restTimer, formattedRestTime, REST_TIME_SUCCESS } from '$lib/stores/restTimer';
  
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
      },
    },
  });
  
  $: currentPath = $page.url.pathname;
  $: isLoginPage = currentPath === '/login';
  $: isAuthCallbackPage = currentPath === '/auth/callback';
  $: isPublicPage = isLoginPage || isAuthCallbackPage;
  $: hideNav = isLoginPage || $navVisibilityStore.hideMainNav;
  
  // Redirect to login if not authenticated (skip for public pages)
  $: if (!$authStore.isLoading && !$authStore.isAuthenticated && !isPublicPage) {
    goto('/login');
  }
  
  // Redirect to home if authenticated and on login page
  $: if (!$authStore.isLoading && $authStore.isAuthenticated && isLoginPage) {
    goto('/');
  }
  
  onMount(() => {
    initAuth();
  });
  
  async function handleLogout() {
    await signOut();
    // Update auth store to reflect logged out state
    authStore.set({
      isLoading: false,
      isAuthenticated: false,
      userId: null,
      email: null,
    });
    goto('/login');
  }
</script>

<QueryClientProvider client={queryClient}>
  <div class="min-h-screen bg-bg text-text" class:pb-16={!hideNav} class:md:pb-0={!hideNav} class:md:pl-64={!hideNav && $authStore.isAuthenticated}>
    {#if $authStore.isLoading}
      <!-- Loading screen -->
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin text-4xl mb-4">⏳</div>
          <p>Loading...</p>
        </div>
      </div>
    {:else if $authStore.isAuthenticated || isPublicPage}
      <slot />
    {/if}
    
    <!-- Global Rest Timer - Fixed at bottom of viewport -->
    {#if $restTimer.isRunning}
      <div 
        class="fixed left-0 right-0 bg-surface border-t border-surface-light p-3 z-[60] md:left-64"
        class:bottom-0={hideNav}
        class:bottom-16={!hideNav}
        class:md:bottom-0={!hideNav}
      >
        <div class="flex items-center justify-between max-w-lg mx-auto">
          <button
            onclick={() => restTimer.skip()}
            class="px-4 py-2 text-primary hover:text-primary-dark font-medium text-sm"
          >
            Skip Rest
          </button>
          
          <div class="text-center">
            <div class="text-xs text-text-muted uppercase tracking-wide">Rest</div>
            <div class="text-2xl font-mono font-bold {$restTimer.remaining < 0 ? 'text-danger' : $restTimer.remaining < 30 ? 'text-success' : 'text-primary'}">
              {$formattedRestTime}
            </div>
          </div>
          
          <div class="w-16"></div>
        </div>
      </div>
    {/if}
    
    <!-- Desktop Sidebar Navigation -->
    {#if !hideNav && $authStore.isAuthenticated}
      <nav class="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-surface-light p-4 z-50 hidden md:flex flex-col">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-primary">🏋️ LiftLog</h1>
          <p class="text-text-muted text-sm">Personal training log</p>
        </div>
        
        <div class="flex-1 space-y-2">
          <a 
            href="/" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors {currentPath === '/' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-light'}"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="font-medium">Home</span>
          </a>
          
          <a 
            href="/history" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors {currentPath === '/history' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-light'}"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">History</span>
          </a>
          
          <a 
            href="/settings" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors {currentPath === '/settings' ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-light'}"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="font-medium">Settings</span>
          </a>
        </div>
        
        <button 
          onclick={handleLogout}
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:bg-surface-light hover:text-danger transition-colors mt-auto"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="font-medium">Logout</span>
        </button>
      </nav>
    {/if}
    
    <!-- Mobile Bottom Navigation -->
    {#if !hideNav && $authStore.isAuthenticated}
      <nav class="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light p-2 z-50 md:hidden" class:hidden={hideNav}>
        <div class="flex justify-around max-w-lg mx-auto">
          <a 
            href="/" 
            class="flex flex-col items-center p-2 {currentPath === '/' ? 'text-primary' : 'text-text-muted'}"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="text-xs mt-1">Home</span>
          </a>
          
          <a 
            href="/history" 
            class="flex flex-col items-center p-2 {currentPath === '/history' ? 'text-primary' : 'text-text-muted'}"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-xs mt-1">History</span>
          </a>
          
          <a 
            href="/settings" 
            class="flex flex-col items-center p-2 {currentPath === '/settings' ? 'text-primary' : 'text-text-muted'}"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-xs mt-1">Settings</span>
          </a>
          
          <button 
            onclick={handleLogout}
            class="flex flex-col items-center p-2 text-text-muted hover:text-danger"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="text-xs mt-1">Logout</span>
          </button>
        </div>
      </nav>
    {/if}
  </div>
</QueryClientProvider>
