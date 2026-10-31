// The Eidolons in a fight (EIDOLONS batch 3, docs/notes/eidolons.md; the design is docs/notes/quests-summons-design.md, its last sections
// "The owner's decisions", "Making the Eidolons feel epic" and "The six Eidolons chosen"). Six great beings the keep may call once its War
// Horn is full (`warHorn.ts`): Askel the Cinderhound, Nivra the Rime Wyrm, Aurelan the Lion of Dawn, Voltara the Copper Goddess, Gorm the
// Quarry Titan and Vaelkhar the Dragon King. Called, an Eidolon strikes the whole board at once with the same strength for all six: every
// ordinary foe falls, an elite or a mid-boss loses 65% of its full health, a last boss 45%, a Calamity guardian 40%, a great being in its
// own trial 25%. Then its rider, the thing that makes the choice matter (burning ground, a freeze, the fallen raised, ultimates charged,
// stone skin, a drain).
//
// The page arms a fight with the Eidolon chosen (`armEidolon`) when the horn is full and one is bound; the player's tap is an order
// (`orderEidolon`, through `orders.ts`), applied at the start of the next tick and kept in the fight's log, so a fight still replays from its
// seed, its placing and its orders. Once a fight. Nothing here draws from the fight's streams (`b.rng`, `b.skillRng`): the strike and the
// riders are fixed shares, so every fight without a call plays out exactly as before. Auto never calls it: no bot, auto-replay or balance
// tool touches it unless told to (`tools/balance.ts --eidolon <wave>`).
//
// Pure rules: no Pixi, no DOM, no randomness.

import type { Battle, BattleEvent, Unit } from './battle';
import { isBoss } from './foes';
import { ELITE_FOES } from './eliteFoes';
import { UNITS } from './units';
import { CHARGE_MAX, ultimateOf } from './abilities';
import { heroKitOf } from './heroKits';
import { chillFor, cleanse, freezeFor, stunFor } from './ailments';
import { MANA_MAX } from './spells';

/** An Eidolon's element (the names the page's effects use: `fxRules.ts` `Element`). */
export type EidolonElement = 'fire' | 'ice' | 'light' | 'lightning' | 'earth' | 'dark';

export interface Eidolon {
  id: string;
  name: string;
  title: string;
  element: EidolonElement;
  /** Its attack's name, stamped in the cinematic. */
  attack: string;
  /** The attack's beats, in words (the cinematic plays one after another). */
  beats: readonly string[];
  /** Its rider in one line, for the picker and the cards. */
  rider: string;
  /** The line it says the first time it answers, and the ones it says after (in turn), as it arrives. */
  line: string;
  lines: readonly string[];
}

/** The six, easiest to win first (the owner's picks). */
export const EIDOLONS: readonly Eidolon[] = [
  {
    id: 'askel',
    name: 'Askel',
    title: 'the Cinderhound',
    element: 'fire',
    attack: 'The Burning Run',
    beats: ['A howl', 'A ring of fire run round the field', 'The ring erupts inward', 'Embers rain'],
    rider: "The foes' half of the field burns for 6s; your heroes are warmed, +15% attack for 10s",
    line: 'Little keep. You blew, and I ran. Point me at them.',
    lines: ['Point. I run. They burn.', 'The horn again? Good. I was getting cold.', 'Stay behind me, little ones.'],
  },
  {
    id: 'nivra',
    name: 'Nivra',
    title: 'the Rime Wyrm',
    element: 'ice',
    attack: 'Frozen Deep',
    beats: ['Frost cracks the ground', 'She bursts up mid-field', 'A ring of frost breath', 'The ice shatters'],
    rider: 'Every foe left is frozen for 5s; a boss is slowed by half for 6s',
    line: 'The deep remembers your horn. So do I.',
    lines: ['Hold your breath. I hold mine for centuries.', 'Everything ends. Today, it ends cold.', 'The ice is listening. So am I.'],
  },
  {
    id: 'aurelan',
    name: 'Aurelan',
    title: 'the Lion of Dawn',
    element: 'light',
    attack: 'Dawnbreak Roar',
    beats: ['A pillar of sunlight', 'He leaps down', 'A crescent of light rolls across', 'Sunrise'],
    rider: 'The fallen rise at 60%; every hero is healed, cleansed and shielded for 3s',
    line: 'Night is long. It always ends.',
    lines: ['Look up. The sun is late, but it comes.', 'Stand in my light, and do not fall.', 'Every night I have outlasted. This one too.'],
  },
  {
    id: 'voltara',
    name: 'Voltara',
    title: 'the Copper Goddess',
    element: 'lightning',
    attack: 'Overload',
    beats: ['Her coils spin up', 'A lattice of lightning', 'One colossal bolt', 'Static'],
    rider: "Every hero's ultimate gains half its fill (skill charge below level 30); +5 mana",
    line: 'Wound, sprung and ready. Shall we?',
    lines: ['Tick. Tock. Strike.', 'Charged, calibrated, and very cross.', 'Stand clear of the coils, darlings.'],
  },
  {
    id: 'gorm',
    name: 'Gorm',
    title: 'the Quarry Titan',
    element: 'earth',
    attack: 'Landslide',
    beats: ['He builds himself from stone', 'The hammer slams', 'Pillars burst up', 'Rubble rains'],
    rider: 'Your heroes take half damage for 10s; a boss is stunned for 2s',
    line: 'I was the hill under your walls. I am still.',
    lines: ['You stand on me. You always have.', 'Slow to wake. Hard to stop.', 'Mind your feet. The hill is moving.'],
  },
  {
    id: 'vaelkhar',
    name: 'Vaelkhar',
    title: 'the Dragon King',
    element: 'dark',
    attack: 'Crown of Night',
    beats: ['The sun goes dark', 'He descends', 'A torrent of black fire', 'The void collapses'],
    rider: 'Bosses and elites lose their shields and boons; your heroes drain 25% of the damage they deal for 10s',
    line: 'Kneel, little king. Then stand, and watch.',
    lines: ['The sun bows. So will they.', 'You call a king to swat flies? Very well.', 'Darkness is only a crown I wear.'],
  },
];

