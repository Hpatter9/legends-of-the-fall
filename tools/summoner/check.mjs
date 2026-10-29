import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/codex/cua_node/lib/node_modules/')('playwright');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
for (const [width, height, reduced] of [[393,852,false],[360,780,false],[412,915,false],[393,852,true]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const owned = ['knight','samurai','kunoichi','archer','wizard','peasant','ninjaMonk','wanderer'];
    localStorage.setItem('legends.meta', JSON.stringify({ seed:7, crowns:4000, unlocked:owned, party:owned.slice(0,5), pulls:0, castle:{}, shards:{}, stars:{}, xp:{}, bestStage:30, tower:0, daily:{}, bosses:[], achievements:[], armies:{}, armySeen:[], stones:60, heroesSeen:owned }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ music:0,effects:0,cinematics:false,quips:false }));
  });
  await page.goto('http://localhost:8000/?seed=123');
  await page.waitForFunction(() => window.__game && window.__tarot, null, {timeout:90000});
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); window.__game.home.show('recruit'); });
  await page.waitForSelector('.hlWrap .summonerActor', {state:'visible'});
  await page.waitForTimeout(500);
  const idle = await page.locator('.hlWrap .summonerActor i').evaluate(e => ({animation:getComputedStyle(e).animationName, rect:e.getBoundingClientRect().toJSON()}));
  assert.equal(idle.animation, reduced ? 'none' : 'summonerBreath');
  const tag = `${width}${reduced ? '-reduced' : ''}`;
  await page.screenshot({path:`docs/samples/summoner/idle-${tag}.png`});
  await page.evaluate(() => { void window.__tarot.firstReveal(window.__game.meta,'kitsune'); });
  await page.waitForSelector('.tarotReveal[data-stage="1"]');
  assert.equal(await page.locator('.tarotReveal .summonerActor').getAttribute('data-pose'), 'cast');
  assert.equal(await page.locator('.tarotReveal .tarotCard').count(), 0);
  await page.screenshot({path:`docs/samples/summoner/cast-${tag}.png`});
  if (!reduced) {
    await page.waitForSelector('.tarotReveal[data-stage="2"]');
    assert.equal(await page.locator('.tarotReveal .summonerActor').getAttribute('data-pose'), 'shield');
    await page.waitForTimeout(150);
    await page.screenshot({path:`docs/samples/summoner/flash-${tag}.png`});
    await page.waitForSelector('.tarotReveal[data-stage="3"]');
    await page.screenshot({path:`docs/samples/summoner/arrival-${tag}.png`});
  }
  await page.waitForSelector('.tarotReveal[data-stage="4"]');
  assert.equal(await page.locator('.tarotReveal .summonerActor').getAttribute('data-pose'), 'idle');
  await page.waitForTimeout(500);
  await page.screenshot({path:`docs/samples/summoner/revealed-${tag}.png`});
  await page.mouse.click(width/2,height/2);
  await page.waitForSelector('.tarotReveal', {state:'detached'});
  assert.ok(await page.evaluate(() => window.__game.meta.heroesSeen.includes('kitsune')));
  if (width === 393 && !reduced) {
    // Real stone pull through the home/gacha callback, rather than only the presentation fixture.
    await page.evaluate(() => { window.__forceLucky = true; window.__game.meta.stones = 60; window.__game.home.summon(1); });
    await page.waitForSelector('.tarotReveal');
    assert.equal(await page.locator('.tarotResult.joined .tarotCard').count(), 0);
    await page.waitForSelector('.tarotReveal[data-stage="4"]');
    await page.waitForTimeout(550);
    await page.mouse.click(width/2,height/2);
    await page.waitForSelector('.tarotReveal', {state:'detached'});
    await page.waitForFunction(() => !document.getElementById('pull1').disabled);
    assert.equal(await page.locator('.tarotResult.joined .tarotSide.front').evaluate(e => e.style.filter), '');
    await page.screenshot({path:'docs/samples/summoner/stone-result.png'});
  }
  assert.deepEqual(errors, []);
  results.push({width,height,reduced,idle,errors});
  await ctx.close();
}
writeFileSync('docs/samples/summoner/checks.json', JSON.stringify(results,null,2));
console.log('Summoner: idle, cast, flash/shield, arrival, seen-save and reduced motion passed at all portrait sizes.');
} finally { await browser.close(); }
