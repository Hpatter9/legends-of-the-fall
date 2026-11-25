// RELEASE-TRIM (docs/notes/release-trim.md): the Assault is withdrawn before release, and the Developer page with it. A save from 0.613
// that played the Assault (`fixtures/save-0613-assault.json`, made by 0.613's own code: 28 soldiers standing and 2 fallen in a storming
// under way, two holds conquered, one scouted, a Drill Yard at level 1 with level 2 being built, a Conquest chest in the stash) loads, is
// paid back once, and keeps what it won; and no build lists the Developer page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';
import { ASSAULT_REFUND, DRILL_YARD_COSTS, assaultGoneLine, lastTribute, settleAssaultGone } from '../src/sim/assaultGone';
import { ROOM_BUILDING_IDS } from '../src/sim/castle';
import { ROOMS } from '../src/sim/rooms';
import { openChest } from '../src/sim/armyStars';

const RAW = readFileSync('test/fixtures/save-0613-assault.json', 'utf8');
const store = (raw: string) => {
  const kept = new Map<string, string>([['legends.meta', raw]]);
  return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v) };
};

test('a 0.613 save that played the Assault loads, paid back for its soldiers, scouts, holds and Drill Yard', () => {
  const was = JSON.parse(RAW) as { crowns: number; stash: unknown[] };
  const m = loadMeta(1, store(RAW));
  const paid = 28 * ASSAULT_REFUND.recruit + 1 * ASSAULT_REFUND.scouts + lastTribute('orcs') + lastTribute('undead') + DRILL_YARD_COSTS[0] + DRILL_YARD_COSTS[1];
  assert.equal(m.crowns, was.crowns + paid, 'every refund paid once');
  assert.deepEqual(m.assaultGone, { crowns: paid, soldiers: 28, scouts: 1, holds: 2, drill: 2000 });
  assert.ok(!('assault' in m), 'the Assault\'s data is gone');
  assert.ok(!('drillYard' in m.castle), 'the Drill Yard is gone from the castle');
  assert.equal(m.works, undefined, 'its level being built is dropped (and paid back)');
  assert.match(assaultGoneLine(m.assaultGone!), /The Assault has been withdrawn for now: 4103 crowns returned for 28 soldiers, 1 scouts' report, the last tribute of 2 holds and the Drill Yard/);
  // (the Conquest chest won before stays in the stash and opens as before)
  assert.equal(m.stash.length, was.stash.length);
  const i = m.stash.findIndex((c) => c.conquest);
  assert.ok(i >= 0, 'the Conquest chest is kept');
  assert.ok(openChest(m, i), 'and opens');
});

test('the payment is made once: the save written after it loads with nothing more to pay', () => {
  const s = store(RAW);
  const m = loadMeta(1, s);
  const crowns = m.crowns;
  delete m.assaultGone;
  saveMeta(m, s);
  const again = loadMeta(1, s);
  assert.equal(again.crowns, crowns);
  assert.equal(again.assaultGone, undefined);
});

test('a save that never played the Assault is left alone', () => {
  const m = startedMeta(5);
  m.crowns = 300;
  const raw = JSON.stringify(m);
  assert.equal(settleAssaultGone(JSON.parse(raw)), undefined);
  const back = loadMeta(1, store(raw));
  assert.equal(back.crowns, 300);
  assert.equal(back.assaultGone, undefined);
});

test('odd Assault data is read defensively: no soldier counts twice, a fallen one is lost, a conquered hold is not paid as scouted', () => {
  const m = { crowns: 0, assault: { troops: { knight: [0, -1, 5, 'x', null, 99, 0, 0, 0, 0, 0, 0, 0], samurai: 'nope' }, conquered: { orcs: {}, nowhere: {} }, scouted: { orcs: true, beasts: true } }, castle: { drillYard: 9 } };
  const g = settleAssaultGone(m)!;
  assert.equal(g.soldiers, 10, 'a platoon is ten at most');
  assert.equal(g.holds, 1, 'an unknown army is not a hold');
  assert.equal(g.scouts, 1, 'only the hold still standing was scouted for nothing');
  assert.equal(g.drill, DRILL_YARD_COSTS[0] + DRILL_YARD_COSTS[1], 'the Drill Yard at most its two levels');
  assert.equal(m.crowns, g.crowns);
  assert.ok(!('assault' in (m as object)) && !('drillYard' in m.castle));
});

test('the Drill Yard and its rooms are gone from the castle', () => {
  assert.ok(!(ROOM_BUILDING_IDS as string[]).includes('drillYard'));
  assert.ok(!ROOMS.some((r) => (r.building as string) === 'drillYard'));
});

test('the tools\' hooks are put on the page only under automation, and no page hook is set past them', async () => {
  const { toolHook, toolsOn } = await import('../src/toolHooks');
  const g = globalThis as unknown as Record<string, unknown>;
  const had = g.window;
  g.window = {};
  try {
    // (a player's browser: no `navigator.webdriver`)
    assert.equal(toolsOn(), false);
    toolHook('__game', { meta: {} });
    assert.equal((g.window as Record<string, unknown>).__game, undefined);
  } finally {
    g.window = had;
  }
  // (every `window.__*` the page sets goes through `toolHook`, but the Android app's Back and the Back log beside it)
  const { readdirSync, statSync } = await import('node:fs');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = `${d}/${f}`;
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts')) files.push(p);
    }
  };
  walk('src');
  const set = /\(window as unknown as \{[^}]*\}\)\.(__\w+)\s*=|\bw\.(__\w+)\s*=(?!=)/g;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(set)) assert.ok(['__phoneBack', '__backLog'].includes(m[1] ?? m[2]), `${f} sets ${m[1] ?? m[2]} outside toolHook`);
  }
  // (the forcing hooks are honoured only under automation)
  assert.match(readFileSync('src/gacha.ts', 'utf8'), /toolsOn\(\) && \(window as unknown as \{ __forceLucky/);
  assert.match(readFileSync('src/main.ts', 'utf8'), /toolsOn\(\) \? \(window as unknown as \{ __forceDrop/);
  assert.match(readFileSync('src/main.ts', 'utf8'), /new URLSearchParams\(toolsOn\(\) \? location\.search : ''\)/);
});

test('the Assault\'s stones are paid where every player reaches: a Legendary first clear pays what a hold\'s first fall did', async () => {
  const { openChest, chestStones, CONQUEST_SHARE, FIRST_CLEAR_CHEST, legendFirstStones } = await import('../src/sim/armyStars');
  const { MOVED_STONES } = await import('../src/sim/hiddenModes');
  const open = (c: Record<string, unknown>): number => {
    const m = startedMeta(3);
    m.stash.push({ army: 'orcs', seed: 77, ...c } as never);
    openChest(m, 0);
    return m.stones ?? 0;
  };
  const gold = chestStones({ at: FIRST_CLEAR_CHEST[3] });
  // (a hold's first Conquest chest held a gold chest's stones half again, and the hidden modes' moved stones)
  const conquest = Math.ceil(gold * CONQUEST_SHARE) + MOVED_STONES.legend;
  assert.equal(open({ at: FIRST_CLEAR_CHEST[3], tier: 3, first: true }), conquest);
  assert.equal(legendFirstStones({ at: FIRST_CLEAR_CHEST[3], tier: 3, first: true }), conquest - gold);
  assert.equal(legendFirstStones({ at: FIRST_CLEAR_CHEST[4], tier: 4, first: true }), 0, 'the Mythic first clear is as it was');
});

test('the regrouped Warbands\' chests come with the week\'s first daily clear, every second week for each army at its tenth star', async () => {
  const { warbandChests } = await import('../src/sim/modes');
  const { ARMIES } = await import('../src/sim/armies');
  const { weekOf } = await import('../src/sim/council');
  const ten = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1 } };
  const m = startedMeta(4);
  const monday = 20261123;
  assert.deepEqual(warbandChests(m, monday), [], 'no army at its tenth star: nothing');
  for (const a of ARMIES.slice(0, 4)) m.armies[a.id] = { ...ten } as never;
  m.armies[ARMIES[4].id] = { ...ten, met: { 0: 7, 1: 7, 2: 7 } } as never;
  const days = [monday, monday + 1, monday + 2, monday + 3, monday + 4, monday + 5, monday + 6, 20261130, 20261201, 20261207];
  const weeks = new Map<number, number[]>();
  for (const d of days) (weeks.get(weekOf(d)) ?? weeks.set(weekOf(d), []).get(weekOf(d))!).push(d);
  let paid = 0;
  for (const [wk, ds] of weeks) {
    const first = warbandChests(m, ds[0]);
    // (each army on its own turn: half of the four, by its place)
    assert.deepEqual(first.map((c) => c.army).sort(), ARMIES.slice(0, 4).filter((_, i) => (wk + i) % 2 === 0).map((a) => a.id).sort());
    for (const c of first) assert.deepEqual({ at: c.at, tier: c.tier, conquest: c.conquest, half: c.half }, { at: 10, tier: 4, conquest: true, half: true }, 'the regrouped Warband\'s own chest');
    paid += first.length;
    m.daily[String(ds[0])] = { best: 0, plays: 1, cleared: true };
    for (const d of ds.slice(1)) assert.deepEqual(warbandChests(m, d), [], 'once a week');
  }
  assert.equal(paid, 2 * weeks.size, 'four armies at ten stars: two chests a week');
  // (and the daily's own settle gives them, in the stash beside the daily chest)
  const { settleDaily } = await import('../src/sim/modes');
  const m2 = startedMeta(5);
  for (const a of ARMIES.slice(0, 4)) m2.armies[a.id] = { ...ten } as never;
  const run = { mode: { kind: 'daily', date: 20261209, practice: false }, cleared: true, over: true, stage: 10, roster: [], squad: [] } as never;
  settleDaily(m2, run, { won: true, stage: 10 });
  assert.ok(m2.stash.some((c) => c.daily === 20261209));
  assert.equal(m2.stash.filter((c) => c.conquest && c.half).length, 2);
});
