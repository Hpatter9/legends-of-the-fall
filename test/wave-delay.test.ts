// WAVE-DELAY (docs/notes/wave-delay.md): what may slow or stop a fight in the middle of a wave. The slow moment for a fall is a boss's
// alone (it was every foe of 400 health or more: about five a wave past the early stages). The large sheets a fight draws from go
// to the graphics card ahead of it, one a frame, and stay there while it lasts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FALL_SLOW_MS, fallSlowMs, ultCastBeat } from '../src/render/fxRules';
import { mayRelease, mayWarm, nextToWarm } from '../src/render/texReadyRules';
import { COLUMN_ROOM, WARM, warmMore, warmNow } from '../src/render/boardWarmRules';
import { ColumnTextures } from '../src/render/columnTextures';
import { LOOP, loopCure, reloadSafe } from '../src/loopRules';
import { DIAG, diagHead, stepsText, diagText, doingIn, isStop, parseDiag, stopLine, withStop, type DiagStop } from '../src/diagRules';

test('the slow moment for a fall is a boss\'s alone, and none with the screen kept still', () => {
  assert.equal(fallSlowMs(true, false), FALL_SLOW_MS);
  assert.equal(fallSlowMs(false, false), 0);
  assert.equal(fallSlowMs(true, true), 0);
  assert.equal(fallSlowMs(false, true), 0);
  assert.ok(FALL_SLOW_MS > 0 && FALL_SLOW_MS <= 1000);
});

test('the kept sheets go to the graphics card one a frame, in order, and are held there while a fight is on', () => {
  const on = new Set<string>(['b']);
  const kept = ['a', 'b', 'c', 'd'];
  const order: string[] = [];
  for (let frame = 0; frame < 10; frame++) {
    const next = nextToWarm(kept, (x) => on.has(x));
    if (!next) break;
    order.push(next);
    on.add(next);
  }
  assert.deepEqual(order, ['a', 'c', 'd']);
  assert.equal(nextToWarm(kept, (x) => on.has(x)), null);
  assert.equal(nextToWarm([], () => false), null);
  assert.equal(mayRelease(true), false);
  assert.equal(mayRelease(false), true);
  // (handed over in a deploy, never in the middle of a fight)
  assert.equal(mayWarm(true), false);
  assert.equal(mayWarm(false), true);
});

test('an ultimate\'s short version (Auto\'s, or a second one\'s) never slows or stops the fight; the full moment keeps its beat', () => {
  assert.deepEqual(ultCastBeat(false), { slow: 0, stop: 0 });
  const full = ultCastBeat(true);
  assert.ok(full.slow > 0 && full.stop > 0);
});

test('the stops\' log: a gap of half a second is kept, the page left alone is not; the newest thirty; what the page was doing', () => {
  assert.equal(isStop(DIAG.GAP_MS - 1), false);
  assert.equal(isStop(DIAG.GAP_MS), true);
  assert.equal(isStop(DIAG.AWAY_MS), false);
  assert.equal(isStop(NaN), false);
  const stop = (i: number): DiagStop => ({ at: 1_700_000_000_000 + i * 1000, ms: 600 + i, phase: 'fight', v: '0.1.0', doing: 'not known' });
  let log: DiagStop[] = [];
  for (let i = 0; i < 45; i++) log = withStop(log, stop(i));
  assert.equal(log.length, DIAG.KEEP);
  assert.equal(log[log.length - 1].ms, 644);
  assert.equal(log[0].ms, 615);
  // (what was said in the gap or just before it, in order, each once)
  const marks = [{ t: 100, what: 'old' }, { t: 5000 - DIAG.NEAR_MS, what: 'the next board built' }, { t: 5400, what: 'a fight begun' }, { t: 5500, what: 'a fight begun' }, { t: 9000, what: 'later' }];
  assert.equal(doingIn(marks, 5000, 6000), 'the next board built; a fight begun');
  // (nothing said in the gap: the last three things said before it, the newest first, with how long before)
  assert.equal(doingIn(marks, 20000, 21000), 'not known (before it: later 11.0 s earlier, a fight begun 14.5 s earlier, a fight begun 14.6 s earlier)');
  assert.equal(doingIn([], 20000, 21000), 'not known');
  // (stored and read back; anything else stored reads as an empty log)
  assert.deepEqual(parseDiag(JSON.stringify(log)), log);
  for (const bad of [null, '', 'x', '{}', '[1, "a", null, {"at":"x"}]']) assert.deepEqual(parseDiag(bad), []);
  assert.match(stopLine({ ...stop(0), ms: 2400, doing: 'the next board built' }), /^\d\d:\d\d:\d\d {2}2\.4 s {2}fight {2}the next board built \(0\.1\.0\)$/);
  assert.match(diagText([]), /No stop/);
  assert.equal(diagText(log).split('\n').length, DIAG.KEEP);
  assert.ok(diagText(log).startsWith(stopLine(log[log.length - 1])));
});

