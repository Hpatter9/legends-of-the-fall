// CC0-SOUNDS: which cues play a recording (CC0 sound effects, `cueSampleManifest.ts`, made by tools/cc0-sounds/) and which keep their
// synthesised voice, and how a take is chosen and pitched. Pure: no Web Audio and no DOM, so the tests read it. `cueBank.ts` loads
// and plays the files; `sound.ts` asks the bank first and falls back to the synth (`SOUNDS` in `audioProcessors.ts`) for a cue with
// no files, or whose files have not decoded (before the first tap's load finishes, or on a browser without Opus).

import { CUE_SAMPLE_FILES, type CueSampleFile } from './cueSampleManifest';
import type { Cue } from './soundRules';

/** Every recorded cue's takes (each file's gain makes it as loud as the synth it stands in for). */
export const CUE_SAMPLES: Partial<Record<Cue, readonly CueSampleFile[]>> = CUE_SAMPLE_FILES;

/** Every file, as `sfx/cues/<file>.opus` names it (the service worker caches each: `build.mjs`). */
export const SAMPLE_FILES: readonly string[] = Object.values(CUE_SAMPLES).flatMap((takes) => (takes ?? []).map((f) => f.file));

/** Where the files are served, next to the king's spells' (`sfx/`). */
export const SAMPLE_DIR = 'sfx/cues/';

/** How much of the mixer's random pitch a recording takes (a playback rate also changes its length, so it takes half the synth's). */
export const SAMPLE_PITCH_SHARE = 0.5;

/** The playback rate for the mixer's `pitch` (1 plays the file as recorded). */
export function sampleRate(pitch: number): number {
  return 1 + (pitch - 1) * SAMPLE_PITCH_SHARE;
}

/** Picks a take for each play: any but the one played last (for a cue of two takes, they alternate), so a run of the same blow never
 *  repeats a recording. `rnd` is the page's own `Math.random` (the battle never hears it), injectable for the tests. */
export class TakePicker {
  private readonly last = new Map<Cue, number>();

  constructor(private readonly rnd: () => number = Math.random) {}

  /** The index of the take to play among `count` (of those decoded). */
  next(cue: Cue, count: number): number {
    if (count <= 1) return 0;
    const prev = this.last.get(cue) ?? -1;
    let i = Math.floor(this.rnd() * (prev < 0 ? count : count - 1));
    if (prev >= 0 && i >= prev) i++;
    this.last.set(cue, i);
    return i;
  }
}
