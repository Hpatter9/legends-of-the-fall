// Hero legacy (DEPTH-BUILD, docs/notes/depth-design.md section 8). A hero of lasting level 60 or more (Q8.1) can retire to the Hall of
// Legends to mentor its calling (the four kinds of book a hero reads: martial, arcane, devout, wild): one mentor a calling, one seat a
// Hall level. A mentor leaves the party and the armies, keeps its level, talents and books, and its gear goes back to the stash. Every
// other hero of the calling is its apprentice: +50% XP from every fight while below half the mentor's level, and the mentor's legacy perk,
// one small line of its own that grows at the mentor's levels 60, 80 and 100; a bonded partner of the mentor (bond level 3 or more) has
// it at double strength (Q8.3). A mentor can be recalled; the seat then stays empty for seven days (Q8.2). Perks count where talents do
// (the armies), fixed into the run at its start (`Run.legacy`). Pure rules: no Pixi, no DOM, no randomness (the page passes the clock).

import type { Boost } from './battle';
import { callingOf, type Calling } from './weakness';
import { levelOfKind } from './levels';
import { siteLevel } from './castle';
import { bondKey, levelOf as bondLevelOf } from './bonds';
import type { Meta } from './meta';
import { HERO_KINDS_OF_CALLING } from './legacyData';

export { callingOf, type Calling };
export const CALLINGS: readonly Calling[] = ['martial', 'arcane', 'devout', 'wild'];
export const CALLING_NAMES: Record<Calling, string> = { martial: 'martial', arcane: 'arcane', devout: 'devout', wild: 'wild' };

export const LEGACY = {
  RETIRE_LEVEL: 60,
  /** The seat stays empty this long after a recall (ms). */
  RECALL_MS: 7 * 24 * 60 * 60 * 1000,
  /** Apprentices' XP while below half the mentor's level. */
  CATCH_UP: 0.5,
  /** The perk's steps by the mentor's level band (60, 80, 100), and a bonded partner's share. */
  BANDS: [60, 80, 100] as readonly number[],
  BOND_LEVEL: 3,
  BOND_MULT: 2,
};

export type PerkKind = 'shield' | 'atk' | 'hp';
/** A legacy perk: its name and line, its kind and its number at each band (a share: 0.05 is 5%). */
export interface Perk {
  name: string;
  kind: PerkKind;
  steps: readonly [number, number, number];
}
const P = (name: string, kind: PerkKind, a: number, b: number, c: number): Perk => ({ name, kind, steps: [a, b, c] });
const sh = (name: string) => P(name, 'shield', 0.04, 0.06, 0.08);
const at = (name: string) => P(name, 'atk', 0.02, 0.03, 0.04);
const hp = (name: string) => P(name, 'hp', 0.03, 0.045, 0.06);

/** Each hero's legacy perk: one per hero, 45 lines. */
export const PERKS: Readonly<Record<string, Perk>> = {
  knight: sh('Shield-Call'), samurai: at('The Drawn Edge'), kunoichi: at('Unseen Step'), archer: at('Steady Draw'), wizard: at('First Spark'),
  peasant: hp('Harvest Hands'), ninjaMonk: hp('Still Breath'), wanderer: hp('Long Road'), lightningMage: at('Static Charge'), kitsune: at('Foxfire Trick'),
  karasu: at('Crow\'s Eye'), yamabushi: hp('Mountain Wind'), werewolf: at('Pack Hunger'), minotaur: hp('Labyrinth Hide'), satyr: hp('Reveller\'s Cheer'),
  gorgon: sh('Stone Skin'), samuraiCommander: at('Banner Discipline'), paladin: sh('Oath Ward'), cleric: hp('Mercy'), druid: hp('Green Mending'),
  barbarian: at('War Cry'), ranger: at('Trail Sense'), warlock: at('Small Pact'), illusionist: sh('Mirror Veil'), gunslinger: at('Quick Draw'),
  shambler: hp('Unquiet Flesh'), rifleBot: at('Calibrated Aim'), mercenary: at('Paid in Full'), mummy: sh('Grave Wraps'), buccaneer: at('Boarding Party'),
  wolfBard: hp('Marching Song'), beastmaster: at('Kennel Lore'), kraken: hp('Deep Pressure'), lancer: at('Couched Lance'), reaper: at('Last Harvest'),
  timeWitch: sh('Borrowed Second'), arcBlade: at('Arc Edge'), dreadPirate: at('Black Flag'), siegeBot: sh('Plated Hull'), priestess: sh('Sanctuary'),
  dragoon: at('High Jump'), juggernaut: hp('Unstoppable'), sage: sh('Patient Mind'), demonSwordsman: at('Hellforged Edge'), tyrant: at('Iron Decree'),
  vampireLord: at('Old Blood'), hemomancer: sh('Blood Ward'), nightstalker: at('Night Wings'), bloodGargoyle: sh('Granite Skin'), dhampir: at('Silver Edge'), warDrummer: hp('War Cadence'), geomancer: hp('Bedrock'), bellWarden: sh('Bronze Toll'), falconer: at('Falcon\'s Eye'),
};

