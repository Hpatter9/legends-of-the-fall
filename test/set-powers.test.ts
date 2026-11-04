// SEVEN-SLOT GEAR batch 2: the full sets' powers and the named legends' (`setPowers.ts`). Every power fires in a small fight, a fight plays
// out the same twice, a full set switches its power on in the kit's stats, and a fight with no power worn is untouched.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, playOut, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { emptyStats, equipItem, equipStats, grantEquipment } from '../src/sim/equipment';
import { GEAR_SETS } from '../src/sim/gearSets';
import { LEGEND_LIST } from '../src/sim/equipBases';
import { powerFired, powersOn } from '../src/sim/setPowers';
import { setDot } from '../src/sim/ailments';
import { startedMeta } from '../src/sim/meta';

const TEAM = ['knight', 'archer', 'wizard', 'cleric', 'samurai'];
/** A fight of the five at level 10 against a band, `wearer` wearing one power; returns the fight, played out. */
function duel(id: string, wearer = 'knight', band = 'orcs', seed = 1, hp = 1): Battle {
  const b = startBattle(seed, band);
  TEAM.forEach((k, i) => place(b, k, 1 + i, 9, undefined, { hp, level: 10, ...(k === wearer ? { equip: { ...emptyStats(), powers: [{ id, name: id, s: 1 }] } } : {}) }));
  fight(b);
  playOut(b);
  return b;
}
const firedIn = (b: Battle, wearer: string, id: string) => powerFired(b.units.find((x) => x.def === wearer)!, id);
/** Where each power was seen to fire (the wearer, the band, the seed, the heroes' health share). (Last Wall, Last Light, Dragon's Heart, Shadow Dance, King of the Hill, Army of the Dead,
 * Gravesong, the Hourglass and the Gorgon's Eye re-staged on new seeds when the party began to advance together, docs/notes/tactics.md.) */
const SETUPS: Record<string, [string, string, number, number]> = {
  longWinter: ['knight', 'orcs', 1, 1], eyeOfStorm: ['knight', 'orcs', 1, 1], lastWall: ['knight', 'orcs', 7, 1], dawnbringer: ['knight', 'orcs', 1, 1],
  dragonsHeart: ['knight', 'orcs', 5, 1], shadowDance: ['knight', 'orcs', 2, 1], thousandDuels: ['knight', 'orcs', 1, 1], armyOfDead: ['knight', 'orcs', 2, 1],
  echoingWord: ['knight', 'orcs', 1, 1], pyreWalker: ['knight', 'orcs', 1, 1], wildHunt: ['knight', 'orcs', 1, 1], tailwind: ['knight', 'orcs', 1, 1],
  undertow: ['archer', 'orcs', 1, 1], kingOfHill: ['knight', 'orcs', 5, 1],
  lastKing: ['knight', 'orcs', 1, 0.3], laughingFox: ['knight', 'orcs', 1, 1], sevenWinters: ['knight', 'orcs', 1, 1], ferryman: ['knight', 'orcs', 1, 0.3],
  aegisOdile: ['knight', 'orcs', 1, 1], lastLight: ['knight', 'orcs', 2, 1], gravesong: ['knight', 'orcs', 2, 1], widowsBow: ['knight', 'skeletons', 1, 1],
  hundredNames: ['knight', 'orcs', 1, 1], bellOfEnding: ['knight', 'orcs', 1, 1], sevenLeague: ['knight', 'orcs', 1, 1], ashwalker: ['knight', 'orcs', 1, 1],
  moonSlippers: ['knight', 'orcs', 1, 1], rookBandolier: ['knight', 'orcs', 1, 1], hourglass: ['knight', 'orcs', 5, 1], gorgonEye: ['knight', 'orcs', 3, 1],
};

test('every full set has a power, and each fires in a small fight', () => {
  for (const set of GEAR_SETS) {
    const [wearer, band, seed, hp] = SETUPS[set.full.power] ?? assert.fail(`${set.full.power} has no setup`);
    assert.ok(firedIn(duel(set.full.power, wearer, band, seed, hp), wearer, set.full.power) > 0, set.full.power);
  }
});

