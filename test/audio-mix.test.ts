import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, startBattle, type BattleEvent } from '../src/sim/battle';
import { castSpell, SPELL_IDS } from '../src/sim/spells';
import { EPIC_MANIFEST } from '../src/render/epicManifest';
import { MUSIC_LEVEL, SFX_LEVEL, SHOW_CUES, TRACK_GAIN, UI_CUES, UI_LEVEL, busOf, trackGain } from '../src/render/audioMix';
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

test('the music under a fight is trimmed below the menus\' music (measured loudness: docs/notes/audio-mix.md)', () => {
  // (each battle track sits 7 LU under the fight; the menus' music 2.5 LU above the battle tracks. The trims are what gets there
  //  from each file's own loudness, so only their sanity is checked here: a battle track is never lifted above its file)
  // (the battle tracks are the main theme's arrangements since MUSIC-THEME: the general one, the boss, the Calamity's and each army's)
  const battles = ['battle', 'boss', 'calbattle', 'orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'] as const;
  for (const id of battles) assert.ok(TRACK_GAIN[id] < 1, `${id} is brought down`);
  // (and each sits below every menu track, as the fight's music steps down from the camp's)
  for (const id of battles) for (const menu of ['camp', 'tavern', 'deploy', 'calmap'] as const) assert.ok(TRACK_GAIN[id] < TRACK_GAIN[menu], `${id} under ${menu}`);
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
    music.setTrack('calbattle');
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(FakeContext.made.some((n) => n.gain?.target === TRACK_GAIN.calbattle), 'the loop fades in to its trim');
    music.setTrack('calbattle', 0.5);
    assert.ok(FakeContext.made.some((n) => n.gain?.target === 0.5 * TRACK_GAIN.calbattle), 'a level glides on top of it');
    music.destroy();
  } finally {
    undo();
  }
});
