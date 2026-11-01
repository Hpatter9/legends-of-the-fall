// Real gear in runs (RUN-GEAR, docs/notes/run-gear.md): every source of run gear hands out a real piece, drawn at the same moment on its
// stream as the simple gear was; found pieces are worn by kinds (merges leave them), boosted while fresh, upgraded only if found in the
// run, and all kept at the end (worn for real, the stash, the cart, sold past it); an auto-replay run keeps half; old runs finish on
// their simple gear, which comes home once as real pieces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropGear, makeGear } from '../src/sim/gear';
import { CART_MAX, EQUIP_BASES, equipItem, equipStats, grantEquipment, itemStats, spareEquipment, salvageItem, STASH_MAX, wornIn } from '../src/sim/equipment';
import { startedMeta, type Meta } from '../src/sim/meta';
import { Rng } from '../src/sim/rng';
import { armyRun, finish, newRun, recruit, type Run } from '../src/sim/run';
import { merge } from '../src/sim/merge';
import { drawRoad, type RoadKind } from '../src/sim/midEvents';
import { chooseOption, drawEvent } from '../src/sim/events';
import { towerRun } from '../src/sim/modes';
import { settleWear } from '../src/sim/wear';
import {
  bareKitStats,
  equipBestReal,
  equipSlotOf,
  FIELD_BOOST,
  fieldGrade,
  fieldLevel,
  findGear,
  findSlotGear,
  foundIn,
  runKitStats,
  runTag,
  settleFinds,
  settleRunWear,
  slotTaken,
  SOURCE,
  stow,
  upgradeFound,
  UPGRADE_LEVELS,
  wearFound,
} from '../src/sim/runGear';

/** An army run with a knight and an archer on the field. */
function army(seed = 7, id = 'orcs', tier = 0): Run {
  const run = armyRun(seed, id, undefined, undefined, tier);
  recruit(run, 'knight');
  recruit(run, 'archer');
  run.squad = run.roster.map((h) => h.id);
  return run;
}
/** A found piece of a base put straight in the pack (as a source would). */
function found(run: Run, id: number, base: string, rarity: 1 | 2 | 3 | 4 = 1, level = 1): void {
  stow(run, { id, slot: 'weapon', tier: 1, name: base, hp: 0, atk: 0, piece: { id, base, rarity, level } });
}

test('a new run of every mode is a real-gear run; a find draws from its stream exactly what the simple gear drew', () => {
  assert.equal(newRun(1).real, true);
  assert.equal(armyRun(1, 'orcs').real, true);
  assert.equal(towerRun(1, startedMeta(1)).real, true);
  for (let seed = 1; seed <= 60; seed++)
    for (const stage of [1, 9, 17, 30]) {
      const run = army(seed);
      const a = new Rng(seed * 31 + stage);
      const b = new Rng(seed * 31 + stage);
      const simple = dropGear(a, 5, stage, 1);
      const real = findGear(run, b, 5, stage, 1, SOURCE.boss);
      assert.equal(a.next(), b.next(), 'the stream is left where the simple gear left it');
      assert.equal(real.slot, simple.slot, 'the slot is the one drawn as before');
      assert.ok(real.piece, 'a real piece');
      // (a find of a given slot draws nothing at all from the source's stream)
      const c = new Rng(seed);
      const d = new Rng(seed);
      findSlotGear(run, 6, 'armour', 2, stage, SOURCE.cart);
      assert.equal(c.next(), d.next());
    }
});

test('the grade table: by step and difficulty, never Mythic; the item level follows the army and the waves reached', () => {
  const grades = (step: number, col: number) => {
    const seen = new Set<number>();
    for (let s = 1; s <= 400; s++) seen.add(fieldGrade(new Rng(s), step, col));
    return [...seen].sort();
  };
  assert.deepEqual(grades(1, 0), [1], 'step 1 on Normal: Common');
  assert.deepEqual(grades(1, 1), [1, 2], 'on Hard: Common, Rare one time in four');
  assert.deepEqual(grades(1, 2), [2], 'on Elite: Rare');
  assert.deepEqual(grades(3, 0), [2], 'a boss on step 2: Rare');
  assert.deepEqual(grades(4, 2), [3, 4], 'the top: Epic, Legendary one time in six');
  for (let step = 1; step <= 9; step++) for (let col = 0; col <= 2; col++) assert.ok(grades(step, col).every((g) => g <= 4), 'never Mythic');
  const run = army(3, 'undead');
  run.stage = 9;
  assert.equal(fieldLevel(run), 1 + 3 * 1 + 2, 'army 2, wave 9');
  run.stage = 200;
  assert.equal(fieldLevel(run), 20, 'at most 20');
});

test('a boss wave drops a real piece into the pack, full, tagged as found in this run; an old run still drops simple gear', () => {
  const run = newRun(11);
  run.stage = 5;
  finish(run, true);
  assert.equal(run.pack?.length, 1);
  const it = run.pack![0];
  assert.equal(it.found, runTag(run));
  assert.equal(it.wear, undefined, 'full durability');
  assert.ok(run.bossFinds?.includes(it.id));
  assert.equal(run.items, undefined, 'no simple gear');
  const old = newRun(11);
  delete old.real;
  old.stage = 5;
  finish(old, true);
  assert.equal(old.items?.length, 1);
  assert.equal(old.pack, undefined);
  assert.equal(equipSlotOf(old.items![0].slot), EQUIP_BASES[it.base].slot, 'the same slot, drawn at the same moment');
});

