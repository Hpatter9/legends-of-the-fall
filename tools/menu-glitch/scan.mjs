// MENU-GLITCH scan (docs/notes/menu-glitch.md): drives the real page through every menu change it can reach (the home tabs, every
// sheet, card and panel opened and shut, into a fight and the Calamity and back, a defeat's recap) with the CPU slowed like a phone's,
// records every frame the browser composites across each change (a CDP screencast), and reports the glitch frames:
//   blank  a frame that is mostly one flat colour (an empty or black page) where neither the screen before nor the one after is;
//   bounce a frame that differs a lot from the one before it, then the picture goes back to how it was within three frames (a panel
//          drawn and redrawn, old content flashing, a picture blinking out and back);
//   late   a picture (img) still decoding, or not yet loaded, while the screen shows it (it pops in after the change);
//   shift  a layout shift (the browser's own layout-shift entries) inside the change;
//   ghost  a click that reached a button of the screen being left or under the new one (counted by a capture-phase listener).
// Serve a build (npm run web, then any static server on out/web), then:
//   node tools/menu-glitch/scan.mjs <port> [label] [--size 393x852] [--rate 4] [--only name,name] [--keep dir]
// It prints one line per change and the totals, and writes <keep>/<label>-<size>.json with the frame numbers (and, with --keep,
// the frames of each change as PNGs under <keep>/<label>-<size>/<change>/ for frame strips).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const argv = process.argv.slice(2);
const flag = (name, d) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : d;
};
const port = argv[0] || '8000';
const label = argv[1] && !argv[1].startsWith('--') ? argv[1] : 'scan';
const [W, H] = flag('size', '393x852').split('x').map(Number);
const rate = Number(flag('rate', '4'));
const only = flag('only', '');
const keep = flag('keep', '');
const outDir = keep || 'docs/samples';
const url = `http://127.0.0.1:${port}`;
const TIPS = 'home,deploy,fight,mana,skill,summon,crowns,calamity,tower,talents,castle,spellbook,stash,equipment,recycle,retry,autoReplay,party'.split(',');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// (the frames are read in a second, unthrottled page: each decoded to a small grey picture of 8x8 blocks)
const lab = await (await browser.newContext()).newPage();
await lab.setContent('<canvas id=c></canvas>');
const measure = (frames, moving, area) =>
  lab.evaluate(async ([frames, moving, area]) => {
    const B = 6;
    const pics = [];
    const fine = [];
    let W = 0;
    let W2 = 0;
    // (each frame is drawn at its own size, one to one, and shrunk here by averaging: a browser's own scaling of a picture it has
    //  cached can differ from one draw to the next, which read as a change between two identical frames)
    const shrink = (grey, gw, gh, k) => {
      const w = Math.floor(gw / k), h = Math.floor(gh / k);
      const out = new Float32Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          let t = 0;
          for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) t += grey[(y * k + yy) * gw + x * k + xx];
          out[y * w + x] = t / (k * k);
        }
      return { out, w };
    };
    for (const f of frames) {
      const img = new Image();
      img.src = 'data:image/png;base64,' + f;
      await img.decode();
      const gw = img.width, gh = img.height;
      const c = new OffscreenCanvas(gw, gh);
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, gw, gh).data;
      const grey = new Float32Array(gw * gh);
      for (let i = 0; i < grey.length; i++) grey[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
      const small = shrink(grey, gw, gh, B);
      pics.push(small.out);
      W = small.w;
      // (a finer copy, two css pixels to a sample, for lining up a slide)
      if (moving === 'slide') {
        const f2 = shrink(grey, gw, gh, 2);
        fine.push(f2.out);
        W2 = f2.w;
      }
    }
    // (share of the picture that differs by more than 24 grey levels)
    const diff = (a, b) => {
      let n = 0;
      for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 24) n++;
      return n / a.length;
    };
    // (share of the picture within 10 levels of its commonest level: a flat, empty frame is near 1)
    const flat = (a) => {
      const hist = new Uint32Array(26);
      for (const v of a) hist[Math.min(25, Math.floor(v / 10))]++;
      let top = 0;
      for (let i = 0; i < 26; i++) top = Math.max(top, hist[i] + (hist[i + 1] ?? 0));
      return top / a.length;
    };
    const flats = pics.map(flat);
    const blank = [];
    const n = pics.length;
    if (n) {
      const ends = Math.max(flats[0], flats[n - 1]);
      for (let i = 1; i < n - 1; i++) if (flats[i] > 0.9 && flats[i] > ends + 0.15) blank.push(i);
    }
    const bounce = [];
    for (let i = 1; i < n - 1; i++) {
      const jump = diff(pics[i - 1], pics[i]);
      if (jump < 0.08) continue;
      for (let k = 1; k <= 3 && i + k < n; k++) {
        if (diff(pics[i - 1], pics[i + k]) < jump / 4 && diff(pics[i], pics[i + k]) > 0.08) {
          bounce.push(i);
          break;
        }
      }
    }
    // pop: once the change has begun, a later frame in which pieces that were flat (an empty box, an unpainted canvas, a picture
    // not decoded yet) fill in: blocks of 4x4 (24 px) whose spread goes from under 3 grey levels to over 12, over 0.4% of the screen
    const K = 4;
    const spread = (a) => {
      const bw = Math.floor(W / K), bh = Math.floor(a.length / W / K);
      const out = new Float32Array(bw * bh);
      for (let by = 0; by < bh; by++)
        for (let bx = 0; bx < bw; bx++) {
          let s = 0, s2 = 0;
          for (let y = 0; y < K; y++)
            for (let x = 0; x < K; x++) {
              const v = a[(by * K + y) * W + bx * K + x];
              s += v;
              s2 += v * v;
            }
          const m = s / (K * K);
          out[by * bw + bx] = Math.sqrt(Math.max(0, s2 / (K * K) - m * m));
        }
      return out;
    };
    const spreads = pics.map(spread);
    const pop = [];
    let begun = -1;
    for (let i = 1; i < n; i++) {
      if (begun < 0) {
        if (diff(pics[0], pics[i]) > 0.02) begun = i;
        continue;
      }
      const a = spreads[i - 1], b = spreads[i];
      let k = 0;
      for (let j = 0; j < a.length; j++) if (a[j] < 3 && b[j] > 12) k++;
      if (k / a.length > 0.004) pop.push(i);
    }
    // stale: a frame in the change showing something that is neither the screen before nor the one after, nor a blend of the two
    // (old content flashing through): over 6% of the picture more than 30 levels outside both (not for the tab slides, which move)
    const stale = [];
    if (!moving && n > 2) {
      const s0 = pics[0], s1 = pics[n - 1];
      for (let i = 1; i < n - 1; i++) {
        let k = 0;
        const p = pics[i];
        for (let j = 0; j < p.length; j++) {
          const lo = Math.min(s0[j], s1[j]) - 30, hi = Math.max(s0[j], s1[j]) + 30;
          if (p[j] < lo || p[j] > hi) k++;
        }
        if (k / p.length > 0.06) stale.push(i);
      }
    }
    // torn: for a tab's slide, a frame whose pages are not the two pages side by side (one moved on, the other behind it): the page
    // area must read as the page before and the page after, edge to edge, at some point of the move. Over 8% of it otherwise (a page
    // drawn empty, the two apart with a band between, or one over the other) is a torn frame.
    const torn = [];
    if (moving === 'slide' && n > 2) {
      const H2 = fine[0].length / W2;
      const y0 = Math.ceil(area[0] / 2), y1 = Math.min(H2, Math.floor(area[1] / 2));
      const a = fine[0], z = fine[n - 1];
      // (dir 1: the pages have moved right by m samples; dir -1: left by m. A move between two samples blurs fine detail, so each
      //  sample may match its neighbour either side)
      const want = (dir, m, y, x) => {
        x = Math.max(0, Math.min(W2 - 1, x));
        return dir > 0 ? (x >= m ? a[y * W2 + x - m] : z[y * W2 + x + W2 - m]) : x < W2 - m ? a[y * W2 + x + m] : z[y * W2 + x + m - W2];
      };
      const miss = (p, dir, m) => {
        let bad = 0, tot = 0;
        for (let y = y0; y < y1; y += 3)
          for (let x = 0; x < W2; x++) {
            const v = p[y * W2 + x];
            tot++;
            if (Math.min(Math.abs(v - want(dir, m, y, x)), Math.abs(v - want(dir, m, y, x - 1)), Math.abs(v - want(dir, m, y, x + 1))) > 30) bad++;
          }
        return bad / tot;
      };
      for (let i = 1; i < n - 1; i++) {
        const p = fine[i];
        let best = 1;
        // (coarse, every 6 samples, then finely round the best)
        let at = [1, 0];
        for (const dir of [1, -1])
          for (let m = 0; m <= W2; m += 6) {
            const f = miss(p, dir, m);
            if (f < best) (best = f), (at = [dir, m]);
          }
        for (let m = Math.max(0, at[1] - 6); m <= Math.min(W2, at[1] + 6); m++) best = Math.min(best, miss(p, at[0], m));
        if (best > 0.08) torn.push(i);
      }
    }
    return { blank, bounce, pop: moving ? [] : pop, stale, torn, flats: flats.map((v) => +v.toFixed(2)) };
  }, [frames, moving, area]);

