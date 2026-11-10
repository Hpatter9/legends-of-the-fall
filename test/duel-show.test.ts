// DUEL-SHOW (docs/notes/duel-show.md, `src/duelShowRules.ts`): the duel made a show. Where the crowd stands, the walk-in's way and time,
// the one tug-of-war bar, the crowd's moods and shouts; and the duel's length stretched without changing who wins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, hurt, startBattle } from '../src/sim/battle';
import { DUEL_LENGTH, duelMs, duelShare } from '../src/sim/duel';
import { DUEL_MS } from '../src/sim/duelRing';
import { enraged, SIG } from '../src/sim/bossAttacks';
import { clockWords, duelWords } from '../src/duelRules';
import { tileAt } from '../src/sim/board';
import { bigSwing, crowdSpots, endMoods, hitMoods, hopOf, shoutFor, SHOUTS, tugLeader, tugPoint, walkAt, walkFrom, WALK_IN } from '../src/duelShowRules';

const flat = () => bareBoard(startBattle(5)).board;

test('the crowd stands just outside the ring on its own side, facing in, never twice on a tile, the same every time', () => {
  const board = flat();
  const ring = { mid: { u: 4, v: 5 }, r: 2 };
  const c = crowdSpots(board, ring, 4, 5);
  assert.equal(c.heroes.length, 4);
  assert.equal(c.foes.length, 5);
  const all = [...c.heroes, ...c.foes];
  assert.equal(new Set(all.map((s) => `${s.u},${s.v}`)).size, all.length, 'one to a tile');
  for (const s of all) assert.ok(Math.abs(s.u - ring.mid.u) > ring.r || Math.abs(s.v - ring.mid.v) > ring.r, 'outside the ring');
  // (the party on the champion's side (+v), the wave on the nemesis's (-v); the first of each at the middle of the row past the edge)
  for (const s of c.heroes) assert.ok(s.v > ring.mid.v, 'the party on the near side');
  for (const s of c.foes) assert.ok(s.v < ring.mid.v, 'the wave on the far side');
  assert.deepEqual(c.heroes[0], { u: 4, v: 8, facing: 3 }, 'the first hero just past the edge, in the middle, facing in (-v)');
  assert.deepEqual(c.foes[0], { u: 4, v: 2, facing: 1 }, 'the first foe likewise, facing +v');
  assert.deepEqual(crowdSpots(board, ring, 4, 5), c, 'the same every time');
  // (the columns the two walk in along are left open on their sides)
  const lanes = crowdSpots(board, ring, 9, 9, { heroes: 4, foes: 3 });
  assert.ok(!lanes.heroes.some((s) => s.u === 4 && s.v > ring.mid.v + ring.r), 'the champion’s lane is clear');
  assert.ok(!lanes.foes.some((s) => s.u === 3 && s.v < ring.mid.v - ring.r), 'the nemesis’s lane is clear');
});

test('the crowd keeps to standing ground and takes fewer places when the board runs out', () => {
  const board = flat();
  const ring = { mid: { u: 4, v: 5 }, r: 2 };
  // (the row past the near edge turned to deep water: the party stands further out)
  for (let u = 0; u < board.w; u++) tileAt(board, u, 8)!.ground = 'deep';
  const c = crowdSpots(board, ring, 3, 0);
  assert.equal(c.heroes.length, 3);
  for (const s of c.heroes) assert.ok(tileAt(board, s.u, s.v)!.ground !== 'deep' && s.v !== 8);
  // (a ring against the board's far edge has no row past it: the foes stand on the flanks, or not at all)
  const edge = crowdSpots(flat(), { mid: { u: 4, v: 2 }, r: 2 }, 0, 40);
  assert.ok(edge.foes.length < 40);
  for (const s of edge.foes) assert.ok(s.v >= 0 && s.v < 2 + 2 + 1);
});

test('the walk-in: from past the ring on each side, eased to a stop, then the beat; with reduced motion no walk, only a shorter beat', () => {
  assert.deepEqual(walkFrom({ u: 4, v: 7 }, true), { u: 4, v: 7 + WALK_IN.FROM });
  assert.deepEqual(walkFrom({ u: 4, v: 3 }, false), { u: 4, v: 3 - WALK_IN.FROM });
  assert.deepEqual(walkAt(0), { p: 0, beat: false, done: false });
  const mid = walkAt(WALK_IN.WALK_MS / 2);
  assert.ok(mid.p > 0.5 && mid.p < 1, 'eased: past halfway at half time');
  assert.deepEqual(walkAt(WALK_IN.WALK_MS + 10), { p: 1, beat: true, done: false });
  assert.equal(walkAt(WALK_IN.WALK_MS + WALK_IN.BEAT_MS).done, true);
  assert.deepEqual(walkAt(0, true), { p: 1, beat: true, done: false });
  assert.equal(walkAt(WALK_IN.STILL_BEAT_MS, true).done, true);
});

