// The JRPG results screen (JRPG-RECAP, `sim/jrpgRecap.ts` for its rules): a VICTORY (or DEFEAT) banner with the fight's time and
// foes felled; a row for each hero with its face, level and an XP bar that fills live as the XP counts up, a "LEVEL UP!" burst, the
// stats that rose (old → new, the gain in green) and any skill it opened; the MVP; the gold and crowns counted up; every item found
// as an icon with its name; and the lines the old card told (the War Horn, rare drops, the fallen, hearts, quests). It is used on
// the result card after every fight (`main.ts`) and at the top of a run's end recap (`recapView.ts`).
//
// One clock drives it all: `render(t)` sets every part from the time since it began, so a tap (`finish`) simply renders the end. A
// level-up's burst is a one-off CSS animation; nothing loops or blinks. Reduced motion shows the end at once.

import { compactXp, levelBadge } from './levelBadge';
import { countAt, growthAt, xpToNext, type HeroGrowth, type ResultLine } from './sim/jrpgRecap';
import { heroName } from './sim/heroNames';
import { play } from './render/sound';
import { reducedMotion } from './reviveView';
import { signed } from './sim/statLines';

/** One hero's row. */
export interface JrHero {
  kind: string;
  growth: HeroGrowth;
  /** Its face (a portrait canvas). */
  face: HTMLElement;
  /** Sat out the fight (a benched hero that rose a level). */
  bench?: boolean;
  /** Ended the fight down. */
  fell?: boolean;
  mvp?: boolean;
  /** Words in place of the XP figure (a Last Stand hero's kills: its levels have no XP total). */
  note?: string;
}

/** A figure counted up: gold, crowns, chests. */
export interface JrCount {
  label: string;
  n: number;
  /** "+" before a gain (the default), "" for a plain figure. */
  sign?: string;
  /** A small note after it ("a replay pays a share"). */
  note?: string;
  /** Its picture, a URL. */
  icon?: string;
}

/** An item found, with its icon. */
export interface JrItem {
  icon: HTMLElement | null;
  text: string;
  /** The chip's own classes (its kind and rarity, for the frame colour). */
  cls?: string;
}

/** A piece of gear on the spoils page: its icon, name, rarity (1 to 5, its colour) and where it went. */
export interface JrGear {
  icon: HTMLElement | null;
  name: string;
  rarity: number;
  /** "Common", "Rare"... */
  rarityName: string;
  where: string;
  n: number;
}

/** The final recap's spoils page (RECAP-SPOILS): the lasting money counted up, the gear, the items; or a short line when nothing came. */
export interface JrSpoils {
  money: readonly JrCount[];
  gear: readonly JrGear[];
  items: readonly JrItem[];
  /** The line for a run that found nothing. */
  none: string;
}

export interface JrData {
  won: boolean;
  /** "VICTORY", "DEFEAT", "RUN OVER"... */
  title: string;
  /** The line under it: "Wave 4 of 15 won", "Army defeated!". */
  sub: string;
  /** The fight's facts under the banner: time, foes felled. */
  facts: readonly { label: string; value: string }[];
  heroes: readonly JrHero[];
  mvp?: { face: HTMLElement; name: string; line: string };
  counts: readonly JrCount[];
  items: readonly JrItem[];
  /** The final recap's spoils page, in place of `counts` and `items` (RECAP-SPOILS). */
  spoils?: JrSpoils;
  lines: readonly ResultLine[];
  /** Short cheers under the counts ("First clear!"). */
  notes?: readonly string[];
  /** What the foot says once everything has counted up ("Tap to continue"); none for no hint. */
  hint?: string;
}

