// A strip of a hero's skill in a real (stepped) fight: node tools/fx-animate/skill.mjs <hero> <skill name> <out.png> [step ms] [zoom]
import { writeFileSync, mkdirSync } from 'node:fs';
import { boot, sheet } from './harness.mjs';
const [hero, skill, out, step = '120', zoom = '1.7'] = process.argv.slice(2);
const { browser, page } = await boot();
await page.evaluate((hero) => { window.__lab.setup({ heroes: [hero, 'knight', 'samurai'], band: 'skeletons', charged: true, seed: 7, level: 30 }); window.__lab.speed(0); window.__lab.go(); }, hero);
let found = false;
for (let k = 0; k < 400 && !found; k++) found = (await page.evaluate(() => window.__lab.advance(100))).some((e) => e[1] === 'skill' && e[2] === skill);
if (!found) console.log('skill never came');
await page.evaluate(() => window.__lab.pin());
mkdirSync('out/fxframes', { recursive: true });
const files = [];
for (let i = 0; i < 10; i++) {
  await page.evaluate((z) => window.__lab.look(z, true), Number(zoom));
  await page.waitForTimeout(40);
  const f = `out/fxframes/skill-${i}.png`;
  writeFileSync(f, await page.screenshot({ clip: { x: 0, y: 170, width: 393, height: 520 } }));
  files.push(f);
  await page.evaluate((s) => window.__lab.advance(s), Number(step));
}
sheet(out, files);
await browser.close();
