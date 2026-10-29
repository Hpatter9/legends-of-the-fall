# The king's spells' sounds

The owner's ask: "Need to add sound effects for the king spells".

## What was there, and what was wrong

Each spell's `spell` event played one to three of the shared synthesised cues (`spellCues` in `soundRules.ts`): Heal and Renewal
were the same `heal` blip, Hex a lone `shadowHum`, Battle Cry a lone `horn`. Cast in a real fight in Chromium (the battle music on,
`tools/spell-sfx/probe.mjs`), they did play, but:

- **Too thin and too quiet.** The output's peak in the 2.5 s after a cast, against about -16 dB for the fight and music alone:
  Heal -16.3 dB (no lift at all: a Heal could not be heard over the fight), Smite -12.9, Shield -13.6; only the Meteor stood out (-8.6).
- **The Meteor's fall rang twice.** The spell's cues and its `area` event both played `meteorFall` (50 ms apart; the doubled boom and
  thunder were dropped by the mixer). The spell's own copy is gone (`spellCues('meteor')` is now empty; the `area` event's cues stay).
- **The spells that go everywhere were panned to a side.** Rally, Earthquake, Battle Cry and Bulwark are cast on no tile (0, 0), and
  `eventSpot` panned them to that corner. They are now in the middle.
- **In the Last Stand a cast also played the generic `spell` chime** on the tap (`standView.ts`), on top of the event's cues. Dropped:
  the event plays the spell's own cast.

## What it does now

Every spell has two rendered sounds of its own, 44 files in all (`src/sfx/*.opus`, **478 KB**):

- **The cast** (`cast-<id>`, 1.1 s): a quick breath in, a soft low whoomp 70 ms in (`WHOOMP`), and a shimmer rising out of it in the
  spell's element: fire (a roar, a rising saw, crackle), ice (glassy pings climbing, frost clicks), holy (a short choir "aah" and a bell
  ping), storm (a rising buzz and sparks), earth (a heavy thud and gravel), shadow (a breath drawn in that stops dead, a low cluster, a
  whisper), nature (wooden chimes and a flute), wind (a crossing gust and a whistle), poison (bubbles). Each spell plays its element on a
  note of its own and adds its own touch (Rally a taiko, Battle Cry a tom, Resurrect a bell, Bulwark a metal ring, the wolves a growl...).
- **The effect** (`fx-<id>`), what the spell does:

| Spell | Effect | Starts |
|---|---|---|
| Heal | a soft "ooh" chord, a rising arpeggio, sparkle | 70 ms |
| Meteor | the rush of air as it falls, the blast, a crack, debris and a rumble | lands at the meteor's 900 ms |
| Haste | two gusts crossing, a rising whistle, ticks speeding up | 40 ms |
| Shield | a ringing glassy shell closing, a hum that holds | 60 ms |
| Smite | a zip, a crack, a bell and a choir's shout, thunder rolling off | 40 ms |
| Chain Lightning | the first strike's crack and buzz, then a zap (`fx-chain-hop`) for each leap, 75 ms apart | 0 |
| Poison Cloud | a heavy puff, then bubbling, hissing and a gurgle as it settles | 70 ms |
| Frost Nova | ice racing over the ground in three crunches (the spikes' own delays), snapping shut, a crystal shimmer, a cold wind | 40 ms |
| Rally | two war drums, a brass call of two notes, a roar of fire | 70 ms |
| Earthquake | a crack and a long rumble (3.6 s), rocks tumbling | 0 (the shake is at once) |
| Resurrect | a heartbeat, a choir rising to a major chord, a harp climbing, a bell | 80 ms |
| Cleanse | a washing splash of light falling, a clear chime | 60 ms |
| Blink | a sucked-in snap where the hero leaves, a pop where it lands | 0 |
| Hex | a dark cluster swelling, whispers turning round, a sour bell | 70 ms |
| Light Lance | a bright buzzing beam running down the column, the pillars' thuds, a bell | 0 |
| Renewal | wooden chimes climbing, a breathy flute, leaves | 70 ms |
| Deep Freeze | ice creaking shut, a hard crack, a low clunk as it locks | 50 ms |
| Battle Cry | the war horn, then the whole host shouting "hah!" with a drum | 70 ms |
| Bulwark | stone grinding up, a heavy slam, a ward's hum | 60 ms |
| Call the Wolves | two howls, a growl and the rush of paws | 100 ms |
| Meteor Shower | a glittering fall from the sky (`fx-starfall`), then a fall and blast (`fx-star`) for each meteor, each landing on its own `area` event's time | 0 |

Sizes: each cast 5-8 KB; the effects 6-22 KB (Meteor 21.6, Resurrect 20.6, Frost 20.0); the hop 3.6 KB, a shower's star 15.0 KB.

### How it plays

- `src/render/spellSfx.ts` (pure, tested): `spellParts(b, e, events)` is the plan for one cast: its cast at 0, its effect at
  `EFFECT_DELAY[id]` (or, for the meteors, each fall's `ms` less the file's `impact`), the chain's hops, each with a level and a pan
  (where the spell lands; the middle for a spell cast on no tile; each meteor and each leap where it lands), and the old synthesised cues
  as its `fallback`. `coveredBySpells(events)` is what the spell's own sound stands in for in the same tick (the king's `area` meteors,
  the spell's mends, the chain's arcs, the blink's leap), so nothing doubles.
- `src/render/spellBank.ts`: fetches and decodes the files on the first tap, plays one from a buffer through a gain and a panner.
- `src/render/sound.ts`: `playEvents` plays a `spell` event through `playSpell` once every file is decoded (until then, and on a browser
  that cannot decode Opus, everything is as before: the synthesised cues). Each part takes its place in the mixer as `kingCast` or
  `kingSpell` (priority 3, always heard; they hold voices so the small sounds give way), on the **effects bus** (the effects volume, and
  the mute, as every other effect). Delays follow the fight's speed (at ×2 a meteor's blast still lands with it), and a spell is not
  hushed at ×2 as a hero's blows are. Levels: `CAST_GAIN` 0.85, `EFFECT_GAIN` 1.15 on files mastered to a loudness (the loudest tenth of a
  second at -12 dB RMS for a cast, -9 to -14 for an effect), with peaks under -1 dBFS; the master's limiter holds a stack.
