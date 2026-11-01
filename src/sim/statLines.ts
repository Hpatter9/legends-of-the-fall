// STATS batch 3: the words and numbers the pages show for the six ability scores (the hero sheet's Stats panel, the unit card's
// rows, the level-up recap's score lines, the gear compare). Pure rules: no Pixi, no DOM, no draw from any fight stream. Every number
// is read through `stats.ts` (`scoresOf`, `derivedOf`, `foeStatsOf`, `scoresAtLevel`), never copied from its formulas, so the pages
// stay true as the later batches change what a score does.

import {
  ABILITIES, ABILITY_NAME, ABILITY_SHORT, ASI_LEVELS, BOON_LEVELS, GLANCE_BAND, derivedOf, foeStatsOf, modOf, orderOf, profileOf, scoresAtLevel,
  type Ability, type Derived, type Scores, type StatInput, type StatProfile,
} from './stats';
import type { UnitDef } from './units';
import { ATHLETICS_MOD, cooldownShare, ultFillShare } from './statRest';
import { poolNumbers } from './heroKits';

/** Which effects of the scores a fight really has now. The page shows only these: a line for an effect that is not live would promise
 *  what a fight does not do. Each later batch switches its own on (the first line of its change): batch 4 `crit`, `initiative`, `blowSpeed`
 *  (DEX's), batch 5 `shove`, batch 6 `cooldown`, `ultFill`, `pools`, `perception`. Power (blows, skills, health), the figures AC, to hit and
 *  skill DC, and the saves are shown as the design's data. */
export const LIVE = {
  power: true,
  ac: true,
  toHit: true,
  dc: true,
  saves: true,
  crit: true,
  initiative: true,
  blowSpeed: true,
  shove: true,
  cooldown: true,
  ultFill: true,
  pools: true,
  perception: true,
  /** STATS batch 6: Athletics, the climb at STR +4. */
  climb: true,
};
export type LiveKey = keyof typeof LIVE;

/** A signed number the way the sheet writes it: "+3", "−1" (a true minus), "+0". */
export const signed = (n: number): string => (n < 0 ? `−${-n}` : `+${n}`);
/** A change of share as a signed percentage ("+10%", "−5%"). */
export const signedPct = (share: number): string => signed(Math.round(share * 100)) + '%';

/** A hero's level, whole rank (as `heroRank` counts it) and grade: what `scoresOf` needs. */
export type HeroAt = Required<Pick<StatInput, 'level' | 'rank' | 'grade'>> & Pick<StatInput, 'extra'>;

/** One tile of the Stats panel. */
export interface ScoreTile {
  ability: Ability;
  short: string;
  score: number;
  mod: number;
  /** The calling's best score (a gold rim) and its weakest (a dim one). */
  primary: boolean;
  weak: boolean;
}

/** The six tiles, in D&D's order. */
export function scoreTiles(p: StatProfile, d: Derived): ScoreTile[] {
  const order = orderOf(p);
  return ABILITIES.map((a) => ({ ability: a, short: ABILITY_SHORT[a], score: d.scores[a], mod: d.mods[a], primary: a === order[0], weak: a === order[order.length - 1] }));
}

/** One line of the figures under the tiles. */
export interface FigureRow {
  /** Which line of explanation a tap opens. */
  key: 'ac' | 'hit' | 'dc' | 'crit' | 'init' | 'prof' | 'pool' | 'ult';
  label: string;
  value: string;
}

/** The derived figures the sheet lists: Armour Class, to hit, skill DC, crit, initiative, proficiency. */
export function figureRows(d: Derived): FigureRow[] {
  const rows: (FigureRow | false)[] = [
    LIVE.ac && { key: 'ac', label: 'AC', value: String(d.ac) },
    LIVE.toHit && { key: 'hit', label: 'To hit', value: signed(d.toHit) },
    LIVE.dc && { key: 'dc', label: 'Skill DC', value: String(d.dc) },
    LIVE.crit && { key: 'crit', label: 'Crit', value: `${Math.round(d.crit * 100)}%` },
    LIVE.initiative && { key: 'init', label: 'Initiative', value: signed(d.initiative) },
    { key: 'prof', label: 'Proficiency', value: signed(d.proficiency) },
  ];
  return rows.filter((r): r is FigureRow => !!r);
}

