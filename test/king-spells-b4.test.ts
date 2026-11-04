// KING-SPELLS batch 4 (docs/notes/king-spells-b4.md): the schools' fourteen new spells.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, type Battle, type Unit } from '../src/sim/battle';
import { castSpell, lookOf, MANA_MAX, RIDERS, SPELL_LOOK, SPELLS, type SpellId } from '../src/sim/spells';
import { SCHOOLS, SCHOOL_IDS } from '../src/sim/schools';
import { TOWER_SPELLS } from '../src/sim/spellSources';
import { chooseSpell } from '../src/sim/autoCast';
import { snapSpell } from '../src/sim/spellAim';
import { wallAt } from '../src/sim/toolkit/walls';

const NEW = Object.keys(SPELL_LOOK) as SpellId[];

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  b.spells.mana = MANA_MAX;
  return b;
}
const still = (b: Battle) => {
  for (const x of b.units) x.busyUntil = 1e9;
};
const foe = (b: Battle, u: number, v: number, hp = 5000): Unit => {
  const f = addUnit(b, 'skeleton', u, v);
  f.hp = f.maxHp = hp;
  return f;
};

test('fourteen new spells, every school has five or six, each new one is taught by the Mage Tower and has a look, a sound and a rider', () => {
  assert.equal(NEW.length, 14);
  for (const id of SCHOOL_IDS) assert.ok(SCHOOLS[id].spells.length >= 5 && SCHOOLS[id].spells.length <= 6, id);
  for (const id of NEW) {
    const sp = SPELLS[id];
    assert.ok(sp.cost >= 3 && sp.cost <= 5 && sp.cooldownMs >= 8000 && sp.text.length > 20, id);
    assert.ok((TOWER_SPELLS[id] ?? 0) >= 1, `${id} is taught`);
    assert.ok(lookOf(id) !== id && lookOf(lookOf(id)) === lookOf(id), `${id} borrows a first spell's look`);
    assert.ok(RIDERS[id].length > 8, id);
    assert.ok(SCHOOL_IDS.some((s) => SCHOOLS[s].spells.includes(id)), `${id} has a school`);
  }
});

test('the walls stand on the tapped row, and a wall with nowhere to stand is refused', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 9);
  assert.ok(castSpell(b, 'icewall', 3, 4));
  for (const u of [2, 3, 4]) assert.equal(wallAt(b, u, 4)?.kind, 'ice', `(${u}, 4)`);
  assert.equal(wallAt(b, 5, 4), undefined);
  b.spells.mana = MANA_MAX;
  assert.equal(castSpell(b, 'bonewall', 3, 4), false, 'no tile free');
  b.spells.mana = MANA_MAX;
  b.spells.ranks = { firewall: 3 };
  assert.ok(castSpell(b, 'firewall', 3, 6));
  assert.equal(wallAt(b, 1, 6)?.kind, 'fire', 'rank 3: five wide');
});

test('the strikes: Shatter hits the frozen twice as hard, Sunbeam its row, Thunderclap the foes beside a hero, Venom poisons', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 9);
  const a = foe(b, 3, 3);
  const c = foe(b, 4, 3);
  still(b);
  a.slowUntil = b.t + 5000;
  assert.ok(castSpell(b, 'shatter', 3, 3));
  assert.ok(5000 - a.hp > (5000 - c.hp) * 1.8, 'the slowed foe took about twice as much');
  const s = arena();
  addUnit(s, 'knight', 3, 9);
  const inRow = foe(s, 0, 2);
  const off = foe(s, 0, 3);
  still(s);
  assert.ok(castSpell(s, 'sunbeam', 6, 2));
  assert.ok(inRow.hp < 5000 && off.hp === 5000);
  const t = arena();
  const h = addUnit(t, 'knight', 3, 5);
  const near = foe(t, 3, 4);
  const far = foe(t, 0, 0);
  still(t);
  assert.ok(castSpell(t, 'thunderclap', 0, 0));
  assert.ok(near.hp < 5000 && far.hp === 5000 && h.alive);
  const v = arena();
  addUnit(v, 'knight', 3, 9);
  const bit = foe(v, 3, 3);
  still(v);
  assert.ok(castSpell(v, 'venom', 3, 3));
  assert.ok(bit.hp < 5000);
});

test('Drain Life heals the most wounded hero by the harm done; Foresight hides; Mirage raises decoys; Charm turns a foe', () => {
  const b = arena();
  const hurt = addUnit(b, 'knight', 3, 9);
  hurt.hp = Math.round(hurt.maxHp * 0.3);
  const f = foe(b, 3, 3);
  still(b);
  const was = hurt.hp;
  assert.ok(castSpell(b, 'drain', 3, 3));
  assert.equal(hurt.hp - was, 5000 - f.hp);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'foresight', 3, 9));
  assert.ok((hurt.hideUntil ?? 0) > b.t);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'mirage', 5, 7));
  assert.equal(b.units.filter((x) => x.def === 'decoy').length, 2);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'charm', 3, 3));
  assert.ok((f.charmUntil ?? 0) > b.t, 'charmed');
});

test('Raise Dead lifts fallen foes as wraiths once each, and is refused with nobody fallen', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 9);
  assert.equal(castSpell(b, 'raisedead', 3, 3), false);
  const dead = foe(b, 3, 3);
  dead.alive = false;
  dead.hp = 0;
  assert.ok(castSpell(b, 'raisedead', 3, 3));
  const w = b.units.filter((x) => x.def === 'wraith');
  assert.equal(w.length, 1);
  assert.equal(w[0].side, 'hero');
  b.spells.mana = MANA_MAX;
  b.spells.ready.raisedead = 0;
  assert.equal(castSpell(b, 'raisedead', 3, 3), false, 'not twice');
});

test('Gale throws the foes back from the heroes; Thorn Snare holds them', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 6);
  const f = foe(b, 3, 5);
  still(b);
  assert.ok(castSpell(b, 'gale', 3, 5));
  assert.ok(f.v < 5, `thrown back to v ${f.v}`);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'snare', f.u, f.v));
});

test('Auto casts them where they are worth it, and the soft snap knows Sunbeam\'s row', () => {
  const b = arena();
  for (const u of [2, 3]) addUnit(b, 'knight', u, 6);
  foe(b, 2, 5);
  foe(b, 3, 5);
  still(b);
  assert.equal(chooseSpell(b, ['thunderclap'])?.id, 'thunderclap');
  assert.equal(chooseSpell(b, ['shatter'])?.id, 'shatter');
  assert.equal(chooseSpell(b, ['sunbeam'])?.v, 5);
  assert.deepEqual(snapSpell(b, 'sunbeam', 4, 4), [4, 5]);
  const w = arena();
  addUnit(w, 'knight', 3, 9);
  foe(w, 2, 5);
  foe(w, 4, 5);
  still(w);
  const pick = chooseSpell(w, ['icewall']);
  assert.equal(pick?.id, 'icewall');
  assert.ok(pick!.v > 5 && pick!.v < 9, 'between the foes and the hero');
});
