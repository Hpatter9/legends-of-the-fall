// The Eidolon chains' own quest battles (EIDOLON-CHAINS, batch 5 of the quests and Eidolons design, `docs/notes/eidolon-chains.md`). They
// run on the quest battles' machinery (`questBattles.ts`: their waves, strength, cast, seed and save slot), but no quest in the log opens
// them: a chain's part does (`eidolonChains.ts` `chainWantsBattle`). Kept apart from the eleven ordinary battles (`questBattleData.ts`) so
// the chains can grow without changing those. The owner's rule: a chain only ever asks for heroes of the two starter packs, so each slot
// lists heroes of both packs (a slot's first owned hero takes the part) and its lines name whoever came (`{a}`).
//
// Askel's chain has The Kennel Fires, Nivra's The Glass Mere (`docs/notes/eidolon-chain-2.md`). EIDOLON-TRIAL: each chain's trial, the
// fight against its Eidolon before the binding, is built here from its data in `eidolonTrials.ts` (`trialBattle`). Pure data: no Pixi, no
// DOM.

import { close, say, tell, wide, type CastMember, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import type { QuestBattle } from './questBattles';
import { heroName } from './heroNames';
import { TRIALS, type TrialDef } from './eidolonTrials';

const hero = (kind: string, x: number, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'right', name: heroName(kind), ...more });
const foe = (kind: string, x: number, scale = 1.2, more: Partial<CastMember> = {}): CastMember => ({ role: `unit:${kind}`, x, facing: 'left', scale, ...more });

/** A story in the cinematics' own shape (played by the page's scene player before the first deploy, and after a win). */
const story = (id: string, title: string, look: Area, cast: Scene['cast'], shots: Shot[]): Scene => ({
  id: `qb-${id}`,
  title,
  blurb: title,
  moment: { kind: 'questBattle', battle: id },
  music: 'solemn',
  cast,
  shots: shots.map((s, i) => (i === 0 ? { look, fx: ['fadeIn'], ...s } : s)),
});

/** EIDOLON-TRIAL: a trial as a quest battle: its arena, its waves (the Eidolon last, under its own name and title), and its two stories:
 *  the place, the Eidolon rising out of it with its challenge and a hero's answer; after the win, its words and the hero's. */
