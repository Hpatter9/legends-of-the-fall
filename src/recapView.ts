// The full recap of a run that has ended: waves cleared, time, gold, each hero's damage, healing and kills (with the MVP),
// and the XP, levels, crowns and chests the run paid out. A scrolling sheet in the game's brass-framed panels; its parts fade in
// once, nothing loops. The numbers come from `run.recap` (`sim/runRecap.ts`).

import { heartsBurned, mvpKind, type RunRecap } from './sim/runRecap';
import { MAX_STARS } from './sim/stars';
import { formOf, UNITS } from './sim/units';
import { portrait } from './render/sheets';
import type { ComebackGo, ComebackTip } from './sim/comeback';

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
  /** "Victory!", "Defeat" ... */
  title: string;
  /** "won" or "lost": the title's colour. */
  tone: 'won' | 'lost';
  /** One line under it: where the run got to. */
  line: string;
  /** A dry aside under it (the facts stay in `line`). */
  joke?: string;
}

/** The "How to come back stronger" card on a lost run's recap (`sim/comeback.ts`): each pointer's button closes the recap and goes there. */
export interface RecapAdvice {
  tips: ComebackTip[];
  onGo: (go: ComebackGo) => void;
}

export function showRecap(root: HTMLElement, recap: RunRecap, head: RecapHead, onClose: () => void, advice?: RecapAdvice): void {
  root.replaceChildren();
  const sheet = el('div', 'rcSheet');
  sheet.append(el('div', 'rcEyebrow', 'After-action report'), el('div', `rcTitle ${head.tone}`, head.title), el('p', 'rcLine', head.line));
  if (head.joke) sheet.append(el('p', 'rcJoke', head.joke));
  const close = (): void => {
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

  // the headline figures
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
  sheet.append(grid);

  // wave by wave (WAVE-RECAP): each wave's stars, time and MVP, which the short card after each wave left for here
  const waves = recap.waves ?? [];
  if (waves.length) {
    sheet.append(el('h3', '', 'Wave by wave'));
    const strip = el('div', 'rcWaves');
    for (const w of waves) {
      const chip = el('div', `rcWave${w.won ? '' : ' lost'}`);
      chip.append(el('b', '', `W${w.wave}`), el('span', 'rcWaveStars', w.won ? '★'.repeat(w.stars) + '☆'.repeat(Math.max(0, MAX_STARS - w.stars)) : 'Lost'), el('small', '', clock(w.ms)));
      const mvpDef = w.mvp ? UNITS[w.mvp] : undefined;
      if (mvpDef) {
        const face = el('i', 'rcWaveMvp');
        face.title = `MVP: ${mvpDef.name}`;
        face.append(portrait(formOf(mvpDef, 1), 64, 1));
        chip.append(face);
      }
      if (w.hearts) chip.append(el('em', '', '♥'.repeat(Math.min(3, w.hearts))));
      strip.append(chip);
    }
    sheet.append(strip);
  }

  // the heroes: one row a kind, strongest first
  const kinds = Object.keys(recap.heroes).filter((k) => UNITS[k]);
  const mvp = mvpKind(recap);
  const work = (k: string) => recap.heroes[k].dealt + recap.heroes[k].healed + recap.heroes[k].taken / 2;
  kinds.sort((a, b) => work(b) - work(a));
  if (kinds.length) {
    sheet.append(el('h3', '', 'Company performance'));
    const list = el('div', 'rcHeroes');
    const top = (key: 'dealt' | 'healed' | 'kills') => Math.max(1, ...kinds.map((k) => recap.heroes[k][key]));
    kinds.forEach((k, i) => {
      const t = recap.heroes[k];
      const def = UNITS[k];
      const row = el('div', `rcHero${k === mvp ? ' mvp' : ''}`);
      row.style.setProperty('--i', String(Math.min(i, 8)));
      const face = el('div', `rcFace g${t.grade}`);
      face.append(portrait(formOf(def, t.grade), 64, t.grade));
      if (k === mvp) face.append(el('em', 'rcCrown', '♛'));
      const name = el('b', '', def.name);
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
    sheet.append(list);
  }

  // XP and levels
  const xpKinds = Object.keys(recap.xp).filter((k) => UNITS[k] && recap.xp[k] > 0);
  if (xpKinds.length) {
    sheet.append(el('h3', '', 'Experience earned'));
    const list = el('div', 'rcXp');
    for (const k of xpKinds) {
      const row = el('div', 'rcXpRow');
      const lv = recap.levels[k];
      row.append(el('b', '', UNITS[k].name), el('em', '', `+${num(recap.xp[k])} XP`), el('span', lv ? 'up' : '', lv ? `Lv ${lv[0]} → ${lv[1]}` : ''));
      list.append(row);
    }
    sheet.append(list);
  }

  // what the battle found (WAVE-RECAP: the gear and prizes each wave's card named, all together)
  if (recap.found?.length) {
    sheet.append(el('h3', '', 'Spoils found'));
    const list = el('div', 'rcFound');
    for (const f of recap.found) list.append(el('p', '', f));
    sheet.append(list);
  }

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