test('one tug-of-war bar: even at the start, green ahead as the champion leads, red as the nemesis does, all one colour at a fall', () => {
  const full = { hp: 100, maxHp: 100 };
  assert.equal(tugPoint(full, { hp: 500, maxHp: 500 }), 0.5, 'shares, not raw health');
  assert.equal(tugLeader(0.5), 'even');
  const ahead = tugPoint(full, { hp: 250, maxHp: 500 });
  assert.ok(ahead > 0.5 && tugLeader(ahead) === 'hero');
  const behind = tugPoint({ hp: 20, maxHp: 100 }, full);
  assert.ok(behind < 0.5 && tugLeader(behind) === 'nem');
  assert.equal(tugPoint(full, { hp: 0, maxHp: 500 }), 1);
  assert.equal(tugPoint({ hp: 0, maxHp: 100 }, full), 0);
  assert.equal(tugPoint({ hp: 0, maxHp: 100 }, { hp: 0, maxHp: 100 }), 0.5);
  // (overhealed or below nothing reads as whole or none)
  assert.equal(tugPoint({ hp: 150, maxHp: 100 }, full), 0.5);
  assert.ok(bigSwing(0.5, 0.6) && bigSwing(0.6, 0.5) && !bigSwing(0.5, 0.55));
});

test('the crowd’s moods: a big blow is cheered by its side and groaned at by the other; the end erupts and slumps', () => {
  const champion = 7;
  assert.equal(hitMoods({ by: 7, to: 9, dmg: 5 }, champion, { maxHp: 1000 }), null, 'a small blow goes by');
  assert.deepEqual(hitMoods({ by: 7, to: 9, dmg: 100 }, champion, { maxHp: 1000 }), { heroes: 'cheer', foes: 'groan' });
  assert.deepEqual(hitMoods({ by: 9, to: 7, dmg: 100 }, champion, { maxHp: 1000 }), { heroes: 'groan', foes: 'cheer' });
  assert.deepEqual(endMoods('won'), { heroes: 'erupt', foes: 'slump' });
  assert.deepEqual(endMoods('lost'), { heroes: 'slump', foes: 'erupt' });
  assert.deepEqual(endMoods('timeout'), { heroes: 'groan', foes: 'cheer' });
  // (an eruption jumps higher than a cheer, a slump sinks, and reduced motion keeps everyone on the ground)
  const peak = (m: Parameters<typeof hopOf>[0]) => Math.max(...Array.from({ length: 400 }, (_, i) => hopOf(m, i * 5, 3)));
  assert.ok(peak('erupt') > peak('cheer') && peak('cheer') > 0);
  assert.ok(hopOf('slump', 100, 3) < 0);
  assert.equal(Math.max(...Array.from({ length: 50 }, (_, i) => hopOf('erupt', i * 40, 3, true))), 0);
  // (each shout is short, and the same for the same moment)
  for (const list of Object.values(SHOUTS)) for (const s of list) assert.ok(s.length <= 16, s);
  assert.equal(shoutFor('cheer', 42), shoutFor('cheer', 42));
});

test('a longer duel: every blow in the ring lands softer, only in a duel; its clock runs longer; a boss’s rage comes later in it', () => {
  // (the measured stretch, docs/notes/duel-show.md: about 2.2 times as long, two and a half minutes on the clock)
  assert.equal(DUEL_LENGTH.soften, 2.2);
  assert.equal(duelMs(), DUEL_MS * 2.5);
  assert.equal(clockWords(duelMs()), 'two and a half minutes');
  const b = bareBoard(startBattle(9));
  b.units = [];
  const champ = addUnit(b, 'knight', 3, 6);
  const foe = addUnit(b, 'orcGrunt', 3, 4);
  const plain = structuredClone(b);
  b.duel = { hero: champ.id, nem: foe.id, id: 1, mid: { u: 3, v: 5 }, r: 2, soften: DUEL_LENGTH.soften };
  const before = foe.hp;
  hurt(b, champ, foe, 220, false, false, [], 'skill');
  const pf = plain.units.find((u) => u.id === foe.id)!;
  hurt(plain, plain.units.find((u) => u.id === champ.id)!, pf, 220, false, false, [], 'skill');
  const inRing = before - foe.hp;
  const outside = before - pf.hp;
  assert.ok(outside > 0);
  assert.ok(Math.abs(inRing - Math.round(outside / DUEL_LENGTH.soften)) <= 1, `${inRing} in the ring against ${outside} outside`);
  // (a boss's great blows: its rage comes after RAGE_MS outside a duel, that many times later in one)
  const st = { born: 0, next: 0, i: 0, turns: 0 };
  plain.t = b.t = SIG.RAGE_MS;
  assert.equal(enraged(plain, st), true);
  assert.equal(enraged(b, st), false);
  b.t = Math.ceil(SIG.RAGE_MS * DUEL_LENGTH.soften);
  assert.equal(enraged(b, st), true);
  // (the nemesis's trim is part of its share, and the card's words follow the clock)
  assert.ok(Math.abs(duelShare('knight').hp - 0.18 * (DUEL_LENGTH.nemHp ?? 1)) < 1e-9);
  const words = duelWords({ wave: 3, id: 1, why: 'dread', kind: 'archer' } as never, { id: 1, name: 'Hask', base: 'orcGrunt', rank: 'captain', might: 2, scars: 0, weak: [] } as never);
  assert.match(words.time, /^After two and a half minutes/);
  assert.equal(clockWords(60_000), 'sixty seconds');
  assert.equal(clockWords(120_000), 'two minutes');
  assert.equal(clockWords(135_000), '2:15');
});
