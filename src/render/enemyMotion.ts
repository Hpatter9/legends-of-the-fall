// The expanded enemy idles breathe slowly; action clips keep their own battle timing.
// Pure presentation rules: no Pixi, DOM or simulation writes.
export const ENEMY_MOTION_SHEETS = [
  'hk_orc_grunt', 'hk_orc_archer', 'hk_orc_brute', 'hk_orc_warlord',
  'hk_demon', 'hk_demon_lord', 'hk_imp', 'hk_ogre', 'hk_ogre_horned',
] as const;
const expanded = new Set<string>(ENEMY_MOTION_SHEETS);

/** Four frames over 1.2 seconds, staggered by unit so a warband does not breathe in unison.
 * Reduced motion holds the standing pose. Other sheets retain their existing idle clock. */
export function idleFrame(sheet: string, time: number, id: number, reduced: boolean): number {
  if (!expanded.has(sheet)) return Math.floor(time / 110);
  if (reduced) return 0;
  return Math.floor(((time + id * 173) % 1200) / 300);
}
