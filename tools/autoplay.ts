// A greedy player for the armies, shared by the balance report (`tools/balance.ts`) and the tests: it summons whenever
// the gold allows, takes the best free pick of an event, fields the five strongest heroes (fighters in front, shooters
// behind, on high ground; see `src/sim/autoplay.ts`, which the Auto button and the auto-replay share) and plays an army's waves from wave 1 until a fight is lost or the last boss falls. Hero levels come from, and
// XP goes into, the save's meta, as the page does.

import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, playOut, type Battle } from '../src/sim/battle';
import { chooseOption, leaveEvent } from '../src/sim/events';
import { fightXp, gainXp, levelOfKind, xpFor } from '../src/sim/levels';
import { newCastle, xpRate, type Castle } from '../src/sim/castle';
import { newMeta, rankOf, type Meta } from '../src/sim/meta';
import { armyById } from '../src/sim/armies';
import { armyRun, boostOf, finish, isBossRun, noteFight, SQUAD, startStage, summon, tierOfRun, type Run } from '../src/sim/run';
import { armyRules } from '../src/sim/armyStars';
import { ratingOf } from '../src/sim/stars';
import { autoDeploy, autoRound, dressSquad, strengthOf } from '../src/sim/autoplay';
import { UNITS } from '../src/sim/units';
import { buy, choices, clearNode, enterNode, finishMystery, finishTower, openTreasure, rest, train, type MapNode, type NodeKind } from '../src/sim/tower';
import { towerRun } from '../src/sim/modes';
import { squadHealth } from '../src/sim/health';

export { strengthOf };

/** The deploy tiles front row first, the middle of a row first: where the tower climb's greedy player puts the heroes that hold the line. */
export function frontSpots(b: Battle): [number, number][] {
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  const mid = (b.board.w - 1) / 2;
  return spots.sort((a, c) => a[1] - c[1] || Math.abs(a[0] - mid) - Math.abs(c[0] - mid) || a[0] - c[0]);
}

/**
 * One attempt at an army from wave 1, as a greedy player: returns the waves won and whether the army fell. Gains XP into `meta`.
 * With `castle` the run takes its buildings (and the library's share of XP); `gear` dresses the squad with the pieces the run finds.
 */
export function playArmy(meta: Meta, armyId: string, seed: number, party: readonly string[], castle: Castle = newCastle(), gear = false, tier = 0): { won: number; cleared: boolean; stars: number } {
  const army = armyById(armyId)!;
  const run: Run = armyRun(seed, armyId, party, castle, tier);
  let won = 0;
  while (!run.over) {
    autoRound(run, meta, gear);
    const b = startStage(run);
    autoDeploy(b, run, meta);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    if (ok) won = run.stage;
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b, xpRate(castle)));
  }
  const cleared = !!run.cleared && won === army.waves.length;
  return { won, cleared, stars: cleared ? armyRules(army, tierOfRun(run), run).filter((r) => r.earned).length : 0 };
}

/** A save whose party kinds are all at `level` (and nothing else). */
export function savedAt(level: number, party: readonly string[], seed: number): Meta {
  const m = newMeta(seed);
  for (const k of party) m.xp[k] = xpFor(level);
  return m;
}


/** Fields the five strongest of the run's roster (fighters in front, shooters behind) and plays the node's battle out. Returns the battle. */
function fightNode(meta: Meta, run: Run): Battle {
  const squad = [...run.roster].sort((a, b) => strengthOf(meta, b) - strengthOf(meta, a)).slice(0, SQUAD);
  run.squad = squad.map((h) => h.id);
  dressSquad(run);
  const b = startStage(run);
  const spots = frontSpots(b);
  const order = [...squad].sort((a, c) => Number(UNITS[a.kind].range > 1) - Number(UNITS[c.kind].range > 1));
  order.forEach((h, i) => place(b, h.kind, spots[i][0], spots[i][1], h.id, { ...boostOf(h, rankOf(meta, h.kind), levelOfKind(meta, h.kind)), carry: run.tower!.hp[String(h.id)] }));
  fight(b);
  playOut(b);
  return b;
}

/** How much a greedy player wants each node now: hurt parties want fires and shops, healthy ones elites, the rich shops. */
function wantOf(run: Run, n: MapNode): number {
  const hurt = 1 - squadHealth(run);
  const want: Record<NodeKind, number> = {
    fight: 3,
    elite: squadHealth(run) > 0.7 ? 5 : 1,
    campfire: 2 + 9 * hurt,
    shop: run.gold >= 80 ? 4 + 4 * hurt : 1 + 3 * hurt,
    treasure: 6,
    mystery: 3.5,
    boss: 9,
  };
  return want[n.kind];
}

/** What the greedy player does at a shop: a draught when hurt, then the relics, gear and heroes it can afford, dearest first. */
function shopAll(run: Run): void {
  const stock = run.tower!.cur!.shop!;
  for (let again = true; again; ) {
    again = false;
    const hurt = squadHealth(run) < 0.6;
    const order = stock.map((it, i) => ({ it, i })).filter((x) => !x.it.sold && x.it.cost <= run.gold).sort((a, b) => Number(b.it.kind === 'heal' && hurt) - Number(a.it.kind === 'heal' && hurt) || Number(a.it.kind === 'heal' || a.it.kind === 'elixir') - Number(b.it.kind === 'heal' || b.it.kind === 'elixir') || b.it.cost - a.it.cost);
    for (const { it, i } of order) {
      if ((it.kind === 'heal' || it.kind === 'elixir') && squadHealth(run) > 0.75) continue;
      if (buy(run, i)) {
        again = true;
        break;
      }
    }
  }
}

/**
 * One climb of the endless tower as a greedy player: picks the node it wants most from those joined to the last, spends at shops,
 * rests when hurt, opens every chest and takes the first option of a mystery. Plays until a fight is lost or `maxFloors`
 * floors are cleared. Gains the fights' XP (and the campfires') into `meta`. Returns the floors cleared and the bosses felled.
 */
export function playTower(meta: Meta, seed: number, party: readonly string[] = meta.party, castle: Castle = newCastle(), maxFloors = 90): { floors: number; bosses: number; act: number } {
  const run = towerRun(seed, { ...meta, party: [...party], castle } as Meta);
  while (!run.over && run.stage <= maxFloors) {
    while (summon(run)) {
      // (summons while the gold lasts, but keeps a purse for the shop when a fire is near)
    }
    const pick = [...choices(run)].sort((a, b) => wantOf(run, b) - wantOf(run, a) || a.id - b.id)[0];
    enterNode(run, pick.id);
    const cur = run.tower!.cur!;
    if (cur.fight) {
      const b = fightNode(meta, run);
      const ok = b.phase === 'won';
      gainXp(meta, fightXp(b, xpRate(castle)));
      finishTower(run, b, ok, ratingOf(b, cur.kind === 'boss').stars);
    } else if (cur.kind === 'campfire') {
      if (squadHealth(run) < 0.75) rest(run);
      else {
        const hero = [...run.roster].sort((a, b) => strengthOf(meta, b) - strengthOf(meta, a))[0];
        const t = train(run, hero.id);
        if (t) gainXp(meta, { [t.kind]: t.xp });
      }
      clearNode(run);
    } else if (cur.kind === 'shop') {
      shopAll(run);
      clearNode(run);
    } else if (cur.kind === 'treasure') {
      openTreasure(run);
      clearNode(run);
    } else {
      while (run.event) if (chooseOption(run, 0) === null) leaveEvent(run);
      finishMystery(run);
    }
  }
  return { floors: run.stage - 1, bosses: run.tower!.bosses, act: run.tower!.act };
}
