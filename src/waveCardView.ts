// The short wave card's one-liners (WAVE-RECAP, `sim/waveCard.ts`): a level gained, gear found, a hero fallen, a heart burned.
// Each line fades in once; nothing loops. A quiet wave has none, and the list hides. Above them, every item the wave brought in
// (RECAP-REVEAL, `sim/waveGains.ts`), as small chips with the packs' icons that wrap onto a second row when there are many.

import type { WaveNote } from './sim/waveCard';
import { gainText, type WaveGain } from './sim/waveGains';
import { gearIcon, relicIcon } from './render/items';
import { portrait } from './render/sheets';
import { UNITS } from './sim/units';
import { EQUIP_BASES, type Rarity } from './sim/equipment';
import type { ChestKind } from './sim/armyStars';
import type { TomeSize } from './sim/tomes';
import { TOME_ICON } from './tomeArt';
import { ORE_ICON } from './oreView';
import { ICONS } from './menuArt';
import { itemIcon } from './equipView';
import { chestPicture } from './chestStash';

const MARKS: Record<WaveNote['kind'], string> = { level: '▲', ult: '✦', drop: '✧', found: '◆', fell: '✝', heart: '♥', horn: '♪', quest: '❖' };

const img = (src: string): HTMLElement => {
  const i = document.createElement('img');
  i.src = src;
  i.alt = '';
  i.draggable = false;
  return i;
};

/** A gain's picture: the hero's face, the gear's or relic's icon, the chest, the tome, the stone or the ore. */
export function gainIcon(g: WaveGain): HTMLElement | null {
  if (g.kind === 'joined' || g.kind === 'recruit' || g.kind === 'shard' || g.kind === 'unlockShard') return UNITS[g.id] ? portrait(UNITS[g.id].sheet, 40) : null;
  if (g.kind === 'gear') {
    const [slot, tier] = g.id.split(':');
    return gearIcon(slot, Number(tier)) ? img(gearIcon(slot, Number(tier))) : null;
  }
  if (g.kind === 'relic') return relicIcon(g.id) ? img(relicIcon(g.id)) : null;
  if (g.kind === 'equip') {
    const base = g.id.split(':')[0];
    const def = EQUIP_BASES[base];
    return def ? itemIcon({ id: 0, base, rarity: (g.rarity ?? 1) as Rarity, level: 1 }, def.slot, 'small') : null;
  }
  if (g.kind === 'chest') {
    const box = document.createElement('span');
    box.className = 'wgChest';
    box.append(chestPicture(g.id as ChestKind, 1).root);
    return box;
  }
  if (g.kind === 'tome') return img(TOME_ICON[g.id as TomeSize]);
  if (g.kind === 'stone') return img(ICONS.stones);
  if (g.kind === 'ore') return ORE_ICON[g.id] ? img(ORE_ICON[g.id]) : null;
  return null;
}

/** The wave's gains as a row of chips (two of a kind are one chip, ×2). */
function drawGains(root: HTMLElement, gains: readonly WaveGain[]): void {
  if (!gains.length) return;
  const box = document.createElement('div');
  box.className = 'wg';
  box.setAttribute('aria-label', 'Gained this wave');
  gains.forEach((g, i) => {
    const chip = document.createElement('span');
    chip.className = `wgChip ${g.kind}${g.rarity ? ` r${g.rarity}` : ''}`;
    chip.style.setProperty('--i', String(Math.min(i, 8)));
    chip.title = gainText(g);
    const pic = gainIcon(g);
    if (pic) {
      pic.classList.add('wgIco');
      pic.setAttribute('aria-hidden', 'true');
      chip.append(pic);
    }
    chip.append(document.createTextNode(gainText(g)));
    box.append(chip);
  });
  root.append(box);
}

export function drawWaveNotes(root: HTMLElement, notes: readonly WaveNote[], gains: readonly WaveGain[] = []): void {
  root.replaceChildren();
  root.hidden = !notes.length && !gains.length;
  drawGains(root, gains);
  notes.forEach((n, i) => {
    const line = document.createElement('p');
    line.className = `wn ${n.kind}`;
    line.style.setProperty('--i', String(Math.min(i, 6)));
    const mark = document.createElement('span');
    mark.textContent = MARKS[n.kind];
    mark.setAttribute('aria-hidden', 'true');
    line.append(mark, document.createTextNode(n.text));
    root.append(line);
  });
}
