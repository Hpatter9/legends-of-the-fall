// The Eidolon chains on the page (EIDOLON-CHAINS, batch 5, `docs/notes/eidolon-chains.md`): a piece's sigil and its card, the quest
// log's Eidolons tab, the Pact Gallery, and the Summoner's plaque in the Sanctum. The rules are in `sim/eidolonChains.ts`; the binding's
// ceremony is `eidolonBinding.ts`.
//
// The pieces have no paintings of their own yet: a piece's sigil is the painted gear icon its data names (`PieceDef.art`, from
// `src/art/gear/`), set in a ring of its Eidolon's colour. Unbound Eidolons show as their card's silhouette with a "?".

import { showWhenPainted } from './paintReady';
import gearIndex from './art/gear/index.json';
import { cardUrl, figureUrl } from './eidolonCall';
import { eidolonById, type Eidolon } from './sim/eidolons';
import { chooseEidolon, chosenOf } from './sim/warHorn';
import type { Meta } from './sim/meta';
import { CHAINS, chainById, type ChainDef, type PieceDef } from './sim/eidolonChainData';
import { activeChain, chainDone, chainState, currentPart, offeredChain, partBlocked, piecesOf, readyToBind, type PieceFound } from './sim/eidolonChains';
import { questBattleById } from './sim/questBattles';
import { battleWon } from './sim/questRun';
import { heroName } from './sim/heroNames';
import { play } from './render/sound';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const img = (src: string, cls: string): HTMLImageElement => {
  const i = el('img', cls);
  i.alt = '';
  i.decoding = 'async';
  i.draggable = false;
  i.src = src;
  return i;
};

const eidolonOf = (c: ChainDef): Eidolon => eidolonById(c.eidolon)!;
/** The Eidolon's full name: "Askel, the Cinderhound". */
const fullName = (e: Eidolon): string => `${e.name}, ${e.title}`;

/* ------------------------------------------------------------------ a piece's sigil and card */

/** A piece's sigil: its borrowed painting (the big gear atlas, 128 px cells) in a ring of the Eidolon's colour; a missing piece is a dim
 *  ring with "?". */
export function pieceSigil(piece: PieceDef | null, cls = ''): HTMLElement {
  const s = el('span', `ecnSigil${piece ? ' got' : ''}${cls ? ` ${cls}` : ''}`);
  if (!piece) {
    s.append(el('b', '', '?'));
    return s;
  }
  const n = (gearIndex.items as Record<string, number>)[piece.art];
  const art = el('i', 'ecnSigilArt');
  if (n !== undefined) {
    const { cols, rows } = gearIndex;
    art.style.backgroundImage = 'url(gear/gear-128.webp)';
    art.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
    art.style.backgroundPosition = `${((n % cols) / (cols - 1)) * 100}% ${(Math.floor(n / cols) / (rows - 1)) * 100}%`;
  }
  s.append(art);
  s.title = piece.name;
  return s;
}

/** Where a piece belongs: its chain and the part that finds it. */
export function pieceInfo(id: string): PieceFound | undefined {
  for (const c of CHAINS) {
    const i = c.parts.findIndex((p) => p.piece.id === id);
    if (i >= 0) return { chain: c.id, part: i, piece: c.parts[i].piece };
  }
  return undefined;
}

let cardLayer: HTMLElement | null = null;

/** A piece's card over the page (the victory card, the log): its sigil, name and two lines, and what comes next. A tap on Continue (or
 *  outside it) closes it. `next` is the line under it ("Part 2 of 3 begins: The Kennel Fires"). */
export function showPieceCard(found: PieceFound, opts: { next?: string; onClose?: () => void } = {}): void {
  closePieceCard();
  const c = chainById(found.chain);
  if (!c) return;
  const e = eidolonOf(c);
  const layer = el('div', 'ecnLayer');
  const card = el('div', `ecnPiece el-${e.element}`);
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', `A piece found: ${found.piece.name}`);
  card.append(
    el('small', 'ecnKicker', `A piece of ${e.name}'s pact · ${found.part + 1} of ${c.parts.length}`),
    pieceSigil(found.piece, 'big'),
    el('b', 'ecnPieceName', found.piece.name),
    el('p', 'ecnPieceLine', found.piece.lines[0]),
    el('p', 'ecnPieceLine dim', found.piece.lines[1]),
  );
  if (opts.next) card.append(el('p', 'ecnNext', opts.next));
  const go = el('button', 'primary', 'Continue');
  card.append(go);
  layer.append(card);
  const close = () => {
    closePieceCard();
    opts.onClose?.();
  };
  go.addEventListener('click', close);
  layer.addEventListener('click', (ev) => ev.target === layer && close());
  document.body.append(layer);
  cardLayer = layer;
  play('setChime3');
}
export function closePieceCard(): void {
  cardLayer?.remove();
  cardLayer = null;
}

