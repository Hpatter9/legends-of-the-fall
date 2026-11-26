// EIDOLON-SMOOTH 2 (docs/notes/eidolon-smooth.md): the pieces of an Eidolon's call, each as its look (which sheet, how big, its glow)
// and where it stands at a time of the call's clock. Each takes the place of one page element of the call as it was (named in its
// comment), and gives what that element's styles and animations gave (`callPieceRules.ts`). Pure (no page): `callCanvas.ts` draws
// them, `eidolonCall.ts` lays them.
import type { Glow, Look, Piece, Pose } from './callCanvas';
import { boulderAt, chipAt, driftAt, eased, emberAt, flareAlpha, fxAlpha, fxFrame, holdAlpha, lingerAlpha, loopAlpha, packFrame, stageAlpha, stageCell, stillAlpha, wakeAt } from './callPieceRules';
import { FX_CELL, STRIKE_FX, type FxStrip } from './eidolonFx';
import { glowUrl, STAGE_PX, STAGED, stageUrl, type StageSheet } from './eidolonStage';
import { fxUrl } from './eidolonWarmRules';

/** What every piece of a call is told: whether motion is reduced, and when the call began to go (the clock's time; null while it plays). */
export interface CallEnv {
  reduced: boolean;
  out: () => number | null;
}

/** Screen px to a sheet px, for a board drawn `k` screen px to its own. */
export const stageScale = (k: number): number => STAGE_PX * k;

/** `#rrggbb` with an alpha, as CSS. */
export const hexA = (hex: string, a: number): string => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/* ------------------------------------------------------------------ the glows (the stylesheet's drop-shadows) */

/** The page px a staged sheet's px is shown at, about (the board's own scale on a phone): what its glows are made for. */
export const STAGE_GLOW_AT = 0.75;

/** The glow under the painted pillar of an element (`.ecPillar` and its `solid` and dark kinds). */
export function pillarGlow(glow: string, dark: boolean, solid: boolean): Glow {
  if (dark) return solid ? { blur: 10, color: 'rgba(90, 30, 160, 0.9)' } : { blur: 8, color: 'rgba(150, 70, 255, 0.8)' };
  return solid ? { blur: 6, dy: 4, color: 'rgba(0, 0, 0, 0.55)' } : { blur: 10, color: hexA(glow, 0.7) };
}
/** The glow under a staged strip (`.ecFx.ecStage`), and the embers' tighter one. */
export const stageGlow = (glow: string): Glow => ({ blur: 7, color: hexA(glow, 0.6) });
export const emberGlow = (glow: string): Glow => ({ blur: 3, color: hexA(glow, 0.9) });

/* ------------------------------------------------------------------ the pack strips (`.ecSp`: six frames of 32 px) */

const pack = (src: string, foot: boolean, tint?: string): Look => ({ src, cols: 6, w: 32, h: 32, ox: 0.5, oy: foot ? 1 : 0.5, crisp: true, ...(tint ? { tint } : {}) });
const LOOP_MS = 420;

/** A mark of the trail (`.ecMark`): its strip turning, shown and hidden over 0.18 s (`on`), grown a quarter over 0.25 s (`lit`). */
export function markPiece(src: string, x: number, y: number, foot: boolean, sc: number, born: number, env: CallEnv): { piece: Piece; set: (on: boolean, lit: boolean, now: number) => void } {
  const a = { from: 0, to: 0, at: 0 };
  const s = { from: 1, to: 1, at: 0 };
  const px = Math.round(x), py = Math.round(y);
  return {
    piece: { look: pack(src, foot), pose: (now) => ({ x: px, y: py, alpha: eased(a.from, a.to, now - a.at, 180), scale: sc * eased(s.from, s.to, now - s.at, 250), col: env.reduced ? 0 : packFrame(now - born, LOOP_MS, true) }) },
    set(on, lit, now) {
      const wantA = on ? 1 : 0, wantS = lit ? 1.25 : 1;
      if (wantA !== a.to) Object.assign(a, { from: eased(a.from, a.to, now - a.at, 180), to: wantA, at: now });
      if (wantS !== s.to) Object.assign(s, { from: eased(s.from, s.to, now - s.at, 250), to: wantS, at: now });
    },
  };
}

