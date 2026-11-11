// ULT-CAMERA (docs/notes/ult-camera.md): where the camera looks through a show. The owner: "with the ultimate changes, make sure the camera
// follows the effect. like if a spell is cast i want to see the casting, then the effect after." So for an ultimate fired by hand:
//
//   the casting    the camera is on the caster through the wind-up (the push-in under the band, `ultEpicRules.ts`);
//   the travel     it leaves for where the effect lands, timed to arrive just before the blow (`LEAD_MS`). Where the caster and the effect
//                  are close, one frame that holds both is used instead, and there is no travel to speak of;
//   the strike     it frames the whole effect: every struck spot, everyone helped, the tiles worked on, and the strike sheet's real box on
//                  each spot it bursts on (read from the sheet, so it still fits as the strikes get bigger), inside the room the player
//                  really sees (the camera's safe rectangle). Bursts spread too wide to fit are stepped between through the strike;
//   the hold       it stays there through the aftermath;
//   the return     the show ends, however it ends, and the fight's own follow takes the camera back, gliding.
//
// An Eidolon's call does the same with the board's picture (it frames the foes' side for its strike; a strike wider than the screen is
// framed about its middle), and a king's spell cast by hand gets a quick ease to its target and back, with no dim and no slowdown.
// Pure: no DOM, no Pixi, so the tests read it; `ultMoment.ts`, `eidolonCall.ts` and `main.ts` ask it. Nothing here touches the battle.

import { type Box, type Spot, type View } from './render/cameraRules';
import { BFX_SCALE, bfxClip, ultBfx } from './render/blenderFxRules';
import { ultWeight } from './ultStageRules';

export const ULT_CAM = {
  /** The travel ends this long before the blow (ms), so the blow lands on a camera already there. */
  LEAD_MS: 160,
  /** A travel's length: this many ms a screen px of the way, between the least and the most (a short hop is quick, a long way is still seen). */
  MS_PER_PX: 2.2,
  TRAVEL_MIN: 360,
  TRAVEL_MAX: 900,
  /** The caster is seen casting at least this long before the camera leaves (a short wind-up shortens the travel, never the casting). */
  CAST_MIN: 650,
  /** Room kept round the effect inside the frame (world px), over the fighters' own padding. */
  PAD: 14,
  /** A fighter's own room in the effect's box: its width either side, and over its head (bars, numbers). */
  SIDE: 26,
  HEAD: 22,
  FOOT: 10,
  /** One frame holds caster and effect when it needs no less than this share of the zoom the fight's follow holds. */
  BOTH: 0.82,
  /** A king's spell cast by hand: how long the camera stays on its target, and how quickly it eases there (ms). */
  SPELL_MS: 1100,
  SPELL_EASE: 320,
  /** An Eidolon's strike on the board's picture: the most it is zoomed in, and the most for one wider than the room. */
  EIDOLON_ZOOM: 1.2,
  EIDOLON_WIDE: 1.08,
};

/** A sheet's frame as the camera needs it: its size and where the middle of its tile sits in it, in the sheet's own px. */
export interface ArtBox {
  w: number;
  h: number;
  ax: number;
  ay: number;
}

/** The strike sheet of a hero kind's ultimate, if it has one (BLENDER-FX hangs them: `STAGE_ART`). */
export function strikeArt(kind: string): ArtBox | null {
  const key = ultBfx(kind, 'strike', ultWeight(kind));
  const c = key ? bfxClip(key) : undefined;
  return c ? { w: c.w, h: c.h, ax: c.ax, ay: c.ay } : null;
}

/** The box a sheet covers on the board when the middle of its tile is at (x, y), `mult` times its size (as `bfxBox`). */
export function artBoxAt(art: ArtBox, x: number, y: number, mult = 1): Box {
  const s = BFX_SCALE * mult;
  return { x0: x - art.ax * s, y0: y - art.ay * s, x1: x + (art.w - art.ax) * s, y1: y + (art.h - art.ay) * s };
}

