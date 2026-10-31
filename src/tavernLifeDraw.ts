// Draws what each hero does in the tavern (`render/tavernLife.ts` says what and where). Two ways:
// - **Painted** (when it lands): `src/art/tavern/life/<kind>.png`, the hero's own activity sheet (a loop row and a beat row, the seat
//   painted in), and `gwen.png` for the keeper (idle, wiping a mug, talking). They are found by name when the game is built (an
//   esbuild glob over the folder), so a sheet dropped in there needs no code change. `docs/notes/tavern-art-prompt.md` asks for them.
// - **Placeholder** (until then): the hero's battle sheet (idle, attack and cast rows) moved in small loops (a sway, a hop on the
//   bard's beat, a lean into an arm-wrestle), sitting lower in a chair, with small props: pack pictures where a pack has the thing
//   (the 5000 Pixel Effects notes, z's, steam, embers and sparks; DawnLike's book, pipes and meat; `tools/tavern-life/cut.py`)
//   and a few pixels of code-drawn tankard, cup, cards, dice, coin and dart where none has (a painted `prop-<name>.png` takes over).
// Nothing here is random: every rhythm comes from the hero's name and the clock. Reduced motion holds a still pose with the props at
// rest; the battery saver drops the little extras (steam, embers, sweat).

import { ALL_HEROES } from './sim/units';
import { loadImage } from './render/loadImage';
import { PROPS, type Spot } from './render/tavernSpots';
import { ACTIVITIES, BEAT_MS, beatOf, DARTBOARD, GWEN_SHEET, HEARTHS, LIFE, LIFE_PROPS, LIFE_SHEET, lifeSeed, puffs, type Life } from './render/tavernLife';

// ---- the pictures ----

/** Every picture the tavern's life may draw, by name (painted ones are there only once they have landed). */
const NAMES = [
  ...ALL_HEROES,
  'gwen',
  ...LIFE_PROPS.map((p) => `prop-${p}`),
  ...['note-gold', 'note-pink', 'zzz', 'steam', 'ember', 'spark', 'zap', 'star', 'bang', 'sweat', 'book', 'pipes', 'meat'].map((p) => `pack-${p}`),
];

const pics = new Map<string, HTMLImageElement>();
/** How many cells of each row of a painted sheet are used (counted once, from the picture: the first empty cell ends a row). */
const used = new Map<string, number[]>();
let loading: Promise<void> | null = null;

/** The picture's address if it is in the folder; the glob makes the lookup fail at once for a name that is not. */
async function urlOf(name: string): Promise<string | null> {
  try {
    const m = (await import(`./art/tavern/life/${name}.png`)) as { default: string };
    return m.default;
  } catch {
    return null;
  }
}

/** Load whatever of the tavern's life pictures are there (once). */
export function loadLife(): Promise<void> {
  loading ??= Promise.all(
    NAMES.map(async (n) => {
      const url = await urlOf(n);
      if (!url) return;
      try {
        pics.set(n, await loadImage(url));
      } catch {
        /* (a picture that will not load: the placeholder stays) */
      }
    }),
  ).then(() => undefined);
  return loading;
}

/** Counts the used cells of each row of a painted sheet. */
function rowsUsed(name: string, rows: number): number[] {
  const got = used.get(name);
  if (got) return got;
  const im = pics.get(name)!;
  const cell = im.height / rows;
  const across = Math.max(1, Math.round(im.width / cell));
  const counts: number[] = [];
  try {
    const c = document.createElement('canvas');
    c.width = im.width;
    c.height = im.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, im.width, im.height).data;
    for (let r = 0; r < rows; r++) {
      let n = 0;
      for (let col = 0; col < across; col++) {
        let any = false;
        for (let y = Math.floor(r * cell); y < (r + 1) * cell && !any; y += 2)
          for (let x = Math.floor(col * cell); x < (col + 1) * cell; x += 2)
            if (d[(y * im.width + x) * 4 + 3] > 24) {
              any = true;
              break;
            }
        if (!any) break;
        n++;
      }
      counts.push(Math.max(1, n));
    }
  } catch {
    for (let r = 0; r < rows; r++) counts.push(across);
  }
  used.set(name, counts);
  return counts;
}

/** The hero has a painted activity sheet. */
export const hasPainted = (kind: string): boolean => pics.has(kind);