/** A mote of the wake (`.ecSp.ecWake`): its strip once over half a second, carried off and gone in 0.9 s. */
export function wakePiece(src: string, x: number, y: number, sc: number, dx: number, dy: number, born: number): Piece {
  const px = Math.round(x), py = Math.round(y);
  return { look: pack(src, false), pose: (now) => {
    const c = wakeAt(now - born, dx, dy);
    return c && { x: px + c.dx, y: py + c.dy, alpha: c.alpha, scale: sc, col: packFrame(now - born, 500, false) };
  } };
}

/** A flare (`.ecSp.ecFlare`): its strip once, then gone. With reduced motion it stands on its first frame (as the page showed it). */
export function flarePiece(src: string, x: number, y: number, foot: boolean, sc: number, ms: number, born: number, env: CallEnv): Piece {
  const px = Math.round(x), py = Math.round(y);
  return { look: pack(src, foot), pose: (now) => {
    if (env.reduced) return { x: px, y: py, alpha: 1, scale: sc, col: 0 };
    const al = flareAlpha(now - born, ms);
    return al === null ? null : { x: px, y: py, alpha: al, scale: sc, col: packFrame(now - born, ms, false) };
  } };
}

/** A mote drifting up off the aftermath (`.ecDrift` and its strip). With reduced motion it stands, soft, and goes with the call. */
export function driftPiece(src: string, x: number, y: number, sc: number, dx: number, delay: number, ms: number, born: number, env: CallEnv): Piece {
  const px = Math.round(x), py = Math.round(y);
  return { look: pack(src, false), pose: (now) => {
    if (env.reduced) {
      const out = env.out();
      return { x: px, y: py, alpha: out === null ? 0.8 : eased(0.8, 0, now - out, 1000), scale: sc, col: 0 };
    }
    const c = driftAt(now - born - delay, ms, dx);
    return c && { x: px + c.dx, y: py + c.dy, alpha: c.alpha, scale: sc, col: packFrame(now - born, LOOP_MS, true) };
  } };
}

/** Debris flung out of a blow (`.ecChip` and its strip), tinted for the dark and the lightning. */
export function chipPiece(src: string, tint: string | undefined, x: number, y: number, sc: number, dx: number, up: number, dn: number, delay: number, born: number): Piece {
  const px = Math.round(x), py = Math.round(y);
  return { look: pack(src, false, tint), pose: (now) => {
    const c = chipAt(now - born - delay, 760, dx, up, dn);
    return c && { x: px + c.dx, y: py + c.dy, alpha: c.alpha, scale: sc, col: packFrame(now - born, LOOP_MS, true) };
  } };
}

/** Gorm's boulder (`.ecBoulder` and its strip: sand, greyed and darkened). */
export const BOULDER_TINT = 'grayscale(0.7) brightness(0.55) contrast(1.3)';
export function boulderPiece(src: string, x: number, y: number, sc: number, fall: number, delay: number, born: number): Piece {
  const px = Math.round(x), py = Math.round(y);
  return { look: pack(src, false, BOULDER_TINT), pose: (now) => {
    const c = boulderAt(now - born - delay, 520, fall);
    return c && { x: px, y: py + c.dy, alpha: c.alpha, scale: sc, col: packFrame(now - born, LOOP_MS, true) };
  } };
}

/** Vaelkhar's violet ember (`.ecEmber` and its strip; the strip is shown at its own size, as the page showed it). */
export const EMBER_TINT = 'hue-rotate(235deg) saturate(1.4)';
export function emberPiece(src: string, x: number, y: number, rise: number, delay: number, ms: number, born: number): Piece {
  const px = Math.round(x), py = Math.round(y);
  return { look: pack(src, false, EMBER_TINT), pose: (now) => {
    const c = emberAt(now - born - delay, ms, rise);
    return c && { x: px, y: py + c.dy, alpha: c.alpha, col: packFrame(now - born, LOOP_MS, true) };
  } };
}

