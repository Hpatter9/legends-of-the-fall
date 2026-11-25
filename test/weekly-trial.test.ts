// WEEKLY-TRIAL (docs/notes/weekly-trial.md): the week's trial: its choice by week, every rule, the entry limit and the rewards paid once.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, hurt, startBattle, type Battle, type BattleEvent, type Stage } from '../src/sim/battle';
import { ARMIES } from '../src/sim/armies';
import { classOf } from '../src/sim/armyWeakness';
import { loadMeta, newMeta, pickStarter, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { FIXED_PACKS } from '../src/sim/starter';
import { armyRun, canJoin, finish, startStage, type Run } from '../src/sim/run';
import { botBoost } from '../src/sim/autoplay';
import { xpFor } from '../src/sim/levels';
import { isMythic } from '../src/sim/mythicRules';
import { TRAITS } from '../src/sim/traits';
import { mergedRule, trialAllows, trialArmy, trialHost, trialRulesOf, trialSeed, trialWeek, TRIAL_MID, TRIAL_RULE_IDS, TRIAL_RULES, TRIAL_SWARM_HP, TRIAL_WAVES, TRIAL_WEEKS } from '../src/sim/trialRules';
import { dropLoanXp, isLent, lentStanding, trialLoans, markTrialSeen, readTrial, settleTrial, startTrial, trialBlock, trialEntrants, trialFive, trialIsNew, trialRecord, trialStatus, trialTitle, trialTriesLeft, trialWeekOf, TRIAL_TIERS, TRIAL_WEEK_PAY } from '../src/sim/trial';

const CLASSES = Object.values(TRAITS).filter((t) => t.kind === 'class').map((t) => t.id);
/** A Monday, and the week it starts. */
const MON = 20261123;
const WEEK = trialWeekOf(MON);
/** The week of the rotation with this rule (its first). */
const weekWith = (rule: string): number => {
  const i = TRIAL_WEEKS.findIndex((w) => w.rules.includes(rule));
  return WEEK - (WEEK % TRIAL_WEEKS.length) + i + TRIAL_WEEKS.length;
};
/** A Monday of the given week. */
const mondayOf = (week: number): number => {
  const d = new Date(Date.UTC(2026, 10, 23) + (week - WEEK) * 7 * 86400000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
/** A save that owns these heroes. */
const owning = (kinds: string[], seed = 5): Meta => {
  const m = startedMeta(seed);
  m.unlocked = [...kinds];
  m.party = [...kinds];
  return m;
};
const WIDE = ['knight', 'paladin', 'sage', 'priestess', 'samurai', 'barbarian', 'kunoichi', 'archer', 'ranger', 'wizard', 'werewolf', 'cleric', 'druid', 'rifleBot', 'mercenary', 'juggernaut', 'lancer'];

test('the week turns on Monday, and every day of a week has the same trial', () => {
  assert.equal(trialWeekOf(20261122) + 1, WEEK, 'Sunday is the week before');
  for (let d = 23; d <= 29; d++) assert.equal(trialWeekOf(20261100 + d), WEEK);
  assert.equal(trialWeekOf(20261130), WEEK + 1);
  // (across a month and a year)
  assert.equal(trialWeekOf(20270101), trialWeekOf(20261228));
  assert.equal(trialWeekOf(20270104), trialWeekOf(20261228) + 1);
});

test('the trial is chosen by the week alone: the same for everyone, a fixed twelve-week cycle, never the same rules two weeks running', () => {
  for (let w = WEEK; w < WEEK + 40; w++) {
    assert.deepEqual(trialWeek(w), trialWeek(w + TRIAL_WEEKS.length));
    assert.notDeepEqual(trialWeek(w).rules, trialWeek(w + 1).rules);
    assert.equal(trialSeed(w), trialSeed(w), 'the seed is the week’s');
  }
  assert.notEqual(trialSeed(WEEK), trialSeed(WEEK + 1));
  // (negative or odd weeks never break it)
  assert.ok(trialWeek(-5).army);
  // (every rule is in the rotation, and every army)
  for (const id of TRIAL_RULE_IDS) assert.ok(TRIAL_WEEKS.some((w) => w.rules.includes(id)), id);
  for (const a of ARMIES) assert.ok(TRIAL_WEEKS.some((w) => w.army === a.id), a.id);
  assert.ok(TRIAL_RULE_IDS.length >= 8 && TRIAL_RULE_IDS.length <= 12);
  for (const w of TRIAL_WEEKS) assert.ok(w.rules.length >= 1 && w.rules.length <= 2);
});

test('the rules are written for the card and name real classes', () => {
  for (const r of Object.values(TRIAL_RULES)) {
    assert.ok(r.name && r.text.length > 10 && r.text.length < 100, r.id);
    for (const c of [...r.shine, ...(r.only ?? []), ...(r.bar ?? []), ...(r.fx?.classAtk?.classes ?? []), ...(r.fx?.reflect?.classes ?? [])]) assert.ok(CLASSES.includes(c), `${r.id}: ${c}`);
    assert.doesNotMatch(r.text, /\b(color|armor|honor)\b/i, 'British spelling');
  }
});

test('the starter packs’ heroes are favoured in some weeks, and every starter can enter most weeks', () => {
  const starters = [...new Set(FIXED_PACKS.flatMap((p) => p.heroes))];
  for (const k of starters) assert.ok(TRIAL_WEEKS.some((_, i) => mergedRule(i).shine.includes(classOf(k)!)), `${k} shines some week`);
  for (const p of FIXED_PACKS) assert.ok(TRIAL_WEEKS.filter((_, i) => p.heroes.some((k) => trialAllows(i, k))).length >= TRIAL_WEEKS.length - 1, p.id);
});

test('the trial is seven waves of the week’s army: a mid-boss at four and its last boss at seven', () => {
  for (let w = WEEK; w < WEEK + TRIAL_WEEKS.length; w++) {
    const a = trialArmy(w);
    assert.equal(a.waves.length, TRIAL_WAVES);
    assert.equal(a.waves[TRIAL_MID - 1].boss, 'mid');
    assert.equal(a.waves[TRIAL_WAVES - 1].boss, 'final');
    const host = trialHost(w);
    assert.equal(a.waves[TRIAL_WAVES - 1].foes[0], host.waves[host.waves.length - 1].foes[0]);
  }
});

// ---- the rules, one at a time ----

test('who may enter: only some classes, some barred, and one of each class', () => {
  const kin = weekWith('wildKin');
  assert.ok(trialAllows(kin, 'werewolf') && trialAllows(kin, 'druid'));
  assert.ok(!trialAllows(kin, 'knight'));
  const m = owning(WIDE);
  assert.ok(trialEntrants(m, kin).every((k) => ['beast', 'warden'].includes(classOf(k)!)));
  const heal = weekWith('noHealers');
  assert.ok(!trialAllows(heal, 'priestess') && !trialAllows(heal, 'cleric'));
  assert.ok(trialFive(m, heal).every((k) => !['support', 'warden'].includes(classOf(k)!)));
  const each = weekWith('oneEach');
  const five = trialFive(m, each);
  assert.equal(new Set(five.map(classOf)).size, five.length, 'one of each class');
  // (the run holds to it: a barred hero, or a second of a class, cannot join the squad)
  const run = startTrial(m, mondayOf(each))!;
  const add = (kind: string) => (run.roster.push({ id: run.nextId, kind, grade: 1 }), run.nextId++);
  const twin = run.roster.find((h) => run.squad.includes(h.id) && WIDE.some((k) => k !== h.kind && classOf(k) === classOf(h.kind)))!;
  const sameClass = WIDE.find((k) => k !== twin.kind && classOf(k) === classOf(twin.kind))!;
  run.squad = [twin.id];
  assert.equal(canJoin(run, add(sameClass)), false);
  const healRun = startTrial(m, mondayOf(heal))!;
  healRun.squad = [];
  healRun.roster.push({ id: healRun.nextId, kind: 'cleric', grade: 1 });
  assert.equal(canJoin(healRun, healRun.nextId), false);
  healRun.roster.push({ id: healRun.nextId + 1, kind: 'knight', grade: 1 });
  assert.equal(canJoin(healRun, healRun.nextId + 1), true);
  // (Hire draws only from the heroes the week admits)
  assert.ok(healRun.pool!.every((k) => trialAllows(heal, k)));
});

/** One blow from each hero kind on a foe, in a fight with the stage given; the harm dealt. */
function dealt(stage: Stage, kinds: string[]): number[] {
  const b: Battle = bareBoard(startBattle(7, 'skeletons', stage));
  const foe = b.units.find((u) => u.side === 'foe')!;
  foe.maxHp = foe.hp = 100_000;
  const out: BattleEvent[] = [];
  return kinds.map((k, i) => {
    const h = addUnit(b, k, i, 0);
    const before = foe.hp;
    hurt(b, h, foe, 200, false, false, out, 'skill');
    return before - foe.hp;
  });
}

test('a class’s harder blows: the classes named deal the share more, the others as before', () => {
  for (const id of ['powder', 'spellstorm', 'moonless', 'charge', 'wildKin']) {
    const fx = TRIAL_RULES[id].fx!;
    const kinds = ['archer', 'rifleBot', 'wizard', 'sage', 'kunoichi', 'mercenary', 'lancer', 'samurai', 'werewolf', 'druid', 'knight'];
    const plain = dealt({}, kinds);
    const ruled = dealt({ trial: { fx } }, kinds);
    kinds.forEach((k, i) => {
      const on = fx.classAtk!.classes.includes(classOf(k)!);
      assert.equal(ruled[i], on ? Math.round(plain[i] * fx.classAtk!.mult) : plain[i], `${id}: ${k}`);
    });
  }
});

test('Shield Wall: a Bulwark or Guardian turns a share of a foe’s blow back on it; others do not, nor splash', () => {
  const fx = TRIAL_RULES.shieldWall.fx!;
  const back = (kind: string, trial: boolean, splash = false): number => {
    const b: Battle = bareBoard(startBattle(7, 'skeletons', trial ? { trial: { fx } } : {}));
    const foe = b.units.find((u) => u.side === 'foe')!;
    foe.maxHp = foe.hp = 100_000;
    const h = addUnit(b, kind, 3, 0);
    h.maxHp = h.hp = 100_000;
    hurt(b, foe, h, 300, false, splash, [], 'blow');
    return 100_000 - foe.hp;
  };
  assert.equal(back('knight', false), 0);
  assert.ok(back('knight', true) > 0, 'the guardian turns it back');
  assert.ok(back('juggernaut', true) > 0, 'the bulwark turns it back');
  assert.equal(back('archer', true), 0);
  assert.equal(back('knight', true, true), 0, 'not splash');
});

test('the fight’s twists and healing: fog, a wound and doubled healing, mana, pace; and a horde’s thin foes', () => {
  const m = owning(WIDE);
  const stageOf = (rule: string): ReturnType<typeof startStage> => startStage(startTrial(m, mondayOf(weekWith(rule)))!);
  assert.equal(stageOf('fog').twist?.fog, 1);
  const ll = stageOf('lastLight');
  assert.equal(ll.twist?.wound, TRIAL_RULES.lastLight.twist!.wound);
  assert.equal(ll.heroHeal, 2);
  assert.equal(stageOf('spellstorm').twist?.mana, 1.5);
  assert.equal(stageOf('charge').twist?.pace, 1.15);
  // (a horde: twice the foes of a field wave, each at a share of its health)
  const hw = weekWith('horde');
  const plainWeek = weekWith('fog');
  const horde = trialArmy(hw).waves[0].foes.length;
  const host = trialHost(hw);
  const field = host.waves.filter((w) => !w.boss)[0].foes.length;
  assert.ok(horde > field);
  const hb = startStage(startTrial(owning(WIDE, 6), mondayOf(hw))!);
  assert.ok(hb.foeBoost!.hp! < startStage(startTrial(owning(WIDE, 6), mondayOf(plainWeek))!).foeBoost!.hp! * TRIAL_SWARM_HP * 1.6);
  // (every trial wave keeps its army's weaknesses and carries the rules' blows)
  const pw = stageOf('powder');
  assert.equal(pw.foeArmy, trialHost(weekWith('powder')).id);
  assert.ok(pw.trial?.fx.classAtk);
});

test('a fight outside the trial has none of it: an army run, the daily, a bare fight', () => {
  const run = armyRun(3, 'golems', ['knight', 'wizard', 'samurai'], undefined, 0);
  const b = startStage(run);
  assert.equal(b.trial, undefined);
  assert.equal(b.twist, undefined);
  assert.equal(startBattle(3, 'skeletons').trial, undefined);
  // (and the same blows land the same with no trial set)
  assert.deepEqual(dealt({}, ['archer', 'wizard']), dealt({}, ['archer', 'wizard']));
});

// ---- entry and rewards ----

test('one try a day; the next day another; a save with no hero the week admits cannot enter', () => {
  const m = owning(WIDE);
  const day = mondayOf(WEEK);
  assert.equal(trialTriesLeft(m, day), 1);
  assert.ok(startTrial(m, day));
  assert.equal(trialTriesLeft(m, day), 0);
  assert.equal(trialBlock(m, day), 'tried');
  assert.equal(startTrial(m, day), null);
  assert.equal(trialTriesLeft(m, day + 1), 1);
  assert.ok(startTrial(m, day + 1));
  assert.deepEqual(trialRecord(m, WEEK).days, [day, day + 1]);
  // (a new week: a fresh record, its tries anew)
  const next = mondayOf(WEEK + 1);
  assert.equal(trialTriesLeft(m, next), 1);
  // (the Wild Kin's week, and a save of only the first five: none of its own may enter, but heroes are lent, so it can still take part)
  const plain = owning(['knight', 'samurai', 'kunoichi', 'archer', 'wizard']);
  assert.equal(trialBlock(plain, mondayOf(weekWith('wildKin'))), null);
  assert.ok(startTrial(plain, mondayOf(weekWith('wildKin'))));
});

test('the loan: a week that shuts out the save’s heroes lends heroes of the classes it admits, the same for everyone, at the save’s level', () => {
  const kin = weekWith('wildKin');
  const starters = ['knight', 'samurai', 'archer'];
  const m = owning(starters);
  for (const k of starters) m.xp[k] = xpFor(12);
  const lent = trialLoans(m, kin);
  assert.equal(lent.length, 5, 'the five filled');
  for (const k of lent) {
    assert.ok(['beast', 'warden'].includes(classOf(k)!), k);
    assert.ok(!m.unlocked.includes(k), 'never one the save owns');
    assert.ok(!isMythic(k));
  }
  // (from the week's seed: another save is lent the same, bar what it owns)
  assert.deepEqual(trialLoans(owning(['peasant', 'kunoichi', 'wizard'], 9), kin), lent);
  const withOne = owning([...starters, lent[0]]);
  assert.deepEqual(trialLoans(withOne, kin).slice(0, 4), lent.slice(1, 5));
  // (the run: the lent heroes in the squad, marked in its mode, at the save's typical level; Hire may draw them too)
  const run = startTrial(m, mondayOf(kin))!;
  assert.deepEqual(run.roster.map((h) => h.kind), lent);
  assert.equal(run.mode?.kind, 'trial');
  const loan = run.mode?.kind === 'trial' ? run.mode.loan! : undefined!;
  assert.deepEqual(loan.kinds, lent);
  assert.equal(loan.level, 12);
  assert.ok(lent.every((k) => isLent(run, k) && run.pool!.includes(k)));
  const h = run.roster[0];
  assert.deepEqual(lentStanding(run, h.kind), { level: 12, rank: loan.rank });
  assert.equal(lentStanding(run, 'knight'), undefined);
  // (it fights at the loan's level: stronger than the same kind at the save's own level for it, which is 1)
  assert.ok(botBoost(m, h, run).atk! > botBoost(m, h).atk!);
  // (they earn nothing lasting)
  assert.deepEqual(dropLoanXp(run, { [lent[0]]: 50, knight: 7 }), { knight: 7 });
  // (a normal week: a save's own heroes, however few, and nothing lent; nor when the rules shut out none of them)
  assert.deepEqual(trialLoans(m, weekWith('powder')), []);
  assert.equal(startTrial(owning(starters, 4), mondayOf(weekWith('powder')))!.mode?.kind === 'trial' && 'loan' in startTrial(owning(starters, 4), mondayOf(weekWith('powder')) + 1)!.mode!, false);
  // (No Healers with a cleric among four: the rules shut it out, so the five are filled by a loan)
  const four = owning(['knight', 'samurai', 'archer', 'cleric']);
  const nh = trialLoans(four, weekWith('noHealers'));
  assert.equal(nh.length, 2);
  assert.ok(nh.every((k) => trialAllows(weekWith('noHealers'), k)));
});

/** Finish the run's waves: `won` of them won, then a loss (or the clear, when all are won). */
function playTo(run: Run, m: Meta, won: number): number[] {
  const paid: number[] = [];
  for (let n = 1; n <= TRIAL_WAVES && !run.over; n++) {
    finish(run, n <= won, 0);
    paid.push(...settleTrial(m, run).tiers.map((t) => t.waves));
  }
  return paid;
}

test('rewards: each tier paid once a week, by the furthest wave; a new week pays again; a run of a past week pays nothing', () => {
  const m = owning(WIDE);
  const day = mondayOf(WEEK);
  const c0 = m.crowns;
  const s0 = m.stones ?? 0;
  // (three waves, then a loss: the first tier)
  assert.deepEqual(playTo(startTrial(m, day)!, m, 3), [3]);
  assert.equal(m.crowns, c0 + TRIAL_TIERS[0].crowns);
  // (the next day, all seven: the other two, not the first again)
  const run = startTrial(m, day + 1)!;
  assert.deepEqual(playTo(run, m, TRIAL_WAVES), [5, 7]);
  assert.deepEqual(run.trialPaid, [5, 7]);
  assert.equal(m.crowns, c0 + TRIAL_WEEK_PAY.crowns);
  assert.equal(m.stones, s0 + TRIAL_WEEK_PAY.stones);
  assert.equal(m.trial!.laurels, 1);
  assert.equal(trialStatus(m, WEEK), 'cleared ✓');
  // (again the same week: nothing more)
  assert.deepEqual(playTo(startTrial(m, day + 2)!, m, TRIAL_WAVES), []);
  assert.equal(m.crowns, c0 + TRIAL_WEEK_PAY.crowns);
  assert.equal(m.trial!.laurels, 1);
  // (a run begun last week, finished after the week turned: nothing)
  const late = startTrial(m, day + 6)!;
  startTrial(m, mondayOf(WEEK + 1));
  assert.deepEqual(playTo(late, m, TRIAL_WAVES), []);
  // (the new week pays again)
  assert.deepEqual(playTo(startTrial(m, mondayOf(WEEK + 1) + 1)!, m, TRIAL_WAVES), [3, 5, 7]);
  assert.equal(m.trial!.laurels, 2);
  assert.equal(trialTitle(m.trial!.laurels!), 'Trialbreaker');
  assert.equal(trialTitle(0), null);
});

test('a week’s pay is about a daily’s worth: a few stones and some crowns', () => {
  assert.ok(TRIAL_WEEK_PAY.stones >= 3 && TRIAL_WEEK_PAY.stones <= 5);
  assert.ok(TRIAL_WEEK_PAY.crowns >= 150 && TRIAL_WEEK_PAY.crowns <= 250);
  assert.deepEqual(TRIAL_TIERS.map((t) => t.waves), [3, 5, TRIAL_WAVES]);
  assert.ok(TRIAL_TIERS[TRIAL_TIERS.length - 1].laurel);
});

test('the new-week pip, and the save keeps the record (and reads a bad one safely)', () => {
  const m = newMeta(3);
  pickStarter(m, 0);
  assert.equal(trialIsNew(m, WEEK), true);
  markTrialSeen(m, WEEK);
  assert.equal(trialIsNew(m, WEEK), false);
  assert.equal(trialIsNew(m, WEEK + 1), true);
  m.trial!.cur = { week: WEEK, best: 5, paid: [3, 5], days: [MON] };
  m.trial!.laurels = 2;
  const data: Record<string, string> = {};
  const st = { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null };
  assert.ok(saveMeta(m, st));
  assert.deepEqual(loadMeta(1, st).trial, m.trial);
  assert.equal(readTrial(undefined), undefined);
  assert.equal(readTrial('junk'), undefined);
  assert.deepEqual(readTrial({ cur: { week: 4, best: 99, paid: [3, 'x', 3], days: ['a', MON] }, laurels: -2 }), { cur: { week: 4, best: TRIAL_WAVES, paid: [3], days: [MON] } });
  // (a save from before has none, and loads)
  const old = newMeta(4);
  delete (old as { trial?: unknown }).trial;
  assert.ok(saveMeta(old, st));
  assert.equal(loadMeta(1, st).trial, undefined);
});

test('the trial is deterministic: the same save and week play the same', () => {
  const a = startTrial(owning(WIDE, 9), MON)!;
  const b = startTrial(owning(WIDE, 9), MON)!;
  assert.deepEqual(a, b);
  assert.equal(a.seed, trialSeed(WEEK));
  assert.deepEqual(trialRulesOf(WEEK).map((r) => r.id), [...trialWeek(WEEK).rules]);
});

test('the page’s clock: the day and the week’s turn are Mountain time’s, Monday 00:00', async () => {
  const { trialDayKey, trialMsLeft, timeLeftWords } = await import('../src/trialClock');
  // (Monday 23 November 2026, 06:30 UTC is still Sunday 23:30 in Denver, MST, UTC-7)
  const sundayLate = new Date(Date.UTC(2026, 10, 23, 6, 30));
  assert.equal(trialDayKey(sundayLate), 20261122);
  assert.equal(trialMsLeft(sundayLate), 30 * 60_000);
  // (07:00 UTC is Monday 00:00 there: a new week, seven days to go)
  const mondayStart = new Date(Date.UTC(2026, 10, 23, 7, 0));
  assert.equal(trialDayKey(mondayStart), 20261123);
  assert.equal(trialWeekOf(trialDayKey(mondayStart)), trialWeekOf(trialDayKey(sundayLate)) + 1);
  assert.equal(trialMsLeft(mondayStart), 7 * 86400_000);
  // (summer: MDT, UTC-6)
  assert.equal(trialDayKey(new Date(Date.UTC(2026, 6, 6, 5, 59))), 20260705);
  assert.equal(trialDayKey(new Date(Date.UTC(2026, 6, 6, 6, 0))), 20260706);
  assert.equal(timeLeftWords(3 * 86400_000 + 4 * 3600_000 + 5), '3 days 4 h left');
  assert.equal(timeLeftWords(5 * 3600_000 + 12 * 60_000), '5 h 12 min left');
  assert.equal(timeLeftWords(30_000), '1 min left');
});
