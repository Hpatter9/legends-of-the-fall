// The Dark Council (the Nemesis War, phase 2: `docs/design/legends-expansion.md`, section 2.5 and 2.11; `docs/notes/nemesis-2.md`): the
// thirteen seats as a living hierarchy. One warchief, four captains and eight lieutenants, each lieutenant sworn to a captain, each member
// with a loyalty to its superior (0 to 100, starting at 60). Between runs the Council takes a turn: nothing happens 10% of the time, one
// event 60%, two 30%, each drawn by weight from those whose conditions hold (Recruit, Promotion, Feud, Betrayal, Feast, Trial of Strength,
// Blood-oath, Desertion). An empty warchief's seat is claimed by the mightiest captain and taken on the next turn unless another captain
// challenges him for it. The warchief is never slain by the Council's turns: only the heroes bring him down (`muster.ts`).
//
// A turn is taken each time an army run ends (at most four counted a real day) and on the day's first visit; the page passes in the day
// key, the sim reads no clock. Every draw comes from `mixSeed(meta.seed, COUNCIL_SALT, war.turn)`, so a turn replays exactly from the save.
// This file also keeps what a fight means for the Council (`noteWar`: the News, loyalty, the War Trophies, the Muster's count, a warchief's
// fall) and the Spoils, where War Trophies are spent. Pure rules: no Pixi, no DOM.

import { ARMIES, armyById, armyUnlocked } from './armies';
import type { Battle } from './battle';
import { ELITE_FOES } from './eliteFoes';
import { isBoss } from './foes';
import { heroName } from './heroNames';
import type { Meta } from './meta';
import { MUSTER_NEED, musterOpen, warchiefOf } from './muster';
import { fullName, HEADS_MAX, homeArmy, MIGHT_MAX, nameFor, NEWS_MAX, noteNemesis, rankWord, remember, reveal, secretName, SEATS, type NemNote, type Nemesis, type NewsKind, type War, type WarNews } from './nemesis';
import type { NemesisTally } from './nemesisLog';
import { TRAITS } from './nemesisTraits';
import { mixSeed, Rng } from './rng';
import type { Run } from './run';
import { giveShards, owns, type Given } from './unlock';
import { isContent, PULL_HEROES } from './unlockRules';
import { UNITS } from './units';

/** The Council's own stream: a turn's draws are `mixSeed(meta.seed, COUNCIL_SALT, war.turn)`. */
export const COUNCIL_SALT = 0x4e3e53;
/** A turn has no event, one or two this often. */
export const TURN_SHAPE = { none: 0.1, one: 0.6, two: 0.3 } as const;
/** The events and their weights (the design's table). */
export type CouncilEvent = 'recruit' | 'promotion' | 'feud' | 'betrayal' | 'feast' | 'trial' | 'oath' | 'desertion';
export const EVENT_WEIGHT: Readonly<Record<CouncilEvent, number>> = { recruit: 3, promotion: 4, feud: 2, betrayal: 1, feast: 1, trial: 1, oath: 0.5, desertion: 0.5 };
/** Turns counted a real day after army runs, besides the day's first visit. */
export const RUN_TURNS = 4;
/** The Council never falls below this many lieutenants once the War is open: a Recruit is forced when it would. */
export const MIN_LIEUTENANTS = 3;
/**
 * Loyalty: where it starts, and what moves it. A Feast +15 to a captain and its lieutenants; +10 when the superior wins a meeting (it lived and
 * the heroes lost); -10 when a blood-oath brother is slain by a rival member; -15 when the superior is beaten in a feud or a trial (the design's
 * -20 for a superior humiliated by the heroes comes with humiliation, phase 3); and ambition: -2 a turn for a lieutenant as mighty as its
 * captain or mightier (the design names no drift, but without one a betrayal could hardly come; at -5 a turn for one within a Might, the war
 * simulator saw six to eight betrayals a week, `docs/notes/nemesis-2.md`).
 */
