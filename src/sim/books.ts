// Skill books' rules (docs/notes/shop-books-gear.md): reading a book starts study, a fight (a wave the hero fought in) moves it on,
// and when it is done the skill joins the hero kind's skill book for good. A hero kind then chooses which of the skills it knows sit in its
// three skill slots (its loadout; the skills overhaul's batch 9, docs/notes/skills-9.md); its ultimate is never touched. In a fight the loadout
// rides on the hero's boost (`EquipStats.book`, set by `heroStats`) and `heroKitOf` builds the kit from it, so a hero with no loadout fights
// exactly as before.
//
// The owner's decisions: any open slot takes any known skill; learning takes study, not an instant; a hero reads only the kind suited
// to its calling (and the universal books); nothing is ever forgotten. A learned skill levels by use like any other (`skillLevels.ts`, under
// its own key for the reader); there are no mastery ranks. A book's skill sits in the class of its source and is costed for the reader's
// pool (`slotFor`). Pure rules: no Pixi, no DOM, no randomness.

import { BOOKS, bookById, readsKind, STUDY, type BookDef } from './bookData';
import { mixSeed, Rng } from './rng';
import { HERO_KITS, type HeroKit, type Pool, type Slot } from './heroKits';
import { CLASS_RANGE } from './skillRules';
import type { Meta } from './meta';
import { ALL_HEROES } from './units';

/** What a slot holds: the hero's own skill 1, 2 or 3, or a learned book's skill (by the book's id). */
export type SkillPick = string;
export const OWN1 = 'own1';
export const OWN2 = 'own2';
export const OWN3 = 'own3';
const OWNS: readonly SkillPick[] = [OWN1, OWN2, OWN3];
/** A kind's slots in order (skill 1, 2, 3; two for a kit with no third skill). */
export type Loadout = SkillPick[];

/** The library cuts study by this share a level (rounded up, at least one fight). */
export const STUDY_CUT = 0.08;

/** Fights a book takes to study with a library of `library` levels. */
export const studyLength = (book: BookDef, library = 0): number => Math.max(1, Math.ceil(STUDY[book.rarity] * (1 - STUDY_CUT * library)));
/** Heroes that may study at once: one with no library, two from level 1, three from level 3, four at level 5. */
export const studentCap = (library = 0): number => (library >= 5 ? 4 : library >= 3 ? 3 : library >= 1 ? 2 : 1);

/** The books a hero kind has learned. */
export const learnedOf = (m: Meta, kind: string): string[] => m.learned?.[kind] ?? [];
/** Whether a hero kind knows the skill a book teaches: it is one of its own two, or learned. */
export const knowsBook = (m: Meta, kind: string, book: BookDef): boolean => book.from.hero === kind || learnedOf(m, kind).includes(book.id);
/** Whether a hero kind is of a calling that reads this kind of book. */
export const suitedTo = (kind: string, book: BookDef): boolean => book.kind === 'universal' || readsKind(kind) === book.kind;
/** Whether a hero kind could read a book: suited, and does not know it yet. */
export const canRead = (m: Meta, kind: string, book: BookDef): boolean => suitedTo(kind, book) && !knowsBook(m, kind, book);
/** The owned heroes who could read a book. */
export const readersOf = (m: Meta, book: BookDef): string[] => m.unlocked.filter((k) => canRead(m, k, book));
/** Unread copies held of a book. */
export const copiesOf = (m: Meta, id: string): number => m.books?.[id] ?? 0;

/** Add copies of a book to the bag. */
export function grantBook(m: Meta, id: string, n = 1): void {
  if (!bookById(id) || n <= 0) return;
  (m.books ??= {})[id] = copiesOf(m, id) + n;
}
function takeBook(m: Meta, id: string): boolean {
  const n = copiesOf(m, id);
  if (n <= 0) return false;
  if (n === 1) delete m.books![id];
  else m.books![id] = n - 1;
  if (!Object.keys(m.books!).length) delete m.books;
  return true;
}

/** The books in the bag a hero kind could start reading now. */
export const readableNow = (m: Meta, kind: string): BookDef[] => BOOKS.filter((b) => copiesOf(m, b.id) > 0 && canRead(m, kind, b) && m.study?.[kind]?.book !== b.id);
/** The heroes studying now. */
export const students = (m: Meta): string[] => Object.keys(m.study ?? {});

