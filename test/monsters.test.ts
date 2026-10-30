// The monster heroes' reworked kits (RPG-SPELLS batch 7, docs/notes/spells-b7.md): the new names on the old keys, the foes that borrow the
// old moves keeping them, and each new rule: Mass Polymorph, Alter Self's blink, Swoop from behind, Pilfer's silence, Cloud of Daggers, Gust of
// Wind, Wind Wall, Tempest's launch, Pounce, the Full Moon's howl, Gore Charge and Stampede's launches, Contagion, Plague Tide's burrow, Hold
// Person, the sand-wind, Grasping Tentacles, Tidal Wave and the Maelstrom's deeper drag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { KITS, ULT_LEVEL, keyOf, powered, ultimateOf } from '../src/sim/abilities';
import { HERO_KITS, heroKitOf } from '../src/sim/heroKits';
import { wallAt } from '../src/sim/toolkit';
import { AILMENT_SWITCH, isFeared, isSilenced } from '../src/sim/ailments';

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
/** With the ailments on (as in a real fight), whatever the switch was. */
const withAilments = (fn: () => void) => {
  const was = AILMENT_SWITCH.on;
  AILMENT_SWITCH.on = true;
  try {
    fn();
  } finally {
    AILMENT_SWITCH.on = was;
  }
};

test('the ten monster heroes carry their new names on their old keys', () => {
  const names = (k: string) => [HERO_KITS()[k].s1.skill, HERO_KITS()[k].s2.skill, KITS[k].ultimate!].map((s) => `${s.name}=${keyOf(s)}`);
  assert.deepEqual(names('kitsune'), ['Charm Monster=Fox Charm', 'Alter Self=Fox Guise', 'Mass Polymorph=Nine-Tailed Dream']);
  assert.deepEqual(names('karasu'), ['Swoop=Dive', 'Pilfer=Pilfer', 'Cloud of Daggers=Feather Storm']);
  assert.deepEqual(names('yamabushi'), ['Gust of Wind=Wind Gust', 'Wind Wall=Turning Wind', 'Tempest=Tempest']);
  assert.deepEqual(names('werewolf'), ['Pounce=Ravage', 'Shapechange=Shift', 'Full Moon=Full Moon']);
  assert.deepEqual(names('minotaur'), ['Gore Charge=Gore Charge', 'Bull Rush=Bull Rush', 'Stampede=Stampede']);
  assert.deepEqual(names('satyr'), ['Pipes of Pan=Pipes of Pan', 'Irresistible Dance=Pied Piper', 'Bacchanal=Bacchanal']);
  assert.deepEqual(names('gorgon'), ['Petrifying Gaze=Petrifying Gaze', 'Flesh to Stone=Stone Garden', 'Gaze of Medusa=Stone Curse']);
  assert.deepEqual(names('shambler'), ['Contagion=Rotting Touch', 'Devour=Devour', 'Plague Tide=Plague Tide']);
  assert.deepEqual(names('mummy'), ['Hold Person=Binding Wraps', 'Dominate Monster=Puppet Strings', 'Curse of the Pharaoh=Curse of the Pharaoh']);
  assert.deepEqual(names('kraken'), ['Grasping Tentacles=Undertow', 'Tidal Wave=Flood', 'Maelstrom=Maelstrom']);
});

test('the foes that borrow the monster heroes\' moves keep the old ones', () => {
  assert.equal(KITS.yokaiCrow.skill.name, 'Dive');
  assert.equal(KITS.yokaiMonk.skill.name, 'Wind Gust');
  assert.equal(KITS.packBlack.skill.name, 'Ravage');
  assert.equal(KITS.mazeMino1.skill.name, 'Gore Charge');
  assert.notEqual(KITS.mazeMino1.skill.cast, KITS.minotaur.skill.cast);
  assert.equal(KITS.gorgonQueen.ultimate!.name, 'Stone Curse');
  assert.equal(KITS.nineTails.ultimate!.name, 'Nine-Tailed Dream');
});

