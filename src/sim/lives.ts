// TEN-LIVES (the owner's ask, docs/notes/ten-lives.md): a run has ten lives, shared by the party, in place of its two hearts. A hero
// that falls in a fight lies `REVIVE_MS` of the fight's own time, then stands again on its tile at `REVIVE_HP` of its health and a
// life is spent. If every hero is down at once nobody waits: all of them rise then and there, a life each, and the fight goes on.
// With no life left the fallen stay down, and a party all down with no life left has lost the wave and the run, as a lost run always
// was. A fight that runs out of time spends `TIMEOUT_LIVES` for another allowance, as a heart did.
//
// The rule is the fight's own: `Battle.lives` is the lives the fight was given (`startStage` gives a run's; a fight without it plays
// as it always did, so the Last Stand, the Calamity, the Assault and a duel's ring have none), counted down here and written back
// to the run by `settleLives` (`run.ts`). No randomness: the timer is the fight's clock, the order the party's own. Pure: no Pixi, no
// DOM.

import type { Battle, BattleEvent, Unit } from './battle';
import { standable, tileAt } from './board';
import { cleanse } from './ailments';
import { applyVigil, type VigilId } from './chapelRooms';
import { UNITS } from './units';

/** The lives a run starts with, shared by the whole party. */
export const LIVES = 10;
/** How long a fallen hero lies before a life raises it (the fight's own time, so it is the same at every game speed). */
export const REVIVE_MS = 5000;
/** The share of its health a hero a life raises stands up with. */
export const REVIVE_HP = 0.5;
/** A hero a life has just raised cannot be targeted or hurt, nor act, this long: it is not killed on arrival. */
export const REVIVE_SAFE_MS = 1000;
/** What one of the old hearts is worth in lives (two hearts were a run's all; ten lives are): what a thing that gave or took a heart
 *  now gives or takes, and what a heart burnt in an old save has cost. */
export const HEART_LIVES = 5;
/** A fight that runs out of time spends this many lives (or what is left) for another allowance of time. */
export const TIMEOUT_LIVES = 3;
/** A party fall pays a Hire's gold, as a burnt heart did, for this many falls a run (two hearts paid twice): a lone hero falling
 *  ten times is not ten purses. */
export const FALL_GOLD_FALLS = 2;
/** The switch (a tuning tool's: `tools/ten-lives/measure.ts` turns it off to measure the game without lives). */
export const LIVES_RULE = { on: true };

/** A fight's lives: what is left, and what this fight has spent of them so far. */
export interface FightLives {
  /** Lives left to the run, counted down as the fight spends them. */
  left: number;
  /** Lives this fight has spent. */
  spent: number;
  /** How many times the whole party was down at once, or the clock ran out (what a burnt heart was: the stars and quests that asked
   *  for "no heart" ask for none of these). */
  falls: number;
  /** The heroes a life raised in this fight, by their roster tag, one entry a rise (the Legend Oath counts each a fall). */
  rose: number[];
  /** The Chapel's Vigil, if the run's orders chose one: its gift to each hero a life raises. */
  vigil?: VigilId;
  /** How much of `spent`, `falls` and `rose` the run has been told of already (`settleLives`). */
  noted?: { spent: number; falls: number; rose: number };
}

/** A fresh fight's lives. */
export const fightLives = (left: number, vigil?: VigilId): FightLives => ({ left: Math.max(0, left), spent: 0, falls: 0, rose: [], ...(vigil ? { vigil } : {}) });

/** The heroes lives are for: the party's own placed heroes (not a summoned helper, nor a hero's pet). */
const ofParty = (u: Unit): boolean => u.side === 'hero' && u.owner === undefined && !UNITS[u.def]?.summon;

/** The fallen heroes a life could raise, in the party's order (the order they were placed in). */
export const fallenHeroes = (b: Battle): Unit[] => b.units.filter((u) => ofParty(u) && !u.alive && !u.fled);

/** How long until a life raises a fallen hero (ms of the fight's time), or null when none will: it stands, there is no life left, or
 *  the fight has no lives. What the countdown over its spot and on its bench card shows. */
export function reviveIn(b: Battle, u: Unit): number | null {
  if (!b.lives || b.lives.left <= 0 || u.alive || !ofParty(u) || u.diedAt === undefined) return null;
  return Math.max(0, u.diedAt + REVIVE_MS - b.t);
}