/** A saving throw as the sheet lists it (trained saves are marked). */
export interface SaveCell {
  ability: Ability;
  short: string;
  bonus: number;
  trained: boolean;
}
export function saveCells(p: StatProfile, d: Derived): SaveCell[] {
  if (!LIVE.saves) return [];
  return ABILITIES.map((a) => ({ ability: a, short: ABILITY_SHORT[a], bonus: d.saves[a], trained: p.saves.includes(a) }));
}

/** The one plain line a tap on a figure opens. */
export function figureWhy(key: FigureRow['key'], d: Derived): string {
  switch (key) {
    case 'ac': return `A foe rolls a d20 and adds its to hit; it must reach ${d.ac} to hit fully, and a roll up to ${GLANCE_BAND} short only glances.`;
    case 'hit': return `Your blow rolls a d20 and adds ${signed(d.toHit)} (proficiency and your blow score); it must reach the foe's AC. A natural 20 is always a crit.`;
    case 'dc': return `Your skills' save DC is ${d.dc}: a foe rolls a d20 and adds its save, and a save halves what the skill does.`;
    case 'crit': return `A natural 20 crits (5%), and every point of DEX above +0 adds 1% more.`;
    case 'init': return `Initiative is the DEX modifier: ${signed(d.initiative)} on the d20 that says who acts first.`;
    case 'prof': return `Proficiency ${signed(d.proficiency)} grows with level and is added to to hit, skill DC and the two saves the calling is trained in.`;
    case 'pool': return `The pool's top and how fast it fills follow CON for stamina and the casting score for mana: 3 SP or 5 MP and 4% a point, against the heroes' average.`;
    case 'ult': return `The ultimate's meter fills 3% faster a point of CHA, against the heroes' average.`;
  }
}

/** Where a hero stands for the lines that read it beside its scores (its kind and level): its pool, and the shares counted against the
 *  roster's mean at its level (cooldowns, the ultimate's fill). */
export interface WhyAt {
  kind: string;
  at: StatInput;
}

/** The pool a hero has at `at` as the sheet writes it: "SP 63 (+8% refill)". */
export function poolLine(w: WhyAt): { label: string; value: string; ability: Ability } | undefined {
  const n = LIVE.pools ? poolNumbers(w.kind, w.at) : undefined;
  const p = profileOf(w.kind);
  if (!n || !p) return undefined;
  const fill = Math.round((n.fill - 1) * 100);
  return { label: n.pool === 'mana' ? 'MP' : 'SP', value: `${Math.round(n.top)}${fill ? ` (${signed(fill)}% refill)` : ''}`, ability: n.pool === 'mana' ? p.cast : 'con' };
}

/** What a score does for this hero, in numbers (the tap on a tile): only the effects it has. `w` (the hero's kind and level) adds the lines
 *  that read them: the pool, and the cooldowns and ultimate fill, counted against the heroes' average at its level. */
