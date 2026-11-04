// The heroes earned by content: ten heroes that never come from a pull or a chest. They joined on a milestone of the game (an army's
// hard tier, the Last Stand, the calamity, the codex); now each joins at the end of a hero quest instead, a tale told in the tavern
// (`questData/tales.ts`: three since SECRET-HEROES, all ten since HERO-TALES-2), and every one of the ten is a secret until it joins
// (`secretHeroes.ts`). `grantContent` is called after a fight settles and when a save loads, and gives every hero whose tale is done
// (the hand-in brings it at once; a save loaded after it gets it then; one that already owns it keeps it). Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';
import { CONTENT_KINDS } from './unlockRules';
import { haveOf, needOf } from './unlock';
import { secretHint } from './secretHeroes';

export interface ContentHero {
  kind: string;
  /** The end of the line "Joins when you …". */
  line: string;
  met(m: Meta): boolean;
  /** How far on it is, for the ones that count up. */
  meter?(m: Meta): { now: number; need: number };
}

/** A hero who joins at the end of a hero quest: when its last part is handed in (the hand-in brings it in at once; this is for a save
 *  loaded after it). Their milestones were: the Werewolf the Beast Packs cleared, the Dread Pirate wave 20 of the Last Stand, the
 *  Juggernaut the Golem Forge on Hard; HERO-TALES-2: the Reaper the Undead Legion on Hard, the Demon Swordsman the Infernal Host on
 *  Hard, the Samurai Commander the Yokai Night Parade on Elite, the Tyrant wave 40 of the Last Stand, the Time Witch a Calamity cleared,
 *  the Queen Dragoon a Calamity cleared at ascension 3, the Great Sage half the bestiary met. Each tale opens about there. */
const tale = (title: string, last: string): Pick<ContentHero, 'line' | 'met'> => ({
  line: `see ${title} to its end`,
  met: (m) => !!m.quests?.done.includes(last),
});

export const CONTENT_HEROES: readonly ContentHero[] = [
  { kind: 'werewolf', ...tale('The Thing at the Fold', 'taleFoldNight') },
  { kind: 'reaper', ...tale('The Ledger of the Unburied', 'taleLedgerThirteen') },
  { kind: 'demonSwordsman', ...tale('The Pawned Blade', 'talePawnCollectors') },
  { kind: 'samuraiCommander', ...tale('The Banner in the Mist', 'taleBannerNight') },
  { kind: 'juggernaut', ...tale('The Iron Pilgrim', 'taleIronMarch') },
  { kind: 'dreadPirate', ...tale('A Sellsword in Chains', 'taleChainsTide') },
  { kind: 'tyrant', ...tale('The Second Throne', 'taleThroneAppeal') },
  { kind: 'timeWitch', ...tale("Yesterday's Visitor", 'taleClockHour') },
  { kind: 'dragoon', ...tale('The Scorched Eyrie', 'taleEyrieNest') },
  { kind: 'sage', ...tale('The Fallen Star', 'taleStarHome') },
];

export const contentOf = (kind: string): ContentHero | undefined => CONTENT_HEROES.find((c) => c.kind === kind);

/** Give every content hero whose milestone is met and that is not owned yet. Returns the kinds that joined (in list order). */
export function grantContent(m: Meta): string[] {
  const joined: string[] = [];
  for (const c of CONTENT_HEROES) {
    if (m.unlocked.includes(c.kind) || !c.met(m)) continue;
    m.unlocked.push(c.kind);
    delete m.unlock?.[c.kind];
    joined.push(c.kind);
  }
  return joined;
}

if (CONTENT_HEROES.map((c) => c.kind).join() !== CONTENT_KINDS.join()) throw new Error('CONTENT_HEROES and CONTENT_KINDS differ');

/** What a hero not owned shows: a line, and a bar (`need` 0 for none). `named` is whether its name is shown (a hero to collect shows
 *  its name once its bar is begun; a hero earned in play is a secret, SECRET-HEROES: no name, no bar, and only a vague hint). */
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
  if (c) return { line: secretHint(kind), now: 0, need: 0, named: false, short: 'A secret' };
  const have = haveOf(m, kind);
  const need = needOf(m);
  return have
    ? { line: `${have} of ${need} shards: pull it at the Recruit tab`, now: have, need, named: true, short: `${have}/${need} shards` }
    : { line: 'Not recruited yet: its shards come from summoning stones', now: 0, need, named: false, short: 'Not recruited' };
}
