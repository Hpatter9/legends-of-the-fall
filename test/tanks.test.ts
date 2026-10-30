// The tanks' and supports' reworked kits (RPG-SPELLS batch 3, docs/notes/spells-b3.md): Shield Rush, Divine Smite, Aura of Protection, Spear
// Wall, Seismic Slam, Tunnel Strike and Bane, and what the ultimates add (Indomitable's aura, Call to Arms' charge, the Fissure's spires,
// Rallying Cry's charges, Battle Hymn's thunderclap).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, ULT_LEVEL, keyOf, powered, ultimateOf } from '../src/sim/abilities';
import { HERO_KITS, heroKitOf } from '../src/sim/heroKits';
import { hasAil } from '../src/sim/ailments';
import { tileAt } from '../src/sim/board';
import { auraOfProtection, bane, divineSmite, seismicSlam, shieldRush, smiteBane, spearWall, tunnelStrike } from '../src/sim/kits/tanks';
import { airborne } from '../src/sim/toolkit';

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
const ult = (b: Battle, me: Unit): BattleEvent[] => {
  const out: BattleEvent[] = [];
  assert.ok(powered(b, me, ultimateOf(me)!, 0, out), `${me.def}'s ultimate went off`);
  return out;
};

test('the seven heroes carry their new names, each keeping its old key where the move is the old one', () => {
  const names = (k: string) => [HERO_KITS()[k].s1.skill, HERO_KITS()[k].s2.skill, KITS[k].ultimate!].map((s) => `${s.name}=${keyOf(s)}`);
  assert.deepEqual(names('knight'), ['Shield Wall=Shield Wall', 'Shield Rush=Shield Rush', 'Indomitable=Last Bastion']);
  assert.deepEqual(names('paladin'), ['Divine Smite=Holy Challenge', 'Aura of Protection=Aura of Protection', 'Holy Nova=Divine Aegis']);
  assert.deepEqual(names('peasant'), ['Phalanx=Hold the Line', 'Spear Wall=Spear Wall', 'Call to Arms=Mass Muster']);
  assert.deepEqual(names('juggernaut'), ['Seismic Slam=Earthquake', 'Tunnel Strike=Tunnel Strike', 'Fissure=Cataclysm']);
  assert.deepEqual(names('samuraiCommander'), ['War Banner=War Banner', 'Plant the Standard=Plant the Standard', 'Rallying Cry=Rally Cry']);
  assert.deepEqual(names('wolfBard'), ['Vicious Mockery=Dirge', 'Bardic Inspiration=Change the Tune', 'Battle Hymn=Battle Hymn']);
  assert.deepEqual(names('tyrant'), ['Judgement=Judgement', 'Bane=Condemn', 'Reign of Terror=Reign of Terror']);
  // (the foes that borrow the Commander's banner keep the old one)
  assert.equal(KITS.orcChieftain.skill.name, 'War Banner');
});

test('Shield Rush: the Knight charges up to 3 tiles in a line, bashes his foe (stunned) and drives it 2 tiles back', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 9);
  const f = spawn(b, 'orcGrunt', 3, 6);
  spawn(b, 'skeleton', 0, 0);
  const hp = f.hp;
  const out: BattleEvent[] = [];
  assert.ok(shieldRush(b, me, out));
  assert.deepEqual(at(me), [3, 7]);
  assert.deepEqual(at(f), [3, 4], 'driven 2 tiles back');
  assert.ok(f.hp < hp && hasAil(f, 'stun', b.t));
  assert.ok(out.some((e) => e.kind === 'dash') && out.some((e) => e.kind === 'shove'));
});

test('Divine Smite strikes the foe before him, half as hard again on the undead and fiends, and draws the foes near', () => {
  const b = arena();
  assert.ok(smiteBane(spawn(b, 'skeleton', 0, 0)), 'undead');
  assert.ok(smiteBane(spawn(b, 'hellImp', 1, 0)), 'a fiend');
  assert.ok(!smiteBane(spawn(b, 'orcGrunt', 2, 0)), 'a plain orc');
  assert.ok(!smiteBane(spawn(b, 'ironGolem', 3, 0)), 'a golem is not undead');
  const b2 = arena();
  const me = spawn(b2, 'paladin', 3, 9);
  const front = spawn(b2, 'orcGrunt', 3, 8);
  const near = spawn(b2, 'orcGrunt', 5, 9);
  const hp = front.hp;
  assert.ok(divineSmite(b2, me, []));
  assert.ok(front.hp < hp, 'the blow');
  assert.equal(front.taunt?.to, me.id);
  assert.equal(near.taunt?.to, me.id);
});

test('Aura of Protection: the allies within 3 of the Paladin take 30% less and heal each second; none when he is alone', () => {
  const b = arena();
  const me = spawn(b, 'paladin', 3, 9);
  spawn(b, 'orcGrunt', 3, 6);
  assert.ok(!auraOfProtection(b, me, []), 'no friend near');
  const friend = spawn(b, 'archer', 4, 9);
  friend.hp = Math.round(friend.maxHp / 2);
  assert.ok(auraOfProtection(b, me, []));
  const hp = friend.hp;
  run(b, 1000);
  assert.ok(friend.hp > hp);
  assert.equal(friend.auraGuard?.share, 0.3);
  assert.ok((friend.wardUntil ?? 0) > b.t, 'warded against the next ailment');
});

test('Spear Wall lays thorn stakes across the Peasant\'s front: foes cannot walk through, and those beside it bleed', () => {
  const b = arena();
  const me = spawn(b, 'peasant', 3, 9);
  const f = spawn(b, 'orcGrunt', 3, 6);
  assert.ok(spearWall(b, me, []));
  for (const u of [2, 3, 4]) assert.equal(tileAt(b.board, u, 8)!.bar, 'thorns');
  f.u = 3;
  f.v = 7;
  run(b, 1000);
  assert.ok(hasAil(f, 'bleed', b.t));
});

