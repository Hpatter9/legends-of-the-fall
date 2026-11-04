import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { armyRun, newRun, waveArmyOf, type Run } from '../src/sim/run';
import { BATTLE_TRACK, BOSS_IN_S, BOSS_OUT_S, BOSS_TRACK, CROSSFADE_S, VICTORY_BED, VICTORY_LOOP, atPlace, crossfadeOf, endAt, endOfFight, musicOf, standTrack, trackOfRun, type MusicState } from '../src/render/battleMusic';
import { standRoomTrack } from '../src/render/standMusic';
import { TRACK_OF_PLACE } from '../src/render/epicMusic';
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

test('every battle plays the one battle track, wave after wave, and the boss track only for a boss\'s own wave', () => {
  // (changed for the owner's "One good battle music for all the battles, with a more intense one for bosses": each army had
  // its own track, kept through its boss wave; docs/notes/battle-music-2.md)
  let bossWaves = 0;
  for (const army of ARMIES) {
    for (const tier of [0, 1, 2, 3, 4]) {
      const run = armyRun(1234 + tier, army.id, undefined, undefined, tier);
      for (let w = 1; w <= army.waves.length; w++) {
        run.stage = w;
        const boss = !!army.waves[w - 1].boss;
        if (boss) bossWaves++;
        assert.equal(trackOfRun(run), boss ? BOSS_TRACK : BATTLE_TRACK, `${army.id} tier ${tier} wave ${w}`);
      }
    }
  }
  assert.ok(bossWaves > 0, 'the armies have boss waves');
  // (the daily, every day: the battle track, and its boss wave the boss track)
  for (const date of [20261029, 20261030, 20270101]) {
    const d = daily(date);
    const waves = waveArmyOf(d)!.waves;
    assert.ok(waves.some((w) => w.boss), 'the daily has its boss wave');
    for (let w = 1; w <= waves.length; w++) assert.equal(trackOfRun({ ...d, stage: w }), waves[w - 1].boss ? BOSS_TRACK : BATTLE_TRACK, `daily ${date} wave ${w}`);
  }
  // (the Last Stand: the battle track, a boss wave the boss track, whatever the seed)
  for (const seed of [77, -5]) {
    assert.equal(standTrack(seed), BATTLE_TRACK);
    assert.equal(standTrack(seed, true), BOSS_TRACK);
  }
  for (const hall of ['courtyard', 'library', 'chapel', 'hall'] as const) {
    assert.equal(standRoomTrack(3, hall), BATTLE_TRACK, hall);
    assert.equal(standRoomTrack(3, hall, true), BOSS_TRACK, `${hall}, a boss wave`);
  }
  // (only the two tracks are battle music, and both have their files)
  assert.ok(EPIC_MANIFEST.battle.loop && EPIC_MANIFEST.boss.loop && BATTLE_TRACK === 'battle' && BOSS_TRACK === 'boss');
  assert.notEqual(BATTLE_TRACK, BOSS_TRACK);
});

test('a single fight: a boss (the spire\'s, the Calamity\'s) the boss track, every other fight the battle track', () => {
  assert.equal(trackOfRun(towerAt(4, 'boss', true)), BOSS_TRACK);
  assert.equal(trackOfRun(towerAt(4, 'fight', true)), BATTLE_TRACK, 'a Calamity fight');
  assert.equal(trackOfRun(towerAt(4, 'elite', true)), BATTLE_TRACK, 'a Calamity elite');
  assert.equal(trackOfRun(towerAt(30, 'boss')), BOSS_TRACK);
  assert.deepEqual([1, 9, 10, 24, 25].map((f) => trackOfRun(towerAt(f, 'fight'))), Array(5).fill(BATTLE_TRACK));
  assert.equal(trackOfRun(towerAt(3, 'elite')), BATTLE_TRACK);
  assert.equal(trackOfRun(newRun(1)), BATTLE_TRACK, 'a field fight');
});

test('the boss track crossfades in quickly and gives the battle track back gently; other changes at the usual crossfade', () => {
  assert.equal(crossfadeOf(BATTLE_TRACK, BOSS_TRACK), BOSS_IN_S);
  assert.equal(crossfadeOf('deploy', BOSS_TRACK), BOSS_IN_S, 'a boss fought straight from the deploy');
  assert.equal(crossfadeOf(null, BOSS_TRACK), BOSS_IN_S);
  assert.equal(crossfadeOf(BOSS_TRACK, BATTLE_TRACK), BOSS_OUT_S);
  assert.equal(crossfadeOf('deploy', BATTLE_TRACK), CROSSFADE_S);
  assert.equal(crossfadeOf(BOSS_TRACK, BOSS_TRACK), CROSSFADE_S, 'the same track (a level change) as before');
  assert.equal(crossfadeOf('camp', 'tavern'), CROSSFADE_S);
  // (in: quick enough to land with the boss, never a cut; out: longer, so the step down is not a jolt)
  assert.ok(BOSS_IN_S >= 1 && BOSS_IN_S <= 2);
  assert.ok(BOSS_OUT_S > BOSS_IN_S && BOSS_OUT_S <= 4);
});

