// Painted icons for the king's spells. Existing school emblems keep their atlas;
// the original spell set uses the same painted motifs as the combat controls.
import type { SpellId } from './sim/spells';
import { COMBAT_ART } from './combatArtAssets';
import { KING_SPELL_MOTIFS } from './combatIconRules';
import kingsUrl from './art/fx/kings/icons.webp';
import kingOrder from './art/fx/kings/icons.json';

export const KING_ICONS: readonly string[] = kingOrder;
const SCALE = 2;
let styled = false;
function place(id: SpellId): string {
  const king = KING_ICONS.indexOf(id);
  if (king >= 0) return `background:url(${kingsUrl}) no-repeat ${-king * 32 * SCALE}px 0 / ${KING_ICONS.length * 32 * SCALE}px ${32 * SCALE}px;image-rendering:auto`;
  const src = COMBAT_ART[KING_SPELL_MOTIFS[id] ?? 'arcane'];
  return `background:url(${src}) center / contain no-repeat;image-rendering:auto`;
}
function addStyle(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.textContent = `.spIcon { display:inline-block;flex:none;width:64px;height:64px;image-rendering:auto; }`;
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
