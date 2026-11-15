// HERO-LIVE-STATS (docs/notes/hero-live-stats.md): the owner's ask, "click on a hero mid battle so that his personal stats show up on the
// bottom of the screen, where the healthbars and abilities are". What the fight HUD's stats panel shows for the hero picked: who it is, its
// bars (health, its pool, a shield), its ultimate's charge, this fight's numbers (dealt, taken, healed, kills, skills cast), its fighting
// numbers as they stand now (each marked up or down against what it had as the fight began), every buff and ailment on it with the time
// left and a line saying what it does, and the rest worth knowing (a life raising it, a duel, an Avenger's grudge, a shape's time).
// And which hero is picked: a tap on a hero picks it, the same hero again or the empty board puts the skills back.
//
// Pure, and reading only: it never writes to the battle or the unit (the ailments are read from their fields, not through `ailmentsOf`,
// which folds an old `dot` in; the blow numbers are worked out afresh, not through `blowStatsOf`'s cache). No DOM, no Pixi.

import { atkOf, defenceOf, type Battle, type Unit } from './sim/battle';
import { critOf, frenzyOf, ultimateOf } from './sim/abilities';
import { heroKitOf, resOf, topOf } from './sim/heroKits';
import { kitDef, kitQuick } from './sim/kits/effects';
import { speedOf } from './sim/spells';
import { dodgeShareOf, profiled, statInputOf } from './sim/blow';
import { derivedOf, profileOf, BASE_CRIT } from './sim/stats';
import { reviveIn } from './sim/lives';
import { timerOf } from './sim/carry';
import { heroName, HERO_NAMES } from './sim/heroNames';
import { UNITS } from './sim/units';
import { fieldedHero, type HeroStat } from './sim/fightStats';
import { AILMENT_KEYS, type AilmentKey } from './sim/ailmentKeys';
import { poolTag, ultOf } from './fightHudRules';

/* ------------------------------------------------------------------ which hero is picked */

/** Whether a unit can be picked for the panel: a hero the player fielded (not a summon, a foe, the king or Duchess), standing or fallen. */
export const pickable = (u: Unit | undefined): u is Unit => !!u && fieldedHero(u) && !!heroKitOf(u);

/** The pick after a tap: on a pickable hero, that hero (or none, if it was already the one picked); on anything else (the empty board, a
 *  foe), none. `null` means the skills panel. */
export function pickOnTap(cur: number | null, tapped: Unit | undefined): number | null {
  if (!pickable(tapped)) return null;
  return tapped.id === cur ? null : tapped.id;
}

/** The pick as the battle now stands: dropped when its hero has left the battle (a new fight, a fled or removed unit). A fallen hero stays
 *  picked (its panel says when a life raises it). */
export function pickNow(b: Battle, cur: number | null): number | null {
  if (cur === null || b.phase !== 'fight') return null;
  return pickable(b.units.find((u) => u.id === cur)) ? cur : null;
}

/** A hero's mark on the screen for a tap: its body's middle and how far from it a tap still counts (world px). */
export interface TapMark {
  id: number;
  x: number;
  y: number;
  r: number;
}

/** The mark a tap at (x, y) is for: the nearest whose reach it falls in (measured against each mark's reach, so a big hero does not swallow
 *  a small one beside it), or none. */
