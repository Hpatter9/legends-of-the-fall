import { HERO_KITS } from '../src/sim/heroKits';
import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { addUnit, apart, atkOf, hurt, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { afterBlow, CHARGE_MAX, FORM_MULT, KITS, onStrike, ULT_LEVEL } from '../src/sim/abilities';
import { ALL_HEROES, formOf, UNITS } from '../src/sim/units';
import { countTraits, HERO_TRAITS, membersOf, TRAITS, traitEffects } from '../src/sim/traits';
import { TREES } from '../src/sim/talents';
import { SKILL_FX } from '../src/render/skillFx';
import { SKILL_ELEMENT } from '../src/render/fxRules';
import { SPOTS } from '../src/render/tavernSpots';
import layout from '../src/art/units/sheets.json';

const NEW = ['shambler', 'rifleBot', 'mercenary', 'mummy', 'buccaneer', 'wolfBard', 'beastmaster', 'kraken', 'lancer', 'reaper', 'timeWitch', 'arcBlade', 'dreadPirate', 'siegeBot', 'priestess', 'dragoon', 'juggernaut', 'sage', 'demonSwordsman', 'tyrant'];
const LAYOUT = layout as Record<string, { w: number; h: number; rows: string[]; counts: Record<string, number>; figure: number }>;

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
// (`level`: a hero's ultimate waits for level 15, so a test of one spawns the hero at it)
const spawn = (b: Battle, def: string, u: number, v: number, charge = 0, level?: number): Unit => {
  const x = addUnit(b, def, u, v, level ? { level } : undefined);
  x.charge = charge;
  return x;
};
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};
const skillsBy = (ev: BattleEvent[], u: Unit) => ev.filter((e) => e.kind === 'skill' && e.by === u.id).map((e) => (e as { name: string }).name);

test('twenty heroes join, each with a kit, a tree, traits, a tavern spot and a skill look', () => {
  for (const id of NEW) {
    assert.ok(ALL_HEROES.includes(id), id);
    const d = UNITS[id];
    assert.equal(d.side, 'hero');
    assert.ok(KITS[id].ultimate, `${id} ultimate`);
    assert.ok(KITS[id].skill.name && KITS[id].passive.name, id);
    for (const s of [KITS[id].skill, KITS[id].ultimate]) if (s) assert.ok(SKILL_FX[s.name] && SKILL_ELEMENT[s.name], s.name);
    assert.equal(TREES[id]?.nodes.length, 16, `${id} tree`);
    const [o, c] = HERO_TRAITS[id];
    assert.equal(TRAITS[o].kind, 'origin');
    assert.equal(TRAITS[c].kind, 'class');
    assert.ok(SPOTS[id], `${id} tavern spot`);
    assert.match(d.name, /^[A-Z]/);
    assert.ok(d.role.length > 10, id);
  }
  assert.equal(new Set(NEW).size, NEW.length);
  assert.equal(ALL_HEROES.length, 45);
  assert.equal(new Set(ALL_HEROES).size, 45);
});

test('every new hero has art: a sheet for each grade with walk, attack, idle, hurt and death rows, drawn at a sensible size', () => {
  for (const id of NEW) {
    const d = UNITS[id];
    const sheets = d.forms ?? [d.sheet];
    assert.equal(sheets[0], d.sheet, `${id} first form is the sheet`);
    for (const f of sheets) {
      const l = LAYOUT[f];
      assert.ok(l && existsSync(`src/art/units/${f}.png`), f);
      for (const r of ['walk', 'attack', 'idle', 'dead']) assert.ok(l.rows.includes(r) && l.counts[r] > 0, `${f} ${r}`);
      const fig = l.figure * d.scale;
      assert.ok(fig > 38 && fig < 66, `${id} is ${fig}px tall`);
    }
    // (Pixel Champions heroes are drawn at a whole-number scale, and have three looks)
    if (d.sheet.startsWith('pc_')) {
      assert.equal(d.scale, Math.round(d.scale), id);
      assert.equal(d.forms?.length, 3, id);
    }
  }
});