export const LOYALTY = { start: 60, feast: 15, held: 10, brother: -10, beaten: -15, ambition: -2 } as const;
/** A betrayal is possible below this loyalty; it succeeds half the time, and the old captain is then slain or demoted, half each. */
export const BETRAY_BELOW = 30;
export const BETRAY_WIN = 0.5;
export const BETRAY_SLAYS = 0.5;
/** A feud's loser is slain this often. */
export const FEUD_SLAYS = 0.3;
/** A lieutenant at this Might may put its captain to a Trial of Strength. */
export const TRIAL_MIGHT = 4;
/** A captain within a Might of the claimant challenges for the empty warchief's seat this often. */
export const CHALLENGE = 0.5;
/** A member deserts at Might 1 once it has lost this many meetings in a row. */
export const DESERT_STREAK = 3;

/** War Trophies a slaying pays (2.11), and the most a day brings. */
export const TROPHIES: Readonly<Record<Nemesis['rank'], number>> = { lieutenant: 1, captain: 2, warchief: 5 };
export const TROPHY_DAY = 12;
/** The Spoils: an unlock shard of a hero not yet owned (at most two a week), a scout (reveal one secret of a member). */
export const SHARD_PRICE = 6;
export const SHARD_WEEK = 2;
export const SCOUT_PRICE = 2;

/** The traits a recruit may come with (what a fighter brings to the Council, not what it learned from the heroes: no immunity). */
export const RECRUIT_TRAITS: readonly string[] = ['bane:martial', 'bane:arcane', 'bane:devout', 'bane:wild', 'ambusher', 'loneWolf', 'hillKing', 'scarred', 'arrowCatcher', 'executioner', 'healerHunter', 'elusive'];

const EVENT_WORD: Readonly<Record<NewsKind, string>> = { recruit: 'Recruit', promotion: 'Promotion', feud: 'Feud', betrayal: 'Betrayal', feast: 'Feast', trial: 'Trial', oath: 'Blood-oath', desertion: 'Desertion', claim: 'Claim', crowned: 'Warchief', named: 'Named', slain: 'Slain', muster: 'Muster' };
/** A News kind's word ("Feud"). */
export const newsWord = (k: NewsKind): string => EVENT_WORD[k];

// ---- the seats -----------------------------------------------------------------------------------------------------------------

const ofRank = (war: War, r: Nemesis['rank']): Nemesis[] => war.members.filter((n) => n.rank === r);
const byMight = (a: Nemesis, b: Nemesis) => b.might - a.might || b.loyalty - a.loyalty || a.id - b.id;
const memberById = (war: War, id: number | undefined): Nemesis | undefined => (id === undefined ? undefined : war.members.find((n) => n.id === id));

/** A member's superior: a lieutenant's sworn captain (else the warchief), a captain's warchief. */
export const superiorOf = (war: War, n: Nemesis): Nemesis | undefined => (n.rank === 'lieutenant' ? memberById(war, n.sworn) ?? warchiefOf(war) : n.rank === 'captain' ? warchiefOf(war) : undefined);
/** The lieutenants sworn to a captain. */
export const swornTo = (war: War, c: Nemesis): Nemesis[] => war.members.filter((n) => n.rank === 'lieutenant' && n.sworn === c.id);

/** Put every lieutenant under a captain: one whose captain is gone (or no longer a captain) is sworn anew to the captain with the fewest,
 *  two to a captain (four captains for eight lieutenants); none while no captain has room. A non-lieutenant swears to no one. */
export function swear(war: War): void {
  const caps = ofRank(war, 'captain').sort((a, b) => a.id - b.id);
  const capIds = new Set(caps.map((c) => c.id));
  for (const n of war.members) if (n.sworn !== undefined && (n.rank !== 'lieutenant' || !capIds.has(n.sworn))) delete n.sworn;
  for (const n of ofRank(war, 'lieutenant').sort((a, b) => a.id - b.id)) {
    if (n.sworn !== undefined) continue;
    const room = caps.map((c) => ({ c, k: swornTo(war, c).length })).filter((x) => x.k < 2).sort((a, b) => a.k - b.k || a.c.id - b.c.id)[0];
    if (room) n.sworn = room.c.id;
  }
}

