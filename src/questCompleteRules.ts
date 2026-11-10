// The Quest complete card's rules (QUEST-COMPLETE, `docs/notes/quest-complete.md`): what the card says when a quest is handed in. The
// owner's ask: "We still need a quest complete screen after turning a quest in with its rewards and a recap. If it has story to the
// quest, a little description is nice." Three things are worked out here, from the quest's own data and the save:
//
// - the story: two or three sentences that close it, built from the words the quest was written with (a quest battle's blurb and the
//   narration after its last wave, a story quest's ask) and ending on the giver's own closing line. Nothing is invented: a quest with
//   no story has no story block, only the giver's thanks;
// - the recap: each objective with its final count, which part of a story this was and what comes next, how a quest battle was won
//   (who fought, how many tries, how long), and how many days it took;
// - the rewards, one row each, in the order they arrive.
//
// A snapshot of the quest is read *before* the hand-in (`snapOf`): the hand-in takes the quest out of the log and pays it, and the card
// must still know its counts, its day and whether a hero is about to join. Pure rules: no Pixi, no DOM (`questComplete.ts` draws it).

import { ORES } from './sim/awakenMats';
import { bookById } from './sim/bookData';
import { CHAINS, type ChainDef } from './sim/eidolonChainData';
import { stepsOf, trialOf } from './sim/eidolonChains';
import { eidolonById } from './sim/eidolons';
import { heroName } from './sim/heroNames';
import type { Meta } from './sim/meta';
import { isMythicQuest } from './sim/mythicQuests';
import { GIVERS, QUESTS, type QuestDef, type Reward } from './sim/questData';
import { andList, castOf, questBattleById, type QuestBattle } from './sim/questBattles';
import { chainPartReward, CHAIN_STARS, rewardOf } from './sim/questPay';
import { battleOfQuest } from './sim/questRun';
import { activeDef, countOf, dayNumber, needOf, objectivesOf, timesDone, type BattleHow, type QuestActive } from './sim/quests';
import { LENGTH_NAMES, lengthOf, partsOf, STAR_NAMES, starsOf, storyParts, type QuestLength } from './sim/questStars';
import { questShown } from './sim/hiddenModes';
import { fillLine, plainText } from './sim/sceneKit';
import { isSecret } from './sim/secretHeroes';
import { TOME_SIZES, tomeWords } from './sim/tomes';

/* ------------------------------------------------------------------ the snapshot */

/** What the card needs of a quest as it stood just before it was handed in. */
export interface CompleteSnap {
  id: string;
  /** The quest as this save took it (a quest taken before a retune keeps its old goal, `defFor`). */
  def: QuestDef;
  /** Each objective's final count and what it asked, in order. */
  counts: number[];
  needs: number[];
  /** The day it was taken and the day it is handed in (yyyymmdd; 0 or missing when the save does not know). */
  took?: number;
  today?: number;
  /** How many times it had been handed in before this one (a repeatable). */
  times: number;
  /** The heroes owned before the pay (a hero quest's hero joins only if it is not among them), and the kinds whose shards are paid as
   *  stones because the hero is still a secret. */
  owned: string[];
  secret: string[];
  /** A quest battle's cast as this save fills it, how it was won where the save knows, and the tries begun. */
  cast?: string[];
  how?: BattleHow;
  tries?: number;
}

/** Read a taken quest's snapshot, before `handIn`. Null when it is not in the log. */
export function snapOf(m: Meta, id: string, today?: number): CompleteSnap | null {
  const a = m.quests?.active.find((x) => x.id === id);
  const def = a ? activeDef(a) : undefined;
  if (!a || !def) return null;
  return snapFrom(m, a, def, today);
}

