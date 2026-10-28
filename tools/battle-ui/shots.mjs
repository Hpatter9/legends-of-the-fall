// Battle-ui checks and shots: node tools/battle-ui/shots.mjs   (after `npm run web`; writes docs/samples/battle-ui-*.png)
import { serve, launch, boot, calamityFight } from './lib.mjs';
const s = serve();
const br = await launch();
const out = (n, w) => `docs/samples/battle-ui-${n}${w === 393 ? '' : `-${w}`}.png`;
const fails = [];
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  // --- the Calamity: bench strip, spell drag, speed
  const { ctx, page, errors } = await boot(br, w, h);
  await calamityFight(page);
  await page.screenshot({ path: out('calamity-deploy', w) });
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out('calamity-fight', w) });
  // (in a fight the bench gives way to the hero bar, COMBAT-002: a tile for each hero placed, and the Auto switch)
  const bench = await page.evaluate(() => { const r = document.getElementById('heroBar').getBoundingClientRect(); return { h: r.height, benchShown: document.getElementById('benchWrap').getBoundingClientRect().height > 0, tiles: document.querySelectorAll('#heroBar .hb').length }; });
  check(`the hero bar replaces the bench (${w})`, bench.h > 0 && bench.h < 110 && !bench.benchShown && bench.tiles >= 1, JSON.stringify(bench));
  // drag a spell onto the grid
  await page.evaluate(() => { window.__game.b.spells.mana = 10; });
  const card = await page.evaluate(() => { const r = document.querySelector('.spell[data-id="meteor"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(card.x, card.y);
  await page.mouse.down();
  await page.mouse.move(card.x, card.y - 100, { steps: 5 });
  const grid = await page.evaluate(() => { const g = window.__game; for (let y = 200; y < 560; y += 12) for (let x = 40; x < 360; x += 12) if (g.spellTile(x, y)) return [x, y]; return [200, 330]; });
  await page.mouse.move(...grid, { steps: 6 });
  const marks = await page.evaluate(() => ({ spell: window.__game.spell, hover: window.__game.hover, ghost: !document.getElementById('spellGhost').hidden }));
  check(`drag shows the preview (${w})`, marks.spell === 'meteor' && !!marks.hover && marks.ghost, JSON.stringify(marks));
  await page.screenshot({ path: out('spell-drag', w) });
  // back off the grid: cancel
  await page.mouse.move(card.x, card.y, { steps: 6 });
  await page.mouse.up();
  const cancelled = await page.evaluate(() => ({ mana: window.__game.b.spells.mana, spell: window.__game.spell }));
  check(`drag back cancels (${w})`, cancelled.mana >= 10 && cancelled.spell === null, JSON.stringify(cancelled));
  // and a real cast
  await page.evaluate(() => { window.__game.b.spells.mana = 10; });
  await page.mouse.move(card.x, card.y);
  await page.mouse.down();
  // (a tile of the grid, found again: the fight's camera moves)
  const grid2 = await page.evaluate(() => { const g = window.__game; for (let y = 200; y < 560; y += 12) for (let x = 40; x < 360; x += 12) if (g.spellTile(x, y)) return [x, y]; return [200, 330]; });
  await page.mouse.move(...grid2, { steps: 8 });
  await page.mouse.up();
  const cast = await page.evaluate(() => ({ mana: window.__game.b.spells.mana, spell: window.__game.spell }));
  check(`release on the grid casts (${w})`, cast.mana < 10 && cast.spell === null, JSON.stringify(cast));
  await page.screenshot({ path: out('spell-cast', w) });
  // speed: ×2, then it carries to the next fight
  await page.click('#speed');
  const sp1 = await page.evaluate(() => ({ speed: window.__game.speed, label: document.getElementById('speed').textContent, saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /setting/i.test(k)) ?? '') ?? '{}').speed }));
  check(`speed picked (${w})`, sp1.speed === 2, JSON.stringify(sp1));
  await page.evaluate(() => { const g = window.__game; g.newBattle(); });
  await page.waitForTimeout(500);
  const sp2 = await page.evaluate(() => ({ speed: window.__game.speed, label: document.getElementById('speed').textContent }));
  check(`speed carries to the next fight (${w})`, sp2.speed === 2 && sp2.label === '×2', JSON.stringify(sp2));
  const vis = await page.evaluate(() => { const r = document.getElementById('speed').getBoundingClientRect(); return { top: r.top, w: r.width, phase: document.body.dataset.phase }; });
  check(`speed button visible in deploy (${w})`, vis.top < 60 && vis.w > 0, JSON.stringify(vis));
  check(`no page errors (${w})`, errors.length === 0, errors.join('|'));
  await ctx.close();
}
await br.close(); s.close();
if (fails.length) { console.log('FAILED:', fails); process.exit(1); }