function news(war: War, kind: NewsKind, text: string): void {
  war.news.unshift({ turn: war.turn, kind, text });
  war.news.length = Math.min(war.news.length, NEWS_MAX);
}

/** +1 Might from a Council event: once a turn at most (`grew` holds who grew this turn), never past 10. */
function mightUp(n: Nemesis, grew: Set<number>): boolean {
  if (grew.has(n.id) || n.might >= MIGHT_MAX) return false;
  n.might++;
  grew.add(n.id);
  return true;
}
const mightDown = (n: Nemesis): void => void (n.might = Math.max(1, n.might - 1));
const loyal = (n: Nemesis, d: number): void => void (n.loyalty = Math.max(0, Math.min(100, n.loyalty + d)));

/** A member leaves the Council (slain or deserted): its seat empties, its oath brother and sworn lieutenants are freed, a claim lapses. */
function drop(war: War, n: Nemesis): void {
  war.members = war.members.filter((x) => x !== n);
  for (const x of war.members) {
    if (x.oath === n.id) delete x.oath;
    if (x.sworn === n.id) delete x.sworn;
  }
  if (war.claim === n.id) delete war.claim;
}

/** A member slain by a rival of the Council (a feud, a trial, a betrayal): to the fallen, and its blood-oath brother's loyalty falls. */
function slainByRival(war: War, n: Nemesis, by: Nemesis): void {
  const brother = memberById(war, n.oath);
  if (brother) loyal(brother, LOYALTY.brother);
  drop(war, n);
  war.fallen.unshift({ id: n.id, name: n.name, epithet: n.epithet, base: n.base, army: n.army, rank: n.rank, might: n.might, by: '', how: 'council', tier: 0, foe: fullName(by), turn: war.turn });
  war.fallen.length = Math.min(war.fallen.length, 30);
}

/** Two members fight: each its Might plus a d6; a tie goes to the higher Might, then to the draw. Returns the winner and the loser. */
function contest(rng: Rng, a: Nemesis, b: Nemesis): [Nemesis, Nemesis] {
  const ra = a.might + rng.int(1, 6);
  const rb = b.might + rng.int(1, 6);
  const aWins = ra !== rb ? ra > rb : a.might !== b.might ? a.might > b.might : rng.next() < 0.5;
  return aWins ? [a, b] : [b, a];
}

/** A lieutenant and its captain change places: the lieutenant takes the captain's seat and his sworn lieutenants; the old captain is sworn
 *  to the new. */
function swapSeats(war: War, low: Nemesis, high: Nemesis): void {
  for (const x of swornTo(war, high)) if (x !== low) x.sworn = low.id;
  low.rank = high.rank;
  delete low.sworn;
  high.rank = 'lieutenant';
  high.sworn = low.id;
  if (war.claim === high.id) delete war.claim;
}

/** The beaten loser of a feud or trial: -1 Might, its lieutenants' loyalty falls, and it is slain 30% of the time. Returns whether it was. */
function beaten(war: War, rng: Rng, loser: Nemesis, winner: Nemesis): boolean {
  mightDown(loser);
  for (const x of swornTo(war, loser)) loyal(x, LOYALTY.beaten);
  if (rng.next() < FEUD_SLAYS) {
    slainByRival(war, loser, winner);
    return true;
  }
  return false;
}

// ---- recruits ------------------------------------------------------------------------------------------------------------------

/** The day's party, for a recruit's Dread (a hero it has heard of): the saved party, else the heroes owned. */
const knownHeroes = (m: Meta): string[] => (m.party.length ? [...m.party] : m.unlocked.filter((k) => !!UNITS[k]));

/**
 * A new named foe takes a free lieutenant's seat, at Might 1 or 2: an elite of an army the player has opened (one not already on the Council),
 * else an escort of one of those armies. It brings one trait of its own (`RECRUIT_TRAITS`), the Dread of a hero of the party, and no secret
 * the player knows yet. Undefined when no seat is free or no army is open.
 */
