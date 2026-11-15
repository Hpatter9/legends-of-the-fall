// HERO-RISE (docs/notes/hero-rise.md): the owner's ask, "when doing the auto upgrade, there should be a small bar over them that shows what
// stats went up, and then what skills were earned on a skill up". What a hero is worth before and after a rise (a merge, Auto merge, a rank
// up, an awakening, talents learned, a level or a skill's level gained), and what the plate over it says: the numbers that went up ("+12 HP",
// "+3 ATK") and what was earned ("New: Shield Rush", "Shield Wall Lv 3", "Talent: Iron Resolve").
//
// Pure, and reading only: a hero is read from a unit the fight would make of it (a placed one, or one made on a scratch copy of a battle,
// `previewUnit`); nothing is written to the run, the save or the battle. No DOM, no Pixi.

import { atkOf, defenceOf, type Battle, type Boost, type Unit } from './sim/battle';
import { keyOf, ultimateOf } from './sim/abilities';
import { heroKitOf, slotOpen, topOf } from './sim/heroKits';
import { previewUnit } from './unitInfoRules';
import { boostOf, type Owned } from './sim/run';
import { heroRank, awakenedOf } from './sim/awaken';
import { levelOfKind } from './sim/levels';
import { heroStats, nodeOf, picksOf } from './sim/talents';
import type { Meta } from './sim/meta';

/** One skill a hero has open: its fixed key, its name, where it sits, and its level by use. */
export interface SkillShot {
  key: string;
  name: string;
  label: string;
  lv: number;
}

/** A hero's worth at one moment: the numbers a plate compares, its skills, and its talents' and abilities' names. */
export interface RiseShot {
  level: number;
  grade: number;
  rank: number;
  hp: number;
  atk: number;
  def: number;
  pool: number;
  crit: number;
  dodge: number;
  skills: SkillShot[];
  /** Talents learned and the abilities its gear, talents and awakening give, by name. */
  perks: string[];
}

/** A hero read from its unit (and, for a hero of the save, its learned talents by name). */
export function shotOfUnit(u: Unit, talents: readonly string[] = []): RiseShot {
  const hk = heroKitOf(u);
  const skills: SkillShot[] = [];
  if (hk)
    hk.slots.forEach((slot, i) => {
      if (slotOpen(u, i + 1)) skills.push({ key: keyOf(slot.skill), name: slot.skill.name, label: `Skill ${i + 1}`, lv: u.skillLv?.[i] ?? 1 });
    });
  const ult = ultimateOf(u);
  if (ult) skills.push({ key: keyOf(ult), name: ult.name, label: 'Ultimate', lv: 1 });
  return {
    level: u.level ?? 1,
    grade: u.grade ?? 1,
    rank: u.rank ?? 0,
    hp: u.maxHp,
    atk: Math.round(atkOf(u)),
    def: Math.round(defenceOf(u)),
    pool: hk ? Math.floor(topOf(u, hk.pool)) : 0,
    crit: u.eq?.crit ?? 0,
    dodge: u.eq?.dodge ?? 0,
    skills,
    perks: [...talents, ...(u.eq?.abilities ?? []).map((a) => a.name)],
  };
}

/** A scratch battle to make units on (made once; nothing is ever placed on it). */
let scratch: Battle | null = null;

/** A hero of the save, as its lasting level, rank, awakening, talents, gear and skill levels make it (`main.ts`' `boostFor` outside a run's
 *  own levels): the hero page's and the tavern's. `make` builds the scratch battle (the caller's `startBattle`, so this module stays light). */
export function shotOfHero(m: Meta, kind: string, make: () => Battle): RiseShot {
  scratch ??= make();
  const h = { id: 0, kind, grade: 1 } as Owned;
  const awaken = awakenedOf(m, kind);
  const boost: Boost = { ...boostOf(h, heroRank(m, kind), levelOfKind(m, kind), heroStats(m, kind)), ...(awaken ? { awaken } : {}) };
  const talents = picksOf(m, kind).map((id) => nodeOf(kind, id)?.name).filter((n): n is string => !!n);
  return shotOfUnit(previewUnit(scratch, kind, boost), talents);
}

/** One line of a plate: a number that went up, or something earned. */
export interface RiseLine {
  kind: 'stat' | 'level' | 'grade' | 'new' | 'skill' | 'perk';
  text: string;
  /** An earned skill, for its painted icon. */
  skill?: { name: string; key: string };
}

/** What rose between two shots of a hero, in the order a plate shows it: its level or stars, then the numbers that went up, then the skills
 *  opened or levelled, then the talents and abilities gained. Empty when nothing went up (a plate is then not shown). */
