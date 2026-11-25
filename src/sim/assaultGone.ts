// RELEASE-TRIM: the Assault is gone (the owner's call before release: "it doesn't work well yet"; `docs/notes/release-trim.md`). A save that
// played it still loads, and is paid back once for what it bought and can no longer use, so nothing is lost silently:
//
// - every soldier still standing in its platoons, at the price it was bought for (60 crowns);
// - every hold scouted and not yet stormed (100 crowns: the scouts' report it paid for and never used);
// - one last tribute from each hold it conquered (a day's tribute, as the cart paid it);
// - the Drill Yard, a castle building that only trained the Assault's recruits: every level built, and a level being built, at what it cost.
//
// A storming in progress is withdrawn, as the old page's "abandon" did: its fallen stay fallen and its survivors are paid back above. The
// Conquest chests already won stay in the stash and open as before (`armyStars.ts`); a War already ended at the Last Hold stays ended. The
// save's `assault` and the castle's `drillYard` are dropped. Pure rules: no Pixi, no DOM.

import { armyById, armyIndex } from './armies';

/** What the Assault charged: a recruit, and the scouts. */
export const ASSAULT_REFUND = { recruit: 60, scouts: 100 } as const;
/** The Drill Yard's levels' costs. */
export const DRILL_YARD_COSTS: readonly number[] = [500, 1500];
/** The tribute a conquered hold paid each day (the Assault's `tributeOf`). */
export const lastTribute = (army: string): number => Math.round(150 * (1 + 0.15 * Math.max(0, armyIndex(army))));

/** What a save was paid back, by kind, for the page to say once. */
export interface AssaultGone {
  crowns: number;
  soldiers: number;
  scouts: number;
  holds: number;
  drill: number;
}

/** The part of a raw save this reads and changes (read before the castle and the builders' works are read). */
interface RawSave {
  crowns: number;
  assault?: unknown;
  castle?: unknown;
  works?: unknown;
}

const obj = (x: unknown): Record<string, unknown> | undefined => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : undefined);

/** Pay a save back for the Assault and drop what is left of it. Returns what was paid, or undefined for a save that never played it. */
export function settleAssaultGone(m: RawSave): AssaultGone | undefined {
  const out: AssaultGone = { crowns: 0, soldiers: 0, scouts: 0, holds: 0, drill: 0 };
  let any = false;
  const a = obj(m.assault);
  if ('assault' in m) {
    delete m.assault;
    any = !!a;
  }
  if (a) {
    // (the soldiers standing: a fallen one, -1, in a storming still under way stays lost)
    for (const list of Object.values(obj(a.troops) ?? {}))
      if (Array.isArray(list)) out.soldiers += Math.min(10, list.filter((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0).length);
    const conquered = Object.keys(obj(a.conquered) ?? {}).filter((id) => armyById(id));
    out.scouts = Object.keys(obj(a.scouted) ?? {}).filter((id) => armyById(id) && !conquered.includes(id)).length;
    out.holds = conquered.length;
    out.crowns += out.soldiers * ASSAULT_REFUND.recruit + out.scouts * ASSAULT_REFUND.scouts + conquered.reduce((n, id) => n + lastTribute(id), 0);
  }
  const castle = obj(m.castle);
  if (castle && 'drillYard' in castle) {
    const level = Math.max(0, Math.min(DRILL_YARD_COSTS.length, Math.floor(Number(castle.drillYard)) || 0));
    for (let i = 0; i < level; i++) out.drill += DRILL_YARD_COSTS[i];
    delete castle.drillYard;
    any = true;
  }
  const works = obj(m.works);
  if (works?.id === 'drillYard') {
    const level = Math.floor(Number(works.level));
    out.drill += DRILL_YARD_COSTS[level - 1] ?? 0;
    delete m.works;
    any = true;
  }
  out.crowns += out.drill;
  if (!any) return undefined;
  m.crowns = (Number.isFinite(m.crowns) ? m.crowns : 0) + out.crowns;
  return out;
}

/** The page's words for what was paid back. */
export function assaultGoneLine(g: AssaultGone): string {
  const parts = [
    g.soldiers ? `${g.soldiers} soldier${g.soldiers === 1 ? '' : 's'}` : '',
    g.scouts ? `${g.scouts} scouts' report${g.scouts === 1 ? '' : 's'}` : '',
    g.holds ? `the last tribute of ${g.holds} hold${g.holds === 1 ? '' : 's'}` : '',
    g.drill ? 'the Drill Yard' : '',
  ].filter(Boolean);
  const what = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return g.crowns ? `The Assault has been withdrawn for now: ${g.crowns} crowns returned for ${what}` : 'The Assault has been withdrawn for now';
}
