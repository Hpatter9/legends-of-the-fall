// The Moonlit Shrine's own dressing. All large additions occupy existing solid
// buildings or deep water; this changes pictures, never the battle's tiles.
import type { Board } from '../sim/board';
import type { Placement } from './fieldLooks';

/** Dress the existing placements and add the pond's two islands and lanterns. */
export function dressMoonlitShrine(b: Board, zone: Uint8Array, source: Placement[]): Placement[] {
  const out = source.map((p): Placement => {
    if (p.road || p.fort !== undefined) return p;
    const variant = (p.front * 31 + 7) % 3;
    const z = String.fromCharCode(zone[p.front]);
    const eastWood = p.u > 74 && p.v < 61;
    // The three longhouses already occupy 3x2 or 2x3 solid plots. Their own
    // 2x2 shrines/gardens fit inside those plots, with the same sort/floor tile.
    if (p.name === 'longhouse') return { ...p, name: p.u > 65 ? 'landmarkB' : 'landmarkA', scale: 0.95 };
    if (p.name === 'brazier') return { ...p, name: 'prop4', scale: 0.85 };
    if (p.name === 'skullTorch') return { ...p, name: 'prop8', scale: 0.85 };
    if (p.name === 'bonfire' || p.name === 'bonefire') return { ...p, name: 'prop15', scale: 1 };
    if (p.name === 'conicalTent' && !p.set) return { ...p, name: variant === 0 ? 'prop7' : variant === 1 ? 'prop6' : 'prop9', scale: 0.85 };
    if (p.name === 'leanTo' || p.name === 'hideFrame') return { ...p, name: p.name === 'leanTo' ? 'prop11' : 'prop7', scale: 0.85 };
    if (p.name === 'stockpile' && p.hut !== undefined && p.u < 25 && p.v > 65) return { ...p, name: 'prop7', scale: 0.9 };
    if (p.name === 'darkRocks' || p.name === 'darkRocksB') {
      return { ...p, name: variant === 0 ? 'prop14' : z === 'V' && variant === 1 ? 'prop16' : p.name, scale: 0.65 };
    }
    if (p.name === 'wetBoulders') {
      const name = variant === 0 ? 'prop14' : variant === 1 ? (eastWood ? 'prop3' : 'prop1') : p.name;
      return { ...p, name, scale: name === 'prop14' ? 0.7 : name === 'wetBoulders' ? 0.7 : 0.85 };
    }
    if (p.name === 'smallBanner' || p.name === 'pennantPole') return { ...p, name: 'hangingBanner' };
    if (p.name === 'pine1' || p.name === 'pine2' || p.name === 'gnarledTree') {
      const name = z === 'N' ? (variant === 0 ? 'prop12' : 'prop2') : eastWood ? (variant === 0 ? 'prop12' : 'prop3') : variant === 0 ? 'prop2' : 'prop1';
      return { ...p, name, scale: p.scale ?? 0.85 };
    }
    if (p.name === 'burntTree' && z === 'N' && variant === 0) {
      return { ...p, name: 'prop12', scale: 0.85 };
    }
    // Lamps are narrow enough to keep the existing post's open ground readable.
    if (p.name === 'spearSign') return { ...p, name: 'prop8', scale: 0.85 };
    return p;
  });
  // Existing wall and tent tiles carry their own decoration, rather than
  // placing tall scenery on the open land between them.
  const details: Placement[] = [];
  for (const p of out) {
    if (p.name === 'palisadeRun' && (p.u + p.v) % 9 === 0) {
      details.push({ name: (p.u * 7 + p.v * 3) % 5 < 3 ? 'prop8' : 'hangingBanner', u: p.u, v: p.v, front: p.front, flip: p.flip, scale: 0.6 });
    }
    if (p.name === 'warTent' && p.hut !== undefined) {
      details.push({ name: (p.front % 3) ? 'wallGoods' : 'prop11', u: p.u + (p.flip ? 0.1 : 0.35), v: p.v + (p.flip ? 0.35 : 0.1), front: p.front, scale: 0.35, low: true });
    }
  }
  out.push(...details);
  const reserved = new Set<number>();
  const addWaterLandmark = (name: string, u: number, v: number) => {
    const tiles = Array.from({ length: 9 }, (_, i) => (v + Math.floor(i / 3)) * b.w + u + i % 3);
    if (!tiles.every((i) => b.tiles[i]?.ground === 'deep' && !b.tiles[i].bridge && b.tiles[i].h === b.tiles[tiles[0]].h)) return;
    tiles.forEach((i) => reserved.add(i));
    out.push({ name, u: u + 1, v: v + 1, front: tiles[8], scale: 0.95 });
  };
  addWaterLandmark('landmarkC', 70, 85); // lantern-lit pavilion on the moon pond
  addWaterLandmark('landmarkD', 87, 77); // blossom-covered waterfall island

  // Sparse floating lamps, koi and lilies: only non-walkable water, never the
  // bridge or the two shallow fords. Low pieces remain behind the fighters.
  for (let v = 65; v < 95; v += 4) for (let u = 56; u < 96; u += 4) {
    const i = v * b.w + u;
    if (b.tiles[i]?.ground !== 'deep' || b.tiles[i].bridge) continue;
    if ([...reserved].some((t) => Math.abs(t % b.w - u) + Math.abs(Math.floor(t / b.w) - v) < 4)) continue;
    const variant = (u * 13 + v * 7) % 5;
    out.push({ name: variant === 0 ? 'waterProp10' : variant === 1 ? 'waterProp13' : 'waterFlowers', u, v, front: i, scale: variant === 0 ? 0.7 : 0.85, low: variant !== 0 });
  }
  // Paper lanterns beside the existing paved approach, in pairs. Their offset
  // keeps the centre of the road and every combat route visually clear.
  for (const [u, v] of [[77,70], [77,74], [80,92], [84,92], [88,92]]) {
    const i = v * b.w + u;
    if (!b.tiles[i]?.paved || b.tiles[i].bridge) continue;
    for (const side of [-1, 1]) out.push({ name: 'prop8', u: u + side * 0.65, v: v - side * 0.65, front: i, scale: 0.65 });
  }
  return out;
}
