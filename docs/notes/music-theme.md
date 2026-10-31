# The main theme: one tune, every army in its own dress

**Changed by [battle-music-2.md](battle-music-2.md):** the armies' own arrangements and `calbattle` are gone from the game (the owner: "One good battle music for all the battles, with a more intense one for bosses"); `battle` and `boss` were re-arranged on the same theme and every battle plays one of them. The theme itself below still holds.

The owner's ask: "I'm still not a fan of the battle music. What can we do to make it more unique? Catchy? Ours?" The owner chose:
our own generator (`tools/epic-music/`, nothing from outside), classic JRPG battle music (fast, melodic, a tune you hum later;
original, imitating and quoting nothing), and **the same main theme for every army, in a different flavour each**.

I cannot hear sound, so how it sounds was checked by numbers (levels, peaks, band balance, the loop joins, every melody note against
its chord), not by ear. Please listen to the three examples first (below) and tell me what to change: the tune, a tempo or an
army's instrument is a line or two in its track file.

## The theme

Written once, in `tools/epic-music/theme.mjs`, in scale degrees and in chords built on the scale's degrees (`d6` is the triad on
the sixth degree, `d5M` the major dominant), so an arrangement can set it in any key and mode and the harmony follows.

**The hook** is the first bar: a *tresillo* (3 + 3 + 2 sixteenths) that drops from the tonic to the fifth and back, then climbs to
the third and steps home. In D minor:

```
bar 1 (Dm)   D5 . . A4 . . D5 .  F5 - E5 D5        ^1:.75 5:.75 ^1:.5 ^3:1 ^2:.5 ^1:.5
bar 2 (Bb)   C5 . . Bb4 . . C5 .  D5 - - -          7:.75 6:.75 7:.5 ^1:2
```

Every phrase of the A section starts on that rhythm, so the tune is easy to know again.

| Section | Bars | Chords (degrees; in D minor) | What the tune does |
|---|---|---|---|
| Intro | 4 | i VI iv V7 (Dm Bb Gm A7) | the hook, its answer, the hook on iv, a run up the dominant |
| A | 8 | i VI III VII · i VI iv+V i | the hook; a third up; leaping to the fifth; the high sixth; the cadence |
| B | 8 | VI VII III i · iv i VI+VII V | longer notes climbing to the high seventh, ending high on the dominant |
| C (breakdown) | 8 | VI iv i VII · VI iv V V7 | the hook's rhythm alone, answered bar by bar; half-time drums building into A2 |
| A2 | 8 | as A | the tune again, the whole band |
| B2 | 4 | iv i VI+VII V | B's second half, the climb back to the dominant |
| Turnaround | 4 | as the intro | the intro's music again, so the loop joins |

The melodies sit 81-89 % on chord tones on the beats (`song.review()`), the rest passing notes and appoggiaturas.

## The form and the seamless loop

Every battle track is 44 bars: the intro plays once, from the file's start; the loop runs from the intro's end to the song's end (40
bars, 55-70 s by tempo). The last four bars (the turnaround) are the intro's music again, so at the join the loop hears what the
intro's end would have led into. They are the same notes but not the same samples, so `render.mjs` crossfades the song's last 0.12 s
(equal power) into the intro's own last 0.12 s: the loop's last sample then runs straight on into the sample after the intro.
A song with an intro is also written turned round by 0.1 s (`LOOP_START`), so its first downbeat is exactly where the page starts
playing. The manifest gives each file's `start` (the intro's length; 0 for the tracks with none) and `loopWindow` in `epicMusic.ts`
turns it into the window: play from `LOOP_START`, loop `[LOOP_START + start, LOOP_START + seconds]` (`audioProcessors.ts`'s
`begin` now starts a source at `info.from`). The old `BATTLE_LOOP_START` special case is gone.

## The flavours

