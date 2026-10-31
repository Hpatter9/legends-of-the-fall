// The Eidolon's pass and the source of its attack (EIDOLON-CALL-2, docs/notes/eidolon-call-2.md). The owner, after the first call: "I would
// like for it to have the summon's image come on screen and move across in a way that represents who they are. Then it moves off screen and
// its attack happens, so the attack isn't blocked and you can see what happens. ... Like, where does the fire come from?"
//
// So after the horn each Eidolon's painting crosses the screen in its own way (`PASS`: its path, gait, size, facing and the trail it leaves)
// and leaves it; only then does its attack land, and the attack comes from somewhere you saw (`SOURCES`): Askel's burning paw-prints flare
// and the fire races from them to the foes, Nivra's frost wake creeps out to them, the light falls from the sky Aurelan leapt into, and so on.
// Pure: no DOM, no Pixi, so the tests read it; `eidolonCall.ts` draws it.

/** How a figure moves across. */
export type Gait = 'bound' | 'glide' | 'stride' | 'float' | 'stomp' | 'swoop';
/** What it leaves behind on its way (the attack's source when it comes from the trail). */
export type Trail = 'embers' | 'frost' | 'sunfire' | 'sparks' | 'cracks' | 'shadow';

/** One Eidolon's pass. Positions are shares of the screen: `x` of its width (the figure's middle), `y` of its height (the figure's feet).
 *  The path's heights are offsets from the ground line the page gives (the foes' rows on the board), so the paw-prints fall among them. */
export interface PassSpec {
  gait: Gait;
  /** In a few words, for the note and the tests. */
  how: string;
  /** The way it goes: points it passes through at even shares of the pass, [x, y above (-) or below (+) the ground]. Starts and ends
   *  off the screen. */
  path: readonly (readonly [number, number])[];
  /** The painting's height, a share of the screen's. */
  size: number;
  /** Leaps, steps or waves over the whole pass. */
  hops: number;
  /** How high a leap goes, or how far a wave swings (a share of the screen's height). */
  lift: number;
  /** How far it leans into its movement (degrees). */
  tilt: number;
  /** Mirror the painting so it faces the way it goes. */
  flip: boolean;
  trail: Trail;
  /** Trail marks dropped evenly (gaits that do not touch down: glide, float, swoop); touching gaits leave one at each footfall. */
  marks: number;
}

/** The six passes. The paintings: Askel faces left, Nivra and Aurelan right, Voltara, Gorm and Vaelkhar face us. */
export const PASS: Readonly<Record<string, PassSpec>> = {
  // a few long loping bounds right to left, low and fast, a burning paw-print where each lands and an ember wake
  askel: { gait: 'bound', how: 'bounds in from the right in long loping leaps, low over the foes, and out to the left', path: [[1.45, 0.02], [-0.45, 0.02]], size: 0.32, hops: 6, lift: 0.11, tilt: 14, flip: false, trail: 'embers', marks: 0 },
  // a long frosted coil sliding left to right in slow waves, a frost wake under it
  nivra: { gait: 'glide', how: 'slithers in from the left in slow rolling waves, a frosted coil gliding just over the ground, and out to the right', path: [[-0.5, 0.02], [1.5, 0.02]], size: 0.34, hops: 1.5, lift: 0.035, tilt: 9, flip: false, trail: 'frost', marks: 9 },
  // a proud stride left to right, the mane blazing, then a great leap up and out of the top of the sky
  aurelan: { gait: 'stride', how: 'strides in from the left, mane blazing, and leaps up out of the top of the screen into the sky', path: [[-0.45, 0.02], [0.3, 0.02], [0.68, -0.06], [1.2, -0.95]], size: 0.32, hops: 4, lift: 0.03, tilt: 8, flip: false, trail: 'sunfire', marks: 0 },
  // a slow weightless float high across, swaying, copper sparks hanging where she has been
  voltara: { gait: 'float', how: 'floats across high from the left, swaying, arms raised, copper sparks hanging in the air behind her', path: [[-0.45, -0.12], [0.5, -0.16], [1.45, -0.1]], size: 0.34, hops: 1, lift: 0.025, tilt: 5, flip: false, trail: 'sparks', marks: 7 },
  // heavy lurching steps left to right, the ground cracking under each footfall (the screen thuds)
  gorm: { gait: 'stomp', how: 'stomps in from the left in heavy lurching steps, the ground cracking under each one, and out to the right', path: [[-0.52, 0.03], [1.52, 0.03]], size: 0.38, hops: 7, lift: 0.022, tilt: 4, flip: false, trail: 'cracks', marks: 0 },
  // a dive from the top right down low over the field and up out of the top left, his shadow sweeping the ground under him
  vaelkhar: { gait: 'swoop', how: 'dives in from the top right, sweeps low over the field with his shadow under him, and climbs out of the top left', path: [[1.5, -0.75], [0.78, -0.1], [0.22, -0.1], [-0.5, -0.8]], size: 0.42, hops: 0, lift: 0, tilt: 12, flip: false, trail: 'shadow', marks: 7 },
};

