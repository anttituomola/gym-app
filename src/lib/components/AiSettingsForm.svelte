<script lang="ts">
  import { onMount } from 'svelte';
  import { aiSettingsStore, aiAvailable, testAiConnection, getAiToken } from '$lib/stores/aiSettings';
  import { detectProviderFromKey, getDefaultModel } from '$lib/services/equipmentRecognition';
  import type { LlmConfig } from '$lib/types/ai';
  
  // Local state
  let apiKey = '';
  let showKey = false;
  let isTesting = false;
  let testResult: { success: boolean; message: string } | null = null;
  let isSaving = false;
  let hasExistingKey = false;
  let detectedProvider: 'openai' | 'anthropic' | null = null;
  
  // Initialize from store
  onMount(() => {
    aiSettingsStore.init();
    
    // Check if there's an existing token
    const token = getAiToken();
    hasExistingKey = !!token;
  });
  
  // Auto-detect provider when API key changes
  $: {
    if (apiKey.trim()) {
      detectedProvider = detectProviderFromKey(apiKey.trim());
    } else {
      detectedProvider = null;
    }
  }
  
  // Get provider from key (either detected or stored)
  function getProvider(): 'openai' | 'anthropic' | null {
    return detectedProvider || $aiSettingsStore.provider;
  }
  
  // Test the API connection
  async function handleTest() {
    if (!apiKey.trim()) {
      testResult = { success: false, message: 'Please enter an API key' };
      return;
    }
    
    const provider = getProvider();
    if (!provider) {
      testResult = { success: false, message: 'Could not detect provider from API key format. Please check your key.' };
      return;
    }
    
    isTesting = true;
    testResult = null;
    
    const config: LlmConfig = {
      provider,
      apiKey: apiKey.trim(),
    };
    
    const result = await testAiConnection(config);
    
    testResult = {
      success: result.success,
      message: result.success 
        ? `Connection successful! Detected ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} (${getDefaultModel(provider)}).`
        : result.error || 'Connection failed',
    };
    
    isTesting = false;
  }
  
  // Save settings
  async function handleSave() {
    if (!apiKey.trim()) {
      testResult = { success: false, message: 'Please enter an API key' };
      return;
    }
    
    const provider = getProvider();
    if (!provider) {
      testResult = { success: false, message: 'Could not detect provider from API key format. Please check your key.' };
      return;
    }
    
    isSaving = true;
    
    try {
      aiSettingsStore.setToken(apiKey.trim(), provider);
      testResult = { success: true, message: `Settings saved! Using ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} (${getDefaultModel(provider)}).` };
      hasExistingKey = true;
      apiKey = ''; // Clear the input for security
      detectedProvider = null;
    } catch (e) {
      testResult = { 
        success: false, 
        message: e instanceof Error ? e.message : 'Failed to save settings' 
      };
    } finally {
      isSaving = false;
    }
  }
  
  // Clear settings
  function handleClear() {
    if (confirm('Are you sure you want to remove your API key?')) {
      aiSettingsStore.clearToken();
      testResult = { success: true, message: 'API key removed' };
      hasExistingKey = false;
      apiKey = '';
    }
  }
  
  // Toggle AI enabled/disabled
  function toggleEnabled() {
    aiSettingsStore.setEnabled(!$aiSettingsStore.enabled);
  }
</script>

