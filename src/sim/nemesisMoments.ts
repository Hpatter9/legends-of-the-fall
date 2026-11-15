// NEMESIS-DEPTH, idea 2: remembered fights (`docs/notes/nemesis-depth.md`). A nemesis keeps the striking moments of the fights it lived
// through, read from the War's tally (`nemesisLog.ts`): the hero's skill that nearly broke it, the sliver of life it was left on, the heights
// it was thrown from, the king's spell and the Eidolon that struck it, the fire, frost, storm or venom that scarred it. Each moment names the
// hero, the land and the wave. Its taunts read them first (`nemesisLines.ts`, `MOMENT_TAUNTS`), its card tells them as its history, and an
// old foe's epithet grows from them once a rank ("the Twice-Burnt", "Who Would Not Die").
//
// Deterministic: the moments are read from the tally and the fight as it ended; an epithet's growth draws from its own stream (`EPITHET_SALT`,
// by the run's seed, the wave and the nemesis). Pure: no Pixi, no DOM.

import type { Battle, Unit } from './battle';
import type { Area } from './board';
import { heroName } from './heroNames';
import type { FoeLog } from './nemesisLog';
import { mixSeed, Rng } from './rng';
import { skillNameOf } from './skillLevels';
import { UNITS } from './units';

/** What a moment was: a hero's skill that hurt it badly, the brink (it lived on a sliver), thrown from the heights or shoved about, a king's
 *  spell, an Eidolon's strike, an element that scarred it. */
export type MomentKind = 'skill' | 'brink' | 'thrown' | 'kingSpell' | 'eidolon' | 'element';
export const MOMENT_KINDS: readonly MomentKind[] = ['skill', 'brink', 'thrown', 'kingSpell', 'eidolon', 'element'];

/** One remembered moment. `hero` is the hero kind it is about (none for the king's spell, the Eidolon or an element); `what` is the skill's
 *  name or the element's word (fire, frost, storm, venom); `land` and `wave` are where it happened. */
export interface NemMoment {
  k: MomentKind;
  hero?: string;
  what?: string;
  land?: Area;
  wave: number;
}

/** The most moments a nemesis keeps (newest first), and the most a fight gives it. */
export const MOMENTS_MAX = 6;
export const MOMENTS_A_FIGHT = 2;
/** How hard a moment must have been, as a share of its health: a skill's damage, an element's ticks; and the brink's health left. */
export const MOMENT_BAR = { skill: 0.25, element: 0.15, brink: 0.12 } as const;
/** An old foe's epithet grows from a moment once a rank, from its third meeting on (`EPITHET_SALT`). */
export const EPITHET_MEETINGS = 3;
export const EPITHET_SALT = 0x4e3e5b;
/** The old epithets a card keeps ("Once called Pincushion"). */
export const WAS_MAX = 3;

const ELEMENT: Readonly<Record<string, string>> = { burn: 'fire', chill: 'frost', shock: 'storm', poison: 'venom' };

/** A land in a nemesis's mouth and on its card ("the highlands"). */
export const LAND_WORD: Readonly<Record<Area, string>> = {
  highlands: 'the highlands',
  forest: 'the forest',
  snow: 'the snows',
  desert: 'the dunes',
  volcano: 'the ashlands',
  dungeon: 'the deeps',
  plains: 'the plains',
  autumn: 'the autumn wood',
  swamp: 'the mire',
  graveyard: 'the graveyard',
  ruins: 'the ruins',
  temple: 'the temple',
  crystal: 'the crystal caves',
  forge: 'the forge',
  shrine: 'the shrine',
  warcamp: 'the war camp',
  oasis: 'the oasis',
};
export const landWord = (a: Area | undefined): string => (a && LAND_WORD[a]) || 'the field';

/**
 * The moments a fight gave a nemesis that lived through it (or was dragged off), the most striking first, `MOMENTS_A_FIGHT` at most: a hero's
 * skill that dealt it a quarter of its health; the brink (alive on under 12%); thrown from a height (or shoved about by a hero); an Eidolon's
 * strike; the king's spell; an element whose ticks took 15% of its health.
 */
export function momentsOf(f: FoeLog | undefined, u: Unit, b: Battle, wave: number): NemMoment[] {
  if (!f) return [];
  const land = b.board.area;
  const at = { land, wave };
  const out: NemMoment[] = [];
  const skill = Object.entries(f.skills ?? {}).sort((a, c) => c[1] - a[1] || (a[0] < c[0] ? -1 : 1))[0];
  if (skill && skill[1] >= u.maxHp * MOMENT_BAR.skill) {
    const [hero, key] = skill[0].split('|');
    if (UNITS[hero]) out.push({ k: 'skill', hero, what: skillNameOf(key), ...at });
  }
  if (u.alive && !u.fled && u.hp > 0 && u.hp < u.maxHp * MOMENT_BAR.brink) {
    const top = Object.entries(f.by).sort((a, c) => c[1] - a[1] || (a[0] < c[0] ? -1 : 1))[0]?.[0];
    out.push({ k: 'brink', ...(top && UNITS[top] ? { hero: top } : {}), ...at });
  }
  if ((f.drop ?? 0) > 0 || (f.moved > 0 && f.thrownBy)) out.push({ k: 'thrown', ...(f.thrownBy && UNITS[f.thrownBy] ? { hero: f.thrownBy } : {}), ...at });
  if (f.eidolon > 0) out.push({ k: 'eidolon', ...at });
  if (f.spells > 0) out.push({ k: 'kingSpell', ...at });
  const el = Object.entries(f.ailDmg)
    .filter(([k]) => ELEMENT[k])
    .sort((a, c) => (c[1] ?? 0) - (a[1] ?? 0) || (a[0] < c[0] ? -1 : 1))[0];
  if (el && (el[1] ?? 0) >= u.maxHp * MOMENT_BAR.element) out.push({ k: 'element', what: ELEMENT[el[0]], ...at });
  return out.slice(0, MOMENTS_A_FIGHT);
}

