// When a hero's skill 2 (or 3) has something to do (COMBAT-002): a cheap look, without casting, that the AI takes before it holds skill 1 back for skill 2's
// turn. It mirrors each cast's own first check (the cast still makes the final call); a skill 2 not named here is taken to have work most of the time.

import { renewable, shapeRenewable } from '../carry';
import { UNITS } from '../units';
import { atkOf, type Battle, type Unit } from '../battle';
import { apart, foesOf } from '../abilities';
import { harmed } from '../ailments';
import { THUNDER_STORE } from './melee';
import { FONT, fireLane, inTrouble } from './mages';
import { tidalLane } from './monsters';
import { chokeLine, shieldLine } from '../toolkit';
import { curseWork } from './third';

const on = (t: number | undefined, b: Battle) => t !== undefined && t > b.t;
const foesWithin = (b: Battle, me: Unit, n: number) => foesOf(b, me).some((f) => apart(me, f) <= n);
const allies = (b: Battle, me: Unit) => b.units.filter((a) => a.alive && a.side === me.side && a.owner === undefined && !UNITS[a.def].summon);
const body = (b: Battle, me: Unit, within: number, ms: number) => b.units.some((x) => !x.alive && x.side !== me.side && x.diedAt !== undefined && b.t - x.diedAt <= ms && apart(x, me) <= within && !x.kx?.spent);

/** Each skill 2 whose work comes and goes, by name. */
export const SKILL2_WHEN: Readonly<Record<string, (b: Battle, me: Unit) => boolean>> = {
  // (RPG-SPELLS batch 3: Shield Rush, Spear Wall, Aura of Protection and Tunnel Strike took the old skill 2s' places)
  'Shield Rush': (b, me) => foesWithin(b, me, 3),
  'Spear Wall': (b, me) => foesWithin(b, me, 5),
  'Tunnel Strike': (b, me) => foesWithin(b, me, 6) && foesOf(b, me).filter((f) => apart(f, me) === 1).length < 2,
  'Parry Stance': (b, me) => foesOf(b, me).some((f) => apart(f, me) === 1 && !UNITS[f.def].shot),
  'Smoke Bomb': (b, me) => foesOf(b, me).some((f) => Math.abs(f.u - me.u) <= 1 && Math.abs(f.v - me.v) <= 1),
  // (RPG-SPELLS batch 7: the Wind Wall took Turning Wind's place, the Tidal Wave the Flood's)
  'Turning Wind': (b, me) => foesOf(b, me).some((f) => UNITS[f.def].shot && apart(f, me) <= 8) && !!shieldLine(b, me, 3),
  // (RPG-SPELLS batch 6: the Wall of Fire took Wildfire's place, Transposition Trade Places', Font of Magic Font of Wisdom's)
  Wildfire: (b, me) => !!fireLane(b, me),
  Overload: (b, me) => foesOf(b, me).some((f) => on(f.kx?.charged, b) && apart(me, f) <= 8),
  'Fox Guise': (b, me) => shapeRenewable(b, me.kx?.guise?.until, me.kx?.guise?.ms) && foesWithin(b, me, 7),
  Shift: (b, me) => foesWithin(b, me, 4) && (me.kx?.wolfAt === undefined || b.t - me.kx.wolfAt >= 4000) && me.kx?.wolf !== (me.hp < me.maxHp * 0.5 || foesOf(b, me).filter((f) => apart(f, me) === 1).length >= 3 ? 'brute' : 'hunter'),
  'Bull Rush': (b, me) => foesWithin(b, me, 1),
  'Pied Piper': (b, me) => foesWithin(b, me, 4),
  'Stone Garden': (b, me) => foesWithin(b, me, 5),
  // (SUMMON-TIMERS: or to renew his standing one, with a quarter of its time left)
  'Plant the Standard': (b, me) => (!b.units.some((x) => x.alive && x.def === 'standard' && x.owner === me.id) || !!renewable(b, me, ['standard'])) && foesWithin(b, me, 6),
  'Aura of Protection': (b, me) => foesWithin(b, me, 4) && allies(b, me).filter((a) => apart(a, me) <= 3).length >= 2,
  Treeform: (b, me) => shapeRenewable(b, me.kx?.tree?.until, me.kx?.tree?.ms) && foesWithin(b, me, 2),
  'Blood Fury': (b, me) => foesWithin(b, me, 2) && !on(me.kx?.fury, b) && me.hp > me.maxHp * 0.2,
  'Blood Price': (b, me) => foesWithin(b, me, 2) && !(me.kx?.blood ?? 0) && me.hp > me.maxHp * 0.3,
  'Trade Places': (b, me) => allies(b, me).some((a) => inTrouble(b, me, a)),
  Devour: (b, me) => body(b, me, 2, 10000),
  'Mark for Coin': (b, me) => foesOf(b, me).some((f) => apart(f, me) <= 7 && !on(f.kx?.bounty?.until, b)),
  'Puppet Strings': (b, me) => foesOf(b, me).length > 1 && foesWithin(b, me, 4),
  Flood: (b, me) => !!tidalLane(b, me),
  'Wheel About': (b, me) => foesWithin(b, me, 1),
  'Bound Soul': (b, me) => body(b, me, 4, 12000),
  Rewind: (b, me) => allies(b, me).some((a) => !!a.kx?.hist?.some((s) => b.t - s.t <= 4000 && (s.hp - a.hp) / a.maxHp >= 0.2)),
  Grounding: (b, me) => foesWithin(b, me, 2) && (me.kx?.stored ?? 0) >= atkOf(me) * THUNDER_STORE,
  'Siege Mode': (b, me) => !on(me.kx?.siege, b) && !foesWithin(b, me, 1) && foesWithin(b, me, UNITS[me.def].range + 2),
  'Guardian Angel': (b, me) => allies(b, me).some((a) => a.hp < a.maxHp * 0.7 && !on(a.kx?.angel, b) && foesOf(b, me).some((f) => apart(f, a) <= 2)),
  Jump: (b, me) => foesOf(b, me).some((f) => apart(me, f) >= 2 && apart(me, f) <= 7),
  'Font of Wisdom': (b, me) => allies(b, me).filter((a) => a !== me && apart(a, me) <= FONT.REACH && a.charge < 34).length >= 1,
  Condemn: (b, me) => foesOf(b, me).some((f) => apart(f, me) <= 7 && !on(f.kx?.condemned?.until, b)),
  'Change the Tune': (b, me) => foesWithin(b, me, 5),
  Benediction: (b, me) => allies(b, me).some((a) => harmed(a) || a.hp < a.maxHp * 0.85),
  // (Healing Mist, keyed Sanctuary: a hurt friend within its reach)
  Sanctuary: (b, me) => allies(b, me).some((a) => a.hp < a.maxHp * 0.75 && apart(a, me) <= 2),
  // (the skills overhaul's batch 4: the third skills' utilities, which a jab may be held back for; the guards answer their own triggers)
  'Wall of Stone': (b, me) => !!chokeLine(b, me, 3),
  'Curse of Weakness': curseWork,
};
