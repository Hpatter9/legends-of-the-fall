// UX-002 flicker probe (docs/notes/ux-fixes.md). For each menu screen: the frames the browser composites (a CDP screencast, about
// 80 ms apart) over 2.4 s, and a DOM log of pictures replaced, nodes removed and hidden toggles; also frames while each screen
// opens, in-screen actions, a tab cycle and an overlay closing. Serve a build, then:
//   node tools/ux-fixes/flicker-probe.mjs <port> <out dir> <width> <height> [screen,screen...]
//   python3 tools/ux-fixes/dropouts.py <out dir>/<w>x<h>
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [port = '8471', outDir = 'probe-before', W = '393', H = '852', only = ''] = process.argv.slice(2);
const url = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
  // the DOM probe: img src rewrites, image/canvas nodes removed, hidden toggles, nodes replaced
  window.__mut = { src: 0, imgOut: 0, canvasOut: 0, hidden: 0, removed: 0, byTarget: {} };
  const tag = (n) => (n.id ? '#' + n.id : n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : n.nodeName);
  new MutationObserver((list) => {
    const m = window.__mut;
    for (const r of list) {
      if (r.type === 'attributes' && r.attributeName === 'src') m.src++;
      if (r.type === 'attributes' && r.attributeName === 'hidden') m.hidden++;
      if (r.type === 'childList')
        for (const n of r.removedNodes) {
          if (n.nodeType !== 1) continue;
          m.removed++;
          const imgs = n.nodeName === 'IMG' ? 1 : n.querySelectorAll?.('img').length ?? 0;
          const cvs = n.nodeName === 'CANVAS' ? 1 : n.querySelectorAll?.('canvas').length ?? 0;
          m.imgOut += imgs;
          m.canvasOut += cvs;
          if (imgs || cvs) m.byTarget[tag(r.target)] = (m.byTarget[tag(r.target)] ?? 0) + imgs + cvs;
        }
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'hidden'] });
});
await page.goto(`${url}/?seed=7`);
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => {
  const g = window.__game;
  g.meta.armies.orcs = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1, 4: 1 } };
  g.meta.armies.undead = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7 } };
  g.meta.opened = ['castle'];
  g.meta.crowns = 1500;
  g.meta.scenes = ['opening'];
  localStorage.setItem('legends.meta', JSON.stringify(g.meta));
  localStorage.setItem('legends.tips', JSON.stringify('home,deploy,fight,mana,skill,summon,crowns,calamity,tower,talents,castle,spellbook,stash,equipment,recycle,retry,autoReplay'.split(',')));
});
await page.goto(`${url}/`);
await page.waitForFunction(() => window.__game && !document.getElementById('home').hidden, null, { timeout: 90000 });
await page.evaluate(() => { document.getElementById('tipSkip')?.click(); });
await page.waitForTimeout(2500);

