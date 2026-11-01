// Skill levels by use (the skills overhaul's batch 5, docs/notes/skills-overhaul-design.md section 5, docs/notes/skills-5.md): every skill a hero
// kind fights with (its own three and a learned book's skill in a slot; the ultimate does not level, the owner's answer 2) earns use points, and
// five levels at 200, 600, 1,500 and 3,500 points make it stronger, then cheaper, then quicker and longer-lasting, and at Level 5 one step more.
//
// - A cast earns the skill's cooldown in whole seconds (`castPoints`, its Level 1 cooldown, so a level does not slow its own growth); a healer's
//   revive face 30, for its skill 2. A wave fought (placed when it settles, won or lost) gives each open skill 2. Auto-replay counts half.
// - The points are kept per hero kind under each skill's fixed key (`Meta.skillUse`): a Barbarian's Whirlwind and a Samurai's learned one each
//   have their own. No head start for old saves (the owner's answer 4): every skill starts at Level 1.
// - The levels reach the fight on the hero's boost (`Boost.skillLv`, set from `heroStats`), and `heroKitOf` builds the slots with them
//   (`kitWithLevels`). The spire and the Calamity build their heroes bare (`localBoost`), so their skills stay at Level 1 (the owner's answer 6),
//   and nothing is counted there.
//
// Pure rules: no Pixi, no DOM, no randomness; the counting reads only the settled fight.

import type { Battle, Unit } from './battle';
import { keyOf } from './abilities';
import { HERO_KITS, slotOpen, type HeroKit, type Slot } from './heroKits';
import { fightLoadout, kitWithLoadout } from './books';
import { LV5 } from './kits/lv5';
import type { Meta } from './meta';
import { ALL_HEROES, UNITS } from './units';

/** The use points each level starts at (Level 1 to 5). */
export const USE_AT: readonly number[] = [0, 200, 600, 1500, 3500];
export const MAX_LEVEL = 5;
/** Points stop counting at the top (Level 5, "Mastered"). */
export const MAX_USE = USE_AT[MAX_LEVEL - 1];

/** What each level does to a skill: its strength (`tune`), cost and cooldown as multiples, and its durations lengthened by a share (added to the
 *  caster's `dur` talent while it is cast). The design's table. */
export interface LevelStep {
  pow: number;
  cost: number;
  cd: number;
  dur: number;
}
export const LEVEL_STEPS: readonly LevelStep[] = [
  { pow: 1, cost: 1, cd: 1, dur: 0 },
  { pow: 1.08, cost: 1, cd: 1, dur: 0 },
  { pow: 1.15, cost: 0.9, cd: 1, dur: 0 },
  { pow: 1.22, cost: 0.9, cd: 0.9, dur: 0.15 },
  { pow: 1.3, cost: 0.85, cd: 0.85, dur: 0.25 },
];

/** The Level 5 step, by the design's rule (`kits/lv5.ts` has each skill's): a skill that makes several things makes one more (`extra`), one that
 *  reaches reaches a tile further (`reach`), any other lasts 15% longer again (`dur`); one with nothing that lasts (a plain blow, a heal) hits
 *  harder again (`pow`, this batch's answer to a step that would do nothing). */
export type Lv5Step = 'extra' | 'reach' | 'dur' | 'pow';
export const LV5_DUR = 0.15;
export const LV5_POW = 0.08;

/** The two named skills (the tier skills' old riders, moved here): Summon Beast lets three wolves stand from Level 3 and calls a dire wolf beside
 *  each wolf at Level 5; Conjure Treant lets a second treant stand at Level 5 (its `extra` step). */
export const SUMMON_BEAST = 'Call of the Wild';
export const CONJURE_TREANT = 'Call Treant';

/** Points a wave fought gives each open skill; a revive face's cast; auto-replay's share. */
export const FIELD_POINTS = 2;
export const REVIVE_POINTS = 30;
export const AUTO_SHARE = 0.5;

/** The share of a settled wave's use a run counts (the owner's answer): skill use comes from army runs only, half under auto-replay. Every
 *  other mode is a separate game and counts nothing: the daily, quest battles, the spire, the Calamity and the Last Stand (whose end card no
 *  longer settles its tally, `standView.ts`). A run with no mode is an ordinary army run. */
export function useShare(mode: { kind: string; practice?: boolean } | undefined, auto: boolean): number {
  if (mode && mode.kind !== 'army') return 0;
  return auto ? AUTO_SHARE : 1;
}

/** Points a cast of a skill with this (Level 1) cooldown earns: its cooldown in whole seconds. */
export const castPoints = (cdMs: number): number => Math.max(1, Math.round(cdMs / 1000));

/** The level a number of use points reaches. */
export function levelOfUse(points: number): number {
  let lv = 1;
  while (lv < MAX_LEVEL && points >= USE_AT[lv]) lv++;
  return lv;
}

/** A hero kind's use points with a skill (by its key). */
export const useOf = (m: Meta, kind: string, key: string): number => m.skillUse?.[kind]?.[key] ?? 0;
/** A hero kind's level with a skill. */
export const skillLevelOf = (m: Meta, kind: string, key: string): number => levelOfUse(useOf(m, kind, key));

