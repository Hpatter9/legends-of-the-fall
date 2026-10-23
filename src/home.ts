// The home screen (#home), King God Castle style: a top bar (crowns, gold, best stage), five pages behind a bottom tab
// bar (Recruit, Heroes, Battle in the middle, Castle, Spells) that slide as you switch, and the Battle page as the hub
// with a lively scene, the stage banner, one big Battle button and the daily and tower cards. The pages re-house the
// older screens (gacha, modes, achievements, settings, castle upgrades); it only reads and changes the Meta through the
// sim's own functions.

import { BUILDING_IDS, BUILDINGS, buildMs, canBuildChapel, CHAPEL_COST, CHAPEL_MS, chapelBuilt, clockText, maxLevel, nextCost, settleWorks, startBuild, startChapel, worksLeft, type BuildingId, type BuildSite } from './sim/castle';
import { CastleScene, lookPicture } from './castle';
import { BLURB, effectText } from './render/castleSpots';
import { pullCost, saveMeta, type Meta, type Pull } from './sim/meta';
import { dailyLine, towerOpen } from './sim/modes';
import { CAL_MAPS } from './sim/calamity';
import { ARMIES, armyById, armyCleared, armyIsNew, armyStars, armyUnlocked, bossOf, clearedCount, markSeen } from './sim/armies';
import { ACHIEVEMENTS, claimAchievement, unclaimed } from './sim/achievements';
import { play } from './render/sound';
import type { HomeSpot } from './render/audioRules';
import { UNITS } from './sim/units';
import { drawArmies } from './armiesView';
import { drawChestStash } from './chestStash';
import { drawAchievements } from './achievementsView';
import { drawCodex, stopCodex } from './codexView';
import { claimCodex, codexWaiting, gotOf, totalOf } from './sim/codex';
import { todayKey } from './modes';
import { openSettings } from './settings';
import { resetTipsButton, tips } from './tips';
import { ICONS, icon } from './menuArt';
import { drawHeroSheet, drawRoster, strongest } from './menuHeroes';
import { Tavern } from './tavern';
import { SummoningHall } from './hall';
import { Library } from './library';
import { CampScene } from './camp';

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
  /** The saved run's stage and gold, if there is one going: with the army it fights (none for a daily, tower or older run) and a line naming it. */
  runInfo?(): { stage: number; gold: number; army?: string; label: string } | null;
  onContinue(): void;
  /** Start an army from wave 1 (the page picks the party first). */
  onArmy(id: string, tier: number, auto?: number): void;
  /** Opens the party screen to change the party (the Battle page's Party button). */
  onParty(): void;
  /** Opens the collection screen (the heroes, their ranks and the odds). */
  onRecruit(): void;
  /** Does a pull of `count`, calling `play` with the heroes it gave so the hall can show them, then opens the card reveal. */
  onSummon?(count: 1 | 10, play: (got: Pull[]) => Promise<void>): void;
  onDaily(): void;
  onTower(): void;
  /** Opens the calamity: the saved run's map, or the choice of a starting hero. */
  onCalamity(): void;
  /** A line about the tower's or the calamity's saved run ("Floor 7 · continue"), or null when there is none going. */
  slotInfo?(kind: 'tower' | 'calamity'): string | null;
  /** The home screen's tab, or the armies, changed (or it was left): the ambience follows (`spot`). */
  onScene?(): void;
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
  private camp: CampScene;
  private stopSheet: (() => void) | null = null;
  private tavern: Tavern;
  private castle: CastleScene;
  private hall: SummoningHall;
  private library = new Library(() => this.show('castle'));
  private castleBar = el('div', 'ctBar');
  private cardOpen = false;

  constructor(
    private meta: Meta,
    private hooks: HomeHooks,
  ) {
    // (the Battle page is the war camp: tapping a hero opens their sheet, the war table opens the party)
    this.camp = new CampScene((kind) => this.openSheet(kind), () => this.go(this.hooks.onParty));
    this.tavern = new Tavern((kind) => this.openSheet(kind), () => this.openRoster());
    // (the tavern leads to the Heroes tab, the chapel to the Spells tab and the signpost to the battle screen; the six upgrades open their cards)
    this.hall = new SummoningHall({
      onSummon: (n) => {
        // (the gacha pulls and keeps the result; the hall plays it, then the usual card reveal opens over the page)
        if (this.hooks.onSummon) this.hooks.onSummon(n, (got) => this.hall.play(got).then(() => this.hall.stop()));
        else this.hooks.onRecruit();
      },
      onCollection: () => {
        this.hall.stop();
        this.hooks.onRecruit();
      },
    });
    this.castle = new CastleScene((id) => (id === 'tavern' ? this.show('heroes') : id === 'chapel' ? (chapelBuilt(this.meta) ? this.show('spells') : this.openChapel()) : id === 'armies' ? this.show('battle') : this.openBuilding(id)));
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
    // (the recruit page is the summoning hall and the spells page the library: each draws once and keeps its place)
    this.pages.get('recruit')!.append(this.hall.root);
    this.pages.get('spells')!.append(this.library.root);
    // (the heroes page is the tavern: it draws once and keeps its place while you switch tabs)
    this.pages.get('heroes')!.append(this.tavern.root);
    // (the castle page is the courtyard, with its shortcut buttons on top)
    this.pages.get('castle')!.append(this.castleBar, this.castle.root);
    // (the battle page keeps the camp behind its own content)
    this.pages.get('battle')!.append(this.camp.root);
    $('hmTrophy').addEventListener('click', () => this.openAchievements());
    $('hmGear').addEventListener('click', () => openSettings());
    $('hmSubBack').addEventListener('click', () => this.closeSub());
    $('hmSheet').addEventListener('click', (e) => e.target === $('hmSheet') && this.closeSheet());
    // (the builders' clock: once a second while something is going up, the countdowns tick and a finished build is raised)
    setInterval(() => this.tickWorks(), 1000);
  }

  /** The builders' second: raise what is done (saved, with its build in the courtyard), else tick the countdowns on the page. */
  private tickWorks(): void {
    const m = this.meta;
    if (!m.works) return;
    if (settleWorks(m, Date.now())) {
      saveMeta(m);
      this.refresh();
      // (an open card redraws with the new level)
      if (this.cardOpen && this.cardFor) this.cardFor === 'chapel' ? this.openChapel() : this.openBuilding(this.cardFor);
      return;
    }
    const left = clockText(worksLeft(m, Date.now()));
    for (const e of document.querySelectorAll<HTMLElement>('.worksLeft')) e.textContent = left;
    if (this.isOpen && this.tab === 'castle') this.castle.update(m);
  }

  /** What the builders are up to, for a card's button: busy here (with the time left), busy elsewhere, or free. */
  private worksOn(site: BuildSite): 'here' | 'elsewhere' | null {
    const w = this.meta.works;
    return !w ? null : w.id === site ? 'here' : 'elsewhere';
  }
  private cardFor: BuildSite | null = null;

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

  /** Where on the home screen the player is, for the ambience: the armies if that screen is up, else the tab; null off the home screen. */
  get spot(): HomeSpot | null {
    if (!this.isOpen) return null;
    return !$('hmSub').hidden && $('hmSub').classList.contains('armies') ? 'armies' : this.tab;
  }

  private go(then: () => void): void {
    $('home').hidden = true;
    this.camp.stop();
    this.tavern.stop();
    this.castle.stop();
    this.hall.stop();
    this.library.stop();
    this.note = '';
    this.hooks.onScene?.();
    then();
  }

  private show(tab: Tab): void {
    this.tab = tab;
    // (the tab bar stays under the armies: a tap on it leaves them)
    if ($('hmSub').classList.contains('armies')) this.closeSub();
    this.refresh();
  }

  /** Redraw the page that is showing (after crowns or unlocks change elsewhere). */
  refresh(): void {
    if (!this.isOpen) return;
    const m = this.meta;
    // (a build that finished while the game was away stands now)
    if (settleWorks(m, Date.now())) saveMeta(m);
    const info = this.hooks.runInfo?.() ?? null;
    // top bar
    $('hmCrowns').replaceChildren(icon(ICONS.crowns), el('b', '', String(m.crowns)));
    $('hmGold').hidden = !info;
    if (info) $('hmGold').replaceChildren(icon(ICONS.gold), el('b', '', String(info.gold)));
    const stars = ARMIES.reduce((n, a) => n + armyStars(m, a).got, 0);
    $('hmBest').textContent = `Armies ${clearedCount(m)}/${ARMIES.length} · ★ ${stars}`;
    const fresh = m.achievements.length > seenCount() || unclaimed(m).length > 0;
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
    this.tabBtns.get('castle')!.classList.toggle('new', affordable || canBuildChapel(m) || fresh);
    this.tabBtns.get('recruit')!.classList.toggle('new', m.crowns >= pullCost(1));
    this.tabBtns.get('battle')!.classList.toggle('new', !m.daily[String(todayKey())] || ARMIES.some((a) => armyIsNew(m, a.id)));
    this.drawBattle();
    this.tavern.update(m);
    this.drawCastle();
    this.castle.update(m);
    this.hall.update(m);
    this.library.update(m);
    this.hooks.onScene?.();
    // (the camp only moves while the Battle tab shows, and not under a hero sheet)
    if (this.tab === 'battle' && $('hmSheet').hidden) this.camp.start();
    else this.camp.stop();
    // (the tavern only moves while it is showing, and not under a hero sheet)
    if (this.tab === 'heroes' && $('hmSheet').hidden) this.tavern.start();
    else this.tavern.stop();
    // (the hall and the library move only while their tab shows; a pull in flight is not cut short by a redraw)
    if (this.tab === 'recruit' && $('gacha').hidden) this.hall.start();
    else if (this.tab !== 'recruit') this.hall.stop();
    if (this.tab === 'spells') this.library.start();
    else this.library.stop();
    // (the courtyard moves only while it is showing, and not under a building card)
    if (this.tab === 'castle' && !this.cardOpen) this.castle.start();
    else this.castle.stop();
  }

  private drawBattle(): void {
    const m = this.meta;
    const page = this.pages.get('battle')!;
    const info = this.hooks.runInfo?.() ?? null;
    // (the war table shows the army in the run, else the first army open that is not cleared yet, else the newest)
    const open = ARMIES.filter((a) => armyUnlocked(m, a.id));
    const front = open.find((a) => !armyCleared(m, a.id)) ?? open[open.length - 1] ?? ARMIES[0];
    const army = info?.army ? armyById(info.army) : undefined;
    const next = army ?? front;
    // (the party stands round the fire, the strongest in the middle)
    const party = strongest(m, 99).filter((k) => m.party.includes(k));
    const boss = UNITS[bossOf(next)];
    page.querySelector('.hmFront')?.remove();
    // (the bottom bar, below the camp's picture so it covers none of it: what the next fight is, then Party, Battle! and Continue)
    const fr = el('div', 'hmFront');
    if (this.note) fr.append(el('div', 'hmNote', this.note));
    // (the run's wave is shown once, on Continue: the ribbon names the army alone, or the next army when no run is going)
    fr.append(el('div', 'hmBanner', info ? (army ? army.name : `${next.name}`) : `${next.name} · next`));
    const go = el('div', 'hmGo');
    const has = this.hooks.hasRun();
    const party2 = el('button', 'hmLink hmSide', 'Party');
    party2.id = 'hmParty';
    party2.addEventListener('click', () => this.go(this.hooks.onParty));
    const battle = el('button', 'hmBattle');
    battle.id = 'hmBattle';
    battle.append(el('span', '', 'Battle!'));
    battle.setAttribute('aria-label', ARMIES.some((a) => armyIsNew(m, a.id)) ? 'Battle! A new army marches. Choose an army' : 'Battle! Choose an army');
    if (ARMIES.some((a) => armyIsNew(m, a.id))) battle.append(el('i', 'badge'));
    battle.addEventListener('click', () => this.openArmies());
    go.append(party2, battle);
    if (has) {
      const cont = el('button', 'hmLink hmSide hmCont');
      cont.append(el('b', '', 'Continue'), el('small', '', army && info ? `wave ${info.stage}/${army.waves.length}` : info ? info.label.replace(/^tower · /, '') : 'run'));
      cont.addEventListener('click', () => this.go(this.hooks.onContinue));
      go.append(cont);
    } else go.append(el('span', 'hmSpacer'));
    fr.append(go);
    // (the camp's places, each tapped in the scene: a picture with its name plate under it)
    const place = (id: string, cls: string, title: string, line: string, label: string, onTap: () => void): HTMLButtonElement => {
      const b = el('button', `cpPlace ${cls}`.trim());
      if (id) b.id = id;
      const tag = el('span', 'cpTag');
      tag.append(el('b', '', title), el('small', '', line));
      b.append(tag);
      b.setAttribute('aria-label', label);
      b.addEventListener('click', onTap);
      return b;
    };
    // (the Daily board: a new daily wears the red dot; a done one a green check)
    const today = m.daily[String(todayKey())];
    const dailyLineText = today ? 'done today' : dailyLine(m, todayKey()).replace('Daily challenge · ', '');
    const daily = place('hmDaily', today ? 'daily done' : 'daily', 'Daily', dailyLineText, `Daily challenge: ${dailyLineText}`, () => this.go(this.hooks.onDaily));
    if (today) {
      const tick = el('i', 'dailyDone');
      tick.setAttribute('role', 'img');
      tick.setAttribute('aria-label', 'Done today');
      daily.append(tick);
    } else daily.append(el('i', 'badge'));
    // (the Tower: shut, dimmed and chained, until the first army is beaten; a climb begun stays open whatever the unlock says)
    const climbing = this.hooks.slotInfo?.('tower');
    const towerUp = towerOpen(m) || !!climbing;
    const towerLine2 = climbing ?? (towerOpen(m) ? (m.tower ? `best ${m.tower}` : 'not climbed yet') : `opens after ${ARMIES[0].name.split(' ')[0]}s`);
    const tower = place('hmTower', towerUp ? '' : 'locked', 'Tower', towerLine2, `Endless tower: ${towerLine2}`, () => this.go(this.hooks.onTower));
    tower.disabled = !towerUp;
    // (the Calamity: the portal; the plate carries the saved run or the best)
    const going = this.hooks.slotInfo?.('calamity');
    const calLine = going ?? (m.calamity?.best ? `best ${m.calamity.best} of ${CAL_MAPS}` : 'one hero');
    const calamity = place('hmCalamity', '', 'Calamity', calLine, `The Calamity portal: ${calLine}`, () => this.go(this.hooks.onCalamity));
    this.camp.dailySlot.replaceChildren(daily);
    this.camp.towerSlot.replaceChildren(tower);
    this.camp.calamitySlot.querySelector('.cpPlace')?.remove();
    this.camp.calamitySlot.append(calamity);
    this.camp.update(m, party, { army: next, boss: boss.name, sheet: boss.sheet }, !towerUp);
    // (the chest stash: the chests the armies' stars have earned sit on the camp's cart, on the left)
    const stash = el('div', 'csStash');
    drawChestStash(stash, m, () => {
      saveMeta(m);
      this.refresh();
    });
    this.camp.stashMount.replaceChildren(stash);
    page.append(fr);
  }

  /** The chips over the courtyard's sky: the achievements and settings shortcuts, the tips reset and a line of help. */
  private drawCastle(): void {
    const m = this.meta;
    const bar = this.castleBar;
    bar.replaceChildren();
    const row = el('div', 'ctChips');
    const got = ACHIEVEMENTS.filter((a) => m.achievements.includes(a.id)).length;
    const ach = el('button', 'ctChip');
    ach.append(icon(ICONS.trophy), el('b', '', 'Achievements'), el('small', '', `${got}/${ACHIEVEMENTS.length}`));
    if (m.achievements.length > seenCount() || unclaimed(m).length) ach.append(el('i', 'badge'));
    ach.addEventListener('click', () => this.openAchievements());
    const set = el('button', 'ctChip');
    set.append(el('span', 'gearIcon', '⚙'), el('b', '', 'Settings'));
    set.addEventListener('click', () => openSettings());
    // (the codex sits by the achievements: both are the records of the castle's library of deeds; its badge shows a milestone to claim)
    const cdx = el('button', 'ctChip');
    cdx.append(icon(ICONS.spells), el('b', '', 'Codex'), el('small', '', `${gotOf(m, 'bestiary') + gotOf(m, 'heroes')}/${totalOf('bestiary') + totalOf('heroes')}`));
    if (codexWaiting(m).length) cdx.append(el('i', 'badge'));
    cdx.addEventListener('click', () => this.openCodex());
    row.append(ach, cdx, set, resetTipsButton());
    bar.append(row, el('div', 'ctHelp', 'tap a building to upgrade it · drag to look round'));
  }

  /** A building's upgrade card (over the courtyard): what it gives now and next, its cost, and the Build button. */
  private openBuilding(id: BuildingId): void {
    this.closeSheet();
    this.cardOpen = true;
    this.castle.stop();
    $('hmSheet').hidden = false;
    const box = $('hmSheetBox');
    box.className = 'hsheet bcard';
    this.drawBuildingCard(box, id);
  }

  /** The Chapel's card (over the courtyard): what it opens, its one price and the Build button. */
  private openChapel(): void {
    this.closeSheet();
    this.cardOpen = true;
    this.castle.stop();
    $('hmSheet').hidden = false;
    const box = $('hmSheetBox');
    box.className = 'hsheet bcard';
    const m = this.meta;
    box.replaceChildren();
    const head = el('div', 'bhead');
    const pic = el('img', 'bpic');
    pic.src = lookPicture('chapel', 0);
    pic.alt = '';
    pic.draggable = false;
    const title = el('div');
    title.append(el('h3', '', 'Chapel'), el('em', '', m.works?.id === 'chapel' ? 'being built' : 'not built yet'));
    head.append(pic, title);
    box.append(head, el('p', 'hint', 'A place to study the king\'s spells: opens the spellbook.'), el('p', 'hint', 'One purchase, no levels. Your starting spells still work in fights until then.'));
    this.cardFor = 'chapel';
    const buy = this.buildButton('chapel', CHAPEL_COST, CHAPEL_MS, canBuildChapel(m), () => startChapel(m, Date.now()));
    const done = el('button', '', 'Close');
    done.addEventListener('click', () => this.closeSheet());
    const row = el('div', 'brow2');
    row.append(buy, done);
    box.append(row);
  }

  private drawBuildingCard(box: HTMLElement, id: BuildingId): void {
    const m = this.meta;
    const b = BUILDINGS[id];
    const level = m.castle[id];
    const top = maxLevel(id);
    box.replaceChildren();
    const head = el('div', 'bhead');
    const pic = el('img', 'bpic');
    pic.src = lookPicture(id, level);
    pic.alt = '';
    pic.draggable = false;
    const title = el('div');
    title.append(el('h3', '', b.name), el('span', 'pips', '◆'.repeat(level) + '◇'.repeat(top - level)), el('em', '', m.works?.id === id ? `building level ${m.works.level}` : level === 0 ? 'not built yet' : `level ${level} of ${top}`));
    head.append(pic, title);
    box.append(head, el('p', 'hint', BLURB[id]));
    const now = el('p');
    now.append(el('i', '', 'Now: '), level === 0 ? 'nothing yet' : effectText(id, level));
    box.append(now);
    const cost = nextCost(m.castle, id);
    if (cost !== null) {
      const next = el('p');
      next.append(el('i', '', `Level ${level + 1}: `), effectText(id, level + 1));
      box.append(next);
    } else box.append(el('p', 'hint', 'Fully built.'));
    box.append(el('p', 'hint', `Each level: ${b.perLevel}. Upgrades last for every run you start from now on.`));
    this.cardFor = id;
    const buy = this.buildButton(id, cost, cost === null ? 0 : buildMs(id, level + 1), cost !== null && m.crowns >= cost, () => startBuild(m, id, Date.now()));
    const done = el('button', '', 'Close');
    done.addEventListener('click', () => this.closeSheet());
    const row = el('div', 'brow2');
    row.append(buy, done);
    box.append(row);
  }

  /** A card's Build button: the price and how long it takes; "Building · 4:05" while it goes up; greyed while the builders are busy
   *  elsewhere (a hint says where); "Full" at the top. A tap pays and starts the works, and the card shows the countdown. */
  private buildButton(site: BuildSite, cost: number | null, ms: number, affordable: boolean, start: () => boolean): HTMLElement {
    const wrap = el('div', 'buildBtn');
    const buy = el('button', '');
    const on = this.worksOn(site);
    if (on === 'here') {
      buy.append('Building · ', el('span', 'worksLeft', clockText(worksLeft(this.meta, Date.now()))));
      buy.disabled = true;
    } else if (cost === null) {
      buy.textContent = 'Full';
      buy.disabled = true;
    } else {
      buy.textContent = `Build · ${cost} · ${clockText(ms)}`;
      buy.disabled = on === 'elsewhere' || !affordable;
      if (!buy.disabled) buy.classList.add('primary');
    }
    buy.addEventListener('click', () => {
      if (!start()) return;
      saveMeta(this.meta);
      this.refresh();
      site === 'chapel' ? this.openChapel() : this.openBuilding(site);
    });
    wrap.append(buy);
    if (on === 'elsewhere') {
      const w = this.meta.works!;
      const name = w.id === 'chapel' ? 'Chapel' : BUILDINGS[w.id].name;
      const hint = el('p', 'hint', `The builders are at the ${name}: `);
      hint.append(el('span', 'worksLeft', clockText(worksLeft(this.meta, Date.now()))), ' left.');
      wrap.append(hint);
    }
    return wrap;
  }

  /** The roster page: every hero, the locked ones with how to get them. */
  private openRoster(): void {
    this.closeSheet();
    $('hmSheet').hidden = false;
    this.tavern.stop();
    this.camp.stop();
    drawRoster($('hmSheetBox'), this.meta, (kind) => this.openSheet(kind), () => this.closeSheet());
  }

  private openSheet(kind: string): void {
    this.closeSheet();
    $('hmSheet').hidden = false;
    this.tavern.stop();
    this.camp.stop();
    this.stopSheet = drawHeroSheet($('hmSheetBox'), this.meta, kind, () => this.closeSheet());
  }

  private closeSheet(): void {
    this.stopSheet?.();
    this.stopSheet = null;
    $('hmSheet').hidden = true;
    this.cardOpen = false;
    this.cardFor = null;
    if (this.isOpen && this.tab === 'heroes') this.tavern.start();
    if (this.isOpen && this.tab === 'battle') this.camp.start();
    if (this.isOpen && this.tab === 'castle') this.castle.start();
  }

  /** The Armies screen, over the home screen (the Battle button, and the unlock moment's way on). */
  openArmies(focus?: string): void {
    $('home').hidden = false;
    this.openSub(
      'Armies',
      (body) =>
        drawArmies(body, this.meta, {
          running: this.hooks.runInfo?.() ?? null,
          onContinue: () => this.go(this.hooks.onContinue),
          onFight: (id, tier, auto) => this.go(() => this.hooks.onArmy(id, tier, auto)),
          focus,
          onBack: () => this.closeSub(),
        }),
      false,
      true,
    );
    // (the cards a new army lit have been seen now: they glow no more the next time)
    if (markSeen(this.meta)) saveMeta(this.meta);
  }

  /** The achievements page; a Claim takes the crowns, saves, and draws the page again. */
  private openAchievements(): void {
    const draw = (b: HTMLElement) =>
      drawAchievements(b, this.meta, (ids) => {
        const paid = ids.reduce((n, id) => n + claimAchievement(this.meta, id), 0);
        if (!paid) return;
        saveMeta(this.meta);
        play('coinClaim');
        b.replaceChildren();
        draw(b);
        this.refresh();
      });
    this.openSub('Achievements', draw);
  }

  /** The codex page; a Claim takes a milestone's crowns, saves, and draws the page again. */
  private openCodex(): void {
    const draw = (b: HTMLElement) =>
      drawCodex(b, this.meta, (id) => {
        if (!claimCodex(this.meta, id)) return;
        saveMeta(this.meta);
        play('coinClaim');
        const keep = b.scrollTop;
        b.replaceChildren();
        draw(b);
        b.scrollTop = keep;
        this.refresh();
      });
    this.openSub('Codex', draw, false);
    $('hmSub').classList.add('codex');
  }

  private openSub(title: string, draw: (body: HTMLElement) => void, achievements = true, full = false): void {
    $('hmSub').hidden = false;
    // (the armies fill the page between the top bar and the tabs, with no header of their own)
    $('hmSub').classList.toggle('armies', full);
    $('hmSub').classList.remove('codex');
    stopCodex();
    $('hmSubBody').classList.remove('asBody');
    $('hmSubTitle').textContent = title;
    const body = $('hmSubBody');
    body.replaceChildren();
    draw(body);
    // (looking at the achievements clears the badge)
    if (achievements)
      try {
        localStorage.setItem(SEEN, String(this.meta.achievements.length));
      } catch {
        /* private mode: the badge just stays */
      }
    this.refresh();
  }

  private closeSub(): void {
    stopCodex();
    $('hmSub').hidden = true;
    this.hooks.onScene?.();
  }
}