export function scoreWhy(p: StatProfile, d: Derived, a: Ability, w?: WhyAt): string {
  const m = d.mods[a];
  const parts: string[] = [];
  const level = w?.at.level ?? 1;
  if (LIVE.power && p.blow === a) parts.push(`blows ${signedPct(d.atkMult - 1)}`);
  if (LIVE.power && p.cast === a) parts.push(`skills ${signedPct(d.castMult - 1)}`);
  const pool = w ? poolLine(w) : undefined;
  switch (a) {
    case 'str':
      if (LIVE.shove) parts.push('shoves further, resists shoves');
      if (LIVE.climb) parts.push(m >= ATHLETICS_MOD ? 'climbs a step higher (Athletics)' : `climbs a step higher at ${signed(ATHLETICS_MOD)}`);
      break;
    case 'dex': {
      if (LIVE.ac) parts.push(`AC ${signed(m)}`);
      if (LIVE.crit) parts.push(`crit ${Math.round(d.crit * 100)}%`);
      // (blows quicken with the DEX gained since level 1: every level-1 blow time is the kind's own)
      const quick = d.blowSpeed / derivedOf(p).blowSpeed - 1;
      if (LIVE.blowSpeed && Math.round(quick * 100)) parts.push(`blows ${signedPct(quick)} faster than at level 1`);
      if (LIVE.initiative) parts.push(`initiative ${signed(d.initiative)}`);
      break;
    }
    case 'con': parts.push(`health ${signedPct(d.hpMult - 1)}`); break;
    case 'int': {
      const sooner = 1 - cooldownShare(d, level);
      if (LIVE.cooldown && Math.round(sooner * 100)) parts.push(`skills ${signedPct(sooner)} sooner`);
      break;
    }
    case 'wis': {
      const seen = Math.round(m * 10);
      if (LIVE.perception && seen) parts.push(seen > 0 ? `sees through ${seen}% of cover and smoke` : `cover and smoke fool it ${-seen}% more`);
      break;
    }
    case 'cha': {
      const fill = ultFillShare(d, level) - 1;
      if (LIVE.ultFill && Math.round(fill * 100)) parts.push(`ultimate fills ${signedPct(fill)} ${fill > 0 ? 'faster' : 'more slowly'}`);
      break;
    }
  }
  if (pool && pool.ability === a) parts.push(`${pool.label} ${pool.value}`);
  if (LIVE.saves) parts.push(`${ABILITY_SHORT[a]} save ${signed(d.saves[a])}${p.saves.includes(a) ? ' (trained)' : ''}`);
  return `${ABILITY_NAME[a]} ${d.scores[a]} (${signed(m)})${parts.length ? `: ${parts.join(' · ')}` : ''}`;
}

/** The next level that raises a score, and what it adds: "Level 12 · STR +2". Null when every improvement is gained. */
export function nextImprovement(p: StatProfile, level: number): string | null {
  const next = [...ASI_LEVELS, ...BOON_LEVELS].filter((l) => l > level).sort((x, y) => x - y)[0];
  if (next === undefined) return null;
  const now = scoresAtLevel(p, level);
  const then = scoresAtLevel(p, next);
  const gains = ABILITIES.filter((a) => then[a] > now[a]).map((a) => `${ABILITY_SHORT[a]} +${then[a] - now[a]}`);
  return gains.length ? `Level ${next} · ${gains.join(', ')}` : null;
}

/** Everything the hero sheet's Stats panel shows, for a kind at a level, rank and grade. Undefined for a kind without a profile. */
export interface StatPanel {
  /** The kind and what its scores were worked out at (for the lines that read them, `scoreWhy`). */
  why: WhyAt;
  tiles: ScoreTile[];
  figures: FigureRow[];
  saves: SaveCell[];
  proficiency: number;
  next: string | null;
  derived: Derived;
  profile: StatProfile;
}
export function statPanelOf(kind: string, at: HeroAt, extra?: Partial<Scores>): StatPanel | undefined {
  const profile = profileOf(kind);
  if (!profile) return undefined;
  const input = { ...at, extra: extra ?? at.extra };
  const derived = derivedOf(profile, input);
  const why: WhyAt = { kind, at: input };
  const figures = figureRows(derived);
  // (STATS batch 6: the pool and the ultimate's fill, which read the hero's kind and level)
  const pool = poolLine(why);
  // (the figure is the top alone, so it fits a third of a phone's width; the tap line adds the refill)
  if (pool) figures.push({ key: 'pool', label: pool.label, value: pool.value.split(' ')[0] });
  const fill = ultFillShare(derived, at.level) - 1;
  if (LIVE.ultFill) figures.push({ key: 'ult', label: 'Ultimate', value: signedPct(fill) });
  return { why, tiles: scoreTiles(profile, derived), figures, saves: saveCells(profile, derived), proficiency: derived.proficiency, next: nextImprovement(profile, at.level), derived, profile };
}