/** The twenty coming heroes' legacy perks (docs/notes/twenty-heroes.md: they wait for their battle sheets; each row moves into the table above when its hero joins `ALL_HEROES`). */
export const COMING_PERKS: Readonly<Record<string, Perk>> = {
  banneret: sh('Under the Standard'),
  astralSphinx: sh('Starlit Riddle'), mirageDancer: at('Shifting Sands'), plagueDoctor: hp('Bitter Tonic'), bombardier: at('Short Fuse'), astrologer: sh('Fixed Stars'),
  inquisitor: at('Burning Writ'), seraph: sh('Golden Wings'), corsairSurgeon: hp('Ship\'s Surgeon'), harpooner: at('Barbed Line'), seaReaver: hp('Salt Hide'),
};
export const perkLine = (p: Perk, v: number): string =>
  p.kind === 'shield' ? `apprentices start each wave with a ${Math.round(v * 100)}% shield` : p.kind === 'atk' ? `apprentices +${Math.round(v * 1000) / 10}% attack` : `apprentices +${Math.round(v * 1000) / 10}% health`;

/** The slice of the save legacy reads and changes. */
export type LegacyMeta = Pick<Meta, 'xp' | 'party' | 'unlocked' | 'castle' | 'equipped' | 'bonds' | 'bondSettled'> & {
  mentors?: Partial<Record<Calling, { kind: string; since: number; heir?: true }>>;
  recalled?: Partial<Record<Calling, number>>;
};

export const mentorsOf = (m: LegacyMeta) => m.mentors ?? {};
/** Whether a hero is in the Hall (retired, mentoring) and so out of the party. Dynasties, phase 6: a mentor whose line goes on through an
 *  heir (`heir`) is the elder of its House, and its kind stays in the party through the heir. */
export const retired = (m: LegacyMeta, kind: string): boolean => Object.values(mentorsOf(m)).some((x) => x?.kind === kind && !x.heir);
/** Whether a kind's mentor sits in the Hall at all, with an heir or without (phase 6). */
export const seatedMentor = (m: LegacyMeta, kind: string): boolean => Object.values(mentorsOf(m)).some((x) => x?.kind === kind);
/** The Hall's seats: one a level of the Hall of Legends. */
export const seats = (m: LegacyMeta): number => siteLevel(m.castle, 'hall');
const seated = (m: LegacyMeta): number => Object.values(mentorsOf(m)).filter(Boolean).length;

/** Why a hero cannot retire now (null when it can). */
export function whyNotRetire(m: LegacyMeta, kind: string, now: number): string | null {
  const c = callingOf(kind);
  if (!c || !m.unlocked.includes(kind)) return 'Not yours';
  if (seatedMentor(m, kind)) return 'In the Hall already';
  if (levelOfKind(m as Meta, kind) < LEGACY.RETIRE_LEVEL) return `Level ${LEGACY.RETIRE_LEVEL} or more to retire`;
  if (seats(m) <= 0) return 'Build the Hall of Legends first';
  if (mentorsOf(m)[c]) return `The ${c} seat is taken`;
  if ((m.recalled?.[c] ?? 0) > now) return `The ${c} seat is empty for a while yet`;
  if (seated(m) >= seats(m)) return 'Every seat of the Hall is taken: build it up for more';
  if (m.party.filter((k) => k !== kind && !retired(m, k)).length < 1) return 'The party needs someone to march';
  return null;
}
export const canRetire = (m: LegacyMeta, kind: string, now: number): boolean => whyNotRetire(m, kind, now) === null;

/** Retire a hero to the Hall: it leaves the party (a hero not in it takes its place, when there is one), its gear goes back to the stash. */
export function retire(m: LegacyMeta, kind: string, now: number): boolean {
  if (!canRetire(m, kind, now)) return false;
  const c = callingOf(kind)!;
  (m.mentors ??= {})[c] = { kind, since: now };
  const at = m.party.indexOf(kind);
  if (at >= 0) {
    const sub = m.unlocked.find((k) => !m.party.includes(k) && !retired(m, k));
    if (sub) m.party[at] = sub;
    else m.party.splice(at, 1);
  }
  if (m.equipped?.[kind]) delete m.equipped[kind];
  return true;
}

/** Why an elder passing the mantle cannot take the Hall's seat as its honour (null when it can; phase 6, `heirs.ts`). The heir keeps the
 *  kind in the party, so the party and the level are not asked; the seat's rules are the Hall's own. */
