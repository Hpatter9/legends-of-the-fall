// The casters' reworked kits (RPG-SPELLS batch 6, docs/notes/spells-b6.md): the new names on the old keys, the Fire Wizard's Wall of Fire
// and Meteor Swarm, the Lightning Mage's blink before Storm Surge and her Call Lightning cloud, the Warlock's Eldritch Blast and Circle of
// Death, the Great Sage's Font of Magic and the Illusionist's Transposition.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { KITS, ULT_LEVEL, keyOf, powered, ultimateOf } from '../src/sim/abilities';
import { HERO_KITS, heroKitOf, resOf } from '../src/sim/heroKits';
import { wallAt } from '../src/sim/toolkit';
import { AILMENT_SWITCH, hasAil } from '../src/sim/ailments';
import { SAVES } from '../src/sim/saves';

// (these stage what each skill's row says, its written times and tiles: the saving throws, STATS batch 5, are held off here and staged in
// `test/stats-saves.test.ts`)
SAVES.on = false;

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, level = 1): Unit => {
  const x = addUnit(b, def, u, v, level > 1 ? { level } : {});
  x.busyUntil = 1e9;
  return x;
};
const at = (x: Unit) => [x.u, x.v];
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};
const cast = (b: Battle, me: Unit, which: 1 | 2): BattleEvent[] => {
  const out: BattleEvent[] = [];
  const hk = heroKitOf(me)!;
  assert.ok((which === 1 ? hk.s1 : hk.s2).skill.cast(b, me, out), `${me.def}'s skill ${which} went off`);
  return out;
};
const ult = (b: Battle, me: Unit): BattleEvent[] => {
  const out: BattleEvent[] = [];
  assert.ok(powered(b, me, ultimateOf(me)!, 0, out), `${me.def}'s ultimate went off`);
  return out;
};
const tough = (b: Battle, def: string, u: number, v: number) => {
  const x = spawn(b, def, u, v);
  x.hp = x.maxHp = 5000;
  return x;
};

test('the six casters carry their new names on their old keys', () => {
  const names = (k: string) => [HERO_KITS()[k].s1.skill, HERO_KITS()[k].s2.skill, KITS[k].ultimate!].map((s) => `${s.name}=${keyOf(s)}`);
  assert.deepEqual(names('wizard'), ['Fireball=Meteor', 'Wall of Fire=Wildfire', 'Meteor Swarm=Armageddon']);
  assert.deepEqual(names('lightningMage'), ['Chain Lightning=Chain Lightning', 'Storm Surge=Overload', 'Call Lightning=Thunderstorm']);
  assert.deepEqual(names('warlock'), ['Eldritch Blast=Hex', 'Drain Life=Soul Siphon', 'Circle of Death=Soul Harvest']);
  assert.deepEqual(names('sage'), ['Magic Missile=Starfall', 'Font of Magic=Font of Wisdom', 'Arcane Surge=Astral Convergence']);
  assert.deepEqual(names('timeWitch'), ['Slow=Temporal Surge', 'Rewind=Rewind', 'Time Stop=Time Stop']);
  assert.deepEqual(names('illusionist'), ['Mirror Image=Mirror Image', 'Transposition=Trade Places', 'Hall of Mirrors=Hall of Mirrors']);
  // (the Yokai Witch keeps the old Hex, and the Magma Golem its own Magma Burst)
  assert.equal(keyOf(KITS.yokaiWitch.skill), 'Hex');
  assert.equal(KITS.yokaiWitch.skill.name, 'Hex');
  assert.equal(keyOf(KITS.magmaGolem.skill), 'Magma Burst');
});

test('Wall of Fire: a line of fire across the lane the foes walk (two or more near it), and a foe that walks into it burns', () => {
  const was = AILMENT_SWITCH.on;
  AILMENT_SWITCH.on = true;
  try {
    const b = arena();
    const me = spawn(b, 'wizard', 3, 9, 10);
    const f = tough(b, 'orcGrunt', 3, 3);
    f.busyUntil = 0;
    // (one foe alone is not worth a wall)
    assert.equal(heroKitOf(me)!.s2.skill.cast(b, me, []), false);
    tough(b, 'orcGrunt', 4, 2);
    const out = cast(b, me, 2);
    const laid = out.filter((e) => e.kind === 'terrain' && e.what === 'fire');
    assert.ok(laid.length >= 3, 'three or four tiles of fire');
    assert.ok(laid.every((e) => e.kind === 'terrain' && wallAt(b, e.u, e.v)?.kind === 'fire'));
    run(b, 4000);
    assert.ok(hasAil(f, 'burn') || f.hp < 5000, 'the foe walking through burns');
  } finally {
    AILMENT_SWITCH.on = was;
  }
});

test('Meteor Swarm: each meteor throws the foe at its heart a tile', () => {
  const b = arena();
  const me = spawn(b, 'wizard', 3, 10, ULT_LEVEL);
  const f = tough(b, 'orcGrunt', 3, 4);
  ult(b, me);
  const ev = run(b, 2000);
  assert.ok(ev.some((e) => e.kind === 'launch' && e.to === f.id));
});

