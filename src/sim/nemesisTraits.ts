// The Nemesis War's traits and weaknesses (`docs/design/legends-expansion.md`, section 2.3; `docs/notes/nemesis-1.md`): what a nemesis
// earned from what actually happened in a fight (read from the battle log by `nemesisLog.ts`), and the small hooks the fight reads them
// through. A nemesis holds at most 3 traits and 2 weaknesses, and at most 2 of its traits are ailment immunities, so no nemesis is immune to a
// whole party's plan; its first weakness is always the Dread of the hero who hurt it most.
//
// Every hook here is a no-op for a fighter without `Unit.nem`, and the fight calls them only when one of the two fighters has it, so a fight
// with no nemesis in it plays out exactly as before (`test/nemesis-regression.test.ts`). No hook draws from `b.rng`. Pure rules: no Pixi, no DOM.

import type { AilmentKey } from './ailmentKeys';
import type { Battle, BattleEvent, HitSrc, Unit } from './battle';
import type { Kit } from './abilities';
import { hasAil } from './ailments';
import { tileAt } from './board';
import { callingOf, type Calling } from './weakness';
import { UNITS } from './units';

/** A nemesis's rank on the Council (phase 1 fills the captains and lieutenants; the warchief's seat comes with the Council's turns). */
export type NemRank = 'warchief' | 'captain' | 'lieutenant';

/** What the fight knows of a nemesis (fixed at the run's start from its snapshot, `Run.nemesis`): its id, traits and weaknesses. */
export interface UnitNem {
  id: number;
  /** Its name and epithet, for the page's name plate. */
  name: string;
  rank: NemRank;
  scars?: number;
  traits: readonly string[];
  weak: readonly string[];
  /** Survivor has been spent this fight. */
  stood?: true;
  /** When its Dread hero's ultimate last staggered it. */
  staggered?: number;
  /** The hero kind it is Vengeful against (phase 2: its blood-oath brother fell to that hero): +20% damage to it, and it goes for it first. */
  veng?: string;
}

/** A trait: its words, the epithet it gives a nemesis whose first trait it is, and what immunities it grants. */
export interface TraitDef {
  name: string;
  epithet: string;
  text: string;
  immune?: readonly AilmentKey[];
  /** What it suffered (and lived through), or what it did. */
  from: 'suffered' | 'did';
}

export const CALLINGS: readonly Calling[] = ['martial', 'arcane', 'devout', 'wild'];
const CALLING_WORD: Record<Calling, string> = { martial: 'warriors', arcane: 'mages', devout: 'the devout', wild: 'the wild' };