// ---- where the hero is and how it stands ----

export interface LifeCtx {
  g: CanvasRenderingContext2D;
  now: number;
  /** Room pixels to a screen pixel (props are drawn at whole screen pixels). */
  s: number;
  reduced: boolean;
  saver: boolean;
}

/** A hero as the tavern draws it: feet at (`fx`, `fy`), `tall` room pixels high, facing, and how far it sits down into its seat. */
export interface Body {
  kind: string;
  fx: number;
  fy: number;
  tall: number;
  face: 1 | -1;
  drop: number;
  /** A quest mark is over their head (QUESTS-1b): nothing is given off up there. */
  marked?: boolean;
}

/** The hero's seat's top above the floor (room pixels): where a sitting hero's hips go. */
const SEAT_TOP: Record<string, number> = { chair: 13, stool: 24, bench: 11 };

/** The hero sits at this spot (its activity sits, or may, and there is a seat). */
export const sits = (kind: string, spot: Spot): boolean => !!LIFE[kind] && spot.seat !== 'none' && ACTIVITIES[LIFE[kind].act].posture !== 'stand';

/** How high a sitting hero's hips sit: on the seat's top (0 for a hero who stands, or whose painted sheet has its own seat). */
export const hipsAt = (kind: string, spot: Spot): number => (sits(kind, spot) && !hasPainted(kind) ? SEAT_TOP[spot.seat] - 1 : 0);

/** A standing figure's hips, as a share of its height from the feet (a placeholder's guess for the battle sheets). */
export const HIP = 0.47;

/**
 * How far a sitting hero's top half is moved down (room pixels; less than nothing raises it onto a tall stool): its hips come down
 * onto the seat. The legs below are squeezed into the room between the seat and the floor (bent knees, half hidden by the seat).
 */
export function sitDrop(kind: string, spot: Spot, tall: number): number {
  const hips = hipsAt(kind, spot);
  return hips ? Math.round(tall * HIP - hips) : 0;
}

/** A stool or bench goes in front of a sitting hero (its seat hides where the top half meets the squeezed legs); a chair, whose back
 *  would cover them, goes behind. */
export const seatInFront = (spot: Spot): boolean => spot.seat === 'stool' || spot.seat === 'bench';

/** The partner's spot across (for the arm-wrestle and the listeners), or null. */
const partnerX = (life: Life, spots: Record<string, Spot>): number | null => (life.with && spots[life.with] ? spots[life.with].x : null);

/**
 * The placeholder's pose from the battle sheet: the row and frame, a lift (room pixels up), a shift across, and the way it faces
 * (the dancers turn on the beat).
 */
