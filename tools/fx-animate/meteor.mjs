// A strip of the king's Meteor: node tools/fx-animate/meteor.mjs <out.png>
import { writeFileSync, mkdirSync } from 'node:fs';
import { boot, setup, strip, sheet } from './harness.mjs';
const [w = 393, h = 852] = (process.argv[3] ?? '393x852').split('x').map(Number);
const { browser, page } = await boot({ w, h });
await setup(page, { heroes: ['knight', 'wizard', 'samurai'], band: 'skeletons' });
mkdirSync('out/fxframes', { recursive: true });
const shots = await strip(page, () => {
  const g = window.__game; const f = g.b.units.find((x) => x.side === 'foe');
  g.fx.show(g.b, [{ kind: 'spell', id: 'meteor', u: f.u, v: f.v }, { kind: 'area', id: 'meteor', by: 0, u: f.u, v: f.v, ms: 700 }]);
}, { n: 10, step: 100, zoom: 1.6 });
const files = shots.map((b, i) => { const f = `out/fxframes/meteor-${i}.png`; writeFileSync(f, b); return f; });
sheet(process.argv[2] ?? 'out/meteor.png', files);
await browser.close();
