import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calamityRun } from '../src/sim/modes';
import { startedMeta } from '../src/sim/meta';
import { destinationBoard, destinationWorld, expeditionOf, shiftDestinations, SHIFT_COST, WORLD_IDS } from '../src/sim/sanctuary';
import { choices, enterNode, clearNode, finishTower, mapFor, sideChoices } from '../src/sim/tower';
import { chooseAltar, pendingAltar } from '../src/sim/rift';
import { loadSlot, saveSlot, startStage } from '../src/sim/run';
import { standable, tileAt, canStep } from '../src/sim/board';
import { fight, place, playOut, startBattle } from '../src/sim/battle';
import { localBoost } from '../src/sim/climb';
import { frontSpots } from '../tools/autoplay';
import { closeMapLeg, noteFightStats, noteWave, recapOf } from '../src/sim/runRecap';
const fresh = (seed=14) => calamityRun(seed,startedMeta(1),'knight');

test('new runs offer three distinct worlds and commit one crossing; alternatives cannot be farmed',()=>{
  const r=fresh(), offers=choices(r);
  assert.equal(offers.length,3);assert.equal(new Set(offers.map(n=>destinationWorld(r,n.id))).size,3);
  const selected=offers[1],world=destinationWorld(r,selected.id);
  assert.equal(enterNode(r,selected.id),true);assert.equal(choices(r).length,0);assert.equal(shiftDestinations(r),false);
  assert.equal(r.tower!.cur!.world,world);
  clearNode(r);assert.equal(r.tower!.row,1);assert.equal(r.tower!.here,-1);
  assert.equal(enterNode(r,offers[0].id),false);assert.equal(enterNode(r,selected.id),false);
  assert.equal(choices(r).length,3);assert.ok(choices(r).some(n=>n.kind==='recruit'));
  assert.equal(expeditionOf(r)!.history.length,1);clearNode(r);assert.equal(expeditionOf(r)!.history.length,1);
  assert.deepEqual(sideChoices(r),[]);
});

test('each region ends in a mandatory guardian and all three regions finish without graph detours',()=>{
  const r=fresh();let crossings=0;
  while(!r.over){
    const altar=pendingAltar(r);if(altar)assert.ok(chooseAltar(r,altar==='patron'?'ember':altar==='offering'?'fury':'together'));
    r.tower!.mapDone=undefined;
    const offers=choices(r);assert.ok(offers.length);
    assert.equal(offers.length, r.tower!.row===r.tower!.rows![r.tower!.act-1]-1?1:3);
    assert.ok(enterNode(r,offers[0].id));clearNode(r);crossings++;
    assert.ok(crossings<=21);
  }
  assert.equal(r.roster[0].grade,3);assert.ok((r.roster[0].xp??0)>0);assert.equal(crossings,21);assert.equal(r.cleared,true);assert.equal(r.tower!.bosses,3);assert.equal(expeditionOf(r)!.history.length,21);
  assert.equal(r.tower!.recaps!.length,3);assert.deepEqual(r.tower!.recaps!.map(x=>x.total),[5,6,7]);
});

test('paid reshaping is atomic, once per crossing, saved, and cannot bypass guardians or altar choices',()=>{
  const r=fresh();r.gold=100;const original=choices(r).map(n=>destinationWorld(r,n.id));
  assert.ok(shiftDestinations(r));assert.notDeepEqual(choices(r).map(n=>destinationWorld(r,n.id)),original);assert.equal(r.gold,100-SHIFT_COST);assert.equal(shiftDestinations(r),false);
  assert.equal(expeditionOf(r)!.shifts,1);assert.equal(new Set(choices(r).map(n=>destinationWorld(r,n.id))).size,3);
  const before=JSON.stringify(r);r.gold=0;assert.equal(shiftDestinations(r),false);r.gold=80;assert.equal(JSON.stringify(r),before);
  r.tower!.row=5;assert.equal(shiftDestinations(r),false);
  r.tower!.row=2;r.rift!.wins=1;assert.equal(shiftDestinations(r),false);
  assert.equal(original.length,3);
});

test('patron and corruption shape destination worlds deterministically, without changing committed worlds',()=>{
  const r=fresh();const initial=destinationWorld(r,0);r.rift!.patron='ember';assert.notEqual(destinationWorld(r,0),initial);
  const blessed=destinationWorld(r,0);r.rift!.corruption=1;assert.notEqual(destinationWorld(r,0),blessed);
  assert.ok(enterNode(r,0));const committed=r.tower!.cur!.world;r.rift!.patron='echo';assert.equal(destinationWorld(r,0),committed);
  assert.deepEqual(destinationBoard(88,'ashen'),destinationBoard(88,'ashen'));
});

