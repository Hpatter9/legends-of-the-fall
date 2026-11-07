// The tavern's guests use the same Power as their dossiers. Keep equal powers in
// catalogue order so refreshing a save never makes the room shuffle needlessly.
import type { Meta } from '../sim/meta';
import { kindPower } from '../sim/power';
import { ALL_HEROES } from '../sim/units';

/** Two paintings per hero can occupy any of these five compatible seats. */
export const TAVERN_SEATS = [
  { id: 'front-left', facing: 'right' },
  { id: 'front-right', facing: 'left' },
  { id: 'rear-left', facing: 'right' },
  { id: 'rear-centre', facing: 'right' },
  { id: 'rear-right', facing: 'left' },
] as const;

export const tavernGuestArt = (kind: string, place: number): string =>
  `ui/tavern/${kind}-${TAVERN_SEATS[place].facing}.webp`;

export function tavernCompany(meta: Meta): { kind: string; power: number }[] {
  return ALL_HEROES.filter((kind) => meta.unlocked.includes(kind))
    .map((kind) => ({ kind, power: kindPower(meta, kind) }))
    .sort((a, b) => b.power - a.power)
    .slice(0, 5);
}
