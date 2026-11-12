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
