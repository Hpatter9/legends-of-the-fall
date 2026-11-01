// The JRPG results screen's rules (JRPG-RECAP, the owner's ask: "A more typical JRPG end-of-fight recap. With a level up showing what
// stats went up and how much"): for each hero, the XP it had before and after, where its bar stood, the levels it rose, the hp and
// attack those levels added (old and new, from the real level rules in `levels.ts`), the skills they opened (skill 2 at
// `SKILL2_LEVEL`, the ultimate at `ULT_LEVEL`) and the talent points and badges of the deep milestones; the count-ups' easing; the
// MVP's line; and the lines the screen lists under the party (what the old short card said, bar the levels, which the rows now show).
// Pure rules: no Pixi, no DOM.

import { KITS, ULT_LEVEL } from './abilities';
import { HERO_KITS, SKILL2_LEVEL } from './heroKits';
import { BADGE_NAMES, badgeOf, lastingBoost, levelBoost, levelOf, MAX_LEVEL, MILESTONES, RUN_MAX_LEVEL, xpFor } from './levels';
import { UNITS } from './units';
import { lvMult, xpNeed } from './stand';
import { scoreRises, type ScoreRise } from './statLines';
import { waveNotes, type WaveMoments, type WaveNote } from './waveCard';

/** Which level rules a hero's XP is read by: a hero kind's lasting level (to `MAX_LEVEL`), or a spire or Calamity run's own (to 30). */
export type LevelRule = 'lasting' | 'run' | 'stand';

/** What multiplies a kind's base hp and attack besides its level (its rank, a run hero's grade and gear); 1 and 1 when nothing does. */
export interface StatMult {
  hp: number;
  atk: number;
}

const capOf = (rule: LevelRule): number => (rule === 'lasting' ? MAX_LEVEL : RUN_MAX_LEVEL);

/** Where a total of XP puts a hero: its level, and how full the bar to the next is (0 to 1; full at the top level). */
export function barOf(xp: number, rule: LevelRule = 'lasting'): { level: number; fill: number } {
  const level = levelOf(Math.max(0, xp), capOf(rule));
  if (level >= capOf(rule)) return { level, fill: 1 };
  const start = xpFor(level);
  const need = xpFor(level + 1) - start;
  return { level, fill: need > 0 ? Math.max(0, Math.min(1, (xp - start) / need)) : 1 };
}

/** A kind's hp and attack at a level (its base times the level's boost and `mult`), in whole numbers. */
export function statsAt(kind: string, level: number, rule: LevelRule = 'lasting', mult: StatMult = { hp: 1, atk: 1 }): { hp: number; atk: number } {
  const def = UNITS[kind];
  if (!def) return { hp: 0, atk: 0 };
  const b = rule === 'run' ? levelBoost(level) : lastingBoost(level);
  return { hp: Math.round(def.hp * b.hp * mult.hp), atk: Math.round(def.atk * b.atk * mult.atk) };
}

/** One stat a level-up raised: its name, the old and new values, and the gain. */
export interface StatRise {
  stat: 'HP' | 'ATK';
  from: number;
  to: number;
  gain: number;
}

/** The stats that rose between two levels (only those that did: a level never touches defence or range). */
export function statRises(kind: string, from: number, to: number, rule: LevelRule = 'lasting', mult?: StatMult): StatRise[] {
  if (to <= from) return [];
  const a = statsAt(kind, from, rule, mult);
  const b = statsAt(kind, to, rule, mult);
  const out: StatRise[] = [];
  if (b.hp > a.hp) out.push({ stat: 'HP', from: a.hp, to: b.hp, gain: b.hp - a.hp });
  if (b.atk > a.atk) out.push({ stat: 'ATK', from: a.atk, to: b.atk, gain: b.atk - a.atk });
  return out;
}

/** Something a level-up opened: a skill, the ultimate, a talent point, a new badge. */
export interface Learnt {
  kind: 'skill' | 'ult' | 'talent' | 'badge';
  text: string;
}

