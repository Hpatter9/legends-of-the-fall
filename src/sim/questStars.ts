// Quest stars and length (QUESTS-3, batch Q1, `docs/notes/quests-design.md` section 2). A quest's stars (1 to 5) measure its difficulty
// only, against the level a typical save has when it first opens; its length is a separate tag (Short, Long, Chain, Campaign).
// `STAR_TABLE` is the authored table (one entry a quest); `starEstimate` adds up weights from the goal and its riders, and a test keeps
// every authored star within one of it. Pure data and rules: no Pixi, no DOM.

import { ARMIES } from './armies';
import { questBattleById } from './questBattles';
import { QUESTS, questById, type Cond, type Goal, type Need, type QuestDef } from './questData';

export type QuestLength = 'short' | 'long' | 'chain' | 'campaign';
export const LENGTH_NAMES: Record<QuestLength, string> = { short: 'Short', long: 'Long', chain: 'Chain', campaign: 'Campaign' };
export const LENGTHS: readonly QuestLength[] = ['short', 'long', 'chain', 'campaign'];

/** What a star count is called. */
export const STAR_NAMES = ['', 'Errand', 'Task', 'Trial', 'Ordeal', 'Legend'] as const;
/** The hero level a star count asks of a player, beyond the level the quest opens at (the design's table). */
export const STAR_EXTRA = [0, 0, 0, 5, 10, 15] as const;

/** The stars as text: "★★★☆☆". */
export const starText = (n: number): string => '★'.repeat(n) + '☆'.repeat(5 - n);

/** The level a typical save has when a need first holds (the armies' own recommended levels, `docs/notes/army-pace.md`). */
export function needLevel(n: Need): number {
  switch (n.kind) {
    case 'army':
      return ARMIES.find((a) => a.id === n.army)?.level ?? 1;
    case 'armies':
      return ARMIES[Math.min(ARMIES.length, Math.max(1, n.n)) - 1]?.level ?? 1;
    case 'level':
      return n.n;
    case 'tier':
      return [1, 45, 60, 75, 90][Math.min(4, Math.max(0, n.tier))];
    case 'mode':
      return n.mode === 'tower' ? 20 : 35;
    case 'ascension':
      return 70 + n.n * 8;
    case 'all':
      return Math.max(1, ...n.of.map(needLevel));
    default:
      return 1;
  }
}

/** A quest's opening level, and the level to be comfortable at (the opening level plus its stars' extra). */
export const openLevel = (q: QuestDef): number => needLevel(q.needs);
export const comfortLevel = (q: QuestDef): number => openLevel(q) + STAR_EXTRA[starsOf(q)];

/** How big a goal's count is, as a weight: a tally of a few fights is nothing, a run of many is a labour. */
function bulk(g: Goal): number {
  const n = g.n;
  switch (g.kind) {
    case 'wavesWon':
      return n >= 100 ? 1.5 : n >= 30 ? 1 : n >= 10 ? 0.5 : 0;
    case 'kills':
      return n >= 500 ? 1.5 : n >= 200 ? 1 : n >= 80 ? 0.5 : 0;
    case 'bossDown':
      return n >= 8 ? 1.5 : n >= 4 ? 1 : n >= 2 ? 0.5 : 0;
    case 'tally':
      return n >= 100_000 ? 1.5 : n >= 25_000 ? 1 : n >= 8_000 ? 0.5 : 0;
    case 'clearDaily':
      return n >= 10 ? 1 : n >= 3 ? 0.5 : 0;
    case 'clearArmy':
    case 'calClear':
      return n >= 3 ? 1 : n >= 2 ? 0.5 : 0;
    case 'standWave':
      return n >= 30 ? 3 : n >= 20 ? 2 : n >= 12 ? 1 : 0;
    case 'standRoom':
      return n >= 4 ? 2.5 : n >= 3 ? 1.5 : n >= 2 ? 0.5 : 0;
    case 'calGuardian':
      return 0.5 * Math.max(0, (g.map ?? 1) - 1) + (n >= 3 ? 0.5 : 0);
    case 'battle':
      return 0;
    default:
      return n >= 20 ? 1 : n >= 8 ? 0.5 : 0;
  }
}

