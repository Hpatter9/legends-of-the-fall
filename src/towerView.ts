// The endless tower's screens (`rogue.css`): the map (a scrollable vertical path map, row 1 at the foot and the boss at the top, with the party's
// health, the run's gold and relics above it), and the simple screens of the nodes that are not a battle: the shop, the campfire and the
// treasure chest, then the summary of a run that has ended. Like events.ts it reads and changes the Run only through the sim's own functions
// (`enterNode`, `buy`, `rest`, ...); a battle node hands over to the page (`onFight`), a mystery floor to the event card.

import { chestKind } from './sim/armyStars';
import { gainXp, xpOf, levelOf } from './sim/levels';
import { saveMeta, type Meta } from './sim/meta';
import { hpShare } from './sim/health';
import { RELICS } from './sim/relics';
import {
  ACT_ROWS, buy, chestLine, choices, clearNode, enterNode, finishMystery, floorOf, inBattle, LANES, NODE_NAMES, openTreasure, REST_HEAL, rest, takeXp, train, trainXp, type MapNode, type NodeKind, type ShopItem, type TowerSummary,
} from './sim/tower';
import { saveRun, type Run } from './sim/run';
import { UNITS } from './sim/units';
import { gearIcon, iconImg, relicIcon } from './render/items';
import { portrait } from './render/sheets';
import { play } from './render/sound';
import { chestPicture } from './chestStash';
import { ICONS, icon } from './menuArt';
import swords from './art/rogue/swords.png';
import skull from './art/rogue/skull.png';
import fire from './art/rogue/fire.png';
import coin from './art/rogue/coin.png';
import question from './art/rogue/question.png';
import heart from './art/rogue/heart.png';
import potion from './art/rogue/potion.png';
import elixir from './art/rogue/elixir.png';
import chestIcon from './art/ui/chest-bronze.png';
import crown from './art/ui/ic-crown.png';
import type { Events } from './events';
import { twistBadge, twistLine } from './twistView';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** What the page gives the view: the meta (for XP and the summary), and what a battle node, the pack and the way home do. */
export interface TowerHooks {
  meta(): Meta;
  events: Events;
  /** A battle node has been entered: start its fight. */
  onFight(): void;
  onPack(): void;
  onHome(): void;
}

/** Each kind of node: its icon, and what it is, in a line. */
export const NODE_INFO: Record<NodeKind, { icon: string; text: string }> = {
  fight: { icon: swords, text: 'A band of foes. Win to go on; gold for the win.' },
  elite: { icon: skull, text: 'A tougher band with a mini-boss. Drops a relic or gear.' },
  campfire: { icon: fire, text: 'Rest to heal the party, or train a hero for XP.' },
  shop: { icon: coin, text: 'Spend gold on relics, gear, healing, or a new hero.' },
  treasure: { icon: chestIcon, text: 'A chest: gold, and a relic or gear.' },
  mystery: { icon: question, text: 'Something strange. A choice, with a price or a prize.' },
  boss: { icon: crown, text: 'The act boss. A wall; drops gear and a relic and heals half.' },
};

const ROW_H = 66;
const PAD_TOP = 56;
const PAD_BOTTOM = 40;
const BOSS_ROW_H = 40;

export class TowerView {
  private root = el('div');
  private run!: Run;
  private picked = -1;
  /** A screen over the map (shop, campfire, treasure, summary). */
  private card: HTMLElement | null = null;

