// The painted equipment icons (docs/notes/gear-icons.md). tools/gear/import-gear-icons.py cleans the paintings in
// art-source/gear/ and packs them into atlases, src/art/gear/gear-<cell>.webp (each base's standard painting, used for Common to
// Legendary, and its Mythic painting) and grade-<cell>.webp (the five grade frames and four grade glows), with `index.json`
// saying where each cell is. The atlases load by URL (`gear/...`; build.mjs copies them and lists them for offline play).
//
// An icon is three layers in one box: the grade's glow behind (none for Common), the painting, the grade's frame on top. Each
// layer is a CSS background on the atlas, placed by percentages, so one icon works at any size. An id the atlas does not hold
// keeps its old 16px pixel icon (`equipView.ts`).

import index from './art/gear/index.json';
import { warmIcon } from './menuArt';

const GRADES = ['', 'common', 'rare', 'epic', 'legendary', 'mythic'] as const;

/** The larger atlas when the icon is shown big or on a dense screen; the smaller one only where it is sharp enough. */
function atlasCell(px: number): number {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const [big, small] = index.cells;
  return px * dpr <= small * 1.1 ? small : big;
}

const items = index.items as Record<string, number>;
const grade = index.grade as Record<string, number>;

/** Whether the painted atlas holds an icon for this base. */
export const hasPaintedIcon = (base: string): boolean => base in items;

// (the atlases are decoded as the page loads, so the first hero sheet shows its icons at once)
for (const c of index.cells) {
  warmIcon(`gear/gear-${c}.webp`);
  warmIcon(`gear/grade-${c}.webp`);
}

/** A cell of an atlas `cols` x `rows` as a background on any box. */
function cellBg(e: HTMLElement, url: string, n: number, cols: number, rows: number): void {
  const c = n % cols;
  const r = Math.floor(n / cols);
  e.style.backgroundImage = `url(${url})`;
  e.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
  e.style.backgroundPosition = `${cols > 1 ? (c / (cols - 1)) * 100 : 0}% ${rows > 1 ? (r / (rows - 1)) * 100 : 0}%`;
}

/**
 * Fills `box` (an `.eqIcon`) with the painted layers of `base` at `rarity` (1 Common to 5 Mythic; 0 an empty slot, shown as the
 * standard painting faded in a plain frame). `px` is the box's usual size on screen, to pick the atlas. Returns false, leaving
 * the box alone, when the atlas has no painting for `base`.
 */
export function paintGearIcon(box: HTMLElement, base: string, rarity: number, px: number): boolean {
  const mythic = rarity >= 5 && `${base}-mythic` in items;
  const n = items[mythic ? `${base}-mythic` : base];
  if (n === undefined) return false;
  const cell = atlasCell(px);
  const g = GRADES[Math.max(1, Math.min(5, rarity))];
  const gradeN = Object.keys(grade).length;
  box.classList.add('painted');
  const glowN = grade[`glow-${g}`];
  if (rarity > 1 && glowN !== undefined) {
    const glow = document.createElement('i');
    glow.className = 'eqGlow';
    cellBg(glow, `gear/grade-${cell}.webp`, glowN, gradeN, 1);
    box.append(glow);
  }
  const art = document.createElement('i');
  art.className = 'eqArt';
  cellBg(art, `gear/gear-${cell}.webp`, n, index.cols, index.rows);
  box.append(art);
  const frameN = grade[`frame-${rarity > 0 ? g : 'common'}`];
  if (frameN !== undefined) {
    const frame = document.createElement('i');
    frame.className = 'eqFrame';
    cellBg(frame, `gear/grade-${cell}.webp`, frameN, gradeN, 1);
    box.append(frame);
  }
  return true;
}

/** Only the grade's glow and frame (`paintGearIcon`'s outer layers) round another painting, for a skill book's cover (Common 1 grey,
 *  Uncommon 2 blue, Rare 3 violet, Legendary 4 gold: books and gear share one colour language). `art` goes between the two. */
export function paintGradeFrame(box: HTMLElement, rarity: number, px: number, art: HTMLElement): void {
  const cell = atlasCell(px);
  const g = GRADES[Math.max(1, Math.min(5, rarity))];
  const gradeN = Object.keys(grade).length;
  box.classList.add('painted');
  const glowN = grade[`glow-${g}`];
  if (rarity > 1 && glowN !== undefined) {
    const glow = document.createElement('i');
    glow.className = 'eqGlow';
    cellBg(glow, `gear/grade-${cell}.webp`, glowN, gradeN, 1);
    box.append(glow);
  }
  art.classList.add('eqArt');
  box.append(art);
  const frame = document.createElement('i');
  frame.className = 'eqFrame';
  cellBg(frame, `gear/grade-${cell}.webp`, grade[`frame-${g}`], gradeN, 1);
  box.append(frame);
}
