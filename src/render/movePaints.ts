// RPG-SPELLS painted effects, sessions B, D, E, F and G (docs/notes/spell-art-bde.md): which painted parts each hero move plays, by the skill's
// fixed key (the `name` of its `skill` event, `keyOf`), over the look the move already had. Plain data, free of Pixi, so a test can check
// every part named here is a part of the brief's manifest. `fx.ts` (`movePaint`, `area`) plays them; a part no atlas has is skipped and the
// move keeps its old look alone.

/** What a move paints. "Struck" is every fighter the cast hit, marked, stopped, arced to or healed in the same tick. */
export interface MovePaint {
  /** On the caster as the cast goes off (at its feet when the part stands on the ground, else on its body). */
  cast?: string;
  /** A ring round the caster's feet (a slam, a wave). */
  self?: string;
  /** Flies from the caster to each struck fighter, and its `impact` plays where it lands. */
  travel?: string;
  /** Held from the caster to each struck fighter for the cast's length (a drain, a blast, a tether). */
  beam?: string;
  /** Laid along the caster's dash in the same tick (a cut across the field). */
  trail?: string;
  /** On each struck fighter; `one`: on the first alone (a wide blast whose painting already spans the crowd). */
  impact?: string;
  one?: boolean;
  /** The `travel` part rolls along the ground once, out to the farthest struck, and the impact breaks on each as it passes (a wave). */
  roll?: boolean;
  /** Then, as the impact fades, on each struck fighter (the fox in the polymorph's smoke). */
  then?: string;
  /** Where the caster comes down after a leap (its tile once the tick is done), as the cast ends. */
  land?: string;
  /** A loop held over each struck fighter (`on: 'struck'`) or the caster (`on: 'self'`) while the state it shows lasts. */
  stand?: { part: string; on: 'struck' | 'self'; state: StandState };
  /** A field round the caster for `ms` and `reach` tiles (the brief's session B sheet: its ground loop and motes). */
  field?: { sheet: string; reach: number; ms: number };
  /** A ground loop at its brief size for `ms`: round the caster (`self`), under each struck fighter (`struck`, four at most), or under the
   *  first alone (`first`). */
  ground?: { part: string; at: 'self' | 'struck' | 'first'; ms: number };
  /** On the caster's body as the cast ends (a flare on its blade, a puff as it changes). */
  flare?: string;
  /** A streak laid from the caster to each struck fighter (a bolt-shaped cut). */
  streak?: string;
  /** The `beam` runs along each arc of the tick that starts at the caster or at one it struck (a chain of lightning). */
  chain?: boolean;
}

/** The states a painted loop shows (read off the fighter, never changed): stopped, a bounty on it, condemned, raging, anchored. */
export type StandState = 'stun' | 'bounty' | 'condemned' | 'fury' | 'siege';

/** How long a move's `ground` loop lies, unless it says. */
const GROUND_MS = 1600;

