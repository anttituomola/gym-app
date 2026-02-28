<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, convex, api } from '$lib/convex';
  import OnboardingWizard from '$lib/components/onboarding/OnboardingWizard.svelte';
  import type { UserProfile } from '$lib/types';

  let isChecking = $state(true);
  let isLoading = $state(true);
  let userId = $state<string | null>(null);
  let userProfile = $state<UserProfile | null>(null);
  let error = $state<string | null>(null);

  onMount(() => {
    checkAuthAndLoadProfile();
  });

  async function checkAuthAndLoadProfile() {
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
    isChecking = false;

    // Load user profile for prefilling
    try {
      const profile = await convex.query(api.userProfiles.get, {
        userId: userId as any,
      });

      if (!profile) {
        // No profile found, redirect to onboarding
        goto('/onboarding');
        return;
      }

      userProfile = profile;
      isLoading = false;
    } catch (err) {
      console.error('Failed to load profile:', err);
      error = 'Failed to load your profile. Please try again.';
      isLoading = false;
    }
  }

  // Watch for auth changes
  $effect(() => {
    if (!$authStore.isLoading && $authStore.userId && !userId) {
      checkAuthAndLoadProfile();
    }
  });

  function handleComplete() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Create New Program - LiftLog</title>
</svelte:head>

{#if isChecking || isLoading}
  <div class="min-h-screen bg-bg flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin text-4xl mb-4">⏳</div>
      <p class="text-text-muted">Loading your profile...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen bg-bg flex items-center justify-center">
    <div class="text-center max-w-md px-4">
      <div class="text-4xl mb-4">⚠️</div>
      <p class="text-danger mb-4">{error}</p>
      <button
        onclick={() => goto('/')}
        class="px-6 py-3 bg-primary rounded-xl font-medium"
      >
        Go Home
      </button>
    </div>
  </div>
{:else if userId && userProfile}
  <OnboardingWizard 
    {userId} 
    mode="new-program"
    initialData={{
      biometrics: userProfile.biometrics,
      trainingGoals: userProfile.trainingGoals,
      unitPreference: userProfile.unitPreference,
    }}
    onComplete={handleComplete} 
  />
{/if}
