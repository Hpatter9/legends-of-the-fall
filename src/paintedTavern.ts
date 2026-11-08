// A painted room with five interchangeable guests. Character illustrations stay
// separate from the background so every save shows its own strongest company.
import type { Meta } from './sim/meta';
import type { TavernElders, TavernQuests, TavernShop, TavernUpgrades } from './tavern';
import { tavernCompany, tavernGuestArt, TAVERN_SEATS, TAVERN_ACTIVITIES, tavernPlaces } from './render/tavernCompany';
import { heroArtwork } from './heroArtwork';
import { heroClassLabel, heroName } from './sim/heroNames';
import { levelOfKind } from './sim/levels';
import { powerText } from './sim/power';
import { ALL_HEROES } from './sim/units';
import { markReady } from './sim/upgradesReady';
import { questsWaiting } from './sim/quests';
import { hesterNews } from './render/tavernSpots';
import { todayKey } from './modes';
import { COMBAT_ART } from './combatArtAssets';
import { TrophyWallModal } from './trophyWall';
import { onSettings } from './settings';
// (Dynasties, phase 7: the ghosts of bearers slain under the Oath: pale at their own seat with a candle while the House mourns, then by
//  the hearth once the line has a bearer again)
import { cornerGhosts, ghostOf, mourners } from './sim/oath';
import { FATE_ICON } from './dynastyArt';

/** How many ghosts stand by the hearth at most. */
const HEARTH_GHOSTS = 3;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = cls;
  node.textContent = text;
  return node;
};

export class PaintedTavern {
  readonly root = el('div', 'ptTavern');
  private scene = el('div', 'ptScene');
  private guests = el('div', 'ptGuests');
  /** (Dynasties, phase 7) the ghosts by the hearth: not guests, so they cannot be tapped. */
  private ghosts = el('div', 'ptGhosts');
  private list = el('div', 'ptCompany');
  private count = el('small', 'ptCount');
  private upgradeBtn: HTMLButtonElement;
  private questBtn: HTMLButtonElement;
  private stallBtn: HTMLButtonElement;
  private eldersBtn: HTMLButtonElement;
  private trophy = new TrophyWallModal();
  private meta?: Meta;
  private active = false;

