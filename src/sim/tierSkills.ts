// Tier 2 and tier 3 skills: a hero that has been merged up (a grade 2 or 3 hero) casts a better version of its skill, with a name of its own
// ("Tier 2: Twin Meteor"). It is all data, `TIER_SKILLS`, read two ways:
//   - `mods` are talent-style modifiers (`talents.ts` lists the keys: more damage, a longer or wider skill, one more of what it makes,
//     a shield or a heal when it goes off...). They are merged into the hero's `eq.tal` when it joins the fight (`applyTierMods`), so
//     every skill reads them the way it reads a talent.
//   - `riders` are extra things that happen when the skill goes off (`runRiders`, called by `began` in abilities.ts): a ring of damage round
//     the caster, a heal, haste, a ward or charge for its friends, fighters called up, or an echo: the skill goes off again a moment later.
// A tier 3 entry is the whole of tier 3 (it replaces tier 2's, it does not add to it). Nothing here draws from the fight's main stream.

import { hurt, defOf, atkOf, type Battle, type BattleEvent, type Unit } from './battle';
import { callSummon, foesOf, gain, mendUnit, net, apart, tal } from './abilities';
import type { EquipStats } from './equipment';
import { ALL_HEROES } from './units';

/** What a skill adds when it goes off. */
export type Rider =
  /** A ring of force round the caster: every foe within `reach` takes `mult` of its attack, and is held `stun` ms. */
  | { kind: 'nova'; reach: number; mult: number; stun?: number }
  /** Every ally within `reach` (and the caster) is healed `mult` of the caster's attack. */
  | { kind: 'mend'; reach: number; mult: number }
  /** Every ally within `reach` is hastened for `ms`. */
  | { kind: 'haste'; reach: number; ms: number }
  /** Every ally within `reach` is shielded for `share` of its max hp (3s). */
  | { kind: 'ward'; reach: number; share: number }
  /** Every ally within `reach` has its skill meter lifted by `amount`. */
  | { kind: 'charge'; reach: number; amount: number }
  /** `n` fighters of `unit` are called up beside the caster (up to `cap` more than one standing already; a wolf's cap is its caster's, as for the skill itself). */
  | { kind: 'summon'; unit: string; n: number; cap?: number }
  /** The skill goes off a second time `ms` later, at `share` of its strength. */
  | { kind: 'echo'; ms: number; share: number };

export interface TierSkill {
  name: string;
  /** What it does, in plain words (the sheet and the codex show it after "Tier 2:"). */
  text: string;
  mods?: Record<string, number>;
  riders?: Rider[];
}

/** How much of the strength the table lists a tier skill gets: the one number to turn to make every tier skill stronger or weaker (the fractional modifiers and the riders' strengths scale; counts and tiles do not). 1 is as listed. */
export const TIER_STRENGTH = 1;
/** The talent keys whose value is a whole count or a tile count (`extra`, `reach`): not scaled by `TIER_STRENGTH`. */
const WHOLE = ['extra', 'reach'];

const nova = (reach: number, mult: number, stun?: number): Rider => ({ kind: 'nova', reach, mult, ...(stun ? { stun } : {}) });
const mend = (reach: number, mult: number): Rider => ({ kind: 'mend', reach, mult });
const haste = (reach: number, ms: number): Rider => ({ kind: 'haste', reach, ms });
const ward = (reach: number, share: number): Rider => ({ kind: 'ward', reach, share });
const charge = (reach: number, amount: number): Rider => ({ kind: 'charge', reach, amount });
const echo = (ms: number, share: number): Rider => ({ kind: 'echo', ms, share });
const t = (name: string, text: string, mods?: Record<string, number>, riders?: Rider[]): TierSkill => ({ name, text, ...(mods ? { mods } : {}), ...(riders ? { riders } : {}) });