export function recruit(war: War, m: Meta, rng: Rng): Nemesis | undefined {
  if (ofRank(war, 'lieutenant').length >= SEATS.lieutenant) return undefined;
  const opened = ARMIES.filter((a) => armyUnlocked(m, a.id)).map((a) => a.id);
  if (!opened.length) return undefined;
  const taken = new Set(war.members.map((n) => n.base));
  const elites = Object.keys(ELITE_FOES).filter((k) => !taken.has(k) && opened.includes(homeArmy(k) ?? ''));
  let base: string;
  let army: string;
  if (elites.length) {
    base = rng.pick(elites);
    army = homeArmy(base)!;
  } else {
    army = rng.pick(opened);
    const troops = [...new Set(armyById(army)!.waves.filter((w) => !w.boss).flatMap((w) => w.foes))].filter((f) => !!UNITS[f] && !isBoss(f) && !UNITS[f].summon);
    if (!troops.length) return undefined;
    base = rng.pick(troops);
  }
  const trait = rng.pick(RECRUIT_TRAITS);
  const party = knownHeroes(m);
  const dread = party.length ? rng.pick(party) : undefined;
  const n: Nemesis = {
    id: war.nextId++,
    base,
    army,
    name: nameFor(war, army, rng),
    epithet: TRAITS[trait]?.epithet || 'the Ambitious',
    rank: 'lieutenant',
    loyalty: LOYALTY.start,
    might: rng.int(1, 2),
    scars: 0,
    traits: [trait],
    weak: dread ? [`dread:${dread}`] : [],
    known: [],
    mark: trait,
    memory: [],
    met: 0,
    lost: 0,
    born: war.turn,
  };
  remember(n, `Recruited to the Dark Council · ${armyById(army)?.name ?? army}`);
  war.members.push(n);
  return n;
}

// ---- a turn --------------------------------------------------------------------------------------------------------------------

/** The empty warchief's seat: the mightiest captain claims it; on the next turn he takes it, unless a captain within a Might of him challenges
 *  (half the time), a feud for the seat whose winner takes it. */
function seatTheChief(war: War, rng: Rng, grew: Set<number>): void {
  if (warchiefOf(war)) {
    delete war.claim;
    return;
  }
  const caps = ofRank(war, 'captain').sort(byMight);
  if (!caps.length) return;
  const claimant = memberById(war, war.claim);
  if (!claimant || claimant.rank !== 'captain') {
    war.claim = caps[0].id;
    news(war, 'claim', `${fullName(caps[0])} claims the Warchief’s seat`);
    return;
  }
  let chief = claimant;
  const rival = caps.find((c) => c !== claimant && c.might >= claimant.might - 1);
  if (rival && rng.next() < CHALLENGE) {
    const [w, l] = contest(rng, claimant, rival);
    mightUp(w, grew);
    const slain = beaten(war, rng, l, w);
    news(war, 'feud', `${fullName(rival)} challenges ${fullName(claimant)} for the seat; ${w.name} wins${slain ? `, and ${l.name} is slain` : ''}`);
    chief = w;
  }
  crown(war, chief);
}

/** A captain takes the warchief's seat; his sworn lieutenants are freed to swear anew. */
function crown(war: War, n: Nemesis): void {
  for (const x of swornTo(war, n)) delete x.sworn;
  n.rank = 'warchief';
  delete n.sworn;
  delete war.claim;
  remember(n, `Took the Warchief’s seat of the Dark Council`);
  news(war, 'crowned', `${fullName(n)} takes the Warchief’s seat`);
}

/** Whether an event's conditions hold now. */
export function eventOpen(war: War, e: CouncilEvent): boolean {
  const lts = ofRank(war, 'lieutenant');
  const caps = ofRank(war, 'captain');
  switch (e) {
    case 'recruit':
      return lts.length < SEATS.lieutenant;
    case 'promotion':
      return caps.length < SEATS.captain && lts.length > 0;
    case 'feud':
      return caps.length >= 2 || lts.length >= 2;
    case 'betrayal':
      return traitors(war).length > 0;
    case 'feast':
      return caps.length > 0;
    case 'trial':
      return challengers(war).length > 0;
    case 'oath':
      return war.members.filter((n) => n.oath === undefined).length >= 2;
    case 'desertion':
      return deserters(war).length > 0;
  }
}
/** The lieutenants who may betray their captain: loyalty under 30, within a Might of him. */
const traitors = (war: War): Nemesis[] =>
  ofRank(war, 'lieutenant').filter((n) => {
    const c = memberById(war, n.sworn);
    return !!c && n.loyalty < BETRAY_BELOW && n.might >= c.might - 1;
  });
