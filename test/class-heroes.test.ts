import { SKILL2_LEVEL } from '../src/sim/heroKits';
import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, defOf, fight, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, onStrike, tickStatus } from '../src/sim/abilities';
import { ALL_HEROES, formOf, UNITS } from '../src/sim/units';
import { HERO_TRAITS, TRAITS, membersOf } from '../src/sim/traits';
import { ratingOf } from '../src/sim/stars';
import { SKILL_FX } from '../src/render/skillFx';
import layout from '../src/art/units/sheets.json';
import { dotOf } from '../src/sim/ailments';

const CLASSES = ['paladin', 'cleric', 'druid', 'barbarian', 'ranger', 'warlock', 'illusionist', 'gunslinger'];

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, charge = 0): Unit => {
  const x = addUnit(b, def, u, v);
  x.charge = charge;
  return x;
};
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};

test('the eight class heroes are registered, drawn at a sensible size, with a form for each grade and a skill effect', () => {
  for (const id of CLASSES) {
    assert.ok(ALL_HEROES.includes(id), id);
    const d = UNITS[id];
    assert.equal(d.side, 'hero');
    assert.ok(d.forms?.length === 3, id);
    assert.ok(KITS[id].skill.name && KITS[id].passive.name, id);
    assert.ok(SKILL_FX[KITS[id].skill.name], id);
    for (const f of d.forms!) assert.ok((layout as Record<string, unknown>)[f], f);
    const fig = (layout as Record<string, { figure: number }>)[d.sheet].figure * d.scale;
    // (heroes stand in one of three height bands: small 42, medium 50, large 60; see docs/notes/hero-art.md)
    assert.ok([42, 50, 60].some((b) => Math.abs(fig - b) <= 4), `${id} ${fig}`);
  }
  assert.equal(ALL_HEROES.length, new Set(ALL_HEROES).size);
});

test('the new traits have two to four heroes, one origin and one class each', () => {
  for (const t of ['holy', 'wild', 'arcane', 'frontier', 'warden']) {
    const n = membersOf(t).length;
    assert.ok(TRAITS[t] && n >= 2 && n <= 4, `${t} ${n}`);
  }
  for (const id of CLASSES) assert.equal(TRAITS[HERO_TRAITS[id][0]].kind, 'origin');
});

test('Holy Challenge draws the foes near and heals the allies beside the Paladin', () => {
  const b = arena();
  const p = spawn(b, 'paladin', 3, 5, CHARGE_MAX);
  const ally = spawn(b, 'knight', 4, 5);
  ally.hp = 100;
  const s1 = spawn(b, 'skeleton', 3, 3);
  const s2 = spawn(b, 'skeleton', 5, 4);
  run(b, 100);
  assert.equal(s1.taunt?.to, p.id);
  assert.equal(s2.taunt?.to, p.id);
  assert.ok(ally.hp > 100);
});

test('the Paladin heals for part of what his front block turns aside', () => {
  const b = arena();
  const p = spawn(b, 'paladin', 3, 5);
  const s = spawn(b, 'skeleton', 3, 4);
  p.facing = 3; // facing the skeleton
  p.hp = 100;
  const out: BattleEvent[] = [];
  const left = onStrike(b, s, p, 100, 'blow', false, out)!;
  assert.equal(left, 80);
  assert.equal(p.hp, 100 + Math.round(20 * 0.6));
  // from behind there is no block
  const c = spawn(b, 'skeleton', 3, 6);
  p.hp = 100;
  assert.equal(onStrike(b, c, p, 100, 'blow', false, out), 100);
  assert.equal(p.hp, 100);
});

