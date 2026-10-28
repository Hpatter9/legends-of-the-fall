// The developer grant in Settings (the owner's ask, for testing the game): crowns, or shards of every hero, a hundred or a
// thousand a tap. Pure rules on the meta; the page saves it and redraws.

import type { Meta } from './meta';
import { giveShards } from './unlock';
import { ALL_HEROES } from './units';

export type DevGift = 'crowns' | 'shards';

/** Add `n` crowns, or `n` shards of every hero (rank shards for one owned, unlock shards for one not, so it may join;
 *  shards past a hero's cap turn to crowns, as a pull's do). Returns a line saying what was given. */
export function devGrant(m: Meta, what: DevGift, n: number): string {
  if (what === 'crowns') {
    m.crowns += n;
    return `+${n} crowns`;
  }
  let joined = 0;
  let crowns = 0;
  for (const kind of ALL_HEROES) {
    const g = giveShards(m, kind, n);
    if (g.joined) joined++;
    crowns += g.crowns;
  }
  return `+${n} shards to every hero` + (joined ? `, ${joined} joined` : '') + (crowns ? `, ${crowns} crowns from full heroes` : '');
}
