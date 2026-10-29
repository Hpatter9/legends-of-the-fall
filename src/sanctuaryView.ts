// A persistent sanctuary between crossings; all choices still go through the simulation.
import type { Run } from './sim/run';
import { choices, fightSpec, spotFloor, NODE_NAMES, rowsIn, type MapNode } from './sim/tower';
import { destinationWorld, expeditionOf, SHIFT_COST, WORLDS } from './sim/sanctuary';
import { TWISTS } from './sim/twists';
import { PATRONS, pendingAltar, riftRank } from './sim/rift';
import { heroLevel } from './sim/climb';
import { formOf, UNITS } from './sim/units';
import { heroName } from './sim/heroNames';
import { hpShare } from './sim/health';
import { sheetInfo } from './render/sheets';
import { shrinkRig } from './render/smallRig';
import { settings } from './settings';
import { sanctuary, worldPicture } from './sanctuaryArt';
import { dungeonIcon } from './calMap';
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => { const e = document.createElement(tag);e.className=cls;e.textContent=text;return e; };
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
interface Hooks { enter(id: number): void; altar(): void; company(): void; pack(): void; home(): void; shift(): void }
const REWARDS = { fight:'Gold · starter growth', elite:'Relic choice · gold', boss:'Region unlocked · evolution', recruit:'Choose a free companion', shop:'Trade gold for supplies', campfire:'Recover · train · reforge', treasure:'Gold · relic or equipment', mystery:'A choice with a price or prize' };
export class SanctuaryView {
  readonly root = el('section','riftSanctuary');
  private timer = 0;
  private selected = -1;
  private travelTimer = 0;
  private active = false;
  private run!: Run;
  private preview = el('div');
  private details = el('div');
  private cards = el('div');
  private enter = el('button');
  constructor(private hooks: Hooks) {}
  mount(run: Run): HTMLElement {
    this.release();this.run=run;this.active=true;
    const t=run.tower!, r=run.rift!, e=expeditionOf(run)!;
    const offers=choices(run);
    this.selected=offers.some(n=>n.id===this.selected)?this.selected:offers[0]?.id??-1;
    this.root.replaceChildren();this.root.dataset.patron=r.patron??'dormant';this.root.dataset.region=String(t.act);
    const head=el('header','rsHead'), title=el('div');
    title.append(el('p','rsEyebrow',`CALAMITY · REGION ${t.act} / ${t.maps}`),el('h2','','The Rift Sanctuary'));
    const close=el('button','dmClose','×');close.setAttribute('aria-label','Return home');close.onclick=()=>this.hooks.home();
    const line=el('div','rsStats');line.append(el('span','',`Crossing ${Math.min(t.row+1,rowsIn(t,t.act))} / ${rowsIn(t,t.act)}`),el('span','',`Corruption ${r.corruption}`),el('b','',`${run.gold} gold`));
    head.append(title,close,line);
    const scene=el('div','rsScene');const bg=el('img','rsScenery');bg.src=sanctuary;bg.alt='An ornate sanctuary suspended in the living rift';
    this.preview=el('div','rsPortalView');
    const caption=el('p','rsPortalCaption','Choose what lies beyond');
    const party=el('div',`rsParty${run.roster.length>5?' large':''}`);
    const ordered=[...run.roster].sort((a,b)=>Number(b.id===r.starter)-Number(a.id===r.starter));
    const rigs: (()=>void)[]=[];
    ordered.slice(0,10).forEach((hero,i)=>{
      const slot=el('div',`rsHero${hero.id===r.starter?' starter':''}`);
      slot.style.setProperty('--hero-i',String(i));
      const canvas=el('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${heroName(hero.kind)}, level ${heroLevel(hero)}`);
      const info=sheetInfo(formOf(UNITS[hero.kind],hero.grade));const rig=info?shrinkRig(info,hero.id===r.starter?64:48):null;
      if(rig){canvas.width=rig.fw;canvas.height=rig.fh;rigs.push(()=>{const g=canvas.getContext('2d')!;g.clearRect(0,0,canvas.width,canvas.height);g.imageSmoothingEnabled=false;const frame=reduced()?0:Math.floor(performance.now()/170)%(rig.counts.idle??1);g.drawImage(rig.c,frame*rig.fw,0,rig.fw,rig.fh,0,0,rig.fw,rig.fh);});}
      slot.append(canvas);if(hero.id===r.starter)slot.append(el('span','',`Lv ${heroLevel(hero)} · ${Math.round(hpShare(run,hero.id)*100)}% HP`));party.append(slot);
    });
    const paint=()=>{if(!this.active)return;if(!document.hidden)rigs.forEach(f=>f());this.timer=window.setTimeout(paint,reduced()||settings().saver?250:100);};paint();
    const altar=el('button','rsAltar',pendingAltar(run)?'✦ Awaken altar':`✦ ${r.patron?PATRONS[r.patron].name:'Dormant altar'}`);altar.onclick=()=>this.hooks.altar();
    const growth=el('p','rsGrowth',`Starter evolution ${riftRank(r)} / 3 · Company ${run.roster.length}`);
    scene.append(bg,this.preview,caption,party,altar,growth);
    const fragments=el('div','rsFragments');
    e.history.slice(-5).forEach(h=>{const frag=el('span','rsFragment');frag.title=`${WORLDS[h.world].name} · completed`;frag.append(worldPicture(h.world));fragments.append(frag);});scene.append(fragments);
    const destinations=el('section','rsDestinations');
    const bar=el('div','rsDestinationBar');bar.append(el('h3','',offers[0]?.kind==='boss'?'The guardian has found you':'Beyond the portal'));
    const shift=el('button','rsShift',`Reshape · ${SHIFT_COST} gold`);shift.disabled=run.gold<SHIFT_COST||e.shiftedAt===`${t.act}:${t.row}`||offers[0]?.kind==='boss'||!!t.cur||!!pendingAltar(run);shift.onclick=()=>this.hooks.shift();bar.append(shift);
    this.cards=el('div','rsCards');this.cards.setAttribute('role','group');this.cards.setAttribute('aria-label','Choose a destination');
    offers.forEach(node=>{const world=destinationWorld(run,node.id), b=el('button','rsDestination');b.dataset.id=String(node.id);b.append(worldPicture(world),el('b','rsDestinationName',WORLDS[world].name));const kind=el('span','rsKind');kind.append(dungeonIcon(node.kind),el('span','',node.kind==='boss'?'Guardian':NODE_NAMES[node.kind]));b.append(kind);b.onclick=()=>{this.selected=node.id;this.update(node);};this.cards.append(b);});
    this.details=el('div','rsDetails');this.details.setAttribute('aria-live','polite');
    this.enter=el('button','primary rsEnter','Enter the Rift');this.enter.disabled=!offers.length||!!pendingAltar(run);this.enter.onclick=()=>this.hooks.enter(this.selected);
    const menu=el('nav','rsMenu');for(const [name,action] of [['Altar',this.hooks.altar],['Pack',this.hooks.pack],['Company',this.hooks.company]] as const){const b=el('button','',name);b.onclick=action;menu.append(b);}
    destinations.append(bar,this.cards,this.details,this.enter,menu);this.root.append(head,scene,destinations);
    if(offers.length)this.update(offers.find(n=>n.id===this.selected)??offers[0]);
    return this.root;
  }
  private update(node: MapNode):void {
    const world=destinationWorld(this.run,node.id), spec=WORLDS[world];
    this.preview.replaceChildren(worldPicture(world));
    this.cards.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{const selected=Number(b.dataset.id)===node.id;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    this.details.replaceChildren(el('b','',spec.description),el('p','',node.kind==='fight'||node.kind==='elite'||node.kind==='boss'?spec.footing:REWARDS[node.kind]),el('small','',`${REWARDS[node.kind]} · Starter grows · One crossing`));
    if (['fight','elite','boss'].includes(node.kind)) { const band=fightSpec(this.run,node.kind,spotFloor(this.run,node.id),node.twist,node.id).band;const names=[...new Set(band.map(id=>UNITS[id]?.name??id))];this.details.append(el('small','rsEnemies',`${band.length} foes · ${names.slice(0,2).join(', ')}${names.length>2?'…':''}`)); }
    if(node.twist && TWISTS[node.twist]) this.details.append(el('small','rsTwist',`${TWISTS[node.twist].name} · ${TWISTS[node.twist].text}`));
    this.enter.textContent=node.kind==='boss'?'Enter the Guardian’s Rift':'Enter the Rift';
  }
  depart(done: () => void):void {
    if(reduced()){done();return;}
    this.root.classList.add('rsDeparting');
    const veil=el('div','rsCrossing','Crossing the rift…');this.root.append(veil);
    this.travelTimer=window.setTimeout(()=>{if(!this.active)return;this.root.classList.remove('rsDeparting');veil.remove();done();},650);
  }
  release():void {this.active=false;clearTimeout(this.timer);clearTimeout(this.travelTimer);this.root.classList.remove('rsDeparting');}
}
