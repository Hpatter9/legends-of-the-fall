// The Calamity's live dungeon floor. Encounters and travel are still owned by the simulation.
import type { Meta } from './sim/meta';
import type { Run } from './sim/run';
import { choices, hereOf, routeTo, sideChoices, type NodeKind } from './sim/tower';
import { fogOf, openSet, sideSpots, START_ID } from './sim/calLand';
import { dungeonDirection, dungeonHall, dungeonLayout, type DungeonDirection, type DungeonLayout, type DungeonPoint } from './sim/dungeonLayout';
import { pendingAltar } from './sim/rift';
import { formOf, UNITS } from './sim/units';
import { sheetInfo } from './render/sheets';
import { shrinkRig, type Small } from './render/smallRig';
import { settings } from './settings';
import encounterUrl from './art/calmap-dungeon/encounters.webp';
import portalUrl from './art/calmap-dungeon/arrival-portal.webp';
import frames from './art/calmap-dungeon/manifest.json';
import floorUrl from './art/stand/floor1.png';
import wallUrl from './art/stand/walltop.png';
import torchUrl from './art/tower/torch.png';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (name: string) => document.createElementNS(SVG, name);
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
export const LAND_NAMES = ['The Buried Sanctum', 'The Forsaken Vaults', 'The Calamity\'s Heart'];
export const dungeonName = (act: number): string => LAND_NAMES[(Math.max(1, act) - 1) % LAND_NAMES.length];
const LABELS: Record<NodeKind | 'start', string> = { fight: 'Battle', elite: 'Elite', recruit: 'Recruit', campfire: 'Rest', shop: 'Merchant', treasure: 'Treasure', mystery: 'Mystery', boss: 'Guardian', start: 'Arrival portal' };
const arrivals = new Set<string>();

/** Display a source frame without cutting or altering its original generated pixels. */
export function dungeonIcon(kind: NodeKind | 'start'): HTMLElement | SVGElement {
  if (kind === 'start') {
    const image = el('img', 'dmPortalArt');
    image.src = portalUrl;
    image.alt = '';
    return image;
  }
  const f = frames.frames[kind];
  const svg = svgEl('svg');
  svg.setAttribute('viewBox', `${f.x} ${f.y} ${f.width} ${f.height}`);
  svg.setAttribute('aria-hidden', 'true');
  const image = svgEl('image');
  image.setAttribute('href', encounterUrl);
  image.setAttribute('width', String(frames.width));
  image.setAttribute('height', String(frames.height));
  svg.append(image);
  return svg;
}

export interface CalMapHooks {
  meta(): Meta;
  onSpot(id: number): void;
  /** Directional movement uses the same encounter confirmation as tapping Travel. */
  onStep(id: number): void;
}
interface Walk { points: DungeonPoint[]; lengths: number[]; total: number; t0: number; duration: number; done(): void }

export class CalMap {
  readonly root = el('div', 'rtScroll dmScroll');
  private world = el('div', 'dmWorld');
  private marks = el('div', 'dmMarks');
  private walker = el('canvas', 'dmWalker');
  private pad = el('div', 'dmPad');
  private run!: Run;
  private layout!: DungeonLayout;
  private stand = START_ID;
  private unit = 1;
  private pos: DungeonPoint = { x: 180, y: 0 };
  private hero: Small | null = null;
  private heroKey = '';
  private face = 1;
  private walk: Walk | null = null;
  private active = false;
  private raf = 0;
  private timer = 0;
  private key = '';
  private keepScroll = 0;
  private arrows = new Map<DungeonDirection, HTMLButtonElement>();

  constructor(private hooks: CalMapHooks) {
    this.pad.setAttribute('role', 'group');
    this.pad.setAttribute('aria-label', 'Move through connected chambers');
    for (const [direction, text, name] of [['up', '↑', 'north'], ['left', '←', 'west'], ['down', '↓', 'south'], ['right', '→', 'east']] as const) {
      const button = el('button', `dmArrow ${direction}`, text);
      button.type = 'button';
      button.setAttribute('aria-label', `Move ${name}`);
      button.addEventListener('click', () => this.step(direction));
      this.pad.append(button);
      this.arrows.set(direction, button);
    }
    this.root.addEventListener('scroll', () => { this.keepScroll = this.root.scrollTop; }, { passive: true });
  }

