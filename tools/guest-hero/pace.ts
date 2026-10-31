// GUEST-HERO's yardstick (`docs/notes/guest-hero.md`): how much a guest hero lifts a run's clear rate. Each cell plays the same saves three
// ways, single tries on Normal with the starting five, as `tools/one-of-each`'s cells do:
//
//   none   the greedy player as ever (it never buys a guest)
//   cart   it buys the cart's guest when one is offered and the gold allows (before it hires: the guest is the dearer, better buy)
//   given  it takes the cart's guest whenever one is offered, gold or not (what a guest is worth from the wave it comes)
//   free   a guest from wave 1, free (the most a sixth hero can be worth)
//
// Each way's clear rate is given over all the saves, and over the saves whose run met a guest at the cart ("met").
//
//   node tools/guest-hero/run.mjs orcs:1 undead:22 beasts:20      SAVES (default 48) tries a cell
import { fight, playOut } from '../../src/sim/battle';
import { chooseOption } from '../../src/sim/events';
import { fightXp, gainXp, xpFor } from '../../src/sim/levels';
import { newCastle, xpRate } from '../../src/sim/castle';
import { startedMeta, type Meta } from '../../src/sim/meta';
import { armyById } from '../../src/sim/armies';
import { armyRun, finish, isBossRun, noteFight, startStage } from '../../src/sim/run';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { guestKinds, guestOf, splitGuestXp, takeGuest } from '../../src/sim/guest';
import { HEROES } from '../../src/sim/units';

const SAVES = Number(process.env.SAVES ?? 48);
type Way = 'none' | 'cart' | 'given' | 'free';

function savedAt(level: number, seed: number): Meta {
  const m = startedMeta(seed);
  for (const k of HEROES) m.xp[k] = xpFor(level);
  return m;
}

function play(meta: Meta, armyId: string, seed: number, way: Way): { cleared: boolean; offered: boolean; bought: boolean } {
  const army = armyById(armyId)!;
  const run = armyRun(seed, armyId, HEROES);
  let offered = false;
  while (!run.over) {
    const ev = run.event;
    const i = ev?.options.findIndex((o) => o.effect.t === 'guest') ?? -1;
    if (ev && i >= 0) {
      offered = true;
      if (way === 'cart' && run.gold >= ev.options[i].cost) chooseOption(run, i);
      if (way === 'given' && !guestOf(run)) {
        run.gold += ev.options[i].cost;
        chooseOption(run, i);
      }
    }
    autoRound(run, meta, false);
    if (way === 'free' && run.stage === 1 && !guestOf(run)) takeGuest(run, guestKinds(run)[seed % guestKinds(run).length], 0);
    if (way !== 'none') autoRound(run, meta, false);
    const b = startStage(run);
    autoDeploy(b, run, meta);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, splitGuestXp(run, fightXp(b, xpRate(newCastle()))).lasting);
  }
  return { cleared: !!run.cleared && run.stage >= army.waves.length, offered, bought: !!guestOf(run) };
}

for (const cell of process.argv.slice(2)) {
  const [army, levelS] = cell.split(':');
  const row: string[] = [cell];
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '-');
  for (const way of ['none', 'cart', 'given', 'free'] as const) {
    let won = 0;
    let offered = 0;
    let metWon = 0;
    let bought = 0;
    for (let i = 0; i < SAVES; i++) {
      const r = play(savedAt(Number(levelS), i + 1), army, 700 + i, way);
      won += Number(r.cleared);
      offered += Number(r.offered);
      metWon += Number(r.offered && r.cleared);
      bought += Number(r.bought);
    }
    row.push(`${way} ${pct(won, SAVES)} (met ${pct(metWon, offered)} of ${offered}${way === 'cart' ? `, bought ${bought}` : ''})`);
  }
  console.log(row.join('\t'));
}
