# Battle music 2: one battle track, one boss track, every file at one loudness

The owner: "One good battle music for all the battles, with a more intense one for bosses. And level their volumes. It still
feels off."

I cannot hear sound, so the choices below were made and checked by numbers (loudness meters, peaks, loop seams, the melody
against its chords, and the page's own state logged in Chromium), not by ear. Please listen to `docs/samples/battle-music-2/`
(below) and say what to change.

## What plays now

| Battle | Track |
|---|---|
| every wave of every army, at every tier | `battle` |
| the daily, a quest, a field fight | `battle` |
| a spire floor (a fight or an elite), a Calamity spot (a fight or an elite) | `battle` |
| the Last Stand, every room | `battle` |
| **a boss**: an army's, the daily's or a quest's boss wave; a spire boss floor; a Calamity boss spot; a Last Stand boss wave (and its "hold the line" wave) | `boss` |
| a won battle | the victory fanfare, then the `triumph` bed under the results (as before) |

**The boss takeover** (`src/render/battleMusic.ts`, pure and tested):

- `trackOfRun(run)` is now asked at every wave and gives `boss` for the boss's own wave (`isBossRun`), `battle` for every other.
  The battle track still plays on unbroken from wave to wave (the same track asked again changes nothing).
- `crossfadeOf(from, to)`: the boss track comes in over **1.5 s** (`BOSS_IN_S`: quick, so it lands with the boss, never a cut),
  the battle track comes back from it over **3 s** (`BOSS_OUT_S`: gentler, so the step down is not a jolt); every other change
  at the player's usual **1.2 s** (`CROSSFADE_S` = `FADE_S`). The old track fades out over the same time the new one fades in.
  `MusicPlayer.setTrack(track, level, fadeS)` takes the length; `syncMusic` in `sound.ts` passes `crossfadeOf`.
- `endOfFight` now tells a wave won with more to come (`next`) from a fall a heart revives (`none`). After `next` the battle
  track comes back at once (`endAt`), so the result screen and the deploy after a boss wave are on the battle track again; after
  `none` whatever was playing plays on (a boss wave fought again stays on the boss track). The army's last wave won is
  `victory`: the boss (or battle) track fades in 0.5 s and the fanfare rings, as before.
- The boss track is decoded while the battle track plays (`startFight` warms it), so it comes in at once.
- The Last Stand: `standTrack(seed, boss)` and `standRoomTrack(seed, hall, boss)`; `standView.ts` passes the wave's `boss` from
  its wave and hold notes.

## The two tracks

Both are the main theme (`tools/epic-music/theme.mjs`, `music-theme.md`) in D minor, so the crossfade between them blends in
the same key; the boss is faster and heavier. Rendered with the existing pipeline (`node tools/epic-music/render.mjs battle boss`).

| | `battle` | `boss` |
|---|---|---|
| Tempo | 160 bpm | 176 bpm |
| Form | 4-bar intro once, then a 40-bar loop (60.0 s) | 4-bar intro once, then a 40-bar loop (54.5 s) |
| Tune | trumpets and violins (heroic, not the old bright synth lead, which tires over long sessions); a soft synth lead only in B; the electric guitar and low trumpets when the tune comes back (A2) | trumpets with the choir ("ah") singing the tune, horns an octave and a tuba two below; the guitar in A2; the organ on the breakdown's hook |
| Under it | horns' counter-line, strings, choir in C and A2, brass stabs on the hook's rhythm, off-beat bass, palm-muted guitars, string runs in B, synth arpeggios in C | an organ and the choir holding the chords, strings all through, a pounding bass and open power chords, brass stabs, choir shouts in C, timpani |
| Drums | a rock kit: drive, 16ths in B, half-time breakdown, gallop when the tune returns; no double kick (not tiring) | double kick with war drums (A, A2), a pounding kit in B, a taiko and war-drum breakdown, gongs on the sections, war-drum fills |
| Melody on chord tones (on the beats) | 86 % | 85 % |
| Loop seam (the join's step against the steps round it) | 1.37 (the old file's was 1.17; seed chosen for it: 23 gave 2.80) | 0.45 |
| Size | 270 KB | 246 KB |

**Dropped:** the nine army tracks (`orcs`, `undead`, `beasts`, `wildwood`, `labyrinth`, `ogres`, `infernal`, `yokai`, `golems`)
and the Calamity's `calbattle`: nothing else used them, so their files, their sources in `tools/epic-music/tracks/` and their
manifest entries are gone (git keeps them). `build.mjs` copies whatever is in `src/audio/`, so the service worker's `FILES` list
now holds the 20 files left (checked in `out/web/sw.js`). **The audio download falls from 7.66 MB to 4.90 MB.**

## Levelling the volumes

**Measured** with ffmpeg's EBU R128 meter (`ebur128=peak=true`: K-weighted, gated integrated loudness, and the true peak).
The files were mastered one by one and spread over **8.5 LU** (`herald4` -10.5 to `opening` -19.0 LUFS); some peaked over 0 dBTP.
The old per-file trims (`TRACK_GAIN`, `audio-mix.md`) brought each to its class's target at the speakers, but the classes were
apart on purpose: the battle music 2.5 LU *under* the deploy's and the camp's (so the music stepped down as each fight began and
up again after it), the scenes 3.5 LU over the battle music.

**Now** every file is brought to **-18 LUFS** with its true peak **under -1 dBTP**, by a plain gain (a gain is the same at every
sample, so the loop seams are untouched), with a look-ahead limiter only where the gain would push the peak over (`opening`,
`herald5`); then encoded to Opus at its own bitrate. Every loop then takes the same trim (1), and the music bus is set so they all
play at **about -30 LUFS** at the speakers, everywhere: 6.5 LU under a fight's own sounds. The stings keep their own trims (a
fanfare is a moment): the victory fanfare at the fight's own loudness, the defeat sting 2 LU under it.