/** Every trait by id. A Bane is one id for each calling ("bane:martial"). */
export const TRAITS: Readonly<Record<string, TraitDef>> = {
  fireproof: { name: 'Fireproof', epithet: 'the Unburnt', text: 'Immune to burning', immune: ['burn'], from: 'suffered' },
  rime: { name: 'Rime-hardened', epithet: 'the Frostbitten', text: 'Immune to freezing and chill', immune: ['freeze', 'chill'], from: 'suffered' },
  venom: { name: 'Venom-blooded', epithet: 'the Bitter', text: 'Immune to poison', immune: ['poison'], from: 'suffered' },
  thick: { name: 'Thick-hided', epithet: 'Old Leather', text: 'Immune to bleeding', immune: ['bleed'], from: 'suffered' },
  grounded: { name: 'Grounded', epithet: 'the Earthed', text: 'Immune to shock; chain arcs skip it', immune: ['shock'], from: 'suffered' },
  ironSkull: { name: 'Iron Skull', epithet: 'Ironpate', text: 'Stuns on it last half as long', from: 'suffered' },
  fearless: { name: 'Fearless', epithet: 'the Unafraid', text: 'Immune to fear', immune: ['fear'], from: 'suffered' },
  arrowCatcher: { name: 'Arrow-catcher', epithet: 'Pincushion', text: 'Takes 25% less from shots', from: 'suffered' },
  scarred: { name: 'Battle-scarred', epithet: 'the Scarred', text: 'Takes 15% less from blows in reach', from: 'suffered' },
  sureFooted: { name: 'Sure-footed', epithet: 'the Unmoved', text: 'Cannot be shoved, dragged or launched', from: 'suffered' },
  spellScorned: { name: 'Spell-scorned', epithet: 'the Unhexed', text: "The king's spells deal it 30% less", from: 'suffered' },
  hornDeaf: { name: 'Horn-deaf', epithet: 'the Deaf', text: "An Eidolon's strike takes 10 points less of its health", from: 'suffered' },
  survivor: { name: 'Survivor', epithet: 'the Unkillable', text: 'Once a fight, at 0 hp it stands again at 20%', from: 'suffered' },
  ...Object.fromEntries(CALLINGS.map((c) => [`bane:${c}`, { name: `Bane of ${CALLING_WORD[c]}`, epithet: '', text: `+20% damage to ${CALLING_WORD[c]}`, from: 'did' } as TraitDef])),
  healerHunter: { name: 'Healer-hunter', epithet: 'the Healer-hunter', text: 'Goes for healers first; +10% damage to them', from: 'did' },
  executioner: { name: 'Executioner', epithet: 'the Headsman', text: '+30% damage to heroes under 30% health', from: 'did' },
  ambusher: { name: 'Ambusher', epithet: 'the Quick Knife', text: 'Starts each fight hasted for 4 s', from: 'did' },
  elusive: { name: 'Elusive', epithet: 'the Uncaught', text: '+20% move speed', from: 'did' },
  hillKing: { name: 'Hill-king', epithet: 'of the High Ground', text: '+1 jump; +10% from higher ground', from: 'did' },
  loneWolf: { name: 'Lone Wolf', epithet: 'the Lone', text: '+25% attack while no ally is within 3 tiles', from: 'did' },
  legendSlayer: { name: 'Legend-slayer', epithet: 'Legend-slayer', text: 'Slew a hero sworn to the Legend Oath', from: 'did' },
};

/** At most this many traits, weaknesses and ailment immunities a nemesis holds. */
export const MAX_TRAITS = 3;
export const MAX_WEAK = 2;
export const MAX_IMMUNE = 2;

/** The ailment immunities a list of traits grants (an immunity trait counts once however many ailments it covers). */
export const immunityTraits = (traits: readonly string[]): string[] => traits.filter((t) => !!TRAITS[t]?.immune);

/** Whether a trait may be added to a list: not held already, and not a third immunity. */
export const canAdd = (traits: readonly string[], t: string): boolean => !!TRAITS[t] && !traits.includes(t) && !(TRAITS[t].immune && immunityTraits(traits).length >= MAX_IMMUNE);

/**
 * Add a trait to a nemesis's list: past `MAX_TRAITS` it replaces the oldest, unless that is the trait that gave the epithet (`keep`).
 * A trait that cannot be added (held, or a third immunity) changes nothing. Returns whether it was added.
 */
export function addTrait(traits: string[], t: string, keep?: string): boolean {
  if (!canAdd(traits, t)) return false;
  if (traits.length >= MAX_TRAITS) {
    const i = traits.findIndex((x) => x !== keep);
    traits.splice(i, 1);
    // (the one taken out may have been an immunity: the new one still fits)
  }
  traits.push(t);
  return true;
}

// ---- weaknesses ----------------------------------------------------------------------------------------------------------------

/** The elements a "Fears" weakness names, each by the ailment that carries it. */
export const FEAR_ELEMENTS: Readonly<Record<string, { word: string; ail: AilmentKey }>> = {
  fire: { word: 'fire', ail: 'burn' },
  frost: { word: 'frost', ail: 'chill' },
  storm: { word: 'the storm', ail: 'shock' },
  venom: { word: 'venom', ail: 'poison' },
};

