// The ultimate's showcase (ULT-SHOW, docs/notes/ult-showcase-design.md): the long version of an ultimate's moment, where the hero is seen to do
// what its ultimate's words say (Ayame teleports behind each foe in a puff of smoke and cuts it down; the Wizard calls the meteors down out of a
// darkened sky; the Beastmaster's wolves bound in from the edge of the field). Pure: no DOM, no Pixi, so the tests read it; `ultShow.ts` plays it.
//
// It is presentation only. The ultimate has already been cast by the sim on the tick it fired, exactly as in the short version; the fight is
// held while the showcase plays, and the showcase reads that tick's events (the blinks, the blows, the meteors' aims, the fighters called up)
// to stage the real sprites: where the caster stood at each hop, which foe was cut and when. So the fight comes out exactly as it would have.
//
// When it plays: the full ultimate scenes on, Auto off, Shorter ultimates off, and the hero's ultimate has a showcase; then the hero's first
// use, and every Nth use after it (the setting, 10 by default; 0: the first only). The uses counted are the full moments the player saw,
// per hero kind, kept in the save (`Meta.ultSeen`).
//
// The x1 rule (the owner's): an ultimate's full moment, its showcase and an Eidolon's full call always play at x1 speed, whatever the fight's
// speed; the short versions keep the fight's speed (`momentSpeed`).

import type { BattleEvent, Unit } from './sim/battle';
import type { Element } from './render/fxRules';

/** How a showcase is staged (the staging is shared; each hero's beats and look are its own). */
export type ShowStyle = 'blinks' | 'sky' | 'pack' | 'line' | 'leap' | 'blows' | 'hooks';

export interface Showcase {
  style: ShowStyle;
  /** The colour of its effects (the pack's element). */
  el: Element;
  /** What the player sees, in the game's words (the design lists it). */
  line: string;
  /** line: the foes it passed split only once it has sheathed (the one cut), rather than as it passes. */
  after?: boolean;
  /** line: ms a run takes (a dash is a flash; a ride or a charge is seen), the wind-up before it and the sheathe after it. */
  run?: number;
  wind?: number;
  sheathe?: number;
}

/** The heroes whose ultimate has a showcase: the pilot (Ayame, the Wizard, the Beastmaster) and batch 1 (the blades that move). */
export const SHOWCASES: Record<string, Showcase> = {
  kunoichi: { style: 'blinks', el: 'dark', line: 'She vanishes in a puff of smoke, appears behind each foe in turn and cuts it down, then stands where the last fell' },
  wizard: { style: 'sky', el: 'fire', line: 'He raises his staff, the sky darkens, a burning circle marks each crowd and the meteors come down out of the clouds' },
  beastmaster: { style: 'pack', el: 'forest', line: 'He sounds his horn and the wolves bound in from the edge of the field, one after another, to stand at his side' },
  mercenary: { style: 'blinks', el: 'blood', line: 'He steps out of nowhere beside each of the three hardest hitters in turn and cuts each hard' },
  arcBlade: { style: 'blinks', el: 'lightning', line: 'He becomes lightning: a bolt that leaps from foe to foe, cutting each, then snaps back to where he started' },
  samurai: { style: 'line', el: 'light', after: true, run: 160, wind: 1200, sheathe: 900, line: 'He crouches, the field goes still, one flash along the line; he sheathes his sword, and every foe he passed splits' },
  lancer: { style: 'line', el: 'wind', run: 1100, wind: 1000, line: 'He rides the whole line at a gallop, each foe flung aside as he passes' },
  minotaur: { style: 'line', el: 'earth', run: 420, line: 'He paws the ground and charges, again and again, each foe in his way thrown into the air' },
  barbarian: { style: 'leap', el: 'blood', line: 'He leaps high over the field and comes down on the thickest crowd; the ground cracks and they are thrown back' },
  ninjaMonk: { style: 'blows', el: 'wind', line: 'A blur of fists on each foe in turn, blow after blow, the last throwing it away' },
  buccaneer: { style: 'hooks', el: 'dark', line: 'He throws out his hooks and reels the foes in one by one, cutting each as it lands at his feet' },
};

export const hasShowcase = (kind: string): boolean => kind in SHOWCASES;

