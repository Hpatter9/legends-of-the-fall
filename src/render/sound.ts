// The page's sound: the public face of the audio engine. The parts are audiorective processors (`audioProcessors.ts`: the
// cue synth, the music player and the bus mixer), created together by `createEngine` on the first tap; the rules they
// follow (pan, ducking, the tension and act colours) are in `audioRules.ts`. Nothing in the sim knows about any of this:
// the page calls `playEvents` on each tick's events, `startFight` when a fight begins, and `play` for the rest.
//
// Phones block sound until a tap, so `setup` starts the audio on the first pointer-down, and every later call is
// safe before that (it does nothing). The mute button's choice is remembered in localStorage (legends.sound); the
// volumes come from the settings page (`settings.ts`).
//
// Buses: music, sfx, ui and ambience, meeting at a master with a limiter (see `BusMixer`). Ambience beds and new cues
// for later screens are added through `play`, `setAct` and `duck` here; `docs/notes/audio-engine.md` says how.

import { createEngine } from '@audiorective/core';
import type { Battle, BattleEvent } from '../sim/battle';
import { onSettings, settings } from '../settings';
import { BusMixer, CueSynth, MusicPlayer, type BusName } from './audioProcessors';
import { DuckCounter, panOfEvent, type Track } from './audioRules';
import { Mixer, cuesFor, intensityOf, type Cue } from './soundRules';

const MUSIC_LEVEL = 0.22;
const SFX_LEVEL = 0.5;
const SAVE_KEY = 'legends.sound';

export type Sfx = Cue;

/** The cues that are the page's own taps and chimes: they go to the ui bus. */
const UI_CUES = new Set<Cue>(['tap', 'summon', 'merge', 'coin', 'star', 'levelUp']);
/** The summoning show's sounds go to their own bus, so a tap that skips the show can hush them. */
const SHOW_CUES = new Set<Cue>(['riseEpic', 'riseLegend', 'riseMythic', 'stingEpic', 'stingLegend', 'stingMythic', 'heartbeat', 'slam']);

const busOf = (name: Cue): BusName => (SHOW_CUES.has(name) ? 'show' : UI_CUES.has(name) ? 'ui' : 'sfx');

interface Parts {
  mixer: BusMixer;
  synth: CueSynth;
  music: MusicPlayer;
}

let engine: (Parts & { core: { context: AudioContext; start(): Promise<void> } }) | null = null;
const mixer = new Mixer();
/** How hot the fight is, 0 to 1: the battle music opens, quickens and swells with it. */
let tensionTick = 0;
let muted = readMuted();
/** What is holding the music down (menus, cards, the summoning show), by reason. */
const ducks = new DuckCounter();
/** The track and act asked for before the audio was unlocked. */
let wantAct: number | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) === 'off';
  } catch {
    return false;
  }
}

/** Starts the audio (the first call) and the town's music. Safe to call again. */
function unlock(): void {
  if (!engine) {
    engine = createEngine((ctx) => {
      const mixer = new BusMixer(ctx);
      const synth = new CueSynth(ctx, (n) => mixer.bus(n));
      const music = new MusicPlayer(ctx);
      music.output.connect(mixer.bus('music'));
      return { mixer, synth, music };
    });
    engine.mixer.params.master.value = muted ? 0 : 1;
    applyLevels();
    if (ducks.ducked) engine.mixer.setDuck(true);
    engine.music.setAct(wantAct);
  }
  if (engine.core.context.state !== 'running') void engine.core.start();
  if (!engine.music.current) setMusic('town');
}

/** Starts the audio on the first tap, and makes every button press a tap sound. Call once, from the page's start. */
export function setup(): void {
  onSettings(applyLevels);
  window.addEventListener('pointerdown', unlock, true);
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest?.('button')) play('tap');
  });
  // (the game hidden, closed or switched away from: every sound stops, and comes back when the game is seen again)
  document.addEventListener('visibilitychange', () => (document.hidden ? hush() : wake()));
  window.addEventListener('pagehide', hush);
  window.addEventListener('pageshow', () => !document.hidden && wake());
  // (for the tests and the owner: `window.__audioDebug()` says what the engine is doing)
  const w = window as unknown as { __audioDebug?: () => unknown; __audioApi?: unknown };
  w.__audioDebug = debugState;
  w.__audioApi = { setAct, setMusic, setTension, duck };
}

/** Stop all sound while the game is out of sight: the music's element pauses and the effects' clock is suspended. */
function hush(): void {
  if (!engine) return;
  engine.music.hush();
  void engine.core.context.suspend();
}

