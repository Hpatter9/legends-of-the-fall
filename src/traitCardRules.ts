// TRAIT-PERKS: what a trait's card says (`traitCard.ts` draws it): its three tiers, the ones reached lit, each with its rule, and the
// heroes of the trait, those on the field marked. Pure: no DOM, so the tests read it.

import { countTraits, membersOf, TRAITS } from './sim/traits';
import { isMythic } from './sim/mythicRules';
import { UNITS } from './sim/units';

export const ROMAN = ['I', 'II', 'III'] as const;

export interface LadderRow {
  roman: string;
  need: number;
  name: string;
  /** The badge's line and the whole rule. */
  text: string;
  rule: string;
  reached: boolean;
  /** The next tier to reach (the one the party is working toward). */
  next: boolean;
}

/** A trait's ladder for a party (`kinds` placed; the daily's `featured` trait counts one more). */
export function ladderRows(id: string, kinds: readonly string[], featured?: string): LadderRow[] {
  const t = TRAITS[id];
  if (!t) return [];
  const c = countTraits(kinds, featured).find((x) => x.trait.id === id);
  const tier = c?.tier ?? -1;
  return t.tiers.map((x, i) => ({ roman: ROMAN[i], need: x.need, name: x.name, text: x.text, rule: x.rule, reached: i <= tier, next: i === tier + 1 }));
}

/** The card's line under the title: "3 of 4 on the field", with a featured trait's extra one. */
export function countLine(id: string, kinds: readonly string[], featured?: string): string {
  const had = countTraits(kinds).find((x) => x.trait.id === id)?.count ?? 0;
  const top = TRAITS[id]?.tiers.at(-1)?.need ?? 4;
  return `${had} of ${top} on the field${featured === id && had ? ', and one more today' : ''}`;
}

/** The heroes of a trait (Mythics left out, as the roster's counts do), the ones on the field first. */
export function traitHeroes(id: string, kinds: readonly string[]): { kind: string; name: string; on: boolean }[] {
  return membersOf(id)
    .filter((k) => !isMythic(k))
    .map((k) => ({ kind: k, name: UNITS[k]?.name ?? k, on: kinds.includes(k) }))
    .sort((a, b) => Number(b.on) - Number(a.on) || a.name.localeCompare(b.name));
}

/** The chip's pips on the deploy strip: a lit pip for each tier reached ("●●○"). */
export const tierPips = (id: string, kinds: readonly string[], featured?: string): string =>
  ladderRows(id, kinds, featured).map((r) => (r.reached ? '●' : '○')).join('');
