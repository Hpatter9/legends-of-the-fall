// MID-EVENTS' browser check helper: an army run between two waves with a chosen road card (or the passing cart) waiting, as a save.
import { drawRoad, type RoadKind } from '../../src/sim/midEvents';
import { marketOptions, MARKET_BUYS } from '../../src/sim/market';
import { armyRun, recruit, finish } from '../../src/sim/run';
import { makeGear } from '../../src/sim/gear';
import { Rng } from '../../src/sim/rng';

/** A run of an army at stage `stage + 1`, its card for the gap after `stage` waiting. */
export function cardRun(kind: RoadKind | 'market', army = 'orcs', stage = 4, seed = 11): string {
  const run = armyRun(seed, army, ['knight', 'samurai', 'kunoichi', 'archer', 'wizard']);
  for (const k of ['knight', 'knight', 'archer', 'wizard', 'kunoichi', 'samurai']) recruit(run, k);
  run.squad = run.roster.slice(0, 5).map((h) => h.id);
  run.roster[0].grade = 2;
  run.items = [makeGear(500, 'weapon', 1)];
  run.gold = 160;
  run.stage = stage;
  finish(run, true);
  run.retries = kind === 'crown' ? 0 : 1;
  if (kind === 'ladyDue') run.road = { owed: [{ kind: 'ladyDue', due: stage, relic: 'banner' }], seen: ['pact'] };
  if (kind === 'ladyDue') run.relics = ['banner'];
  if (kind === 'refugeesReturn') run.road = { owed: [{ kind: 'refugeesReturn', due: stage, big: true }], seen: ['refugees'] };
  run.event = kind === 'market'
    ? { kind: 'merchant', stage, title: 'A passing cart', text: "A cart creaks out of the mist, hung with lanterns, pots and somebody's armour. The pedlar swears everything is a bargain. He swears it to the goat, too.", options: marketOptions(run, stage), buys: MARKET_BUYS }
    : drawRoad(run, stage, kind, new Rng(stage * 31 + 7));
  return JSON.stringify(run);
}
