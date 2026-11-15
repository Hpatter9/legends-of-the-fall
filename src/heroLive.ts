// HERO-LIVE-STATS (docs/notes/hero-live-stats.md): the fight HUD's stats panel. A tap on a hero (on the board, or its row) swaps the hero
// rows for this panel, in the same place at the foot of the screen: the hero's portrait, name, level, rank and stars, its health, pool and
// shield as bars with their numbers, its XP into the level, its ultimate's charge, this fight's numbers (dealt, taken, healed, kills,
// skills cast), its fighting numbers marked up or down against the fight's start, every buff and ailment with its icon and time left (a
// tap on one says what it does), and the rest worth knowing. "‹ Skills" (or a tap on the portrait) puts the rows back.
//
// It reads the battle only (`heroLiveRules.ts`), and is written a few times a second, each part only when its words have changed: the
// fight's speed is never touched.

import type { Battle, Unit } from './sim/battle';
import { portrait } from './render/sheets';
import { battleSheet } from './render/awakenLook';
import { heroFace } from './heroFace';
import { COMBAT_ART } from './combatArtAssets';
import atlasUrl from './art/fx/status/atlas.png';
import atlas from './art/fx/status/atlas.json';
import { leftWords, liveOf, shortNum, type LiveEffect, type LiveOpts, type LiveView, type StatNumbers } from './heroLiveRules';
import type { HeroStat } from './sim/fightStats';

/** How often the panel is written (ms of the page's clock): five times a second reads as live, and costs next to nothing. */
export const LIVE_EVERY_MS = 200;

const ATLAS = atlas as { cell: number; parts: Record<string, number[]> };
/** The atlas's size in cells (1536 x 1152 at 96 px). */
const ATLAS_COLS = 16;
const ATLAS_ROWS = 12;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** An effect's icon at `px`: the ailment's own frame of the status atlas, or a painted combat motif. */
export function effectIcon(e: LiveEffect, px: number): string {
  if ('ail' in e.icon) {
    const at = ATLAS.parts[`${e.icon.ail}.icon`];
    if (at) {
      const k = px / ATLAS.cell;
      return `<i class="fhlIco" style="width:${px}px;height:${px}px;background-image:url(${atlasUrl});background-size:${ATLAS_COLS * ATLAS.cell * k}px ${ATLAS_ROWS * ATLAS.cell * k}px;background-position:-${at[0] * px}px -${at[1] * px}px"></i>`;
    }
    return `<i class="fhlIco dot" style="width:${px}px;height:${px}px"></i>`;
  }
  const src = COMBAT_ART[e.icon.motif];
  return src ? `<img class="fhlIco" src="${src}" width="${px}" height="${px}" alt="" draggable="false">` : `<i class="fhlIco dot" style="width:${px}px;height:${px}px"></i>`;
}

export interface LivePanelOpts extends LiveOpts {
  /** The hero's row of the fight's tally (`fightStats.ts`). */
  statOf?: (id: number) => HeroStat | undefined;
  /** The awakened step its portrait is drawn at. */
  equipmentStep?: (kind: string) => number;
  /** The panel's "‹ Skills" or portrait was tapped. */
  onClose: () => void;
  /** The back control's words ("‹ Skills"; the Assault's "‹ Orders"). */
  back?: string;
}

export class HeroLivePanel {
  readonly el: HTMLElement;
  private id: number | null = null;
  private at = -Infinity;
  private parts: Record<string, string> = {};
  /** The effect whose meaning shows (by key), until another is tapped or it wears off. */
  private tip: string | null = null;
  private last: LiveView | null = null;

