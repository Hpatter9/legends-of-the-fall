// TRAIT-PERKS (the owner's ask: "lets change the perks for having multiple people of a type on the field. I want them to really matter. be
// unique and give amazing and varied buffs. like have 4 of an undead type means 3 skeletons rise from the grave and join you. they revive
// at the end of the wave only and dont cost hearts"; docs/notes/trait-perks.md). Every trait has three tiers, at 2, 3 and 4 different heroes
// of it (`TRAITS`, `traits.ts`, holds their names and words); this is what each tier does in a fight.
//
// The fight calls a few hooks: the wave's start (`startPerks` from `fight`, `perkWave` from the Last Stand's waves and every minute of an
// Assault), each tick (`tickPerks`), a blow about to land (`perkGuard`), its damage (`perkDamage`), what it did (`perkStruck`), a fall
// held off (`perkSpare`), a death (`perkDeath`), a blow that landed (`perkBlow`), a crit (`perkCrit`), a skill cast (`perkCast`, `perkUlt`),
// a king's spell (`perkSpell`, `spellCost`, `spellPower`), speed (`perkSpeed`) and the ground (`perkFoot`). A fight with no perk awake has
// no `Battle.perk`, and each hook is one check. What the perks raise (skeletons, turrets, thralls, images, the standard) are summon kinds,
// never the party, so they never spend a life (`lives.ts`, `ofParty`).
//
// No randomness: every rule is a count, a timer or a nearest-first pick, ties broken by tile then id, so no stream is drawn and the fights
// without perks play out as before. `TRAIT_PERKS.on` is a tool's switch (the measure turns it off). Pure: no Pixi, no DOM.

import type { At } from './board';
import { standable, tileAt } from './board';
import { atkOf, defenceOf, defOf, hurt, wayTo, addUnit, type Battle, type BattleEvent, type Unit } from './battle';
import { mendUnit } from './abilities';
import { bleedFor, burnFor, cleanse, fearFor, poisonFor, stunFor } from './ailments';
import { ultimateOf } from './abilities';
import { CHARGE_MAX } from './abilities';
import { poolOf } from './heroKits';
import { raiseAura, raiseWall, shove, type AuraAil } from './toolkit';
import { layTerrain, realHero } from './kits/effects';
import { countTraits, kindsOf, traitsOf, TRAIT_PERKS } from './traits';
import { isBoss } from './foes';
import { UNITS } from './units';

/** The switch (`traits.ts`): off, the traits are as they were before the perks; `only` keeps one trait's perks. */
export { TRAIT_PERKS };

/** The numbers of every perk (the balance knobs). */
export const PERK = {
  // Undead
  DOOR_SAFE_MS: 1000,
  ROT_REACH: 2,
  ROT_SHARE: 0.1,
  ROT_MS: 3000,
  SKELETON_HP: 0.25,
  SKELETON_ATK: 0.25,
  // Samurai
  IAI_CRIT: 1.15,
  DUEL_HASTE_MS: 1000,
  POEM_MS: 2500,
  POEM_DEALT: 1.15,
  POEM_LIVES: 0.25,
  // Mystic
  LEY_COST: 0.8,
  ECHO_MS: 1500,
  ECHO_SHARE: 0.3,
  CONFLUX_EVERY: 4,
  // Yokai
  TWIN_AT: 0.4,
  TWIN_HP: 0.2,
  TWIN_ATK: 0.5,
  TWIN_MS: 10000,
  DUSK_MS: 5000,
  DUSK_SLOW: 0.85,
  // Knightly
  WALL_TAKEN: 0.92,
  OATH_AT: 0.3,
  OATH_REACH: 2,
  OATH_EVERY: 6000,
  ORDER_REACH: 2,
  ORDER_DEALT: 1.15,
  ORDER_TAKEN: 0.9,
  ORDER_HEAL: 0.01,
  ORDER_HP: 0.3,
  // Holy
  BLESS: 1.15,
  HALLOW_HEAL: 0.003,
  HALLOW_BURN: 0.03,
  RISE_HP: 0.2,
  // Wild
  SCENT: 1.15,
  FRENZY_PER: 0.04,
  FRENZY_MAX: 10,
  STAMPEDE_FIRST: 3000,
  STAMPEDE_EVERY: 20000,
  STAMPEDE_MIGHT: 1.2,
  // Arcane
  FLUX: 8,
  WEAVE_MS: 3000,
  WEAVE_MIGHT: 1.5,
  OVERLOAD_START: 30,
  OVERLOAD_BACK: 0.25,
  // Frontier
  SNARES: 3,
  SNARE_MS: 14000,
  WANTED: 1.4,
  WANTED_HASTE_MS: 4000,
  WANTED_HEAL: 0.1,
  // Machine
  PLATING: 0.1,
  BOOM: 2,
  SENTRIES: 2,
  SENTRY_HP: 0.18,
  SENTRY_ATK: 0.22,
  // Royal
  CROWN: 1.1,
  TRIBUTE: 0.04,
  REGICIDE_STUN_MS: 1500,
  // Pirate
  PLUNDER: 1,
  SEA_TAKEN: 0.8,
  TIDE_TILES: 3,
  TIDE_MS: 20000,
  BROADSIDE_FIRST: 5000,
  BROADSIDE_EVERY: 12000,
  BROADSIDE_MIGHT: 2,
  /** The files either side of the thickest one the broadside rakes too. */
  BROADSIDE_WIDE: 1,
  // Vampire
  THIRST: 0.08,
  THRALLS: 2,
  THRALL_HP: 0.25,
  THRALL_ATK: 0.4,
  // Guardian
  CHALLENGE_MS: 600,
  CHALLENGE_TAKEN: 0.9,
  BASTION_TAKEN: 1,
  BASTION_BACK: 0.15,
  // Blade
  BLEED: 1 / 3,
  RIPOSTE: 0.4,
  RIPOSTE_EVERY: 1000,
  CUTS_EVERY: 5,
  // Marksman
  HIGH_PER: 0.08,
  PIN_EVERY: 4,
  PIN_MS: 1000,
  VOLLEY_EVERY: 12000,
  VOLLEY_CRIT: 1.5,
  // Caster
  SURGE: 6,
  LINGER_MS: 4000,
  LINGER_TILES: 2,
  OVERCAST_EVERY: 5,
  // Warden
  THORNWARD: 0.1,
  SANCTUARY: 0.9,
  SANCTUARY_REACH: 3,
  CIRCLE_AT: 0.5,
  CIRCLE_MS: 6000,
  CIRCLE_GUARD: 0.25,
  // Trickster
  IMAGES: 1,
  IMAGE_HP: 0.2,
  IMAGE_ATK: 0.5,
  IMAGE_MS: 8000,
  DAZE_MS: 1000,
  // Beast
  PACK_PER: 0.06,
  PACK_MAX: 0.24,
  PACK_REACH: 2,
  ROAR_REACH: 2,
  ROAR_MS: 2000,
  APEX_MS: 5000,
  APEX_SPEED: 1.4,
  APEX_HEAL: 0.05,
  // Gunner
  POWDER: 0.25,
  KEGS: 3,
  KEG_MS: 8000,
  KEG_MIGHT: 1.2,
  BOMB_EVERY: 12000,
  BOMB_SHELLS: 4,
  BOMB_MIGHT: 0.7,
  // Assassin
  BACKSTAB: 1.3,
  EXECUTE: 0.1,
  EXECUTE_BOSS: 0.06,
  STEP_REACH: 3,
  // Support
  MEDIC_EVERY: 2000,
  MEDIC: 0.02,
  HYMN_EVERY: 12000,
  HYMN_MS: 4000,
  HYMN_GUARD: 0.85,
  HYMN_MIGHT: 1.1,
  RALLY_HEAL: 0.06,
  RALLY_HASTE_MS: 5000,
  RALLY_REVIVE_MS: 3000,
  // Vanguard
  SPEARHEAD_MS: 8000,
  SPEARHEAD: 1.15,
  STAGGER_MS: 500,
  ONSLAUGHT_AT: 2000,
  ONSLAUGHT: 0.8,
  ONSLAUGHT_STUN_MS: 600,
  // Arcanist
  RUNIC: 1.15,
  SLING: 5,
  ANCHOR_AT: 0.25,
  /** The most of its health the anchor gives a hero back (time turns back, but not all the way for the badly hurt). */
  ANCHOR_CAP: 0.15,
  ANCHOR_MS: 4000,
  // Bulwark
  STEADY_STUN_MS: 1000,
  EARTH_MS: 12000,
  FIRM_MS: 2000,
  FIRM_TAKEN: 0.85,
  FIRM_NEAR: 0.95,
  // The Assault (no waves): the wave-start perks come round again this often (the owner's answer)
  ASSAULT_WAVE_MS: 60000,
  /** On the Assault's field, how far from the party's middle a perk reaches for foes. */
  FIELD_REACH: 16,
} as const;