export function lifePose(
  kind: string,
  spot: Spot,
  counts: Record<string, number>,
  now: number,
  reduced: boolean,
  spots: Record<string, Spot>,
): { row: string; i: number; lift: number; dx: number; face: 1 | -1 } {
  const life = LIFE[kind];
  const face = spot.facing;
  const seed = lifeSeed(kind);
  const n = (row: string) => Math.max(1, counts[row] ?? 1);
  const loop = (row: string, per: number) => Math.floor((now + seed * 7919) / per) % n(row);
  // (a slow breath: a pixel up and down)
  const breath = (per: number) => (Math.sin((now + seed * 5000) / per) > 0.4 ? 1 : 0);
  const lean = life.act === 'armwrestle' ? (partnerX(life, spots)! > spot.x ? 3 : -3) : 0;
  if (reduced) return { row: 'idle', i: 0, lift: 0, dx: lean, face };
  const u = beatOf(kind, now);
  switch (life.act) {
    case 'darts':
      return u >= 0 ? { row: 'attack', i: Math.min(n('attack') - 1, Math.floor(u * n('attack'))), lift: 0, dx: 0, face } : { row: 'idle', i: loop('idle', 240), lift: 0, dx: 0, face };
    case 'story':
      return u >= 0 ? { row: 'attack2', i: Math.min(n('attack2') - 1, Math.floor(u * n('attack2'))), lift: 0, dx: 0, face } : { row: 'idle', i: loop('idle', 200), lift: 0, dx: 0, face };
    case 'dance': {
      const b = Math.floor(now / BEAT_MS);
      // (a spin on the beat: a quick turn each eighth of a second; otherwise a step each half-beat and a turn each four beats)
      const turn: 1 | -1 = u >= 0 ? (Math.floor(now / 130) % 2 ? 1 : -1) : Math.floor(b / 4) % 2 ? (-face as 1 | -1) : face;
      const hop = Math.abs(Math.sin((now / BEAT_MS) * Math.PI)) > 0.7 ? 2 : 0;
      return { row: 'walk', i: Math.floor(now / (BEAT_MS / 2)) % n('walk'), lift: hop, dx: 0, face: turn };
    }
    case 'cheer': {
      const hop = u >= 0 ? Math.round(Math.sin(u * Math.PI) * 3) : Math.abs(Math.sin((now / BEAT_MS) * Math.PI)) > 0.85 ? 1 : 0;
      return { row: 'idle', i: loop('idle', BEAT_MS / 2), lift: hop, dx: 0, face };
    }
    case 'sing':
    case 'music':
      return { row: 'idle', i: loop('idle', 200), lift: 0, dx: Math.round(Math.sin(now / (BEAT_MS * 1.3)) * 1.2), face };
    case 'armwrestle': {
      // (the locked hands tip one way and back: both lean in and rock together)
      const tip = Math.round(Math.sin(now / 700) * 1.6 + (u >= 0 ? Math.sin(u * Math.PI) * 2 : 0));
      return { row: 'idle', i: 0, lift: 0, dx: lean + tip, face };
    }
    case 'doze':
    case 'meditate':
      return { row: 'idle', i: 0, lift: breath(1300), dx: 0, face };
    case 'lean':
      // (still, arms crossed; a slow look round on the beat)
      return { row: 'idle', i: 0, lift: breath(900), dx: 0, face: u >= 0 && u > 0.25 && u < 0.75 ? (-face as 1 | -1) : face };
    case 'read':
    case 'cards':
    case 'listen':
      return { row: 'idle', i: 0, lift: life.act === 'listen' && u >= 0 ? 1 : breath(1000), dx: 0, face };
    case 'drink':
    case 'tea':
    case 'eat':
      return { row: 'idle', i: loop('idle', 260), lift: u >= 0 ? Math.round(Math.sin(u * Math.PI)) : 0, dx: 0, face };
    default:
      return { row: 'idle', i: loop('idle', 220), lift: 0, dx: 0, face };
  }
}

/** A painted sheet's frame: the beat row while the beat lasts, else the loop (reduced motion: the loop's first frame). */
export function drawPainted(c: LifeCtx, b: Body): void {
  const im = pics.get(b.kind)!;
  const [nLoop, nBeat] = rowsUsed(b.kind, LIFE_SHEET.rows.length);
  const cell = im.height / LIFE_SHEET.rows.length;
  const u = c.reduced ? -1 : beatOf(b.kind, c.now);
  const row = u >= 0 ? 1 : 0;
  const i = c.reduced ? 0 : u >= 0 ? Math.min(nBeat - 1, Math.floor(u * nBeat)) : Math.floor((c.now + lifeSeed(b.kind) * 7919) / 180) % nLoop;
  // (the sheet's figure is LIFE_SHEET.figure tall in a LIFE_SHEET.cell cell: scale it to the hero's tavern height)
  const dk = (b.tall / LIFE_SHEET.figure) * (LIFE_SHEET.cell / cell);
  const dw = cell * dk;
  const dy = b.fy + LIFE_SHEET.base * (cell / LIFE_SHEET.cell) * dk - dw;
  const g = c.g;
  if (b.face === -1) {
    g.transform(-1, 0, 0, 1, b.fx * 2, 0);
    g.drawImage(im, i * cell, row * cell, cell, cell, b.fx - dw / 2, dy, dw, dw);
    g.transform(-1, 0, 0, 1, b.fx * 2, 0);
  } else g.drawImage(im, i * cell, row * cell, cell, cell, b.fx - dw / 2, dy, dw, dw);
}

// ---- the little props ----

