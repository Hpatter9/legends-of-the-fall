// March orders (DEPTH-BUILD, docs/notes/depth-design.md section 5): before an army run's first wave the player picks one modifier (the
// owner's call, Q5.1: one a run) or none, and the run keeps it to the end. A cursed run earns stars as usual plus a laurel (Q5.2).
// Everything a modifier changes is read from `Run.orders`, fixed when the run starts, so its fights replay. The curse is drawn from the
// run's seed by its own side stream, so the fights draw as a plain march with the same boost does. Pure rules: no Pixi, no DOM.

import { mixSeed } from './rng';
import { roomOpen, type RoomId } from './rooms';
import type { Castle } from './castle';
import type { Area } from './board';
import { isVigil, type VigilId } from './chapelRooms';

export type MarchMod = 'cursed' | 'scouted' | 'night' | 'forced';
export type CurseId = 'noShop' | 'healHalf' | 'secondForm';

/** What a run's orders hold (`Run.orders`; missing is a plain march, so every saved run loads as it was). */
export interface Orders {
  mod?: MarchMod;
  curse?: CurseId;
  /** (Later batches: the route, the Chapel's Vigil and the Smithy's marked hero.) */
  route?: string;
  /** The Chapel's Vigil (`chapelRooms.ts`): how the party rises when a heart burns. */
  vigil?: VigilId;
  marked?: string;
  /** The Mage Tower's Spell Lectern (`lectern.ts`): the spare spell carried, and whether it has been swapped in. */
  spare?: string;
  spareUsed?: boolean;
}

export interface MarchDef {
  id: MarchMod | 'plain';
  name: string;
  /** What changes, and what it pays, in a line each. */
  change: string;
  reward: string;
  icon: string;
  /** The room that opens it (the Watchtower's), if any; else it opens with the army cleared at the tier. */
  room?: RoomId;
}

export const MARCHES: readonly MarchDef[] = [
  { id: 'plain', name: 'Plain march', change: 'Nothing changes.', reward: 'As always.', icon: '⚑' },
  { id: 'cursed', name: 'Cursed', change: 'Foes +20% health, one heart instead of two, and one curse.', reward: 'Crowns and XP x1.4, an extra chest, a laurel.', icon: '☠' },
  { id: 'scouted', name: 'Scouted', change: 'The final boss and its weakness are shown before wave 1.', reward: 'Crowns x0.9 (the scouts are paid).', icon: '👁', room: 'lookout' },
  { id: 'night', name: 'Night march', change: 'Shots reach one tile less below height 2; foes heal half.', reward: 'A moonlit chest on a clear.', icon: '🌙', room: 'nightWatch' },
  { id: 'forced', name: 'Forced march', change: 'Waves 4, 6, 11 and 13 are skipped (their gold is not paid).', reward: 'XP x0.8, crowns as a full run.', icon: '🥾' },
];
export const marchDef = (id: MarchMod | 'plain'): MarchDef => MARCHES.find((d) => d.id === id)!;

export const CURSES: Readonly<Record<CurseId, { name: string; line: string }>> = {
  noShop: { name: 'Empty Stalls', line: 'No passing cart stops on the road.' },
  healHalf: { name: 'Withered Hands', line: 'The heroes\' healing is halved.' },
  secondForm: { name: 'Unbroken', line: 'The final boss takes its second form at 65% health.' },
};
const CURSE_IDS = Object.keys(CURSES) as CurseId[];

/** The numbers (one place to tune them). */
export const MARCH = {
  CURSED_HP: 1.2,
  CURSED_PAY: 1.4,
  SCOUTED_PAY: 0.9,
  FORCED_XP: 0.8,
  /** The waves a forced march skips. */
  SKIP: [4, 6, 11, 13] as readonly number[],
  /** The second form's turn under the Unbroken curse. */
  SECOND_FORM: 0.65,
  /** A night's shooters below this height reach a tile less. */
  NIGHT_HEIGHT: 2,
  NIGHT_FOE_HEAL: 0.5,
  CURSE_HEAL: 0.5,
};

/** The curse a cursed run draws: from the run's seed by its own side stream (`0x6d61`). */
export const curseFor = (seed: number): CurseId => CURSE_IDS[(mixSeed(seed, 0x6d61) >>> 0) % CURSE_IDS.length];

/** The slice of the save the card asks: the castle, and each army's clears by tier. */
export interface MarchMeta {
  castle: Castle;
  armies: Record<string, { clears: number; hard?: Record<string, { clears: number }> } | undefined>;
}
const clearedAt = (m: MarchMeta, army: string, tier: number): boolean => {
  const r = m.armies[army];
  return !!r && (tier ? (r.hard?.[String(tier)]?.clears ?? 0) : r.clears) > 0;
};

/** Whether a modifier is open for this army and tier, and if not the lock line ("Watchtower level 2", "Clear this army on Hard first"). */
export function marchOpen(m: MarchMeta, army: string, tier: number, id: MarchMod | 'plain'): { open: boolean; lock?: string } {
  const d = marchDef(id);
  if (id === 'plain') return { open: true };
  if (d.room) return roomOpen(m.castle, d.room) ? { open: true } : { open: false, lock: `Watchtower level ${d.room === 'lookout' ? 1 : 2}` };
  const tierName = ['Normal', 'Hard', 'Elite', 'Legendary', 'Mythic'][tier] ?? 'Normal';
  return clearedAt(m, army, tier) ? { open: true } : { open: false, lock: `Clear this army on ${tierName} first` };
}

