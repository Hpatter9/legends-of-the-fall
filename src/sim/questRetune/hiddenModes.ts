// While the Last Stand and the Calamity are hidden (`hiddenModes.ts`), the hero-giving chains that ran through them are pointed at army
// runs and the dailies instead, so no hero becomes unearnable. Each entry replaces a part's needs, goal and words; its story, giver, ids,
// pay and final quest battle stay. Applied by `questData.ts` only while `modesHidden()`; with the modes back, the original goals return.
// (A Mythic's chain stays hard: Legendary and Mythic tier army goals.) Words: British spelling, no line shared with another quest.

import type { Goal, Need, QuestDef } from '../questData';
import { MYTHIC_KINDS } from '../mythicRules';

export type HiddenPatch = Partial<Pick<QuestDef, 'needs' | 'text' | 'offer' | 'going' | 'done' | 'goal'>>;

const armies = (n: number): Need => ({ kind: 'armies', n });
const tier = (t: number): Need => ({ kind: 'tier', tier: t });
const army = (a: Goal): Goal => a;

export const HIDDEN_PATCH: Readonly<Record<string, HiddenPatch>> = {
  // ---- A Sellsword in Chains (Dread Pirate): the Last Stand's waves become waves won in the field
  taleChainsWorth: {
    needs: armies(3),
    text: 'Win 20 army waves',
    offer: [
      'We fished a man out of the moat. Wet through, chained at the wrists, and swearing he is a captain.',
      'He says he will fight for his keep, if we show him the keep is worth fighting for. Win twenty waves in the field and let him tally them from the grate.',
    ],
    going: 'He tallies through the grate on a bent spoon. He is very rude about the archers.',
    goal: army({ kind: 'wavesWon', n: 20, mode: 'army' }),
  },
  taleChainsCrew: { needs: armies(3) },
  taleChainsTide: { needs: armies(3) },

  // ---- The Second Throne (Tyrant): sitting waves become boss waves and the dailies
  taleThroneSummons: {
    needs: armies(6),
    text: 'Win 3 Hard or harder army boss waves',
    offer: [
      'Ahem. There is a second throne in the throne room. Nobody carried it in. It was simply there on Tuesday, with someone sitting on it, passing sentence on the foes as they are brought in.',
      "Sentences such as 'guilty' and 'very guilty'. Bring the court three warlords on Hard or worse, so that it may sit in full session, would you?",
    ],
    going: "The occupant of the second throne has asked to be announced. I asked for a name. The answer was 'in due course'.",
    done: ['Three warlords brought low, and the court is impressed. The occupant says the prosecution was competent but untidy, and has issued a summons to every foe still at large.'],
    goal: army({ kind: 'bossDown', n: 3, mode: 'army', tier: 1 }),
  },
  taleThroneContempt: {
    needs: armies(6),
    text: 'Clear 3 daily challenges',
    offer: [
      'The occupant says the keep keeps skipping the day\'s business, which is contempt of court. Attend the daily docket instead.',
      'Three sittings, and the matter is closed. It was said in a voice that closes most matters.',
    ],
    going: 'The docket is posted each morning. The occupant has not once been seen to blink at it.',
    goal: army({ kind: 'clearDaily', n: 3 }),
  },
  taleThroneAppeal: { needs: armies(6) },

  // ---- Yesterday's Visitor (Time Witch): the deep guardians become army bosses on Hard or harder
  taleClockStopped: {
    needs: armies(5),
    text: 'Win 4 Hard or harder army boss waves',
    offer: [
      'Every clock in my shop stopped at a quarter past three this morning. Then a lady came in, thanked me for mending her watch, and left. I have not mended her watch. I have never seen her watch.',
      'She said she would be back yesterday. She also said the great warlords have been eating the hours, and could someone see to four of the hard ones, please.',
    ],
    going: 'The clocks have started again, but backwards, and only the cuckoo seems to mind.',
    done: ['The warlords are down and the clocks run forwards, mostly. The lady came in this morning and paid for a repair I have not done yet. She says the thing that eats hours has noticed her, and is coming to the shop.'],
    goal: army({ kind: 'bossDown', n: 4, mode: 'army', tier: 1 }),
  },
  taleClockHour: { needs: armies(5) },

  // ---- The Scorched Eyrie (Dragoon): a Calamity cleared becomes armies cleared on Elite
  taleEyrieAsh: {
    needs: { kind: 'all', of: [armies(6), tier(2)] },
    text: 'Clear an army on Elite or harder twice',
    offer: [
      'My hawks will not fly. There is smoke on the high crags above the keep, and every morning I find scales on the mews roof the size of my hand.',
      'Something is nesting up there that the birds are afraid of, and the hardest armies keep stirring it. Break two of them on Elite or worse and let the crags settle.',
    ],
    done: ['The armies are broken and the smoke has thinned. There is a rider up on the crags with the thing in the nest. She waved to me, and I waved back. Then the ogres came up the mountain with nets.'],
    goal: army({ kind: 'clearArmy', n: 2, tier: 2 }),
  },
  taleEyrieNets: { needs: { kind: 'all', of: [armies(6), tier(2)] } },
  taleEyrieNest: { needs: { kind: 'all', of: [armies(6), tier(2)] } },

  // ---- The Mythics: the Calamity's guardians and clears become Legendary and Mythic tier army boss waves and clears
  'mythic-astrax-trace': {
    needs: { kind: 'all', of: [armies(7), tier(3), { kind: 'level', n: 75 }] },
    text: 'Defeat 8 Legendary or harder army bosses without a Mythic',
    going: 'The sketches wait to be finished. The great warlords of the hardest armies know where that star went.',
    goal: army({ kind: 'bossDown', n: 8, mode: 'army', tier: 3, without: MYTHIC_KINDS }),
  },
  'mythic-astrax-rite': {
    needs: { kind: 'all', of: [armies(7), tier(3), { kind: 'level', n: 75 }] },
    text: 'Clear 2 armies on Legendary or harder without the whole party falling or using a Mythic',
    going: 'The lens is still clouded. Only an army broken without the whole party falling will polish it.',
    goal: army({ kind: 'clearArmy', n: 2, tier: 3, noHeart: true, without: MYTHIC_KINDS }),
  },
  'mythic-astrax-trial': { needs: { kind: 'all', of: [armies(7), tier(3), { kind: 'level', n: 75 }] } },
  'mythic-nyxara-trace': {
    needs: { kind: 'all', of: [armies(9), tier(4), { kind: 'bestiary', share: 0.75 }, { kind: 'level', n: 80 }] },
    text: 'Defeat 4 Mythic army bosses without a Mythic',
    going: 'The cracked mirror still shows three rooms. The bosses of the very hardest armies may show which one is real.',
    goal: army({ kind: 'bossDown', n: 4, mode: 'army', tier: 4, without: MYTHIC_KINDS }),
  },
  'mythic-nyxara-rite': { needs: { kind: 'all', of: [armies(9), tier(4), { kind: 'bestiary', share: 0.75 }, { kind: 'level', n: 80 }] } },
  'mythic-nyxara-trial': { needs: { kind: 'all', of: [armies(9), tier(4), { kind: 'bestiary', share: 0.75 }, { kind: 'level', n: 80 }] } },
};
