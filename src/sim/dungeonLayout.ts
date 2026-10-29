// A new floor plan for the existing Calamity graph. Layout never changes encounters or save IDs.
import { START_ID, type SideSpot } from './calLand';
import type { MapNode, NodeKind } from './tower';

export interface DungeonPoint { x: number; y: number }
export interface DungeonRoom extends DungeonPoint {
  id: number;
  kind: NodeKind | 'start';
  row: number;
  side?: boolean;
}
export interface DungeonHall {
  from: number;
  to: number;
  points: DungeonPoint[];
}
export interface DungeonLayout {
  width: number;
  height: number;
  rooms: DungeonRoom[];
  halls: DungeonHall[];
}
export type DungeonDirection = 'up' | 'down' | 'left' | 'right';
const SLOTS: Record<number, readonly number[]> = { 1: [180], 2: [112, 248], 3: [52, 180, 308], 4: [40, 133, 227, 320] };

/** Each room has its own chamber; optional detours get a separate band between the main rows. */
export function dungeonLayout(map: readonly MapNode[], sides: readonly SideSpot[]): DungeonLayout {
  const rows = Math.max(0, ...map.map((n) => n.row)) + 1;
  const levels: number[] = [];
  let y = 60;
  for (let row = rows - 1; row >= 0; row--) {
    levels[row] = y;
    y += sides.some((s) => map.find((n) => n.id === s.from)?.row === row) ? 144 : 84;
  }
  const rooms: DungeonRoom[] = [];
  for (let row = 0; row < rows; row++) {
    const nodes = map.filter((n) => n.row === row).sort((a, b) => a.lane - b.lane || a.id - b.id);
    const slots = SLOTS[nodes.length];
    nodes.forEach((n, i) => rooms.push({ id: n.id, kind: n.kind, row, x: slots?.[i] ?? 36 + i * 288 / Math.max(1, nodes.length - 1), y: levels[row] }));
  }
  for (const side of sides) {
    const from = rooms.find((r) => r.id === side.from);
    if (from) rooms.push({ id: side.id, kind: side.kind, row: from.row, x: from.x <= 180 ? 42 : 318, y: from.y + 72, side: true });
  }
  // The portal is a real, permanent graph location, including in already-saved six-map runs.
  rooms.push({ id: START_ID, kind: 'start', row: -1, x: 180, y: y + 12 });
  const halls: DungeonHall[] = [];
  const join = (from: number, to: number) => {
    const a = rooms.find((r) => r.id === from), b = rooms.find((r) => r.id === to);
    if (!a || !b) return;
    const middle = (a.y + b.y) / 2;
    const points = [{ x: a.x, y: a.y }, { x: a.x, y: middle }, { x: b.x, y: middle }, { x: b.x, y: b.y }];
    halls.push({ from, to, points: points.filter((p, i) => !i || p.x !== points[i - 1].x || p.y !== points[i - 1].y) });
  };
  for (const n of map) {
    if (n.row === 0) join(START_ID, n.id);
    for (const next of n.next) join(n.id, next);
  }
  for (const side of sides) join(side.from, side.id);
  return { width: 360, height: y + 80, rooms, halls };
}

/** Follow the exact same corridor in either direction. */
export function dungeonHall(layout: DungeonLayout, from: number, to: number): DungeonPoint[] | null {
  const hall = layout.halls.find((h) => h.from === from && h.to === to || h.from === to && h.to === from);
  return hall ? (hall.from === from ? hall.points : [...hall.points].reverse()).map((p) => ({ ...p })) : null;
}

/** An arrow chooses a connected, reachable chamber in that direction, never a room beyond an uncleared encounter. */
export function dungeonDirection(layout: DungeonLayout, from: number, allowed: ReadonlySet<number>, direction: DungeonDirection): number | undefined {
  const origin = layout.rooms.find((r) => r.id === from);
  if (!origin) return;
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
  const neighbours = layout.halls.filter((h) => h.from === from || h.to === from).map((h) => h.from === from ? h.to : h.from);
  return neighbours.filter((id) => allowed.has(id)).map((id) => {
    const r = layout.rooms.find((room) => room.id === id)!;
    const dx = r.x - origin.x, dy = r.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const ahead = dx * delta[0] + dy * delta[1];
    return { id, ahead, score: ahead / distance - distance / 10000 };
  }).filter((n) => n.ahead > 0).sort((a, b) => b.score - a.score || a.id - b.id)[0]?.id;
}
