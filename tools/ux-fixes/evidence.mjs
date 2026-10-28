// UX-002 flicker evidence: how long the camp stays empty once the loading screen goes, and a tab switch two tabs away caught mid-slide
// (slowed to 3 s so a still can show it). Serve a build, then: node tools/ux-fixes/evidence.mjs <port> <before|after> <out dir>
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [port, tag, outDir] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
  localStorage.setItem('legends.tips', JSON.stringify('home,deploy,fight,mana,skill,summon,crowns,calamity,tower,talents,castle,spellbook,stash,equipment,recycle,retry,autoReplay'.split(',')));
});
await page.goto(`http://127.0.0.1:${port}/?seed=7`);
await page.waitForFunction(() => window.__game);
await page.evaluate(() => { const g = window.__game; g.meta.scenes = ['opening']; localStorage.setItem('legends.meta', JSON.stringify(g.meta)); });
// launch: how long the camp's canvas is still empty once the loading screen has gone (measured in the page, each frame)
await page.addInitScript(() => {
  const watch = () => {
    const loading = document.getElementById('loading');
    if (loading) return requestAnimationFrame(watch);
    const t0 = performance.now();
    let frames = 0;
    const look = () => {
      const c = document.querySelector('.hm-battle canvas');
      let painted = false;
      try {
        if (c && c.width > 1) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i]) n++; painted = n > d.length / 64 / 4; }
      } catch {}
      if (painted) { window.__blank = { ms: Math.round(performance.now() - t0), frames, sinceStart: Math.round(t0) }; return; }
      frames++;
      requestAnimationFrame(look);
    };
    look();
  };
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(watch));
});
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForFunction(() => window.__blank, null, { timeout: 60000 });
console.log(tag, 'camp empty after the loading screen went:', JSON.stringify(await page.evaluate(() => window.__blank)));
await page.waitForTimeout(2000);
await page.addStyleTag({ content: '.hmPage { transition-duration: 3s, 0s !important; transition-delay: 0s, 3s !important; } .hmPage.on { transition-delay: 0s, 0s !important; }' });
await page.evaluate(() => window.__game.home.show('recruit'));
await page.waitForTimeout(3600);
await page.evaluate(() => window.__game.home.show('battle'));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/slide-${tag}.png` });
await browser.close();
