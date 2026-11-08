// Development-only visual review exports; never imported by the game entry point.
import { HERO_KITS } from '../../src/sim/heroKits';
import { ultimateOf } from '../../src/sim/abilities';
import type { Unit } from '../../src/sim/battle';
export { ARMIES } from '../../src/sim/armies';
export { COMBAT_ART } from '../../src/combatArtAssets';
export { combatSkillSource } from '../../src/combatSkillArt';
export { SPELL_IDS } from '../../src/sim/spells';
export { spellIconHtml } from '../../src/spellIcons';
export { drawWaveNotes } from '../../src/waveCardView';
export const skills = Object.entries(HERO_KITS()).flatMap(([hero, kit]) => {
  const ult = ultimateOf({ def: hero, side: 'hero', level: 40 } as Unit);
  return [...kit.slots.map((s) => s.skill), ...kit.slots.flatMap((s) => s.revive ? [s.revive.skill] : []), ...(ult ? [ult] : [])].map((skill) => ({ hero, name: skill.name, key: skill.key }));
});
