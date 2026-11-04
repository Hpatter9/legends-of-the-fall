// The quest battles of the second half of the long campaigns (QUESTS-3, `../questData/campaigns2.ts`): six fights, each opened by one part of
// a campaign. Four carry a rule of their own (a guest to keep alive, a clock to hold out, a clock to beat, no healing, hasted foes, `../questRules.ts`).
// A hold-out fight keeps a boss on its last wave too, so it can also be won the old way, by felling every foe. The voice: wry and warm, in British
// spelling. Pure data (the shapes are in `../questBattles.ts`; the helpers are the first quest battles').

import { close, say, shoot, tell, wide } from '../sceneKit';
import type { QuestBattle } from '../questBattles';
import { card, foe, giver, hero, story } from '../questBattleData';

export const CAMPAIGNS2_BATTLES: readonly QuestBattle[] = [
  {
    id: 'weddingUninvited',
    title: 'The Uninvited Guest',
    blurb: 'An ogre cousin comes to the wedding for the cake. The priest will not run.',
    land: 'autumn',
    like: { army: 'ogres', wave: 10 },
    ease: 1.15,
    cast: [{ heroes: ['knight', 'peasant'] }],
    rules: { protect: { kind: 'guestPilgrim', hp: 1.5 } },
    waves: [
      { foes: ['clanOgre', 'clanBrute', 'clanOgre'] },
      { foes: ['clanBrute', 'clanOgre', 'clanBrute', 'clanOgre'] },
      { foes: ['hornedOgre', 'clanOgre', 'clanBrute'], boss: 'final' },
    ],
    boss: { name: 'The Uninvited Guest', title: 'Cousin of the Groom' },
    before: (c) =>
      story('weddingUninvited', 'The Uninvited Guest', 'autumn', { gwen: giver('gwen', 'Gwen'), a: hero(c[0] ?? 'knight', 236), priest: hero('guestPilgrim', 196, { name: 'The Priest' }), cousin: foe('hornedOgre', 430, 1.3, { name: 'The Uninvited Guest', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), caption: 'The hill behind the keep', lines: [say('gwen', 'Forty guests, a four-tier cake, and a cousin nobody asked. I would like a word with the groom.')] },
        { cam: close('priest'), ...shoot('close', 'priest', 'pushIn'), lines: [say('priest', 'I have a sermon to finish. If a cousin comes, he may sit at the back.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'Majesty, the priest must not be harmed. I shall stand in front of him, and be rude.')] },
        { cam: wide(430, 205), ...shoot('low', 'cousin', 'pushIn', 'smash'), acts: [{ who: 'cousin', enter: 430, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], title: card('The Uninvited Guest', 'Cousin of the Groom'), lines: [say('cousin', 'Is there CAKE?', 'shout')] },
        { cam: close('priest'), ...shoot('extreme', 'priest', 'still'), lines: [say('priest', 'Dearly beloved. Please sit down.', 'whisper')] },
      ]),
    after: (c) =>
      story('weddingUninvitedAfter', 'The Uninvited Guest', 'autumn', { a: hero(c[0] ?? 'knight', 250), priest: hero('guestPilgrim', 210, { name: 'The Priest' }) }, [
        { cam: close('priest'), ...shoot('close', 'priest', 'pushIn'), lines: [say('priest', 'And where was I? Ah. Nobody here is objecting. Splendid.')] },
        { cam: wide(280, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), lines: [tell('The cousin is given a slice the size of a door. He weeps, and thanks the groom, who also weeps.')] },
      ]),
  },
  {
    id: 'marketLastStall',
    title: 'The Last Stall',
    blurb: 'Ayame holds the last stall of the Night Market until the cocks crow, against faster foxes.',
    land: 'shrine',
    like: { army: 'yokai', wave: 12 },
    ease: 1.25,
    cast: [{ heroes: ['kunoichi'] }],
    rules: { survive: 80, hasten: 0.15 },
    waves: [
      { foes: ['yokaiFox', 'yokaiCrow', 'yokaiFox'] },
      { foes: ['yokaiCrow', 'yokaiMonk', 'yokaiFox', 'yokaiWitch'] },
      { foes: ['oniKing', 'yokaiFox', 'yokaiCrow', 'yokaiWitch'], boss: 'final' },
    ],
    boss: { name: 'The Night Warden', title: 'Who Shuts the Market' },
    before: () =>
      story('marketLastStall', 'The Last Stall', 'shrine', { kiku: giver('lantern', 'Kiku'), ayame: hero('kunoichi', 232), warden: foe('oniKing', 430, 1.3, { name: 'The Night Warden', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'glow'], caption: 'The shrine road, near dawn', lines: [say('kiku', 'One stall left, one lantern lit. If it goes out before the cocks crow, the market goes with it.')] },
        { cam: close('ayame'), ...shoot('close', 'ayame', 'pushIn'), fx: ['glow'], lines: [say('ayame', 'Then it does not go out. I have kept lamps lit in worse wind than a parade.')] },
        { cam: wide(430, 205), ...shoot('low', 'warden', 'pushIn', 'smash'), acts: [{ who: 'warden', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Night Warden', 'Who Shuts the Market'), lines: [say('warden', 'CLOSING TIME.', 'shout')] },
        { cam: close('ayame'), ...shoot('extreme', 'ayame', 'still'), lines: [say('ayame', 'Not yet.', 'whisper', 0.5)] },
      ]),
    after: () =>
      story('marketLastStallAfter', 'The Last Stall', 'shrine', { ayame: hero('kunoichi', 256) }, [
        { cam: close('ayame'), ...shoot('close', 'ayame', 'pushIn'), lines: [say('ayame', 'A cock crowed. Somewhere very far off. I think it was for us.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), rays: true, lines: [tell('The Warden bows to the stall, and the stall, a little smugly, stays lit.')] },
      ]),
  },
  {
    id: 'winterCourt',
    title: "The Pale Huntsman's Court",
    blurb: 'A court of ice at the head of the long valley, where the winter is held. No healing reaches it.',
    land: 'snow',
    like: { army: 'beasts', wave: 14 },
    ease: 1.0,
    cast: [{ heroes: ['archer', 'ranger'] }],
    rules: { survive: 100, noHeal: true },
    waves: [
      { foes: ['packWhite', 'packBlack', 'packWhite'] },
      { foes: ['packWhite', 'packRed', 'packBlack', 'packWhite'] },
      { foes: ['alphaWolf', 'packWhite', 'packRed', 'packBlack'], boss: 'final' },
    ],
    boss: { name: 'The Pale Huntsman', title: 'Lord of the Long Winter' },
    before: (c) =>
      story('winterCourt', "The Pale Huntsman's Court", 'snow', { hunter: giver('hunter', 'The hunter'), a: hero(c[0] ?? 'archer', 232), lord: foe('alphaWolf', 430, 1.35, { name: 'The Pale Huntsman', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'The head of the long valley', lines: [say('hunter', 'Ice halls, ice thrones, and a hunt that has run for three winters. I cannot go further.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'Nothing will mend us in there. Then we shall have to be hard to hit.')] },
        { cam: wide(430, 205), ...shoot('low', 'lord', 'pushIn', 'smash'), acts: [{ who: 'lord', enter: 430, from: 'right' }], cue: 'eliteSting', title: card('The Pale Huntsman', 'Lord of the Long Winter'), lines: [say('lord', 'The last warm thing. At last.', 'whisper')] },
        { cam: close('a'), ...shoot('extreme', 'a', 'still'), lines: [say('a', 'Warm enough to bite.', 'whisper')] },
      ]),
    after: (c) =>
      story('winterCourtAfter', "The Pale Huntsman's Court", 'snow', { a: hero(c[0] ?? 'archer', 256), hunter: giver('hunter', 'The hunter') }, [
        { cam: wide(260, 205), ...shoot('wide', undefined, 'drift'), lines: [tell('The ice court sags. Somewhere, very faintly, water begins to run.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('hunter', 'I can hear it from here. A drip. A real one.')] },
      ]),
  },
  {
    id: 'siegeMorning',
    title: 'The Same Morning',
    blurb: 'Kwame stands the morning the siege keeps replaying, on the same wall, against foes with practice.',
    land: 'ruins',
    like: { army: 'labyrinth', wave: 14 },
    ease: 1.45,
    cast: [{ heroes: ['knight'] }],
    rules: { survive: 100, hasten: 0.2 },
    waves: [
      { foes: ['skeleton', 'spearman', 'skeleton'] },
      { foes: ['spearman', 'boneVolley', 'skeleton', 'spearman'] },
      { foes: ['boneCaptain', 'skeleton', 'boneVolley', 'spearman'], boss: 'final' },
    ],
    boss: { name: 'The Bugler', title: 'Who Blows the Same Morning' },
    before: () =>
      story('siegeMorning', 'The Same Morning', 'ruins', { fenwick: giver('herald', 'Master Fenwick'), kwame: hero('knight', 232), bugler: foe('boneCaptain', 430, 1.3, { name: 'The Bugler', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), caption: 'The north wall, at first light', lines: [say('fenwick', 'The bugle. The ladder. The stone. It is all exactly as the chronicle has it, which is troubling.')] },
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'Then I know where to stand. A wall is a wall, Majesty, whichever morning it is.')] },
        { cam: wide(430, 205), ...shoot('low', 'bugler', 'pushIn', 'smash'), acts: [{ who: 'bugler', enter: 430, from: 'right' }], cue: 'slam', title: card('The Bugler', 'Who Blows the Same Morning'), lines: [say('bugler', 'Again. From the top.', 'shout')] },
        { cam: close('kwame'), ...shoot('extreme', 'kwame', 'still'), lines: [say('kwame', 'Gladly.', 'whisper')] },
      ]),
    after: () =>
      story('siegeMorningAfter', 'The Same Morning', 'ruins', { fenwick: giver('herald', 'Master Fenwick'), kwame: hero('knight', 256) }, [
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'He blew a different note at the end. A flat one.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), lines: [say('fenwick', 'The chronicle will have to be amended. I am delighted. I am appalled. I am writing it down.')] },
      ]),
  },
  {
    id: 'ninthVigil',
    title: 'The Vigil Under the Keep',
    blurb: 'Kenji keeps the stair of the nine thrones against the Ninth\'s heralds. Nothing heals down there.',
    land: 'dungeon',
    like: { army: 'golems', wave: 12 },
    ease: 1.4,
    cast: [{ heroes: ['samurai'] }],
    rules: { survive: 90, noHeal: true },
    waves: [
      { foes: ['skeleton', 'spearman', 'skeleton', 'boneVolley'] },
      { foes: ['spearman', 'boneVolley', 'skeleton', 'spearman', 'boneVolley'] },
      { foes: ['boneCaptain', 'skeleton', 'spearman', 'boneVolley'], boss: 'final' },
    ],
    boss: { name: "The Ninth's Herald", title: 'Who Carries the Dark Up the Stair' },
    before: () =>
      story('ninthVigil', 'The Vigil Under the Keep', 'dungeon', { crown: giver('ruler', 'The Crown'), kenji: hero('samurai', 232), herald: foe('boneCaptain', 430, 1.3, { name: "The Ninth's Herald", hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'Nine thrones, eight kings', lines: [say('crown', 'Eight kings, sitting. The ninth chair is warm. Nothing living should be in it.')] },
        { cam: close('kenji'), ...shoot('close', 'kenji', 'pushIn'), fx: ['darken'], lines: [say('kenji', 'I shall keep the stair. I have kept a bridge. A stair is a smaller sort of bridge.')] },
        { cam: wide(430, 205), ...shoot('low', 'herald', 'pushIn', 'smash'), acts: [{ who: 'herald', enter: 430, from: 'right' }], cue: 'boom', fx: ['darken', 'shake'], title: card("The Ninth's Herald", 'Who Carries the Dark Up the Stair'), lines: [say('herald', 'Make way for the number that was.', 'shout')] },
        { cam: close('kenji'), ...shoot('close', 'kenji', 'snapZoom'), fx: ['darken'], lines: [say('kenji', 'Quietly, then.', 'whisper')] },
      ]),
    after: () =>
      story('ninthVigilAfter', 'The Vigil Under the Keep', 'dungeon', { kenji: hero('samurai', 256) }, [
        { cam: close('kenji'), ...shoot('close', 'kenji', 'pushIn'), lines: [say('kenji', 'The stair is quiet. The chair is still warm. I did not sit in it.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), fx: ['darken'], lines: [tell('Eight kings do not move. The ninth, below, seems to be thinking.')] },
      ]),
  },
  {
    id: 'ninthKing',
    title: 'The Ninth King',
    blurb: 'Kwame and Ravi go down to the last throne, to end the claim of the king before the first king.',
    land: 'crystal',
    like: { army: 'golems', wave: 15 },
    ease: 1.65,
    cast: [{ heroes: ['knight'] }, { heroes: ['wizard'] }],
    rules: { race: 260, hasten: 0.1 },
    waves: [
      { foes: ['skeleton', 'spearman', 'boneVolley', 'skeleton'] },
      { foes: ['boneCaptain', 'skeleton', 'spearman', 'boneVolley'], boss: 'mid' },
      { foes: ['lichKing', 'skeleton', 'spearman', 'boneVolley', 'boneVolley'], boss: 'final' },
    ],
    boss: { name: 'The Ninth King', title: 'Before the First King' },
    before: () =>
      story('ninthKing', 'The Ninth King', 'crystal', { crown: giver('ruler', 'The Crown'), kwame: hero('knight', 236), ravi: hero('wizard', 196), king: foe('lichKing', 440, 1.4, { name: 'The Ninth King', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'The last throne', lines: [say('crown', 'He is not a monster. He is a king who was forgotten. Be quick, and be kind about it.')] },
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), fx: ['darken'], lines: [say('kwame', 'I shall be quick. Kind, I cannot promise.')] },
        { cam: close(['kwame', 'ravi']), ...shoot('ots', 'ravi'), fx: ['darken'], lines: [say('ravi', 'I brought matches. I thought it only polite.')] },
        { cam: wide(440, 205), ...shoot('low', 'king', 'pushIn', 'smash'), acts: [{ who: 'king', enter: 440, from: 'right' }], cue: 'boom', fx: ['darken', 'shake'], title: card('The Ninth King', 'Before the First King'), lines: [say('king', 'I was FIRST.', 'shout')] },
        { cam: close('kwame'), ...shoot('extreme', 'kwame', 'still'), fx: ['darken'], lines: [say('kwame', 'No. Only early.', 'whisper', 0.5)] },
      ]),
    after: () =>
      story('ninthKingAfter', 'The Ninth King', 'crystal', { crown: giver('ruler', 'The Crown'), kwame: hero('knight', 250), ravi: hero('wizard', 210) }, [
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'He said thank you. At the end. As if he had only wanted someone to listen.')] },
        { cam: close('ravi'), ...shoot('close', 'ravi'), lines: [say('ravi', 'Then the matches were unnecessary. I shall keep them for the next king.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), lines: [tell('The ninth chair is only stone now. Somebody has left a candle on it.')] },
      ]),
  },
];