/** The line under a piece's card: the next part, or the binding. */
export function nextWords(m: Meta, found: PieceFound): string {
  const c = chainById(found.chain);
  const cur = currentPart(m);
  if (c && cur?.chain.id === c.id) return `Part ${cur.index + 1} of ${c.parts.length} begins: ${cur.part.title}`;
  if (c && readyToBind(m)?.id === c.id) return `Every piece is found. Take them to the Summoner in the Sanctum to bind ${eidolonOf(c).name}.`;
  return '';
}

/* ------------------------------------------------------------------ the quest log's Eidolons tab */

export interface ChainHooks {
  /** Fight a chain's quest battle (the party with its cast locked in). */
  fight?(battle: string): void;
  /** The quest battle saved part-way, if one is. */
  saved?(): string | null;
  /** Go to the Summoner (the Recruit tab's Sanctum). */
  summoner?(): void;
  /** Play a chain's prologue again. */
  story?(chain: string): void;
}

/** A chain's Eidolon as a picture: its card when bound, its silhouette with "?" otherwise. */
function eidolonFace(c: ChainDef, m: Meta, cls: string): HTMLElement {
  const e = eidolonOf(c);
  const done = chainDone(m, c);
  const box = el('span', `${cls} el-${e.element}${done ? ' bound' : ' sleeping'}`);
  // (the card is a painting with its ground; the silhouette is the figure's, which stands on nothing)
  box.append(img(done ? cardUrl(e.id) : figureUrl(e.id), 'ecnFaceArt'));
  if (!chainDone(m, c)) box.append(el('b', 'ecnQ', '?'));
  return box;
}

/** A chain's pieces as a row of sigils (found lit, the rest "?"). */
function pieceRow(c: ChainDef, m: Meta, onPiece?: (p: PieceDef, i: number) => void): HTMLElement {
  const row = el('div', 'ecnPieces');
  const got = piecesOf(m, c).map((p) => p.id);
  c.parts.forEach((p, i) => {
    const has = got.includes(p.piece.id);
    const s = pieceSigil(has ? p.piece : null);
    if (has && onPiece) {
      const b = el('button', 'ecnPieceBtn');
      b.setAttribute('aria-label', p.piece.name);
      b.append(s);
      b.addEventListener('click', () => onPiece(p.piece, i));
      row.append(b);
    } else row.append(s);
  });
  return row;
}

