<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, convex, api } from '$lib/convex';
  import OnboardingWizard from '$lib/components/onboarding/OnboardingWizard.svelte';

  let isChecking = $state(true);
  let userId = $state<string | null>(null);

  onMount(() => {
    checkAuthAndOnboarding();
  });

  async function checkAuthAndOnboarding() {
    // Wait for auth to be ready
    if ($authStore.isLoading) {
      return;
    }

    // Check if user is authenticated
    if (!$authStore.userId) {
      goto('/login');
      return;
    }

    userId = $authStore.userId;

    try {
      // Check if onboarding is already completed
      const status = await convex.query(api.userProfiles.getOnboardingStatus, {
        userId: $authStore.userId as any,
      });

      if (status.completed) {
        // Already onboarded, redirect to home
        goto('/');
        return;
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
      // Continue to onboarding anyway
    }

    isChecking = false;
  }

  // Watch for auth changes
  $effect(() => {
    if (!$authStore.isLoading && $authStore.userId && !userId) {
      checkAuthAndOnboarding();
    }
  });

  function handleComplete() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Welcome - LiftLog</title>
</svelte:head>

{#if isChecking}
  <div class="min-h-screen bg-bg flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin text-4xl mb-4">⏳</div>
      <p class="text-text-muted">Loading...</p>
    </div>
  </div>
{:else if userId}
  <OnboardingWizard {userId} onComplete={handleComplete} />
{/if}
