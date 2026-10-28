// The board's isometric projection, as Chronos's raid board draws it (tacticsView.ts): a tile's top is a diamond
// `TW` wide and `TH` tall, and each step of height lifts it `HH` pixels.
//
// A section of an army's long map may lie turned (`sim/turn.ts`). The fight's own tile coordinates stay as they are; `at`
// and `depth` read them through the current frame (the section being fought, set by the page with `setFrame`), so every
// fighter, effect and tap lands where the turned section is drawn. `project` and `rawAt` take the frame explicitly.

import type { Board } from '../sim/board';
import { turnDir, turnTile, type Rot } from '../sim/turn';

/** A tile top's width. */
export const TW = 64;
/** A tile top's height. */
export const TH = 32;
/** Pixels per step of height. */
export const HH = 12;
/** How far every column reaches below the lowest ground. */
export const FOOT = 10;

/** Where a board lies in the world: turned `rot` quarter turns, its footprint's corner `ou`, `ov` tiles from the frame's origin. */
export interface Frame {
  rot: Rot;
  w?: number;
  d?: number;
  ou: number;
  ov: number;
}
const HOME: Frame = { rot: 0, ou: 0, ov: 0 };
let frame: Frame = HOME;
export const setFrame = (f: Frame = HOME): void => void (frame = f);
export const getFrame = (): Frame => frame;
/** Run `f` with another frame in force. */
export function inFrame<T>(f: Frame, run: () => T): T {
  const was = frame;
  frame = f;
  try {
    return run();
  } finally {
    frame = was;
  }
}

/** The centre of a world tile's top, in world pixels (no turn: `U` and `V` are already world tiles). */
export const rawAt = (U: number, V: number, h: number): [number, number] => [(U - V) * (TW / 2), (U + V) * (TH / 2) - h * HH];

/** The centre of the top of board tile (u, v) of a board lying in `f`. */
export function project(f: Frame, u: number, v: number, h: number): [number, number] {
  const [U, V] = turnTile(f.rot, u, v, f.w, f.d);
  return rawAt(U + f.ou, V + f.ov, h);
}

/** The centre of a tile's top, in world pixels (the board's own tile, through the current frame). */
export const at = (u: number, v: number, h: number): [number, number] => project(frame, u, v, h);

/** Draw order: tiles further down the screen's diagonal are nearer. A tile is drawn at `depth * 10`, whatever stands on
 *  it a little over (so a tall column in front still hides a fighter behind it). */
export function depthIn(f: Frame, u: number, v: number): number {
  const [U, V] = turnTile(f.rot, u, v, f.w, f.d);
  return (U + f.ou + V + f.ov) * 10;
}
export const depth = (u: number, v: number): number => depthIn(frame, u, v);

/** Whether a step in the board's direction `dir` (an index into `DIRS`) looks to the right on the screen, in the current frame. */
export function facesRight(dir: number): boolean {
  const [du, dv] = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir];
  const [dU, dV] = turnDir(frame.rot, du, dv);
  // (+U runs down to the right and -V up to the right)
  return dU > 0 || dV < 0;
}

/** Conservative bounds of the existing gate/tower compound, including its height above the far edge. */
export function landmarkBounds(b: Board, f: Frame): { x0: number; x1: number; y0: number; y1: number } | null {
  if (!b.landmark || !b.landmarkAt) return null;
  const { u, v, h } = b.landmarkAt;
  const [x, y] = project(f, u, v, h);
  return { x0: x - 280, x1: x + 280, y0: y - 390, y1: y + 200 };
}
