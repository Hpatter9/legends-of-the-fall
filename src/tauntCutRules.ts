// The Nemesis War, phase 3: the taunt cut-in's rules (`docs/design/legends-expansion.md`, section 2.9; `docs/notes/nemesis-3.md`). Before
// the first wave of a run in which a nemesis stands, a cut-in plays: its portrait slides in from the left in its rank's frame with its scars,
// its name, epithet, rank and Might, one taunt assembled from its memory (`nemesisLines.ts`), and, when the taunt names a hero on the board,
// that hero's answer from the right. About 2.5 s; a tap skips it once 0.6 s have played. Settings, Nemesis cut-ins: full, short (the name
// plate only) or off. A nemesis's first meeting, and a Vain one always, plays in full unless the cut-ins are off. Reduced motion: the
// portraits fade in held still. Pure: no Pixi, no DOM; the page is `tauntCut.ts`.

import { fullName, rankWord, type NemSnap, type NemTrophy } from './sim/nemesis';
import { MOMENT_TAUNTS, REPLIES, TAUNTS, TRIGGERS, VOICES, type TauntTrigger, type Voice } from './sim/nemesisLines';
import { TEMPER_TAGS } from './sim/nemesisTemper';
import { landWord, MOMENT_KINDS, type MomentKind, type NemMoment } from './sim/nemesisMoments';
import { dreadOf, type NemRank } from './sim/nemesisTraits';
import { heroName } from './sim/heroNames';
import { trophyWord } from './sim/revenge';
import { UNITS } from './sim/units';

/** How long each cut-in plays (real ms), and when a tap may skip it. */
export const TAUNT_CUT = { FULL_MS: 2500, SHORT_MS: 1300, SKIP_AFTER_MS: 600, OUT_MS: 240 } as const;

export type CutMode = 'full' | 'short' | 'off';
export const CUT_MODES: readonly CutMode[] = ['full', 'short', 'off'];

/** One cut-in: who, what it says, and the hero who answers. */
export interface Taunt {
  id: number;
  base: string;
  name: string;
  rank: NemRank;
  might: number;
  scars: number;
  trigger: TauntTrigger | MomentKind;
  line: string;
  /** The hero the taunt names (a kind on the board), and its answer. */
  hero?: string;
  reply?: string;
  /** The trophy it carries of that hero's (drawn small with the piece's own gear icon). */
  trophy?: NemTrophy;
  /** Its first meeting (the cut-in plays in full). */
  first: boolean;
  vain: boolean;
}

/** A small hash for picking a line (no stream is drawn). */
const hash = (...xs: number[]): number => {
  let h = 0x811c9dc5;
  for (const x of xs) h = Math.imul(h ^ (x | 0), 0x01000193) >>> 0;
  return h;
};

const voiceOf = (army: string | undefined): Voice => (VOICES.includes(army as Voice) ? (army as Voice) : 'orcs');

/** Fill a template's places. */
export function fill(t: string, w: { name: string; hero?: string; kind?: string; trophy?: string; fallen?: string; what?: string; land?: string }): string {
  return t.replace(/\{(\w+)\}/g, (all, k: string) => (w as Record<string, string | undefined>)[k] ?? all);
}

/** Which trigger a nemesis taunts with, and the hero it names: the most personal its memory holds for a hero on the board, else what it is.
 *  NEMESIS-DEPTH: a remembered moment about a hero on the board comes after a trophy, before the rest (a humiliation too); a moment about no
 *  hero (the king's spell, an Eidolon, an element) before an escape. The newest moment first. */
export function triggerOf(s: NemSnap, field: readonly string[]): { trigger: TauntTrigger | MomentKind; hero?: string; trophy?: NemTrophy; fallen?: string; moment?: NemMoment } {
  const on = (k: string | undefined): k is string => !!k && field.includes(k);
  for (const t of TRIGGERS) {
    // (NEMESIS-DEPTH: the remembered moments)
    if (t === 'humiliated') {
      const mo = s.moments?.find((x) => on(x.hero));
      if (mo) return { trigger: mo.k, hero: mo.hero, moment: mo };
    } else if (t === 'escaped') {
      const mo = s.moments?.find((x) => !x.hero);
      if (mo) return { trigger: mo.k, moment: mo };
    }
    switch (t) {
      case 'trophy': {
        const tr = s.trophies?.find((x) => on(x.kind));
        if (tr) return { trigger: t, hero: tr.kind, trophy: tr };
        break;
      }
      case 'humiliated':
        if (on(s.shamed)) return { trigger: t, hero: s.shamed };
        break;
      case 'avenger': {
        const a = Object.keys(s.avengers ?? {}).sort().find(on);
        if (a) return { trigger: t, hero: a, fallen: s.avengers![a] };
        break;
      }
      case 'slew': {
        const k = s.slew?.find(on);
        if (k) return { trigger: t, hero: k };
        break;
      }
      case 'dread': {
        const k = dreadOf(s.weak);
        if (on(k)) return { trigger: t, hero: k };
        break;
      }
      case 'maimed': {
        const k = s.maimed?.find(on);
        if (k) return { trigger: t, hero: k };
        break;
      }
      case 'escaped':
        if ((s.fled ?? 0) > 0) return { trigger: t };
        break;
      case 'warchief':
        if (s.rank === 'warchief') return { trigger: t };
        break;
      case 'meet':
        return { trigger: t };
    }
  }
  return { trigger: 'meet' };
}

