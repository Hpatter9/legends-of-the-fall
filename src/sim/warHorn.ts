// The War Horn (EIDOLONS batch 3, docs/notes/eidolons.md): the gauge that calls an Eidolon. A carved ivory horn bound in iron and gold that
// fills with light across fights and is kept in the save (`Meta.eidolons`, an optional field: an older save has an empty horn). It fills to
// `HORN_FULL` (1000): a boss wave won adds 100 (about ten boss waves fill it) and each ordinary foe slain adds 1 (a hundred add a tenth); an
// auto-replay adds half. Full, it waits for as long as the player likes (gains meanwhile are lost); blown, it empties. One Eidolon is chosen
// to answer it (`chooseEidolon`); choosing another keeps the fill (one shared horn).
//
// HORN-GIFT (the owner: "The Eidolon horn should be given to the player after earning an Eidolon, as part of the story";
// docs/notes/horn-gift.md): the horn is the player's only once an Eidolon is bound (`hornHeld`). Before that it does not exist on the page
// and nothing fills it (`addHorn` adds nothing; an older save's stored fill is kept, untouched). The first binding (Askel's, at the
// Summoner) hands it over full (`bindEidolon`), so it can be blown in the very next fight. Nothing new is saved: a save holds the horn
// exactly when it has an Eidolon bound.
//
// Pure rules: no Pixi, no DOM, no randomness.

import type { Battle } from './battle';
import { isBoss } from './foes';
import { ELITE_FOES } from './eliteFoes';
import { EIDOLON_IDS } from './eidolons';

export const HORN_FULL = 1000;

/** What fills the horn (the owner's numbers, and the design's by mode where the owner's said nothing). */
export const HORN = {
  /** A boss wave won (an army's mid-boss or last boss, the daily's two, a quest battle's, a Calamity guardian). */
  BOSS: 100,
  /** A Calamity elite or mini-boss. */
  ELITE: 25,
  /** Each ordinary foe slain in a fight won. */
  FOE: 1,
  /** An auto-replay's share. */
  AUTO: 0.5,
  /** The Last Stand's share (its boss waves come every fifth wave and its foes in hundreds), and the most one run adds. */
  STAND: 0.5,
  STAND_CAP: 300,
};

/** The save's Eidolons: the horn's fill, those bound, the one chosen to answer, how often it has been blown, the Eidolons whose first call
 *  has played in full, and whether the first blow's confirm has been answered. */
export interface EidolonMeta {
  horn: number;
  bound?: string[];
  chosen?: string;
  calls?: number;
  seen?: string[];
  confirmed?: boolean;
  /** VAELKHAR-HEART (`vaelkharHeart.ts`): his Storied relic has been held ('held'), and given back at his binding ('returned'). */
  heart?: 'held' | 'returned';
}

/** The slice of the Meta these rules read and change. */
export interface HornMeta {
  eidolons?: EidolonMeta;
}

/** Read the field from a save: anything not a known Eidolon dropped, the fill kept between 0 and full. Undefined for none. */
export function readEidolons(raw: unknown): EidolonMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<EidolonMeta>;
  const known = (xs: unknown) => (Array.isArray(xs) ? [...new Set(xs.filter((x): x is string => typeof x === 'string' && EIDOLON_IDS.includes(x)))] : []);
  const out: EidolonMeta = { horn: typeof r.horn === 'number' && Number.isFinite(r.horn) ? Math.max(0, Math.min(HORN_FULL, r.horn)) : 0 };
  const bound = known(r.bound);
  if (bound.length) out.bound = bound;
  if (typeof r.chosen === 'string' && bound.includes(r.chosen)) out.chosen = r.chosen;
  else if (bound.length) out.chosen = bound[0];
  if (typeof r.calls === 'number' && r.calls > 0) out.calls = r.calls | 0;
  const seen = known(r.seen);
  if (seen.length) out.seen = seen;
  if (r.confirmed) out.confirmed = true;
  if (r.heart === 'held' || r.heart === 'returned') out.heart = r.heart;
  return out;
}

export const hornOf = (m: HornMeta): number => m.eidolons?.horn ?? 0;
export const hornFull = (m: HornMeta): boolean => hornOf(m) >= HORN_FULL;
export const boundOf = (m: HornMeta): readonly string[] => m.eidolons?.bound ?? [];
/** The Eidolon that answers the horn: the one chosen, while it is bound. */
export const chosenOf = (m: HornMeta): string | undefined => {
  const c = m.eidolons?.chosen;
  return c && boundOf(m).includes(c) ? c : undefined;
};
/** Whether the player holds the War Horn: given at the first binding, so held exactly while an Eidolon is bound (HORN-GIFT). */
export const hornHeld = (m: HornMeta): boolean => boundOf(m).length > 0;
/** Whether the horn can be blown in a fight: full, and an Eidolon chosen to answer. */
export const hornReady = (m: HornMeta): boolean => hornFull(m) && !!chosenOf(m);

