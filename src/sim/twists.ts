// Floor twists: a fight, elite or boss node of the tower's map may carry one twist, rolled when the map is made (`addTwists`,
// from a side stream of the run's seed, so the maps themselves are as they were). A twist is plain data (`TwistFx`): the
// fight reads it from `Stage.twist` and `Battle.twist` through a few small hooks in battle.ts, spells.ts and abilities.ts,
// and a fight without one plays exactly as before. Curses cost the party, blessings help it, and the mixed ones cut both
// ways (every fighter feels them, the foes too).
//
// Pure rules: no Pixi, no DOM, no clock. Randomness is only the map's side stream and the board tweaks' own.

import { boardOk, DEPLOY_ROWS, tileAt, type Board } from './board';
import { mixSeed, Rng } from './rng';

export type Tone = 'curse' | 'blessing' | 'mixed';

/** What a twist does to a fight. Every field is absent (no change) unless the twist uses it. */
export interface TwistFx {
  /** Shooters (both sides) lose this much range, to a least of 1. */
  fog?: number;
  /** Healing, of every kind, is multiplied by this. */
  heal?: number;
  /** This many tiles of the middle ground crack into lava. */
  lava?: number;
  /** Everyone jumps this much higher. */
  jump?: number;
  /** The foes' attack and hp are multiplied by these. */
  foeAtk?: number;
  foeHp?: number;
  /** The heroes' attack is multiplied by this. */
  heroAtk?: number;
  /** Gold from the win is multiplied by this. */
  gold?: number;
  /** The heroes' back rows lose their outer tiles to boulders. */
  narrow?: boolean;
  /** Everyone acts this much faster (swings and steps). */
  pace?: number;
  /** Everyone walks at this speed (below 1 is slower). */
  chill?: number;
  /** The king's mana fills this much faster. */
  mana?: number;
  /** Every hero starts the fight with this share of its hp gone. */
  wound?: number;
  /** One foe starts among the heroes' back row. */
  ambush?: boolean;
}

export interface Twist {
  id: string;
  name: string;
  /** One line for the map and the deploy banner. */
  text: string;
  tone: Tone;
  fx: TwistFx;
}

const t = (id: string, name: string, tone: Tone, text: string, fx: TwistFx): Twist => ({ id, name, text, tone, fx });

export const TWISTS: Record<string, Twist> = Object.fromEntries(
  [
    t('fog', 'Fog', 'mixed', 'A thick mist: every shooter loses 1 range.', { fog: 1 }),
    t('holy', 'Holy ground', 'blessing', 'The earth is hallowed: all healing is 50% stronger.', { heal: 1.5 }),
    t('lava', 'Lava cracks', 'mixed', 'The floor splits: 4 tiles in the middle burn whoever steps on them.', { lava: 4 }),
    t('gale', 'Gale', 'blessing', 'A wild wind: everyone jumps 1 higher.', { jump: 1 }),
    t('bloodmoon', 'Blood moon', 'mixed', 'The foes hit 25% harder, and drop double gold.', { foeAtk: 1.25, gold: 2 }),
    t('narrow', 'Narrow pass', 'curse', 'Boulders crowd the heroes\' rows: fewer tiles to stand on.', { narrow: true }),
    t('treasure', 'Treasure ground', 'blessing', 'Coin lies about the place: +50% gold for the win.', { gold: 1.5 }),
    t('haste', 'Haste', 'mixed', 'The air hums: everyone acts 15% faster.', { pace: 1.15 }),
    t('frost', 'Frost', 'mixed', 'A bitter cold: everyone walks 25% slower.', { chill: 0.75 }),
    t('mana', 'Mana surge', 'blessing', "Power pools in the stones: the king's mana fills 50% faster.", { mana: 1.5 }),
    t('cursed', 'Cursed', 'curse', 'A dark pall: the heroes start 10% down on hp.', { wound: 0.1 }),
    t('ambush', 'Ambush', 'curse', "A foe lies in wait among the heroes' back row.", { ambush: true }),
    t('glory', 'Glory', 'blessing', 'Old banners stir: the heroes strike 10% harder.', { heroAtk: 1.1 }),
    t('fortified', 'Fortified', 'curse', 'The foes have dug in: +20% hp for every foe.', { foeHp: 1.2 }),
  ].map((x) => [x.id, x]),
);
export const TWIST_IDS = Object.keys(TWISTS);

/** The share of fight nodes and elites that carry a twist; a boss carries one from act 2 on. */
export const TWIST_RATE = { fight: 0.4, elite: 0.6 } as const;

/** A node's twist, rolled from the seed on its own stream: its id, or none. `kind` is the node's. */
export function rollTwist(seed: number, act: number, node: number, kind: string): string | undefined {
  if (kind !== 'fight' && kind !== 'elite' && kind !== 'boss') return undefined;
  const rng = new Rng(mixSeed(seed, 0x7715, act, node));
  if (kind === 'boss' ? act < 2 : !rng.chance(TWIST_RATE[kind])) return undefined;
  return rng.pick(TWIST_IDS);
}

/** The deploy rows' outer tiles that a narrow pass fills with boulders (the back row's four outer tiles, the next row's two). */
const narrowTiles = (w: number, d: number): readonly (readonly [number, number])[] => [[0, d - 1], [1, d - 1], [w - 2, d - 1], [w - 1, d - 1], [0, d - 2], [w - 1, d - 2]];

/** Change a fight's board for its twist: lava cracks in the middle ground, boulders in a narrow pass. Boulders stay only where everyone can still get round them. */
export function twistBoard(b: Board, fx: TwistFx, seed: number): void {
  if (fx.lava) {
    const rng = new Rng(mixSeed(seed, 0x1a7a));
    const spots: number[] = [];
    for (let v = DEPLOY_ROWS; v < b.d - DEPLOY_ROWS; v++) for (let u = 0; u < b.w; u++) if (!tileAt(b, u, v)!.rock) spots.push(v * b.w + u);
    for (let i = 0; i < fx.lava && spots.length; i++) {
      const tile = b.tiles[spots.splice(rng.int(0, spots.length - 1), 1)[0]];
      tile.ground = 'lava';
      delete tile.bush;
    }
  }
  if (fx.narrow) {
    for (const [u, v] of narrowTiles(b.w, b.d)) {
      const tile = tileAt(b, u, v);
      if (!tile || tile.rock) continue;
      const was = { ground: tile.ground, bush: tile.bush };
      tile.rock = true;
      delete tile.ground;
      delete tile.bush;
      if (!boardOk(b)) {
        tile.rock = false;
        tile.ground = was.ground;
        tile.bush = was.bush;
      }
    }
  }
}

/** Give every fight node of a map its twist (the map's own kinds and links are made first, and not touched). */
export function addTwists(nodes: { id: number; kind: string; twist?: string }[], seed: number, act: number): void {
  for (const n of nodes) {
    const id = rollTwist(seed, act, n.id, n.kind);
    if (id) n.twist = id;
  }
}
