// The quest log (QUESTS batch 1): a sheet over the home screen (the hero sheet's `#hmSheet`, so it opens and closes the same way)
// with its tabs as a row of pills. Active: the quests taken, each with its goal, a bar, a Track pin and, once done, Hand in.
// Board: everything on offer from every giver, with Take. Done: the quests handed in, newest first, with their giver's last word,
// a keepsake if one came with it, and how many times a repeatable has been done. Batch 1b: a quest taken can be dropped (Drop, then
// a confirm on the row: its progress is lost).
// The Eidolons tab (EIDOLON-CHAINS): the six Eidolons' chains, their pieces and the part going (`eidolonChainView.ts`); it shows once
// the first chain has been offered.

import { giverKeyOf, giverName, giverWords, offerFrom, questFace, rewardText } from './questCard';
import { questById } from './sim/questData';
import { ACTIVE_MAX, cannotTake, dropQuest, handIn, isDone, progressOf, takeQuest, timesDone, trackedQuest, trackQuest } from './sim/quests';
import type { Meta } from './sim/meta';
import { play } from './render/sound';
import { todayKey } from './modes';
import { battleOfQuest, canFightBattle } from './sim/questRun';
import { chainsShown, summonerWaiting } from './sim/eidolonChains';
import { drawEidolonsTab } from './eidolonChainView';

export type LogTab = 'active' | 'board' | 'eidolons' | 'done';

/** The log's tabs in order. The Eidolons tab (Askel, Nivra, Aurelan, Voltara, Gorm and Vaelkhar's chains) shows once a chain has been
 *  offered (`chainsShown`): `shown` is for the tabs that always show. */
export const LOG_TABS: readonly { id: LogTab; label: string; shown: boolean }[] = [
  { id: 'active', label: 'Active', shown: true },
  { id: 'board', label: 'Board', shown: true },
  { id: 'eidolons', label: 'Eidolons', shown: false },
  { id: 'done', label: 'Done', shown: true },
];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export interface LogHooks {
  /** The save changed: save it and redraw the home screen. */
  changed(): void;
  close(): void;
  /** Begin (or carry on) a quest battle (batch 2): the page opens the party with its cast locked in. */
  fight?(battle: string): void;
  /** The quest battle saved part-way, if there is one (its Fight reads Continue). */
  saved?(): string | null;
  /** EIDOLON-CHAINS: go to the Summoner in the Sanctum, and play a chain's prologue again. */
  summoner?(): void;
  story?(chain: string): void;
}

/** Draw the log on a tab into the sheet's box. */
export function drawQuestLog(box: HTMLElement, m: Meta, tab: LogTab, hooks: LogHooks): void {
  box.className = 'hsheet qlog';
  box.replaceChildren();
  const redraw = (t: LogTab = tab) => drawQuestLog(box, m, t, hooks);
  const head = el('div', 'qlHead');
  head.append(el('h3', '', 'Quests'));
  const shut = el('button', 'qlShut', '✕');
  shut.setAttribute('aria-label', 'Close the quest log');
  shut.addEventListener('click', hooks.close);
  head.append(shut);
  const tabs = el('div', 'qlTabs');
  tabs.setAttribute('role', 'tablist');
  const s = m.quests;
  const count: Partial<Record<LogTab, number>> = { active: s?.active.length ?? 0, board: s?.offers.length ?? 0 };
  for (const t of LOG_TABS.filter((x) => x.shown || (x.id === 'eidolons' && chainsShown(m)))) {
    const b = el('button', `qlTab${t.id === tab ? ' on' : ''}`, t.label);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(t.id === tab));
    if (t.id === 'active') b.textContent = `Active ${count.active}/${ACTIVE_MAX}`;
    if (t.id === 'board' && count.board) b.append(el('i', 'qlDot', String(count.board)));
    if (t.id === 'eidolons' && summonerWaiting(m)) b.append(el('i', 'qlDot', '!'));
    b.addEventListener('click', () => {
      dropping = null;
      redraw(t.id);
    });
    tabs.append(b);
  }
  const list = el('div', 'qlList');
  if (tab === 'active') drawActive(list, m, () => redraw(), hooks);
  else if (tab === 'board') drawBoard(list, m, () => redraw(), hooks);
  else if (tab === 'eidolons') drawEidolonsTab(list, m, hooks);
  else drawDone(list, m, hooks);
  box.append(head, tabs, list);
}

const empty = (list: HTMLElement, line: string) => list.append(el('p', 'qlEmpty', line));

/** The quest whose Drop was tapped, waiting for its confirm (one at a time; any other tap on the log forgets it). */
let dropping: string | null = null;

