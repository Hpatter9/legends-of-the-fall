// The Vampire origin and its Last Oath (docs/notes/twenty-heroes.md, batch 0): the trait's tiers at two, four and five, the leech it gives
// every hero's blows, the bat swarm at five, and their Last Oath, the Night Kin. The five Vampires wait for their battle sheets, so they are fielded
// here with `addUnit` and are not yet in `ALL_HEROES`, the roster's traits or `COMBOS`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, fight, hurt, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { afterBlow } from '../src/sim/abilities';
import { COMBO_NEED, COMBOS, COMING_COMBOS, comboById, comboOf, readCombosSeen } from '../src/sim/combos';
import { COMING_HERO_TRAITS, COMING_TRAITS, countTraits, HERO_TRAITS, membersOf, TRAITS, traitById, traitEffects, traitsOf } from '../src/sim/traits';
import { ALL_HEROES, COMING_HEROES, UNITS } from '../src/sim/units';
import { gradeBoost } from '../src/sim/run';
import { ailmentsOf } from '../src/sim/ailments';

const FIVE = ['vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle', 'dhampir'];

/** A fight with these kinds on the heroes' rows, started. */
function started(kinds: readonly string[], seed = 5): Battle {
  const b = startBattle(seed, 'skeletons');
  kinds.forEach((k, i) => addUnit(b, k, 1 + i, 8, gradeBoost(1, 0, 1)));
  fight(b);
  return b;
}
const hero = (b: Battle, kind: string) => b.units.find((x) => x.def === kind)!;

test('the five Vampires wait outside the roster: units and traits, but not ALL_HEROES, the roster traits or COMBOS', () => {
  // (the Vampires came first; later batches wait after them)
  assert.deepEqual(COMING_HEROES.slice(0, 5), FIVE);
  for (const k of FIVE) {
    assert.equal(UNITS[k].side, 'hero', k);
    assert.ok(!ALL_HEROES.includes(k), `${k} is not yet in ALL_HEROES`);
    assert.ok(!HERO_TRAITS[k], `${k} is not yet in HERO_TRAITS`);
    assert.equal(traitsOf(k)[0], 'vampire');
    assert.equal(TRAITS[COMING_HERO_TRAITS[k][1]].kind, 'class', k);
  }
  assert.equal(UNITS.dhampir.name, 'Dhampir');
  assert.ok(!TRAITS.vampire && traitById('vampire') === COMING_TRAITS.vampire);
  assert.equal(membersOf('vampire').length, 0);
  assert.ok(!COMBOS.some((c) => c.id === 'bloodCourt'));
});

test('the Vampire origin wakes at two, four and five Vampires', () => {
  const vampire = (kinds: string[]) => countTraits(kinds).find((c) => c.trait.id === 'vampire');
  assert.deepEqual(COMING_TRAITS.vampire.tiers.map((t) => t.need), [2, 4, 5]);
  assert.ok(!vampire(['vampireLord'])!.active);
  assert.equal(vampire(['vampireLord', 'vampireLord'])!.count, 1, 'only distinct kinds count');
  assert.equal(vampire(FIVE.slice(0, 2))!.tier, 0);
  assert.equal(vampire(FIVE.slice(0, 3))!.tier, 0);
  assert.equal(vampire(FIVE.slice(0, 4))!.tier, 1);
  assert.equal(vampire(FIVE)!.tier, 2);
  assert.equal(traitEffects(FIVE.slice(0, 2)).leech, 0.06);
  assert.equal(traitEffects(FIVE.slice(0, 4)).leech, 0.12);
  assert.ok(!traitEffects(FIVE.slice(0, 4)).vampireSwarm);
  const five = traitEffects(FIVE);
  assert.equal(five.leech, 0.15);
  assert.ok(five.vampireSwarm);
  // (a Vampire's class counts as its class does: two Blades with the Vampire Lord)
  assert.ok(countTraits(['vampireLord', 'samurai']).find((c) => c.trait.id === 'blade')!.active);
  // (no Vampire, no Vampire bonus)
  assert.equal(traitEffects(['knight', 'peasant']).leech, undefined);
});

test("with two Vampires every hero's blows drink back the trait's share, and a foe's do not", () => {
  const b = started(['vampireLord', 'hemomancer', 'knight']);
  assert.equal(b.traits?.leech, 0.06);
  const knight = hero(b, 'knight');
  const foe = b.units.find((u) => u.side === 'foe')!;
  knight.hp = Math.round(knight.maxHp / 2);
  const before = knight.hp;
  afterBlow(b, knight, foe, false, 100, []);
  assert.ok(knight.hp > before, 'the Knight is no Vampire, but the team bonus reaches him');
  assert.ok(knight.hp - before <= 6 + 1e-9);
  foe.hp = Math.round(foe.maxHp / 2);
  const was = foe.hp;
  afterBlow(b, foe, knight, false, 100, []);
  assert.equal(foe.hp, was, 'a foe drinks nothing from the heroes\' trait');
  // (without the trait, no leech)
  const plain = started(['knight', 'peasant']);
  const k2 = hero(plain, 'knight');
  k2.hp = Math.round(k2.maxHp / 2);
  const h2 = k2.hp;
  afterBlow(plain, k2, plain.units.find((u) => u.side === 'foe')!, false, 100, []);
  assert.equal(k2.hp, h2);
});

