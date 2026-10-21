// The home screen (#home): the king's castle between runs. A menu (Continue, New run, Recruit, Heroes, Castle) over a
// castle picture; the Heroes page shows every hero with its skill, passive and stats, the Castle page sells lasting
// upgrades for crowns. It only reads and changes the Meta through the sim's own functions.

import castleUrl from './art/home/castle.png';
import { ALL_HEROES, UNITS } from './sim/units';
import { KITS } from './sim/abilities';
import { BUILDING_IDS, BUILDINGS, maxLevel, nextCost, upgrade, type BuildingId } from './sim/castle';
import { traitsOf, TRAITS } from './sim/traits';
import { rarityOf, saveMeta, starSummary, type Meta } from './sim/meta';
import { progressOf, xpOf } from './sim/levels';
import { portrait } from './render/sheets';
import { openSettings } from './settings';
import { resetTipsButton, tips } from './tips';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const RARITY = ['', 'Common', 'Rare', 'Epic'];

export interface HomeHooks {
  /** Whether a run is saved and not over. */
  hasRun(): boolean;
  onContinue(): void;
  onNew(): void;
  onRecruit(): void;
}

export class Home {
  private view: 'menu' | 'heroes' | 'castle' = 'menu';
  private note = '';

  constructor(
    private meta: Meta,
    private hooks: HomeHooks,
  ) {
    $('home').style.backgroundImage = `url(${castleUrl})`;
    $('homeContinue').addEventListener('click', () => this.go(this.hooks.onContinue));
    $('homeNew').addEventListener('click', () => this.go(this.hooks.onNew));
    $('homeRecruit').addEventListener('click', () => this.hooks.onRecruit());
    $('homeHeroes').addEventListener('click', () => this.show('heroes'));
    $('homeCastle').addEventListener('click', () => this.show('castle'));
    $('homeSettings').addEventListener('click', () => openSettings());
    $('homeBack').addEventListener('click', () => this.show('menu'));
  }

  /** Open the home screen; `note` is a line shown at the top (the last run's end). */
  open(note = this.note): void {
    this.note = note;
    $('home').hidden = false;
    this.show('menu');
    tips.offer('home', $('homeNew'));
    // (a run has just ended: the crowns are there to spend)
    if (note) tips.offer('crowns', $('homeMenu'));
  }

  get isOpen(): boolean {
    return !$('home').hidden;
  }

  private go(then: () => void): void {
    $('home').hidden = true;
    this.note = '';
    then();
  }

  private show(view: 'menu' | 'heroes' | 'castle'): void {
    this.view = view;
    this.refresh();
  }

  /** Redraw the page that is showing (after crowns or unlocks change elsewhere). */
  refresh(): void {
    const menu = this.view === 'menu';
    $('homeMenu').hidden = !menu;
    $('homePage').hidden = menu;
    $('homeCrowns').textContent = `${this.meta.crowns} crowns`;
    const best = starSummary(this.meta);
    $('homeBest').textContent = best ? `Best: stage ${best.stage}, ${best.total} stars` : '';
    $('homeBest').hidden = !best;
    $('homeNote').textContent = menu ? this.note : '';
    $('homeNote').hidden = !menu || !this.note;
    ($('homeContinue') as HTMLButtonElement).hidden = !this.hooks.hasRun();
    if (menu) return;
    $('homeTitle').textContent = this.view === 'heroes' ? 'Heroes' : 'Castle';
    const body = $('homeBody');
    body.replaceChildren();
    if (this.view === 'heroes') this.drawHeroes(body);
    else this.drawCastle(body);
  }

  private drawHeroes(body: HTMLElement): void {
    const have = ALL_HEROES.filter((k) => this.meta.unlocked.includes(k)).length;
    const count = document.createElement('p');
    count.className = 'hint';
    count.textContent = `${have} of ${ALL_HEROES.length} heroes unlocked. Recruit more with crowns.`;
    body.append(count);
    for (const kind of ALL_HEROES) {
      const def = UNITS[kind];
      const open = this.meta.unlocked.includes(kind);
      const kit = KITS[kind];
      const row = document.createElement('div');
      row.className = `hrow r${rarityOf(kind)}${open ? '' : ' locked'}`;
      const text = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = open ? def.name : '???';
      const tag = document.createElement('em');
      tag.textContent = open ? `${RARITY[rarityOf(kind)]} · ${def.role}` : `${RARITY[rarityOf(kind)]} · not yet recruited`;
      text.append(name, tag);
      if (open) {
        const marks = document.createElement('em');
        marks.textContent = traitsOf(kind).map((t) => TRAITS[t].name).join(' · ');
        text.append(marks);
        const stats = document.createElement('span');
        stats.textContent = `HP ${def.hp} · Atk ${def.atk} · Def ${def.def} · Range ${def.range}`;
        text.append(stats);
        const p = progressOf(xpOf(this.meta, kind));
        const level = document.createElement('span');
        level.textContent = p.need ? `Level ${p.level} · ${p.into} of ${p.need} XP to level ${p.level + 1}` : `Level ${p.level} · max`;
        const bar = document.createElement('div');
        bar.className = 'xpbar';
        const fill = document.createElement('span');
        fill.style.width = `${p.need ? (p.into / p.need) * 100 : 100}%`;
        bar.append(fill);
        text.append(level, bar);
        if (kit) {
          const skill = document.createElement('p');
          skill.innerHTML = '';
          const s = document.createElement('i');
          s.textContent = `${kit.skill.name}: `;
          skill.append(s, kit.skill.text);
          const pas = document.createElement('p');
          const q = document.createElement('i');
          q.textContent = `${kit.passive.name}: `;
          pas.append(q, kit.passive.text);
          text.append(skill, pas);
        }
      }
      row.append(portrait(def.sheet, 72), text);
      body.append(row);
    }
  }

  private drawCastle(body: HTMLElement): void {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Upgrades last for every run you start from now on.';
    body.append(hint);
    for (const id of BUILDING_IDS) body.append(this.buildingRow(id));
    body.append(resetTipsButton());
  }

  private buildingRow(id: BuildingId): HTMLElement {
    const m = this.meta;
    const b = BUILDINGS[id];
    const level = m.castle[id];
    const row = document.createElement('div');
    row.className = 'brow';
    const text = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = `${b.name} · level ${level}/${maxLevel(id)}`;
    const pips = document.createElement('span');
    pips.className = 'pips';
    pips.textContent = '◆'.repeat(level) + '◇'.repeat(maxLevel(id) - level);
    const what = document.createElement('em');
    what.textContent = `Each level: ${b.perLevel}`;
    text.append(name, pips, what);
    const buy = document.createElement('button');
    const cost = nextCost(m.castle, id);
    buy.textContent = cost === null ? 'Full' : `Build · ${cost}`;
    buy.disabled = cost === null || m.crowns < cost;
    buy.addEventListener('click', () => {
      if (!upgrade(m, id)) return;
      saveMeta(m);
      this.refresh();
    });
    row.append(text, buy);
    return row;
  }
}