export const EIDOLON_IDS: readonly string[] = EIDOLONS.map((e) => e.id);
export const eidolonById = (id: string | undefined): Eidolon | undefined => EIDOLONS.find((e) => e.id === id);
/** "Askel, the Cinderhound". */
export const eidolonFullName = (e: Eidolon): string => `${e.name}, ${e.title}`;

/** The strike's shares of full health (the owner's numbers), and the riders' numbers. */
export const STRIKE = {
  /** An ordinary foe: all of it (it falls). */
  FIELD: 1,
  /** An elite (the tower's and Calamity's named elites) or a mid-boss. */
  ELITE: 0.65,
  /** A last boss (an army's, the daily's boss of the day, a Last Stand boss wave's, a quest battle's). */
  BOSS: 0.45,
  /** A Calamity guardian. */
  GUARDIAN: 0.4,
  /** A great being in its own trial (they are of a kind). */
  BEING: 0.25,
};
export const RIDER = {
  /** Askel: how long the foes' half burns, each tile's burn a second as a share of the strongest hero's attack, and the warmth. */
  BURN_MS: 6000,
  BURN_SHARE: 0.2,
  WARM_MULT: 1.15,
  WARM_MS: 10000,
  /** Nivra: the freeze, and a boss's slow instead. */
  FREEZE_MS: 5000,
  BOSS_SLOW_MS: 6000,
  /** Aurelan: the fallen rise at this share; the shield's share and time; the Last Stand's ruler is healed this share. */
  RISE: 0.6,
  SHIELD: 0.3,
  SHIELD_MS: 3000,
  KING_HEAL: 0.3,
  /** Voltara: the meters' share and the king's mana. */
  CHARGE: 0.5,
  MANA: 5,
  /** Gorm: stone skin's time, and the boss's stun. */
  SKIN_MS: 10000,
  BOSS_STUN_MS: 2000,
  /** Vaelkhar: the drain's share and time. */
  DRAIN: 0.25,
  DRAIN_MS: 10000,
};

/** How a struck foe is counted. */
export type Struck = 'field' | 'elite' | 'boss' | 'guardian' | 'being';
export const SHARE: Record<Struck, number> = { field: STRIKE.FIELD, elite: STRIKE.ELITE, boss: STRIKE.BOSS, guardian: STRIKE.GUARDIAN, being: STRIKE.BEING };

/** What a fight carries for the Eidolons: the one that may answer, what its boss is (the page knows the wave), and the call once made. */
export interface EidolonFight {
  /** The Eidolon chosen to answer (one, the player's choice at the camp). */
  id: string;
  /** The wave's boss is a mid-boss (65%) rather than a last boss (45%); unset is a last boss. */
  mid?: boolean;
  /** A trial against a great being: its bosses take only 25%. */
  trial?: boolean;
  /** The call, once made (the battle time it struck). */
  called?: number;
  /** Riders running on: the warmth's end (Askel), the drain's end and each hero's damage seen so far (Vaelkhar). */
  warmUntil?: number;
  drainUntil?: number;
  dealt?: Record<number, number>;
}

/** A pseudo-fighter for the strike's events (`by: 0`, as the king's spells are). Never in `b.units`. */
const EIDOLON_BY = 0;

