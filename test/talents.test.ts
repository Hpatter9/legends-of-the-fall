import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { apart, fight, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { afterBlow, KITS, onKill, onStrike, rageOf, tal } from '../src/sim/abilities';
import { firedCount } from '../src/sim/equipFx';
import { ABILITIES, emptyStats, equipItem, grantEquipment, type EquipStats } from '../src/sim/equipment';
import { loadMeta, startedMeta, saveMeta } from '../src/sim/meta';
import { xpFor, levelOfKind } from '../src/sim/levels';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import {
  FULL_TREE_POINTS, LEVEL_POINT_EVERY, MAX_SHARD_POINTS, RESPEC_BASE, RESPEC_PER_POINT, SHARD_POINT_COST, TAL_KEYS, TALENT_ABILITIES, TREES, boughtOf, buyPoint, canBuyPoint, canLearn, heroStats, learn,
  levelPoints, nodeOf, picksOf, pointsEarned, pointsFree, pointsSpent, respec, respecCost, talentStats, tierNodes, whyNot,
} from '../src/sim/talents';
import { EQUIP_ICONS } from '../src/equipArt';

const stats = (p: Partial<EquipStats>): EquipStats => ({ ...emptyStats(), ...p });
/** A meta with `kind` unlocked, at `level` (by its XP) and with `shards` shards. */
function metaAt(kind: string, level: number, shards = 0) {
  const m = startedMeta(5);
  if (!m.unlocked.includes(kind)) m.unlocked.push(kind);
  m.xp[kind] = xpFor(level);
  m.shards[kind] = shards;
  return m;
}
/** Take a whole tree (all four of the first row, the first of each pair), whatever it costs. */
function takeAll(kind: string) {
  const m = metaAt(kind, 20, 9);
  while (buyPoint(m, kind));
  for (const t of [1, 2, 3] as const) for (const n of tierNodes(kind, t)) learn(m, kind, n.id);
  return m;
}

// ---- the trees ----

test('every hero has a tree of eight nodes in three tiers, with icons, words and known modifiers', () => {
  const known = new Set(Object.keys(TAL_KEYS));
  const used = new Set<string>();
  for (const kind of ALL_HEROES) {
    const t = TREES[kind];
    assert.ok(t, kind);
    assert.deepEqual([1, 2, 3].map((tier) => tierNodes(kind, tier as 1 | 2 | 3).length), [4, 2, 2], kind);
    assert.equal(new Set(t.nodes.map((n) => n.id)).size, 8);
    assert.equal(new Set(t.nodes.map((n) => n.name)).size, 8, `${kind} names`);
    for (const n of t.nodes) {
      assert.ok(n.id.startsWith(`${kind}:`));
      assert.ok(n.name.length > 2 && n.text.length > 5, n.id);
      assert.ok(existsSync(`src/art/equip/${n.icon}.png`) && EQUIP_ICONS[n.icon], `${n.id} icon ${n.icon}`);
      assert.ok(!/\b(armor|color|center|defense|favor)\b/i.test(`${n.name} ${n.text}`), `British spelling: ${n.id}`);
      if (n.tier === 1) assert.ok(n.stats && !n.tal && !n.abilities, `${n.id} is a stat node`);
      else assert.ok(n.tal || n.abilities || n.stats, `${n.id} does something`);
      for (const k of Object.keys(n.tal ?? {})) (assert.ok(known.has(k), `${n.id} key ${k}`), used.add(k));
      for (const id of n.abilities ?? []) {
        const a = TALENT_ABILITIES[id];
        assert.ok(a, id);
        assert.ok(ABILITIES[id] === undefined, 'a talent ability is not one of the equipment\'s');
      }
    }
    // (the stat nodes are small)
    const sum = (k: 'hp' | 'atk') => t.nodes.reduce((s, n) => s + (n.stats?.[k] ?? 0), 0);
    assert.ok(sum('hp') <= 0.2 && sum('atk') <= 0.2, kind);
  }
  assert.equal(TALENT_ABILITIES.nope, undefined);
  // (every modifier key is used by some tree)
  for (const k of known) assert.ok(used.has(k), `key ${k} unused`);
  assert.equal(FULL_TREE_POINTS, 9);
});

test('a skill-changing node in each tier-2 pair, and the capstones of the heroes with an ultimate reach it', () => {
  for (const kind of ALL_HEROES) {
    for (const n of tierNodes(kind, 2)) assert.ok(n.tal, `${n.id} changes the skill`);
    if (KITS[kind].ultimate) assert.ok(tierNodes(kind, 3).some((n) => n.tal?.ultRate || n.tal?.ultPow || n.tal?.dur), `${kind} capstone`);
  }
});

// ---- points ----

test('points come from levels and from shards', () => {
  assert.equal(LEVEL_POINT_EVERY, 3);
  assert.deepEqual([1, 2, 3, 5, 6, 12, 18, 20].map(levelPoints), [0, 0, 1, 1, 2, 4, 6, 6]);
  const m = metaAt('knight', 6);
  assert.equal(levelOfKind(m, 'knight'), 6);
  assert.equal(pointsEarned(m, 'knight'), 2);
  assert.equal(pointsFree(m, 'knight'), 2);
  // shards: three buy a point, up to three points, and the rank is not touched
  assert.equal(canBuyPoint(m, 'knight'), false);
  m.shards.knight = 2 * SHARD_POINT_COST + 1;
  assert.ok(buyPoint(m, 'knight') && buyPoint(m, 'knight'));
  assert.equal(buyPoint(m, 'knight'), false);
  assert.equal(boughtOf(m, 'knight'), 2);
  assert.equal(pointsEarned(m, 'knight'), 4);
  assert.equal(m.shards.knight, 7);
  m.shards.knight = 99;
  assert.ok(buyPoint(m, 'knight'));
  assert.equal(buyPoint(m, 'knight'), false);
  assert.equal(boughtOf(m, 'knight'), MAX_SHARD_POINTS);
  // (a level 20 hero with every shard point can take a whole tree)
  assert.ok(levelPoints(20) + MAX_SHARD_POINTS >= FULL_TREE_POINTS);
  // (a locked hero cannot buy)
  const fresh = startedMeta(1);
  fresh.shards.kitsune = 30;
  assert.equal(canBuyPoint(fresh, 'kitsune'), false);
});

test('a node costs its tier, and the tiers open in turn', () => {
  const m = metaAt('knight', 20, 9);
  while (buyPoint(m, 'knight'));
  assert.equal(pointsFree(m, 'knight'), 9);
  // tier 2 and 3 are shut at first
  assert.match(whyNot(m, 'knight', 'knight:2a')!, /first row/);
  assert.match(whyNot(m, 'knight', 'knight:3a')!, /second row/);
  assert.ok(learn(m, 'knight', 'knight:1a'));
  assert.equal(learn(m, 'knight', 'knight:1a'), false, 'not twice');
  assert.equal(learn(m, 'knight', 'knight:2a'), false, 'one of the first row is not enough');
  assert.ok(learn(m, 'knight', 'knight:1b'));
  assert.equal(pointsSpent(m, 'knight'), 2);
  assert.ok(learn(m, 'knight', 'knight:2a'));
  assert.equal(pointsSpent(m, 'knight'), 4);
  assert.ok(learn(m, 'knight', 'knight:3b'));
  assert.equal(pointsSpent(m, 'knight'), 7);
  assert.equal(pointsFree(m, 'knight'), 2);
  assert.ok(learn(m, 'knight', 'knight:1c') && learn(m, 'knight', 'knight:1d'));
  assert.equal(pointsFree(m, 'knight'), 0);
  assert.deepEqual(picksOf(m, 'knight').length, 6);
  // a tight budget stops a node
  const poor = metaAt('knight', 3);
  assert.ok(learn(poor, 'knight', 'knight:1a'));
  assert.match(whyNot(poor, 'knight', 'knight:1b')!, /point/);
  assert.equal(learn(startedMeta(1), 'kitsune', 'kitsune:1a'), false, 'a locked hero');
  assert.equal(learn(metaAt('knight', 20), 'knight', 'samurai:1a'), false, 'a node of another hero');
});

test('the two of a pair are exclusive', () => {
  for (const kind of ['knight', 'wizard', 'gorgon']) {
    const m = metaAt(kind, 20, 9);
    while (buyPoint(m, kind));
    learn(m, kind, `${kind}:1a`);
    learn(m, kind, `${kind}:1b`);
    for (const tier of [2, 3]) {
      const [a, b] = tierNodes(kind, tier as 2 | 3);
      assert.ok(learn(m, kind, a.id), a.id);
      assert.equal(canLearn(m, kind, b.id), false);
      assert.match(whyNot(m, kind, b.id)!, /other/);
      assert.equal(learn(m, kind, b.id), false);
    }
  }
});

test('a respec costs crowns and gives every point back', () => {
  const m = takeAll('knight');
  assert.equal(pointsFree(m, 'knight'), 0);
  const spent = pointsSpent(m, 'knight');
  assert.equal(spent, 9);
  assert.equal(respecCost(m, 'knight'), RESPEC_BASE + RESPEC_PER_POINT * spent);
  // too poor: nothing changes
  m.crowns = respecCost(m, 'knight') - 1;
  assert.equal(respec(m, 'knight'), false);
  assert.equal(picksOf(m, 'knight').length, 6);
  m.crowns = 1000;
  assert.ok(respec(m, 'knight'));
  assert.equal(m.crowns, 1000 - (RESPEC_BASE + RESPEC_PER_POINT * spent));
  assert.equal(picksOf(m, 'knight').length, 0);
  // (the points are back, including the bought ones, and the other pair member can now be chosen)
  assert.equal(pointsFree(m, 'knight'), 9);
  assert.equal(boughtOf(m, 'knight'), MAX_SHARD_POINTS);
  assert.equal(respecCost(m, 'knight'), 0);
  assert.equal(respec(m, 'knight'), false, 'nothing to respec');
  learn(m, 'knight', 'knight:1a');
  learn(m, 'knight', 'knight:1b');
  assert.ok(learn(m, 'knight', 'knight:2b'));
});

// ---- saves ----

test('old saves load with no talents, and a damaged one keeps only what is legal', () => {
  const m = startedMeta(9);
  const old = JSON.parse(JSON.stringify(m));
  delete old.talents;
  const store = { getItem: () => JSON.stringify(old) };
  const loaded = loadMeta(1, store);
  assert.deepEqual(loaded.talents, {});
  for (const k of ALL_HEROES) assert.equal(talentStats(loaded, k), undefined);
  // a round trip keeps the picks
  const mine = metaAt('knight', 9, 3);
  buyPoint(mine, 'knight');
  learn(mine, 'knight', 'knight:1a');
  learn(mine, 'knight', 'knight:1b');
  learn(mine, 'knight', 'knight:2a');
  let saved = '';
  saveMeta(mine, { setItem: (_k, v) => (saved = v) });
  const back = loadMeta(1, { getItem: () => saved });
  assert.deepEqual(back.talents!.knight, { picks: ['knight:1a', 'knight:1b', 'knight:2a'], bought: 1 });
  // a damaged save: unknown kinds and ids, repeats, both of a pair, a tier before its turn, and more than the points allow
  const bad = JSON.parse(saved);
  bad.talents = {
    ghost: { picks: ['ghost:1a'], bought: 1 },
    knight: { picks: ['knight:3a', 'knight:1a', 'knight:1a', 'knight:1b', 'knight:2a', 'knight:2b', 'nope', 7, 'knight:1c', 'knight:1d', 'knight:3b'], bought: 9 },
    samurai: 'what',
  };
  const fixed = loadMeta(1, { getItem: () => JSON.stringify(bad) });
  assert.deepEqual(Object.keys(fixed.talents!), ['knight']);
  assert.equal(fixed.talents!.knight.bought, 1, 'only the shards it has');
  assert.ok(pointsFree(fixed, 'knight') >= 0);
  assert.ok(!fixed.talents!.knight.picks.includes('knight:2b') && !fixed.talents!.knight.picks.includes('knight:3a'));
  assert.ok(fixed.talents!.knight.picks.includes('knight:1a'));
  assert.equal(new Set(fixed.talents!.knight.picks).size, fixed.talents!.knight.picks.length);
});

// ---- a fight ----

/** The hero on the deploy row with `eq`, three skeletons moved to `distance` tiles from it, the fight begun. */
function arena(kind: string, eq: EquipStats | undefined, distance = 1, o: { hp?: number; seed?: number } = {}): { b: Battle; hero: Unit; foes: Unit[] } {
  const b = startBattle(o.seed ?? 3, ['skeleton', 'skeleton', 'skeleton']);
  const row = D - DEPLOY_ROWS + 1;
  let u0 = 0;
  while (!standable(tileAt(b.board, u0, row))) u0++;
  place(b, kind, u0, row, 1, { equip: eq, hp: o.hp ?? 6 });
  const hero = b.units.find((x) => x.tag === 1)!;
  const foes = b.units.filter((x) => x.side === 'foe');
  const free: [number, number][] = [];
  for (let v = 0; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v)) && apart({ u, v }, hero) === distance && !(u === hero.u && v === hero.v)) free.push([u, v]);
  assert.ok(free.length >= 3, 'room for the foes');
  free.sort((x, y) => x[1] - y[1] || x[0] - y[0]);
  foes.forEach((f, i) => ([f.u, f.v] = free[i]));
  // (the foes have the strength to last, and stand still a while)
  for (const f of foes) (f.maxHp = f.hp = 5000), (f.busyUntil = 4000);
  fight(b);
  return { b, hero, foes };
}
/** Fill the hero's charge, step until its skill goes off (or `ticks` pass), and say what it did. */
function castOnce(a: { b: Battle; hero: Unit }, o: { ult?: boolean; ticks?: number } = {}): { events: BattleEvent[]; cast: boolean } {
  if (o.ult) a.hero.charge2 = 100;
  else a.hero.charge = 100;
  const events: BattleEvent[] = [];
  for (let i = 0; i < (o.ticks ?? 25) && !events.some((e) => e.kind === 'skill' && e.by === a.hero.id); i++) events.push(...stepBattle(a.b));
  return { events, cast: events.some((e) => e.kind === 'skill' && e.by === a.hero.id) };
}
const skillDamage = (events: BattleEvent[], by: Unit) => events.filter((e) => e.kind === 'hit' && e.by === by.id && e.src === 'skill').reduce((n, e) => n + (e as { dmg: number }).dmg, 0);
const withTal = (t: Record<string, number>, o: Partial<EquipStats> = {}) => stats({ tal: t, ...o });

