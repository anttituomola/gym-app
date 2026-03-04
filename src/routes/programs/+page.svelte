<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { stopPropagation } from 'svelte/legacy';
  import { convex, api, authStore } from '$lib/convex';
  import type { TrainingProgram } from '$lib/types';
  import { formatDate } from '$lib/utils/date';
  
  let programs: TrainingProgram[] = [];
  let loading = true;
  
  // Modal states
  let showDeleteModal = false;
  let programToDelete: string | null = null;
  let showErrorModal = false;
  let errorMessage = '';
  
  onMount(() => {
    if ($authStore.userId) {
      loadPrograms();
    } else if (!$authStore.isLoading) {
      // Auth finished loading but no user
      loading = false;
    }
  });
  
  $: if ($authStore.userId && loading) {
    loadPrograms();
  } else if (!$authStore.isLoading && loading) {
    loading = false;
  }
  
  async function loadPrograms() {
    if (!$authStore.userId) return;
    loading = true;
    try {
      const data = await convex.query(api.programs.list, { 
        userId: $authStore.userId as any 
      });
      programs = data.map(p => ({
        id: p._id,
        name: p.name,
        description: p.description,
        createdAt: p._creationTime,
        updatedAt: p._creationTime,
        workouts: p.workouts,
        isActive: p.isActive,
      }));
    } catch (err) {
      console.error('Failed to load programs:', err);
      showError('Failed to load programs');
    } finally {
      loading = false;
    }
  }
  
  function createNewProgram() {
    goto('/programs/builder');
  }
  
  function editProgram(id: string) {
    goto(`/programs/builder?id=${id}`);
  }
  
  function confirmDelete(id: string) {
    programToDelete = id;
    showDeleteModal = true;
  }
  
  function cancelDelete() {
    showDeleteModal = false;
    programToDelete = null;
  }
  
  async function executeDelete() {
    if (!programToDelete || !$authStore.userId) return;
    
    try {
      await convex.mutation(api.programs.remove, {
        programId: programToDelete as any,
        userId: $authStore.userId as any,
      });
      await loadPrograms();
    } catch (err) {
      console.error('Failed to delete program:', err);
      showError('Failed to delete program');
    } finally {
      showDeleteModal = false;
      programToDelete = null;
    }
  }
  
  async function activateProgram(id: string) {
    if (!$authStore.userId) return;
    
    try {
      await convex.mutation(api.programs.setActive, {
        programId: id as any,
        userId: $authStore.userId as any,
      });
      await loadPrograms();
    } catch (err) {
      console.error('Failed to activate program:', err);
      showError('Failed to activate program');
    }
  }
  
  async function deactivatePrograms() {
    if (!$authStore.userId) return;
    
    try {
      await convex.mutation(api.programs.deactivateAll, {
        userId: $authStore.userId as any,
      });
      await loadPrograms();
    } catch (err) {
      console.error('Failed to deactivate programs:', err);
      showError('Failed to deactivate program');
    }
  }
  
  function showError(message: string) {
    errorMessage = message;
    showErrorModal = true;
  }
  
  function closeError() {
    showErrorModal = false;
    errorMessage = '';
  }
  
  function formatDateLocal(timestamp: number): string {
    return formatDate(timestamp);
  }
</script>

