// The room icons (src/art/rooms/, cut by tools/castle/import-room-art.py): `Room.icon` in src/sim/rooms.ts names one; bundled into game.js as data URLs.
import anvilUrl from './art/rooms/anvil.webp';
import threadUrl from './art/rooms/thread.webp';
import markUrl from './art/rooms/mark.webp';
import booksUrl from './art/rooms/books.webp';
import scrollUrl from './art/rooms/scroll.webp';
import quillUrl from './art/rooms/quill.webp';
import candleUrl from './art/rooms/candle.webp';
import crossUrl from './art/rooms/cross.webp';
import eyeUrl from './art/rooms/eye.webp';
import moonUrl from './art/rooms/moon.webp';
import compassUrl from './art/rooms/compass.webp';
import crossedSwordsUrl from './art/rooms/crossed-swords.webp';
import plinthUrl from './art/rooms/plinth.webp';
import lecternUrl from './art/rooms/lectern.webp';
import drillBloodedUrl from './art/rooms/drill-blooded.webp';
import drillVeteranUrl from './art/rooms/drill-veteran.webp';

const ICONS: Record<string, string> = {
  'anvil': anvilUrl,
  'thread': threadUrl,
  'mark': markUrl,
  'books': booksUrl,
  'scroll': scrollUrl,
  'quill': quillUrl,
  'candle': candleUrl,
  'cross': crossUrl,
  'eye': eyeUrl,
  'moon': moonUrl,
  'compass': compassUrl,
  'crossed-swords': crossedSwordsUrl,
  'plinth': plinthUrl,
  'lectern': lecternUrl,
  'drill-blooded': drillBloodedUrl,
  'drill-veteran': drillVeteranUrl,
};

/** The picture of a room's icon, for a card's Rooms strip (greyed by CSS until the room is open). */
export function roomIcon(name: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = 'ctRoomIco';
  img.src = ICONS[name] ?? '';
  img.alt = '';
  img.draggable = false;
  return img;
}

/** Every icon name this file holds (a test checks that each room's icon is one of them). */
export const ROOM_ICON_NAMES: readonly string[] = Object.keys(ICONS);
