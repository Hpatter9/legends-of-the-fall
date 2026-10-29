import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { EPIC_MANIFEST } from '../src/render/epicManifest';
import { EPIC_INFO, type Baked } from '../src/render/musicBake';
import { SCORES, SCENE_TRACKS } from '../src/render/musicScore';
import { OPEN_HZ } from '../src/render/audioRules';
import { BATTLE_BAR, BATTLE_LOOP_START, LOOP_START, STING_IDS, SYNTH_OF, TRACK_OF_PLACE, epicOf, placeOf, type MusicId } from '../src/render/epicMusic';
import { FakeContext, installFakeAudio } from './audioFake';

const LOOPS = ['camp', 'deploy', 'battle', 'battle2', 'battle3', 'boss', 'tower', 'calmap', 'calbattle', 'tavern', ...SCENE_TRACKS] as const;

test('every track has a file, the files are on disk, loops run a sensible length and the whole is small enough to download', () => {
  for (const id of LOOPS) {
    const e = EPIC_MANIFEST[id];
    assert.ok(e, `${id} has a manifest entry`);
    assert.ok(e.loop && e.seconds >= 40 && e.seconds <= 120, `${id} loops ${e.seconds} s`);
    assert.equal(statSync(`src/audio/${e.file}`).size, e.bytes, `${id}'s file is the one the manifest measured`);
  }
  for (const id of STING_IDS) assert.ok(!EPIC_MANIFEST[id].loop && EPIC_MANIFEST[id].seconds < 20, `${id} is a short sting`);
  // (a file in the folder the manifest does not know would never be cached for offline play; one it names but is missing would break it)
  const files = readdirSync('src/audio').filter((f) => f.endsWith('.opus')).sort();
  assert.deepEqual(files, Object.values(EPIC_MANIFEST).map((e) => e.file).sort());
  const total = Object.values(EPIC_MANIFEST).reduce((n, e) => n + e.bytes, 0);
  assert.ok(total < 6.1 * 1024 * 1024, `${(total / 1048576).toFixed(2)} MB of audio`);
  // (the build copies every file in the folder and lists each in the service worker's FILES)
  const build = readFileSync('build.mjs', 'utf8');
  assert.match(build, /AUDIO_FILES\.map/);
});

test('every track the player can be asked for has a file or a synth fallback, and `town` is the camp', () => {
  for (const id of Object.keys(SYNTH_OF) as MusicId[]) {
    assert.ok(id in SCORES || id in EPIC_MANIFEST, id);
    assert.ok(SYNTH_OF[id] in SCORES, `${id} falls back to a score`);
  }
  assert.equal(epicOf('town'), EPIC_MANIFEST.camp);
  assert.equal(epicOf('battle2'), EPIC_MANIFEST.battle2);
});

test('the place chooses the track (a battle\'s own is chosen in battleMusic.ts: test/battle-music.test.ts)', () => {
  assert.equal(placeOf(null, null), 'camp');
  for (const s of ['camp', 'hall', 'castle', 'spells', 'armies', 'tavern'] as const) assert.equal(placeOf(s, null), 'camp');
  assert.equal(placeOf('field', null), 'deploy');
  assert.equal(placeOf('tower2', null), 'deploy', 'a tower run deploying is a deployment');
  assert.equal(placeOf('tower1', 'tower'), 'tower');
  assert.equal(placeOf('tower3', 'calamity'), 'calmap');
  assert.equal(TRACK_OF_PLACE.camp, 'camp');
});

/** A baked track as an epic file would give it: one stem with its loop window. */
function epicBaked(ctx: FakeContext): Baked {
  const buf = ctx.createBuffer(2, 100) as unknown as AudioBuffer;
  const b: Baked = { pad: buf, bass: null, lead: null, drums: null };
  EPIC_INFO.set(b, { loop: [LOOP_START, LOOP_START + 90] });
  return b;
}

