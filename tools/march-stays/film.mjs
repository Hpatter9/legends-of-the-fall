// MARCH-STAYS (docs/notes/march-stays.md): the hand-over from one wave to the next, filmed. The owner: "make sure the heroes don't
// disappear from the map in between waves. currently they walk to the next section, then disappear until the next round is ready. I
// also want the already fallen into place battleground to stay visible. sometimes it disappears as well."
//
//   npm run web && node tools/march-stays/film.mjs [--cpu 4] [--waves 4] [--size 393x852] [--speed 2] [--army wildwood] [--stage 6]
//                                                  [--tap] [--rebuild] [--shots docs/samples/march-stays/<name>] [--keep]
//
// It plays an army's waves on a real clock, CPU throttled as a phone's is, and after EVERY picture the page draws, from the last foe's
// fall to the next wave's deploy, writes down what is on the stage: for each hero who was standing at the fight's end, whether a
// fighter of that hero is drawn (in the stage's tree, shown, not see-through), and how many of the host section's tiles are drawn,
// lifted or faded. It FAILS (exit 1) if, in any picture:
//   - a hero who marched is not drawn (from the fight's end to a second into the deploy), or
//   - the next section, once every tile of it has fallen into place, shows fewer tiles than it has, or one in the air again.
// `--tap` taps the card on mid-march (the walk cut short); `--rebuild` has the loop watch's cure build the board afresh while the
// party stands; `--shots` films it with the browser's screencast and keeps a contact sheet of each hand-over, for the eye (`--keep`: the frames too).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8741);
const root = process.env.ROOT ?? 'out/web';
const CPU = Number(opt('--cpu', '4'));
const WAVES = Number(opt('--waves', '4'));
const [W, H] = opt('--size', '393x852').split('x').map(Number);
const SPEED = Number(opt('--speed', '2'));
const ARMY = opt('--army', 'wildwood');
const STAGE = Number(opt('--stage', '6'));
const TAP = args.includes('--tap');
const REBUILD = args.includes('--rebuild');
const SHOTS = opt('--shots', '');
const EVERY = Number(opt('--every', '1'));
const KEEP = args.includes('--keep');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ ...(existsSync(PINNED) ? { executablePath: PINNED } : {}), args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const OWNED = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'paladin', 'kraken', 'lancer', 'reaper', 'druid'];
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));

const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message)));
await page.addInitScript(([owned, xp, speed]) => {
  if (sessionStorage.getItem('ms-set')) return;
  sessionStorage.setItem('ms-set', '1');
  localStorage.clear();
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 99999, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, chapel: true, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood'], ultAuto: true, spellAuto: true, ultSeen: Object.fromEntries(owned.map((k) => [k, 1])) }));
  localStorage.setItem('lotf-tips-off', '1');
  localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed, quips: false }));
}, [OWNED, xpAt(32), SPEED]);
const cdp = await ctx.newCDPSession(page);
await page.goto(`http://localhost:${PORT}/`, { timeout: 600000 });
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 600000 });
await page.waitForTimeout(2000);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.mouse.click(4, 4);

