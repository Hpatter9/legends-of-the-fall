// The quest battles (batch 2 of the quests design, `docs/notes/quests-summons-design.md`): eleven one-off fights, each opened by a
// quest from a fitting giver (`questData/battles.ts`), each on a land of its own, with its own waves, a boss of its own (a name and a
// title on an existing boss, who keeps its kit and its signature attacks), a required cast from the real roster, and a short story in
// the cinematics' style before it and a beat after a win. The voice: wry and warm, in British spelling. Lines name the heroes
// filling a slot of several by `{a}`, `{b}` (the actor's own name), so the words fit whoever came. Pure data: the rules are in
// `questBattles.ts`.

import { close, say, tell, wide, type CastMember, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import type { QuestBattle } from './questBattles';
import { heroName } from './heroNames';

const hero = (kind: string, x: number, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'right', name: heroName(kind), ...more });
const foe = (kind: string, x: number, scale = 1.2, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'left', scale, ...more });

/** A story: its cast and shots, in the cinematics' own shape (played by the page's scene player, not kept in the Scenes list). */
const story = (id: string, title: string, look: Area, cast: Scene['cast'], shots: Shot[]): Scene => ({
  id: `qb-${id}`,
  title,
  blurb: title,
  moment: { kind: 'questBattle', battle: id },
  music: 'solemn',
  cast,
  shots: shots.map((s, i) => (i === 0 ? { look, fx: ['fadeIn'], ...s } : s)),
});

