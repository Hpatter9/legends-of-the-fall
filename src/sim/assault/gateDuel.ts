// The Vain captain's duel at the Iron Gate (phase 3, `docs/notes/assault-3.md`; the design's 4.2): a Council captain with the Vain weakness,
// posted at the Iron Gate, calls a champion out as the first of our heroes comes within twelve tiles of his post. The challenge is open: the
// king names the champion, or refuses (and so does the clock, after twenty seconds). Auto names its strongest hero at once.
//
// - THE RING. A 5 x 5 ring is staked out on the open ground before the gate (off the board's middle: `duelRing.ts`'s ring with its own
//   middle), its stakes a solid border every walker goes round; the champion and the captain are set inside it, and anyone else standing
//   there is moved out. The rest of the battle carries on round it: nobody outside sees the two (they leave the buckets and `around`'s cut),
//   and the two see only each other. Sixty seconds.
// - THE CAPTAIN in the ring fights as he is (the hold's officers already stand at the army's share of a wave foe), and as Vain he takes a
//   tenth more there.
// - WON (the captain falls): his sworn band routs, and every hero of ours heals a fifth of its health.
// - LOST (the champion falls): the champion rises at the rally flag as any fallen hero does; the captain walks back to his post, his health
//   as it was before the ring, by the share he kept in it.
// - TIME: as lost, but the champion stands.
// - REFUSED: the captain is Mocking for the rest of the battle (+5% to his blows).
//
// Deterministic: everything is by tick and by the battle's fixed orders; no random numbers. Pure rules: no Pixi, no DOM.

import { atkOf, type Battle, type BattleEvent, type Unit } from '../battle';
import { standable, type At } from '../board';
import { DUEL_MS, inRing, RING_R } from '../duelRing';
import { VAIN_DUEL } from '../nemesisTraits';
import { occClear, occPut, type FieldState } from './field';
import { routPost } from './holdMind';
import { rebuildSectors } from './sectors';
import type { HoldState } from './holdTypes';

/** A hero this near the Iron Gate's post is called out; the challenge stands this long. */
export const DUEL_CALL = 12;
export const DUEL_OFFER_MS = 20_000;
/** The captain fights in the ring at this share of his health and attack. A run's duel cuts its nemesis (a wave's wall is built for five
 *  heroes), but the hold's officers already stand at the army's share of a wave foe (`ASSAULT.foeShare`), so here he fights as he is: the
 *  champion then wins about two in three at level 55 and three in four at 75, across forty heroes (`docs/notes/assault-3.md`). */
export const GATE_DUEL = { hp: 1, atk: 1 };
/** A duel won heals every hero of ours this share of its health; a refused captain's blows are this much harder for the battle. */
export const GATE_DUEL_HEAL = 0.2;
export const MOCKING = 1.05;

export type GateDuelOut = 'won' | 'lost' | 'timeout' | 'refused';

/** The duel at the Iron Gate (`HoldState.duel`): one a battle. */
export interface GateDuel {
  /** The post (its place in `posts`) and its captain's unit id. */
  post: number;
  captain: number;
  state: 'offered' | 'fighting' | 'over';
  /** The offer's end, then the fight's. */
  until: number;
  /** The champion's unit id. */
  hero?: number;
  /** The ring's middle and half-width; the stakes laid round it (tiles made solid for the duel, given back after). */
  mid?: At;
  r?: number;
  fence?: number[];
  /** The captain's health before the ring, and as it began in the ring. */
  was?: { hp: number; ring: number };
  out?: GateDuelOut;
}

const dist = (a: At, z: At) => Math.abs(a.u - z.u) + Math.abs(a.v - z.v);

/** The Iron Gate's post, if its captain is a Vain member of the Council, standing and not routed. */
export function vainCaptain(f: FieldState, h: HoldState): { post: number; captain: Unit } | null {
  const post = h.posts.findIndex((p) => p.def.id === 'ironGate');
  const p = h.posts[post];
  if (!p || p.council === undefined || p.mood === 'routed') return null;
  const captain = f.byId[f.groups[p.group].leader];
  if (!captain?.alive || !captain.nem?.weak?.includes('vain')) return null;
  return { post, captain };
}

/** Whether a fighter is one of the two in the ring now. */
export const inDuel = (h: HoldState | undefined, id: number): boolean => h?.duel?.state === 'fighting' && (h.duel.hero === id || h.duel.captain === id);

/** The fighters a fighter may see while a duel is fought: the two in the ring each other alone; everyone else, anyone but those two. */
export function duelSight(h: HoldState | undefined, me: Unit, units: readonly Unit[]): readonly Unit[] {
  const d = h?.duel;
  if (d?.state !== 'fighting') return units;
  if (me.id === d.hero || me.id === d.captain) return units.filter((x) => x.id === d.hero || x.id === d.captain);
  return units.filter((x) => x.id !== d.hero && x.id !== d.captain);
}

/** A blow's share from the duel: the captain's in the ring at his share (and a Mocking captain's harder all battle); a blow on a Vain captain
 *  in the ring a tenth harder. */
