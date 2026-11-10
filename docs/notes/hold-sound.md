# HOLD-SOUND: fitting sound for everything added lately

Branch `claude/hold-sound`, from main 0.452.0. The ask: make sure the Assault's nine holds, the new scenes, the battle changes and the new
menus all have fitting sound; audit what plays, fill the gaps with the game's own engine, and list what needs a call. The Calamity and the
Last Stand are hidden (`src/sim/hiddenModes.ts`) and were skipped.

I cannot hear sound. Every level below was set by measuring the page's own output (`tools/audio-mix/measure.mjs`, LUFS), and every hook was
checked in Chromium by what the engine says it is doing (`__audioDebug()`) and which cues fired (`__sfxLog`). How the new cues and beds
*sound* is by design, in the style of the ones already there; each is a few lines of data (`BEDS`, `SOUNDS`) to retune by ear.

No file is loaded by URL, so the service worker's `FILES` list is unchanged and the game still plays offline.

## 1. The audit: what played before, and what plays now

### The Assault

The biggest find: **the Assault's field had no music of its own and no ambience.** `assaultScene.ts` asked for the battle track
(`startFight`), but the music follows the *place* the page is in, and the page behind the Assault was still the Armies screen. So the camp's
theme and the armies' rumble played through the whole siege, the boss track never came in at the lord, and no sting marked the end. The
blows near the camera had their sounds (`playEvents`); nothing the hold itself did had any: the toasts ("The great horn sounds!", "A war
drum falls silent") were silent.

| Moment | Music before | Music now | Ambience before | Ambience now | Cues before | Cues now |
|---|---|---|---|---|---|---|
| The war table (the muster, the plan) | `camp` | **`deploy`** (it is the Assault's deployment) | `armies` (a rumble, far drums) | `armies` (kept: the host's own camp) | `tap` | `tap` |
| The Last Hold's war table | `camp` | **`calmap`** (the dark map music; nothing else plays it while the Calamity is hidden) | `armies` | `armies` | `tap` | **`lastHold`** as it opens (a tolling bell over a dark chord) |
| The march (the field opens) | `camp` | **`battle`** | `armies` | **the hold's own bed** (below) | none | **`hostMarch`** (drums quickening, a horn); the Last Hold adds **`lastHold`** |
| The field | `camp` | **`battle`** (heard at last) | `armies` | the hold's bed, **its drums beating over it** | the blows near the camera | the blows, and every event below |
| The lord wakes | `camp` (the boss track was asked for, never heard) | **`boss`**, crossfading in over 1.5 s | | | none | **`standBoss`** as he comes down from the throne |
| A hold conquered | `camp` | **the victory fanfare, then the `triumph` bed under the result** | | the drums stop | none | **`keepFall`** as the lord falls |
| The War's end (the Last Hold falls) | `camp` | the fanfare and `triumph` | | | none | `keepFall`, then **`warEnd`** over the fanfare (bells pealing over a great bright chord) |
| The host beaten back, or night | `camp` | **the defeat sting**, then `deploy` under the result | | | none | |
| The retreat sounded | `camp` | `deploy` under the result (no defeat sting: it was a choice) | | | none | **`greatHorn`** |
| Back to the Armies screen | `camp` | `camp` | `armies` | `armies` | | |

**The nine holds.** Each has its own bed under the battle and its own voice for its "drums" (the page already names them differently for
each hold, `DRUMS` in `holdCodex.ts`; now they sound different too). The drums are a line of their own over the bed: they beat about every
2.6 s while all stand, slower as each is silenced (two of three every 3.9 s, one of three every 7.8 s), and stop when the last is silenced.

| Hold | Bed (new unless said) | What is in it | Its drums beat as |
|---|---|---|---|
| Bloodtusk Hold (orcs) | `warcamp` | the forge's roar and its bellows, the cook fires' flicker, the murmur of the yards; hammers on anvils, fire pops, a crow | war drums (two low thumps) |
| The Barrow Necropolis (undead) | `barrow` | a cold drone and a hollow fifth, thin wind through the stones, a long echo; drips, a crow, a gust | bone bells tolling |
| The Howling Den (beasts) | `den` | a howling wind over the crags and its low roar; wolves far off, gusts | the howling stones: a wolf's howl |
| Elder Root (wildwood) | `forest` (existing) | the trees in the wind, insects; birds, a crow | the pipers' rings: a wandering phrase on a pipe |
| The Heart of the Maze (labyrinth) | `maze` | still air in stone passages, a low drone, a long echo; drips, a gust, a far low horn | the horned altars: a low horn |
| Bonefire Crag (ogres) | `bonefire` | the great fires roaring, a bright crackle, the wind on the crag; pops, a flare | the bonefires flaring |
| Brimstone Gate (infernal) | `volcano` (existing) | the lava's deep rumble, the roar of fire; pops, a far eruption | the fire circles flaring |
| The Moonlit Shrine (yokai) | `shrine` | the night's insects, wind in the pines, a singing-bowl note; the shrine's small bells, a low bell | great war drums: a taiko's three beats |
| The Iron Foundry (golems) | `foundry` | the furnaces' roar, the engines' low throb, leaking steam; hammers, a hiss of steam | the steam hammers: a hiss, then iron on iron |

**The field's events** (`holdCues` in `src/render/holdSound.ts`; all were silent before):

| Event | Cue | Heard |
|---|---|---|
| A gate struck | `gateHit` (timber, its iron bands ringing) | near the camera only, panned by where it is |
| A wall or the palisade struck | `wallHit` (a dull crack, grit) | near the camera, panned |
| A drum struck | `drumHit` (the skin's dead thud) | near the camera, panned |
| The ram's head swung home | `ramHit` (a deep boom, the gate groaning) | near the camera, panned |
| A gate broken | `gateBreak` (the crash, timbers splintering, the bands ringing) | everywhere |
| A wall breached | `wallBreak` (a long rolling crash, the rubble settling) | everywhere |
| A sally port thrown open from inside | `gateBreak`, softer | everywhere |
| A ladder up / pushed down | `ladderUp` / `ladderDown` | near the camera, panned |
| The trebuchet let go, then its stones landing | `trebLoose`, then `fireBoom` + `earthRumble` | everywhere |
| A keg lit, then its blast | `fuse`, then `fireBoom` + `wallBreak` | everywhere |
| A hut burning / the reserve camp burnt | `fireWhoosh` (+ `fireBoom`) | everywhere |
| A weak point found | `weakPoint` (a tap on hollow stone, a clear rising pair of notes) | everywhere |
| The great horn | `greatHorn` (a long low call) | everywhere |
| A drum silenced | `drumSilenced` (its last beat, the note falling away), and the drum line thins | everywhere |
| A band down the Warpath | `horn`, soft | everywhere |
| The Warpath held | `star` | everywhere |
| A captain sallies / the lord comes down | `eliteSting` / `standBoss` | everywhere |
| The wolves ride round | `wolfHowl` | everywhere |
| A hero rises at the rally flag | `heal`, soft | everywhere |
| A gate duel called; won; lost | `eliteSting`; `levelUp`; `kingHit` | everywhere |
| The warchief flees | `blink` + `dash` | everywhere |
| The lord falls (the keep) | `keepFall` (a long sinking brass chord, a great bell, the walls' rumble) | everywhere |

Quiet on purpose: a feint, a rout, a post waking, a soldier fallen, a taunt (its box shows; the battle's own blows carry the rest).

### The new scenes

| Scene | Music | Cues | Missing |
|---|---|---|---|
| The nine `boss:<army>` arrival films | none of its own: the deployment's or the battle's plays on, held down 3 dB under the words (`cinematic`) | `sceneBoss` (the scene's sting), `earthRumble` on the land's shot, `boom` as the name card slams, the smash cuts' `cineHit`, the voices' blips | nothing. A boss's own theme per army would be new music (see the calls) |
| The boss form-change card (`form:<boss>`) | the boss track plays on | `boom` on the slow beat, then `bossSlash` (the roar) with the flash and the title card, `cineHit` / `cineWhoosh` on the cuts | nothing |
| `form:warchief` | the boss track plays on | the same as any form card | nothing |

These were complete; I changed nothing in them.

### The battle changes

| Change | Before | Now |
|---|---|---|
| The 3-second hand-fired ultimate: the build-up (1.45 s) | `ultSlash` at the start (0.7 s long), then about 0.7 s with no sound of its own before the blow | `ultSlash` and **`ultCharge`**: a tone and a band of air climbing for the whole build-up, a pulse quickening under them, ending at the blow |
| Its freeze (0.24 s) and landing | `ultImpact` | `ultImpact` (unchanged) |
| Its slow beat (0.5 s) | nothing of its own | **`ultSlow`** as the freeze lets go: the pitch dragged down and let go. Not played with reduced motion (which has no freeze or slow beat) |
| The doorway swap (`unjam`: a blocked melee hero changes places with its own shooter) | two `blink`s, a spell's teleport | **`steps`**, soft: two fighters shuffling past each other. A kit's or a spell's swap still blinks (`isDoorwaySwap` tells them apart by the stamp `unjam` leaves) |
| The 0.451 effect cues (laid ground, the marks, Immune) | present: `terrainCue`, `markCue`, a soft `block` | unchanged; checked that each maps to a cue that exists |

### The menus

| Menu | Before | Now |
|---|---|---|
| The rune bench's pull bar sliding | `tap` | **`runeSlide`** (stone sliding on stone, a click home) |
| A rune merging (and Merge all) | `merge` (the heroes' merge chime) | **`runeMerge`** (a grind, a crack of light, a rising chord) |
| A rune dropped on a hero (and Rune Auto) | `summon` (the summoning's chime) | **`runeSet`** (a click home in the socket, a shimmer) |
| A rune that cannot be set | `miss` | unchanged |
| The split SPELL and ULT Auto buttons | `tap` only, the same either way | `tap`, then **`autoStart`** when flipped on or **`autoStop`** when flipped off (the cues an auto-replay already uses) |
| The Castle tab: Throne Hall / Buildings | `tap` | `tap` and **`ledger`** (a heavy page turned) on a change of view |
| The building ledger's rows | `tap` (opens the standard card); `levelUp` and `sparkle` on a build, `coinClaim` on the built card | unchanged |
| The Castle tab's ambience | `castle` (wind, the trees, a far bird) | unchanged |
| The Summoning tab's nearest row | `tap` | `tap` and **`ledger`** as it unrolls or rolls up |

## 2. How it is built

- `src/render/holdSound.ts` (new, pure): `HOLD_VOICE` (each hold's bed and drum), `holdScene` (the bed and the music's place for the war
  table and the field), `holdCues` (an event's cues), `isNearOnly`, `holdPan`, `drumGap`, `assaultEnd`.
- `src/render/sound.ts`: `setHold(h | null)` puts the Assault over the page's scene (the page behind it can ask for its own scene as often
  as it likes; it comes back when the Assault is left), `setHoldDrums(standing, total)`, `playHold(hold, event, speed, pan)`,
  `endAssault(result)`. `__audioDebug()` now also reports `hold` and `drums`.
- `src/render/audioBeds.ts`: `setOver(bed)` (a bed that stands in for the scene's), `setDrums(kind, gap)` (the drum line, on its own
  `ShotClock`, twice a bed's one-shot level), and nine new one-shots (`howl bell chime steam lowHorn pipe taiko hammer flare`).
- `src/render/audioRules.ts`: seven new beds in `BEDS` (`warcamp barrow den maze bonefire shrine foundry`).
- `src/render/epicMusic.ts`: the places `muster` (plays `deploy`) and `lastHold` (plays `calmap`).
- `src/render/soundRules.ts`, `audioProcessors.ts`: 24 new cues (18 for the holds, `ultCharge`, `ultSlow`, `runeSlide`, `runeMerge`,
  `runeSet`, `ledger`), `isDoorwaySwap`. The four menu cues are on the ui bus (`audioMix.ts`).
- `src/ultMomentRules.ts`: `ultCues(beat, calm)`; `ultMoment.ts` plays it.
- Wired in: `assaultScene.ts` (the field, the drums, the events, the end), `assaultView.ts` (the war table, the result's ways out),
  `home.ts` (`openArmies` always leaves the Assault's sound), `benchSlide.ts`, `runeBench.ts`, `runeTray.ts`, `castle.ts`, `hall.ts`,
  `main.ts` (the two Auto buttons).

**The rules kept.** The beds are on the ambience bus and the music on the music bus, so both follow the Music slider and dip under sheets
and scenes; the cues are on the sfx and ui buses and follow the Effects slider; mute silences all of it; a hidden page suspends it. The
blows on the structures go through the mixer like any blow (a 260 ms gap, dropped before the big moments when the mix is full, quieter at x2); the breaks, the
horn, a weak point, a drum silenced and the keep's fall always play. The music is only existing files, already levelled to -18 LUFS.

**Levels, measured** (`npm run web && node tools/audio-mix/measure.mjs --only cues,holds`; targets in `tools/audio-mix/targets.mjs`):

| Cue | Target (momentary max, LUFS) | Measured |
|---|---|---|
| `gateHit`, `wallHit`, `drumHit` | -29 (under a plain blow's -26: there are many) | -28.9, -29.2, -29.0 |
| `ramHit` | -24 | -24.0 |
| `gateBreak`, `wallBreak` | -20 (with a crit) | -19.9, -20.0 |
| `ladderUp`, `ladderDown` | -28 | -28.7, -28.4 |
| `trebLoose`, `fuse` | -26, -29 | -26.1, -29.9 |
| `weakPoint` | -24 | -24.2 |
| `greatHorn`, `drumSilenced` | -22, -23 | -22.0, -22.9 |
| `wolfHowl` | -27 | -27.0 |
| `keepFall` | -19 (the battle's biggest moment, just under an ultimate's blow) | -19.0 |
| `hostMarch`, `lastHold`, `warEnd` | -23, -22, -20 | -23.1, -21.8, -19.9 |
| `ultCharge`, `ultSlow` | -24 (under the slash's -22), -25 (under the blow's -18) | -24.0, -25.1 |
| `runeSlide`, `runeMerge`, `runeSet`, `ledger` | -34, -27, -29, -34 | -34.8, -27.3, -29.4, -35.1 |

None reaches the limiter. The beds were levelled as the others are, to about -39.5 LUFS (their plain and phone loudness together), 14 LU
under the music:

| Hold's bed | Plain / phone (LUFS) | With all its drums beating |
|---|---|---|
| orcs `warcamp` | -38.5 / -40.5 | -36.8 / -40.5 |
| undead `barrow` | -37.3 / -43.1 | -35.2 / -41.8 |
| beasts `den` | -39.1 / -40.4 | -37.7 / -38.9 |
| wildwood `forest` | -39.5 / -39.8 | -39.2 / -39.5 |
| labyrinth `maze` | -38.2 / -43.5 | -36.9 / -43.5 |
| ogres `bonefire` | -38.2 / -40.5 | -37.7 / -39.7 |
| infernal `volcano` | -38.1 / -40.9 | -37.2 / -39.5 |
| yokai `shrine` | -39.8 / -40.0 | -37.3 / -40.0 |
| golems `foundry` | -37.2 / -41.1 | -36.3 / -40.3 |

(The barrow and the maze first measured -30 plain and -47 on a phone: all drone. Their drones were cut to a third and their wind lifted.)

## 3. Tests

- `test/hold-sound.test.ts` (new, 16 tests with round 2): every built hold has a voice and a bed that exists; the war table's and the Last Hold's music;
  the battle track heard on the field and the triumph bed after a win (and the old state, where it was not); the drums' beat; each kind of
  structure's hit and break; rams, ladders, the trebuchet, kegs, weak points, the horn, the keep; every event's cues exist and the big
  ones always play; near-only events and the pan; the assault's four ends; the ultimate's cues; the doorway swap; the menu cues' bus; the
  bed that stands in for the scene's; the drum line; every hold one-shot built on the fake context.
- `test/audio-beds.test.ts`: **changed to match** two counts the new beds and one-shots move ("no bed goes unused" now counts the holds'
  beds; the bed one-shot kinds are 18, were 12).
- `test/audio-engine.test.ts` already builds every cue in `CUES` on the fake context, so the 24 new ones are covered there.

## 4. Checked

- `npm run typecheck`: clean. `npm test` (the full suite): **3021 pass, 0 fail**. `npm run web`: built; no new file in `out/web/audio/` or
  in the service worker's list.
- `node tools/audio-mix/measure.mjs --only cues,holds,beds`: the tables above; the old beds and cues measure as before.
- **Each hold played in Chromium** at 393x852 (`node tools/hold-sound/probe.mjs --run 150 --level 60`: the war table, the march, then the
  host on Auto at x2 for up to 150 s, reading `__audioDebug()` and `__sfxLog`). For every one of the nine:

  | | Camp | War table | Field | Drums |
  |---|---|---|---|---|
  | track / bed | `camp` / `camp` | `deploy` / `armies` | `battle` / the hold's | the hold's |
  | orcs | | | `warcamp` | `drum` |
  | undead | | | `barrow` | `bell` |
  | beasts | | | `den` | `howl` |
  | wildwood | | | `forest` | `pipe` |
  | labyrinth | | | `maze` | `lowHorn` |
  | ogres | | | `bonefire` | `flare` |
  | infernal | | | `volcano` | `flare` |
  | yokai | | | `shrine` | `taiko` |
  | golems | | | `foundry` | `hammer` |

  Cues seen firing across the runs: `hostMarch` (every hold, once), `gateHit` (1 to 116 a run, by where the camera was), `gateBreak` (2 or
  3 a hold), `greatHorn` (once a hold), `weakPoint`, `wolfHowl`, `horn`, `eliteSting`, `standBoss` and the `boss` track at the lord (undead,
  wildwood, ogres, golems), `keepFall` (wildwood). **The ends:** Elder Root was conquered: `sting: victory`, `track: triumph`, the drums
  stopped, and Back gave `camp` / `armies` with no hold. The Maze, Brimstone Gate and the Moonlit Shrine were lost: the `defeat` sting,
  `deploy` under the result, then `camp`. The Last Hold (the Shrine with every other hold fallen): `lastHold` twice (the table, the march).
- **Not seen in the browser** (covered by the pure tests only): `wallHit`, `wallBreak`, `drumHit` and `drumSilenced` (Auto went for the
  gates), `ramHit`, the ladders, the trebuchet and the kegs (Auto bought no siege works), the retreat's horn, and `warEnd` (the Last Hold
  was not won in the time). The hand-fired ultimate's `ultCharge` / `ultSlow`, the rune bench, the Auto buttons and the ledgers were not
  driven in the browser either; each is one call at a site the old cue already fired from.
- **Page errors: none from the sound.** Two runs (the Necropolis, the Foundry) logged one error each from the Assault's worker:
  `Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope': function … could not be cloned`. I wrote here at first that the battle
  played on. It did not: the logs show the page's clock stopped at that moment (3:56 and 4:14) and never moved again. Found and fixed in
  round 2, below.
- No screen's look changed, so there are no new screenshots.

## Round 2 (the director's calls, after merging main 0.453.0)

The calls: no per-hold music (the owner chose one battle arrangement); a piece for the War's end; cut a skipped ultimate's build-up; find
and fix the worker's error. The war table's `deploy`, the Last Hold's `calmap` and the Auto buttons' cues stay as they are.

### The worker's error: the lord's change of form froze the Assault

**What was posted.** A boss that changes form (`enterPhase` in `bossPhases.ts`) was given its second form's kit as `Unit.kit`: an object
whose skills are functions (`cast: raiseDead`, `cast: shardBurst` ...). The Assault's worker posts every fighter to the page each batch and
keeps the battle for a resume every twenty seconds, both by structured clone, and a clone fails on a function. Found by stepping each hold
headless and searching every batch: `units[225].kit.skill.cast` at 4:29 of the Necropolis, the moment the Lich King changed form. Not the
warcamp and not the weak points: the lord, in any hold whose lord changes form. A Sure-footed nemesis did the same from the first tick
(`nemStart` put a copied kit on its unit), which made the worker fail at its start and the page fall back to running the battle itself.

**What it cost.**
- **The battle froze.** The worker's post threw, so the batch never reached the page; the page waits for a batch before it asks for the
  next, so it never asked again. The field stood still with the boss track playing, until the player left. (The first probe's logs: the
  Necropolis stopped at 3:56, the Foundry at 4:14.)
- **The resume snapshot was lost** from that moment: `saveBattle` clones the battle, caught the failure and kept nothing, so a resume
  went back to the last snapshot before the change of form, up to twenty seconds earlier (and would freeze again when he changed).
- The battle's end could not be posted either, so the assault could not be settled.

**The fix** (the sim; no number changes). The changed kit is kept on the unit as plain data, `Unit.kitRef` (`KitRef` in `abilities.ts`:
which kit and slot the skill and the ultimate come from, and the passive), and `kitOf` builds the kit from it (once a ref, so the kit is the
same object from tick to tick). `enterPhase` and `nemStart` set `kitRef`; nothing sets `Unit.kit` in an Assault any more. A resumed battle's
lord now keeps his second form (before, a clone that somehow succeeded would still have lost it). The Duchess's fight keeps its `Unit.kit`
(a plain battle, never cloned).

**Tests.** `test/assault-clone.test.ts` (new): for each of the nine holds, no function anywhere in the battle as it starts, in any batch, or
after the lord has changed form; the battle and each batch can be structured-cloned; the page's copy stands where the worker's does; a
battle kept and read back has a lord with the same skill and ultimate. A kit ref is the kit it names and survives a clone; a Sure-footed
nemesis keeps its feet with no function on its unit. `test/bossPhases.test.ts`: reads the changed skill through `kitOf` (it read
`Unit.kit`), and clones the battle after the change.

### The War's End: a piece of its own

`src/audio/warend.opus` (`tools/epic-music/tracks/warend.mjs`): the main theme in D major at 100 bpm, 24 bars, **57.6 s**, 237 KB. The tune
first alone on a horn over still strings and a bell; the B section on the strings with the choir rising; then the tune again with
trumpets, horns, choir, bells, the timpani and a march on the kit. It loops (seam 0.69; 86 % of the melody on chord tones). Levelled by the
pipeline to **-18.0 LUFS, -6.5 dBTP** (phone -19.6), so it takes the loops' usual trim. `build.mjs` copies every file in `src/audio/` and
lists it in the service worker, so `audio/warend.opus` is in `FILES` (checked in `out/web/sw.js`); the audio download is 5.13 MB (was 4.90).

It plays:
- **over the War's-end scene** (`warEndScene.ts`: `music: 'warEnd'`, was `triumph`; its `sceneVictory` sting is kept);
- **over the Council board's end card**: while the Dark Council's board is open after the War has ended (`nemesisView.ts`), and the
  place's music comes back when it closes.

`sceneTrack` (moved from `sound.ts` to `epicMusic.ts`, pure) maps a scene's music id to its track. The Last Hold keeps its sting, and the
result card after the Last Hold falls keeps the fanfare, the triumph bed and the `warEnd` sting; the piece comes with the scene at the camp.

### A skipped ultimate cuts its build-up

`ultCharge` and `ultSlow` now go to the show's bus (`MOMENT_CUES` in `audioMix.ts`; the bus the summoning show already uses so a tap can
hush it, and a fight and the show never sound together). A tap that skips a moment calls `hushMoment()`: the bus fades out in about a tenth
of a second (never cut dead) and opens again 1.6 s later, after the build-up would have ended; the next moment's cue opens it at once. The
slash and the blow's own sting are not on that bus.

### Round 2's checks

- `npm run typecheck`: clean. `npm test` (the full suite): **3028 pass, 0 fail**. `npm run web`: built; `audio/warend.opus` is in
  `out/web/audio/` and in the service worker's list.
- **The two holds that froze, played again in Chromium** (`node tools/hold-sound/probe.mjs --armies undead` and `golems`, `--run 240
  --level 60`): both now play through the lord's change of form to the end with no page error. The Necropolis: conquered, `triumph` under
  the result. The Foundry: the `boss` track at 5:32, the clock running on past where it had stopped, conquered at about 6:20.
- **The War's End in Chromium** (`node tools/hold-sound/warend.mjs`, a save whose War has ended): the scene plays `warend` from its file
  (`fallback: []`), the camp's music comes back after; the Council's board opens on "The War is over" playing `warend`, and the camp's
  music comes back as it closes. No errors.
- `test/cinematics.test.ts`: **changed to match** the new requirement: a scene's music may be any track the player has (`sceneTrack`), not
  only the eleven old synth scores (the War's End is a file with no synth score).
- Not driven in the browser: the tap that skips an ultimate (`hushMoment` is one call in the moment's tap handler; the bus the cues take is
  tested).

## 5. For the director: what is still open

(Round 1's calls 1 to 6 were answered: see Round 2.)

1. **Nobody has heard any of this**, the War's End included. The levels are measured; the timbres and the arrangement are not. The first
   things I would listen to: `src/audio/warend.opus`, the drums over each bed (`DRUM_SCALE`, 2), `gateHit` at x1 with a full platoon on a
   gate, `keepFall` into the fanfare, and `ultCharge` under the slash. `__audioApi.renderCue('keepFall')` renders any cue to a buffer.
2. **The Council's board plays the War's End on every tab** once the War is over (the Council, the News, the Fallen, the Spoils), not only
   on the end card's tab: the board as a whole is the War's record by then, and music that stopped and started between tabs would jar. Say
   if it should be the Council tab alone.
3. **Other places that keep a battle by cloning** may hold a `Unit.kit` too: I fixed the two that put one on a fighter in an Assault and
   checked the Assault. The Duchess's fight still uses `Unit.kit`; it is never posted or snapshotted today.
