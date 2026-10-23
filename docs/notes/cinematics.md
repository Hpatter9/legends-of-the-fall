# Cinematics (exploration, with two pilot scenes)

The owner's ask: "Let's explore adding some cinematics." This note is the proposal: what the player sees, how a scene is
written, what is built, and a list of the other moments that could get one, so the owner can pick what comes next.

## What the player does

- **Watches, or taps.** A scene fills the page like a film: black bars top and foot, a painted backdrop in the middle, the
  heroes and foes drawn from their own sheets, a chapter card, then the speaker's name and the line typed out under the
  picture. **A tap finishes the line, the next tap goes on.** **Skip** (top right) ends it in one tap, any time; so do
  Escape and a held-back tap on the last line. A scene is 20 to 40 seconds if left alone.
- **Once, at its moment.** A scene plays the first time its moment comes, and never again by itself (it is marked seen as it
  begins, so a closed page does not bring it back). The two pilots:
  - **The Road Begins**: right after a brand-new save picks its first heroes (the pack the player just took plays it, so
    the three on screen are theirs). Who the heroes are, what the Calamity is, what the king (the player) does, and a herald's
    shadow on the road. A save that already picked its heroes counts it as seen, so no old save is greeted with it.
  - **The Ashen Road**: the Calamity's first boss, Gorvak the Ashen, as the map-1 boss fight is set up. It ends on "His
    ribbon is on its way", and then the boss's own card (the ribbon slam) plays, so the two read as one moment. The hero in
    it is the one the run began with.
- **Again, from the codex.** A third tab on the Codex, **Scenes**, lists every scene: one not yet seen is a "???" with a line
  saying when it comes; a seen one has **Watch**. Replays change nothing in the save.

## How a scene is written

A scene is data (`src/sim/sceneScripts.ts`, the `SCENES` table), borrowed from Chronos Settlement's cutscenes:

```ts
gorvak: {
  id, title, blurb,                     // the Scenes list's name and line
  moment: { kind: 'calBoss', map: 1 },  // when it comes (`sceneRules.ts` `dueScene`)
  cast: {                               // who stands in it, by actor id
    hero:   { role: 'hero', x: 285, facing: 'right', hidden: true },
    gorvak: { role: 'unit:calBoss1', x: 395, facing: 'left', hidden: true, scale: 1.5 },
  },
  shots: [{
    look: 'volcano',                        // an area's painted backdrop (kept from the shot before if left out)
    cam: { on: ['hero', 'gorvak'], zoom: 1 },   // on an actor, a few, or a point; zoom 1 / 1.5 / 2
    to:  { x: 320 },                        // optional: drift to here over the shot
    acts: [{ who: 'gorvak', enter: 395, from: 550 }, { who: 'hero', pose: 'strike', line: 2 }],
    fx: ['fadeIn', 'darken', 'rumble'],     // shake / flash (one-shot), fades, a pall, a glow, a faint rumble
    cue: 'boom',                            // a sound as the shot begins
    caption: 'The first herald',
    lines: [{ who: 'gorvak', text: 'HALT. NONE PASS THE ASHEN ROAD.', tone: 'shout' }, { who: 'narrator', text: '...' }],
    hold: 2,                                // seconds for a shot with no lines, or after them
  }],
}
```

