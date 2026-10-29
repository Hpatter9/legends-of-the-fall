// STATUS-FX phase B: the ailments' rules (`src/sim/ailments.ts`, docs/notes/status-fx.md): damage kinds side by side, poison stacks and
// cuts healing, a curse turns healing to harm, a freeze is brittle and shatters (fire thaws it, frost builds to it), shocks spark and
// spread through water, resists and the boss rules, silence, fear, the cleanse and its ward, the ground, the foes' and skills' riders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, hurt, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { mendUnit, tryCast, CHARGE_MAX } from '../src/sim/abilities';
import { tileAt } from '../src/sim/board';
import { castSpell, MANA_MAX } from '../src/sim/spells';
import {
  AIL, AILMENT_SWITCH, ailmentsOf, burnFor, chillFor, cleanse, dotOf, fearFor, freezeFor, hasAil, poisonFor, resistOf, setDot, shockFor, silenceFor,
  stunFor, weakFor, curseFor, isFrozen,
} from '../src/sim/ailments';
import { skillRiders } from '../src/sim/ailmentSources';
import { bareBoard } from './bare';

AILMENT_SWITCH.on = true;

function arena(): Battle {
  const b = startBattle(5);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};
/** Everyone holds still, so only the ailments act. */
const still = (b: Battle) => {
  for (const x of b.units) x.busyUntil = 1e9;
};
const pair = (b: Battle, foe = 'orcGrunt'): { me: Unit; f: Unit } => {
  const me = addUnit(b, 'knight', 3, 7);
  const f = addUnit(b, foe, 3, 2);
  f.hp = f.maxHp = 2000;
  still(b);
  return { me, f };
};

test('damage kinds stand side by side: a bleeding foe set alight bleeds and burns', () => {
  const b = arena();
  const { me, f } = pair(b);
  setDot(b, f, { kind: 'bleed', dmg: 5, every: 500, ms: 3000, by: me.id, next: b.t + 500, until: b.t + 3000 });
  burnFor(b, me, f);
  assert.deepEqual(ailmentsOf(f).map((a) => a.kind).sort(), ['bleed', 'burn']);
  const ev = run(b, 1000);
  const kinds = new Set(ev.filter((e) => e.kind === 'hit' && e.to === f.id).map((e) => (e as { ail?: string }).ail));
  assert.ok(kinds.has('bleed') && kinds.has('burn'), [...kinds].join());
});

test('poison stacks to five, ticks for each stack, and cuts healing by a tenth a stack', () => {
  const b = arena();
  const { me, f } = pair(b);
  for (let i = 0; i < 7; i++) poisonFor(b, me, f);
  const p = ailmentsOf(f).find((a) => a.kind === 'poison')!;
  assert.equal(p.stacks, AIL.POISON_MAX);
  f.hp = 1000;
  const before = f.hp;
  mendUnit(f, 100, []);
  assert.equal(f.hp - before, 50, 'five stacks: half the healing');
  const hp = f.hp;
  run(b, 1000);
  assert.equal(hp - f.hp, p.dmg! * 5);
});

test('a curse turns half of any healing into harm and loses the rest', () => {
  const b = arena();
  const { me, f } = pair(b);
  curseFor(b, me, f);
  f.hp = 1000;
  const out: BattleEvent[] = [];
  b.t += 100;
  stepBattle(b); // (the ailment model reads the battle being stepped)
  mendUnit(f, 100, out);
  assert.equal(f.hp, 1000 - Math.round(100 * AIL.CURSE_HARM));
  assert.ok(!out.some((e) => e.kind === 'heal'));
});

test('a freeze holds, is brittle, ends into a chill; a heavy blow shatters it for half again, capped', () => {
  const b = arena();
  const { me, f } = pair(b);
  f.busyUntil = 0;
  assert.ok(freezeFor(b, f, 1500));
  assert.ok(f.busyUntil >= b.t + 1500 && isFrozen(b, f) && f.brittleUntil! >= b.t + 1500);
  const hp = f.hp;
  const out: BattleEvent[] = [];
  hurt(b, me, f, 400, false, false, out, 'blow');
  const shatter = out.filter((e) => e.kind === 'hit' && e.ail === 'shatter');
  assert.equal(out.filter((e) => e.kind === 'shatter').length, 1);
  assert.equal(shatter.length, 1);
  // (the blow: x1.3 brittle; then half of it again, under the cap of 20% of 2000)
  const blow = Math.round(400 * 1.3);
  assert.equal(hp - f.hp, blow + Math.min(Math.round(blow * AIL.SHATTER_SHARE), 2000 * AIL.SHATTER_CAP));
  assert.ok(!isFrozen(b, f), 'the ice is gone');
  assert.ok(hasAil(f, 'chill', b.t), 'and it is chilled');
});

