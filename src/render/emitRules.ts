// EMIT-POINTS (docs/notes/emit-points.md): where on a fighter's own picture what it looses leaves from (the owner: "the gun shots
// should come from the end of the gun"). Each is read off the sheet's release frame (the third of its attack row, the one on show
// as the shot leaves), for the view from the front and the view from behind, as pixels of the sheet from the middle of the frame's
// bottom edge (the feet): x towards the way the figure faces, y upwards. `tools/emit-points/anchors.json` is the same table with
// `tools/emit-points/check.py`, which checks each against the sheet's drawn pixels and draws them. Pure: the tests read it.
import { REACH } from './reachData';

/** What the point is: a gun's or a crossbow's muzzle, the hand on the bow, the head of a staff or wand (or a mace raised to cast), a
 *  casting or throwing hand, a mouth, a blade. */
export type EmitKind = 'muzzle' | 'bowHand' | 'staffTip' | 'hand' | 'mouth' | 'blade';
export interface Emit {
  kind: EmitKind;
  front: readonly [number, number];
  back: readonly [number, number];
}

/** By the fighter's own sheet (its look from the front). */
export const EMIT: Readonly<Record<string, Emit>> = {
  mythic_astrax: { kind: 'mouth', front: [38, 86], back: [28, 92] },
  mythic_nyxara: { kind: 'staffTip', front: [44, 60], back: [45, 62] },
  hero_samurai_archer: { kind: 'bowHand', front: [46, 52], back: [45, 60] },
  hero_res_wizard: { kind: 'hand', front: [45, 70], back: [42, 72] },
  hero_res_lightning_mage: { kind: 'staffTip', front: [20, 92], back: [22, 96] },
  hero_res_wanderer: { kind: 'hand', front: [32, 66], back: [40, 72] },
  hero_res_gorgon: { kind: 'staffTip', front: [36, 82], back: [40, 84] },
  hero_res_druid: { kind: 'staffTip', front: [48, 62], back: [50, 74] },
  hero_res_ranger: { kind: 'bowHand', front: [38, 62], back: [38, 62] },
  hero_res_warlock: { kind: 'staffTip', front: [52, 56], back: [68, 70] },
  hero_res_gunslinger: { kind: 'muzzle', front: [55, 66], back: [50, 69] },
  hero_res_rifle_bot: { kind: 'muzzle', front: [30, 60], back: [28, 66] },
  hero_res_wolf_bard: { kind: 'hand', front: [48, 60], back: [50, 70] },
  hero_res_time_witch: { kind: 'hand', front: [44, 88], back: [30, 82] },
  hero_res_siege_bot: { kind: 'muzzle', front: [30, 58], back: [40, 68] },
  hero_res_priestess: { kind: 'staffTip', front: [62, 70], back: [58, 78] },
  hero_res_sage: { kind: 'staffTip', front: [25, 98], back: [8, 98] },
  hero_res_hemomancer: { kind: 'hand', front: [58, 56], back: [55, 70] },
  hero_res_dhampir: { kind: 'muzzle', front: [45, 62], back: [42, 66] },
  hero_res_falconer: { kind: 'bowHand', front: [35, 62], back: [38, 65] },
  hero_res_astral_sphinx: { kind: 'mouth', front: [72, 62], back: [75, 60] },
  hero_res_plague_doctor: { kind: 'hand', front: [38, 66], back: [28, 66] },
  hero_res_bombardier: { kind: 'muzzle', front: [25, 82], back: [22, 82] },
  hero_res_astrologer: { kind: 'staffTip', front: [52, 65], back: [57, 72] },
  hero_res_inquisitor: { kind: 'muzzle', front: [60, 66], back: [62, 68] },
  hero_res_corsair_surgeon: { kind: 'muzzle', front: [42, 72], back: [42, 72] },
  hero_res_harpooner: { kind: 'hand', front: [40, 82], back: [37, 86] },
};

/** CASTERS: where a skill's effect leaves a hero that does not shoot (a healer's thread, a charm's arc, a painted streak): read off the
 *  second frame of the skill's row (`attack2`, or the attack row where the sheet has none), the middle of the cast. x may be behind
 *  the body's middle here: a mace or a fan raised overhead. */
export const CAST: Readonly<Record<string, Emit>> = {
  hero_res_cleric: { kind: 'hand', front: [25, 52], back: [35, 50] },
  hero_res_paladin: { kind: 'staffTip', front: [-15, 105], back: [-27, 105] },
  hero_res_satyr: { kind: 'hand', front: [15, 62], back: [28, 62] },
  hero_res_kitsune: { kind: 'hand', front: [-12, 110], back: [-12, 112] },
  hero_res_karasu: { kind: 'hand', front: [42, 45], back: [48, 72] },
  hero_res_kunoichi: { kind: 'hand', front: [35, 45], back: [55, 62] },
  hero_res_shambler: { kind: 'hand', front: [18, 14], back: [28, 14] },
  hero_res_illusionist: { kind: 'staffTip', front: [25, 72], back: [30, 75] },
  hero_res_buccaneer: { kind: 'hand', front: [10, 92], back: [22, 78] },
  hero_res_mercenary: { kind: 'blade', front: [70, 56], back: [68, 80] },
  hero_res_mummy: { kind: 'hand', front: [40, 72], back: [48, 72] },
  hero_res_reaper: { kind: 'hand', front: [42, 50], back: [48, 52] },
  hero_res_dread_pirate: { kind: 'hand', front: [38, 40], back: [40, 33] },
  hero_res_arc_blade: { kind: 'blade', front: [0, 90], back: [0, 100] },
  hero_res_dragoon: { kind: 'hand', front: [35, 50], back: [15, 88] },
  hero_res_tyrant: { kind: 'staffTip', front: [22, 95], back: [25, 95] },
  hero_res_nightstalker: { kind: 'hand', front: [40, 45], back: [42, 48] },
};

