// STATS batch 5, "Saves" (docs/notes/stats-5.md; the design is docs/notes/rpg-stats-design.md, section 3.3). When a fighter lays an
// ailment, a hold or a shove on a fighter of the other side, or a blast lands on it, the target makes a saving throw: d20 + its save
// against the layer's skill DC (8 + proficiency + its casting ability). A save halves it (the owner's answer 3): half the time of an
// ailment or a hold, half the damage of a blast, a shove a tile shorter (`toolkit/move.ts`). The pop says "Saved".
//
// Which save: STR against shoves, drags and weakening; DEX against blasts; CON against poison, bleeding, burning, chill and freezing,
// shock and stuns; INT against silence; WIS against fear and charm; CHA against curses.
//
// Who does not save: a fighter of the layer's own side, and anything laid by no fighter (the land, the king's spells, the combos, the
// Eidolons). A boss saved only by its Legendary Resistance (the old ladder, `AIL.BOSS_SHARE` and `hardGate`) until the joint rebalance; now it
// makes its saves as well, every one trained, and the ladder follows (`JOINT.bossSaves`).
//
// Batches 5 and 6 fitted the saves out (`saveFit`: a lay lengthened by what the saves take off on average) and matched the foes to the heroes'
// growth (`matchOf`), so that no mode moved before the joint rebalance. Both are off now (`JOINT.saves`, `JOINT.tierProf`,
// docs/notes/joint-rebalance.md): a save halves what it is made against, as written, and a foe's DC and saves come from its family's block
// at its tier's or depth's proficiency.
//
// Randomness: the d20 is a hash of the fight's seed and the moment (`SAVE_SALT`), never a draw from `b.rng` or `b.skillRng`. Pure rules:
// no Pixi, no DOM.

import { mixSeed } from './rng';
import { ABILITIES, derivedOf, JOINT, profileOf, STAT_PROFILES, type Ability, type Scores } from './stats';
import { foeBlockOf, matchOf, profiled, statInputOf } from './blow';
import { UNITS } from './units';
import { isBoss } from './foes';
import { REST } from './statRest';
import type { AilmentKey } from './ailmentKeys';
import type { Battle, Unit } from './battle';

/** The saves on (the game) or off (batch 4's rules exactly: no save, no fit, no contest of STR), for measuring before and after and for
 *  the tests that stage another rule (the toolkit's moves). */
export const SAVES = { on: true };

/** STATS batch 6: the areas brought into the DEX save, each on its own switch (measured one at a time): a fire wall's burn (the Wall of
 *  Fire, the Inferno Breath's line) is saved with DEX in place of CON, and a breath's blast (Dragon Breath, Inferno Breath) is halved on a
 *  DEX save as a volley's is. (The Dread Pirate's keg was already one, through `landArea`, since batch 5.) */
export const DEX_SAVES = { wall: true, breath: true };

/** What a save leaves of the effect (the owner's answer 3: a save halves it). */
export const SAVE_SHARE = 0.5;
/** The salt of the save's d20. */
export const SAVE_SALT = 0x5a7e;

/** What a save is made against: an ailment, a shove or a blast. */
export type SaveWhat = AilmentKey | 'charm' | 'shove' | 'blast';

/** Which ability saves against each thing (the design's section 3.3). */
export const SAVE_OF: Readonly<Record<SaveWhat, Ability>> = {
  shove: 'str',
  weak: 'str',
  blast: 'dex',
  poison: 'con',
  bleed: 'con',
  burn: 'con',
  chill: 'con',
  freeze: 'con',
  shock: 'con',
  stun: 'con',
  silence: 'int',
  fear: 'wis',
  charm: 'wis',
  curse: 'cha',
};
const WHAT_INDEX: Readonly<Record<SaveWhat, number>> = Object.fromEntries(Object.keys(SAVE_OF).map((k, i) => [k, i + 1])) as Record<SaveWhat, number>;

/** A fighter's DC and saves, now and at level 1 (a foe's level 1 is its block before the match). A foe's DC is matched for the save it is
 *  made against (`dcLift`, by ability). */
export interface SaveStats {
  dc: number;
  dcLift: Scores;
  saves: Scores;
  dc1: number;
  saves1: Scores;
  /** Its STR modifier, for the shoves' contest (a foe's matched to the heroes' growth). */
  str: number;
}
const cache = new WeakMap<Unit, SaveStats | null>();
const ZERO: Scores = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