test('painting ahead: a few tiles a frame at least, more only while the frame has time', () => {
  assert.equal(warmMore(0, 0), true);
  assert.equal(warmMore(WARM.LEAST - 1, 999), true);
  assert.equal(warmMore(WARM.LEAST, WARM.FRAME_MS), false);
  assert.equal(warmMore(WARM.LEAST, WARM.FRAME_MS - 1), true);
  assert.ok(WARM.FRAME_MS <= 16);
  // (through the fight: a tile a frame, and almost none of the frame's time)
  assert.equal(warmMore(0, 999, true), true);
  assert.equal(warmMore(WARM.FIGHT_LEAST, WARM.FIGHT_MS, true), false);
  assert.ok(WARM.FIGHT_MS <= 3);
  // (a device at five frames a second paints a twentieth of each long frame's time, no more)
  assert.equal(warmMore(5, 9, true, 200), true);
  assert.equal(warmMore(5, 10, true, 200), false);
  assert.equal(warmMore(5, 13, true, 99999), false);
  // (begun once the fight is under way, and at the latest as it is won; never in a deploy or a lost fight)
  assert.equal(warmNow('fight', WARM.FIGHT_FROM - 100), false);
  assert.equal(warmNow('fight', WARM.FIGHT_FROM), true);
  assert.equal(warmNow('won', 0), true);
  assert.equal(warmNow('deploy', 99999), false);
  assert.equal(warmNow('lost', 99999), false);
});

test('the painted columns of three boards are kept: a board built again is not painted again', () => {
  let painted = 0;
  const cache = new ColumnTextures<number>(() => undefined, COLUMN_ROOM.entries, COLUMN_ROOM.bytes);
  const board = (id: number) => Array.from({ length: 130 }, (_, i) => cache.acquire(`board${id}:${i}`, 64 * 110 * 4, () => ++painted));
  // (the board fought on, the next painted for the march, then both let go and built again for the fight and the scenery's bake)
  const a = board(1);
  const b = board(2);
  assert.equal(painted, 260);
  for (const l of [...a, ...b]) l.release();
  const again = [...board(2), ...board(1)];
  assert.equal(painted, 260, 'nothing is painted a second time');
  const c = board(3);
  assert.equal(painted, 390);
  for (const l of [...again, ...c]) l.release();
  board(2);
  board(3);
  assert.equal(painted, 390, 'three boards\' worth is kept');
  // (the old room did not hold two boards)
  let old = 0;
  const small = new ColumnTextures<number>(() => undefined, 256, 4 * 1024 * 1024);
  const sb = (id: number) => Array.from({ length: 130 }, (_, i) => small.acquire(`board${id}:${i}`, 64 * 110 * 4, () => ++old));
  const x = sb(1);
  const y = sb(2);
  for (const l of [...x, ...y]) l.release();
  sb(2);
  assert.ok(old > 260, 'the old room painted the second board again');
});

test('the log\'s heading says where the game is running, and leaves out what a browser does not tell', () => {
  const full = diagHead({ v: '0.540.0', app: true, agent: 'Mozilla/5.0 (Linux; Android 14; wv)', memoryGB: 8, cores: 8, heapMB: 470, heapLimitMB: 2048, screen: '393x852 at 2.75' });
  assert.equal(full, 'Version 0.540.0 · the installed app\nMozilla/5.0 (Linux; Android 14; wv)\ndevice memory 8 GB · 8 cores · heap 470 of 2048 MB · screen 393x852 at 2.75');
  const bare = diagHead({ v: '0.540.0', app: false, agent: 'X', screen: '360x780 at 3' });
  assert.equal(bare, 'Version 0.540.0 · a browser\nX\nscreen 360x780 at 3');
});

