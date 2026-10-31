// Cinematics made on the spot (CINE-001): a boss's arrival as its fight begins (the movie villain's entrance, in place of the old
// slam-down card when cinematics are on), and the Last Stand's act cards as the guard falls back into a new room. Both are short,
// written in the shot language (`sceneKit.ts`) and cut by the director like every other scene. Neither is kept in the Scenes list:
// the boss's arrival plays once a save (the boss card's own rule, `cardDue`), an act card each time a room is reached. Pure data.

import type { Area } from './board';
import { say, shoot, tell, wide, type Scene, type Shot } from './sceneKit';

/** What each boss says as it arrives (by its fighter's id); one with no line of its own growls the plain one. */
export const ARRIVAL_LINES: Readonly<Record<string, string>> = {
  orcWarlord: 'KNEEL, AND I MAY ONLY BURN *HALF* OF YOU.',
  demonLord: 'EVERY SOUL HERE IS *ALREADY* IN ARREARS.',
  hornedOgre: 'MOUNTAIN COME DOWN. MOUNTAIN *HUNGRY*.',
  forestBoss1: 'The bramble remembers every boot. *Every* one.',
  forestBoss2: 'You walked through my wood. Now my wood walks through *you*.',
  forestBoss3: 'The old grove sends its regards. And its *spear*.',
  boarKing: 'THE HERD DOES NOT GO ROUND. THE HERD GOES *THROUGH*.',
  devilLeader: 'Light the fires. All of them. *Now*.',
  shamanKing: 'Your ancestors are with me. They say you never write.',
  orcChieftain: 'SHIELDS UP. I *LIKE* IT WHEN THEY CRACK.',
  boneCaptain: 'Muster, lads. The living are late for inspection.',
  alphaWolf: 'The moon is up. The pack is *hungry*.',
  gorgonQueen: 'Look at me. Go on. Just *once*.',
  lichKing: 'I HAVE OUTLIVED KINGS. I SHALL *OUTLIVE* YOU.',
  minotaurChampion: 'NO ONE LEAVES THE MAZE. *NO ONE*.',
  nineTails: 'Nine tails, nine lanterns, and not one of them for *you*.',
  oniKing: 'BEAT THE DRUM. THE PARADE IS *HERE*.',
  sapphireColossus: 'THE BLUE VEIN WAKES. THE STONE *REMEMBERS*.',
  forgeTitan: 'FORGE. HOT. YOU. *FLAT*.',
};
const PLAIN_LINE = 'So. *You* are what stands in the way.';

/** A boss arrives (CINE-001): through black, the ground trembles; its figure comes on, seen from below, its name and title on a card;
 *  it speaks, tilted and too close; a smash cut into the fight. About six seconds. `name` and `title` are the card's (a quest boss's
 *  own, a named elite's, else the fighter's). */
export function arrivalScene(boss: string, name: string, title: string, area: Area): Scene {
  const line = ARRIVAL_LINES[boss] ?? PLAIN_LINE;
  const loud = line === line.toUpperCase();
  const shots: Shot[] = [
    { look: area, cam: wide(400, 205), ...shoot('wide', undefined, 'drift', 'smash'), acts: [{ who: 'boss', enter: 400, from: 560 }], fx: ['rumble', 'darken'], cue: 'earthRumble', hold: 1.1 },
    { cam: wide(400, 205), ...shoot('low', 'boss', 'pushIn', 'smash'), fx: ['shake'], cue: 'boom', title: { over: title, name }, hold: 1.9 },
    { cam: wide(400, 205), ...shoot('dutch', 'boss', 'snapZoom'), fx: ['darken'], lines: [{ ...say('boss', line, loud ? 'shout' : undefined), secs: 2.4 }] },
  ];
  return {
    id: `arrive:${boss}`,
    title: name,
    blurb: title,
    moment: { kind: 'elite' },
    short: true,
    out: 'smash',
    cast: { boss: { role: `unit:${boss}`, x: 400, facing: 'left', hidden: true, scale: 1.4, name } },
    shots,
  };
}

/** The land each room of the Last Stand is filmed against (the castle's rooms have no backdrop of their own). */
export const ACT_LOOKS: Readonly<Record<'courtyard' | 'library' | 'chapel' | 'hall', Area>> = { courtyard: 'warcamp', library: 'ruins', chapel: 'temple', hall: 'dungeon' };

/** A Last Stand act card (CINE-001): the act and the room on a title card through black, the guard coming in, the ruler's line in
 *  close, Duchess's aside if she has one, and the heroes from below as they set their feet; a smash cut back into the fight. `line` is
 *  the ruler's (it may name a hero), `heroes` those still standing (the first two are filmed). */
export function actScene(numeral: string, room: string, look: Area, line: string | null, duchess: string | null, heroes: number, last: boolean): Scene {
  const two = heroes >= 2;
  const shots: Shot[] = [
    {
      look,
      cam: wide(300, 205),
      ...shoot('wide', undefined, 'pan', 'smash'),
      acts: [{ who: 'king', enter: 230, from: 120 }, ...(heroes >= 1 ? [{ who: 'a', enter: 290, from: 170 } as const] : []), ...(two ? [{ who: 'b', enter: 330, from: 200 } as const] : [])],
      fx: ['darken'],
      cue: 'steps',
      title: { over: `Act ${numeral}`, name: room },
      hold: 2.2,
    },
  ];
  if (line) shots.push({ cam: wide(230, 205), ...shoot('close', 'king', 'pushIn'), lines: [{ ...say('king', line), secs: Math.min(5, 1.6 + line.length * 0.04) }] });
  if (duchess) shots.push({ cam: wide(200, 205), ...shoot('medium', 'duchess', 'still'), acts: [{ who: 'duchess', enter: 200, from: 110 }], lines: [{ ...say('duchess', duchess), secs: 2 }] });
  if (heroes >= 1) shots.push({ cam: wide(300, 205), ...shoot('low', two ? 'b' : 'a', 'pushIn'), acts: [{ who: 'a', pose: 'strike' }], ...(last ? { lines: [{ ...tell('The last room. There is no door behind this one.'), secs: 2.4 }] } : { hold: 1.2 }) });
  return {
    id: `act:${numeral}`,
    title: `Act ${numeral}: ${room}`,
    blurb: room,
    moment: { kind: 'spire', floor: 0 },
    short: true,
    out: 'smash',
    cast: {
      king: { role: 'unit:standKing', x: 230, facing: 'right', hidden: true, scale: 1.2 },
      a: { role: 'party:0', x: 290, facing: 'right', hidden: true },
      b: { role: 'party:1', x: 330, facing: 'right', hidden: true },
      duchess: { role: 'duchess', x: 200, facing: 'right', hidden: true },
    },
    shots,
  };
}
