// A painted room with five interchangeable guests. Character illustrations stay
// separate from the background so every save shows its own strongest company.
import type { Meta } from './sim/meta';
import type { TavernElders, TavernQuests, TavernShop, TavernUpgrades } from './tavern';
import { tavernCompany, tavernGuestArt, TAVERN_SEATS } from './render/tavernCompany';
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
  private list = el('div', 'ptCompany');
  private count = el('small', 'ptCount');
  private upgradeBtn: HTMLButtonElement;
  private questBtn: HTMLButtonElement;
  private stallBtn: HTMLButtonElement;
  private eldersBtn: HTMLButtonElement;
  private trophy = new TrophyWallModal();
  private meta?: Meta;

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
    backdrop.alt = 'A candlelit tavern with an oak-beamed ceiling, a glowing hearth and Duchess resting beside it.';
    backdrop.draggable = false;
    const caption = el('p', 'ptCaption', 'Your strongest five · tap a hero');
    const rearTable = el('img', 'ptTable ptTableRear');
    rearTable.src = 'ui/tavern/table-rear.webp';
    rearTable.alt = '';
    const frontTable = el('img', 'ptTable ptTableFront');
    frontTable.src = 'ui/tavern/table-front.webp';
    frontTable.alt = '';
    rearTable.draggable = frontTable.draggable = false;
    this.scene.append(backdrop, this.guests, rearTable, frontTable, caption);
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
        guest.append(painting, el('span', 'ptGuestName', name));
        guest.addEventListener('click', () => this.onPick(kind));
      }
      guest.dataset.place = String(rank);
      guest.dataset.seat = TAVERN_SEATS[rank].id;
      const painting = guest.querySelector<HTMLImageElement>('.ptGuestArt')!;
      const nextArt = tavernGuestArt(kind, rank);
      if (painting.getAttribute('src') !== nextArt) painting.src = nextArt;
      guest.setAttribute('aria-label', `${name}, ${heroClassLabel(kind)}, Power ${powerText(power)}. Open hero`);
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
  }

  // Home keeps the same lifecycle for its scenes. This painted room is still art:
  // no animation loop or background work while another page or a sheet is showing.
  start(): void {}
  stop(): void {}
  paintOnce(): void {}
}
