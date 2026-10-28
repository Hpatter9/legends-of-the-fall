// Screens of Duchess joining a fight (docs/notes/duchess-fights.md): her cinematic the first time, the card, and Duchess fighting (a
// close-up of her among the heroes, and her bubble). Serves out/web on 8171; run after `npm run web`. Writes docs/samples/duchess-fights-*.
// Usage: node tools/duchess/shots.mjs [w h]
import { serve, boot } from '../battle-ui/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [w, h] = [Number(process.argv[2] ?? 393), Number(process.argv[3] ?? 852)];
const PORT = 8171;
const tag = `-${w}`;
const s = serve('out/web', PORT);
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const { page, errors } = await boot(br, w, h, PORT);
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
    for (let i = 0; i < 8 && g.run.roster.length < 5; i++) document.getElementById('summon').click();
    for (const h of g.run.roster.slice(0, 5)) {
      if (g.b.units.some((u) => u.tag === h.id)) continue;
      const t = g.freeTile();
      if (t) g.put(String(h.id), t);
    }
    g.refresh();
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('#cutscene .csSkip')?.click());
  await page.waitForTimeout(600);
};
await go('duchess=1');
await page.evaluate(() => document.getElementById('fight').click());
await page.waitForTimeout(4200);
for (let i = 0; i < 6; i++) { await page.mouse.click(w / 2, h / 2); await page.waitForTimeout(700); }
await page.waitForTimeout(1500);
await page.screenshot({ path: `docs/samples/duchess-fights-cinematic${tag}.png` });
await page.evaluate(() => document.querySelector('.csSkip')?.click());
await page.waitForTimeout(900);
const card = await page.evaluate(() => { const c = document.querySelector('.dfCard'); const r = c.getBoundingClientRect(); const q = document.getElementById('quip'); return { shown: !c.hidden, top: r.top, bottom: r.bottom, panel: document.getElementById('panel').getBoundingClientRect().top, quipSeen: !!q && getComputedStyle(q).visibility !== 'hidden' && q.classList.contains('on') }; });
await page.screenshot({ path: `docs/samples/duchess-fights-card${tag}.png` });
// (her bubble: wait for one of her own lines, up to a while)
let said = false;
for (let i = 0; i < 40 && !said; i++) {
  await page.waitForTimeout(250);
  said = await page.evaluate(() => { const q = document.getElementById('quip'); return !!q && q.classList.contains('on') && q.querySelector('small')?.textContent === 'Duchess'; });
}
await page.screenshot({ path: `docs/samples/duchess-fights-fight${tag}.png` });
const at = await page.evaluate(() => { const g = window.__game; const u = g.b.units.find((x) => x.def === 'duchess'); const p = g.sprites.get(u.id).root.getGlobalPosition(); return [p.x, p.y]; });
const cw = 130, ch = 110;
await page.screenshot({ path: `out/duchess-close${tag}.png`, clip: { x: Math.max(0, Math.min(w - cw, at[0] - cw / 2)), y: Math.max(0, at[1] - ch * 0.65), width: cw, height: ch } });
const goat = await page.evaluate(() => { const u = window.__game.b.units.find((x) => x.def === 'duchess'); return u && { hp: u.hp, maxHp: u.maxHp, level: u.level, alive: u.alive }; });
console.log(w, h, JSON.stringify({ goat, card, said, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors: errors.length }));
await br.close();
s.close();
