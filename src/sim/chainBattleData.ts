// The Eidolon chains' own quest battles (EIDOLON-CHAINS, batch 5 of the quests and Eidolons design, `docs/notes/eidolon-chains.md`). They
// run on the quest battles' machinery (`questBattles.ts`: their waves, strength, cast, seed and save slot), but no quest in the log opens
// them: a chain's part does (`eidolonChains.ts` `chainWantsBattle`). Kept apart from the eleven ordinary battles (`questBattleData.ts`) so
// the chains can grow without changing those. The owner's rule: a chain only ever asks for heroes of the two starter packs, so each slot
// lists heroes of both packs (a slot's first owned hero takes the part) and its lines name whoever came (`{a}`).
//
// Pure data: no Pixi, no DOM.

import { close, say, tell, wide, type CastMember, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import type { QuestBattle } from './questBattles';
import { heroName } from './heroNames';

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
];
