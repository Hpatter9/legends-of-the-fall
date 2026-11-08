import { UNITS } from './units';
// Mythic abilities and battle-local memories; no random numbers or permanent stat changes.
import { atkOf, unitAt, type Battle, type BattleEvent, type Unit } from './battle';
import { apart, foesOf, mendUnit, slowFor, type Kit, type Skill } from './abilities';
import { ailBoss, cleanse, stunFor } from './ailments';
import { standable, tileAt } from './board';
import { alliesOf, foesNear, strike } from './kits/common';
import type { HeroKit, Slot } from './heroKits';

export interface MythicState {
  eclipse?: number;
  eclipsed?: boolean;
  totality?: number;
  stars?: number;
  mercy?: number;
  wounds?: number;
  sanctuary?: { u: number; v: number; until: number };
  denied?: boolean;
  grace?: number;
  gracePower?: number;
  memories?: { at: number; allies: { id: number; hp: number; u: number; v: number }[] }[];
  foretold?: { by: number; until: number; interrupted?: boolean };
}
const state = (me: Unit): MythicState => me.mythic ??= {};
const allies = (b: Battle, me: Unit) => alliesOf(b, me).filter(a => a.owner === undefined && !UNITS[a.def].summon);
const shield = (b: Battle, to: Unit, hp: number, ms = 6000): void => {
  to.shield = { hp: Math.max(to.shield && to.shield.until > b.t ? to.shield.hp : 0, Math.round(hp)), until: Math.max(to.shield?.until ?? 0, b.t + ms) };
};
const burst = (out: BattleEvent[], me: Unit, u = me.u, v = me.v): void => { out.push({ kind: 'area', by: me.id, id: 'meteor', u, v, ms: 600 }); };
function sk(name: string, text: string, _look: string, cast: Skill['cast'], castMs = 750): Skill { return { name, key: name, text, cast, castMs, anim: 'attack2', need: 100, dealt: 0, taken: 0, perSec: 0 }; }
function ward(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  for (const a of allies(b, me).filter(a => apart(a, me) <= 4)) shield(b, a, atkOf(me) * 2.4);
  burst(out, me); return true;
};
const attack = (reach: number, mult: number, hold = 0): Skill['cast'] => (b, me, out) => {
  const prey = foesNear(b, me, reach);
  if (!prey.length) return false;
  for (const f of prey) {
    strike(b, me, f, mult, out, true);
    if (f.alive && hold) { if (ailBoss(f)) slowFor(b, f, hold); else stunFor(b, f, hold); }
  }
  burst(out, me); return true;
};
export function mythicBlow(b: Battle, me: Unit, out: BattleEvent[]): void {
  if (me.owner !== undefined || me.side !== 'hero') return;
  const s = state(me);
  if (me.def === 'vael' && (s.totality ?? 0) <= b.t) {
    s.eclipse = (s.eclipse ?? 0) + 1;
    if (s.eclipse >= 6) { s.eclipse = 0; s.totality = b.t + 6000; s.eclipsed = true; ward(b, me, out); }
  }
  if (me.def === 'ilyra') s.mercy = Math.min(5, (s.mercy ?? 0) + 1);
}
export function mythicWound(to: Unit, damage: number): void {
  if (to.def === 'orrun' && to.side === 'hero' && to.owner === undefined) state(to).wounds = Math.min(to.maxHp, (state(to).wounds ?? 0) + damage);
}
export function mythicSpare(b: Battle, to: Unit): boolean {
  if (to.side !== 'hero' || UNITS[to.def].summon || to.owner !== undefined) return false;
  if (!b.units.some(a => a.alive && a.def === 'ilyra' && a.owner === undefined && a.side === to.side && (a.mythic?.grace ?? 0) > b.t)) return false;
  to.hp = 1; return true;
}
export function mythicDamage(b: Battle, by: Unit, to: Unit): number {
  let mult = 1;
  const mark = by.mythic?.foretold;
  if (mark && mark.until > b.t && (mark.interrupted || (by.stunUntil ?? 0) > b.t)) mult *= 0.6;
  if (to.side === 'hero' && b.units.some(a => a.def === 'orrun' && a.side === to.side && a.alive && a.owner === undefined && a.mythic?.sanctuary && a.mythic.sanctuary.until > b.t && apart(a.mythic.sanctuary, to) <= 3)) mult *= 0.75;
  return mult;
}
export function tickMythics(b: Battle, out: BattleEvent[]): void {
  for (const me of b.units) {
    const mark = me.mythic?.foretold;
    if (mark && mark.until > b.t && (me.stunUntil ?? 0) > b.t) mark.interrupted = true;
    if (!me.alive || me.side !== 'hero' || me.owner !== undefined) continue;
    if (me.def === 'vael') state(me).eclipsed = (state(me).totality ?? 0) > b.t;
    if (me.def === 'ilyra' && me.mythic?.grace !== undefined && me.mythic.grace <= b.t) {
      const s = state(me); s.grace = undefined;
      const charges = s.mercy ?? 0; s.mercy = 0;
      const power = s.gracePower ?? atkOf(me); s.gracePower = undefined;
      for (const a of allies(b, me)) mendUnit(a, a.maxHp * 0.3 + power * (1 + charges * 0.4), out, me);
    }
    if (me.def === 'nyxara' && b.t % 1000 === 0) {
      const s = state(me);
      (s.memories ??= []).push({ at: b.t, allies: allies(b, me).map(a => ({ id: a.id, hp: a.hp, u: a.u, v: a.v })) });
      s.memories = s.memories!.filter(m => m.at >= b.t - 5000);
    }
  }
}
export function rewriteFate(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const memory = state(me).memories?.find(m => m.at <= b.t - 3000);
  if (!memory) return false;
  let changed = false;
  for (const saved of memory.allies) {
    const a = b.units.find(a => a.id === saved.id && a.alive && a.side === me.side && !UNITS[a.def].summon && a.owner === undefined);
    if (!a) continue;
    if (saved.hp > a.hp) { mendUnit(a, saved.hp - a.hp, out, me); changed = true; }
    if ((a.u !== saved.u || a.v !== saved.v) && standable(tileAt(b.board, saved.u, saved.v)) && !unitAt(b, saved.u, saved.v)) {
      const from = { u: a.u, v: a.v }; a.u = saved.u; a.v = saved.v; a.step = undefined;
      out.push({ kind: 'blink', by: a.id, from, to: { u: a.u, v: a.v } }); changed = true;
    }
  }
  if (changed) burst(out, me); return changed;
}

