// The tavern's guests use the same Power as their dossiers. Keep equal powers in
// catalogue order so refreshing a save never makes the room shuffle needlessly.
import type { Meta } from '../sim/meta';
import { kindPower } from '../sim/power';
import { ALL_HEROES } from '../sim/units';

/** Five physical gathering places; each hero keeps its own painted activity. */
export const TAVERN_SEATS = [
  { id: 'bar' }, { id: 'dice-left' }, { id: 'dice-right' },
  { id: 'hearth' }, { id: 'supper' },
] as const;

export const tavernGuestArt = (kind: string): string => `ui/tavern/${kind}-activity.webp`;

export { default as TAVERN_ACTIVITIES } from './tavernActivities.json';
import activities from './tavernActivities.json';

/** Find the closest compatible gathering places without moving anyone on refresh.
 * Search at most 120 arrangements; strongest guests win equally good ties. */
export function tavernPlaces(kinds: string[]): number[] {
  let best: number[] = [];
  let bestCost = Infinity;
  const visit = (places: number[], available: number[], cost: number): void => {
    if (cost >= bestCost) return;
    if (places.length === kinds.length) { best = places; bestCost = cost; return; }
    const kind = kinds[places.length] as keyof typeof activities;
    const preferred = TAVERN_SEATS.findIndex(place => place.id === activities[kind].place);
    for (const place of available) {
      // Both sides of the games table work for tabletop activities. Bar and
      // hearth are the other standing spaces; supper has room for a stool.
      const near = (preferred === 1 || preferred === 2) && (place === 1 || place === 2);
      const penalty = place === preferred ? 0 : near ? 1 : 3;
      visit([...places, place], available.filter(next => next !== place), cost + penalty);
    }
  };
  visit([], TAVERN_SEATS.map((_, i) => i), 0);
  return best;
}

export function tavernCompany(meta: Meta): { kind: string; power: number }[] {
  return ALL_HEROES.filter((kind) => meta.unlocked.includes(kind))
    .map((kind) => ({ kind, power: kindPower(meta, kind) }))
    .sort((a, b) => b.power - a.power)
    .slice(0, 5);
}
