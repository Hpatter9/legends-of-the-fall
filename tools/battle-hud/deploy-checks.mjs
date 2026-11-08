// Exercises preparation controls with a labelled duplicate/bench fixture, then
// verifies the real combat icon functions and offline files at phone sizes.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
let built = false;
export async function checkDeployment(page, { prefix, w }) {
  if (!built) {
    mkdirSync('out/shots', { recursive: true });
    await build({ entryPoints: ['tools/painted-combat/deploy-fixtures.ts'], bundle: true, format: 'iife', globalName: 'DeployReview', platform: 'browser', outfile: 'out/shots/deploy-fixtures.js', loader: { '.png': 'dataurl', '.webp': 'dataurl' }, logLevel: 'error' });
    built = true;
  }
  await page.addScriptTag({ path: 'out/shots/deploy-fixtures.js' });
  const checks = [];
  const check = (name, ok) => { assert.ok(ok, name); checks.push(name); };
  const shot = async (name) => {
    await page.waitForTimeout(180);
    check(`${name}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `docs/samples/${prefix}-${name}-${w}.png` });
  };
  check('locked deployment helpers stay hidden', await page.locator('#buttons button[hidden]').evaluateAll(es=>es.every(e=>getComputedStyle(e).display==='none')));
  await page.evaluate(() => {
    const g = window.__game, m = g.meta;
    m.scenes = [...new Set([...(m.scenes ?? []), 'calamityOpens'])];
    m.featuresTold = ['autoMerge', 'autoPlace'];
    for (const i of [1,3]) m.armies[DeployReview.ARMIES[i].id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: {} };
    const r = JSON.parse(JSON.stringify(g.run));
    r.gold = 500; r.squad = []; r.over = false; r.cleared = false; r.stage = 3;
    r.roster = ['knight','knight','archer','wizard','cleric'].map((kind,i)=>({id:100+i,kind,grade:i===3?2:1,paid:30}));
    r.nextId = 105;
    g.startRun(r);
  });
  await shot('bench-fixture');
  check('deployment panel painted', await page.locator('#panel').evaluate((e)=>getComputedStyle(e).borderImageSource.includes('combat-panel.png')));
  check('Fight disabled before placement', await page.locator('#fight').isDisabled());
  check('deployment buttons have 44px targets', await page.locator('#buttons button').evaluateAll((es)=>es.filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44)));
  check('Auto merge has a 44px target', await page.locator('#mergeAll').evaluate(e=>e.getBoundingClientRect().height>=44));
  await page.locator('#summon').focus();
  await page.keyboard.press('Tab');
  check('keyboard focus remains visible on deployment controls', await page.locator('#pack').evaluate(e=>e===document.activeElement&&getComputedStyle(e).outlineStyle!=='none'));
  await page.locator('#bench .card[data-id="103"]').click();
  check('bench selection visible', await page.locator('#bench .card[data-id="103"]').evaluate(e=>e.classList.contains('chosen')));
  await shot('selected-fixture');
  const beforeRecycle = await page.evaluate(()=>({n:window.__game.run.roster.length,gold:window.__game.run.gold}));
  await page.locator('#bench .card[data-id="103"] .recycle').click();
  check('higher-rank recycle asks before removal', await page.evaluate(()=>window.__game.run.roster.length)===beforeRecycle.n);
  check('recycle confirm visible', await page.locator('#bench .card[data-id="103"] .recycle').evaluate(e=>e.classList.contains('sure')));
  await page.locator('#bench .card[data-id="103"] .recycle').click();
  check('confirmed recycle returns gold', await page.evaluate(()=>window.__game.run.gold)>beforeRecycle.gold);
  check('confirmed recycle removes only selected hero', await page.evaluate(()=>window.__game.run.roster.length)===beforeRecycle.n-1);
  const n = await page.evaluate(()=>window.__game.run.roster.length);
  await page.locator('#summon').click();
  await page.waitForFunction(n=>window.__game.run.roster.length>n,n,{timeout:10000});
  check('Hire still adds a hero', true);
  const beforeMerge = await page.evaluate(()=>window.__game.run.roster.length);
  await page.locator('#mergeAll').click();
  check('Auto merge resolves a real pair', await page.evaluate(()=>window.__game.run.roster.length)<beforeMerge);
  check('merged knight keeps increased rank', await page.evaluate(()=>window.__game.run.roster.some(h=>h.kind==='knight'&&h.grade>=2)));
  await page.locator('#auto').click();
  check('Auto place fields heroes', await page.evaluate(()=>window.__game.b.units.some(u=>u.side==='hero'&&u.alive)));
  check('Fight enabled with a fielded hero', await page.locator('#fight').isEnabled());
  await shot('placed');
  check('battle synergies use painted badges', await page.locator('#traits .trait .thead').evaluateAll(es=>es.length>0&&es.every(e=>e.querySelector('img.battleTraitIcon'))));
  await page.locator('#pack').tap();
  check('Pack opens', await page.locator('#events').isVisible());
  await page.locator('#events header button').click();
  await page.locator('#formBtn').click();
  check('Formation opens', await page.locator('#tacticSheet').isVisible());
  await page.locator('#tacticSheet .tacClose').click();
  // Drag a real fielded hero back into the broad bench return area.
  const from = await page.evaluate(()=>{
    const g=window.__game, heroes=g.b.units.filter(u=>u.side==='hero'&&u.alive&&u.tag!==undefined);
    for(const u of heroes){
      const s=g.sprites.get(u.id);
      if(!s)continue;
      const p=g.toClient(s.x,s.y-s.tall*.4);
      if(g.heroAtScreen(p.x,p.y)===String(u.tag))return {tag:String(u.tag),n:heroes.length,p};
    }
    return null;
  });
  check('fielded hero has a projected pointer target', !!from);
  const panel = await page.locator('#panel').boundingBox();
  await page.mouse.move(from.p.x,from.p.y);
  await page.mouse.down();
  check('pointer picks up the placed hero', await page.evaluate(()=>window.__game.drag?.id)===from.tag);
  await page.mouse.move(w*.65,panel.y+20,{steps:12});
  await page.mouse.up();
  await page.waitForTimeout(250);
  check('dragging to bench returns the hero', await page.evaluate(()=>window.__game.b.units.filter(u=>u.side==='hero'&&u.alive).length)<from.n);
  await shot('returned-to-bench');
  await page.locator('#auto').click();
  await page.locator('#fight').click();
  await page.waitForFunction(()=>window.__game.b.phase==='fight');
  await page.evaluate(()=>{window.__game.sceneHold=1;window.__game.b.spells.mana=10;for(const id of Object.keys(window.__game.b.spells.ready))window.__game.b.spells.ready[id]=0;window.__game.refreshSpells();});
  await shot('combat');
  check('normal hero chips use painted icons', await page.locator('#fightHud .fhIcon').evaluateAll(es=>es.length>0&&es.every(e=>e.tagName==='IMG'&&e.classList.contains('fhPaintedIcon'))));
  await page.locator('#fightHud .fhChip').first().click();
  await shot('skill');
  await page.locator('.fhSheet:not([hidden]) [data-tab="ult"]').click();
  check('ultimate uses painted icon', await page.locator('.fhSheet:not([hidden]) .fsHead .fhPaintedIcon').count()===1);
  await page.locator('.fhSheet:not([hidden]) .fsClose').click();
  await page.locator('#hudSpells .spell:is([data-id="shield"],[data-id="heal"],[data-id="meteor"])').first().click();
  check('painted king spell still arms', await page.locator('#hudSpells .spell.armed').count()===1);
  await page.locator('#hudSpells .spell.armed').click();
  check('painted king spell still cancels', await page.locator('#hudSpells .spell.armed').count()===0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await shot('reduced');
  await page.evaluate(()=>{
    const root=document.createElement('main');root.id='iconReview';
    root.style.cssText='position:fixed;inset:0;z-index:20000;background:#101810;color:#f5e6c7;padding:12px;overflow:auto;box-sizing:border-box;font:13px sans-serif';
    root.innerHTML='<h2 style="font:20px Georgia;margin:4px 0 12px">Painted icon review · fixture</h2>';
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px';
    for(const [id,src]of Object.entries(DeployReview.COMBAT_ART)){
      const cell=document.createElement('div');cell.style.cssText='text-align:center;min-width:0';
      const img=document.createElement('img');img.src=src;img.width=36;img.height=36;img.style.objectFit='contain';
      const label=document.createElement('div');label.textContent=id;label.style.cssText='font-size:10px;overflow-wrap:anywhere';
      cell.append(img,label);grid.append(cell);
    }
    root.append(grid);
    const spells=document.createElement('section');spells.innerHTML='<h3>King spells · all equipped states</h3>';
    for(const id of DeployReview.SPELL_IDS){const box=document.createElement('span');box.style.cssText='display:inline-flex;flex-direction:column;align-items:center;width:60px;font-size:10px';box.innerHTML=DeployReview.spellIconHtml(id);box.append(document.createTextNode(id));spells.append(box);}
    root.append(spells);
    const notes=document.createElement('section');notes.id='noteReview';
    DeployReview.drawWaveNotes(notes,['level','ult','drop','found','fell','heart','horn','quest','learned','skill','study','wear','guest','pack','nemesis'].map(kind=>({kind,text:`${kind}: retained report text`})));root.append(notes);
    document.body.append(root);
    return Promise.all([...root.querySelectorAll('img')].map(i=>i.decode()));
  });
  check('all 76 painted motifs decode', await page.locator('#iconReview > div img').evaluateAll(es=>es.length===76&&es.every(i=>i.naturalWidth>0)));
  check('every wave-note mark is a painted image', await page.locator('#noteReview .wn').evaluateAll(es=>es.length===15&&es.every(e=>e.querySelector('.battleNoteIcon')?.tagName==='IMG')));
  await shot('motif-gallery-fixture');
  await page.locator('#iconReview').evaluate(e=>{e.scrollTop=e.scrollHeight;});
  await shot('king-gallery-fixture');
  const mapped = await page.evaluate(()=>DeployReview.skills.map(s=>({name:s.name,src:DeployReview.combatSkillSource(s)})));
  check('all 220 current skill names resolve a painting', mapped.length===220&&mapped.every(s=>s.src?.startsWith('data:image/')));
  await page.locator('#iconReview').evaluate(e=>e.remove());
  if(w===393){
    await page.waitForFunction(async()=>{for(const key of await caches.keys())if(await(await caches.open(key)).match('ui/combat-icon-blood.png'))return true;return false;},null,{timeout:120000});
    const ids=await page.evaluate(()=>Object.keys(DeployReview.COMBAT_ART));
    check('every new motif is precached',await page.evaluate(async(ids)=>{
      for(const key of await caches.keys()){
        const c=await caches.open(key);
        const files=await Promise.all(ids.map(id=>c.match(`ui/combat-icon-${id}.png`)));
        if(files.every(Boolean))return true;
      }
      return false;
    },ids));
    await page.reload({waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>navigator.serviceWorker.controller&&window.__game?.home,null,{timeout:90000});
    await page.context().setOffline(true);
    try{check('new control and skill paintings load offline',await page.evaluate(async()=>{const r=await Promise.all(['formation','bag','blood','phoenix'].map(id=>fetch(`ui/combat-icon-${id}.png`)));return r.every(x=>x.ok);}));}
    finally{await page.context().setOffline(false);}
  }
  writeFileSync(`docs/samples/${prefix}-checks-${w}.json`,JSON.stringify({width:w,checks},null,2)+'\n');
  console.log('deployment/icon checks',w,checks.length,'passed');
}
