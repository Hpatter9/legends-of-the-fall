import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, startBattle, type BattleEvent } from '../src/sim/battle';
import { castSpell, SPELL_IDS } from '../src/sim/spells';
import { EPIC_MANIFEST } from '../src/render/epicManifest';
import { AMBIENCE_LEVEL, FILE_LOUDNESS, MUSIC_LEVEL, PLAYBACK_REF, SFX_LEVEL, SHOW_CUES, STING_LUFS, TRACK_GAIN, UI_CUES, UI_LEVEL, busOf, playbackLufs, trackGain, type MusicFile } from '../src/render/audioMix';
import { CUES, type Cue } from '../src/render/soundRules';
import { CAST_GAIN, SPELL_TRIM, spellParts } from '../src/render/spellSfx';
import { EPIC_INFO, type Baked } from '../src/render/musicBake';
import { LOOP_START } from '../src/render/epicMusic';
import { FakeContext, installFakeAudio } from './audioFake';


test('every music file has a trim, and the trims are sane (no file pushed or cut by more than about 8 dB)', () => {
  for (const id of Object.keys(EPIC_MANIFEST)) {
    const g = TRACK_GAIN[id as keyof typeof TRACK_GAIN];
    assert.ok(Number.isFinite(g), `${id} has a trim`);
    assert.ok(g >= 0.38 && g <= 2.5, `${id}: ${g}`);
  }
  assert.deepEqual(Object.keys(TRACK_GAIN).sort(), Object.keys(EPIC_MANIFEST).sort(), 'no trim for a file that does not exist');
  assert.equal(trackGain('town'), TRACK_GAIN.camp, 'the old name is the camp');
  assert.equal(trackGain('nothing'), 1, 'a track with no file is left as it is');
});

test('every cue has a gain in bounds, and every cue goes to a bus', () => {
  for (const [name, spec] of Object.entries(CUES)) {
    assert.ok(Number.isFinite(spec.gain) && spec.gain > 0 && spec.gain <= 10, `${name}: ${spec.gain}`);
    assert.ok(['ui', 'show', 'sfx'].includes(busOf(name as Cue)));
  }
  for (const c of UI_CUES) assert.equal(busOf(c), 'ui');
  for (const c of SHOW_CUES) assert.equal(busOf(c), 'show');
  assert.equal(busOf('hitSword'), 'sfx');
});

// (the music's place under the effects is checked by loudness at the speakers in test/music-loudness.test.ts: the bus levels
//  alone say nothing of it, as the files and the cues are at their own loudness before them)
test('the buses sit inside the master', () => {
  for (const level of [MUSIC_LEVEL, SFX_LEVEL, UI_LEVEL, AMBIENCE_LEVEL]) assert.ok(level > 0 && level <= 1);
});

// (changed by the sound pass, docs/notes/sound-pass.md: every file is mastered to one plain loudness, but a phone's speaker plays a
//  bass-heavy track (the boss's, the heralds') 2 to 5 LU quieter than a bright one (the camp's); each loop is now trimmed to one
//  playback loudness, its plain and its phone loudness together, instead of every loop taking the one trim)
test('every loop is trimmed to the one playback loudness (its plain and its phone loudness together), the stings to their moments', () => {
  const db = (g: number) => 20 * Math.log10(g);
  for (const [id, e] of Object.entries(EPIC_MANIFEST)) {
    const f = id as MusicFile;
    const m = FILE_LOUDNESS[f];
    assert.ok(Number.isFinite(m.phone) && m.phone <= m.lufs + 0.5, `${id}: its phone loudness is measured`);
    assert.ok(Math.abs(playbackLufs(f) - (m.lufs + m.phone) / 2) < 1e-9);
    if (e.loop) {
      assert.ok(Math.abs(playbackLufs(f) + db(TRACK_GAIN[f]) - PLAYBACK_REF) < 1e-9, `${id} plays at the one playback loudness`);
      assert.ok(Math.abs(db(TRACK_GAIN[f])) <= 2, `${id}'s trim is small: ${db(TRACK_GAIN[f]).toFixed(2)} dB`);
    }
  }
  // (the stings at their own loudness through the music bus)
  for (const id of ['victory', 'defeat'] as const) {
    assert.ok(Math.abs(FILE_LOUDNESS[id].lufs + db(MUSIC_LEVEL * TRACK_GAIN[id]) - STING_LUFS[id]) < 1e-9, id);
  }
  assert.ok(STING_LUFS.victory > STING_LUFS.defeat, 'the fanfare over the fall\'s sting');
  assert.ok(AMBIENCE_LEVEL > 0 && AMBIENCE_LEVEL <= 1);
});

test('every king\'s spell has a trim, and the trim scales its cast and its effect alike', () => {
  for (const id of SPELL_IDS) {
    const k = SPELL_TRIM[id];
    assert.ok(Number.isFinite(k) && k >= 0.5 && k <= 2, `${id}: ${k}`);
  }
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.spells.mana = 10;
  addUnit(b, 'skeleton', 3, 3);
  assert.ok(castSpell(b, 'frost', 3, 3));
  const events = b.spells.events.splice(0) as BattleEvent[];
  const e = events.find((x): x is Extract<BattleEvent, { kind: 'spell' }> => x.kind === 'spell')!;
  const cast = spellParts(b, e, events).find((p) => p.role === 'cast')!;
  assert.ok(Math.abs(cast.gain - CAST_GAIN * SPELL_TRIM.frost) < 1e-9);
});

test('the music player plays a file at its trim, and a level on top of it (the victory\'s bed)', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const baked = (): Baked => {
      const b: Baked = { pad: ctx.createBuffer(2, 100) as unknown as AudioBuffer, bass: null, lead: null, drums: null };
      EPIC_INFO.set(b, { loop: [LOOP_START, LOOP_START + 60] });
      return b;
    };
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => baked(), async () => ({ duration: 1 }) as unknown as AudioBuffer);
    music.setTrack('boss');
    await new Promise((r) => setTimeout(r, 10));
    // (a fade's curve is 32-bit, so its end is matched to a millionth)
    const near = (x: number | undefined, y: number) => x !== undefined && Math.abs(x - y) < 1e-6;
    assert.ok(FakeContext.made.some((n) => near(n.gain?.target, TRACK_GAIN.boss)), 'the loop fades in to its trim');
    music.setTrack('boss', 0.5);
    assert.ok(FakeContext.made.some((n) => near(n.gain?.target, 0.5 * TRACK_GAIN.boss)), 'a level glides on top of it');
    music.destroy();
  } finally {
    undo();
  }
});