const union = (a: Box | null, b: Box): Box => (a ? { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) } : b);
const grow = (b: Box, by: number): Box => ({ x0: b.x0 - by, x1: b.x1 + by, y0: b.y0 - by, y1: b.y1 + by });
/** A fighter's (or a tile's, `tall` 0) own room. */
export const spotBox = (s: Spot): Box => ({ x0: s.x - ULT_CAM.SIDE, x1: s.x + ULT_CAM.SIDE, y0: s.y - s.tall - ULT_CAM.HEAD, y1: s.y + ULT_CAM.FOOT });

/** What an effect covers: every spot it touches (`spots`: the struck, the helped, the tiles; feet in world px) and the strike sheet's box
 *  on each spot it bursts on (`bursts`, `art`, `mult`), with a little room round it. Null with nothing to frame. */
export function effectBox(spots: readonly Spot[], bursts: readonly Spot[] = [], art: ArtBox | null = null, mult = 1): Box | null {
  let box: Box | null = null;
  for (const s of spots) box = union(box, spotBox(s));
  for (const s of bursts) {
    box = union(box, spotBox(s));
    if (art) box = union(box, artBoxAt(art, s.x, s.y, mult));
  }
  return box ? grow(box, ULT_CAM.PAD) : null;
}

/** The room the camera frames in and its zoom limits: the safe rectangle's size (px), the layout's scale, the least and most zoom. */
export interface Room {
  w: number;
  h: number;
  base: number;
  lo: number;
  hi: number;
}

/** The view that shows the whole of `box` in the room, zoomed in as far as it fits (never past `hi`). When it cannot fit even at the least
 *  zoom (a strike wider than the screen), `fits` is false and the view is the least zoom about the box's middle. */
export function fitView(box: Box, room: Room): View & { fits: boolean } {
  const bw = Math.max(1, box.x1 - box.x0);
  const bh = Math.max(1, box.y1 - box.y0);
  const fit = Math.min(room.w / bw, room.h / bh) / room.base;
  return { cx: (box.x0 + box.x1) / 2, cy: (box.y0 + box.y1) / 2, zoom: Math.min(room.hi, Math.max(room.lo, fit)), fits: fit >= room.lo - 1e-9 };
}

/** Whether a view shows the whole of a box in the room. */
export function shows(view: View, box: Box, room: Room): boolean {
  const k = room.base * view.zoom;
  const hw = room.w / 2 / k + 1e-6;
  const hh = room.h / 2 / k + 1e-6;
  return box.x0 >= view.cx - hw && box.x1 <= view.cx + hw && box.y0 >= view.cy - hh && box.y1 <= view.cy + hh;
}

/** The strike's frames. One, when the whole effect fits the room. Else the bursts are gathered, in the order they go off, into as few
 *  frames as each fit (a burst whose own sheet is wider than the room is framed about its middle), and the camera steps between them
 *  through the strike (`stepAt`). The first frame always holds the first burst: the blow lands there. */
export function strikeViews(spots: readonly Spot[], bursts: readonly Spot[], art: ArtBox | null, room: Room, mult = 1): (View & { fits: boolean })[] {
  const all = effectBox(spots, bursts, art, mult);
  if (!all) return [];
  const one = fitView(all, room);
  if (one.fits || bursts.length <= 1) return [one];
  const views: (View & { fits: boolean })[] = [];
  let group: Spot[] = [];
  for (const b of bursts) {
    const tried = fitView(effectBox([], [...group, b], art, mult)!, room);
    if (group.length && !tried.fits) {
      views.push(fitView(effectBox([], group, art, mult)!, room));
      group = [b];
    } else group.push(b);
  }
  if (group.length) views.push(fitView(effectBox([], group, art, mult)!, room));
  return views;
}

/** Which of the strike's frames shows `k` of the way (0 to 1) from the blow to the show's end: each has an even share, in order. */
export const stepAt = (frames: number, k: number): number => (frames <= 1 ? 0 : Math.min(frames - 1, Math.floor(Math.max(0, Math.min(1, k)) * frames)));

/** One frame for caster and effect together, when they are close: the box round both fits at no less than `BOTH` of the zoom the fight's
 *  follow holds (`held`), so nothing is made small to do it. Null when they are far apart: the camera travels. */
export function bothView(caster: Spot, effect: Box, room: Room, held: number): (View & { fits: boolean }) | null {
  const v = fitView(grow(union(effect, spotBox(caster)), 0), room);
  return v.fits && v.zoom >= Math.max(room.lo, held * ULT_CAM.BOTH) - 1e-9 ? v : null;
}

