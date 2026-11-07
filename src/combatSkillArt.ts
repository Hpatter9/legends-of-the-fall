// Painted combat motifs. Every current kit has an explicit assignment; future or
// custom skills keep a painted elemental emblem rather than an effect-atlas frame.
import { type Skill } from './sim/abilities';
import { skillElement, type Element } from './render/fxRules';
import { COMBAT_ART } from './combatArtAssets';
import { COMBAT_SKILL_MOTIFS } from './combatIconRules';

const ELEMENT_MOTIF: Record<Element, string> = {
  fire: 'fireball', ice: 'ice', lightning: 'lightning', light: 'bolt', dark: 'skull',
  forest: 'heal', poison: 'poison', earth: 'golem', wind: 'wind', blood: 'blood',
};
export function combatSkillSource(skill: Pick<Skill, 'name' | 'key'>, heals = false): string {
  const id = COMBAT_SKILL_MOTIFS[skill.name] ?? (skill.key ? COMBAT_SKILL_MOTIFS[skill.key] : undefined)
    ?? (heals ? 'heal' : ELEMENT_MOTIF[skillElement(skill.key ?? skill.name)]);
  return COMBAT_ART[id];
}
export function paintedSkillIcon(skill: Skill, px: number, heals: boolean): string {
  return `<img class="fhIcon fhPaintedIcon" src="${combatSkillSource(skill, heals)}" width="${px}" height="${px}" alt="" draggable="false">`;
}
