// The page's sound. Music: the three Tiny RPG Music tracks (src/audio, copied to the page as town.ogg, battle.ogg and
// boss.ogg), looping and crossfaded through Web Audio. Effects: short tunes and noise bursts made here with the Web
// Audio API, so there are no files for them. Nothing in the sim knows about any of this: the page calls `playEvents`
// on each tick's events, `startFight` when a fight begins, and `play` for the rest.
//
// Phones block sound until a tap, so `setup` starts the audio on the first pointer-down, and every later call is
// safe before that (it does nothing). The mute button's choice is remembered in localStorage (legends.sound); the
// volumes come from the settings page (`settings.ts`).

import type { Battle, BattleEvent } from '../sim/battle';
import { onSettings, settings } from '../settings';
import { Mixer, cuesFor, intensityOf, type Cue } from './soundRules';

const MUSIC_LEVEL = 0.22;
const SFX_LEVEL = 0.5;
/** How long a crossfade takes to settle (seconds). */
const FADE_S = 1.2;
const SAVE_KEY = 'legends.sound';

const TRACKS = { town: 'town.ogg', battle: 'battle.ogg', boss: 'boss.ogg' } as const;
type Track = keyof typeof TRACKS;

export type Sfx = Cue;

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
let noise: AudioBuffer;
const players = new Map<Track, { el: HTMLAudioElement; gain: GainNode }>();
let current: Track | null = null;
const mixer = new Mixer();
/** The pitch of the sound being made now (the mixer's random lift), applied by `note` and `hiss`. */
let pitch = 1;
/** The level of the sound being made now (the mixer's: its own, the caller's, and the speed's hush). */
let voiceGain = 1;
/** How hot the fight is, 0 to 1: the battle music quickens and swells with it. */
let tension = 0;
let tensionTick = 0;
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
    sfxBus.gain.value = SFX_LEVEL * effectsLevel();
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
  onSettings(applyLevels);
  window.addEventListener('pointerdown', unlock, true);
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest?.('button')) play('tap');
  });
}

/** The volumes from the settings page (0 to 1 each, on top of the levels above). */
const effectsLevel = () => settings().effects / 100;
const musicLevel = () => settings().music / 100;

/** The settings page changed a volume: the music now playing and the effects follow. */
function applyLevels(): void {
  if (!ctx) return;
  sfxBus.gain.setTargetAtTime(SFX_LEVEL * effectsLevel(), ctx.currentTime, 0.05);
  if (current) players.get(current)?.gain.gain.setTargetAtTime(MUSIC_LEVEL * musicLevel(), ctx.currentTime, 0.05);
}

