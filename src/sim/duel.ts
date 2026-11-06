// The Nemesis War, phase 4: duel waves (`docs/design/legends-expansion.md`, sections 2.8, 2.10 and 2.11; `docs/notes/nemesis-4.md`).
// A wave that holds a nemesis with a score to settle may open with a challenge: it is Vengeful against a hero in the squad, a hero in the
// squad bears a Grudge on it, or its Dread is in the squad; a Vain nemesis always challenges (an open challenge: the player names the
// champion). At most one challenge a run. Accepted, the champion meets the nemesis alone on the board's middle 5x5 for sixty seconds, the
// nemesis at 30% of its wave health and 60% of its wave attack (a wall is built for five heroes), its escorts and the king's spells out of
// it; the hero keeps its own skills, ultimate and gear.
//
// - **Won**: the nemesis is slain for good (it cannot cheat death; a warchief is humiliated instead and flees to his Muster), its wave breaks
//   and runs and counts as won with its pay, every hero heals 20%, and the nemesis pays double (`council.ts`, `noteWar`).
// - **Lost**: the champion falls and stands again at half for the wave; the nemesis gains a Might and fights the wave at full strength with
//   its escorts.
// - **Time**: the nemesis escapes (a Might, and humiliated if it was under 25%); the wave is fought without it.
// - **Refused**: the wave is fought as usual, and the nemesis is Mocking (+5% attack) for the rest of the run.
//
// The offer reads only the run (its frozen snapshot and its squad), so it is the same every time. The duel's fight is the wave's own board
// and nemesis with the fight's streams moved onto the War's side stream (`DUEL_SALT`). Pure rules: no Pixi, no DOM.

import { addUnit, type Battle, type Boost } from './battle';
import { canStep, standable, tileAt, type At, type Board } from './board';
import { MIGHT_MAX, type NemSnap, type RunNemesis } from './nemesis';
import { walkFrom } from './path';
import { mixSeed } from './rng';
import type { Run } from './run';
import { startStage } from './run';
import { DUEL_MS, inRing, RING_R } from './duelRing';
import { dreadOf } from './nemesisTraits';
import { roleOf, type PartyRole } from './suggest';
import { UNITS } from './units';
import { REVIVE_SHARE } from './wounds';

/** The duel's own side stream (the fight's two streams are moved onto it). */
export const DUEL_SALT = 0x4e3e55;
/** The nemesis fights a duel at this share of its wave health and attack (the design's starting numbers were 30% and 60%: a wall is built
 *  for five), and a boss nemesis, the wall of its wave, this much more of a cut on top. Tuned by `npm run balance -- --duel`. */
export const DUEL_SHARE = { hp: 0.18, atk: 0.45 };
export const DUEL_BOSS = { hp: 0.15, atk: 0.4 };
/** Each champion's role's own multiplier on the nemesis in a duel (`npm run balance -- --duel`; the design: a role whose kinds fall outside
 *  40 to 75% has its own). 1 is the plain share. */
export const DUEL_ROLE: Record<PartyRole, { hp: number; atk: number }> = { front: { hp: 1, atk: 1 }, striker: { hp: 1.15, atk: 1.05 }, back: { hp: 1, atk: 1 }, support: { hp: 0.85, atk: 0.9 } };
/** Each army's own factor on the nemesis's duel share (health and attack alike), so a duel at the army's own level sits in the band whatever
 *  the army: the armies' walls differ more than the champions' roles do (`npm run balance -- --duel`). The three last armies are out of the
 *  bot's reach at their own level, so they keep the plain share until they can be measured. */
export const DUEL_ARMY: Record<string, number> = { orcs: 0.6, undead: 1, beasts: 1.35, wildwood: 1.35, labyrinth: 0.95, ogres: 0.78 };
/** A duel won heals every hero this share of its health (the wounded stand nearer whole). */
export const DUEL_HEAL = 0.2;
/** A duel that ran out of time with the nemesis under this share of its health humiliates it. */
export const DUEL_SHAMED = 0.25;

/** Why a nemesis challenges: Vengeful against a hero in the squad, a Grudge holder faces it, its Dread is in the squad, or it is Vain. */
export type DuelWhy = 'vengeful' | 'grudge' | 'dread' | 'vain';
export const DUEL_WHYS: readonly DuelWhy[] = ['vengeful', 'grudge', 'dread', 'vain'];