export function nearestMark(marks: readonly TapMark[], x: number, y: number): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const m of marks) {
    const d = Math.hypot(x - m.x, y - m.y) / m.r;
    if (d <= 1 && d < bestD) {
      bestD = d;
      best = m.id;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ the fighting numbers */

/** A hero's fighting numbers as numbers (for comparing now with the fight's start). Blows and walk are seconds: lower is better. */
export interface StatNumbers {
  attack: number;
  armour: number;
  ac: number;
  toHit: number;
  blows: number;
  walk: number;
  range: number;
  crit: number;
  critMult: number;
  dodge: number;
  /** The share of a blow it is spared (a raised guard, an aura's guard, a comrade near). */
  guard: number;
}

/** Which numbers are better lower. */
const LOWER_BETTER: ReadonlySet<keyof StatNumbers> = new Set(['blows', 'walk']);

/** The hero's numbers now, read as the fight reads them (its haste and slow, frenzy, kit, gear, the side's traits and the floor's twist). */
export function statNumbers(b: Battle, u: Unit): StatNumbers {
  const def = UNITS[u.def];
  const kd = kitDef(b, u, def);
  const prof = profiled(u) ? profileOf(u.def) : undefined;
  const now = prof ? derivedOf(prof, statInputOf(u)) : undefined;
  const one = prof ? derivedOf(prof) : undefined;
  const dexQuick = now && one ? now.blowSpeed / one.blowSpeed : 1;
  const quick = speedOf(b, u) * frenzyOf(b, u) * (1 + (u.eq?.atkSpeed ?? 0)) * kitQuick(b, u) * dexQuick;
  const walkPace = speedOf(b, u) * (1 + (u.eq?.moveSpeed ?? 0)) * (b.heroMove ?? 1) * kitQuick(b, u, true);
  const c = critOf(b, u);
  const on = (t: number | undefined) => t !== undefined && t > b.t;
  let guard = 1;
  if (on(u.guardUntil)) guard *= 0.5;
  if (u.auraGuard && on(u.auraGuard.until)) guard *= 1 - u.auraGuard.share;
  if (u.bondGuard) guard *= 1 - u.bondGuard;
  return {
    attack: atkOf(u),
    armour: defenceOf(u),
    ac: now?.ac ?? 0,
    toHit: now?.toHit ?? 0,
    blows: def.atkMs / Math.max(0.01, quick) / 1000,
    walk: def.moveMs / Math.max(0.01, walkPace) / 1000,
    range: kd.range + (u.eq?.range ?? 0),
    crit: c.chance + (now ? now.crit - BASE_CRIT : 0),
    critMult: c.mult,
    dodge: dodgeShareOf(b, u),
    guard: 1 - guard,
  };
}

/** One line of the panel's numbers: its label, the value now, what it was as the fight began, and whether it has gone up or down
 *  (better or worse: a quicker blow is "up"). */
export interface LiveStat {
  key: keyof StatNumbers;
  label: string;
  value: string;
  was?: string;
  trend: 'up' | 'down' | '';
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const secs = (v: number): string => `${v.toFixed(2)}s`;
const signed = (v: number): string => `${v >= 0 ? '+' : ''}${Math.round(v)}`;

/** The panel's number lines, in the hero card's order, each against the fight's start (`base`; none gives no marks). A number that
 *  changes by less than half a per cent is counted unchanged (a share rounding at the edge would flicker). */
export function statLines(now: StatNumbers, base?: StatNumbers): LiveStat[] {
  const shown: [keyof StatNumbers, string, (v: number) => string][] = [
    ['attack', 'Attack', (v) => String(Math.round(v))],
    ['armour', 'Armour', (v) => String(Math.round(v))],
    ['ac', 'AC', (v) => String(Math.round(v * 10) / 10)],
    ['toHit', 'To hit', signed],
    ['blows', 'Blows', secs],
    ['walk', 'Walk', secs],
    ['range', 'Range', String],
    ['crit', 'Crit', pct],
    ['dodge', 'Dodge', pct],
    ['guard', 'Guard', pct],
  ];
  const out: LiveStat[] = [];
  for (const [key, label, fmt] of shown) {
    const v = now[key];
    const w = base?.[key];
    // (a number with nothing in it, now or at the start, is left out: a hero with no dodge or guard has no line for it)
    if ((key === 'dodge' || key === 'guard' || key === 'ac' || key === 'toHit') && !v && !w) continue;
    let trend: LiveStat['trend'] = '';
    if (w !== undefined && Math.abs(v - w) > Math.max(1e-6, Math.abs(w) * 0.005)) {
      const higher = v > w;
      trend = higher !== LOWER_BETTER.has(key) ? 'up' : 'down';
    }
    out.push({ key, label, value: fmt(v), was: trend && w !== undefined ? fmt(w) : undefined, trend });
  }
  return out;
}

/* ------------------------------------------------------------------ buffs and ailments */

/** Where an effect's icon comes from: the ailments' own atlas icon, or one of the painted combat motifs (`COMBAT_ART`). */
export type EffectIcon = { ail: AilmentKey } | { motif: string };

/** One effect on the hero: its name, whether it helps, its time left (ms; none for one that lasts until something happens), stacks, and a
 *  line saying what it does (shown on a tap). */
export interface LiveEffect {
  key: string;
  name: string;
  good: boolean;
  left?: number;
  stacks?: number;
  icon: EffectIcon;
  text: string;
}

/** The eleven ailments' names and meanings, as the panel says them. */
export const AILMENT_WORDS: Readonly<Record<AilmentKey, { name: string; text: string }>> = {
  burn: { name: 'Burning', text: 'Takes fire damage every half second.' },
  poison: { name: 'Poisoned', text: 'Takes damage each second, more for each stack, and is healed less.' },
  freeze: { name: 'Frozen', text: 'Cannot act; a heavy blow or a skill shatters the ice for extra damage.' },
  bleed: { name: 'Bleeding', text: 'Loses health over time.' },
  chill: { name: 'Chilled', text: 'Moves and strikes slower; three chills close together freeze.' },
  shock: { name: 'Shocked', text: 'Jolted each second, and the shock jumps to fighters near it.' },
  stun: { name: 'Stunned', text: 'Cannot act until it wears off.' },
  weak: { name: 'Weakened', text: 'Deals less damage.' },
  curse: { name: 'Cursed', text: 'Takes damage over time, and healing on it turns partly to harm.' },
  silence: { name: 'Silenced', text: 'Cannot cast its skills.' },
  fear: { name: 'Feared', text: 'Runs from its foes instead of fighting.' },
};

/** Every buff and ailment on the hero at the battle's time, the ailments first (the latest first), then the rest, helpful before harmful. */
export function effectsOf(b: Battle, u: Unit): LiveEffect[] {
  const t = b.t;
  const out: LiveEffect[] = [];
  if (!u.alive) return out;
  const left = (until: number | undefined) => (until !== undefined && until > t ? until - t : undefined);
  const add = (key: string, until: number | undefined, good: boolean, motif: string, name: string, text: string, stacks?: number) => {
    const l = left(until);
    if (l !== undefined) out.push({ key, name, good, left: l, icon: { motif }, text, stacks });
  };
  // (the ailments: its list, read as it stands; an old single `dot`, and a hold, slow or weakening set the old way)
  const seen = new Set<AilmentKey>();
  const ail = (kind: AilmentKey, until: number, stacks?: number) => {
    if (until <= t || seen.has(kind)) return;
    seen.add(kind);
    out.push({ key: kind, name: AILMENT_WORDS[kind].name, good: false, left: until - t, icon: { ail: kind }, text: AILMENT_WORDS[kind].text, stacks: stacks && stacks > 1 ? stacks : undefined });
  };
  const list = u.ail ?? [];
  for (let i = list.length - 1; i >= 0; i--) if (AILMENT_KEYS.includes(list[i].kind)) ail(list[i].kind, list[i].until, list[i].stacks);
  if (u.dot) ail(u.dot.kind, u.dot.until);
  if (u.stunUntil !== undefined && !seen.has('freeze')) ail('stun', u.stunUntil);
  if (u.slowUntil !== undefined) ail('chill', u.slowUntil);
  if (u.weakUntil !== undefined) ail('weak', u.weakUntil);
  const ailN = out.length;
  // (what helps)
  const x = u.kx;
  if (u.shield && u.shield.hp > 0) add('shield', u.shield.until, true, 'shield', `Shield ${Math.round(u.shield.hp)}`, 'Soaks damage before its health is touched.');
  add('guard', u.guardUntil, true, 'shield', 'Guarding', 'Takes half damage.');
  add('haste', u.hasteUntil, true, 'rush', 'Hasted', 'Moves and strikes half as fast again.');
  add('rally', u.rallyUntil, true, 'banner', 'Rallied', 'Hits harder.');
  add('banner', u.banner?.until, true, 'banner', 'War banner', 'Hits harder under the banner.');
  add('auraAtk', u.auraAtk?.until, true, 'drum', 'Aura of might', `Hits ${pct((u.auraAtk?.mult ?? 1) - 1)} harder.`);
  add('auraGuard', u.auraGuard?.until, true, 'shield', 'Aura of guard', `Takes ${pct(u.auraGuard?.share ?? 0)} less damage.`);
  if (u.hot) add('hot', u.hot.until, true, 'heal', 'Mending', `Heals ${Math.round(u.hot.amount)} every ${(u.hot.every / 1000).toFixed(1)}s.`);
  add('ward', u.wardUntil, true, 'prayer', 'Warded', 'No new ailment takes hold.');
  add('hidden', u.hideUntil, true, 'hood', 'Hidden', 'Foes cannot target it.');
  add('safe', u.safeUntil, true, 'angel', 'Just risen', 'A life has raised it: it takes no hurt for a moment.');
  if (u.frenzy && u.frenzy.n > 0) add('frenzy', u.frenzy.until, true, 'fangs', 'Frenzy', 'Its kills quicken its blows.', u.frenzy.n);
  add('form', u.form?.until, true, 'skull', 'Demon form', 'Hits harder in its demon form.');
  add('electrified', u.electrifiedUntil, true, 'lightning', 'Electrified', 'Its arrows carry lightning.');
  if (x) {
    add('parry', x.parry, true, 'parry', 'Parrying', 'Melee blows on it are parried and answered.');
    add('reflect', x.reflect, true, 'wind', 'Wind ward', 'Shots at its friends are blown back.');
    add('vow', x.vow, true, 'shield', 'Vow', 'Takes half its friends’ wounds.');
    add('fury', x.fury, true, 'axe', 'Blood Fury', 'Strikes faster in its fury.');
    add('tree', x.tree?.until, true, 'treant', 'Treeform', 'A treant: tougher and harder to move.');
    add('guise', x.guise?.until, true, 'fox', 'Guise', 'Wears a foe’s shape, with its reach.');
    add('moon', x.moon, true, 'moon', 'Full Moon', 'Has both of its forms’ strengths.');
    add('wolfForm', x.wolfUntil, true, 'paw', x.wolf === 'brute' ? 'Brute form' : 'Hunter form', x.wolf === 'brute' ? 'Tougher, and hits harder.' : 'Quicker blows.');
    add('charged', x.charged, true, 'lightning', 'Charged', 'Its blows carry a charge.');
    add('siege', x.siege, true, 'cannon', 'Anchored', 'Reaches further and splashes, but does not walk.');
    add('angel', x.angel, true, 'angel', 'Guardian angel', 'Watched over by an angel.');
    add('scales', x.scales, true, 'dragon', 'Scale Ward', 'Takes less, and blows on it burn the striker.');
    add('dawn', x.dawn, true, 'star', 'Hymn of Dawn', 'Cannot fall below 1 health.');
    add('lifesteal', x.lifestealUntil, true, 'blood', 'Lifesteal', 'Drinks some of what it deals.');
    add('shroud', x.shadowShroudUntil, true, 'smoke', 'Shadow shroud', 'Wrapped in shadow.');
    add('dodgeUp', x.bonusDodgeUntil, true, 'feather', 'Evasive', 'Dodges more often.');
    if (x.critNext) out.push({ key: 'critNext', name: 'Next blow crits', good: true, icon: { motif: 'dagger' }, text: 'Its next blow is a critical hit.' });
  }
  if (u.cc?.immune !== undefined) add('ccImmune', u.cc.immune, true, 'shield', 'Unshakeable', 'Immune to stuns, freezes, fear and silence for now.');
  // (what harms, beyond the ailments)
  add('brittle', u.brittleUntil, false, 'ice', 'Brittle', 'Takes extra from every blow.');
  add('charm', u.charmUntil, false, 'fox', 'Charmed', 'Fights its own side.');
  add('rooted', u.rootUntil, false, 'roots', 'Snared', 'Cannot step, but still strikes what is in reach.');
  if (u.taunt) add('taunted', u.taunt.until, false, 'shield', 'Taunted', 'Must go for the one that taunted it.');
  if (x) {
    add('pinned', x.pinned, false, 'aim', 'Pinned', 'Takes a quarter more from shots.');
    add('smoke', x.smoke, false, 'smoke', 'In smoke', 'Misses half its blows.');
    add('poly', x.poly?.until, false, 'fox', 'Polymorphed', 'Turned into something harmless: hits far softer.');
    add('bounty', x.bounty?.until, false, 'pistol', 'Bounty', 'Marked: takes more damage.');
    add('condemned', x.condemned?.until, false, 'chain', 'Condemned', 'Takes more damage.');
    add('stone', x.stone, false, 'golem', 'Turned to stone', 'Cannot act.');
    add('suppressed', x.suppressed, false, 'cannon', 'Suppressed', 'Its skill meter stops filling.');
    add('exposed', x.exposed?.until, false, 'skull', 'Exposed', `Takes ${pct((x.exposed?.mult ?? 1) - 1)} more from blows and skills.`);
    add('branded', x.brand, false, 'firewall', 'Branded', 'Marked by a brand.');
    if (x.missNext) out.push({ key: 'missNext', name: 'Next blow misses', good: false, icon: { motif: 'star' }, text: 'Dazzled: its next blow misses.' });
  }
  // (the ailments first, the latest first; then the helpful, then the harmful)
  const rest = out.slice(ailN).sort((a, c) => +c.good - +a.good);
  return [...out.slice(0, ailN), ...rest];
}

/* ------------------------------------------------------------------ the whole panel */

export interface LiveBar {
  now: number;
  max: number;
  share: number;
  text: string;
}

export interface LiveView {
  id: number;
  kind: string;
  name: string;
  title?: string;
  level: number;
  grade: number;
  rank: number;
  awaken: number;
  alive: boolean;
  hp: LiveBar;
  pool: LiveBar & { tag: 'MP' | 'SP'; label: string };
  shield?: LiveBar;
  ult: { name?: string; meter: number; ready: boolean; locked: boolean; text: string };
  fight: { dealt: number; taken: number; healed: number; kills: number; casts: number };
  stats: LiveStat[];
  effects: LiveEffect[];
  /** Anything else worth knowing, a line each: a life raising it, the run's lives, a duel, an Avenger's grudge, a shape's time. */
  notes: string[];
  xp?: { into: number; need: number; share: number; text: string; fight?: number };
}

/** What the page can add: the hero's XP into its level (from the save), and the XP this fight has earned it so far. */
export interface LiveOpts {
  xp?: (u: Unit) => { into: number; need: number; fight?: number } | undefined;
}

const bar = (now: number, max: number, text: string): LiveBar => ({ now, max, share: max > 0 ? Math.max(0, Math.min(1, now / max)) : 0, text });

/** The panel for hero `u`: `stat` is its row of the fight's tally (`fightStats.ts`), `base` its numbers as the fight began. */
export function liveOf(b: Battle, u: Unit, stat?: HeroStat, base?: StatNumbers, opts: LiveOpts = {}): LiveView {
  const hk = heroKitOf(u)!;
  const max = Math.floor(topOf(u, hk.pool));
  const res = resOf(u, hk.pool);
  const hpNow = Math.max(0, Math.ceil(u.hp));
  const v = ultOf(b, u);
  const ult = ultimateOf(u);
  const n = HERO_NAMES[u.def];
  const notes: string[] = [];
  const back = reviveIn(b, u);
  if (!u.alive) notes.push(back !== null ? `Fallen: a life raises it in ${Math.max(1, Math.ceil(back / 1000))}s` : 'Fallen');
  if (b.lives) notes.push(`Lives left to the run: ${b.lives.left}`);
  if (u.lifeRises) notes.push(`Raised by a life ${u.lifeRises} ${u.lifeRises === 1 ? 'time' : 'times'} this fight`);
  if (b.duel && b.duel.hero === u.id) {
    const foe = b.units.find((x) => x.id === b.duel!.nem);
    notes.push(`In a duel${foe ? ` with ${foe.nem?.name ?? UNITS[foe.def].name}` : ''}`);
  }
  if (u.avenge) {
    const foe = b.units.find((x) => x.id === u.avenge!.of);
    if (foe?.alive) notes.push(`Avenger: its skills come round ${pct(u.avenge.cd)} quicker while ${foe.nem?.name ?? UNITS[foe.def].name} stands`);
  }
  const shape = timerOf(u, b.t);
  if (shape?.shape) notes.push(`Shape: ${Math.ceil(shape.left / 1000)}s left`);
  if (b.bonds?.some((p) => p.a === u.id || p.b === u.id)) notes.push(bondLine(b, u));
  const xpv = opts.xp?.(u);
  const shielded = !!u.shield && u.shield.hp > 0 && u.shield.until > b.t;
  if (xpv?.fight) notes.push(`About +${Math.round(xpv.fight)} XP from this fight so far (paid when it ends, before bonuses)`);
  return {
    id: u.id,
    kind: u.def,
    name: n?.name ?? heroName(u.def),
    title: n?.title,
    level: u.level ?? 1,
    grade: u.grade ?? 1,
    rank: u.rank ?? 0,
    awaken: u.awaken ?? 0,
    alive: u.alive,
    hp: bar(hpNow, u.maxHp, `${hpNow}/${u.maxHp}`),
    pool: { ...bar(Math.floor(res), max, `${Math.floor(res)}/${max} ${poolTag(hk)}`), tag: poolTag(hk), label: hk.pool === 'mana' ? 'Mana' : 'Stamina' },
    // (a shield is a bar of its own, its time left in its words; its chip is left out of the effects)
    shield: shielded ? bar(Math.round(u.shield!.hp), u.maxHp, `${Math.round(u.shield!.hp)} · ${((u.shield!.until - b.t) / 1000).toFixed(1)}s`) : undefined,
    ult: {
      name: ult?.name,
      meter: v.meter,
      ready: v.ready,
      locked: v.locked,
      text: v.locked ? 'Opens at level 30' : v.ready ? 'Ready' : v.queued ? 'Coming' : `${Math.floor(v.meter * 100)}%`,
    },
    fight: { dealt: Math.round(stat?.dealt ?? u.dealt ?? 0), taken: Math.round(stat?.taken ?? 0), healed: Math.round(stat?.healed ?? u.healed ?? 0), kills: stat?.kills ?? u.kills ?? 0, casts: stat?.casts ?? 0 },
    stats: statLines(statNumbers(b, u), base),
    effects: shielded ? effectsOf(b, u).filter((e) => e.key !== 'shield') : effectsOf(b, u),
    notes,
    xp: xpv ? { ...xpv, share: xpv.need > 0 ? Math.max(0, Math.min(1, xpv.into / xpv.need)) : 1, text: xpv.need > 0 ? `${Math.floor(xpv.into)}/${xpv.need} XP` : 'Top level' } : undefined,
  };
}

/** A bond's line: who the hero is bonded to (or rivals), and whether it is near enough to count now. */
function bondLine(b: Battle, u: Unit): string {
  const p = b.bonds!.find((q) => q.a === u.id || q.b === u.id)!;
  const other = b.units.find((x) => x.id === (p.a === u.id ? p.b : p.a));
  const who = other ? heroName(other.def) : 'a friend';
  return `${p.lv < 0 ? 'Rival of' : 'Bonded with'} ${who}${u.bondAtk && u.bondAtk > 1 ? ': near, and stronger for it' : ''}`;
}

/** An effect's time left in words: "4.2s", "12s"; none for one without a clock. */
export const leftWords = (e: LiveEffect): string => (e.left === undefined ? '' : e.left < 10000 ? `${(e.left / 1000).toFixed(1)}s` : `${Math.ceil(e.left / 1000)}s`);

/** A big number short enough for a narrow cell: 980, 12.3k, 1.2M. */
export function shortNum(n: number): string {
  if (n < 10000) return String(Math.round(n));
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}
