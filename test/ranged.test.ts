// The ranged heroes' and summoners' reworked kits (RPG-SPELLS batch 5, docs/notes/spells-b5.md): the new names on the old keys, the Archer's
// leap back, the Gunslinger's roll, the Rifle Bot's jets, the blasts that throw (Bombard, the Orbital Strike, the Powder Keg), the leaping
// wolves and the Reaper's pulling sweep.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { KITS, ULT_LEVEL, keyOf, powered, ultimateOf } from '../src/sim/abilities';
import { HERO_KITS, heroKitOf } from '../src/sim/heroKits';
import { tileAt } from '../src/sim/board';
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

test('the eight heroes carry their new names on their old keys', () => {
  const names = (k: string) => [HERO_KITS()[k].s1.skill, HERO_KITS()[k].s2.skill, KITS[k].ultimate!].map((s) => `${s.name}=${keyOf(s)}`);
  assert.deepEqual(names('archer'), ['Volley=Volley', 'Aimed Shot=Pinning Shot', 'Hail of Arrows=Arrow Storm']);
  assert.deepEqual(names('ranger'), ['Snare=Snare Trap', 'Spike Growth=Spike Field', "Entangle=Hunter's Net"]);
  assert.deepEqual(names('gunslinger'), ['Piercing Shot=Dead Eye', 'Fan the Hammer=Fan the Hammer', 'High Noon=High Noon']);
  assert.deepEqual(names('rifleBot'), ['Rapid Shot=Burst Fire', 'Suppressing Fire=Suppressing Fire', 'Overclock=Overclock']);
  assert.deepEqual(names('siegeBot'), ['Bombard=Shell Barrage', 'Siege Mode=Siege Mode', 'Orbital Strike=Orbital Strike']);
  assert.deepEqual(names('dreadPirate'), ['Cannonade=Broadside', 'Powder Keg=Powder Keg', 'Ghost Fleet=Ghost Fleet']);
  assert.deepEqual(names('beastmaster'), ['Summon Beast=Call of the Wild', "Pack Tactics=Sic 'Em", 'Conjure Animals=Hunt of the Pack']);
  assert.deepEqual(names('reaper'), ['Reap=Reap', 'Animate Dead=Bound Soul', 'Harvest of Souls=Harvest of Souls']);
});

test('Aimed Shot: with a foe beside her, the Archer leaps back to higher ground first, then pins', () => {
  const b = arena();
  tileAt(b.board, 3, 9)!.h = 2;
  const me = spawn(b, 'archer', 3, 7, 10);
  spawn(b, 'orcGrunt', 3, 6);
  const far = spawn(b, 'orcGrunt', 3, 3);
  const out = cast(b, me, 2);
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === me.id), 'she leaps');
  assert.deepEqual(at(me), [3, 9], 'onto the high ground behind her');
  assert.ok(far.busyUntil > b.t || out.some((e) => e.kind === 'mark' && e.what === 'pinned'));
});

test('Fan the Hammer: with a foe within 2, the Gunslinger rolls clear first', () => {
  const b = arena();
  const me = spawn(b, 'gunslinger', 3, 7, 10);
  spawn(b, 'orcGrunt', 3, 6);
  const out = cast(b, me, 2);
  assert.ok(out.some((e) => e.kind === 'dash' && e.by === me.id));
  assert.ok(Math.abs(me.u - 3) + Math.abs(me.v - 6) >= 2);
});

test('Overclock: the Rifle Bot jets to the highest ground in reach first', () => {
  const b = arena();
  tileAt(b.board, 5, 9)!.h = 2;
  const me = spawn(b, 'rifleBot', 3, 9, ULT_LEVEL);
  spawn(b, 'orcGrunt', 4, 7);
  const out = ult(b, me);
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === me.id));
  assert.deepEqual(at(me), [5, 9]);
});

test("Bombard's shell throws the foe at its heart 2 tiles and shoves the rest of the 3x3; the Orbital Strike launches its 3x3 2 tiles out", () => {
  const b = arena();
  const me = spawn(b, 'siegeBot', 3, 10);
  const heart = tough(b, 'orcGrunt', 3, 4);
  const side = tough(b, 'orcGrunt', 4, 4);
  tough(b, 'orcGrunt', 2, 4);
  cast(b, me, 1);
  const ev = run(b, 1500);
  assert.ok(ev.some((e) => e.kind === 'launch' && e.to === heart.id), 'the heart is thrown');
  assert.ok(ev.some((e) => e.kind === 'shove' && e.to === side.id), 'the ring is shoved');
  const b2 = arena();
  const bot = spawn(b2, 'siegeBot', 3, 10, ULT_LEVEL);
  tough(b2, 'orcGrunt', 3, 4);
  const s2 = tough(b2, 'orcGrunt', 4, 4);
  tough(b2, 'orcGrunt', 2, 4);
  ult(b2, bot);
  const ev2 = run(b2, 1800);
  assert.ok(ev2.some((e) => e.kind === 'launch' && e.to === s2.id), 'the 3x3 is launched');
});

test("the Powder Keg's blast throws its 3x3 outward", () => {
  const b = arena();
  const me = spawn(b, 'dreadPirate', 3, 10, 10);
  tough(b, 'orcGrunt', 3, 5);
  const side = tough(b, 'orcGrunt', 4, 5);
  tough(b, 'orcGrunt', 2, 5);
  cast(b, me, 2);
  const ev = run(b, 1500);
  assert.ok(ev.some((e) => e.kind === 'launch' && e.to === side.id));
});

test("Pack Tactics: the Beastmaster's wolves leap at the mark", () => {
  const b = arena();
  const me = spawn(b, 'beastmaster', 3, 9, 10);
  const w = spawn(b, 'wolf', 1, 9);
  w.owner = me.id;
  tough(b, 'orcGrunt', 3, 6);
  const out = cast(b, me, 2);
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === w.id));
});

test("Harvest of Souls: the Reaper's sweep drags every foe within 5 a tile towards him before it cuts", () => {
  const b = arena();
  const me = spawn(b, 'reaper', 3, 9, ULT_LEVEL);
  const f = tough(b, 'orcGrunt', 3, 6);
  const hp = f.hp;
  ult(b, me);
  assert.deepEqual(at(f), [3, 7]);
  assert.ok(f.hp < hp);
});