/** Every hero's tier 2 and tier 3 skill. */
export const TIER_SKILLS: Readonly<Record<string, readonly [TierSkill, TierSkill]>> = {
  knight: [
    t('Iron Wall', 'Shield Wall reaches a tile further, and he is shielded', { reach: 1, castShield: 0.035 }),
    t('Fortress', 'Shield Wall reaches two tiles further and lasts longer; he is shielded and slams the ground round him, stunning the foes near', { reach: 2, dur: 0.14, castShield: 0.035 }, [nova(2, 0.18, 210)]),
  ],
  samurai: [
    t('Twin Iaido', 'Dashes a tile further, cuts harder and gives back some charge', { reach: 1, pow: 0.3, refund: 30 }),
    t('Moon Cut', 'Dashes two tiles further and cuts harder; a second cut follows a moment later', { reach: 2, pow: 0.55, refund: 40 }, [echo(900, 0.8)]),
  ],
  kunoichi: [
    t('Fading Step', 'Shadow Step gives back some charge and hastens her briefly', { refund: 25, castHaste: 700 }),
    t('Thousand Shadows', 'Backstabs harder, hastens her, and slips behind another foe a moment later', { pow: 0.105, castHaste: 1050 }, [echo(800, 0.525)]),
  ],
  archer: [
    t('Double Volley', 'A second, smaller volley follows the first', { extra: 1 }),
    t('Rain of Arrows', 'Two more volleys follow, over a wider patch, and every arrow hits harder', { extra: 2, reach: 1, pow: 0.07 }),
  ],
  wizard: [
    t('Twin Meteor', 'A second, smaller meteor follows the first', { extra: 1 }),
    t('Meteor Shower', 'Two more meteors follow, and the ground burns longer', { extra: 2, dur: 0.175 }),
  ],
  peasant: [
    t('Hold Harder', 'The line holds a little longer, and the allies near him are mended', { dur: 0.14 }, [mend(2, 0.3)]),
    t('Rally the Village', 'The line holds much longer, a tile wider; his allies are mended well and hastened', { dur: 0.245, reach: 1 }, [mend(3, 0.6), haste(3, 700)]),
  ],
  ninjaMonk: [
    t('Fourth Fist', 'Thousand Fists lands a fourth strike', { extra: 1 }),
    t('Fifth Fist', 'Two more strikes, a longer stun, and a burst of force round him', { extra: 2, skillStun: 175 }, [nova(1.5, 0.18)]),
  ],
  wanderer: [
    t('Brighter Sanctuary', 'Heals more, and shields him', { pow: 0.105, castShield: 0.028 }),
    t('Radiant Sanctuary', 'Heals far more, and hastens the allies near him', { pow: 0.21 }, [haste(4, 1050)]),
  ],
  lightningMage: [
    t('Forked Chain', 'The bolt jumps through one more foe', { extra: 1 }),
    t('Storm Chain', 'The bolt jumps through three more foes and holds each briefly', { extra: 3, skillStun: 140 }),
  ],
  kitsune: [
    t('Lingering Charm', 'Fox Charm lasts longer', { dur: 0.14 }),
    t('Hundred Fox Fires', 'The charm lasts much longer, and fox fire flares round her, burning the foes near', { dur: 0.28 }, [nova(3, 0.21)]),
  ],
  karasu: [
    t('Swift Dive', 'Dive gives back 30 charge and strikes harder', { refund: 30, pow: 0.07 }),
    t('Storm Dive', 'Strikes harder; a gale bursts where he lands, and a second dive follows', { pow: 0.105 }, [nova(2, 0.21), echo(700, 0.45)]),
  ],
  yamabushi: [
    t('Stronger Gust', 'The gust reaches a tile further and stuns briefly', { reach: 1, skillStun: 175 }),
    t('Hurricane', 'The gust reaches two tiles further, hits harder and stuns longer', { reach: 2, pow: 0.105, skillStun: 315 }),
  ],
  werewolf: [
    t('Savage Ravage', 'Bites harder and heals him a little', { pow: 0.087, castHeal: 0.028 }),
    t('Blood Moon', 'Bites much harder, heals him well and hastens him', { pow: 0.158, castHeal: 0.052, castHaste: 1050 }),
  ],
  minotaur: [
    t('Heavier Charge', 'Charges a tile further and the foe is stunned longer', { reach: 1, skillStun: 175 }),
    t('Rampage', 'Charges two tiles further, and charges again a moment later', { reach: 2 }, [echo(900, 0.45)]),
  ],
  satyr: [
    t('Livelier Pipes', 'The pipes last longer and reach a tile further', { dur: 0.14, reach: 1 }),
    t('Pan\'s Frenzy', 'The pipes last much longer and reach two tiles further; his friends\' skill meters jump by 20', { dur: 0.28, reach: 2 }, [charge(3, 20)]),
  ],
  gorgon: [
    t('Deeper Gaze', 'The gaze reaches a tile further, holds longer and hits harder', { reach: 1, dur: 0.21, pow: 0.3 }),
    t('Medusa\'s Glare', 'The gaze holds much longer, and every foe near her is stiffened', { reach: 2, dur: 0.245, pow: 0.5 }, [nova(4, 0.3, 700)]),
  ],
  samuraiCommander: [
    t('Higher Banner', 'The banner flies longer and reaches a tile further', { dur: 0.14, reach: 1 }),
    t('Grand Standard', 'The banner flies much longer, two tiles further, and mends his allies', { dur: 0.245, reach: 2 }, [mend(4, 0.45)]),
  ],
  paladin: [
    t('Righteous Challenge', 'The challenge reaches a tile further and shields him', { reach: 1, castShield: 0.035 }),
    t('Crusader\'s Oath', 'The challenge reaches two tiles further and lasts longer; he is shielded and his allies are mended well', { reach: 2, dur: 0.175, castShield: 0.035 }, [mend(3, 0.3)]),
  ],
  cleric: [
    t('Warm Benediction', 'Heals more, and for longer', { pow: 0.105, dur: 0.105 }),
    t('Miracle', 'Heals far more, for much longer, and every ally is shielded', { pow: 0.21, dur: 0.21 }, [ward(99, 0.03)]),
  ],
  druid: [
    t('Grove', 'A second treant can stand beside the first', { extra: 1 }),
    t('Ancient Grove', 'Her treants hit harder, and every ally near her is healed when one rises', { extra: 1, pow: 0.105 }, [mend(3, 0.45)]),
  ],
  barbarian: [
    t('Wide Whirl', 'The whirl cuts a tile wider', { reach: 1 }),
    t('Cyclone', 'A wider whirl, a second whirl a moment later, and he heals', { reach: 1, castHeal: 0.035 }, [echo(700, 0.525)]),
  ],
  ranger: [
    t('Third Snare', 'Lays a third trap', { extra: 1 }),
    t('Fourth Snare', 'Lays three more traps, and what they hold is held longer', { extra: 2, dur: 0.175 }),
  ],
  warlock: [
    t('Deep Hex', 'The curse burns longer and deeper', { dur: 0.14, pow: 0.07 }),
    t('Doom', 'The curse burns much longer and deeper, and dark force bursts round him', { dur: 0.28, pow: 0.14 }, [nova(3, 0.15)]),
  ],
  illusionist: [
    t('Longer Mirage', 'The decoys last longer, and she is hastened', { dur: 0.14, castHaste: 700 }),
    t('Hall of Illusions', 'The decoys last much longer, two more appear, and she is hastened well', { dur: 0.28, castHaste: 1050 }, [{ kind: 'summon', unit: 'decoy', n: 2, cap: 3 }]),
  ],
  gunslinger: [
    t('Long Eye', 'The slug carries a tile further and hits harder', { reach: 1, pow: 0.07 }),
    t('Dead Eye Deluxe', 'The slug carries two tiles further, hits much harder, and a second slug follows', { reach: 2, pow: 0.14 }, [echo(600, 0.375)]),
  ],
  shambler: [
    t('Thicker Rot', 'The rot lasts longer and heals him a little', { dur: 0.14, castHeal: 0.017 }),
    t('Plague', 'The rot lasts much longer, reaches further, and a wave of it bursts round him', { dur: 0.28, reach: 1, castHeal: 0.035 }, [nova(3, 0.15)]),
  ],
  rifleBot: [
    t('Fourth Round', 'Burst Fire shoots a fourth round', { extra: 1 }),
    t('Full Magazine', 'Two more rounds, and 20 charge comes back', { extra: 2, refund: 20 }),
  ],
  mercenary: [
    t('Bigger Bounty', 'Every cut hits harder', { pow: 0.087 }),
    t('Gold Rush', 'Cuts much harder, and a second cut follows a moment later', { pow: 0.175 }, [echo(800, 0.45)]),
  ],
  mummy: [
    t('Tighter Wraps', 'The wraps last longer and reach a tile further', { dur: 0.14, reach: 1 }),
    t('Pharaoh\'s Wraps', 'The wraps last much longer and reach two tiles further; he is shielded', { dur: 0.28, reach: 2, castShield: 0.052 }),
  ],
  buccaneer: [
    t('Longer Hook', 'The hook reaches a tile further and holds longer', { reach: 1, dur: 0.175 }),
    t('Boarding Party', 'The hook reaches two tiles further and cuts harder; he lands with a burst of force', { reach: 2, pow: 0.105 }, [nova(2, 0.21, 175)]),
  ],
  wolfBard: [
    t('Louder Dirge', 'The dirge reaches a tile further and lasts longer', { reach: 1, dur: 0.105 }),
    t('Chorus', 'The dirge reaches two tiles further and lasts much longer; his friends\' skill meters jump by 15', { reach: 2, dur: 0.21 }, [charge(4, 15)]),
  ],
  beastmaster: [
    t('Pair of Wolves', 'Two wolves answer each call, and up to three can stand beside him', { extra: 1 }, [{ kind: 'summon', unit: 'wolf', n: 1 }]),
    t('Pack Leader', 'A great black dire wolf answers each call beside the wolf, and up to three wolves can stand beside him', { extra: 1 }, [{ kind: 'summon', unit: 'direWolf', n: 1 }]),
  ],
  kraken: [
    t('Stronger Undertow', 'The undertow reaches a tile further and slows longer', { reach: 1, skillSlow: 350 }),
    t('Maelstrom Tide', 'The undertow reaches two tiles further, hits harder and holds each foe briefly', { reach: 2, pow: 0.105, skillStun: 210 }),
  ],
  lancer: [
    t('Longer Charge', 'Charges a tile further and the riders are hastened', { reach: 1, castHaste: 700 }),
    t('Knight\'s Charge', 'Charges two tiles further, hits harder, and charges again a moment later', { reach: 2, pow: 0.105 }, [echo(1000, 0.45)]),
  ],
  reaper: [
    t('Keener Scythe', 'The scythe reaches a tile further and cuts harder', { pow: 0.087, reach: 1 }),
    t('Soul Scythe', 'The scythe cuts much harder, a tile further, and heals him', { pow: 0.175, reach: 1, castHeal: 0.035 }),
  ],
  timeWitch: [
    t('Longer Surge', 'The surge lasts longer', { dur: 0.14 }),
    t('Time Loop', 'The surge lasts much longer, a tile further, and her friends\' skill meters jump by 20', { dur: 0.28, reach: 1 }, [charge(4, 20)]),
  ],
  arcBlade: [
    t('Live Wire', 'The discharge holds longer and hits harder', { skillStun: 175, pow: 0.07 }),
    t('Storm Blink', 'The discharge hits much harder and holds well, and he blinks and discharges again a moment later', { pow: 0.14, skillStun: 280 }, [echo(800, 0.45)]),
  ],
  dreadPirate: [
    t('Double Broadside', 'A second, smaller broadside follows the first', { extra: 1 }),
    t('Ghost Armada', 'Two more broadsides follow, and each hits harder', { extra: 2, pow: 0.07 }),
  ],
  siegeBot: [
    t('Heavier Shell', 'The shell hits a little harder', { pow: 0.07 }),
    t('Twin Shells', 'The shell hits harder, and a second, smaller shell follows it', { pow: 0.14, extra: 1 }),
  ],
  priestess: [
    t('Brighter Light', 'The light heals more', { pow: 0.105 }),
    t('Holy Radiance', 'Heals far more, and every ally is shielded and mended', { pow: 0.21 }, [ward(99, 0.024), mend(99, 0.3)]),
  ],
  dragoon: [
    t('Longer Breath', 'The breath carries a tile further and hits harder', { reach: 1, pow: 0.105 }),
    t('Dragonfire', 'The breath carries two tiles further, hits harder, and a second breath follows', { reach: 2, pow: 0.21 }, [echo(900, 0.637)]),
  ],
  juggernaut: [
    t('Heavier Quake', 'The quake reaches a tile further and holds longer', { reach: 1, skillStun: 140 }),
    t('Titan Quake', 'The quake reaches two tiles further and holds well longer; he is shielded', { reach: 2, skillStun: 280, castShield: 0.052 }),
  ],
  sage: [
    t('Fourth Star', 'Starfall calls a fourth star', { extra: 1 }),
    t('Constellation', 'Two more stars fall, and every ally\'s skill meter jumps by 25', { extra: 2 }, [charge(99, 25)]),
  ],
  demonSwordsman: [
    t('Wider Sweep', 'The sweep reaches a tile further and heals him a little', { reach: 1, castHeal: 0.021 }),
    t('Demon Sweep', 'The sweep cuts much harder, heals him, and sweeps again a moment later', { reach: 1, pow: 0.14, castHeal: 0.042 }, [echo(800, 0.45)]),
  ],
  tyrant: [
    t('Twin Verdicts', 'A second, smaller judgement follows the first, a tile wider', { extra: 1, reach: 1 }),
    t('Tyrant\'s Decree', 'Two more judgements follow, and a wave of dread bursts round him', { extra: 2, reach: 1 }, [nova(3, 0.21)]),
  ],
};

