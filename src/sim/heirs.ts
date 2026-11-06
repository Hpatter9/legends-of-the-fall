// Dynasties, part 2: heirs and the Mantle (docs/design/legends-expansion.md sections 3.3 to 3.5, 5.2 and 7; phase 6 of section 9;
// docs/notes/dynasty-6.md). The promise of 3.0 holds throughout: **no power is lost, no hero is lost, nothing is forced, no rarity.**
//
//   - **Naming an heir.** A Veteran or an Elder bearer of kind level 60 or more, with a kindred partner at bond level 3 (Sworn) or more,
//     may name an heir with that partner (a mentor of the Hall from before may too, whatever its seasons: it cannot serve them in the Hall).
//     The heir trains at the castle for 7 real days; then two candidates are drawn (`HEIR_SALT`), each with a name from the kind's bank of
//     six, a look (a tint of the kind's own sheet) and a birthright: the partner's legacy perk for one, the parent's own for the other.
//   - **Passing the Mantle.** The heir takes the kind's slot. Every lasting thing stays keyed by the kind (XP and level, ranks, awakening,
//     talents, books, gear and skills), so nothing is reset and nothing is copied. The heir brings its birthright (the perk at its first
//     band, wherever talents apply: the armies and the Last Stand), the heirloom (one of the elder's worn pieces gains a generation mark,
//     +3% of its main stats, three marks at most), a Blood Grudge (+15% against the living nemesis that slew either parent) and the Heir's
//     Promise (+25% XP for its first season). The passed-over candidate is the cadet line: it visits the tavern now and then.
//   - **The elder's honour.** Mentor (a Hall seat, the existing rules, but the kind stays in the party through the heir), tavern regular
//     (the Elders' table: six seats, a story and 50 crowns a day, and a free ride as the guest once a day while its heir is not in the
//     party) or Shade (kind level 100; its call on the War Horn comes with the Legend Oath). It can be changed, with a 7-day cooldown.
//   - **Fielding the elder.** The party picker's banner fields an honoured elder in the heir's place, at the kind's full power with its
//     own birthright; its honour lapses for the run (a mentor's perk stops, as on recall, but no cooldown starts). One bearer of a line
//     takes the field at a time: the line is the kind, so the twin rule holds as it always has.
//
// Pure rules: no Pixi, no DOM, no clock (the page passes `now`, ms, and the day key); the one draw, the candidates, is on its own side
// stream, so nothing else in the game moves.

import { mixSeed, Rng } from './rng';
import { HERO_NAMES } from './heroNames';
import { HEIR_NAMES } from './heirNames';
import { HEIR_LOOK_IDS } from './heroLooks';
import { bondKey, partnersOf } from './bonds';
import { levelOfKind } from './levels';
import { callingOf, PERKS, recall, retired, seatedMentor, seatMentor, whyNotSeat, type LegacyMeta, type Perk } from './legacy';
import { grudgesOn } from './revenge';
import { FOE_LORE, HERO_STORY } from './codexLore';
import { metEntries } from './codex';
import { PARTY_SIZE, type Meta } from './meta';
import type { Equipment, EquipSlot } from './equipment';
import { HEIRLOOM_MAX } from './equipment';
import { bearerOf, DYNASTY, dayNumber, fieldedOf, lineOf, seasonIndex, SEASONS, SEASON_WORDS, STAGE_FROM, type Bearer, type HeirPick, type Line } from './dynasty';
import { HEIR_SCENE_KEYS } from './heirScenes';

/** The candidates' side stream (the design's `HEIR_SALT`). */
export const HEIR_SALT = 0x4e12a5;

/** The numbers (one place to tune them). */
export const HEIRS = {
  /** An heir trains at the castle this long (ms): 7 real days. */
  TRAIN_MS: 7 * 24 * 60 * 60 * 1000,
  /** The kind's level a bearer needs to name an heir (the Hall's retiring level, `LEGACY.RETIRE_LEVEL`; a test holds them equal). */
  LEVEL: 60,
  /** The kindred bond the partner needs: Sworn. */
  BOND: 3,
  /** The Blood Grudge: the heir's extra share of damage against the nemesis that slew a parent. */
  GRUDGE: 0.15,
  /** The Heir's Promise: the heir's XP for its first season. */
  PROMISE_XP: 0.25,
  /** An honour can be changed again after this long (ms), as recall works. */
  HONOUR_MS: 7 * 24 * 60 * 60 * 1000,
  /** The Elders' table's seats; more regulars take turns, one a day. */
  SEATS: 6,
  /** What the day's story pays. */
  STORY_CROWNS: 50,
  /** The kind's level an elder needs to become a Shade. */
  SHADE_LEVEL: 100,
};

