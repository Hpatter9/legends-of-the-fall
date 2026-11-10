// HOLD-SOUND's check in the real page (docs/notes/hold-sound.md): for each hold, the war table (its music and bed), the march, then the
// host on Auto at x2 for a while, logging what the engine says it is playing (`__audioDebug`: the track, the bed, the drums) and every cue
// that fired (`__sfxLog`), and any page error. `--last` makes the hold the Last Hold (every other hold fallen).
//   npm run web && node tools/hold-sound/probe.mjs [--armies orcs,undead] [--last] [--run 90] [--level 32] [--port 8931]
import { serve, open, wait, saveOf, ARMY_IDS } from '../sweep-1110/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ARMIES = opt('--armies', ARMY_IDS.join(',')).split(',');
const LAST = args.includes('--last');
const RUN = Number(opt('--run', 90));
const LEVEL = Number(opt('--level', 32));
const PORT = Number(opt('--port', 8931));
const server = serve(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const dbg = (page) => page.evaluate(() => { const d = window.__audioDebug(); return { state: d.state, track: d.track, sting: d.sting, place: d.place, battle: d.battle, victory: d.victory, bed: d.bed, hold: d.hold, drums: d.drums }; });
const tally = (page) => page.evaluate(() => { const n = {}; for (const k of window.__sfxLog) n[k] = (n[k] ?? 0) + 1; return n; });

for (const army of ARMIES) {
  const save = saveOf({ conquered: LAST ? ARMY_IDS.filter((a) => a !== army) : [], level: LEVEL });
  if (LAST) save.war = undefined;
  const { ctx, page, log } = await open(browser, 393, 852, PORT, { save });
  const tag = `${army}${LAST ? ' (last)' : ''}`;
  // (the first tap starts the audio)
  await page.mouse.click(200, 300);
  await wait(page, 1200);
  await page.evaluate(() => { window.__sfxLog = []; });
  console.log(`${tag} camp       ${JSON.stringify(await dbg(page))}`);
  await page.evaluate((a) => window.__game.home.openAssault(a), army);
  await wait(page, 2500);
  console.log(`${tag} war table  ${JSON.stringify(await dbg(page))}`);
  let marched = null;
  for (let i = 0; i < 4 && !marched; i++) {
    marched = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter((x) => x.offsetParent);
      const m = bs.find((x) => /^March/.test(x.textContent.trim()));
      if (m) { m.click(); return m.textContent; }
      bs.find((x) => x.textContent.trim() === 'Close')?.click();
      return null;
    });
    if (!marched) await wait(page, 900);
  }
  if (!marched) { console.log(`${tag}: no March button`); await ctx.close(); continue; }
  await page.waitForFunction(() => document.querySelector('#assaultScene .asTop'), null, { timeout: 90000 }).catch(() => console.log(`${tag}: the field never came up`));
  await wait(page, 4000);
  console.log(`${tag} field      ${JSON.stringify(await dbg(page))}`);
  await page.evaluate(() => { const bs = [...document.querySelectorAll('.asTop button')]; const auto = bs.find((b) => b.textContent === 'Auto'); if (auto && !auto.classList.contains('on')) auto.click(); bs.find((b) => b.textContent === 'x1')?.click(); });
  let over = false;
  for (let s = 0; s < RUN && !over; s += 15) {
    await wait(page, 15000);
    over = await page.evaluate(() => !document.querySelector('#assaultScene'));
    const bar = await page.evaluate(() => document.querySelector('.asTop')?.textContent?.replace(/\s+/g, ' ') ?? document.querySelector('.omTitle, .om h2')?.textContent);
    console.log(`${tag} +${s + 15}s ${JSON.stringify(await dbg(page))} ${JSON.stringify(bar)}`);
  }
  if (over) {
    await wait(page, 2500);
    console.log(`${tag} result     ${JSON.stringify(await dbg(page))}`);
    await page.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.offsetParent).find((x) => /Back/.test(x.textContent))?.click());
    await wait(page, 2500);
    console.log(`${tag} after      ${JSON.stringify(await dbg(page))}`);
  }
  console.log(`${tag} cues       ${JSON.stringify(await tally(page))}`);
  console.log(`${tag} errors ${log.errors.length} 404 ${log.missing.length} console ${JSON.stringify(log.console.slice(0, 3))}`);
  await ctx.close();
}
await browser.close();
server.close();
