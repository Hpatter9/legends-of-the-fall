// The player's appearance only. The battle and its saved standKing keep their existing identity.
export const RULERS = [
  { id: 'sun_viper', name: 'Sun Viper', role: 'The Seductress', female: true, colour: '#35d7c4', detail: 'Serpent ink, gold chains and a knowing smile.' },
  { id: 'frost_witch', name: 'Frost Witch', role: 'The Scholar', female: true, colour: '#a4d9ff', detail: 'Silver script, reading glasses and an annotated spellbook.' },
  { id: 'ash_empress', name: 'Ash Empress', role: 'The Conqueror', female: true, colour: '#ff884d', detail: 'Flame tattoos, iron piercings and fearless laughter.' },
  { id: 'rose_duchess', name: 'Rose Duchess', role: 'The Schemer', female: true, colour: '#ed91b1', detail: 'Pearls, rose ink and a pocketful of secrets.' },
  { id: 'moon_oracle', name: 'Moon Oracle', role: 'The Dreamer', female: true, colour: '#c8b4ff', detail: 'Moonstones, crescent ink and dreams written in the stars.' },
  { id: 'iron_stag', name: 'Iron Stag', role: 'The Veteran', female: false, colour: '#e6bc67', detail: 'Old scars, a treasured keepsake and a steady hand.' },
  { id: 'storm_corsair', name: 'Storm Corsair', role: 'The Rogue', female: false, colour: '#65c9e8', detail: 'Compass ink, mismatched rings and one lucky coin.' },
  { id: 'gilded_necromancer', name: 'Gilded Necromancer', role: 'The Eccentric', female: false, colour: '#9dd59a', detail: 'Runic fingers, linked earrings and a spectral companion.' },
] as const;
export type RulerId = typeof RULERS[number]['id'];
export const DEFAULT_RULER: RulerId = 'iron_stag';
export function rulerOf(value: unknown): typeof RULERS[number] {
  return RULERS.find((r) => r.id === value) ?? RULERS[5];
}
export type RulerAction = 'idle' | 'walk' | 'strike' | 'cast' | 'hurt' | 'dead' | 'seated' | 'command';
export const RULER_ACTIONS: RulerAction[] = ['idle', 'walk', 'strike', 'cast', 'hurt', 'dead', 'seated', 'command'];
/** One-shots finish and hold; idle and walking alone loop. Reduced motion keeps a meaningful pose. */
export function rulerFrame(action: RulerAction, elapsed: number, still = false): number {
  if (still) return action === 'dead' ? 3 : action === 'cast' || action === 'command' || action === 'strike' ? 2 : 0;
  const t = Math.max(0, elapsed);
  return action === 'idle' || action === 'seated' ? Math.floor(t / 350) % 4
    : action === 'walk' ? Math.floor(t / 130) % 4 : Math.min(3, Math.floor(t / 180));
}
/** Only references to the player's ruler, never named enemy kings or kingdom. */
export function rulerWords(text: string, id: RulerId): string {
  if (!rulerOf(id).female) return text;
  return text.replace(/\bthe king\b/g, 'the queen').replace(/\bThe king\b/g, 'The queen')
    .replace(/\bThe King\b/g, 'The Queen').replace(/\bthe King\b/g, 'the Queen')
    .replace(/\byour king\b/g, 'your queen').replace(/\ba king\b/g, 'a queen')
    .replace(/\bKing's spells\b/g, "Queen's spells").replace(/\bking's spells\b/g, "queen's spells")
    .replace(/\b([Tt]he queen) at his throne\b/g, '$1 at her throne')
    .replace(/\b([Tt]he queen) on his keep\b/g, '$1 on her keep');
}
