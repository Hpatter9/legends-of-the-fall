// Controlled previews of the shipping menus; never saved or included in game.js.
import { meta } from '../dynasty/saves6';
import { meta as warMeta } from '../nemesis/saves3';
import { openHouses, openLine, openSeasonCard } from '../../src/housesView';
import { openNemesisBoard, openNemesisCard } from '../../src/nemesisView';
import { NEMESIS_TRAIT_ICON } from '../../src/nemesisTraitArt';
import { loadSheets } from '../../src/render/sheets';
import { DYNASTY } from '../../src/sim/dynasty';
const m=meta();
const war=warMeta();
const date=new Date();
const day=date.getFullYear()*10000+(date.getMonth()+1)*100+date.getDate();
const known=Object.keys(NEMESIS_TRAIT_ICON);
const clean=()=>document.querySelectorAll('.omVeil').forEach(e=>e.dispatchEvent(new Event('omclose')));
// Ensure all four modelled fates can be reviewed on actual lineage rows.
for (const [i,fate] of (['mentor','regular','shade','fallen'] as const).entries()) {
  const kind=Object.keys(m.dynasty!.lines)[i];
  const line=m.dynasty!.lines[kind];
  line.bearers[line.current].fate=fate;
}
(window as any).__dynastyArt={
  ready: loadSheets(),
  houses(){clean();openHouses(m,day);},
  line(){clean();openLine(m,'knight',day);},
  season(i:number){
    clean();
    m.dynasty!.start=20260101;
    const d=new Date(2026,0,1+i*DYNASTY.SEASON_DAYS);
    openSeasonCard(m,d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(),()=>{});
  },
  council(){clean();openNemesisBoard(war,{hunt(){},save(){},day});},
  traits(group:number,hidden=false){
    clean();
    const n={...war.war!.members[0],traits:known.slice(group*3,group*3+3),weak:[],known:hidden?[]:known.slice(group*3,group*3+3)};
    openNemesisCard(war,n);
  },
};
