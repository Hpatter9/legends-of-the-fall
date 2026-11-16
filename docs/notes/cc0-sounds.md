# CC0 sounds: recorded sound effects in place of the synth

The owner: **"make a pass over all sound effects using a free source like CC0"**. Branch `claude/cc0-sounds`.

Every one of the game's 123 sound cues (`CUES` in `soundRules.ts`) was synthesised. **73 now play recordings** (154 files,
**338 KB** added), all **CC0 1.0** (public domain). The other **50 keep their synth**, each for a reason given below. The king's
spells' 44 rendered files (`src/sfx/*.opus`) are unchanged (see "The king's spells" below). The music is out of scope and untouched.

## Where the recordings come from

Only CC0 sources were used, and each item's licence was read on its own OpenGameArt page. An item offered under several licences
(for example "Battle sound effects" and "Female warrior cheer", both CC-BY/GPL/CC0) was left out, as were Sonniss and anything with an
unclear licence. Every take's pack, path and cut are in `tools/cc0-sounds/sources.mjs` (`PACKS`: title, author, page, file), and
`CREDITS.md` and the in-app Credits page list them all.

- **Kenney first:** kenney.nl and freesound.org both refused this container's downloads (HTTP 403 from their own servers, not the
  network policy), so Kenney's packs came through his own uploads to OpenGameArt (**RPG Audio**) and through **150 Combat Sound
  Effects**, an OpenGameArt pack (CC0) that gathers Kenney's **Impact Sounds**, **RPG Audio** and **Sci-fi Sounds** with Kronbits' and
  lentikula's CC0 spell impacts. Its `LICENSES.txt` names each file's source.
- **OpenGameArt CC0:** rubberduck's seven CC0 packs, StarNinjas' swords, impacts, coins and crowd, qubodup's punches, rustles and the
  Independent.nu Ljudbank, Vehicle's Tinysized and weapons libraries, and single sounds by fourteen more artists (the list is in
  `CREDITS.md`).
