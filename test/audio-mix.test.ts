import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, startBattle, type BattleEvent } from '../src/sim/battle';
import { castSpell, SPELL_IDS } from '../src/sim/spells';
import { EPIC_MANIFEST } from '../src/render/epicManifest';
import { AMBIENCE_LEVEL, LOOP_GAIN, MUSIC_LEVEL, SFX_LEVEL, SHOW_CUES, STING_GAIN, TRACK_GAIN, UI_CUES, UI_LEVEL, busOf, trackGain } from '../src/render/audioMix';
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

test('the buses sit inside the master, and the music under the effects', () => {
  for (const level of [MUSIC_LEVEL, SFX_LEVEL, UI_LEVEL]) assert.ok(level > 0 && level <= 1);
  assert.ok(MUSIC_LEVEL < SFX_LEVEL, 'the music bus is the quieter');
});

test('every loop takes the one trim (the files are mastered to one loudness), the stings ring over it', () => {
  // (changed for the owner's "level their volumes. It still feels off": the battle tracks were trimmed 2.5 LU under the menus'
  //  music and the scenes 1 LU over it, from files 10 LU apart; now every file is at -18 LUFS and every loop plays at the one
  //  level, docs/notes/battle-music-2.md; the levels at the speakers are checked in test/music-loudness.test.ts)
  for (const [id, e] of Object.entries(EPIC_MANIFEST)) {
    if (e.loop) assert.equal(TRACK_GAIN[id as keyof typeof TRACK_GAIN], LOOP_GAIN, id);
  }
  assert.equal(LOOP_GAIN, 1);
  assert.equal(TRACK_GAIN.victory, STING_GAIN.victory);
  assert.equal(TRACK_GAIN.defeat, STING_GAIN.defeat);
  assert.ok(STING_GAIN.victory > STING_GAIN.defeat && STING_GAIN.defeat > 1, 'the fanfare over the fall\'s sting, both over the music');
  assert.ok(AMBIENCE_LEVEL < MUSIC_LEVEL, 'the beds under the music');
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
    assert.ok(FakeContext.made.some((n) => n.gain?.target === TRACK_GAIN.boss), 'the loop fades in to its trim');
    music.setTrack('boss', 0.5);
    assert.ok(FakeContext.made.some((n) => n.gain?.target === 0.5 * TRACK_GAIN.boss), 'a level glides on top of it');
    music.destroy();
  } finally {
    undo();
  }
});