/** What a perk shows: a beat for the page to draw (looks only; the rule has already happened). */
export type PerkWhat =
  | 'rise' | 'rot' | 'poem' | 'echo' | 'conflux' | 'twin' | 'dusk' | 'oath' | 'standard' | 'hallow' | 'risen' | 'stampede' | 'weave' | 'overload'
  | 'ambush' | 'wanted' | 'plating' | 'boom' | 'sentry' | 'crown' | 'tribute' | 'regicide' | 'tide' | 'broadside' | 'thrall' | 'challenge'
  | 'bastion' | 'cuts' | 'pin' | 'volley' | 'linger' | 'overcast' | 'circle' | 'sleight' | 'mirrors' | 'roar' | 'apex' | 'keg' | 'kegBoom'
  | 'shells' | 'execute' | 'shadow' | 'hymn' | 'rally' | 'onslaught' | 'sling' | 'anchor' | 'earthworks';

/** A perk's beat for the page: its trait, what it is, where (a tile, a file, tiles) and on whom. */
export interface PerkEvent {
  kind: 'perk';
  trait: string;
  what: PerkWhat;
  to?: number;
  at?: At;
  tiles?: At[];
  /** A hymn's kind, a file's index. */
  note?: string;
  ms?: number;
}

/** What a perk keeps on a fighter. */
export interface PerkUnit {
  /** Samurai I: its first blow this wave has landed. */
  struck?: boolean;
  /** Undead I: Death's Door is spent this wave; it cannot be hurt until then. */
  door?: boolean;
  doorUntil?: number;
  /** Samurai III: its death poem runs until then. */
  poem?: number;
  poemDone?: boolean;
  /** Blade III and Marksman II: blows and shots counted. */
  blows?: number;
  shots?: number;
  /** Assassin III: its next blow is a crit. */
  sure?: boolean;
  /** Beast III: its frenzy runs until then. */
  apex?: number;
  /** Bulwark III: where it stood, since when. */
  firm?: { u: number; v: number; t: number };
  /** Knightly II and Blade II: when it may next step in or riposte. */
  oathAt?: number;
  ripAt?: number;
  /** Vanguard II: the foes it has knocked back. */
  met?: number[];
  /** Beast II: it has roared this wave. */
  roared?: boolean;
  /** Trickster I: the first blow on it has missed this wave. */
  slipped?: boolean;
  /** Yokai II: it has split this wave. */
  twin?: boolean;
  /** Bulwark I: cannot be moved, nor stunned long. */
  steady?: boolean;
  /** Royal I: it wears the crown. */
  crowned?: boolean;
  /** Caster III: skills cast. */
  casts?: number;
  /** What a perk raised this is (skeleton, sentry, thrall, image, standard): the page tints it; the wave's start clears the thralls. */
  raised?: 'grave' | 'sentry' | 'thrall' | 'image' | 'twin' | 'standard';
  /** Frontier III: it is Wanted. */
  wanted?: boolean;
}

interface Later {
  at: number;
  k: 'echo' | 'onslaught' | 'wave';
  id?: string;
  u?: number;
  v?: number;
  share?: number;
}

/** The fight's perks: the tier each trait stands at (0, 1, 2 for I, II, III), the party's might and health, and what the rules count. */
export interface PerkState {
  tier: Record<string, number>;
  /** The party's average attack and health as the fight began (what a perk's strikes and summons are sized from). */
  might: number;
  health: number;
  /** Waves begun, and when the last began. */
  wave: number;
  waveAt: number;
  /** The king's spells cast this fight (Conflux). */
  spells: number;
  later: Later[];
  /** When the last skills were cast (Spell Weave). */
  casts: number[];
  /** Wild II's stacks this wave. */
  frenzy: number;
  /** Once-a-wave rules spent: the Holy rise, the Samurai poem, the Warden circles, the Arcanist anchor. */
  used: { rise?: boolean; poem?: boolean; circle?: boolean; anchor?: boolean };
  thralls: number;
  /** The periodic beats' next times. */
  next: Record<string, number>;
  /** Support II: the next hymn's kind (0 haste, 1 guard, 2 might), and the guard and might hymns' ends. */
  hymn: number;
  hymnGuard?: number;
  hymnMight?: number;
  /** Yokai III: the dusk's end. */
  dusk?: number;
  /** Gunner II's kegs. */
  kegs: { u: number; v: number; at: number }[];
  /** Arcanist III: where the party stood, every half second, for the last 4 seconds and a little. */
  hist: { t: number; snap: { id: number; hp: number; u: number; v: number; alive: boolean }[] }[];
  /** Pirate I: the gold the Pirates' kills dropped this fight (the run pays it, `noteFight`). */
  plunder: number;
  /** Caster III: the Casters' skills cast this fight. */
  casterCasts?: number;
}

/* ------------------------------------------------------------------ small helpers */

const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
const near1 = (a: At, c: At) => Math.max(Math.abs(a.u - c.u), Math.abs(a.v - c.v)) <= 1;
/** One of the party's own placed heroes (the king's strike, a pseudo-fighter of no kind, is none). */
const real = (u: Unit): boolean => !!UNITS[u.def] && realHero(u);
const tierOf = (b: Battle, id: string): number => b.perk?.tier[id] ?? -1;
/** Whether a trait stands at least at tier `k` (0 for I, 1 for II, 2 for III). */
export const perkAt = (b: Battle, id: string, k: number): boolean => tierOf(b, id) >= k;
const isOf = (u: Unit, id: string): boolean => real(u) && traitsOf(u.def).includes(id);
const heroes = (b: Battle): Unit[] => b.units.filter((u) => u.alive && real(u));
const allHeroes = (b: Battle): Unit[] => b.units.filter((u) => real(u));
/** The foes a perk can reach: every one standing, or on the Assault's big field those within `FIELD_REACH` of the party's middle. */
function foesOn(b: Battle): Unit[] {
  const all = b.units.filter((u) => u.alive && u.side === 'foe' && !u.under);
  if (!b.field) return all;
  const mid = partyMid(b);
  return all.filter((u) => apart(u, mid) <= PERK.FIELD_REACH);
}
const membersUp = (b: Battle, id: string): Unit[] => heroes(b).filter((u) => isOf(u, id));
const pk = (u: Unit): PerkUnit => (u.pk ??= {});
const perkEv = (out: BattleEvent[], e: Omit<PerkEvent, 'kind'>) => out.push({ kind: 'perk', ...e } as BattleEvent);
/** A perk's strike on a foe: `power` less half its defence (as an aura's), at least 1. */
const strike = (power: number, f: Unit) => Math.max(1, Math.round(power - defenceOf(f) * 0.5));
/** Who a trait's strike is credited to: the first of its heroes standing, else any hero standing. */
const bearer = (b: Battle, id: string): Unit | undefined => membersUp(b, id)[0] ?? heroes(b)[0];
const freeAt = (b: Battle, at: At): boolean => {
  const t = tileAt(b.board, at.u, at.v);
  return !!t && standable(t) && !b.units.some((x) => x.alive && ((x.u === at.u && x.v === at.v) || (x.step && x.step.u === at.u && x.step.v === at.v)));
};
/** The free tiles within `r` of a spot, nearest first (ties in reading order). */
function freeNear(b: Battle, at: At, r: number): At[] {
  const out: At[] = [];
  for (let dv = -r; dv <= r; dv++)
    for (let du = -r; du <= r; du++) {
      const x = { u: at.u + du, v: at.v + dv };
      if ((du || dv) && freeAt(b, x)) out.push(x);
    }
  return out.sort((x, y) => apart(x, at) - apart(y, at) || x.v - y.v || x.u - y.u);
}
/** The party's health now as a share of its whole (the fallen count as none). */
const partyShare = (b: Battle): number => {
  const all = allHeroes(b);
  const top = all.reduce((n, u) => n + u.maxHp, 0);
  return top ? all.reduce((n, u) => n + (u.alive ? u.hp : 0), 0) / top : 1;
};
/** The middle of the party standing (rounded). */
const partyMid = (b: Battle): At => {
  const hs = heroes(b);
  if (!hs.length) return { u: Math.floor(b.board.w / 2), v: b.board.d - 2 };
  return { u: Math.round(hs.reduce((n, u) => n + u.u, 0) / hs.length), v: Math.round(hs.reduce((n, u) => n + u.v, 0) / hs.length) };
};
/** How far a foe is from the nearest hero. */
const toParty = (b: Battle, f: At): number => Math.min(99, ...heroes(b).map((h) => apart(h, f)));
const haste = (b: Battle, u: Unit, ms: number, out: BattleEvent[]) => {
  u.hasteUntil = Math.max(u.hasteUntil ?? 0, b.t + ms);
  out.push({ kind: 'haste', to: u.id, ms });
};
/** A summon kind raised by a perk: sized by shares of the party's health and might, owned by nobody (it is the trait's). */
function raise(b: Battle, kind: string, at: At, hp: number, atk: number, raised: PerkUnit['raised']): Unit {
  const t = addUnit(b, kind, at.u, at.v);
  t.maxHp = t.hp = Math.max(1, Math.round(hp));
  t.power = UNITS[kind].atk ? Math.max(0.01, atk / UNITS[kind].atk) : 1;
  pk(t).raised = raised;
  t.facing = 3;
  b.kits ??= {};
  return t;
}
/** The file (a column of the board) with the most foes; ties go to the one nearest the party's middle, then the lower. */
function thickestFile(b: Battle): number | undefined {
  const foes = foesOn(b);
  if (!foes.length) return undefined;
  const mid = partyMid(b).u;
  const n = new Map<number, number>();
  for (const f of foes) n.set(f.u, (n.get(f.u) ?? 0) + 1);
  return [...n.entries()].sort((x, y) => y[1] - x[1] || Math.abs(x[0] - mid) - Math.abs(y[0] - mid) || x[0] - y[0])[0][0];
}

