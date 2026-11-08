# Sound pass: the music's volume, and ambience to match the screens

The owner: **"the music volume still feels very bad."** Branch `claude/sound-pass` (from main 0.408.0).

I cannot hear sound, so everything below was found and checked by measurement: ffmpeg's EBU R128 meter on the files, the page's
own audio code rendered offline in headless Chromium and metered (`tools/audio-mix/measure.mjs`), the page's engine state in
Chromium (`__audioDebug()`), and pure tests. **Please listen on the phone** (both its speaker and headphones) and say what to move.

## What was wrong

The files were fine; what the page did with them was not.

1. **The music was far too quiet, everywhere.** Every loop played at **-30 LUFS** at the speakers with both sliders at 100 %.
   In a menu that is the only sound, and -30 is very quiet on a phone's speaker; in a fight the music sat **6 to 7 LU under**
   the fight's sounds (-30.4 against -24.1), buried.
2. **The duck made it vanish.** Every sheet, card and the summoning show dipped the music and ambience **-8 dB and muffled them
   to 1.4 kHz**. That put the menus' music at about **-38 LUFS** with almost nothing left above the low-pass, which on a phone's
   speaker (little below about 250 Hz) is close to silence. The duck was bound to:
   - **the settings sheet**, so the Music slider was always heard ducked and muffled: the volume could not be judged while it was set;
   - **the Armies screen** (`#hmSub`, a full page, also the codex), so a whole screen of the game was muffled;
   - every hero sheet, the party sheet, an auto-run's summary, a boss's card and an event.
3. **Cinematics pumped.** `sceneView.ts` ducked while each line was typing and let go when it had typed: the score dipped -8 dB
   and came back up **with every line of every conversation**.
4. **The slider was a straight gain.** 50 % was -6 dB, 80 % was -1.9 dB: most of the travel barely changed anything, then the
   last tenth fell from -20 dB to nothing. It applied only when the finger was lifted (`change`), not while moving.
5. **The volume stepped when the limiter loaded.** Until the worklet limiter loads (or for good, where it cannot), a native
   `DynamicsCompressorNode` stood in (threshold -10, ratio 12, knee 8). The Web Audio spec gives that node an automatic **makeup
   gain**: measured in Chromium, **+3.87 dB** on everything, and 12:1 compression above -10. So the sound was 3.9 dB louder and
   squashed until the worklet took over, then dropped; on a browser where the worklet never loads, it stayed that way.
6. **Bass-heavy tracks were quieter on a phone.** Every file is mastered to -18 LUFS (all 20 measure -17.9 to -18.1, true peaks
   -2.0 to -6.9 dBTP: none unlevelled or re-rendered since), but a phone's speaker drops the bass. Metered after a 250 Hz
   fourth-order high-pass ("phone"), the files spread over **4.4 LU** (`opening` -18.5 to `comic` -22.9); the **boss track was
   1.8 LU quieter than the battle track** on a phone (-21.1 against -19.3), the opposite of what a boss wants, and the tavern 2.2 LU
   under the camp.
7. **Crossfades dipped.** Two exponential glides (time constant a third of the fade) cross at about -2.7 dB of power, so every
   change of track sagged in the middle. The music under a victory or defeat sting was cut out in 0.5 s.
8. **Coming back from away** resumed the clock at full level at once (no fade), and a phone that held the clock until a tap came
   back with no fade either.
