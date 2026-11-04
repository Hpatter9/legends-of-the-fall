// OVERLOOK-STAND's browser check and shots (`node tools/overlook-stand/check.mjs [port] [--quick]`, after `npm run web`; Chromium with
// TMPDIR on a roomy disk). At 393x852, 360x780 and 412x915: lose an army run for real (no hearts left), come home, and check the
// run's last word leaves the Daily board and the Last Stand's watchtower tappable (and fades away); then the watchtower shut and open,
// and its way in (the moment, then the Last Stand). Shots go to docs/samples/overlook-*.png.
import assert from 'node:assert/strict';
import { serve, launch, boot, SIZES } from './lib.mjs';

const port = Number(process.argv[2]) || 9075;
const quick = process.argv.includes('--quick');
const OUT = 'docs/samples/overlook';
const srv = serve('out/web', port);
const browser = await launch();
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};

/** Is each of these places the thing a finger at its middle (and at its plate) lands on? */
const tappable = (page, ids) => page.evaluate((ids) => ids.map((id) => {
  const e = document.getElementById(id);
  if (!e || e.disabled) return `${id}: missing or shut`;
  const r = e.getBoundingClientRect();
  const tag = e.querySelector('.cpTag').getBoundingClientRect();
  for (const [x, y] of [[r.x + r.width / 2, r.y + r.height / 2], [tag.x + tag.width / 2, tag.y + tag.height / 2], [tag.x + 6, tag.y + 6], [tag.right - 6, tag.bottom - 6]]) {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === e || e.contains(hit))) return `${id}: covered at ${Math.round(x)},${Math.round(y)} by ${hit?.className || hit?.tagName}`;
  }
  return 'ok';
}), ids);

/** Start the first army, lose its first wave with no heart left, and go through the result and the recap back home. */
async function loseHome(page) {
  await page.evaluate(() => { const h = window.__game.home; h.go(() => h.hooks.onArmy('orcs', 0)); });
  await page.waitForTimeout(800);
  await page.evaluate(() => (document.getElementById('ptGo') ?? document.querySelector('.ptGo')).click());
  await page.waitForTimeout(2000);
  for (let t = 0; t < 300; t++) {
    const st = await page.evaluate(() => {
      const g = window.__game;
      if (!document.getElementById('home').hidden) return 'home';
      const b = g.b;
      if (b.phase === 'fight') { for (const u of b.units) if (u.side === 'hero') u.hp = 0; return 'fight'; }
      const top = (e) => { const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return h && (h === e || e.contains(h)); };
      const all = [...document.querySelectorAll('button')].filter((e) => e.offsetParent && top(e));
      const pick = all.find((e) => e.textContent.trim() === 'Skip') ?? all.find((e) => /^(Skip|Continue|Run recap)/i.test(e.textContent.trim()));
      if (pick) { pick.click(); return 'clicked'; }
      if (b.phase === 'deploy' && document.getElementById('fight').offsetParent) {
        for (let i = 0; i < 3; i++) document.getElementById('summon')?.click();
        // (no heart left: the first loss ends the run)
        g.run.retries = 99;
        g.autoArrange(true);
        document.getElementById('fight').click();
        return 'fight';
      }
      return 'wait ' + b.phase + ' ' + all.map((e) => e.textContent.trim().slice(0, 12)).join('/');
    });
    if (st === 'home') return;
    if (t % 15 === 0 && process.env.DEBUG) console.log(t, st);
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: '/dev/shm/lotf-overlook-out/stuck.png' });
  throw new Error('never came home');
}

