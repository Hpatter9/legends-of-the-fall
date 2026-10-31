import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EPIC_MANIFEST } from '../src/render/epicManifest';
import { MUSIC_LEVEL, trackGain } from '../src/render/audioMix';

// The music's loudness (the owner: "level their volumes"; docs/notes/battle-music-2.md). Every file is mastered to one target by
// `tools/epic-music/level.mjs` (`npm run music` levels each render too), metered to EBU R128 with ffmpeg, and the measures kept in
// `tools/epic-music/loudness.json`; these tests read that table, so a file re-encoded without levelling, or added without being
// measured, fails here.
interface Table {
  target: number;
  tolerance: number;
  peakMax: number;
  files: Record<string, { lufs: number; tp: number }>;
}
const table = JSON.parse(readFileSync('tools/epic-music/loudness.json', 'utf8')) as Table;
const db = (g: number) => 20 * Math.log10(g);

test('every music file is measured, and within 1 LU of the one target (-18 LUFS), its true peak under -1 dBTP', () => {
  assert.equal(table.target, -18);
  assert.equal(table.tolerance, 1);
  assert.equal(table.peakMax, -1);
  assert.deepEqual(Object.keys(table.files).sort(), Object.keys(EPIC_MANIFEST).sort(), 'the table measures exactly the shipped files');
  for (const [id, m] of Object.entries(table.files)) {
    assert.ok(Math.abs(m.lufs - table.target) <= table.tolerance, `${id}: ${m.lufs} LUFS`);
    assert.ok(m.tp <= table.peakMax, `${id}: peak ${m.tp} dBTP`);
  }
  // (no two loops more than 2 LU apart, the most the tolerance allows; in fact they are within a few tenths)
  const loops = Object.entries(table.files).filter(([id]) => EPIC_MANIFEST[id as keyof typeof EPIC_MANIFEST].loop).map(([, m]) => m.lufs);
  assert.ok(Math.max(...loops) - Math.min(...loops) <= 2 * table.tolerance);
});

test('at the speakers every loop plays at about -30 LUFS, 6.5 LU under a fight\'s sounds; the fanfare at the fight\'s own loudness', () => {
  // (a file's loudness at the page's output, both sliders at 100 %: its own, the bus level and its trim; the fight's effects
  //  together sit about -23.5 LUFS, docs/notes/audio-mix.md)
  const FIGHT = -23.5;
  const atSpeakers = (id: string) => table.files[id].lufs + db(MUSIC_LEVEL * trackGain(id));
  for (const [id, e] of Object.entries(EPIC_MANIFEST)) {
    if (!e.loop) continue;
    const l = atSpeakers(id);
    assert.ok(Math.abs(l - -30) <= 1, `${id}: ${l.toFixed(1)} LUFS at the speakers`);
    assert.ok(FIGHT - l >= 5.5 && FIGHT - l <= 7.5, `${id} sits ${(FIGHT - l).toFixed(1)} LU under the fight`);
  }
  // (the battle and the boss track at one level: the boss is more intense by its arrangement, not by jumping out)
  assert.ok(Math.abs(atSpeakers('battle') - atSpeakers('boss')) <= 0.5);
  assert.ok(Math.abs(atSpeakers('victory') - FIGHT) <= 1, `the fanfare: ${atSpeakers('victory').toFixed(1)}`);
  assert.ok(Math.abs(atSpeakers('defeat') - (FIGHT - 2)) <= 1, `the defeat sting: ${atSpeakers('defeat').toFixed(1)}`);
});
