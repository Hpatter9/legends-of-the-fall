// NEMESIS-DEPTH, idea 3: temperaments (`docs/notes/nemesis-depth.md`). Each nemesis born from now on has one of eight, drawn at its birth from
// its own stream (`TEMPER_SALT`), weighted by what it did and what it is. A temperament is felt in four places, each small:
//
// - in the fight (`nemesisTraits.ts`, behind `Unit.nem` as every hook is): whom it goes for, how hard it hits and is hit, when it runs;
// - on the Council (`council.ts`): which events it draws more often, how its loyalty moves, when it deserts;
// - in duels: a Glory-hound always calls a champion out (as Vain does), a Schemer and a Coward never do;
// - in its voice: a short tag of its temperament closes its taunt every other meeting (`tauntCutRules.ts`).
//
// A member from before has none, and plays exactly as it did. Pure rules: no Pixi, no DOM.

import type { Rng } from './rng';

export type Temper = 'brute' | 'schemer' | 'glory' | 'coward' | 'zealot' | 'oathbound' | 'trickster' | 'veteran';
export const TEMPERS: readonly Temper[] = ['brute', 'schemer', 'glory', 'coward', 'zealot', 'oathbound', 'trickster', 'veteran'];

/** The stream a newborn's temperament is drawn from: `mixSeed(run.seed, TEMPER_SALT, wave, id)` at a birth, `mixSeed(meta.seed, TEMPER_SALT,
 *  war.turn, id)` for a Recruit. */
export const TEMPER_SALT = 0x4e3e5c;

/** Each temperament's name and its words on the card. */
export const TEMPER: Readonly<Record<Temper, { name: string; text: string }>> = {
  brute: { name: 'Brute', text: 'Hits harder and guards nothing: +8% to its blows, and to the blows it takes. Never runs. Feuds often.' },
  schemer: { name: 'Schemer', text: 'Picks off the weakest hero in reach and runs early. Plots against its captain: its loyalty wears, and it betrays more often.' },
  glory: { name: 'Glory-hound', text: 'Goes for your strongest hero. Must be seen: always calls out a champion, taunts in full, and takes 10% more in a duel.' },
  coward: { name: 'Coward', text: 'Breaks and runs at 30% health, never calls out a champion, and deserts after two losses in a row.' },
  zealot: { name: 'Zealot', text: 'Fights to the end: never runs, and +10% to its blows under half health. Never betrays: its loyalty never falls below 50.' },
  oathbound: { name: 'Oathbound', text: 'Swears blood-oaths readily, and its vengeance cuts deeper: 10% more to the hero it is Vengeful against.' },
  trickster: { name: 'Trickster', text: 'Starts the fight hasted, slips away at 25% health half the time, and schemes against its captain.' },
  veteran: { name: 'Old Hand', text: 'Has seen your tricks: 10% less from every hero it remembers a fight with. Holds feasts for its band.' },
};

/** The fight's numbers. */
export const TEMPER_FIGHT = { brute: 0.08, zealot: 0.1, zealotBelow: 0.5, oathbound: 0.1, veteran: 0.1, tricksterHaste: 2000 } as const;
/** When each temperament runs: the share of health it is asked under and the chance it runs (`fleeOdds`); absent: the rank's own. */
export const TEMPER_FLEE: Partial<Readonly<Record<Temper, { at: number; chance: number | 'double' }>>> = {
  brute: { at: 0, chance: 0 },
  zealot: { at: 0, chance: 0 },
  coward: { at: 0.3, chance: 1 },
  schemer: { at: 0.3, chance: 'double' },
  trickster: { at: 0.25, chance: 0.5 },
};

/** The Council: an event weighs this many times more while one of the temperaments it names could act in it. */
export const TEMPER_EVENTS: Readonly<Record<string, Partial<Record<Temper, number>>>> = {
  feud: { brute: 2 },
  betrayal: { schemer: 3, trickster: 2 },
  trial: { glory: 2 },
  feast: { veteran: 2 },
  oath: { oathbound: 3 },
  plot: { schemer: 2, trickster: 2 },
};
/** A Schemer lieutenant's loyalty wears this much more a turn; a Zealot's never falls below this; a Coward deserts after this many losses. */
export const TEMPER_COUNCIL = { schemerDrift: -2, zealotFloor: 50, cowardStreak: 2 } as const;

/** Whether it calls out a champion: a Glory-hound always (as Vain), a Schemer or a Coward never; the rest as their scores say. */
export const challenges = (t: Temper | undefined): 'always' | 'never' | undefined => (t === 'glory' ? 'always' : t === 'schemer' || t === 'coward' ? 'never' : undefined);

/** Who it was, as a newborn: weights by its class and deed. A boss leans proud, a slayer brutal, one that escaped cowardly or tricky, one that
 *  maimed scheming, a Recruit (no deed) ambitious. */
export function drawTemper(rng: Rng, cls: 'boss' | 'elite' | 'escort' | 'recruit', deed?: 'slew' | 'maimed' | 'escaped'): Temper {
  const w: Record<Temper, number> = { brute: 2, schemer: 2, glory: 2, coward: 1, zealot: 2, oathbound: 2, trickster: 2, veteran: 2 };
  if (cls === 'recruit') {
    w.schemer += 2;
    w.glory += 1;
    w.veteran = 0;
  }
  if (deed === 'slew') w.brute += 3;
  if (deed === 'maimed') w.schemer += 2;
  if (deed === 'escaped') {
    w.coward += 2;
    w.trickster += 2;
  }
  // (a boss is never a Coward, whatever it did)
  if (cls === 'boss') {
    w.glory += 3;
    w.coward = 0;
  }
  const total = TEMPERS.reduce((s, t) => s + w[t], 0);
  let r = rng.next() * total;
  return TEMPERS.find((t) => (r -= w[t]) < 0) ?? 'veteran';
}

/** A saved temperament, if it is one. */
export const readTemper = (x: unknown): Temper | undefined => (TEMPERS.includes(x as Temper) ? (x as Temper) : undefined);

/** The short tag a temperament's voice closes a taunt with, every other meeting (four each, to fit any army's voice). */
export const TEMPER_TAGS: Readonly<Record<Temper, readonly string[]>> = {
  brute: ['Now come here!', 'Enough talk.', 'I will break you.', 'Stand still.'],
  schemer: ['But I am in no hurry.', 'Others can bleed first.', 'I have plans for you.', 'Watch your back.'],
  glory: ['Let them all see this!', 'Sing of it after.', 'Face me, if you dare.', 'Remember my name.'],
  coward: ['From back here, anyway.', 'Somebody hold them off!', 'Not too close, mind.', 'I will be right behind you all.'],
  zealot: ['To the very end.', 'My life for the Council!', 'I do not fall back.', 'I will not yield.'],
  oathbound: ['My brothers are watching.', 'I swore an oath.', 'Blood for blood.', 'For the fallen.'],
  trickster: ['Catch me first.', 'Or am I over here?', 'Ha! Too slow.', 'Now you see me.'],
  veteran: ['I have seen it all before.', 'Same old tricks.', 'I know how this goes.', 'I am too old to die today.'],
};
