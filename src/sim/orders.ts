// The player's orders inside a fight (COMBAT-002): the tap on a hero's portrait that fires its ultimate. Like the king's spells (`castSpell`), the page
// calls one checked function; unlike them, the order is queued and applied at the start of the next tick (`applyOrders`, from `stepBattle`), so it is
// tied to a tick, and every order applied (and every king's spell cast) is kept in `b.log`. A fight is its seed, its placing and that log: played again
// with the same log at the same ticks (`replayLog`), it ends the same.
//
// Pure rules: no Pixi, no DOM, no randomness.

import type { Battle, BattleEvent } from './battle';
import { ultimateOf } from './abilities';
import { heroKitOf, ultFull } from './heroKits';
import { castSpell, type SpellId } from './spells';
import { isSilenced } from './ailments';

/** A tap waiting for the next tick. */
export interface Order {
  t: number;
  kind: 'ult';
  unit: number;
}
/** What a fight's log keeps: each ultimate ordered, and each king's spell cast, at the battle time it was asked for. */
export type LogEntry = { t: number; kind: 'ult'; unit: number } | { t: number; kind: 'spell'; id: SpellId; u: number; v: number };

/** How long a queued ultimate waits for its hero to be free and to have something to hit, before the order lapses (the meter stays full). */
export const ORDER_WAIT_MS = 3000;

/** Whether the hero `unit` could be ordered to fire its ultimate now: the fight is on, it is a living hero the player placed, its ultimate is open and
 *  full, and it has no order waiting already. */
export function canOrderUltimate(b: Battle, unit: number): boolean {
  if (b.phase !== 'fight') return false;
  const u = b.units.find((x) => x.id === unit);
  if (!u || !u.alive || !heroKitOf(u) || !ultimateOf(u) || !ultFull(u)) return false;
  return u.ultOrder === undefined && !b.orders?.some((o) => o.unit === unit);
}

/** The tap on a hero's portrait: queue its ultimate for the next tick. Refuses (false, nothing changes) unless `canOrderUltimate`. */
export function orderUltimate(b: Battle, unit: number): boolean {
  if (!canOrderUltimate(b, unit)) return false;
  (b.orders ??= []).push({ t: b.t, kind: 'ult', unit });
  b.spells.events.push({ kind: 'ultQueued', by: unit });
  return true;
}

/** At the start of a tick: the orders waiting are put on their heroes (and logged); an order that has waited too long, or whose hero fell, lapses. */
export function applyOrders(b: Battle, out: BattleEvent[]): void {
  const due = b.orders ?? [];
  b.orders = undefined;
  for (const o of due) {
    const u = b.units.find((x) => x.id === o.unit);
    (b.log ??= []).push({ t: o.t, kind: 'ult', unit: o.unit });
    if (u && u.alive && ultFull(u)) u.ultOrder = b.t;
  }
  for (const u of b.units) {
    if (u.ultOrder === undefined) continue;
    // (a silenced hero's order waits for the silence to end, STATUS-FX)
    if (!u.alive || !ultFull(u) || (b.t - u.ultOrder > ORDER_WAIT_MS && !isSilenced(b, u))) {
      delete u.ultOrder;
      if (u.alive) out.push({ kind: 'ultLapse', by: u.id });
    }
  }
}

/** Play a fight's log again: before each tick, the entries asked for at this battle time are asked for again (an ultimate ordered, a king's spell cast).
 *  Called by a replay just before `stepBattle`. */
export function replayLog(b: Battle, log: readonly LogEntry[]): void {
  for (const e of log) {
    if (e.t !== b.t) continue;
    if (e.kind === 'ult') orderUltimate(b, e.unit);
    else castSpell(b, e.id, e.u, e.v);
  }
}
