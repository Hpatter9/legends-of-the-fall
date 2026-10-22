import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEDS, BED_FADE_S, BED_LEVEL_MAX, BED_OF, MIN_SHOT_GAP_S, ShotClock, pickShot, sceneOf, setChime, shotGap, twistCues,
  type BedId, type HomeSpot, type Scene,
} from '../src/render/audioRules';
import { AmbientBeds } from '../src/render/audioBeds';
import { CUES } from '../src/render/soundRules';
import { FakeContext, FakeNode, installFakeAudio } from './audioFake';

const SCENES = Object.keys(BED_OF) as Scene[];
const BED_IDS = Object.keys(BEDS) as BedId[];

/** A random source that walks through fixed numbers, for timing tests. */
const walker = (xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

/* ------------------------------------------------------------------ scenes and beds */

test('each home tab and the armies pick their place, and off the home screen the tower act or the field does', () => {
  const spots: [HomeSpot, Scene][] = [['battle', 'camp'], ['heroes', 'tavern'], ['recruit', 'hall'], ['castle', 'castle'], ['spells', 'spells'], ['armies', 'armies']];
  for (const [spot, scene] of spots) assert.equal(sceneOf(spot, null), scene);
  // (the home screen wins over a tower run waiting behind it)
  assert.equal(sceneOf('battle', 2), 'camp');
  assert.equal(sceneOf(null, null), 'field');
  assert.equal(sceneOf(null, NaN), 'field');
  assert.equal(sceneOf(null, 1), 'tower1');
  assert.equal(sceneOf(null, 2), 'tower2');
  assert.equal(sceneOf(null, 3), 'tower3');
  // (acts 4 and up reuse the three, as the music does)
  assert.equal(sceneOf(null, 4), 'tower1');
  assert.equal(sceneOf(null, 6), 'tower3');
  assert.equal(sceneOf(null, 0), 'tower1');
});

test('every scene maps to a bed, the castle and the spells share one, the three tower acts have their own', () => {
  for (const scene of SCENES) assert.ok(BEDS[BED_OF[scene]], `${scene} has a bed`);
  assert.equal(BED_OF.castle, BED_OF.spells);
  assert.deepEqual([BED_OF.tower1, BED_OF.tower2, BED_OF.tower3], ['crypt', 'halls', 'storm']);
  assert.equal(new Set(Object.values(BED_OF)).size, BED_IDS.length, 'no bed goes unused');
});

test('each bed is quiet, has something playing and spaces its one-shots out', () => {
  for (const id of BED_IDS) {
    const bed = BEDS[id];
    assert.equal(bed.id, id);
    assert.ok(bed.level > 0 && bed.level <= BED_LEVEL_MAX, `${id} sits under the music`);
    assert.ok(bed.layers.length > 0);
    for (const l of bed.layers) assert.ok(l.gain > 0 && l.gain <= 1);
    assert.ok(bed.shots.length > 0);
    assert.ok(bed.gap[0] >= MIN_SHOT_GAP_S && bed.gap[1] >= bed.gap[0], `${id}'s shots are a few seconds apart`);
    if (bed.echo) assert.ok(bed.echo.feedback < 0.8, 'the echo dies away');
  }
  assert.equal(BED_FADE_S, 1.5);
});

test('a shot clock waits at least the minimum gap, never catches up, and is the same for the same luck', () => {
  assert.equal(shotGap([1, 2], 0), MIN_SHOT_GAP_S, 'a short range is held to the floor');
  assert.equal(shotGap([4, 9], 0), 4);
  assert.equal(shotGap([4, 9], 1), 9);
  assert.equal(shotGap([4, 9], 7), 9, 'luck out of range is held');
  const clock = new ShotClock([4, 9], walker([0, 0.5, 1]), 10);
  assert.equal(clock.due(10), false, 'not at once');
  assert.equal(clock.due(13.9), false);
  assert.equal(clock.due(14), true, 'the first gap (the low end)');
  clock.fired(14);
  assert.equal(clock.at, 14 + 6.5);
  assert.equal(clock.due(20), false);
  // (a long silence, the page away: one shot, then a whole new gap, not a burst)
  assert.equal(clock.due(500), true);
  clock.fired(500);
  assert.equal(clock.at, 509);
  assert.equal(clock.due(500.5), false);
  // (over a long run of gaps none is under the floor)
  const long = new ShotClock([2.5, 5.5], Math.random, 0);
  let last = 0;
  for (let i = 0; i < 500; i++) {
    const at = long.at;
    assert.ok(at - last >= MIN_SHOT_GAP_S - 1e-9);
    long.fired(at);
    last = at;
  }
});

test('a one-shot is picked by weight', () => {
  const shots = [{ kind: 'clink' as const, weight: 2 }, { kind: 'pop' as const, weight: 1 }];
  assert.equal(pickShot(shots, 0), 'clink');
  assert.equal(pickShot(shots, 0.66), 'clink');
  assert.equal(pickShot(shots, 0.7), 'pop');
  assert.equal(pickShot(shots, 1), 'pop');
  assert.equal(pickShot([{ kind: 'bird', weight: 1 }], 0.5), 'bird');
});

/* ------------------------------------------------------------------ the cues the new places call for */

test('a twist reveals dark for a curse, bright for a blessing, and both softly for a mixed one', () => {
  assert.deepEqual(twistCues('curse'), [{ cue: 'twistCurse' }]);
  assert.deepEqual(twistCues('blessing'), [{ cue: 'twistBlessing' }]);
  const mixed = twistCues('mixed');
  assert.deepEqual(mixed.map((q) => q.cue), ['twistCurse', 'twistBlessing']);
  assert.ok(mixed.every((q) => (q.gain ?? 1) < 1));
  assert.ok((mixed[1].delay ?? 0) > 0, 'one after the other');
});

test('a relic set chimes as a chord for two pieces and a fanfare for three or more, and not for one', () => {
  assert.equal(setChime(0), null);
  assert.equal(setChime(1), null);
  assert.equal(setChime(2), 'setChime2');
  assert.equal(setChime(3), 'setChime3');
  assert.equal(setChime(4), 'setChime3');
  // (the fanfare is the bigger sound: it rings longer and holds more voices)
  assert.ok(CUES.setChime3.ms > CUES.setChime2.ms && CUES.setChime3.weight > CUES.setChime2.weight);
});

test('the new cues have mixer specs', () => {
  for (const name of ['steps', 'twistCurse', 'twistBlessing', 'eliteSting', 'setChime2', 'setChime3', 'coinRecycle', 'coinClaim', 'sparkle', 'autoStart', 'autoStop', 'autoDone'] as const) {
    assert.ok(CUES[name], name);
    assert.ok(CUES[name].ms > 0 && CUES[name].weight > 0);
  }
});

/* ------------------------------------------------------------------ the beds, on a stand-in for Web Audio */

const made = () => [...FakeContext.made];
const fresh = (before: FakeNode[], after: FakeNode[]) => after.filter((n) => !before.includes(n));

test('every bed builds on the fake context, plays from its start, and is silent until faded in', () => {
  const undo = installFakeAudio();
  try {
    for (const scene of SCENES) {
      const ctx = new FakeContext();
      const beds = new AmbientBeds(ctx as unknown as AudioContext, walker([0.3, 0.6]));
      const before = made();
      beds.setScene(scene);
      const nodes = fresh(before, made());
      assert.ok(nodes.length > 4, `${scene} made nodes`);
      assert.equal(beds.bed, BED_OF[scene]);
      assert.equal(beds.live, 1);
      assert.ok(nodes.some((n) => n.started), `${scene} started something`);
      // (it joins the ambience output, and the fade begins from silence)
      const fadeIn = nodes.find((n) => n.to.includes(beds.output as unknown as FakeNode));
      assert.ok(fadeIn, 'the bed reaches the output');
      assert.equal(fadeIn!.gain.calls[0][1], 0);
      assert.ok(fadeIn!.gain.target === 1);
      beds.destroy();
    }
  } finally {
    undo();
  }
});

test('a change of scene crossfades over about 1.5 s, then the old bed is stopped and disconnected; never more than two sound', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const undo = installFakeAudio();
  try {
    const ctx = new FakeContext();
    const beds = new AmbientBeds(ctx as unknown as AudioContext, walker([0.3, 0.6]));
    const b0 = made();
    beds.setScene('camp');
    const camp = fresh(b0, made());
    const b1 = made();
    beds.setScene('tavern');
    const tavern = fresh(b1, made());
    assert.equal(beds.live, 2, 'both sound during the fade');
    const campFade = camp[0];
    assert.equal(campFade.gain.target, 0, 'the old bed fades out');
    assert.ok(camp.some((n) => !n.stopped));
    mock.timers.tick(BED_FADE_S * 1000 - 100);
    assert.equal(beds.live, 2, 'not yet');
    mock.timers.tick(600);
    assert.equal(beds.live, 1);
    for (const n of camp) {
      assert.equal(n.to.length, 0, 'every old node is disconnected');
      if (n.started) assert.ok(n.stopped, 'and every old source stopped');
    }
    assert.ok(tavern.some((n) => n.started && !n.stopped), 'the new bed plays on');
    // (the same bed again, castle to spells, changes nothing)
    beds.setScene('castle');
    mock.timers.tick(3000);
    const n0 = FakeContext.made.length;
    beds.setScene('spells');
    assert.equal(FakeContext.made.length, n0);
    assert.equal(beds.bed, 'castle');
    // (scenes flicking by faster than the fade: the one fading is cut at once, so two beds at most)
    for (const s of ['armies', 'hall', 'field', 'tower1', 'tower2', 'tower3'] as Scene[]) {
      beds.setScene(s);
      assert.ok(beds.live <= 2, `${s}: ${beds.live} live`);
    }
    mock.timers.tick(3000);
    assert.equal(beds.live, 1);
    assert.equal(beds.bed, 'storm');
    // (silence)
    beds.setScene(null);
    mock.timers.tick(3000);
    assert.equal(beds.live, 0);
    beds.destroy();
  } finally {
    undo();
    mock.timers.reset();
  }
});