/** The setting's choices for how often the long version comes back (0: the first use only). */
export const EVERY_CHOICES = [0, 5, 10, 20] as const;
export const DEFAULT_EVERY = 10;

/** Whether this use plays the long version: `seen` full moments of this hero's ultimate already played (0: this is the first), `every` the
 *  setting. The first use always does; then every `every`th after it (with 10: the 1st, 11th, 21st...). */
export const showDue = (seen: number, every: number): boolean => seen <= 0 || (every > 0 && seen % every === 0);

/** The save's count of full moments seen of a hero kind's ultimate, and one more (`Meta.ultSeen`). */
export const seenOf = (m: { ultSeen?: Record<string, number> }, kind: string): number => m.ultSeen?.[kind] ?? 0;
export function noteSeen(m: { ultSeen?: Record<string, number> }, kind: string): void {
  (m.ultSeen ??= {})[kind] = seenOf(m, kind) + 1;
}

/** Whether an ultimate that just fired gets its showcase. */
export function wantsShow(kind: string, o: { full: boolean; short: boolean; seen: number; every: number }): boolean {
  return o.full && !o.short && hasShowcase(kind) && showDue(o.seen, o.every);
}

/** The fight's speed while a moment plays (`moment`: an ultimate's full moment or showcase, or an Eidolon's full call, is on): x1 then. */
export const momentSpeed = (speed: number, moment: boolean): number => (moment ? 1 : speed);
/* ------------------------------------------------------------------ what the cast did */

export interface At {
  u: number;
  v: number;
}
/** One hop of a teleport slash: from, to, and the foe it cut (if any). */
export interface Hop {
  from: At;
  to: At;
  struck?: number;
}
/** What the cast's tick shows the caster did. */
export interface Cast {
  caster: number;
  /** Where it stood when it cast (its tile before any hop, run or leap). */
  start: At;
  hops: Hop[];
  /** Its runs in a line (a dash, a ride, a charge), in order. */
  dashes: { from: At; to: At }[];
  /** Its leap. */
  leap?: { from: At; land: At };
  /** The tiles its salvo is aimed at (each once, in order). */
  aims: At[];
  /** The fighters it called up, and where they stand. */
  born: { id: number; at: At }[];
  /** Every foe it struck on the tick, in the order first struck; the blows each took; the run each was struck on (0 before any). */
  struck: number[];
  blows: Map<number, number>;
  run: Map<number, number>;
  /** Where each foe it struck stands now (after the tick), and where it stood before, when it was moved (thrown, shoved, hooked in). */
  tiles: Map<number, At>;
  moved: Map<number, At>;
  /** The foes it hooked in (an arc to each). */
  hooks: number[];
}

/** Read a cast from its tick's events (`events`), the caster (`me`, as it stands after the tick), the fighters that appeared on it, where a
 *  fighter stands (`tileOf`) and where one stood before the tick when the sim moved it without an event that says so (`originOf`: a hook's
 *  pull). */
