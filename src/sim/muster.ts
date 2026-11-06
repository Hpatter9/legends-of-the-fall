// The Warchief's Muster (the Nemesis War, phase 2: `docs/design/legends-expansion.md`, section 2.5; `docs/notes/nemesis-2.md`). Once the
// player has slain two captains since the last Muster, and a warchief holds the Council's top seat, the Nemesis board offers a battle of
// three waves on the warchief's army's land: the Council's lieutenants, then its captains with their bodyguard, then the warchief himself
// as the last boss, who changes form at half health (his own boss's second form if he was born a boss, else `CHIEF_PHASE`).
//
// It is a run of its own (`RunMode` 'muster', saved in its own slot, `legends.muster`), shaped like an army's last three waves (the
// strength the army has there, its last boss's wall), on the tier of the player's best clear of that army. Its nemeses are frozen into
// the run as it starts (`Run.nemesis`), so every fight replays. What the warchief's fall means (the Head, the reshuffle) is `council.ts`.
// Pure rules: no Pixi, no DOM.

import { armyById, landOf, recordOf, type Army, type Wave } from './armies';
import type { Meta } from './meta';
import { snapOf, type Nemesis, type RunNemesis, type War } from './nemesis';
import { ARMY_START_GOLD, newRun, reward, type Run } from './run';
import { TIERS } from './tiers';
import { decorate } from './revenge';

/** Captains slain since the last Muster that open the next. */
export const MUSTER_NEED = 2;
/** Its waves, and how many lieutenants and captains stand in the first two. */
export const MUSTER_WAVES = 3;
export const MUSTER_LIEUTENANTS = 3;
export const MUSTER_CAPTAINS = 2;

/** The warchief, if the seat is filled. */
export const warchiefOf = (war: War | undefined): Nemesis | undefined => war?.members.find((n) => n.rank === 'warchief');
/** Whether the Muster is open: a warchief sits, and two captains have fallen to the heroes since the last one. */
export const musterOpen = (war: War | undefined): boolean => !!warchiefOf(war) && (war?.musterSince ?? 0) >= MUSTER_NEED;
/** How far the Muster is from opening, in words, for the board ("Slay 1 more captain to call the Warchief out"). */
export function musterLine(war: War | undefined): string {
  if (!war) return '';
  if (!warchiefOf(war)) return 'No warchief holds the Council yet: the strongest captain will claim the seat.';
  if (musterOpen(war)) return 'The Warchief’s Muster is open: his Council stands with him.';
  const left = MUSTER_NEED - war.musterSince;
  return `Slay ${left} more ${left === 1 ? 'captain' : 'captains'} to call the Warchief to his Muster.`;
}

const armies = new Map<string, Army>();

/**
 * The Muster's waves as an army of three: the army's last two ordinary waves' bands, then its last wave with the warchief at its head (his
 * kind as the boss, the army's last boss's wall). Its strength runs on from where the army's own waves stand there: wave n of the Muster is
 * as strong as the army's wave `length - 3 + n`, on every tier.
 */
export function musterArmy(armyId: string, chief: string): Army | undefined {
  const key = `${armyId}:${chief}`;
  let m = armies.get(key);
  if (m) return m;
  const a = armyById(armyId);
  if (!a) return undefined;
  const at = a.waves.length - MUSTER_WAVES;
  const ordinary = a.waves.filter((w) => !w.boss);
  const late = ordinary.slice(-2);
  const final = a.waves[a.waves.length - 1];
  const waves: Wave[] = [{ foes: [...late[0].foes] }, { foes: [...(late[1] ?? late[0]).foes] }, { foes: [chief, ...final.foes.slice(1)], boss: 'final' }];
  // (start x (1 + growth x (n - 1)) for the Muster's wave n is the army's start x (1 + growth x (at + n - 1)))
  const k = 1 + a.growth * at;
  const tg = a.tierGrowth ?? a.growth;
  const kt = 1 + tg * at;
  m = {
    id: `muster:${a.id}`,
    name: 'The Warchief’s Muster',
    blurb: 'The Dark Council stands with its warchief.',
    level: a.level,
    area: a.area,
    lands: a.lands ?? [a.area],
    waves,
    start: a.start * k,
    growth: a.growth / k,
    tierStart: (a.tierStart ?? a.start) * kt,
    tierGrowth: tg / kt,
    ...(a.tierLift ? { tierLift: a.tierLift } : {}),
    xpStart: (a.xpStart ?? a.start) * k,
    mid: a.mid,
    last: a.last,
    pay: 0,
    clear: 0,
  };
  armies.set(key, m);
  return m;
}

/** The Council members who stand in the Muster, and where: the mightiest lieutenants in wave 1, captains in wave 2 (none born a boss:
 *  a boss meets the heroes as itself, in its own army), the warchief in wave 3. */
export function musterPlan(war: War): RunNemesis | undefined {
  const chief = warchiefOf(war);
  if (!chief) return undefined;
  const byMight = (a: Nemesis, b: Nemesis) => b.might - a.might || a.id - b.id;
  // (a member away licking its wounds, phase 3, does not answer the Muster)
  const here = (n: Nemesis) => !n.boss && !war.away?.[String(n.id)];
  const lts = war.members.filter((n) => n.rank === 'lieutenant' && here(n)).sort(byMight).slice(0, MUSTER_LIEUTENANTS);
  const caps = war.members.filter((n) => n.rank === 'captain' && here(n)).sort(byMight).slice(0, MUSTER_CAPTAINS);
  const waves: Record<string, number[]> = { '3': [chief.id] };
  if (lts.length) waves['1'] = lts.map((n) => n.id);
  if (caps.length) waves['2'] = caps.map((n) => n.id);
  return { members: [...lts, ...caps, chief].map(snapOf), waves };
}

/** The tier the Muster is fought on: the hardest the player has cleared the warchief's army on (Normal if none). */
export function musterTier(m: Meta, army: string): number {
  const rec = recordOf(m, army);
  let tier = 0;
  for (let t = 1; t < TIERS.length; t++) if ((rec.hard?.[String(t)]?.clears ?? 0) > 0) tier = t;
  return tier;
}

/** The gold the Muster begins with: what an army run holds by the army's wave it starts at (two hires, and each wave's pay before it). */
export function musterGold(army: Army): number {
  let gold = ARMY_START_GOLD;
  for (let n = 1; n <= army.waves.length - MUSTER_WAVES; n++) gold += reward(n);
  return gold;
}

/** Begin the Muster with the party picked (null when it is not open). Its own seed; the warchief's army's land, one of its lands by the seed. */
export function startMuster(m: Meta, party: readonly string[], seed: number): Run | null {
  const war = m.war;
  const chief = warchiefOf(war);
  const a = chief && armyById(chief.army);
  if (!war || !chief || !a || !musterOpen(war)) return null;
  const run = newRun(seed, party, m.castle, 0, musterGold(a));
  const tier = musterTier(m, a.id);
  run.mode = { kind: 'muster', army: a.id, chief: chief.id, base: chief.base, ...(tier ? { tier } : {}) };
  run.area = landOf(a, seed);
  const plan = musterPlan(war);
  // (phase 3: each member's Grudges, Avengers, trophies and taunts' makings, as an army run's are, `revenge.ts`)
  if (plan) run.nemesis = { ...plan, members: plan.members.map((s) => decorate(m, s, war.members.find((n) => n.id === s.id)!)) };
  return run;
}
