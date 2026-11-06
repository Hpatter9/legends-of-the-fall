// Dynasties, part 3: the Legend Oath and the Shades (docs/design/legends-expansion.md section 3.6; phase 7 of section 9;
// docs/notes/dynasty-7.md). The owner's answers hold: the Oath is sworn **per run**, on Hard or harder; **the bearer can die, the progress
// never does**; the fallen become **Shades** on the War Horn.
//
//   - **Swearing the Oath.** A toggle on the March orders for an army run on Hard or harder, open from the save's first Passing of the
//     Mantle. It is the run's alone (`Run.oath`): the next run marches free of it unless it is sworn again. Auto never swears it.
//   - **Slain, not fallen.** Under the Oath a hero who falls in a wave that is then lost, or who falls a second time in the run (a fall is
//     counted at a heart's burn and at the wave's end), is **slain**: the bearer dies, and its kind sits out the rest of the run. The run
//     goes on as normal for the rest of the party.
//   - **What dies is the person, not the progress.** Every lasting thing stays keyed by the kind (XP and level, ranks, awakening, talents,
//     books, gear and skills): none of it is touched. If the line has a trained heir, the heir takes up the mantle at once. If not, the line
//     **mourns for 3 days** (the kind cannot be fielded in the armies), and then a **foundling heir** (a generation on, no birthright)
//     takes it up, with a Blood Grudge on the slayer while it lives. An elder fielded in the heir's place who is slain leaves the line as it
//     is: the heir still holds the slot.
//   - **The Shades.** The fallen, and the elders honoured as Shades (kind level 100), wait on the War Horn: one may be chosen on the horn's
//     card to answer it in the Eidolon's place (`warHorn.ts` `shade`; the strike and riders are `eidolons.ts`'s `SHADE`). Auto never calls.
//   - **The Oath pays**: ×1.5 crowns and XP, +1 War Trophy a wave won (inside the daily cap of 12), and **Legend renown** on each bearer of
//     the run when it is cleared. Three Oath clears make a bearer a **Legend** (a gold frame on the family tree). The nemesis that slays a
//     Legend becomes a **Legend-slayer**: +2 Might, and the bearer's name in its epithet ("Gash, Ravi-Killer").
//
// Pure rules: no Pixi, no DOM, no clock (the page passes `now`, ms, and the day key) and no randomness: who falls is read from the fight,
// who slew them from the War's tally of it, and the foundling's name is the first of its kind's bank not yet borne. A fight is never
// changed here, so every fight plays out as it did.

import type { Battle } from './battle';
import type { Run } from './run';
import type { Meta } from './meta';
import type { NemesisTally } from './nemesisLog';
import type { NemNote } from './nemesis';
import { fullName, MIGHT_MAX } from './nemesis';
import { news, TROPHY_DAY } from './council';
import { UNITS } from './units';
import { HERO_NAMES } from './heroNames';
import { HEIR_NAMES } from './heirNames';
import { levelOfKind } from './levels';
import { callingOf } from './weakness';
import { bearerOf, dayNumber, DYNASTY, fieldedOf, lineOf, seasonIndex, SEASONS, SEASON_WORDS, type Bearer } from './dynasty';
import { giveHonour, heirState, HEIRS, passMantle } from './heirs';
import { hornHeld, type HornMeta } from './warHorn';
import type { ShadeFight } from './eidolons';

/** The numbers (one place to tune them). */
export const OATH = {
  /** The lowest tier the Oath can be sworn on: Hard. */
  TIER: 1,
  /** A line whose bearer was slain with no heir trained mourns this many real days. */
  MOURN_DAYS: 3,
  /** The Oath's pay: crowns and XP. */
  PAY: 1.5,
  /** War Trophies a wave won (inside the daily cap). */
  TROPHY: 1,
  /** Oath clears that make a bearer a Legend. */
  LEGEND: 3,
  /** A Legend-slayer's Might. */
  SLAYER_MIGHT: 2,
  /** Falls in a run that slay a bearer. */
  FALLS: 2,
};

