import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tileAt } from '../src/sim/board';
import { addUnit, canStrike, fight, stepBattle, startBattle, shotReach, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, afterBlow, onStrike, rollCrit, tickStatus } from '../src/sim/abilities';
import { acAgainst } from '../src/sim/blow';
import { UNITS } from '../src/sim/units';
import { readyBattle } from './helpers';
import { HERO_KITS, resMax } from '../src/sim/heroKits';
import { dotOf } from '../src/sim/ailments';
import { REST } from '../src/sim/statRest';

// (these stage each old kit's written numbers in a fixed arena: the pools by score and the AI's flank and kite, STATS batch 6, are held off
// here and staged in `test/stats-rest.test.ts`)
REST.pools = false;
REST.flank = false;
REST.kite = false;

/** A hero's pool after one cast of its skill 1 from a full pool (COMBAT-002: a skill costs its pool, it no longer empties a charge meter). */
const paidOnce = (kind: string): number => {
  const k = HERO_KITS()[kind];
  return CHARGE_MAX - (k.s1.cost / resMax(k.pool)) * CHARGE_MAX;
};

/** A flat, empty board mid-fight, for setting up one rule at a time. */
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
  for (const end = b.t + ms; b.t < end; ) out.push(...stepBattle(b));
  return out;
};

test('every hero has a skill and a passive', () => {
  for (const id of ['knight', 'samurai', 'kunoichi', 'archer', 'wizard']) {
    const k = KITS[id];
    assert.ok(k.skill.name && k.passive.name, id);
    assert.equal(k.skill.need, CHARGE_MAX);
  }
});

test('charge fills from blows dealt, blows taken and time, and stops at full (a foe\'s skill meter; a hero has a pool, test/hero-kits.test.ts)', () => {
  const b = arena();
  const boss = spawn(b, 'orcWarlord', 3, 4);
  const knight = spawn(b, 'knight', 3, 5);
  const k = KITS.orcWarlord.skill;
  onStrike(b, boss, knight, 10, 'blow', false, []);
  assert.equal(boss.charge, k.dealt);
  onStrike(b, knight, boss, 10, 'blow', false, []);
  assert.equal(boss.charge, k.dealt + k.taken);
  onStrike(b, boss, knight, 10, 'blow', true, []);
  assert.equal(boss.charge, k.dealt + k.taken, 'a splash blow does not charge');
  const before = boss.charge;
  tickStatus(b, []);
  assert.ok(boss.charge > before, 'time charges');
  boss.charge = 99.9;
  tickStatus(b, []);
  assert.equal(boss.charge, CHARGE_MAX);
});

test('Shield Wall: nearby foes are drawn to the knight, and he takes half damage', () => {
  const b = arena();
  const knight = spawn(b, 'knight', 3, 5, CHARGE_MAX);
  const ally = spawn(b, 'samurai', 5, 5);
  const near = spawn(b, 'skeleton', 3, 3);
  const nearer = spawn(b, 'skeleton', 5, 4);
  const far = spawn(b, 'skeleton', 0, 0);
  ally.hp = 1; // the weakest, and so the foes' pick, without the draw
  const ev = stepBattle(b);
  assert.ok(ev.some((e) => e.kind === 'skill' && e.name === 'Shield Wall'));
  assert.equal(knight.charge, paidOnce('knight'));
  assert.equal(near.taunt?.to, knight.id);
  assert.equal(nearer.taunt?.to, knight.id);
  assert.equal(far.taunt, undefined, 'out of the draw');
  assert.ok(knight.guardUntil! > b.t);
  const out: BattleEvent[] = [];
  const full = onStrike(arena(), near, spawn(arena(), 'knight', 1, 1), 100, 'skill', false, out);
  assert.equal(full, 100);
  assert.equal(onStrike(b, near, knight, 100, 'skill', false, out), 50, 'guarded');
  // the drawn foe goes for the knight, not the nearly dead samurai beside its pal
  const swings = run(b, 1500).filter((e) => e.kind === 'swing' && e.by === nearer.id);
  assert.ok(swings.length && swings.every((e) => e.kind === 'swing' && e.to === knight.id));
  b.t += 5000;
  assert.equal(onStrike(b, near, knight, 100, 'skill', false, out), 100, 'the guard lapses');
});