export function readCast(
  me: Pick<Unit, 'id' | 'u' | 'v'>,
  events: readonly BattleEvent[],
  born: readonly Pick<Unit, 'id' | 'owner' | 'u' | 'v'>[] = [],
  tileOf: (id: number) => At | undefined = () => undefined,
  originOf: (id: number) => At | undefined = () => undefined,
): Cast {
  const hops: Hop[] = [];
  const dashes: { from: At; to: At }[] = [];
  const aims: At[] = [];
  const struck: number[] = [];
  const blows = new Map<number, number>();
  const run = new Map<number, number>();
  const moved = new Map<number, At>();
  const arcs: number[] = [];
  let leap: Cast['leap'];
  for (const e of events) {
    if (e.kind === 'blink' && e.by === me.id) hops.push({ from: { ...e.from }, to: { ...e.to } });
    else if (e.kind === 'dash' && e.by === me.id) dashes.push({ from: { ...e.from }, to: { ...e.to } });
    else if (e.kind === 'launch' && e.to === me.id) leap = { from: { ...e.from }, land: { ...e.land } };
    else if (e.kind === 'launch' && !moved.has(e.to)) moved.set(e.to, { ...e.from });
    else if (e.kind === 'arc' && e.from === me.id) arcs.push(e.to);
    else if (e.kind === 'hit' && e.by === me.id && e.to !== me.id && e.src === 'skill') {
      const h = hops[hops.length - 1];
      if (h && h.struck === undefined) h.struck = e.to;
      if (!struck.includes(e.to)) {
        struck.push(e.to);
        run.set(e.to, Math.max(0, dashes.length - 1));
      }
      blows.set(e.to, (blows.get(e.to) ?? 0) + 1);
    } else if (e.kind === 'area' && e.by === me.id && !aims.some((a) => a.u === e.u && a.v === e.v)) aims.push({ u: e.u, v: e.v });
  }
  const tiles = new Map<number, At>();
  for (const id of struck) {
    const at = tileOf(id);
    if (at) tiles.set(id, { u: at.u, v: at.v });
  }
  // (a foe moved with no launch to say from where (shoved aside, hooked in): where it stood before the tick, from the page)
  for (const id of struck) {
    const o = originOf(id);
    const now = tiles.get(id);
    if (!moved.has(id) && o && now && (o.u !== now.u || o.v !== now.v)) moved.set(id, { u: o.u, v: o.v });
  }
  const hooks = arcs.filter((id) => moved.has(id) && struck.includes(id));
  const start = hops[0]?.from ?? dashes[0]?.from ?? leap?.from ?? { u: me.u, v: me.v };
  return { caster: me.id, start, hops, dashes, leap, aims, born: born.filter((u) => u.owner === me.id).map((u) => ({ id: u.id, at: { u: u.u, v: u.v } })), struck, blows, run, tiles, moved, hooks };
}

/* ------------------------------------------------------------------ the plan: a track of keys for each fighter it stages */

/** A sprite row the stage may pose a fighter in. */
export type PoseRow = 'idle' | 'walk' | 'attack' | 'attack2' | 'hurt';

/** A key on a fighter's track: from `at` ms it stands on `tile` (and `off` world px from it), in `row` (from `p0` to `p1` of the way through it
 *  by the next key, or `cycle` times round it), seen as `alpha`, facing `look`. `glide`: it moves to the next key's place by then, `arc` px up
 *  at the middle; `fade`: its alpha eases to the next key's. */
export interface Key {
  at: number;
  tile: At;
  off?: { dx: number; dy: number };
  alpha?: number;
  row?: PoseRow;
  p0?: number;
  p1?: number;
  cycle?: number;
  look?: At;
  glide?: boolean;
  arc?: number;
  fade?: boolean;
}

/** A fighter's pose at a moment: on `at` (+ `off`), or `k` of the way from there to `to`, `lift` px up; seen as `alpha`, in a row `p` through it. */
export interface Pose {
  at: At;
  off?: { dx: number; dy: number };
  to?: { at: At; off?: { dx: number; dy: number } };
  k?: number;
  lift?: number;
  alpha: number;
  row: PoseRow;
  p: number;
  look?: At;
}

/** A one-off beat: an effect and its sound at a time (ms into the showcase). `where` a tile, `to` a second tile, `foe` a fighter. */
export interface Beat {
  at: number;
  kind: 'vanish' | 'appear' | 'cut' | 'gather' | 'mark' | 'sky' | 'call' | 'land' | 'finish' | 'dash' | 'crash' | 'blow' | 'hook';
  where: At;
  to?: At;
  foe?: number;
  /** Several tiles at once (the sky over each mark). */
  all?: At[];
}

export interface ShowPlan {
  style: ShowStyle;
  el: Element;
  /** How long it plays (ms, real time: the x1 rule). */
  ms: number;
  beats: Beat[];
  tracks: Map<number, Key[]>;
  cast: Cast;
  /** How far the camera leans in on the caster, and until when (ms; after it, the held view). */
  zoom: number;
  followMs: number;
}

