// Controlled previews of the shipping menus; never saved or included in game.js. (REMOVE-DYNASTY: only the Council's board and the
// Nemesis traits are left; the Houses went with the Dynasties.)
import { meta as warMeta } from '../nemesis/saves3';
import { openNemesisBoard, openNemesisCard } from '../../src/nemesisView';
import { NEMESIS_TRAIT_ICON } from '../../src/nemesisTraitArt';
import { loadSheets } from '../../src/render/sheets';
const war=warMeta();
const date=new Date();
const day=date.getFullYear()*10000+(date.getMonth()+1)*100+date.getDate();
const known=Object.keys(NEMESIS_TRAIT_ICON);
const clean=()=>document.querySelectorAll('.omVeil').forEach(e=>e.dispatchEvent(new Event('omclose')));
(window as any).__dynastyArt={
  ready: loadSheets(),
  council(){clean();openNemesisBoard(war,{hunt(){},save(){},day});},
  traits(group:number,hidden=false){
    clean();
    const n={...war.war!.members[0],traits:known.slice(group*3,group*3+3),weak:[],known:hidden?[]:known.slice(group*3,group*3+3)};
    openNemesisCard(war,n);
  },
};
