// (SPELLS-RETUNE, an owner-approved change of requirement, docs/notes/spells-retune.md: the greedy player of `tools/autoplay.ts` now casts the
// king's spells as the page's Auto does, `botSpells`, and the armies, the daily, the Last Stand and the Calamity were retuned so the bars below
// hold for that player; no bar was moved.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyArmy, dailyBoss, dailyBossName, dailyChestSeed, dailyCrowns, dailyHost, dailyWaveCrowns, DAILY_ARMIES, DAILY_MID, DAILY_WAVES } from '../src/sim/daily';
import { dailyBonus, dailyLine, dailyRun, settleDaily, settleRun, startDaily, DAILY_TIME_MS } from '../src/sim/modes';
import { bestChest, openChest, peekChest, readStash, rollDailyChest, DAILY_BONUS_CROWNS, DAILY_CHEST_CROWNS } from '../src/sim/armyStars';
import { bossOf } from '../src/sim/armies';
import { canRetry, loadRun, saveRun, chainOf, finish, isBossRun, noteFight, retryWave, startStage, waveArmyOf, MAX_RETRIES } from '../src/sim/run';
import { isBoss } from '../src/sim/foes';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';
import { DAILY_CHEST_STONES } from '../src/sim/unlockRules';
import { UNITS } from '../src/sim/units';
import { dateKey } from '../src/sim/dailySeed';
import { playDaily } from '../tools/autoplay';

const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v) };
};
const days = (n: number): number[] => Array.from({ length: n }, (_, d) => dateKey(2026, 1 + Math.floor(d / 28), 1 + (d % 28)));

/** Win every wave of the run in turn, as a player who never falls (a fight's tally is noted as the page does). */
function winAll(m: ReturnType<typeof startedMeta>, run: ReturnType<typeof dailyRun>): void {
  while (!run.over) {
    const stage = run.stage;
    const b = startStage(run);
    b.phase = 'won';
    noteFight(run, b);
    finish(run, true, 3);
    settleDaily(m, run, { won: true, stage });
    settleRun(m, run, { won: true, stage, stars: 3, battle: b });
  }
}

test('a daily is ten waves, a mid-boss at wave 5 and the boss of the day at wave 10', () => {
  for (const date of days(40)) {
    const a = dailyArmy(date);
    assert.equal(a.waves.length, DAILY_WAVES);
    assert.equal(DAILY_WAVES, 10);
    a.waves.forEach((w, i) => assert.equal(w.boss, i + 1 === DAILY_WAVES ? 'final' : i + 1 === DAILY_MID ? 'mid' : undefined, `wave ${i + 1}`));
    const run = dailyRun(date);
    assert.equal(waveArmyOf(run), a);
    // (the fight at wave 10 has the boss; wave 5 has a boss too; the others have none)
    for (let n = 1; n <= DAILY_WAVES; n++) {
      run.stage = n;
      assert.equal(isBossRun(run), n === 5 || n === 10, `wave ${n} is a boss wave`);
      const foes = startStage(run).units.filter((u) => u.side === 'foe');
      assert.equal(foes.some((u) => isBoss(u.def)), n === 5 || n === 10, `wave ${n} foes`);
      if (n === 10) assert.ok(foes.some((u) => u.def === dailyBoss(date)));
    }
    // (field waves ramp up from three foes to six)
    assert.ok(a.waves[0].foes.length <= a.waves[8].foes.length);
    assert.equal(chainOf(run)?.length, DAILY_WAVES);
  }
});

