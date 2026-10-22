# Audio beds and new cues (phase 2)

Phase 1 put the sound on audiorective (`audio-engine.md`). Phase 2 adds a synthesised ambience bed for each place, a dozen
new cues, and replaces the battle drum beat with a rumble. No new files or URLs, so the service worker's `FILES` list is
unchanged and the game still plays offline.

## Files

- `src/render/audioBeds.ts`: `AmbientBeds`, an `AudioProcessor` on the `ambience` bus. `setScene(scene)` crossfades beds.
- `src/render/audioRules.ts` (pure): `sceneOf`, `BED_OF`, `BEDS` (the data for every bed), `ShotClock`, `shotGap`, `pickShot`,
  `twistCues`, `setChime`.
- `src/render/audioProcessors.ts`: the new cues in `SOUNDS`, and the rumble in `MusicPlayer`.
- `src/render/sound.ts`: `setScene`, `playAll` (cues with their own gain and delay), `probe` (debug).
- Tests: `test/audio-beds.test.ts` (new), `test/audio-engine.test.ts` (the music player test now checks the rumble).

## The beds

| Bed | Where (scene) | What it is |
|---|---|---|
| camp | **Battle tab** (`camp`) | fire body (low-passed noise, flickering), bright flutter, soft crickets (fast-pulsing high bands in slow bursts); a few fire pops every 2.5-5.5 s |
| tavern | **Heroes tab** (`tavern`) | murmur (two band-passed noises swelling out of step), a hearth; mug clinks and the odd pop every 4-9 s |
| hall | **Recruit tab** (`hall`) | low sine hum (two beating voices) with three high partials shimmering; a twinkle every 4-9 s |
| castle | **Castle tab and Spells tab** (`castle`, `spells`; one bed, so moving between them changes nothing) | quiet swept wind; a far bird every 8-18 s |
| armies | **Armies screen** (`armies`) | a very soft low rumble; a distant two-thump drum every 4-7 s |
| field | **Field fights**: any fight with no tower act (`field`) | soft wind; a bird every 6-14 s |
| crypt | **Tower act 1** (`tower1`), its map and its fights | cold low drone, dark noise; drips with an echo every 3-7 s |
| halls | **Tower act 2** (`tower2`) | wind through a feedback delay (an echoing hall); a gust every 6-12 s |
| storm | **Tower act 3** (`tower3`) | rain (high noise, two bands), low wind; far thunder every 9-20 s |

Acts 4 and up reuse the three, as the music does.

**Where the scene is set.** `Game.syncScene()` in `main.ts` works out `sceneOf(home.spot, run.tower?.act)`. The home screen's
tab or the armies win while it is up; otherwise the tower's act, else the field. It runs from `refresh()`, from the home
screen's show/hide observer, from a MutationObserver on `#towerMap`, and from `Home` through the new `onScene` hook (called
from `refresh`, `go` and `closeSub`). `setScene` ignores a repeat, so calling it often is free.

**Rules.** One bed plays at a time; on a change the new one fades in and the old one out over 1.5 s (`BED_FADE_S`), then the
old one's sources are stopped and every node disconnected. A second change during a fade cuts the one still fading at once,
so never more than two sound. A bed is 5 to 15 long-lived nodes; the only timer is one 500 ms `setInterval` that creates
nothing unless a one-shot is due. `ShotClock` keeps shots at least 2.5 s apart (`MIN_SHOT_GAP_S`), and a clock that jumped
(the page was away) gives one shot, not a burst. The timer does nothing while the context is suspended. The beds go through
the ambience bus, so they follow the Music volume, the mute (master), the visibility hush (the context is suspended) and the
ducker, as the music does. Randomness is `Math.random` (the renderer; the sim is untouched).

**Level.** I measured with `__audioApi.probe()` (RMS at the buses) in Chromium: the town track is about 0.0085 and the battle
tracks about 0.046; the beds sit at about 0.0035-0.005, under the town track and about a tenth of a fight's music. One-shots
are scaled by 0.3 (`SHOT_SCALE`) so they are a touch on the bed and never stand out from the music. `BED_LEVEL_MAX` (0.5) caps
any bed's own level, and a test checks it.

## The new cues

| Cue | Bus | Fires |
|---|---|---|
| `steps` (three footfalls) | sfx | `towerView.climbTo`: the party marker starts up the stairs |
| `twistCurse` / `twistBlessing` (a mixed twist plays both, softly, the second 220 ms later) | sfx | `twistView.playTwist`: when a twisted node is first tapped on the map (not again for the same node), and when a twisted fight's banner shows (`showTwistBanner`) |
| `eliteSting` | sfx | `main.startIntro`: the elite's intro card appears (a boss still gets the `boom` at its slam) |
| `setChime2` (a 2-piece chord) / `setChime3` (a 3-piece fanfare) | ui | `towerElites.relicChoice`: taking a relic that reaches a set tier (`setChime(pieces)`) |
| `coinRecycle` (coins tumbling down) | ui | `main.recycleHero`: Recycle |
| `coinClaim` (coins climbing, with a ring) | ui | `home.openAchievements`: Claim and Claim all |
| `sparkle` | ui | `main`, the Hire button: a hire that comes out above one star, on top of `merge` |
| `autoStart` | ui | `main.beginAuto`: an auto-replay begins |
| `autoStop` | ui | `main.endAuto` with the replay stopped or lost |
| `autoDone` | ui | `main.endAuto` with the replay finished |

`test/audio-engine.test.ts` already builds every cue in `CUES` on the fake context, so the new ones are covered there.

## The percussion fix

The drum layer was a fixed pulse near 104 bpm, not synced to the tracks. It is now an unpitched rumble swell: a looped noise
source through a 150 Hz low-pass, breathing slowly (0.18 Hz), faded in above tension 0.5 and quieter than before (`RUMBLE_SCALE`
0.12, was 0.2). It has no beats, so it cannot clash; it is five nodes made once when the fight runs hot and stopped and
disconnected about 1.8 s after the fight cools. The `perc` param and `percLevel`/`percActive` are unchanged.

## Checked

In Chromium at 393x852 with `__audioDebug()` (it now also reports `scene`, `bed` and `beds`, the number sounding):

- the scene follows Recruit, Heroes, Castle, Spells, Battle, the Armies screen, back to a tab, the tower map, a tower fight and
  a field fight (`hall tavern castle castle camp armies tavern crypt crypt field`); the act flipped to 2 and 3 gives `halls` and
  `storm`; `beds` is 2 only during a crossfade and 1 a couple of seconds later;
- the cues fired at their call sites (read from `window.__sfxLog`): `steps` on Climb, `twistCurse` and `twistBlessing` on tapping
  twisted nodes, `twistBlessing` and `eliteSting` when an elite fight began, `coinRecycle`, `autoStart`, `autoStop`, `autoDone`;
- no console errors or warnings from the page except Chromium's software-WebGL notices;
- mute drops the master to 0 and back; two ducks hold -8 dB (`duck` 0.4) and release; hiding the page suspends the context
  and showing it resumes it, with the same bed playing.

**Not exercised in the browser:** Claim (`coinClaim`) because the fresh save had nothing to claim, and the lucky-hire `sparkle`
(it needs a hire that lands above one star); both are a single `play(...)` at the call site named above. I cannot hear the
beds or cues, so how they sound is by design and by the measured levels, not by ear: the colours, the cricket and murmur
modulation rates, and the one-shot shapes are first guesses that `BEDS` (data) and `SOUNDS` (code) can retune.
