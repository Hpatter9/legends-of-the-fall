// The epic music: gothic, symphonic loops rendered offline (tools/epic-music/, see docs/notes/epic-music.md) and played back
// as buffers. This file holds what the page needs to know about them and no Web Audio but the decoding: which file each
// track is, how the page's moods pick a track, and the loader. The old synthesised tracks (`musicScore.ts`) stay as the
// fallback for a browser that cannot decode the files, and as the tests' stand-in.

import { EPIC_MANIFEST, type EpicEntry } from './epicManifest';
import { EPIC_INFO, type Baked } from './musicBake';
import type { Track } from './musicScore';
import type { Scene } from './audioRules';

/** Tracks that exist only as files (the synth has no score for them). Every battle plays `battle`, and a boss `boss`
 *  (`battleMusic.ts`; the armies' own tracks and the Calamity's are gone: docs/notes/battle-music-2.md). */
export type EpicOnly = 'camp' | 'deploy' | 'tower' | 'calmap' | 'tavern';
/** Every track the player can be asked for. `town` is the old name of the camp's theme. */
export type MusicId = Track | EpicOnly;
export type StingId = 'victory' | 'defeat';
export const STING_IDS: readonly StingId[] = ['victory', 'defeat'];

/** The old synth track each id falls back to when its file cannot be played. */
export const SYNTH_OF: Record<MusicId, Track> = {
  town: 'town', battle: 'battle', boss: 'boss', opening: 'opening', gorvak: 'gorvak', herald2: 'herald2', herald3: 'herald3', herald4: 'herald4', herald5: 'herald5', herald6: 'herald6',
  triumph: 'triumph', comic: 'comic', solemn: 'solemn', spire: 'spire',
  camp: 'town', deploy: 'town', tower: 'town', calmap: 'boss', tavern: 'town',
};

type FileId = keyof typeof EPIC_MANIFEST;
/** The manifest entry for a track (`town` is the camp's file), or null for one with no file. */
export function epicOf(id: MusicId): (typeof EPIC_MANIFEST)[FileId] | null {
  const key = (id === 'town' ? 'camp' : id) as FileId;
  return EPIC_MANIFEST[key] ?? null;
}

/** The folder the files are served from, next to the page (the service worker caches each of them). */
export const AUDIO_DIR = 'audio/';
/** Files are decoded at this rate (they were rendered at 32 kHz): about two thirds the memory of the page's own rate. */
export const DECODE_RATE = 32000;
/** A loop plays the window [LOOP_START, LOOP_START + length] of its file, which holds a second more than the loop: the music is
 *  periodic, so any window one loop long joins itself cleanly, however a decoder trims the file's ends. */
export const LOOP_START = 0.1;

/** Where a track plays from and the window that loops. A battle track built on the main theme has a four-bar intro (its manifest
 *  `start`): it plays from `LOOP_START`, intro and all, then loops from the intro's end to the song's end. The song's last four
 *  bars are the intro's music again (with its last moments crossfaded into the intro's own), so the join hears what the intro's
 *  end would have led into. A track with no intro loops the whole of itself. */
export function loopWindow(e: EpicEntry): { from: number; loop: [number, number] } {
  return { from: LOOP_START, loop: [LOOP_START + e.start, LOOP_START + e.seconds] };
}

let decoder: OfflineAudioContext | null = null;
async function decode(file: string): Promise<AudioBuffer> {
  const res = await fetch(AUDIO_DIR + file);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  const data = await res.arrayBuffer();
  decoder ??= new OfflineAudioContext(2, 1, DECODE_RATE);
  return decoder.decodeAudioData(data);
}

/** A track's file, decoded, as one stem (`pad`) with the loop window; it rejects if the file is missing, cut short or not decodable. */
export async function loadEpic(id: MusicId): Promise<Baked> {
  const e = epicOf(id);
  if (!e) throw new Error(`no file for ${id}`);
  const buf = await decode(e.file);
  if (buf.duration < e.seconds + LOOP_START + 0.2) throw new Error(`${e.file} is short`);
  const baked: Baked = { pad: buf, bass: null, lead: null, drums: null };
  EPIC_INFO.set(baked, loopWindow(e));
  return baked;
}

/** A sting's file, decoded. */
export function loadSting(id: StingId): Promise<AudioBuffer> {
  return decode(EPIC_MANIFEST[id].file);
}

/* ------------------------------------------------------------------ which track for which mood */

/** Where the player is, as the music hears it. */
export type Place = 'camp' | 'tavern' | 'deploy' | 'tower' | 'calmap';
/** Which map is open over the game, if one is. */
export type MapKind = 'tower' | 'calamity' | null;

/** The place for a scene of the ambience and the open map: the home screen is the camp across all its tabs; an
 *  open map is the tower's or the Calamity's; any other time on the game's board is the deployment. */
export function placeOf(scene: Scene | null, map: MapKind): Place {
  if (scene === null || scene === 'camp' || scene === 'tavern' || scene === 'hall' || scene === 'castle' || scene === 'spells' || scene === 'armies') return 'camp';
  if (map) return map === 'calamity' ? 'calmap' : 'tower';
  return 'deploy';
}

/** The track a place plays. */
export const TRACK_OF_PLACE: Record<Place, MusicId> = { camp: 'camp', tavern: 'tavern', deploy: 'deploy', tower: 'tower', calmap: 'calmap' };

/* The battle's track (one for the whole battle, wave to wave) and the victory music are chosen in `battleMusic.ts`. */
