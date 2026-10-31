// The greedy player, shared by the Auto button, the auto-replay of cleared armies, the balance tool and the tests: it
// picks the squad, summons while the gold lasts (merging every pair, as the Auto merge button does), takes the safe picks of an event, dresses the squad in the pack's gear
// and arranges the heroes on the deploy rows. Everything here is pure and deterministic (no random numbers, no DOM): the
// same run and the same board always give the same formation.

import { DEPLOY_ROWS, standable, tileAt, type Board } from './board';
import { place, unplace, type Battle, type Boost } from './battle';
import { chooseOption, leaveEvent, type EventOption } from './events';
import { levelOfKind } from './levels';
import { heroRank, type Meta } from './meta';
import { awakenStats } from './awaken';
import { boostOf, equip, sitsOut, squadLimit, summon, type Owned, type Run } from './run';
import { localBoost } from './climb';
import { guestBoost } from './guest';
import { autoMerge } from './merge';
import { UNITS } from './units';

/** How strong a hero is for the squad: its base hp times attack, times its boosts (grade, rank, level, gear, bumps). */
export function strengthOf(meta: Meta, h: Owned, run?: Run): number {
  const def = UNITS[h.kind];
  const boost = h.guest && run && !run.local ? guestBoost(run, meta, h) : run?.local ? localBoost(h) : boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), awakenStats(meta, h.kind));
  return def.hp * def.atk * (boost.hp ?? 1) * (boost.atk ?? 1);
}

/** Whether a kind fights from behind: it shoots, or reaches past the next tile. */
export const isBackline = (kind: string): boolean => !!UNITS[kind].shot || UNITS[kind].range > 1;

/** The squad for the next fight: the heroes in `keep` (that are still owned) first, then the strongest of the rest, up to `SQUAD`. One of
 *  each kind (ONE-OF-EACH, `docs/notes/one-of-each.md`): a second of a kind is passed over (the strongest copy is the one taken), so a
 *  smaller roster of kinds fields fewer heroes. */
export function pickSquad(run: Run, meta: Meta, keep: readonly number[] = []): Owned[] {
  // (a hero a mirror's clone stands in for sits out: ONE-OF-EACH)
  // (a guest is not one of the five: it takes its own sixth place after them, GUEST-HERO)
  const kept = keep.map((id) => run.roster.find((h) => h.id === id)).filter((h): h is Owned => !!h && !sitsOut(run, h.id) && !h.guest);
  const rest = run.roster.filter((h) => !kept.includes(h) && !sitsOut(run, h.id) && !h.guest).sort((a, b) => strengthOf(meta, b, run) - strengthOf(meta, a, run) || a.id - b.id);
  const five = oneOfEach([...kept, ...rest]).slice(0, squadLimit(run));
  const guest = run.roster.find((h) => h.guest);
  return guest && !five.some((h) => h.kind === guest.kind) ? [...five, guest] : five;
}

/** The heroes in order with every later hero of a kind already listed left out (ONE-OF-EACH). */
export const oneOfEach = <T extends { kind: string }>(heroes: readonly T[]): T[] => heroes.filter((h, i) => heroes.findIndex((x) => x.kind === h.kind) === i);

/** The best way to spend an event: the free relic, then gear, then a blessing, then coin. A cursed path and anything dear is left alone. */
export function eventPick(options: readonly EventOption[], gold: number): number {
  let best = -1;
  options.forEach((o, i) => {
    const r = pickRank(o);
    if (!o.done && o.cost === 0 && o.cost <= gold && r > 0 && (best < 0 || r > pickRank(options[best]))) best = i;
  });
  return best;
}

/** How much the greedy player wants a free option: a relic, then gear, then a blessing, then coin. A road event's option (MID-EVENTS) is left
 *  alone, as a cursed path is: the road's cards stand in for the old kinds the greedy player took nothing from, so its pace is as it was. */
function pickRank(o: EventOption): number {
  const rank = { relic: 4, gear: 3, buff: 2, gold: 1 } as const;
  return rank[o.effect.t as keyof typeof rank] ?? 0;
}

/** Settles the event waiting between two fights: the best free pick, then on. */
export function autoEvent(run: Run): void {
  while (run.event) {
    let i = eventPick(run.event.options, run.gold);
    // (a card with no way to walk off, a road event's hazard or debt, MID-EVENTS: the page offers no Leave, so neither may the greedy player; it takes the first free choice)
    if (i < 0 && !run.event.options.some((o) => o.effect.t === 'leave')) i = run.event.options.findIndex((o) => o.cost === 0 && !o.done);
    if (i < 0 || chooseOption(run, i) === null) leaveEvent(run);
  }
}

/** Gives the squad the gear in the pack: each piece to the squad hero whose piece in that slot is weakest (or missing), if it is better. */
export function dressSquad(run: Run): void {
  for (let again = true; again; ) {
    again = false;
    for (const g of [...(run.items ?? [])]) {
      const score = (x?: { hp: number; atk: number }) => (x ? x.hp + x.atk : -1);
      const hero = run.roster.filter((h) => run.squad.includes(h.id)).sort((a, c) => score(a.gear?.[g.slot]) - score(c.gear?.[g.slot]))[0];
      if (hero && score(g) > score(hero.gear?.[g.slot]) && equip(run, hero.id, g.id)) again = true;
    }
  }
}

