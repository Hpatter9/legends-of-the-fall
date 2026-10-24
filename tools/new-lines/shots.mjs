// Checks the new lines in the real page, on an upright phone (393x852), with no page errors, and takes docs/samples/new-lines-*.png:
// the loading tip, a fight where the heroes talk, a heart reviving the party (and a hero's word about it), the Last Stand (the king at a
// wave's start and a foe's grumble), the awakening scene and Gorvak's. Run `npm run web` first; then `node tools/new-lines/shots.mjs`.
import { readFileSync, mkdirSync } from 'node:fs';
import { serve, boot } from '../battle-ui/lib.mjs';
import { launch, boot as bootStand, enter } from '../stand/lib.mjs';

const lines = JSON.parse(readFileSync('docs/lines/new-lines.json', 'utf8'));
const kindOf = (text) => {
  for (const [h, q] of Object.entries(lines.hero_quips)) for (const [k, v] of Object.entries(q)) if (v.includes(text)) return `${h}.${k}`;
  for (const [k, v] of Object.entries(lines.king)) if (v.includes(text)) return `king.${k}`;
  for (const [k, v] of Object.entries(lines.last_stand_foes)) if (v.includes(text)) return `standFoe.${k}`;
  if (lines.foe_grumbles.includes(text)) return 'foe grumble';
  for (const [t, ps] of Object.entries(lines.banter)) for (const p of ps) if (p.includes(text)) return `banter.${t}`;
  return '?';
};
mkdirSync('docs/samples', { recursive: true });
const shot = (page, name) => page.screenshot({ path: `docs/samples/new-lines-${name}-393x852.png` });
const bubble = (page) => page.evaluate(() => { const q = document.getElementById('quip'); return q && q.classList.contains('on') ? [...q.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('') : null; });
/** Hire what the gold allows, set the party out and start the fight. */
const startFight = async (page, speed) => {
  for (let k = 0; k < 4; k++) {
    await page.evaluate(() => document.getElementById('summon').click());
    await page.waitForTimeout(1300);
  }
  await page.evaluate((sp) => { window.__game.autoArrange(true); document.getElementById('fight').click(); window.__game.setSpeed(sp); }, speed);
};
const server = serve();
const browser = await launch();
let bad = 0;
const fail = (m) => { console.log('FAIL', m); bad++; };

// ---- the loading tip (the loading screen is kept up so it can be seen)
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { const r = Element.prototype.remove; Element.prototype.remove = function () { if (this.id === 'loading') return; return r.call(this); }; });
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(1500);
  // (a new save is playing its opening over the loading screen: bring the loading screen to the front)
  await page.evaluate(() => { document.getElementById('loading').style.zIndex = '99999'; });
  await page.waitForTimeout(300);
  const tip = await page.evaluate(() => document.querySelector('.ldTip')?.textContent);
  console.log('loading tip:', tip);
  if (!lines.loading_tips.includes(tip)) fail('the loading tip is not one of the tips');
  await shot(page, 'loading-tip');
  if (errors.length) fail(`loading errors ${errors}`);
  await ctx.close();
}

