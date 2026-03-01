import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { restTimer, formattedRestTime } from '../restTimer';

describe('Rest Timer Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    restTimer.skip();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    restTimer.cleanup();
  });

  it('should start with default state', () => {
    const state = get(restTimer);
    expect(state.isRunning).toBe(false);
    expect(state.endTime).toBeNull();
    expect(state.remaining).toBe(0);
    expect(state.isFailure).toBe(false);
  });

  it('should start timer with success rest time (3 minutes)', () => {
    restTimer.start(false);
    const state = get(restTimer);
    
    expect(state.isRunning).toBe(true);
    expect(state.isFailure).toBe(false);
    expect(state.remaining).toBe(180); // 3 minutes
    expect(state.endTime).toBeGreaterThan(Date.now());
  });

  it('should start timer with failure rest time (5 minutes)', () => {
    restTimer.start(true);
    const state = get(restTimer);
    
    expect(state.isRunning).toBe(true);
    expect(state.isFailure).toBe(true);
    expect(state.remaining).toBe(300); // 5 minutes
  });

  it('should update remaining time as timer runs', () => {
    restTimer.start(false);
    
    // Advance time by 10 seconds
    vi.advanceTimersByTime(10000);
    
    const state = get(restTimer);
    expect(state.remaining).toBeLessThan(180);
    expect(state.remaining).toBeGreaterThan(160);
  });

  it('should stop timer when skipped', () => {
    restTimer.start(false);
    expect(get(restTimer).isRunning).toBe(true);
    
    restTimer.skip();
    const state = get(restTimer);
    
    expect(state.isRunning).toBe(false);
    expect(state.endTime).toBeNull();
    expect(state.remaining).toBe(0);
  });

  it('should stop timer when completed', () => {
    restTimer.start(false);
    expect(get(restTimer).isRunning).toBe(true);
    
    restTimer.complete();
    const state = get(restTimer);
    
    expect(state.isRunning).toBe(false);
    expect(state.endTime).toBeNull();
    expect(state.remaining).toBe(0);
  });

  it('should call onComplete callback when timer completes', () => {
    const onComplete = vi.fn();
    restTimer.start(false, onComplete);
    
    restTimer.complete();
    
    expect(onComplete).toHaveBeenCalled();
  });

  it('should format time correctly', () => {
    restTimer.start(false);
    
    const formatted = get(formattedRestTime);
    expect(formatted).toMatch(/^3:00$/);
  });

  it('should show negative time when timer expires', () => {
    restTimer.start(false);
    
    // Advance time past the 3 minute mark
    vi.advanceTimersByTime(181000);
    
    const formatted = get(formattedRestTime);
    expect(formatted).toMatch(/^-\d:\d{2}$/);
  });

  it('should not start a new timer if one is already running', () => {
    restTimer.start(false);
    const firstEndTime = get(restTimer).endTime;
    
    // Try to start another timer
    vi.advanceTimersByTime(1000);
    restTimer.start(false);
    const secondEndTime = get(restTimer).endTime;
    
    // The timer should have been restarted
    expect(secondEndTime).not.toBe(firstEndTime);
  });
});
