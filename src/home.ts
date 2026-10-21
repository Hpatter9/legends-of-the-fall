// The home screen (#home), King God Castle style: a top bar (crowns, gold, best stage), five pages behind a bottom tab
// bar (Recruit, Heroes, Battle in the middle, Castle, Spells) that slide as you switch, and the Battle page as the hub
// with a lively scene, the stage banner, one big Battle button and the daily and tower cards. The pages re-house the
// older screens (gacha, modes, achievements, settings, castle upgrades); it only reads and changes the Meta through the
// sim's own functions.

import { ALL_HEROES, UNITS } from './sim/units';
import { BUILDING_IDS, BUILDINGS, maxLevel, nextCost, upgrade, type BuildingId } from './sim/castle';
import { PITY, PULL_COST, PULL10_COST, rarityOf, saveMeta, starSummary, type Meta } from './sim/meta';
import { dailyLine, towerLine, towerOpen } from './sim/modes';
import { ACHIEVEMENTS } from './sim/achievements';
import { AREAS } from './sim/board';
import { areaFor } from './sim/run';
import { drawAchievements } from './achievementsView';
import { todayKey } from './modes';
import { portrait } from './render/sheets';
import { openSettings } from './settings';
import { openSpellbook } from './spellbook';
import { resetTipsButton, tips } from './tips';
import { AREA_NAMES, BUILDING_ICON, ICONS, icon } from './menuArt';
import { drawHeroGrid, drawHeroSheet, strongest } from './menuHeroes';
import { MenuScene } from './menuScene';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export interface HomeHooks {
  /** Whether a run is saved and not over. */
  hasRun(): boolean;
  /** The saved run's stage and gold, if there is one going. */
  runInfo?(): { stage: number; gold: number } | null;
  onContinue(): void;
  onNew(): void;
  onRecruit(): void;
  onDaily(): void;
  onTower(): void;
  /** Opens the spellbook; until it exists the Spells tab shows a "coming soon" page. */
  onSpells?(): void;
}

type Tab = 'recruit' | 'heroes' | 'battle' | 'castle' | 'spells';
const TABS: { id: Tab; label: string }[] = [
  { id: 'recruit', label: 'Recruit' },
  { id: 'heroes', label: 'Heroes' },
  { id: 'battle', label: 'Battle' },
  { id: 'castle', label: 'Castle' },
  { id: 'spells', label: 'Spells' },
];
const SEEN = 'lotf-achievements-seen';

const seenCount = (): number => {
  try {
    return Number(localStorage.getItem(SEEN)) || 0;
  } catch {
    return 0;
  }
};

export class Home {
  private tab: Tab = 'battle';
  private note = '';
  private pages = new Map<Tab, HTMLElement>();
  private tabBtns = new Map<Tab, HTMLButtonElement>();
  private scene!: MenuScene;
  private stopSheet: (() => void) | null = null;
  private sceneKey = '';

  constructor(
    private meta: Meta,
    private hooks: HomeHooks,
  ) {
    this.scene = new MenuScene($('hmScene'));
    const pages = $('hmPages');
    const bar = $('hmTabs');
    for (const t of TABS) {
      const page = el('section', `hmPage hm-${t.id}`);
      pages.append(page);
      this.pages.set(t.id, page);
      const b = el('button', `hmTab${t.id === 'battle' ? ' hero' : ''}`);
      b.append(icon(ICONS[t.id]), el('span', '', t.label), el('i', 'badge'));
      b.addEventListener('click', () => this.show(t.id));
      bar.append(b);
      this.tabBtns.set(t.id, b);
    }
    // (the battle page keeps the scene behind its own content)
    this.pages.get('battle')!.append($('hmScene'));
    $('hmTrophy').addEventListener('click', () => this.openSub('Achievements', (b) => drawAchievements(b, this.meta)));
    $('hmGear').addEventListener('click', () => openSettings());
    $('hmSubBack').addEventListener('click', () => this.closeSub());
    $('hmSheet').addEventListener('click', (e) => e.target === $('hmSheet') && this.closeSheet());
  }

  /** Open the home screen; `note` is a line shown on the Battle page (the last run's end). */
  open(note = this.note): void {
    this.note = note;
    $('home').hidden = false;
    this.closeSub();
    this.closeSheet();
    this.show('battle');
    tips.offer('home', $('hmBattle'));
    // (a run has just ended: the crowns are there to spend)
    if (note) tips.offer('crowns', $('hmTabs'));
  }

  get isOpen(): boolean {
    return !$('home').hidden;
  }

  private go(then: () => void): void {
    $('home').hidden = true;
    this.scene.stop();
    this.note = '';
    then();
  }

