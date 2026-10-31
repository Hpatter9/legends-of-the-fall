// The epic music's files and loop lengths. Written by tools/epic-music/manifest.mjs: do not edit by hand.
// `seconds` is the loop's length (or, for a sting, its whole length); each file also holds a second more of the loop's start, so
// the page can loop a window of it however a decoder trims the ends. About 4.90 MB in all.

export interface EpicEntry {
  file: string;
  loop: boolean;
  seconds: number;
  /** Seconds into the loop where it repeats from: a track with an intro plays it once (from `LOOP_START`), then loops
   *  [LOOP_START + start, LOOP_START + seconds]. 0 for a track with no intro. */
  start: number;
  bytes: number;
}

export const EPIC_MANIFEST = {
  battle: { file: 'battle.opus', loop: true, seconds: 66, start: 6, bytes: 276737 },
  boss: { file: 'boss.opus', loop: true, seconds: 60, start: 5.4545, bytes: 251692 },
  calmap: { file: 'calmap.opus', loop: true, seconds: 72, start: 0, bytes: 348780 },
  camp: { file: 'camp.opus', loop: true, seconds: 91.4286, start: 0, bytes: 438148 },
  comic: { file: 'comic.opus', loop: true, seconds: 51.26, start: 0, bytes: 250812 },
  defeat: { file: 'defeat.opus', loop: false, seconds: 13.1022, start: 0, bytes: 62521 },
  deploy: { file: 'deploy.opus', loop: true, seconds: 72.1502, start: 0, bytes: 349575 },
  gorvak: { file: 'gorvak.opus', loop: true, seconds: 45.1766, start: 0, bytes: 221153 },
  herald2: { file: 'herald2.opus', loop: true, seconds: 46.602, start: 0, bytes: 228175 },
  herald3: { file: 'herald3.opus', loop: true, seconds: 42.6736, start: 0, bytes: 140516 },
  herald4: { file: 'herald4.opus', loop: true, seconds: 58, start: 0, bytes: 282172 },
  herald5: { file: 'herald5.opus', loop: true, seconds: 54, start: 0, bytes: 259080 },
  herald6: { file: 'herald6.opus', loop: true, seconds: 50, start: 0, bytes: 244360 },
  opening: { file: 'opening.opus', loop: true, seconds: 64, start: 0, bytes: 311444 },
  solemn: { file: 'solemn.opus', loop: true, seconds: 55.6703, start: 0, bytes: 272126 },
  spire: { file: 'spire.opus', loop: true, seconds: 60, start: 0, bytes: 292956 },
  tavern: { file: 'tavern.opus', loop: true, seconds: 49.9514, start: 0, bytes: 244525 },
  tower: { file: 'tower.opus', loop: true, seconds: 86.4137, start: 0, bytes: 417779 },
  triumph: { file: 'triumph.opus', loop: true, seconds: 46.1538, start: 0, bytes: 183290 },
  victory: { file: 'victory.opus', loop: false, seconds: 13.8889, start: 0, bytes: 66207 },
} satisfies Record<string, EpicEntry>;