const remember = (b: Bearer, line: string): void => {
  b.memory = [...(b.memory ?? []), line].slice(-DYNASTY.MAX_MEMORY);
};
const seasonTag = (m: Pick<Meta, 'dynasty'>, day: number): string => {
  const i = m.dynasty ? seasonIndex(m.dynasty, day) : 0;
  return `Year ${Math.floor(i / 4) + 1}, ${SEASON_WORDS[SEASONS[i % 4]]}`;
};

// ---- swearing it ----------------------------------------------------------------------------------------------------------------

/** Whether the Oath is open for the save: from its first Passing of the Mantle (a bearer of a later generation who is not a cadet). */
export const oathOpen = (m: Pick<Meta, 'dynasty'>): boolean => Object.values(m.dynasty?.lines ?? {}).some((l) => l.bearers.some((b) => b.gen > 1 && !b.cadet));

/** Why the Oath cannot be sworn for an army run on this tier (null when it can). */
export function whyNoOath(m: Pick<Meta, 'dynasty'>, tier: number): string | null {
  if (!oathOpen(m)) return 'Opens with the first Passing of the Mantle';
  if (tier < OATH.TIER) return 'Hard or harder only';
  return null;
}
export const canSwear = (m: Pick<Meta, 'dynasty'>, tier: number): boolean => whyNoOath(m, tier) === null;

/** Swear the Oath for a run that is starting (an army run on Hard or harder, the Oath open). False (nothing changes) otherwise. */
export function swearOath(m: Pick<Meta, 'dynasty'>, run: Run): boolean {
  if (run.mode?.kind !== 'army' || !canSwear(m, run.mode.tier ?? 0)) return false;
  run.oath = true;
  return true;
}
/** The Oath's pay for a run: ×1.5 crowns and XP under it, ×1 otherwise. */
export const oathPay = (run: Pick<Run, 'oath'> | undefined): number => (run?.oath ? OATH.PAY : 1);
/** The wave's crowns under the Oath (as the March orders' `marchCrowns`): the extra half added to the save and the pay. Returns it. */
export function oathCrowns(m: { crowns: number }, pay: { crowns: number }, run: Pick<Run, 'oath'>): number {
  if (!run.oath || pay.crowns <= 0) return 0;
  const extra = Math.round(pay.crowns * (OATH.PAY - 1));
  m.crowns += extra;
  pay.crowns += extra;
  return extra;
}

// ---- the falls --------------------------------------------------------------------------------------------------------------------

/** The run's own heroes on a fight's board who are down now (roster ids: no guest, clone or summon). */
function downNow(run: Run, b: Battle): number[] {
  const out: number[] = [];
  for (const u of b.units) {
    if (u.side !== 'hero' || u.alive || u.tag === undefined || u.owner !== undefined || UNITS[u.def]?.summon) continue;
    const h = run.roster.find((x) => x.id === u.tag);
    if (h && !h.guest && h.cloneFloors === undefined && !out.includes(h.id)) out.push(h.id);
  }
  return out;
}

/** A heart burns under the Oath: the heroes down are counted a fall each (they rise for the wave again, but it was a fall). */
export function noteOathFalls(run: Run, b: Battle): void {
  if (!run.oath) return;
  for (const id of downNow(run, b)) {
    const k = String(id);
    (run.oathFalls ??= {})[k] = (run.oathFalls[k] ?? 0) + 1;
    if (!(run.oathWave ??= []).includes(id)) run.oathWave.push(id);
  }
}

/** Whether a run hero's kind has been slain under the Oath this run: it sits out the rest of it. */
export const slainKind = (run: Pick<Run, 'slain' | 'roster'>, kind: string): boolean => !!run.slain?.some((id) => run.roster.find((h) => h.id === id)?.kind === kind);