test('through an army run: battle, the boss track for the boss wave, back to the battle track after it, or the victory', () => {
  const want = (s: MusicState) => musicOf(s, (p) => TRACK_OF_PLACE[p]);
  // (an army with a boss wave before its last, and one whose boss is its last wave)
  const mid = ARMIES.find((a) => a.waves.slice(0, -1).some((w) => w.boss));
  const last = ARMIES.find((a) => a.waves.length > 1 && a.waves[a.waves.length - 1].boss);
  assert.ok(last, 'an army ends on its boss');
  for (const army of [mid, last]) {
    if (!army) continue;
    const run = armyRun(9, army.id);
    let s: MusicState = { place: 'deploy', battle: null, fighting: false, victory: false };
    for (let w = 1; w <= army.waves.length; w++) {
      run.stage = w;
      // (the page: `startFight(trackOfRun(run))` as each wave begins)
      s = { ...s, battle: trackOfRun(run), fighting: true, victory: false };
      assert.equal(want(s).track, army.waves[w - 1].boss ? BOSS_TRACK : BATTLE_TRACK, `${army.id} wave ${w} fought`);
      s = { ...s, fighting: false };
      const end = endOfFight(run, true);
      const after = endAt(s, end);
      s = after.state;
      if (w < army.waves.length) {
        assert.equal(end, 'next');
        assert.equal(after.sting, null);
        // (between waves, the result and the next deploy: the battle track, the boss's wave over)
        assert.deepEqual(want(s), { track: BATTLE_TRACK, level: 1 }, `${army.id} after wave ${w}`);
      } else {
        assert.equal(end, 'victory');
        assert.equal(after.sting, 'victory');
        assert.equal(want(s).track, VICTORY_LOOP);
      }
    }
  }
  // (a fall a heart revives in the boss's wave: the boss track plays on through the fight resumed)
  const bossy: MusicState = { place: 'deploy', battle: BOSS_TRACK, fighting: false, victory: false };
  assert.deepEqual(endAt(bossy, 'none'), { state: bossy, sting: null });
});

test('victory music only when the whole battle is won; the defeat sting only when it is lost for good', () => {
  const army = ARMIES[0];
  const run = armyRun(3, army.id);
  for (let w = 1; w < army.waves.length; w++) assert.equal(endOfFight({ ...run, stage: w }, true), 'next', `wave ${w} won: the battle goes on`);
  assert.equal(endOfFight({ ...run, stage: army.waves.length }, true), 'victory', 'the last wave won');
  assert.equal(endOfFight(run, false), 'none', 'a fall a heart revives');
  assert.equal(endOfFight({ ...run, retries: 99 }, false), 'defeat', 'no heart left');
  const d = daily(20261029);
  assert.equal(endOfFight({ ...d, stage: 3 }, true), 'next');
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
  s = { ...s, battle: 'battle', fighting: true };
  assert.deepEqual(want(s), { track: 'battle', level: 1 });
  // (a wave won: the fight is over, the result screen and the next deploy are on the board, and the battle plays on)
  s = { ...s, fighting: false };
  assert.deepEqual(want(atPlace(s, 'deploy')), { track: 'battle', level: 1 });
  // (the battle won: the triumph bed, lower than a track's full level)
  const won: MusicState = { ...s, battle: null, victory: true };
  assert.deepEqual(want(won), { track: VICTORY_LOOP, level: VICTORY_BED });
  assert.ok(VICTORY_BED < 1 && VICTORY_BED > 0.3);
  // (leaving for the camp or a map ends both a battle left half-way and a victory's music)
  assert.deepEqual(atPlace(s, 'camp'), { place: 'camp', battle: null, fighting: false, victory: false });
  assert.equal(want(atPlace(won, 'tower')).track, 'tower');
  // (a fight still being fought behind the home screen keeps its battle for the way back, but the camp plays the camp's music:
  // changed for the owner's "Music sounds like it runs from the fights into the main screen after"; it used to play the battle)
  const behind = atPlace({ ...s, fighting: true }, 'camp');
  assert.equal(want(behind).track, 'camp');
  assert.equal(behind.battle, 'battle');
  assert.deepEqual(want(atPlace(behind, 'deploy')), { track: 'battle', level: 1 });
});