| File | Before (LUFS / dBTP) | After (LUFS / dBTP) | At the speakers before (LUFS) | At the speakers now, metered in the page |
|---|---|---|---|---|
| `battle` (re-rendered) | -12.5 / -1.2 | -18.0 / -6.9 | -30.4 | -30.2 |
| `boss` (re-rendered) | -12.3 / -1.0 | -18.0 / -6.8 | -29.9 | -30.2 |
| `camp` | -16.3 / -4.8 | -18.1 / -6.5 | -27.9 | -30.4 |
| `tavern` | -15.8 / -0.4 | -18.1 / -2.8 | -27.8 | -30.2 |
| `deploy` | -15.3 / -1.8 | -18.1 / -4.6 | -27.9 | -30.2 |
| `tower` | -14.9 / -0.8 | -18.0 / -4.0 | -27.9 | -30.1 |
| `calmap` | -16.1 / -0.8 | -18.0 / -2.5 | -27.9 | -30.1 |
| `triumph` | -13.9 / -2.4 | -17.9 / -6.4 | -28.0 (bed -32.5) | -30.1 (bed -34.6) |
| `opening` | -19.0 / -1.1 | -18.0 / -2.0 (limited) | -26.9 | -30.1 |
| `gorvak` | -12.8 / +0.1 | -18.1 / -4.4 | -26.9 | -30.3 |
| `herald2` | -12.1 / +0.8 | -18.1 / -3.5 | -26.8 | -30.2 |
| `herald3` | -12.4 / +0.9 | -18.0 / -5.3 | -26.9 | -30.2 |
| `herald4` | -10.5 / +1.1 | -18.0 / -5.7 | -26.9 | -30.1 |
| `herald5` | -16.3 / +0.5 | -18.0 / -2.1 (limited) | -26.9 | -30.1 |
| `herald6` | -13.1 / +0.6 | -18.0 / -3.1 | -26.8 | -30.3 |
| `comic` | -12.3 / -0.1 | -18.0 / -5.2 | -27.0 | -30.1 |
| `solemn` | -13.7 / -0.7 | -18.0 / -5.0 | -26.9 | -30.1 |
| `spire` | -16.0 / -0.5 | -18.0 / -3.0 | -26.7 | -30.3 |
| `victory` (sting) | -14.2 / -3.2 | -17.9 / -6.6 | -23.4 | -23.7 |
| `defeat` (sting) | -16.2 / -1.2 | -18.0 / -3.2 | -25.4 | -25.5 |
| `orcs`, `undead`, `beasts`, `wildwood`, `labyrinth`, `ogres`, `infernal`, `yokai`, `golems` | -11.5 to -12.6 | dropped | -30.4 to -30.5 | - |
| `calbattle` | -11.4 | dropped | -29.9 | - |

