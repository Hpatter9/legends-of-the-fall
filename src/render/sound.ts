// The page's sound: the public face of the audio engine. The parts are audiorective processors (`audioProcessors.ts`: the
// cue synth, the music player and the bus mixer), created together by `createEngine` on the first tap; the rules they
// follow (pan, ducking, the act colours) are in `audioRules.ts`, and the battle music's (one track a battle, victory music
// at a won battle's end) in `battleMusic.ts`. Nothing in the sim knows about any of this: the page calls `playEvents` on each
// tick's events, `startFight` when a fight begins, `endWave` as one ends, `endVictory` as its results are left, and `play` for the rest.
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
import { BusMixer, CueSynth, MusicPlayer } from './audioProcessors';
import { AmbientBeds } from './audioBeds';
import { DuckCounter, panOfEvent, type PlannedCue, type Scene } from './audioRules';
import { TRACK_OF_PLACE, placeOf, type MapKind, type MusicId, type StingId } from './epicMusic';
import { BOSS_TRACK, atPlace, crossfadeOf, endAt, musicOf, type BattleEnd, type MusicState } from './battleMusic';
import { bakeTrack } from './musicBake';
import { SCENE_TRACKS, type Track } from './musicScore';
import { Mixer, cuesFor, type Cue } from './soundRules';
import { SpellBank } from './spellBank';
import { coveredBySpells, spellParts } from './spellSfx';
import { AMBIENCE_LEVEL, MUSIC_LEVEL, SFX_LEVEL, UI_LEVEL, busOf } from './audioMix';

const SAVE_KEY = 'legends.sound';

export type Sfx = Cue;

interface Parts {
  mixer: BusMixer;
  synth: CueSynth;
  music: MusicPlayer;
  beds: AmbientBeds;
}

let engine: (Parts & { core: { context: AudioContext; start(): Promise<void> } }) | null = null;
const mixer = new Mixer();
let muted = readMuted();
/** What is holding the music down (menus, cards, the summoning show), by reason. */
const ducks = new DuckCounter();
/** The act and scene asked for before the audio was unlocked. */
let wantAct: number | null = null;
let wantScene: Scene | null = null;
/** Where the player is, as the music hears it (`placeOf`), the battle on (its one track), whether a fight is being fought and
 *  whether a won battle's victory music is up (`battleMusic.ts`); and whether a cinematic's own score is playing. */