/** The Eidolons tab: the six chains, easiest first, each as far as the save has gone. */
export function drawEidolonsTab(list: HTMLElement, m: Meta, hooks: ChainHooks): void {
  list.append(el('p', 'ecnIntro', 'Six old guardians once answered the keep\'s War Horn. Find the pieces of a pact and the Summoner binds its Eidolon. One chain at a time.'));
  const going = activeChain(m);
  const offer = offeredChain(m);
  for (const c of CHAINS) {
    const e = eidolonOf(c);
    const done = chainDone(m, c);
    const st = chainState(m, c.id);
    const card = el('div', `ecnChain el-${e.element}${done ? ' bound' : going === c ? ' going' : ''}`);
    const body = el('div', 'ecnBody');
    const known = done || !!st || offer === c;
    body.append(el('b', 'ecnName', known ? fullName(e) : 'Something sleeps here'));
    if (done) {
      body.append(el('small', 'ecnState', chosenOf(m) === e.id ? 'Bound · answers the War Horn' : 'Bound'));
      if (c.parts.length) body.append(pieceRow(c, m, (p, i) => showPieceCard({ chain: c.id, part: i, piece: p })));
    } else if (offer === c) {
      body.append(el('small', 'ecnState', `${c.giver.name} has something to tell you.`));
      if (hooks.summoner) {
        const go = el('button', 'primary ecnGo', 'To the Sanctum');
        go.addEventListener('click', () => hooks.summoner!());
        body.append(go);
      }
    } else if (st && readyToBind(m) === c) {
      body.append(pieceRow(c, m, (p, i) => showPieceCard({ chain: c.id, part: i, piece: p })), el('small', 'ecnState', 'Every piece found: the Summoner can bind it.'));
      if (hooks.summoner) {
        const go = el('button', 'primary ecnGo', 'Bind at the Sanctum');
        go.addEventListener('click', () => hooks.summoner!());
        body.append(go);
      }
    } else if (st) {
      const cur = currentPart(m)!;
      const p = cur.part;
      body.append(pieceRow(c, m, (pc, i) => showPieceCard({ chain: c.id, part: i, piece: pc })));
      body.append(el('small', 'ecnPart', `Part ${cur.index + 1} of ${c.parts.length}: ${p.title}`), el('small', 'ecnGoal', p.text));
      const bar = el('i', 'qlBar');
      const fill = el('span');
      fill.style.width = `${Math.round((cur.progress / p.goal.n) * 100)}%`;
      bar.append(fill);
      body.append(bar, el('small', 'ecnSaid', `${c.giver.name}: “${p.begin}”`));
      const blocked = partBlocked(m, p);
      if (blocked) body.append(el('small', 'ecnWarn', `Needs ${[...new Set(blocked)].map(heroName).join(' or ')}: recruit one to take this on`));
      else if (p.goal.kind === 'battle' && hooks.fight) {
        const qb = questBattleById(p.goal.battle)!;
        const go = el('button', 'primary ecnGo', hooks.saved?.() === qb.id ? `Continue: ${qb.title}` : `Fight: ${qb.title}`);
        go.addEventListener('click', () => hooks.fight!(qb.id));
        body.append(go);
      }
    } else {
      body.append(el('small', 'ecnState', `Opens with ${c.opensWords}${c.order > 1 ? ', once the Eidolon before it is bound' : ''}.`));
    }
    // (the story so far, to read again: the prologue, and a replay of the chain's battle once won)
    if ((st || done) && c.prologue) {
      const more = el('div', 'ecnMore');
      if (hooks.story) {
        const story = el('button', 'ecnLink', 'Story');
        story.addEventListener('click', () => hooks.story!(c.id));
        more.append(story);
      }
      for (const p of c.parts) {
        if (p.goal.kind !== 'battle' || !battleWon(m, p.goal.battle) || !hooks.fight || going?.id === c.id && currentPart(m)?.part === p) continue;
        const battle = p.goal.battle;
        const again = el('button', 'ecnLink', `Replay ${questBattleById(battle)!.title}`);
        again.title = 'Fight it again for practice: no reward';
        again.addEventListener('click', () => hooks.fight!(battle));
        more.append(again);
      }
      if (more.childElementCount) body.append(more);
    }
    card.append(eidolonFace(c, m, 'ecnFace'), body);
    list.append(card);
  }
}

/* ------------------------------------------------------------------ the Summoner's plaque in the Sanctum */

/** What the Sanctum's plaque says: a chain to hear, a chain going, or one to bind (none: no plaque). */
export function hallPlaque(m: Meta): { kind: 'offer' | 'going' | 'bind'; title: string; line: string } | null {
  const offer = offeredChain(m);
  if (offer) return { kind: 'offer', title: 'The Summoner looks up from the altar', line: 'Something old is stirring · tap to listen' };
  const ready = readyToBind(m);
  if (ready) return { kind: 'bind', title: `Bind ${fullName(eidolonOf(ready))}`, line: `Every piece is on the altar · ${ready.parts.length} of ${ready.parts.length}` };
  const cur = currentPart(m);
  if (cur) return { kind: 'going', title: `${fullName(eidolonOf(cur.chain))} · ${piecesOf(m, cur.chain).length} of ${cur.chain.parts.length} pieces`, line: `Part ${cur.index + 1}: ${cur.part.title}` };
  return null;
}

/* ------------------------------------------------------------------ the Pact Gallery */

let gallery: HTMLElement | null = null;

export interface GalleryHooks {
  save(): void;
  /** Watch an Eidolon's binding again. */
  watch?(chain: string): void;
}

