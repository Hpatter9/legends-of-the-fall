// The Assault's economy and save data (phase 1, `docs/notes/assault-1.md`; the design's section 6 and 1.5): soldiers bought with crowns
// (60 a recruit, any kind: no rarity, and troops scale with their hero, not with money), lost for good when they fall, kept with their
// marks of veterancy when they live; the holds conquered, the tries, and the daily tribute. There is no upkeep.
//
// The save keeps `Meta.assault` (missing on an older save: nothing bought, nothing conquered). A soldier's fall is written as it happens
// (its entry set to -1, dropped when the save is next read), so closing the page mid-assault cannot undo a loss. Pure rules: no Pixi, no DOM.

import type { Meta } from '../meta';
import { armyById, armyIndex, armyStars, ARMIES } from '../armies';

/** The most marks a soldier keeps (6.3). */
export const MARKS_MAX = 99;
/** The prices (6.1): one table, easy to retune. */
export const ASSAULT_PRICES = { recruit: 60 } as const;
/** A platoon at most this many soldiers. */
export const PLATOON_SIZE = 10;
/** The stars an army needs before its hold can be stormed: its tenth, the Legendary star (1.2). */
export const ASSAULT_STARS = 10;

/** `Meta.assault`: the platoons, the holds conquered, the tries, the tribute. */
export interface AssaultMeta {
  v: 1;
  /** Each platoon by its hero's kind: one entry a soldier, its marks (0 to 99); -1 for one fallen in an assault still being settled. */
  troops: Record<string, number[]>;
  /** Holds conquered: the day key of the first conquest, the tier it was won at (3 Legendary) and the wins since. */
  conquered: Record<string, { day: number; tier: number; wins: number }>;
  /** Attempts by army (the result's "Assault 3"). */
  tries: Record<string, number>;
  /** The day key tribute was last claimed. */
  tribute?: number;
  /** The opening scene at the war table has played. */
  told?: true;
  /** The muster's last plan and each platoon's formation, by hero kind (kept so the next muster opens as the last one was left). */
  plan?: Record<string, 'west' | 'bridge' | 'east'>;
  formations?: Record<string, 'wall' | 'spearhead' | 'square' | 'skirmish'>;
}

export const newAssault = (): AssaultMeta => ({ v: 1, troops: {}, conquered: {}, tries: {} });

/** A saved `Meta.assault`, read defensively: platoons cut to ten and marks clamped (a fallen soldier's -1 dropped: its loss stands);
 *  unknown hero kinds kept (a later hero may come back); unknown armies dropped. Undefined when there is nothing to keep. */
export function readAssault(raw: unknown): AssaultMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<AssaultMeta>;
  const out = newAssault();
  if (r.troops && typeof r.troops === 'object')
    for (const [k, list] of Object.entries(r.troops)) {
      if (!Array.isArray(list)) continue;
      const kept = list.filter((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0).map((x) => Math.max(0, Math.min(MARKS_MAX, Math.floor(x)))).slice(0, PLATOON_SIZE);
      if (kept.length) out.troops[k] = kept;
    }
  if (r.conquered && typeof r.conquered === 'object')
    for (const [a, c] of Object.entries(r.conquered)) {
      if (!armyById(a) || !c || typeof c !== 'object') continue;
      const x = c as { day?: unknown; tier?: unknown; wins?: unknown };
      out.conquered[a] = { day: Number(x.day) | 0, tier: Math.max(3, Math.min(4, Number(x.tier) | 0)), wins: Math.max(1, Number(x.wins) | 0) };
    }
  if (r.tries && typeof r.tries === 'object')
    for (const [a, n] of Object.entries(r.tries)) if (armyById(a) && typeof n === 'number' && n > 0) out.tries[a] = Math.floor(n);
  if (typeof r.tribute === 'number' && Number.isFinite(r.tribute)) out.tribute = r.tribute | 0;
  if (r.told === true) out.told = true;
  const pick = <T extends string>(raw: unknown, ok: readonly T[]): Record<string, T> | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = Object.fromEntries(Object.entries(raw).filter(([, x]) => ok.includes(x as T))) as Record<string, T>;
    return Object.keys(o).length ? o : undefined;
  };
  const plan = pick(r.plan, ['west', 'bridge', 'east'] as const);
  if (plan) out.plan = plan;
  const forms = pick(r.formations, ['wall', 'spearhead', 'square', 'skirmish'] as const);
  if (forms) out.formations = forms;
  return out;
}

