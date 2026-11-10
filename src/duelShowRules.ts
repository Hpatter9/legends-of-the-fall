// DUEL-SHOW (docs/notes/duel-show.md): the duel made a show, the owner's ask: "they both walk into the ring from the outside, the rest of the
// party and enemies watch from just outside and cheer it on. 1 battle bar that fills green if the hero is winning and red the other way if
// the enemy is winning". These are its rules, pure (no Pixi, no DOM) so the tests run them; `duelShow.ts` draws them. None of it changes the
// fight: the crowd is not in the battle (`startDuel` leaves only the two), and the walk-in plays while the fight is held, before its first
// tick.
//
// - The crowd: where each of the rest of the party and the rest of the wave stands, just outside the ring on its own side, facing in.
// - The walk-in: from where each duellist comes, and how far along at a moment.
// - The bar: one tug of war, its meeting point from each side's share of health left, and what counts as a big swing.
// - The crowd's moods: who cheers and who groans at a blow, and at the end.

import { standable, tileAt, type At, type Board } from './sim/board';

/** The ring as the show sees it: its middle and half-width, and where the two start (`ringFor`): the champion on the near side (+v). */
export interface RingAt {
  mid: At;
  r: number;
}

/** A place in the crowd: its tile, and the way it faces (the sim's `Unit.facing`: 0 faces +u, 1 +v, 2 -u, 3 -v). */
export interface CrowdSpot {
  u: number;
  v: number;
  facing: 0 | 1 | 2 | 3;
}

/** The facings the sim uses: +u is 0, +v is 1 (down the board, towards the heroes' rows), -u is 2, -v is 3. */
const FACE_PLUS_U = 0;
const FACE_PLUS_V = 1;
const FACE_MINUS_U = 2;
const FACE_MINUS_V = 3;

/**
 * Where the crowd stands: `heroes` places on the champion's side (the ring's near side, +v) and `foes` on the nemesis's (-v), each just
 * outside the ring and facing in. The row just past the ring's edge first, from its middle outwards (the middle, then one either side, the
 * near-left first), then the row past that, then the ring's two flanks on that side's half. Only ground a fighter can stand on, never inside
 * the ring, never a tile taken twice. Fewer places than asked when the board runs out. The same every time for the same board. `lanes` are
 * the columns the two walk in along (the champion's on its side, the nemesis's on the other): the crowd leaves them open.
 */
export function crowdSpots(board: Board, ring: RingAt, heroes: number, foes: number, lanes: { heroes?: number; foes?: number } = {}): { heroes: CrowdSpot[]; foes: CrowdSpot[] } {
  const taken = new Set<number>();
  const inRing = (u: number, v: number) => Math.abs(u - ring.mid.u) <= ring.r && Math.abs(v - ring.mid.v) <= ring.r;
  const free = (u: number, v: number) => !inRing(u, v) && !taken.has(v * board.w + u) && standable(tileAt(board, u, v));
  const side = (n: number, dir: 1 | -1, lane?: number): CrowdSpot[] => {
    const out: CrowdSpot[] = [];
    const face = (dir === 1 ? FACE_MINUS_V : FACE_PLUS_V) as CrowdSpot['facing'];
    const take = (u: number, v: number, facing: CrowdSpot['facing']) => {
      if (out.length >= n || !free(u, v)) return;
      taken.add(v * board.w + u);
      out.push({ u, v, facing });
    };
    // (the order along a row: the middle, then outwards, one either side in turn)
    const along: number[] = [0];
    for (let k = 1; k <= ring.r + 2; k++) along.push(-k, k);
    // (the rows past the ring's edge on this side, then the flanks: the columns past each side of the ring, on this side's half)
    for (const step of [1, 2]) for (const du of along) if (ring.mid.u + du !== lane) take(ring.mid.u + du, ring.mid.v + dir * (ring.r + step), face);
    for (let dv = ring.r; dv >= 1; dv--)
      for (const [du, f] of [[-(ring.r + 1), FACE_PLUS_U], [ring.r + 1, FACE_MINUS_U]] as const) take(ring.mid.u + du, ring.mid.v + dir * dv, f);
    for (let dv = ring.r; dv >= 1; dv--)
      for (const [du, f] of [[-(ring.r + 2), FACE_PLUS_U], [ring.r + 2, FACE_MINUS_U]] as const) take(ring.mid.u + du, ring.mid.v + dir * dv, f);
    return out;
  };
  // (the champion's side first, so a board short of room shorts the foes the same each time)
  const h = side(heroes, 1, lanes.heroes);
  const f = side(foes, -1, lanes.foes);
  return { heroes: h, foes: f };
}

// ---- the walk-in ---------------------------------------------------------------------------------------------------------------

/** The walk-in's timing (real ms): each walks in, then a beat (the two names, a horn) before the first blow. Reduced motion: no walk, only
 *  the beat, shorter. */
export const WALK_IN = { WALK_MS: 1700, BEAT_MS: 1100, STILL_BEAT_MS: 900, FROM: 3 };

/** From where a duellist walks in: `FROM` tiles back from its start, out past the ring's edge on its own side (the champion from +v, the
 *  nemesis from -v), along its start's column. */
export const walkFrom = (start: At, champion: boolean): { u: number; v: number } => ({ u: start.u, v: start.v + (champion ? 1 : -1) * WALK_IN.FROM });