("At the speakers before" is the file's loudness with the old bus level and trim, `MUSIC_LEVEL` 0.22 × `TRACK_GAIN`; the
audio-mix meter agreed with that sum to 0.1 LU. "Now" is `tools/audio-mix/measure.mjs`, the page's own `MusicPlayer` rendered
in Chromium, both sliders at 100 %.)

**The in-game mix** (`tools/audio-mix/measure.mjs --only music,fights`, the real sim's fights through the page's cues and mixer):

| Fight | Its sounds alone | The music alone | Gap | Together (integrated / momentary max / peak) |
|---|---|---|---|---|
| skeletons, over `battle` | -23.5 | -30.2 | 6.7 LU | -23.2 / -16.9 / -4.2 dBFS |
| orcs, over `battle` | -23.8 | -30.2 | 7.0 LU | -23.1 / -17.8 / -3.9 dBFS |
| ogres, over `battle` | -22.8 | -30.2 | 6.6 LU | -22.5 / -17.2 / -3.3 dBFS |
| Demon Lord, over `boss` | -23.4 | -30.2 | 7.2 LU | -23.0 / -17.5 / -3.7 dBFS |

The music sits 6.6 to 7.2 LU under every fight (it was 6.8 to 7.0 against the old battle tracks; nothing in the effects
changed), and the limiter (-2 dBFS) is reached in none of them. The menu/card **ducking** (`audioRules.ts`: -8 dB with a
low-pass) is one dip on the whole music bus, so with every track at one level it lands the same everywhere (about -38 LUFS
under a sheet). It is unchanged. The ambience beds kept their level (`AMBIENCE_LEVEL` 0.22, split from `MUSIC_LEVEL`, which
rose from 0.22 to 0.251, +1.1 dB, to put the -18 LUFS files at -30).

### The tools