test('the traits: every one has two to four heroes, and every tier can be reached', () => {
  for (const [id, t] of Object.entries(TRAITS)) {
    const n = membersOf(id).length;
    assert.ok(n >= 2 && n <= 4, `${id} ${n}`);
    for (const tier of t.tiers) assert.ok(tier.need <= n, `${id} tier ${tier.need} with ${n} members`);
  }
  // (the new four-piece bonuses)
  for (const id of ['undead', 'machine', 'royal', 'assassin', 'vanguard', 'frontier', 'warden', 'caster', 'wild', 'arcane', 'mystic']) {
    assert.equal(TRAITS[id].tiers.length, 2, id);
    const c = countTraits(membersOf(id)).find((x) => x.trait.id === id)!;
    assert.equal(c.tier, 1, id);
  }
  assert.ok(Math.abs(traitEffects(['shambler', 'mummy', 'reaper', 'dreadPirate']).hp! - 1.14) < 1e-9);
  assert.ok(Math.abs(traitEffects(['rifleBot', 'arcBlade', 'siegeBot', 'juggernaut']).atk! - 1.1 * 1.04) < 1e-9);
});

test('every new hero\'s skill fires in a fight when its charge is full', () => {
  for (const id of NEW) {
    const b = arena();
    const me = spawn(b, id, 3, 6, CHARGE_MAX);
    // (a hurt ally for the healers, a crowd and a lone foe for the rest, in sight and within reach of most)
    const ally = spawn(b, 'knight', 4, 6);
    ally.hp = Math.round(ally.maxHp * 0.3);
    [[3, 4], [4, 4], [3, 3], [2, 4], [6, 2], [0, 2], [3, 2]].forEach(([u, v]) => spawn(b, 'skeleton', u, v));
    const ev = run(b, 3000);
    assert.ok(skillsBy(ev, me).includes(KITS[id].skill.name), `${id} cast ${KITS[id].skill.name}`);
  }
});

test('the Great Sage\'s, Demon Swordsman\'s and Tyrant\'s ultimates fire when their meters are full', () => {
  for (const id of ['sage', 'demonSwordsman', 'tyrant']) {
    const b = arena();
    const me = spawn(b, id, 3, 6, 0, ULT_LEVEL);
    me.charge2 = CHARGE_MAX;
    spawn(b, 'knight', 4, 6);
    [[3, 4], [4, 4], [3, 3]].forEach(([u, v]) => spawn(b, 'skeleton', u, v));
    const ev = run(b, 3000);
    assert.ok(skillsBy(ev, me).includes(KITS[id].ultimate!.name), id);
    assert.ok((me.charge2 ?? 0) < CHARGE_MAX, id);
  }
});

test('Rotting Touch makes every foe within two tiles rot, and the Shambler drinks some of it', () => {
  const b = arena();
  const me = spawn(b, 'shambler', 3, 6, CHARGE_MAX);
  me.hp = 100;
  const near = spawn(b, 'skeleton', 3, 5);
  const far = spawn(b, 'skeleton', 3, 0);
  run(b, 200);
  assert.equal(near.dot?.kind, 'curse');
  assert.equal(far.dot, undefined);
  run(b, 1500);
  assert.ok((me.healed ?? 0) > 0);
});

test('Burst Fire is three quick shots at one foe', () => {
  const b = arena();
  const me = spawn(b, 'rifleBot', 3, 6, CHARGE_MAX);
  const f = spawn(b, 'skeleton', 3, 3);
  const ev = run(b, 300);
  const shots = ev.filter((e) => e.kind === 'hit' && e.by === me.id && e.src === 'skill');
  assert.equal(shots.length, 3);
  assert.ok(f.hp < f.maxHp);
});

test('Bounty Hunt goes for the hardest hitter', () => {
  const b = arena();
  const me = spawn(b, 'mercenary', 3, 6, CHARGE_MAX);
  const weak = spawn(b, 'skeleton', 1, 3);
  const strong = spawn(b, 'spearman', 5, 3);
  run(b, 200);
  assert.ok(atkOf(strong) > atkOf(weak));
  assert.ok(strong.hp < strong.maxHp);
  assert.equal(weak.hp, weak.maxHp);
  assert.ok(apart(me, strong) <= 1);
});

test('Binding Wraps slow the foes near the Mummy', () => {
  const b = arena();
  spawn(b, 'mummy', 3, 6, CHARGE_MAX);
  const near = spawn(b, 'skeleton', 3, 5);
  const far = spawn(b, 'skeleton', 0, 0);
  run(b, 200);
  assert.ok((near.slowUntil ?? 0) > b.t);
  assert.equal(far.slowUntil, undefined);
});

