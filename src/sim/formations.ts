// The party's formations (docs/notes/tactics.md, batch 4; the design is docs/notes/tactics-design.md, section 3). A formation is a shape on
// the three deploy rows, read from where the heroes stand as the fight begins (`formationOf`); each has a small bonus and a weak point:
//
//   - Shield Wall (against brutes): three or more heroes side by side on the front row, two of them front-liners. Each in the wall has +2 AC
//     while a friend of the wall still stands beside it; but the wall's ends are open: a blow on an end from its outer side counts as from
//     behind.
//   - Spearhead (against shooters): a hero at the front, two a row behind it on each diagonal. The tip and its wings march 25% faster for
//     6 s, the tip's first blow is +50% and each wing's +25%; but the tip stands alone, at -1 AC.
//   - Hollow Square (against flankers): a back-liner on the back row with friends on both sides and in front. While two friends still stand
//     round them, its heroes have +1 AC and a blow on the back-liner counts as from its front; but packed together, they take 15% more from
//     splash.
//   - Skirmish (against blasts): four or more heroes, no two on touching tiles. Splash on them is 40% less and the foes' skills 20% less;
//     but nobody stands beside a friend (the guards, auras and ranks reach fewer: no rule of its own).
//
// The formations count only where the fight has them on (`setFormations`: the page, once Auto place is open, the owner's answer; the tools
// that play Auto, batch 5), so every other fight plays as before. Nothing rolls a die.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { DEPLOY_ROWS, standable, tileAt, type At, type Board } from './board';
import type { Battle, Unit } from './battle';
import { roleOf } from './suggest';
import { UNITS } from './units';

export type Formation = 'wall' | 'spear' | 'square' | 'skirmish';
export const FORMATIONS_LIST: readonly Formation[] = ['wall', 'spear', 'square', 'skirmish'];

/** The numbers (`FORM`): the wall's AC, the tip's, the spearhead's march and first blow, the splash on a square and on skirmishers. */
export const FORM = { WALL_AC: 1, WALL_MELEE: 0.8, TIP_AC: -1, SPEAR_MOVE: 1.3, SPEAR_MS: 6000, TIP_BLOW: 1.5, WING_BLOW: 1.5, SQUARE_AC: 2, SQUARE_SPLASH: 1.15, SKIRMISH_SPLASH: 0.5, SKIRMISH_SKILL: 0.7 };

/** The fight's formation, once it has begun: its kind and who plays which part (by id). */
export interface FormationState {
  kind: Formation;
  /** Every hero in the shape. */
  members: number[];
  /** The Shield Wall's ends: the left (lower `u`) and the right. */
  ends?: [number, number];
  /** The Spearhead's tip and its wings; whether the tip has struck its first blow, and who of the three has. */
  tip?: number;
  wings?: number[];
  struck?: boolean;
  hit?: number[];
  /** The Hollow Square's back-liners inside it. */
  inside?: number[];
}

const touching = (a: At, c: At) => Math.max(Math.abs(a.u - c.u), Math.abs(a.v - c.v)) === 1;
const beside = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v) === 1;
const isBack = (kind: string) => roleOf(kind) === 'back' || roleOf(kind) === 'support';

/** The shape that `heroes` (a kind and a tile each, on a board `d` deep) stand in, and its parts: the first that fits of Shield Wall,
 *  Spearhead, Hollow Square and Skirmish; undefined (Loose) when none does. `id` names each in the parts. */
export function formationOf(d: number, heroes: readonly { id: number; kind: string; u: number; v: number }[]): FormationState | undefined {
  const front = d - DEPLOY_ROWS;
  const at = (u: number, v: number) => heroes.find((h) => h.u === u && h.v === v);
  // (the Shield Wall: the longest run of heroes side by side on the front row, three or more, two of them front-liners)
  const row = heroes.filter((h) => h.v === front).sort((x, y) => x.u - y.u);
  let best: typeof row = [];
  for (let i = 0; i < row.length; i++) {
    let j = i;
    while (j + 1 < row.length && row[j + 1].u === row[j].u + 1) j++;
    const run = row.slice(i, j + 1);
    if (run.length > best.length) best = run;
    i = j;
  }
  if (best.length >= 3 && best.filter((h) => roleOf(h.kind) === 'front').length >= 2) {
    return { kind: 'wall', members: best.map((h) => h.id), ends: [best[0].id, best[best.length - 1].id] };
  }
  // (the Spearhead: a tip at the front with a wing a row behind on each diagonal)
  for (const t of heroes) {
    if (t.v !== front) continue;
    const l = at(t.u - 1, t.v + 1);
    const r = at(t.u + 1, t.v + 1);
    if (l && r) return { kind: 'spear', members: [t.id, l.id, r.id], tip: t.id, wings: [l.id, r.id] };
  }
  // (the Hollow Square: a back-liner on the back row, a friend on each side (beside it or a row ahead) and one in front (one or two rows ahead))
  const inside = heroes.filter(
    (h) =>
      h.v === d - 1 &&
      isBack(h.kind) &&
      (at(h.u - 1, h.v) || at(h.u - 1, h.v - 1)) &&
      (at(h.u + 1, h.v) || at(h.u + 1, h.v - 1)) &&
      (at(h.u, h.v - 1) || at(h.u, h.v - 2)),
  );
  if (inside.length) return { kind: 'square', members: heroes.map((h) => h.id), inside: inside.map((h) => h.id) };
  // (the Skirmish: four or more, no two touching)
  if (heroes.length >= 4 && !heroes.some((h, i) => heroes.some((o, j) => j > i && touching(h, o)))) return { kind: 'skirmish', members: heroes.map((h) => h.id) };
  return undefined;
}

