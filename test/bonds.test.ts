// DEPTH-BUILD (docs/notes/depth-build.md): hero bonds and rivalries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOND, KINDRED, RIVALS, SETTLE_WINS, bondCover, bondKey, bondLevel, bondSnapshot, levelOf, noteBonds, readBonds, startBonds, tickBonds, bondLines, type BondMeta } from '../src/sim/bonds';
import { atkOf, fight, stepBattle, type Battle } from '../src/sim/battle';
import { ALL_HEROES } from '../src/sim/units';
import { loadMeta, newMeta } from '../src/sim/meta';
import { readyBattle } from './helpers';

const won = (kinds: string[]) => ({ units: kinds.map((def, id) => ({ id, def, side: 'hero', alive: true })) as never });

test('the kindred and rival pairs name real heroes, never overlap, and there are about forty and fifteen', () => {
  assert.ok(KINDRED.length >= 40 && RIVALS.length === 15);
  for (const k of [...KINDRED, ...RIVALS]) {
    const [a, b] = k.split('|');
    assert.ok(ALL_HEROES.includes(a) && ALL_HEROES.includes(b) && a < b, k);
  }
  assert.equal(new Set(KINDRED).size, KINDRED.length);
  assert.ok(!RIVALS.some((k) => KINDRED.includes(k)));
  assert.equal(bondKey('peasant', 'knight'), 'knight|peasant', 'the key is order-free');
});

test('a point only for a won wave with both placed; any pair to Comrades, kindred pairs beyond', () => {
  const m: BondMeta = {};
  noteBonds(m, won(['knight', 'peasant', 'archer']), false);
  assert.equal(m.bonds, undefined, 'a loss gives nothing');
  const n = noteBonds(m, won(['knight', 'peasant', 'archer']), true);
  assert.deepEqual(m.bonds, { 'archer|knight': 1, 'archer|peasant': 1, 'knight|peasant': 1 });
  assert.equal(n.ups.length, 0);
  assert.equal(bondLevel(9, true), 0);
  assert.equal(bondLevel(10, true), 1);
  assert.equal(bondLevel(600, true), 5);
  assert.equal(bondLevel(600, false), 2, 'a pair that is not kindred stops at Comrades');
  (m.bonds as Record<string, number>)['knight|peasant'] = 39;
  const up = noteBonds(m, won(['knight', 'peasant']), true);
  assert.deepEqual(up.ups, [{ key: 'knight|peasant', from: 1, to: 2 }]);
  assert.deepEqual(bondLines(up, (k) => k), ['knight and peasant: Acquainted → Comrades']);
});

test('rivals settle into a kindred pair at bond level 1 after ten wins together', () => {
  const m: BondMeta = {};
  const key = bondKey('wizard', 'warlock');
  assert.equal(bondSnapshot(m)[key], -1);
  for (let i = 0; i < SETTLE_WINS - 1; i++) noteBonds(m, won(['wizard', 'warlock']), true);
  assert.equal(levelOf(m, key), 0);
  const n = noteBonds(m, won(['wizard', 'warlock']), true);
  assert.deepEqual(n.settled, [key]);
  assert.equal(levelOf(m, key), 1);
  assert.equal(bondSnapshot(m)[key], 1);
});

function pairFight(snap: Record<string, number>): { b: Battle; x: ReturnType<typeof find>; y: ReturnType<typeof find> } {
  const b = readyBattle(6, 'skeletons', { bonds: snap });
  const heroes = b.units.filter((u) => u.side === 'hero');
  // (two of the placed heroes, side by side)
  heroes[0].def = 'knight';
  heroes[1].def = 'peasant';
  fight(b);
  return { b, x: find(b, heroes[0].id), y: find(b, heroes[1].id) };
}
const find = (b: Battle, id: number) => b.units.find((u) => u.id === id)!;