/** How long a travel between two views takes (ms): by how far the camera's point moves on the screen, within the limits. */
export function travelMs(from: Pick<View, 'cx' | 'cy'>, to: View, room: Room): number {
  const px = Math.hypot(to.cx - from.cx, to.cy - from.cy) * room.base * to.zoom;
  return Math.round(Math.min(ULT_CAM.TRAVEL_MAX, Math.max(ULT_CAM.TRAVEL_MIN, px * ULT_CAM.MS_PER_PX)));
}

/** When the camera leaves the caster and how long its travel takes, so that it arrives `LEAD_MS` before the blow (`blowAt`, ms into the
 *  show). The casting is always seen for `CAST_MIN` first: a blow that comes sooner shortens the travel, and the camera still arrives
 *  before it wherever it can. */
export function travelPlan(blowAt: number, travel: number): { leaveAt: number; ms: number; arriveAt: number } {
  const arriveAt = Math.max(0, blowAt - ULT_CAM.LEAD_MS);
  const leaveAt = Math.min(arriveAt, Math.max(ULT_CAM.CAST_MIN, arriveAt - travel));
  return { leaveAt, ms: Math.max(1, arriveAt - leaveAt), arriveAt };
}

/** What the camera is doing at a moment of a show. */
export type CamBeat = 'cast' | 'travel' | 'strike' | 'hold';

/** A show's camera, laid out once as it begins: when it leaves the caster (`leaveAt`, ms into the show), when the blow is due
 *  (`blowAt`), when the show ends (`endAt`), and the frames it goes to (`views`: one that holds both, or the strike's). */
export interface CamPlan {
  leaveAt: number;
  travelMs: number;
  blowAt: number;
  endAt: number;
  views: readonly View[];
  /** One frame holds caster and effect: it is taken as the camera leaves the push-in, and kept. */
  both: boolean;
}

/** Lay a show's camera out. `blowAt` is when the blow is due (the wind-up's end; after a showcase, its end), `followUntil` an earlier time
 *  the camera must stay with the caster until at most (a showcase lets go of its caster then: a staff raised, a burrower sunk), `from`
 *  where the camera's point is on the caster. Null with nothing to frame. */
export function camPlan(o: { caster: Spot; from: Pick<View, 'cx' | 'cy'>; spots: readonly Spot[]; bursts: readonly Spot[]; art: ArtBox | null; room: Room; held: number; blowAt: number; endAt: number; followUntil?: number; mult?: number }): CamPlan | null {
  const strike = strikeViews(o.spots, o.bursts, o.art, o.room, o.mult);
  if (!strike.length) return null;
  const whole = effectBox(o.spots, o.bursts, o.art, o.mult)!;
  const both = strike.length === 1 ? bothView(o.caster, whole, o.room, o.held) : null;
  const views: readonly View[] = both ? [both] : strike;
  const t = travelPlan(o.blowAt, travelMs(o.from, views[0], o.room));
  // (a showcase that lets go of its caster early sends the camera on then, unhurried: it has until the blow)
  const leaveAt = o.followUntil !== undefined ? Math.min(t.leaveAt, Math.max(0, o.followUntil)) : t.leaveAt;
  return { leaveAt, travelMs: Math.max(t.ms, Math.min(ULT_CAM.TRAVEL_MAX, t.arriveAt - leaveAt)), blowAt: o.blowAt, endAt: o.endAt, views, both: !!both };
}

/** Where a show's camera is `ms` into it: on the caster (`cast`: the page keeps its push-in), on its way (`travel`), on the strike's frame
 *  (`strike`, stepping between its frames when there are several) and held there through the aftermath (`hold`). Null once the show is
 *  over (or `ms` is before it): the fight's own follow has the camera. `landed` is ms since the blow really landed (a salvo's can be
 *  late; null: not yet), which the stepping counts from. */