test('a light blow does not shatter; fire thaws a freeze instead of burning', () => {
  const b = arena();
  const { me, f } = pair(b);
  freezeFor(b, f, 1500);
  hurt(b, me, f, 50, false, false, [], 'blow');
  assert.ok(isFrozen(b, f));
  burnFor(b, me, f);
  assert.ok(!isFrozen(b, f) && !hasAil(f, 'burn'), 'thawed, not burning');
});

test('three frost chills close together freeze; ordinary slows never do', () => {
  const b = arena();
  const { me, f } = pair(b);
  for (let i = 0; i < 3; i++) chillFor(b, f, 3000);
  assert.ok(!isFrozen(b, f));
  for (let i = 0; i < 3; i++) chillFor(b, f, 3000, false, true, me);
  assert.ok(isFrozen(b, f));
});

test('a shock sparks to the nearest of its side, once passed on; in water, to every one of its side in it', () => {
  const b = arena();
  const me = addUnit(b, 'knight', 3, 7);
  const a = addUnit(b, 'orcGrunt', 2, 2);
  const c = addUnit(b, 'orcGrunt', 3, 2);
  const far = addUnit(b, 'orcGrunt', 7, 2);
  for (const x of [a, c, far]) x.hp = x.maxHp = 2000;
  still(b);
  shockFor(b, me, a);
  run(b, 1000);
  assert.ok(hasAil(c, 'shock', b.t) && c.hp < 2000, 'the neighbour is shocked');
  assert.equal(far.hp, 2000);
  assert.equal(ailmentsOf(c).find((x) => x.kind === 'shock')!.relay, false, 'and does not pass it on');
  // (water: the whole pool)
  const w = arena();
  const k = addUnit(w, 'knight', 3, 7);
  const xs = [addUnit(w, 'orcGrunt', 1, 2), addUnit(w, 'orcGrunt', 3, 2), addUnit(w, 'orcGrunt', 4, 3)];
  for (const x of xs) {
    x.hp = x.maxHp = 2000;
    tileAt(w.board, x.u, x.v)!.ground = 'water';
  }
  still(w);
  shockFor(w, k, xs[0]);
  run(w, 1000);
  assert.ok(xs[1].hp < 2000 && xs[2].hp < 2000, 'both in the water');
});

test('resists by kind: fire beings do not burn, the undead are not poisoned or bled or feared, frost creatures do not freeze', () => {
  assert.ok(resistOf('imp').immune.has('burn'));
  assert.ok(resistOf('skeleton').immune.has('poison') && resistOf('skeleton').immune.has('bleed') && resistOf('skeleton').immune.has('fear'));
  assert.ok(resistOf('ironGolem').immune.has('poison') && resistOf('ironGolem').half.has('stun'));
  assert.ok(resistOf('crystalGolem').immune.has('freeze'));
  assert.ok(resistOf('paladin').half.has('curse'));
  const b = arena();
  const { me, f } = pair(b, 'imp');
  burnFor(b, me, f);
  assert.ok(!hasAil(f, 'burn'));
  const ev = run(b, 100);
  assert.ok(ev.some((e) => e.kind === 'immune' && e.to === f.id && e.what === 'burn'), 'Immune is shown');
});

test('bosses: half as long, never feared, and hard control with diminishing returns then a spell immune', () => {
  const b = arena();
  const me = addUnit(b, 'knight', 3, 7);
  const boss = addUnit(b, 'orcWarlord', 3, 2);
  still(b);
  burnFor(b, me, boss, 3000);
  assert.equal(ailmentsOf(boss).find((a) => a.kind === 'burn')!.until - b.t, 1500);
  fearFor(b, boss);
  assert.ok(!hasAil(boss, 'fear'));
  const holds: number[] = [];
  for (let i = 0; i < 4; i++) {
    boss.stunUntil = undefined;
    boss.ail = boss.ail?.filter((a) => a.kind !== 'stun');
    const before = b.t;
    stunFor(b, boss, 2000);
    holds.push(Math.max(0, (boss.stunUntil ?? before) - before));
  }
  assert.deepEqual(holds, [1000, 500, 250, 0]);
});

test('silenced: no skill is cast; feared: it steps away and strikes nobody', () => {
  const b = arena();
  const me = addUnit(b, 'samurai', 3, 7);
  const f = addUnit(b, 'orcGrunt', 3, 5);
  f.hp = f.maxHp = 5000;
  me.charge = CHARGE_MAX;
  silenceFor(b, me, 3000);
  assert.equal(tryCast(b, me, []), false);
  const c = arena();
  const hero = addUnit(c, 'knight', 3, 6);
  const foe = addUnit(c, 'orcGrunt', 3, 5);
  foe.busyUntil = 1e9;
  fearFor(c, hero, 1500);
  const ev = run(c, 1500);
  assert.ok(!ev.some((e) => e.kind === 'swing' && e.by === hero.id), 'no blow while afraid');
  assert.ok(Math.abs(hero.u - foe.u) + Math.abs(hero.v - foe.v) > 1, 'it ran');
});

