// The battle in progress (phase 2, `docs/notes/assault-2.md`; the design's 6.4): an assault is long, and a phone closes a page. Every twenty
// seconds of battle time the page stores the whole battle (`Battle` is plain data: it survives a structured clone, and a clone stepped on
// plays out exactly as the original would), and the save notes that an assault is under way (`AssaultMeta.live`). A reload offers to
// resume it from that moment; abandoned, it counts as a withdrawal. While one is under way the fallen keep their places in the save's lists
// (as -1), so the survivors' marks go to the right soldiers when it is settled.
//
// Pure rules: no Pixi, no DOM (the store itself is the page's, `assaultSave.ts`).

import type { Battle } from '../battle';
import type { Meta } from '../meta';
import { assaultOf } from './economy';

/** A snapshot every this much battle time. */
export const SNAPSHOT_MS = 20_000;

/** Whether this tick is a snapshot's: every `SNAPSHOT_MS` of battle time, while the fight goes on. */
export const snapshotDue = (b: Battle): boolean => b.phase === 'fight' && b.t > 0 && b.t % SNAPSHOT_MS === 0;

/** Note in the save that an assault is under way (at the march, and at each snapshot). */
export function noteLive(m: Meta, b: Battle, day: number): void {
  const h = b.field!.hold!;
  assaultOf(m).live = { army: h.input.army, t: b.t, day, ...(h.input.tier && h.input.tier >= 4 ? { restorm: true } : {}) };
}

/** The assault under way is over (settled, or abandoned): the note goes, and the fallen leave the lists. */
export function clearLive(m: Meta): void {
  const a = m.assault;
  if (!a) return;
  delete a.live;
  for (const [k, list] of Object.entries(a.troops)) a.troops[k] = list.filter((x) => x >= 0);
}

/** Abandon the assault under way (no snapshot to resume, or the player's choice): a withdrawal. The try counts, the fallen stay fallen, the
 *  survivors earn nothing and the siege works are not paid back. */
export function abandonLive(m: Meta): void {
  const live = m.assault?.live;
  if (!live) return;
  const a = assaultOf(m);
  a.tries[live.army] = (a.tries[live.army] ?? 0) + 1;
  clearLive(m);
}
