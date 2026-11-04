// The player's appearance only. The battle and its saved standKing keep their existing identity.
export const RULERS = [
  // The regal male ruler, and the default (the owner's ask): steel armour, a crimson cloak and a steady hand.
  { id: 'iron_stag', name: 'Iron Stag', role: 'The Veteran', female: false, colour: '#e6bc67', detail: 'Old scars, a treasured keepsake and a steady hand.' },
  { id: 'sun_viper', name: 'Sun Viper', role: 'The Seductress', female: true, colour: '#35d7c4', detail: 'Serpent ink, gold chains and a knowing smile.' },
  { id: 'frost_witch', name: 'Frost Witch', role: 'The Scholar', female: true, colour: '#a4d9ff', detail: 'Silver script, reading glasses and an annotated spellbook.' },
  { id: 'ash_empress', name: 'Ash Empress', role: 'The Conqueror', female: true, colour: '#ff884d', detail: 'Flame tattoos, iron piercings and fearless laughter.' },
  { id: 'rose_duchess', name: 'Rose Duchess', role: 'The Schemer', female: true, colour: '#ed91b1', detail: 'Pearls, rose ink and a pocketful of secrets.' },
  { id: 'moon_oracle', name: 'Moon Oracle', role: 'The Dreamer', female: true, colour: '#c8b4ff', detail: 'Moonstones, crescent ink and dreams written in the stars.' },
  { id: 'storm_corsair', name: 'Storm Corsair', role: 'The Rogue', female: false, colour: '#65c9e8', detail: 'Compass ink, mismatched rings and one lucky coin.' },
  { id: 'gilded_necromancer', name: 'Gilded Necromancer', role: 'The Eccentric', female: false, colour: '#9dd59a', detail: 'Runic fingers, linked earrings and a spectral companion.' },
] as const;
export type RulerId = typeof RULERS[number]['id'];
export const DEFAULT_RULER: RulerId = 'iron_stag';
/** The ninth ruler, The King, was retired from the picker (DEFAULT-RULER): saves that chose him read as the Iron Stag. The old id is still read. */
export const RETIRED_RULER = 'the_king';
export function rulerOf(value: unknown): typeof RULERS[number] {
  return RULERS.find((r) => r.id === (value === RETIRED_RULER ? DEFAULT_RULER : value)) ?? RULERS.find((r) => r.id === DEFAULT_RULER)!;
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
/** The seated ruler's head and headdress in their atlas cell (x0, y0, x1, y1 of 224): the part that breathes. The eight painted rulers'
 *  seated and command frames were each painted afresh, throne and all, so their thrones shift between frames; they hold their first
 *  seated frame (the throne still) and breathe by this box alone rising a little. Null for a ruler whose seated frames share one throne
 *  pixel for pixel, who keeps their own frames (none today). */
export const SEAT_BREATH: Readonly<Record<RulerId, readonly [number, number, number, number] | null>> = {
  sun_viper: [72, 18, 152, 72],
  frost_witch: [86, 52, 138, 100],
  ash_empress: [84, 30, 140, 76],
  rose_duchess: [72, 46, 126, 100],
  moon_oracle: [86, 34, 140, 84],
  iron_stag: [88, 56, 156, 98],
  storm_corsair: [72, 50, 150, 96],
  gilded_necromancer: [80, 24, 140, 80],
};
/** How far the head rises on a breath (atlas pixels: about one screen pixel at the throne's size), and how long each half of a breath lasts. */
export const BREATH_PX = 2;
export const BREATH_MS = 1400;
/** What a seated ruler shows (seated, or commanding from the throne): the atlas row and column, and whether the breath is drawn. The
 *  throne never moves: a painted ruler always shows the first seated frame, so the cell (and the throne in it) is the same whatever the
 *  time; only the head box breathes. Reduced motion is the still frame. */
export function seatFrame(id: RulerId, action: 'seated' | 'command', elapsed: number, still = false): { action: 'seated' | 'command'; col: number; breath: boolean } {
  const t = Math.max(0, elapsed);
  if (!SEAT_BREATH[id]) {
    // (a ruler with no breath box keeps their own frames: a two-frame idle, slowed to a breath, and a decree)
    if (action === 'command') return { action, col: rulerFrame('command', t, still), breath: false };
    return { action, col: !still && Math.floor(t / BREATH_MS) % 2 === 1 ? 2 : 0, breath: false };
  }
  return { action: 'seated', col: 0, breath: !still && Math.floor(t / BREATH_MS) % 2 === 1 };
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
