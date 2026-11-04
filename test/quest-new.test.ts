// The new quests and battles of QUESTS-3 (Q6 to Q8): the data whole, every battle opened by a quest, its rules valid and its waves
// able to meet them, the campaign parts in order, and the stars inside the estimate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEW_QUESTS } from '../src/sim/questData/newQuests';
import { NEW_BATTLES, questBattleById } from '../src/sim/questBattles';
import { QUESTS, questById } from '../src/sim/questData';
import { lengthOf, starEstimate, starsOf } from '../src/sim/questStars';
import { UNITS } from '../src/sim/units';
import { slotOf } from '../src/sim/quests';

test('every new quest carries its own stars and length, within one star of the estimate', () => {
  assert.ok(NEW_QUESTS.length >= 22);
  for (const q of NEW_QUESTS) {
    assert.ok(q.stars && q.stars >= 1 && q.stars <= 5 && q.length, q.id);
    assert.ok(Math.abs(starsOf(q) - starEstimate(q)) <= 1, `${q.id}: ${starsOf(q)} vs ${starEstimate(q)}`);
    assert.ok(q.reward.stones === undefined, `${q.id}: the game prices stones`);
    assert.ok(!/\b(\d[\d,]*|ten|twenty|thirty|forty|fifty) (crowns|stones)\b/i.test([...q.offer, ...q.done, q.going].join(' ')), `${q.id} names its pay`);
  }
});

test('a campaign is offered as a campaign: its parts follow each other, in the campaign slot, and the stars do not fall back', () => {
  const camp = NEW_QUESTS.filter((q) => lengthOf(q) === 'campaign');
  for (const q of camp) {
    assert.equal(slotOf(q), 'campaign', q.id);
    if (q.after) {
      const before = questById(q.after)!;
      assert.ok(before && lengthOf(before) === 'campaign', `${q.id}: after ${q.after}`);
      assert.ok(starsOf(q) >= starsOf(before) - 1, `${q.id}: the stars do not fall away along the story`);
    }
  }
  // (every story is 5 or more parts, and has one first part)
  const firsts = camp.filter((q) => !q.after);
  for (const first of firsts) {
    let n = 1;
    for (let c = camp.find((x) => x.after === first.id); c; c = camp.find((x) => x.after === c!.id)) n++;
    assert.ok(n >= 5 && n <= 8, `${first.id}: ${n} parts`);
  }
});

test('every new battle is opened by one quest, has rules that its waves can meet, and a cast of heroes in the game', () => {
  assert.ok(NEW_BATTLES.length >= 4);
  for (const qb of NEW_BATTLES) {
    const opener = QUESTS.filter((q) => q.goal.kind === 'battle' && q.goal.battle === qb.id);
    assert.equal(opener.length, 1, `${qb.id} is opened by one quest`);
    assert.ok(qb.waves.length >= 1 && qb.waves.length <= 5, qb.id);
    for (const w of qb.waves) for (const f of w.foes) assert.ok(UNITS[f], `${qb.id}: foe ${f}`);
    for (const slot of qb.cast) for (const k of slot.heroes) assert.ok(UNITS[k]?.side === 'hero', `${qb.id}: hero ${k}`);
    const r = qb.rules;
    if (r?.protect) assert.ok(UNITS[r.protect.kind]?.summon && UNITS[r.protect.kind].side === 'hero', `${qb.id}: guest ${r.protect.kind}`);
    if (r?.spare) assert.ok(qb.waves.some((w) => w.foes.includes(r.spare!)), `${qb.id}: the spared foe stands in a wave`);
    if (r?.survive !== undefined) assert.ok(r.survive >= 30 && r.survive <= 300, `${qb.id}: survive ${r.survive}`);
    if (r?.race !== undefined) assert.ok(r.race >= 30 && r.race <= 600, `${qb.id}: race ${r.race}`);
    // (a battle without a boss is a survive battle; every other ends on a boss of its own)
    if (!r?.survive && !r?.protect) assert.ok(qb.boss && qb.waves.some((w) => w.boss), `${qb.id}: a boss`);
    assert.ok(questBattleById(qb.id) === qb);
    const q = opener[0];
    assert.ok(starsOf(q) >= 3, `${qb.id}: a battle is three stars and up`);
  }
});

test('every new battle can be started and fought: its rules are in the fight, and the fight ends or runs on without a fault', async () => {
  const { startedMeta } = await import('../src/sim/meta');
  const { startQuestBattle } = await import('../src/sim/questRun');
  const { startStage } = await import('../src/sim/run');
  const { castOf } = await import('../src/sim/questBattles');
  const { fight, place, stepBattle } = await import('../src/sim/battle');
  const { D, DEPLOY_ROWS, standable, tileAt } = await import('../src/sim/board');
  for (const qb of NEW_BATTLES) {
    const m = startedMeta(5);
    const cast = castOf({ unlocked: [...new Set([...m.unlocked, ...qb.cast.flatMap((s) => s.heroes.slice(0, 1))])] }, qb)!;
    m.unlocked = [...new Set([...m.unlocked, ...cast])];
    const opener = QUESTS.find((q) => q.goal.kind === 'battle' && q.goal.battle === qb.id)!;
    m.quests = { active: [{ id: opener.id, progress: 0, took: 20261030, v: 1 }], offers: [], done: [] };
    const run = startQuestBattle(m, qb.id, cast)!;
    assert.ok(run, `${qb.id} starts`);
    // (every wave of it can be made, a boss wave too: a boss must be one the armies' own stat table knows)
    for (let n = 1; n <= qb.waves.length; n++) assert.ok(startStage({ ...run, stage: n }), `${qb.id} wave ${n}`);
    const b = startStage(run);
    assert.deepEqual(b.rules, qb.rules, `${qb.id}: the rules are in the fight`);
    const spots: [number, number][] = [];
    for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
    cast.forEach((k, i) => place(b, k, ...spots[i * 3], i + 1));
    assert.ok(fight(b), `${qb.id} begins`);
    if (qb.rules?.protect) assert.ok(b.guard !== undefined, `${qb.id}: the guest joined`);
    for (let i = 0; i < 1500 && b.phase === 'fight'; i++) stepBattle(b);
  }
});

test('a time limit is for three stars and up: no quest of one or two stars carries one', () => {
  for (const q of QUESTS) if (q.within) assert.ok(starsOf(q) >= 3, `${q.id}: ${starsOf(q)} stars with ${q.within} days`);
});