  private show(tab: Tab): void {
    if (tab === 'spells') return this.hooks.onSpells ? this.hooks.onSpells() : openSpellbook();
    this.tab = tab;
    this.refresh();
  }

  /** Redraw the page that is showing (after crowns or unlocks change elsewhere). */
  refresh(): void {
    if (!this.isOpen) return;
    const m = this.meta;
    const info = this.hooks.runInfo?.() ?? null;
    // top bar
    $('hmCrowns').replaceChildren(icon(ICONS.crowns), el('b', '', String(m.crowns)));
    $('hmGold').hidden = !info;
    if (info) $('hmGold').replaceChildren(icon(ICONS.gold), el('b', '', String(info.gold)));
    const best = starSummary(m);
    $('hmBest').textContent = best ? `Best stage ${best.stage} · ★ ${best.total}` : `Best stage ${m.bestStage}`;
    const fresh = m.achievements.length > seenCount();
    $('hmTrophy').classList.toggle('new', fresh);
    // tabs
    const order = TABS.map((t) => t.id);
    const cur = order.indexOf(this.tab);
    order.forEach((id, i) => {
      this.pages.get(id)!.style.transform = `translateX(${(i - cur) * 100}%)`;
      this.pages.get(id)!.classList.toggle('on', id === this.tab);
      this.tabBtns.get(id)!.classList.toggle('on', id === this.tab);
    });
    const affordable = BUILDING_IDS.some((id) => {
      const c = nextCost(m.castle, id);
      return c !== null && m.crowns >= c;
    });
    this.tabBtns.get('castle')!.classList.toggle('new', affordable || fresh);
    this.tabBtns.get('recruit')!.classList.toggle('new', m.crowns >= PULL_COST);
    this.tabBtns.get('battle')!.classList.toggle('new', !m.daily[String(todayKey())]);
    this.drawBattle();
    this.drawRecruit();
    this.drawHeroes();
    this.drawCastle();
    this.drawSpells();
    if (this.tab === 'battle') this.scene.start();
    else this.scene.stop();
  }

  private drawBattle(): void {
    const m = this.meta;
    const page = this.pages.get('battle')!;
    const info = this.hooks.runInfo?.() ?? null;
    const stage = info ? info.stage : Math.max(1, m.bestStage);
    const area = AREAS.includes(areaFor(stage)) ? areaFor(stage) : 'highlands';
    const heroes = strongest(m, 5);
    const key = `${area}|${heroes.join(',')}`;
    if (key !== this.sceneKey) {
      this.sceneKey = key;
      this.scene.set(area, heroes);
    }
    page.querySelector('.hmFront')?.remove();
    const front = el('div', 'hmFront');
    if (this.note) front.append(el('div', 'hmNote', this.note));
    front.append(el('div', 'hmBanner', `${info ? 'Stage' : 'Best: stage'} ${stage} · ${AREA_NAMES[area]}`));
    const cards = el('div', 'hmCards');
    const daily = el('button', 'hmCard');
    daily.append(icon(ICONS.daily), el('b', '', 'Daily'), el('small', '', dailyLine(m, todayKey()).replace('Daily challenge · ', '')));
    if (!m.daily[String(todayKey())]) daily.append(el('i', 'badge'));
    daily.addEventListener('click', () => this.go(this.hooks.onDaily));
    const tower = el('button', `hmCard${towerOpen(m) ? '' : ' lockedCard'}`);
    tower.append(icon(ICONS.tower), el('b', '', towerOpen(m) ? 'Tower' : 'Locked'), el('small', '', towerLine(m).replace('Endless tower · ', '')));
    tower.disabled = !towerOpen(m);
    tower.addEventListener('click', () => this.go(this.hooks.onTower));
    cards.append(daily, tower);
    const go = el('div', 'hmGo');
    const has = this.hooks.hasRun();
    const battle = el('button', 'hmBattle');
    battle.id = 'hmBattle';
    battle.append(el('span', '', 'Battle!'), el('small', '', has ? `Continue run · stage ${info?.stage ?? ''}`.replace(/ · stage $/, '') : 'New run'));
    battle.addEventListener('click', () => this.go(has ? this.hooks.onContinue : this.hooks.onNew));
    go.append(battle);
    if (has) {
      const fresh = el('button', 'hmLink', 'Start a new run');
      fresh.addEventListener('click', () => this.go(this.hooks.onNew));
      go.append(fresh);
    }
    front.append(cards, go);
    page.append(front);
  }