test('Stout Shield: a blow from the front loses a quarter, one from behind does not', () => {
  const b = arena();
  const knight = spawn(b, 'knight', 3, 5); // faces -v
  const front = spawn(b, 'skeleton', 3, 4);
  const back = spawn(b, 'skeleton', 3, 6);
  assert.equal(onStrike(b, front, knight, 100, 'blow', false, []), 75);
  assert.equal(onStrike(b, back, knight, 100, 'blow', false, []), 100);
});

test('Iaido: dashes along a line, cuts every foe on it and lands on the last free tile', () => {
  const b = arena();
  const sam = spawn(b, 'samurai', 0, 4, CHARGE_MAX);
  const a = spawn(b, 'skeleton', 1, 4);
  const c = spawn(b, 'skeleton', 2, 4);
  const off = spawn(b, 'skeleton', 0, 7);
  const ev = stepBattle(b);
  assert.ok(ev.some((e) => e.kind === 'dash' && e.by === sam.id));
  assert.deepEqual([sam.u, sam.v], [4, 4], 'the last free tile of the four');
  assert.ok(a.hp < a.maxHp && c.hp < c.maxHp);
  assert.equal(off.hp, off.maxHp);
  assert.equal(sam.charge, paidOnce('samurai'));
  assert.equal(sam.facing, 0);
});

test('Iaido holds its charge while no foe is in a line', () => {
  const b = arena();
  const sam = spawn(b, 'samurai', 0, 4, CHARGE_MAX);
  spawn(b, 'skeleton', 3, 7);
  const ev = stepBattle(b);
  assert.ok(!ev.some((e) => e.kind === 'skill'));
  assert.equal(sam.charge, CHARGE_MAX);
});

test('Shadow Step: slips behind the weakest foe and backstabs it', () => {
  const b = arena();
  const nin = spawn(b, 'kunoichi', 0, 8, CHARGE_MAX);
  const strong = spawn(b, 'skeleton', 5, 5);
  const weak = spawn(b, 'spearman', 3, 2); // faces +v, so behind it is v = 1
  weak.hp = 100;
  const ev = stepBattle(b);
  assert.ok(ev.some((e) => e.kind === 'blink' && e.by === nin.id));
  assert.deepEqual([nin.u, nin.v], [3, 1]);
  assert.equal(strong.hp, strong.maxHp);
  const hit = ev.find((e) => e.kind === 'hit' && e.to === weak.id);
  assert.ok(hit && hit.kind === 'hit' && hit.src === 'skill' && hit.heavy);
  // (a backstab is twice a plain blow and more, at the skill's strength: its kit's `tune`)
  assert.ok(weak.hp < 100 - (UNITS.kunoichi.atk * HERO_KITS().kunoichi.s1.tune - UNITS.spearman.def) * 2, 'a backstab is no plain blow');
  assert.equal(nin.facing, 1);
});

test('Evasion: the kunoichi\u2019s fifth of blows slipped is Armour Class (STATS batch 4, 7% a point); a blow that reaches it lands, and so does a skill', () => {
  const b = arena();
  const nin = spawn(b, 'kunoichi', 3, 5);
  const skel = spawn(b, 'skeleton', 3, 4);
  assert.ok(Math.abs(acAgainst(b, nin, 0, 0, false).cover - 0.2 / 0.07) < 1e-5);
  for (let i = 0; i < 100; i++) assert.notEqual(onStrike(b, skel, nin, 50, 'blow', false, []), null);
  assert.equal(onStrike(b, skel, nin, 50, 'skill', false, []), 50, 'a skill cannot be slipped');
});

test('Volley: arrows land a moment later on every foe in the 3x3, and only there', () => {
  const b = arena();
  const archer = spawn(b, 'archer', 3, 8, CHARGE_MAX);
  const a = spawn(b, 'skeleton', 3, 4);
  const c = spawn(b, 'skeleton', 4, 5);
  const d = spawn(b, 'skeleton', 2, 3);
  const out = spawn(b, 'skeleton', 0, 0);
  for (const f of [a, c, d, out]) f.busyUntil = 1e9; // (hold them still)
  const first = stepBattle(b);
  const paid = archer.charge;
  assert.ok(first.some((e) => e.kind === 'area' && e.id === 'volley'));
  assert.ok(!first.some((e) => e.kind === 'hit'), 'nothing lands yet');
  const later = run(b, 800).filter((e) => e.kind === 'hit' && e.src === 'skill');
  const hurt = new Set(later.map((e) => (e.kind === 'hit' ? e.to : 0)));
  assert.ok(hurt.has(a.id) || hurt.has(c.id));
  assert.ok(!hurt.has(out.id));
  assert.equal(hurt.size, [a, c, d].filter((f) => f.hp < f.maxHp).length);
  assert.ok(Math.abs(paid - paidOnce('archer')) < 1, 'the volley was paid for');
});

