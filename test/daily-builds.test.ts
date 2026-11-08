import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyArmy, dailyHost, DAILY_ARMIES, DAILY_WAVES } from '../src/sim/daily';
import { dailyTheme, dailyStarsMax, dayNumber, themeBlock, THEME_GAP, DAILY_THEMES, DAILY_THEMES_FROM, featuredExtra, SWARM_HP, SWARM_MAX, themeFx, themeGoalMet, themePool } from '../src/sim/dailyThemes';
import { dailyBonus, dailyRun } from '../src/sim/modes';
import { dailyArea } from '../src/sim/dailySeed';
import { finish, noteFight, runTheme, startStage, waveArmyOf } from '../src/sim/run';
import { place, type Battle } from '../src/sim/battle';
import { deployTiles } from '../src/sim/autoplay';
import { membersOf, TRAITS } from '../src/sim/traits';
import { TWISTS } from '../src/sim/twists';
import { UNITS } from '../src/sim/units';
import { readStash } from '../src/sim/armyStars';

/** The yyyymmdd date `n` days after `from`. */
const after = (from: number, n: number): number => {
  const d = new Date(Date.UTC(2000, 0, 1) + (dayNumber(from) + n) * 86_400_000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
const from = DAILY_THEMES_FROM;
/** The first date from the switch whose theme is `id`. */
const dateOf = (id: string): number => {
  for (let n = 0; ; n++) if (dailyTheme(after(from, n))!.id === id) return after(from, n);
};
const PINNED = ['20261026:tricks', '20261028:frontier', '20261225:wild', '20270101:samurai', '20270615:iron'];

test('a date before the themes keeps the old daily: no theme, the starting five, a host from the old draw', () => {
  const old = after(from, -1);
  assert.equal(dailyTheme(old), null);
  assert.deepEqual(dailyRun(old).pool, ['knight', 'samurai', 'kunoichi', 'archer', 'wizard']);
  assert.ok(DAILY_ARMIES.includes(dailyHost(old).id));
  assert.equal(dailyStarsMax(old), 2);
});

test('the themes come shuffled a block at a time: every theme once a block, and the blocks differ', () => {
  const len = DAILY_THEMES.length;
  assert.ok(len >= 14 && len <= 20);
  const orders = Array.from({ length: 40 }, (_, n) => themeBlock(n));
  for (const o of orders) assert.deepEqual([...o].sort((a, b) => a - b), Array.from({ length: len }, (_, k) => k));
  assert.ok(new Set(orders.map((o) => o.join())).size >= 38, 'the blocks are shuffled, not one fixed round');
  assert.notEqual(orders[0].join(), Array.from({ length: len }, (_, k) => k).join());
  // (day n of the themes is place n mod len of block n / len)
  for (let n = 0; n < 3 * len; n++) assert.equal(dailyTheme(after(from, n)), DAILY_THEMES[themeBlock(Math.floor(n / len))[n % len]]);
  // (and across a month's end and a year's end the count of days holds)
  assert.equal(dayNumber(20270101) - dayNumber(20261231), 1);
  assert.equal(dayNumber(20280301) - dayNumber(20280228), 2);
});

test('no theme comes back within a fortnight, across the edge of a block too, over ten years', () => {
  const seq = Array.from({ length: 3650 }, (_, n) => dailyTheme(after(from, n))!.id);
  for (let i = 0; i + THEME_GAP <= seq.length; i++) assert.equal(new Set(seq.slice(i, i + THEME_GAP)).size, THEME_GAP, `days ${i} to ${i + THEME_GAP - 1}`);
});

test('every player meets the same theme on the same date: it hangs on the date alone', () => {
  // (pinned: a change to the table or the shuffle shows here, and every phone on a date agrees)
  const pinned = [after(from, 0), after(from, 2), 20261225, 20270101, 20270615].map((d) => `${d}:${dailyTheme(d)!.id}`);
  assert.deepEqual(pinned, PINNED);
});

test('no two days running share a host army or a land, across the edge of a block too', () => {
  let last = dailyTheme(after(from, 0))!;
  for (let n = 1; n < 3650; n++) {
    const t = dailyTheme(after(from, n))!;
    assert.notEqual(t.host, last.host, `day ${n}: ${last.id} then ${t.id}`);
    assert.notEqual(t.area, last.area, `day ${n}: ${last.id} then ${t.id}`);
    last = t;
  }
});

test('every theme is sound: its heroes are real, its goal can be met from its pool, its host, land and twist exist', () => {
  const ids = new Set<string>();
  for (const t of DAILY_THEMES) {
    assert.ok(!ids.has(t.id), t.id);
    ids.add(t.id);
    assert.ok(TRAITS[t.trait], t.trait);
    for (const k of themePool(t)) assert.equal(UNITS[k]?.side, 'hero', k);
    assert.equal(new Set(themePool(t)).size, themePool(t).length, `${t.id} pool has no repeats`);
    const featured = themePool(t).filter((k) => membersOf(t.trait).includes(k));
    assert.ok(featured.length >= t.need, `${t.id} can reach ${t.need}`);
    // (the goal is met by the five alone: a Hire draws at random, so no goal leans on one; docs/notes/goals-audit.md)
    assert.ok(t.five.filter((k) => membersOf(t.trait).includes(k)).length >= t.need, t.id);
    assert.ok(DAILY_ARMIES.includes(t.host), t.host);
    if (t.twist) assert.ok(TWISTS[t.twist], t.twist);
  }
});

test('a themed day brings its five, its pool, its host, its land and its twist', () => {
  DAILY_THEMES.forEach((t) => {
    const date = dateOf(t.id);
    assert.equal(dailyTheme(date)!.id, t.id);
    const run = dailyRun(date);
    assert.equal(run.mode?.kind === 'daily' && run.mode.theme, t.id);
    assert.deepEqual(run.roster.map((h) => h.kind), [...t.five]);
    assert.equal(run.squad.length, 5);
    assert.deepEqual(run.pool, themePool(t));
    assert.equal(dailyHost(date).id, t.host);
    assert.equal(dailyArea(date), t.area);
    assert.equal(dailyArmy(date).waves.length, DAILY_WAVES);
    const b = startStage(run);
    assert.equal(b.featured, t.trait);
    assert.deepEqual(b.twist, themeFx(t));
  });
});

test("the featured trait's woken bonus counts twice; asleep, it adds nothing", () => {
  assert.deepEqual(featuredExtra('beast', ['werewolf']), {});
  assert.deepEqual(featuredExtra('beast', ['werewolf', 'minotaur']), { atk: 1.03 });
  assert.deepEqual(featuredExtra('beast', ['werewolf', 'minotaur', 'satyr', 'gorgon']), { atk: 1.08 });
  assert.deepEqual(featuredExtra('guardian', ['knight', 'paladin']), { guard: 0.05 });
});

const placeAll = (b: Battle, kinds: readonly string[]): void => {
  const spots = deployTiles(b.board);
  kinds.forEach((k, i) => place(b, k, spots[i][0], spots[i][1], i + 1));
};

test("a swarm day doubles the field waves' foes, to at most eight, at a share of the hp; its bosses are as they were", () => {
  const date = dateOf(DAILY_THEMES.find((t) => t.swarm)!.id);
  const host = dailyHost(date);
  const army = dailyArmy(date);
  for (const [n, w] of army.waves.entries()) {
    if (w.boss) assert.deepEqual(w.foes, n === DAILY_WAVES - 1 ? host.waves[host.waves.length - 1].foes : host.waves.find((x) => x.boss === 'mid')!.foes);
    else assert.ok(w.foes.length > 3 && w.foes.length <= SWARM_MAX, `wave ${n + 1}: ${w.foes.length}`);
  }
  const run = dailyRun(date);
  const b = startStage(run);
  // (the hp share is the run's own: the wave-1 boost times SWARM_HP)
  assert.ok(Math.abs(b.foeBoost!.hp! - dailyArmy(date).start * SWARM_HP) < 1e-9);
});

test('the goal is met by the heroes fielded against the boss of the day, and earns a third bonus star', () => {
  const t = DAILY_THEMES.find((x) => x.id === 'beasts')!;
  const date = dateOf('beasts');
  // (three Beasts, the five's own: the goal never leans on a Hire; docs/notes/goals-audit.md)
  assert.equal(themeGoalMet(t, ['werewolf', 'minotaur']), false);
  assert.equal(themeGoalMet(t, ['werewolf', 'minotaur', 'satyr', 'knight', 'archer']), true);
  for (const kinds of [['werewolf', 'minotaur', 'satyr', 'gorgon', 'knight'], ['werewolf', 'minotaur', 'knight', 'archer', 'wizard']]) {
    const run = dailyRun(date);
    run.stage = DAILY_WAVES;
    const b = startStage(run);
    placeAll(b, kinds);
    b.phase = 'won';
    noteFight(run, b);
    finish(run, true, 3);
    assert.equal(run.cleared, true);
    const stars = dailyBonus(run);
    assert.equal(stars.length, 3);
    assert.equal(stars[2].earned, kinds.includes('satyr'), kinds.join());
  }
  // (an old day has only the two stars)
  const old = dailyRun(after(from, -1));
  old.cleared = true;
  assert.equal(dailyBonus(old).length, 2);
});

test('a run of a themed date begun before the themes (no theme in its mode) plays on as the old daily', () => {
  const date = dateOf('beasts');
  const run = dailyRun(date);
  // (as the old build made it: the starting five, the old land, no theme named)
  if (run.mode?.kind === 'daily') delete run.mode.theme;
  assert.equal(runTheme(run), null);
  const army = waveArmyOf(run)!;
  assert.deepEqual(army, dailyArmy(date, null));
  assert.equal(army.mid.hp, dailyArmy(after(from, -1), null).mid.hp);
  const b = startStage(run);
  assert.equal(b.featured, undefined);
  assert.equal(b.twist, undefined);
  run.cleared = true;
  assert.equal(dailyBonus(run).length, 2);
});

test('a themed daily chest keeps its third star through a save; an old one is held to two', () => {
  const themed = after(from, 3);
  const old = after(from, -3);
  const stash = readStash([
    { army: 'daily', at: 3, tier: 0, seed: 1, daily: themed, bonus: 3 },
    { army: 'daily', at: 3, tier: 0, seed: 2, daily: old, bonus: 3 },
  ], {}, 1);
  assert.deepEqual(stash.map((c) => c.bonus), [3, 2]);
});
