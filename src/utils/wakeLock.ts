/**
 * Screen Wake Lock API helper for mobile devices
 * Prevents screen from dimming/sleeping during vocal warmups.
 */

let wakeLockSentinel: unknown = null;

export async function requestWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } }).wakeLock.request('screen');
      return true;
    } catch (err) {
      console.warn('Wake Lock request rejected:', err);
      return false;
    }
  }
  return false;
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel && typeof (wakeLockSentinel as { release?: () => Promise<void> }).release === 'function') {
    try {
      await (wakeLockSentinel as { release: () => Promise<void> }).release();
      wakeLockSentinel = null;
    } catch (err) {
      console.warn('Wake Lock release error:', err);
    }
  }
}
