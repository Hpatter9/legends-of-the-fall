// The mix: how loud each part of the page's sound sits against the others (the owner's ask: "Adjust the audio so the music and
// sound effects are better matches in volume."). Pure: no Web Audio and no DOM, so the tests can check every value, and the
// measuring tool (`tools/audio-mix/`) reads the same numbers the page plays. The levels were set by measuring the page's real
// output (loudness in LUFS, `docs/notes/audio-mix.md`), not by ear:
// - the buses (`MUSIC_LEVEL`, `SFX_LEVEL`, `UI_LEVEL`), each on top of its slider in the settings (100 % is the balanced mix);
// - a trim for every music file (`TRACK_GAIN`): each loop to one playback loudness (its plain loudness and a phone speaker's
//   together, docs/notes/sound-pass.md), each sting to its moment;
// - which bus each cue goes to (`busOf`). Each cue's own level is its `gain` in `soundRules.ts` (`CUES`).

import { EPIC_MANIFEST } from './epicManifest';
import type { StingId } from './epicMusic';
import type { Cue } from './soundRules';
import loudness from '../../tools/epic-music/loudness.json';

/** The music files by their manifest id: the loops and the two stings. */
export type MusicFile = keyof typeof EPIC_MANIFEST;

/** Each file's measured loudness (`tools/epic-music/loudness.json`, kept by `tools/epic-music/level.mjs --check`): integrated
 *  LUFS, and the same as a phone's speaker plays it (`phone`: the bass under 250 Hz gone). */
export const FILE_LOUDNESS = loudness.files as Record<MusicFile, { lufs: number; tp: number; phone: number }>;

/** How loud a file sounds as the game is played (LUFS): half way between its plain loudness (headphones, a good speaker) and its
 *  loudness on a phone's own speaker. Every file is mastered to the one -18 LUFS, but a track whose weight is in the bass (the boss
 *  track, the heralds) came out 2 to 5 LU quieter on a phone than one that is bright (the camp, the opening): docs/notes/sound-pass.md. */
export function playbackLufs(id: MusicFile): number {
  const m = FILE_LOUDNESS[id];
  return (m.lufs + m.phone) / 2;
}

/** The playback loudness every loop is trimmed to (LUFS, in the file), about the files' middle so no trim is large. */
export const PLAYBACK_REF = -19.5;

/** Where the music plays (LUFS at the speakers, both sliders at 100 %): every loop at one playback loudness, in a menu, on a map,
 *  at the deployment and in a scene. A battle's track sits under it by `FIGHT_MUSIC_DB` (`battleMusic.ts`), under the fight's own
 *  sounds (about -23.5). It was -30 everywhere, which left the menus all but silent on a phone and the music buried in a fight. */
export const MUSIC_TARGET = -25;

/** The music bus's level (the tracks and the stings), times the Music slider's gain: a loop at `PLAYBACK_REF` plays at
 *  `MUSIC_TARGET`. */
export const MUSIC_LEVEL = 10 ** ((MUSIC_TARGET - PLAYBACK_REF) / 20);
/** The ambience beds' bus level (they share the Music slider): each bed's own level (`BEDS` in `audioRules.ts`) was measured to
 *  sit low and steady about 14 LU under the place's music (docs/notes/sound-pass.md; they had sat 20 LU and more under it, and
 *  the ones that are all bass were silent on a phone). */
export const AMBIENCE_LEVEL = 1;
/** The effects bus's level (the fight's sounds, the king's spells, the summoning show), times the Effects slider. */
export const SFX_LEVEL = 0.49;
/** The ui bus's level (the page's taps, coins and chimes), times the Effects slider. */
export const UI_LEVEL = 0.35;

/** A loop's trim: what brings its playback loudness to `PLAYBACK_REF` (within about 1.5 dB either way). */
export function loopGain(id: MusicFile): number {
  return 10 ** ((PLAYBACK_REF - playbackLufs(id)) / 20);
}

/** The stings' loudness at the speakers (LUFS, plain): a fanfare is a moment, so the victory fanfare rings at a fight's own
 *  loudness, over the battle's music; the defeat sting a little under it. */
export const STING_LUFS: Record<StingId, number> = { victory: -23.5, defeat: -25.5 };

/** A sting's trim: what puts it at its `STING_LUFS` through the music bus. */
export function stingGain(id: StingId): number {
  return 10 ** ((STING_LUFS[id] - FILE_LOUDNESS[id].lufs) / 20) / MUSIC_LEVEL;
}

/** Each music file's trim (a gain on its own fade, on top of `MUSIC_LEVEL`). A track played from the synth fallback takes none. */
export const TRACK_GAIN = Object.fromEntries(
  Object.keys(EPIC_MANIFEST).map((id) => [id, id === 'victory' || id === 'defeat' ? stingGain(id) : loopGain(id as MusicFile)]),
) as Record<MusicFile, number>;

/** The trim for a track or sting by the id the player asks for (`town` is the camp's file); 1 for one with no file. */
export function trackGain(id: string): number {
  const key = (id === 'town' ? 'camp' : id) as MusicFile;
  return TRACK_GAIN[key] ?? 1;
}

/** The cues that are the page's own taps and chimes: they go to the ui bus. */
export const UI_CUES: ReadonlySet<Cue> = new Set<Cue>([
  'tap', 'summon', 'merge', 'coin', 'star', 'levelUp', 'coinRecycle', 'coinClaim', 'sparkle', 'autoStart', 'autoStop', 'autoDone', 'setChime2', 'setChime3',
  'runeSlide', 'runeMerge', 'runeSet', 'ledger',
]);
/** The summoning show's sounds go to their own bus (inside sfx), so a tap that skips the show can hush them. */
export const SHOW_CUES: ReadonlySet<Cue> = new Set<Cue>(['riseSummon', 'stingSummon', 'slam']);

/** The bus a cue is sent to. */
export const busOf = (name: Cue): 'show' | 'ui' | 'sfx' => (SHOW_CUES.has(name) ? 'show' : UI_CUES.has(name) ? 'ui' : 'sfx');