test('Mass Polymorph: the three strongest foes in sight become little foxes (a fifth of their attack, silenced); the shape and attack come back', () =>
  withAilments(() => {
    const b = arena();
    const me = spawn(b, 'kitsune', 3, 9, ULT_LEVEL);
    const foes = [2, 3, 4, 5].map((u) => tough(b, 'orcGrunt', u, 5));
    const before = foes.map((f) => f.power ?? 1);
    ult(b, me);
    const poly = foes.filter((f) => f.kx?.poly);
    assert.equal(poly.length, 3);
    for (const f of poly) {
      assert.ok(Math.abs((f.power ?? 1) - before[foes.indexOf(f)] * 0.2) < 1e-9);
      assert.ok(isSilenced(b, f));
      assert.equal(f.look, 'kitsune');
    }
    run(b, 6000);
    for (const f of poly) {
      assert.equal(f.kx?.poly, undefined);
      assert.ok(Math.abs((f.power ?? 1) - before[foes.indexOf(f)]) < 1e-9);
      assert.equal(f.look, undefined);
    }
  }));

test('Alter Self: the Kitsune blinks beside the strongest foe in sight, then takes its shape', () => {
  const b = arena();
  const me = spawn(b, 'kitsune', 3, 9, 10);
  tough(b, 'orcGrunt', 3, 4);
  const out = cast(b, me, 2);
  assert.ok(out.some((e) => e.kind === 'blink' && e.by === me.id));
  assert.deepEqual(at(me), [3, 5]);
  assert.ok(me.kx?.guise);
});

test('Swoop: the Karasu drops behind the shooter and strikes; Pilfer silences its mark', () =>
  withAilments(() => {
    const b = arena();
    const me = spawn(b, 'karasu', 3, 9, 10);
    const s = tough(b, 'orcArcher', 3, 5);
    s.facing = 1;
    cast(b, me, 1);
    assert.deepEqual(at(me), [3, 4], 'behind it (its back is to row 4)');
    assert.ok(s.hp < 5000);
    const b2 = arena();
    const k = spawn(b2, 'karasu', 3, 9, 10);
    const f = tough(b2, 'orcGrunt', 3, 5);
    f.charge = 80;
    cast(b2, k, 2);
    assert.ok(isSilenced(b2, f));
  }));

test('Cloud of Daggers: a cloud on the crowd that cuts and bleeds each second', () => {
  const b = arena();
  const me = spawn(b, 'karasu', 3, 9, ULT_LEVEL);
  const fs = [tough(b, 'orcGrunt', 3, 4), tough(b, 'orcGrunt', 4, 4), tough(b, 'orcGrunt', 3, 3)];
  const out = ult(b, me);
  assert.ok(out.some((e) => e.kind === 'aura' && e.what === 'cloud of daggers'));
  run(b, 2100);
  assert.ok(fs.every((f) => f.hp < 5000));
});

test('Gust of Wind shoves the foes within 2 two tiles; Tempest launches the foes within 4 two tiles and stuns them', () => {
  const b = arena();
  const me = spawn(b, 'yamabushi', 3, 8);
  const f = tough(b, 'orcGrunt', 3, 7);
  cast(b, me, 1);
  assert.deepEqual(at(f), [3, 5]);
  const b2 = arena();
  const y = spawn(b2, 'yamabushi', 3, 8, ULT_LEVEL);
  const g = tough(b2, 'orcGrunt', 3, 6);
  const out = ult(b2, y);
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === g.id));
  assert.deepEqual(at(g), [3, 4]);
  assert.ok((g.stunUntil ?? 0) > b2.t);
});

test('Wind Wall: a wall of wind in front of the friend a shooter aims at', () => {
  const b = arena();
  const me = spawn(b, 'yamabushi', 2, 9, 10);
  spawn(b, 'archer', 3, 9);
  spawn(b, 'orcArcher', 3, 4);
  const out = cast(b, me, 2);
  const laid = out.filter((e) => e.kind === 'terrain' && e.what === 'wind');
  assert.ok(laid.length >= 2);
  assert.ok(laid.every((e) => e.kind === 'terrain' && wallAt(b, e.u, e.v)?.kind === 'wind'));
});

test('Pounce: with no foe in reach, the Werewolf leaps beside the weakest foe within 4 and bites', () => {
  const b = arena();
  const me = spawn(b, 'werewolf', 3, 9);
  const f = tough(b, 'orcGrunt', 3, 5);
  const out = cast(b, me, 1);
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === me.id));
  assert.deepEqual(at(me), [3, 6]);
  assert.ok(f.hp < 5000);
});