/** Whether the formations count in this fight (off unless set: every fight the page or a tool did not set plays as before). */
export function setFormations(b: Battle, on: boolean): void {
  if (b.phase !== 'deploy') return;
  b.formationsOn = on || undefined;
}

/** The placed heroes a formation is read from: the player's own, not their summons. */
const placed = (b: Battle) => b.units.filter((u) => u.alive && u.side === 'hero' && UNITS[u.def]?.side === 'hero' && !UNITS[u.def].summon);

/** As the fight begins: the shape the heroes stand in, if the fight has the formations on (and it is not the Last Stand). */
export function startFormation(b: Battle): void {
  b.formation = undefined;
  if (!b.formationsOn || b.stand) return;
  b.formation = formationOf(b.board.d, placed(b).map((u) => ({ id: u.id, kind: u.def, u: u.u, v: u.v })));
}

const unitOf = (b: Battle, id: number) => b.units.find((u) => u.id === id);
/** Living friends of the shape standing beside (`beside`) or round (`touching`) `me`. */
const friendsBy = (b: Battle, me: Unit, ids: readonly number[], near: (a: At, c: At) => boolean) =>
  ids.filter((id) => id !== me.id).map((id) => unitOf(b, id)).filter((u): u is Unit => !!u && u.alive && near(me, u)).length;

/** The AC the formation gives `to` (or takes): the wall's +1 while a friend of it stands beside, the tip's -1. */
export function formationAc(b: Battle, to: Unit): number {
  const f = b.formation;
  if (!f || to.side !== 'hero') return 0;
  if (f.kind === 'wall' && f.members.includes(to.id) && friendsBy(b, to, f.members, beside) > 0) return FORM.WALL_AC;
  if (f.kind === 'spear' && f.tip === to.id) return FORM.TIP_AC;
  if (f.kind === 'square' && f.members.includes(to.id) && friendsBy(b, to, f.members, touching) >= 2) return FORM.SQUARE_AC;
  return 0;
}

/** The facing a blow from `by` on `to` is weighed against (`blowMult`): a wall's end struck from its outer side as from behind, a square's
 *  back-liner (while two friends stand round it) as from the front; otherwise `to`'s own. */
export function formationFacing(b: Battle, by: Unit, to: Unit, way: number): number {
  const f = b.formation;
  if (!f || to.side !== 'hero') return to.facing;
  if (f.kind === 'wall' && f.ends) {
    if ((to.id === f.ends[0] && by.u < to.u) || (to.id === f.ends[1] && by.u > to.u)) return way;
  }
  if (f.kind === 'square' && f.inside?.includes(to.id) && friendsBy(b, to, f.members, touching) >= 2) return (way + 2) % 4;
  return to.facing;
}

/** The Spearhead's march: its tip and wings step this much quicker in the first `SPEAR_MS`. */
export function formationMove(b: Battle, me: Unit): number {
  const f = b.formation;
  return f?.kind === 'spear' && b.t <= FORM.SPEAR_MS && f.members.includes(me.id) ? FORM.SPEAR_MOVE : 1;
}

/** The Spearhead's first blows: the tip's `TIP_BLOW`, each wing's `WING_BLOW`, once each (the call marks it struck). */
export function formationBlow(b: Battle, me: Unit): number {
  const f = b.formation;
  if (f?.kind !== 'spear' || !f.members.includes(me.id)) return 1;
  f.hit ??= [];
  if (f.hit.includes(me.id)) return 1;
  f.hit.push(me.id);
  if (me.id === f.tip) f.struck = true;
  return me.id === f.tip ? FORM.TIP_BLOW : FORM.WING_BLOW;
}

/** What a splash (or, for a skirmisher, a foe's skill) on `to` is worth: less on a skirmisher, more on a square's hero standing among two
 *  friends. */
export function formationSplash(b: Battle, to: Unit, skill = false): number {
  const f = b.formation;
  if (!f || to.side !== 'hero' || !f.members.includes(to.id)) return 1;
  if (f.kind === 'skirmish') return skill ? FORM.SKIRMISH_SKILL : FORM.SKIRMISH_SPLASH;
  if (f.kind === 'square' && !skill && friendsBy(b, to, f.members, touching) >= 2) return FORM.SQUARE_SPLASH;
  return 1;
}