function snapFrom(m: Meta, a: QuestActive, def: QuestDef, today?: number): CompleteSnap {
  const objs = objectivesOf(def);
  const reward = rewardOf(def);
  const qb = battleOfQuest(def.id);
  const shardKinds = [reward.shards?.kind, reward.hero?.instead.shards?.kind].filter((k): k is string => !!k);
  return {
    id: def.id,
    def,
    counts: objs.map((_, i) => Math.min(needOf(def, i), countOf(a, i))),
    needs: objs.map((_, i) => needOf(def, i)),
    ...(a.took ? { took: a.took } : {}),
    ...(today ? { today } : {}),
    times: timesDone(m, def.id),
    owned: [...m.unlocked],
    secret: shardKinds.filter((k) => isSecret(m, k)),
    ...(qb ? { cast: castOf(m, qb) ?? qb.cast.map((c) => c.heroes[0]), tries: m.quests?.tries?.[qb.id] ?? 0 } : {}),
    ...(qb && m.quests?.how?.[qb.id] ? { how: m.quests.how[qb.id] } : {}),
  };
}

/* ------------------------------------------------------------------ the rewards */

export type RewardKind = 'hero' | 'crowns' | 'stones' | 'chest' | 'ore' | 'tome' | 'shards' | 'book' | 'keepsake';

/** One row of the rewards: what it is, how many, what its picture is drawn from, and its words. */
export interface RewardRow {
  kind: RewardKind;
  /** The amount (counted up on the card); a keepsake, a book and a hero have none. */
  n?: number;
  /** What the picture is of: a chest's kind, an ore's trait, a tome's size, a hero's kind (shards), a book's id. A hero who joins has
   *  none: the card must not show who it is before the join reveal that follows it. */
  ref?: string;
  /** The words after the amount ("crowns", "Whetblood Ore", "of Selam's shards"), or the whole line when there is no amount. */
  text: string;
}

/**
 * The rows a reward pays, in the order `payReward` pays them, for a save that owned `owned` before the pay. A hero quest's hero is the
 * first row, told as its tease ("the stranger joins your company"); a save that already has the hero is paid the other reward instead.
 * A secret hero's shards are paid as stones, and read as stones.
 */
export function rewardRows(r: Reward, owned: readonly string[], secret: readonly string[] = []): RewardRow[] {
  if (r.hero && owned.includes(r.hero.kind)) {
    const { hero, ...rest } = r;
    return mergeRows([...rewardRows(rest, owned, secret), ...rewardRows(hero.instead, owned, secret)]);
  }
  const rows: RewardRow[] = [];
  if (r.hero) rows.push({ kind: 'hero', text: r.hero.tease.charAt(0).toUpperCase() + r.hero.tease.slice(1) });
  if (r.crowns) rows.push({ kind: 'crowns', n: r.crowns, text: 'crowns' });
  const asStones = r.shards && secret.includes(r.shards.kind) ? r.shards.n : 0;
  const stones = (r.stones ?? 0) + asStones;
  if (stones) rows.push({ kind: 'stones', n: stones, text: stones === 1 ? 'summoning stone' : 'summoning stones' });
  if (r.chest) rows.push({ kind: 'chest', ref: r.chest, text: `A ${r.chest} chest, on the cart at the camp` });
  for (const o of r.ores ?? []) rows.push({ kind: 'ore', n: o.n, ref: o.trait, text: ORES[o.trait]?.name ?? 'ore' });
  for (const size of TOME_SIZES) {
    const n = r.tomes?.[size] ?? 0;
    // (`tomeWords` reads "3 small XP tomes": the count is the row's own, so the words after it are kept)
    if (n) rows.push({ kind: 'tome', n, ref: size, text: tomeWords(size, n).replace(/^\S+\s+/, '') });
  }
  if (r.shards && !asStones) rows.push({ kind: 'shards', n: r.shards.n, ref: r.shards.kind, text: `of ${heroName(r.shards.kind)}'s shards` });
  if (r.book) rows.push({ kind: 'book', ref: r.book, text: `The book ${bookById(r.book)?.title ?? 'of a lost technique'}` });
  if (r.keepsake) rows.push({ kind: 'keepsake', text: `A keepsake: ${r.keepsake}` });
  return rows;
}

/** Two rows of the same thing (crowns from a hero quest's own pay and from its other reward) are one row. */
function mergeRows(rows: RewardRow[]): RewardRow[] {
  const out: RewardRow[] = [];
  for (const r of rows) {
    const same = r.n !== undefined ? out.find((x) => x.kind === r.kind && x.ref === r.ref && x.n !== undefined) : undefined;
    if (same) {
      same.n = same.n! + r.n!;
      if (same.kind === 'stones') same.text = same.n === 1 ? 'summoning stone' : 'summoning stones';
    } else out.push({ ...r });
  }
  return out;
}

