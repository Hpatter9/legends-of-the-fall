import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EPIC_MANIFEST } from '../src/render/epicManifest';
import { MUSIC_LEVEL, MUSIC_TARGET, playbackLufs, trackGain, type MusicFile } from '../src/render/audioMix';
import { FIGHT_LEVEL, VICTORY_BED } from '../src/render/battleMusic';

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

// (changed by the sound pass, docs/notes/sound-pass.md, for the owner's "the music volume still feels very bad": at -30 LUFS the
//  menus' music was all but silent on a phone and the battle music 7 LU under the fight, buried; then "music is too quiet and
//  muffled in battle": now the place's music plays at -25, and a battle's about as loud, 1.5 dB under, still under the fight)
test('at the speakers every loop plays at -25 LUFS, a battle\'s about as loud (1.5 dB under), still under the fight; the fanfare at the fight\'s loudness', () => {
  // (a file's loudness at the page's output, both sliders at 100 %: its own, the bus level and its trim; the fight's effects
  //  together sit about -23.5 LUFS, docs/notes/audio-mix.md)
  const FIGHT = -23.5;
  const gain = (id: string) => db(MUSIC_LEVEL * trackGain(id));
  const playback = (id: string) => playbackLufs(id as MusicFile) + gain(id);
  const plain = (id: string) => table.files[id].lufs + gain(id);
  for (const [id, e] of Object.entries(EPIC_MANIFEST)) {
    if (!e.loop) continue;
    assert.ok(Math.abs(playback(id) - MUSIC_TARGET) < 1e-6, `${id}: ${playback(id).toFixed(1)} at the speakers`);
    // (on headphones a bass-heavy track is a little louder than its playback loudness, on a phone a little quieter)
    assert.ok(Math.abs(plain(id) - MUSIC_TARGET) <= 2.5, `${id}: ${plain(id).toFixed(1)} LUFS plain`);
  }
  assert.equal(MUSIC_TARGET, -25);
  for (const id of ['battle', 'boss']) {
    const inFight = playback(id) + db(FIGHT_LEVEL);
    assert.ok(FIGHT - inFight >= 1.5 && FIGHT - inFight <= 4, `${id} sits ${(FIGHT - inFight).toFixed(1)} LU under the fight`);
    assert.ok(MUSIC_TARGET - inFight <= 2, `${id} in a fight is about as loud as the camp's music`);
  }
  // (the battle and the boss track at one level: the boss is more intense by its arrangement, not by jumping out)
  assert.ok(Math.abs(playback('battle') - playback('boss')) <= 0.01);
  // (the victory's triumph bed under the results no louder than the battle's music it follows)
  assert.ok(playback('triumph') + db(VICTORY_BED) <= playback('battle') + db(FIGHT_LEVEL) + 0.5);
  assert.ok(Math.abs(plain('victory') - FIGHT) <= 0.5, `the fanfare: ${plain('victory').toFixed(1)}`);
  assert.ok(Math.abs(plain('defeat') - (FIGHT - 2)) <= 0.5, `the defeat sting: ${plain('defeat').toFixed(1)}`);
});