/** A challenge on a wave: who challenges, why, and the hero it names (none: an open challenge, the player names the champion). */
export interface DuelOffer {
  /** The nemesis's War id, its name (with its epithet) and its fighter. */
  id: number;
  wave: number;
  why: DuelWhy;
  /** The hero it names: its roster id and kind. */
  hero?: number;
  kind?: string;
}

/** What became of a run's one challenge (`Run.duel`): `pending` while it is being fought (a run left then fights the wave as usual). */
export type DuelOut = 'pending' | 'won' | 'lost' | 'timeout' | 'refused';
export interface RunDuel {
  wave: number;
  /** The nemesis's War id. */
  id: number;
  /** The champion's kind (none when refused). */
  hero?: string;
  out: DuelOut;
}

/** The heroes who may be a champion: the squad's own (not a guest, nor a mirror's clone). */
export function contenders(run: Run): { id: number; kind: string }[] {
  return run.squad
    .map((id) => run.roster.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => !!h && !h.guest && h.cloneFloors === undefined && !!UNITS[h.kind])
    .map((h) => ({ id: h.id, kind: h.kind }));
}

/** Why this nemesis would challenge this squad, and whom: Vengeful first, then a Grudge holder (the deepest Grudge), then its Dread; a Vain
 *  one challenges openly when none of those stands. Undefined: no challenge. */
export function challengeOf(s: NemSnap, squad: readonly { id: number; kind: string }[]): Omit<DuelOffer, 'wave'> | undefined {
  const find = (k: string | undefined) => (k ? squad.find((h) => h.kind === k) : undefined);
  const named = (why: DuelWhy, h: { id: number; kind: string } | undefined) => (h ? { id: s.id, why, hero: h.id, kind: h.kind } : undefined);
  const grudge = Object.entries(s.grudge ?? {})
    .filter(([k]) => find(k))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
  return named('vengeful', find(s.vengeful)) ?? named('grudge', find(grudge)) ?? named('dread', find(dreadOf(s.weak))) ?? (s.weak.includes('vain') ? { id: s.id, why: 'vain' as const } : undefined);
}

/**
 * The challenge this wave of the run opens with, if any: the first nemesis standing in it (in the wave's order) that has a score to settle
 * with the squad, or is Vain. Only in an army run, and only once a run (a challenge refused is that run's one). Reads only the run.
 */
export function duelOffer(run: Run): DuelOffer | undefined {
  if (run.mode?.kind !== 'army' || run.duel || run.over || !run.nemesis) return undefined;
  const squad = contenders(run);
  if (!squad.length) return undefined;
  for (const id of run.nemesis.waves[String(run.stage)] ?? []) {
    const s = run.nemesis.members.find((x) => x.id === id);
    const c = s && challengeOf(s, squad);
    if (c) return { ...c, wave: run.stage };
  }
  return undefined;
}

/** The nemesis's snapshot a challenge is from. */
export const offerSnap = (run: Pick<Run, 'nemesis'>, o: Pick<DuelOffer, 'id'>): NemSnap | undefined => run.nemesis?.members.find((s) => s.id === o.id);

/** The champion a player who leaves it to the bot would send (an open challenge): the hero it names, else the squad's most health times
 *  attack (ties to the roster's order). */
export function championFor(run: Run, o: DuelOffer, power: (kind: string) => number = (k) => UNITS[k].hp * UNITS[k].atk): number | undefined {
  if (o.hero !== undefined) return o.hero;
  const squad = contenders(run);
  return [...squad].sort((a, b) => power(b.kind) - power(a.kind) || a.id - b.id)[0]?.id;
}

// ---- the duel's fight --------------------------------------------------------------------------------------------------------

/** Where a ring may sit: the boss arena's middle when the board has one, else the board's own middle, kept a ring's width from the edges. */
function ringMid(board: Board, du: number, dv: number): At {
  const m = board.arenaMid ?? { u: Math.floor(board.w / 2), v: Math.floor(board.d / 2) };
  return { u: Math.max(RING_R, Math.min(board.w - 1 - RING_R, m.u + du)), v: Math.max(RING_R, Math.min(board.d - 1 - RING_R, m.v + dv)) };
}