test('pow lifts what a skill deals (and ultPow only the ultimate)', () => {
  const dmg = (t: Record<string, number>, ult = false) => {
    const a = arena('barbarian', withTal(t), 1);
    return skillDamage(castOnce(a, { ult }).events, a.hero);
  };
  assert.ok(dmg({}) > 0);
  assert.ok(dmg({ pow: 0.5 }) > dmg({}) * 1.3);
  assert.equal(dmg({ ultPow: 0.9 }), dmg({}), 'a skill without an ultimate ignores ultPow');
  const ult = (t: Record<string, number>) => {
    const a = arena('yamabushi', withTal(t), 1);
    return skillDamage(castOnce(a, { ult: true }).events, a.hero);
  };
  assert.ok(ult({ ultPow: 0.5 }) > ult({}) * 1.3);
  // (the hero's attack is as it was afterwards)
  const a = arena('barbarian', withTal({ pow: 0.5 }), 1);
  const before = a.hero.power;
  castOnce(a);
  assert.ok(Math.abs((a.hero.power ?? 1) - (before ?? 1)) < 1e-9);
});

test('dur makes what a skill does last longer', () => {
  const guard = (t: Record<string, number>) => {
    const a = arena('knight', withTal(t), 2);
    assert.ok(castOnce(a).cast);
    return { guard: a.hero.guardUntil! - a.b.t, taunt: a.foes[0].taunt!.until - a.b.t };
  };
  assert.ok(guard({ dur: 0.5 }).guard >= guard({}).guard + 1800);
  assert.ok(guard({ dur: 0.5 }).taunt >= guard({}).taunt + 1800);
  // a stun, a charm, a curse, a song, a banner
  const stun = (t: Record<string, number>) => {
    const a = arena('gorgon', withTal(t), 3);
    castOnce(a);
    return Math.max(...a.foes.map((f) => f.stunUntil ?? 0)) - a.b.t;
  };
  assert.ok(stun({ dur: 0.6 }) > stun({}) + 1000);
  const hex = (t: Record<string, number>) => {
    const a = arena('warlock', withTal(t), 2);
    castOnce(a);
    return Math.max(...a.foes.map((f) => f.dot?.until ?? 0)) - a.b.t;
  };
  assert.ok(hex({ dur: 0.6 }) > hex({}) + 2000);
});

