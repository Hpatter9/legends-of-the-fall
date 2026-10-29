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
  /** Crowns for waves and clears, and XP for fights. */
  pay: number;
  xp: number;
}

// (ULT-CHARGE, docs/notes/ult-charge.md: Legendary and Mythic, the tiers played with every ultimate open, are half again and seven-tenths again as tough as
// they were (hp 3.4 and 4.6, attack 2.5 and 3.2), for the ultimates that now come round once or twice a fight; their pace is as it was)
export const TIERS: readonly Tier[] = [
  { id: 'normal', name: 'Normal', need: 0, stars: 3, hp: 1, atk: 1, speed: 1, pay: 1, xp: 1 },
  { id: 'hard', name: 'Hard', need: 3, stars: 3, hp: 1.75, atk: 1.45, speed: 1.05, pay: 1.6, xp: 1.5 },
  { id: 'elite', name: 'Elite', need: 6, stars: 3, hp: 2.6, atk: 1.95, speed: 1.1, extra: 1, pay: 2.5, xp: 2.2 },
  { id: 'legendary', name: 'Legendary', need: 9, stars: 1, hp: 5.1, atk: 3.75, speed: 1.15, extra: 1, pay: 4, xp: 3.5 },
  { id: 'mythic', name: 'Mythic', need: 10, stars: 1, hp: 7.8, atk: 5.4, speed: 1.2, extra: 2, phaseAt: 0.6, surge: 1.2, pay: 7, xp: 6 },
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
