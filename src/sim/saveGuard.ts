// GUARDED-SAVES (docs/notes/guarded-saves.md): a save never stops the game. A phone's storage can be full (the browser's quota for the
// site, 5 MB in Chrome) or refuse a write for another reason (a private window, the storage switched off); `setItem` then throws, and a
// throw from a save made in the middle of the game's own flow (beginning a run, a wave's end, the start-up) stopped that flow for good.
// Every save goes through here: a write that fails is caught, the game carries on with what it holds in memory, and whoever listens
// (the page, `saveNotice.ts`) is told, so the player can be.
// Pure rules: no Pixi, no DOM.

/** Why a save failed: the storage is full, or the write was refused for another reason. */
export type SaveTrouble = 'full' | 'refused';

let listener: ((why: SaveTrouble, key: string) => void) | null = null;

/** The page's ear for a failed save (one listener: the page's notice). */
export function onSaveTrouble(fn: ((why: SaveTrouble, key: string) => void) | null): void {
  listener = fn;
}

/** Whether an error is a storage quota's (the names and codes the browsers give it). */
export function isQuotaError(e: unknown): boolean {
  const x = e as { name?: string; code?: number } | null;
  return !!x && (x.name === 'QuotaExceededError' || x.name === 'NS_ERROR_DOM_QUOTA_REACHED' || x.code === 22 || x.code === 1014);
}

/** Write `value` under `key`. True if it was written; false if the storage refused it (the listener is told why), never a throw. */
export function guardedSave(store: Pick<Storage, 'setItem'>, key: string, value: string): boolean {
  try {
    store.setItem(key, value);
    return true;
  } catch (e) {
    try {
      listener?.(isQuotaError(e) ? 'full' : 'refused', key);
    } catch {
      /* (a notice that fails is no reason to stop either) */
    }
    return false;
  }
}
