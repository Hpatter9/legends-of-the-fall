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
  battle: { file: 'battle.opus', loop: true, seconds: 72, bytes: 346228 },
  battle2: { file: 'battle2.opus', loop: true, seconds: 68.5714, bytes: 329947 },
  battle3: { file: 'battle3.opus', loop: true, seconds: 65.4545, bytes: 315151 },
  boss: { file: 'boss.opus', loop: true, seconds: 89.6, bytes: 429202 },
  calbattle: { file: 'calbattle.opus', loop: true, seconds: 62.6087, bytes: 301389 },
  calmap: { file: 'calmap.opus', loop: true, seconds: 86.4, bytes: 414489 },
  camp: { file: 'camp.opus', loop: true, seconds: 91.4286, bytes: 438156 },
  comic: { file: 'comic.opus', loop: true, seconds: 46.4516, bytes: 184344 },
  defeat: { file: 'defeat.opus', loop: false, seconds: 15.4348, bytes: 73822 },
  deploy: { file: 'deploy.opus', loop: true, seconds: 71.1111, bytes: 341751 },
  gorvak: { file: 'gorvak.opus', loop: true, seconds: 54.5455, bytes: 214705 },
  herald2: { file: 'herald2.opus', loop: true, seconds: 63.1579, bytes: 249197 },
  herald3: { file: 'herald3.opus', loop: true, seconds: 45.7143, bytes: 181313 },
  herald4: { file: 'herald4.opus', loop: true, seconds: 58.1818, bytes: 229549 },
  herald5: { file: 'herald5.opus', loop: true, seconds: 53.3333, bytes: 210954 },
  herald6: { file: 'herald6.opus', loop: true, seconds: 49.6552, bytes: 196724 },
  opening: { file: 'opening.opus', loop: true, seconds: 61.9355, bytes: 244362 },
  solemn: { file: 'solemn.opus', loop: true, seconds: 51.4286, bytes: 203568 },
  spire: { file: 'spire.opus', loop: true, seconds: 58.7755, bytes: 231988 },
  tavern: { file: 'tavern.opus', loop: true, seconds: 65.4545, bytes: 315162 },
  tower: { file: 'tower.opus', loop: true, seconds: 93.913, bytes: 449565 },
  triumph: { file: 'triumph.opus', loop: true, seconds: 46.1538, bytes: 183242 },
  victory: { file: 'victory.opus', loop: false, seconds: 13.8889, bytes: 66265 },
} satisfies Record<string, EpicEntry>;
