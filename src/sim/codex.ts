// The codex: a bestiary of every foe and boss the player has met, and a gallery of the heroes. Pure rules: no Pixi, no DOM, no
// randomness. What is kept in the meta (both fields optional, so older saves load as they were): the foe kinds met and the kills
// per kind (`Meta.codex`), counted when a fight settles from the battle's units, and the milestone rewards claimed
// (`Meta.codexClaimed`). Milestones sit at 25, 50, 75 and 100% of each collection and pay a few crowns, taken with a tap like
// achievements. The entries (one per look of foe, so the three minotaur sheets are one entry) are listed in `FOE_ENTRIES`.

import type { Battle } from './battle';
import { KITS, type Kit } from './abilities';
import { ARMIES } from './armies';
import { calBossBand, CAL_BOSSES, CAL_BOSS_FOES } from './calamityBosses';
import { ELITES } from './elites';
import { ELITE_FOES } from './eliteFoes';
import { BOSS_BANDS, BOSS_IDS, FIELD_BANDS, FOE_BANDS } from './foes';
import type { Meta } from './meta';
import { ALL_HEROES, UNITS, type UnitDef } from './units';

/** What the meta remembers: the foe kinds met (by `UNITS` id) and the kills per kind. */
export interface CodexRecord {
  met: string[];
  kills: Record<string, number>;
}

export type FoeClass = 'common' | 'boss' | 'elite' | 'calamity';

/** A bestiary entry: one or more of the foes' ids that look and are named alike, the first of them leads. */
export interface FoeEntry {
  id: string;
  name: string;
  defs: string[];
  class: FoeClass;
  /** An elite's or calamity boss's own title line, where it has one. */
  epithet?: string;
}

const CAL_TITLES: Record<string, string> = {
  calBoss1: 'First Herald of the Calamity',
  calBoss2: 'The Bramble That Remembers',
  calBoss3: 'He Who Calls the Hordes',
  calBoss4: 'The Wall That Walks',
  calBoss5: 'Bringer of the Last Flame',
  calBoss6: 'The End of All Roads',
};

function buildEntries(): FoeEntry[] {
  const out: FoeEntry[] = [];
  const byName = new Map<string, FoeEntry>();
  const plain = [...Object.values(UNITS).filter((u) => u.side === 'foe' && !ELITE_FOES[u.id] && !CAL_BOSS_FOES[u.id])];
  for (const d of plain) {
    const have = byName.get(d.name);
    if (have) {
      have.defs.push(d.id);
      continue;
    }
    const e: FoeEntry = { id: d.id, name: d.name, defs: [d.id], class: BOSS_IDS.includes(d.id) ? 'boss' : 'common' };
    byName.set(d.name, e);
    out.push(e);
  }
  for (const el of ELITES) out.push({ id: el.def, name: el.name, defs: [el.def], class: 'elite', epithet: el.epithet });
  for (const id of CAL_BOSSES) out.push({ id, name: CAL_BOSS_FOES[id].name, defs: [id], class: 'calamity', epithet: CAL_TITLES[id] });
  return out;
}

/** Every bestiary entry: the common foes, the bosses, the tower's elites and the calamity's heralds. */
export const FOE_ENTRIES: readonly FoeEntry[] = buildEntries();
export const entryOfDef = (def: string): FoeEntry | undefined => FOE_ENTRIES.find((e) => e.defs.includes(def));
const ALL_FOE_DEFS: readonly string[] = FOE_ENTRIES.flatMap((e) => e.defs);

/* ------------------------------------------------------------------ the record */

const blank = (): CodexRecord => ({ met: [], kills: {} });

/** A saved codex record read safely: unknown kinds dropped, counts whole and not negative. */
export function readCodex(raw: unknown): CodexRecord {
  const r = raw as Partial<CodexRecord> | undefined;
  if (!r || typeof r !== 'object') return blank();
  const met = Array.isArray(r.met) ? [...new Set(r.met.filter((d): d is string => typeof d === 'string' && ALL_FOE_DEFS.includes(d)))] : [];
  const kills: Record<string, number> = {};
  if (r.kills && typeof r.kills === 'object') for (const [d, n] of Object.entries(r.kills)) if (ALL_FOE_DEFS.includes(d) && typeof n === 'number' && n > 0) kills[d] = Math.floor(n);
  return { met, kills };
}

/**
 * Note a settled fight: each foe kind that stood on the board is met, and each foe that fell adds a kill to its kind. Reads the
 * battle's units (no randomness), so the same fight always notes the same. Returns the entries met for the first time.
 */