/** The game is back in sight: the clock runs again and the track that was playing carries on. */
function wake(): void {
  if (!engine) return;
  void engine.core.context.resume();
  engine.music.wake();
}

/** The volumes from the settings page (0 to 1 each, on top of the levels above). */
const effectsLevel = () => settings().effects / 100;
const musicLevel = () => settings().music / 100;

/** The settings page changed a volume: the buses follow. Ambience goes with the music setting, ui and the show with effects. */
function applyLevels(): void {
  if (!engine) return;
  const m = engine.mixer;
  m.setLevel('sfx', SFX_LEVEL * effectsLevel());
  m.setLevel('ui', SFX_LEVEL * effectsLevel());
  m.setLevel('music', MUSIC_LEVEL * musicLevel());
  m.setLevel('ambience', MUSIC_LEVEL * musicLevel());
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
    engine?.mixer.setLevel('master', muted ? 0 : 1);
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
 *  the fight ends. Each is panned by where on the board it happens. Call after stepping the battle `b`. */
export function playEvents(b: Battle, events: BattleEvent[], speed = 1): void {
  for (const e of events) {
    const cues = cuesFor(b, e);
    if (cues.length) {
      const pan = panOfEvent(b, e);
      for (const q of cues) cue(q.cue, speed, q.gain ?? 1, q.delay ?? 0, pan);
    }
    if (e.kind === 'end') {
      setTension(0);
      setMusic('town');
    }
  }
  // (the music's pace follows how thin the sides have got, checked about twice a second)
  if (b.phase === 'fight' && ++tensionTick % 5 === 0) setTension(intensityOf(b));
}

/** A tap skipped the summoning show: whatever of its sound is still ringing fades out at once. */
export function hushSummon(): void {
  if (!engine) return;
  const p = engine.mixer.params.show;
  const t = engine.core.context.currentTime;
  p.cancelScheduledValues(t);
  p.setTargetAtTime(0, t, 0.04);
  p.setTargetAtTime(1, t + 0.4, 0.02);
}

/** One effect now, unless the same one played too recently. */
export function play(name: Sfx): void {
  cue(name, 1, 1, 0, 0);
}

/** One cue through the mixer: held back if too soon or the mix is full, else made `delay` ms from now. */
function cue(name: Cue, speed: number, gain: number, delay: number, pan: number): void {
  if (!engine || engine.core.context.state !== 'running' || muted) return;
  const v = mixer.request(name, performance.now() + delay, speed, gain);
  if (!v) return;
  // (a test page can set `window.__sfxLog = []` to see which sounds played)
  (window as unknown as { __sfxLog?: string[] }).__sfxLog?.push(name);
  engine.synth.play(name, engine.core.context.currentTime + 0.01 + delay / 1000, { gain: v.gain, pitch: v.pitch, bus: busOf(name), pan });
}

/** The fight's tension (0 to 1): the battle music opens, quickens and swells with it, and a percussion layer joins when it runs hot. */
export function setTension(t: number): void {
  engine?.music.setTension(t);
}

/** Crossfades to a track: the town's, the battle's or the boss's. */
export function setMusic(track: Track): void {
  engine?.music.setTrack(track);
}

/** The tower act the music takes its colour from (a filter, a pace and a drone), or null outside the tower. */
export function setAct(act: number | null): void {
  wantAct = act;
  engine?.music.setAct(act);
}

/** Holds the music (and later the ambience) down, about -8 dB with a low-pass, or lets it up again. Counted by reason: the
 *  music comes back when every reason has been let go, and a reason raised twice needs two lets. */
export function duck(on: boolean, reason: string): void {
  const was = ducks.ducked;
  const now = ducks.set(reason, on);
  if (now !== was) engine?.mixer.setDuck(now);
}

/** Ducks while `el` is showing (not `hidden`), for `reason`: a screen's root element is enough. Checks it now and on every change. */
export function bindDuck(el: HTMLElement, reason: string): void {
  let on = false;
  const sync = () => {
    if (on === !el.hidden) return;
    on = !el.hidden;
    duck(on, reason);
  };
  sync();
  new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['hidden'] });
}

/** What the engine is doing, for the tests and the owner. */
function debugState(): unknown {
  if (!engine) return { started: false };
  const ctx = engine.core.context;
  const { music, mixer: m } = engine;
  return {
    started: true,
    state: ctx.state,
    muted,
    track: music.current,
    tension: music.tension,
    act: music.act,
    ducked: ducks.reasons,
    limiter: m.limited,
    master: m.params.master.read(),
    buses: { music: m.params.music.read(), sfx: m.params.sfx.read(), ui: m.params.ui.read(), ambience: m.params.ambience.read() },
    duckGain: m.params.duck.read(),
  };
}