/** One bearer slain under the Oath, for the wave card and the tests. */
export interface Slain {
  kind: string;
  name: string;
  /** The nemesis that slew it, if one did and lives (its id and full name). */
  by?: number;
  byName?: string;
  /** What became of the line: the trained heir took up the mantle, the line mourns, or an elder fielded in the heir's place fell. */
  then: 'heir' | 'mourning' | 'elder';
  heir?: string;
  /** It was a Legend: its slayer is a Legend-slayer now. */
  legend?: boolean;
}
export interface OathNote {
  slain: Slain[];
  trophies: number;
  /** Bearers made Legends by this clear. */
  legends: string[];
  /** Renown gained (bearers' names) by this clear. */
  renown: string[];
  lines: string[];
}

/** The living nemesis that struck a hero down in this fight (by the War's tally and its note of who was named): its id, if any. */
function slayerOf(m: Meta, b: Battle, unitId: number, tally: NemesisTally | undefined, note: NemNote | undefined): number | undefined {
  if (!tally) return undefined;
  const live = new Set((m.war?.members ?? []).map((n) => n.id));
  for (const [uid, f] of Object.entries(tally.foes)) {
    if (!f.slewIds.includes(unitId)) continue;
    const u = b.units.find((x) => x.id === Number(uid));
    const id = u?.nem?.id ?? note?.born.find((x) => x.uid === Number(uid))?.id;
    if (id !== undefined && live.has(id)) return id;
  }
  return undefined;
}

/**
 * Settle a wave under the Oath (from `settleRun`, after the War has read the fight). The heroes down at its end are counted a fall each;
 * those with two falls in the run, and every one who fell in a wave that was lost, are slain: their bearers die (`slayBearer`), their kind
 * sits out the rest of the run. A wave won pays a War Trophy (inside the daily cap); a run cleared gives each of its bearers renown. A run
 * without the Oath is untouched: null.
 */
export function settleOath(m: Meta, run: Run, b: Battle, won: boolean, opts: { tally?: NemesisTally; note?: NemNote; now: number; day: number }): OathNote | null {
  if (!run.oath) return null;
  const out: OathNote = { slain: [], trophies: 0, legends: [], renown: [], lines: [] };
  const down = downNow(run, b);
  for (const id of down) {
    const k = String(id);
    (run.oathFalls ??= {})[k] = (run.oathFalls[k] ?? 0) + 1;
  }
  const fellThisWave = [...new Set([...(run.oathWave ?? []), ...down])];
  delete run.oathWave;
  const doomed = fellThisWave.filter((id) => !won || (run.oathFalls?.[String(id)] ?? 0) >= OATH.FALLS);
  for (const id of doomed) {
    const h = run.roster.find((x) => x.id === id);
    if (!h || run.slain?.includes(id) || slainKind(run, h.kind)) continue;
    (run.slain ??= []).push(id);
    // (the kind sits out the rest of the run, and no hire draws it)
    run.squad = run.squad.filter((x) => run.roster.find((r) => r.id === x)?.kind !== h.kind);
    if (run.pool) run.pool = run.pool.filter((k) => k !== h.kind);
    if (!m.unlocked.includes(h.kind)) continue;
    const unit = b.units.find((u) => u.side === 'hero' && u.tag === id);
    const by = unit ? slayerOf(m, b, unit.id, opts.tally, opts.note) : undefined;
    const s = slayBearer(m, h.kind, by, opts.now, opts.day);
    if (s) {
      out.slain.push(s);
      out.lines.push(slainLine(s));
    }
  }
  // (the pay: a War Trophy a wave won, inside the daily cap)
  const war = m.war;
  if (won && war) {
    if (!war.trophyDay || war.trophyDay.key !== opts.day) war.trophyDay = { key: opts.day, got: 0 };
    const got = Math.max(0, Math.min(OATH.TROPHY, TROPHY_DAY - war.trophyDay.got));
    war.trophyDay.got += got;
    war.trophies += got;
    out.trophies = got;
    if (got) out.lines.push(`The Oath holds: War Trophies +${got}`);
  }
  // (a run cleared under the Oath: renown for each of its bearers who lived; three clears make a Legend)
  if (run.cleared && won) {
    const kinds = [...new Set(run.roster.filter((h) => !h.guest && h.cloneFloors === undefined && !slainKind(run, h.kind)).map((h) => h.kind))].filter((k) => m.unlocked.includes(k));
    for (const k of kinds) {
      const bearer = fieldedOf(m, k);
      if (!bearer || bearer.fate === 'fallen') continue;
      bearer.legend = (bearer.legend ?? 0) + 1;
      out.renown.push(bearer.name);
      if (bearer.legend === OATH.LEGEND) {
        remember(bearer, `Became a Legend of the Oath · ${seasonTag(m, opts.day)}`);
        out.legends.push(bearer.name);
      }
    }
    if (out.renown.length) out.lines.push(`The Oath is kept: renown for ${out.renown.join(', ')}`);
    for (const n of out.legends) out.lines.push(`${n} is a Legend of the Oath`);
  }
  return out;
}

