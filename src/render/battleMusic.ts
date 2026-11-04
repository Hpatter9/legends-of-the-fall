// The battle music's rules (the owner's asks: "The battle music should stay on and consistent through battle. Then at the end
// we need victory music if we win." and "One good battle music for all the battles, with a more intense one for bosses").
// Every battle plays the one battle track, unbroken through every wave, the breaks between them and any deploy in the middle,
// until the battle is won, lost or left; while a boss is fought the one boss track takes over (a crossfade in, and back to the
// battle track after the boss's wave, or the victory music if that was the last); a won battle ends on a victory fanfare leading
// into the triumph loop, held under the results until they are left. Pure: no Web Audio and no DOM, so the tests can check it;
// `sound.ts` plays what it says. See docs/notes/battle-music.md and docs/notes/battle-music-2.md.
//
// "A battle" is what the player fights through before a results screen sends them somewhere else:
// - an army run or the daily: all its waves (the result screen between waves shows the battle carrying on);
// - a spire (tower) floor and a Calamity spot: the one fight (the map comes between two of them);
// - the Last Stand: the whole run, until the king falls (it never wins, so it never has victory music);
// - a plain stage run (a field fight, from an old save): each stage.

import { fallOutcome, isBossRun, waveArmyOf, type Run } from '../sim/run';
import type { MusicId, Place } from './epicMusic';

/** The one battle track, played in every battle (every army at every tier, the daily, a spire floor, a Calamity spot, the Last
 *  Stand, a quest, a field fight): the main theme in its heroic dress (the owner: "One good battle music for all the battles,
 *  with a more intense one for bosses"; docs/notes/battle-music-2.md). */
export const BATTLE_TRACK: MusicId = 'battle';
/** The one boss track: the same theme, heavier and faster. It takes over while a boss is being fought. */
export const BOSS_TRACK: MusicId = 'boss';

/** How loud the triumph loop sits under the results, against a track's full level (about -4.4 dB): a bed, not a fanfare. */
export const VICTORY_BED = 0.6;

/** The track the victory fanfare leads into, and the fanfare itself (a sting). */
export const VICTORY_LOOP: MusicId = 'triumph';

/** The track of the fight about to be fought: the boss track while a boss is fought (a boss wave of an army, the daily or a
 *  quest; a spire boss floor; a Calamity boss spot; a one-wave boss army; a field fight's boss stage), otherwise the battle
 *  track. Asked at every wave (`run.stage` the wave about to be fought), so the battle track plays on unbroken from wave to wave
 *  and the boss track takes over only for the boss's own wave. */
export function trackOfRun(run: Run): MusicId {
  return isBossRun(run) ? BOSS_TRACK : BATTLE_TRACK;
}

/** The Last Stand's track: the battle track, the boss track for a boss wave (the run's seed is kept for the call, so a resumed
 *  run asks the same way). */
export const standTrack = (_seed: number, boss = false): MusicId => (boss ? BOSS_TRACK : BATTLE_TRACK);

/** How long one track takes to give way to the next (seconds, the crossfade): the boss track comes in quickly, as the boss
 *  arrives; the battle track comes back from it more gently, so the lift down is not a jolt; any other change (a place's music,
 *  the battle starting from the deploy) at the player's usual crossfade. */
export const BOSS_IN_S = 1.5;
export const BOSS_OUT_S = 3;
export const CROSSFADE_S = 1.2;
export function crossfadeOf(from: MusicId | null, to: MusicId): number {
  if (to === BOSS_TRACK && from !== BOSS_TRACK) return BOSS_IN_S;
  if (from === BOSS_TRACK && to === BATTLE_TRACK) return BOSS_OUT_S;
  return CROSSFADE_S;
}

/** What the music does as a fight ends: `victory` when the battle is won (the fanfare, then the triumph loop under the results),
 *  `defeat` when it is lost for good (the defeat sting, as before), `next` when a wave is won with more to come (the battle track
 *  plays on; after a boss wave it comes back from the boss track), `none` when a fall is revived by a heart (whatever was playing
 *  plays on, the boss track through a boss wave fought again). Asked at the fight's `end` event, before the run is settled
 *  (`run.stage` is still the wave just fought). */
export type BattleEnd = 'victory' | 'defeat' | 'next' | 'none';
export function endOfFight(run: Run, won: boolean): BattleEnd {
  if (!won) return fallOutcome(run) === 'heart' ? 'none' : 'defeat';
  if (run.tower) return 'victory';
  const army = waveArmyOf(run);
  return !army || run.stage >= army.waves.length ? 'victory' : 'next';
}

/** Where the music stands: the place the player is in (`placeOf`), the battle's track while a battle is on (null when none),
 *  whether a fight is being fought this moment, and whether a won battle's victory music is up. */
export interface MusicState {
  place: Place;
  battle: MusicId | null;
  fighting: boolean;
  victory: boolean;
}

/** The track to play and its level (1 is a track's full level). Off the board (the camp, any of its tabs, a tower or Calamity
 *  map) it is always the place's own: a fight still running behind the home screen keeps its battle (for the way back to the
 *  board) but is not heard there, and nor is a victory (the owner: "Music sounds like it runs from the fights into the main
 *  screen after"). On the board a victory holds the triumph bed, and a battle keeps its track while a fight runs and between
 *  fights; otherwise the deployment's. (A cinematic's score is above all this, in `sound.ts`.) */
export function musicOf(s: MusicState, placeTrack: (p: Place) => MusicId): { track: MusicId; level: number } {
  if (s.place !== 'deploy') return { track: placeTrack(s.place), level: 1 };
  if (s.victory) return { track: VICTORY_LOOP, level: VICTORY_BED };
  if (s.battle) return { track: s.battle, level: 1 };
  return { track: placeTrack(s.place), level: 1 };
}

/** The player has moved to `place`. Off the board between fights, the battle has been left or is over: its track is let go, and
 *  so is a victory's music (its results were left), so the next battle's first deploy has the deployment's music again. A fight
 *  still running (the home screen opened mid-fight: the fight carries on behind it) keeps its battle, to play again once the
 *  player is back on the board; `musicOf` keeps it silent until then. */
export function atPlace(s: MusicState, place: Place): MusicState {
  if (place === 'deploy') return { ...s, place };
  if (s.fighting) return { ...s, place, victory: false };
  return { ...s, place, battle: null, victory: false };
}

/** A fight has ended and `end` says what the music does (`endOfFight`): the new state, and the sting to ring. Off the board (the
 *  fight ended behind the home screen) no sting rings and no victory music is held: the battle is simply over. */
export function endAt(s: MusicState, end: BattleEnd): { state: MusicState; sting: 'victory' | 'defeat' | null } {
  if (end === 'none') return { state: s, sting: null };
  // (a wave won with more to come: the battle plays on, on the battle track, the boss track's wave over)
  if (end === 'next') return { state: s.battle ? { ...s, battle: BATTLE_TRACK } : s, sting: null };
  const onBoard = s.place === 'deploy';
  return { state: { ...s, battle: null, fighting: false, victory: onBoard && end === 'victory' }, sting: onBoard ? end : null };
}