<svelte:head>
  <title>Programs - LiftLog</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-surface p-4 border-b border-surface-light">
    <div class="flex items-center justify-between">
      <button 
        onclick={() => goto('/')}
        class="text-text-muted hover:text-text flex items-center gap-1"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span class="text-sm">Back</span>
      </button>
      <h1 class="text-xl font-bold">Training Programs</h1>
      <div class="w-16"></div>
    </div>
  </header>
  
  <!-- Main Content -->
  <main class="flex-1 p-4 pb-24">
    <!-- Create Button -->
    <button
      onclick={createNewProgram}
      class="w-full bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl p-4 mb-6 flex items-center justify-center gap-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      <span class="font-semibold">Create New Program</span>
    </button>
    
    <!-- Programs List -->
    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin text-4xl mb-4">⏳</div>
        <p class="text-text-muted">Loading...</p>
      </div>
    {:else if !$authStore.userId}
      <div class="text-center py-12">
        <div class="text-6xl mb-4">🔒</div>
        <h2 class="text-lg font-semibold mb-2">Login Required</h2>
        <p class="text-text-muted mb-6">Please log in to manage your training programs</p>
        <a
          href="/login"
          class="inline-block bg-primary hover:bg-primary-dark active:scale-95 transition-all rounded-xl px-6 py-3 font-semibold"
        >
          Go to Login
        </a>
      </div>
    {:else if programs.length === 0}
      <div class="text-center py-12">
        <div class="text-6xl mb-4">📋</div>
        <h2 class="text-lg font-semibold mb-2">No Programs Yet</h2>
        <p class="text-text-muted mb-6">Create your first training program to get started</p>
        <button
          onclick={createNewProgram}
          class="bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-xl px-6 py-3"
        >
          Create Program
        </button>
      </div>
    {:else}
      <div class="space-y-3">
        {#each programs as program}
          <div class="bg-surface rounded-xl p-4 {program.isActive ? 'ring-2 ring-primary' : ''}">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-semibold text-lg">{program.name}</h3>
                {#if program.description}
                  <p class="text-text-muted text-sm">{program.description}</p>
                {/if}
                <p class="text-text-muted text-xs mt-1">
                  {program.workouts.length} workout{program.workouts.length !== 1 ? 's' : ''} • 
                  Created {formatDateLocal(program.createdAt)}
                </p>
              </div>
              {#if program.isActive}
                <span class="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
                  Active
                </span>
              {/if}
            </div>
            
            <!-- Workouts Preview -->
            <div class="flex flex-wrap gap-2 mb-4">
              {#each program.workouts as workout}
                <span class="px-2 py-1 bg-surface-light rounded-lg text-xs">
                  {workout.name}: {workout.exercises.length} exercises
                </span>
              {/each}
            </div>
            
            <!-- Actions -->
            <div class="flex gap-2">
              <button
                onclick={() => editProgram(program.id)}
                class="flex-1 bg-surface-light hover:bg-surface-light/80 active:scale-95 transition-all rounded-lg py-2 text-sm"
              >
                Edit
              </button>
              {#if program.isActive}
                <button
                  onclick={deactivatePrograms}
                  class="flex-1 bg-primary/20 hover:bg-primary/30 text-primary active:scale-95 transition-all rounded-lg py-2 text-sm font-medium"
                >
                  Deactivate
                </button>
              {:else}
                <button
                  onclick={() => activateProgram(program.id)}
                  class="flex-1 bg-primary/20 hover:bg-primary/30 text-primary active:scale-95 transition-all rounded-lg py-2 text-sm font-medium"
                >
                  Activate
                </button>
              {/if}
              <button
                onclick={() => confirmDelete(program.id)}
                class="px-3 py-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                aria-label="Delete"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0" onclick={cancelDelete} onkeydown={(e) => e.key === 'Enter' && cancelDelete()}>
    <div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation" onclick={stopPropagation}>
      <h3 class="text-xl font-bold mb-2">Delete Program?</h3>
      <p class="text-text-muted mb-6">This action cannot be undone. The program will be permanently removed.</p>
      
      <div class="flex gap-3">
        <button
          onclick={cancelDelete}
          class="flex-1 px-4 py-3 bg-surface-light hover:bg-surface-light/80 rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          onclick={executeDelete}
          class="flex-1 px-4 py-3 bg-danger hover:bg-danger/80 text-white rounded-xl font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Error Modal -->
{#if showErrorModal}
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" role="button" tabindex="0" onclick={closeError} onkeydown={(e) => e.key === 'Enter' && closeError()}>
    <div class="bg-surface rounded-2xl p-6 max-w-sm w-full" role="presentation" onclick={stopPropagation}>
      <h3 class="text-xl font-bold mb-2">Error</h3>
      <p class="text-text-muted mb-6">{errorMessage}</p>
      
      <button
        onclick={closeError}
        class="w-full px-4 py-3 bg-primary hover:bg-primary-dark rounded-xl font-medium"
      >
        OK
      </button>
    </div>
  </div>
{/if}