export type Honour = 'mentor' | 'regular' | 'shade';
export const HONOURS: readonly Honour[] = ['mentor', 'regular', 'shade'];
export const HONOUR_WORDS: Readonly<Record<Honour, string>> = { mentor: 'Mentor', regular: 'Tavern regular', shade: 'Shade' };
/** What each honour gives, in one line. */
export const HONOUR_LINES: Readonly<Record<Honour, string>> = {
  mentor: 'A seat in the Hall of Legends: catch-up XP and the legacy perk to the calling. The kind stays in the party through the heir.',
  regular: 'A seat at the Elders’ table in the tavern: a story and 50 crowns a day, and a free ride as the guest once a day.',
  shade: 'Waits on the War Horn beside the Eidolons. Its horn call comes with the Legend Oath.',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const hash = (s: string): number => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const seasonTag = (m: Pick<Meta, 'dynasty'>, day: number): string => {
  const i = m.dynasty ? seasonIndex(m.dynasty, day) : 0;
  return `Year ${Math.floor(i / 4) + 1}, ${SEASON_WORDS[SEASONS[i % 4]]}`;
};
const remember = (b: Bearer, line: string): void => {
  b.memory = [...(b.memory ?? []), line].slice(-DYNASTY.MAX_MEMORY);
};
const founderOf = (kind: string): string => HERO_NAMES[kind]?.name ?? kind;
/** A kind's bearer's name: its current bearer's, else the hero as written. */
export const bearerName = (m: Pick<Meta, 'dynasty'>, kind: string): string => bearerOf(m, kind)?.name ?? founderOf(kind);
/** The name the field shows for a kind: the fielded bearer's (an elder the banner chose, else the current bearer), else the hero's. */
export const fieldName = (m: Pick<Meta, 'dynasty'>, kind: string): string => fieldedOf(m, kind)?.name ?? founderOf(kind);

// ---- naming an heir -----------------------------------------------------------------------------------------------------------

/** The partners a kind may name an heir with: its kindred (and rivals settled into kin) at bond level 3 or more, owned. */
export function heirPartners(m: Meta, kind: string): { kind: string; lv: number }[] {
  return partnersOf(m, kind)
    .filter((p) => p.kindred && !p.rival && p.lv >= HEIRS.BOND && m.unlocked.includes(p.kind))
    .map((p) => ({ kind: p.kind, lv: p.lv }))
    .sort((a, b) => b.lv - a.lv || a.kind.localeCompare(b.kind));
}

/** Why a kind's bearer cannot name an heir now (null when it can). */
export function whyNoHeir(m: Meta, kind: string): string | null {
  const line = lineOf(m, kind);
  const b = bearerOf(m, kind);
  if (!line || !b || !m.unlocked.includes(kind)) return 'No House yet';
  if (line.heir) return 'An heir is named already';
  // (a mentor of the Hall from before cannot serve seasons there, so its honour stands for them)
  const mentor = b.fate === 'mentor';
  if (!mentor && b.served < STAGE_FROM.veteran) {
    const n = STAGE_FROM.veteran - b.served;
    return `A Veteran may name an heir: ${n} more ${n === 1 ? 'season' : 'seasons'} on the road`;
  }
  if (levelOfKind(m, kind) < HEIRS.LEVEL) return `Level ${HEIRS.LEVEL} or more to name an heir`;
  if (!heirPartners(m, kind).length) return 'A kindred partner at Sworn (bond level 3) first';
  return null;
}
export const canNameHeir = (m: Meta, kind: string): boolean => whyNoHeir(m, kind) === null;

/** Name an heir with a Sworn partner: 7 days of training begin. The pair's heir scene, if it has one, waits to play at the camp. */
export function nameHeir(m: Meta, kind: string, partner: string, now: number, day: number): boolean {
  if (whyNoHeir(m, kind) || !heirPartners(m, kind).some((p) => p.kind === partner)) return false;
  const line = lineOf(m, kind)!;
  line.heir = { doneAt: now + HEIRS.TRAIN_MS, partner };
  remember(line.bearers[line.current], `Named an heir with ${bearerName(m, partner)} · ${seasonTag(m, day)}`);
  const key = bondKey(kind, partner);
  const d = m.dynasty!;
  if (HEIR_SCENE_KEYS.includes(key) && !d.scenes?.includes(key)) d.scenes = [...(d.scenes ?? []), key].slice(-40);
  return true;
}

/** Where a line's heir stands: none, in training (and how long is left, ms), or ready to take up the mantle. */
export function heirState(m: Pick<Meta, 'dynasty'>, kind: string, now: number): { state: 'none' } | { state: 'training'; left: number; partner: string } | { state: 'ready'; partner: string } {
  const h = lineOf(m, kind)?.heir;
  if (!h) return { state: 'none' };
  return now >= h.doneAt ? { state: 'ready', partner: h.partner } : { state: 'training', left: h.doneAt - now, partner: h.partner };
}
/** "4 days left", "1 day left", "under a day left". */
export const trainWords = (left: number): string => {
  const days = Math.ceil(left / DAY_MS);
  return left < DAY_MS ? 'under a day left' : `${days} ${days === 1 ? 'day' : 'days'} left`;
};

/** The two candidates, drawn once training is done (on `HEIR_SALT`, from the line, the generation and the partner: the same every time
 *  they are read) and kept on the line. The first has the partner's perk as its birthright, the second the parent's own. */
export function heirPicks(m: Meta, kind: string, now: number): HeirPick[] | null {
  const line = lineOf(m, kind);
  const h = line?.heir;
  if (!line || !h || now < h.doneAt) return null;
  if (h.picks?.length === 2) return h.picks;
  const cur = line.bearers[line.current];
  const rng = new Rng(mixSeed(HEIR_SALT, hash(kind), hash(h.partner), m.dynasty?.start ?? 0, cur.gen));
  const used = new Set([founderOf(kind), ...line.bearers.map((b) => b.name)]);
  const bank = (HEIR_NAMES[kind] ?? []).filter((n) => !used.has(n));
  const names: string[] = [];
  const pool = [...(bank.length >= 2 ? bank : HEIR_NAMES[kind] ?? [founderOf(kind)])];
  while (names.length < 2 && pool.length) names.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  // (a bank emptied by many generations: the name is borne again, as Houses do, "the Second")
  while (names.length < 2) names.push(`${names[0] ?? founderOf(kind)} the Younger`);
  const looks = [...HEIR_LOOK_IDS];
  const a = looks.splice(rng.int(0, looks.length - 1), 1)[0];
  const b = looks.splice(rng.int(0, looks.length - 1), 1)[0];
  h.picks = [
    { name: names[0], look: a, birthright: h.partner },
    { name: names[1], look: b, birthright: kind },
  ];
  return h.picks;
}

// ---- the elder's honour -------------------------------------------------------------------------------------------------------

/** Why an elder of a line cannot take an honour now (null when it can). */
export function whyNotHonour(m: Meta, kind: string, honour: Honour, now: number, index?: number): string | null {
  const line = lineOf(m, kind);
  if (!line) return 'No House yet';
  if (honour === 'shade' && levelOfKind(m, kind) < HEIRS.SHADE_LEVEL) return `Level ${HEIRS.SHADE_LEVEL} to become a Shade`;
  if (honour === 'mentor') {
    // (one Hall seat a calling: an earlier elder of the same House who holds it keeps it)
    const holder = line.bearers.findIndex((b, i) => i !== index && b.fate === 'mentor' && i !== line.current);
    if (holder >= 0 && seatedMentor(m, kind)) return `${line.bearers[holder].name} holds the House’s seat in the Hall`;
    // (the current bearer mentoring from before keeps its own seat)
    if (index === undefined && line.bearers[line.current].fate === 'mentor') return null;
    return whyNotSeat(m, kind, now);
  }
  return null;
}

/** The elder of `kind` at `index` takes `honour` (no cooldown is asked here: the Mantle's own, or `changeHonour`'s). */
function giveHonour(m: Meta, kind: string, index: number, honour: Honour, now: number): void {
  const line = lineOf(m, kind)!;
  const b = line.bearers[index];
  const d = m.dynasty!;
  if (b.fate === honour) return;
  // (leaving the Hall is a recall: the perk stops and the seat stays empty for seven days, as ever)
  if (b.fate === 'mentor' && seatedMentor(m, kind)) recall(m, callingOf(kind)!, now);
  if (b.fate === 'regular') leaveTable(m, kind, index);
  b.fate = honour;
  if (honour === 'mentor') seatMentor(m, kind, now);
  if (honour === 'regular' && !d.regulars?.includes(kind)) d.regulars = [...(d.regulars ?? []), kind];
}
function leaveTable(m: Meta, kind: string, index: number): void {
  const d = m.dynasty!;
  const line = lineOf(m, kind)!;
  if (line.bearers.some((b, i) => i !== index && b.fate === 'regular')) return;
  d.regulars = (d.regulars ?? []).filter((k) => k !== kind);
  if (!d.regulars.length) delete d.regulars;
}

/** The elders of a line who may change honour, and whether they can now. */
export const honourLock = (b: Bearer, now: number): number => Math.max(0, (b.honourAt ?? 0) - now);

/** Change an elder's honour (once its 7-day cooldown is over). Returns false, changing nothing, when it cannot. */
export function changeHonour(m: Meta, kind: string, index: number, honour: Honour, now: number, day: number): boolean {
  const line = lineOf(m, kind);
  const b = line?.bearers[index];
  if (!line || !b || index >= line.current || b.cadet || b.fate === 'fallen' || b.fate === honour) return false;
  // (an elder whose honour has lapsed (recalled from the Hall elsewhere) chooses again at once)
  if (b.fate && honourLock(b, now) > 0) return false;
  if (whyNotHonour(m, kind, honour, now, index)) return false;
  giveHonour(m, kind, index, honour, now);
  b.honourAt = now + HEIRS.HONOUR_MS;
  remember(b, `Became a ${HONOUR_WORDS[honour].toLowerCase()} · ${seasonTag(m, day)}`);
  return true;
}

// ---- passing the Mantle -------------------------------------------------------------------------------------------------------

/** The elder's worn pieces, any of which can be the heirloom. */
export function heirloomChoices(m: Meta, kind: string): Equipment[] {
  const worn = m.equipped?.[kind] ?? {};
  return Object.values(worn)
    .map((id) => (m.equipment ?? []).find((x) => x.id === id))
    .filter((x): x is Equipment => !!x);
}

/** The living nemesis that slew either parent (the one with the most Grudge steps from them, the oldest on a tie): the heir's Blood
 *  Grudge. Undefined when none lives. */
export function bloodGrudgeFor(m: Meta, kind: string, partner: string): number | undefined {
  const live = (m.war?.members ?? []).map((n) => n.id);
  let best: { id: number; steps: number } | undefined;
  for (const id of live) {
    const g = grudgesOn(m, id);
    const steps = (g[kind] ?? 0) + (g[partner] ?? 0);
    if (steps > 0 && (!best || steps > best.steps || (steps === best.steps && id < best.id))) best = { id, steps };
  }
  return best?.id;
}

export interface Mantle {
  kind: string;
  elder: Bearer;
  heir: Bearer;
  cadet: Bearer;
  honour: Honour;
  heirloom?: Equipment;
  /** The nemesis the heir bears its Blood Grudge against. */
  grudge?: number;
}

/** Why the mantle cannot pass now with these choices (null when it can). */
export function whyNoMantle(m: Meta, kind: string, opts: { pick: number; honour: Honour; heirloom?: number }, now: number): string | null {
  const st = heirState(m, kind, now);
  if (st.state === 'none') return 'No heir is named';
  if (st.state === 'training') return `The heir is still training: ${trainWords(st.left)}`;
  if (opts.pick !== 0 && opts.pick !== 1) return 'Choose a candidate';
  const why = whyNotHonour(m, kind, opts.honour, now);
  if (why) return why;
  if (opts.heirloom !== undefined && !heirloomChoices(m, kind).some((x) => x.id === opts.heirloom)) return 'The heirloom must be one of the elder’s worn pieces';
  return null;
}

/**
 * Pass the mantle: the chosen candidate takes the kind's slot, the other becomes the cadet line, and the elder takes its honour. Nothing
 * lasting is touched: the kind's XP, ranks, awakening, talents, books, gear and skills are the kind's, and the heir is the kind now. The
 * one piece handed down gains a generation mark. Returns what happened (for the farewell), or null (nothing changes) when it cannot.
 */
export function passMantle(m: Meta, kind: string, opts: { pick: number; honour: Honour; heirloom?: number }, now: number, day: number): Mantle | null {
  if (whyNoMantle(m, kind, opts, now)) return null;
  const line = lineOf(m, kind)!;
  const picks = heirPicks(m, kind, now)!;
  const partner = line.heir!.partner;
  const elderAt = line.current;
  const elder = line.bearers[elderAt];
  const parents: [string, string] = [elder.name, bearerName(m, partner)];
  const chosen = picks[opts.pick];
  const other = picks[1 - opts.pick];
  const gen = Math.min(99, elder.gen + 1);
  const grudge = bloodGrudgeFor(m, kind, partner);
  const heir: Bearer = { name: chosen.name, gen, served: 0, parents, partner, look: chosen.look, birthright: chosen.birthright, promise: dayNumber(day) + DYNASTY.SEASON_DAYS - 1, ...(grudge !== undefined ? { grudge } : {}) };
  const cadet: Bearer = { name: other.name, gen, served: 0, parents, partner, look: other.look, birthright: other.birthright, cadet: true };
  // (the heirloom: one of the elder's worn pieces gains a generation mark; it stays worn, now by the heir)
  const piece = opts.heirloom !== undefined ? heirloomChoices(m, kind).find((x) => x.id === opts.heirloom) : undefined;
  if (piece) {
    piece.heirloom = { marks: Math.min(HEIRLOOM_MAX, (piece.heirloom?.marks ?? 0) + 1), house: piece.heirloom?.house ?? kind, bearer: heir.name };
    heir.heirloom = piece.id;
  }
  const wasOut = retired(m, kind);
  line.bearers.push(heir, cadet);
  line.current = line.bearers.length - 2;
  delete line.heir;
  delete line.field;
  // (the elder's honour; a mentor of the Hall from before keeps its seat, now with its line going on)
  if (opts.honour === 'mentor' && elder.fate === 'mentor') seatMentor(m, kind, now);
  else giveHonour(m, kind, elderAt, opts.honour, now);
  elder.honourAt = now + HEIRS.HONOUR_MS;
  const tag = seasonTag(m, day);
  remember(elder, `Passed the mantle to ${heir.name} · ${tag}`);
  remember(heir, `Took up the mantle of ${elder.name} · ${tag}`);
  remember(cadet, `Passed over for ${heir.name}: the cadet line · ${tag}`);
  // (a mentor from before had left the party: with an heir its kind comes back to it, while there is room)
  if (wasOut && !m.party.includes(kind) && m.party.length < Math.min(PARTY_SIZE, m.unlocked.length)) m.party.push(kind);
  // (the season's waves so far were the elder's)
  if (m.dynasty?.served?.[kind]) delete m.dynasty.served[kind];
  return { kind, elder, heir, cadet, honour: opts.honour, ...(piece ? { heirloom: piece } : {}), ...(grudge !== undefined ? { grudge } : {}) };
}

// ---- fielding the elder -------------------------------------------------------------------------------------------------------

/** The bearers the party picker's banner may field for a kind: the current bearer first, then each honoured elder (never a cadet, never
 *  one fallen). */
export function bannerChoices(m: Pick<Meta, 'dynasty'>, kind: string): { index: number; bearer: Bearer; current: boolean }[] {
  const line = lineOf(m, kind);
  if (!line) return [];
  const out = [{ index: line.current, bearer: line.bearers[line.current], current: true }];
  line.bearers.forEach((b, i) => {
    if (i < line.current && !b.cadet && b.fate && b.fate !== 'fallen') out.push({ index: i, bearer: b, current: false });
  });
  return out;
}

/** Field a line's bearer: an honoured elder in the heir's place, or the current bearer again. False (nothing changes) for anyone else. */
export function fieldBearer(m: Meta, kind: string, index: number): boolean {
  const line = lineOf(m, kind);
  if (!line || !bannerChoices(m, kind).some((c) => c.index === index)) return false;
  if (index === line.current) delete line.field;
  else line.field = index;
  return true;
}

/** The mentors whose honour lapses for the run: an elder mentor fielded by the banner gives no perk (as on recall, but no cooldown starts).
 *  The rest of the save is as it is. */
export function lapsedLegacy(m: Meta): LegacyMeta {
  const out: NonNullable<LegacyMeta['mentors']> = {};
  for (const [c, x] of Object.entries(m.mentors ?? {})) {
    if (!x) continue;
    const f = fieldedOf(m, x.kind);
    const l = lineOf(m, x.kind);
    if (x.heir && l && l.field !== undefined && l.field !== l.current && f?.fate === 'mentor') continue;
    out[c as keyof typeof out] = x;
  }
  return { ...m, mentors: Object.keys(out).length ? out : undefined };
}

// ---- the birthright, the Blood Grudge and the Promise in play -----------------------------------------------------------------

/** A bearer's birthright: the perk and its number at its first band. */
export function birthrightOf(b: Bearer | undefined): { from: string; perk: Perk; value: number } | null {
  const perk = b?.birthright ? PERKS[b.birthright] : undefined;
  return perk && b?.birthright ? { from: b.birthright, perk, value: perk.steps[0] } : null;
}
/** A birthright's line: "Long Road: +3% health". */
export function birthrightWords(b: Bearer | undefined): string {
  const r = birthrightOf(b);
  if (!r) return '';
  const v = Math.round(r.value * 1000) / 10;
  return `${r.perk.name}: ${r.perk.kind === 'shield' ? `starts each wave with a ${v}% shield` : r.perk.kind === 'atk' ? `+${v}% attack` : `+${v}% health`}`;
}

/** The fielded bearers' birthrights for a party, as the legacy snapshot's boost numbers (`Run.legacy`'s shape). Only those with one. */
export function birthrightSnapshot(m: Pick<Meta, 'dynasty'>, kinds: readonly string[]): Record<string, { hp?: number; atk?: number; shield?: number }> {
  const out: Record<string, { hp?: number; atk?: number; shield?: number }> = {};
  for (const k of new Set(kinds)) {
    const r = birthrightOf(fieldedOf(m, k));
    if (r) out[k] = { [r.perk.kind]: r.value };
  }
  return out;
}
/** Two snapshots in one: a mentor's perk and a birthright of the same kind add up. */
export function addSnapshots(a: Record<string, { hp?: number; atk?: number; shield?: number }>, b: Record<string, { hp?: number; atk?: number; shield?: number }>): Record<string, { hp?: number; atk?: number; shield?: number }> {
  const out: Record<string, { hp?: number; atk?: number; shield?: number }> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? {};
    const y = b[k] ?? {};
    const z: { hp?: number; atk?: number; shield?: number } = {};
    for (const s of ['hp', 'atk', 'shield'] as const) if ((x[s] ?? 0) + (y[s] ?? 0)) z[s] = Math.round(((x[s] ?? 0) + (y[s] ?? 0)) * 1e6) / 1e6;
    out[k] = z;
  }
  return out;
}