/** What the levels from `from` (exclusive) to `to` (inclusive) opened, in the order they were reached. */
export function learntBetween(kind: string, from: number, to: number, rule: LevelRule = 'lasting'): Learnt[] {
  const out: Learnt[] = [];
  const crossed = (lv: number) => from < lv && to >= lv;
  const s2 = HERO_KITS()[kind]?.s2.skill.name;
  if (s2 && crossed(SKILL2_LEVEL)) out.push({ kind: 'skill', text: `New skill: ${s2}!` });
  const ult = KITS[kind]?.ultimate;
  if (ult && crossed(ult.unlock ?? ULT_LEVEL)) out.push({ kind: 'ult', text: `Ultimate unlocked: ${ult.name}!` });
  // (the deep milestones are a kind's lasting levels only: a run's own levels stop at 30)
  if (rule === 'lasting') {
    const points = MILESTONES.filter((m) => m.point && crossed(m.level)).length;
    if (points) out.push({ kind: 'talent', text: `Talent point${points > 1 ? `s +${points}` : ' +1'}` });
    if (badgeOf(to) > badgeOf(from)) out.push({ kind: 'badge', text: `${BADGE_NAMES[badgeOf(to)]} badge earned` });
  }
  return out;
}

/** A hero's growth over a fight (or a whole run): the XP before and after, the levels and bars at each end, the stats risen and
 *  what was opened. */
export interface HeroGrowth {
  kind: string;
  rule: LevelRule;
  xpFrom: number;
  xpTo: number;
  gained: number;
  from: number;
  to: number;
  fillFrom: number;
  fillTo: number;
  stats: StatRise[];
  /** The ability scores (and on a proficiency step, to hit and skill DC) those levels raised (STATS batch 3). */
  scores: ScoreRise[];
  learnt: Learnt[];
  /** At the top level already: the bar stays full and the XP has nowhere to go. */
  top: boolean;
}

export function heroGrowth(kind: string, xpFrom: number, xpTo: number, rule: LevelRule = 'lasting', mult?: StatMult, rank = 1, grade = 1): HeroGrowth {
  const lo = Math.max(0, Math.min(xpFrom, xpTo));
  const hi = Math.max(lo, xpTo);
  const a = barOf(lo, rule);
  const b = barOf(hi, rule);
  return {
    kind,
    rule,
    xpFrom: lo,
    xpTo: hi,
    gained: hi - lo,
    from: a.level,
    to: b.level,
    fillFrom: a.fill,
    fillTo: b.fill,
    stats: statRises(kind, a.level, b.level, rule, mult),
    scores: scoreRises(kind, a.level, b.level, rank, grade),
    learnt: learntBetween(kind, a.level, b.level, rule),
    top: b.level >= capOf(rule),
  };
}

/** A Last Stand hero's growth over its run: its run levels from 0 to `lv`, its bar `xp` of the way to the next (`stand.ts`'s
 *  `xpNeed`), and the hp and attack those levels added (`lvMult`) on `base`, its stats as it began the run. Nothing is opened: the
 *  Stand's levels are its own, and the skills go by the kind's lasting level. */
export function standGrowth(kind: string, lv: number, xp: number, base: { hp: number; atk: number }): HeroGrowth {
  const to = Math.max(0, Math.floor(lv));
  const m = lvMult(to);
  const stats: StatRise[] = [];
  const hp = Math.round(base.hp * m.hp);
  const atk = Math.round(base.atk * m.atk);
  if (to > 0 && hp > base.hp) stats.push({ stat: 'HP', from: base.hp, to: hp, gain: hp - base.hp });
  if (to > 0 && atk > base.atk) stats.push({ stat: 'ATK', from: base.atk, to: atk, gain: atk - base.atk });
  return { kind, rule: 'stand', xpFrom: 0, xpTo: 0, gained: 0, from: 0, to, fillFrom: 0, fillTo: Math.max(0, Math.min(1, xp / xpNeed(to + 1))), stats, scores: [], learnt: [], top: false };
}

/** The XP still to find for the next level (0 at the top). */
export function xpToNext(xp: number, rule: LevelRule = 'lasting'): number {
  const level = levelOf(Math.max(0, xp), capOf(rule));
  return level >= capOf(rule) ? 0 : xpFor(level + 1) - xp;
}

/** The count-ups' easing: quick at first, settling on the end value. */
export const ease = (t: number): number => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/** A count-up's figure a share `t` (0 to 1) of the way through. */
export const countAt = (from: number, to: number, t: number): number => Math.round(from + (to - from) * ease(t));

/** A hero's bar a share `t` of the way through its fill: the XP so far, the level it reads and how full that level's bar is. The
 *  bar empties and fills again at each level crossed, as the level ticks over. */
export function growthAt(g: HeroGrowth, t: number): { xp: number; level: number; fill: number } {
  if (g.rule === 'stand') {
    // (a Last Stand hero's levels are counted over the run, from 0, each one a full bar: no XP figure)
    const span = g.to - g.from + g.fillTo;
    const p = span * ease(t);
    const level = Math.min(g.to, g.from + Math.floor(p));
    return { xp: 0, level, fill: level >= g.to ? Math.min(g.fillTo, Math.max(0, p - (g.to - g.from))) : p - Math.floor(p) };
  }
  const xp = countAt(g.xpFrom, g.xpTo, t);
  return { xp, ...barOf(xp, g.rule) };
}