const H_ = {
  camp: () => window.__game.home.show('battle'),
  tavern: () => window.__game.home.show('heroes') || window.__game.home.closeSheet(),
  roster: () => window.__game.home.openRoster(),
  dossier: () => window.__game.home.openSheet(window.__game.meta.unlocked[0], true),
  party: () => window.__game.home.go(window.__game.home.hooks.onParty),
  sanctum: () => window.__game.home.show('recruit'),
  castle: () => window.__game.home.show('castle'),
  spells: () => window.__game.home.show('spells'),
  codex: () => window.__game.home.openCodex(),
  settings: () => document.getElementById('hmGear').click(),
  achievements: () => window.__game.home.openAchievements(),
  armies: () => window.__game.home.openArmies(),
};
const reset = async () => {
  await page.evaluate(() => {
    for (const id of ['settings', 'party']) { const e = document.getElementById(id); if (e && !e.hidden) e.hidden = true; }
    const g = window.__game; g.home.open();
  });
  await page.waitForTimeout(600);
};
const results = {};
const cdp = await ctx.newCDPSession(page);
let sink = null;
cdp.on('Page.screencastFrame', async (f) => {
  if (sink) sink.push({ t: f.metadata.timestamp * 1000, data: f.data });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
});
// n frames gap ms apart: the composited frames streamed by the browser, the latest at or before each 80 ms mark (every streamed frame is also kept)
const capture = async (name, n, gap, action) => {
  const dir = `${outDir}/${W}x${H}/${name}`;
  mkdirSync(dir, { recursive: true });
  await page.evaluate(() => { const m = window.__mut; Object.assign(m, { src: 0, imgOut: 0, canvasOut: 0, hidden: 0, removed: 0, byTarget: {} }); });
  sink = [];
  // (the stream is started afresh for each capture, so no frame from before it is in the queue)
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: +W, maxHeight: +H });
  await page.waitForTimeout(120);
  sink = [];
  const t0 = Date.now();
  // (a nudge so the stream has a first frame)
  if (action) await page.evaluate(action);
  const pending = [];
  while (Date.now() - t0 < n * gap) {
    pending.push(await page.evaluate(() => [...document.images].filter((im) => im.isConnected && im.offsetParent && !im.complete).length));
    await page.waitForTimeout(gap);
  }
  await page.waitForTimeout(150);
  await cdp.send('Page.stopScreencast');
  // (in time order; the first frame a restarted stream sends is the last one of the stream before, so it is dropped)
  const frames = sink.slice(1).sort((a, b) => a.t - b.t); sink = null;
  writeFileSync(`${dir}/times.json`, JSON.stringify(frames.map((f) => Math.round(f.t - t0))));
  frames.forEach((f, i) => writeFileSync(`${dir}/${String(i).padStart(3, '0')}.png`, Buffer.from(f.data, 'base64')));
  const mut = await page.evaluate(() => window.__mut);
  results[name] = { ...mut, undecoded: pending.reduce((a, b) => a + b, 0), streamed: frames.length, spanMs: frames.length ? Math.round(frames.at(-1).t - frames[0].t) : 0 };
};
const names = Object.keys(H_).filter((k) => !only || only.split(',').includes(k));
for (const name of names) {
  await reset();
  // the screen settling in: open it, then 30 frames 80 ms apart from a second later (steady state)
  await page.evaluate(H_[name]);
  await page.waitForTimeout(1200);
  await capture(name, 30, 80);
  // the switch itself: frames from the moment it opens
  await reset();
  await capture(`${name}-open`, 15, 80, H_[name]);
}
// actions inside screens: switching hero in the dossier, its tabs, a tap in the party council
const extra = {
  'dossier-switch': [H_.dossier, () => document.querySelectorAll('.heroStrip button')[1]?.click()],
  'dossier-tab': [H_.dossier, () => [...document.querySelectorAll('[role=tab]')].find((t) => t.textContent === 'Progression')?.click()],
  'dossier-equip': [H_.dossier, () => [...document.querySelectorAll('[role=tab]')].find((t) => t.textContent === 'Equipment')?.click()],
  'party-tap': [H_.party, () => document.querySelector('#ptGrid button, #ptGrid .ptCard')?.click()],
  'codex-tab': [H_.codex, () => [...document.querySelectorAll('#hmSubBody button')].find((t) => t.textContent === 'Heroes')?.click()],
  'armies-swipe': [H_.armies, () => document.querySelector('.asNext, .asArrow.next, [aria-label*=Next]')?.click()],
};
for (const [name, [open, act]] of Object.entries(extra)) {
  if (only && !only.split(',').includes(name)) continue;
  await reset();
  await page.evaluate(open);
  await page.waitForTimeout(1200);
  await capture(name, 15, 80, act);
}
if (!only) {
// closing overlays and tab switches back and forth
await reset();
await capture('tabs-cycle', 30, 80, () => { const h = window.__game.home; const t = ['recruit', 'heroes', 'battle', 'castle', 'spells', 'battle']; t.forEach((x, i) => setTimeout(() => h.show(x), i * 400)); });
await reset();
await page.evaluate(() => window.__game.home.openArmies());
await page.waitForTimeout(800);
await capture('armies-close', 15, 80, () => window.__game.home.closeSub());
}
writeFileSync(`${outDir}/${W}x${H}/dom.json`, JSON.stringify({ results, errors }, null, 1));
console.log(JSON.stringify({ errors }));
await browser.close();
