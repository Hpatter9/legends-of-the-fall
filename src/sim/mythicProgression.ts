// A hard-earned legend joins with its whole kit available, including its ultimate.
// Existing ownership is never used to reset XP or repeat this gift.
import type { Meta } from './meta';
import { isMythic } from './mythicRules';
import { xpFor } from './levels';
export const MYTHIC_JOIN_LEVEL = 30;
export function welcomeMythic(m: Meta, kind: string): void {
  if (isMythic(kind)) m.xp[kind] = Math.max(m.xp[kind] ?? 0, xpFor(MYTHIC_JOIN_LEVEL));
}
