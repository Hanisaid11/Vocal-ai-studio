/**
 * Mobile Haptic Feedback helper
 * Uses navigator.vibrate on Android / supported devices
 */

export const haptics = {
  // Light tick for keyboard touch / toggle
  tap: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore if disabled by device
      }
    }
  },

  // Success pulse when hitting target pitch
  pitchMatch: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([15, 30, 25]);
      } catch {
        // Ignore
      }
    }
  },

  // Warning for pitch strain or out of range
  alert: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([50, 40, 50]);
      } catch {
        // Ignore
      }
    }
  },

  // Lost streak pattern
  streakLost: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {
        // Ignore
      }
    }
  },

  // Celebratory victory pattern for completed streak/workout
  streakWon: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 40, 20, 40, 60]);
      } catch {
        // Ignore
      }
    }
  },
};
