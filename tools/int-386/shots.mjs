// INT-386: the ten dialogs of PR #386, each opened on its own over the built page (tools/int-386/harness.ts), at 393x852, 360x780 and
// 412x915. Run from the root of the tree to shoot, after `npm run web`:
//   node tools/int-386/shots.mjs <label> [dialog ...]
// Writes docs/samples/int-386/<label>-<dialog>-<w>.png into OUT (default: this tree's docs/samples/int-386) and prints, per shot, tap
// targets under 44 px and text under 11 px in the dialog.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [label = 'main', ...only] = process.argv.slice(2);
const OUT = process.env.OUT ?? 'docs/samples/int-386';
const HARNESS = process.env.HARNESS ?? 'tools/int-386/harness.ts';
const PORT = Number(process.env.PORT ?? 8686);
mkdirSync(OUT, { recursive: true });
const bundle = await build({ entryPoints: [HARNESS], bundle: true, write: false, format: 'iife', loader: { '.png': 'dataurl', '.webp': 'dataurl' }, nodePaths: [process.cwd() + '/node_modules'], absWorkingDir: process.cwd(), logLevel: 'error' });
const harness = bundle.outputFiles[0].text;
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', css: 'text/css', svg: 'image/svg+xml' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const DIALOGS = ['autoAsk', 'talents', 'unitInfo', 'tome', 'relic', 'stall', 'altar', 'built', 'upgrades', 'artwork'];
const SIZES = [[393, 852], [360, 780], [412, 915]];
const HEROES = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'paladin', 'ranger'];
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript((owned) => {
    if (sessionStorage.getItem('i386')) return;
    sessionStorage.setItem('i386', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 25000, stones: 40, unlocked: owned, party: owned.slice(0, 5), shards: Object.fromEntries(owned.map((k) => [k, 300])), xp: Object.fromEntries(owned.map((k) => [k, 120000])), castle: { treasury: 5, library: 3 }, tomes: { small: 4, medium: 2, large: 1 }, opened: ['tower', 'castle'], featuresTold: ['autoMerge', 'autoPlace'], scenes: ['opening'], talentPoints: {} }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false, speed: 1 }));
  }, HEROES);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.addScriptTag({ content: harness });
  for (const d of DIALOGS.filter((d) => !only.length || only.includes(d))) {
    await page.evaluate((d) => window.__int386[d](), d);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${label}-${d}-${w}.png` });
    const bad = await page.evaluate(() => {
      const box = [...document.querySelectorAll('.om, [role=dialog], dialog[open], .tBox, .rlCard')].filter((e) => e.getClientRects().length).pop();
      if (!box) return 'no dialog found';
      const out = [];
      for (const b of box.querySelectorAll('button')) { const r = b.getBoundingClientRect(); if (r.width && r.height < 44) out.push(`tap ${Math.round(r.height)}px "${b.textContent.trim().slice(0, 18)}"`); }
      for (const e of box.querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11 && e.getClientRects().length) out.push(`text ${f}px "${e.textContent.trim().slice(0, 18)}"`); }
      return [...new Set(out)].slice(0, 8).join('; ');
    });
    console.log(`${label} ${d} ${w}: ${bad || 'ok'}`);
    await page.evaluate(() => {
      document.querySelectorAll('.omVeil, .autoAsk, .int386Talents, .tModal, .fhSheet, .tomeSheet, .rlWrap, #stall, .riftAltar, #builtPop, .ulBack, dialog').forEach((e) => (e.tagName === 'DIALOG' ? (e.close?.(), e.remove()) : e.classList.contains('fhSheet') ? (e.hidden = true) : e.remove()));
    });
    await page.waitForTimeout(200);
  }
  await ctx.close();
}
await browser.close();
srv.close();