- **Roles**: `party:<i>` (the player's i-th party hero), `hero` (the Calamity run's first hero, else the party's first),
  `unit:<id>` (any fighter in `UNITS`: a foe, a boss, a hero kind) and `duchess`. Lines can use `{actor id}` for that
  actor's name.
- **Duchess** (the goat, `src/duchess.ts`, her sheet `art/duchess/goat.png` shared with the camp and the tavern) is a cast
  member with the role `duchess`: standing (chewing on her slow beat) or walking, facing as cast, and she speaks as an
  actor named Duchess. She has no fighter, so `castOf` gives her none and `drawGoat` in `render/sceneView.ts` draws her.
  Both pilots use her: she wanders in at the end of the opening ("Mehh.") and turns up on Gorvak's road as the grunt
  who was short.
- **Acts** can wait for a line (`line: 2`: starts as that line is spoken). `enter` takes `from: 'left' | 'right'` (the
  edge of the stage) or an x just out of the picture (so a walk-in fits the shot).
- A new scene is a table entry plus its moment in `sceneRules.ts` (`dueScene` is one lookup) and one call at that moment
  in `main.ts` (`playDue`). No new art, no new code.

## How it is built

- `src/sim/sceneScripts.ts`: the types, the scripts, `lineSeconds`, `fillLine`. Pure data.
- `src/sim/sceneRules.ts`: when a scene is due (`dueScene`), seen (`markSeen`, `meta.scenes`, optional: a save from
  before has none), who plays it (`castOf`), and the Scenes list (`sceneList`). Pure.
- `src/render/sceneClock.ts`: the pure clock, after Chronos's `sceneClock.ts`: a beat a line (and a hold), a tap goes to
  the next beat, where every actor stands (walks, enters, exits, poses, replayed shot by shot), and the camera (eased
  between a shot's `cam` and `to`). Tested without Pixi.
- `src/render/sceneView.ts`: the player. A small Pixi stage of its own made when a scene starts and destroyed when it ends
  (nothing costs anything the rest of the time; the sheets' textures are shared and kept), the page's bars, caption and
  subtitles over it, tap and Skip. A stage that cannot start counts as a scene skipped, so the game never waits on it.
- `src/cinematics.css`: the overlay (above the loading screen and the starter pick, as the opening plays under both) and the
  Scenes list. `codexView.ts`: the Scenes tab. `main.ts`: `playDue` at the two moments; `__game.playScene(id)` plays any.

### The rules it keeps

- **No flashing, nothing loops.** The only flash is a one-shot of at most 0.5 alpha for 120 ms at a shot's start. A shake
  is one decaying burst; `rumble` is a faint steady tremble. Shake, flash and rumble all follow the page's shake setting
  and reduced motion (the fight's own rule: both off, none of them). With reduced motion the lines appear whole (no typing),
  the camera does not drift and the chapter card does not fade.
- **Whole-number pixel scales.** The picture is drawn at scale 2, 3 or 4 only (zoom 1, 1.5, 2; never below what makes the
  backdrop cover the picture). A drift from one zoom to another steps up a whole size at its midpoint rather than blurring.
  Camera and actors sit on whole art pixels. (A fighter is drawn at its own `scale` from `UNITS`, as in the fight.) No
  tilt: a rotated sprite cannot stay crisp.
- **Text** is 12px (the chapter card too), regular weight, in the existing font tokens; the colours are Stone and Iron
  tokens.
- **Offline.** The scenes load nothing by URL that the page did not already: the backdrops are the existing `bg*.png` and
  `areas/*/bg*.png` (already in the service worker's `FILES`); the script, the player and the stylesheet are bundled into
  `game.js` and `index.html`. So nothing was added to `FILES`.
- **The sim is untouched.** A scene never touches a battle, and the only save change is the optional `meta.scenes`.

### Tests and screenshots

`test/cinematics.test.ts`: every scene is 20 to 40 seconds with brief lines and well-formed (known actors, areas, at most one
flash a shot); the clock (beats, tick, tap, walks, enters from a side or an x, exits waiting for a line, camera drift,
whole-number scales, the camera kept on the stage); who plays (party, lead hero, foes, the goat); when a scene is queued
(due once, not for the wrong map, not again once seen); the save (seen scenes kept, an old save counts the opening as
seen, junk dropped).

`tools/cinematics/shots.mjs` captures nine frames of each pilot by seeking the player (`__game.scenes.seek`, which holds the
clock still) at 393x852, 360x780 and 412x915; `tools/cinematics/strip.py` lays them side by side; `tools/cinematics/flow.mjs` walks
the real flows (new save, Skip, reload; Calamity map 1's boss, the card after the scene; the Scenes list and Watch).
Strips are in `docs/samples/cinematics/`. (Use `--use-angle=swiftshader` for headless Chromium, as the scripts do: the
`--use-gl` flags the older shot scripts use leave a band under the bars unpainted in a screenshot.)

## The scenes built (the owner: "Let's add all those cinematics")

Every scene is data in `sim/sceneEvents.ts` (the ones that come once, each its own) or `sim/sceneFamilies.ts` (one shape filled
from a table: the armies, the heroes, the buildings, the floors, the bosses), with `sceneKit.ts` holding the types and
shorthands, and `sceneScripts.ts` the two pilots and the `SCENES` table. A scene has a `moment` (a `Moment`, with a key:
`momentKey`), and `dueScene(meta, moment)` finds the one waiting. The page queues it with `queueScene(moment)` in `main.ts`:
they play one after another, and **the fight is held** (the renderer stops feeding the sim; the sim is untouched, so the fight
plays out the same) while one is queued or playing.

| Scene | Moment, and where `main.ts` triggers it | Length | State |
| --- | --- | --- | --- |
| The Road Begins, The Ashen Road | pilots (0.131.0) | 37 s, 38 s | wired |
| **Heralds**: The Bramble That Remembers, Item One: The Entrance, The Wall That Walks, The Last Flame, The End of All Roads | `calBoss` map 2 to 6, at the fight's set-up (`setupMoments`), before the boss's card | 32 to 39 s | wired |
| **The Calamity ends**: Nobody Wrote the Next Bit | `calVictory`: the fight that clears a Calamity, before the summary | 39 s | wired to the fight's end; **needs wiring to `cal-map`'s victory screen** (call `queueScene({ kind: 'calVictory' })` where the screen opens, and drop mine from the fight's end) |
| **The armies' last stands** (nine: `clear:<army>`) | `armyClear`: an army's first clear (`pay.firstClear`) | 26 to 28 s | wired |
| **Awakening** (45: `awaken:<hero>`) | `awaken`: the hero's first awakening step (`awakenView.onAwakened`) | 12 to 16 s | wired |
| **A hero earned** (ten: `earned:<hero>`) | `earned`: each hero `grantContent` brings in after a fight | 20 to 23 s | wired for the fight; **the hero-earned reveal of `hero-progress`** should call `queueScene({ kind: 'earned', hero })` and the fight's call go |
| **Five as One** (combo mega ultimate cut-in) | `combo`: `Game.playComboMega()` | 3 s | **waiting on `hero-skills`**: call `playComboMega()` the first time the mega ultimate fires |
| **It Was the Placing** (first loss) | `firstLoss`: the first fight lost, as its result comes up (with a retry waiting or not) | 38 s | wired |
| **She Was Not on the List** (Duchess in a fight) | `duchess`: her first visit to a fight (`PageGoat.onArrive` as she walks in) | 18 s | wired (to `battle-ui`'s random visit, on main in 0.137.0) |
| **The castle going up** (seven: `castle:<site>`) | `castle`: the first time each building (and the chapel) is raised (`Home` hook `onBuilt`) | 20 to 22 s | wired |
| **Spire milestones** (`spire:10`, `25`, `50`) | `spire`: the tower's fight at that floor is set up | 17 to 18 s | wired |
| **A boss changing form** (fifteen: `form:<boss>`) | `bossForm`: each time (`startPhase`), the fight held; one tap Skip | 3 to 4 s | wired |
| **The Hardest Setting Known to Boars** (Mythic) | `mythic`: an army run on the Mythic tier is set up | 28 s | wired |
| **The Right Room?** (first summon) | `firstSummon`: before the hall's show on the first summon | 25 s | wired; **drop it if `hero-progress`'s summon cinematic covers the first summon** (the Moment stays, so nothing else changes) |
| **A Bad Stand-Up Act** (first elite) | `elite`: the first elite fight's set-up | 27 s | wired |
| **More Health, and a New Hat** (Ascension 1) | `ascension`: the first fight of an Ascension 1 Calamity | 28 s | wired |
| **Brought To You By** (the daily's first boss) | `dailyBoss`: the daily's boss wave's set-up | 27 s | wired |

What the new shapes are:

- **A cut-in** (`short: true`): the boss changing form, and the combo. A scene of 2 to 6 seconds, not 10 to 40. The form cut-in
  has `again: true` (it plays every time the boss changes; the Scenes list can still replay it). It is two shots: a beat on the
  boss at **half pace** (`Shot.slow`: the clock runs at that share; reduced motion plays it at normal pace), then its words, which a test holds equal to the boss's phase
  banner line (`PHASE2`). The page holds the fight while it plays.
- **A family** (`Scene.family`): the Scenes list shows each seen scene with Watch, and folds the unseen ones into one line
  ("Awakenings: ... (44 to find)"), so 100 scenes do not make a list of 100 mysteries.
- **The awakened look** (`CastMember.look`, the act `{ who, look: 1 }`): a hero is drawn from its sheet and, when the light
  comes, in the tone `awakenLook.ts` gives it (a Pixi colour matrix of the same hue turn, colour and finish the menus use).
- **A scene never blocks the game**: a scene that cannot start counts as skipped, and the fight resumes.

### Music

Each scene has a `music` (the audio worker's scores, `musicScore.ts`): a herald its own (`gorvak`, `herald2` to `herald6`), and
the rest a shared mood (`triumph` for the last stands, the Calamity's end and the heroes earned; `comic` for the funny firsts and the
castle; `solemn` for awakenings and Mythic; `spire` for the tower). The player calls `playScene` as a scene begins and
`endScene` as it ends. A cut-in has none: the fight's music goes on. If `hero-progress` adds its own `music` field and call
site, keep one of the two.

### Cinematics off

`scenesOn()` reads `settings().cinematics !== false`, so the switch `hero-progress` adds drops straight in; until then it is
always on (and off in an auto-replay).

### Samples

`docs/samples/scenes-<id>.png` is a strip of every frame of one scene (the fixed ones); `scenes-awaken.png`, `-clear`,
`-earned`, `-castle`, `-spire` and `-form` are a sheet of the family, one frame of each scene. All at 393x852; made with
`node tools/cinematics/shots.mjs` (frames of every scene by `__game.sceneFrames`) and `python3 tools/cinematics/sheets.py`.

### Decisions the owner may want to change (the sensible default was taken)

1. **The castle scene plays once for each building** (seven), not on every level; every level would be a scene every few
   minutes of building. Say if "a new castle level" should mean something else.
2. **A boss's form cut-in plays every time**, as asked, about four seconds with one-tap Skip.
3. **Awakening plays for the first step only** (the second awakening is the same look, brighter).
4. **The first loss plays after any fight lost**, a run's or the daily's, once.
5. **Ascension 1's scene** plays on the first fight of an Ascension 1 run, whichever map.
6. **The spire** here is the endless tower (`mode: tower`).

## Decisions for the owner

1. **Where the opening plays**: it is after the starter pick now (so the three heroes are the player's own). Before the pick
   it could show a fixed trio instead, and give the pick a reason. Which?
2. **A "never show cinematics" setting?** Skip is one tap each time, and a scene plays once, so none was added. A switch in
   Settings is a few lines if they annoy.
3. **Sound.** A scene has only a cue or two as a shot begins (a boom, a rumble). A short music sting or a bed per scene
   (`audio-beds.md`) would help a lot, but is a bigger ask.
4. **Humour and Duchess.** The voice here is the Chronos voice at a small scale, and Duchess is in both pilots. Say which
   other scenes she should wander through.
5. **Which scenes next**, from the table above. The cheapest wins for the effect are the Calamity's other bosses and the
   hero awakening (one shape, 45 heroes).