test('reach lets a skill find foes further off', () => {
  const casts = (kind: string, t: Record<string, number>, distance: number) => castOnce(arena(kind, withTal(t), distance), { ticks: 1 }).cast;
  assert.equal(casts('knight', {}, 5), false, 'knight');
  assert.equal(casts('knight', { reach: 2 }, 5), true, 'knight reach');
  assert.equal(casts('kitsune', {}, 6), false, 'kitsune');
  assert.equal(casts('kitsune', { reach: 2 }, 6), true, 'kitsune reach');
  assert.equal(casts('yamabushi', {}, 3), false, 'yamabushi');
  assert.equal(casts('yamabushi', { reach: 1 }, 3), true, 'yamabushi reach');
  // a whirlwind covers the 5x5 with it
  const swept = (t: Record<string, number>) => {
    const a = arena('barbarian', withTal(t), 2);
    return castOnce(a).events.filter((e) => e.kind === 'hit' && e.src === 'skill').length;
  };
  assert.ok(swept({ reach: 1 }) > swept({}));
});

test('extra adds a strike, a jump, a trap, a treant, a second volley or meteor', () => {
  const hits = (kind: string, t: Record<string, number>, distance = 1) => {
    const a = arena(kind, withTal(t), distance);
    const first = castOnce(a).events;
    // (let the volleys land)
    for (let i = 0; i < 40; i++) first.push(...stepBattle(a.b));
    return first.filter((e) => e.kind === 'hit' && e.by === a.hero.id && e.src === 'skill').length;
  };
  assert.equal(hits('ninjaMonk', { extra: 1 }), hits('ninjaMonk', {}) + 1);
  assert.ok(hits('lightningMage', { extra: 2 }, 2) >= hits('lightningMage', {}, 2));
  assert.ok(hits('archer', { extra: 1 }, 3) > hits('archer', {}, 3));
  assert.ok(hits('wizard', { extra: 1 }, 3) > hits('wizard', {}, 3));
  const traps = (t: Record<string, number>) => {
    const a = arena('ranger', withTal(t), 3);
    castOnce(a);
    return a.b.traps?.length ?? 0;
  };
  assert.equal(traps({}), 2);
  assert.equal(traps({ extra: 1 }), 3);
  const treants = (t: Record<string, number>) => {
    const a = arena('druid', withTal(t), 3);
    castOnce(a);
    a.hero.charge = 100;
    a.hero.busyUntil = 0;
    for (let i = 0; i < 30; i++) stepBattle(a.b);
    return a.b.units.filter((x) => x.def === 'treant' && x.alive).length;
  };
  assert.equal(treants({}), 1);
  assert.equal(treants({ extra: 1 }), 2);
});