export function noteFoes(m: Meta, b: Pick<Battle, 'units'>): FoeEntry[] {
  const c = (m.codex ??= blank());
  const before = new Set(metEntries(m).map((e) => e.id));
  for (const u of b.units) {
    if (u.side !== 'foe' || !ALL_FOE_DEFS.includes(u.def)) continue;
    if (!c.met.includes(u.def)) c.met.push(u.def);
    if (!u.alive) c.kills[u.def] = (c.kills[u.def] ?? 0) + 1;
  }
  return FOE_ENTRIES.filter((e) => !before.has(e.id) && isMet(m, e));
}

/** Whether an entry has been met. A boss already beaten before the codex counts (it is in the meta's list of bosses). */
export const isMet = (m: Meta, e: FoeEntry): boolean => e.defs.some((d) => m.codex?.met.includes(d) || m.bosses.includes(d));
export const metEntries = (m: Meta): FoeEntry[] => FOE_ENTRIES.filter((e) => isMet(m, e));
/** Kills of every look in an entry. */
export const killsOf = (m: Meta, e: FoeEntry): number => e.defs.reduce((n, d) => n + (m.codex?.kills[d] ?? 0), 0);
export const heroKnown = (m: Meta, kind: string): boolean => m.unlocked.includes(kind);

/* ------------------------------------------------------------------ progress and rewards */

export type Collection = 'bestiary' | 'heroes';
export const COLLECTIONS: readonly Collection[] = ['bestiary', 'heroes'];
export const COLLECTION_NAMES: Record<Collection, string> = { bestiary: 'Bestiary', heroes: 'Heroes' };
/** The shares of a collection that pay a milestone. */
export const MILESTONES: readonly number[] = [25, 50, 75, 100];
/** The crowns of each milestone, in the same order. */
export const MILESTONE_CROWNS: Record<Collection, readonly number[]> = { bestiary: [10, 20, 35, 60], heroes: [15, 30, 50, 80] };

export const totalOf = (c: Collection): number => (c === 'bestiary' ? FOE_ENTRIES.length : ALL_HEROES.length);
export const gotOf = (m: Meta, c: Collection): number => (c === 'bestiary' ? metEntries(m).length : ALL_HEROES.filter((k) => heroKnown(m, k)).length);
/** "Bestiary 34/60" */
export const progressLine = (m: Meta, c: Collection): string => `${COLLECTION_NAMES[c]} ${gotOf(m, c)}/${totalOf(c)}`;

export interface Milestone {
  id: string;
  collection: Collection;
  percent: number;
  /** How many entries it takes. */
  need: number;
  crowns: number;
}

export const milestonesOf = (c: Collection): Milestone[] => MILESTONES.map((p, i) => ({ id: `${c}${p}`, collection: c, percent: p, need: Math.ceil((totalOf(c) * p) / 100), crowns: MILESTONE_CROWNS[c][i] }));
export const ALL_MILESTONES: readonly Milestone[] = COLLECTIONS.flatMap(milestonesOf);

export const milestoneReached = (m: Meta, ms: Milestone): boolean => gotOf(m, ms.collection) >= ms.need;
export const milestoneClaimed = (m: Meta, ms: Milestone): boolean => (m.codexClaimed ?? []).includes(ms.id);
/** Whether a milestone is reached and its crowns not yet taken. */
export const milestoneReady = (m: Meta, ms: Milestone): boolean => milestoneReached(m, ms) && !milestoneClaimed(m, ms);
/** The milestones whose crowns are waiting. */
export const codexWaiting = (m: Meta): Milestone[] => ALL_MILESTONES.filter((ms) => milestoneReady(m, ms));

/** Take a reached milestone's crowns. Returns the crowns paid (0 when it isn't reached, is unknown, or was claimed already). */
export function claimCodex(m: Meta, id: string): number {
  const ms = ALL_MILESTONES.find((x) => x.id === id);
  if (!ms || !milestoneReady(m, ms)) return 0;
  (m.codexClaimed ??= []).push(id);
  m.crowns += ms.crowns;
  return ms.crowns;
}

/** The saved claims read safely. */
export const readCodexClaimed = (raw: unknown): string[] | undefined => (Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && ALL_MILESTONES.some((ms) => ms.id === id)) : undefined);

/* ------------------------------------------------------------------ where a foe is met, and how to meet it */

