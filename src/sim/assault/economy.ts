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
/** The prices (6.1): one table, easy to retune. Scouts reveal where the Council's members stand, until the next assault is fought. */
export const ASSAULT_PRICES = { recruit: 60, scouts: 100 } as const;
/** The siege works' prices at the muster (phase 1b; the design's 6.1): a ladder kit a platoon, and the ram. They are bought for one assault;
 *  a ladder never put up, and the ram if it still stands, are paid back after it. */
export const SIEGE_PRICES = { ladder: 100, ram: 400 } as const;
/** A platoon at most this many soldiers. */
export const PLATOON_SIZE = 10;
/** The stars an army needs before its hold can be stormed: its tenth, the Legendary star (1.2). */
export const ASSAULT_STARS = 10;

/** `Meta.assault`: the platoons, the holds conquered, the tries, the tribute. */
export interface AssaultMeta {
  v: 1;
  /** Each platoon by its hero's kind: one entry a soldier, its marks (0 to 99); -1 for one fallen in an assault still being settled. */
  troops: Record<string, number[]>;
  /** Holds conquered: the day key of the first conquest, the tier it was won at (3 Legendary) and the wins since; the day key of the last win
   *  over the Warband regrouped (phase 2's weekly re-storm at Mythic). */
  conquered: Record<string, { day: number; tier: number; wins: number; regrouped?: number }>;
  /** Attempts by army (the result's "Assault 3"). */
  tries: Record<string, number>;
  /** The day key tribute was last claimed. */
  tribute?: number;
  /** The opening scene at the war table has played. */
  told?: true;
  /** The muster's last plan and each platoon's formation, by hero kind (kept so the next muster opens as the last one was left). */
  plan?: Record<string, 'west' | 'bridge' | 'east'>;
  /** The War Plan's parts, by hero kind. */
  roles?: Record<string, 'main' | 'cover' | 'flank'>;
  /** The holds scouted since their last assault (the Council's posts shown on the War Plan). */
  scouted?: Record<string, true>;
  formations?: Record<string, 'line' | 'wedge' | 'wall' | 'loose'>;
  /** An assault under way (phase 2): its army, the battle time of its last snapshot, the day it began, whether it is the Warband regrouped.
   *  While it is set the fallen keep their places in `troops` (as -1). */
  live?: { army: string; t: number; day: number; restorm?: true };
  /** The siege works chosen on the muster (phase 1b): the platoons carrying a ladder, and the one pushing the ram. Paid at the march. */
  siege?: { ladders?: string[]; ram?: string };
}

export const newAssault = (): AssaultMeta => ({ v: 1, troops: {}, conquered: {}, tries: {} });

/** A saved `Meta.assault`, read defensively: platoons cut to ten and marks clamped (a fallen soldier's -1 dropped: its loss stands);
 *  unknown hero kinds kept (a later hero may come back); unknown armies dropped. Undefined when there is nothing to keep. */
