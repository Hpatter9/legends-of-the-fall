// The relics' rules in a fight (RELICS-2, docs/notes/relics-2.md): what the run's relics ask of the battle beyond plain numbers, read from
// `b.relics.hooks` (`RelicHooks` in `relics.ts`). Each function here is a small hook the battle calls at one place: the fight's start, a blow
// struck or taken, a dodge, the skills' charge, the heroes' pace, the king's mana and a fighter falling. A fight with no relic hooks plays
// exactly as before: every hook returns 1 or 0 or does nothing. The battle also keeps a tally (`b.relicTally`: the Phoenix's rises, heroes
// fallen, elites and bosses felled) that the run adds to its own (`noteFight`), for the relics that grow.
//
// One hook draws: Voltara's Wedding Ring's struck hero, from its own side stream of the fight's seed, so no other draw moves.
//
// Pure rules: no Pixi, no DOM.

import { hurt, type Battle, type BattleEvent, type Unit } from './battle';
import { isBoss } from './foes';
import { ELITE_FOES } from './eliteFoes';
import { UNITS } from './units';
import { mixSeed, Rng } from './rng';
import { freezeFor } from './ailments';
import { mendUnit } from './abilities';
import { ECHO_RIDER } from './relicSets';

/** The side-stream salt of the Wedding Ring's struck hero. */
const STRUCK_SALT = 0x5e1c;
/** The king's mana at most (as `MANA_MAX` in `spells.ts`; kept here so this file does not import the spells). */
const MANA_CAP = 10;
/** The Rime Sapphire's health share: a hero at this much of its health or more counts as hale. */
const FULL = 0.5;

/** A hero of the party (not a summon, nor a decoy a skill called up). */
const partyHero = (u: Unit): boolean => u.side === 'hero' && !UNITS[u.def]?.summon && u.owner === undefined;

/** Beasts, for the Wolf-Tooth Necklace: the wolves and packs, the boars, minotaurs, satyrs, gorgons and the like. */
const BEAST = /wolf|pack|boar|minotaur|satyr|gorgon|bear|beast|hound|spider|rat|bat|serpent|lion|tiger|drake|wyvern|scorpion|toad|slime/i;
export const isBeast = (def: string): boolean => BEAST.test(def);

/** A foe that counts as an elite or a boss, for the Hawk's Eye. */
const isGreatFoe = (def: string): boolean => isBoss(def) || !!ELITE_FOES[def];

/**
 * The fight begins (or, in the Last Stand's one long fight, a wave): the king's first mana, the heroes' start-of-fight prices (the Ember,
 * the Wedding Ring), the back row's cloak, and the foes already on the field made stronger by a price. `wave`: the Last Stand's wave start,
 * where the back row's hp is not given again (the heroes keep their health from wave to wave) and the foes are made as they come in.
 */
export function relicStart(b: Battle, wave = false): void {
  const h = b.relics?.hooks;
  b.relicT0 = b.t;
  b.relicFell = false;
  b.lastStood = undefined;
  b.grief = undefined;
  b.relicRescued = false;
  b.relicFroze = false;
  if (!h) return;
  const heroes = b.units.filter((u) => u.alive && partyHero(u));
  // (RELICS-3: where each hero stood, for the Quarry Gauntlet; its kills and blows begin again)
  for (const x of heroes) {
    x.relicU0 = x.u;
    x.relicV0 = x.v;
    x.relicKills = 0;
    x.relicBlows = 0;
  }
  if (!wave) {
    if (h.healLess) for (const x of heroes) x.healMult = (x.healMult ?? 1) * (1 - h.healLess);
    if (h.ultPace) for (const x of heroes) x.ultPace = (x.ultPace ?? 1) * (1 + h.ultPace);
  }
  if (h.startMana) b.spells.mana = Math.min(MANA_CAP, b.spells.mana + h.startMana);
  if (h.backHp && !wave)
    for (const x of heroes) {
      if (x.v !== b.board.d - 1) continue;
      const was = x.maxHp;
      x.maxHp = Math.round(x.maxHp * (1 + h.backHp));
      x.hp = Math.max(1, Math.round((x.hp * x.maxHp) / was));
    }
  if (h.startHp) for (const x of heroes) x.hp = Math.max(1, Math.round(x.hp - x.maxHp * h.startHp));
  if (h.struck && heroes.length) {
    const x = heroes[new Rng(mixSeed(b.seed, STRUCK_SALT, b.t)).int(0, heroes.length - 1)];
    x.hp = Math.max(1, Math.round(x.hp - x.maxHp * h.struck));
  }
  if (wave) return;
  const foes = b.units.filter((u) => u.alive && u.side === 'foe');
  const champ = h.champion ? foes.reduce<Unit | undefined>((best, f) => (!best || f.maxHp > best.maxHp ? f : best), undefined) : undefined;
  for (const f of foes) relicFoe(b, f, f === champ);
  if (h.bossFirst && b.relics?.first && foes.some((f) => isBoss(f.def))) for (const f of foes) f.busyUntil += h.bossFirst;
}