/** The weight of a goal's riders. */
function riders(c: Cond): number {
  let w = 0;
  if (c.flawless) w += 1;
  if (c.quick !== undefined) w += c.quick <= 60 ? 1 : 0.5;
  if (c.lowHp) w += 0.5;
  if (c.noSpells) w += 0.5;
  if (c.spellsOnly) w += 0.5;
  if (c.most !== undefined) w += c.most <= 2 ? 1 : 0.5;
  if (c.only) w += 0.5;
  if (c.all && c.all.length > 1) w += 0.5;
  if (c.ultsIn !== undefined) w += 0.5;
  if (c.tier) w += Math.min(3, c.tier) * 0.8;
  if (c.stage !== undefined && c.stage >= 10) w += 0.5;
  if (c.boss) w += 0.5;
  return w;
}

/** A battle quest's weight: 2.5 for a battle, a half more for each rule it carries (protect, survive, race, spare, mutators) and for a cast of three. */
function battleWeight(g: Goal): number {
  if (g.kind !== 'battle') return 0;
  const qb = questBattleById(g.battle);
  if (!qb) return 2;
  return 2.5 + 0.5 * Object.keys(qb.rules ?? {}).length + (qb.cast.length >= 3 ? 0.5 : 0);
}

/**
 * The stars a quest's data adds up to, 1 to 5. A rough guide (a quest battle's win rate and the boss waves are measured by `npm run
 * quest-stars`): the goal's size, each rider, the tier asked and the fights it is most likely to be lost in.
 */
export function starEstimate(q: QuestDef): number {
  const g = q.goal as Goal & Cond;
  let s = 1 + bulk(g) + riders(g) + battleWeight(g);
  if (g.kind === 'clearArmy' || g.kind === 'calClear') s += 0.8;
  if (g.kind === 'bossDown' || g.kind === 'calGuardian') s += 0.4;
  return Math.max(1, Math.min(5, Math.round(s)));
}

/** The longest chain of `after` links a quest sits in, counting itself (a quest with nothing before it and nothing after is 1). */
export function partsOf(q: QuestDef): number {
  let n = 1;
  for (let c: QuestDef | undefined = q; c?.after; c = questById(c.after)) n++;
  return n;
}
/** The number of parts in the story a quest belongs to (the whole chain, before and after it). */
export function storyParts(q: QuestDef): number {
  let last = q;
  for (;;) {
    const next = QUESTS.find((x) => x.after === last.id);
    if (!next) break;
    last = next;
  }
  return partsOf(last);
}