test('Benediction cleanses every ally and heals them over time; Grace heals those beside the Cleric', () => {
  const b = arena();
  const c = spawn(b, 'cleric', 3, 5, CHARGE_MAX);
  // (Benediction is the Cleric's skill 2 since the hero kits: it opens at level 10)
  c.level = SKILL2_LEVEL;
  const a = spawn(b, 'knight', 5, 6);
  a.hp = 100;
  a.dot = { kind: 'burn', dmg: 3, every: 500, ms: 9000, by: 99, next: 9999, until: 99999 };
  spawn(b, 'skeleton', 3, 0);
  run(b, 100);
  assert.equal(dotOf(a), undefined);
  assert.ok(a.hot);
  const before = a.hp;
  run(b, 2100);
  assert.ok(a.hp >= before + 2 * Math.round(UNITS.cleric.atk * 1.2) - 1, `${a.hp} ${before}`);
  assert.ok(c.healed! > 0);
  // Grace: an ally beside her heals 1.5% a second with no skill at all
  const b2 = arena();
  spawn(b2, 'cleric', 3, 5);
  const k = spawn(b2, 'knight', 4, 5);
  k.hp = 100;
  spawn(b2, 'skeleton', 3, 0);
  b2.t = 900;
  tickStatus(b2, []);
  b2.t = 1000;
  tickStatus(b2, []);
  assert.equal(k.hp, 100 + Math.round(k.maxHp * 0.015));
});

test('Benediction holds when nobody is hurt', () => {
  const b = arena();
  const c = spawn(b, 'cleric', 3, 5, CHARGE_MAX);
  spawn(b, 'knight', 5, 6);
  spawn(b, 'skeleton', 3, 0);
  run(b, 100);
  assert.equal(c.charge >= CHARGE_MAX, true);
});

test('Call Treant raises one treant beside the Druid, and only one at a time', () => {
  const b = arena();
  const d = spawn(b, 'druid', 3, 6, CHARGE_MAX);
  spawn(b, 'skeleton', 3, 1);
  run(b, 100);
  const trees = b.units.filter((x) => x.def === 'treant' && x.alive);
  assert.equal(trees.length, 1);
  assert.equal(trees[0].side, 'hero');
  assert.ok(Math.abs(trees[0].u - d.u) + Math.abs(trees[0].v - d.v) <= 4);
  d.charge = CHARGE_MAX;
  run(b, 1500);
  assert.equal(b.units.filter((x) => x.def === 'treant' && x.alive).length, 1);
});

test('a treant grows with the Druid\'s grade: its sheet is the form of that grade, and each form has its rows', () => {
  for (const grade of [1, 2, 3]) {
    const b = arena();
    const d = spawn(b, 'druid', 3, 6, CHARGE_MAX);
    if (grade > 1) d.grade = grade;
    spawn(b, 'skeleton', 3, 1);
    run(b, 100);
    const t = b.units.find((x) => x.def === 'treant')!;
    assert.equal(t.grade, grade > 1 ? grade : undefined);
    const sheet = formOf(UNITS.treant, t.grade ?? 1);
    const l = (layout as Record<string, { rows: string[]; counts: Record<string, number> }>)[sheet];
    assert.ok(l, sheet);
    for (const row of ['idle', 'walk', 'attack', 'dead']) assert.ok(l.rows.includes(row) && l.counts[row] > 0, `${sheet} ${row}`);
  }
  assert.equal(new Set(UNITS.treant.forms).size, 3);
});

test('the Lich King has walk, hurt and a lying death', () => {
  const l = (layout as Record<string, { rows: string[]; counts: Record<string, number> }>).lich_king;
  for (const row of ['idle', 'walk', 'attack', 'attack2', 'hurt', 'dead']) assert.ok(l.rows.includes(row) && l.counts[row] > 0, row);
});

test('a treant or decoy is no hero: it does not hold the fight open, and its fall does not cost the star', () => {
  const b = arena();
  const h = spawn(b, 'knight', 3, 5);
  spawn(b, 'decoy', 4, 5);
  spawn(b, 'skeleton', 3, 4).hp = 1;
  h.hp = 1;
  const f = b.units.find((x) => x.def === 'skeleton')!;
  f.hp = 99999;
  // the knight falls: the decoy alone does not keep the fight alive
  h.alive = false;
  stepBattle(b);
  assert.equal(b.phase, 'lost');
  const w = arena();
  spawn(w, 'knight', 3, 5);
  const d = spawn(w, 'decoy', 4, 5);
  d.alive = false;
  w.phase = 'won';
  assert.equal(ratingOf(w, false).rules[1].earned, true);
});