test('save/reload preserves selected encounter scenery, rerolls and completed fragments',()=>{
  const r=fresh();r.gold=100;shiftDestinations(r);enterNode(r,choices(r)[0].id);
  const values:Record<string,string>={};const store={setItem:(k:string,v:string)=>{values[k]=v;},getItem:(k:string)=>values[k]??null};
  saveSlot(r,store);const restored=loadSlot('calamity',store)!;assert.deepEqual(restored,JSON.parse(JSON.stringify(r)));
  assert.deepEqual(startStage(restored).board,startStage(r).board);assert.equal(startStage(restored).board.riftWorld,restored.tower!.cur!.world);
  assert.equal(startStage(restored).units.filter(u=>u.side==='foe').length,restored.tower!.cur!.fight!.band.length);
  clearNode(restored);saveSlot(restored,store);assert.deepEqual(loadSlot('calamity',store)!.rift!.expedition,restored.rift!.expedition);
  const legacy=fresh();delete legacy.rift!.expedition;legacy.tower!.map=mapFor(legacy,1);assert.equal(expeditionOf(legacy),undefined);
  enterNode(legacy,choices(legacy)[0].id);assert.equal(legacy.tower!.cur!.world,undefined);
});

test('all six arenas have connected courts, full deployment space, defined scenery, landmarks and arrival portals',()=>{
  const signatures=new Set<string>();
  for(const world of WORLD_IDS)for(const seed of [1,14,99]){
    const b=destinationBoard(seed,world), open=b.tiles.map((t,i)=>standable(t)?i:-1).filter(i=>i>=0);
    const seen=new Set([open[0]]),queue=[open[0]];
    while(queue.length){const i=queue.shift()!,u=i%b.w,v=Math.floor(i/b.w);for(const [du,dv]of [[1,0],[-1,0],[0,1],[0,-1]]){const to=tileAt(b,u+du,v+dv),j=(v+dv)*b.w+u+du;if(to&&canStep(b.tiles[i],to,1)!==null&&!seen.has(j)){seen.add(j);queue.push(j);}}}
    assert.equal(seen.size,open.length,world);assert.ok(b.tiles.filter(t=>t.scene).length>50);
    for(let v=b.d-3;v<b.d;v++)assert.ok(b.tiles.slice(v*b.w,(v+1)*b.w).filter(standable).length>=10);
    assert.ok(b.pieces!.some(p=>p.kind==='riftPortal'));assert.ok(b.pieces!.length>=6);
    if(seed===1)signatures.add(JSON.stringify(b.tiles.map(t=>[t.scene,t.ground,t.paved])));
  }
  assert.equal(signatures.size,6);
});

test('a real portal battle settles once, grows the starter and returns to the next crossing',()=>{
  const r=fresh();assert.ok(enterNode(r,choices(r)[0].id));r.tower!.cur!.fight!.stage.foes={hp:.01,atk:.01};
  const b=startStage(r),spots=frontSpots(b);const h=r.roster[0];assert.ok(place(b,h.kind,...spots[0],h.id,localBoost(h)));fight(b);playOut(b);assert.equal(b.phase,'won');
  finishTower(r,b,true);assert.equal(r.tower!.row,1);assert.equal(r.rift!.wins,1);assert.equal(pendingAltar(r),'patron');
  const gold=r.gold;finishTower(r,b,true);assert.equal(r.gold,gold);assert.equal(expeditionOf(r)!.history.length,1);
});


test('arena scenery never drops a large enemy band and support crossings strengthen the starter',()=>{
  for(const world of WORLD_IDS){const band=Array.from({length:13},(_,i)=>i%2?'boneArcher':'skeleton');const b=startBattle(5,band,{board:destinationBoard(5,world)});assert.equal(b.units.length,13,world);assert.ok(b.units.every(u=>standable(tileAt(b.board,u.u,u.v))));}
  const r=fresh();enterNode(r,choices(r)[0].id);clearNode(r);const xp=r.roster[0].xp??0;
  const recruit=choices(r).find(n=>n.kind==='recruit')!;enterNode(r,recruit.id);clearNode(r);assert.ok((r.roster[0].xp??0)>xp);
});

test('each region recap carries its own share of the run recap: its fights and heroes (WAVE-RECAP-2 on expeditions)',()=>{
  const r=fresh();const perRegion=[0,0,0];
  while(!r.over){
    const altar=pendingAltar(r);if(altar)chooseAltar(r,altar==='patron'?'ember':altar==='offering'?'fury':'together');
    r.tower!.mapDone=undefined;
    const node=choices(r)[0];const act=r.tower!.act;assert.ok(enterNode(r,node.id));
    const fought=!!r.tower!.cur!.fight;clearNode(r);
    // (as the page does after each settled fight: the fight's line and the heroes' work, then the region closes its share)
    if(fought){perRegion[act-1]++;noteFightStats(r,[{id:1,kind:'knight',dealt:10,taken:2,healed:0,kills:1}],1000,true);noteWave(r,{wave:recapOf(r).fights,won:true,stars:3,ms:1000});}
    closeMapLeg(r);
    if(node.kind==='boss'){const done=r.tower!.recaps!.at(-1)!;assert.equal(done.map,act);assert.equal(done.detail!.fights,perRegion[act-1],`region ${act}'s fights`);assert.equal(done.detail!.heroes.knight.dealt,10*perRegion[act-1]);}
  }
  assert.equal(r.tower!.recaps!.length,3);assert.ok(r.tower!.recaps!.every(x=>x.detail));
  assert.equal(perRegion.reduce((a,b)=>a+b),recapOf(r).fights);
});
