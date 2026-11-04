// The lost techniques (LOST-TECHNIQUES, docs/notes/lost-techniques.md; the design is in docs/notes/books-shop-gear-design.md, "The lost
// techniques"): four Legendary books that are never sold. Each is the end of a three-part chain on the tavern board, its last part a quest
// battle of its own (`../lostBattleData.ts`), and its hand-in pays the book (`Reward.book`). They are told in the `tale` slot, so the next part
// goes up as soon as the part before is handed in; a chain that needs a hero (or a calling) is only offered once the save owns one who could
// do it, and every part opens at hero level 30, where the ultimates do. Parts whose teller is a hero are told in that hero's own name and face
// (`QuestDef.hero`); the rest by "a lost page", the technique itself.
//
// - **The Ninefold Cut** (Manual; Kenji): fifteen clean waves, the Wildwood's old pilgrim road, and the empty dojo.
// - **Words of Unmaking** (Grimoire; the rift): a Calamity crossed with a caster, a guardian felled, and the unwritten library (Ravi).
// - **The Hymn of the Long Dawn** (Hymnal; a Royal charge): 20,000 healed, the chapel of the Last Stand reached, and Matins (Selam or Linnea).
// - **The Old Hunger** (Bestiary; a hunter's word): forty beasts felled, five Wildwood waves with a monster hero, and the den (Vuk).
//
// Pure data. The books they pay are in `../bookData.ts`; the skills in `../kits/lost.ts`.

import type { Need, QuestDef } from '../questData';
import { READS } from '../bookData';

/** Every chain opens at hero level 30, where the ultimates do. */
const LV30: Need = { kind: 'level', n: 30 };

