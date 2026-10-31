import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, stepBattle, playOut, hurt, type Battle } from '../src/sim/battle';
import { RELICS, RELIC_IDS, relicEffects } from '../src/sim/relics';
import { boostOf, equip, finish, gradeBoost, loadRun, newRun, saveRun, startStage, unequip } from '../src/sim/run';
import { gearBoost, makeGear } from '../src/sim/gear';
import { readyBattle } from './helpers';

// (RELICS-2, the owner's approved redesign: the keep's 24 relics in six Chapters, each with a story and a rule of its own; these tests
// follow the new numbers)
test('there are 24 of the keep\'s relics, each with a name, a line of lore, a rule and a rarity', () => {
  assert.equal(RELIC_IDS.length, 24);
  for (const id of RELIC_IDS) assert.ok(RELICS[id].name && RELICS[id].text && RELICS[id].lore && RELICS[id].rarity !== 'storied', id);
});

test('relic effects multiply, add and ignore unknown ids and repeats', () => {
  const fx = relicEffects(['whetstone', 'banner', 'whetstone', 'nope', 'ironShield', 'luckyCoin', 'phoenix', 'warDrum']);
  assert.ok(Math.abs(fx.atk! - 1.03) < 1e-9, 'the Whetstone starts at +3%');
  assert.ok(Math.abs(fx.hp! - 1.06) < 1e-9);
  assert.equal(fx.guard, 0.1);
  assert.ok(Math.abs(fx.speed! - 0.96) < 1e-9, "the Gate Boss's price");
  assert.equal(fx.gold, 8);
  assert.equal(fx.revive, true);
  assert.equal(fx.first, 1000);
  assert.equal(fx.hooks!.unbroken, 0.08);
  assert.deepEqual(relicEffects(), {});
});

const heroBoostOf = (run: ReturnType<typeof newRun>) => {
  const b = startStage(run);
  place(b, 'knight', 3, 8, 1, gradeBoost(1));
  return b.units.find((u) => u.side === 'hero')!;
};

test('the Whetstone and the First Banner raise the hero at placement', () => {
  const plain = heroBoostOf(newRun(5));
  const run = newRun(5);
  run.relics = ['whetstone', 'banner'];
  const boosted = heroBoostOf(run);
  assert.ok(Math.abs((boosted.power ?? 1) - 1.03) < 1e-9);
  assert.equal(boosted.maxHp, Math.round(plain.maxHp * 1.06));
});

test('the Stopped Hourglass fills the mana faster', () => {
  const run = newRun(5);
  const a = startStage(run).spells.rate;
  run.relics = ['hourglass'];
  assert.ok(Math.abs(startStage(run).spells.rate / a - 1.15) < 1e-9);
});

test('team relics become the fight team bonus, beside the traits', () => {
  const run = newRun(5);
  run.relics = ['ironShield', 'featherCharm', 'hawkEye', 'swiftBoots', 'scholarScroll', 'spyglass'];
  const b = startStage(run);
  place(b, 'knight', 3, 8, 1);
  fight(b);
  assert.ok(b.traits!.guard! >= 0.1 && b.traits!.dodge! >= 0.05 && b.traits!.crit! >= 0.03);
  assert.ok(b.traits!.speed! >= 1.08 * 0.96 - 1e-9 && b.traits!.charge! >= 1.05 && b.traits!.reach! >= 0.3);
});

test('the Siege Drum: the foes wait at the start, the heroes do not', () => {
  const run = newRun(5);
  run.relics = ['warDrum'];
  const b = startStage(run);
  place(b, 'knight', 3, 8, 1);
  fight(b);
  assert.ok(b.units.filter((u) => u.side === 'foe').every((u) => u.busyUntil === 1000));
  assert.equal(b.units.find((u) => u.side === 'hero')!.busyUntil, 0);
});

test('the Coronation Crown-Piece adds gold to a win, more with a fuller purse', () => {
  const a = newRun(9);
  const b = newRun(9);
  b.relics = ['luckyCoin'];
  finish(a, true);
  finish(b, true);
  const g0 = newRun(9).gold;
  assert.equal(b.gold - a.gold, 8 + Math.min(8, Math.floor(g0 / 50)));
  // (a purse of 400 gold or more pays the most: +16)
  assert.equal(relicEffects(['luckyCoin'], { gold: 1000 }).gold, 16);
});

test('Phoenix Feather: one hero rises once a fight', () => {
  const run = newRun(5);
  run.relics = ['phoenix'];
  const b = startStage(run);
  place(b, 'knight', 3, 8, 1);
  place(b, 'archer', 4, 8, 2);
  fight(b);
  const [x, y] = b.units.filter((u) => u.side === 'hero');
  const foe = b.units.find((u) => u.side === 'foe')!;
  const out: never[] = [];
  hurt(b, foe, x, 99999, false, false, out);
  assert.equal(x.alive, true);
  assert.equal(x.hp, Math.round(x.maxHp / 2));
  hurt(b, foe, x, 99999, false, false, out);
  assert.equal(x.alive, false, 'only once');
  hurt(b, foe, y, 99999, false, false, out);
  assert.equal(y.alive, false);
});

test('without a phoenix a hero just falls', () => {
  const b: Battle = readyBattle(3);
  fight(b);
  const x = b.units.find((u) => u.side === 'hero')!;
  hurt(b, b.units.find((u) => u.side === 'foe')!, x, 99999, false, false, []);
  assert.equal(x.alive, false);
  playOut(b);
  stepBattle(b);
});

test('gear adds to hp and attack, a piece a slot, and comes off again', () => {
  assert.deepEqual(gearBoost(), { hp: 1, atk: 1 });
  const run = newRun(5);
  const h = run.roster[0];
  run.items = [makeGear(90, 'weapon', 1), makeGear(91, 'armour', 2), makeGear(92, 'weapon', 3)];
  assert.ok(equip(run, h.id, 90));
  assert.ok(equip(run, h.id, 91));
  const b = boostOf(h);
  assert.ok(Math.abs(b.atk! - 1.08) < 1e-9 && Math.abs(b.hp! - 1.16) < 1e-9);
  // a better weapon swaps the first back to the pack
  assert.ok(equip(run, h.id, 92));
  assert.deepEqual(run.items!.map((g) => g.id), [90]);
  assert.ok(Math.abs(boostOf(h).atk! - 1.24) < 1e-9);
  assert.equal(equip(run, h.id, 777), false);
  assert.ok(unequip(run, h.id, 'weapon'));
  assert.equal(h.gear!.weapon, undefined);
  assert.equal(run.items!.length, 2);
  assert.equal(unequip(run, h.id, 'charm'), false);
});

test('gear and relics survive a save; an old save has none', () => {
  const store: Record<string, string> = {};
  const io = { setItem: (k: string, v: string) => void (store[k] = v), getItem: (k: string) => store[k] ?? null };
  const run = newRun(5);
  run.relics = ['banner'];
  run.items = [makeGear(1, 'charm', 2)];
  equip(run, run.roster[0].id, 1);
  run.items.push(makeGear(2, 'weapon', 1));
  saveRun(run, io);
  const back = loadRun(io)!;
  assert.deepEqual(back.relics, ['banner']);
  assert.equal(back.roster[0].gear!.charm!.name, 'Sun Charm');
  assert.equal(back.items!.length, 1);
  const old = JSON.parse(JSON.stringify(newRun(5)));
  delete old.relics;
  assert.deepEqual(startStage(old).units.length, startStage(newRun(5)).units.length);
});
