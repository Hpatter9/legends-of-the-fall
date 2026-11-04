// Remedies (SEVEN-SLOT GEAR batch 6, docs/notes/gear-runes-design.md section 8): lasting things bought with crowns, carried into a run in
// the satchel and used between waves (in the spire and the Calamity, between fights) to heal the wounds a hero carries (`wounds.ts`,
// `health.ts`). A run takes up to five, at most one Elixir; the unused come home. Auto may use them only when the switch is on (off by
// default, the owner's answer to question 6): before a wave it heals any hero under half with the cheapest remedy that brings it to three
// quarters, keeps the Phoenix Ash and the Elixir for a boss wave, and never buys. The Alchemist's Sash and the Pilgrim's Cord make remedies
// heal more on their wearer. Pure rules: no Pixi, no DOM, no randomness.

import { EQUIP_SLOTS, wornIn } from './equipment';
import { hpShare, setShare } from './health';
import type { Meta } from './meta';
import type { Run } from './run';

export type RemedyId = 'bandage' | 'draught' | 'stew' | 'phoenix' | 'elixir';
export interface Remedy {
  id: RemedyId;
  name: string;
  /** The share of hp it heals (1 is to full). */
  heal: number;
  /** One hero, or every hero of the squad. */
  all: boolean;
  /** Its price at the stall, and the standing it is sold from. */
  price: number;
  standing: 1 | 2 | 3;
  /** How many the stall has a day. */
  stock: number;
  text: string;
}
export const REMEDY_LIST: readonly Remedy[] = [
  { id: 'bandage', name: 'Bandage Roll', heal: 0.3, all: false, price: 60, standing: 1, stock: 4, text: 'one hero +30% hp' },
  { id: 'draught', name: 'Healing Draught', heal: 0.6, all: false, price: 180, standing: 1, stock: 2, text: 'one hero +60% hp' },
  { id: 'stew', name: 'Camp Stew', heal: 0.25, all: true, price: 320, standing: 2, stock: 1, text: 'every hero in the squad +25% hp' },
  { id: 'phoenix', name: 'Phoenix Ash', heal: 1, all: false, price: 500, standing: 2, stock: 1, text: 'one hero to full' },
  { id: 'elixir', name: 'Elixir of the Keep', heal: 1, all: true, price: 1400, standing: 3, stock: 1, text: 'every hero in the squad to full' },
];
export const REMEDIES: Readonly<Record<RemedyId, Remedy>> = Object.fromEntries(REMEDY_LIST.map((r) => [r.id, r])) as Record<RemedyId, Remedy>;
export const REMEDY_IDS: readonly RemedyId[] = REMEDY_LIST.map((r) => r.id);
/** The satchel's room: five remedies a run, one Elixir at most. */
export const SATCHEL_MAX = 5;
export const ELIXIR_MAX = 1;
/** A remedy sells back for this share of its price. */
export const REMEDY_SELL = 0.2;
/** The remedies Auto keeps for a boss wave. */
const BOSS_ONLY: ReadonlySet<RemedyId> = new Set(['phoenix', 'elixir']);

type Bag = Partial<Record<RemedyId, number>>;
const count = (b: Bag | undefined): number => REMEDY_IDS.reduce((n, id) => n + (b?.[id] ?? 0), 0);

/** How much more a remedy heals a hero kind for its worn gear: a quarter for the Alchemist's Sash, a half for the Pilgrim's Cord. */
export function remedyBonus(m: Meta | undefined, kind: string): number {
  if (!m) return 0;
  let n = 0;
  for (const slot of EQUIP_SLOTS) {
    const base = wornIn(m, kind, slot)?.base;
    if (base === 'alchemistSash') n += 0.25;
    if (base === 'pilgrimsCord') n += 0.5;
  }
  return n;
}

// ---- the satchel ----

/** The satchel a run would take: the last one chosen (`Meta.satchelPick`), as far as the remedies owned go, within the satchel's room. */
export function satchelFor(m: Meta): Bag {
  const out: Bag = {};
  let room = SATCHEL_MAX;
  // (the strongest first, when the room runs out)
  for (const id of [...REMEDY_IDS].reverse()) {
    const want = Math.min(m.satchelPick?.[id] ?? 0, m.satchel?.[id] ?? 0, id === 'elixir' ? ELIXIR_MAX : SATCHEL_MAX, room);
    if (want > 0) (out[id] = want), (room -= want);
  }
  return out;
}
/** Set the satchel to take (the party screen's choice, remembered): within the room and what is owned. Returns what it became. */
export function pickSatchel(m: Meta, pick: Bag): Bag {
  m.satchelPick = {};
  for (const id of REMEDY_IDS) if ((pick[id] ?? 0) > 0) m.satchelPick[id] = Math.floor(pick[id]!);
  const made = satchelFor(m);
  m.satchelPick = { ...made };
  if (!count(m.satchelPick)) delete m.satchelPick;
  return made;
}
/** Pack the satchel into a run, once, as it is first needed (the remedies leave the save for the run). Does nothing to a run already packed
 *  or over. */