/** The moves of sessions D and E (and the time witch's slowing field of session B), by skill key. */
export const MOVE_PAINT: Readonly<Record<string, MovePaint>> = {
  // ---- session D: the casters ----
  /** Eldritch Blast (the Warlock). */
  Hex: { beam: 'eldritch-blast.beam', impact: 'eldritch-blast.impact' },
  /** Drain Life (the Warlock): the red stream, painted flowing left, runs from the foe back to him. */
  'Soul Siphon': { beam: 'drain-life.beam', impact: 'drain-life.impact' },
  /** Thunderwave (the Arc Blade): a ring of thunder bursting out round him. */
  Grounding: { self: 'thunderwave.impact' },
  /** Time Stop (the Time Witch): the dome closes over her, and a frozen clock hangs over every foe she stops while it stays stopped. */
  'Time Stop': { cast: 'time-stop.cast', stand: { part: 'time-stop.stand', on: 'struck', state: 'stun' } },
  /** Mass Polymorph (the Kitsune): a puff of pink smoke and the little fox on each foe changed. */
  'Nine-Tailed Dream': { impact: 'polymorph.impact', then: 'polymorph.cast' },
  /** Hunter's Mark (the Mercenary): the crosshair over the foe while the bounty is on it. */
  'Mark for Coin': { stand: { part: 'hunters-mark.stand', on: 'struck', state: 'bounty' } },
  /** Bane (the Tyrant): the chains clamp, and the cracked crown hangs over the condemned. */
  Condemn: { impact: 'bane-mark.impact', stand: { part: 'bane-mark.stand', on: 'struck', state: 'condemned' } },
  /** Vicious Mockery (the Wolf Bard): a jagged jeer flies to the foe and sours on it. */
  Dirge: { travel: 'mockery.motes', impact: 'mockery.impact' },
  /** Slow (the Time Witch): the clock-face on the ground round her for the field's 4s, hourglasses circling. */
  'Temporal Surge': { field: { sheet: 'slow-field', reach: 4, ms: 4000 } },
  // ---- session E: martial and monster moves ----
  /** Issen (the Samurai): one enormous cut along his dash, and a sliced flash on each foe it cuts. */
  'Heaven-Splitting Cut': { trail: 'issen.trail', impact: 'issen.impact' },
  /** Sneak Attack (the Kunoichi). */
  'Shadow Step': { impact: 'sneak-attack.impact' },
  /** Flurry of Blows (the Ninja Monk). */
  'Thousand Fists': { impact: 'flurry.impact' },
  /** Quivering Palm (the Ninja Monk): light gathers in his palm, and the ripple bursts on the foe. */
  'Stillness Palm': { cast: 'quivering-palm.cast', impact: 'quivering-palm.impact' },
  /** Berserker Leap (the Barbarian): the crater where he comes down. */
  Bloodlust: { land: 'berserker-leap.impact' },
  /** Rage (the Barbarian): the red rage round him while his fury lasts. */
  'Blood Fury': { stand: { part: 'rage.stand', on: 'self', state: 'fury' } },
  /** Cleave (the Demon Swordsman): one wide arc of hellfire across the foes in front. */
  'Hellblade Sweep': { impact: 'cleave.impact', one: true },
  /** Grappling Hook (the Buccaneer): the hook flies, the rope holds, the hook bites. */
  'Grappling Hook': { travel: 'grappling-hook.travel', beam: 'grappling-hook.beam', impact: 'grappling-hook.impact' },
  /** Dragon Dive (the Queen Dragoon): flame as she goes up, a fiery ring where she lands. */
  Jump: { cast: 'dragon-dive.cast', land: 'dragon-dive.impact' },
  /** Seismic Slam (the Juggernaut): the ground-pound ring round him. */
  Earthquake: { self: 'seismic-slam.impact' },
  /** Pounce (the Werewolf). */
  Ravage: { impact: 'pounce.impact' },
  /** Grasping Tentacles (the Kraken Mate): a tentacle rises under each foe it drags, and stretches back to him. */
  Undertow: { beam: 'tentacles.beam', impact: 'tentacles.cast' },
  /** Tidal Wave (the Kraken Mate): the wave rolls out to the farthest foe it strikes, and breaks in spray on each. */
  Flood: { travel: 'tidal-wave.travel', impact: 'tidal-wave.impact', roll: true },
  // ---- session F: the tanks', blades' and shooters' other moves ----
  /** Aimed Shot (the Archer). */
  'Pinning Shot': { travel: 'aimed-shot.travel', impact: 'aimed-shot.impact' },
  /** Blood Pact (the Demon Swordsman): the sigil carved in the air, and the flare on his blade. */
  'Blood Price': { cast: 'blood-pact.cast', flare: 'blood-pact.impact' },
  /** Call to Arms (the Peasant's ultimate). */
  'Mass Muster': { ground: { part: 'call-to-arms.ground', at: 'self', ms: 2000 }, impact: 'call-to-arms.impact' },
  /** Cavalry Charge (the Lancer's ultimate). */
  'Charge of the Knights': { cast: 'cavalry-charge.cast', impact: 'cavalry-charge.impact' },
  /** Divine Smite (the Paladin). */
  'Holy Challenge': { cast: 'divine-smite.cast', impact: 'divine-smite.impact' },
  /** Dragon Breath and Inferno Breath (the Queen Dragoon). */
  'Dragon Breath': { beam: 'dragon-breath.beam', impact: 'dragon-breath.impact' },
  'Inferno Breath': { beam: 'dragon-breath.beam', impact: 'dragon-breath.impact' },
  /** Entangle (the Ranger's ultimate): vines under each foe it holds. */
  "Hunter's Net": { ground: { part: 'entangle.ground', at: 'struck', ms: 2200 }, impact: 'entangle.impact' },
  /** Fan the Hammer (the Gunslinger). */
  'Fan the Hammer': { cast: 'fan-the-hammer.cast', impact: 'fan-the-hammer.impact' },
  /** Fissure (the Juggernaut's ultimate). */
  Cataclysm: { ground: { part: 'fissure.ground', at: 'self', ms: 2000 }, impact: 'fissure.impact' },
  /** Gore Charge and Bull Rush (the Minotaur). */
  'Gore Charge': { cast: 'gore.cast', impact: 'gore.impact' },
  'Bull Rush': { cast: 'gore.cast', impact: 'gore.impact' },
  /** High Noon (the Gunslinger's ultimate). */
  'High Noon': { cast: 'high-noon.cast', impact: 'high-noon.impact' },
  /** Holy Nova (the Paladin's ultimate). */
  'Divine Aegis': { ground: { part: 'holy-nova.ground', at: 'self', ms: GROUND_MS }, impact: 'holy-nova.impact' },
  /** Iaido (the Samurai): the silver cut along his dash. */
  Iaido: { trail: 'iaido.trail', impact: 'iaido.impact' },
  /** Lightning Storm (the Arc Blade's ultimate): a bolt-shaped streak to each foe. */
  'Thunder Cascade': { streak: 'lightning-storm.trail', impact: 'lightning-storm.impact' },
  /** Loaded Dice (the Buccaneer). */
  'Roll the Bones': { cast: 'loaded-dice.cast', impact: 'loaded-dice.impact' },
  /** Metamorphosis (the Demon Swordsman's ultimate). */
  'Demon Form': { cast: 'metamorphosis.cast', flare: 'metamorphosis.impact' },
  /** Overclock (the Rifle Bot's ultimate). */
  Overclock: { cast: 'overclock.cast', impact: 'overclock.impact' },
  /** Phalanx (the Peasant). */
  'Hold the Line': { ground: { part: 'phalanx.ground', at: 'self', ms: GROUND_MS }, flare: 'phalanx.impact' },
  /** Piercing Shot (the Gunslinger): the bullet's line of fire. */
  'Dead Eye': { beam: 'piercing-shot.beam', impact: 'piercing-shot.impact' },
  /** Rapid Shot (the Rifle Bot). */
  'Burst Fire': { cast: 'rapid-shot.cast', impact: 'rapid-shot.impact' },
  /** Siege Mode (the Siege Bot): the anchors slam down, and the clamps hold while he is anchored. */
  'Siege Mode': { cast: 'siege-mode.impact', stand: { part: 'siege-mode.ground', on: 'self', state: 'siege' } },
  /** Smoke Bomb (the Kunoichi): the burst, and the cloud lingering where she was. */
  'Smoke Bomb': { cast: 'smoke-bomb.cast', ground: { part: 'smoke-bomb.impact', at: 'self', ms: 3000 } },
  /** Suppressing Fire (the Rifle Bot). */
  'Suppressing Fire': { beam: 'suppressing-fire.beam', impact: 'suppressing-fire.impact' },
  /** Thunder Step (the Arc Blade): a thunderclap where he goes, and the discharge where he lands. */
  'Voltage Blink': { cast: 'thunder-step.cast', land: 'thunder-step.impact' },
  /** Whirlwind (the Barbarian). */
  Whirlwind: { ground: { part: 'whirlwind.ground', at: 'self', ms: 900 }, impact: 'whirlwind.impact' },
  // ---- session G: the other spells and monster moves ----
  /** Alter Self (the Kitsune). */
  'Fox Guise': { cast: 'alter-self.cast', flare: 'alter-self.impact' },
  /** Animate Dead (the Reaper). */
  'Bound Soul': { cast: 'animate-dead.cast', impact: 'animate-dead.impact' },
  /** Arcane Surge (the Great Sage's ultimate). */
  'Astral Convergence': { ground: { part: 'arcane-surge.ground', at: 'self', ms: GROUND_MS }, impact: 'arcane-surge.impact' },
  /** Bacchanal (the Satyr's ultimate). */
  Bacchanal: { ground: { part: 'bacchanal.ground', at: 'self', ms: 2000 }, impact: 'bacchanal.impact' },
  /** Battle Hymn (the Wolf Bard's ultimate). */
  'Battle Hymn': { ground: { part: 'battle-hymn.ground', at: 'self', ms: GROUND_MS }, impact: 'battle-hymn.impact' },
  /** Chain Lightning (the Lightning Mage): the bolt forks along each arc. */
  'Chain Lightning': { beam: 'chain-lightning.beam', chain: true, impact: 'chain-lightning.impact' },
  /** Charm Monster (the Kitsune). */
  'Fox Charm': { travel: 'charm.travel', impact: 'charm.impact' },
  /** Conjure Treant (the Druid). */
  'Call Treant': { cast: 'conjure-treant.cast', flare: 'conjure-treant.impact' },
  /** Devour (the Shambler). */
  Devour: { cast: 'devour.cast', flare: 'devour.impact' },
  /** Dominate Monster (the Mummy): puppet strings to the foe, the sigil over its head. */
  'Puppet Strings': { beam: 'dominate.beam', impact: 'dominate.impact' },
  /** Flesh to Stone (the Gorgon). */
  'Stone Garden': { ground: { part: 'flesh-to-stone.ground', at: 'struck', ms: 2000 }, impact: 'flesh-to-stone.impact' },
  /** Full Moon (the Werewolf's ultimate). */
  'Full Moon': { cast: 'full-moon.cast', impact: 'full-moon.impact' },
  /** Petrifying Gaze (the Gorgon). */
  'Petrifying Gaze': { beam: 'gaze.beam', impact: 'gaze.impact' },
  /** Gust of Wind (the Yamabushi). */
  'Wind Gust': { cast: 'gust.cast', impact: 'gust.impact' },
  /** Hall of Mirrors (the Illusionist's ultimate). */
  'Hall of Mirrors': { ground: { part: 'hall-of-mirrors.ground', at: 'self', ms: 2000 }, impact: 'hall-of-mirrors.impact' },
  /** Harvest of Souls (the Reaper's ultimate). */
  'Harvest of Souls': { ground: { part: 'harvest.ground', at: 'self', ms: GROUND_MS }, impact: 'harvest.impact' },
  /** Hold Person (the Mummy): the wrappings under each foe bound. */
  'Binding Wraps': { ground: { part: 'hold-person.ground', at: 'struck', ms: 2000 }, impact: 'hold-person.impact' },
  /** Irresistible Dance (the Satyr). */
  'Pied Piper': { ground: { part: 'irresistible-dance.ground', at: 'self', ms: GROUND_MS }, impact: 'irresistible-dance.impact' },
  /** Maelstrom (the Kraken Mate's ultimate): the whirlpool under the first foe it drags. */
  Maelstrom: { ground: { part: 'maelstrom.ground', at: 'first', ms: 2400 }, impact: 'maelstrom.impact' },
  /** Mirror Image (the Illusionist). */
  'Mirror Image': { cast: 'mirror-image.cast', flare: 'mirror-image.impact' },
  /** Panacea (the Wanderer's ultimate): the sunrise ring, and the dawn glow on each friend it heals. */
  'Dawn Light': { ground: { part: 'panacea.ground', at: 'self', ms: GROUND_MS }, impact: 'panacea.impact' },
  /** Curse of the Pharaoh (the Mummy's ultimate). */
  'Curse of the Pharaoh': { ground: { part: 'pharaoh.ground', at: 'self', ms: 2000 }, impact: 'pharaoh.impact' },
  /** Pilfer (the Karasu Tengu). */
  Pilfer: { cast: 'pilfer.cast', impact: 'pilfer.impact' },
  /** Pipes of Pan (the Satyr). */
  'Pipes of Pan': { ground: { part: 'pipes.ground', at: 'self', ms: GROUND_MS }, impact: 'pipes.impact' },
  /** Plague Tide (the Shambler's ultimate). */
  'Plague Tide': { ground: { part: 'plague-tide.ground', at: 'self', ms: 2000 }, impact: 'plague-tide.impact' },
  /** Plant the Standard (the Samurai Commander). */
  'Plant the Standard': { cast: 'plant-standard.cast', flare: 'plant-standard.impact' },
  /** Rallying Cry (the Samurai Commander's ultimate). */
  'Rally Cry': { ground: { part: 'rallying-cry.ground', at: 'self', ms: GROUND_MS }, impact: 'rallying-cry.impact' },
  /** Reap (the Reaper). */
  Reap: { ground: { part: 'reap.ground', at: 'self', ms: 900 }, impact: 'reap.impact' },
  /** Reign of Terror (the Tyrant's ultimate). */
  'Reign of Terror': { ground: { part: 'reign-of-terror.ground', at: 'self', ms: 2000 }, impact: 'reign-of-terror.impact' },
  /** Rewind (the Time Witch): the backward clock, and the ripple round the friend she sends back. */
  Rewind: { cast: 'rewind.cast', impact: 'rewind.impact' },
  /** Shapechange (the Werewolf). */
  Shift: { cast: 'shapechange.cast', flare: 'shapechange.impact' },
  /** Gaze of Medusa (the Gorgon's ultimate). */
  'Stone Curse': { ground: { part: 'stone-curse.ground', at: 'self', ms: GROUND_MS }, impact: 'stone-curse.impact' },
  /** Storm Surge (the Lightning Mage). */
  Overload: { cast: 'storm-surge.cast', impact: 'storm-surge.impact' },
  /** Summon Beast (the Beastmaster). */
  'Call of the Wild': { cast: 'summon-beast.cast', flare: 'summon-beast.impact' },
  /** Swoop (the Karasu Tengu): the dark streak of the dive, and the talons. */
  Dive: { trail: 'swoop.trail', impact: 'swoop.impact' },
  /** Tempest (the Yamabushi's ultimate). */
  Tempest: { ground: { part: 'tempest.ground', at: 'self', ms: 2000 }, impact: 'tempest.impact' },
  /** War Banner (the Samurai Commander): the ring of banners round him while it flies. */
  'War Banner': { ground: { part: 'war-banner.ground', at: 'self', ms: 5000 }, impact: 'war-banner.impact' },
  /** Wild Shape (the Druid). */
  Treeform: { cast: 'wild-shape.cast', flare: 'wild-shape.impact' },
};

