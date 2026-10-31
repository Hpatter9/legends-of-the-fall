// HUD-FACES (docs/notes/hud-faces.md): where each hero's face sits in its painted art, so the fight's stat views (the hero rows, the unit
// info card, the Last Stand's paused sheet) can show the painting cropped to the face instead of the pixel sprite. Pure data and maths: no
// DOM, so the tests read it. The crops were framed by eye against a contact sheet (docs/samples/hud-faces-sheet.png).

import { ALL_HEROES } from './sim/units';

/** A face's square in a picture: its centre (`cx`, `cy`, as shares of the picture's width and height) and its side (a share of the width). */
export type FaceBox = readonly [cx: number, cy: number, side: number];

/** Each hero's face in its two paintings: the plain art (`heroes/<kind>-portrait.webp`) and the awakened form (`heroes/awakened-<kind>.webp`). */
export const HUD_FACES: Readonly<Record<string, { art: FaceBox; awakened: FaceBox }>> = {
  knight: { art: [0.57, 0.115, 0.26], awakened: [0.57, 0.2, 0.34] },
  samurai: { art: [0.68, 0.33, 0.42], awakened: [0.54, 0.39, 0.3] },
  kunoichi: { art: [0.59, 0.22, 0.3], awakened: [0.669, 0.338, 0.437] },
  archer: { art: [0.46, 0.265, 0.38], awakened: [0.55, 0.327, 0.319] },
  wizard: { art: [0.57, 0.22, 0.26], awakened: [0.455, 0.386, 0.484] },
  peasant: { art: [0.41, 0.185, 0.25], awakened: [0.47, 0.403, 0.426] },
  ninjaMonk: { art: [0.53, 0.21, 0.4], awakened: [0.58, 0.24, 0.45] },
  wanderer: { art: [0.57, 0.22, 0.42], awakened: [0.558, 0.327, 0.391] },
  lightningMage: { art: [0.62, 0.175, 0.26], awakened: [0.554, 0.362, 0.486] },
  kitsune: { art: [0.53, 0.13, 0.3], awakened: [0.592, 0.274, 0.45] },
  karasu: { art: [0.775, 0.33, 0.45], awakened: [0.618, 0.248, 0.285] },
  yamabushi: { art: [0.72, 0.19, 0.45], awakened: [0.5, 0.3, 0.35] },
  werewolf: { art: [0.775, 0.24, 0.45], awakened: [0.7, 0.24, 0.38] },
  minotaur: { art: [0.68, 0.24, 0.5], awakened: [0.5, 0.3, 0.35] },
  satyr: { art: [0.6, 0.18, 0.42], awakened: [0.52, 0.276, 0.564] },
  gorgon: { art: [0.43, 0.17, 0.26], awakened: [0.466, 0.225, 0.429] },
  samuraiCommander: { art: [0.5, 0.23, 0.45], awakened: [0.52, 0.37, 0.33] },
  paladin: { art: [0.49, 0.1, 0.25], awakened: [0.634, 0.3, 0.526] },
  cleric: { art: [0.48, 0.135, 0.25], awakened: [0.527, 0.322, 0.581] },
  druid: { art: [0.56, 0.25, 0.42], awakened: [0.525, 0.35, 0.46] },
  barbarian: { art: [0.56, 0.17, 0.42], awakened: [0.5, 0.3, 0.35] },
  ranger: { art: [0.52, 0.12, 0.26], awakened: [0.626, 0.281, 0.53] },
  warlock: { art: [0.56, 0.29, 0.42], awakened: [0.5, 0.3, 0.35] },
  illusionist: { art: [0.52, 0.13, 0.28], awakened: [0.613, 0.278, 0.445] },
  gunslinger: { art: [0.4, 0.14, 0.42], awakened: [0.586, 0.271, 0.464] },
  shambler: { art: [0.4, 0.13, 0.45], awakened: [0.65, 0.27, 0.4] },
  rifleBot: { art: [0.52, 0.24, 0.55], awakened: [0.4, 0.19, 0.32] },
  mercenary: { art: [0.53, 0.125, 0.28], awakened: [0.68, 0.2, 0.38] },
  mummy: { art: [0.57, 0.15, 0.42], awakened: [0.5, 0.3, 0.35] },
  buccaneer: { art: [0.42, 0.13, 0.28], awakened: [0.5, 0.3, 0.35] },
  wolfBard: { art: [0.48, 0.2, 0.48], awakened: [0.52, 0.3, 0.35] },
  beastmaster: { art: [0.49, 0.12, 0.26], awakened: [0.629, 0.201, 0.431] },
  kraken: { art: [0.42, 0.17, 0.5], awakened: [0.5, 0.3, 0.35] },
  lancer: { art: [0.43, 0.23, 0.25], awakened: [0.43, 0.18, 0.25] },
  reaper: { art: [0.57, 0.26, 0.42], awakened: [0.62, 0.42, 0.35] },
  timeWitch: { art: [0.57, 0.18, 0.28], awakened: [0.62, 0.4, 0.3] },
  arcBlade: { art: [0.53, 0.2, 0.42], awakened: [0.55, 0.22, 0.35] },
  dreadPirate: { art: [0.51, 0.29, 0.42], awakened: [0.5, 0.3, 0.35] },
  siegeBot: { art: [0.43, 0.27, 0.26], awakened: [0.58, 0.24, 0.35] },
  priestess: { art: [0.52, 0.27, 0.42], awakened: [0.542, 0.368, 0.418] },
  dragoon: { art: [0.55, 0.14, 0.26], awakened: [0.497, 0.294, 0.283] },
  juggernaut: { art: [0.56, 0.26, 0.45], awakened: [0.6, 0.197, 0.35] },
  sage: { art: [0.45, 0.17, 0.28], awakened: [0.42, 0.42, 0.4] },
  demonSwordsman: { art: [0.61, 0.21, 0.42], awakened: [0.534, 0.307, 0.344] },
  tyrant: { art: [0.5, 0.2, 0.28], awakened: [0.53, 0.42, 0.35] },
};

