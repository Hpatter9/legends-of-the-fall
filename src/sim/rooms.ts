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
  | 'spellLectern'
  | 'bloodedDrill'
  | 'veteranDrill';

export interface Room {
  id: RoomId;
  /** The building it stands in. */
  building: SiteId;
  /** The building's level that opens it. */
  level: number;
  name: string;
  /** What it lets you do, in one line for the building's card. */
  line: string;
  /** The name of the room's icon (src/art/rooms/<icon>.webp; `roomIcon` in castle.ts maps it to the picture, so this file stays free of the page). */
  icon: string;
}

const R = (id: RoomId, building: SiteId, level: number, name: string, line: string, icon: string): Room => ({ id, building, level, name, line, icon });

export const ROOMS: readonly Room[] = [
  R('fieldAnvil', 'smithy', 1, 'Field Anvil', 'Mend worn gear at the mid-boss camp, between waves, at the stall\'s price.', 'anvil'),
  R('patchwork', 'smithy', 2, 'Patchwork', 'A broken piece keeps half its strength until it is mended.', 'thread'),
  R('mastersMark', 'smithy', 3, 'Master\'s Mark', 'Choose one hero each run whose gear does not wear.', 'mark'),
  R('readingRoom', 'library', 2, 'Reading Room', 'Each student can queue a second book; it starts when the first is learnt.', 'books'),
  R('archive', 'library', 4, 'Archive', 'Every boss weakness clue you find is written in full at once.', 'scroll'),
  R('scriptorium', 'library', 5, 'Scriptorium', 'Read a book to a hero of another calling, at three quarters of its strength.', 'quill'),
  R('vigil', 'chapel', 2, 'Vigil', 'Choose how a hero rises when a life raises it: Shielded, Swift or Cleansed.', 'candle'),
  R('lastRites', 'chapel', 3, 'Last Rites', 'Once a run, the first hero to fall in a wave rises at 15% of health after 10 s.', 'cross'),
  R('lookout', 'watchtower', 1, 'Lookout', 'Opens the Scouted march: see the final boss and every wave\'s foes before they come.', 'eye'),
  R('nightWatch', 'watchtower', 2, 'Night Watch', 'Opens the Night march: shorter shots below the heights, a moonlit chest.', 'moon'),
  R('farSight', 'watchtower', 3, 'Far Sight', 'Opens the roads on the march card; the card after each wave names the next foes.', 'compass'),
  R('sparringYard', 'barracks', 3, 'Sparring Yard', 'Two heroes spar while you are away, for bond points.', 'crossed-swords'),
  R('mentorSeat1', 'hall', 1, 'First Seat', 'A retired hero of level 60 or more can mentor their calling.', 'plinth'),
  R('mentorSeat2', 'hall', 2, 'Second Seat', 'A second mentor, of another calling.', 'plinth'),
  R('mentorSeat3', 'hall', 3, 'Third Seat', 'A third mentor, of another calling.', 'plinth'),
  R('mentorSeat4', 'hall', 4, 'Fourth Seat', 'All four callings can have a mentor.', 'plinth'),
  R('bloodedDrill', 'drillYard', 1, 'Blooded Drill', 'The Assault\'s new recruits join Blooded (one mark: +8% health and attack).', 'drill-blooded'),
  R('veteranDrill', 'drillYard', 2, 'Veteran Drill', 'The Assault\'s new recruits join as Veterans (three marks: +16% health and attack).', 'drill-veteran'),
  R('spellLectern', 'mageTower', 3, 'Spell Lectern', 'Carry a spare spell into an army run and swap it in at the mid-boss camp.', 'lectern'),
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