/** The timings (ms). A showcase runs 4 to 6 s with the opening before it and the fade after (the owner's ask). */
export const SHOW = {
  /** blinks: a beat before the first vanish, each hop's length, and the vanish, gone, appear and cut within a hop; the pose held after. */
  LEAD: 250,
  HOP: 620,
  GONE_AT: 110,
  APPEAR_AT: 200,
  CUT_AT: 330,
  CUT_END: 470,
  OUTRO: 550,
  /** sky: the caster raising the staff, each crowd's mark, the sky after the last mark, and the tail. */
  RAISE: 700,
  MARK: 400,
  SKY: 250,
  SKY_TAIL: 650,
  /** pack: the call, each beast's arrival in turn and its run, and the tail; how far off its tile a beast starts its run (world px). */
  CALL: 800,
  BEAST: 420,
  RUN: 520,
  PACK_TAIL: 450,
  RUN_FROM: 230,
  /** line: the wind-up, the pause after each run, the sheathe before the one cut's foes split, between their splits, and the tail. */
  WIND: 700,
  PAUSE: 260,
  SHEATHE: 520,
  SPLIT: 140,
  LINE_TAIL: 500,
  /** leap: the crouch, the flight and its height (px), and the tail after the crash. */
  CROUCH: 700,
  FLY: 1000,
  HIGH: 95,
  LEAP_TAIL: 1000,
  /** blows: before the first foe, each foe's flurry, the gap to the next, the throw, and the tail. */
  FLURRY_LEAD: 300,
  FLURRY: 620,
  FLURRY_GAP: 160,
  THROW: 420,
  BLOWS_TAIL: 350,
  /** hooks: before the first, each hook's throw, pull and cut, between hooks, and the tail. */
  HOOK_LEAD: 300,
  HOOK_FLY: 260,
  HOOK_PULL: 280,
  HOOK_CUT: 120,
  HOOK_GAP: 700,
  HOOK_TAIL: 450,
  /** A foe's flinch. */
  FLINCH: 240,
  /** The shortest a showcase plays (its last pose held), so with the opening and the fade it is never under 4 s; and the most a chain of hops
   *  takes, its hops quickened to fit. */
  MIN: 2500,
  HOPS_MAX: 2500,
  HOP_MIN: 480,
};

/** The plan of a showcase for a cast, or null when the cast gives it nothing to show (the short version plays then). */
export function planShow(kind: string, cast: Cast): ShowPlan | null {
  const sc = SHOWCASES[kind];
  if (!sc) return null;
  const b = new Builder(sc, cast);
  const ok =
    sc.style === 'blinks' ? b.blinks()
    : sc.style === 'sky' ? b.sky()
    : sc.style === 'pack' ? b.pack()
    : sc.style === 'line' ? b.line()
    : sc.style === 'leap' ? b.leapIn()
    : sc.style === 'blows' ? b.flurries()
    : b.hookIn();
  // (the cast had nothing of its style's shape (a charge with a foe already beside it): its blows on each foe it struck, in turn; every style
  // checks its shape before it adds a key, so the plan is still empty here)
  if (!ok && !b.flurries()) return null;
  b.plan.ms = Math.max(b.plan.ms, SHOW.MIN);
  return b.plan;
}

/** The poses of the fighters the showcase stages at `t` ms into it: the page draws them so, over what the sim says, until it ends. */
export function posesAt(plan: ShowPlan, t: number): Map<number, Pose> {
  const out = new Map<number, Pose>();
  for (const [id, keys] of plan.tracks) if (keys.length) out.set(id, poseOn(keys, t));
  return out;
}

function poseOn(keys: readonly Key[], t: number): Pose {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].at <= t) i++;
  const k = keys[i];
  const next = keys[i + 1];
  const f = next ? clamp01((t - k.at) / Math.max(1, next.at - k.at)) : 1;
  const row = k.row ?? 'idle';
  const p = k.cycle ? (f * k.cycle) % 1 : (k.p0 ?? 0) + ((k.p1 ?? k.p0 ?? 0) - (k.p0 ?? 0)) * f;
  const alpha = k.fade && next ? (k.alpha ?? 1) + ((next.alpha ?? 1) - (k.alpha ?? 1)) * f : k.alpha ?? 1;
  const pose: Pose = { at: k.tile, alpha, row, p, ...(k.off ? { off: k.off } : {}), ...(k.look ? { look: k.look } : {}) };
  if (k.glide && next) {
    pose.to = { at: next.tile, ...(next.off ? { off: next.off } : {}) };
    pose.k = easeInOut(f);
    if (k.arc) pose.lift = Math.sin(Math.PI * f) * k.arc;
  }
  return pose;
}

const same = (a: At, b: At): boolean => a.u === b.u && a.v === b.v;