- **Offline:** `build.mjs` copies `src/sfx/*.opus` to `out/web/sfx/` and adds each to the service worker's list (with the music's).

### How they were made

`tools/spell-sfx/` (plain JS, deterministic, about 15 s): `kit.mjs` is the layers (swept tones, swept and gritty noise, crackles, bell
and glass pings, sparkles and glissandi, thumps, voices through formants for the shouts, howls, growls and whispers, a room, an echo, and
`finish`: loudness, a look-ahead limiter, the tail trimmed); it borrows the filters, the hall and the choir, brass, bell, drums and
cymbal swell of `tools/epic-music/`. `sounds.mjs` is the 44 sounds. `node tools/spell-sfx/render.mjs [id ...]` writes the Opus files
(40 kbps) and `src/render/spellSfxManifest.ts` (each file's length, size, and its `impact` or `whoomp`). Nothing recorded or third-party
went in (`CREDITS.md`).

## Checked

- `test/spell-sfx.test.ts`: every spell has one cast and at least one effect, its own (no two share either), all in the manifest; the
  Meteor's blast lands at `METEOR_MS`, each of the shower's five at `METEOR_MS + i × SHOWER_GAP`, the chain has a hop per arc; the other
  effects start within the whoomp; the covered events; the fallback cues are real cues; a spell cast on no tile is centred; the folder
  matches the manifest, the build lists the files, and the total is under 600 KB.
- In Chromium (393x852, battle music on), `node tools/spell-sfx/probe.mjs` cast all 21 once in a real fight: every one played its cast
  and effect file (`__sfxLog` shows `sfx:cast-<id>` and `sfx:fx-<id>`, five `fx-star` for the shower, a hop for Chain Lightning when a second foe was in reach), no
  errors. The peak in the 2.5 s after each cast is now about -4 to -10 dB over two runs (Heal -7.8, was -16.3; Smite -5.6, was -12.9; Shield -5.6, was
  -13.6), over a fight and music around -16 to -18 dB, and under the -2 dB limiter. Screenshot: `docs/samples/spell-sfx-starfall-393x852.png`.

I cannot hear: the sounds are checked by their levels, envelopes and spectrograms, not by ear. Please cast them and say which to change:
each is a few lines in `tools/spell-sfx/sounds.mjs` (and `EFFECT_DELAY` / the gains in `spellSfx.ts`). Opus decodes in Chromium and
Firefox and in Safari from 18.4; older Safari keeps the synthesised cues.
