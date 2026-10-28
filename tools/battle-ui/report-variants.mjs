// Daily and old-save report fixtures, rendered through the game's own report methods.
import {launch,boot} from './command-lib.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await launch();const results=[];
try{
 for(const [w,h]of [[393,852],[360,780],[412,915]]){
  const {ctx,page,errors}=await boot(browser,w,h);
  for(const won of [true,false]){
   await page.evaluate(won=>{
    const g=window.__game;g.home.go(()=>{});g.sceneHold=1;
    g.run.mode={kind:'daily',date:20261028};g.run.tower=undefined;g.run.cleared=won;g.run.over=true;g.run.best=won?10:6;g.run.stage=won?11:6;g.run.retries=2;
    g.run.tally={ms:180000};g.dailyPay={counted:true};g.b.phase=won?'won':'lost';g.endWait=3000;g.settled=true;g.gain=36;g.crownGain=120;
    g.refresh();
   },won);
   const name=won?'daily-victory-fixture':'daily-defeat-fixture';
   await page.waitForTimeout(350);await page.screenshot({path:`docs/samples/battle-reports-${name}-${w}.png`});
   assert.equal(await page.evaluate(()=>document.body.scrollWidth>innerWidth),false);
   if(won)assert.ok(await page.locator('#dayResult').isVisible());
   await page.evaluate(()=>{const g=window.__game;g.run.recap=undefined;g.showRunRecap();});
   await page.screenshot({path:`docs/samples/battle-reports-daily-${won?'won':'lost'}-old-save-fixture-${w}.png`});
   assert.equal(await page.locator('.rcFig').count(),6,'old saves still have complete headline metrics');
   assert.equal(await page.evaluate(()=>document.querySelector('.rcSheet').scrollWidth>innerWidth),false);
   await page.evaluate(()=>document.getElementById('recap').hidden=true);
  }
  assert.deepEqual(errors,[]);results.push({w,h,dailyWin:true,dailyLoss:true,oldSaveEmptyRecap:true,errors});await ctx.close();
 }
}finally{await browser.close();writeFileSync('docs/samples/battle-reports-variants.json',JSON.stringify(results,null,2)+'\n');}
console.log(JSON.stringify(results));