class Builder {
  plan: ShowPlan;
  constructor(private sc: Showcase, private c: Cast) {
    this.plan = { style: sc.style, el: sc.el, ms: 0, beats: [], tracks: new Map(), cast: c, zoom: 1.6, followMs: Infinity };
  }
  private key(id: number, k: Key): void {
    const t = this.plan.tracks.get(id) ?? [];
    t.push(k);
    this.plan.tracks.set(id, t);
  }
  private beat(b: Beat): void {
    this.plan.beats.push(b);
  }
  /** A foe stands where it stood (facing `look`) until `at`, reels, and is thrown to where the sim put it when it was moved. */
  private foe(id: number, at: number, look: At, throwMs = 0): void {
    const now = this.c.tiles.get(id);
    if (!now || this.plan.tracks.has(id)) return;
    const was = this.c.moved.get(id) ?? now;
    this.key(id, { at: 0, tile: was, look });
    const moves = !same(was, now);
    this.key(id, { at, tile: was, row: 'hurt', p0: 0, p1: 1, look, ...(moves ? { glide: true, arc: throwMs > 300 ? 46 : 10 } : {}) });
    this.key(id, { at: at + Math.max(SHOW.FLINCH, moves ? throwMs || SHOW.FLINCH : 0), tile: now, row: 'hurt', p0: 1, look });
  }

  blinks(): boolean {
    const c = this.c;
    if (!c.hops.length) return false;
    this.key(c.caster, { at: 0, tile: c.start, look: c.hops[0].to });
    const hop = Math.max(SHOW.HOP_MIN, Math.min(SHOW.HOP, SHOW.HOPS_MAX / c.hops.length));
    c.hops.forEach((h, i) => {
      const s = SHOW.LEAD + i * hop;
      const foeAt = h.struck !== undefined ? c.moved.get(h.struck) ?? c.tiles.get(h.struck) ?? h.to : h.to;
      this.key(c.caster, { at: s, tile: h.from, fade: true, look: h.to });
      this.key(c.caster, { at: s + SHOW.GONE_AT, tile: h.to, alpha: 0 });
      this.key(c.caster, { at: s + SHOW.APPEAR_AT, tile: h.to, row: 'attack', p0: 0, p1: 1, look: foeAt });
      this.key(c.caster, { at: s + SHOW.CUT_END, tile: h.to, row: 'attack', p0: 1, look: foeAt });
      this.beat({ at: s, kind: 'vanish', where: h.from });
      this.beat({ at: s + SHOW.APPEAR_AT, kind: 'appear', where: h.to });
      if (h.struck !== undefined) {
        this.beat({ at: s + SHOW.CUT_AT, kind: 'cut', where: h.to, foe: h.struck });
        this.foe(h.struck, s + SHOW.CUT_AT, h.to);
      }
    });
    const end = SHOW.LEAD + c.hops.length * hop;
    const last = c.hops[c.hops.length - 1];
    this.key(c.caster, { at: end, tile: last.to, look: last.struck !== undefined ? c.tiles.get(last.struck) : undefined });
    this.beat({ at: end, kind: 'finish', where: last.to });
    this.plan.ms = end + SHOW.OUTRO;
    return true;
  }

  sky(): boolean {
    const c = this.c;
    if (!c.aims.length) return false;
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack2', p0: 0, p1: 0.6, look: c.aims[0] });
    this.key(c.caster, { at: SHOW.RAISE, tile: c.start, row: 'attack2', p0: 0.6, look: c.aims[0] });
    this.beat({ at: 80, kind: 'gather', where: c.start });
    c.aims.forEach((a, i) => this.beat({ at: SHOW.RAISE + i * SHOW.MARK, kind: 'mark', where: a }));
    const sky = SHOW.RAISE + c.aims.length * SHOW.MARK + SHOW.SKY;
    this.beat({ at: sky, kind: 'sky', where: c.aims[0], all: c.aims });
    this.plan.ms = sky + SHOW.SKY_TAIL;
    this.plan.zoom = 1.5;
    this.plan.followMs = SHOW.RAISE;
    return true;
  }

