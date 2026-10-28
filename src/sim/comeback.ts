// "How to come back stronger": after a real defeat (no heart left to burn), a few short pointers drawn from the save itself,
// each with a way to the screen that does it. The town's voice, but brief: what is wrong, and what to tap. At most four, the
// most useful first; never fewer than two (the plain advice fills in when the save has nothing else to say).
//
// Pure rules: no Pixi, no DOM, no randomness. The page shows them on the run recap (`recapView.ts`).

import { ARMIES, armyById, armyCleared, armyUnlocked, type Army } from './armies';
import { BUILDING_IDS, BUILDINGS, nextCost } from './castle';
import { bestFor } from './equipment';
import { levelOfKind } from './levels';
import { pullCost, type Meta } from './meta';
import { modeOpen } from './modeUnlock';
import { readyToRise } from './rankUp';
import { roleOf } from './suggest';
import { canLearn, pointsFree, TREES } from './talents';
import { countTraits, traitsOf } from './traits';
import { TIERS, tierOf } from './tiers';
import { UNITS } from './units';

/** Where a pointer's button goes: a tab of the home screen, a hero's sheet (on a tab), or the armies (on a card). */
export type ComebackGo =
  | { to: 'heroes'; hero?: string; tab?: 'progression' | 'equipment' }
  | { to: 'armies'; army?: string }
  | { to: 'recruit' }
  | { to: 'castle' }
  | { to: 'chests' }
  | { to: 'party' };

export interface ComebackTip {
  /** What kind of pointer it is (one of each at most). */
  id: 'train' | 'easier' | 'rank' | 'talents' | 'gear' | 'chests' | 'castle' | 'summon' | 'synergy' | 'front' | 'ground' | 'again';
  text: string;
  /** The button's words and where it goes (none for the plain advice). */
  button?: string;
  go?: ComebackGo;
}

export interface ComebackContext {
  /** The army the run fought, if it was an army's. */
  army?: string;
  /** The tier it was fought on (Normal when unset). */
  tier?: number;
  /** The party that fell (hero kinds). */
  party: readonly string[];
}

/** The hero level each tier is meant for at its entry (`docs/notes/difficulty.md`): Normal is the army's own level. */
export const TIER_ENTRY: readonly number[] = [0, 25, 45, 65, 85];

/** The hero level an army is meant for on a tier. */
export const meantLevel = (a: Army, tier = 0): number => Math.max(a.level, TIER_ENTRY[Math.max(0, Math.min(TIER_ENTRY.length - 1, tier))]);

/** The party's level: the average of its heroes' lasting levels, rounded down (1 for an empty party). */
export function partyLevel(m: Meta, party: readonly string[]): number {
  const kinds = party.filter((k) => UNITS[k]);
  if (!kinds.length) return 1;
  return Math.floor(kinds.reduce((n, k) => n + levelOfKind(m, k), 0) / kinds.length);
}

/** How far under its level a party may be before training is the first thing said. */
export const UNDER_BY = 2;

const nameOf = (kind: string): string => UNITS[kind]?.name ?? kind;
/** "the Undead Legion", but "The Wildwood" keeps its own article. */
const the = (a: Army, start = false): string => (/^The /.test(a.name) ? (start ? a.name : a.name.replace(/^The /, 'the ')) : `${start ? 'The' : 'the'} ${a.name}`);