test('an epic track loops its window, and takes no colour from the tower act', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => epicBaked(ctx));
    const cutoff = () => (music.params.cutoff.audioParam as unknown as { target?: number }).target;
    const before = FakeContext.made.length;
    music.setTrack('battle2');
    await new Promise((r) => setTimeout(r, 10));
    const sources = FakeContext.made.slice(before).filter((n) => n.loop);
    assert.equal(sources.length, 1, 'the file is one stem');
    const src = sources[0] as unknown as { loopStart: number; loopEnd: number; started: boolean };
    assert.ok(src.started);
    assert.equal(src.loopStart, LOOP_START);
    assert.equal(src.loopEnd, LOOP_START + 90);
    // (open, and no tower act's ceiling or drone)
    assert.equal(cutoff(), OPEN_HZ);
    const nodes = FakeContext.made.length;
    music.setAct(1);
    assert.equal(cutoff(), OPEN_HZ, 'the act does not close the filter');
    assert.equal(FakeContext.made.length, nodes, 'and starts no drone');
    // (the play-rate stays put too: a pitch change would only detune a rendered track)
    assert.equal((sources[0] as unknown as { playbackRate: { target?: number } }).playbackRate.target, 1);
    music.destroy();
  } finally {
    undo();
  }
});

test('a sting holds the music back, lets it return, and a new fight cuts it short', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const sting = { duration: 1 } as unknown as AudioBuffer;
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => epicBaked(ctx), async () => sting);
    const loops = () => FakeContext.made.filter((n) => n.loop && n.started);
    music.setTrack('battle');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(loops().length, 1);
    music.sting('victory');
    await new Promise((r) => setTimeout(r, 10));
    const played = FakeContext.made.filter((n) => n.started && !n.loop && n.buffer === sting);
    assert.equal(played.length, 1, 'the sting plays once');
    // (the music is asked for while the sting rings: it waits)
    music.setTrack('deploy');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(music.current, 'deploy');
    assert.equal(loops().length, 1, 'no new loop yet');
    await new Promise((r) => setTimeout(r, 1700));
    assert.equal(loops().length, 2, 'after the sting the deployment music starts');
    // a fight begins during a second sting: it stops, and the music is let back at once
    music.sting('defeat');
    await new Promise((r) => setTimeout(r, 10));
    music.setTrack('battle2');
    await new Promise((r) => setTimeout(r, 10));
    const n = loops().length;
    music.stopSting();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(loops().length, n + 1, 'the battle track comes in without waiting out the sting');
    music.destroy();
  } finally {
    undo();
  }
});

test('the battle track skips its ambient intro to start at the combat downbeat', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const buf = ctx.createBuffer(2, 100) as unknown as AudioBuffer;
    const b: Baked = { pad: buf, bass: null, lead: null, drums: null };
    EPIC_INFO.set(b, { loop: [BATTLE_LOOP_START, LOOP_START + 66.9772] });
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => b);
    const before = FakeContext.made.length;
    music.setTrack('battle');
    await new Promise((r) => setTimeout(r, 10));
    const sources = FakeContext.made.slice(before).filter((n) => n.loop);
    assert.equal(sources.length, 1);
    const src = sources[0] as unknown as { loopStart: number; loopEnd: number; started: boolean; startOffset: number };
    assert.ok(src.started);
    assert.equal(src.startOffset, BATTLE_LOOP_START);
    assert.equal(src.loopStart, BATTLE_LOOP_START);
    music.destroy();
  } finally {
    undo();
  }
});
test('the battle loop, cut short of its intro, is still a whole number of bars, so it joins on the beat', () => {
  assert.equal(BATTLE_BAR * 48, EPIC_MANIFEST.battle.seconds);
  const bars = (LOOP_START + EPIC_MANIFEST.battle.seconds - BATTLE_LOOP_START) / BATTLE_BAR;
  assert.ok(Math.abs(bars - Math.round(bars)) < 1e-6, `${bars} bars`);
  assert.equal(Math.round(bars), 44);
});
