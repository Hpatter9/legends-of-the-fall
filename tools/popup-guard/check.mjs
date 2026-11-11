// POPUP-GUARD's browser check (docs/notes/popup-guard.md): for each kind of popup it can raise in a run, a finger taps rapidly where the
// next-wave button is (Fight!, Next wave) and outside the popup as it appears, and the popup must still be open and readable afterwards;
// then it is closed by its own button. Real taps (the touchscreen), so the guard reads them as a player's. Exits 1 on a failed check.
//   npm run web && node tools/popup-guard/check.mjs [--size 393x852]     (no --size: 393x852, 360x780 and 412x915)
import { serve, launch, open, wait, settle } from '../sweep-1110/lib.mjs';
const args = process.argv.slice(2);
const sizes = (args.includes('--size') ? [args[args.indexOf('--size') + 1]] : ['393x852', '360x780', '412x915']).map((s) => s.split('x').map(Number));
const PORT = 8957;
const server = serve(PORT);
const browser = await launch();
let bad = 0;

for (const [W, H] of sizes) {
  console.log(`---- ${W}x${H}`);
  const check = (ok, what, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? `  ${more}` : ''}`); if (!ok) bad++; };
  const { ctx, page, log } = await open(browser, W, H, PORT);
  const tap = (x, y) => page.touchscreen.tap(x, y);
  const centre = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [r.x + r.width / 2, r.y + r.height / 2] : null; }, sel);
  const up = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden || e.closest('[hidden]')) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.5 && e.getBoundingClientRect().height > 0; }, sel);
  const text = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText ?? '', sel);
  const dead = () => page.evaluate(() => window.__popupGuard.log.length);
  const ms = await page.evaluate(() => window.__popupGuard.ms);
  /** The eager thumb: tap at each of the points in turn, `gap` ms apart, for `forMs` (by default while the newest popup is still in its guarded moment). */
  const age = () => page.evaluate(() => Math.min(...window.__popupGuard.open().map((o) => o.age), Infinity));
  const hammer = async (points, forMs = 0, gap = 45) => { const t = Date.now(); let n = 0; for (let i = 0; forMs ? Date.now() - t < forMs : (await age()) < ms - 130; i++) { await tap(...points[i % points.length]); n++; await wait(page, gap); } return n; };

  // ---- a run: a deploy, then a fight the party wins at once
  const startRun = async (stage = 3) => {
    await page.evaluate((stage) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { seed: 77, mode: { kind: 'army', army: 'beasts', tier: 0 }, stage, over: false, cleared: false, gold: 0, roster: ['knight', 'cleric', 'archer', 'wizard', 'samurai'].map((kind, i) => ({ id: 100 + i, kind, grade: 1 })), squad: [], nextId: 200, real: true });
      delete r.recap;
      document.getElementById('home').hidden = true;
      g.home.close?.();
      g.startRun(r);
    }, stage);
    await wait(page, 1500);
    await settle(page);
  };
  const fight = async (lose = false) => {
    await page.evaluate(() => { window.__game.autoArrange(true); document.getElementById('fight').click(); });
    await wait(page, 700);
    await page.evaluate((lose) => { const g = window.__game; if (lose) g.run.retries = 99; for (const u of g.b.units) if (u.side === (lose ? 'hero' : 'foe')) u.hp = 1; else if (lose) u.hp = u.maxHp = 1e7; g.setSpeed?.(3); }, lose);
  };
  await startRun();
  const fightAt = await centre('#fight');
  const outside = [W / 2, H * 0.62];
  check(!!fightAt && !(await page.evaluate(() => window.__game.home.isOpen)), 'a run’s deploy is up, with its Fight! button');

  // ---- 1. the short card over the march: taps where Fight! is, as it appears, do not send it away; a tap on the card does
  await fight();
  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 30000 });
  await hammer([fightAt, outside], 900);
  check(await up('#result'), 'the wave’s short card is still up after a second of eager taps at Fight! and beside it');
  const cardText = await text('#result');
  check(/Wave 3 of \d+ won/.test(cardText), '  ... and readable: its heading and lines', JSON.stringify(cardText.slice(0, 60)));
  check((await page.evaluate(() => window.__game.b.phase)) === 'won', '  ... the next wave has not begun under it');
  await wait(page, ms);
  const cardAt = await centre('#banner');
  await tap(...cardAt);
  await page.waitForFunction(() => document.getElementById('result').hidden && window.__game.b.phase === 'deploy', null, { timeout: 8000 }).catch(() => {});
  check(!(await up('#result')) && (await page.evaluate(() => window.__game.b.phase)) === 'deploy', '  ... a tap on the card itself goes on to the next deploy');

  // ---- 2. a toast: taps elsewhere do not clear it, and it stays long enough to read
  await page.evaluate(() => window.__toastLines(['Achievement: Giant slayer · claim 50 crowns and 3 stones']));
  await page.waitForFunction(() => document.querySelector('.toast.show'), null, { timeout: 4000 }).catch(() => {});
  const t0 = Date.now();
  await hammer([outside, [W / 2, 200]], 600);
  check(await up('.toast'), 'a toast is still up after taps elsewhere');
  await wait(page, Math.max(0, 2000 - (Date.now() - t0)));
  check(await up('.toast'), '  ... and at two seconds');
  await page.waitForFunction(() => ![...document.querySelectorAll('.toast')].some((t) => /Giant slayer/.test(t.textContent)), null, { timeout: 9000 }).catch(() => {});
  check(!(await page.evaluate(() => [...document.querySelectorAll('.toast')].some((t) => /Giant slayer/.test(t.textContent)))), '  ... then goes by itself');
  await page.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 20000 }).catch(() => {});

  // ---- 3. a card the game raises over the deploy (the Field Anvil, a standard ornate menu): eager taps at Fight!, on its veil and where
  //         its own button will be do nothing while it is new; then its button closes it
  await settle(page);
  const before = await dead();
  await page.evaluate(() => window.__popups.anvil());
  const dim = await page.waitForFunction(() => document.querySelector('#marchOrders.pgWait') && Number(getComputedStyle(document.querySelector('#marchOrders .omFoot button')).opacity) < 0.9, null, { timeout: 300 }).then(() => true, () => false);
  const anvilBtn = await centre('#marchOrders .omFoot .omBack');
  check(dim, 'a raised card shows it is not ready (its buttons dimmed)');
  const taps = await hammer([fightAt, anvilBtn, [W / 2, 40]]);
  check(taps >= 2, '  (at least two taps landed inside the moment)', `${taps}`);
  check(await up('#marchOrders'), 'the raised card is still up after eager taps (Fight!, its own button, its veil)');
  check((await page.evaluate(() => window.__game.b.phase)) === 'deploy', '  ... and the tap at Fight! did not start the fight beneath it');
  check((await dead()) > before, '  ... the guard swallowed them');
  await wait(page, ms + 100);
  check(await page.evaluate(() => !document.querySelector('#marchOrders')?.classList.contains('pgWait')), '  ... its buttons are lit after the moment');
  await tap(W / 2, 40);
  await wait(page, 200);
  check(await up('#marchOrders'), '  ... a tap on its veil still does not close it');
  await tap(...anvilBtn);
  await wait(page, 300);
  check(!(await up('#marchOrders')), '  ... its own button closes it');

  // ---- 4. a card with a backdrop that closed it (an Eidolon's piece): the backdrop no longer does, in a run; Continue does
  const pid = true;
  if (pid) {
    await page.evaluate(() => window.__popups.piece());
    await wait(page, 30);
    check(await up('.ecnLayer'), 'a piece’s card is up');
    await hammer([fightAt, [W / 2, 30], [20, H / 2]]);
    check(await up('.ecnLayer'), '  ... still up after eager taps at Fight! and on its backdrop');
    await wait(page, ms + 100);
    await tap(W / 2, 24);
    await wait(page, 200);
    check(await up('.ecnLayer'), '  ... a tap on its backdrop does not close it in a run');
    const cont = await page.evaluate(() => { const b = [...document.querySelectorAll('.ecnLayer button')].find((x) => /continue/i.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await tap(...cont);
    await wait(page, 300);
    check(!(await up('.ecnLayer')), '  ... Continue closes it');
  } else check(false, 'a piece id to raise the piece’s card with');

  // ---- 5. the run's last card and its recap: the fight is lost for good; eager taps where Next is do not press it as it appears
  await fight(true);
  await page.waitForFunction(() => !document.getElementById('result').hidden && window.__game.run.over, null, { timeout: 40000 }).catch(() => {});
  const over = await page.evaluate(() => window.__game.run.over);
  if (over) {
    const nextAt = await centre('#next');
    await hammer([nextAt, fightAt]);
    check((await up('#result')) && !(await up('#recap')), 'the run’s last card is still up after eager taps on its Run recap button');
    await wait(page, ms + 100);
    await tap(W / 2, H * 0.45);
    await wait(page, 250);
    check((await up('#result')) && !(await up('#recap')), '  ... a tap elsewhere on it does not press the button');
    await tap(...(await centre('#next')));
    await page.waitForFunction(() => !document.getElementById('recap').hidden, null, { timeout: 5000 }).catch(() => {});
    check(await up('#recap'), '  ... its own button opens the recap');
    const contAt = await centre('#recap .rcFoot button');
    await hammer([contAt, outside]);
    check(await up('#recap'), 'the recap is still up after eager taps on Continue as it appears');
    check(/News of the run/.test(await text('#recap')) && /Giant slayer/.test(await text('#recap')), '  ... and it lists what the run’s toast said (News of the run)');
    await wait(page, ms + 100);
    await tap(...(await centre('#recap .rcFoot button')));
    await wait(page, 800);
    check(!(await up('#recap')), '  ... Continue closes it');
  } else check(false, 'the run ended, to show its last card', await text('#result'));

  check(!log.errors.length, 'no page errors', log.errors.join(' | '));
  await ctx.close();
}
await browser.close();
server.close();
console.log(bad ? `${bad} check(s) failed` : 'all checks passed');
process.exit(bad ? 1 : 0);
