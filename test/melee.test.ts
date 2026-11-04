// The melee heroes' reworked kits (RPG-SPELLS batch 4, docs/notes/spells-b4.md): the new names on the old keys, Smoke Bomb's blink, Quivering
// Palm's leap, Thunderwave's shove, Dragon Dive's launch, and the ultimates' additions (the Hundred-Hand Strike's throws, the Berserker Leap,
// the Cavalry Charge, the Lightning Storm, the Metamorphosis's chains, the Inferno Breath's burning line).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, atkOf, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { KITS, ULT_LEVEL, keyOf, powered, ultimateOf } from '../src/sim/abilities';
import { HERO_KITS, heroKitOf } from '../src/sim/heroKits';
import { hasAil } from '../src/sim/ailments';
import { THUNDER_STORE } from '../src/sim/kits/melee';
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
const s2 = (b: Battle, me: Unit): BattleEvent[] => {
  const out: BattleEvent[] = [];
  assert.ok(heroKitOf(me)!.s2.skill.cast(b, me, out), `${me.def}'s skill 2 went off`);
  return out;
};
const ult = (b: Battle, me: Unit): BattleEvent[] => {
  const out: BattleEvent[] = [];
  assert.ok(powered(b, me, ultimateOf(me)!, 0, out), `${me.def}'s ultimate went off`);
  return out;
};

test('the ten melee heroes carry their new names on their old keys', () => {
  const names = (k: string) => [HERO_KITS()[k].s1.skill, HERO_KITS()[k].s2.skill, KITS[k].ultimate!].map((s) => `${s.name}=${keyOf(s)}`);
  assert.deepEqual(names('samurai'), ['Iaido=Iaido', 'Riposte=Parry Stance', 'Issen=Heaven-Splitting Cut']);
  assert.deepEqual(names('kunoichi'), ['Sneak Attack=Shadow Step', 'Smoke Bomb=Smoke Bomb', 'Assassinate=Shadow Dance']);
  assert.deepEqual(names('ninjaMonk'), ['Flurry of Blows=Thousand Fists', 'Quivering Palm=Stillness Palm', 'Hundred-Hand Strike=Hundred Fists']);
  assert.deepEqual(names('barbarian'), ['Whirlwind=Whirlwind', 'Rage=Blood Fury', 'Berserker Leap=Bloodlust']);
  assert.deepEqual(names('mercenary'), ['Ambush=Bounty Hunt', "Hunter's Mark=Mark for Coin", 'Killing Spree=Contract Killer']);
  assert.deepEqual(names('lancer'), ['Charge=Lance Charge', 'Disengage=Wheel About', 'Cavalry Charge=Charge of the Knights']);
  assert.deepEqual(names('arcBlade'), ['Thunder Step=Voltage Blink', 'Thunderwave=Grounding', 'Lightning Storm=Thunder Cascade']);
  assert.deepEqual(names('demonSwordsman'), ['Cleave=Hellblade Sweep', 'Blood Pact=Blood Price', 'Metamorphosis=Demon Form']);
  assert.deepEqual(names('buccaneer'), ['Grappling Hook=Grappling Hook', 'Loaded Dice=Roll the Bones', 'Keelhaul=Keelhaul']);
  assert.deepEqual(names('dragoon'), ['Dragon Breath=Dragon Breath', 'Dragon Dive=Jump', 'Inferno Breath=Inferno Breath']);
});

test('Smoke Bomb: after the smoke, the Kunoichi blinks clear to the safest tile within 3', () => {
  const b = arena();
  const me = spawn(b, 'kunoichi', 3, 5, 10);
  spawn(b, 'orcGrunt', 3, 4);
  spawn(b, 'orcGrunt', 4, 5);
  const out = s2(b, me);
  assert.ok(out.some((e) => e.kind === 'blink' && e.by === me.id));
  assert.ok(Math.abs(me.u - 3) + Math.abs(me.v - 5) >= 2, 'she is clear of the foes');
  assert.ok((me.hideUntil ?? 0) > b.t);
});

test('Quivering Palm: with nobody in reach, the Ninja Monk leaps beside the foe with the fullest skill meter and strikes it', () => {
  const b = arena();
  const me = spawn(b, 'ninjaMonk', 3, 9, 10);
  const low = spawn(b, 'orcGrunt', 2, 6);
  const full = spawn(b, 'orcGrunt', 5, 7);
  full.charge = 90;
  low.charge = 10;
  const hp = full.hp;
  const out = s2(b, me);
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === me.id), 'a leap');
  assert.equal(Math.abs(me.u - full.u) + Math.abs(me.v - full.v), 1);
  assert.ok(full.hp < hp && full.charge < 90);
});

