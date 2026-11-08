import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BED_LIMIT_DB, DUCKS, DUCK_DOWN_S, DUCK_HOLD_S, DUCK_UP_S, MASTER_LIMIT_DB, OPEN_HZ, SLIDER_STEP, STING_FADE_S, WAKE_FADE_S,
  compressorMakeupDb, curvedVolume, duckChange, duckOf, duckTc, fadeCurve, sliderDb, sliderGain,
} from '../src/render/audioRules';
import { BOSS_IN_S, BOSS_OUT_S, BOSS_TRACK, BATTLE_TRACK, CROSSFADE_S, FIGHT_LEVEL, FIGHT_MUSIC_DB, crossfadeOf, musicOf } from '../src/render/battleMusic';
import { TRACK_OF_PLACE } from '../src/render/epicMusic';
import { FakeContext, installFakeAudio } from './audioFake';

// The sound pass (docs/notes/sound-pass.md): the owner's "the music volume still feels very bad". The rules behind the fixes.

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

/* ------------------------------------------------------------------ the slider */

test('the volume slider is perceptual: half way is half as loud (-10 dB), every step a like step down, and the ends exact', () => {
  assert.equal(sliderGain(0), 0);
  assert.equal(sliderGain(-5), 0);
  assert.equal(sliderGain(100), 1);
  assert.equal(sliderGain(150), 1);
  assert.ok(close(sliderDb(50), -10, 1e-9), `50 %: ${sliderDb(50)}`);
  assert.ok(close(sliderDb(25), -20, 1e-9), `25 %: ${sliderDb(25)}`);
  assert.ok(sliderDb(10) < -30 && sliderDb(10) > -36, `10 %: ${sliderDb(10)}`);
  // (it falls the whole way, a step at a time: no step jumps more than the last ones of the old straight slider did)
  let last = -Infinity;
  for (let p = SLIDER_STEP; p <= 100; p += SLIDER_STEP) {
    const db = sliderDb(p);
    assert.ok(db > last, `${p} % is louder than the step below`);
    last = db;
  }
  // (the old straight slider spent 50 % of its travel within 6 dB of full; this one goes down 10 dB in that half)
  assert.ok(20 * Math.log10(0.5) > -6.1 && sliderDb(50) < -9.9);
  // (every halving of the slider is the same 10 dB, at the top or the bottom: the old one's last tenth fell from -20 dB to nothing)
  assert.ok(close(sliderDb(100) - sliderDb(50), 10, 1e-9) && close(sliderDb(20) - sliderDb(10), 10, 1e-9));
});

test('a volume saved on the old straight slider keeps its loudness on the curve, to the slider\'s step', () => {
  for (const old of [10, 20, 30, 40, 50, 60, 70, 80, 90]) {
    const now = curvedVolume(old);
    assert.equal(now % SLIDER_STEP, 0, `${old}: ${now} is on a step`);
    // (within half a step's change of loudness of what it was)
    const was = 20 * Math.log10(old / 100);
    assert.ok(Math.abs(sliderDb(now) - was) < 1.5, `${old} % (${was.toFixed(1)} dB) is now ${now} % (${sliderDb(now).toFixed(1)} dB)`);
  }
  assert.equal(curvedVolume(0), 0);
  assert.equal(curvedVolume(100), 100);
  assert.equal(curvedVolume(1), SLIDER_STEP, 'a tiny volume is never rounded to silence');
  assert.equal(curvedVolume(50), 65);
});

/* ------------------------------------------------------------------ ducking */