/** Where an entry is met, in plain words. */
export function whereMet(e: FoeEntry): string[] {
  const out: string[] = [];
  if (e.class === 'elite') {
    const el = ELITES.find((x) => x.def === e.id)!;
    out.push(`Elite of the endless tower (${el.tier === 3 ? 'act 3 on' : `act ${el.tier}`})`);
  } else if (e.class === 'calamity') {
    out.push(`Calamity: the boss of map ${CAL_BOSSES.indexOf(e.id) + 1}`);
  } else {
    const inBand = (bands: readonly string[]) => bands.some((b) => FOE_BANDS[b].some((d) => e.defs.includes(d)));
    if (e.defs.some((d) => BOSS_BANDS.some((b) => FOE_BANDS[b][0] === d))) out.push('Boss stage of a run and the tower');
    else if (inBand(FIELD_BANDS)) out.push('Stages of a run and the tower');
    else if (inBand(BOSS_BANDS)) out.push('Boss stages of a run and the tower');
    for (const a of ARMIES) {
      if (!a.waves.some((w) => w.foes.some((f) => e.defs.includes(f)))) continue;
      const boss = a.waves.some((w) => w.boss && e.defs.includes(w.foes[0]));
      out.push(`${a.name}${boss ? ' (boss wave)' : ''}`);
    }
    if ([1, 2, 3, 4, 5, 6].some((map) => calBossBand(map).some((d) => e.defs.includes(d)))) out.push('Calamity maps');
    if (ELITES.some((x) => x.escort.some((d) => e.defs.includes(d)))) out.push('Escort of tower elites');
  }
  return out;
}

/** Tips and weaknesses worked out from a foe's stats and kit. */
export function tipsOf(def: UnitDef, kit: Kit | undefined): string[] {
  const t: string[] = [];
  const p = kit?.passive;
  const skill = kit?.skill;
  if (def.moveMs >= 900) t.push('Slow: shooters outrange it, and it arrives late.');
  else if (def.moveMs <= 420) t.push('Very quick: it will be on your back line before the front has moved. Keep a guard there.');
  if (def.flies) t.push('Flies: it ignores heights, so a ledge will not shield your line.');
  else if (def.jump >= 3) t.push('Leaps ledges: high ground alone will not hold it off.');
  if (def.range >= 3 || def.shot) t.push('Shoots from afar: a quick hero can reach it, or answer it from higher ground.');
  if (def.def >= 10) t.push('Heavily armoured: a few strong blows beat many weak ones.');
  else if (def.def <= 3) t.push('Brittle: any hero cuts it down quickly.');
  if (def.hp >= 1500) t.push('A wall of health: bring steady damage and a healer, and clear its escort first.');
  if (def.atkMs >= 1400 && def.atk >= 28) t.push('Heavy, slow blows: a tough hero in front soaks them.');
  if (p?.regen || p?.mend) t.push(p.mend ? 'Heals its allies: focus it first.' : 'Heals itself: burst it down, do not chip.');
  if (p?.leech) t.push('Drinks what it deals: kill it before it recovers.');
  if (p?.block) t.push('Shielded from the front: flank it, or shoot it.');
  if (p?.rage) t.push('Enrages as it falls: finish it quickly, or deal with its escort first.');
  if (p?.steady) t.push('Cannot be shoved: knockback skills will not move it.');
  if (p?.dodge) t.push('Slips some blows: area attacks and sure skills get through.');
  if (p?.ignite) t.push('Sets heroes alight: bring a healer or a cleanser.');
  if (p?.halo || p?.aura) t.push('Shields or mends the foes near it: break it up first.');
  if (p?.scales) t.push('Shrugs off shots: send melee heroes at it.');
  if (p?.thorns) t.push('Hurts what hits it in melee: use shooters.');
  if (p?.undying) t.push('Rises once from death: hold your best blow for the second life.');
  if (p?.frenzy) t.push('Quickens with every kill: do not feed it, and finish it fast.');
  if (p?.slow) t.push('Its blows slow heroes: keep fast heroes out of its reach.');
  const s = skill?.text.toLowerCase() ?? '';
  if (/(calls|raises|summons)/.test(s)) t.push('Calls helpers to its side: kill the caller first.');
  if (/(stun|stone|freez|hold|stiffen)/.test(s)) t.push('Its skill holds heroes still: spread them, and keep your strongest back.');
  if (/(shove|knock|push)/.test(s)) t.push('Shoves heroes back: do not stand them at a ledge.');
  if (/(charm|possess|turn)/.test(s)) t.push('Turns a hero against you: have a plan for losing your strongest.');
  return t.length ? [...new Set(t)].slice(0, 5) : ['Plain and honest: a steady front line will do.'];
}

/** The kit a foe entry uses. */
export const kitOfEntry = (e: FoeEntry): Kit | undefined => KITS[e.defs[0]];