  constructor(private hooks: TowerHooks) {
    this.root.id = 'towerMap';
    this.root.hidden = true;
    document.body.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Show the map of the run's tower (and the node in play, if the run was left at one that is not a battle). */
  open(run: Run): void {
    this.run = run;
    this.picked = -1;
    this.card = null;
    this.root.hidden = false;
    document.body.classList.add('towerUp');
    this.collectXp();
    this.draw(true);
    const cur = run.tower?.cur;
    if (cur && !cur.fight) this.resumeNode();
  }

  close(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
    document.body.classList.remove('towerUp');
  }

  /* ------------------------------------------------------------------ the map */

  private draw(scrollToNow = false): void {
    const run = this.run;
    const t = run.tower!;
    const keep = this.root.querySelector('.rtScroll')?.scrollTop;
    this.root.replaceChildren(this.header(), this.mapBox(), this.footer());
    const sc = this.root.querySelector<HTMLElement>('.rtScroll')!;
    // (the map keeps its place while it is redrawn; on opening it scrolls to the row now being picked)
    requestAnimationFrame(() => {
      if (!scrollToNow && keep !== undefined) sc.scrollTop = keep;
      else sc.scrollTop = Math.max(0, this.rowY(t.row) - sc.clientHeight * 0.62);
    });
  }

  private mapHeight(): number {
    return PAD_TOP + (ACT_ROWS - 1) * ROW_H + BOSS_ROW_H + PAD_BOTTOM;
  }

  /** The y (px, from the top of the map) of the centre of a row: the first floor at the foot, the boss at the top. */
  private rowY(row: number): number {
    return this.mapHeight() - PAD_BOTTOM - row * ROW_H;
  }

  private header(): HTMLElement {
    const run = this.run;
    const t = run.tower!;
    const head = el('header', 'rtHead');
    const top = el('div', 'rtTop');
    top.append(el('h2', '', `Act ${t.act} · Floor ${run.stage}`));
    const gold = el('span', 'rtGold');
    gold.append(icon(ICONS.gold), el('b', '', String(run.gold)));
    top.append(gold);
    const pack = el('button', 'small', 'Pack');
    pack.addEventListener('click', () => this.hooks.onPack());
    const home = el('button', 'small', 'Home');
    home.addEventListener('click', () => {
      saveRun(run);
      this.close();
      this.hooks.onHome();
    });
    top.append(pack, home);
    head.append(top, this.partyBars());
    const relics = el('div', 'rtRelics');
    for (const id of run.relics ?? []) {
      const b = el('button', 'relic');
      b.title = `${RELICS[id].name}: ${RELICS[id].text}`;
      b.append(iconImg(relicIcon(id), RELICS[id].name));
      b.addEventListener('click', () => this.say(`${RELICS[id].name}: ${RELICS[id].text}`));
      relics.append(b);
    }
    if (!run.relics?.length) relics.append(el('span', 'hint', 'No relics yet. Elites, bosses, chests and shops have them.'));
    head.append(relics);
    return head;
  }

  /** The squad's faces with their health bars. */
  private partyBars(): HTMLElement {
    const run = this.run;
    const bars = el('div', 'rtParty');
    for (const id of run.squad) {
      const h = run.roster.find((x) => x.id === id);
      if (!h) continue;
      const share = hpShare(run, id);
      const cell = el('div', `rtHero${share <= 0.3 ? ' low' : ''}`);
      const face = portrait(UNITS[h.kind].sheet, 40, h.grade);
      face.className = 'rtFace';
      const bar = el('i', 'rtBar');
      const fill = el('span');
      fill.style.width = `${Math.max(4, share * 100)}%`;
      bar.append(fill);
      cell.append(face, bar, el('small', '', `${Math.round(share * 100)}%`));
      cell.title = `${UNITS[h.kind].name}: ${Math.round(share * 100)}% hp`;
      bars.append(cell);
    }
    if (!run.squad.length) bars.append(el('span', 'hint', 'No heroes in the squad: pick them in the next fight.'));
    return bars;
  }

  private mapBox(): HTMLElement {
    const run = this.run;
    const t = run.tower!;
    const scroll = el('div', 'rtScroll');
    const map = el('div', 'rtMap');
    map.style.height = `${this.mapHeight()}px`;
    const open = new Set(choices(run).map((n) => n.id));
    const taken = new Set(t.path);
    const xOf = (lane: number) => ((lane + 0.5) / LANES) * 100;
    // the lines first (an SVG over the whole map, in percent across and pixels down)
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'rtLines');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', String(this.mapHeight()));
    for (const n of t.map) {
      for (const to of n.next) {
        const m = t.map[to];
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', `${xOf(n.lane)}%`);
        line.setAttribute('y1', String(this.rowY(n.row)));
        line.setAttribute('x2', `${xOf(m.lane)}%`);
        line.setAttribute('y2', String(this.rowY(m.row)));
        const walked = taken.has(n.id) && taken.has(to);
        const now = (n.id === t.at && open.has(to)) || (t.at < 0 && n.row === t.row - 1 && false);
        line.setAttribute('class', walked ? 'walked' : now ? 'now' : '');
        svg.append(line);
      }
    }
    map.append(svg);
    for (const n of t.map) map.append(this.nodeButton(n, xOf(n.lane), open, taken));
    scroll.append(map);
    return scroll;
  }