/** A few pixels of a prop that no pack has ('.' is clear), drawn a room pixel each. */
const BITS: Record<string, { rows: string[]; ink: Record<string, string> }> = {
  tankard: { rows: ['.www.', '#ooo##', '#ooo#.#', '#ooo##', '#####.'], ink: { w: '#f4ead0', o: '#d8962a', '#': '#4e3a2a' } },
  cup: { rows: ['dttd.', 'dccdd', 'dccd.', '.dd..'], ink: { d: '#4a3a30', t: '#8a4a1e', c: '#ece4d2' } },
  card: { rows: ['ddd', 'dwd', 'drd', 'ddd'], ink: { d: '#2a2018', w: '#f4f0e8', r: '#c02a2a' } },
  dice: { rows: ['ddd', 'dwd', 'ddd'], ink: { d: '#2a2018', w: '#f4f0e8' } },
  coin: { rows: ['gg', 'gG'], ink: { g: '#f0c040', G: '#a87818' } },
  hands: { rows: ['.dd.', 'dssd', 'dssd', '.dd.'], ink: { d: '#4a2a1a', s: '#d8a07a' } },
  cloth: { rows: ['ww', 'wW'], ink: { w: '#e8e4dc', W: '#b8b0a4' } },
};

/** Draws a prop: the painted one where it has landed (16 px, at its own pixels), the pixel bits otherwise; centred on (x, y). */
function bit(c: LifeCtx, name: string, x: number, y: number, flip = false): void {
  const g = c.g;
  const painted = pics.get(`prop-${name}`);
  if (painted) {
    const w = painted.width / c.s;
    const h = painted.height / c.s;
    g.drawImage(painted, Math.round((x - w / 2) * c.s) / c.s, Math.round((y - h / 2) * c.s) / c.s, w, h);
    return;
  }
  const b = BITS[name];
  const w = Math.max(...b.rows.map((r) => r.length));
  const x0 = Math.round(x - w / 2);
  const y0 = Math.round(y - b.rows.length / 2);
  b.rows.forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      if (ch === '.') return;
      g.fillStyle = b.ink[ch];
      g.fillRect(x0 + (flip ? w - 1 - rx : rx), y0 + ry, 1, 1);
    }),
  );
}

/** One frame of a pack strip (six 16 px frames) or a pack tile (one), drawn at its own pixels, centred on (x, y). */
function pack(c: LifeCtx, name: string, x: number, y: number, frame = 0, alpha = 1, flip = false): void {
  const im = pics.get(`pack-${name}`);
  if (!im) return;
  const g = c.g;
  const f = Math.min(Math.floor(im.width / 16) - 1, Math.max(0, frame));
  const w = 16 / c.s;
  const px = Math.round((x - w / 2) * c.s) / c.s;
  const py = Math.round((y - w / 2) * c.s) / c.s;
  if (alpha < 1) g.globalAlpha = alpha;
  if (flip) {
    g.transform(-1, 0, 0, 1, (px + w / 2) * 2, 0);
    g.drawImage(im, f * 16, 0, 16, 16, px, py, w, w);
    g.transform(-1, 0, 0, 1, (px + w / 2) * 2, 0);
  } else g.drawImage(im, f * 16, 0, 16, 16, px, py, w, w);
  if (alpha < 1) g.globalAlpha = 1;
}

/** Things that rise and fade (notes, steam, z's, embers): one each `period` ms, each living `life` ms, `up` room pixels high. */
function rising(c: LifeCtx, name: string, x: number, y: number, period: number, life: number, up: number, drift: number, seed: number, alt?: string): void {
  if (c.reduced) return;
  for (const p of puffs(c.now, period, life, seed)) {
    const sway = Math.sin(p.age * Math.PI * 2 + p.n) * drift;
    // (a steady fade over the last third: never a blink)
    const al = p.age > 0.66 ? (1 - p.age) / 0.34 : 1;
    pack(c, alt && p.n % 2 ? alt : name, x + sway + p.age * drift, y - p.age * up, Math.floor(p.age * 6), al);
  }
}

/** The tables' tops (for a card played onto one), from the furniture. */
const TABLE_TOPS = PROPS.filter((p) => p.sprite === 'table' || p.sprite === 'longtable').map((p) => ({ x: p.x, y: p.y - (p.sprite === 'table' ? 33 : 25) }));
const nearestTable = (x: number, y: number) => TABLE_TOPS.reduce((a, t) => (Math.hypot(t.x - x, t.y - y) < Math.hypot(a.x - x, a.y - y) ? t : a));

