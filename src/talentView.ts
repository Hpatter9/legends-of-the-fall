// The Talents panel of the hero sheet: a line of how many points the hero has, and a button that opens its talent tree in
// place. The tree is the four first-row nodes over the two pairs of tiers 2 and 3, as icon tiles joined by lines; a tile is
// locked, available, learned or ruled out (the other of its pair was chosen). A tap on a tile shows what it does and a Learn
// button; the bar above has the shard exchange and the Respec (which asks for a second tap). Reads and changes the meta only
// through `talents.ts`; the icons are the equipment set's (16px tiles, drawn at 3x, never smoothed).

import { saveMeta, type Meta } from './sim/meta';
import { UNITS } from './sim/units';
import { KITS } from './sim/abilities';
import {
  FULL_TREE_POINTS, MAX_SHARD_POINTS, SHARD_POINT_COST, TIER_COST, TREES, boughtOf, buyPoint, canBuyPoint, costOf, learn, nodeOf, picksOf, pointsEarned, pointsFree, pointsSpent, respec, respecCost, shardsToSpend,
  whyNot, type TalentNode,
} from './sim/talents';
import { EQUIP_ICONS } from './equipArt';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const button = (text: string, cls = ''): HTMLButtonElement => {
  const b = el('button', cls, text);
  b.type = 'button';
  return b;
};

/** Where each node sits in the tree, in percent across and in px down (`talents.css` sizes the box to match). */
export const ROW_Y: readonly number[] = [0, 34, 138, 242];
const X_BY_TIER: Record<number, number[]> = { 1: [12.5, 37.5, 62.5, 87.5], 2: [30, 70], 3: [30, 70] };
export const nodeX = (n: TalentNode): number => X_BY_TIER[n.tier][Number(n.id.slice(-1).charCodeAt(0)) - 97];

export type NodeState = 'taken' | 'available' | 'locked' | 'ruled';
/** What a node is now: learned, learnable, ruled out by its pair, or locked behind points or an earlier row. */
export function stateOf(meta: Meta, kind: string, n: TalentNode): NodeState {
  if (picksOf(meta, kind).includes(n.id)) return 'taken';
  const why = whyNot(meta, kind, n.id);
  if (why === null) return 'available';
  return why.startsWith('You chose') ? 'ruled' : 'locked';
}

/** A tile for one node: its icon on a frame that shows the state, with its cost. */
export function nodeTile(n: TalentNode, state: NodeState): HTMLButtonElement {
  const tile = button('', `tNode ${state} t${n.tier}`);
  const img = el('img');
  img.alt = '';
  img.draggable = false;
  img.src = EQUIP_ICONS[n.icon];
  tile.append(img, el('i', 'tCost', String(TIER_COST[n.tier])));
  tile.title = n.name;
  tile.setAttribute('aria-label', `${n.name}, ${state}`);
  return tile;
}