/** A slain bearer's line for the wave card. */
export function slainLine(s: Slain): string {
  const by = s.byName ? ` by ${s.byName}` : '';
  const then = s.then === 'heir' ? `: ${s.heir} takes up the mantle` : s.then === 'mourning' ? ': the House mourns for three days' : ': the heir holds the House';
  return `${s.name} is slain under the Oath${by}${then}`;
}

/** Whether a bearer is a Legend (three Oath clears or more). */
export const isLegend = (b: Bearer | undefined): boolean => (b?.legend ?? 0) >= OATH.LEGEND;

/**
 * A bearer is slain under the Oath: the one fielded for the kind (an elder the banner chose, else the current bearer). Nothing lasting of
 * the kind is touched. An elder slain falls (it leaves the Hall or the table), and the heir holds the slot as before. The current bearer
 * slain falls: its trained heir takes up the mantle at once (the first candidate, with a Blood Grudge on the slayer while it lives), or
 * the line mourns for three days. A Legend's slayer becomes a Legend-slayer. Returns what happened, or null when the kind has no line.
 */
export function slayBearer(m: Meta, kind: string, by: number | undefined, now: number, day: number): Slain | null {
  const line = lineOf(m, kind);
  if (!line) return null;
  const index = line.field !== undefined && line.field !== line.current && line.bearers[line.field] ? line.field : line.current;
  const b = line.bearers[index];
  if (!b || b.fate === 'fallen') return null;
  const n = by !== undefined ? m.war?.members.find((x) => x.id === by) : undefined;
  const legend = isLegend(b);
  const tag = seasonTag(m, day);
  // (a Legend's slayer: +2 Might, and the bearer's name in its epithet)
  if (n && legend) {
    n.might = Math.min(MIGHT_MAX, n.might + OATH.SLAYER_MIGHT);
    n.epithet = `${b.name}-Killer`;
    n.memory = [...n.memory, `Slew ${b.name}, a Legend of the Oath`].slice(-8);
    if (m.war) news(m.war, 'named', `${fullName(n)} slew ${b.name}, a Legend of the Oath, and is named for it`);
  }
  if (n) b.slainBy = n.id;
  if (n) b.slayer = fullName(n);
  remember(b, `Slain under the Oath${n ? ` by ${fullName(n)}` : ''} · ${tag}`);
  const out: Slain = { kind, name: b.name, then: 'elder', ...(n ? { by: n.id, byName: fullName(n) } : {}), ...(legend ? { legend: true } : {}) };
  if (index !== line.current) {
    giveHonour(m, kind, index, 'fallen', now);
    delete b.honourAt;
    delete line.field;
    return out;
  }
  // (the current bearer: its trained heir takes up the mantle at once, or the line mourns)
  if (heirState(m, kind, now).state === 'ready') {
    const r = passMantle(m, kind, { pick: 0, honour: 'fallen' }, now, day);
    if (r) {
      if (n) r.heir.grudge = n.id;
      out.then = 'heir';
      out.heir = r.heir.name;
      return out;
    }
  }
  giveHonour(m, kind, index, 'fallen', now);
  delete b.honourAt;
  delete line.field;
  line.mourning = dayNumber(day) + OATH.MOURN_DAYS;
  out.then = 'mourning';
  return out;
}

