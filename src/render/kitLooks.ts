// How the hero kits' new skills look (COMBAT-002): until each has its own painting (the FX-004 list in docs/notes/hero-kits.md), every new skill
// plays a close existing FX-003 signature, recoloured where the two would otherwise read the same, and takes that skill's element for its wind-up
// and sound. Plain data, read by `fx.ts` and the sound rules through `kitSignature` and `kitElement`; the FX-003 tables are not changed.

import { SIGNATURES, type Signature, type Step } from './signatures';
import type { Element } from './fxRules';

/** Each new skill: the existing skill whose signature it plays, a tint for it (none keeps the painting's own colours), and its element. */
export const KIT_LOOKS: Readonly<Record<string, { as: string; tint?: number; el: Element }>> = {
  'Shield Rush': { as: 'Shield Wall', tint: 0xffd27a, el: 'earth' },
  'Parry Stance': { as: 'Iaido', tint: 0xe8f4ff, el: 'wind' },
  'Smoke Bomb': { as: 'Shadow Step', tint: 0x9a9aa8, el: 'dark' },
  'Pinning Shot': { as: 'Volley', tint: 0xffe08a, el: 'wind' },
  Wildfire: { as: 'Meteor', tint: 0xff7a30, el: 'fire' },
  'Spear Wall': { as: 'Hold the Line', tint: 0xd8c08a, el: 'earth' },
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
  'Aura of Protection': { as: 'Holy Challenge', tint: 0xffe8a8, el: 'light' },
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
  'Tunnel Strike': { as: 'Earthquake', tint: 0xc8b090, el: 'earth' },
  'Font of Wisdom': { as: 'Starfall', tint: 0x90b8ff, el: 'light' },
  'Blood Price': { as: 'Hellblade Sweep', tint: 0xff4060, el: 'dark' },
  Condemn: { as: 'Judgement', tint: 0xff8060, el: 'fire' },
  // (RPG-SPELLS batch 2: the healers' revive faces, until their painted effects arrive)
  'Revive: Revivify': { as: 'Resurrection', tint: 0xffe08a, el: 'light' },
  'Revive: Resurrection': { as: 'Resurrection', tint: 0xfffaf0, el: 'light' },
  'Revive: Elixir of Life': { as: 'Resurrection', tint: 0xa8ffc0, el: 'light' },
  'Revive: Reincarnate': { as: 'Heart of the Grove', tint: 0xb8f090, el: 'forest' },
  'Revive: Reliquary Grace': { as: 'Resurrection', tint: 0xfff4b0, el: 'light' },
  'Revive: Smelling Salts': { as: 'Sanctuary', tint: 0x90f0b0, el: 'forest' },
  // the third wave of heroes and the Vampire Court (Skill 2 and Skill 3)
  'Impaling Thrust': { as: 'Iaido', tint: 0xff3850, el: 'blood' },
  'Mist Step': { as: 'Shadow Step', tint: 0xd83050, el: 'dark' },
  'Blood Chalice': { as: 'Benediction', tint: 0xff4060, el: 'blood' },
  'Crimson Mist': { as: 'Shadow Step', tint: 0xc82040, el: 'blood' },
  'Abduct': { as: 'Dive', tint: 0x9040b0, el: 'dark' },
  'Echolocation': { as: 'Feather Storm', tint: 0xc82848, el: 'dark' },
  'Stone Slumber': { as: 'Shield Wall', tint: 0x9888a8, el: 'earth' },
  'Wing Buffet': { as: 'Wind Gust', tint: 0xa090b0, el: 'wind' },
  'Grapple Vault': { as: 'Grappling Hook', tint: 0xd8e8ff, el: 'wind' },
  'Consecrated Trap': { as: 'Snare Trap', tint: 0xffe890, el: 'light' },
  'Marching Cadence': { as: 'War Banner', tint: 0xff8a40, el: 'fire' },
  'Resonant Leap': { as: 'Thunder Drum', tint: 0xffb84a, el: 'lightning' },
  'Rampart Drop': { as: 'Last Bastion', tint: 0xffe890, el: 'light' },
  'Phalanx Sweep': { as: 'Hold the Line', tint: 0xffe090, el: 'earth' },
  'Earthglide': { as: 'Earthquake', tint: 0xc89a60, el: 'earth' },
  'Lodestone Pull': { as: 'Undertow', tint: 0xd8a868, el: 'earth' },
  'Echoing Toll': { as: 'Dirge', tint: 0x98c8ff, el: 'wind' },
  'Sanctuary Vault': { as: 'Sanctuary', tint: 0xd8b068, el: 'earth' },
  'Gale Vault': { as: 'Wind Gust', tint: 0xc8f4ff, el: 'wind' },
  'Talon Snare': { as: 'Snare Trap', tint: 0xa8ecff, el: 'wind' },
  'Riddle of Repulsion': { as: 'Starfall', tint: 0xd8b0ff, el: 'light' },
  'Constellation Swap': { as: 'Mirror Image', tint: 0xffe8a0, el: 'light' },
  'Dune Swap': { as: 'Shadow Step', tint: 0xe8c478, el: 'earth' },
  'Sirocco Leap': { as: 'Tempest', tint: 0xffd888, el: 'wind' },
  'Crow Step': { as: 'Dive', tint: 0x88f098, el: 'forest' },
  'Quarantine Line': { as: 'Binding Wraps', tint: 0x80e880, el: 'poison' },
  'Concussion Mortar': { as: 'Shell Barrage', tint: 0xff8840, el: 'fire' },
  'Firebomb Line': { as: 'Meteor', tint: 0xff6620, el: 'fire' },
  'Retrograde Orbit': { as: 'Temporal Surge', tint: 0xa8d8ff, el: 'light' },
  'Starlight Bridge': { as: 'Starfall', tint: 0x98d0ff, el: 'light' },
  'Blazing Edict': { as: 'Holy Challenge', tint: 0xff9040, el: 'fire' },
  'Purging Scales': { as: 'Benediction', tint: 0xffb850, el: 'fire' },
  'Sanctuary Wings': { as: 'Divine Aegis', tint: 0xfff4b0, el: 'light' },
  "Mercy's Ascent": { as: 'Dawn Light', tint: 0xfff8c0, el: 'light' },
  'Sawbones Triage': { as: 'Sanctuary', tint: 0x88eca0, el: 'forest' },
  'Grappling Extraction': { as: 'Grappling Hook', tint: 0x68c8d8, el: 'ice' },
  'Floe Slide': { as: 'Voltage Blink', tint: 0x78c8e8, el: 'ice' },
  "Whaler's Reel": { as: 'Grappling Hook', tint: 0x70b8d8, el: 'ice' },
  'Anchor Slam': { as: 'Keelhaul', tint: 0x58b8e0, el: 'ice' },
  'Riptide Undertow': { as: 'Undertow', tint: 0x4098d0, el: 'ice' },
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