9. **The ambience was inaudible.** The beds sat **17 to 25 LU under the music** (camp -47.0, armies -54.8, crypt -49.5 against
   music at -30), and the ones made only of low tones (armies, the crypt, the summoning hall) measured **-62 to -70 LUFS on a
   phone**. (The old measuring probe gave the noise beds a constant random source, which made their noise all zeros, so the old
   note's figures for them were of silence; the probe now seeds it.)

## What changed

### The levels (`src/render/audioMix.ts`, `battleMusic.ts`)

- **Each loop trimmed to one playback loudness** (`playbackLufs`: half its plain loudness, half its phone loudness; trims within
  ±1.3 dB), read straight from `tools/epic-music/loudness.json`, which now keeps each file's `phone` figure
  (`node tools/epic-music/level.mjs --check` writes it; `meterPhone` in `loudness.mjs`). No file was re-encoded.
- **The place's music at -25 LUFS** at the speakers (`MUSIC_TARGET`; `MUSIC_LEVEL` 0.531, was 0.251): menus, maps, the deployment,
  scenes.
- **A battle's track 3.5 dB under that** (`FIGHT_MUSIC_DB`, `FIGHT_LEVEL`), steady through every wave, every break and every
  deploy between waves, so it never bobs. The step comes inside the crossfade from the deployment's track, so it is heard as the
  fight's music, not a drop. The music now sits **about 4 to 5.5 LU under the fight** (was 6 to 7).
- The stings by their loudness at the speakers (`STING_LUFS`): the victory fanfare -23.5 (a fight's own), the defeat -25.5.
- The effects are untouched (their mix was measured in `audio-mix.md` and holds).

### Ducking (`audioRules.ts`: `DUCKS`, `duckOf`, `duckChange`)

| Reason | Was | Now |
|---|---|---|
| a sheet (hero roster, party, auto-run summary), an event's card | -8 dB, 1.4 kHz | **-4 dB**, no low-pass |
| a cinematic | -8 dB, 1.4 kHz, dipped and lifted each line | **-3 dB**, no low-pass, held from the first line to the scene's end |
| a boss's card | -8 dB, 1.4 kHz | -6 dB, 5 kHz |
| the summoning show, a reveal, an eidolon's call, a binding (their own big sounds) | -8 dB, 1.4 kHz | -9 dB, 1.8 kHz |
| **the settings, the Armies screen and the codex** | -8 dB, 1.4 kHz | **not ducked** |

The deepest reason held wins. Down over about 0.35 s, up over about 1 s (`DUCK_DOWN_S`, `DUCK_UP_S`), and a lift waits 0.3 s
(`DUCK_HOLD_S`), so a sheet closing as the next opens never lets the music bob up between them.

### The slider (`audioRules.ts`: `sliderGain`, `curvedVolume`; `settings.ts`)

- **Perceptual:** gain = share^1.661, so every halving of the slider is the same 10 dB (half as loud): 50 % is -10 dB, 25 % -20 dB,
  10 % -33 dB. Step 5 (was 10). The volume follows the slider **as it moves**.
- **Old saves keep their loudness:** a volume saved on the straight slider is moved to the curve as it loads (50 % becomes 65 %,
  10 % becomes 25 %, 40 % becomes 60 %; 0 and 100 stay), and the save is marked `volCurve` so it is never moved twice.
- Defaults stay 100 % (the balanced mix).

### Transitions (`audioProcessors.ts`: `glide`; `audioRules.ts`: `fadeCurve`)

- Every music fade is an **equal-power curve** (a quarter sine, `setValueCurveAtTime`): the new track in and the old out over the
  same length, holding the loudness through the change. A fade cut short carries on from where it got to. The boss in over 1.5 s,
  back out over 3 s, anything else 1.2 s (unchanged).
- The music under a sting fades over 0.8 s (`STING_FADE_S`, was cut in 0.5 s).
- Hidden: the master fades in a moment, then the clock is suspended. Back: the clock resumes and the master **fades up over 0.5 s
  to exactly where it was** (the mute's 0 or 1), also when a phone held the clock until a tap (`fadeIn` in `sound.ts`).
- Checked for stacking: a change of track releases every other loop, and a sting holds the next track until it has rung, so two
  tracks never sound together outside a crossfade.

### The chain (`BusMixer`)

```
sfx, ui, show ─────────────────────────────────────────────┐
music, ambience ─► bed ─► high-pass 40 Hz ─► ducker ─► bed limiter (-8 dBFS) ─┴─► master ─► limiter (-1.5 dBFS) ─► speakers
```

- The **native stand-ins are now hard-knee limiters with their makeup gain taken off** after them (`compressorMakeupDb`: the spec's
  0.6 × the gain they take off full scale; checked in Chromium to 0.01 dB at three settings), so there is no step when the worklet
  takes over, and nothing under the limit is changed.
- A gentle **40 Hz high-pass** on the music and ambience (sub-bass a phone cannot play only eats headroom), and a **safety limiter
  on the bed** at -8 dBFS: the music peaks at -7 to -13 dBFS at its new level, so it catches only a stray peak.
- The master limiter at -1.5 dBFS (was -2). In none of the measured fights does anything reach it (0.0 % of the time).

## Before and after

Music at the speakers, both sliders at 100 % (integrated LUFS, plain; "phone" after the 250 Hz high-pass):

| Track | Before | After | After, phone |
|---|---|---|---|
| camp | -30.4 | -25.0 | -25.6 |
| tavern | -30.2 | -23.7 | -26.6 |
| deploy | -30.2 | -23.8 | -26.5 |
| tower | -30.1 | -23.5 | -26.7 |
| calmap | -30.1 | -23.1 | -27.2 |
| battle (in a fight, at `FIGHT_LEVEL`) | -30.2 | -28.2 | -29.4 |
| boss (in a fight) | -30.2 | -27.1 | -30.2 |
| triumph (victory bed) | -34.6 | -28.7 | |
| opening | -30.1 | -24.9 | -25.4 |
| gorvak, herald2 to herald6 | -30.1 to -30.3 | -23.0 to -23.6 | -27.0 to -27.5 |
| comic, solemn, spire | -30.1 to -30.3 | -22.6 to -24.9 | -25.6 to -27.7 |
| victory sting | -23.7 | -23.7 | |
| defeat sting | -25.5 | -25.6 | |

(Before, the phone figures spread over 4.4 LU between the files; after, the loops' phone figures spread over 2.3 LU and the plain
ones over 2.4 LU. The boss is now 1 LU louder than the battle track on headphones and 0.8 LU quieter on a phone's speaker, where it
was the same plain and 1.8 LU quieter on a phone.)

A whole fight (the real sim's events through the page's cues and mixer, its battle track and its land's ambience; integrated /
momentary max / peak dBFS):

| Fight | Its sounds | Music before | Music after | Gap before | Gap after | Everything, after |
|---|---|---|---|---|---|---|
| skeletons, battle | -24.1 | -30.4 | -28.2 | 6.3 LU | 4.1 LU | -23.0 / -17.6 / -1.8 |
| orcs, battle | -24.5 | -30.2 | -28.1 | 5.7 LU | 3.6 LU | -23.1 / -18.3 / -5.0 |
| ogres, battle | -23.7 | -30.3 | -28.2 | 6.6 LU | 4.5 LU | -22.5 / -17.2 / -3.4 |
| Demon Lord, boss | -21.6 | -30.2 | -27.1 | 8.6 LU | 5.5 LU | -21.2 / -16.2 / -4.1 |

The limiter is reached in none (0.0 % of 10 ms windows over -1.5 dBFS).

Under a sheet the menus' music was about -38 LUFS and muffled; now about -29 (and -28 under a cinematic's words, steady).

## Ambience to match the screens

Synthesised in the existing bed engine (`audioBeds.ts`, `BEDS` in `audioRules.ts`): **no new files**, so nothing is downloaded,
the service worker's `FILES` list is unchanged, it plays offline, and no credit is needed. (There is no `soundZones.ts` or
`ambienceMix.ts` in the repo; the beds are the engine's ambience.)

| Screen | Bed |
|---|---|
| **Camp (the overlook)** | the campfire by the ledge (body, flicker, runs of crackles and pops), **the far waterfalls and river** (a steady low rush and its hiss), the **wind over the cliff**, **night insects** |
| **Tavern** | the murmur, the **hearth's crackle** (a flicker layer and pops), mugs clinking |
| **Castle** | wind, and the **trees moving in it** (a high rustle that rises with the gusts), a far bird |
| **Spells study** (its own bed now, not the castle's) | the **candles' hush** (a soft breath of flame, flickering), a **low magic hum** beating slowly, a faint shimmer; a **page turning**, a glint |
| Recruit hall, Armies, the tower's acts | as before (the hall's shimmer louder; the Armies a far wind over its rumble and drums; the crypt cold air in its passages), so a phone hears them |
| **Battle boards, by land** (`LAND_BED`, from the board's `area`) | grassland and highland: wind, grass, birds · forest and autumn: trees in the wind, insects, birds, a crow · snow: a howling wind, gusts · desert: dry wind, sand, gusts · oasis: wind, trickling water, birds, a frog · volcano: deep rumble, the fire's roar, lava pops, far eruptions · forge: furnaces, far anvils · dungeon and crystal: a cold drone, air, drips, a glint · swamp: thick insects, frogs · graveyard: a thin wind, crows · ruins, temple and shrine: wind among stones, echoing · the war camp: the Armies' drums |

New one-shots: `frog`, `crow`, `anvil`, `page`; the fire's `pop` is now a run of three to seven crackles with the odd bigger pop.

**Level:** each bed's `level` was set by measuring it to sit **about 14 LU under the place's music** (its plain and phone loudness
together about -39.5; `AMBIENCE_LEVEL` 1, was 0.22); a bed that is only bass was lifted no more than about 8 dB:

| Bed | Before | After (plain / phone) |
|---|---|---|
| camp | -47.0 | -38.9 / -40.1 |
| tavern | -46.8 | -39.1 / -39.8 |
| hall | -47.7 (phone -61.6) | -35.8 / -41.8 |
| castle | -46.8 | -39.4 / -39.8 |
| spells | -46.8 (the castle's bed) | -38.0 / -44.4 |
| armies | -54.8 (phone -68.0) | -38.0 / -42.6 |
| tower1 (crypt) | -49.5 (phone -69.8) | -37.0 / -48.3 |
| tower2, tower3 | -48.1, -39.8 | -39.4, -39.4 |
| a field fight, any land | -43.0 (one bed for all) | -37.5 to -40.0 (dungeon's phone -47.5) |

The beds follow the Music slider (on the same curve) and the mute, go quiet with the page (the clock is suspended), and dip with
the music under the shows. Music at Off turns them off with it, as before.

## Files

- `src/render/audioRules.ts`: `DUCKS`, `duckOf`, `duckChange`, `DUCK_DOWN_S`, `DUCK_UP_S`, `DUCK_HOLD_S`, `duckTc`; `sliderGain`,
  `sliderDb`, `curvedVolume`, `SLIDER_STEP`; `fadeCurve`, `STING_FADE_S`, `WAKE_FADE_S`; `compressorMakeupDb`, `MASTER_LIMIT_DB`,
  `BED_LIMIT_DB`, `BED_HIGHPASS_HZ`; the new beds, `LAND_BED`, `bedOf`, the new shot kinds. (`DUCK_DB`, `DUCK_GAIN`, `DUCK_HZ` gone.)
- `src/render/audioMix.ts`: `FILE_LOUDNESS`, `playbackLufs`, `PLAYBACK_REF`, `MUSIC_TARGET`, `loopGain`, `STING_LUFS`, `stingGain`.
- `src/render/battleMusic.ts`: `FIGHT_MUSIC_DB`, `FIGHT_LEVEL` (a battle's track in `musicOf`).
- `src/render/audioProcessors.ts`: `glide`, the native limiters with their makeup taken off, the bed's high-pass and limiter,
  `setDuck(to)`; the music player's fades on the curve.
- `src/render/audioBeds.ts`: `setScene(scene, land)`, the new one-shots.
- `src/render/sound.ts`: the slider curve, the duck by reason with its hold, the fades on hide and back, `setScene(scene, map, land)`.
- `src/render/sceneView.ts`: the cinematic's duck held for the scene.
- `src/main.ts`: the land passed to `setScene`; the settings and the Armies screen no longer ducked.
- `src/settings.ts`: the slider (step 5, live), `volCurve` and the old saves' move to the curve.
- `tools/epic-music/loudness.mjs`, `level.mjs`, `loudness.json`: the phone meter and figures.
- `tools/audio-mix/probe.ts`, `measure.mjs`: the ambience on its own bus, the bed's luck seeded, beds by land, the phone column,
  a fight's music at the fight's level and the whole fight with its land's bed.
- Tests: `test/sound-pass.test.ts` (new: the slider curve, the old saves, the ducking amounts and timing, the crossfade's shape and
  timing, the fight's level, the limiters' makeup); changed for the new requirement: `audio-mix`, `music-loudness`,
  `battle-music`, `audio-engine`, `audio-beds`, `settings`, `cinematics` (an old save's volume read on the curve).
- `docs/samples/sound-pass/settings-sound-*.png`: the Sound settings at 393x852, 360x780 and 412x915.

## Checked

- `npm run typecheck`; the full `npm test` (2,815 tests, all pass); `npm run web`.
- `node tools/epic-music/level.mjs --check`; `node tools/audio-mix/measure.mjs --only music,beds,fights` before (the old code, with
  the probe's bed fix) and after: the tables above.
- In Chromium at 393x852, 360x780 and 412x915 on the built page: the limiter took over (`limiter: true`); an old save's music 50 %
  read as 65 % and the music bus at 0.260 (was 0.126); the slider moved live, 50 % giving the bus exactly -10 dB of 100 %; the
  settings open with nothing ducked; a sheet's duck at 0.631 (-4 dB), the summon's at 0.355 (-9 dB), held 0.15 s after both were
  let go and back to 1.0 after; hidden, the clock suspended, back, running with the master at 1.0; a highlands board's bed
  `meadow`; no page errors.

**Not checked:** how any of it sounds (by ear), and on a real phone: iOS's held clock after an interruption, its silent switch,
and a Bluetooth headset are only for the phone to say. The bed recipes (rates, bands, the frog and crow shapes) are first guesses
that `BEDS` and `shot` can retune.

## If it still feels wrong

- The music's loudness everywhere: `MUSIC_TARGET` (-25; +1 dB is -24).
- The music against the fight: `FIGHT_MUSIC_DB` (-3.5; nearer 0 is louder in a fight).
- How far a sheet lowers it: `DUCKS.sheet.db`.
- A track that still stands out on the phone: its loudness in `loudness.json` (`phone`) sets its trim; how much the phone counts
  is the half in `playbackLufs`.
- The ambience: each bed's `level` in `BEDS`.