/** A weakness's words ("dread:knight" is the Dread of Kwame's kind). */
export function weakWords(w: string, heroName: (kind: string) => string): { name: string; text: string } {
  if (w.startsWith('dread:')) {
    const k = w.slice(6);
    return { name: `Dread of ${heroName(k)}`, text: `Takes 25% more from ${heroName(k)}, whose ultimate staggers it for 1 s` };
  }
  if (w.startsWith('fears:')) {
    const e = FEAR_ELEMENTS[w.slice(6)];
    return { name: `Fears ${e?.word ?? 'fire'}`, text: `Takes 25% more while it suffers ${e?.word ?? 'fire'}` };
  }
  if (w === 'hatesHeights') return { name: 'Hates heights', text: 'Deals 15% less while lower than its target' };
  if (w === 'glutton') return { name: 'Glutton', text: 'Gains Might from the Council’s feasts, but walks 10% slower' };
  return { name: w, text: '' };
}

/** The hero kind a nemesis dreads (its first weakness), if any. */
export const dreadOf = (weak: readonly string[]): string | undefined => weak.find((w) => w.startsWith('dread:'))?.slice(6);

/** The second weakness's pool (drawn at Might 5, weighted by its history in `nemesis.ts`): never an element it is immune to. Glutton came
 *  with the Council's feasts (phase 2); the design's Craven and Vain come with the phases that give them meaning (fleeing, duels). */
export function secondWeakPool(traits: readonly string[]): string[] {
  const immune = new Set(traits.flatMap((t) => TRAITS[t]?.immune ?? []));
  return [...Object.entries(FEAR_ELEMENTS).filter(([, e]) => !immune.has(e.ail)).map(([k]) => `fears:${k}`), 'hatesHeights', 'glutton'];
}

/** The Vengeful's share: +20% damage to the hero it swore vengeance on. */
export const VENGEFUL = 0.2;

// ---- the hooks the fight reads -----------------------------------------------------------------------------------------------

const has = (u: Unit, t: string): boolean => !!u.nem?.traits.includes(t);

/** The ultimate being cast just now (set by `heroKits.ts` around an ultimate's cast): a Dread hero's ultimate staggers its nemesis. */
export const NEM_CTX: { ult: number } = { ult: 0 };

/** Whether a nemesis shrugs off this ailment (`ailments.ts`'s gate). */
export const nemImmune = (u: Unit, kind: AilmentKey): boolean => !!u.nem?.traits.some((t) => TRAITS[t]?.immune?.includes(kind));

/** How long a hold lasts on it (Iron Skull halves a stun). */
export const nemHold = (u: Unit, kind: AilmentKey, ms: number): number => (kind === 'stun' && has(u, 'ironSkull') ? ms * 0.5 : ms);

/** The healers it hunts: a devout hero, or one whose kit heals. */
const healer = (u: Unit): boolean => callingOf(u.def) === 'devout';

const allyNear = (b: Battle, me: Unit, reach: number): boolean => b.units.some((x) => x.alive && x !== me && x.side === me.side && Math.abs(x.u - me.u) + Math.abs(x.v - me.v) <= reach);
const height = (b: Battle, u: Unit): number => tileAt(b.board, u.u, u.v)?.h ?? 0;

/**
 * The damage-taken step (`hurt` in `battle.ts`), for a blow between a nemesis and anyone: what its traits and weaknesses make of it. Called
 * only when `by` or `to` carries `nem`; `real` is the hero the blow counts for (a summon's caller). 0 means the blow does not touch it (a chain
 * arc skips a Grounded nemesis).
 */
