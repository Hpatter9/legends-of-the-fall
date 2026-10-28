// The phase A mock-ups of Duchess joining a fight (docs/notes/duchess-fights.md): the ask card while the heroes are placed, the
// cinematic the first time, the join card, and Duchess fighting. Serves out/web on 8171; run after `npm run web`.
// Usage: node tools/duchess/mock.mjs [w h]
import { serve, boot } from '../battle-ui/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [w, h] = [Number(process.argv[2] ?? 393), Number(process.argv[3] ?? 852)];
const PORT = 8171;
const tag = w === 393 ? '' : `-${w}x${h}`;
const s = serve('out/web', PORT);
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const { page, errors } = await boot(br, w, h, PORT);
const label = (text) => page.evaluate((t) => {
  let d = document.getElementById('mockLabel');
  if (!d) { d = document.createElement('div'); d.id = 'mockLabel'; document.body.append(d); }
  d.style.cssText = 'position:fixed;left:6px;top:50%;z-index:99999;padding:2px 6px;background:#c0392b;color:#fff;font:700 12px sans-serif;letter-spacing:1px;pointer-events:none;transform:rotate(-90deg) translate(-50%,0);transform-origin:left top';
  d.textContent = 'MOCK-UP · ' + t;
}, text);
const go = async (q) => {
  await page.goto(`http://localhost:${PORT}/?${q}`);
  await page.waitForFunction(() => window.__game, {}, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  // (an army's first wave with the party hired and placed, as the armies' shot script does)
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false, gold: 500, event: undefined });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    for (let i = 0; i < 4; i++) document.getElementById('summon').click();
    for (const h of g.run.roster.slice(0, 5)) {
      if (g.b.units.some((u) => u.tag === h.id)) continue;
      const t = g.freeTile();
      if (t) g.put(String(h.id), t);
    }
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('#cutscene .csSkip')?.click());
  await page.waitForTimeout(600);
};
// 1. the ask shape, while the heroes are placed
await go('duchess=ask');
await label('ask while placing');
await page.screenshot({ path: `docs/samples/duchess-fights-mock-ask${tag}.png` });
// 2. the join shape: the fight begins, her cinematic the first time, then the card and Duchess on the board
await go('duchess=1');
await page.evaluate(() => document.getElementById('fight').click());
await page.waitForTimeout(4200);
for (let i = 0; i < 6; i++) { await page.mouse.click(w / 2, h / 2); await page.waitForTimeout(700); }
await page.waitForTimeout(1500);
await label('first-time cinematic (existing scene)');
await page.screenshot({ path: `docs/samples/duchess-fights-mock-cinematic${tag}.png` });
await page.evaluate(() => document.querySelector('.csSkip')?.click());
await page.waitForTimeout(900);
await label('join card');
await page.screenshot({ path: `docs/samples/duchess-fights-mock-join${tag}.png` });
await page.waitForTimeout(6000);
await label('Duchess in the fight');
await page.screenshot({ path: `docs/samples/duchess-fights-mock-fight${tag}.png` });
// (and a close-up of her among the heroes, the board's own pixels at 3x)
const at = await page.evaluate(() => { const g = window.__game; const u = g.b.units.find((x) => x.def === 'duchess'); const p = g.sprites.get(u.id).root.getGlobalPosition(); return [p.x, p.y]; });
const cw = 130, ch = 110;
await page.screenshot({ path: `out/duchess-close${tag}.png`, clip: { x: Math.max(0, at[0] - cw / 2), y: Math.max(0, at[1] - ch * 0.65), width: cw, height: ch } });
const goat = await page.evaluate(() => { const u = window.__game.b.units.find((x) => x.def === 'duchess'); return u && { hp: u.hp, maxHp: u.maxHp, u: u.u, v: u.v, level: u.level, alive: u.alive }; });
console.log(w, h, 'goat', JSON.stringify(goat), 'errors', errors.length);
await br.close();
s.close();
