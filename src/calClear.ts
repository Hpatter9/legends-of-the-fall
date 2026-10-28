// The Calamity's two big screens (`calmap.css`): the recap of a map that has just been cleared (the rewards it paid and the events it held),
// and the victory screen of a Calamity cleared whole (the finishing reward: crowns, summoning stones, a Legendary piece of gear, a title).
// Both fill a card the tower view has made. They only read the run and the summary; nothing here changes the game.

import { itemIcon } from './equipView';
import { chestPicture } from './chestStash';
import { ASC_MAX } from './sim/ascension';
import { CAL_MAPS } from './sim/calamity';
import { EQUIP_BASES, RARITY_NAMES, type Equipment } from './sim/equipment';
import { RELICS } from './sim/relics';
import type { MapRecap, TowerSummary } from './sim/tower';
import { ICONS, icon } from './menuArt';
import { iconImg, relicIcon } from './render/items';
import { play } from './render/sound';
import { calamityLook } from './towerTheme';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const reduced = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** A row of the recap: a name on the left, its value on the right. */
function row(label: string, value: string): HTMLElement {
  const r = el('div', 'ccRow');
  r.append(el('span', '', label), el('b', '', value));
  return r;
}

/** A titled group of the recap (nothing when it has no content). */
function group(title: string, items: HTMLElement[]): HTMLElement | null {
  if (!items.length) return null;
  const g = el('div', 'ccGroup');
  g.append(el('h3', '', title));
  const list = el('div', 'ccList');
  list.append(...items);
  g.append(list);
  return g;
}

const chip = (pic: HTMLElement, name: string): HTMLElement => {
  const c = el('span', 'ccChip');
  c.append(pic, el('small', '', name));
  return c;
};

/** The sheet of a map's recap: how much of it was cleared, what it paid, and the events it held. */
export function mapRecapCard(card: HTMLElement, r: MapRecap, onDone: () => void): void {
  const next = r.map + 1;
  card.classList.add('ccCard');
  card.append(el('p', 'ccLead', calamityLook(r.map).name));
  const stats = el('div', 'ccStats');
  stats.append(row('Spots cleared', `${r.spots} of ${r.total}`), row('Fights won', `${r.fights}${r.elites ? ` (${r.elites} mini-boss${r.elites === 1 ? '' : 'es'})` : ''}`), row('Gold won', String(r.gold)));
  card.append(stats);
  const parts = [
    group('Relics found', r.relics.filter((id) => RELICS[id]).map((id) => chip(iconImg(relicIcon(id), RELICS[id].name), RELICS[id].name))),
    group('Gear found', r.gear.map((g) => el('span', 'ccLine', g))),
    group('Heroes who joined', r.heroes.map((h) => el('span', 'ccLine', h))),
    group('Events met', r.events.map((e) => el('span', 'ccLine', e))),
  ].filter((x): x is HTMLElement => !!x);
  card.append(...parts);
  if (!parts.length) card.append(el('p', 'ccLead', 'A quiet map: nothing found on it.'));
  const go = el('button', 'primary', next <= CAL_MAPS ? `On to map ${next}` : 'Onward');
  go.addEventListener('click', () => {
    play('summon');
    onDone();
  });
  card.append(go);
  if (!reduced()) reveal(card, '.ccGroup, .ccStats');
}

/** Each part fades in a beat after the one before (once: no loop). */
function reveal(card: HTMLElement, selector: string): void {
  card.querySelectorAll<HTMLElement>(selector).forEach((e, i) => {
    e.classList.add('ccIn');
    e.style.animationDelay = `${i * 120}ms`;
  });
}

/** A number that counts up to its value in about a second (once; at once under reduced motion). */
function countUp(target: HTMLElement, value: number): void {
  if (reduced() || value < 2) return void (target.textContent = value.toLocaleString());
  const t0 = performance.now();
  const MS = 900;
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / MS);
    target.textContent = Math.round(value * (1 - (1 - p) * (1 - p))).toLocaleString();
    if (p < 1 && target.isConnected) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** The victory screen: the Calamity falls, and the finishing reward is laid out piece by piece. */
export function victoryCard(card: HTMLElement, s: TowerSummary, onDone: () => void): void {
  const c = s.clear!;
  card.classList.add('ccCard', 'ccVictory');
  // (a one-shot burst of gold sparks over the title, and a faint one-shot light: neither loops)
  const burst = el('div', 'ccBurst');
  for (let i = 0; i < 18; i++) {
    const p = el('i');
    p.style.setProperty('--a', `${Math.round((360 / 18) * i)}deg`);
    p.style.setProperty('--d', `${48 + (i % 3) * 22}px`);
    burst.append(p);
  }
  card.append(burst, el('h2', 'ccTitle', 'The Calamity is ended!'), el('p', 'ccLead', `All ${CAL_MAPS} maps are cleared and the rift is sealed.${c.level ? ` Ascension ${c.level}.` : ''}`));
  // the title: the badge of the level cleared
  const badge = el('div', 'ccBadge');
  badge.append(el('small', '', c.newTitle ? 'A new title' : 'Your title'), el('b', '', c.title));
  card.append(badge);
  // the crowns
  const crowns = el('div', 'ccCrowns');
  const num = el('b', '', '0');
  crowns.append(icon(ICONS.crowns), num, el('small', '', 'crowns'));
  card.append(crowns);
  countUp(num, s.crowns);
  const rewards: (HTMLElement | null)[] = [];
  // the gear
  const gearItem: Equipment = { id: 0, base: c.gear.base, rarity: c.gear.rarity as Equipment['rarity'], level: c.gear.level };
  const gear = el('div', `ccGear r${c.gear.rarity}`);
  const gw = el('span');
  gw.append(el('b', '', c.gear.name), el('small', '', `${RARITY_NAMES[c.gear.rarity]} · Lv ${c.gear.level}`));
  gear.append(itemIcon(gearItem, EQUIP_BASES[c.gear.base]?.slot ?? 'weapon'), gw);
  rewards.push(group('A piece of gear', [gear]));
  // the stones
  const stones = el('div', 'ccShard');
  stones.append(icon(ICONS.stones, 'lootIco'), el('b', '', 'Summoning stones'), el('em', '', `+${c.stones}`));
  rewards.push(group('Stones', [stones]));
  // the chests
  if (s.gold) {
    const one = el('div', 'ccChests');
    one.append(chestPicture('gold', 2).root, el('b', '', `Gold chest ×${s.gold}`), el('small', '', 'in your stash'));
    rewards.push(group('Chests', [one]));
  }
  // what the run itself held
  const total = (s.recaps ?? []).reduce((n, r) => ({ spots: n.spots + r.spots, relics: n.relics + r.relics.length, events: n.events + r.events.length }), { spots: 0, relics: 0, events: 0 });
  const stats = el('div', 'ccStats');
  stats.append(row('Spots cleared', String(s.floors || total.spots)), row('Relics', String(s.relics)), row('Heroes', String(s.heroes)), row('Events met', String(total.events)));
  rewards.push(group('The run', [stats]));
  card.append(...rewards.filter((x): x is HTMLElement => !!x));
  if (s.cleared && c.level < ASC_MAX) card.append(el('p', 'ccLead', `Ascension ${c.level + 1} is open.`));
  const go = el('button', 'primary', 'Back to camp');
  go.addEventListener('click', onDone);
  card.append(go);
  if (!reduced()) {
    reveal(card, '.ccBadge, .ccCrowns, .ccGroup');
    burst.classList.add('go');
    const flash = el('div', 'ccFlash');
    card.append(flash);
    setTimeout(() => flash.remove(), 200);
  }
  play('star');
}
