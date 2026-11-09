// Presentation shared by the Castle tab's hall and building ledger. Castle rules remain in sim/castle.
import { BUILDING_IDS, ROOM_BUILDING_IDS, buildMs, chapelBuilt, clockText, siteLevel, siteNextCost, siteTop, worksLeft, type SiteId } from './sim/castle';
import type { Meta } from './sim/meta';
export const CASTLE_SITES: readonly SiteId[] = [...BUILDING_IDS, 'chapel', ...ROOM_BUILDING_IDS];
export const HALL_WIDTH = 800;
export const HALL_HEIGHT = 540;
export const HALL_FLOOR_OFFSET = 60;
export function siteBenefit(id: SiteId, level: number): string {
  switch (id) {
    case 'treasury': return `+${level * 10} starting gold`;
    case 'barracks': return `+${level * 6}% hero health`;
    case 'armoury': return `+${level * 5}% hero attack`;
    case 'mageTower': return `+${level * 12}% mana recovery`;
    case 'stable': return `+${level * 4}% movement speed`;
    case 'library': return `+${level * 6}% battle XP`;
    case 'chapel': return level ? 'Spellcraft & sacred rites' : 'Unlock spellcraft';
    case 'smithy': return 'Camp repairs & gear care';
    case 'watchtower': return 'March orders & scouting';
    case 'hall': return `${level} mentor ${level === 1 ? 'seat' : 'seats'}`;
    case 'drillYard': return level >= 2 ? 'Veteran Assault recruits' : level ? 'Blooded Assault recruits' : 'Train Assault recruits';
  }
}
export function sitePresentation(meta: Meta, id: SiteId, now: number) {
  const level = siteLevel(meta.castle, id, chapelBuilt(meta));
  const cost = siteNextCost(meta.castle, id, chapelBuilt(meta));
  const working = meta.works?.id === id;
  const busy = !!meta.works && !working;
  const full = cost === null;
  return {
    level, cost, working, busy, full,
    ready: !working && !busy && !full && meta.crowns >= cost,
    benefit: siteBenefit(id, Math.max(1, level)),
    levelText: level ? `Lv ${level} / ${siteTop(id)}` : 'Unbuilt',
    action: working ? 'Building' : full ? 'Complete' : busy ? 'Builders busy' : level ? 'Upgrade' : 'Build',
    detail: working ? clockText(worksLeft(meta, now)) : full ? 'All levels built' : `${cost} crowns`,
  };
}
export function constructionProgress(meta: Meta, now: number): number {
  if (!meta.works) return 0;
  const duration = buildMs(meta.works.id, meta.works.level);
  return Math.max(0, Math.min(1, 1 - worksLeft(meta, now) / duration));
}