/** What a settled fight brings the horn. `boss` is what its boss wave was (none for a wave of ordinary foes); `foes` the ordinary foes slain;
 *  `counts` false for a fight that pays nothing (a practice daily or quest battle); `called` true when an Eidolon was called in it. */
export interface HornFight {
  won: boolean;
  boss?: 'boss' | 'elite' | 'guardian';
  foes: number;
  auto?: boolean;
  counts?: boolean;
  called?: boolean;
}

/** The horn's gain for a settled fight: a lost fight, one that counts for nothing and one in which an Eidolon was called add nothing. */
export function hornGain(f: HornFight): number {
  if (!f.won || f.counts === false || f.called) return 0;
  const boss = f.boss === 'elite' ? HORN.ELITE : f.boss ? HORN.BOSS : 0;
  return (boss + Math.max(0, f.foes) * HORN.FOE) * (f.auto ? HORN.AUTO : 1);
}

/** The Last Stand's gain for a run (one long fight): its boss waves won and the foes slain, at the Stand's share, at most `STAND_CAP`; none
 *  when an Eidolon was called in it. */
export function standHornGain(bossWaves: number, foes: number, called = false): number {
  if (called) return 0;
  return Math.min(HORN.STAND_CAP, (Math.max(0, bossWaves) * HORN.BOSS + Math.max(0, foes) * HORN.FOE) * HORN.STAND);
}

/** The ordinary foes a fight's heroes have slain so far: fallen foes that are not bosses or elites (their adds count). */
export const foesSlain = (b: Battle): number => b.units.filter((u) => u.side === 'foe' && !u.alive && !isBoss(u.def) && !ELITE_FOES[u.def]).length;

/** What the horn took: how much went in (none while full), the fill now, and whether it filled just now. */
export interface HornAdd {
  added: number;
  fill: number;
  filled: boolean;
  /** It was full already: the gain was lost. */
  wasFull: boolean;
}

/** Add a gain to the horn: up to full, then it waits (the rest is lost). Before the horn is given (no Eidolon bound) nothing goes in, and a
 *  fill an older save stored is kept as it was (HORN-GIFT). */
export function addHorn(m: HornMeta, gain: number): HornAdd {
  const before = hornOf(m);
  if (gain <= 0 || !hornHeld(m)) return { added: 0, fill: before, filled: false, wasFull: before >= HORN_FULL };
  const fill = Math.min(HORN_FULL, before + gain);
  (m.eidolons ??= { horn: 0 }).horn = fill;
  return { added: fill - before, fill, filled: before < HORN_FULL && fill >= HORN_FULL, wasFull: before >= HORN_FULL };
}

/** Blow the full horn (the page does, the moment the fight accepts the call, and saves at once, so quitting mid-fight cannot keep a full
 *  horn and a struck boss): it empties. False (nothing changes) unless it is ready. */
export function blowHorn(m: HornMeta): boolean {
  if (!hornReady(m)) return false;
  const e = m.eidolons!;
  e.horn = 0;
  e.calls = (e.calls ?? 0) + 1;
  return true;
}

/** Choose the Eidolon that answers: one bound. The horn's fill is kept. */
export function chooseEidolon(m: HornMeta, id: string): boolean {
  if (!boundOf(m).includes(id)) return false;
  (m.eidolons ??= { horn: 0 }).chosen = id;
  return true;
}

/** Bind an Eidolon (the Summoner's binding, `eidolonChains.ts` `bindChain`; the page's dev flag `?eidolons=all` binds all six): the first
 *  bound is chosen. The first binding of all also gives the War Horn, full (HORN-GIFT): the page tells it by `hornHeld` before and after. */
export function bindEidolon(m: HornMeta, id: string): boolean {
  if (!EIDOLON_IDS.includes(id)) return false;
  const given = !hornHeld(m);
  const e = (m.eidolons ??= { horn: 0 });
  const bound = (e.bound ??= []);
  if (!bound.includes(id)) bound.push(id);
  // (the horn is handed over full, whatever an older save had stored in it)
  if (given) e.horn = HORN_FULL;
  e.chosen ??= id;
  return true;
}

/** Note that an Eidolon's first call has played in full (later calls may be skipped, or shortened by the setting). */
export function noteSeen(m: HornMeta, id: string): void {
  const e = (m.eidolons ??= { horn: 0 });
  if (!(e.seen ??= []).includes(id)) e.seen.push(id);
}
export const seenCall = (m: HornMeta, id: string): boolean => !!m.eidolons?.seen?.includes(id);
