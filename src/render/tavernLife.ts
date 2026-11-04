// What each hero does in the tavern: one fixed activity at their one fixed spot (tavernSpots.ts), chosen to fit the hero and the
// furniture there (the owner: "give each person in the tavern a proper animation: idling, sitting in a chair, playing darts, singing,
// drinking, etc. They would each have a specific place in the tavern for this so it won't be random"). Plain data and arithmetic (no
// Pixi, no DOM), so a test can check it: the same hero always does the same thing at the same spot, and its rhythm comes from its own
// name, never from chance. `tavernLifeDraw.ts` draws it: the painted activity sheets where they have landed
// (`src/art/tavern/life/<kind>.png`, see docs/notes/tavern-art-prompt.md), a placeholder made of the hero's battle sheet and small
// pack props until then.

import { ROOM_W, SPOTS } from './tavernSpots';

export type Activity =
  | 'drink'
  | 'tea'
  | 'eat'
  | 'sharpen'
  | 'coin'
  | 'conjure'
  | 'darts'
  | 'sing'
  | 'music'
  | 'dance'
  | 'cheer'
  | 'cards'
  | 'story'
  | 'listen'
  | 'read'
  | 'doze'
  | 'meditate'
  | 'hearth'
  | 'lean'
  | 'dice'
  | 'tinker'
  | 'armwrestle';

export interface ActivityInfo {
  /** A plain name for it (the art prompt's headings). */
  name: string;
  /** Sitting (needs a seat at the spot), standing (no seat), or either. */
  posture: 'sit' | 'stand' | 'either';
  /** The steady loop, and the occasional action (the "beat") that breaks it, in words for the art prompt. */
  loop: string;
  beat: string;
  /** How often the beat comes round and how long it lasts (ms). */
  every: number;
  lasts: number;
}

/** Every activity, what it looks like and its rhythm. */
export const ACTIVITIES: Record<Activity, ActivityInfo> = {
  drink: { name: 'Drinking', posture: 'either', loop: 'holding a tankard at the chest, breathing, a small sway', beat: 'raises the tankard to the mouth, a long swig, lowers it with a contented sigh', every: 5200, lasts: 1400 },
  tea: { name: 'A hot cup', posture: 'either', loop: 'both hands round a steaming cup held at the chest', beat: 'blows on it and takes a careful sip', every: 6400, lasts: 1600 },
  eat: { name: 'Eating', posture: 'either', loop: 'chewing, a bite of food in hand', beat: 'takes a big bite', every: 3000, lasts: 900 },
  sharpen: { name: 'Sharpening or cleaning a weapon', posture: 'either', loop: 'the weapon across the lap or held low, a whetstone or rag drawn along it', beat: 'holds the weapon up to the light and checks the edge', every: 1100, lasts: 500 },
  coin: { name: 'Flipping a coin', posture: 'either', loop: 'idle, a coin in the fingers', beat: 'flicks the coin up with the thumb and catches it', every: 2600, lasts: 900 },
  conjure: { name: 'A little magic', posture: 'either', loop: 'one palm open and up, a small light dancing over it, idly watched', beat: 'closes the hand on the light and opens it again: the light changes shape', every: 4200, lasts: 1000 },
  darts: { name: 'Playing darts', posture: 'stand', loop: 'standing side on to the board, weighing a dart, taking aim', beat: 'the throw: arm back, snap forward, follow through', every: 3400, lasts: 1100 },
  sing: { name: 'Singing on the stage', posture: 'stand', loop: 'playing the instrument and singing, swaying to the tune', beat: 'a big flourish: head back on a high note', every: 3600, lasts: 1200 },
  music: { name: 'Playing an instrument', posture: 'either', loop: 'playing, tapping a foot', beat: 'a trill, the instrument lifted', every: 3600, lasts: 1200 },
  dance: { name: 'Dancing', posture: 'stand', loop: 'a stepping jig on the spot to the bard\'s beat', beat: 'a spin', every: 4160, lasts: 1040 },
  cheer: { name: 'Cheering the bard', posture: 'stand', loop: 'clapping along, nodding to the beat', beat: 'a fist (or tankard) raised with a cheer', every: 2600, lasts: 700 },
  cards: { name: 'Playing cards', posture: 'sit', loop: 'a hand of cards held in a fan, studying it', beat: 'slaps a card down on the table', every: 5600, lasts: 1200 },
  story: { name: 'Telling a story', posture: 'sit', loop: 'talking with the hands, leaning in', beat: 'the big moment: arms flung wide', every: 3600, lasts: 1500 },
  listen: { name: 'Listening to a story', posture: 'sit', loop: 'leaning on the table, chin on a hand, rapt', beat: 'sits back in surprise, or laughs', every: 7000, lasts: 1500 },
  read: { name: 'Reading', posture: 'sit', loop: 'an open book held up, eyes moving', beat: 'turns a page', every: 7000, lasts: 600 },
  doze: { name: 'Dozing', posture: 'sit', loop: 'slumped, head nodding, slow breathing', beat: 'a snore and a start, then settles again', every: 9000, lasts: 1400 },
  meditate: { name: 'Meditating', posture: 'sit', loop: 'still, eyes closed, hands together, slow breathing', beat: 'one long out-breath', every: 8000, lasts: 1600 },
  hearth: { name: 'Warming by the fire', posture: 'either', loop: 'hands held out to the fire, rubbing them now and then', beat: 'rubs the hands together hard and blows on them', every: 4800, lasts: 1200 },
  lean: { name: 'Leaning, arms crossed', posture: 'stand', loop: 'arms crossed, weight on one leg, watching the room', beat: 'a slow look round and back', every: 9000, lasts: 1800 },
  dice: { name: 'Rolling dice', posture: 'either', loop: 'shaking dice in a loose fist', beat: 'throws them and leans to see', every: 3000, lasts: 900 },
  tinker: { name: 'Tinkering', posture: 'either', loop: 'fiddling with a joint or the weapon\'s workings, a tool in hand', beat: 'a spark jumps; shakes the hand', every: 1300, lasts: 500 },
  armwrestle: { name: 'Arm-wrestling', posture: 'sit', loop: 'elbow on the table, hands locked with the rival, straining', beat: 'nearly wins, the arms tip, then back to the middle', every: 2600, lasts: 1300 },
};

