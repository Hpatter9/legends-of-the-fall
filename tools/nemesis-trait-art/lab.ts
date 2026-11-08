// Controlled cards using three traits at a time, matching the simulation's trait cap.
import { meta } from '../nemesis/saves3';
import { openNemesisCard } from '../../src/nemesisView';
import { loadSheets } from '../../src/render/sheets';
import { NEMESIS_TRAIT_ICON } from '../../src/nemesisTraitArt';
import { TRAITS } from '../../src/sim/nemesisTraits';
const m=meta();
const keys=Object.keys(TRAITS);
const baseline=JSON.stringify(m);
(window as any).__traitArt={
  ready:loadSheets(),
  total:keys.length,
  covered:keys.every(k=>!!NEMESIS_TRAIT_ICON[k]),
  unique:new Set(keys.map(k=>NEMESIS_TRAIT_ICON[k])).size,
  unchanged:()=>JSON.stringify(m)===baseline,
  show(group:number,hidden=false){
    document.querySelectorAll('.omVeil').forEach(e=>e.dispatchEvent(new Event('omclose')));
    const traits=keys.slice(group*3,group*3+3);
    const n={...m.war!.members[0],traits,weak:[],known:hidden?[]:traits};
    openNemesisCard(m,n);
  },
};