test('what a cast gives the hero: healing, a shield, haste and charge back', () => {
  const after = (t: Record<string, number>) => {
    const a = arena('knight', withTal(t), 2);
    a.hero.hp = Math.round(a.hero.maxHp * 0.5);
    const hp = a.hero.hp;
    castOnce(a);
    return { a, hp };
  };
  const heal = after({ castHeal: 0.2 });
  assert.ok(heal.a.hero.hp > heal.hp + heal.a.hero.maxHp * 0.15);
  assert.equal(after({}).a.hero.shield, undefined);
  assert.ok(after({ castShield: 0.25 }).a.hero.shield!.hp > 0);
  assert.ok(after({ castHaste: 3000 }).a.hero.hasteUntil! > after({}).a.b.t + 2000);
  assert.ok(after({ refund: 40 }).a.hero.charge >= 40);
  assert.ok(after({}).a.hero.charge < 20);
});

test('skillSlow and skillStun hold what a skill hits', () => {
  const state = (t: Record<string, number>) => {
    const a = arena('barbarian', withTal(t), 1);
    castOnce(a);
    return { slow: Math.max(...a.foes.map((f) => f.slowUntil ?? 0)) - a.b.t, stun: Math.max(...a.foes.map((f) => f.stunUntil ?? 0)) - a.b.t };
  };
  assert.ok(state({ skillSlow: 2000 }).slow > 1000);
  assert.ok(state({}).slow < 0);
  assert.ok(state({ skillStun: 900 }).stun > 400);
  assert.ok(state({}).stun < 0);
});

