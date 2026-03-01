import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { navVisibilityStore } from '../../convex';

describe('Navigation Visibility Store', () => {
  beforeEach(() => {
    // Reset to default state
    navVisibilityStore.set({ hideMainNav: false });
  });

  it('should have default state with nav visible', () => {
    const state = get(navVisibilityStore);
    expect(state.hideMainNav).toBe(false);
  });

  it('should hide nav when entering exercise view', () => {
    navVisibilityStore.set({ hideMainNav: true });
    const state = get(navVisibilityStore);
    expect(state.hideMainNav).toBe(true);
  });

  it('should show nav when leaving exercise view', () => {
    // First hide it
    navVisibilityStore.set({ hideMainNav: true });
    expect(get(navVisibilityStore).hideMainNav).toBe(true);
    
    // Then show it
    navVisibilityStore.set({ hideMainNav: false });
    expect(get(navVisibilityStore).hideMainNav).toBe(false);
  });

  it('should maintain state until explicitly changed', () => {
    navVisibilityStore.set({ hideMainNav: true });
    
    // Read multiple times - should stay the same
    expect(get(navVisibilityStore).hideMainNav).toBe(true);
    expect(get(navVisibilityStore).hideMainNav).toBe(true);
    expect(get(navVisibilityStore).hideMainNav).toBe(true);
  });
});
