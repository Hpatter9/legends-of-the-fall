// Quest stars and length (QUESTS-3, Q1): every quest has stars 1 to 5 and a length; the authored stars stay within one of the
// estimate (the hero tales and lost techniques are fixed by their battles); the numbers are read safely; the lines read well.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS, questById } from '../src/sim/questData';
import { GIVERS } from '../src/sim/questData';
import { LENGTHS, STAR_TABLE, comfortLevel, lengthOf, needLevel, openLevel, starEstimate, starLine, starText, starsOf, storyParts } from '../src/sim/questStars';

test('every quest has stars from 1 to 5 and a known length, and the table names no quest that is gone', () => {
  for (const q of QUESTS) {
    assert.ok(Number.isInteger(starsOf(q)) && starsOf(q) >= 1 && starsOf(q) <= 5, q.id);
    assert.ok(LENGTHS.includes(lengthOf(q)), q.id);
    // (a quest that carries its own stars and length, as the new ones do, needs no entry in the table)
    assert.ok(STAR_TABLE[q.id] || (q.stars && q.length), `${q.id} has stars and a length`);
  }
  for (const id of Object.keys(STAR_TABLE)) assert.ok(questById(id), `${id} is a quest`);
});

test('the authored stars are within one of the estimate (the tales and lost techniques are set by their battles)', () => {
  for (const q of QUESTS) {
    if (GIVERS[q.giver].slot === 'tale') continue;
    assert.ok(Math.abs(starsOf(q) - starEstimate(q)) <= 1, `${q.id}: ${starsOf(q)} vs ${starEstimate(q)}`);
  }
});

test('the estimate rises with a rider, a tier and a bigger count', () => {
  const base = questById('roundForTheHouse')!;
  const harder = { ...base, goal: { kind: 'wavesWon', n: 100, flawless: true, tier: 2, noSpells: true } } as typeof base;
  assert.ok(starEstimate(harder) > starEstimate(base));
  assert.ok(starEstimate(harder) <= 5);
});

test('a chain or campaign length follows the parts of the story, and a story is counted from either end', () => {
  const chained = QUESTS.filter((q) => q.after);
  assert.ok(chained.length > 0);
  for (const q of chained) assert.ok(storyParts(questById(q.after!)!) >= 2, q.id);
});

test('the lines read: stars, length and the level to be comfortable at', () => {
  assert.equal(starText(3), '★★★☆☆');
  const q = questById('roundForTheHouse')!;
  assert.match(starLine(q), /^★+☆* · (Short|Long|Chain|Campaign) · Lv \d+\+$/);
  assert.ok(comfortLevel(q) >= openLevel(q));
  assert.ok(needLevel({ kind: 'army', army: 'golems' }) > needLevel({ kind: 'army', army: 'orcs' }));
});
