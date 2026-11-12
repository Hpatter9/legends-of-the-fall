// The Eidolon's staged ground show (EIDOLON-BLENDER, docs/notes/eidolon-blender.md). The owner chose the hybrid: each Eidolon keeps its
// painting for the figure, its name and its line, and everything round it is staged in Blender from the game's camera and given the
// heroes' pixels: a sigil that burns onto the ground, the pillar of flame the painting leaps out of (the ground bursting under it), fire
// that crosses the foes' ground tile by tile as the lead-in, and the blow itself: a white-hot core blown out to a wall of fire wider than
// the screen, laid over the painted walls and bursts (kept: they add their own detail), the ground cracked open and glowing under it, a
// second and third detonation rolling through the foes, then heavy smoke, falling embers, scorch and cooling coals.
//
// The show is cut into small sheets (`tools/blender-fx/eidolons/parts.py`) the page lays by the board's own tiles, so it follows a board
// that is turned or not flat, and in two layers: the sigil and the scorch lie on the tiles' ground, under every fighter; the pillar, the
// fire and the smoke stand over them. This file is the rules: each sheet's shape, what plays when in a full call and a short one, which
// tiles the strike crosses and when, and what holds still with reduced motion. Pure: no DOM, no Pixi, so the tests read it;
// `eidolonCall.ts` plays the standing pieces as strips (`stageSheet.ts`) and `render/groundSheet.ts` lays the ground's.

import type { MomentTimes } from './eidolonRules';
import type { PassSpec } from './eidolonPass';

/** One sheet: `n` frames of `fw` x `fh` px, `cols` to a row (`src/art/eidolons/fx/<sheet>.webp`), played over `ms`; `foot` is how far
 *  down a frame its point on the ground is (px), and `hold` the frame held still with reduced motion. */
export interface StageSheet {
  sheet: string;
  fw: number;
  fh: number;
  n: number;
  cols: number;
  ms: number;
  foot: number;
  hold: number;
  /** It has a glow sheet too (`<sheet>-glow.webp`: the light under its brightest parts, a quarter of the size, the same frames). */
  lit?: boolean;
}

/** A sheet's pixel is a hero's: about 1.414 of the board's own (a tile's side is 32 of them, its diamond 64 board px across). */
export const STAGE_PX = Math.SQRT2;

/** One Eidolon's staged show. The names are Askel's (the first), but each is a place in the call, filled by the Eidolon's own element:
 *  `fire` is the piece a tile takes as the lead-in crosses it, `scorch` what is left on the ground, `smoke` what climbs off it and
 *  `embers` what falls. */
export interface StagedLook {
  /** On the ground: frames `draw` burn it on, `glow` flicker while it stands, `cool` dull and fade it. */
  sigil: StageSheet & { draw: number; glow: number; cool: number };
  pillar: StageSheet;
  /** The blow: the core, the wall of fire, the smoke rolling off it. */
  explosion: StageSheet;
  /** On the ground: a shock ring and the cracks opening (the first `open` frames, quick), then cooling and going dark. */
  cracks: StageSheet & { open: number };
  /** Embers falling, a loop. */
  embers: StageSheet;
  fire: StageSheet;
  /** On the ground: the first `hot` frames are its coals cooling, the rest it fading. */
  scorch: StageSheet & { hot: number };
  smoke: StageSheet;
  /** The side of the screen the painting comes from (its sigil lies there). */
  from: 'left' | 'right';
  /** A longer call builds more: the ground under the foes breaks (freezes, splits) once already as the build-up begins, ahead of the
   *  blow's own break. */
  front?: boolean;
  /** An aftershock as the aftermath begins: the tile pieces heave up once more across the foes' ground, with a rumble. */
  aftershock?: boolean;
  /** The blow's white flash, when not `BLOW_FEEL.flash`: softer where the show is itself white or gold, so its lines can be read. */
  flash?: number;
  /** And its colour, when not white. */
  flashTint?: string;
}

const sheet = (name: string, fw: number, fh: number, n: number, cols: number, ms: number, foot: number, hold: number): StageSheet => ({ sheet: name, fw, fh, n, cols, ms, foot, hold });

