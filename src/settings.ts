// The settings page (#settings): the volumes, the fight speed, screen shake, damage numbers, battery saver, keeping the
// screen awake, and the version. Opened from the home screen and the gear in the top bar. The choices are kept in
// localStorage (legends.settings); `settings()` is what the rest of the page reads, and `onSettings` tells a module
// when one changes (the sound's volumes, the frame cap). Nothing here touches the battle.

import { tips } from './tips';

const KEY = 'legends.settings';

export interface Settings {
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
}

export const DEFAULTS: Settings = { music: 100, effects: 100, speed: 1, shake: true, numbers: true, saver: false, awake: true };

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
  return {
    music: volume(saved.music, DEFAULTS.music),
    effects: volume(saved.effects, DEFAULTS.effects),
    speed: saved.speed === 2 ? 2 : 1,
    shake: flag(saved.shake, DEFAULTS.shake),
    numbers: flag(saved.numbers, DEFAULTS.numbers),
    saver: flag(saved.saver, DEFAULTS.saver),
    awake: flag(saved.awake, DEFAULTS.awake),
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

/** Opens the settings page over whatever is showing. */
export function openSettings(): void {
  if (!wired) {
    wired = true;
    $('settingsClose').addEventListener('click', closeSettings);
  }
  draw();
  $('settings').hidden = false;
}

export function closeSettings(): void {
  $('settings').hidden = true;
}

/** The rows, drawn from the settings as they are now. */
function draw(): void {
  const s = current;
  const body = $('settingsBody');
  body.replaceChildren(
    volumeRow('Music', 'music', s.music),
    volumeRow('Effects', 'effects', s.effects),
    speedRow(s.speed),
    toggleRow('Screen shake', 'Shakes, and flashes white on a crit or a big kill', 'shake', s.shake),
    toggleRow('Damage numbers', 'The numbers that pop up when a fighter is hit', 'numbers', s.numbers),
    toggleRow('Battery saver', 'Caps the frame rate at 30', 'saver', s.saver),
    toggleRow('Keep screen awake', 'The screen stays on during a fight', 'awake', s.awake),
    resetTipsRow(),
  );
  const version = document.createElement('p');
  version.className = 'hint';
  version.textContent = `Version ${__GAME_VERSION__}`;
  body.append(version);
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

function volumeRow(title: string, key: 'music' | 'effects', value: number): HTMLElement {
  const [r] = row(title, value === 0 ? 'Off' : `${value}%`);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '10';
  slider.value = String(value);
  slider.setAttribute('aria-label', `${title} volume`);
  const readout = r.querySelector('em')!;
  slider.addEventListener('input', () => {
    readout.textContent = slider.value === '0' ? 'Off' : `${slider.value}%`;
  });
  slider.addEventListener('change', () => setSetting(key, Number(slider.value)));
  r.append(slider);
  return r;
}

function speedRow(value: 1 | 2): HTMLElement {
  const [r] = row('Fight speed', 'The speed a new fight starts at (× 2 in the fight still toggles)');
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

function toggleRow(title: string, hint: string, key: 'shake' | 'numbers' | 'saver' | 'awake', value: boolean): HTMLElement {
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