| Track | Plays | Key, mode, bpm | Lead and palette | Drums | Breakdown (C) |
|---|---|---|---|---|---|
| `battle` | the daily, the Last Stand, spire floors, field fights | D minor, 156 | bright synth lead + violins; electric guitar takes A2; horn counter-line, brass stabs on the hook's rhythm, palm-muted guitars | rock kit, punchier kick and snare, gallop in A2 | trumpet and horns over synth arpeggios |
| `orcs` | the Orc Warband | C minor, 146 | trumpets with horns an octave down, tuba under the bass, open power chords | war drums under the kit, war-drum fills | war drums and taiko, the horn and tuba call the hook, choir shouts |
| `undead` | the Undead Legion | B minor, 150 | pipe organ (reeds) on the tune; choir "ooh" counter-line and pads; harpsichord runs | rock kit | the choir sings the hook over the organ's pedal; bells, a gong |
| `beasts` | the Beast Horde | E minor, 160 | horns, a trumpet in A2, a flute in B; pizzicato | hand drums, frame drum, shaker, taiko fills | drums alone with the horns |
| `wildwood` | the Wildwood | G Dorian, 168 | folk fiddle; flute counter-line and octave; a harp running throughout | jig-like light kit, frame drum, shaker | the flute plays the hook over the harp |
| `labyrinth` | the Labyrinth | F# in its own mode (minor with a raised 4th and 6th), 152 | harpsichord, a quiet square lead; pizzicato, a music box, flute organ | ride-led kit | harpsichord and pizzicato in canon |
| `ogres` | the Ogre Clans | A minor, 138 | tuba on the tune (horn an octave up), oom-pah tuba bass, low brass | stomps on the beat, claps on the backbeat | stomps and the tuba |
| `infernal` | the Infernal Host | E Phrygian, 172 | distorted lead guitar, tight power chords, choir pads | double kick | the choir sings the hook with the organ |
| `yokai` | the Yokai Procession | D, the tune moved onto the "in" pentatonic (D Eb G A Bb), 158 | koto (a plucked string, pressed up into its leaps) doubled by a shakuhachi-like flute; koto ostinato | taiko and its rim | koto and taiko alone, a gong |
| `golems` | the Golem Foundry | C# minor, 150 | square-wave synth lead, sixteenth synth arpeggios, slap bass | anvils on the backbeat, clanks for hats | anvils, the hook on tuned metal, bells |
| `boss` | a boss fought alone (spire or Calamity boss, a one-wave boss army) | Bb minor, 166 | the theme in fragments: the hook answered by the Neapolitan (flat second); guitar and organ; B sung slowly by the choir | double kick, gongs | the hook's pieces with silences between |
| `calbattle` | the Calamity (a Rift Sanctuary fight that is not a boss) | F# minor, 176 | everything: guitar and violins, choir, horns, synth arpeggios, bells | double kick; taiko breakdown | trumpet fragments over taiko and synth |

The theme elsewhere: the **victory** fanfare is the hook in D major on trumpets, horns and violins; the **triumph** bed under the
results is the A and B sections in D major as a stately march (the same key as the fanfare, so it follows on); the **camp** (home)
is the theme slowed to 84 bpm: a music box, then a flute and a harp, the horn and strings on B. The other place and scene tracks are
unchanged.

## The instruments (new or improved, `instruments.mjs`, `song.mjs`)

- `synthLead` (`lead`, and `sqlead` with pulses): two saws a few cents apart left and right and a square an octave down, a
  low-pass that opens on the attack, a touch of drive, late vibrato, and a glide up into leaps; its bus has a chorus and a
  dotted-eighth ping-pong echo. `synth`: a short square pluck for arpeggios.
- `flute` (and `shaku`, breathier and bending into notes): a near-pure tone, breath noise strongest on the attack, a slow vibrato.
- `pluck` (Karplus-Strong): `koto` (bright, pressed up into leaps) and `harp`.
- `fiddle` (two close voices, wide vibrato, a body EQ), `violins` (a faster section), `trumpet` and `tuba` (brass with their own
  brightness), `slap` (a bass with a thumb pop), `anvil` (inharmonic metal, tuned).
- Drums: `kick2` and `snare2` (more click, sub and crack for the fast battles), `clap`, `shaker`, `stomp`, `wardrum`, `frame`,
  `hand`, `anvilHit`, `clank`, `china`; fills `snare2` and `war`; a kit's `map` swaps pieces (anvils for snares, clanks for hats).
- `theory.mjs`: the Dorian and Phrygian modes, any scale (`scale`), degree chords (`d1`..`d7`, `M`, `M7`, `m`, `_7`), `isus4`.
- `song.mjs`: `line()` (a counter-melody from the chords), `mel(..., { snap, glide })`, `intro`.
- `theme.mjs`: `arrange(flavour)` builds a whole track from a list of layers, a drum plan and extras, so each army's file is a
  page of settings. `demo.mjs` renders the theme on its own (a plain lead and piano), for listening; it is not shipped.

## Files and sizes

Opus at 32 kbps for the battle tracks (the old ones were 37), 37 for the camp and the fanfare, 30 for the triumph bed.