/** The Heir's Promise: a fight's lasting XP with +25% for each heir in its first season (fielded, not an elder in its place). Only XP:
 *  at the level cap it gains nothing. */
export function promiseXp(m: Pick<Meta, 'dynasty'>, gains: Record<string, number>, day: number): Record<string, number> {
  const today = dayNumber(day);
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(gains)) {
    const l = lineOf(m, k);
    const b = l && (l.field === undefined || l.field === l.current) ? l.bearers[l.current] : undefined;
    out[k] = b?.promise !== undefined && b.promise >= today ? Math.round(n * (1 + HEIRS.PROMISE_XP)) : n;
  }
  return out;
}
/** Days of the Promise left (0 when it is over). */
export function promiseLeft(b: Bearer | undefined, day: number): number {
  return b?.promise !== undefined ? Math.max(0, b.promise - dayNumber(day) + 1) : 0;
}

// ---- the Elders' table --------------------------------------------------------------------------------------------------------

/** The line's latest elder at the Elders' table. */
export function regularOf(m: Pick<Meta, 'dynasty'>, kind: string): { index: number; bearer: Bearer } | undefined {
  const line = lineOf(m, kind);
  if (!line) return undefined;
  for (let i = line.bearers.length - 1; i >= 0; i--) if (line.bearers[i].fate === 'regular') return { index: i, bearer: line.bearers[i] };
  return undefined;
}
/** Every regular, in the table's order. */
export const regularsOf = (m: Pick<Meta, 'dynasty'>): string[] => (m.dynasty?.regulars ?? []).filter((k) => !!regularOf(m, k));
/** Who sits at the table today: six seats, and more regulars take turns, one a day. */
export function seatedToday(m: Pick<Meta, 'dynasty'>, day: number): string[] {
  const all = regularsOf(m);
  if (all.length <= HEIRS.SEATS) return all;
  const start = dayNumber(day) % all.length;
  return Array.from({ length: HEIRS.SEATS }, (_, i) => all[(start + i) % all.length]);
}
/** Today's storyteller, if the table has anyone. */
export function storyteller(m: Pick<Meta, 'dynasty'>, day: number): string | undefined {
  const s = seatedToday(m, day);
  return s.length ? s[dayNumber(day) % s.length] : undefined;
}
/** The story the storyteller tells today: a page of the Codex (a foe the player has met, by the day), or the teller's own. */
export function storyOf(m: Meta, day: number): { kind: string; name: string; title: string; text: string } | undefined {
  const k = storyteller(m, day);
  if (!k) return undefined;
  const name = regularOf(m, k)!.bearer.name;
  const met = metEntries(m).filter((e) => FOE_LORE[e.id]);
  if (met.length) {
    const e = met[(dayNumber(day) + hash(k)) % met.length];
    return { kind: k, name, title: `${name} tells of the ${e.name}`, text: FOE_LORE[e.id] };
  }
  return { kind: k, name, title: `${name} tells their own story`, text: HERO_STORY[k] ?? 'An old story of the road, told slowly, with the good parts twice.' };
}
/** Whether today's story is still to hear. */
export const storyWaits = (m: Pick<Meta, 'dynasty'>, day: number): boolean => !!storyteller(m, day) && m.dynasty?.story !== day;
/** Hear today's story: 50 crowns, once a day. Returns it, or null when it is told already or nobody sits at the table. */
export function hearStory(m: Meta, day: number): ReturnType<typeof storyOf> | null {
  if (!storyWaits(m, day)) return null;
  const s = storyOf(m, day);
  if (!s) return null;
  m.dynasty!.story = day;
  m.crowns += HEIRS.STORY_CROWNS;
  return s;
}