test('ultRate fills the ultimate faster', () => {
  const fill = (t: Record<string, number>) => {
    const a = arena('kitsune', withTal(t), 6);
    for (let i = 0; i < 100; i++) stepBattle(a.b);
    return a.hero.charge2 ?? 0;
  };
  assert.ok(fill({ ultRate: 0.6 }) > fill({}) * 1.4);
});

test('the passive changes: block, thorns, huddle, leech, rage and the kill frenzy', () => {
  // the foe hits from the front: the hero faces it
  const duel = (kind: string, t: Record<string, number>) => {
    const a = arena(kind, withTal(t), 1);
    const foe = a.foes[0];
    a.hero.facing = (wayToward(a.hero, foe) + 0) % 4;
    return { ...a, foe };
  };
  const wayToward = (from: Unit, to: Unit) => (Math.abs(to.u - from.u) > Math.abs(to.v - from.v) ? (to.u > from.u ? 0 : 2) : to.v > from.v ? 1 : 3);
  const taken = (t: Record<string, number>) => {
    const d = duel('samurai', t);
    return onStrike(d.b, d.foe, d.hero, 100, 'blow', false, [])!;
  };
  assert.ok(taken({ block: 0.3 }) < taken({}) - 20);
  const thorned = (t: Record<string, number>) => {
    const d = duel('samurai', t);
    const hp = d.foe.hp;
    onStrike(d.b, d.foe, d.hero, 100, 'blow', false, []);
    return hp - d.foe.hp;
  };
  assert.equal(thorned({}), 0);
  assert.ok(thorned({ thorns: 0.3 }) > 20);
  // (an ally on the tile beside it)
  const withAlly = (t: Record<string, number>) => {
    const d = duel('samurai', t);
    const friend = d.b.units.find((x) => x.side === 'foe' && x !== d.foe)!;
    friend.side = 'hero';
    friend.u = d.hero.u + 1;
    friend.v = d.hero.v;
    return onStrike(d.b, d.foe, d.hero, 100, 'skill', false, [])!;
  };
  assert.ok(withAlly({ huddle: 0.1 }) < withAlly({}));
  const leeched = (t: Record<string, number>) => {
    const d = duel('samurai', t);
    d.hero.hp = 50;
    afterBlow(d.b, d.hero, d.foe, false, 100, []);
    return d.hero.hp - 50;
  };
  assert.equal(leeched({}), 0);
  assert.ok(leeched({ leech: 0.2 }) >= 20);
  const hero = arena('samurai', withTal({ rage: 0.5 }), 1).hero;
  assert.equal(rageOf(hero), 1);
  hero.hp = Math.round(hero.maxHp / 2);
  assert.ok(Math.abs(rageOf(hero) - 1.25) < 0.01);
  const frenzy = (t: Record<string, number>) => {
    const a = arena('werewolf', withTal(t), 1);
    for (let i = 0; i < 6; i++) onKill(a.b, a.hero, []);
    return a.hero.frenzy!.n;
  };
  assert.equal(frenzy({}), 3);
  assert.equal(frenzy({ frenzyMax: 2 }), 5);
  assert.equal(tal(hero, 'rage'), 0.5);
  assert.equal(tal(arena('samurai', undefined, 1).hero, 'rage'), 0);
});

