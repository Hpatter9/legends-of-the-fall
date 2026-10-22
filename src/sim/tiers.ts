// The four difficulties of an army, each with its own run of stars (Normal 1 to 3, Hard 4 to 6, Elite 7 to 9, Legendary the
// 10th). A harder tier makes the foes tougher (hp, attack and speed) and pays more crowns and XP. Pure data: no Pixi, no DOM.

export interface Tier {
  id: 'normal' | 'hard' | 'elite' | 'legendary';
  name: string;
  /** Stars an army must already have (across its lower tiers) before this tier opens. */
  need: number;
  /** How many stars the tier holds. */
  stars: number;
  /** The foes' hp, attack and speed, as a multiplier of the army's own. */
  hp: number;
  atk: number;
  speed: number;
  /** Crowns for waves and clears, and XP for fights. */
  pay: number;
  xp: number;
}

export const TIERS: readonly Tier[] = [
  { id: 'normal', name: 'Normal', need: 0, stars: 3, hp: 1, atk: 1, speed: 1, pay: 1, xp: 1 },
  { id: 'hard', name: 'Hard', need: 3, stars: 3, hp: 1.35, atk: 1.2, speed: 1.05, pay: 1.6, xp: 1.5 },
  { id: 'elite', name: 'Elite', need: 6, stars: 3, hp: 1.85, atk: 1.5, speed: 1.1, pay: 2.5, xp: 2.2 },
  { id: 'legendary', name: 'Legendary', need: 9, stars: 1, hp: 2.8, atk: 2, speed: 1.15, pay: 4, xp: 3.5 },
];
/** The most stars an army holds. */
export const ARMY_STARS = TIERS.reduce((n, t) => n + t.stars, 0);
/** The stars of a run, at most. */
export const RUN_STARS = 3;
/** Stars at which an army gives a chest. */
export const MILESTONES: readonly number[] = [3, 5, 10];

export const tierOf = (i: number | undefined): Tier => TIERS[Math.max(0, Math.min(TIERS.length - 1, (i ?? 0) | 0))];
/** The star numbers (1 to 10) a tier holds: Normal 1-3, Hard 4-6, Elite 7-9, Legendary 10. */
export const tierRange = (i: number): [number, number] => {
  const first = TIERS.slice(0, i).reduce((n, t) => n + t.stars, 0) + 1;
  return [first, first + TIERS[i].stars - 1];
};
