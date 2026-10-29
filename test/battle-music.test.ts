import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { armyRun, newRun, waveArmyOf, type Run } from '../src/sim/run';
import { BATTLE_TRACKS, VICTORY_BED, VICTORY_LOOP, atPlace, depthLevel, endOfFight, musicOf, standTrack, trackOfRun, type MusicState } from '../src/render/battleMusic';
import { TRACK_OF_PLACE } from '../src/render/epicMusic';
import { FakeContext, installFakeAudio } from './audioFake';
import { EPIC_INFO, type Baked } from '../src/render/musicBake';
import { LOOP_START } from '../src/render/epicMusic';

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

test('battles differ from run to run: an army by its seed (the top tiers the hardest track), the daily by its day', () => {
  const army = ARMIES[0].id;
  const tracks = new Set([1, 2, 3, 4, 5, 6].map((seed) => trackOfRun(armyRun(seed, army))));
  assert.deepEqual([...tracks].sort(), [...BATTLE_TRACKS].sort(), 'every battle track turns up');
  assert.equal(trackOfRun(armyRun(9, army, undefined, undefined, 3)), 'battle3', 'Legendary');
  assert.equal(trackOfRun(armyRun(10, army, undefined, undefined, 4)), 'battle3', 'Mythic');
  assert.equal(trackOfRun(daily(20261029)), trackOfRun(daily(20261029)), 'the same all day');
  assert.equal(new Set([0, 1, 2].map((d) => trackOfRun(daily(20261029 + d)))).size, 3, 'and another the next');
  // (the Last Stand by its seed, so a run resumed keeps its track)
  assert.equal(standTrack(77), standTrack(77));
  assert.equal(new Set([0, 1, 2].map(standTrack)).size, 3);
  assert.ok(BATTLE_TRACKS.includes(standTrack(-5) as (typeof BATTLE_TRACKS)[number]), 'a negative seed is a battle track too');
});

test('a single fight takes its track by what it is: a boss, the Calamity, a spire floor by depth', () => {
  assert.equal(trackOfRun(towerAt(4, 'boss', true)), 'boss');
  assert.equal(trackOfRun(towerAt(4, 'fight', true)), 'calbattle');
  assert.equal(trackOfRun(towerAt(30, 'boss')), 'boss');
  assert.deepEqual([1, 9, 10, 24, 25].map((f) => trackOfRun(towerAt(f, 'fight'))), ['battle', 'battle', 'battle2', 'battle2', 'battle3']);
  assert.equal(trackOfRun(towerAt(3, 'elite')), 'battle2', 'an elite a step harder');
  assert.equal(depthLevel(30, true), 2, 'never past the top');
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
  s = { ...s, battle: 'battle2', fighting: true };
  assert.deepEqual(want(s), { track: 'battle2', level: 1 });
  // (a wave won: the fight is over, the result screen and the next deploy are on the board, and the battle plays on)
  s = { ...s, fighting: false };
  assert.deepEqual(want(atPlace(s, 'deploy')), { track: 'battle2', level: 1 });
  // (the battle won: the triumph bed, lower than a track's full level)
  const won: MusicState = { ...s, battle: null, victory: true };
  assert.deepEqual(want(won), { track: VICTORY_LOOP, level: VICTORY_BED });
  assert.ok(VICTORY_BED < 1 && VICTORY_BED > 0.3);
  // (leaving for the camp or a map ends both a battle left half-way and a victory's music)
  assert.deepEqual(atPlace(s, 'camp'), { place: 'camp', battle: null, fighting: false, victory: false });
  assert.equal(want(atPlace(won, 'tower')).track, 'tower');
  // (but a fight still being fought keeps its battle, wherever the page says the player is)
  assert.equal(want(atPlace({ ...s, fighting: true }, 'camp')).track, 'battle2');
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
    const fade = FakeContext.made.find((n) => n.gain?.target === VICTORY_BED);
    assert.ok(fade, 'at the bed level');
    // (a victory cinematic asks for the same track at full level: it glides up and plays on, no restart)
    music.setTrack('triumph', 1);
    assert.equal(loops().length, 2);
    assert.equal(fade!.gain.target, 1);
    music.destroy();
  } finally {
    undo();
  }
});
