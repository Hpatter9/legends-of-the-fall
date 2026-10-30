import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { armyRun, newRun, waveArmyOf, type Run } from '../src/sim/run';
import { GENERAL_TRACK, VICTORY_BED, VICTORY_LOOP, armyTrack, atPlace, endOfFight, musicOf, standTrack, trackOfRun, type MusicState } from '../src/render/battleMusic';
import { ARMY_TRACKS, TRACK_OF_PLACE } from '../src/render/epicMusic';
import { EPIC_MANIFEST } from '../src/render/epicManifest';
import { FakeContext, installFakeAudio } from './audioFake';
import { EPIC_INFO, type Baked } from '../src/render/musicBake';
import { LOOP_START } from '../src/render/epicMusic';
import { trackGain } from '../src/render/audioMix';

/** A run of a mode at a stage, for the rules (a tower's floor is only what the rules read of it). */
function towerAt(stage: number, kind: 'fight' | 'elite' | 'boss', calamity = false): Run {
  const run = newRun(5, undefined, undefined, 0);
  run.stage = stage;
  run.mode = calamity ? { kind: 'calamity' } : { kind: 'tower' };
  run.tower = { cur: { id: 1, kind } } as unknown as Run['tower'];
  return run;
}
const daily = (date: number): Run => ({ ...armyRun(1, ARMIES[0].id), mode: { kind: 'daily', date, practice: true } });

test('a battle keeps one track from its first wave to its last: no switching by wave, and a boss wave does not change it', () => {
  for (const army of ARMIES) {
    for (const tier of [0, 1, 2, 3, 4]) {
      const run = armyRun(1234 + tier, army.id, undefined, undefined, tier);
      const first = trackOfRun(run);
      for (let w = 1; w <= army.waves.length; w++) {
        run.stage = w;
        assert.equal(trackOfRun(run), first, `${army.id} tier ${tier} wave ${w}`);
      }
    }
  }
  const d = daily(20261029);
  const first = trackOfRun(d);
  for (let w = 1; w <= waveArmyOf(d)!.waves.length; w++) assert.equal(trackOfRun({ ...d, stage: w }), first, `daily wave ${w}`);
  assert.ok(waveArmyOf(d)!.waves.some((w) => w.boss), 'the daily has its boss wave, and it plays the battle\'s track');
});

test('each army plays its own track (the main theme in its dress) at every tier; the daily and the Last Stand the general one', () => {
  const seen = new Set<string>();
  for (const army of ARMIES) {
    for (const tier of [0, 1, 2, 3, 4]) {
      const want = army.waves.length === 1 && army.waves[0].boss ? 'boss' : armyTrack(army.id);
      assert.equal(trackOfRun(armyRun(40 + tier, army.id, undefined, undefined, tier)), want, `${army.id} tier ${tier}`);
    }
    // (the seed no longer picks: every run of an army sounds like that army)
    assert.equal(trackOfRun(armyRun(1, army.id)), trackOfRun(armyRun(2, army.id)), army.id);
    seen.add(trackOfRun(armyRun(1, army.id)));
  }
  assert.equal(seen.size, ARMIES.length, 'no two armies share a track');
  for (const id of ARMY_TRACKS) assert.ok(ARMIES.some((a) => a.id === id), `${id} is an army`);
  for (const id of ARMY_TRACKS) assert.ok(EPIC_MANIFEST[id]?.loop, `${id} has its file`);
  assert.equal(armyTrack('an army with no track yet'), GENERAL_TRACK);
  assert.equal(trackOfRun(daily(20261029)), GENERAL_TRACK);
  assert.equal(trackOfRun(daily(20261030)), GENERAL_TRACK, 'every day');
  assert.equal(standTrack(77), GENERAL_TRACK);
  assert.equal(standTrack(-5), GENERAL_TRACK);
});

test('a single fight takes its track by what it is: a boss, the Calamity, a spire floor the general track', () => {
  assert.equal(trackOfRun(towerAt(4, 'boss', true)), 'boss');
  assert.equal(trackOfRun(towerAt(4, 'fight', true)), 'calbattle');
  assert.equal(trackOfRun(towerAt(30, 'boss')), 'boss');
  assert.deepEqual([1, 9, 10, 24, 25].map((f) => trackOfRun(towerAt(f, 'fight'))), Array(5).fill(GENERAL_TRACK));
  assert.equal(trackOfRun(towerAt(3, 'elite')), GENERAL_TRACK);
  assert.equal(trackOfRun(newRun(1)), GENERAL_TRACK, 'a field fight');
});