/** The free standing tile in a ring nearest the row `v` (then the ring's middle column, then the board's order). */
function spotNear(board: Board, mid: At, v: number, taken: (a: At) => boolean): At | undefined {
  const out: { a: At; score: number }[] = [];
  for (let dv = -RING_R; dv <= RING_R; dv++)
    for (let du = -RING_R; du <= RING_R; du++) {
      const a = { u: mid.u + du, v: mid.v + dv };
      if (!standable(tileAt(board, a.u, a.v)) || taken(a)) continue;
      out.push({ a, score: Math.abs(a.v - v) * 10 + Math.abs(a.u - mid.u) + (a.v * board.w + a.u) / 1e4 });
    }
  return out.sort((x, y) => x.score - y.score)[0]?.a;
}

/** The ring for a board: the middle 5x5 nearest the board's middle (or its arena's) where the two can stand at its far sides and walk to one
 *  another, the plain middle if none can. */
export function ringFor(board: Board, taken: (a: At) => boolean = () => false): { mid: At; hero: At; nem: At } {
  const tries: [number, number][] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];
  let first: { mid: At; hero: At; nem: At } | undefined;
  for (const [du, dv] of tries) {
    const mid = ringMid(board, du, dv);
    const hero = spotNear(board, mid, mid.v + RING_R, taken);
    const nem = hero && spotNear(board, mid, mid.v - RING_R, (a) => taken(a) || (a.u === hero.u && a.v === hero.v));
    if (!hero || !nem) continue;
    const pick = { mid, hero, nem };
    first ??= pick;
    // (the two must be able to close on one another on foot inside the ring, with a common jump)
    const fence = new Set<number>();
    for (let i = 0; i < board.tiles.length; i++) if (!inRing({ mid, r: RING_R }, { u: i % board.w, v: Math.floor(i / board.w) })) fence.add(i);
    const walk = walkFrom(board, hero, 2, fence);
    const next = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([a, c]) => {
      const t = tileAt(board, nem.u + a, nem.v + c);
      return !!t && inRing({ mid, r: RING_R }, { u: nem.u + a, v: nem.v + c }) && walk.cost[(nem.v + c) * board.w + nem.u + a] < Infinity && canStep(t, tileAt(board, nem.u, nem.v)!, 2) !== null;
    });
    if (next || walk.cost[nem.v * board.w + nem.u] < Infinity) return pick;
  }
  return first ?? { mid: ringMid(board, 0, 0), hero: ringMid(board, 0, RING_R), nem: ringMid(board, 0, -RING_R) };
}

/** The nemesis's share in a duel against a champion of this kind: the design's 30% health and 60% attack, by the champion's role. */
export function duelShare(kind: string, boss = false, army?: string): { hp: number; atk: number } {
  const r = DUEL_ROLE[roleOf(kind)];
  const w = boss ? DUEL_BOSS : { hp: 1, atk: 1 };
  const a = (army && DUEL_ARMY[army]) || 1;
  return { hp: DUEL_SHARE.hp * r.hp * w.hp * a, atk: DUEL_SHARE.atk * r.atk * w.atk * a };
}

/**
 * The duel's fight for a run's wave: the wave's own board with only the challenging nemesis left on it (its escorts are out of the duel),
 * at its duel share, set at the ring's far side, and the champion (roster id `heroId`, with its `boost` as the page or the bot would place
 * it) at the near side. `Battle.duel` marks it; sixty seconds; the fight's streams on the duel's side stream; the Chapel's rites and Duchess
 * stay out of it. Ready to `fight`. Throws if the nemesis does not stand in the wave.
 */
export function startDuel(run: Run, o: Pick<DuelOffer, 'id'>, heroId: number, boost: Boost = {}): Battle {
  const h = run.roster.find((x) => x.id === heroId);
  if (!h) throw new Error(`no hero ${heroId} in the run`);
  const b = startStage(run);
  const nem = b.units.find((u) => u.nem?.id === o.id);
  if (!nem) throw new Error(`nemesis ${o.id} does not stand in wave ${run.stage}`);
  b.units = [nem];
  const ring = ringFor(b.board);
  nem.u = ring.nem.u;
  nem.v = ring.nem.v;
  nem.facing = 1;
  const share = duelShare(h.kind, !!offerSnap(run, o)?.boss, run.mode?.kind === 'army' ? run.mode.army : undefined);
  nem.hp = nem.maxHp = Math.max(1, Math.round(nem.maxHp * share.hp));
  nem.power = (nem.power ?? 1) * share.atk;
  if (nem.shield) nem.shield = { ...nem.shield, hp: Math.round(nem.shield.hp * share.hp) };
  const hero = addUnit(b, h.kind, ring.hero.u, ring.hero.v, boost, h.id);
  b.duel = { hero: hero.id, tag: h.id, nem: nem.id, id: o.id, mid: ring.mid, r: RING_R };
  b.timeLimit = DUEL_MS;
  b.rng = mixSeed(b.seed, DUEL_SALT);
  b.skillRng = mixSeed(b.seed, DUEL_SALT, 1);
  delete b.rites;
  delete b.duchess;
  return b;
}