test('Eagle Eye: the archer reaches twice as far for its height', () => {
  assert.equal(shotReach(4, 2, 0, 1.4), 6);
  assert.equal(shotReach(4, 2, 0), 5);
  const b = arena();
  tileAt(b.board, 3, 8)!.h = 1;
  assert.ok(canStrike(b.board, UNITS.archer, { u: 3, v: 8 }, { u: 3, v: 3 }), 'one step up: five tiles');
  assert.ok(!canStrike(b.board, UNITS.archer, { u: 3, v: 8 }, { u: 3, v: 2 }));
  assert.ok(!canStrike(b.board, UNITS.wizard, { u: 3, v: 8 }, { u: 3, v: 4 }), 'the wizard keeps the plain rate');
});

test('Meteor: a delayed blast on a 3x3 that leaves the ground burning for a while', () => {
  const b = arena();
  const wiz = spawn(b, 'wizard', 3, 8, CHARGE_MAX);
  const a = spawn(b, 'skeleton', 3, 4);
  const c = spawn(b, 'skeleton', 3, 3);
  const out = spawn(b, 'skeleton', 0, 0);
  for (const f of [a, c, out]) (f.busyUntil = 1e9), (f.hp = f.maxHp = 2000);
  const first = stepBattle(b);
  assert.ok(first.some((e) => e.kind === 'area' && e.id === 'meteor' && e.u === 3));
  assert.equal(wiz.charge, paidOnce('wizard'));
  const land = run(b, 1200);
  const struck = land.filter((e) => e.kind === 'hit' && e.src === 'skill' && e.heavy);
  assert.deepEqual(new Set(struck.map((e) => (e.kind === 'hit' ? e.to : 0))), new Set([a.id, c.id]));
  assert.ok(land.some((e) => e.kind === 'zone'));
  assert.equal(b.zones.length, 1);
  const hpAfterBlast = a.hp;
  const burn = run(b, 1500).filter((e) => e.kind === 'hit' && e.src === 'dot');
  assert.ok(burn.length >= 4, 'it burns every half second');
  assert.ok(a.hp < hpAfterBlast);
  assert.equal(out.hp, 2000, 'outside the 3x3 is untouched');
  run(b, 4000);
  assert.equal(b.zones.length, 0, 'the fire dies down');
});

test('Keen Edge: about one blow in seven crits, and a crit makes the foe bleed', () => {
  const b = arena();
  const sam = spawn(b, 'samurai', 3, 5);
  // (an orc, not a skeleton: the undead do not bleed, STATUS-FX)
  const skel = spawn(b, 'orcGrunt', 3, 4);
  let crits = 0;
  for (let i = 0; i < 1000; i++) if (rollCrit(b, sam) > 1) crits++;
  assert.ok(crits > 110 && crits < 190, `crits ${crits}`);
  assert.equal(rollCrit(b, skel), 1, 'foes have no passive');
  skel.hp = skel.maxHp = 500;
  afterBlow(b, sam, skel, true);
  assert.equal(dotOf(skel)?.kind, 'bleed');
  run(b, 3200);
  assert.ok(skel.hp < 500 - 4 * 4, 'bled for its full time');
  assert.equal(dotOf(skel), undefined);
  afterBlow(b, sam, skel, false);
  assert.equal(dotOf(skel), undefined, 'no crit, no bleed');
});

test('Cinders: the wizard\'s blows set the foe alight', () => {
  const b = arena();
  const wiz = spawn(b, 'wizard', 3, 8);
  const skel = spawn(b, 'skeleton', 3, 4);
  afterBlow(b, wiz, skel, false);
  assert.equal(dotOf(skel)?.kind, 'burn');
});

test('in the plain five-hero fights every hero casts its skill', () => {
  const casts = new Map<string, number>();
  for (let seed = 1; seed <= 10; seed++) {
    const b = readyBattle(seed);
    fight(b);
    while (b.phase === 'fight')
      for (const e of stepBattle(b)) if (e.kind === 'skill') casts.set(b.units.find((x) => x.id === e.by)!.def, (casts.get(b.units.find((x) => x.id === e.by)!.def) ?? 0) + 1);
  }
  for (const id of ['knight', 'samurai', 'kunoichi', 'archer', 'wizard']) assert.ok((casts.get(id) ?? 0) > 0, `${id} never cast`);
});
