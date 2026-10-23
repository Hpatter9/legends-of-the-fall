// The page's sound: the public face of the audio engine. The parts are audiorective processors (`audioProcessors.ts`: the
// cue synth, the music player and the bus mixer), created together by `createEngine` on the first tap; the rules they
// follow (pan, ducking, the tension and act colours) are in `audioRules.ts`. Nothing in the sim knows about any of this:
// the page calls `playEvents` on each tick's events, `startFight` when a fight begins, and `play` for the rest.
//
// Phones block sound until a tap, so `setup` starts the audio on the first pointer-down, and every later call is
// safe before that (it does nothing). The mute button's choice is remembered in localStorage (legends.sound); the
// volumes come from the settings page (`settings.ts`).
//
// Buses: music, sfx, ui and ambience, meeting at a master with a limiter (see `BusMixer`). The ambience beds (`audioBeds.ts`)
// follow `setScene`; new cues are added through `play`; `docs/notes/audio-engine.md` and `audio-beds.md` say how.

import { createEngine } from '@audiorective/core';
import type { Battle, BattleEvent } from '../sim/battle';
import { onSettings, settings } from '../settings';
import { BusMixer, CueSynth, MusicPlayer, type BusName } from './audioProcessors';
import { AmbientBeds } from './audioBeds';
import { DuckCounter, panOfEvent, type PlannedCue, type Scene, type Track } from './audioRules';
import { bakeTrack } from './musicBake';
import { Mixer, cuesFor, intensityOf, type Cue } from './soundRules';

const MUSIC_LEVEL = 0.22;
const SFX_LEVEL = 0.5;
const SAVE_KEY = 'legends.sound';

export type Sfx = Cue;

/** The cues that are the page's own taps and chimes: they go to the ui bus. */
const UI_CUES = new Set<Cue>([
  'tap', 'summon', 'merge', 'coin', 'star', 'levelUp', 'coinRecycle', 'coinClaim', 'sparkle', 'autoStart', 'autoStop', 'autoDone', 'setChime2', 'setChime3',
]);
/** The summoning show's sounds go to their own bus, so a tap that skips the show can hush them. */
const SHOW_CUES = new Set<Cue>(['riseSummon', 'stingSummon', 'slam']);

const busOf = (name: Cue): BusName => (SHOW_CUES.has(name) ? 'show' : UI_CUES.has(name) ? 'ui' : 'sfx');

interface Parts {
  mixer: BusMixer;
  synth: CueSynth;
  music: MusicPlayer;
  beds: AmbientBeds;
}

let engine: (Parts & { core: { context: AudioContext; start(): Promise<void> } }) | null = null;
const mixer = new Mixer();
/** How hot the fight is, 0 to 1: the battle music opens, quickens and swells with it. */
let tensionTick = 0;
let muted = readMuted();
/** What is holding the music down (menus, cards, the summoning show), by reason. */
const ducks = new DuckCounter();
/** The act and scene asked for before the audio was unlocked. */
let wantAct: number | null = null;
let wantScene: Scene | null = null;

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
      const beds = new AmbientBeds(ctx);
      beds.output.connect(mixer.bus('ambience'));
      return { mixer, synth, music, beds };
    });
    engine.mixer.params.master.value = muted ? 0 : 1;
    applyLevels();
    if (ducks.ducked) engine.mixer.setDuck(true);
    engine.music.setEnabled(musicLevel() > 0);
    engine.music.setAct(wantAct);
    engine.beds.setScene(wantScene);
  }
  if (engine.core.context.state !== 'running') void engine.core.start();
  if (!engine.music.current) {
    setMusic('town');
    // (the fight's track is baked while the town's plays, so a fight's music starts at once)
    setTimeout(() => engine?.music.warm('battle'), 4000);
  }
}

/** Starts the audio on the first tap, and makes every button press a tap sound. Call once, from the page's start. */
export function setup(): void {
  mixWithOtherApps();
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
  w.__audioApi = { setAct, setMusic, setTension, duck, setScene, probe, bake: bakeTrack, renderCue };
}

/** Lets the game's sound mix with whatever else the phone is playing (a music app), and never take the audio focus: the
 *  page's audio session is "ambient" where the browser has the Audio Session API (Safari). Nothing in the game is a media
 *  element (the music is baked into buffers, `musicBake.ts`) and the page registers no media session, which are what make
 *  a browser claim focus and stop other apps. */
function mixWithOtherApps(): void {
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'ambient';
  } catch {
    /* (not supported here: the page's sound is Web Audio only, which already mixes) */
  }
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
  // (Music at Off: no track is baked or playing at all, the effects carry on)
  engine.music.setEnabled(musicLevel() > 0);
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

/** Several cues at once, each with its own level and delay (a twist's reveal, a mixed one, is two). */
export function playAll(cues: PlannedCue[]): void {
  for (const q of cues) cue(q.cue, 1, q.gain ?? 1, q.delay ?? 0, 0);
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

/** The place the player is in, for the ambience bed under the music (null for none): it crossfades over about 1.5 s, and
 *  the same bed again changes nothing. See `sceneOf` in `audioRules.ts` for what each screen asks for. */
export function setScene(scene: Scene | null): void {
  wantScene = scene;
  engine?.beds.setScene(scene);
}

/** Holds the music and the ambience down, about -8 dB with a low-pass, or lets it up again. Counted by reason: the
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
    scene: engine.beds.scene,
    bed: engine.beds.bed,
    beds: engine.beds.live,
    ducked: ducks.reasons,
    limiter: m.limited,
    master: m.params.master.read(),
    buses: { music: m.params.music.read(), sfx: m.params.sfx.read(), ui: m.params.ui.read(), ambience: m.params.ambience.read() },
    duckGain: m.params.duck.read(),
  };
}

/** For the owner and the tests: renders one cue offline (two and a half seconds, stereo) so it can be saved as a WAV and heard
 *  without a battle. Nothing in the game calls it. */
async function renderCue(name: Cue): Promise<AudioBuffer> {
  const rate = 44100;
  const oc = new OfflineAudioContext(2, Math.round(rate * 2.5), rate);
  const bus = new GainNode(oc, { gain: 0.5 });
  bus.connect(oc.destination);
  new CueSynth(oc, () => bus).play(name, 0.05, { gain: 1, pitch: 1, bus: 'sfx' });
  return oc.startRendering();
}

/** For the owner and the tests: the RMS level (0 to 1) now at the music and ambience buses, before the ducker, to check a bed
 *  sits under the music. Taps are made on the first call and left in place (an analyser costs next to nothing). */
const taps = new Map<'music' | 'ambience', AnalyserNode>();
function probe(): Record<string, number> {
  const out: Record<string, number> = {};
  if (!engine) return out;
  for (const name of ['music', 'ambience'] as const) {
    let a = taps.get(name);
    if (!a) {
      a = new AnalyserNode(engine.core.context, { fftSize: 2048 });
      engine.mixer.bus(name).connect(a);
      taps.set(name, a);
    }
    const d = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(d);
    out[name] = Math.sqrt(d.reduce((n, x) => n + x * x, 0) / d.length);
  }
  return out;
}
