// The bond scenes (DEPTH-BUILD, docs/notes/depth-design.md section 4): a kindred pair's short scene at bond levels 1, 3 and 5, played the
// next time the player is at the camp or the castle. Drafted in batches of ten for the owner to read (Q4.2), in the cinematic style of the
// opening (docs/notes/opening-v2.md): a held wide shot on one backdrop, the two walking on, three to six lines in their own voices, and a
// closer framing for the last word. Batch 1: the first ten pairs' first scenes (bond level 1, "Acquainted"). Pure data: no Pixi, no DOM.

import { shoot, wide, say, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import { bondKey, levelOf, type BondMeta } from './bonds';

interface BondDraft {
  a: string;
  b: string;
  level: 1 | 3 | 5;
  title: string;
  blurb: string;
  look: Area;
  /** The lines, each `a` or `b` speaking (the first stands left, the second right). */
  lines: ['a' | 'b', string][];
}

const D = (a: string, b: string, level: 1 | 3 | 5, title: string, look: Area, blurb: string, lines: ['a' | 'b', string][]): BondDraft => ({ a, b, level, title, look, blurb, lines });

/** Batch 1: the first ten kindred pairs, bond level 1. */
const DRAFTS: readonly BondDraft[] = [
  D('knight', 'peasant', 1, 'Margaret', 'plains', 'The knight finds the peasant holding the line with a spear older than both of them.', [
    ['a', 'You held the left flank with a boar spear older than I am.'],
    ['b', 'It was my gran\'s, sir. She called it Margaret.'],
    ['a', 'Next time, take a new one from the rack.'],
    ['b', 'And leave Margaret behind? She has seen off three wolves and a tax man.'],
    ['a', 'Margaret. Very well. Margaret stands with us.'],
  ]),
  D('samurai', 'kunoichi', 1, 'Two Kinds of Quiet', 'shrine', 'A sword drawn in the open and a blade that never is.', [
    ['a', 'You struck from behind him. There is no honour in that.'],
    ['b', 'He had a hundred friends. I had you. I did the arithmetic.'],
    ['a', '...The arithmetic was sound.'],
    ['b', 'Then face them in the open, and I will see to the honour of their backs.'],
  ]),
  D('archer', 'lightningMage', 1, 'Who Hit It First', 'highlands', 'An argument over a felled ogre that neither will give up.', [
    ['b', 'My bolt dropped it. You saw the smoke.'],
    ['a', 'My arrow was in its eye before your smoke had an opinion.'],
    ['b', 'Shall we count it as half each?'],
    ['a', 'I will count it as mine, and you may count the smoke.'],
  ]),
  D('wizard', 'wanderer', 1, 'A Map With No Edges', 'autumn', 'The wizard asks the wanderer where the road goes.', [
    ['a', 'Where were you before the Keep, traveller?'],
    ['b', 'Walking. Before that, walking somewhere else.'],
    ['a', 'And where will you go when this is done?'],
    ['b', 'Wherever the road wants. It has never once asked my opinion.'],
    ['a', 'A sensible road. Mine only ever led to libraries.'],
  ]),
  D('paladin', 'cleric', 1, 'The Same Hymn', 'temple', 'Two of the faithful, one with a shield and one with a prayer.', [
    ['b', 'You sang the dawn hymn as you charged. Off key.'],
    ['a', 'The foe did not seem to mind.'],
    ['b', 'The foe was not standing beside you.'],
    ['a', 'Then stand beside me again tomorrow, and correct me.'],
  ]),
  D('werewolf', 'barbarian', 1, 'Who Howled', 'forest', 'Two who fight like storms compare their storms.', [
    ['b', 'You howled at the moon mid-fight. I respect that.'],
    ['a', 'It was a sunny afternoon.'],
    ['b', 'Then you howled at the sun. Even better.'],
    ['a', 'You are the first who has not run from the howling.'],
    ['b', 'Run? I was howling too. You just could not hear me.'],
  ]),
  D('rifleBot', 'siegeBot', 1, 'Calibration', 'forge', 'Two machines compare how they keep count.', [
    ['a', 'Shots fired: forty-one. Shots landed: forty-one.'],
    ['b', 'Walls flattened: three. Walls intended: two.'],
    ['a', 'Query: the third wall?'],
    ['b', 'It was in the way of the second wall. Logged as a bonus.'],
  ]),
  D('kitsune', 'karasu', 1, 'Feathers and Foxfire', 'shrine', 'The fox spirit and the crow tengu, old neighbours on the mountain.', [
    ['b', 'You stole my feathers for a disguise, eighty years ago.'],
    ['a', 'Seventy. And I gave them back.'],
    ['b', 'You gave back different feathers.'],
    ['a', 'Better feathers. You have looked very dashing since.'],
  ]),
  D('knight', 'paladin', 1, 'Oaths, Compared', 'warcamp', 'Two sworn swords measure their oaths over the campfire.', [
    ['a', 'Whom did you swear to, before the Keep?'],
    ['b', 'To the light, to the weak, and to rising before dawn.'],
    ['a', 'I swore to a king who is dust now.'],
    ['b', 'Then swear to the one who stands here. I will hold you to it.'],
  ]),
  D('archer', 'ranger', 1, 'Fletching', 'forest', 'Two bow hands trade arrows and insults.', [
    ['b', 'Your fletching is crooked. Goose feathers?'],
    ['a', 'Duck. The geese would not volunteer.'],
    ['b', 'Here. Try one of mine. Hawk.'],
    ['a', 'It flies straight. Annoyingly straight.'],
    ['b', 'Keep it. I want to see you miss with it.'],
  ]),
];

/** A scene's id: "bond:knight|peasant:1". */
export const bondSceneId = (key: string, level: number): string => `bond:${key}:${level}`;

function sceneOf(d: BondDraft): Scene {
  const key = bondKey(d.a, d.b);
  const lines = d.lines.map(([who, text]) => say(who, text));
  const split = Math.max(1, lines.length - 1);
  const shots: Shot[] = [
    { look: d.look, cam: wide(288, 205), ...shoot('wide', undefined, 'still', 'fade'), caption: d.title, acts: [{ who: 'a', enter: 250, from: 120 }, { who: 'b', enter: 330, from: 460 }], lines: lines.slice(0, split) },
    { look: d.look, cam: wide(290, 215, 1.25), ...shoot('two', undefined, 'pushIn'), lines: lines.slice(split), hold: 1 },
  ];
  return {
    id: bondSceneId(key, d.level),
    title: d.title,
    blurb: d.blurb,
    moment: { kind: 'bond', pair: key, level: d.level },
    family: 'bond',
    music: 'solemn',
    cast: { a: { role: `unit:${d.a}`, x: 250, facing: 'right', hidden: true }, b: { role: `unit:${d.b}`, x: 330, facing: 'left', hidden: true } },
    shots,
  };
}

export const BOND_SCENES: readonly Scene[] = DRAFTS.map(sceneOf);

/** The bond scenes now due: a pair's scene for a level it has reached, not yet seen. The page plays one at the camp or the castle. */
export function bondScenesDue(m: BondMeta & { seenScenes?: readonly string[] }, seen: (id: string) => boolean): string[] {
  return BOND_SCENES.filter((s) => s.moment.kind === 'bond' && levelOf(m, s.moment.pair) >= s.moment.level && !seen(s.id)).map((s) => s.id);
}