/** The taunts that do not name a hero (its answer is then the plain one). */
const PLAIN: readonly TauntTrigger[] = ['meet', 'escaped', 'warchief'];

const isMoment = (t: TauntTrigger | MomentKind): t is MomentKind => (MOMENT_KINDS as readonly string[]).includes(t);
/** A trigger's lines in a voice. */
export const linesOf = (t: TauntTrigger | MomentKind, v: Voice): readonly string[] => (isMoment(t) ? MOMENT_TAUNTS[t][v] : TAUNTS[t][v]);
/** A trigger's place in the hash (the old triggers keep theirs). */
const triggerKey = (t: TauntTrigger | MomentKind): number => (isMoment(t) ? 100 + MOMENT_KINDS.indexOf(t) : TRIGGERS.indexOf(t));

/**
 * A nemesis's cut-in for a run (`seed`) with these hero kinds on the board. NEMESIS-DEPTH: the line turns with its meetings (`met`, which
 * grows by one each time it is met), so the same nemesis does not say the same thing twice running; the run's seed only picks for a
 * snapshot with no meetings counted.
 */
export function tauntFor(s: NemSnap, field: readonly string[], seed: number): Taunt {
  const pick = triggerOf(s, field);
  const lines = linesOf(pick.trigger, voiceOf(s.army));
  const tmpl = lines[((s.met ?? hash(seed)) + hash(s.id, triggerKey(pick.trigger))) % lines.length];
  const name = fullName(s);
  const mo = pick.moment;
  const words = { name: s.name, ...(pick.hero ? { hero: heroName(pick.hero), kind: UNITS[pick.hero]?.name ?? pick.hero } : {}), ...(pick.trophy ? { trophy: trophyWord(pick.trophy) } : {}), ...(pick.fallen ? { fallen: heroName(pick.fallen) } : {}), ...(mo ? { what: mo.what ?? 'blow', land: landWord(mo.land) } : {}) };
  const answer = pick.hero ? REPLIES[pick.hero] : undefined;
  return {
    id: s.id,
    base: s.base,
    name,
    rank: s.rank,
    might: s.might,
    scars: s.scars,
    trigger: pick.trigger,
    line: withTag(fill(tmpl, words), s),
    ...(pick.hero ? { hero: pick.hero } : {}),
    ...(answer ? { reply: fill(answer[!pick.hero || PLAIN.includes(pick.trigger as TauntTrigger) ? 0 : 1], { name: s.name }) } : {}),
    ...(pick.trophy ? { trophy: pick.trophy } : {}),
    first: !s.seen && (s.met ?? 0) <= 1,
    vain: s.weak.includes('vain') || s.temper === 'glory',
  };
}

/** NEMESIS-DEPTH: a temperament's tag closes the taunt every other meeting ("… But I am in no hurry."), turning with its meetings. */
function withTag(line: string, s: Pick<NemSnap, 'temper' | 'met' | 'id'>): string {
  const met = s.met ?? 0;
  if (!s.temper || met % 2 === 0) return line;
  const tags = TEMPER_TAGS[s.temper];
  return `${line} ${tags[(Math.floor(met / 2) + hash(s.id)) % tags.length]}`;
}

/** How long a cut-in plays (0: not at all): off plays none; short the name plate only, unless it is a first meeting or the nemesis is Vain. */
export function cutLength(mode: CutMode, t: Pick<Taunt, 'first' | 'vain'>): { ms: number; full: boolean } {
  if (mode === 'off') return { ms: 0, full: false };
  const full = mode === 'full' || t.first || t.vain;
  return { ms: full ? TAUNT_CUT.FULL_MS : TAUNT_CUT.SHORT_MS, full };
}

/** Whether a tap may skip a cut-in that has played `played` ms. */
export const canSkip = (played: number): boolean => played >= TAUNT_CUT.SKIP_AFTER_MS;

/** The rank and Might in words ("Captain · Might 4"). */
export const plateWords = (t: Pick<Taunt, 'rank' | 'might'>): string => `${rankWord(t.rank)} · Might ${t.might}`;

/** The nemeses whose cut-ins a wave brings (in the order they stand), leaving out those already met this run. */
export function wavesTaunts(rn: { members: readonly NemSnap[]; waves: Readonly<Record<string, readonly number[]>> } | undefined, wave: number, shown: ReadonlySet<number>): NemSnap[] {
  const ids = rn?.waves[String(wave)] ?? [];
  return ids.filter((id) => !shown.has(id)).map((id) => rn!.members.find((s) => s.id === id)).filter((s): s is NemSnap => !!s);
}

/** CALLOUT-ONCE (the owner: "When an enemy calls out a hero, the call out plays twice"): a foe calls out once a wave. The cut-ins waiting
 *  and the new ones, with each nemesis at most once: a later one for the same nemesis (a challenge to a duel, after its wave's taunt) takes
 *  the earlier one's place in the queue, and one for the nemesis showing now is dropped (it has had its say). */
export function onceEach<T extends { t: Pick<Taunt, 'id'> }>(queue: readonly T[], incoming: readonly T[], showing?: Pick<Taunt, 'id'> | null): T[] {
  const out = [...queue];
  for (const x of incoming) {
    if (showing && showing.id === x.t.id) continue;
    const at = out.findIndex((y) => y.t.id === x.t.id);
    if (at >= 0) out[at] = x;
    else out.push(x);
  }
  return out;
}