// ---- mourning and the foundlings --------------------------------------------------------------------------------------------------

/** Whether a kind's line mourns on this day: it cannot be fielded in the armies. */
export const mourning = (m: Pick<Meta, 'dynasty'>, kind: string, day: number): boolean => {
  const l = lineOf(m, kind);
  return !!l?.mourning && dayNumber(day) < l.mourning;
};
/** Days of mourning left (0 when none). */
export const mourningLeft = (m: Pick<Meta, 'dynasty'>, kind: string, day: number): number => {
  const l = lineOf(m, kind);
  return l?.mourning ? Math.max(0, l.mourning - dayNumber(day)) : 0;
};
/** The kinds in mourning today. */
export const mourners = (m: Pick<Meta, 'dynasty'>, day: number): string[] => Object.keys(m.dynasty?.lines ?? {}).filter((k) => mourning(m, k, day)).sort();
/** The party an army run may field today: the party less the lines in mourning. */
export const armyParty = (m: Pick<Meta, 'dynasty' | 'party'>, day: number): string[] => m.party.filter((k) => !mourning(m, k, day));

/** A foundling's name: the first of the kind's bank not yet borne in the line (no draw), or "<founder> the Younger". */
function foundlingName(kind: string, used: Set<string>): string {
  const bank = HEIR_NAMES[kind] ?? [];
  const founder = HERO_NAMES[kind]?.name ?? kind;
  return bank.find((x) => !used.has(x)) ?? (used.has(`${founder} the Younger`) ? `${founder} the Last` : `${founder} the Younger`);
}

/** Every mourning that has ended by this day: a trained heir takes up the mantle, else a foundling heir (a generation on, no birthright,
 *  a Blood Grudge on the slayer while it lives). An heir still training trains on, for the foundling to pass to. Returns the page's lines. */
export function settleMourning(m: Meta, now: number, day: number): string[] {
  const out: string[] = [];
  const live = new Set((m.war?.members ?? []).map((n) => n.id));
  for (const [kind, line] of Object.entries(m.dynasty?.lines ?? {})) {
    if (!line.mourning || dayNumber(day) < line.mourning) continue;
    delete line.mourning;
    const fallen = line.bearers[line.current];
    if (!fallen) continue;
    const grudge = fallen.slainBy !== undefined && live.has(fallen.slainBy) ? fallen.slainBy : undefined;
    const tag = seasonTag(m, day);
    if (heirState(m, kind, now).state === 'ready') {
      const r = passMantle(m, kind, { pick: 0, honour: 'fallen' }, now, day);
      if (r) {
        if (grudge !== undefined) r.heir.grudge = grudge;
        out.push(`The mourning ends: ${r.heir.name} takes up the mantle of ${fallen.name}`);
        continue;
      }
    }
    const heir: Bearer = { name: foundlingName(kind, new Set(line.bearers.map((x) => x.name))), gen: Math.min(99, fallen.gen + 1), served: 0, foundling: true, ...(grudge !== undefined ? { grudge } : {}) };
    remember(heir, `A foundling, took up the mantle of ${fallen.name} · ${tag}`);
    line.bearers.push(heir);
    line.current = line.bearers.length - 1;
    delete line.field;
    if (m.dynasty?.served?.[kind]) delete m.dynasty.served[kind];
    out.push(`The mourning ends: ${heir.name}, a foundling, takes up the mantle of ${fallen.name}`);
  }
  return out;
}

// ---- the Shades -------------------------------------------------------------------------------------------------------------------

/** A Shade waiting on the War Horn: a fallen bearer, or an elder honoured as a Shade. */
export interface Shade {
  /** "kind:index" (`EidolonMeta.shade`). */
  key: string;
  kind: string;
  index: number;
  bearer: Bearer;
  /** Fallen under the Oath (else honoured). */
  fallen: boolean;
}
const shadeKey = (kind: string, index: number): string => `${kind}:${index}`;

