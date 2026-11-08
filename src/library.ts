// The painted arcane study behind the Spells tab. The spellbook owns the controls;
// this view owns only the room, the Chapel gate and visible-page ambient motion.
import { onSettings, settings } from './settings';
import { spellbookView } from './spellbook';
import { menuWell } from './ornateMenu';
import type { Meta } from './sim/meta';
import { spellsOpen } from './sim/castle';
import { schoolOf } from './sim/schools';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export class Library {
  readonly root = el('div', 'lbWrap');
  private scene = el('div', 'lbScene');
  private panel = el('div', 'lbPanel');
  private lock = menuWell(this.panel);
  private page = el('div', 'lbPage');
  private known = el('span', 'lbKnown');
  private school = el('p', 'lbSchool');
  private book = spellbookView(() => (this.known.textContent = this.book?.known() ?? ''));
  private running = false;

  constructor(onCastle: () => void = () => {}) {
    const painting = el('img', 'lbPainting');
    painting.src = 'ui/spells-study.png';
    painting.alt = 'A glowing spellbook in a candlelit study, beneath a moonlit stained-glass window';
    painting.decoding = 'async';
    const title = el('header', 'lbTitle');
    title.append(el('small', '', 'The royal library'), el('h2', '', 'Spellbook'), this.school);
    const magic = el('div', 'lbMagic');
    magic.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i++) magic.append(el('i'));
    this.scene.append(painting, title, magic);
    this.lock.classList.add('lbLock');
    const go = el('button', 'omPrimary lbGo', 'To the Castle');
    go.addEventListener('click', onCastle);
    this.lock.append(el('h2', '', 'A little magic awaits'), el('p', '', 'Build the Chapel in the Castle to open your spellbook.'), go);
    this.page.append(this.book.root);
    this.panel.append(this.page);
    const ledger = el('div', 'lbLedger');
    ledger.append(el('span', '', 'Study. Prepare. Command.'), this.known);
    this.root.append(this.scene, ledger, this.panel);
    this.known.textContent = this.book.known();
    onSettings(() => this.motion());
    document.addEventListener('visibilitychange', () => this.motion());
  }

  update(meta: Meta): void {
    const open = spellsOpen(meta);
    this.lock.hidden = open;
    this.page.hidden = !open;
    this.root.classList.toggle('lbSealed', !open);
    this.school.textContent = `School of ${schoolOf(settings().ruler).name}`;
    this.book.redraw();
  }

  start(): void { this.running = true; this.motion(); }
  stop(): void { this.running = false; this.motion(); }
  /** The image paints before the tab opens; there is no canvas loop to warm up. */
  paintOnce(): void { this.motion(); }
  private motion(): void {
    this.root.classList.toggle('lbAlive', this.running && !document.hidden && !settings().saver);
  }
}