test('the boss of the day follows the date: the same all day, from the early armies, and it varies', () => {
  const bosses = new Set<string>();
  for (const date of days(60)) {
    assert.equal(dailyBoss(date), dailyBoss(date));
    assert.equal(dailyHost(date), dailyHost(date));
    assert.ok(DAILY_ARMIES.includes(dailyHost(date).id));
    assert.equal(dailyBoss(date), bossOf(dailyHost(date)));
    assert.equal(dailyBossName(date), UNITS[dailyBoss(date)].name);
    bosses.add(dailyBoss(date));
  }
  assert.equal(bosses.size, DAILY_ARMIES.length, 'every boss of the list comes up within two months');
  assert.deepEqual(dailyArmy(20261021).waves, dailyArmy(20261021).waves);
  assert.equal(dailyArmy(20261021).id, 'daily20261021');
});

test('clearing the boss of the day wins the daily: the clear, the waves paid, a daily chest in the stash, once', () => {
  const m = startedMeta(5);
  const run = startDaily(m, 20261021);
  const crowns = m.crowns;
  winAll(m, run);
  assert.equal(run.cleared, true);
  assert.equal(run.over, true);
  const e = m.daily['20261021'];
  assert.equal(e.cleared, true);
  assert.equal(e.wave, 10);
  assert.equal(e.over, true);
  assert.equal(m.crowns - crowns, dailyCrowns(10), 'each wave paid its crowns');
  assert.equal(dailyCrowns(10), Array.from({ length: 10 }, (_, i) => dailyWaveCrowns(i + 1)).reduce((a, b) => a + b, 0));
  assert.equal(m.stash.length, 1);
  assert.deepEqual(m.stash[0], { army: 'daily', at: 3, tier: 0, seed: dailyChestSeed(m.seed, 20261021), daily: 20261021, bonus: e.stars });
  assert.match(dailyLine(m, 20261021), /cleared ✓$/);
  assert.ok(m.achievements.includes('daily'), 'Clear a daily');
  // (settling the clear again does not give a second chest)
  settleDaily(m, run, { won: true, stage: 10 });
  assert.equal(m.stash.length, 1);
});

test('a fall after the hearts are spent ends the daily with a smaller consolation and no chest', () => {
  const m = startedMeta(6);
  const run = startDaily(m, 20261021);
  const crowns = m.crowns;
  for (let stage = 1; stage <= 5; stage++) {
    startStage(run);
    finish(run, true, 2);
    settleDaily(m, run, { won: true, stage });
  }
  assert.equal(run.stage, 6);
  // wave 6 is lost: the hearts are spent one by one, then the run ends
  for (let heart = 0; heart < MAX_RETRIES; heart++) {
    assert.equal(canRetry(run), true);
    assert.ok(retryWave(run));
  }
  assert.equal(canRetry(run), false, 'no heart left');
  finish(run, false);
  const pay = settleDaily(m, run, { won: false, stage: 6 });
  assert.equal(run.over, true);
  assert.equal(run.cleared, undefined);
  assert.deepEqual(pay, { counted: true, crowns: 0, cleared: false, chest: false, bonus: 0 });
  assert.equal(m.crowns - crowns, dailyCrowns(5), 'the five cleared waves paid');
  assert.ok(dailyCrowns(5) < dailyCrowns(10) / 2, 'a smaller consolation than a clear');
  assert.equal(m.stash.length, 0);
  assert.equal(m.daily['20261021'].wave, 6);
  assert.equal(m.daily['20261021'].over, true);
  assert.equal(m.daily['20261021'].cleared, undefined);
  assert.match(dailyLine(m, 20261021), /fell at 6\/10$/);
  assert.equal(m.achievements.includes('daily'), false);
});

test('a practice run pays nothing and gives no chest, even when it clears the boss', () => {
  const m = startedMeta(7);
  startDaily(m, 20261021); // the first play of the date: left unplayed
  const practice = startDaily(m, 20261021);
  assert.equal(practice.mode?.kind === 'daily' && practice.mode.practice, true);
  const crowns = m.crowns;
  winAll(m, practice);
  assert.equal(practice.cleared, true);
  assert.equal(m.crowns, crowns);
  assert.equal(m.stash.length, 0);
  assert.equal(m.daily['20261021'].cleared, undefined);
  assert.equal(m.daily['20261021'].wave, undefined);
  assert.equal(m.achievements.includes('daily'), false);
});

