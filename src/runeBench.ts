// RUNE-BENCH (docs/notes/rune-bench.md): the bench's rune side, pulled across by the bar on the bench's edge (`benchSlide.ts`). The bag's
// runes sit as tiles, the way the heroes sit as cards, and are handled the same way: drag a rune onto its twin (or tap one, then the other)
// to merge; drag it onto a hero on the field (or tap it, then the hero) to set it in a socket. While a rune is held, its twins on the bench
// and the heroes that can take it light up; a drop that cannot be made springs back with a word saying why. A finger resting on a tile
// opens the rune's card; a tap on a hero with no rune chosen opens its three sockets, to take one off. The bench's Auto sets the runes
// for the player once earned (`featureUnlocks.ts`, `autoRunes`); Merge all is free, as it was in the old tray. The rules are all
// `sim/runes.ts`; this only draws them and passes the moves on.

import { BAG_MAX, SOCKETS, autoRunes, canMerge, dropRune, mergeAll, mergesReady, runeName, runeTargets, runeText, RUNE_FLOURISH, RUNE_NAMES, twinIds, whereRune, type Rune, type RuneState } from './sim/runes';
import { heroName } from './sim/heroNames';
import { autoRunesOpen, featureStarsToGo, AUTO_RUNES_STARS } from './sim/featureUnlocks';
import { runeAutoLabel } from './benchSideRules';
import { runeStone } from './runeTray';
import { MERGE_SPARK } from './gearUiArt';
import { menuFoot, menuNote, menuSection, menuWell, menuChoice, ornateMenu } from './ornateMenu';
import { twinNote } from './oneEachNote';
import { play } from './render/sound';
import { medal } from './paintedButton';
import type { Meta } from './sim/meta';