test('with five Vampires a Vampire brought under 30% bursts into bats once a fight: it mends 15% and slips away from the foes', () => {
  assert.ok(!started(FIVE.slice(0, 4)).traits?.vampireSwarm);
  const b = started(FIVE);
  assert.ok(b.traits?.vampireSwarm);
  const lord = hero(b, 'vampireLord');
  const foe = b.units.find((u) => u.side === 'foe')!;
  const out: BattleEvent[] = [];
  const left = Math.round(lord.maxHp * 0.1);
  hurt(b, foe, lord, lord.hp - left, true, false, out, 'skill');
  assert.ok(lord.alive && lord.vampireSwarmUsed);
  assert.equal(lord.hp, left + Math.round(lord.maxHp * 0.15));
  // (a second low blow finds the swarm spent)
  const after = lord.hp;
  hurt(b, foe, lord, Math.round(lord.maxHp * 0.05), true, false, [], 'skill');
  assert.equal(lord.hp, after - Math.round(lord.maxHp * 0.05));
  // a fatal blow is fatal: the swarm is no revive
  const gargoyle = hero(b, 'bloodGargoyle');
  hurt(b, foe, gargoyle, gargoyle.hp + 500, true, false, [], 'skill');
  assert.ok(!gargoyle.alive && !gargoyle.vampireSwarmUsed);
  // only Vampires swarm: a Knight with the five does not
  const mixed = started([...FIVE, 'knight']);
  const knight = hero(mixed, 'knight');
  hurt(mixed, mixed.units.find((u) => u.side === 'foe')!, knight, knight.hp - Math.round(knight.maxHp * 0.1), true, false, [], 'skill');
  assert.ok(!knight.vampireSwarmUsed);
});

test('the swarm moves the Vampire to the free tile within 2 farthest from the foes, the same way every time', () => {
  const run = () => {
    const b = started(FIVE, 11);
    const lord = hero(b, 'vampireLord');
    const foe = b.units.find((u) => u.side === 'foe')!;
    const out: BattleEvent[] = [];
    const from = { u: lord.u, v: lord.v };
    hurt(b, foe, lord, lord.hp - 5, true, false, out, 'skill');
    const blink = out.find((e) => e.kind === 'blink');
    return { from, to: { u: lord.u, v: lord.v }, blink: !!blink };
  };
  const a = run();
  assert.deepEqual(run(), a);
  if (a.blink) assert.ok(Math.abs(a.to.u - a.from.u) + Math.abs(a.to.v - a.from.v) <= 2);
});

test('the Night Kin forms with all five Vampires, fills, and its Blood Moon lands', () => {
  const c = COMING_COMBOS.find((x) => x.id === 'bloodCourt')!;
  assert.deepEqual([...c.heroes], FIVE);
  assert.equal(comboById('bloodCourt'), c);
  assert.equal(comboOf(FIVE)?.id, 'bloodCourt');
  assert.equal(comboOf(FIVE.slice(0, 4)), undefined);
  assert.deepEqual(readCombosSeen(['bloodCourt', 'nope']), ['bloodCourt']);
  // (no hero of the court is in a roster combo)
  for (const k of FIVE) assert.ok(!COMBOS.some((x) => x.heroes.includes(k)), k);

  const b = startBattle(4, 'werewolves');
  // (living foes: the undead, golems and machines do not bleed)
  FIVE.forEach((k, i) => addUnit(b, k, 1 + i, 8, gradeBoost(1, 0, 1)));
  for (const u of b.units) if (u.side === 'foe') u.hp = u.maxHp = 9000;
  fight(b);
  assert.equal(b.combo?.id, 'bloodCourt');
  // the bar fills from the fight
  for (let i = 0; i < 30; i++) stepBattle(b);
  assert.ok(b.combo!.charge > 0, 'the bar fills');
  // (the traits set the heroes' health as the fight starts, so hurt them after it; then let the move go)
  for (const u of b.units) if (u.side === 'hero') u.hp = Math.round(u.maxHp * 0.5);
  b.combo!.charge = COMBO_NEED - 0.01;
  const events: BattleEvent[] = [];
  for (let i = 0; i < 40; i++) events.push(...stepBattle(b));
  assert.ok(events.some((e) => e.kind === 'comboLand'), 'the Blood Moon lands');
  assert.ok(b.units.some((u) => u.side === 'foe' && ailmentsOf(u).some((a) => a.kind === 'bleed')), 'the foes bleed');
  const five = b.combo!.ids.map((id) => b.units.find((u) => u.id === id)!).filter((u) => u.alive);
  const land = events.findIndex((e) => e.kind === 'comboLand');
  const mended = new Set(events.slice(land).flatMap((e) => (e.kind === 'heal' && e.amount > 0 && b.combo!.ids.includes(e.to) ? [e.to] : [])));
  assert.ok(mended.size >= 3, 'the five drink back their health');
  assert.ok(five.every((u) => (u.hasteUntil ?? 0) > b.t), 'and are hastened');
});
