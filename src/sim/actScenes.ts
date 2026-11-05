// The Calamity's act scenes (DEPTH-BUILD, docs/notes/depth-design.md section 6): a short scene at the end of Acts I and II, the run's lead
// hero on the road with the land behind, played as the crossroads opens. Drafted for the owner to read, in the cinematic style of the
// opening (docs/notes/opening-v2.md). Pure data: no Pixi, no DOM.

import { shoot, wide, say, tell, type Scene } from './sceneKit';

const act = (n: 1 | 2, title: string, blurb: string, look: Scene['shots'][number]['look'], lines: ReturnType<typeof say>[]): Scene => ({
  id: `calAct${n}`,
  title,
  blurb,
  moment: { kind: 'calAct', map: n },
  calamity: true,
  music: 'solemn',
  cast: { hero: { role: 'hero', x: 260, facing: 'right', hidden: true } },
  shots: [
    { look, cam: wide(280, 205), ...shoot('wide', undefined, 'pan', 'fade'), caption: n === 1 ? 'End of Act I' : 'End of Act II', acts: [{ who: 'hero', enter: 260, from: 120 }], lines: lines.slice(0, -1) },
    { look, cam: wide(270, 215, 1.3), ...shoot('close', 'hero', 'pushIn'), lines: lines.slice(-1), hold: 1 },
  ],
});

export const ACT_SCENES: readonly Scene[] = [
  act(1, 'The Road Forks', 'The first guardian falls, and the rift splits three ways.', 'volcano', [
    tell('The first guardian is ash. Ahead, the rift tears open in three places, each to a different land.'),
    say('hero', 'Three roads, and every one of them ends in something that wants us dead.'),
    say('hero', 'Well. At least we get to choose which.'),
  ]),
  act(2, 'The Hollow Heart Calls', 'The second guardian falls; only the Hollow Heart is left.', 'dungeon', [
    tell('Two guardians down. Every rift now bends one way: towards the Hollow Heart, and Karnok.'),
    say('hero', 'Can you feel that? The ground is pulling us forward.'),
    say('hero', 'Then let it. We were going that way anyway.'),
  ]),
];