// (the watcher: after every picture the page draws, what is on the stage. It only reads)
await page.evaluate(() => {
  const g = window.__game;
  const ms = (window.__ms = { on: false, frames: [], want: [], endB: null });
  /** Whether a thing of the stage is really drawn: in the tree up to the stage, shown all the way, and not see-through. */
  const drawn = (c) => {
    if (!c || c.destroyed) return 0;
    let a = 1;
    for (let at = c; at; at = at.parent) {
      if (at.destroyed || !at.visible || !at.renderable) return 0;
      a *= at.alpha;
      if (at === g.app.stage) return a;
    }
    return 0;
  };
  const look = () => {
    if (!ms.on) return;
    const b = g.b;
    const chain = g.chain;
    const act = chain.act;
    // (every fighter's sprite there is: the battle's own, the march's walkers, and the party kept standing after it)
    const sprites = [...g.sprites.values(), ...(act?.moving ?? []).map((m) => m.sprite), ...(chain.stood ?? []).map((m) => m.sprite)];
    const heroes = ms.want.map((tag) => {
      let best = 0;
      for (const s of sprites) if (s.unit.side === 'hero' && s.unit.tag === tag && s.unit.alive !== false) best = Math.max(best, drawn(s.root));
      return best;
    });
    const tiles = g.boardView.built?.tiles ?? [];
    let shown = 0;
    let lifted = 0;
    for (const t of tiles) {
      if (drawn(t) > 0.98) shown++;
      if (t.y < -0.5) lifted++;
    }
    ms.frames.push({
      t: Math.round(performance.now()),
      phase: b.phase,
      next: b !== ms.endB,
      move: !!document.body.dataset.move,
      march: !!act,
      landed: act ? act.landed.filter(Boolean).length : -1,
      heroes,
      tiles: tiles.length,
      shown,
      lifted,
      card: !document.getElementById('result').hidden,
      fight: (() => { const f = document.getElementById('fight'); return !!f && !f.hidden && f.offsetParent !== null; })(),
    });
  };
  g.app.renderer.runners.postrender.add({ postrender: look });
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

await page.evaluate(([party, army, stage]) => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { seed: 4242, mode: { kind: 'army', army }, stage, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
  document.getElementById('home').hidden = true;
  g.startRun(r);
}, [OWNED.slice(0, 5), ARMY, STAGE]);
await page.waitForTimeout(3000);

const rows = [];
let shotN = 0;
// (the film: the browser's own screencast, which costs the throttled page nothing; each frame is kept with the page's clock)
let filmDir = '';
let filmN = 0;
cdp.on('Page.screencastFrame', (f) => {
  void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => undefined);
  if (!filmDir || filmN++ % EVERY) return;
  // (named by the page's own clock, so each can be set against the watcher's pictures)
  writeFileSync(`${filmDir}/${String(shotN++).padStart(4, '0')}-${Math.round((f.metadata.timestamp ?? 0) * 1000 - origin)}.jpg`, Buffer.from(f.data, 'base64'));
});
const origin = await page.evaluate(() => performance.timeOrigin);
if (SHOTS) await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, everyNthFrame: 1 });
/** An event's card left over the deploy is left ("Leave", "Continue"), so the next film shows the board; and through a hand-over the
 *  road's event is taken off the run before its card can open over the film (the card dims the whole page). */