/** Gear owned by the run, worn or in the pack (a merge only moves it, so the difference over a run is what it found). */
export const gearCount = (run: Run): number => (run.items?.length ?? 0) + run.roster.reduce((n, h) => n + Object.keys(h.gear ?? {}).length, 0);

/** Everything between two fights: the event, the summons while the gold lasts, the squad of the strongest, and its gear. Gear is optional so the balance report can leave it out. */
export function autoRound(run: Run, meta: Meta, gear = true): void {
  autoEvent(run);
  // (summons while the gold lasts, tapping Auto merge after each, as a player would: two of a kind merge only when merged)
  autoMerge(run);
  while (summon(run)) autoMerge(run);
  run.squad = pickSquad(run, meta).map((h) => h.id);
  if (gear) dressSquad(run);
}

/** The tiles the heroes may stand on, as `[u, v]`. Boulders are out; water and lava are left for last (`avoidTile`). */
export function deployTiles(board: Board): [number, number][] {
  const out: [number, number][] = [];
  for (let v = board.d - DEPLOY_ROWS; v < board.d; v++) for (let u = 0; u < board.w; u++) if (standable(tileAt(board, u, v))) out.push([u, v]);
  return out;
}

/** Whether a tile is a bad place to stand: shallows slow a hero, lava burns it. */
const avoidTile = (board: Board, u: number, v: number): boolean => {
  const g = tileAt(board, u, v)?.ground;
  return g === 'water' || g === 'lava';
};

/** How good a tile is for a hero: the row for its role, high ground, tall growth (it hides a shooter's line), and a pull to the middle. */
function tileScore(board: Board, u: number, v: number, back: boolean): number {
  const t = tileAt(board, u, v)!;
  const row = v - (board.d - DEPLOY_ROWS); // 0 is the front row
  let s = back ? [0, 1.5, 3][row] : [3, 1.2, 0][row];
  s += t.h * (back ? 1.3 : 0.4);
  if (t.ground === 'tall') s -= back ? 3 : 1;
  if (t.ground === 'ice') s -= 0.3;
  s -= Math.abs(u - (board.w - 1) / 2) * 0.05;
  return s;
}

export interface Spot {
  id: number;
  u: number;
  v: number;
}

/**
 * A formation for `heroes` (a roster id and a kind each): fighters and tanks in the front row (the toughest in the
 * middle), shooters and casters behind them, everyone on high ground where the board has it, water and lava skipped, and
 * no two side by side where a gap will do (a splash blow lands on the tiles around its target). Deterministic: the board
 * and the heroes decide it.
 */
export function autoFormation(board: Board, heroes: readonly { id: number; kind: string }[]): Spot[] {
  const tiles = deployTiles(board);
  const open = tiles.filter(([u, v]) => !avoidTile(board, u, v));
  const pool = open.length >= heroes.length ? open : tiles;
  const order = [...heroes].sort((a, b) => {
    const back = Number(isBackline(a.kind)) - Number(isBackline(b.kind));
    if (back) return back;
    // (the toughest first among fighters; the longest reach first among shooters, so they take the back)
    return isBackline(a.kind) ? UNITS[b.kind].range - UNITS[a.kind].range || a.id - b.id : UNITS[b.kind].hp * (1 + UNITS[b.kind].def / 10) - UNITS[a.kind].hp * (1 + UNITS[a.kind].def / 10) || a.id - b.id;
  });
  const taken: Spot[] = [];
  for (const h of order) {
    let best: [number, number] | null = null;
    let top = -Infinity;
    for (const [u, v] of pool) {
      if (taken.some((s) => s.u === u && s.v === v)) continue;
      let s = tileScore(board, u, v, isBackline(h.kind));
      for (const o of taken) {
        const d = Math.abs(o.u - u) + Math.abs(o.v - v);
        if (d === 1) s -= 1.1;
        else if (d === 2) s -= 0.3;
      }
      if (s > top) {
        top = s;
        best = [u, v];
      }
    }
    if (best) taken.push({ id: h.id, u: best[0], v: best[1] });
  }
  return taken;
}

/** Arranges the run's squad (`boostFor` gives a hero's whole boost, as the page places it; the plain grade, rank and level when unset) on the battle's deploy rows by `autoFormation` (taking back any hero already placed first). Returns the spots. */
export function autoDeploy(b: Battle, run: Run, meta: Meta, boostFor?: (h: Owned) => Boost): Spot[] {
  for (const u of [...b.units]) if (u.side === 'hero') unplace(b, u.def, u.tag);
  // (one of each kind on the field: a squad from an older save with two of a kind sends the later one back to the bench, ONE-OF-EACH)
  const squad = oneOfEach(run.squad.map((id) => run.roster.find((h) => h.id === id)).filter((h): h is Owned => !!h));
  run.squad = squad.map((h) => h.id);
  const spots = autoFormation(b.board, squad);
  for (const s of spots) {
    const h = squad.find((x) => x.id === s.id)!;
    place(b, h.kind, s.u, s.v, h.id, boostFor?.(h) ?? (h.guest && !run.local ? guestBoost(run, meta, h) : run.local ? localBoost(h) : boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), awakenStats(meta, h.kind))));
  }
  return spots;
}
