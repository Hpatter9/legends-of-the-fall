// Built-game report review: real army win/loss navigation plus labelled long-report fixtures.
import {launch,boot,calamityFight} from './command-lib.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
if(process.argv[2]==='stand'){await import('./report-stand.mjs');process.exit(0);}
const browser=await launch();
const results=[];
const only=process.argv[2];
try {
  for(const [w,h] of [[393,852],[360,780],[412,915]]) {
    if(only && only!==String(w)) continue;
    const {ctx,page,errors}=await boot(browser,w,h);
    const checks=[];
    const record={w,h,checks,errors,completed:false};
    results.push(record);
    const shot=async(name,root) => {
      await page.waitForTimeout(350);
      await page.screenshot({path:`docs/samples/battle-reports-${name}-${w}.png`});
      const layout=await page.evaluate(sel=>{
        const r=document.querySelector(sel); const b=r.getBoundingClientRect();
        return {visible:!!(b.width&&b.height),overflow:r.scrollWidth>innerWidth,pageOverflow:document.body.scrollWidth>innerWidth};
      },root);
      assert.ok(layout.visible && !layout.overflow && !layout.pageOverflow,`${name} fits at ${w}: ${JSON.stringify(layout)}`);
      checks.push({name,...layout});
    };
    await page.evaluate(()=>{const g=window.__game;g.home.go(()=>g.home.hooks.onArmy('undead',0));});
    await page.locator('#ptGo').waitFor({state:'visible'}); await page.click('#ptGo');
    await page.waitForTimeout(900);
    await page.evaluate(()=>{
      const g=window.__game;
      const party=['knight','samurai','wizard','archer','cleric'];
      g.run.gold=500;g.run.roster=party.map((kind,i)=>({id:i+1,kind,grade:1,paid:5}));
      g.run.squad=party.map((_,i)=>i+1);g.run.nextId=6;g.newBattle();g.refresh();
      g.run.items=[{id:900,slot:'weapon',tier:3,name:'Royal blade',atk:.24,hp:0},{id:901,slot:'armour',tier:2,name:'Steel mail',atk:0,hp:.16}];
    });
    await page.click('#pack'); await shot('pack','#events');
    await page.click('.equipBest');
    assert.equal(await page.evaluate(()=>window.__game.run.items.length),0,'Equip best still works');
    await page.click('.evcard.pack header button');
    await page.evaluate(()=>{
      const g=window.__game;
      g.run.event={kind:'shrine',stage:1,title:'A shrine in the ruins',text:'A weathered altar offers aid before the next battle.',options:[{label:'Take the offering',text:'Gain 20 gold.',cost:0,effect:{t:'gold',n:20}},{label:'Move on',text:'Leave the shrine untouched.',cost:0,effect:{t:'leave'}}]};
      g.events.openEvent(g.run,()=>{});
    });
    await shot('event','#events');
    await page.getByRole('button',{name:/Take the offering/}).click();
    assert.equal(await page.evaluate(()=>window.__game.run.gold),520);
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.click('#fight'); await page.waitForTimeout(500);
    await page.evaluate(()=>{const g=window.__game;for(const u of g.b.units)if(u.side==='foe')u.hp=0;});
    await page.locator('#result').waitFor({state:'visible',timeout:30000});
    await page.waitForTimeout(1200);
    // (WAVE-RECAP: a won wave's short card rides over the march and goes by itself; its performance table waits for the end recap)
    await shot('wave-victory','#result');
    await page.waitForFunction(()=>document.getElementById('result').hidden&&document.body.dataset.phase==='deploy',null,{timeout:30000});
    await page.locator('#fight').waitFor({state:'visible'}); await page.click('#fight');
    await page.waitForTimeout(500);
    await page.evaluate(()=>{const g=window.__game;g.run.retries=2;for(const u of g.b.units)if(u.side==='hero'){u.hp=0;u.alive=false;}});
    await page.locator('#result').waitFor({state:'visible',timeout:60000}).catch(async e=>{writeFileSync('docs/samples/battle-reports-debug.json',JSON.stringify(await page.evaluate(()=>{const g=window.__game;return {phase:g.b.phase,retries:g.run.retries,revive:!!g.revive,hold:g.sceneHold,settled:g.settled,heroes:g.b.units.filter(u=>u.side==='hero').map(u=>({def:u.def,hp:u.hp,alive:u.alive}))};}),null,2));throw e;});
    await shot('wave-defeat','#result');
    assert.equal(await page.textContent('#next'),'Run recap');
    await page.click('#next'); await page.locator('.rcAdvice').waitFor({state:'visible'});
    await shot('loss-recap','#recap');
    await page.locator('.rcHeroes').scrollIntoViewIfNeeded();await shot('loss-company','#recap');
    await page.evaluate(()=>{document.querySelector('.rcSheet').scrollTop=99999;});
    await shot('loss-recap-end','#recap');
    await page.evaluate(()=>{document.querySelector('.rcSheet').scrollTop=0;});
    const advice=page.locator('.rcTip button').first();
    await advice.click();
    await page.waitForFunction(()=>document.getElementById('recap').hidden && !document.getElementById('home').hidden);
    checks.push({name:'real-result-recap-advice-navigation',passed:true});
    // Long successful-run fixture rendered by the actual recap view, with no reward settlement.
    await page.evaluate(()=>{
      const g=window.__game;g.run.cleared=true;g.run.over=true;
      const heroes={};const xp={};const levels={};
      for(const [i,k]of ['knight','samurai','wizard','archer','cleric','werewolf','paladin'].entries()){
        heroes[k]={dealt:15432-i*1750,healed:k==='cleric'?12640:0,taken:8420-i*500,kills:42-i*4,grade:i%3+1};xp[k]=1250+i*100;levels[k]=[29,31];
      }
      g.run.recap={fights:12,cleared:10,ms:284000,earned:12450,spent:9800,crowns:840,chests:3,heroes,xp,levels};
      g.showRunRecap();
    });
    await shot('victory-recap-fixture','#recap');
    await page.locator('.rcHeroes').scrollIntoViewIfNeeded();await shot('victory-company-fixture','#recap');
    await page.evaluate(()=>{document.querySelector('.rcSheet').scrollTop=99999;});
    await shot('victory-xp-fixture','#recap');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{document.querySelector('.rcSheet').scrollTop=0;});
    await shot('recap-reduced-fixture','#recap');
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.ok(await page.locator('.rcFoot button').isVisible());
    await page.evaluate(()=>{document.getElementById('recap').hidden=true;});
    // Tower and Calamity reports: use each real report builder with a bounded summary fixture.
    for(const cal of [false,true]) {
      await page.evaluate(cal=>{
        const g=window.__game;
        g.towerView.showSummary(g.run,{floors:18,act:3,crowns:480,bronze:2,silver:1,gold:1,gear:['Rare steel armour'],relics:4,heroes:5,newBest:true,...(cal?{maps:2,ascension:1}: {})},()=>{});
      },cal);
      await shot(cal?'calamity-summary-fixture':'tower-summary-fixture','#towerMap');
      await page.locator('.rtCard.summary > .primary').click();
      assert.equal(await page.evaluate(()=>document.getElementById('towerMap').hidden),true);
    }
    await page.evaluate(()=>{
      const g=window.__game;g.auto={army:'undead',count:3,totals:{runs:3,crowns:1260,xp:18450,chests:3,gear:2}};g.endAuto('done');
    });
    await shot('replay-summary-fixture','#autoSum');
    await page.evaluate(()=>document.getElementById('autoSum').hidden=true);
    // A real Calamity run supplies the map-recap builder's context.
    await calamityFight(page);
    await page.evaluate(()=>{
      const g=window.__game;g.run.tower.mapDone={map:1,spots:14,total:16,fights:8,elites:2,gold:420,relics:[],gear:['Rare steel armour'],heroes:['Paladin'],events:['A shrine in the ruins','The wandering merchant']};
      g.towerView.open(g.run);
    });
    await shot('calamity-map-fixture','#towerMap');
    await page.locator('.rtCard.ccCard > .primary').click();
    assert.equal(await page.evaluate(()=>window.__game.run.tower.mapDone),undefined);
    await page.evaluate(()=>window.__game.towerView.close());
    // Full-clear fixture uses the shipped victory builder and chest/gear artwork.
    await page.evaluate(()=>{
      const g=window.__game;
      g.towerView.showSummary(g.run,{floors:96,act:6,maps:6,cleared:true,crowns:4100,bronze:0,silver:0,gold:6,gear:[],relics:8,heroes:10,newBest:true,clear:{crowns:2400,stones:30,gear:{name:'Royal sword',rarity:4,base:'ironSword',level:30},title:'Calamity Breaker',newTitle:true,level:0}},()=>{});
    });
    await shot('calamity-victory-fixture','#towerMap');
    await page.evaluate(()=>{document.querySelector('.rtCard.ccCard').scrollTop=99999;});await shot('calamity-victory-end-fixture','#towerMap');
    await page.locator('.rtCard.ccCard > .primary').click();
    // Last Stand: real entry, live controls and king-fall settlement on the temporary save.
    await page.evaluate(()=>{const g=window.__game;g.meta.opened=['tower','castle'];g.openStand();});
    await page.waitForTimeout(900);
    if(await page.locator('.stPick').isVisible()){
      await page.getByRole('button',{name:'Auto fill',exact:true}).click();await page.locator('.stPick .primary').click();
    }
    await page.locator('.stStart').waitFor({state:'visible'});await shot('stand-deploy','#stand');
    await page.click('.stStart');await page.waitForTimeout(900);await shot('stand-live','#stand');
    await page.evaluate(()=>{const s=window.__game.stand.state;s.king.hp=0;s.king.alive=false;s.b.phase='lost';});
    await page.locator('.stEnd').waitFor({state:'visible',timeout:15000});await shot('stand-recap','#stand');
    await page.emulateMedia({reducedMotion:'reduce'});await shot('stand-reduced','#stand');
    await page.getByRole('button',{name:'Home',exact:true}).last().click();
    assert.equal(await page.evaluate(()=>document.getElementById('stand').hidden),true);
    assert.deepEqual(errors,[]);
    record.completed=true;
    await ctx.close();
  }
} finally {await browser.close();writeFileSync(`docs/samples/battle-reports-checks${only?'-'+only:''}.json`,JSON.stringify(results,null,2)+'\n');}
console.log(JSON.stringify(results,null,2));