  mount(run: Run, width: number, picked: number, recentre = false): HTMLElement {
    const oldKey = this.key;
    this.release();
    this.run = run;
    this.active = true;
    const t = run.tower!;
    const sides = sideSpots(run.seed, t.act, t.map);
    this.layout = dungeonLayout(t.map, sides);
    this.key = `${run.seed}:${t.act}`;
    this.unit = width / this.layout.width;
    this.world.style.cssText = `width:${width}px;height:${this.layout.height * this.unit}px;--dmUnit:${this.unit};--dmFloor:url(${floorUrl});--dmWall:url(${wallUrl})`;
    this.world.dataset.region = String((t.act - 1) % 3);
    this.root.style.setProperty('--dmWall', `url(${wallUrl})`);
    this.stand = t.cur ? t.cur.id : t.going !== undefined && this.openIds().has(t.going) ? t.going : hereOf(t);
    this.pos = this.at(this.stand);
    this.build();
    this.root.replaceChildren(this.world);
    this.setPicked(picked);
    this.readHero();
    const freshArrival = this.stand === START_ID && !t.path.length && !arrivals.has(this.key);
    this.walker.classList.toggle('dmArriving', freshArrival);
    if (freshArrival) arrivals.add(this.key);
    window.removeEventListener('keydown', this.keydown);
    window.addEventListener('keydown', this.keydown);
    requestAnimationFrame(() => {
      if (!this.active) return;
      if (recentre || oldKey !== this.key) this.camera();
      else this.root.scrollTop = this.keepScroll;
      this.drawHero(performance.now());
    });
    this.loop();
    return this.root;
  }

  controls(): HTMLElement { this.updateArrows(); return this.pad; }
  get walking(): boolean { return !!this.walk; }
  openIds(): Set<number> {
    const t = this.run.tower!;
    return new Set([...choices(this.run).map((n) => n.id), ...sideChoices(this.run).map((s) => s.id), ...t.map.filter((n) => n.kind === 'shop' && t.path.includes(n.id)).map((n) => n.id)]);
  }
  walkIds(): Set<number> { return openSet(this.run.tower!); }

  private at(id: number): DungeonPoint {
    const room = this.layout.rooms.find((r) => r.id === id) ?? this.layout.rooms.find((r) => r.id === START_ID)!;
    return { x: room.x, y: room.y };
  }

