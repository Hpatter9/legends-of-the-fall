# Cinematics

## CINE-001: shot language, every story scene cut as a film

The owner: "Let's make cinematics for it. But make the cinematics more epic, and movie-like. Different camera angles, close-ups,
lines." Asked which: "All story scenes." Branch `claude/cinematics`.

### What the player sees

- **Every scene is cut as a film.** An establishing wide shot first; whoever speaks in close-up (a hero's **painted portrait** filling
  the picture, the land behind thrown out of focus; a foe, a boss, the king or Duchess drawn large and sharp from their own sheets);
  over-the-shoulder shots when two trade lines; a reaction shot (a held look at the hero) after a boss roars; a boss **seen from the
  ground** as it comes on, its name and title on a **title card**; a **Dutch tilt** when a villain menaces; a slow **push in** on a
  hero's resolve; and a **smash cut** to black straight into the fight. Quest givers (Gwen, the pedlar, the hunter, the pilgrim) speak
  with their face over the picture.
- **The air and the light.** Each land's weather drifts through the picture (embers on the volcano and the forge, ash over the war
  camp, snow, rain in the swamp and the graveyard, dust in the desert and the ruins, motes in the dungeons and temples, leaves in
  autumn); shafts of light slant through the wide views of the bright lands; a vignette; the land's own boulders, dark and out of
  focus, at the edges of the wide views; the letterbox closes in on a close-up.
- **Lines that feel spoken.** Typed at the pace of their punctuation (a breath at a comma, a stop at a full stop, longer at a dash or
  an ellipsis); a word marked `*so*` is said with weight (brighter, a touch slower); a faint blip in the speaker's voice under the
  typing (the narrator's quill, a hero's, a boss's growl, a beast's, the king's, the goat's); beats of silence (`say(..., tone, beat)`);
  the score held down while a line is said.
- **Sound.** A hit on a smash cut, a whoosh through a flash and a snap zoom, a swell under every low-angle reveal, on top of the scenes'
  scores and stings.
- **Controls.** A tap finishes the line, the next goes on; **holding a finger down** (a ring fills, 650 ms) or **Skip** ends the scene;
  Escape too. The Cinematics setting is kept as it was: quest stories always play (they explain the quest); everything else follows the
  setting (off: the old boss card, the old act card). **Reduced motion:** nothing moves, tilts or zooms, every cut is a cross-fade, no
  smash at the end, the lines appear whole. **Battery saver:** a third of the motes, no blur, no light rays, the canvas at 2x at most.

### The shot vocabulary (`src/sim/sceneKit.ts`)

