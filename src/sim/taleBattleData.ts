// The hero quests' own battles (SECRET-HEROES, `docs/notes/secret-heroes.md`): one each, the last part of a tale told in the tavern
// (`questData/tales.ts`), at whose end a secret hero joins. They run on the quest battles' machinery (`questBattles.ts`: strength, cast,
// seed, save slot, Try again, practice replays) and are opened by their quest as any battle quest is. Kept apart from the eleven
// ordinary battles (`questBattleData.ts`) and the Eidolon chains' (`chainBattleData.ts`).
//
// The cast rule is the chains': the one slot takes a hero of either starter pack, with every other starter hero standing in, so any
// save can field it. The hero the tale is about is in each story only as a stranger: a dark figure, never named, never in a close-up
// (a close-up would show the hero's painted portrait), so the story keeps the secret the hand-in then reveals.
//
// Pure data: no Pixi, no DOM.

import { say, shoot, tell, wide, type CastMember, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import type { QuestBattle } from './questBattles';
import { heroName } from './heroNames';

const hero = (kind: string, x: number, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'right', name: heroName(kind), ...more });
const foe = (kind: string, x: number, scale = 1.2, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'left', scale, ...more });
/** The tale's hero, unrevealed: a black figure called only "The stranger" (`shade`), so neither the name nor the look is given away. */
const stranger = (kind: string, x: number, facing: 'left' | 'right' = 'left'): CastMember => ({ role: `unit:${kind}`, x, facing, shade: true, name: 'The stranger' });
/** A quest giver, heard over the opening: their face fills the picture as they speak (`face:<giver>`). */
const giver = (key: string, name: string): CastMember => ({ role: `face:${key}`, x: 0, facing: 'right', hidden: true, name });
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

/** The one slot: a hero from either starter pack (the first owned), any other starter hero standing in. */
const STARTER_SLOT = (first: readonly string[]) => ({ heroes: first, standIns: ['knight', 'samurai', 'archer', 'peasant', 'kunoichi', 'wizard'].filter((k) => !first.includes(k)) });

