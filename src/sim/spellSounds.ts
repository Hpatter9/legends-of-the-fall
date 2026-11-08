// Whose sound each of the king's spells plays (KING-SPELLS batch 4, docs/notes/king-spells-b4.md). The schools' fourteen new spells borrow one
// of the first 21 spells' sounds until their own are rendered; their art is their own since batch 5 (docs/notes/king-spells-b5.md). Kept apart
// from `spells.ts` with no imports but a type, so the sound's tables can read it at load time without pulling in the fight's modules.
//
// Pure data: no Pixi, no DOM.

import type { SpellId } from './spells';

/** The first 21 spells: the ones with sounds of their own. */
export type BaseSpellId = 'heal' | 'meteor' | 'haste' | 'shield' | 'chain' | 'frost' | 'rally' | 'quake' | 'smite' | 'resurrect' | 'poison'
  | 'cleanse' | 'blink' | 'hex' | 'lance' | 'renewal' | 'deepfreeze' | 'warcry' | 'bulwark' | 'wolves' | 'starfall';
/** Whose sound each of the schools' new spells borrows until its own is rendered. */
export const SPELL_SOUND: Record<Exclude<SpellId, BaseSpellId>, BaseSpellId> = {
  firewall: 'meteor', icewall: 'frost', shatter: 'deepfreeze', gale: 'haste', thunderclap: 'chain', snare: 'poison', charm: 'hex',
  foresight: 'blink', sunbeam: 'lance', venom: 'poison', mirage: 'cleanse', drain: 'smite', bonewall: 'bulwark', raisedead: 'resurrect',
};
/** The spell whose sound a spell plays (itself, for the first 21). */
export const soundOf = (id: SpellId): BaseSpellId => (id in SPELL_SOUND ? SPELL_SOUND[id as keyof typeof SPELL_SOUND] : (id as BaseSpellId));
/** A map over the first 21 spells, filled out for the new ones with the spell each borrows from (the sound's tables). */
export function withSounds<K extends BaseSpellId, T>(base: Record<K, T>): Record<K | Exclude<SpellId, BaseSpellId>, T> {
  const out = { ...base } as Record<string, T>;
  for (const [id, from] of Object.entries(SPELL_SOUND)) if (from in base) out[id] = base[from as K];
  return out as Record<K | Exclude<SpellId, BaseSpellId>, T>;
}
