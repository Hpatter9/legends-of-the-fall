// SUMMON-TIMERS browser checks and shots: node tools/summon-timers/shots.mjs [root] [port] [prefix]  (build first: npm run web).
// Env: CHROMIUM_PATH, PLAYWRIGHT_MODULE (as for tools/world-001/browser.mjs), VIEWS (default 393x852,360x780,412x915).
// A presentation fixture: the army run's roster is set by hand to five summoners and shapeshifters, each holding what a won wave 1 would have
// kept for it (a wolf, a treant, a wraith, the standard, the Werewolf's Brute form), and wave 2 is fought. Each shot is taken a few seconds in,
// with the camera drawn close, so the timers' rings show on the kept summons and the shifted hero.
import { openBrowser } from '../world-001/browser.mjs';
const [root = 'out/web', port = '8991', prefix = 'docs/samples/summon-timers'] = process.argv.slice(2);
const views = (process.env.VIEWS ?? '393x852,360x780,412x915').split(',').map((v) => v.split('x').map(Number));
const { browser, url, close } = await openBrowser(root, Number(port));
let bad = 0;
try {
  for (const [w, h] of views) {
    const tag = `${w}x${h}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.stack.split('\n').slice(0, 3).join(' | ')));
    await page.goto(`${url}/?seed=11`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__game, {}, { timeout: 120000 });
    await page.waitForTimeout(700);
    await page.evaluate(() => document.querySelector('#tipSkip')?.click());
    // (the army's opening scene, if it plays, is skipped)
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /^skip$/i.test(b.textContent.trim()) && b.offsetParent).forEach((b) => b.click()));
      await page.waitForTimeout(500);
    }
    await page.addStyleTag({ content: '#quip{display:none!important}' });
    const kept = await page.evaluate(() => {
      const g = window.__game;
      g.scenesOn = () => false;
      g.goat.newFight = () => {};
      const full = { beast: 60000, wraith: 20000, standard: 30000, wolfForm: 40000 };
      g.run.roster = [
        { id: 101, kind: 'beastmaster', grade: 1, summons: [{ kind: 'wolf', hp: 0.7, left: 41000, full: full.beast }] },
        { id: 102, kind: 'druid', grade: 1, summons: [{ kind: 'treant', hp: 0.9, left: 22000, full: full.beast }] },
        { id: 103, kind: 'reaper', grade: 1, summons: [{ kind: 'wraith', hp: 1, left: 6000, full: full.wraith, max: 160, atk: 0.6, look: 'hk_orc_grunt' }] },
        { id: 104, kind: 'samuraiCommander', grade: 1, summons: [{ kind: 'standard', hp: 1, left: 24000, full: full.standard }] },
        { id: 105, kind: 'werewolf', grade: 1, form: [{ key: 'wolf', wolf: 'brute', left: 30000, full: full.wolfForm }] },
      ];
      g.run.nextId = 106;
      g.run.squad = g.run.roster.map((x) => x.id);
      g.run.stage = 2;
      g.newBattle();
      g.endIntro();
      g.autoArrange();
      document.querySelector('#fight')?.click();
      const b = g.b;
      return { phase: b.phase, summons: b.units.filter((u) => u.owner !== undefined && u.side === 'hero').map((u) => `${u.def} ${Math.round((u.hp / u.maxHp) * 100)}% ${Math.round((u.expires - b.t) / 1000)}s`), wolf: b.units.find((u) => u.def === 'werewolf')?.kx?.wolf };
    });
    console.log(tag, JSON.stringify(kept));
    if (kept.summons.length < 4 || kept.wolf !== 'brute') bad++;
    await page.waitForFunction(() => window.__game.b.t >= 1500, {}, { timeout: 120000 }).catch(() => {});
    // (the camera drawn in on the heroes' rows, as a pinch would)
    await page.evaluate(() => {
      const g = window.__game;
      g.clampCam = () => {};
      const heroes = g.b.units.filter((u) => u.side === 'hero' && u.alive && (u.life || u.kx?.wolfUntil));
      const sp = heroes.map((u) => g.sprites.get(u.id)).filter(Boolean);
      const x = sp.reduce((a, s) => a + s.x, 0) / sp.length;
      const y = sp.reduce((a, s) => a + s.y, 0) / sp.length;
      g.zoom = g.tzoom = g.zoom * 2.2;
      g.cx = g.tx = x + 32;
      g.cy = g.ty = y - 30;
      g.manualCam = true;
    });
    await page.waitForTimeout(900);
    const now = await page.evaluate(() => {
      const b = window.__game.b;
      return { t: b.t, phase: b.phase, rings: b.units.filter((u) => u.alive && u.side === 'hero' && (u.life || u.kx?.wolfUntil)).length };
    });
    console.log(tag, 'in the fight', JSON.stringify(now), 'errors', JSON.stringify(errors));
    if (errors.length) bad++;
    await page.screenshot({ path: `${prefix}-${tag}.png` });
    await ctx.close();
  }
} finally {
  await close();
}
process.exit(bad ? 1 : 0);