test('victory music only when the whole battle is won; the defeat sting only when it is lost for good', () => {
  const army = ARMIES[0];
  const run = armyRun(3, army.id);
  for (let w = 1; w < army.waves.length; w++) assert.equal(endOfFight({ ...run, stage: w }, true), 'none', `wave ${w} won: the battle goes on`);
  assert.equal(endOfFight({ ...run, stage: army.waves.length }, true), 'victory', 'the last wave won');
  assert.equal(endOfFight(run, false), 'none', 'a fall a heart revives');
  assert.equal(endOfFight({ ...run, retries: 99 }, false), 'defeat', 'no heart left');
  const d = daily(20261029);
  assert.equal(endOfFight({ ...d, stage: 3 }, true), 'none');
  assert.equal(endOfFight({ ...d, stage: waveArmyOf(d)!.waves.length }, true), 'victory');
  // (a spire floor and a Calamity spot are battles of their own: each won is a victory, each lost the end)
  assert.equal(endOfFight(towerAt(7, 'fight'), true), 'victory');
  assert.equal(endOfFight(towerAt(7, 'fight', true), true), 'victory');
  assert.equal(endOfFight(towerAt(7, 'fight'), false), 'defeat');
  // (a field fight, a plain stage run's)
  assert.equal(endOfFight(newRun(1), true), 'victory');
});

test('the battle track plays through the breaks between waves, a victory holds the triumph bed until the results are left', () => {
  const want = (s: MusicState) => musicOf(s, (p) => TRACK_OF_PLACE[p]);
  let s: MusicState = { place: 'deploy', battle: null, fighting: false, victory: false };
  assert.equal(want(s).track, 'deploy', 'the first deploy has its own music');
  s = { ...s, battle: 'orcs', fighting: true };
  assert.deepEqual(want(s), { track: 'orcs', level: 1 });
  // (a wave won: the fight is over, the result screen and the next deploy are on the board, and the battle plays on)
  s = { ...s, fighting: false };
  assert.deepEqual(want(atPlace(s, 'deploy')), { track: 'orcs', level: 1 });
  // (the battle won: the triumph bed, lower than a track's full level)
  const won: MusicState = { ...s, battle: null, victory: true };
  assert.deepEqual(want(won), { track: VICTORY_LOOP, level: VICTORY_BED });
  assert.ok(VICTORY_BED < 1 && VICTORY_BED > 0.3);
  // (leaving for the camp or a map ends both a battle left half-way and a victory's music)
  assert.deepEqual(atPlace(s, 'camp'), { place: 'camp', battle: null, fighting: false, victory: false });
  assert.equal(want(atPlace(won, 'tower')).track, 'tower');
  // (but a fight still being fought keeps its battle, wherever the page says the player is)
  assert.equal(want(atPlace({ ...s, fighting: true }, 'camp')).track, 'orcs');
});

/** A baked track as an epic file would give it. */
function epicBaked(ctx: FakeContext): Baked {
  const buf = ctx.createBuffer(2, 100) as unknown as AudioBuffer;
  const b: Baked = { pad: buf, bass: null, lead: null, drums: null };
  EPIC_INFO.set(b, { loop: [LOOP_START, LOOP_START + 60] });
  return b;
}

test('the victory fanfare holds the music from the moment it is asked for, then the triumph loop comes in at its bed level', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const fanfare = { duration: 1 } as unknown as AudioBuffer;
    // (the fanfare's file takes a moment to decode: the triumph asked for meanwhile must still wait for it)
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => epicBaked(ctx), () => new Promise((r) => setTimeout(() => r(fanfare), 30)));
    const loops = () => FakeContext.made.filter((n) => n.loop && n.started);
    music.setTrack('battle');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(loops().length, 1);
    music.sting('victory');
    music.setTrack('triumph', VICTORY_BED);
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(loops().length, 1, 'the triumph waits for the fanfare');
    assert.equal(FakeContext.made.filter((n) => n.started && n.buffer === fanfare).length, 1, 'the fanfare plays once');
    assert.equal(music.stingId, 'victory');
    await new Promise((r) => setTimeout(r, 1600));
    const triumph = loops()[1];
    assert.ok(triumph, 'then the triumph loop');
    assert.deepEqual(music.sounding, ['triumph']);
    // (the bed level, on the triumph file's own trim: `TRACK_GAIN` in audioMix.ts)
    const trim = trackGain('triumph');
    const fade = FakeContext.made.find((n) => n.gain?.target === VICTORY_BED * trim);
    assert.ok(fade, 'at the bed level');
    // (a victory cinematic asks for the same track at full level: it glides up and plays on, no restart)
    music.setTrack('triumph', 1);
    assert.equal(loops().length, 2);
    assert.equal(fade!.gain.target, trim);
    music.destroy();
  } finally {
    undo();
  }
});
