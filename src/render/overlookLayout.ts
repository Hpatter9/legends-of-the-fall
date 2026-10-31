// Positions on the painted overlook, in the same scene pixels as the party rigs.
// Relative positions keep the distant army and foreground feet on their own ground
// when the portrait changes height. Mode buttons occupy a separate strip at the foot.
import type { Camp, Place } from './campSpots';
import type { Army } from '../sim/armies';

export function overlookLayout(w: number, h: number): Camp {
  const cx = Math.round(w / 2);
  const heroY = Math.min(h * 0.8, h - 132);
  const place = (x: number, y: number, width: number, height: number): Place => ({
    x: x + width / 2, foot: y,
    box: { x, y, w: width, h: height },
    plate: { x, y: y + height - 44, w: width, h: 44 },
  });
  return {
    w, h, cx, gateY: Math.round(h * 0.22), wall: [], props: [],
    fire: { x: Math.round(w * 0.09), y: Math.round(h * 0.81) },
    heroes: [0.5, 0.34, 0.66, 0.2, 0.8].map((x, i) => ({
      x: Math.round(w * x), y: Math.round(heroY - h * (i === 0 ? 0 : i < 3 ? 0.02 : 0.04)), face: x < 0.5 ? 1 : -1,
    })),
    table: { x: cx, y: h - 120 },
    cart: { x: Math.round(w * 0.17), y: h - 65 },
    stash: { x: 8, y: h - 114, w: 58, h: 54 },
    places: {
      daily: place(10, h - 56, Math.floor((w - 28) / 2), 48),
      tower: place(Math.ceil((w + 8) / 2), h - 56, Math.floor((w - 28) / 2), 48),
      calamity: place(w - 116, 4, 108, Math.max(112, Math.round(h * 0.23))),
      // (Hester's Stall, SHOP-BOOKS-GEAR: on the ledge at the left, above the fire and the chests; its picture over a short plate)
      stall: stallPlace(h, heroY),
    },
    buttonTop: h - 60,
  };
}

/** Hester's Stall's place on the overlook: the stall's picture on the ledge at the left edge, its plate under it, the tap box over both. */
export const STALL = { w: 108, pic: 100, plate: 34 };
function stallPlace(h: number, heroY: number): Place {
  const foot = Math.round(heroY - h * 0.075);
  const x = 2;
  return { x: x + STALL.w / 2, foot, box: { x, y: foot - STALL.pic, w: STALL.w, h: STALL.pic + STALL.plate }, plate: { x, y: foot, w: STALL.w, h: STALL.plate } };
}

/** The actual army's field troops, excluding its bosses, in first-seen order. */
export function overlookCrew(army: Army): string[] {
  const bosses = new Set(army.waves.filter((w) => w.boss).map((w) => w.foes[0]));
  return [...new Set(army.waves.flatMap((w) => [...w.foes]))].filter((k) => !bosses.has(k));
}

interface ScoutCamp {
  atlas: 'war' | 'wild' | 'arcane';
  row: number;
  name: string;
  /** Normalised positions inside the camp painting, rather than parade rows. */
  patrols: readonly (readonly [number, number])[];
  boss: readonly [number, number];
}

export const SCOUT_CAMPS: Readonly<Record<string, ScoutCamp>> = {
  orcs: { atlas: 'war', row: 0, name: 'Siege encampment', boss: [0.62, 0.77], patrols: [[0.27, 0.45], [0.32, 0.5], [0.4, 0.68], [0.47, 0.76], [0.56, 0.65], [0.62, 0.68], [0.69, 0.57], [0.73, 0.6], [0.77, 0.78], [0.36, 0.8], [0.49, 0.4], [0.55, 0.45]] },
  undead: { atlas: 'war', row: 1, name: 'Necropolis graveyard', boss: [0.55, 0.57], patrols: [[0.24, 0.55], [0.3, 0.66], [0.38, 0.72], [0.44, 0.55], [0.49, 0.68], [0.6, 0.76], [0.64, 0.62], [0.71, 0.45], [0.75, 0.72], [0.8, 0.58], [0.4, 0.38], [0.57, 0.36]] },
  beasts: { atlas: 'war', row: 2, name: 'Frozen hunting grounds', boss: [0.66, 0.65], patrols: [[0.26, 0.56], [0.29, 0.59], [0.32, 0.55], [0.43, 0.71], [0.48, 0.76], [0.58, 0.5], [0.62, 0.53], [0.72, 0.72], [0.76, 0.68], [0.39, 0.43], [0.42, 0.47]] },
  wildwood: { atlas: 'wild', row: 0, name: 'Elder-root stronghold', boss: [0.57, 0.67], patrols: [[0.25, 0.62], [0.34, 0.72], [0.41, 0.55], [0.47, 0.75], [0.53, 0.44], [0.62, 0.49], [0.7, 0.64], [0.74, 0.77], [0.8, 0.55], [0.35, 0.43]] },
  labyrinth: { atlas: 'wild', row: 1, name: 'The stone labyrinth', boss: [0.52, 0.51], patrols: [[0.24, 0.7], [0.32, 0.7], [0.32, 0.5], [0.4, 0.5], [0.4, 0.36], [0.48, 0.74], [0.57, 0.74], [0.65, 0.59], [0.73, 0.59], [0.73, 0.78], [0.81, 0.78]] },
  ogres: { atlas: 'wild', row: 2, name: 'Bonefire clan camp', boss: [0.58, 0.72], patrols: [[0.26, 0.56], [0.35, 0.68], [0.43, 0.75], [0.49, 0.55], [0.64, 0.56], [0.71, 0.71], [0.78, 0.61], [0.54, 0.38]] },
  infernal: { atlas: 'arcane', row: 0, name: 'Infernal mustering grounds', boss: [0.59, 0.7], patrols: [[0.28, 0.55], [0.34, 0.6], [0.43, 0.74], [0.49, 0.7], [0.56, 0.54], [0.64, 0.6], [0.72, 0.74], [0.77, 0.69], [0.4, 0.39], [0.69, 0.37]] },
  yokai: { atlas: 'arcane', row: 1, name: 'Haunted shrine', boss: [0.58, 0.52], patrols: [[0.26, 0.69], [0.34, 0.62], [0.42, 0.73], [0.49, 0.62], [0.57, 0.76], [0.65, 0.7], [0.72, 0.56], [0.78, 0.65], [0.4, 0.42], [0.67, 0.4]] },
  golems: { atlas: 'arcane', row: 2, name: 'War foundry', boss: [0.62, 0.68], patrols: [[0.28, 0.6], [0.37, 0.73], [0.46, 0.62], [0.54, 0.76], [0.67, 0.52], [0.73, 0.65], [0.78, 0.76], [0.42, 0.42]] },
};

export const scoutCamp = (army: string): ScoutCamp => SCOUT_CAMPS[army] ?? SCOUT_CAMPS.orcs;
export const CAMP_PAINT = { y: 0.32, h: 0.32 };

export function overlookRanks(w: number, h: number, army = 'orcs'): { x: number; y: number; size: number; kind: number }[] {
  return scoutCamp(army).patrols.map(([x, y], i) => ({
    x: Math.round(w * x), y: Math.round(h * (CAMP_PAINT.y + y * CAMP_PAINT.h)),
    size: Math.round(6 + y * 6), kind: i,
  })).sort((a, b) => a.y - b.y);
}
