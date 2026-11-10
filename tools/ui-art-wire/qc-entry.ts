// UI-ART-WIRE: open the Quest complete card on the built page, for the screenshots (`qc-shots.mjs`): the card a quest's hand-in opens,
// with a keepsake and a hero joining among its rewards. It calls the card's own `openQuestComplete`, so the page's CSS draws it.
import { openQuestComplete } from '../../src/questComplete';
import type { CompleteView } from '../../src/questCompleteRules';

const view: CompleteView = {
  title: 'A Wheel for the Wall',
  giver: { name: 'Gwen', title: 'the tavern keeper' },
  stars: 3,
  starLine: '★★★☆☆ · Trial · Long',
  thanks: ['The wall turns again. Bless you, Majesty.'],
  recap: [
    { kind: 'goal', text: 'Win waves in the Wildwood', count: '12 of 12' },
    { kind: 'time', text: 'Done in 3 days' },
  ],
  rewards: [
    { kind: 'crowns', n: 400, text: 'crowns' },
    { kind: 'stones', n: 2, text: 'summoning stones' },
    { kind: 'keepsake', text: 'The miller’s knot, a keepsake for the trophy wall' },
    { kind: 'hero', text: 'A stranger asks to join your company' },
  ],
};
(window as unknown as { __openQc: () => void }).__openQc = () => void openQuestComplete(view, {});
