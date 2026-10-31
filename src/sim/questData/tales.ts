// The hero quests (SECRET-HEROES, the owner's ask: "let's add some quests in which a hero comes from"): three tales, each told by its
// own giver by the tavern's fire, two or three parts long, ending in a quest battle of its own (`../taleBattleData.ts`) and a secret
// hero joining at the hand-in. Until then the hero is only "the stranger": no part names them, and the reward reads as the tease.
//
// - **The Thing at the Fold** (Old Maud, a shepherd): opens with the Beast Packs cleared, where the Werewolf used to be earned. Vuk.
// - **A Sellsword in Chains** (Brannock, the turnkey): opens with the Last Stand open and three armies cleared; the Dread Pirate used to
//   come at wave 20 of the Last Stand, and the tale asks for wave 10 of it. Harrow.
// - **The Iron Pilgrim** (Edda Coalbrook, a forge-hand): opens with the Golem Forge cleared, and asks for its waves on Hard, as the
//   Juggernaut's old milestone did. Kerem.
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
];
