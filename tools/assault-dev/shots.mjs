// ASSAULT-DEV's photographs (`docs/notes/assault-dev.md`): at each upright phone size, Settings' Developer page, the Try an Assault picker,
// the trial's muster, the assault in progress (on Auto), its end screen, the War's end scene for a Last Hold won, and Settings again; then it
// checks the save in local storage is byte for byte what it was before, and that no assault snapshot was left in IndexedDB.
//   npm run web && node tools/assault-dev/shots.mjs [--army orcs] [--kind last] [--strength expected] [out dir]
import { serve, launch, open, SIZES, out, wait, overflow, saveOf } from '../sweep-1110/lib.mjs';
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ARMY = opt('--army', 'orcs');
const KIND = opt('--kind', 'last');
const STRENGTH = opt('--strength', 'expected');
const dir = out(args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'docs/samples/assault-dev');
const PORT = 8917;
const server = serve(PORT);
const browser = await launch();
const click = (page, sel, text) => page.evaluate(([sel, text]) => {
  const b = [...document.querySelectorAll(sel)].filter((x) => x.offsetParent && (!text || new RegExp(text).test(x.textContent.trim())));
  b[b.length - 1]?.click();
  return !!b.length;
}, [sel, text]);
const KIND_NAME = { hold: 'Conquest', last: 'The Last Hold', regroup: 'Regrouped' };
const STRENGTH_NAME = { expected: 'As expected', strong: 'Strong', weak: 'Weak' };

for (const [w, h] of SIZES) {
  const { ctx, page, log } = await open(browser, w, h, PORT, { save: saveOf({}) });
  const tag = `${w}x${h}`;
  const before = await page.evaluate(() => localStorage.getItem('legends.meta'));
  await click(page, '#hmGear');
  await wait(page, 500);
  await click(page, '.setMenu[data-page="dev"]');
  await wait(page, 500);
  await page.screenshot({ path: `${dir}/dev-${tag}.png` });
  await click(page, '.devTrial');
  await wait(page, 800);
  await click(page, '#devAssault .omChoice', `^${KIND_NAME[KIND]}`);
  await click(page, '#devAssault .omChoice', `^${STRENGTH_NAME[STRENGTH]}`);
  await click(page, '#devAssault .omChoice', ARMY === 'orcs' ? '^Bloodtusk' : `.`);
  await wait(page, 300);
  await page.screenshot({ path: `${dir}/picker-${tag}.png` });
  await page.evaluate(() => { const b = document.querySelector('#devAssault .omBody'); if (b) b.scrollTop = b.scrollHeight; });
  await wait(page, 300);
  await page.screenshot({ path: `${dir}/picker-holds-${tag}.png` });
  const o = await overflow(page);
  if (o.scroll || o.bad.length) console.log(`${tag} picker overflow ${JSON.stringify(o)}`);
  await click(page, '#devAssault .omPrimary', 'Storm it');
  await wait(page, 1500);
  await page.screenshot({ path: `${dir}/muster-${tag}.png` });
  console.log(`${tag} muster: ${await page.evaluate(() => document.querySelector('#assaultMuster .omHead')?.textContent?.replace(/\s+/g, ' ').trim())}`);
  let marched = false;
  for (let i = 0; i < 4 && !marched; i++) {
    marched = await click(page, 'button', '^March');
    if (!marched) { await click(page, 'button', '^Close$'); await wait(page, 800); }
  }
  if (!marched) { console.log(`${tag}: no March button`); await ctx.close(); continue; }
  await page.waitForFunction(() => document.querySelector('#assaultScene .asTop'), null, { timeout: 60000 });
  await wait(page, 4000);
  await page.evaluate(() => { const bs = [...document.querySelectorAll('.asTop button')]; const auto = bs.find((b) => b.textContent === 'Auto'); if (auto && !auto.classList.contains('on')) auto.click(); bs.find((b) => b.textContent === 'x1')?.click(); });
  await wait(page, 12000);
  await page.screenshot({ path: `${dir}/progress-${tag}.png` });
  const t0 = Date.now();
  await page.waitForFunction(() => !document.querySelector('#assaultScene'), null, { timeout: 600000 }).catch(() => console.log(`${tag}: the assault never ended`));
  await wait(page, 2500);
  console.log(`${tag} ended after ${Math.round((Date.now() - t0) / 1000)} s more; the end screen: ${await page.evaluate(() => document.querySelector('.omVeil:last-of-type .omHead')?.textContent?.replace(/\s+/g, ' ').trim())}`);
  await page.screenshot({ path: `${dir}/end-${tag}.png` });
  await click(page, '.omVeil .omFoot .omBack');
  await wait(page, 4000);
  const scene = await page.evaluate(() => !!document.querySelector('.csSkip'));
  if (scene) {
    await page.screenshot({ path: `${dir}/warend-${tag}.png` });
    await wait(page, 6000);
    await page.screenshot({ path: `${dir}/warend-2-${tag}.png` });
    for (let i = 0; i < 12 && (await page.evaluate(() => !!document.querySelector('.csSkip'))); i++) { await click(page, '.csSkip'); await wait(page, 700); }
  }
  await wait(page, 1200);
  await page.screenshot({ path: `${dir}/back-${tag}.png` });
  const after = await page.evaluate(() => localStorage.getItem('legends.meta'));
  const snap = await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('legends.assault', 1); r.onupgradeneeded = () => r.result.createObjectStore('battle'); r.onsuccess = () => { const g = r.result.transaction('battle').objectStore('battle').get('live'); g.onsuccess = () => ok(!!g.result); g.onerror = () => ok('error'); }; r.onerror = () => ok('error'); }));
  console.log(`${tag}: War's end scene ${scene ? 'shown' : 'not shown'}; back on ${await page.evaluate(() => document.querySelector('#settings h2')?.textContent)}; the save ${after === before ? 'UNCHANGED' : 'CHANGED'}; an assault snapshot left: ${snap}; errors ${log.errors.length}, 404s ${log.missing.length}`);
  await ctx.close();
}
await browser.close();
server.close();