/* ------------------------------------------------------------------ the painted strike's strips (`.ecFx`: a row of frames) */

/** How a painted strip is held by what carries it: `linger` (what stays on the ground: `.ecLinger`, from `delay` on) or `hold` (Nivra's
 *  frost: `.ecFrostHold`, over `ms`). */
export type Carrier = { kind: 'linger'; delay: number } | { kind: 'hold'; delay: number; ms: number };

/** A painted strip at a point (the page's `fxEl`): once (unseen through its delay, then played and faded) or looping; with a glow
 *  under it (the pillars); carried by a lingering patch or a frost hold. With reduced motion it holds its brightest frame and fades in
 *  and out (inside a lingering patch it only holds). */
export function fxPiece(st: FxStrip, x: number, y: number, o: { delay?: number; mul?: number; glow?: Glow; base?: number; carrier?: Carrier }, born: number, env: CallEnv): Piece {
  const size = Math.round(FX_CELL * st.scale * (o.mul ?? 1));
  const delay = Math.round(o.delay ?? 0);
  const px = Math.round(x), py = Math.round(y);
  const look: Look = { src: fxUrl(st.sheet), cols: st.n, w: size, h: size, ox: 0.5, oy: st.foot ? 1 : 0.5, ...(o.glow ? { glow: o.glow, glowScale: st.scale } : {}) };
  const carried = (now: number): number | null => {
    const c = o.carrier;
    if (!c) return 1;
    if (c.kind === 'linger') return lingerAlpha(now - born - c.delay);
    // (reduced motion: the hold only fades in and out, over 1.4 s from its laying)
    return env.reduced ? (now - born >= 1400 ? null : stillAlpha(now - born, 1400)) : holdAlpha(now - born - c.delay, c.ms);
  };
  return { look, pose: (now) => {
    const up = carried(now);
    if (up === null) return null;
    const tau = now - born - delay;
    if (env.reduced) {
      if (o.carrier?.kind === 'linger') return { x: px, y: py, alpha: up, col: st.hold };
      const life = st.ms + 300;
      const t = now - born - Math.max(0, delay);
      if (t >= life && !o.carrier) return null;
      return { x: px, y: py, alpha: stillAlpha(t, life) * up, col: st.hold };
    }
    if (st.loop) return { x: px, y: py, alpha: (delay > 0 ? (tau < 0 ? 0 : 1) : o.base ?? 1) * up, col: fxFrame(tau, st.ms, st.n, true) };
    const al = fxAlpha(tau, st.ms, delay, o.base ?? 1);
    if (al === null) return o.carrier ? { x: px, y: py, alpha: 0, col: st.n - 1 } : null;
    return { x: px, y: py, alpha: al * up, col: fxFrame(tau, st.ms, st.n, false) };
  } };
}

/* ------------------------------------------------------------------ the staged sheets (`.ecFx.ecStage`: rows of frames, the heroes' pixels) */

export interface StageOpts {
  delay?: number;
  ms?: number;
  mul?: number;
  flip?: boolean;
  loop?: boolean;
  /** `smoke`: no glow, and it is gone when the call goes; `embers`: a tighter glow, and they are gone when the call goes. */
  kind?: 'smoke' | 'embers';
}

/** A staged sheet's strip with its ground point at (x, y) (the page's `stageEls`): its glow sheet under it when it has one (soft,
 *  a fifth brighter), then the strip itself, unsmoothed, over its own glow. It plays once over `ms` after `delay` (down its rows in
 *  turn), or loops. With reduced motion it holds its steady frame and fades in and out. */