export const STAGED: Readonly<Record<string, StagedLook>> = {
  askel: {
    sigil: { ...sheet('askel-stage-sigil', 160, 96, 22, 6, 0, 55, 13), draw: 12, glow: 3, cool: 7 },
    pillar: { ...sheet('askel-stage-pillar', 144, 352, 16, 16, 950, 320, 5), lit: true },
    explosion: { ...sheet('askel-stage-explosion', 320, 300, 16, 8, 1500, 250, 7), lit: true },
    cracks: { ...sheet('askel-stage-cracks', 256, 136, 12, 6, 0, 68, 4), open: 4 },
    embers: sheet('askel-stage-embers', 160, 200, 12, 12, 1500, 190, 0),
    fire: sheet('askel-stage-fire', 64, 112, 14, 14, 1250, 104, 5),
    scorch: { ...sheet('askel-stage-scorch', 88, 48, 8, 8, 0, 24, 3), hot: 5 },
    smoke: sheet('askel-stage-smoke', 128, 176, 16, 16, 1900, 160, 6),
    from: 'right',
  },
  // Nivra, ice: the same places in the call, her own show (`tools/blender-fx/eidolons/nivra_parts.py`). The sigil is a six-armed rune
  // freezing on, the pillar a cluster of ice spires driven up and shattered, the blow a cold white core and a wall of spires that
  // stands a moment and then breaks all at once; the ground piece is the freezing front (a ring racing out, frost ferns behind it),
  // the tile piece small spires bursting up, the mark a sheet of ice melting back, with mist climbing and ice motes falling.
  nivra: {
    sigil: { ...sheet('nivra-stage-sigil', 160, 96, 22, 6, 0, 55, 13), draw: 12, glow: 3, cool: 7 },
    pillar: { ...sheet('nivra-stage-pillar', 144, 352, 16, 16, 1150, 320, 6), lit: true },
    explosion: { ...sheet('nivra-stage-explosion', 320, 300, 16, 8, 1700, 250, 8), lit: true },
    cracks: { ...sheet('nivra-stage-cracks', 256, 136, 12, 6, 0, 68, 4), open: 4 },
    embers: sheet('nivra-stage-embers', 160, 200, 12, 12, 1800, 190, 0),
    fire: sheet('nivra-stage-fire', 64, 112, 14, 14, 1350, 104, 5),
    scorch: { ...sheet('nivra-stage-scorch', 88, 48, 8, 8, 0, 24, 2), hot: 5 },
    smoke: sheet('nivra-stage-smoke', 128, 176, 16, 16, 2000, 160, 6),
    from: 'left',
    front: true,
  },
  // Gorm, stone (`gorm_parts.py`): a quarry mark cut into the ground with standing stones rising along it; great slabs thrust up as
  // his way in, amber in their seams, that grind, tilt apart and fall; the blow an amber flash from under the ground and a ridge of
  // slabs heaved up across the foes' side, boulders thrown, toppling outward into dust; the ground piece is the split (wide fissures,
  // amber inside, cooling to black), the tile piece a slab driven up, the mark broken ground, with dust climbing and grit falling.
  // His rock's grain packs less well, so his two big sheets carry 14 frames.
  gorm: {
    sigil: { ...sheet('gorm-stage-sigil', 160, 96, 22, 6, 0, 55, 13), draw: 12, glow: 3, cool: 7 },
    pillar: { ...sheet('gorm-stage-pillar', 144, 352, 14, 14, 1500, 320, 5), lit: true },
    explosion: { ...sheet('gorm-stage-explosion', 320, 300, 14, 7, 2000, 250, 6), lit: true },
    cracks: { ...sheet('gorm-stage-cracks', 256, 136, 12, 6, 0, 68, 4), open: 4 },
    embers: sheet('gorm-stage-embers', 160, 200, 12, 12, 1300, 190, 0),
    fire: sheet('gorm-stage-fire', 64, 112, 14, 14, 1500, 104, 5),
    scorch: { ...sheet('gorm-stage-scorch', 88, 48, 8, 8, 0, 24, 2), hot: 5 },
    smoke: sheet('gorm-stage-smoke', 128, 176, 16, 16, 2200, 160, 6),
    from: 'left',
    front: true,
    aftershock: true,
  },
  // Voltara, lightning (`voltara_parts.py`): nothing solid and nothing that lingers. A coil and cog cut in light with arcs hopping
  // along it; the sky splitting as her way in (a trunk of braided bolts from above the screen, re-forked every frame); the blow a
  // thunderclap (a white ball of discharge, arcs flung from it) and forks walking out across the foes' side, each a bolt from the
  // sky, the ground crackling between where they landed; the ground piece is the branching burn a bolt leaves, the tile piece a small
  // bolt and arcs, the mark a burnt star, with a wisp of smoke and sparks falling.
  voltara: {
    sigil: { ...sheet('voltara-stage-sigil', 160, 96, 22, 6, 0, 55, 13), draw: 12, glow: 3, cool: 7 },
    pillar: { ...sheet('voltara-stage-pillar', 144, 352, 16, 16, 1000, 320, 2), lit: true },
    explosion: { ...sheet('voltara-stage-explosion', 320, 300, 16, 8, 1500, 250, 6), lit: true },
    cracks: { ...sheet('voltara-stage-cracks', 256, 136, 12, 6, 0, 68, 4), open: 4 },
    embers: sheet('voltara-stage-embers', 160, 200, 12, 12, 1100, 190, 0),
    fire: sheet('voltara-stage-fire', 64, 112, 14, 14, 1000, 104, 1),
    scorch: { ...sheet('voltara-stage-scorch', 88, 48, 8, 8, 0, 24, 3), hot: 5 },
    smoke: sheet('voltara-stage-smoke', 128, 176, 16, 16, 1700, 160, 6),
    from: 'left',
    flash: 0.5,
  },
  // Aurelan, light (`aurelan_parts.py`): straight, clean and golden where lightning is jagged and blue. A sun cut in light, lit from
  // its middle outward; a shaft of dawn from above the screen as his way in, rings of light running down it; the blow a sunburst
  // (a disc throwing long turning rays), beams descending across the foes' side and a radiant shock racing out along the ground;
  // the ground piece is a sun of rays and rings, the tile piece a small beam, the mark a disc of gold light, with motes climbing.
  aurelan: {
    sigil: { ...sheet('aurelan-stage-sigil', 160, 96, 22, 6, 0, 55, 13), draw: 12, glow: 3, cool: 7 },
    pillar: { ...sheet('aurelan-stage-pillar', 144, 352, 14, 14, 1400, 320, 4), lit: true },
    explosion: { ...sheet('aurelan-stage-explosion', 320, 300, 14, 7, 1700, 250, 7), lit: true },
    cracks: { ...sheet('aurelan-stage-cracks', 256, 136, 12, 6, 0, 68, 4), open: 4 },
    embers: sheet('aurelan-stage-embers', 160, 200, 12, 12, 2200, 190, 0),
    fire: sheet('aurelan-stage-fire', 64, 112, 14, 14, 1400, 104, 4),
    scorch: { ...sheet('aurelan-stage-scorch', 88, 48, 8, 8, 0, 24, 2), hot: 5 },
    smoke: sheet('aurelan-stage-smoke', 128, 176, 16, 16, 2000, 160, 6),
    from: 'left',
    front: true,
    flash: 0.55,
  },
  // Vaelkhar, shadow (`vaelkhar_parts.py`): where the others throw light out, his takes it in. Black fire with a violet edge. A
  // crown of horns and a slit eye; a tear in the air as his way in, opening to a black lens and snapping shut; the blow a maw on the
  // foes' middle and two wings of dark swept out across their side, which the maw then drains back into itself, closing on a last
  // violet spark; the ground piece is the rift (jagged tears, left lying black), the tile piece black tongues, the mark blight, with
  // dark smoke and violet motes drawn upward.
  vaelkhar: {
    sigil: { ...sheet('vaelkhar-stage-sigil', 160, 96, 22, 6, 0, 55, 13), draw: 12, glow: 3, cool: 7 },
    pillar: { ...sheet('vaelkhar-stage-pillar', 144, 352, 14, 14, 1700, 320, 6), lit: true },
    explosion: { ...sheet('vaelkhar-stage-explosion', 320, 300, 16, 8, 2300, 250, 7), lit: true },
    cracks: { ...sheet('vaelkhar-stage-cracks', 256, 136, 12, 6, 0, 68, 4), open: 4 },
    embers: sheet('vaelkhar-stage-embers', 160, 200, 12, 12, 1700, 190, 0),
    fire: sheet('vaelkhar-stage-fire', 64, 112, 14, 14, 1500, 104, 5),
    scorch: { ...sheet('vaelkhar-stage-scorch', 88, 48, 8, 8, 0, 24, 3), hot: 5 },
    smoke: sheet('vaelkhar-stage-smoke', 128, 176, 16, 16, 2200, 160, 6),
    from: 'right',
    front: true,
    aftershock: true,
    flashTint: '#e9d9ff',
  },
};