/**
 * The props and the little things in front of a hero, drawn after its body (and after the seat in front of it): a tankard or a book in
 * hand, notes over a singer, a dart to the board.
 */
export function drawLifeFront(c: LifeCtx, b: Body, spots: Record<string, Spot>): void {
  const life = LIFE[b.kind];
  if (!life) return;
  const painted = hasPainted(b.kind);
  const seed = lifeSeed(b.kind);
  const u = c.reduced ? -1 : beatOf(b.kind, c.now);
  const top = b.fy + b.drop - b.tall;
  // (where the front hand and the mouth are, roughly, on the battle sheets: a placeholder's guess)
  const hand = { x: b.fx + b.face * b.tall * 0.2, y: b.fy + b.drop - b.tall * 0.48 };
  const mouth = { x: b.fx + b.face * b.tall * 0.14, y: top + b.tall * 0.22 };
  const toMouth = (p: number) => ({ x: hand.x + (mouth.x - hand.x) * p, y: hand.y + (mouth.y - hand.y) * p });
  const flip = b.face === -1;
  const extra = !c.saver;
  switch (life.act) {
    case 'drink': {
      if (painted) break;
      const p = u >= 0 ? Math.sin(u * Math.PI) : 0;
      const at = toMouth(p);
      bit(c, 'tankard', at.x, at.y, flip);
      break;
    }
    case 'tea': {
      const p = u >= 0 ? Math.sin(u * Math.PI) : 0;
      const at = toMouth(p * 0.9);
      if (!painted) bit(c, 'cup', at.x, at.y, flip);
      if (extra) rising(c, 'steam', at.x, at.y - 4, 1100, 1900, 10, 1.5, seed);
      break;
    }
    case 'eat': {
      if (painted) break;
      const p = u >= 0 ? Math.sin(u * Math.PI) : 0;
      const at = toMouth(p * 0.8);
      pack(c, 'meat', at.x, at.y, 0, 1, flip);
      break;
    }
    case 'sharpen':
      rising(c, 'spark', hand.x + b.face * 3, hand.y + 2, ACTIVITIES.sharpen.every, 480, 3, 1, seed);
      break;
    case 'coin': {
      if (painted && u < 0) break;
      const h = u >= 0 ? Math.sin(u * Math.PI) * 14 : 0;
      // (the coin turns as it flies: full face, edge on)
      if (u >= 0 && Math.floor(u * 8) % 2) {
        c.g.fillStyle = '#c89a28';
        c.g.fillRect(Math.round(hand.x), Math.round(hand.y - 3 - h), 1, 2);
      } else if (!painted || u >= 0) bit(c, 'coin', hand.x, hand.y - 3 - h);
      break;
    }
    case 'conjure': {
      const fx = life.tint === 'star' ? 'star' : 'ember';
      // (a small light over the open palm: it plays its frames round and round; still under reduced motion)
      pack(c, fx, hand.x, hand.y - 7, c.reduced ? 1 : Math.floor((c.now + seed * 999) / 130) % 6);
      break;
    }
    case 'darts': {
      // (the dart in hand, then in flight to the board, then stuck there until the next throw)
      const throwN = Math.floor((c.now + (b.kind === 'dragoon' ? ACTIVITIES.darts.every / 2 : 0)) / ACTIVITIES.darts.every);
      const stuck = (n: number) => ({ x: DARTBOARD.x + (lifeSeed(`${b.kind}${n}`) - 0.5) * 12, y: DARTBOARD.y + (lifeSeed(`${n}${b.kind}`) - 0.5) * 12 });
      const from = { x: hand.x, y: top + b.tall * 0.25 };
      const flying = u >= 0.45 && u < 0.8;
      if (flying) {
        const p = (u - 0.45) / 0.35;
        const to = stuck(throwN);
        const x = from.x + (to.x - from.x) * p;
        const y = from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * 10;
        dart(c, x, y, Math.sign(to.x - from.x));
      } else if (u < 0.45 && !painted) dart(c, from.x, from.y, -b.face);
      // (the last three of this player's darts stay in the board)
      // (reduced motion: the board simply has a few darts in it)
      const shown = c.reduced ? 2 : u >= 0.8 ? throwN : throwN - 1;
      for (let n = shown; n > shown - 3 && n >= 0; n--) dart(c, stuck(n).x, stuck(n).y, -1, true);
      break;
    }
    case 'sing':
    case 'music': {
      if (!painted && life.holds) pack(c, life.holds, hand.x, hand.y + 1, 0, 1, flip);
      if (b.marked) break;
      const head = { x: b.fx + b.face * 4, y: top - 2 };
      if (c.reduced) pack(c, 'note-gold', head.x + b.face * 6, head.y - 4, 0);
      else rising(c, 'note-gold', head.x + b.face * 4, head.y, 900, 2200, 18, 3, seed, 'note-pink');
      break;
    }
    case 'cheer':
      if (!b.marked && u >= 0.15 && u < 0.85) pack(c, 'bang', b.fx, top - 9, Math.floor(u * 6));
      break;
    case 'cards': {
      if (!painted) {
        bit(c, 'card', hand.x - b.face, hand.y);
        bit(c, 'card', hand.x + b.face, hand.y - 1);
        if (u < 0) bit(c, 'card', hand.x + b.face * 3, hand.y);
      }
      if (u >= 0) {
        const t = nearestTable(b.fx, b.fy);
        const p = Math.min(1, u * 2.5);
        bit(c, 'card', hand.x + (t.x + (b.fx < t.x ? -4 : 4) - hand.x) * p, hand.y + (t.y - hand.y) * p);
      }
      break;
    }
    case 'story':
      // (the teller's speech: one, two, three dots, over and over; still under reduced motion)
      if (!b.marked) talk(c, b.fx + b.face * 6, top - 6, c.reduced ? 3 : 1 + (Math.floor((c.now + seed * 3000) / 420) % 3));
      break;
    case 'listen':
      if (!b.marked && u >= 0.1 && u < 0.9) pack(c, 'bang', b.fx, top - 9, Math.floor(u * 6));
      break;
    case 'read':
      if (!painted) {
        pack(c, 'book', hand.x - b.face * 2, hand.y - 2, 0, 1, flip);
        // (a page turning: a pale sliver crossing the book)
        if (u >= 0) {
          c.g.fillStyle = '#f4ecd8';
          c.g.fillRect(Math.round(hand.x - b.face * 2 + (u - 0.5) * 6 * b.face), Math.round(hand.y - 5), 1, 3);
        }
      }
      break;
    case 'doze':
      if (b.marked) break;
      if (c.reduced) pack(c, 'zzz', b.fx + b.face * 6, top - 6, 0);
      else rising(c, 'zzz', b.fx + b.face * 6, top - 2, 2200, 2600, 12, 2, seed);
      break;
    case 'meditate':
      if (extra) rising(c, 'star', b.fx, top + b.tall * 0.4, 3000, 1600, 14, 4, seed);
      break;
    case 'hearth':
      if (extra) rising(c, 'ember', hand.x + b.face * 2, hand.y, 1400, 1200, 12, 1, seed);
      break;
    case 'dice': {
      if (painted && u < 0) break;
      // (thrown in a little arc onto the floor in front, where they lie until picked up again)
      const p = u >= 0 ? Math.min(1, u * 1.6) : 0;
      const land = { x: b.fx + b.face * 14, y: b.fy - 2 };
      for (const d of [0, 1]) {
        const x = hand.x + (land.x + d * 4 - hand.x) * p;
        const y = hand.y + (land.y - hand.y) * p - Math.sin(p * Math.PI) * 8;
        bit(c, 'dice', x, y - d);
      }
      break;
    }
    case 'tinker':
      rising(c, 'zap', hand.x + b.face * 2, hand.y, ACTIVITIES.tinker.every, 500, 3, 1, seed);
      break;
    case 'armwrestle': {
      // (the locked hands between the two, drawn by the one on the left; a bead of sweat now and then)
      const px = partnerX(life, spots);
      if (px !== null && b.fx < px && !painted) {
        const tip = c.reduced ? 0 : Math.round(Math.sin(c.now / 700) * 1.6 + (u >= 0 ? Math.sin(u * Math.PI) * 2 : 0));
        bit(c, 'hands', (b.fx + px) / 2 + tip, hand.y);
      }
      if (extra) rising(c, 'sweat', b.fx - b.face * 4, top + 4, 3000, 900, -6, 0, seed);
      break;
    }
    case 'lean':
    case 'dance':
      break;
  }
}