  private nodeButton(n: MapNode, x: number, open: Set<number>, taken: Set<number>): HTMLElement {
    const t = this.run.tower!;
    const state = taken.has(n.id) ? (n.id === t.at ? 'here' : 'done') : open.has(n.id) ? 'open' : t.cur?.id === n.id ? 'here' : 'far';
    const b = el('button', `rtNode ${n.kind} ${state}${this.picked === n.id ? ' picked' : ''}`);
    b.style.left = `${x}%`;
    b.style.top = `${this.rowY(n.row)}px`;
    b.append(icon(NODE_INFO[n.kind].icon, 'rtIco'));
    const badge = twistBadge(n.twist);
    if (badge) b.append(badge);
    if (state === 'done') b.append(el('i', 'rtTick'));
    b.setAttribute('aria-label', `${NODE_NAMES[n.kind]}, floor ${floorOf(t.act, n.row)}`);
    b.addEventListener('click', () => {
      this.picked = open.has(n.id) ? n.id : -1;
      this.say(`Floor ${floorOf(t.act, n.row)} · ${NODE_NAMES[n.kind]}: ${NODE_INFO[n.kind].text}${twistLine(n.twist)}`);
      this.markPicked();
    });
    return b;
  }

  private footer(): HTMLElement {
    const foot = el('footer', 'rtFoot');
    const say = el('p', 'rtSay', this.defaultSay());
    const go = el('button', 'primary rtGo', 'Climb');
    go.disabled = this.picked < 0;
    go.addEventListener('click', () => this.go());
    foot.append(say, go);
    return foot;
  }

  private defaultSay(): string {
    const n = choices(this.run).length;
    return n ? 'Pick a glowing node to climb to.' : 'Nothing to pick.';
  }

  /** The line above the Climb button. */
  private say(text: string): void {
    const s = this.root.querySelector('.rtSay');
    if (s) s.textContent = text;
  }

  /** The picked node is lit and the Climb button wakes, without redrawing the map. */
  private markPicked(): void {
    const nodes = this.root.querySelectorAll<HTMLElement>('.rtNode');
    const map = this.run.tower!.map;
    nodes.forEach((b, i) => b.classList.toggle('picked', map[i].id === this.picked));
    const go = this.root.querySelector<HTMLButtonElement>('.rtGo');
    if (go) {
      go.disabled = this.picked < 0;
      const kind = this.picked >= 0 ? map[this.picked].kind : null;
      go.textContent = kind ? (kind === 'fight' || kind === 'elite' || kind === 'boss' ? 'To battle!' : `Go to the ${NODE_NAMES[kind].toLowerCase()}`) : 'Climb';
    }
  }

  private go(): void {
    const run = this.run;
    if (this.picked < 0 || !enterNode(run, this.picked)) return;
    play('summon');
    saveRun(run);
    const cur = run.tower!.cur!;
    this.picked = -1;
    if (cur.fight) {
      this.close();
      this.hooks.onFight();
      return;
    }
    this.resumeNode();
  }

  /** XP a mystery floor taught goes into the meta (the lessons are kept for good). */
  private collectXp(): void {
    const got = takeXp(this.run);
    if (!got) return;
    const m = this.hooks.meta();
    gainXp(m, got);
    saveMeta(m);
  }