/** The orders a run takes for a modifier (the curse drawn now). Plain is none. */
export function ordersFor(mod: MarchMod | 'plain', seed: number): Orders | undefined {
  if (mod === 'plain') return undefined;
  return mod === 'cursed' ? { mod, curse: curseFor(seed) } : { mod };
}

/** What the orders do to a fight, fixed as it starts: the foes' health, the heroes' and foes' heals, the night, the final boss's turn. */
export function marchFx(o: Orders | undefined): { foeHp: number; heroHeal: number; foeHeal: number; night: boolean; secondForm?: number } {
  const cursed = o?.mod === 'cursed';
  const night = o?.mod === 'night';
  return {
    foeHp: cursed ? MARCH.CURSED_HP : 1,
    heroHeal: cursed && o?.curse === 'healHalf' ? MARCH.CURSE_HEAL : 1,
    foeHeal: night ? MARCH.NIGHT_FOE_HEAL : 1,
    night,
    ...(cursed && o?.curse === 'secondForm' ? { secondForm: MARCH.SECOND_FORM } : {}),
  };
}

/** The hearts a run's orders take away (a cursed run has one instead of two). */
export const heartsLost = (o: Orders | undefined): number => (o?.mod === 'cursed' ? 1 : 0);
/** Whether a forced march skips this wave. */
export const skipsWave = (o: Orders | undefined, n: number): boolean => o?.mod === 'forced' && MARCH.SKIP.includes(n);
/** Whether the road's passing cart stays away (the Empty Stalls curse). */
export const shopShut = (o: Orders | undefined): boolean => o?.mod === 'cursed' && o.curse === 'noShop';

/** What the orders pay: the crowns' and XP's multipliers, and the extra chests on a clear. Applied once, where the run pays. */
export function marchPay(o: Orders | undefined): { crowns: number; xp: number; chests: number } {
  switch (o?.mod) {
    case 'cursed':
      return { crowns: MARCH.CURSED_PAY, xp: MARCH.CURSED_PAY, chests: 1 };
    case 'scouted':
      return { crowns: MARCH.SCOUTED_PAY, xp: 1, chests: 0 };
    case 'night':
      return { crowns: 1, xp: 1, chests: 1 };
    case 'forced':
      return { crowns: 1, xp: MARCH.FORCED_XP, chests: 0 };
    default:
      return { crowns: 1, xp: 1, chests: 0 };
  }
}

/** Orders read from a saved run: undefined unless sane. */
export function readOrders(raw: unknown): Orders | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Orders;
  const mod = (['cursed', 'scouted', 'night', 'forced'] as const).find((x) => x === o.mod);
  const out: Orders = {};
  if (mod) out.mod = mod;
  if (mod === 'cursed') out.curse = CURSE_IDS.includes(o.curse as CurseId) ? o.curse : 'healHalf';
  for (const k of ['route', 'marked', 'spare'] as const) if (typeof o[k] === 'string') out[k] = o[k];
  if (o.spareUsed === true) out.spareUsed = true;
  if (isVigil(o.vigil)) out.vigil = o.vigil;
  return Object.keys(out).length ? out : undefined;
}

/** The run's badge line (beside the hearts): "Cursed · Withered Hands: the heroes' healing is halved." */
export function ordersLine(o: Orders | undefined): string | null {
  if (!o?.mod) return null;
  const d = marchDef(o.mod);
  return o.mod === 'cursed' && o.curse ? `${d.name} · ${CURSES[o.curse].name}: ${CURSES[o.curse].line}` : `${d.name}: ${d.change}`;
}

/** A wave's crowns under the orders (cursed x1.4, scouted x0.9): the difference is paid (or taken) at once and added to the wave's pay. */
export function marchCrowns(m: { crowns: number }, pay: { crowns: number }, o: Orders | undefined): number {
  const k = marchPay(o).crowns;
  if (k === 1 || pay.crowns <= 0) return 0;
  const extra = Math.round(pay.crowns * (k - 1));
  m.crowns = Math.max(0, m.crowns + extra);
  pay.crowns += extra;
  return extra;
}

/* ------------------------------------------------------------------ routes (the Watchtower's Far Sight) */

/** The roads an army can march by (Far Sight): one for each of its lands; the run is fought on the land of the road taken. The armies'
 *  battlefields are hand-shaped by their scenarios now, so a road picks the land, not the shapes the design's routes were to draw. */
export function routesOf(lands: readonly Area[], castle: Castle | undefined): Area[] {
  return roomOpen(castle, 'farSight') && lands.length > 1 ? [...lands] : [];
}
/** The land a run's orders send it by, if a road was taken and it is one of the army's. */
export const routeLand = (o: Orders | undefined, lands: readonly Area[]): Area | undefined => (o?.route && (lands as readonly string[]).includes(o.route) ? (o.route as Area) : undefined);
/** Far Sight: the short card after each wave names the next wave's foes. */
export const farSight = (castle: Castle | undefined): boolean => roomOpen(castle, 'farSight');
