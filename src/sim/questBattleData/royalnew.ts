// The quest battles of the Crown's campaigns (QUESTS-3, `docs/notes/quests-design.md` section 6): five fights, each opened by a part of a Royal
// charge in `../questData/royalnew.ts`. They are the first to carry the new rules: the border fort's survive, the bandits' and the usurper's
// race, the standard's and the envoy's protect, and the bewitched guard's spare. Each is one or two waves with a cast of one hero from the
// starter packs' reach. The voice is the cinematics' own. Pure data (`../questBattles.ts` has the shape).

import { close, say, shoot, tell, wide } from '../sceneKit';
import type { QuestBattle } from '../questBattles';
import { card, foe, giver, hero, story } from '../questBattleData';

const CROWN = () => giver('ruler', 'The Crown');

export const ROYALNEW_BATTLES: readonly QuestBattle[] = [
  {
    id: 'borderFort',
    title: 'The Fort at the Edge',
    blurb: 'Kwame holds the old border fort until the last stone is set.',
    land: 'highlands',
    like: { army: 'undead', wave: 12 },
    ease: 0.8,
    cast: [{ heroes: ['knight'] }],
    rules: { survive: 75 },
    waves: [{ foes: ['skeleton', 'spearman', 'boneVolley', 'skeleton', 'spearman', 'boneVolley', 'skeleton'] }],
    before: () =>
      story('borderFort', 'The Fort at the Edge', 'highlands', { crown: CROWN(), kwame: hero('knight', 236) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'The old fort at the edge of the map', lines: [say('crown', 'The last stone is on its cart. The cart is behind you. The dead are in front of you. Hold the walls until it is set.')] },
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'Until the stone is set. I have held longer for less.')] },
        { cam: wide(330, 205), ...shoot('low', undefined, 'pushIn', 'smash'), cue: 'boom', fx: ['shake'], lines: [tell('Somewhere behind, a surveyor begins, very carefully, to dig.')] },
      ]),
    after: () =>
      story('borderFortAfter', 'The Fort at the Edge', 'highlands', { kwame: hero('knight', 260) }, [
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'The stone is in. The surveyor wants us to stand still while he draws it. Slowly.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), hold: 1.2, lines: [tell('The map has an edge now. The edge has a fort. The fort has Kwame.')] },
      ]),
  },
  {
    id: 'taxToll',
    title: 'The Bandit Toll',
    blurb: 'Natsu breaks the gang that has put its own toll on the plains road.',
    land: 'plains',
    like: { army: 'orcs', wave: 12 },
    ease: 0.7,
    boss: { name: 'The Toll-Master', title: 'Collector of the Plains Road' },
    cast: [{ heroes: ['archer'] }],
    rules: { race: 100 },
    waves: [{ foes: ['orcChieftain', 'orcGrunt', 'orcArcher', 'orcGrunt', 'orcBrute'], boss: 'final' }],
    before: () =>
      story('taxToll', 'The Bandit Toll', 'plains', { crown: CROWN(), natsu: hero('archer', 236), master: foe('orcChieftain', 420, 1.3, { name: 'The Toll-Master', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'The plains road', lines: [say('crown', 'They charge a toll, and give a receipt. The receipts are the insult. They are very good receipts.')] },
        { cam: close('natsu'), ...shoot('close', 'natsu', 'pushIn'), lines: [say('natsu', 'Quick, then. The wagons are waiting and the longer we take, the more the toll looks like law.')] },
        { cam: wide(420, 205), ...shoot('low', 'master', 'pushIn', 'smash'), acts: [{ who: 'master', enter: 420, from: 'right' }], cue: 'slam', title: card('The Toll-Master', 'Collector of the Plains Road'), lines: [say('master', 'Receipts are *free*. The toll is merely very, very high.', 'shout')] },
      ]),
    after: () =>
      story('taxTollAfter', 'The Bandit Toll', 'plains', { natsu: hero('archer', 260) }, [
        { cam: close('natsu'), ...shoot('close', 'natsu', 'pushIn'), lines: [say('natsu', 'Their ledger is in better order than the keep\'s. I am not telling the treasurer.')] },
        { cam: wide(250, 205), ...shoot('wide', undefined, 'pullOut', 'dissolve'), hold: 1.2, lines: [tell('The wagons roll on. The driver finishes the apple.')] },
      ]),
  },
  {
    id: 'winterStandard',
    title: 'The Standard in the Snow',
    blurb: 'Kwame keeps the muster standard standing on the high green while the realm watches.',
    land: 'snow',
    like: { army: 'beasts', wave: 13 },
    ease: 1.0,
    boss: { name: 'The Winter Alpha', title: 'Who Came Down With the First Snow' },
    cast: [{ heroes: ['knight'] }],
    rules: { protect: { kind: 'standard', hp: 6 } },
    waves: [
      { foes: ['packWhite', 'packWhite', 'packBlack', 'packWhite'] },
      { foes: ['alphaWolf', 'packWhite', 'packRed', 'packBlack', 'packWhite'], boss: 'final' },
    ],
    before: () =>
      story('winterStandard', 'The Standard in the Snow', 'snow', { crown: CROWN(), kwame: hero('knight', 236), alpha: foe('alphaWolf', 420, 1.3, { name: 'The Winter Alpha', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'The high green, under the first snow', lines: [say('crown', 'The whole realm is on the hill to watch the standard go up. Do not let it come down.')] },
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'I shall stand where the wind is worst. The standard stands where I am.')] },
        { cam: wide(420, 205), ...shoot('low', 'alpha', 'pushIn', 'smash'), acts: [{ who: 'alpha', enter: 420, from: 'right' }], cue: 'eliteSting', title: card('The Winter Alpha', 'Who Came Down With the First Snow'), hold: 1.2 },
      ]),
    after: () =>
      story('winterStandardAfter', 'The Standard in the Snow', 'snow', { kwame: hero('knight', 260) }, [
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'Still flying. The crowd is cheering, and I think some of it is for the flag.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), hold: 1.2, lines: [tell('Down the hill, a thousand lanterns come up to meet it.')] },
      ]),
  },
  {
    id: 'embassyRoad',
    title: 'The Envoy on the Road',
    blurb: 'Kwame brings the far kingdoms\' envoy through a road of raiders, with her still alive.',
    land: 'autumn',
    like: { army: 'ogres', wave: 8 },
    ease: 0.6,
    cast: [{ heroes: ['knight'] }],
    rules: { protect: { kind: 'guestEnvoy' } },
    waves: [
      { foes: ['clanBrute', 'clanOgre', 'clanBrute'] },
      { foes: ['clanOgre', 'clanBrute', 'clanOgre', 'clanBrute'] },
    ],
    before: () =>
      story('embassyRoad', 'The Envoy on the Road', 'autumn', { crown: CROWN(), kwame: hero('knight', 236) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'The autumn road', lines: [say('crown', 'She walks with dignity. Dignity is not armour. Be armour.')] },
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'Stay behind me, my lady. And mind the leaves; they are wet.')] },
        { cam: wide(420, 205), ...shoot('low', undefined, 'pushIn', 'smash'), cue: 'boom', fx: ['shake'], lines: [tell('The envoy raises an eyebrow. The ogres, noticing, lower theirs.')] },
      ]),
    after: () =>
      story('embassyRoadAfter', 'The Envoy on the Road', 'autumn', { kwame: hero('knight', 260) }, [
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'She is unhurt, she says, and wishes it noted that she did not run.')] },
        { cam: wide(250, 205), ...shoot('wide', undefined, 'drift', 'dissolve'), hold: 1.2, lines: [tell('Behind them, the road is rather less ogre than it was.')] },
      ]),
  },
  {
    id: 'embassyGuard',
    title: 'The Bewitched Guard',
    blurb: 'Ayame slips past the envoy\'s bewitched guard and fells the sorcerers who hold him, sparing him.',
    land: 'temple',
    like: { army: 'ogres', wave: 11 },
    ease: 0.9,
    boss: { name: 'The Puppeteer', title: 'Who Holds the Guard\'s Strings' },
    cast: [{ heroes: ['kunoichi'] }],
    rules: { spare: 'clanBrute' },
    waves: [{ foes: ['shamanKing', 'clanBrute', 'yokaiWitch', 'yokaiWitch'], boss: 'final' }],
    before: () =>
      story('embassyGuard', 'The Bewitched Guard', 'temple', { crown: CROWN(), ayame: hero('kunoichi', 236), puppeteer: foe('shamanKing', 420, 1.3, { name: 'The Puppeteer', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'A temple courtyard, a guard with empty eyes', lines: [say('crown', 'He is the best man his captain has. He is also, at this moment, trying to kill you. Please leave him alive.')] },
        { cam: close('ayame'), ...shoot('close', 'ayame', 'pushIn'), lines: [say('ayame', 'Then I go round him. A hand on the shoulder is no harm to anyone.', 'whisper')] },
        { cam: wide(420, 205), ...shoot('low', 'puppeteer', 'pushIn', 'smash'), acts: [{ who: 'puppeteer', enter: 420, from: 'right' }], cue: 'boom', title: card('The Puppeteer', 'Who Holds the Guard\'s Strings'), lines: [say('puppeteer', 'Dance, my brute. Dance.', 'shout')] },
      ]),
    after: () =>
      story('embassyGuardAfter', 'The Bewitched Guard', 'temple', { ayame: hero('kunoichi', 260) }, [
        { cam: close('ayame'), ...shoot('close', 'ayame', 'pushIn'), lines: [say('ayame', 'Asleep, and snoring. I shall tell his captain he is merely tired.')] },
        { cam: wide(250, 205), ...shoot('wide', undefined, 'pullOut', 'dissolve'), hold: 1.2, lines: [tell('The strings lie on the floor like cut hair.')] },
      ]),
  },
  {
    id: 'usurperHall',
    title: 'The Usurper at the Door',
    blurb: 'Kenji races to break the usurper in the great hall before the doors are barred.',
    land: 'ruins',
    like: { army: 'yokai', wave: 13 },
    ease: 1.4,
    boss: { name: 'The Usurper', title: 'Who Wore the Crown for an Afternoon' },
    cast: [{ heroes: ['samurai'] }],
    rules: { race: 110 },
    waves: [{ foes: ['demonLord', 'hellDemon', 'hellImp', 'hellImp', 'hellDemon'], boss: 'final' }],
    before: () =>
      story('usurperHall', 'The Usurper at the Door', 'ruins', { crown: CROWN(), kenji: hero('samurai', 236), usurper: foe('demonLord', 420, 1.4, { name: 'The Usurper', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['darken'], caption: 'The great hall, before the doors are barred', lines: [say('crown', 'He is wearing my second crown. It does not fit. He has wedged it on with a candlestick.')] },
        { cam: close('kenji'), ...shoot('close', 'kenji', 'pushIn'), lines: [say('kenji', 'The doors close at the hour. I do not intend to be on the wrong side of them.')] },
        { cam: wide(420, 205), ...shoot('low', 'usurper', 'pushIn', 'smash'), acts: [{ who: 'usurper', enter: 420, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Usurper', 'Who Wore the Crown for an Afternoon'), lines: [say('usurper', 'Kneel to the *crown*. It is very heavy. I have decided it is mine.', 'shout')] },
      ]),
    after: () =>
      story('usurperHallAfter', 'The Usurper at the Door', 'ruins', { kenji: hero('samurai', 260) }, [
        { cam: close('kenji'), ...shoot('close', 'kenji', 'pushIn'), lines: [say('kenji', 'The crown rolled under the table. I have returned it with the candlestick still attached.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), rays: true, hold: 1.4, lines: [tell('The doors swing wide. The court comes in. Somebody has remembered the music.')] },
      ]),
  },
];