/** A foe on the field (at the fight's start, or as it comes into the Last Stand) made as the relics' prices ask: more hp, a boss's attack, the champion. */
export function relicFoe(b: Battle, f: Unit, champion = false): void {
  const h = b.relics?.hooks;
  if (!h) return;
  const hp = (1 + (h.foeHp ?? 0)) * (champion ? 1 + (h.champion ?? 0) : 1);
  if (hp !== 1) {
    f.maxHp = Math.round(f.maxHp * hp);
    f.hp = Math.round(f.hp * hp);
  }
  const atk = (isBoss(f.def) ? 1 + (h.bossAtk ?? 0) : 1) * (champion ? 1 + (h.champion ?? 0) : 1);
  if (atk !== 1) f.power = (f.power ?? 1) * atk;
}

/** How much more a hero's blow deals: the First Banner while none has fallen, the Sapphire at full health, the Drum's first seconds, beasts
 *  for the Necklace, a crit on the wounded, a shooter (the more from above). */
export function relicBlow(b: Battle, me: Unit, to: Unit, crit: number, highShot: boolean): number {
  const h = me.side === 'hero' ? b.relics?.hooks : undefined;
  if (!h) return 1;
  let m = 1;
  if (h.unbroken && !b.relicFell) m *= 1 + h.unbroken;
  if (h.fullAtk && me.hp > me.maxHp * FULL) m *= 1 + h.fullAtk;
  if (h.earlyAtk && b.t - (b.relicT0 ?? 0) < h.earlyAtk.ms) m *= 1 + h.earlyAtk.v;
  if (h.shotAtk && UNITS[me.def]?.shot) m *= 1 + h.shotAtk;
  if (h.beast && isBeast(to.def)) m *= 1 + h.beast;
  if (h.execCrit && crit > 1 && to.hp < to.maxHp / 2) m *= 1 + h.execCrit;
  if (h.highShot && highShot) m *= 1 + h.highShot;
  if (h.killAtk && me.relicKills) m *= 1 + Math.min(h.killAtk.max, h.killAtk.v * me.relicKills);
  if (h.guardianAtk && to.def.startsWith('calBoss')) m *= 1 + h.guardianAtk;
  return m;
}

/** How much of a blow a hero takes: less from a boss (the Scorched Scale), less for the last one standing (the Warden's Medal). */
export function relicTaken(b: Battle, to: Unit, by: Unit): number {
  const h = to.side === 'hero' ? b.relics?.hooks : undefined;
  if (!h) return 1;
  let m = 1;
  if (h.bossGuard && isBoss(by.def)) m *= 1 - h.bossGuard;
  if (h.lastStand && b.lastStood === to.id) m *= 1 - h.lastStand.guard;
  if (h.stillGuard && to.relicU0 === to.u && to.relicV0 === to.v) m *= 1 - h.stillGuard;
  return m;
}

/** The share of blows a hero slips besides its own: the Watchman's Charm in the fight's first seconds. */
export function relicDodge(b: Battle, to: Unit): number {
  const h = to.side === 'hero' ? b.relics?.hooks : undefined;
  if (!h) return 0;
  const e = h.earlyDodge;
  return (e && b.t - (b.relicT0 ?? 0) < e.ms ? e.v : 0) + (h.stillDodge && !to.step ? h.stillDodge : 0);
}

/** How much faster a hero's skills charge: the Rime Sapphire above half health. */
export function relicCharge(b: Battle, u: Unit): number {
  const v = u.side === 'hero' ? b.relics?.hooks?.fullCharge : undefined;
  return v && u.hp > u.maxHp * FULL ? 1 + v : 1;
}

/** How much faster a hero acts and walks: the Huntmaster's Harness after a fall. */
export function relicSpeed(b: Battle, u: Unit): number {
  const g = u.side === 'hero' && b.grief?.length ? b.relics?.hooks?.grief : undefined;
  if (!g) return 1;
  return 1 + g.speed * b.grief!.filter((until) => until > b.t).length;
}

/** How much faster the king's mana fills: the Stopped Hourglass in the fight's first seconds. */
export function relicMana(b: Battle): number {
  const ms = b.relics?.hooks?.earlyMana;
  return ms && b.t - (b.relicT0 ?? 0) < ms ? 2 : 1;
}

/** The Phoenix Feather has raised a hero: counted for its burning out, and shown over the hero. */
export function relicRose(b: Battle, to: Unit, out: BattleEvent[]): void {
  const t = (b.relicTally ??= {});
  t.rises = (t.rises ?? 0) + 1;
  out.push({ kind: 'relic', to: to.id, id: 'phoenix' });
}

