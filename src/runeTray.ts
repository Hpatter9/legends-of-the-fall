// The rune tray (SEVEN-SLOT GEAR batch 5, docs/notes/gear-runes-design.md section 7, "Showing who wears what"): in a rune run the pack
// shows a row for each fielded hero (its portrait, name, three sockets and what its runes give), the bag's eight cells, Merge all and
// Auto runes. Any rune with a twin (another of its kind and level, or a Keystone of its level) has a gold rim and a "2" badge. Tap a rune
// and the places it can go light up (a hero's sockets, the bag, its twins); tap one to set, swap, take off or merge. Runes change between
// waves only. The rules are all `sim/runes.ts`; this only draws them. The stones are drawn in their colour with the level as pips until
// their paintings come (docs/notes/gear-art-todo.md).

import { BAG_MAX, RUNE_COLOUR, autoRunes, dropRune, mergeAll, mergesReady, runeName, runeTargets, runeText, runeTotals, socketsOf, twinIds, type Rune, type RuneState } from './sim/runes';
import { heroName } from './sim/heroNames';
import { play } from './render/sound';
import { REMEDY_LIST, packSatchel, remedyBlock, remedyBonus, useRemedy, type RemedyId } from './sim/remedies';
import { hpShare } from './sim/health';
import { REMEDY_ICON } from './remedyArt';
import type { Run } from './sim/run';
import type { Meta } from './sim/meta';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A rune's stone: its colour, its level as pips, the twin's rim and badge. */
/** An element of its own name, so no page style meant for a card's spans or bars reaches it. */
const tag = (name: string, cls: string): HTMLElement => {
  const e = document.createElement(name);
  e.className = cls;
  return e;
};

export function runeStone(r: Rune | undefined, twin = false, size: 'big' | 'small' = 'big'): HTMLElement {
  const s = tag('rn-stone', `rnStone rn-${size}${r ? ` k-${r.kind}` : ' empty'}${twin ? ' twin' : ''}`);
  if (!r) return s;
  s.style.setProperty('--rc', RUNE_COLOUR[r.kind]);
  s.title = `${runeName(r)}: ${runeText(r)}`;
  s.setAttribute('aria-label', runeName(r));
  const pips = tag('rn-pips', 'rnPips');
  for (let i = 0; i < r.lv; i++) pips.append(tag('rn-pip', 'rnPip'));
  s.append(pips);
  if (twin) {
    const badge = tag('rn-twin', 'rnTwin');
    badge.textContent = '2';
    s.append(badge);
  }
  return s;
}

/** The three sockets over a hero's bench card (or anywhere small): empty outlines, or its runes with their twins rimmed. */
export function socketStrip(state: RuneState, kind: string): HTMLElement {
  const strip = tag('rn-strip', 'rnStrip');
  for (const s of socketsOf(state, kind)) strip.append(runeStone(s.rune, s.twin, 'small'));
  return strip;
}

/** The tray, drawn into `card`. `heroes` are the fielded heroes (kind and a portrait); `canEdit` is false in a fight; `changed` runs after
 *  any rune moves (the page saves the run and starts the stage again). */
