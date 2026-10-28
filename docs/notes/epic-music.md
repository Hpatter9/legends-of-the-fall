# Epic music

The owner's note: "Music sucks, try again. Make it more epic. Similar to Castlevania: Symphony of the Night." The brief was gothic and
symphonic: minor keys, driving bass ostinatos, pipe organ and harpsichord, string sections, a choir pad, timpani and taiko, brass, a
distorted guitar and a rock kit in the battles, a lone piano or music box when it is quiet, and a real reverb and master.

The old music was three eight-bar loops of bare oscillators, rendered in the page. This replaces it with **23 original tracks, composed
as notes and rendered offline by a small synthesiser in `tools/epic-music/`, encoded to Opus, and played in the page as buffers.**
Nothing was copied from any existing piece: the tunes, progressions and arrangements are new. No samples and no third-party audio
went in (see `CREDITS.md`).

I cannot hear sound, so **how it sounds is checked by numbers and spectrograms, not by ear**: levels, band balance, the loop seams,
and every melody note against its chord. Please listen to `docs/samples/epic-music/` and tell me what to retune.

## What plays where

| Track | Key | bpm | Length | Size | Plays |
|---|---|---|---|---|---|
| `camp` | D minor | 84 | 91 s loop | 428 KB | the home screen across all tabs |
| `tavern` | B minor, 3/4 | 132 | 65 s | 308 KB | the Heroes tab (the tavern): a lighter gothic waltz |
| `deploy` | E minor | 108 | 71 s | 334 KB | placing the heroes, in any mode |
| `tower` | C minor | 92 | 94 s | 439 KB | the tower map |
| `calmap` | G minor | 100 | 86 s | 405 KB | the Calamity map |
| `battle` | A minor | 160 | 72 s | 338 KB | a fight, the easiest third |
| `battle2` | E minor (Phrygian turns) | 168 | 69 s | 322 KB | a fight, the middle third |
| `battle3` | C# minor | 176 | 65 s | 308 KB | a fight, the hardest third |
| `boss` | D minor (flat second) | 150 | 90 s | 419 KB | every boss, in every mode |
| `calbattle` | F# minor | 184 | 63 s | 294 KB | a Calamity fight that is not a boss |
| `victory`, `defeat` | D major, D minor | 108, 92 | 14 s, 15 s | 65, 72 KB | stings when a fight ends (they play once) |
| `opening` | A minor | 62 | 62 s | 239 KB | the opening cinematic: a music box, a drone, no drums |
| `gorvak` | C minor | 88 | 55 s | 210 KB | Gorvak (`gorvak`, `calBoss1`): a heavy march of toms |
| `herald2` .. `herald6` | A, B, F, G, E | 76 .. 126 | 46 .. 63 s | 177 .. 243 KB | the other five heralds (`calBoss2`..`calBoss6`) |
| `triumph` | C major | 104 | 46 s | 179 KB | triumph / victory scenes |
| `comic` | F major | 124 | 46 s | 180 KB | the light scenes |
| `solemn` | D minor | 56 | 51 s | 199 KB | awakening and quiet moments: a piano |
| `spire` | D major | 98 | 59 s | 227 KB | the spire's milestones |

Total **5.87 MB** (`src/audio/*.opus`, 23 files). The scene ids are the same ones `playScene` already took (`opening`, `gorvak`,
`herald2`..`herald6`, `triumph`, `comic`, `solemn`, `spire`, and the aliases `calBoss1..6`, `awakening`, `victory`, `spireClimb`), so no
scene data changed. The scene loops are 46-63 s, shorter than the main loops (63-94 s), to keep the download near 6 MB.

How the choice is made (all in `src/render/epicMusic.ts`, pure and tested in `test/epic-music.test.ts`):

- `placeOf(scene, map)`: the home screen is the camp across all tabs; an open map (`#towerMap`) is the tower's or the
  Calamity's; any other time on the board is the deployment. `main.ts` passes the map to `setScene` (and watches `#towerMap`'s `hidden`).
- `battle`'s loop starts at `BATTLE_LOOP_START` (5.68 s): four bars past `LOOP_START`, skipping the quiet intro, so a fight opens on
  the combat downbeat. The loop is 48 bars of 1.3954 s, so the cut keeps it a whole number of bars (44) and it still joins on the beat.
- `fightTrack`: a boss is `boss`; a Calamity fight is `calbattle`; otherwise `battle`, `battle2` or `battle3` by `fightLevel`: an
  army or a daily by thirds of its waves, any other run by depth (stage or floor 1-9, 10-24, 25 up), an elite fight a step harder.
  `main.ts` passes `{ calamity, level }` to `startFight`.
- At the end of a fight the music fades, the **victory or defeat sting** rings over it (`playEvents` plays it on the `end` event), and the
  place's music comes back when the sting's notes have finished. A new fight cuts a sting short.
- `setMusic(id)` and the `__audioApi` are still there for poking; a cinematic's score still takes over until `endScene`.

## How it was made

`tools/epic-music/` (plain JS, deterministic; `npm run music` re-renders everything, `node tools/epic-music/render.mjs camp` one track):

- `dsp.mjs`: biquads, an FFT convolver (overlap-add, with the tail wrapped round the loop), a stereo-linked compressor and a look-ahead
  limiter, both run twice round so a loop's seam is smooth.