/** Every sheet the staged shows load (for the tests and the credits). */
export const STAGE_SHEETS: readonly StageSheet[] = Object.values(STAGED).flatMap((l) => [l.sigil, l.pillar, l.explosion, l.cracks, l.fire, l.scorch, l.smoke, l.embers]);
export const stageUrl = (s: StageSheet): string => `eidolons/fx/${s.sheet}.webp`;
export const glowUrl = (s: StageSheet): string => `eidolons/fx/${s.sheet}-glow.webp`;

/** A call with no time for the sigil to be drawn (the short one: the painting is on at once) shows it already burnt on. */
const DRAWN_ALREADY_MS = 200;
/** How long the sigil goes on cooling after the fight runs again, and how long it takes to come up when it is not drawn. */
export const SIGIL_TAIL_MS = 700;
const SIGIL_IN_MS = 180;
/** A glow frame's length. */
const GLOW_MS = 110;

/** When the sigil has gone. */
export const sigilEnd = (m: MomentTimes): number => m.RESUME + SIGIL_TAIL_MS;

/** What the sigil shows `t` ms into a call: its frame and how solid it is; null before it starts and once it has gone. In full it is
 *  drawn while the horn sounds, done as the pillar goes up; it glows until the aftermath, then cools and fades a little into the fight.
 *  The short call has it there from the start. Reduced motion: one steady frame, faded in and out. */
