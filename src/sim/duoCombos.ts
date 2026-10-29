// Duo-Combos and Harmonic Resonance (docs/notes/duo-combos.md):
// Complementary pairs of heroes fielded together trigger a synergy
// when both cast their ultimates in close succession (`DUO_WINDOW_MS`).
//
// Pure simulation rules: strictly deterministic (no Math.random(), Date.now(), or DOM access).

import { atkOf, hurt, type Battle, type BattleEvent, type Unit } from './battle';
import { apart, foesOf, gain, mendUnit, net, slowFor } from './abilities';
import { cleanse, stunFor } from './ailments';

const alliesOf = (b: Battle, me: Unit): Unit[] => b.units.filter((a) => a.alive && a.side === me.side);

/**
 * How close together (ms) the two partners' ultimates must land for their duo to fire: the second ultimate within this of the first sets it off.
 * Ultimates come about once a long fight, so a duo is a rare, earned moment, not a rider on every ultimate (the retune for the parity band).
 */
export const DUO_WINDOW_MS = 3000;
/** Closer still (ms), the duo fires as a Harmonic Resonance, its stronger form (the owner's first pitch: both ultimates within a second and a half). */
export const HARMONIC_MS = 1500;

export interface DuoCombo {
  id: string;
  name: string;
  heroes: readonly [string, string];
  title: string;
  banner: string;
  text: string;
  execute: (b: Battle, caster: Unit, partner: Unit, harmonic: boolean, out: BattleEvent[]) => void;
}

export interface DuoState {
  /** The combo's id in `DUO_COMBOS` (an id, not the combo itself, so the battle stays plain data a heart can copy and a save can keep). */
  id: string;
  heroAId: number;
  heroBId: number;
  heroAKind: string;
  heroBKind: string;
  lastUltA?: number;
  lastUltB?: number;
  harmonicCount: number;
  triggerCount: number;
}