test('Comrades guard (blows 3% lighter) within two tiles, no attack; Shieldmates attack and quicker skills; nothing beyond two tiles', () => {
  const { b, x, y } = pairFight({ 'knight|peasant': 2 });
  assert.equal(b.bonds?.length, 1);
  const base = atkOf({ ...x, bondAtk: 1 });
  y.u = x.u + 1;
  y.v = x.v;
  tickBonds(b);
  assert.equal(atkOf(x), base, 'no attack from Comrades');
  assert.ok(Math.abs(x.bondGuard! - (1 - BOND.GUARD2)) < 1e-9);
  y.u = x.u + 3;
  tickBonds(b);
  assert.equal(x.bondGuard, 1);
  const s = pairFight({ 'knight|peasant': 4 });
  s.y.u = s.x.u;
  s.y.v = s.x.v + 1;
  tickBonds(s.b);
  assert.ok(Math.abs(s.x.bondAtk! - (1 + BOND.ATK4)) < 1e-9);
  assert.ok(Math.abs(s.x.bondCd! - (1 - BOND.CHARGE4)) < 1e-9);
});

test('rivals charge 10% slower within two tiles', () => {
  const { b, x, y } = pairFight({ 'knight|peasant': -1 });
  y.u = x.u + 1;
  y.v = x.v;
  tickBonds(b);
  assert.ok(Math.abs(x.bondCd! - 1.1) < 1e-9 && x.bondAtk === 1);
});

test('a sworn partner covers once a wave (when the cover is on: it is off since the measure)', () => {
  const shipped = BOND.COVER;
  BOND.COVER = 0.2;
  const { b, x, y } = pairFight({ 'knight|peasant': 3 });
  y.u = x.u + 1;
  y.v = x.v;
  const was = y.hp;
  const left = bondCover(b, x, x.hp + 10);
  assert.equal(was - y.hp, Math.round((x.hp + 10) * BOND.COVER));
  assert.equal(left, x.hp + 10 - (was - y.hp));
  assert.equal(bondCover(b, x, x.hp + 10), x.hp + 10, 'once a wave');
  BOND.COVER = shipped;
  assert.equal(bondCover(pairFight({ 'knight|peasant': 3 }).b, x, x.hp + 10), x.hp + 10, 'off as shipped');
});

test('the same seed with the same bonds plays the same, and old saves have none', () => {
  const run = () => {
    const { b } = pairFight({ 'knight|peasant': 4 });
    let n = 0;
    while (b.phase === 'fight' && n++ < 2000) stepBattle(b);
    return JSON.stringify(b.units.map((u) => [u.u, u.v, u.hp]));
  };
  assert.equal(run(), run());
  const m0 = newMeta(1);
  assert.equal(loadMeta(1, { getItem: () => JSON.stringify(m0) }).bonds, undefined);
  assert.deepEqual(readBonds({ 'knight|peasant': 4, 'peasant|knight': 9, 'nobody|knight': 2, 'archer|knight': 0 }), { 'knight|peasant': 4 });
  startBonds(readyBattle(1), undefined);
});

import { BOND_SCENES, bondScenesDue, bondSceneId } from '../src/sim/bondScenes';
import { SCENES } from '../src/sim/sceneScripts';
import { dueScene } from '../src/sim/sceneRules';

test('the bond scenes: every kindred pair at level 1 and every rivalry settled, real heroes and backdrops, due once the pair reaches it', () => {
  assert.equal(BOND_SCENES.length, 65);
  // (every kindred pair and every rivalry has its first scene)
  for (const k of [...KINDRED, ...RIVALS]) assert.ok(BOND_SCENES.some((x) => x.moment.kind === 'bond' && x.moment.pair === k && x.moment.level === 1), k);
  for (const s of BOND_SCENES) {
    assert.ok(s.moment.kind === 'bond' && (KINDRED.includes(s.moment.pair) || (RIVALS.includes(s.moment.pair) && s.moment.level === 1)), s.id);
    assert.ok(SCENES[s.id], 'in the scenes list');
    const lines = s.shots.flatMap((x) => x.lines ?? []);
    assert.ok(lines.length >= 3 && lines.length <= 6, s.id);
  }
  const m = { ...newMeta(1), bonds: { 'knight|peasant': 9 } };
  const seen = new Set<string>();
  assert.deepEqual(bondScenesDue(m, (id) => seen.has(id)), []);
  m.bonds['knight|peasant'] = 10;
  const id = bondSceneId('knight|peasant', 1);
  assert.deepEqual(bondScenesDue(m, (x) => seen.has(x)), [id]);
  assert.equal(dueScene(m, { kind: 'bond', pair: 'knight|peasant', level: 1 }), id);
  seen.add(id);
  assert.deepEqual(bondScenesDue(m, (x) => seen.has(x)), []);
});

