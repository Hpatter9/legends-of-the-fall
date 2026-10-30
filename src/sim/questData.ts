// The quests' data: who gives them (the givers), and the first ordinary quests (batch 1 of the quests and Eidolons design,
// `docs/notes/quests-summons-design.md`: four of Gwen Tallow's at the tavern and two of the passersby's). Pure data: the rules that
// offer, count and pay them are in `quests.ts`. A new quest is a new entry here; the goal kinds are shared.

/** Who offers a quest and takes it back. */
export type GiverId = 'gwen' | 'pedlar' | 'pilgrim';

/** Where a giver's offers come from: Gwen's board in the tavern, or the passersby (one a day, whoever passes). */
export type GiverSlot = 'gwen' | 'passerby';

export interface Giver {
  id: GiverId;
  name: string;
  /** A few words on who they are, under the name on their card. */
  title: string;
  slot: GiverSlot;
}

export const GIVERS: Record<GiverId, Giver> = {
  gwen: { id: 'gwen', name: 'Gwen Tallow', title: 'Keeper of the tavern', slot: 'gwen' },
  pedlar: { id: 'pedlar', name: 'A pedlar', title: 'Passing on the road', slot: 'passerby' },
  pilgrim: { id: 'pilgrim', name: 'A pilgrim', title: 'Passing on the road', slot: 'passerby' },
};

/** The draws, in order: each slot is drawn from its own side stream (its index here is its salt). */
export const SLOTS: readonly GiverSlot[] = ['gwen', 'passerby'];

/** How many of a slot's offers the board holds at once, and how many days each lasts before it is taken down. */
export const SLOT_RULES: Record<GiverSlot, { cap: number; days: number }> = {
  // (the board holds up to three of Gwen's; one new a day; an offer lasts 3 days: the owner's decision)
  gwen: { cap: 3, days: 3 },
  // (a passerby is gone at midnight if not taken)
  passerby: { cap: 1, days: 1 },
};

/** When a quest may be offered. */
export type Need = { kind: 'any' } | { kind: 'army'; army: string } | { kind: 'armies'; n: number };

/** A rider on a fight goal: one of these heroes, or any hero of one of these traits, fought in it. */
export interface With {
  heroes?: readonly string[];
  traits?: readonly string[];
}

/** What a quest asks. Each counts from what the game settles after a fight (`noteQuests`). */
export type Goal =
  /** Win `n` waves (of one army, or anywhere), with the riders. */
  | { kind: 'wavesWon'; n: number; army?: string; with?: With; flawless?: boolean }
  /** Win `n` boss waves (a mid-boss or a last boss), with the riders. */
  | { kind: 'bossDown'; n: number; with?: With; flawless?: boolean }
  /** Fell `n` foes of a family, in any mode, won or lost. */
  | { kind: 'kills'; n: number; family: FoeFamily }
  /** Clear `n` dailies (the counted play of a date). */
  | { kind: 'clearDaily'; n: number };

export type FoeFamily = 'skeletons';

/** A quest's pay, from what the game already pays: crowns, stones, a chest into the stash, rift ores. */
export interface Reward {
  crowns?: number;
  stones?: number;
  chest?: 'bronze' | 'silver' | 'gold';
  ores?: readonly { trait: string; n: number }[];
}

export interface QuestDef {
  id: string;
  title: string;
  giver: GiverId;
  needs: Need;
  /** The goal in plain words, for the log and the chip. */
  text: string;
  /** The giver's words when it is offered (one to three lines), while it is going, and at the hand-in. */
  offer: readonly string[];
  going: string;
  done: readonly string[];
  goal: Goal;
  reward: Reward;
}