<div class="bg-surface rounded-xl p-4">
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
      <h2 class="text-lg font-semibold">AI Workout Modifications</h2>
      <span class="text-xs px-2 py-0.5 rounded-full { $aiAvailable ? 'bg-success/20 text-success' : 'bg-text-muted/20 text-text-muted' }">
        { $aiAvailable ? 'Active' : 'Inactive' }
      </span>
    </div>
    
    {#if $aiSettingsStore.hasToken}
      <button
        onclick={toggleEnabled}
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {
          $aiSettingsStore.enabled ? 'bg-primary' : 'bg-surface-light'
        }"
        aria-label="Toggle AI"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {
            $aiSettingsStore.enabled ? 'translate-x-6' : 'translate-x-1'
          }"
        ></span>
      </button>
    {/if}
  </div>
  
  <p class="text-sm text-text-muted mb-4">
    Use AI to modify workouts on the fly. Your API key is stored locally in your browser and never sent to our servers.
  </p>
  
  {#if !$aiSettingsStore.hasToken}
    <div class="bg-surface-light rounded-xl p-4 space-y-4">
      <!-- API Key Input -->
      <div>
        <label for="api-key-input" class="text-sm font-medium mb-2 block">API Key</label>
        <div class="relative">
          <input
            id="api-key-input"
            type={showKey ? 'text' : 'password'}
            bind:value={apiKey}
            placeholder="Paste your OpenAI or Anthropic API key..."
            class="w-full bg-bg rounded-xl px-4 py-3 pr-10"
          />
          <button
            onclick={() => showKey = !showKey}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {#if showKey}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            {:else}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>
        <p class="text-xs text-text-muted mt-1">
          Your key is stored locally in your browser's localStorage.
        </p>
        
        <!-- Auto-detection indicator -->
        {#if detectedProvider}
          <div class="mt-2 flex items-center gap-2 text-sm">
            <span class="text-success">✓</span>
            <span class="text-text">
              Detected: <strong>{detectedProvider === 'openai' ? 'OpenAI' : 'Anthropic'}</strong>
              ({getDefaultModel(detectedProvider)})
            </span>
          </div>
        {:else if apiKey.trim()}
          <div class="mt-2 text-sm text-warning">
            ⚠️ Could not detect provider. Key should start with "sk-" (OpenAI) or "sk-ant-" (Anthropic).
          </div>
        {/if}
      </div>
      
      <!-- Test Result -->
      {#if testResult}
        <div class="rounded-xl p-3 text-sm {
          testResult.success 
            ? 'bg-success/20 text-success' 
            : 'bg-danger/20 text-danger'
        }">
          {testResult.message}
        </div>
      {/if}
      
      <!-- Actions -->
      <div class="flex gap-2">
        <button
          onclick={handleTest}
          disabled={!apiKey.trim() || isTesting}
          class="flex-1 py-3 bg-surface-light hover:bg-surface-light/80 disabled:opacity-50 rounded-xl font-medium"
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onclick={handleSave}
          disabled={!apiKey.trim() || isSaving}
          class="flex-1 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 rounded-xl font-semibold"
        >
          {isSaving ? 'Saving...' : 'Save Key'}
        </button>
      </div>
    </div>
    
    <!-- Help Links -->
    <div class="mt-4 text-sm text-text-muted space-y-1">
      <p>
        Don't have an API key? Get one from 
        <a 
          href="https://platform.openai.com/api-keys" 
          target="_blank" 
          rel="noopener"
          class="text-primary hover:underline"
        >
          OpenAI
        </a>
        or
        <a 
          href="https://console.anthropic.com/settings/keys" 
          target="_blank" 
          rel="noopener"
          class="text-primary hover:underline"
        >
          Anthropic →
        </a>
      </p>
      <p class="text-xs">
        Costs approximately $0.01-0.02 per workout modification.
      </p>
    </div>
  {:else}
    <!-- Existing Key State -->
    <div class="bg-success/10 border border-success/30 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-success">✓</span>
        <span class="font-semibold">API Key Configured</span>
      </div>
      <p class="text-sm text-text-muted mb-3">
        Provider: {$aiSettingsStore.provider === 'openai' ? 'OpenAI' : 'Anthropic'}
        <br>
        Status: { $aiSettingsStore.enabled ? 'Enabled' : 'Disabled' }
      </p>
      <button
        onclick={handleClear}
        class="text-sm text-danger hover:underline"
      >
        Remove API Key
      </button>
    </div>
    
    {#if testResult}
      <div class="mt-3 rounded-xl p-3 text-sm {
        testResult.success 
          ? 'bg-success/20 text-success' 
          : 'bg-danger/20 text-danger'
      }">
        {testResult.message}
      </div>
    {/if}
  {/if}
</div>