/** Where the attack comes from: `trail`, the marks it left (they flare and the element runs from them to each foe); `sky`, the point at the
 *  top where it vanished (lances fall from there); `edge`, the edge it flew out of (a torrent sweeps in from there). */
export type SourceFrom = 'trail' | 'sky' | 'edge';
/** How the element travels from the source to the foes. */
export type Run = 'race' | 'creep' | 'lance' | 'arc' | 'crack' | 'torrent';
/** The pack sprites the page draws them with (`eidolonCall.ts` maps them to the strips in `src/art/fx/`). */
export type Sprite = 'flame' | 'embers' | 'firePuff' | 'fireBurst' | 'icePuff' | 'iceGlint' | 'pillar' | 'sparkLight' | 'nova' | 'bolt' | 'ring' | 'sand' | 'earth' | 'dust' | 'smoke' | 'darkCircle';
/** What lies on the ground afterwards. */
export type After = 'scorch' | 'frost' | 'glow' | 'burn' | 'rubble' | 'blight';

export interface AttackSource {
  from: SourceFrom;
  run: Run;
  /** In a few words, for the note and the tests. */
  words: string;
  /** The trail mark as it is left; its flare at the build-up; the head of what runs to each foe; what rises over each foe as it lands;
   *  the wake left as it passes (a mote every few frames); what drifts up off the ground afterwards. */
  mark: Sprite;
  flare: Sprite;
  head: Sprite;
  rise: Sprite;
  wake: Sprite;
  drift: Sprite;
  after: After;
  /** Sounds (cues the game has): as it passes, at each footfall or mark, as the source flares. */
  passSound: 'fireWhoosh' | 'frostCrack' | 'holyChime' | 'crackle' | 'earthRumble' | 'windGust' | 'shadowHum';
  stepSound?: 'earthRumble' | 'fireWhoosh';
  buildSound: 'fireWhoosh' | 'frostCrack' | 'holyChime' | 'crackle' | 'earthRumble' | 'shadowHum';
}

