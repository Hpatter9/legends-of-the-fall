// The epic music's files and loop lengths. Written by tools/epic-music/manifest.mjs: do not edit by hand.
// `seconds` is the loop's length (or, for a sting, its whole length); each file also holds a second more of the loop's start, so
// the page can loop a window of it however a decoder trims the ends. About 5.87 MB in all.

export interface EpicEntry {
  file: string;
  loop: boolean;
  seconds: number;
  bytes: number;
}

export const EPIC_MANIFEST = {
  battle: { file: 'battle.opus', loop: true, seconds: 66.9772, bytes: 324518 },
  battle2: { file: 'battle2.opus', loop: true, seconds: 50.9735, bytes: 249851 },
  battle3: { file: 'battle3.opus', loop: true, seconds: 50.999, bytes: 249878 },
  boss: { file: 'boss.opus', loop: true, seconds: 117.647, bytes: 490602 },
  calbattle: { file: 'calbattle.opus', loop: true, seconds: 42.4787, bytes: 209543 },
  calmap: { file: 'calmap.opus', loop: true, seconds: 72.0, bytes: 349632 },
  camp: { file: 'camp.opus', loop: true, seconds: 99.5, bytes: 479623 },
  comic: { file: 'comic.opus', loop: true, seconds: 51.26, bytes: 251530 },
  defeat: { file: 'defeat.opus', loop: false, seconds: 13.1022, bytes: 62996 },
  deploy: { file: 'deploy.opus', loop: true, seconds: 72.1502, bytes: 350228 },
  gorvak: { file: 'gorvak.opus', loop: true, seconds: 45.1766, bytes: 221728 },
  herald2: { file: 'herald2.opus', loop: true, seconds: 46.602, bytes: 228850 },
  herald3: { file: 'herald3.opus', loop: true, seconds: 42.6736, bytes: 171368 },
  herald4: { file: 'herald4.opus', loop: true, seconds: 58.0, bytes: 282266 },
  herald5: { file: 'herald5.opus', loop: true, seconds: 54.0, bytes: 258167 },
  herald6: { file: 'herald6.opus', loop: true, seconds: 50.0, bytes: 244669 },
  opening: { file: 'opening.opus', loop: true, seconds: 64.0, bytes: 312108 },
  solemn: { file: 'solemn.opus', loop: true, seconds: 55.6703, bytes: 272688 },
  spire: { file: 'spire.opus', loop: true, seconds: 60.0, bytes: 292491 },
  tavern: { file: 'tavern.opus', loop: true, seconds: 49.9514, bytes: 245283 },
  tower: { file: 'tower.opus', loop: true, seconds: 86.4137, bytes: 418575 },
  triumph: { file: 'triumph.opus', loop: true, seconds: 64.875, bytes: 316015 },
  victory: { file: 'victory.opus', loop: false, seconds: 11.8418, bytes: 57037 },
} satisfies Record<string, EpicEntry>;