- `instruments.mjs`: every voice is layered, detuned and filtered, with envelopes, late vibrato, noise at the attack and velocity.
  **Pipe organ**: stops as harmonic sets in two slightly different tunings left and right, a tremulant, chiff. **Harpsichord**: plucked
  partials through a pluck-position comb, each decaying at its own rate, plus the jack's click and a quiet 4'. **Strings**: six detuned
  band-limited saws spread across the stereo field under a moving low-pass, with an ensemble chorus on the bus; a staccato variant for the
  fast arpeggios. **Choir**: vibrato saws through formant filters ("aah", "ooh"). **Brass and horn**: saws and a pulse under a low-pass that
  blooms on the attack. **Guitars**: a saw/pulse mix pre-filtered and driven hard at twice the sample rate (so it does not alias), then a
  cabinet; the lead slides into notes and gets a ping-pong echo; the rhythm guitar is palm-muted power chords, double-tracked hard left and
  right. **Piano**, **music box**, **church bell**: inharmonic partial banks with their own decays and a hammer or tine. **Kit**: kick, snare,
  hats, ride and crash, toms; **taiko**, **timpani** (tuned, with a pitch drop and the membrane's modes), gong and cymbal swells.
- `fx.mjs`: a generated stereo hall (early reflections, then noise decaying at its own rate in four bands, 2.8-3.4 s), a short room for the
  drums, the string ensemble, an echo and bus EQ.
- `song.mjs`: the composer's tools. Chords are written as symbols in the key (`i VI III VII iv N V7 viio7`, Neapolitan `N`, diminished
  `viio7`, secondary dominants); pads are voice-led; arpeggios, bass lines, stabs, drums and timpani are patterns over the chord grid;
  melodies are written in scale degrees (`^1:1.5 5:.5 7#:1`). `song.review()` lists any long on-beat melody note that is not a chord tone
  (the melodies come out 85-100 % chord tones on the beats). Each song has its own bus levels; the master EQs, glues (two compressors),
  widens the sides above 250 Hz, sets a loudness, and limits at -1 dBFS. Loudness is per track (calm tracks -21 dB RMS, fights -14 to -15).
- `render.mjs` writes WAVs to a scratch folder and Opus files to `src/audio/` (37 kbps for the main tracks, 30 for the scenes, constrained
  VBR); `manifest.mjs` writes `src/render/epicManifest.ts` (each file's loop length and size); `excerpts.mjs` cuts the samples.
- Rendering all 23 takes about 11 minutes on one core (15 s to a minute a track; the four-way split in a shell loop is easy).

A bug found on the way: every struck note (piano, harpsichord, music box, bell) began at a random phase, which clicked; the partial banks
now all start from zero.

## In the page

- `MusicPlayer` (`audioProcessors.ts`) keeps its API. A track's file is fetched (`audio/<id>.opus`), decoded by an `OfflineAudioContext`
  at 32 kHz (the rate it was rendered at: about 23 MB for a 90 s loop instead of 35), and played from an `AudioBufferSourceNode`, so it is
  not a media element and does not take other apps' audio focus (as before). At most three decoded tracks are kept.
- **Loops are seamless whatever the decoder does to the ends of the file.** The music is periodic, so each file holds the loop plus one
  second of its own start again, and the source loops the window `[0.1 s, 0.1 s + loop]`; any window one period long joins itself.
  Seam steps were measured in the renders (the join is as smooth as the music around it).
- An epic track is **not coloured** by the tension low-pass, swell, pace-up or rumble, or by the tower acts' ceilings and drones: those
  would only muddy a rendered mix (a pace-up would also detune it). The old rules still hold for the synthesised fallback and for the tests.
- **Fallback:** if a file is missing or a browser cannot decode Opus, `bakeMusic` falls back to the old synthesised track (`SYNTH_OF`
  says which). Opus in Ogg decodes in Chromium and Firefox and in Safari from 18.4; **I could only check Chromium**.
- **Offline:** `build.mjs` copies `src/audio/*.opus` to `out/web/audio/` and lists each in the service worker's `FILES`
  (`test/epic-music.test.ts` checks the folder and the manifest agree and that the list is built).

## Checked

`npm run typecheck`, `npm test` (1006 pass; 5 new tests in `test/epic-music.test.ts`), `npm run web`. In Chromium at 393x852: the first tap
starts the camp; the Heroes tab changes to the tavern's tune; deployment, a fight, its sting and the return all follow
(`__audioDebug().track`); every file decodes (`32000 Hz, 2 ch`, lengths match the manifest); no console errors or warnings from audio.
A real phone's speakers and the iOS decoder are the things only the owner can check.

## For the owner

- Please listen to `docs/samples/epic-music/` (30 s of each, cut from the shipped files). If a track's mood is wrong, the tune, the
  tempo or an instrument's level is one line in `tools/epic-music/tracks/<id>.mjs`; say which and I will retune it.
- The band is the same one in the three battles (rock kit, palm-muted guitar, brass and strings); they differ in key, speed, riffs, tunes and
  how much of the orchestra joins. If you want the battles further apart, say so.
- The tension adaptation of the old battle music (muffled, then opening and quickening as a fight thinned out) is gone for the new
  tracks; the three battle tracks by difficulty replace it. A mid-fight crossfade between two layers would cost another ~300 KB a track.
