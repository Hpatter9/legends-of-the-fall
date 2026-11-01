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
  // (the skills overhaul's batch 4: the third skills, until their painted effects arrive: docs/notes/skills-4.md lists the ones that want their own)
  'Hold Fast': { as: 'Shield Wall', tint: 0xffe0a0, el: 'earth' },
  'Warding Bond': { as: 'Holy Challenge', tint: 0xfff0c0, el: 'light' },
  'Pitchfork Jab': { as: 'Hold the Line', tint: 0xd8c08a, el: 'earth' },
  'Wall of Stone': { as: 'Earthquake', tint: 0xb0a080, el: 'earth' },
  'Kesa Cut': { as: 'Iaido', tint: 0xffa0a0, el: 'blood' },
  'Shuriken Fan': { as: 'Shadow Step', tint: 0xc0c0d0, el: 'dark' },
  'Step of the Wind': { as: 'Thousand Fists', tint: 0xd0f0ff, el: 'wind' },
  'Reckless Swing': { as: 'Whirlwind', tint: 0xff8060, el: 'blood' },
  'Dirty Trick': { as: 'Bounty Hunt', tint: 0xe0c890, el: 'dark' },
  'Lance Sweep': { as: 'Lance Charge', tint: 0xd0d8ff, el: 'wind' },
  'Static Edge': { as: 'Voltage Blink', tint: 0xa0e0ff, el: 'lightning' },
  'Infernal Brand': { as: 'Hellblade Sweep', tint: 0xff6030, el: 'fire' },
  'Pistol Shot': { as: 'Grappling Hook', tint: 0xffe0b0, el: 'fire' },
  'Scale Ward': { as: 'Dragon Breath', tint: 0xffb060, el: 'fire' },
  'Command Strike': { as: 'Lance Charge', tint: 0xff8a6a, el: 'fire' },
  Countercharm: { as: 'Dirge', tint: 0xc0ffd0, el: 'wind' },
  Scourge: { as: 'Judgement', tint: 0xd06040, el: 'dark' },
  'Double Shot': { as: 'Volley', tint: 0xfff0b0, el: 'wind' },
  'Barbed Arrow': { as: 'Snare Trap', tint: 0xff9a9a, el: 'blood' },
  'Skip Shot': { as: 'Dead Eye', tint: 0xffd890, el: 'fire' },
  'Barrier Drone': { as: 'Overclock', tint: 0x90e0ff, el: 'lightning' },
  'Flak Burst': { as: 'Shell Barrage', tint: 0xffb070, el: 'fire' },
  Grapeshot: { as: 'Broadside', tint: 0xd0c0a0, el: 'fire' },
  'Fire Bolt': { as: 'Meteor', tint: 0xffa040, el: 'fire' },
  Spark: { as: 'Chain Lightning', tint: 0xe0d0ff, el: 'lightning' },
  'Curse of Weakness': { as: 'Hex', tint: 0xa070ff, el: 'dark' },
  'Arcane Ward': { as: 'Starfall', tint: 0xb0d0ff, el: 'light' },
  'Hourglass Bolt': { as: 'Temporal Surge', tint: 0xf0d890, el: 'lightning' },
  'Phantasmal Blade': { as: 'Mirror Image', tint: 0xd0a0ff, el: 'dark' },
  'Healing Word': { as: 'Benediction', tint: 0xfff4c0, el: 'light' },
  'Sacred Flame': { as: 'Holy Light', tint: 0xffe070, el: 'light' },
  'Acid Flask': { as: 'Sanctuary', tint: 0xb0ff60, el: 'poison' },
  'Thorn Whip': { as: 'Call Treant', tint: 0x90d060, el: 'forest' },
  'Mend the Pack': { as: 'Call of the Wild', tint: 0xa0f0b0, el: 'forest' },
  'Soul Snare': { as: 'Reap', tint: 0xa0c0ff, el: 'dark' },
  'Fox Wisps': { as: 'Fox Charm', tint: 0xffa050, el: 'fire' },
  'Feather Darts': { as: 'Dive', tint: 0x404060, el: 'wind' },
  'Ringing Staff': { as: 'Wind Gust', tint: 0xe0d0a0, el: 'wind' },
  Rend: { as: 'Ravage', tint: 0xff7070, el: 'blood' },
  Bellow: { as: 'Gore Charge', tint: 0xffc090, el: 'earth' },
  'Butting Horns': { as: 'Gore Charge', tint: 0xffa0d8, el: 'earth' },
  'Serpent Bite': { as: 'Stone Curse', tint: 0x90e070, el: 'poison' },
  'Bile Spit': { as: 'Rotting Touch', tint: 0xc0e060, el: 'poison' },
  'Tomb Rot': { as: 'Binding Wraps', tint: 0x90b070, el: 'dark' },
  'Ink Cloud': { as: 'Undertow', tint: 0x302848, el: 'dark' },
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