try {
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`;
    // ---- the loss: home with the run's last word up
    {
      const { ctx, page, errors } = await boot(browser, w, h, port);
      if (!quick || w === 393) {
        await loseHome(page);
        await page.waitForTimeout(900);
        const note = await page.evaluate(() => document.querySelector('.hmDispatch')?.textContent ?? '');
        check(/stopped you at wave/.test(note), `${tag}: the loss's last word shows on the overlook ("${note.slice(0, 48)}…")`);
        await page.screenshot({ path: `${OUT}-loss-after-${w}.png` });
        const now = await tappable(page, ['hmDaily', 'hmTower', 'hmCalamity', 'hmStall']);
        check(now.every((r) => r === 'ok'), `${tag}: right after the loss, the Daily, Last Stand, Calamity and stall places are tappable (${now.join('; ')})`);
        const clear = await page.evaluate(() => {
          const n = document.querySelector('.hmDispatch').getBoundingClientRect();
          return [...document.querySelectorAll('.cpPlace, .cpPlate, #hmBattle')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && !(r.right <= n.left || r.left >= n.right || r.bottom <= n.top || r.top >= n.bottom); }).map((e) => e.id || e.className);
        });
        check(clear.length === 0, `${tag}: the last word covers no place (${clear.join(', ') || 'none'})`);
        // (a refresh of the home screen does not bring it back, and it is gone after its fade)
        await page.evaluate(() => window.__game.home.show('battle'));
        await page.waitForTimeout(7600);
        check(await page.evaluate(() => !document.querySelector('.hmDispatch')), `${tag}: the last word has faded away`);
        // (a real tap on the Daily board opens the daily's start)
        await page.locator('#hmDaily').tap();
        await page.waitForTimeout(900);
        check(await page.evaluate(() => document.getElementById('home').hidden || !!document.querySelector('.dsSheet, .dailyStart, #dailyStart')), `${tag}: a tap on the Daily board after the loss opens it`);
      }
      check(errors.length === 0, `${tag}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
    // ---- the watchtower: open, with a record, and its way in
    {
      const { ctx, page, errors } = await boot(browser, w, h, port, { stand: 14, standAct: 2 });
      await page.waitForTimeout(1200);
      const line = await page.evaluate(() => document.querySelector('#hmTower .cpTag')?.textContent);
      check(/best wave 14/.test(line ?? ''), `${tag}: the tower's plate shows the record ("${line}")`);
      const r = await page.evaluate(() => { const b = document.getElementById('hmTower').getBoundingClientRect(); const c = document.getElementById('hmCalamity').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, cx: c.x }; });
      check(r.x < w * 0.1 && r.y < h * 0.3 && r.x + r.w < r.cx, `${tag}: the Last Stand's place is the tower at the top left (${JSON.stringify(r)})`);
      const taps = await tappable(page, ['hmTower', 'hmDaily']);
      check(taps.every((x) => x === 'ok'), `${tag}: the tower and the Daily board tappable (${taps.join('; ')})`);
      await page.screenshot({ path: `${OUT}-tower-${w}.png` });
      await page.screenshot({ path: `${OUT}-tower-zoom-${w}.png`, clip: { x: 0, y: 70, width: Math.min(w, 220), height: 220 } });
      await page.locator('#hmTower').tap();
      await page.waitForTimeout(420);
      check(await page.evaluate(() => !!document.querySelector('.cpWrap.sgGo .sgVeil')), `${tag}: the tower's moment plays`);
      await page.waitForTimeout(350);
      await page.waitForTimeout(1600);
      const inStand = await page.evaluate(() => document.getElementById('home').hidden && !document.querySelector('.sgVeil'));
      check(inStand, `${tag}: then the Last Stand opens and the moment is gone`);
      check(errors.length === 0, `${tag}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
    // ---- the way in, slowed eight times for the camera (a software-drawn screenshot takes longer than the moment itself)
    if (w === 393) {
      const { ctx, page } = await boot(browser, w, h, port, { stand: 14, standAct: 2 });
      await page.waitForTimeout(1200);
      await page.evaluate(() => {
        const st = document.createElement('style');
        st.textContent = '.sgVeil, .sgVeil::after, .sgCard { animation-duration: 8s !important; } .cpWrap.sgGo .cpRoom { transition-duration: 8s !important; }';
        document.head.append(st);
        const later = window.setTimeout;
        window.setTimeout = (fn, ms, ...rest) => later(fn, ms === 1000 ? 8000 : ms, ...rest);
      });
      await page.locator('#hmTower').tap();
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${OUT}-entry-1.png` });
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${OUT}-entry-2.png` });
      await page.waitForFunction(() => document.getElementById('home').hidden && !document.querySelector('.sgVeil'), {}, { timeout: 30000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}-entry-3.png` });
      await ctx.close();
    }
    // ---- shut: greyed, its plate saying what opens it, no tap
    if (w === 393) {
      const { ctx, page } = await boot(browser, w, h, port, { opened: ['castle', 'daily'], bestStage: 1, armies: {} });
      await page.waitForTimeout(1200);
      check(await page.evaluate(() => document.getElementById('hmTower').disabled && document.querySelector('.cpTowerSlot').classList.contains('shut')), `${tag}: shut, the tower is dimmed and takes no tap`);
      await page.screenshot({ path: `${OUT}-tower-shut-${w}.png` });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  srv.close();
}
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