test('fresh from the field: a found piece worn in an army run takes the lasting piece\'s place at FIELD_BOOST, plain at home', () => {
  const m = startedMeta(2);
  const home = grantEquipment(m, { base: 'ironSword', rarity: 1, level: 1 });
  equipItem(m, 'knight', home.id);
  const run = army(5);
  found(run, 900, 'claymore', 2, 5);
  assert.ok(wearFound(run, 'knight', 900));
  const piece = itemStats({ base: 'claymore', rarity: 2, level: 5 }, 'knight');
  const s = runKitStats(m, run, 'knight', equipStats)!;
  assert.ok(Math.abs(s.atk - piece.atk * FIELD_BOOST.army) < 1e-9, 'the find, boosted; the Iron Sword sits out');
  assert.equal(slotTaken(run, 'knight', 'weapon'), true);
  // (the lasting piece a find sits in for does not wear; the find does)
  settleWear(m, [{ kind: 'knight', fell: false }], false, (k, slot) => slotTaken(run, k, slot));
  assert.equal(home.wear, undefined);
  settleRunWear(run, [{ kind: 'knight', fell: true }]);
  assert.equal(foundIn(run, 'knight', 'weapon')!.wear, 1);
  // (the run ends: the find stays worn for real, the old piece goes to the stash, and it is a plain piece now)
  const back = settleFinds(m, run)!;
  assert.equal(back.pieces.length, 1);
  const worn = wornIn(m, 'knight', 'weapon')!;
  assert.equal(worn.base, 'claymore');
  assert.equal(worn.wear, 1, 'its wear came home with it');
  assert.equal(worn.found, undefined);
  assert.ok(spareEquipment(m).some((x) => x.id === home.id), 'the Iron Sword is in the stash');
  assert.ok(Math.abs(equipStats(m, 'knight')!.atk - piece.atk) < 1e-9);
  assert.equal(settleFinds(m, run), null, 'once');
});

test('in a run whose heroes start bare only the finds count, at the bare boost, and every one goes to the stash at the end', () => {
  const m = startedMeta(4);
  const run = towerRun(4, m);
  const kind = run.roster[0].kind;
  assert.equal(bareKitStats(run, kind), undefined);
  found(run, 901, 'leatherJerkin', 1, 1);
  stow(run, { id: 902, slot: 'armour', tier: 1, name: 'x', hp: 0, atk: 0, piece: { id: 902, base: 'leatherJerkin', rarity: 1, level: 1 } });
  equipBestReal(run, undefined, [kind]);
  const plain = itemStats({ base: 'leatherJerkin', rarity: 1, level: 1 }, kind);
  assert.ok(Math.abs(bareKitStats(run, kind)!.hp - plain.hp * FIELD_BOOST.bare) < 1e-9);
  const back = settleFinds(m, run)!;
  assert.equal(back.pieces.length, 2);
  assert.equal(Object.keys(back.worn).length, 0, 'none worn for real');
  assert.equal(m.equipped?.[kind], undefined);
});

test('Equip best in a run: a find goes on only when the whole kit scores better (sets counted), one kind each, the strongest first', () => {
  const m = startedMeta(6);
  const legend = grantEquipment(m, { base: 'claymore', rarity: 4, level: 10 });
  equipItem(m, 'knight', legend.id);
  const run = army(6);
  found(run, 910, 'ironSword', 1, 1);
  found(run, 911, 'runedBlade', 2, 4);
  assert.equal(equipBestReal(run, m, ['knight', 'archer']), 1);
  assert.equal(foundIn(run, 'knight', 'weapon'), undefined, 'the Legendary claymore stays');
  assert.ok(foundIn(run, 'archer', 'weapon'), 'the archer takes the better find');
  assert.equal(equipBestReal(run, m, ['knight', 'archer']), 0, 'a second go changes nothing');
  const ids = Object.values(run.worn ?? {}).flatMap((s) => Object.values(s));
  assert.equal(new Set(ids).size, ids.length, 'no piece on two kinds');
});

test('merges and partings leave the finds where they are: worn by the kind, not by one copy', () => {
  const run = newRun(5, ['knight']);
  found(run, 920, 'ironSword');
  wearFound(run, 'knight', 920);
  merge(run, run.roster[0].id, run.roster[1].id);
  assert.equal(run.roster.length, 1);
  assert.equal(foundIn(run, 'knight', 'weapon')?.id, 920);
  assert.equal(run.pack!.length, 1);
});