export interface Life {
  act: Activity;
  /** Why this fits the hero and the spot (kept with the data, so the choice is never a mystery). */
  why: string;
  /** The other hero this one does it with: the rival in an arm-wrestle, the teller a listener listens to. */
  with?: string;
  /** The colour of a small magic or a spark: fire, star (an illusion) or zap (machinery). */
  tint?: 'fire' | 'star' | 'zap' | 'spark';
  /** The instrument the placeholder puts in their hands, where their battle sprite has none (the bard already carries his lute). */
  holds?: 'pipes';
}

const H = ROOM_W;

/** Every hero's one activity. The spot is theirs in `SPOTS`; the room and furniture are named in each comment. */
export const LIFE: Record<string, Life> = {
  // ---- the bar room: the starting five on the stools at the bar, then the little hearth, the round table and the long table ----
  archer: { act: 'drink', why: 'Natsu at the bar: "a hill, a quiver and a quiet afternoon" is a tankard on a stool' },
  knight: { act: 'tea', why: 'Kwame at the bar: sworn to "a sensible four o\'clock tea", so a steaming cup, not ale' },
  kunoichi: { act: 'coin', why: 'Ayame at the bar: paid up front, so she flips the coin she was paid' },
  samurai: { act: 'sharpen', why: 'Kenji at the bar: "one blade, one oath": he tends the blade, not the drink' },
  wizard: { act: 'conjure', tint: 'fire', why: 'Ravi at the bar: a pyromancer keeping a little flame alive on his palm' },
  peasant: { act: 'eat', why: 'Minh at the end of the bar, standing: a militiaman\'s supper eaten on his feet' },
  ninjaMonk: { act: 'meditate', why: 'Jiro in the chair by the little hearth: the fist of the quiet vow, sitting still' },
  yamabushi: { act: 'hearth', why: 'Kazan on the stool by the little hearth: a mountain hermit warming his hands' },
  lightningMage: { act: 'story', why: 'Malia at the round table: the herald of the storm tells the table a storm story' },
  wanderer: { act: 'listen', with: 'lightningMage', why: 'Rhys at the round table: a road-worn brewer, happy to listen to Malia' },
  gorgon: { act: 'listen', with: 'lightningMage', why: 'Xanthe on the stool at the round table: rapt, and nobody turns to stone' },
  paladin: { act: 'eat', why: 'Karim at the long table: the bearer of wounds eats a proper meal to mend' },
  cleric: { act: 'read', why: 'Selam at the long table: the lantern of mercy reads her prayer book' },
  barbarian: { act: 'armwrestle', with: 'minotaur', why: 'Eirik on the front stool of the long table: the red axe arm-wrestles the minotaur' },
  minotaur: { act: 'armwrestle', with: 'barbarian', why: 'Asterion on the other front stool: the only one in the house who can match Eirik' },

  // ---- the hearth hall: four at the big fire, two on the benches, a round table at each end, three standing about ----
  mercenary: { act: 'lean', why: 'Kian at the fire: a bounty hunter leans with his arms crossed and watches the room' },
  mummy: { act: 'hearth', why: 'Seneb at the fire: three thousand years in a cold tomb, so the hands go to the flames' },
  buccaneer: { act: 'dice', why: 'Tiago at the fire: the gambler rolls his dice on the hearthstone' },
  rifleBot: { act: 'tinker', tint: 'zap', why: 'Rook-7 at the fire: the brass sentinel tends his workings by the warmth' },
  illusionist: { act: 'conjure', tint: 'star', why: 'Luana on the left bench: the weaver of mirrors makes little lights for the room' },
  gunslinger: { act: 'sharpen', tint: 'spark', why: 'Maeve on the right bench: a deadeye cleans her pistols before anything else' },
  satyr: { act: 'music', holds: 'pipes', why: 'Dorion at the left round table: the piper of the revel never stops playing' },
  druid: { act: 'tea', why: 'Isla at the left round table: an herbal brew, steaming, for the voice of the old oaks' },
  warlock: { act: 'read', why: 'Zofia on the left table\'s stool: the black-pact warlock reads her dark book' },
  samuraiCommander: { act: 'story', why: 'Hideo at the right round table: the holder of the bridge tells of the bridge' },
  kitsune: { act: 'listen', with: 'samuraiCommander', why: 'Kohaku on the right table\'s stool: the fox listens, ears up, all mischief' },
  shambler: { act: 'doze', why: 'Hobb at the right round table: the unburied nods off through Hideo\'s war story' },
  werewolf: { act: 'eat', why: 'Vuk standing between the tables: the hunter gnaws a joint of meat' },
  karasu: { act: 'lean', why: 'Kurogane standing in the middle: the raider leans and eyes everyone\'s purse' },
  ranger: { act: 'drink', why: 'Inti standing by the benches: the warden of the snares has a quiet pint' },

  // ---- the games room: darts at the board, two card tables, the bard on the stage with his crowd, three about ----
  dreadPirate: { act: 'drink', why: 'Harrow under the dartboard: the twice-drowned captain keeps the score with a tankard' },
  lancer: { act: 'darts', why: 'Bataar at the line: a lancer throws the dart like a lance' },
  dragoon: { act: 'darts', why: 'Tiziri at the line behind him: the wyvern rider throws in turn with Bataar' },
  sage: { act: 'cards', why: 'Seydou at the first card table: the reader of the stars counts every card' },
  demonSwordsman: { act: 'cards', why: 'Aram at the first card table: a blood-pact man plays for stakes' },
  tyrant: { act: 'cards', why: 'Edmund on the first table\'s stool: the unbending verdict plays a hard hand' },
  siegeBot: { act: 'doze', why: 'Bastion at the second card table: the clocktower cannon powered down for the night' },
  juggernaut: { act: 'eat', why: 'Kerem at the second card table: the marching wall needs feeding' },
  priestess: { act: 'tea', why: 'Linnea on the second table\'s stool: a quiet cup, keeping an eye on the sleeper' },
  wolfBard: { act: 'sing', why: 'Lovell on the stage: the wolfsbane bard sings for the house' },
  timeWitch: { act: 'dance', why: 'Adaeze before the stage: she dances, a beat ahead of the tune' },
  arcBlade: { act: 'cheer', why: 'Minjun beside the stage: the spark-forged blade claps and cheers the bard' },
  beastmaster: { act: 'dance', why: 'Itzel by the stage: the caller of the grey pack dances like the pack runs' },
  reaper: { act: 'lean', why: 'Vesper in the far corner: the keeper of the last hour leans and waits, as reapers do' },
  kraken: { act: 'drink', why: 'Skerry by the wall: a child of the undertow drinks like the sea' },
};