// ---- The unit card ----

/** A card's row of six scores, and the rolls under it (AC, to hit, DC, initiative). */
export interface CardScores {
  tiles: { short: string; score: number; mod: number }[];
  /** "AC 16 · To hit +8 · DC 16 · Init −1" */
  rolls: string;
}
const cardOf = (scores: Scores, mods: Scores, ac: number, toHit: number, dc: number, init: number): CardScores => ({
  tiles: ABILITIES.map((a) => ({ short: ABILITY_SHORT[a], score: scores[a], mod: mods[a] })),
  rolls: [LIVE.ac && `AC ${ac}`, LIVE.toHit && `To hit ${signed(toHit)}`, LIVE.dc && `DC ${dc}`, LIVE.initiative && `Init ${signed(init)}`].filter(Boolean).join(' · '),
});

/** A hero's card scores. A unit does not carry its taken rank, only its awakened steps: an awakened hero counts as `rank` 4 plus those,
 *  any other as rank 1 (the page's sheet, which knows the meta, shows the exact rank). */
export function heroCardScores(kind: string, level: number, grade: number, awaken: number, rank?: number, extra?: Partial<Scores>): CardScores | undefined {
  const p = profileOf(kind);
  if (!p) return undefined;
  const d = derivedOf(p, { level, grade, extra, rank: rank ?? (awaken > 0 ? 4 + awaken : 1) });
  return cardOf(d.scores, d.mods, d.ac, d.toHit, d.dc, d.initiative);
}

/** A boss's Legendary Resistance (STATS batch 5): its old ladder against hard control, named as the design's section 3.3 names it. A boss
 *  makes no saving throws; this is its save. */
export const LEGENDARY_RESISTANCE = { name: 'Legendary Resistance', text: 'hard control fades faster, and three in a row it shrugs off' } as const;

/** A foe's card scores from its family block; the card has no army tier to read, so it shows the Normal tier's. */
export function foeCardScores(def: Pick<UnitDef, 'id' | 'sheet' | 'shot' | 'flies'>, tier = 0): CardScores {
  const f = foeStatsOf(def, tier);
  return cardOf(f.scores, f.mods, f.ac, f.toHit, f.dc, f.initiative);
}

// ---- The level-up recap ----

/** A score or figure that rose between two levels. */
export interface ScoreRise {
  label: string;
  from: number;
  to: number;
  gain: number;
  /** Why: "ability score improvement", "epic boon", or the figure's own. */
  note: string;
  /** Written signed ("+5 → +6") rather than plain. */
  signed: boolean;
}

/** The scores (and on a proficiency step, to hit and skill DC) that rose between two levels. Only the levels that change them show. */
export function scoreRises(kind: string, from: number, to: number, rank = 1, grade = 1): ScoreRise[] {
  const p = profileOf(kind);
  if (!p || to <= from) return [];
  const a = derivedOf(p, { level: from, rank, grade });
  const b = derivedOf(p, { level: to, rank, grade });
  const out: ScoreRise[] = [];
  const crossed = (levels: readonly number[]) => levels.some((l) => from < l && to >= l);
  for (const k of ABILITIES) {
    if (b.scores[k] <= a.scores[k]) continue;
    const mod = b.mods[k] > a.mods[k] ? ` · ${ABILITY_SHORT[k]} ${signed(b.mods[k])}` : '';
    const why = crossed(ASI_LEVELS) && !crossed(BOON_LEVELS) ? 'improvement' : crossed(BOON_LEVELS) && !crossed(ASI_LEVELS) ? 'epic boon' : 'improvement';
    out.push({ label: ABILITY_SHORT[k], from: a.scores[k], to: b.scores[k], gain: b.scores[k] - a.scores[k], note: why + mod, signed: false });
  }
  if (b.proficiency > a.proficiency) {
    out.push({ label: 'To hit', from: a.toHit, to: b.toHit, gain: b.toHit - a.toHit, note: 'proficiency', signed: true });
    out.push({ label: 'Skill DC', from: a.dc, to: b.dc, gain: b.dc - a.dc, note: 'proficiency', signed: false });
  }
  return out;
}