export function packSatchel(m: Meta, run: Run): void {
  if (run.satchel || run.over) return;
  const take = satchelFor(m);
  run.satchel = {};
  for (const id of REMEDY_IDS) {
    const n = take[id] ?? 0;
    if (!n) continue;
    run.satchel[id] = n;
    m.satchel![id] = (m.satchel![id] ?? 0) - n;
    if (!m.satchel![id]) delete m.satchel![id];
  }
}
/** A run has ended: its unused remedies come home. */
export function unpackSatchel(m: Meta, run: Run): void {
  for (const id of REMEDY_IDS) {
    const n = run.satchel?.[id] ?? 0;
    if (n > 0) (m.satchel ??= {})[id] = (m.satchel[id] ?? 0) + n;
  }
  if (run.satchel) run.satchel = {};
}

// ---- using them ----

/** Why a remedy cannot be used now, or null when it can: none in the satchel (`none`), or nobody it would heal (`whole`). */
export function remedyBlock(run: Run, id: RemedyId, heroId?: number): 'none' | 'whole' | null {
  if (!(run.satchel?.[id] ?? 0)) return 'none';
  const ids = REMEDIES[id].all ? squadOf(run) : heroId !== undefined ? [heroId] : [];
  return ids.some((h) => hpShare(run, h) < 1) ? null : 'whole';
}
const squadOf = (run: Run): number[] => (run.squad.length ? run.squad : run.roster.map((h) => h.id)).filter((id) => !run.roster.find((h) => h.id === id)?.guest);
/** Use a remedy: on one hero (`heroId`), or on every hero of the squad for those that heal them all. `bonus` is the wearer's extra
 *  (`remedyBonus`). Returns whether it was used. */
export function useRemedy(run: Run, id: RemedyId, heroId?: number, bonus: (kind: string) => number = () => 0): boolean {
  if (remedyBlock(run, id, heroId)) return false;
  const r = REMEDIES[id];
  for (const h of r.all ? squadOf(run) : [heroId!]) {
    const kind = run.roster.find((x) => x.id === h)?.kind ?? '';
    setShare(run, h, hpShare(run, h) + r.heal * (1 + bonus(kind)));
  }
  run.satchel![id]! -= 1;
  if (!run.satchel![id]) delete run.satchel![id];
  return true;
}
/** Auto's rule (with `Meta.autoRemedies` on): before a wave, every hero under half is healed with the cheapest remedy that brings it to
 *  three quarters (else the strongest it may use), keeping the Phoenix Ash and the Elixir for a boss wave. Returns the remedies used. */
export function autoRemedy(run: Run, boss: boolean, bonus: (kind: string) => number = () => 0): RemedyId[] {
  const used: RemedyId[] = [];
  for (const h of squadOf(run)) {
    const share = hpShare(run, h);
    if (share >= 0.5) continue;
    const kind = run.roster.find((x) => x.id === h)?.kind ?? '';
    const may = REMEDY_LIST.filter((r) => !r.all && (run.satchel?.[r.id] ?? 0) > 0 && (boss || !BOSS_ONLY.has(r.id)));
    const pick = may.find((r) => share + r.heal * (1 + bonus(kind)) >= 0.75) ?? may[may.length - 1];
    if (pick && useRemedy(run, pick.id, h, bonus)) used.push(pick.id);
  }
  return used;
}

// ---- buying and selling ----

/** Add remedies to the save (the stall, a daily clear). */
export function grantRemedy(m: Meta, id: RemedyId, n = 1): void {
  (m.satchel ??= {})[id] = (m.satchel[id] ?? 0) + n;
}
/** Sell one back for a fifth of its price. Returns the crowns, or 0 when none is owned. */
export function sellRemedy(m: Meta, id: RemedyId): number {
  if (!(m.satchel?.[id] ?? 0)) return 0;
  m.satchel![id]! -= 1;
  if (!m.satchel![id]) delete m.satchel![id];
  const n = Math.floor(REMEDIES[id].price * REMEDY_SELL);
  m.crowns += n;
  return n;
}
/** Saved remedies that are sane (known ids, whole counts above nothing). */
export function readRemedies(raw: unknown): Bag | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Bag = {};
  for (const id of REMEDY_IDS) {
    const n = Math.floor(Number((raw as Record<string, unknown>)[id]));
    if (Number.isFinite(n) && n > 0) out[id] = n;
  }
  return Object.keys(out).length ? out : undefined;
}