| Track | Loop (intro + loop) | Size | | Track | Loop | Size |
|---|---|---|---|---|---|---|
| `battle` | 6.2 + 61.5 s | 277 KB | | `infernal` | 5.6 + 55.8 s | 252 KB |
| `orcs` | 6.6 + 65.8 s | 296 KB | | `yokai` | 6.1 + 60.8 s | 274 KB |
| `undead` | 6.4 + 64.0 s | 288 KB | | `golems` | 6.4 + 64.0 s | 288 KB |
| `beasts` | 6.0 + 60.0 s | 270 KB | | `boss` | 5.8 + 57.8 s | 261 KB |
| `wildwood` | 5.7 + 57.1 s | 258 KB | | `calbattle` | 5.5 + 54.5 s | 246 KB |
| `labyrinth` | 6.3 + 63.2 s | 285 KB | | `camp` | 91.4 s | 428 KB |
| `ogres` | 7.0 + 69.6 s | 313 KB | | `triumph` / `victory` | 46.2 s / 13.9 s | 179 / 65 KB |

The twelve battle tracks are 3.23 MB; with the camp, triumph and fanfare 3.89 MB. `battle2` and `battle3` are deleted. **The whole
audio folder grows from 5.87 MB to 7.66 MB** (30 files), all cached on the first visit for offline play. The three fastest loops
(`wildwood` 168, `infernal` 172, `calbattle` 176 bpm) run 54-57 s, a little under the 60 s asked for, because every track keeps the
same 40-bar form; a longer form would cost about 25 % more bytes. If the download matters more, the next saving is 28 kbps (about
-12 %).

The other place and scene tracks are untouched (their files came from the earlier audio overhaul, not from the songs here as they
now stand, so `manifest.mjs` now takes the ids just rendered and keeps every other entry as it is: `node tools/epic-music/manifest.mjs
battle orcs ...`). For the audio-mix worker: no gain tables or player levels were changed; the new tracks are mastered to the old
battle tracks' loudness (-15 dB RMS, peaks -1 dBFS; the camp -19.6, the triumph -16.5) and the per-track `mix.levels` inside each
track file are only the arrangement's own balance.

**Trims for `audioMix.ts` (`TRACK_GAIN`), for whoever merges second.** The audio-mix branch's `TRACK_GAIN` is keyed by the manifest,
so once both are in, `battle2` and `battle3` must go and these entries must be there (typecheck fails otherwise). Measured as file
loudness (ffmpeg's EBU R128 meter, integrated) against the old files and their trims: the old battle, boss, Calamity, camp, triumph and
victory files with their trims all land at the same page offset (-13.2 ± 0.1 LU from file to page), so each new file's trim takes it
to its class's target in `tools/audio-mix/targets.mjs` (battle tracks -30.5, the boss and Calamity -30, the camp and triumph -28, the
fanfare -23.5):

```ts
battle: 0.58, orcs: 0.58, undead: 0.54, beasts: 0.58, wildwood: 0.55, labyrinth: 0.52, ogres: 0.58, infernal: 0.51, yokai: 0.58,
golems: 0.58, boss: 0.6, calbattle: 0.54, camp: 1.19, triumph: 0.9, victory: 1.57,
```

`MUSIC_TARGET` and `measure.mjs`'s `TRACKS` want the nine army ids (at -30.5) in place of `battle2`/`battle3`. A re-measure with
`tools/audio-mix/measure.mjs` after the merge should confirm them within a dB.

## Wiring

- `src/render/epicMusic.ts`: `ARMY_TRACKS` (the nine), `MusicId` has them (`battle2` and `battle3` are gone, their files deleted),
  `SYNTH_OF` falls each back to the synthesised battle, `loopWindow`.
- `src/render/battleMusic.ts`: `trackOfRun` gives an army run its army's own track at every tier (`armyTrack`), a one-wave boss army
  `boss`, the daily, the Last Stand (`standTrack`), spire floors and field fights the general `battle`, any boss fight alone `boss`, the
  Calamity `calbattle` (or `boss`). It still reads only what holds for the whole battle, so the track never changes wave to wave.
  `BATTLE_TRACKS` and `depthLevel` are gone: the seed and the depth no longer pick.
- `build.mjs` already copies every `src/audio/*.opus` into `out/web/audio/` and lists it in the service worker (offline).

## Tests (changed for the owner's new requirement)

