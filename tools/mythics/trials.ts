import { autoSpendAll } from '../../src/sim/talentAuto';
import { giveMastery } from '../skills/mastery';
import { BUILDINGS, maxLevel, type BuildingId } from '../../src/sim/castle';
import { EQUIP_LIST, EQUIP_SLOTS, equipItem, grantEquipment, callingOf } from '../../src/sim/equipment';
// Bounded reachability sample for the five new trials, without Mythic recruits.
import { writeFileSync } from 'node:fs';
import { maybeSpells, savedAt } from '../autoplay';
import { MYTHIC_BATTLES } from '../../src/sim/mythicQuests';
import { startQuestBattle } from '../../src/sim/questRun';
import { startStage, finish, summon } from '../../src/sim/run';
import { autoDeploy, pickSquad } from '../../src/sim/autoplay';
import { autoMerge } from '../../src/sim/merge';
import { fight, playOut } from '../../src/sim/battle';
const party = ['knight','samurai','archer','cleric','wizard'];
const results = [];
for (const level of [75,90]) for (const trial of MYTHIC_BATTLES) {
  let wins=0;
  const ended:number[]=[];
  for (let seed=1;seed<=3;seed++) {
    const meta=savedAt(level,party,seed);
    meta.unlocked=[...party]; meta.party=[...party];
    for (const id of Object.keys(BUILDINGS) as BuildingId[]) meta.castle[id]=maxLevel(id);
    for (const kind of party) {
      meta.shards[kind]=1e9; (meta.ranked ??= {})[kind]=5;
      for (const slot of EQUIP_SLOTS) {
        const base=EQUIP_LIST.find(b=>b.slot===slot && (!b.calling || b.calling===callingOf(kind)));
        if(base) { const item=grantEquipment(meta,{base:base.id,rarity:4,level:20}); equipItem(meta,kind,item.id); }
      }
    }
    autoSpendAll(meta,party); giveMastery(meta,party,level);
    meta.quests={active:[],offers:[],done:[],won:[trial.id]};
    const run=startQuestBattle(meta,trial.id,party)!;
    while(!run.over) {
      autoMerge(run); while(summon(run)) autoMerge(run);
      run.squad=pickSquad(run,meta).map(h=>h.id);
      const battle=startStage(run); autoDeploy(battle,run,meta); fight(battle); maybeSpells(battle,meta,meta.castle); playOut(battle);
      finish(run,battle.phase==='won');
    }
    if(run.cleared) wins++;
    ended.push(run.stage);
  }
  results.push({build:'rank 5, max castle, seven Legendary level-20 items; Auto talents and level-5 skills; Auto Steel-school king spells; no Mythics',trial:trial.id,level,wins,tries:3,ended});
}
writeFileSync('docs/samples/mythics/trials.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