/** A dart: a steel tip, a dark shaft and red flights (`dir` the way it points). One in the board is seen end on: red flights round a dark
 *  centre, the player's colour, so a thrown dart shows on the board's pale rings. */
function dart(c: LifeCtx, x: number, y: number, dir: number, stuck = false): void {
  const g = c.g;
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (stuck) {
    g.fillStyle = '#d02020';
    g.fillRect(rx - 1, ry - 1, 3, 3);
    g.fillStyle = '#1a1010';
    g.fillRect(rx, ry, 1, 1);
    return;
  }
  if (pics.get('prop-dart')) return bit(c, 'dart', x, y, dir < 0);
  g.fillStyle = '#e8e8e0';
  g.fillRect(dir > 0 ? rx + 2 : rx - 3, ry, 1, 1);
  g.fillStyle = '#3a2a20';
  g.fillRect(rx - 2, ry, 4, 1);
  g.fillStyle = '#d02020';
  g.fillRect(dir > 0 ? rx - 3 : rx + 2, ry - 1, 1, 3);
}

/** A small speech box with dots in it (a story going on). */
function talk(c: LifeCtx, x: number, y: number, dots: number): void {
  const g = c.g;
  const x0 = Math.round(x - 5);
  const y0 = Math.round(y - 4);
  g.fillStyle = '#0b0e12';
  g.fillRect(x0, y0, 11, 6);
  g.fillRect(x0 + 2, y0 + 6, 2, 1);
  g.fillStyle = '#cfd9e3';
  g.fillRect(x0 + 1, y0 + 1, 9, 4);
  g.fillStyle = '#2a2a3a';
  for (let d = 0; d < dots; d++) g.fillRect(x0 + 2 + d * 3, y0 + 2, 1, 2);
}