test("Thunderwave: once the Arc Blade has stored a share of his attack, the wave shoves the foes within 2 two tiles back", () => {
  const b = arena();
  const me = spawn(b, 'arcBlade', 3, 6, 10);
  const f = spawn(b, 'orcGrunt', 3, 5);
  me.kx = { stored: atkOf(me) * THUNDER_STORE };
  s2(b, me);
  assert.deepEqual(at(f), [3, 3]);
});

test('Dragon Dive: the Queen Dragoon lands on the crowd, and the 3x3 round her mark is thrown a tile outward', () => {
  const b = arena();
  const me = spawn(b, 'dragoon', 3, 10, 10);
  const mark = spawn(b, 'orcGrunt', 3, 5);
  const side = spawn(b, 'orcGrunt', 4, 5);
  spawn(b, 'orcGrunt', 3, 4);
  s2(b, me);
  const ev = run(b, 1500);
  assert.ok(ev.some((e) => e.kind === 'launch' && e.to === side.id), 'the foe beside the mark is thrown');
  assert.deepEqual(at(mark), [3, 5], 'the mark at the heart is not moved');
});

test("the ultimates' additions: the Hundred-Hand Strike throws, the Berserker Leap, the Cavalry Charge, the Lightning Storm, the chains, the burning line", () => {
  const b = arena();
  const monk = spawn(b, 'ninjaMonk', 3, 6, ULT_LEVEL);
  const f = spawn(b, 'orcBrute', 3, 5);
  f.hp = f.maxHp = 5000;
  ult(b, monk);
  assert.deepEqual(at(f), [3, 3], 'the last blow throws it 2 tiles');

  const b2 = arena();
  const barb = spawn(b2, 'barbarian', 3, 10, ULT_LEVEL);
  const c = spawn(b2, 'orcBrute', 3, 7);
  c.hp = c.maxHp = 5000;
  spawn(b2, 'orcBrute', 4, 7).hp = 5000;
  spawn(b2, 'orcBrute', 2, 7).hp = 5000;
  const out2 = ult(b2, barb);
  assert.ok(out2.some((e) => e.kind === 'launch' && e.to === barb.id), 'he leaps');
  assert.ok(out2.some((e) => e.kind === 'shove'), 'and the ring is shoved out');

  const b3 = arena();
  const lancer = spawn(b3, 'lancer', 3, 10, ULT_LEVEL);
  const x = spawn(b3, 'orcBrute', 3, 8);
  const y = spawn(b3, 'orcBrute', 3, 6);
  x.hp = x.maxHp = y.hp = y.maxHp = 5000;
  ult(b3, lancer);
  assert.ok(x.hp < 5000 && y.hp < 5000, 'both struck');
  assert.ok(x.u !== 3 && y.u !== 3, 'both thrown aside');
  assert.ok(lancer.v < 6, 'he rode through');

  const b4 = arena();
  const arc = spawn(b4, 'arcBlade', 3, 10, ULT_LEVEL);
  const foes = [spawn(b4, 'orcBrute', 1, 6), spawn(b4, 'orcBrute', 5, 6), spawn(b4, 'orcBrute', 3, 5)];
  for (const z of foes) z.hp = z.maxHp = 5000;
  const out4 = ult(b4, arc);
  assert.equal(out4.filter((e) => e.kind === 'blink').length, 4, 'three hops and home');
  assert.deepEqual(at(arc), [3, 10]);
  for (const z of foes) assert.ok(hasAil(z, 'shock', b4.t) && z.busyUntil > b4.t);

  const b5 = arena();
  const demon = spawn(b5, 'demonSwordsman', 3, 9, ULT_LEVEL);
  const far = spawn(b5, 'orcGrunt', 3, 6);
  ult(b5, demon);
  assert.deepEqual(at(far), [3, 8], 'dragged to him');

  const b6 = arena();
  const drag = spawn(b6, 'dragoon', 3, 10, ULT_LEVEL);
  spawn(b6, 'orcGrunt', 3, 7);
  spawn(b6, 'orcGrunt', 3, 5);
  ult(b6, drag);
  assert.ok(b6.walls?.some((w) => w.kind === 'fire'), 'the line stays alight');
});