/** The lieutenants who may put their captain to a Trial of Strength: Might 4 or more, sworn to one. */
const challengers = (war: War): Nemesis[] => ofRank(war, 'lieutenant').filter((n) => n.might >= TRIAL_MIGHT && !!memberById(war, n.sworn));
/** The members who may desert: Might 1, the last three meetings lost (never the warchief). */
const deserters = (war: War): Nemesis[] => war.members.filter((n) => n.rank !== 'warchief' && n.might <= 1 && (n.streak ?? 0) <= -DESERT_STREAK);

/** An event happens (its conditions must hold: `eventOpen`). `grew` holds who has gained Might this turn. */
export function happen(war: War, m: Meta, rng: Rng, e: CouncilEvent, grew: Set<number> = new Set()): void {
  switch (e) {
    case 'recruit': {
      const n = recruit(war, m, rng);
      if (n) news(war, 'recruit', `${fullName(n)} joins the Council as a lieutenant (${armyById(n.army)?.name ?? n.army})`);
      return;
    }
    case 'promotion': {
      const n = ofRank(war, 'lieutenant').sort(byMight)[0];
      for (const x of swornTo(war, n)) delete x.sworn;
      n.rank = 'captain';
      delete n.sworn;
      remember(n, 'Rose to captain of the Dark Council');
      news(war, 'promotion', `${fullName(n)} rises to captain`);
      return;
    }
    case 'feud': {
      const ranks = (['captain', 'lieutenant'] as const).filter((r) => ofRank(war, r).length >= 2);
      const pool = ofRank(war, rng.pick(ranks)).sort((a, b) => a.id - b.id);
      const a = rng.pick(pool);
      const b = rng.pick(pool.filter((x) => x !== a));
      const [w, l] = contest(rng, a, b);
      mightUp(w, grew);
      const slain = beaten(war, rng, l, w);
      if (!slain) remember(l, `Beaten by ${w.name} in a feud`);
      remember(w, `Beat ${l.name} in a feud`);
      news(war, 'feud', `${w.name} beat ${l.name}${slain ? `; ${l.name} is slain` : ''}`);
      return;
    }
    case 'betrayal': {
      const n = traitors(war).sort((a, b) => a.loyalty - b.loyalty || a.id - b.id)[0];
      const c = memberById(war, n.sworn)!;
      if (rng.next() < BETRAY_WIN) {
        swapSeats(war, n, c);
        n.loyalty = LOYALTY.start;
        remember(n, `Betrayed ${c.name} and took the seat`);
        if (rng.next() < BETRAY_SLAYS) {
          slainByRival(war, c, n);
          news(war, 'betrayal', `${fullName(n)} knifes ${c.name} and takes the seat; ${c.name} is slain`);
        } else {
          c.loyalty = 20;
          remember(c, `Betrayed by ${n.name}, cast down to lieutenant`);
          news(war, 'betrayal', `${fullName(n)} betrays ${c.name} and takes the seat; ${c.name} is cast down`);
        }
      } else {
        slainByRival(war, n, c);
        news(war, 'betrayal', `${n.name} plots against ${c.name}, and is caught; ${n.name} is slain`);
      }
      return;
    }
    case 'feast': {
      const c = rng.pick(ofRank(war, 'captain').sort((a, b) => a.id - b.id));
      const table = [c, ...swornTo(war, c)];
      const fat: Nemesis[] = [];
      for (const x of table) {
        loyal(x, LOYALTY.feast);
        if (x.weak.includes('glutton') && mightUp(x, grew)) fat.push(x);
      }
      news(war, 'feast', `${fullName(c)} holds a feast${table.length > 1 ? ` for ${table.length - 1 === 1 ? 'a lieutenant' : `${table.length - 1} lieutenants`}` : ''}${fat.length ? `; ${fat.map((x) => x.name).join(' and ')} ${fat.length === 1 ? 'grows' : 'grow'} stronger` : ''}`);
      return;
    }
    case 'trial': {
      const n = challengers(war).sort(byMight)[0];
      const c = memberById(war, n.sworn)!;
      const [w, l] = contest(rng, n, c);
      mightUp(w, grew);
      if (w === n) swapSeats(war, n, c);
      const slain = beaten(war, rng, l, w);
      remember(w, w === n ? `Won the captain’s seat from ${c.name} in a Trial of Strength` : `Put down ${n.name}’s Trial of Strength`);
      news(war, 'trial', w === n ? `${n.name} challenges ${c.name} to a Trial of Strength and takes the seat${slain ? `; ${c.name} is slain` : ''}` : `${n.name} challenges ${c.name} to a Trial of Strength and loses${slain ? `; ${n.name} is slain` : ''}`);
      return;
    }
    case 'oath': {
      const free = war.members.filter((n) => n.oath === undefined).sort((a, b) => a.id - b.id);
      const a = rng.pick(free);
      const b = rng.pick(free.filter((x) => x !== a));
      a.oath = b.id;
      b.oath = a.id;
      remember(a, `Swore a blood-oath with ${b.name}`);
      remember(b, `Swore a blood-oath with ${a.name}`);
      news(war, 'oath', `${fullName(a)} and ${fullName(b)} swear a blood-oath`);
      return;
    }
    case 'desertion': {
      const n = deserters(war).sort((a, b) => a.id - b.id)[0];
      drop(war, n);
      news(war, 'desertion', `${n.name} has had enough, and leaves the War`);
      return;
    }
  }
}