/** How opaque an aura's painted ground is drawn (it lies over the fighters in it, so it is kept see-through): `AURA_ALPHA` unless named
 *  here. The Aura of Protection was painted as a tall dome rather than a ring on the ground, so it is drawn thinner still until it is
 *  repainted (docs/notes/spell-art-bde.md). */
export const AURA_ALPHA = 0.7;
export const AURA_ALPHA_OF: Readonly<Record<string, number>> = { 'aura-protection': 0.42, 'storm-cloud': 1 };
/** How big a hanging aura (the storm cloud) is drawn, times its brief size: the cloud is painted faint, so it is shown a little larger. */
export const HANG_MULT = 1.5;

/** The Wolf Bard's standing song, when he makes it loud: the bardic notes ring round him (painted gold; the Dirge tinted violet). */
export const SONG_SHEET = 'bardic-notes';
export const SONG_REACH = 3;
export const DIRGE_TINT = 0xb890ff;
/** The Ranger's Spike Growth (a `spikes` zone on a 3x3): the bristling patch, thorns jabbing up in it. */
export const SPIKES_SHEET = 'spike-growth';

/** The Ranger's Snare Trap (a `trap` on a tile): the hidden ring while it waits, and the snap as it is sprung. */
export const SNARE = { ground: 'snare.ground', impact: 'snare.impact' };