test('Thorn Skin sends a share of a melee blow back; shots are not answered', () => {
  const b = arena();
  const d = spawn(b, 'druid', 3, 5);
  const s = spawn(b, 'skeleton', 3, 4);
  const hp = s.hp;
  const out: BattleEvent[] = [];
  const left = onStrike(b, s, d, 60, 'blow', false, out)!;
  assert.equal(left, 60);
  assert.equal(s.hp, hp - Math.round(60 * 0.33));
  const a = spawn(b, 'boneArcher', 3, 0);
  const ahp = a.hp;
  onStrike(b, a, d, 60, 'blow', false, out);
  assert.equal(a.hp, ahp);
});

test('Bloodrage raises the Barbarian\'s attack as his health falls', async () => {
  const { atkOf } = await import('../src/sim/battle');
  const b = arena();
  const x = spawn(b, 'barbarian', 3, 5);
  assert.equal(atkOf(x), UNITS.barbarian.atk);
  x.hp = x.maxHp / 2;
  assert.ok(Math.abs(atkOf(x) - UNITS.barbarian.atk * 1.45) < 1e-9);
  x.hp = 1;
  assert.ok(atkOf(x) > UNITS.barbarian.atk * 1.8);
});

test('Whirlwind cuts every foe in the 3x3 around the Barbarian and none outside it', () => {
  const b = arena();
  spawn(b, 'barbarian', 3, 5, CHARGE_MAX);
  const a = spawn(b, 'skeleton', 3, 4);
  const c = spawn(b, 'skeleton', 4, 4);
  const far = spawn(b, 'skeleton', 3, 2);
  const out = run(b, 100);
  assert.equal(out.filter((e) => e.kind === 'hit' && e.src === 'skill').length, 2);
  assert.ok(a.hp < a.maxHp && c.hp < c.maxHp && far.hp === far.maxHp);
});

test('Snare Trap lays traps on the tiles by the nearest foes; the first foe to step on one is hurt and held', () => {
  const b = arena();
  spawn(b, 'ranger', 3, 6, CHARGE_MAX);
  const s = spawn(b, 'skeleton', 3, 2);
  const at = { u: s.u, v: s.v };
  s.busyUntil = 1e9;
  const out = run(b, 100);
  assert.equal(b.traps?.length, 1);
  assert.equal(out.filter((e) => e.kind === 'trap').length, 1);
  const trap = b.traps![0];
  // (on a tile beside the foe, on the Ranger's side)
  assert.ok(Math.abs(trap.u - at.u) + Math.abs(trap.v - at.v) === 1 && trap.v >= at.v);
  const hp = s.hp;
  s.u = trap.u;
  s.v = trap.v;
  s.busyUntil = b.t;
  const t0 = b.t;
  const ev = run(b, 100);
  assert.ok(s.hp < hp);
  assert.ok(s.busyUntil >= t0 + 1900);
  assert.equal(b.traps!.length, 0);
  assert.ok(ev.some((e) => e.kind === 'hit' && e.to === s.id && e.src === 'skill'));
});

test('a trap catches only the Ranger\'s foes', () => {
  const b = arena();
  const r = spawn(b, 'ranger', 3, 6);
  const mine = spawn(b, 'knight', 5, 6);
  spawn(b, 'skeleton', 3, 0);
  b.traps = [{ u: 5, v: 6, side: 'hero', by: r.id, until: b.t + 9000, dmg: 50 }];
  const hp = mine.hp;
  tickStatus(b, []);
  assert.equal(mine.hp, hp);
  assert.equal(b.traps.length, 1);
});

test('Long Shot adds damage only against foes 4 or more tiles away', async () => {
  const { farOf } = await import('../src/sim/abilities');
  const b = arena();
  const r = spawn(b, 'ranger', 3, 6);
  const near = spawn(b, 'skeleton', 3, 4);
  const far = spawn(b, 'skeleton', 3, 1);
  assert.equal(farOf(r, near), 1);
  assert.equal(farOf(r, far), 1.35);
});

