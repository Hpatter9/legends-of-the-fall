// KING-SPELLS batch 2 (docs/notes/king-spells-b2.md): the Schools of the Crown and the Decrees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, TICK_MS, type Battle, type BattleEvent } from '../src/sim/battle';
import { castSpell, fillMana, MANA_MAX, MANA_PER_SEC, SPELLS, SPELL_IDS } from '../src/sim/spells';
import { firstSpells, SCHOOLS, SCHOOL_IDS } from '../src/sim/schools';
import { armDecree, autoDecree, castDecree, DECREE_FULL, DECREE_PER_SEC, DECREE_PER_SPENT, DECREES, STAND_FAST_SHARE } from '../src/sim/decrees';
import { replayLog } from '../src/sim/orders';
import { RULERS } from '../src/rulerRules';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const still = (b: Battle) => {
  for (const x of b.units) x.busyUntil = 1e9;
};

test('every ruler leads a school with its own Decree, every school spell is a real spell, and every spell but one has a school', () => {
  assert.deepEqual([...SCHOOL_IDS].sort(), RULERS.map((r) => r.id).sort());
  const decrees = new Set(SCHOOL_IDS.map((id) => SCHOOLS[id].decree));
  assert.equal(decrees.size, SCHOOL_IDS.length);
  for (const id of SCHOOL_IDS) {
    const s = SCHOOLS[id];
    assert.ok(s.spells.length >= 3 && s.spells.every((x) => x in SPELLS), id);
    assert.equal(firstSpells(s).length, 2);
    assert.ok(s.decree in DECREES);
  }
  const homeless = SPELL_IDS.filter((x) => !SCHOOL_IDS.some((id) => SCHOOLS[id].spells.includes(x)));
  assert.deepEqual(homeless, []);
});

test('with a Decree armed, mana that will not fit feeds its meter (and no spill is kept); so do half the mana spent and a trickle', () => {
  const b = arena();
  armDecree(b, 'standFast');
  b.spells.mana = MANA_MAX;
  const tick = (TICK_MS * MANA_PER_SEC * b.spells.rate) / 1000;
  fillMana(b);
  assert.equal(b.spells.spill, undefined);
  assert.ok(Math.abs(b.spells.decree!.fill - (tick + (DECREE_PER_SEC * TICK_MS) / 1000)) < 1e-6);
  const before = b.spells.decree!.fill;
  addUnit(b, 'knight', 3, 7);
  assert.ok(castSpell(b, 'heal', 3, 7));
  assert.ok(Math.abs(b.spells.decree!.fill - (before + SPELLS.heal.cost * DECREE_PER_SPENT)) < 1e-6);
  for (let i = 0; i < 10000; i++) fillMana(b);
  assert.equal(b.spells.decree!.fill, DECREE_FULL);
});

test('a Decree is cast once, only when full and in a fight, and an unknown id arms nothing', () => {
  const b = arena();
  const hero = addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 0);
  still(b);
  assert.equal(castDecree(b), false);
  armDecree(b, 'nothing');
  assert.equal(b.spells.decree, undefined);
  armDecree(b, 'standFast');
  assert.equal(castDecree(b), false, 'not full');
  b.spells.decree!.fill = DECREE_FULL;
  assert.ok(castDecree(b));
  assert.equal(hero.shield?.hp, Math.round(hero.maxHp * STAND_FAST_SHARE));
  b.spells.decree!.fill = DECREE_FULL;
  assert.equal(castDecree(b), false, 'once a fight');
  assert.deepEqual(b.log?.at(-1), { t: b.t, kind: 'decree' });
});

test('each Decree does what it says on its foes or heroes', () => {
  for (const id of Object.keys(DECREES) as (keyof typeof DECREES)[]) {
    const b = arena();
    const hero = addUnit(b, 'knight', 3, 7);
    hero.hp = Math.round(hero.maxHp * 0.5);
    const foe = addUnit(b, 'skeleton', 3, 1);
    foe.hp = foe.maxHp = 5000;
    still(b);
    armDecree(b, id);
    b.spells.decree!.fill = DECREE_FULL;
    const hp = { hero: hero.hp, foe: foe.hp, power: foe.power ?? 1 };
    assert.ok(castDecree(b), id);
    const ev = b.spells.events;
    assert.ok(ev.some((e) => e.kind === 'decree' && e.id === id), id);
    const touched = hero.hp !== hp.hero || !!hero.shield || (hero.hasteUntil ?? 0) > b.t || foe.hp !== hp.foe || (foe.power ?? 1) !== hp.power || !!foe.ail?.length;
    assert.ok(touched, `${id} changed something`);
  }
});

test('a recorded fight replays its Decree from the log', () => {
  const play = (log?: Battle['log']) => {
    const b = arena();
    addUnit(b, 'knight', 3, 7);
    const foe = addUnit(b, 'skeleton', 3, 4);
    foe.hp = foe.maxHp = 3000;
    armDecree(b, 'redSky');
    b.spells.decree!.fill = DECREE_FULL;
    const trace: string[] = [];
    for (let i = 0; i < 40 && b.phase === 'fight'; i++) {
      if (log) replayLog(b, log);
      else if (i === 5) castDecree(b);
      for (const e of stepBattle(b) as BattleEvent[]) if (e.kind === 'hit' || e.kind === 'decree') trace.push(`${b.t}:${e.kind}`);
    }
    return { b, trace: trace.join(',') };
  };
  const first = play();
  assert.ok(first.trace.includes('decree'));
  assert.equal(play(first.b.log!.filter((e) => e.kind === 'decree')).trace, first.trace);
});

test("Auto casts a Decree on the foes at a crowd of three (two when only two are left), one on the heroes when three are below half, and never when not armed", () => {
  const b = arena();
  for (const u of [1, 2, 3]) addUnit(b, 'knight', u, 7);
  for (const u of [1, 2]) addUnit(b, 'skeleton', u, 3);
  // (a third foe nearly done does not count, but keeps the bar at three)
  const spent = addUnit(b, 'skeleton', 3, 3);
  spent.hp = Math.round(spent.maxHp * 0.1);
  still(b);
  assert.equal(autoDecree(b), false);
  armDecree(b, 'redSky');
  b.spells.decree!.fill = DECREE_FULL;
  assert.equal(autoDecree(b), false, 'two foes worth it of three are not enough');
  addUnit(b, 'skeleton', 4, 3);
  assert.ok(autoDecree(b));
  // (two foes, the only two left: worth the Decree)
  const two = arena();
  addUnit(two, 'knight', 2, 7);
  for (const u of [1, 2]) addUnit(two, 'skeleton', u, 3);
  still(two);
  armDecree(two, 'tempest');
  two.spells.decree!.fill = DECREE_FULL;
  assert.ok(autoDecree(two));
  const c = arena();
  const hs = [1, 2, 3].map((u) => addUnit(c, 'knight', u, 7));
  addUnit(c, 'skeleton', 3, 1);
  still(c);
  armDecree(c, 'highNoon');
  c.spells.decree!.fill = DECREE_FULL;
  assert.equal(autoDecree(c), false);
  for (const h of hs) h.hp = Math.round(h.maxHp * 0.4);
  assert.ok(autoDecree(c));
});