/** Why a hero cannot start a book now (null when it can). */
export function whyNotRead(m: Meta, kind: string, id: string): string | null {
  const book = bookById(id);
  if (!book || !m.unlocked.includes(kind)) return 'Not yours';
  if (copiesOf(m, id) <= 0) return 'No copy in the bag';
  if (!suitedTo(kind, book)) return 'Not of this calling';
  if (knowsBook(m, kind, book)) return 'Knows it';
  const cap = studentCap(m.castle.library);
  if (!m.study?.[kind] && students(m).length >= cap) return `The library has room for ${cap} student${cap === 1 ? '' : 's'}`;
  return null;
}

/** Start a hero reading a book: a copy leaves the bag, and its progress picks up where it was left (a book put down keeps it). A
 *  hero already studying puts its first book back in the bag, its progress kept. False (nothing changes) when it cannot. */
export function startStudy(m: Meta, kind: string, id: string): boolean {
  if (whyNotRead(m, kind, id)) return false;
  if (m.study?.[kind]) stopStudy(m, kind);
  takeBook(m, id);
  const kept = m.studyKept?.[kind]?.[id] ?? 0;
  if (m.studyKept?.[kind]) {
    delete m.studyKept[kind][id];
    if (!Object.keys(m.studyKept[kind]).length) delete m.studyKept[kind];
  }
  (m.study ??= {})[kind] = { book: id, done: kept };
  return true;
}

/** Put the book down: it goes back to the bag, unspent, and the fights studied are kept with its id. */
export function stopStudy(m: Meta, kind: string): boolean {
  const s = m.study?.[kind];
  if (!s) return false;
  delete m.study![kind];
  grantBook(m, s.book);
  if (s.done > 0) ((m.studyKept ??= {})[kind] ??= {})[s.book] = s.done;
  return true;
}

/** Fights left of a hero's study (undefined when it studies nothing). */
export function studyLeft(m: Meta, kind: string): number | undefined {
  const s = m.study?.[kind];
  const book = s && bookById(s.book);
  return book ? Math.max(0, studyLength(book, m.castle.library) - s.done) : undefined;
}

/** What a settled wave did to a hero's study. */
export interface StudyNote {
  kind: string;
  book: string;
  left: number;
  learned: boolean;
}

/** A wave has been settled: each hero kind that fought in it (placed on the board when the wave ended, won or lost) studies one
 *  fight more, and one whose book is done learns its skill. Returns a note for each hero that studied. */
export function settleStudy(m: Meta, fought: readonly string[]): StudyNote[] {
  const out: StudyNote[] = [];
  for (const kind of new Set(fought)) {
    const s = m.study?.[kind];
    const book = s && bookById(s.book);
    if (!s || !book) continue;
    s.done++;
    const left = Math.max(0, studyLength(book, m.castle.library) - s.done);
    if (left === 0) {
      delete m.study![kind];
      if (!knowsBook(m, kind, book)) ((m.learned ??= {})[kind] ??= []).push(book.id);
    }
    out.push({ kind, book: book.id, left, learned: left === 0 });
  }
  if (m.study && !Object.keys(m.study).length) delete m.study;
  return out;
}

// ---- Rare books found ----

const BOOK_SALT = 0xb00c5;
/** The chance a chest holds a Rare book, by its kind: a silver one in twenty, a gold (or Mythic) about one in seven. */
export const CHEST_BOOK_ODDS: Readonly<Record<string, number>> = { silver: 0.05, gold: 0.15, mythic: 0.15 };
/** The Rare book a chest holds, if any: drawn from its own stream of the chest's seed (so its crowns, stones, gear and tomes roll
 *  exactly as before). `sure` (an army's first clear on Hard or above) always holds one. */
export function chestBook(seed: number, kind: string, sure = false): string | undefined {
  const rng = new Rng(mixSeed(seed, BOOK_SALT));
  const odds = CHEST_BOOK_ODDS[kind] ?? 0;
  const hit = rng.chance(odds);
  if (!sure && !hit) return undefined;
  const rare = BOOKS.filter((b) => b.rarity === 'rare');
  return rare[rng.int(0, rare.length - 1)].id;
}

// ---- the three slots ----

