// The Calamity's roster, tiers and boards (`docs/notes/cal-roster.md`): a hero is hired once a run, from all 45; a hero's tier follows its run level
// (no merging); the fights are on a board about twice the usual area, with a band to fill it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, AREAS, BASE_AREA, D, DEPLOY_ROWS, makeBoard, standable, tileAt, W } from '../src/sim/board';
import { canPlace, place, startBattle } from '../src/sim/battle';
import { CAL_BOARD, CAL_FOES_MAX, CAL_TIER, fitBand, tierOfLevel } from '../src/sim/calamity';
import { gainRunXp, heroLevel, hireable, hireHero, localBoost, promoteByLevel } from '../src/sim/climb';
import { GRADE_MULT, startStage, saveSlot, loadSlot } from '../src/sim/run';
import { startedMeta } from '../src/sim/meta';
import { calamityRun, towerRun } from '../src/sim/modes';
import { buy, choices, enterNode, finishTower, hire, hireClosed, levelTiers, type MapNode } from '../src/sim/tower';
import { fight, playOut } from '../src/sim/battle';
import { levelBoost, xpFor } from '../src/sim/levels';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { frontSpots } from '../tools/autoplay';

/** Walk to the first node of `kind` the map shows and enter it (the nodes before it are taken without fights). */
function visit(run: ReturnType<typeof calamityRun>, kind: MapNode['kind']): void {
  const t = run.tower!;
  for (let guard = 0; guard < 40; guard++) {
    const hit = choices(run).find((n) => n.kind === kind);
    if (hit) return void assert.ok(enterNode(run, hit.id));
    const step = choices(run)[0];
    t.path.push(step.id);
    t.at = step.id;
    t.here = step.id;
  }
  assert.fail(`no ${kind} node found`);
}

test('a hero is hired once a run: no camp or shop offers a kind the roster has, and a stale offer is refused', () => {
  const m = startedMeta(3);
  const run = calamityRun(21, m, 'knight');
  const seen = new Set<string>();
  for (let floor = 1; floor <= 40; floor++) {
    const probe = calamityRun(21 + floor, m, 'knight');
    visit(probe, 'recruit');
    for (const h of probe.tower!.cur!.hires!) {
      assert.notEqual(h.kind, 'knight', 'the starting hero is not offered again');
      seen.add(h.kind);
    }
    assert.equal(new Set(probe.tower!.cur!.hires!.map((h) => h.kind)).size, probe.tower!.cur!.hires!.length, 'three different kinds');
  }
  assert.ok(seen.size > HEROES.length + 8, `offers range over all the heroes, not just the player's (${seen.size} kinds)`);
  assert.ok([...seen].some((k) => !m.unlocked.includes(k)), 'a hero the player does not own turns up');
  // hiring a kind twice (an offer drawn before the same kind came from the shop) is refused
  run.gold = 9999;
  visit(run, 'recruit');
  const first = run.tower!.cur!.hires![0].kind;
  hireHero(run, first, 0);
  assert.equal(hireClosed(run, first), true);
  assert.equal(hire(run, 0), null, 'closed once the party has the kind');
  assert.ok(!hireable(run).includes(first));
  assert.ok(!hireable(run).includes('knight'));
});

test('the first offer of a camp is a hero the player owns while there is one, and offers are the same each time', () => {
  const m = startedMeta(4);
  m.unlocked = [...HEROES, 'paladin', 'cleric'];
  for (let seed = 1; seed <= 12; seed++) {
    const a = calamityRun(seed, m, 'knight');
    visit(a, 'recruit');
    const b = calamityRun(seed, m, 'knight');
    visit(b, 'recruit');
    assert.deepEqual(a.tower!.cur!.hires, b.tower!.cur!.hires, 'deterministic');
    assert.ok(m.unlocked.includes(a.tower!.cur!.hires![0].kind), 'the first is one of the player\'s own');
  }
});