/** The pointers for a defeat, most useful first: at most `max` (four), at least two. */
export function comebackTips(m: Meta, ctx: ComebackContext, max = 4): ComebackTip[] {
  const out: ComebackTip[] = [];
  const party = ctx.party.filter((k) => UNITS[k]);
  const army = ctx.army ? armyById(ctx.army) : undefined;
  const tier = Math.max(0, Math.min(TIERS.length - 1, ctx.tier ?? 0));
  const level = partyLevel(m, party);
  const meant = army ? meantLevel(army, tier) : 0;
  const under = !!army && level + UNDER_BY <= meant;

  // (too low for the army: train first, and say where the XP is easier to come by)
  if (army && under) {
    out.push({ id: 'train', text: `Train your heroes: ${the(army)} ${tier ? `on ${tierOf(tier).name} ` : ''}is meant for level ${meant}, and your party averages level ${level}.`, button: 'Heroes', go: { to: 'heroes' } });
    if (tier > 0) out.push({ id: 'easier', text: `Drop back to ${tierOf(tier - 1).name} for a while. The XP still counts, and so does your dignity.`, button: 'Armies', go: { to: 'armies', army: army.id } });
    else {
      // (the strongest army the party is already up to, a cleared one first: the place to farm)
      const easier = ARMIES.filter((a) => a.id !== army.id && armyUnlocked(m, a.id) && a.level < army.level && a.level <= level + UNDER_BY).sort((x, y) => Number(armyCleared(m, y.id)) - Number(armyCleared(m, x.id)) || y.level - x.level)[0];
      if (easier) out.push({ id: 'easier', text: `Farm ${the(easier)} (level ${easier.level}) for XP and crowns, then come back with a grudge.`, button: 'Armies', go: { to: 'armies', army: easier.id } });
    }
  }

  // (strength the save has earned but not taken: a rank or an awakening, talent points, better gear in the bag)
  const rise = party.find((k) => readyToRise(m, k));
  if (rise) out.push({ id: 'rank', text: `${nameOf(rise)} has a rank-up waiting. It is free strength; take it.`, button: 'Rank up', go: { to: 'heroes', hero: rise, tab: 'progression' } });
  const thinker = party.find((k) => TREES[k] && pointsFree(m, k) > 0 && TREES[k].nodes.some((n) => canLearn(m, k, n.id)));
  if (thinker) out.push({ id: 'talents', text: `${nameOf(thinker)} has ${pointsFree(m, thinker)} talent ${pointsFree(m, thinker) === 1 ? 'point' : 'points'} unspent. Points in the pocket stop no axes.`, button: 'Talents', go: { to: 'heroes', hero: thinker, tab: 'progression' } });
  const dresser = party.find((k) => Object.keys(bestFor(m, k).slots).length > 0);
  if (dresser) out.push({ id: 'gear', text: `${nameOf(dresser)} could wear better gear than they fell in. It is sitting in the bag.`, button: 'Gear', go: { to: 'heroes', hero: dresser, tab: 'equipment' } });

  // (things bought with what the save holds: chests on the cart, a castle upgrade, a summon)
  if (m.stash.length) out.push({ id: 'chests', text: `${m.stash.length} unopened ${m.stash.length === 1 ? 'chest is' : 'chests are'} on the cart. They will not open themselves.`, button: 'Chests', go: { to: 'chests' } });
  if (modeOpen(m, 'castle') && !m.works) {
    const build = BUILDING_IDS.filter((id) => {
      const c = nextCost(m.castle, id);
      return c !== null && m.crowns >= c;
    }).sort((a, b) => (nextCost(m.castle, a) ?? 0) - (nextCost(m.castle, b) ?? 0))[0];
    if (build) out.push({ id: 'castle', text: `You can afford the next ${BUILDINGS[build].name}. Every run after this one gets it.`, button: 'Castle', go: { to: 'castle' } });
  }
  if (m.crowns >= pullCost(1)) out.push({ id: 'summon', text: `${m.crowns} crowns doing nothing. A summon might find a hero who does something.`, button: 'Summon', go: { to: 'recruit' } });

  // (the party itself: a synergy one hero short, with an owned hero who would wake it; no one at the front)
  const benched = m.unlocked.filter((k) => !party.includes(k) && UNITS[k]);
  for (const c of countTraits(party)) {
    const next = c.trait.tiers[c.tier + 1];
    if (!next || next.need - c.count !== 1) continue;
    const who = benched.find((k) => traitsOf(k).includes(c.trait.id));
    if (!who) continue;
    out.push({ id: 'synergy', text: `One more ${c.trait.name} hero wakes "${next.text}". ${nameOf(who)} is right there, doing nothing in particular.`, button: 'Party', go: { to: 'party' } });
    break;
  }
  if (party.length && !party.some((k) => roleOf(k) === 'front')) out.push({ id: 'front', text: 'Nobody stood at the front. Bring a sturdy hero to take the blows, and keep the shooters behind them.', button: 'Party', go: { to: 'party' } });

  // (the plain advice, when the save has little else to say)
  out.push({ id: 'ground', text: 'Tanks in the front row, shooters on high ground. The hills are there for a reason.' });
  out.push({ id: 'again', text: 'Your heroes keep every level they earned. Each loss is XP with a bruise on it.' });
  return out.slice(0, Math.max(2, max));
}
