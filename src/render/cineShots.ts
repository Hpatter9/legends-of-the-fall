// The shot language's numbers (CINE-001; the words of it are in `sim/sceneKit.ts`, the director in `sim/cineDirector.ts`): where a
// framing puts the camera and how close, how a move changes it over the shot, how a cut comes in and a scene goes out, how a line is
// typed (paced by its punctuation, its emphasis), whose voice blips under it, and what a battery saver or reduced motion leaves out.
// Pure: no Pixi, no DOM. Kept apart from the scene player so another cinematic (a hero's ultimate, a boss's moment) can frame its own
// shots with the same rules: `frame(angle, move, ...)` is the whole camera.

import type { Angle, Cut, Move, Weather } from '../sim/sceneKit';

/* ------------------------------------------------------------ the camera */

/** How much closer than the wide view each framing is (a multiple of the stage's base size). */
export const ZOOM_OF: Record<Angle, number> = { wide: 1, high: 1.15, medium: 1.6, two: 1.45, ots: 2.1, close: 2.6, low: 2.1, dutch: 1.9, extreme: 3.6 };
/** Where on the figure each framing looks, as a share of the figure's height above its feet (0 the feet, 1 the top of the head). */
export const AIM_OF: Record<Angle, number> = { wide: 0.5, high: 0.2, medium: 0.6, two: 0.55, ots: 0.8, close: 0.84, low: 0.95, dutch: 0.75, extreme: 0.88 };
/** A Dutch tilt (radians). */
export const TILT = 0.075;
/** How far a push in or a pull out goes over the shot (a share of the zoom). */
export const PUSH = 0.2;
/** A pan's sweep across the stage (stage px over the shot), and a drift's. */
export const PAN = 70;
export const DRIFT = 14;
/** A snap zoom's lunge (s). */
export const SNAP_S = 0.18;
/** The framings drawn as a painted portrait when the subject has one (a hero's): the faces. */
export const PORTRAIT_ANGLES: ReadonlySet<Angle> = new Set<Angle>(['close', 'extreme', 'ots', 'dutch']);
/** The framings whose land behind the subject is out of focus (a long lens). */
const SOFT_BACK: Partial<Record<Angle, number>> = { close: 1, extreme: 1, ots: 0.8, dutch: 0.6, low: 0.5, medium: 0.35, two: 0.3 };

export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

export interface Frame {
  /** The camera's centre on the stage, and how close (a multiple of the base size; fractional: the picture is drawn sharp at a whole size, then eased to this). */
  x: number;
  y: number;
  zoom: number;
  /** The picture's tilt (radians). */
  tilt: number;
  /** How soft the land behind is (0 sharp, 1 fully out of focus). */
  blur: number;
  /** A hand-held judder (stage px). */
  jx: number;
  jy: number;
}

export interface Aim {
  /** The subject's feet on the stage (x, and the floor's y), its height (stage px), and which way it faces. */
  x: number;
  feet: number;
  height: number;
  facing: 'left' | 'right';
}

/**
 * The camera for a shot at `t` seconds of `len`: the framing on its subject (or, with none, the written camera `base`), moved as
 * the shot asks. `calm` (reduced motion): held where the shot begins, no tilt, no judder; the land's focus still set by the framing.
 */
export function frame(angle: Angle, move: Move, base: { x: number; y: number; zoom: number }, aim: Aim | null, t: number, len: number, calm = false): Frame {
  const u = clamp01(t / Math.max(0.1, len));
  let zoom = angle === 'wide' ? base.zoom : ZOOM_OF[angle];
  let x = aim ? aim.x : base.x;
  let y = aim ? aim.feet - aim.height * AIM_OF[angle] : base.y;
  // (over the shoulder: the camera sits a little off the speaker, towards whoever listens, so their shoulder fills the near edge)
  if (aim && angle === 'ots') x += (aim.facing === 'right' ? -1 : 1) * aim.height * 0.35;
  // (a figure seen close leaves room in front of its face, where it looks)
  if (aim && (angle === 'close' || angle === 'dutch')) x += (aim.facing === 'right' ? 1 : -1) * aim.height * 0.12;
  let tilt = angle === 'dutch' && !calm ? TILT * (aim?.facing === 'left' ? 1 : -1) : 0;
  let blur = SOFT_BACK[angle] ?? 0;
  let jx = 0;
  let jy = 0;
  if (!calm) {
    const k = easeInOut(u);
    switch (move) {
      case 'pushIn':
        zoom *= 1 + PUSH * k;
        break;
      case 'pullOut':
        zoom *= 1 + PUSH * (1 - k);
        break;
      case 'pan':
        x += (k - 0.5) * PAN;
        break;
      case 'drift':
        x += (k - 0.5) * DRIFT;
        break;
      case 'snapZoom':
        zoom *= t < SNAP_S ? 0.7 + 0.3 * easeInOut(t / SNAP_S) : 1 + 0.04 * k;
        break;
      case 'rack':
        // (the focus starts on the land and is pulled onto the subject)
        blur = Math.max(blur, 1) * clamp01((t - 0.15) / 0.7);
        break;
      case 'shake':
        jx = Math.sin(t * 23) * 1.5 + Math.sin(t * 41) * 0.8;
        jy = Math.cos(t * 19) * 1.1;
        break;
      case 'track':
      case 'still':
        break;
    }
    if (angle === 'dutch') tilt *= 0.85 + 0.15 * k;
  }
  return { x, y, zoom, tilt, blur, jx, jy };
}