/** How a duel ended (none while it goes on). */
export const duelOutcome = (b: Pick<Battle, 'duel'>): 'won' | 'lost' | 'timeout' | undefined => b.duel?.ended;

// ---- the run's side of it ----------------------------------------------------------------------------------------------------

/** A challenge accepted: the run's one duel is begun (a run left now fights the wave as usual, its challenge spent). */
export function acceptDuel(run: Run, o: DuelOffer, heroId: number): void {
  run.duel = { wave: o.wave, id: o.id, hero: run.roster.find((h) => h.id === heroId)?.kind, out: 'pending' };
}

/** A challenge refused: the wave is fought as usual, and the nemesis is Mocking (+5% attack) for the rest of the run. */
export function refuseDuel(run: Run, o: DuelOffer): void {
  run.duel = { wave: o.wave, id: o.id, out: 'refused' };
  const s = offerSnap(run, o);
  if (s) s.mocking = true;
}

/** A nemesis's snapshot one Might stronger for the rest of the run (it won its duel, or escaped it). */
function mightier(rn: RunNemesis | undefined, id: number): void {
  const s = rn?.members.find((x) => x.id === id);
  if (s) s.might = Math.min(MIGHT_MAX, s.might + 1);
}

/**
 * Settle a duel's fight for the run (the War's side is `noteWar`, which reads `Battle.duel`). Won: the run's wave is then settled as a won
 * wave with the duel's fight (`finish`; `settleWounds` heals every hero 20%). Lost: the champion stands again at half for the wave, and the
 * nemesis, a Might stronger, fights it with its escorts. Time: the nemesis, a Might stronger, has left the wave. Returns the outcome.
 */
export function settleDuelRun(run: Run, b: Battle): 'won' | 'lost' | 'timeout' | undefined {
  const d = b.duel;
  const out = d?.ended;
  if (!d || !out) return undefined;
  run.duel = { wave: run.stage, id: d.id, hero: b.units.find((u) => u.id === d.hero)?.def, out };
  if (out === 'lost') {
    if (d.tag !== undefined) (run.wounds ??= {})[String(d.tag)] = Math.min(run.wounds?.[String(d.tag)] ?? 1, REVIVE_SHARE);
    mightier(run.nemesis, d.id);
  } else if (out === 'timeout') {
    mightier(run.nemesis, d.id);
    const w = run.nemesis?.waves[String(run.stage)];
    if (w) run.nemesis!.waves[String(run.stage)] = w.filter((x) => x !== d.id);
  }
  return out;
}

/** A duel won heals every hero (`settleWounds`): each wounded hero stands 20% nearer whole; the rest are whole. */
export function duelHeal(wounds: Record<string, number> | undefined): Record<string, number> | undefined {
  if (!wounds) return undefined;
  const out: Record<string, number> = {};
  for (const [id, share] of Object.entries(wounds)) if (share + DUEL_HEAL < 1) out[id] = Math.round((share + DUEL_HEAL) * 100) / 100;
  return Object.keys(out).length ? out : undefined;
}

/** A saved duel, if it reads as one. */
export function readRunDuel(raw: unknown): RunDuel | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<RunDuel>;
  const outs: readonly DuelOut[] = ['pending', 'won', 'lost', 'timeout', 'refused'];
  if (typeof r.wave !== 'number' || typeof r.id !== 'number' || !outs.includes(r.out as DuelOut)) return undefined;
  return { wave: r.wave, id: r.id, out: r.out as DuelOut, ...(typeof r.hero === 'string' && UNITS[r.hero] ? { hero: r.hero } : {}) };
}