/** The painting a hero's face is cut from: the awakened form's once it has awakened, else the plain art's half-length portrait. */
export const faceUrl = (kind: string, awakened: number): string => (awakened > 0 ? `heroes/awakened-${kind}.webp` : `heroes/${kind}-portrait.webp`);

/** The face's box for `kind` in the painting `faceUrl` names, or none (a summon, a guest, a foe, a hero without a painting: they keep their sprite). */
export function faceBox(kind: string, awakened: number): FaceBox | undefined {
  const f = HUD_FACES[kind];
  return f && (awakened > 0 ? f.awakened : f.art);
}

/** Whether `kind` is a hero whose painted face can stand in for its sprite. */
export const hasFace = (kind: string): boolean => ALL_HEROES.includes(kind) && !!HUD_FACES[kind];

/** The square (in the picture's pixels: left, top, side) a box cuts from a `w` x `h` picture, kept inside the picture (shrunk if it must be). */
export function faceRect(box: FaceBox, w: number, h: number): { x: number; y: number; side: number } {
  const side = Math.max(1, Math.min(box[2] * w, w, h));
  const x = Math.min(Math.max(0, box[0] * w - side / 2), w - side);
  const y = Math.min(Math.max(0, box[1] * h - side / 2), h - side);
  return { x: Math.round(x), y: Math.round(y), side: Math.round(side) };
}

/** A bust's cut (RECAP-SPOILS: the MVP's bigger piece of art): `aspect` (width over height) wide, about twice the face's square across,
 *  its top a little above the face so the face sits in its upper third; kept inside the picture. */
export function bustRect(box: FaceBox, w: number, h: number, aspect: number): { x: number; y: number; w: number; h: number } {
  let bw = Math.min(box[2] * w * 2, w, h * aspect);
  let bh = bw / aspect;
  if (bh > h) {
    bh = h;
    bw = bh * aspect;
  }
  const side = box[2] * w;
  const x = Math.min(Math.max(0, box[0] * w - bw / 2), w - bw);
  const y = Math.min(Math.max(0, box[1] * h - side * 0.85), h - bh);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(bw), h: Math.round(bh) };
}
