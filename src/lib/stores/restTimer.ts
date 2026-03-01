import { writable, derived } from 'svelte/store';

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
  const { subscribe, set, update } = writable<RestTimerState>({
    isRunning: false,
    endTime: null,
    remaining: 0,
    isFailure: false
  });

  let interval: ReturnType<typeof setInterval> | null = null;
  let soundPlayed = false;

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

  function startTimer(isFailure: boolean = false, onComplete?: () => void) {
    const restTime = isFailure ? REST_TIME_FAILURE : REST_TIME_SUCCESS;
    const endTime = Date.now() + restTime * 1000;
    
    // Clear any existing interval
    if (interval) {
      clearInterval(interval);
    }
    
    soundPlayed = false;
    
    set({
      isRunning: true,
      endTime,
      remaining: restTime,
      isFailure,
      onComplete
    });

    // Start the interval
    interval = setInterval(() => {
      update(state => {
        if (!state.endTime) return state;
        
        const remaining = Math.ceil((state.endTime - Date.now()) / 1000);
        
        // Play sound when timer reaches zero
        if (remaining < 0 && !soundPlayed) {
          soundPlayed = true;
          playRestCompleteSound();
        }
        
        return { ...state, remaining };
      });
    }, 100);
  }

  function skipTimer() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    
    const state = { isRunning: false, endTime: null, remaining: 0, isFailure: false };
    set(state);
  }

  function completeTimer() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    
    let onComplete: (() => void) | undefined;
    
    update(state => {
      onComplete = state.onComplete;
      return { isRunning: false, endTime: null, remaining: 0, isFailure: false };
    });
    
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

  return {
    subscribe,
    start: startTimer,
    skip: skipTimer,
    complete: completeTimer,
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