/* ------------------------------------------------------------------ the fight's start and each wave's */

/** The tiers the placed heroes wake (the daily's featured trait counts one more), or none. */
export function perkTiers(kinds: Iterable<string>, featured?: string): Record<string, number> {
  const tier: Record<string, number> = {};
  for (const c of countTraits(kinds, featured)) if (c.active && (!TRAIT_PERKS.only || TRAIT_PERKS.only === c.trait.id)) tier[c.trait.id] = c.tier;
  return tier;
}

/** The fight begins (`fight`): the perks the placed heroes wake, fixed now, and the first wave's start. The events go out on the next tick. */
export function startPerks(b: Battle): void {
  delete b.perk;
  if (!TRAIT_PERKS.on) return;
  const tier = perkTiers(kindsOf(b.units), b.featured);
  if (!Object.keys(tier).length) return;
  const hs = allHeroes(b);
  if (!hs.length) return;
  b.perk = {
    tier,
    might: hs.reduce((n, u) => n + atkOf(u), 0) / hs.length,
    health: hs.reduce((n, u) => n + u.maxHp, 0) / hs.length,
    wave: 0,
    waveAt: b.t,
    spells: 0,
    later: [],
    casts: [],
    frenzy: 0,
    used: {},
    thralls: 0,
    next: {},
    hymn: 0,
    kegs: [],
    hist: [],
    plunder: 0,
  };
  b.kits ??= {};
  for (const u of hs) {
    if (perkAt(b, 'holy', 0)) u.healMult = (u.healMult ?? 1) * PERK.BLESS;
    if (perkAt(b, 'bulwark', 0) && isOf(u, 'bulwark')) pk(u).steady = true;
  }
  // (Support III: a life raises a fallen hero sooner)
  if (perkAt(b, 'support', 2)) b.reviveMs = PERK.RALLY_REVIVE_MS;
  perkWave(b, b.spells.events);
}

/** The Last Stand's party changed (a hero joined or fell for good): the tiers again, keeping what the rules have counted. */
export function syncPerks(b: Battle): void {
  if (!TRAIT_PERKS.on || b.phase !== 'fight') return;
  const tier = perkTiers(kindsOf(b.units.filter((u) => u.alive)), b.featured);
  if (!b.perk) return startPerks(b);
  b.perk.tier = tier;
}

/** The Last Stand's wave has begun: its foes come on over its first seconds, so its wave-start perks wait `ms` for them. */
export function perkWaveSoon(b: Battle, ms: number): void {
  b.perk?.later.push({ at: b.t + ms, k: 'wave' });
}

/** A wave begins (the fight's start, each of the Last Stand's waves, each minute of an Assault): the once-a-wave rules come round, and what
 *  the perks raise and lay at a wave's start is raised and laid. */
export function perkWave(b: Battle, out: BattleEvent[]): void {
  const s = b.perk;
  if (!s) return;
  s.wave++;
  s.waveAt = b.t;
  s.used = {};
  s.frenzy = 0;
  s.thralls = 0;
  s.casts = [];
  s.hist = [];
  // (the thralls fight until the wave ends: a new wave's start lets the last wave's go)
  for (const u of b.units) if (u.alive && u.pk?.raised === 'thrall') {
    u.alive = false;
    u.diedAt = b.t;
    out.push({ kind: 'fade', to: u.id });
  }
  for (const u of b.units) {
    if (!u.pk && !real(u)) continue;
    const p = pk(u);
    p.struck = p.door = p.roared = p.slipped = p.twin = p.poemDone = false;
    p.met = [];
    // (the old once-a-fight milestones are once a wave now)
    u.guardianShieldUsed = u.tricksterLogUsed = u.vampireSwarmUsed = false;
  }
  const duel = !!b.duel;
  const hs = heroes(b);
  // Machine I: the plating
  if (perkAt(b, 'machine', 0))
    for (const u of membersUp(b, 'machine')) {
      u.shield = { hp: Math.round(u.maxHp * PERK.PLATING), until: b.t + 600000 };
      perkEv(out, { trait: 'machine', what: 'plating', to: u.id });
    }
  // Royal I: the crown, on the strongest standing
  if (perkAt(b, 'royal', 0) && !hs.some((u) => u.pk?.crowned)) crown(b, out);
  // Arcane III: the ultimates start fuller
  if (perkAt(b, 'arcane', 2))
    for (const u of hs)
      if (ultimateOf(u)) {
        u.charge2 = Math.min(CHARGE_MAX, (u.charge2 ?? 0) + PERK.OVERLOAD_START);
        perkEv(out, { trait: 'arcane', what: 'overload', to: u.id });
      }
  // Yokai III: the spirit dusk
  if (perkAt(b, 'yokai', 2)) {
    s.dusk = b.t + PERK.DUSK_MS;
    perkEv(out, { trait: 'yokai', what: 'dusk', ms: PERK.DUSK_MS });
  }
  // Frontier III: the toughest foe is Wanted
  if (perkAt(b, 'frontier', 2)) markWanted(b, out);
  // the timed beats of the wave
  if (perkAt(b, 'wild', 2)) s.next.stampede = b.t + PERK.STAMPEDE_FIRST;
  if (perkAt(b, 'pirate', 2)) s.next.broadside = b.t + PERK.BROADSIDE_FIRST;
  if (perkAt(b, 'gunner', 2)) s.next.bomb = b.t + PERK.BOMB_EVERY;
  if (perkAt(b, 'marksman', 2)) s.next.volley = b.t + PERK.VOLLEY_EVERY;
  if (perkAt(b, 'support', 0)) s.next.medic = b.t + PERK.MEDIC_EVERY;
  if (perkAt(b, 'support', 1)) s.next.hymn = b.t + PERK.HYMN_EVERY;
  if (perkAt(b, 'vanguard', 2) && !duel) s.later.push({ at: b.t + PERK.ONSLAUGHT_AT, k: 'onslaught' });
  // (Bulwark III: each starts the wave standing)
  for (const u of membersUp(b, 'bulwark')) pk(u).firm = { u: u.u, v: u.v, t: b.t };
  // (a duel's ring holds only its two: nothing is raised or laid there, and no strike falls on the field)
  if (duel) return;
  // Undead III: three skeletons rise from the grave
  if (perkAt(b, 'undead', 2)) riseSkeletons(b, out);
  // Machine III: the sentry turrets
  if (perkAt(b, 'machine', 2)) deploySentries(b, out);
  // Knightly III: the Order's standard
  if (perkAt(b, 'knightly', 2) && !b.units.some((u) => u.alive && u.pk?.raised === 'standard')) {
    const at = freeNear(b, partyMid(b), 2)[0];
    if (at) {
      const st = raise(b, 'standard', at, s.health * PERK.ORDER_HP, 1, 'standard');
      perkEv(out, { trait: 'knightly', what: 'standard', to: st.id, at });
    }
  }
  // Holy II: the ground round each Holy hero is hallowed
  if (perkAt(b, 'holy', 1))
    for (const h of membersUp(b, 'holy')) {
      raiseAura(b, h, { what: 'hallowed', reach: 1, ms: 600000, every: 1000, ally: { heal: PERK.HALLOW_HEAL }, foe: { dmg: (PERK.HALLOW_BURN * s.might) / Math.max(1, atkOf(h)) } }, out);
      perkEv(out, { trait: 'holy', what: 'hallow', to: h.id });
    }
  // Frontier II: snares in the foes' path
  if (perkAt(b, 'frontier', 1)) ambush(b, out);
  // Pirate II: the tide
  if (perkAt(b, 'pirate', 1)) tide(b, out);
  // Gunner II: the kegs
  if (perkAt(b, 'gunner', 1)) rollKegs(b, out);
  // Bulwark II: the earthworks
  if (perkAt(b, 'bulwark', 1))
    for (const w of membersUp(b, 'bulwark')) {
      const laid = raiseWall(b, w, [{ u: w.u, v: w.v - 2 }], 'stone', PERK.EARTH_MS, out);
      if (laid.length) perkEv(out, { trait: 'bulwark', what: 'earthworks', to: w.id, tiles: laid });
    }
  // Trickster III: the mirror images
  if (perkAt(b, 'trickster', 2))
    for (const t of membersUp(b, 'trickster')) {
      for (const at of freeNear(b, t, 1).slice(0, PERK.IMAGES)) image(b, t, at, PERK.IMAGE_HP, PERK.IMAGE_ATK, PERK.IMAGE_MS, 'image');
      perkEv(out, { trait: 'trickster', what: 'mirrors', to: t.id });
    }
  // Assassin III: through the shadows to the weakest foe
  if (perkAt(b, 'assassin', 2)) for (const a of membersUp(b, 'assassin')) shadowStep(b, a, 99, out);
}

