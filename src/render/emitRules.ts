// EMIT-POINTS (docs/notes/emit-points.md): where on a fighter's own picture what it looses leaves from (the owner: "the gun shots
// should come from the end of the gun"). Each is read off the sheet's release frame (the third of its attack row, the one on show
// as the shot leaves), for the view from the front and the view from behind, as pixels of the sheet from the middle of the frame's
// bottom edge (the feet): x towards the way the figure faces, y upwards. `tools/emit-points/anchors.json` is the same table with
// `tools/emit-points/check.py`, which checks each against the sheet's drawn pixels and draws them. Pure: the tests read it.

/** What the point is: a gun's or a crossbow's muzzle, the hand on the bow, the head of a staff or wand, a casting or throwing hand, a mouth. */
export type EmitKind = 'muzzle' | 'bowHand' | 'staffTip' | 'hand' | 'mouth';
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

/** The point for a fighter whose own sheet is `own` and which is drawn now from `sheet` (its own, or `rear`, its look from behind):
 *  undefined where the sheet has no point, or the fighter wears another look (a form, a guise, an awakened sheet), whose pose was
 *  not measured: the caller keeps the old place, a share of the fighter's height above its feet. */
export function emitOffset(own: string, sheet: string, rear: string | undefined): readonly [number, number] | undefined {
  const e = EMIT[own];
  if (!e) return undefined;
  return sheet === own ? e.front : rear !== undefined && sheet === rear ? e.back : undefined;
}

/** Where the point is in the world: the fighter's feet at (x, y), its body drawn `sx` by `sy` of the sheet's size (`sx` negative
 *  when it is mirrored to face the other way), so the point is mirrored with it and grows with it. */
export function emitWorld(x: number, y: number, at: readonly [number, number], sx: number, sy: number): [number, number] {
  return [x + at[0] * sx, y - at[1] * Math.abs(sy)];
}