/** A fighter has fallen: the tally (a hero of the party, an elite or a boss), the Harness's haste, the Warden's Medal on the last one standing. */
export function relicFall(b: Battle, to: Unit, out: BattleEvent[], by?: Unit): void {
  const t = (b.relicTally ??= {});
  if (to.side === 'foe') {
    if (isGreatFoe(to.def)) t.elites = (t.elites ?? 0) + 1;
    const g = b.relics?.hooks;
    if (!g) return;
    // (RELICS-3: a hero's kill feeds the Ash-Tooth; every foe that falls heals the heroes, for the Oath-Ring)
    if (by && g.killAtk && by.side === 'hero') {
      const credit = by.owner !== undefined ? b.units.find((x) => x.id === by.owner) ?? by : by;
      credit.relicKills = (credit.relicKills ?? 0) + 1;
    }
    if (g.killHeal) for (const x of b.units) if (x.alive && partyHero(x)) mendUnit(x, x.maxHp * g.killHeal, out);
    return;
  }
  if (!partyHero(to)) return;
  t.fell = (t.fell ?? 0) + 1;
  b.relicFell = true;
  const h = b.relics?.hooks;
  if (!h) return;
  if (h.grief) {
    const live = (b.grief ?? []).filter((until) => until > b.t);
    if (live.length >= h.grief.max) live.shift();
    live.push(b.t + h.grief.ms);
    b.grief = live;
    const near = b.units.find((u) => u.alive && partyHero(u));
    if (near) out.push({ kind: 'relic', to: near.id, id: 'beastHarness' });
  }
  if (h.lastStand && b.lastStood === undefined) {
    const left = b.units.filter((u) => u.alive && partyHero(u));
    if (left.length === 1) {
      const x = left[0];
      b.lastStood = x.id;
      const amount = Math.min(x.maxHp - x.hp, Math.round(x.maxHp * h.lastStand.heal));
      x.hp += amount;
      if (amount > 0) out.push({ kind: 'heal', to: x.id, amount });
      out.push({ kind: 'relic', to: x.id, id: 'saintMedal' });
    }
  }
}

/* ------------------------------------------------------------------ the Eidolons' relics (RELICS-3) */

/** The Mane-Gold Thread: the first hero to drop under the share rescued heals (once a fight). */
export function relicHurt(b: Battle, to: Unit, out: BattleEvent[]): void {
  const r = b.relics?.hooks?.rescue;
  if (!r || b.relicRescued || !partyHero(to) || to.hp >= to.maxHp * r.under) return;
  b.relicRescued = true;
  mendUnit(to, to.maxHp * r.heal, out);
  out.push({ kind: 'relic', to: to.id, id: 'maneThread' });
}

/** The Rime Pearl: a foe that has struck a hero is slowed. */
export function relicStruck(b: Battle, by: Unit): void {
  const s = b.relics?.hooks?.foeSlow;
  if (s) by.rimeUntil = b.t + s.ms;
}
/** How much slower a foe walks and acts: the Rime Pearl's slow while it lasts. */
export function relicFoeSlow(b: Battle, x: Unit): number {
  const s = b.relics?.hooks?.foeSlow;
  return s && x.rimeUntil !== undefined && x.rimeUntil > b.t ? 1 - s.v : 1;
}

/** The Wyrm's Breath Vial: the foe the fight's first skill struck is frozen (the skill's own `hit` events, from `from`). */
export function relicSkill(b: Battle, me: Unit, out: BattleEvent[], from: number): void {
  const ms = b.relics?.hooks?.firstFreeze;
  if (!ms || b.relicFroze) return;
  for (let i = from; i < out.length; i++) {
    const e = out[i];
    if (e.kind !== 'hit' || e.by !== me.id) continue;
    const f = b.units.find((x) => x.id === e.to);
    if (!f || !f.alive || f.side !== 'foe') continue;
    b.relicFroze = true;
    freezeFor(b, f, ms, true, me);
    out.push({ kind: 'relic', to: me.id, id: 'wyrmVial' });
    return;
  }
}

const apart = (a: Unit, c: Unit): number => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
/** The share of a blow the Tempest Ring's echo carries to the second foe. */
const ECHO_SHARE = 0.6;
/** The Tempest Ring: every n-th blow a hero lands strikes a second foe near the first. */
export function relicEcho(b: Battle, by: Unit, to: Unit, dmg: number, out: BattleEvent[]): void {
  const n = b.relics?.hooks?.echoEvery;
  if (!n) return;
  by.relicBlows = (by.relicBlows ?? 0) + 1;
  if (by.relicBlows % n) return;
  const second = b.units.filter((f) => f.alive && f.side === 'foe' && f !== to && apart(f, to) <= 2).sort((x, y) => apart(x, to) - apart(y, to) || x.id - y.id)[0];
  if (!second) return;
  out.push({ kind: 'arc', from: to.id, to: second.id });
  hurt(b, by, second, Math.max(1, Math.round(dmg * ECHO_SHARE)), false, true, out, 'skill');
}

/** How much longer an Eidolon's rider lasts (or reaches): half as long again when its whole reliquary is held (the bound echo). */
export const riderLong = (b: Battle): number => (b.eidolon && b.relics?.set?.echo?.includes(b.eidolon.id) ? ECHO_RIDER : 1);
