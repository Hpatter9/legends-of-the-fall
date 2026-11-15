// The Vampire origin and its Last Oath (docs/notes/twenty-heroes.md, batch 0; its tiers are TRAIT-PERKS' now, docs/notes/trait-perks.md): the
// trait's tiers at two, three and four, the Vampires' thirst, the bat swarm at three, and their Last Oath, the Night Kin. The five Vampires have joined the roster (their battle sheets came first),
// so they are in `ALL_HEROES`, the roster's traits and `COMBOS`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, fight, hurt, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { afterBlow } from '../src/sim/abilities';
import { COMBO_NEED, COMBOS, comboById, comboOf, readCombosSeen } from '../src/sim/combos';
import { countTraits, HERO_TRAITS, membersOf, TRAITS, TRAIT_PERKS, traitById, traitEffects, traitsOf } from '../src/sim/traits';
import { ALL_HEROES, COMING_HEROES, TWENTY_HEROES, UNITS } from '../src/sim/units';
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

test('the five Vampires have joined the roster: units, traits, ALL_HEROES and COMBOS', () => {
  assert.deepEqual(TWENTY_HEROES.slice(0, 5), FIVE);
  for (const k of FIVE) {
    assert.equal(UNITS[k].side, 'hero', k);
    assert.ok(ALL_HEROES.includes(k), `${k} is in ALL_HEROES`);
    assert.ok(!COMING_HEROES.includes(k), `${k} is no longer coming`);
    assert.equal(HERO_TRAITS[k][0], 'vampire');
    assert.equal(traitsOf(k)[0], 'vampire');
    assert.equal(TRAITS[HERO_TRAITS[k][1]].kind, 'class', k);
  }
  assert.equal(UNITS.dhampir.name, 'Dhampir');
  assert.ok(TRAITS.vampire && traitById('vampire') === TRAITS.vampire);
  assert.equal(membersOf('vampire').length, 5);
  assert.ok(COMBOS.some((c) => c.id === 'bloodCourt'));
});

test('the Vampire origin wakes at two, three and four Vampires (TRAIT-PERKS; it woke at two, four and five)', () => {
  const vampire = (kinds: string[]) => countTraits(kinds).find((c) => c.trait.id === 'vampire');
  assert.deepEqual(TRAITS.vampire.tiers.map((t) => t.need), [2, 3, 4]);
  assert.ok(!vampire(['vampireLord'])!.active);
  assert.equal(vampire(['vampireLord', 'vampireLord'])!.count, 1, 'only distinct kinds count');
  assert.equal(vampire(FIVE.slice(0, 2))!.tier, 0);
  assert.equal(vampire(FIVE.slice(0, 3))!.tier, 1);
  assert.equal(vampire(FIVE.slice(0, 4))!.tier, 2);
  assert.equal(vampire(FIVE)!.tier, 2);
  assert.ok(!traitEffects(FIVE.slice(0, 2)).vampireSwarm);
  assert.ok(traitEffects(FIVE.slice(0, 3)).vampireSwarm);
  // (the leech is the Vampires' own now: no team share)
  assert.equal(traitEffects(FIVE).leech, undefined);
  // (with the perks switched off, the old ladder: two, four and five)
  TRAIT_PERKS.on = false;
  try {
    assert.equal(traitEffects(FIVE.slice(0, 2)).leech, 0.06);
    assert.equal(traitEffects(FIVE).leech, 0.15);
    assert.ok(traitEffects(FIVE).vampireSwarm);
  } finally {
    TRAIT_PERKS.on = true;
  }
  // (a Vampire's class counts as its class does: two Blades with the Vampire Lord)
  assert.ok(countTraits(['vampireLord', 'samurai']).find((c) => c.trait.id === 'blade')!.active);
});

test('with two Vampires a Vampire drinks back a tenth of what it deals; a Knight beside them, and a foe, drink nothing', () => {
  const b = started(['vampireLord', 'hemomancer', 'knight']);
  const lord = hero(b, 'vampireLord');
  const knight = hero(b, 'knight');
  const foe = b.units.find((u) => u.side === 'foe')!;
  lord.hp = Math.round(lord.maxHp / 2);
  const before = lord.hp;
  hurt(b, lord, foe, 100, false, false, [], 'skill');
  assert.ok(lord.hp > before, 'the Vampire drinks');
  knight.hp = Math.round(knight.maxHp / 2);
  const kh = knight.hp;
  hurt(b, knight, foe, 100, false, false, [], 'skill');
  assert.equal(knight.hp, kh, 'the Knight is no Vampire');
  foe.hp = Math.round(foe.maxHp / 2);
  const was = foe.hp;
  afterBlow(b, foe, knight, false, 100, []);
  assert.equal(foe.hp, was, 'a foe drinks nothing from the heroes\' trait');
});

test('with three Vampires a Vampire brought under 30% bursts into bats once a wave: it mends 15% and slips away from the foes', () => {
  assert.ok(!started(FIVE.slice(0, 2)).traits?.vampireSwarm);
  const b = started(FIVE.slice(0, 3));
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
  const nightstalker = hero(b, 'nightstalker');
  hurt(b, foe, nightstalker, nightstalker.hp + 500, true, false, [], 'skill');
  assert.ok(!nightstalker.alive && !nightstalker.vampireSwarmUsed);
  // only Vampires swarm: a Knight with them does not
  const mixed = started([...FIVE.slice(0, 3), 'knight']);
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
  const c = COMBOS.find((x) => x.id === 'bloodCourt')!;
  assert.deepEqual([...c.heroes], FIVE);
  assert.equal(comboById('bloodCourt'), c);
  assert.equal(comboOf(FIVE)?.id, 'bloodCourt');
  assert.equal(comboOf(FIVE.slice(0, 4)), undefined);
  assert.deepEqual(readCombosSeen(['bloodCourt', 'nope']), ['bloodCourt']);
  // (no hero of the court is in another combo)
  for (const k of FIVE) assert.equal(COMBOS.filter((x) => x.heroes.includes(k)).length, 1, k);

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
