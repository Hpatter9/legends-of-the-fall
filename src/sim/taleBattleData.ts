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

  /* ------------------------------------------------------------ HERO-TALES-2: the other seven tales' battles */
  {
    // (The Ledger of the Unburied, part 3: the Legion comes to the chapel yard for the sexton's ledger, and the visitor stands at the gate)
    id: 'thirteenthBell',
    title: 'The Thirteenth Bell',
    blurb: "The chapel bell rings thirteen, and the Undead Legion climbs the yard wall for Sexton Pell's ledger of names.",
    land: 'graveyard',
    like: { army: 'labyrinth', wave: 12 },
    ease: 0.95,
    cast: [STARTER_SLOT(['archer', 'wizard'])],
    waves: [
      { foes: ['skeleton', 'spearman', 'boneVolley', 'skeleton'] },
      { foes: ['boneCaptain', 'spearman', 'boneVolley', 'skeleton'], boss: 'mid' },
      { foes: ['lichKing', 'spearman', 'boneVolley', 'skeleton', 'skeleton'], boss: 'final' },
    ],
    boss: { name: 'The Roll-Caller', title: 'Who Reads the Names of the Dead' },
    before: (c) =>
      story('thirteenthBell', 'The Thirteenth Bell', 'graveyard', { pell: giver('sexton', 'Sexton Pell'), a: hero(c[0] ?? 'archer', 220), who: stranger('reaper', 330), caller: foe('lichKing', 460, 1.3, { name: 'The Roll-Caller', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), weather: 'motes', caption: 'The chapel yard, at the thirteenth bell', lines: [say('pell', 'Twelve, and then thirteen. There is no thirteen. The bell does not go that high.')] },
        { cam: wide(330, 205), ...shoot('medium', 'who', 'pushIn'), weather: 'motes', lines: [tell('At the lychgate a thin figure waits with a ledger under one arm and something long and curved over its shoulder.')] },
        { cam: wide(300, 205), ...shoot('two', 'a'), lines: [say('a', 'Is that what I think it is?'), say('who', 'It is for the long grass. Mostly.', 'whisper')] },
        { cam: wide(460, 205), ...shoot('low', 'caller', 'pushIn', 'smash'), acts: [{ who: 'caller', enter: 460, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Roll-Caller', 'Who Reads the Names of the Dead'), lines: [say('caller', 'Give me the book. Every name in it is one of mine.', 'shout')] },
        { cam: wide(260, 205), ...shoot('medium', 'a', 'snapZoom'), acts: [{ who: 'a', pose: 'strike' }], lines: [say('a', 'Then come and read them off the gate.')] },
      ]),
    after: (c) =>
      story('thirteenthBellAfter', 'The Thirteenth Bell', 'graveyard', { a: hero(c[0] ?? 'archer', 240), who: stranger('reaper', 340) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), lines: [tell('The bell stops. The Legion lies down where it fell, and for once it stays down.')] },
        { cam: wide(300, 205), ...shoot('two', 'a', 'still', 'dissolve'), hold: 1.2, lines: [say('who', 'Every name accounted for. Tell the sexton I shall come in for that cup of tea.', 'whisper')] },
      ]),
  },
  {
    // (The Pawned Blade, part 2: the Infernal Host's collectors come up Lantern Row for the sword and the man who owns it)
    id: 'debtCollectors',
    title: 'The Debt Collectors',
    blurb: "The Infernal Host sends its collectors up Lantern Row with a cart and a ledger, to take back a sword, and the man who carries it.",
    land: 'desert',
    like: { army: 'golems', wave: 9 },
    ease: 0.48,
    cast: [STARTER_SLOT(['samurai', 'peasant'])],
    waves: [
      { foes: ['hellImp', 'hellImp', 'hellDemon'] },
      { foes: ['hellDemon', 'hellImp', 'hellDemon', 'hellImp'] },
      { foes: ['devilLeader', 'hellImp', 'hellDemon', 'hellImp'], boss: 'final' },
    ],
    boss: { name: 'Paymaster Grisk', title: 'Who Docks Every Wage' },
    before: (c) =>
      story('debtCollectors', 'The Debt Collectors', 'desert', { ottilie: giver('pawnbroker', 'Ottilie Marsh'), a: hero(c[0] ?? 'samurai', 220), who: stranger('demonSwordsman', 330), grisk: foe('devilLeader', 460, 1.2, { name: 'Paymaster Grisk', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), weather: 'embers', caption: 'Lantern Row, where the town meets the ash road', lines: [say('ottilie', 'Shutters up, cat in the back. If anyone breaks my window, they are buying it.')] },
        { cam: wide(330, 205), ...shoot('medium', 'who', 'pushIn'), weather: 'embers', lines: [tell('Her customer waits in the middle of the street, the black sword on his shoulder, very calm for a man who owes Hell money.')] },
        { cam: wide(300, 205), ...shoot('two', 'a'), lines: [say('a', 'How much do you owe them?'), say('who', 'Nothing. That is what they cannot forgive.')] },
        { cam: wide(460, 205), ...shoot('low', 'grisk', 'pushIn', 'smash'), acts: [{ who: 'grisk', enter: 460, from: 'right' }], cue: 'slam', fx: ['shake'], title: card('Paymaster Grisk', 'Who Docks Every Wage'), lines: [say('grisk', 'One sword, Host property. One swordsman, Host property. Plus interest. Plus the cart.', 'shout')] },
        { cam: wide(260, 205), ...shoot('medium', 'a', 'snapZoom'), acts: [{ who: 'a', pose: 'strike' }], lines: [say('a', 'Take it up with the keep. We pay on time.')] },
      ]),
    after: (c) =>
      story('debtCollectorsAfter', 'The Debt Collectors', 'desert', { a: hero(c[0] ?? 'samurai', 240), who: stranger('demonSwordsman', 340) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), lines: [tell('The cart burns out in the road. The collectors are gone, and so, at last, is the debt.')] },
        { cam: wide(300, 205), ...shoot('two', 'a', 'still', 'dissolve'), hold: 1.2, lines: [say('who', 'A master who pays on time. I had heard of such things. Tell the pawnbroker to keep the ticket.')] },
      ]),
  },
  {
    // (The Banner in the Mist, part 3: the Night Parade comes up the shrine road to put out a hundred lanterns, and the soldier holds it)
    id: 'hundredLanterns',
    title: 'A Hundred Lanterns',
    blurb: 'A hundred lanterns burn up the shrine road to a banner in the mist, and the whole Night Parade comes to put them out.',
    land: 'shrine',
    like: { army: 'golems', wave: 13 },
    ease: 0.47,
    cast: [STARTER_SLOT(['kunoichi', 'knight'])],
    waves: [
      { foes: ['yokaiFox', 'yokaiCrow', 'yokaiMonk', 'yokaiCrow'] },
      { foes: ['yokaiWitch', 'yokaiSeer', 'yokaiMonk', 'yokaiFox'] },
      { foes: ['nineTails', 'yokaiCrow', 'yokaiWitch', 'yokaiSeer', 'yokaiMonk'], boss: 'final' },
    ],
    boss: { name: 'Kagari of the Nine Tails', title: 'Who Leads the Parade Astray' },
    before: (c) =>
      story('hundredLanterns', 'A Hundred Lanterns', 'shrine', { kiku: giver('lantern', 'Kiku'), a: hero(c[0] ?? 'kunoichi', 220), who: stranger('samuraiCommander', 330), kagari: foe('nineTails', 460, 1.2, { name: 'Kagari of the Nine Tails', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), weather: 'motes', caption: 'The shrine road, under a hundred lanterns', lines: [say('kiku', 'Ninety-eight, ninety-nine, a hundred. Every one of them lit. Now nobody touch anything.')] },
        { cam: wide(330, 205), ...shoot('medium', 'who', 'pushIn'), weather: 'motes', lines: [tell('At the top of the road, under a banner gone grey with mist, a soldier in old armour stands exactly where it has stood every night.')] },
        { cam: wide(300, 205), ...shoot('two', 'a'), lines: [say('a', 'How long have you held this road?'), say('who', 'Since the night it needed holding. Stand at my left. The left is always weaker.')] },
        { cam: wide(460, 205), ...shoot('low', 'kagari', 'pushIn', 'smash'), acts: [{ who: 'kagari', enter: 460, from: 'right' }], cue: 'eliteSting', fx: ['glow'], title: card('Kagari of the Nine Tails', 'Who Leads the Parade Astray'), lines: [say('kagari', 'So many little lights. Shall I blow them out one at a time, soldier, or all at once?', 'shout')] },
        { cam: wide(260, 205), ...shoot('medium', 'a', 'snapZoom'), acts: [{ who: 'a', pose: 'strike' }], lines: [say('a', 'Neither. Kiku sells them. You are paying for every one.')] },
      ]),
    after: (c) =>
      story('hundredLanternsAfter', 'A Hundred Lanterns', 'shrine', { a: hero(c[0] ?? 'kunoichi', 240), who: stranger('samuraiCommander', 340) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), lines: [tell('Dawn comes up the shrine road. The Parade is gone, and a hundred lanterns are still burning.')] },
        { cam: wide(300, 205), ...shoot('two', 'a', 'still', 'dissolve'), hold: 1.2, lines: [say('who', 'The road is held. My watch is ended. Tell the lantern-seller I would see your keep, and whatever gate it needs holding.')] },
      ]),
  },
  {
    // (The Second Throne, part 3: everyone the second throne sentenced at the Last Stand comes back at once to appeal)
    id: 'theAppeal',
    title: 'The Appeal',
    blurb: 'Everyone sentenced from the second throne comes back through the breach together, to appeal, with an army.',
    land: 'dungeon',
    like: { army: 'golems', wave: 15 },
    ease: 0.48,
    cast: [STARTER_SLOT(['knight', 'kunoichi'])],
    waves: [
      { foes: ['orcBrute', 'clanOgre', 'orcArcher', 'orcGrunt'] },
      { foes: ['shamanKing', 'clanBrute', 'mazeMino2', 'orcArcher'], boss: 'mid' },
      { foes: ['hornedOgre', 'clanOgre', 'mazeGorgon2', 'orcArcher', 'orcBrute'], boss: 'final' },
    ],
    boss: { name: 'Gorm the Appellant', title: 'Who Will Not Be Sentenced' },
    before: (c) =>
      story('theAppeal', 'The Appeal', 'dungeon', { fenwick: giver('herald', 'Master Fenwick'), a: hero(c[0] ?? 'knight', 220), who: stranger('tyrant', 340), gorm: foe('hornedOgre', 460, 1.2, { name: 'Gorm the Appellant', hidden: true }) }, [
        { cam: wide(300, 200), ...shoot('wide', undefined, 'pan'), weather: 'dust', caption: 'The throne room, the court in session', lines: [say('fenwick', 'All rise. Or, in the case of the appellants, all come through the breach, I suppose.')] },
        { cam: wide(340, 205), ...shoot('medium', 'who', 'pushIn'), lines: [tell('On the second throne a figure sits in a heavy crown, quite still, chin on one fist, as if the whole keep were a matter to be decided.')] },
        { cam: wide(300, 205), ...shoot('two', 'a'), lines: [say('a', 'Are you going to fight, or just sit there?'), say('who', 'I am going to sit here. That is how a court is held. You are the evidence.')] },
        { cam: wide(460, 205), ...shoot('low', 'gorm', 'pushIn', 'smash'), acts: [{ who: 'gorm', enter: 460, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('Gorm the Appellant', 'Who Will Not Be Sentenced'), lines: [say('gorm', 'We appeal! All of us! Mostly with clubs!', 'shout')] },
        { cam: wide(260, 205), ...shoot('medium', 'a', 'snapZoom'), acts: [{ who: 'a', pose: 'strike' }], lines: [say('a', 'Objection noted.')] },
      ]),
    after: (c) =>
      story('theAppealAfter', 'The Appeal', 'dungeon', { a: hero(c[0] ?? 'knight', 240), who: stranger('tyrant', 340) }, [
        { cam: wide(290, 205), ...shoot('wide', undefined, 'pullOut'), lines: [tell('The appellants lie where they fell. On the second throne, at long last, the figure in the crown stands up.')] },
        { cam: wide(300, 205), ...shoot('two', 'a', 'still', 'dissolve'), hold: 1.2, lines: [say('who', 'Appeal dismissed. The keep has given its evidence well. Tell the herald he may announce me.')] },
      ]),
  },
];
