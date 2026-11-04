// The quest battles of the heroes' own quests, Duchess's and the spoils (QUESTS-3, `docs/notes/quests-design.md` section 6): the drunk bosun
// kept alive for Tiago and Harrow, Edmund's last verdict, Duchess in the hay and Duchess among the foes, the race to a captive's hideout
// and the box that ticks. Each uses a rule of `questRules.ts`. Pure data, in the shape of `../questBattleData.ts`.

import { close, say, shoot, tell, wide } from '../sceneKit';
import type { QuestBattle } from '../questBattles';
import { card, foe, giver, hero, story } from '../questBattleData';

export const HEROESNEW_BATTLES: readonly QuestBattle[] = [
  {
    id: 'unpaidCrew',
    title: 'The Unpaid Crew',
    blurb: 'Tiago and Harrow walk a very drunk bosun through the drowned crew he still owes wages to.',
    land: 'swamp',
    like: { army: 'beasts', wave: 12 },
    ease: 0.66,
    cast: [{ heroes: ['buccaneer'] }, { heroes: ['dreadPirate'] }],
    rules: { protect: { kind: 'guestBosun', hp: 1.5 } },
    waves: [
      { foes: ['skeleton', 'spearman', 'skeleton'] },
      { foes: ['skeleton', 'boneVolley', 'spearman', 'boneVolley'] },
      { foes: ['boneCaptain', 'skeleton', 'spearman', 'boneVolley'], boss: 'final' },
    ],
    boss: { name: 'The Paymaster', title: 'Collector of Wages Long Overdue' },
    before: () =>
      story('unpaidCrew', 'The Unpaid Crew', 'swamp', { tiago: hero('buccaneer', 236), harrow: hero('dreadPirate', 200), bosun: { role: 'unit:guestBosun', x: 270, facing: 'right', name: 'The Bosun' }, pay: foe('boneCaptain', 420, 1.3, { name: 'The Paymaster', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), weather: 'rain', caption: 'A mooring in the reeds', lines: [tell('The drowned crew has found the one man who signed for their wages. He is asleep on a barrel.')] },
        { cam: close('harrow'), ...shoot('close', 'harrow', 'pushIn'), weather: 'rain', lines: [say('harrow', 'He signed for *all* of it. In a hand I can only describe as wet.')] },
        { cam: close(['tiago', 'bosun']), ...shoot('two', undefined, 'still'), weather: 'rain', lines: [say('tiago', 'Walk him to the far end of the reeds and nobody gets a refund. Do not let him fall in.')] },
        { cam: wide(420, 205), ...shoot('low', 'pay', 'pushIn', 'smash'), weather: 'rain', acts: [{ who: 'pay', enter: 420, from: 'right' }], cue: 'slam', title: card('The Paymaster', 'Collector of Wages Long Overdue'), lines: [say('pay', 'Eleven years. With interest. *Where is he?*', 'shout')] },
      ]),
    after: () =>
      story('unpaidCrewAfter', 'The Unpaid Crew', 'swamp', { tiago: hero('buccaneer', 250), harrow: hero('dreadPirate', 216), bosun: { role: 'unit:guestBosun', x: 280, facing: 'left', name: 'The Bosun' } }, [
        { cam: close('tiago'), ...shoot('close', 'tiago', 'pushIn'), lines: [say('tiago', 'He slept through all of it. I think he is the only one of us who is happy.')] },
        { cam: wide(280, 205), ...shoot('wide', undefined, 'pullOut', 'dissolve'), hold: 1.3, lines: [tell('The crew sails off into the fog, paid in a very large and very damp IOU.')] },
      ]),
  },
  {
    id: 'finalVerdict',
    title: 'The Final Verdict',
    blurb: 'Edmund stands trial before the old court of his own kingdom, and his banner must not fall.',
    land: 'ruins',
    like: { army: 'yokai', wave: 12 },
    ease: 0.6,
    cast: [{ heroes: ['tyrant'] }],
    rules: { protect: { kind: 'standard', hp: 4 }, hasten: 0.1 },
    waves: [
      { foes: ['skeleton', 'spearman', 'skeleton', 'boneVolley'] },
      { foes: ['yokaiMonk', 'yokaiFox', 'yokaiWitch', 'yokaiCrow'] },
      { foes: ['mazeGorgon2', 'mazeMino2', 'mazeMino1', 'mazeGorgon1'] },
      { foes: ['lichKing', 'skeleton', 'spearman', 'boneVolley', 'skeleton'], boss: 'final' },
    ],
    boss: { name: 'The Last Magistrate', title: 'Judge of a Kingdom That Is Gone' },
    before: () =>
      story('finalVerdict', 'The Final Verdict', 'ruins', { edmund: hero('tyrant', 230), judge: foe('lichKing', 430, 1.3, { name: 'The Last Magistrate', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'The court of a kingdom that is gone', lines: [tell('Edmund has planted his banner in the ruined hall. The hall, to its credit, has gone quiet.')] },
        { cam: close('edmund'), ...shoot('close', 'edmund', 'pushIn'), fx: ['darken'], lines: [say('edmund', 'Four trials. Four verdicts. I passed every one. I merely wish to be seen to pass the fifth.')] },
        { cam: wide(430, 205), ...shoot('low', 'judge', 'pushIn', 'smash'), acts: [{ who: 'judge', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Last Magistrate', 'Judge of a Kingdom That Is Gone'), lines: [say('judge', 'The banner falls, the verdict is *guilty*. Those are the rules. I wrote them.', 'shout')] },
        { cam: close('edmund'), ...shoot('close', 'edmund', 'snapZoom'), fx: ['darken'], lines: [say('edmund', 'Then it will not fall. Obviously.')] },
      ]),
    after: () =>
      story('finalVerdictAfter', 'The Final Verdict', 'ruins', { edmund: hero('tyrant', 250) }, [
        { cam: close('edmund'), ...shoot('close', 'edmund', 'pushIn'), lines: [say('edmund', 'Not guilty. I shall have it written down, and I shall have it written *large*.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), rays: true, hold: 1.3, lines: [tell('The banner still stands. For once, he lets somebody else say he was right.')] },
      ]),
  },
  {
    id: 'hayInspection',
    title: 'Hay Inspection',
    blurb: 'Minh walks Duchess down the long barn while three waves of orcs try to inspect the hay for themselves.',
    land: 'plains',
    like: { army: 'orcs', wave: 9 },
    ease: 1.15,
    cast: [{ heroes: ['peasant'] }],
    rules: { protect: { kind: 'duchess', hp: 1.5 } },
    waves: [
      { foes: ['orcGrunt', 'orcGrunt', 'orcArcher'] },
      { foes: ['orcGrunt', 'orcBrute', 'orcArcher', 'orcGrunt'] },
      { foes: ['orcBrute', 'orcGrunt', 'orcArcher', 'orcBrute'] },
    ],
    before: () =>
      story('hayInspection', 'Hay Inspection', 'plains', { minh: hero('peasant', 236), duchess: { role: 'duchess', x: 280, facing: 'right' }, orc: foe('orcBrute', 430, 1.2, { hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), rays: true, caption: 'The long barn', lines: [tell('Duchess is inspecting the hay. It is a very long barn and she is very thorough.')] },
        { cam: close('duchess', 2), ...shoot('low', 'duchess', 'pushIn'), lines: [say('duchess', 'Mehh. (Third bale from the left: acceptable. The rest will be tasted.)')] },
        { cam: close('minh'), ...shoot('close', 'minh', 'pushIn'), lines: [say('minh', 'She is not to be hurt, she is not to be hurried, and she is not to be *stopped*. Right. Pitchfork.')] },
        { cam: wide(430, 205), ...shoot('wide', 'orc', 'still', 'smash'), acts: [{ who: 'orc', enter: 430, from: 'right' }], cue: 'steps', lines: [tell('Some orcs have heard there is very good hay in the barn. They are mistaken about whose it is.')] },
      ]),
    after: () =>
      story('hayInspectionAfter', 'Hay Inspection', 'plains', { minh: hero('peasant', 250), duchess: { role: 'duchess', x: 292, facing: 'left' } }, [
        { cam: close('duchess', 2), ...shoot('medium', 'duchess'), lines: [say('duchess', 'Mehh. (Passed. Barely. She has eaten the certificate.)')] },
        { cam: close('minh'), ...shoot('close', 'minh', 'pushIn'), lines: [say('minh', 'Mum said farm work builds character. She did not say it builds *goats*.')] },
      ]),
  },
  {
    id: 'goatNotForSale',
    title: 'The Goat Is Not for Sale',
    blurb: 'Duchess has joined the satyrs for snacks. Fell the rest of them, and hand her back unharmed.',
    land: 'autumn',
    like: { army: 'wildwood', wave: 12 },
    ease: 3.4,
    cast: [{ heroes: ['knight', 'peasant'] }, { heroes: ['archer', 'ranger'] }],
    rules: { spare: 'satyr3' },
    waves: [
      { foes: ['satyr1', 'satyr2', 'groveSatyr1'] },
      { foes: ['groveSatyr2', 'satyr1', 'satyr2', 'groveSatyr1'] },
      { foes: ['satyr3', 'forestBoss1', 'satyr1', 'satyr2'], boss: 'final' },
    ],
    boss: { name: 'The Snack Baron', title: 'Satyr of the Sweet Orchard' },
    before: (c) =>
      story('goatNotForSale', 'The Goat Is Not for Sale', 'autumn', { a: hero(c[0] ?? 'knight', 236), b: hero(c[1] ?? 'archer', 198), duchess: { role: 'duchess', x: 400, facing: 'left' }, baron: foe('forestBoss1', 430, 1.3, { name: 'The Snack Baron', hidden: true }) }, [
        { cam: wide(310, 205), ...shoot('wide', undefined, 'pan'), rays: true, caption: 'The sweet orchard', lines: [tell('Duchess is in the orchard, among the satyrs, wearing a garland. She appears to have been hired.')] },
        { cam: close('duchess', 2), ...shoot('low', 'duchess', 'pushIn'), lines: [say('duchess', 'Mehh. (They have apples. They have *better* apples. This is a career move.)')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'The Baron says she is a free agent. She is the *court* goat. Fell the satyrs, mind her hooves.')] },
        { cam: wide(430, 205), ...shoot('low', 'baron', 'pushIn', 'smash'), acts: [{ who: 'baron', enter: 430, from: 'right' }], cue: 'boom', title: card('The Snack Baron', 'Satyr of the Sweet Orchard'), lines: [say('baron', 'Name your price for the goat. I shall *double* it in apples.', 'shout')] },
      ]),
    after: (c) =>
      story('goatNotForSaleAfter', 'The Goat Is Not for Sale', 'autumn', { a: hero(c[0] ?? 'knight', 250), duchess: { role: 'duchess', x: 300, facing: 'left' } }, [
        { cam: close('duchess', 2), ...shoot('medium', 'duchess'), lines: [say('duchess', 'Mehh. (She has kept the garland. The Baron will be sending a bill.)')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'Not for sale. Not for any number of apples. I would like that on a plaque.')] },
      ]),
  },
  {
    id: 'captiveRace',
    title: 'The Hideout Race',
    blurb: 'A captive gave up where the Legion hides its dead. Reach the hideout before its door is shut for the night.',
    land: 'graveyard',
    like: { army: 'undead', wave: 10 },
    ease: 1.28,
    cast: [{ heroes: ['samurai', 'kunoichi'] }],
    rules: { race: 110 },
    waves: [
      { foes: ['skeleton', 'spearman', 'boneVolley'] },
      { foes: ['boneCaptain', 'skeleton', 'spearman', 'boneVolley'], boss: 'final' },
    ],
    boss: { name: 'The Hideout Warden', title: 'Keeper of the Night Door' },
    before: (c) =>
      story('captiveRace', 'The Hideout Race', 'graveyard', { prisoner: giver('spoils', 'The captive'), a: hero(c[0] ?? 'samurai', 236), warden: foe('boneCaptain', 430, 1.3, { name: 'The Hideout Warden', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'The chapel yard at dusk', lines: [say('prisoner', 'The door shuts at the last bell. After that, nobody gets in. Or, regrettably, out.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), fx: ['darken'], lines: [say('a', 'Then we do not stop for the small ones. Quick feet, quick blades.')] },
        { cam: wide(430, 205), ...shoot('low', 'warden', 'pushIn', 'smash'), acts: [{ who: 'warden', enter: 430, from: 'right' }], cue: 'slam', fx: ['darken'], title: card('The Hideout Warden', 'Keeper of the Night Door'), lines: [say('warden', 'Half a minute to the bell. I have never once been early. I am *always* on time.', 'shout')] },
      ]),
    after: (c) =>
      story('captiveRaceAfter', 'The Hideout Race', 'graveyard', { a: hero(c[0] ?? 'samurai', 250) }, [
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'In. And before the bell. The captive will be insufferable about it.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), hold: 1.2, lines: [tell('Behind the door, a long room, and at its end a throne that somebody has been keeping warm.')] },
      ]),
  },
  {
    id: 'tickingBox',
    title: 'A Box That Ticks',
    blurb: 'A brass box found on a golem boss is winding down. Hold the forge floor until it stops.',
    land: 'forge',
    like: { army: 'golems', wave: 7 },
    ease: 2.71,
    cast: [{ heroes: ['knight', 'peasant'] }, { heroes: ['wizard', 'archer'] }],
    rules: { survive: 120 },
    waves: [{ foes: ['stoneGolem', 'ironGolem', 'crystalGolem', 'magmaGolem', 'stoneGolem'] }],
    before: (c) =>
      story('tickingBox', 'A Box That Ticks', 'forge', { a: hero(c[0] ?? 'knight', 236), b: hero(c[1] ?? 'wizard', 198), g: foe('ironGolem', 430, 1.3, { hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'glow'], caption: 'The forge floor', lines: [tell('The box ticks. Every golem in the forge has turned its head toward the sound.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'Two minutes by the sound of it. When it stops, either everything is fine or we will not be asked.')] },
        { cam: wide(430, 205), ...shoot('wide', 'g', 'still', 'smash'), acts: [{ who: 'g', enter: 430, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], lines: [tell('Tick. Tick. The golems start to walk.')] },
      ]),
    after: (c) =>
      story('tickingBoxAfter', 'A Box That Ticks', 'forge', { a: hero(c[0] ?? 'knight', 250) }, [
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'It stopped. It chimed. It is, I think, a very expensive clock.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), hold: 1.2, lines: [tell('Inside the lid, in neat brass letters: "Your time has been very well spent."')] },
      ]),
  },
];
