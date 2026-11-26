// STORE-KIT: the save the listing's pictures are taken from (`tools/store-ready/shots.mjs`): the Hall of Heroes' collector (24 heroes at
// ranks 1 to 4, every army cleared once, level 70: `tools/hall/saves.ts`) with the Nemesis War's Council of eight (`tools/nemesis/saves.ts`),
// stones for a ten-summon, and every tutorial seen.
import { meta as hallMeta } from '../hall/saves';
import { meta as warMeta } from '../nemesis/saves';

export function meta() {
  const m = hallMeta();
  m.war = warMeta().war;
  m.stones = 40;
  m.crowns = 48000;
  // (the spell slots its stars opened, already told: no notice over the pictures)
  m.slotsTold = 4;
  return m;
}
