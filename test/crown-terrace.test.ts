import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { newMeta } from '../src/sim/meta';
import { BUILDING_IDS, ROOM_BUILDING_IDS, siteTop, startBuild, settleWorks } from '../src/sim/castle';
import { RULERS } from '../src/rulerRules';
import { ALL_HEROES } from '../src/sim/units';
import { RULER_COURTS, TERRACE_LANDMARKS, courtGuardKinds, changeCourtGuard, landmarkState } from '../src/crownTerrace';

test('every ruler has a distinct complete court painting and every site has three landmark stages', () => {
  assert.deepEqual(Object.keys(RULER_COURTS).sort(), RULERS.map(r=>r.id).sort());
  assert.equal(new Set(Object.values(RULER_COURTS).map(t=>t.name)).size,8);
  assert.deepEqual(TERRACE_LANDMARKS.map(p=>p.id).sort(),[...BUILDING_IDS,...ROOM_BUILDING_IDS,'chapel'].sort());
  for (const name of [...RULERS.flatMap(r=>[r.id,`ruler-${r.id}`]),...ALL_HEROES.map(k=>`hero-${k}`),...Array.from({length:8},(_,i)=>`duchess-${i}`),...TERRACE_LANDMARKS.flatMap(p=>[1,2,3].map(s=>`${p.id}-${s}`)),'works-1','works-2','works-3']) {
    const path = `src/art/crown-terrace/${name}.webp`;
    assert.ok(existsSync(path),path);
    assert.equal(readFileSync(path).subarray(8,12).toString(),'WEBP',path);
  }
});

test('each completed level grows its own landmark; unfinished work never grants the target level', () => {
  const meta = newMeta(7); meta.crowns=10000;
  assert.equal(landmarkState(meta,'treasury').stage,0);
  assert.ok(startBuild(meta,'treasury',0));
  assert.deepEqual(landmarkState(meta,'treasury'),{level:0,stage:0,scale:0,working:true});
  assert.equal(landmarkState(meta,'barracks').working,false);
  settleWorks(meta,meta.works!.doneAt);
  assert.equal(landmarkState(meta,'treasury').level,1);
  assert.equal(landmarkState(meta,'treasury').working,false);
  for (const {id} of TERRACE_LANDMARKS) {
    meta.chapel=false;
    let previous=0;
    for (let level=1;level<=siteTop(id);level++) {
      meta.castle[id]=level;
      const state=landmarkState(meta,id);
      assert.equal(state.level,level,id);
      assert.ok(state.scale>previous,`${id} level ${level} grows`);
      previous=state.scale;
    }
    assert.equal(landmarkState(meta,id).stage,3,id);
  }
});

test('old Chapel ownership appears in the kingdom and ruler changes cannot change its state', () => {
  const meta=newMeta(1); meta.chapel=true;
  assert.equal(landmarkState(meta,'chapel').level,1);
  const before=JSON.stringify(meta);
  for (const ruler of RULERS) { assert.ok(RULER_COURTS[ruler.id]); landmarkState(meta,'chapel'); }
  assert.equal(JSON.stringify(meta),before);
});

test('court selection rejects unowned, duplicate and malformed preferences without inventing heroes', () => {
  const owned=['knight','archer','wizard','samurai','cleric'];
  assert.deepEqual(courtGuardKinds(owned,['wizard','unknown','wizard',2],['knight','archer','samurai']),['wizard','knight','archer','samurai']);
  assert.deepEqual(courtGuardKinds(['cleric'],undefined,['knight']),['cleric']);
  assert.deepEqual(courtGuardKinds([],['knight'],['knight']),[]);
  assert.deepEqual(courtGuardKinds(owned,null,['cleric','archer','wizard','knight']),['cleric','archer','wizard','knight']);
});

test('changing a companion swaps occupied places and leaves the battle party untouched', () => {
  const meta=newMeta(1); meta.party=['knight','archer'];
  const current=['knight','archer','wizard','samurai'];
  assert.deepEqual(changeCourtGuard(current,0,'wizard'),['wizard','archer','knight','samurai']);
  assert.deepEqual(changeCourtGuard(current,3,'cleric'),['knight','archer','wizard','cleric']);
  assert.deepEqual(current,['knight','archer','wizard','samurai']);
  assert.deepEqual(meta.party,['knight','archer']);
});
