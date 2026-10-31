// The tavern's quick Upgrades list (TAVERN-RANKUP): every hero with a rank or an awakening ready, each with a one-tap button,
// and "Upgrade all" (after a confirm that shows the totals). A row updates where it is after its step is taken, with the sheet's
// own flourish played short over its picture, so nothing has to be backed out of. The steps are the rules' own (`sim/upgradesReady.ts`
// calls `rankUp` and `awaken`). Also the small gold chevron that marks a hero with an upgrade ready, wherever a hero card is drawn.

import { UNITS } from './sim/units';
import { heroName } from './sim/heroNames';
import { MAX_RANK, saveMeta, takenRank, type Meta } from './sim/meta';
import { awakenedOf } from './sim/awaken';
import { ORES } from './sim/awakenMats';
import { planUpgradeAll, takeUpgrade, talentList, talentPointsReady, upgradeAll, upgradeList, upgradeOf, type AllTaken, type Took } from './sim/upgradesReady';
import { heroArtwork } from './heroArtwork';
import { gems, playAwakenShow, tellAwakened } from './awakenView';
import { oreIcon } from './oreView';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(MAX_RANK - n);

const SVG = 'http://www.w3.org/2000/svg';
/** The gold up-chevron of a hero with an upgrade ready: it bobs gently (still when motion is reduced), never blinks. */
export function upMark(cls = ''): HTMLElement {
  const i = el('i', `upMark${cls ? ` ${cls}` : ''}`);
  i.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 10 10');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', 'M2 6.6 L5 3.6 L8 6.6');
  svg.append(path);
  i.append(svg);
  return i;
}

const oreName = (trait: string): string => ORES[trait]?.name ?? 'ore';

/** One step's words: what it is, and what it takes. */
function stepWords(m: Meta, kind: string): { what: string; cost: string; btn: string; can: boolean; ore: string } | null {
  const u = upgradeOf(m, kind);
  if (!u) return null;
  if (u.what === 'rank') return { what: `Rank ${u.to - 1} → ${u.to}`, cost: `Earned with ${u.shards} ${u.shards === 1 ? 'shard' : 'shards'}`, btn: 'Rank up', can: true, ore: '' };
  const what = u.to === 1 ? 'Awakening' : 'Second awakening';
  const cost = u.can ? `Uses ${u.shards} shards + ${u.oreCost} ${oreName(u.ore)}` : `${oreName(u.ore)} ${u.oreHave} / ${u.oreCost}`;
  return { what, cost, btn: u.can ? 'Awaken' : 'Short of ore', can: u.can, ore: u.ore };
}

/** The totals of "Upgrade all" in plain words. */
export function allWords(t: AllTaken): string {
  const parts: string[] = [];
  if (t.ranks) parts.push(`${t.ranks} ${t.ranks === 1 ? 'rank' : 'ranks'}`);
  if (t.awakenings) parts.push(`${t.awakenings} ${t.awakenings === 1 ? 'awakening' : 'awakenings'}`);
  let line = `${t.heroes.length} ${t.heroes.length === 1 ? 'hero' : 'heroes'}: ${parts.join(' and ')}.`;
  const spend = Object.entries(t.ores).map(([trait, n]) => `${n} ${oreName(trait)}`);
  if (t.shards || spend.length) line += ` Uses ${[t.shards ? `${t.shards} shards` : '', ...spend].filter(Boolean).join(', ')}.`;
  else line += ' Ranks use up no shards.';
  return line;
}

let openNow: (() => void) | null = null;

/** Open the list over the page. `kinds` is the roster order (the order "Upgrade all" pays in); `changed` is told when it closes
 *  after anything was taken; `onHero` opens a hero's sheet (a tap on a row's picture or name); `onTalents` opens a hero's talent tree
 *  (TALENT-ARROWS: a row "Talent points: 2 to spend" for each hero with points to spend, after the ranks and awakenings; "Upgrade all"
 *  never spends them, as talents are choices). */
