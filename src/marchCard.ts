// The March orders card (DEPTH-BUILD, docs/notes/depth-design.md section 5): after an army's tier and party are picked, a sheet rises from
// the bottom with the modifiers as tiles ("Plain march" chosen), each with its icon, name and its lines of cost and reward; a locked one
// shows what opens it. March starts the run with the orders chosen; a Scouted march first shows the scouts' report on the final boss.
// Skipped while no modifier is open yet, so a new player never sees it. Reads the rules only (`sim/march.ts`); the page starts the run.

import { armyById, bossOf } from './sim/armies';
import { MARCHES, CURSES, curseFor, marchOpen, ordersFor, type MarchMod, type Orders } from './sim/march';
import { SIGNATURES } from './sim/bossAttacks';
import { bossName, cluesOf, WEAKNESS } from './sim/weakness';
import type { Meta } from './sim/meta';

const CSS = `
#marchCard { position: fixed; inset: 0; z-index: 60; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.55); }
#marchCard .mcBox { width: min(100%, 520px); max-height: 88vh; overflow-y: auto; box-sizing: border-box; padding: 14px 16px calc(16px + env(safe-area-inset-bottom)); border-radius: 14px 14px 0 0; background: linear-gradient(#2a2619, #17150e); box-shadow: 0 -4px 18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,215,0,0.25); color: #f3e9c8; font: 500 13px/1.35 var(--body, serif); }
#marchCard h3 { margin: 0 0 2px; font-size: 18px; color: #ffd24a; }
#marchCard .mcSub { margin: 0 0 10px; color: #b9ae8a; font-size: 12px; }
#marchCard .mcGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
@media (min-width: 400px) { #marchCard .mcGrid { grid-template-columns: 1fr 1fr 1fr; } }
#marchCard .mcTile { display: flex; flex-direction: column; gap: 3px; min-width: 0; text-align: left; padding: 8px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.3); color: inherit; font: inherit; }
#marchCard .mcTile b { font-size: 13px; }
#marchCard .mcTile .mcIco { font-size: 20px; line-height: 1; }
#marchCard .mcTile small { font-size: 11px; color: #cfc4a0; overflow-wrap: anywhere; }
#marchCard .mcTile small.mcPay { color: #9fe39a; }
#marchCard .mcTile.on { border-color: #ffd24a; box-shadow: inset 0 0 0 1px #ffd24a, 0 0 10px rgba(255,200,60,0.25); background: rgba(90,70,20,0.35); }
#marchCard .mcTile:disabled { opacity: 0.55; }
#marchCard .mcTile:disabled .mcIco { filter: grayscale(1); }
#marchCard .mcTile .mcLock { color: #9a9a8e; font-style: italic; }
#marchCard .mcNote { margin: 10px 0 0; min-height: 2.6em; color: #e6d9a8; font-size: 12px; }
#marchCard .mcRow { display: flex; gap: 8px; margin-top: 12px; }
#marchCard .mcRow button { flex: 1; min-height: 46px; font-size: 15px; }
#marchCard .mcReport { padding: 10px; border-radius: 9px; background: rgba(0,0,0,0.3); }
#marchCard .mcReport p { margin: 6px 0; }
#marchCard .mcReport .mcWeak { color: #ffd24a; }
`;

let styled = false;

/** Whether the card has anything to choose: some modifier other than the plain march is open. */
export function marchChoice(meta: Meta, army: string, tier: number): boolean {
  return MARCHES.some((d) => d.id !== 'plain' && marchOpen(meta, army, tier, d.id).open);
}

/** Show the card (or go straight on with a plain march when nothing is open). `go` gets the orders chosen (undefined for plain). */
export function showMarchCard(meta: Meta, army: string, tier: number, seed: number, go: (orders: Orders | undefined) => void): void {
  if (!marchChoice(meta, army, tier)) return go(undefined);
  if (!styled) {
    styled = true;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
  }
  document.getElementById('marchCard')?.remove();
  const a = armyById(army);
  const wrap = document.createElement('div');
  wrap.id = 'marchCard';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', 'March orders');
  const box = document.createElement('div');
  box.className = 'mcBox';
  wrap.append(box);
  const add = <K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    parent.append(e);
    return e;
  };
  const tierName = ['Normal', 'Hard', 'Elite', 'Legendary', 'Mythic'][tier] ?? 'Normal';
  let chosen: MarchMod | 'plain' = 'plain';
  const done = (orders: Orders | undefined) => {
    wrap.remove();
    go(orders);
  };

  const drawPick = () => {
    box.replaceChildren();
    add(box, 'h3', '', 'March orders');
    add(box, 'p', 'mcSub', `${a?.name ?? army} · ${tierName} · one order for the whole run`);
    const grid = add(box, 'div', 'mcGrid');
    const note = document.createElement('p');
    note.className = 'mcNote';
    const tiles: HTMLButtonElement[] = [];
    for (const d of MARCHES) {
      const open = marchOpen(meta, army, tier, d.id);
      const t = add(grid, 'button', `mcTile${d.id === chosen ? ' on' : ''}`);
      t.disabled = !open.open;
      add(t, 'span', 'mcIco', d.icon);
      add(t, 'b', '', d.name);
      if (open.open) {
        add(t, 'small', '', d.change);
        add(t, 'small', 'mcPay', d.reward);
      } else add(t, 'small', 'mcLock', open.lock ?? '');
      t.addEventListener('click', () => {
        chosen = d.id;
        for (const x of tiles) x.classList.toggle('on', x === t);
        note.textContent = d.id === 'cursed' ? `This run's curse: ${CURSES[curseFor(seed)].name}. ${CURSES[curseFor(seed)].line}` : '';
      });
      tiles.push(t);
    }
    box.append(note);
    const row = add(box, 'div', 'mcRow');
    const march = add(row, 'button', 'primary', 'March');
    march.addEventListener('click', () => (chosen === 'scouted' ? drawReport() : done(ordersFor(chosen, seed))));
  };

  // (a Scouted march: the scouts' report on the final boss, its two great attacks and its weakness)
  const drawReport = () => {
    box.replaceChildren();
    const boss = a ? bossOf(a) : '';
    add(box, 'h3', '', 'The scouts\' report');
    add(box, 'p', 'mcSub', `${a?.name ?? army} · ${tierName}`);
    const rep = add(box, 'div', 'mcReport');
    add(rep, 'p', '', `At the end of the road waits the ${bossName(boss)}.`);
    const sigs = SIGNATURES[boss] ?? [];
    if (sigs.length) add(rep, 'p', '', `Its great attacks: ${sigs.map((x) => x.name).join(' and ')}.`);
    if (WEAKNESS[boss]) add(rep, 'p', 'mcWeak', `Weakness: ${cluesOf(boss)[2]}`);
    const row = add(box, 'div', 'mcRow');
    const back = add(row, 'button', '', 'Back');
    back.addEventListener('click', drawPick);
    const march = add(row, 'button', 'primary', 'March');
    march.addEventListener('click', () => done(ordersFor('scouted', seed)));
  };

  drawPick();
  document.body.append(wrap);
}
