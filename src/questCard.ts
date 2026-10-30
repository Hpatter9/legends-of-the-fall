// A giver's card (QUESTS batch 1): a speech card rising from the bottom of the home screen over the tavern, with the giver's
// portrait, name and one to three lines, and what can be done with them now: hand in a quest that is done (first), take the quest
// they offer, or just a word while their quest is going. A tap outside closes it. It changes the save only through `quests.ts`.

import { FACES } from './questArt';
import { GIVERS, questById, type GiverId, type QuestDef, type Reward } from './sim/questData';
import { ACTIVE_MAX, cannotTake, handIn, isDone, takeQuest } from './sim/quests';
import { ORES } from './sim/awakenMats';
import type { Meta } from './sim/meta';
import { play } from './render/sound';
import { todayKey } from './modes';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A reward in plain words: "120 crowns · 2 stones · a bronze chest". */
export function rewardText(r: Reward): string {
  const parts: string[] = [];
  if (r.crowns) parts.push(`${r.crowns} crowns`);
  if (r.stones) parts.push(`${r.stones} stone${r.stones === 1 ? '' : 's'}`);
  if (r.chest) parts.push(`a ${r.chest} chest`);
  for (const o of r.ores ?? []) parts.push(`${o.n} ${ORES[o.trait]?.name ?? 'ore'}`);
  return parts.join(' · ');
}

/** A giver's face in a frame. */
export function faceOf(giver: GiverId, cls = 'qFace'): HTMLElement {
  const box = el('span', cls);
  const img = el('img');
  img.src = FACES[giver];
  img.alt = '';
  img.draggable = false;
  box.append(img);
  return box;
}

export interface CardHooks {
  /** The save changed: save it and redraw the home screen. */
  changed(): void;
  /** Open the quest log (the card's "Quest log" link). */
  openLog(): void;
}

let wrap: HTMLElement | null = null;

export function closeGiverCard(): void {
  wrap?.remove();
  wrap = null;
}

/** What a giver has for the player now: a quest to hand in, else one they offer, else one of theirs going. */
function topic(m: Meta, giver: GiverId): { q: QuestDef; kind: 'handIn' | 'offer' | 'going' } | null {
  const s = m.quests;
  if (!s) return null;
  const mine = (id: string) => questById(id)?.giver === giver;
  const ready = s.active.find((a) => mine(a.id) && isDone(a));
  if (ready) return { q: questById(ready.id)!, kind: 'handIn' };
  const offer = s.offers.find((o) => mine(o.id));
  if (offer) return { q: questById(offer.id)!, kind: 'offer' };
  const going = s.active.find((a) => mine(a.id));
  if (going) return { q: questById(going.id)!, kind: 'going' };
  return null;
}

/** Gwen's word when she has nothing for you (a little gossip). */
const IDLE: Partial<Record<GiverId, readonly string[]>> = {
  gwen: [
    "Nothing on the board today that I'd trust you with. Come back tomorrow; something always turns up.",
    'Wipe your boots. No, the other boots.',
    "Duchess ate a menu again. I'm told it was the specials.",
  ],
};

/** Open a giver's card over the home screen. */
export function openGiverCard(m: Meta, giver: GiverId, hooks: CardHooks): void {
  closeGiverCard();
  const host = document.getElementById('home') ?? document.body;
  wrap = el('div', 'qcWrap');
  wrap.addEventListener('click', (e) => e.target === wrap && closeGiverCard());
  const card = el('div', 'qcCard');
  card.setAttribute('role', 'dialog');
  const g = GIVERS[giver];
  const head = el('div', 'qcHead');
  const who = el('div', 'qcWho');
  who.append(el('b', '', g.name), el('small', '', g.title));
  head.append(faceOf(giver, 'qFace big'), who);
  card.append(head);
  const t = topic(m, giver);
  const lines = el('div', 'qcLines');
  const row = el('div', 'qcRow');
  const btn = (label: string, cls: string, go: () => void) => {
    const b = el('button', cls, label);
    b.addEventListener('click', go);
    row.append(b);
    return b;
  };
  const idle = IDLE[giver] ?? ['Safe roads.'];
  if (!t) {
    lines.append(el('p', '', idle[(m.quests?.done.length ?? 0) % idle.length]));
    btn('Quest log', '', () => {
      closeGiverCard();
      hooks.openLog();
    });
    btn('Close', 'primary', closeGiverCard);
  } else if (t.kind === 'handIn') {
    lines.append(el('h4', '', t.q.title), el('p', '', 'Done! Hand it in for your reward.'), el('p', 'qcPay', rewardText(t.q.reward)));
    btn('Hand in', 'primary', () => {
      if (!handIn(m, t.q.id)) return;
      play('coinClaim');
      hooks.changed();
      // (her thanks, then the card's done: a tap closes it)
      lines.replaceChildren(el('h4', '', t.q.title), ...t.q.done.map((l) => el('p', '', l)), el('p', 'qcPay', `+ ${rewardText(t.q.reward)}`));
      row.replaceChildren();
      btn('Close', 'primary', closeGiverCard);
    });
    btn('Not now', '', closeGiverCard);
  } else if (t.kind === 'offer') {
    lines.append(el('h4', '', t.q.title), ...t.q.offer.map((l) => el('p', '', l)), el('p', 'qcGoal', t.q.text), el('p', 'qcPay', rewardText(t.q.reward)));
    const why = cannotTake(m, t.q.id);
    const take = btn('Take it on', 'primary', () => {
      if (!takeQuest(m, t.q.id, todayKey())) return;
      play('tap');
      hooks.changed();
      closeGiverCard();
    });
    take.disabled = !!why;
    if (why === 'full') lines.append(el('p', 'qcWarn', `Your log is full: ${ACTIVE_MAX} quests at a time. Hand one in first.`));
    btn('Not now', '', closeGiverCard);
  } else {
    const a = m.quests!.active.find((x) => x.id === t.q.id)!;
    lines.append(el('h4', '', t.q.title), el('p', '', t.q.going), el('p', 'qcGoal', `${t.q.text} · ${Math.min(a.progress, t.q.goal.n)}/${t.q.goal.n}`));
    btn('Quest log', '', () => {
      closeGiverCard();
      hooks.openLog();
    });
    btn('Close', 'primary', closeGiverCard);
  }
  card.append(lines, row);
  wrap.append(card);
  host.append(wrap);
}

/** Whether a giver has something for the player: 'ready' (a quest to hand in), 'offer', or null. The tavern's bubbles read it. */
export function giverMark(m: Meta, giver: GiverId): 'ready' | 'offer' | null {
  const t = topic(m, giver);
  return t?.kind === 'handIn' ? 'ready' : t?.kind === 'offer' ? 'offer' : null;
}

