// RPG-SPELLS painted effects, sessions B, D and E (docs/notes/spell-art-bde.md): which painted parts each hero move plays, by the skill's
// fixed key (the `name` of its `skill` event, `keyOf`), over the look the move already had. Plain data, free of Pixi, so a test can check
// every part named here is a part of the brief's manifest. `fx.ts` (`movePaint`, `area`) plays them; a part no atlas has is skipped and the
// move keeps its old look alone.

/** What a move paints. "Struck" is every fighter the cast hit, marked, stopped or arced to in the same tick. */
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
}

/** The states a painted loop shows (read off the fighter, never changed): stopped, a bounty on it, condemned, raging. */
export type StandState = 'stun' | 'bounty' | 'condemned' | 'fury';

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

/** Riposte (the Samurai's Parry Stance): a blow he answers while his stance is up plays the parry spark on the one he cuts. */
export const RIPOSTE = 'riposte.impact';

/** The moves that go off through the sim's `area` event (a ball from the sky or thrown, then its burst a moment later), by skill key:
 *  the painted ball flies in place of the old orb and the painted burst plays where it lands. `from`: the sky (falling slant from the
 *  upper right, as the old meteor did) or the caster's hand; `scorch`: the burnt crater stays under it. */
export const AREA_PAINT: Readonly<Record<string, { travel: string; impact: string; from: 'sky' | 'caster'; scorch?: boolean }>> = {
  /** Fireball (the Fire Wizard's old skill). */
  Meteor: { travel: 'fireball.travel', impact: 'fireball.impact', from: 'caster', scorch: true },
  /** Meteor Swarm (the Fire Wizard's ultimate). */
  Armageddon: { travel: 'meteor-swarm.travel', impact: 'meteor-swarm.impact', from: 'sky', scorch: true },
  /** Magic Missile (the Great Sage). */
  Starfall: { travel: 'magic-missile.travel', impact: 'magic-missile.impact', from: 'caster' },
  /** The Dread Pirate's Powder Keg: the keg rolls out and blows. */
  'Powder Keg': { travel: 'keg-blast.travel', impact: 'keg-blast.impact', from: 'caster', scorch: true },
};

/** How long a painted bolt (a `travel` part of `MOVE_PAINT`) takes from the caster to the one it strikes, at most: the blow has already
 *  landed in the sim, so the bolt is quick. */
export const TRAVEL_MS = 260;

/** Every painted part this file names (for the test: each is a part of the brief's manifest). */
export function movePaintParts(): string[] {
  const out: string[] = [RIPOSTE, `${SONG_SHEET}.ground`, `${SONG_SHEET}.motes`, `${SPIKES_SHEET}.ground`, `${SPIKES_SHEET}.impact`];
  for (const m of Object.values(MOVE_PAINT)) {
    for (const k of [m.cast, m.self, m.travel, m.beam, m.trail, m.impact, m.then, m.land, m.stand?.part]) if (k) out.push(k);
    if (m.field) out.push(`${m.field.sheet}.ground`, `${m.field.sheet}.motes`);
  }
  for (const a of Object.values(AREA_PAINT)) out.push(a.travel, a.impact);
  return out;
}
