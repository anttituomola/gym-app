import { writable, derived, get } from 'svelte/store';

// Rest timer state
export interface RestTimerState {
  isRunning: boolean;
  endTime: number | null;
  remaining: number;
  isFailure: boolean;
  onComplete?: () => void;
}

const REST_TIME_SUCCESS = 180; // 3 minutes in seconds
const REST_TIME_FAILURE = 300; // 5 minutes in seconds

function createRestTimerStore() {
  // Internal state that won't be exposed directly
  let currentState: RestTimerState = {
    isRunning: false,
    endTime: null,
    remaining: 0,
    isFailure: false
  };

  const { subscribe, set } = writable<RestTimerState>(currentState);

  let interval: ReturnType<typeof setInterval> | null = null;
  let soundPlayed = false;
  let currentOnComplete: (() => void) | undefined = undefined;
  let currentOnSkip: (() => void) | undefined = undefined;

  // Audio for rest timer completion
  function playRestCompleteSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      // Audio not supported
    }
  }

  // Update the store with current state - always creates a new object
  function updateStore(newState: Partial<RestTimerState>) {
    currentState = { ...currentState, ...newState };
    set(currentState);
  }

  function tick() {
    if (!currentState.endTime) return;
    
    const remaining = Math.ceil((currentState.endTime - Date.now()) / 1000);
    
    // Play sound when timer reaches zero
    if (remaining < 0 && !soundPlayed) {
      soundPlayed = true;
      playRestCompleteSound();
    }
    
    // Always update with a new state object to ensure reactivity
    updateStore({ remaining });
  }

  function startTimer(isFailure: boolean = false, onComplete?: () => void, onSkip?: () => void) {
    const restTime = isFailure ? REST_TIME_FAILURE : REST_TIME_SUCCESS;
    const endTime = Date.now() + restTime * 1000;
    
    // Clear any existing interval
    if (interval) {
      clearInterval(interval);
    }
    
    soundPlayed = false;
    currentOnComplete = onComplete;
    currentOnSkip = onSkip;
    
    // Set initial state
    currentState = {
      isRunning: true,
      endTime,
      remaining: restTime,
      isFailure,
      onComplete
    };
    set(currentState);

    // Start the interval - tick immediately and then every 100ms
    tick();
    interval = setInterval(tick, 100);
  }

  function skipTimer() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    
    const onSkip = currentOnSkip;
    currentOnComplete = undefined;
    currentOnSkip = undefined;
    currentState = { isRunning: false, endTime: null, remaining: 0, isFailure: false };
    set(currentState);
    
    if (onSkip) {
      onSkip();
    }
  }

  function completeTimer() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    
    const onComplete = currentOnComplete;
    currentOnComplete = undefined;
    
    currentState = { isRunning: false, endTime: null, remaining: 0, isFailure: false };
    set(currentState);
    
    if (onComplete) {
      onComplete();
    }
  }

  function cleanup() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function setOnSkip(callback: (() => void) | undefined) {
    currentOnSkip = callback;
  }

  return {
    subscribe,
    start: startTimer,
    skip: skipTimer,
    complete: completeTimer,
    setOnSkip,
    cleanup
  };
}

export const restTimer = createRestTimerStore();

// Derived store for formatted time
export const formattedRestTime = derived(restTimer, $restTimer => {
  const seconds = $restTimer.remaining;
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const sign = isNegative ? '-' : '';
  return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
});

// Constants for reference
export { REST_TIME_SUCCESS, REST_TIME_FAILURE };