| Field | Values |
| --- | --- |
| `angle` (framing) | `wide` establishing; `medium` knees up; `two` a pair; `close` one face; `extreme` the eyes; `ots` over the shoulder; `low` from the ground, looking up; `high` from above; `dutch` tilted |
| `subject` | the actor the framing is on (else the speaker, else the camera's `on`) |
| `move` | `still`, `pushIn`, `pullOut`, `pan`, `track`, `rack` (focus pulled from the land to the subject), `snapZoom`, `drift`, `shake` (hand-held) |
| `cut` (into the shot) | `cut`, `match`, `fade`, `smash` (through black, with a hit), `flash` (through white), `dissolve` (cross-fade) |
| `weather` | `embers`, `snow`, `rain`, `dust`, `motes`, `ash`, `leaves`, `none` (left out: the land's own) |
| `rays`, `title` | light shafts; a title card `{ over, name }` (the act over the room; a boss's title over its name) |
| `Scene.out` | `smash` (into the fight) or `fade` at the scene's end |
| `Line.beat`, `*emphasis*` | a silence after the line; a word said with weight |
| role `face:<giver>` | a quest giver heard over the scene, their face shown as they speak |

The old fields (`cam`, `to`, `acts`, `fx`, `cue`, `caption`, `lines`, `hold`, `slow`) work as before.

### How to author a scene

Write it as before; frame the shots that matter with `shoot(angle, subject?, move?, cut?)`:

```ts
{ cam: wide(420, 205), ...shoot('low', 'oni', 'pushIn', 'smash'), acts: [{ who: 'oni', enter: 420, from: 'right' }], cue: 'boom',
  title: { over: 'Toll-Keeper of the Eastern Span', name: 'The Bridge Oni' }, lines: [tell('At the far end, something with a club and a ledger has set up a toll.')] },
{ cam: close('oni'), ...shoot('dutch', 'oni', 'drift'), lines: [say('oni', 'One coin a head. You have *two* heads. I will take both.', 'shout')] },
```

Leave the rest to the **director** (`src/sim/cineDirector.ts`, `direct(scene, { calm })`, pure): a shot without an `angle` and with
several lines is split into a shot a line (the first keeps the written framing; the rest are the speaker's close-up, over the
shoulder when two trade lines, a big foe's shout from below or tilted, a whisper in tight, the narrator back on the master view; acts
waiting for a line go with it, a held pose is held on); a big foe coming on (`scale >= 1.3`, not a hero) is a low angle through a smash
cut, named on a title card in a boss scene; a reaction close-up (0.9 s, two a scene at most) follows a big foe's shout; every shot gets
its move, its cut (a fade first, a dissolve where the land changes), its weather and rays; a boss scene ends on a smash cut. The lines,
their order and their time are kept (a test holds it: a directed scene is the written one plus its reactions). The player directs
every scene as it plays it (`ScenePlayer.play`), and the preview frames (`__game.sceneFrames`) are the directed scene's.

### The numbers (`src/render/cineShots.ts`, pure, for anyone to reuse)

`frame(angle, move, base, aim, t, len, calm)` is the whole camera: where a framing looks (`ZOOM_OF`, `AIM_OF` on the subject's figure),
how a move changes it over the shot, the tilt and the land's blur. `cutVeil(cut, t)` and `outVeil(out, left)` are the cuts and endings,
`typeTimes`/`typedCount`/`emphasis` the words, `VOICE_CUE`/`blipsBetween` the voices, `pressOf` the hold to skip, `weightOf` what a
battery saver and reduced motion leave out. **For the War Horn and Eidolon call** (`claude/war-horn`): a moment of its own can frame its
shots with `frame()` and come in with `cutVeil()`, or be written as a `Scene` and played by `ScenePlayer`.

### The player (`src/render/sceneView.ts`)

The pixel stage is drawn sharp at the next whole-number size into a texture, then eased down to the camera's real size (and tilt), so
a slow push in glides without the pixels crawling. (This replaces the old rule of whole-number scales only and no tilt: the owner asked for
camera moves and angles; the pixels stay square in every frame, softened by at most a screen pixel at the edges.) A hero's close-up is
the portrait cutout `heroes/<kind>-portrait.webp` (or `heroes/awakened-<kind>.webp` once awakened), framed on its head (found by
scanning the picture's paint; seven heads set by eye, `FACE_AT`); every file is already in the service worker's list. Quest givers' faces
are `questArt.ts`'s (Gwen's talking frames from her sheet). A dissolve keeps the last picture in a second texture. Particles, rays, the
vignette and the veils are a few `Graphics` redrawn each frame (no allocation per mote). The page's HUD (`#cutscene`) is one for the page,
shared by the Last Stand's player.

### Scenes rewritten or added

- **Quest battles** (all eleven, `questBattleData.ts`): each story before rewritten in shots (an opening wide, close-ups for every line,
  the boss's low-angle entrance with its title card, a closing beat, a smash cut into the fight), with new lines where they were thin
  (the Bridge Oni's toll, Captain Brine's bill, Ravi's matches, Zofia's small print, Mr Quill's "initial here", the Conductor's
  *FORTISSIMO*, Vesper's "Then I shall deliver it", the Sweeper's "OFF. THE. FLOOR."); the givers speak their own openings (the pedlar,
  the hunter twice, Gwen, the pilgrim); each beat after framed and closing on a pull-out.
- **Army intros** (new, nine: `intro:<army>`, family "The armies on the march", moment `armyIntro`): the first time a run of an army is
  set up (wave 1), once a save; an army whose last stand was already seen is not introduced. The land, an underling, the warlord's
  low-angle entrance with its title card, its boast tilted, the underling's aside, a hero's answer, a smash cut.
- **Boss arrivals** (new, `cineMoments.ts` `arrivalScene`): with cinematics on, a boss's first meeting (the boss card's own once-a-save
  rule, `cardDue`) is a six-second villain entrance (the ground trembling through black, the figure from below with its name and title,
  its line tilted and too close, a smash cut) in place of the slam-down card, unless a scene has just introduced it (a herald). Every
  boss with a title has its own line (`ARRIVAL_LINES`); quest bosses and named elites use their own names and titles.
- **The Last Stand's act cards** (`actScene`): with cinematics on, each new room is a short film: "Act II" over "The Library" through
  black, the king and the heroes coming in, the ruler's line in close (the same `roomLine` as the card), Duchess's aside, the heroes from
  below, a smash cut back into the fight. Cinematics off: the old card.
- **The opening**: a title card ("Legends of" over "The Last Keep"), the warlord's low-angle entrance, a snap zoom on the hero who wants
  to stand three miles back, a pull-out on "The first army was on the road."
- **The heralds and Gorvak**: the director's coverage, each herald named on a title card as it comes on, Gorvak's strike from below.
- **The armies' last stands**: the beaten boss seen from above, its last words tilted, a pull-out to close. **Awakenings**: a rack
  focus onto the hero, then the light from below. **Forms**: a snap zoom from below, then the line tilted. **The Last Stand's
  milestones**: the king's resolve from below. **Everything else** (the Calamity's reveal and end, the first loss, the firsts, the castle,
  the Last Oaths): the director's coverage.
- A data fix: the Duchess fight scene's foe flinched on a line its shot did not have (it never flinched); now on the shot.

### Tests and checks

`test/cine-shots.test.ts` (15 tests): the director keeps every line and its time (plus at most two reactions); every directed shot of
every scene (the table, the 22 quest stories, the arrivals, the act cards) has a framing, a move, a cut and its air; the split, the
close-ups, the boss from below with its card and the reaction; a framed shot kept; reduced motion (no moves, no tilt, cross-fades, no
smash, a still camera); the camera's framings and moves; cuts and endings; the typing's pauses and emphasis; hold to skip; the battery
saver; a directed scene played through by the clock and by taps; every army's intro due once; every arrival and act card short with a
smash out; the quest stories' boss entrances. The existing cinematics, scene-fixes and quest-battles tests still pass unchanged.

Frame strips: `docs/samples/cine-*.png` (393x852; `-360` and `-412` at the other sizes; `-calm` with reduced motion), made by
`node tools/cinematics/cine-strips.mjs out/web <raw> --sizes=393,360,412` and `python3 tools/cinematics/cine-strip.py <raw> <id> <out>`
(the script also checks for page errors, sideways overflow, Skip and the held finger).

---

# Cinematics (the pilots, and every scene since)

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
| **The Calamity ends**: Nobody Wrote the Next Bit | `calVictory`: a cleared Calamity's summary is opened, before the victory card | 39 s | wired |
| **The armies' last stands** (nine: `clear:<army>`) | `armyClear`: an army's first clear (`pay.firstClear`) | 26 to 28 s | wired |
| **Awakening** (45: `awaken:<hero>`) | `awaken`: the hero's first awakening step (`awakenView.onAwakened`) | 12 to 16 s | wired |
| **A hero earned** (ten: `earned:<hero>`) | `earned`: `hero-progress`'s reveal (theirs, on main): `revealEarned` after a result | 5 to 14 s | wired |
| **The Last Oath** (eight sets: `oath:<set>` the first time, ~10 s with a line from each of the five, and `oathcut:<set>` every time after, ~3 s) | `combo` / `comboCut`: the combo's `comboCast` event, played by the set's five (`Game.playComboMega(setId)`) | 10 s / 3 s | wired; the fight is held while it plays, one-tap Skip, off with the Cinematics switch (`scenesOn`) |
| **It Was the Placing** (first loss) | `firstLoss`: the first fight lost, as its result comes up (with a retry waiting or not) | 38 s | wired |
| **She Was Not on the List** (Duchess in a fight) | `duchess`: her first visit to a fight (`PageGoat.onArrive` as she walks in) | 18 s | wired |
| **The castle going up** (seven: `castle:<site>`) | `castle`: the first time each building (and the chapel) is raised (`Home` hook `onBuilt`) | 20 to 22 s | wired |
| **Spire milestones** (`spire:10`, `25`, `50`) | `spire`: the tower's fight at that floor is set up | 17 to 18 s | wired |
| **A boss changing form** (fifteen: `form:<boss>`) | `bossForm`: each time (`startPhase`), the fight held; one tap Skip | 3 to 4 s | wired |
| **The Hardest Setting Known to Boars** (Mythic) | `mythic`: an army run on the Mythic tier is set up | 28 s | wired |
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

Each scene has a `music` (the audio worker's scores, `musicScore.ts`), played by the scene player through `playScene` as a scene
begins and put back with `endScene` as it ends or is skipped. A herald has its own (`gorvak`, `herald2` to `herald6`); the rest a shared
mood: `triumph` (the last stands, the Calamity's end, the heroes earned, Mythic, Ascension 1, the Last Oath), `comic` (the funny firsts,
the castle), `solemn` (awakenings), `spire` (the tower, the first elite, the daily's boss). Stings: `sceneBoss` on a herald and a Last
Oath, `sceneVictory` on the Calamity's end and the last stands. A short cut-in (a boss changing form, the short Last Oath) has no score:
the fight's music goes on.

The Last Oath cut-in uses the pilot's black bars (no slide-in: the overlay is black already) and a one-shot flash in the short version; the
full one has the `triumph` score, both the `sceneBoss` sting. Samples: `scenes-oath_holyOrder.png` (first), `scenes-oathcut_holyOrder.png`
(short), `scenes-oath_dreadCourt.png`.

### Cinematics off

`scenesOn()` reads `settings().cinematics` (the Settings switch), and is off in an auto-replay; with it off, a scene is
still marked seen as its moment passes (so the Scenes list can play it), and only the in-battle effect shows. **Every scene ends with one tap on Skip** (top right; Escape too); a tap elsewhere moves on a line.

### The summoning cinematic is gone

The owner: "The summon cinematic isn't even close to a cinematic." It is cut: a pull goes straight to the hall's own show (`hall.ts`,
`summonRules.ts`, the card reveal) as it did before. The `summonScene` function, its moment, its test and the "Summoning scene"
Settings row are removed; an old save's settings with a `summonScene` field are read without it (a test holds that). The talking scenes
and the Last Oath cut-ins stay. The `quick` argument of `ScenePlayer.play` (a tap ends the scene) is left, unused.

### The backdrop (a white band, reported on the spire)

A white band across the sky of the Duchess scene was reported mid-fight on a phone; it could not be reproduced (the same scene mid-fight
at 393x852, 360x780 and 412x915, and at device pixel ratio 3, drew whole). The player's backdrop is hardened all the same: the layers
are plain sprites, four side by side and anchored to the bottom (no `TilingSprite`, so nothing tiles upward or needs a repeating
texture), laid over a fill of the land's own sky colour (`SKY` in `sceneView.ts`), and a layer that fails to load or is empty is left
out rather than drawn. `tools/cinematics/blank.py` scans frames for a flat white (or long flat black) band; run over every scene at the
three sizes (1527 frames, `shots.mjs --every`) it finds none. `flow5.mjs` plays a scene mid-fight and checks the fight's clock is held
while it is up and runs again after Skip, at all three sizes.

### Checked in the real page

`tools/cinematics/flow2.mjs`: a new save plays its opening and Skip ends it; an old save (no scenes list) starts with none; a boss
changes form, its cut-in plays, **the fight's clock does not move while it is up** and goes on after Skip; the lost fight brings the
first-loss scene as its result comes up; no page errors. `flow3.mjs`: the Holy Order's five fill the bar and the combo's cut-in plays.

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
