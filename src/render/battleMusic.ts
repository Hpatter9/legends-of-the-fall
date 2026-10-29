// The battle music's rules (the owner's ask: "The battle music should stay on and consistent through battle. Then at the end
// we need victory music if we win."). One track is chosen when a battle begins and kept, unbroken, through every wave, the
// breaks between them and any deploy in the middle, until the battle is won, lost or left; a won battle ends on a victory
// fanfare leading into the triumph loop, held under the results until they are left. Pure: no Web Audio and no DOM, so the
// tests can check it; `sound.ts` plays what it says. See docs/notes/battle-music.md.
//
// "A battle" is what the player fights through before a results screen sends them somewhere else:
// - an army run or the daily: all its waves (the result screen between waves shows the battle carrying on);
// - a spire (tower) floor and a Calamity spot: the one fight (the map comes between two of them);
// - the Last Stand: the whole run, until the king falls (it never wins, so it never has victory music);
// - a plain stage run (a field fight, from an old save): each stage.

import { fallOutcome, isBossRun, waveArmyOf, type Run } from '../sim/run';
import { ARMY_TRACKS, type ArmyTrack, type MusicId, type Place } from './epicMusic';

/** The general battle track: the main theme in its plainest dress, for the battles that are no army's own (the daily, the
 *  Last Stand, a spire floor, a field fight). */
export const GENERAL_TRACK: MusicId = 'battle';

/** How loud the triumph loop sits under the results, against a track's full level (about -4.4 dB): a bed, not a fanfare. */
export const VICTORY_BED = 0.6;

/** The track the victory fanfare leads into, and the fanfare itself (a sting). */
export const VICTORY_LOOP: MusicId = 'triumph';

/** An army's own battle track (the main theme in its dress: docs/notes/music-theme.md), or the general one for an army with none. */
export function armyTrack(id: string): MusicId {
  return (ARMY_TRACKS as readonly string[]).includes(id) ? (id as ArmyTrack) : GENERAL_TRACK;
}

/** The one track a battle plays from its first wave to its end. It reads only what holds for the whole battle (the mode, the
 *  army, whether a single fight is a boss), so asking again at a later wave gives the same track, and a boss wave inside an
 *  army or a daily does not change it:
 *  - the Calamity: a boss spot `boss`, any other `calbattle`;
 *  - an army run: `boss` for an army that is one boss wave and nothing else, otherwise the army's own track, at every tier;
 *  - the daily: the general track (whichever army's foes the day brings);
 *  - a spire floor or a field fight (one fight each): a boss `boss`, else the general track. */
export function trackOfRun(run: Run): MusicId {
  const mode = run.mode?.kind;
  if (mode === 'calamity') return isBossRun(run) ? 'boss' : 'calbattle';
  const army = waveArmyOf(run);
  if (army) {
    if (army.waves.length === 1 && army.waves[0].boss) return 'boss';
    return run.mode?.kind === 'army' ? armyTrack(run.mode.army) : GENERAL_TRACK;
  }
  return isBossRun(run) ? 'boss' : GENERAL_TRACK;
}

/** The Last Stand's track: the general one (the run's seed is kept for the call, so a resumed run asks the same way). */
export const standTrack = (_seed: number): MusicId => GENERAL_TRACK;

/** What the music does as a fight ends: `victory` when the battle is won (the fanfare, then the triumph loop under the results),
 *  `defeat` when it is lost for good (the defeat sting, as before), `none` when it carries on (a wave won with more to come, or a
 *  fall a heart revives: the battle track plays straight through). Asked at the fight's `end` event, before the run is settled
 *  (`run.stage` is still the wave just fought). */
export type BattleEnd = 'victory' | 'defeat' | 'none';
export function endOfFight(run: Run, won: boolean): BattleEnd {
  if (!won) return fallOutcome(run) === 'heart' ? 'none' : 'defeat';
  if (run.tower) return 'victory';
  const army = waveArmyOf(run);
  return !army || run.stage >= army.waves.length ? 'victory' : 'none';
}

/** Where the music stands: the place the player is in (`placeOf`), the battle's track while a battle is on (null when none),
 *  whether a fight is being fought this moment, and whether a won battle's victory music is up. */
export interface MusicState {
  place: Place;
  battle: MusicId | null;
  fighting: boolean;
  victory: boolean;
}

/** The track to play and its level (1 is a track's full level). A victory holds the triumph bed; a battle keeps its track while a
 *  fight runs and on the board between fights; otherwise the place's own. (A cinematic's score is above all this, in `sound.ts`.) */
export function musicOf(s: MusicState, placeTrack: (p: Place) => MusicId): { track: MusicId; level: number } {
  if (s.victory) return { track: VICTORY_LOOP, level: VICTORY_BED };
  if (s.battle && (s.fighting || s.place === 'deploy')) return { track: s.battle, level: 1 };
  return { track: placeTrack(s.place), level: 1 };
}

/** The player has moved to `place`. Off the board (home, or a tower or Calamity map) between fights, the battle has been left or
 *  is over: its track is let go, and so is a victory's music (its results were left), so the next battle's first deploy has the
 *  deployment's music again. */
export function atPlace(s: MusicState, place: Place): MusicState {
  if (place === 'deploy' || s.fighting) return { ...s, place };
  return { ...s, place, battle: null, victory: false };
}
