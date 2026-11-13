// ON-FIGHTER (docs/notes/on-fighter.md; the owner: "effects like this still hide the heroes ... maybe it's a wispy smoke that circles
// around them"): what stands or plays on a fighter must leave its body readable. Pure: the tests read it; `unitView.ts` draws by it.
//
// The rule:
//   - nothing opaque or bright lies over the middle of the sprite for longer than a brief flash (`BODY.FLASH_MS`);
//   - what stays on a fighter goes ROUND it: a pool on the ground at its feet, under the sprite; wisps that circle the body, drawn
//     UNDER the sprite for the back half of each turn and over it, small and thin, only for the front half; nothing else.
// A status that holds on a fighter (a shield, haste, a rally, a banner, a frenzy, a heal over time) is drawn so.

/** The middle of a fighter's body, in tiles: `W` wide about its centre line, from `FROM` to `TO` above its feet. What covers this box
 *  hides the fighter. `FLASH_MS`: how long an effect may lie over it at full strength as it begins; `CEILING`: the most of the box
 *  anything may cover after that (a share of its area, counting how see-through it is drawn). */
export const BODY = { W: 0.6, FROM: 0.2, TO: 1.0, FLASH_MS: 150, CEILING: 0.15 } as const;

/** The element whose wisps and pool each status has (the rendered loops `aura-wisp-<el>` and `aura-pool-<el>`), and a tint over them. */
export const STATUS_ROUND: Readonly<Record<string, { el: 'light' | 'wind' | 'fire' | 'blood' | 'forest'; tint?: number }>> = {
  shield: { el: 'light', tint: 0x9ad0ff },
  haste: { el: 'wind' },
  rally: { el: 'fire' },
  banner: { el: 'light', tint: 0xffe27a },
  frenzy: { el: 'blood' },
  regen: { el: 'forest' },
};

/** The wisps round a fighter. Sizes are shares of the fighter's height. `N` wisps in all (`SAVER` on the battery saver), shared out
 *  among the statuses on it (`wispsOf`), so three statuses do not put three times the smoke in front of it; each going
 *  round once in `TURN_MS` and climbing from `LOW` to `HIGH` up the body in `CLIMB_MS`, on an oval `RX` wide and `RY` deep. A wisp is
 *  `SIZE` across; in front of the body it is `FRONT` of that and `FRONT_ALPHA` strong, behind it `BACK_ALPHA`. The pool at the feet is
 *  `POOL` across and `POOL_ALPHA` strong. The smoke is what is to be seen (the owner: "a wispy smoke that circles around them"), the
 *  pool second: behind the body a wisp is large and at full strength, which costs the body nothing. */
export const ROUND = { N: 5, SAVER: 3, TURN_MS: 2400, CLIMB_MS: 3600, LOW: 0.12, HIGH: 0.85, RX: 0.56, RY: 0.16, SIZE: 0.82, FRONT: 0.3, FRONT_ALPHA: 0.35, BACK_ALPHA: 1, POOL: 1.25, POOL_ALPHA: 0.7 } as const;

export interface Wisp {
  /** Its place from the fighter's feet, in shares of the fighter's height (x to the right, y up). */
  x: number;
  y: number;
  /** In front of the body (the near half of its turn) or behind it. */
  front: boolean;
  /** Its size (a share of the fighter's height) and how strongly it is drawn. */
  size: number;
  alpha: number;
  /** It travels to the left (its picture is mirrored, so its tail trails behind it). */
  left: boolean;
}

/** Wisp `i` of `n` round a fighter at time `t` (ms; held at 0 for reduced motion by the caller): evenly spaced round the turn, each at
 *  its own height. The back half of the turn is behind the body. */
export function wispAt(t: number, i: number, n: number): Wisp {
  const turn = (t / ROUND.TURN_MS + i / n) * Math.PI * 2;
  const climb = (t / ROUND.CLIMB_MS + i / n) % 1;
  const front = Math.sin(turn) > 0;
  // (it thins to nothing as it sets off at the bottom and as it leaves at the top, so it never pops in or out)
  const ends = Math.min(1, climb / 0.15, (1 - climb) / 0.15);
  return {
    x: Math.cos(turn) * ROUND.RX,
    y: ROUND.LOW + (ROUND.HIGH - ROUND.LOW) * climb - Math.sin(turn) * ROUND.RY,
    front,
    size: ROUND.SIZE * (front ? ROUND.FRONT : 1),
    alpha: (front ? ROUND.FRONT_ALPHA : ROUND.BACK_ALPHA) * ends,
    left: Math.sin(turn) > 0,
  };
}

