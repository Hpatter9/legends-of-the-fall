// Party tactics (docs/notes/tactics-design.md, docs/notes/tactics.md): the order the player gives the party before a fight.
//
//   - Advance together: the strikers and the back line march behind the front line, and save their openers (the skills that carry them into
//     the foe), until the line meets the foe: a front-liner swings its first blow, or is struck. A held hero still casts its other skills, and
//     strikes or shoots whatever is already in its reach. Each is let go at once when a foe comes beside it, and all of them after
//     6 s, or when no front-liner is standing (a party with none advances as it charges).
//   - Charge: everyone goes at once, as every fight went before the tactics.
//   - Hold the line: nobody leaves the deploy rows (a front-liner may step one row out) until a foe comes within 2 tiles of a hero, or 10 s pass.
//
// The player's Charge! (one a fight, `orderCharge`) lets everyone go early. None of it rolls a die: what is held, and when the line meets the
// foe, is read from where the fighters stand. The Last Stand has its own mind and takes no tactic.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { DEPLOY_ROWS } from './board';
import type { Battle, BattleEvent, Unit } from './battle';
import { walkFrom, firstStep } from './path';
import { roleOf } from './suggest';
import { UNITS } from './units';

export type Tactic = 'advance' | 'charge' | 'hold';
export const TACTICS_LIST: readonly Tactic[] = ['advance', 'charge', 'hold'];

/** The switches: the tactic a fight takes when the page (or a tool) sets none (Charge plays every fight exactly as before the tactics), and
 *  the foes' answer to the party's tactics: every foe of a fight's band strikes this much harder (`startBattle`; attack alone, so no health is rounded twice; the owner's
 *  answer: the foes are strengthened so each mode keeps its pace with Advance the default; the Last Stand's waves, which come by their own
 *  rules, are left as they were). */
export const TACTICS = { fallback: 'advance' as Tactic, answer: 1.02, edge: true };

/** Charge's edge (batch 6, the owner's answer: the counter to the bands that shoot): a charging party marches `MOVE` faster for its first
 *  `MS`, and each hero's first landed blow on a foe that shoots is `BLOW` (from the fight's start under Charge, from the call under the
 *  player's Charge!). `TACTICS.edge` off plays the old Charge. */
export const CHARGE = { MOVE: 1.2, MS: 6000, BLOW: 1.6 };

/** The fight's tactic, once it has begun: who is held, who the front line is, and when the line met the foe (then nobody is held). */
export interface TacticState {
  kind: Tactic;
  /** The heroes held (by id): under Advance the strikers and the back line, under Hold every hero placed. */
  held: number[];
  /** The front-liners (by id), whose meeting the foe lets the others go. */
  front: number[];
  /** The front-liners' health as the fight began (a front-liner below it has been struck). */
  hp: number[];
  /** When the line met the foe, or the player called the charge (battle time). */
  metAt?: number;
  /** Whether the player has called the charge (it may be called once). */
  charged?: boolean;
  /** Charge's edge: when it began (battle time), and the heroes whose first blow has landed. */
  edgeAt?: number;
  struck?: number[];
}

/** A held hero is let go when a foe comes this near it (beside it). */
export const SELF_NEAR = 1;
/** Under Hold, the line meets the foe when a foe is within this many tiles of a hero. */
export const LINE_NEAR = 2;
/** Everyone is let go after this long (ms): Advance, Hold. */
export const ADVANCE_CAP = 6000;
export const HOLD_CAP = 10000;

/** The openers: the skills (by name or key) that carry their caster into the foe, held under Advance and Hold until the line meets the foe.
 *  Read from seeded fights (`tools/tactics/openers.ts`: a skill whose caster ends its tick nearer the foe) and the kits' own words; escapes
 *  (Smoke Bomb, the Lightning Mage's blink, the Archer's leap back) and the front-liners' charges (Shield Rush, Gore Charge) are not. */
