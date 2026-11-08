// Three frames of a fight's board, 400 ms apart, at 393x852 (to show its life):
//   node tools/alive/fight.mjs <out.png> [area] [seed]
// (area: a land to force, e.g. swamp; the frames are taken in deployment, so the board is still and the life alone moves)
import { serve, launch, HEROES, saveScript, clearWay } from './lib.mjs';
import { execFileSync } from 'node:child_process';
const [out, area, seed] = [process.argv[2], process.argv[3] ?? '', Number(process.argv[4] ?? 0)];
const srv = serve();
const WANT = process.env.WANT ?? '';
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(saveScript(), [HEROES]);
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForTimeout(3000);
await clearWay(page);
await page.evaluate(([area, seed, WANT]) => {
  const g = window.__game;
  g.run.gold = 99999;
  for (let i = 0; i < 40; i++) document.getElementById('summon')?.click();
  g.run.stage = 8;
  g.run.squad = [...g.run.roster].slice(0, 5).map((h) => h.id);
  document.getElementById('home').hidden = true;
  if (seed) g.run.seed = seed;
  g.newBattle();
  // (WANT=water,tall: try the waves until a board shows one of those grounds)
  const want = (WANT || '').split(',').filter(Boolean);
  for (let s = 1; want.length && s <= 15; s++) {
    const has = window.__game.b.board.tiles.some((t) => want.includes(t.ground) || want.includes(t.scene));
    if (has) break;
    g.run.stage = s;
    g.newBattle();
  }
  document.querySelectorAll('.tipCard button, #tip button').forEach((b) => b.click());
}, [area, seed, WANT]);
await page.waitForTimeout(2500);
await clearWay(page);
// (for the sample, some of the board's empty ground is given water, tall grass, lava and a shrine, and the view rebuilt: looks only)
if (process.env.DRESS) await page.evaluate(() => {
  const g = window.__game;
  const b = g.b.board;
  const kinds = ['water', 'water', 'tall', 'tall', 'lava', 'shrine', 'deep', 'tall'];
  let n = 0;
  b.tiles.forEach((t, i) => {
    const v = Math.floor(i / b.w);
    if (v < 3 || v > 7 || t.ground || t.rock || t.wall || t.barrel || t.scene || n > 40) return;
    if ((i * 7) % 3 === 0) { t.ground = kinds[n % kinds.length]; n++; }
  });
  g.boardView.build(b, {}, 0);
});
console.log('area', await page.evaluate(() => window.__game.b.board.area), 'grounds', await page.evaluate(() => [...new Set(window.__game.b.board.tiles.map((t) => t.ground).filter(Boolean))].join(',')));
const shots = [];
for (let i = 0; i < 3; i++) {
  const p = `${out}.${i}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
  await page.waitForTimeout(400);
}
execFileSync('python3', ['-c', `
import sys
from PIL import Image
ims=[Image.open(p).convert('RGB') for p in sys.argv[2:]]
s=float(${process.env.SCALE ?? 0.5})
ims=[i.resize((int(i.width*s),int(i.height*s))) for i in ims]
w=sum(i.width for i in ims)+8*(len(ims)-1); o=Image.new('RGB',(w,max(i.height for i in ims)),(20,20,20))
x=0
for i in ims: o.paste(i,(x,0)); x+=i.width+8
o.save(sys.argv[1])
import os
for p in sys.argv[2:]: os.remove(p)
`, out, ...shots]);
await browser.close(); srv.close();