/** A kind's own skills as picks, in slot order. */
export const ownPicks = (kind: string): SkillPick[] => (HERO_KITS()[kind]?.slots ?? []).map((_, i) => OWNS[i]);
/** Every skill a hero kind knows, as picks: its own, then the learned in the order learned. */
export const knownPicks = (m: Meta, kind: string): SkillPick[] => [...ownPicks(kind), ...learnedOf(m, kind)];
const isOwn = (kind: string, l: readonly SkillPick[]): boolean => {
  const own = ownPicks(kind);
  return l.length === own.length && own.every((p, i) => l[i] === p);
};
/** A saved loadout made whole: one pick for each of the kit's slots, a short one (a two-slot save) filled with the slot's own skill, or else one it left out. */
function whole(kind: string, l: readonly SkillPick[]): Loadout {
  const own = ownPicks(kind);
  const out = own.map((_, i) => l[i] ?? '');
  for (let i = 0; i < out.length; i++) if (!out[i]) out[i] = [own[i], ...own].find((p) => !out.includes(p)) ?? own[i];
  return out;
}
/** A kind's slots (its own skills when it has never chosen). */
export const loadoutOf = (m: Meta, kind: string): Loadout => (m.loadout?.[kind] ? whole(kind, m.loadout[kind]) : ownPicks(kind));

/** Put a known skill in slot 1, 2 or 3. A skill already in another slot trades places with this one, so one skill never sits in two. A
 *  loadout back to the kind's own skills is dropped. False (nothing changes) for a skill the kind does not know or a slot its kit lacks. */
export function setSlot(m: Meta, kind: string, slot: 1 | 2 | 3, pick: SkillPick): boolean {
  if (!m.unlocked.includes(kind) || !knownPicks(m, kind).includes(pick)) return false;
  const cur = [...loadoutOf(m, kind)];
  const i = slot - 1;
  if (i >= cur.length) return false;
  const from = cur.indexOf(pick);
  if (from >= 0) cur[from] = cur[i];
  cur[i] = pick;
  if (isOwn(kind, cur)) {
    if (m.loadout) delete m.loadout[kind];
    if (m.loadout && !Object.keys(m.loadout).length) delete m.loadout;
  } else (m.loadout ??= {})[kind] = cur;
  return true;
}

/** The loadout a hero fights with, for its boost: undefined when it uses its own skills in their own order (so the fight is as before). */
export function fightLoadout(m: Meta, kind: string): Loadout | undefined {
  const l = m.loadout?.[kind];
  if (!l) return undefined;
  const w = whole(kind, l);
  return isOwn(kind, w) ? undefined : w;
}

/** The skill a book teaches, as its source hero's slot (the one place that says where a book's skill comes from, so other kinds of book
 *  can be added as data). */
export function bookSource(book: BookDef): Slot | undefined {
  return HERO_KITS()[book.from.hero]?.slots[book.from.slot - 1];
}

/** A slot's cost moved from one pool to another by its place in its class's range (a skill at the top of the Heavy cost range in stamina
 *  is at the top of it in mana): the overhaul's classes hold for the reader's pool. */
export function costForPool(s: Slot, from: Pool, to: Pool): number {
  if (from === to) return s.cost;
  const [flo, fhi] = CLASS_RANGE[s.cls][from];
  const [tlo, thi] = CLASS_RANGE[s.cls][to];
  const at = fhi > flo ? Math.max(0, Math.min(1, (s.cost - flo) / (fhi - flo))) : 0;
  return Math.round((tlo + at * (thi - tlo)) * 10) / 10;
}

/** The slot a pick makes for a hero kind: its own skill, or a book's skill. A book's skill keeps its class, strength (times the book's
 *  `tune`) and cooldown (the class's range is the same in either pool), and its cost is its place in the class's range for the reader's
 *  pool. It levels by use under its own key (`skillLevels.ts`), and its cost and cooldown follow that level. A healer's revive face
 *  stays with its own hero. */
export function slotFor(kind: string, pick: SkillPick): Slot | undefined {
  const own = HERO_KITS()[kind];
  if (!own) return undefined;
  const at = OWNS.indexOf(pick);
  if (at >= 0) return own.slots[at];
  const book = bookById(pick);
  const src = book && HERO_KITS()[book.from.hero];
  const s = book && bookSource(book);
  if (!book || !src || !s) return undefined;
  const slot: Slot = { ...s, cost: costForPool(s, src.pool, own.pool), tune: s.tune * (book.tune ?? 1) };
  delete slot.revive;
  return slot;
}