- `tools/epic-music/loudness.mjs` (new): `TARGET` -18, `TOLERANCE` 1, `PEAK_MAX` -1; `meter(file)` (ffmpeg's EBU R128),
  `level(src, dest, kbps)` (gain, encode, re-meter, correct once; the limiter only when the peak needs it), and the table.
- `tools/epic-music/level.mjs` (new): `node tools/epic-music/level.mjs [id ...]` levels shipped files (decoded and encoded
  again at each file's own bitrate) or a fresh render's WAV (encoded once); `--check` only meters. It writes
  `tools/epic-music/loudness.json` (each file's LUFS, true peak, and the before).
- `tools/epic-music/render.mjs`: every encode now goes through `level`, so `npm run music` writes levelled files and the table.
- The re-encodes kept every file's length to the sample (ffprobe before and after), so the manifest's loop windows hold.
  Re-encoding a shipped Opus file is a second generation at 30-37 kbps; the two most-played tracks (`battle`, `boss`) were
  encoded once, from the render.

## Files

- `src/render/battleMusic.ts`: `BATTLE_TRACK`, `BOSS_TRACK`, `trackOfRun` (boss or battle), `standTrack(seed, boss)`,
  `crossfadeOf` with `BOSS_IN_S`, `BOSS_OUT_S`, `CROSSFADE_S`; `BattleEnd` gains `next`; `endAt` brings the battle track back
  after a boss wave. `armyTrack` and `GENERAL_TRACK` are gone.
- `src/render/epicMusic.ts`: `ARMY_TRACKS` and `calbattle` gone from `MusicId` and `SYNTH_OF`.
- `src/render/audioMix.ts`: `MUSIC_LEVEL` 0.251, `AMBIENCE_LEVEL` 0.22, `LOOP_GAIN` 1, `STING_GAIN` (victory 2.1, defeat 1.7);
  `TRACK_GAIN` is built from them for every manifest file.
- `src/render/audioProcessors.ts`: `MusicPlayer.setTrack(track, level, fadeS)`; the new track fades in and the others out over it.
- `src/render/sound.ts`: `syncMusic` passes `crossfadeOf`; `startFight` warms the boss track; the beds use `AMBIENCE_LEVEL`.
- `src/render/standMusic.ts`, `src/standView.ts`: the Last Stand's boss waves take the boss track.
- `src/audio/`: `battle.opus` and `boss.opus` re-rendered, every other file levelled, ten files deleted;
  `src/render/epicManifest.ts` rewritten by `manifest.mjs battle boss`.
- `tools/epic-music/tracks/battle.mjs`, `boss.mjs` rewritten; the ten dropped tracks' sources deleted.
- `tools/audio-mix/targets.mjs`, `measure.mjs`: every loop's target -30; the dropped tracks out of the lists.
- `tools/battle-music-2/probe.mjs` (new): the page, an army run through its boss wave, logging the music each second.
- `docs/samples/battle-music-2/`: `battle-30s.opus`, `boss-30s.opus` (cut from the shipped files without re-encoding) and
  `takeover-demo.opus` (20 s of the battle, the boss crossfading in over 1.5 s, then the battle back over 3 s; an offline mock-up
  of the page's crossfades, re-encoded at 48 kbps).

## Tests

- `test/battle-music.test.ts`: **changed for the owner's new requirement** (the old rules were pinned): "a battle keeps one
  track ... a boss wave does not change it" and "each army plays its own track" are now "every battle plays the one battle
  track, wave after wave, and the boss track only for a boss's own wave" (every army at every tier, the daily on three days,
  the Last Stand in every room); the single-fight test now expects the battle track for a Calamity fight and elite; `endOfFight`
  gives `next` for a wave won with more to come. **New:** the crossfade timings (`crossfadeOf`); an army run played through
  (battle, the boss wave on the boss track, the battle track back after it, the victory at the end, and a boss wave fought
  again after a heart staying on the boss track); the player crossfading battle to boss over `BOSS_IN_S` (in and out) and back
  over `BOSS_OUT_S`.
- `test/music-loudness.test.ts` (new): the stored table measures exactly the shipped files; each within 1 LU of -18 LUFS with
  its true peak under -1 dBTP; at the speakers every loop within 1 LU of -30 and 5.5 to 7.5 LU under a fight, the battle and
  boss tracks within 0.5 LU of each other, the fanfare at the fight's loudness and the defeat sting 2 LU under.
- `test/audio-mix.test.ts`: **changed** "the music under a fight is trimmed below the menus' music" to "every loop takes the one
  trim ..., the stings ring over it"; the player test uses `boss` for the dropped `calbattle`.
- `test/epic-music.test.ts`: the track list without the dropped ten (and a check they are gone); the size bound lowered from
  8 MB to 5.5 MB; the intro tests use `battle`.

## Checked

`npm install`; `npm run typecheck`; `npm test -- battle-music epic-music audio-mix music-loudness music audio-engine
battle-sound stand` (119 pass); the full `npm test` (1964 pass, 0 fail); `npm run web` (20 audio files in
`out/web/audio/` and in the service worker's list). `tools/audio-mix/measure.mjs --only music,fights` (the tables above).
`tools/battle-music-2/probe.mjs` in Chromium at 393x852, the Orc Warband (bosses on waves 8 and 15):

```
  2s wave 7: fighting     track=battle  sounding=[battle]
 15s deploy, boss wave    track=battle  sounding=[battle]
 17s wave 8 (boss)        track=boss    sounding=[boss]
 24s wave 8 won           track=battle  sounding=[battle]   (back at once, on the wave's result)
 28s deploy after         track=battle
 29s wave 9: fighting     track=battle
 41s wave 15 (last, boss) track=boss
 57s wave 15 won          sting=victory track=triumph sounding=[] (the boss track faded, the fanfare)
```

The page also booted and started its music at 360x780 and 412x915. Not played in the browser: the spire, the Calamity, the
daily and the Last Stand's boss waves (covered by the pure tests).

## For the owner

- Listen to `docs/samples/battle-music-2/` first. The tune, a tempo or an instrument's level is a line in
  `tools/epic-music/tracks/battle.mjs` or `boss.mjs`, then `node tools/epic-music/render.mjs battle boss && node
  tools/epic-music/manifest.mjs battle boss` (the render levels them itself).
- Every loop now plays at the same loudness, battle and menus alike, and the boss track is no louder than the battle track: it
  is more intense by its arrangement (faster, choir, double kick, war drums), not by volume. If you want the boss to lift, or
  the menus a touch louder than the battles again, it is one number each (`TRACK_GAIN` in `audioMix.ts`; +1 dB is ×1.12).
- If the music as a whole feels too far back on the phone's speaker, `MUSIC_LEVEL` (0.251) is the one number to raise.
- The army arrangements are gone from the game but kept in git (`tools/epic-music/tracks/<army>.mjs` before this change) if
  you ever want one back, say as a boss's own theme.
