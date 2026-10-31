// The Eidolon chains' data (EIDOLON-CHAINS, batch 5 of the quests and Eidolons design, `docs/notes/eidolon-chains.md`): the six chains,
// one an Eidolon, easiest first, each with who gives it, what opens it, its parts (a goal, the giver's words as it begins, and the piece
// it gives), the prologue told before it begins and the binding at the end. Only the first, Askel the Cinderhound's, is written; the other
// five are the rails (their Eidolon, giver, what opens them, and that they end in a trial) for the batches that write them: a chain with
// no parts is never offered.
//
// Every story here is plain data in the cinematics' shape (`sceneKit.ts`) or as lines, so the general shot layer can take them over.
// The voice: wry and warm, in British spelling. Pure data: no Pixi, no DOM.

import { close, say, tell, wide, type CastMember, type Scene } from './sceneKit';
import type { Goal, Need, Reward } from './questData';

/** A piece of an Eidolon's pact: found by a chain's part, set on the altar at the binding. `art` names a painted gear icon the piece's
 *  sigil borrows until the pieces are painted (`src/art/gear/`). */
export interface PieceDef {
  id: string;
  name: string;
  /** Two lines for its card: what it is, and what it means. */
  lines: readonly [string, string];
  art: string;
}

export interface ChainPart {
  id: string;
  title: string;
  /** The goal in plain words, for the log. */
  text: string;
  goal: Goal;
  /** The giver's words as the part begins (shown on the chain's card while it is going). */
  begin: string;
  piece: PieceDef;
  /** Paid the moment the part is done (the design: a bronze chest a part). */
  reward: Reward;
}

/** What opens a chain (beside the chain before it bound): a quest need, or the Calamity cleared whole once. */
export type ChainOpens = Need | { kind: 'calCleared' };

/** The binding ceremony, beat by beat (ms from its start), as data: the page draws each beat (`eidolonBinding.ts`). */
export type BindingBeatKind = 'dark' | 'pieces' | 'circle' | 'rise' | 'name' | 'line' | 'bound';
export interface BindingBeat {
  at: number;
  beat: BindingBeatKind;
  /** Who speaks on this beat, if anyone, and the words. */
  who?: 'summoner' | 'eidolon' | 'narrator';
  text?: string;
}

export interface ChainDef {
  id: string;
  /** The Eidolon it binds (`eidolons.ts`). */
  eidolon: string;
  /** Its place: chains open one after another, easiest first. */
  order: number;
  title: string;
  giver: { name: string; title: string };
  opens: ChainOpens;
  /** What opens it, in words, for a card while it sleeps ("the Beast Packs cleared"). */
  opensWords: string;
  /** Its last part is a trial, a fight against the Eidolon itself (chains 2 to 6; the trials are a later batch). */
  trial: boolean;
  /** The parts in order (none: not written yet, and never offered). */
  parts: readonly ChainPart[];
  /** The story before it begins (the giver's telling), played by the page's scene player. `party` fills the heroes' parts. */
  prologue?: Scene;
  /** The binding's beats, and the line the Eidolon speaks as it is bound. */
  binding?: readonly BindingBeat[];
}

const party = (i: number, x: number, more: Partial<CastMember> = {}): CastMember => ({ role: `party:${i}`, x, facing: 'right', ...more });

/** Askel's three pieces. */
export const EMBER_HEART: PieceDef = {
  id: 'emberHeart',
  name: 'The Ember Heart',
  lines: ["In the war-fire, among the bones, a coal that will not go out. It beats, slowly, like something asleep.", 'Warm in the hand, and it does not burn.'],
  art: 'emberAmulet',
};
export const KENNEL_COLLAR: PieceDef = {
  id: 'kennelCollar',
  name: 'The Kennel Collar',
  lines: ["An iron collar the width of a cartwheel, the keep's crest on its buckle.", 'The wolves were keeping it warm for someone.'],
  art: 'ironRing',
};
export const KENNEL_BELL: PieceDef = {
  id: 'kennelBell',
  name: 'The Kennel Bell',
  lines: ["A small silver bell from the Bone Captain's belt: he was the first kings' kennel-master, once.", 'The dead came when he rang it. Something else will come when we do.'],
  art: 'silverBell',
};

/** The prologue of Askel's chain: the Summoner's telling, in the Sanctum, after the Orc Warband falls. The Summoner speaks from the altar
 *  (off the stage: the voice in the scene); the party's first two heroes answer. */