export const SOURCES: Readonly<Record<string, AttackSource>> = {
  askel: { from: 'trail', run: 'race', words: 'his burning paw-prints flare; fire races from each print along the ground to the foes, rises round them as a wall and bursts', mark: 'flame', flare: 'flame', head: 'firePuff', rise: 'flame', wake: 'embers', drift: 'embers', after: 'scorch', passSound: 'fireWhoosh', stepSound: 'fireWhoosh', buildSound: 'fireWhoosh' },
  nivra: { from: 'trail', run: 'creep', words: 'her frost wake spreads: ice creeps from it to each foe and spears up under them, then shatters into steam', mark: 'iceGlint', flare: 'icePuff', head: 'icePuff', rise: 'iceGlint', wake: 'iceGlint', drift: 'icePuff', after: 'frost', passSound: 'frostCrack', buildSound: 'frostCrack' },
  aurelan: { from: 'sky', run: 'lance', words: 'he leapt into the sky; from where he vanished the dawn breaks and lances of light fall on each foe', mark: 'sparkLight', flare: 'nova', head: 'sparkLight', rise: 'pillar', wake: 'sparkLight', drift: 'sparkLight', after: 'glow', passSound: 'holyChime', buildSound: 'holyChime' },
  voltara: { from: 'trail', run: 'arc', words: 'the copper sparks she left hang like coils: lightning leaps from spark to spark, then down onto each foe', mark: 'ring', flare: 'ring', head: 'sparkLight', rise: 'bolt', wake: 'sparkLight', drift: 'sparkLight', after: 'burn', passSound: 'crackle', buildSound: 'crackle' },
  gorm: { from: 'trail', run: 'crack', words: 'the cracks of his footfalls split on along the ground to each foe, and stone bursts up under them', mark: 'dust', flare: 'earth', head: 'sand', rise: 'earth', wake: 'sand', drift: 'dust', after: 'rubble', passSound: 'earthRumble', stepSound: 'earthRumble', buildSound: 'earthRumble' },
  vaelkhar: { from: 'edge', run: 'torrent', words: 'from the dark edge he climbed out of, a torrent of black fire pours back in along his shadow and over the foes', mark: 'smoke', flare: 'darkCircle', head: 'smoke', rise: 'darkCircle', wake: 'smoke', drift: 'smoke', after: 'blight', passSound: 'shadowHum', buildSound: 'shadowHum' },
};

