import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barOf, countAt, growthAt, heroGrowth, learntBetween, mvpLine, partyRows, questLines, questMoves, resultLines, statRises, statsAt, xpToNext } from '../src/sim/jrpgRecap';
import { KITS, ULT_LEVEL } from '../src/sim/abilities';
import { HERO_KITS, SKILL2_LEVEL } from '../src/sim/heroKits';
import { lastingBoost, levelBoost, levelOf, RUN_MAX_LEVEL, xpFor } from '../src/sim/levels';
import { UNITS } from '../src/sim/units';
import { waveNotes } from '../src/sim/waveCard';
import { newRun } from '../src/sim/run';
import { noteXpStart, recapOf } from '../src/sim/runRecap';

test('a hero that rises a level shows the hp and attack it gained, old and new, from the real level rules', () => {
  const g = heroGrowth('knight', xpFor(4) + 10, xpFor(6) + 5);
  assert.equal(g.from, 4);
  assert.equal(g.to, 6);
  assert.equal(g.gained, xpFor(6) + 5 - xpFor(4) - 10);
  const def = UNITS.knight;
  const hp = [Math.round(def.hp * lastingBoost(4).hp), Math.round(def.hp * lastingBoost(6).hp)];
  const atk = [Math.round(def.atk * lastingBoost(4).atk), Math.round(def.atk * lastingBoost(6).atk)];
  assert.deepEqual(g.stats, [
    { stat: 'HP', from: hp[0], to: hp[1], gain: hp[1] - hp[0] },
    { stat: 'ATK', from: atk[0], to: atk[1], gain: atk[1] - atk[0] },
  ]);
  assert.ok(g.stats.every((s) => s.gain > 0));
});

test('no level gained: no stats risen, only the bar moves', () => {
  const g = heroGrowth('archer', xpFor(3) + 1, xpFor(3) + 40);
  assert.equal(g.from, 3);
  assert.equal(g.to, 3);
  assert.deepEqual(g.stats, []);
  assert.deepEqual(g.learnt, []);
  assert.ok(g.fillTo > g.fillFrom);
});

test('a rank or grade multiplies the stats shown; a run hero reads the run rules', () => {
  assert.equal(statsAt('knight', 5, 'lasting', { hp: 2, atk: 3 }).hp, Math.round(UNITS.knight.hp * lastingBoost(5).hp * 2));
  assert.equal(statsAt('knight', 5, 'run').atk, Math.round(UNITS.knight.atk * levelBoost(5).atk));
  assert.deepEqual(statRises('knight', 5, 5), []);
  // (a run's levels stop at 30, a kind's lasting level goes on)
  const big = xpFor(40);
  assert.equal(heroGrowth('knight', 0, big, 'run').to, RUN_MAX_LEVEL);
  assert.equal(heroGrowth('knight', 0, big, 'lasting').to, 40);
  assert.equal(heroGrowth('knight', 0, big, 'run').top, true);
  assert.equal(barOf(big, 'run').fill, 1);
});

test('skill 2 at level 10 and the ultimate at 30 are announced by name, with the deep milestones\' talent point and badge', () => {
  const s2 = HERO_KITS().knight.s2.skill.name;
  assert.deepEqual(learntBetween('knight', SKILL2_LEVEL - 1, SKILL2_LEVEL), [{ kind: 'skill', text: `New skill: ${s2}!` }]);
  assert.deepEqual(learntBetween('knight', SKILL2_LEVEL, SKILL2_LEVEL + 1), []);
  const ult = KITS.knight.ultimate!;
  assert.ok(learntBetween('knight', ULT_LEVEL - 1, ULT_LEVEL).some((l) => l.kind === 'ult' && l.text === `Ultimate unlocked: ${ult.name}!`));
  const deep = learntBetween('knight', 39, 40);
  assert.deepEqual(deep.map((l) => l.kind), ['talent', 'badge']);
  assert.equal(deep[1].text, 'Iron badge earned');
  assert.equal(learntBetween('knight', 35, 52).find((l) => l.kind === 'talent')?.text, 'Talent points +2');
  // (a run's own levels have no milestones)
  assert.deepEqual(learntBetween('knight', 29, 30, 'run').map((l) => l.kind), ['ult']);
  // (a jump over both opens both, in order)
  assert.deepEqual(heroGrowth('knight', 0, xpFor(30)).learnt.map((l) => l.kind), ['skill', 'ult']);
});

test('the bar fills live: it counts the XP up, wraps at each level crossed, and ends on the final values', () => {
  const g = heroGrowth('cleric', xpFor(2), xpFor(5) + 30);
  assert.deepEqual(growthAt(g, 0), { xp: g.xpFrom, level: 2, fill: 0 });
  const end = growthAt(g, 1);
  assert.equal(end.xp, g.xpTo);
  assert.equal(end.level, 5);
  assert.equal(end.fill, g.fillTo);
  let last = 0;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const s = growthAt(g, t);
    assert.ok(s.xp >= last, 'the XP never runs backwards');
    assert.equal(s.level, levelOf(s.xp));
    last = s.xp;
  }
  assert.equal(countAt(0, 250, 0), 0);
  assert.equal(countAt(0, 250, 1), 250);
  assert.equal(countAt(0, 250, 5), 250, 'past the end it stays on the end value');
  assert.ok(countAt(0, 100, 0.5) > 50, 'it eases out: quick at first');
  assert.equal(xpToNext(xpFor(3) + 10), xpFor(4) - xpFor(3) - 10);
});