/** The whole size the picture is drawn sharp at for a fractional scale (screen px to an art px): the next whole number up. */
export const sharpScale = (scale: number): number => Math.max(1, Math.ceil(scale - 1e-6));

/* ------------------------------------------------------------ cuts and endings */

/** How long each cut takes to come in (s). */
export const CUT_S: Record<Cut, number> = { cut: 0, match: 0, fade: 0.7, smash: 0.24, flash: 0.3, dissolve: 0.55 };
/** The cuts that land with a hit. */
export const HIT_CUTS: ReadonlySet<Cut> = new Set<Cut>(['smash', 'flash']);

export interface Veil {
  /** Black over the picture, white over it, and the last shot's picture held over the new one (a cross-fade). */
  black: number;
  white: number;
  prev: number;
}

/** The veil at `t` s into a shot that came in by `cut`. A smash holds full black, then is gone at once; a fade and a flash ease off. */
export function cutVeil(cut: Cut, t: number): Veil {
  const v: Veil = { black: 0, white: 0, prev: 0 };
  const d = CUT_S[cut];
  if (!d || t >= d) return v;
  if (cut === 'fade') v.black = 1 - easeInOut(t / d);
  else if (cut === 'smash') v.black = 1;
  else if (cut === 'flash') v.white = 0.85 * (1 - t / d);
  else if (cut === 'dissolve') v.prev = 1 - easeInOut(t / d);
  return v;
}

/** How long a scene's ending takes (s): a smash to black is sudden, a fade is not. */
export const OUT_S = { smash: 0.3, fade: 0.9 } as const;
/** The black over the picture with `left` seconds of the scene to go. */
export function outVeil(out: 'smash' | 'fade' | undefined, left: number): number {
  if (!out || left > OUT_S[out]) return 0;
  return out === 'smash' ? 1 : 1 - left / OUT_S.fade;
}

/* ------------------------------------------------------------ the letterbox */

/** The bars of the film (shares of the screen's height): a wide shot opens up a little, a close-up and a boss's arrival close in. */
export function barsOf(angle: Angle): { top: number; foot: number } {
  const tight = angle === 'close' || angle === 'extreme' || angle === 'low' || angle === 'dutch';
  return { top: tight ? 0.1 : 0.07, foot: 0.2 };
}

/* ------------------------------------------------------------ the words */

/** Characters typed a second, on a plain run of words. */
export const TYPE_RATE = 42;
/** The pauses after punctuation (s): a breath at a comma, a stop at a full stop, a longer one at a dash or an ellipsis. */
export const PAUSE = { comma: 0.12, stop: 0.3, dash: 0.22, ellipsis: 0.38 } as const;
/** A word said with weight is typed this much slower. */
export const EM_SLOW = 1.7;

export interface Run {
  text: string;
  em: boolean;
}

/** A line cut into plain runs and the ones marked `*like this*` (said with weight). An unpaired mark is left out. */
export function emphasis(text: string): Run[] {
  const out: Run[] = [];
  const parts = text.split('*');
  const paired = parts.length % 2 === 1;
  parts.forEach((p, i) => {
    if (!p) return;
    const em = paired && i % 2 === 1;
    const last = out[out.length - 1];
    if (last && last.em === em) last.text += p;
    else out.push({ text: p, em });
  });
  return out;
}

/** When each character of a line (marks left out) is shown, in seconds from the line's start: steady, with a pause after
 *  punctuation and slower through a word said with weight. */