let music: MusicState = { place: 'camp', battle: null, fighting: false, victory: false };
let sceneMusic = false;

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
  warmSpells();
  if (!engine.music.current) {
    syncMusic();
    // (the fight's track is decoded while the camp's plays, so a fight's music starts at once)
    setTimeout(() => engine?.music.warm('battle'), 1000);
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
  w.__audioApi = { setAct, setMusic, playSting, duck, setScene, playScene, endScene, probe, bake: bakeTrack, renderCue };
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
  m.setLevel('ui', UI_LEVEL * effectsLevel());
  m.setLevel('music', MUSIC_LEVEL * musicLevel());
  m.setLevel('ambience', AMBIENCE_LEVEL * musicLevel());
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

/** Puts the music on the track the place, the battle or its victory wants (unless a cinematic's own score is playing). */
function syncMusic(): void {
  if (sceneMusic) return;
  const want = musicOf(music, (p) => TRACK_OF_PLACE[p]);
  // (the boss track comes in quickly and gives the battle track back gently: `crossfadeOf`)
  if (engine) engine.music.setTrack(want.track, want.level, crossfadeOf(engine.music.current, want.track));
}

/** A fight has begun, with its track (`trackOfRun` or `standTrack` in `battleMusic.ts`): the battle track, which every wave
 *  passes again, so the music plays on unbroken from wave to wave; or the boss track for a boss's fight, which crossfades in
 *  over the battle track. A victory's music still up (an auto-replay going straight on) gives way. */
export function startFight(track: MusicId): void {
  mixer.reset();
  const was = music.battle;
  music = { ...music, battle: track, fighting: true, victory: false };
  if (was !== track) engine?.music.stopSting();
  syncMusic();
  // (the fanfare and the boss track are decoded while the battle plays, so either comes in the moment it is wanted)
  engine?.music.warmSting('victory');
  if (track !== BOSS_TRACK) engine?.music.warm(BOSS_TRACK);
}

/** A battle is left without an end (the Last Stand is left mid-wave): the place's music comes back. */
export function endFight(): void {
  music = { ...music, battle: null, fighting: false, victory: false };
  syncMusic();
}

/** A fight has ended and `end` (`endOfFight`) says what the music does: a won battle's victory fanfare, leading into the
 *  triumph loop under the results; a lost one's defeat sting, the place's music after it; a wave won with more to come, the
 *  battle track playing on (back from the boss track after a boss's wave); or nothing (a fall a heart revives). */
export function endWave(end: BattleEnd): void {
  if (end === 'none') return;
  // (a fight that ended behind the home screen rings nothing there: `endAt`)
  const next = endAt(music, end);
  music = next.state;
  if (next.sting) engine?.music.sting(next.sting);
  syncMusic();
}

/** The results of a won battle are left: the fanfare, if still ringing, fades, and the place's music comes back. */
export function endVictory(): void {
  if (!music.victory) return;
  music = { ...music, victory: false };
  engine?.music.stopSting(false);
  syncMusic();
}

/** Sounds for one tick's battle events (`speed` is the fight's: quieter at ×2). Each is panned by where on the board it happens. Call after stepping the battle `b`. */
export function playEvents(b: Battle, events: BattleEvent[], speed = 1): void {
  // (a king's spell plays its own rendered cast and effect once they are decoded, and the plain cues they stand in for are
  // left out: `spellSfx.ts`)
  const covered = spellBank?.ready ? coveredBySpells(events) : null;
  for (const e of events) {
    if (covered && e.kind === 'spell') playSpell(b, e, events, speed);
    if (covered && (e.kind === 'spell' || covered.has(e))) continue;
    const cues = cuesFor(b, e);
    if (cues.length) {
      const pan = panOfEvent(b, e);
      for (const q of cues) cue(q.cue, speed, q.gain ?? 1, q.delay ?? 0, pan);
    }
    // (the fight is over; the battle's music plays on until the page says how it ended: `endWave`)
    if (e.kind === 'end') music = { ...music, fighting: false };
  }
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

/** The king's spells' rendered sounds: loaded on the first tap (a few hundred KB, decoded once). */
let spellBank: SpellBank | null = null;
function warmSpells(): void {
  if (spellBank || !engine) return;
  spellBank = new SpellBank(engine.core.context, engine.mixer.bus('sfx'));
  void spellBank.load();
}

/** A king's spell's own sounds (`spellParts`): each takes its place in the mix (always heard: the player's big moment), is timed
 *  to the spell's look at the fight's speed, panned to where it lands, and falls back to its synthesised cues if its file is
 *  missing. Not hushed at ×2, as a hero's blows are. */
function playSpell(b: Battle, e: Extract<BattleEvent, { kind: 'spell' }>, events: BattleEvent[], speed: number): void {
  if (!engine || !spellBank || engine.core.context.state !== 'running' || muted) return;
  const pace = Math.max(1, speed);
  for (const p of spellParts(b, e, events)) {
    const delay = p.delay / pace;
    if (!spellBank.has(p.file)) {
      for (const q of p.fallback) cue(q.cue, speed, q.gain ?? 1, delay + (q.delay ?? 0) / pace, p.pan);
      continue;
    }
    const v = mixer.request(p.role === 'cast' ? 'kingCast' : 'kingSpell', performance.now() + delay, 1, p.gain);
    if (!v) continue;
    (window as unknown as { __sfxLog?: string[] }).__sfxLog?.push(`sfx:${p.file}`);
    // (a touch of the mix's random pitch, so a shower's five falls or a chain's leaps are not all alike)
    spellBank.play(p.file, engine.core.context.currentTime + 0.01 + delay / 1000, v.gain, p.pan, 1 + (v.pitch - 1) * 0.4);
  }
}

/** The cinematics' music: a scene's id to the track it plays (a scene with no score of its own has none). */
const SCENE_TRACK: Record<string, Track> = {
  ...Object.fromEntries(SCENE_TRACKS.map((t) => [t, t])),
  // (the Calamity heralds by their foe ids, and some moods by what they are for)
  calBoss1: 'gorvak', calBoss2: 'herald2', calBoss3: 'herald3', calBoss4: 'herald4', calBoss5: 'herald5', calBoss6: 'herald6',
  awakening: 'solemn', victory: 'triumph', spireClimb: 'spire',
};
/** Plays a victory or defeat sting once over the music, which comes back after it. */
export function playSting(id: StingId): void {
  engine?.music.sting(id);
}

/** Crossfades to a track (for the owner and the tests: the page's own music follows the place and the fight); or a scene's, as
 *  `'scene:opening'` (see `playScene`). */
export function setMusic(track: MusicId | `scene:${string}`): void {
  if (track.startsWith('scene:')) return playScene(track.slice(6));
  sceneMusic = false;
  engine?.music.setTrack(track as MusicId);
}

/** Starts a cinematic's music by the scene's id (`opening`, `gorvak`, `herald2` to `herald6`, `triumph`, `comic`, `solemn`, `spire`, or a Calamity foe id `calBoss1` to `calBoss6`, or the aliases `awakening`, `victory`, `spireClimb`); an id with no score leaves the music as it is. It loops until
 *  `endScene`. The scenes' stings are cues: `play('sceneBoss')` for a boss arriving, `play('sceneVictory')` for a victory. */
export function playScene(id: string): void {
  const track = SCENE_TRACK[id];
  if (!track || !engine) return;
  sceneMusic = true;
  // (a victory cinematic scores the same triumph the victory music plays: it carries on, its fanfare included, without a restart)
  if (track === engine.music.current) return engine.music.setTrack(track);
  engine.music.stopSting();
  engine.music.setTrack(track);
}

/** The scene is over: the music of the place and the fight comes back. */
export function endScene(): void {
  sceneMusic = false;
  syncMusic();
}

/** The tower act the music takes its colour from (a filter, a pace and a drone), or null outside the tower. */
export function setAct(act: number | null): void {
  wantAct = act;
  engine?.music.setAct(act);
}

/** The place the player is in, for the ambience bed under the music (null for none): it crossfades over about 1.5 s, and
 *  the same bed again changes nothing. See `sceneOf` in `audioRules.ts` for what each screen asks for. */
export function setScene(scene: Scene | null, map: MapKind = null): void {
  wantScene = scene;
  engine?.beds.setScene(scene);
  // (the music follows too: the camp's or the tavern's, the tower's or the Calamity's map, or the deployment; off the board a
  //  battle that was on is over or left, and a victory's results are behind)
  music = atPlace(music, placeOf(scene, map));
  if (music.place === 'deploy' && !music.battle) engine?.music.warm('battle');
  syncMusic();
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
  const { music: player, mixer: m } = engine;
  return {
    started: true,
    state: ctx.state,
    muted,
    track: player.current,
    level: player.level,
    sounding: player.sounding,
    sting: player.stingId,
    place: music.place,
    battle: music.battle,
    fighting: music.fighting,
    victory: music.victory,
    sceneMusic,
    act: player.act,
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
