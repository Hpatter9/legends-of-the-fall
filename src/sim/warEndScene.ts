// The War's end (phase 5 of the Assault, `docs/notes/assault-5.md`): the scene that plays at the camp after the Last Hold falls. The lord who
// made his last stand on its throne falls, the Dark Council's seats burn, and three of the party take stock. It is built from the War's
// own ending (`War.end`: the lord's fighter and name; the hold's land), so the warchief the player actually fought is the one who falls; the
// Scenes list's copy, before any War has ended, has a stand-in Orc Warlord. Pure data: no Pixi, no DOM.

import { close, say, shoot, tell, wide, type Scene } from './sceneKit';
import type { Area } from './board';
import type { WarEnd } from './nemesis';
import { UNITS } from './units';

export const WAR_END_SCENE = 'warEnd';

/** The scene, for an ending (the stand-in, without one), on the Last Hold's land (its army's `area`; the page passes it, so this file
 *  need not load the armies, which would lead back round to the scripts). */
export function warEndScene(end?: WarEnd, look: Area = 'warcamp'): Scene {
  const base = end && UNITS[end.chief.base] ? end.chief.base : 'orcWarlord';
  return {
    id: WAR_END_SCENE,
    title: 'The War’s End',
    blurb: 'The Last Hold falls, and the Dark Council with it.',
    moment: { kind: 'warEnd' },
    music: 'warEnd',
    sting: 'sceneVictory',
    out: 'fade',
    cast: {
      chief: { role: `unit:${base}`, x: 410, facing: 'left', scale: 1.5, name: end?.chief.name ?? 'The Warchief' },
      a: { role: 'party:0', x: 290, facing: 'right', hidden: true },
      b: { role: 'party:1', x: 245, facing: 'right', hidden: true },
      c: { role: 'party:2', x: 200, facing: 'right', hidden: true },
      duchess: { role: 'duchess', x: 155, facing: 'right', hidden: true },
    },
    shots: [
      {
        look,
        cam: wide(380, 200, 1.1),
        ...shoot('low', 'chief', 'pushIn', 'fade'),
        fx: ['fadeIn', 'darken', 'rumble'],
        title: { over: 'The War’s End', name: 'The Last Hold' },
        acts: [{ who: 'chief', pose: 'hurt' }],
        lines: [tell('The last hold burned. On its throne stood {chief}, with nowhere left to ride.')],
      },
      {
        cam: close(['a', 'chief'], 1.2),
        acts: [{ who: 'a', enter: 290, from: 180 }, { who: 'b', enter: 245, from: 140 }, { who: 'c', enter: 200, from: 100 }],
        lines: [say('chief', 'THE COUNCIL WILL RISE AGAIN!', 'shout'), say('a', 'The Council is a pile of chairs on fire, {chief}.')],
      },
      {
        cam: close('chief', 2),
        ...shoot('dutch', 'chief', 'drift'),
        acts: [{ who: 'a', pose: 'strike' }, { who: 'chief', pose: 'down', line: 0 }],
        fx: ['flash', 'shake'],
        cue: 'boom',
        lines: [tell('{chief} fell on his throne, and the seats of the Dark Council burned with him.')],
      },
      {
        cam: close(['a', 'b', 'c', 'duchess'], 1.4),
        ...shoot('two', undefined, 'still'),
        acts: [{ who: 'duchess', enter: 155, from: 60, line: 3 }],
        lines: [say('b', 'Is that it, then? The whole War?'), say('c', 'Every hold. Every captain. Every last chair.'), say('a', 'I was fond of the chairs.'), say('duchess', 'Mehh.')],
      },
      {
        cam: wide(300, 205),
        ...shoot('high', undefined, 'pullOut', 'dissolve'),
        fx: ['fadeOut'],
        lines: [tell('The war drums fell silent. The king, who had only watched, called it a famous victory.')],
        hold: 1,
      },
    ],
  };
}

/** The Scenes list's copy: the stand-in. */
export const WAR_END_SCENES: readonly Scene[] = [warEndScene()];
