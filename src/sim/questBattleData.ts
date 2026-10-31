// The quest battles (batch 2 of the quests design, `docs/notes/quests-summons-design.md`): eleven one-off fights, each opened by a
// quest from a fitting giver (`questData/battles.ts`), each on a land of its own, with its own waves, a boss of its own (a name and a
// title on an existing boss, who keeps its kit and its signature attacks), a required cast from the real roster, and a short story in
// the cinematics' style before it and a beat after a win. The voice: wry and warm, in British spelling. Lines name the heroes
// filling a slot of several by `{a}`, `{b}` (the actor's own name), so the words fit whoever came. Pure data: the rules are in
// `questBattles.ts`.

import { close, say, shoot, tell, wide, type CastMember, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import type { QuestBattle } from './questBattles';
import { heroName } from './heroNames';

const hero = (kind: string, x: number, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'right', name: heroName(kind), ...more });
const foe = (kind: string, x: number, scale = 1.2, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'left', scale, ...more });

/** A story: its cast and shots, in the cinematics' own shape (played by the page's scene player, not kept in the Scenes list). The
 *  story before a battle ends on a smash cut into the fight; the beat after fades (CINE-001: the shot language, `sceneKit.ts`). */
const story = (id: string, title: string, look: Area, cast: Scene['cast'], shots: Shot[]): Scene => ({
  id: `qb-${id}`,
  title,
  blurb: title,
  moment: { kind: 'questBattle', battle: id },
  music: 'solemn',
  out: id.endsWith('After') ? 'fade' : 'smash',
  cast,
  shots: shots.map((s, i) => (i === 0 ? { look, fx: ['fadeIn'], ...s } : s)),
});
/** A quest giver, heard over the opening: their face fills the picture as they speak (`face:<giver>`). */
const giver = (key: string, name: string): CastMember => ({ role: `face:${key}`, x: 0, facing: 'right', hidden: true, name });
/** A boss's title card, as it arrives: its title over its name. */
const card = (name: string, title: string): Shot['title'] => ({ over: title, name });

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
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), rays: true, caption: 'The eastern bridge', lines: [tell('Lanterns on the water. Two men on the bridge. One of them has been here before.')] },
        { cam: close('kenji'), ...shoot('close', 'kenji', 'pushIn'), lines: [say('kenji', 'I lost a duel on this bridge when I was young. I have come back to *not* lose.')] },
        { cam: close(['kenji', 'hideo']), ...shoot('ots', 'hideo'), lines: [say('hideo', 'You were very young. And very loud.')] },
        { cam: close('kenji'), ...shoot('close', 'kenji', 'still', 'match'), lines: [say('kenji', 'I am older now.', undefined, 0.6)] },
        { cam: close('hideo'), ...shoot('close', 'hideo', 'pushIn'), lines: [say('hideo', 'We shall see about the loud.')] },
        { cam: wide(420, 205), ...shoot('low', 'oni', 'pushIn', 'smash'), acts: [{ who: 'oni', enter: 420, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Bridge Oni', 'Toll-Keeper of the Eastern Span'), lines: [tell('At the far end, something with a club and a ledger has set up a toll.')] },
        { cam: close('oni'), ...shoot('dutch', 'oni', 'drift'), lines: [say('oni', 'One coin a head. You have *two* heads. I will take both.', 'shout')] },
        { cam: close(['kenji', 'hideo']), ...shoot('two', undefined, 'snapZoom'), acts: [{ who: 'kenji', pose: 'strike' }], lines: [say('kenji', 'Quietly, then.', 'whisper')] },
      ]),
    after: () =>
      story('bridgeBladesAfter', 'Two Blades on the Bridge', 'shrine', { kenji: hero('samurai', 260), hideo: hero('samuraiCommander', 226) }, [
        { cam: close('hideo'), ...shoot('close', 'hideo', 'pushIn'), lines: [say('hideo', 'Better. Much quieter.')] },
        { cam: close('kenji'), ...shoot('close', 'kenji'), lines: [say('kenji', 'Then the next round at the tavern is mine. *Quietly.*')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), rays: true, hold: 1.4, lines: [tell('The lanterns drift on downriver. Nobody collects the toll again.')] },
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
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), weather: 'rain', caption: 'A cliff over the grey sea', lines: [tell('Grey sea, grey sky, and a ship\'s bell ringing from somewhere under the water.')] },
        { cam: close('harrow'), ...shoot('close', 'harrow', 'pushIn'), weather: 'rain', lines: [say('harrow', 'My first crew. They drowned with me, the first time. They took it worse than I did.')] },
        { cam: close(['tiago', 'harrow']), ...shoot('ots', 'tiago'), weather: 'rain', lines: [say('tiago', 'You said the wager was who pays for the rum.')] },
        { cam: close('harrow'), ...shoot('close', 'harrow', 'still', 'match'), weather: 'rain', lines: [say('harrow', 'It is. Whoever they climb up after *first* pays.')] },
        { cam: wide(420, 205), ...shoot('low', 'brine', 'pushIn', 'smash'), weather: 'rain', acts: [{ who: 'brine', enter: 420, from: 'right' }], cue: 'slam', title: card('Captain Brine', 'Master of the Drowned Watch'), lines: [say('brine', 'Captain Harrow. You left us the *bill*.', 'shout')] },
        { cam: close('tiago'), ...shoot('close', 'tiago', 'snapZoom'), weather: 'rain', lines: [say('tiago', 'He is looking at you. I win.')] },
      ]),
    after: () =>
      story('saltAndCannonAfter', 'Salt and Cannon', 'highlands', { tiago: hero('buccaneer', 260), harrow: hero('dreadPirate', 226) }, [
        { cam: close('harrow'), ...shoot('close', 'harrow', 'pushIn'), lines: [say('harrow', 'They came for me first. I win the wager.')] },
        { cam: close('tiago'), ...shoot('ots', 'tiago'), lines: [say('tiago', 'You *lose* the wager. Read it again.')] },
        { cam: wide(250, 205), ...shoot('wide', undefined, 'pullOut', 'dissolve'), hold: 1.2, lines: [tell('Neither of them has ever read it.')] },
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
      story('kilnRoad', 'The Kiln Road', 'volcano', { pedlar: giver('pedlar', 'The pedlar'), ravi: hero('wizard', 230), warden: foe('devilLeader', 420, 1.3, { name: 'The Ash Warden', hidden: true, shade: true }) }, [
        { cam: wide(290, 200), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'glow'], caption: 'The old kiln road', lines: [say('pedlar', 'My lucky crown is made of cinders. It is still smoking. It came from down there.')] },
        { cam: close('ravi'), ...shoot('close', 'ravi', 'pushIn'), fx: ['glow'], lines: [say('ravi', 'I have chased fire my whole life. It is about time it led *somewhere*.')] },
        { cam: close('ravi'), ...shoot('extreme', 'ravi', 'still', 'match'), fx: ['glow'], lines: [say('ravi', 'Somewhere with fewer imps, ideally.', 'whisper')] },
        { cam: wide(420, 200), ...shoot('low', 'warden', 'pushIn', 'smash'), acts: [{ who: 'warden', enter: 420, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], title: card('The Ash Warden', 'Keeper of the Kiln Road'), lines: [say('warden', 'The road is closed. The road has *always* been closed.', 'shout')] },
        { cam: close('ravi'), ...shoot('close', 'ravi', 'snapZoom'), lines: [say('ravi', 'Then I shall open it. I brought matches.')] },
      ]),
    after: () =>
      story('kilnRoadAfter', 'The Kiln Road', 'volcano', { ravi: hero('wizard', 260) }, [
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut'), lines: [tell('Where the Warden fell, a feather of grey ash lies on the stone. It does not crumble.')] },
        { cam: close('ravi'), ...shoot('close', 'ravi', 'pushIn'), lines: [say('ravi', 'Still warm. I am keeping it. Do not tell the pedlar.')] },
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
      story('frozenMeadow', 'The Frozen Meadow', 'snow', { hunter: giver('hunter', 'The hunter'), vuk: hero('werewolf', 236), b: hero(c[1] ?? 'beastmaster', 200), alpha: foe('alphaWolf', 420, 1.3, { name: 'The Rime Alpha', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'A meadow under the snow', lines: [say('hunter', 'The pack runs with frost on its back. And it is *following* something.')] },
        { cam: close('vuk'), ...shoot('close', 'vuk', 'pushIn'), lines: [say('vuk', 'Wolves do not follow. Wolves lead. Unless something bigger has taken the lead.')] },
        { cam: close(['vuk', 'b']), ...shoot('ots', 'b'), lines: [say('b', 'Then we ask them what. Politely, if we can.')] },
        { cam: wide(420, 205), ...shoot('low', 'alpha', 'pushIn', 'smash'), acts: [{ who: 'alpha', enter: 420, from: 'right' }], cue: 'eliteSting', title: card('The Rime Alpha', 'Leader of the Frost-Backed Pack'), hold: 1.2 },
        { cam: close('vuk'), ...shoot('extreme', 'vuk', 'still'), lines: [say('vuk', 'We cannot.', 'whisper', 0.6)] },
      ]),
    after: (c) =>
      story('frozenMeadowAfter', 'The Frozen Meadow', 'snow', { vuk: hero('werewolf', 260), b: hero(c[1] ?? 'beastmaster', 226) }, [
        { cam: wide(250, 205), ...shoot('wide', undefined, 'drift'), lines: [tell('A bell of clear ice lies where the Rime Alpha fell.')] },
        { cam: close('vuk'), ...shoot('close', 'vuk', 'pushIn'), lines: [say('vuk', 'Smells of winter. The *old* kind.')] },
        { cam: close('b'), ...shoot('close', 'b'), lines: [say('b', 'You sneezed on it.')] },
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
        { cam: wide(280, 205), ...shoot('wide', undefined, 'pan'), caption: 'A large hole', lines: [tell('Duchess has dug a hole in the courtyard. It is a *large* hole. It goes down.')] },
        { cam: close('duchess', 2), ...shoot('low', 'duchess', 'pushIn'), lines: [say('duchess', 'Mehh.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'Your Majesty, the goat has found a staircase.')] },
        { cam: close('b'), ...shoot('ots', 'b'), lines: [say('b', 'Tunnels. At last, somewhere that feels like home.')] },
        { cam: wide(430, 205), ...shoot('low', 'warden', 'pushIn', 'smash'), acts: [{ who: 'warden', enter: 430, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], title: card('The Mortar Warden', 'Keystone of the Old Keep'), hold: 1.2 },
        { cam: close('duchess', 2), ...shoot('close', 'duchess', 'still'), lines: [say('duchess', 'Mehh. (She is going first. Nobody argues.)')] },
      ]),
    after: (c) =>
      story('underCourtyardAfter', 'Under the Courtyard', 'ruins', { a: hero(c[0] ?? 'knight', 250), duchess: { role: 'duchess', x: 290, facing: 'left' } }, [
        { cam: wide(270, 205), ...shoot('high', undefined, 'pullOut'), lines: [tell('Under the rubble: a fist of stone the size of a cart, carved with the keep\'s own crest.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'The keep was built on something. *Someone*, perhaps.')] },
        { cam: close('duchess', 2), ...shoot('medium', 'duchess'), lines: [say('duchess', 'Mehh. (She is filling the hole back in. Badly.)')] },
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
      story('cellarTenant', 'What Knocks Below', 'dungeon', { gwen: giver('gwen', 'Gwen'), a: hero(c[0] ?? 'archer', 236), tenant: foe('boneCaptain', 420, 1.2, { name: 'The Cellar Tenant', hidden: true, shade: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'Gwen\'s cellar', lines: [say('gwen', 'Three knocks, a wait, then one. I have stopped counting and started charging *rent*.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), fx: ['darken'], lines: [say('a', 'Room for two of us down here, and a candle. Mind the good barrels.')] },
        { cam: wide(330, 205), ...shoot('wide', undefined, 'still'), fx: ['darken'], hold: 1.3, lines: [] },
        { cam: wide(420, 205), ...shoot('low', 'tenant', 'pushIn', 'smash'), acts: [{ who: 'tenant', enter: 420, from: 'right' }], cue: 'slam', fx: ['darken'], title: card('The Cellar Tenant', 'Knocker in the Dark'), lines: [say('tenant', 'Knock knock.', 'whisper')] },
        { cam: close('a'), ...shoot('extreme', 'a', 'still'), fx: ['darken'], lines: [say('a', 'Do *not*.')] },
      ]),
    after: (c) =>
      story('cellarTenantAfter', 'What Knocks Below', 'dungeon', { gwen: giver('gwen', 'Gwen'), a: hero(c[0] ?? 'archer', 260) }, [
        { cam: wide(280, 205), ...shoot('wide', undefined, 'drift'), lines: [tell('Behind the barrels: a brass door-knocker, on no door, still warm.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), lines: [say('a', 'It was knocking to be let in. Or out. I am not asking which.')] },
        { cam: close('a'), ...shoot('close', 'a'), lines: [say('gwen', 'Lovely. I shall hang it over the bar. Rent is still due.')] },
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
      story('sweptFloor', 'The Swept Floor', 'temple', { pilgrim: giver('pilgrim', 'The pilgrim'), a: hero(c[0] ?? 'cleric', 230), sweeper: foe('minotaurChampion', 420, 1.3, { name: 'The Sweeper', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), rays: true, caption: 'The heart of the Labyrinth', lines: [say('pilgrim', 'The last shrine is only a floor, swept very clean. Someone sweeps it every night.')] },
        { cam: close('a'), ...shoot('close', 'a', 'pushIn'), rays: true, lines: [say('a', 'Then I should like to meet the one who keeps it.')] },
        { cam: wide(420, 205), ...shoot('low', 'sweeper', 'pushIn', 'smash'), acts: [{ who: 'sweeper', enter: 420, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Sweeper', 'Keeper of the Clean Floor'), lines: [say('sweeper', 'BOOTS.', 'shout', 0.4)] },
        { cam: close('a'), ...shoot('close', 'a', 'still'), lines: [say('a', 'Ah. We have met.')] },
        { cam: close('sweeper'), ...shoot('dutch', 'sweeper', 'drift'), lines: [say('sweeper', 'OFF. THE. *FLOOR.*', 'shout')] },
      ]),
    after: (c) =>
      story('sweptFloorAfter', 'The Swept Floor', 'temple', { a: hero(c[0] ?? 'cleric', 250), sweeper: foe('minotaurChampion', 330, 1.3, { name: 'The Sweeper' }) }, [
        { cam: close(['a', 'sweeper']), ...shoot('high', 'sweeper', 'pullOut'), acts: [{ who: 'sweeper', pose: 'down' }], lines: [say('a', 'Rest. I will sweep tonight.')] },
        { cam: wide(300, 205), ...shoot('wide', undefined, 'drift', 'dissolve'), rays: true, lines: [tell('She does. It takes until morning. The floor has never been cleaner.')] },
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
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'Where the paperwork rots', lines: [tell('The pact\'s small print has a clause about audits. It is in *even smaller* print.')] },
        { cam: close('zofia'), ...shoot('close', 'zofia', 'pushIn'), fx: ['darken'], lines: [say('zofia', 'I read every word. I *always* read every word.')] },
        { cam: wide(420, 205), ...shoot('low', 'quill', 'pushIn', 'smash'), acts: [{ who: 'quill', enter: 420, from: 'right' }], cue: 'slam', title: card('Mr Quill', 'Auditor of the Ninth Ledger'), lines: [say('quill', 'Clause nine, sub-clause hell: a show of strength, by readers only.')] },
        { cam: close('quill'), ...shoot('dutch', 'quill', 'drift'), lines: [say('quill', 'Any discrepancy is payable in *souls*. Initial here.')] },
        { cam: close('zofia'), ...shoot('close', 'zofia', 'snapZoom'), lines: [say('zofia', 'Only casters, then. Anyone who hits things can wait in the cart.')] },
      ]),
    after: () =>
      story('theAuditAfter', 'The Audit', 'swamp', { zofia: hero('warlock', 260) }, [
        { cam: close('zofia'), ...shoot('close', 'zofia', 'pushIn'), lines: [say('zofia', 'Audit passed. My soul is mine until next quarter.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), lines: [tell('Mr Quill\'s ledger is left behind. Somebody has underlined "reasonable".')] },
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
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'Midnight, the chapel yard', lines: [tell('The audience has been dead for two hundred years. They are *very* attentive.')] },
        { cam: close('lovell'), ...shoot('close', 'lovell', 'pushIn'), fx: ['darken'], lines: [say('lovell', 'Soft, then. A lullaby. Nobody wakes, nobody gets up, nobody gets eaten.')] },
        { cam: wide(420, 205), ...shoot('low', 'conductor', 'pushIn', 'smash'), acts: [{ who: 'conductor', enter: 420, from: 'right' }], cue: 'eliteSting', title: card('The Conductor', 'Who Beats Time on Bones'), lines: [say('conductor', 'Too slow.', 'whisper')] },
        { cam: close('conductor'), ...shoot('dutch', 'conductor', 'snapZoom', 'flash'), lines: [say('conductor', '*FORTISSIMO.*', 'shout', 0.4)] },
        { cam: close('lovell'), ...shoot('close', 'lovell', 'still'), lines: [say('lovell', 'Oh, no you do not.')] },
      ]),
    after: () =>
      story('recitalNightAfter', 'The Midnight Recital', 'graveyard', { lovell: hero('wolfBard', 260) }, [
        { cam: close('lovell'), ...shoot('close', 'lovell', 'pushIn'), lines: [say('lovell', 'And back to sleep, all of you. Lights out. Encore next century.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), lines: [tell('Nobody claps. It is the highest praise the dead can give.')] },
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
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken', 'rumble'], caption: 'The last door', lines: [tell('the voice came back. it said: one more. it said: bring the one who keeps the hour.')] },
        { cam: close('vesper'), ...shoot('close', 'vesper', 'pushIn'), fx: ['darken'], lines: [say('vesper', 'Every door closes at the last hour. I have come to close *this* one.')] },
        { cam: wide(430, 205), ...shoot('low', 'door', 'pushIn', 'smash'), acts: [{ who: 'door', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Door That Was Karnok', 'What Is Left of the Last Door'), lines: [tell('Karnok fell. His door did not get the message.')] },
        { cam: close('vesper'), ...shoot('extreme', 'vesper', 'still'), lines: [say('vesper', 'Then I shall deliver it.', 'whisper')] },
      ]),
    after: () =>
      story('karnoksDoorAfter', 'Karnok\'s Door', 'crystal', { vesper: hero('reaper', 260) }, [
        { cam: close('vesper'), ...shoot('close', 'vesper', 'pushIn'), lines: [say('vesper', 'Closed. Locked. I have kept the key, in case it gets ideas.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), lines: [tell('thank you, says the voice, very quietly. then nothing.')] },
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
      story('wolfDen', 'The White Wolf\'s Den', 'forest', { hunter: giver('hunter', 'The hunter'), inti: hero('ranger', 230), tusk: foe('boarKing', 420, 1.3, { name: 'Old Tusk', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), rays: true, caption: 'Up the old trail', lines: [say('hunter', 'One last thing: see the white wolf\'s den is empty, so the cubs can come home.')] },
        { cam: close('inti'), ...shoot('close', 'inti', 'pushIn'), lines: [say('inti', 'Snares are where she left them. Tracks are not hers. Something heavy has moved in.')] },
        { cam: wide(420, 205), ...shoot('low', 'tusk', 'pushIn', 'smash'), acts: [{ who: 'tusk', enter: 420, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], title: card('Old Tusk', 'Squatter in the White Den'), hold: 1.3 },
        { cam: close('inti'), ...shoot('extreme', 'inti', 'still'), lines: [say('inti', 'Something *very* heavy.', 'whisper')] },
      ]),
    after: () =>
      story('wolfDenAfter', 'The White Wolf\'s Den', 'forest', { inti: hero('ranger', 260) }, [
        { cam: close('inti'), ...shoot('close', 'inti', 'pushIn'), lines: [say('inti', 'Empty, and swept out. The cubs will find it as she left it.')] },
        { cam: wide(330, 200), ...shoot('wide', undefined, 'pullOut', 'dissolve'), rays: true, hold: 1.2, lines: [tell('Far off, three white shapes watch from the ridge, then turn for home.')] },
      ]),
  },
];