  constructor(private opts: LivePanelOpts) {
    this.el = document.createElement('div');
    this.el.className = 'fhLive';
    this.el.hidden = true;
    this.el.innerHTML =
      '<div class="fhlHead"><button type="button" class="fhlPic" aria-label="Back to the skills"></button><div class="fhlWho"><b></b><small></small></div>' +
      '<div class="fhlUlt"><i></i><span></span></div><button type="button" class="fhlBack" aria-label="Back to the skills"></button></div>' +
      '<div class="fhlBars"></div><div class="fhlFight"></div><div class="fhlFx"></div><p class="fhlTip" hidden></p><dl class="fhlStats"></dl><div class="fhlNotes"></div>';
    // (a tap anywhere on the panel is the panel's: it never reaches the rows or the board)
    this.el.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = e.target as HTMLElement;
      if (t.closest('.fhlBack, .fhlPic')) return this.opts.onClose();
      const fx = t.closest<HTMLElement>('[data-fx]');
      if (fx) {
        this.tip = this.tip === fx.dataset.fx ? null : fx.dataset.fx!;
        this.writeTip();
      }
    });
    // (an effect's meaning closes on the next tap anywhere, the panel, the board or the rest of the page; a tap on another effect opens
    // that one's instead)
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (this.tip && !(e.target as HTMLElement | null)?.closest?.('.fhlEff')) {
          this.tip = null;
          this.writeTip();
        }
      },
      true,
    );
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.querySelector('.fhlBack')!.textContent = opts.back ?? '‹ Skills';
  }

  /** The hero shown, or none. */
  get shown(): number | null {
    return this.id;
  }

  /** Show hero `u` (its portrait is drawn afresh), or hide the panel with none. */
  show(b: Battle | null, u: Unit | undefined): void {
    if (!u) {
      this.id = null;
      this.el.hidden = true;
      return;
    }
    if (this.id !== u.id) {
      this.id = u.id;
      this.parts = {};
      this.tip = null;
      const step = this.opts.equipmentStep?.(u.def) ?? u.awaken ?? 0;
      const pic = heroFace(u.def, step, 96, portrait(battleSheet(u.def, step, u.grade ?? 1), 40, u.grade ?? 1));
      pic.classList.add('fhlFace');
      this.el.querySelector('.fhlPic')!.replaceChildren(pic);
    }
    this.el.hidden = false;
    this.at = -Infinity;
    if (b) this.refresh(b, new Map());
  }

  /** Bring the panel up to date (at most every `LIVE_EVERY_MS`, unless `now`). `base` holds each hero's numbers as the fight began. */
  refresh(b: Battle, base: Map<number, StatNumbers>, now = false): void {
    if (this.id === null) return;
    const clock = performance.now();
    if (!now && clock - this.at < LIVE_EVERY_MS) return;
    this.at = clock;
    const u = b.units.find((x) => x.id === this.id);
    if (!u) return;
    const v = liveOf(b, u, this.opts.statOf?.(u.id), base.get(u.id), this.opts);
    this.last = v;
    this.write(v);
  }

  private put(sel: string, key: string, html: string): void {
    if (this.parts[sel] === key) return;
    this.parts[sel] = key;
    this.el.querySelector(sel)!.innerHTML = html;
  }

  private write(v: LiveView): void {
    this.el.classList.toggle('fallen', !v.alive);
    const stars = '★'.repeat(v.grade);
    const who = `${v.name}|${v.title ?? ''}|${v.level}|${v.rank}|${v.grade}`;
    if (this.parts.who !== who) {
      this.parts.who = who;
      this.el.querySelector('.fhlWho b')!.textContent = v.name;
      this.el.querySelector('.fhlWho small')!.textContent = `Lv ${v.level}${v.rank ? ` · Rank ${v.rank}` : ''}${stars ? ` · ${stars}` : ''}${v.awaken ? ` · Awakened ${v.awaken}` : ''}`;
    }
    const ult = this.el.querySelector<HTMLElement>('.fhlUlt')!;
    const uk = `${v.ult.text}|${Math.round(v.ult.meter * 100)}`;
    if (this.parts.ult !== uk) {
      this.parts.ult = uk;
      ult.style.setProperty('--m', v.ult.meter.toFixed(2));
      ult.classList.toggle('ready', v.ult.ready);
      ult.classList.toggle('locked', v.ult.locked);
      ult.querySelector('span')!.textContent = v.ult.locked ? 'Ult at Lv 30' : `Ult ${v.ult.text}`;
      ult.title = v.ult.name ? `${v.ult.name}: ${v.ult.text}` : v.ult.text;
    }
    const barH = (cls: string, label: string, share: number, text: string) =>
      `<div class="fhlBar ${cls}"><span>${label}</span><i style="width:${(share * 100).toFixed(1)}%"></i><b>${esc(text)}</b></div>`;
    const bars =
      barH('hp', 'HP', v.hp.share, v.hp.text) +
      barH(`res ${v.pool.tag === 'MP' ? 'mana' : 'stamina'}`, v.pool.tag, v.pool.share, v.pool.text) +
      (v.shield ? barH('sh', 'Shield', v.shield.share, v.shield.text) : '') +
      (v.xp ? barH('xp', 'XP', v.xp.share, v.xp.text) : '');
    this.put('.fhlBars', bars, bars);
    const f = v.fight;
    const cell = (label: string, n: number) => `<span><b>${shortNum(n)}</b><small>${label}</small></span>`;
    const fight = cell('Dealt', f.dealt) + cell('Taken', f.taken) + cell('Healed', f.healed) + cell('Kills', f.kills) + cell('Casts', f.casts);
    this.put('.fhlFight', fight, fight);
    const stats = v.stats
      .map((s) => `<dt>${s.label}</dt><dd class="${s.trend}"${s.was ? ` title="${esc(`${s.label} was ${s.was} as the fight began`)}"` : ''}>${esc(s.value)}${s.trend === 'up' ? '<em>▲</em>' : s.trend === 'down' ? '<em>▼</em>' : ''}</dd>`)
      .join('');
    this.put('.fhlStats', stats, stats);
    // (the effects: their seconds tick, so the key holds them to a tenth; none says so)
    const fxKey = v.effects.map((e) => `${e.key}${e.stacks ?? ''}${leftWords(e)}`).join() || 'none';
    const fx = v.effects.length
      ? v.effects
          .map((e) => `<button type="button" class="fhlEff ${e.good ? 'good' : 'bad'}${this.tip === e.key ? ' on' : ''}" data-fx="${e.key}" aria-label="${esc(`${e.name}${e.left !== undefined ? `, ${leftWords(e)} left` : ''}`)}">${effectIcon(e, 16)}<span>${esc(e.name)}${e.stacks ? ` x${e.stacks}` : ''}</span>${e.left !== undefined ? `<em>${leftWords(e)}</em>` : ''}</button>`)
          .join('')
      : '<span class="fhlNone">No buffs or ailments</span>';
    this.put('.fhlFx', `${fxKey}|${this.tip}`, fx);
    this.writeTip();
    const notes = v.notes.map((n) => `<span>${esc(n)}</span>`).join('');
    this.put('.fhlNotes', notes, notes);
  }

  private writeTip(): void {
    const p = this.el.querySelector<HTMLElement>('.fhlTip')!;
    const e = this.last?.effects.find((x) => x.key === this.tip);
    if (!e) {
      if (!p.hidden) p.hidden = true;
      // (the effect has worn off: its chip's highlight goes with the next write)
      if (this.tip) delete this.parts['.fhlFx'];
      this.tip = null;
      for (const b of this.el.querySelectorAll<HTMLElement>('.fhlEff.on')) b.classList.remove('on');
      return;
    }
    const text = `${e.name}: ${e.text}`;
    if (p.textContent !== text) p.textContent = text;
    p.hidden = false;
    for (const b of this.el.querySelectorAll<HTMLElement>('.fhlEff')) b.classList.toggle('on', b.dataset.fx === this.tip);
  }
}
