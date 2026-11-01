import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { blowMult, canPlace, canStrike, fight, place, playOut, shotReach, startBattle, stepBattle, TIME_LIMIT_MS, unplace } from '../src/sim/battle';
import { UNITS } from '../src/sim/units';
import { readyBattle } from './helpers';

test('the foes start on their own rows, five of them', () => {
  const b = startBattle(7);
  const foes = b.units.filter((x) => x.side === 'foe');
  assert.equal(foes.length, 5);
  for (const f of foes) assert.ok(f.v < DEPLOY_ROWS);
});

test('heroes are placed only on their rows, on free standing ground, and before the fight', () => {
  const b = startBattle(7);
  assert.ok(!canPlace(b, 'knight', 0, 0), 'the foes\' rows');
  assert.ok(!canPlace(b, 'skeleton', 0, D - 1), 'a foe is not a hero');
  let u = 0;
  while (!standable(tileAt(b.board, u, D - 1))) u++;
  assert.ok(place(b, 'knight', u, D - 1));
  assert.ok(!canPlace(b, 'samurai', u, D - 1), 'the tile is taken');
  assert.ok(canPlace(b, 'knight', u, D - 1), 'a hero can be put back where it stands');
  for (let i = 0; i < b.board.w; i++) {
    const t = tileAt(b.board, i, D - 2)!;
    assert.equal(canPlace(b, 'samurai', i, D - 2), standable(t));
  }
  // moving a hero keeps one of it
  let w = 0;
  while (!standable(tileAt(b.board, w, D - 2))) w++;
  assert.ok(place(b, 'knight', w, D - 2));
  assert.equal(b.units.filter((x) => x.def === 'knight').length, 1);
  assert.ok(unplace(b, 'knight'));
  assert.ok(!fight(b), 'no fight with nobody placed');
  assert.ok(place(b, 'knight', w, D - 2));
  assert.ok(fight(b));
  assert.ok(!place(b, 'samurai', u, D - 1), 'no placing once the fight is on');
});

test('a fight always ends, with one side gone or the time run out', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const b = readyBattle(seed);
    assert.ok(fight(b));
    playOut(b);
    assert.ok(b.phase === 'won' || b.phase === 'lost');
    const heroes = b.units.some((x) => x.alive && x.side === 'hero');
    const foes = b.units.some((x) => x.alive && x.side === 'foe');
    assert.ok(!heroes || !foes || b.t >= TIME_LIMIT_MS, `seed ${seed}`);
    if (b.phase === 'won') assert.ok(heroes && !foes);
  }
});

test('the same board and placing play out the same', () => {
  const run = () => {
    const b = readyBattle(11);
    fight(b);
    const events = [];
    while (b.phase === 'fight') events.push(...stepBattle(b));
    return { events, t: b.t, phase: b.phase, hp: b.units.map((x) => x.hp) };
  };
  assert.deepEqual(run(), run());
});

test('two fighters never stand on one tile', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const b = readyBattle(seed);
    fight(b);
    while (b.phase === 'fight') {
      stepBattle(b);
      const seen = new Set<string>();
      for (const x of b.units.filter((x) => x.alive)) {
        const k = `${x.u},${x.v}`;
        assert.ok(!seen.has(k), `seed ${seed} at ${b.t}`);
        assert.ok(standable(tileAt(b.board, x.u, x.v)));
        seen.add(k);
      }
    }
  }
});

test('high ground and blows from behind hit harder', () => {
  assert.equal(blowMult(0, 0, 1, 3), 1, 'level, from the front');
  assert.ok(Math.abs(blowMult(2, 0, 1, 3) - 1.3) < 1e-9, 'two steps above');
  assert.ok(Math.abs(blowMult(0, 2, 1, 3) - 0.7) < 1e-9, 'two steps below');
  assert.ok(Math.abs(blowMult(0, 0, 1, 1) - 1.5) < 1e-9, 'from behind');
  assert.ok(Math.abs(blowMult(0, 0, 0, 1) - 1.25) < 1e-9, 'from the side');
  assert.ok(Math.abs(blowMult(5, 0, 1, 3) - 1.45) < 1e-9, 'height counts to three steps');
});

test('the height bonus at each difference from -3 to +3', () => {
  const want = [0.55, 0.7, 0.85, 1, 1.15, 1.3, 1.45];
  for (let d = -3; d <= 3; d++) assert.ok(Math.abs(blowMult(d + 3, 3, 1, 3) - want[d + 3]) < 1e-9, `height ${d}`);
  assert.ok(Math.abs(blowMult(9, 0, 1, 3) - 1.45) < 1e-9, 'capped above');
  assert.ok(Math.abs(blowMult(0, 9, 1, 3) - 0.55) < 1e-9, 'capped below');
});

test('a shooter reaches further from high ground; a sword cannot reach up a cliff', () => {
  assert.equal(shotReach(4, 0, 0), 4);
  assert.equal(shotReach(4, 3, 0), 6);
  assert.equal(shotReach(4, 0, 3), 4);
  const b = startBattle(3);
  bareBoard(b);
  const archer = UNITS.archer;
  assert.ok(!canStrike(b.board, archer, { u: 0, v: 8 }, { u: 0, v: 3 }));
  tileAt(b.board, 0, 8)!.h = 2;
  tileAt(b.board, 0, 7)!.h = 2;
  assert.ok(canStrike(b.board, archer, { u: 0, v: 8 }, { u: 0, v: 3 }), 'five tiles from two steps up');
  const knight = UNITS.knight;
  tileAt(b.board, 1, 4)!.h = 3;
  assert.ok(canStrike(b.board, knight, { u: 0, v: 4 }, { u: 0, v: 5 }));
  assert.ok(!canStrike(b.board, knight, { u: 0, v: 4 }, { u: 1, v: 4 }), 'three steps up');
  assert.ok(!canStrike(b.board, knight, { u: 0, v: 4 }, { u: 0, v: 6 }), 'two tiles off');
  assert.ok(canStrike(b.board, UNITS.spearman, { u: 0, v: 4 }, { u: 0, v: 6 }), 'a spear reaches two');
});

test('the heroes, placed plainly, win about half their fights; alone, a lone hero loses', () => {
  let wins = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const b = readyBattle(seed);
    fight(b);
    if (playOut(b).phase === 'won') wins++;
  }
  assert.ok(wins >= 8 && wins <= 34, `won ${wins} of 40`);
  const b = startBattle(5);
  let u = 0;
  while (!standable(tileAt(b.board, u, D - 1))) u++;
  place(b, 'archer', u, D - 1);
  fight(b);
  assert.equal(playOut(b).phase, 'lost');
});
