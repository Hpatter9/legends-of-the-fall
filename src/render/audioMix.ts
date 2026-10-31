// The mix: how loud each part of the page's sound sits against the others (the owner's ask: "Adjust the audio so the music and
// sound effects are better matches in volume."). Pure: no Web Audio and no DOM, so the tests can check every value, and the
// measuring tool (`tools/audio-mix/`) reads the same numbers the page plays. The levels were set by measuring the page's real
// output (loudness in LUFS, `docs/notes/audio-mix.md`), not by ear:
// - the buses (`MUSIC_LEVEL`, `SFX_LEVEL`, `UI_LEVEL`), each on top of its slider in the settings (100 % is the balanced mix);
// - a trim for every music file (`TRACK_GAIN`): 1 for every loop (the files are mastered to one loudness), more for the two stings;
// - which bus each cue goes to (`busOf`). Each cue's own level is its `gain` in `soundRules.ts` (`CUES`).

import { EPIC_MANIFEST } from './epicManifest';
import type { StingId } from './epicMusic';
import type { Cue } from './soundRules';

/** The music bus's level (the tracks and the stings), times the Music slider. Every music file is mastered to the one loudness
 *  (-18 LUFS integrated, true peaks under -1 dBTP: `tools/epic-music/loudness.json`, docs/notes/battle-music-2.md), so at this
 *  level every loop, in a battle, a menu, a map or a scene, plays at about -30 LUFS: 6.5 LU under a fight's own sounds (about
 *  -23.5), the same everywhere, so no track jumps out and a fight's start does not step the music up or down. */
export const MUSIC_LEVEL = 0.251;
/** The ambience beds' level (they share the Music slider; kept where they were, 20 LU and more under the music). */
export const AMBIENCE_LEVEL = 0.22;
/** The effects bus's level (the fight's sounds, the king's spells, the summoning show), times the Effects slider. */
export const SFX_LEVEL = 0.49;
/** The ui bus's level (the page's taps, coins and chimes), times the Effects slider. */
export const UI_LEVEL = 0.35;

/** The music files by their manifest id: the loops and the two stings. */
export type MusicFile = keyof typeof EPIC_MANIFEST;

/** A loop's trim: the files are all at the one loudness, so every loop plays at the bus's level. */
export const LOOP_GAIN = 1;
/** The stings' trims: a fanfare is a moment, so it rings over the music's level (the victory fanfare at about -23.5 LUFS, a fight's
 *  own loudness; the defeat sting a little under it, -25.5). */
export const STING_GAIN: Record<StingId, number> = { victory: 2.1, defeat: 1.7 };

/** Each music file's trim (a gain on its own fade, on top of `MUSIC_LEVEL`). A track played from the synth fallback takes none. */
export const TRACK_GAIN = Object.fromEntries(
  Object.keys(EPIC_MANIFEST).map((id) => [id, (STING_GAIN as Record<string, number>)[id] ?? LOOP_GAIN]),
) as Record<MusicFile, number>;

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
