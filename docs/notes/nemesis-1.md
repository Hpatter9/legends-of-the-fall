# The Nemesis War, phase 1: named and remembered

Phase 1 of the expansion in `docs/design/legends-expansion.md` (section 9, "Phase 1: Named and remembered"), built to sections 2.1 to 2.4,
2.11, 5.1 and 7 of the design with the owner's answers to its open questions (the War touches Normal at half Might; the game always says
"heir"; power comes back to the main game only through the opt-in Emboldening, later). The Dark Council's turns, revenge, trophies, taunts,
duels, the Dynasties and the Calamity Rises are later phases and are not here.

## What it plays as

- **The War opens** on the save's first Normal clear of the Undead Legion (`warGate`, `openWar`). A save already past it opens the War on its
  next load, its Council empty (`loadMeta`). The wave card says so once: "The Nemesis War begins: the foes who hurt you will be remembered".
- **Who is named** (`noteNemesis`, called by `settleRun` where `noteBonds` is): a boss, a named elite or (rarely) an escort that **slew** a
  fielded hero (100% / 100% / 35%, an escort only while a lieutenant's seat is free or held at Might 1), **maimed** one (dealt half a hero's
  health and lived, or left a hero under 15% who then lived; 60% / 60% / never) or **escaped** (alive when the fight was lost; 100% /
  100% / never). Only an army run's waves and the Calamity's fights count; never the daily, the Last Stand, a quest or the old tower. A
  boss already a nemesis has no twin. The draws come from `new Rng(mixSeed(run.seed, NEMESIS_SALT, wave))`, never the fight's stream.
- **A newborn** takes a name from its army's bank (`nemesisNames.ts`, forty an army in its voice), Might 1, one trait drawn among those the
  log shows it earned, the **Dread** of the hero who dealt it the most, an epithet (its trait's, "the Unburnt", or its deed's, "Selam's
  Bane"), a rank (a boss is a captain, a lieutenant when the four captains' seats are full; any other a lieutenant) and a memory line
  ("Slew Kwame the Knight · Undead Legion · Hard · wave 15"). Its home army is the army whose waves hold it, or whose troops share its look
  (an elite or a Calamity boss).
- **Meeting it again.** At the run's start (`planNemeses`, in `startRun` beside the bonds' snapshot) the army's members are frozen into
  `Run.nemesis` with the waves they stand in: a boss nemesis as its own boss at that boss's wave; a captain born an escort beside the first
  mid-boss; lieutenants in ordinary waves from wave 3, a quarter of the waves, at most two a run (`PLACE_SALT`). In the wave
  (`armyWaveBand` in `armies.ts`, `nemesisBand`) a boss nemesis is the band's boss and any other takes an escort's place from the back, so
  waves do not grow longer.