/** The abilities the capstones use each go off in a small fight on the hero that has them. */
test('every capstone ability fires', () => {
  const ids = Object.keys(TALENT_ABILITIES);
  assert.ok(ids.length >= 25);
  for (const id of ids) {
    const a = TALENT_ABILITIES[id];
    let fired = 0;
    for (const seed of [3, 4, 5, 6]) {
      const eq = stats({ abilities: [{ id, name: a.name, s: 1 }] });
      // (a knight with about 76 hp: low enough to be hurt past its threshold, tough enough to live through the hit that does it)
      if (a.trig === 'low' || a.trig === 'death') eq.hp = -(1 - 76 / UNITS.knight.hp);
      else eq.hp = 2;
      if (['hit', 'nth', 'kill', 'crit'].includes(a.trig)) eq.atk = 2;
      if (a.trig === 'crit') eq.crit = 1;
      const b = startBattle(seed, 'skeletons', a.trig === 'low' || a.trig === 'death' ? { foes: { atk: 1.6 } } : {});
      const row = D - DEPLOY_ROWS;
      const spots: number[] = [];
      for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, row))) spots.push(u);
      place(b, 'knight', spots[0], row, 1, { equip: eq });
      place(b, 'samurai', spots[1], row, 2, { hp: 2 });
      place(b, 'cleric', spots[2], row, 3, { hp: 2 });
      b.units.find((x) => x.tag === 2)!.hp -= 40;
      fight(b);
      const hero = b.units.find((x) => x.tag === 1)!;
      for (let i = 0; i < 1500 && b.phase === 'fight' && !firedCount(hero, id); i++) stepBattle(b);
      fired += firedCount(hero, id);
      if (fired) break;
    }
    assert.ok(fired > 0, `${id} (${a.trig} ${a.kind}) fires`);
  }
});

