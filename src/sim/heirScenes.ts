// Dynasties, phase 6: the heir scenes (docs/design/legends-expansion.md section 3.3; docs/notes/dynasty-6.md). When a kindred pair names
// an heir, a short scene plays the next time the player is at the camp: the two of them, deciding. The pair's own writing decides what the
// heir is (a child, a ward, an apprentice or a successor), and the game's word is always **heir**. In the bond scenes' style and voices:
// a held wide shot on one backdrop, the two walking on, a few lines, a closer framing for the last word. Batch 1: the first ten kindred
// pairs (the duo combos, then two of the pairs written from the heroes' stories); the other thirty follow in batches of ten for the owner
// to read. Pure data: no Pixi, no DOM.

import { shoot, wide, say, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import { bondKey } from './bonds';

interface HeirDraft {
  a: string;
  b: string;
  title: string;
  blurb: string;
  look: Area;
  /** The lines, each `a` (the line's elder, standing left) or `b` (the Sworn partner, right) speaking. */
  lines: ['a' | 'b', string][];
}

const D = (a: string, b: string, title: string, look: Area, blurb: string, lines: ['a' | 'b', string][]): HeirDraft => ({ a, b, title, look, blurb, lines });

/** Batch 1: ten pairs. */
const DRAFTS: readonly HeirDraft[] = [
  D('knight', 'peasant', 'A Spear for the Child', 'plains', 'The knight and the peasant, and a girl who has already taken Margaret off the rack.', [
    ['b', 'She took Margaret off the rack again this morning. Walked the wall with her like a sentry.'],
    ['a', 'She holds it wrong.'],
    ['b', 'She holds it like my gran did. Gran never lost a goose to a fox.'],
    ['a', 'Then teach her the goose part, and I will teach her the shield.'],
    ['b', 'Our daughter, then. Raised by the both of us.'],
    ['a', 'Our heir. The House will need someone who does not hold things wrong.'],
  ]),
  D('samurai', 'kunoichi', 'Taught Both Ways', 'shrine', 'A sword in the open and a blade that never is, and a ward who must learn both.', [
    ['a', 'The boy will learn the sword. Openly. With a name and a banner.'],
    ['b', 'And when the banner draws every arrow in the valley?'],
    ['a', '...Then he will learn the other way also.'],
    ['b', 'From me. At night. Where the honour will not see.'],
    ['a', 'Two teachers. One heir. I can live with the arithmetic.'],
  ]),
  D('archer', 'lightningMage', 'The Apprentice Argument', 'highlands', 'An argument about who taught the apprentice to hit the target first.', [
    ['b', 'Our apprentice hit the ogre target with a bolt this morning. A bolt. My bolt.'],
    ['a', 'Our apprentice hit the eye of it with an arrow before your bolt had an opinion.'],
    ['b', 'So you want the arrow, and I want the storm.'],
    ['a', 'I want the heir to be better than either of us.'],
    ['b', 'Fine. Then we teach both, and argue about the credit for the rest of our lives.'],
  ]),
  D('wizard', 'wanderer', 'The Long Road Home', 'forest', 'The wizard and the wanderer, and a daughter who has started too many fires.', [
    ['b', 'Asha set the camp kettle alight again. From across the clearing.'],
    ['a', 'That is a gift.'],
    ['b', 'That is a kettle, Ravi. We have had four.'],
    ['a', 'She will carry the staff. I want her to carry the road too. Your road.'],
    ['b', 'Then she walks with me a while before she burns anything else.'],
    ['a', 'Our heir, then. Fire and the long road.'],
  ]),
  D('paladin', 'cleric', 'Wounds and Mercy', 'temple', 'The paladin and the cleric take in an orphan from the field hospital.', [
    ['b', 'He would not leave the hospital tent. He held the lamp for me all night.'],
    ['a', 'He held it steady. Steadier than I would have.'],
    ['b', 'He has nobody, Karim.'],
    ['a', 'He has us. He will bear the wounds, and you will teach him to close them.'],
    ['b', 'Our ward, and the House’s heir. I will light the lamp for him for once.'],
  ]),
  D('werewolf', 'barbarian', 'The Cub', 'snow', 'The wolf and the axe find a cub of the pack in the snow.', [
    ['b', 'The pup bit me. Look. Clean through the glove.'],
    ['a', 'She chose you, then. A cub only bites what it means to keep.'],
    ['b', 'She has your eyes in a bad moon.'],
    ['a', 'And she will have your axe in a good fight.'],
    ['b', 'Then she is ours. The pack’s heir. Hah! Eat, little wolf.'],
  ]),
  D('rifleBot', 'siegeBot', 'The Successor', 'ruins', 'Two machines of the old wars draw up a successor in the ash of a workshop.', [
    ['a', 'Proposal: a successor unit. Designation pending.'],
    ['b', 'Load-bearing frame from my specifications. Optics from yours.'],
    ['a', 'Concurrence. It will remember what we remember.'],
    ['b', 'And what we have forgotten?'],
    ['a', 'It will learn it again, better. That is what an heir is for.'],
  ]),
  D('kitsune', 'karasu', 'A Kit and a Feather', 'shrine', 'The fox and the crow agree to raise a young spirit, after much disagreement.', [
    ['a', 'The kit has three tails already. Three! At her age I had one, and it was a nuisance.'],
    ['b', 'The kit stole my best pinion and wore it in her hair.'],
    ['a', 'Then she has good taste and quick hands. Both mine.'],
    ['b', '...The quick hands are mine.'],
    ['a', 'Then she is ours, crow. The shrine’s heir, with a feather in her hair.'],
  ]),
  D('knight', 'paladin', 'The Squire', 'plains', 'The Shield of the Dawn and the Bearer of Wounds take on a squire between them.', [
    ['b', 'The squire polished your shield until it shone like the dawn itself.'],
    ['a', 'And then held it up into the sun and blinded half the yard.'],
    ['b', 'He has heart, Kwame. Heart is the hard part.'],
    ['a', 'Then he is the House’s heir, and he will learn the easy parts from both of us.'],
  ]),
  D('archer', 'ranger', 'Snares and Arrows', 'forest', 'The archer and the ranger and a ward who tracks better than either of them.', [
    ['b', 'She followed a hare a mile through the snow and came back with it.'],
    ['a', 'Shot?'],
    ['b', 'Snared. Then she apologised to it.'],
    ['a', 'Then she has the patience I never had.'],
    ['b', 'And your eye, Natsu. I saw her squint. Our heir, then.'],
  ]),
];

/** A scene's id: "heir:knight|peasant". */
export const heirSceneId = (key: string): string => `heir:${key}`;

function sceneOf(d: HeirDraft): Scene {
  const key = bondKey(d.a, d.b);
  const lines = d.lines.map(([who, text]) => say(who, text));
  const split = Math.max(1, lines.length - 1);
  const shots: Shot[] = [
    { look: d.look, cam: wide(288, 205), ...shoot('wide', undefined, 'still', 'fade'), caption: `An heir: ${d.title}`, acts: [{ who: 'a', enter: 250, from: 120 }, { who: 'b', enter: 330, from: 460 }], lines: lines.slice(0, split) },
    { look: d.look, cam: wide(290, 215, 1.25), ...shoot('two', undefined, 'pushIn'), lines: lines.slice(split), hold: 1 },
  ];
  return {
    id: heirSceneId(key),
    title: `An heir: ${d.title}`,
    blurb: d.blurb,
    moment: { kind: 'heir', pair: key },
    family: 'bond',
    music: 'solemn',
    cast: { a: { role: `unit:${d.a}`, x: 250, facing: 'right', hidden: true }, b: { role: `unit:${d.b}`, x: 330, facing: 'left', hidden: true } },
    shots,
  };
}

export const HEIR_SCENES: readonly Scene[] = DRAFTS.map(sceneOf);
/** The pairs (bond keys) that have an heir scene written. */
export const HEIR_SCENE_KEYS: readonly string[] = DRAFTS.map((d) => bondKey(d.a, d.b));