/** A saved moment, if it is one (a known kind, a hero that is one, a land of the board's, a wave). */
export function readMoment(x: unknown): NemMoment | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const m = x as Partial<NemMoment>;
  if (!MOMENT_KINDS.includes(m.k as MomentKind) || typeof m.wave !== 'number' || !Number.isFinite(m.wave)) return undefined;
  if (m.hero !== undefined && (typeof m.hero !== 'string' || !UNITS[m.hero])) return undefined;
  return {
    k: m.k as MomentKind,
    ...(m.hero ? { hero: m.hero } : {}),
    ...(typeof m.what === 'string' && m.what.length <= 40 ? { what: m.what } : {}),
    ...(typeof m.land === 'string' && m.land in LAND_WORD ? { land: m.land as Area } : {}),
    wave: Math.max(0, Math.min(999, Math.round(m.wave))),
  };
}

/** Keep a moment (newest first): one of the same kind about the same hero (or the same element) is replaced; `MOMENTS_MAX` at most. */
export function keepMoment(list: NemMoment[] | undefined, m: NemMoment): NemMoment[] {
  const same = (x: NemMoment) => x.k === m.k && x.hero === m.hero && (m.k !== 'element' || x.what === m.what);
  return [m, ...(list ?? []).filter((x) => !same(x))].slice(0, MOMENTS_MAX);
}

/** A moment in plain words, for the card's history ("Took Kwame’s Shield Bash in the highlands, wave 9, and lived"). */
export function momentLine(m: NemMoment): string {
  const where = `in ${landWord(m.land)}, wave ${m.wave}`;
  const who = m.hero ? heroName(m.hero) : 'the heroes';
  switch (m.k) {
    case 'skill':
      return `Took ${who}’s ${m.what ?? 'blow'} ${where}, and lived`;
    case 'brink':
      return `Left on a sliver of life by ${who} ${where}`;
    case 'thrown':
      return m.hero ? `Thrown about by ${who} ${where}` : `Fell from the heights ${where}`;
    case 'kingSpell':
      return `Struck by the king’s spell ${where}`;
    case 'eidolon':
      return `Stood under an Eidolon’s strike ${where}`;
    case 'element':
      return `Scarred by ${m.what ?? 'fire'} ${where}`;
  }
}

/** The epithets a moment may grow (filled from `{hero}` and `{land}`). Elements have their own. */
export const EPITHETS: Readonly<Record<Exclude<MomentKind, 'element'>, readonly string[]>> = {
  skill: ['{hero}’s Survivor', 'Who Took the Blow', 'the Unbroken', 'the Weathered'],
  brink: ['Who Would Not Die', 'the Last Breath', 'the Hard-to-Kill', 'the Thread-Hung'],
  thrown: ['Who Climbed Back', 'the Cliff-Walker', 'the Twice-Fallen', 'of the Long Drop'],
  kingSpell: ['the King’s Mark', 'the Spell-Scarred', 'Who Laughed at the King'],
  eidolon: ['the God-Struck', 'Sky-Scarred', 'Who Saw the Eidolon'],
};
export const ELEMENT_EPITHETS: Readonly<Record<string, readonly string[]>> = {
  fire: ['the Twice-Burnt', 'Ash-Skin', 'the Scorched'],
  frost: ['the Frost-Bitten', 'Rime-Heart', 'the Cold'],
  storm: ['the Storm-Struck', 'the Thunder-Touched', 'Spark-Scarred'],
  venom: ['the Venom-Wracked', 'the Blackened', 'Bile-Blood'],
};

/** Whether an old foe's epithet may grow now: met three times or more, and not yet grown at its rank. */
export const mayGrowEpithet = (n: { met: number; rank: string; epiAt?: string }): boolean => n.met >= EPITHET_MEETINGS && n.epiAt !== n.rank;

/** A new epithet from a moment, drawn from its own stream (`EPITHET_SALT`); undefined when the moment's bank is empty or gives what it has. */
export function epithetFrom(m: NemMoment, current: string, seed: number, wave: number, id: number): string | undefined {
  const bank = m.k === 'element' ? ELEMENT_EPITHETS[m.what ?? ''] ?? [] : EPITHETS[m.k];
  const fresh = bank.map((e) => e.replace('{hero}', m.hero ? heroName(m.hero) : 'the Heroes').replace('{land}', landWord(m.land))).filter((e) => e !== current);
  if (!fresh.length) return undefined;
  return new Rng(mixSeed(seed, EPITHET_SALT, wave, id)).pick(fresh);
}
