// A giver's card (QUESTS batch 1, every giver from batch 1b): a speech card rising from the bottom of the home screen over the
// tavern, with the giver's portrait, name and one to three lines, and what can be done with them now: hand in a quest that is done
// (first), take the quest they offer, or just a word while their quest is going. A tap outside closes it. It changes the save only
// through `quests.ts`.
//
// A giver is named by a key: their id (`gwen`, `pedlar`, `ruler`...), or `hero:<kind>` for a patron (one of the player's heroes, whose
// name and portrait are the hero's own). The ruler's charges are spoken by the player's chosen ruler (name, portrait, and "the
// queen" where the text says "the king").

import { FACES } from './questArt';
import { GIVERS, questById, type QuestDef, type Reward } from './sim/questData';
import { GWEN_REMARKS } from './sim/questData/gwen';
import { ACTIVE_MAX, cannotTake, handIn, isDone, takeQuest } from './sim/quests';
import { ORES } from './sim/awakenMats';
import { heroEpithet, heroName } from './sim/heroNames';
import { tomeWords, type TomeSize } from './sim/tomes';
import type { Meta } from './sim/meta';
import { play } from './render/sound';
import { todayKey } from './modes';
import { settings } from './settings';
import { rulerOf, rulerWords } from './rulerRules';
import { RULER_URLS } from './rulerUrls';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A reward in plain words: "120 crowns · 2 stones · a bronze chest · 3 of Selam's shards". */
export function rewardText(r: Reward): string {
  const parts: string[] = [];
  if (r.crowns) parts.push(`${r.crowns} crowns`);
  if (r.stones) parts.push(`${r.stones} stone${r.stones === 1 ? '' : 's'}`);
  if (r.chest) parts.push(`a ${r.chest} chest`);
  for (const o of r.ores ?? []) parts.push(`${o.n} ${ORES[o.trait]?.name ?? 'ore'}`);
  for (const [size, n] of Object.entries(r.tomes ?? {})) if (n) parts.push(tomeWords(size as TomeSize, n));
  if (r.shards) parts.push(`${r.shards.n} of ${heroName(r.shards.kind)}'s shards`);
  if (r.keepsake) parts.push(`a keepsake`);
  return parts.join(' · ');
}

/** A quest's giver, as a key: the giver's id, or `hero:<kind>` for a patron. */
export const giverKeyOf = (q: QuestDef): string => (q.hero ? `hero:${q.hero}` : q.giver);

/** A giver's name and the line under it, by key. */
export function giverName(key: string): { name: string; title: string } {
  if (key.startsWith('hero:')) {
    const kind = key.slice(5);
    return { name: heroName(kind), title: heroEpithet(kind) || 'In the tavern' };
  }
  const g = GIVERS[key as keyof typeof GIVERS] ?? GIVERS.gwen;
  if (g.id === 'ruler') return { name: rulerOf(settings().ruler).name, title: g.title };
  return { name: g.name, title: g.title };
}

/** A giver's line, in their voice: the ruler's in the chosen ruler's words ("the queen" where it should). */
export const giverWords = (q: QuestDef, line: string): string => (q.giver === 'ruler' ? rulerWords(line, settings().ruler) : line);

/** The plain-words label of where an offer came from, for the board ("passing today", "a Royal charge"...). */
export function offerFrom(q: QuestDef): string {
  const { name } = giverName(giverKeyOf(q));
  const slot = GIVERS[q.giver].slot;
  if (slot === 'passerby') return `${name}, passing today`;
  if (slot === 'patron') return `${name}, in the tavern`;
  if (slot === 'royal') return `${name} · a Royal charge`;
  if (slot === 'spoils') return 'Spoils, found on a fallen boss';
  if (slot === 'rift') return 'A voice in the rift';
  return name;
}

/** A giver's face in a frame, by key (a patron's portrait, the ruler's picture, else the giver's own). */
export function faceOf(key: string, cls = 'qFace'): HTMLElement {
  const box = el('span', cls);
  const img = el('img');
  img.alt = '';
  img.draggable = false;
  if (key.startsWith('hero:')) {
    box.classList.add('hero');
    img.src = `heroes/${key.slice(5)}-portrait.webp`;
  } else if (key === 'ruler') {
    // (the ruler's sheet's first frame, as the settings' picker shows it: The King's on his throne)
    const id = settings().ruler;
    const pic = el('span', 'qRuler');
    pic.style.backgroundImage = `url("${RULER_URLS[id] ?? FACES.ruler}")`;
    if (id === 'the_king') pic.style.backgroundPosition = `0 ${(6 / 7) * 100}%`;
    box.classList.add('ruler');
    box.append(pic);
    return box;
  } else {
    img.src = FACES[key as keyof typeof FACES] ?? FACES.gwen;
  }
  box.append(img);
  return box;
}

