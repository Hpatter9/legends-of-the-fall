// The Chapel's rooms (DEPTH-BUILD, docs/notes/depth-design.md section 3): the Vigil (level 2) chooses how the party rises when a heart
// burns, set on the march card (`Run.orders.vigil`); Last Rites (level 3) raises the first hero to fall in a wave at a quarter of health
// after 5 s, once a run. Both are fixed when the fight starts (the stage carries them) and draw from no stream. Pure rules: no Pixi, no DOM.

import { cleanse } from './ailments';
import type { Battle, BattleEvent, Unit } from './battle';

export type VigilId = 'shielded' | 'swift' | 'cleansed';
export const VIGILS: Readonly<Record<VigilId, { name: string; line: string; icon: string }>> = {
  shielded: { name: 'Shielded', line: 'The party rises with a shield of 15% of their health.', icon: '🛡' },
  swift: { name: 'Swift', line: 'The party rises hasted for 4 s.', icon: '💨' },
  cleansed: { name: 'Cleansed', line: 'The party rises with every ailment gone.', icon: '✨' },
};
export const VIGIL_IDS = Object.keys(VIGILS) as VigilId[];
export const isVigil = (x: unknown): x is VigilId => typeof x === 'string' && (VIGIL_IDS as string[]).includes(x);

export const RITES = { DELAY_MS: 5000, HP: 0.25, SHIELD: 0.15, HASTE_MS: 4000 };

/** The Vigil's gift to the heroes a heart has just raised (called after `reviveParty`). */
export function applyVigil(b: Battle, raised: readonly Unit[], vigil: VigilId | undefined, out: BattleEvent[] = []): void {
  if (!vigil) return;
  for (const u of raised) {
    if (!u.alive) continue;
    if (vigil === 'shielded') u.shield = { hp: Math.round(u.maxHp * RITES.SHIELD) + (u.shield && u.shield.until > b.t ? u.shield.hp : 0), until: 1e9 };
    else if (vigil === 'swift') {
      u.hasteUntil = Math.max(u.hasteUntil ?? 0, b.t + RITES.HASTE_MS);
      out.push({ kind: 'haste', to: u.id, ms: RITES.HASTE_MS });
    } else cleanse(b, u);
  }
}

/** A hero has just fallen: with Last Rites ready in this fight, the first to fall is marked to rise. */
export function ritesFall(b: Battle, to: Unit): void {
  const r = b.rites;
  if (!r || r.id !== undefined || to.side !== 'hero' || to.owner !== undefined) return;
  r.id = to.id;
  r.at = b.t + RITES.DELAY_MS;
}

/** Each tick: a hero marked by Last Rites rises when its time comes, at a quarter of its health (once; the run then spends the room). */
export function tickRites(b: Battle, out: BattleEvent[]): void {
  const r = b.rites;
  if (!r || r.id === undefined || r.done || b.t < (r.at ?? Infinity)) return;
  const u = b.units.find((x) => x.id === r.id);
  r.done = true;
  if (!u || u.alive) return;
  u.alive = true;
  u.hp = Math.max(1, Math.round(u.maxHp * RITES.HP));
  u.diedAt = undefined;
  u.step = undefined;
  u.swing = undefined;
  u.cast = undefined;
  u.busyUntil = b.t;
  out.push({ kind: 'revive', by: u.id, to: u.id, hp: u.hp });
  out.push({ kind: 'heal', to: u.id, amount: u.hp });
}

/** After a fight: whether Last Rites was spent in it (the run keeps that, so it comes once a run). */
export const ritesSpent = (b: Pick<Battle, 'rites'>): boolean => !!b.rites?.done;
