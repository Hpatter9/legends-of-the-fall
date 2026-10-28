// Uses route-served built files so portrait review also works without a local server.
import { launch, boot, calamityFight } from './command-lib.mjs';
import { writeFileSync } from 'node:fs';
const browser = await launch();
const results = [];
try {
  for (const [w,h] of [[393,852],[360,780],[412,915]]) {
    const {ctx,page,errors} = await boot(browser,w,h);
    await calamityFight(page);
    await page.evaluate(() => document.querySelector('#cutscene .csSkip')?.click());
    await page.waitForTimeout(250);
    await page.screenshot({path:`docs/samples/battle-command-deploy-${w}.png`});
    await page.click('#fight');
    await page.waitForTimeout(1600);
    await page.evaluate(() => {window.__game.b.spells.mana=8;});
    await page.waitForTimeout(150);
    await page.screenshot({path:`docs/samples/battle-command-live-${w}.png`});
    const layout = await page.evaluate(() => {
      const box = id => { const r=document.getElementById(id).getBoundingClientRect(); return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
      return {phase:document.body.dataset.phase,top:box('top'),panel:box('panel'),bench:box('bench'),spells:[...document.querySelectorAll('.spell')].map(e=>({id:e.dataset.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),overflow:document.body.scrollWidth>innerWidth};
    });
    // The UI uses real mana and targeting handlers; arm then cancel a targeted spell.
    await page.evaluate(() => {const g=window.__game; g.sceneHold=1; g.b.spells.mana=10; g.refreshSpells();});
    await page.waitForTimeout(200);
    const targeted = page.locator('.spell[data-id="meteor"]');
    await targeted.click();
    const armed = await page.evaluate(() => window.__game.spell);
    await targeted.click();
    const cancelled = await page.evaluate(() => window.__game.spell === null);
    const card = await targeted.boundingBox();
    await page.mouse.move(card.x+card.width/2, card.y+card.height/2);
    await page.mouse.down();
    const tile = await page.evaluate(() => {
      const g=window.__game;
      for(let y=330;y<500;y+=10) for(let x=130;x<270;x+=10) if(g.spellTile(x,y)) return [x,y];
      return null;
    });
    if(!tile) throw new Error('No spell target tile');
    await page.mouse.move(...tile,{steps:8});
    const preview = await page.evaluate(() => !document.getElementById('spellGhost').hidden && !!window.__game.hover);
    await page.mouse.up();
    const cast = await page.evaluate(() => window.__game.b.spells.mana===5 && window.__game.spell===null && window.__game.b.spells.ready.meteor>window.__game.b.t);
    await targeted.screenshot({path:`docs/samples/battle-command-cooldown-${w}.png`});
    await page.locator('#heroBar .hbAuto').click();
    const auto = await page.evaluate(() => window.__game.b.autoUlt === true && document.querySelector('#heroBar .hbAuto').getAttribute('aria-pressed') === 'true');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.screenshot({path:`docs/samples/battle-command-reduced-${w}.png`});
    results.push({w,h,layout,armed,cancelled,preview,cast,auto,errors});
    await ctx.close();
  }
} finally {await browser.close();}
writeFileSync('docs/samples/battle-command-checks.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||r.layout.overflow||r.layout.phase!=='fight'||r.armed!=='meteor'||!r.cancelled||!r.preview||!r.cast||!r.auto||r.layout.spells.some(s=>s.w<44||s.h<44)))process.exitCode=1;
