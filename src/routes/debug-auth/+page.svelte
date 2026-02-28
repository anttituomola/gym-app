<script lang="ts">
  import { convex, api } from '$lib/convex';

  let email = $state('');
  let password = $state('test123456');
  let flow = $state<'signIn' | 'signUp'>('signUp');
  let logs = $state<string[]>([]);
  let isLoading = $state(false);

  function log(msg: string) {
    console.log(msg);
    logs = [...logs, `${new Date().toLocaleTimeString()}: ${msg}`];
  }

  async function testAuth() {
    isLoading = true;
    logs = [];
    
    try {
      log(`Testing ${flow} for ${email}`);
      
      // First check auth state
      log('Checking current auth state...');
      const state = await convex.action(api.debugAuth.checkAuthState, { email });
      log(`Found ${state.accounts.length} accounts for this email`);
      log(`Total users in system: ${state.userCount}`);
      
      if (state.accounts.length > 0) {
        const acc = state.accounts[0];
        log(`Account exists: ${acc.id}`);
        log(`Has secret: ${acc.hasSecret}`);
        log(`Secret length: ${acc.secretLength}`);
      }

      // Try debug sign in
      log(`Attempting ${flow}...`);
      const result = await convex.action(api.debugAuth.debugSignIn, {
        email,
        password,
        flow,
      });
      
      log('SUCCESS!');
      log(JSON.stringify(result, null, 2));
    } catch (e) {
      log('ERROR: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      isLoading = false;
    }
  }

  async function clearAll() {
    log('Clearing all auth data...');
    try {
      await convex.mutation(api.clearAuth.clearAllAuthData);
      await convex.mutation(api.clearData.clearAll);
      log('Cleared!');
    } catch (e) {
      log('Error clearing: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
</script>

<svelte:head>
  <title>Debug Auth - LiftLog</title>
</svelte:head>

<div class="min-h-screen p-4 bg-bg">
  <div class="max-w-lg mx-auto">
    <h1 class="text-2xl font-bold mb-4">Auth Debugger</h1>
    
    <div class="bg-surface rounded-xl p-4 mb-4 space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          bind:value={email}
          class="w-full bg-bg border border-surface-light rounded-xl px-4 py-2"
          placeholder="test@example.com"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Password (min 8 chars)</label>
        <input
          type="text"
          bind:value={password}
          class="w-full bg-bg border border-surface-light rounded-xl px-4 py-2"
        />
      </div>
      
      <div class="flex gap-2">
        <label class="flex items-center gap-2">
          <input type="radio" bind:group={flow} value="signUp" />
          Sign Up
        </label>
        <label class="flex items-center gap-2">
          <input type="radio" bind:group={flow} value="signIn" />
          Sign In
        </label>
      </div>
      
      <div class="flex gap-2">
        <button
          onclick={testAuth}
          disabled={isLoading || !email || password.length < 8}
          class="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-50 rounded-xl p-3 font-semibold"
        >
          {isLoading ? 'Testing...' : 'Test Auth'}
        </button>
        
        <button
          onclick={clearAll}
          class="px-4 py-3 bg-danger/20 text-danger rounded-xl font-medium"
        >
          Clear All
        </button>
      </div>
    </div>
    
    <div class="bg-surface rounded-xl p-4">
      <h2 class="font-semibold mb-2">Logs</h2>
      <div class="bg-black rounded-lg p-3 font-mono text-sm text-green-400 h-96 overflow-y-auto">
        {#each logs as log}
          <div class="mb-1">{log}</div>
        {/each}
        {#if logs.length === 0}
          <div class="text-text-muted">Click "Test Auth" to see logs...</div>
        {/if}
      </div>
    </div>
  </div>
</div>
