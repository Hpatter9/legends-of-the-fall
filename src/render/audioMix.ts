// The mix: how loud each part of the page's sound sits against the others (the owner's ask: "Adjust the audio so the music and
// sound effects are better matches in volume."). Pure: no Web Audio and no DOM, so the tests can check every value, and the
// measuring tool (`tools/audio-mix/`) reads the same numbers the page plays. The levels were set by measuring the page's real
// output (loudness in LUFS, `docs/notes/audio-mix.md`), not by ear:
// - the buses (`MUSIC_LEVEL`, `SFX_LEVEL`, `UI_LEVEL`), each on top of its slider in the settings (100 % is the balanced mix);
// - a trim for every music file (`TRACK_GAIN`), so the tracks and the two stings play at matched loudness;
// - which bus each cue goes to (`busOf`). Each cue's own level is its `gain` in `soundRules.ts` (`CUES`).

import type { EPIC_MANIFEST } from './epicManifest';
import type { Cue } from './soundRules';

/** The music bus's level (the tracks, the stings and the drones), times the Music slider. The ambience beds share it. */
export const MUSIC_LEVEL = 0.22;
/** The effects bus's level (the fight's sounds, the king's spells, the summoning show), times the Effects slider. */
export const SFX_LEVEL = 0.49;
/** The ui bus's level (the page's taps, coins and chimes), times the Effects slider. */
export const UI_LEVEL = 0.35;

/** The music files by their manifest id: the loops and the two stings. */
export type MusicFile = keyof typeof EPIC_MANIFEST;

/** Each music file's trim (a gain on its own fade, on top of `MUSIC_LEVEL`): the files were mastered one by one and differ by
 *  about ten LU, so each is brought to its place's target loudness. A track played from the synth fallback takes no trim. */
export const TRACK_GAIN: Record<MusicFile, number> = {
  battle: 0.58, boss: 0.6, calbattle: 0.54, calmap: 1.17, camp: 1.19, comic: 0.84, defeat: 1.57, deploy: 1.07, gorvak: 0.9,
  herald2: 0.84, herald3: 0.86, herald4: 0.69, herald5: 1.34, herald6: 0.94, opening: 1.83, solemn: 0.99, spire: 1.32, tavern: 1.14, tower: 1.02, triumph: 0.9,
  victory: 1.57,
  // (the armies' own battle tracks: the main theme in each army's dress, docs/notes/music-theme.md)
  orcs: 0.58, undead: 0.54, beasts: 0.58, wildwood: 0.55, labyrinth: 0.52, ogres: 0.58, infernal: 0.51, yokai: 0.58, golems: 0.58,
};

/** The trim for a track or sting by the id the player asks for (`town` is the camp's file); 1 for one with no file. */
export function trackGain(id: string): number {
  const key = (id === 'town' ? 'camp' : id) as MusicFile;
  return TRACK_GAIN[key] ?? 1;
}

/** The cues that are the page's own taps and chimes: they go to the ui bus. */
export const UI_CUES: ReadonlySet<Cue> = new Set<Cue>([
  'tap', 'summon', 'merge', 'coin', 'star', 'levelUp', 'coinRecycle', 'coinClaim', 'sparkle', 'autoStart', 'autoStop', 'autoDone', 'setChime2', 'setChime3',
]);
/** The summoning show's sounds go to their own bus (inside sfx), so a tap that skips the show can hush them. */
export const SHOW_CUES: ReadonlySet<Cue> = new Set<Cue>(['riseSummon', 'stingSummon', 'slam']);

/** The bus a cue is sent to. */
export const busOf = (name: Cue): 'show' | 'ui' | 'sfx' => (SHOW_CUES.has(name) ? 'show' : UI_CUES.has(name) ? 'ui' : 'sfx');