/** Every Shade of the save, by House then generation. */
export function shadesOf(m: Pick<Meta, 'dynasty'>): Shade[] {
  const out: Shade[] = [];
  for (const kind of Object.keys(m.dynasty?.lines ?? {}).sort()) {
    lineOf(m, kind)!.bearers.forEach((b, index) => {
      if ((b.fate === 'fallen' || b.fate === 'shade') && !b.cadet) out.push({ key: shadeKey(kind, index), kind, index, bearer: b, fallen: b.fate === 'fallen' });
    });
  }
  return out;
}
export const shadeByKey = (m: Pick<Meta, 'dynasty'>, key: string | undefined): Shade | undefined => (key ? shadesOf(m).find((s) => s.key === key) : undefined);

/** Why a Shade cannot answer the horn yet (null when it can): the War Horn must be held (an Eidolon bound), and an honoured Shade's kind
 *  must stand at level 100. Until then it shows greyed. */
export function whyNoShade(m: Meta, s: Shade | undefined): string | null {
  if (!s) return 'No Shade';
  if (!hornHeld(m)) return 'The War Horn first: bind an Eidolon at the Summoner';
  if (!s.fallen && levelOfKind(m, s.kind) < HEIRS.SHADE_LEVEL) return `Level ${HEIRS.SHADE_LEVEL} to answer the horn`;
  return null;
}
/** Why the Shade honour cannot be called on yet, for the honour's row (null when it can). */
export function whyShadeHonour(m: HornMeta): string | null {
  return hornHeld(m) ? null : 'Greyed until the War Horn is held: bind an Eidolon at the Summoner';
}

/** Choose a Shade to answer the horn (the Eidolon chosen stays, and answers again once the Shade is sent back). */
export function chooseShade(m: Meta, key: string): boolean {
  const s = shadeByKey(m, key);
  if (!s || whyNoShade(m, s)) return false;
  (m.eidolons ??= { horn: 0 }).shade = key;
  return true;
}
/** Send the chosen Shade back: the Eidolon answers again. */
export function dismissShade(m: HornMeta): void {
  if (m.eidolons) delete m.eidolons.shade;
}
/** The Shade that answers the horn now, if one is chosen and can. */
export function shadeChosen(m: Meta): Shade | undefined {
  const s = shadeByKey(m, m.eidolons?.shade);
  return s && !whyNoShade(m, s) ? s : undefined;
}

/** A Shade as a fight carries it: its kind, name, calling, and its slayer while that nemesis lives. */
export function shadeFight(m: Meta, s: Shade): ShadeFight {
  const live = s.bearer.slainBy !== undefined && (m.war?.members ?? []).some((n) => n.id === s.bearer.slainBy);
  return { kind: s.kind, name: s.bearer.name, calling: callingOf(s.kind) ?? 'martial', ...(live ? { slayer: s.bearer.slainBy } : {}) };
}

/** The Houses' "The fallen" filter: a line with a bearer slain under the Oath, or mourning. */
export const hasFallen = (l: { bearers: Bearer[]; mourning?: number } | undefined): boolean => !!l && (!!l.mourning || l.bearers.some((b) => b.fate === 'fallen'));

/** The current bearer of a kind, if it is a ghost: slain, and no next bearer has arrived yet (the line mourns). */
export const ghostOf = (m: Pick<Meta, 'dynasty'>, kind: string): Bearer | undefined => {
  const b = bearerOf(m, kind);
  return b?.fate === 'fallen' ? b : undefined;
};
/** The fallen elders of the Houses whose lines have a bearer again: their ghosts sit in a corner of the Hearth Hall. */
export const cornerGhosts = (m: Pick<Meta, 'dynasty'>): { kind: string; bearer: Bearer }[] =>
  Object.entries(m.dynasty?.lines ?? {}).flatMap(([kind, l]) => l.bearers.filter((b, i) => i !== l.current && b.fate === 'fallen').map((bearer) => ({ kind, bearer })));