// (--measure <dir>: only measure frames already kept, <dir>/000.png on, as a change of that dir's name would be)
const only1 = flag('measure', '');
if (only1) {
  const { readdirSync, readFileSync } = await import('node:fs');
  const files = readdirSync(only1).filter((f) => f.endsWith('.png')).sort();
  const name = only1.split('/').filter(Boolean).pop();
  const r = await measure(files.map((f) => readFileSync(`${only1}/${f}`).toString('base64')), name.startsWith('tab-') ? 'slide' : name === 'fight-enter' ? 'camera' : '', [82, 790]);
  console.log(JSON.stringify({ ...r, flats: undefined }));
  await browser.close();
  process.exit(0);
}
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, serviceWorkers: 'block', hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((tips) => {
  localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
  localStorage.setItem('legends.tips', JSON.stringify(tips));
  // (the probes: layout shifts, and clicks that land on a screen that is going or hidden)
  window.__glitch = { shift: 0, ghost: 0, ghostOn: [], long: 0, longMax: 0 };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__glitch.long += e.duration;
        window.__glitch.longMax = Math.max(window.__glitch.longMax, e.duration);
      }
    }).observe({ type: 'longtask', buffered: false });
  } catch {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__glitch.shift += e.value;
    }).observe({ type: 'layout-shift', buffered: false });
  } catch {}
  // (a ghost click: the click a tap makes lands on something that was not under the finger when it went down, a panel the tap's
  //  own pointerup opened; the touch's click is hit-tested afresh after the pointerup has run)
  let down = null;
  addEventListener('pointerdown', (e) => (down = e.target), true);
  // (on the document, after the window: a click the page's own guard swallows at the window never gets here)
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!e.isTrusted || !(t instanceof Node) || !(down instanceof Node) || !down.isConnected) return;
    if (t === down || t.contains(down) || down.contains(t)) return;
    window.__glitch.ghost++;
    window.__glitch.ghostOn.push(`${(down.id || down.className || down.nodeName).toString().slice(0, 30)} -> ${(t.id || t.className || t.nodeName).toString().slice(0, 30)}`);
  }, true);
  // (pictures and canvases taken out of the page while a change runs: DOM rebuilt rather than kept)
  window.__churn = 0;
  window.__cards = 0;
  new MutationObserver((l) => {
    for (const r of l) for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList.contains('qcWrap')) window.__cards++;
    for (const r of l)
      for (const n of r.removedNodes) {
        if (n.nodeType !== 1 || n.isConnected) continue;
        window.__churn += n.nodeName === 'IMG' || n.nodeName === 'CANVAS' ? 1 : n.querySelectorAll('img,canvas').length;
      }
  }).observe(document, { subtree: true, childList: true });
}, TIPS);