  /** The screen of a node that is not a battle and is in play. */
  private resumeNode(): void {
    const run = this.run;
    const cur = run.tower!.cur!;
    if (cur.kind === 'mystery') {
      this.hooks.events.openEvent(run, () => {
        finishMystery(run);
        this.collectXp();
        saveRun(run);
        // (a mimic's chest was opened: the fight begins)
        if (inBattle(run)) {
          this.close();
          this.hooks.onFight();
          return;
        }
        this.draw(true);
      });
    } else if (cur.kind === 'shop') this.shopCard();
    else if (cur.kind === 'campfire') this.campCard();
    else if (cur.kind === 'treasure') this.treasureCard();
  }

  /* ------------------------------------------------------------------ the cards */

  private cardShell(title: string, kind: NodeKind): HTMLElement {
    this.card?.remove();
    const wrap = el('div', 'rtCardWrap');
    const card = el('div', `rtCard ${kind}`);
    card.append(el('h2', '', title));
    wrap.append(card);
    this.root.append(wrap);
    this.card = wrap;
    return card;
  }

  /** Close the card and the node: the run climbs a floor and the map is drawn again. */
  private leave(): void {
    clearNode(this.run);
    saveRun(this.run);
    this.card?.remove();
    this.card = null;
    this.draw(true);
  }

  private goldLine(): HTMLElement {
    const g = el('div', 'rtGoldLine');
    g.append(icon(ICONS.gold), el('b', '', `${this.run.gold} gold`));
    return g;
  }

  private shopCard(): void {
    const run = this.run;
    const stock = run.tower!.cur!.shop!;
    const card = this.cardShell('The shop', 'shop');
    card.append(el('p', 'rtLead', 'A peddler lays out a blanket of wares under a lantern.'), this.goldLine(), this.partyBars());
    const list = el('div', 'rtShop');
    stock.forEach((it, i) => list.append(this.shopRow(it, i)));
    card.append(list);
    if (this.note) card.append(el('p', 'rtNote', this.note));
    const out = el('button', 'primary', 'Leave the shop');
    out.addEventListener('click', () => {
      this.note = '';
      this.leave();
    });
    card.append(out);
  }

  private note = '';

  private shopRow(it: ShopItem, i: number): HTMLElement {
    const run = this.run;
    const row = el('button', `rtItem ${it.kind}${it.sold ? ' sold' : ''}`);
    const pic =
      it.kind === 'relic' ? iconImg(relicIcon(it.ref!), it.label) : it.kind === 'gear' ? iconImg(gearIcon(it.gear!.slot, it.gear!.tier), it.label) : it.kind === 'heal' ? icon(potion, 'rtShopIco') : it.kind === 'elixir' ? icon(elixir, 'rtShopIco') : portrait(UNITS[it.ref!].sheet, 40);
    pic.classList.add('rtShopPic');
    const words = el('span');
    words.append(el('b', '', it.sold ? `${it.label} · sold` : it.label), el('small', '', it.text));
    row.append(pic, words, el('em', '', it.sold ? '' : String(it.cost)));
    row.disabled = it.sold || run.gold < it.cost;
    row.addEventListener('click', () => {
      const line = buy(run, i);
      if (line === null) return;
      play('summon');
      this.note = line;
      saveRun(run);
      this.shopCard();
    });
    return row;
  }

  private campCard(): void {
    const run = this.run;
    const cur = run.tower!.cur!;
    const card = this.cardShell('The campfire', 'campfire');
    const flame = icon(fire, 'rtFlame');
    card.append(flame, el('p', 'rtLead', 'A fire crackles in a ring of stones. The heroes bind their wounds.'), this.partyBars());
    if (cur.camp) {
      card.append(el('p', 'rtNote', cur.camp));
      const go = el('button', 'primary', 'Break camp');
      go.addEventListener('click', () => this.leave());
      card.append(go);
      return;
    }
    const restBtn = el('button', 'rtChoice');
    restBtn.append(icon(heart, 'rtShopIco'));
    const words = el('span');
    words.append(el('b', '', 'Rest'), el('small', '', `heal every hero ${Math.round(REST_HEAL * 100)}% of its hp, the fallen too`));
    restBtn.append(words);
    restBtn.addEventListener('click', () => {
      rest(run);
      play('summon');
      saveRun(run);
      this.campCard();
    });
    card.append(restBtn, el('p', 'rtLead', `Or train a hero by the fire (+${trainXp(run.stage)} XP, kept for good):`));
    const heroes = el('div', 'rtTrain');
    const seen = new Set<string>();
    for (const h of run.roster) {
      if (seen.has(h.kind)) continue;
      seen.add(h.kind);
      const b = el('button', 'rtTrainHero');
      const face = portrait(UNITS[h.kind].sheet, 40, h.grade);
      b.append(face, el('small', '', UNITS[h.kind].name), el('em', '', `Lv ${levelOf(xpOf(this.hooks.meta(), h.kind))}`));
      b.addEventListener('click', () => {
        const got = train(run, h.id);
        if (!got) return;
        const m = this.hooks.meta();
        gainXp(m, { [got.kind]: got.xp });
        saveMeta(m);
        play('summon');
        saveRun(run);
        this.campCard();
      });
      heroes.append(b);
    }
    card.append(heroes);
  }