export function stagePieces(s: StageSheet, x: number, y: number, scale: number, o: StageOpts, glow: string, born: number, env: CallEnv): Piece[] {
  const k = scale * (o.mul ?? 1);
  const rows = Math.ceil(s.n / s.cols);
  const ms = Math.round(o.ms ?? s.ms);
  const delay = Math.round(o.delay ?? 0);
  const px = Math.round(x), py = Math.round(y);
  const box = { cols: s.cols, rows, w: Math.round(s.fw * k), h: Math.round(s.fh * k), ox: 0.5, oy: s.foot / s.fh };
  const base = o.kind === 'smoke' ? 0.62 : 1;
  const fades = o.kind === 'smoke' || o.kind === 'embers';
  const pose = (now: number): Pose | null => {
    // (the smoke and the embers are gone the moment the call goes: the stylesheet's rule cut them at once, its transition never
    //  taking hold of a strip an animation was holding; measured on the page as it stood)
    if (fades && env.out() !== null) return null;
    if (env.reduced) {
      const t = now - born - Math.max(0, delay);
      if (t >= ms) return null;
      return { x: px, y: py, alpha: stillAlpha(t, ms), col: s.hold % s.cols, row: Math.floor(s.hold / s.cols), flip: o.flip };
    }
    const tau = now - born - delay;
    if (o.loop) return { x: px, y: py, alpha: loopAlpha(now - born - Math.max(0, delay)), ...stageCell(tau, ms, s.cols, 1, true), flip: o.flip };
    const al = stageAlpha(tau, ms, delay, base);
    return al === null ? null : { x: px, y: py, alpha: al, ...stageCell(tau, ms, s.cols, rows), flip: o.flip };
  };
  const strip: Piece = { look: { src: stageUrl(s), ...box, crisp: true, ...(o.kind === 'smoke' ? {} : { glow: o.kind === 'embers' ? emberGlow(glow) : stageGlow(glow), glowScale: STAGE_GLOW_AT }) }, pose };
  return s.lit ? [{ look: { src: glowUrl(s), ...box, bright: true }, pose }, strip] : [strip];
}

/** EIDOLON-SMOOTH 2: the glows to make ahead for an Eidolon's call (`callCanvas.ts` `bakeGlow`): under its painted pillar, and under its
 *  staged pillar, explosion, tile fire and embers; and its staged glow sheets' brighter copies (`glow` left out). Each as the pieces ask
 *  for it (`callPieces.ts`), so a piece finds its glow made. */
export function glowBakes(id: string, glow: string, dark: boolean): { src: string; cols: number; rows: number; glow?: Glow; scale: number }[] {
  const look = STRIKE_FX[id];
  if (!look) return [];
  const out: { src: string; cols: number; rows: number; glow?: Glow; scale: number }[] = [];
  // (the pillar's glow at each size and kind its sheet is drawn with: its own; the firestorm and the wave's flames; the fault's spikes)
  const kinds: [boolean, number][] = [[look.sig.solid, look.pillar.scale]];
  if (look.sig.special === 'wave') kinds.push([false, 3.6], [false, 1.25]);
  if (look.sig.special === 'fault') kinds.push([true, 1.3]);
  for (const [solid, scale] of kinds) out.push({ src: fxUrl(look.pillar.sheet), cols: look.pillar.n, rows: 1, glow: pillarGlow(glow, dark, solid), scale });
  const st = STAGED[id];
  if (st) {
    for (const sh of [st.pillar, st.explosion, st.fire]) {
      out.push({ src: stageUrl(sh), cols: sh.cols, rows: Math.ceil(sh.n / sh.cols), glow: stageGlow(glow), scale: STAGE_GLOW_AT });
      if (sh.lit) out.push({ src: glowUrl(sh), cols: sh.cols, rows: Math.ceil(sh.n / sh.cols), scale: STAGE_GLOW_AT });
    }
    out.push({ src: stageUrl(st.embers), cols: st.embers.cols, rows: Math.ceil(st.embers.n / st.embers.cols), glow: emberGlow(glow), scale: STAGE_GLOW_AT });
  }
  return out;
}
