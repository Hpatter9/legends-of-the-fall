// Portal expeditions are opt-in on new saves. Old Calamities retain their exploration graph.
import type { Run } from './run';
import type { MapNode, NodeKind } from './tower';
import type { Area, Board, PieceKind, Scenery } from './board';
import { xpFor } from './levels';
import { pendingAltar } from './rift';
import { mixSeed, Rng } from './rng';
import { makeBoard } from './board';
import { zoneFor } from './calZones';

export type RiftWorld = 'ashen' | 'rootbound' | 'caravan' | 'prism' | 'hollow' | 'frost';
export interface Expedition {
  version: 1;
  shifts: number;
  shiftedAt?: string;
  history: { region: number; node: number; world: RiftWorld; kind: NodeKind }[];
}
export const WORLDS: Record<RiftWorld, { name: string; area: Area; description: string; footing: string; ring: Scenery; piece: PieceKind }> = {
  ashen: { name: 'Ashen Keep', area: 'volcano', description: 'A shattered fortress above a river of embers.', footing: 'A narrow bridge crosses the moat below the raised bastion.', ring: 'ruin', piece: 'foundry' },
  rootbound: { name: 'Rootbound Shrine', area: 'temple', description: 'Ancient roots embrace a forgotten sanctuary.', footing: 'A healing shrine stands between two shallow pools.', ring: 'wood', piece: 'shrine' },
  caravan: { name: 'Lost Caravan', area: 'oasis', description: 'Silken tents shelter travellers beneath sandstone cliffs.', footing: 'An open sandy court lies between the caravan camps.', ring: 'rocks', piece: 'tent' },
  prism: { name: 'Prism Vault', area: 'crystal', description: 'A buried cathedral hums with violet light.', footing: 'Crystal galleries frame an elevated central dais.', ring: 'crystal', piece: 'arch' },
  hollow: { name: 'Hollow Court', area: 'graveyard', description: 'Ghost lanterns illuminate a silent mausoleum.', footing: 'A broken processional court opens between grave gardens.', ring: 'grave', piece: 'mausoleum' },
  frost: { name: 'Frostwatch', area: 'snow', description: 'An abandoned citadel beneath the northern lights.', footing: 'Slippery ice crosses the sheltered mountain court.', ring: 'rocks', piece: 'arch' },
};
export const WORLD_IDS = Object.keys(WORLDS) as RiftWorld[];
export const expeditionOf = (run: Run): Expedition | undefined => run.mode?.kind === 'calamity' ? run.rift?.expedition : undefined;

/** Six, seven and eight crossings, including the guardian. Alternatives disappear on committing a crossing. */
export function sanctuaryMap(seed: number, act: number, rows: number): MapNode[] {
  const rng = new Rng(mixSeed(seed, 0x51ac, act));
  const out: MapNode[] = [];
  for (let row = 0; row < rows; row++) {
    const kinds: NodeKind[] = row === rows - 1 ? ['boss'] : row === 0 ? ['fight', 'fight', 'fight'] : row === 1 ? ['recruit', 'fight', 'treasure'] : row === rows - 2 ? ['campfire', 'elite', 'shop'] : ['fight', rng.pick(['elite', 'treasure', 'mystery'] as NodeKind[]), rng.pick(['recruit', 'shop', 'campfire'] as NodeKind[])];
    const ids = kinds.map((_, lane) => out.length + lane);
    kinds.forEach((kind, lane) => out.push({ id: ids[lane], row, lane, kind, next: [] }));
  }
  for (const node of out) node.next = out.filter(n => n.row === node.row + 1).map(n => n.id);
  return out;
}