/** A rough reach for a hearth (a fixture the activity faces), for the placeholder's checks. */
export const nearHearth = (x: number): boolean => HEARTHS.some((h) => Math.abs(h - x) < 70);

// ---- Gwen ----

/**
 * Gwen's painted figure, if it has landed: idle, wiping a mug now and then, talking for a moment after a tap. Drawn with her feet at
 * `foot` behind the bar (which hides her legs). Gives false when there is no painting (the pack placeholder is drawn instead).
 */
export function drawGwenPainted(c: LifeCtx, x: number, foot: number, talking: boolean, sinceTalk: number): boolean {
  const im = pics.get('gwen');
  if (!im) return false;
  const counts = rowsUsed('gwen', GWEN_SHEET.rows.length);
  const cell = im.height / GWEN_SHEET.rows.length;
  const wiping = !talking && gwenWiping(c.now);
  const row = talking ? 2 : wiping ? 1 : 0;
  const per = row === 0 ? 220 : 160;
  const i = c.reduced ? 0 : Math.floor((talking ? sinceTalk : c.now) / per) % counts[row];
  // (as tall as a middling hero: 46 room pixels)
  const dw = cell * (46 / GWEN_SHEET.figure) * (GWEN_SHEET.cell / cell);
  const dy = foot + GWEN_SHEET.base * (dw / GWEN_SHEET.cell) - dw;
  // (painted facing right; she faces the room from behind the bar, to the left)
  c.g.transform(-1, 0, 0, 1, x * 2, 0);
  c.g.drawImage(im, i * cell, row * cell, cell, cell, x - dw / 2, dy, dw, dw);
  c.g.transform(-1, 0, 0, 1, x * 2, 0);
  return true;
}

/** Gwen wipes a mug for two and a half seconds in every nine (never chance). */
export const gwenWiping = (now: number): boolean => now % 9000 > 6500;

/** The placeholder's wiping (over the bar's top, after the bar is drawn): a mug turned under a cloth that goes round. */
export function drawGwenWipe(c: LifeCtx, x: number, barTop: number, talking: boolean): void {
  if (pics.has('gwen') || talking || c.reduced || !gwenWiping(c.now)) return;
  const t = (c.now % 9000) - 6500;
  const mx = x - 8;
  const my = barTop - 4;
  bit(c, 'tankard', mx, my);
  const a = t / 260;
  bit(c, 'cloth', mx + Math.round(Math.cos(a) * 2), my - 1 + Math.round(Math.sin(a)));
}