test('Seismic Slam launches the foes beside the Juggernaut 2 tiles and holds every foe within 3', () => {
  const b = arena();
  const me = spawn(b, 'juggernaut', 3, 6);
  const beside = spawn(b, 'orcGrunt', 3, 5);
  const further = spawn(b, 'orcGrunt', 5, 6);
  const [hb, hf] = [beside.hp, further.hp];
  const out: BattleEvent[] = [];
  assert.ok(seismicSlam(b, me, out));
  assert.deepEqual(at(beside), [3, 3], 'thrown 2 tiles');
  assert.ok(airborne(b, beside));
  assert.deepEqual(at(further), [5, 6], 'not beside him: held, not thrown');
  assert.ok(beside.hp < hb && further.hp < hf);
  assert.ok(further.busyUntil > b.t);
});

test('Tunnel Strike: the Juggernaut burrows to the crowded foe and erupts under it; not when two foes are already beside him', () => {
  const b = arena();
  const me = spawn(b, 'juggernaut', 3, 9);
  const t = spawn(b, 'orcGrunt', 3, 4);
  spawn(b, 'orcGrunt', 4, 4);
  assert.ok(tunnelStrike(b, me, []));
  assert.ok(me.under);
  const hp = t.hp;
  run(b, 2000);
  assert.ok(!me.under && t.hp < hp);
  const b2 = arena();
  const j = spawn(b2, 'juggernaut', 3, 5);
  spawn(b2, 'orcGrunt', 3, 4);
  spawn(b2, 'orcGrunt', 2, 5);
  assert.ok(!tunnelStrike(b2, j, []));
});

test('Bane drags the toughest foe up to 3 tiles to the Tyrant, condemns it, and weakens the two nearest it', () => {
  const b = arena();
  const me = spawn(b, 'tyrant', 3, 10);
  const big = spawn(b, 'orcBrute', 3, 5);
  big.hp = big.maxHp = 2000;
  const a = spawn(b, 'orcGrunt', 4, 5);
  const c = spawn(b, 'orcGrunt', 2, 5);
  const far = spawn(b, 'orcGrunt', 7, 0);
  assert.ok(bane(b, me, []));
  assert.deepEqual(at(big), [3, 8], 'dragged 3 tiles');
  assert.ok(big.kx?.condemned && big.kx.condemned.until > b.t);
  assert.ok(hasAil(a, 'weak', b.t) && hasAil(c, 'weak', b.t));
  assert.ok(!hasAil(far, 'weak', b.t));
});

test("the ultimates' additions: Indomitable's aura, Call to Arms' charge, the Fissure's spires, Rallying Cry's charges, Battle Hymn's thunderclap", () => {
  const b = arena();
  const k = spawn(b, 'knight', 3, 9, ULT_LEVEL);
  const friend = spawn(b, 'archer', 4, 9);
  spawn(b, 'orcGrunt', 3, 6);
  ult(b, k);
  run(b, 600);
  assert.equal(friend.auraGuard?.share, 0.2, 'Indomitable guards the allies near him');

  const b2 = arena();
  const p = spawn(b2, 'peasant', 3, 9, ULT_LEVEL);
  spawn(b2, 'orcGrunt', 3, 6);
  const out2 = ult(b2, p);
  assert.ok(out2.some((e) => e.kind === 'dash' && e.by === p.id), 'the Peasant leads a charge');

  const b3 = arena();
  const j = spawn(b3, 'juggernaut', 3, 10, ULT_LEVEL);
  spawn(b3, 'wizard', 3, 9);
  spawn(b3, 'orcGrunt', 3, 6);
  spawn(b3, 'orcGrunt', 4, 6);
  ult(b3, j);
  assert.ok(b3.walls?.some((w) => w.kind === 'stone'), 'rock spires');

  const b4 = arena();
  const c = spawn(b4, 'samuraiCommander', 1, 10, ULT_LEVEL);
  const sam = spawn(b4, 'samurai', 3, 9);
  spawn(b4, 'orcGrunt', 3, 7);
  const out4 = ult(b4, c);
  assert.ok(out4.some((e) => e.kind === 'dash' && e.by === sam.id), 'a melee ally charges');

  const b5 = arena();
  const w = spawn(b5, 'wolfBard', 3, 9, ULT_LEVEL);
  const foe = spawn(b5, 'orcGrunt', 3, 8);
  ult(b5, w);
  assert.deepEqual(at(foe), [3, 6], 'shoved 2 tiles');
});

test('the reworked skill 2s fire for their heroes from level 10 when their pools are full', () => {
  for (const [hero, foes] of [
    ['knight', [[3, 6]]],
    ['paladin', [[3, 5]]],
    ['peasant', [[3, 6]]],
    ['juggernaut', [[3, 3], [4, 3]]],
    ['tyrant', [[3, 4]]],
  ] as const) {
    const b = arena();
    const me = spawn(b, hero, 3, 9, 10);
    spawn(b, 'archer', 4, 9);
    spawn(b, 'cleric', 2, 9);
    for (const [u, v] of foes) spawn(b, 'orcGrunt', u, v);
    me.charge = CHARGE_MAX;
    me.busyUntil = 0;
    const s2 = keyOf(heroKitOf(me)!.s2.skill);
    const ev = run(b, 300);
    assert.ok(ev.some((e) => e.kind === 'skill' && e.by === me.id && e.name === s2), `${hero} cast ${s2}`);
  }
});
