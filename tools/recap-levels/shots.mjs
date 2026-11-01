// Recap levels shots (docs/notes/recap-levels.md): the run-end recap with a level line (Lv start → end) on each hero that levelled, at 393x852, 360x780 and 412x915.
//   npm run web && node tools/recap-levels/shots.mjs      (writes docs/samples/recap-levels-*.png)
import { serve, launch, boot } from '../battle-ui/lib.mjs';
const PORT = 8771;
const srv = serve('out/web', PORT);
const br = await launch();
const xpFor = (lv) => Math.round(30 * (lv - 1) * lv * (lv > 20 ? 4 : 1));
const skip = async (page) => { for (let i = 0; i < 6; i++) { await page.evaluate(() => { const c = document.getElementById('cutscene'); [...(c?.querySelectorAll('button') ?? [])].find((b) => /skip/i.test(b.textContent))?.click(); }); await page.waitForTimeout(500); } };
const PARTY = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const name = (n) => `docs/samples/recap-levels-${n}-${w}.png`;
  // 2. the unit card and 3. the recap
  {
    const { ctx, page, errors } = await boot(br, w, h, PORT);
    await page.waitForFunction(() => window.__game?.meta, null, { timeout: 60000 });
    await skip(page);
    await page.evaluate((xp) => {
      const g = window.__game;
      Object.assign(g.meta.xp, xp);
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 3, over: false, cleared: false, gold: 900, event: undefined });
      r.roster = ['knight','samurai','kunoichi','archer','wizard'].map((kind, i) => ({ id: i + 1, kind, grade: 1, paid: 5 }));
      r.squad = [1, 2, 3, 4, 5];
      document.getElementById('home').hidden = true;
      g.startRun(r);
    }, { knight: xpFor(8) - 4, samurai: xpFor(10) - 4, wizard: xpFor(5) - 3 });
    await page.waitForTimeout(2500);
    await skip(page);
    for (let i = 0; i < 3; i++) { await page.evaluate(() => { const c = document.getElementById('bossCard'); if (c && !c.hidden) c.click(); }); await page.waitForTimeout(800); }
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    // 3. a won wave: the recap with the knight's level 8 and the samurai's level 10 (a proficiency step)
    await page.click('#fight');
    await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 100000 });
    await page.waitForFunction(() => document.getElementById('result').hidden && document.body.dataset.phase === 'deploy', null, { timeout: 30000 });
    // (the run's end, by losing the next wave with no retries left: the JRPG results screen)
    await page.evaluate(() => { const g = window.__game; g.run.retries = 2; for (const u of g.b.units) if (u.side === 'hero') { u.hp = 0; u.alive = false; } });
    await page.click('#fight').catch(() => {});
    await page.waitForTimeout(1500);
    await skip(page);
    await page.getByText('Run recap').first().click({ timeout: 20000 }).catch(() => {});
    await page.waitForSelector('#recap .jrRow', { timeout: 100000 }).catch(() => {});
    await page.waitForTimeout(7000);
    await page.evaluate(() => { document.querySelector('#recap')?.scrollTo?.(0, 0); });
    await page.screenshot({ path: name('recap') });
    console.log(w, 'errors', errors);
    await ctx.close();
  }
}
srv.close();
await br.close();