export function readAssault(raw: unknown): AssaultMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<AssaultMeta>;
  const out = newAssault();
  // (an assault under way keeps its fallen in their places, -1, so its settling finds each soldier where it marched)
  const live = r.live && typeof r.live === 'object' && typeof r.live.army === 'string' && armyById(r.live.army) ? r.live : undefined;
  if (live) out.live = { army: live.army, t: Math.max(0, Number(live.t) | 0), day: Number(live.day) | 0, ...(live.restorm === true ? { restorm: true as const } : {}) };
  if (r.troops && typeof r.troops === 'object')
    for (const [k, list] of Object.entries(r.troops)) {
      if (!Array.isArray(list)) continue;
      const kept = list
        .filter((x) => typeof x === 'number' && Number.isFinite(x) && (x >= 0 || (live && x === -1)))
        .map((x) => (x < 0 ? -1 : Math.max(0, Math.min(MARKS_MAX, Math.floor(x)))))
        .slice(0, PLATOON_SIZE);
      if (kept.length) out.troops[k] = kept;
    }
  if (r.conquered && typeof r.conquered === 'object')
    for (const [a, c] of Object.entries(r.conquered)) {
      if (!armyById(a) || !c || typeof c !== 'object') continue;
      const x = c as { day?: unknown; tier?: unknown; wins?: unknown; regrouped?: unknown };
      out.conquered[a] = { day: Number(x.day) | 0, tier: Math.max(3, Math.min(4, Number(x.tier) | 0)), wins: Math.max(1, Number(x.wins) | 0), ...(typeof x.regrouped === 'number' && x.regrouped > 0 ? { regrouped: x.regrouped | 0 } : {}) };
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
  const roles = pick(r.roles, ['main', 'cover', 'flank'] as const);
  if (roles) out.roles = roles;
  if (r.scouted && typeof r.scouted === 'object') {
    const sc = Object.fromEntries(Object.keys(r.scouted).filter((a) => armyById(a)).map((a) => [a, true as const]));
    if (Object.keys(sc).length) out.scouted = sc;
  }
  const forms = pick(r.formations, ['line', 'wedge', 'wall', 'loose'] as const);
  if (forms) out.formations = forms;
  if (r.siege && typeof r.siege === 'object') {
    const ladders = Array.isArray(r.siege.ladders) ? [...new Set(r.siege.ladders.filter((k): k is string => typeof k === 'string'))].slice(0, 5) : [];
    const ram = typeof r.siege.ram === 'string' ? r.siege.ram : undefined;
    if (ladders.length || ram) out.siege = { ...(ladders.length ? { ladders } : {}), ...(ram ? { ram } : {}) };
  }
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

/** Send scouts to a hold (the War Plan): 100 crowns, and the Council's posts are shown until the hold's next assault is fought. */
export function scoutHold(m: Meta, army: string): boolean {
  const a = assaultOf(m);
  if (a.scouted?.[army] || m.crowns < ASSAULT_PRICES.scouts) return false;
  m.crowns -= ASSAULT_PRICES.scouts;
  a.scouted = { ...a.scouted, [army]: true };
  return true;
}
/** Whether a hold has been scouted since its last assault. */
export const scouted = (m: Meta, army: string): boolean => !!m.assault?.scouted?.[army];

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

/** What a muster's siege works cost (the ladders on the party's platoons, and the ram if it is with one). */
export function siegeCost(party: readonly string[], siege: AssaultMeta['siege']): number {
  const ladders = (siege?.ladders ?? []).filter((k) => party.includes(k)).length;
  return ladders * SIEGE_PRICES.ladder + (siege?.ram && party.includes(siege.ram) ? SIEGE_PRICES.ram : 0);
}

/** Pay for the siege works at the march: what the crowns cover, the ram first, then the ladders in the party's order. The works bought. */
export function buySiege(m: Meta, party: readonly string[], siege: AssaultMeta['siege']): { ladders: string[]; ram?: string } {
  const out: { ladders: string[]; ram?: string } = { ladders: [] };
  if (siege?.ram && party.includes(siege.ram) && m.crowns >= SIEGE_PRICES.ram) {
    m.crowns -= SIEGE_PRICES.ram;
    out.ram = siege.ram;
  }
  for (const k of party)
    if (siege?.ladders?.includes(k) && m.crowns >= SIEGE_PRICES.ladder) {
      m.crowns -= SIEGE_PRICES.ladder;
      out.ladders.push(k);
    }
  return out;
}

/** The Mythic tier the Warband regroups at (phase 2's weekly re-storm, the design's Q4). */
export const RESTORM_TIER = 4;
/** Days since 1 January 2000 of a yyyymmdd day key (as `dailyThemes.dayNumber`, kept here so the save's reader stays light). */
const dayNumber = (date: number): number => Math.round((Date.UTC(Math.floor(date / 10000), (Math.floor(date / 100) % 100) - 1, date % 100) - Date.UTC(2000, 0, 1)) / 86_400_000);
/** A day key's week: weeks run Monday to Sunday (1 January 2000 was a Saturday). Read from the day key, never the clock. */
export const weekOf = (day: number): number => Math.floor((dayNumber(day) + 5) / 7);
/** Whether a conquered hold's Warband has regrouped: it can be stormed again at Mythic until it is beaten once in the week. */
export function regrouped(m: Meta, army: string, day: number): boolean {
  const c = m.assault?.conquered[army];
  return !!c && (c.regrouped === undefined || weekOf(c.regrouped) !== weekOf(day));
}