/** The panel for a hero kind. `changed` is told after anything is learned, bought or respecced. */
export function drawTalents(meta: Meta, kind: string, changed: () => void = () => {}): HTMLElement {
  const panel = el('div', 'tPanel');
  const tree = TREES[kind];
  const commit = () => {
    saveMeta(meta);
    changed();
  };
  let sel: string | undefined;
  let confirming = false;
  /** The node just learned: its tile plays a short one-shot pop (no flashing). */
  let popped: string | undefined;

  const overview = () => {
    panel.replaceChildren(el('h4', '', 'Talents'));
    const taken = picksOf(meta, kind).map((id) => nodeOf(kind, id)).filter((n): n is TalentNode => !!n);
    const free = pointsFree(meta, kind);
    panel.append(el('p', 'tSum', `${free} point${free === 1 ? '' : 's'} to spend · ${taken.length} learned · ${pointsSpent(meta, kind)} of ${FULL_TREE_POINTS} points used`));
    const row = el('div', 'tChips');
    for (const n of taken) row.append(nodeTile(n, 'taken'));
    if (taken.length) panel.append(row);
    else panel.append(el('p', 'tSum dim', 'None yet. A hero earns a point every 3 levels, and spare shards buy more.'));
    const open = button('Open talents', free > 0 ? 'primary' : '');
    open.addEventListener('click', () => {
      sel = undefined;
      view();
    });
    panel.append(open);
  };

  const view = () => {
    panel.replaceChildren();
    const free = pointsFree(meta, kind);
    const head = el('div', 'tHead');
    head.append(el('h4', '', `${UNITS[kind].name} · Talents`), el('b', 'tPoints', `${free} / ${pointsEarned(meta, kind)}`));
    panel.append(head, el('small', 'tSub', 'Points free of points earned. Learn two of the first row to open the second, and one of the second to open the third.'));

    // the tree: lines under the tiles
    const box = el('div', 'tTree');
    const w = 100;
    const h = ROW_Y[3] + 60;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'tLines');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const states = new Map(tree.nodes.map((n) => [n.id, stateOf(meta, kind, n)]));
    for (const a of tree.nodes) {
      for (const c of tree.nodes) {
        if (c.tier !== a.tier + 1) continue;
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', String(nodeX(a)));
        line.setAttribute('y1', String(ROW_Y[a.tier] + 28));
        line.setAttribute('x2', String(nodeX(c)));
        line.setAttribute('y2', String(ROW_Y[c.tier] + 28));
        const lit = states.get(a.id) === 'taken' && states.get(c.id) !== 'ruled';
        line.setAttribute('class', `tLine ${lit ? 'lit' : states.get(c.id) === 'ruled' ? 'ruled' : ''}`);
        svg.append(line);
      }
    }
    box.style.height = `${h}px`;
    box.append(svg);
    for (const n of tree.nodes) {
      const tile = nodeTile(n, states.get(n.id)!);
      tile.style.left = `${nodeX(n)}%`;
      tile.style.top = `${ROW_Y[n.tier] + 28}px`;
      if (sel === n.id) tile.classList.add('sel');
      if (popped === n.id) tile.classList.add('pop');
      tile.addEventListener('click', () => {
        sel = n.id;
        confirming = false;
        popped = undefined;
        view();
      });
      box.append(tile);
    }
    for (const [i, label] of ['Stats', 'Choose one', 'Choose one'].entries()) {
      const tag = el('small', 'tRow', label);
      tag.style.top = `${ROW_Y[i + 1] - 15}px`;
      box.append(tag);
    }
    panel.append(box);

    // the picked node
    const n = sel ? nodeOf(kind, sel) : undefined;
    const card = el('div', 'tCard');
    if (n) {
      const state = states.get(n.id)!;
      const title = el('div', 'tTitle');
      title.append(nodeTile(n, state), el('b', '', n.name), el('small', '', `Tier ${n.tier} · ${costOf(n)} point${costOf(n) > 1 ? 's' : ''}`));
      card.append(title, el('p', '', n.text));
      if (n.tier === 2 || n.tier === 3) {
        const skill = KITS[kind]?.skill;
        if (n.tier === 2 && skill) card.append(el('small', 'dim', `Changes ${skill.name}.`));
      }
      if (state === 'taken') card.append(el('small', 'tGood', 'Learned.'));
      else if (state === 'available') {
        const go = button(`Learn (${costOf(n)} point${costOf(n) > 1 ? 's' : ''})`, 'primary');
        go.addEventListener('click', () => {
          if (learn(meta, kind, n.id)) popped = n.id;
          commit();
          view();
        });
        card.append(go);
      } else card.append(el('small', 'tBad', whyNot(meta, kind, n.id) ?? ''));
    } else card.append(el('p', 'tSum dim', 'Tap a tile to read it.'));
    panel.append(card);

    // shards, respec
    const bar = el('div', 'tBar');
    const bought = boughtOf(meta, kind);
    const buy = button(`Shards: ${SHARD_POINT_COST} for a point`, canBuyPoint(meta, kind) ? 'primary' : '');
    buy.disabled = !canBuyPoint(meta, kind);
    buy.addEventListener('click', () => {
      buyPoint(meta, kind);
      commit();
      view();
    });
    const cost = respecCost(meta, kind);
    const re = button(confirming ? `Tap again: ${cost} crowns` : cost ? `Respec (${cost} crowns)` : 'Respec', confirming ? 'primary' : '');
    re.disabled = !cost || meta.crowns < cost;
    re.addEventListener('click', () => {
      if (!confirming) {
        confirming = true;
        view();
        return;
      }
      respec(meta, kind);
      confirming = false;
      commit();
      view();
    });
    bar.append(buy, re);
    panel.append(bar, el('small', 'tSub', `${shardsToSpend(meta, kind)} spare shard${shardsToSpend(meta, kind) === 1 ? '' : 's'} · ${bought} of ${MAX_SHARD_POINTS} shard points bought. Spending shards never lowers a rank. You have ${meta.crowns} crowns.`));
    const back = button('Back');
    back.addEventListener('click', () => {
      confirming = false;
      overview();
    });
    panel.append(back);
  };

  overview();
  return panel;
}