test('off the board (the camp, any tab, a map) there is never battle or victory music, whatever happened before', () => {
  const want = (s: MusicState) => musicOf(s, (p) => TRACK_OF_PLACE[p]);
  const places = ['camp', 'tower', 'calmap'] as const;
  for (const battle of [null, 'boss', 'battle'] as const)
    for (const fighting of [false, true])
      for (const victory of [false, true])
        for (const place of places) {
          const s: MusicState = { place: 'deploy', battle, fighting, victory };
          // (asked straight, and after the move there)
          assert.equal(want({ ...s, place }).track, TRACK_OF_PLACE[place], `${battle} ${fighting} ${victory} at ${place}`);
          assert.equal(want(atPlace(s, place)).track, TRACK_OF_PLACE[place]);
          assert.equal(want(atPlace(s, place)).level, 1);
          // (and a fight that ends while the player is there, won or lost, rings nothing and leaves the place's music)
          for (const end of ['victory', 'defeat'] as const) {
            const after = endAt(atPlace(s, place), end);
            assert.equal(after.sting, null);
            assert.equal(after.state.victory, false);
            assert.equal(want(after.state).track, TRACK_OF_PLACE[place]);
            // (back on the board after it: the deployment's music, not the old battle's)
            assert.equal(want(atPlace(after.state, 'deploy')).track, 'deploy');
          }
        }
});

test('a fight ending on the board rings its sting: a victory holds the triumph bed, a defeat lets the battle go, a wave carries on', () => {
  const want = (s: MusicState) => musicOf(s, (p) => TRACK_OF_PLACE[p]);
  const s: MusicState = { place: 'deploy', battle: 'battle', fighting: true, victory: false };
  const won = endAt(s, 'victory');
  assert.equal(won.sting, 'victory');
  assert.deepEqual(want(won.state), { track: VICTORY_LOOP, level: VICTORY_BED });
  // (the results left for the camp: the camp's music)
  assert.equal(want(atPlace(won.state, 'camp')).track, 'camp');
  const lost = endAt(s, 'defeat');
  assert.equal(lost.sting, 'defeat');
  assert.equal(want(lost.state).track, 'deploy');
  const on = endAt(s, 'none');
  assert.equal(on.sting, null);
  assert.deepEqual(on.state, s);
  const next = endAt(s, 'next');
  assert.equal(next.sting, null);
  assert.deepEqual(next.state, s, 'a wave won on the battle track: it plays on');
  assert.deepEqual(endAt({ ...s, battle: BOSS_TRACK }, 'next').state, s, 'after the boss\'s wave: the battle track again');
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

test('two track changes in a row leave only the last one playing: the triumph does not carry on under the camp', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer } = await import('../src/render/audioProcessors');
  try {
    const ctx = new FakeContext();
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => epicBaked(ctx), async () => ({ duration: 1 }) as unknown as AudioBuffer);
    music.setTrack('triumph', VICTORY_BED);
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(music.sounding, ['triumph']);
    // (the results left: `endVictory` asks for the deploy's music, and the home screen's camp follows before it has baked)
    music.setTrack('deploy');
    music.setTrack('camp');
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(music.sounding, ['camp']);
    // (and the same with a battle track left for a map and then the camp)
    music.setTrack('boss');
    await new Promise((r) => setTimeout(r, 10));
    music.setTrack('tower');
    music.setTrack('camp');
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(music.sounding, ['camp']);
    music.destroy();
  } finally {
    undo();
  }
});

test('the boss track comes in over its own crossfade, and the battle track it takes over from fades out over the same', async () => {
  const undo = installFakeAudio();
  const { MusicPlayer, FADE_S } = await import('../src/render/audioProcessors');
  try {
    assert.equal(CROSSFADE_S, FADE_S, 'the usual crossfade is the player\'s own');
    const ctx = new FakeContext();
    const music = new MusicPlayer(ctx as unknown as AudioContext, async () => epicBaked(ctx), async () => ({ duration: 1 }) as unknown as AudioBuffer);
    music.setTrack(BATTLE_TRACK, 1, crossfadeOf(null, BATTLE_TRACK));
    await new Promise((r) => setTimeout(r, 10));
    const before = FakeContext.made.length;
    music.setTrack(BOSS_TRACK, 1, crossfadeOf(BATTLE_TRACK, BOSS_TRACK));
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(music.sounding, [BOSS_TRACK]);
    // (the time constant is a third of the crossfade: the fade is about 95 % done when it ends)
    const taus = (from: number) => FakeContext.made.slice(from).flatMap((n) => (n.gain?.calls ?? []).filter((c) => c[0] === 'target').map((c) => c[3] as number));
    assert.ok(taus(before).some((t) => Math.abs(t - BOSS_IN_S / 3) < 1e-9), 'the boss fades in over BOSS_IN_S');
    const outs = FakeContext.made.flatMap((n) => (n.gain?.calls ?? []).filter((c) => c[0] === 'target' && c[1] === 0).map((c) => c[3] as number));
    assert.ok(outs.some((t) => Math.abs(t - BOSS_IN_S / 3) < 1e-9), 'the battle track fades out over the same');
    const mark = FakeContext.made.length;
    music.setTrack(BATTLE_TRACK, 1, crossfadeOf(BOSS_TRACK, BATTLE_TRACK));
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(music.sounding, [BATTLE_TRACK]);
    assert.ok(taus(mark).some((t) => Math.abs(t - BOSS_OUT_S / 3) < 1e-9), 'the battle track comes back over BOSS_OUT_S');
    music.destroy();
  } finally {
    undo();
  }
});
