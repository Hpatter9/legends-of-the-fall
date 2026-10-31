// The hero quests (SECRET-HEROES, the owner's ask: "let's add some quests in which a hero comes from"): ten tales, three and then seven
// more (HERO-TALES-2), each told by its own giver by the tavern's fire, two or three parts long, ending in a quest battle of its own
// (`../taleBattleData.ts`) and a secret hero joining at the hand-in. Until then the hero is only "the stranger": no part names them,
// and the reward reads as the tease.
//
// - **The Thing at the Fold** (Old Maud, a shepherd): opens with the Beast Packs cleared, where the Werewolf used to be earned. Vuk.
// - **A Sellsword in Chains** (Brannock, the turnkey): opens with the Last Stand open and three armies cleared; the Dread Pirate used to
//   come at wave 20 of the Last Stand, and the tale asks for wave 10 of it. Harrow.
// - **The Iron Pilgrim** (Edda Coalbrook, a forge-hand): opens with the Golem Forge cleared, and asks for its waves on Hard, as the
//   Juggernaut's old milestone did. Kerem.
//
// HERO-TALES-2, the owner's call: the other seven earned heroes come by a tale too, built the same way:
// - **The Ledger of the Unburied** (Sexton Pell): opens with the Undead Legion cleared, asks for its waves on Hard (where the Reaper was
//   earned). Vesper.
// - **The Pawned Blade** (Ottilie Marsh, a pawnbroker): opens with the Infernal Host cleared, asks for its waves on Hard. Aram.
// - **The Banner in the Mist** (Kiku, a lantern-seller): opens with the Yokai Night Parade cleared, asks for its waves on Elite. Hideo.
// - **The Second Throne** (Master Fenwick, the herald): opens with the Last Stand open and six armies cleared, asks for wave 30 of it
//   and the line held three times (the Tyrant came at wave 40). Edmund.
// - **Yesterday's Visitor** (Hesper Tock, a clockmaker): opens with the Calamity open, asks for two guardians felled on its fourth map or
//   later (the Time Witch came with a Calamity cleared). Adaeze.
// - **The Scorched Eyrie** (Wren Halloway, a falconer): opens with a Calamity cleared at ascension 1, asks for two more clears (the
//   Queen Dragoon came at ascension 3). Tiziri.
// - **The Fallen Star** (Ivy Penhallow, the bestiary's keeper): opens with a third of the bestiary met (the Great Sage came at half).
//   Seydou.
//
// A tale's parts follow each other by `after` and go up on the board at once (`offerTales`, the `tale` slot). A save that has the hero
// already (an old save that earned it by its milestone) is told the same tale and paid the `instead` reward. Pure data.

import type { QuestDef } from '../questData';