/** Why a regular cannot ride with the next march as its guest (null when it can): once a day, free, while its line's heir is not in the party. */
export function whyNoRide(m: Meta, kind: string, day: number): string | null {
  const d = m.dynasty;
  if (!d || !regularOf(m, kind)) return 'Not at the table';
  if (d.guestDay === day) return 'An elder has ridden out today already';
  if (d.guest?.day === day) return d.guest.kind === kind ? 'Rides with the next march' : `${regularOf(m, d.guest.kind)?.bearer.name ?? 'Another'} rides with the next march`;
  if (m.party.includes(kind)) return `${bearerName(m, kind)}, the heir, marches in the party`;
  return null;
}
/** Ask a regular to ride with the next march (an army or the daily) as its guest. */
export function askRide(m: Meta, kind: string, day: number): boolean {
  if (whyNoRide(m, kind, day)) return false;
  m.dynasty!.guest = { kind, day };
  return true;
}
/** As a run begins: the regular asked to ride today, if the run may meet a guest and does not have the kind already. It is taken off the
 *  table's list for the day (the caller hires it, free). A ride asked on another day lapses. */
export function takeRide(m: Meta, runKinds: readonly string[], guestsHere: boolean, day: number): string | null {
  const d = m.dynasty;
  const g = d?.guest;
  if (!d || !g) return null;
  if (g.day !== day) {
    delete d.guest;
    return null;
  }
  if (!guestsHere || runKinds.includes(g.kind) || !regularOf(m, g.kind)) return null;
  delete d.guest;
  d.guestDay = day;
  return g.kind;
}