export function whyNotSeat(m: LegacyMeta, kind: string, now: number): string | null {
  const c = callingOf(kind);
  if (!c || !m.unlocked.includes(kind)) return 'Not yours';
  if (seats(m) <= 0) return 'Build the Hall of Legends first';
  const held = mentorsOf(m)[c];
  if (held && held.kind !== kind) return `The ${c} seat is taken`;
  if (held) return null;
  if ((m.recalled?.[c] ?? 0) > now) return `The ${c} seat is empty for a while yet`;
  if (seated(m) >= seats(m)) return 'Every seat of the Hall is taken: build it up for more';
  return null;
}
/** Seat an elder in the Hall as its honour, its line going on through an heir: the kind stays in the party, and its gear stays the heir's. */
export function seatMentor(m: LegacyMeta, kind: string, now: number): boolean {
  if (whyNotSeat(m, kind, now)) return false;
  const c = callingOf(kind)!;
  const held = mentorsOf(m)[c];
  (m.mentors ??= {})[c] = { kind, since: held?.since ?? now, heir: true };
  return true;
}

/** Recall a mentor to fight: its perks stop at once and the seat stays empty for seven days. */
export function recall(m: LegacyMeta, calling: Calling, now: number): boolean {
  if (!mentorsOf(m)[calling]) return false;
  delete m.mentors![calling];
  if (!Object.keys(m.mentors!).length) delete m.mentors;
  (m.recalled ??= {})[calling] = now + LEGACY.RECALL_MS;
  return true;
}

/** A hero's mentor: its calling's, when that is another hero. */
export function mentorOf(m: LegacyMeta, kind: string): string | undefined {
  const c = callingOf(kind);
  const mentor = c ? mentorsOf(m)[c]?.kind : undefined;
  return mentor && mentor !== kind ? mentor : undefined;
}

/** What an apprentice's fight XP is multiplied by: 1.5 while below half its mentor's level. */
export function apprenticeXp(m: LegacyMeta, kind: string): number {
  const mentor = mentorOf(m, kind);
  if (!mentor) return 1;
  return levelOfKind(m as Meta, kind) < levelOfKind(m as Meta, mentor) / 2 ? 1 + LEGACY.CATCH_UP : 1;
}

/** The perk's number for an apprentice: its mentor's band, doubled for the mentor's bonded partner. 0 with no mentor. */
export function perkFor(m: LegacyMeta, kind: string): { perk: Perk; mentor: string; value: number; bonded: boolean } | null {
  const mentor = mentorOf(m, kind);
  const perk = mentor ? PERKS[mentor] : undefined;
  if (!mentor || !perk) return null;
  const lv = levelOfKind(m as Meta, mentor);
  const band = LEGACY.BANDS.filter((b) => lv >= b).length - 1;
  if (band < 0) return null;
  const bonded = bondLevelOf(m, bondKey(kind, mentor)) >= LEGACY.BOND_LEVEL;
  return { perk, mentor, value: perk.steps[band] * (bonded ? LEGACY.BOND_MULT : 1), bonded };
}

/** The run's snapshot (`Run.legacy`): each party hero's perk as boost numbers. Only heroes with one. */
export function legacySnapshot(m: LegacyMeta, kinds: readonly string[]): Record<string, { hp?: number; atk?: number; shield?: number }> {
  const out: Record<string, { hp?: number; atk?: number; shield?: number }> = {};
  for (const k of new Set(kinds)) {
    const p = perkFor(m, k);
    if (p) out[k] = { [p.perk.kind]: p.value };
  }
  return out;
}

/** A hero's fight boost with its perk from the run's snapshot laid on. */
export function legacyBoost(snap: Record<string, { hp?: number; atk?: number; shield?: number }> | undefined, kind: string, base: Boost): Boost {
  const p = snap?.[kind];
  if (!p) return base;
  return { ...base, ...(p.hp ? { hp: (base.hp ?? 1) * (1 + p.hp) } : {}), ...(p.atk ? { atk: (base.atk ?? 1) * (1 + p.atk) } : {}), ...(p.shield ? { shield: (base.shield ?? 0) + p.shield } : {}) };
}

/** How many apprentices a calling's mentor would reach (the retire button's line: "12 martial heroes"). */
export const apprenticeCount = (calling: Calling): number => HERO_KINDS_OF_CALLING(calling).length - 1;

/** Saved mentors read back: odd values dropped. */
export function readMentors(raw: unknown): LegacyMeta['mentors'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: NonNullable<LegacyMeta['mentors']> = {};
  for (const c of CALLINGS) {
    const x = (raw as Record<string, { kind?: unknown; since?: unknown }>)[c];
    if (x && typeof x.kind === 'string' && callingOf(x.kind) === c) out[c] = { kind: x.kind, since: Number(x.since) || 0, ...((x as { heir?: unknown }).heir === true ? { heir: true as const } : {}) };
  }
  return Object.keys(out).length ? out : undefined;
}

/** A fight's lasting XP with the apprentices' catch-up laid on. */
export function mentoredXp(m: LegacyMeta, gains: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(gains)) out[k] = Math.round(n * apprenticeXp(m, k));
  return out;
}