export const LOST_QUESTS: readonly QuestDef[] = [
  /* ------------------------------------------------------------ The Ninefold Cut (Manual) */
  {
    id: 'lostNineScroll',
    title: 'The Ninefold Cut, I: The Torn Scroll',
    giver: 'lost',
    hero: 'samurai',
    needs: { kind: 'all', of: [LV30, { kind: 'army', army: 'wildwood' }] },
    text: 'Win 15 waves with Kenji on the field and no hero falling',
    offer: [
      'I found half a scroll in a dead man\'s sleeve. It is one cut, drawn nine times, and every drawing is a little different from the last.',
      'I cannot read it yet. A cut like that wants a man who has stopped losing people. Fifteen clean waves, and then I shall try.',
    ],
    going: 'I have been looking at the scroll again. It has not become easier. I am becoming easier, which I suppose is the point.',
    done: ['Fifteen waves and nobody on the floor. I held the scroll up to the light and the ninth drawing moved. I shall not mention it to anyone but you.'],
    goal: { kind: 'wavesWon', n: 15, with: { heroes: ['samurai'] }, flawless: true },
    reward: { crowns: 600, stones: 3 },
    mood: 'mysterious',
  },
  {
    id: 'lostNineRoad',
    title: 'The Ninefold Cut, II: The Pilgrim Road',
    giver: 'lost',
    hero: 'samurai',
    needs: { kind: 'all', of: [LV30, { kind: 'army', army: 'wildwood' }] },
    after: 'lostNineScroll',
    text: 'Win 5 waves of the Wildwood with Kenji on the field',
    offer: [
      'Hester read the maker\'s mark off the scroll without even leaning in. The Bridge School. Nine hundred years of one cut. Its dojo is up the old pilgrim road, and the road goes through the Wildwood.',
      'She charged me for the reading. She said it was the cheapest she has ever done, and I should be grateful.',
    ],
    going: 'The road is mostly roots. The roots, I think, are the only ones left who remember where it goes.',
    done: ['The road ends at a gate with no fence. Beyond it, a hall with every door open and nobody home. Somebody is practising in there. I could hear it from the gate.'],
    goal: { kind: 'wavesWon', n: 5, army: 'wildwood', with: { heroes: ['samurai'] } },
    reward: { crowns: 700, stones: 3 },
    mood: 'eerie',
  },
  {
    id: 'lostNineDojo',
    title: 'The Ninefold Cut, III: The Empty Dojo',
    giver: 'lost',
    hero: 'samurai',
    needs: { kind: 'all', of: [LV30, { kind: 'army', army: 'wildwood' }] },
    after: 'lostNineRoad',
    text: 'Win the quest battle The Empty Dojo (Kenji must fight)',
    offer: [
      'The hall is not empty. Its students are still lined up, and they are still bowing, and they are no longer, strictly, alive.',
      'The master is at the far end. He has been waiting for someone to cut as well as he does. I would like to be the disappointing sort of guest.',
    ],
    going: 'I have sharpened the sword. It did not need it. It was something to do with my hands.',
    done: ['He sheathed his sword and bowed. "Nine hundred years," he said, "and I finally lost." Then there was only the hall, and a book on the floor, and nobody to give it to. So: me.'],
    goal: { kind: 'battle', n: 1, battle: 'emptyDojo' },
    reward: { crowns: 1200, book: 'ninefoldCut', keepsake: 'A wooden practice sword, worn to a comma' },
    mood: 'heroic',
  },

  /* ------------------------------------------------------------ Words of Unmaking (Grimoire) */
  {
    id: 'lostWordsCrossing',
    title: 'Words of Unmaking, I: A Heavy Page',
    giver: 'lost',
    needs: { kind: 'all', of: [LV30, { kind: 'mode', mode: 'calamity' }] },
    text: 'Clear a Calamity crossing with a Grimoire reader on the field',
    offer: [
      'Something in the rift is holding a page. It is not a page anyone wrote. It weighs more than the book it is not in.',
      'Whoever carries it out will need a head for spells and the habit of coming back. Cross the rift with a caster beside you, and it may let you near.',
    ],
    going: 'The page is patient. Pages usually are. It is only the people holding them who are not.',
    done: ['You crossed with a caster at your side and came back. The page noticed. It would like a word with the next guardian, if you are going that way anyway.'],
    goal: { kind: 'calClear', n: 1, with: { heroes: READS.grimoire } },
    reward: { crowns: 800, stones: 3 },
    mood: 'mysterious',
  },
  {
    id: 'lostWordsGuardian',
    title: 'Words of Unmaking, II: What the Guardian Guards',
    giver: 'lost',
    needs: { kind: 'all', of: [LV30, { kind: 'mode', mode: 'calamity' }] },
    after: 'lostWordsCrossing',
    text: 'Fell a Calamity guardian',
    offer: ['The page is behind the guardian, and the guardian is behind the page, and the page would prefer it if one of them stopped being behind the other.'],
    going: 'It is very heavy. You may notice it is lighter when a guardian falls near it. That is not kindness. It is relief.',
    done: ['The guardian is down. The page slid across the floor to your feet like a cat, and then stopped, as if it had remembered itself.'],
    goal: { kind: 'calGuardian', n: 1 },
    reward: { crowns: 900, stones: 4 },
    mood: 'eerie',
  },
  {
    id: 'lostWordsLibrary',
    title: 'Words of Unmaking, III: The Unwritten Library',
    giver: 'lost',
    hero: 'wizard',
    needs: { kind: 'all', of: [LV30, { kind: 'mode', mode: 'calamity' }] },
    after: 'lostWordsGuardian',
    text: 'Win the quest battle The Unwritten Library (Ravi must fight)',
    offer: [
      'The page has a library, and the library has a keeper, and the keeper is called the Index, and he does not lend. I have never been to a library that did not lend. I find that I am offended.',
      'I shall need to set a few things on fire. I would like it noted that this is a last resort. It is a very short note.',
    ],
    going: 'I have been reading the page. It is blank. Every line of it. I am told that is the difficult part.',
    done: ['"It is blank. Every page." He turned it over. "No. It is just written on the other side of something." He did not say what. He has been very quiet, and entirely delighted, ever since.'],
    goal: { kind: 'battle', n: 1, battle: 'unwrittenLibrary' },
    reward: { crowns: 1400, book: 'wordsOfUnmaking', keepsake: 'A bookmark, made of a different bookmark' },
    mood: 'mysterious',
  },

  /* ------------------------------------------------------------ The Hymn of the Long Dawn (Hymnal) */
  {
    id: 'lostDawnWounds',
    title: 'The Hymn of the Long Dawn, I: Whoever Remembered',
    giver: 'lost',
    needs: { kind: 'all', of: [LV30, { kind: 'mode', mode: 'tower' }] },
    text: 'Heal 20,000 across fights with Hymnal readers',
    offer: [
      'There was a siege that should have been lost, and a hymn sung through it. Nobody wrote it down. The wounded remembered it, and the wounded, as a rule, do not stay around to be asked.',
      'But a hymn is a thing that gets sung again when it is needed. Keep your healers busy, and it may turn up in one of them by accident.',
    ],
    going: 'Healers hum, on a long enough fight. If one of yours hums something you do not know, do not interrupt.',
    done: ['Twenty thousand mended. Somewhere in that, a tune happened. Your healers will deny it. They always do.'],
    goal: { kind: 'tally', n: 20000, stat: 'healed', by: { heroes: READS.hymnal } },
    reward: { crowns: 800, stones: 3 },
    mood: 'warm',
  },
  {
    id: 'lostDawnChapel',
    title: 'The Hymn of the Long Dawn, II: The Chapel',
    giver: 'lost',
    needs: { kind: 'all', of: [LV30, { kind: 'mode', mode: 'tower' }] },
    after: 'lostDawnWounds',
    text: 'Reach the chapel in the Last Stand',
    offer: ['The siege was at a chapel, and the keep\'s own has the same bell. Get to it in the Last Stand, in the dark, and stand where they stood.'],
    going: 'The bell in the chapel has not rung in forty years. It is going to be embarrassed, whenever it does.',
    done: ['You were in the chapel when the line wavered, and the bell, which has no rope, rang once. Nobody was near it. It is an old building. It was probably the draught.'],
    goal: { kind: 'standRoom', n: 3 },
    reward: { crowns: 900, stones: 4 },
    mood: 'eerie',
  },
  {
    id: 'lostDawnMatins',
    title: 'The Hymn of the Long Dawn, III: Matins at the Chapel',
    giver: 'lost',
    needs: { kind: 'all', of: [LV30, { kind: 'mode', mode: 'tower' }] },
    after: 'lostDawnChapel',
    text: 'Win the quest battle Matins at the Chapel (Selam or Linnea must fight)',
    offer: [
      'The dead are keeping the chapel\'s hours. They have come for Matins, which is at dawn, and they do not seem to know the sun has not come up.',
      'Keep them out until it does. The hymn is for exactly this. I would like someone to be singing it when the light arrives.',
    ],
    going: 'Dawn is a long way off. It always is, the last hour. Sing through it.',
    done: ['"You sang it," the Crown wrote to say. "We did not know the words," said the healer. "The wounded did." The sun came up on the north wall first. It always does, there, and nobody had ever been awake to see.'],
    goal: { kind: 'battle', n: 1, battle: 'matinsChapel' },
    reward: { crowns: 1500, book: 'longDawn', keepsake: 'A hymn-board with one number, in chalk' },
    mood: 'warm',
  },

  /* ------------------------------------------------------------ The Old Hunger (Bestiary) */
  {
    id: 'lostHungerPacks',
    title: 'The Old Hunger, I: A Hide, Scratched',
    giver: 'lost',
    needs: { kind: 'all', of: [LV30, { kind: 'army', army: 'beasts' }] },
    text: 'Fell 40 beasts of the Beast Packs',
    offer: [
      'A frost-bitten hunter went by the keep this morning with a rolled hide under his arm, and left it, he said, on a doorstep. Yours. He did not stay to explain.',
      'It is scratched with claws. Whatever wrote it was very hungry, and very patient. It wants to know that you are the sort who eats the packs, so to speak, and not the sort who is eaten.',
    ],
    going: 'The hide smells of wet dog and old snow. It smells, I think, of an appetite.',
    done: ['Forty fewer beasts in the packs. The hide unrolled itself a hand\'s width. There is a map in it, drawn in claw marks, and it does not lead anywhere cheerful.'],
    goal: { kind: 'kills', n: 40, ofArmy: 'beasts' },
    reward: { crowns: 700, stones: 3 },
    mood: 'eerie',
  },
  {
    id: 'lostHungerWood',
    title: 'The Old Hunger, II: Under the Wildwood',
    giver: 'lost',
    needs: { kind: 'all', of: [LV30, { kind: 'army', army: 'beasts' }] },
    after: 'lostHungerPacks',
    text: 'Win 5 Wildwood waves with a monster hero on the field',
    offer: ['The map puts the thing\'s den in the north. It also says, in a different hand, that the thing will not speak to anyone who has not walked the Wildwood with one of its own kind at their side. Take a beast of your own, and walk.'],
    going: 'The beasts of your company have been very still since the hide came. I do not think they are afraid. I think they are listening.',
    done: ['Five waves, and a monster hero at your shoulder. Back at camp, the monsters of your company bowed, very slightly, at the hide. Nobody saw it but me.'],
    goal: { kind: 'wavesWon', n: 5, army: 'wildwood', with: { heroes: READS.bestiary } },
    reward: { crowns: 800, stones: 3 },
    mood: 'mysterious',
  },
  {
    id: 'lostHungerDen',
    title: 'The Old Hunger, III: The Den Beneath the Snow',
    giver: 'lost',
    hero: 'werewolf',
    needs: { kind: 'all', of: [LV30, { kind: 'army', army: 'beasts' }] },
    after: 'lostHungerWood',
    text: 'Win the quest battle The Den Beneath the Snow (Vuk must fight)',
    offer: [
      'There is a grandmother under the snow. She is the oldest of us, and she wrote it. She will not give it to anyone who runs. I do not run. I do, rather, make a lot of noise on the way in.',
      'Come along. Bring the nice sword. She likes to see what the pack has been eating.',
    ],
    going: 'I have been sleeping badly. I dream of a very long winter. It is, apparently, her dream. We are only visiting.',
    done: ['She let us have it. I do not know why. She looked at me for a long time, and then she lay down in the snow and was very, very tired. Do not waste it, she said. She said it in a voice I knew.'],
    goal: { kind: 'battle', n: 1, battle: 'snowDen' },
    reward: { crowns: 1400, book: 'oldHunger', keepsake: 'A tuft of white fur that does not melt' },
    mood: 'sad',
  },
];
