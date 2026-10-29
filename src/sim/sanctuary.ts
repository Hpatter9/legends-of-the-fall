// Portal expeditions are opt-in on new saves. Old Calamities retain their exploration graph.
import type { Run } from './run';
import type { MapNode, NodeKind } from './tower';
import type { Area, Board, PieceKind, Scenery } from './board';
import { xpFor } from './levels';
import { pendingAltar } from './rift';
import { mixSeed, Rng } from './rng';

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

/** Complete, connected courts with blocked scenic margins, authored landmarks and a safe arrival edge. */
export function destinationBoard(seed: number, world: RiftWorld): Board {
  const spec = WORLDS[world], w = 14, d = 13;
  const rng = new Rng(mixSeed(seed, 0xa2e4));
  const board: Board = { seed, area: spec.area, w, d, tiles: [], pieces: [], riftWorld: world };
  for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) {
    const margin = u < 2 || u >= w - 2;
    const t: Board['tiles'][number] = { h: v <= 4 ? 1 : 0, deco: rng.int(0, 999) };
    if (margin) {
      t.scene = world === 'ashen' && (u === 0 || u === w - 1) ? 'lava' : world === 'rootbound' && u === 0 ? 'water' : spec.ring;
      t.ring = u === 1 || u === w - 2;
    } else {
      t.paved = world !== 'caravan' && world !== 'rootbound';
      if (world === 'ashen' && v === 5) { if (u <= 4 || u >= 9) t.scene='lava'; else t.bridge=true; }
      if (world === 'hollow') t.paved=u>=5&&u<=8;
      if (world === 'frost') {t.paved=u>=4&&u<=9;if(v>=5&&v<=7&&(u===2||u===11))t.scene='rocks';}
      if (world === 'prism' && v >= 6 && v <= 8 && u >= 5 && u <= 8) t.h=1;
      if (world === 'frost' && v >= 6 && v <= 9) t.ground = 'ice';
      if (world === 'rootbound') {
        if (v >= 6 && v <= 8 && (u >= 3 && u <= 4 || u >= 9 && u <= 10)) t.ground = 'water';
        if (u === 6 && v === 7) t.ground = 'shrine';
      }
      if (world === 'hollow' && v >= 6 && v <= 9 && (u <= 3 || u >= 10)) {t.scene = 'grave';t.ring = true;}
      if (world === 'prism' && v >= 6 && v <= 9 && (u === 2 || u === 11)) t.scene = 'crystal';
      if (world === 'caravan' && v >= 5 && v <= 8 && (u === 2 || u === 11)) t.scene = 'rocks';
    }
    board.tiles.push(t);
  }
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