test('Full Moon: the howl frightens the foes within 3', () =>
  withAilments(() => {
    const b = arena();
    const me = spawn(b, 'werewolf', 3, 8, ULT_LEVEL);
    const near = tough(b, 'orcGrunt', 3, 6);
    const far = tough(b, 'orcGrunt', 3, 1);
    ult(b, me);
    assert.ok(isFeared(b, near));
    assert.ok(!isFeared(b, far));
  }));

test('Gore Charge and Stampede launch the foe they strike 2 tiles', () => {
  const b = arena();
  const me = spawn(b, 'minotaur', 3, 9);
  const f = tough(b, 'orcGrunt', 3, 5);
  const out = cast(b, me, 1);
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === f.id));
  assert.deepEqual(at(f), [3, 3]);
  const b2 = arena();
  const m = spawn(b2, 'minotaur', 3, 9, ULT_LEVEL);
  const g = tough(b2, 'orcGrunt', 3, 5);
  const out2 = ult(b2, m);
  assert.ok(out2.some((e) => e.kind === 'launch' && e.to === g.id));
});

test('Contagion: a cloud of rot round the Shambler that hurts and curses each second, and feeds him', () => {
  const b = arena();
  const me = spawn(b, 'shambler', 3, 8);
  me.hp = Math.round(me.maxHp / 2);
  const f = tough(b, 'orcGrunt', 3, 6);
  const out = cast(b, me, 1);
  assert.ok(out.some((e) => e.kind === 'aura' && e.what === 'contagion rot'));
  const mine = me.hp;
  run(b, 2100);
  assert.ok(f.hp < 5000 && me.hp > mine);
});

test('Plague Tide: the Shambler burrows to the crowd, bursts out launching the foe there, and the wave of rot curses the foes within 5', () => {
  const b = arena();
  const me = spawn(b, 'shambler', 3, 9, ULT_LEVEL);
  const heart = tough(b, 'orcGrunt', 3, 4);
  const side = tough(b, 'orcGrunt', 4, 4);
  const out = ult(b, me);
  assert.ok(out.some((e) => e.kind === 'burrow' && e.by === me.id));
  assert.ok(me.under);
  const ev = run(b, 3000);
  assert.ok(!me.under);
  assert.ok(ev.some((e) => e.kind === 'launch' && e.to === heart.id));
  assert.ok(side.ail?.some((a) => a.kind === 'curse'));
});

test('Hold Person holds the hardest-hitting foe the wraps lash; the sand-wind drags the foes within 5 a tile first', () => {
  const b = arena();
  const me = spawn(b, 'mummy', 3, 8);
  const f = tough(b, 'orcGrunt', 3, 7);
  f.stunUntil = undefined;
  cast(b, me, 1);
  assert.ok((f.stunUntil ?? 0) > b.t);
  const b2 = arena();
  const m = spawn(b2, 'mummy', 3, 9, ULT_LEVEL);
  const g = tough(b2, 'orcGrunt', 3, 5);
  tough(b2, 'orcGrunt', 4, 5);
  tough(b2, 'orcGrunt', 2, 5);
  ult(b2, m);
  assert.deepEqual(at(g), [3, 6]);
});

test('Grasping Tentacles drag the farthest shooter all the way in; the Maelstrom drags 2 tiles', () => {
  const b = arena();
  const me = spawn(b, 'kraken', 3, 9);
  const s = tough(b, 'orcArcher', 3, 5);
  cast(b, me, 1);
  assert.deepEqual(at(s), [3, 8]);
  const b2 = arena();
  const k = spawn(b2, 'kraken', 3, 9, ULT_LEVEL);
  const f = tough(b2, 'orcGrunt', 3, 4);
  ult(b2, k);
  assert.deepEqual(at(f), [3, 6]);
});

test('Tidal Wave: the wave shoves the lane\'s foes 2 tiles, and freezes into a Wall of Ice past them', () => {
  const b = arena();
  const me = spawn(b, 'kraken', 3, 9, 10);
  const f = tough(b, 'orcGrunt', 3, 7);
  const g = tough(b, 'orcGrunt', 4, 6);
  const out = cast(b, me, 2);
  assert.deepEqual(at(f), [3, 5]);
  assert.deepEqual(at(g), [4, 4]);
  const ice = out.filter((e) => e.kind === 'terrain' && e.what === 'ice');
  assert.ok(ice.length >= 1);
  assert.ok(ice.every((e) => e.kind === 'terrain' && e.v === 3));
});