/** Draw one event by weight from those open now (none open: none). */
export function drawEvent(war: War, rng: Rng): CouncilEvent | undefined {
  const open = (Object.keys(EVENT_WEIGHT) as CouncilEvent[]).filter((e) => eventOpen(war, e));
  const total = open.reduce((s, e) => s + EVENT_WEIGHT[e], 0);
  if (!total) return undefined;
  let r = rng.next() * total;
  return open.find((e) => (r -= EVENT_WEIGHT[e]) < 0) ?? open[open.length - 1];
}

/**
 * The Council takes a turn (the War must be open): the warchief's seat is claimed or taken, a strong lieutenant's ambition wears at its
 * loyalty, then no event, one or two, then a Recruit is forced while fewer than three lieutenants sit. Returns the turn's News.
 */
export function takeTurn(war: War, m: Meta): WarNews[] {
  const rng = new Rng(mixSeed(m.seed, COUNCIL_SALT, war.turn));
  war.turn++;
  const grew = new Set<number>();
  swear(war);
  seatTheChief(war, rng, grew);
  for (const n of ofRank(war, 'lieutenant')) {
    const c = memberById(war, n.sworn);
    if (c && n.might >= c.might) loyal(n, LOYALTY.ambition);
  }
  const r = rng.next();
  const count = r < TURN_SHAPE.none ? 0 : r < TURN_SHAPE.none + TURN_SHAPE.one ? 1 : 2;
  for (let i = 0; i < count; i++) {
    const e = drawEvent(war, rng);
    if (!e) break;
    happen(war, m, rng, e, grew);
    swear(war);
  }
  // (the Council never falls below three lieutenants once the War is open)
  while (ofRank(war, 'lieutenant').length < MIN_LIEUTENANTS) {
    const n = recruit(war, m, rng);
    if (!n) break;
    news(war, 'recruit', `${fullName(n)} joins the Council as a lieutenant (${armyById(n.army)?.name ?? n.army})`);
  }
  swear(war);
  return war.news.filter((x) => x.turn === war.turn);
}

/**
 * A turn of the Council, if the day still counts one: `run` after an army run has ended (at most four a day), `visit` on the day's first
 * visit (one a day). `day` is the page's day key (yyyymmdd). Null when there is no War or the day's turns are spent.
 */
