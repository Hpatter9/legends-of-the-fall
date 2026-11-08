import { levelOfKind } from '../src/sim/levels';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { addUnit, fight, hurt, place, placeBlock, startBattle, unplace, type BattleEvent } from '../src/sim/battle';
import { deployTiles, pickSquad } from '../src/sim/autoplay';
import { KITS, pierceOf } from '../src/sim/abilities';
import { HERO_KITS } from '../src/sim/heroKits';
import { loadMeta, saveMeta, setParty, startedMeta } from '../src/sim/meta';
import { canJoin, newRun, setSquad } from '../src/sim/run';
import { guestKinds } from '../src/sim/guest';
import { hireable } from '../src/sim/climb';
import { suggestParty } from '../src/sim/suggest';
import { newStandRun, pickEight } from '../src/sim/stand';
import { MYTHIC_KINDS, isMythic, validMythicSquad } from '../src/sim/mythicRules';
import { mythicBlow, mythicDamage, mythicHeroKits, rewriteFate, tickMythics } from '../src/sim/mythicCombat';
import { MYTHIC_BATTLES, MYTHIC_QUESTS } from '../src/sim/mythicQuests';
import { canOffer, handIn, noteQuests, offerTales, takeQuest } from '../src/sim/quests';
import { grantContent } from '../src/sim/contentHeroes';
import { isSecret, secretHint } from '../src/sim/secretHeroes';
import { PULL_HEROES } from '../src/sim/unlockRules';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { ARMIES } from '../src/sim/armies';
import { mayFight, notReady, questArmy } from '../src/sim/questBattles';
import { FOE_ENTRIES } from '../src/sim/codex';
import { COMBAT_SKILL_MOTIFS } from '../src/combatIconRules';
import { KIT_LOOKS, kitSignature } from '../src/render/kitLooks';
import { SIGNATURES } from '../src/render/signatures';
import { HUD_FACES } from '../src/heroFaceRules';
import { bareBoard } from './bare';
import { setModesHidden } from '../src/sim/hiddenModes';

// (the Last Stand and the Calamity are hidden in the game for now; this file tests their own rules, which stay, so it shows them: docs/notes/hide-modes.md)
setModesHidden(false);

const DAY = 20261107;
function proven() {
  const m = startedMeta(17); m.unlocked = [...ALL_HEROES.filter(k => !isMythic(k))];
  m.xp = Object.fromEntries(m.unlocked.map(k => [k, 1e12]));
  m.armies = Object.fromEntries(ARMIES.map(a => [a.id, { best: a.waves.length, won: a.waves.length, clears: 1, stars: {}, first: 31, hard: { '3': { won: a.waves.length, clears: 1 } } }]));
  m.calamity = { best: 6, clears: 4, asc: 3 };
  m.codex = { met: FOE_ENTRIES.flatMap(f => f.defs), kills: {} };
  return m;
}
function scene(kind: string) {
  const b = startBattle(7); bareBoard(b); b.units = []; b.phase = 'fight'; b.t = 1000;
  const me = addUnit(b, kind, 3, 7, { level: 30 });
  const ally = addUnit(b, 'knight', 4, 7, { level: 30 });
  const foe = addUnit(b, 'skeleton', 3, 6, { hp: 100 });
  return { b, me, ally, foe, out: [] as BattleEvent[] };
}

test('five Mythics are secret, fully equipped recruits outside random acquisition', () => {
  const m = startedMeta(3), r = newRun(7);
  r.mode = { kind: 'calamity', map: 1 } as typeof r.mode;
  for (const k of MYTHIC_KINDS) {
    assert.ok(ALL_HEROES.includes(k)); assert.ok(isSecret(m, k));
    assert.ok(!PULL_HEROES.includes(k)); assert.ok(!guestKinds(r).includes(k)); assert.ok(!hireable(r).includes(k));
    assert.equal(HERO_KITS()[k].slots.length, 3); assert.ok(KITS[k].ultimate);
    assert.ok(HUD_FACES[k]); assert.match(secretHint(k), /legends/);
    for (const suffix of ['', '-portrait']) assert.ok(existsSync(`src/art/heroes/${k}${suffix}.webp`));
    for (const suffix of ['', '_back']) assert.ok(existsSync(`src/art/units/mythic_${k}${suffix}.png`));
    for (const skill of [...HERO_KITS()[k].slots.map(s => s.skill), KITS[k].ultimate!]) {
      assert.ok(COMBAT_SKILL_MOTIFS[skill.name], skill.name);
      // (skill 1 and the ultimate have looks of their own, atlas-11; skills 2 and 3 borrow one, recoloured: docs/notes/fix-main-mythics.md)
      assert.ok(SIGNATURES[skill.name] || KIT_LOOKS[skill.name], skill.name); assert.ok(kitSignature(skill.name), skill.name);
    }
  }
});

