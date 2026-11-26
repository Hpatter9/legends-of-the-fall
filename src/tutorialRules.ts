// PAUSE-TIPS (docs/notes/pause-tips.md): the unlock tutorials. The owner: "more tutorial explanations. A popup that pauses the game when you
// start a wave but now you have auto merge unlocked, so it explains that kind of thing." Each feature that opens during play has a short
// explanation, shown once a save the first time it matters: at the first wave after it opens, on that wave's deploy screen for what is
// done there (Auto merge, Auto place, the trait perks, Rune Auto: the button lit while the card is up) and as its fight begins for the
// rest (the fight held until the card is closed); `WAVE_CAP` a moment and the rest the wave after. A few wait for their page instead (the
// tavern, the Recruit tab, the Dark Council, the War Room). What has been seen is kept in `Meta.tutorials`. Pure: no Pixi, no DOM; the cards are `tutorialView.ts`.

import { ULT_LEVEL } from './sim/abilities';
import { ARMIES, armyCleared, tierOpen, totalStars } from './sim/armies';
import { ARMY_WEAKNESS, RESIST_MULT, WEAK_MULT } from './sim/armyWeakness';
import { HALL, HALL_STATS, hallBonus } from './sim/hall';
import { offeredChain } from './sim/eidolonChains';
import { autoMergeOpen, autoPlaceOpen, autoRunesOpen } from './sim/featureUnlocks';
import { SKILL2_LEVEL } from './sim/heroKits';
import { levelOfKind } from './sim/levels';
import type { Meta } from './sim/meta';
import { chapelOpen, modeOpen } from './sim/modeUnlock';
import { FATE_MEETINGS } from './sim/nemesis';
import { slotsAtStars } from './sim/spellSlots';
import { pointsEarned } from './sim/talents';
import { hornHeld } from './sim/warHorn';

/** The two moments of a wave a tutorial can hold: its deploy screen opening, or its fight beginning (the fight held). */
export type TutorialMoment = 'deploy' | 'fight';
/** The pages a tutorial can wait for instead, the first time each is opened. */
/** (IAP: 'shop', the Shop's first opening, only in a build that has one: the Play app) */
/** (WEEKLY-TRIAL: 'trial', the Weekly Trial's card the first time it opens) */
export type TutorialPage = 'tavern' | 'recruit' | 'council' | 'armies' | 'shop' | 'trial';

export interface Tutorial {
  id: string;
  title: string;
  /** Two to four short lines, in the game's voice. */
  lines: readonly string[];
  /** A picture from the game's own art (a served path), where one fits. */
  art?: string;
  /** A wave's deploy screen, its fight's start, or the page it waits for. */
  at: TutorialMoment | TutorialPage;
  /** What it lights on the deploy screen while its card is up (a selector), if that is on show. */
  point?: string;
  /** What opens it, read from the save. */
  open: (m: Meta) => boolean;
  /** What opens it, in words (the Tutorials page). */
  when: string;
  /** Newer than its unlock: a save that already had the feature open before the tutorials still sees it once. */
  newer?: boolean;
  /** IAP: only in a build with a Shop (left off the Tutorials page elsewhere). */
  shopOnly?: boolean;
}

const owned = (m: Meta): readonly string[] => m.unlocked ?? [];
const anyLevel = (m: Meta, n: number): boolean => owned(m).some((k) => levelOfKind(m, k) >= n);
const firstArmy = (m: Meta): boolean => armyCleared(m, ARMIES[0].id);