test('the shop sells a hero the party does not have, and refuses one it got elsewhere', () => {
  const run = calamityRun(31, startedMeta(1), 'archer');
  run.gold = 9999;
  visit(run, 'shop');
  const shop = run.tower!.cur!.shop!;
  const i = shop.findIndex((it) => it.kind === 'hero');
  assert.ok(i >= 0);
  assert.notEqual(shop[i].ref, 'archer');
  hireHero(run, shop[i].ref!, 0);
  assert.equal(buy(run, i), null, 'already in the party');
});

test('the tier follows the run level: 2 at the first level, 3 at the second, none in the tower (it merges)', () => {
  const [a, b] = CAL_TIER.levels;
  assert.equal(tierOfLevel(1), 1);
  assert.equal(tierOfLevel(a - 1), 1);
  assert.equal(tierOfLevel(a), 2);
  assert.equal(tierOfLevel(b - 1), 2);
  assert.equal(tierOfLevel(b), 3);
  assert.equal(tierOfLevel(30), 3);
  const run = calamityRun(5, startedMeta(1), 'knight');
  const h = run.roster[0];
  h.gear = {};
  gainRunXp(run, { [h.id]: xpFor(a) });
  assert.equal(heroLevel(h), a);
  assert.deepEqual(promoteByLevel(run), [{ id: h.id, kind: 'knight', from: 1, to: 2 }]);
  assert.equal(h.grade, 2);
  assert.deepEqual(promoteByLevel(run), [], 'once');
  gainRunXp(run, { [h.id]: xpFor(b) });
  assert.deepEqual(promoteByLevel(run).map((p) => [p.from, p.to]), [[2, 3]]);
  // a tier is worth CAL_TIER.mult, not a merge's GRADE_MULT, on top of the level
  const lv = levelBoost(heroLevel(h));
  assert.ok(Math.abs(localBoost(h).hp! - lv.hp * CAL_TIER.mult ** 2) < 1e-9);
  assert.ok(CAL_TIER.mult < GRADE_MULT);
  assert.equal(localBoost(h).grade, 3);
  // the tower's heroes are not promoted by level
  const tower = towerRun(5, startedMeta(1));
  for (const t of tower.roster) gainRunXp(tower, { [t.id]: xpFor(25) });
  assert.deepEqual(promoteByLevel(tower), []);
});

test('a fight that levels a hero into a tier records the promotion for the page, and a late hire joins at its tier', () => {
  const run = calamityRun(7, startedMeta(1), 'knight');
  const h = run.roster[0];
  gainRunXp(run, { [h.id]: xpFor(CAL_TIER.levels[0]) - 5 });
  assert.equal(h.grade, 1);
  visit(run, 'fight');
  run.tower!.cur!.fight!.stage.foes = { hp: 0.01, atk: 0.01 };
  const b = startStage(run);
  const spots = frontSpots(b);
  place(b, h.kind, spots[0][0], spots[0][1], h.id, localBoost(h));
  fight(b);
  playOut(b);
  assert.equal(b.phase, 'won');
  finishTower(run, b, true, 3);
  assert.equal(h.grade, 2, 'the fight\'s XP took it to the tier');
  assert.deepEqual(run.tower!.promoted?.map((p) => [p.id, p.from, p.to]), [[h.id, 1, 2]]);
  // a saved run keeps the field, and the next result clears it
  const back = JSON.parse(JSON.stringify(run));
  assert.deepEqual(back.tower.promoted, run.tower!.promoted);
  // a hero hired when the roster is high joins already at the tier its level earns
  gainRunXp(run, { [h.id]: xpFor(26) });
  levelTiers(run);
  const late = hireHero(run, 'archer', 10);
  assert.ok(heroLevel(late) >= CAL_TIER.levels[0]);
  assert.ok(late.grade >= 2);
});

test('an older save, with levels past a tier and grade 1, is brought up to its tier the next fight, and a duplicate it holds plays on', () => {
  const run = calamityRun(8, startedMeta(1), 'knight');
  hireHero(run, 'knight', 5);
  for (const h of run.roster) h.xp = xpFor(25);
  const store: Record<string, string> = {};
  const slot = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v) };
  saveSlot(run, slot);
  const back = loadSlot('calamity', slot)!;
  assert.ok(back);
  assert.equal(back.roster.filter((h) => h.kind === 'knight').length, 2);
  assert.ok(back.roster.every((h) => h.grade === 1));
  visit(back, 'fight');
  assert.ok(back.roster.every((h) => h.grade === 3), 'entering the fight set the tiers');
  assert.equal(back.tower!.promoted?.length, 2);
});

