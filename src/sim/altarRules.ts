// The altar's numbers in one place (ALTAR-CLEAR). The battle (`riftBattle.ts`), the run (`rift.ts`, `tower.ts`) and the words
// the page shows (`altarWords.ts`) all read them from here, so what the altar card says is what the fight does.
// Moving the numbers here changed none of them: every value is the one the rules used before.

/** The patron's pulse: how often it fires, and how far "nearby" reaches. */
export const PULSE = { everyMs: 4000, reach: 2, shieldMs: 4000 } as const;

/** Each patron's pulse at the first evolution (`base`) and what each later evolution adds (`per`). */
export const PATRON_PULSE = {
  /** A share of the starter's attack, dealt to the nearest foe. */
  ember: { base: 0.45, per: 0.15 },
  /** A share of each shielded hero's own maximum health. */
  bastion: { base: 0.08, per: 0.03 },
  /** Skill charge (the meter runs to 100). */
  echo: { base: 12, per: 4 },
} as const;

/** What every evolution (each altar choice made) gives the starter in a fight, and the level each one guarantees. */
export const EVOLUTION = { hp: 0.15, atk: 0.2, levels: [1, 6, 16, 26] as readonly number[] } as const;

/** The offerings: the starter's health and damage, as multipliers. */
export const OFFERING_MULT = {
  vitality: { hp: 1.35, dmg: 0.9 },
  fury: { hp: 0.85, dmg: 1.35 },
} as const;

/** The commandments: the patron's pulse is multiplied while the formation holds (an ally within `PULSE.reach`, or none). */
export const COMMAND_MULT = { together: 1.5, solitude: 1.75 } as const;

/** Each point of corruption (one corrupted choice): what it gives, and what it costs. */
export const CORRUPT = {
  /** The starter's attack and the gold a won fight pays. */
  starterAtk: 0.15,
  gold: 0.1,
  /** Every foe's health and attack. */
  foeHp: 0.08,
  foeAtk: 0.06,
  /** A guardian's Calamity pulse: every `everyMs`, warned `warnMs` before, a share of each hero's maximum health. */
  boss: { everyMs: 8000, warnMs: 1000, hit: 0.03 },
  /** With Bastion, the guardian's pulse also shields it (a share of its maximum health, for `shieldMs`); with Echo, it drains this much skill charge from each hero. */
  bastionShield: 0.04,
  bastionShieldMs: 4000,
  echoDrain: 8,
} as const;
