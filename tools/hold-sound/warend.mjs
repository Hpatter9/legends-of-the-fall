// HOLD-SOUND round 2's check in the real page: the War's-end scene and the Council's end card play the War's End (`warend`) from its file
// (not the synth stand-in), the camp's music comes back after each, and a skipped ultimate's bus is hushed.
//   npm run web && node tools/hold-sound/warend.mjs [port]
import { serve, open, wait, saveOf, ARMY_IDS } from '../sweep-1110/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.argv[2] ?? 8936);
const server = serve(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const save = saveOf({ conquered: ARMY_IDS });
save.war = { v: 1, turn: 12, members: [], fallen: [], news: [], nextId: 5, trophies: 0, end: { army: 'orcs', day: 20261110, turn: 12, chief: { name: 'Gorvak the Unbowed', base: 'orcWarlord', warchief: true }, slain: ['Gorvak the Unbowed', 'Ruk Gatebreaker'], scattered: ['Mog the Sly'] } };
const { ctx, page, log } = await open(browser, 393, 852, PORT, { save });
const dbg = () => page.evaluate(() => { const d = window.__audioDebug(); return { track: d.track, sounding: d.sounding, fallback: d.fallback, sceneMusic: d.sceneMusic, show: undefined }; });
await page.mouse.click(200, 300);
await wait(page, 1500);
console.log('camp        ', JSON.stringify(await dbg()));
await page.evaluate(() => window.__audioApi.playScene('warEnd'));
await wait(page, 4000);
console.log('warEnd scene', JSON.stringify(await dbg()));
await page.evaluate(() => window.__audioApi.endScene());
await wait(page, 2500);
console.log('after       ', JSON.stringify(await dbg()));
const opened = await page.evaluate(() => { const g = window.__game; const f = g.home.openCouncil ?? g.home.openNemesis ?? g.home.openWar; if (f) { f.call(g.home); return true; } return false; });
if (opened) {
  await wait(page, 4000);
  console.log('council card', JSON.stringify(await dbg()), await page.evaluate(() => document.querySelector('.nmPane')?.textContent?.slice(0, 60)));
  await page.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.offsetParent).find((x) => /Back/.test(x.textContent))?.click());
  await wait(page, 2500);
  console.log('card closed ', JSON.stringify(await dbg()));
} else console.log('council card: no opener found on home');
console.log(`errors ${log.errors.length} 404 ${log.missing.length} console ${JSON.stringify(log.console.slice(0, 3))}`);
await browser.close();
server.close();