/** Every tutorial, in the order they are told when several are due at once. */
export const TUTORIALS: readonly Tutorial[] = [
  {
    id: 'pause',
    title: 'Pause the fight',
    lines: ['The pause button beside the speed holds the fight where it stands.', 'Nothing moves until you tap Resume, and the fight pauses by itself if you leave the game.'],
    art: 'ui/buttons/pause.webp',
    at: 'fight',
    open: firstArmy,
    when: 'Your first army beaten',
    newer: true,
  },
  {
    id: 'autoMerge',
    title: 'Auto merge unlocked',
    lines: ['When a pair is ready, Auto merge shows on the bench: tap it to merge every pair at once.', 'Two heroes of the same kind and grade still make one of the next grade, up to grade four.'],
    art: 'ui/buttons/auto-merge.webp',
    at: 'deploy',
    point: '#mergeAll',
    open: autoMergeOpen,
    when: 'The second army beaten',
  },
  {
    id: 'traitPerks',
    title: 'Trait perks',
    lines: ['Heroes who share a trait fight better together.', 'Two, three and four of a trait on the board each open a stronger tier.', 'Tap a trait chip above the bench to read its perks.'],
    art: 'ui/buttons/formations.webp',
    at: 'deploy',
    point: '#traits',
    open: firstArmy,
    when: 'Your first army beaten',
    newer: true,
  },
  {
    id: 'spellSlots',
    title: 'A second spell slot',
    lines: ['Army stars open more of your king\'s spell slots: four in all.', 'Each slot holds a spell to cast in the fight; the Spell switch casts them for you.'],
    art: 'ui/buttons/spells.webp',
    at: 'fight',
    open: (m) => slotsAtStars(totalStars(m)) >= 2,
    when: '3 army stars',
  },
  {
    id: 'daily',
    title: 'The daily battle',
    lines: ['Each day the camp has a battle of ten waves that ends with the boss of the day.', 'Every player meets the same day. Find it on the Battle tab.'],
    art: 'ui/buttons/daily.webp',
    at: 'fight',
    open: firstArmy,
    when: 'Your first army beaten',
  },
  {
    id: 'eidolons',
    title: 'The Eidolons',
    lines: ['A summoner waits in the Recruit tab with a pact to fulfil.', 'Finish its chain of tasks and an Eidolon is bound to you: a great being your War Horn can call into a fight.'],
    art: 'ui/buttons/tab-recruit.webp',
    at: 'fight',
    open: (m) => !!offeredChain(m),
    when: 'Your first army beaten',
  },
  {
    id: 'castle',
    title: 'The Castle opens',
    lines: ['The Castle tab is open: raise buildings that strengthen every run.', 'A build takes real time and goes on while the game is closed; the builders do one at a time.'],
    art: 'ui/buttons/tab-castle.webp',
    at: 'fight',
    open: (m) => modeOpen(m, 'castle'),
    when: '6 army stars',
  },
  {
    id: 'autoRunes',
    title: 'Rune Auto unlocked',
    lines: ['Pull the Runes bar across: on the rune bench, Auto sets your runes into your heroes and merges the spares with one tap.', 'Drag a rune by hand whenever you would rather choose.'],
    art: 'ui/rune-bench/rune-auto.webp',
    at: 'deploy',
    point: '#benchGrip',
    open: autoRunesOpen,
    when: '6 army stars',
  },
  {
    id: 'nemesis',
    title: 'The Nemesis War',
    lines: ['The foe remembers you now. A captain who beats your heroes, or escapes them, earns a name and climbs the Dark Council.', 'Meet them again and they will be stronger, and they will know you.'],
    art: 'ui/buttons/council.webp',
    at: 'fight',
    open: (m) => !!m.war,
    when: 'The second army beaten',
  },
  {
    id: 'chapel',
    title: 'The Chapel',
    lines: ['The Chapel can be raised in the Castle now.', 'Once it stands, the Spells tab opens: choose your king\'s spells and rank them up.'],
    art: 'ui/buttons/spells.webp',
    at: 'fight',
    open: chapelOpen,
    when: '10 army stars',
  },
  {
    id: 'talents',
    title: 'Talent points',
    lines: ['A hero earns a talent point every few levels.', 'Spend them on the hero\'s tree, on its Progression page in the tavern, to change how it fights.'],
    art: 'ui/buttons/upgrades.webp',
    at: 'fight',
    open: (m) => owned(m).some((k) => pointsEarned(m, k) > 0),
    when: 'A hero at level 3',
  },
  {
    id: 'secondSkill',
    title: 'A second skill',
    lines: ['A hero at level 10 opens a second skill, and at level 20 a third.', 'They cast on their own in the fight; their levels grow the more they are used.'],
    art: 'ui/buttons/sword.webp',
    at: 'fight',
    open: (m) => anyLevel(m, SKILL2_LEVEL),
    when: 'A hero at level 10',
  },
  {
    id: 'duels',
    title: 'Duels',
    lines: ['A nemesis you have met twice may call one of your heroes out.', 'Accept and the two fight alone in a ring for a minute: win and the nemesis falls for good and its wave breaks; lose and it fights the wave stronger.'],
    art: 'ui/buttons/sword.webp',
    at: 'fight',
    open: (m) => !!m.war?.members.some((n) => n.met >= FATE_MEETINGS),
    when: 'A nemesis met twice',
  },
  {
    id: 'warHorn',
    title: 'The War Horn',
    lines: ['An Eidolon is bound to you, and the War Horn sits by the board.', 'It fills as the fight goes on: when it glows, tap it to call your Eidolon\'s strike.'],
    art: 'ui/buttons/horn-lit.webp',
    at: 'fight',
    open: hornHeld,
    when: 'Your first Eidolon bound',
  },
  {
    id: 'ultimates',
    title: 'Ultimates',
    lines: ['A hero at level 30 has its ultimate.', 'Its portrait glows when the ultimate is ready: tap it to fire, or let Auto ultimates fire them for you.'],
    art: 'ui/buttons/ultimate.webp',
    at: 'fight',
    open: (m) => anyLevel(m, ULT_LEVEL),
    when: 'A hero at level 30',
  },
  {
    id: 'autoPlace',
    title: 'Auto place unlocked',
    lines: ['Tap Auto to set your heroes out in one go.', 'They stand in the formation you picked; move any of them by hand after.'],
    art: 'ui/buttons/auto-place.webp',
    at: 'deploy',
    point: '#auto',
    open: autoPlaceOpen,
    when: 'The fourth army beaten',
  },
  // (the pages' own: the first time each is opened)
  {
    id: 'tavern',
    title: 'The tavern',
    lines: ['Your heroes rest here between battles. Tap one for its sheet: its gear, skills, talents and rank.', 'Hester\'s shop, the quests and Upgrade all are here too.'],
    art: 'ui/buttons/tavern.webp',
    at: 'tavern',
    open: () => true,
    when: 'The Heroes tab first opened',
  },
  {
    id: 'summoning',
    title: 'Summoning',
    lines: ['Summoning stones call heroes: each stone gives a shard of one.', 'Enough shards and a new hero joins you, or one you have ranks up.', 'Stones come from chests, quests and army stars.'],
    art: 'ui/buttons/stones.webp',
    at: 'recruit',
    open: () => true,
    when: 'The Recruit tab first opened',
  },
  {
    id: 'council',
    title: 'The Dark Council',
    lines: ['Every nemesis you have made sits on the Council, under its warchief.', 'Between your runs they scheme, rise and fall. Tap one to read what it remembers of you.'],
    art: 'ui/buttons/council.webp',
    at: 'council',
    open: (m) => !!m.war,
    when: 'The Council first opened',
  },
  {
    id: 'hunts',
    title: 'Hunts',
    lines: ['Two War Trophies buy a hunt: mark a nemesis on the Council as your quarry.', 'It waits in its army\'s next run. Slay it for a bounty; meet it and let it live, and the hunt fails.'],
    art: 'ui/buttons/trophies.webp',
    at: 'council',
    open: (m) => !!m.war && (m.war.trophies ?? 0) >= 2,
    when: 'Two War Trophies',
  },
  {
    id: 'spare',
    title: 'Spare or slay',
    lines: ['A beaten nemesis may kneel before you.', 'Slay it and it falls for good. Spare it and it serves as your Informant for five runs, telling the secrets of its old masters.'],
    art: 'ui/buttons/council.webp',
    at: 'council',
    open: (m) => !!m.war?.kneel,
    when: 'A nemesis kneels',
  },
  {
    id: 'tiers',
    title: 'Harder tiers',
    lines: ['Three stars on an army open its Hard tier; more stars open Elite, Legendary and Mythic.', 'Each tier is for stronger heroes, and pays better.'],
    art: 'ui/buttons/armies.webp',
    at: 'armies',
    open: (m) => ARMIES.some((a) => tierOpen(m, a, 1)),
    when: 'Three stars on an army',
  },
  {
    // (HALL-OF-HEROES, docs/notes/hall-of-heroes.md: told on the Heroes tab the first time the Hall lends anything, a hero owned at rank 1)
    id: 'hall',
    title: 'The Hall of Heroes',
    lines: [
      'Every hero you own lends all your heroes a little strength for each rank it has: Guardians health, Blades attack, Assassins crit, Casters skill charge.',
      'Own every hero of a trait to complete its set, for a title and a reward.',
      'A hero who sits out three army runs comes back Rested, with half again the XP.',
    ],
    art: 'ui/buttons/all-heroes.webp',
    at: 'tavern',
    point: '.hallDoor',
    open: (m) => HALL.on && HALL_STATS.some((s) => hallBonus(m)[s] > 0),
    when: 'A hero ranks up',
    newer: true,
  },
  {
    // (ARMY-WEAKNESS, docs/notes/army-weakness.md: told the first time the War Room shows an army's weaknesses; `newer`, so a save from
    //  before sees it once)
    id: 'armyWeakness',
    title: 'Weaknesses',
    lines: [
      'Every army is weak to some classes of hero and resists others: see "Weak to" and "Resists" on its card.',
      `Its foes take ${Math.round((WEAK_MULT - 1) * 100)}% more harm from a hero it is weak to, and ${Math.round((1 - RESIST_MULT) * 100)}% less from one it resists.`,
      'On the deploy screen, ▲ marks a hero that hits a weakness and ▼ one that is resisted.',
    ],
    art: 'ui/buttons/armies.webp',
    at: 'armies',
    point: '.asMatch',
    open: () => ARMY_WEAKNESS.on,
    when: 'The War Room opens',
    newer: true,
  },
  {
    // (WEEKLY-TRIAL, docs/notes/weekly-trial.md: told the first time the Trial's card opens; `newer`, so a save from before sees it once)
    id: 'weeklyTrial',
    title: 'The Weekly Trial',
    lines: [
      'A new trial every Monday: seven waves against one army, under rules that change each week.',
      'One try a day, and your best of the week counts. Rewards at 3, 5 and all 7 waves, paid once a week.',
      'Each week favours some classes and may bar others: a reason to build a second team.',
    ],
    art: 'ui/buttons/trial.webp',
    at: 'trial',
    open: () => true,
    when: 'The Weekly Trial opened',
    newer: true,
  },
  {
    // (IAP, docs/notes/iap.md: told the first time the Shop opens; a build without a Shop never opens it, and the Tutorials page leaves it
    //  out there, `shopOnly`)
    id: 'shop',
    title: 'The Shop',
    lines: ['Stones, crowns and bundles can be bought here; everything in the game can still be earned by playing.', 'Every item has fixed contents. The chance of each summon is on the Odds button in the Summoning Sanctum.', 'A purchase on another phone or after a fresh start comes back with Restore purchases.'],
    art: 'ui/buttons/coin.webp',
    at: 'shop',
    open: () => true,
    when: 'The Shop opened',
    newer: true,
    shopOnly: true,
  },
];