/** The cadet lines: every passed-over candidate, by kind. */
export function cadetsOf(m: Pick<Meta, 'dynasty'>): { kind: string; bearer: Bearer; heir: string }[] {
  const out: { kind: string; bearer: Bearer; heir: string }[] = [];
  for (const [kind, line] of Object.entries(m.dynasty?.lines ?? {}))
    line.bearers.forEach((b, i) => {
      if (!b.cadet) return;
      const heir = line.bearers.find((x, j) => j !== i && x.gen === b.gen && !x.cadet);
      out.push({ kind, bearer: b, heir: heir?.name ?? '' });
    });
  return out;
}
/** The cadet who visits the tavern today, now and then (some days nobody does). */
export function cadetVisiting(m: Pick<Meta, 'dynasty'>, day: number): { kind: string; bearer: Bearer; heir: string } | undefined {
  const c = cadetsOf(m);
  if (!c.length) return undefined;
  return c[(dayNumber(day) * 7 + 3) % (c.length + 2)];
}

// ---- notes and filters --------------------------------------------------------------------------------------------------------

/** The one-time note: the Hall's mentors may now name an heir (a save with a mentor from before is told once). */
export function takeHeirNote(m: Meta): boolean {
  const d = m.dynasty;
  if (!d || d.heirNote) return false;
  const any = Object.values(d.lines).some((l) => l.bearers[l.current]?.fate === 'mentor');
  if (!any) return false;
  d.heirNote = 1;
  return true;
}
export const HEIR_NOTE = 'The Hall’s mentors may now name an heir with a Sworn partner: the heir brings their kind back to the party, with the mentor still seated.';