- `test/battle-music.test.ts`: "battles differ from run to run: an army by its seed (the top tiers the hardest track), the daily
  by its day" is now "each army plays its own track ... at every tier; the daily and the Last Stand the general one" (every army has
  its own track and file, no two share one, the seed no longer picks); the single-fight test's spire floors by depth now all take
  the general track; the music-state test uses `orcs` for the old `battle2`.
- `test/epic-music.test.ts`: the track list has the army tracks and not `battle2`/`battle3`; the total-size bound is raised (below);
  "the battle track skips its ambient intro" and "the battle loop, cut short of its intro, is still a whole number of bars" are now
  "a battle track built on the theme plays its intro once, then loops from the intro's end" and "every battle track on the theme has
  a four-bar intro, its loop a whole number of bars (40)".

## Checked

- `npm run typecheck`; `npm test -- epic-music battle-music audio-engine music battle-sound` (37 pass); the full `npm test` (see the
  task board row); `npm run web` (30 files in `out/web/audio/`, each listed in `sw.js`).
- The renders: every battle track -14.9 to -15.7 dB RMS, peaks -1.0 to -1.4 dBFS; band balance in octaves within about 10 dB from
  125 Hz to 4 kHz (the labyrinth and the wildwood were re-balanced once: the harpsichord's top was too bright, the folk band's bottom
  too thin); the melodies 81-89 % chord tones on the beats.
- **The joins.** In the renders, the step across each loop's join is exactly the step the music makes at the same place after the
  intro (to four decimals: the crossfade works), and the low-passed join differs from the true continuation by -38 to -48 dB. In
  the decoded Opus the two sides of a join are two separate encodings of the same music, so they differ by the codec's own noise; the
  step at the join is 0.1 to 1.6 times the largest step the music itself makes in the 50 ms around it (median about 0.6), on a
  downbeat with a crash and a kick on it. The old `battle` track's join measured 1.5 the same way.
- In Chromium (an `OfflineAudioContext` at 32 kHz, as the page decodes): all 15 new files decode, stereo, each its loop plus the
  one-second pad (`loadEpic` accepts them).
- Not checked: how it sounds (I cannot hear it), a real phone's speakers, Safari's Opus decoder.

## For the owner: a listening guide

Three examples to listen to before merging (sent separately): **the theme demo** (the tune alone on a plain lead and piano),
**the Orc battle** and **the Yokai battle**. In any track:

- **The first two seconds are the hook**: "da . . da . . da-DUM, da-da" (the tresillo), the whole band hitting its rhythm. It comes
  back at the start of every A phrase, in the breakdown alone, in the victory fanfare and in the camp's music box.
- **The A section** (from about 6 s): the hook three times, climbing, then the high note and the cadence.
- **The B section** (about 18 s): longer notes, a counter-melody under it, ending high on the dominant.
- **The breakdown** (about 30 s): the drums drop to half time and the army's signature sound plays the hook in pieces, then a
  drum build and a cymbal swell into the full-band return.
- **The loop** (about 60-70 s): the intro's music again as the turnaround, then straight back into A. Listen for any bump there.

| Army | Track | Listen for |
|---|---|---|
| Orc Warband | `orcs` | trumpets and horns on the tune, war drums, tuba, open power chords |
| Undead Legion | `undead` | the pipe organ on the tune, the choir, harpsichord runs, bells |
| Beast Horde | `beasts` | horns, hand drums and shaker, a drums-only breakdown |
| Wildwood | `wildwood` | the fiddle, the flute, the harp, a jig-like beat |
| Labyrinth | `labyrinth` | harpsichord, an odd scale (it should sound "a little wrong" on purpose), pizzicato canon |
| Ogre Clans | `ogres` | the tuba on the tune, stomps and claps, slowest of all |
| Infernal Host | `infernal` | the distorted guitar on the tune, double kick, the choir |
| Yokai Procession | `yokai` | the koto (plucked, pressed up into notes), a breathy flute, taiko, a Japanese scale |
| Golem Foundry | `golems` | square-wave synth, synth arpeggios, anvils |
| any boss alone | `boss` | the hook in fragments, the flat second, guitar, organ and choir |
| the Calamity | `calbattle` | everything at once, the fastest |
| daily, Last Stand, spire, field | `battle` | the plainest version: synth lead and violins, then the guitar |

Questions for you: is the hook catchy enough (if not, it is one line in `theme.mjs` and every track follows)? Is any army's flavour
wrong for it? Is 7.7 MB of music acceptable, or should the battle tracks drop to a lower bitrate?
