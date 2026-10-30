// The epic music's files and loop lengths. Written by tools/epic-music/manifest.mjs: do not edit by hand.
// `seconds` is the loop's length (or, for a sting, its whole length); each file also holds a second more of the loop's start, so
// the page can loop a window of it however a decoder trims the ends. About 7.66 MB in all.

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
  battle: { file: 'battle.opus', loop: true, seconds: 67.6923, start: 6.1538, bytes: 283593 },
  beasts: { file: 'beasts.opus', loop: true, seconds: 66, start: 6, bytes: 276757 },
  boss: { file: 'boss.opus', loop: true, seconds: 63.6145, start: 5.7831, bytes: 267113 },
  calbattle: { file: 'calbattle.opus', loop: true, seconds: 60, start: 5.4545, bytes: 252280 },
  calmap: { file: 'calmap.opus', loop: true, seconds: 72, start: 0, bytes: 349632 },
  camp: { file: 'camp.opus', loop: true, seconds: 91.4286, start: 0, bytes: 437966 },
  comic: { file: 'comic.opus', loop: true, seconds: 51.26, start: 0, bytes: 251530 },
  defeat: { file: 'defeat.opus', loop: false, seconds: 13.1022, start: 0, bytes: 62996 },
  deploy: { file: 'deploy.opus', loop: true, seconds: 72.1502, start: 0, bytes: 350228 },
  golems: { file: 'golems.opus', loop: true, seconds: 70.4, start: 6.4, bytes: 295023 },
  gorvak: { file: 'gorvak.opus', loop: true, seconds: 45.1766, start: 0, bytes: 221728 },
  herald2: { file: 'herald2.opus', loop: true, seconds: 46.602, start: 0, bytes: 228850 },
  herald3: { file: 'herald3.opus', loop: true, seconds: 42.6736, start: 0, bytes: 171368 },
  herald4: { file: 'herald4.opus', loop: true, seconds: 58, start: 0, bytes: 282266 },
  herald5: { file: 'herald5.opus', loop: true, seconds: 54, start: 0, bytes: 258167 },
  herald6: { file: 'herald6.opus', loop: true, seconds: 50, start: 0, bytes: 244669 },
  infernal: { file: 'infernal.opus', loop: true, seconds: 61.3953, start: 5.5814, bytes: 258023 },
  labyrinth: { file: 'labyrinth.opus', loop: true, seconds: 69.4737, start: 6.3158, bytes: 291381 },
  ogres: { file: 'ogres.opus', loop: true, seconds: 76.5217, start: 6.9565, bytes: 320347 },
  opening: { file: 'opening.opus', loop: true, seconds: 64, start: 0, bytes: 312108 },
  orcs: { file: 'orcs.opus', loop: true, seconds: 72.3288, start: 6.5753, bytes: 302890 },
  solemn: { file: 'solemn.opus', loop: true, seconds: 55.6703, start: 0, bytes: 272688 },
  spire: { file: 'spire.opus', loop: true, seconds: 60, start: 0, bytes: 292491 },
  tavern: { file: 'tavern.opus', loop: true, seconds: 49.9514, start: 0, bytes: 245283 },
  tower: { file: 'tower.opus', loop: true, seconds: 86.4137, start: 0, bytes: 418575 },
  triumph: { file: 'triumph.opus', loop: true, seconds: 46.1538, start: 0, bytes: 183224 },
  undead: { file: 'undead.opus', loop: true, seconds: 70.4, start: 6.4, bytes: 295048 },
  victory: { file: 'victory.opus', loop: false, seconds: 13.8889, start: 0, bytes: 66345 },
  wildwood: { file: 'wildwood.opus', loop: true, seconds: 62.8571, start: 5.7143, bytes: 264026 },
  yokai: { file: 'yokai.opus', loop: true, seconds: 66.8354, start: 6.0759, bytes: 280410 },
} satisfies Record<string, EpicEntry>;