/** Which status each of the fighter's `n` wisps belongs to, for `statuses` statuses on it: dealt round, the first status first. */
export const wispsOf = (statuses: number, n: number): number[] => (statuses > 0 ? Array.from({ length: n }, (_, i) => i % statuses) : []);

/** The most of the body's box the wisps can cover in front of it, for a fighter `tall` tiles high: every wisp that can be in front
 *  at once (half of them, rounded up: they are evenly spaced round the turn), each a disc of its front size, by how strongly it is
 *  drawn. The rule's own check that what it draws obeys it (`BODY.CEILING`), however many statuses hold. */
export function frontCover(tall = 1.2, n: number = ROUND.N): number {
  const d = ROUND.SIZE * ROUND.FRONT * tall;
  return (Math.ceil(n / 2) * Math.PI * (d / 2) ** 2 * ROUND.FRONT_ALPHA) / (BODY.W * (BODY.TO - BODY.FROM));
}

/** Whether a rendered clip is one the renderer plays ON a fighter (so the rule holds for it): an ultimate's wind-up (on its caster),
 *  its strike where that plays on each fighter it touches or round its caster (`at`), every aftermath (on those struck), a king's
 *  spell's cast and hit, and the aura loops (not the wisps and pools, which are the rule's own). `tools/blender-fx/body_cover.py`
 *  measures the same set. */
export function onFighterClip(key: string, at?: string): boolean {
  if (key.startsWith('ult-')) {
    const stage = key.split('-')[2];
    return stage === 'windup' || stage === 'aftermath' || at === 'each' || at === 'friends' || at === 'self';
  }
  if (key.startsWith('aura-')) return !key.includes('-pool-') && !key.includes('-wisp-');
  return key.startsWith('spell-') && (key.endsWith('-cast') || key.endsWith('-hit'));
}

/** How strongly a clip that covers `cover` of a fighter's body (its measured most, `BODY_COVER`) is drawn OVER the fighter: whole
 *  where it covers little, else thinned so that what lies over the body is `BODY.CEILING` of it at most. The clip is drawn again at
 *  its full strength UNDER the fighter (on its tile's ground layer), so it is still seen all round the body, and behind it. */
export const overAlpha = (cover: number): number => (cover <= BODY.CEILING ? 1 : BODY.CEILING / cover);

/** What makes a clip on a fighter land with force though it is thin over the body, none of it over the body:
 *  - `SIZE`: how much larger the layer UNDER the body is drawn than the clip's own size, and it keeps its glow;
 *  - `FLASH_MS`: how long the clip is over the body at full strength as it begins (the rule's brief flash);
 *  - `RING`: a bright ring of the element on the ground at the fighter's feet, under it, as a strike lands on it (the showcase's
 *    `ring` clip), this much its own size. */
export const UNDER = { SIZE: 1.15, FLASH_MS: BODY.FLASH_MS, RING: 1.5 } as const;

/** How strongly a painted bit (a skill's cast or hit, a puff, a ring, a signature's step: the particles) is drawn OVER a fighter's
 *  body. A painted bit's cover of a body is not measured, so it is taken to cover all of it: the ceiling itself. The bit is drawn
 *  again at its full strength under that body (`Particles.under`), so it is seen round the fighter and behind it. (It was six
 *  tenths with nothing behind, FX-CLEAR's `OVER_FIGHTER_ALPHA`: a heal's haze lay over the whole party.) */
export const PAINT_OVER = BODY.CEILING;

/** ROW-UNDER: an ultimate's copy under a fighter is laid on the ground of every diagonal row its picture covers, each row's piece cut
 *  to that row's tile tops and drawn just over them: so it is under the fighter it is on, under the fighters of the rows behind it
 *  (in whose own layer it used to lie over them), and over every tile. What of it stands above the board's far edge goes on one
 *  layer behind the whole board (`behindRow`). The rows whose tile tops (`TW` by `TH` diamonds, their middles at x, y) the box
 *  `[left, top, right, bottom]` touches, nearest last. */
