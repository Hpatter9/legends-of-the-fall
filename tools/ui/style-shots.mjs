// Screenshots of the seven mock screens in each UI style (see docs/notes/ui-styles.md):
//   node tools/ui/style-shots.mjs [styles, e.g. a,b,c,d,off] [w x h, default 393x852] [screens, comma list]
// Writes docs/samples/ui-style-<style>-<screen>[-WxH].png ("off" is today's look, written as "today"). Needs out/web built.
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve, launch, HEROES, saveScript } from '../audit/lib.mjs';
const styles = (process.argv[2] ?? 'off,a,b,c,d').split(',');
const [W, H] = (process.argv[3] ?? '393x852').split('x').map(Number);
const only = process.argv[4]?.split(',');
const tag = W === 393 && H === 852 ? '' : `-${W}x${H}`;
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const SCREENS = ['battle', 'heroes', 'sheet', 'armies', 'castle', 'recruit', 'fight', 'recap'];
// a save part-way through: heroes, a built castle, an army or two beaten, crowns to spend
const extra = { crowns: 1850, armySeen: ['orcs', 'undead', 'beasts'], castle: { treasury: 3, barracks: 3, armoury: 2, mageTower: 2, stable: 2, library: 1 },
  armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 8: 2 }, met: { 0: 7, 1: 3 } }, undead: { best: 5, won: 0, clears: 0, stars: {}, met: { 0: 2 } } } };
for (const style of styles) {
  const name = style === 'off' ? 'today' : style;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const go0 = (fn) => page.evaluate(fn);
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES.slice(0, 22), extra]);
  await page.goto(`${base}?seed=7&style=${style}`);
  await page.waitForTimeout(2200);
  await go0(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  const shot = async (screen) => {
    if (only && !only.includes(screen)) return;
    await page.waitForTimeout(500);
    await page.screenshot({ path: `docs/samples/ui-style-${name}-${screen}${tag}.png` });
    // (the text boxes on the page, for tools/ui/contrast.py: where each is, its colour and size)
    if (process.env.AUDIT) {
      const boxes = await page.evaluate(() => {
        const out = [];
        for (const el of document.body.querySelectorAll('*')) {
          const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
          if (!own || own.length < 2) continue;
          const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.5 || r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
          let hid = false; for (let a = el; a; a = a.parentElement) if (a.hidden || getComputedStyle(a).display === 'none') hid = true;
          if (hid) continue;
          const top = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2));
          if (!top || !(top === el || el.contains(top) || top.contains(el))) continue;
          out.push({ x: r.left, y: r.top, w: r.width, h: r.height, color: cs.color, size: cs.fontSize, text: own.slice(0, 40), cls: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}` });
        }
        return out;
      });
      mkdirSync('/tmp/claude-0/s/audit', { recursive: true });
      writeFileSync(`/tmp/claude-0/s/audit/${name}-${screen}${tag}.json`, JSON.stringify(boxes));
    }
  };
  const go = (fn, ...a) => page.evaluate(fn, ...a);
  // the fight first: a few heroes placed, the bench showing
  await go(() => { const g = window.__game; for (const hh of g.run.roster.slice(0, 3)) { if (g.b.units.some((u) => u.tag === hh.id)) continue; const t = g.freeTile(); if (t) g.put(String(hh.id), t); } });
  await page.waitForTimeout(1200);
  await shot('fight');
  await go(() => document.getElementById('homeBtn').click());
  await page.waitForTimeout(1500);
  await go(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  await shot('battle');
  await go(() => window.__game.home.show('heroes'));
  await shot('heroes');
  await go(() => window.__game.home.openSheet('knight'));
  await page.waitForTimeout(500);
  await shot('sheet');
  await go(() => window.__game.home.closeSheet());
  await go(() => window.__game.home.show('castle'));
  await shot('castle');
  await go(() => window.__game.home.show('recruit'));
  await shot('recruit');
  await go(() => window.__game.home.show('battle'));
  await go(() => window.__game.home.openArmies());
  await page.waitForTimeout(900);
  await shot('armies');
  await go(() => window.__game.home.closeSub?.());
  // the recap: the finished run's page, over the home screen
  await go(() => {
    const g = window.__game;
    document.getElementById('home').hidden = true;
    const r = g.run;
    r.cleared = false; r.best = 9;
    r.recap = { fights: 9, cleared: 8, ms: 412000, earned: 2310, spent: 1980, crowns: 64, chests: 2, heroes: Object.fromEntries(r.roster.slice(0, 5).map((h, i) => [h.id, { dealt: 4200 - i * 600, healed: i === 3 ? 900 : 0, taken: 1800 + i * 200, kills: 9 - i, fights: 9, deaths: i % 2, grade: 1 }])), xp: Object.fromEntries(r.roster.slice(0, 5).map((h, i) => [h.id, 120 - i * 15])), levels: Object.fromEntries(r.roster.slice(0, 3).map((h, i) => [h.id, [3 + i, 4 + i]])) };
    g.showRunRecap();
  });
  await go(() => { const r = document.getElementById('recap'); r.hidden = false; });
  await shot('recap');
  await ctx.close();
}
await browser.close(); srv.close();
