// The Battle page's army ribbon ("Undead Legion · next · Lv 8") is shown only when the army it names is new to the player: the first
// time an army becomes the one in front (an unlock, a clear), or after a run against a different army. Once named, it stays up for the
// rest of that visit and is quiet on the next launches. What was last named is kept in localStorage (`lotf-army-shown`, one of the
// keys Start over wipes). Pure, with the store passed in, so the tests run it without a page.

export const ARMY_SHOWN_KEY = 'lotf-army-shown';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

/** The army named on this visit (it stays up until the page closes, so a redraw does not take it away). */
let namedNow: string | null = null;

/** Whether the ribbon names `id` now: a new army is recorded as shown and named for the rest of the visit. */
export function announceArmy(id: string, store: Store | null): boolean {
  if (id === namedNow) return true;
  let last: string | null = null;
  try {
    last = store?.getItem(ARMY_SHOWN_KEY) ?? null;
  } catch {
    /* storage blocked: every visit counts as new */
  }
  if (last === id) return false;
  try {
    store?.setItem(ARMY_SHOWN_KEY, id);
  } catch {
    /* storage blocked */
  }
  namedNow = id;
  return true;
}

/** Forget the visit's army (a fresh page, for the tests). */
export const resetArmyShown = (): void => void (namedNow = null);
