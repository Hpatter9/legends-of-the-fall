// Duchess joins a fight (DUCHESS-FIGHTS, docs/notes/duchess-fights.md): very rarely, one fight in `DUCHESS_ODDS`, the court's goat
// wanders onto the field as the fight begins and fights on the player's side as a level-100 goat. Whether a fight brings her is
// a hash of the fight's own seed (`duchessRolls`), so a fight with her plays out the same every time, and no stream of the
// fight moves for it: a fight without her plays exactly as before.
//
// She is a fighter of her own, not a hero the player placed: a `summon` unit (`UNITS.duchess`), so she never counts for the
// party's traits, the combos, the stars' "No one fell", the XP or the hero bar, and the fight is won or lost by the heroes as
// always. Her small kit (a headbutt, a mouthful of something she shouldn't eat, and sure feet) is the old charge-meter kind the
// foes and the called-up fighters use, put on her unit (`Unit.kit`), so the hero kits' table is untouched.
//
// This file is the one place her fighting lives; her walks in the camp and tavern, and her tap, are `render/duchessRules.ts`
// and `duchess.ts`. Pure rules: no Pixi, no DOM, no random numbers beyond the seed's hash.

import { addUnit, isDeployTile, unitAt, type Battle, type BattleEvent, type Unit } from './battle';
import { standable, tileAt, type At } from './board';
import { CHARGE_MAX, kitOf, mendUnit, type Kit } from './abilities';
import { foesNear, ms, shove, strike, strongest, stun } from './kits/common';
import { lastingBoost } from './levels';
import { mixSeed } from './rng';
import type { RunMode } from './run';

/** One fight in this many brings her (the owner's ask: 1 in 1000). */
export const DUCHESS_ODDS = 1000;
/** The level she fights at: her stats are a level-100 hero's lasting gains on her own base (`lastingBoost`). */
export const DUCHESS_LEVEL = 100;
/** The salt of her roll on the fight's seed (her own, so no other roll moves). */
export const DUCHESS_SALT = 0xd0c6e5;

/** What a fight is told about her: roll the seed (the default), always bring her (the `?duchess=1` test page, the tests), or never. */
export type DuchessWish = 'roll' | 'always' | 'never';

/** Whether a fight's seed brings her: one seed in `DUCHESS_ODDS`. */
export const duchessRolls = (seed: number): boolean => (mixSeed(seed, DUCHESS_SALT) >>> 0) % DUCHESS_ODDS === 0;

/** The modes she may join (proposal: every mode with a party; not the Last Stand, whose fights are the king's, `stand.ts`). A run with no mode is
 *  the old free run, and she may join that too. */
export function duchessModeOk(mode: RunMode | undefined): boolean {
  return mode?.kind !== undefined ? ['army', 'daily', 'tower', 'calamity'].includes(mode.kind) : true;
}

/** Whether this fight brings her, from what it was told and its seed. */
export const duchessDue = (seed: number, wish: DuchessWish = 'roll'): boolean => wish === 'always' || (wish === 'roll' && duchessRolls(seed));

/** Her small kit: a headbutt on the charge meter, an ultimate of eating something she shouldn't, and sure feet. */
export const DUCHESS_KIT: Kit = {
  skill: { name: 'Headbutt', text: 'Butts the strongest foe beside her for x1.6: it is knocked back two tiles and dazed 1s', need: CHARGE_MAX, dealt: 6, taken: 5, perSec: 3, castMs: 500, anim: 'attack', cast: headbutt },
  ultimate: { name: 'Nom', text: 'Eats something a foe beside her should not have lost: its shield is gone, it is dazed 2s, and she mends a quarter of her health', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 2, castMs: 700, anim: 'attack', cast: nom },
  passive: { name: 'Sure-footed', text: 'Climbs at no extra cost and cannot be knocked back', sure: true, steady: true },
};

/** Headbutt: the strongest foe beside her takes x1.6, is shoved two tiles (unless it cannot be moved) and dazed 1s. */
function headbutt(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 1).sort(strongest)[0];
  if (!f) return false;
  strike(b, me, f, 1.6, out, true);
  if (!f.alive) return true;
  if (!kitOf(f)?.passive.steady) shove(b, f, me, 2);
  stun(b, f, ms(me, 1000));
  return true;
}

/** Nom: a foe beside her loses its shield (she has eaten it), is dazed 2s and struck for her attack; she mends a quarter of her health. */
function nom(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 1).sort((x, y) => (y.shield?.hp ?? 0) - (x.shield?.hp ?? 0) || strongest(x, y))[0];
  if (!f) return false;
  delete f.shield;
  strike(b, me, f, 1, out);
  if (f.alive) stun(b, f, ms(me, 2000));
  mendUnit(me, me.maxHp * 0.25, out);
  return true;
}

/** Where she walks on: the free deploy tile nearest the middle of the heroes placed (the back row first on a tie, then the left), so she
 *  turns up among them. Null when there is no room. */
export function duchessSpot(b: Battle): At | null {
  const heroes = b.units.filter((x) => x.alive && x.side === 'hero');
  const mid = heroes.length ? { u: heroes.reduce((n, x) => n + x.u, 0) / heroes.length, v: heroes.reduce((n, x) => n + x.v, 0) / heroes.length } : { u: b.board.w / 2, v: b.board.d - 1 };
  let best: (At & { d: number }) | null = null;
  for (let v = b.board.d - 1; v >= 0; v--) {
    if (!isDeployTile(v, b.board.d)) continue;
    for (let u = 0; u < b.board.w; u++) {
      if (!standable(tileAt(b.board, u, v)) || unitAt(b, u, v)) continue;
      const d = Math.abs(u - mid.u) + Math.abs(v - mid.v);
      if (!best || d < best.d - 1e-9) best = { u, v, d };
    }
  }
  return best && { u: best.u, v: best.v };
}

/** She joins: added beside the heroes at level 100, with her kit. Called by `fight` when the fight was told she is due (`Battle.duchess`).
 *  Returns her unit, or null when she cannot (no room, or already in). */
export function joinDuchess(b: Battle): Unit | null {
  if (b.units.some((x) => x.def === 'duchess')) return null;
  const at = duchessSpot(b);
  if (!at) return null;
  const lv = lastingBoost(DUCHESS_LEVEL);
  const me = addUnit(b, 'duchess', at.u, at.v, { hp: lv.hp, atk: lv.atk, level: DUCHESS_LEVEL });
  me.kit = DUCHESS_KIT;
  b.spells.events.push({ kind: 'duchess', by: me.id });
  return me;
}

/** Whether she fought in a finished fight (and whether she was still standing at the end): for the achievement, and the page's line. */
export function duchessIn(b: Battle): { fought: boolean; standing: boolean } {
  const me = b.units.find((x) => x.def === 'duchess');
  return { fought: !!me, standing: !!me?.alive };
}

