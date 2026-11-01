// The lost techniques' quest battles (LOST-TECHNIQUES, `docs/notes/lost-techniques.md`): the last part of each of the four chains in
// `questData/lost.ts`, run on the quest battles' machinery (`questBattles.ts`) like the hero tales' (`taleBattleData.ts`). Each has a land
// of its own, a boss with a name and a title on an existing foe (who keeps its kit), a required hero, and a short story before and after.
//
// - **The Empty Dojo** (Ninefold Cut): Kenji; yokai students and the Last Master, a pale captain who blinks between his students.
// - **The Unwritten Library** (Words of Unmaking): Ravi; the rift's things among the shelves, and the Index, a golem of books.
// - **Matins at the Chapel** (the Long Dawn): Selam or Linnea; four waves of the Undead Legion and no boss, the last wave a long one.
// - **The Den Beneath the Snow** (the Old Hunger): Vuk; frost wolves and the Grandmother Wolf, who calls her pack.
//
// The voice: dry and warm, in British spelling. Pure data: no Pixi, no DOM.

import { close, say, shoot, tell, wide, type CastMember, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import type { QuestBattle } from './questBattles';
import { heroName } from './heroNames';

const hero = (kind: string, x: number, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'right', name: heroName(kind), ...more });
const foe = (kind: string, x: number, scale = 1.2, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'left', scale, ...more });
const card = (name: string, title: string): Shot['title'] => ({ over: title, name });

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