/** The fixtures the activities face: the two hearths, the dartboard on the games room's wall, the bard's stage. */
export const HEARTHS: readonly number[] = [52, H + 192];
export const DARTBOARD = { x: H * 2 + 106, y: 52 } as const;
export const STAGE = { x0: H * 2 + 277, x1: H * 2 + 383 } as const;

/** The bard's beat (ms), which the dancers and the crowd keep. */
export const BEAT_MS = 520;

/** A number in [0, 1) from a hero's name: its own place in every rhythm, the same every time (never chance). */
export function lifeSeed(kind: string): number {
  let h = 2166136261;
  for (let i = 0; i < kind.length; i++) h = Math.imul(h ^ kind.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

/**
 * Where the hero is in its beat now: `u` runs 0 to 1 through the beat while it lasts, or is -1 between beats. The two darts players
 * take turns (the second is half a period behind), and an arm-wrestle's two hands move as one.
 */
export function beatOf(kind: string, now: number): number {
  const life = LIFE[kind];
  if (!life) return -1;
  const info = ACTIVITIES[life.act];
  const lead = life.act === 'armwrestle' && life.with && life.with < kind ? life.with : kind;
  let off = lifeSeed(lead) * info.every;
  if (life.act === 'darts') off = kind === 'dragoon' ? info.every / 2 : 0;
  if (life.act === 'dance' || life.act === 'cheer') off = 0;
  const t = (((now + off) % info.every) + info.every) % info.every;
  return t < info.lasts ? t / info.lasts : -1;
}

/**
 * The little things a hero gives off (notes, steam, embers, z's): one every `period` ms, each living `life` ms. Gives the ones alive
 * now as their age (0 to 1) and their number, so a drawer needs no list and nothing random.
 */
export function puffs(now: number, period: number, life: number, seed = 0): { age: number; n: number }[] {
  const out: { age: number; n: number }[] = [];
  const t = now + seed * period;
  const last = Math.floor(t / period);
  for (let n = last; n >= 0 && (t - n * period) < life; n--) out.push({ age: (t - n * period) / life, n });
  return out;
}

/** The painted activity sheets (when they land): `src/art/tavern/life/<kind>.png`, two rows (the loop, then the beat), square cells. */
export const LIFE_SHEET = { rows: ['loop', 'beat'], cell: 128, figure: 96, base: 8 } as const;
/** Gwen's painted figure behind the bar: `src/art/tavern/life/gwen.png`, three rows, the same cells. */
export const GWEN_SHEET = { rows: ['idle', 'wipe', 'talk'], cell: 128, figure: 96, base: 8 } as const;
/** The painted props that take over from the placeholders (`prop-<name>.png`, 16 px square, drawn at their own pixels). */
export const LIFE_PROPS = ['tankard', 'cup', 'dart', 'cards', 'dice', 'coin'] as const;

/** Which heroes share a scene with this one (a rival, a teller and the listeners), for the art prompt and the tests. */
export function partnersOf(kind: string): string[] {
  const life = LIFE[kind];
  const out = new Set<string>();
  if (life?.with) out.add(life.with);
  for (const [k, l] of Object.entries(LIFE)) if (l.with === kind) out.add(k);
  return [...out].filter((k) => SPOTS[k]);
}
