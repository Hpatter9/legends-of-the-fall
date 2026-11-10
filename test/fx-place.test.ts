// FX-PLACE (docs/notes/fx-place.md): the tiles the page draws for an effect on the ground are the tiles the sim acts on. Each rule of
// `render/fxPlace.ts` against the sim itself: every king's spell cast on a crowded board touches only fighters on its drawn tiles (and, for the
// spells that strike all there, every foe on them); a wall rises on exactly its drawn row; an aura's drawn diamond is the reach the sim counts;
// an area's 3x3 is `landArea`'s; the Mythics' bursts are their moves' own reaches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, startBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { castSpell, MANA_MAX, SPELLS, type SpellId } from '../src/sim/spells';
import { apart } from '../src/sim/battle';
import { AREA_REACH, areaSkill, areaTiles, auraTiles, spellTiles, tilesWithin } from '../src/render/fxPlace';
import { bareBoard } from './bare';

const key = (a: { u: number; v: number }) => `${a.u},${a.v}`;

/** A fight on bare ground: foes on every tile of rows 0 to 5, heroes on rows 7 to 10 (row 6 empty), the king's spells ready at `rank`. */
function crowd(rank: number, empty = false): Battle {
  const b = bareBoard(startBattle(7));
  b.units = [];
  b.phase = 'fight';
  if (!empty)
    for (let v = 0; v < b.board.d; v++)
      for (let u = 0; u < b.board.w; u++) {
        if (v === 6) continue;
        const x = addUnit(b, v < 6 ? 'skeleton' : 'knight', u, v);
        x.hp = x.maxHp = 1e6;
      }
  b.spells.mana = MANA_MAX;
  b.spells.ranks = Object.fromEntries(Object.keys(SPELLS).map((id) => [id, rank]));
  return b;
}

/** The fighters a cast touched: its marks on them (`spellfx`), the king's blows and heals on them. */
function touched(out: BattleEvent[]): Set<number> {
  const ids = new Set<number>();
  for (const e of out) {
    if (e.kind === 'spellfx') ids.add(e.to);
    if (e.kind === 'hit' && (e.by === 0 || e.by === undefined) && e.src !== 'dot') ids.add(e.to);
    if (e.kind === 'heal' && (e.by === undefined || e.by === 0)) ids.add(e.to);
  }
  return ids;
}

// (spells whose reach is not a patch of the board: the chain jumps on from its first foe, Blink moves a hero to the tile, the conjured wolves and
// decoys stand where there is room, the meteor and the starfall are drawn by their own `area` events)
const ROAMING: SpellId[] = ['chain', 'blink', 'wolves', 'mirage', 'raisedead', 'resurrect', 'meteor', 'starfall'];
// (the spells that act on every foe on their tiles, not one picked among them)
const ALL_IN: SpellId[] = ['frost', 'lance', 'sunbeam', 'shatter', 'snare', 'hex', 'gale'];

test("every king's spell touches only the fighters on the tiles drawn for it, at rank 1 and the top rank", () => {
  let cast = 0;
  let touches = 0;
  for (const rank of [1, 3]) {
    for (const id of Object.keys(SPELLS) as SpellId[]) {
      if (ROAMING.includes(id) || SPELLS[id].target === 'all') continue;
      if (id === 'firewall' || id === 'icewall' || id === 'bonewall') continue;
      const b = crowd(rank);
      const [u, v] = [3, 5];
      const tiles = new Set(spellTiles(b.board, id, u, v, rank).map(key));
      const out: BattleEvent[] = [];
      b.spells.events.length = 0;
      const ok = castSpell(b, id, u, v);
      out.push(...b.spells.events);
      if (!ok) continue;
      cast++;
      touches += touched(out).size;
      for (const i of touched(out)) {
        const x = b.units.find((y) => y.id === i)!;
        assert.ok(tiles.has(key(x)), `${id} (rank ${rank}) touched ${x.def} at ${key(x)}, off its drawn tiles`);
      }
      if (ALL_IN.includes(id)) {
        const hit = touched(out);
        for (const x of b.units) if (x.side === 'foe' && tiles.has(key(x))) assert.ok(hit.has(x.id) || id === 'gale', `${id} (rank ${rank}) missed the ${x.def} at ${key(x)} on its drawn tiles`);
      }
    }
  }
  // (the casts went off, and touched fighters: the check is not empty)
  assert.ok(cast >= 36 && touches >= 100, `${cast} casts touched ${touches}`);
});