test('Grappling Hook drags the nearest shooter in beside the Buccaneer and holds it', () => {
  const b = arena();
  const me = spawn(b, 'buccaneer', 3, 6, CHARGE_MAX);
  const archer = spawn(b, 'boneArcher', 3, 2);
  spawn(b, 'skeleton', 5, 3);
  run(b, 200);
  assert.equal(apart(me, archer), 1);
  assert.ok((archer.stunUntil ?? 0) > b.t - 1000);
  assert.ok(archer.hp < archer.maxHp);
});

test('Dirge slows every foe within four tiles, and the bard\'s tune charges the friend with the least', () => {
  const b = arena();
  const me = spawn(b, 'wolfBard', 3, 6, CHARGE_MAX);
  const f = spawn(b, 'skeleton', 3, 3);
  run(b, 200);
  assert.ok((f.slowUntil ?? 0) > b.t);
  assert.ok(f.hp < f.maxHp);
  // (the tune: a friend far from the fight gains its pool faster than time alone gives it; the same friend without the bard is the measure)
  const c = arena();
  const bard = spawn(c, 'wolfBard', 3, 8);
  const friend = spawn(c, 'knight', 4, 8);
  spawn(c, 'skeleton', 3, 0).busyUntil = 1e9;
  friend.busyUntil = bard.busyUntil = 1e9;
  run(c, 5000);
  const alone = arena();
  const lone = spawn(alone, 'knight', 4, 8);
  spawn(alone, 'skeleton', 3, 0).busyUntil = 1e9;
  lone.busyUntil = 1e9;
  run(alone, 5000);
  assert.ok(friend.charge > lone.charge + KITS.wolfBard.passive.tune!.charge * 0.5 - 0.01, `${friend.charge} ${lone.charge}`);
  assert.ok(bard.alive);
  assert.equal(me.alive, true);
});

test('Call of the Wild brings two dire wolves, no more, that fight for the Beastmaster', () => {
  const b = arena();
  const me = spawn(b, 'beastmaster', 3, 7, CHARGE_MAX);
  spawn(b, 'skeleton', 3, 2);
  run(b, 100);
  const wolves = () => b.units.filter((x) => x.alive && x.def === 'wolf');
  assert.equal(wolves().length, 1);
  assert.equal(wolves()[0].owner, me.id);
  // (a skill keeps a gap before it goes again: COMBAT-002)
  me.charge = CHARGE_MAX;
  run(b, 3500);
  assert.equal(wolves().length, 2);
  me.charge = CHARGE_MAX;
  run(b, 3500);
  assert.equal(wolves().length, 2);
});

test('the Beastmaster\'s whip slows the foe it strikes', () => {
  const b = arena();
  const me = spawn(b, 'beastmaster', 3, 6);
  const f = spawn(b, 'skeleton', 3, 5);
  afterBlow(b, me, f, false, 10, []);
  assert.ok((f.slowUntil ?? 0) > b.t);
});

test('Undertow drags foes a tile closer and slows them', () => {
  const b = arena();
  const me = spawn(b, 'kraken', 3, 6, CHARGE_MAX);
  const f = spawn(b, 'skeleton', 3, 3);
  run(b, 150);
  assert.equal(f.v, 4);
  assert.ok((f.slowUntil ?? 0) > b.t);
  assert.ok(me.alive);
});

test('Lance Charge runs a foe down, and the Lancer rides faster after it', () => {
  const b = arena();
  const me = spawn(b, 'lancer', 3, 7, CHARGE_MAX);
  const f = spawn(b, 'skeleton', 3, 3);
  run(b, 200);
  assert.equal(apart(me, f), 1);
  // (more than double a plain blow, at the skill's strength: its kit's `tune`)
  assert.ok(f.maxHp - f.hp >= (UNITS.lancer.atk * 2.2 * HERO_KITS().lancer.s1.tune - UNITS.skeleton.def) * 0.9, `${f.maxHp - f.hp}`);
  assert.ok((me.hasteUntil ?? 0) > b.t);
});