  private build(): void {
    const t = this.run.tower!;
    const done = this.walkIds(), open = this.openIds();
    const fog = fogOf(t, sideSpots(this.run.seed, t.act, t.map));
    const svg = svgEl('svg');
    svg.classList.add('dmHalls');
    svg.setAttribute('viewBox', `0 0 ${this.layout.width} ${this.layout.height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const defs = svgEl('defs'), pattern = svgEl('pattern'), tile = svgEl('image');
    // The pattern is local to this view; only one Calamity map is mounted at a time.
    pattern.id = 'dm-floor';
    pattern.setAttribute('width', '48'); pattern.setAttribute('height', '48'); pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    tile.setAttribute('href', floorUrl); tile.setAttribute('width', '48'); tile.setAttribute('height', '48');
    pattern.append(tile); defs.append(pattern); svg.append(defs);
    for (const hall of this.layout.halls) {
      const group = svgEl('g');
      group.dataset.from = String(hall.from); group.dataset.to = String(hall.to);
      group.classList.add('dmHall');
      if (!done.has(hall.from) && !done.has(hall.to)) group.classList.add('far');
      const d = hall.points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
      for (const cls of ['dmHallWall', 'dmHallEdge', 'dmHallFloor', 'dmHallLine']) {
        const path = svgEl('path'); path.setAttribute('d', d); path.classList.add(cls); group.append(path);
      }
      svg.append(group);
    }
    this.marks.replaceChildren();
    for (const room of this.layout.rooms) {
      const b = el('button', `dmRoom${room.kind === 'start' ? ' dmPortal' : ''}${room.kind === 'boss' ? ' boss' : ''}${room.side ? ' side' : ''}`);
      b.type = 'button';
      b.dataset.id = String(room.id);
      b.dataset.kind = room.kind;
      b.style.left = `${room.x / this.layout.width * 100}%`;
      b.style.top = `${room.y * this.unit}px`;
      const seen = fog.spots.has(room.id);
      b.classList.toggle('unreached', !open.has(room.id) && !done.has(room.id));
      b.classList.toggle('open', open.has(room.id));
      b.classList.toggle('cleared', done.has(room.id));
      b.classList.toggle('current', this.stand === room.id);
      b.disabled = !(open.has(room.id) || done.has(room.id));
      b.setAttribute('aria-label', `${room.kind === 'start' ? 'Arrival portal — where the heroes entered the Calamity' : seen ? `${room.side ? 'Detour ' : ''}${LABELS[room.kind]} chamber` : 'Unexplored chamber'} · ${this.stand === room.id ? 'current location' : done.has(room.id) ? 'cleared' : open.has(room.id) ? 'available' : 'unreached'}`);
      b.append(seen ? dungeonIcon(room.kind) : el('span', 'dmUnknown', '◇'));
      const label = room.kind === 'start' ? 'Arrival portal' : !seen ? 'Unexplored' : room.side ? `Detour · ${LABELS[room.kind]}` : LABELS[room.kind];
      b.append(el('span', 'dmRoomLabel', label));
      if (done.has(room.id) && room.id !== START_ID) b.append(el('span', 'dmClear', '✓'));
      if (this.stand === room.id && room.kind !== 'start') b.append(el('span', 'dmHere', 'You are here'));
      b.addEventListener('click', () => { if (this.walk) this.skip(); else this.hooks.onSpot(room.id); });
      this.marks.append(b);
    }
    this.world.replaceChildren(svg, this.marks, this.walker);
    const caption = el('div', 'dmFloorCaption', 'The portal opened. The Calamity awaits.');
    this.world.append(caption);
    for (const room of this.layout.rooms.filter((r) => !r.side && r.row % 2 === 0)) {
      const torch = el('span', 'dmTorch');
      torch.style.left = `${(room.x - 35) / this.layout.width * 100}%`;
      torch.style.top = `${(room.y - 30) * this.unit}px`;
      const sprite = svgEl('svg'), image = svgEl('image');
      sprite.setAttribute('viewBox', '0 0 48 48'); sprite.setAttribute('aria-hidden', 'true');
      image.setAttribute('href', torchUrl); image.setAttribute('width', '288'); image.setAttribute('height', '48');
      sprite.append(image); torch.append(sprite); this.world.append(torch);
    }
  }

  setPicked(id: number): void {
    for (const b of this.marks.querySelectorAll<HTMLElement>('[data-id]')) {
      b.classList.toggle('picked', Number(b.dataset.id) === id);
      b.setAttribute('aria-pressed', String(Number(b.dataset.id) === id));
    }
    const route = id === -2 ? null : routeTo(this.run, id);
    for (const h of this.world.querySelectorAll<SVGElement>('.dmHall')) {
      h.classList.toggle('picked', !!route?.some((n, i) => i > 0 && (n === Number(h.dataset.from) && route[i - 1] === Number(h.dataset.to) || n === Number(h.dataset.to) && route[i - 1] === Number(h.dataset.from))));
    }
    this.updateArrows();
  }

  private allowed(): Set<number> { return new Set([...this.openIds(), ...this.walkIds()]); }
  private updateArrows(): void {
    if (!this.run || !this.layout) return;
    const allowed = this.allowed();
    for (const [direction, button] of this.arrows) button.disabled = !!this.walk || !!this.run.tower?.cur || !!pendingAltar(this.run) || this.run.over || dungeonDirection(this.layout, this.stand, allowed, direction) === undefined;
  }
  private step(direction: DungeonDirection): void {
    if (!this.active || this.walk || pendingAltar(this.run) || this.run.tower?.cur || this.run.over) return;
    const next = dungeonDirection(this.layout, this.stand, this.allowed(), direction);
    if (next !== undefined) this.hooks.onStep(next);
  }
  private keydown = (event: KeyboardEvent): void => {
    if (!this.active || !this.root.isConnected || this.root.closest('[hidden]') || document.querySelector('#towerMap .rtCardWrap, #towerMap .cvVeil, #events:not([hidden]), #settings:not([hidden]), #ask:not([hidden]), #recap:not([hidden])')) return;
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
    const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const)[event.key as 'ArrowUp'];
    if (direction) { event.preventDefault(); event.stopPropagation(); this.step(direction); }
  };

  restand(): void {
    this.walk = null;
    this.stand = hereOf(this.run.tower!);
    this.pos = this.at(this.stand);
    this.drawHero(performance.now());
    this.updateArrows();
  }

  walkTo(id: number, done: () => void): void {
    if (this.stand === id) { done(); return; }
    const route = routeTo(this.run, id);
    if (!route) { this.restand(); done(); return; }
    const points: DungeonPoint[] = [];
    for (let i = 1; i < route.length; i++) {
      const segment = dungeonHall(this.layout, route[i - 1], route[i]);
      if (segment) points.push(...(points.length ? segment.slice(1) : segment));
    }
    if (!points.length || reduced()) { this.stand = id; this.pos = this.at(id); this.drawHero(performance.now()); done(); return; }
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    const total = lengths[lengths.length - 1];
    this.walker.classList.remove('dmArriving');
    this.walk = { points, lengths, total, t0: performance.now(), duration: Math.min(2400, Math.max(350, total * 2.4)), done: () => { this.stand = id; done(); } };
    this.updateArrows();
  }

  skip(): void {
    const walk = this.walk;
    if (!walk) return;
    this.walk = null;
    this.pos = walk.points[walk.points.length - 1];
    this.drawHero(performance.now());
    walk.done();
  }

  private readHero(): void {
    const run = this.run;
    const lead = run.roster.find((h) => h.id === run.rift?.starter) ?? run.squad.map((id) => run.roster.find((h) => h.id === id)).find(Boolean) ?? run.roster[0];
    if (!lead) { this.hero = null; return; }
    const key = formOf(UNITS[lead.kind], lead.grade);
    if (key === this.heroKey && this.hero) return;
    const rig = sheetInfo(key);
    this.hero = rig ? shrinkRig(rig, 44) : null;
    this.heroKey = key;
  }

  private drawHero(now: number): void {
    const hero = this.hero;
    if (!hero) { this.walker.hidden = true; return; }
    this.walker.hidden = false;
    if (this.walker.width !== hero.fw || this.walker.height !== hero.fh) { this.walker.width = hero.fw; this.walker.height = hero.fh; }
    const g = this.walker.getContext('2d')!;
    g.clearRect(0, 0, hero.fw, hero.fh); g.imageSmoothingEnabled = false;
    const row = this.walk ? 1 : 0, count = hero.counts[this.walk ? 'walk' : 'idle'] ?? 1;
    const frame = reduced() ? 0 : Math.floor(now / (this.walk ? 100 : 170)) % count;
    g.save();
    if ((this.face === 1) !== hero.facesRight) { g.translate(hero.fw, 0); g.scale(-1, 1); }
    g.drawImage(hero.c, frame * hero.fw, row * hero.fh, hero.fw, hero.fh, 0, 0, hero.fw, hero.fh); g.restore();
    this.walker.style.left = `${this.pos.x * this.unit}px`;
    this.walker.style.top = `${(this.pos.y + 14) * this.unit}px`;
    this.walker.setAttribute('aria-label', 'Your starting hero');
  }

  private camera(): void {
    const y = this.pos.y * this.unit;
    this.root.scrollTop = Math.max(0, Math.min(this.root.scrollHeight - this.root.clientHeight, y - this.root.clientHeight * 0.65));
  }
  private loop = (): void => {
    if (!this.active) return;
    const now = performance.now();
    if (this.walk) {
      const w = this.walk, distance = Math.min(1, (now - w.t0) / w.duration) * w.total;
      let i = 1;
      while (i < w.lengths.length - 1 && w.lengths[i] < distance) i++;
      const a = w.points[i - 1], b = w.points[i];
      const part = (distance - w.lengths[i - 1]) / Math.max(1, w.lengths[i] - w.lengths[i - 1]);
      if (b.x !== a.x) this.face = b.x > a.x ? 1 : -1;
      this.pos = { x: a.x + (b.x - a.x) * part, y: a.y + (b.y - a.y) * part };
      this.camera();
      if (distance >= w.total) { this.walk = null; this.pos = w.points[w.points.length - 1]; w.done(); return; }
    }
    if (!this.active) return;
    if (!document.hidden) this.drawHero(now);
    this.timer = window.setTimeout(() => { this.raf = requestAnimationFrame(this.loop); }, reduced() || document.hidden ? 250 : settings().saver ? 80 : 40);
  };
  release(): void {
    this.active = false;
    cancelAnimationFrame(this.raf); clearTimeout(this.timer);
    this.walk = null;
    window.removeEventListener('keydown', this.keydown);
  }
}
