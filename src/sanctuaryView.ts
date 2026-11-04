// A persistent sanctuary between crossings; all choices still go through the simulation.
// The room is alive (CALAMITY-HUB, `docs/notes/calamity-hub.md`): the crossing's rifts stand on a ring in front of the great
// gate, each showing its world in its swirl; picking one turns the ring so it stands in the middle while the room slides
// behind it. Entering walks the party up and into it, and the rift flares into a bloom that fills the screen and fades off
// the battle. Back from a crossing, the party steps out of the rift it went in by while the cards rise one by one.
// The numbers are in `hubMotion.ts`; one animation frame loop draws everything, and stops when the room is left.
import type { Run } from './sim/run';
import { choices, fightSpec, spotFloor, NODE_NAMES, rowsIn, type MapNode } from './sim/tower';
import { destinationWorld, expeditionOf, SHIFT_COST, WORLDS, type RiftWorld } from './sim/sanctuary';
import { TWISTS } from './sim/twists';
import { pendingAltar } from './sim/rift';
import { altarButtonLine, altarSummary, starterLine, stepLabel, STEPS } from './sim/altarWords';
import { heroLevel } from './sim/climb';
import { formOf, UNITS } from './sim/units';
import { heroName } from './sim/heroNames';
import { hpShare } from './sim/health';
import { sheetInfo } from './render/sheets';
import { shrinkRig, type Small } from './render/smallRig';
import { play } from './render/sound';
import { settings } from './settings';
import { sanctuary, worldPicture } from './sanctuaryArt';
import { dungeonIcon } from './calMap';
import portalUrl from './art/calmap-dungeon/arrival-portal.webp';
import swirlUrl from './art/calmap/portal.png';
import mistUrl from './art/calmap/nebula_2.png';
import sparkUrl from './art/fx/vfx/sparkle_white.png';
import goldUrl from './art/fx/vfx/sparkle_light.png';
import {
  cardRise, coverPoint, easeInOut, exitIndex, fadeAt, homeIndex, isReturn, nearestTurn, PARALLAX, riftSpot, roomPan, SPOTS,
  walkInFrame, walkInPlan, walkOutFrame, walkOutTotal, WALK_IN, type Entered, type WalkInPlan,
} from './hubMotion';
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => { const e = document.createElement(tag);e.className=cls;e.textContent=text;return e; };
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The room's clock: the page's own, unless a check holds it still to take frames (`window.__hubTime`, `tools/calamity/hub-shots.mjs`). */
const clock = (): number => { const t = (window as { __hubTime?: number }).__hubTime; return typeof t === 'number' ? t : performance.now(); };
interface Hooks { enter(id: number): void; altar(): void; company(): void; pack(): void; home(): void; shift(): void }
const REWARDS = { fight:'Gold · starter growth', elite:'Relic choice · gold', boss:'Region unlocked · evolution', recruit:'Choose a free companion', shop:'Trade gold for supplies', campfire:'Recover · train · reforge', treasure:'Gold · relic or equipment', mystery:'A choice with a price or prize' };
/** Each world's light: its rift's glow, its card's edge and the motes that drift out of it. */
export const WORLD_GLOW: Record<RiftWorld, string> = { ashen: '#ff8a4c', rootbound: '#7ee08c', caravan: '#f3c56b', prism: '#bb8cff', hollow: '#9fd6ff', frost: '#c8f4ff' };
const LIGHT_HUE = { violet: '#c78bff', green: '#5cf0b8' } as const;
/** The room's width against the scene's: the slack the room slides in. */
const ROOM_W = 1.16;
/** The portal picture's size, and its swirl (the share of it the world shows through). */
const PORTAL = { w: 1312, h: 1199, swirlY: 0.47 };

/** The rift the party walked into, kept while the page is open, so the return comes out of the same one. */
let entered: Entered | null = null;