/** The mute button: shows the speaker, toggles the sound and remembers the choice. */
export function bindMute(button: HTMLElement): void {
  const show = () => {
    // (the face is a pixel icon, chosen by the page's CSS from this attribute)
    button.textContent = '';
    if (muted) button.dataset.off = '1';
    else delete button.dataset.off;
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
  mixer.reset();
  setTension(0);
  setMusic(boss ? 'boss' : 'battle');
}

/** Sounds for one tick's battle events (`speed` is the fight's: quieter at ×2), and the music going back to the town when
 *  the fight ends. Call after stepping the battle `b`. */
export function playEvents(b: Battle, events: BattleEvent[], speed = 1): void {
  for (const e of events) {
    for (const q of cuesFor(b, e)) cue(q.cue, speed, q.gain ?? 1, q.delay ?? 0);
    if (e.kind === 'end') {
      setTension(0);
      setMusic('town');
    }
  }
  // (the music's pace follows how thin the sides have got, checked about twice a second)
  if (b.phase === 'fight' && ++tensionTick % 5 === 0) setTension(intensityOf(b));
}

/** One effect now, unless the same one played too recently. */
export function play(name: Sfx): void {
  cue(name, 1, 1, 0);
}

/** One cue through the mixer: held back if too soon or the mix is full, else made `delay` ms from now. */
function cue(name: Cue, speed: number, gain: number, delay: number): void {
  if (!ctx || ctx.state !== 'running' || muted) return;
  const v = mixer.request(name, performance.now() + delay, speed, gain);
  if (!v) return;
  // (a test page can set `window.__sfxLog = []` to see which sounds played)
  (window as unknown as { __sfxLog?: string[] }).__sfxLog?.push(name);
  pitch = v.pitch;
  voiceGain = v.gain;
  SOUNDS[name](ctx.currentTime + 0.01 + delay / 1000);
  pitch = 1;
  voiceGain = 1;
}

/** The music's tempo and level follow the fight's tension: up to 8% quicker and a third louder as a side thins out. */
function setTension(t: number): void {
  tension = t;
  if (!ctx || !current || current === 'town') return;
  const p = players.get(current);
  if (!p) return;
  p.el.playbackRate = 1 + 0.08 * t;
  p.gain.gain.setTargetAtTime(MUSIC_LEVEL * musicLevel() * (1 + 0.33 * t), ctx.currentTime, 0.6);
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
  next.gain.gain.setTargetAtTime(MUSIC_LEVEL * musicLevel() * (track === 'town' ? 1 : 1 + 0.33 * tension), t, FADE_S / 3);
  next.el.playbackRate = track === 'town' ? 1 : 1 + 0.08 * tension;
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
  o.frequency.setValueAtTime(f * pitch, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to * pitch, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v * voiceGain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + d + 0.05);
}

/** A burst of filtered noise for `d` seconds, its filter at `f` (sweeping to `to` if given). */
function hiss(t: number, d: number, f: number, type: BiquadFilterType, v: number, to?: number, q = 1.5): void {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = pitch;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f * pitch, t);
  if (to) filter.frequency.exponentialRampToValueAtTime(to * pitch, t + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v * voiceGain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + d + 0.02);
}

/** A bell-like ring: a tone and its overtones, ringing out. */
function ring(t: number, f: number, d: number, v: number): void {
  note(t, f, d, v, 'sine');
  note(t, f * 2.76, d * 0.5, v * 0.35, 'sine');
}

/** A tick of noise (a click, a crack of a bone). */
const click = (t: number, v: number, f = 3000) => hiss(t, 0.02, f, 'highpass', v);

/** `n` short clicks scattered over `d` seconds (crackling, clattering, rustling). */
function scatter(t: number, d: number, n: number, v: number, f: number, type: BiquadFilterType = 'highpass'): void {
  for (let i = 0; i < n; i++) hiss(t + Math.random() * d, 0.03 + Math.random() * 0.03, f * (0.6 + Math.random() * 0.8), type, v * (0.5 + Math.random() * 0.5));
}

