// ARMY-WEAKNESS (docs/notes/army-weakness.md): every army of the War Room is weak to one or two hero classes and resists one or two. Its foes
// take more harm from a hero of a class it is weak to (x1.3) and less from one it resists (x0.85), so each army calls for a different team.
//
// - What it touches: damage only, every kind a hero is credited with (its blows, its skills, its ailments' ticks, its summons' blows, read
//   through `creditOf`). Not ailments' chances, not crowd control, not healing.
// - Where: an army run's waves (`Battle.foeArmy`, set by `startStage` for an army run), never a duel (its ~60% band is tuned without it,
//   DUEL-FAIR), never the daily, the Last Stand, the Calamity or a quest.
// - The switch: `ARMY_WEAKNESS.on` (as `TRAIT_PERKS`): off, the fights play out exactly as before, for the recorded fights and the measures.
//
// Deterministic: no stream is drawn from. Pure rules: no Pixi, no DOM.

import { traitsOf } from './traits';

/** The switch (tools and tests turn it off to measure the fights without it). */
export const ARMY_WEAKNESS: { on: boolean } = { on: true };

/** What a weakness and a resistance do to the harm a hero's side deals the army's foes. */
export const WEAK_MULT = 1.3;
export const RESIST_MULT = 0.85;

export interface ArmyMatch {
  /** The classes it is weak to, and why (a short line for the card and the codex). */
  weak: readonly string[];
  resist: readonly string[];
  why: string;
}

/** Every army's weaknesses and resistances, by hero class (the class trait, `HERO_TRAITS`' second). */
export const ARMY_MATCH: Readonly<Record<string, ArmyMatch>> = {
  orcs: { weak: ['trickster', 'marksman'], resist: ['beast'], why: 'Brutes who charge in a mob: tricked and shot down before they close, and a match for any beast in a brawl.' },
  undead: { weak: ['support', 'guardian'], resist: ['assassin', 'marksman'], why: 'Holy light and a shield to the bones break them; arrows rattle through their ribs, and poison finds no blood.' },
  beasts: { weak: ['warden', 'caster'], resist: ['trickster'], why: 'They fear the wardens’ wards and fire; their noses find every trick.' },
  wildwood: { weak: ['blade', 'gunner'], resist: ['warden'], why: 'Steel fells the grove and powder frightens it; the wild’s own wardens will not harm it.' },
  labyrinth: { weak: ['bulwark', 'assassin'], resist: ['vanguard'], why: 'A shield turns the gorgon’s gaze and a knife waits at every corner; a charge meets a minotaur’s horns.' },
  ogres: { weak: ['arcanist', 'vanguard'], resist: ['blade'], why: 'Dim wits fall to spells and a lance brings a giant down; blades bite shallow in their hides.' },
  infernal: { weak: ['arcanist', 'warden'], resist: ['caster'], why: 'Banishing runes and holy wards drive the demons back; the pit’s fire is their own.' },
  yokai: { weak: ['bulwark', 'beast'], resist: ['trickster', 'assassin'], why: 'Temple bells and the hounds’ noses find the spirits; no trick or knife in the dark fools them.' },
  golems: { weak: ['caster', 'gunner'], resist: ['blade', 'marksman'], why: 'Fire and blasting powder crack the stone; blades and arrows glance off.' },
};

/** A hero kind's class (its class trait). */
export const classOf = (kind: string): string | undefined => traitsOf(kind)[1];

export type Match = 'weak' | 'resist';

/** Whether an army is weak to a hero kind, resists it, or neither. */
export function matchOf(army: string | undefined, kind: string): Match | undefined {
  const m = army ? ARMY_MATCH[army] : undefined;
  const c = classOf(kind);
  if (!m || !c) return undefined;
  if (m.weak.includes(c)) return 'weak';
  if (m.resist.includes(c)) return 'resist';
  return undefined;
}

/** The multiplier on a hero's harm to the army's foes. */
export const matchMult = (m: Match | undefined): number => (m === 'weak' ? WEAK_MULT : m === 'resist' ? RESIST_MULT : 1);

/**
 * The fight's hook (`hurt`): the match of a blow from the hero side (`hero` is the credited hero: the striker, or a summon's owner) on a foe
 * of the army, if the rule is on and the fight is not a duel. Undefined where it does not apply.
 */
export function fightMatch(b: { foeArmy?: string; duel?: unknown }, hero: { side: string; def: string }, to: { side: string }): Match | undefined {
  if (!ARMY_WEAKNESS.on || !b.foeArmy || b.duel || hero.side !== 'hero' || to.side !== 'foe') return undefined;
  return matchOf(b.foeArmy, hero.def);
}

/** A team's matches against an army: its heroes that hit a weakness, and those resisted (for the deploy chips and the suggester). */
export function teamMatch(army: string | undefined, kinds: readonly string[]): { weak: string[]; resist: string[] } {
  const weak = kinds.filter((k) => matchOf(army, k) === 'weak');
  const resist = kinds.filter((k) => matchOf(army, k) === 'resist');
  return { weak, resist };
}

/** A hero's score for an army, for auto place and the suggester: +1 for a weakness, -1 for a resistance, 0 else. */
export const matchScore = (army: string | undefined, kind: string): number => {
  const m = matchOf(army, kind);
  return m === 'weak' ? 1 : m === 'resist' ? -1 : 0;
};
