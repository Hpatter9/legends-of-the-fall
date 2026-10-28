import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyArmy, dailyHost, DAILY_ARMIES, DAILY_WAVES } from '../src/sim/daily';
import { dailyTheme, dailyStarsMax, dayNumber, DAILY_THEMES, DAILY_THEMES_FROM, featuredExtra, SWARM_HP, SWARM_MAX, themeFx, themeGoalMet, themePool } from '../src/sim/dailyThemes';
import { dailyBonus, dailyRun } from '../src/sim/modes';
import { dailyArea } from '../src/sim/dailySeed';
import { finish, noteFight, startStage } from '../src/sim/run';
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

test('a date before the themes keeps the old daily: no theme, the starting five, a host from the old draw', () => {
  const old = after(from, -1);
  assert.equal(dailyTheme(old), null);
  assert.deepEqual(dailyRun(old).pool, ['knight', 'samurai', 'kunoichi', 'archer', 'wizard']);
  assert.ok(DAILY_ARMIES.includes(dailyHost(old).id));
  assert.equal(dailyStarsMax(old), 2);
});

test('the themes go round one a day, and none comes back within a fortnight', () => {
  assert.ok(DAILY_THEMES.length >= 14 && DAILY_THEMES.length <= 20);
  const seq = Array.from({ length: 400 }, (_, n) => dailyTheme(after(from, n))!.id);
  for (let i = 0; i + 14 <= seq.length; i++) assert.equal(new Set(seq.slice(i, i + 14)).size, 14, `days ${i} to ${i + 13}`);
  // (and across a month's end and a year's end the count of days holds)
  assert.equal(dayNumber(20270101) - dayNumber(20261231), 1);
  assert.equal(dayNumber(20280301) - dayNumber(20280228), 2);
});

test('no two days running share a host army or a land, round the turn of the cycle too', () => {
  DAILY_THEMES.forEach((t, i) => {
    const next = DAILY_THEMES[(i + 1) % DAILY_THEMES.length];
    assert.notEqual(t.host, next.host, `${t.id} then ${next.id}`);
    assert.notEqual(t.area, next.area, `${t.id} then ${next.id}`);
  });
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
    // (the five alone fall short of the goal: it asks for a hire)
    assert.ok(t.five.filter((k) => membersOf(t.trait).includes(k)).length < t.need, t.id);
    assert.ok(DAILY_ARMIES.includes(t.host), t.host);
    if (t.twist) assert.ok(TWISTS[t.twist], t.twist);
  }
});

test('a themed day brings its five, its pool, its host, its land and its twist', () => {
  DAILY_THEMES.forEach((t, i) => {
    const date = after(from, i);
    assert.equal(dailyTheme(date)!.id, t.id);
    const run = dailyRun(date);
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
  const i = DAILY_THEMES.findIndex((t) => t.swarm);
  const date = after(from, i);
  const host = dailyHost(date);
  const army = dailyArmy(date);
  for (const [n, w] of army.waves.entries()) {
    if (w.boss) assert.deepEqual(w.foes, n === DAILY_WAVES - 1 ? host.waves[host.waves.length - 1].foes : host.waves.find((x) => x.boss === 'mid')!.foes);
    else assert.ok(w.foes.length > 3 && w.foes.length <= SWARM_MAX, `wave ${n + 1}: ${w.foes.length}`);
  }
  const run = dailyRun(date);
  const b = startStage(run);
  const fresh = startStage(dailyRun(after(from, i + DAILY_THEMES.length)));
  assert.equal(b.foeBoost?.hp, fresh.foeBoost?.hp);
  // (the hp share is the run's own: the wave-1 boost times SWARM_HP)
  assert.ok(Math.abs(b.foeBoost!.hp! - dailyArmy(date).start * SWARM_HP) < 1e-9);
});

test('the goal is met by the heroes fielded against the boss of the day, and earns a third bonus star', () => {
  const t = DAILY_THEMES[0];
  const date = after(from, 0);
  assert.equal(themeGoalMet(t, ['werewolf', 'minotaur', 'satyr']), false);
  assert.equal(themeGoalMet(t, ['werewolf', 'minotaur', 'satyr', 'gorgon', 'knight']), true);
  for (const kinds of [['werewolf', 'minotaur', 'satyr', 'gorgon', 'knight'], ['werewolf', 'minotaur', 'satyr', 'knight', 'archer']]) {
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
    assert.equal(stars[2].earned, kinds.includes('gorgon'), kinds.join());
  }
  // (an old day has only the two stars)
  const old = dailyRun(after(from, -1));
  old.cleared = true;
  assert.equal(dailyBonus(old).length, 2);
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