export const TALE_QUESTS: readonly QuestDef[] = [
  /* ------------------------------------------------------------ The Thing at the Fold: the Werewolf */
  {
    id: 'taleFoldTracks',
    title: 'The Thing at the Fold, I: Tracks',
    giver: 'shepherd',
    needs: { kind: 'army', army: 'beasts' },
    text: 'Win 5 waves of the Beast Packs',
    offer: [
      'Something comes to my fold at night. Not wolves: wolves do not shut the gate behind them.',
      'The tracks walk on two feet half the way and four the rest. Thin out the packs on the hill, so I can see whose tracks are left.',
    ],
    going: 'I sat up with the lamp. Something sat up with me, just past the light. It did not take a single lamb.',
    done: ["The packs are thinner, and there is one set of tracks left. It goes into my fold and it does not come out. I am an old woman; I have decided to call it a lodger."],
    goal: { kind: 'wavesWon', n: 5, army: 'beasts' },
    reward: { crowns: 150, stones: 2 },
    mood: 'eerie',
  },
  {
    id: 'taleFoldNight',
    title: 'The Thing at the Fold, II: The Moonlit Fold',
    giver: 'shepherd',
    needs: { kind: 'army', army: 'beasts' },
    after: 'taleFoldTracks',
    text: 'Win the quest battle The Moonlit Fold (a hero of yours must fight)',
    offer: [
      'Full moon tomorrow. The pack is coming back, the white-eyed one, and her at the head of it. My lodger says she is coming for him.',
      'He asked me, very politely, to ask you. He has nice manners for a thing that lives in a sheep fold.',
    ],
    going: 'He is sharpening something. I hope it is a knife. I have not looked.',
    done: [
      'The pack is gone and my lodger has come in to the fire. He has a lamb on his lap and he says he has been keeping them from her all spring.',
      'He gave his name. He says he would like to stand with whoever stood with him. I have told him the keep feeds well.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'moonFold' },
    reward: { hero: { kind: 'werewolf', tease: 'the stranger joins your company', instead: { crowns: 400, stones: 4 } }, keepsake: 'A shepherd\'s crook with tooth-marks in it' },
    mood: 'warm',
  },

  /* ------------------------------------------------------------ A Sellsword in Chains: the Dread Pirate */
  {
    id: 'taleChainsWorth',
    title: 'A Sellsword in Chains, I: His Keep',
    giver: 'gaoler',
    needs: { kind: 'all', of: [{ kind: 'mode', mode: 'tower' }, { kind: 'armies', n: 3 }] },
    text: 'Reach wave 10 of the Last Stand',
    offer: [
      'We fished a man out of the moat. Wet through, chained at the wrists, and swearing he is a captain.',
      'He says he will fight for his keep, if we show him the keep is worth fighting for. Hold the Last Stand a while and let him watch from the grate.',
    ],
    going: 'He keeps score through the grate. He is very rude about the archers.',
    done: ['He watched the lot. He has stopped calling us landlubbers and started calling us "the lads". I think that is worse.'],
    goal: { kind: 'standWave', n: 10 },
    reward: { crowns: 200, stones: 2 },
    mood: 'funny',
  },
  {
    id: 'taleChainsCrew',
    title: 'A Sellsword in Chains, II: His Old Crew',
    giver: 'gaoler',
    needs: { kind: 'all', of: [{ kind: 'mode', mode: 'tower' }, { kind: 'armies', n: 3 }] },
    after: 'taleChainsWorth',
    text: 'Fell 40 skeletons',
    offer: [
      'Now he says his old crew are coming for him. I said, are they not dead? He said yes, that is the problem.',
      'Thin out the bones wherever you meet them. He says every one you put down is one less at his door.',
    ],
    going: 'He has asked for a second blanket and a cutlass. I have given him the blanket.',
    done: ['He counts them on the wall in chalk. He says forty is a good start and a bad end. He says the tide is coming.'],
    goal: { kind: 'kills', n: 40, family: 'skeletons' },
    reward: { crowns: 250, chest: 'bronze' },
    mood: 'eerie',
  },
  {
    id: 'taleChainsTide',
    title: 'A Sellsword in Chains, III: The Tide in the Moat',
    giver: 'gaoler',
    needs: { kind: 'all', of: [{ kind: 'mode', mode: 'tower' }, { kind: 'armies', n: 3 }] },
    after: 'taleChainsCrew',
    text: 'Win the quest battle The Tide in the Moat (a hero of yours must fight)',
    offer: ['Spring tide tonight. The moat comes up to the grates. He says that is when they will come up with it, and he says, would we mind awfully not letting them have him.'],
    going: 'He is standing at the grate with his chains wrapped round his fists. I have stopped asking.',
    done: [
      'The tide went out and left him laughing in the mud. I have the key here. He says he will sign on, for a wage and a share, and he signed with a flourish.',
      'Twice drowned, he says. Says it like other men say they were in the navy.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'chainsTide' },
    reward: { hero: { kind: 'dreadPirate', tease: 'the prisoner joins your company', instead: { crowns: 500, stones: 4 } }, keepsake: 'A set of rusted manacles, unlocked' },
    mood: 'heroic',
  },

  /* ------------------------------------------------------------ The Iron Pilgrim: the Juggernaut */
  {
    id: 'taleIronSlag',
    title: 'The Iron Pilgrim, I: Footprints in the Slag',
    giver: 'smith',
    needs: { kind: 'army', army: 'golems' },
    text: 'Win 6 waves of the Golem Forge on Hard',
    offer: [
      'Down at the Forge there are footprints in the slag the size of a cart, and they go *out*. Nothing goes out of the Forge. It is not built for out.',
      'Push into the Forge on its harder days and see what is following them.',
    ],
    going: 'The prints go round the keep twice and then sit down by the well. Whatever it is, it was thinking.',
    done: ['The Forge is sending its golems after the prints. It wants its walker back. The walker does not want to go. I know how that feels; I left too.'],
    goal: { kind: 'wavesWon', n: 6, army: 'golems', tier: 1 },
    reward: { crowns: 400, stones: 3 },
    mood: 'mysterious',
  },
  {
    id: 'taleIronMarch',
    title: 'The Iron Pilgrim, II: The Long March',
    giver: 'smith',
    needs: { kind: 'army', army: 'golems' },
    after: 'taleIronSlag',
    text: 'Win the quest battle The Long March (a hero of yours must fight)',
    offer: [
      'It has stopped hiding. It is walking up the Forge road in the open, with a door on its back, and the Foreman is coming down after it.',
      'The Foreman counts every stone that leaves. It will not stop counting until this one comes home. Go and stand in the road.',
    ],
    going: 'It has walked all night. It is not tired. I do not think it knows how.',
    done: [
      'It sat down at my fire and the bench broke, and it said sorry, very slowly. Then it told me its name, the one it chose. The Forge never gave it one.',
      'It wants to carry your walls. I said they are fixed to the ground. It said, for now.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'ironMarch' },
    reward: { hero: { kind: 'juggernaut', tease: 'the walker joins your company', instead: { crowns: 800, stones: 5 } }, keepsake: 'A door with a handprint the size of a shield' },
    mood: 'warm',
  },

  /* ------------------------------------------------------------ The Ledger of the Unburied: the Reaper (HERO-TALES-2) */
  {
    id: 'taleLedgerUncounted',
    title: 'The Ledger of the Unburied, I: The Uncounted',
    giver: 'sexton',
    needs: { kind: 'army', army: 'undead' },
    text: 'Win 6 waves of the Undead Legion on Hard',
    offer: [
      'Every soul buried in my yard goes in the ledger: name, date, a line about the weather. The Legion\'s dead were never written down, and that is why they will not lie still.',
      'Someone sits in the yard at night with a lantern and a long-handled thing I took for a rake until I looked again. Push the Legion on its harder days, and let us see what they want with it.',
    ],
    going: 'The someone sits on the lychgate with my spare ledger open on its knee. It writes a line every time one of them falls. A very neat hand.',
    done: ['It has filled four pages. It asked me for more ink, very politely, and whether the keep employs a chaplain. I said not as such.'],
    goal: { kind: 'wavesWon', n: 6, army: 'undead', tier: 1 },
    reward: { crowns: 300, stones: 3 },
    mood: 'eerie',
  },
  {
    id: 'taleLedgerBell',
    title: 'The Ledger of the Unburied, II: The Bell at Midnight',
    giver: 'sexton',
    needs: { kind: 'army', army: 'undead' },
    after: 'taleLedgerUncounted',
    text: "Fell 60 of the Undead Legion's foes",
    offer: [
      'My visitor says the Legion keeps a roll of its own, and every name it loses it means to take back from the living. Starting with mine, as it happens: I am the one with the ledger.',
      'Put sixty of them down, wherever you meet the Legion, and the roll will be short enough to argue with.',
    ],
    going: 'The chapel bell rang itself at midnight. My visitor stopped it with one finger and told it to wait its turn.',
    done: ['Sixty more lines in the ledger, and sixty lines about the weather. My visitor says the Legion will come for the book itself now, on the night the bell rings thirteen.'],
    goal: { kind: 'kills', n: 60, ofArmy: 'undead' },
    reward: { crowns: 350, chest: 'bronze' },
    mood: 'mysterious',
  },
  {
    id: 'taleLedgerThirteen',
    title: 'The Ledger of the Unburied, III: The Thirteenth Bell',
    giver: 'sexton',
    needs: { kind: 'army', army: 'undead' },
    after: 'taleLedgerBell',
    text: 'Win the quest battle The Thirteenth Bell (a hero of yours must fight)',
    offer: [
      'Tonight the bell rings thirteen. The Legion is coming to the yard for the ledger, and my visitor means to stand at the gate with it.',
      'I would stand there too, but I am seventy-three and I have a cough. Would you mind awfully?',
    ],
    going: 'My visitor has whetted the blade and closed the ledger on a ribbon. I have put the kettle on, which is what I can do.',
    done: [
      'The yard is quiet. Every grave has its name, and the Legion\'s lot have theirs. My visitor tucked the ledger under one arm and asked, rather shyly, whether your keep keeps a roll.',
      'I said it does now. Then it told me its name, and I wrote it in the front, in my best hand.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'thirteenthBell' },
    reward: { hero: { kind: 'reaper', tease: 'the visitor joins your company', instead: { crowns: 600, stones: 5 } }, keepsake: 'A ledger, its last line left blank' },
    mood: 'warm',
  },

  /* ------------------------------------------------------------ The Pawned Blade: the Demon Swordsman (HERO-TALES-2) */
  {
    id: 'talePawnTicket',
    title: 'The Pawned Blade, I: Ticket Thirteen',
    giver: 'pawnbroker',
    needs: { kind: 'army', army: 'infernal' },
    text: 'Win 6 waves of the Infernal Host on Hard',
    offer: [
      'A man came into my shop at midnight and pawned a sword. Black, warm to the touch, and it hummed when I put it on the shelf. He said he would be back for it once he had paid off his old employers.',
      'His old employers are the Infernal Host, and I do not think they take instalments. Push them back on their harder days, so he can get a word in.',
    ],
    going: "The sword has eaten a candle, two moths and a corner of the counter. I have written 'NOT FOR SALE' on its ticket and moved the cat.",
    done: ['He came in this morning with the money, all of it, in coins that were still warm. He says the Host will not be paid off. They want the blade back, and him with it.'],
    goal: { kind: 'wavesWon', n: 6, army: 'infernal', tier: 1 },
    reward: { crowns: 500, stones: 3 },
    mood: 'funny',
  },
  {
    id: 'talePawnCollectors',
    title: 'The Pawned Blade, II: The Debt Collectors',
    giver: 'pawnbroker',
    needs: { kind: 'army', army: 'infernal' },
    after: 'talePawnTicket',
    text: 'Win the quest battle The Debt Collectors (a hero of yours must fight)',
    offer: [
      'The collectors are coming up Lantern Row tonight with a cart, a ledger and a great deal of fire. My customer says he would rather they did not burn my shop down on his account.',
      'I would rather that too. Will you stand in the street with him?',
    ],
    going: 'He has redeemed his sword. It stopped humming the moment he picked it up, like a dog that knows whose it is.',
    done: [
      'The collectors have gone home with nothing but scorch marks. My customer paid me interest I never asked for, then asked where a sword like his might find honest work.',
      'I told him the keep pays on time. He laughed for a long while, and then he told me his name.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'debtCollectors' },
    reward: { hero: { kind: 'demonSwordsman', tease: 'the customer joins your company', instead: { crowns: 800, stones: 5 } }, keepsake: 'Pawn ticket number thirteen, redeemed' },
    mood: 'heroic',
  },

  /* ------------------------------------------------------------ The Banner in the Mist: the Samurai Commander (HERO-TALES-2) */
  {
    id: 'taleBannerLanterns',
    title: 'The Banner in the Mist, I: Lanterns on the Road',
    giver: 'lantern',
    needs: { kind: 'army', army: 'yokai' },
    text: 'Win 5 waves of the Yokai Night Parade on Elite',
    offer: [
      'I sell lanterns on the shrine road. Lately they go out by themselves, one after another, all the way up to a banner planted in the mist.',
      'Someone stands under that banner every night and does not move. The Night Parade walks round them, very carefully. Walk the Parade on its fiercest nights, and let us see what is holding the road.',
    ],
    going: 'I left a lit lantern at the foot of the banner. In the morning it was still burning, and someone had trimmed the wick.',
    done: ["The Parade is thinner, and the mist with it. The one under the banner bowed to me this morning: a soldier's bow, very correct. Then the crows came, and the soldier turned to face them."],
    goal: { kind: 'wavesWon', n: 5, army: 'yokai', tier: 2 },
    reward: { crowns: 600, stones: 4 },
    mood: 'mysterious',
  },
  {
    id: 'taleBannerCrows',
    title: "The Banner in the Mist, II: The Crows' Tally",
    giver: 'lantern',
    needs: { kind: 'army', army: 'yokai' },
    after: 'taleBannerLanterns',
    text: 'Fell 30 crow tengu and crow seers',
    offer: [
      'The crows of the Parade keep a tally of everyone who holds a road against them, and come for them one by one. The soldier says they have been coming for a very long time.',
      'Thin the crows wherever they fly, and the tally gets shorter.',
    ],
    going: 'Black feathers on the shrine steps every morning. The soldier sweeps them up and says not one word about it.',
    done: ['The crows have gone quiet. The soldier says that is worse: it means the Fox has been told, and the Fox will lead the whole Parade up the road on the night of a hundred lanterns.'],
    goal: { kind: 'kills', n: 30, foes: ['yokaiCrow', 'yokaiSeer'] },
    reward: { crowns: 600, chest: 'silver' },
    mood: 'eerie',
  },
  {
    id: 'taleBannerNight',
    title: 'The Banner in the Mist, III: A Hundred Lanterns',
    giver: 'lantern',
    needs: { kind: 'army', army: 'yokai' },
    after: 'taleBannerCrows',
    text: 'Win the quest battle A Hundred Lanterns (a hero of yours must fight)',
    offer: [
      'Tonight I am lighting every lantern I own, all hundred, all the way up to the banner. The soldier says the Parade will come up the road to put them out.',
      'The soldier asked me to ask you, and then bowed again, lower. I think it is the most anyone has asked of anyone in a long time.',
    ],
    going: 'A hundred lanterns lit. The soldier has tied the banner on tight and is standing very still.',
    done: [
      'Every lantern was still burning at dawn. The soldier pulled the banner up out of the mud and said the road was held, and the holding done.',
      'Then the soldier asked whether your keep has a gate that wants holding. I said it has several. The soldier gave me a name, and asked me to sell no more lanterns to foxes.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'hundredLanterns' },
    reward: { hero: { kind: 'samuraiCommander', tease: 'the soldier joins your company', instead: { crowns: 900, stones: 6 } }, keepsake: 'A paper lantern that never quite goes out' },
    mood: 'heroic',
  },

  /* ------------------------------------------------------------ The Second Throne: the Tyrant (HERO-TALES-2) */
  {
    id: 'taleThroneSummons',
    title: 'The Second Throne, I: A Summons',
    giver: 'herald',
    needs: { kind: 'all', of: [{ kind: 'mode', mode: 'tower' }, { kind: 'armies', n: 6 }] },
    text: 'Reach wave 30 of the Last Stand',
    offer: [
      'Ahem. There is a second throne in the throne room. Nobody carried it in. It was simply there on Tuesday, with someone sitting on it, passing sentence on the foes as they come through the breach.',
      "Sentences such as 'guilty' and 'very guilty'. Hold the Last Stand long enough for the court to sit in full session, would you?",
    ],
    going: "The occupant of the second throne has asked to be announced. I asked for a name. The answer was 'in due course'.",
    done: ['Thirty waves, and the court is impressed. The occupant says the defence was competent but untidy, and has issued a summons to every foe that got through.'],
    goal: { kind: 'standWave', n: 30 },
    reward: { crowns: 600, stones: 4 },
    mood: 'funny',
  },
  {
    id: 'taleThroneContempt',
    title: 'The Second Throne, II: Contempt of Court',
    giver: 'herald',
    needs: { kind: 'all', of: [{ kind: 'mode', mode: 'tower' }, { kind: 'armies', n: 6 }] },
    after: 'taleThroneSummons',
    text: "Hold the line at an act's end 3 times",
    offer: [
      'The occupant says the keep keeps running for the stairs at the end of every act, which is contempt of court. Hold the line instead.',
      'Three times, and the matter is closed. It was said in a voice that closes most matters.',
    ],
    going: 'I have been made to read out the charges against the Orc Warband. It took the whole afternoon.',
    done: ['The line was held and the court is satisfied. Now everyone it sentenced has appealed, all together, by coming back with an army. The occupant says this is unheard of, and also exactly what was expected.'],
    goal: { kind: 'holdLine', n: 3 },
    reward: { crowns: 700, chest: 'silver' },
    mood: 'funny',
  },
  {
    id: 'taleThroneAppeal',
    title: 'The Second Throne, III: The Appeal',
    giver: 'herald',
    needs: { kind: 'all', of: [{ kind: 'mode', mode: 'tower' }, { kind: 'armies', n: 6 }] },
    after: 'taleThroneContempt',
    text: 'Win the quest battle The Appeal (a hero of yours must fight)',
    offer: [
      'The appeal is heard tonight, in the throne room. The occupant will sit, the appellants will come through the breach, I am to announce them, and you are to stand in between.',
      "I am asked to put it exactly so: 'the keep is summoned to give evidence'.",
    ],
    going: 'The second throne has been polished. I did not know a throne could be polished that menacingly.',
    done: [
      'Appeal dismissed. The occupant stood up at last, and said the keep had given its evidence well. Then came a name, and an order to announce it.',
      'I did. It echoed for some time.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'theAppeal' },
    reward: { hero: { kind: 'tyrant', tease: 'the one on the second throne joins your company', instead: { crowns: 1000, stones: 6 } }, keepsake: 'A gavel, very heavy' },
    mood: 'heroic',
  },

  /* ------------------------------------------------------------ Yesterday's Visitor: the Time Witch (HERO-TALES-2) */
  {
    id: 'taleClockStopped',
    title: "Yesterday's Visitor, I: The Stopped Clocks",
    giver: 'clock',
    needs: { kind: 'mode', mode: 'calamity' },
    text: 'Fell 2 Calamity guardians on the fourth map or a later one',
    offer: [
      'Every clock in my shop stopped at a quarter past three this morning. Then a lady came in, thanked me for mending her watch, and left. I have not mended her watch. I have never seen her watch.',
      "She said she would be back yesterday. She also said the Calamity's guardians have been eating the hours, and could someone see to the deep ones, please.",
    ],
    going: 'The clocks have started again, but backwards, and only the cuckoo seems to mind.',
    done: ['The guardians are down and the clocks run forwards, mostly. The lady came in this morning and paid for a repair I have not done yet. She says the thing that eats hours has noticed her, and is coming to the shop.'],
    goal: { kind: 'calGuardian', n: 2, map: 4 },
    reward: { crowns: 700, stones: 4 },
    mood: 'mysterious',
  },
  {
    id: 'taleClockHour',
    title: "Yesterday's Visitor, II: The Hour Out of Place",
    giver: 'clock',
    needs: { kind: 'mode', mode: 'calamity' },
    after: 'taleClockStopped',
    text: 'Win the quest battle The Hour Out of Place (a hero of yours must fight)',
    offer: [
      'It comes tonight at a quarter past three, which in my shop is now every hour. The lady says she has fought it before, or will have, and lost, or will not have, depending on you.',
      'I have stopped trying to follow it. Please just be there at a quarter past three.',
    ],
    going: 'She has set every clock in the shop to a different time. She says it confuses the thing. It certainly confuses me.',
    done: [
      'Every clock in the shop struck the right hour at once, and then politely carried on. The lady has mended my watch, which I did not know was broken.',
      'She told me her name, and said she has very much enjoyed working for your keep, and will again. I said, you mean you will enjoy it. She said that too.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'hourOutOfPlace' },
    reward: { hero: { kind: 'timeWitch', tease: 'the visitor from yesterday joins your company', instead: { crowns: 1000, stones: 6 } }, keepsake: 'A pocket watch that runs a minute early, on purpose' },
    mood: 'heroic',
  },

  /* ------------------------------------------------------------ The Scorched Eyrie: the Queen Dragoon (HERO-TALES-2) */
  {
    id: 'taleEyrieAsh',
    title: 'The Scorched Eyrie, I: Feathers and Ash',
    giver: 'falconer',
    needs: { kind: 'ascension', n: 1 },
    text: 'Clear a Calamity whole twice',
    offer: [
      'My hawks will not fly. There is smoke on the high crags above the keep, and every morning I find scales on the mews roof the size of my hand.',
      "Something is nesting up there that the birds are afraid of, and the Calamity's rift keeps stirring it. Close the rift a couple of times and let the crags settle.",
    ],
    going: 'A shadow went over the mews at noon, very big and very low. The hawks bowed. I did not know hawks could bow.',
    done: ['The rift is quiet and the smoke has thinned. There is a rider up on the crags with the thing in the nest. She waved to me, and I waved back. Then the ogres came up the mountain with nets.'],
    goal: { kind: 'calClear', n: 2 },
    reward: { crowns: 800, stones: 5 },
    mood: 'mysterious',
  },
  {
    id: 'taleEyrieNets',
    title: 'The Scorched Eyrie, II: The Net-Men',
    giver: 'falconer',
    needs: { kind: 'ascension', n: 1 },
    after: 'taleEyrieAsh',
    text: "Fell 40 of the Ogre Clans' foes",
    offer: [
      'The Ogre Clans hunt anything with wings. They sell the scales and keep the claws, and they have heard there is a nest on my crags.',
      'Fell forty of them, wherever they march, and the rest might think twice before they climb.',
    ],
    going: 'Nets on the lower crag. I cut three loose. The rider cut the rest, from the air, without once landing.',
    done: ['The clans are thinner, but their chief is coming up himself, with the big nets and the bigger club. The rider says she will not leave the nest. I say she will not have to.'],
    goal: { kind: 'kills', n: 40, ofArmy: 'ogres' },
    reward: { crowns: 700, chest: 'gold' },
    mood: 'heroic',
  },
  {
    id: 'taleEyrieNest',
    title: 'The Scorched Eyrie, III: The Nest',
    giver: 'falconer',
    needs: { kind: 'ascension', n: 1 },
    after: 'taleEyrieNets',
    text: 'Win the quest battle The Scorched Eyrie (a hero of yours must fight)',
    offer: [
      'The chief of the net-men climbs tonight. The rider and her beast will hold the nest, but there are two eggs in it and only one of her.',
      'Go up the crags. Take a cloak: it is cold up there, until it very suddenly is not.',
    ],
    going: 'Fire on the crags all night, in short bursts, like a smith at the bellows. My hawks are back on their perches and very pleased with themselves.',
    done: [
      'The net-men are off the mountain and the nest is safe. The rider came down to the mews with soot on her circlet, which I had not noticed was gold.',
      "She says two eggs make a family, and a family wants a keep. She told me her name, and her beast's, which I cannot pronounce.",
    ],
    goal: { kind: 'battle', n: 1, battle: 'scorchedEyrie' },
    reward: { hero: { kind: 'dragoon', tease: 'the rider on the crags joins your company', instead: { crowns: 1200, stones: 7 } }, keepsake: 'A scale the size of a hand, still warm' },
    mood: 'warm',
  },

  /* ------------------------------------------------------------ The Fallen Star: the Great Sage (HERO-TALES-2) */
  {
    id: 'taleStarMargins',
    title: 'The Fallen Star, I: Notes in the Margin',
    giver: 'archivist',
    needs: { kind: 'bestiary', share: 0.35 },
    text: "Fell 30 of the Labyrinth's foes",
    offer: [
      'Someone has been writing in the margins of my bestiary. Neat little notes, all correct, and one wrong number put right in every entry, in ink that glows faintly after dark.',
      'The last note says a star fell into the Labyrinth and the gorgons are staring at it, which is bad for the gorgons and worse for the star. Clear a path through, would you?',
    ],
    going: "A new note this morning, on the Minotaur's page: 'Larger than described. Also sadder.' I have underlined it.",
    done: ['There is a path, and the note-writer has stopped hiding: a quiet man who sits on the roof all night counting stars. He says the missing one did not stay in the Labyrinth. It rolled on into the crystal caves, and it has woken up.'],
    goal: { kind: 'kills', n: 30, ofArmy: 'labyrinth' },
    reward: { crowns: 500, stones: 3 },
    mood: 'mysterious',
  },
  {
    id: 'taleStarCaves',
    title: 'The Fallen Star, II: The Crystal Moths',
    giver: 'archivist',
    needs: { kind: 'bestiary', share: 0.35 },
    after: 'taleStarMargins',
    text: 'Fell 20 crystal golems',
    offer: [
      'The crystal golems have been walking to the caves from all over the Forge, the way moths walk to a lamp. The star-counter says they are building something round it.',
      'Fell twenty of them, so that whatever they are building stays small.',
    ],
    going: 'He has drawn me a map of the sky with a gap in it, and a map of the caves with a light in it. They are the same shape.',
    done: ['The golems have stopped coming. What they built is already standing: a colossus of sapphire, with the star for a heart. The star-counter says it wants to go home, and will step on everything between here and the sky to get there.'],
    goal: { kind: 'kills', n: 20, foes: ['crystalGolem'] },
    reward: { crowns: 600, chest: 'silver' },
    mood: 'eerie',
  },
  {
    id: 'taleStarHome',
    title: 'The Fallen Star, III: The Way Home',
    giver: 'archivist',
    needs: { kind: 'bestiary', share: 0.35 },
    after: 'taleStarCaves',
    text: 'Win the quest battle The Star-Hearted (a hero of yours must fight)',
    offer: [
      'Tonight the colossus starts to climb. The star-counter means to put the star back where it belongs, which means reaching its heart, which means getting past the rest of it.',
      'He has done the sums. He says they work out, with you in them.',
    ],
    going: 'He has his chart, a ladder and a very long pole. I have not asked what the pole is for.',
    done: [
      'The colossus fell, and the star went up out of it like a spark from a fire and settled back into its gap. The star-counter wept a little, and then corrected my bestiary in four places.',
      'He says the whole sky is a bestiary, if you look, and he would like to look from your keep. He told me his name, and I have written it in the front, with the other careful readers.',
    ],
    goal: { kind: 'battle', n: 1, battle: 'starHearted' },
    reward: { hero: { kind: 'sage', tease: 'the star-counter joins your company', instead: { crowns: 900, stones: 6 } }, keepsake: 'A star chart with every gap filled in' },
    mood: 'warm',
  },
];