export function riseOf(a: RiseShot, b: RiseShot): RiseLine[] {
  const out: RiseLine[] = [];
  if (b.level > a.level) out.push({ kind: 'level', text: `Level ${b.level}` });
  if (b.grade > a.grade) out.push({ kind: 'grade', text: '★'.repeat(b.grade) });
  else if (b.rank > a.rank) out.push({ kind: 'grade', text: `Rank ${b.rank}` });
  const stat = (n: number, label: string, pct = false) => {
    if (pct) {
      const d = Math.round(n * 100);
      if (d > 0) out.push({ kind: 'stat', text: `+${d}% ${label}` });
    } else if (Math.round(n) > 0) out.push({ kind: 'stat', text: `+${Math.round(n)} ${label}` });
  };
  stat(b.hp - a.hp, 'HP');
  stat(b.atk - a.atk, 'ATK');
  stat(b.def - a.def, 'DEF');
  stat(b.pool - a.pool, 'pool');
  stat(b.crit - a.crit, 'crit', true);
  stat(b.dodge - a.dodge, 'dodge', true);
  const had = new Map(a.skills.map((s) => [s.key, s]));
  for (const s of b.skills) {
    const was = had.get(s.key);
    if (!was) out.push({ kind: 'new', text: `New: ${s.name}`, skill: { name: s.name, key: s.key } });
    else if (s.lv > was.lv) out.push({ kind: 'skill', text: `${s.name} Lv ${s.lv}`, skill: { name: s.name, key: s.key } });
  }
  // (a talent that brings an ability of the same name is one thing earned, said once)
  const perks = new Set(a.perks);
  for (const p of new Set(b.perks)) if (!perks.has(p)) out.push({ kind: 'perk', text: `New: ${p}` });
  return out;
}

/** How many talents a plate names before it counts the rest ("+4 more"). */
export const PERKS_SHOWN = 2;

/** The stat lines joined as a plate's first line shows them ("+12 HP, +3 ATK"); the skills a line each; the talents and abilities on one line
 *  ("New: Tempered Steel, Sturdy Greaves +4 more"), so a hero who learned a whole tree at once still has a small plate. */
export function plateLines(r: readonly RiseLine[]): { head: string[]; stats: string; earned: RiseLine[] } {
  const perks = r.filter((l) => l.kind === 'perk').map((l) => l.text.replace(/^New: /, ''));
  const more = perks.length - PERKS_SHOWN;
  return {
    head: r.filter((l) => l.kind === 'level' || l.kind === 'grade').map((l) => l.text),
    stats: r.filter((l) => l.kind === 'stat').map((l) => l.text).join(', '),
    earned: [
      ...r.filter((l) => l.kind === 'new' || l.kind === 'skill'),
      ...(perks.length ? [{ kind: 'perk' as const, text: `New: ${perks.slice(0, PERKS_SHOWN).join(', ')}${more > 0 ? ` +${more} more` : ''}` }] : []),
    ],
  };
}

/** Where plates go when several heroes rise at once: each plate's box (its anchor's centre `x`, the top `y` it would sit above, and its size),
 *  laid so none covers another. A plate that would overlap one already laid in its round is lifted above it; when that would take it past
 *  the top of the screen (`topMin`), it is stacked downward under the plates it meets instead; it keeps inside the screen's sides, and above
 *  `bottomMax`. One with no room either way is queued for the next round (shown once the round before has gone). Returns each plate's
 *  left, top and round. */
export function layPlates(boxes: readonly { x: number; y: number; w: number; h: number }[], screenW: number, gap = 4, topMin = 4, bottomMax = Infinity): { left: number; top: number; round: number }[] {
  const rounds: { left: number; top: number; w: number; h: number }[][] = [];
  const out: { left: number; top: number; round: number }[] = [];
  const hits = (laid: { left: number; top: number; w: number; h: number }[], left: number, top: number, b: { w: number; h: number }) =>
    laid.find((o) => left < o.left + o.w && left + b.w > o.left && top < o.top + o.h + gap && top + b.h + gap > o.top);
  for (const b of boxes) {
    const left = Math.max(4, Math.min(screenW - b.w - 4, Math.round(b.x - b.w / 2)));
    const start = Math.max(topMin, Math.round(b.y - b.h - gap));
    for (let round = 0; ; round++) {
      const laid = (rounds[round] ??= []);
      // (lifted above every plate of the round it would cover, until it covers none; else pushed down under them)
      let top = start;
      for (let o = hits(laid, left, top, b); o; o = hits(laid, left, top, b)) top = o.top - b.h - gap;
      if (top < topMin) {
        top = start;
        for (let o = hits(laid, left, top, b); o; o = hits(laid, left, top, b)) top = o.top + o.h + gap;
      }
      if (round > 50 || (top >= topMin && top + b.h <= bottomMax)) {
        laid.push({ left, top, w: b.w, h: b.h });
        out.push({ left, top, round });
        break;
      }
    }
  }
  return out;
}