export interface RuneBenchHooks {
  /** The run's runes (undefined in a run without them). */
  runes(): RuneState | undefined;
  meta(): Meta;
  /** Whether the runes can change now (the deploy screen). */
  canEdit(): boolean;
  /** The hero kinds on the field (the company's, before any is placed): those a rune can be set on, and Auto's. */
  kinds(): string[];
  /** The hero kind standing under a point on the screen, if any. */
  heroAt(x: number, y: number): string | undefined;
  /** Light the heroes on the field that can take the held rune (`kinds`), and the one under the finger (`hot`, lit red when it cannot);
   *  null puts the lights out. */
  light(kinds: readonly string[] | null, hot?: { kind: string; ok: boolean }): void;
  /** After runes move: `kinds` are the hero kinds whose sockets changed (the page fits them out again and saves the run). */
  changed(kinds: readonly string[]): void;
  /** The satchel: the run's relics and remedies, and every hero's sockets, in a card. */
  openSatchel(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
/** A tile's short name, "Ember II". */
const shortName = (r: Rune): string => `${RUNE_NAMES[r.kind]} ${ROMAN[r.lv]}`;
/** RUNE-BENCH-ART: the chosen rune's name at the head of the hint (the one-row bench's tiles are too narrow for a word; the stone's colour and
 *  its pips are on the tile, and a hold opens its card). */
const chosenName = (s: RuneState, id: number): string => {
  const r = s.bag.find((x) => x.id === id);
  return r ? `${shortName(r)}: ` : '';
};
/** A rest this long (ms) on a tile opens its card. */
const HOLD_MS = 450;

/** Why a rune cannot go on a hero, in the note's words (null when it can). */
export function socketBlock(state: RuneState, id: number, kind: string, kinds: readonly string[]): string | null {
  const at = whereRune(state, id);
  if (!at) return 'That rune is gone';
  if (at.rune.kind === 'keystone') return 'A Keystone is never worn: drop it on a rune of its level to merge';
  if (!kinds.includes(kind)) return `${heroName(kind)} is not on the field`;
  if (at.kind === kind) return `${heroName(kind)} wears it already`;
  if ((state.worn[kind]?.length ?? 0) >= SOCKETS) return `${heroName(kind)}'s three sockets are full: tap ${heroName(kind)} to take one off`;
  return null;
}

/** The kinds that can take rune `id` now (lit while it is held). */
export function socketKinds(state: RuneState, id: number, kinds: readonly string[]): string[] {
  return runeTargets(state, id, kinds).heroes.filter((k) => !socketBlock(state, id, k, kinds));
}

export class RuneBench {
  /** The rune chosen by a tap, waiting for where it goes. */
  sel: number | undefined;
  private fresh = new Set<number>();
  private key = '';
  private press: { id: number; x: number; y: number; pid: number; moved: boolean; held: boolean; timer: ReturnType<typeof setTimeout> } | null = null;
  private ghost: HTMLElement | null = null;

  constructor(
    readonly root: HTMLElement,
    private readonly hooks: RuneBenchHooks,
  ) {
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', () => this.cancel());
  }

  /** The merges ready in the bag and on the heroes (the bar's badge). */
  merges(): number {
    const s = this.hooks.runes();
    return s && this.hooks.canEdit() ? mergesReady(s) : 0;
  }

  /** Draw the bench again if anything it shows has changed (or always, with `force`). */
  sync(force = false): void {
    const s = this.hooks.runes();
    const key = s ? `${JSON.stringify(s.bag)}|${JSON.stringify(s.worn)}|${this.hooks.canEdit()}|${this.sel}|${this.hooks.kinds().join()}|${autoRunesOpen(this.hooks.meta())}|${featureStarsToGo(this.hooks.meta(), 'autoRunes')}` : '';
    if (!force && key === this.key) return;
    this.key = key;
    this.draw();
  }

  private draw(): void {
    const s = this.hooks.runes();
    const root = this.root;
    root.replaceChildren();
    if (!s) return;
    const edit = this.hooks.canEdit();
    const head = el('div', 'rbHead');
    // (the bench's name on a lit tab plate, paintedButtons.css)
    head.append(el('b', 'rbTitle', `Runes · ${s.bag.length} / ${BAG_MAX}`));
    const merges = mergesReady(s);
    const all = el('button', 'rbBtn rbMerge', merges ? `Merge all · ${merges}` : 'Merge all');
    all.type = 'button';
    all.disabled = !edit || !merges;
    all.addEventListener('click', () => {
      const before = this.wornKey(s);
      this.fresh = new Set(mergeAll(s).map((r) => r.id));
      play('runeMerge');
      this.after(before);
    });
    const open = autoRunesOpen(this.hooks.meta());
    const auto = el('button', `rbBtn rbAuto${open ? '' : ' locked'}`);
    auto.type = 'button';
    auto.dataset.feature = 'autoRunes';
    // (locked: the painted lock medallion takes the place of Auto's own)
    if (!open) auto.append(medal('lock', 'rbLock'));
    auto.append(document.createTextNode(runeAutoLabel(open, featureStarsToGo(this.hooks.meta(), 'autoRunes'))));
    auto.title = open ? 'Set the runes in the bag on the heroes on the field, the best for each' : `Opens at ${AUTO_RUNES_STARS} stars won across the armies`;
    auto.disabled = open && (!edit || !this.hooks.kinds().length);
    auto.addEventListener('click', (e) => {
      if (!open) return twinNote(`Rune Auto opens at ${AUTO_RUNES_STARS} stars won across the armies: ${featureStarsToGo(this.hooks.meta(), 'autoRunes')} to go`, e.clientX, e.clientY - 20);
      const before = this.wornKey(s);
      if (autoRunes(s, this.hooks.kinds())) play('runeSet');
      this.after(before);
    });
    const satchel = el('button', 'rbBtn rbSatchel', 'Satchel');
    satchel.type = 'button';
    satchel.title = 'Relics, remedies and every hero’s sockets';
    satchel.addEventListener('click', () => this.hooks.openSatchel());
    head.append(all, auto, satchel);
    root.append(head);
    const grid = el('div', 'rbGrid');
    const twins = twinIds(s);
    const lit = this.sel !== undefined ? runeTargets(s, this.sel, this.hooks.kinds()).merge : [];
    for (let i = 0; i < Math.max(BAG_MAX, s.bag.length); i++) {
      const r = s.bag[i];
      const t = el('button', `rbTile${r ? '' : ' empty'}${r && r.id === this.sel ? ' sel' : ''}${r && lit.includes(r.id) ? ' mergeCan' : ''}${r && twins.has(r.id) ? ' ready' : ''}`);
      t.type = 'button';
      const stone = runeStone(r, !!r && twins.has(r.id));
      t.append(stone);
      if (r) {
        t.dataset.id = String(r.id);
        t.append(el('small', '', shortName(r)));
        t.setAttribute('aria-label', `${runeName(r)}: ${runeText(r)}`);
        if (this.fresh.has(r.id)) {
          t.classList.add('evolve');
          const spark = el('span', 'rnSpark');
          spark.style.backgroundImage = `url(${MERGE_SPARK})`;
          spark.addEventListener('animationend', () => spark.remove());
          stone.append(spark);
        }
        t.addEventListener('pointerdown', (e) => this.down(e, r.id));
        t.addEventListener('contextmenu', (e) => e.preventDefault());
      } else t.disabled = true;
      grid.append(t);
    }
    root.append(grid);
    this.fresh = new Set();
    root.append(el('p', 'rbHint', !edit ? 'Runes change between waves.' : this.sel !== undefined ? `${chosenName(s, this.sel)}Now tap its twin to merge, or a lit hero to set it. Tap it again to put it down.` : s.bag.length ? 'Drag a rune onto its twin to merge, or onto a hero to set it. Hold one to read it.' : 'The bag is empty: won waves and finds bring runes.'));
  }

  private wornKey(s: RuneState): Record<string, string> {
    return Object.fromEntries(Object.entries(s.worn).map(([k, v]) => [k, v.map((r) => `${r.id}.${r.lv}`).join()]));
  }

  /** Runes moved: tell the page which heroes' sockets changed, and draw again. */
  private after(before: Record<string, string>): void {
    const s = this.hooks.runes()!;
    const now = this.wornKey(s);
    const kinds = [...new Set([...Object.keys(before), ...Object.keys(now)])].filter((k) => (before[k] ?? '') !== (now[k] ?? ''));
    this.sel = undefined;
    this.hooks.light(null);
    this.hooks.changed(kinds);
    this.sync(true);
  }

  // ---- the finger ----

  private down(e: PointerEvent, id: number): void {
    if (e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.cancel();
    const timer = setTimeout(() => {
      if (!this.press || this.press.moved) return;
      this.press.held = true;
      this.openRune(id);
    }, HOLD_MS);
    this.press = { id, x: e.clientX, y: e.clientY, pid: e.pointerId, moved: false, held: false, timer };
  }

  private move(e: PointerEvent): void {
    const p = this.press;
    if (!p || p.pid !== e.pointerId || p.held) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
    const s = this.hooks.runes();
    if (!s || !this.hooks.canEdit()) return;
    if (!p.moved) {
      p.moved = true;
      clearTimeout(p.timer);
      this.sel = undefined;
      this.pickUp(s, p.id);
    }
    const g = this.ghost!;
    g.style.transform = `translate(${e.clientX}px, ${e.clientY - 34}px) translate(-50%, -50%) scale(1.15)`;
    const onto = this.tileAt(e.clientX, e.clientY, p.id);
    for (const t of this.root.querySelectorAll<HTMLElement>('.rbTile')) t.classList.toggle('mergeHot', !!onto && t === onto);
    const kinds = socketKinds(s, p.id, this.hooks.kinds());
    const kind = onto ? undefined : this.hooks.heroAt(e.clientX, e.clientY - 34);
    this.hooks.light(kinds, kind ? { kind, ok: kinds.includes(kind) } : undefined);
    g.classList.toggle('bad', !!kind && !kinds.includes(kind));
  }

  private up(e: PointerEvent): void {
    const p = this.press;
    if (!p || p.pid !== e.pointerId) return;
    this.press = null;
    clearTimeout(p.timer);
    if (p.held) return;
    const s = this.hooks.runes();
    if (!s || !this.hooks.canEdit()) return;
    if (!p.moved) return this.tap(s, p.id);
    const onto = this.tileAt(e.clientX, e.clientY, p.id);
    if (onto) {
      const other = Number(onto.dataset.id);
      const a = whereRune(s, p.id)?.rune;
      const b = whereRune(s, other)?.rune;
      if (a && b && canMerge(a, b)) return this.drop(s, p.id, { rune: other });
      return this.reject(`${shortName(a!)} and ${shortName(b!)} do not merge: twins (or a Keystone of the level) do`, e);
    }
    const kind = this.hooks.heroAt(e.clientX, e.clientY - 34);
    if (kind) {
      const why = socketBlock(s, p.id, kind, this.hooks.kinds());
      if (why) return this.reject(why, e);
      return this.drop(s, p.id, { kind });
    }
    // (let go anywhere else: it goes back to its place)
    this.putDown(true);
  }

  private cancel(): void {
    if (this.press) clearTimeout(this.press.timer);
    this.press = null;
    this.putDown(false);
  }

  /** A tap on a tile: choose it, put it down, or merge the chosen one into it. */
  private tap(s: RuneState, id: number): void {
    if (this.sel === undefined || this.sel === id) {
      this.sel = this.sel === id ? undefined : id;
      this.hooks.light(this.sel === undefined ? null : socketKinds(s, id, this.hooks.kinds()));
      play('tap');
      return this.sync(true);
    }
    const a = whereRune(s, this.sel)?.rune;
    const b = whereRune(s, id)?.rune;
    if (a && b && canMerge(a, b)) return this.drop(s, this.sel, { rune: id });
    // (not its twin: the tapped one is chosen instead)
    this.sel = id;
    this.hooks.light(socketKinds(s, id, this.hooks.kinds()));
    this.sync(true);
  }

  /** A tap on a hero on the field while on the rune side: set the chosen rune there, or (none chosen) open the hero's sockets. */
  tapHero(kind: string, x: number, y: number): void {
    const s = this.hooks.runes();
    if (!s || !this.hooks.canEdit()) return;
    if (this.sel === undefined) return this.openSockets(kind);
    const why = socketBlock(s, this.sel, kind, this.hooks.kinds());
    if (why) {
      play('miss');
      return twinNote(why, x, y);
    }
    this.drop(s, this.sel, { kind });
  }

  /** Put the chosen rune down (a tap on the field away from the heroes). */
  clearChoice(): void {
    if (this.sel === undefined) return;
    this.sel = undefined;
    this.hooks.light(null);
    this.sync(true);
  }

  private drop(s: RuneState, id: number, to: { rune?: number; kind?: string }): void {
    const before = this.wornKey(s);
    const done = dropRune(s, id, to);
    this.putDown(false);
    if (done === 'merged') {
      this.fresh = new Set([to.rune!]);
      play('runeMerge');
    } else if (done === 'set') play('runeSet');
    this.after(before);
  }

  /** A drop that cannot be made: the stone shakes and goes home, and the note says why. */
  private reject(why: string, e: PointerEvent): void {
    play('miss');
    twinNote(why, e.clientX, e.clientY);
    this.putDown(true, true);
    this.hooks.light(null);
  }

  private pickUp(s: RuneState, id: number): void {
    const r = whereRune(s, id)?.rune;
    if (!r) return;
    const tile = this.root.querySelector<HTMLElement>(`.rbTile[data-id="${id}"]`);
    tile?.classList.add('dragging');
    const merge = runeTargets(s, id, this.hooks.kinds()).merge;
    for (const t of this.root.querySelectorAll<HTMLElement>('.rbTile')) t.classList.toggle('mergeCan', merge.includes(Number(t.dataset.id)));
    const g = el('div', 'rbGhost');
    g.dataset.id = String(id);
    g.append(runeStone(r));
    document.body.append(g);
    this.ghost = g;
    this.hooks.light(socketKinds(s, id, this.hooks.kinds()));
  }

  /** The held stone goes: back to its tile (`home`, after a shake when refused), or simply away (it has gone where it was dropped). */
  private putDown(home: boolean, shake = false): void {
    const g = this.ghost;
    this.ghost = null;
    const id = g?.dataset.id;
    for (const t of this.root.querySelectorAll<HTMLElement>('.rbTile')) t.classList.remove('mergeCan', 'mergeHot');
    const tile = id ? this.root.querySelector<HTMLElement>(`.rbTile[data-id="${id}"]`) : null;
    if (!g || !home) {
      tile?.classList.remove('dragging');
      return g?.remove();
    }
    this.hooks.light(null);
    const fly = () => {
      const r = tile?.getBoundingClientRect();
      g.classList.add('home');
      if (r) g.style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px) translate(-50%, -50%) scale(1)`;
      setTimeout(() => {
        g.remove();
        tile?.classList.remove('dragging');
      }, 240);
    };
    if (shake) {
      g.classList.add('refused');
      setTimeout(fly, 260);
    } else fly();
  }

  /** The bench tile under a point that is not rune `id`'s own. */
  private tileAt(x: number, y: number, id: number): HTMLElement | null {
    for (const e of document.elementsFromPoint(x, y)) {
      const t = (e as HTMLElement).closest<HTMLElement>('.rbTile[data-id]');
      if (t && this.root.contains(t) && t.dataset.id !== String(id)) return t;
    }
    return null;
  }

  // ---- the cards ----

  /** A rune's card: its stone, what it gives, what it merges with. */
  openRune(id: number): void {
    const s = this.hooks.runes();
    const r = s && whereRune(s, id)?.rune;
    if (!r) return;
    this.putDown(false);
    const menu = ornateMenu({ id: 'runeInfo', title: runeName(r), eyebrow: 'Rune', kind: 'card' });
    const well = menuWell(menu.body);
    well.classList.add('rbInfo');
    well.append(runeStone(r), el('p', '', runeText(r)));
    if (r.lv < 5) menuNote(menu.body, r.kind === 'keystone' ? `Merges with any rune of level ${ROMAN[r.lv]} to make it level ${ROMAN[r.lv + 1]}. Never worn.` : `Merge with another ${shortName(r)}, or a Keystone ${ROMAN[r.lv]}, to make ${RUNE_NAMES[r.kind]} ${ROMAN[r.lv + 1]}.`);
    else if (RUNE_FLOURISH[r.kind]) menuNote(menu.body, `The top level: ${RUNE_FLOURISH[r.kind]!.name}.`);
    menuFoot(menu, { back: { word: 'close' } });
  }

  /** A hero's three sockets, each worn rune with a tap to take it off into the bag. */
  openSockets(kind: string): void {
    const s = this.hooks.runes();
    if (!s) return;
    const menu = ornateMenu({ id: 'runeSockets', title: heroName(kind), eyebrow: 'Rune sockets', kind: 'card' });
    const grid = menuSection(menu.body, 'Sockets', `${s.worn[kind]?.length ?? 0} of ${SOCKETS}`, 2);
    const worn = s.worn[kind] ?? [];
    for (let i = 0; i < SOCKETS; i++) {
      const r = worn[i];
      if (!r) {
        menuChoice(grid, { title: 'Empty socket', lines: ['Drag a rune from the bench onto the hero'], disabled: true });
        continue;
      }
      const b = menuChoice(grid, {
        title: runeName(r),
        lines: [runeText(r), ['Tap to take it off', 'pay']],
        disabled: !this.hooks.canEdit(),
        onPick: () => {
          const before = this.wornKey(s);
          if (dropRune(s, r.id, { bag: true })) play('tap');
          menu.close();
          this.after(before);
        },
      });
      b.prepend(runeStone(r, false, 'small'));
    }
    menuFoot(menu, { back: { word: 'close' } });
  }
}
