## The mix: music and effects matched by measurement

**Changed by [battle-music-2.md](battle-music-2.md):** the music files are now all mastered to -18 LUFS and every loop plays at one level (-30 LUFS at the speakers, `MUSIC_LEVEL` 0.251, every loop's trim 1); the stings keep their targets. The effects' levels below are unchanged.

Branch: `claude/audio-mix` (from main 0.233.0). The owner's ask: "Adjust the audio so the music and sound effects are better
matches in volume."

### What was wrong (measured)

Nothing had been levelled against anything else. The 23 music files were mastered one by one and played at one bus level, so
they spread over **10 LU** at the speakers (the Calamity's battle track at -22.1 LUFS, the opening's at -32.3). The battle music
sat only **0 to 3 LU under** the fight's own sounds (the battle track -26.3 against the skeletons' fight at -25.9; the boss track
louder than the boss fight), so the music fought the action. The menus' music was *quieter* than the battle music. Within the
fight the cues spread over 30 LU: a light hit 17 LU under a crit, a ranged hit 5 LU under a sword's, the hero skills' element
voices (fire whoosh, wind, rustle) near inaudible, a burning death 8 LU under a thud. The king's spells spread over 7 LU (Frost
-13.8, Bulwark -21.2). The tap on every button was 20 LU under the coin chime.

### How it was measured

`tools/audio-mix/measure.mjs` (with `probe.ts`; `npm run web` first) renders the page's own sound in headless Chromium into
OfflineAudioContexts: the real `MusicPlayer` (each file decoded and looped as the page does, at its trim and level), the real
`CueSynth` with the recorded combat samples, the real `SpellBank`, all at the bus levels of `audioMix.ts` and the gains of
`CUES`, at both sliders' 100 %. A fight is the real sim (`startBattle`, `stepBattle`) with its events through `cuesFor`, the page's
`Mixer` (a seeded pitch, ×1 speed) and `panOfEvent`, rendered whole, then family by family, then over its battle track. Each
render is metered to ITU-R BS.1770 (K-weighted, gated integrated loudness in LUFS; the loudest 400 ms, "momentary max", for a
short sound; sample peak; and the share of 10 ms windows over the limiter's -2 dBFS). The meter agrees with ffmpeg's `ebur128` on
the files to 0.1 LU. `node tools/audio-mix/targets.mjs <measure.json>` prints the gains that reach the targets.

### The targets (LUFS at the speakers, both sliders at 100 %)

- **A fight's sounds together: about -23.5 integrated.** The battle music **7 LU under** them (-30.5; the boss's and the
  Calamity's -30).
- **The menus' and maps' music a little louder than in battle: -28** (camp, tavern, deploy, tower and Calamity maps, triumph).
  The cinematics' scores -27 (nothing is fighting them).
- **Within the fight** (momentary max): a plain blow -26 (sword, spear, fist, bone; a light blow -28; a ranged hit -27), a heavy
  blow -23, a crit -20, a block -25; a death -23 whatever kind; a shot leaving -28 (an arrow's flight -39 under it); a skill's
  element voice -27 to -29, its booms -23.
- **Big moments just above the fight's loudest moments** (which reach about -17 to -19): an ultimate -16, every king's spell -15,
  a boss's skill -20; the victory fanfare -23.5 integrated (the fight's own loudness), the defeat sting -25.5.
- **The menus' taps and chimes** clear over the menu music but never a jolt: a tap -40 momentary (a short click; its peak is
  -18 dBFS), coins and stars -30, a level-up -26, a three-piece set's chime -26; the summoning show's stinger -22.

### What changed

- **`src/render/audioMix.ts` (new, pure):** the bus levels (`MUSIC_LEVEL` 0.22, `SFX_LEVEL` **0.35 to 0.49**, `UI_LEVEL` 0.35),
  `TRACK_GAIN` (a trim for every music file and both stings, 0.40 to 1.83) with `trackGain(id)`, and `busOf` / `UI_CUES` /
  `SHOW_CUES` (moved from `sound.ts`).
- **`audioProcessors.ts`:** `MusicPlayer` plays each epic file at its trim (`Loop.trim`, under the level the player asks for, so
  the victory's triumph bed is `VICTORY_BED` × the triumph's trim); a sting at its trim. A synthesised fallback track takes none.
- **`soundRules.ts`:** every cue's `gain` in `CUES` re-set to its target (the quickest swings the fight mutes are left alone). The
  quietest synthesised voices need the most: a miss, a rustle and a gust of wind are capped at 8.
- **`spellSfx.ts`:** `SPELL_TRIM`, a trim for each spell on its cast and effect alike (0.62 for Frost to 1.46 for Bulwark).
- **`sound.ts`:** reads its levels and `busOf` from `audioMix.ts`. The sliders still multiply the buses (`applyLevels`); at 100 %
  each is the balanced mix.
- No file was re-rendered: every track was well mastered (peaks -9 to -21 dBFS at its playing level), only at different loudness.

### Before and after

Music at its playing level (integrated LUFS):