function riseSkeletons(b: Battle, out: BattleEvent[]): void {
  const s = b.perk!;
  const up = b.units.filter((u) => u.alive && u.pk?.raised === 'grave');
  // (the skeletons still standing from the last wave are made whole; the fallen rise again)
  for (const u of up) u.hp = u.maxHp;
  const near = membersUp(b, 'undead')[0] ?? heroes(b)[0];
  if (!near) return;
  for (const kind of ['graveWarrior', 'graveSpear', 'graveArcher']) {
    if (up.some((u) => u.def === kind)) continue;
    const at = freeNear(b, near, 2)[0];
    if (!at) continue;
    const t = raise(b, kind, at, s.health * PERK.SKELETON_HP, s.might * PERK.SKELETON_ATK, 'grave');
    perkEv(out, { trait: 'undead', what: 'rise', to: t.id, at });
  }
}

function deploySentries(b: Battle, out: BattleEvent[]): void {
  const s = b.perk!;
  const have = b.units.filter((u) => u.alive && u.pk?.raised === 'sentry');
  for (const u of have) u.hp = u.maxHp;
  const spots = freeNear(b, partyMid(b), 2).sort((x, y) => tileAt(b.board, y.u, y.v)!.h - tileAt(b.board, x.u, x.v)!.h || apart(x, partyMid(b)) - apart(y, partyMid(b)) || x.v - y.v || x.u - y.u);
  for (let i = have.length; i < PERK.SENTRIES && spots.length; i++) {
    const at = spots.shift()!;
    const t = raise(b, 'sentry', at, s.health * PERK.SENTRY_HP, s.might * PERK.SENTRY_ATK, 'sentry');
    perkEv(out, { trait: 'machine', what: 'sentry', to: t.id, at });
  }
}

/** A mirror image of a hero (or a Yokai's foxfire twin): its looks, shares of its health and attack, for a while. */
function image(b: Battle, of: Unit, at: At, hp: number, atk: number, ms: number, raised: 'image' | 'twin'): Unit {
  const t = raise(b, 'mirror', at, of.maxHp * hp, atkOf(of) * atk, raised);
  t.look = defOf(of).sheet;
  t.expires = b.t + ms;
  t.facing = of.facing;
  return t;
}

function crown(b: Battle, out: BattleEvent[]): Unit | undefined {
  const heir = heroes(b).sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id)[0];
  if (!heir) return undefined;
  pk(heir).crowned = true;
  heir.power = (heir.power ?? 1) * PERK.CROWN;
  const was = heir.maxHp;
  heir.maxHp = Math.round(heir.maxHp * PERK.CROWN);
  heir.hp += heir.maxHp - was;
  perkEv(out, { trait: 'royal', what: 'crown', to: heir.id });
  return heir;
}

function markWanted(b: Battle, out: BattleEvent[]): void {
  const foes = foesOn(b);
  if (foes.some((f) => f.pk?.wanted)) return;
  const w = [...foes].sort((x, y) => Number(isBoss(y.def)) - Number(isBoss(x.def)) || y.maxHp - x.maxHp || x.id - y.id)[0];
  if (!w) return;
  pk(w).wanted = true;
  perkEv(out, { trait: 'frontier', what: 'wanted', to: w.id });
}

/** The foes nearest the party, nearest first. */
const frontFoes = (b: Battle): Unit[] => foesOn(b).sort((x, y) => toParty(b, x) - toParty(b, y) || x.id - y.id);

function ambush(b: Battle, out: BattleEvent[]): void {
  const by = bearer(b, 'frontier');
  if (!by) return;
  const traps = (b.traps ??= []);
  const laid: At[] = [];
  for (const f of frontFoes(b)) {
    if (laid.length >= PERK.SNARES) break;
    // (the tile it will step on toward the party: the heroes stand on the high rows)
    const at = [{ u: f.u, v: f.v + 1 }, { u: f.u, v: f.v + 2 }].find((x) => freeAt(b, x) && !traps.some((t) => t.u === x.u && t.v === x.v));
    if (!at) continue;
    traps.push({ u: at.u, v: at.v, side: 'hero', by: by.id, until: b.t + PERK.SNARE_MS, dmg: b.perk!.might });
    out.push({ kind: 'trap', u: at.u, v: at.v, ms: PERK.SNARE_MS });
    laid.push(at);
  }
  if (laid.length) perkEv(out, { trait: 'frontier', what: 'ambush', tiles: laid });
}

function tide(b: Battle, out: BattleEvent[]): void {
  const laid: At[] = [];
  for (const f of frontFoes(b)) {
    if (laid.length >= PERK.TIDE_TILES) break;
    const at = { u: f.u, v: f.v + 1 };
    if (!tileAt(b.board, at.u, at.v) || laid.some((x) => x.u === at.u && x.v === at.v)) continue;
    if (layTerrain(b, at, 'flood', PERK.TIDE_MS, out)) laid.push(at);
  }
  if (laid.length) perkEv(out, { trait: 'pirate', what: 'tide', tiles: laid });
}

function rollKegs(b: Battle, out: BattleEvent[]): void {
  const s = b.perk!;
  s.kegs = [];
  for (const f of frontFoes(b)) {
    if (s.kegs.length >= PERK.KEGS) break;
    const at = freeNear(b, f, 1).find((x) => !s.kegs.some((k) => k.u === x.u && k.v === x.v));
    if (!at) continue;
    s.kegs.push({ ...at, at: b.t + PERK.KEG_MS });
    perkEv(out, { trait: 'gunner', what: 'keg', at, ms: PERK.KEG_MS });
  }
}

function blowKeg(b: Battle, i: number, out: BattleEvent[]): void {
  const s = b.perk!;
  const k = s.kegs.splice(i, 1)[0];
  const by = bearer(b, 'gunner');
  perkEv(out, { trait: 'gunner', what: 'kegBoom', at: { u: k.u, v: k.v } });
  if (!by) return;
  for (const f of foesOn(b).filter((x) => near1(x, k))) {
    hurt(b, by, f, strike(s.might * PERK.KEG_MIGHT, f), true, true, out, 'skill');
    if (f.alive) burnFor(b, by, f);
  }
}

/** Assassin III: to the tile behind the weakest foe within `reach` (the whole field at a wave's start); its next blow is a crit. */
function shadowStep(b: Battle, a: Unit, reach: number, out: BattleEvent[]): void {
  const f = foesOn(b).filter((x) => apart(a, x) <= reach).sort((x, y) => x.hp - y.hp || x.id - y.id)[0];
  if (!f) return;
  const back = [[1, 0], [0, 1], [-1, 0], [0, -1]][(f.facing + 2) % 4];
  const behind = { u: f.u + back[0], v: f.v + back[1] };
  const at = freeAt(b, behind) ? behind : freeNear(b, f, 1)[0];
  if (!at) return;
  const from = { u: a.u, v: a.v };
  a.u = at.u;
  a.v = at.v;
  a.step = undefined;
  a.facing = wayTo(a, f);
  pk(a).sure = true;
  out.push({ kind: 'blink', by: a.id, from, to: { ...at } });
  perkEv(out, { trait: 'assassin', what: 'shadow', to: a.id, at });
}

/* ------------------------------------------------------------------ each tick */

