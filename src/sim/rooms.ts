// The castle's rooms (DEPTH-BUILD, docs/notes/depth-design.md section 3): certain levels of a building open a room, a new thing the player
// can do or a choice the player makes. The castle keeps every number it had; rooms sit on top. `roomOpen` is the only question the rest
// of the game asks, so a room can move level with one line here. Pure data and rules: no Pixi, no DOM, no randomness.

import { siteLevel, siteName, siteTop, type Castle, type SiteId } from './castle';

export type RoomId =
  | 'fieldAnvil'
  | 'patchwork'
  | 'mastersMark'
  | 'readingRoom'
  | 'archive'
  | 'scriptorium'
  | 'vigil'
  | 'lastRites'
  | 'lookout'
  | 'nightWatch'
  | 'farSight'
  | 'sparringYard'
  | 'mentorSeat1'
  | 'mentorSeat2'
  | 'mentorSeat3'
  | 'mentorSeat4'
  | 'spellLectern';

export interface Room {
  id: RoomId;
  /** The building it stands in. */
  building: SiteId;
  /** The building's level that opens it. */
  level: number;
  name: string;
  /** What it lets you do, in one line for the building's card. */
  line: string;
  /** A small picture for the card's Rooms strip (a character the page shows until the pack icon is in: docs/notes/depth-art-todo.md). */
  icon: string;
}

const R = (id: RoomId, building: SiteId, level: number, name: string, line: string, icon: string): Room => ({ id, building, level, name, line, icon });

export const ROOMS: readonly Room[] = [
  R('fieldAnvil', 'smithy', 1, 'Field Anvil', 'Mend worn gear at the mid-boss camp, between waves, at the stall\'s price.', '⚒'),
  R('patchwork', 'smithy', 2, 'Patchwork', 'A broken piece keeps half its strength until it is mended.', '🧵'),
  R('mastersMark', 'smithy', 3, 'Master\'s Mark', 'Choose one hero each run whose gear does not wear.', '✦'),
  R('readingRoom', 'library', 2, 'Reading Room', 'Each student can queue a second book; it starts when the first is learnt.', '📚'),
  R('archive', 'library', 4, 'Archive', 'Every boss weakness clue you find is written in full at once.', '📜'),
  R('scriptorium', 'library', 5, 'Scriptorium', 'Read a book to a hero of another calling, at three quarters of its strength.', '🖋'),
  R('vigil', 'chapel', 2, 'Vigil', 'Choose how the party rises when a heart burns: Shielded, Swift or Cleansed.', '🕯'),
  R('lastRites', 'chapel', 3, 'Last Rites', 'Once a run, the first hero to fall in a wave rises at a quarter of health.', '✝'),
  R('lookout', 'watchtower', 1, 'Lookout', 'Opens the Scouted march: see the final boss and every wave\'s foes before they come.', '👁'),
  R('nightWatch', 'watchtower', 2, 'Night Watch', 'Opens the Night march: shorter shots below the heights, a moonlit chest.', '🌙'),
  R('farSight', 'watchtower', 3, 'Far Sight', 'Opens the roads on the march card; the card after each wave names the next foes.', '🧭'),
  R('sparringYard', 'barracks', 3, 'Sparring Yard', 'Two heroes spar while you are away, for bond points.', '⚔'),
  R('mentorSeat1', 'hall', 1, 'First Seat', 'A retired hero of level 60 or more can mentor their calling.', '🏛'),
  R('mentorSeat2', 'hall', 2, 'Second Seat', 'A second mentor, of another calling.', '🏛'),
  R('mentorSeat3', 'hall', 3, 'Third Seat', 'A third mentor, of another calling.', '🏛'),
  R('mentorSeat4', 'hall', 4, 'Fourth Seat', 'All four callings can have a mentor.', '🏛'),
  R('spellLectern', 'mageTower', 3, 'Spell Lectern', 'Carry a spare spell into an army run and swap it in at the mid-boss camp.', '📖'),
];

export const roomById = (id: RoomId): Room => ROOMS.find((r) => r.id === id)!;
/** The rooms of a building, in the order they open. */
export const roomsOf = (building: SiteId): Room[] => ROOMS.filter((r) => r.building === building).sort((a, b) => a.level - b.level);

/** Whether a room stands in this castle (the Chapel's level also from the old flag, when the caller passes it). */
export const roomOpen = (castle: Castle | undefined, id: RoomId, chapelFlag = false): boolean => {
  if (!castle) return false;
  const r = roomById(id);
  return siteLevel(castle, r.building, chapelFlag) >= r.level;
};

/** The rooms a level just raised has opened (for the toast: "The Smithy's Field Anvil is open"). */
export const roomsOpenedAt = (building: SiteId, level: number): Room[] => ROOMS.filter((r) => r.building === building && r.level === level);
export const roomToast = (r: Room): string => `The ${siteName(r.building)}'s ${r.name} is open`;

/** Every room's level is one its building can reach (a test checks it). */
export const roomReachable = (r: Room): boolean => r.level >= 1 && r.level <= siteTop(r.building);