test('a hero takes its best bond only: bonds do not stack across partners', () => {
  const b = readyBattle(6, 'skeletons', { bonds: { 'knight|peasant': 4, 'archer|knight': 2 } });
  const heroes = b.units.filter((u) => u.side === 'hero');
  heroes[0].def = 'knight';
  heroes[1].def = 'peasant';
  heroes[2].def = 'archer';
  fight(b);
  const [k, p, a] = heroes.map((h) => b.units.find((u) => u.id === h.id)!);
  p.u = k.u + 1;
  p.v = k.v;
  a.u = k.u;
  a.v = k.v + 1;
  tickBonds(b);
  assert.ok(Math.abs(k.bondAtk! - (1 + BOND.ATK4)) < 1e-9, 'the best, not both multiplied');
  assert.equal(a.bondAtk, 1, 'a Comrade pair adds no attack');
  assert.ok(Math.abs(a.bondGuard! - (1 - BOND.GUARD2)) < 1e-9);
});

import { SPAR, settleSparring, startSparring } from '../src/sim/bonds';

test('the Sparring Yard: one pair at a time, eight hours for five points, only with the room', () => {
  const m = { unlocked: ['knight', 'peasant', 'archer'] } as { unlocked: string[]; bonds?: Record<string, number>; sparring?: { a: string; b: string; doneAt: number } };
  assert.equal(startSparring(m, 'knight', 'peasant', 0, false), false, 'no room');
  assert.ok(startSparring(m, 'knight', 'peasant', 0, true));
  assert.equal(startSparring(m, 'knight', 'archer', 0, true), false, 'one pair at a time');
  assert.equal(settleSparring(m, SPAR.MS - 1), null);
  settleSparring(m, SPAR.MS);
  assert.equal(m.bonds!['knight|peasant'], SPAR.POINTS);
  assert.equal(m.sparring, undefined);
});

test('a rivalry\'s scene waits until it settles, then is due', () => {
  const key = bondKey('wizard', 'warlock');
  const m = { ...newMeta(1), bonds: { [key]: 9 } } as ReturnType<typeof newMeta> & { bonds: Record<string, number> };
  assert.deepEqual(bondScenesDue(m, () => false).filter((id) => id.includes(key)), [], 'rivals still');
  noteBonds(m, won(['wizard', 'warlock']), true);
  assert.deepEqual(bondScenesDue(m, () => false).filter((id) => id.includes(key)), [bondSceneId(key, 1)], 'settled: its scene is due');
});

test('a pair\'s level-3 scene comes once it is Sworn, and only for a kindred pair', () => {
  const m = { ...newMeta(1), bonds: { 'knight|peasant': 119 } } as ReturnType<typeof newMeta> & { bonds: Record<string, number> };
  const seen = new Set([bondSceneId('knight|peasant', 1)]);
  assert.deepEqual(bondScenesDue(m, (x) => seen.has(x)).filter((x) => x.includes('knight|peasant')), []);
  m.bonds['knight|peasant'] = 120;
  assert.deepEqual(bondScenesDue(m, (x) => seen.has(x)).filter((x) => x.includes('knight|peasant')), [bondSceneId('knight|peasant', 3)]);
});
