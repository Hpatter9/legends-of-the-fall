// The retune of the Crown's quests (QUESTS-3, Q4): the ruler's Royal charges, the spoils of war, the voice in the rift and Duchess's
// asks, each with a harder goal and riders, their stories, givers, needs and ids kept. Only the lines that named the old count or the
// pay are written again. Pure data (`../questData.ts` has the shape).

import type { Retune } from '../questData';

export const CROWN_RETUNE: Readonly<Record<string, Retune>> = {
  // ---- the ruler's Royal charges ----
  royalBanners: {
    stars: 3,
    length: 'chain',
    goal: { kind: 'clearArmy', n: 2, tier: 1 },
    text: 'Clear armies twice on Hard or harder',
    offer: [
      'By my word: the realm has grown used to hearing that the keep wins on the easy roads.',
      'I would have them hear something harder. Break two armies on the Hard road, and I shall hang both their banners in the great hall, where the ambassadors can see them while they eat.',
    ],
  },
  royalFeast: {
    stars: 4,
    length: 'chain',
    goal: { kind: 'wavesWon', n: 30, tier: 2 },
    text: 'Win 30 waves on Elite or harder',
    offer: [
      'The banners brought ambassadors, the ambassadors brought appetites, and now I am obliged to hold a feast.',
      'A feast needs a reason, and a long table needs a long list of reasons. Win me waves on the Elite road, enough to fill every course, and the ambassadors will go home and tell their masters to think again.',
    ],
    going: 'The cooks have drawn up a menu with a line left blank for every victory. They are running out of paper.',
    done: ['A cup for every victory, and the table groaned. One of the ambassadors wept into the soup. The tomes are from the royal library, which nobody reads.'],
  },
  royalLongNight: {
    stars: 4,
    length: 'long',
    goal: { kind: 'standWave', n: 30 },
    goals: [{ kind: 'holdLine', n: 3 }],
    steps: ['Reach wave 30 of the Last Stand', 'Hold the line three times'],
    within: 6,
    text: 'Reach wave 30 of the Last Stand, and hold the line at an act\'s end 3 times, within 6 days',
    offer: ['By my word: the keep is mine, and they come for me there. Hold them thirty waves, room by room, and stand your ground at the end of three of those rooms, all within the week. Then I shall sleep the long night through for the first time since the crown was put on me.'],
    going: 'I lie awake counting waves, and I have reached eleven in my head. The week is running. You must do better than my head.',
    done: ['You held, and held again, and the night passed over me like a quiet river. I slept. I dreamt of nothing at all, which is the finest thing a ruler can dream.'],
  },
  royalRift: {
    stars: 4,
    length: 'long',
    goal: { kind: 'calClear', n: 2, flawless: true },
    goals: [{ kind: 'calGuardian', n: 3, map: 3 }],
    steps: ['Clear the Calamity twice, no hero lost', 'Fell 3 guardians, third map on'],
    text: 'Clear the Calamity twice with no hero falling at the end, and fell 3 guardians on the third map or later',
    offer: [
      'There is a tear in my realm, and things come out of it that have no business in a kingdom.',
      'By my word: walk it end to end twice, and bring every one of yours home from the last door. Fell three of its deeper guardians on the way. I do not care how; I care that it is done, and that my people hear it was.',
    ],
  },
  royalTreasury: {
    stars: 3,
    length: 'long',
    goal: { kind: 'spells', n: 100, tier: 1 },
    text: 'The king casts 100 spells in Hard or harder army runs',
    offer: [
      'My treasurer informs me that my spells cost the realm money. Every meteor, a little less in the coffers.',
      'I have decided to prove him wrong by casting a hundred, on the Hard roads where the foes are costliest, and showing him the realm still stands. It is either that or have him thrown in the moat, and the moat is being cleaned.',
    ],
    done: ['A hundred! The realm stands. The treasurer has resigned to write a pamphlet against me. It sells very well; I am buying copies. Here is your share of the profit.'],
  },
  royalHeir: {
    stars: 3,
    length: 'long',
    goal: { kind: 'mvp', n: 8, by: { traits: ['royal'] }, tier: 1 },
    goals: [{ kind: 'bossDown', n: 2, tier: 1, with: { traits: ['royal'] } }],
    steps: ['A Royal hero MVP of 8 wins on Hard', 'Fell 2 bosses with a Royal at the front'],
    text: 'A Royal hero is the MVP of 8 wins on Hard or harder, and fell 2 bosses there with a Royal hero on the field',
    offer: [
      'Those of the blood ride with you. I watch them more than I admit.',
      'One day one of them may sit where I sit. By my word, show me which, eight times on the hard roads, the best of the field, and have them take down two bosses besides. Then I shall know whom to teach the weight of this chair.',
    ],
  },
  royalThrone: {
    stars: 4,
    length: 'short',
    goal: { kind: 'standRoom', n: 4, held: true },
    goals: [{ kind: 'standWave', n: 25 }],
    steps: ['Reach the throne room, line held', 'Reach wave 25 of the Last Stand'],
    text: 'Reach the throne room in a run of the Last Stand, having held the line on the way, and reach wave 25',
    offer: ['They will drive us back to my throne one day. When they do, I want to have held every room I could on the way, reached the last with my guard about me, and stood a good long while in it. By my word: show me that it can be done.'],
    done: ['You held, and held, and stood in my hall twenty-five waves deep. I have never sat in my chair more gladly. Keep the cushion; it is a very good cushion.'],
  },
  royalLastKeep: {
    stars: 5,
    length: 'short',
    goal: { kind: 'bossDown', n: 2, tier: 3, flawless: true },
    text: 'Win 2 boss waves on Legendary or harder, no hero falling',
    offer: [
      'When I was crowned, my old tutor said: a keep is not the stone. It is the people who will not let it fall.',
      'By my word: go to the Legendary road, where nobody sane goes, and bring down two of what waits there with every one of yours still standing. Then let anyone say this keep is only stone.',
    ],
  },

  // ---- spoils of war ----
  warlordsMap: {
    stars: 2,
    length: 'short',
    goal: { kind: 'wavesWon', n: 3, army: 'undead', stage: 8, most: 4 },
    text: 'Win wave 8 or later of the Undead Legion 3 times, with four heroes or fewer',
  },
  chieftainsTally: {
    stars: 3,
    length: 'long',
    goal: { kind: 'clearArmy', n: 2, army: 'orcs', tier: 1 },
    text: 'Clear the Orc Warband twice on Hard or harder',
    done: ['The Warband is broken on the hard road, and again. You burnt the tally stick on the camp fire, notch by notch. It took a long time. It felt right that it did.'],
  },
  lichsLetter: {
    stars: 2,
    length: 'long',
    goal: { kind: 'spells', n: 12, spells: ['resurrect'], tier: 1 },
    text: 'The king casts Resurrect 12 times in Hard or harder army runs',
    done: ['A dozen raised, whole and breathing and annoyed about it. You leave the letter on the Lich King\'s cairn with the flower, which looks, oddly, a little less dry.'],
  },
  gorgonsMirror: {
    stars: 3,
    length: 'short',
    goal: { kind: 'bossDown', n: 3, boss: ['gorgonQueen'], most: 2 },
    text: 'Beat the Gorgon Queen 3 times with two heroes or fewer on the field',
    done: ['Two of you, three times over, and she never once looked up until it was too late. The mirror shows the room now. It also shows a small, smug face that is not yours. You put it away.'],
  },
  oniMask: {
    stars: 2,
    length: 'short',
    goal: { kind: 'wavesWon', n: 6, only: { traits: ['yokai'] }, tier: 1 },
    text: 'Win 6 waves on Hard or harder with only Yokai heroes on the field',
    offer: ['Found on the Oni King: his mask, red lacquer, warm. When you hold it you hear a parade, very far off, and a fox laughing. The spirits want it carried by their own, through six hard fights, before they will let it rest.'],
  },
  forgeCore: {
    stars: 4,
    length: 'long',
    goal: { kind: 'tally', n: 600000, stat: 'dealt', tier: 2 },
    within: 7,
    text: 'Your heroes deal 600,000 damage in Elite or harder army runs, within 7 days',
    going: 'The core beats a little slower each night. The smiths take turns listening, and one of them is counting the days on the wall.',
    done: ['It stopped. Cold. The smiths have set it in the anvil-block, where it rings a little sweeter than iron. They send their respects, and something from the guild strongbox.'],
  },
  demonsContract: {
    stars: 2,
    length: 'long',
    goal: { kind: 'kills', n: 300, ofArmy: 'infernal' },
    text: 'Fell 300 foes of the Infernal Host, in any mode',
    offer: ['Found on the fallen devil: a contract, in triplicate, in which the Infernal Host promises to deliver three hundred souls to a creditor below by the end of the quarter. Clause nine says the debt is void if the deliverers are themselves delivered. Lawyers would call that a loophole.'],
    done: ['Three hundred delivered, the wrong way. The contract has burst into flames, in triplicate. Somewhere below, a creditor is having a very bad day. Your fee, from the escrow.'],
  },

  // ---- the voice in the rift ----
  riftWait: {
    stars: 2,
    length: 'chain',
    goal: { kind: 'calGuardian', n: 3, map: 2 },
    text: 'Fell 3 Calamity guardians on the second map or later',
    offer: ['the first was a door. you knocked. good.', 'there is a second door. it is heavier, and it has brothers. wait for each, and when it opens, go through. do not look at what holds it.'],
  },
  riftNow: {
    stars: 4,
    length: 'chain',
    goal: { kind: 'calGuardian', n: 2, map: 4, flawless: true },
    text: 'Fell 2 Calamity guardians on the fourth map or later with no hero falling',
    offer: ['now.', 'the fourth door, and the ones after it. all of you through, all of you out, twice. if one stays, it keeps them. it has kept so many. it is lonely.'],
    done: ['all of you, both times. it is angry. it is less lonely, being angry.', 'it says your names now. i am sorry. here.'],
  },
  riftNames: {
    stars: 2,
    length: 'short',
    goal: { kind: 'ults', n: 12, mode: 'calamity', ultsIn: 2 },
    text: 'Fire 12 ultimates in Calamity fights, at least 2 in one fight',
    offer: ['it hears your heroes when they shout their great words. it learns the words. it says them back in the night, wrong.', 'shout more. louder, and two together, so it hears how they are meant to sound. teach it the right way, so it stops getting them wrong.'],
  },
  riftHunger: {
    stars: 3,
    length: 'long',
    goal: { kind: 'kills', n: 500, mode: 'calamity' },
    within: 5,
    text: 'Fell 500 foes in Calamity fights, within 5 days',
    offer: ['it is hungry. it eats the things that come out of it, if they fall near enough.', 'feed it five hundred, and quickly, before it wakes again. then it will sleep, and while it sleeps the edges close a little.'],
  },
  riftTwin: {
    stars: 3,
    length: 'long',
    goal: { kind: 'duos', n: 20, mode: 'calamity', most: 3 },
    text: 'Set off 20 duo combos in Calamity fights, with three heroes or fewer',
    offer: ['it splits things. friends. families. the edges of the world. it does not know what to do with two who strike as one.', 'show it. again and again, with only a few of you, so it cannot say it was the crowd. it needs to learn that some things do not come apart.'],
  },
  riftLast: {
    stars: 5,
    length: 'chain',
    goal: { kind: 'calGuardian', n: 2, map: 6, lowHp: true },
    goals: [{ kind: 'calClear', n: 2 }],
    steps: ['Fell the last guardian twice, bleeding', 'Clear the Calamity twice'],
    text: "Fell the Calamity's last guardian twice, each time with a hero left on a quarter of their health or less, and clear the Calamity twice",
    offer: ['the last door is Karnok. he is what the hunger looks like when it stands up.', 'you will win. you will win bleeding. you will have to do it twice. that is the price. i am telling you so you are not surprised.'],
    going: 'bleed a little. not too much. then again.',
  },

  // ---- Duchess ----
  duchessHatEmergency: {
    stars: 2,
    length: 'short',
    goal: { kind: 'bossDown', n: 3, boss: ['orcWarlord'] },
    text: 'Beat the Orc Warlord 3 times',
    offer: ['Mehh. (Her hat has been eaten. By her.)', 'MEHH. (The Orc Warlord has a helmet. It has horns. She has seen it. She needs three, one for each of her moods. She will not discuss alternatives.)'],
    done: ['MEHH! (The helmets. They are too big. She is wearing all three, one on top of the other. She has never been happier.)', 'Meh-heh. (She has left you something she did not eat. It is a sign of great favour.)'],
  },
  duchessSecondHat: {
    stars: 3,
    length: 'chain',
    goal: { kind: 'bossDown', n: 2, boss: ['oniKing'], flawless: true },
    text: 'Beat the Oni King twice, no hero falling',
    offer: ['Mehh. (She has eaten the helmet. Most of it. The horns remain.)', 'Mehh! (She has heard of a king with better horns, red ones, in the Night Parade. She wants a matched pair, and she wants everyone back in one piece afterwards, as she is not fond of an empty trough.)'],
  },
  duchessMenu: {
    stars: 2,
    length: 'long',
    goal: { kind: 'clearDaily', n: 1 },
    streak: 4,
    text: 'Clear the daily challenge 4 days running',
    offer: ['Meh. (She has eaten the tavern\'s menu. Again. Gwen is not speaking to her.)', 'Mehh. (The daily road brings in the pedlars, and the pedlars bring new menus. Four days of them without a miss, and Gwen might forgive her. Might.)'],
  },
  duchessFriend: {
    stars: 2,
    length: 'long',
    goal: { kind: 'spells', n: 15, spells: ['wolves'] },
    text: 'The king casts Call the Wolves 15 times',
    offer: ['Meh. (She is lonely. The dog by the hearth will not play. The dog has standards.)', 'Mehh? (She has seen the king call wolves. Wolves are basically dogs with ambition. She would like to meet a whole pack, and then meet them again.)'],
  },
};