export function duelBlow(h: HoldState | undefined, me: Unit, to: Unit): number {
  const d = h?.duel;
  if (!d) return 1;
  let m = 1;
  if (me.id === d.captain && d.out === 'refused') m *= MOCKING;
  if (d.state === 'fighting') {
    if (me.id === d.captain) m *= GATE_DUEL.atk;
    if (to.id === d.captain) m *= 1 + VAIN_DUEL;
  }
  return m;
}

/** The duel's tick: the call as a hero comes near (Auto names its champion at once); the offer running out; the fight's end. */
export function duelTick(b: Battle, f: FieldState, h: HoldState, out: BattleEvent[]): void {
  const d = h.duel;
  if (!d) {
    const vc = vainCaptain(f, h);
    if (!vc) return;
    const home = f.groups[h.posts[vc.post].group].home;
    const near = h.platoons.some((pl) => {
      const x = f.byId[pl.heroId];
      return x.alive && dist(x, home) <= DUEL_CALL;
    });
    if (!near) return;
    h.duel = { post: vc.post, captain: vc.captain.id, state: 'offered', until: b.t + DUEL_OFFER_MS };
    h.events.push({ kind: 'duelCalled', post: vc.post, captain: vc.captain.id });
    if (h.auto) {
      const champ = autoChampion(f, h);
      if (champ !== undefined) acceptDuel(b, champ);
    }
    return;
  }
  if (d.state === 'offered') {
    if (!f.byId[d.captain]?.alive) {
      d.state = 'over';
      return;
    }
    if (b.t >= d.until) refuseDuel(b);
    return;
  }
  if (d.state !== 'fighting') return;
  const hero = f.byId[d.hero!];
  const cap = f.byId[d.captain];
  if (!cap.alive) endDuel(b, f, h, 'won', out);
  else if (!hero.alive) endDuel(b, f, h, 'lost', out);
  else if (b.t >= d.until) endDuel(b, f, h, 'timeout', out);
}

/** Auto's champion: the hero of ours standing with the most health and attack together (the first by platoon on a tie). */
export function autoChampion(f: FieldState, h: HoldState): number | undefined {
  let best: number | undefined;
  let bs = -1;
  for (const pl of h.platoons) {
    const x = f.byId[pl.heroId];
    if (!x.alive) continue;
    const s = x.hp * atkOf(x);
    if (s > bs) {
      bs = s;
      best = x.id;
    }
  }
  return best;
}

/** Where the ring is staked: the nearest spot before the Iron Gate (outside it, away from the hold's middle) whose 5 x 5 is open, level
 *  enough ground. */
export function ringSpot(b: Battle, h: HoldState, r = RING_R): At | null {
  const w = b.board.w;
  const gate = h.forts.find((x) => x.spec.kind === 'ironGate');
  if (!gate) return null;
  const gu = gate.spec.tiles.reduce((n, i) => n + (i % w), 0) / gate.spec.tiles.length;
  const gv = gate.spec.tiles.reduce((n, i) => n + Math.floor(i / w), 0) / gate.spec.tiles.length;
  // (outward from the hold's middle, along the gate's axis)
  const along = Math.abs(gu - 49.5) >= Math.abs(gv - 49.5);
  const out = along ? { u: Math.sign(gu - 49.5), v: 0 } : { u: 0, v: Math.sign(gv - 49.5) };
  const aim = { u: Math.round(gu + out.u * (r + 4)), v: Math.round(gv + out.v * (r + 4)) };
  let best: At | null = null;
  let bd = Infinity;
  for (let dv = -8; dv <= 8; dv++)
    for (let du = -8; du <= 8; du++) {
      const mid = { u: aim.u + du, v: aim.v + dv };
      if (mid.u - r - 1 < 0 || mid.v - r - 1 < 0 || mid.u + r + 1 >= w || mid.v + r + 1 >= b.board.d) continue;
      // (still outside the gate: never back through the wall)
      if ((mid.u - gu) * out.u + (mid.v - gv) * out.v < r + 2) continue;
      const h0 = b.board.tiles[mid.v * w + mid.u].h;
      let ok = true;
      for (let y = -r; y <= r && ok; y++)
        for (let x = -r; x <= r && ok; x++) {
          const t = b.board.tiles[(mid.v + y) * w + mid.u + x];
          if (!standable(t) || Math.abs(t.h - h0) > 1 || t.ladder || h.fortAt.has((mid.v + y) * w + mid.u + x)) ok = false;
        }
      const d = Math.abs(du) + Math.abs(dv);
      if (ok && d < bd) {
        bd = d;
        best = mid;
      }
    }
  return best;
}