/* ------------------------------------------------------------------ the story */

/** The story block: up to two sentences of what it was about, and the giver's closing line. */
export interface Story {
  /** Third-person lines, plain: a battle's blurb, the narration after its last wave. */
  told: string[];
  /** The giver's own words, each shown as a quote: the ask (a story quest's), then the closing line. */
  said: string[];
}

/** The first `n` sentences of a line, always a piece cut from its start (never reworded). A sentence ends at ., ! or ? (and any closing
 *  quote after it) when a space and then a capital, a digit or an opening quote follows: so "1.5 crowns" and "Hrrngh. look at me." are
 *  not cut in two. Fewer sentences than `n`: the whole line. */
export function firstSentences(text: string, n: number): string {
  let found = 0;
  for (let i = 0; i < text.length; i++) {
    if (!'.!?'.includes(text[i])) continue;
    let end = i + 1;
    while (end < text.length && '.!?'.includes(text[end])) end++;
    while (end < text.length && '"\'’”)'.includes(text[end])) end++;
    const rest = text.slice(end);
    if (rest.trim() === '') return text.trim();
    if (/^\s+["'‘“(]?[A-Z0-9]/.test(rest) && ++found >= n) return text.slice(0, end).trim();
    i = end - 1;
  }
  return text.trim();
}

/** Whether a quest has a story to close: a quest battle, a part of a chain or a campaign, a tale, a patron's ask, a Mythic's chain.
 *  A plain errand (a short or long quest off the board) has only its giver's thanks. */
export function hasStory(q: QuestDef): boolean {
  if (battleOfQuest(q.id) || q.hero || isMythicQuest(q)) return true;
  const len = lengthOf(q);
  if (len === 'chain' || len === 'campaign') return true;
  const slot = q.slot ?? GIVERS[q.giver].slot;
  return slot === 'tale' || slot === 'campaign';
}

/** An actor's name in a scene: its own where the scene gives one, else its fighter's, the goat's or a giver's. */
function actorName(c: { role: string; name?: string }): string {
  if (c.name) return c.name;
  if (c.role.startsWith('unit:')) return heroName(c.role.slice(5));
  if (c.role === 'duchess') return 'Duchess';
  if (c.role.startsWith('face:')) return GIVERS[c.role.slice(5) as keyof typeof GIVERS]?.name ?? 'Someone';
  return 'Someone';
}

/** The last narrated line of a scene (the telling, not a hero's banter), or with none the scene's last spoken line as "Name: words". */
export function closingOfScene(scene: { cast: Record<string, { role: string; name?: string }>; shots: { lines?: { who: string; text: string }[] }[] }): string | undefined {
  const lines = scene.shots.flatMap((s) => s.lines ?? []);
  const names = Object.fromEntries(Object.entries(scene.cast).map(([id, c]) => [id, actorName(c)]));
  const told = [...lines].reverse().find((l) => l.who === 'narrator');
  if (told) return plainText(fillLine(told.text, names));
  const last = lines[lines.length - 1];
  return last ? `${names[last.who] ?? 'Someone'}: “${plainText(fillLine(last.text, names))}”` : undefined;
}

/** What a quest battle's story says of itself: its blurb, and the line that ends the scene after its last wave. */
export function battleStory(qb: QuestBattle, cast: readonly string[]): string[] {
  const out = [qb.blurb];
  try {
    const end = closingOfScene(qb.after(cast));
    if (end && end !== qb.blurb) out.push(end);
  } catch {
    /* (a scene that cannot be built from this cast: the blurb alone) */
  }
  return out;
}

/**
 * A quest's story, from its own words: for a quest battle its blurb and the narration after the win; for any other story quest the ask
 * (the last line of its offer, two sentences at most); then the giver's closing lines (all of its `done` lines, in order). Undefined for a
 * quest with no story.
 */
export function storyOf(q: QuestDef, cast?: readonly string[]): Story | undefined {
  if (!hasStory(q)) return undefined;
  const qb = battleOfQuest(q.id);
  const told = qb ? battleStory(qb, cast ?? qb.cast.map((c) => c.heroes[0])) : [];
  const said: string[] = [];
  const ask = q.offer[q.offer.length - 1];
  if (!qb && ask) said.push(firstSentences(ask, 2));
  // (QUEST-COMPLETE 2, the director's call: every closing line the giver has, as the old card showed them; 51 quests have two or three)
  said.push(...q.done);
  return told.length || said.length ? { told, said } : undefined;
}

/** The giver's thanks for a quest with no story: its closing lines alone, all of them. */
export const thanksOf = (q: QuestDef): string[] | undefined => (hasStory(q) || !q.done.length ? undefined : [...q.done]);

/* ------------------------------------------------------------------ the recap */

/** One line of the recap, with the count it ends on where it has one. */
export interface RecapLine {
  kind: 'goal' | 'part' | 'next' | 'battle' | 'time' | 'again';
  text: string;
  /** "40 of 40", set apart at the line's end. */
  count?: string;
}

const num = (n: number): string => n.toLocaleString('en-GB');
const ordinal = (n: number): string => (n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`);
/** A battle's time as "1:42". */
export const clockOf = (ms: number): string => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

/** The quest that follows this one in its story, if there is one the player can be given. */
export const nextPart = (q: QuestDef): QuestDef | undefined => QUESTS.find((x) => x.after === q.id && questShown(x));

/** How long it took, from the day it was taken: nothing when the save does not know either day. */
export function daysLine(took: number | undefined, today: number | undefined): string | undefined {
  if (!took || !today) return undefined;
  const d = dayNumber(today) - dayNumber(took);
  if (!Number.isFinite(d) || d < 0) return undefined;
  return d === 0 ? 'Finished the day you took it' : `Finished ${num(d)} day${d === 1 ? '' : 's'} after you took it`;
}

/** A quest battle's telling: the battle won, who fought it (the heroes of the winning try where the save knows them, else its cast),
 *  and how it went (which try, the battle time, the fights it took) where the save knows. */
export function battleLines(qb: QuestBattle, how: BattleHow | undefined, cast: readonly string[] | undefined, tries = 0): RecapLine[] {
  const out: RecapLine[] = [];
  const who = how?.heroes.length ? how.heroes : cast ?? [];
  const n = how?.tries || tries;
  const won = n ? `Won on the ${ordinal(n)} try` : 'Won';
  out.push({ kind: 'goal', text: `${qb.title}: ${won.toLowerCase()}${how ? `, in ${clockOf(how.ms)} of battle` : ''}` });
  if (who.length) out.push({ kind: 'battle', text: `Fought by ${andList(who.map(heroName))}${qb.duchess ? ', and Duchess' : ''}` });
  if (how && how.fights > qb.waves.length) out.push({ kind: 'battle', text: `${how.fights} fights for its ${qb.waves.length} wave${qb.waves.length === 1 ? '' : 's'}: a heart or two burned` });
  return out;
}

/** The recap of a quest handed in: its objectives and their counts, its place in a story, a battle's telling, the days, the repeats. */
export function recapOf(s: CompleteSnap): RecapLine[] {
  const q = s.def;
  const out: RecapLine[] = [];
  const objs = objectivesOf(q);
  const qb = battleOfQuest(q.id);
  // (a battle quest's goal is the battle won: its own lines say it, with who fought and how it went)
  if (qb) out.push(...battleLines(qb, s.how, s.cast, s.tries));
  else
    objs.forEach((_, i) => {
      const text = objs.length > 1 ? q.steps?.[i] ?? (i === 0 ? q.text : `Objective ${i + 1}`) : q.text;
      out.push({ kind: 'goal', text, count: `${num(s.counts[i] ?? s.needs[i])} of ${num(s.needs[i])}` });
    });
  const parts = storyParts(q);
  if (parts > 1) {
    const at = partsOf(q);
    out.push({ kind: 'part', text: `Part ${at} of ${parts}` });
    const next = nextPart(q);
    out.push({ kind: 'next', text: next ? `Next: ${next.title}` : at >= parts ? 'The last part: the story is told' : 'The next part is not open yet' });
  }
  const days = daysLine(s.took, s.today);
  if (days) out.push({ kind: 'time', text: days });
  if (q.repeat && s.times > 0) out.push({ kind: 'again', text: `Done ${num(s.times + 1)} times now` });
  return out;
}

/* ------------------------------------------------------------------ the card */

/** Where the card's primary button goes: the quest board (a next part waits to be taken there, or more quests do), or nowhere. */
export type NextStep = { to: 'board'; label: string } | { to: 'log'; label: string } | { to: 'piece'; label: string };

/** Everything the card shows. */
export interface CompleteView {
  /** The quest's name, and its giver as a key (`questCard.giverKeyOf`: a giver's id or `hero:<kind>`), or a written name for a chain's. */
  title: string;
  giver: { key?: string; name?: string; title?: string };
  stars: number;
  /** "★★★☆☆ · Trial · Long". */
  starLine: string;
  story?: Story;
  thanks?: string[];
  recap: RecapLine[];
  rewards: RewardRow[];
  next?: NextStep;
}

export const starLineOf = (stars: number, length: QuestLength): string => `${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, 5 - stars))} · ${STAR_NAMES[stars] ?? ''} · ${LENGTH_NAMES[length]}`;

/** The card for a quest handed in, from its snapshot. */
export function questCompleteView(s: CompleteSnap): CompleteView {
  const q = s.def;
  const stars = starsOf(q);
  const story = storyOf(q, s.cast);
  const thanks = thanksOf(q);
  const next = nextPart(q);
  return {
    title: q.title,
    giver: { key: q.hero ? `hero:${q.hero}` : q.giver },
    stars,
    starLine: starLineOf(stars, lengthOf(q)),
    ...(story ? { story } : {}),
    ...(thanks ? { thanks } : {}),
    recap: recapOf(s),
    rewards: rewardRows(rewardOf(q), s.owned, s.secret),
    // (a story's next part is offered on the board; with none, the board is still where the next quest is)
    next: { to: 'board', label: next ? 'The next part' : 'Quest board' },
  };
}

/** The card for a part of an Eidolon chain just done (its piece found): `index` is the part's place (from 0), `m` the save after it. */
export function chainPartView(chain: ChainDef, index: number, owned: readonly string[] = [], how?: BattleHow): CompleteView | undefined {
  const part = chain.parts[index];
  if (!part) return undefined;
  const stars = CHAIN_STARS[chain.id] ?? 4;
  const steps = stepsOf(chain);
  const eidolon = eidolonById(chain.eidolon)?.name ?? 'the Eidolon';
  const after = chain.parts[index + 1];
  const trial = trialOf(chain);
  const qb = part.goal.kind === 'battle' ? questBattleById(part.goal.battle) : undefined;
  const nextText = after ? `Next: ${after.title}` : trial ? `Next: ${trial.part.title}. ${eidolon} waits to test the keep` : `Every piece is found: take them to the Summoner to bind ${eidolon}`;
  return {
    title: part.title,
    giver: { name: chain.giver.name, title: chain.giver.title },
    stars,
    starLine: starLineOf(stars, 'campaign'),
    // (the part's own words: what the giver said as it began, and what the piece found is and means)
    story: { told: [...part.piece.lines], said: [firstSentences(part.begin, 2)] },
    recap: [
      ...(qb ? battleLines(qb, how, undefined) : [{ kind: 'goal' as const, text: part.text, count: `${num(part.goal.n)} of ${num(part.goal.n)}` }]),
      { kind: 'part', text: `Part ${index + 1} of ${steps} · ${chain.title}` },
      { kind: 'next', text: nextText },
    ],
    rewards: [{ kind: 'keepsake', text: `A piece of the pact: ${part.piece.name}` }, ...rewardRows(chainPartReward(chain.id, index, chain.parts.length, part.reward), owned)],
    next: { to: 'piece', label: 'See the piece' },
  };
}

/** A chain by its id, for the page (`CHAINS` is the sim's list). */
export const eidolonChainOf = (id: string): ChainDef | undefined => CHAINS.find((c) => c.id === id);