export const QUEST_BATTLES: readonly QuestBattle[] = [
  {
    id: 'bridgeBlades',
    title: 'Two Blades on the Bridge',
    blurb: 'Kenji and Hideo hold the eastern bridge against the Night Parade and its toll-keeper.',
    land: 'shrine',
    like: { army: 'yokai', wave: 11 },
    ease: 0.4,
    cast: [{ heroes: ['samurai'] }, { heroes: ['samuraiCommander'] }],
    waves: [
      { foes: ['yokaiFox', 'yokaiCrow', 'yokaiFox'] },
      { foes: ['yokaiCrow', 'yokaiFox', 'yokaiMonk', 'yokaiCrow'] },
      { foes: ['oniKing', 'yokaiFox', 'yokaiCrow', 'yokaiWitch'], boss: 'final' },
    ],
    boss: { name: 'The Bridge Oni', title: 'Toll-Keeper of the Eastern Span' },
    before: () =>
      story('bridgeBlades', 'Two Blades on the Bridge', 'shrine', { kenji: hero('samurai', 230), hideo: hero('samuraiCommander', 196), oni: foe('oniKing', 420, 1.3, { name: 'The Bridge Oni', hidden: true }) }, [
        { cam: wide(300, 205), caption: 'The eastern bridge', lines: [say('kenji', 'I lost a duel on this bridge when I was young. I have been meaning to come back and not lose.')] },
        { cam: close(['kenji', 'hideo']), lines: [say('hideo', 'You were very young. And very loud.'), say('kenji', 'I am older now.'), say('hideo', 'We shall see about the loud.')] },
        { cam: wide(360, 205), acts: [{ who: 'oni', enter: 420, from: 'right' }], cue: 'boom', fx: ['shake'], lines: [tell('Something with a club and a ledger has set up a toll at the far end.')] },
      ]),
    after: () =>
      story('bridgeBladesAfter', 'Two Blades on the Bridge', 'shrine', { kenji: hero('samurai', 260), hideo: hero('samuraiCommander', 226) }, [
        { cam: close(['kenji', 'hideo']), lines: [say('hideo', 'Better. Much quieter.'), say('kenji', 'Then the next round at the tavern is mine. Quietly.')] },
      ]),
  },
  {
    id: 'saltAndCannon',
    title: 'Salt and Cannon',
    blurb: 'Tiago and Harrow on a sea cliff, against the drowned crew of Harrow\'s first ship.',
    land: 'highlands',
    like: { army: 'beasts', wave: 13 },
    ease: 1.3,
    cast: [{ heroes: ['buccaneer'] }, { heroes: ['dreadPirate'] }],
    waves: [
      { foes: ['skeleton', 'spearman', 'skeleton'] },
      { foes: ['skeleton', 'boneVolley', 'spearman', 'skeleton', 'boneVolley'] },
      { foes: ['boneCaptain', 'skeleton', 'boneVolley', 'spearman'], boss: 'final' },
    ],
    boss: { name: 'Captain Brine', title: 'Master of the Drowned Watch' },
    before: () =>
      story('saltAndCannon', 'Salt and Cannon', 'highlands', { tiago: hero('buccaneer', 236), harrow: hero('dreadPirate', 200), brine: foe('boneCaptain', 420, 1.3, { name: 'Captain Brine', hidden: true }) }, [
        { cam: wide(300, 200), caption: 'A cliff over the grey sea', lines: [say('harrow', 'My first crew. They drowned with me, the first time. They took it worse than I did.')] },
        { cam: close(['tiago', 'harrow']), lines: [say('tiago', 'You said the wager was who pays for the rum.'), say('harrow', 'It is. Whoever they climb up after first pays.')] },
        { cam: wide(380, 205), acts: [{ who: 'brine', enter: 420, from: 'right' }], cue: 'slam', lines: [say('brine', 'Captain Harrow. You left us the bill.', 'shout')] },
      ]),
    after: () =>
      story('saltAndCannonAfter', 'Salt and Cannon', 'highlands', { tiago: hero('buccaneer', 260), harrow: hero('dreadPirate', 226) }, [
        { cam: close(['tiago', 'harrow']), lines: [say('harrow', 'They came for me first. I win the wager.'), say('tiago', 'You lose the wager. Read it again.'), tell('Neither of them has ever read it.')] },
      ]),
  },
  {
    id: 'kilnRoad',
    title: 'The Kiln Road',
    blurb: 'Ravi follows a pedlar\'s smoking crown down the old kiln road, through the lava field.',
    land: 'volcano',
    like: { army: 'orcs', wave: 11 },
    ease: 1.75,
    cast: [{ heroes: ['wizard'] }],
    waves: [
      { foes: ['hellImp', 'hellImp', 'hellImp'] },
      { foes: ['hellImp', 'hellDemon', 'hellImp', 'hellImp'] },
      { foes: ['devilLeader', 'hellImp', 'hellImp', 'hellDemon'], boss: 'final' },
    ],
    boss: { name: 'The Ash Warden', title: 'Keeper of the Kiln Road' },
    before: () =>
      story('kilnRoad', 'The Kiln Road', 'volcano', { ravi: hero('wizard', 230), warden: foe('devilLeader', 420, 1.3, { name: 'The Ash Warden', hidden: true, shade: true }) }, [
        { cam: wide(290, 200), fx: ['fadeIn', 'glow'], caption: 'The old kiln road', lines: [tell('The pedlar\'s lucky crown is made of cinders. It is still smoking. It came from down here.')] },
        { cam: close('ravi'), lines: [say('ravi', 'I have chased fire my whole life. It is about time it led somewhere.'), say('ravi', 'Somewhere with fewer imps, ideally.')] },
        { cam: wide(380, 200), acts: [{ who: 'warden', enter: 420, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], lines: [say('warden', 'The road is closed. The road has always been closed.', 'shout')] },
      ]),
    after: () =>
      story('kilnRoadAfter', 'The Kiln Road', 'volcano', { ravi: hero('wizard', 260) }, [
        { cam: close('ravi'), lines: [tell('Where the Warden fell, a feather of grey ash lies on the stone. It does not crumble.'), say('ravi', 'Still warm. I am keeping it. Do not tell the pedlar.')] },
      ]),
  },
  {
    id: 'frozenMeadow',
    title: 'The Frozen Meadow',
    blurb: 'Vuk and a friend of the wild ask a frost-backed pack what it is following.',
    land: 'snow',
    like: { army: 'beasts', wave: 12 },
    ease: 1.1,
    cast: [{ heroes: ['werewolf'] }, { heroes: ['beastmaster', 'ranger'] }],
    waves: [
      { foes: ['packWhite', 'packWhite', 'packBlack'] },
      { foes: ['packWhite', 'packRed', 'packWhite', 'packBlack'] },
      { foes: ['packWhite', 'packWhite', 'packRed', 'packBlack', 'packWhite'] },
      { foes: ['alphaWolf', 'packWhite', 'packWhite', 'packRed'], boss: 'final' },
    ],
    boss: { name: 'The Rime Alpha', title: 'Leader of the Frost-Backed Pack' },
    before: (c) =>
      story('frozenMeadow', 'The Frozen Meadow', 'snow', { vuk: hero('werewolf', 236), b: hero(c[1] ?? 'beastmaster', 200), alpha: foe('alphaWolf', 420, 1.3, { name: 'The Rime Alpha', hidden: true }) }, [
        { cam: wide(300, 200), caption: 'A meadow under the snow', lines: [tell('The pack that hunts this meadow runs with frost on its back, and it is following something.')] },
        { cam: close(['vuk', 'b']), lines: [say('vuk', 'Wolves do not follow. Wolves lead. Unless something bigger has taken the lead.'), say('b', 'Then we ask them what. Politely, if we can.')] },
        { cam: wide(380, 205), acts: [{ who: 'alpha', enter: 420, from: 'right' }], lines: [say('vuk', 'We cannot.', 'whisper')] },
      ]),
    after: (c) =>
      story('frozenMeadowAfter', 'The Frozen Meadow', 'snow', { vuk: hero('werewolf', 260), b: hero(c[1] ?? 'beastmaster', 226) }, [
        { cam: close(['vuk', 'b']), lines: [tell('A bell of clear ice lies where the Rime Alpha fell.'), say('vuk', 'Smells of winter. The old kind.'), say('b', 'You sneezed on it.')] },
      ]),
  },
  {
    id: 'underCourtyard',
    title: 'Under the Courtyard',
    blurb: 'Duchess has dug a hole in the courtyard. It goes down. Something down there is built of stone.',
    land: 'ruins',
    like: { army: 'labyrinth', wave: 12 },
    ease: 1.6,
    cast: [{ heroes: ['knight', 'peasant'] }, { heroes: ['minotaur', 'juggernaut'] }],
    duchess: true,
    waves: [
      { foes: ['stoneGolem', 'stoneGolem', 'crystalGolem'] },
      { foes: ['stoneGolem', 'ironGolem', 'crystalGolem', 'stoneGolem'] },
      { foes: ['sapphireColossus', 'stoneGolem', 'crystalGolem'], boss: 'final' },
    ],
    boss: { name: 'The Mortar Warden', title: 'Keystone of the Old Keep' },
    before: (c) =>
      story('underCourtyard', 'Under the Courtyard', 'ruins', { a: hero(c[0] ?? 'knight', 236), b: hero(c[1] ?? 'minotaur', 196), duchess: { role: 'duchess', x: 280, facing: 'right' }, warden: foe('sapphireColossus', 430, 1.3, { name: 'The Mortar Warden', hidden: true, shade: true }) }, [
        { cam: wide(280, 205), caption: 'A large hole', lines: [tell('Duchess has dug a hole in the courtyard. It is a large hole. It goes down.')] },
        { cam: close(['a', 'duchess']), lines: [say('a', 'Your Majesty, the goat has found a staircase.'), say('b', 'Tunnels. At last, somewhere that feels like home.')] },
        { cam: wide(380, 205), acts: [{ who: 'warden', enter: 430, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], lines: [say('duchess', 'Mehh. (She is going first. Nobody argues.)')] },
      ]),
    after: (c) =>
      story('underCourtyardAfter', 'Under the Courtyard', 'ruins', { a: hero(c[0] ?? 'knight', 250), duchess: { role: 'duchess', x: 290, facing: 'left' } }, [
        { cam: close(['a', 'duchess']), lines: [tell('Under the rubble: a fist of stone the size of a cart, carved with the keep\'s own crest.'), say('a', 'The keep was built on something. Someone, perhaps.'), say('duchess', 'Mehh. (She is filling the hole back in. Badly.)')] },
      ]),
  },
  {
    id: 'cellarTenant',
    title: 'What Knocks Below',
    blurb: 'Two heroes, Gwen\'s cellar, a candle, and whatever has been knocking.',
    land: 'dungeon',
    like: { army: 'undead', wave: 6 },
    ease: 0.8,
    cast: [{ heroes: ['archer', 'kunoichi'] }],
    most: 2,
    waves: [
      { foes: ['skeleton', 'skeleton', 'boneVolley'] },
      { foes: ['boneCaptain', 'skeleton', 'spearman'], boss: 'final' },
    ],
    boss: { name: 'The Cellar Tenant', title: 'Knocker in the Dark' },
    before: (c) =>
      story('cellarTenant', 'What Knocks Below', 'dungeon', { a: hero(c[0] ?? 'archer', 236), tenant: foe('boneCaptain', 420, 1.2, { name: 'The Cellar Tenant', hidden: true, shade: true }) }, [
        { cam: wide(300, 205), fx: ['fadeIn', 'darken'], caption: 'Gwen\'s cellar', lines: [tell('Three knocks, a wait, then one. Gwen has stopped counting and started charging rent.')] },
        { cam: close('a'), lines: [say('a', 'Room for two of us down here, and a candle. Gwen says mind the good barrels.')] },
        { cam: wide(380, 205), acts: [{ who: 'tenant', enter: 420, from: 'right' }], cue: 'slam', lines: [say('tenant', 'Knock knock.', 'whisper'), say('a', 'Do not.')] },
      ]),
    after: (c) =>
      story('cellarTenantAfter', 'What Knocks Below', 'dungeon', { a: hero(c[0] ?? 'archer', 260) }, [
        { cam: close('a'), lines: [tell('Behind the barrels: a brass door-knocker, on no door, still warm.'), say('a', 'It was knocking to be let in. Or out. I am not asking which.')] },
      ]),
  },
  {
    id: 'sweptFloor',
    title: 'The Swept Floor',
    blurb: 'The pilgrim\'s last shrine: the heart of the Labyrinth, and whoever sweeps it.',
    land: 'temple',
    like: { army: 'ogres', wave: 10 },
    ease: 0.72,
    cast: [{ heroes: ['cleric', 'priestess'] }],
    waves: [{ foes: ['minotaurChampion', 'mazeGorgon1', 'mazeMino2', 'mazeGorgon2'], boss: 'final' }],
    boss: { name: 'The Sweeper', title: 'Keeper of the Clean Floor' },
    before: (c) =>
      story('sweptFloor', 'The Swept Floor', 'temple', { a: hero(c[0] ?? 'cleric', 230), sweeper: foe('minotaurChampion', 420, 1.3, { name: 'The Sweeper', hidden: true }) }, [
        { cam: wide(300, 200), caption: 'The heart of the Labyrinth', lines: [tell('Nothing here but a floor, swept very clean. Someone sweeps it every night.')] },
        { cam: close('a'), lines: [say('a', 'The pilgrim said this floor was the shrine. I should like to meet the one who keeps it.')] },
        { cam: wide(380, 205), acts: [{ who: 'sweeper', enter: 420, from: 'right' }], cue: 'boom', fx: ['shake'], lines: [say('sweeper', 'BOOTS.', 'shout'), say('a', 'Ah. We have met.')] },
      ]),
    after: (c) =>
      story('sweptFloorAfter', 'The Swept Floor', 'temple', { a: hero(c[0] ?? 'cleric', 250), sweeper: foe('minotaurChampion', 330, 1.3, { name: 'The Sweeper' }) }, [
        { cam: close(['a', 'sweeper']), acts: [{ who: 'sweeper', pose: 'down' }], lines: [say('a', 'Rest. I will sweep tonight.'), tell('She does. It takes until morning. The floor has never been cleaner.')] },
      ]),
  },
  {
    id: 'theAudit',
    title: 'The Audit',
    blurb: 'Zofia\'s patron has sent an auditor. Only those who read may stand with her.',
    land: 'swamp',
    like: { army: 'wildwood', wave: 12 },
    ease: 0.75,
    cast: [{ heroes: ['warlock'] }],
    only: { traits: ['caster', 'arcanist', 'mystic'] },
    waves: [
      { foes: ['hellImp', 'hellImp', 'hellImp', 'hellImp'] },
      { foes: ['demonLord', 'hellImp', 'hellDemon', 'hellImp'], boss: 'final' },
    ],
    boss: { name: 'Mr Quill', title: 'Auditor of the Ninth Ledger' },
    before: () =>
      story('theAudit', 'The Audit', 'swamp', { zofia: hero('warlock', 230), quill: foe('demonLord', 420, 1.3, { name: 'Mr Quill', hidden: true }) }, [
        { cam: wide(300, 205), fx: ['fadeIn', 'darken'], caption: 'Where the paperwork rots', lines: [tell('The pact\'s small print has a clause about audits. It is in even smaller print.')] },
        { cam: wide(380, 205), acts: [{ who: 'quill', enter: 420, from: 'right' }], lines: [say('quill', 'Clause nine, sub-clause hell: a show of strength, by readers only.')] },
        { cam: close('zofia'), lines: [say('zofia', 'Only casters, then. Anyone who hits things can wait in the cart.')] },
      ]),
    after: () =>
      story('theAuditAfter', 'The Audit', 'swamp', { zofia: hero('warlock', 260) }, [
        { cam: close('zofia'), lines: [say('zofia', 'Audit passed. My soul is mine until next quarter.'), tell('Mr Quill\'s ledger is left behind. Somebody has underlined "reasonable".')] },
      ]),
  },
  {
    id: 'recitalNight',
    title: 'The Midnight Recital',
    blurb: 'Lovell plays the chapel\'s recital for the dead, and the conductor wakes the rest.',
    land: 'graveyard',
    like: { army: 'wildwood', wave: 9 },
    ease: 0.72,
    cast: [{ heroes: ['wolfBard'] }],
    waves: [
      { foes: ['skeleton', 'skeleton', 'spearman'] },
      { foes: ['skeleton', 'boneVolley', 'skeleton', 'spearman'] },
      { foes: ['spearman', 'boneVolley', 'skeleton', 'boneVolley', 'skeleton'] },
      { foes: ['lichKing', 'skeleton', 'boneVolley', 'spearman'], boss: 'final' },
    ],
    boss: { name: 'The Conductor', title: 'Who Beats Time on Bones' },
    before: () =>
      story('recitalNight', 'The Midnight Recital', 'graveyard', { lovell: hero('wolfBard', 230), conductor: foe('lichKing', 420, 1.3, { name: 'The Conductor', hidden: true, shade: true }) }, [
        { cam: wide(300, 205), fx: ['fadeIn', 'darken'], caption: 'Midnight, the chapel yard', lines: [tell('The audience has been dead for two hundred years. They are very attentive.')] },
        { cam: close('lovell'), lines: [say('lovell', 'Soft, then. A lullaby. Nobody wakes, nobody gets up, nobody gets eaten.')] },
        { cam: wide(380, 205), acts: [{ who: 'conductor', enter: 420, from: 'right' }], cue: 'eliteSting', lines: [say('conductor', 'Too slow. FORTISSIMO.', 'shout'), say('lovell', 'Oh, no you do not.')] },
      ]),
    after: () =>
      story('recitalNightAfter', 'The Midnight Recital', 'graveyard', { lovell: hero('wolfBard', 260) }, [
        { cam: close('lovell'), lines: [say('lovell', 'And back to sleep, all of you. Lights out. Encore next century.'), tell('Nobody claps. It is the highest praise the dead can give.')] },
      ]),
  },
  {
    id: 'karnoksDoor',
    title: 'Karnok\'s Door',
    blurb: 'The rift\'s last door, where Karnok stood: what is left of it still guards the way.',
    land: 'crystal',
    like: { army: 'ogres', wave: 14 },
    ease: 0.48,
    cast: [{ heroes: ['reaper'] }],
    waves: [
      { foes: ['hellDemon', 'mazeGorgon2', 'clanBrute'] },
      { foes: ['packRed', 'hellImp', 'yokaiWitch', 'skeleton'] },
      { foes: ['ironGolem', 'clanOgre', 'yokaiSeer', 'hellDemon'] },
      { foes: ['shamanKing', 'clanOgre', 'yokaiWitch', 'hellImp'], boss: 'mid' },
      { foes: ['demonLord', 'hellDemon', 'magmaGolem', 'yokaiCrow', 'mazeMino3'], boss: 'final' },
    ],
    boss: { name: 'The Door That Was Karnok', title: 'What Is Left of the Last Door' },
    before: () =>
      story('karnoksDoor', 'Karnok\'s Door', 'crystal', { vesper: hero('reaper', 230), door: foe('demonLord', 430, 1.4, { name: 'The Door', hidden: true, shade: true }) }, [
        { cam: wide(300, 205), fx: ['fadeIn', 'darken', 'rumble'], caption: 'The last door', lines: [tell('the voice came back. it said: one more. it said: bring the one who keeps the hour.')] },
        { cam: close('vesper'), lines: [say('vesper', 'Every door closes at the last hour. I have come to close this one.')] },
        { cam: wide(380, 205), acts: [{ who: 'door', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], lines: [tell('Karnok fell. His door did not get the message.')] },
      ]),
    after: () =>
      story('karnoksDoorAfter', 'Karnok\'s Door', 'crystal', { vesper: hero('reaper', 260) }, [
        { cam: close('vesper'), lines: [say('vesper', 'Closed. Locked. I have kept the key, in case it gets ideas.'), tell('thank you, says the voice, very quietly. then nothing.')] },
      ]),
  },
  {
    id: 'wolfDen',
    title: 'The White Wolf\'s Den',
    blurb: 'Inti goes up to the old white wolf\'s den for the hunter, and finds it has a new tenant.',
    land: 'forest',
    like: { army: 'ogres', wave: 8 },
    ease: 0.65,
    cast: [{ heroes: ['ranger'] }],
    waves: [
      { foes: ['packWhite', 'packBlack', 'packWhite'] },
      { foes: ['packRed', 'packWhite', 'packBlack', 'packRed'] },
      { foes: ['boarKing', 'packWhite', 'packBlack', 'packRed'], boss: 'final' },
    ],
    boss: { name: 'Old Tusk', title: 'Squatter in the White Den' },
    before: () =>
      story('wolfDen', 'The White Wolf\'s Den', 'forest', { inti: hero('ranger', 230), tusk: foe('boarKing', 420, 1.3, { name: 'Old Tusk', hidden: true }) }, [
        { cam: wide(300, 205), caption: 'Up the old trail', lines: [tell('The hunter asked one last thing: see the white wolf\'s den is empty, so the cubs can come home.')] },
        { cam: close('inti'), lines: [say('inti', 'Snares are where she left them. Tracks are not hers. Something heavy has moved in.')] },
        { cam: wide(380, 205), acts: [{ who: 'tusk', enter: 420, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], lines: [say('inti', 'Something very heavy.')] },
      ]),
    after: () =>
      story('wolfDenAfter', 'The White Wolf\'s Den', 'forest', { inti: hero('ranger', 260) }, [
        { cam: close('inti'), lines: [say('inti', 'Empty, and swept out. The cubs will find it as she left it.'), tell('Far off, three white shapes watch from the ridge, then turn for home.')] },
      ]),
  },
];