/** The pack's sparkle and dust strips (six frames of 32 px), loaded once, and tinted copies by colour. */
const strips: Record<string, HTMLImageElement> = {};
const tinted = new Map<string, HTMLCanvasElement>();
function strip(url: string): HTMLImageElement { return (strips[url] ??= Object.assign(new Image(), { src: url })); }
function tint(url: string, colour: string): HTMLCanvasElement | HTMLImageElement | null {
  const img = strip(url);
  if (!img.complete || !img.naturalWidth) return null;
  const key = `${url}|${colour}`;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement('canvas');c.width = img.naturalWidth;c.height = img.naturalHeight;
    const g = c.getContext('2d')!;g.drawImage(img, 0, 0);g.globalCompositeOperation = 'source-atop';g.globalAlpha = 0.65;g.fillStyle = colour;g.fillRect(0, 0, c.width, c.height);
    tinted.set(key, c);
  }
  return c;
}
interface Mote { x: number; y: number; vx: number; vy: number; age: number; life: number; src: string; colour: string; size: number }
interface Hero { canvas: HTMLCanvasElement; rig: Small | null; phase: number }
type Cine =
  | { kind: 'in'; t0: number; plan: WalkInPlan; from: number; to: number; done: () => void; peaked: boolean; flash: HTMLElement; colour: string }
  | { kind: 'out'; t0: number; total: number; world: RiftWorld; index: number };