/** The Pact Gallery: six alcoves, the bound Eidolons in theirs with their card and line, the rest as silhouettes with "?". A tap on one
 *  opens its card (a bound one may be chosen to answer the horn, and its binding watched again). */
export function openPactGallery(m: Meta, hooks: GalleryHooks): void {
  closePactGallery();
  const layer = el('div', 'ecnLayer gallery');
  const box = el('div', 'ecnGallery');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'The Pact Gallery');
  const head = el('div', 'ecnGHead');
  const shut = el('button', 'ecnShut', '✕');
  shut.setAttribute('aria-label', 'Close the Pact Gallery');
  shut.addEventListener('click', closePactGallery);
  head.append(el('h3', '', 'Pact Gallery'), shut);
  const bound = CHAINS.filter((c) => chainDone(m, c)).length;
  box.append(head, el('p', 'ecnIntro', `${bound} of ${CHAINS.length} Eidolons bound. The one chosen answers the War Horn when it is full.`));
  const grid = el('div', 'ecnAlcoves');
  for (const c of CHAINS) {
    const e = eidolonOf(c);
    const done = chainDone(m, c);
    const a = el('button', `ecnAlcove el-${e.element}${done ? ' bound' : ''}${chosenOf(m) === e.id ? ' chosen' : ''}`);
    a.setAttribute('aria-label', done ? fullName(e) : 'An Eidolon not yet bound');
    a.append(eidolonFace(c, m, 'ecnNiche'));
    const label = el('span', 'ecnLabel');
    if (done) label.append(el('b', '', e.name), el('small', '', e.title));
    else {
      const st = chainState(m, c.id);
      label.append(el('b', '', '?'), el('small', '', st ? `${piecesOf(m, c).length} of ${c.parts.length} pieces` : 'Something sleeps here'));
    }
    a.append(label);
    a.addEventListener('click', () => detail(c));
    grid.append(a);
  }
  box.append(grid);
  const panel = el('div', 'ecnDetail');
  panel.hidden = true;
  box.append(panel);
  const detail = (c: ChainDef) => {
    const e = eidolonOf(c);
    const done = chainDone(m, c);
    panel.hidden = false;
    panel.className = `ecnDetail el-${e.element}`;
    panel.replaceChildren();
    if (!done) {
      const st = chainState(m, c.id);
      panel.append(el('b', '', 'Something sleeps here'), el('p', '', st ? `Its pact is being gathered: ${piecesOf(m, c).length} of ${c.parts.length} pieces found.` : `Its chain opens with ${c.opensWords}${c.order > 1 ? `, once the Eidolon before it is bound` : ''}.`));
    } else {
      const words = el('div', 'ecnDWords');
      words.append(el('b', '', fullName(e)), el('small', '', `${e.attack} · ${e.element}`), el('span', '', e.rider));
      const top = el('div', 'ecnDTop');
      top.append(img(cardUrl(e.id), 'ecnDArt'), words);
      panel.append(top);
      const line = c.binding?.find((b) => b.who === 'eidolon')?.text ?? e.line;
      panel.append(el('p', 'ecnDLine', `“${line}”`));
      if (c.parts.length) panel.append(pieceRow(c, m, (p, i) => showPieceCard({ chain: c.id, part: i, piece: p })));
      const row = el('div', 'ecnDRow');
      if (chosenOf(m) !== e.id) {
        const choose = el('button', 'primary', 'Answer the horn');
        choose.addEventListener('click', () => {
          if (chooseEidolon(m, e.id)) hooks.save();
          openPactGallery(m, hooks);
        });
        row.append(choose);
      } else row.append(el('span', 'ecnChosen', 'Answers the War Horn'));
      if (hooks.watch && c.binding) {
        const watch = el('button', '', 'Watch the binding');
        watch.addEventListener('click', () => hooks.watch!(c.id));
        row.append(watch);
      }
      panel.append(row);
    }
    panel.scrollIntoView?.({ block: 'nearest' });
  };
  layer.append(box);
  layer.addEventListener('click', (ev) => ev.target === layer && closePactGallery());
  document.body.append(layer);
  gallery = layer;
  // (MENU-GLITCH: the gallery shows once its Eidolons' pictures are decoded, not with empty alcoves that fill in)
  void showWhenPainted(layer);
}
export function closePactGallery(): void {
  gallery?.remove();
  gallery = null;
}
