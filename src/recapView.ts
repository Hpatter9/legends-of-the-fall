// The full recap of a run that has ended: waves cleared, time, gold, each hero's damage, healing and kills (with the MVP),
// and the XP, levels, crowns and chests the run paid out. A scrolling sheet in the game's brass-framed panels; its parts fade in
// once, nothing loops. The numbers come from `run.recap` (`sim/runRecap.ts`).

import { heartsBurned, mvpKind, type RunRecap } from './sim/runRecap';
import { recapKind } from './sim/fightStats';
import { MAX_STARS } from './sim/stars';
import { UNITS } from './sim/units';
import { battleSheet } from './render/awakenLook';
import { heroName, heroTitle } from './sim/heroNames';
import { titleLine } from './heroTitleView';
import { portrait } from './render/sheets';
import { heroFace } from './heroFace';
import type { ComebackGo, ComebackTip } from './sim/comeback';
import { playResults, type JrData } from './jrpgRecapView';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const num = (n: number) => Math.round(n).toLocaleString('en-GB');

export interface RecapHead {
  equipmentStep?: (kind: string) => number;
  /** "Victory!", "Defeat" ... */
  title: string;
  /** "won" or "lost": the title's colour. */
  tone: 'won' | 'lost';
  /** One line under it: where the run got to. */
  line: string;
  /** A dry aside under it (the facts stay in `line`). */
  joke?: string;
  /** JRPG-RECAP: the results screen at the top (the banner, each hero's XP and levels over the run, the MVP, the gold and crowns);
   *  it takes the place of the headline figures and the XP list. */
  results?: JrData;
}

/** The "How to come back stronger" card on a lost run's recap (`sim/comeback.ts`): each pointer's button closes the recap and goes there. */
export interface RecapAdvice {
  tips: ComebackTip[];
  onGo: (go: ComebackGo) => void;
}

export function showRecap(root: HTMLElement, recap: RunRecap, head: RecapHead, onClose: () => void, advice?: RecapAdvice): void {
  root.replaceChildren();
  const sheet = el('div', 'rcSheet');
  const jrHead = el('div');
  const jrBody = el('div');
  if (head.results) sheet.append(jrHead, el('p', 'rcLine', head.line));
  else sheet.append(el('div', 'rcEyebrow', 'After-action report'), el('div', `rcTitle ${head.tone}`, head.title), el('p', 'rcLine', head.line));
  if (head.joke) sheet.append(el('p', 'rcJoke', head.joke));
  const player = head.results ? playResults({ head: jrHead, body: jrBody }, head.results) : null;
  // (a tap on the sheet hurries the count-ups to their end)
  if (player) sheet.addEventListener('click', (e) => void (!(e.target as HTMLElement).closest('button') && player.finish()));
  const close = (): void => {
    player?.stop();
    root.hidden = true;
    root.replaceChildren();
  };

  // how to come back stronger (a lost run only): two to four pointers, each with its way there
  if (advice?.tips.length) {
    const box = el('section', 'rcAdvice');
    box.setAttribute('aria-label', 'How to come back stronger');
    box.append(el('h3', '', 'How to come back stronger'));
    for (const t of advice.tips) {
      const row = el('div', 'rcTip');
      row.append(el('p', '', t.text));
      if (t.go && t.button) {
        const go = t.go;
        const b = el('button', '', t.button);
        b.addEventListener('click', () => {
          close();
          advice.onGo(go);
        });
        row.append(b);
      }
      box.append(row);
    }
    sheet.append(box);
  }

  // the party, the MVP and the spoils (JRPG-RECAP), or the headline figures
  if (player) sheet.append(jrBody);
  const grid = el('div', 'rcGrid');
  const fig = (label: string, value: string) => {
    const f = el('div', 'rcFig');
    f.append(el('b', '', value), el('span', '', label));
    return f;
  };
  grid.append(
    fig('Waves cleared', String(recap.cleared)),
    fig('Time fought', clock(recap.ms)),
    fig('Gold earned', num(recap.earned)),
    fig('Gold spent', num(recap.spent)),
    fig('Crowns', `+${num(recap.crowns)}`),
    fig('Chests', String(recap.chests)),
  );
  // (WAVE-RECAP: the hearts the battle burned, when it burned any)
  const hearts = heartsBurned(recap);
  if (hearts) grid.append(fig('Hearts burned', String(hearts)));
  if (!player) sheet.append(grid);

  // the company, and the XP and levels (`recapDetail`)
  // (the owner: "No need for the final recap to have the individual wave best heroes and stars listed": no wave strip here, RECAP-SPOILS)
  sheet.append(...recapDetail(recap, { prefix: 'W', equipmentStep: head.equipmentStep, xp: !player }));

  const done = el('div', 'rcFoot');
  const ok = el('button', 'primary', 'Continue');
  ok.addEventListener('click', () => {
    close();
    onClose();
  });
  done.append(ok);
  root.append(sheet, done);
  root.hidden = false;
  root.scrollTop = 0;
}

