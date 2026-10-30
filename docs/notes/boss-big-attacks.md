## BOSS-BIG: bosses with huge attacks, and counterplay

Branch `claude/boss-big-attacks` (from main 0.263.0). The owner: "Bosses need to have bigger attacks and feel more powerful. Like standard
RPGs where they have huge attacks." The decision: **harder, with counterplay**: the big attacks hit hard; a warning gives the player a moment
to answer with the king's spells, and the heroes try to step out of the marked tiles; the boss waves get tougher, then the armies are
re-tuned so they stay winnable.

### What a boss does now (`src/sim/bossAttacks.ts`)

Every boss has one or two **signature attacks** (`SIGNATURES`, by fighter id): the nine armies' mid-bosses one, their last bosses, the three
Wildwood bosses and the six Calamity guardians two (alternated). That covers the daily (its bosses are the early armies' mid and last
bosses), the Last Stand (its boss bands are `BOSS_BANDS`) and the old boss stages. 25 bosses, 42 attacks, each with its own name and a rage
name, an element (its look) and a rider:

| Shape | What it strikes | Bosses |
|---|---|---|
| `slam` | a square round the heroes' thickest crowd in reach (or round the boss) | Orc Chieftain, Orc Warlord, Boar King, Thorn Warden, Horned Ogre, Oni King, Gorvak, Hrungar |
| `ring` | a quake ring round the boss; its feet are safe when the ring starts at 2 | Orc Warlord, Thorn Warden, Minotaur Champion, Horned Ogre, Oni King, Gorvak, the Thorn Warden of the Calamity |
| `line` | a breath or a charge from the boss down the way it faces, 1 or 3 wide | Alpha Werewolf, Boar King, Wood Raider, Grove Spearlord, Gorgon Queen, Minotaur Champion, Forge Titan, Hrungar, Karnok |
| `cross` | beams down the boss's row and column | Lich King, Grove Spearlord, Nine-Tailed Fox, Sapphire Colossus, the Calamity's Thorn Warden, Vorgrath |
| `rain` | a 3x3 blast on each of up to three heroes (spread) | Bone Captain, Wood Raider, Shaman King, Devil Leader, Demon Lord, Forge Titan, Malphas, Vorgrath |
| `pull` | the heroes within reach dragged two tiles in as it gathers, then the square round it | Lich King, Demon Lord, Malphas, Karnok |

- **The windup is a real state.** The boss gathers for `CAST_MS` (0.9 s) and its tiles are marked for `WARN_MS` (2 s of battle time; the
  rage version 1.7 s): `Battle.warnings` (`BossWarning`: the tiles, from, at, rage) and a `bossSig` event (`warn`, then `land`, or `fizzle` if
  the boss falls first). The boss fights on after its gathering while the blow is on its way. Two of a boss's never overlap.
- **When.** The first 5 s after the boss first acts (`FIRST_MS`), then every 9 s (`EVERY_MS`), and at once as its health first falls past
  60% and 30% (`TURNS`), each once. Only with a hero within 6 tiles. A silenced boss lets none go.
- **The rage version.** Once 40 s have passed since the boss first acted (`RAGE_MS`), its signatures come faster (cooldown x0.6), harder
  (x1.3) and a tile wider, under their rage names ("Red Tusk Cataclysm", "Crown of Endless Winter"...).
- **The blow.** Every foe of the boss still on the tiles is struck for the boss's attack x the signature's `power` x `SIG.POWER` (0.85),
  less defence, but never less than `SIG.FLOOR` (28%) of the struck hero's health (x1.3 in rage): a great blow is always a great one,
  whatever the levels. Then its rider (burn, poison, bleed, curse, stun, freeze, chill, or a shove). The Last Stand's king is never struck.
- **Deterministic.** No stream is drawn from: the targets are a fixed order, a rain's spots a hash of the moment (`mixSeed`).
- `BOSS_BIG.on` switches it all off (the identity tests and the tools use it); `BOSS_BIG.dodge` the heroes' stepping out.

### The counterplay