export function councilTurn(m: Meta, why: 'run' | 'visit', day: number): WarNews[] | null {
  const war = m.war;
  if (!war) return null;
  if (!war.day || war.day.key !== day) war.day = { key: day, turns: 0 };
  if (why === 'run') {
    if (war.day.turns >= RUN_TURNS) return null;
    war.day.turns++;
  } else {
    if (war.day.visit) return null;
    war.day.visit = true;
  }
  return takeTurn(war, m);
}

/** An army run has ended (`settleRun`): the Council takes its turn. Only an army's runs count (not the Muster, a daily or a quest). */
export function endOfRun(m: Meta, run: Run, day: number): WarNews[] | null {
  if (!run.over || run.mode?.kind !== 'army') return null;
  return councilTurn(m, 'run', day);
}

/** A turn's News as the wave card's lines ("The Council stirs: Gash beat Throg"), three at most. */
export const turnLines = (t: readonly WarNews[] | null): string[] => (t ?? []).slice(0, 3).map((x) => `The Council stirs: ${x.text}`);

// ---- what a fight means for the Council ----------------------------------------------------------------------------------------

/**
 * Settle a fight for the War (`noteNemesis`), then what it means for the Council: the News of who was named and who fell; War Trophies for
 * each nemesis slain (twelve a day at most); a captain slain counts towards the Muster; a warchief slain leaves his Head and reshuffles the
 * Council (the mightiest captain takes his seat at once, the mightiest lieutenant rises to captain); a slain member's blood-oath brother
 * turns Vengeful against the hero who struck the blow; the underlings of a member who won its meeting grow more loyal. `day` is the page's
 * day key (the trophies' daily cap); the tools leave it out.
 */
export function noteWar(m: Meta, run: Run, b: Battle, tally: NemesisTally | undefined, won: boolean, wave: number, day?: number): NemNote {
  const war0 = m.war;
  const openBefore = musterOpen(war0);
  const note = noteNemesis(m, run, b, tally, won, wave);
  const war = m.war;
  if (!war || !war0) return note;
  const lines: string[] = [];
  const muster = run.mode?.kind === 'muster';
  for (const x of note.born) news(war, 'named', `${fullName(x)} is named a ${rankWord(x.rank).toLowerCase()}: ${x.deed === 'slew' ? 'it slew a hero' : x.deed === 'maimed' ? 'it maimed a hero' : 'it escaped you'}`);
  let trophies = 0;
  for (const x of note.slain) {
    trophies += TROPHIES[x.rank];
    const by = x.by ? ` by ${heroName(x.by)}` : '';
    news(war, 'slain', `${fullName(x)}, ${rankWord(x.rank).toLowerCase()}, is slain${by}${muster ? ' at the Muster' : ''}`);
    // (its blood-oath brother swears vengeance on the hero who struck the blow)
    const brother = war.members.find((n) => n.oath === x.id);
    if (brother) {
      delete brother.oath;
      if (x.by && UNITS[x.by]) {
        brother.vengeful = x.by;
        remember(brother, `Swore vengeance on ${heroName(x.by)} for ${x.name}`);
        news(war, 'oath', `${fullName(brother)} swears vengeance on ${heroName(x.by)} for ${x.name}`);
        lines.push(`${fullName(brother)} swears vengeance on ${heroName(x.by)}`);
      }
    }
    for (const n of war.members) if (n.sworn === x.id) delete n.sworn;
    if (war.claim === x.id) delete war.claim;
    if (x.rank === 'captain') war.musterSince = Math.min(99, war.musterSince + 1);
    if (x.rank === 'warchief') {
      (war.heads ??= []).unshift({ name: fullName(x), base: x.base, army: x.army, might: x.might, turn: war.turn });
      war.heads.length = Math.min(war.heads.length, HEADS_MAX);
      war.musterSince = 0;
      lines.push(`The Warchief falls: ${fullName(x)}’s Head is yours`);
      lines.push(...reshuffle(war));
    }
  }
  // (the underlings of a member who won its meeting grow more loyal)
  for (const id of note.held) {
    const n = war.members.find((x) => x.id === id);
    if (!n) continue;
    const under = n.rank === 'warchief' ? ofRank(war, 'captain') : n.rank === 'captain' ? swornTo(war, n) : [];
    for (const x of under) loyal(x, LOYALTY.held);
  }
  if (trophies) {
    const key = day ?? war.day?.key ?? 0;
    if (!war.trophyDay || war.trophyDay.key !== key) war.trophyDay = { key, got: 0 };
    const got = Math.max(0, Math.min(trophies, TROPHY_DAY - war.trophyDay.got));
    war.trophyDay.got += got;
    war.trophies += got;
    if (got) note.trophies = got;
  }
  swear(war);
  if (!openBefore && musterOpen(war)) lines.push('The Warchief’s Muster is open: see the Dark Council');
  if (lines.length) note.council = [...(note.council ?? []), ...lines];
  return note;
}