export function typeTimes(text: string): number[] {
  const out: number[] = [];
  let t = 0;
  const runs = emphasis(text);
  const plain = runs.map((r) => r.text).join('');
  let i = 0;
  for (const r of runs) {
    for (const ch of r.text) {
      out.push(t);
      t += (1 / TYPE_RATE) * (r.em ? EM_SLOW : 1);
      const next = plain[i + 1];
      // (a pause after punctuation, unless more of it follows straight on: "?!" or a closing quote)
      if (next === undefined || next === ' ') {
        if (ch === ',' || ch === ';' || ch === ':') t += PAUSE.comma;
        else if (ch === '.' && plain.slice(i - 2, i + 1) === '...') t += PAUSE.ellipsis;
        else if (ch === '.' || ch === '!' || ch === '?') t += PAUSE.stop;
        else if (ch === '…') t += PAUSE.ellipsis;
      }
      if (ch === '—' || ch === '–') t += PAUSE.dash;
      i++;
    }
  }
  return out;
}

/** How many characters of a line are shown `t` s in (all of them when `still`: reduced motion). */
export function typedCount(text: string, t: number, still = false): number {
  const times = typeTimes(text);
  if (still) return times.length;
  let n = 0;
  while (n < times.length && times[n] <= t) n++;
  return n;
}

/** How long a line takes to type out in full (s). */
export const typeLength = (text: string): number => {
  const times = typeTimes(text);
  return times.length ? times[times.length - 1] + 1 / TYPE_RATE : 0;
};

/* ------------------------------------------------------------ voices */

/** A speaker's voice, for the blips under their words: the narrator's quill, a hero's, a big foe's growl, a beast's, the king's,
 *  the goat's. */
export type Voice = 'narrator' | 'hero' | 'boss' | 'beast' | 'king' | 'goat';
/** The cue each voice blips with, and every how many letters. */
export const VOICE_CUE: Record<Voice, { cue: 'blipQuill' | 'blipHero' | 'blipBoss' | 'blipBeast' | 'blipKing' | 'blipGoat'; every: number }> = {
  narrator: { cue: 'blipQuill', every: 4 },
  hero: { cue: 'blipHero', every: 3 },
  boss: { cue: 'blipBoss', every: 4 },
  beast: { cue: 'blipBeast', every: 4 },
  king: { cue: 'blipKing', every: 3 },
  goat: { cue: 'blipGoat', every: 6 },
};

/** Whether typing from `was` to `now` letters of a line passes a letter that blips (a letter, not a space or a mark, every few). */
export function blipsBetween(plain: string, was: number, now: number, every: number): boolean {
  for (let i = was; i < now; i++) if (/[A-Za-z0-9]/.test(plain[i] ?? '') && i % every === 0) return true;
  return false;
}

/* ------------------------------------------------------------ weight: battery saver and reduced motion */

export interface Weight {
  /** Particles of the shot's weather drawn at once. */
  motes: number;
  /** Whether the land behind can be blurred, light rays drawn, the picture tilted, the camera moved. */
  blur: boolean;
  rays: boolean;
  tilt: boolean;
  moves: boolean;
  /** Whether the particles drift (else they hang still). */
  drift: boolean;
}

/** What a scene draws: everything; lighter on a battery saver (fewer motes, no blur, no rays); with reduced motion nothing moves. */
export function weightOf(saver: boolean, calm: boolean, weather: Weather): Weight {
  const base = weather === 'none' ? 0 : weather === 'rain' ? 70 : weather === 'snow' ? 55 : 40;
  return { motes: Math.round(base * (saver ? 0.35 : 1)), blur: !saver, rays: !saver, tilt: !calm, moves: !calm, drift: !calm };
}

/* ------------------------------------------------------------ skipping */

/** Holding a finger on the picture this long (ms) skips the scene; a shorter press is a tap. */
export const HOLD_SKIP_MS = 650;
/** A press: a tap (on to the next line), a hold that skips, or still being held (with how far round the ring is). */
export function pressOf(ms: number, released: boolean): { kind: 'tap' | 'skip' | 'holding'; ring: number } {
  if (ms >= HOLD_SKIP_MS) return { kind: 'skip', ring: 1 };
  if (released) return { kind: 'tap', ring: 0 };
  // (the ring shows only once the press is longer than a tap)
  return { kind: 'holding', ring: ms < 150 ? 0 : (ms - 150) / (HOLD_SKIP_MS - 150) };
}
