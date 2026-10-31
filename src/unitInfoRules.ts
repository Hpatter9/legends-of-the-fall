// The unit's info card (UNIT-INFO, docs/notes/unit-info.md): what a press-and-hold on a unit between waves shows. A hero's portrait line,
// level, grade and awakening, its health and stats as the fight would use them, its traits and what it wears, and each of its moves (skill
// 1, skill 2 locked below level 10, the ultimate locked below level 30), read through the fight HUD's own skill-sheet rules (`sheetOf`), so
// a re-costed or renamed skill shows as it now is. A foe's or a boss's stats, its family, its kit, its second form (`PHASE2`) and the
// codex's tips (`tipsOf`); the summons, the Last Stand's king and Duchess get small cards of their own. Pure: it only reads the battle,
// the unit and the data tables, and never changes either (a bench hero not on the board is read from a unit made on a scratch copy of
// the battle, `previewUnit`); no DOM, no Pixi, so the tests read it.

import { timerOf } from './sim/carry';
import { addUnit, atkOf, defenceOf, type Battle, type Boost, type Unit } from './sim/battle';
import { kitOf, KITS, type Kit, type Passive, type Skill } from './sim/abilities';
import { heroKitOf, resMax, resOf, ULT_FILL } from './sim/heroKits';
import { PHASE2, PHASE_AT, type PhaseKit } from './sim/bossPhases';
import { BOSS_IDS } from './sim/foes';
import { entryOfDef, tipsOf, type FoeClass } from './sim/codex';
import { FOE_LORE } from './sim/codexLore';
import { HERO_NAMES, heroName } from './sim/heroNames';
import { TRAITS, traitsOf } from './sim/traits';
import { CLASS_NAMES, CLASS_OF } from './sim/starter';
import { EQUIP_SLOTS, itemName, RARITY_NAMES, SLOT_NAMES, wornIn } from './sim/equipment';
import { gearText, SLOTS, type Gear, type Slot as GearSlot } from './sim/gear';
import type { Meta } from './sim/meta';
import { UNITS, type UnitDef } from './sim/units';
import { poolTag, sheetOf } from './fightHudRules';

/** How long a finger must rest on a unit, without moving, for its card to open (ms). */
export const HOLD_MS = 400;
/** How far the finger may stray (px) before the hold gives way to a drag or a pan (the drag's own threshold). */
export const HOLD_SLOP = 8;
/** The ring under the finger shows only after this long, so an ordinary tap shows nothing (ms). */
export const RING_DELAY_MS = 120;

/** Whether a finger that went down at (x0, y0) and is now at (x, y) has moved too far for a hold. */
export const holdBroken = (x0: number, y0: number, x: number, y: number): boolean => Math.hypot(x - x0, y - y0) >= HOLD_SLOP;

export type InfoKind = 'hero' | 'foe' | 'boss' | 'elite' | 'summon' | 'king' | 'duchess';

/** One of a unit's moves, as the card lists it. */
export interface MoveInfo {
  /** "Skill 1", "Skill 2", "Ultimate", "Skill" (a foe's), "Passive". */
  label: string;
  name: string;
  text: string;
  locked: boolean;
  rows: [string, string][];
  tiers: { title: string; text: string; on: boolean; now: boolean }[];
}

export interface UnitInfo {
  kind: InfoKind;
  /** The sheet its portrait is drawn from (a hero's is chosen by the page, for its rank and awakening). */
  sheet: string;
  name: string;
  /** A hero's title ("Shield of the Dawn"), an elite's or herald's epithet. */
  title?: string;
  /** The small line under the name: its kind and class, or its family and role. */
  sub: string;
  /** Hero only: its level, grade (stars) and awakened steps. */
  level?: number;
  grade?: number;
  awaken?: number;
  /** "1978/1978", and the share for the bar. */
  hp: string;
  hpShare: number;
  stats: [string, string][];
  traits: { name: string; text: string }[];
  gear: string[];
  moves: MoveInfo[];
  /** A boss's second form, in lines (the first says when). */
  phase: string[];
  /** The codex's tips for a foe, and a line of its lore. */
  tips: string[];
  lore?: string;
  /** A last line of its own (a summon's caller, the king's stake). */
  note?: string;
}

