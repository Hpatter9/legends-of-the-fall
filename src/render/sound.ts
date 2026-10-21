// The page's sound. Music: the three Tiny RPG Music tracks (src/audio, copied to the page as town.ogg, battle.ogg and
// boss.ogg), looping and crossfaded through Web Audio. Effects: short tunes and noise bursts made here with the Web
// Audio API, so there are no files for them. Nothing in the sim knows about any of this: the page calls `playEvents`
// on each tick's events, `startFight` when a fight begins, and `play` for the rest.
//
// Phones block sound until a tap, so `setup` starts the audio on the first pointer-down, and every later call is
// safe before that (it does nothing). The mute button's choice is remembered in localStorage (legends.sound).

import type { BattleEvent } from '../sim/battle';

const MUSIC_LEVEL = 0.22;
const SFX_LEVEL = 0.5;
/** How long a crossfade takes to settle (seconds). */
const FADE_S = 1.2;
const SAVE_KEY = 'legends.sound';

const TRACKS = { town: 'town.ogg', battle: 'battle.ogg', boss: 'boss.ogg' } as const;
type Track = keyof typeof TRACKS;

/** The short effects. */
export type Sfx = 'swordHit' | 'heavyHit' | 'death' | 'arrow' | 'whoosh' | 'skill' | 'spell' | 'summon' | 'merge' | 'victory' | 'defeat' | 'star' | 'tap' | 'boom';

/** The least time (ms) between two of the same effect, so a crowd of hits at once is not loud. */
const GAP: Record<Sfx, number> = {
  swordHit: 90,
  heavyHit: 140,
  death: 160,
  arrow: 110,
  whoosh: 300,
  skill: 150,
  spell: 200,
  summon: 60,
  merge: 60,
  victory: 0,
  defeat: 0,
  star: 120,
  tap: 60,
  boom: 0,
};

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
let noise: AudioBuffer;
const players = new Map<Track, { el: HTMLAudioElement; gain: GainNode }>();
let current: Track | null = null;
const lastAt = new Map<Sfx, number>();
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) === 'off';
  } catch {
    return false;
  }
}

/** Starts the audio (the first call) and the town's music. Safe to call again. */
function unlock(): void {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_LEVEL;
    sfxBus.connect(master);
    // (one second of white noise, shared by the bursts)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state !== 'running') void ctx.resume();
  if (!current) setMusic('town');
}

/** Starts the audio on the first tap, and makes every button press a tap sound. Call once, from the page's start. */
export function setup(): void {
  window.addEventListener('pointerdown', unlock, true);
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest?.('button')) play('tap');
  });
}

/** The mute button: shows the speaker, toggles the sound and remembers the choice. */
export function bindMute(button: HTMLElement): void {
  const show = () => {
    button.textContent = muted ? '🔇' : '🔊';
    button.title = muted ? 'Sound off' : 'Sound on';
  };
  show();
  button.addEventListener('click', () => {
    muted = !muted;
    try {
      localStorage.setItem(SAVE_KEY, muted ? 'off' : 'on');
    } catch {
      /* (a private window: the choice lasts this visit only) */
    }
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
    show();
  });
}

/** A fight has begun: the boss track on a boss stage, the battle track otherwise. */
export function startFight(boss: boolean): void {
  setMusic(boss ? 'boss' : 'battle');
}

/** Sounds for one tick's battle events, and the music going back to the town when the fight ends. */
export function playEvents(events: BattleEvent[]): void {
  for (const e of events) {
    switch (e.kind) {
      case 'hit':
        play(e.killed ? 'death' : e.heavy ? 'heavyHit' : 'swordHit');
        break;
      case 'shot':
        play(e.shot === 'fire' ? 'whoosh' : 'arrow');
        break;
      case 'area':
        play(e.id === 'meteor' ? 'whoosh' : 'arrow');
        break;
      case 'skill':
        play('skill');
        break;
      case 'spell':
        play('spell');
        break;
      case 'end':
        play(e.won ? 'victory' : 'defeat');
        setMusic('town');
        break;
    }
  }
}

/** One effect now, unless the same one played too recently. */
export function play(name: Sfx): void {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (lastAt.get(name) ?? -Infinity) < GAP[name] / 1000) return;
  lastAt.set(name, now);
  SOUNDS[name](now + 0.01);
}

