# Summons and shapeshifts on a timer (SUMMON-TIMERS)

The owner's ask: "The hero summons should be on a timer so they last more than one round. Same with the shapeshift." This is batch 6 of the
skills design (`docs/notes/skills-overhaul-design.md` on `claude/skills-design`, section 6), with the owner's answer that the Illusionist's
decoys stay short and end with the wave.

## The rules (`src/sim/carry.ts`)

- **A timer of fighting time.** A hero's summon or shape lasts a timer that runs while a fight runs. It is a time on the fight's clock
  (`Unit.expires` with its full length in the new `Unit.life`; for the shapes, `kx.wolfUntil`/`wolfMs`, `kx.moon`/`moonMs`,
  `kx.tree.until`/`ms`, `kx.guise.until`/`ms`, `form.until`/`ms`), so it waits between waves by itself. The Last Stand's waves are one fight,
  so there it simply runs on.
- **The timers** (`TIMER`; each stretched by the `dur` talent as before):

  | Who | What | Was | Now |
  | --- | --- | --- | --- |
  | Druid, Conjure Treant | a treant | the wave | 60s |
  | Druid, Wall of Thorns (ultimate) | two treants | the wave | 30s |
  | Beastmaster, Summon Beast; Pack Tactics with no wolf | a wolf | the wave | 60s |
  | Beastmaster, Conjure Animals (ultimate) | four wolves | the wave | 30s |
  | Reaper, Animate Dead | a wraith | 8s | 20s |
  | Reaper, Harvest of Souls (ultimate) | each kill's wraith | 5s | 12s |
  | Samurai Commander, Plant the Standard | the standard | 10s | 30s |
  | Werewolf, Shapechange | the Hunter or the Brute | the wave | 40s |
  | Druid, Wild Shape | the treant form | 6s | 20s |
  | Kitsune, Alter Self | a foe's shape | 5s | 15s |
  | Werewolf, Full Moon (ultimate) | both forms | 7s | 15s |
  | Demon Swordsman, Metamorphosis (ultimate) | the demon form | 7s | 15s |
  | Illusionist, the decoys | decoys | 3 to 5s | unchanged, not kept |

  A combo's or a tier rider's wolf or dire wolf takes the 60s too. The ultimates' forms keep their `sqrt(power)` stretch, as before. A foe
  that borrows one of these moves (the wolf packs, the yokai) keeps the old time (`timerFor`).
- **Kept from wave to wave.** When a wave is won, `keepCharges` (`run.ts`) now also calls `keepSummons`: each hero still standing keeps its
  summons (`Owned.summons`: kind, share of health, ms left, full length; a wraith also its health, attack and borrowed looks) and its shapes
  (`Owned.form`: which, ms left, full length, and the Werewolf's form, the moon's frenzy, the Kitsune's borrowed kind, attack share and
  looks). `boostOf` and `localBoost` hand them to the hero's `Boost.kept`; `fight()` calls `startKept` before the first tick: each summon
  stands on the free tile within 2 of its caller nearest the foes (the standard within 1, "planted again beside him"), and each shape is
  put back (looks, health, attack, rules). Summons are put down first, so a shape's attack does not lift them.
- **What ends one:** its timer (`kitTick` fades a summon; a shape ends as before, and the Werewolf is a man again when his form runs out);
  a summon falling; its hero falling (its shapes end at once, `endShapes`, so a hero raised again rises in its own shape; its summons fight
  on to the wave's end but are not kept); its hero not fielded in the next wave (benched, recycled or merged away: `keepSummons` writes every
  roster hero's record afresh after each wave won, so what it had is dismissed); the run's end. A merge's target keeps its own summons and
  shapes; the hero merged into it brings none.
- **Casting again renews the timer.** A summon call at the cap, the standard, Wild Shape, Alter Self and the Werewolf's same form are cast
  again only once a quarter of the time is left or less (`RENEW_AT`), and that renews the timer (the summon nearest its end, for a call at
  the cap). The AI's checks (`kits/when.ts`: Plant the Standard, Treeform, Fox Guise) follow the same rule.
- **Not built here:** the design's "skill levels lengthen it (+15% at Level 4, +25% at Level 5)": skill levels by use are batch 5, not yet
  built; `TIMER` is the one place they will stretch.
- **Saves:** `Owned.summons` and `Owned.form` are optional; an older save has none. `keptBoost` drops nonsense from a save (an unknown kind, a
  timer at or below 0, a guise of an unknown kind). The save version is not bumped.
- **Deterministic:** nothing here draws from any stream; the tiles are taken in a fixed order (nearest the nearest foe, then nearest the
  caller, then by row and column).

## On the page

- **The ring** (`src/render/unitView.ts`, `drawClock`): a small ring left of the health bar of a summon or a shifted hero, emptying clockwise
  from the top as the timer runs out: teal on a summon, gold on a shape, ember once a quarter or less is left. It is redrawn only when its
  step changes. Decoys show none.
- **The unit card** (`src/unitInfoRules.ts`): a summon's card says "Called up by Vuk: 41s of fighting left, kept into the next wave while
  its caller stands"; a shifted hero's has a Shape row with its time left.
- **The words:** the skills' and ultimates' texts give the new times (`kits/table.ts`, `abilities.ts`, `ultimates.ts`).

Screenshots (wave 2 of an army run whose five summoners and shapeshifters kept a wolf, a treant, a wraith, the standard and the Brute form
from wave 1; a presentation fixture: the roster is set by hand): `docs/samples/summon-timers-393x852.png`, `-360x780.png`, `-412x915.png`
(`node tools/summon-timers/shots.mjs`).

## Balance

**Parity** (`node tools/kits/tune.mjs`, 12,000 single fights; "main" is 0.284.0 in a clean checkout). Each hero's lift over the roster
average, in points:

PARITY_TABLE

**Over an army's waves** (`node tools/summon-timers/waves.mjs <army> <level> 40`, new: the hero and the Knight, Paladin, Archer and Cleric
at that level, no hires, merges or gear, charges kept between waves as the page keeps them; the mean waves won of 15 in 40 runs; the
Mercenary is a control with no summon or shape):

WAVES_TABLE

**What was tuned** (the power of the longer timers, not the timers): Wild Shape adds a fifth of her health (`TREE_SHARE`, a third when it
lasted 6s), and a hero Kitsune's guise lifts her attack by at most x1.3 (`GUISE_CAP`, x1.4 when it lasted 5s). Nothing else moved.

## The proof (identity fixtures)

`REWORKED` in `tools/spells/identity.ts` now names the seven: the Druid, Beastmaster, Reaper, Samurai Commander, Werewolf, Kitsune and Demon
Swordsman. The five `...Others` scenarios leave them out; they were recorded on main's code before this work and did not move.

IDENTITY_MOVED

## Tests

`test/summon-timers.test.ts`: a wolf carried into wave 2 with its health and time, its timer running on from there; a summon fades when its
timer runs out; a benched caller's summons dismissed, a fallen caller's not kept; a merge's target keeps its own; decoys not kept and show
no ring; the Werewolf's form, Wild Shape and the Demon form carry with their time left; the Werewolf's form runs out, a fallen hero loses its
shape at once; a call at the cap renews only with a quarter left; the wraith and the standard last 20s and 30s and carry (the wraith with
its looks and health); with the carry off nothing is kept, and an old save's nonsense is dropped.