export function sigilFrame(look: StagedLook, m: MomentTimes, t: number, reduced = false): { frame: number; alpha: number } | null {
  const s = look.sigil;
  const end = sigilEnd(m);
  if (t < 0 || t >= end) return null;
  if (reduced) return { frame: s.hold, alpha: Math.max(0, Math.min(1, t / 300, (end - t) / 400)) };
  if (t >= m.AFTER) {
    const k = (t - m.AFTER) / (end - m.AFTER);
    return { frame: s.draw + s.glow + Math.min(s.cool - 1, Math.floor(k * s.cool)), alpha: 1 };
  }
  const drawn = m.PASS >= DRAWN_ALREADY_MS;
  if (drawn && t < m.PASS) return { frame: Math.min(s.draw - 1, Math.floor((t / m.PASS) * s.draw)), alpha: 1 };
  return { frame: s.draw + (Math.floor(t / GLOW_MS) % s.glow), alpha: drawn ? 1 : Math.min(1, t / SIGIL_IN_MS) };
}

/** When the pillar goes up (a moment before the painting shows, so it is already burning as the hound leaps out), and how long it burns:
 *  the short call's is quicker. */
export const pillarAt = (m: MomentTimes): number => Math.max(0, m.PASS - 90);
export const pillarMs = (look: StagedLook, m: MomentTimes): number => (m.BARS ? look.pillar.ms : Math.round(look.pillar.ms * 0.6));

/** How solid the painting is as it comes out of the pillar (it is not there, then it is the fire, then itself). */
export const RISE_MS = 240;
export const riseIn = (m: MomentTimes, t: number): number => Math.max(0, Math.min(1, (t - m.PASS) / RISE_MS));

/** A tile and where its ground is on the page (px). */
export interface StageTile {
  u: number;
  v: number;
  x: number;
  y: number;
}

