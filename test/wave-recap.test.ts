import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newRun, type Run } from '../src/sim/run';
import { heartsBurned, newRecap, noteWave, recapOf, RECAP_FOUND, RECAP_WAVES } from '../src/sim/runRecap';
import { waveHeadline, waveNotes } from '../src/sim/waveCard';
import { ULT_LEVEL } from '../src/sim/abilities';
import { UNITS } from '../src/sim/units';

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
  assert.equal(notes[0].text, `Level up: ${UNITS.knight.name} Lv 6, ${UNITS.cleric.name} Lv ${ULT_LEVEL}`);
  assert.equal(notes[1].text, `Ultimate unlocked: ${UNITS.cleric.name}`);
  assert.equal(notes[3].text, `Fell: ${UNITS.archer.name} ×2`);
  assert.equal(notes[4].text, 'A heart burned · 2 left');
});