/** A warchief has fallen: two Promotions at once, the mightiest captain to the seat and the mightiest lieutenant to captain. */
function reshuffle(war: War): string[] {
  const out: string[] = [];
  const cap = ofRank(war, 'captain').sort(byMight)[0];
  if (cap) {
    crown(war, cap);
    out.push(`${fullName(cap)} takes the Warchief’s seat`);
  }
  const lt = ofRank(war, 'lieutenant').sort(byMight)[0];
  if (lt && ofRank(war, 'captain').length < SEATS.captain) {
    lt.rank = 'captain';
    delete lt.sworn;
    remember(lt, 'Rose to captain of the Dark Council');
    news(war, 'promotion', `${fullName(lt)} rises to captain`);
    out.push(`${fullName(lt)} rises to captain`);
  }
  swear(war);
  return out;
}

// ---- the Spoils ----------------------------------------------------------------------------------------------------------------

/** A day key's week (weeks counted from 1 January 1970). */
export const weekOf = (day: number): number => Math.floor(Date.UTC(Math.floor(day / 10000), (Math.floor(day / 100) % 100) - 1, day % 100) / 86_400_000 / 7);
/** Unlock shards still to be bought this week. */
export const shardsLeft = (war: War, day: number): number => SHARD_WEEK - (war.shardWeek?.key === weekOf(day) ? war.shardWeek.got : 0);
/** The heroes whose unlock shards the Spoils sell: pullable heroes not yet owned. */
export const shardHeroes = (m: Meta): string[] => PULL_HEROES.filter((k) => !owns(m, k) && !isContent(k));

/** Buy an unlock shard of a hero not yet owned (six War Trophies, two a week). Null when it cannot be bought. */
export function buyShard(m: Meta, kind: string, day: number): Given | null {
  const war = m.war;
  if (!war || war.trophies < SHARD_PRICE || shardsLeft(war, day) <= 0 || !shardHeroes(m).includes(kind)) return null;
  war.trophies -= SHARD_PRICE;
  const wk = weekOf(day);
  war.shardWeek = { key: wk, got: (war.shardWeek?.key === wk ? war.shardWeek.got : 0) + 1 };
  return giveShards(m, kind, 1);
}

/** The members with a secret still unknown (a scout can be sent after them). */
export const scoutable = (war: War): Nemesis[] => war.members.filter((n) => [...n.traits, ...n.weak].some((s) => !n.known.includes(s)));

/** Send a scout after a member (two War Trophies): one of its secrets is revealed. Returns the secret's words, or null. */
export function buyScout(m: Meta, id: number): string | null {
  const war = m.war;
  const n = war?.members.find((x) => x.id === id);
  if (!war || !n || war.trophies < SCOUT_PRICE || !scoutable(war).includes(n)) return null;
  war.trophies -= SCOUT_PRICE;
  const s = reveal(n)!;
  return `${fullName(n)}: ${secretName(s)}`;
}

/** The Muster's count, for the board ("1 of 2 captains slain"). */
export const musterCount = (war: War | undefined): string => `${Math.min(MUSTER_NEED, war?.musterSince ?? 0)} of ${MUSTER_NEED} captains slain`;