/** How far along the walk-in is at `ms` (0 to 1, eased to a stop), whether the beat is on, and whether it is over. */
export function walkAt(ms: number, reduced = false): { p: number; beat: boolean; done: boolean } {
  if (reduced) return { p: 1, beat: ms < WALK_IN.STILL_BEAT_MS, done: ms >= WALK_IN.STILL_BEAT_MS };
  const x = Math.min(1, Math.max(0, ms / WALK_IN.WALK_MS));
  // (an ease out: they slow to a stop facing each other)
  const p = 1 - (1 - x) * (1 - x);
  const done = ms >= WALK_IN.WALK_MS + WALK_IN.BEAT_MS;
  return { p, beat: ms >= WALK_IN.WALK_MS && !done, done };
}

// ---- the bar ---------------------------------------------------------------------------------------------------------------------

/** A big swing: the meeting point moves this far (a share of the bar) within `SWING_MS`. */
export const TUG = { SWING: 0.08, SWING_MS: 1200 };

/**
 * The tug of war's meeting point, 0 to 1 from the champion's end: green fills from the champion's end up to it, red from the nemesis's end
 * down to it. It is half and half when the two have the same share of health left, all green when the nemesis is down and the champion
 * stands, all red the other way. A shield counts as health.
 */
export function tugPoint(hero: { hp: number; maxHp: number }, nem: { hp: number; maxHp: number }): number {
  const share = (x: { hp: number; maxHp: number }) => Math.max(0, Math.min(1, x.hp / Math.max(1, x.maxHp)));
  const h = share(hero);
  const n = share(nem);
  if (h + n <= 0) return 0.5;
  // (each side's share of what is left between them: the bar reads who is ahead, and by how much)
  return h / (h + n);
}

/** Who is ahead on the bar: the champion, the nemesis, or neither (within a twentieth of even). */
export const tugLeader = (p: number): 'hero' | 'nem' | 'even' => (p > 0.525 ? 'hero' : p < 0.475 ? 'nem' : 'even');

/** Whether the bar has swung far since a moment ago: `then` is the point `SWING_MS` ago or less. */
export const bigSwing = (then: number, now: number): boolean => Math.abs(now - then) >= TUG.SWING;

// ---- the crowd's moods -----------------------------------------------------------------------------------------------------------

export type Mood = 'watch' | 'cheer' | 'groan' | 'erupt' | 'slump';

/** A blow this big (a share of the struck one's health) gets a cheer from the striker's side and a groan from the other. */
export const BIG_HIT = 0.08;

/** The two sides' moods at a blow in the ring (`by` struck `to` for `dmg`; `champion` is the champion's unit id), or null for a small one. */
export function hitMoods(hit: { by: number; to: number; dmg: number }, champion: number, struck: { maxHp: number }): { heroes: Mood; foes: Mood } | null {
  if (hit.dmg < BIG_HIT * Math.max(1, struck.maxHp)) return null;
  const heroesStruck = hit.to === champion;
  return heroesStruck ? { heroes: 'groan', foes: 'cheer' } : { heroes: 'cheer', foes: 'groan' };
}

/** The two sides' moods at the end: the winner's side erupts, the loser's slumps. Out of time, the nemesis has slipped away: its side cheers
 *  it off, the party groans. */
export function endMoods(out: 'won' | 'lost' | 'timeout'): { heroes: Mood; foes: Mood } {
  if (out === 'won') return { heroes: 'erupt', foes: 'slump' };
  if (out === 'lost') return { heroes: 'slump', foes: 'erupt' };
  return { heroes: 'groan', foes: 'cheer' };
}

/** How long (real ms) the end's moods play before the outcome comes up: the winner's side erupting, the loser's slumping. */
export const END_SHOW_MS = 1800;

/** A crowd member's hop (px up) at `ms` in a mood: watchers bob now and then, cheerers jump, an eruption jumps highest, a slump sinks. Each
 *  in its own time (`seed`), so the crowd never jumps as one. Still for reduced motion. */
export function hopOf(mood: Mood, ms: number, seed: number, reduced = false): number {
  if (reduced) return mood === 'slump' ? -2 : 0;
  const phase = ms / 1000 + (seed % 97) / 97;
  const jump = (rate: number, h: number) => Math.max(0, Math.sin(phase * Math.PI * 2 * rate)) * h;
  switch (mood) {
    case 'watch':
      return Math.max(0, Math.sin(phase * Math.PI * 2 * 0.35) - 0.85) * 20;
    case 'cheer':
      return jump(2.2, 6);
    case 'erupt':
      return jump(2.6, 10);
    case 'groan':
      return 0;
    case 'slump':
      return -2;
  }
}

/** The crowd's short shouts: a cheer for a good blow, a groan for a bad one, and the end's. Kept short so a bubble reads at a glance. */
export const SHOUTS: Readonly<Record<'cheer' | 'groan' | 'erupt' | 'slump', readonly string[]>> = {
  cheer: ['Yes!', 'Again!', 'Hit it!', 'That’s it!', 'Ha!', 'Go on!'],
  groan: ['Ooh!', 'No!', 'Get up!', 'Ugh!', 'Watch it!'],
  erupt: ['Victory!', 'They did it!', 'Huzzah!', 'Champion!'],
  slump: ['No…', 'It can’t be…', 'Fallen…'],
};

/** A shout for a mood, picked by a hash of the moment, so a replay says the same. */
export function shoutFor(mood: 'cheer' | 'groan' | 'erupt' | 'slump', seed: number): string {
  const list = SHOUTS[mood];
  let h = 0x811c9dc5;
  for (const x of [seed, list.length]) h = Math.imul(h ^ (x | 0), 0x01000193) >>> 0;
  return list[h % list.length];
}

/** The least time (real ms) between two shouts from the crowd. */
export const SHOUT_GAP_MS = 2600;