/** A quest's face, by its giver. */
export const questFace = (q: QuestDef, cls = 'qFace'): HTMLElement => faceOf(giverKeyOf(q), cls);

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
function topic(m: Meta, key: string): { q: QuestDef; kind: 'handIn' | 'offer' | 'going' } | null {
  const s = m.quests;
  if (!s) return null;
  const mine = (id: string) => {
    const q = questById(id);
    return !!q && giverKeyOf(q) === key;
  };
  const ready = s.active.find((a) => mine(a.id) && isDone(a));
  if (ready) return { q: questById(ready.id)!, kind: 'handIn' };
  const offer = s.offers.find((o) => mine(o.id));
  if (offer) return { q: questById(offer.id)!, kind: 'offer' };
  const going = s.active.find((a) => mine(a.id));
  if (going) return { q: questById(going.id)!, kind: 'going' };
  return null;
}

/** Gwen's word when she has nothing for you (a little gossip). */
const IDLE: Readonly<Record<string, readonly string[]>> = {
  gwen: [
    "Nothing on the board today that I'd trust you with. Come back tomorrow; something always turns up.",
    'Wipe your boots. No, the other boots.',
    "Duchess ate a menu again. I'm told it was the specials.",
  ],
  duchess: ['Mehh. (She has nothing for you. She is eating a coaster.)'],
};

/** Gwen's idle word: now and then a remark on a quest you have done for her (the newest with one), else her gossip. */
export function idleLine(m: Meta, key: string): string {
  const done = m.quests?.done ?? [];
  if (key === 'gwen') {
    const said = [...done].reverse().find((id) => GWEN_REMARKS[id]);
    // (every other look, so her gossip still comes round)
    if (said && done.length % 2 === 0) return GWEN_REMARKS[said];
  }
  const idle = IDLE[key] ?? ['Safe roads.'];
  return idle[done.length % idle.length];
}

/** Open a giver's card over the home screen. */
export function openGiverCard(m: Meta, key: string, hooks: CardHooks): void {
  closeGiverCard();
  const host = document.getElementById('home') ?? document.body;
  wrap = el('div', 'qcWrap');
  wrap.addEventListener('click', (e) => e.target === wrap && closeGiverCard());
  const card = el('div', 'qcCard');
  card.setAttribute('role', 'dialog');
  const g = giverName(key);
  const head = el('div', 'qcHead');
  const who = el('div', 'qcWho');
  who.append(el('b', '', g.name), el('small', '', g.title));
  head.append(faceOf(key, 'qFace big'), who);
  card.append(head);
  const t = topic(m, key);
  const lines = el('div', 'qcLines');
  const row = el('div', 'qcRow');
  const btn = (label: string, cls: string, go: () => void) => {
    const b = el('button', cls, label);
    b.addEventListener('click', go);
    row.append(b);
    return b;
  };
  const say = (q: QuestDef, l: string) => el('p', '', giverWords(q, l));
  if (!t) {
    lines.append(el('p', '', idleLine(m, key)));
    btn('Quest log', '', () => {
      closeGiverCard();
      hooks.openLog();
    });
    btn('Close', 'primary', closeGiverCard);
  } else if (t.kind === 'handIn') {
    lines.append(el('h4', '', t.q.title), el('p', '', 'Done! Hand it in for your reward.'), el('p', 'qcPay', rewardText(t.q.reward)));
    btn('Hand in', 'primary', () => {
      if (!handIn(m, t.q.id, todayKey())) return;
      play('coinClaim');
      hooks.changed();
      // (their thanks, then the card's done: a tap closes it)
      const keep = t.q.reward.keepsake ? [el('p', 'qcKeep', `Keepsake: ${t.q.reward.keepsake}`)] : [];
      lines.replaceChildren(el('h4', '', t.q.title), ...t.q.done.map((l) => say(t.q, l)), ...keep, el('p', 'qcPay', `+ ${rewardText(t.q.reward)}`));
      row.replaceChildren();
      btn('Close', 'primary', closeGiverCard);
    });
    btn('Not now', '', closeGiverCard);
  } else if (t.kind === 'offer') {
    lines.append(el('h4', '', t.q.title), ...t.q.offer.map((l) => say(t.q, l)), el('p', 'qcGoal', t.q.text), el('p', 'qcPay', rewardText(t.q.reward)));
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
    lines.append(el('h4', '', t.q.title), say(t.q, t.q.going), el('p', 'qcGoal', `${t.q.text} · ${Math.min(a.progress, t.q.goal.n)}/${t.q.goal.n}`));
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
export function giverMark(m: Meta, key: string): 'ready' | 'offer' | null {
  const t = topic(m, key);
  return t?.kind === 'handIn' ? 'ready' : t?.kind === 'offer' ? 'offer' : null;
}
