import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, stepBattle, type BattleEvent } from '../src/sim/battle';
import { D, W } from '../src/sim/board';
import {
  ACT_COLOURS, DUCK_GAIN, DuckCounter, OPEN_HZ, PAN_MAX, colourOf, eventSpot, musicColour, panFromScreen, panOfEvent, panOfTile,
} from '../src/render/audioRules';
import { readyBattle } from './helpers';

test('a cue pans by the tile it happens on: left of the board left, right right, centre none, never past the limit', () => {
  assert.ok(panOfTile(0, D - 1) < -0.5, 'the far left corner');
  assert.ok(panOfTile(W - 1, 0) > 0.5, 'the far right corner');
  assert.ok(Math.abs(panOfTile((W - 1) / 2, (D - 1) / 2)) < 1e-9, 'the middle');
  for (let u = 0; u < W; u++) for (let v = 0; v < D; v++) assert.ok(Math.abs(panOfTile(u, v)) <= PAN_MAX + 1e-9);
  // (the same u - v is the same column on screen)
  assert.equal(panOfTile(2, 2), panOfTile(5, 5));
});

test('panFromScreen is proportional, clamped, and safe on a board of no width', () => {
  assert.equal(panFromScreen(100, 100, 50), 0);
  assert.ok(Math.abs(panFromScreen(125, 100, 50) - PAN_MAX / 2) < 1e-9);
  assert.equal(panFromScreen(1e6, 100, 50), PAN_MAX);
  assert.equal(panFromScreen(-1e6, 100, 50), -PAN_MAX);
  assert.equal(panFromScreen(5, 0, 0), 0);
});

test('a battle event pans by its fighter or tile, and the end of the fight has no place', () => {
  const b = readyBattle(3);
  assert.ok(fight(b));
  const events: BattleEvent[] = [];
  for (let i = 0; i < 400 && b.phase === 'fight'; i++) events.push(...stepBattle(b));
  assert.ok(events.length > 20);
  for (const e of events) {
    const pan = panOfEvent(b, e);
    assert.ok(Math.abs(pan) <= PAN_MAX + 1e-9);
    if (e.kind === 'end') assert.equal(eventSpot(b, e), null);
  }
  const hit = events.find((e) => e.kind === 'hit');
  assert.ok(hit && hit.kind === 'hit');
  const to = b.units.find((x) => x.id === hit.to)!;
  assert.equal(panOfEvent(b, hit), panOfTile(to.u, to.v));
  assert.equal(panOfEvent(b, { kind: 'spell', id: 'meteor', u: 0, v: D - 1 }), panOfTile(0, D - 1));
  assert.equal(panOfEvent(b, { kind: 'end', won: true }), 0);
});

test('ducking is counted by reason: it stays down until every reason is let go', () => {
  const d = new DuckCounter();
  assert.equal(d.ducked, false);
  assert.equal(d.set('sheet', true), true);
  assert.equal(d.set('event', true), true);
  assert.equal(d.set('sheet', true), true, 'a reason raised twice');
  assert.equal(d.set('sheet', false), true, 'still held by its other hold and the event');
  assert.equal(d.set('event', false), true);
  assert.equal(d.set('sheet', false), false, 'all let go');
  // (an extra let-go never goes below none, so the next duck still works)
  assert.equal(d.set('sheet', false), false);
  assert.equal(d.set('sheet', true), true);
  assert.deepEqual(d.reasons, ['sheet']);
  d.clear();
  assert.equal(d.ducked, false);
});

test('the duck is about -8 dB', () => {
  assert.ok(Math.abs(20 * Math.log10(DUCK_GAIN) + 8) < 1e-9);
});

// (the owner changed the rule these replaced: the battle music once opened its low-pass, swelled and quickened with the fight's
//  tension, and a rumble came in when it ran hot; now it stays steady through a battle, docs/notes/battle-music.md)
test('the music is open and at its own pace with no act, whatever the fight is doing', () => {
  assert.deepEqual(musicColour(null), { cutoff: OPEN_HZ, rate: 1 });
});

test('each tower act has its own colour: act 1 muffled and slow, act 2 open, act 3 stormy; later acts reuse the three', () => {
  assert.equal(colourOf(null), null);
  assert.equal(ACT_COLOURS.length, 3);
  const [crypt, halls, storm] = ACT_COLOURS;
  assert.ok(crypt.cutoff < storm.cutoff && storm.cutoff < halls.cutoff, 'dark < stormy < grand');
  assert.ok(crypt.rate < 1 && storm.rate > 1 && halls.rate === 1);
  assert.ok(storm.drone.wind, 'the storm has wind');
  assert.ok(!crypt.drone.wind && !halls.drone.wind);
  assert.equal(colourOf(1), crypt);
  assert.equal(colourOf(2), halls);
  assert.equal(colourOf(3), storm);
  assert.equal(colourOf(4), crypt);
  assert.equal(colourOf(0), crypt);
  // (an act's cutoff caps the music and its pace sets the tempo)
  assert.deepEqual(musicColour(1), { cutoff: crypt.cutoff, rate: crypt.rate });
  assert.deepEqual(musicColour(3), { cutoff: storm.cutoff, rate: storm.rate });
  for (const a of ACT_COLOURS) assert.ok(a.drone.voices.length > 0 && a.drone.level > 0 && a.drone.level <= 1);
});

