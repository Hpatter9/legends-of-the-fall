// Recheck the newer castle-room Last Stand after removing the superseded report overrides.
import {launch,boot} from './command-lib.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await launch();const results=[];
try{
 for(const [w,h]of [[393,852],[360,780],[412,915]]){
  const {ctx,page,errors}=await boot(browser,w,h);
  await page.evaluate(()=>{const g=window.__game;g.meta.opened=['castle','tower'];g.home.go(()=>g.openStand());});
  await page.locator('.stPick').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Auto fill',exact:true}).click();await page.locator('.stPick .primary').click();
  await page.locator('.stStart').waitFor({state:'visible'});
  const shot=async name=>{await page.waitForTimeout(300);await page.screenshot({path:`docs/samples/battle-reports-stand-${name}-${w}.png`});const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.body.scrollWidth}));assert.ok(overflow.scroll<=overflow.width,JSON.stringify(overflow));};
  await shot('deploy');await page.click('.stStart');await page.waitForTimeout(700);await shot('live');
  const before=await page.evaluate(()=>window.__game.stand.state.b.autoUlt);
  await page.click('#stand .hbAuto');assert.notEqual(await page.evaluate(()=>window.__game.stand.state.b.autoUlt),before);
  await page.click('.stPause');await page.locator('.stResume').waitFor({state:'visible'});await shot('pause');
  await page.click('.stResume');
  await page.evaluate(()=>{const s=window.__game.stand.state;s.king.hp=0;s.king.alive=false;s.b.phase='lost';});
  await page.locator('.stEnd').waitFor({state:'visible',timeout:15000});await shot('recap');
  const style=await page.evaluate(()=>{const c=document.querySelector('.stEndCard');return {crests:c.querySelectorAll('.stCrest').length,pseudo:getComputedStyle(c,'::before').content,paddingTop:getComputedStyle(c).paddingTop};});
  assert.equal(style.crests,1);assert.equal(style.pseudo,'none');assert.equal(style.paddingTop,'30px');
  await page.emulateMedia({reducedMotion:'reduce'});await shot('reduced');
  await page.getByRole('button',{name:'Home',exact:true}).last().click();assert.equal(await page.evaluate(()=>document.getElementById('stand').hidden),true);
  assert.deepEqual(errors,[]);results.push({w,h,castleRoomHud:true,autoToggle:true,pauseResume:true,endNavigation:true,...style,errors});await ctx.close();
 }
}finally{await browser.close();writeFileSync('docs/samples/battle-reports-stand-integration.json',JSON.stringify(results,null,2)+'\n');}
console.log(JSON.stringify(results));