/** A fighter's DC and six saves (worked out once a fighter), or null for one with no block (the king's stand-in, a kind not in `UNITS`). */
export function saveStatsOf(b: Battle, u: Unit): SaveStats | null {
  const had = cache.get(u);
  if (had !== undefined) return had;
  let s: SaveStats | null = null;
  const def = UNITS[u.def];
  if (profiled(u)) {
    const p = profileOf(u.def)!;
    const now = derivedOf(p, statInputOf(u));
    const one = derivedOf(p);
    s = { dc: now.dc, dcLift: ZERO, saves: now.saves, dc1: one.dc, saves1: one.saves, str: now.mods.str };
  } else if (def && u.id !== 0) {
    const f = foeBlockOf(b, u);
    const m = matchOf(b);
    // (a hero's summon grows with the heroes; a foe answered their growth until the joint rebalance, its DC their saves', its saves their DC's,
    // and now has its tier's or depth's proficiency alone, `JOINT.tierProf`)
    const foe = u.side === 'foe';
    const own = foe && JOINT.tierProf;
    const saves = { ...f.saves };
    const dcLift = { ...ZERO };
    if (!own)
      for (const a of ABILITIES) {
        saves[a] += foe ? m.dc : m.save[a];
        dcLift[a] = foe ? m.save[a] : m.dc;
      }
    s = { dc: f.dc, dcLift, saves, dc1: f.dc, saves1: f.saves, str: f.mods.str + (own ? 0 : m.str) };
  }
  cache.set(u, s);
  return s;
}

/** The DC `by` lays a thing with, against the save of ability `a`. */
export function dcAgainst(b: Battle, by: Unit, a: Ability): number | null {
  const s = saveStatsOf(b, by);
  return s ? s.dc + s.dcLift[a] : null;
}

/** The chance a d20 + `save` meets `dc` (no natural 1 or 20 for a save, as in D&D). */
export const saveChance = (dc: number, save: number): number => Math.max(0, Math.min(1, (21 - dc + save) / 20));
/** What a lay comes to on average at this DC against this save: the share left when saved, the whole when not. */
export const meanShare = (dc: number, save: number): number => 1 - saveChance(dc, save) * (1 - SAVE_SHARE);

const heroOnes = (): { dc: number; saves: Scores }[] => Object.values(STAT_PROFILES).map((p) => derivedOf(p));
let ones: { dc: number; saves: Scores }[] | undefined;
const fitMemo = new Map<string, number>();

/** The fit on a lay from `by` on `to` against save `a`: the share the saves take off on average, given back. The ordinary hero is the
 *  roster's mean at level 1; a hero's own DC or save shows against it, a foe's block is fitted out (both at their level-1 numbers, the
 *  match keeping the gap). */
export function saveFit(b: Battle, by: Unit, to: Unit, a: Ability): number {
  // (the joint rebalance: a save's halving is felt, `JOINT.saves`)
  if (JOINT.saves) return 1;
  const sb = saveStatsOf(b, by);
  const st = saveStatsOf(b, to);
  if (!sb || !st) return 1;
  const heroBy = profiled(by);
  const heroTo = profiled(to);
  const key = `${heroBy ? 'h' : sb.dc1}|${heroTo ? 'h' : st.saves1[a]}|${a}`;
  let f = fitMemo.get(key);
  if (f === undefined) {
    ones ??= heroOnes();
    let mean: number;
    if (heroBy && heroTo) mean = 1;
    else if (heroBy) mean = ones.reduce((n, h) => n + meanShare(h.dc, st.saves1[a]), 0) / ones.length;
    else if (heroTo) mean = ones.reduce((n, h) => n + meanShare(sb.dc1, h.saves[a]), 0) / ones.length;
    else mean = meanShare(sb.dc1, st.saves1[a]);
    fitMemo.set(key, (f = 1 / mean));
  }
  return f;
}

/** A save's outcome: whether it was made, and what the lay is multiplied by (the fit, halved on a save). */
export interface SaveRoll {
  saved: boolean;
  mult: number;
}
const NO_SAVE: SaveRoll = { saved: false, mult: 1 };

/** Whether `to` makes a save against `what` from `by` at all: the other side, and both with a block. A boss (`boss`) saved only by its
 *  Legendary Resistance until the joint rebalance; now it saves as well, every save trained (`JOINT.bossSaves`), and the ladder follows. */
