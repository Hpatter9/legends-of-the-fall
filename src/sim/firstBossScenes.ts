// The armies' first bosses (CINE-1110, docs/notes/cinematics-1110.md): the first time each army sends a boss at the keep (its mid-boss,
// wave 8; the Wildwood's at wave 5), a short film of its own in place of the plain boss arrival (`cineMoments.ts` `arrivalScene`). One
// shape filled in from a table, a row an army: the land, a word from the narrator as the defenders set their feet, the boss coming on
// from below with its name and title on a card, its boast tilted and too close, a hero's answer, a smash cut into the fight. About
// twelve seconds. Pure data.

import type { Area } from './board';
import { close, say, shoot, tell, wide, type Scene } from './sceneKit';
import { UNITS } from './units';

interface FirstBoss {
  army: string;
  /** The army's name, for the first shot's caption. */
  name: string;
  area: Area;
  /** The army's first boss and one of its wave's escort (fighter ids: `armies.ts`, the first boss wave's band). */
  boss: string;
  escort: string;
  /** The boss's title, as its boss card has it (`render/bossTitles.ts`). */
  epithet: string;
  title: string;
  setup: string;
  boast: string;
  answer: string;
}

const FIRST_BOSSES: FirstBoss[] = [
  { army: 'orcs', name: 'Orc Warband', area: 'warcamp', boss: 'orcChieftain', escort: 'orcGrunt', epithet: 'Breaker of Shields', title: 'The Chieftain’s Banner',
    setup: 'Halfway up the road, the orcs stopped marching and started chanting. Never a good sign.',
    boast: 'SHIELDS UP, LITTLE ONES. I *COLLECT* THEM.',
    answer: 'Then he can start a collection of dents.' },
  { army: 'undead', name: 'Undead Legion', area: 'graveyard', boss: 'boneCaptain', escort: 'skeleton', epithet: 'Marshal of the Fallen', title: 'Fall In',
    setup: 'A bugle sounded from under the graveyard. It was flat, and something answered it.',
    boast: 'RANKS OF THE DEAD! BY THE LEFT... *QUICK* MARCH!',
    answer: 'He drills them well. Shame about the knees.' },
  { army: 'beasts', name: 'Beast Packs', area: 'plains', boss: 'alphaWolf', escort: 'packBlack', epithet: 'Leader of the Moonlit Pack', title: 'The Moon Is Up',
    setup: 'The moon rose fat over the plains, and every howl in the dark turned towards the keep.',
    boast: 'The pack has your *scent*. The pack never forgets a scent.',
    answer: 'I bathed this week. Twice, in fact.' },
  { army: 'wildwood', name: 'The Wildwood', area: 'forest', boss: 'forestBoss1', escort: 'groveSatyr1', epithet: 'Warden of the Bramble', title: 'The Path Closes',
    setup: 'The path through the wood closed up behind them, quietly, like a door.',
    boast: 'Mind the thorns. No, truly. *Mind* them. They mind you.',
    answer: 'Did the hedge just threaten us?' },
  { army: 'labyrinth', name: 'The Labyrinth', area: 'temple', boss: 'gorgonQueen', escort: 'mazeMino1', epithet: 'Queen of Stone', title: 'A Garden of Statues',
    setup: 'Deep in the maze stood a garden of statues, each with a look of great surprise.',
    boast: 'Look at me, darlings. Just *once*. Everyone does, in the end.',
    answer: 'Eyes on the floor. Strike at the ankles.' },
  { army: 'ogres', name: 'Ogre Clans', area: 'highlands', boss: 'shamanKing', escort: 'clanBrute', epithet: 'Whisperer of the Dead', title: 'Faces in the Smoke',
    setup: 'Smoke rose from a bone fire on the crag, and the smoke had faces in it.',
    boast: 'THE SPIRITS OF THE CRAG HAVE SPOKEN. THEY SAY YOU ARE *VERY* SMALL.',
    answer: 'The spirits should see us from closer up.' },
  { army: 'infernal', name: 'Infernal Host', area: 'volcano', boss: 'devilLeader', escort: 'hellImp', epithet: 'Bringer of Hellfire', title: 'Sulphur and Paperwork',
    setup: 'The air went hot, and smelt of sulphur and freshly stamped paperwork.',
    boast: 'Light the fires. All of them. Then *invoice* them.',
    answer: 'I am not signing anything that is on fire.' },
  { army: 'yokai', name: 'Yokai Night Parade', area: 'shrine', boss: 'nineTails', escort: 'yokaiFox', epithet: 'Lantern of the Hundred Nights', title: 'Nine Lanterns',
    setup: 'Nine lanterns lit along the shrine steps, one by one, with nobody to light them.',
    boast: 'Nine tails, nine lanterns, nine riddles. Guess *wrong*.',
    answer: 'I hate riddles. I shall answer with steel.' },
  { army: 'golems', name: 'Golem Forge', area: 'forge', boss: 'sapphireColossus', escort: 'stoneGolem', epithet: 'Heart of the Blue Vein', title: 'The Blue Vein',
    setup: 'The forge floor split along a seam of blue stone, and the seam began to stand up.',
    boast: 'THE BLUE VEIN WAKES. THE STONE *REMEMBERS* YOUR PICKAXES.',
    answer: 'We have never owned a pickaxe between us.' },
];

