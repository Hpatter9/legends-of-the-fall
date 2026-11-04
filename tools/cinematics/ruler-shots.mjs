import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root='out/web', out='docs/samples';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', json: 'application/json', css: 'text/css', webp:'image/webp', woff2:'font/woff2' };
const srv = createServer((q, r) => { const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html'); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' }); r.end(readFileSync(p)); }).listen(0);
const PORT = srv.address().port;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const ruler of [process.argv[2] ?? 'sun_viper']) {
  const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate((r) => { localStorage.clear(); localStorage.setItem('lotf-tips-off', '1'); localStorage.setItem('legends.settings', JSON.stringify({ ruler: r, rulerPicked: true })); }, ruler);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => { const e = document.getElementById('cutscene'); return e && !e.hidden; }, null, { timeout: 30000 });
  let shot = false, last = '';
  for (let i = 0; i < 40 && !shot; i++) {
    const text = await page.evaluate(() => document.getElementById('cutscene')?.innerText.replace(/\s+/g, ' ').trim());
    if (/That is you/.test(text)) { await page.waitForTimeout(1800); await page.screenshot({ path: `${out}/cinematic-ruler-opening-${ruler}.png` }); shot = true; break; }
    await page.mouse.click(196, 500); await page.waitForTimeout(700);
  }
  console.log(ruler, 'opening', shot);
  // skip rest of opening
  await page.evaluate(() => document.getElementById('cutscene')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
  for (let i = 0; i < 30 && !(await page.evaluate(() => !!window.__game)); i++) { await page.getByText('Start with this pack').click({ timeout: 800 }).catch(() => page.mouse.click(196, 500)); await page.waitForTimeout(600); }
  await page.screenshot({ path: '/tmp/claude-0/s/state.png' });
  const ok = await page.evaluate(() => typeof window.__game?.playScene);
  console.log('playScene', ok);
  if (ok === 'function') {
    for (let i = 0; i < 20 && (await page.evaluate(() => { const e = document.getElementById('cutscene'); return !!e && !e.hidden; })); i++) { await page.getByText('Skip', { exact: true }).click({ timeout: 800 }).catch(() => {}); await page.waitForTimeout(500); }
    await page.evaluate(() => {
      const g = window.__game;
      g.scenes.play({ id: 'ruler-shot', title: 'The Crown speaks', blurb: '', moment: { kind: 'eidolon', chain: 'voltara' }, music: 'solemn',
        cast: { crown: { role: 'face:ruler', x: 0, facing: 'right', hidden: true, name: 'The Crown' } },
        shots: [{ look: 'temple', cam: { x: 260, y: 200, zoom: 1 }, lines: [{ who: 'crown', text: 'By the Crown\'s seal, and the Crown\'s patience, which is thin.' }] }] }, g.players());
    });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `${out}/cinematic-ruler-crown-${ruler}.png` });
    console.log(ruler, 'crown shot');
  }
}
await browser.close(); process.exit(0);