/** What the page can add: the meta (for the permanent equipment), the run's own gear on this hero, and whether the ultimates fire on their own. */
export interface InfoOpts {
  meta?: Meta;
  gear?: Partial<Record<GearSlot, Gear>>;
  autoUlt?: boolean;
}

const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;
const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** A hero on the bench, not on the board, read as the fight would make it: a unit added to a scratch copy of the battle (the battle itself is
 *  left as it was: its units and its next id are not touched). */
export function previewUnit(b: Battle, kind: string, boost: Boost = {}, tag?: number): Unit {
  const scratch: Battle = { ...b, units: [], nextId: b.nextId };
  return addUnit(scratch, kind, 0, 0, boost, tag);
}

/** The family a foe belongs to, from its look. */
export function familyOf(def: UnitDef): string {
  const s = def.sheet;
  const fam: [RegExp, string][] = [
    [/werewolf|wolf/, 'Werewolf'],
    [/minotaur/, 'Minotaur'],
    [/gorgon/, 'Gorgon'],
    [/satyr/, 'Satyr'],
    [/orc|shaman/, 'Orc'],
    [/imp|demon|devil/, 'Demon'],
    [/ogre/, 'Ogre'],
    [/skeleton|lich|ghost/, 'Undead'],
    [/golem/, 'Golem'],
    [/kitsune|karasu|yamabushi|oni|yokai/, 'Yokai'],
    [/forest_boss/, 'Forest folk'],
    [/boar/, 'Beast'],
  ];
  return fam.find(([re]) => re.test(s))?.[1] ?? 'Foe';
}

/** A fighter's speed as the fight reads it before any haste or slow: its side's trait or tier pace, and the floor's twist. */
const paceOf = (b: Battle, u: Unit): number => (u.side === 'hero' ? b.traits?.speed ?? 1 : b.foeSpeed ?? 1) * (b.twist?.pace ?? 1);

/** The stat rows every card shares: attack, defence, range, blows, walk, climb, and crit and dodge where it has them. */
function statRows(b: Battle, u: Unit, kit: Kit | undefined): [string, string][] {
  const def = UNITS[u.def];
  const pace = paceOf(b, u);
  const range = def.range + (u.eq?.range ?? 0);
  const blow = def.atkMs / (pace * (1 + (u.eq?.atkSpeed ?? 0)));
  const walk = def.moveMs / (pace * (1 + (u.eq?.moveSpeed ?? 0)) * (u.side === 'hero' ? b.heroMove ?? 1 : 1));
  const rows: [string, string][] = [
    ['Attack', String(Math.round(atkOf(u)))],
    ['Defence', String(Math.round(defenceOf(u)))],
    ['Range', `${range} ${range === 1 ? 'tile' : 'tiles'}${def.shot ? ', shoots' : ''}${def.splash ? ', splash' : ''}`],
    ['Blows', `every ${secs(blow)}`],
    ['Walk', def.still ? 'Stands still' : `${secs(walk)} a tile`],
    ['Climb', def.flies ? 'Flies' : `${def.jump} ${def.jump === 1 ? 'step' : 'steps'}`],
  ];
  const c = kit?.passive.crit;
  const crit = (c?.chance ?? 0) + (u.side === 'hero' ? b.traits?.crit ?? 0 : 0) + (u.eq?.crit ?? 0);
  if (crit > 0) rows.push(['Crit', `${pct(crit)} for x${(c?.mult ?? 1.5).toFixed(1)}`]);
  const dodge = (kit?.passive.dodge ?? 0) + (u.side === 'hero' ? b.traits?.dodge ?? 0 : 0) + (u.eq?.dodge ?? 0);
  if (dodge > 0) rows.push(['Dodge', pct(dodge)]);
  if (u.shield && u.shield.hp > 0) rows.push(['Shield', `${u.shield.hp}`]);
  return rows;
}

/** A foe's (or a summon's) kit as moves: its skill, its ultimate if it has one, and its passive. */
function kitMoves(kit: Kit | undefined): MoveInfo[] {
  if (!kit) return [];
  const one = (label: string, s: Skill): MoveInfo => ({
    label,
    name: s.name,
    text: s.text,
    locked: false,
    rows: [
      ['Charge', 'Fills as it deals and takes blows, and a little each second'],
      ['Cast time', secs(s.castMs)],
    ],
    tiers: [],
  });
  const out = [one('Skill', kit.skill)];
  if (kit.ultimate) out.push(one('Ultimate', kit.ultimate));
  out.push(passiveMove(kit.passive));
  return out;
}

