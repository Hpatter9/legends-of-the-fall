// SWEEP-1110, the Assault: for each hold with painted art (and the Orcs' Bloodtusk Hold), the muster, the march, and the field looked at
// from the minimap (the South Gate, the Iron Gate, the keep, the camp), the frame rate, then the host on Auto at x2 for a while and the same
// spots again (the gates' damage). `--last` makes the hold the Last Hold (every other hold fallen).
//   npm run web && node tools/sweep-1110/assault.mjs [--armies orcs,undead] [--last] [--run 60] [out dir]
import { serve, launch, open, SIZES, out, wait, overflow, saveOf, ARMY_IDS } from './lib.mjs';
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ARMIES = opt('--armies', 'orcs,undead,beasts,wildwood,labyrinth,yokai').split(',');
const LAST = args.includes('--last');
const RUN = Number(opt('--run', 45));
const dir = out(args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'out/sweep-1110/assault');
const PORT = 8915;
const server = serve(PORT);
const browser = await launch();
const SPOTS = { southGate: [73, 59], ironGate: [61, 50], keep: [47, 47], camp: [56, 90], west: [40, 70], north: [30, 30] };

/** Tap the minimap at a tile: the camera goes there. */
const look = (page, u, v) => page.evaluate(([u, v]) => {
  const mini = document.querySelector('.asMini');
  const r = mini.getBoundingClientRect();
  const x = ((u - v) / 2) * (104 / 100) + 52;
  const y = ((u + v) / 2) * (104 / 100);
  const at = { clientX: r.left + (x / 104) * r.width, clientY: r.top + (y / 104) * r.height, bubbles: true, pointerId: 3 };
  mini.dispatchEvent(new PointerEvent('pointerdown', at));
  mini.dispatchEvent(new PointerEvent('pointerup', at));
}, [u, v]);
const fps = (page, ms = 3000) => page.evaluate((ms) => new Promise((r) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = () => { const now = performance.now(); worst = Math.max(worst, now - last); last = now; n++; if (now - t0 < ms) requestAnimationFrame(f); else r({ fps: Math.round((n * 1000) / ms), worstMs: Math.round(worst) }); }; requestAnimationFrame(f); }), ms);

for (const [w, h] of SIZES) {
  for (const army of ARMIES) {
    const save = saveOf({ conquered: LAST ? ARMY_IDS.filter((a) => a !== army) : [] });
    const { ctx, page, log } = await open(browser, w, h, PORT, { save });
    const tag = `${army}${LAST ? '-last' : ''}-${w}`;
    await page.evaluate((a) => window.__game.home.openAssault(a), army);
    await wait(page, 1500);
    await page.screenshot({ path: `${dir}/${tag}-muster.png` });
    const o = await overflow(page);
    if (o.scroll || o.bad.length) console.log(`${tag} muster overflow ${JSON.stringify(o)}`);
    const muster = await page.evaluate(() => document.querySelector('#om-muster, .om, [id*=uster]')?.textContent?.replace(/\s+/g, ' ').slice(0, 300));
    console.log(`${tag} muster: ${muster}`);
    let marched = null;
    for (let i = 0; i < 4 && !marched; i++) {
      marched = await page.evaluate(() => {
        const bs = [...document.querySelectorAll('button')].filter((x) => x.offsetParent);
        const m = bs.find((x) => /^March/.test(x.textContent.trim()));
        if (m) { m.click(); return m.textContent; }
        bs.find((x) => x.textContent.trim() === 'Close')?.click();
        return null;
      });
      if (!marched) { await wait(page, 900); await page.screenshot({ path: `${dir}/${tag}-muster-${i}.png` }); }
    }
    if (!marched) { console.log(`${tag}: no March button`); await ctx.close(); continue; }
    await page.waitForFunction(() => document.querySelector('#assaultScene .asTop'), null, { timeout: 60000 }).catch(() => console.log(`${tag}: the field never came up`));
    await wait(page, 3500);
    await page.screenshot({ path: `${dir}/${tag}-0-start.png` });
    console.log(`${tag} start fps ${JSON.stringify(await fps(page))}`);
    for (const [k, [u, v]] of Object.entries(SPOTS)) {
      await look(page, u, v);
      await wait(page, 1600);
      await page.screenshot({ path: `${dir}/${tag}-1-${k}.png` });
    }
    // (the host on Auto at x2 for a while; the drums and the gates' damage)
    await page.evaluate(() => { const bs = [...document.querySelectorAll('.asTop button')]; const auto = bs.find((b) => b.textContent === 'Auto'); if (auto && !auto.classList.contains('on')) auto.click(); bs.find((b) => b.textContent === 'x1')?.click(); });
    for (let s = 0; s < RUN; s += 15) {
      await wait(page, 15000);
      const st = await page.evaluate(() => [document.querySelector('.asTop')?.textContent?.replace(/\s+/g, ' '), !!document.querySelector('#assaultScene'), document.querySelector('.om h2, .omTitle')?.textContent]);
      console.log(`${tag} +${s + 15}s ${JSON.stringify(st)}`);
      if (!st[1]) break;
    }
    console.log(`${tag} later fps ${JSON.stringify(await fps(page))}`);
    if (await page.evaluate(() => !!document.querySelector('#assaultScene .asMini'))) {
      for (const [k, [u, v]] of Object.entries(SPOTS)) {
        await look(page, u, v);
        await wait(page, 1600);
        await page.screenshot({ path: `${dir}/${tag}-2-${k}.png` });
      }
    } else await page.screenshot({ path: `${dir}/${tag}-2-end.png` });
    console.log(`${tag} errors ${log.errors.length} 404 ${log.missing.length} console ${JSON.stringify(log.console.slice(0, 3))}`);
    await ctx.close();
  }
}
await browser.close();
server.close();