/** Each offer is a distinct world. The patron changes the constellation; corruption opens darker worlds. */
export function destinationWorld(run: Run, id: number): RiftWorld {
  const t = run.tower!, r = run.rift;
  const node = t.map[id];
  const saved = t.cur?.id === id ? t.cur.world : undefined;
  if (saved) return saved;
  const patron = r?.patron === 'ember' ? 1 : r?.patron === 'bastion' ? 2 : r?.patron === 'echo' ? 3 : 0;
  const roll = mixSeed(run.seed, 0xd357, t.act, node?.row ?? t.row) >>> 0;
  const start = (roll + patron + (r?.corruption ?? 0) * 2 + (expeditionOf(run)?.shifts ?? 0) * 3) % WORLD_IDS.length;
  return WORLD_IDS[(start + (node?.lane ?? 0)) % WORLD_IDS.length];
}
export const SHIFT_COST = 20;
/** One paid reshaping per crossing. No reroll can bypass the guardian or change a committed encounter. */
export function shiftDestinations(run: Run): boolean {
  const e = expeditionOf(run), t = run.tower;
  if (!e || !t || t.cur || pendingAltar(run) || run.over || t.mapDone || run.gold < SHIFT_COST || t.row >= Math.max(...t.map.map(n => n.row))) return false;
  const key = `${t.act}:${t.row}`;
  if (e.shiftedAt === key) return false;
  run.gold -= SHIFT_COST;
  e.shifts++;
  e.shiftedAt = key;
  return true;
}

/** Complete, connected courts with blocked scenic margins, authored landmarks and a safe arrival edge. The court's inner field (ten
 *  across, the Calamity's own board) is laid in one of the Calamity's zones (`calZones.ts`: a fallen nave, a crystal chasm, the crypt
 *  rows, a broken bridge over the void, a ritual circle, a flooded vault, or now and then one of the plain shapes), picked by the seed,
 *  the world and the land (`act`), with its things on its tiles; the margins are the world's scenery at the field's edge heights. */
export function destinationBoard(seed: number, world: RiftWorld, act = 1): Board {
  const spec = WORLDS[world], w = 14, d = 13, iw = w - 4;
  const rng = new Rng(mixSeed(seed, 0xa2e4));
  const field = makeBoard(seed, spec.area, iw, d, zoneFor(seed, world, act));
  const board: Board = { seed, area: spec.area, w, d, tiles: [], pieces: [], riftWorld: world, layout: field.layout };
  for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) {
    const deco = rng.int(0, 999);
    if (u >= 2 && u < w - 2) {
      board.tiles.push({ ...field.tiles[v * iw + u - 2] });
      continue;
    }
    // (the margin stands at the height of the field's edge beside it, so the court reads as one floor)
    const edge = field.tiles[v * iw + (u < 2 ? 0 : iw - 1)];
    const t: Board['tiles'][number] = { h: edge.ground === 'deep' ? 0 : edge.h, deco };
    t.scene = world === 'ashen' && (u === 0 || u === w - 1) ? 'lava' : world === 'rootbound' && u === 0 ? 'water' : spec.ring;
    t.ring = u === 1 || u === w - 2;
    board.tiles.push(t);
  }
  if (field.props?.length) board.props = field.props.map((x) => ({ ...x, u: x.u + 2 }));
  board.pieces!.push({u:1,v:1,kind:spec.piece}, {u:12,v:1,kind:world==='caravan'?'tent':world==='ashen'?'foundry':world==='hollow'?'mausoleum':'shrine'}, {u:1,v:5,kind:'lamp'}, {u:12,v:5,kind:'lamp'}, {u:1,v:11,kind:world === 'caravan' ? 'tent' : 'brazier'}, {u:12,v:11,kind:world === 'caravan' ? 'campfire' : 'lamp'}, {u:0,v:11,kind:'riftPortal'});
  return board;
}

/** Every resolved expedition strengthens the starter, including support destinations. */
export function growExpeditionStarter(run: Run): void {
  if (!expeditionOf(run) || !run.tower?.cur) return;
  const t=run.tower, h=run.roster.find(h=>h.id===run.rift!.starter);
  if (!h) return;
  const limits=[1,12,22,30], region=Math.min(3,t.act);
  const rows=t.rows?.[region-1]??6;
  const level=Math.min(30, limits[region-1]+Math.floor((limits[region]-limits[region-1])*Math.min(rows-1,t.row+1)/(rows-1)));
  h.xp=Math.max(h.xp??0,xpFor(level));
}