  private drawRecruit(): void {
    const m = this.meta;
    const page = this.pages.get('recruit')!;
    page.replaceChildren();
    const panel = el('div', 'hmPanel');
    panel.append(el('h2', '', 'Summoning hall'));
    const locked = ALL_HEROES.filter((k) => !m.unlocked.includes(k));
    const show = el('div', 'hmShow');
    for (const k of (locked.length ? locked : ALL_HEROES).slice(0, 4)) {
      const c = portrait(UNITS[k].sheet, 72, rarityOf(k));
      c.className = `r${rarityOf(k)}`;
      if (locked.length) c.style.filter = 'brightness(0.25)';
      show.append(c);
    }
    panel.append(show);
    panel.append(el('p', 'hint', `${m.unlocked.length} of ${ALL_HEROES.length} heroes recruited · an epic is guaranteed within ${PITY} pulls (${Math.max(0, PITY - m.dry)} to go)`));
    const sum = el('button', 'hmBig', 'Summon');
    sum.append(el('small', '', `1 pull ${PULL_COST} · 10 pulls ${PULL10_COST} crowns`));
    sum.addEventListener('click', () => this.hooks.onRecruit());
    panel.append(sum);
    page.append(panel);
  }

  private drawHeroes(): void {
    const page = this.pages.get('heroes')!;
    page.replaceChildren();
    const panel = el('div', 'hmPanel wide');
    drawHeroGrid(panel, this.meta, (kind) => this.openSheet(kind));
    page.append(panel);
  }

  private drawCastle(): void {
    const m = this.meta;
    const page = this.pages.get('castle')!;
    page.replaceChildren();
    const panel = el('div', 'hmPanel wide');
    const links = el('div', 'hmLinks');
    const ach = el('button', 'hmCard');
    const got = ACHIEVEMENTS.filter((a) => m.achievements.includes(a.id)).length;
    ach.append(icon(ICONS.trophy), el('b', '', 'Achievements'), el('small', '', `${got} of ${ACHIEVEMENTS.length}`));
    if (m.achievements.length > seenCount()) ach.append(el('i', 'badge'));
    ach.addEventListener('click', () => this.openSub('Achievements', (b) => drawAchievements(b, this.meta)));
    const set = el('button', 'hmCard');
    set.append(el('span', 'gearIcon', '⚙'), el('b', '', 'Settings'), el('small', '', 'sound, speed, more'));
    set.addEventListener('click', () => openSettings());
    links.append(ach, set);
    panel.append(links, el('p', 'hint', 'Upgrades last for every run you start from now on.'));
    for (const id of BUILDING_IDS) panel.append(this.buildingRow(id));
    panel.append(resetTipsButton());
    page.append(panel);
  }

  private drawSpells(): void {
    const page = this.pages.get('spells')!;
    page.replaceChildren();
    const panel = el('div', 'hmPanel');
    panel.append(el('h2', '', 'Spells'), icon(ICONS.spells, 'ico big'), el('p', 'hint', 'Coming soon: the king\'s spellbook.'));
    page.append(panel);
  }

  private buildingRow(id: BuildingId): HTMLElement {
    const m = this.meta;
    const b = BUILDINGS[id];
    const level = m.castle[id];
    const row = el('div', 'brow hmBuild');
    const text = el('div');
    const name = el('b', '', `${b.name} · level ${level}/${maxLevel(id)}`);
    const pips = el('span', 'pips', '◆'.repeat(level) + '◇'.repeat(maxLevel(id) - level));
    text.append(name, pips, el('em', '', `Each level: ${b.perLevel}`));
    const buy = el('button', '');
    const cost = nextCost(m.castle, id);
    buy.textContent = cost === null ? 'Full' : `Build · ${cost}`;
    buy.disabled = cost === null || m.crowns < cost;
    if (!buy.disabled) buy.classList.add('primary');
    buy.addEventListener('click', () => {
      if (!upgrade(m, id)) return;
      saveMeta(m);
      this.refresh();
    });
    row.append(icon(BUILDING_ICON[id], 'ico big'), text, buy);
    return row;
  }

  private openSheet(kind: string): void {
    this.closeSheet();
    $('hmSheet').hidden = false;
    this.stopSheet = drawHeroSheet($('hmSheetBox'), this.meta, kind, () => this.closeSheet());
  }

  private closeSheet(): void {
    this.stopSheet?.();
    this.stopSheet = null;
    $('hmSheet').hidden = true;
  }

  private openSub(title: string, draw: (body: HTMLElement) => void): void {
    $('hmSub').hidden = false;
    $('hmSubTitle').textContent = title;
    const body = $('hmSubBody');
    body.replaceChildren();
    draw(body);
    // (looking at the achievements clears the badge)
    try {
      localStorage.setItem(SEEN, String(this.meta.achievements.length));
    } catch {
      /* private mode: the badge just stays */
    }
    this.refresh();
  }

  private closeSub(): void {
    $('hmSub').hidden = true;
  }
}