export const OPENERS: ReadonlySet<string> = new Set([
  'Shadow Step', // the Kunoichi
  'Pilfer', // the Karasu Tengu
  'Ravage', // the Werewolf
  'Voltage Blink', // the Arc Blade
  'Iaido', // the Samurai
  'Stillness Palm', 'Quivering Palm', // the Ninja Monk
  'Fox Guise', 'Alter Self', // the Kitsune
  'Bounty Hunt', // the Mercenary
  'Cavalry Charge', 'Charge of the Knights', // the Lancer's ultimate
  'Dragon Dive', // the Queen Dragoon's
]);

export const isOpener = (s: { name: string; key?: string }): boolean => OPENERS.has(s.name) || (s.key !== undefined && OPENERS.has(s.key));

/** Set by `decide` round a held hero's casting: the hero kits skip an opener while it is true. */
export const castGate = { held: false };

/** Pick the party's tactic for the fight to come (before `fight`; the page's prep screen, the tools). */
export function setTactic(b: Battle, kind: Tactic): void {
  if (b.phase !== 'deploy') return;
  b.tacticPick = kind;
}

/** The tactic the fight will take: the one picked, else the switch's. */
export const tacticOf = (b: Battle): Tactic => b.tacticPick ?? TACTICS.fallback;

/** As the fight begins: who is held, and who the front line is. Nothing is held under Charge, in the Last Stand, or (under Advance) in a
 *  party with no front-liner. */
export function startTactic(b: Battle): void {
  const kind = tacticOf(b);
  b.tactic = undefined;
  if (b.stand) return;
  if (kind === 'charge') {
    // (Charge holds nobody; its edge, when on, is kept in the state: the line has met the foe from the start)
    if (TACTICS.edge) b.tactic = { kind, held: [], front: [], hp: [], metAt: 0, edgeAt: 0, struck: [] };
    return;
  }
  const heroes = b.units.filter((u) => u.alive && u.side === 'hero' && UNITS[u.def]?.side === 'hero');
  const front = heroes.filter((u) => roleOf(u.def) === 'front').map((u) => u.id);
  if (kind === 'advance' && !front.length) return;
  const held = kind === 'hold' ? heroes.map((u) => u.id) : heroes.filter((u) => !front.includes(u.id)).map((u) => u.id);
  if (!held.length) return;
  b.tactic = { kind, held, front, hp: front.map((id) => b.units.find((u) => u.id === id)!.hp) };
}

const near = (a: { u: number; v: number }, c: { u: number; v: number }) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
const foesOf = (b: Battle) => b.units.filter((x) => x.alive && x.side === 'foe');

/** Each tick, before the fighters act: whether the line has met the foe (then a `lineMet` event, once). */
export function tickTactic(b: Battle, out: BattleEvent[]): void {
  const t = b.tactic;
  if (!t || t.metAt !== undefined) return;
  const foes = foesOf(b);
  const cap = t.kind === 'hold' ? HOLD_CAP : ADVANCE_CAP;
  let met = b.t >= cap;
  if (t.kind === 'hold') {
    // (Hold: a foe has come up to the line)
    const line = b.units.filter((u) => u.alive && t.held.includes(u.id));
    met ||= !line.length || line.some((u) => foes.some((f) => near(u, f) <= LINE_NEAR));
  } else {
    // (Advance: a front-liner has swung its first blow, or been struck)
    const line = t.front.map((id, i) => ({ u: b.units.find((x) => x.id === id)!, hp: t.hp[i] })).filter((x) => x.u.alive);
    met ||= !line.length || line.some((x) => x.u.hp < x.hp || x.u.swing !== undefined);
  }
  if (!met) return;
  t.metAt = b.t;
  out.push({ kind: 'lineMet', how: 'met' });
}

/** The player's Charge!: lets everyone go, one call a fight (false, and nothing changes, when there is nobody to let go or it was called
 *  already). Like every tap it is queued and applied at the start of the next tick (`applyOrders`), so the fight replays. */
export function orderCharge(b: Battle): boolean {
  const t = b.tactic;
  if (b.phase !== 'fight' || !t || t.metAt !== undefined || t.charged) return false;
  (b.orders ??= []).push({ t: b.t, kind: 'charge' });
  return true;
}