const passiveMove = (p: Passive): MoveInfo => ({ label: 'Passive', name: p.name, text: p.text, locked: false, rows: [], tiers: [] });

/** What a passive's few keys a boss gains in its second form are, in words. */
function passiveWords(p: Partial<Passive>): string[] {
  const out: string[] = [];
  if (p.leech) out.push(`drinks ${pct(p.leech)} of what it deals`);
  if (p.frenzy) out.push(`quickens ${pct(p.frenzy.per)} with each kill (up to ${p.frenzy.max})`);
  if (p.finish) out.push(`hits ${pct(p.finish.mult - 1)} harder on heroes under ${pct(p.finish.under)} health`);
  if (p.steady) out.push('cannot be shoved');
  if (p.block) out.push(`blows from the front lose ${pct(p.block)}`);
  if (p.ignite) out.push('its blows set heroes alight');
  if (p.regen) out.push(`heals ${pct(p.regen)} of its health a second`);
  return out;
}

/** A boss's second form in lines: when it comes, then what it brings. */
export function phaseLines(pk: PhaseKit, at = PHASE_AT): string[] {
  const out = [`At ${pct(at)} health it changes form: “${pk.line}”`];
  if (pk.atk !== 1) out.push(`Hits ${pct(pk.atk - 1)} harder`);
  if (pk.heal) out.push(`Heals ${pct(pk.heal)} of its health`);
  if (pk.shield) out.push(`A shield of ${pct(pk.shield)} of its health for 10s`);
  if (pk.haste) out.push(`Hasted for ${Math.round(pk.haste / 1000)}s`);
  if (pk.adds) out.push(`Calls ${pk.adds.n} ${UNITS[pk.adds.kind]?.name ?? pk.adds.kind}${pk.adds.n === 1 ? '' : 's'} to its side`);
  if (pk.skill && KITS[pk.skill]) out.push(`Takes up ${KITS[pk.skill].skill.name}: ${KITS[pk.skill].skill.text}`);
  if (pk.ultimate && KITS[pk.ultimate]) {
    const u = KITS[pk.ultimate].ultimate ?? KITS[pk.ultimate].skill;
    out.push(`Its ultimate becomes ${u.name}: ${u.text}`);
  }
  if (pk.primed) out.push('Its ultimate is full the moment it changes');
  if (pk.teleport) out.push('Leaps onto your line');
  const pw = pk.passive ? passiveWords(pk.passive) : [];
  if (pw.length) out.push(`And it ${pw.join(', ')}`);
  return out;
}

/** What the hero wears: the castle's equipment (permanent) and the run's own gear. */
export function gearLines(u: Unit, opts: InfoOpts): string[] {
  const out: string[] = [];
  if (opts.meta)
    for (const slot of EQUIP_SLOTS) {
      const it = wornIn(opts.meta, u.def, slot);
      if (it) out.push(`${SLOT_NAMES[slot]}: ${itemName(it)} (${RARITY_NAMES[it.rarity]}, level ${it.level})`);
    }
  for (const slot of SLOTS) {
    const g = opts.gear?.[slot];
    if (g) out.push(`${g.name} (this run): ${gearText(g)}`);
  }
  for (const a of u.eq?.abilities ?? []) out.push(`Ability: ${a.name}`);
  return out;
}

/** A hero's moves through the fight HUD's sheets: skill 1, skill 2 and the ultimate, then its passive. */
function heroMoves(b: Battle, u: Unit, auto: boolean): MoveInfo[] {
  const out: MoveInfo[] = [];
  for (const w of [1, 2, 'ult'] as const) {
    const v = sheetOf(b, u, w, auto);
    if (!v) continue;
    const locked = v.rows.some(([k]) => k === 'Locked');
    // (between waves the meter's share means little: the ultimate's card says what it costs instead)
    const rows = v.rows.filter(([k]) => k !== 'Meter');
    if (w === 'ult') rows.splice(locked ? 1 : 0, 0, ['Cost', `No ${poolTag(heroKitOf(u)!)}: its own meter, which starts each fight ${ULT_FILL.START}% full`]);
    out.push({ label: v.label, name: v.name, text: v.text, locked, rows, tiers: v.tiers });
  }
  const kit = kitOf(u);
  if (kit) out.push(passiveMove(kit.passive));
  return out;
}