// ---- a fight where the heroes talk; and, with a loss and a heart left, the revival
const talk = async (seed, hurt) => {
  const { ctx, page, errors } = await boot(browser, 393, 852, 8139, 'old');
  await page.goto(`http://localhost:8139/?seed=${seed}`);
  await page.waitForTimeout(2500);
  await startFight(page, 2);
  if (hurt) await page.evaluate(() => window.__game.b.units.filter((u) => u.side === 'hero').forEach((u) => (u.hp = Math.max(1, Math.round(u.maxHp * 0.3)))));
  const seen = [];
  let shotAt = '';
  for (let i = 0; i < 400; i++) {
    await page.waitForTimeout(250);
    const t = await bubble(page);
    if (t && seen[seen.length - 1]?.t !== t) {
      seen.push({ t, kind: kindOf(t), at: i });
      if (!shotAt) { shotAt = t; await shot(page, hurt ? 'revive-fight' : 'fight-quip'); }
    }
    if (await page.evaluate(() => !document.getElementById('result').hidden)) break;
  }
  return { ctx, page, errors, seen };
};
{
  let done = null;
  for (const seed of [5, 6, 7, 8]) {
    const r = await talk(seed, false);
    console.log(`fight seed ${seed}:`, JSON.stringify(r.seen.map((s) => [s.kind, s.t])));
    if (r.errors.length) fail(`fight errors ${r.errors}`);
    await r.ctx.close();
    if (r.seen.some((s) => !s.kind.startsWith('foe') && s.kind !== '?')) { done = seed; break; }
  }
  if (!done) fail('no hero spoke in a fight');
}
// (a heart revive: the party is hurt until it falls, a heart burns, and one hero says so)
{
  const { ctx, page, errors } = await boot(browser, 393, 852, 8139, 'old');
  await page.goto('http://localhost:8139/?seed=5');
  await page.waitForTimeout(2500);
  await startFight(page, 3);
  await page.evaluate(() => window.__game.b.units.filter((u) => u.side === 'hero').forEach((u) => (u.hp = 1)));
  const heard = [];
  let burning = false;
  for (let i = 0; i < 480; i++) {
    await page.waitForTimeout(250);
    const t = await bubble(page);
    if (t && heard[heard.length - 1] !== t) heard.push(t);
    const r = await page.evaluate(() => !!window.__game.revive);
    if (r && !burning) { burning = true; await shot(page, 'revive-heart-burns'); }
    if (burning && t && lines.hero_quips && kindOf(t).endsWith('.revived')) { await shot(page, 'revive-line'); break; }
    if (burning && !r) break;
  }
  console.log('revive: heart burned', burning, '; heard', JSON.stringify(heard.map((h) => [kindOf(h), h])));
  if (!burning) fail('no heart burned');
  if (!heard.some((h) => kindOf(h).endsWith('.revived'))) fail('no revived line was heard');
  if (errors.length) fail(`revive errors ${errors}`);
  await ctx.close();
}

// ---- the Last Stand: the king at a wave's start, a foe from an edge
{
  let king = null;
  let foe = null;
  for (let seed = 1; seed < 14 && !(king && foe); seed++) {
    const { ctx, page, errors } = await bootStand(browser, 393, 852, 20);
    await page.evaluate((s) => { const m = JSON.parse(localStorage.getItem('legends.meta')); m.seed = s; localStorage.setItem('legends.meta', JSON.stringify(m)); }, seed);
    await page.reload();
    await page.waitForTimeout(2200);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    await enter(page);
    await page.evaluate(() => document.querySelector('.stStart').click());
    for (let i = 0; i < 60 && !(king && foe); i++) {
      await page.waitForTimeout(250);
      const t = await bubble(page);
      if (!t) continue;
      const k = kindOf(t);
      if (k.startsWith('king.') && !king) { king = [seed, k, t]; await shot(page, 'stand-king'); }
      if (k.startsWith('standFoe.') && !foe) { foe = [seed, k, t]; await shot(page, 'stand-foe'); }
    }
    if (errors.length) fail(`stand errors ${errors}`);
    await ctx.close();
  }
  console.log('stand: king', JSON.stringify(king), '; foe', JSON.stringify(foe));
  if (!king) fail('the king never spoke');
  if (!foe) fail('no foe grumbled');
}

// ---- the awakening and Gorvak's scenes
for (const [id, name, waitMs] of [['awaken:knight', 'awaken-scene', 9000], ['gorvak', 'gorvak-scene', 7000]]) {
  const { ctx, page, errors } = await boot(browser, 393, 852, 8139, 'old');
  await page.evaluate((i) => void window.__game.playScene(i), id);
  await page.waitForTimeout(waitMs);
  await shot(page, name);
  const text = await page.evaluate(() => document.body.innerText);
  console.log(id, 'ascen?', /ascen/i.test(text));
  if (id.startsWith('awaken') && /ascen/i.test(text)) fail('the awakening scene says ascension');
  if (errors.length) fail(`${id} errors ${errors}`);
  await ctx.close();
}
await browser.close();
server.close();
console.log(bad ? `${bad} problems` : 'all good');
process.exit(bad ? 1 : 0);
