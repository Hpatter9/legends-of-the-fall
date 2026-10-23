import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, stepBattle, type BattleEvent } from '../src/sim/battle';
import { D, W } from '../src/sim/board';
import {
  ACT_COLOURS, DUCK_GAIN, DuckCounter, OPEN_HZ, PAN_MAX, TENSION_RATE, colourOf, cutoffOf, eventSpot, panFromScreen, panOfEvent, panOfTile,
  percActive, percLevel, rateOf, swellOf,
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

test('the music low-pass opens with tension, and the tension never quickens the pace past 8%', () => {
  for (const track of ['battle', 'boss'] as const) {
    let last = 0;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const hz = cutoffOf(track, t, null);
      assert.ok(hz >= last, 'rises with tension');
      last = hz;
    }
    assert.ok(cutoffOf(track, 0, null) < cutoffOf(track, 1, null));
    assert.equal(cutoffOf(track, 1, null), OPEN_HZ);
    assert.ok(rateOf(track, 1, null) <= 1 + TENSION_RATE + 1e-9);
    assert.equal(rateOf(track, 1, null), 1 + TENSION_RATE);
  }
  // (the town ignores tension, as before)
  assert.equal(cutoffOf('town', 1, null), cutoffOf('town', 0, null));
  assert.equal(rateOf('town', 1, null), 1);
  assert.equal(swellOf('town', 1), 1);
  assert.ok(Math.abs(swellOf('battle', 1) - 1.33) < 1e-9);
  // (out-of-range tension is held to 0..1)
  assert.equal(swellOf('battle', 5), swellOf('battle', 1));
  assert.equal(cutoffOf('battle', -2, null), cutoffOf('battle', 0, null));
});

test('the percussion layer is silent until the fight runs hot and full at the end', () => {
  assert.equal(percLevel(0), 0);
  assert.equal(percLevel(0.5), 0);
  assert.equal(percLevel(1), 1);
  assert.ok(percLevel(0.8) > 0 && percLevel(0.8) < 1);
  assert.equal(percActive(0.4), false);
  assert.equal(percActive(0.9), true);
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
  // (an act's cutoff caps the music, and tension opens a battle track towards it)
  assert.equal(cutoffOf('town', 0, 1), crypt.cutoff);
  assert.ok(cutoffOf('battle', 0, 1) < cutoffOf('battle', 1, 1));
  assert.equal(cutoffOf('battle', 1, 1), crypt.cutoff);
  // (the act's pace multiplies in, the tension's share stays within 8%)
  assert.ok(Math.abs(rateOf('battle', 1, 1) - crypt.rate * (1 + TENSION_RATE)) < 1e-9);
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

test('the music player crossfades tracks, colours them by tension and act, and keeps a rumble (no beat) only while the fight is hot', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => ({ pad: null, bass: null, lead: null, drums: null }));
    const cutoff = () => (music.params.cutoff.audioParam as unknown as { target?: number }).target;
    const perc = () => (music.params.perc.audioParam as unknown as { target?: number }).target;
    music.setTrack('town');
    assert.equal(music.current, 'town');
    assert.equal(cutoff(), OPEN_HZ);
    // a fight: the battle track, closed at first, opening as the tension climbs
    music.setTrack('battle');
    await new Promise((r) => setTimeout(r, 5));
    const closed = cutoff()!;
    assert.ok(closed < OPEN_HZ);
    music.setTension(0.4);
    assert.ok(cutoff()! > closed);
    assert.equal(perc(), 0, 'no rumble yet');
    const before = FakeContext.made.length;
    music.setTension(0.95);
    assert.ok(perc()! > 0, 'the rumble fades in');
    assert.ok(perc()! <= 0.12 + 1e-9, 'and sits quietly');
    assert.ok(cutoff()! > OPEN_HZ * 0.9);
    // (a few long-lived nodes, made once: no hits are scheduled, so nothing is made as the clock runs on)
    const rumble = FakeContext.made.length - before;
    assert.ok(rumble > 0 && rumble <= 8, `a handful of nodes (${rumble})`);
    music.setTension(1);
    await new Promise((r) => setTimeout(r, 300));
    ctx.currentTime = 5;
    await new Promise((r) => setTimeout(r, 250));
    assert.equal(FakeContext.made.length - before, rumble, 'no node is made per beat or per tick');
    // the fight ends: back to the town, tension spent
    music.setTension(0);
    music.setTrack('town');
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(perc(), 0);
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