/** A figure's pose a share `u` (0 to 1) of the way through its pass: its middle (`x`), its feet (`y`), its lean, its facing. */
export interface Pose {
  x: number;
  y: number;
  rot: number;
  flip: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where along the path a share of the pass is (before the gait's own bob). */
function along(p: PassSpec, u: number, ground: number): [number, number] {
  const n = p.path.length - 1;
  const s = Math.max(0, Math.min(1, u)) * n;
  const i = Math.min(n - 1, Math.floor(s));
  const t = s - i;
  return [lerp(p.path[i][0], p.path[i + 1][0], t), ground + lerp(p.path[i][1], p.path[i + 1][1], t)];
}

/** The figure's pose a share `u` of the way through its pass, with the ground line at `ground` (a share of the screen's height). */
export function passPose(p: PassSpec, u: number, ground: number): Pose {
  const [x, y0] = along(p, u, ground);
  const dir = p.path[p.path.length - 1][0] >= p.path[0][0] ? 1 : -1;
  const ph = Math.PI * p.hops * u;
  let y = y0;
  let rot = 0;
  switch (p.gait) {
    case 'bound':
      // (arcs touching down at each k/hops: nose up rising, down landing)
      y -= p.lift * Math.abs(Math.sin(ph));
      rot = -dir * p.tilt * Math.cos(ph) * Math.sign(Math.sin(ph) || 1);
      break;
    case 'stride':
      y -= p.lift * Math.abs(Math.sin(ph));
      rot = dir * p.tilt * 0.4 * Math.sin(2 * ph);
      break;
    case 'stomp':
      // (heavy: up slowly, down hard, swaying side to side with each foot)
      y -= p.lift * Math.pow(Math.abs(Math.sin(ph)), 0.6);
      rot = p.tilt * Math.sin(ph);
      break;
    case 'glide':
      y += p.lift * Math.sin(2 * ph);
      rot = dir * p.tilt * Math.cos(2 * ph);
      break;
    case 'float':
      y += p.lift * Math.sin(2 * ph);
      rot = p.tilt * Math.sin(ph);
      break;
    case 'swoop': {
      // (banks with the slope of its path)
      const [ax, ay] = along(p, u - 0.02, ground);
      const [bx, by] = along(p, u + 0.02, ground);
      rot = Math.max(-p.tilt, Math.min(p.tilt, (Math.atan2(by - ay, Math.abs(bx - ax) || 0.001) * 180) / Math.PI * dir * 0.5));
      break;
    }
  }
  return { x, y, rot, flip: p.flip };
}

/** The painting's half width as a share of the screen's width (the paintings are about square), for a screen `aspect` (width / height). */
export const halfWidth = (p: PassSpec, aspect: number): number => (p.size * 0.5) / aspect;

/** Whether any of the figure is on the screen at a pose. */
export function onScreen(p: PassSpec, pose: Pose, aspect: number): boolean {
  const hw = halfWidth(p, aspect);
  return pose.x + hw > 0 && pose.x - hw < 1 && pose.y > 0 && pose.y - p.size < 1;
}

/** A mark it leaves: when (a share of the pass) and where (shares of the screen). */
export interface Mark {
  u: number;
  x: number;
  y: number;
}

/** The marks a pass leaves on the screen: a footprint at each footfall for the gaits that touch down, else evenly along the way (a hanging
 *  spark at the hem, a shadow on the ground under a flier). Only those well inside the screen. */
export function marksOf(p: PassSpec, ground: number): Mark[] {
  const touches = p.gait === 'bound' || p.gait === 'stride' || p.gait === 'stomp';
  const us = touches ? Array.from({ length: Math.max(0, Math.ceil(p.hops) - 1) }, (_, k) => (k + 1) / p.hops) : Array.from({ length: p.marks }, (_, k) => (k + 0.5) / p.marks);
  const out: Mark[] = [];
  for (const u of us) {
    if (u >= 1) continue;
    const pose = passPose(p, u, ground);
    // (a flier's shadow on the ground under it; a floater's sparks hanging just below its hem)
    const y = p.gait === 'swoop' ? ground + 0.03 : p.gait === 'float' ? pose.y + 0.04 : pose.y;
    if (pose.x >= 0.05 && pose.x <= 0.95 && y >= 0.05 && y <= 0.95) out.push({ u, x: pose.x, y });
  }
  return out;
}

/** The point on the screen's edge where it left (the `sky` and `edge` sources): its middle the last moment it was on screen, held inside. */
export function exitPoint(p: PassSpec, ground: number): { x: number; y: number } {
  for (let u = 1; u >= 0; u -= 0.01) {
    const pose = passPose(p, u, ground);
    const cx = pose.x;
    const cy = pose.y - p.size * 0.5;
    if (cx >= 0 && cx <= 1 && cy >= 0 && cy <= 1) return { x: Math.max(0.06, Math.min(0.94, cx)), y: Math.max(0.02, Math.min(0.98, cy)) };
  }
  const end = passPose(p, 1, ground);
  return { x: Math.max(0.06, Math.min(0.94, end.x)), y: Math.max(0.02, Math.min(0.98, end.y)) };
}

/** The share of the pass at `ms` into the cinematic (0 before it starts, 1 once it is over). */
export const passShare = (m: { PASS: number; EXIT: number }, ms: number): number => (m.EXIT <= m.PASS ? 1 : Math.max(0, Math.min(1, (ms - m.PASS) / (m.EXIT - m.PASS))));

/** Each mark's time in the cinematic (ms from the tap). */
export const markTime = (m: { PASS: number; EXIT: number }, mark: Mark): number => m.PASS + mark.u * (m.EXIT - m.PASS);

/** The source each run to a foe starts from: the nearest mark (`trail`), else the exit point. */
export function runFrom(src: AttackSource, marks: readonly Mark[], exit: { x: number; y: number }, to: { x: number; y: number }, aspect: number): { x: number; y: number } {
  if (src.from !== 'trail' || !marks.length) return exit;
  let best = marks[0];
  let bd = Infinity;
  for (const k of marks) {
    const d = ((k.x - to.x) * aspect) ** 2 + (k.y - to.y) ** 2;
    if (d < bd) [best, bd] = [k, d];
  }
  return { x: best.x, y: best.y };
}

/** How many motes of the wake fall behind it per second as it passes, and the most foes a run goes to (battery saver: fewer). */
export const wakeRate = (saver: boolean, reduced: boolean): number => (reduced ? 0 : saver ? 7 : 18);
export const maxRuns = (saver: boolean): number => (saver ? 5 : 10);