test('the one-shot timer makes nothing until a shot is due, then one, and at most one every few seconds', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const undo = installFakeAudio();
  try {
    const ctx = new FakeContext();
    const beds = new AmbientBeds(ctx as unknown as AudioContext, walker([0, 0.5, 1, 0.25]));
    beds.setScene('castle');
    const shots: number[] = [];
    const real = beds.shot.bind(beds);
    beds.shot = (bed, kind, t) => {
      shots.push(t);
      real(bed, kind, t);
    };
    const quiet = FakeContext.made.length;
    // (a minute of half-second ticks: the timer runs, the clock moves)
    for (let i = 0; i < 120; i++) {
      ctx.currentTime = (i + 1) * 0.5;
      mock.timers.tick(500);
    }
    assert.ok(shots.length >= 2, `some shots in a minute (${shots.length})`);
    assert.ok(shots.length <= 60 / MIN_SHOT_GAP_S, 'and no more than the floor allows');
    for (let i = 1; i < shots.length; i++) assert.ok(shots[i] - shots[i - 1] >= MIN_SHOT_GAP_S - 1e-9);
    assert.ok(FakeContext.made.length > quiet, 'shots made short nodes');
    // (a suspended clock makes nothing)
    ctx.state = 'suspended';
    const n = shots.length;
    ctx.currentTime += 100;
    mock.timers.tick(5000);
    assert.equal(shots.length, n);
    beds.destroy();
  } finally {
    undo();
    mock.timers.reset();
  }
});

test('every one-shot kind can be made', () => {
  const undo = installFakeAudio();
  try {
    const ctx = new FakeContext();
    const beds = new AmbientBeds(ctx as unknown as AudioContext, walker([0.3, 0.7, 0.1]));
    beds.setScene('camp');
    const kinds = new Set(BED_IDS.flatMap((id) => BEDS[id].shots.map((s) => s.kind)));
    assert.equal(kinds.size, 8);
    const bus = new FakeNode(ctx as unknown as FakeContext);
    for (const kind of kinds) {
      const before = FakeContext.made.length;
      beds.shot({ bus: bus as unknown as GainNode }, kind, 1);
      assert.ok(FakeContext.made.length > before, `${kind} made something`);
    }
    beds.destroy();
  } finally {
    undo();
  }
});