// ---- the whole ----

test('heroStats puts the talents and the equipment together, and nothing taken is nothing added', () => {
  const m = metaAt('knight', 20, 9);
  assert.equal(heroStats(m, 'knight'), undefined);
  assert.equal(talentStats(m, 'knight'), undefined);
  while (buyPoint(m, 'knight'));
  learn(m, 'knight', 'knight:1a');
  learn(m, 'knight', 'knight:1b');
  learn(m, 'knight', 'knight:2a');
  learn(m, 'knight', 'knight:3b');
  const t = heroStats(m, 'knight')!;
  assert.equal(t.hp, nodeOf('knight', 'knight:1a')!.stats!.hp);
  assert.equal(t.atk, nodeOf('knight', 'knight:1b')!.stats!.atk);
  assert.deepEqual(t.tal, { dur: 0.5 });
  assert.deepEqual(t.abilities.map((x) => x.id), ['tl_knight_shout']);
  // with a worn sword, both
  const sword = grantEquipment(m, { base: 'ironSword', rarity: 1, level: 1 });
  assert.ok(equipItem(m, 'knight', sword.id));
  const both = heroStats(m, 'knight')!;
  assert.ok(both.atk > t.atk);
  assert.equal(both.hp, t.hp);
  assert.deepEqual(both.tal, { dur: 0.5 });
  assert.equal(both.abilities.length, 1);
  // other heroes are untouched
  assert.equal(heroStats(m, 'samurai'), undefined);
});

test('a hero with talents fights, the same fight twice plays out the same, and a hero without any is unchanged', () => {
  const play = (kind: string, eq: EquipStats | undefined) => {
    const a = arena(kind, eq, 2, { hp: 1.2 });
    const log: string[] = [];
    for (let i = 0; i < 700 && a.b.phase === 'fight'; i++) for (const e of stepBattle(a.b)) log.push(JSON.stringify(e));
    return { log: log.join('|'), t: a.b.t, rng: a.b.rng, skillRng: a.b.skillRng };
  };
  for (const kind of ['knight', 'archer', 'kitsune', 'druid']) {
    const eq = heroStats(takeAll(kind), kind)!;
    const one = play(kind, eq);
    const two = play(kind, heroStats(takeAll(kind), kind));
    assert.deepEqual(one, two, kind);
    assert.ok(one.log.length > 50);
    assert.notEqual(one.log, play(kind, undefined).log, `${kind}: the talents change the fight`);
  }
  // (a hero with no talents and no equipment has no `eq`, as before)
  const plain = arena('knight', heroStats(startedMeta(1), 'knight'), 2);
  assert.equal(plain.hero.eq, undefined);
});

test('a full tree is a modest boost', () => {
  // the sum of its stat nodes, whichever pair is chosen, stays well under an evolution grade (+60%)
  for (const kind of ALL_HEROES) {
    const s = heroStats(takeAll(kind), kind)!;
    assert.ok(s.hp + s.atk <= 0.3, `${kind} ${s.hp} ${s.atk}`);
    assert.ok(s.atkSpeed <= 0.3 && s.crit <= 0.3 && s.dodge <= 0.3, kind);
  }
});