const HEARTH_BELOW: Scene = {
  id: 'eid-askel-prologue',
  title: 'The Hearth Below',
  blurb: 'The Summoner tells of the first kings\' hound.',
  moment: { kind: 'eidolon', chain: 'askel' },
  music: 'solemn',
  cast: { summoner: party(0, 120, { hidden: true, name: 'The Summoner' }), a: party(0, 250), b: party(1, 214) },
  shots: [
    { look: 'temple', cam: wide(260, 200), fx: ['fadeIn', 'glow'], cue: 'earthRumble', caption: 'The Summoning Sanctum', lines: [tell('The Warlord has fallen. Under the Sanctum\'s floor, something breathes, like a hearth banked for the night.')] },
    { cam: close(['a', 'b']), lines: [say('summoner', 'Did you feel it, when the Warlord fell? Heat, under the stones. The keep has not felt that since the first kings.'), say('a', 'I thought that was the braziers.')] },
    { cam: wide(240, 196), fx: ['glow'], lines: [say('summoner', 'The braziers do not growl. The first kings kept a hound of living embers: Askel, the Cinderhound. He ran their hunts, and slept by their hearth.'), say('summoner', 'When the Calamity broke the old pacts, he ran into the fire under the hills. He has been running ever since.')] },
    { cam: close('b'), lines: [say('b', 'And he wants to come home?')] },
    { cam: wide(260, 200), lines: [say('summoner', 'Every hound does. We call him the old way: the ember of his heart, his collar, and the bell that called him to supper. Find them, and I will bind him to the keep.'), tell("Askel's chain has begun: three pieces to find. The quest log's Eidolons tab keeps the trail.")] },
  ],
};

/** Askel's binding: the pieces on the altar, the bell rung, the circle catching fire, the hound rising behind the altar. */
const ASKEL_BINDING: readonly BindingBeat[] = [
  { at: 0, beat: 'dark' },
  { at: 500, beat: 'pieces', who: 'summoner', text: 'The heart, the collar, the bell. Set them on the altar, and stand well back.' },
  { at: 3000, beat: 'circle', who: 'narrator', text: 'The Summoner rings the kennel bell, once. Every brazier in the Sanctum leans towards the altar.' },
  { at: 5400, beat: 'rise' },
  { at: 6600, beat: 'name' },
  { at: 8000, beat: 'line', who: 'eidolon', text: 'A bell I have not heard in three hundred years. I have run a long way, little keep. Blow your horn, and I will run for you.' },
  { at: 12500, beat: 'bound', who: 'narrator', text: 'Bound. Askel answers the War Horn when it is full: boss waves and fallen foes fill it.' },
];

/** The six chains, easiest first. Only Askel's is written; the rest are the rails for their batches (the design's givers and openings,
 *  rewritten for the six chosen Eidolons when their chains are written). */
