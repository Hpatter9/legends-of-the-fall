import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCORES, STEMS, TRACK_RMS, loopSeconds, noiseStream, stemLevels } from '../src/render/musicScore';
import { BAKE_RATE, bakeTrack, rms, type OfflineMaker } from '../src/render/musicBake';
import { FakeContext, installFakeAudio } from './audioFake';

const TRACKS = ['town', 'battle', 'boss'] as const;

test('every track is eight bars, its notes fit the loop and its stems are in sensible ranges', () => {
  for (const track of TRACKS) {
    const s = SCORES[track];
    assert.equal(s.beats, 32, track);
    for (const stem of ['pad', 'bass', 'lead'] as const) {
      assert.ok(s[stem].length > 0, `${track} ${stem} has notes`);
      for (const n of s[stem]) {
        assert.ok(n.t >= 0 && n.t < s.beats, `${track} ${stem} starts inside the loop (${n.t})`);
        assert.ok(n.d > 0 && n.v > 0 && n.v <= 1, `${track} ${stem} note is sane`);
        assert.ok(n.midi >= 24 && n.midi <= 100, `${track} ${stem} pitch ${n.midi}`);
      }
    }
    for (const h of s.drums) assert.ok(h.t >= 0 && h.t < s.beats && h.v > 0 && h.v <= 1, `${track} drum hit`);
    assert.ok(loopSeconds(s) > 10 && loopSeconds(s) < 30, `${track} loop is ${loopSeconds(s)} s`);
  }
  assert.equal(SCORES.town.drums.length, 0, 'the town has no drums');
  assert.ok(SCORES.battle.drums.length > 0 && SCORES.boss.drums.length > 0);
});

test('stem levels stay in range; the town is fixed; the battle brings its lead and drums in with the tension', () => {
  for (const track of TRACKS)
    for (const t of [-1, 0, 0.3, 1, 2])
      for (const stem of STEMS) {
        const v = stemLevels(track, t)[stem];
        assert.ok(v >= 0 && v <= 1, `${track} ${stem} at ${t}: ${v}`);
      }
  assert.deepEqual(stemLevels('town', 0), stemLevels('town', 1));
  const calm = stemLevels('battle', 0);
  const hot = stemLevels('battle', 1);
  assert.ok(hot.lead > calm.lead && hot.drums > calm.drums);
  assert.ok(stemLevels('boss', 0).drums >= 0.85, 'the boss keeps its drums');
});

test('the noise stream is the same every time', () => {
  const a = noiseStream(7);
  const b = noiseStream(7);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
  assert.notEqual(noiseStream(7)(), noiseStream(8)());
});

/** An offline context that draws a tone when "rendered", so the baker has something to scale. */
class FakeOffline extends FakeContext {
  constructor(readonly channels: number, readonly length: number, rate: number) {
    super();
    this.sampleRate = rate;
  }
  // @ts-expect-error (a fuller buffer than the base fake's)
  createBuffer(c: number, n: number) {
    const data = Array.from({ length: c }, () => new Float32Array(n));
    return { numberOfChannels: c, length: n, sampleRate: this.sampleRate, getChannelData: (i: number) => data[i] };
  }
  async startRendering() {
    const b = this.createBuffer(this.channels, this.length);
    for (let c = 0; c < this.channels; c++) b.getChannelData(c).forEach((_, i, d) => (d[i] = Math.sin(i / 20) * 0.5));
    return b;
  }
}

test('baking a track gives a looping buffer for each stem, folded to the loop length and set to the track loudness', async () => {
  const undo = installFakeAudio();
  try {
    const make: OfflineMaker = (c, n, r) => new FakeOffline(c, n, r) as unknown as OfflineAudioContext;
    for (const track of TRACKS) {
      const baked = await bakeTrack(track, make);
      const frames = Math.round(loopSeconds(SCORES[track]) * BAKE_RATE);
      assert.equal(baked.pad!.length, frames);
      assert.equal(baked.pad!.numberOfChannels, 2, 'the pad is stereo');
      assert.equal(baked.bass!.numberOfChannels, 1);
      assert.equal(baked.drums === null, SCORES[track].drums.length === 0);
      const power = Object.values(baked).reduce((n, b) => n + (b ? rms(b) ** 2 : 0), 0);
      assert.ok(Math.abs(Math.sqrt(power) - TRACK_RMS[track]) < 1e-6, `${track} is baked to its loudness`);
    }
  } finally {
    undo();
  }
});

test('the music player starts a track\'s stems together, mixes them by tension, and lets the old track go', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const stub = async () => {
      const b = ctx.createBuffer(1, 100) as unknown as AudioBuffer;
      return { pad: b, bass: b, lead: b, drums: null };
    };
    const music = new MusicPlayer(ctx as unknown as AudioContext, stub);
    const before = FakeContext.made.length;
    music.setTrack('battle');
    await new Promise((r) => setTimeout(r, 10));
    const sources = FakeContext.made.slice(before).filter((n) => n.loop);
    assert.equal(sources.length, 3, 'one looping source for each stem that has a buffer');
    assert.ok(sources.every((n) => n.started));
    // (no media element anywhere: the music is buffers)
    music.setTension(1);
    const gains = FakeContext.made.slice(before).filter((n) => n.gain.target !== undefined && n.gain.target <= 1).map((n) => n.gain.target);
    assert.ok(gains.includes(stemLevels('battle', 1).lead));
    // off: the sources are let go, and nothing starts again until it is on
    music.setEnabled(false);
    music.setTrack('town');
    await new Promise((r) => setTimeout(r, 10));
    const afterOff = FakeContext.made.length;
    music.setTrack('boss');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(FakeContext.made.length, afterOff, 'a disabled player makes nothing');
    music.setEnabled(true);
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(FakeContext.made.length > afterOff, 'turned on, the current track starts');
    music.destroy();
  } finally {
    undo();
  }
});