test('the ducking amounts: a sheet, an event and a cinematic only lower the music, the shows dip it and muffle it', () => {
  const db = (reasons: string[]) => 20 * Math.log10(duckOf(reasons).gain);
  assert.ok(close(db(['sheet']), -4));
  assert.ok(close(db(['event']), -4));
  assert.ok(close(db(['cinematic']), -3));
  assert.ok(close(db(['boss']), -6));
  for (const r of ['summon', 'reveal', 'eidolon', 'binding']) {
    assert.ok(close(db([r]), -9), r);
    assert.ok(duckOf([r]).hz <= 2000, `${r} muffles`);
  }
  for (const r of ['sheet', 'event', 'cinematic']) assert.equal(duckOf([r]).hz, OPEN_HZ, `${r} does not muffle`);
  // (the old dip was -8 dB and 1.4 kHz under everything: nothing that is not a show is half as deep now)
  for (const [r, d] of Object.entries(DUCKS)) if (d.hz === OPEN_HZ) assert.ok(d.db >= -4, r);
  assert.ok(db(['someNewReason']) < 0, 'a reason not named still dips');
});

test('ducking timing: down at once and gently, up more gently still, and a lift waits so nothing pumps', () => {
  assert.ok(DUCK_DOWN_S >= 0.2 && DUCK_DOWN_S <= 0.5, 'down in about a third of a second (no jolt)');
  assert.ok(DUCK_UP_S >= 2 * DUCK_DOWN_S, 'up slower than down');
  assert.ok(close(duckTc(true), DUCK_DOWN_S / 3) && close(duckTc(false), DUCK_UP_S / 3), 'settled in about three time constants');
  assert.ok(DUCK_HOLD_S >= 0.2 && DUCK_HOLD_S <= 0.5);
  assert.equal(duckChange([], ['sheet']), 'down');
  assert.equal(duckChange(['sheet'], []), 'up');
  assert.equal(duckChange(['sheet'], ['sheet', 'event']), null, 'a second sheet as deep changes nothing');
  assert.equal(duckChange(['sheet'], ['sheet', 'summon']), 'down');
  assert.equal(duckChange(['sheet', 'summon'], ['sheet']), 'up', 'a show over lifts back to the sheet\'s dip, after the hold');
  assert.equal(duckChange(['cinematic'], ['cinematic']), null, 'a cinematic held for the scene never moves line by line');
});

/* ------------------------------------------------------------------ crossfades */

test('a crossfade is equal-power: the two fades together hold the loudness, and each end is exact', () => {
  const up = fadeCurve(0, 1, 33);
  const down = fadeCurve(1, 0, 33);
  assert.equal(up[0], 0);
  assert.equal(up[up.length - 1], 1);
  assert.equal(down[0], 1);
  assert.equal(down[down.length - 1], 0);
  for (let i = 0; i < up.length; i++) assert.ok(close(up[i] ** 2 + down[i] ** 2, 1, 1e-6), `power holds at ${i}`);
  assert.ok(close(up[16], Math.SQRT1_2, 1e-6), 'half way, each at -3 dB');
  // (a fade cut short carries on from where it got to, and a level glides between any two)
  const mid = fadeCurve(0.4, 0.8, 9);
  assert.ok(close(mid[0], 0.4) && close(mid[8], 0.8));
  for (let i = 1; i < mid.length; i++) assert.ok(mid[i] >= mid[i - 1], 'never backwards');
});

test('crossfade timing: the boss in quickly, back out gently, any other change at the usual; stings and waking fade too', () => {
  assert.equal(crossfadeOf(BATTLE_TRACK, BOSS_TRACK), BOSS_IN_S);
  assert.equal(crossfadeOf(BOSS_TRACK, BATTLE_TRACK), BOSS_OUT_S);
  assert.equal(crossfadeOf(TRACK_OF_PLACE.deploy, BATTLE_TRACK), CROSSFADE_S);
  assert.equal(crossfadeOf(TRACK_OF_PLACE.camp, TRACK_OF_PLACE.tavern), CROSSFADE_S);
  assert.ok(BOSS_IN_S < BOSS_OUT_S && CROSSFADE_S >= 1);
  assert.ok(STING_FADE_S >= 0.6 && STING_FADE_S <= 1.2, 'the music fades from under a fanfare, never cut');
  assert.ok(WAKE_FADE_S > 0.2 && WAKE_FADE_S <= 1, 'back from away without a jolt');
});

