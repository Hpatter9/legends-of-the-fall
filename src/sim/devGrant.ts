// The developer grant in Settings (the owner's ask, for testing the game): crowns, shards of every hero, or summoning
// stones, a hundred or a thousand a tap. Pure rules on the meta; the page saves it and redraws.

import { BUILDING_IDS, maxLevel } from './castle';
import { stonesOf, type Meta } from './meta';
import { giveShards } from './unlock';
import { ALL_HEROES } from './units';

export type DevGift = 'crowns' | 'shards' | 'stones' | 'town';

/** Add `n` crowns, `n` summoning stones, or `n` shards of every hero (rank shards for one owned, unlock shards for one not, so it may join;
 *  shards past a hero's cap turn to crowns, as a pull's do). Returns a line saying what was given. */
export function devGrant(m: Meta, what: DevGift, n: number): string {
  if (what === 'town') return buildTown(m);
  if (what === 'crowns') {
    m.crowns += n;
    return `+${n} crowns`;
  }
  if (what === 'stones') {
    m.stones = stonesOf(m) + n;
    return `+${n} summoning stones`;
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

/** Build Town (moved from the Castle tab to Settings › Developer, 0.437.0's follow-up; unchanged): each of the six upgrades one level up,
 *  one at its top level back to 1 (so a tap walks through the looks), the Chapel built, and at least 5000 crowns. It opens the castle's
 *  gate as well (FIRST-HOUR: the Castle tab's own preview button is gone, so this is the one testing door), kept open as an old save's is. */
export function buildTown(m: Meta): string {
  for (const id of BUILDING_IDS) {
    const cur = m.castle[id] ?? 0;
    m.castle[id] = cur >= maxLevel(id) ? 1 : cur + 1;
  }
  m.chapel = true;
  m.crowns = Math.max(m.crowns, 5000);
  if (!m.opened?.includes('castle')) m.opened = [...(m.opened ?? []), 'castle'];
  return 'Built the town: the gate open, every upgrade one level up, the Chapel built';
}
