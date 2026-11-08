// A strip of an ailment on a hero, the fight stepped by hand: node tools/fx-animate/ailment.mjs <kind> <out.png>
import { writeFileSync, mkdirSync } from 'node:fs';
import { boot, sheet } from './harness.mjs';
const [kind, out] = process.argv.slice(2);
const { browser, page } = await boot();
await page.evaluate(() => { window.__lab.setup({ heroes: ['knight', 'wizard', 'samurai'], band: 'skeletons', seed: 7, level: 30 }); window.__lab.speed(0); window.__lab.go(); window.__lab.advance(300); });
await page.evaluate((kind) => { const g = window.__game; const h = g.b.units.find((u) => u.side === 'hero'); h.ail = [{ kind, until: g.b.t + 99999, power: 1 }]; h.dot = ['burn', 'poison', 'bleed', 'curse'].includes(kind) ? { kind, until: g.b.t + 99999, dmg: 0, every: 99999 } : undefined; g.zoom = 3; }, kind);
mkdirSync('out/fxframes', { recursive: true });
const files = [];
for (let i = 0; i < 10; i++) {
  const p = await page.evaluate(() => { const g = window.__game; const h = g.b.units.find((u) => u.side === 'hero'); const sp = g.sprites.get(h.id); g.zoom = 3; g.tx = g.cx = sp.x; g.ty = g.cy = sp.y - 20; g.clampCam(); g.place(); const q = g.world.toGlobal({ x: sp.x, y: sp.y }); return q; });
  await page.waitForTimeout(40);
  const f = `out/fxframes/ail-${i}.png`;
  writeFileSync(f, await page.screenshot({ clip: { x: Math.max(0, Math.min(393 - 180, p.x - 90)), y: Math.max(0, p.y - 170), width: 180, height: 220 } }));
  files.push(f);
  await page.evaluate(() => window.__lab.advance(100));
}
sheet(out, files);
await browser.close();