/** Put the Eidolon chosen on a fight (the page does, when the horn is full and one is bound), before or during it. False when there is no
 *  such Eidolon or the fight has already had one. `mid` and `trial` say how its boss is counted. */
export function armEidolon(b: Battle, id: string, opts: { mid?: boolean; trial?: boolean } = {}): boolean {
  if (!eidolonById(id) || b.eidolon?.called !== undefined) return false;
  b.eidolon = { id, ...(opts.mid ? { mid: true } : {}), ...(opts.trial ? { trial: true } : {}) };
  return true;
}

/** Whether the Eidolon could be called now: the fight is on, one is armed, none has been called this fight and none is waiting. */
export function canCallEidolon(b: Battle): boolean {
  return b.phase === 'fight' && !!b.eidolon && b.eidolon.called === undefined && !b.orders?.some((o) => o.kind === 'eidolon');
}

/** How a foe is struck: a great being in its own trial, a Calamity guardian, a boss (a mid-boss counts as an elite), an elite, or ordinary. */
export function struckAs(b: Battle, u: Unit): Struck {
  const boss = isBoss(u.def);
  if (boss && b.eidolon?.trial) return 'being';
  if (u.def.startsWith('calBoss')) return 'guardian';
  if (boss) return b.eidolon?.mid ? 'elite' : 'boss';
  if (ELITE_FOES[u.def]) return 'elite';
  return 'field';
}

/** Resolve the call (from `applyOrders`, at the start of a tick): the strike, then the rider. Returns false (nothing changes) when it
 *  cannot be called. */
export function strikeEidolon(b: Battle, out: BattleEvent[]): boolean {
  const e = b.eidolon && eidolonById(b.eidolon.id);
  if (!e || b.phase !== 'fight' || b.eidolon!.called !== undefined) return false;
  b.eidolon!.called = b.t;
  out.push({ kind: 'eidolon', id: e.id, phase: 'call' });
  // (the foes on the board now, in a fixed order; those still to come (a queue, a wave's later spawns) are not touched)
  const foes = b.units.filter((x) => x.alive && x.side === 'foe').sort((x, y) => x.id - y.id);
  for (const f of foes) {
    const as = struckAs(b, f);
    rend(b, f, Math.max(1, Math.round(f.maxHp * SHARE[as])), out);
  }
  rider(b, e, foes, out);
  out.push({ kind: 'eidolon', id: e.id, phase: 'done' });
  return true;
}

/** A set share, not a blow: it cannot be dodged or blocked, and ignores shields, guards and defence. A foe that falls to it falls (no
 *  kit spares it, no one is credited with the kill). */
function rend(b: Battle, to: Unit, dmg: number, out: BattleEvent[]): void {
  if (!to.alive) return;
  to.hp = Math.max(0, to.hp - dmg);
  to.hurtAt = b.t;
  const killed = to.hp <= 0;
  if (killed) {
    to.alive = false;
    to.diedAt = b.t;
    to.step = undefined;
    to.swing = undefined;
    to.under = undefined;
  }
  out.push({ kind: 'hit', by: EIDOLON_BY, to: to.id, dmg, heavy: true, splash: false, killed, src: 'skill', eidolon: true });
}

/** The heroes the riders help: placed heroes and their summons alike, never the Last Stand's ruler (he has his own line). */
const heroesOf = (b: Battle, alive = true) => b.units.filter((x) => x.side === 'hero' && x.alive === alive && x.id !== b.stand?.king && x.def !== 'decoy');