const firstBossScene = (f: FirstBoss): Scene => {
  const loud = f.boast === f.boast.toUpperCase();
  return {
    id: `boss:${f.army}`,
    title: f.title,
    blurb: `${f.name}: ${UNITS[f.boss]?.name ?? f.boss} comes for the keep.`,
    moment: { kind: 'armyBoss', army: f.army },
    family: 'firstBoss',
    sting: 'sceneBoss',
    out: 'smash',
    cast: {
      boss: { role: `unit:${f.boss}`, x: 400, facing: 'left', hidden: true, scale: 1.4 },
      escort: { role: `unit:${f.escort}`, x: 470, facing: 'left', hidden: true },
      hero: { role: 'party:0', x: 250, facing: 'right', hidden: true },
      mate: { role: 'party:1', x: 212, facing: 'right', hidden: true },
    },
    shots: [
      {
        look: f.area,
        cam: wide(290, 205),
        ...shoot('wide', undefined, 'pan'),
        fx: ['fadeIn', 'darken', 'rumble'],
        cue: 'earthRumble',
        caption: f.name,
        acts: [{ who: 'hero', enter: 250, from: 150 }, { who: 'mate', enter: 212, from: 110 }],
        lines: [tell(f.setup)],
      },
      {
        cam: wide(400, 205),
        ...shoot('low', 'boss', 'pushIn', 'smash'),
        acts: [{ who: 'boss', enter: 400, from: 560 }, { who: 'escort', enter: 470, from: 'right' }],
        fx: ['shake', 'darken'],
        cue: 'boom',
        title: { over: f.epithet, name: UNITS[f.boss]?.name ?? f.boss },
        hold: 1.8,
      },
      { cam: close('boss', 2), ...shoot('dutch', 'boss', 'drift'), fx: ['darken'], lines: [say('boss', f.boast, loud ? 'shout' : undefined)] },
      { cam: close('hero'), ...shoot('close', 'hero', 'pushIn'), acts: [{ who: 'hero', pose: 'strike' }], lines: [say('hero', f.answer)] },
    ],
  };
};

/** The army whose first boss this fighter is, if any (for the page's boss arrival). */
export const firstBossArmy = (boss: string): string | undefined => FIRST_BOSSES.find((f) => f.boss === boss)?.army;
/** Each army's first boss, by army (for the test that holds the table to `armies.ts`). */
export const FIRST_BOSS_OF: Readonly<Record<string, string>> = Object.fromEntries(FIRST_BOSSES.map((f) => [f.army, f.boss]));

export const FIRST_BOSS_SCENES: Scene[] = FIRST_BOSSES.map(firstBossScene);
