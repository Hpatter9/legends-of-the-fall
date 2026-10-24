// A cinematic's clock (pure: no Pixi, no DOM; tested in test/cinematics.test.ts), after Chronos Settlement's. The script
// (sim/sceneScripts.ts) is played as a run of beats: each line of a shot is a beat (`lineSeconds` long), and a shot's hold
// another; a tap moves to the next beat. From where the clock stands it works out the camera (the shot's `cam`, drifting
// toward its `to` over the shot, eased) and every actor: where they stand, which way they face, their pose, whether they
// are walking, replaying the acts of every shot so far (a walk takes its time, and is cut short if the shot ends first).

import { FEET, holdOf, lineLen, STAGE_H, STAGE_W, type Act, type Cam, type Facing, type Pose, type Scene, type Shot } from '../sim/sceneScripts';

export interface Cursor {
  shot: number;
  /** The beat in the shot: a line's index, or the lines' count for the hold after them. */
  beat: number;
  /** Seconds into the beat, and into the shot. */
  t: number;
  shotT: number;
}

export const start = (): Cursor => ({ shot: 0, beat: 0, t: 0, shotT: 0 });

/** Each beat's length in a shot: its lines, then its hold (if any). */
export function beats(s: Shot): number[] {
  const out = (s.lines ?? []).map(lineLen);
  const h = holdOf(s);
  if (h > 0) out.push(h);
  return out.length ? out : [2.5];
}
export const shotLength = (s: Shot): number => beats(s).reduce((n, b) => n + b, 0);
/** When a line of a shot begins (seconds into the shot): where an act waiting for it starts. */
export const lineStart = (s: Shot, line: number): number => beats(s).slice(0, line).reduce((n, b) => n + b, 0);
const actStart = (s: Shot, a: Act): number => (a.line ? lineStart(s, a.line) : 0);

/** The clock moved on by `dt` seconds; null once the scene is over. */
export function tick(c: Cursor, script: Scene, dt: number): Cursor | null {
  let { shot, beat, t, shotT } = c;
  t += dt;
  shotT += dt;
  for (;;) {
    const s = script.shots[shot];
    if (!s) return null;
    const b = beats(s);
    if (t < b[beat]) return { shot, beat, t, shotT };
    t -= b[beat];
    beat++;
    if (beat >= b.length) {
      shot++;
      beat = 0;
      shotT = t;
    }
  }
}

/** A tap: straight on to the next beat (the next line, the hold, the next shot); null after the last. */
export function next(c: Cursor, script: Scene): Cursor | null {
  const s = script.shots[c.shot];
  if (!s) return null;
  const b = beats(s);
  const done = b.slice(0, c.beat + 1).reduce((n, x) => n + x, 0);
  if (c.beat + 1 < b.length) return { shot: c.shot, beat: c.beat + 1, t: 0, shotT: done };
  return c.shot + 1 < script.shots.length ? { shot: c.shot + 1, beat: 0, t: 0, shotT: 0 } : null;
}

/** The line being spoken now (null in a hold). */
export const lineNow = (c: Cursor, script: Scene) => script.shots[c.shot]?.lines?.[c.beat] ?? null;
/** How much of a line is shown, typed out at `TYPE_RATE` characters a second (all of it at once when `still`: reduced motion). */
export const TYPE_RATE = 42;
export const typedChars = (text: string, t: number, still = false): number => (still ? text.length : Math.min(text.length, Math.floor(t * TYPE_RATE)));

/** The backdrop at a shot: its own, else the last one set before it. */
export function lookAt(script: Scene, shot: number): string {
  for (let i = shot; i >= 0; i--) if (script.shots[i]?.look) return script.shots[i].look!;
  return 'highlands';
}

/* ------------------------------------------------------------ the actors */

export interface ActorNow {
  x: number;
  facing: Facing;
  pose: Pose;
  visible: boolean;
  walking: boolean;
  /** Seconds walked so far in this walk (for the walk's frames). */
  walked: number;
  /** The awakened look it wears now (0 plain). */
  look: 0 | 1 | 2;
}

/** How fast actors walk (stage px a second), and where those coming on or going off start and end. */
export const WALK_PACE = 56;
const OFF = { left: -50, right: STAGE_W + 50 } as const;
/** Poses that last past their shot (the fallen stay down); the rest last their shot only. */
const LASTING: Pose[] = ['down'];

