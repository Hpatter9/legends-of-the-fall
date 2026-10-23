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

## Moments that could get a scene (pick what you like)

Each is a table entry and a call at its moment; the pitch is the joke or the beat.

| Moment | Pitch |
| --- | --- |
| **First army cleared** (the Orc Warlord falls) | The orcs hold a meeting about who is going to tell the Warlord's mother. The heroes wait politely. |
| **Each Calamity boss, maps 2 to 6** | Their entrances, one a map, each with its staffing problem. The Thorn Warden (the bramble that remembers every axe) does not say a word and everyone feels judged; Malphas has an imp on a clipboard; Hrungar is shoved in the first shot, once, to see; Vorgrath's last flame is a candle he is protecting from a draught. |
| **The Calamity's end** (Karnok, map 6, falls) | The big one: the final herald down, the sky un-reddens, the heroes realise nobody wrote the next bit. Ends with the king being thanked and a meteor, just in case. |
| **A hero awakened** | A short beat on that hero alone: the light, the new look, a line in character (each hero already has a `HERO_STORY`). One scene shape, filled per hero. |
| **A hero's first unlock** (shards or a milestone) | The hero walks in, the others make room, someone asks about the sandwiches. Three shots, the hero's story line as the caption. |
| **A tower milestone** (the tower opens at floor 10; floors 25 and 50) | The tower builds itself a taller hat. The first time up: "It was shorter from outside." |
| **The daily's boss** | A newsreader's voice over the day's foe: "Today's calamity is brought to you by..." Once per day, skippable forever. |
| **The first summon** (the hall) | The summoner looks at the circle, the circle looks back; the first hero steps out and asks if it is the right room. |
| **A castle upgrade** (the Chapel, the first Library) | The builders finishing a wall, a roof, a long argument about the roof. |
| **A boss's second form** | Three seconds, not thirty: a cut-in on the boss as it changes (the phase banner already holds the fight; this would dress it). |
| **First elite met** | The elite introduces itself like a bad stand-up act. |
| **First loss** | The heroes regroup at the castle; the king is blamed, politely. Seen once, then never. |
| **Ascension 1 opens** | The Calamity, offended it was beaten, comes back with "more health" and a new hat. |
| **Each army's first boss** (nine) | A cold open of the army's own: the Undead's Lich King on hold with the afterlife, the Ogres' arguing about lunch. |

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