export function camAt(plan: CamPlan, ms: number, landed: number | null = null): { beat: CamBeat; view: View | null; ease: number } | null {
  if (ms < 0 || ms >= plan.endAt) return null;
  if (ms < plan.leaveAt) return { beat: 'cast', view: null, ease: 0 };
  if (ms < plan.leaveAt + plan.travelMs) return { beat: 'travel', view: plan.views[0], ease: plan.travelMs };
  const since = landed ?? Math.max(0, ms - plan.blowAt);
  const span = Math.max(1, plan.endAt - plan.blowAt);
  const i = stepAt(plan.views.length, since / span);
  // (a step between bursts is a quick, deliberate move; the frame held is eased to gently)
  return { beat: ms < plan.blowAt + span * 0.5 ? 'strike' : 'hold', view: plan.views[i], ease: i > 0 ? ULT_CAM.TRAVEL_MIN : plan.travelMs };
}

/* ------------------------------------------------------------------ an Eidolon's call: the board's picture framed */

/** A point and a rectangle on the page, client px. */
export interface Pt {
  x: number;
  y: number;
}
export interface PageRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The board's picture framed for an Eidolon's strike: a zoom and a shift (`transform: translate(tx, ty) scale(zoom)` about the page's
 *  top-left) that brings the strike's middle (`focus`) to the middle of the room the player sees (`safe`), zoomed in so the struck fit
 *  (`box`: their extent on the page) but no further than `EIDOLON_ZOOM`. The picture must still cover the page (`w` x `h`), so a strike
 *  off-centre is zoomed in just enough to be brought to the middle, and one wider than the room is hardly zoomed at all (`EIDOLON_WIDE`):
 *  it is leaned towards its middle as far as the picture's edges allow. */
export function pictureFrame(focus: Pt, box: { w: number; h: number }, safe: PageRect, w: number, h: number): { zoom: number; tx: number; ty: number } {
  const c = { x: (safe.x0 + safe.x1) / 2, y: (safe.y0 + safe.y1) / 2 };
  const fit = Math.min((safe.x1 - safe.x0) / Math.max(1, box.w), (safe.y1 - safe.y0) / Math.max(1, box.h));
  // (the least zoom that lets the focus reach the middle without the picture's edge coming into view)
  const need = Math.max(1, focus.x > 0 ? c.x / focus.x : 1, focus.x < w ? (w - c.x) / (w - focus.x) : 1, focus.y > 0 ? c.y / focus.y : 1, focus.y < h ? (h - c.y) / (h - focus.y) : 1);
  // (a strike wider than the room is not zoomed in on, which would only crop more of it: just enough to lean towards its middle)
  const zoom = fit < 1 ? Math.min(ULT_CAM.EIDOLON_WIDE, need) : Math.min(ULT_CAM.EIDOLON_ZOOM, Math.max(fit, need));
  const clamp = (t: number, size: number) => Math.min(0, Math.max(size * (1 - zoom), t));
  return { zoom, tx: clamp(c.x - focus.x * zoom, w), ty: clamp(c.y - focus.y * zoom, h) };
}

/** The same frame as a plain zoom about a point (the call's other shots): the shift that keeps `about` where it is. */
export const zoomAboutPt = (about: Pt, zoom: number): { zoom: number; tx: number; ty: number } => ({ zoom, tx: about.x * (1 - zoom), ty: about.y * (1 - zoom) });

/* ------------------------------------------------------------------ a king's spell cast by hand */

/** A king's spell cast by hand: the view of its target and what it touches (`tiles`: each tile's ground in world px; `art`: its cast
 *  sheet, standing on its target tile `at`), never closer than the fight's follow holds (`held`), so it is a glance, not a push-in.
 *  Null with nothing to frame. */
export function spellView(at: Spot, tiles: readonly Spot[], art: ArtBox | null, room: Room, held: number): View | null {
  const box = effectBox(tiles, [at], art);
  if (!box) return null;
  const v = fitView(box, { ...room, hi: Math.max(room.lo, Math.min(room.hi, held)) });
  return { cx: v.cx, cy: v.cy, zoom: v.zoom };
}

/** Whether a king's spell's glance may play: never over a camera the player has just moved, never while an ultimate's show or an Eidolon's
 *  call is running, and not at all with reduced motion. */
export const spellGlance = (o: { manual: boolean; show: boolean; reduced: boolean }): boolean => !o.manual && !o.show && !o.reduced;