/** A hero kind's kit as it fights from this save (its loadout's skills in its slots), at Level 1. */
export function baseKitOf(m: Meta, kind: string): HeroKit | undefined {
  const l = fightLoadout(m, kind);
  return l ? kitWithLoadout(kind, l) : HERO_KITS()[kind];
}
/** The keys of a hero kind's skills in slot order, as it fights from this save. */
export const slotKeysOf = (m: Meta, kind: string): string[] => baseKitOf(m, kind)?.slots.map((s) => keyOf(s.skill)) ?? [];

/** A hero kind's skill levels in slot order, for its boost: undefined when every one is at Level 1 (so it fights exactly as before). */
export function fightLevels(m: Meta, kind: string): number[] | undefined {
  const lv = slotKeysOf(m, kind).map((k) => skillLevelOf(m, kind, k));
  return lv.some((x) => x > 1) ? lv : undefined;
}

/** What a levelled skill adds to its caster's talents while it is cast: its durations (Level 4 and 5), its Level 5 step, and the two named
 *  summons' riders. Undefined when it adds nothing. */
export function castModsOf(key: string, lv: number): Record<string, number> | undefined {
  const mods: Record<string, number> = {};
  const step = LEVEL_STEPS[lv - 1];
  if (step?.dur) mods.dur = step.dur;
  if (key === SUMMON_BEAST) {
    if (lv >= 3) mods.extra = 1;
    if (lv >= 5) mods.dire = 1;
  } else if (lv >= MAX_LEVEL) {
    const s = LV5[key] ?? 'dur';
    if (s === 'extra') mods.extra = 1;
    else if (s === 'reach') mods.reach = 1;
    else if (s === 'dur') mods.dur = (mods.dur ?? 0) + LV5_DUR;
  }
  return Object.keys(mods).length ? mods : undefined;
}

/** A slot at a level: its strength, cost and cooldown by the level's step (and a `pow` Level 5 step's strength), what it adds while cast, and
 *  its Level 1 cooldown kept for the points a cast earns. Level 1 is the slot itself. */
export function levelSlot(s: Slot, lv: number): Slot {
  if (lv <= 1) return s;
  const step = LEVEL_STEPS[Math.min(MAX_LEVEL, lv) - 1];
  const key = keyOf(s.skill);
  const pow = step.pow + (lv >= MAX_LEVEL && LV5[key] === 'pow' && key !== SUMMON_BEAST ? LV5_POW : 0);
  const mods = castModsOf(key, lv);
  return { ...s, tune: s.tune * pow, cost: Math.round(s.cost * step.cost * 10) / 10, cd: Math.round(s.cd * step.cd), lv, baseCd: s.baseCd ?? s.cd, ...(mods ? { mods } : {}) };
}

const built = new Map<string, HeroKit>();
/** A kit with its slots at these levels (built once and kept; `id` names the kit: its kind and loadout). */
export function kitWithLevels(kit: HeroKit, id: string, lv: readonly number[]): HeroKit {
  if (!lv.some((x) => x > 1)) return kit;
  const k = `${id}|${lv.join('.')}`;
  let out = built.get(k);
  if (!out) {
    const slots = kit.slots.map((s, i) => levelSlot(s, lv[i] ?? 1));
    out = { ...kit, slots, s1: slots[0], s2: slots[1], ...(slots[2] ? { s3: slots[2] } : {}) };
    built.set(k, out);
  }
  return out;
}

// ---- counting ----

/** A cast of a hero's skill in slot `n` (1, 2, 3): its points go on the caster, to be counted when the wave settles. */
export function noteCast(u: Unit, n: number, slot: Slot, points = castPoints(slot.baseCd ?? slot.cd)): void {
  const used = (u.usePts ??= []);
  while (used.length < n) used.push(0);
  used[n - 1] += points;
}

/** Use points by hero kind, then by skill key. */
export type UseGain = Record<string, Record<string, number>>;

/** A placed hero's kit for the counting: its own (with its loadout), whatever shape it is in when the wave settles. */
function ownKit(u: Unit): HeroKit | undefined {
  if (u.side !== 'hero' || u.owner !== undefined || UNITS[u.def]?.summon) return undefined;
  return u.book ? kitWithLoadout(u.def, u.book) : HERO_KITS()[u.def];
}

/** What one placed hero earned: its casts' points, and (`fielded`) the wave's points for each open skill. Keyed by skill key. */
export function unitUse(u: Unit, fielded = true): Record<string, number> {
  const kit = ownKit(u);
  const out: Record<string, number> = {};
  if (!kit) return out;
  kit.slots.forEach((s, i) => {
    const pts = (u.usePts?.[i] ?? 0) + (fielded && slotOpen(u, i + 1) ? FIELD_POINTS : 0);
    if (pts > 0) out[keyOf(s.skill)] = (out[keyOf(s.skill)] ?? 0) + pts;
  });
  return out;
}

/** Add one gain into another. */
export function addUse(into: UseGain, gain: UseGain): UseGain {
  for (const [kind, rec] of Object.entries(gain)) for (const [key, n] of Object.entries(rec)) (into[kind] ??= {})[key] = (into[kind][key] ?? 0) + n;
  return into;
}

