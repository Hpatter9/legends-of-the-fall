// The five difficulties of an army, each with its own run of stars (Normal 1 to 3, Hard 4 to 6, Elite 7 to 9, Legendary the
// 10th, Mythic the 11th). A harder tier makes the foes tougher (hp, attack and speed; the higher ones also bring escorts and a
// fiercer boss) and pays more crowns and XP. Which hero level each tier is for is written down in `docs/notes/difficulty.md`.
// Pure data: no Pixi, no DOM.

export interface Tier {
  id: 'normal' | 'hard' | 'elite' | 'legendary' | 'mythic';
  name: string;
  /** Stars an army must already have (across its lower tiers) before this tier opens. */
  need: number;
  /** How many stars the tier holds. */
  stars: number;
  /** The foes' hp, attack and speed, as a multiplier of the army's own. */
  hp: number;
  atk: number;
  speed: number;
  /** Escorts: this many more foes stand in every wave, copies of the wave's own escorts (none when unset; `waveFoes` in `armies.ts`). */
  extra?: number;
  /** The army's last boss changes form at this share of its health (`PHASE_AT`, a half, when unset) and its second form hits this much harder (1 when unset). */
  phaseAt?: number;
  surge?: number;
  /** The tier's answer to the ultimates (ULT-CHARGE, `docs/notes/ult-charge.md`): its foes' hp and attack are this much more again (1 when unset).
   *  Legendary and Mythic, the tiers fought with every ultimate open, rose for the full-strength ultimates that come round once or twice a fight,
   *  so the first army's stars come at the levels they did; `armyXpShare` takes it back out of a fight's XP, so the level pace is as it was.
   *  SPELLS-RETUNE raised it on every tier above Normal for the king's spells that Auto casts (`docs/notes/spells-retune.md`). */
  answer?: number;
  /** Crowns for waves and clears, and XP for fights. */
  pay: number;
  xp: number;
}

export const TIERS: readonly Tier[] = [
  { id: 'normal', name: 'Normal', need: 0, stars: 3, hp: 1, atk: 1, speed: 1, pay: 1, xp: 1 },
  { id: 'hard', name: 'Hard', need: 3, stars: 3, hp: 1.75, atk: 1.45, speed: 1.05, answer: 1.18, pay: 1.6, xp: 1.5 }, // (SPELLS-RETUNE: answer 1.18, new, for the king's spells Auto casts, `docs/notes/spells-retune.md`; its XP is taken back out)
  { id: 'elite', name: 'Elite', need: 6, stars: 3, hp: 2.6, atk: 1.95, speed: 1.1, extra: 1, answer: 1.12, pay: 2.5, xp: 2.2 }, // (SPELLS-RETUNE: answer 1.12, new)
  { id: 'legendary', name: 'Legendary', need: 9, stars: 1, hp: 3.4, atk: 2.5, speed: 1.15, extra: 1, answer: 3.3, pay: 4, xp: 3.5 }, // (SPELLS-RETUNE: answer 2.8 to 3.3, x1.18 for the spells Auto casts)
  { id: 'mythic', name: 'Mythic', need: 10, stars: 1, hp: 4.6, atk: 3.2, speed: 1.2, extra: 2, phaseAt: 0.6, surge: 1.2, answer: 3.23, pay: 7, xp: 6 }, // (SPELLS-RETUNE: answer 2.76 to 3.23, x1.17 for the spells Auto casts, `docs/notes/spells-retune.md`; LATE-RETUNE: answer 2.6 until two of a kind merged, MERGE-TWO, and every army's Mythic came sooner; its XP is taken back out as before)
];
/** The most stars an army holds. */
export const ARMY_STARS = TIERS.reduce((n, t) => n + t.stars, 0);
/** The stars of a run, at most. */
export const RUN_STARS = 3;
/** Stars at which an army gives a chest: bronze, silver, gold at the end of Legendary, and the best of them for the Mythic star. */
export const MILESTONES: readonly number[] = [3, 5, 10, 11];

export const tierOf = (i: number | undefined): Tier => TIERS[Math.max(0, Math.min(TIERS.length - 1, (i ?? 0) | 0))];
/** The star numbers (1 to 11) a tier holds: Normal 1-3, Hard 4-6, Elite 7-9, Legendary 10, Mythic 11. */
export const tierRange = (i: number): [number, number] => {
  const first = TIERS.slice(0, i).reduce((n, t) => n + t.stars, 0) + 1;
  return [first, first + TIERS[i].stars - 1];
};