/** FOES: where a shooting foe's shot leaves. A foe's sheet has one view (no look from behind) and its own number of attack frames, so
 *  the point is read on `frame`: the frame of its attack row on show as the shot leaves (the share of the row gone by then, the
 *  wind-up over the wind-up and 250 ms). Several foes share a sheet at their own sizes. */
export const FOE_EMIT: Readonly<Record<string, { kind: EmitKind; at: readonly [number, number]; frame: number }>> = {
  gorgon_1: { kind: 'mouth', at: [12, 48], frame: 10 },
  gorgon_2: { kind: 'mouth', at: [5, 45], frame: 10 },
  gorgon_3: { kind: 'mouth', at: [5, 52], frame: 10 },
  hk_orc_archer: { kind: 'bowHand', at: [20, 28], frame: 3 },
  skeleton_archer: { kind: 'bowHand', at: [25, 52], frame: 10 },
  lich_king: { kind: 'staffTip', at: [48, 40], frame: 3 },
  kitsune: { kind: 'hand', at: [15, 42], frame: 6 },
  shaman_king: { kind: 'staffTip', at: [40, 42], frame: 3 },
  eidolon_voltara: { kind: 'hand', at: [55, 112], frame: 3 },
  eidolon_vaelkhar: { kind: 'mouth', at: [52, 62], frame: 3 },
};

/** The point for a fighter whose own sheet is `own` and which is drawn now from `sheet` (its own, or `rear`, its look from behind):
 *  its shot's point, or its cast's where it has no shot's (a hero that shoots casts from its shot's point: its cast row was not
 *  measured), or a shooting foe's. Undefined where the sheet has none of these, or the fighter wears another look (a form, a guise, an awakened sheet), whose
 *  pose was not measured: the caller keeps the old place, a share of the fighter's height above its feet. */
export function emitOffset(own: string, sheet: string, rear: string | undefined): readonly [number, number] | undefined {
  const e = EMIT[own] ?? CAST[own];
  // (a foe's one view serves both ways it can face)
  if (!e) return FOE_EMIT[own] && sheet === own ? FOE_EMIT[own].at : undefined;
  return sheet === own ? e.front : rear !== undefined && sheet === rear ? e.back : undefined;
}

/** Where the point is in the world: the fighter's feet at (x, y), its body drawn `sx` by `sy` of the sheet's size (`sx` negative
 *  when it is mirrored to face the other way), so the point is mirrored with it and grows with it. */
export function emitWorld(x: number, y: number, at: readonly [number, number], sx: number, sy: number): [number, number] {
  return [x + at[0] * sx, y - at[1] * Math.abs(sy)];
}

/** MELEE: where a fighter's weapon reaches on the frame on show as its blow lands (`reachData.ts`, read off every sheet by
 *  `tools/emit-points/reach.py`: the forward-most thing drawn). For the fighter's own sheet or its look from behind; undefined for
 *  another look or a sheet with no attack row: the caller keeps the old place. */
export function reachOffset(own: string, sheet: string, rear: string | undefined): readonly [number, number] | undefined {
  const e = REACH[own];
  if (!e) return undefined;
  return sheet === own ? e.front : rear !== undefined && sheet === rear ? e.back : undefined;
}

/** How far from the weapon's reach towards the struck fighter's middle a melee stroke is centred: half way, so it lies across the
 *  weapon's end and the near side of the one struck, not on the struck fighter's middle. */
export const STROKE_AT = 0.5;
/** Where a stroke is centred, for a weapon reaching to (rx, ry) and a struck fighter's middle at (tx, ty). (Its turn stays the line
 *  from body to body: from the weapon's end to the one struck is too short a line to take a direction from.) */
export function strokeLay(rx: number, ry: number, tx: number, ty: number): { x: number; y: number } {
  return { x: rx + (tx - rx) * STROKE_AT, y: ry + (ty - ry) * STROKE_AT };
}

/** WHEN a melee stroke plays: as the blow LANDS, with its spark, on the frame the weapon's reach was read from (it played as the swing
 *  began, some 400 ms earlier, over the wind-up's first frame, and was gone before the spark). A blow lands as a `hit` whose source is
 *  the blow itself, by a fighter that does not shoot, on the one it was aimed at (not the others a wide blow splashes). A blow that is
 *  dodged has no stroke: the one that dodged has its own whoosh, and the event does not say whose blow it was. */
export function strokeLands(e: { kind: string; src?: string; splash?: boolean }, shoots: boolean): boolean {
  return !shoots && e.kind === 'hit' && e.src === 'blow' && !e.splash;
}