- **The heroes step out** (`dodgeStep`, called first in the fight's `decide`): a fighter standing on marked ground, 0.8 s after the marks
  appear (`REACT_MS`: the first moment is the boss's), walks to the nearest unmarked tile it can reach within a path cost of 4 (never onto
  lava or coals); with nowhere to go (a blade hemmed in) it stays and strikes. While marks are down its walks go round them. Only fighters of
  the other side fear them, and only while a boss's windup is on the board, so a fight without a boss is exactly as before (the identity tests).
- **The king's spells answer** as they would any blow: a **Shield** (40% of health) soaks it (a floor-sized blow whole), a **Blink**ed hero
  is out of reach while hidden (cast it in the last 1.5 s), a **Hex** on the boss weakens it (the damage is read as it lands), and a
  **Heal** after. Bulwark covers everyone.
- How much it matters (Normal, the late armies, 48 attempts; struck heroes a landing): with the dodge 1.27, without 2.74; clears without the
  dodge: Ogres 73% (90% with), Golems 27% (33%), Yokai 13% (15%), Infernal 21% (21%). With the bot answering with spells: see the table below.

### Presentation (the page)

- **The marks** (`src/render/bossFx.ts`, hooked into `Fx.show` and `Fx.step`): each tile a dark red diamond with a bright edge, a red fill
  growing from its middle as the blow comes (`markLook`: eased, breathing a little, steady with the screen kept still, never blinking out),
  in battle time (so with the fight's speed), and the attack's name over them. The Last Stand draws them too (its `Fx`).
- **The cut-in** (`src/bossMoment.ts`, `src/bossBig.css`): a red and black band slashing in the other way from a hero's ultimate, the
  boss's whole figure from its sheet on the right facing in, its name (and ENRAGED) and the attack's name stamped in on the left, claw streaks
  rushing through it. Full (the Full ultimate scenes setting on and Auto off: `heldCut`): the fight and its effects are held for the band alone
  (1 s, `CUT_MS`), not for the windup, which runs on after; a tap skips. Short (the setting off, or Auto): a smaller band for 0.9 s while the
  fight runs. Reduced motion: it fades in and out, held still. Its lines move position only (`test/no-flicker.test.ts`).
- **The blow**: the ultimate's look at its size (`Fx.ultImpact`, ULT-EPIC: the element's painted burst from the `u-ultimate` kit, its nova and
  ring) on up to five spots spread over the marks (`burstTiles`; two on battery saver), the element's wave on every struck tile, a 150 ms
  hit-stop and a hard shake (none with the screen kept still).
- **Sound**: `bossSlash` (the windup: a low growl swelling under a dark scrape) and `bossImpact` (a sub-deep boom with a grinding crack),
  both in `audioProcessors.ts` and `soundRules.ts`; targets -22 and -18 LUFS in `tools/audio-mix/targets.mjs` (their gains are first
  guesses, not yet measured with `tools/audio-mix/measure.mjs`).
- Not done: the Last Stand has no cut-in band (its marks, name and blow are drawn); the boss figure in the band is its sprite from the pack
  (no painted portraits exist for bosses).

### The re-tune

Measured with `node tools/boss-big/run.mjs measure` (new): each army from wave 1 by the greedy player (`playArmy`), the recruits' party
(Knight, Paladin, Archer, Warlock, Cleric) at the army's level, gear dressed, every talent row the level opens; no castle on the first four
armies' Normal, a maxed one from the Labyrinth on and on the higher tiers; a fresh save an attempt. The first try (with `SIG.POWER` 1.5, no
health change) made the boss waves far harder (Ogres 96% to 21%, Yokai 25% to 0%), so: the bosses that have signatures now have 80% of the
health they had (`SIG.HP`, in `addUnit` through `sigHp`), the global power came down to 0.85 with the 28% floor, the rains to three blasts
a little softer, the pulls a little softer, and the Yokai's, the Golem Forge's and the Bone Captain's signatures softer again (their own
attack is the game's biggest, or the party at level 8 the weakest).

Normal, 48 attempts a cell: clear % of a single run (the share of lost runs that fell on a boss wave), boss waves won of those reached:

| Army (level) | Before | After |
|---|---|---|
RESULTS_NORMAL

The higher tiers (12 attempts a cell, the maxed castle, levels 45, 65, 85, 100):

RESULTS_TIERS

The daily (`node tools/boss-big/run.mjs daily [--off]`, 60 dates, a fresh save's starting five) and the Last Stand
(`node tools/boss-big/run.mjs stand [--off]`):

RESULTS_MODES

### Files

- `src/sim/bossAttacks.ts` (new): `BOSS_BIG`, `SIG`, `SIGNATURES`, `sigTiles`, `trySignature`, `tickSignatures`, `dangerFor`, `dodgeStep`, `sigHp`.
- `src/sim/battle.ts`: the `bossSig` event; `Battle.warnings`, `sigs`, `sigN`; `tickSignatures` each tick; in `decide` the dodge first, then
  a boss's signature, and walks round the marks; `addUnit` takes `sigHp`.
- `src/bossBigRules.ts` (new, pure): `BOSS_BIG_LOOK`, `heldCut`, `markFill`, `markLook`, `burstTiles`.
- `src/render/bossFx.ts` (new), `src/render/fx.ts` (the hook); `src/bossMoment.ts` (new), `src/bossBig.css` (new, in `build.mjs`'s CSS);
  `src/main.ts` (the cut-in's hold, small hooks); `src/render/soundRules.ts`, `src/render/audioProcessors.ts`, `tools/audio-mix/targets.mjs`.
- Tests: `test/boss-big.test.ts` (every boss has its signatures; the warning state; the heroes step out; Shield and Blink answer; the turns
  and the rage; determinism; a fight with no boss never marks a tile; the switch), `test/boss-big-look.test.ts` (the hold, the marks, the
  bursts, the sounds). `test/spells-identity.test.ts` and `test/ailments-identical.test.ts` check every scenario with the signatures switched
  off (as recorded); `spells-identity` also checks that with them on every scenario without a boss still plays as recorded, and that only
  `bosses`, `armyFoes`, `army`, `daily` and `stand` move (nothing re-recorded).
- Tools: `tools/boss-big/run.mjs` (bundles and runs one of the folder's tools), `measure.ts`, `daily.ts`, `stand.ts`, `switch.ts`,
  `shots.mjs` (the screenshots).
- Screenshots: `docs/samples/boss-big-*.png` (`cut`, `warn`, `impact`, `after` for several bosses at 393x852; one at 360x780 and one short
  version at 412x915).

### Questions for the owner

- Should a hard hold on the boss during its windup (Frost Nova, Deep Freeze, a stun) interrupt the signature? It would be a further answer for
  the player; it is not in (bosses' hard-control ladder already limits holds on them).
- The Yokai Night Parade is still the army most moved by this (single-run clears at its level 29% to 17%); its bosses' signatures could be
  softened further, or its bosses' health cut more, if it should stay where it was.
