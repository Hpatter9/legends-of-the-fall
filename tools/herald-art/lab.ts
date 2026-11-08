// Fixtures call the actual shipping intro and Home codex, so no duplicate sprite caches are needed.
import { startBattle } from '../../src/sim/battle';
import { armyRun } from '../../src/sim/run';
const game=()=> (window as any).__game;
// Home visibility changes normally restart the live board ticker. These presentation-only fixtures
// swap in controlled battles, so keep the original board renderer paused for the entire check.
game().app.ticker.stop();
game().app.ticker.start=()=>game().app.ticker;
const ids=Array.from({length:6},(_,i)=>`calBoss${i+1}`);
(window as any).__heraldArt={
 ids,
 intro(id:string){
  const g=game();g.app.ticker.stop();
  if(g.intro)g.endIntro();
  document.getElementById('home')!.hidden=true;
  g.run=armyRun(7,'orcs',['knight']);g.run.stage=10;
  g.b=startBattle(7,[id]);g.introduced.clear();g.meta.bossCards=[];
  g.startIntro(true);
 },
 codex(known=true){
  const g=game();g.app.ticker.stop();if(g.intro)g.endIntro();
  g.meta.codex={met:known?ids:[],kills:{}};g.meta.bosses=known?ids:[];
  document.getElementById('home')!.hidden=false;
  g.home.openCodex();
 },
};
