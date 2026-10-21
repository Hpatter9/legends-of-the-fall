// Keeps the phone's screen on during a fight, using the Screen Wake Lock API where the browser has it. Browsers without
// it (and any refusal) are quietly ignored: the fight plays on either way. Nothing here touches the battle.

/** The bit of the wake lock API this module uses (typed here so older TypeScript lib files don't matter). */
interface WakeSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
}

interface WakeNavigator {
  wakeLock?: { request(type: 'screen'): Promise<WakeSentinel> };
}

/** Whether a fight is on, so the lock is asked for again when the page comes back to the front. */
let wanted = false;
let sentinel: WakeSentinel | null = null;
/** A request is in flight (so a second one, from a visibility change, waits for it). */
let asking = false;

/** Turn the screen-on lock on (a fight starts) or off (the fight ends). */
export function keepAwake(on: boolean): void {
  wanted = on;
  if (on) void request();
  else void release();
}

async function request(): Promise<void> {
  try {
    const wake = (navigator as WakeNavigator).wakeLock;
    if (!wake || sentinel || asking || document.visibilityState !== 'visible') return;
    asking = true;
    let lock: WakeSentinel;
    try {
      lock = await wake.request('screen');
    } finally {
      asking = false;
    }
    // (the browser drops the lock when the page is hidden: forget it so the next request gets a fresh one)
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
    // (the fight may have ended while the request was pending)
    if (!wanted) void lock.release().catch(() => {});
    else sentinel = lock;
  } catch {
    // (refused, or no wake lock here: the fight is unaffected)
  }
}

async function release(): Promise<void> {
  const lock = sentinel;
  sentinel = null;
  try {
    if (lock && !lock.released) await lock.release();
  } catch {
    // (already gone)
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') void request();
  });
}