test('the bonus stars: no heart spent and a quick clear, and they add to the chest', () => {
  const m = startedMeta(8);
  const run = startDaily(m, 20261021);
  winAll(m, run);
  // (the fights here are not fought: no battle time, no hearts, so both stars are earned)
  assert.deepEqual(dailyBonus(run).map((r) => r.earned), [true, true]);
  assert.equal(m.daily['20261021'].stars, 2);
  const slow = dailyRun(20261022);
  slow.cleared = true;
  slow.tally = { ms: DAILY_TIME_MS + 1, lost: 0, bossLost: 0 };
  slow.retries = 1;
  assert.deepEqual(dailyBonus(slow).map((r) => r.earned), [false, false]);
  const fell = dailyRun(20261022);
  assert.deepEqual(dailyBonus(fell).map((r) => r.earned), [false, false], 'no stars without a clear');
  for (const b of [0, 1, 2]) assert.ok(rollDailyChest(99, b).crowns >= Math.round((DAILY_CHEST_CROWNS + DAILY_BONUS_CROWNS * b) * 0.85) - 10);
  const sum = (b: number) => Array.from({ length: 50 }, (_, i) => rollDailyChest(i + 1, b).crowns).reduce((a, c) => a + c, 0);
  assert.ok(sum(2) > sum(1) && sum(1) > sum(0));
});

test('the daily chest holds crowns, summoning stones (more with bonus stars) and now and then gear, and gives no shard directly', () => {
  let gear = 0;
  for (let n = 0; n < 120; n++) {
    const m = startedMeta(100 + n);
    const owned = [...m.unlocked];
    const before = { unlock: { ...(m.unlock ?? {}) }, shards: { ...m.shards } };
    const bonus = n % 3;
    m.stash.push({ army: 'daily', at: 3, tier: 0, seed: dailyChestSeed(m.seed, 20261021 + n), daily: 20261021 + n, bonus });
    const peek = peekChest(m, 0)!;
    assert.equal(peek.kind, 'daily');
    assert.equal(peek.army, 'daily');
    assert.equal(m.stones ?? 0, 0, 'peeking gives nothing');
    const crowns = m.crowns;
    const loot = openChest(m, 0)!;
    assert.equal(m.stash.length, 0, 'the chest leaves the stash');
    assert.equal(loot.kind, 'daily');
    assert.equal(openChest(m, 0), null, 'it opens once');
    assert.ok(m.crowns > crowns, 'crowns paid');
    assert.equal(m.stones, DAILY_CHEST_STONES + bonus, 'a base of stones, one more for each bonus star');
    assert.deepEqual(m.unlocked, owned);
    assert.deepEqual(m.unlock ?? {}, before.unlock);
    assert.deepEqual(m.shards, before.shards);
    gear += loot.items.filter((i) => i.type === 'gear').length;
    assert.equal(m.equipment?.length ?? 0, loot.items.filter((i) => i.type === 'gear').length, 'gear is granted when it is opened');
  }
  assert.ok(gear > 20 && gear < 100, `a chance of gear, not always (${gear} of 120)`);
});

test('a daily chest rolls the same from its seed, and its seed is the save and the date', () => {
  assert.deepEqual(rollDailyChest(77, 1), rollDailyChest(77, 1));
  assert.notDeepEqual(rollDailyChest(77, 1), rollDailyChest(78, 1));
  assert.notEqual(dailyChestSeed(1, 20261021), dailyChestSeed(1, 20261022));
  assert.notEqual(dailyChestSeed(1, 20261021), dailyChestSeed(2, 20261021));
  const m = startedMeta(3);
  m.stash.push({ army: 'daily', at: 3, tier: 0, seed: 5, daily: 20261021, bonus: 1 });
  assert.deepEqual(peekChest(m, 0), peekChest(m, 0));
});

