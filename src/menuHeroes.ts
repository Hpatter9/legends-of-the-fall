// The hero detail sheet (opened from a tap on a hero in the tavern): portrait, rank stars, level, XP bar, rarity, stats and
// skills. Reads the meta only.

import { ALL_HEROES, UNITS } from './sim/units';
import { KITS } from './sim/abilities';
import { traitsOf, TRAITS } from './sim/traits';
import { MAX_RANK, RANK_SHARDS, RARITY_NAMES as RARITY, rankMult, rankOf, rarityOf, tierMult, type Meta } from './sim/meta';
import { levelBoost, progressOf, xpOf } from './sim/levels';
import { drawEquipment } from './equipView';
import { drawTalents } from './talentView';
import { TREES } from './sim/talents';
import { kindPower, powerText } from './sim/power';
import { sprite } from './render/sheets';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
export const stars = (rank: number) => '★'.repeat(rank) + '☆'.repeat(MAX_RANK - rank);

function xpBar(meta: Meta, kind: string): { level: number; bar: HTMLElement; text: string } {
  const p = progressOf(xpOf(meta, kind));
  const bar = el('div', 'xpbar');
  const fill = el('span');
  fill.style.width = `${p.need ? (p.into / p.need) * 100 : 100}%`;
  bar.append(fill);
  return { level: p.level, bar, text: p.need ? `${p.into} / ${p.need} XP` : 'max level' };
}

/** The strongest unlocked heroes (level, then rank, then rarity), best first. */
export function strongest(meta: Meta, n: number): string[] {
  const score = (k: string) => progressOf(xpOf(meta, k)).level * 100 + rankOf(meta, k) * 10 + rarityOf(k);
  return ALL_HEROES.filter((k) => meta.unlocked.includes(k)).sort((a, b) => score(b) - score(a)).slice(0, n);
}

/** Fill the detail sheet for a hero; returns a function that stops its idle animation. */
export function drawHeroSheet(box: HTMLElement, meta: Meta, kind: string, close: () => void): () => void {
  const def = UNITS[kind];
  const open = meta.unlocked.includes(kind);
  const kit = KITS[kind];
  box.className = `hsheet r${rarityOf(kind)}`;
  box.replaceChildren();
  const head = el('div', 'hhead');
  const pic = el('div', 'hpic');
  const spr = sprite(def.sheet, 76);
  spr.canvas.style.transform = spr.faceRight ? 'translateX(-50%)' : 'translateX(-50%) scaleX(-1)';
  if (!open) spr.canvas.style.filter = 'brightness(0.15) grayscale(1)';
  pic.append(spr.canvas);
  const title = el('div');
  title.append(el('h3', '', open ? def.name : '???'), el('em', '', `${RARITY[rarityOf(kind)]} · ${open ? def.role : 'not yet recruited'}`));
  const x = xpBar(meta, kind);
  const rank = rankOf(meta, kind);
  if (open) {
    const shards = meta.shards[kind] ?? 0;
    const next = rank < MAX_RANK ? `${shards} / ${RANK_SHARDS[rank]} shards to rank ${rank + 1}` : 'max rank';
    title.append(el('span', 'stars', stars(rank)), el('span', 'lv', `Level ${x.level} · ${x.text}`), x.bar, el('span', 'lv', next));
    const tier = tierMult(kind);
    if (tier > 1) title.append(el('em', 'rtag', `${RARITY[rarityOf(kind)]} tier: +${Math.round((tier - 1) * 100)}% hp and attack`));
    const marks = traitsOf(kind).map((t) => TRAITS[t].name).join(' · ');
    if (marks) title.append(el('em', '', marks));
  }
  head.append(pic, title);
  box.append(head);
  if (open) {
    const b = levelBoost(x.level);
    const m = rankMult(rank) * tierMult(kind);
    const stat = el('div', 'hstats');
    for (const [name, v] of [['HP', Math.round(def.hp * b.hp * m)], ['Attack', Math.round(def.atk * b.atk * m)], ['Defence', def.def], ['Range', def.range]] as const) {
      const cell = el('div');
      cell.append(el('b', '', String(v)), el('small', '', name));
      stat.append(cell);
    }
    // (one number for how strong the hero is with its level, rank, equipment and talents, to set heroes side by side)
    const power = el('div', 'hpower');
    const pv = el('b', '', powerText(kindPower(meta, kind)));
    power.append(el('small', '', 'Power'), pv);
    const repower = () => (pv.textContent = powerText(kindPower(meta, kind)));
    box.append(power, stat);
    if (kit)
      for (const [label, a] of [['Skill', kit.skill], ...(kit.ultimate ? [['Ultimate', kit.ultimate] as const] : []), ['Passive', kit.passive]] as const) {
        const p = el('p');
        p.append(el('i', '', `${label} · ${a.name}: `), a.text);
        box.append(p);
      }
    if (TREES[kind]) box.append(drawTalents(meta, kind, repower));
    box.append(drawEquipment(meta, kind, repower));
    box.append(el('p', 'hint', 'Equipment is kept for good. Gear found in a run lasts that run only.'));
  }
  const done = el('button', 'primary', 'Close');
  done.addEventListener('click', close);
  box.append(done);
  let n = 0;
  const timer = setInterval(() => spr.tick(++n), 140);
  return () => clearInterval(timer);
}