test('manual parties, squad changes, Auto suggestions, guests and Last Stand keep one Mythic', () => {
  const m = proven(); m.unlocked.push(...MYTHIC_KINDS);
  assert.ok(!setParty(m, ['vael','astrax','knight','archer','wizard']));
  assert.ok(setParty(m, ['vael','samurai','knight','archer','wizard']));
  const r = newRun(7); r.roster = ['vael','astrax','knight','archer','wizard','cleric'].map((kind,i) => ({id:i+1,kind,grade:1})); r.squad=[];
  assert.ok(setSquad(r,1,true)); assert.ok(!canJoin(r,2)); assert.ok(!setSquad(r,2,true));
  r.roster[1].guest = true; assert.ok(!canJoin(r,2));
  assert.ok(validMythicSquad(pickSquad(r,m).map(h => h.kind)));
  assert.ok(validMythicSquad(suggestParty(m.unlocked)));
  assert.ok(validMythicSquad(suggestParty(MYTHIC_KINDS)));
  assert.ok(validMythicSquad(pickEight(m, MYTHIC_KINDS)));
  assert.equal(newStandRun(7, MYTHIC_KINDS).heroes.length,1);
});

test('placement refuses tagged and untagged second Mythics and permits moving or replacing the first', () => {
  const b = startBattle(7); const t = deployTiles(b.board);
  assert.ok(place(b,'vael',...t[0],1));
  assert.equal(placeBlock(b,'astrax',...t[1],2),'mythic'); assert.ok(!place(b,'astrax',...t[1]));
  assert.ok(place(b,'vael',...t[2],1)); assert.ok(unplace(b,'vael',1)); assert.ok(place(b,'astrax',...t[0],2));
  assert.ok(fight(b));
});

test('saves preserve earned Mythics and bench extra Mythics in a malformed party', () => {
  const m=proven(); m.unlocked.push(...MYTHIC_KINDS); m.party=['vael','astrax','knight','archer','wizard'];
  const data=new Map<string,string>(), store={setItem:(k:string,v:string)=>{data.set(k,v);},getItem:(k:string)=>data.get(k)??null};
  saveMeta(m,store); const loaded=loadMeta(4,store);
  assert.ok(validMythicSquad(loaded.party)); assert.ok(MYTHIC_KINDS.every(k => loaded.unlocked.includes(k)));
});

test('hidden chains open only for proven saves, persist each part and grant each Mythic exactly once', () => {
  const fresh=startedMeta(9); assert.equal(MYTHIC_QUESTS.length,15);
  for (const k of MYTHIC_KINDS) {
    const parts=MYTHIC_QUESTS.filter(q=>q.id.startsWith(`mythic-${k}-`));
    assert.ok(!canOffer(fresh,parts[0],DAY));
    const m=proven();
    for (let i=0;i<3;i++) {
      offerTales(m,DAY,MYTHIC_QUESTS);
      assert.deepEqual(m.quests!.offers.filter(o=>parts.some(q=>q.id===o.id)).map(o=>o.id),[parts[i].id]);
      assert.ok(takeQuest(m,parts[i].id,DAY));
      assert.ok(!handIn(m,parts[i].id,DAY));
      m.quests!.active.find(a=>a.id===parts[i].id)!.progress=parts[i].goal.n;
      assert.ok(handIn(m,parts[i].id,DAY));
      assert.equal(m.unlocked.includes(k),i===2);
    }
    assert.deepEqual(grantContent(m),[]); assert.equal(m.unlocked.filter(x=>x===k).length,1); assert.equal(levelOfKind(m,k),30);
    const recovered=proven(); recovered.quests={active:[],offers:[],done:[parts[2].id]};
    assert.deepEqual(grantContent(recovered),[k]);
  }
});

test('trial data uses valid opponents and forbids Mythics in both party and deployment checks', () => {
  for(const q of MYTHIC_BATTLES) {
    assert.ok(questArmy(q.id)); assert.ok(q.rules?.noHearts);
    for(const w of q.waves) for(const k of w.foes) assert.equal(UNITS[k]?.side,'foe',k);
    for(const k of MYTHIC_KINDS) assert.ok(!mayFight(q,k));
    assert.equal(notReady(q,[],['vael','knight'])?.kind,'mythic'); assert.equal(notReady(q,[],['knight']),null);
  }
});

