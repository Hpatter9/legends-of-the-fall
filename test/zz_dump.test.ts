import { test } from 'node:test';
import { makeBoard, W, D } from '../src/sim/board';
import { LAYOUT_IDS, type LayoutId } from '../src/sim/layouts';
test('dump', () => {
  const area = (process.env.AREA ?? 'highlands') as never;
  for (const id of LAYOUT_IDS.slice(1)) for (const seed of [3, 11]) {
    const b = makeBoard(seed * 101, area, W, D, id as LayoutId);
    const rows: string[] = [];
    for (let v = 0; v < b.d; v++) {
      let r = '';
      for (let u = 0; u < b.w; u++) {
        const t = b.tiles[v * b.w + u];
        r += t.wall ? '#' : t.rock ? 'o' : t.barrel ? 'B' : t.ground === 'deep' ? '~' : t.ground === 'lava' ? 'L' : t.ground === 'shrine' ? 'S' : t.bridge ? '=' : t.ground === 'water' ? 'w' : t.ground === 'tall' ? '"' : t.ground === 'ice' ? 'i' : String(t.h);
      }
      rows.push(r);
    }
    console.log(`${id} ${seed} (${b.layout})\n` + rows.join('\n'));
  }
});
