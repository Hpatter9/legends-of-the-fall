// The epic music: gothic, symphonic loops rendered offline (tools/epic-music/, see docs/notes/epic-music.md) and played back
// as buffers. This file holds what the page needs to know about them and no Web Audio but the decoding: which file each
// track is, how the page's moods pick a track, and the loader. The old synthesised tracks (`musicScore.ts`) stay as the
// fallback for a browser that cannot decode the files, and as the tests' stand-in.

import { EPIC_MANIFEST } from './epicManifest';
import { EPIC_INFO, type Baked } from './musicBake';
import type { Track } from './musicScore';
import type { Scene } from './audioRules';

/** Tracks that exist only as files (the synth has no score for them). */
export type EpicOnly = 'camp' | 'deploy' | 'battle2' | 'battle3' | 'tower' | 'calmap' | 'calbattle' | 'tavern';
/** Every track the player can be asked for. `town` is the old name of the camp's theme. */
export type MusicId = Track | EpicOnly;
export type StingId = 'victory' | 'defeat';
export const STING_IDS: readonly StingId[] = ['victory', 'defeat'];

/** The old synth track each id falls back to when its file cannot be played. */
export const SYNTH_OF: Record<MusicId, Track> = {
  town: 'town', battle: 'battle', boss: 'boss', opening: 'opening', gorvak: 'gorvak', herald2: 'herald2', herald3: 'herald3', herald4: 'herald4', herald5: 'herald5', herald6: 'herald6',
  triumph: 'triumph', comic: 'comic', solemn: 'solemn', spire: 'spire',
  camp: 'town', deploy: 'town', battle2: 'battle', battle3: 'battle', tower: 'town', calmap: 'boss', calbattle: 'boss', tavern: 'town',
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
/** The battle track's loop skips its quiet four-bar intro and opens on the combat downbeat. Its 66.98 s loop holds 48 bars of
 *  1.3954 s, so the start sits exactly four bars after `LOOP_START`: the loop stays a whole number of bars and joins on the beat. */
export const BATTLE_BAR = 66.9772 / 48;
export const BATTLE_LOOP_START = LOOP_START + 4 * BATTLE_BAR;

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
  const loopStart = id === 'battle' ? BATTLE_LOOP_START : LOOP_START;
  EPIC_INFO.set(baked, { loop: [loopStart, LOOP_START + e.seconds] });
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

/** What a fight is, for its music. `level` is how hard it runs (0 to 2). */
export interface FightMood {
  boss: boolean;
  calamity: boolean;
  level: number;
}

/** The track for a fight: a boss has its own; a Calamity fight has its own; otherwise one of three by how hard the fight is. */
export function fightTrack(f: FightMood): MusicId {
  if (f.boss) return 'boss';
  if (f.calamity) return 'calbattle';
  return (['battle', 'battle2', 'battle3'] as const)[Math.max(0, Math.min(2, Math.floor(f.level)))];
}

/** How hard a fight runs, 0 to 2, for choosing among the three battle tracks: an army or a daily by thirds of its waves; any other
 *  run by how deep it is (stage or floor 1-9, 10-24, 25 up); an elite fight a step harder. */
export function fightLevel(stage: number, o: { elite?: boolean; waves?: number } = {}): number {
  let level: number;
  if (o.waves && o.waves > 1) level = Math.min(2, Math.floor(((stage - 1) / o.waves) * 3));
  else level = stage >= 25 ? 2 : stage >= 10 ? 1 : 0;
  return Math.min(2, level + (o.elite ? 1 : 0));
}
