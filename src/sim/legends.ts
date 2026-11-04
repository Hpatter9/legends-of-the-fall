// The named legends' sources, copies and renown (SEVEN-SLOT GEAR batch 2, docs/notes/gear-runes-design.md section 3; the pieces
// themselves are in `legendBases.ts`). Each legend comes from one place in the game, so finding it is an event. The game asks the save
// whether a source is met (`legendsEarned`: an army's tier cleared, the spire's or the Calamity's depth, a quest handed in, a daily streak,
// Hester's standing...), so no mode has to know about legends; `claimLegends` gives each one earned once, as a Legendary piece in the
// stash, and remembers it (`Meta.legends`), so a save holds one copy of each for good (a legend is never sold or combined). A legend's
// renown is the waves it has fought (`noteRenown`, from `settleWear`); its verses open at 25, 100 and 300 (`legendRenown.ts`).
// Pure rules: no Pixi, no DOM, no randomness.

import { EQUIP_BASES, LEGEND_LIST } from './equipBases';
import { grantEquipment, type Equipment } from './equipment';
import { RENOWN_STEPS, renownStep } from './legendRenown';
import type { Meta } from './meta';
import { standingOf } from './stall';
import { heartHeld, heartReturned } from './vaelkharHeart';

export { RENOWN_STEPS, renownStep };
/** The grade and item level a legend is found at. */
export const LEGEND_GRADE = 4;
export const LEGEND_LEVEL = 12;
/** Floors to a spire act (the spire's `ACT_ROWS`): an act's guardian stands on its last. */
const ACT_ROWS = 13;
/** Waves a hero must fight for the Pilgrim's Cord. */
export const PILGRIM_WAVES = 100;
/** Days in a row of daily clears for the Widow's Bow. */
export const WIDOW_STREAK = 30;

/** Whether an army has been cleared on a tier or a harder one (0 Normal, 1 Hard, 2 Elite, 3 Legendary, 4 Mythic). */
export function clearedTier(m: Meta, army: string, tier: number): boolean {
  const rec = m.armies?.[army];
  if (!rec) return false;
  for (let t = tier; t <= 4; t++) if ((t === 0 ? rec.clears : rec.hard?.[String(t)]?.clears ?? 0) > 0) return true;
  return false;
}
const dayOf = (key: number): number => Date.UTC(Math.floor(key / 10000), (Math.floor(key / 100) % 100) - 1, key % 100) / 86400000;
/** The longest run of days in a row the daily was cleared. */
export function dailyStreak(m: Meta): number {
  const days = Object.entries(m.daily ?? {})
    .filter(([, e]) => e?.cleared)
    .map(([k]) => dayOf(Number(k)))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : days[i] === days[i - 1] ? run : 1;
    best = Math.max(best, run);
  }
  return best;
}
const questDone = (m: Meta, id: string): boolean => !!m.quests?.done?.includes(id);

/** Each legend's source, read from the save. */
export const LEGEND_SOURCES: Readonly<Record<string, (m: Meta) => boolean>> = {
  crownLastKing: (m) => clearedTier(m, 'golems', 4),
  maskLaughingFox: (m) => questDone(m, 'oniMask'),
  helmSevenWinters: (m) => (m.tower ?? 0) >= 7 * ACT_ROWS,
  ferrymansCoat: (m) => (m.calamity?.best ?? 0) >= 3,
  wyrmhideVaelkhar: (m) => heartHeld(m) || heartReturned(m),
  aegisOdile: (m) => clearedTier(m, 'undead', 4),
  lastLight: (m) => clearedTier(m, 'infernal', 3),
  gravesong: (m) => (m.stand ?? 0) >= 40,
  widowsBow: (m) => dailyStreak(m) >= WIDOW_STREAK,
  shieldHundredNames: (m) => clearedTier(m, 'ogres', 1),
  unwrittenBook: (m) => questDone(m, 'lostWordsLibrary'),
  bellOfEnding: (m) => clearedTier(m, 'yokai', 4),
  sevenLeagueBoots: (m) => (m.tower ?? 0) >= 4 * ACT_ROWS,
  ashwalkerSabatons: (m) => (m.calamity?.asc ?? 0) >= 1,
  moonSlippers: (m) => standingOf(m) >= 3,
  girdleGiantKing: (m) => clearedTier(m, 'beasts', 3),
  rookBandolier: (m) => questDone(m, 'taleChainsTide'),
  pilgrimsCord: (m) => Object.values(m.wavesFought ?? {}).some((n) => n >= PILGRIM_WAVES),
  ringReturning: (m) => clearedTier(m, 'wildwood', 4),
  timeHourglass: (m) => questDone(m, 'taleClockHour'),
  gorgonEye: (m) => clearedTier(m, 'labyrinth', 4),
};

/** The legends whose source the save has met. */
export const legendsEarned = (m: Meta): string[] => LEGEND_LIST.filter((l) => LEGEND_SOURCES[l.id]?.(m)).map((l) => l.id);
/** Whether the save holds a legend (once given, always: even if the piece were somehow gone, it is not given again). */
export const ownsLegend = (m: Meta, id: string): boolean => m.legends?.[id] !== undefined;

/** Give every legend the save has earned and not yet been given: a Legendary piece in the stash (a stash past its cap still takes it:
 *  a legend never waits on the cart), remembered for good. The new ones are also kept for the page's line (`Meta.legendsNew`).
 *  Returns the pieces given. */
export function claimLegends(m: Meta): Equipment[] {
  const out: Equipment[] = [];
  for (const id of legendsEarned(m)) {
    if (ownsLegend(m, id)) continue;
    const made = grantEquipment(m, { base: id, rarity: LEGEND_GRADE, level: LEGEND_LEVEL });
    (m.legends ??= {})[id] = made.id;
    (m.legendsNew ??= []).push(id);
    out.push(made);
  }
  return out;
}

/** The page's line for the legends newly found (and clears it): "A legend is yours: Gravesong". */
export function takeLegendNews(m: Meta): string[] {
  const ids = m.legendsNew ?? [];
  delete m.legendsNew;
  return ids.map((id) => `A legend is yours: ${EQUIP_BASES[id]?.name ?? id}`);
}

/** The verses of a legend's story open at its renown (the first always). */
export const versesOpen = (renown: number): number => 1 + renownStep(renown);
/** The renown its next verse opens at, or null when all are open. */
export const nextVerseAt = (renown: number): number | null => RENOWN_STEPS.find((n) => renown < n) ?? null;

/** Saved legends held that are sane: a known legend id and a piece id. */
export function readLegends(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(raw as Record<string, unknown>)) if (EQUIP_BASES[id]?.legend && typeof n === 'number' && Number.isFinite(n)) out[id] = n;
  return Object.keys(out).length ? out : undefined;
}