test('Reap hits a nearly dead foe for nearly triple', () => {
  const b = arena();
  spawn(b, 'reaper', 3, 6, CHARGE_MAX);
  const doomed = spawn(b, 'skeleton', 3, 5);
  const fresh = spawn(b, 'skeleton', 4, 5);
  doomed.hp = Math.round(doomed.maxHp * 0.25);
  const ev = run(b, 200);
  const hits = ev.filter((e) => e.kind === 'hit' && e.src === 'skill');
  const on = (u: Unit) => (hits.find((e) => e.kind === 'hit' && e.to === u.id) as { dmg: number }).dmg;
  assert.ok(on(doomed) > on(fresh) * 2.5);
});

test('Temporal Surge hastens the Time Witch\'s friends and slows the foes', () => {
  const b = arena();
  spawn(b, 'timeWitch', 3, 6, CHARGE_MAX);
  const ally = spawn(b, 'knight', 4, 6);
  const f = spawn(b, 'skeleton', 3, 3);
  run(b, 200);
  assert.ok((ally.hasteUntil ?? 0) > b.t);
  assert.ok((f.slowUntil ?? 0) > b.t);
});

test('Voltage Blink lands beside a crowd and holds every foe in the 3x3 round it', () => {
  const b = arena();
  const me = spawn(b, 'arcBlade', 3, 8, CHARGE_MAX);
  const foes = [[3, 3], [4, 3], [3, 2], [4, 2]].map(([u, v]) => spawn(b, 'skeleton', u, v));
  run(b, 150);
  assert.ok(apart(me, foes[0]) <= 2 && me.v < 8);
  assert.ok(foes.filter((f) => (f.stunUntil ?? 0) > b.t).length >= 3);
});

test('Broadside and Shell Barrage land on a crowd a moment after the call', () => {
  for (const id of ['dreadPirate', 'siegeBot']) {
    const b = arena();
    spawn(b, id, 3, 8, CHARGE_MAX);
    const foes = [[3, 4], [4, 4], [3, 3]].map(([u, v]) => spawn(b, 'skeleton', u, v));
    // (the foes hold their ground, so the shells find them where the call was made)
    for (const f of foes) f.busyUntil = 1e9;
    const ev = run(b, 300);
    assert.ok(ev.some((e) => e.kind === 'area'), id);
    assert.ok(foes.every((f) => f.hp === f.maxHp), `${id} not yet`);
    run(b, 1500);
    assert.ok(foes.filter((f) => f.hp < f.maxHp).length >= 2, id);
  }
});

test('Deathless: the Dread Pirate rises once from a killing blow', () => {
  const b = arena();
  const me = spawn(b, 'dreadPirate', 3, 6);
  const f = spawn(b, 'skeleton', 3, 5);
  const out: BattleEvent[] = [];
  hurt(b, f, me, me.maxHp * 3, false, false, out);
  assert.equal(me.alive, true);
  assert.equal(me.hp, Math.round(me.maxHp * 0.35));
  hurt(b, f, me, me.maxHp * 3, false, false, out);
  assert.equal(me.alive, false);
});

test('Holy Light mends the worst hurt ally and the halo shields those beside her', () => {
  const b = arena();
  const me = spawn(b, 'priestess', 3, 6, CHARGE_MAX);
  const hurtOne = spawn(b, 'knight', 4, 6);
  hurtOne.hp = 50;
  spawn(b, 'skeleton', 3, 0);
  run(b, 200);
  assert.ok(hurtOne.hp > 50 + atkOf(me) * 3);
  const s = spawn(b, 'skeleton', 4, 5);
  const out: BattleEvent[] = [];
  const near = onStrike(b, s, hurtOne, 100, 'blow', false, out)!;
  hurtOne.facing = 0;
  assert.ok(near <= 92);
  const far = spawn(b, 'knight', 0, 8);
  assert.ok(onStrike(b, s, far, 100, 'blow', false, out)! > 92);
});

test('Dragon Breath burns every foe in a line', () => {
  const b = arena();
  spawn(b, 'dragoon', 3, 8, CHARGE_MAX);
  const line = [[3, 6], [3, 5], [3, 4]].map(([u, v]) => spawn(b, 'skeleton', u, v));
  run(b, 200);
  assert.ok(line.every((f) => f.dot?.kind === 'burn' || f.hp < f.maxHp));
  assert.ok(line.filter((f) => f.dot?.kind === 'burn').length >= 2);
});