  constructor(
    private onPick: (kind: string) => void,
    onRoster: () => void,
    private quests?: TavernQuests,
    private upgrades?: TavernUpgrades,
    private shop?: TavernShop,
    private elders?: TavernElders,
  ) {
    const head = el('header', 'ptHead');
    const title = el('div');
    title.append(el('h2', '', 'The Tavern'), el('p', '', 'A hearth for your heroes'));
    const roster = this.button('All heroes', 'helmet', onRoster);
    roster.classList.add('ptRoster');
    head.append(title, roster);
    const backdrop = el('img', 'ptBackdrop');
    backdrop.src = 'ui/tavern-hearth.png';
    backdrop.alt = 'A busy candlelit tavern with a wooden bar, a dice table, supper and a glowing hearth.';
    backdrop.draggable = false;
    const caption = el('p', 'ptCaption', 'Your strongest five · tap a hero');
    const rearTable = el('img', 'ptTable ptTableRear');
    rearTable.src = 'ui/tavern/living-table-dice.webp';
    rearTable.alt = '';
    const frontTable = el('img', 'ptTable ptTableFront');
    frontTable.src = 'ui/tavern/living-table-supper.webp';
    frontTable.alt = '';
    rearTable.draggable = frontTable.draggable = false;
    const gwenArt = this.button('Talk to Gwen', 'keg', () => this.quests?.onGwen());
    gwenArt.className = 'ptKeeper';
    gwenArt.replaceChildren();
    gwenArt.setAttribute('aria-label', 'Gwen, tavern keeper. Talk to Gwen');
    const keeper = el('img');
    keeper.src = 'ui/tavern/living-gwen.webp';
    keeper.alt = '';
    keeper.draggable = false;
    gwenArt.append(keeper);
    gwenArt.hidden = !this.quests;
    const warmth = el('div', 'ptWarmth');
    warmth.setAttribute('aria-hidden', 'true');
    const dice = el('div', 'ptDice');
    dice.setAttribute('aria-hidden', 'true');
    dice.append(el('i'), el('i'));
    const steam = el('div', 'ptSteam');
    steam.setAttribute('aria-hidden', 'true');
    steam.append(el('i'), el('i'), el('i'));
    // Reuse the room's own counter as a foreground layer, hiding Gwen's lower
    // body behind the bar while the guests remain in front of both layers.
    const barFront = el('img', 'ptBarFront');
    barFront.src = backdrop.src;
    barFront.alt = '';
    barFront.draggable = false;
    this.ghosts.setAttribute('aria-hidden', 'true');
    this.scene.append(backdrop, warmth, gwenArt, barFront, this.ghosts, this.guests, rearTable, frontTable, dice, steam, caption);
    document.addEventListener('visibilitychange', () => this.syncMotion());
    onSettings(({ saver }) => this.root.classList.toggle('ptSaver', saver));
    this.syncMotion();
    const company = el('section', 'ptLedger');
    company.setAttribute('aria-label', 'Your strongest heroes');
    const heading = el('div', 'ptHeading');
    heading.append(el('h3', '', 'Your strongest heroes'), this.count);
    company.append(heading, el('p', 'ptHint', 'Ranked by Power · select a hero to manage them'), this.list);
    const actions = el('nav', 'ptActions');
    actions.setAttribute('aria-label', 'Tavern services');
    this.upgradeBtn = this.button('Upgrades', 'star', () => this.upgrades?.onUpgrades());
    this.questBtn = this.button('Quests', 'book', () => this.quests?.onQuests());
    this.stallBtn = this.button('Hester’s shop', 'bag', () => this.shop?.onStall());
    this.eldersBtn = this.button('Elders’ table', 'chalice', () => this.elders?.onElders());
    const board = this.button('Quest board', 'banner', () => this.quests?.onBoard());
    const gwen = this.button('Talk to Gwen', 'keg', () => this.quests?.onGwen());
    const trophies = this.button('Trophies', 'chalice', () => { if (this.meta) this.trophy.open(this.meta); });
    this.questBtn.hidden = board.hidden = gwen.hidden = !this.quests;
    this.stallBtn.hidden = !this.shop;
    actions.append(this.upgradeBtn, this.questBtn, this.stallBtn, board, gwen, trophies, this.eldersBtn);
    const sections = el('div', 'ptSections');
    sections.setAttribute('role', 'tablist');
    sections.setAttribute('aria-label', 'Tavern management');
    const panels = [company, actions];
    const tabs = ['Your heroes', 'Tavern services'].map((label, index) => {
      const tab = el('button', 'ptSectionTab', label);
      tab.type = 'button';
      tab.id = `ptTab${index}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `ptPanel${index}`);
      panels[index].id = `ptPanel${index}`;
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
        select(next);
        tabs[next].focus();
      });
      sections.append(tab);
      return tab;
    });
    const select = (index: number) => {
      tabs.forEach((tab, at) => {
        tab.setAttribute('aria-selected', String(at === index));
        tab.tabIndex = at === index ? 0 : -1;
        panels[at].hidden = at !== index;
      });
    };
    select(0);
    this.root.append(head, this.scene, sections, company, actions, this.trophy.root);
  }

  private button(label: string, icon: string, run: () => void): HTMLButtonElement {
    const button = el('button', 'ptButton');
    button.type = 'button';
    const image = el('img');
    image.src = COMBAT_ART[icon];
    image.alt = '';
    image.draggable = false;
    button.append(image, el('span', '', label));
    button.addEventListener('click', run);
    return button;
  }

  update(meta: Meta): void {
    this.meta = meta;
    const company = tavernCompany(meta);
    const owned = ALL_HEROES.filter((kind) => meta.unlocked.includes(kind));
    this.count.textContent = `${owned.length} recruited`;
    this.scene.querySelector('.ptCaption')!.textContent = `${company.length === 5 ? 'Your strongest five' : 'Your strongest heroes'} · tap a hero`;
    const ready = owned.filter((kind) => markReady(meta, kind)).length;
    this.upgradeBtn.hidden = !this.upgrades || !ready;
    this.upgradeBtn.querySelector('span')!.textContent = `Upgrades · ${ready}`;
    this.questBtn.classList.toggle('ptReady', questsWaiting(meta));
    const news = hesterNews(meta, todayKey());
    this.stallBtn.classList.toggle('ptReady', news.fresh || !!news.visitor);
    this.stallBtn.querySelector('span')!.textContent = news.visitor ? 'Trader visiting' : news.fresh ? 'Shop · new stock' : 'Hester’s shop';
    this.eldersBtn.hidden = !this.elders?.shown(meta);
    // Reuse each guest's image node while strength changes. No loading flash on refresh.
    const existing = new Map([...this.guests.querySelectorAll<HTMLButtonElement>('.ptGuest')].map((node) => [node.dataset.kind!, node]));
    const keep = new Set(company.map(({ kind }) => kind));
    for (const [kind, node] of existing) if (!keep.has(kind)) node.remove();
    this.list.replaceChildren();
    const places = tavernPlaces(company.map(hero => hero.kind));
    company.forEach(({ kind, power }, rank) => {
      const name = heroName(kind);
      let guest = existing.get(kind);
      if (!guest) {
        guest = el('button', 'ptGuest');
        guest.type = 'button';
        guest.dataset.kind = kind;
        const painting = el('img', 'ptGuestArt');
        painting.alt = '';
        painting.draggable = false;
        painting.decoding = 'async';
        const hit = el('span', 'ptGuestHit');
        hit.setAttribute('aria-hidden', 'true');
        guest.append(painting, el('span', 'ptGuestName', name), hit);
        guest.addEventListener('click', () => this.onPick(kind));
      }
      const place = places[rank];
      const activity = TAVERN_ACTIVITIES[kind as keyof typeof TAVERN_ACTIVITIES];
      guest.dataset.place = String(place);
      guest.dataset.motion = activity.motion;
      guest.dataset.seat = TAVERN_SEATS[place].id;
      guest.dataset.flip = String((place === 0 ? 'left' : place === 1 ? 'right' : 'left') !== activity.facing);
      guest.style.setProperty('--life-delay', `${-rank * 1.73}s`);
      // (Dynasties, phase 7: a guest whose bearer was slain under the Oath sits pale, a candle by it, until the next bearer comes)
      const ghost = !!ghostOf(meta, kind);
      guest.classList.toggle('ptGhost', ghost);
      guest.querySelector('.ptCandle')?.remove();
      if (ghost) {
        const candle = el('img', 'ptCandle');
        candle.src = FATE_ICON.fallen;
        candle.alt = '';
        candle.draggable = false;
        guest.append(candle);
      }
      const painting = guest.querySelector<HTMLImageElement>('.ptGuestArt')!;
      const nextArt = tavernGuestArt(kind);
      if (painting.getAttribute('src') !== nextArt) painting.src = nextArt;
      guest.setAttribute('aria-label', `${name}, ${heroClassLabel(kind)}, Power ${powerText(power)}. ${activity.label}. Open hero`);
      this.guests.append(guest);
      const row = el('div', 'ptHeroRow');
      const pick = el('button', 'ptHeroPick');
      pick.type = 'button';
      pick.dataset.kind = kind;
      const portrait = heroArtwork(kind);
      const words = el('span', 'ptHeroWords');
      words.append(el('b', '', name), el('small', '', `${heroClassLabel(kind)} · Level ${levelOfKind(meta, kind)}`));
      pick.append(portrait, words, el('span', 'ptPower', `Power ${powerText(power)}`));
      pick.addEventListener('click', () => this.onPick(kind));
      row.append(pick);
      if (this.upgrades && markReady(meta, kind)) {
        const rise = this.button('Upgrade', 'star', () => this.upgrades?.onRise(kind));
        rise.classList.add('ptRise');
        rise.setAttribute('aria-label', `Upgrade ${name}`);
        rise.title = `Upgrade ${name}`;
        row.append(rise);
      }
      this.list.append(row);
    });
    if (!company.length) this.list.append(el('p', 'ptHint', 'Recruit a hero to join you by the hearth.'));
    // (Dynasties, phase 7: the ghosts by the hearth: Houses in mourning whose hero is not among the guests, and the fallen elders whose
    //  Houses have a bearer again; three at most, still and pale)
    const seated = new Set(company.map((x) => x.kind));
    const by = [...mourners(meta, todayKey()).filter((k) => !seated.has(k)), ...cornerGhosts(meta).map((g) => g.kind)].filter((k, i, a) => a.indexOf(k) === i).slice(0, HEARTH_GHOSTS);
    this.ghosts.replaceChildren(
      ...by.map((kind, i) => {
        const g = el('img', 'ptHearthGhost');
        g.src = tavernGuestArt(kind);
        g.alt = '';
        g.draggable = false;
        g.dataset.at = String(i);
        return g;
      }),
    );
    this.scene.classList.toggle('ptHasPlayers', company.some(hero => hero.kind === 'knight' || hero.kind === 'barbarian'));
    this.scene.classList.toggle('ptHasSupper', company.length >= 5);
  }

  private syncMotion(): void {
    this.root.classList.toggle('ptAlive', this.active && !document.hidden);
  }

  start(): void { this.active = true; this.syncMotion(); }
  stop(): void { this.active = false; this.syncMotion(); }
  paintOnce(): void {}
}