test('a battle\'s music sits a steady 3.5 dB under the place\'s, through every wave and every deploy between', () => {
  assert.equal(FIGHT_MUSIC_DB, -3.5);
  assert.ok(close(FIGHT_LEVEL, 10 ** (-3.5 / 20)));
  const place = (p: keyof typeof TRACK_OF_PLACE) => TRACK_OF_PLACE[p];
  const s = { place: 'deploy' as const, battle: BATTLE_TRACK, fighting: true, victory: false };
  assert.equal(musicOf(s, place).level, FIGHT_LEVEL);
  assert.equal(musicOf({ ...s, fighting: false }, place).level, FIGHT_LEVEL, 'the same between waves');
  assert.equal(musicOf({ ...s, battle: BOSS_TRACK }, place).level, FIGHT_LEVEL, 'the boss the same');
  assert.equal(musicOf({ ...s, battle: null, fighting: false }, place).level, 1, 'the deployment\'s own music at full');
});

test('the crossfade in the player: the new track in and the old out over the same length, both on the curve', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  const { EPIC_INFO } = await import('../src/render/musicBake');
  const { LOOP_START } = await import('../src/render/epicMusic');
  try {
    const ctx = new FakeContext();
    const baked = () => {
      const b = { pad: ctx.createBuffer(2, 100) as unknown as AudioBuffer, bass: null, lead: null, drums: null };
      EPIC_INFO.set(b, { loop: [LOOP_START, LOOP_START + 60] });
      return b;
    };
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => baked(), async () => ({ duration: 1 }) as unknown as AudioBuffer);
    music.setTrack('camp');
    await new Promise((r) => setTimeout(r, 10));
    const mark = FakeContext.made.length;
    music.setTrack('tavern', 1, 2);
    await new Promise((r) => setTimeout(r, 10));
    const curves = FakeContext.made.flatMap((n) => n.gain.calls.filter((c) => c[0] === 'curve'));
    const ins = FakeContext.made.slice(mark).flatMap((n) => n.gain.calls.filter((c) => c[0] === 'curve' && (c[1] as number) > 0));
    const outs = curves.filter((c) => c[1] === 0);
    assert.ok(ins.some((c) => c[3] === 2), 'the new track in over 2 s');
    assert.ok(outs.some((c) => c[3] === 2), 'the old one out over the same 2 s');
    music.destroy();
  } finally {
    undo();
  }
});

/* ------------------------------------------------------------------ the limiters */

test('the native compressor\'s makeup gain is undone, so the volume does not step when the limiter takes over', () => {
  // (measured in Chromium, a hard knee: threshold -2 and ratio 20 add 1.14 dB, -6 and 20 add 3.42 dB, -1 and 20 add 0.57 dB)
  assert.ok(close(compressorMakeupDb(-2, 20), 1.14, 0.01));
  assert.ok(close(compressorMakeupDb(-6, 20), 3.42, 0.01));
  assert.ok(close(compressorMakeupDb(-1, 20), 0.57, 0.01));
  assert.ok(MASTER_LIMIT_DB < 0 && MASTER_LIMIT_DB >= -2);
  assert.ok(BED_LIMIT_DB < MASTER_LIMIT_DB, 'the music\'s limiter only catches what the master would');
});

test('the mixer: the bed passes a high-pass, the ducker and its limiter; the fallback\'s makeup is taken off after it', async () => {
  const undo = installFakeAudio();
  const { BusMixer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const mixer = new BusMixer(ctx as unknown as AudioContext);
    const comps = FakeContext.made.filter((n) => (n as unknown as { threshold: { value: number } }).threshold.value === MASTER_LIMIT_DB && n.ratio.value === 20);
    assert.ok(comps.length >= 1, 'the master\'s fallback limits at the master\'s level');
    const after = comps[0].to[0];
    assert.ok(close(20 * Math.log10(after.gain.value), -compressorMakeupDb(MASTER_LIMIT_DB, 20), 1e-9), 'and its makeup is taken off');
    assert.ok(FakeContext.made.some((n) => n.type === 'highpass'), 'the bed has its high-pass');
    mixer.destroy();
  } finally {
    undo();
  }
});
