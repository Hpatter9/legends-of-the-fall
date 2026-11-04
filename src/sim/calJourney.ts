// The Calamity as a longer journey (DEPTH-BUILD, docs/notes/depth-design.md section 6). The Calamity is three regions now (the rift's,
// guardians 1, 3 and 6: `RIFT_BOSSES`), so each region is an act, the same length as before (Q6.3), with Karnok always last (Q6.2). After
// Act I the party stands at the **crossroads**: three rifts, each a guardian not yet met (drawn from the four between Gorvak and Karnok),
// and the one taken waits at the end of Act II. After Act II only Karnok is left, so the second crossroads offers a **boon** instead (the
// director's call): one of three. A guardian's strength follows its place in the journey (the act), not its name, so any choice is as hard
// as any other. Each draw has its own side stream, so a seed's
// floors and fights stay as they were; a run that never chooses keeps the fixed order. Pure rules: no Pixi, no DOM.

import { mixSeed, Rng } from './rng';

/** A list in an order drawn from a stream (Fisher-Yates). */
function shuffled<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const k = rng.int(0, i);
    [out[i], out[k]] = [out[k], out[i]];
  }
  return out;
}

/** Karnok, the Hollow Heart's guardian, is always the sixth. */
export const KARNOK_LAND = 6;

export type BoonId = 'mended' | 'purse' | 'harder' | 'easier';
export const BOONS: Readonly<Record<BoonId, { name: string; line: string }>> = {
  mended: { name: 'The Healer\'s Rift', line: 'Every hero is mended to full.' },
  purse: { name: 'The Gilded Rift', line: '+80 gold now.' },
  harder: { name: 'The Burning Rift', line: 'The last act\'s foes are 15% stronger; +150 gold now.' },
  easier: { name: 'The Quiet Rift', line: 'The last act\'s foes are 10% weaker.' },
};
export const JOURNEY = { PURSE: 80, HARDER_GOLD: 150, HARDER: 1.15, EASIER: 0.9 };

/** What the journey keeps in the Calamity's run (`TowerState.journey`; missing is the fixed order, no boon). */
export interface Journey {
  /** The guardian (1 to 6) at each act, once the first crossroads is passed. */
  route?: number[];
  /** A crossroads waiting for the player: after map 2 (lands) or map 4 (boons), and what it offers. */
  cross?: { after: 1; lands: number[] } | { after: 2; boons: BoonId[] };
  boon?: BoonId;
}

/** The fixed order: the guardian at each act when nothing is chosen. */
export const FIXED_ROUTE: readonly number[] = [1, 3, KARNOK_LAND];
/** The guardian at an act of the journey: the route's, or the fixed order's. */
export const landAt = (j: Journey | undefined, act: number): number => j?.route?.[act - 1] ?? FIXED_ROUTE[act - 1] ?? act;

/** An act's guardian has fallen: the crossroads that follows it (after Act I: three guardians; after Act II: three boons), else none. */
export function crossroadsAfter(seed: number, j: Journey | undefined, act: number, acts: number): Journey['cross'] | undefined {
  if (acts !== 3) return undefined;
  if (act === 1 && !j?.route) return { after: 1, lands: shuffled(new Rng(mixSeed(seed, 0xc055)), [2, 3, 4, 5]).slice(0, 3) };
  if (act === 2 && !j?.boon) return { after: 2, boons: shuffled(new Rng(mixSeed(seed, 0xb007)), Object.keys(BOONS) as BoonId[]).slice(0, 3) };
  return undefined;
}

/** Take a rift at the first crossroads: that guardian at the end of Act II, Karnok last. False when it is not offered. */
export function chooseLand(j: Journey, land: number): boolean {
  if (j.cross?.after !== 1 || !j.cross.lands.includes(land)) return false;
  j.route = [FIXED_ROUTE[0], land, KARNOK_LAND];
  delete j.cross;
  return true;
}

/** Take a boon at the second crossroads. The page applies its gold and healing (`boonNow`); the harder or easier rift is read by the fights. */
export function chooseBoon(j: Journey, boon: BoonId): boolean {
  if (j.cross?.after !== 2 || !j.cross.boons.includes(boon)) return false;
  j.boon = boon;
  delete j.cross;
  return true;
}
/** What a boon gives at once: gold, and whether every hero is mended. */
export const boonNow = (b: BoonId): { gold: number; mend: boolean } => ({ gold: b === 'purse' ? JOURNEY.PURSE : b === 'harder' ? JOURNEY.HARDER_GOLD : 0, mend: b === 'mended' });
/** The foes' strength in an act for the boon (the last act only). */
export const boonFoes = (j: Journey | undefined, act: number): number => (act < 3 ? 1 : j?.boon === 'harder' ? JOURNEY.HARDER : j?.boon === 'easier' ? JOURNEY.EASIER : 1);

/** The board line: "Act II of III". */
export const actLine = (act: number): string => `Act ${['I', 'II', 'III'][act - 1] ?? act} of III`;