- **How strong** (`nemStats`): a lieutenant starts from its base foe at x1.75 hp and x1.25 attack, a captain x2.5 and x1.35 (the design's
  starting x2.0 / x1.3 and x3.5 / x1.5 put the Ogre Clans 1.7 tries harder with four nemeses in one run; see the balance below); each Might adds
  6% hp and 3.5% attack (a boss nemesis 3% and 2% on its boss's wall); each scar 3% hp. **Normal takes half the Might.** Might runs 1 to 10
  and grows **+1 a run at most** (`Nemesis.grew` holds the run's seed) from a deed: slew, maimed or escaped again; each deed also adds a
  memory line, and a new trait if the fight earned one. At Might 5 a second weakness comes.
- **Intel.** The birth reveals its trait and its Dread (the player saw them happen). Each fight against it reveals one more secret; the card
  shows the rest as "?".
- **Slaying one** pays crowns by its Might (a lieutenant 40 a Might, a captain 80, a warchief 200), counted in the wave's crowns; it goes
  to the fallen (the last 30), with the hero whose blow felled it.

## Traits and weaknesses (`nemesisTraits.ts`)

Every trait of the design's tables is in `TRAITS`, read from the log by `traitsEarned` (`nemesis.ts`), at most 3 to a nemesis, **at most 2 of
them ailment immunities** (`canAdd`, `addTrait`; a fourth replaces the oldest, never the epithet's). Hooks, each a no-op without `Unit.nem`:

| Where | What |
|---|---|
| `ailments.ts`, `gate` | the immunities (Fireproof, Rime-hardened, Venom-blooded, Thick-hided, Grounded, Fearless); Iron Skull halves a stun |
| `battle.ts`, `hurt` (the damage-taken step, after the bosses' weaknesses) | `nemHurt`: Arrow-catcher, Battle-scarred, Spell-scorned, a chain's jump skips the Grounded; the Dread's +25% and its hero's ultimate's 1 s stagger; Fears *element* +25% while it suffers that ailment; Bane +20%, Healer-hunter +10%, Executioner +30%, Hill-king +10%, Lone Wolf +25%, Hates heights -15% |
| `battle.ts`, the fatal blow | Survivor: once a fight it stands again at 20% |
| `battle.ts`, the AI | Healer-hunter goes for healers in reach first; Elusive walks 20% quicker; Hill-king jumps one more (`defOf`) |
| `battle.ts`, the fight's making | Ambusher starts hasted for 4 s; Sure-footed's kit cannot be moved (its passive made `steady`) |
| `eidolons.ts`, the strike | Horn-deaf: 10 points less of its health |
| `heroKits.ts`, an ultimate | `NEM_CTX.ult` names the hero casting, for the Dread's stagger |

**Weaknesses.** The first is always the Dread of a hero. The second, at Might 5, is drawn (weighted by what hurt it) from *Fears fire,
frost, the storm or venom* (never an element it is immune to) and *Hates heights*. The design's *Craven*, *Vain* and *Glutton* come with
the phases that give them meaning (fleeing, duels, the Feasts).

**Where phase 1 reads the design narrowly**, so the owner can say otherwise:
- *Fireproof*'s "fire skills and spells deal it 25% less": the sim's skills carry no element, so it is the immunity to burning (the fire's
  lasting harm) alone. *Fears fire* is read the same way, by the ailment: +25% while it burns.
- *Elusive*'s flee at 20% and *Survivor*'s better chance of cheating death are phase 3's (fleeing and cheating death); here Elusive walks
  20% quicker and Survivor stands again once a fight.
- *Legend-slayer* is in the table but only the Oath (phase 7) can earn it.
- The warchief's seat, the War Trophies and the Spoils come with the Council (phase 2); phase 1 pays crowns.
- An "abandoned run" has no fight with foes standing in this game (the Calamity's abandon is between fights), so escaping is read from a
  lost fight.

## The log (`nemesisLog.ts`)

`tallyNemesis(tally, events, units, t)` reads each tick's events as `fightStats.ts` does, and what the foes show after the tick (an ailment
newly on a foe, which has no event of its own): damage each foe dealt each hero and from higher ground, its killing blows, the heroes it left
under 15%, its first strike's time; what it took in all, from shots, from blows in reach, from each ailment's ticks; the ailments laid on it,
the arcs through it, the king's spells, an Eidolon's strike, shoves, launches and falls; the damage each hero dealt it; and who felled it.
**It adds no hook inside the fight's step.** The page tallies its own ticks (`main.ts`); the tools use `playOutTallied`, which steps exactly
as `playOut` does.

## Saved (`meta.ts`, `run.ts`)

`Meta.war` (optional; `readWar` drops unknown fighters and secrets, clamps the numbers and holds the caps: 13 seats, 3 traits with 2
immunities, 2 weaknesses, 8 memory lines, 30 fallen). `Run.nemesis` (optional; `readRunNemesis` in `loadRun`). A save from before reads as
it was.

## On the page

- **In the fight** (`render/unitView.ts`): a nemesis's name plate over its health bar (its rank's colour, its name and epithet, its scars as
  ✕, a skull while the hero it dreads is on the field), a rim round its body in its rank's colour (lieutenant red, captain violet) and a
  slightly darker tone. All steady; nothing pulses. The boss's bar names a boss nemesis. The deploy bench puts a skull on the card of a hero
  a nemesis in the wave dreads.
- **The wave card** (`waveCard.ts`, `waveCardView.ts`, and the run's recap): "Remembered: Morrow the Unburnt, captain, slew a hero",
  "Slain: Hask, Pincushion by Ravi · 80 crowns", "Morrow the Unburnt grows stronger · Might 3", "Learned of Hask, Pincushion: Ambusher".
- **The Dark Council** (`nemesisView.ts`, `nemesis.css`): a gilded button over the Daily in the war camp (the camp has no war table of its
  own on the overlook; the Council stands beside the Daily, the camp's other board), the mightiest member's face in its medallion and the
  number named on its corner. It opens the board: a standard ornate sheet ("The Nemesis War", "The Dark Council", the seats filled), the
  captains then the lieutenants as gilded rows (face, name, Might, army, pay), the vacant seats in a line. A row opens the nemesis's card
  (a standard card): its face, Might as pips, meetings and pay; its traits and weaknesses ("?" and "Meet it again to learn more" until
  learned); its memory; Close and **Hunt**, which opens its army. The pyramid, the News, Fallen and Spoils tabs are phase 2.

Screens checked at 393x852, 360x780 and 412x915: `docs/samples/nemesis-1/` (`node tools/nemesis/shots.mjs`, saves in
`tools/nemesis/saves.ts`).

## Images (none new yet)

Phase 1 uses existing art only: the sprites' own `portrait()` cuts for the faces, the colour rims and tones as effects in the renderer, and
the board's standard ornate menu. These are the images the design (section 6) counts for the Nemesis War that would replace the
placeholders, written as prompts to generate them:

1. **Rank insignia, three, 32 px** (now: the rank's colour on the plate and frame). "A set of three small fantasy military insignia badges
   for a dark pixel-art strategy game, each on a transparent background, 32x32 pixels, crisp pixel art with a 1 px dark outline: (1) a
   lieutenant's badge, a single blood-red iron chevron with a small skull rivet; (2) a captain's badge, a violet-enamelled iron shield with
   two crossed spears; (3) a warchief's badge, a gold-and-black horned crown. Muted gothic palette, no text."
2. **Scarred portrait frames, three** (now: ✕ marks beside the face). "Three square portrait-frame overlays for a dark fantasy pixel-art
   game, transparent centre and background, 96x96 pixels, a thin brass frame with one, two and three deep claw-scratch scars cut across it,
   the scars showing dark red under the brass, pixel art, no text."
3. **The Dark Council's camp medallion** (now: the mightiest member's face). "A small round medallion icon for a dark fantasy pixel-art
   war camp, 48x48 pixels, transparent background: a black iron table seen from above with a war map and a single tall skull-helmed
   figurine in violet light, brass rim, pixel art, no text."
4. **Trait icons, twelve, 24 px, and an immunity shield overlay** (now: words only on the card). "A sheet of twelve 24x24 pixel-art icons on a
   transparent background, dark fantasy, 1 px dark outline, muted gothic colours: an iron skull, a broken arrow caught in a shield, a scarred
   breastplate, a boot planted on stone, a hand turning away a magic rune, a hunting horn with a cross over it, a heart stitched together,
   a crossed-out healer's cross, an executioner's axe, a dagger in shadow, a hill with a crown on top, a lone wolf's head. Plus one small
   round shield overlay, 12x12, to sit on a status icon's corner."

Each would be credited in `CREDITS.md` when made; none is loaded by URL, so the service worker's list does not change.

## Checks

- `test/nemesis-regression.test.ts`: eight army runs' waves (Orcs to Ogres, Normal and Hard, 63 waves with their mid-bosses) were pinned on
  main 0.376.0 **before the War's hooks landed** (its own commit) and still play out the same: the hooks change nothing when no nemesis is
  present. `stand-regression` and `ailments-identical` hold as before.
- `test/nemesis.test.ts`: each deed names a foe from a hand-built event log; the chances come from the War's own stream (and the fight's
  is never drawn); each trait comes from its log condition; the log reads an ailment newly laid; at most 3 traits and 2 immunities over a
  thousand generated nemeses; Might +1 a run, never past 10, Normal at half; slaying pays and moves it to the fallen; where a run's nemeses
  stand and the fight they make; the hooks (immunity, Dread, Bane, and nothing for a fighter with no `nem`); the save's round trip, an old
  save, the migration past the gate and the reader's caps; forty names to each army.
- Balance: `npm run balance -- --no-tables --nemesis typical|harsh|full` (`tools/balance.ts`, table 5g, and `tools/nemesis/warBot.ts`): below.

Table 5g fights each army on Normal at its own level (the recruits' party, talents learned, gear dressed, a castle of the level's size),
16 fresh saves a cell, at most 25 tries, the same seeds with and without the War (a paired comparison: the fights differ only where a
nemesis stands). Three Councils:

- **typical**: grown by real fights (`growWar`, 10 runs of each army, every third on Hard ten levels on): 12 members, Might mean 2.4 (the
  Orc Warlord, who kept escaping the bot, reached 10).
- **harsh**: the same members five Might up (mean 7.0) with three traits each.
- **full**: the stress test, four nemeses in every army's run at once (its last boss, a captain at the mid-boss, two lieutenants), Might 3.

| Army (Normal, its level) | no War | typical | harsh | full, Might 3 |
|---|---|---|---|---|
| Orc Warband (1) | 1.8 | 2.7 (+0.9) | 2.7 (+0.9) | 2.1 (+0.3) |
| Undead Legion (8) | 2.1 | 2.3 (+0.1) | 2.4 (+0.3) | 2.2 (+0.1) |
| Beast Packs (15) | 1.4 | 1.4 (no member) | 1.4 (no member) | 1.4 (+0.0) |
| The Wildwood (22) | 1.1 | 1.3 (+0.1) | 1.3 (+0.1) | 1.4 (+0.3) |
| The Labyrinth (35) | 3.3 | 2.6 (-0.7) | 2.5 (-0.8) | 2.9 (-0.4) |
| Ogre Clans (45) | 3.3 | 3.3 (no member) | 3.3 (no member) | 4.1 (+0.8) |

**No army's mean tries rises by more than 1** (the largest +0.88, the Orcs against a Might-10 Warlord, which is Might 5 on Normal). The
design's starting strengths for a named escort (x2.0 / x1.3 a lieutenant, x3.5 / x1.5 a captain) put the full test's Ogre Clans at +2.1 and,
at Might 8, +7.4; they are tuned to x1.75 / x1.25 and x2.5 / x1.35, which bring it to +0.8. A fall in tries (the Labyrinth) is the paired
seeds' noise: a nemesis changes the fights after it, and a few saves then clear sooner.

The last three armies (the Infernal Host, the Yokai and the Golem Forge) are out of the greedy bot's reach at their own level (they are tuned
for a player with hearts and mastered skills: 24 to 25 tries with or without the War, `--late-plus 15` included), so this table cannot
measure them; their nemeses follow the same numbers. Commands:

```bash
npm run balance -- --no-tables --nemesis typical --talents --attempts 16 --war-runs 10 --only orcs,undead,beasts,wildwood,labyrinth,ogres
npm run balance -- --no-tables --nemesis harsh --talents --attempts 16 --war-runs 10 --only orcs,undead,beasts,wildwood,labyrinth,ogres
npm run balance -- --no-tables --nemesis full --might 3 --talents --attempts 16 --only orcs,undead,beasts,wildwood,labyrinth,ogres
```
