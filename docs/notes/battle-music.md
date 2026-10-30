# Battle music: one track a battle, victory music at the end

**Changed by [music-theme.md](music-theme.md):** the tracks are now the main theme in each army's dress; an army run takes its army's own track at every tier, and the daily, the Last Stand, spire floors and field fights the general `battle` (the seed and the depth no longer pick; `battle2` and `battle3` are gone). The rest below still holds.

**Changed by the camp fix below ([Off the board: no battle music at the camp](#off-the-board-no-battle-music-at-the-camp)):** the
camp, its tabs and the maps always play their own music now, even while a fight runs on behind the home screen.

The owner's ask: "The battle music should stay on and consistent through battle. Then at the end we need victory music if we win."

## What was wrong

- Every fight's `end` event (one per **wave** of an army, the daily or a spire climb) set the fight to none, rang the victory or
  defeat sting and put the deployment's music back. The next wave's Fight! picked a battle track again. So between waves the battle
  music dropped to the deploy track, and a victory sting rang after every wave, not once at the end.
- `fightLevel` chose `battle`, `battle2` or `battle3` by thirds of an army's waves, so one army run changed track twice; a boss wave
  switched to `boss` and back; the Last Stand changed track by depth and on its boss waves.
- The music player still moved a low-pass, a swell, the stems' pace and a rumble layer with the fight's tension. On the epic files
  this mostly showed while a battle track was still decoding (the low-pass closed on the track still playing, then opened), and on
  the synthesised fallback all the time.

## What it does now

**One track for the whole battle.** A battle is what the player fights through before a results screen sends them elsewhere:

| Battle | Its track (`trackOfRun` / `standTrack`, `src/render/battleMusic.ts`) |
|---|---|
| an army run (all its waves) | Legendary and Mythic: `battle3`; lower tiers: one of the three by the run's seed; a one-wave boss army: `boss` |
| the daily (ten waves) | one of the three by its date (the same all day) |
| a spire floor | a boss floor `boss`; else by depth (floor 1-9 `battle`, 10-24 `battle2`, 25 up `battle3`), an elite a step up |
| a Calamity spot | a boss `boss`, else `calbattle` |
| the Last Stand run | one of the three by its seed (a resumed run keeps its track) |
| a field fight (a plain stage run, old saves) | as a spire floor |

The track reads only what holds for the whole battle, so `begin()` can ask again at every wave and gets the same answer:
`startFight(track)` with the same track changes nothing, and the music plays on. A boss wave inside an army or the daily keeps the
battle's track. Between waves (the wave's result, the event card, the deploy, a heart burning and the fight resuming) the battle
track keeps playing: `musicOf` in `battleMusic.ts` plays the battle's track while a fight runs or the player is on the board.
Leaving the board between fights (home, the tower or Calamity map) lets the battle go (`atPlace`), so the next battle's first deploy
has the deployment's music again.

**Steady sound.** The fight's tension no longer touches the music: `setTension`, the tension low-pass, the swell, the pace-up and
the rumble layer are gone from `MusicPlayer` (`audioProcessors.ts`) and `sound.ts`; `audioRules.ts` keeps only the tower acts'
colour (`musicColour(act)`: a low-pass ceiling and a pace). A synthesised fallback track plays its full band (`stemLevels(track, 1)`)
the whole battle. A track with an epic file now counts as one while it is still decoding, so the act's colour never touches it
in that moment either. **Kept:** the menu/card ducking (`duck`, `bindDuck`): it holds the music about -8 dB with a low-pass only while
a sheet, the boss card or an event card is up, and lets it back to the same level when it closes. It is the player's own pause,
not the fight's.

**Victory music at the end, if won.** `main.ts` asks `endOfFight(run, won)` at the fight's `end` event and passes the answer to
`endWave` (`sound.ts`):

- `victory` (an army's or the daily's last wave won, any spire floor or Calamity spot won, a field fight won): the battle's track
  fades out (0.5 s), the `victory` fanfare plays, and from its last notes the `triumph` loop comes in at `VICTORY_BED` (0.6 of its
  level, about -4.4 dB) under the results and the run recap, until they are left (`endVictory()` from `afterResult`, or the move
  home or to a map), when the place's music returns. The fanfare is decoded while the battle plays (`warmSting`), so it rings at once.
- `defeat` (a battle lost with no heart left; the Last Stand's king falling): the defeat sting, then the place's music, as before.
- `none` (a wave won with more to come; a fall a heart revives): nothing; the battle track plays straight on.

`MusicPlayer.sting` now holds the music from the moment it is asked for (it used to start holding only once its file was decoded,
so a track asked for straight after could slip in first), and lets go if the file cannot be had.

**No doubling with a victory cinematic.** A cinematic scored with `triumph` (the army's first clear, the Calamity's ending) asks for
the track already playing: `playScene` leaves the fanfare and the loop running and lifts the loop to its full level; when the scene
ends the loop glides back to the bed (or the place's music, once the results are left).

An auto-replay plays the fanfare as each run is cleared; the next run's first fight cuts it short, as a new fight always cut a sting.

## Files

- `src/render/battleMusic.ts` (new, pure): `trackOfRun`, `standTrack`, `depthLevel`, `endOfFight`, `musicOf`, `atPlace`,
  `VICTORY_BED`, `VICTORY_LOOP`.
- `src/render/sound.ts`: `startFight(track)`, `endWave(end)`, `endVictory()`, `endFight()`; the music state is a `MusicState`.
  `__audioDebug()` now also gives `level`, `sounding` (the loops playing), `sting`, `battle`, `fighting`, `victory`, `sceneMusic`.
- `src/render/audioProcessors.ts`: `MusicPlayer` without tension or rumble; `setTrack(track, level)`; `warmSting`; the sting's
  hold begins at once.
- `src/render/audioRules.ts`: `musicColour` replaces `cutoffOf`, `rateOf`, `swellOf`, `percLevel`, `percActive`.
- `src/render/epicMusic.ts`: `FightMood`, `fightTrack` and `fightLevel` removed (moved, changed, to `battleMusic.ts`).
- `src/main.ts`: `begin` and the revive call `startFight(trackOfRun(run))`; the tick calls `endWave(endOfFight(...))` at the `end`
  event; `afterResult` calls `endVictory()`.
- `src/standView.ts`: `standTrack(seed)` once for the run; the king's fall calls `endWave('defeat')`.
- `soundRules.ts` `intensityOf` is no longer called by the page (kept: pure and tested; nothing else changed there).

## Tests

- New `test/battle-music.test.ts`: a battle's track is the same at every wave of every army at every tier and of the daily (its boss
  wave included); runs differ by seed and day; single fights by kind and depth; victory only at the whole battle's win and defeat
  only with no heart left; the state's track through breaks, victory and leaving; the player holds the triumph until the fanfare's
  file has decoded and played, then brings it in at the bed level, and a cinematic's same track glides up without a restart.
- Changed for the owner's new requirement (the old rule was pinned):
  - `test/audio-engine.test.ts`: "the music low-pass opens with tension, and the tension never quickens the pace past 8%" is now
    "the music is open and at its own pace with no act, whatever the fight is doing"; "the percussion layer is silent until the fight
    runs hot and full at the end" is removed with the rumble layer; the act test checks `musicColour`; "the music player crossfades
    tracks, colours them by tension and act, and keeps a rumble ... only while the fight is hot" is now "... holds a battle track
    steady (no tension filter or rumble), and colours by the act".
  - `test/epic-music.test.ts`: the `fightTrack`/`fightLevel` asserts moved (changed) to the new file; the epic track test no
    longer sets a tension.
  - `test/music.test.ts`: the player test no longer sets a tension (a battle's stems are its full band all along).

## Checked

`npm run typecheck`; `npm test -- battle-music epic-music audio-engine music battle-sound` (37 pass); the full `npm test`
(1415 pass, 0 fail); `npm run web`. In Chromium at 393x852 (`--autoplay-policy=no-user-gesture-required`), the Orc Warband's
waves 14 and 15 of 15 at ×2, the foes weakened by the harness, cinematics off, logging `__audioDebug()` each second:

```
 1s deploy w14            track=deploy                 (the run's first deploy on this page)
 1s fight  w14            track=battle3 (decoding)     battle=battle3
 4s fight  w14            sounding=battle3
20s won    w14            sounding=battle3  sting=none (wave won: no sting, the track plays on)
24s deploy w15            sounding=battle3  sting=none (Next wave, the deploy)
25s fight  w15 (boss)     sounding=battle3             (the boss wave keeps the track)
36s won    w15            sting=victory  sounding=none  track=triumph level 0.6 (battle faded, fanfare)
43s results               sting=victory  sounding=triumph (the loop in under the fanfare's tail)
48s results               sting=none     sounding=triumph level 0.6
52s run recap             sounding=triumph level 0.6
57s recap left -> armies  track=camp     sounding=triumph+camp (crossfade), then camp
```

With cinematics on, the first clear's cinematic (scored `triumph`) took over the same loop at full level without a restart or a
second fanfare. Screenshot of the results: `docs/samples/battle-music-results.png`. The Last Stand, the spire, the Calamity and
the daily were checked by the tests, not played in the browser.

## For the owner

- I cannot hear sound: the bed level (0.6) and when the triumph loop comes in under the fanfare (6 s before its end) are by design.
- Which battle track a run gets is my call (above). If you would rather the boss track came in for an army's boss wave after all,
  or the tiers each had a fixed track, it is one line in `trackOfRun`.

## Off the board: no battle music at the camp

The owner: "Music sounds like it runs from the fights into the main screen after. Am I hearing that right?" Yes.

**What was wrong.** The Home button works mid-fight: the home screen comes up and the fight carries on behind it (the frame
loop keeps stepping a fight while `homeUp`; an auto-replay's fight, the daily's and an army wave's alike). `atPlace` kept the
battle while `fighting` was true, and `musicOf` played the battle's track whenever a fight was running, wherever the player
was. So the battle track went on playing at the camp, on every tab, until the fight ended behind it; and a won battle ending
there rang its fanfare at the camp. A new run begun from the camp while the old fight was still running also left the old
battle's track on the new board's deploy (the old fight never sent its `end`).

A second leak was in the player (`MusicPlayer.play`, `audioProcessors.ts`): a new track, once baked, let go only the track
asked for just before it. Leaving a won battle's results does two changes at once (`endVictory` asks for the deployment's
music, then the home screen's camp follows before it has baked), so the triumph loop was never let go and played on under
the camp's music. The same held for any two quick changes (a battle track, a map, then the camp).

**The rule now** (`battleMusic.ts`): off the board (the camp, any tab, the armies, a tower or Calamity map) the music is
the place's own, whatever happened before. A cinematic's score is separate and above it, as before.

- `musicOf`: anywhere but the board, the place's track at full level; the triumph bed and the battle track only on the board.
- `atPlace`: a fight still running behind the home screen keeps its battle (and drops any victory), so going back to the board
  brings the battle's track back; a battle that is over or left is let go, as before.
- `endAt(state, end)` (new, pure; `endWave` in `sound.ts` plays what it says): a fight that ends while the player is off the
  board rings no sting and holds no victory music.
- `MusicPlayer.play`: a track that comes in lets go of every other loop, not only the one asked for before it.
- `main.ts` `newBattle`: a board replaced while its fight was still running calls `endFight()`, so the new board has the
  deployment's music.

**Before and after, in the page** (`tools/music-camp/probe.mjs`, Chromium at 393x852, `__audioDebug()` read on the home screen;
`node tools/music-camp/probe.mjs <port> [paths]` after `npm run web`):

| Way back to the camp | Before (what played on the home screen) | After |
|---|---|---|
| An army wave: Home mid-fight (the fight runs on behind) | **the battle track** (`orcs`), `place: camp` | `camp` (the battle kept, unheard) |
| ... then the wave ends behind the camp | `camp` | `camp` |
| An auto-replay: Home mid-fight | **the battle track** (`orcs`) | `camp` |
| The daily: Home mid-fight | **the battle track** (`battle`) | `camp` |
| The Last Stand: Home over the stand (the probe reached it by the page's Home) | **the battle track** (`battle`) | not re-run; the same rule (`musicOf`) |
| A won army run: the results, the recap, then home | not reached by the first probe; the same player code, and the after-run of the state fix alone showed **`triumph` and `camp` both sounding** at the camp | `camp` only |
| A won army run: Home straight from the results | `camp` | `camp` |
| A wave won: Home from its result | `camp` | `camp` |
| A run lost: the result, the recap, then home | `camp` (the defeat sting lets the battle go) | `camp` |
| The Last Stand: left mid-wave | `camp` (`leave` calls `endFight`) | `camp` |
| The Last Stand given up, Home from its end card; a Calamity spot | not reached in the page (the machine was heavily loaded: the end card did not come within 90 s, and the Calamity map's spot did not open) | covered by the pure tests: every place and state |

**Tests** (`test/battle-music.test.ts`): "off the board ... there is never battle or victory music, whatever happened before"
(every battle, fighting, victory and place, asked straight, after the move and after a fight ends there) and "a fight ending
on the board rings its sting ..."; "two track changes in a row leave only the last one playing ..." (the player; it fails on
the old `play`). **Changed for the owner's requirement:** the old assert "a fight still being fought keeps
its battle, wherever the page says the player is" (the battle track at the camp) now says the camp plays the camp's music
and the battle comes back on the board.
