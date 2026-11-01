import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { derivedOf, profileOf, scoresOf } from '../src/sim/stats';
import {
  figureRows, foeCardScores, gearScores, heroCardScores, nextImprovement, saveCells, scoreCompare, scoreRises, scoreTiles, scoreWhy, signed, statPanelOf,
} from '../src/sim/statLines';
import { heroGrowth } from '../src/sim/jrpgRecap';
import { FOES } from '../src/sim/foes';

// STATS batch 3 (docs/notes/stats-3.md): the words and numbers the pages show. Every figure is read through stats.ts, so these check
// that the page's lines equal derivedOf and scoresOf; nothing here touches a fight.

const at = { level: 8, rank: 1, grade: 1 };

test('the panel is derivedOf, for every hero', () => {
  for (const kind of ALL_HEROES) {
    const panel = statPanelOf(kind, at)!;
    const d = derivedOf(profileOf(kind)!, at);
    assert.deepEqual(panel.tiles.map((t) => t.score), Object.values(d.scores), kind);
    assert.equal(panel.figures.find((f) => f.key === 'ac')!.value, String(d.ac), kind);
    assert.equal(panel.figures.find((f) => f.key === 'hit')!.value, signed(d.toHit), kind);
    assert.equal(panel.figures.find((f) => f.key === 'dc')!.value, String(d.dc), kind);
    assert.equal(panel.tiles.filter((t) => t.primary).length, 1, kind);
    assert.equal(panel.tiles.filter((t) => t.weak).length, 1, kind);
    assert.equal(saveCells(panel.profile, d).filter((s) => s.trained).length, 2, kind);
  }
});

test('the signs use a true minus', () => {
  assert.equal(signed(-1), '−1');
  assert.equal(signed(0), '+0');
  assert.equal(signed(4), '+4');
});

test("a score's line names its effects in numbers, and the blow ability's names blows", () => {
  const p = profileOf('knight')!;
  const d = derivedOf(p, at);
  assert.match(scoreWhy(p, d, p.blow), /blows [+−]\d+%/);
  assert.match(scoreWhy(p, d, 'con'), /health [+−]\d+%/);
  assert.match(scoreWhy(p, d, 'dex'), /initiative/);
  assert.match(scoreWhy(p, d, p.saves[0]), /\(trained\)/);
});

test('the next improvement is the next ability score improvement or boon level, and ends at 100', () => {
  const p = profileOf('knight')!;
  assert.match(nextImprovement(p, 1)!, /^Level 4 · [A-Z]{3} \+2$/);
  assert.match(nextImprovement(p, 20)!, /^Level 30 · [A-Z]{3} \+1$/);
  assert.equal(nextImprovement(p, 100), null);
});

test('the recap lists the scores a level-up raised, only on the levels that change them', () => {
  assert.deepEqual(scoreRises('knight', 5, 7), []);
  const up = scoreRises('knight', 7, 8);
  // (the +2 is poured into the calling's order, so at the primary's cap it spills into the second score)
  assert.equal(up.reduce((n, r) => n + r.gain, 0), 2);
  // a proficiency step (level 10: +2 to +3) adds to hit and skill DC
  const prof = scoreRises('knight', 9, 10);
  assert.deepEqual(prof.map((r) => r.label), ['To hit', 'Skill DC']);
  assert.ok(prof.every((r) => r.gain === 1));
  assert.deepEqual(scoreRises('knight', 8, 8), []);
});

test('heroGrowth carries the score lines, and a Last Stand run none', () => {
  const g = heroGrowth('knight', 0, 1e9);
  assert.ok(g.scores.length > 0);
  assert.deepEqual(heroGrowth('knight', 0, 1).scores, []);
});

test('the unit card: a hero and a foe have six scores and their rolls', () => {
  const h = heroCardScores('knight', 8, 1, 0)!;
  assert.equal(h.tiles.length, 6);
  const d = derivedOf(profileOf('knight')!, { level: 8 });
  assert.match(h.rolls, new RegExp(`^AC ${d.ac} · To hit ${signed(d.toHit).replace('+', '\\+')} · DC ${d.dc}`));
  assert.equal(heroCardScores('nobody', 1, 1, 0), undefined);
  const foe = Object.values(FOES)[0] ?? Object.values(UNITS).find((u) => u.side === 'foe')!;
  assert.equal(foeCardScores(foe).tiles.length, 6);
  // an awakened hero reads as rank 4 plus its steps
  assert.deepEqual(heroCardScores('knight', 8, 1, 2)!.tiles.map((t) => t.score), Object.values(derivedOf(profileOf('knight')!, { level: 8, rank: 6 }).scores));
});

test('the gear compare says what a point does, and when it does not move the modifier', () => {
  const p = profileOf('knight')!;
  const strong = p.blow;
  const base = scoresOf(p, at)[strong];
  const lines = scoreCompare('knight', at, { [strong]: 1 });
  assert.equal(lines.length, 1);
  if (base % 2 === 0) assert.match(lines[0], /still$/);
  else assert.match(lines[0], /blows \+5%/);
  assert.equal(scoreCompare('knight', at, {}).length, 0);
  assert.deepEqual(scoreCompare('nobody', at, { str: 1 }), []);
  const two = scoreCompare('knight', at, { [strong]: 2 });
  assert.match(two[0], /\+\d → \+\d/);
});

test('a piece with no score points shows nothing, and one with some is read', () => {
  assert.equal(gearScores({ hp: 0 }), undefined);
  assert.equal(gearScores(undefined), undefined);
  assert.deepEqual(gearScores({ scores: { str: 1 } }), { str: 1 });
});

test('figures are six, tiles are six', () => {
  const panel = statPanelOf('knight', at)!;
  assert.equal(panel.figures.length, 6);
  assert.equal(scoreTiles(panel.profile, panel.derived).length, 6);
  assert.equal(figureRows(panel.derived).length, 6);
});