test('a stop\'s parts: the longest first, how many times each ran, and no time given for one that took none', () => {
  const steps = new Map([
    ['columns from the cache', { ms: 0, n: 12 }],
    ['columns painted', { ms: 5200.4, n: 88 }],
    ['the old board drawn into one picture of 640x480', { ms: 300, n: 1 }],
  ]);
  assert.equal(stepsText(steps), 'columns painted 88 in 5200 ms; the old board drawn into one picture of 640x480 in 300 ms; columns from the cache 12');
  assert.equal(stepsText(new Map()), '');
});

test('the loop watched from outside: a stopped loop is started again, a drawing that keeps faulting has the board built afresh, and what is not cured is loaded again', () => {
  const well = { running: true, hidden: false, sinceFrame: 16, faults: 0, restarts: 0, rebuilt: false };
  assert.equal(loopCure(well), 'none');
  // (at rest on the home screen, or the page hidden: nothing is wrong)
  assert.equal(loopCure({ ...well, running: false, sinceFrame: 99999, faults: 999 }), 'none');
  assert.equal(loopCure({ ...well, hidden: true, sinceFrame: 99999 }), 'none');
  // (the loop has not turned: started again, three times; then the page is loaded again)
  assert.equal(loopCure({ ...well, sinceFrame: LOOP.STALL_MS - 1 }), 'none');
  assert.equal(loopCure({ ...well, sinceFrame: LOOP.STALL_MS }), 'restart');
  assert.equal(loopCure({ ...well, sinceFrame: LOOP.STALL_MS, restarts: LOOP.RESTARTS - 1 }), 'restart');
  assert.equal(loopCure({ ...well, sinceFrame: LOOP.STALL_MS, restarts: LOOP.RESTARTS }), 'reload');
  assert.equal(loopCure({ ...well, sinceFrame: NaN }), 'restart');
  // (frames or drawings at fault in a row: the board built afresh once, then the page loaded again)
  assert.equal(loopCure({ ...well, faults: LOOP.FAULTS - 1 }), 'none');
  assert.equal(loopCure({ ...well, faults: LOOP.FAULTS }), 'rebuild');
  assert.equal(loopCure({ ...well, faults: LOOP.FAULTS, rebuilt: true }), 'reload');
  // (never loaded again where a wave's result is being counted)
  assert.equal(reloadSafe('fight'), true);
  assert.equal(reloadSafe('deploy'), true);
  assert.equal(reloadSafe('won'), false);
  assert.equal(reloadSafe('lost'), false);
  assert.ok(LOOP.STALL_MS <= 5000 && LOOP.FAULTS <= 180);
});

test('a kept column whose texture is no longer alive is never handed out again: it is painted afresh', () => {
  let painted = 0;
  const destroyed: number[] = [];
  const dead = new Set<number>();
  const cache = new ColumnTextures<number>((v) => destroyed.push(v), 640, 16 * 1024 * 1024);
  const alive = (v: number): boolean => !dead.has(v);
  const a = cache.acquire('k', 1000, () => ++painted, alive);
  assert.equal(a.value, 1);
  a.release();
  // (alive: the same one again)
  const b = cache.acquire('k', 1000, () => ++painted, alive);
  assert.equal(b.value, 1);
  // (something else destroyed it while it was kept, and while a board still holds it)
  dead.add(1);
  const c = cache.acquire('k', 1000, () => ++painted, alive);
  assert.equal(c.value, 2, 'painted afresh');
  assert.equal(cache.stats.dead, 1);
  // (the dead one goes with its last holder; the new one is the kept one from now on)
  b.release();
  assert.deepEqual(destroyed, [1]);
  c.release();
  assert.equal(cache.acquire('k', 1000, () => ++painted, alive).value, 2);
  assert.equal(painted, 2);
});