export function tickPerks(b: Battle, out: BattleEvent[]): void {
  const s = b.perk;
  if (!s) return;
  // (the Assault has no waves: its wave-start perks come round every minute, the owner's answer)
  if (b.field && b.t - s.waveAt >= PERK.ASSAULT_WAVE_MS) perkWave(b, out);
  if (s.later.length) {
    const due = s.later.filter((x) => x.at <= b.t);
    s.later = s.later.filter((x) => x.at > b.t);
    for (const x of due) {
      if (x.k === 'echo') spellHook.cast?.(b, x.id!, x.u!, x.v!, x.share!);
      else if (x.k === 'onslaught') onslaught(b, out);
      else perkWave(b, out);
    }
  }
  const half = b.t % 500 === 0;
  const second = b.t % 1000 === 0;
  // Samurai III: a poem's end
  for (const u of b.units) {
    if (u.pk?.poem === undefined || u.pk.poem > b.t || !u.alive) continue;
    u.pk.poem = undefined;
    u.pk.poemDone = true;
    if (u.hp <= u.maxHp * PERK.POEM_LIVES) hurt(b, u, u, u.hp, true, true, out, 'dot');
  }
  // Guardian I: the foes beside a Guardian are drawn to it
  if (half && perkAt(b, 'guardian', 0)) {
    const gs = membersUp(b, 'guardian');
    for (const f of foesOn(b)) {
      if (f.taunt && f.taunt.until > b.t) continue;
      const g = gs.filter((x) => apart(x, f) === 1).sort((x, y) => x.id - y.id)[0];
      if (g) f.taunt = { to: g.id, until: b.t + PERK.CHALLENGE_MS };
    }
  }
  // Knightly III: the standard mends those round it
  if (second && perkAt(b, 'knightly', 2)) {
    const st = b.units.find((u) => u.alive && u.pk?.raised === 'standard');
    if (st) for (const h of heroes(b)) if (apart(h, st) <= PERK.ORDER_REACH) mendUnit(h, h.maxHp * PERK.ORDER_HEAL, out, st);
  }
  // Bulwark III: who has stood still
  if (perkAt(b, 'bulwark', 2)) for (const w of membersUp(b, 'bulwark')) {
    const f = pk(w).firm;
    if (!f || f.u !== w.u || f.v !== w.v) pk(w).firm = { u: w.u, v: w.v, t: b.t };
  }
  // Beast II: the first time a foe closes on a Beast this wave, it roars
  if (half && perkAt(b, 'beast', 1))
    for (const w of membersUp(b, 'beast')) {
      if (w.pk?.roared) continue;
      const near = foesOn(b).filter((f) => apart(f, w) <= PERK.ROAR_REACH);
      if (!near.length) continue;
      pk(w).roared = true;
      for (const f of near) fearFor(b, f, PERK.ROAR_MS, w);
      perkEv(out, { trait: 'beast', what: 'roar', to: w.id });
    }
  // Gunner II: kegs left alone go off
  for (let i = s.kegs.length - 1; i >= 0; i--) if (s.kegs[i].at <= b.t) blowKeg(b, i, out);
  // the periodic strikes
  if (s.next.stampede !== undefined && b.t >= s.next.stampede) {
    s.next.stampede = b.t + PERK.STAMPEDE_EVERY;
    if (!b.duel) fileStrike(b, 'wild', 'stampede', PERK.STAMPEDE_MIGHT, out);
  }
  if (s.next.broadside !== undefined && b.t >= s.next.broadside) {
    s.next.broadside = b.t + PERK.BROADSIDE_EVERY;
    if (!b.duel) fileStrike(b, 'pirate', 'broadside', PERK.BROADSIDE_MIGHT, out);
  }
  if (s.next.bomb !== undefined && b.t >= s.next.bomb) {
    s.next.bomb = b.t + PERK.BOMB_EVERY;
    if (!b.duel) bombard(b, out);
  }
  if (s.next.volley !== undefined && b.t >= s.next.volley) {
    s.next.volley = b.t + PERK.VOLLEY_EVERY;
    volley(b, out);
  }
  if (s.next.medic !== undefined && b.t >= s.next.medic) {
    s.next.medic = b.t + PERK.MEDIC_EVERY;
    const by = bearer(b, 'support');
    const low = heroes(b).filter((h) => h.hp < h.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
    if (by && low) mendUnit(low, low.maxHp * PERK.MEDIC, out, by);
  }
  if (s.next.hymn !== undefined && b.t >= s.next.hymn) {
    s.next.hymn = b.t + PERK.HYMN_EVERY;
    if (membersUp(b, 'support').length) hymn(b, out);
  }
  // Warden III: the circles, once a wave
  if (perkAt(b, 'warden', 2) && !s.used.circle && partyShare(b) < PERK.CIRCLE_AT) {
    const ws = membersUp(b, 'warden');
    if (ws.length) {
      s.used.circle = true;
      for (const w of ws) {
        raiseAura(b, w, { what: 'wardCircle', reach: 1, ms: PERK.CIRCLE_MS, every: 250, ally: { guard: PERK.CIRCLE_GUARD } }, out);
        perkEv(out, { trait: 'warden', what: 'circle', to: w.id, ms: PERK.CIRCLE_MS });
      }
    }
  }
  // Arcanist III: where the party stood, and the anchor
  if (perkAt(b, 'arcanist', 2)) {
    if (half) {
      s.hist.push({ t: b.t, snap: allHeroes(b).map((u) => ({ id: u.id, hp: u.hp, u: u.u, v: u.v, alive: u.alive })) });
      while (s.hist.length && b.t - s.hist[0].t > PERK.ANCHOR_MS + 500) s.hist.shift();
    }
    if (!s.used.anchor && partyShare(b) < PERK.ANCHOR_AT && b.t - s.waveAt >= PERK.ANCHOR_MS && membersUp(b, 'arcanist').length) anchor(b, out);
  }
}

/** A strike down a file of the board (Wild III's stampede, Pirate III's broadside). */
function fileStrike(b: Battle, id: string, what: 'stampede' | 'broadside', mult: number, out: BattleEvent[]): void {
  const by = bearer(b, id);
  const u = thickestFile(b);
  if (!by || u === undefined) return;
  const s = b.perk!;
  const wide = what === 'broadside' ? PERK.BROADSIDE_WIDE : 0;
  const hit = foesOn(b).filter((x) => Math.abs(x.u - u) <= wide).sort((x, y) => y.v - x.v || x.id - y.id);
  // (the page draws it down the file, from the farthest foe it strikes to the nearest)
  const from = Math.min(...hit.map((x) => x.v));
  const to = Math.max(...hit.map((x) => x.v));
  const tiles: At[] = [];
  for (let v = from; v <= to && tiles.length < 12; v++) tiles.push({ u, v });
  perkEv(out, { trait: id, what, note: String(u), tiles });
  for (const f of hit) {
    hurt(b, by, f, strike(s.might * mult, f), true, true, out, 'skill');
    if (!f.alive) continue;
    if (what === 'stampede') shove(b, by, f, 1, out, { u: f.u, v: f.v + 1 });
    else burnFor(b, by, f);
  }
}

function bombard(b: Battle, out: BattleEvent[]): void {
  const by = bearer(b, 'gunner');
  if (!by) return;
  const s = b.perk!;
  const back = foesOn(b).sort((x, y) => x.v - y.v || x.u - y.u || x.id - y.id).slice(0, PERK.BOMB_SHELLS);
  const tiles = back.map((f) => ({ u: f.u, v: f.v }));
  if (!tiles.length) return;
  perkEv(out, { trait: 'gunner', what: 'shells', tiles });
  for (const at of tiles) for (const f of foesOn(b).filter((x) => near1(x, at))) hurt(b, by, f, strike(s.might * PERK.BOMB_MIGHT, f), true, true, out, 'skill');
}

function volley(b: Battle, out: BattleEvent[]): void {
  const ms = membersUp(b, 'marksman').filter((m) => defOf(m).shot);
  const f = frontFoes(b)[0];
  if (!ms.length || !f) return;
  perkEv(out, { trait: 'marksman', what: 'volley', to: f.id });
  for (const m of ms) {
    if (!f.alive) break;
    out.push({ kind: 'shot', by: m.id, to: f.id, shot: defOf(m).shot!, ms: 120 + apart(m, f) * 110 });
    hurt(b, m, f, strike(atkOf(m) * PERK.VOLLEY_CRIT, f), true, false, out, 'skill');
  }
}

function hymn(b: Battle, out: BattleEvent[]): void {
  const s = b.perk!;
  const k = s.hymn;
  s.hymn = (k + 1) % 3;
  perkEv(out, { trait: 'support', what: 'hymn', note: ['haste', 'guard', 'might'][k], ms: PERK.HYMN_MS });
  if (k === 0) for (const h of heroes(b)) haste(b, h, PERK.HYMN_MS, out);
  else if (k === 1) s.hymnGuard = b.t + PERK.HYMN_MS;
  else s.hymnMight = b.t + PERK.HYMN_MS;
}

function onslaught(b: Battle, out: BattleEvent[]): void {
  for (const v of membersUp(b, 'vanguard')) {
    const f = foesOn(b).sort((x, y) => apart(v, x) - apart(v, y) || x.id - y.id)[0];
    if (!f) return;
    const land = freeNear(b, f, 1).sort((x, y) => apart(x, v) - apart(y, v) || x.v - y.v || x.u - y.u)[0];
    if (!land) continue;
    const from = { u: v.u, v: v.v };
    v.u = land.u;
    v.v = land.v;
    v.step = undefined;
    v.facing = wayTo(v, f);
    out.push({ kind: 'launch', to: v.id, from, land: { ...land }, ms: 500, peak: 2 });
    perkEv(out, { trait: 'vanguard', what: 'onslaught', to: v.id, at: land });
    for (const x of foesOn(b).filter((y) => near1(y, land))) {
      hurt(b, v, x, strike(atkOf(v) * PERK.ONSLAUGHT, x), true, true, out, 'skill');
      if (x.alive) stunFor(b, x, PERK.ONSLAUGHT_STUN_MS, false, 'stun', v);
    }
  }
}

function anchor(b: Battle, out: BattleEvent[]): void {
  const s = b.perk!;
  const then = s.hist.find((h) => b.t - h.t <= PERK.ANCHOR_MS);
  if (!then) return;
  s.used.anchor = true;
  perkEv(out, { trait: 'arcanist', what: 'anchor', ms: PERK.ANCHOR_MS });
  for (const was of then.snap) {
    const u = b.units.find((x) => x.id === was.id);
    if (!u || !was.alive) continue;
    if (!u.alive) {
      // (a hero fallen in those 4 seconds stands again where it stood, and no life is spent)
      if (!freeAt(b, was)) {
        const at = freeNear(b, was, 3)[0];
        if (!at) continue;
        u.u = at.u;
        u.v = at.v;
      } else {
        u.u = was.u;
        u.v = was.v;
      }
      u.alive = true;
      u.diedAt = undefined;
      u.hp = Math.max(1, Math.min(was.hp, Math.round(u.maxHp * PERK.ANCHOR_CAP)));
      u.busyUntil = b.t + 300;
      u.safeUntil = b.t + 1000;
      out.push({ kind: 'heal', to: u.id, amount: u.hp });
      continue;
    }
    if (was.hp > u.hp) mendUnit(u, Math.min(was.hp - u.hp, u.maxHp * PERK.ANCHOR_CAP), out, u);
    if ((u.u !== was.u || u.v !== was.v) && freeAt(b, was)) {
      out.push({ kind: 'blink', by: u.id, from: { u: u.u, v: u.v }, to: { u: was.u, v: was.v } });
      u.u = was.u;
      u.v = was.v;
      u.step = undefined;
    }
  }
}

/* ------------------------------------------------------------------ a blow */

/** Before a blow or skill lands on `to`: true when a perk turns it aside (the poem, Death's Door, Sleight) or the Knights take it. */
export function perkGuard(b: Battle, by: Unit, to: Unit, dmg: number, src: 'blow' | 'skill' | 'dot', splash: boolean, out: BattleEvent[]): boolean {
  const p = to.pk;
  if (p?.poem !== undefined && p.poem > b.t) return true;
  if (p?.doorUntil !== undefined && p.doorUntil > b.t) return true;
  if (by === to || by.side === to.side || to.side !== 'hero') return false;
  // Trickster I: the first blow aimed at each Trickster this wave misses
  if (src === 'blow' && perkAt(b, 'trickster', 0) && isOf(to, 'trickster') && !p?.slipped) {
    pk(to).slipped = true;
    out.push({ kind: 'dodge', to: to.id });
    perkEv(out, { trait: 'trickster', what: 'sleight', to: to.id });
    return true;
  }
  // Knightly II: a knight steps in front of the badly hurt
  if (src === 'blow' && !splash && perkAt(b, 'knightly', 1) && real(to) && to.hp < to.maxHp * PERK.OATH_AT) {
    const k = membersUp(b, 'knightly').filter((x) => x !== to && apart(x, to) <= PERK.OATH_REACH && (x.pk?.oathAt ?? 0) <= b.t).sort((x, y) => apart(x, to) - apart(y, to) || x.id - y.id)[0];
    if (k) {
      pk(k).oathAt = b.t + PERK.OATH_EVERY;
      perkEv(out, { trait: 'knightly', what: 'oath', to: k.id, at: { u: to.u, v: to.v } });
      hurt(b, by, k, dmg, false, true, out, src);
      return true;
    }
  }
  return false;
}

/** A blow's or skill's damage after the perks of the side that deals it and the side that takes it. */
export function perkDamage(b: Battle, by: Unit, to: Unit, dmg: number, src: 'blow' | 'skill' | 'dot', splash: boolean): number {
  if (by === to || by.side === to.side) return dmg;
  let m = 1;
  if (by.side === 'hero') {
    if (perkAt(b, 'wild', 0) && to.hp < to.maxHp / 2) m *= PERK.SCENT;
    if (to.pk?.wanted) m *= PERK.WANTED;
    if (by.pk?.poem !== undefined && by.pk.poem > b.t) m *= PERK.POEM_DEALT;
    if (b.perk!.hymnMight !== undefined && b.perk!.hymnMight > b.t) m *= PERK.HYMN_MIGHT;
    if (perkAt(b, 'knightly', 2) && nearStandard(b, by)) m *= PERK.ORDER_DEALT;
    if (src === 'blow' && !splash) {
      if (perkAt(b, 'assassin', 0) && wayTo(by, to) === to.facing) m *= PERK.BACKSTAB;
      if (perkAt(b, 'marksman', 0) && defOf(by).shot) {
        const up = (tileAt(b.board, by.u, by.v)?.h ?? 0) - (tileAt(b.board, to.u, to.v)?.h ?? 0);
        if (up > 0) m *= 1 + PERK.HIGH_PER * up;
      }
      if (perkAt(b, 'beast', 0) && isOf(by, 'beast')) {
        const n = b.units.filter((x) => x.alive && x !== by && x.side === 'hero' && apart(x, by) <= PERK.PACK_REACH).length;
        m *= 1 + Math.min(PERK.PACK_MAX, PERK.PACK_PER * n);
      }
    }
  }
  if (to.side === 'hero') {
    const s = b.perk!;
    if (s.hymnGuard !== undefined && s.hymnGuard > b.t) m *= PERK.HYMN_GUARD;
    if (perkAt(b, 'knightly', 0) && isOf(to, 'knightly') && b.units.some((x) => x.alive && x !== to && x.side === 'hero' && apart(x, to) === 1)) m *= PERK.WALL_TAKEN;
    if (perkAt(b, 'knightly', 2) && nearStandard(b, to)) m *= PERK.ORDER_TAKEN;
    if (perkAt(b, 'guardian', 0) && isOf(to, 'guardian')) m *= PERK.CHALLENGE_TAKEN;
    if (perkAt(b, 'guardian', 2) && isOf(to, 'guardian') && membersUp(b, 'guardian').some((g) => g !== to && apart(g, to) === 1)) m *= PERK.BASTION_TAKEN;
    if (perkAt(b, 'warden', 1) && membersUp(b, 'warden').some((w) => w !== to && w.u === to.u && w.v < to.v && to.v - w.v <= PERK.SANCTUARY_REACH)) m *= PERK.SANCTUARY;
    if (perkAt(b, 'pirate', 1) && isOf(to, 'pirate') && onWater(b, to)) m *= PERK.SEA_TAKEN;
    if (perkAt(b, 'bulwark', 2)) {
      if (isOf(to, 'bulwark') && firm(b, to)) m *= PERK.FIRM_TAKEN;
      else if (membersUp(b, 'bulwark').some((w) => w !== to && apart(w, to) === 1 && firm(b, w))) m *= PERK.FIRM_NEAR;
    }
  }
  return m === 1 ? dmg : Math.max(1, Math.round(dmg * m));
}

const nearStandard = (b: Battle, u: Unit): boolean => b.units.some((x) => x.alive && x.pk?.raised === 'standard' && apart(x, u) <= PERK.ORDER_REACH);
const onWater = (b: Battle, u: At): boolean => {
  const g = tileAt(b.board, u.u, u.v)?.ground;
  return g === 'water' || g === 'deep';
};
const firm = (b: Battle, u: Unit): boolean => !!u.pk?.firm && b.t - u.pk.firm.t >= PERK.FIRM_MS;

/** A blow or skill has reached `to`'s health (`landed` of it): what that wakes (the Vampires' thirst, the thorns, the Bastion's answer, a
 *  riposte, a Yokai's split). */
export function perkStruck(b: Battle, by: Unit, to: Unit, landed: number, src: 'blow' | 'skill' | 'dot', splash: boolean, out: BattleEvent[]): void {
  if (by === to || by.side === to.side || landed <= 0) return;
  // Vampire I
  if (src !== 'dot' && perkAt(b, 'vampire', 0) && isOf(by, 'vampire') && by.alive) mendUnit(by, landed * PERK.THIRST, out, by);
  if (to.side !== 'hero' || !by.alive || src === 'dot') return;
  const melee = src === 'blow' && !splash && apart(by, to) === 1 && !defOf(by).shot;
  // Warden I
  if (melee && perkAt(b, 'warden', 0) && isOf(to, 'warden')) hurt(b, to, by, Math.max(1, Math.round(landed * PERK.THORNWARD)), false, true, out, 'skill');
  // Guardian III
  if (by.alive && perkAt(b, 'guardian', 2) && isOf(to, 'guardian') && membersUp(b, 'guardian').some((g) => g !== to && apart(g, to) === 1)) {
    hurt(b, to, by, Math.max(1, Math.round(landed * PERK.BASTION_BACK)), false, true, out, 'skill');
    perkEv(out, { trait: 'guardian', what: 'bastion', to: to.id });
  }
  // Blade II
  if (melee && by.alive && to.alive && perkAt(b, 'blade', 1) && isOf(to, 'blade') && (to.pk?.ripAt ?? 0) <= b.t) {
    pk(to).ripAt = b.t + PERK.RIPOSTE_EVERY;
    hurt(b, to, by, strike(atkOf(to) * PERK.RIPOSTE, by), false, true, out, 'skill');
  }
  // Yokai II
  if (to.alive && perkAt(b, 'yokai', 1) && isOf(to, 'yokai') && !to.pk?.twin && to.hp < to.maxHp * PERK.TWIN_AT && !b.duel) {
    const at = freeNear(b, to, 1)[0];
    if (at) {
      pk(to).twin = true;
      image(b, to, at, PERK.TWIN_HP, PERK.TWIN_ATK, PERK.TWIN_MS, 'twin');
      perkEv(out, { trait: 'yokai', what: 'twin', to: to.id, at });
    }
  }
}

/** A blow would fell `to`: true when a perk holds the fall off (Death's Door, the Death Poem, the Resurrection). */
export function perkSpare(b: Battle, to: Unit, out: BattleEvent[]): boolean {
  if (!real(to)) return false;
  const s = b.perk!;
  if (perkAt(b, 'undead', 0) && isOf(to, 'undead') && !to.pk?.door) {
    pk(to).door = true;
    to.pk!.doorUntil = b.t + PERK.DOOR_SAFE_MS;
    to.hp = 1;
    out.push({ kind: 'style', by: to.id, what: "Death's Door" });
    return true;
  }
  if (perkAt(b, 'samurai', 2) && isOf(to, 'samurai') && !s.used.poem && !to.pk?.poemDone) {
    s.used.poem = true;
    pk(to).poem = b.t + PERK.POEM_MS;
    to.hp = 1;
    out.push({ kind: 'style', by: to.id, what: 'Death Poem' });
    perkEv(out, { trait: 'samurai', what: 'poem', to: to.id, ms: PERK.POEM_MS });
    return true;
  }
  if (perkAt(b, 'holy', 2) && !s.used.rise) {
    s.used.rise = true;
    to.hp = Math.max(1, Math.round(to.maxHp * PERK.RISE_HP));
    to.safeUntil = b.t + 1000;
    cleanse(b, to);
    out.push({ kind: 'heal', to: to.id, amount: to.hp });
    perkEv(out, { trait: 'holy', what: 'risen', to: to.id });
    return true;
  }
  return false;
}

/** `to` has fallen to `by` (credited, when a fighter dealt it): what the fall wakes. */
export function perkDeath(b: Battle, by: Unit, to: Unit, credit: boolean, out: BattleEvent[]): void {
  const s = b.perk!;
  const killer = credit ? (by.owner !== undefined ? b.units.find((x) => x.id === by.owner) ?? by : by) : undefined;
  if (to.side === 'foe') {
    // Undead II
    if (perkAt(b, 'undead', 1) && membersUp(b, 'undead').some((u) => apart(u, to) <= PERK.ROT_REACH)) {
      const u = membersUp(b, 'undead').sort((x, y) => apart(x, to) - apart(y, to) || x.id - y.id)[0];
      const hit = foesOn(b).filter((f) => near1(f, to));
      perkEv(out, { trait: 'undead', what: 'rot', at: { u: to.u, v: to.v } });
      for (const f of hit) poisonFor(b, u, f, (PERK.ROT_SHARE * s.might) / Math.max(1, atkOf(u)), PERK.ROT_MS);
    }
    // Yokai III: a foe slain in the dusk leaves a wisp
    if (s.dusk !== undefined && s.dusk > b.t) {
      const y = bearer(b, 'yokai');
      if (y) {
        const traps = (b.traps ??= []);
        if (!traps.some((t) => t.u === to.u && t.v === to.v)) {
          traps.push({ u: to.u, v: to.v, side: 'hero', by: y.id, until: b.t + 10000, dmg: Math.max(10, Math.round(s.might * 1.2)), hold: 800, wisp: true });
          out.push({ kind: 'wisp', by: y.id, u: to.u, v: to.v, ms: 10000 });
        }
      }
    }
    // Vampire III: the first two slain rise as thralls
    if (perkAt(b, 'vampire', 2) && s.thralls < PERK.THRALLS && !isBoss(to.def) && !to.nem && !b.duel && !UNITS[to.def].summon && (to.size ?? 1) <= 1) {
      s.thralls++;
      const t = raise(b, 'thrall', { u: to.u, v: to.v }, to.maxHp * PERK.THRALL_HP, atkOf(to) * PERK.THRALL_ATK, 'thrall');
      t.look = defOf(to).sheet;
      perkEv(out, { trait: 'vampire', what: 'thrall', to: t.id, at: { u: to.u, v: to.v } });
    }
    // Frontier III: the Wanted foe's fall
    if (to.pk?.wanted) {
      for (const h of heroes(b)) {
        haste(b, h, PERK.WANTED_HASTE_MS, out);
        mendUnit(h, h.maxHp * PERK.WANTED_HEAL, out, h);
      }
    }
    if (killer && real(killer) && killer.alive) {
      if (perkAt(b, 'wild', 1) && isOf(killer, 'wild')) s.frenzy = Math.min(PERK.FRENZY_MAX, s.frenzy + 1);
      // (Samurai II: a foe it fought alone, no other hero beside it)
      if (perkAt(b, 'samurai', 1) && isOf(killer, 'samurai') && !b.units.some((x) => x.alive && x !== killer && real(x) && apart(x, to) === 1)) haste(b, killer, PERK.DUEL_HASTE_MS, out);
      if (perkAt(b, 'royal', 1) && killer.pk?.crowned) {
        perkEv(out, { trait: 'royal', what: 'tribute', to: killer.id });
        for (const h of heroes(b)) mendUnit(h, h.maxHp * PERK.TRIBUTE, out, killer);
      }
      if (perkAt(b, 'beast', 2) && isOf(killer, 'beast')) {
        pk(killer).apex = b.t + PERK.APEX_MS;
        perkEv(out, { trait: 'beast', what: 'apex', to: killer.id, ms: PERK.APEX_MS });
      }
      if (perkAt(b, 'assassin', 2) && isOf(killer, 'assassin') && !b.duel) shadowStep(b, killer, PERK.STEP_REACH, out);
      if (perkAt(b, 'pirate', 0) && isOf(killer, 'pirate') && !b.duel) s.plunder += PERK.PLUNDER;
    }
    return;
  }
  // a mirror image broken dazes the foe who broke it
  if (to.pk?.raised === 'image' && credit && by.side === 'foe' && by.alive) stunFor(b, by, PERK.DAZE_MS, false, 'stun', to);
  if (!real(to)) return;
  // Machine II
  if (perkAt(b, 'machine', 1) && isOf(to, 'machine')) {
    perkEv(out, { trait: 'machine', what: 'boom', at: { u: to.u, v: to.v } });
    for (const f of foesOn(b).filter((x) => near1(x, to))) hurt(b, to, f, strike(atkOf(to) * PERK.BOOM, f), true, true, out, 'skill');
  }
  // Royal: the crown passes
  if (to.pk?.crowned) {
    to.pk.crowned = false;
    const heir = crown(b, out);
    if (perkAt(b, 'royal', 2)) {
      perkEv(out, { trait: 'royal', what: 'regicide', to: heir?.id });
      for (const f of foesOn(b)) stunFor(b, f, PERK.REGICIDE_STUN_MS, false, 'stun', heir);
      if (heir && ultimateOf(heir)) heir.charge2 = CHARGE_MAX;
    }
  }
  // Support III
  if (perkAt(b, 'support', 2)) {
    perkEv(out, { trait: 'support', what: 'rally', to: to.id });
    for (const h of heroes(b)) {
      mendUnit(h, h.maxHp * PERK.RALLY_HEAL, out, h);
      haste(b, h, PERK.RALLY_HASTE_MS, out);
    }
  }
}

/** The crit a hero's swing carries after the perks: Iaijutsu's first cut, a Shadow Step's sure one. */
export function perkCrit(b: Battle, me: Unit, crit: number, mult: number): number {
  if (!real(me)) return crit;
  if (perkAt(b, 'samurai', 0) && isOf(me, 'samurai') && !me.pk?.struck) crit = Math.max(crit, PERK.IAI_CRIT);
  if (me.pk?.sure) {
    me.pk.sure = false;
    crit = Math.max(crit, mult);
  }
  return crit;
}

/** A hero's blow or shot has landed on `to` (it reached its health): bleeds, pins, cuts, knock backs, splashes, kegs, executions. */
export function perkBlow(b: Battle, by: Unit, to: Unit, crit: boolean, dmg: number, out: BattleEvent[]): void {
  if (!real(by)) return;
  const s = b.perk!;
  const p = pk(by);
  p.struck = true;
  const shot = !!defOf(by).shot;
  if (perkAt(b, 'blade', 0) && isOf(by, 'blade') && crit && to.alive) bleedFor(b, by, to, (dmg * PERK.BLEED) / 6 / Math.max(1, atkOf(by)), 3000);
  if (perkAt(b, 'blade', 2) && isOf(by, 'blade')) {
    p.blows = (p.blows ?? 0) + 1;
    if (p.blows % PERK.CUTS_EVERY === 0) {
      perkEv(out, { trait: 'blade', what: 'cuts', to: by.id });
      for (const f of foesOn(b).filter((x) => x !== to && near1(x, by))) hurt(b, by, f, dmg, true, true, out, 'skill');
    }
  }
  if (perkAt(b, 'marksman', 1) && isOf(by, 'marksman') && shot) {
    p.shots = (p.shots ?? 0) + 1;
    if (p.shots % PERK.PIN_EVERY === 0 && to.alive) {
      to.rootUntil = Math.max(to.rootUntil ?? 0, b.t + PERK.PIN_MS);
      perkEv(out, { trait: 'marksman', what: 'pin', to: to.id, ms: PERK.PIN_MS });
    }
  }
  if (perkAt(b, 'vanguard', 1) && isOf(by, 'vanguard') && to.alive && !(p.met ??= []).includes(to.id)) {
    p.met.push(to.id);
    shove(b, by, to, 1, out);
    if (to.alive) stunFor(b, to, PERK.STAGGER_MS, false, 'stun', by);
  }
  if (perkAt(b, 'beast', 2) && p.apex !== undefined && p.apex > b.t) mendUnit(by, by.maxHp * PERK.APEX_HEAL, out, by);
  if (shot && perkAt(b, 'gunner', 0) && isOf(by, 'gunner'))
    for (const f of foesOn(b).filter((x) => x !== to && apart(x, to) === 1)) hurt(b, by, f, Math.max(1, Math.round(dmg * PERK.POWDER)), false, true, out, 'skill');
  if (shot && perkAt(b, 'gunner', 1) && isOf(by, 'gunner')) {
    const i = s.kegs.findIndex((k) => near1(k, to));
    if (i >= 0) blowKeg(b, i, out);
  }
  if (perkAt(b, 'assassin', 1) && isOf(by, 'assassin') && to.alive && to.hp < to.maxHp * (isBoss(to.def) || (to.size ?? 1) > 1 ? PERK.EXECUTE_BOSS : PERK.EXECUTE)) {
    perkEv(out, { trait: 'assassin', what: 'execute', to: to.id });
    hurt(b, by, to, to.hp, true, true, out, 'skill');
  }
}

/** How much faster (or slower) a fighter acts and walks from the perks. */
export function perkSpeed(b: Battle, x: Unit): number {
  const s = b.perk!;
  if (x.side === 'foe') return s.dusk !== undefined && s.dusk > b.t ? PERK.DUSK_SLOW : 1;
  if (!real(x)) return 1;
  let m = 1;
  if (s.frenzy) m *= 1 + PERK.FRENZY_PER * s.frenzy;
  if (perkAt(b, 'vanguard', 0) && isOf(x, 'vanguard') && b.t - s.waveAt < PERK.SPEARHEAD_MS) m *= PERK.SPEARHEAD;
  if (x.pk?.apex !== undefined && x.pk.apex > b.t) m *= PERK.APEX_SPEED;
  return m;
}

/** Whether a fighter crosses this ground (or a field snare, `'snare'`) without its slowing or hold: Frontier I, and the Pirates on water. */
export function perkFoot(b: Battle, me: Unit, ground: string): boolean {
  if (me.side !== 'hero' || !b.perk) return false;
  if (perkAt(b, 'frontier', 0)) return true;
  return perkAt(b, 'pirate', 1) && isOf(me, 'pirate') && (ground === 'water' || ground === 'deep');
}

/** A stun's length on a fighter after Bulwark I. */
export const perkStun = (b: Battle, to: Unit, ms: number): number => (to.pk?.steady && b.perk ? Math.min(ms, PERK.STEADY_STUN_MS) : ms);

/* ------------------------------------------------------------------ skills and spells */

let recast = false;

/** A hero's skill (or ultimate) went off (`powered`, from out[from] on): the pools topped up, the bursts, the refunds, the marks on the
 *  ground and the second cast. `again` casts it once more. */
export function perkCast(b: Battle, me: Unit, from: number, out: BattleEvent[], again: () => void): void {
  if (!real(me) || recast) return;
  const s = b.perk!;
  const hit: Unit[] = [];
  for (let i = from; i < out.length; i++) {
    const e = out[i];
    if (e.kind === 'hit' && e.by === me.id && !hit.some((x) => x.id === e.to)) {
      const f = b.units.find((x) => x.id === e.to);
      if (f && f.side !== me.side) hit.push(f);
    }
  }
  // Arcane I
  if (perkAt(b, 'arcane', 0)) {
    const low = heroes(b).filter((x) => x !== me && poolOf(x)).sort((x, y) => x.charge - y.charge || x.id - y.id)[0];
    if (low) low.charge = Math.min(CHARGE_MAX, low.charge + PERK.FLUX);
  }
  // Arcane II
  if (perkAt(b, 'arcane', 1)) {
    s.casts = [...s.casts.filter((t) => b.t - t < PERK.WEAVE_MS), b.t];
    if (s.casts.length >= 3) {
      s.casts = [];
      const f = foesOn(b).sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)[0];
      if (f) {
        perkEv(out, { trait: 'arcane', what: 'weave', at: { u: f.u, v: f.v } });
        for (const x of foesOn(b).filter((y) => near1(y, f))) hurt(b, me, x, strike(s.might * PERK.WEAVE_MIGHT, x), true, true, out, 'skill');
      }
    }
  }
  if (!isOf(me, 'caster')) return;
  // Caster I
  if (perkAt(b, 'caster', 0)) me.charge = Math.min(CHARGE_MAX, me.charge + PERK.SURGE);
  // Caster II (its own blows may land on later ticks: the ground is laid under the foes it struck now, else the foes nearest it)
  const marked = hit.length ? hit : foesOn(b).sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id).filter((x) => apart(me, x) <= defOf(me).range + 2);
  if (perkAt(b, 'caster', 1) && marked.length) {
    const ail = LINGER[me.def] ?? 'burn';
    const tiles = marked.slice(0, PERK.LINGER_TILES).map((f) => ({ u: f.u, v: f.v }));
    tiles.forEach((at, i) => raiseAura(b, me, { what: `linger${i}`, reach: 0, ms: PERK.LINGER_MS, every: 1000, at, foe: { dmg: 0.15, ail } }, out));
    perkEv(out, { trait: 'caster', what: 'linger', to: me.id, tiles, note: ail });
  }
  // Caster III (the Casters' skills counted together)
  if (perkAt(b, 'caster', 2)) {
    s.casterCasts = (s.casterCasts ?? 0) + 1;
    if (s.casterCasts % PERK.OVERCAST_EVERY === 0) {
      perkEv(out, { trait: 'caster', what: 'overcast', to: me.id });
      recast = true;
      try {
        again();
      } finally {
        recast = false;
      }
    }
  }
}