/** The save's assault data, made on first use. */
export const assaultOf = (m: Meta): AssaultMeta => (m.assault ??= newAssault());

/** Whether an army's hold can be stormed: its ten stars won. */
export const canAssault = (m: Meta, army: string): boolean => {
  const a = armyById(army);
  return !!a && armyStars(m, a).got >= ASSAULT_STARS;
};
/** Whether the mode is open at all: the first army to reach ten stars opens it (and the Barracks' buying with it). */
export const assaultOpen = (m: Meta): boolean => ARMIES.some((a) => armyStars(m, a).got >= ASSAULT_STARS);
/** Whether an army's hold has fallen. */
export const conquered = (m: Meta, army: string): boolean => !!m.assault?.conquered[army];

/** A platoon's soldiers (their marks), the fallen not counted. */
export const troopsOf = (m: Meta, hero: string): number[] => (m.assault?.troops[hero] ?? []).filter((x) => x >= 0);
/** What filling a platoon's empty places costs. */
export const fillCost = (m: Meta, hero: string): number => (PLATOON_SIZE - troopsOf(m, hero).length) * ASSAULT_PRICES.recruit;

/** Buy one recruit for a platoon: false when it is full or the crowns run short. */
export function buyRecruit(m: Meta, hero: string): boolean {
  const a = assaultOf(m);
  const list = (a.troops[hero] ??= []).filter((x) => x >= 0);
  if (list.length >= PLATOON_SIZE || m.crowns < ASSAULT_PRICES.recruit) return false;
  m.crowns -= ASSAULT_PRICES.recruit;
  list.push(0);
  a.troops[hero] = list;
  return true;
}

/** Fill the ranks: buy recruits for every empty place while the crowns last. Returns how many were bought. */
export function fillRanks(m: Meta, hero: string): number {
  let n = 0;
  while (buyRecruit(m, hero)) n++;
  return n;
}

/** A soldier fell in the assault: its entry is struck at once (-1), so a page closed now cannot undo the loss. */
export function noteFallen(m: Meta, hero: string, index: number): void {
  const list = m.assault?.troops[hero];
  if (list && index >= 0 && index < list.length) list[index] = -1;
}

/** Marks a surviving soldier earns from an assault (6.3): one for living through it, one for every three kills (a structure broken counts as
 *  one), two more for a conquest. */
export const marksEarned = (kills: number, won: boolean): number => 1 + Math.floor(kills / 3) + (won ? 2 : 0);

// ---- rewards (1.5) -----------------------------------------------------------------------------------------------------------------

/** The Spoils of the Hold: crowns for the first conquest, rising with the army's place. */
export const spoilsOf = (army: string): number => Math.round((4000 * (1 + 0.35 * Math.max(0, armyIndex(army)))) / 10) * 10;
/** The tribute a conquered hold pays each real day. */
export const tributeOf = (army: string): number => Math.round(150 * (1 + 0.15 * Math.max(0, armyIndex(army))));
/** Each Council member slain at the hold pays this many times the usual War Trophies. */
export const TROPHY_MULT = 2;

/** The tribute waiting today: every conquered hold's, once a day. */
export function tributeDue(m: Meta, day: number): number {
  const a = m.assault;
  if (!a || a.tribute === day) return 0;
  return Object.keys(a.conquered).reduce((n, army) => n + tributeOf(army), 0);
}

/** Claim today's tribute (a tap on the cart at camp). Returns the crowns paid (0 if none was waiting). */
export function claimTribute(m: Meta, day: number): number {
  const n = tributeDue(m, day);
  if (!n) return 0;
  m.crowns += n;
  assaultOf(m).tribute = day;
  return n;
}
