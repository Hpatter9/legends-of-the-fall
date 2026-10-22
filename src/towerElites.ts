// The tower's elites and relic sets on the page (`eliteSets.css`): an elite's portrait and name for the map node and the fight's
// intro card, the three-relic choice an elite pays, and the relic frames of the tower header (coloured by set) with the
// popup that shows a set's progress. Like `towerView.ts` it reads the Run and changes it only through the sim's own functions
// (`takeRelic`). No state of its own.

import { OFFER_SIZE, takeRelic, type Elite } from './sim/elites';
import { RELICS } from './sim/relics';
import { SETS, setCount, setOf, tiersOn, type RelicSet } from './sim/relicSets';
import type { Run } from './sim/run';
import { UNITS } from './sim/units';
import { iconImg, relicIcon } from './render/items';
import { portrait, sheetInfo } from './render/sheets';
import { play } from './render/sound';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** An elite's portrait, cropped from its sheet and scaled by a whole number so its pixels stay square, about `want` px across. */
export function elitePortrait(e: Elite, want = 48): HTMLCanvasElement {
  const def = UNITS[e.def];
  const info = sheetInfo(def.sheet);
  const side = info ? Math.min(info.figure + 6, info.h) : 32;
  const n = Math.max(1, Math.round(want / side));
  const face = portrait(def.sheet, side * n);
  face.className = 'elFace';
  face.style.width = face.style.height = `${side * n}px`;
  // (the sheets face right; one that faces left is turned to look into the card)
  if (info && !info.facesRight) face.style.transform = 'scaleX(-1)';
  return face;
}

/** The line under the map when an elite node is tapped: its portrait, title, trait and what it pays. */
export function eliteInfo(e: Elite, floor: number): HTMLElement {
  const box = el('span', 'elInfo');
  const words = el('span', 'elWords');
  words.append(el('b', '', e.name), el('small', '', `Floor ${floor} · Elite: ${e.trait}`), el('small', 'elPay', `Pays a choice of ${OFFER_SIZE} relics and double gold`));
  box.append(elitePortrait(e, 40), words);
  return box;
}

/** A relic's button in the tower header: its icon, framed in its set's colour (lit once two of the set are held). */
export function relicButton(run: Run, id: string, onTap: () => void): HTMLButtonElement {
  const b = el('button', 'relic');
  const set = setOf(id);
  b.append(iconImg(relicIcon(id), RELICS[id].name));
  if (set) {
    const n = setCount(set, run.relics);
    b.classList.add('inSet');
    b.style.setProperty('--set', set.colour);
    b.dataset.on = String(n >= 3 ? 3 : n >= 2 ? 2 : 0);
    b.title = `${RELICS[id].name}: ${RELICS[id].text} (${set.name} set ${n}/${set.relics.length})`;
  } else b.title = `${RELICS[id].name}: ${RELICS[id].text}`;
  b.addEventListener('click', onTap);
  return b;
}

/** The lines of a set's progress: its pieces (held ones lit) and its two bonuses (on or off). */
function setLines(run: Run, set: RelicSet): HTMLElement {
  const n = setCount(set, run.relics);
  const box = el('div', 'elSet');
  box.style.setProperty('--set', set.colour);
  box.append(el('h3', '', `${set.name} set · ${n}/${set.relics.length}`));
  const pieces = el('div', 'elPieces');
  for (const r of set.relics) {
    const held = run.relics?.includes(r) ?? false;
    const p = el('span', `elPiece${held ? ' held' : ''}`);
    p.append(iconImg(relicIcon(r), RELICS[r].name), el('small', '', RELICS[r].name));
    pieces.append(p);
  }
  box.append(pieces);
  const on = tiersOn(set, n);
  for (const [need, tier] of [[2, set.two], [3, set.three]] as const) {
    const row = el('p', `elTier${on.includes(tier) ? ' on' : ''}`);
    row.append(el('b', '', `${need} pieces`), el('span', '', tier.text));
    box.append(row);
  }
  return box;
}

/** Tapping a relic in the header: what it is, and where its set stands. A tap anywhere closes it. */
export function relicPopup(run: Run, id: string, root: HTMLElement): void {
  root.querySelector('.elPop')?.remove();
  const wrap = el('div', 'rtCardWrap elPop');
  const card = el('div', 'rtCard');
  const head = el('div', 'elRelic');
  head.append(iconImg(relicIcon(id), RELICS[id].name), el('b', '', RELICS[id].name), el('small', '', RELICS[id].text));
  card.append(head);
  const set = setOf(id);
  card.append(set ? setLines(run, set) : el('p', 'rtLead', 'This relic belongs to no set.'));
  const close = el('button', '', 'Close');
  card.append(close);
  wrap.append(card);
  wrap.addEventListener('click', () => wrap.remove());
  root.append(wrap);
}

/**
 * Fill a card with the relics an elite offers: pick one (its set's progress shown), then take it. `done` runs when the card is
 * finished with.
 */
export function relicChoice(run: Run, card: HTMLElement, elite: string | undefined, done: () => void): void {
  const offer = run.tower!.offer!;
  card.append(el('p', 'rtLead', `${elite ?? 'The elite'} falls and leaves a hoard. Take one relic:`));
  const list = el('div', 'rtShop');
  const detail = el('div', 'elDetail');
  let picked = '';
  const take = el('button', 'primary', 'Take it');
  take.disabled = true;
  const rows = new Map<string, HTMLButtonElement>();
  for (const id of offer) {
    const set = setOf(id);
    const row = el('button', 'rtItem relicOffer');
    if (set) row.style.setProperty('--set', set.colour);
    const pic = iconImg(relicIcon(id), RELICS[id].name);
    pic.classList.add('rtShopPic');
    const words = el('span');
    const have = set ? setCount(set, run.relics) : 0;
    words.append(el('b', '', RELICS[id].name), el('small', '', RELICS[id].text));
    if (set) words.append(el('small', 'elTag', `${set.name} set: ${have}/${set.relics.length} → ${have + 1}/${set.relics.length}`));
    row.append(pic, words);
    row.addEventListener('click', () => {
      picked = id;
      take.disabled = false;
      for (const [rid, b] of rows) b.classList.toggle('picked', rid === id);
      detail.replaceChildren();
      if (set) {
        const after = [...(run.relics ?? []), id];
        const held = { ...run, relics: after } as Run;
        detail.append(setLines(held, set));
      } else detail.append(el('p', 'rtLead', 'No set: a relic that stands alone.'));
    });
    rows.set(id, row);
    list.append(row);
  }
  card.append(list, detail, take);
  take.addEventListener('click', () => {
    if (!picked) return;
    const before = new Map(Object.values(SETS).map((s) => [s.id, tiersOn(s, setCount(s, run.relics)).length]));
    const line = takeRelic(run, picked);
    if (!line) return;
    play('star');
    list.remove();
    detail.remove();
    const set = setOf(picked);
    card.querySelector('.rtLead')!.textContent = `You take ${line}.`;
    if (set && tiersOn(set, setCount(set, run.relics)).length > before.get(set.id)!) {
      const tier = tiersOn(set, setCount(set, run.relics)).pop()!;
      card.insertBefore(el('p', 'rtNote', `${set.name} set bonus: ${tier.text}.`), take);
    }
    take.textContent = 'Climb on';
    take.onclick = done;
  });
}