/** The ground each Caster's magic leaves (Caster II). */
const LINGER: Readonly<Record<string, AuraAil>> = { wizard: 'burn', wanderer: 'shock', warlock: 'curse', tyrant: 'burn', hemomancer: 'bleed' };

/** A hero cast its ultimate: Arcane III gives a quarter of the meter back. */
export function perkUlt(b: Battle, me: Unit, out: BattleEvent[]): void {
  if (!perkAt(b, 'arcane', 2) || !real(me)) return;
  const ult = ultimateOf(me);
  if (!ult) return;
  me.charge2 = Math.min(CHARGE_MAX, (me.charge2 ?? 0) + ult.need * PERK.OVERLOAD_BACK);
  perkEv(out, { trait: 'arcane', what: 'overload', to: me.id });
}

/** The king's spell casts without its cost (`spells.ts` fills it in, to keep the import one way): an echo, Conflux's second. */
export const spellHook: { cast?: (b: Battle, id: string, u: number, v: number, share: number) => void } = {};

/** What a king's spell costs after Mystic I. */
export const spellCost = (b: Battle, cost: number): number => (b.perk && perkAt(b, 'mystic', 0) ? Math.round(cost * PERK.LEY_COST) : cost);
/** What a king's spell is worth after Arcanist I. */
export const spellPower = (b: Battle): number => (b.perk && perkAt(b, 'arcanist', 0) ? PERK.RUNIC : 1);