/** Riposte (the Samurai's Parry Stance): a blow he answers while his stance is up plays the parry spark on the one he cuts. */
export const RIPOSTE = 'riposte.impact';

/** The moves that go off through the sim's `area` event (a ball from the sky or thrown, then its burst a moment later), by skill key:
 *  the painted ball flies in place of the old orb and the painted burst plays where it lands. `from`: the sky (falling slant from the
 *  upper right, as the old meteor did) or the caster's hand; `heading`: the way the ball is painted pointing (0 right; the volley's
 *  arrows point down-right); `mark`: played on the spot as it is aimed, in place of a ball (a sword of light, a targeting circle);
 *  `scorch`: the burnt crater stays under it. */
export interface AreaPaint { travel?: string; mark?: string; impact: string; from: 'sky' | 'caster'; heading?: number; scorch?: boolean }
export const AREA_PAINT: Readonly<Record<string, AreaPaint>> = {
  /** Fireball (the Fire Wizard's old skill). */
  Meteor: { travel: 'fireball.travel', impact: 'fireball.impact', from: 'caster', scorch: true },
  /** Meteor Swarm (the Fire Wizard's ultimate). */
  Armageddon: { travel: 'meteor-swarm.travel', impact: 'meteor-swarm.impact', from: 'sky', scorch: true },
  /** Magic Missile (the Great Sage). */
  Starfall: { travel: 'magic-missile.travel', impact: 'magic-missile.impact', from: 'caster' },
  /** The Dread Pirate's Powder Keg: the keg rolls out and blows. */
  'Powder Keg': { travel: 'keg-blast.travel', impact: 'keg-blast.impact', from: 'caster', scorch: true },
  /** Bombard (the Siege Bot) and Cannonade (the Dread Pirate). */
  'Shell Barrage': { travel: 'bombard.travel', impact: 'bombard.impact', from: 'caster', scorch: true },
  Broadside: { travel: 'cannonade.travel', impact: 'cannonade.impact', from: 'caster' },
  /** The Archer's Volley and Hail of Arrows, and the Dread Pirate's Ghost Fleet (its shot falls as a volley does). */
  Volley: { travel: 'volley.travel', impact: 'volley.impact', from: 'sky', heading: Math.PI / 4 },
  'Arrow Storm': { travel: 'volley.travel', impact: 'volley.impact', from: 'sky', heading: Math.PI / 4 },
  'Ghost Fleet': { travel: 'cannonade.travel', impact: 'cannonade.impact', from: 'sky' },
  /** Orbital Strike (the Siege Bot's ultimate): the circle locks on, then the beam from the sky. */
  'Orbital Strike': { mark: 'orbital-strike.cast', impact: 'orbital-strike.impact', from: 'sky' },
  /** Judgement (the Tyrant): the sword of light falls, and the crater. */
  Judgement: { mark: 'judgement.cast', impact: 'judgement.impact', from: 'sky' },
};

/** How long a painted bolt (a `travel` part of `MOVE_PAINT`) takes from the caster to the one it strikes, at most: the blow has already
 *  landed in the sim, so the bolt is quick. */
export const TRAVEL_MS = 260;

/** Every painted part this file names (for the test: each is a part of the brief's manifest). */
export function movePaintParts(): string[] {
  const out: string[] = [RIPOSTE, `${SONG_SHEET}.ground`, `${SONG_SHEET}.motes`, `${SPIKES_SHEET}.ground`, `${SPIKES_SHEET}.impact`];
  for (const m of Object.values(MOVE_PAINT)) {
    for (const k of [m.cast, m.self, m.travel, m.beam, m.trail, m.impact, m.then, m.land, m.stand?.part, m.ground?.part, m.flare, m.streak]) if (k) out.push(k);
    if (m.field) out.push(`${m.field.sheet}.ground`, `${m.field.sheet}.motes`);
  }
  for (const a of Object.values(AREA_PAINT)) for (const k of [a.travel, a.mark, a.impact]) if (k) out.push(k);
  out.push(SNARE.ground, SNARE.impact);
  return out;
}