export function savesAgainst(b: Battle, by: Unit | undefined, to: Unit, boss: boolean): by is Unit {
  return SAVES.on && !!by && by !== to && by.side !== to.side && (!boss || JOINT.bossSaves) && by.id !== 0 && !!saveStatsOf(b, by) && !!saveStatsOf(b, to);
}

/** The d20 of `to`'s save against `by`'s `what` now (1 to 20): a hash of the moment, the pair and the thing. */
export const saveD20 = (b: Battle, by: Unit, to: Unit, what: SaveWhat): number => (mixSeed(b.seed, SAVE_SALT, b.t, by.id, to.id, WHAT_INDEX[what]) % 20) + 1;

/** Roll `to`'s save against `by`'s `what`. `fit` false leaves the fit out (a shove's tiles are whole). */
export function rollSave(b: Battle, by: Unit | undefined, to: Unit, what: SaveWhat, boss: boolean, fit = true): SaveRoll {
  if (!savesAgainst(b, by, to, boss)) return NO_SAVE;
  const a = SAVE_OF[what];
  const dc = dcAgainst(b, by, a)!;
  const save = saveStatsOf(b, to)!.saves[a];
  // (a matched foe's DC or save can carry a part of a point: it is a whole one that part of the time, its own hash of the moment)
  const need = dc - save;
  const part = need - Math.floor(need);
  const whole = Math.floor(need) + (part > 1e-9 && (mixSeed(b.seed, SAVE_SALT, b.t, by.id, to.id, WHAT_INDEX[what], 2) >>> 0) / 4294967296 < part ? 1 : 0);
  const saved = saveD20(b, by, to, what) >= whole;
  return { saved, mult: (fit ? saveFit(b, by, to, a) : 1) * (saved ? SAVE_SHARE : 1) };
}

/** The shoves' contest (the design's section 3.1): a shove or a drag moves a foe one tile further when the shover's STR modifier is
 *  `CONTEST_GAP` or more above the target's, and one tile less when as much below. */
export const CONTEST_GAP = 2;

/** How far a shove or drag of `n` tiles from `by` moves `to`, after the contest of STR and `to`'s STR save (a save takes a tile off, to
 *  none). Not for a boss (its own rule halves it, as before) or the shover's own side. */
export function shoveTiles(b: Battle, by: Unit, to: Unit, n: number): { n: number; saved: boolean } {
  if (!savesAgainst(b, by, to, false)) return { n, saved: false };
  const gap = saveStatsOf(b, by)!.str - saveStatsOf(b, to)!.str;
  const contest = gap >= CONTEST_GAP ? 1 : gap <= -CONTEST_GAP ? -1 : 0;
  const save = rollSave(b, by, to, 'shove', false, false);
  return { n: Math.max(0, n + contest - (save.saved ? 1 : 0)), saved: save.saved };
}

// ---- STATS batch 6: saves-aware control (the design's section 7, "How the AI uses the scores") ----

/** Targets a skill values within this share of its best count as the same, and among them the one with the weakest save goes first. */
export const SAVE_PICK_BAND = 0.15;

/** Reorder a skill's targets (`list`, best first by `value`) so that among those it values within `SAVE_PICK_BAND` of the best, the one with
 *  the weakest save against `what` comes first (a boss, whose Legendary Resistance is its save, last of them); the rest keep their order.
 *  A hero's skills only (the foes' families are evened), and only with the saves on. Ties keep the list's own order. */
export function saveAware<T extends Unit>(b: Battle, by: Unit, list: T[], value: (u: T) => number, what: SaveWhat): T[] {
  if (!REST.savePick || !SAVES.on || list.length < 2 || !profiled(by)) return list;
  const top = value(list[0]);
  const floor = top > 0 ? top * (1 - SAVE_PICK_BAND) : top;
  const a = SAVE_OF[what];
  const save = (u: Unit): number => (u.side === 'foe' && (isBoss(u.def) || (u.size ?? 1) > 1) ? 99 : saveStatsOf(b, u)?.saves[a] ?? 0);
  const near = list.filter((u) => value(u) >= floor);
  const rest = list.filter((u) => value(u) < floor);
  const order = new Map(list.map((u, i) => [u, i]));
  return [...near.sort((x, y) => save(x) - save(y) || order.get(x)! - order.get(y)!), ...rest];
}
