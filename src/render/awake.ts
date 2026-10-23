// Keeps the phone's screen on while the game is showing, using the Screen Wake Lock API where the browser has it: taken
// when the page is visible, taken again when it comes back to the front (the browser drops the lock when it is hidden),
// and let go when it is hidden or the setting is turned off. Browsers without the API (and any refusal) are quietly
// ignored: the game plays on either way. Nothing here touches the battle.

import { onSettings, settings } from '../settings';

/** The bit of the wake lock API this module uses (typed here so older TypeScript lib files don't matter). */
interface WakeSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
}

interface WakeNavigator {
  wakeLock?: { request(type: 'screen'): Promise<WakeSentinel> };
}

/** Whether the lock is wanted: the setting is on (the page being visible is checked when asking). */
let wanted = false;
let sentinel: WakeSentinel | null = null;
/** A request is in flight (so a second one, from a visibility change, waits for it). */
let asking = false;

/** Re-reads the setting and takes or lets go of the lock to match. Called at the start and whenever a setting changes. */
export function syncAwake(): void {
  wanted = settings().awake;
  if (wanted) void request();
  else void release();
}

/** The game's start: keep the screen on while the page shows (if the setting allows), and follow the setting and visibility. */
export function startAwake(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  onSettings(syncAwake);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncAwake();
    else void release();
  });
  // (some browsers drop the lock without a visibility change: a tap or a return to the page asks again, which costs nothing when held)
  window.addEventListener('pageshow', syncAwake);
  window.addEventListener('pointerdown', () => wanted && !sentinel && void request(), true);
}
let started = false;

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