test('Storm Surge: with a foe beside her, the Lightning Mage blinks clear before the Charged foes discharge', () => {
  const b = arena();
  const me = spawn(b, 'lightningMage', 3, 7, 10);
  const f = tough(b, 'orcGrunt', 3, 6);
  f.kx = { charged: b.t + 5000 };
  const out = cast(b, me, 2);
  assert.ok(out.some((e) => e.kind === 'blink' && e.by === me.id));
  assert.ok(Math.abs(me.u - 3) + Math.abs(me.v - 6) >= 2);
  assert.ok(f.hp < 5000, 'the Charged foe discharges');
  assert.ok(!(f.kx?.charged && f.kx.charged > b.t));
});

test('Call Lightning: a bolt at once and one each second for 6s, on the toughest foe within 6, stunned and Charged', () => {
  const b = arena();
  const me = spawn(b, 'lightningMage', 3, 9, ULT_LEVEL);
  const big = tough(b, 'orcGrunt', 3, 5);
  const small = spawn(b, 'orcGrunt', 4, 5);
  small.hp = small.maxHp = 4000;
  const out = ult(b, me);
  const bolts = (ev: BattleEvent[]) => ev.filter((e) => e.kind === 'arc' && e.from === me.id);
  assert.equal(bolts(out).length, 1);
  assert.ok(out.some((e) => e.kind === 'aura' && e.what === 'storm cloud'));
  assert.ok(big.hp < 5000 && big.kx?.charged !== undefined && (big.stunUntil ?? 0) > b.t);
  const later = run(b, 7000);
  const n = bolts(later).length;
  assert.ok(n >= 4 && n <= 6, `a bolt a second (${n})`);
  assert.equal(me.kx?.storm, undefined, 'the cloud is gone');
});

test('Eldritch Blast: each foe it hexes is shoved a tile back; the Yokai Witch\'s Hex shoves none', () => {
  const b = arena();
  const me = spawn(b, 'warlock', 3, 8, 10);
  const f = tough(b, 'orcGrunt', 3, 6);
  const out = cast(b, me, 1);
  assert.ok(out.some((e) => e.kind === 'shove' && e.to === f.id));
  assert.deepEqual(at(f), [3, 5]);
  const b2 = arena();
  const w = spawn(b2, 'yokaiWitch', 3, 3);
  const k = tough(b2, 'knight', 3, 5);
  const out2: BattleEvent[] = [];
  assert.ok(KITS.yokaiWitch.skill.cast(b2, w, out2));
  assert.ok(!out2.some((e) => e.kind === 'shove'));
  assert.deepEqual(at(k), [3, 5]);
});

test('Circle of Death: a ring round the Warlock; a foe within 2 is hurt each second and he drinks from it', () => {
  const b = arena();
  const me = spawn(b, 'warlock', 3, 8, ULT_LEVEL);
  me.hp = Math.round(me.maxHp / 2);
  const f = tough(b, 'orcGrunt', 3, 6);
  const out = ult(b, me);
  assert.ok(out.some((e) => e.kind === 'aura' && e.what === 'circle of death' && e.reach === 2));
  const hp = f.hp;
  const mine = me.hp;
  run(b, 2100);
  assert.ok(f.hp < hp);
  assert.ok(me.hp > mine);
});

test('Font of Magic: a font on his tile; a friend with mana within 3 gains it each second', () => {
  const b = arena();
  const me = spawn(b, 'sage', 3, 8, 10);
  const w = spawn(b, 'wizard', 4, 8, 10);
  w.charge = 0;
  spawn(b, 'orcGrunt', 3, 2);
  const out = cast(b, me, 2);
  assert.ok(out.some((e) => e.kind === 'aura' && e.what === 'font of magic' && e.at?.u === 3 && e.at.v === 8));
  run(b, 3100);
  assert.ok(resOf(w) >= 10, `mana flows (${resOf(w)})`);
});

test('Transposition: the Illusionist and the friend in trouble change places; the foe on the friend turns on her, and a decoy springs up', () => {
  const b = arena();
  const me = spawn(b, 'illusionist', 3, 9, 10);
  const k = spawn(b, 'knight', 3, 6);
  k.hp = Math.round(k.maxHp * 0.3);
  const f = spawn(b, 'orcGrunt', 3, 5);
  const out = cast(b, me, 2);
  assert.ok(out.some((e) => e.kind === 'swap'));
  assert.deepEqual(at(me), [3, 6]);
  assert.deepEqual(at(k), [3, 9]);
  assert.equal(f.taunt?.to, me.id);
  assert.ok(b.units.some((x) => x.alive && x.def === 'decoy' && x.owner === me.id && Math.abs(x.u - 3) + Math.abs(x.v - 9) === 1));
});