/** SUMMON-TIMERS: how long a summon has left, in the words of its card (it is kept into the next wave while its caller stands). */
function summonTime(b: Battle, u: Unit): string {
  const t = timerOf(u, b.t);
  if (!t || t.shape) return u.expires !== undefined ? ', for a while' : '';
  return `: ${Math.ceil(t.left / 1000)}s of fighting left, kept into the next wave while its caller stands`;
}

/** The card for any unit on the board (or a bench hero made with `previewUnit`). */
export function infoOf(b: Battle, u: Unit, opts: InfoOpts = {}): UnitInfo {
  const def = UNITS[u.def];
  const kit = kitOf(u);
  const hp = `${Math.max(0, Math.ceil(u.hp))}/${u.maxHp}`;
  const hpShare = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
  const base = { sheet: u.look ?? def.sheet, hp, hpShare, stats: statRows(b, u, kit), traits: [], gear: [], phase: [], tips: [] as string[] };
  const hk = heroKitOf(u);
  if (hk) {
    const n = HERO_NAMES[u.def];
    const stats = base.stats;
    const max = resMax(hk.pool);
    stats.unshift(['Pool', `${hk.pool === 'mana' ? 'Mana' : 'Stamina'}: ${Math.floor(resOf(u, hk.pool))}/${max} ${poolTag(hk)}`]);
    // (SUMMON-TIMERS: a shape's time left, which carries into the next wave)
    const shape = timerOf(u, b.t);
    if (shape?.shape) stats.push(['Shape', `${Math.ceil(shape.left / 1000)}s of fighting left; kept into the next wave`]);
    return {
      ...base,
      kind: 'hero',
      name: n?.name ?? def.name,
      title: n?.title,
      sub: `${def.name} · ${CLASS_NAMES[CLASS_OF[u.def]] ?? 'Hero'} · ${hk.role || def.role}`,
      level: u.level ?? 1,
      grade: u.grade ?? 1,
      awaken: u.awaken ?? 0,
      stats,
      traits: traitsOf(u.def).map((t) => ({ name: TRAITS[t].name, text: TRAITS[t].tiers.map((x) => `${x.need}: ${x.text}`).join(' · ') })),
      gear: gearLines(u, opts),
      moves: heroMoves(b, u, !!opts.autoUlt),
    };
  }
  if (u.def === 'standKing')
    return { ...base, kind: 'king', name: def.name, sub: def.role, moves: kitMoves(kit), note: 'His health is the run’s: if the King falls, the Last Stand is over.' };
  if (u.def === 'duchess')
    return { ...base, kind: 'duchess', name: def.name, title: 'Her Grace the court goat', sub: def.role, moves: kitMoves(kit), note: 'She fights for herself, and may wander where she likes.' };
  if (u.side === 'hero') {
    const caller = u.owner !== undefined ? b.units.find((x) => x.id === u.owner) : undefined;
    return {
      ...base,
      kind: 'summon',
      name: def.name,
      sub: def.role,
      moves: kitMoves(kit),
      note: caller ? `Called up by ${heroName(caller.def)}${summonTime(b, u)}.` : 'Called up by a skill.',
    };
  }
  // (a foe: a boss if it is drawn larger or is one of the bosses, an elite or a herald by its codex entry)
  const e = entryOfDef(u.def);
  const cls: FoeClass = e?.class ?? (BOSS_IDS.includes(u.def) ? 'boss' : 'common');
  const kind: InfoKind = cls === 'elite' ? 'elite' : cls === 'boss' || cls === 'calamity' || (u.size ?? 1) > 1 || !!u.phase ? 'boss' : 'foe';
  const label = kind === 'boss' ? (cls === 'calamity' ? 'Calamity herald' : 'Boss') : kind === 'elite' ? 'Tower elite' : 'Foe';
  const pk = u.phase && !u.phase.done ? PHASE2[u.def] : undefined;
  return {
    ...base,
    kind,
    name: def.name,
    title: e?.epithet,
    sub: `${label} · ${familyOf(def)} · ${def.role}`,
    moves: kitMoves(kit),
    phase: pk ? phaseLines(pk, u.phase!.at) : [],
    tips: tipsOf(def, kit),
    lore: e ? FOE_LORE[e.id] : undefined,
  };
}