  pack(): boolean {
    const c = this.c;
    if (!c.born.length) return false;
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack2', p0: 0, p1: 1, look: c.born[0].at });
    this.key(c.caster, { at: SHOW.CALL, tile: c.start, row: 'attack2', p0: 1, look: c.born[0].at });
    this.beat({ at: 60, kind: 'call', where: c.start });
    c.born.forEach((w, i) => {
      const s = SHOW.CALL + i * SHOW.BEAST;
      const side = runSide(c.start, w.at);
      const off = { dx: side * SHOW.RUN_FROM, dy: -SHOW.RUN_FROM * 0.35 };
      this.key(w.id, { at: 0, tile: w.at, alpha: 0 });
      this.key(w.id, { at: s, tile: w.at, off, alpha: 0, row: 'walk', cycle: 3, glide: true, fade: true });
      this.key(w.id, { at: s + SHOW.RUN, tile: w.at, look: c.start });
      this.beat({ at: s + SHOW.RUN, kind: 'land', where: w.at, foe: w.id });
    });
    const last = SHOW.CALL + (c.born.length - 1) * SHOW.BEAST + SHOW.RUN;
    this.beat({ at: last + 80, kind: 'finish', where: c.start });
    this.plan.ms = last + SHOW.PACK_TAIL;
    return true;
  }

  line(): boolean {
    const c = this.c;
    if (!c.dashes.length) return false;
    const run = this.sc.run ?? 300;
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack', p0: 0, p1: 0.25, look: c.dashes[0].to });
    this.beat({ at: 80, kind: 'gather', where: c.start });
    let s = this.sc.wind ?? SHOW.WIND;
    const ends: number[] = [];
    c.dashes.forEach((d) => {
      this.key(c.caster, { at: s, tile: d.from, row: 'walk', cycle: Math.max(1, Math.round(run / 140)), glide: true, look: d.to });
      this.key(c.caster, { at: s + run, tile: d.to, row: 'attack', p0: 0.5, p1: 1, look: d.to });
      this.beat({ at: s, kind: 'dash', where: d.from, to: d.to });
      ends.push(s);
      s += run + SHOW.PAUSE;
    });
    // (the one cut: they split in turn once he has sheathed; else each as he passes it, or as the charge reaches it)
    const last = c.dashes[c.dashes.length - 1];
    const sheathed = s - SHOW.PAUSE + (this.sc.sheathe ?? SHOW.SHEATHE);
    c.struck.forEach((id, i) => {
      const j = Math.min(c.dashes.length - 1, c.run.get(id) ?? 0);
      const d = c.dashes[j];
      const at = c.moved.get(id) ?? c.tiles.get(id);
      if (!at) return;
      const when = this.sc.after ? sheathed + i * SHOW.SPLIT : ends[j] + run * along(d.from, d.to, at);
      this.beat({ at: when, kind: 'cut', where: d.from, to: d.to, foe: id });
      this.foe(id, when, d.from, SHOW.THROW);
    });
    const done = this.sc.after ? sheathed + c.struck.length * SHOW.SPLIT : s;
    this.key(c.caster, { at: s - SHOW.PAUSE + 200, tile: last.to, look: last.to });
    this.beat({ at: done, kind: 'finish', where: last.to });
    this.plan.ms = done + SHOW.LINE_TAIL;
    this.plan.zoom = 1.4;
    return true;
  }

  leapIn(): boolean {
    const c = this.c;
    const l = c.leap;
    if (!l) return false;
    const land = SHOW.CROUCH + SHOW.FLY;
    this.key(c.caster, { at: 0, tile: l.from, row: 'attack', p0: 0, p1: 0.2, look: l.land });
    this.key(c.caster, { at: SHOW.CROUCH, tile: l.from, row: 'attack', p0: 0.2, p1: 0.5, glide: true, arc: SHOW.HIGH, look: l.land });
    this.key(c.caster, { at: land, tile: l.land, row: 'attack', p0: 0.6, p1: 1, look: l.land });
    this.key(c.caster, { at: land + 300, tile: l.land });
    this.beat({ at: 60, kind: 'gather', where: l.from });
    this.beat({ at: SHOW.CROUCH, kind: 'dash', where: l.from, to: l.land });
    this.beat({ at: land, kind: 'crash', where: l.land });
    for (const id of c.struck) this.foe(id, land, l.land, SHOW.THROW);
    this.plan.ms = land + SHOW.LEAP_TAIL;
    this.plan.zoom = 1.3;
    return true;
  }