const leaveEvent = () => page.evaluate(() => { for (const el of document.querySelectorAll('button')) if (el.offsetParent !== null && /^(Leave|Continue)/.test(el.textContent ?? '')) el.click(); });
for (let wave = 1; wave <= WAVES; wave++) {
  await leaveEvent();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(1200);
  await page.evaluate((speed) => { document.getElementById('bossCard')?.click(); document.getElementById('fight').click(); window.__game.setSpeed?.(speed); }, SPEED);
  // (the fight: watched from its last moments, so the fall of the last foe is in the film)
  const began = Date.now();
  let phase = 'fight';
  while (Date.now() - began < 300000) {
    phase = await page.evaluate(() => {
      const g = window.__game;
      const b = g.b;
      document.getElementById('bossCard')?.click();
      const ms = window.__ms;
      if (!ms.on && b.phase === 'fight' && b.units.filter((u) => u.side === 'foe' && u.alive).length <= 1) {
        ms.on = true;
        ms.frames = [];
        ms.endB = b;
      }
      if (b.phase !== 'fight' && b.phase !== 'deploy') {
        if (!ms.on) { ms.on = true; ms.frames = []; }
        ms.endB = b;
        // (the heroes who will march: those standing at the fight's end)
        ms.want = b.units.filter((u) => u.side === 'hero' && u.alive && u.tag !== undefined && u.owner === undefined).map((u) => u.tag);
      }
      return b.phase;
    });
    if (phase !== 'fight') break;
    await page.waitForTimeout(100);
  }
  if (phase !== 'won') { console.log(`wave ${wave}: the fight ended ${phase}: no hand-over to film`); break; }
  // (the hand-over: screenshots as fast as they come, until the next wave's deploy has stood a second)
  const t0 = Date.now();
  let deployAt = 0;
  let tapped = false;
  let rebuilt = false;
  const dir = SHOTS ? `${SHOTS}/wave${wave}` : '';
  if (dir) mkdirSync(dir, { recursive: true });
  filmDir = dir;
  filmN = 0;
  while (Date.now() - t0 < 90000) {
    const st = await page.evaluate(() => {
      const g = window.__game;
      const ms = window.__ms;
      if (g.run.event) g.run.event = undefined;
      return { next: g.b !== ms.endB, phase: g.b.phase, march: g.chain.active, t: Math.round(performance.now()), frames: ms.frames.length, walked: (g.chain.act?.t ?? 0) };
    });
    await page.waitForTimeout(40);
    if (TAP && !tapped && st.march && st.walked > 1200) {
      tapped = true;
      await page.evaluate(() => document.getElementById('result').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    }
    // (the loop watch's cure, made to happen while the party stands: the drawing "keeps faulting" for a watch's turn)
    if (REBUILD && !rebuilt && !st.march && !st.next && st.walked === 0 && Date.now() - t0 > 2500) {
      const did = await page.evaluate(() => {
        const g = window.__game;
        if (g.chain.active || document.body.dataset.move) return false;
        g.loop.faults = 99;
        g.watchLoop();
        return true;
      });
      rebuilt = did;
    }
    if (st.next && st.phase === 'deploy') {
      if (!deployAt) deployAt = Date.now();
      else if (Date.now() - deployAt > 1000) break;
    }
  }
  filmDir = '';
  const frames = await page.evaluate(() => { const ms = window.__ms; ms.on = false; const f = ms.frames; ms.frames = []; return f; });
  // (the measure)
  const want = frames.length ? frames[frames.length - 1].heroes.length : 0;
  const end = frames.findIndex((f) => f.phase !== 'fight');
  const marchAt = frames.findIndex((f) => f.march);
  const marchEnd = marchAt < 0 ? -1 : frames.findIndex((f, i) => i > marchAt && !f.march);
  const deploy = frames.findIndex((f) => f.next && f.phase === 'deploy');
  const settledAt = frames.findIndex((f, i) => i >= marchAt && marchAt >= 0 && ((f.march && f.landed === f.tiles && f.tiles > 0 && f.lifted === 0) || !f.march));
  const from = Math.max(0, end);
  let heroGaps = 0;
  let heroGapMs = 0;
  let worst = want;
  let tileGaps = 0;
  let tileGapMs = 0;
  let refalls = 0;
  let fewest = Infinity;
  for (let i = from; i < frames.length; i++) {
    const f = frames[i];
    const dt = i + 1 < frames.length ? frames[i + 1].t - f.t : 0;
    const up = f.heroes.filter((a) => a > 0.5).length + (want - f.heroes.length);
    if (up < want) { heroGaps++; heroGapMs += dt; worst = Math.min(worst, up); }
    if (settledAt >= 0 && i >= settledAt) {
      if (f.shown < f.tiles || f.tiles === 0) { tileGaps++; tileGapMs += dt; fewest = Math.min(fewest, f.shown); }
      if (f.lifted > 0) refalls++;
    }
  }
  const longest = frames.reduce((m, f, i) => (i ? Math.max(m, f.t - frames[i - 1].t) : 0), 0);
  const row = {
    wave, frames: frames.length, heroes: want, marched: marchAt >= 0,
    marchMs: marchAt >= 0 && marchEnd >= 0 ? frames[marchEnd].t - frames[marchAt].t : 0,
    standMs: marchEnd >= 0 && deploy >= 0 ? frames[deploy].t - frames[marchEnd].t : 0,
    heroGaps, heroGapMs, fewestHeroes: worst, tileGaps, tileGapMs, fewestTiles: Number.isFinite(fewest) ? fewest : null, refalls, longestFrameMs: longest, tapped, rebuilt,
  };
  rows.push(row);
  console.log(`wave ${wave} > ${wave + 1}: ${frames.length} pictures, ${want} heroes marched${row.marched ? '' : ' (NO MARCH)'}; the march ${row.marchMs} ms, then ${row.standMs} ms to the deploy; ` +
    `pictures short of a hero: ${heroGaps} (${heroGapMs} ms, as few as ${worst} of ${want}); pictures short of the settled section: ${tileGaps} (${tileGapMs} ms${row.fewestTiles === null ? '' : `, as few as ${row.fewestTiles} tiles`}); ` +
    `tiles in the air again: ${refalls}; the longest picture ${longest} ms${tapped ? '; tapped on mid-march' : ''}${rebuilt ? '; the board built afresh by the watch' : ''}`);
  if (dir) writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
  await page.waitForTimeout(500);
}

// (a contact sheet of each wave's film, for the eye: every frame named by what the watcher saw at that moment (the fight, the result,
// the march, the party standing, the deploy), ringed in red where a marcher or a settled tile was not drawn. The frames from the
// march's last half second to the deploy's first are all there, as many as fit; the rest are thinned)
if (SHOTS) {
  await cdp.send('Page.stopScreencast');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const sheet = await browser.newPage({ viewport: { width: 1208, height: 800 } });
  for (const d of readdirSync(SHOTS).filter((x) => /^wave\d+$/.test(x))) {
    const files = readdirSync(`${SHOTS}/${d}`).filter((f) => f.endsWith('.jpg')).sort();
    const frames = existsSync(`${SHOTS}/${d}/frames.json`) ? JSON.parse(readFileSync(`${SHOTS}/${d}/frames.json`, 'utf8')) : [];
    if (!files.length || !frames.length) continue;
    const want = frames[frames.length - 1].heroes.length;
    const marchAt = frames.findIndex((f) => f.march);
    const marchEnd = marchAt < 0 ? -1 : frames.findIndex((f, i) => i > marchAt && !f.march);
    const deploy = frames.findIndex((f) => f.next && f.phase === 'deploy');
    const t0 = frames[0].t;
    const tEnd = marchEnd >= 0 ? frames[marchEnd].t : Infinity;
    const tDeploy = deploy >= 0 ? frames[deploy].t : Infinity;
    const shots = files.map((f) => {
      const t = Number(f.split('-')[1].replace('.jpg', ''));
      let at = frames[0];
      for (const fr of frames) { if (fr.t > t) break; at = fr; }
      const up = at.heroes.filter((a) => a > 0.5).length + (want - at.heroes.length);
      const stage = at.phase === 'fight' ? 'the fight' : at.next ? 'the deploy' : at.march ? 'the march' : t >= tEnd ? 'standing' : 'the result';
      return { f, t, stage, short: up < want || (t >= tEnd && (at.shown < at.tiles || at.lifted > 0)), up, near: t >= tEnd - 500 && t <= tDeploy + 500 };
    }).filter((x) => x.t >= t0 - 200);
    const thin = (list, n) => (list.length <= n ? list : list.filter((_, i) => Math.floor((i * n) / list.length) !== Math.floor(((i - 1) * n) / list.length)));
    const picked = new Set([...thin(shots.filter((x) => !x.near), 16), ...thin(shots.filter((x) => x.near), 32)]);
    const cells = shots.filter((x) => picked.has(x)).map((x) => `<figure class="${x.short ? 'short' : ''}"><img src="data:image/jpeg;base64,${readFileSync(`${SHOTS}/${d}/${x.f}`).toString('base64')}"><figcaption>${((x.t - t0) / 1000).toFixed(2)} s · ${x.stage} · ${x.up}/${want}</figcaption></figure>`).join('');
    await sheet.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:10px sans-serif;display:flex;flex-wrap:wrap}figure{margin:2px;width:147px;box-sizing:border-box;border:2px solid #111}figure.short{border-color:#f33}figure.short figcaption{color:#f66}img{width:100%;display:block}figcaption{text-align:center;padding:2px 0}</style>${cells}`);
    await sheet.screenshot({ path: `${SHOTS}/${d}-sheet.jpg`, type: 'jpeg', quality: 72, fullPage: true });
    // (the frames themselves are not kept unless asked for: a hand-over is a hundred of them)
    if (!KEEP) rmSync(`${SHOTS}/${d}`, { recursive: true, force: true });
  }
}
const bad = rows.filter((r) => r.heroGaps || r.tileGaps || r.refalls || !r.marched);
console.log(`\n${rows.length} hand-overs at ${W}x${H}, CPU x${CPU}, speed x${SPEED}: ${bad.length ? `${bad.length} FAILED` : 'all held'} ` +
  `(pictures short of a hero ${rows.reduce((s, r) => s + r.heroGaps, 0)}, short of the section ${rows.reduce((s, r) => s + r.tileGaps, 0)}, tiles in the air again ${rows.reduce((s, r) => s + r.refalls, 0)}); page errors: ${errs.length}`);
for (const e of errs.slice(0, 5)) console.log(`  ${e}`);
if (SHOTS) writeFileSync(`${SHOTS}/film.json`, JSON.stringify({ size: `${W}x${H}`, cpu: CPU, speed: SPEED, rows }, null, 1));
await browser.close();
srv.close();
process.exit(bad.length || errs.length || !rows.length ? 1 : 0);