const built = new Map<string, HeroKit>();
/** A hero kind's kit with a loadout's skills in its slots (built once and kept). The kind's own kit when anything is unknown. */
export function kitWithLoadout(kind: string, l: readonly SkillPick[]): HeroKit | undefined {
  const own = HERO_KITS()[kind];
  if (!own) return undefined;
  const key = `${kind}|${l.join('|')}`;
  let k = built.get(key);
  if (!k) {
    const slots = own.slots.map((_, i) => slotFor(kind, l[i] ?? ownPicks(kind)[i]));
    // (the kit's slots are the ones the AI weighs, so they carry the chosen skills; `s1`, `s2` and `s3` are the same objects)
    k = slots.every((x) => x) ? { ...own, s1: slots[0]!, s2: slots[1]!, ...(slots[2] ? { s3: slots[2] } : {}), slots: slots as Slot[] } : own;
    built.set(key, k);
  }
  return k;
}

/** The name of the skill a pick stands for (its own skill's or the book's). */
export function pickName(kind: string, pick: SkillPick): string {
  return slotFor(kind, pick)?.skill.name ?? 'Unknown';
}

// ---- saves ----

/** Saved books, learning and loadouts that are sane: known books, owned-in-the-game kinds, studies of books a kind may read, loadouts
 *  of skills the kind knows with no skill in two slots. Anything else is dropped (and an empty record is removed). */
export function readBooks(m: Meta): void {
  const books: Record<string, number> = {};
  if (m.books && typeof m.books === 'object') for (const [id, n] of Object.entries(m.books)) if (bookById(id) && typeof n === 'number' && n >= 1) books[id] = Math.floor(n);
  m.books = books;
  const learned: Record<string, string[]> = {};
  if (m.learned && typeof m.learned === 'object')
    for (const [kind, ids] of Object.entries(m.learned)) {
      if (!ALL_HEROES.includes(kind) || !Array.isArray(ids)) continue;
      const ok = [...new Set(ids)].filter((id): id is string => typeof id === 'string' && !!bookById(id) && bookById(id)!.from.hero !== kind && suitedTo(kind, bookById(id)!));
      if (ok.length) learned[kind] = ok;
    }
  m.learned = learned;
  const study: Record<string, { book: string; done: number }> = {};
  if (m.study && typeof m.study === 'object')
    for (const [kind, s] of Object.entries(m.study)) {
      const book = s && typeof s.book === 'string' ? bookById(s.book) : undefined;
      if (!ALL_HEROES.includes(kind) || !book || !suitedTo(kind, book) || knowsBook(m, kind, book)) continue;
      study[kind] = { book: book.id, done: Math.max(0, Math.floor(Number(s.done) || 0)) };
    }
  m.study = study;
  const kept: Record<string, Record<string, number>> = {};
  if (m.studyKept && typeof m.studyKept === 'object')
    for (const [kind, rec] of Object.entries(m.studyKept)) {
      if (!ALL_HEROES.includes(kind) || !rec || typeof rec !== 'object') continue;
      for (const [id, n] of Object.entries(rec)) if (bookById(id) && typeof n === 'number' && n >= 1) (kept[kind] ??= {})[id] = Math.floor(n);
    }
  m.studyKept = kept;
  const loadout: Record<string, Loadout> = {};
  if (m.loadout && typeof m.loadout === 'object')
    for (const [kind, l] of Object.entries(m.loadout)) {
      // (a save from before the third slot has two picks: it keeps them and the third slot takes the skill left over)
      if (!ALL_HEROES.includes(kind) || !Array.isArray(l) || l.length < 2 || l.length > 3) continue;
      const known = knownPicks(m, kind);
      if (l.some((p) => !known.includes(p)) || new Set(l).size !== l.length) continue;
      const w = whole(kind, l);
      if (!isOwn(kind, w)) loadout[kind] = w;
    }
  m.loadout = loadout;
  for (const k of ['books', 'learned', 'study', 'studyKept', 'loadout'] as const) if (!Object.keys(m[k]!).length) delete m[k];
}

/** A wave's study in words for the short card: "Kwame learned Whirlwind", or "Kwame: Whirlwind, 2 fights left". */
export function studyWords(notes: readonly StudyNote[], nameOf: (kind: string) => string): { text: string; learned: boolean }[] {
  return notes.map((n) => {
    const skill = pickName(n.kind, n.book);
    return { learned: n.learned, text: n.learned ? `${nameOf(n.kind)} learned ${skill}` : `${nameOf(n.kind)}: ${skill}, ${n.left} fight${n.left === 1 ? '' : 's'} left` };
  });
}