export function rowsUnder(tiles: readonly { depth: number; x: number; y: number }[], box: readonly [number, number, number, number], tw: number, th: number): number[] {
  const [l, t, r, b] = box;
  const rows = new Set<number>();
  for (const k of tiles) if (k.x + tw / 2 > l && k.x - tw / 2 < r && k.y + th / 2 > t && k.y - th / 2 < b) rows.add(k.depth);
  return [...rows].sort((a, c) => a - c);
}
/** The draw depth of the layer behind every tile of a board whose farthest row is `far` (a row's layer is drawn at its depth + 1,
 *  `BoardView.groundRow`, so this one is under the farthest row's tiles). */
export const behindRow = (far: number): number => far - 2;
/** A column's shape on the screen, for a row's cut: its top (a `tw` by `th` diamond, its middle at x, y), a pixel over all round so
 *  no seam shows between two rows' pieces, and its two near sides down `drop` px (so a picture is not cut along a cliff's face; the
 *  nearer rows' columns are drawn after it and cover what of it is theirs). Six corners, from the top round by the right. */
export function rowCut(x: number, y: number, drop: number, tw: number, th: number): number[] {
  const [w, h] = [tw / 2 + 1, th / 2 + 1];
  return [x, y - h, x + w, y, x + w, y + drop, x, y + h + drop, x - w, y + drop, x - w, y];
}
/** How strongly a painted bit's copy is drawn on the ground's rows. In a fighter's own layer the nearer tiles hid most of a large
 *  painted ring; on the rows the whole of it shows, and at full strength a king's spell's ring was a bright disc three tiles
 *  across. Seven tenths keeps it plain to see and leaves the ground readable under it. */
export const ROW_PAINT = 0.7;
/** How strongly a king's spell's clip is drawn on the ground's rows under those it lands on: a clip on one fighter nearly whole, a
 *  clip wider than a tile and a half (a ring under a whole party) at a little over half, for the same reason as `ROW_PAINT`: all of
 *  it shows now, where the nearer tiles used to hide most of it. */
export const ROW_CLIP = { ONE: 0.85, WIDE: 0.55 } as const;

/** SHOW-THROUGH: an ultimate's strike that is one large picture in the midst of what it struck (spikes, a pillar, a wall, a burst
 *  taller than a fighter) stands over whoever is among it. It is not thinned or moved (its moment is the strike): each fighter it
 *  stands over is drawn again OVER it, at `1 - BODY.CEILING` of full strength, once the rule's brief flash is over. That leaves the
 *  picture over a body at the ceiling exactly, and whole everywhere else. A fighter is among the picture when its body (`BODY.W` of
 *  its height across, its height tall, from its feet at x, y) overlaps the picture's box `[left, top, right, bottom]`. */
export const THROUGH = { ALPHA: 1 - BODY.CEILING, FLASH_MS: BODY.FLASH_MS, FADE_MS: 120 } as const;
export function amongPicture(x: number, y: number, tall: number, box: readonly [number, number, number, number]): boolean {
  const half = (tall * BODY.W) / 2;
  return x + half > box[0] && x - half < box[2] && y > box[1] && y - tall < box[3];
}
/** How strongly a fighter's copy is drawn `t` ms after the picture began, for a picture `life` ms long: nothing through the
 *  flash, then up to `THROUGH.ALPHA` over `FADE_MS`, and out again over the picture's last `FADE_MS`. With `still` (reduced motion)
 *  there is no flash: the copy is there from the start. */
export function throughAlpha(t: number, life: number, still = false): number {
  if (t < 0 || t >= life) return 0;
  const from = still ? 0 : THROUGH.FLASH_MS;
  const up = still ? 1 : Math.max(0, Math.min(1, (t - from) / THROUGH.FADE_MS));
  const down = Math.max(0, Math.min(1, (life - t) / THROUGH.FADE_MS));
  return THROUGH.ALPHA * Math.min(up, down);
}