export const TALE_BATTLES: readonly QuestBattle[] = [
  {
    // (The Thing at the Fold, part 2: the moonlit pack comes for Maud's fold, and for the stranger hiding in it)
    id: 'moonFold',
    title: 'The Moonlit Fold',
    blurb: "Old Maud's fold under a full moon: a white-eyed pack comes for the sheep, and for something hiding among them.",
    land: 'plains',
    like: { army: 'beasts', wave: 12 },
    ease: 1,
    cast: [STARTER_SLOT(['knight', 'peasant'])],
    waves: [
      { foes: ['packBlack', 'packBlack', 'packRed'] },
      { foes: ['packRed', 'packBlack', 'packWhite', 'packRed'] },
      { foes: ['alphaWolf', 'packWhite', 'packRed', 'packBlack'], boss: 'final' },
    ],
    boss: { name: 'The Grey Widow', title: 'Mother of the Moonlit Pack' },
    before: (c) =>
      story('moonFold', 'The Moonlit Fold', 'plains', { maud: giver('shepherd', 'Old Maud'), a: hero(c[0] ?? 'knight', 220), who: stranger('werewolf', 330), widow: foe('alphaWolf', 450, 1.3, { name: 'The Grey Widow', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'The high fold, at the full moon', lines: [say('maud', 'Sheep in, gate shut, lamp lit. And the thing in my fold, sitting very still at the back.')] },
        { cam: wide(330, 205), ...shoot('medium', 'who', 'pushIn'), lines: [tell('A shape among the sheep, too big for a sheep, too quiet for a wolf. The sheep do not mind it at all.')] },
        { cam: wide(300, 205), ...shoot('two', 'a'), lines: [say('a', 'You. Are you the one taking her lambs?'), say('who', 'I have never taken one. I have been keeping them from *her*.', 'whisper')] },
        { cam: wide(450, 205), ...shoot('low', 'widow', 'pushIn', 'smash'), acts: [{ who: 'widow', enter: 450, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Grey Widow', 'Mother of the Moonlit Pack'), lines: [say('widow', 'Give me back my runaway, and I will leave you the sheep. Mostly.', 'shout')] },
        { cam: wide(260, 205), ...shoot('medium', 'a', 'snapZoom'), acts: [{ who: 'a', pose: 'strike' }], lines: [say('a', 'Nobody is being given back. Nobody is being eaten. Gate, please, Maud.')] },
      ]),
    after: (c) =>
      story('moonFoldAfter', 'The Moonlit Fold', 'plains', { a: hero(c[0] ?? 'knight', 240), who: stranger('werewolf', 340) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), lines: [tell('The pack is gone over the hill. The moon goes behind a cloud, and the shape at the back of the fold stands up on two legs.')] },
        { cam: wide(300, 205), ...shoot('two', 'a', 'still', 'dissolve'), hold: 1.2, lines: [say('who', 'You stood between me and her. Nobody has done that. Tell the old woman I will come down to her fire.', 'whisper')] },
      ]),
  },
  {
    // (A Sellsword in Chains, part 3: the tide brings the stranger's second crew up the moat, to take their captain home)
    id: 'chainsTide',
    title: 'The Tide in the Moat',
    blurb: "A drowned crew wades up the keep's moat at the spring tide, to take their chained captain back down with them.",
    land: 'swamp',
    like: { army: 'wildwood', wave: 11 },
    ease: 1.2,
    cast: [STARTER_SLOT(['samurai', 'kunoichi'])],
    waves: [
      { foes: ['skeleton', 'boneVolley', 'skeleton'] },
      { foes: ['spearman', 'skeleton', 'boneVolley', 'skeleton'] },
      { foes: ['boneCaptain', 'spearman', 'boneVolley', 'skeleton'], boss: 'final' },
    ],
    boss: { name: 'Mistress Marrow', title: 'First Mate of the Second Drowning' },
    before: (c) =>
      story('chainsTide', 'The Tide in the Moat', 'swamp', { brannock: giver('gaoler', 'Brannock'), a: hero(c[0] ?? 'samurai', 220), who: stranger('dreadPirate', 320), marrow: foe('boneCaptain', 450, 1.3, { name: 'Mistress Marrow', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), weather: 'rain', caption: "The keep's moat, at the spring tide", lines: [say('brannock', 'Spring tide. The moat is up to the cell grates, and he says that is when they come.')] },
        { cam: wide(320, 205), ...shoot('medium', 'who'), weather: 'rain', lines: [tell('The prisoner stands at the water in his chains, as if he were waiting for a boat.'), say('who', 'My second crew. Drowned with me the second time. They were never good at letting go.')] },
        { cam: wide(290, 205), ...shoot('two', 'a'), weather: 'rain', lines: [say('a', 'And if we hand you over?'), say('who', 'Then they will want the rest of you after. They always want a full crew.')] },
        { cam: wide(450, 205), ...shoot('low', 'marrow', 'pushIn', 'smash'), weather: 'rain', acts: [{ who: 'marrow', enter: 450, from: 'right' }], cue: 'slam', title: card('Mistress Marrow', 'First Mate of the Second Drowning'), lines: [say('marrow', 'Captain. You are late for the bottom of the sea.', 'shout')] },
        { cam: wide(260, 205), ...shoot('medium', 'a', 'snapZoom'), weather: 'rain', lines: [say('a', 'He is our prisoner. Get your own.')] },
      ]),
    after: (c) =>
      story('chainsTideAfter', 'The Tide in the Moat', 'swamp', { a: hero(c[0] ?? 'samurai', 240), who: stranger('dreadPirate', 330) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), lines: [tell('The tide goes out. It takes the bones with it and leaves a man in chains, laughing in the mud.')] },
        { cam: wide(300, 205), ...shoot('two', 'a', 'still', 'dissolve'), hold: 1.2, lines: [say('who', 'Twice drowned and still owed a wage. Tell your turnkey I will sign whatever he likes. Bring the key.')] },
      ]),
  },
  {
    // (The Iron Pilgrim, part 2: the Forge's foreman sends its golems to fetch back the walker that left)
    id: 'ironMarch',
    title: 'The Long March',
    blurb: 'Something huge in iron has walked out of the Golem Forge towards the keep, and the Forge wants it back.',
    land: 'forge',
    like: { army: 'golems', wave: 12 },
    ease: 0.33,
    cast: [STARTER_SLOT(['knight', 'wizard'])],
    waves: [
      { foes: ['stoneGolem', 'ironGolem', 'stoneGolem'] },
      { foes: ['crystalGolem', 'magmaGolem', 'stoneGolem', 'ironGolem'] },
      { foes: ['forgeTitan', 'ironGolem', 'magmaGolem', 'stoneGolem'], boss: 'final' },
    ],
    boss: { name: 'The Foreman', title: 'Who Counts Every Stone' },
    before: (c) =>
      story('ironMarch', 'The Long March', 'forge', { edda: giver('smith', 'Edda Coalbrook'), a: hero(c[0] ?? 'knight', 220), who: stranger('juggernaut', 330, 'right'), foreman: foe('forgeTitan', 460, 1.3, { name: 'The Foreman', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), caption: 'The road down from the Forge', lines: [say('edda', 'There. See it? Walking. It has walked all night and it has not once looked back.')] },
        { cam: wide(330, 205), ...shoot('medium', 'who', 'track'), acts: [{ who: 'who', walk: 360 }], lines: [tell('A shape the size of a gatehouse, one heavy step at a time, with a door strapped to its back like a pack.')] },
        { cam: wide(300, 205), ...shoot('two', 'a'), lines: [say('a', 'Where are you going?'), say('who', 'Somewhere. With walls. Walls need carrying.')] },
        { cam: wide(460, 205), ...shoot('low', 'foreman', 'pushIn', 'smash'), acts: [{ who: 'foreman', enter: 460, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], title: card('The Foreman', 'Who Counts Every Stone'), lines: [say('foreman', 'ONE STONE MISSING. ONE STONE RETURNS. COUNT RESUMES.', 'shout')] },
        { cam: wide(260, 205), ...shoot('medium', 'a', 'snapZoom'), lines: [say('a', 'Then count us too.')] },
      ]),
    after: (c) =>
      story('ironMarchAfter', 'The Long March', 'forge', { a: hero(c[0] ?? 'knight', 240), who: stranger('juggernaut', 340) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), lines: [tell('The Foreman falls in pieces, and stops counting. The walker sets its door down on the road, very gently.')] },
        { cam: wide(300, 205), ...shoot('two', 'a', 'still', 'dissolve'), hold: 1.2, lines: [say('who', 'Free. Good. Tell the small smith: I come to her fire. I carry my own door.')] },
      ]),
  },
];
