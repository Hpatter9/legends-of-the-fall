# Audio engine (phase 1)

The page's sound now runs on audiorective (`@audiorective/core` and `@audiorective/effects`, both 2.3.2, bundled into
`game.js`; no new files or URLs, so the service worker's `FILES` list is unchanged). The public API in
`src/render/sound.ts` is the same as before (`play`, `playEvents`, `startFight`, `hushSummon`, `setup`, `bindMute`), so
no caller changed except to add the new hooks below.

## Files

- `src/render/sound.ts`: the façade. Creates the engine on the first tap (`createEngine`), holds mute, the settings
  volumes, the visibility hush/wake and the duck counter.
- `src/render/audioProcessors.ts`: the three `AudioProcessor` subclasses.
  - `BusMixer`: the buses and the master (named `BusMixer` because `soundRules.ts` already has a voice-limiting `Mixer`).
  - `CueSynth`: the synthesised cues. The `SOUNDS` table is the old one, ported unchanged (it takes the synth as an argument).
  - `MusicPlayer`: the looped tracks (audiorective `FilePlayer`), the tension low-pass and swell, the rumble layer,
    and the tower acts' drones.
- `src/render/audioRules.ts`: pure helpers with no DOM and no Web Audio: pan, `DuckCounter`, tension and act mappings.
  Tested in `test/audio-engine.test.ts` (with `test/audioFake.ts`, a stand-in for Web Audio so the processors build under Node).

## Bus map

```
CueSynth ──┬─ sfx ───────────────┐                       (show → sfx: the summoning show's sounds)
           ├─ ui ────────────────┤
           └─ show → sfx         ├─► master (mute) ─► limiter ─► speakers
MusicPlayer ─ music ─┐           │
(phase 2) ── ambience┴► bed ► low-pass + gain (the ducker) ┘
```

- Levels: sfx and ui = 0.5 × the Effects setting; music and ambience = 0.22 × the Music setting; mute is the master.
- The page's own taps and chimes (`tap summon merge coin star levelUp`) go to **ui**; the summoning show's to **show**
  (inside sfx, so `hushSummon` can hush it); every other cue to **sfx**.
- **Limiter:** audiorective's `Limiter` is an AudioWorklet and passes no sound until it has loaded, so a native
  `DynamicsCompressorNode` sits in the master until `limiter.ready` resolves, then the master is switched over. If the
  browser has no `audioWorklet` (or the load fails) the compressor simply stays. The worklet is loaded from a Blob URL, so
  it works offline. In Chromium the limiter took over (`__audioDebug().limiter === true`).

## Ducking

`duck(on, reason)` (from `sound.ts`) dips the music and ambience by -8 dB with a low-pass at 1.4 kHz, gliding in about
0.1 s and out about 0.2 s. It is ref-counted by reason (`DuckCounter`): each `on` needs an `off`, and the bed lifts only when
no reason is left. Hooked in:

- `bindDuck(el, reason)` ducks while an element is not `hidden` (a MutationObserver on its `hidden` attribute). Bound in
  `main.ts`: `#settings #hmSheet #hmSub #ptSheet #autoSum` ('sheet'), `#bossCard` ('boss'), `#events` ('event').
- The summoning show: `hall.ts` calls `duck(true/false, 'summon')` at the start and end of a show.

To duck under a new screen, add `bindDuck($('myScreen'), 'sheet')`, or call `duck` directly from open and close code.

## Stereo

`playEvents` pans every cue of a battle event by where it happens: `eventSpot` picks the fighter or tile (the target for a
hit, dodge or heal, the actor for a swing, shot, skill, song or banner, the tile for an area, zone, trap or spell), and
`panOfTile` projects it through `iso.at` against the board's centre, scaled to ±0.6 (`PAN_MAX`). A centred cue adds no node; a
panned one adds one `StereoPannerNode` in front of its bus. `play(name)` (the page's own cues) is centred.

## Adaptive music

- **Tension** (`setTension`, from `playEvents` about twice a second): the battle and boss tracks' low-pass opens from 55 % of
  its ceiling to fully open (exponentially); the swell and the 8 % pace-up are as before (the pace never goes past +8 %).
  Above tension 0.5 a quiet unpitched rumble swell fades in (phase 2 replaced the drum beat, which was not synced to the
  tracks; see `audio-beds.md`); its nodes exist only while the layer is audible.
- **Tower acts** (`setAct(act | null)`, called from `main.ts` `syncAct`): a low-pass ceiling, a pace and a drone under the
  tracks, from `ACT_COLOURS` in `audioRules.ts`: act 1 crypt (2.6 kHz ceiling, 0.97× pace, low sine and saw drone), act 2 halls
  (open, a slow triad swell), act 3 storm (5.2 kHz, 1.03×, a low rumble and swept wind). Acts 4 and up reuse the three.
  Tracks crossfade over about 1.2 s and drones fade in and out over the same.
- The home screen counts as no act.

## For phase 2 (done: see `audio-beds.md`)

- **A new cue:** add the name to the `Cue` union and a `CUES` entry in `soundRules.ts`, and a function in the `SOUNDS` table in
  `audioProcessors.ts` (it gets the synth `s` and a start time `t`: `s.note`, `s.pad`, `s.hiss`, `s.ring`, `s.click`,
  `s.scatter`). If it is a screen sound, add it to `UI_CUES` in `sound.ts` so it takes the ui bus. Then `play('name')`.
  `test/audio-engine.test.ts` builds every cue in `CUES` on the fake context, so a typo is caught.
- **An ambience bed:** write a small `AudioProcessor` (or a method on `MusicPlayer`, the way `makeDrone` does it) whose
  output connects to `mixer.bus('ambience')`; create it inside the `createEngine` setup in `sound.ts` `unlock()`. The bus
  is ducked with the music and follows the Music volume. Fade it with its own gain (`setTargetAtTime`); stop and
  disconnect nodes after the fade. Keep beds to a handful of long-lived nodes (no per-frame node creation).
- `window.__audioApi` (`setAct setMusic setTension duck`) and `window.__audioDebug()` (state, track, ducks, bus levels,
  whether the limiter has taken over) are there for poking from the console or Playwright.

## What I could not verify

I cannot hear sound, so these are by design and by reading, not by ear:

- how loud the drones sit under the tracks (`DRONE_SCALE` 0.35) and the rumble (`RUMBLE_SCALE` 0.12), and whether the act
  colours read as "dark, grand, stormy";
- the 55 % opening of the battle low-pass at zero tension may be duller than wanted (`TENSION_CLOSED`);
- the limiter's threshold (-2 dB) and the native compressor's fallback settings;
- on a real phone: iOS Safari's `AudioWorklet` load and the first-tap unlock (checked only in Chromium).

Checked in Chromium (393x852): no errors or warnings from audio on load; the first tap starts the context and `town.ogg`;
a fight plays cues and switches to `battle.ogg`; hiding the page suspends the context and showing it resumes it and replays
the track; mute drops the master to 0 and stops cues; ducking by two reasons stays at -8 dB until both are let go; panned
cues stay within ±0.6; the rumble creates nodes only at high tension.

`audiorective`'s `ParamSync` runs a `requestAnimationFrame` loop while any of its `SchedulableParam`s exists (about a dozen
here, read back every 100 ms). That is its cost for reactive params; it stops while the page is hidden.
