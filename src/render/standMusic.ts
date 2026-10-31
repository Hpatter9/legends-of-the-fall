// The Last Stand's music by room (STAND-RETREAT): the one hook the music can take the retreat's acts from. Today every room plays the run's
// own battle track (`standTrack`, kept from the first wave to the king's fall, as the battle music's rule asks; a boss wave the boss track), and the music player has no
// levels of intensity to step up through the acts. When a room should sound different (the throne room taking the boss arrangement of the
// main theme, say), name its track here; nothing else in the Last Stand needs to change. Pure: no Web Audio, no DOM.

import type { HallKind } from '../sim/standHalls';
import type { MusicId } from './epicMusic';
import { standTrack } from './battleMusic';

/** A room's own track, or null for the run's battle track. */
export const ROOM_TRACK: Record<HallKind, MusicId | null> = { courtyard: null, library: null, chapel: null, hall: null };

/** The track the Last Stand plays in room `hall` of the run with `seed`: a boss wave's is the boss track in any room. */
export const standRoomTrack = (seed: number, hall: HallKind, boss = false): MusicId => (boss ? standTrack(seed, true) : ROOM_TRACK[hall] ?? standTrack(seed));
