// The king's spells have their own artwork and release geometry, separate from identically named hero magic.
import type { SpellId } from '../sim/spells';
import type { Signature, Step } from './signatures';

const step = (id: SpellId, s: Step['s'], o: Partial<Step> = {}): Step => ({ s, k: 'light-hit', art: `spell:${id}`, z: 2.2, a: 0.9, ...o });
const spell = (id: SpellId, shape: Step['s'], options: Partial<Step> = {}): Signature => ({
  wind: [], cast: [step(id, shape, options)], hit: [step(id, 'pop', { z: 1.5, f: 85 })],
});

export const SPELL_SIGNATURES: Record<SpellId, Signature> = {
  heal: spell('heal', 'spiral', { n: 4, r: 14, z: 1.4, on: 'allies' }),
  meteor: spell('meteor', 'meteor', { z: 3, l: 'fire-explosion' }),
  haste: spell('haste', 'orbit', { n: 3, r: 22, z: 1.4 }),
  shield: spell('shield', 'dome', { z: 2.4, on: 'allies' }),
  smite: spell('smite', 'drop', { z: 2.8, on: 'target', l: 'light-hit' }),
  chain: spell('chain', 'chain', { z: 0.7 }),
  frost: spell('frost', 'ripple', { n: 3, z: 3.2, f: 80 }),
  rally: spell('rally', 'barrier', { n: 1, r: 0, z: 1.8, on: 'allies' }),
  quake: spell('quake', 'spikes', { n: 4, r: 100, z: 2 }),
  resurrect: spell('resurrect', 'pillar', { z: 3, f: 100 }),
  poison: spell('poison', 'flare', { z: 3, a: 0.7, f: 110 }),
  cleanse: spell('cleanse', 'spray', { n: 6, r: 50, z: 1 }),
  blink: spell('blink', 'dash', { n: 2, r: 38, z: 2 }),
  hex: spell('hex', 'inward', { n: 3, r: 25, z: 1.4 }),
  lance: spell('lance', 'beam', { n: 4, r: 130, z: 2, f: 60 }),
  renewal: spell('renewal', 'ring', { z: 3, f: 110 }),
  deepfreeze: spell('deepfreeze', 'cleave', { z: 3, on: 'target' }),
  warcry: spell('warcry', 'fan', { n: 3, r: 2, z: 2 }),
  bulwark: spell('bulwark', 'pillars', { n: 3, r: 32, z: 1.7 }),
  wolves: spell('wolves', 'pop', { z: 3, f: 90 }),
  starfall: spell('starfall', 'rain', { n: 5, z: 2.6, l: 'fire-hit' }),
};