/* ------------------------------------------------------------------ the processors, on a stand-in for Web Audio */

import { BusMixer, CueSynth } from '../src/render/audioProcessors';
import { CUES, type Cue } from '../src/render/soundRules';
import { FakeContext, FakeNode, installFakeAudio } from './audioFake';

test('the mixer sends the buses to a master that reaches the speakers, and ducking moves the bed and nothing else', async () => {
  const undo = installFakeAudio();
  try {
    const ctx = new FakeContext();
    const mixer = new BusMixer(ctx as unknown as AudioContext);
    // (no AudioWorklet here: the native compressor stays between the master and the speakers)
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(mixer.limited, false);
    const reaches = (from: FakeNode, to: FakeNode, seen = new Set<FakeNode>()): boolean => {
      if (from === to) return true;
      if (seen.has(from)) return false;
      seen.add(from);
      return from.to.some((n) => reaches(n, to, seen));
    };
    for (const name of ['music', 'sfx', 'ui', 'ambience', 'show'] as const) {
      assert.ok(reaches(mixer.bus(name) as unknown as FakeNode, ctx.destination), `${name} reaches the speakers`);
    }
    mixer.setDuck(true);
    const duckGain = (mixer.params.duck.audioParam as unknown as { target?: number }).target;
    const duckHz = (mixer.params.duckHz.audioParam as unknown as { target?: number }).target;
    assert.ok(Math.abs(duckGain! - DUCK_GAIN) < 1e-9);
    assert.ok(duckHz! < OPEN_HZ);
    mixer.setDuck(false);
    assert.equal((mixer.params.duck.audioParam as unknown as { target?: number }).target, 1);
    assert.equal((mixer.params.duckHz.audioParam as unknown as { target?: number }).target, OPEN_HZ);
    mixer.setLevel('master', 0);
    assert.equal((mixer.params.master.audioParam as unknown as { target?: number }).target, 0);
  } finally {
    undo();
  }
});

test('every cue can be made, and a panned cue goes through a panner while a centred one does not', () => {
  const undo = installFakeAudio();
  try {
    const ctx = new FakeContext();
    const mixer = new BusMixer(ctx as unknown as AudioContext);
    const synth = new CueSynth(ctx as unknown as AudioContext, (n) => mixer.bus(n));
    const names = Object.keys(CUES) as Cue[];
    assert.ok(names.length > 60);
    for (const name of names) {
      const before = FakeContext.made.length;
      synth.play(name, 1, { gain: 1, pitch: 1, bus: 'sfx' });
      assert.ok(FakeContext.made.length > before, `${name} made something`);
    }
    const panners = (): number => FakeContext.made.filter((n) => n.pan.value !== 0).length;
    const p0 = panners();
    synth.play('hitSword', 1, { gain: 1, pitch: 1, bus: 'sfx', pan: 0 });
    assert.equal(panners(), p0, 'a centred cue adds no panner');
    synth.play('hitSword', 1, { gain: 1, pitch: 1, bus: 'sfx', pan: -0.4 });
    assert.equal(panners(), p0 + 1);
    const panner = FakeContext.made.filter((n) => n.pan.value === -0.4)[0];
    assert.ok(panner.to.includes(mixer.bus('sfx') as unknown as FakeNode), 'the panner feeds its bus');
    // (the summoning show's and the ui's cues reach their own buses)
    synth.play('riseSummon', 1, { gain: 1, pitch: 1, bus: 'show' });
    synth.play('tap', 1, { gain: 1, pitch: 1, bus: 'ui' });
  } finally {
    undo();
  }
});

test('the music player crossfades tracks, holds a battle track steady (no tension filter or rumble), and colours by the act', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => ({ pad: null, bass: null, lead: null, drums: null }));
    const cutoff = () => (music.params.cutoff.audioParam as unknown as { target?: number }).target;
    music.setTrack('town');
    assert.equal(music.current, 'town');
    assert.equal(cutoff(), OPEN_HZ);
    // a fight: the battle track (its synthesised fallback here) is open from the start, and nothing it does moves it
    music.setTrack('battle');
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(cutoff(), OPEN_HZ, 'no muffled start');
    ctx.currentTime = 5;
    await new Promise((r) => setTimeout(r, 250));
    assert.equal(cutoff(), OPEN_HZ, 'and no opening later');
    assert.ok(!('setTension' in music), 'the fight has no say in the music any more');
    music.setTrack('town');
    await new Promise((r) => setTimeout(r, 5));
    // a tower act: the drone starts, and the act's ceiling holds the music down
    const quiet = FakeContext.made.length;
    music.setAct(1);
    assert.ok(FakeContext.made.length > quiet, 'the drone has voices');
    assert.equal(cutoff(), ACT_COLOURS[0].cutoff);
    const droneNodes = FakeContext.made.length;
    music.setAct(1);
    assert.equal(FakeContext.made.length, droneNodes, 'the same act again changes nothing');
    music.setAct(null);
    assert.equal(cutoff(), OPEN_HZ);
    music.destroy();
  } finally {
    undo();
  }
});
