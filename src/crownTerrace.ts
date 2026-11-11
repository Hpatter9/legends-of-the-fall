// Crown Terrace: presentation only. Saved castle levels remain the sole source of building progress.
import { chapelBuilt, siteLevel, siteTop, type SiteId } from './sim/castle';
import type { Meta } from './sim/meta';
import type { RulerId } from './rulerRules';

export const TERRACE_WIDTH = 800;
export const TERRACE_HEIGHT = 1200;
export const TERRACE_KING = { x: 622, y: 714, h: 258 } as const;
export const TERRACE_GOAT = { y: 970, nestX: 168, minX: 155, maxX: 650 } as const;
export const TERRACE_GUARDS = [
  { x: 460, y: 742, height: 206, faceRight: true },
  { x: 685, y: 828, height: 216, faceRight: false },
  { x: 205, y: 821, height: 222, faceRight: true },
  { x: 400, y: 930, height: 238, faceRight: false },
] as const;

export const RULER_COURTS: Record<RulerId, { name: string; detail: string; light: number; shade: string; weather: 'motes' | 'snow' | 'embers' | 'stars' | 'rain' }> = {
  iron_stag: { name: 'The Crown Terrace', detail: 'Sunlit stone, crimson standards and a kingdom worth defending.', light: 0xffcb77, shade: '#8c6239', weather: 'motes' },
  sun_viper: { name: 'The Serpent Palace', detail: 'Emerald silks, serpent-carved sandstone and an oasis kingdom.', light: 0xffdb85, shade: '#b48b48', weather: 'motes' },
  frost_witch: { name: 'The Crystal Citadel', detail: 'Silver ice, sapphire velvet and a snowbound realm.', light: 0xb6ddff, shade: '#a9d5ee', weather: 'snow' },
  ash_empress: { name: 'The Ember Bastion', detail: 'Obsidian arches, phoenix banners and a volcanic dominion.', light: 0xff8b42, shade: '#75432f', weather: 'embers' },
  rose_duchess: { name: 'The Thorn Gallery', detail: 'Rose marble, pearl silks and gardens full of secrets.', light: 0xffc8c1, shade: '#b28f84', weather: 'motes' },
  moon_oracle: { name: 'The Star Observatory', detail: 'Silver constellations above a moonlit kingdom.', light: 0xb5bdff, shade: '#56618c', weather: 'stars' },
  storm_corsair: { name: 'The Tempest Quarterdeck', detail: 'Salt-worn stone, compass banners and a harbour realm.', light: 0x8fdce9, shade: '#608b91', weather: 'rain' },
  gilded_necromancer: { name: 'The Gilded Necropolis', detail: 'Black marble, gilded bones and a spectral valley.', light: 0xa8edb4, shade: '#657c62', weather: 'stars' },
};
export const terraceArtUrl = (name: string): string => `ui/crown-terrace/${name}.webp`;

/** Feet in the distant landscape, well inside the two open arches; no landmark crosses a foreground column. */
export const TERRACE_LANDMARKS: readonly { id: SiteId; x: number; y: number; w: number }[] = [
  { id: 'watchtower', x: 90, y: 463, w: 56 },
  { id: 'mageTower', x: 257, y: 477, w: 62 },
  { id: 'chapel', x: 171, y: 508, w: 73 },
  { id: 'hall', x: 397, y: 506, w: 68 },
  { id: 'library', x: 92, y: 538, w: 68 },
  { id: 'treasury', x: 260, y: 550, w: 75 },
  { id: 'armoury', x: 393, y: 561, w: 70 },
  { id: 'barracks', x: 171, y: 580, w: 85 },
  { id: 'smithy', x: 83, y: 600, w: 72 },
  { id: 'stable', x: 263, y: 613, w: 82 },
  { id: 'drillYard', x: 172, y: 622, w: 91 },
];

/** Art tiers change at actual completed levels; every level also grows the silhouette, including levels within one art tier. */
export function landmarkState(meta: Meta, id: SiteId): { level: number; stage: 0 | 1 | 2 | 3; scale: number; working: boolean } {
  const level = Math.max(0, Math.min(siteTop(id), siteLevel(meta.castle, id, chapelBuilt(meta))));
  const share = level / siteTop(id);
  return { level, stage: !level ? 0 : share <= 1 / 3 ? 1 : share <= 2 / 3 ? 2 : 3, scale: level ? .65 + share * .35 : 0, working: meta.works?.id === id };
}

/** Court choices never add unowned heroes or duplicates, and never change the battle party. Empty slots stay empty. */
export function courtGuardKinds(unlocked: readonly string[], preferred: unknown, automatic: readonly string[]): string[] {
  const owned = new Set(unlocked);
  const picks = Array.isArray(preferred) ? preferred.filter((x): x is string => typeof x === 'string') : [];
  const result: string[] = [];
  for (const kind of [...picks, ...automatic, ...unlocked]) {
    if (owned.has(kind) && !result.includes(kind)) result.push(kind);
    if (result.length === 4) break;
  }
  return result;
}

/** Picking an already displayed hero swaps the two seats, rather than displaying duplicates. */
export function changeCourtGuard(current: readonly string[], slot: number, kind: string): string[] {
  const next = [...current];
  if (slot < 0 || slot > 3 || slot > next.length) return next;
  const previous = next.indexOf(kind);
  if (previous >= 0) [next[slot], next[previous]] = [kind, next[slot]];
  else next[slot] = kind;
  return next.filter(Boolean).slice(0, 4);
}
