// Painted badges for the battle's synergy strip only. Roster badges retain their
// established style and all trait counts, names and effects stay with the caller.
import { TRAITS } from './sim/traits';
import { COMBAT_ART } from './combatArtAssets';
import { BATTLE_TRAIT_MOTIFS } from './combatIconRules';
export function battleTraitBadge(id: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = 'battleTraitIcon';
  img.src = COMBAT_ART[BATTLE_TRAIT_MOTIFS[id] ?? (id === 'rival' ? 'swords' : 'chain')];
  img.alt = '';
  img.title = TRAITS[id]?.name ?? 'Bonds';
  img.draggable = false;
  return img;
}