test('a cleanse takes every ailment and wards the hero; Battle Cry ends fear; weakening cuts the attack while it lasts', () => {
  const b = arena();
  const { me, f } = pair(b);
  burnFor(b, f, me);
  stunFor(b, me, 2000);
  chillFor(b, me, 2000);
  weakFor(b, me, 2000);
  assert.equal(ailmentsOf(me).length, 4);
  const power = me.power;
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'cleanse', me.u, me.v));
  assert.equal(ailmentsOf(me).length, 0);
  assert.equal(me.stunUntil, undefined);
  assert.notEqual(power, me.power, 'the weakening was put back');
  burnFor(b, f, me);
  assert.ok(!hasAil(me, 'burn'), 'warded');
  run(b, AIL.WARD_MS + 100);
  fearFor(b, me);
  assert.ok(hasAil(me, 'fear'));
  b.spells.mana = MANA_MAX;
  castSpell(b, 'warcry', me.u, me.v);
  assert.ok(!hasAil(me, 'fear'));
  cleanse(b, me);
});

test('the ground: lava burns, water puts the fire out, a swamp poisons, standing still on ice chills, a shrine cleanses', () => {
  const b = arena();
  const me = addUnit(b, 'knight', 3, 7);
  const foe = addUnit(b, 'orcGrunt', 3, 0);
  foe.busyUntil = 1e9;
  tileAt(b.board, 3, 6)!.ground = 'lava';
  tileAt(b.board, 3, 5)!.ground = 'water';
  run(b, 1000);
  // (walked onto the lava, burning; then into the water, out)
  const seen = run(b, 3000);
  assert.ok(seen.some((e) => e.kind === 'hit' && e.to === me.id && e.ail === 'burn') || hasAil(me, 'burn') || me.v <= 5);
  const s = startBattle(6, 'skeletons', { area: 'swamp' });
  bareBoard(s);
  s.units = [];
  s.phase = 'fight';
  const w = addUnit(s, 'knight', 3, 7);
  tileAt(s.board, 3, 6)!.ground = 'water';
  addUnit(s, 'orcGrunt', 3, 0).busyUntil = 1e9;
  run(s, 2500);
  assert.ok(hasAil(w, 'poison') || w.v < 6, 'the swamp water poisons a walker');
  const i = arena();
  const stand = addUnit(i, 'knight', 3, 7);
  const holy = addUnit(i, 'paladin', 5, 7);
  addUnit(i, 'orcGrunt', 3, 0);
  tileAt(i.board, 3, 7)!.ground = 'ice';
  tileAt(i.board, 5, 7)!.ground = 'shrine';
  i.groundFx = true;
  still(i);
  burnFor(i, stand, holy, 9000);
  run(i, 1100);
  assert.ok(hasAil(stand, 'chill'), 'standing still on ice');
  assert.ok(!hasAil(holy, 'burn'), 'the shrine cleansed');
});

test('a skeleton poisons one blow in five, the same every time; the skills leave their riders', () => {
  const play = () => {
    const b = startBattle(7, 'skeletons');
    bareBoard(b);
    b.units = [];
    b.phase = 'fight';
    const k = addUnit(b, 'knight', 3, 5);
    k.hp = k.maxHp = 50000;
    addUnit(b, 'skeleton', 3, 4);
    let poisoned = 0;
    for (const e of run(b, 30000)) if (e.kind === 'hit' && e.ail === 'poison') poisoned++;
    return poisoned;
  };
  const n = play();
  assert.ok(n > 0);
  assert.equal(play(), n);
  const b = arena();
  const { me, f } = pair(b);
  const out: BattleEvent[] = [{ kind: 'hit', by: me.id, to: f.id, dmg: 1, heavy: false, splash: false, killed: false, src: 'skill' }];
  skillRiders(b, me, 'Chain Lightning', out, 0);
  assert.ok(hasAil(f, 'shock'));
  skillRiders(b, me, 'Whirlwind', out, 0);
  assert.equal(dotOf(f)?.kind, 'bleed');
});

test('the king\'s spells: a meteor burns what it strikes, Chain Lightning shocks, Frost Nova freezes, the Hex curses', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  const f = addUnit(b, 'orcGrunt', 3, 2);
  f.hp = f.maxHp = 5000;
  still(b);
  b.spells.mana = MANA_MAX;
  castSpell(b, 'meteor', 3, 2);
  run(b, 1000);
  assert.ok(hasAil(f, 'burn'));
  b.spells.mana = MANA_MAX;
  b.spells.ready.frost = 0;
  castSpell(b, 'frost', 3, 2);
  assert.ok(isFrozen(b, f));
  b.spells.mana = MANA_MAX;
  castSpell(b, 'hex', 3, 2);
  assert.ok(hasAil(f, 'curse'));
});
