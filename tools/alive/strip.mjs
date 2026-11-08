// A strip of three frames of one screen, 400 ms apart, at 393x852:
//   node tools/alive/strip.mjs <tab index> <selector> <out.png> [wait ms] [scale]
// (tab -1: stay home; the selector's element is shot three times and the frames laid side by side)
import { serve, launch, HEROES, saveScript, clearWay } from './lib.mjs';
import { execFileSync } from 'node:child_process';
const [tab, sel, out, wait, gap] = [Number(process.argv[2]), process.argv[3], process.argv[4], Number(process.argv[5] ?? 2500), Number(process.argv[6] ?? 400)];
const srv = serve();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: process.env.CALM ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(saveScript(), [HEROES]);
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForTimeout(3000);
await clearWay(page);
if (tab >= 0) await page.locator('.hmTab').nth(tab).click({ force: true });
if (process.env.EVAL) await page.evaluate(process.env.EVAL);
await page.waitForTimeout(wait);
await clearWay(page);
const shots = [];
for (let i = 0; i < 3; i++) {
  const p = `${out}.${i}.png`;
  await page.locator(sel).first().screenshot({ path: p });
  shots.push(p);
  await page.waitForTimeout(gap);
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