test('only a piece found in this run takes an upgrade: the road\'s smith raises a find, never the lasting kit', () => {
  const run = army(7);
  run.gold = 999;
  found(run, 930, 'ironSword', 1, 2);
  assert.equal(upgradeFound(run, 930, UPGRADE_LEVELS), true);
  assert.equal(run.pack![0].level, 2 + UPGRADE_LEVELS);
  // (a piece in the pack that was not found in this run, an old tag, is refused)
  run.pack![0].found = 12345;
  assert.equal(upgradeFound(run, 930, 3), false);
  run.pack![0].found = runTag(run);
  // (the crossroads forge works on the run's finds only; the save's own pieces are never in its list)
  const m = startedMeta(7);
  const mine = grantEquipment(m, { base: 'katana', rarity: 2, level: 1 });
  equipItem(m, 'knight', mine.id);
  run.event = drawRoad(run, 4, 'temper' as RoadKind, new Rng(103));
  const i = run.event.options.findIndex((o) => /^Temper/.test(o.label));
  assert.ok(i >= 0, 'a temper is offered for the find');
  chooseOption(run, i);
  assert.equal(run.pack![0].level, 2 + 2 * UPGRADE_LEVELS);
  assert.equal(mine.level, 1);
});

test('the end of a run: the stash full sends finds to the cart, past the cart the lowest are sold; selling makes room', () => {
  const m = startedMeta(8);
  for (let i = 0; i < STASH_MAX; i++) grantEquipment(m, { base: 'ironRing', rarity: 1, level: 1 });
  const run = army(8);
  for (let i = 0; i < CART_MAX + 3; i++) found(run, 1000 + i, 'ironSword', i < 3 ? 1 : 2, 1);
  const crowns = m.crowns;
  const back = settleFinds(m, run)!;
  assert.equal(back.cart, CART_MAX);
  assert.equal(back.sold, 3, 'three sold');
  assert.ok(m.crowns > crowns);
  assert.ok(m.cart!.every((p) => p.rarity === 2), 'the lowest graded were the ones sold');
  const spare = spareEquipment(m)[0];
  salvageItem(m, spare.id);
  assert.equal(spareEquipment(m).length, STASH_MAX, 'one moved in from the cart');
  assert.equal(m.cart!.length, CART_MAX - 1);
});

test('an auto-replay run brings each find home half the time, a boss\'s always, the same each time', () => {
  const kept = (auto: boolean) => {
    const m = startedMeta(9);
    const run = army(9);
    for (let i = 0; i < 40; i++) found(run, 2000 + i, 'ironSword');
    run.bossFinds = [2000, 2001];
    return settleFinds(m, run, auto)!.pieces.map((p) => p.base).length;
  };
  assert.equal(kept(false), 40);
  const a = kept(true);
  assert.equal(a, kept(true), 'deterministic');
  assert.ok(a >= 2 + 8 && a <= 2 + 30, `about half (${a})`);
});

test('an old run finishes on its simple gear, which comes home once as real pieces (tier 1 Common, 2 and 3 Rare)', () => {
  const m = startedMeta(10);
  const run = army(10);
  delete run.real;
  run.items = [makeGear(1, 'weapon', 1), makeGear(2, 'armour', 3)];
  run.roster[0].gear = { charm: makeGear(3, 'charm', 2) };
  const back = settleFinds(m, run)!;
  assert.equal(back.pieces.length, 3);
  assert.deepEqual(back.pieces.map((p) => p.rarity).sort(), [1, 2, 2]);
  const again = startedMeta(10);
  const run2 = army(10);
  delete run2.real;
  run2.items = [makeGear(1, 'weapon', 1), makeGear(2, 'armour', 3)];
  run2.roster[0].gear = { charm: makeGear(3, 'charm', 2) };
  assert.deepEqual(settleFinds(again, run2)!.pieces.map((p) => p.base), back.pieces.map((p) => p.base), 'the bases come from the gear ids');
});

test('the merchant prices a real piece by its grade, and a mystery forge raises a find a grade, up to Epic', () => {
  for (let seed = 1; seed < 300; seed++) {
    const run = army(seed);
    const ev = drawEvent(run, 2, ['merchant']);
    const fx = ev.options[1].effect;
    if (fx.t !== 'gear' || !fx.gear.piece) continue;
    assert.equal(ev.options[1].cost, [0, 40, 90, 200, 450][fx.gear.piece.rarity] + 2 * 2);
    break;
  }
  const t = towerRun(3, startedMeta(1));
  t.stage = 4;
  t.tower!.cur = { id: 0, kind: 'mystery' };
  t.gold = 500;
  found(t, 3000, 'ironSword', 1, 1);
  t.event = drawEvent(t, 4, ['forge']);
  const i = t.event.options.findIndex((o) => /^Reforge/.test(o.label));
  assert.ok(i >= 0);
  chooseOption(t, i);
  assert.equal(t.pack![0].rarity, 2);
});

test('an old save\'s meta reads without a cart; Meta.cart reads back sane', async () => {
  const { readCart } = await import('../src/sim/equipment');
  assert.deepEqual(readCart(undefined), []);
  assert.deepEqual(readCart([{ base: 'ironSword', rarity: 2, level: 3, wear: 4 }, { base: 'nope', rarity: 1, level: 1 }]), [{ base: 'ironSword', rarity: 2, level: 3, wear: 4 }]);
  const m: Meta = startedMeta(1);
  assert.equal(m.cart, undefined);
});
