// Original army UI smoke plus the large-field renderer's real bake path (a rendering fixture, not a Stand playthrough).
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { openBrowser } from './browser.mjs';
const host=await openBrowser(process.argv[2]??'out/web');
try {
 const page=await host.browser.newPage({viewport:{width:393,height:852}});page.setDefaultNavigationTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(host.url+'/?seed=7');await page.waitForFunction(()=>window.__game,{}, {timeout:90000});
 await page.evaluate(()=>{document.querySelector('#tipSkip')?.click();window.__game.endIntro();});
 await page.locator('#summon').click();await page.locator('#summon').click();await page.locator('#auto').click();await page.locator('#fight').click();
 await page.waitForFunction(()=>window.__game.b.t>=1000,{}, {timeout:30000});
 const result=await page.evaluate(()=>{
  const g=window.__game,v=g.boardView,board=g.b.board,leases=v.columnStats.leases;
  const field={...board,w:24,d:24,landmark:undefined,landmarkAt:undefined,tiles:Array.from({length:576},(_,i)=>({...board.tiles[i%board.tiles.length]}))};
  let texturePixels;
  try {const sprite=v.bakeField(field);texturePixels=sprite.texture.source.pixelWidth*sprite.texture.source.pixelHeight;sprite.destroy({texture:true,textureSource:true});}
  finally {v.board=board;}
  if(v.columnStats.leases!==leases)throw new Error('large-field bake leaked leases');
  for(const lease of v.built.tex)if(lease.value.destroyed||lease.value.source.destroyed)throw new Error('large-field bake destroyed an active source');
  return {standardArmy:{w:board.w,d:board.d,t:g.b.t,scenario:g.run.mode.scenario??null},largeFieldFixture:{w:24,d:24,texturePixels,activeLeasesBefore:leases,activeLeasesAfter:v.columnStats.leases},cache:v.columnStats};
 });
 assert.equal(result.standardArmy.w,8);assert.equal(result.standardArmy.d,11);assert.equal(result.standardArmy.scenario,null);assert.ok(result.largeFieldFixture.texturePixels>0);assert.deepEqual(errors,[]);
 writeFileSync('docs/samples/world-126-compatibility.json',JSON.stringify({...result,errors},null,2)+'\n');console.log(JSON.stringify(result));
} finally {await host.close();}