// Hoisted for the same abilities/battle initialisation cycle as the existing kits.
var built: { kits: Record<string, Kit>; heroes: Record<string, HeroKit> } | undefined;
function build() {
  if (built) return built;
  const kits: Record<string, Kit> = {}, heroes: Record<string, HeroKit> = {};
  const add = (kind: string, pool: HeroKit['pool'], role: string, passive: Kit['passive'], skills: Skill[], ultimate: Skill, heal = false) => {
    const slots: Slot[] = skills.map((skill, i) => ({ skill, cls: i === 0 ? 'strike' : i === 1 ? 'utility' : 'heavy', cost: pool === 'mana' ? [32, 38, 46][i] : [22, 24, 32][i], tune: 1, cd: [6500, 14000, 14000][i], ...(heal && i === 1 ? { heals: true } : {}) }));
    // A trial is an aspect, not the recruit at the army boss's damage multiplier.
    // Temper its whole-board ultimate so a prepared squad can survive its warning.
    const trialUltimate: Skill = { ...ultimate, dealt: 10, taken: 12, perSec: 3, cast(b, me, out) {
      const power = me.power;
      me.power = (power ?? 1) * 0.35;
      try { return ultimate.cast(b, me, out); } finally { me.power = power; }
    } };
    kits[`trial_${kind}`] = { passive, skill: { ...skills[0], dealt: 10, taken: 12, perSec: 5 }, ultimate: trialUltimate };
    heroes[kind] = { pool, role: `Mythic · ${role} · one per squad`, slots, s1: slots[0], s2: slots[1], s3: slots[2] };
    kits[kind] = { passive, skill: skills[0], ultimate: { ...ultimate, unlock: 30, tuned: { rate: 1, power: 1 } } };
  };
  add('vael', 'stamina', 'eclipse commander', { name: 'Black Sun', text: 'Six successful basic blows create six seconds of totality: ignore 12 armour and shield nearby allies.' }, [
    sk('Eclipse Cleave', 'Cleave nearby foes; stronger during totality.', 'Cleave', (b, me, out) => attack(2, (state(me).totality ?? 0) > b.t ? 3.8 : 2.4)(b, me, out)),
    sk('Solar Aegis', 'Shield allies within four tiles for six seconds.', 'Holy Shield', ward),
    sk('Crownfall', 'Smash and interrupt nearby foes; advance the eclipse.', 'Earthquake', (b, me, out) => { if (!attack(4, 2.2, 1500)(b, me, out)) return false; state(me).eclipse = Math.min(5, (state(me).eclipse ?? 0) + 2); return true; }),
  ], sk('Kneel Before Night', 'Eight seconds of totality. Strike every foe, punish the wounded and shield allies. Bosses resist the interrupt.', 'Condemn', (b, me, out) => {
    const prey = foesOf(b, me); if (!prey.length) return false;
    state(me).totality = b.t + 8000; state(me).eclipsed = true; state(me).eclipse = 0;
    for (const f of prey) { strike(b, me, f, f.hp < f.maxHp * 0.3 ? 6 : 4, out, true); if (f.alive) stunFor(b, f, ailBoss(f) ? 600 : 2200); }
    return ward(b, me, out);
  }, 1500));
  add('astrax', 'mana', 'starfire dragon', { name: 'Stellar Core', text: 'Devoured shields and comet strikes store up to three stars for the next Starbreath.' }, [
    sk('Starbreath', 'Burn a cluster of foes; spend stored stars for greater damage.', 'Dragon Breath', (b, me, out) => {
      const f = foesNear(b, me, 6).sort((a, z) => apart(me, a) - apart(me, z) || a.id - z.id)[0]; if (!f) return false;
      const mult = 2.5 + Math.min(3, state(me).stars ?? 0) * 0.7; state(me).stars = 0;
      for (const t of foesOf(b, me).filter(t => apart(t, f) <= 2)) strike(b, me, t, mult, out, true);
      burst(out, me, f.u, f.v); return true;
    }),
    sk('Star Hunger', 'Consume active enemy shields within seven tiles and store their energy.', 'Soul Siphon', (b, me, out) => {
      const prey = foesNear(b, me, 7).filter(f => f.shield && f.shield.until > b.t && f.shield.hp > 0); if (!prey.length) return false;
      for (const f of prey) { f.shield = undefined; strike(b, me, f, 1.2, out); }
      state(me).stars = Math.min(3, (state(me).stars ?? 0) + prey.length); burst(out, me); return true;
    }),
    sk('Comet Lance', 'Strike the toughest nearby foe, slow it and store a star.', 'Meteor', (b, me, out) => {
      const f = foesNear(b, me, 7).sort((a, z) => z.hp - a.hp || a.id - z.id)[0]; if (!f) return false;
      strike(b, me, f, 4, out, true); if (f.alive) slowFor(b, f, 3500);
      state(me).stars = Math.min(3, (state(me).stars ?? 0) + 1); burst(out, me, f.u, f.v); return true;
    }),
  ], sk('Heavenfall', 'Scorch every foe and leave three burning constellations for six seconds.', 'Starfall', (b, me, out) => {
    const prey = foesOf(b, me); if (!prey.length) return false;
    for (const f of prey) strike(b, me, f, 4.2, out, true);
    for (const f of prey.slice(0, 3)) { b.zones.push({ u: f.u, v: f.v, side: me.side, by: me.id, until: b.t + 6000, next: b.t + 1000, dmg: Math.round(atkOf(me) * 0.45) }); burst(out, me, f.u, f.v); }
    return true;
  }, 2000));
  add('ilyra', 'stamina', 'warrior healer', { name: 'Mercy Through War', text: 'Successful blows and spear skills build five mercy charges, strengthening healing.' }, [
    sk('Saint’s Spear', 'Pierce a nearby foe and earn mercy.', 'Smite', (b, me, out) => {
      const f = foesNear(b, me, 3)[0]; if (!f) return false; strike(b, me, f, 2.4, out, true); state(me).mercy = Math.min(5, (state(me).mercy ?? 0) + 1); return true;
    }),
    sk('Unburied Mercy', 'Spend mercy to heal and cleanse injured allies within five tiles.', 'Mass Heal', (b, me, out) => {
      const hurt = allies(b, me).filter(a => a.hp < a.maxHp && apart(a, me) <= 5); if (!hurt.length) return false;
      const charges = state(me).mercy ?? 0; state(me).mercy = 0;
      for (const a of hurt) { mendUnit(a, atkOf(me) * (1.8 + charges * 0.5), out, me); cleanse(b, a); } return true;
    }),
    sk('Broken Halo', 'Strike nearby foes, gain two mercy charges and shield nearby allies.', 'Holy Nova', (b, me, out) => {
      if (!attack(4, 2)(b, me, out)) return false; state(me).mercy = Math.min(5, (state(me).mercy ?? 0) + 2);
      for (const a of allies(b, me).filter(a => apart(a, me) <= 3)) shield(b, a, atkOf(me) * 1.8); return true;
    }),
  ], sk('Death Denied', 'Once per battle, when an ally is hurt: allies cannot fall for five seconds, then receive a healing surge. Does not revive the fallen.', 'Guardian Angel', (b, me, out) => {
    if (state(me).denied || !allies(b, me).some(a => a.hp < a.maxHp * 0.65)) return false;
    state(me).denied = true; state(me).grace = b.t + 5000; state(me).gracePower = atkOf(me); burst(out, me); return true;
  }, 1000), true);
  add('orrun', 'stamina', 'sanctuary guardian', { name: 'Emerald Heart', text: 'Store health damage taken, up to maximum health, to strengthen protective skills.' }, [
    sk('Rootquake', 'Damage and slow nearby foes.', 'Earthquake', (b, me, out) => {
      const prey = foesNear(b, me, 3); if (!prey.length) return false;
      for (const f of prey) { strike(b, me, f, 1.8, out, true); if (f.alive) slowFor(b, f, 2500); } burst(out, me); return true;
    }),
    sk('Living Sanctuary', 'Plant a sanctuary for seven seconds. Allies within three tiles take 25% less damage and gain shields.', 'Treeform', (b, me, out) => {
      state(me).sanctuary = { u: me.u, v: me.v, until: b.t + 7000 };
      for (const a of allies(b, me).filter(a => apart(a, me) <= 3)) shield(b, a, atkOf(me) * 2); burst(out, me); return true;
    }),
    sk('Heartwood', 'Spend stored wounds to shield allies within four tiles.', 'Barkskin', (b, me, out) => {
      const wounds = state(me).wounds ?? 0; if (wounds <= 0) return false; state(me).wounds = 0;
      for (const a of allies(b, me).filter(a => apart(a, me) <= 4)) shield(b, a, Math.min(me.maxHp * 0.25, wounds * 0.5) + atkOf(me)); burst(out, me); return true;
    }),
  ], sk('The World Stands', 'Ten seconds of sanctuary, shields for the whole squad and binding roots. Bosses are slowed instead.', 'World Tree', (b, me, out) => {
    state(me).sanctuary = { u: me.u, v: me.v, until: b.t + 10000 }; const wounds = state(me).wounds ?? 0; state(me).wounds = 0;
    for (const a of allies(b, me)) shield(b, a, atkOf(me) * 3 + Math.min(me.maxHp * 0.4, wounds * 0.6), 10000);
    attack(5, 2.5, 2500)(b, me, out); burst(out, me); return true;
  }, 1500));
  add('nyxara', 'mana', 'fate tactician', { name: 'Unwritten Futures', text: 'Remember living allies’ health and positions over five seconds. Spent resources remain spent.' }, [
    sk('Fate Shard', 'Hurl an abandoned future at a foe.', 'Eldritch Blast', (b, me, out) => { const f = foesNear(b, me, 6)[0]; if (!f) return false; strike(b, me, f, 2, out); return true; }),
    sk('Stolen Tomorrow', 'Reveal the strongest nearby foe. Interrupting it weakens its damage by 40% for the mark’s remaining six seconds.', 'Condemn', (b, me, out) => {
      const f = foesNear(b, me, 7).sort((a, z) => atkOf(z) - atkOf(a) || a.id - z.id).find(f => (f.mythic?.foretold?.until ?? 0) <= b.t); if (!f) return false;
      state(f).foretold = { by: me.id, until: b.t + 6000 }; out.push({ kind: 'gaze', by: me.id, to: f.id }); return true;
    }),
    sk('Unmake', 'Interrupt and damage marked foes, fulfilling the stolen future.', 'Time Stop', (b, me, out) => {
      const prey = foesNear(b, me, 6).filter(f => f.mythic?.foretold?.by === me.id && f.mythic.foretold.until > b.t); if (!prey.length) return false;
      for (const f of prey) { stunFor(b, f, 1500); if ((f.stunUntil ?? 0) > b.t) state(f).foretold!.interrupted = true; strike(b, me, f, 2.4, out); } return true;
    }),
  ], sk('Rewrite Fate', 'Restore living allies’ health and free positions from three to five seconds ago. Keeps deaths, enemy damage and spent resources.', 'Rewind', rewriteFate, 1500));
  return built = { kits, heroes };
}
export function mythicKits(): Record<string, Kit> { return build().kits; }
export function mythicHeroKits(): Record<string, HeroKit> { return build().heroes; }
