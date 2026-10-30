// The settings page (#settings): a short list of submenus (Sound, Display and motion, Gameplay, Ruler and Duchess, Save
// and data, Developer, Updates and notes, About), each opening on a tap with a back button. Opened from the home screen
// and the gear in the top bar. The choices are kept in localStorage (legends.settings, the same keys as before the
// submenus); `settings()` is what the rest of the page reads, and `onSettings` tells a module when one changes (the sound's volumes, the frame cap). Nothing here touches the battle.

import { tips } from './tips';
import { DEFAULT_RULER, RULERS, rulerOf, type RulerId } from './rulerRules';
import { RULER_URLS } from './rulerUrls';
import { DUCHESS_COSMETICS, type DuchessCosmeticId } from './render/duchessRules';
import { closePicker, openPicker } from './settingsPicker';
import type { DevGift } from './sim/devGrant';
import { EARLIER, UPDATES, releaseOf, updatesUnseen } from './updates';

const KEY = 'legends.settings';

export interface Settings {
  /** The player's ruler; cosmetic, shared by every view. */
  ruler: RulerId;
  /** Set once the player picks a ruler in the picker. Before The King (0.212.0) any saved setting carried the old default,
   *  Iron Stag, so a saved Iron Stag without this is read as the old default and moves to The King, the owner's call. */
  rulerPicked?: boolean;
  /** Music volume, 0 to 100. */
  music: number;
  /** Effects volume, 0 to 100. */
  effects: number;
  /** The fight speed a new fight starts at. */
  speed: 1 | 2;
  /** Whether the screen shakes (and flashes on a crit or a big kill). */
  shake: boolean;
  /** Whether damage numbers pop up. */
  numbers: boolean;
  /** Battery saver: the frame rate is capped at 30. */
  saver: boolean;
  /** Keep the screen on during a fight. */
  awake: boolean;
  /** Whether heroes pipe up in small speech bubbles (hired, placed, a win or a loss, a bit of banter). */
  quips: boolean;
  /** Whether cinematics play by themselves (the opening, a boss's arrival, a hero earned, the summoning). Off, they never start, but the codex's Scenes list can still play a seen one. */
  cinematics: boolean;
  /** Whether a hero's ultimate plays its full moment (ULT-CUTIN, docs/notes/battle-hud.md): the fight pauses, a slash of the hero's art crosses
   *  the screen with the ultimate's name and the board dims round the caster. Off, the short one: a quick banner while the fight runs on. */
  ultFull: boolean;
  /** Duchess's equipped unlockable cosmetic accessory. */
  duchessHat: DuchessCosmeticId;
}

export const DEFAULTS: Settings = { ruler: DEFAULT_RULER, music: 100, effects: 100, speed: 1, shake: true, numbers: true, saver: false, awake: true, quips: true, cinematics: true, ultFull: true, duchessHat: 'none' };

/** The settings from what was saved (`raw`, the stored text or null): anything missing or wrong falls back to the default. */
export function parseSettings(raw: string | null): Settings {
  let saved: Partial<Record<keyof Settings, unknown>> = {};
  try {
    const v = raw ? JSON.parse(raw) : {};
    if (v && typeof v === 'object') saved = v;
  } catch {
    /* (not JSON: the defaults) */
  }
  const volume = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(100, Math.max(0, Math.round(x))) : d);
  const flag = (x: unknown, d: boolean) => (typeof x === 'boolean' ? x : d);
  const validHat = (x: unknown): DuchessCosmeticId => (typeof x === 'string' && DUCHESS_COSMETICS.some((c) => c.id === x) ? (x as DuchessCosmeticId) : DEFAULTS.duchessHat);
  return {
    ruler: saved.ruler === 'iron_stag' && saved.rulerPicked !== true ? DEFAULT_RULER : rulerOf(saved.ruler).id,
    ...(saved.rulerPicked === true ? { rulerPicked: true } : {}),
    music: volume(saved.music, DEFAULTS.music),
    effects: volume(saved.effects, DEFAULTS.effects),
    speed: saved.speed === 2 ? 2 : 1,
    shake: flag(saved.shake, DEFAULTS.shake),
    numbers: flag(saved.numbers, DEFAULTS.numbers),
    saver: flag(saved.saver, DEFAULTS.saver),
    awake: flag(saved.awake, DEFAULTS.awake),
    quips: flag(saved.quips, DEFAULTS.quips),
    cinematics: flag(saved.cinematics, DEFAULTS.cinematics),
    ultFull: flag(saved.ultFull, DEFAULTS.ultFull),
    duchessHat: validHat(saved.duchessHat),
  };
}

