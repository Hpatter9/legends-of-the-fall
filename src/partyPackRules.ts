// HEROES-FILTER, job 2 (docs/notes/heroes-filter.md): the War Council's pack. The owner: "The satchel and plan should be on a different
// screen in the party formation screen. Maybe a button or a slide out menu." The Satchel (the remedies a run takes) and the Plan (the March
// orders) are off the party page, in a drawer that slides out from the right edge (`partyPack.ts`), with two tabs. These are the pure parts:
// whether the drawer is offered, the one line the page keeps ("Satchel 2/5 · Plan: Plain march"), and when the pull tab wears its mark.
// Nothing here changes what the Satchel or the Plan do (`sim/remedies.ts`, `marchCard.ts`). No DOM, no Pixi.

import { ELIXIR_MAX, REMEDY_IDS, SATCHEL_MAX, type RemedyId } from './sim/remedies';

export type PackTab = 'satchel' | 'plan';
type Bag = Partial<Record<RemedyId, number>>;

export interface PackState {
  /** The remedies owned (the save's), and those picked for the run. */
  owned: Bag | undefined;
  pick: Bag;
  /** Whether Auto may use remedies (the satchel shows with it on even when empty, as before). */
  auto: boolean;
  /** The Plan's line ("Plain march · Shielded"), or null when no orders are open for this march (a new save, an edit, a quest). */
  plan: string | null;
  /** Whether the player has looked at the Plan, or set it, since the War Council opened. */
  planSeen: boolean;
}

const count = (b: Bag | undefined): number => REMEDY_IDS.reduce((n, id) => n + (b?.[id] ?? 0), 0);

/** Whether the Satchel has anything to show: a remedy owned, or Auto's switch left on (the rule the party page had). */
export const satchelShown = (s: PackState): boolean => count(s.owned) > 0 || s.auto;

/** Whether the drawer, its pull tab and the page's line are offered at all: a new save with no remedy and no orders sees none of them. */
export const packShown = (s: PackState): boolean => satchelShown(s) || s.plan !== null;

/** Whether another remedy could go in: room left, and one owned that is not yet packed (one Elixir at most). */
export function satchelCanFill(s: PackState): boolean {
  if (count(s.pick) >= SATCHEL_MAX) return false;
  return REMEDY_IDS.some((id) => (s.pick[id] ?? 0) < Math.min(s.owned?.[id] ?? 0, id === 'elixir' ? ELIXIR_MAX : SATCHEL_MAX));
}

/** Whether the Plan waits to be chosen: orders are open, and they have not been looked at or set this visit. */
export const planWaits = (s: PackState): boolean => s.plan !== null && !s.planSeen;

/** The tabs that want attention: the pull tab wears its mark while there is one, and so does the tab inside the drawer. */
export const packMarks = (s: PackState): PackTab[] => [...(satchelCanFill(s) ? (['satchel'] as const) : []), ...(planWaits(s) ? (['plan'] as const) : [])];

/** The party page's one line: "Satchel 2/5 · Plan: Plain march · Shielded" (each part only while it is there). */
export function packLine(s: PackState): string {
  return [satchelShown(s) ? `Satchel ${count(s.pick)}/${SATCHEL_MAX}` : '', s.plan !== null ? `Plan: ${s.plan}` : ''].filter(Boolean).join(' · ');
}

/** The tab the drawer opens on: the one asked for, else the first that wants attention, else the Satchel if it has anything, else the Plan. */
export function firstTab(s: PackState, asked?: PackTab): PackTab {
  if (asked) return asked;
  return packMarks(s)[0] ?? (satchelShown(s) ? 'satchel' : 'plan');
}
