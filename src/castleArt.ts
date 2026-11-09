// CASTLE-REMAKE (docs/notes/castle-remake.md): the castle's paintings, named by file, and where each place stands on the courtyard.
// The owner's art is cut by tools/castle-remake/cut.py into src/art/castle-remake/ (served as ui/castle/<name>.webp by build.mjs, cached
// for offline); its manifest says which names are painted. A name not painted yet keeps its stand-in: the courtyard's plain stand-in file,
// the old building sprite (the caller passes it), the old pixel throne room. Plain data: no DOM, no Pixi, so the tests can import it.

import manifest from './art/castle-remake/manifest.json';
import type { SiteId } from './sim/castle';

/** Every picture the remake asks for (docs/notes/castle-remake-art-prompts.md), by its file name. */
export const CASTLE_ART_NAMES = ['courtyard', 'throne-hall', 'treasury', 'armoury', 'barracks', 'mageTower', 'stable', 'library', 'chapel', 'smithy', 'watchtower', 'hall', 'drillYard', 'site'] as const;
export type CastleArtName = (typeof CASTLE_ART_NAMES)[number];

const painted = new Set<string>((manifest as { painted: string[] }).painted);

/** Whether the owner's painting of this name has landed (cut and listed in the manifest). */
export const isPainted = (name: CastleArtName): boolean => painted.has(name);

/** The file of a castle picture (the courtyard and the hall always have one: a stand-in until the painting lands). */
export const castleArtUrl = (name: CastleArtName): string => `ui/castle/${name}.webp`;

/** A building's picture on the courtyard and at the head of its card: its painting once it lands, else the stand-in given. */
export const buildingArt = (id: SiteId, standIn: string): string => (isPainted(id) ? castleArtUrl(id) : standIn);

/** A place on the courtyard: its plot's centre in shares of the painting (the building's foot stands on it), and how wide the building
 *  is drawn, as a share of the painting's width. The same points as the prompt's eleven plots. */
export interface Plot {
  id: SiteId;
  x: number;
  y: number;
  w: number;
}

/** The eleven plots: the two corner bastions, then three rows of three down to the gate (the Drill Yard is the parade ground in the
 *  middle of the last row). Read top to bottom, so the nearer (lower) buildings are drawn over the farther. */
export const PLOTS: readonly Plot[] = [
  { id: 'watchtower', x: 0.15, y: 0.2, w: 0.22 },
  { id: 'mageTower', x: 0.85, y: 0.2, w: 0.22 },
  { id: 'chapel', x: 0.18, y: 0.37, w: 0.24 },
  { id: 'treasury', x: 0.5, y: 0.37, w: 0.24 },
  { id: 'hall', x: 0.82, y: 0.37, w: 0.24 },
  { id: 'library', x: 0.18, y: 0.54, w: 0.24 },
  { id: 'barracks', x: 0.5, y: 0.54, w: 0.24 },
  { id: 'armoury', x: 0.82, y: 0.54, w: 0.24 },
  { id: 'smithy', x: 0.18, y: 0.71, w: 0.24 },
  { id: 'drillYard', x: 0.5, y: 0.71, w: 0.3 },
  { id: 'stable', x: 0.82, y: 0.71, w: 0.24 },
];

/** The keep's doors (a tap goes down to the throne hall), in shares of the painting. */
export const KEEP_SPOT = { x: 0.5, y: 0.13, w: 0.4, h: 0.2 } as const;

/** What a place's plaque says under its building: built and its level, the price to build when it stands empty, the builders' clock
 *  while they work there, or "Full". `ready` lights the plaque (affordable, builders free); `site` shows the building site. */
export interface PlaqueState {
  line: string;
  ready: boolean;
  site: boolean;
  working: boolean;
  full: boolean;
}

export function plaqueState(level: number, top: number, cost: number | null, crowns: number, worksHere: boolean, worksElsewhere: boolean, clock: string): PlaqueState {
  if (worksHere) return { line: clock, ready: false, site: true, working: true, full: false };
  if (cost === null) return { line: `Lv ${level} · Full`, ready: false, site: false, working: false, full: true };
  const ready = !worksElsewhere && crowns >= cost;
  if (level === 0) return { line: `Build · ${cost}`, ready, site: true, working: false, full: false };
  return { line: `Lv ${level}/${top}${ready ? ' · ▲' : ''}`, ready, site: false, working: false, full: false };
}