/** Authored stars and length, by quest id. Generated from the estimate, then tuned by hand where the design names a quest. */
export const STAR_TABLE: Readonly<Record<string, readonly [number, QuestLength]>> = {
  cartersWheels: [1, 'chain'],
  roundForTheHouse: [1, 'short'],
  boneCollector: [1, 'chain'],
  quietHands: [2, 'short'],
  cartersDaughter: [2, 'chain'],
  wheelForTheWall: [2, 'chain'],
  dogsSecondCourse: [2, 'chain'],
  knockingCellar: [1, 'chain'],
  lastOrders: [2, 'short'],
  kenjisTab: [1, 'short'],
  cellarDoor: [1, 'short'],
  brothersPatrol: [2, 'short'],
  slateBehindTheBar: [2, 'long'],
  smokeTheBees: [1, 'short'],
  longTable: [1, 'short'],
  gwensLedger: [3, 'short'],
  twosCompany: [2, 'short'],
  nightWatchKeep: [2, 'short'],
  bardsWager: [1, 'short'],
  theLastLight: [3, 'short'],
  lostSirPounce: [1, 'chain'],
  foundWrongCat: [2, 'chain'],
  wantedChieftain: [3, 'short'],
  apprenticeWanted: [2, 'long'],
  choirAuditions: [1, 'short'],
  knifeInTheBoard: [1, 'short'],
  backRent: [3, 'short'],
  midnightRecital: [3, 'chain'],
  missingTaxman: [1, 'short'],
  lostSpectacles: [2, 'short'],
  scarecrowNeeded: [2, 'short'],
  bellRinger: [4, 'short'],
  freshBread: [1, 'long'],
  pedlarsPans: [1, 'long'],
  clockworkSnuffbox: [2, 'short'],
  lampOilKeep: [1, 'short'],
  bulkDiscount: [2, 'long'],
  loadedDice: [1, 'short'],
  pilgrimsRoad: [1, 'chain'],
  shrineBell: [1, 'chain'],
  pilgrimsLastMile: [2, 'chain'],
  vowOfQuiet: [2, 'short'],
  lanternsForTheLost: [2, 'long'],
  relicOfOswin: [1, 'short'],
  sealedOrders: [1, 'chain'],
  unsealedOrders: [2, 'chain'],
  messengersHorse: [2, 'short'],
  dispatchForTheFront: [1, 'short'],
  hardNewsForge: [3, 'short'],
  theCensus: [1, 'long'],
  tracksInSnow: [1, 'chain'],
  theWhiteWolf: [3, 'chain'],
  colderAim: [1, 'short'],
  snaresInTheWood: [1, 'short'],
  boarKingsTusk: [2, 'short'],
  longWinterNight: [1, 'short'],
  lastHunt: [3, 'chain'],
  kwameShieldPractice: [2, 'long'],
  kenjiCleanCut: [2, 'short'],
  natsuHighCrags: [1, 'short'],
  minhOnTheEdge: [2, 'short'],
  ayameNeverSeen: [2, 'short'],
  raviShowMeFire: [1, 'short'],
  selamLantern: [2, 'long'],
  itzelGreyPack: [2, 'short'],
  tiagoSaltBetweenUs: [2, 'chain'],
  harrowWhoPaysForRum: [2, 'chain'],
  hideoHoldTheLine: [1, 'short'],
  eirikRedAxe: [1, 'long'],
  zofiaSmallPrint: [2, 'chain'],
  hobbUnburied: [2, 'short'],
  maeveSixShots: [2, 'short'],
  rookCalibration: [1, 'short'],
  vesperLastHour: [2, 'short'],
  edmundVerdict: [3, 'short'],
  royalBanners: [3, 'chain'],
  royalFeast: [2, 'chain'],
  royalLongNight: [3, 'short'],
  royalRift: [2, 'short'],
  royalTreasury: [2, 'long'],
  royalHeir: [1, 'short'],
  royalThrone: [4, 'short'],
  royalLastKeep: [4, 'short'],
  warlordsMap: [1, 'short'],
  chieftainsTally: [3, 'short'],
  lichsLetter: [1, 'short'],
  gorgonsMirror: [2, 'short'],
  oniMask: [2, 'short'],
  forgeCore: [3, 'long'],
  demonsContract: [2, 'long'],
  riftWait: [2, 'chain'],
  riftNow: [4, 'chain'],
  riftNames: [1, 'short'],
  riftHunger: [2, 'long'],
  riftTwin: [1, 'short'],
  riftLast: [4, 'chain'],
  duchessHatEmergency: [2, 'chain'],
  duchessSecondHat: [2, 'chain'],
  duchessMenu: [1, 'long'],
  duchessFriend: [1, 'short'],
  repGlasses: [1, 'short'],
  repRats: [1, 'long'],
  repQuietNight: [2, 'short'],
  repKitchenFire: [1, 'short'],
  repRegularsWager: [1, 'short'],
  repNewBarrel: [1, 'long'],
  repBountyOrcs: [1, 'long'],
  repBountyBones: [1, 'long'],
  repBountyWolves: [1, 'long'],
  repBountyThorns: [1, 'short'],
  repBountyLabyrinth: [1, 'short'],
  repBountyOgres: [1, 'short'],
  repBountyInfernal: [1, 'long'],
  repBountyParade: [1, 'short'],
  repPedlarSamples: [1, 'short'],
  repPedlarWhetstone: [2, 'long'],
  repPedlarOil: [1, 'short'],
  repPilgrimAlms: [2, 'long'],
  repPilgrimPrayers: [2, 'short'],
  repPilgrimCandle: [1, 'long'],
  repHunterPelts: [2, 'long'],
  repHunterMeat: [2, 'short'],
  repHunterWatch: [1, 'short'],
  repHunterSnares: [2, 'short'],
  repMessengerDispatches: [1, 'short'],
  repMessengerErrand: [1, 'short'],
  repRiftWhispers: [1, 'short'],
  repRiftEchoes: [1, 'long'],
  repDuchessSnack: [1, 'short'],
  repDuchessNap: [2, 'short'],
  twoBladesBridge: [3, 'short'],
  captainsWager: [3, 'short'],
  cinderCrown: [3, 'short'],
  frostOnTheirBacks: [3, 'short'],
  duchessHole: [3, 'short'],
  whatKnocksBelow: [3, 'short'],
  theSweeper: [3, 'short'],
  zofiaAudit: [3, 'short'],
  theEncore: [3, 'short'],
  riftOneMore: [4, 'short'],
  emptyDen: [3, 'short'],
  taleFoldTracks: [4, 'chain'],
  taleFoldNight: [4, 'chain'],
  taleChainsWorth: [4, 'chain'],
  taleChainsCrew: [4, 'chain'],
  taleChainsTide: [4, 'chain'],
  taleIronSlag: [4, 'chain'],
  taleIronMarch: [4, 'chain'],
  taleLedgerUncounted: [4, 'chain'],
  taleLedgerBell: [4, 'chain'],
  taleLedgerThirteen: [4, 'chain'],
  talePawnTicket: [4, 'chain'],
  talePawnCollectors: [4, 'chain'],
  taleBannerLanterns: [4, 'chain'],
  taleBannerCrows: [4, 'chain'],
  taleBannerNight: [4, 'chain'],
  taleThroneSummons: [4, 'chain'],
  taleThroneContempt: [4, 'chain'],
  taleThroneAppeal: [4, 'chain'],
  taleClockStopped: [4, 'chain'],
  taleClockHour: [4, 'chain'],
  taleEyrieAsh: [4, 'chain'],
  taleEyrieNets: [4, 'chain'],
  taleEyrieNest: [4, 'chain'],
  taleStarMargins: [4, 'chain'],
  taleStarCaves: [4, 'chain'],
  taleStarHome: [4, 'chain'],
  lostNineScroll: [4, 'chain'],
  lostNineRoad: [4, 'chain'],
  lostNineDojo: [4, 'chain'],
  lostWordsCrossing: [4, 'chain'],
  lostWordsGuardian: [4, 'chain'],
  lostWordsLibrary: [4, 'chain'],
  lostDawnWounds: [4, 'chain'],
  lostDawnChapel: [4, 'chain'],
  lostDawnMatins: [4, 'chain'],
  lostHungerPacks: [4, 'chain'],
  lostHungerWood: [4, 'chain'],
  lostHungerDen: [4, 'chain'],
};

/** A quest's stars (1 to 5). */
export const starsOf = (q: QuestDef): number => q.stars ?? STAR_TABLE[q.id]?.[0] ?? starEstimate(q);
/** A quest's length tag. */
export const lengthOf = (q: QuestDef): QuestLength => q.length ?? STAR_TABLE[q.id]?.[1] ?? 'short';
/** "★★★☆☆ · Long · Lv 45+" for the board's rows. */
export const starLine = (q: QuestDef): string => `${starText(starsOf(q))} · ${LENGTH_NAMES[lengthOf(q)]} · Lv ${comfortLevel(q)}+`;