/** A settled wave's use: every hero placed when it ended (won or lost; the fallen too), each of the kinds in `kinds` if given (the save's own,
 *  not a guest it does not have). Its casts are read off the fighters, so it is a pure function of the fight. */
export function fightUse(b: Battle, kinds?: readonly string[]): UseGain {
  const out: UseGain = {};
  for (const u of b.units) {
    if (!ownKit(u) || (kinds && !kinds.includes(u.def))) continue;
    addUse(out, { [u.def]: unitUse(u) });
  }
  return out;
}

/** A skill that reached a new level. */
export interface SkillLevelUp {
  kind: string;
  key: string;
  level: number;
}

/** Count a wave's use into the save (`share` 0.5 under auto-replay, rounded down), each skill at most `MAX_USE`. Returns each skill that rose a level. */
export function settleSkillUse(m: Meta, gain: UseGain, share = 1): SkillLevelUp[] {
  const ups: SkillLevelUp[] = [];
  for (const [kind, rec] of Object.entries(gain)) {
    if (!ALL_HEROES.includes(kind)) continue;
    for (const [key, n] of Object.entries(rec)) {
      const add = Math.floor(n * share);
      if (add <= 0 || !SKILL_NAMES().has(key)) continue;
      const was = useOf(m, kind, key);
      if (was >= MAX_USE) continue;
      const now = Math.min(MAX_USE, was + add);
      ((m.skillUse ??= {})[kind] ??= {})[key] = now;
      if (levelOfUse(now) > levelOfUse(was)) ups.push({ kind, key, level: levelOfUse(now) });
    }
  }
  return ups;
}

let names: Map<string, string> | undefined;
/** Every hero skill's name by its key (the heroes' own three; a book teaches one of them). */
export const SKILL_NAMES = (): Map<string, string> => {
  if (!names) {
    names = new Map();
    for (const kit of Object.values(HERO_KITS())) for (const s of kit.slots) names.set(keyOf(s.skill), s.skill.name);
  }
  return names;
};
export const skillNameOf = (key: string): string => SKILL_NAMES().get(key) ?? key;

/** The wave card's and the results screen's lines: "Shield Rush reached Level 3!" (one for each skill that rose). */
export const levelUpWords = (ups: readonly SkillLevelUp[]): string[] => ups.map((u) => `${skillNameOf(u.key)} reached Level ${u.level}!`);

/** A skill's level and progress in words: "Level 3 · 812 of 1,500 to Level 4", or "Level 5 · Mastered". */
export function levelLine(points: number): string {
  const lv = levelOfUse(points);
  if (lv >= MAX_LEVEL) return `Level ${MAX_LEVEL} · Mastered`;
  return `Level ${lv} · ${Math.floor(points).toLocaleString('en-GB')} of ${USE_AT[lv].toLocaleString('en-GB')} to Level ${lv + 1}`;
}
/** The share of the way from this level to the next (1 at the top), for a thin bar. */
export function levelShare(points: number): number {
  const lv = levelOfUse(points);
  if (lv >= MAX_LEVEL) return 1;
  return Math.max(0, Math.min(1, (points - USE_AT[lv - 1]) / (USE_AT[lv] - USE_AT[lv - 1])));
}

/** What each level does, in words, for the skill sheet's "Skill level" list. */
export function levelSteps(key: string): string[] {
  const s5 = key === SUMMON_BEAST ? 'a dire wolf answers each call beside the wolf' : key === CONJURE_TREANT ? 'a second treant may stand' : ({ extra: 'one more of what it makes', reach: 'reaches a tile further', dur: 'lasts 15% longer again', pow: '8% stronger again' } as const)[LV5[key] ?? 'dur'];
  return [
    'Level 1: as it is learnt',
    'Level 2: 8% stronger',
    `Level 3: 15% stronger, costs 10% less${key === SUMMON_BEAST ? ', three wolves may stand' : ''}`,
    'Level 4: 22% stronger, costs 10% less, 10% shorter cooldown, lasts 15% longer',
    `Level 5: 30% stronger, costs 15% less, 15% shorter cooldown, lasts 25% longer; ${s5}`,
  ];
}

/** Saved use points that are sane: hero kinds the game has, skill keys it knows, whole points from 1 to `MAX_USE`; anything else is dropped. */
export function readSkillUse(m: Meta): void {
  const raw = m.skillUse as unknown;
  const out: Record<string, Record<string, number>> = {};
  if (raw && typeof raw === 'object')
    for (const [kind, rec] of Object.entries(raw as Record<string, unknown>)) {
      if (!ALL_HEROES.includes(kind) || !rec || typeof rec !== 'object') continue;
      for (const [key, n] of Object.entries(rec as Record<string, unknown>)) {
        if (!SKILL_NAMES().has(key) || typeof n !== 'number' || !Number.isFinite(n) || n < 1 || n > MAX_USE) continue;
        (out[kind] ??= {})[key] = Math.floor(n);
      }
    }
  if (Object.keys(out).length) m.skillUse = out;
  else delete m.skillUse;
}