function readSaved(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

let current = parseSettings(readSaved());
const listeners = new Set<(s: Settings) => void>();

/** The settings as they are now. */
export const settings = (): Settings => current;

/** Calls `fn` with the settings each time one changes (and once now, so it starts right). */
export function onSettings(fn: (s: Settings) => void): void {
  listeners.add(fn);
  fn(current);
}

/** Changes one setting, saves the lot and tells the listeners. */
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  current = { ...current, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* (a private window: the choice lasts this visit only) */
  }
  for (const fn of listeners) fn(current);
}

/* -------------------------------------------------------------- the page */

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let wired = false;

/** The submenus of the page (the owner's ask: the options condensed into a short list of menus that open on a tap). */
type Page = 'sound' | 'display' | 'gameplay' | 'ruler' | 'data' | 'dev' | 'updates' | 'about';

/** Each submenu's name and its one-line hint on the top list, in the order shown. */
const PAGES: readonly { id: Page; title: string; hint: string }[] = [
  { id: 'sound', title: 'Sound', hint: 'Music and effects volumes' },
  { id: 'display', title: 'Display and motion', hint: 'Screen shake, damage numbers, battery saver, keep awake' },
  { id: 'gameplay', title: 'Gameplay', hint: 'Fight speed, hero quips, cinematics, ultimate scenes, tips' },
  { id: 'ruler', title: 'Ruler and Duchess', hint: 'Who rules your keep, and Duchess’s costume' },
  { id: 'data', title: 'Save and data', hint: 'Start over' },
  { id: 'dev', title: 'Developer', hint: 'Crowns, shards and stones for testing' },
  { id: 'updates', title: 'Updates and notes', hint: 'What changed in each version' },
  { id: 'about', title: 'About', hint: 'Version and credits' },
];

/** The submenu showing, or null for the top list. */
let page: Page | null = null;

/** Opens the settings page over whatever is showing, at its top list. */
export function openSettings(): void {
  if (!wired) {
    wired = true;
    $('settingsClose').addEventListener('click', closeSettings);
  }
  page = null;
  draw();
  $('settings').hidden = false;
}

export function closeSettings(): void {
  closePicker();
  $('settings').hidden = true;
}

/** Shows a submenu (or the top list, for null) and scrolls back to the top. */
function go(to: Page | null): void {
  closePicker();
  page = to;
  if (to === 'updates') markUpdatesSeen();
  draw();
  $('settings').scrollTop = 0;
  // (focus the back button in a submenu, or the row that was open on the way back, for keyboards and screen readers)
  const focus = to ? document.querySelector<HTMLElement>('#settingsBody .setBack') : null;
  focus?.focus();
}

/** The rows of the page showing, drawn from the settings as they are now. */
function draw(): void {
  const s = current;
  const body = $('settingsBody');
  const title = document.querySelector<HTMLElement>('#settings h2');
  const at = PAGES.find((p) => p.id === page);
  if (title) title.textContent = at ? at.title : 'Settings';
  if (!at) {
    body.replaceChildren(...PAGES.map(menuRow));
    return;
  }
  body.replaceChildren(backRow(), ...pageRows(at.id, s));
}

function pageRows(id: Page, s: Settings): HTMLElement[] {
  switch (id) {
    case 'sound':
      return [volumeRow('Music', 'music', s.music, 'Off turns the music and the ambience off and keeps the effects'), volumeRow('Effects', 'effects', s.effects)];
    case 'display':
      return [
        toggleRow('Screen shake', 'Shakes, and flashes white on a crit or a big kill', 'shake', s.shake),
        toggleRow('Damage numbers', 'The numbers that pop up when a fighter is hit', 'numbers', s.numbers),
        toggleRow('Battery saver', 'Caps the frame rate at 30', 'saver', s.saver),
        toggleRow('Keep screen awake', 'The screen stays on while the game is open', 'awake', s.awake),
      ];
    case 'gameplay':
      return [
        speedRow(s.speed),
        toggleRow('Hero quips', 'Heroes (and now and then Duchess) say the odd word in a small speech bubble', 'quips', s.quips),
        toggleRow('Cinematics', 'Short scenes at big moments. Off, none play by themselves; the Scenes list in the codex still plays them', 'cinematics', s.cinematics),
        toggleRow('Full ultimate scenes', 'On, the fight pauses as an ultimate fires: the hero slashes across the screen, its name shows and the board dims round the caster. Off, a quick banner while the fight runs on', 'ultFull', s.ultFull),
        resetTipsRow(),
      ];
    case 'ruler':
      return [rulerRow(s.ruler), duchessHatRow(s.duchessHat)];
    case 'data':
      return [startOverRow()];
    case 'dev':
      return [devRow()];
    case 'updates':
      return updatesRows();
    case 'about':
      return aboutRows();
  }
}

