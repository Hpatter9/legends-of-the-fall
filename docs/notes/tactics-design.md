# Tactics and formations: the design

A design for the owner's approval; no game code is changed yet. The owner: "I want to implement formations and tactics. The teleporting
strikers end up in a fight before the front liners even get there. We should have some way to stay together until the front liners
start." With it, the earlier depth idea: party building with real trade-offs (formation bonuses, counters against particular armies).

Read with [stats-6.md](stats-6.md) (the AI's flank and kite) and [joint-rebalance.md](joint-rebalance.md) (the pace targets and parity).

## 1. The problem, measured

`node tools/tactics/run.mjs` (new, read-only; `tools/tactics/measure.ts`) plays seeded field fights through the sim's own functions:
random teams of five from every hero, the nine field bands in turn, every hero at the level shown. "Placed sensibly" is what a careful
player does: front-liners (`roleOf` in `suggest.ts`) on the front deploy row, strikers in the middle row, the back line and support at the
back. "At blows" is a hero's first blow struck or taken. 1,000 fights a cell.

| | Level 1, stage 5 | Level 10, stage 27 | Level 30, stage 90 |
|---|---|---|---|
| Strikers at blows before any front-liner | 53% | 54% | 58% |
| Their lead (median / mean) | 1.3 s / 1.7 s | 1.5 s / 2.1 s | 1.4 s / 1.8 s |
| Of those, just after a blink or dash of their own | 37% | 37% | 38% |
| Strikers' health lost before the front line meets the foe | 11% | 17% | 23% |
| Strikers dead by 3 s after the front line meets the foe | 12% | 20% | 32% |
| Same, placed at random (the balance tools' placing): at blows first | 71% | 71% | 75% |
| Front line's first blow (median) | 2.6 s | 2.7 s | 2.7 s |

By hero (level 10, sensible placing; share of fights at blows before the front line): Kunoichi 94%, Karasu Tengu 92%, Werewolf 78%, Arc
Blade 66%, Queen Dragoon 56%, Lancer 53%, Buccaneer 43%, Reaper 42%, Samurai 39%, Mercenary 34%, Illusionist 33%, Kitsune 31%, Barbarian 17%.

So the owner's report holds: in more than half of all fights a striker is alone in the foe for one and a half to two seconds, and at the
higher levels a third of them are dead within three seconds of the front line arriving. The blink is only part of it: most early strikers
simply walk faster (the Werewolf's 340 ms step against the Knight's 760 ms).

### What staying together would be worth

Two crude prototypes, applied from the tool by holding a hero's `busyUntil` (they hold casts too, which the real rule would not):

- **Hold**: strikers and the back line wait until a front-liner is at blows (or a foe is within 3 tiles of them, or 8 s pass).
- **Pace**: strikers and the back line may walk, but not to a row ahead of the front line.

| Won (sensible placing) | Level 1 | Level 10 | Level 30 |
|---|---|---|---|
| Today | 62.1% | 48.2% | 70.1% |
| Hold | **68.2%** (+6.1) | **51.8%** (+3.6) | **74.2%** (+4.1) |
| Pace | 63.4% (+1.3) | 48.0% (−0.2) | 70.7% (+0.6) |
| Strikers at blows first, with Hold | 6% | 4% | 6% |
| Strikers who died, today / Hold | 85% / 77% | 89% / 82% | 77% / 64% |

Pace alone does almost nothing (the openers and the quick walkers still arrive first from behind the line); waiting for the line to meet
the foe is what pays. The won fights are no longer (median 29.8 s today, 29.5 s with Hold, level 10).

### It depends on the army (1,800 fights a column; won today → with Hold)

| Band | Level 10 | Level 30 |
|---|---|---|
| Ogres (brutes, imps) | 53.5 → **63.0** | 71.5 → 73.5 |
| Orcs | 50.0 → 50.0 | 71.0 → **78.0** |
| Demons | 28.5 → 29.0 | 53.0 → **60.5** |
| Werewolves (fast packs) | 34.0 → 37.0 | 66.5 → **71.0** |
| Satyrs | 60.5 → 60.0 | 79.0 → **84.0** |
| Mixed | 53.0 → 56.5 | 67.0 → 72.0 |
| Minotaurs | 66.0 → 68.5 | 89.5 → 91.5 |
| Gorgons (petrifying shooters) | 43.0 → 43.5 | 56.0 → 60.5 |
| Skeletons (spears, bone archers) | 47.5 → 46.5 | 67.0 → 67.0 |

Against brutes, staying together pays well; against shooters it pays nothing, because waiting only lets the archers shoot longer. That is
the trade-off the tactics are built on: no tactic is best everywhere.

## 2. Party tactics

One tactic a fight, picked before it. Three to start:

- **Advance together** (the default, for every save). Strikers and the back line march behind the front line and hold their openers
  until **the line meets the foe**: a front-liner strikes or is struck, or stands within 2 tiles of a foe. A held hero still casts its
  heals, buffs and self skills, a shooter still shoots whatever is already in its reach, and anyone strikes a foe that comes to it. It is
  let go at once if a foe comes within 3 tiles, after 6 s, or when no front-liner is standing (a party with none advances as Charge).
- **Charge**. Everyone goes at once: today's behaviour, unchanged. The pick against shooters and casters (skeletons, gorgons), where every
  second of waiting is a second of arrows.
- **Hold the line**. Nobody leaves the deploy rows (a front-liner may step out one tile to strike); the foe must come. Shooters take the
  high ground there. Let go when a foe reaches the line, or after 10 s if none has. Strong against chargers and brutes, weak against
  shooters, who whittle a party that will not come out.

A fourth, **Hunt the casters** (strikers go for the foes' shooters and casters first), is held back for a later batch (question 6).

### The openers

Each hero's gap-closing skill is tagged an **opener** in the kit table, and held under Advance and Hold until the line meets the foe. For
example: the Kunoichi's blink behind the weak, the Karasu's Pilfer dive, the Werewolf's Hunger leap, the Arc Blade's teleport slash, the Queen
Dragoon's Dragon Dive, the Lancer's charge, the Samurai's dash through a line, the Ninja Monk's leaping Quivering Palm and the Kitsune's
fox-fire blink in Alter Self (the full list is drawn from the kit table in batch 1). Escapes (Smoke Bomb's blink clear, the Lightning
Mage's blink before Storm Surge, the Archer's leap back) are not openers and are never held, and nor are a front-liner's (the Knight's
Shield Rush).

### Mid-fight: one call

A **Charge!** button in the fight's bar lets the player let everyone go early, once a fight (Advance or Hold to Charge only). It is an
order through `b.orders`, tied to a tick like every tap, so a fight still replays.

## 3. Formations

A formation is a shape on the three deploy rows. The game reads it from where the heroes stand when the fight starts (`formationOf`); the
player never has to name it, but can pick one and press **Arrange** to have the party set out in it. Each has a small bonus and a weak
point. A party in no shape is **Loose**: no bonus, no weakness.

| Formation | Shape | Bonus | Weak point | Suits |
|---|---|---|---|---|
| **Shield Wall** | 3 or more heroes side by side on the front row, two of them front-liners | +1 AC to each hero in the wall while a neighbour in it still stands beside it | The ends are open: a blow on an end hero from its outer side counts as from behind; slow (no march bonus) | Ogres, Orcs, Beasts |
| **Spearhead** | One hero at the front centre, two a row behind on each diagonal | The tip and its wings march 15% faster for 6 s, and the tip's first blow is +20% | The tip stands alone: −1 AC on the tip | Undead, Labyrinth (gorgons) |
| **Hollow Square** | Back-liners on the back row with heroes on both sides and in front | Back-liners inside cannot be struck from the side or back while the square holds (blows count from the front) | Packed together: area blows hitting the square's tiles +15% | Beasts, Yokai (divers and flankers) |
| **Skirmish** | No two heroes on touching tiles | Area blows and splash on the party −20% | No front: nobody is beside a friend, so guards, auras and ranks (the Peasant's, the Paladin's) reach fewer | Infernal Host, Golem Forge |

The numbers are a first guess, to be measured (section 6). A formation should be worth a few points against the armies it suits and cost
a few against the wrong ones, and never be a must.

## 4. Army counters (first proposal)

| Army | Its threat | Advice | Measured? |
|---|---|---|---|
| Ogre Clans | Brutes that hit hard | Advance or Hold, Shield Wall | Hold +9.5 at level 10 (ogres) |
| Orc Warband | Brutes in front, archers behind | Advance, Shield Wall | Hold +7 at level 30 (orcs) |
| Beast Packs | Fast wolves that flank | Hold the line, Hollow Square | Hold +3 to +4.5 (werewolves) |
| Undead Legion | Spears in front, bone archers behind | Charge, Spearhead | Hold +0 (skeletons): waiting does not pay |
| The Labyrinth | Minotaur charges, gorgons' stone at range | Advance, Spearhead | Hold +0.5 to +4.5 (gorgons), +2 (minotaurs) |
| Infernal Host | Imps and demons, fire | Advance, Skirmish | Hold +0.5 / +7.5 (demons); Skirmish to measure |
| The Wildwood | Satyrs that frenzy the grove | Advance together | Hold +0 / +5 (satyrs) |
| Yokai Night Parade | Crows and tengu that dive the back | Hold the line, Hollow Square | To measure |
| Golem Forge | Slow giants with area slams | Charge, Skirmish | To measure |

## 5. Picking them, and Auto

**On the prep screen**, next to Auto and Fight: one chip, "Advance · Shield Wall". A tap opens a bottom sheet (thumb height, no scrolling at
393x852): the three tactics as large buttons with one line each, then the four formations as small diagrams of the 8x3 rows with Arrange.
The board shows the chosen formation's tiles faintly until the heroes stand in it, and the chip says "Shield Wall ✓" once they do. The army
card carries one line of advice ("Orc brutes: stay together behind a shield wall"). The pick is remembered per army and per mode
(`Meta.tactics`, an optional field; an old save reads as Advance, Loose).

**Auto** (Auto place, autoplay and the balance tools, so the tools measure what Auto plays) picks by a fixed table, `autoTactic(foeKinds,
party)`, with no randomness: shooters and casters at least two in five of the foes → Charge and Spearhead; mostly brutes or chargers →
Advance and Shield Wall (Hold and Hollow Square when the party has two back-liners and the foes are quick); area blows common → Skirmish; a
party with no front-liner → Charge. Auto should land within about 2 points of the best hand pick, so leaving it on is never a punishment,
and a thought-out pick still beats it.

## 6. The sim rules

- **`src/sim/tactics.ts`** (pure, no Pixi or DOM): the tactic and formation types, `formationOf(board, heroes)`, `lineMet(b)`,
  `heldBy(b, me)`, `autoTactic`. A `TACTICS` switch (as `JOINT` is) for measuring and for tests that pin old fights.
- **The battle** gains `b.tactic`, `b.formation` and `b.lineAt` (when the line met the foe). The page sets them only through a new sim
  function, `setTactic(b, tactic, formation?)`, before `fight`; the mid-fight call is an order. A `lineMet` event lets the page show it
  (a short banner and a horn).
- **`decide`**: after fear, danger and a boss's signature, and before `tryCast`: a held hero casts only skills not tagged opener, strikes
  or shoots what is in its reach, and otherwise walks to its station (the tile behind the front line in its own column, by `walkFrom`) or
  waits `WAIT_MS`. Charm and taunt still override it.
- **Formations** are read once, at `fight`, from the placing. Their bonuses go through the existing hooks: AC through cover, march speed
  through the step's time in `stepTo`, the facing rule through `blowMult`'s way, area damage where splash is settled.
- **No dice.** None of it needs a roll. If a later rule does, it takes its own side stream, `new Rng(mixSeed(seed, 0x7ac7))`, so other
  fights play out as before.
- **Where it does not apply**: the Last Stand (its heroes guard posts and have their own mind) and fights the player does not set out
  (Eidolon trials, scripted scenes) fight as Charge. The foes have no tactic in the first batches (question 7).
- **Saves and replays**: `Meta.tactics` is optional; a replay stores the tactic with the placing.

## 7. Balance approach

1. Build the rules behind the `TACTICS` switch; with it off, every pinned fight plays as now.
2. Measure with it on and Advance as the default: the hero sweep at levels 1, 10 and 30 (parity within 6), `balance --deep` per tier,
   `army-pace`, `daily-rate`, the spire and the Calamity, `stand-balance` (should not move) and `tools/tactics` per army.
3. Advance is worth about +4 to +6 points everywhere, so the owner's pace targets would be missed easy-side. Pull the foes back up by
   their own scales, as the joint rebalance did (`FOE_START`, each tier's answer, the daily's `DAILY_START`), until every mode sits on its
   target with Advance. Charge then costs about 4 points against brutes and gains against shooters, which is the real choice.
4. Heroes whose worth was the opener (the Kunoichi, Karasu, Werewolf, Arc Blade) are read in the sweep under Advance; any beyond 6 is lifted
   or trimmed by its own kit, the owner's rule.
5. Formation bonuses are tuned so the right one against its armies is worth about +3 to +5 points and the wrong one about −3; Auto's table
   is checked against the best hand pick for each army.

## 8. Build plan

Each batch on its own branch, with its note and tests.

1. **Tactics in the sim.** `tactics.ts`, the openers tagged, Advance, Charge and Hold, `setTactic`, the switch. Tests
   (`test/tactics.test.ts`): a Kunoichi under Advance does not blink before the Knight is at blows; is let go when a foe comes within 3, and
   after 6 s; a party with no front-liner charges; Charge replays exactly as the switch off; Hold keeps everyone on the deploy rows until a
   foe arrives; a held Cleric still heals; the Last Stand is untouched; the same seed gives the same fight.
2. **The rebalance.** The measurements of section 7, the foes' scales retuned, pinned records updated with the owner's approval, the note.
3. **The page.** The chip and the sheet, the remembered pick, the Charge! call, the `lineMet` banner; checked at 393x852, 360x780 and
   412x915.
4. **Formations.** `formationOf`, the four bonuses and weak points, Arrange, the board's ghost tiles. Tests for each shape's reading, each
   bonus and each weak point.
5. **Auto and the counters.** `autoTactic`, the army cards' advice, the tools play Auto's pick; every army re-measured; the codex's words.
6. **Later, if wanted.** Hunt the casters; the foes' own tactics for a few armies and bosses.

## 9. Questions for the owner

1. **Advance together as the default for every save, existing ones too?** Recommended: yes; it is what the owner asked for, and Charge is
   one tap away.
2. **Keep the pace targets by making the foes stronger, or let Advance be a free lift?** Recommended: retune the foes so every mode sits on
   its target with Advance; otherwise the climb gets about 5 points easier everywhere.
3. **A mid-fight Charge! call, once a fight?** Recommended: yes; it is one tap, it suits a phone, and it replays.
4. **Formations: small stat bonuses, or behaviour only?** Recommended: small bonuses with a weak point each, worth about ±3 to 5 points;
   enough to matter, never a must.
5. **When do they open?** Recommended: the three tactics from the first fight; formations with Auto place (army 3), so a new player is not
   handed everything at once.
6. **A fourth tactic, Hunt the casters?** Recommended: later, after the first three are measured; it overlaps Charge against shooter armies.
7. **Should the foes use tactics too** (wolves that flank, a warlord's shield wall)? Recommended: later, for a few armies and bosses only,
   as a way to make them distinct.
8. **Which modes?** Recommended: every mode the player sets out (the climb, armies, the daily, the spire, the Calamity); not the Last Stand,
   whose heroes guard posts.
9. **Remember the pick per army?** Recommended: yes, per army and per mode, so a player who found the answer to the Ogres keeps it.