/** Whether a line has an heir: one named (in training or ready), or a generation after the first. */
export const hasHeirs = (l: Line | undefined): boolean => !!l && (!!l.heir || l.bearers.some((b) => b.gen > 1));

/** The words a bearer's stage needs to name an heir, for the cards. */
export const heirStageNote = `A Veteran (${STAGE_FROM.veteran} seasons served) or an Elder may name an heir.`;

/** The farewell and arrival: the elder hands over the heirloom, in the backdrop of its honour. Lines for the page's card: [who, words]. */
export function farewellLines(r: Mantle): ['elder' | 'heir', string][] {
  const piece = r.heirloom ? 'this' : 'the House';
  const where: Record<Honour, string> = {
    mentor: 'The Hall of Legends has a seat for me. Come and ask me anything, when the road is hard.',
    regular: 'I will be at the long table in the tavern, telling the same stories badly. Come and correct me.',
    shade: 'I go where the horn can find me. When it sounds, I will come.',
  };
  return [
    ['elder', `${r.heir.name}. Take ${piece}. It was mine, and it is yours now.`],
    ['heir', `I will carry it as you did, ${r.elder.name}.`],
    ['elder', where[r.honour]],
    ['heir', r.grudge !== undefined ? 'And the one who struck you down? I know its name.' : 'Then I will make the House proud.'],
  ];
}

/** The training card's line for the hero sheet and the bearer card. */
export function heirLine(m: Meta, kind: string, now: number): string {
  const st = heirState(m, kind, now);
  if (st.state === 'training') return `An heir with ${bearerName(m, st.partner)} trains at the castle: ${trainWords(st.left)}`;
  if (st.state === 'ready') return `The heir is ready: the mantle may pass`;
  return '';
}

/** The slot the heirloom was worn in (for the card), if it is still worn. */
export function heirloomSlot(m: Meta, kind: string, id: number): EquipSlot | undefined {
  const worn = m.equipped?.[kind] ?? {};
  return (Object.entries(worn) as [EquipSlot, number][]).find(([, x]) => x === id)?.[0];
}