/** What a melee blow on `to` is worth: less on a Shield Wall's hero while a friend of the wall stands beside it. */
export function formationMelee(b: Battle, to: Unit): number {
  const f = b.formation;
  return f?.kind === 'wall' && to.side === 'hero' && f.members.includes(to.id) && friendsBy(b, to, f.members, beside) > 0 ? FORM.WALL_MELEE : 1;
}

// ---- Arranging a party into a shape (the page's Arrange) ----

/** Each shape's tiles, relative to its centre column on the front row (dv 0 the front row, 2 the back): the lead's (front-liners first,
 *  then strikers) and the rear's (the back line, support last), each filled in order; a party too many for one list takes the other's. */
const SHAPES: Record<Formation, { lead: readonly [number, number][]; rear: readonly [number, number][] }> = {
  wall: { lead: [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0]], rear: [[0, 2], [-1, 2], [1, 2]] },
  spear: { lead: [[0, 0], [-1, 1], [1, 1]], rear: [[-2, 2], [2, 2], [0, 2]] },
  square: { lead: [[0, 0], [1, 0], [-1, 1], [2, 1]], rear: [[0, 2], [1, 2]] },
  skirmish: { lead: [[-2, 0], [2, 0], [0, 1]], rear: [[-3, 2], [3, 2], [-4, 0]] },
};

const RANK = { front: 0, striker: 1, back: 2, support: 3 } as const;

/** Where a party of `kinds` would stand in `shape` on `board` (a tile each, in the given order; the heroes' rows only). The shape is laid
 *  at the centre column that fits the most of its tiles on standable ground; a tile that does not fit goes to the nearest free standable tile
 *  of the heroes' rows. Deterministic: the board and the kinds decide it. */
export function formationSpots(board: Board, kinds: readonly string[], shape: Formation): At[] {
  const front = board.d - DEPLOY_ROWS;
  const ok = (u: number, v: number) => v >= front && v < board.d && standable(tileAt(board, u, v));
  // (who takes which tile of the shape: the lead's kinds the lead's tiles, the rear's the rear's, either spilling into the other's)
  const order = kinds.map((_, i) => i).sort((x, y) => RANK[roleOf(kinds[x])] - RANK[roleOf(kinds[y])] || x - y);
  const lead = [...SHAPES[shape].lead];
  const rear = [...SHAPES[shape].rear];
  const slot = new Map<number, readonly [number, number] | undefined>();
  for (const i of order.filter((i) => RANK[roleOf(kinds[i])] <= 1)) slot.set(i, lead.shift() ?? rear.shift());
  for (const i of order.filter((i) => RANK[roleOf(kinds[i])] > 1)) slot.set(i, rear.shift() ?? lead.shift());
  const tiles = [...slot.values()].filter((t): t is readonly [number, number] => !!t);
  // (the centre column that fits most; the middle first on a tie)
  const cols = [...Array(board.w).keys()].sort((x, y) => Math.abs(x - (board.w - 1) / 2) - Math.abs(y - (board.w - 1) / 2) || x - y);
  let centre = cols[0];
  let fits = -1;
  for (const c of cols) {
    const n = tiles.filter(([du, dv]) => ok(c + du, front + dv)).length;
    if (n > fits) {
      fits = n;
      centre = c;
    }
  }
  const out: At[] = new Array(kinds.length);
  const taken = new Set<number>();
  const free: At[] = [];
  for (let v = front; v < board.d; v++) for (let u = 0; u < board.w; u++) if (ok(u, v)) free.push({ u, v });
  for (const k of order) {
    const t = slot.get(k);
    let at: At | undefined = t && ok(centre + t[0], front + t[1]) && !taken.has((front + t[1]) * board.w + centre + t[0]) ? { u: centre + t[0], v: front + t[1] } : undefined;
    if (!at) {
      const want = t ? { u: centre + t[0], v: front + t[1] } : { u: centre, v: board.d - 1 };
      at = free.filter((f) => !taken.has(f.v * board.w + f.u)).sort((x, y) => Math.abs(x.u - want.u) + Math.abs(x.v - want.v) - (Math.abs(y.u - want.u) + Math.abs(y.v - want.v)) || x.v - y.v || x.u - y.u)[0];
    }
    if (!at) continue;
    taken.add(at.v * board.w + at.u);
    out[k] = at;
  }
  return out;
}

/** Whether a party of `kinds` can make `shape` on `board` (BATTLE-FEEL round 3): set out in it (`formationSpots`) and read back
 *  (`formationOf`), is it that shape? A Shield Wall needs two front-liners, a Hollow Square a back-liner, a Skirmish four heroes. Pure: no
 *  rule changes; the page says when the answer is no. */
export function shapeFits(board: Board, kinds: readonly string[], shape: Formation): boolean {
  if (!kinds.length) return false;
  const spots = formationSpots(board, kinds, shape);
  return formationOf(board.d, kinds.map((kind, i) => ({ id: i + 1, kind, u: spots[i].u, v: spots[i].v })))?.kind === shape;
}