function rider(b: Battle, e: Eidolon, struck: readonly Unit[], out: BattleEvent[]): void {
  const left = struck.filter((f) => f.alive);
  const st = b.eidolon!;
  switch (e.element) {
    case 'fire': {
      // the foes' half of the board burns (3x3 zones laid edge to edge over it), and the heroes are warmed
      const strongest = Math.max(10, ...heroesOf(b).map((h) => UNITS[h.def].atk * (h.power ?? 1)));
      const dmg = Math.max(6, Math.round(strongest * RIDER.BURN_SHARE));
      const by = heroesOf(b)[0] ?? b.units.find((x) => x.side === 'hero');
      if (by) {
        const half = Math.ceil(b.board.d / 2);
        for (let v = 1; v < half + 1; v += 3)
          for (let u = 1; u < b.board.w + 1; u += 3) {
            b.zones.push({ u, v, side: 'hero', by: by.id, until: b.t + RIDER.BURN_MS, next: b.t + 1000, dmg });
            out.push({ kind: 'zone', u, v, ms: RIDER.BURN_MS });
          }
      }
      for (const h of heroesOf(b)) h.power = (h.power ?? 1) * RIDER.WARM_MULT;
      st.warmUntil = b.t + RIDER.WARM_MS;
      for (const h of heroesOf(b)) out.push({ kind: 'mark', to: h.id, by: EIDOLON_BY, what: 'eidolonWarm', ms: RIDER.WARM_MS });
      break;
    }
    case 'ice':
      for (const f of left) {
        if (isBoss(f.def)) chillFor(b, f, RIDER.BOSS_SLOW_MS);
        else freezeFor(b, f, RIDER.FREEZE_MS, true);
      }
      break;
    case 'light': {
      for (const h of heroesOf(b, false)) {
        if (UNITS[h.def].summon || h.owner !== undefined) continue;
        h.alive = true;
        h.hp = Math.max(1, Math.round(h.maxHp * RIDER.RISE));
        h.diedAt = undefined;
        h.busyUntil = b.t + 500;
        cleanse(b, h);
        out.push({ kind: 'revive', by: EIDOLON_BY, to: h.id, hp: h.hp });
      }
      for (const h of heroesOf(b)) {
        const amount = h.maxHp - h.hp;
        h.hp = h.maxHp;
        cleanse(b, h);
        h.shield = { hp: Math.round(h.maxHp * RIDER.SHIELD), until: b.t + RIDER.SHIELD_MS };
        out.push({ kind: 'heal', to: h.id, amount, by: EIDOLON_BY });
      }
      const king = b.stand && b.units.find((x) => x.id === b.stand!.king && x.alive);
      if (king) {
        const amount = Math.min(king.maxHp - king.hp, Math.round(king.maxHp * RIDER.KING_HEAL));
        king.hp += amount;
        out.push({ kind: 'heal', to: king.id, amount, by: EIDOLON_BY });
      }
      break;
    }
    case 'lightning':
      for (const h of heroesOf(b)) {
        if (!heroKitOf(h)) continue;
        if (ultimateOf(h)) h.charge2 = Math.min(CHARGE_MAX, (h.charge2 ?? 0) + CHARGE_MAX * RIDER.CHARGE);
        else h.charge = Math.min(CHARGE_MAX, h.charge + CHARGE_MAX * RIDER.CHARGE);
      }
      b.spells.mana = Math.min(MANA_MAX, b.spells.mana + RIDER.MANA);
      break;
    case 'earth':
      for (const h of heroesOf(b)) {
        h.guardUntil = Math.max(h.guardUntil ?? 0, b.t + RIDER.SKIN_MS);
        out.push({ kind: 'mark', to: h.id, by: EIDOLON_BY, what: 'eidolonSkin', ms: RIDER.SKIN_MS });
      }
      for (const f of left) if (isBoss(f.def)) stunFor(b, f, RIDER.BOSS_STUN_MS);
      break;
    case 'dark':
      for (const f of left) {
        if (struckAs(b, f) === 'field') continue;
        f.shield = undefined;
        f.guardUntil = undefined;
        f.hasteUntil = undefined;
        f.auraGuard = undefined;
        f.wardUntil = undefined;
      }
      st.drainUntil = b.t + RIDER.DRAIN_MS;
      st.dealt = Object.fromEntries(heroesOf(b).map((h) => [h.id, h.dealt ?? 0]));
      for (const h of heroesOf(b)) out.push({ kind: 'mark', to: h.id, by: EIDOLON_BY, what: 'eidolonDrain', ms: RIDER.DRAIN_MS });
      break;
  }
}

/** Every tick after a call (from `stepBattle`): the warmth wears off; the drain heals each hero a share of what it dealt since the last tick. */
export function tickEidolon(b: Battle, out: BattleEvent[]): void {
  const st = b.eidolon;
  if (!st || st.called === undefined) return;
  if (st.warmUntil !== undefined && b.t >= st.warmUntil) {
    for (const h of b.units) if (h.side === 'hero' && h.id !== b.stand?.king && h.def !== 'decoy') h.power = (h.power ?? 1) / RIDER.WARM_MULT;
    st.warmUntil = undefined;
  }
  if (st.drainUntil !== undefined) {
    const seen = (st.dealt ??= {});
    for (const h of b.units) {
      if (h.side !== 'hero' || h.id === b.stand?.king) continue;
      const now = h.dealt ?? 0;
      const gain = now - (seen[h.id] ?? now);
      seen[h.id] = now;
      if (gain > 0 && h.alive && h.hp < h.maxHp) {
        const amount = Math.min(h.maxHp - h.hp, Math.max(1, Math.round(gain * RIDER.DRAIN)));
        h.hp += amount;
        out.push({ kind: 'heal', to: h.id, amount, by: EIDOLON_BY });
      }
    }
    if (b.t >= st.drainUntil) {
      st.drainUntil = undefined;
      st.dealt = undefined;
    }
  }
}