test('the MVP line says what the hero was and its figures', () => {
  assert.equal(mvpLine({ dealt: 1240, healed: 0, taken: 300, kills: 3 }), 'Led the charge · 1,240 damage · 3 felled');
  assert.equal(mvpLine({ dealt: 100, healed: 900, taken: 50, kills: 0 }), 'Kept the company standing · 100 damage · 900 healing');
  assert.equal(mvpLine({ dealt: 50, healed: 0, taken: 2000, kills: 0 }), 'Held the line · 50 damage');
  assert.equal(mvpLine({ dealt: 0, healed: 0, taken: 400, kills: 0 }), 'Held the line · 400 damage taken');
  assert.equal(mvpLine({ dealt: 2000, healed: 0, taken: 0, kills: 7 }), 'Cut through the ranks · 2,000 damage · 7 felled');
});

test('the lines under the party keep everything the old card said bar the levels, which the rows show, then the bench and the quests', () => {
  const lines = resultLines(
    { ups: [{ kind: 'knight', from: 29, to: 30 }], fell: ['archer'], hearts: 1, heartsLeft: 2, found: ['a relic choice waits on the map'], gains: [], drops: ['3 shards of Kwame'], horn: 'War Horn +100 · 740/1000' },
    { bench: { n: 3, each: 12 }, quests: [{ title: 'Hunt the wolves', kind: 'advanced', now: 3, need: 5 }, { title: 'Slay the lich', kind: 'done' }] },
  );
  assert.deepEqual(lines.map((l) => l.kind), ['drop', 'horn', 'found', 'fell', 'heart', 'bench', 'quest', 'quest']);
  assert.ok(!lines.some((l) => /Level up|Ultimate/.test(l.text)));
  assert.equal(lines[5].text, 'The bench trained: +12 XP each (3 heroes)');
  assert.equal(lines[6].text, 'Quest complete: Slay the lich · return to the tavern');
  assert.equal(lines[7].text, 'Quest: Hunt the wolves 3/5');
  assert.deepEqual(resultLines({ ups: [], fell: [], hearts: 0, heartsLeft: 3, found: [] }), [], 'a quiet wave lists nothing');
});

test('quests moved: finished, found and advanced, from the progress before and after', () => {
  const moves = questMoves({ a: 1, b: 2, c: 0 }, { a: { now: 3, need: 5 }, b: { now: 2, need: 4 }, c: { now: 6, need: 6 }, d: { now: 1, need: 3 } }, ['c'], [{ id: 'e', rift: true }], (id) => id.toUpperCase());
  assert.deepEqual(moves, [
    { title: 'C', kind: 'done' },
    { title: 'E', kind: 'rift' },
    { title: 'A', kind: 'advanced', now: 3, need: 5 },
    { title: 'D', kind: 'advanced', now: 1, need: 3 },
  ]);
  assert.equal(questLines([{ title: 'X', kind: 'found' }])[0].text, 'Spoils found: X · see the quest board');
});

test('the party list: every fighter, then only the benched heroes that rose a level', () => {
  const g = (from: number, to: number) => heroGrowth('knight', xpFor(from), xpFor(to));
  const rows = partyRows([
    { kind: 'a', bench: true, growth: g(3, 4) },
    { kind: 'b', growth: g(3, 3) },
    { kind: 'c', bench: true, growth: g(3, 3) },
    { kind: 'd', growth: g(5, 6) },
  ]);
  assert.deepEqual(rows.map((r) => r.kind), ['b', 'd', 'a']);
});

test('a run notes each kind\'s XP the first time it is paid, so the end screen fills the bar over the whole run', () => {
  const r = newRun(5);
  noteXpStart(r, { knight: 100, archer: 40 });
  noteXpStart(r, { knight: 900, cleric: 7 });
  assert.deepEqual(recapOf(r).xpAt, { knight: 100, archer: 40, cleric: 7 });
});

test('between waves the short card says each quest the wave moved in a line of its own; the results screen words them once', () => {
  const m = { ups: [{ kind: 'knight', from: 4, to: 5 }], fell: [], hearts: 0, heartsLeft: 3, found: [], quests: questLines([{ title: 'Slay the lich', kind: 'done' }, { title: 'Hunt the wolves', kind: 'advanced', now: 3, need: 5 }]).map((l) => l.text) };
  const notes = waveNotes(m);
  assert.deepEqual(notes.map((n) => n.kind), ['level', 'quest', 'quest']);
  assert.equal(notes[1].text, 'Quest complete: Slay the lich · return to the tavern');
  const lines = resultLines(m, { quests: [{ title: 'Slay the lich', kind: 'done' }] });
  assert.deepEqual(lines.map((l) => l.text), ['Quest complete: Slay the lich · return to the tavern']);
});