/** A hero's numbers for the MVP's line. */
export interface MvpStats {
  dealt: number;
  healed: number;
  taken: number;
  kills: number;
}

const num = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** The MVP's short line: what they were (by what they did most) and their figures ("Led the charge · 1,240 damage · 5 felled"). */
export function mvpLine(s: MvpStats): string {
  const lead = s.healed > s.dealt && s.healed >= s.taken / 2 ? 'Kept the company standing' : s.taken / 2 > s.dealt && s.taken / 2 > s.healed ? 'Held the line' : s.kills >= 5 ? 'Cut through the ranks' : 'Led the charge';
  const facts = [s.dealt > 0 ? `${num(s.dealt)} damage` : '', s.healed > 0 ? `${num(s.healed)} healing` : '', s.kills > 0 ? `${s.kills} felled` : '', s.dealt <= 0 && s.healed <= 0 && s.taken > 0 ? `${num(s.taken)} damage taken` : ''].filter(Boolean);
  return [lead, ...facts].join(' · ');
}

/** A quest's change in a fight: one finished (back to the tavern), one found (on the board), or one moved on (its progress now). */
export interface QuestMove {
  title: string;
  kind: 'done' | 'found' | 'rift' | 'advanced';
  now?: number;
  need?: number;
}

/** One line under the party. */
export interface ResultLine {
  kind: WaveNote['kind'] | 'bench';
  text: string;
}

/** The quests a fight moved, as lines: finished first, then those found, then those that moved on. */
export function questLines(moves: readonly QuestMove[]): ResultLine[] {
  const order = ['done', 'found', 'rift', 'advanced'];
  return [...moves]
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .map((q) => ({
      kind: 'quest' as const,
      text:
        q.kind === 'done'
          ? `Quest complete: ${q.title} · return to the tavern`
          : q.kind === 'found'
            ? `Spoils found: ${q.title} · see the quest board`
            : q.kind === 'rift'
              ? `A voice in the rift: ${q.title} · see the quest board`
              : `Quest: ${q.title} ${q.now ?? 0}/${q.need ?? 0}`,
    }));
}

/** The quests that moved, from their progress before and after (`id` to progress; a quest gone from `after` was handed in or dropped,
 *  and says nothing) and those `done` (ready to hand in) and `found` (new on the board). `title` names a quest. */
export function questMoves(before: Readonly<Record<string, number>>, after: Readonly<Record<string, { now: number; need: number }>>, done: readonly string[], found: readonly { id: string; rift: boolean }[], title: (id: string) => string): QuestMove[] {
  const out: QuestMove[] = done.map((id) => ({ title: title(id), kind: 'done' }));
  for (const f of found) out.push({ title: title(f.id), kind: f.rift ? 'rift' : 'found' });
  for (const [id, p] of Object.entries(after)) {
    if (done.includes(id) || p.now <= (before[id] ?? 0) || p.now >= p.need) continue;
    out.push({ title: title(id), kind: 'advanced', now: p.now, need: p.need });
  }
  return out;
}

/** Everything the screen lists under the party for a wave: the short card's lines (the finds, the War Horn, the fallen, the hearts),
 *  without its level and ultimate lines (each hero's row shows those now, the bench's levels too), then the bench's XP and the quests. */
export function resultLines(m: WaveMoments, opts: { bench?: { n: number; each: number }; quests?: readonly QuestMove[] } = {}): ResultLine[] {
  // (the card's own quest lines are left out: the screen words them from `opts.quests`)
  const out: ResultLine[] = waveNotes({ ...m, quests: [] }).filter((n) => n.kind !== 'level' && n.kind !== 'ult');
  if (opts.bench && opts.bench.n > 0 && opts.bench.each > 0) out.push({ kind: 'bench', text: `The bench trained: +${num(opts.bench.each)} XP each (${opts.bench.n} ${opts.bench.n === 1 ? 'hero' : 'heroes'})` });
  out.push(...questLines(opts.quests ?? []));
  return out;
}

/** The rows the party list shows: every hero that fought, in the order given, then any benched hero that rose a level (a benched
 *  hero that did not is summed in the bench's line). */
export function partyRows<T extends { kind: string; bench?: boolean; growth: HeroGrowth }>(rows: readonly T[]): T[] {
  return [...rows.filter((r) => !r.bench), ...rows.filter((r) => r.bench && r.growth.to > r.growth.from)];
}