test('Mythic preparation does not count waves fought with a Mythic', () => {
  const m=proven(); const q=MYTHIC_QUESTS[0]; offerTales(m,DAY,MYTHIC_QUESTS); assert.ok(takeQuest(m,q.id,DAY));
  const event={won:true,boss:false,mode:'army' as const,army:'infernal',tier:3,stage:10,waves:3,heroes:['vael','knight'],flawless:false,kills:[],dailyCleared:false};
  noteQuests(m,event); assert.equal(m.quests!.active[0].progress,0);
  noteQuests(m,{...event,heroes:['knight']}); assert.equal(m.quests!.active[0].progress,3);
});

test('Vael earns totality from six real blows and loses its armour piercing when it expires', () => {
  const {b,me,out}=scene('vael'); for(let i=0;i<6;i++) mythicBlow(b,me,out);
  assert.equal(me.mythic?.eclipse,0); assert.equal(pierceOf(me),12); assert.ok(me.shield);
  b.t+=6100; tickMythics(b,out); assert.equal(pierceOf(me),0);
});

test('Astrax consumes only active shields and spends at most three stored stars on breath', () => {
  const {b,me,foe,out}=scene('astrax'); foe.shield={hp:100,until:b.t+5000};
  const kit=mythicHeroKits().astrax;
  assert.ok(kit.s2.skill.cast(b,me,out)); assert.equal(foe.shield,undefined); assert.equal(me.mythic?.stars,1);
  assert.ok(kit.s1.skill.cast(b,me,out)); assert.equal(me.mythic?.stars,0);
});

test('Ilyra protects the living during grace, heals at its end and cannot repeat the ultimate', () => {
  const {b,me,ally,foe,out}=scene('ilyra'); ally.hp=20;
  const ult=KITS.ilyra.ultimate!; assert.ok(ult.cast(b,me,out));
  hurt(b,foe,ally,1e9,false,false,out); assert.ok(ally.alive); assert.equal(ally.hp,1);
  hurt(b,foe,me,1e9,false,false,out); assert.ok(me.alive); assert.equal(me.hp,1);
  b.t+=5000; tickMythics(b,out); assert.ok(ally.hp>1); assert.ok(!ult.cast(b,me,out));
  hurt(b,foe,ally,1e9,false,false,out); assert.ok(!ally.alive);
});

test('Orrun protects only allies within the planted sanctuary and stores actual health damage', () => {
  const {b,me,ally,foe,out}=scene('orrun'); const kit=mythicHeroKits().orrun;
  kit.s2.skill.cast(b,me,out); assert.equal(mythicDamage(b,foe,ally),.75);
  ally.u=7; ally.v=10; assert.equal(mythicDamage(b,foe,ally),1);
  me.shield=undefined; hurt(b,foe,me,50,false,false,out); assert.ok((me.mythic?.wounds??0)>0);
  assert.ok(kit.s3!.skill.cast(b,me,out)); assert.equal(me.mythic?.wounds,0);
  b.t+=8000; assert.equal(mythicDamage(b,foe,me),1);
});

test('Nyxara remembers and restores living allies without reviving, overwriting occupied tiles or refunding resources', () => {
  const {b,me,ally,foe,out}=scene('nyxara'); const old=ally.hp;
  tickMythics(b,out); ally.hp=10; ally.u=5; ally.charge=7; ally.charge2=9;
  b.t+=4000; assert.ok(rewriteFate(b,me,out)); assert.equal(ally.hp,old); assert.equal(ally.u,4); assert.equal(ally.charge,7); assert.equal(ally.charge2,9);
  ally.alive=false; ally.hp=0; assert.ok(!rewriteFate(b,me,out)); assert.equal(ally.hp,0);
  ally.alive=true; ally.hp=10; ally.u=5; foe.u=4; foe.v=7;
  assert.ok(rewriteFate(b,me,out)); assert.equal(ally.u,5); assert.equal(foe.hp,foe.maxHp);
});

test('Nyxara’s mark weakens damage only after an interrupt and only while active', () => {
  const {b,me,foe,ally,out}=scene('nyxara'); const kit=mythicHeroKits().nyxara;
  assert.ok(kit.s2.skill.cast(b,me,out)); assert.equal(mythicDamage(b,foe,ally),1);
  assert.ok(kit.s3!.skill.cast(b,me,out)); assert.equal(mythicDamage(b,foe,ally),.6);
  b.t+=7000; assert.equal(mythicDamage(b,foe,ally),1);
});

test('the offline build discovers all Mythic portraits automatically', () => {
  const build=readFileSync('build.mjs','utf8'); assert.match(build,/readdirSync\('src\/art\/heroes'\)/); assert.match(build,/HERO_ART_FILES/);
});