export interface JrPlayer {
  /** Jump to the end: true when it was still counting. */
  finish(): boolean;
  /** Whether everything has counted up. */
  done(): boolean;
  /** Stop the clock (the screen is going). */
  stop(): void;
  /** Change the banner's line (the result card's heading can change as it is redrawn). */
  setSub(text: string): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const num = (n: number) => Math.round(n).toLocaleString('en-GB');

const MARKS: Record<ResultLine['kind'], string> = { level: '▲', ult: '✦', drop: '✧', found: '◆', fell: '✝', heart: '♥', horn: '♪', quest: '❖', bench: '▲', learned: '✦', skill: '✦', study: '✎', wear: '⚒', guest: '⚑' };

/** The clock's beats, in ms. */
const T = { ROWS: 450, FILL: 1300, COUNT: 900, ITEM: 70, LINE: 90, GAP: 150 };

/** A row's parts the clock updates. */
interface Row {
  h: JrHero;
  root: HTMLElement;
  badge: HTMLElement;
  fill: HTMLElement;
  xp: HTMLElement;
  next: HTMLElement;
  start: number;
  shownLevel: number;
  burst: boolean;
}

/** Build the screen into `head` (banner and facts) and `body` (the party, MVP, spoils and lines), and start its clock. */
export function playResults(parts: { head: HTMLElement; body: HTMLElement }, d: JrData, onDone?: () => void): JrPlayer {
  const { head, body } = parts;
  head.replaceChildren();
  body.replaceChildren();
  head.hidden = body.hidden = false;
  head.className = `jrHead ${d.won ? 'won' : 'lost'}`;
  body.className = `jrBody ${d.won ? 'won' : 'lost'}${d.heroes.length > 5 ? ' compact' : ''}`;

  // the banner: the word, its line, the facts
  const title = el('div', 'jrTitle', d.title);
  title.setAttribute('role', 'heading');
  const sub = el('div', 'jrSub', d.sub);
  head.append(el('i', 'jrRays'), title, sub);
  if (d.facts.length) {
    const facts = el('div', 'jrFacts');
    for (const f of d.facts) {
      const c = el('span');
      c.append(el('small', '', f.label), el('b', '', f.value));
      facts.append(c);
    }
    head.append(facts);
  }
  const skip = el('button', 'jrSkip', 'Skip ▸▸');
  skip.type = 'button';
  skip.setAttribute('aria-label', 'Skip the count');
  head.append(skip);

  // the party
  const n = d.heroes.length;
  const stagger = n > 5 ? 60 : 110;
  const rows: Row[] = [];
  if (n) {
    body.append(el('h3', 'jrHeading', 'The company'));
    const list = el('div', 'jrParty');
    d.heroes.forEach((h, i) => {
      const g = h.growth;
      const root = el('div', `jrRow${h.bench ? ' bench' : ''}${h.fell ? ' fell' : ''}${h.mvp ? ' mvp' : ''}${g.top ? ' top' : ''}`);
      root.style.setProperty('--i', String(Math.min(i, 10)));
      const face = el('div', 'jrFace');
      face.append(h.face);
      const badge = levelBadge(g.from, 'jrLv');
      face.append(badge);
      const main = el('div', 'jrMain');
      const name = el('div', 'jrName');
      name.append(el('b', '', heroName(h.kind)));
      if (h.mvp) name.append(el('em', 'jrTag mvp', 'MVP'));
      if (h.fell) name.append(el('em', 'jrTag fell', 'Fell'));
      if (h.bench) name.append(el('em', 'jrTag bench', 'Bench'));
      name.append(el('strong', 'jrStamp', 'LEVEL UP!'));
      const bar = el('i', 'jrBar');
      const fill = el('span');
      bar.append(fill);
      const nums = el('div', 'jrNums');
      const xp = el('small', 'jrXp');
      const next = el('small', 'jrNext');
      nums.append(xp, next);
      main.append(name, bar, nums);
      root.append(face, main);
      // (the stats that rose and what opened, shown from the level-up on)
      if (g.stats.length || g.scores.length || g.learnt.length) {
        const up = el('div', 'jrGrowth');
        for (const s of g.stats) {
          const line = el('span', 'jrStat');
          line.append(el('small', '', s.stat), el('b', '', num(s.from)), el('i', '', '→'), el('b', 'to', num(s.to)), el('em', '', `+${num(s.gain)}`));
          up.append(line);
        }
        // (STATS batch 3: the ability scores those levels raised, and on a proficiency step to hit and skill DC)
        for (const s of g.scores) {
          const line = el('span', 'jrStat jrScore');
          const sh = (n: number) => (s.signed ? signed(n) : num(n));
          line.append(el('small', '', s.label), el('b', '', sh(s.from)), el('i', '', '→'), el('b', 'to', sh(s.to)), el('em', '', `+${num(s.gain)}`), el('small', 'jrWhy', s.note));
          up.append(line);
        }
        for (const l of g.learnt) up.append(el('span', `jrLearn ${l.kind}`, l.text));
        root.append(up);
      }
      list.append(root);
      rows.push({ h, root, badge, fill, xp, next, start: T.ROWS + i * stagger, shownLevel: g.from, burst: false });
    });
    body.append(list);
  }
  const rowsEnd = n ? T.ROWS + (n - 1) * stagger + T.FILL : T.ROWS;

  // later parts arrive one by one: each has its time
  const arrivals: { at: number; node: HTMLElement }[] = [];
  let at = rowsEnd + T.GAP;
  if (d.mvp) {
    const box = el('div', 'jrMvp jrIn');
    const face = el('div', 'jrMvpFace');
    face.append(d.mvp.face, el('em', 'jrCrown', '♛'));
    const words = el('div');
    words.append(el('small', '', 'MVP of the fight'), el('b', '', d.mvp.name), el('p', '', d.mvp.line));
    box.append(face, words);
    body.append(box);
    arrivals.push({ at, node: box });
    at += T.GAP;
  }
  const countEls: { c: JrCount; b: HTMLElement }[] = [];
  const countAt0 = at;
  if (d.spoils) {
    // (RECAP-SPOILS: the final recap's spoils page, its own step after the company: money, gear, items)
    const sp = d.spoils;
    const page = el('section', 'jrSpoils jrSpoilsPage jrIn');
    page.append(el('h3', 'jrHeading', 'Spoils of the run'));
    body.append(page);
    arrivals.push({ at, node: page });
    const group = (title: string, extra = ''): HTMLElement => {
      const g = el('div', `jrGroup ${extra}`);
      g.append(el('h4', 'jrGroupHead', title));
      page.append(g);
      return g;
    };
    if (sp.money.length) {
      const counts = el('div', 'jrCounts');
      for (const c of sp.money) {
        const cell = el('div', 'jrCount');
        if (c.icon) {
          const img = el('img');
          img.src = c.icon;
          img.alt = '';
          cell.append(img);
        }
        const b = el('b');
        cell.append(el('small', '', c.label), b);
        if (c.note) cell.append(el('em', '', c.note));
        counts.append(cell);
        countEls.push({ c, b });
      }
      group('Money', 'money').append(counts);
    }
    for (const t of d.notes ?? []) page.append(el('p', 'jrNote', t));
    let k = 0;
    // (a big haul arrives quicker: the whole page in at most two seconds)
    const step = Math.min(T.ITEM, 1800 / Math.max(1, sp.gear.length + sp.items.length));
    if (sp.gear.length) {
      const list = el('div', `jrGearList${sp.gear.length > 6 ? ' many' : ''}`);
      for (const g of sp.gear) {
        const row = el('div', `jrGear jrIn r${g.rarity}`);
        if (g.icon) {
          g.icon.classList.add('jrIco');
          g.icon.setAttribute('aria-hidden', 'true');
          row.append(g.icon);
        }
        const words = el('div', 'jrGearWords');
        words.append(el('b', '', `${g.name}${g.n > 1 ? ` ×${g.n}` : ''}`), el('small', '', `${g.rarityName} · ${g.where}`));
        row.append(words);
        list.append(row);
        arrivals.push({ at: at + 200 + k++ * step, node: row });
      }
      group('Gear', 'gear').append(list);
    }
    if (sp.items.length) {
      const items = el('div', 'jrItems');
      for (const it of sp.items) {
        const chip = el('span', `jrItem jrIn ${it.cls ?? ''}`);
        if (it.icon) {
          it.icon.classList.add('jrIco');
          it.icon.setAttribute('aria-hidden', 'true');
          chip.append(it.icon);
        }
        chip.append(el('span', '', it.text));
        chip.title = it.text;
        items.append(chip);
        arrivals.push({ at: at + 200 + k++ * step, node: chip });
      }
      group('Items', 'items').append(items);
    }
    if (!sp.money.length && !sp.gear.length && !sp.items.length) page.append(el('p', 'jrNone', sp.none));
    at += 200 + k * step;
    at = Math.max(at, countAt0 + T.COUNT);
  } else if (d.counts.length || d.items.length || d.notes?.length) {
    const spoils = el('section', 'jrSpoils jrIn');
    spoils.append(el('h3', 'jrHeading', 'Spoils'));
    body.append(spoils);
    arrivals.push({ at, node: spoils });
    if (d.counts.length) {
      const counts = el('div', 'jrCounts');
      for (const c of d.counts) {
        const cell = el('div', 'jrCount');
        if (c.icon) {
          const img = el('img');
          img.src = c.icon;
          img.alt = '';
          cell.append(img);
        }
        const b = el('b');
        cell.append(el('small', '', c.label), b);
        if (c.note) cell.append(el('em', '', c.note));
        counts.append(cell);
        countEls.push({ c, b });
      }
      spoils.append(counts);
    }
    for (const t of d.notes ?? []) spoils.append(el('p', 'jrNote', t));
    if (d.items.length) {
      const items = el('div', 'jrItems');
      d.items.forEach((it, i) => {
        const chip = el('span', `jrItem jrIn ${it.cls ?? ''}`);
        if (it.icon) {
          it.icon.classList.add('jrIco');
          it.icon.setAttribute('aria-hidden', 'true');
          chip.append(it.icon);
        }
        chip.append(el('span', '', it.text));
        chip.title = it.text;
        items.append(chip);
        arrivals.push({ at: at + 200 + i * T.ITEM, node: chip });
      });
      spoils.append(items);
      at += 200 + d.items.length * T.ITEM;
    }
    at = Math.max(at, countAt0 + T.COUNT);
  }
  if (d.lines.length) {
    const box = el('div', 'jrLines');
    d.lines.forEach((l, i) => {
      const p = el('p', `jrLine jrIn ${l.kind}`);
      const mark = el('span', '', MARKS[l.kind]);
      mark.setAttribute('aria-hidden', 'true');
      p.append(mark, document.createTextNode(l.text));
      box.append(p);
      arrivals.push({ at: at + i * T.LINE, node: p });
    });
    body.append(box);
    at += d.lines.length * T.LINE;
  }
  const hint = el('p', 'jrHint jrIn', d.hint ?? '');
  if (d.hint) body.append(hint);
  const end = at + T.GAP;

  // the clock
  let t0 = performance.now();
  let raf = 0;
  let over = false;
  let lastSound = -1e9;
  const sound = (name: 'levelUp' | 'coin', now: number) => {
    if (now - lastSound < 220) return;
    lastSound = now;
    play(name);
  };
  let coined = false;

  const render = (t: number, quiet = false): void => {
    for (const r of rows) {
      const g = r.h.growth;
      const s = growthAt(g, (t - r.start) / T.FILL);
      r.fill.style.width = `${(s.fill * 100).toFixed(1)}%`;
      if (g.rule === 'stand') {
        r.xp.textContent = r.h.note ?? '';
        r.next.textContent = g.to > g.from ? `+${s.level - g.from} ${s.level - g.from === 1 ? 'level' : 'levels'}` : '';
      } else {
        r.xp.textContent = `+${compactXp(Math.max(0, s.xp - g.xpFrom))} XP`;
        r.next.textContent = s.level >= g.to && g.top ? 'MAX' : `Next ${compactXp(xpToNext(s.xp, g.rule))}`;
      }
      if (s.level !== r.shownLevel) {
        r.shownLevel = s.level;
        const b = levelBadge(s.level, 'jrLv bump');
        r.badge.replaceWith(b);
        r.badge = b;
      }
      if (s.level > g.from && !r.burst) {
        r.burst = true;
        r.root.classList.add('up');
        if (!quiet) sound('levelUp', t);
      }
    }
    for (const { c, b } of countEls) {
      const v = countAt(0, c.n, (t - countAt0) / T.COUNT);
      b.textContent = `${c.sign ?? '+'}${num(v)}`;
    }
    if (!coined && t >= countAt0 && countEls.some((x) => x.c.n > 0)) {
      coined = true;
      if (!quiet) sound('coin', t);
    }
    for (const a of arrivals) if (t >= a.at) a.node.classList.add('on');
    if (t >= end && !over) {
      over = true;
      skip.hidden = true;
      if (d.hint) hint.classList.add('on');
      head.classList.add('done');
      body.classList.add('done');
      onDone?.();
    }
  };

  const frame = (): void => {
    raf = 0;
    render(performance.now() - t0);
    if (!over) raf = requestAnimationFrame(frame);
  };
  const finish = (): boolean => {
    if (over) return false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    // (one chime for the levels the skip passed over)
    const missed = rows.some((r) => !r.burst && r.h.growth.to > r.h.growth.from);
    render(Infinity, true);
    if (missed) play('levelUp');
    return true;
  };
  skip.addEventListener('click', (e) => {
    e.stopPropagation();
    finish();
  });
  if (reducedMotion()) {
    head.classList.add('calm');
    body.classList.add('calm');
    render(Infinity, true);
  } else {
    render(0);
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }
  return {
    finish,
    done: () => over,
    stop: () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      over = true;
    },
    setSub: (text: string) => {
      if (sub.textContent !== text) sub.textContent = text;
    },
  };
}
