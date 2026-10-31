// The altar made plain on the page (ALTAR-CLEAR, `docs/notes/altar-clear.md`): the ⓘ "How the altar works" panel (shown
// once by itself the first time the altar is met), consecrate against corrupt side by side, and the "Your altar" summary.
// The words come from `sim/altarWords.ts`, which works them out from the rules' own numbers.
import { HOW_ALTAR_WORKS, starterLine, type AltarSummary, type Seal } from './sim/altarWords';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The explainer is shown by itself once ('legends.altarHelp'); after that it is the ⓘ button's. */
const KEY = 'legends.altarHelp';
export function altarHelpSeen(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return true; }
}
function markSeen(): void {
  try { localStorage.setItem(KEY, '1'); } catch { /* (no storage: it may show again) */ }
}

/** "How the altar works": five lines over the card, and a button to carry on. */
export function showAltarHelp(host: HTMLElement): void {
  host.querySelector('.altarHelp')?.remove();
  const veil = el('div', 'altarHelp');
  veil.setAttribute('role', 'dialog');
  veil.setAttribute('aria-label', 'How the altar works');
  const box = el('div', 'altarHelpBox');
  const list = el('ul');
  for (const line of HOW_ALTAR_WORKS) list.append(el('li', '', line));
  const ok = el('button', 'primary', 'Got it');
  ok.addEventListener('click', () => { markSeen(); veil.remove(); });
  box.append(el('h3', '', 'How the altar works'), list, ok);
  veil.append(box);
  host.append(veil);
  ok.focus();
}

/** The ⓘ button that opens it. */
export function altarHelpButton(host: () => HTMLElement): HTMLButtonElement {
  const b = el('button', 'altarInfo', 'ⓘ');
  b.setAttribute('aria-label', 'How the altar works');
  b.title = 'How the altar works';
  b.addEventListener('click', () => showAltarHelp(host()));
  return b;
}

/** Consecrate | Corrupt, side by side: what each gains (+) and costs (−). */
export function sealTable(seals: { consecrate: Seal; corrupt: Seal }): HTMLElement {
  const box = el('div', 'altarSeals');
  for (const [key, name] of [['consecrate', 'Consecrate'], ['corrupt', 'Corrupt']] as const) {
    const col = el('div', `altarSeal ${key}`);
    col.append(el('b', '', name));
    const list = el('ul');
    for (const g of seals[key].gains) list.append(el('li', 'gain', g));
    for (const c of seals[key].costs) list.append(el('li', 'cost', c));
    col.append(list);
    box.append(col);
  }
  return box;
}

/** "Your altar": the starter, each step chosen (consecrated or corrupted) or still to come, and what corruption does. */
export function summaryBlock(s: AltarSummary): HTMLElement {
  const box = el('div', 'altarSummary');
  box.append(el('p', 'altarStarter', `Starter · ${starterLine(s)}`));
  for (const row of s.rows) {
    const item = el('div', `altarRow${row.chosen ? ' chosen' : ''}${row.step === s.pending ? ' due' : ''}`);
    const head = el('div', 'altarRowHead');
    head.append(el('span', 'altarRowLabel', row.label));
    if (row.chosen) head.append(el('b', '', row.chosen));
    if (row.seal) head.append(el('span', `altarBadge ${row.seal}`, row.seal === 'unknown' ? 'sealed' : row.seal));
    if (row.step === s.pending) head.append(el('span', 'altarBadge due', 'choose now'));
    item.append(head);
    for (const line of row.lines) item.append(el('small', '', line));
    box.append(item);
  }
  const corrupt = el('div', `altarRow corruption${s.corruption ? ' tainted' : ''}`);
  const head = el('div', 'altarRowHead');
  head.append(el('span', 'altarRowLabel', 'Corruption'), el('b', '', s.corruption ? String(s.corruption) : 'None'));
  corrupt.append(head);
  if (!s.corruption) corrupt.append(el('small', '', 'Every step so far was consecrated: foes and guardians are as they were.'));
  for (const line of s.corruptionLines) corrupt.append(el('small', '', line));
  box.append(corrupt);
  return box;
}