/** The tile a risen hero stands on: its own, or the nearest free standable one (rings outward, each ring in reading order). */
function freeTileNear(b: Battle, u: Unit): { u: number; v: number } | null {
  const taken = (x: number, y: number) => b.units.some((o) => o !== u && o.alive && ((o.u === x && o.v === y) || (o.step && o.step.u === x && o.step.v === y)));
  for (let r = 0; r < Math.max(b.board.w, b.board.d); r++) {
    for (let dv = -r; dv <= r; dv++) {
      for (let du = -r; du <= r; du++) {
        if (Math.max(Math.abs(du), Math.abs(dv)) !== r) continue;
        const x = u.u + du;
        const y = u.v + dv;
        const t = tileAt(b.board, x, y);
        if (t && standable(t) && !taken(x, y)) return { u: x, v: y };
      }
    }
  }
  return null;
}

/** A life raises a fallen hero: on its feet at `REVIVE_HP`, cleansed, safe for `REVIVE_SAFE_MS`, the Vigil's gift on it. False when
 *  there is no life or nowhere to stand (no life is spent). */
function raise(b: Battle, u: Unit, out: BattleEvent[]): boolean {
  const l = b.lives!;
  if (l.left <= 0) return false;
  const at = freeTileNear(b, u);
  if (!at) return false;
  l.left--;
  l.spent++;
  if (u.tag !== undefined) l.rose.push(u.tag);
  u.u = at.u;
  u.v = at.v;
  u.alive = true;
  u.hp = Math.max(1, Math.round(u.maxHp * REVIVE_HP));
  u.diedAt = undefined;
  u.step = u.swing = u.cast = undefined;
  u.hurtAt = undefined;
  u.busyUntil = b.t + REVIVE_SAFE_MS;
  u.hideUntil = Math.max(u.hideUntil ?? 0, b.t + REVIVE_SAFE_MS);
  u.safeUntil = b.t + REVIVE_SAFE_MS;
  u.lifeRises = (u.lifeRises ?? 0) + 1;
  cleanse(b, u);
  out.push({ kind: 'revive', by: u.id, to: u.id, hp: u.hp });
  out.push({ kind: 'heal', to: u.id, amount: u.hp });
  if (l.vigil) applyVigil(b, [u], l.vigil, out);
  return true;
}

/** Each tick: a fallen hero whose `REVIVE_MS` is up rises, while there is a life for it (the one longest down first). */
export function tickLives(b: Battle, out: BattleEvent[]): void {
  const l = b.lives;
  if (!l || l.left <= 0) return;
  // (a hero down with no time of death on it is counted from now)
  for (const u of fallenHeroes(b)) u.diedAt ??= b.t;
  const due = fallenHeroes(b)
    .filter((u) => u.diedAt !== undefined && b.t - u.diedAt >= REVIVE_MS)
    .sort((x, y) => x.diedAt! - y.diedAt! || x.id - y.id);
  const rose: number[] = [];
  for (const u of due) if (raise(b, u, out)) rose.push(u.id);
  if (rose.length) out.push({ kind: 'life', to: rose, left: l.left, why: 'timer' });
}

/** Every hero is down: nobody waits. All of them rise at once, a life each, in the party's order, for as many as the lives allow.
 *  Returns whether anybody rose (the fight goes on); false is the wave lost. */
export function partyFell(b: Battle, out: BattleEvent[]): boolean {
  const l = b.lives;
  if (!l || l.left <= 0) return false;
  const rose: number[] = [];
  for (const u of fallenHeroes(b)) if (raise(b, u, out)) rose.push(u.id);
  if (!rose.length) return false;
  l.falls++;
  out.push({ kind: 'life', to: rose, left: l.left, why: 'all' });
  return true;
}

/** The clock has run out with heroes standing: `TIMEOUT_LIVES` (or what is left) buy another `allowance` of time. False with no life
 *  left: the wave is lost. */
export function outOfTime(b: Battle, allowance: number, out: BattleEvent[]): boolean {
  const l = b.lives;
  if (!l || l.left <= 0) return false;
  const cost = Math.min(TIMEOUT_LIVES, l.left);
  l.left -= cost;
  l.spent += cost;
  l.falls++;
  b.timeLimit = b.t + allowance;
  out.push({ kind: 'life', to: [], left: l.left, why: 'time' });
  return true;
}
