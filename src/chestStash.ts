// The chest stash: every chest earned from an army's star milestones waits here (a vertical stack on the left of the Battle
// tab) until it is tapped; the tap plays the opening and pays the rewards, and the chest leaves the stash. Kept in its own
// small module so the home screen can mount it anywhere: `drawChestStash(host, meta, onChange)` fills a host element, and
// `showChest` is the opening moment. The rules (what is in a chest, opening it once) are in `src/sim/armyStars.ts`.

import { itemIcon } from './equipView';
import { EQUIP_BASES } from './sim/equipment';
import { chestKind, openChest, type ChestKind, type Loot, type LootItem } from './sim/armyStars';
import { armyById } from './sim/armies';
import { saveMeta, type Meta } from './sim/meta';
import { UNITS } from './sim/units';
import { portrait } from './render/sheets';
import { gearIcon } from './render/items';
import { play } from './render/sound';
import { ICONS, icon } from './menuArt';
import chestBronze from './art/ui/chest-bronze.png';
import chestSilver from './art/ui/chest-silver.png';
import chestGold from './art/ui/chest-gold.png';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** How many chests the stack shows; more are counted in the badge. */
export const STASH_SHOWN = 4;

/** Fill `host` with the stash: nothing when it is empty. A tap on a chest opens it; `onChange` runs after the meta changes (and the opening is closed). */
export function drawChestStash(host: HTMLElement, m: Meta, onChange: () => void): void {
  host.replaceChildren();
  host.classList.toggle('empty', m.stash.length === 0);
  m.stash.slice(0, STASH_SHOWN).forEach((c, i) => {
    const army = armyById(c.army);
    const kind = chestKind(c.at);
    const b = el('button', `csChest ${kind}`);
    b.setAttribute('aria-label', `${CHEST_NAME[kind]} from the ${army?.name ?? 'army'}: tap to open`);
    b.style.animationDelay = `${-i * 0.25}s`;
    b.append(chestPicture(kind, 1).root, el('small', '', `${c.at}★`));
    b.addEventListener('click', () => {
      const loot = openChest(m, i);
      if (!loot) return;
      saveMeta(m);
      showChest(loot, onChange);
    });
    host.append(b);
  });
  if (m.stash.length > STASH_SHOWN) host.append(el('i', 'csCount', `+${m.stash.length - STASH_SHOWN}`));
}

/** The chest sprite (Craftpix platformer tileset, tinted bronze, silver and gold): two frames side by side, closed then open with its treasure showing. */
const CHEST_W = 42;
const CHEST_H = 39;
const CHESTS: Record<ChestKind, string> = { bronze: chestBronze, silver: chestSilver, gold: chestGold };
export const CHEST_NAME: Record<ChestKind, string> = { bronze: 'Bronze chest', silver: 'Silver chest', gold: 'Gold chest' };

/** A chest picture at a whole-number scale: the closed frame, and the open frame (shown when the root has the class `burst`). */
export function chestPicture(kind: ChestKind, scale: number): { root: HTMLElement } {
  const root = el('div', 'chestPic');
  root.style.width = `${CHEST_W * scale}px`;
  root.style.height = `${CHEST_H * scale}px`;
  for (const [cls, frame] of [['chestShut', 0], ['chestOpen', 1]] as const) {
    const f = el('div', cls);
    f.style.cssText = `position:absolute;inset:0;background:url(${CHESTS[kind]}) ${-frame * CHEST_W * scale}px 0 / ${CHEST_W * 2 * scale}px ${CHEST_H * scale}px no-repeat;image-rendering:pixelated`;
    root.append(f);
  }
  return { root };
}

/** The reward line's picture: a hero's face, a piece of gear's icon, or the crown. */
function lootIcon(it: LootItem): HTMLElement {
  if (it.type === 'crowns') return icon(ICONS.crowns, 'lootIco');
  if (it.type === 'gear' && it.equip) return itemIcon({ ...it.equip, id: 0 }, EQUIP_BASES[it.equip.base].slot, 'small');
  if (it.type === 'gear') return icon(gearIcon(it.ref ?? 'weapon', 1), 'lootIco');
  const face = portrait(UNITS[it.ref ?? ''].sheet, 48);
  face.className = 'lootFace';
  return face;
}

/** The chest-opening moment: the chest shakes, its lid bursts off in a flood of light, and the rewards fly out into a row of cards. `then` runs when it is closed. */
export function showChest(loot: Loot, then: () => void): void {
  const root = el('div', `chestShow ${loot.kind}`);
  root.setAttribute('role', 'dialog');
  root.append(el('div', 'chestRays'), el('div', 'chestGlow'));
  const title = el('div', 'chestTitle', CHEST_NAME[loot.kind]);
  const stage = el('div', 'chestStage');
  const pic = chestPicture(loot.kind, 4);
  pic.root.classList.add('shaking');
  stage.append(pic.root);
  const spark = el('div', 'chestSparks');
  for (let i = 0; i < 14; i++) {
    const s = el('i');
    s.style.setProperty('--a', `${i * 25.7}deg`);
    s.style.setProperty('--r', `${70 + (i % 4) * 26}px`);
    s.style.setProperty('--d', `${(i % 5) * 0.04}s`);
    spark.append(s);
  }
  stage.append(spark);
  const list = el('div', 'chestLoot');
  const go = el('button', 'primary chestGo', 'Collect');
  go.hidden = true;
  root.append(title, stage, list, go);
  document.body.append(root);
  const timers: number[] = [];
  const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
  let fast = false;
  const done = () => {
    timers.forEach(clearTimeout);
    root.remove();
    then();
  };
  go.addEventListener('click', done);
  // (a tap before the end hurries the rest along)
  root.addEventListener('click', (e) => {
    if (e.target !== go) fast = true;
  });
  at(900, () => {
    play('star');
    pic.root.classList.remove('shaking');
    pic.root.classList.add('burst');
    root.classList.add('lit');
  });
  loot.items.forEach((it, i) => {
    at(1500 + i * 520, () => {
      const card = el('div', `lootCard ${it.type}${it.prize ? ' prize' : ''}${it.rarity ? ` r${it.rarity}` : ''}`);
      card.append(lootIcon(it), el('span', '', it.text));
      list.append(card);
      play(it.prize ? 'merge' : 'summon');
    });
  });
  const end = 1500 + loot.items.length * 520 + 500;
  at(end, () => (go.hidden = false));
  // (hurry: show everything now)
  const tick = window.setInterval(() => {
    if (!fast) return;
    clearInterval(tick);
    timers.forEach(clearTimeout);
    root.classList.add('lit');
    pic.root.classList.remove('shaking');
    pic.root.classList.add('burst');
    list.replaceChildren(
      ...loot.items.map((it) => {
        const card = el('div', `lootCard ${it.type}${it.prize ? ' prize' : ''}${it.rarity ? ` r${it.rarity}` : ''}`);
        card.style.animation = 'none';
        card.append(lootIcon(it), el('span', '', it.text));
        return card;
      }),
    );
    go.hidden = false;
  }, 80);
  timers.push(tick as unknown as number);
}

