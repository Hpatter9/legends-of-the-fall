// IAP (docs/notes/iap.md): the summoning's odds sheet, opened by the Odds button in the Summoning Sanctum. A standard ornate sheet:
// what a stone can give (the lucky summon and the shard), every hero with its chance, then the chest shop's chests and their chances.
// The numbers come from `summonOdds.ts`, which works them out from the draw's own rules; nothing here is typed in.

import { menuFoot, menuNote, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import type { Meta } from './sim/meta';
import { toCollect } from './sim/unlock';
import { chestOdds, heroRows, luckyWords, ODDS_LEAD, pct, shardWords, stoneOdds } from './summonOdds';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A section of the sheet that holds wells and notes (stacked, not a grid of choices). */
function section(menu: OrnateMenu, title: string, line: string): HTMLElement {
  const grid = menuSection(menu.body, title, line);
  const sec = grid.parentElement!;
  grid.remove();
  return sec;
}

/** A table in a slate well: a header row and its rows (the first column words, the rest chances). */
function table(parent: HTMLElement, head: string[], rows: string[][], cls = ''): HTMLTableElement {
  const t = el('table', `oddsTable${cls ? ` ${cls}` : ''}`);
  const hr = el('tr');
  for (const h of head) hr.append(el('th', '', h));
  t.append(el('thead'));
  t.tHead!.append(hr);
  const body = el('tbody');
  for (const r of rows) {
    const tr = el('tr');
    r.forEach((c, i) => tr.append(el(i === 0 ? 'th' : 'td', '', c)));
    body.append(tr);
  }
  t.append(body);
  menuWell(parent).append(t);
  return t;
}

/** Open the odds sheet for this save. */
export function openOdds(m: Meta, onClose?: () => void): OrnateMenu {
  const o = stoneOdds(m);
  const all = toCollect(m).length === 0;
  const menu = ornateMenu({ id: 'oddsSheet', eyebrow: 'The Summoning Sanctum', title: 'Summoning odds', sub: 'the chances of every outcome', kind: 'sheet', asked: true, onClose });
  menu.root.classList.add('oddsSheet');
  menuNote(menu.body, ODDS_LEAD);

  const lucky = o.outcomes.filter((x) => x.what !== 'shard').reduce((a, x) => a + x.chance, 0);
  const shard = o.outcomes.filter((x) => x.what === 'shard').reduce((a, x) => a + x.chance, 0);
  const stone = section(menu, 'A summoning stone', 'what it gives');
  table(stone, ['Outcome', 'Chance'], [
    [all ? 'Lucky summon: 10 rank shards' : 'Lucky summon: a whole new hero', pct(lucky)],
    ['One hero shard', pct(shard)],
    ['In all', pct(lucky + shard)],
  ]);
  menuNote(stone, luckyWords(all));
  menuNote(stone, shardWords(o));

  const rows = heroRows(m, o);
  const heroes = section(menu, 'Each hero', `${rows.length} heroes`);
  table(
    heroes,
    ['Hero', 'Shard', all ? 'Lucky: 10' : 'Whole hero'],
    rows.map((r) => [`${r.name}${r.owned ? ' ✓' : ''}`, r.shard ? pct(r.shard) : '—', r.lucky ? pct(r.lucky) : '—']),
    'oddsHeroes',
  );
  menuNote(heroes, '✓ a hero you have: its shards count towards its rank. Heroes earned in play are never summoned until you have them.');

  const chests = section(menu, 'Chest shop chests', 'bought with crowns');
  for (const c of chestOdds()) {
    table(chests, [c.name, 'Chance'], c.lines.map((l) => [l.what, pct(l.chance)]));
    table(chests, ['Its gear, if any', 'Chance'], c.rarity.map((r) => [r.name, pct(r.chance)]), 'oddsRarity');
  }
  menuNote(chests, 'Everything sold for money in the Shop has fixed contents.');

  menuFoot(menu, { back: { word: 'close' } });
  return menu;
}