const SOUNDS: Record<Cue, (t: number) => void> = {
  // the page's own
  tap: (t) => note(t, 1400, 0.03, 0.07, 'sine'),
  summon: (t) => {
    note(t, 880, 0.5, 0.14, 'sine');
    note(t + 0.06, 1320, 0.45, 0.08, 'sine');
  },
  merge: (t) => {
    [523, 659, 784].forEach((f, i) => note(t + i * 0.12, f, 0.2, 0.14));
    note(t + 0.36, 1047, 0.6, 0.16);
  },
  // (a recycled hero's gold: two bright coin pings)
  coin: (t) => {
    note(t, 1568, 0.08, 0.12, 'triangle');
    note(t + 0.07, 2093, 0.3, 0.12, 'triangle');
  },
  star: (t) => {
    note(t, 988, 0.12, 0.14, 'triangle');
    note(t + 0.07, 1319, 0.2, 0.14, 'triangle');
  },
  levelUp: (t) => [659, 784, 988, 1319].forEach((f, i) => note(t + i * 0.09, f, i < 3 ? 0.14 : 0.5, 0.15, 'triangle')),
  boom: (t) => {
    note(t, 70, 0.9, 0.45, 'sine', 30);
    hiss(t, 0.5, 200, 'lowpass', 0.3);
  },
  // (a trumpet-ish fanfare, then a held chord; and a sinking line with a low drone)
  victory: (t) => {
    [523, 659, 784].forEach((f, i) => note(t + i * 0.14, f, 0.2, 0.16, 'sawtooth'));
    [523, 659, 784, 1047].forEach((f) => note(t + 0.45, f, 1.3, 0.1, 'triangle'));
    ring(t + 0.45, 2093, 1.2, 0.05);
    hiss(t + 0.45, 0.8, 6000, 'highpass', 0.05);
  },
  defeat: (t) => {
    [392, 349, 330].forEach((f, i) => note(t + i * 0.32, f, 0.34, 0.16, 'triangle'));
    note(t + 0.96, 262, 1.4, 0.16, 'triangle');
    note(t + 0.96, 65, 1.6, 0.22, 'sine');
  },
  skill: (t) => [523, 659, 784].forEach((f, i) => note(t + i * 0.08, f, 0.16, 0.13)),
  spell: (t) => {
    note(t, 660, 0.3, 0.13, 'sine', 990);
    note(t + 0.1, 1320, 0.25, 0.06, 'sine');
  },

  // blows: the swing
  swingLight: (t) => hiss(t, 0.09, 3000, 'bandpass', 0.1, 6500),
  swingSword: (t) => hiss(t, 0.14, 1200, 'bandpass', 0.14, 4200),
  swingHeavy: (t) => {
    hiss(t, 0.28, 300, 'bandpass', 0.2, 1200);
    note(t, 95, 0.2, 0.12, 'sine', 60);
  },
  swingSpear: (t) => {
    hiss(t, 0.08, 2000, 'highpass', 0.1);
    note(t, 900, 0.07, 0.04, 'sine', 1500);
  },
  swingFist: (t) => hiss(t, 0.06, 1800, 'bandpass', 0.09, 900),
  // and what it lands as
  hitLight: (t) => {
    hiss(t, 0.04, 3500, 'highpass', 0.2);
    note(t, 700, 0.08, 0.1, 'triangle', 400);
  },
  hitSword: (t) => {
    hiss(t, 0.05, 2500, 'highpass', 0.22);
    ring(t, 1700, 0.12, 0.05);
    note(t, 320, 0.1, 0.14, 'triangle', 200);
  },
  hitHeavy: (t) => {
    note(t, 120, 0.25, 0.34, 'sine', 45);
    hiss(t, 0.18, 700, 'lowpass', 0.25);
    click(t, 0.18, 1500);
  },
  hitBone: (t) => {
    note(t, 820, 0.04, 0.1, 'square', 500);
    note(t + 0.035, 560, 0.05, 0.08, 'square', 380);
    hiss(t, 0.06, 2800, 'highpass', 0.14);
  },
  hitFist: (t) => {
    note(t, 160, 0.14, 0.3, 'sine', 70);
    hiss(t, 0.08, 900, 'lowpass', 0.2);
  },
  hitSpear: (t) => {
    hiss(t, 0.06, 3000, 'highpass', 0.2);
    note(t, 420, 0.1, 0.13, 'triangle', 190);
  },
  // a crit lands heavier: a low boom under the hit and a bright ring over it
  crit: (t) => {
    note(t, 80, 0.4, 0.34, 'sine', 32);
    ring(t, 2300, 0.28, 0.07);
    hiss(t, 0.14, 4500, 'highpass', 0.16);
  },
  // a shield taking a blow: a clang
  block: (t) => {
    ring(t, 1250, 0.3, 0.12);
    ring(t, 1880, 0.2, 0.06);
    hiss(t, 0.05, 3500, 'highpass', 0.2);
    note(t, 240, 0.08, 0.14, 'triangle', 160);
  },
  // a blow that missed: a soft whiff
  miss: (t) => hiss(t, 0.13, 1500, 'bandpass', 0.07, 600),

  // shots
  bow: (t) => {
    note(t, 330, 0.14, 0.16, 'triangle', 150);
    note(t, 660, 0.06, 0.05, 'sine', 300);
    click(t, 0.1, 2000);
  },
  arrowFly: (t) => hiss(t, 0.2, 2600, 'bandpass', 0.1, 900),
  arrowHit: (t) => {
    note(t, 210, 0.07, 0.17, 'sine', 90);
    click(t, 0.12, 2200);
  },
  gun: (t) => {
    hiss(t, 0.14, 3200, 'lowpass', 0.38, 400);
    note(t, 150, 0.16, 0.32, 'sine', 40);
    click(t, 0.25, 1200);
  },
  // the spent shell tinkling on the ground
  shell: (t) => {
    ring(t, 4200, 0.12, 0.05);
    ring(t + 0.07, 3300, 0.1, 0.035);
  },
  bulletHit: (t) => {
    ring(t, 3100, 0.12, 0.05);
    click(t, 0.15, 2500);
  },
  // a bone spun at the foe: a whirring swish
  throwBone: (t) => {
    hiss(t, 0.2, 900, 'bandpass', 0.11, 2600);
    note(t, 500, 0.18, 0.04, 'square', 800);
  },
  boneClatter: (t) => {
    for (let i = 0; i < 4; i++) {
      const at = t + i * 0.045 + Math.random() * 0.02;
      note(at, 700 + Math.random() * 500, 0.035, 0.08, 'square', 400);
      click(at, 0.1, 2500);
    }
  },

  // the elements
  fireWhoosh: (t) => {
    hiss(t, 0.38, 350, 'bandpass', 0.22, 1300);
    scatter(t + 0.05, 0.25, 4, 0.06, 2500);
  },
  fireBoom: (t) => {
    note(t, 95, 0.5, 0.4, 'sine', 32);
    hiss(t, 0.45, 1000, 'lowpass', 0.3, 180);
    click(t, 0.2, 1200);
  },
  frostCrack: (t) => {
    click(t, 0.2, 4000);
    note(t, 2300, 0.09, 0.1, 'sine', 700);
    hiss(t, 0.12, 5000, 'highpass', 0.1);
  },
  frostShatter: (t) => {
    for (let i = 0; i < 5; i++) ring(t + i * 0.025 + Math.random() * 0.02, 2800 + Math.random() * 2600, 0.12, 0.045);
    hiss(t, 0.2, 6000, 'highpass', 0.14);
  },
  crackle: (t) => {
    scatter(t, 0.25, 9, 0.17, 3500);
    note(t, 140, 0.2, 0.07, 'sawtooth', 90);
  },
  thunder: (t) => {
    hiss(t, 0.9, 450, 'lowpass', 0.3, 70);
    note(t, 58, 0.8, 0.3, 'sine', 32);
    hiss(t + 0.25, 0.5, 300, 'lowpass', 0.14, 60);
  },
  holyChime: (t) => {
    ring(t, 1319, 0.7, 0.07);
    ring(t + 0.09, 1760, 0.7, 0.06);
    ring(t + 0.18, 2349, 0.8, 0.05);
  },
  // a low shadowy hum, two voices slightly apart so it beats
  shadowHum: (t) => {
    note(t, 98, 0.65, 0.12, 'sawtooth', 87);
    note(t, 103, 0.65, 0.09, 'sawtooth', 90);
    hiss(t, 0.5, 300, 'lowpass', 0.07);
  },
  poisonHiss: (t) => {
    hiss(t, 0.4, 4500, 'highpass', 0.12, 2200);
    for (let i = 0; i < 3; i++) note(t + 0.05 + i * 0.09, 280 + i * 70, 0.07, 0.05, 'sine', 560 + i * 70);
  },
  rustle: (t) => scatter(t, 0.3, 6, 0.1, 3200, 'bandpass'),
  windGust: (t) => hiss(t, 0.45, 500, 'bandpass', 0.16, 2400),
  earthRumble: (t) => {
    note(t, 52, 0.7, 0.3, 'sine', 30);
    hiss(t, 0.6, 260, 'lowpass', 0.25, 90);
    scatter(t + 0.1, 0.4, 4, 0.08, 700, 'lowpass');
  },
  // the meteor falling: a whistle that drops in pitch, with a rising rush under it
  meteorFall: (t) => {
    note(t, 1900, 0.85, 0.07, 'sine', 260);
    hiss(t, 0.85, 400, 'bandpass', 0.1, 1800);
  },
  arrowRain: (t) => {
    hiss(t, 0.5, 3000, 'bandpass', 0.1, 1400);
    scatter(t + 0.1, 0.5, 4, 0.08, 2600, 'bandpass');
  },

  // help
  heal: (t) => [1047, 1319, 1568, 2093].forEach((f, i) => ring(t + i * 0.05, f, 0.35, 0.04)),
  shieldHum: (t) => {
    note(t, 220, 0.55, 0.1, 'sine', 247);
    note(t + 0.04, 330, 0.5, 0.07, 'sine', 370);
  },
  horn: (t) => {
    note(t, 330, 0.5, 0.1, 'sawtooth', 349);
    note(t, 495, 0.5, 0.06, 'sawtooth', 523);
    hiss(t, 0.3, 1200, 'lowpass', 0.04);
  },
  pipes: (t) => [784, 988, 880, 1175].forEach((f, i) => note(t + i * 0.11, f, 0.18, 0.07, 'triangle')),

  // moves
  dash: (t) => hiss(t, 0.22, 800, 'bandpass', 0.14, 3200),
  blink: (t) => {
    note(t, 1500, 0.09, 0.08, 'sine', 380);
    ring(t + 0.06, 1900, 0.2, 0.05);
  },
  trap: (t) => {
    note(t, 520, 0.05, 0.14, 'square', 300);
    ring(t, 1500, 0.2, 0.06);
    click(t, 0.18, 2000);
  },

  // a big sting for an ultimate: a deep hit, a rising chord, a rush and a cymbal wash
  ultimate: (t) => {
    note(t, 60, 1, 0.42, 'sine', 30);
    [220, 277, 330].forEach((f) => note(t, f, 0.9, 0.09, 'sawtooth', f * 1.5));
    hiss(t, 0.7, 200, 'bandpass', 0.2, 3500);
    hiss(t + 0.35, 0.9, 6500, 'highpass', 0.12);
    ring(t + 0.35, 1760, 0.9, 0.06);
  },
  // a boss's skill: a low growl and rumble
  bossSkill: (t) => {
    note(t, 72, 0.8, 0.22, 'sawtooth', 48);
    note(t, 76, 0.8, 0.16, 'square', 50);
    hiss(t, 0.7, 250, 'lowpass', 0.22, 80);
  },

  // deaths, each in its own voice
  deathBones: (t) => {
    for (let i = 0; i < 7; i++) {
      const at = t + i * 0.05 + Math.random() * 0.03;
      note(at, 600 + Math.random() * 700, 0.04, 0.075, 'square', 350);
      click(at, 0.09, 2200);
    }
    hiss(t, 0.3, 800, 'lowpass', 0.05);
  },
  // a demon burning away: a roar that cracks as it dies
  deathBurn: (t) => {
    note(t, 130, 0.7, 0.18, 'sawtooth', 55);
    hiss(t, 0.8, 900, 'bandpass', 0.2, 250, 2.5);
    scatter(t + 0.1, 0.6, 8, 0.09, 2500);
  },
  // an ogre falling: a heavy thud, then the ground settling
  deathThud: (t) => {
    note(t, 78, 0.5, 0.45, 'sine', 28);
    hiss(t, 0.35, 350, 'lowpass', 0.3, 100);
    note(t + 0.17, 62, 0.35, 0.22, 'sine', 30);
    scatter(t + 0.12, 0.3, 4, 0.06, 600, 'lowpass');
  },
  deathStone: (t) => {
    hiss(t, 0.5, 900, 'lowpass', 0.22, 200);
    scatter(t, 0.45, 7, 0.14, 1400, 'bandpass');
    note(t, 100, 0.3, 0.16, 'sine', 45);
  },
  deathBlood: (t) => {
    note(t, 220, 0.45, 0.14, 'triangle', 60);
    hiss(t, 0.28, 600, 'lowpass', 0.12);
  },
  // a hero falling: a soft sinking chime
  deathLight: (t) => {
    ring(t, 880, 0.5, 0.07);
    ring(t + 0.12, 660, 0.6, 0.06);
    note(t, 220, 0.5, 0.07, 'triangle', 110);
  },
};