| track | before | after |
|---|---|---|
| camp | -30.3 | -28.0 |
| tavern | -29.1 | -28.0 |
| deploy | -28.6 | -28.0 |
| tower | -28.2 | -28.0 |
| calmap | -29.4 | -28.0 |
| battle | -26.3 | -30.5 |
| battle2 | -28.8 | -30.5 |
| battle3 | -29.1 | -30.5 |
| boss | -25.6 | -30.0 |
| calbattle | -22.1 | -30.1 |
| triumph (full) | -24.5 | -28.1 |
| triumph (victory bed) | -28.9 | -32.5 |
| opening | -32.3 | -27.0 |
| gorvak | -26.1 | -27.0 |
| herald2 to herald6 | -29.5 to -23.8 | -27.0 |
| comic, solemn, spire | -29.4 to -25.5 | -27.0 |
| victory sting | -25.3 | -23.5 |
| defeat sting | -29.4 | -25.5 |

Whole fights (integrated LUFS / momentary max / peak dBFS), the effects alone and over their battle track:

| fight | effects before | effects after | battle music before | after | gap before | gap after | with music, after |
|---|---|---|---|---|---|---|---|
| skeletons, `battle` | -25.9 / -18.7 / -6.4 | -23.5 / -17.0 / -4.4 | -26.3 | -30.4 | 0.4 LU | 6.9 LU | -23.0 / -16.8 / -4.2 |
| orcs, `battle2` | -25.8 / -20.2 / -5.2 | -23.8 / -19.5 / -4.1 | -29.2 | -30.8 | 3.4 LU | 7.0 LU | -23.2 / -19.1 / -4.3 |
| ogres, `battle3` | -24.7 / -18.8 / -3.5 | -23.5 / -18.1 / -2.3 | -29.0 | -30.4 | 4.3 LU | 6.9 LU | -23.0 / -17.7 / -1.9 |
| Demon Lord, `boss` | -26.5 / -21.9 / -7.5 | -23.2 / -19.4 / -4.5 | -25.6 * | -30.0 * | -0.9 LU | 6.8 LU | -23.1 / -19.1 / -4.8 |

(* the whole boss loop; its first 14 s, all that fight lasts, are quieter still.) The limiter (-2 dBFS) is reached in none of
the four fights, the effects alone or with the music: its share of time over the threshold rounds to 0.0 %, so it does not pump.

The fight's families, before and after (integrated LUFS, the skeletons' fight): hits -26.9 to -24.9, deaths -29.8 to -27.2,
skills -33.8 to -30.6, shots -33.6 to -32.3 (the shots stay under the hits they lead to).

Spread within each family (momentary max, quietest to loudest, before and after):

| family | before | after |
|---|---|---|
| hits (11 cues) | -38.4 to -20.2 | -28.0 to -20.0 |
| shots (6) | -56.3 to -29.5 | -40.1 to -25.9 |
| element and skill voices (21) | -53.5 to -25.4 | -34.0 to -23.0 |
| deaths (6) | -31.6 to -24.0 | -24.0 to -23.0 |
| king's spells (21) | -21.2 to -13.8 | -15.0 to -14.9 |
| ultimate, boss skill | -25.8 to -21.4 | -20.1 to -16.0 |
| menus' taps and chimes (14) | -49.4 to -23.2 | -40.3 to -26.0 |
| summoning show (3) | -28.2 to -23.4 | -26.8 to -21.8 |

The ambience beds (`audioBeds.ts`) were left as they are: they sit 20 LU or more under the music (the meter's renders of them
vary with their random one-shots, so their figures are rough).

### Tests

`test/audio-mix.test.ts`: every music file has a trim (0.38 to 2.5) and no trim names a missing file; `town` is the camp's trim;
every cue a gain in (0, 10] and a bus; the bus levels inside the master with the music bus the quieter; the battle tracks
brought down; every spell a trim (0.5 to 2) that scales its cast; the music player fades a file in to its trim with a level on
top. `test/battle-music.test.ts`'s victory bed check now expects `VICTORY_BED` × the triumph's trim (the bed's level is
unchanged against the track; the track itself is trimmed).

### What to listen for

The numbers say the mix is balanced on a meter; a phone's speaker is not a meter, so:

- **In a fight:** the music should be clearly there but under the blows; a crit, a death and a king's spell should land on top
  of it. If the music now feels too far back on the phone's speaker, `MUSIC_LEVEL` is the one number to raise (0.22; +1 dB is
  0.247), and the ratio of the tracks to each other stays.
- **Between screens:** the camp, tavern and maps should all sound the same loudness; the battle music should not jump up when a
  fight begins (it now steps down about 2.5 LU), and the Calamity's battle track should no longer be much louder than the others.
- **The king's spells** should all be equally loud: Frost was the loudest and is now level; Bulwark, Blink and Deep Freeze were
  the quietest and are now level.
- **The skill whooshes** (fire, wind, rustle) are much louder than before (they were near silent). If they read as noisy, their
  targets in `tools/audio-mix/targets.mjs` are the place to lower.
- **Taps** on buttons are now audible (they were 20 LU under the chimes); they should be a small click, not a knock.