/** How the detail's fight-by-fight strip is headed, and what marks each fight's number ("W4" a wave, "F12" a floor, "#7" a fight). */
export interface DetailOpts {
  equipmentStep?: (kind: string) => number;
  /** The fight-by-fight strip's heading; none leaves the strip out (the run's end recap, RECAP-SPOILS). */
  strip?: string;
  prefix: string;
  /** List the XP and levels (the default); the run's end recap leaves them to its results screen's rows (JRPG-RECAP). */
  xp?: boolean;
}

/** The detail of a recap, as a list of parts to lay out in order (WAVE-RECAP-2: the run's recap here, and the spire's and the
 *  Calamity's summaries and map recaps): each fight's stars, time and MVP; each hero's damage, healing and kills, with the MVP; the XP
 *  and levels gained. A part with nothing to show is left out. */
export function recapDetail(recap: RunRecap, opts: DetailOpts): HTMLElement[] {
  const out: HTMLElement[] = [];
  // wave by wave (WAVE-RECAP): each wave's stars, time and MVP, which the short card after each wave left for here
  const waves = opts.strip ? recap.waves ?? [] : [];
  if (opts.strip && waves.length) {
    out.push(el('h3', '', opts.strip));
    const strip = el('div', 'rcWaves');
    for (const w of waves) {
      const chip = el('div', `rcWave${w.won ? '' : ' lost'}`);
      chip.append(el('b', '', `${opts.prefix}${w.wave}`), el('span', 'rcWaveStars', w.won ? '★'.repeat(w.stars) + '☆'.repeat(Math.max(0, MAX_STARS - w.stars)) : 'Lost'), el('small', '', clock(w.ms)));
      const mvpDef = w.mvp ? UNITS[w.mvp] : undefined;
      if (mvpDef) {
        const face = el('i', 'rcWaveMvp');
        face.title = `MVP: ${heroTitle(w.mvp!)}`;
        face.append(portrait(battleSheet(w.mvp!, opts.equipmentStep?.(w.mvp!) ?? 0, 1), 64, 1));
        chip.append(face);
      }
      if (w.hearts) chip.append(el('em', '', '♥'.repeat(Math.min(3, w.hearts))));
      strip.append(chip);
    }
    out.push(strip);
  }

  // the heroes: one row a kind, strongest first
  const kinds = Object.keys(recap.heroes).filter(recapKind);
  const mvp = mvpKind(recap);
  const work = (k: string) => recap.heroes[k].dealt + recap.heroes[k].healed + recap.heroes[k].taken / 2;
  kinds.sort((a, b) => work(b) - work(a));
  if (kinds.length) {
    out.push(el('h3', '', 'Company performance'));
    const list = el('div', 'rcHeroes');
    const top = (key: 'dealt' | 'healed' | 'kills') => Math.max(1, ...kinds.map((k) => recap.heroes[k][key]));
    kinds.forEach((k, i) => {
      const t = recap.heroes[k];
      const row = el('div', `rcHero${k === mvp ? ' mvp' : ''}`);
      row.style.setProperty('--i', String(Math.min(i, 8)));
      const face = el('div', `rcFace g${t.grade}`);
      // (RECAP-SPOILS: the hero's painted face, the sprite until it loads)
      const step = opts.equipmentStep?.(k) ?? 0;
      face.append(heroFace(k, step, 96, portrait(battleSheet(k, step, t.grade), 64, t.grade)));
      if (k === mvp) face.append(el('em', 'rcCrown', '♛'));
      // (the MVP is named with its title, BENCH-TITLES; the rest keep the short name)
      const name = k === mvp ? titleLine(k, 'b', 'rcMvpName', true) : el('b', '', heroName(k));
      if (k === mvp) name.append(el('small', '', 'MVP'));
      const bars = el('div', 'rcBars');
      for (const [key, label] of [['dealt', 'Damage'], ['healed', 'Healing'], ['kills', 'Kills']] as const) {
        const line = el('div', 'rcBar');
        const fill = el('span');
        fill.style.width = `${(t[key] / top(key)) * 100}%`;
        const bar = el('i');
        bar.append(fill);
        line.append(el('small', '', label), bar, el('em', '', num(t[key])));
        bars.append(line);
      }
      row.append(face, name, bars);
      list.append(row);
    });
    out.push(list);
  }

  // XP and levels
  const xpKinds = opts.xp === false ? [] : Object.keys(recap.xp).filter((k) => recapKind(k) && recap.xp[k] > 0);
  if (xpKinds.length) {
    out.push(el('h3', '', 'Experience earned'));
    const list = el('div', 'rcXp');
    for (const k of xpKinds) {
      const row = el('div', 'rcXpRow');
      const lv = recap.levels[k];
      row.append(el('b', '', heroName(k)), el('em', '', `+${num(recap.xp[k])} XP`), el('span', lv ? 'up' : '', lv ? `Lv ${lv[0]} → ${lv[1]}` : ''));
      list.append(row);
    }
    out.push(list);
  }

  // (RECAP-REVEAL: no spoils list. The gear and relics a run finds leave with it, so the owner asked for them only on each wave's
  // card; what is kept after the run, the crowns, chests, XP and levels, is above)
  return out;
}
