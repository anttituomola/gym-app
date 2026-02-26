import { writable, derived, get } from 'svelte/store';
import type { LlmConfig } from '$lib/types/ai';

/**
 * AI Settings Store
 * 
 * Manages user AI configuration including:
 * - API token (stored in localStorage only)
 * - Provider selection (OpenAI/Anthropic)
 * - Enable/disable state
 * 
 * Tokens are NEVER sent to our servers - stored only in browser localStorage.
 */

// Storage keys
const STORAGE_KEY_TOKEN = 'liftlog_ai_token';
const STORAGE_KEY_PROVIDER = 'liftlog_ai_provider';
const STORAGE_KEY_ENABLED = 'liftlog_ai_enabled';

// ============================================================================
// Types
// ============================================================================

interface AiSettingsState {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | null;
  hasToken: boolean;
  isLoading: boolean;
}

// ============================================================================
// Store Definition
// ============================================================================

function createAiSettingsStore() {
  const { subscribe, set, update } = writable<AiSettingsState>({
    enabled: false,
    provider: null,
    hasToken: false,
    isLoading: true,
  });

  return {
    subscribe,
    
    /**
     * Initialize settings from localStorage
     * Call this on app startup
     */
    init: () => {
      if (typeof window === 'undefined') return;
      
      try {
        const token = localStorage.getItem(STORAGE_KEY_TOKEN);
        const provider = localStorage.getItem(STORAGE_KEY_PROVIDER) as 'openai' | 'anthropic' | null;
        const enabled = localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
        
        set({
          enabled: enabled && !!token,
          provider,
          hasToken: !!token,
          isLoading: false,
        });
      } catch (e) {
        console.error('Failed to load AI settings:', e);
        update(state => ({ ...state, isLoading: false }));
      }
    },

    /**
     * Save API token to localStorage
     */
    setToken: (token: string, provider: 'openai' | 'anthropic') => {
      if (typeof window === 'undefined') return;
      
      try {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
        localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
        
        update(state => ({
          ...state,
          enabled: true,
          provider,
          hasToken: true,
        }));
      } catch (e) {
        console.error('Failed to save AI token:', e);
        throw new Error('Failed to save API token');
      }
    },

    /**
     * Clear stored token
     */
    clearToken: () => {
      if (typeof window === 'undefined') return;
      
      try {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_PROVIDER);
        localStorage.removeItem(STORAGE_KEY_ENABLED);
        
        update(state => ({
          ...state,
          enabled: false,
          provider: null,
          hasToken: false,
        }));
      } catch (e) {
        console.error('Failed to clear AI token:', e);
      }
    },

    /**
     * Enable/disable AI features
     */
    setEnabled: (enabled: boolean) => {
      if (typeof window === 'undefined') return;
      
      try {
        localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
        
        update(state => ({
          ...state,
          enabled: enabled && state.hasToken,
        }));
      } catch (e) {
        console.error('Failed to update AI enabled state:', e);
      }
    },
  };
}

export const aiSettingsStore = createAiSettingsStore();

// ============================================================================
// Helper Functions (not part of store, but related)
// ============================================================================

/**
 * Get the current API token (for making requests)
 */
export function getAiToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

/**
 * Get full LLM config for making requests
 */
export function getLlmConfig(): LlmConfig | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const provider = localStorage.getItem(STORAGE_KEY_PROVIDER) as 'openai' | 'anthropic' | null;
  
  if (!token || !provider) return null;
  
  return {
    provider,
    apiKey: token,
  };
}

/**
 * Check if AI is properly configured
 */
export function isAiConfigured(): boolean {
  const state = get(aiSettingsStore);
  return state.enabled && state.hasToken && !!state.provider;
}

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * Whether AI features are available to use
 */
export const aiAvailable = derived(
  aiSettingsStore,
  $settings => $settings.enabled && $settings.hasToken && !$settings.isLoading
);

/**
 * Current provider name for display
 */
export const aiProviderName = derived(
  aiSettingsStore,
  $settings => {
    switch ($settings.provider) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      default: return null;
    }
  }
);

// ============================================================================
// Test Connection
// ============================================================================

/**
 * Test the AI connection by making a simple API call
 */
export async function testAiConnection(config: LlmConfig): Promise<{ success: boolean; error?: string }> {
  try {
    let response;
    
    if (config.provider === 'openai') {
      response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });
    } else {
      response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
    }

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error: `API error: ${response.status} - ${error}` };
    }
  } catch (e) {
    return { 
      success: false, 
      error: e instanceof Error ? e.message : 'Connection failed' 
    };
  }
}

// ============================================================================
// Encryption Utilities (for future encrypted storage)
// ============================================================================

// Note: For MVP, we use localStorage only. 
// These are placeholders for future encrypted storage option.

export async function encryptToken(token: string, _key: string): Promise<string> {
  // Placeholder - would implement actual encryption
  // For now, just return as-is (localStorage only)
  return token;
}

export async function decryptToken(encrypted: string, _key: string): Promise<string> {
  // Placeholder
  return encrypted;
}