/** The tile the sigil lies on: the board's tile nearest the point the painting comes on at (the side it comes from, on the ground line
 *  it runs along), kept far enough inside the screen that the whole sigil shows. `w` and `h` are the screen's size, `ground` a share of
 *  its height. Null when no tile is on the screen. */
export function sigilSpot(tiles: readonly StageTile[], w: number, h: number, ground: number, from: 'left' | 'right'): StageTile | null {
  const tx = (from === 'right' ? 0.7 : 0.3) * w;
  const ty = ground * h;
  let best: StageTile | null = null;
  let bd = Infinity;
  for (const t of tiles) {
    if (t.x < w * 0.24 || t.x > w * 0.76) continue;
    // (a tile's diamond is twice as wide as deep, so depth counts double)
    const d = Math.hypot(t.x - tx, (t.y - ty) * 2);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

/** The pass, begun at the sigil instead of off the screen: the painting leaps out of the pillar and goes on its own way (the same gait,
 *  the same exit), with as many of its leaps as the shorter way has room for. `x`, `y` are the sigil's place as shares of the screen. */
export function risePass(spec: PassSpec, x: number, y: number, ground: number): PassSpec {
  const [x0] = spec.path[0];
  const [x1] = spec.path[spec.path.length - 1];
  const share = Math.max(0.3, Math.min(1, Math.abs(x1 - x) / Math.max(0.01, Math.abs(x1 - x0))));
  return { ...spec, path: [[x, y - ground], ...spec.path.slice(1)], hops: Math.max(2, Math.round(spec.hops * share)) };
}

/** How much of the lead-in is laid: the tiles that catch fire beside the foes' own (few: the painted blow is the strike), and how many
 *  of them smoke. Battery saver and the short call lay less. */
export function stageBudget(saver: boolean, short: boolean): { tiles: number; smokes: number } {
  return saver ? { tiles: 2, smokes: 2 } : short ? { tiles: 4, smokes: 3 } : { tiles: 7, smokes: 5 };
}

/** The crossing's length in the plan's own time (ms): the page stretches it over the build-up, the last tile catching just before the blow. */
export const WAVE_MS = 340;
/** How far from a foe's tile the ground catches (tiles). */
const WAVE_REACH = 2;

const hash = (u: number, v: number): number => (Math.imul(u + 11, 73856093) ^ Math.imul(v + 7, 19349663)) >>> 0;

/** One tile of the strike: when it catches (ms after the blow), whether a foe stands on it (its fire is bigger), whether it smokes. */
export interface WaveTile extends StageTile {
  delay: number;
  foe: boolean;
  smoke: boolean;
}

/** The strike across the ground: every foe's tile catches fire, and so do some of the tiles round them (chosen by the tile, never by
 *  chance, so a call replays the same), each as the fire reaches it from `from` (the hound's jaws; the foes' own middle when there is
 *  none), the nearest first. `tileAt` gives a board tile's place on the page, or null off the board. */
export function wavePlan(
  foes: readonly { u: number; v: number }[],
  tileAt: (u: number, v: number) => { x: number; y: number } | null,
  from: { x: number; y: number } | null,
  budget: { tiles: number; smokes: number },
): WaveTile[] {
  const seen = new Set<string>();
  const out: (StageTile & { foe: boolean })[] = [];
  for (const f of foes) {
    const p = tileAt(f.u, f.v);
    if (!p || seen.has(`${f.u},${f.v}`)) continue;
    seen.add(`${f.u},${f.v}`);
    out.push({ u: f.u, v: f.v, ...p, foe: true });
  }
  const round: (StageTile & { foe: boolean; rank: number })[] = [];
  for (const f of foes)
    for (let du = -WAVE_REACH; du <= WAVE_REACH; du++)
      for (let dv = -WAVE_REACH; dv <= WAVE_REACH; dv++) {
        const u = f.u + du;
        const v = f.v + dv;
        if (seen.has(`${u},${v}`)) continue;
        const p = tileAt(u, v);
        if (!p) continue;
        seen.add(`${u},${v}`);
        round.push({ u, v, ...p, foe: false, rank: hash(u, v) });
      }
  round.sort((a, b) => a.rank - b.rank || a.u - b.u || a.v - b.v);
  for (const t of round.slice(0, budget.tiles)) out.push({ u: t.u, v: t.v, x: t.x, y: t.y, foe: false });
  if (!out.length) return [];
  const o = from ?? { x: out.reduce((a, t) => a + t.x, 0) / out.length, y: out.reduce((a, t) => a + t.y, 0) / out.length };
  const dist = (t: StageTile) => Math.hypot(t.x - o.x, (t.y - o.y) * 2);
  const far = Math.max(1, ...out.map(dist));
  const plan = out.map((t) => ({ ...t, delay: Math.round((dist(t) / far) * WAVE_MS), smoke: false })).sort((a, b) => a.delay - b.delay || a.u - b.u || a.v - b.v);
  // (the smoke climbs off every other tile, the foes' own first)
  const smoky = [...plan].sort((a, b) => Number(b.foe) - Number(a.foe) || hash(a.u, a.v) - hash(b.u, b.v)).slice(0, budget.smokes);
  for (const t of smoky) t.smoke = true;
  return plan;
}

/** How long the coals take to cool and the scorch to fade (ms), and its frame `age` ms after it was burnt (-1: gone). */
export const SCORCH_COOL_MS = 2400;
export const SCORCH_FADE_MS = 900;
export function scorchFrame(look: StagedLook, age: number, reduced = false): number {
  const s = look.scorch;
  if (age < 0 || age >= SCORCH_COOL_MS + SCORCH_FADE_MS) return -1;
  if (reduced) return s.hold;
  if (age < SCORCH_COOL_MS) return Math.min(s.hot - 1, Math.floor((age / SCORCH_COOL_MS) * s.hot));
  return s.hot + Math.min(s.n - s.hot - 1, Math.floor(((age - SCORCH_COOL_MS) / SCORCH_FADE_MS) * (s.n - s.hot)));
}

/** Where frame `i` is on its sheet (px). */
export const frameAt = (s: StageSheet, i: number): { x: number; y: number } => ({ x: (i % s.cols) * s.fw, y: Math.floor(i / s.cols) * s.fh });

/** The cracks open in a rush (`CRACKS_OPEN_MS`), then cool and go dark over the rest of `CRACKS_MS`; their frame `age` ms after the
 *  ground broke (-1: gone). Reduced motion: one steady frame. */
export const CRACKS_OPEN_MS = 300;
export const CRACKS_MS = 2800;
export function cracksFrame(look: StagedLook, age: number, reduced = false): number {
  const s = look.cracks;
  if (age < 0 || age >= CRACKS_MS) return -1;
  if (reduced) return s.hold;
  if (age < CRACKS_OPEN_MS) return Math.min(s.open - 1, Math.floor((age / CRACKS_OPEN_MS) * s.open));
  return s.open + Math.min(s.n - s.open - 1, Math.floor(((age - CRACKS_OPEN_MS) / (CRACKS_MS - CRACKS_OPEN_MS)) * (s.n - s.open)));
}

/** The second and third detonations (the attack's later beats): where each goes off, as an offset from the foes' middle in shares of
 *  the screen's width and height (one to each side, rolling through them), and how big it is beside the first. */
export const DETONATIONS: readonly { dx: number; dy: number; mul: number }[] = [
  { dx: -0.27, dy: 0.012, mul: 0.72 },
  { dx: 0.27, dy: -0.008, mul: 0.78 },
];
/** The blow's own size (the wall is wider than the screen), and how far into its frames it already is in the frozen frame (ms: the
 *  white core blown out, its spikes thrown). */
export const BLOW = { mul: 1.25, lead: 190 } as const;
/** The smoke columns after the blow: how far from the foes' middle each stands (shares of the screen's width), nearest first. */
export const SMOKE_SPOTS: readonly number[] = [0, -0.3, 0.3, -0.15, 0.17];
/** What the staged blow asks of the page's own flash and shake: a hard white flash and a harder, longer shake than the painted blow's. */
export const BLOW_FEEL = { flash: 0.95, shake: 1.5, shakeMs: 760 } as const;
