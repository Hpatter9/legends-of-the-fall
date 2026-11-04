// A quest's reward in plain words (moved here from `questCard.ts` for SECRET-HEROES, so the tests can read what a screen says): "120
// crowns · 2 stones · a bronze chest · 3 of Selam's shards". Given the save, a secret hero is never named: its shards read as the stones
// they pay (`payReward`), and a hero quest's hero as its tease ("the stranger joins your company"), or the other reward once the save has
// it. Pure: no Pixi, no DOM.

import { ORES } from './awakenMats';
import { bookById } from './bookData';
import { heroName } from './heroNames';
import type { Meta } from './meta';
import type { Reward } from './questData';
import { isSecret } from './secretHeroes';
import { tomeWords, type TomeSize } from './tomes';

export function rewardWords(r: Reward, m?: Pick<Meta, 'unlocked'>): string {
  // (a hero quest's end, for a save that has its hero already: what it pays instead)
  if (r.hero && m?.unlocked.includes(r.hero.kind)) {
    const { hero: _, ...rest } = r;
    return [rewardWords(rest, m), rewardWords(r.hero.instead, m)].filter(Boolean).join(' · ');
  }
  const parts: string[] = [];
  if (r.hero) parts.push(r.hero.tease);
  if (r.crowns) parts.push(`${r.crowns} crowns`);
  // (a secret hero's shards are paid as stones until it joins)
  const secretShards = r.shards && (!m || isSecret(m, r.shards.kind)) ? r.shards.n : 0;
  const stones = (r.stones ?? 0) + secretShards;
  if (stones) parts.push(`${stones} stone${stones === 1 ? '' : 's'}`);
  if (r.chest) parts.push(`a ${r.chest} chest`);
  for (const o of r.ores ?? []) parts.push(`${o.n} ${ORES[o.trait]?.name ?? 'ore'}`);
  for (const [size, n] of Object.entries(r.tomes ?? {})) if (n) parts.push(tomeWords(size as TomeSize, n));
  if (r.shards && !secretShards) parts.push(`${r.shards.n} of ${heroName(r.shards.kind)}'s shards`);
  if (r.book) parts.push(`the book ${bookById(r.book)?.title ?? 'of a lost technique'}`);
  if (r.keepsake) parts.push(`a keepsake`);
  return parts.join(' · ');
}