// (a save well along: two armies cleared, the castle open, crowns and stones to spend, a few heroes)
await page.goto(`${url}/?seed=7`);
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => {
  const g = window.__game;
  g.meta.armies.orcs = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1, 4: 1 } };
  g.meta.armies.undead = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7 } };
  g.meta.opened = ['castle', 'calamity', 'tower'];
  g.meta.crowns = 1500;
  g.meta.scenes = ['opening'];
  localStorage.setItem('legends.meta', JSON.stringify(g.meta));
  localStorage.setItem('lotf-army-shown', JSON.stringify({}));
});
await page.goto(`${url}/`);
await page.waitForFunction(() => window.__game && !document.getElementById('home').hidden, null, { timeout: 90000 });
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.waitForTimeout(2000);

const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
let sink = null;
cdp.on('Page.screencastFrame', async (f) => {
  if (sink) sink.push({ t: f.metadata.timestamp * 1000, data: f.data });
  try {
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId });
  } catch {}
});

/** Record the frames of one change: `act` runs with the stream going; the stream runs `ms` after it. */
const record = async (name, act, ms = 1400) => {
  await page.evaluate(() => {
    Object.assign(window.__glitch, { shift: 0, ghost: 0, ghostOn: [], long: 0, longMax: 0 });
    window.__late = 0;
    window.__churn = 0;
    window.__lateStop = false;
    const tick = () => {
      if (window.__lateStop) return;
      window.__late += [...document.images].filter((im) => im.isConnected && im.getClientRects().length && im.offsetWidth > 0 && getComputedStyle(im).visibility !== 'hidden' && !im.closest('.paintWait') && (!im.complete || (im.src && !im.naturalWidth))).length;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  sink = [];
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: W, maxHeight: H });
  // (a settled frame of the screen before the change: the stream's first frame, or the newest one in half a second)
  for (let i = 0; i < 40 && !sink.length; i++) await page.waitForTimeout(50);
  await page.waitForTimeout(300);
  sink = sink.slice(-1);
  const t0 = Date.now();
  try {
    await act();
    while (Date.now() - t0 < ms) await page.waitForTimeout(50);
  } finally {
    await cdp.send('Page.stopScreencast');
  }
  const frames = sink.sort((a, b) => a.t - b.t);
  sink = null;
  const probe = await page.evaluate(() => {
    window.__lateStop = true;
    return { ...window.__glitch, late: window.__late, churn: window.__churn };
  });
  const area = await page.evaluate(() => {
    const r = document.getElementById('hmPages').getBoundingClientRect();
    return [r.top, r.bottom];
  });
  const m = await measure(frames.map((f) => f.data), name.startsWith('tab-') ? 'slide' : name === 'fight-enter' ? 'camera' : '', area);
  if (keep) {
    const dir = `${keep}/${label}-${W}x${H}/${name}`;
    mkdirSync(dir, { recursive: true });
    frames.forEach((f, i) => writeFileSync(`${dir}/${String(i).padStart(3, '0')}.png`, Buffer.from(f.data, 'base64')));
    writeFileSync(`${dir}/times.json`, JSON.stringify(frames.map((f) => Math.round(f.t - frames[0].t))));
  }
  const r = { frames: frames.length, blank: m.blank, bounce: m.bounce, pop: m.pop, stale: m.stale, torn: m.torn, late: probe.late, shift: +probe.shift.toFixed(3), ghost: probe.ghost, ghostOn: probe.ghostOn, churn: probe.churn, longMs: Math.round(probe.long), longMax: Math.round(probe.longMax) };
  results[name] = r;
  const bad = r.blank.length + r.bounce.length + r.pop.length + r.stale.length + r.torn.length + (r.late ? 1 : 0) + (r.shift > 0.01 ? 1 : 0) + r.ghost;
  console.log(`${bad ? '✗' : '✓'} ${name.padEnd(22)} frames ${String(r.frames).padStart(3)}  blank ${r.blank.length} [${r.blank.join(',')}]  bounce ${r.bounce.length} [${r.bounce.join(',')}]  pop ${r.pop.length} [${r.pop.join(',')}]  stale ${r.stale.length} [${r.stale.join(',')}]  torn ${r.torn.length} [${r.torn.join(',')}]  late ${r.late}  shift ${r.shift}  ghost ${r.ghost}  churn ${r.churn}  busy ${r.longMs}ms (max ${r.longMax})${r.ghost ? ' ' + r.ghostOn.join('|') : ''}`);
};
const results = {};

const tap = async (sel) => {
  const box = await page.locator(sel).first().boundingBox();
  if (!box) throw new Error(`nothing to tap at ${sel}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
};
const tabBtn = (i) => `#hmTabs .hmTab:nth-child(${i})`;
const home = async () => {
  await page.evaluate(() => {
    for (const id of ['settings', 'party']) {
      const e = document.getElementById(id);
      if (e && !e.hidden) e.hidden = true;
    }
    document.getElementById('stall')?.remove();
    document.querySelector('.ecnLayer')?.remove();
    document.querySelector('.ulBack')?.remove();
    document.querySelector('.cvPick')?.remove();
    document.querySelector('.qcWrap')?.remove();
    window.__game.home.open();
  });
  await page.waitForTimeout(700);
};

// (a point on a scene's canvas whose tap opens the hero sheet or the quest log: tried on a grid, each one shut again)
let spot = null;
const findSpot = async (tab, what = 'sheet') => {
  await home();
  await tap(tabBtn(tab));
  await page.waitForTimeout(900);
  for (let y = 330; y < 700; y += 26)
    for (let x = 40; x < W - 30; x += 34) {
      if (!(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.nodeName === 'CANVAS', [x, y]))) continue;
      const cards = await page.evaluate(() => window.__cards);
      await page.touchscreen.tap(x, y);
      await page.waitForTimeout(160);
      const open = await page.evaluate(([what, cards]) => (what === 'card' ? window.__cards > cards : !document.getElementById('hmSheet').hidden), [what, cards]);
      await page.evaluate(() => {
        document.querySelector('.qcWrap')?.remove();
        document.getElementById('stall')?.remove();
        if (!document.getElementById('hmSub').hidden) document.getElementById('hmSubBack').click();
        window.__game.home.closeSheet();
      });
      if (open) {
        spot = [x, y];
        await page.waitForTimeout(500);
        return;
      }
    }
  spot = null;
  const at = await page.evaluate(() => { const e = document.elementFromPoint(200, 500); return `${e?.nodeName}.${e?.className} in ${e?.closest('[id]')?.id}`; });
  console.log(`  (no spot: ${at})`);
};
const tapSpot = () => (spot ? page.touchscreen.tap(...spot) : Promise.reject(new Error('no spot found')));
const loseFight = async () => {
  await home();
  await page.evaluate(() => {
    const h = window.__game.home;
    h.go(() => h.hooks.onArmy('orcs', 0));
  });
  await page.waitForTimeout(900);
  await tap('#ptGo');
  await page.waitForTimeout(900);
  const click = (id) => page.evaluate((id) => document.getElementById(id)?.click(), id);
  for (let i = 0; i < 2; i++) {
    await click('summon');
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(300);
  await click('fight');
  await page.waitForTimeout(600);
  await page.evaluate(() => (window.__game.run.retries = 9));
  await page.evaluate(() => {
    for (const u of window.__game.b.units) if (u.side === 'hero') u.hp = 0;
  });
  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
};

// The changes: [name, setup (not recorded), the change (recorded), ms]
const CHANGES = [
  ['tab-battle-heroes', home, () => tap(tabBtn(2))],
  ['tab-heroes-recruit', () => tap(tabBtn(2)), () => tap(tabBtn(1))],
  ['tab-recruit-castle', () => tap(tabBtn(1)), () => tap(tabBtn(4))],
  ['tab-castle-spells', () => tap(tabBtn(4)), () => tap(tabBtn(5))],
  ['tab-spells-battle', () => tap(tabBtn(5)), () => tap(tabBtn(3))],
  ['tab-battle-castle', home, () => tap(tabBtn(4))],
  ['roster-open', async () => { await home(); await tap(tabBtn(2)); }, () => page.evaluate(() => window.__game.home.openRoster())],
  ['roster-hero', null, () => tap('#hmSheetBox .hcard, #hmSheetBox button.hero, #hmSheetBox [data-kind]')],
  ['hero-tab-2', null, () => tap('#hmSheetBox [role=tab]:nth-child(2), #hmSheetBox .hsTabs button:nth-child(2)')],
  ['hero-tab-3', null, () => tap('#hmSheetBox [role=tab]:nth-child(3), #hmSheetBox .hsTabs button:nth-child(3)')],
  ['hero-back', null, () => page.evaluate(() => window.__game.home.closeSheet())],
  ['quests-open', home, () => page.evaluate(() => window.__game.home.openQuests('active'))],
  ['quests-tab', null, () => tap('#hmSheetBox [role=tab]:nth-child(2)')],
  ['quests-close', null, () => page.evaluate(() => window.__game.home.closeSheet())],
  ['stall-open', home, () => tap('#hmStall')],
  ['stall-tab', null, () => tap('#stall .hsTabs button:nth-child(2)')],
  ['stall-close', null, () => tap('#stall .hsBack')],
  ['gallery-open', async () => { await home(); await tap(tabBtn(1)); }, () => page.evaluate(() => window.__game.home.openGallery())],
  ['gallery-close', null, () => tap('.ecnShut')],
  ['codex-open', async () => { await home(); await tap(tabBtn(4)); }, () => page.evaluate(() => window.__game.home.openCodex())],
  ['codex-tab', null, () => tap('#hmSubBody [role=tab]:nth-child(2), #hmSubBody .cxTabs button:nth-child(2)')],
  ['codex-close', null, () => tap('#hmSubBack')],
  ['achievements-open', null, () => page.evaluate(() => window.__game.home.openAchievements())],
  ['achievements-close', null, () => tap('#hmSubBack')],
  ['settings-open', home, () => tap('#hmGear')],
  ['settings-close', null, () => tap('#settingsClose')],
  ['upgrades-open', async () => { await home(); await tap(tabBtn(2)); }, () => page.evaluate(() => window.__game.home.hooks && document.querySelector('.tvUpgrades, #tvUpgrades')?.click())],
  ['armies-open', home, () => tap('#hmBattle')],
  ['armies-close', null, () => page.evaluate(() => window.__game.home.show('battle'))],
  ['party-open', home, () => tap('#hmParty')],
  ['party-back', null, () => page.evaluate(() => document.querySelector('#party .ptBack, #ptBack')?.click())],
  ['fight-enter', async () => { await home(); await page.evaluate(() => { const h = window.__game.home; h.go(() => h.hooks.onArmy('orcs', 0)); }); await page.waitForTimeout(900); }, () => tap('#ptGo'), 2200],
  ['calamity-enter', home, () => page.evaluate(() => window.__game.home.enterCalamity()), 2200],
  ['calamity-back', null, () => tap('.cvPick button:text-is("Back")')],
  ['camp-hero-tap', () => findSpot(3), tapSpot],
  ['camp-sheet-close', null, () => page.evaluate(() => window.__game.home.closeSheet())],
  ['tavern-tap', () => findSpot(2), tapSpot],
  ['tavern-sheet-close', null, () => page.evaluate(() => window.__game.home.closeSheet())],
  ['giver-card-tap', () => findSpot(2, 'card'), tapSpot],
  ['deploy-home', async () => { await home(); await page.evaluate(() => { const h = window.__game.home; h.go(() => h.hooks.onArmy('orcs', 0)); }); await page.waitForTimeout(900); await tap('#ptGo'); await page.waitForTimeout(1500); }, () => tap('#homeBtn'), 2000],
  ['result-recap', loseFight, () => tap('#next'), 2000],
  ['recap-home', null, () => tap('#recap button:has-text("Continue")'), 2000],
];

for (const [name, setup, act, ms] of CHANGES) {
  if (only && !only.split(',').some((o) => name.startsWith(o))) continue;
  try {
    if (setup) {
      await setup();
      await page.waitForTimeout(900);
    } else await page.waitForTimeout(500);
    await record(name, act, ms);
  } catch (e) {
    console.log(`? ${name}: ${e.message.split('\n')[0]}`);
  }
}

const sum = (k) => Object.values(results).reduce((n, r) => n + (Array.isArray(r[k]) ? r[k].length : k === 'shift' ? (r[k] > 0.01 ? 1 : 0) : k === 'late' ? (r[k] ? 1 : 0) : r[k]), 0);
const totals = { changes: Object.keys(results).length, blank: sum('blank'), bounce: sum('bounce'), pop: sum('pop'), stale: sum('stale'), torn: sum('torn'), late: sum('late'), shift: sum('shift'), ghost: sum('ghost') };
totals.glitchFrames = totals.blank + totals.bounce + totals.pop + totals.stale + totals.torn;
console.log(`\n${label} ${W}x${H} at ${rate}x slower: ${JSON.stringify(totals)}${errors.length ? `\npage errors: ${[...new Set(errors)].join(' | ')}` : ''}`);
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/${label}-${W}x${H}.json`, JSON.stringify({ size: `${W}x${H}`, rate, totals, results, errors: [...new Set(errors)] }, null, 1));
await browser.close();