export type TutorialId = string;

/** At most this many tutorials hold one moment of a wave (its deploy, its fight's start); the rest wait for the next wave. */
export const WAVE_CAP = 2;

export const tutorialOf = (id: TutorialId): Tutorial | undefined => TUTORIALS.find((t) => t.id === id);
export const tutorialSeen = (m: Meta, id: TutorialId): boolean => !!m.tutorials?.includes(id);

/** The tutorials due at a moment of a wave (its deploy screen, or its fight's start), in order (open, unseen), at most `WAVE_CAP`. */
export function dueAt(m: Meta, moment: TutorialMoment): TutorialId[] {
  return TUTORIALS.filter((t) => t.at === moment && !tutorialSeen(m, t.id) && t.open(m))
    .slice(0, WAVE_CAP)
    .map((t) => t.id);
}

/** The tutorials due as a page opens (open, unseen), in order. */
export function dueOnPage(m: Meta, page: TutorialPage): TutorialId[] {
  return TUTORIALS.filter((t) => t.at === page && !tutorialSeen(m, t.id) && t.open(m)).map((t) => t.id);
}

export function markTutorialSeen(m: Meta, id: TutorialId): void {
  if (!tutorialSeen(m, id)) m.tutorials = [...(m.tutorials ?? []), id];
}

/** "Show tips again": every tutorial unseen, to be told afresh as its moment comes. */
export function resetTutorials(m: Meta): void {
  m.tutorials = [];
}

/** A save's first load with the tutorials (it has no `Meta.tutorials`): a veteran is not flooded. Everything it already has open is
 *  marked seen, except the tutorials newer than their unlock (`newer`: the pause, the trait perks). A new save (no army beaten, no star
 *  won, no stone pulled) has nothing marked, so it meets every tutorial in its turn. Returns whether anything changed (to save). */
export function settleTutorials(m: Meta): boolean {
  if (Array.isArray(m.tutorials)) return false;
  const fresh = totalStars(m) === 0 && !(m.pulls > 0) && !ARMIES.some((a) => armyCleared(m, a.id));
  m.tutorials = fresh ? [] : TUTORIALS.filter((t) => !t.newer && t.open(m)).map((t) => t.id);
  return true;
}