export class SanctuaryView {
  readonly root = el('section','riftSanctuary');
  private frame = 0;
  private selected = -1;
  private active = false;
  private run!: Run;
  private preview = el('div');
  private details = el('div');
  private cards = el('div');
  private enter = el('button');
  // (the living room)
  private offers: MapNode[] = [];
  private worlds: RiftWorld[] = [];
  private scene = el('div');
  private stage = el('div');
  private room = el('div');
  private mist = el('img');
  private ring = el('div');
  private rifts: HTMLButtonElement[] = [];
  private motes = el('canvas');
  private party = el('div');
  private heroes: Hero[] = [];
  private bloom = el('div');
  private sel = 0;
  private turn = 0;
  private turnFrom = 0;
  private turnTo = 0;
  private turnAt = 0;
  private turnMs = 0;
  private W = 0;
  private H = 0;
  private last = 0;
  private drawn = 0;
  private sparks: Mote[] = [];
  private cine: Cine | null = null;
  /** A tap during a walk skips it (and is not also a tap on what is under it). */
  private eaten = 0;
  private skip = (e: Event) => { if (!this.cine) return; e.stopPropagation();this.eaten = clock();this.settle(); };
  private eat = (e: Event) => { if (clock() - this.eaten < 600) { e.stopPropagation();e.preventDefault(); } };
  constructor(private hooks: Hooks) {}
  mount(run: Run): HTMLElement {
    this.release();this.run=run;this.active=true;
    const t=run.tower!, r=run.rift!, e=expeditionOf(run)!;
    const offers=choices(run);
    this.offers=offers;this.worlds=offers.map(n=>destinationWorld(run,n.id));
    // (back from a crossing: the party comes out of the rift it went in by, which is in the middle)
    const back=entered&&isReturn(entered,run.seed,e.history.length)?entered:null;
    if(entered&&(back||entered.seed!==run.seed))entered=null;
    const keep=offers.findIndex(n=>n.id===this.selected);
    this.sel=back?exitIndex(back,offers.length):keep>=0?keep:homeIndex(offers.length);
    this.selected=offers[this.sel]?.id??-1;
    this.turn=this.turnFrom=this.turnTo=this.sel;this.turnMs=0;
    // (a new room is laid out afresh on its first frame, even at the same size)
    this.W=this.H=0;
    this.root.replaceChildren();this.root.dataset.patron=r.patron??'dormant';this.root.dataset.region=String(t.act);
    const head=el('header','rsHead'), title=el('div');
    title.append(el('p','rsEyebrow',`CALAMITY · REGION ${t.act} / ${t.maps}`),el('h2','','The Rift Sanctuary'));
    const close=el('button','dmClose','×');close.setAttribute('aria-label','Return home');close.onclick=()=>this.hooks.home();
    const line=el('div','rsStats');line.append(el('span','',`Crossing ${Math.min(t.row+1,rowsIn(t,t.act))} / ${rowsIn(t,t.act)}`),el('span','',`Corruption ${r.corruption}`),el('b','',`${run.gold} gold`));
    head.append(title,close,line);
    const scene=this.scene=el('div','rsScene');
    // (the camera: the stage holds every layer of the room, and zooms; the room slides behind the ring as it turns)
    this.stage=el('div','rsStage');this.room=el('div','rsRoom');
    const bg=el('img','rsScenery');bg.src=sanctuary;bg.alt='An ornate sanctuary suspended in the living rift';
    this.preview=el('div','rsPortalView');
    this.room.append(bg,this.preview);
    for(const light of SPOTS.lights){const l=el('span','rsLight');l.dataset.x=String(light.x);l.dataset.y=String(light.y);l.style.setProperty('--hue',LIGHT_HUE[light.hue]);l.style.setProperty('--beat',`${2.6+((light.x*7)%13)/10}s`);this.room.append(l);}
    this.mist=el('img','rsMist');this.mist.src=mistUrl;this.mist.alt='';
    this.ring=el('div','rsRing');this.rifts=offers.map((_,i)=>{
      const world=this.worlds[i], b=el('button','rsRift');b.style.setProperty('--glow',WORLD_GLOW[world]);b.setAttribute('aria-label',`${WORLDS[world].name} rift`);
      const glow=el('span','rsRiftGlow'), win=el('span','rsRiftWorld'), swirl=el('span','rsRiftSwirl'), frame=el('img','rsRiftFrame');
      win.append(worldPicture(world));swirl.style.backgroundImage=`url(${swirlUrl})`;frame.src=portalUrl;frame.alt='';
      b.append(glow,frame,win,swirl);b.onclick=()=>{if(!this.cine)this.choose(i);};return b;
    });
    this.ring.append(...this.rifts);
    this.motes=el('canvas','rsMotes');this.motes.setAttribute('aria-hidden','true');
    this.bloom=el('div','rsBloom');
    const caption=el('p','rsPortalCaption','Choose what lies beyond');
    const party=this.party=el('div',`rsParty${run.roster.length>5?' large':''}`);
    const ordered=[...run.roster].sort((a,b)=>Number(b.id===r.starter)-Number(a.id===r.starter));
    this.heroes=[];
    ordered.slice(0,10).forEach((hero,i)=>{
      const slot=el('div',`rsHero${hero.id===r.starter?' starter':''}`);
      slot.style.setProperty('--hero-i',String(i));
      const canvas=el('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${heroName(hero.kind)}, level ${heroLevel(hero)}`);
      const info=sheetInfo(formOf(UNITS[hero.kind],hero.grade));const rig=info?shrinkRig(info,hero.id===r.starter?64:48):null;
      if(rig){canvas.width=rig.fw;canvas.height=rig.fh;}
      this.heroes.push({canvas,rig,phase:i*3});
      slot.append(canvas);if(hero.id===r.starter)slot.append(el('span','',`Lv ${heroLevel(hero)} · ${Math.round(hpShare(run,hero.id)*100)}% HP`));party.append(slot);
    });
    this.stage.append(this.room,this.mist,el('div','rsShade'),this.ring,this.bloom,this.party,this.motes);
    // (ALTAR-CLEAR: the altar's button says which step is due, or what is set; the line by it is the starter's level, tier and evolution)
    const altar=el('button',`rsAltar${pendingAltar(run)?' due':''}`,`✦ ${altarButtonLine(r,pendingAltar(run))}`);altar.onclick=()=>this.hooks.altar();
    const growth=el('p','rsGrowth',`Starter ${starterLine(altarSummary(run)!)} · Company ${run.roster.length}`);
    scene.append(this.stage,caption,altar,growth);
    const fragments=el('div','rsFragments');
    e.history.slice(-5).forEach(h=>{const frag=el('span','rsFragment');frag.title=`${WORLDS[h.world].name} · completed`;frag.append(worldPicture(h.world));fragments.append(frag);});scene.append(fragments);
    const destinations=el('section','rsDestinations');
    const bar=el('div','rsDestinationBar');bar.append(el('h3','',offers[0]?.kind==='boss'?'The guardian has found you':'Beyond the portal'));
    const shift=el('button','rsShift',`Reshape · ${SHIFT_COST} gold`);shift.disabled=run.gold<SHIFT_COST||e.shiftedAt===`${t.act}:${t.row}`||offers[0]?.kind==='boss'||!!t.cur||!!pendingAltar(run);shift.onclick=()=>this.hooks.shift();bar.append(shift);
    this.cards=el('div','rsCards');this.cards.setAttribute('role','group');this.cards.setAttribute('aria-label','Choose a destination');
    offers.forEach((node,i)=>{const world=this.worlds[i], b=el('button','rsDestination');b.dataset.id=String(node.id);b.style.setProperty('--glow',WORLD_GLOW[world]);b.append(worldPicture(world),el('b','rsDestinationName',WORLDS[world].name));const kind=el('span','rsKind');kind.append(dungeonIcon(node.kind),el('span','',node.kind==='boss'?'Guardian':NODE_NAMES[node.kind]));b.append(kind);b.onclick=()=>{if(!this.cine)this.choose(i);};this.cards.append(b);});
    this.details=el('div','rsDetails');this.details.setAttribute('aria-live','polite');
    this.enter=el('button','primary rsEnter','Enter the Rift');this.enter.disabled=!offers.length||!!pendingAltar(run);this.enter.onclick=()=>{if(!this.cine)this.hooks.enter(this.selected);};
    const menu=el('nav','rsMenu');for(const [name,action] of [['Altar',this.hooks.altar],['Pack',this.hooks.pack],['Company',this.hooks.company]] as const){const b=el('button','',name);b.onclick=action;menu.append(b);}
    destinations.append(bar,this.cards,this.details,this.enter,menu);this.root.append(head,scene,destinations);
    if(offers.length)this.update(offers[this.sel]);
    if(back&&offers.length)this.walkOut(back);
    this.root.addEventListener('pointerdown',this.skip,true);this.root.addEventListener('click',this.eat,true);
    this.last=0;this.frame=requestAnimationFrame(this.tick);
    return this.root;
  }
  private update(node: MapNode):void {
    const world=destinationWorld(this.run,node.id), spec=WORLDS[world];
    this.preview.replaceChildren(worldPicture(world));
    this.cards.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{const selected=Number(b.dataset.id)===node.id;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    this.rifts.forEach((b,i)=>b.classList.toggle('selected',this.offers[i]?.id===node.id));
    this.details.replaceChildren(el('b','',spec.description),el('p','',node.kind==='fight'||node.kind==='elite'||node.kind==='boss'?spec.footing:REWARDS[node.kind]),el('small','',`${REWARDS[node.kind]} · Starter grows · One crossing`));
    if (['fight','elite','boss'].includes(node.kind)) { const band=fightSpec(this.run,node.kind,spotFloor(this.run,node.id),node.twist,node.id).band;const names=[...new Set(band.map(id=>UNITS[id]?.name??id))];this.details.append(el('small','rsEnemies',`${band.length} foes · ${names.slice(0,2).join(', ')}${names.length>2?'…':''}`)); }
    if(node.twist && TWISTS[node.twist]) this.details.append(el('small','rsTwist',`${TWISTS[node.twist].name} · ${TWISTS[node.twist].text}`));
    this.enter.textContent=pendingAltar(this.run)?'Choose at the altar first':node.kind==='boss'?'Enter the Guardian’s Rift':'Enter the Rift';
    // (ALTAR-CLEAR: which altar step this crossing wakes)
    const wakes=this.altarWakes(node);if(wakes)this.details.append(el('small','rsAltarNext',`✦ ${wakes}`));
  }
  /** The altar step a won crossing would wake: the first win wakes the patron; each guardian the next step. */
  private altarWakes(node: MapNode): string | undefined {
    const r=this.run.rift!, bosses=this.run.tower?.bosses??0;
    const fights=node.kind==='fight'||node.kind==='elite'||node.kind==='boss';
    if(!r.patron&&r.wins<1&&fights)return `A win here wakes ${stepLabel('patron')}`;
    if(node.kind==='boss'){const step=STEPS[bosses+1];if(step&&!r[step])return `Beating the guardian wakes ${stepLabel(step)}`;}
    return undefined;
  }
  /** Pick rift `i`: the ring turns it to the middle and the room slides behind it. */
  private choose(i: number): void {
    const node=this.offers[i];if(!node)return;
    if(i!==this.sel){this.turnFrom=this.turn;this.turnTo=nearestTurn(this.turn,i,this.offers.length);this.turnAt=clock();this.turnMs=reduced()?0:WALK_IN.pan;play('windGust');}
    this.sel=i;this.selected=node.id;this.update(node);
  }

  /* ------------------------------------------------------------------ the frame loop */

  private tick = (): void => {
    if (!this.active) return;
    const now = clock();
    this.frame = requestAnimationFrame(this.tick);
    if (document.hidden) return;
    const calm = reduced(), saver = settings().saver;
    // (between the moves the room runs slower: 30 frames a second, 20 on battery saver, 10 with reduced motion)
    const gap = this.cine || this.turnMs ? 0 : calm ? 95 : saver ? 48 : 31;
    if (now - this.drawn < gap) return;
    const dt = Math.max(0, Math.min(100, this.last ? now - this.last : 16));this.last = now;this.drawn = now;
    this.measure();
    if (this.turnMs) { const k = easeInOut((now - this.turnAt) / this.turnMs);this.turn = this.turnFrom + (this.turnTo - this.turnFrom) * k;if (k >= 1) this.turnMs = 0; }
    else if (!this.cine) this.turn = this.turnTo;
    let zoom = 1, origin = '50% 60%', partyDy = 0, partyScale = 1, partyShown = 1, walking = false, faceBack = false, bloom = 0;
    const c = this.cine;
    if (c?.kind === 'in') {
      const f = walkInFrame(c.plan, now - c.t0);
      if (c.plan.pan) this.turn = c.from + (c.to - c.from) * f.pan;
      const foot = this.riftFoot(), home = this.partyHome();
      partyDy = (foot.y - home.y) * f.walk;partyScale = 1 - 0.55 * f.walk;partyShown = 1 - Math.max(0, (f.walk - 0.7) / 0.3);walking = f.walk > 0 && f.walk < 1;
      zoom = f.zoom;origin = `${foot.x}px ${foot.swirl}px`;bloom = f.flare;
      c.flash.style.opacity = String(f.flash);
      if (now - c.t0 >= c.plan.peak) this.peak();
    } else if (c?.kind === 'out') {
      const ms = now - c.t0, f = walkOutFrame(calm ? 1e9 : ms);
      const foot = this.riftFoot(), home = this.partyHome();
      partyDy = (foot.y - home.y) * (1 - f.walk);partyScale = 0.45 + 0.55 * f.walk;partyShown = f.shown;walking = f.walking;faceBack = !f.turned;
      zoom = f.zoom;origin = `${home.x}px ${home.y - 40 + partyDy}px`;
      this.riseCards(ms, calm);
      if (ms >= c.total) this.settle();
    }
    // (the camera drifts a little, slowly; still with reduced motion)
    const dx = calm ? 0 : Math.sin(now / 9000) * 3, dy = calm ? 0 : Math.cos(now / 11500) * 2;
    this.stage.style.transformOrigin = origin;
    this.stage.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${zoom.toFixed(4)})`;
    const pan = roomPan(this.turn, this.offers.length) * this.W;
    this.room.style.transform = `translateX(${(pan * PARALLAX.room).toFixed(1)}px)`;
    this.mist.style.transform = `translateX(${(pan * PARALLAX.mist + (calm ? 0 : Math.sin(now / 23000) * 14)).toFixed(1)}px)`;
    this.layoutRing();
    this.party.style.transform = `translate(-50%,-100%) translateY(${partyDy.toFixed(1)}px) scale(${partyScale.toFixed(3)})`;
    this.party.style.opacity = partyShown.toFixed(3);
    this.bloom.style.opacity = bloom.toFixed(3);
    this.bloom.style.transform = `translate(-50%,-50%) scale(${(0.6 + bloom * 7).toFixed(3)})`;
    this.drawHeroes(now, walking, faceBack, calm);
    this.drawMotes(dt, pan, calm, saver);
  };

  /** The scene's size; the room's layers are laid again when it changes. */
  private measure(): void {
    const w = this.scene.clientWidth, h = this.scene.clientHeight;
    if (!w || !h || (w === this.W && h === this.H)) return;
    this.W = w;this.H = h;
    const rw = w * ROOM_W, k = coverPoint(rw, h, 0, 0).k;
    const g = this.roomPoint(SPOTS.gate.x, SPOTS.gate.y);
    Object.assign(this.preview.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${SPOTS.gate.w * k}px`, height: `${SPOTS.gate.h * k}px` });
    this.room.querySelectorAll<HTMLElement>('.rsLight').forEach((l) => { const p = this.roomPoint(Number(l.dataset.x), Number(l.dataset.y));l.style.left = `${p.x}px`;l.style.top = `${p.y}px`; });
    const home = this.partyHome();Object.assign(this.party.style, { left: `${home.x}px`, top: `${home.y}px` });
    this.motes.width = Math.ceil(w / 2);this.motes.height = Math.ceil(h / 2);
  }
  /** A point of the painting in the room layer's own pixels (the room is wider than the scene, and starts left of it). */
  private roomPoint(px: number, py: number): { x: number; y: number } { return coverPoint(this.W * ROOM_W, this.H, px, py); }
  /** The same point on the scene, before the room slides. */
  private scenePoint(px: number, py: number): { x: number; y: number } { const p = this.roomPoint(px, py);return { x: p.x - this.W * (ROOM_W - 1) / 2, y: p.y }; }
  private riftW(): number { return Math.min(150, this.W * 0.3, this.H * 0.36); }
  /** The middle rift's foot, and the height of its swirl's middle. */
  private riftFoot(): { x: number; y: number; swirl: number } {
    const s = riftSpot(0), y = this.scenePoint(0, s.y).y, h = this.riftW() * PORTAL.h / PORTAL.w;
    return { x: this.W / 2, y, swirl: y - h * (1 - PORTAL.swirlY) };
  }
  private partyHome(): { x: number; y: number } { return { x: this.W / 2, y: Math.min(this.H - 34, this.scenePoint(0, SPOTS.party).y) }; }
  private layoutRing(): void {
    const w = this.riftW();
    this.rifts.forEach((b, i) => {
      const s = riftSpot(i - this.turn, this.rifts.length), y = this.scenePoint(0, s.y).y;
      b.style.left = `${(s.x * this.W).toFixed(1)}px`;b.style.top = `${y.toFixed(1)}px`;
      b.style.width = `${(w * s.scale).toFixed(1)}px`;b.style.zIndex = String(s.z);
      b.classList.toggle('far', s.scale < 0.8);b.classList.toggle('behind', s.z < 30);
    });
    const f = this.riftFoot();this.bloom.style.left = `${f.x}px`;this.bloom.style.top = `${f.swirl}px`;this.bloom.style.width = this.bloom.style.height = `${w * 0.6}px`;
  }
  private drawHeroes(now: number, walking: boolean, faceBack: boolean, calm: boolean): void {
    for (const h of this.heroes) {
      const rig = h.rig;if (!rig) continue;
      const g = h.canvas.getContext('2d')!;g.clearRect(0, 0, h.canvas.width, h.canvas.height);g.imageSmoothingEnabled = false;
      const row = walking ? 1 : 0, count = rig.counts[rig.rows[row]] ?? 1;
      const frame = calm && !walking ? 0 : (Math.floor(now / (walking ? 110 : 170)) + h.phase) % count;
      // (the sheets face one way or the other; walking back out of the rift they face away from the rifts, then turn round)
      const flip = !rig.facesRight !== faceBack;
      g.save();if (flip) { g.translate(rig.fw, 0);g.scale(-1, 1); }
      g.drawImage(rig.c, frame * rig.fw, row * rig.fh, rig.fw, rig.fh, 0, 0, rig.fw, rig.fh);g.restore();
    }
  }
  /** Motes drift out of the rifts and off the room's crystals; dust floats in the air. Pack sparkles, one small canvas. */
  private drawMotes(dt: number, pan: number, calm: boolean, saver: boolean): void {
    const g = this.motes.getContext('2d');if (!g || !this.W) return;
    const most = calm ? 10 : saver ? 12 : 28, speed = calm ? 0.35 : 1;
    if (this.sparks.length < most && Math.random() < (calm ? 0.12 : 0.45)) this.spawn();
    g.clearRect(0, 0, this.motes.width, this.motes.height);g.imageSmoothingEnabled = false;
    const shift = pan * (PARALLAX.motes - 1);
    this.sparks = this.sparks.filter((m) => {
      m.age += dt * speed;m.x += m.vx * dt * speed / 1000;m.y += m.vy * dt * speed / 1000;
      if (m.age >= m.life) return false;
      const img = tint(m.src, m.colour);if (!img) return true;
      const k = m.age / m.life, fr = Math.min(5, Math.floor(k * 6));
      g.globalAlpha = Math.min(1, k * 4, (1 - k) * 3) * 0.9;
      g.drawImage(img, fr * 32, 0, 32, 32, Math.round((m.x + shift) / 2 - m.size / 2), Math.round(m.y / 2 - m.size / 2), m.size, m.size);
      return true;
    });
    g.globalAlpha = 1;
  }
  private spawn(): void {
    const r = Math.random(), w = this.riftW();
    if (r < 0.5 && this.rifts.length) {
      // (out of a rift's swirl, in its world's light)
      const i = Math.floor(Math.random() * this.rifts.length), s = riftSpot(i - this.turn, this.rifts.length), y = this.scenePoint(0, s.y).y - w * s.scale * (PORTAL.h / PORTAL.w) * (1 - PORTAL.swirlY);
      const a = Math.random() * Math.PI * 2;
      this.sparks.push({ x: s.x * this.W + Math.cos(a) * w * 0.12 * s.scale, y: y + Math.sin(a) * w * 0.15 * s.scale, vx: Math.cos(a) * 14, vy: Math.sin(a) * 10 - 12, age: 0, life: 1600 + Math.random() * 1400, src: sparkUrl, colour: WORLD_GLOW[this.worlds[i]], size: 12 + Math.round(Math.random() * 6) });
    } else if (r < 0.75) {
      // (off a crystal or a gem of the room)
      const l = SPOTS.lights[Math.floor(Math.random() * SPOTS.lights.length)], p = this.scenePoint(l.x, l.y);
      this.sparks.push({ x: p.x + (Math.random() - 0.5) * 10, y: p.y, vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 10, age: 0, life: 1800 + Math.random() * 1200, src: goldUrl, colour: LIGHT_HUE[l.hue], size: 10 });
    } else {
      // (dust in the air of the whole room)
      this.sparks.push({ x: Math.random() * this.W, y: this.H * (0.2 + Math.random() * 0.7), vx: 4 + Math.random() * 6, vy: -3 - Math.random() * 4, age: 0, life: 4000 + Math.random() * 3000, src: sparkUrl, colour: '#d8f7ea', size: 8 });
    }
  }

  /* ------------------------------------------------------------------ the walk out of a rift, back from a crossing */

  private walkOut(back: Entered): void {
    const calm = reduced(), i = this.sel, rift = this.rifts[i], world = (back.world in WORLDS ? back.world : this.worlds[i]) as RiftWorld;
    // (the rift shows the world the party is coming back from until they are out)
    if (rift && world !== this.worlds[i]) { const win = rift.querySelector('.rsRiftWorld')!;win.replaceChildren(worldPicture(world));rift.style.setProperty('--glow', WORLD_GLOW[world]); }
    this.cine = { kind: 'out', t0: clock(), total: walkOutTotal(this.offers.length, calm), world, index: i };
    this.root.classList.add('rsReturning');
    // (the cards are moved by the frame loop, on the same clock as the walk: see `riseCards`)
    [...this.cards.children].forEach((card) => card.classList.add('rsRise'));
    this.riseCards(0, calm);
    if (!calm) play('steps');
  }
  /** The cards rising from the bottom one by one, left to right (with reduced motion, fading in together); each can be tapped once up. */
  private riseCards(ms: number, calm: boolean): void {
    [...this.cards.children].forEach((card, n) => {
      const r = cardRise(n, calm), c = card as HTMLElement, k = Math.max(0, Math.min(1, (ms - r.delay) / r.ms));
      // (eased out with a small overshoot, so each card settles into its place)
      const up = k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
      c.style.transform = calm || k >= 1 ? '' : `translateY(${((1 - up) * 135).toFixed(1)}%)`;
      c.style.opacity = String(Math.min(1, calm ? k : k * 2.5));
      c.classList.toggle('up', k >= 1);
    });
  }
  /** Everything as it ends: a tap during the walk-out, or its end. A tap during the walk-in goes straight to the flash. */
  private settle(): void {
    const c = this.cine;
    if (c?.kind === 'in') { this.peak(); return; }
    this.cine = null;
    this.root.classList.remove('rsReturning');
    [...this.cards.children].forEach((card) => { const c = card as HTMLElement;c.classList.remove('rsRise', 'up');c.style.transform = c.style.opacity = ''; });
    if (c?.kind === 'out') {
      const rift = this.rifts[c.index], world = this.worlds[c.index];
      if (rift && world) { rift.querySelector('.rsRiftWorld')!.replaceChildren(worldPicture(world));rift.style.setProperty('--glow', WORLD_GLOW[world]); }
    }
    this.party.style.opacity = '1';
  }

  /* ------------------------------------------------------------------ the walk into a rift */

  depart(done: () => void):void {
    const calm = reduced(), world = this.worlds[this.sel] ?? 'prism', colour = WORLD_GLOW[world];
    if (this.cine?.kind === 'out') this.settle();
    entered = { seed: this.run.seed, index: this.sel, world, made: expeditionOf(this.run)?.history.length ?? 0 };
    // (the flash is the page's, not the room's: it outlives the room, covers the battle being set up, and fades off it)
    const flash = el('div', `rsFlash${calm ? ' calm' : ''}`);flash.style.setProperty('--glow', colour);
    const foot = this.riftFoot(), box = this.scene.getBoundingClientRect();
    flash.style.setProperty('--at', `${(box.left + foot.x).toFixed(0)}px ${(box.top + foot.swirl).toFixed(0)}px`);
    flash.style.opacity = '0';document.body.append(flash);
    const to = nearestTurn(this.turn, this.sel, this.offers.length), centred = Math.abs(this.turn - to) < 0.01 && !this.turnMs;
    this.cine = { kind: 'in', t0: clock(), plan: walkInPlan(centred, calm), from: this.turn, to, done, peaked: false, flash, colour };
    this.turnMs = 0;this.root.classList.add('rsDeparting');
    if (!calm) { play('steps');window.setTimeout(() => { if (this.cine?.kind === 'in' && !this.cine.peaked) play('cineSwell'); }, this.cine.plan.pan + this.cine.plan.walk); }
  }
  /** The flash fills the screen: the room is left as it was, the next screen is set up under the flash, which fades off it. */
  private peak(): void {
    const c = this.cine;if (c?.kind !== 'in' || c.peaked) return;
    c.peaked = true;this.cine = null;
    c.flash.style.opacity = '1';
    if (!reduced()) play('cineWhoosh');
    this.root.classList.remove('rsDeparting');
    this.stage.style.transform = '';this.party.style.opacity = '0';this.bloom.style.opacity = '0';
    try { c.done(); } finally { fadeFlash(c.flash, c.plan); }
  }
  release():void {
    this.active=false;cancelAnimationFrame(this.frame);
    this.root.removeEventListener('pointerdown',this.skip,true);this.root.removeEventListener('click',this.eat,true);
    // (left mid-walk: the flash goes with the room)
    if(this.cine?.kind==='in'&&!this.cine.peaked)this.cine.flash.remove();
    this.cine=null;this.sparks=[];this.root.classList.remove('rsDeparting','rsReturning');
  }
}

/** The flash fades off whatever is under it now (the battle, or a crossing's card), then is gone. */
function fadeFlash(flash: HTMLElement, plan: WalkInPlan): void {
  const start = clock() + 60;
  const step = () => {
    const now = clock(), k = now < start ? 1 : fadeAt(plan, plan.peak + now - start);
    flash.style.opacity = k.toFixed(3);
    if (k <= 0) flash.remove();else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // (whatever happens to the frames, it is never left over the screen)
  window.setTimeout(() => flash.remove(), plan.fade + 15000);
}
