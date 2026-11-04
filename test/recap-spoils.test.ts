// RECAP-SPOILS (docs/notes/hud-faces.md): the final recap's spoils (a run's gains summed, sorted into money, gear and items, no run gold),
// the Last Stand's end as spoils, and the recap's heroes: only fielded heroes, never a summon (its work counts for its caller).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle } from '../src/sim/battle';
import { fieldedHero, mvpOf, recapKind, startStats, tally } from '../src/sim/fightStats';
import { mvpKind, newRecap, noteFightStats } from '../src/sim/runRecap';
import { noteSpoils, spoilsOf, standSpoilGains, gearWhere, SPOILS_KEPT } from '../src/sim/runSpoils';
import type { WaveGain } from '../src/sim/waveGains';
import type { Run } from '../src/sim/run';

const g = (kind: WaveGain['kind'], id: string, name: string, n = 1, rarity?: number): WaveGain => ({ kind, id, name, n, ...(rarity ? { rarity } : {}) });

test("a run's gains are summed wave by wave: the same thing again adds to its count, hires are not spoils", () => {
  const r = newRecap();
  noteSpoils(r, [g('shard', 'knight', 'Kwame shard', 3), g('gear', 'weapon:1', 'Iron Blade', 1, 1), g('recruit', 'archer', 'Natsu')]);
  noteSpoils(r, [g('shard', 'knight', 'Kwame shard', 2), g('chest', 'silver', 'Silver chest')]);
  assert.deepEqual(r.spoils, [g('shard', 'knight', 'Kwame shard', 5), g('gear', 'weapon:1', 'Iron Blade', 1, 1), g('chest', 'silver', 'Silver chest')]);
  for (let i = 0; i < SPOILS_KEPT + 10; i++) noteSpoils(r, [g('relic', `r${i}`, `Relic ${i}`)]);
  assert.equal(r.spoils!.length, SPOILS_KEPT, 'a long run keeps at most SPOILS_KEPT lines');
});

test('the spoils page sorts into money (crowns, stones; never gold), gear (rarest first, where it went) and items', () => {
  const gains = [
    g('tome', 'small', 'Small tome', 2),
    g('gear', 'weapon:1', 'Iron Blade', 1, 1),
    g('stone', 'stone', 'Summoning stone', 3),
    g('equip', 'sword:4', 'Dawnbreaker', 1, 4),
    g('gear', 'armour:3', 'Silver Plate', 1, 3),
    g('chest', 'gold', 'Gold chest'),
    g('joined', 'paladin', 'Karim'),
  ];
  const sp = spoilsOf(gains, 140, { 'Silver Plate': 'Kenji' });
  assert.deepEqual(sp.money.map((m) => [m.id, m.n]), [['crowns', 140], ['stones', 3]]);
  assert.ok(!sp.money.some((m) => /gold/i.test(m.label)), 'no run gold on the final recap (the owner)');
  assert.deepEqual(sp.gear.map((x) => [x.gain.name, x.where]), [['Dawnbreaker', 'To the armoury'], ['Silver Plate', 'Worn by Kenji'], ['Iron Blade', "In the run's pack"]]);
  assert.deepEqual(sp.items.map((x) => x.kind), ['joined', 'chest', 'tome']);
  assert.equal(sp.empty, false);
  assert.equal(spoilsOf([], 0).empty, true, 'a run that found nothing has an empty page (the view says so in a line)');
  assert.equal(gearWhere(g('equip', 'x:2', 'X', 1, 2), {}), 'To the armoury');
});

test("the Last Stand's end becomes spoils: chests, equipment matched for rarity, rift ores and relics", () => {
  const equipment = [{ id: 1, base: 'sword', rarity: 2, level: 1 }, { id: 2, base: 'sword', rarity: 3, level: 1 }] as never[];
  const out = standSpoilGains({ bronze: 2, silver: 0, gold: 1, gear: [], ores: [{ trait: 'nope', n: 2 }] as never, relics: 3, heldRelics: 1 }, equipment);
  assert.deepEqual(out.map((x) => [x.kind, x.n]), [['chest', 1], ['chest', 2], ['ore', 2], ['relic', 3]]);
  assert.match(out.at(-1)!.name, /holding the line/);
});

test('the recap holds only fielded heroes: a summon has no row and is never the MVP; what it does counts for its caller', () => {
  const b = bareBoard(startBattle(5));
  b.units = [];
  const druid = addUnit(b, 'druid', 2, 9);
  const knight = addUnit(b, 'knight', 4, 9);
  const treant = addUnit(b, 'treant', 3, 8);
  treant.owner = druid.id;
  const wolf = addUnit(b, 'wolf', 5, 8);
  const foe = addUnit(b, 'skeleton', 3, 3);
  assert.equal(fieldedHero(druid), true);
  assert.equal(fieldedHero(treant), false);
  assert.equal(fieldedHero(wolf), false, 'a summon kind is never a hero row, with or without a caller');
  assert.equal(fieldedHero(foe), false);
  const stats = startStats(b.units);
  assert.deepEqual(stats.map((s) => s.kind).sort(), ['druid', 'knight']);
  // (the treant does the most: it is credited to the druid)
  tally(stats, [{ kind: 'hit', by: treant.id, to: foe.id, dmg: 500, heavy: false, splash: false, killed: true, src: 'blow' } as never], b.units);
  assert.equal(mvpOf(stats)?.kind, 'druid');
  assert.equal(stats.find((s) => s.kind === 'druid')!.dealt, 500);
  // (an old save's recap with a summon's row: still no row and no MVP)
  const run = { recap: newRecap() } as unknown as Run;
  noteFightStats(run, stats, 1000, true);
  run.recap!.heroes.wolf = { dealt: 9999, taken: 0, healed: 0, kills: 9, grade: 1 };
  assert.equal(mvpKind(run.recap!), 'druid');
  assert.deepEqual(Object.keys(run.recap!.heroes).filter(recapKind).sort(), ['druid', 'knight']);
  assert.equal(recapKind('duchess'), false);
  assert.equal(knight.side, 'hero');
});
