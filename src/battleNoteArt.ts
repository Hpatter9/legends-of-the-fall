// Decorative pictures for the existing recap lines; the words remain the label.
import { COMBAT_ART } from './combatArtAssets';
import heart from './art/ui/combat-heart.png';

export function battleNoteSource(kind: string): string {
  if (kind === 'heart' || kind === 'risen') return heart;
  if (kind === 'horn') return 'eidolons/horn-ready.webp';
  if (kind === 'wear') return 'shop/repair.webp';
  const motifs: Record<string, string> = {
    level: 'star', ult: 'star', drop: 'bag', found: 'bag', fell: 'skull', quest: 'banner',
    bench: 'helmet', learned: 'book', skill: 'star', study: 'book', guest: 'helmet',
    pack: 'bag', nemesis: 'skull',
  };
  return COMBAT_ART[motifs[kind] ?? 'star'];
}