/** A row of the top list: the submenu's name and hint, and a chevron; the Updates row carries a "New" dot when the game's
 *  version has changed since the page was last opened. */
function menuRow(p: (typeof PAGES)[number]): HTMLElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'setting setMenu';
  b.dataset.page = p.id;
  const text = document.createElement('div');
  const name = document.createElement('b');
  name.textContent = p.title;
  if (p.id === 'updates' && updatesNew()) {
    const dot = document.createElement('span');
    dot.className = 'newDot';
    dot.textContent = 'New';
    name.append(' ', dot);
  }
  const em = document.createElement('em');
  em.textContent = p.id === 'about' ? `Version ${releaseOf(__GAME_VERSION__)}` : p.hint;
  text.append(name, em);
  const chevron = document.createElement('span');
  chevron.className = 'setChevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '›';
  b.append(text, chevron);
  b.addEventListener('click', () => go(p.id));
  return b;
}

/** The back button at the top of a submenu, back to the top list. */
function backRow(): HTMLElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'setBack';
  b.textContent = '‹ Back';
  b.setAttribute('aria-label', 'Back to Settings');
  b.addEventListener('click', () => {
    const from = page;
    go(null);
    document.querySelector<HTMLElement>(`#settingsBody .setMenu[data-page="${from}"]`)?.focus();
  });
  return b;
}

/* ---------------------------------------------------- updates and notes */

const SEEN_KEY = 'legends.updatesSeen';

/** Whether the game's version is one the Updates page has not been opened on. */
function updatesNew(): boolean {
  let seen: string | null = null;
  try {
    seen = localStorage.getItem(SEEN_KEY);
  } catch {
    /* (storage blocked: shown as new) */
  }
  return updatesUnseen(seen, __GAME_VERSION__);
}

function markUpdatesSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, releaseOf(__GAME_VERSION__));
  } catch {
    /* (a private window: the dot shows again next visit) */
  }
  refreshUpdatesDot();
}

/** Puts the small "New" dot on the gear while the Updates page has news (called at start and when the page is opened). */
export function refreshUpdatesDot(): void {
  const news = updatesNew();
  for (const id of ['gear', 'hmGear']) document.getElementById(id)?.classList.toggle('hasNews', news);
}