/** A hero's tier skill for a grade (2 or 3); none at grade 1 or for a kind with none (a summon, a foe). */
export const tierSkillOf = (kind: string, grade: number | undefined): TierSkill | undefined => (grade && grade >= 2 ? TIER_SKILLS[kind]?.[Math.min(grade, 3) - 2] : undefined);

/** Merge a grade's modifiers into a hero's `eq.tal` (a copy: the equipment object is shared between fights). */
export function applyTierMods(unit: Unit, grade: number): void {
  const mods = tierSkillOf(unit.def, grade)?.mods;
  if (!mods) return;
  const eq: EquipStats = unit.eq ? { ...unit.eq } : { hp: 0, atk: 0, def: 0, atkSpeed: 0, moveSpeed: 0, crit: 0, range: 0, dodge: 0, charge: 0, regen: 0, resist: 0, abilities: [] };
  eq.tal = { ...eq.tal };
  for (const [k, v] of Object.entries(mods)) eq.tal[k] = (eq.tal[k] ?? 0) + (WHOLE.includes(k) ? v : v * TIER_STRENGTH);
  unit.eq = eq;
}

/** Take a grade's modifiers back out of a hero's talents (the inverse of `applyTierMods`). */
function removeTierMods(unit: Unit, grade: number): void {
  const mods = tierSkillOf(unit.def, grade)?.mods;
  if (!mods || !unit.eq?.tal) return;
  const eq = { ...unit.eq, tal: { ...unit.eq.tal } };
  for (const [k, v] of Object.entries(mods)) eq.tal[k] = (eq.tal[k] ?? 0) - (WHOLE.includes(k) ? v : v * TIER_STRENGTH);
  unit.eq = eq;
}