/** The first set: Gwen's four and two passersby' (the design's "A first set of ordinary quests"). */
export const QUESTS: readonly QuestDef[] = [
  {
    id: 'cartersWheels',
    title: "The Carter's Wheels",
    giver: 'gwen',
    needs: { kind: 'army', army: 'orcs' },
    text: 'Win 3 waves of the Orc Warband with Kwame or a Guardian on the field',
    offer: [
      'Orc-blood on your boots and you still came in through the front door. Good.',
      "There's a carter on the north road, says his wagons keep losing their wheels to something in the Orc camp. Pays in crowns. Interested?",
    ],
    going: "The carter's still counting his spokes. Three more fights should settle it.",
    done: ['The carter sends his thanks, and a wheel nobody wanted. I hung it over the door.'],
    goal: { kind: 'wavesWon', n: 3, army: 'orcs', with: { heroes: ['knight'], traits: ['guardian'] } },
    reward: { crowns: 120, stones: 2 },
  },
  {
    id: 'roundForTheHouse',
    title: 'A Round for the House',
    giver: 'gwen',
    needs: { kind: 'any' },
    text: 'Win 10 waves, in any mode',
    offer: ['Ten wins, and the next round is on the house. Well. On you, then I pay you back. It\'s complicated. Take it?'],
    going: "I've a tally on the slate behind the bar. Don't make me rub it out.",
    done: ['Ten! The slate is full and so is the tap. Here: your share, and a chest someone left under table four.'],
    goal: { kind: 'wavesWon', n: 10 },
    reward: { crowns: 150, chest: 'bronze' },
  },
  {
    id: 'boneCollector',
    title: 'The Bone Collector',
    giver: 'gwen',
    needs: { kind: 'army', army: 'undead' },
    text: 'Fell 60 skeletons, in any mode',
    offer: [
      "The dog that sleeps by my hearth has developed tastes. Expensive ones.",
      'Bring down sixty of the rattling sort and I\'ll pay for the bones. Don\'t ask what for.',
    ],
    going: "The dog is waiting. The dog is always waiting.",
    done: ['Sixty! The dog will be insufferable. Your pay, and three stones a pilgrim swapped for soup.'],
    goal: { kind: 'kills', n: 60, family: 'skeletons' },
    reward: { crowns: 200, stones: 3 },
  },
  {
    id: 'quietHands',
    title: 'Quiet Hands',
    giver: 'gwen',
    needs: { kind: 'armies', n: 2 },
    text: 'Win a boss wave with no hero falling',
    offer: ["Anyone can win ugly. A wager's going round the bar that your lot can't beat a boss without a single one of you hitting the floor. I've put money on you."],
    going: "Not one of them on the floor, mind. I've money on it.",
    done: ['Not a scratch on them! I won the wager, and you get the silver chest. Fair is fair.'],
    goal: { kind: 'bossDown', n: 1, flawless: true },
    reward: { crowns: 250, chest: 'silver' },
  },
  {
    id: 'freshBread',
    title: 'Fresh Bread for the Front',
    giver: 'pedlar',
    needs: { kind: 'any' },
    text: 'Clear a daily challenge',
    offer: ["Bread! Fresh bread! Well. Yesterday's. Clear the road for me, the day's challenge, and I'll pay you in stones; I've no use for them, they're terrible in a sandwich."],
    going: 'Still on the road with my bread. It is getting less fresh.',
    done: ['The road is clear and the bread is... bread. Three stones, as promised.'],
    goal: { kind: 'clearDaily', n: 1 },
    reward: { stones: 3 },
  },
  {
    id: 'pilgrimsRoad',
    title: "The Pilgrim's Road",
    giver: 'pilgrim',
    needs: { kind: 'army', army: 'wildwood' },
    text: 'Win 3 waves of the Wildwood with a healer on the field',
    offer: ['The shrine path runs through the Wildwood, and the trees have opinions. Walk it with someone who mends what the branches break, and I will pray for you, and pay.'],
    going: 'The trees are still talking. Take a healer and walk on.',
    done: ['The path is open. Take these crowns, and the stones from the shrine: they are warm, and smell of soup.'],
    goal: { kind: 'wavesWon', n: 3, army: 'wildwood', with: { heroes: ['cleric', 'wanderer', 'druid', 'priestess'] } },
    reward: { crowns: 200, ores: [{ trait: 'support', n: 2 }, { trait: 'warden', n: 2 }] },
  },
];

export const questById = (id: string): QuestDef | undefined => QUESTS.find((q) => q.id === id);