/** A day as "29 October 2026". */
function dayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d} ${months[m - 1]} ${y}`;
}

/** The releases newest first, each a card with its lines; the older ranges fold into "Earlier updates". */
function updatesRows(): HTMLElement[] {
  const card = (version: string, when: string | undefined, title: string, lines: readonly string[]): HTMLElement => {
    const c = document.createElement('article');
    c.className = 'setting update';
    const head = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = title;
    const em = document.createElement('em');
    em.textContent = when ? `Version ${version} · ${when}` : `Version ${version}`;
    head.append(b, em);
    const ul = document.createElement('ul');
    for (const line of lines) {
      const li = document.createElement('li');
      li.textContent = line;
      ul.append(li);
    }
    c.append(head, ul);
    return c;
  };
  const rows = UPDATES.map((u) => card(u.version, u.date && dayOf(u.date), u.title, u.notes));
  const earlier = document.createElement('details');
  earlier.className = 'setting earlier';
  const summary = document.createElement('summary');
  summary.textContent = 'Earlier updates';
  earlier.append(summary);
  for (const e of EARLIER) {
    const p = document.createElement('p');
    const b = document.createElement('b');
    b.textContent = `${e.from} to ${e.to}${e.when ? ` · ${e.when}` : ''}`;
    p.append(b, document.createTextNode(e.summary));
    earlier.append(p);
  }
  return [...rows, earlier];
}

/** About: the game's name, its version and where the art and sound come from. */
function aboutRows(): HTMLElement[] {
  const [name] = row('Legends of the Last Keep', `Version ${__GAME_VERSION__}`);
  const [credits] = row(
    'Credits',
    'Art from free pixel-art packs (most from Craftpix, some from DawnLike and others) and some made for the game. Music from OpenGameArt composers and others. Most sound effects are made in the game, with a few recorded hits. Every source is named in the game’s credits list.',
  );
  return [name, credits];
}

function row(title: string, hint: string): [HTMLElement, HTMLElement] {
  const r = document.createElement('div');
  r.className = 'setting';
  const text = document.createElement('div');
  const b = document.createElement('b');
  b.textContent = title;
  const em = document.createElement('em');
  em.textContent = hint;
  text.append(b, em);
  r.append(text);
  return [r, text];
}

/** The ruler: one compact row with the current ruler's portrait and name; its button opens the picker of all nine
 *  (`settingsPicker.ts`), which saves to the same `ruler` setting. */
function rulerRow(value: RulerId): HTMLElement {
  const ruler = rulerOf(value);
  const [r] = row('Ruler', `${ruler.name} · ${ruler.role}`);
  r.classList.add('rulerRow');
  r.style.setProperty('--ruler-colour', ruler.colour);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rulerOpen';
  b.setAttribute('aria-haspopup', 'dialog');
  b.setAttribute('aria-label', `Ruler: ${ruler.name}, ${ruler.role}. Change`);
  const picture = rulerPortrait(ruler.id);
  const label = document.createElement('span');
  label.textContent = 'Change ▾';
  b.append(picture, label);
  b.addEventListener('click', () =>
    openPicker(
      $('settings'),
      {
        title: 'Choose your ruler',
        hint: 'Nine crowns, nine characters. Choose who rules your keep.',
        listClass: 'rulerChoices',
        options: RULERS.map((x) => ({
          id: x.id,
          on: x.id === value,
          className: 'rulerChoice',
          fill: (c) => {
            c.style.setProperty('--ruler-colour', x.colour);
            c.setAttribute('aria-label', `${x.name}, ${x.role}`);
            c.title = x.detail;
            const name = document.createElement('b');
            name.textContent = x.name;
            const role = document.createElement('small');
            role.textContent = x.role;
            c.append(rulerPortrait(x.id), name, role);
          },
        })),
        onPick: (id) => {
          setSetting('rulerPicked', true);
          setSetting('ruler', id as RulerId);
          draw();
          (document.querySelector('.rulerOpen') as HTMLElement | null)?.focus();
        },
      },
      b,
    ),
  );
  r.append(b);
  return r;
}

/** A ruler's portrait: the first frame of their sheet (The King's on his throne: his standing figure is the old, smaller pack sprite). */
function rulerPortrait(id: RulerId): HTMLElement {
  const picture = document.createElement('span');
  picture.className = 'rulerPortrait';
  picture.style.backgroundImage = `url("${RULER_URLS[id]}")`;
  if (id === 'the_king') picture.style.backgroundPosition = `0 ${(6 / 7) * 100}%`;
  picture.setAttribute('aria-hidden', 'true');
  return picture;
}

function volumeRow(title: string, key: 'music' | 'effects', value: number, offHint = 'Off'): HTMLElement {
  const [r] = row(title, value === 0 ? offHint : `${value}%`);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '10';
  slider.value = String(value);
  slider.setAttribute('aria-label', `${title} volume`);
  const readout = r.querySelector('em')!;
  slider.addEventListener('input', () => {
    readout.textContent = slider.value === '0' ? offHint : `${slider.value}%`;
  });
  slider.addEventListener('change', () => setSetting(key, Number(slider.value)));
  r.append(slider);
  return r;
}

function speedRow(value: 1 | 2): HTMLElement {
  const [r] = row('Fight speed', 'The speed a fight starts at (the speed button in the fight changes it, and is remembered)');
  const pair = document.createElement('div');
  pair.className = 'pair';
  for (const n of [1, 2] as const) {
    const b = document.createElement('button');
    b.textContent = `×${n}`;
    b.setAttribute('aria-pressed', String(n === value));
    b.classList.toggle('on', n === value);
    b.addEventListener('click', () => {
      setSetting('speed', n);
      draw();
    });
    pair.append(b);
  }
  r.append(pair);
  return r;
}

function toggleRow(title: string, hint: string, key: 'shake' | 'numbers' | 'saver' | 'awake' | 'quips' | 'cinematics' | 'ultFull', value: boolean): HTMLElement {
  const [r] = row(title, hint);
  const b = document.createElement('button');
  b.className = value ? 'toggle on' : 'toggle';
  b.textContent = value ? 'On' : 'Off';
  b.setAttribute('aria-pressed', String(value));
  b.addEventListener('click', () => {
    setSetting(key, !value);
    draw();
  });
  r.append(b);
  return r;
}

function getDuchessMeta(): { duchessTaps?: number; duchessLucky?: boolean; duchessHay?: boolean } {
  try {
    const raw = localStorage.getItem('legends.meta');
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

/** Duchess's costume: one row with the one she wears; its button opens a picker of them all (locked ones say how to unlock). */
function duchessHatRow(value: DuchessCosmeticId): HTMLElement {
  const meta = getDuchessMeta();
  const worn = DUCHESS_COSMETICS.find((c) => c.id === value) ?? DUCHESS_COSMETICS[0];
  const [r] = row('Duchess costume', worn.name);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'costumeOpen';
  b.setAttribute('aria-haspopup', 'dialog');
  b.setAttribute('aria-label', `Duchess costume: ${worn.name}. Change`);
  b.textContent = 'Change ▾';
  b.addEventListener('click', () =>
    openPicker(
      $('settings'),
      {
        title: 'Duchess’s costume',
        hint: 'An unlocked hat or accessory for Duchess.',
        listClass: 'costumeChoices',
        options: DUCHESS_COSMETICS.map((c) => {
          const unlocked = c.unlocked(meta);
          return {
            id: c.id,
            on: c.id === value,
            locked: !unlocked,
            className: 'costumeChoice',
            fill: (o: HTMLButtonElement) => {
              const name = document.createElement('b');
              name.textContent = unlocked ? c.name : `${c.name} 🔒`;
              const desc = document.createElement('small');
              desc.textContent = unlocked ? c.desc : `To unlock: ${c.hint}`;
              o.append(name, desc);
            },
          };
        }),
        onPick: (id) => {
          setSetting('duchessHat', id as DuchessCosmeticId);
          draw();
          (document.querySelector('.costumeOpen') as HTMLElement | null)?.focus();
        },
      },
      b,
    ),
  );
  r.append(b);
  return r;
}

/** The page's handler for the developer grant (`main.ts` sets it: it holds the meta). Returns a line saying what was given. */
let devGrantFn: ((what: DevGift, n: number) => string) | null = null;
export function onDevGrant(fn: (what: DevGift, n: number) => string): void {
  devGrantFn = fn;
}

/** The owner's developer option, for testing: crowns, shards of every hero, or summoning stones, a hundred or a thousand a
 *  tap. Six buttons in two columns (a hundred, a thousand) and three rows, so they fit at 360 wide. */
function devRow(): HTMLElement {
  const [r, text] = row('Developer', 'For testing: crowns, shards of every hero, or summoning stones, a hundred or a thousand a tap');
  const group = document.createElement('div');
  group.className = 'devGrant';
  for (const [what, n] of [['crowns', 100], ['crowns', 1000], ['shards', 100], ['shards', 1000], ['stones', 100], ['stones', 1000]] as const) {
    const b = document.createElement('button');
    b.textContent = `+${n} ${what}`;
    b.addEventListener('click', () => {
      const said = devGrantFn?.(what, n);
      if (said) text.querySelector('em')!.textContent = said;
    });
    group.append(b);
  }
  r.append(group);
  return r;
}

function resetTipsRow(): HTMLElement {
  const [r] = row('Tips', 'The first-run tips show again, one at a time');
  const b = document.createElement('button');
  b.textContent = 'Reset tips';
  b.addEventListener('click', () => {
    tips.reset();
    b.textContent = 'Tips reset';
  });
  r.append(b);
  return r;
}

/** The saves "Start over" wipes: the meta (heroes, crowns, castle, armies, gear, chests), every run in progress (the
 *  ordinary one, the spire's and the Calamity's own slots), the tips, the Calamity map's hint, the tavern's camera and what
 *  the achievements page has shown. The settings (volume, speed and the rest) and the sound switch are kept. */
export const SAVE_KEYS = ['legends.meta', 'legends.run', 'legends.tower', 'legends.stand', 'legends.calamity', 'legends.tips', 'lotf-achievements-seen', 'lotf-cal-hint', 'lotf.tavern.cam', 'lotf-army-shown'];

/** Start over: wipe every save and reload to a fresh game. Two taps, the second within a few seconds, so it can't happen by a slip. */
function startOverRow(): HTMLElement {
  const [r] = row('Start over', 'Wipes all progress: heroes, crowns, castle, armies and gear. Settings stay.');
  const b = document.createElement('button');
  b.className = 'danger';
  b.textContent = 'Start over';
  let armed = 0;
  b.addEventListener('click', () => {
    if (Date.now() - armed > 4000) {
      armed = Date.now();
      b.textContent = 'Sure? Tap again';
      setTimeout(() => {
        if (Date.now() - armed >= 4000) b.textContent = 'Start over';
      }, 4100);
      return;
    }
    for (const k of SAVE_KEYS)
      try {
        localStorage.removeItem(k);
      } catch {
        /* storage blocked: nothing saved to wipe */
      }
    location.reload();
  });
  r.append(b);
  return r;
}