- **Freesound:** none. Its pages can be read (and do show CC0 sounds that would fit: thunder, a bow), but neither its sound files nor its
  previews could be downloaded from here. If the owner wants a Freesound sound (a bow's twang is the obvious gap), the files can be
  added to `sources.mjs` from a machine that can reach it.

## How a file is made (`tools/cc0-sounds/`)

```
NODE_USE_ENV_PROXY=1 node tools/cc0-sounds/fetch.mjs   # downloads and unpacks every pack into out/cc0-sounds/cache (about 230 MB)
node tools/cc0-sounds/render.mjs [cue ...]              # cuts, levels and encodes; writes src/sfx/cues/*.opus and the manifest
npm run web && node tools/cc0-sounds/listen.mjs         # the listening page, at http://localhost:8794/listen-sounds.html
node tools/cc0-sounds/fight.mjs [port] [--synth]        # a real fight in Chromium: what played, as what, how loud
```

1. **Cut:** decoded to mono 48 kHz; leading and trailing silence cut (-50 dB under the peak); started `at` seconds in; re-pitched
   (`rate`: the heavy swings are the light swishes a fifth down, the arrows a little up), filtered (`hp`, `lp`), held to `dur` seconds
   (around each cue's `CUES` ring time), a 4 ms fade in and a fade out over the last fifth. A composite take lays several cuts together:
   the footsteps (three steps, timed as the synth's), the duel's walk-in (six boot steps), the rain of arrows (four swishes and two
   thunks), a ladder thrown up, the trebuchet (a creak and a whoosh), a clatter of bones.
2. **Encoded:** mono Opus at 32 kbps, peaked at -1 dBFS (0.4 to 10.8 KB a file).
3. **Levelled:** each cue's synth and each new file are played through the same path in headless Chromium (`probe.ts`) and metered
   by the mix's own meter (the loudest 400 ms, LUFS, `tools/audio-mix/probe.ts`). The file's `gain` (in `cueSampleManifest.ts`) makes
   it **exactly as loud as the synth it replaces**, so the measured mix (`CUES` gains, set against each family's target in
   `audio-mix.md`) holds unchanged, and with it the effects' place against the music (the files at -18 LUFS, played at their levels in
   `audioMix.ts`). A gain is held so a file never peaks above +3 dB at gain 1 (the master limiter catches the rest).
4. **Variants:** the frequent cues have two or three takes (every swing, hit, block, the arrows, the coins, the footsteps, the elements);
   `TakePicker` never plays the same take twice running, so a flurry of blows never repeats a recording. The mixer's random pitch
   applies at half strength (a playback rate also changes the length).

## How it plays

- `src/render/cueSamples.ts` (pure, tested): which cues have files, `TakePicker`, `sampleRate`.
- `src/render/cueBank.ts`: fetches and decodes every file on the first tap (with the spells' files), plays a take from its buffer
  through a gain (the mixer's level × the file's) and, when panned, a stereo panner, **into the same bus the synth would use** (`busOf`):
  effects, the page's ui or the summoning show's. So the Effects slider, the mute, the pan by board position, ducking (which moves only
  the music bed) and `hushSummon` / `hushMoment` (the show bus) all treat a recording as they treat the synth.
- `sound.ts` `cue()`: the mixer's rules first (cooldown, voices, priority, ×2 hush), as before; then the bank's take if one is decoded,
  **else the cue's synth**. A missing, unloadable or undecodable file (an old Safari without Opus) falls back cue by cue. The synth
  table is untouched, so every recorded cue keeps its fallback.
- `window.__cueLog = []` lists the files played (next to `__sfxLog`'s cue names); `__audioDebug().cueFiles` how many are decoded.
- **Offline:** `build.mjs` copies `src/sfx/cues/*.opus` to `out/web/sfx/cues/` and adds each to the service worker's `FILES`
  (154 of them in `sw.js`). The Play build (`npm run web:play`) lists the same, and `tools/play-size/pack.mjs` moved all 154 into the
  web asset pack in a dry run (the Android SDK is not here, so no bundle was built).

## The cues

| Cue | Takes | Source (author, pack; all CC0 1.0) | Length | Size |
|---|---|---|---|---|
| coin | 3 | rubberduck, 80 CC0 RPG SFX; StarNinjas, 12 coins | 0.33 / 0.33 / 0.26 s | 3.9 KB |
| coinRecycle | 2 | Kenney, RPG Audio; rubberduck, 80 CC0 RPG SFX | 0.32 / 0.54 s | 3.8 KB |
| coinClaim | 2 | Kenney, RPG Audio; rubberduck, 80 CC0 RPG SFX | 0.70 / 0.80 s | 6.0 KB |
| ledger | 3 | Kenney, RPG Audio | 0.45 / 0.39 / 0.23 s | 4.6 KB |
| runeSlide | 2 | rubberduck, 80 CC0 RPG SFX | 0.22 / 0.35 s | 2.5 KB |
| slam | 2 | rubberduck, 100 CC0 metal and wood | 0.22 / 0.38 s | 2.6 KB |
| steps | 2 | Kenney, RPG Audio | 0.54 / 0.55 s | 4.6 KB |
| kingHit | 2 | 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula); qubodup, Impact | 0.36 / 0.45 s | 3.4 KB |
| cineHit | 1 | 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 0.90 s | 3.3 KB |
| cineWhoosh | 2 | pyranostudios, Air whoosh; IgnasD, Wind | 0.50 / 0.50 s | 4.4 KB |
| swingLight | 3 | artisticdude, Swishes sound pack | 0.10 / 0.10 / 0.09 s | 1.7 KB |
| swingSword | 3 | StarNinjas, 20 sword SFX | 0.35 / 0.35 / 0.35 s | 4.7 KB |
| swingHeavy | 3 | artisticdude, Swishes sound pack | 0.18 / 0.18 / 0.19 s | 2.7 KB |
| swingSpear | 3 | artisticdude, Swishes sound pack | 0.07 / 0.07 / 0.05 s | 1.3 KB |
| swingFist | 3 | artisticdude, Swishes sound pack | 0.13 / 0.12 / 0.07 s | 1.9 KB |
| hitLight | 3 | 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 0.25 / 0.25 / 0.25 s | 3.4 KB |
| hitSword | 3 | 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula); Kenney, RPG Audio | 0.30 / 0.30 / 0.30 s | 4.2 KB |
| hitHeavy | 3 | 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 0.45 / 0.41 / 0.41 s | 5.4 KB |
| hitBone | 3 | congusbongus, Bones rattle | 0.14 / 0.11 / 0.15 s | 2.8 KB |
| hitFist | 3 | qubodup, Punch | 0.30 / 0.30 / 0.30 s | 3.9 KB |
| hitSpear | 3 | rubberduck, 80 CC0 RPG SFX | 0.23 / 0.25 / 0.25 s | 3.6 KB |
| crit | 2 | StarNinjas, 10 impact/shield blocks | 0.36 / 0.39 s | 3.1 KB |
| block | 3 | StarNinjas, 20 sword SFX (clashes) | 0.45 / 0.45 / 0.45 s | 6.2 KB |
| arrowFly | 2 | artisticdude, Swishes sound pack | 0.08 / 0.10 s | 1.1 KB |
| arrowHit | 3 | rubberduck, 80 CC0 RPG SFX | 0.19 / 0.13 / 0.20 s | 2.6 KB |
| gun | 3 | Kurt, Gunshots (Black Powder); rubberduck, 25 CC0 bangs | 0.60 / 0.37 / 0.29 s | 5.0 KB |
| bulletHit | 3 | rubberduck, 75 CC0 breaking/falling/hit | 0.20 / 0.16 / 0.09 s | 2.5 KB |
| throwBone | 2 | artisticdude, Swishes sound pack | 0.13 / 0.15 s | 1.5 KB |
| boneClatter | 2 | colodical, Skeleton SFX short pack (second); congusbongus, Bones rattle | 0.40 / 0.26 s | 3.8 KB |
| fireWhoosh | 3 | rubberduck, 80 CC0 RPG SFX | 0.45 / 0.45 / 0.45 s | 5.9 KB |
| fireBoom | 3 | rubberduck, 25 CC0 bangs | 0.70 / 0.70 / 0.70 s | 8.3 KB |
| frostCrack | 2 | IgnasD, Ice breaking / shattering | 0.30 / 0.30 s | 2.8 KB |
| frostShatter | 2 | rubberduck, 75 CC0 breaking/falling/hit | 0.34 / 0.35 s | 3.1 KB |
| crackle | 2 | Vehicle (Jan Schupke), Tinysized SFX library; 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 0.35 / 0.35 s | 3.0 KB |
| thunder | 2 | rubberduck, 100 CC0 SFX 2; 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 1.10 / 1.10 s | 9.3 KB |
| holyChime | 2 | pwl, Bell dings / chimes; StarNinjas, 4 metal dings | 0.97 / 1.00 s | 8.3 KB |
| shadowHum | 2 | qubodup, 3 dark magic spells; qubodup, Energy drain | 0.80 / 0.80 s | 6.7 KB |
| poisonHiss | 2 | bmaczero, Bubble sound effects; bmaczero, Bubble sound effects (second) | 0.28 / 0.39 s | 3.3 KB |
| rustle | 3 | qubodup, 20 rustles (dry leaves) | 0.35 / 0.35 / 0.35 s | 4.6 KB |
| windGust | 2 | IgnasD, Wind; 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 0.60 / 0.60 s | 5.2 KB |
| earthRumble | 2 | mieki256, Earthquake and open sesame; 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 0.90 / 0.90 s | 7.4 KB |
| arrowRain | 1 | artisticdude, Swishes sound pack + rubberduck, 80 CC0 RPG SFX | 0.62 s | 2.5 KB |
| heal | 2 | 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 0.60 / 0.60 s | 5.5 KB |
| horn | 2 | stumpystrust, They're coming (a generic horn sound) | 0.75 / 0.75 s | 6.4 KB |
| dash | 2 | Vehicle (Jan Schupke), Fantasy weapons and apparel SFX library | 0.25 / 0.25 s | 2.1 KB |
| blink | 1 | ogrebane, Teleport spell | 0.35 s | 1.5 KB |
| trap | 2 | Vehicle (Jan Schupke), Tinysized SFX library; Kenney, RPG Audio | 0.30 / 0.20 s | 2.5 KB |
| ultSlash | 1 | StarNinjas, 20 sword SFX | 0.70 s | 2.8 KB |
| ultImpact | 1 | 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 1.40 s | 5.4 KB |
| bossSlash | 1 | trazzz123, CC0 deep monster roar | 0.90 s | 4.1 KB |
| bossImpact | 1 | 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 1.60 s | 5.4 KB |
| bossSkill | 1 | rubberduck, 80 CC0 creature | 0.90 s | 3.9 KB |
| deathBones | 2 | colodical, Skeleton SFX short pack; congusbongus, Bones rattle | 0.60 / 0.41 s | 4.5 KB |
| deathBurn | 2 | TheMightyGlider, Catching fire; 150 Combat SFX (Kenney Impact Sounds / RPG Audio / Sci-fi; lentikula) | 0.45 / 0.90 s | 5.7 KB |
| deathThud | 2 | rubberduck, 75 CC0 breaking/falling/hit | 0.60 / 0.60 s | 5.3 KB |
| deathStone | 2 | rubberduck, 75 CC0 breaking/falling/hit; TheMightyGlider, Breaking rock | 0.49 / 0.44 s | 3.9 KB |
| deathBlood | 2 | Independent.nu (uploaded by qubodup), 8 wet squish / slurp impacts (Independent.nu Ljudbank) | 0.50 / 0.50 s | 4.4 KB |
| gateHit | 3 | rubberduck, 100 CC0 metal and wood | 0.22 / 0.28 / 0.29 s | 3.4 KB |
| wallHit | 3 | rubberduck, 80 CC0 RPG SFX; rubberduck, 75 CC0 breaking/falling/hit | 0.21 / 0.30 / 0.21 s | 3.8 KB |
| drumHit | 2 | Vehicle (Jan Schupke), Fantasy weapons and apparel SFX library; rubberduck, 100 CC0 metal and wood | 0.30 / 0.35 s | 3.1 KB |
| ramHit | 2 | Independent.nu (uploaded by qubodup), 35 wooden cracks / hits / destructions (Independent.nu Ljudbank) | 0.69 / 0.70 s | 6.3 KB |
| gateBreak | 2 | Independent.nu (uploaded by qubodup), 35 wooden cracks / hits / destructions (Independent.nu Ljudbank) | 1.40 / 1.40 s | 12.1 KB |
| wallBreak | 2 | StarNinjas, Cave-in; rubberduck, 75 CC0 breaking/falling/hit | 1.50 / 0.83 s | 9.9 KB |
| ladderUp | 1 | rubberduck, 80 CC0 RPG SFX + rubberduck, 100 CC0 metal and wood | 0.47 s | 2.0 KB |
| ladderDown | 2 | rubberduck, 75 CC0 breaking/falling/hit; rubberduck, 100 CC0 metal and wood | 0.60 / 0.48 s | 5.3 KB |
| trebLoose | 1 | Kenney, RPG Audio + pyranostudios, Air whoosh | 0.84 s | 3.6 KB |
| fuse | 1 | listener, Dynamite sound effect | 1.10 s | 5.0 KB |
| greatHorn | 1 | stumpystrust, They're coming (a generic horn sound) | 2.40 s | 9.7 KB |
| wolfHowl | 2 | caveboytup, Wolf monster sound; rubberduck, 80 CC0 creature | 1.49 / 0.66 s | 8.9 KB |
| keepFall | 1 | Joth, Chunky explosion | 2.80 s | 10.6 KB |
| duelWalk | 1 | Vehicle (Jan Schupke), Fantasy weapons and apparel SFX library | 1.60 s | 6.8 KB |
| crowdCheer | 2 | StarNinjas, Crowd shouting | 1.10 / 1.10 s | 9.4 KB |
| tugSwing | 2 | Kenney, RPG Audio | 0.30 / 0.50 s | 3.8 KB |


| Cue kept synthesised | Why |
|---|---|
| tap | a 60 ms tick under every press: the synth is the smallest and crispest, and costs no file |
| summon | a tuned chime in the score's key |
| merge | a tuned chime in the score's key |
| star | a tuned chime |
| levelUp | a tuned fanfare |
| sparkle | a tuned glitter |
| autoStart | a tuned two-note cue |
| autoStop | a tuned two-note cue |
| autoDone | a tuned chord |
| setChime2 | a tuned chord |
| setChime3 | a tuned chord |
| runeMerge | a grind into a tuned chord |
| runeSet | a click into a tuned shimmer |
| boom | the page's rare generic blast, kept with the stingers it plays among |
| victory | a tuned stinger |
| defeat | a tuned stinger |
| skill | a tuned shimmer |
| spell | a tuned shimmer |
| twistCurse | a tuned stinger |
| twistBlessing | a tuned stinger |
| eliteSting | a tuned stinger |
| standBoss | a tuned stinger |
| sceneBoss | a scene's tuned stinger |
| sceneVictory | a scene's tuned fanfare |
| cineSwell | a tuned swell under a reveal |
| blipQuill | a voice's blip: must be a 50 ms texture under the words |
| blipHero | a voice's blip |
| blipBoss | a voice's blip |
| blipBeast | a voice's blip |
| blipKing | a voice's blip |
| blipGoat | a voice's blip |
| miss | a faint fwip under the blows: a recorded swish reads as another swing |
| bow | no CC0 recording of a bow's release in the allowed sources (the packs have only arrows drawn and put back) |
| shell | a casing's 140 ms tinkle: tiny and high, the synth fits |
| meteorFall | a falling whistle timed to the meteor's flight; no CC0 recording matches |
| shieldHum | a ward's hum: a tone, nothing to record |
| pipes | a tuned four-note phrase |
| ultimate | a tuned chord blast |
| kingCast | only holds voices for a spell's own files |
| kingSpell | only holds voices for a spell's own files |
| riseSummon | the summoning's tuned build-up |
| stingSummon | the summoning's tuned stinger |
| deathLight | two falling bell notes, tuned |
| weakPoint | a tap into two tuned notes |
| drumSilenced | a drum's note falling, tuned |
| hostMarch | drums under a tuned horn call |
| lastHold | a tuned bell and chord |
| warEnd | a tuned peal and chord |
| ultCharge | a riser timed to the ultimate's opening to the frame |
| ultSlow | the slow beat timed to the blow |

### Why these keep their synth

- **The tuned cues** (the chimes, stingers, fanfares, chords and swells of the menus, the tower, the scenes, the summoning and the
  holds' news): they are written in the score's key and timed to their moments; a recording would sit out of tune against the music.
- **The blips** under the cinematics' words: a 50 ms texture, which any recorded voice turns into a sound of its own.
- **`tap`**: a 60 ms tick under every button press, played more than any other sound; the synth is the crispest and costs no file.
- **`miss`, `shell`**: tiny sounds under the blows; a recording read as another swing or rattle.
- **`bow`**: no CC0 recording of a bow's release in what could be downloaded (the packs have only arrows drawn and put back). Freesound
  has CC0 ones; see above.
- **`meteorFall`**, **`ultCharge`**, **`ultSlow`**: risers and falls timed to the frame of their show.
- **`shieldHum`**: a ward's tone; there is nothing real to record.
- **`kingCast`, `kingSpell`**: they only hold the mixer's voices for the spells' own files.

## The king's spells

Their 44 files were left as they are: each was sound-designed for its spell (a cast and an effect, landing on the spell's own timing:
the meteor's blast on its fall, each of the shower's five, the chain's hops), they are already files, original to this game, of clean
licence, and they are the player's big moments. The CC0 packs offer spell impacts (lentikula's) but nothing that matches their timing
and layering better. If the owner wants recorded layers in them, `tools/spell-sfx/kit.mjs` can take a CC0 file as a layer.

## Checked

- `npm run typecheck`; `npm test -- cc0-sounds audio-engine spell-sfx store-credits` (all pass). `test/cc0-sounds.test.ts`: every cue
  is recorded (as the tool's list says) or kept with a reason, never both; every recorded cue keeps its synth; the folder is the manifest,
  each file its listed size, under 1 MB in all; `build.mjs` lists them and the built `sw.js` caches every one; `TakePicker` never repeats;
  the bank plays on the cue's own bus with its gain, pitch and pan, and a cue with nothing decoded returns null (the synth plays).
- `npm run web` and `npm run web:play`: 154 files in `out/web/sfx/cues/` and in `sw.js`.
- A real fight in Chromium at 393x852 (`fight.mjs`): all 154 decoded; in 12 s, 40 to 54 of 56 to 69 cues played as recordings (swings,
  hits, blocks, crits, arrows, fire, frost, thunder, wind, the deaths, blink, dash, the arrow rain), no errors. The page's output: peak
  -4.5 to -7.1 dBFS, RMS -27.6 to -27.9 dBFS over the battle music; with every file refused (`--synth`, the old sound), peak -4.4, RMS
  -26.0 (a different fight each run; the meter puts the recordings at the synth's loudness, cue by cue). Muted: no recording started.
- The listening page (`listen.mjs --shot`): every take decoded and played with no error. Screenshots:
  `docs/samples/cc0-sounds-listen.png`, `docs/samples/cc0-sounds-listen-blows.png`.

I cannot hear. The takes were chosen by their names, lengths and measured envelopes and levelled by meter, not by ear. **Please listen**
on the listening page (each cue's old synth and its new takes side by side, at the game's levels) and name any take to change: a take is
one line in `sources.mjs` and `node tools/cc0-sounds/render.mjs <cue>` remakes it.