// ---- The gear compare ----

/** A gear piece's score points (`EquipStats.scores`), when it has any. */
export function gearScores(stats: { scores?: Partial<Scores> } | undefined): Partial<Scores> | undefined {
  const s = stats?.scores;
  return s && ABILITIES.some((a) => (s[a] ?? 0) !== 0) ? s : undefined;
}

/** What a score's change does, in the page's words ("blows +5%", "to hit +1"): the clauses for `a` between two derived sets of one hero. */
export function scoreEffects(p: StatProfile, before: Derived, after: Derived, a: Ability, figures = true): string[] {
  const fx: string[] = [];
  const share = (label: string, x: number, y: number) => { if (Math.round((y - x) * 100) !== 0) fx.push(`${label} ${signedPct(y - x)}`); };
  const step = (label: string, x: number, y: number) => { if (y !== x) fx.push(`${label} ${signed(y - x)}`); };
  if (LIVE.power && p.blow === a) share('blows', before.atkMult, after.atkMult);
  if (LIVE.power && p.cast === a && p.blow !== a) share('skills', before.castMult, after.castMult);
  if (LIVE.power && p.cast === a && p.blow === a && fx.length) fx[fx.length - 1] = fx[fx.length - 1].replace('blows', 'blows and skills');
  if (LIVE.power && a === 'con') share('health', before.hpMult, after.hpMult);
  if (a === 'dex' && LIVE.blowSpeed) share('blows', before.blowSpeed, after.blowSpeed);
  if (a === 'int' && LIVE.cooldown) share('skills sooner', 1 / before.cooldown, 1 / after.cooldown);
  if (a === 'cha' && LIVE.ultFill) share('ultimate', before.ultFill, after.ultFill);
  if (figures && LIVE.toHit) step('to hit', before.toHit, after.toHit);
  if (figures && LIVE.dc) step('skill DC', before.dc, after.dc);
  if (figures && LIVE.ac) step('AC', before.ac, after.ac);
  return fx;
}

/** What a swap of score points means for a hero: a line per score that changes ("STR 19 → 20 (+4 → +5): blows +5%, to hit +1"),
 *  saying so when the modifier does not move. `delta` is the points gained (negative for a loss). */
export function scoreCompare(kind: string, at: HeroAt, delta: Partial<Scores>): string[] {
  const p = profileOf(kind);
  if (!p) return [];
  const before = derivedOf(p, at);
  // (the hero's own extra points, from what it wears and its talents, plus the points the swap adds or takes)
  const after = derivedOf(p, { ...at, extra: Object.fromEntries(ABILITIES.map((a) => [a, (at.extra?.[a] ?? 0) + (delta[a] ?? 0)])) });
  const out: string[] = [];
  for (const a of ABILITIES) {
    const d = delta[a] ?? 0;
    if (!d) continue;
    const s0 = before.scores[a];
    const s1 = after.scores[a];
    if (s0 === s1) { out.push(`${ABILITY_SHORT[a]} stays ${s0} (at its top)`); continue; }
    if (modOf(s0) === modOf(s1)) { out.push(`${ABILITY_SHORT[a]} ${s0} → ${s1}, ${signed(modOf(s0))} still`); continue; }
    const fx = scoreEffects(p, before, after, a);
    out.push(`${ABILITY_SHORT[a]} ${s0} → ${s1} (${signed(modOf(s0))} → ${signed(modOf(s1))})${fx.length ? `: ${fx.join(', ')}` : ''}`);
  }
  return out;
}
