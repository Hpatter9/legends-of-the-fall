// VAELKHAR-HEART (the owner's answer: "Give it back for a gift"): Vaelkhar's Heart is a Storied relic, and a relic lives only in a run
// (`run.relics`). So the save keeps one fact of it in `Meta.eidolons.heart`: 'held' once any settled fight, or any run saved in one of the
// page's slots, held it; 'returned' once Vaelkhar has been bound with it held. At his binding he takes the Heart back, in his own voice, and
// the War Horn keeps a gift: when he answers it, the heroes drain a little more (`DRAIN_GIFT`). Nothing about the Heart in a run changes: a
// relic is a loan for the length of a run, and he lets the run keep it to the end.
//
// Pure rules (the slot reader takes the page's storage as a parameter): no Pixi, no DOM, no randomness.

import type { HornMeta } from './warHorn';
import type { BindingBeat } from './eidolonChainData';

/** The Storied relic he wants back. */
export const HEART = 'dragonHeart';
/** What the gift adds to the share of the damage his heroes drain while he answers (25% becomes 30%). */
export const DRAIN_GIFT = 0.05;
/** The page's run slots, each a saved run whose relics may include the Heart. */
const SLOT_KEYS = ['legends.run', 'legends.tower', 'legends.calamity', 'legends.questRun'] as const;

type Store = Pick<Storage, 'getItem'>;

export const heartHeld = (m: HornMeta): boolean => m.eidolons?.heart === 'held';
export const heartReturned = (m: HornMeta): boolean => m.eidolons?.heart === 'returned';

/** Note the relics a run holds: if the Heart is among them, the save remembers it (never undoes a return). True when this was the first time. */
export function noteHeart(m: HornMeta, relics: readonly string[] | undefined): boolean {
  if (!relics?.includes(HEART) || m.eidolons?.heart) return false;
  (m.eidolons ??= { horn: 0 }).heart = 'held';
  return true;
}

/** Look in the page's saved runs for the Heart (a run still going holds relics the meta has not seen). */
export function noteSavedHeart(m: HornMeta, store?: Store): boolean {
  let found = false;
  const s = store ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  if (!s) return false;
  for (const k of SLOT_KEYS) {
    try {
      const run = JSON.parse(s.getItem(k) ?? 'null') as { relics?: unknown } | null;
      if (Array.isArray(run?.relics) && noteHeart(m, run!.relics as string[])) found = true;
    } catch {
      /* (a slot that will not read holds nothing) */
    }
  }
  return found;
}

/** Vaelkhar is bound: if the Heart was held, he takes it back and the gift is the horn's from now. True when it was returned now. */
export function returnHeart(m: HornMeta): boolean {
  if (!heartHeld(m)) return false;
  m.eidolons!.heart = 'returned';
  return true;
}

/** The share his answer drains: the gift is added once the Heart has been returned. */
export const drainBonus = (m: HornMeta): number => (heartReturned(m) ? DRAIN_GIFT : 0);

/** His binding with the Heart held: he takes it back, and names the gift, before the seal. The beats after the Heart's are pushed later. */
export function withHeart(beats: readonly BindingBeat[]): BindingBeat[] {
  const bound = beats.findIndex((b) => b.beat === 'bound');
  if (bound < 0) return [...beats];
  const at = beats[bound].at;
  const extra: BindingBeat[] = [
    { at, beat: 'line', who: 'eidolon', text: 'Ah. And there is my heart. You kept it warm. I will take it back, if I may: a heart is no use in a drawer. Keep the use of it until your run is out, and take this in its place. A dragon pays his debts.' },
    { at: at + 4200, beat: 'line', who: 'narrator', text: "Vaelkhar's Heart goes home. The War Horn warms in your hand: when he answers it, your heroes will drain 30% of the damage they deal, not 25%." },
  ];
  return [...beats.slice(0, bound), ...extra, { ...beats[bound], at: at + 8200 }, ...beats.slice(bound + 1)];
}