test('Hex curses the three toughest foes in reach, and the Warlock drinks part of the burn', () => {
  const b = arena();
  const w = spawn(b, 'warlock', 3, 6, CHARGE_MAX);
  const a = spawn(b, 'skeleton', 3, 3);
  const c = spawn(b, 'spearman', 4, 3);
  const d = spawn(b, 'boneArcher', 2, 3);
  const e = spawn(b, 'skeleton', 3, 0);
  run(b, 100);
  const cursed = [a, c, d, e].filter((x) => dotOf(x)?.kind === 'curse');
  assert.equal(cursed.length, 3);
  for (const x of [a, c, d, e]) x.busyUntil = 1e9;
  w.hp = 50;
  w.charge = -1000;
  run(b, 1000);
  assert.ok(w.hp > 50);
  assert.ok(a.hp < a.maxHp);
  run(b, 5200);
  assert.equal(dotOf(a), undefined);
});

test('Mirror Image leaves two decoys where she stood, slips her away and turns the foes on the decoys', () => {
  const b = arena();
  const il = spawn(b, 'illusionist', 3, 5, CHARGE_MAX);
  const s = spawn(b, 'skeleton', 3, 3);
  const from = { u: il.u, v: il.v };
  run(b, 100);
  const decoys = b.units.filter((x) => x.def === 'decoy');
  assert.equal(decoys.length, 2);
  assert.ok(decoys.some((x) => x.u === from.u && x.v === from.v));
  assert.ok(Math.abs(il.u - from.u) + Math.abs(il.v - from.v) >= 1);
  assert.ok(decoys.some((x) => x.id === s.taunt?.to));
  assert.equal(decoys[0].maxHp, Math.round(il.maxHp * 0.45));
});

test('Dead Eye shoots through every foe in a line and spares those off it', () => {
  const b = arena();
  const g = spawn(b, 'gunslinger', 3, 7, CHARGE_MAX);
  const a = spawn(b, 'skeleton', 3, 4);
  const c = spawn(b, 'skeleton', 3, 3);
  const off = spawn(b, 'skeleton', 5, 4);
  const out = run(b, 100);
  assert.equal(out.filter((e) => e.kind === 'hit' && e.src === 'skill').length, 2);
  assert.ok(a.hp < a.maxHp && c.hp < c.maxHp);
  assert.equal(off.hp, off.maxHp);
  assert.equal(g.charge < CHARGE_MAX, true);
});

test('Piercing Rounds: a shot also hits the foe behind its target', () => {
  const b = arena();
  spawn(b, 'gunslinger', 3, 7);
  const a = spawn(b, 'skeleton', 3, 4);
  const behind = spawn(b, 'skeleton', 3, 3);
  a.busyUntil = behind.busyUntil = 1e9;
  run(b, 1200);
  assert.ok(a.hp < a.maxHp);
  assert.ok(behind.hp < behind.maxHp);
});

test('a team of class heroes fights a whole battle to its end, the same way twice', () => {
  const play = () => {
    const b = startBattle(11);
    for (const [i, id] of ['paladin', 'cleric', 'druid', 'ranger', 'warlock'].entries()) place(b, id, 1 + i, 8);
    assert.ok(fight(b));
    for (let i = 0; i < 1200 && b.phase === 'fight'; i++) stepBattle(b);
    return [b.phase, b.t, b.units.map((u) => u.hp).join()];
  };
  assert.deepEqual(play(), play());
  assert.ok(defOf(startBattle(1).units[0]));
});

test('a kitless summon can slip a blow from a team dodge bonus without a crash', () => {
  const b = arena();
  b.traits = { dodge: 1 };
  const t = spawn(b, 'treant', 3, 5);
  const s = spawn(b, 'skeleton', 3, 4);
  assert.equal(onStrike(b, s, t, 50, 'blow', false, []), null);
});