export const CHAINS: readonly ChainDef[] = [
  {
    id: 'askel',
    eidolon: 'askel',
    order: 1,
    title: 'The Hound Comes Home',
    giver: { name: 'The Summoner', title: 'Keeper of the old pacts' },
    opens: { kind: 'army', army: 'orcs' },
    opensWords: 'the Orc Warband cleared',
    trial: false,
    prologue: HEARTH_BELOW,
    binding: ASKEL_BINDING,
    parts: [
      {
        id: 'askel1',
        title: 'Embers of the Warband',
        text: 'Beat an Orc Warband boss: the Chieftain (wave 8) or the Warlord (wave 15)',
        goal: { kind: 'bossDown', n: 1, army: 'orcs', boss: ['orcChieftain', 'orcWarlord'] },
        begin: 'The heat rose when the Warlord fell. Whatever the orcs carry, they keep it by their war-fire. Beat one of their chiefs again, and look in the ashes.',
        piece: EMBER_HEART,
        reward: { chest: 'bronze' },
      },
      {
        id: 'askel2',
        title: 'The Kennel Fires',
        text: 'Win the quest battle The Kennel Fires (Ravi or Natsu fights; any starter hero may stand in)',
        goal: { kind: 'battle', n: 1, battle: 'kennelFires' },
        begin: "The first kings' kennels stood on the hill to the south. They burned when the Calamity came, and they are burning still. Something has made its den there.",
        piece: KENNEL_COLLAR,
        reward: { chest: 'bronze' },
      },
      {
        id: 'askel3',
        title: "The Kennel-Master's Bell",
        text: 'Fell the Bone Captain (the Undead Legion\'s eighth wave)',
        goal: { kind: 'bossDown', n: 1, army: 'undead', boss: ['boneCaptain'] },
        begin: 'One thing more: the bell that called him to supper. The kennel-master was buried with it, and the Legion does not leave the buried alone.',
        piece: KENNEL_BELL,
        reward: { chest: 'bronze' },
      },
    ],
  },
  // (the rails: what opens each, who gives it, and its trial; their parts, pieces and stories come with their batches)
  { id: 'nivra', eidolon: 'nivra', order: 2, title: "Nivra's chain", giver: { name: 'A frost-bitten hunter', title: 'Passing the camp' }, opens: { kind: 'army', army: 'beasts' }, opensWords: 'the Beast Packs cleared', trial: true, parts: [] },
  { id: 'aurelan', eidolon: 'aurelan', order: 3, title: "Aurelan's chain", giver: { name: 'Gwen Tallow', title: 'Keeper of the tavern' }, opens: { kind: 'army', army: 'wildwood' }, opensWords: 'the Wildwood cleared', trial: true, parts: [] },
  { id: 'voltara', eidolon: 'voltara', order: 4, title: "Voltara's chain", giver: { name: 'The Crown', title: 'A Royal charge' }, opens: { kind: 'army', army: 'labyrinth' }, opensWords: 'the Labyrinth cleared', trial: true, parts: [] },
  { id: 'gorm', eidolon: 'gorm', order: 5, title: "Gorm's chain", giver: { name: 'Duchess', title: 'A goat of consequence' }, opens: { kind: 'army', army: 'infernal' }, opensWords: 'the Infernal Host cleared', trial: true, parts: [] },
  { id: 'vaelkhar', eidolon: 'vaelkhar', order: 6, title: "Vaelkhar's chain", giver: { name: 'A voice in the rift', title: 'Heard where a guardian fell' }, opens: { kind: 'calCleared' }, opensWords: 'the Calamity cleared once', trial: true, parts: [] },
];

const BY_ID = new Map(CHAINS.map((c) => [c.id, c]));
export const chainById = (id: string): ChainDef | undefined => BY_ID.get(id);
/** The chain that binds an Eidolon. */
export const chainOfEidolon = (eidolon: string): ChainDef | undefined => CHAINS.find((c) => c.eidolon === eidolon);
/** Every piece of every chain written, by id. */
export const PIECES: ReadonlyMap<string, PieceDef> = new Map(CHAINS.flatMap((c) => c.parts.map((p) => [p.piece.id, p.piece] as const)));

/* ------------------------------------------------------------------ the save */

/** A chain's lasting state (`Meta.quests.chains[id]`): there once begun. `part` is the part going (the parts' count: every piece found,
 *  ready to bind), `progress` its count, `bound` once the binding is done. */
export interface ChainState {
  part: number;
  progress: number;
  bound?: boolean;
}

/** The chains' state read from a save, safely: chains no longer in the game dropped, parts and counts kept in range, pieces only those
 *  known. Empty fields left out (an older save has none). */
export function readChainState(raw: { chains?: unknown; pieces?: unknown }): { chains?: Record<string, ChainState>; pieces?: string[] } {
  const out: { chains?: Record<string, ChainState>; pieces?: string[] } = {};
  if (raw.chains && typeof raw.chains === 'object') {
    const chains: Record<string, ChainState> = {};
    for (const [id, v] of Object.entries(raw.chains as Record<string, unknown>)) {
      const c = chainById(id);
      if (!c || !c.parts.length || !v || typeof v !== 'object') continue;
      const r = v as Partial<ChainState>;
      const part = Math.max(0, Math.min(c.parts.length, Math.floor(Number(r.part) || 0)));
      const need = c.parts[part]?.goal.n ?? 0;
      chains[id] = { part, progress: Math.max(0, Math.min(need, Math.floor(Number(r.progress) || 0))), ...(r.bound && part >= c.parts.length ? { bound: true } : {}) };
    }
    if (Object.keys(chains).length) out.chains = chains;
  }
  if (Array.isArray(raw.pieces)) {
    const pieces = [...new Set(raw.pieces.filter((p): p is string => typeof p === 'string' && PIECES.has(p)))];
    if (pieces.length) out.pieces = pieces;
  }
  return out;
}
