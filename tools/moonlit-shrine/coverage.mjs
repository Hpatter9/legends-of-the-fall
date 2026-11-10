// Count regional details using the same pure placement rules as the renderer.
import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
mkdirSync('out/tools', { recursive: true });
await esbuild.build({stdin:{contents:`export {buildHold} from './src/sim/assault/fieldMap'; export {MOONLIT_SHRINE} from './src/sim/assault/maps/yokai'; export {clutterOf,decalOf,materialsOf,placementsOf,MAT} from './src/render/fieldLooks';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'out/tools/moonlit-coverage.mjs',loader:{'.png':'empty','.webp':'empty'},logLevel:'warning'});
const {buildHold,MOONLIT_SHRINE:bp,clutterOf,decalOf,materialsOf,placementsOf,MAT}=await import(pathToFileURL(process.cwd()+'/out/tools/moonlit-coverage.mjs').href);
const {board:b,zone,forts}=buildHold(bp),mats=materialsOf(b,zone,bp);
const regions={},totals={groundDetailsBefore:0,groundDetailsAfter:0,decalsBefore:0,decalsAfter:0};
for(let v=0;v<b.d;v++)for(let u=0;u<b.w;u++){
 const i=v*b.w+u,key=mats[i]===MAT.shingle?'shore':String.fromCharCode(zone[i]);
 const r=regions[key]??=( {groundDetailsBefore:0,groundDetailsAfter:0,decalsBefore:0,decalsAfter:0,art:[]} );
 const old=clutterOf(b,zone,mats,u,v),now=clutterOf(b,zone,mats,u,v,'yokai');
 const od=decalOf(b,zone,mats,{...bp,army:'baseline'},u,v),nd=decalOf(b,zone,mats,bp,u,v);
 for(const [k,on]of Object.entries({groundDetailsBefore:!!old,groundDetailsAfter:!!now,decalsBefore:!!od,decalsAfter:!!nd}))if(on){r[k]++;totals[k]++;}
 if(now&&!r.art.includes(now))r.art.push(now);
}
const list=placementsOf(b,zone,bp,forts);
const report={totals,regions,wallLamps:list.filter(p=>p.name==='prop8'&&p.scale===0.6).length,wallBanners:list.filter(p=>p.name==='hangingBanner'&&p.scale===0.6).length,tentSupplies:list.filter(p=>p.low&&p.scale===0.35).length,standingPlacements:list.length};
mkdirSync('docs/samples/moonlit-shrine-detail',{recursive:true});writeFileSync('docs/samples/moonlit-shrine-detail/coverage.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({totals,wallLamps:report.wallLamps,wallBanners:report.wallBanners,tentSupplies:report.tentSupplies}));
