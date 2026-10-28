// How the hero kits' new skills look (COMBAT-002): until each has its own painting (the FX-004 list in docs/notes/hero-kits.md), every new skill
// plays a close existing FX-003 signature, recoloured where the two would otherwise read the same, and takes that skill's element for its wind-up
// and sound. Plain data, read by `fx.ts` and the sound rules through `kitSignature` and `kitElement`; the FX-003 tables are not changed.

import { SIGNATURES, type Signature, type Step } from './signatures';
import type { Element } from './fxRules';

/** Each new skill: the existing skill whose signature it plays, a tint for it (none keeps the painting's own colours), and its element. */
export const KIT_LOOKS: Readonly<Record<string, { as: string; tint?: number; el: Element }>> = {
  'Shield Bash': { as: 'Shield Wall', tint: 0xffd27a, el: 'earth' },
  'Parry Stance': { as: 'Iaido', tint: 0xe8f4ff, el: 'wind' },
  'Smoke Bomb': { as: 'Shadow Step', tint: 0x9a9aa8, el: 'dark' },
  'Pinning Shot': { as: 'Volley', tint: 0xffe08a, el: 'wind' },
  Wildfire: { as: 'Meteor', tint: 0xff7a30, el: 'fire' },
  'Brace Spears': { as: 'Hold the Line', tint: 0xd8c08a, el: 'earth' },
  'Stillness Palm': { as: 'Thousand Fists', tint: 0xa8e0ff, el: 'light' },
  'Flask Toss': { as: 'Sanctuary', tint: 0x9cff9a, el: 'light' },
  Overload: { as: 'Chain Lightning', tint: 0xc8a8ff, el: 'lightning' },
  'Fox Guise': { as: 'Fox Charm', tint: 0xffb070, el: 'dark' },
  Pilfer: { as: 'Dive', tint: 0xffd34a, el: 'wind' },
  'Turning Wind': { as: 'Wind Gust', tint: 0xb8f0ff, el: 'wind' },
  Shift: { as: 'Ravage', tint: 0xd0d0e0, el: 'dark' },
  'Bull Rush': { as: 'Gore Charge', tint: 0xffb080, el: 'earth' },
  'Pied Piper': { as: 'Pipes of Pan', tint: 0xff9ad8, el: 'wind' },
  'Stone Garden': { as: 'Stone Curse', tint: 0xc8c8b8, el: 'earth' },
  'Plant the Standard': { as: 'War Banner', tint: 0xff8a6a, el: 'fire' },
  "Martyr's Vow": { as: 'Holy Challenge', tint: 0xffe8a8, el: 'light' },
  Smite: { as: 'Judgement', tint: 0xfff0b0, el: 'light' },
  Treeform: { as: 'Call Treant', tint: 0x9ce07a, el: 'earth' },
  'Blood Fury': { as: 'Bloodlust', tint: 0xff5050, el: 'fire' },
  'Spike Field': { as: 'Snare Trap', tint: 0xd0b890, el: 'earth' },
  'Soul Siphon': { as: 'Hex', tint: 0x80ffb0, el: 'dark' },
  'Trade Places': { as: 'Mirror Image', tint: 0xa0e8ff, el: 'light' },
  'Fan the Hammer': { as: 'Burst Fire', tint: 0xffd080, el: 'fire' },
  Devour: { as: 'Rotting Touch', tint: 0xa0d070, el: 'dark' },
  'Suppressing Fire': { as: 'Burst Fire', tint: 0xff9a50, el: 'fire' },
  'Mark for Coin': { as: 'Bounty Hunt', tint: 0xffd34a, el: 'dark' },
  'Puppet Strings': { as: 'Binding Wraps', tint: 0xd8b0ff, el: 'dark' },
  'Roll the Bones': { as: 'Grappling Hook', tint: 0xfff0d0, el: 'light' },
  'Change the Tune': { as: 'Dirge', tint: 0xffd890, el: 'wind' },
  "Sic 'Em": { as: 'Call of the Wild', tint: 0xffb070, el: 'earth' },
  Flood: { as: 'Undertow', tint: 0x80c8ff, el: 'ice' },
  'Wheel About': { as: 'Lance Charge', tint: 0xe0e8ff, el: 'wind' },
  'Bound Soul': { as: 'Reap', tint: 0x9ad8ff, el: 'dark' },
  Rewind: { as: 'Temporal Surge', tint: 0xb0a0ff, el: 'lightning' },
  Grounding: { as: 'Voltage Blink', tint: 0x80d0ff, el: 'lightning' },
  'Powder Keg': { as: 'Broadside', tint: 0xffa050, el: 'fire' },
  'Siege Mode': { as: 'Shell Barrage', tint: 0xb0b8c0, el: 'fire' },
  'Guardian Angel': { as: 'Holy Light', tint: 0xfff6c8, el: 'light' },
  Jump: { as: 'Dive', tint: 0xff9a60, el: 'fire' },
  'Raise Rampart': { as: 'Earthquake', tint: 0xc8b090, el: 'earth' },
  'Font of Wisdom': { as: 'Starfall', tint: 0x90b8ff, el: 'light' },
  'Blood Price': { as: 'Hellblade Sweep', tint: 0xff4060, el: 'dark' },
  Condemn: { as: 'Judgement', tint: 0xff8060, el: 'fire' },
};

const tinted = (steps: Step[], tint: number | undefined): Step[] => (tint === undefined ? steps : steps.map((x) => ({ ...x, t: tint })));
const made = new Map<string, Signature | null>();

/** The signature a skill plays: its own (FX-003), or for a hero kit's new skill, the one it borrows, recoloured. */
export function kitSignature(name: string): Signature | undefined {
  const own = SIGNATURES[name];
  if (own) return own;
  if (!made.has(name)) {
    const look = KIT_LOOKS[name];
    const base = look && SIGNATURES[look.as];
    made.set(name, base ? { wind: tinted(base.wind, look.tint), cast: tinted(base.cast, look.tint), hit: tinted(base.hit, look.tint) } : null);
  }
  return made.get(name) ?? undefined;
}

/** A kit skill's element, when it is one of the new skills (`skillElement` falls back to it). */
export const kitElement = (name: string): Element | undefined => KIT_LOOKS[name]?.el;