export const LOST_BATTLES: readonly QuestBattle[] = [
  {
    // (The Ninefold Cut, part 3: the Bridge School's last master, who has been waiting nine hundred years for a worthy guest)
    id: 'emptyDojo',
    title: 'The Empty Dojo',
    blurb: 'A ruined hall on a hill, its students still lined up and still bowing, and a master at the far end who blinks between them.',
    land: 'shrine',
    like: { army: 'wildwood', wave: 14 },
    ease: 2.2,
    cast: [{ heroes: ['samurai'] }],
    waves: [
      { foes: ['yokaiFox', 'yokaiMonk', 'yokaiFox'] },
      { foes: ['yokaiCrow', 'yokaiMonk', 'yokaiFox', 'yokaiCrow'] },
      { foes: ['boneCaptain', 'yokaiMonk', 'yokaiFox', 'yokaiCrow'], boss: 'final' },
    ],
    boss: { name: 'The Last Master', title: 'Of the Bridge School' },
    before: (c) =>
      story('emptyDojo', 'The Empty Dojo', 'shrine', { kenji: hero(c[0] ?? 'samurai', 230), master: foe('boneCaptain', 440, 1.3, { name: 'The Last Master', hidden: true, shade: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), rays: true, caption: 'The Bridge School, up the pilgrim road', lines: [tell('Every door is open. The floor is swept. Down both sides of the hall, rows of students stand with their heads bowed, and none of them has moved in some time.')] },
        { cam: close('kenji'), ...shoot('close', 'kenji', 'pushIn'), lines: [say('kenji', 'I was told it was empty. I think "empty" was a kindness.')] },
        { cam: wide(440, 205), ...shoot('low', 'master', 'pushIn', 'smash'), acts: [{ who: 'master', enter: 440, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Last Master', 'Of the Bridge School'), lines: [say('master', 'A visitor. Nine hundred years, and a visitor. Draw, if you would. I have been so very patient.', 'shout')] },
        { cam: close('kenji'), ...shoot('close', 'kenji', 'snapZoom'), acts: [{ who: 'kenji', pose: 'strike' }], lines: [say('kenji', 'Only the one cut. I have heard it is plenty.')] },
      ]),
    after: (c) =>
      story('emptyDojoAfter', 'The Empty Dojo', 'shrine', { kenji: hero(c[0] ?? 'samurai', 250) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), rays: true, lines: [tell('The master sheathes his sword and bows, and the rows of students bow after him, the way a field of barley does when the wind drops.')] },
        { cam: close('kenji'), ...shoot('close', 'kenji', 'still', 'dissolve'), hold: 1.2, lines: [say('kenji', 'Nine hundred years, and he finally lost. I think he was relieved. I think I would be.')] },
      ]),
  },
  {
    // (Words of Unmaking, part 3: the rift's library, whose keeper does not lend)
    id: 'unwrittenLibrary',
    title: 'The Unwritten Library',
    blurb: 'A dark arena of shelves in the rift: two waves of its things, and the Index, who does not lend and walls tiles off.',
    land: 'crystal',
    like: { army: 'wildwood', wave: 13 },
    ease: 2,
    cast: [{ heroes: ['wizard'] }],
    waves: [
      { foes: ['crystalGolem', 'yokaiSeer', 'yokaiWitch'] },
      { foes: ['stoneGolem', 'yokaiSeer', 'yokaiWitch', 'crystalGolem'] },
      { foes: ['sapphireColossus', 'yokaiSeer', 'yokaiWitch', 'crystalGolem'], boss: 'final' },
    ],
    boss: { name: 'The Index', title: 'Keeper of the Unwritten Library' },
    before: (c) =>
      story('unwrittenLibrary', 'The Unwritten Library', 'crystal', { ravi: hero(c[0] ?? 'wizard', 230), index: foe('sapphireColossus', 450, 1.2, { name: 'The Index', hidden: true, shade: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), weather: 'motes', caption: 'A library that was never built', lines: [tell('Shelves go up into the dark and do not come down. Not one of the books has a title. A few have been put back the wrong way round.')] },
        { cam: close('ravi'), ...shoot('close', 'ravi', 'pushIn'), fx: ['glow'], lines: [say('ravi', 'It is the first library I have walked into that I wanted to set fire to, and the first I am worried might be right.')] },
        { cam: wide(450, 205), ...shoot('low', 'index', 'pushIn', 'smash'), acts: [{ who: 'index', enter: 450, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], title: card('The Index', 'Keeper of the Unwritten Library'), lines: [say('index', 'NOTHING MAY BE BORROWED. NOTHING MAY BE ENTERED. NOTHING IS FILED UNDER YOU.', 'shout')] },
        { cam: close('ravi'), ...shoot('close', 'ravi', 'snapZoom'), lines: [say('ravi', 'Then I am, at long last, a first edition.')] },
      ]),
    after: (c) =>
      story('unwrittenLibraryAfter', 'The Unwritten Library', 'crystal', { ravi: hero(c[0] ?? 'wizard', 250) }, [
        { cam: wide(290, 205), ...shoot('high', undefined, 'pullOut'), weather: 'motes', lines: [tell('The Index comes apart into a heap of blank pages, and the heap, politely, settles. One page stays upright, and heavy, and waits.')] },
        { cam: close('ravi'), ...shoot('close', 'ravi', 'still', 'dissolve'), hold: 1.2, lines: [say('ravi', 'It is blank. Every page.'), say('ravi', 'No. It is just written on the other side of something.', 'whisper')] },
      ]),
  },
  {
    // (The Hymn of the Long Dawn, part 3: the dead keep Matins at a chapel whose sun is not up. No boss; the last wave simply goes on)
    id: 'matinsChapel',
    title: 'Matins at the Chapel',
    blurb: 'The chapel at the dark before dawn: four waves of the Undead Legion, and a last one that is long and does not stop.',
    land: 'temple',
    like: { army: 'wildwood', wave: 12 },
    ease: 2.4,
    cast: [{ heroes: ['cleric', 'priestess'] }],
    waves: [
      { foes: ['skeleton', 'spearman', 'skeleton'] },
      { foes: ['spearman', 'boneVolley', 'skeleton', 'spearman'] },
      { foes: ['skeleton', 'boneVolley', 'spearman', 'skeleton', 'boneVolley'] },
      { foes: ['boneCaptain', 'skeleton', 'spearman', 'boneVolley', 'skeleton', 'spearman'], boss: 'final' },
    ],
    boss: { name: 'The Sexton of the Dark', title: 'Who Rings Matins Early' },
    before: (c) =>
      story('matinsChapel', 'Matins at the Chapel', 'temple', { sing: hero(c[0] ?? 'cleric', 230), sexton: foe('boneCaptain', 450, 1.3, { name: 'The Sexton of the Dark', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), weather: 'motes', rays: true, caption: 'The chapel, an hour before the sun', lines: [tell('The candles are lit. The pews are full. Nobody in them is breathing, and everybody is on time.')] },
        { cam: close('sing'), ...shoot('close', 'sing', 'pushIn'), lines: [say('sing', 'I do not know the words. I know the shape of them, the way you know a stair in the dark.')] },
        { cam: wide(450, 205), ...shoot('low', 'sexton', 'pushIn', 'smash'), acts: [{ who: 'sexton', enter: 450, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Sexton of the Dark', 'Who Rings Matins Early'), lines: [say('sexton', 'Matins is at dawn. It has been dawn for forty years. Do sit down.', 'shout')] },
        { cam: close('sing'), ...shoot('close', 'sing', 'snapZoom'), lines: [say('sing', 'We will stand, thank you. And we will be singing.')] },
      ]),
    after: (c) =>
      story('matinsChapelAfter', 'Matins at the Chapel', 'temple', { sing: hero(c[0] ?? 'cleric', 250) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), weather: 'motes', rays: true, lines: [tell('Light comes in at the east window and the north wall first, and lies along the pews, and the pews, one by one, are empty.')] },
        { cam: close('sing'), ...shoot('close', 'sing', 'still', 'dissolve'), hold: 1.2, lines: [say('sing', 'We did not know the words. The wounded did.')] },
      ]),
  },
  {
    // (The Old Hunger, part 3: the oldest of the packs lies under the snow, and will give the hide to no one who runs)
    id: 'snowDen',
    title: 'The Den Beneath the Snow',
    blurb: 'A den under a snow field: three waves of frost wolves, and the Grandmother Wolf, huge and white, who calls her pack.',
    land: 'snow',
    like: { army: 'wildwood', wave: 14 },
    ease: 1.75,
    cast: [{ heroes: ['werewolf'] }],
    waves: [
      { foes: ['wolfWhite', 'wolfWhite', 'packWhite'] },
      { foes: ['packWhite', 'wolfWhite', 'packRed', 'wolfWhite'] },
      { foes: ['alphaWolf', 'packWhite', 'wolfWhite', 'packWhite'], boss: 'final' },
    ],
    boss: { name: 'The Grandmother Wolf', title: 'First of the Packs' },
    before: (c) =>
      story('snowDen', 'The Den Beneath the Snow', 'snow', { vuk: hero(c[0] ?? 'werewolf', 230), gran: foe('alphaWolf', 450, 1.5, { name: 'The Grandmother Wolf', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), weather: 'snow', caption: 'A den under the snow', lines: [tell('The snow here is deep and clean and has never been walked on. Below the drift, something very old is awake, and very hungry, and not at all in a hurry.')] },
        { cam: close('vuk'), ...shoot('close', 'vuk', 'pushIn'), weather: 'snow', lines: [say('vuk', 'She wrote the hide. She will know if I run. So I will walk in loudly instead.')] },
        { cam: wide(450, 205), ...shoot('low', 'gran', 'pushIn', 'smash'), weather: 'snow', acts: [{ who: 'gran', enter: 450, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Grandmother Wolf', 'First of the Packs'), lines: [say('gran', 'Little cousin. You smell of fire and of company. Show me what the company has been eating.', 'shout')] },
        { cam: close('vuk'), ...shoot('close', 'vuk', 'snapZoom'), weather: 'snow', lines: [say('vuk', 'Mostly packs. Yours, I am afraid, among them.')] },
      ]),
    after: (c) =>
      story('snowDenAfter', 'The Den Beneath the Snow', 'snow', { vuk: hero(c[0] ?? 'werewolf', 250) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), weather: 'snow', lines: [tell('The Grandmother lies down in the snow, and her pack lies down round her, and the white wind drops, and nobody speaks for a while.')] },
        { cam: close('vuk'), ...shoot('close', 'vuk', 'still', 'dissolve'), hold: 1.2, lines: [say('vuk', 'She said not to waste it. I intend to be a terrible waste of nothing at all.')] },
      ]),
  },
];