/** Fades the old track out and the new one in, and starts the new one from the top. */
function setMusic(track: Track): void {
  if (!ctx || track === current) return;
  const t = ctx.currentTime;
  const prev = current;
  current = track;
  if (prev) {
    const old = players.get(prev)!;
    old.gain.gain.setTargetAtTime(0, t, FADE_S / 3);
    // (after the fade, paused, unless it has come back in the meantime)
    setTimeout(() => {
      if (current !== prev) old.el.pause();
    }, FADE_S * 1000);
  }
  const next = player(track);
  next.gain.gain.setTargetAtTime(MUSIC_LEVEL, t, FADE_S / 3);
  next.el.currentTime = 0;
  void next.el.play().catch(() => {});
}

/** A track's element, made the first time it is needed: looped, and run through a gain for the fades. */
function player(track: Track) {
  let p = players.get(track);
  if (!p) {
    const el = new Audio(TRACKS[track]);
    el.loop = true;
    const gain = ctx!.createGain();
    gain.gain.value = 0;
    ctx!.createMediaElementSource(el).connect(gain).connect(master);
    p = { el, gain };
    players.set(track, p);
  }
  return p;
}

/* -------------------------------------------------------------- the synthesised effects */

/** A tone that swoops from `f` to `to` (if given) over `d` seconds, then dies away. */
function note(t: number, f: number, d: number, v: number, type: OscillatorType = 'triangle', to?: number): void {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + d + 0.05);
}

/** A burst of filtered noise for `d` seconds, its filter at `f` (sweeping to `to` if given). */
function hiss(t: number, d: number, f: number, type: BiquadFilterType, v: number, to?: number): void {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = 1.5;
  filter.frequency.setValueAtTime(f, t);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + d + 0.02);
}

const SOUNDS: Record<Sfx, (t: number) => void> = {
  swordHit: (t) => {
    hiss(t, 0.05, 2500, 'highpass', 0.22);
    note(t, 520, 0.08, 0.14, 'triangle', 300);
  },
  heavyHit: (t) => {
    note(t, 120, 0.25, 0.32, 'sine', 45);
    hiss(t, 0.18, 700, 'lowpass', 0.25);
  },
  death: (t) => {
    note(t, 220, 0.5, 0.14, 'triangle', 60);
    hiss(t, 0.3, 600, 'lowpass', 0.1);
  },
  arrow: (t) => {
    hiss(t, 0.12, 2400, 'bandpass', 0.12, 900);
    note(t, 1800, 0.05, 0.04, 'sine', 1200);
  },
  whoosh: (t) => hiss(t, 0.4, 400, 'bandpass', 0.2, 1400),
  skill: (t) => [523, 659, 784].forEach((f, i) => note(t + i * 0.08, f, 0.16, 0.13)),
  spell: (t) => {
    note(t, 660, 0.3, 0.13, 'sine', 990);
    note(t + 0.1, 1320, 0.25, 0.06, 'sine');
  },
  summon: (t) => {
    note(t, 880, 0.5, 0.14, 'sine');
    note(t + 0.06, 1320, 0.45, 0.08, 'sine');
  },
  merge: (t) => {
    [523, 659, 784].forEach((f, i) => note(t + i * 0.12, f, 0.2, 0.14));
    note(t + 0.36, 1047, 0.6, 0.16);
  },
  victory: (t) => [523, 659, 784, 1047].forEach((f, i) => note(t + i * 0.14, f, i < 3 ? 0.18 : 1.2, 0.16)),
  defeat: (t) => {
    [392, 349, 330].forEach((f, i) => note(t + i * 0.3, f, 0.3, 0.16));
    note(t + 0.9, 262, 1.2, 0.16);
  },
  star: (t) => {
    note(t, 988, 0.12, 0.14, 'triangle');
    note(t + 0.07, 1319, 0.2, 0.14, 'triangle');
  },
  tap: (t) => note(t, 1400, 0.03, 0.07, 'sine'),
  // a low boom: a boss walking in
  boom: (t) => {
    note(t, 70, 0.9, 0.45, 'sine', 30);
    hiss(t, 0.5, 200, 'lowpass', 0.3);
  },
};
