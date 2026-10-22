// A pixel icon for each king's spell, cut from the Pixel Effects atlas (`src/art/fx/pack/atlas.png`, the same strips the
// spells' effects play): one 32px frame of a strip, drawn at 2x with hard edges. `spellIcon(id)` gives the element,
// `spellIconHtml(id)` the same as markup (for the cards that are built from strings).

import atlasUrl from './art/fx/pack/atlas.png';
import atlas from './art/fx/pack/atlas.json';
import type { SpellId } from './sim/spells';

/** The strip and frame (0 to 5) each spell shows. */
export const SPELL_ICON: Record<SpellId, [strip: string, frame: number]> = {
  heal: ['light-gather', 3],
  meteor: ['fire-orb', 2],
  haste: ['wind-vortex', 2],
  shield: ['light-shield', 3],
  smite: ['light-pillar', 3],
  chain: ['lightning-strike', 3],
  poison: ['poison-orb', 2],
  frost: ['ice-nova', 3],
  rally: ['fire-aura', 3],
  quake: ['earth-spikes', 3],
  resurrect: ['light-rune', 3],
  cleanse: ['light-sparkle', 2],
  blink: ['dark-nova', 3],
  hex: ['dark-rune', 3],
  lance: ['light-strike', 3],
  renewal: ['forest-aura', 3],
  deepfreeze: ['ice-pillar', 3],
  warcry: ['fire-nova', 3],
  bulwark: ['earth-shield', 3],
  wolves: ['forest-gather', 3],
  starfall: ['fire-explosion', 3],
};

const SCALE = 2;
const SHEET = atlas as unknown as Record<string, [number, number, number]>;
let styled = false;

/** The offset style of a spell's frame, or '' for a strip the atlas lacks. */
function place(id: SpellId): string {
  const [strip, frame] = SPELL_ICON[id];
  const at = SHEET[strip];
  return at ? `background-position:${-(at[0] + frame * 32) * SCALE}px ${-at[1] * SCALE}px` : '';
}

function addStyle(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  // (the atlas is 1024 px wide and 1824 tall; the one data URL is shared by every icon)
  style.textContent = `.spIcon { display: inline-block; flex: none; width: ${32 * SCALE}px; height: ${32 * SCALE}px; background: url(${atlasUrl}) no-repeat; background-size: ${1024 * SCALE}px ${1824 * SCALE}px; image-rendering: pixelated; }`;
  document.head.append(style);
}

export function spellIconHtml(id: SpellId): string {
  addStyle();
  return `<i class="spIcon" style="${place(id)}"></i>`;
}

export function spellIcon(id: SpellId): HTMLElement {
  addStyle();
  const e = document.createElement('i');
  e.className = 'spIcon';
  e.style.cssText = place(id);
  return e;
}