/**
 * Promote a hero to a higher grade in the middle of a fight (the Calamity's tier by level calls this): its tier skill changes at once, and a
 * `promote` event goes out for the page to play (the pillar of light, the banner, the camera push). Its stats are not touched here: whoever promotes
 * it sets them, as `gradeBoost` does for a hero placed at that grade. Returns false when there is nothing to do (not a hero, or not a higher grade).
 */
export function promoteUnit(unit: Unit, grade: number, out: BattleEvent[]): boolean {
  const from = unit.grade ?? 1;
  if (unit.side !== 'hero' || grade <= from || grade > 3) return false;
  removeTierMods(unit, from);
  unit.grade = grade;
  applyTierMods(unit, grade);
  out.push({ kind: 'promote', to: unit.id, grade });
  return true;
}

/** The riders of a hero's tier skill: called when its skill has gone off. `recast` runs the skill again at a share of its strength (the echo). */
export function runRiders(b: Battle, me: Unit, out: BattleEvent[], schedule: (ms: number, share: number) => void): void {
  const riders = tierSkillOf(me.def, me.grade)?.riders;
  if (!riders || me.side !== 'hero') return;
  const allies = () => b.units.filter((a) => a.alive && a.side === me.side && !defOf(a).summon);
  for (const r of riders) {
    if (r.kind === 'nova') {
      const near = foesOf(b, me).filter((f) => apart(me, f) <= r.reach + tal(me, 'reach'));
      out.push({ kind: 'burst', by: me.id, reach: r.reach + tal(me, 'reach'), tone: 'tier' });
      for (const f of near) {
        hurt(b, me, f, net(atkOf(me) * r.mult * TIER_STRENGTH, f), false, false, out, 'skill');
        if (r.stun && f.alive) {
          f.busyUntil = Math.max(f.busyUntil, b.t + r.stun);
          f.stunUntil = Math.max(f.stunUntil ?? 0, b.t + r.stun);
        }
      }
    } else if (r.kind === 'mend') {
      for (const a of allies()) if (apart(me, a) <= r.reach) mendUnit(a, atkOf(me) * r.mult * TIER_STRENGTH, out, me);
    } else if (r.kind === 'haste') {
      for (const a of allies())
        if (apart(me, a) <= r.reach) {
          a.hasteUntil = Math.max(a.hasteUntil ?? 0, b.t + r.ms);
          out.push({ kind: 'haste', to: a.id, ms: r.ms });
        }
    } else if (r.kind === 'ward') {
      for (const a of allies()) if (apart(me, a) <= r.reach) a.shield = { hp: Math.max(a.shield?.hp ?? 0, Math.round(a.maxHp * r.share * TIER_STRENGTH)), until: b.t + 3000 };
    } else if (r.kind === 'charge') {
      for (const a of allies()) if (a !== me && apart(me, a) <= r.reach) gain(a, r.amount, true);
    } else if (r.kind === 'summon') {
      for (let i = 0; i < r.n; i++) callSummon(b, me, r.unit, r.unit === 'wolf' ? 1 + tal(me, 'extra') : r.cap ?? 0);
    } else if (r.kind === 'echo') schedule(r.ms, r.share);
  }
}

/** Heroes without a tier skill (none, as it happens: a test holds it). */
export const MISSING_TIERS = (): string[] => ALL_HEROES.filter((k) => !TIER_SKILLS[k]);
