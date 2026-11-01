// Which glyph a talent wears. The glyph says what kind of effect the talent has (added attack is a sword, defence armour, life a
// heart, a crit an eye, a boot for speed, a pickaxe for an execute, a cross for healing ...), so one icon serves every talent of
// the kind in every hero's tree. The tree's own `icon` (an equipment tile) stays as it was; the page draws the glyph. Pure data.

import type { TalentNode } from './talents';
import { TALENT_ABILITIES } from './talents';
import type { StatKey } from './equipment';

/** Every glyph, with what it stands for (the test checks each has a picture and is used). */
export const GLYPHS: Readonly<Record<string, string>> = {
  heart: 'life', sword: 'attack', armour: 'defence', shield: 'blocking, guarding and resisting', eye: 'crit', boot: 'moving faster', feather: 'dodging', target: 'range',
  bolt: 'skill charge', cross: 'healing', potion: 'mending over time and on a cast', parry: 'attack speed and countering',
  burst: 'skill power', hourglass: 'a longer skill', reach: 'a wider skill', extra: 'one more of what a skill makes', bubble: 'a shield spell',
  wingboot: 'haste', snow: 'slowing', stun: 'stunning', nova: 'the ultimate', thorns: 'thorns and reflecting', rings: 'standing close to allies',
  rage: 'rage, frenzy and fire', fang: 'draining life', drop: 'bleeding', ankh: 'rising again', banner: 'rallying allies', hammer: 'a heavy blow',
  mask: 'stealth', chain: 'chaining on', blast: 'splash and bursts', crystal: 'mana', skull: 'curses', halo: 'an aura', pickaxe: 'an execute',
};

const STAT_GLYPH: Readonly<Record<StatKey, string>> = {
  hp: 'heart', atk: 'sword', def: 'armour', regen: 'cross', crit: 'eye', moveSpeed: 'boot', atkSpeed: 'parry', dodge: 'feather', range: 'target', charge: 'bolt', resist: 'shield',
};
const TAL_GLYPH: Readonly<Record<string, string>> = {
  pow: 'burst', ultPow: 'nova', ultRate: 'nova', dur: 'hourglass', reach: 'reach', extra: 'extra', castHeal: 'potion', castShield: 'bubble', castHaste: 'wingboot', refund: 'bolt',
  skillSlow: 'snow', skillStun: 'stun', block: 'shield', thorns: 'thorns', leech: 'fang', huddle: 'rings', rage: 'rage', frenzyMax: 'rage',
};
const ABILITY_GLYPH: Readonly<Record<string, string>> = {
  revive: 'ankh', rally: 'banner', shield: 'bubble', counter: 'parry', stun: 'stun', charge: 'bolt', bleed: 'drop', haste: 'wingboot', execute: 'pickaxe', smite: 'hammer',
  stealth: 'mask', slow: 'snow', chain: 'chain', splash: 'blast', mana: 'crystal', curse: 'skull', heal: 'cross', healAlly: 'cross', aura: 'halo', burn: 'rage', guard: 'shield',
  berserk: 'rage', reflect: 'thorns', burst: 'blast',
};

/** The glyph of a node: what its ability does, else what its skill change does, else its first stat. */
export function glyphOf(n: TalentNode): string {
  const ability = n.abilities?.map((id) => ABILITY_GLYPH[TALENT_ABILITIES[id]?.kind]).find(Boolean);
  if (ability) return ability;
  const tal = Object.keys(n.tal ?? {}).map((k) => TAL_GLYPH[k]).find(Boolean);
  if (tal) return tal;
  const stat = (Object.keys(n.stats ?? {}) as StatKey[]).map((k) => STAT_GLYPH[k]).find(Boolean);
  // (a stat node's score points, STATS batch 2: CON is the health it replaced, any other score the attack)
  const score = n.scores ? (n.scores.con ? STAT_GLYPH.hp : STAT_GLYPH.atk) : undefined;
  return stat ?? score ?? 'burst';
}