test('the Lance is drawn on its column and the Sunbeam on its row, not a 3x3 at the aimed tile', () => {
  const b = crowd(1, true);
  const lance = spellTiles(b.board, 'lance', 4, 5);
  assert.equal(lance.length, b.board.d);
  assert.ok(lance.every((t) => t.u === 4));
  const beam = spellTiles(b.board, 'sunbeam', 4, 5);
  assert.equal(beam.length, b.board.w);
  assert.ok(beam.every((t) => t.v === 5));
  assert.equal(spellTiles(b.board, 'sunbeam', 4, 5, 3).length, 3 * b.board.w, 'the top rank burns three rows');
  assert.deepEqual(spellTiles(b.board, 'quake', 4, 5), [], 'a spell on every foe draws no patch');
});

test("the king's walls rise on exactly their drawn row", () => {
  for (const rank of [1, 3])
    for (const id of ['firewall', 'icewall', 'bonewall'] as SpellId[]) {
      const b = crowd(rank, true);
      b.spells.events.length = 0;
      assert.ok(castSpell(b, id, 3, 5), id);
      const raised = new Set(b.spells.events.filter((e) => e.kind === 'terrain' && e.ms > 0).map((e) => key(e as { u: number; v: number })));
      assert.deepEqual([...raised].sort(), spellTiles(b.board, id, 3, 5, rank).map(key).sort(), `${id} rank ${rank}`);
    }
});

test("an area's 3x3 is the sim's; an aura's drawn tiles are a diamond of its reach, as the sim counts it", () => {
  const b = crowd(1, true);
  // (`landArea` strikes Chebyshev 1 + r)
  assert.equal(areaTiles(b.board, { u: 3, v: 5 }).tiles.length, 9);
  assert.equal(areaTiles(b.board, { u: 3, v: 5, r: 1 }).tiles.length, 25);
  // (`toolkit/auras.ts` holds a fighter when `apart` (Manhattan) is within the reach)
  for (const reach of [1, 2, 3]) {
    const tiles = auraTiles(b.board, { u: 3, v: 5 }, reach);
    for (let v = 0; v < b.board.d; v++)
      for (let u = 0; u < b.board.w; u++) assert.equal(tiles.some((t) => t.u === u && t.v === v), apart({ u, v }, { u: 3, v: 5 }) <= reach, `${reach}: ${u},${v}`);
  }
});

test("the Mythics' bursts are drawn as their moves' own reach, a ward in the help's colours; Vael's totality ward rides on a blow", () => {
  const b = crowd(1, true);
  const crown = areaTiles(b.board, { u: 3, v: 5 }, 'Crownfall');
  assert.equal(crown.tiles.length, tilesWithin(b.board, 3, 5, 4, 'diamond').length);
  assert.equal(crown.help, false);
  assert.equal(areaTiles(b.board, { u: 3, v: 5 }, 'Solar Aegis').help, true);
  assert.equal(areaTiles(b.board, { u: 3, v: 5 }, 'Comet Lance').tiles.length, 1, 'one foe struck: its own tile');
  assert.equal(areaTiles(b.board, { u: 3, v: 5 }, 'Heavenfall').burns, 6000);
  // (the skill an area belongs to: this tick's cast, else Vael's ward on her own tile, else her last cast)
  assert.equal(areaSkill('Crownfall', 'Eclipse Cleave', { def: 'vael', u: 3, v: 5 }, { u: 3, v: 5 }), 'Crownfall');
  assert.equal(areaSkill(undefined, 'Eclipse Cleave', { def: 'vael', u: 3, v: 5 }, { u: 3, v: 5 }), 'Solar Aegis');
  assert.equal(areaSkill(undefined, 'Meteor', { def: 'wizard', u: 0, v: 0 }, { u: 3, v: 5 }), 'Meteor');
  for (const k of Object.keys(AREA_REACH)) assert.ok(AREA_REACH[k].reach >= 0 && AREA_REACH[k].reach <= 5, k);
});
