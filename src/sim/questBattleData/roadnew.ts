// The quest battles of the new road quests and the Calamity's campaign (QUESTS-3, `docs/notes/quests-design.md` section 6): the pilgrim's
// escort (a guest to protect), the cart in the river (hold out until the clock runs down), the flood on the causeway (a race) and
// "What Waits Under" (a rift-born boss, with no hearts to spend). Their rules are in `../questRules.ts`; the shapes, the helpers and
// the voice are `../questBattleData.ts`'s. Pure data.

import { close, say, shoot, tell, wide } from '../sceneKit';
import type { QuestBattle } from '../questBattles';
import { card, foe, giver, hero, story } from '../questBattleData';

export const ROADNEW_BATTLES: readonly QuestBattle[] = [
  {
    id: 'pilgrimEscort',
    title: "The Pilgrim's Escort",
    blurb: 'Kwame (or Minh) walks a humming pilgrim down the shrine road, through three waves of the Wildwood.',
    land: 'forest',
    like: { army: 'wildwood', wave: 10 },
    ease: 0.7,
    cast: [{ heroes: ['knight', 'peasant'] }],
    rules: { protect: { kind: 'guestPilgrim', hp: 1.5 } },
    waves: [
      { foes: ['groveSatyr1', 'groveSatyr2', 'groveSatyr1'] },
      { foes: ['groveSatyr2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2'] },
      { foes: ['forestBoss1', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3'], boss: 'final' },
    ],
    boss: { name: 'The Hollow Warden', title: 'Who Dislikes Sandals' },
    before: (c) =>
      story('pilgrimEscort', "The Pilgrim's Escort", 'forest', { pilgrim: giver('pilgrim', 'The pilgrim'), walker: hero('wanderer', 200, { name: 'The Pilgrim' }), a: hero(c[0] ?? 'knight', 236), warden: foe('forestBoss1', 420, 1.3, { name: 'The Hollow Warden', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), rays: true, caption: 'The shrine road, through the Wildwood', lines: [say('pilgrim', 'It is only three small groves. They merely have views about who walks them.')] },
        { cam: close('walker'), ...shoot('close', 'walker', 'pushIn'), lines: [say('walker', 'I shall hum. Do not mind the humming. It is how I keep the road in a good mood.')] },
        { cam: close('a'), ...shoot('ots', 'a'), lines: [say('a', 'Stay behind me. If anything lunges, hum louder.')] },
        { cam: wide(420, 205), ...shoot('low', 'warden', 'pushIn', 'smash'), acts: [{ who: 'warden', enter: 420, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], title: card('The Hollow Warden', 'Who Dislikes Sandals'), lines: [say('warden', 'Sandals. On *my* road.', 'shout')] },
      ]),
    after: (c) =>
      story('pilgrimEscortAfter', "The Pilgrim's Escort", 'forest', { walker: hero('wanderer', 200, { name: 'The Pilgrim' }), a: hero(c[0] ?? 'knight', 250) }, [
        { cam: close('walker'), ...shoot('close', 'walker', 'pushIn'), lines: [say('walker', 'Not a scratch on the sandals. I shall tell the shrine you were very tall.')] },
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pullOut', 'dissolve'), rays: true, hold: 1.3, lines: [tell('The humming goes on down the road, a little off the note, and entirely content.')] },
      ]),
  },
  {
    id: 'cartInRiver',
    title: 'A Cart in the River',
    blurb: 'Hold the old ford for ninety seconds while the Crown\'s mail cart is hauled out of the water.',
    land: 'swamp',
    like: { army: 'labyrinth', wave: 9 },
    ease: 1.91,
    cast: [{ heroes: ['samurai', 'kunoichi'] }],
    rules: { survive: 90 },
    waves: [{ foes: ['mazeMino1', 'mazeGorgon1', 'mazeMino2', 'mazeGorgon2', 'mazeMino1', 'mazeMino3'] }],
    before: (c) =>
      story('cartInRiver', 'A Cart in the River', 'swamp', { messenger: giver('messenger', 'The messenger'), a: hero(c[0] ?? 'samurai', 236), mino: foe('mazeMino3', 420, 1.2, { hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), weather: 'rain', caption: 'The old ford', lines: [say('messenger', 'Eleven sacks of letters, one horse, and a cart that has taken to the river like a duck. They are hauling it out. It takes ninety seconds.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), weather: 'rain', lines: [say('a', 'And what is in the way of the ninety seconds?')] },
        { cam: wide(420, 205), ...shoot('low', 'mino', 'pushIn', 'smash'), weather: 'rain', acts: [{ who: 'mino', enter: 420, from: 'right' }], cue: 'steps', lines: [say('messenger', 'The locals. They have noticed the letters. They have *views* on the post.')] },
      ]),
    after: (c) =>
      story('cartInRiverAfter', 'A Cart in the River', 'swamp', { messenger: giver('messenger', 'The messenger'), a: hero(c[0] ?? 'samurai', 250) }, [
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'Out. The sacks are wet and the horse is furious. Everyone is fine.')] },
        { cam: wide(280, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), hold: 1.3, lines: [say('messenger', 'Mostly bills, in any case. Nobody will miss the damp ones.')] },
      ]),
  },
  {
    id: 'longWayFlood',
    title: 'The Flood on the Causeway',
    blurb: 'The river is rising over the old causeway. Clear every wave before the water takes the road.',
    land: 'swamp',
    like: { army: 'undead', wave: 11 },
    ease: 4.29,
    cast: [{ heroes: ['archer', 'wizard'] }],
    rules: { race: 25 },
    waves: [
      { foes: ['skeleton', 'spearman', 'boneVolley', 'skeleton'] },
      { foes: ['boneCaptain', 'skeleton', 'spearman', 'boneVolley'], boss: 'final' },
    ],
    boss: { name: 'The Drowned Toll-Keeper', title: 'Who Charges by the Foot' },
    before: (c) =>
      story('longWayFlood', 'The Flood on the Causeway', 'swamp', { pilgrim: giver('pilgrim', 'The pilgrim'), a: hero(c[0] ?? 'archer', 236), keeper: foe('boneCaptain', 420, 1.3, { name: 'The Drowned Toll-Keeper', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), weather: 'rain', caption: 'The old causeway', lines: [say('pilgrim', 'The water is up to the second stone. It was at the first stone when we started talking.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), weather: 'rain', lines: [say('a', 'Then we do not talk. We go.')] },
        { cam: wide(420, 205), ...shoot('low', 'keeper', 'pushIn', 'smash'), weather: 'rain', acts: [{ who: 'keeper', enter: 420, from: 'right' }], cue: 'boom', title: card('The Drowned Toll-Keeper', 'Who Charges by the Foot'), lines: [say('keeper', 'A toll. Per foot. The water is *already* charging for yours.', 'shout')] },
      ]),
    after: (c) =>
      story('longWayFloodAfter', 'The Flood on the Causeway', 'swamp', { pilgrim: giver('pilgrim', 'The pilgrim'), a: hero(c[0] ?? 'archer', 250) }, [
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'Dry boots, for the moment. Run.')] },
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pullOut', 'dissolve'), hold: 1.3, lines: [tell('Behind them, the causeway slips under the brown water like a card into a deck.')] },
      ]),
  },
  {
    id: 'whatWaitsUnder',
    title: 'What Waits Under',
    blurb: 'It has climbed out of the sixth door and stands in the world. There are no lives to spend.',
    land: 'crystal',
    like: { army: 'golems', wave: 15 },
    ease: 1.1,
    cast: [{ heroes: ['knight', 'juggernaut', 'paladin'] }, { heroes: ['wizard', 'sage', 'warlock'] }],
    rules: { noHearts: true, hasten: 0.1 },
    waves: [
      { foes: ['imp', 'demon', 'imp', 'demon'] },
      { foes: ['skeleton', 'spearman', 'boneArcher', 'spearman', 'orcBrute'] },
      { foes: ['demonLord', 'orcBrute', 'orcGrunt', 'orcBrute', 'orcArcher'], boss: 'final' },
    ],
    boss: { name: 'What Waits Under', title: 'Born of Every Door' },
    before: (c) =>
      story('whatWaitsUnder', 'What Waits Under', 'crystal', { rift: giver('rift', 'The voice in the rift'), a: hero(c[0] ?? 'knight', 230), b: hero(c[1] ?? 'wizard', 196), thing: foe('calBoss6', 420, 1.4, { name: 'What Waits Under', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'The floor under the floors', lines: [say('rift', 'it is out. it is standing in the world with the shape of every door you broke.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), fx: ['darken'], lines: [say('a', 'And the way back?')] },
        { cam: close('b'), ...shoot('ots', 'b'), fx: ['darken'], lines: [say('b', 'There is only forward. I checked. Twice.')] },
        { cam: wide(420, 205), ...shoot('low', 'thing', 'pushIn', 'smash'), acts: [{ who: 'thing', enter: 420, from: 'right' }], cue: 'earthRumble', fx: ['rumble', 'darken'], title: card('What Waits Under', 'Born of Every Door'), lines: [say('thing', 'You counted the doors. I am what was left over.', 'shout')] },
      ]),
    after: (c) =>
      story('whatWaitsUnderAfter', 'What Waits Under', 'crystal', { rift: giver('rift', 'The voice in the rift'), a: hero(c[0] ?? 'knight', 250) }, [
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'It came apart like a house of doors.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), fx: ['glow'], hold: 1.4, lines: [say('rift', 'quiet now. i did not know it could be this quiet. thank you.')] },
      ]),
  },
];
