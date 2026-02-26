import { z } from "zod";
import { d as derived, w as writable } from "./index.js";
const PlannedExerciseSchema = z.object({
  exerciseId: z.string().min(1).max(50),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(0).max(100),
  // Allow 0 for time-based exercises
  weight: z.number().min(0).max(1e3),
  timeSeconds: z.number().int().min(1).max(600).optional()
});
const ChangeSchema = z.object({
  type: z.enum([
    "replace",
    // Exercise replaced with another
    "modify_sets",
    // Number of sets changed
    "modify_reps",
    // Number of reps changed
    "modify_weight",
    // Weight changed
    "reorder",
    // Exercise order changed
    "remove",
    // Exercise removed
    "add"
    // Exercise added
  ]),
  originalExerciseId: z.string().optional(),
  newExerciseId: z.string().optional(),
  reason: z.string().min(1).max(200),
  details: z.string().max(200).optional()
  // Additional context
});
z.object({
  summary: z.string().min(10).max(500),
  newPlan: z.array(PlannedExerciseSchema).min(1).max(20),
  changes: z.array(ChangeSchema).min(1),
  warnings: z.array(z.string().max(200)).max(5)
});
const STORAGE_KEY_TOKEN = "liftlog_ai_token";
const STORAGE_KEY_PROVIDER = "liftlog_ai_provider";
const STORAGE_KEY_ENABLED = "liftlog_ai_enabled";
function createAiSettingsStore() {
  const { subscribe, set, update } = writable({
    enabled: false,
    provider: null,
    hasToken: false,
    isLoading: true
  });
  return {
    subscribe,
    /**
     * Initialize settings from localStorage
     * Call this on app startup
     */
    init: () => {
      if (typeof window === "undefined") return;
      try {
        const token = localStorage.getItem(STORAGE_KEY_TOKEN);
        const provider = localStorage.getItem(STORAGE_KEY_PROVIDER);
        const enabled = localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
        set({
          enabled: enabled && !!token,
          provider,
          hasToken: !!token,
          isLoading: false
        });
      } catch (e) {
        console.error("Failed to load AI settings:", e);
        update((state) => ({ ...state, isLoading: false }));
      }
    },
    /**
     * Save API token to localStorage
     */
    setToken: (token, provider) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
        localStorage.setItem(STORAGE_KEY_ENABLED, "true");
        update((state) => ({
          ...state,
          enabled: true,
          provider,
          hasToken: true
        }));
      } catch (e) {
        console.error("Failed to save AI token:", e);
        throw new Error("Failed to save API token");
      }
    },
    /**
     * Clear stored token
     */
    clearToken: () => {
      if (typeof window === "undefined") return;
      try {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_PROVIDER);
        localStorage.removeItem(STORAGE_KEY_ENABLED);
        update((state) => ({
          ...state,
          enabled: false,
          provider: null,
          hasToken: false
        }));
      } catch (e) {
        console.error("Failed to clear AI token:", e);
      }
    },
    /**
     * Enable/disable AI features
     */
    setEnabled: (enabled) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
        update((state) => ({
          ...state,
          enabled: enabled && state.hasToken
        }));
      } catch (e) {
        console.error("Failed to update AI enabled state:", e);
      }
    }
  };
}
const aiSettingsStore = createAiSettingsStore();
const aiAvailable = derived(
  aiSettingsStore,
  ($settings) => $settings.enabled && $settings.hasToken && !$settings.isLoading
);
derived(
  aiSettingsStore,
  ($settings) => {
    switch ($settings.provider) {
      case "openai":
        return "OpenAI";
      case "anthropic":
        return "Anthropic";
      default:
        return null;
    }
  }
);
export {
  aiAvailable as a,
  aiSettingsStore as b
};