export function openUpgrades(meta: Meta, kinds: readonly string[], changed: () => void, onHero?: (kind: string) => void, onTalents?: (kind: string) => void): void {
  openNow?.();
  const order = kinds.filter((k) => meta.unlocked.includes(k));
  const listed = upgradeList(meta, order).map((u) => u.kind);
  const talents = onTalents ? talentList(meta, order) : [];
  let took = false;
  // (first awakenings taken here: the page's cinematic for each waits until the list is closed, so it never plays behind it)
  const woke: [string, number][] = [];
  const back = el('div', 'ulBack');
  const card = el('div', 'ulCard');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'ulTitle');
  const head = el('div', 'ulHead');
  const title = el('h3', '', 'Upgrades ready');
  title.id = 'ulTitle';
  const count = el('small', 'ulCount');
  const x = el('button', 'ulClose', '×');
  x.type = 'button';
  x.setAttribute('aria-label', 'Close');
  head.append(title, count, x);
  const rows = el('div', 'ulRows');
  const foot = el('div', 'ulFoot');
  const all = el('button', 'primary ulAll');
  all.type = 'button';
  const ask = el('div', 'ulAsk');
  ask.hidden = true;
  const askText = el('p');
  const yes = el('button', 'primary', 'Upgrade all');
  yes.type = 'button';
  const no = el('button', '', 'Cancel');
  no.type = 'button';
  const askBtns = el('div', 'ulAskBtns');
  askBtns.append(yes, no);
  ask.append(askText, askBtns);
  foot.append(all, ask);
  card.append(head, rows, foot);
  back.append(card);

  // (each row is built once, its picture kept, so a flourish over it plays on while the words and the button change)
  interface Row { kind: string; box: HTMLElement; pic: HTMLElement; step: number; ranks: HTMLElement; what: HTMLElement; cost: HTMLElement; go: HTMLButtonElement }
  const made: Row[] = [];
  const talentRows: (() => void)[] = [];
  const picOf = (kind: string): HTMLImageElement => {
    const img = heroArtwork(kind, false, awakenedOf(meta, kind));
    img.alt = '';
    return img;
  };
  for (const kind of listed) {
    const box = el('div', 'ulRow');
    box.dataset.kind = kind;
    const pic = el('button', 'ulPic');
    pic.type = 'button';
    pic.setAttribute('aria-label', `Open ${heroName(kind)}'s sheet`);
    pic.append(picOf(kind));
    const text = el('div', 'ulText');
    const name = el('b', '', heroName(kind));
    const ranks = el('span', 'ulStars');
    const what = el('span', 'ulWhat');
    const cost = el('small', 'ulCost');
    text.append(name, ranks, what, cost);
    const go = el('button', 'ulGo');
    go.type = 'button';
    box.append(pic, text, go);
    rows.append(box);
    const row: Row = { kind, box, pic, step: awakenedOf(meta, kind), ranks, what, cost, go };
    made.push(row);
    go.addEventListener('click', () => {
      const t = takeUpgrade(meta, kind);
      if (!t) return paint();
      saveMeta(meta);
      took = true;
      shown([t]);
      paint();
    });
    if (onHero)
      pic.addEventListener('click', () => {
        close();
        onHero(kind);
      });
  }

  // (TALENT-ARROWS: the talent rows, each with a button that opens the hero's tree; the list closes first, as a picture's tap does)
  for (const t of talents) {
    const box = el('div', 'ulRow ulTalent');
    box.dataset.kind = t.kind;
    const pic = el('button', 'ulPic');
    pic.type = 'button';
    pic.setAttribute('aria-label', `Open ${heroName(t.kind)}'s talents`);
    pic.append(picOf(t.kind));
    const text = el('div', 'ulText');
    const what = el('span', 'ulWhat');
    text.append(el('b', '', heroName(t.kind)), what, el('small', 'ulCost', 'A choice: pick the talents yourself'));
    const go = el('button', 'ulGo', 'Spend');
    go.type = 'button';
    box.append(pic, text, go);
    rows.append(box);
    const paintTalent = () => {
      const n = talentPointsReady(meta, t.kind);
      what.textContent = n ? `Talent points: ${n} to spend` : 'Talent points: all spent';
      box.classList.toggle('done', !n);
    };
    talentRows.push(paintTalent);
    const open = () => {
      close();
      onTalents!(t.kind);
    };
    go.addEventListener('click', open);
    pic.addEventListener('click', open);
  }

  /** The short flourish over each hero that rose (once a hero, its last step), a little apart so they do not all land at once. */
  const shown = (steps: Took[]): void => {
    const last = new Map<string, Took>();
    for (const s of steps) last.set(s.kind, s);
    [...last.values()].forEach((s, i) => {
      const row = made.find((r) => r.kind === s.kind);
      if (s.what === 'awaken') woke.push([s.kind, s.n]);
      if (!row) return;
      setTimeout(() => {
        if (!back.isConnected) return;
        // (an awakening takes on its new picture before its show)
        const step = awakenedOf(meta, s.kind);
        if (step !== row.step) {
          row.step = step;
          row.pic.querySelector('img')?.replaceWith(picOf(s.kind));
        }
        row.pic.querySelector('.awakeShow')?.remove();
        playAwakenShow(row.pic, s.what === 'awaken' ? s.n : 1, s.what === 'rank' ? `Rank ${s.n}` : undefined, s.what === 'awaken' ? s.kind : undefined);
      }, i * 140);
    });
  };

  const paint = (): void => {
    let ready = 0;
    for (const r of made) {
      const w = stepWords(meta, r.kind);
      r.ranks.textContent = `${stars(takenRank(meta, r.kind))} ${gems(awakenedOf(meta, r.kind))}`;
      r.box.classList.toggle('done', !w);
      r.box.classList.toggle('short', !!w && !w.can);
      r.go.disabled = !w?.can;
      if (!w) {
        r.what.textContent = `${UNITS[r.kind].name} · all taken`;
        r.cost.replaceChildren();
        r.go.textContent = '✓ Done';
        continue;
      }
      if (w.can) ready++;
      r.what.textContent = w.what;
      r.cost.replaceChildren(...(w.ore ? [oreIcon(w.ore, 'oreIco ulOre')] : []), w.cost);
      r.go.textContent = w.btn;
    }
    for (const p of talentRows) p();
    const spend = talents.filter((t) => talentPointsReady(meta, t.kind) > 0).length;
    count.textContent = ready || spend ? [ready ? `${ready} ready` : '', spend ? `${spend} with talents` : ''].filter(Boolean).join(' · ') : 'all taken';
    const plan = planUpgradeAll(meta, order);
    all.disabled = !plan.steps.length;
    all.textContent = plan.steps.length ? `Upgrade all (${plan.steps.length})` : 'Nothing more to upgrade';
    if (!made.length && !talents.length) rows.replaceChildren(el('p', 'ulNone', 'No hero has an upgrade ready. Shards earn ranks; at four stars, shards and rift ores awaken a hero.'));
  };

  all.addEventListener('click', () => {
    const plan = planUpgradeAll(meta, order);
    if (!plan.steps.length) return;
    askText.textContent = allWords(plan);
    ask.hidden = false;
    all.hidden = true;
    yes.focus();
  });
  const unask = (): void => {
    ask.hidden = true;
    all.hidden = false;
  };
  no.addEventListener('click', unask);
  yes.addEventListener('click', () => {
    unask();
    const done = upgradeAll(meta, order);
    if (!done.steps.length) return paint();
    saveMeta(meta);
    took = true;
    shown(done.steps);
    paint();
  });

  const key = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  const close = (): void => {
    document.removeEventListener('keydown', key);
    back.remove();
    openNow = null;
    if (took) changed();
    for (const [kind, n] of woke) tellAwakened(kind, n);
  };
  openNow = close;
  x.addEventListener('click', close);
  back.addEventListener('click', (e) => {
    if (e.target === back) close();
  });
  document.addEventListener('keydown', key);
  paint();
  document.body.append(back);
  x.focus();
}