/** Name the champion: the ring is staked, the two are set in it, and the sixty seconds begin. False when it cannot be fought now. */
export function acceptDuel(b: Battle, heroId: number): boolean {
  const f = b.field;
  const h = f?.hold;
  const d = h?.duel;
  if (!f || !h || d?.state !== 'offered' || b.phase !== 'fight') return false;
  const hero = f.byId[heroId];
  const cap = f.byId[d.captain];
  if (!hero?.alive || hero.side !== 'hero' || !h.platoons.some((p) => p.heroId === heroId) || !cap?.alive) return false;
  const mid = ringSpot(b, h);
  if (!mid) return false;
  const w = b.board.w;
  const r = RING_R;
  // (the stakes: the border round the ring, made solid where it was open ground)
  const fence: number[] = [];
  for (let y = -r - 1; y <= r + 1; y++)
    for (let x = -r - 1; x <= r + 1; x++) {
      if (Math.max(Math.abs(x), Math.abs(y)) !== r + 1) continue;
      const i = (mid.v + y) * w + mid.u + x;
      const t = b.board.tiles[i];
      if (standable(t) && !h.fortAt.has(i)) fence.push(i);
    }
  // (anyone else standing in the ring or on its stakes is moved out first)
  const ring = { mid, r: r + 1 };
  for (const x of b.units) {
    if (!x.alive || x.id === heroId || x.id === d.captain || !inRing(ring, x)) continue;
    occClear(f, x);
    place(x, outside(b, f, mid, r, { u: x.u, v: x.v }));
    occPut(f, x);
  }
  for (const i of fence) b.board.tiles[i].rock = true;
  rebuildSectors(f.sectors, b.board, fence);
  f.stats.rebuilds++;
  // (the two face each other across the ring, the champion on our side of it)
  const near = { u: mid.u + Math.sign(hero.u - mid.u || 1), v: mid.v + Math.sign(hero.v - mid.v || 0) };
  const far = { u: mid.u * 2 - near.u, v: mid.v * 2 - near.v };
  occClear(f, hero);
  occClear(f, cap);
  place(hero, near);
  place(cap, far);
  occPut(f, hero);
  occPut(f, cap);
  const share = Math.max(1, Math.round(cap.maxHp * GATE_DUEL.hp));
  d.was = { hp: cap.hp, ring: Math.min(cap.hp, share) };
  cap.hp = d.was.ring;
  const post = h.posts[d.post];
  if (post.mood === 'posted') post.mood = 'alerted';
  f.groups[post.group].awake = true;
  Object.assign(d, { state: 'fighting', hero: heroId, mid, r, fence, until: b.t + DUEL_MS });
  h.events.push({ kind: 'duelRing', up: true, tiles: [...fence], hero: heroId, captain: d.captain });
  return true;
}

/** Refuse the challenge (or let it run out): the captain is Mocking for the rest of the battle. */
export function refuseDuel(b: Battle): boolean {
  const h = b.field?.hold;
  const d = h?.duel;
  if (!h || d?.state !== 'offered') return false;
  d.state = 'over';
  d.out = 'refused';
  h.events.push({ kind: 'duelOver', out: 'refused', captain: d.captain });
  return true;
}

function endDuel(b: Battle, f: FieldState, h: HoldState, outcome: Exclude<GateDuelOut, 'refused'>, out: BattleEvent[]): void {
  const d = h.duel!;
  const cap = f.byId[d.captain];
  const tiles = d.fence ?? [];
  for (const i of tiles) delete b.board.tiles[i].rock;
  rebuildSectors(f.sectors, b.board, tiles);
  f.stats.rebuilds++;
  d.state = 'over';
  d.out = outcome;
  if (outcome === 'won') {
    routPost(f, h, h.posts[d.post]);
    for (const pl of h.platoons) {
      const x = f.byId[pl.heroId];
      if (x.alive) x.hp = Math.min(x.maxHp, x.hp + Math.round(x.maxHp * GATE_DUEL_HEAL));
    }
  } else if (cap.alive && d.was) cap.hp = Math.max(1, Math.round(d.was.hp * (cap.hp / Math.max(1, d.was.ring))));
  void out;
  h.events.push({ kind: 'duelRing', up: false, tiles: [...tiles], hero: d.hero!, captain: d.captain });
  h.events.push({ kind: 'duelOver', out: outcome, captain: d.captain, hero: d.hero });
}

/** Set a fighter on a tile at once (no step to draw). */
function place(x: Unit, at: At): void {
  x.u = at.u;
  x.v = at.v;
  x.step = undefined;
  x.swing = undefined;
}

/** A free tile nearest `to` outside the ring and its stakes. */
function outside(b: Battle, f: FieldState, mid: At, r: number, to: At): At {
  if (!inRing({ mid, r: r + 1 }, to)) return to;
  const w = b.board.w;
  for (let k = r + 2; k < r + 8; k++)
    for (let y = -k; y <= k; y++)
      for (let x = -k; x <= k; x++) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== k) continue;
        const u = mid.u + x;
        const v = mid.v + y;
        if (u < 0 || v < 0 || u >= w || v >= b.board.d) continue;
        if (standable(b.board.tiles[v * w + u]) && f.occ[v * w + u] < 0) return { u, v };
      }
  return to;
}