export const DUO_COMBOS: readonly DuoCombo[] = [
  {
    id: 'knight_peasant',
    name: 'Squire & Sovereign',
    heroes: ['knight', 'peasant'],
    title: 'Vassal Shield & Rally',
    banner: 'Knight & Peasant Duo: Vassal Shield & Rally!',
    text: 'When both cast their ultimates together, Peasant gains a squire shield and guard while Knight receives rally and mends wounds.',
    execute: (b, caster, partner, harmonic, out) => {
      const peasant = caster.def === 'peasant' ? caster : partner;
      const knight = caster.def === 'knight' ? caster : partner;

      // Peasant gets Squire Shield and Guard
      const shieldRatio = harmonic ? 0.6 : 0.35;
      const shieldHp = Math.round(peasant.maxHp * shieldRatio);
      peasant.shield = { hp: shieldHp, until: b.t + (harmonic ? 8000 : 6000) };
      peasant.guardUntil = Math.max(peasant.guardUntil ?? 0, b.t + (harmonic ? 8000 : 6000));
      out.push({ kind: 'heal', to: peasant.id, amount: 0, by: knight.id });

      // Knight gets Rally (attack bonus) and mending
      const bannerDur = harmonic ? 10000 : 8000;
      knight.rallyUntil = Math.max(knight.rallyUntil ?? 0, b.t + bannerDur);
      if (knight.banner === undefined) knight.power = (knight.power ?? 1) * 1.25;
      knight.banner = { until: b.t + bannerDur };
      out.push({ kind: 'banner', by: knight.id, ms: bannerDur });
      mendUnit(knight, knight.maxHp * (harmonic ? 0.35 : 0.2), out, knight);

      if (harmonic) {
        // Additional harmonic shock: push back nearby foes
        const foes = foesOf(b, knight).filter((f) => apart(knight, f) <= 2);
        for (const f of foes) {
          hurt(b, knight, f, net(atkOf(knight) * 1.2, f), true, false, out, 'skill');
          stunFor(b, f, 800);
        }
      }
    },
  },
  {
    id: 'samurai_kunoichi',
    name: 'Shadow & Steel',
    heroes: ['samurai', 'kunoichi'],
    title: 'Twin Shadow Flurry',
    banner: 'Samurai & Kunoichi Duo: Twin Shadows!',
    text: 'When both cast their ultimates together, both gain haste. Samurai blades inflict bleeding while Kunoichi gains shadow shroud.',
    execute: (b, caster, partner, harmonic, out) => {
      const samurai = caster.def === 'samurai' ? caster : partner;
      const kunoichi = caster.def === 'kunoichi' ? caster : partner;

      const hasteDur = harmonic ? 8000 : 5000;
      samurai.hasteUntil = Math.max(samurai.hasteUntil ?? 0, b.t + hasteDur);
      kunoichi.hasteUntil = Math.max(kunoichi.hasteUntil ?? 0, b.t + hasteDur);
      out.push({ kind: 'haste', to: samurai.id, ms: hasteDur });
      out.push({ kind: 'haste', to: kunoichi.id, ms: hasteDur });

      // Samurai's strikes bleed
      samurai.kx ??= {};
      samurai.kx.bleedHits = (samurai.kx.bleedHits ?? 0) + (harmonic ? 6 : 4);

      // Kunoichi shadow shroud (+30% crit, +25% dodge)
      kunoichi.kx ??= {};
      kunoichi.kx.shadowShroudUntil = b.t + (harmonic ? 8000 : 6000);

      // Blade flurry on nearby foes
      const nearFoes = foesOf(b, caster).filter((f) => apart(caster, f) <= (harmonic ? 4 : 3));
      for (const f of nearFoes) {
        hurt(b, caster, f, net(atkOf(caster) * (harmonic ? 1.5 : 1.0), f), false, false, out, 'skill');
      }
    },
  },
  {
    id: 'archer_lightningMage',
    name: 'Stormshot',
    heroes: ['archer', 'lightningMage'],
    title: 'Electrified Arrows',
    banner: 'Archer & Mage Duo: Electrified Arrows!',
    text: 'Archer arrows become electrified, arcing lightning to adjacent foes. Lightning Mage gains bonus height reach and skill charge.',
    execute: (b, caster, partner, harmonic, out) => {
      const archer = caster.def === 'archer' ? caster : partner;
      const mage = caster.def === 'lightningMage' ? caster : partner;

      const dur = harmonic ? 12000 : 8000;
      archer.electrifiedUntil = Math.max(archer.electrifiedUntil ?? 0, b.t + dur);
      out.push({ kind: 'spellfx', id: 'chain', to: archer.id });

      // Mage gains temporary extra reach and skill charge
      mage.kx ??= {};
      mage.kx.tempReach = (mage.kx.tempReach ?? 0) + 2;
      gain(mage, harmonic ? 40 : 25);

      // Lightning arcs strike toughest foes
      const targets = foesOf(b, mage)
        .sort((x, y) => y.hp - x.hp || x.id - y.id)
        .slice(0, harmonic ? 4 : 2);
      for (const t of targets) {
        out.push({ kind: 'arc', from: mage.id, to: t.id });
        hurt(b, mage, t, net(atkOf(mage) * (harmonic ? 1.8 : 1.3), t), false, false, out, 'skill');
        stunFor(b, t, 800);
      }
    },
  },
  {
    id: 'wizard_wanderer',
    name: 'Solar Eclipse',
    heroes: ['wizard', 'wanderer'],
    title: 'Astral Dawn',
    banner: 'Wizard & Wanderer Duo: Astral Dawn!',
    text: 'Wanderer cleanses and shields all allies with starlight. Wizard spells ignite the field with extended burning ground.',
    execute: (b, caster, partner, harmonic, out) => {
      const wanderer = caster.def === 'wanderer' ? caster : partner;
      const wizard = caster.def === 'wizard' ? caster : partner;

      // Cleanse and shield all allies
      const allies = alliesOf(b, wanderer);
      for (const a of allies) {
        cleanse(b, a);
        const shieldHp = Math.round(a.maxHp * (harmonic ? 0.3 : 0.18));
        a.shield = { hp: shieldHp, until: b.t + 5000 };
      }

      // Extend any active zones and burst foes
      for (const z of b.zones ?? []) {
        z.until += harmonic ? 4000 : 2500;
      }
      const foes = foesOf(b, wizard).slice(0, harmonic ? 5 : 3);
      for (const f of foes) {
        hurt(b, wizard, f, net(atkOf(wizard) * 1.2, f), false, false, out, 'skill');
      }
      if (harmonic) {
        gain(wizard, 30);
        gain(wanderer, 30);
      }
    },
  },
  {
    id: 'paladin_cleric',
    name: 'Sanctified Aegis',
    heroes: ['paladin', 'cleric'],
    title: 'Holy Sanctuary',
    banner: 'Paladin & Cleric Duo: Holy Sanctuary!',
    text: 'Heals and guards all nearby allies with sacred light while smiting nearby foes.',
    execute: (b, caster, partner, harmonic, out) => {
      const paladin = caster.def === 'paladin' ? caster : partner;
      const cleric = caster.def === 'cleric' ? caster : partner;

      const nearAllies = alliesOf(b, paladin).filter((a: Unit) => apart(paladin, a) <= 4);
      for (const a of nearAllies) {
        mendUnit(a, a.maxHp * (harmonic ? 0.3 : 0.18), out, cleric);
        cleanse(b, a);
        a.guardUntil = Math.max(a.guardUntil ?? 0, b.t + (harmonic ? 6000 : 4000));
      }

      const nearFoes = foesOf(b, paladin).filter((f) => apart(paladin, f) <= 3);
      for (const f of nearFoes) {
        hurt(b, paladin, f, net(atkOf(paladin) * (harmonic ? 1.6 : 1.1), f), false, false, out, 'skill');
      }
    },
  },
  {
    id: 'werewolf_barbarian',
    name: 'Blood Moon Pack',
    heroes: ['werewolf', 'barbarian'],
    title: 'Primal Bloodlust',
    banner: 'Werewolf & Barbarian Duo: Primal Bloodlust!',
    text: 'Both enter savage bloodlust with haste and lifesteal. A ferocious roar slows and frightens nearby foes.',
    execute: (b, caster, partner, harmonic, out) => {
      const dur = harmonic ? 9000 : 6000;
      caster.hasteUntil = Math.max(caster.hasteUntil ?? 0, b.t + dur);
      partner.hasteUntil = Math.max(partner.hasteUntil ?? 0, b.t + dur);
      out.push({ kind: 'haste', to: caster.id, ms: dur });
      out.push({ kind: 'haste', to: partner.id, ms: dur });

      caster.kx ??= {};
      partner.kx ??= {};
      caster.kx.lifestealUntil = b.t + dur;
      partner.kx.lifestealUntil = b.t + dur;

      const roarFoes = foesOf(b, caster).filter((f) => apart(caster, f) <= (harmonic ? 4 : 3));
      for (const f of roarFoes) {
        slowFor(b, f, harmonic ? 5000 : 3500);
        if (harmonic) {
          stunFor(b, f, 1000);
        }
      }
    },
  },
  {
    id: 'rifleBot_siegeBot',
    name: 'Iron Artillery',
    heroes: ['rifleBot', 'siegeBot'],
    title: 'Synchronized Salvo',
    banner: 'Machine Duo: Synchronized Salvo!',
    text: 'Both gain overclocked attack speed and explosive splash rounds for a barrage of artillery fire.',
    execute: (b, caster, partner, harmonic, out) => {
      const dur = harmonic ? 8000 : 6000;
      caster.hasteUntil = Math.max(caster.hasteUntil ?? 0, b.t + dur);
      partner.hasteUntil = Math.max(partner.hasteUntil ?? 0, b.t + dur);
      out.push({ kind: 'haste', to: caster.id, ms: dur });
      out.push({ kind: 'haste', to: partner.id, ms: dur });

      caster.kx ??= {};
      partner.kx ??= {};
      caster.kx.splashShots = (caster.kx.splashShots ?? 0) + (harmonic ? 6 : 3);
      partner.kx.splashShots = (partner.kx.splashShots ?? 0) + (harmonic ? 6 : 3);

      // Extra artillery shell landing on thickest enemy
      const foes = foesOf(b, caster);
      if (foes.length) {
        const prime = foes[0];
        b.pending.push({
          at: b.t + 400,
          kind: 'meteor',
          by: partner.id,
          to: prime.id,
          dmg: atkOf(partner) * (harmonic ? 2.2 : 1.5),
          heavy: true,
          u: prime.u,
          v: prime.v,
        });
        out.push({ kind: 'area', by: partner.id, id: 'meteor', u: prime.u, v: prime.v, ms: 400 });
      }
    },
  },
  {
    id: 'kitsune_karasu',
    name: 'Spirit Mirage',
    heroes: ['kitsune', 'karasu'],
    title: 'Night Tengu Phantasm',
    banner: 'Yokai Duo: Spirit Mirage!',
    text: 'Both gain stealth and evasive phantasm dodging, while leaving spirit wisps on nearby tiles.',
    execute: (b, caster, partner, harmonic, out) => {
      const stealthDur = harmonic ? 4000 : 2500;
      caster.hideUntil = Math.max(caster.hideUntil ?? 0, b.t + stealthDur);
      partner.hideUntil = Math.max(partner.hideUntil ?? 0, b.t + stealthDur);

      caster.kx ??= {};
      partner.kx ??= {};
      caster.kx.bonusDodgeUntil = b.t + (harmonic ? 8000 : 5000);
      partner.kx.bonusDodgeUntil = b.t + (harmonic ? 8000 : 5000);

      // Spawn spirit wisps on adjacent tiles
      const spots = [
        { u: caster.u + 1, v: caster.v },
        { u: caster.u - 1, v: caster.v },
        { u: caster.u, v: caster.v + 1 },
        { u: caster.u, v: caster.v - 1 },
      ].slice(0, harmonic ? 3 : 2);

      for (const sp of spots) {
        b.traps ??= [];
        b.traps.push({
          u: sp.u,
          v: sp.v,
          side: caster.side,
          by: caster.id,
          until: b.t + 12000,
          dmg: Math.max(12, Math.round(atkOf(caster) * 1.5)),
          hold: 800,
          wisp: true,
        });
        out.push({ kind: 'wisp', by: caster.id, u: sp.u, v: sp.v, ms: 12000 });
      }
    },
  },
];

