import { heroName } from '../src/sim/heroNames';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newRun, type Run } from '../src/sim/run';
import { closeMapLeg, heartsBurned, newRecap, noteFightStats, notePayout, noteWave, recapOf, recapSince, RECAP_FOUND, RECAP_WAVES } from '../src/sim/runRecap';
import type { MapRecap, TowerState } from '../src/sim/tower';
import { towerHeadline, waveHeadline, waveNotes } from '../src/sim/waveCard';
import { ULT_LEVEL } from '../src/sim/abilities';

test('the recap keeps a line a wave (stars, time, MVP, hearts) and every find, for the end recap', () => {
  const r = newRun(41);
  noteWave(r, { wave: 1, won: true, stars: 3, ms: 30000, mvp: 'knight' });
  noteWave(r, { wave: 2, won: true, stars: 1, ms: 52000, mvp: 'cleric', hearts: 1 }, ['Iron Sword (weapon, +4 Atk)']);
  noteWave(r, { wave: 3, won: false, stars: 0, ms: 41000 });
  const rc = recapOf(r);
  assert.deepEqual(rc.waves!.map((w) => [w.wave, w.won, w.stars]), [[1, true, 3], [2, true, 1], [3, false, 0]]);
  assert.equal(rc.waves![1].mvp, 'cleric');
  assert.deepEqual(rc.found, ['Iron Sword (weapon, +4 Atk)']);
  assert.equal(heartsBurned(rc), 1);
  assert.equal(heartsBurned(newRecap()), 0, 'an old recap with no wave lines burned none');
  // (the lines and finds survive a save)
  const back = JSON.parse(JSON.stringify(r)) as Run;
  assert.deepEqual(back.recap, r.recap);
});

test('a long run keeps only the latest wave lines and finds, so the save stays small', () => {
  const r = newRun(42);
  for (let i = 1; i <= RECAP_WAVES + 5; i++) noteWave(r, { wave: i, won: true, stars: 2, ms: 1000 }, [`prize ${i}`]);
  const rc = recapOf(r);
  assert.equal(rc.waves!.length, RECAP_WAVES);
  assert.equal(rc.waves![0].wave, 6);
  assert.equal(rc.found!.length, RECAP_FOUND);
  assert.equal(rc.found!.at(-1), `prize ${RECAP_WAVES + 5}`);
});

test('the short card names the wave and how it went', () => {
  assert.equal(waveHeadline(4, 15, true), 'Wave 4 of 15 won');
  assert.equal(waveHeadline(6, 10, false), 'Wave 6 of 10 lost');
  assert.equal(waveHeadline(7, null, true), 'Stage 7 won');
});

test('the short card says only the notable moments: levels, an ultimate, finds, the fallen, a heart', () => {
  assert.deepEqual(waveNotes({ ups: [], fell: [], hearts: 0, heartsLeft: 3, found: [] }), [], 'a quiet wave has no lines');
  const notes = waveNotes({
    ups: [{ kind: 'knight', from: 4, to: 5 }, { kind: 'knight', from: 5, to: 6 }, { kind: 'cleric', from: ULT_LEVEL - 1, to: ULT_LEVEL }],
    fell: ['archer', 'archer'],
    hearts: 1,
    heartsLeft: 2,
    found: ['Iron Sword (weapon, +4 Atk)'],
  });
  assert.deepEqual(notes.map((n) => n.kind), ['level', 'ult', 'found', 'fell', 'heart']);
  assert.equal(notes[0].text, `Level up: ${heroName('knight')} Lv 6, ${heroName('cleric')} Lv ${ULT_LEVEL}`);
  assert.equal(notes[1].text, `Ultimate unlocked: ${heroName('cleric')}`);
  assert.equal(notes[3].text, `Fell: ${heroName('archer')} ×2`);
  assert.equal(notes[4].text, 'A heart burned · 2 left');
});

