// Controlled preview of actual generated road cards and the shipping Events menu.
import { Events } from '../../src/events';
import { armyRun, recruit, type Run } from '../../src/sim/run';
import { drawRoad, type RoadKind } from '../../src/sim/midEvents';
import { Rng } from '../../src/sim/rng';
import { loadSheets } from '../../src/render/sheets';
import { ROAD_ART } from '../../src/roadArt';
document.getElementById('events')?.remove();
const ui=new Events();
let run:Run;
let baseline='';
const kinds=Object.keys(ROAD_ART) as RoadKind[];
(window as any).__roadArt={
 ready:loadSheets(),kinds,
 show(kind:RoadKind,poor=false){
  run=armyRun(7,'orcs',['knight','archer','wizard']);
  run.stage=5;run.gold=poor?0:500;
  const hero=recruit(run,'knight');run.squad.push(hero.id);
  run.event=drawRoad(run,5,kind,new Rng(3));
  baseline=JSON.stringify(run);
  ui.openEvent(run,()=>{});
  return run.event.options.map(o=>({label:o.label,text:o.text,cost:o.cost,disabled:!!o.done||run.gold<o.cost}));
 },
 unchanged:()=>JSON.stringify(run)===baseline,
};