/** A combo by its id. */
export const comboById = (id: string): DuoCombo | undefined => DUO_COMBOS.find((c) => c.id === id);

/** Check placed hero kinds and find all complementary Duo-Combos. */
export function duoCombosOf(kinds: Iterable<string>): DuoCombo[] {
  const set = new Set(kinds);
  return DUO_COMBOS.filter((c) => set.has(c.heroes[0]) && set.has(c.heroes[1]));
}

/** Initialize duo combo tracking at the start of a fight. */
export function startDuoCombos(b: Battle): void {
  const heroes = b.units.filter((u) => u.side === 'hero' && !u.owner);
  const states: DuoState[] = [];

  for (const combo of DUO_COMBOS) {
    const unitA = heroes.find((u) => u.def === combo.heroes[0]);
    const unitB = heroes.find((u) => u.def === combo.heroes[1]);
    if (unitA && unitB) {
      states.push({
        id: combo.id,
        heroAId: unitA.id,
        heroBId: unitB.id,
        heroAKind: unitA.def,
        heroBKind: unitB.def,
        harmonicCount: 0,
        triggerCount: 0,
      });
    }
  }

  b.duoCombos = states;
}

/** Called when a hero casts its ultimate: notes the time, and fires each duo whose partner's ultimate landed within `DUO_WINDOW_MS` (harmonic within `HARMONIC_MS`). */
export function triggerDuoComboOnUlt(b: Battle, caster: Unit, out: BattleEvent[]): boolean {
  if (!b.duoCombos || !b.duoCombos.length) return false;

  let triggered = false;
  for (const state of b.duoCombos) {
    if (caster.id !== state.heroAId && caster.id !== state.heroBId) continue;

    const partnerId = caster.id === state.heroAId ? state.heroBId : state.heroAId;
    const partner = b.units.find((u) => u.id === partnerId && u.alive);
    if (!partner) continue;

    // (the duo fires only on the second of the pair's ultimates, when the partner's landed within the window; each pair of ultimates fires it once)
    const isCasterA = caster.id === state.heroAId;
    const partnerLastUlt = isCasterA ? state.lastUltB : state.lastUltA;
    const gap = partnerLastUlt === undefined ? Infinity : b.t - partnerLastUlt;
    if (gap > DUO_WINDOW_MS) {
      if (isCasterA) state.lastUltA = b.t;
      else state.lastUltB = b.t;
      continue;
    }
    const harmonic = gap <= HARMONIC_MS;
    state.lastUltA = undefined;
    state.lastUltB = undefined;

    state.triggerCount++;
    if (harmonic) state.harmonicCount++;

    // Execute the synergy
    const def = comboById(state.id);
    if (!def) continue;
    def.execute(b, caster, partner, harmonic, out);

    // Emit duo combo event
    out.push({
      kind: 'duoCombo',
      id: def.id,
      name: def.name,
      heroA: state.heroAId,
      heroB: state.heroBId,
      title: harmonic ? `Harmonic: ${def.title}` : def.title,
      harmonic,
      banner: harmonic
        ? `Harmonic Resonance! ${def.name}: ${def.title}`
        : `Duo-Combo! ${def.name}: ${def.title}`,
    });

    triggered = true;
  }

  return triggered;
}