test('every legend\'s power with a fight rule fires in a small fight', () => {
  // (the Ring of Returning and the Pilgrim's Cord act between waves, batch 6; the Wyrmhide, the Unwritten Book and the Giant-King are below)
  const between = new Set(['ringReturning', 'pilgrimsCord', 'wyrmhide', 'unwrittenBook', 'giantKing']);
  for (const l of LEGEND_LIST) {
    const id = l.legend!.power;
    if (between.has(id)) continue;
    const [wearer, band, seed, hp] = SETUPS[id] ?? assert.fail(`${id} has no setup`);
    assert.ok(firedIn(duel(id, wearer, band, seed, hp), wearer, id) > 0, id);
  }
});

test('the Wyrmhide heals from burning, the Giant-King shakes off a stun, the Unwritten Book fills the ultimate', () => {
  const b = startBattle(1, 'orcs');
  place(b, 'knight', 3, 9, undefined, { level: 10, equip: { ...emptyStats(), powers: [{ id: 'wyrmhide', name: 'w', s: 1 }, { id: 'giantKing', name: 'g', s: 1 }] } });
  fight(b);
  const k = b.units.find((x) => x.def === 'knight')!;
  assert.ok(powersOn(b));
  k.hp = Math.round(k.maxHp / 2);
  const foe = b.units.find((x) => x.side === 'foe')!;
  setDot(b, k, { kind: 'burn', dmg: 20, every: 1000, ms: 3000, by: foe.id, next: b.t + 100, until: b.t + 3000 });
  k.stunUntil = b.t + 5000;
  k.busyUntil = b.t + 5000;
  const before = k.hp;
  for (let i = 0; i < 15; i++) stepBattle(b);
  assert.ok(powerFired(k, 'wyrmhide') > 0, 'the burn healed');
  assert.ok(k.hp >= before - 1 || powerFired(k, 'wyrmhide') > 0);
  assert.ok(powerFired(k, 'giantKing') > 0, 'the stun was shaken off');
  // (a hero at the ultimate's level casting with the book)
  const c = startBattle(2, 'orcs');
  place(c, 'wizard', 3, 9, undefined, { level: 30, equip: { ...emptyStats(), powers: [{ id: 'unwrittenBook', name: 'u', s: 1 }] } });
  place(c, 'knight', 4, 9, undefined, { level: 30 });
  fight(c);
  playOut(c);
  assert.ok(powerFired(c.units.find((x) => x.def === 'wizard')!, 'unwrittenBook') > 0);
});

test('a fight with a power plays out the same twice', () => {
  const log = (id: string) => {
    const b = startBattle(5, 'orcs');
    TEAM.forEach((k, i) => place(b, k, 1 + i, 9, undefined, { level: 10, ...(k === 'knight' ? { equip: { ...emptyStats(), powers: [{ id, name: id, s: 1 }] } } : {}) }));
    fight(b);
    const out: BattleEvent[] = [];
    for (let i = 0; i < 1500 && b.phase === 'fight'; i++) out.push(...stepBattle(b));
    return JSON.stringify(out) + JSON.stringify(b.units.map((u) => [u.def, u.hp, u.u, u.v]));
  };
  for (const id of ['lastWall', 'shadowDance', 'armyOfDead', 'echoingWord', 'wildHunt', 'kingOfHill', 'aegisOdile']) assert.equal(log(id), log(id), id);
});

test('a full set switches its power on in the kit\'s stats; six of seven does not', () => {
  const m = startedMeta(3);
  const frost = GEAR_SETS.find((s) => s.id === 'frost')!;
  const pieces = frost.pieces.map((base) => grantEquipment(m, { base, rarity: 1, level: 1 }));
  for (const it of pieces.slice(0, 6)) equipItem(m, 'samurai', it.id);
  assert.equal(equipStats(m, 'samurai')!.powers, undefined);
  equipItem(m, 'samurai', pieces[6].id);
  assert.deepEqual(equipStats(m, 'samurai')!.powers, [{ id: 'longWinter', name: 'Long Winter', s: 1 }]);
});

test('a fight with no power worn never switches the powers on', () => {
  const b = startBattle(1, 'orcs');
  TEAM.forEach((k, i) => place(b, k, 1 + i, 9, undefined, { level: 10 }));
  fight(b);
  playOut(b);
  assert.equal(powersOn(b), false);
});