/** Every actor at a point in the scene. */
export function actorsAt(script: Scene, c: Cursor): Record<string, ActorNow> {
  const out: Record<string, ActorNow> = {};
  for (const [id, m] of Object.entries(script.cast)) out[id] = { x: m.x, facing: m.facing, pose: 'idle', visible: !m.hidden, walking: false, walked: 0, look: m.look ?? 0 };
  for (let i = 0; i <= c.shot && i < script.shots.length; i++) {
    const s = script.shots[i];
    const now = i === c.shot;
    const len = shotLength(s);
    // (a pose lasts its shot; the fallen stay down)
    for (const a of Object.values(out)) if (!LASTING.includes(a.pose)) a.pose = 'idle';
    for (const act of s.acts ?? []) {
      const a = out[act.who];
      if (!a) continue;
      // (an act waiting for a line has not begun until it is spoken)
      const at = actStart(s, act);
      if (now && c.shotT < at) continue;
      if ('look' in act) a.look = act.look;
      else if ('face' in act) a.facing = act.face;
      else if ('pose' in act) a.pose = act.pose;
      else if ('hide' in act) a.visible = false;
      else {
        const from = 'enter' in act ? (typeof act.from === 'number' ? act.from : OFF[act.from]) : a.x;
        const to = 'walk' in act ? act.walk : 'enter' in act ? act.enter : OFF[act.exit];
        // (a walk takes its time, hurried to fit in what is left of the shot's first 80%)
        const pace = Math.max(WALK_PACE, Math.abs(to - from) / Math.max(0.5, (len - at) * 0.8));
        const took = Math.abs(to - from) / pace;
        const t = now ? Math.min(c.shotT - at, took) : took;
        a.visible = true;
        if (to !== from) a.facing = to > from ? 'right' : 'left';
        a.x = from + (to - from) * (took > 0 ? t / took : 1);
        a.walked = t;
        a.walking = now && c.shotT - at < took;
        if ('exit' in act && (!now || c.shotT - at >= took)) a.visible = false;
        // (one who came on faces the stage once there, as the cast said)
        if ('enter' in act && !a.walking) a.facing = script.cast[act.who].facing;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------ the camera */

export interface CamNow {
  x: number;
  y: number;
  zoom: number;
}

/** Where a middle of a figure is: a little above the feet. */
const MIDDLE = FEET - 40;

function resolve(cam: Cam, actors: Record<string, { x: number }>): CamNow {
  const on = cam.on === undefined ? [] : Array.isArray(cam.on) ? cam.on : [cam.on];
  const xs = on.map((id) => actors[id]?.x).filter((x): x is number => x !== undefined);
  const x = cam.x ?? (xs.length ? xs.reduce((n, v) => n + v, 0) / xs.length : STAGE_W / 2);
  return { x, y: cam.y ?? (xs.length ? MIDDLE : STAGE_H * 0.62), zoom: cam.zoom ?? 1 };
}

const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** The camera now: the shot's, drifting toward its `to` over the shot (each end follows its actors); `still` (reduced motion) holds it where the shot starts. */
export function cameraAt(script: Scene, c: Cursor, actors: Record<string, { x: number }> = actorsAt(script, c), still = false): CamNow {
  const s = script.shots[c.shot];
  if (!s) return { x: STAGE_W / 2, y: STAGE_H * 0.62, zoom: 1 };
  const a = resolve(s.cam, actors);
  if (!s.to || still) return a;
  const b = resolve(s.to, actors);
  const k = ease(Math.min(1, c.shotT / Math.max(0.1, shotLength(s))));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, zoom: a.zoom + (b.zoom - a.zoom) * k };
}

/** The size the picture is drawn at (screen px to an art px): the base size times the zoom, to a whole number, and at least `min` (the size that makes the stage cover the picture's band). */
export const BASE_SCALE = 2;
export const scaleOf = (zoom: number, min = 1): number => Math.max(Math.ceil(min), Math.round(BASE_SCALE * zoom));

/** A camera centre kept inside the stage for a picture `w` x `h` screen px drawn at scale `k`. */
export function keepInside(cam: { x: number; y: number }, k: number, w: number, h: number): { x: number; y: number } {
  const hw = w / 2 / k;
  const hh = h / 2 / k;
  return {
    x: hw * 2 >= STAGE_W ? STAGE_W / 2 : Math.max(hw, Math.min(STAGE_W - hw, cam.x)),
    y: hh * 2 >= STAGE_H ? STAGE_H / 2 : Math.max(hh, Math.min(STAGE_H - hh, cam.y)),
  };
}

/* ------------------------------------------------------------ previews */

/** The frames worth a look in a scene, as (shot, beat, seconds in): each shot's first line once typed, and its last when it has more, or a shot with no lines a beat in. For screenshot strips (`__game.sceneFrames(id)`). */
export function previewFrames(script: Scene): [number, number, number][] {
  const out: [number, number, number][] = [];
  script.shots.forEach((s, i) => {
    const b = beats(s);
    const lines = s.lines ?? [];
    const at = (beat: number): [number, number, number] => {
      const typed = lines[beat] ? lines[beat].text.length / TYPE_RATE + 0.5 : 0.8;
      return [i, beat, Math.min(typed, b[beat] * 0.95)];
    };
    out.push(at(0));
    if (lines.length > 1) out.push(at(lines.length - 1));
  });
  return out;
}