export function trialBattle(t: TrialDef): QuestBattle {
  const boss = t.boss.id;
  const lead = t.cast[0]?.heroes[0] ?? 'knight';
  return {
    id: t.id,
    title: t.part.title,
    blurb: t.blurb,
    land: t.land,
    like: t.like,
    ease: t.ease,
    bossLift: t.lift,
    cast: t.cast,
    waves: t.waves,
    boss: { name: t.boss.name, title: t.boss.title },
    before: (c) =>
      story(t.id, t.part.title, t.land, { a: hero(c[0] ?? lead, 230), e: foe(boss, 430, 1.5, { name: t.boss.name, hidden: true }) }, [
        { cam: wide(290, 200), fx: ['fadeIn'], caption: t.part.title, lines: [tell(t.lines.place)] },
        { cam: wide(380, 205), acts: [{ who: 'e', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], lines: t.lines.challenge.map((x) => say('e', x)) },
        { cam: close('a'), lines: [say('a', t.lines.answer)] },
      ]),
    after: (c) =>
      story(`${t.id}After`, t.part.title, t.land, { a: hero(c[0] ?? lead, 230), e: foe(boss, 370, 1.5, { name: t.boss.name }) }, [
        { cam: wide(300, 205), lines: [say('e', t.lines.after)] },
        { cam: close('a'), lines: [say('a', t.lines.afterHero)] },
      ]),
  };
}

export const CHAIN_BATTLES: readonly QuestBattle[] = [
  {
    // (Askel's chain, part 2: the first kings' kennels, still burning, and the wolf who would be the hound)
    id: 'kennelFires',
    title: 'The Kennel Fires',
    blurb: "The first kings' kennels are still burning, and a red pack has made its den round an old iron collar.",
    land: 'autumn',
    like: { army: 'orcs', wave: 11 },
    ease: 1.6,
    // (Ravi or Natsu, one from each starter pack; if neither is owned, any starter hero takes the part)
    cast: [{ heroes: ['wizard', 'archer'], standIns: ['knight', 'peasant', 'samurai', 'kunoichi'] }],
    waves: [
      { foes: ['packRed', 'packBlack', 'packRed'] },
      { foes: ['packRed', 'packBlack', 'packRed', 'packBlack'] },
      { foes: ['alphaWolf', 'packRed', 'packRed', 'packBlack'], boss: 'final' },
    ],
    boss: { name: 'The Ash-Mane', title: 'Who Would Be the Kennel King' },
    before: (c) =>
      story('kennelFires', 'The Kennel Fires', 'autumn', { a: hero(c[0] ?? 'wizard', 230), mane: foe('alphaWolf', 430, 1.3, { name: 'The Ash-Mane', hidden: true }) }, [
        { cam: wide(290, 200), fx: ['fadeIn', 'glow'], caption: 'The old kennels', lines: [tell("The first kings' kennels: black timbers on the hill, and fires that have burned for three hundred years with nothing left to burn.")] },
        { cam: close('a'), lines: [say('a', 'Someone has moved in.'), tell('Red wolves with ash in their fur, circling an iron collar as if it were a throne.')] },
        { cam: wide(380, 205), acts: [{ who: 'mane', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], lines: [say('mane', "The fire's hound is gone. The fire's kennel is MINE.", 'shout')] },
        { cam: close('a'), lines: [say('a', 'He wants to be the hound. He is going to be disappointed.')] },
      ]),
    after: (c) =>
      story('kennelFiresAfter', 'The Kennel Fires', 'autumn', { a: hero(c[0] ?? 'wizard', 260) }, [
        { cam: close('a'), lines: [tell("Where the Ash-Mane fell, an iron collar lies in the embers: the keep's crest on its buckle, warm as a hearth-stone."), say('a', 'Big neck. Very big neck.')] },
      ]),
  },
  {
    // (Nivra's chain, part 2: the frozen mere she sleeps under, and the frost-giant of her own cold that would keep her asleep for ever)
    id: 'glassMere',
    title: 'The Glass Mere',
    blurb: 'The mere where the Rime Wyrm sleeps is frozen like glass, and things made of its ice walk on it.',
    land: 'snow',
    like: { army: 'beasts', wave: 11 },
    ease: 1.15,
    // (Ayame or Kenji, one from each starter pack; if neither is owned, any starter hero takes the part)
    cast: [{ heroes: ['kunoichi', 'samurai'], standIns: ['knight', 'peasant', 'archer', 'wizard'] }],
    waves: [
      { foes: ['packWhite', 'crystalGolem', 'packWhite'] },
      { foes: ['packWhite', 'crystalGolem', 'packWhite', 'crystalGolem'] },
      { foes: ['sapphireColossus', 'crystalGolem', 'packWhite', 'packWhite'], boss: 'final' },
    ],
    boss: { name: 'The Hoarfrost Warden', title: 'Who Keeps the Sleeper Cold' },
    before: (c) =>
      story('glassMere', 'The Glass Mere', 'snow', { a: hero(c[0] ?? 'kunoichi', 230), warden: foe('sapphireColossus', 430, 1.3, { name: 'The Hoarfrost Warden', hidden: true }) }, [
        { cam: wide(290, 200), fx: ['fadeIn'], caption: 'The Glass Mere', lines: [tell('A mere frozen so clear you can see the dark water under it. Far down, something long and pale lies coiled, and does not move.')] },
        { cam: close('a'), lines: [say('a', 'The ice is walking.'), tell('Shapes of blue crystal step out of the frost, and white wolves run with them.')] },
        { cam: wide(380, 205), acts: [{ who: 'warden', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], lines: [say('warden', 'The Wyrm SLEEPS. While she sleeps, the mere is MINE. Go home, little fires.', 'shout')] },
        { cam: close('a'), lines: [say('a', 'We came a long way to be called little. Wake up, Nivra. You have a lodger.')] },
      ]),
    after: (c) =>
      story('glassMereAfter', 'The Glass Mere', 'snow', { a: hero(c[0] ?? 'kunoichi', 260) }, [
        { cam: close('a'), lines: [tell("Where the Warden broke apart, a pearl of black ice lies on the mere. Under the glass, the long pale shape stirs, once."), say('a', 'Sorry. Go back to sleep. We will knock properly.')] },
      ]),
  },
  {
    // (Aurelan's chain, part 2: the shrine the sun never reaches, and the gorgon queen who shuttered it)
    id: 'sunlessShrine',
    title: 'The Sunless Shrine',
    blurb: "The shrine where the Lion's crown was put away is shuttered against the sun, and gorgons keep its hall.",
    land: 'shrine',
    like: { army: 'wildwood', wave: 11 },
    ease: 0.78,
    // (Kwame or Minh, one from each starter pack; if neither is owned, any starter hero takes the part)
    cast: [{ heroes: ['knight', 'peasant'], standIns: ['samurai', 'kunoichi', 'archer', 'wizard'] }],
    waves: [
      { foes: ['mazeGorgon1', 'stoneGolem', 'mazeGorgon2'] },
      { foes: ['mazeGorgon1', 'stoneGolem', 'mazeGorgon2', 'stoneGolem'] },
      { foes: ['gorgonQueen', 'stoneGolem', 'mazeGorgon1', 'mazeGorgon2'], boss: 'final' },
    ],
    boss: { name: 'The Eclipse Queen', title: 'Who Keeps the Sun in Stone' },
    before: (c) =>
      story('sunlessShrine', 'The Sunless Shrine', 'shrine', { a: hero(c[0] ?? 'knight', 230), queen: foe('gorgonQueen', 430, 1.3, { name: 'The Eclipse Queen', hidden: true }) }, [
        { cam: wide(290, 200), fx: ['fadeIn'], caption: 'The Sunless Shrine', lines: [tell('A shrine with its shutters nailed down, and no light in it at noon. Statues stand in the dark, each caught mid-step, each facing the door.')] },
        { cam: close('a'), lines: [say('a', 'Nobody has been in here for a long time. Nobody who left, anyway.'), tell('Something with a great many eyes opens its shutters one at a time.')] },
        { cam: wide(380, 205), acts: [{ who: 'queen', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], lines: [say('queen', 'The sun is late. The sun is STONE. Kneel to the shade, little torches.', 'shout')] },
        { cam: close('a'), lines: [say('a', 'We brought our own light. Mind your eyes.')] },
      ]),
    after: (c) =>
      story('sunlessShrineAfter', 'The Sunless Shrine', 'shrine', { a: hero(c[0] ?? 'knight', 260) }, [
        { cam: close('a'), lines: [tell('Where the Queen turned to rubble, the shutters burst open, and the first light in three hundred years falls on a plinth. A crown of beaten gold lies on it, spiked like rays.'), say('a', 'It is warm. Somebody has been keeping it warm for him.')] },
      ]),
  },
  {
    // (Voltara's chain, part 2: the copper works where the great clock stopped, and the warden who still guards its face)
    id: 'copperWorks',
    title: 'The Copper Works',
    blurb: 'The great clock stopped in the old copper works, and its golem warden still guards the face.',
    land: 'forge',
    like: { army: 'labyrinth', wave: 11 },
    ease: 0.76,
    // (Kwame or Minh, one from each starter pack; if neither is owned, any starter hero takes the part)
    cast: [{ heroes: ['knight', 'peasant'], standIns: ['samurai', 'kunoichi', 'archer', 'wizard'] }],
    waves: [
      { foes: ['ironGolem', 'stoneGolem', 'crystalGolem'] },
      { foes: ['ironGolem', 'crystalGolem', 'stoneGolem', 'ironGolem'] },
      { foes: ['sapphireColossus', 'ironGolem', 'crystalGolem', 'stoneGolem'], boss: 'final' },
    ],
    boss: { name: 'The Mint-Warden', title: 'Who Keeps the Last Spark' },
    before: (c) =>
      story('copperWorks', 'The Copper Works', 'forge', { a: hero(c[0] ?? 'knight', 230), warden: foe('sapphireColossus', 430, 1.3, { name: 'The Mint-Warden', hidden: true }) }, [
        { cam: wide(290, 200), fx: ['fadeIn'], caption: 'The Copper Works', lines: [tell('Rows of cold furnaces and green copper pipes. High above the floor a great clock has stopped, its one hand hanging at the minute the pacts broke. Something huge and blue stands under it, quite still.')] },
        { cam: close('a'), lines: [say('a', 'Nobody has wound that in three hundred years. And it is still humming.'), tell('A blue spark runs along a pipe and goes in at the Warden\'s chest.')] },
        { cam: wide(380, 205), acts: [{ who: 'warden', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], lines: [say('warden', 'THE CLOCK IS NOT TO BE TOUCHED. THE SPARK IS NOT TO BE SPENT. WIND DOWN, LITTLE FUSES.', 'shout')] },
        { cam: close('a'), lines: [say('a', 'We only want the face. We will bring it back. Probably.')] },
      ]),
    after: (c) =>
      story('copperWorksAfter', 'The Copper Works', 'forge', { a: hero(c[0] ?? 'knight', 260) }, [
        { cam: close('a'), lines: [tell('The Warden goes down in a shower of copper filings, and the great clock ticks once. On the floor under it, a round face of white enamel with one copper hand.'), say('a', 'Still going. Somebody has been waiting for someone to pick it up.')] },
      ]),
  },
  // (EIDOLON-TRIAL: the trials, one a chain)
  ...TRIALS.map(trialBattle),
];
