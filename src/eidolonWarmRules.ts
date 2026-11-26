// EIDOLON-SMOOTH (docs/notes/eidolon-smooth.md): the pictures an Eidolon's call draws from, named ahead, so the page can fetch and decode
// them while the heroes are still being placed. Before, the staged sheets were only fetched, and only when the horn was already full at
// the fight's start: a horn that filled in the fight called with nothing ready (the ground's sigil, cracks and scorch were then left out
// of the call altogether), and every sheet was decoded on the frame it first showed, in the middle of the strike. Pure: the tests read it;
// `eidolonCall.ts` (`warm`) carries it out.
import { RING, STRIKE_FX } from './eidolonFx';
import { glowUrl, STAGED, stageUrl, type StageSheet } from './eidolonStage';

/** Where a strike's strip is kept (the shared impact ring is a PNG, the rest WebP). */
export const fxUrl = (sheet: string): string => (sheet === RING.sheet ? `eidolons/fx/${sheet}.png` : `eidolons/fx/${sheet}.webp`);

/** The sheets of an Eidolon's call that the page lays as its own pieces (the painted strike's strips, the impact ring, and the staged
 *  show's standing sheets with their glows), each once. An Eidolon the game does not know gives none. */
export function pageSheets(id: string): string[] {
  const look = STRIKE_FX[id];
  if (!look) return [];
  const urls = [look.pillar, look.burst, look.extra, look.after].map((s) => fxUrl(s.sheet));
  urls.push(fxUrl(RING.sheet));
  const st = STAGED[id];
  if (st) for (const sh of [st.pillar, st.explosion, st.fire, st.smoke, st.embers]) {
    urls.push(stageUrl(sh));
    if (sh.lit) urls.push(glowUrl(sh));
  }
  return [...new Set(urls)];
}

/** The sheets laid on the board's own ground (the sigil, the cracks and the scorch), which the board's renderer loads. */
export function groundSheets(id: string): StageSheet[] {
  const st = STAGED[id];
  return st ? [st.sigil, st.scorch, st.cracks] : [];
}

/** Whether the warming is still to do for this Eidolon: once for each, and again only when another is chosen. */
export const warmDue = (chosen: string | null | undefined, warmed: string | null): chosen is string => !!chosen && chosen !== warmed;