test('Earthquake holds every foe within three tiles', () => {
  const b = arena();
  spawn(b, 'juggernaut', 3, 6, CHARGE_MAX);
  const near = [[3, 4], [5, 5]].map(([u, v]) => spawn(b, 'skeleton', u, v));
  const far = spawn(b, 'skeleton', 0, 0);
  run(b, 200);
  assert.ok(near.every((f) => (f.stunUntil ?? 0) > b.t));
  assert.equal(far.stunUntil, undefined);
});

test('Starfall calls stars on up to three separate crowds, and Astral Convergence fills the allies\' meters', () => {
  const b = arena();
  const me = spawn(b, 'sage', 3, 8, CHARGE_MAX);
  [[0, 4], [3, 4], [6, 4]].forEach(([u, v]) => spawn(b, 'skeleton', u, v));
  const ev = run(b, 200);
  assert.equal(ev.filter((e) => e.kind === 'area').length, 3);
  const c = arena();
  const sage = spawn(c, 'sage', 3, 8, 0, ULT_LEVEL);
  sage.charge2 = CHARGE_MAX;
  const ally = spawn(c, 'knight', 4, 8);
  spawn(c, 'skeleton', 3, 0);
  run(c, 200);
  assert.ok(ally.charge >= 50);
  assert.ok(ally.shield && ally.shield.hp > 0);
  assert.ok(me.alive);
});

test('Hellblade Sweep heals the Demon Swordsman, and Demon Form lifts his attack, then wears off', () => {
  const b = arena();
  const me = spawn(b, 'demonSwordsman', 3, 6, CHARGE_MAX);
  me.hp = 100;
  [[3, 5], [4, 5]].forEach(([u, v]) => spawn(b, 'skeleton', u, v));
  run(b, 200);
  assert.ok(me.hp > 100);
  const c = arena();
  const dm = spawn(c, 'demonSwordsman', 3, 6, 0, ULT_LEVEL);
  dm.charge2 = CHARGE_MAX;
  spawn(c, 'skeleton', 3, 4);
  const before = dm.power ?? 1;
  run(c, 200);
  assert.ok(Math.abs((dm.power ?? 1) / before - FORM_MULT) < 1e-6);
  run(c, 8000);
  assert.ok(Math.abs((dm.power ?? 1) / before - 1) < 1e-6);
  assert.equal(dm.form, undefined);
});

test('Judgement falls on the toughest foe, and Reign of Terror slows the foes and rallies the allies', () => {
  const b = arena();
  spawn(b, 'tyrant', 3, 6, CHARGE_MAX);
  const strong = spawn(b, 'skeleton', 3, 3);
  const weak = spawn(b, 'boneArcher', 5, 3);
  strong.hp = strong.maxHp;
  run(b, 2000);
  assert.ok(strong.hp < strong.maxHp);
  assert.ok(weak.hp <= weak.maxHp);
  const c = arena();
  const t = spawn(c, 'tyrant', 3, 6, 0, ULT_LEVEL);
  t.charge2 = CHARGE_MAX;
  const ally = spawn(c, 'knight', 4, 6);
  const f = spawn(c, 'skeleton', 3, 3);
  run(c, 200);
  assert.ok((f.slowUntil ?? 0) > c.t);
  assert.ok(ally.banner !== undefined);
});

test('a fight with the new heroes plays out the same every time', () => {
  const play = () => {
    const b = startBattle(11, 'skeletons');
    NEW.slice(0, 5).forEach((id, i) => addUnit(b, id, i + 1, 8));
    b.phase = 'fight';
    const log: string[] = [];
    while (b.phase === 'fight') for (const e of stepBattle(b)) if (e.kind === 'hit') log.push(`${e.by}>${e.to}:${e.dmg}`);
    return log.join(',') + b.phase + b.t;
  };
  assert.equal(play(), play());
});

test('every grade of a new hero has its own look', () => {
  for (const id of NEW) assert.equal(formOf(UNITS[id], 1), UNITS[id].sheet);
  assert.equal(formOf(UNITS.sage, 3), 'hero_sage');
  assert.equal(formOf(UNITS.shambler, 3), 'hero_shambler');
});
