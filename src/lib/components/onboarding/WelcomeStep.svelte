<script lang="ts">
  interface Props {
    onNewUser: () => void;
    onImport: () => void;
  }

  let { onNewUser, onImport }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center h-full py-8">
  <!-- Logo/Icon -->
  <div class="text-6xl mb-6">🏋️‍♂️</div>
  
  <!-- Welcome Text -->
  <h1 class="text-2xl font-bold text-center mb-2">Welcome to LiftLog</h1>
  <p class="text-text-muted text-center mb-8 max-w-xs">
    Let's set up your personalized training program in just a few steps
  </p>

  <!-- Options -->
  <div class="w-full max-w-sm space-y-4">
    <!-- Import Option -->
    <button
      type="button"
      class="w-full p-5 bg-surface-light hover:bg-surface rounded-xl border-2 border-transparent hover:border-primary/30 transition-all text-left group"
      onclick={onImport}
    >
      <div class="flex items-center gap-4">
        <div class="text-3xl">📊</div>
        <div class="flex-1">
          <h3 class="font-semibold group-hover:text-primary transition-colors">
            Import from Stronglifts
          </h3>
          <p class="text-sm text-text-muted">
            Bring your existing workout history
          </p>
        </div>
        <svg class="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>

    <!-- New User Option -->
    <button
      type="button"
      class="w-full p-5 bg-primary hover:bg-primary-dark rounded-xl transition-all text-left group"
      onclick={onNewUser}
    >
      <div class="flex items-center gap-4">
        <div class="text-3xl">🚀</div>
        <div class="flex-1">
          <h3 class="font-semibold text-white">
            I'm new here
          </h3>
          <p class="text-sm text-white/70">
            Create a personalized program
          </p>
        </div>
        <svg class="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  </div>

  <!-- Info -->
  <p class="text-xs text-text-muted mt-8 text-center">
    You can always change your program later in settings
  </p>
</div>