test('the stash keeps a daily chest through a save, drops a broken one, and the cart shows it beside a silver chest', () => {
  const s = store();
  const m = startedMeta(4);
  m.stash.push({ army: 'daily', at: 3, tier: 0, seed: 11, daily: 20261021, bonus: 2 });
  saveMeta(m, s);
  const back = loadMeta(1, s);
  assert.deepEqual(back.stash, [{ army: 'daily', at: 3, tier: 0, seed: 11, daily: 20261021, bonus: 2 }]);
  const raw = [
    { army: 'daily', at: 3, tier: 0, seed: 1, daily: 20261021 },
    { army: 'daily', at: 3, tier: 0, seed: 2, daily: 20261021 },
    { army: 'daily', at: 3, tier: 0, seed: 3, daily: 'x' },
    { army: 'daily', at: 3, tier: 0, seed: 4 },
  ];
  assert.deepEqual(readStash(raw, undefined, 1), [{ army: 'daily', at: 3, tier: 0, seed: 1, daily: 20261021, bonus: 0 }], 'one a date, and only with a date');
  assert.equal(bestChest([{ army: 'orcs', at: 3, tier: 0 }, { army: 'daily', at: 3, tier: 0, daily: 20261021 }]), 1, 'a daily chest outranks a bronze one');
  assert.equal(bestChest([{ army: 'orcs', at: 10, tier: 0 }, { army: 'daily', at: 3, tier: 0, daily: 20261021 }]), 0, 'and yields to a gold one');
});

test('records from before the fixed daily still load, and read as a fall', () => {
  const raw = { seed: 3, crowns: 5, unlocked: ['knight', 'archer', 'wizard'], pulls: 0, dry: 0, shards: {}, stars: {}, xp: {}, daily: { '20261001': { best: 880, plays: 2 }, '20261002': { best: 0, plays: 1 }, '20261003': { best: 1000, plays: 1, cleared: 'yes', wave: 99, stars: 9, over: 1 } } };
  const m = loadMeta(1, { getItem: () => JSON.stringify(raw) });
  assert.deepEqual(m.daily['20261001'], { best: 880, plays: 2 });
  assert.deepEqual(m.daily['20261002'], { best: 0, plays: 1 });
  assert.deepEqual(m.daily['20261003'], { best: 1000, plays: 1, wave: 10, stars: 2 }, 'the new fields are read only when they make sense');
  assert.match(dailyLine(m, 20261001), /fell at 9\/10$/);
  assert.match(dailyLine(m, 20261002), /wave 1\/10$/);
});

test('the daily plays out the same every time: a date, a save and a greedy player give one result', () => {
  for (const date of [20261021, 20261022]) {
    const a = playDaily(startedMeta(9), date);
    const b = playDaily(startedMeta(9), date);
    assert.deepEqual(a, b);
  }
});

test('a greedy player with a fresh save, casting its spells, clears the daily most days but not all (about 60 to 75% with the hearts)', () => {
  let cleared = 0;
  const dates = days(56);
  for (const [i, date] of dates.entries()) if (playDaily(startedMeta(i + 1), date, true).cleared) cleared++;
  const rate = cleared / dates.length;
  assert.ok(rate >= 0.5 && rate <= 0.85, `clear rate ${Math.round(rate * 100)}%`);
});

test('a daily saved by an older version past the tenth wave is dropped on load, not started (it broke the page)', () => {
  const m = startedMeta(3);
  const run = startDaily(m, 20261021);
  const store = new Map<string, string>();
  const io = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  saveRun({ ...run, stage: DAILY_WAVES + 4, best: DAILY_WAVES + 4 }, io);
  assert.equal(loadRun(io), null);
  saveRun({ ...run, stage: 3 }, io);
  assert.equal(loadRun(io)?.stage, 3);
});