  flurries(): boolean {
    const c = this.c;
    if (!c.struck.length) return false;
    let s = SHOW.FLURRY_LEAD;
    this.key(c.caster, { at: 0, tile: c.start, look: c.tiles.get(c.struck[0]) });
    this.beat({ at: 60, kind: 'gather', where: c.start });
    for (const id of c.struck) {
      const n = Math.max(1, c.blows.get(id) ?? 1);
      const at = c.moved.get(id) ?? c.tiles.get(id) ?? c.start;
      this.key(c.caster, { at: s, tile: c.start, row: 'attack', cycle: n, look: at });
      for (let b = 0; b < n; b++) this.beat({ at: s + (b + 0.6) * (SHOW.FLURRY / n), kind: b === n - 1 ? 'cut' : 'blow', where: c.start, foe: id });
      // (the foe reels from the first blow, and the last throws it)
      const now = c.tiles.get(id);
      if (now && !this.plan.tracks.has(id)) {
        this.key(id, { at: 0, tile: at, look: c.start });
        this.key(id, { at: s + 0.6 * (SHOW.FLURRY / n), tile: at, row: 'hurt', cycle: n, look: c.start });
        this.key(id, { at: s + SHOW.FLURRY, tile: at, row: 'hurt', p0: 1, look: c.start, ...(same(at, now) ? {} : { glide: true, arc: 40 }) });
        this.key(id, { at: s + SHOW.FLURRY + SHOW.THROW, tile: now, row: 'hurt', p0: 1, look: c.start });
      }
      this.key(c.caster, { at: s + SHOW.FLURRY, tile: c.start, row: 'attack', p0: 1, look: at });
      s += SHOW.FLURRY + SHOW.FLURRY_GAP;
    }
    this.key(c.caster, { at: s, tile: c.start });
    this.plan.ms = s + SHOW.BLOWS_TAIL;
    this.plan.zoom = 1.5;
    return true;
  }

  hookIn(): boolean {
    const c = this.c;
    if (!c.hooks.length) return false;
    let s = SHOW.HOOK_LEAD;
    this.key(c.caster, { at: 0, tile: c.start, look: c.moved.get(c.hooks[0]) });
    for (const id of c.hooks) {
      const was = c.moved.get(id)!;
      const now = c.tiles.get(id)!;
      this.key(c.caster, { at: s, tile: c.start, row: 'attack2', p0: 0, p1: 0.6, look: was });
      this.beat({ at: s, kind: 'hook', where: c.start, to: was, foe: id });
      const pulled = s + SHOW.HOOK_FLY;
      const landed = pulled + SHOW.HOOK_PULL;
      this.key(id, { at: 0, tile: was, look: c.start });
      this.key(id, { at: pulled, tile: was, row: 'hurt', p0: 0, p1: 0.5, glide: true, arc: 18, look: c.start });
      this.key(id, { at: landed, tile: now, row: 'hurt', p0: 0.5, look: c.start });
      this.key(c.caster, { at: landed, tile: c.start, row: 'attack', p0: 0, p1: 1, look: now });
      this.key(c.caster, { at: landed + SHOW.HOOK_CUT + 160, tile: c.start, row: 'attack', p0: 1, look: now });
      this.beat({ at: landed + SHOW.HOOK_CUT, kind: 'cut', where: c.start, foe: id });
      this.key(id, { at: landed + SHOW.HOOK_CUT, tile: now, row: 'hurt', p0: 0, p1: 1, look: c.start });
      this.key(id, { at: landed + SHOW.HOOK_CUT + SHOW.FLINCH, tile: now, row: 'hurt', p0: 1, look: c.start });
      s += SHOW.HOOK_GAP;
    }
    this.key(c.caster, { at: s, tile: c.start });
    this.plan.ms = s + SHOW.HOOK_TAIL;
    this.plan.zoom = 1.5;
    return true;
  }
}

/** How far along a run (0 to 1) a tile lies. */
function along(a: At, b: At, p: At): number {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const l = du * du + dv * dv;
  return l ? clamp01(((p.u - a.u) * du + (p.v - a.v) * dv) / l) : 1;
}
/** A beast runs in from the caster's side of it, along the board's u (screen left or right), -1 or 1. */
const runSide = (from: At, to: At): number => (to.u - from.u + (to.v - from.v) * 0.5 >= 0 ? 1 : -1);
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeInOut = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