test('a spire floor\'s and a Calamity fight\'s card are headed by what fell', () => {
  assert.equal(towerHeadline('spire', 12, true), 'Floor 12 cleared');
  assert.equal(towerHeadline('spire', 10, true, 2), 'Act 2 cleared!');
  assert.equal(towerHeadline('spire', 14, false), 'Fell on floor 14');
  assert.equal(towerHeadline('calamity', 1, true), 'Spot cleared');
  assert.equal(towerHeadline('calamity', 1, true, 3), 'Map 3 cleared!');
  assert.equal(towerHeadline('calamity', 1, false), 'The party falls');
  // (a Rift Sanctuary expedition: crossings and regions)
  assert.equal(towerHeadline('expedition', 1, true), 'Crossing made');
  assert.equal(towerHeadline('expedition', 1, true, 2), 'Region 2 cleared!');
  assert.equal(towerHeadline('expedition', 1, false), 'The party falls');
});

/** One fight noted the way the page notes it: its rows, its pay, its line. */
function fight(r: Run, kind: string, dealt: number, xp: number, ups: { kind: string; from: number; to: number }[] = []): void {
  noteFightStats(r, [{ id: 1, kind, dealt, taken: 10, healed: 0, kills: 1 }], 20000, true, { [kind]: 1 });
  notePayout(r, { [kind]: xp }, ups, 5, 0);
  noteWave(r, { wave: recapOf(r).fights, won: true, stars: 2, ms: 20000, mvp: kind });
}

test('a stretch of a recap is what it gained since a copy: figures, XP, levels from where the copy left them, and its fights', () => {
  const r = newRun(43);
  fight(r, 'knight', 100, 30, [{ kind: 'knight', from: 1, to: 2 }]);
  const then = JSON.parse(JSON.stringify(recapOf(r)));
  fight(r, 'knight', 50, 20, [{ kind: 'knight', from: 2, to: 3 }]);
  fight(r, 'cleric', 5, 10);
  const d = recapSince(recapOf(r), then);
  assert.equal(d.fights, 2);
  assert.equal(d.heroes.knight.dealt, 50);
  assert.equal(d.heroes.cleric.dealt, 5);
  assert.deepEqual(d.xp, { knight: 20, cleric: 10 });
  assert.deepEqual(d.levels, { knight: [2, 3] }, 'the level from where the stretch began, not the run');
  assert.equal(d.crowns, 10);
  assert.deepEqual(d.waves!.map((w) => w.wave), [2, 3]);
  assert.deepEqual(recapSince(recapOf(r)).heroes.knight.dealt, 150, 'with no copy, the whole recap');
});

test('a Calamity map cleared takes its share of the run\'s recap, once, and the next map counts from there', () => {
  const r = newRun(44);
  const done = (map: number): MapRecap => ({ map, spots: 3, total: 4, fights: 2, elites: 0, gold: 50, relics: [], gear: [], heroes: [], events: [] });
  r.tower = { act: 1, map: [], at: 0, row: 0, hp: {}, armies: [], path: [], crowns: 0, bosses: 0, maps: 6 } as unknown as TowerState;
  const t = r.tower!;
  fight(r, 'knight', 100, 30);
  fight(r, 'knight', 60, 20);
  closeMapLeg(r);
  assert.equal(t.recapAt, undefined, 'nothing to close before a map is cleared');
  const one = done(1);
  t.recaps = [one];
  t.mapDone = one;
  closeMapLeg(r);
  assert.equal(one.detail!.fights, 2);
  assert.equal(one.detail!.heroes.knight.dealt, 160);
  const before = JSON.stringify(one.detail);
  closeMapLeg(r);
  assert.equal(JSON.stringify(one.detail), before, 'closed once');
  // (the second map, its recap saved and loaded on the way: the kept copy in recaps takes the detail too)
  fight(r, 'cleric', 7, 9);
  const back = JSON.parse(JSON.stringify(r)) as Run;
  const two = done(2);
  back.tower!.recaps = [...back.tower!.recaps!, JSON.parse(JSON.stringify(two))];
  back.tower!.mapDone = two;
  closeMapLeg(back);
  assert.equal(two.detail!.fights, 1);
  assert.deepEqual(Object.keys(two.detail!.heroes), ['cleric']);
  assert.equal(back.tower!.recaps!.at(-1)!.detail!.fights, 1);
  assert.deepEqual(two.detail!.waves!.map((w) => w.wave), [3]);
});
