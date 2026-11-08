// The Nemesis War, phase 3: the Vengeance scenes (`docs/design/legends-expansion.md`, section 2.7; `docs/notes/nemesis-3.md`). When an
// Avenger (the Sworn partner of a hero a nemesis slew) lands the killing blow on that nemesis, a short scene plays the next time the player is
// at the camp: the two of them, after. Only a kindred pair (or a rivalry settled into one) reaches Sworn, so there is a scene for each such
// pair, each way round. This first batch is written from four shapes in the bond scenes' style, with the pair's own names; scenes written for
// each pair follow for the owner to read. Pure data: no Pixi, no DOM.

import { shoot, wide, say, type Scene, type Shot } from './sceneKit';
import { KINDRED, RIVALS } from './bonds';
import { heroName } from './heroNames';

/** The four shapes: who speaks (`a` the Avenger, `b` the hero it avenged) and what, with `{A}` and `{B}` for their names. */
const SHAPES: readonly { title: string; lines: readonly ['a' | 'b', string][] }[] = [
  { title: 'It Is Done', lines: [['a', 'It is done, {B}.'], ['b', 'You went after it alone?'], ['a', 'Not alone. You were with me the whole way.'], ['b', 'Then we finished it together.']] },
  { title: 'A Debt Paid', lines: [['b', 'They say you were the one who brought it down.'], ['a', 'It put you in the dirt, {B}. I could not let that stand.'], ['b', 'Thank you, {A}.'], ['a', 'Do not thank me. Just stay on your feet next time.']] },
  { title: 'Quiet Now', lines: [['a', 'I kept seeing you fall. Every night.'], ['b', 'And now?'], ['a', 'Now it is quiet.'], ['b', 'Good. Sleep, {A}. I will keep watch.']] },
  { title: 'For You', lines: [['b', 'You did not have to do that for me.'], ['a', 'I did, {B}.'], ['b', '...I would have done the same for you.'], ['a', 'I know. That is why I did it.']] },
];

const fill = (t: string, a: string, b: string): string => t.replace(/\{A\}/g, heroName(a)).replace(/\{B\}/g, heroName(b));
const shapeOf = (a: string, b: string): number => [...`${a}>${b}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % SHAPES.length;

/** A scene's id: "vengeance:knight>peasant" (the Avenger first). */
export const vengeanceSceneId = (pair: string): string => `vengeance:${pair}`;

function sceneOf(a: string, b: string): Scene {
  const shape = SHAPES[shapeOf(a, b)];
  const lines = shape.lines.map(([who, text]) => say(who, fill(text, a, b)));
  const split = Math.max(1, lines.length - 1);
  const shots: Shot[] = [
    { look: 'warcamp', cam: wide(288, 205), ...shoot('wide', undefined, 'still', 'fade'), caption: `Vengeance: ${shape.title}`, acts: [{ who: 'a', enter: 250, from: 120 }, { who: 'b', enter: 330, from: 460 }], lines: lines.slice(0, split) },
    { look: 'warcamp', cam: wide(290, 215, 1.25), ...shoot('two', undefined, 'pushIn'), lines: lines.slice(split), hold: 1 },
  ];
  return {
    id: vengeanceSceneId(`${a}>${b}`),
    title: `Vengeance: ${shape.title}`,
    blurb: `${heroName(a)} avenges ${heroName(b)}.`,
    moment: { kind: 'vengeance', pair: `${a}>${b}` },
    family: 'bond',
    music: 'solemn',
    cast: { a: { role: `unit:${a}`, x: 250, facing: 'right', hidden: true }, b: { role: `unit:${b}`, x: 330, facing: 'left', hidden: true } },
    shots,
  };
}

/** Every pair that can reach Sworn (the kindred, and the rivals once settled), each way round. */
export const VENGEANCE_SCENES: readonly Scene[] = [...KINDRED, ...RIVALS].flatMap((key) => {
  const [x, y] = key.split('|');
  return [sceneOf(x, y), sceneOf(y, x)];
});