export function drawRuneTray(card: HTMLElement, state: RuneState, heroes: readonly { kind: string; face: () => HTMLElement }[], canEdit: boolean, changed: () => void): void {
  let sel: number | undefined;
  const box = el('div', 'rnTray');
  card.append(box);
  const kinds = heroes.map((h) => h.kind);
  const after = (what: ReturnType<typeof dropRune> | 'auto' | 'all') => {
    sel = undefined;
    if (what === 'merged' || what === 'all') play('merge');
    changed();
    draw();
  };
  const tapRune = (id: number) => {
    if (!canEdit) return;
    if (sel === undefined || sel === id) {
      sel = sel === id ? undefined : id;
      return draw();
    }
    const done = dropRune(state, sel, { rune: id });
    if (done) after(done);
    else {
      sel = id;
      draw();
    }
  };
  const draw = () => {
    box.replaceChildren();
    const twins = twinIds(state);
    const lit = sel !== undefined ? runeTargets(state, sel, kinds) : undefined;
    const merges = mergesReady(state);
    box.append(el('p', 'note', canEdit ? (sel === undefined ? 'Tap a rune, then where it goes: a hero’s socket, the bag, or its twin to merge.' : 'Now tap where it goes (lit), or the rune again to put it down.') : 'Runes change between waves.'));
    for (const h of heroes) {
      const row = el('div', `rnHero${lit?.heroes.includes(h.kind) ? ' can' : ''}`);
      const words = el('div', 'rnWords');
      words.append(el('b', '', heroName(h.kind)), el('small', '', runeTotals(state.worn[h.kind]) || 'No runes'));
      const sockets = el('div', 'rnSockets');
      for (const s of socketsOf(state, h.kind)) {
        const b = el('button', `rnCell${s.rune && s.rune.id === sel ? ' sel' : ''}${s.rune && lit?.merge.includes(s.rune.id) ? ' can' : !s.rune && lit?.heroes.includes(h.kind) ? ' can' : ''}`);
        b.type = 'button';
        b.append(runeStone(s.rune, s.twin));
        b.disabled = !canEdit;
        b.addEventListener('click', () => {
          if (s.rune) return tapRune(s.rune.id);
          if (sel === undefined) return;
          const done = dropRune(state, sel, { kind: h.kind });
          if (done) after(done);
        });
        sockets.append(b);
      }
      row.append(h.face(), words, sockets);
      box.append(row);
    }
    // (the bag: eight cells; a tap on an empty one takes the chosen rune off)
    const bag = el('div', `rnBag${lit?.bag ? ' can' : ''}`);
    for (let i = 0; i < BAG_MAX; i++) {
      const r = state.bag[i];
      const b = el('button', `rnCell${r && r.id === sel ? ' sel' : ''}${r && lit?.merge.includes(r.id) ? ' can' : !r && lit?.bag ? ' can' : ''}`);
      b.type = 'button';
      b.append(runeStone(r, !!r && twins.has(r.id)));
      b.disabled = !canEdit;
      b.addEventListener('click', () => {
        if (r) return tapRune(r.id);
        if (sel === undefined) return;
        const done = dropRune(state, sel, { bag: true });
        if (done) after(done);
      });
      bag.append(b);
    }
    box.append(el('small', 'rnHead', `The bag · ${state.bag.length} / ${BAG_MAX}`), bag);
    const btns = el('div', 'rnBtns');
    const all = el('button', '', merges ? `Merge all · ${merges}` : 'Merge all');
    all.type = 'button';
    all.disabled = !canEdit || !merges;
    all.addEventListener('click', () => {
      mergeAll(state);
      after('all');
    });
    const auto = el('button', 'primary', 'Auto runes');
    auto.type = 'button';
    auto.disabled = !canEdit || !kinds.length;
    auto.addEventListener('click', () => {
      autoRunes(state, kinds);
      after('auto');
    });
    btns.append(all, auto);
    box.append(btns);
    if (sel !== undefined) {
      const r = [...state.bag, ...Object.values(state.worn).flat()].find((x) => x.id === sel);
      if (r) box.append(el('p', 'rnPick', `${runeName(r)}: ${runeText(r)}`));
    }
  };
  draw();
}

/** SEVEN-SLOT GEAR batch 6: the tray's remedies pocket. The run's satchel (packed from the save as it is first opened), each remedy with its
 *  count; tap one that heals all to use it, or tap one and then a wounded hero. The heroes show their health between waves. */
export function drawRemedies(card: HTMLElement, run: Run, meta: Meta | undefined, heroes: readonly { id: number; kind: string }[], canUse: boolean, changed: () => void): void {
  if (meta) packSatchel(meta, run);
  const box = el('div', 'rmPocket');
  card.append(box);
  let sel: RemedyId | undefined;
  const bonus = (k: string) => remedyBonus(meta, k);
  const draw = () => {
    box.replaceChildren(el('small', 'rnHead', 'Remedies'));
    const have = REMEDY_LIST.filter((r) => (run.satchel?.[r.id] ?? 0) > 0);
    if (!have.length) {
      box.append(el('p', 'note', 'No remedies in the satchel. Hester sells them; the party screen packs them for a run.'));
      return;
    }
    const row = el('div', 'rmRow');
    for (const r of have) {
      const b = el('button', `rmBtn${sel === r.id ? ' sel' : ''}`);
      b.type = 'button';
      const pic = el('img');
      pic.src = REMEDY_ICON[r.id];
      pic.alt = '';
      b.append(pic, el('span', '', `${r.name} ×${run.satchel![r.id]}`));
      b.title = r.text;
      b.disabled = !canUse;
      b.addEventListener('click', () => {
        if (r.all) {
          if (useRemedy(run, r.id, undefined, bonus)) {
            play('heal');
            changed();
          }
          sel = undefined;
          return draw();
        }
        sel = sel === r.id ? undefined : r.id;
        draw();
      });
      row.append(b);
    }
    box.append(row);
    const list = el('div', 'rmHeroes');
    for (const h of heroes) {
      const share = hpShare(run, h.id);
      const b = el('button', `rmHero${sel && !remedyBlock(run, sel, h.id) ? ' can' : ''}`);
      b.type = 'button';
      const bar = el('i', 'rmBar');
      const fill = el('b');
      fill.style.width = `${Math.round(share * 100)}%`;
      bar.append(fill);
      b.append(el('span', '', `${heroName(h.kind)} · ${Math.round(share * 100)}%`), bar);
      b.disabled = !canUse || !sel || !!remedyBlock(run, sel, h.id);
      b.addEventListener('click', () => {
        if (sel && useRemedy(run, sel, h.id, bonus)) {
          play('heal');
          changed();
        }
        sel = undefined;
        draw();
      });
      list.append(b);
    }
    box.append(list);
  };
  draw();
}