export function nemHurt(b: Battle, by: Unit, to: Unit, real: Unit, dmg: number, src: HitSrc, splash: boolean, out: BattleEvent[]): number {
  let k = 1;
  if (to.nem) {
    const n = to.nem;
    const last = out[out.length - 1];
    // (a chain's jump to it, not the first strike of the chain)
    if (has(to, 'grounded') && last?.kind === 'arc' && last.to === to.id && last.from !== by.id) return 0;
    if (by.id === 0 && has(to, 'spellScorned')) k *= 0.7;
    if (src === 'blow' && !splash && by.id !== 0) {
      if (UNITS[by.def]?.shot) {
        if (has(to, 'arrowCatcher')) k *= 0.75;
      } else if (has(to, 'scarred')) k *= 0.85;
    }
    const dread = dreadOf(n.weak);
    if (dread && real.def === dread) {
      k *= 1.25;
      // (its Dread hero's ultimate staggers it, once a cast)
      if (NEM_CTX.ult === real.id && (n.staggered ?? -1e9) < b.t - 900) {
        n.staggered = b.t;
        to.busyUntil = Math.max(to.busyUntil, b.t + 1000);
        to.swing = undefined;
      }
    }
    for (const w of n.weak) if (w.startsWith('fears:') && hasAil(to, FEAR_ELEMENTS[w.slice(6)]?.ail ?? 'burn', b.t)) k *= 1.25;
  }
  if (by.nem && to.side === 'hero') {
    const c = callingOf(to.def);
    if (c && has(by, `bane:${c}`)) k *= 1.2;
    if (has(by, 'healerHunter') && healer(to)) k *= 1.1;
    if (has(by, 'executioner') && to.hp < to.maxHp * 0.3) k *= 1.3;
    if (has(by, 'hillKing') && height(b, by) > height(b, to)) k *= 1.1;
    if (has(by, 'loneWolf') && !allyNear(b, by, 3)) k *= 1.25;
    if (by.nem.weak.includes('hatesHeights') && height(b, by) < height(b, to)) k *= 0.85;
    if (by.nem.veng && to.def === by.nem.veng) k *= 1 + VENGEFUL;
  }
  return k === 1 ? dmg : Math.max(1, Math.round(dmg * k));
}

/** A fatal blow on a Survivor: once a fight it stands again at 20%. Returns whether it was spared. */
export function nemSpare(to: Unit, out: BattleEvent[]): boolean {
  if (!to.nem || to.nem.stood || !has(to, 'survivor')) return false;
  to.nem.stood = true;
  to.hp = Math.max(1, Math.round(to.maxHp * 0.2));
  out.push({ kind: 'heal', to: to.id, amount: to.hp });
  return true;
}

/** Its healer-hunting: the healers in reach first (the rest keep their order); a Vengeful nemesis goes for its hero before any. */
export function nemPrey(me: Unit, inReach: Unit[]): Unit[] {
  let out = has(me, 'healerHunter') ? [...inReach].sort((x, y) => Number(healer(y)) - Number(healer(x))) : inReach;
  const v = me.nem?.veng;
  if (v && out.some((x) => x.def === v)) out = [...out].sort((x, y) => Number(y.def === v) - Number(x.def === v));
  return out;
}

/** Its walk's pace: Elusive walks 20% quicker; a Glutton 10% slower. */
export const nemMove = (u: Unit): number => (has(u, 'elusive') ? 1.2 : 1) * (u.nem?.weak.includes('glutton') ? 0.9 : 1);

/** The jump it walks with: a Hill-king's is one more. */
export const nemJump = (u: Unit, jump: number): number => (has(u, 'hillKing') ? jump + 1 : jump);

/** An Eidolon's strike on it (`eidolons.ts`): a Horn-deaf nemesis loses 10 points less of its health. */
export const nemStrike = (u: Unit, share: number): number => (has(u, 'hornDeaf') && share < 1 ? Math.max(0.05, share - 0.1) : share);

/** As the fight is made: an Ambusher starts hasted for 4 s; a Sure-footed nemesis's kit cannot be moved. */
export function nemStart(u: Unit, kit: Kit | undefined): void {
  if (has(u, 'ambusher')) u.hasteUntil = 4000;
  if (has(u, 'sureFooted') && kit) u.kit = { ...kit, passive: { ...kit.passive, steady: true } };
}
