// Scroll long Calamity victory cards to the true end; the sticky action must not cover the final facts.
import {launch,boot} from './command-lib.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await launch();const results=[];
try{
 for(const [w,h]of [[393,852],[360,780],[412,915]]){
  const {ctx,page,errors}=await boot(browser,w,h);
  await page.evaluate(()=>{
   const g=window.__game;
   g.towerView.showSummary(g.run,{floors:96,act:6,maps:6,cleared:true,crowns:4100,bronze:0,silver:0,gold:6,gear:[],relics:8,heroes:10,newBest:true,clear:{crowns:2400,stones:30,gear:{name:'Royal sword',rarity:4,base:'ironSword',level:30},title:'Calamity Breaker',newTitle:true,level:0}},()=>{});
  });
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1100);
  await page.evaluate(()=>document.querySelector('.rtCard.ccCard').scrollTop=99999);
  const end=await page.evaluate(()=>{
   const c=document.querySelector('.rtCard.ccCard');const last=c.querySelector('.ccStats .ccRow:last-child').getBoundingClientRect();const b=c.querySelector(':scope > .primary').getBoundingClientRect();
   return {scroll:c.scrollTop,scrollMax:c.scrollHeight-c.clientHeight,lastFactAboveAction:last.bottom<=b.top,buttonVisible:b.bottom<=innerHeight};
  });
  assert.ok((end.scrollMax===0 || end.scroll===end.scrollMax) && end.lastFactAboveAction && end.buttonVisible,JSON.stringify(end));
  await page.screenshot({path:`docs/samples/battle-reports-calamity-victory-end-fixture-${w}.png`});
  await page.locator('.rtCard.ccCard > .primary').click();assert.deepEqual(errors,[]);results.push({w,h,...end,errors});await ctx.close();
 }
}finally{await browser.close();writeFileSync('docs/samples/battle-reports-scroll.json',JSON.stringify(results,null,2)+'\n');}
console.log(JSON.stringify(results));
