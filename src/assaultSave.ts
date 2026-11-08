// The assault under way, kept in the browser (phase 2, `docs/notes/assault-2.md`): the page's store for `sim/assault/snapshot.ts`. The whole
// battle goes into IndexedDB (about 700 KB, too big for the save's local storage), as a structured clone, every twenty seconds of battle time;
// a reload takes it back out to resume. Every call is safe to fail: with no store (a private window), there is simply no resume.

import type { Battle } from './sim/battle';

const DB = 'legends.assault';
const STORE = 'battle';
const KEY = 'live';

function open(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

async function run<T>(mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  if (!db) return undefined;
  return new Promise((ok) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = act(tx.objectStore(STORE));
      tx.oncomplete = () => {
        db.close();
        ok(req ? (req.result as T) : undefined);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        ok(undefined);
      };
    } catch {
      db.close();
      ok(undefined);
    }
  });
}

/** Store the battle as it stands now (cloned at once, so the fight may go on). */
export async function saveBattle(b: Battle): Promise<void> {
  // (cloned now, before any wait, so it is the battle of this very tick)
  let copy: Battle;
  try {
    copy = structuredClone(b);
  } catch {
    return;
  }
  await run('readwrite', (s) => {
    s.put(copy, KEY);
  });
}

/** The battle stored, if any. */
export const loadBattle = async (): Promise<Battle | null> => ((await run<Battle>('readonly', (s) => s.get(KEY))) as Battle | undefined) ?? null;

/** Forget the stored battle. */
export async function clearBattle(): Promise<void> {
  await run('readwrite', (s) => {
    s.delete(KEY);
  });
}