/** Whether the Charge! can be called now (for the page's button). */
export const canCharge = (b: Battle): boolean => b.phase === 'fight' && !!b.tactic && b.tactic.metAt === undefined && !b.tactic.charged;

/** The order applied at the start of a tick (`applyOrders`). */
export function applyCharge(b: Battle, out: BattleEvent[]): void {
  const t = b.tactic;
  if (!t || t.metAt !== undefined) return;
  t.charged = true;
  t.metAt = b.t;
  if (TACTICS.edge) {
    t.edgeAt = b.t;
    t.struck = [];
  }
  out.push({ kind: 'lineMet', how: 'charge' });
}

/** Whether `me` is held now: one of the held, the line not yet met, no foe within `SELF_NEAR` of it, and nothing else drawing it (a taunt,
 *  a charm). */
export function heldBy(b: Battle, me: Unit): boolean {
  const t = b.tactic;
  if (!t || t.metAt !== undefined || !t.held.includes(me.id)) return false;
  if (me.taunt && me.taunt.until > b.t) return false;
  if (me.charmUntil !== undefined && me.charmUntil > b.t) return false;
  return !foesOf(b).some((f) => near(me, f) <= SELF_NEAR);
}

/** The nearest row (battle `v`) a held hero may stand on: under Advance one behind the foremost front-liner, under Hold the deploy rows (a
 *  front-liner one row more). The heroes stand on the high rows and march toward row 0. */
export function lineRow(b: Battle, me: Unit): number {
  const t = b.tactic!;
  const deploy = b.board.d - DEPLOY_ROWS;
  if (t.kind === 'hold') return t.front.includes(me.id) ? deploy - 1 : deploy;
  const front = b.units.filter((u) => u.alive && t.front.includes(u.id));
  return front.length ? Math.min(...front.map((u) => u.v)) + 1 : 0;
}

/** A held hero's step: toward the foe, but never past its row (`lineRow`); the tile to step to, or -1 to wait where it is. */
export function heldStep(b: Battle, me: Unit, jump: number): number {
  const row = lineRow(b, me);
  const blocked = new Set<number>();
  for (const x of b.units) if (x.alive && x !== me) blocked.add(x.v * b.board.w + x.u);
  const walk = walkFrom(b.board, me, jump, blocked, me.side);
  const foes = foesOf(b);
  if (!foes.length) return -1;
  const score = (u: number, v: number) => Math.min(...foes.map((f) => near({ u, v }, f)));
  // (a hero standing past the line waits there for the line to come up; else it keeps its tile unless one in bounds is nearer the foe)
  if (me.v < row) return -1;
  let best = me.v * b.board.w + me.u;
  let top = score(me.u, me.v);
  let cost = 0;
  for (let i = 0; i < walk.cost.length; i++) {
    if (walk.cost[i] === Infinity || walk.cost[i] === 0 || blocked.has(i)) continue;
    const v = Math.floor(i / b.board.w);
    if (v < row) continue;
    const s = score(i % b.board.w, v);
    if (s < top || (s === top && walk.cost[i] < cost)) {
      top = s;
      best = i;
      cost = walk.cost[i];
    }
  }
  if (best === me.v * b.board.w + me.u) return -1;
  return firstStep(walk, best) ?? -1;
}

/** Charge's edge on a step: the heroes of a charging party march quicker in its first seconds. */
export function chargeMove(b: Battle, me: Unit): number {
  const t = b.tactic;
  return t?.edgeAt !== undefined && me.side === 'hero' && b.t - t.edgeAt <= CHARGE.MS ? CHARGE.MOVE : 1;
}

/** Charge's edge on a blow: a charging hero's first landed blow on a foe that shoots (the call marks it landed). */
export function chargeBlow(b: Battle, me: Unit, to: Unit): number {
  const t = b.tactic;
  if (t?.edgeAt === undefined || me.side !== 'hero' || !UNITS[to.def]?.shot || !t.struck || t.struck.includes(me.id)) return 1;
  t.struck.push(me.id);
  return CHARGE.BLOW;
}