/** The spells an echo does not repeat: those that call, raise or move (their second would be a second army, not an echo). */
const NO_ECHO = new Set(['wolves', 'mirage', 'raisedead', 'resurrect', 'blink']);

/** The king cast a spell (its cost paid): the echo, Conflux, the Arcanists' answer. Returns the mana Conflux gives back. */
export function perkSpell(b: Battle, id: string, u: number, v: number, cost: number, out: BattleEvent[]): number {
  const s = b.perk;
  if (!s) return 0;
  let back = 0;
  s.spells++;
  if (perkAt(b, 'mystic', 2) && s.spells % PERK.CONFLUX_EVERY === 0) {
    back = cost;
    perkEv(out, { trait: 'mystic', what: 'conflux', at: { u, v } });
    if (!NO_ECHO.has(id)) {
      spellHook.cast?.(b, id, u, v, 1);
      if (perkAt(b, 'mystic', 1)) s.later.push({ at: b.t + PERK.ECHO_MS, k: 'echo', id, u, v, share: PERK.ECHO_SHARE });
    }
  }
  if (perkAt(b, 'mystic', 1) && !NO_ECHO.has(id)) {
    s.later.push({ at: b.t + PERK.ECHO_MS, k: 'echo', id, u, v, share: PERK.ECHO_SHARE });
    perkEv(out, { trait: 'mystic', what: 'echo', at: { u, v }, ms: PERK.ECHO_MS });
  }
  if (perkAt(b, 'arcanist', 1))
    for (const a of membersUp(b, 'arcanist')) {
      a.charge = Math.min(CHARGE_MAX, a.charge + PERK.SLING);
      a.busyUntil = Math.min(a.busyUntil, b.t);
      perkEv(out, { trait: 'arcanist', what: 'sling', to: a.id });
    }
  return back;
}

/* ------------------------------------------------------------------ the page's words */

/** The traits on the field that have a tier awake, for the page: the trait, its tier (0 to 2). */
export const awake = (b: Battle): { trait: string; tier: number }[] => Object.entries(b.perk?.tier ?? {}).map(([trait, tier]) => ({ trait, tier }));