function drawActive(list: HTMLElement, m: Meta, redraw: () => void, hooks: LogHooks): void {
  const act = m.quests?.active ?? [];
  if (dropping && !act.some((a) => a.id === dropping)) dropping = null;
  if (!act.length) return empty(list, 'No quests taken. Gwen keeps the board in the tavern: see the Board tab.');
  const pinned = trackedQuest(m)?.id;
  for (const a of [...act].reverse()) {
    const q = questById(a.id)!;
    const row = el('div', `qlRow${isDone(a) ? ' done' : ''}`);
    const body = el('div', 'qlBody');
    const p = progressOf(a);
    const bar = el('i', 'qlBar');
    const fill = el('span');
    fill.style.width = `${Math.round((p.now / p.need) * 100)}%`;
    bar.append(fill);
    body.append(el('b', '', q.title), el('small', '', q.text), bar, el('small', 'qlCount', `${p.now}/${p.need} · ${rewardText(q.reward)}`));
    const side = el('div', 'qlSide');
    if (dropping === a.id) {
      // (the confirm: the row says what dropping costs, with Drop it and Keep)
      row.classList.add('dropping');
      body.append(el('small', 'qlWarn', q.repeat ? `Drop it? Its progress is lost, and it comes back in ${q.repeat} day${q.repeat === 1 ? '' : 's'}.` : 'Drop it? Its progress is lost; it may be offered again another day.'));
      const yes = el('button', 'danger', 'Drop it');
      yes.addEventListener('click', () => {
        dropping = null;
        if (!dropQuest(m, a.id, todayKey())) return;
        play('tap');
        hooks.changed();
        redraw();
      });
      const no = el('button', '', 'Keep');
      no.addEventListener('click', () => {
        dropping = null;
        redraw();
      });
      side.append(yes, no);
    } else if (isDone(a)) {
      const give = el('button', 'primary', 'Hand in');
      give.addEventListener('click', () => {
        if (!handIn(m, a.id, todayKey())) return;
        play('coinClaim');
        hooks.changed();
        redraw();
      });
      side.append(give);
    } else if (battleOfQuest(a.id) && hooks.fight) {
      // (batch 2: a quest battle's row fights it; Drop is still there, Track is the chip's)
      const qb = battleOfQuest(a.id)!;
      const go = el('button', 'primary qlFight', hooks.saved?.() === qb.id ? 'Continue' : 'Fight');
      go.setAttribute('aria-label', `Fight ${qb.title}`);
      go.disabled = !canFightBattle(m, qb.id);
      go.addEventListener('click', () => hooks.fight!(qb.id));
      const drop = el('button', 'qlDrop', 'Drop');
      drop.setAttribute('aria-label', `Drop ${q.title}`);
      drop.addEventListener('click', () => {
        dropping = a.id;
        redraw();
      });
      side.append(go, drop);
    } else {
      const pin = el('button', `qlPin${pinned === a.id ? ' on' : ''}`, pinned === a.id ? 'Tracked' : 'Track');
      pin.setAttribute('aria-pressed', String(pinned === a.id));
      pin.addEventListener('click', () => {
        trackQuest(m, a.id);
        hooks.changed();
        redraw();
      });
      const drop = el('button', 'qlDrop', 'Drop');
      drop.setAttribute('aria-label', `Drop ${q.title}`);
      drop.addEventListener('click', () => {
        dropping = a.id;
        redraw();
      });
      side.append(pin, drop);
    }
    row.append(questFace(q), body, side);
    list.append(row);
  }
}

function drawBoard(list: HTMLElement, m: Meta, redraw: () => void, hooks: LogHooks): void {
  const offers = m.quests?.offers ?? [];
  if (!offers.length) return empty(list, 'Nothing on offer today. Gwen pins a new quest each day; passersby come and go.');
  for (const o of offers) {
    const q = questById(o.id)!;
    const row = el('div', `qlRow${q.repeat ? ' rep' : ''}`);
    const body = el('div', 'qlBody');
    const n = timesDone(m, q.id);
    body.append(el('b', '', q.title), el('small', 'qlGiver', offerFrom(q) + (q.repeat ? ` · repeatable${n ? `, done ${n}×` : ''}` : '')), el('small', '', q.text), el('small', 'qlCount', rewardText(q.reward)));
    const side = el('div', 'qlSide');
    const take = el('button', 'primary', 'Take');
    const why = cannotTake(m, q.id);
    take.disabled = !!why;
    if (why === 'full') take.title = `Your log is full: ${ACTIVE_MAX} quests at a time`;
    take.addEventListener('click', () => {
      if (!takeQuest(m, q.id, todayKey())) return;
      play('tap');
      hooks.changed();
      redraw();
    });
    side.append(take);
    row.append(questFace(q), body, side);
    list.append(row);
  }
  if ((m.quests?.active.length ?? 0) >= ACTIVE_MAX) list.append(el('p', 'qlEmpty', `Your log is full: ${ACTIVE_MAX} quests at a time. Hand one in to take another.`));
}

function drawDone(list: HTMLElement, m: Meta, hooks: LogHooks): void {
  const done = m.quests?.done ?? [];
  if (!done.length) return empty(list, 'No quests handed in yet.');
  for (const id of [...done].reverse()) {
    const q = questById(id)!;
    const row = el('div', 'qlRow done');
    const body = el('div', 'qlBody');
    const title = el('b', '', q.title);
    const n = timesDone(m, id);
    // (a repeatable's count: "×3")
    if (q.repeat) title.append(el('i', 'qlTimes', `×${n}`));
    body.append(title, el('small', 'qlGiver', giverName(giverKeyOf(q)).name), el('small', 'qlWord', `“${giverWords(q, q.done[0])}”`));
    if (q.reward.keepsake) body.append(el('small', 'qlKeep', `Keepsake: ${q.reward.keepsake}`));
    row.append(questFace(q), body);
    // (batch 2: a quest battle won can be fought again for practice; it pays nothing)
    const qb = battleOfQuest(id);
    if (qb && hooks.fight && canFightBattle(m, qb.id)) {
      const side = el('div', 'qlSide');
      const again = el('button', 'qlReplay', hooks.saved?.() === qb.id ? 'Continue' : 'Replay');
      again.title = 'Fight it again for practice: no reward';
      again.addEventListener('click', () => hooks.fight!(qb.id));
      side.append(again);
      row.append(side);
    }
    list.append(row);
  }
}