test('a Calamity fight is on a bigger board with a band that fills it; the usual board is as it was', () => {
  const run = calamityRun(9, startedMeta(1), 'knight');
  for (const k of ALL_HEROES.slice(5, 14)) hireHero(run, k, 1);
  assert.equal(run.squad.length, 10);
  visit(run, 'fight');
  const b = startStage(run);
  assert.equal(b.board.w, CAL_BOARD.w);
  assert.equal(b.board.d, CAL_BOARD.d);
  // (twice the old 7 x 9 board, and bigger than the usual 8 x 11 one)
  assert.ok(CAL_BOARD.w * CAL_BOARD.d >= 1.8 * BASE_AREA && CAL_BOARD.w * CAL_BOARD.d <= 2.3 * BASE_AREA, 'about twice the old area');
  assert.ok(CAL_BOARD.w * CAL_BOARD.d > W * D && CAL_BOARD.d > D);
  assert.equal(b.units.filter((u) => u.side === 'foe').length, 11, 'ten heroes meet eleven foes');
  assert.ok(b.units.every((u) => standable(tileAt(b.board, u.u, u.v))));
  // the heroes' rows are the last three of the deeper board
  const lastRow = CAL_BOARD.d - 1;
  const free = Array.from({ length: b.board.w }, (_, u) => u).find((u) => standable(tileAt(b.board, u, lastRow)))!;
  assert.equal(canPlace(b, 'knight', free, lastRow), true);
  assert.equal(canPlace(b, 'knight', free, CAL_BOARD.d - DEPLOY_ROWS - 1), false);
  assert.equal(canPlace(b, 'knight', free, CAL_BOARD.d - DEPLOY_ROWS - 1), false, 'the row above the heroes\' rows is the middle ground');
  // an army fight is the usual size
  const plain = startBattle(9, 'skeletons');
  assert.equal(plain.board.w, W);
  assert.equal(plain.board.d, D);
  assert.equal(makeBoard(77, 'forest').tiles.length, W * D);
  // the foes cap
  assert.equal(fitBand(['boss', 'a', 'b', 'c', 'd'], 10, true).length, 12);
  assert.ok(fitBand(['a', 'b'], 10, false).length <= CAL_FOES_MAX);
});

test('the bigger boards can all be walked and have their features: every area, many seeds', () => {
  for (const area of AREAS)
    for (let seed = 1; seed <= 25; seed++) {
      const b = makeBoard(seed * 7919, area, CAL_BOARD.w, CAL_BOARD.d);
      assert.equal(b.tiles.length, CAL_BOARD.w * CAL_BOARD.d);
      assert.ok(boardOk(b), `${area} ${seed} can be walked`);
      // the heroes' rows have room for ten and the foes' rows for a full band
      const room = (rows: number[]) => rows.reduce((n, v) => n + Array.from({ length: b.w }, (_, u) => (standable(tileAt(b, u, v)) ? 1 : 0)).reduce((x: number, y) => x + y, 0), 0);
      assert.ok(room([b.d - 1, b.d - 2, b.d - 3]) >= 10, `${area} ${seed}: room for ten heroes`);
      assert.ok(room([0, 1, 2]) >= CAL_FOES_MAX, `${area} ${seed}: room for the band`);
    }
  // bigger boards lay more features than the usual one's two or three platforms
  const raised = (b: ReturnType<typeof makeBoard>) => new Set(b.tiles.map((t) => t.h)).size;
  assert.ok(raised(makeBoard(5, 'highlands', CAL_BOARD.w, CAL_BOARD.d)) >= 3);
});

test('the same seed makes the same big board', () => {
  const a = makeBoard(4242, 'snow', CAL_BOARD.w, CAL_BOARD.d);
  const b = makeBoard(4242, 'snow', CAL_BOARD.w, CAL_BOARD.d);
  assert.deepEqual(a, b);
});