  private treasureCard(): void {
    const run = this.run;
    const ch = run.tower!.cur!.chest!;
    const card = this.cardShell('The treasure', 'treasure');
    const pic = chestPicture('bronze', 4);
    pic.root.classList.add('rtChest');
    card.append(pic.root);
    if (!ch.opened) {
      card.append(el('p', 'rtLead', 'A chest sits in the dust of the landing, waiting.'));
      const open = el('button', 'primary', 'Open it');
      open.addEventListener('click', () => {
        const lines = openTreasure(run) ?? [];
        play('star');
        saveRun(run);
        pic.root.classList.add('burst');
        card.querySelector('.rtLead')!.textContent = 'The lid swings open:';
        const list = el('ul', 'rtLoot');
        for (const l of lines) list.append(el('li', '', l));
        open.before(list);
        open.textContent = 'Take it and climb';
        open.onclick = () => this.leave();
      });
      card.append(open);
      return;
    }
    const go = el('button', 'primary', 'Climb on');
    go.addEventListener('click', () => this.leave());
    card.append(go);
  }

  /* ------------------------------------------------------------------ the end of a run */

  /** The summary of a run that has ended: the floors climbed and what they paid. `then` runs when it is closed. */
  showSummary(run: Run, s: TowerSummary, then: () => void): void {
    this.root.hidden = false;
    document.body.classList.add('towerUp');
    this.root.replaceChildren();
    const wrap = el('div', 'rtCardWrap solo');
    const card = el('div', 'rtCard summary');
    card.append(el('h2', '', 'The climb ends'), el('p', 'rtLead', `The heroes fall on floor ${run.stage}, in act ${s.act}.`));
    const stats = el('div', 'rtStats');
    const stat = (label: string, value: string) => {
      const row = el('div');
      row.append(el('span', '', label), el('b', '', value));
      stats.append(row);
    };
    stat('Floors climbed', String(s.floors));
    stat('Acts', String(s.act));
    stat('Relics', String(s.relics));
    stat('Heroes', String(s.heroes));
    stat('Crowns earned', String(s.crowns));
    card.append(stats);
    if (s.newBest) card.append(el('p', 'rtBest', `A new best floor: ${s.floors}!`));
    const rewards = el('div', 'rtRewards');
    for (const [name, n] of [['bronze', s.bronze], ['silver', s.silver], ['gold', s.gold]] as const) {
      if (!n) continue;
      const one = el('div', 'rtReward');
      const pic = chestPicture(chestKind(name === 'bronze' ? 3 : name === 'silver' ? 5 : 10), 2);
      one.append(pic.root, el('b', '', `×${n}`));
      rewards.append(one);
    }
    card.append(rewards);
    const line = chestLine(s);
    card.append(el('p', 'rtLead', line ? `${line} added to your stash.` : 'No chests yet: climb further to earn them.'));
    for (const g of s.gear) card.append(el('p', 'rtGear', `Equipment found: ${g}`));
    const go = el('button', 'primary', 'Back to camp');
    go.addEventListener('click', () => {
      this.close();
      then();
    });
    card.append(go);
    wrap.append(card);
    this.root.append(wrap);
  }
}
