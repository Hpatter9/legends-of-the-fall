// The heroes earned by content: ten heroes that never come from a pull or a chest and join on a milestone of the game
// (an army's hard tier, the tower, the calamity, the codex), each one a hero that suits the thing it is earned from.
// `grantContent` is called after a fight settles and when a save loads, and gives every hero whose milestone is met
// (a save that has already met one gets the hero at once; one that already owns it keeps it). Pure rules: no Pixi, no DOM.

import { armyCleared } from './armies';
import { tierCleared } from './autoReplay';
import { ascCleared } from './ascension';
import { gotOf, totalOf } from './codex';
import type { Meta } from './meta';
import { CONTENT_KINDS } from './unlockRules';
import { haveOf, needOf } from './unlock';

export interface ContentHero {
  kind: string;
  /** The end of the line "Joins when you …". */
  line: string;
  met(m: Meta): boolean;
  /** How far on it is, for the ones that count up. */
  meter?(m: Meta): { now: number; need: number };
}

// (the names are written out: this module is read while `meta.ts` loads, before the armies are)
const clearOn = (army: string, name: string, tier: number): Pick<ContentHero, 'line' | 'met'> => ({
  line: `clear the ${name}${tier ? ` on ${TIER_NAMES[tier]}` : ''}`,
  met: (m) => (tier ? tierCleared(m, army, tier) : armyCleared(m, army)),
});
const TIER_NAMES = ['Normal', 'Hard', 'Elite', 'Legendary'];
const floors = (n: number): Pick<ContentHero, 'line' | 'met' | 'meter'> => ({
  line: `clear ${n} floors of the endless tower`,
  met: (m) => m.tower >= n,
  meter: (m) => ({ now: Math.min(n, m.tower), need: n }),
});
/** The foes met in the bestiary that earn the Sage: half of them. */
const SEEN_SHARE = 0.5;
const seenNeed = (): number => Math.ceil(totalOf('bestiary') * SEEN_SHARE);

export const CONTENT_HEROES: readonly ContentHero[] = [
  { kind: 'werewolf', ...clearOn('beasts', 'Beast Packs', 0) },
  { kind: 'reaper', ...clearOn('undead', 'Undead Legion', 1) },
  { kind: 'demonSwordsman', ...clearOn('infernal', 'Infernal Host', 1) },
  { kind: 'samuraiCommander', ...clearOn('yokai', 'Yokai Night Parade', 2) },
  { kind: 'juggernaut', ...clearOn('golems', 'Golem Forge', 1) },
  { kind: 'dreadPirate', ...floors(20) },
  { kind: 'tyrant', ...floors(40) },
  { kind: 'timeWitch', line: 'clear a Calamity whole', met: (m) => (m.calamity?.clears ?? 0) > 0 },
  { kind: 'dragoon', line: 'clear a Calamity at ascension 3', met: (m) => ascCleared(m) >= 3, meter: (m) => ({ now: Math.max(0, Math.min(3, ascCleared(m))), need: 3 }) },
  { kind: 'sage', line: 'meet half the foes of the bestiary', met: (m) => gotOf(m, 'bestiary') >= seenNeed(), meter: (m) => ({ now: Math.min(seenNeed(), gotOf(m, 'bestiary')), need: seenNeed() }) },
];

export const contentOf = (kind: string): ContentHero | undefined => CONTENT_HEROES.find((c) => c.kind === kind);

/** Give every content hero whose milestone is met and that is not owned yet. Returns the kinds that joined (in list order). */
export function grantContent(m: Meta): string[] {
  const joined: string[] = [];
  for (const c of CONTENT_HEROES) {
    if (m.unlocked.includes(c.kind) || !c.met(m)) continue;
    m.unlocked.push(c.kind);
    joined.push(c.kind);
  }
  return joined;
}

if (CONTENT_HEROES.map((c) => c.kind).join() !== CONTENT_KINDS.join()) throw new Error('CONTENT_HEROES and CONTENT_KINDS differ');

/** What a hero not owned shows: a line, and a bar (`need` 0 for none). `named` is whether its name is shown (a content hero's is, to work towards; a hero to collect shows its name once its bar is begun). */
export interface LockInfo {
  line: string;
  now: number;
  need: number;
  named: boolean;
  /** A short form for a small card. */
  short: string;
}
export function lockInfo(m: Meta, kind: string): LockInfo | null {
  if (m.unlocked.includes(kind)) return null;
  const c = contentOf(kind);
  if (c) {
    const meter = c.meter?.(m);
    return { line: `Joins when you ${c.line}`, now: meter?.now ?? 0, need: meter?.need ?? 0, named: true, short: 'Earned in play' };
  }
  const have = haveOf(m, kind);
  const need = needOf(m);
  return have
    ? { line: `${have} of ${need} shards: pull it at the Recruit tab`, now: have, need, named: true, short: `${have}/${need} shards` }
    : { line: 'Not recruited yet: its shards come from pulls and chests', now: 0, need, named: false, short: 'Not recruited' };
}
