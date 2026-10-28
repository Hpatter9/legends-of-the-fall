# Hero kits, mana and manual ultimates (COMBAT-002)

> **Phase 2, built** (branch `claude/hero-kits`). The owner approved the design below with five answers (next section); this
> note now records what was built, where it differs from the design, the numbers it was tuned to and the balance before and after.
> The design itself (sections 1 to 11, further down) is kept as approved, with its numbers brought up to date where the build
> changed them. The short version for the owner is [`hero-kits-summary.md`](hero-kits-summary.md); the mock-up the bar was built
> from is [`hero-kits-hud-mock.png`](../samples/hero-kits-hud-mock.png).

## The owner's answers (2026-10-28)

1. **Auto is off by default.** Once a hero's ultimate is open, the player taps the portrait to fire it; the Auto switch at the end of the
   hero bar fires them on their own (kept as `Meta.ultAuto?`). Auto-replay always fires them. Headless runs and tests fire them, since
   `b.autoUlt` unset means Auto.
2. **Ultimates are rarer and bigger:** about **40 s** of fighting to fill the meter for an average hero (about 30 s for a front-liner,
   50 s for a support), and each ultimate at least as strong as it was.
3. **The Warlock is a leech**, as designed.
4. **Simple effects first, painted art later:** the new skills reuse or recolour the FX-003 signatures; the ones that still want
   their own painting are listed below (FX-004).
5. **Heroes need not be equal:** the parity band is 6 points, not 4.

## What was built

### The sim (`src/sim/heroKits.ts`, `src/sim/orders.ts`, `src/sim/kits/`)

- **One pool a hero** (`HERO_KITS()[kind].pool`): 17 mana, 28 stamina, as designed. The pool is kept in `Unit.charge` as a share of
  the pool in percent, so a run's carried charge, old saves and everything that reads `charge` stay valid; `resOf` gives the points.
  Summons, wraiths, the standard and every foe have none: foes keep `KITS`, their charge meter and `gain` exactly as before.
- **Two skills** (`Slot`: skill, cost, `tune`, gap, flags). Skill 1 from level 1, skill 2 from `SKILL2_LEVEL` (10). Every old skill is
  the same object as in `KITS` (so its FX-003 painting, its tier skills and the foes that borrow it are untouched): skill 1 for 43
  heroes, skill 2 for the Cleric and the Wanderer. Each hero's new skill is in `src/sim/kits/` (`front.ts`, `blades.ts`, `shooters.ts`,
  `casters.ts`, `callers.ts`); what they leave on fighters and the field (parries, smoke, marks, forms, a standard, a song, a vow, a
  stored charge, timed terrain, wraiths) and the rules that read it are in `kits/effects.ts`, called from the fight's generic places
  (`kitStrike` in `onStrike`, `kitBlow` after a blow, `kitSpare`/`kitDeath` in `hurt`, `kitTick` every tick, `kitQuick`/`kitDef` for speed
  and reach). The table of all 45 is `kits/table.ts`.
- **The AI** (`castHero`): a queued ultimate; an emergency (a heal for a friend under 35%, Smoke Bomb, Mirror Image, Shield Wall
  when the hero itself is in trouble); the ultimate on Auto; skill 2 then skill 1, each when open, affordable, past its gap and with
  something to do (the cast's own check). Skill 1 is held back while it is skill 2's turn (the two take turns) or skill 2 is about to
  be affordable; a mana healer keeps its heal's cost while a friend is under 60%.
- **The ultimate's meter** (`charge2`): fills from damage dealt (and healing given, and the hero's summons' damage), damage taken and
  time (`ULT_FILL`), times the ultimate's `tuned.rate` and the `ultRate` talent; full stays full; below level 30 it neither fills nor shows.
- **The tap** (`orderUltimate(b, unitId)` in `orders.ts`): checked like `castSpell` (the fight is on, a living placed hero, an open and
  full ultimate, no order waiting), queued on `b.orders` with an `ultQueued` event, applied at the start of the next tick, kept in
  `b.log` (with every king's spell), and fired the first time the hero is free; an order that cannot be fired within `ORDER_WAIT_MS`
  (3 s) lapses (`ultLapse`, the meter stays full). `replayLog(b, log)` plays a fight's log again; a test replays a tapped fight tick
  for tick. `b.autoUlt` (unset is Auto) is set by the page from the switch, and forced on under auto-replay.
- **The ultimates' twists:** Full Moon (both wolf forms at once), Curse of the Pharaoh (the two strongest foes are puppets for 2 s),
  Keelhaul (each cut a die, x1 to x3), Harvest of Souls (each kill rises as a wraith for 5 s), Ghost Fleet (its salvos set off barrels),
  Astral Convergence (every ally's pool fills by half).
- **What reads the pool now:** talents (`castHeal`, `castShield`, `castHaste` on skill 2 and the ultimate only; `refund` is a share of
  the cost), the old charge gifts (a tier rider, a combo beat, a gear ability, the bard's tune, a kill's charge back: `CHARGE_TO_POOL`,
  half a point of the pool's share for each point of charge), traits and gear `charge` (pool refill), Battle Cry (fills pools). Texts
  of traits, relics, combos and talents speak of pools.

### The page (`src/heroBar.ts`, `src/main.ts`, `src/standView.ts`, `src/battleUi.css`, `src/render/`)

- **The hero bar** replaces the bench in a fight: a tile a hero (portrait in the ultimate's ring, violet filling, gold when ready;
  health; the pool, blue mana or gold stamina; pips 1 and 2, lit when the skill can be paid for, "10" while skill 2 is locked; the
  name), "TAP" on a ready tile and "Lv 30" on a locked one, a turning ring while an order waits, a shake when it lapses, greyed
  when fallen; the **Auto** switch is the last tile. The king's spell cards are half as tall. Six to ten heroes (the Last Stand's
  eight, a Calamity's ten) take two rows. Text is 12 px and never bold. The ready glow is steady and the ring breathes (scale only:
  `test/no-flicker.test.ts` forbids looping brightness); reduced motion stills the ring.
- **The Last Stand** has the same bar in two rows above its buttons; **the Calamity's** fights use the page's bar.
- **On the field:** a hero's pool bar (blue or gold) and ultimate sliver under its health bar; a form or guise swaps the fighter's
  sheet (`Unit.look`: the Werewolf's white and black wolves, the Druid's treant at her grade, the Kitsune's foe); wraiths are their
  foe's sheet in a pale ghost tint; a foe turned to stone is grey; the standard is the castle courtyard's banner; ramparts and
  statues are the board's own ruined-wall props, a flood a pale water sheet, caltrops the snare rune, kegs the barrel's blast; a
  mark (Bounty, Condemned, Charged, Pinned, Dice 3 + 5...) is a 12 px word over the fighter.
- **Looks for the new skills** (`src/render/kitLooks.ts`): each borrows a close FX-003 signature, recoloured, and that skill's element
  for its wind-up and sound (a test holds that every one has a look).

### Where it differs from the design

Each of these was found in the tuning (the design's numbers, played, made skills fire about four times as often as the old
charge meter did, which the heroes' utility skills could not be tuned down from) or forced by a file outside this task's scope.

1. **The pools' pace.** Every gain of section 1 (the refill and the gains from blows) runs at `RES.PACE` 0.45 of the design's number,
   and a pool comes back faster once skill 2 is open (`SKILL2_PACE_MANA` 1.6, `SKILL2_PACE_STAM` 1.15). At the design's pace a level-1
   hero cast about 8.7 skills a minute against the old 2.2 and a team won 94% of fights it used to win half of; guards, banners, taunts,
   decoys and summons do not get weaker with `tune`, so the pace had to come down. Now a level-1 hero casts about 3.5 a minute (1.6
   times as often as before, each cast about half as strong), and at level 10 both skills come round in a fight.
2. **Pools start a little short of a cast** (`STAM_START` 20 of 60, `MANA_START` 20 of 100), not full and 40: with a cast in hand every
   blinker dived into the back line at the first tick and died, and every buff went up before the fight was joined.
3. **Costs** are the design's bands, with the mana skill 2s at the cheaper end (55 to 60, not up to 75) so they come round at all.
4. **Gaps.** The skills whose worth is what they do rather than what they deal keep a longer gap between casts (8 to 15 s: Shield Wall,
   War Banner, Mirror Image, Trade Places, Grappling Hook, Snare Trap, Pipes of Pan, Call of the Wild, Temporal Surge, Guardian Angel,
   Treeform, Fox Guise, Rewind, Condemn, Blood Fury, Blood Price, Font of Wisdom, Meteor, Flask Toss); the rest keep the design's 3 s
   (stamina) and 5 s (mana).
5. **The AI's holding rule** is stronger: once both skills are open they **take turns** (after a skill 1, skill 1 waits for skill 2) while
   skill 2 has something to do, which a cheap look per skill says (`kits/when.ts`). Without it the cheaper skill 1 took every cast and
   skill 2 hardly ever came round.
6. **The meter's numbers** are smaller, for the owner's 40 s (design: 20 s): `ULT_FILL` 16 per own max health dealt or healed, 26 per own
   max health taken, 0.55 a second (design 30, 45, 1), and each hero's `tuned.rate` is set for its role: about 30 s for a front-liner,
   40 for a striker, shooter or caster, 50 for a support. Shielding a friend does not fill it (healing does).
7. **Raise Rampart** raises a wall (impassable tiles for 10 s, drawn with the board's own ruined-wall props) rather than lifting the
   ground a step: the board's columns are drawn by `boardView.ts` and `columnTextures.ts`, the WORLD-126 files this task may not touch,
   and a tile that changed height mid-fight would have drawn its fighters off their column. For the same reason Flood and the Gorgon's
   statues are drawn as overlays (a water sheet, a ruined pillar) over the unchanged columns; the tiles' rules (water slows, a statue
   blocks) are the board's own.
8. **Kit details changed in tuning:** Overload needs one Charged foe (not two) and Chain Lightning's mark lasts 10 s (not 5); Stone
   Garden takes the strongest foe within 5 when none is held; Pied Piper works on a single foe; Treeform is a third more health for 6 s
   (not half again for 8 s); Fox Guise is 5 s with the borrowed attack capped at 1.4 times hers; Guardian Angel watches for 4 s; Mark
   for Coin is a quarter more for 10 s (not 15% for 8 s); Turning Wind also shoves the foes beside him; Raise Rampart also strikes and
   holds the foes beside the new wall; the Wolf Bard's standing song is a tenth more (Anthem) or less (Dirge) damage within 3, doubled
   by Change the Tune, and is up from level 10.
9. **Not done:** the Minotaur's Gore Charge wall-slam bonus (Gore Charge is shared with three foes, whose fights must not change); the
   Kraken Mate is slowed by his own flood like everyone (the design's "Sea Legs" is the Buccaneer's passive); the combo bar still feeds
   on each cast (the design's "10 of pool spent" was not needed: casts are only 1.6 times as frequent); the Ninja Monk's Flow and the
   Lancer's Momentum work from level 10 (with skill 2), the Shambler's spreading rot and the Arc Blade's store too.
10. **The bar:** no "HEROES · tap a glowing portrait" heading row (the tip says it once, and the field keeps the room); the ready tile's
    glow is steady and the ring breathes in size (the repo's no-flicker test forbids looping brightness), not a pulsing glow.

11. **`ultPow` multiplies.** A talent's `ultPow` now multiplies the ultimate's tuned power (`(1 + ultPow) * power`), as its text
    says ("hits 50% harder"); it used to be added to it, which was near enough while every power was below 1 but, with the
    ultimates now at 0.4 to 2.5 times their written strength, made a "+50%" talent worth a fifth.

### FX-004: the skills that still want their own painting

Every one of the 45 new skills (43 skill 2s, and Smite and Flask Toss) plays a borrowed FX-003 signature, recoloured, with that
skill's element for its wind-up and sound (`KIT_LOOKS` in `src/render/kitLooks.ts`). All 45 are the FX-004 list: each wants its own
lead painting in a ninth atlas, as FX-003 gave the old skills. The ones where the borrowed look fits worst, and so come first, are
marked **first**. The field art that is still drawn rather than painted: the flood's water sheet (no pack has a loose water tile) and
the marks' words.

| New skill | Plays now (borrowed signature) | Element | FX-004 |
| --- | --- | --- | --- |
| Shield Bash | Shield Wall | earth | later |
| Parry Stance | Iaido | wind | later |
| Smoke Bomb | Shadow Step | dark | **first** |
| Pinning Shot | Volley | wind | later |
| Wildfire | Meteor | fire | **first** |
| Brace Spears | Hold the Line | earth | later |
| Stillness Palm | Thousand Fists | light | later |
| Flask Toss | Sanctuary | light | later |
| Overload | Chain Lightning | lightning | **first** |
| Fox Guise | Fox Charm | dark | **first** |
| Pilfer | Dive | wind | later |
| Turning Wind | Wind Gust | wind | later |
| Shift | Ravage | dark | **first** |
| Bull Rush | Gore Charge | earth | later |
| Pied Piper | Pipes of Pan | wind | later |
| Stone Garden | Stone Curse | earth | **first** |
| Plant the Standard | War Banner | fire | **first** |
| Martyr's Vow | Holy Challenge | light | later |
| Smite | Judgement | light | later |
| Treeform | Call Treant | earth | **first** |
| Blood Fury | Bloodlust | fire | later |
| Spike Field | Snare Trap | earth | later |
| Soul Siphon | Hex | dark | later |
| Trade Places | Mirror Image | light | **first** |
| Fan the Hammer | Burst Fire | fire | later |
| Devour | Rotting Touch | dark | later |
| Suppressing Fire | Burst Fire | fire | later |
| Mark for Coin | Bounty Hunt | dark | later |
| Puppet Strings | Binding Wraps | dark | **first** |
| Roll the Bones | Grappling Hook | light | **first** |
| Change the Tune | Dirge | wind | later |
| Sic 'Em | Call of the Wild | earth | **first** |
| Flood | Undertow | ice | **first** |
| Wheel About | Lance Charge | wind | later |
| Bound Soul | Reap | dark | **first** |
| Rewind | Temporal Surge | lightning | **first** |
| Grounding | Voltage Blink | lightning | later |
| Powder Keg | Broadside | fire | **first** |
| Siege Mode | Shell Barrage | fire | **first** |
| Guardian Angel | Holy Light | light | **first** |
| Jump | Dive | fire | **first** |
| Raise Rampart | Earthquake | earth | **first** |
| Font of Wisdom | Starfall | light | later |
| Blood Price | Hellblade Sweep | dark | later |
| Condemn | Judgement | fire | later |

### The numbers as built

**The pools** (`RES` in `src/sim/heroKits.ts`; the design's section 1 has the same table, brought up to date):

| | **Mana** | **Stamina** |
| --- | --- | --- |
| Pool | 100 | 60 |
| Starts a fight with | 20 | 20 |
| Refill a second (`PACE` 0.45 of the design's 3), and from level 10 | 1.35, or 2.0 left alone (focus); 2.16 and 3.24 from level 10 | 1.35 (none for 1 s once emptied); 1.55 from level 10 |
| On a blow it deals | +1.35 (2.16 from level 10) | +0.9 (1.04) |
| On a blow it takes | nothing | +1.35 (1.55); +0.45 on a dodge |
| Skill 1 costs | 40 to 50 | 25 to 35 |
| Skill 2 costs | 55 to 70 | 40 to 50 (Blood Fury and Blood Price: 25 and 10% or 15% of health) |
| Shortest gap between two casts | 5 s (8 to 15 s for the utility skills) | 3 s (8 to 14 s) |
| Casts a minute, all heroes (level 1; level 10) | about 3.5 (old skill: 2.2); about 3 to 4 with both skills | |

**The meter** (`ULT_FILL`): 16 a hero's own max health dealt or healed, 26 a max health taken, 0.55 a second; times `tuned.rate`.
**The levels:** `SKILL2_LEVEL` 10, `ULT_LEVEL` 30 (unchanged). **The tap:** `ORDER_WAIT_MS` 3000.

### The balance, before and after

"Before" is `main` as this branch started from it (a copy of it played with the same tools and seeds); "after" is this branch.
The tools: `node tools/balance.mjs --heroes-only --games 12000 [--hero-level 30 --hero-stage 39]` (heroes), `SAVES=32 node
tools/curve/run.mjs cell ...` (armies), `node tools/balance.mjs --no-tables --calamity --attempts 150`, `node tools/dailyRate.mjs --days
60`, `node tools/stand-balance.mjs --levels 1,10,20,30,60,100 --attempts 60` (30 before).

**Hero parity** (each hero's win share against the average in fights of five; the owner's band is now 6 points):

| | Average | Spread (best to worst) | Worst against the average |
| --- | --- | --- | --- |
| Level 1, stage 5, before | 51.5% | 5.7 | within 4 |
| Level 1, stage 5, after | 53.1% | 10.5 | Samurai Commander +5.3, Illusionist -5.2, Knight +4.9 |
| Level 30, stage 39, before | 39.6% | 6.7 | within 4 |
| Level 30, stage 39, after | 52.6% | 11.4 | Druid +5.8, Demon Swordsman -5.6, Minotaur -5.3 |

At level 10 (stage 24) the average went from 23.5% to about 33%: the second skill is a real step up.

**Armies on Normal** at their recommended level (tries to clear, the curve tool's realistic player; the target is 2 to 3.5). The
armies' `start` (`src/sim/armies.ts`) moved for three of them: the Undead 1.47 to **1.41**, the Beasts 1.59 to **1.66**, the Wildwood
1.76 to **1.86**. Level 1 still clears only the first army (`test/armies.test.ts`).

| Army (level) | Orcs (1) | Undead (8) | Beasts (15) | Wildwood (22) | Labyrinth (30) | Ogres (38) | Infernal (40) | Yokai (46) | Golems (52) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Before | 2.1 | 2.9 | 2.8 | 2.7 | 2.9 | 2.9 | 3.0 | 2.8 | 2.7 |
| After, kits alone | 2.6 | 3.9 | 1.9 | 1.9 | 2.8 | 2.6 | 2.1 | 2.5 | 2.3 |
| After, retuned | 2.6 | 2.8 | 2.7 | 2.8 | 2.8 | 2.6 | 2.1 | 2.5 | 2.3 |

**The Calamity** (share of 150 greedy runs past each map's boss; the target 90/81/56/45/40/20). With the kits alone the late maps
were far too easy (30 runs: 90/87/73/63/63/50, and `test/calamity.test.ts`'s "a full clear is not the common case" failed, 11 of
24), so `CAL_SCALE` (`src/sim/calamity.ts`) went `step` 0.58 to **0.64**, `atkBias` 0.35 to **0.45** and `final` 0.33 to **0.6**:

| | Map 1 | Map 2 | Map 3 | Map 4 | Map 5 | Map 6 (cleared) |
| --- | --- | --- | --- | --- | --- | --- |
| Before | 90% | 78% | 52% | 38% | 35% | 17% |
| After | 92% | 79% | 65% | 51% | 47% | 15% |

**The daily** (60 dates, a fresh save; cleared with hearts / without): before 72% / 53%; kits alone 63% / 47%; after `DAILY_START`
(`src/sim/daily.ts`) 0.57 to **0.55**: 73% / 55%.

**The Last Stand** (median wave the king fell in; the target about 4, 10, 13, 22, 26, 35). With the kits alone the middle levels
fell short (the waves' bosses at 10, 20 and 25 are walls); `BOSS_START` (`src/sim/stand.ts`) 0.5 to **0.45** and
`WAVE_GROWTH_LATE` 0.11 to **0.07** (this changes the numbers in `last-stand.md`'s "Waves grow faster, then ease"):

| Level | 1 | 10 | 20 | 30 | 60 | 100 |
| --- | --- | --- | --- | --- | --- | --- |
| Before | 4 | 10 | 13 | 22 | 26 | 35 |
| Kits alone | 4 | 10 | 10 | 19 | 21 | 27 |
| After | 4 | 10 | 12 | 20 | 22 | 40 |

The Last Stand's runs are noisy (a boss wave either falls or it does not: the same knobs measured twice at 30 runs gave level 100
24 and 40), and level 20 to 60 sit a wave or a few short of the target; a later pass could tune the stand's bosses on their own.
`test/stand-regression.test.ts` is re-pinned (its fights have heroes in them, whose kits change them).

---

# The approved design (phase 1)

As the owner approved it, with the numbers of sections 1, 2 and 9 brought up to date where the build changed them (the
differences are listed above).

## The owner's ask, and the decisions already made

"I want to change the way heroes fight. I want them to have mana and abilities that unlock as they level up. 2 skills
that cost mana now, or stamina if they don't seem like a magic user. I want to control using the ultimate by tapping
their image at the bottom of the screen. ... Make them more varied though. Like I want a summoner, shapeshifter, random
odd classes to go along with what we have."

Decided: one pool per hero (mana or stamina) that refills over time; two skills that cost it (skill 1 at level 1, skill 2
at level 10); the ultimate stays at level 30 (`ULT_LEVEL`), charges on its own meter from damage dealt and taken, and is
fired by tapping the hero's portrait (or by an Auto toggle); all 45 heroes reworked, no new heroes; the fight HUD is
free to change.

## What exists now (what this builds on)

- **One skill a hero, on a charge meter.** `abilities.ts` `KITS[kind].skill` fills `Unit.charge` to `CHARGE_MAX` (100)
  from blows dealt (`dealt`), blows taken (`taken`) and time (`perSec`); `tryCast` (called from `decide` in `battle.ts`)
  fires it when full. A typical hero casts it about every 12 to 15 seconds.
- **Ultimates** (`ultimates.ts`, all 45, `unlock: ULT_LEVEL` 30) fill `Unit.charge2` at `ULT_RATE` (0.45) of the skill's
  rate times a per-hero `tuned.rate`, and fire on their own before the skill. They fire seldom (about one in fifteen
  fights for a typical hero, `ultimates.md`).
- **Tier skills** (`tierSkills.ts`) upgrade the skill at grade 2 and 3 with `mods` (talent keys) and `riders`.
- **The king's spells** (`spells.ts`): the page calls `castSpell(b, id, u, v)`, which checks the fight, the tile, the mana
  and the cooldown, changes the battle at once and leaves its events in `b.spells.events` for the next `stepBattle` to
  hand to the renderer. It is the one way the player acts inside a fight.
- **Foes share the kit table.** Bosses and elites borrow hero skills (`KITS.boneVolley = { skill: KITS.archer.skill ... }`,
  `bossPhases.ts`). Whatever changes for heroes must leave the foes' kits and their charge meter alone.
- **The HUD** (`#panel` in `index.html`, built in `main.ts`): the king's mana bar (`#mana`), three spell cards
  (`#spellCards`), and during a fight the bench (`#bench`) shrinks to five 32x35 portrait chips with health.

---

## 1. The resource rules

Every placed hero has **one pool**, `Unit.res` (0 to `resMax`), and a kind, `mana` or `stamina` (`HERO_RES[kind]`).
Summons (wolves, treants, decoys, the new wraiths and standards) and foes have none.

| | **Mana** (casters, holy, mystic, arcane) | **Stamina** (martial) |
| --- | --- | --- |
| Pool (`resMax`) | 100 | 60 |
| Starts a fight with | ~~40~~ **20** | ~~60 (full)~~ **20** |
| Refills over time | 3 a second (3% of the pool), **times `PACE` 0.45; from level 10 times 1.6** | 3 a second (5% of the pool), **times 0.45; from level 10 times 1.15** |
| **Focus** / **Winded** | **Focus:** +50% refill while the hero has not been hit for 3 s (back-liners kept safe cast more) | **Winded:** emptying the pool stops the refill for 1 s |
| On a blow it deals (a blow or shot that lands) | +3 (**times the same pace**) | +2 (**times the pace**) |
| On a blow it takes | nothing | +3 (a dodge gives +1), **times the pace**: **second wind**, the thick of the fight feeds it |
| Skill 1 costs | 40 to 50 | 25 to 35 |
| Skill 2 costs | ~~55 to 75~~ **55 to 70** | 40 to 50 (the Barbarian and Demon Swordsman pay 25 and a share of their health) |
| Shortest gap between two casts of the same skill | 5 s (**8 to 15 s for the utility skills**) | 3 s (**8 to 14 s**) |
| Typical cadence | ~~a spell every 8 to 10 s~~ **about a cast every 17 to 20 s, a little more from level 10** | ~~a skill every 4 to 6 s~~ **about a cast every 15 s, a little more from level 10** |
| Per-cast strength | ~~big: about today's skill~~ **each hero's `tune`, about half to the whole of today's skill** | ~~about 60%~~ **each hero's `tune`, mostly 0.3 to 0.8 of today's skill** |

So the two feel different: stamina is a small, fast pool that front-liners burn as they go (and get back by being in
the fight); mana is a deep, slow pool that rewards keeping a caster safe and pays out in fewer, bigger spells.
A hero sitting at a full pool wastes its refill, which pushes stamina heroes to spend freely.

**Levels.** Skill 1 is open from level 1; skill 2 opens at level 10 (`SKILL2_LEVEL`), the ultimate at level 30
(`ULT_LEVEL`, unchanged). The level is the one `Unit.level` already carries (`gradeBoost`: a kind's lasting level;
`localBoost`: the spire's and Calamity's in-run level, capped at 30). Below its level a skill is shown dimmed with
"Unlocks at level 10." and is never cast.

**Constants** (one table, `RES` in `src/sim/heroKits.ts`; as proposed, but `MANA_START` and `STAM_START` 20, `PACE` 0.45 and the level-10 paces): `MANA_MAX 100`, `MANA_START 40`,
`MANA_REGEN 3`, `FOCUS_MULT 1.5`, `FOCUS_MS 3000`, `MANA_ON_BLOW 3`; `STAM_MAX 60`, `STAM_REGEN 3`, `STAM_ON_BLOW 2`,
`STAM_ON_HIT 3`, `STAM_ON_DODGE 1`, `WINDED_MS 1000`; `GAP_MANA_MS 5000`, `GAP_STAM_MS 3000`; `SKILL2_LEVEL 10`.
Each skill also carries `cost` and a strength knob `tune` (like the ultimates' `tuned.power`), the per-hero balance dials.

## 2. The ultimate meter

`Unit.charge2` stays the ultimate's meter (0 to 100, so carried run state keeps working), but it no longer follows the
skill's charge. It fills from the fight itself:

| Source | Gain |
| --- | --- |
| Damage the hero deals (blows, skills, burns) | ~~+30~~ **+16 per the hero's own max health dealt** |
| Healing ~~and shielding~~ the hero gives allies | counts as damage dealt (so healers fill too) |
| Damage the hero takes (after shields) | ~~+45~~ **+26 per its own max health taken**; a blow a guard or block halves counts at half |
| Time in the fight | ~~+1~~ **+0.55 a second** (so no hero waits forever) |
| Per-hero knob | times `tuned.rate` (kept from `ultimates.ts`), times `1 + ultRate` (talent) |

**How long it takes** (the owner: rarer and bigger). An average hero fills it in about **40 s** of fighting (measured: 37.7 s
at level 30, stage 39); front-liners about 30 s, supports about 50 s (each hero's `tuned.rate`). A normal wave (20 to 40 s) sees
one ultimate from some of the five, a boss wave or a long Calamity fight about one each. Every ultimate is at least as strong as
it was (most were at 5 to 10% of their written strength; now 40% to 250%). The meter carries between waves of a run as it did
(`RunHero.charge2`).

**Ready.** At 100 the meter is full and stays full: no more gain, and nothing is lost by waiting. Below level 30 the
meter neither fills nor shows.

## 3. The AI's casting rules

`tryCast` becomes a small decision made each time a hero is free (`decide` in `battle.ts`):

1. **A queued ultimate** (the player's tap, section 5) goes first.
2. **An emergency** goes next: a heal when an ally in reach is under 35% health; a guard or escape when the hero itself
   is under 25% (Knight's Shield Wall, Kunoichi's Smoke Bomb, Illusionist's Mirror Image and so on, flagged
   `emergency` on the skill).
3. **Auto ultimate**, if the Auto toggle is on (or the fight is headless): fire it when full and its own check finds
   something worth hitting (today's `cast` returning false already does this: "a full charge waits if the skill has
   nothing to hit").
4. **Skill 2, then skill 1**, each only when it is unlocked, affordable, past its gap, and its **`when` check** passes:

   | Skill kind | Fires when | Targets |
   | --- | --- | --- |
   | strike (single target) | a foe is in its reach | the kit's own pick (weakest, toughest, nearest shooter, highest attack) |
   | area | 2 or more foes in the area, or the last foe, or a boss | `crowd()`: the 3x3 with most foes |
   | line | 2 or more foes on the best line | the line with most foes |
   | heal | an ally under 70% health in reach | the most hurt; most hurt allies together for group heals |
   | guard / taunt | 2 or more foes within 3, or an ally within 3 being struck | self |
   | buff / song / banner | 2 or more allies within its reach are fighting | the place with most allies |
   | summon | fewer than its cap stand | a free tile beside the hero |
   | form / stance | the form's condition holds (e.g. Werewolf under 50% health or 3 foes beside him) and 4 s since the last change | self |
   | mark | a boss, an elite or the toughest foe in sight | that foe |

5. **Holding.** A hero skips skill 1 when skill 2 is open, its check passes (or will within a second), and casting skill
   1 now would leave it short of skill 2 for more than 1.5 s (stamina) or 3 s (mana). A mana healer also keeps its heal's
   cost in reserve while any ally is under 60% health.
6. Otherwise, an ordinary blow (as now).

The checks reuse the helpers already in `abilities.ts` (`foesOf`, `crowd`, `apart`, the line search of `iaido`/`deadEye`,
the shooter search of `dive`/`grapple`). Randomness (the Buccaneer's dice, crits) stays on `b.skillRng`; nothing new
draws from the fight's main stream.

## 4. Auto, replay and headless runs

- **`b.autoUlt`** on the battle. **Unset means auto**, so every headless caller (tests, `npm run balance`,
  `tools/heroSweep.ts`, `tools/tries`, the autoplay bot of `autoplay.ts`, the Last Stand's `standAi.ts`) auto-fires
  without any change, exactly as they do now.
- **The page** sets `b.autoUlt` from the player's toggle, kept in `Meta.ultAuto?: boolean` (optional: an old save has none
  and gets the default). **Auto-replay always sets it on**, whatever the toggle says.
- **Default.** Proposed: **off** (manual) once the player's first hero reaches level 30, with a one-time tip on the hero
  bar; before that there is nothing to fire. (Question for the owner, section 11.)
- With Auto on, a tap still works: it fires that ultimate at once (it is just already about to fire).

## 5. The sim command: tapping an ultimate

The king's spells come in through one checked function the page calls (`castSpell`), and their events wait in the
battle for the next `stepBattle`. The ultimate uses the same path, made a queued command so that it is tied to a tick and
can be replayed:

```ts
// src/sim/orders.ts (new; pure, no Pixi or DOM)
export interface Order { t: number; kind: 'ult'; unit: number }   // (later: 'spell' too, see below)
/** The tap on a hero's portrait. Refuses (false, nothing changes) unless the fight is on, the unit is a living, placed
 *  hero (not a summon), its ultimate is unlocked and full, and it has no order waiting already. */
export function orderUltimate(b: Battle, unit: number): boolean;
```

- `orderUltimate` pushes `{ t: b.t, kind: 'ult', unit }` on `b.orders` and an `ultQueued` event on the spell-events
  queue (so the page lights the portrait's "queued" ring at once).
- **`stepBattle`** moves due orders onto their units (`Unit.ultOrder = b.t`) right after `b.t += TICK_MS`, before the
  units decide; `decide` then casts it as rule 1 of section 3 the first time the hero is free.
- **Waiting.** A hero mid-swing finishes its blow first (at most its `atkMs`, 0.55 to 2.4 s). A stunned, frozen or charmed
  hero, or an ultimate with nothing to hit, keeps the order for up to `ORDER_WAIT_MS` (3 s), trying each tick; then the
  order lapses (`ultLapse` event, the meter stays full, the portrait shakes once).
- **Replay.** Every order applied is appended to `b.log` (`{ t, kind, unit }`). A fight is a seed, a placement and this
  log, so `replayFight(seed, setup, log)` (a test helper) plays it out the same, tick for tick. King's spells should go in
  the same log (`{ t, kind: 'spell', id, u, v }`) so a recorded fight replays whole; `castSpell` itself keeps working as
  now (phase 2 may route it through `b.orders` too, which only moves a spell by under one tick, 100 ms).
- A test holds it: two runs of the same fight with the same orders at the same ticks end identical; an order for a
  summon, a foe, a fallen hero, a locked or unfilled ultimate is refused and changes nothing.

---

## 6. The 45 heroes

Rules for the table: **every hero's current skill stays** (same name, same cast, its FX-003 painting and its tier
skills), as skill 1 for 43 heroes and as skill 2 for the Cleric and the Wanderer. Each hero gets **one new skill**: skill 2 for 43
heroes, skill 1 for the Cleric and the Wanderer. Every **ultimate stays**; the ones marked *(tweaked)* gain a twist that fits the new archetype.
Passives stay unless the row says otherwise. **M** = mana, **S** = stamina. Costs are proposals for the first tuning
pass. "x1.8" means 1.8 times the hero's attack.

| # | Hero | Role (archetype) | Pool | Skill 1 (lv 1) | Skill 2 (lv 10) | Ultimate (lv 30) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Knight | Tank: taunt wall | S | **Shield Wall** (30): foes within 3 must strike him for 3 s; he takes half | **Shield Bash** (40): the foe in front is stunned 1.5 s and shoved a tile | Last Bastion |
| 2 | Samurai | **Parry duellist** | S | **Iaido** (30): dash up to 4 tiles, cutting every foe on the line | **Parry Stance** (40): for 2.5 s every melee blow on him is parried and answered with a cut x1.5 | Heaven-Splitting Cut |
| 3 | Kunoichi | **Blink assassin** | S | **Shadow Step** (25): blink behind the weakest foe, backstab x1.8 | **Smoke Bomb** (40): she cannot be targeted for 2 s; foes in the 3x3 smoke miss half their blows for 3 s; her next blow crits | Shadow Dance |
| 4 | Archer | Ranged: high-ground sniper | S | **Volley** (30): arrows on the best 3x3 in reach | **Pinning Shot** (40): the farthest foe in reach is pinned 2 s and takes 25% more from shots for 4 s | Arrow Storm |
| 5 | Fire Wizard | **Pyromancer** (spreading fire) | M | **Meteor** (50): 3x3 blast, ground burns | **Wildfire** (70): every burning foe in sight erupts: its 3x3 is hurt and set alight, so fire runs through a pack | Armageddon |
| 6 | Peasant | Tank: **formation militia** | S | **Hold the Line** (30): allies within 2 take half damage for 3 s | **Brace Spears** (40): pikes on the 3 tiles in front for 5 s; a foe stepping on one is struck x1.2 and stopped 1 s | Mass Muster |
| 7 | Ninja Monk | **Combo striker** | S | **Thousand Fists** (25): three quick strikes, stun 1.5 s | **Stillness Palm** (40): spends his Flow (passive: +1 per blow on the same foe, up to 5): x0.5 a stack, and the foe loses 30 skill charge | Hundred Fists |
| 8 | Wanderer | Healer: **alchemist** | M | **Flask Toss** (40, new): a healing draught on the most hurt ally (25% health), else a firebrew on the thickest 3x3 | **Sanctuary** (65): heals every ally, shield 2 s | Dawn Light |
| 9 | Lightning Mage | **Storm marker** (mark and detonate) | M | **Chain Lightning** (45): jumps through up to five foes, each left Charged 5 s | **Overload** (65): every Charged foe discharges: hurt, stunned 0.8 s, arcs to one neighbour | Thunderstorm |
| 10 | Kitsune | **Shapeshifter: mimic** and charmer | M | **Fox Charm** (45): the strongest foe nearby fights its own side for 3 s | **Fox Guise** (65): for 6 s she takes the shape (sprite), attack, reach and shot of the strongest foe in sight; foes pick her last | Nine-Tailed Dream |
| 11 | Karasu Tengu | **Thief** (back-line diver) | S | **Dive** (30): drops on a shooter, strikes x2 | **Pilfer** (40): dives on the foe with the fullest skill meter, steals half its charge and any shield it holds; allies near him gain 10 of their pool | Feather Storm |
| 12 | Yamabushi Tengu | Bruiser: **reflector** | S | **Wind Gust** (30): foes within 2 hurt and shoved; falls hurt | **Turning Wind** (45): for 4 s, shots aimed at allies within 2 of him are blown back at the shooter for half | Tempest |
| 13 | Werewolf | **Shapeshifter: two forms** | S | **Ravage** (25): bites the weakest foe in reach x2, heals half | **Shift** (40): Hunter form (white wolf: +25% speed, bites bleed) or Brute form (black wolf sheet: takes 25% less, blows splash); AI goes Brute under 50% health or with 3 foes beside him | Full Moon *(tweaked: both forms at once for 7 s)* |
| 14 | Minotaur | **Bulldozer** (wall slam) | S | **Gore Charge** (35): charge 4 tiles, x2, knock back, stun 1.5 s; double stun and x1.5 if the foe hits a wall, ledge or unit | **Bull Rush** (45): foes beside him are shoved 2 tiles; any that hit something are stunned 1.5 s | Stampede |
| 15 | Satyr | Support: **lure** (pied piper) | M | **Pipes of Pan** (40): allies within 3 hastened 4 s | **Pied Piper** (60): foes within 4 dance toward one spot 2 tiles ahead of him for 2 s (bunched up, not striking): sets up area blasts | Bacchanal |
| 16 | Gorgon | Control: **petrifier** | M | **Petrifying Gaze** (45): the strongest foe within 5 is struck and stunned 3 s | **Stone Garden** (65): every stunned or slowed foe within 5 turns to stone 2 s; a foe that dies as stone leaves a statue that blocks its tile for 6 s | Stone Curse |
| 17 | Samurai Commander | Support: **banner-bearer** | S | **War Banner** (30): allies within 3 hit a quarter harder 6 s | **Plant the Standard** (45): plants a standard (an immobile summon, a quarter of his health) for 10 s: allies within 2 of it take 10% less and hit 10% harder while it stands | Rally Cry |
| 18 | Paladin | Tank: **martyr** (redirects hits) | M | **Holy Challenge** (40): foes within 3 must strike him 3 s; allies beside him healed | **Martyr's Vow** (60): for 5 s half of all damage dealt to allies within 3 is taken by him instead (his block and block-heal still apply) | Divine Aegis |
| 19 | Cleric | Healer: **heals through damage** | M | **Smite** (40, new): holy blow x1.4 on a foe in reach; allies within 2 of it heal by the damage dealt | **Benediction** (60): cleanses every ally, heals each second 5 s | Divine Intervention |
| 20 | Druid | **Shapeshifter: treeform** and grove-keeper | M | **Call Treant** (50): a treant rises beside her (one at a time) | **Treeform** (60): for 8 s she becomes a treant (the treant sheet at her grade): health x1.5, +6 defence, foes beside her must strike her; she heals 15% when she turns back | Heart of the Grove |
| 21 | Barbarian | **Berserker** (stronger when hurt) | S | **Whirlwind** (30): cuts every foe in the 3x3 | **Blood Fury** (25 + 10% of his health): 5 s of 40% faster blows and 20% leech; while it lasts he cannot fall below 1 health | Bloodlust |
| 22 | Ranger | Ranged: **trapper** | S | **Snare Trap** (30): two snares where foes will step; held 2 s | **Spike Field** (45): caltrops on the 3x3 the foes will cross for 6 s: slowed by half and bleeding | Hunter's Net |
| 23 | Warlock | Damage: **leech** | M | **Hex** (45): the three toughest foes burn 5 s; he drinks 60% | **Soul Siphon** (65): channels 2 s on a foe, draining x1.5 a second; the drained health goes to the most hurt ally | Soul Harvest |
| 24 | Illusionist | **Trickster / decoy** | M | **Mirror Image** (40): slips away, two decoys draw foes 3 s | **Trade Places** (55): the most threatened ally swaps tiles with a decoy (or her); the foes keep beating on the decoy | Hall of Mirrors |
| 25 | Gunslinger | Ranged: **quick-draw** (reload rhythm) | S | **Dead Eye** (35): one slug through a line, more than double | **Fan the Hammer** (45): three fast shots at the nearest foe, then a 1.5 s reload | High Noon |
| 26 | Shambler | Tank: **plague / corpse-eater** | S | **Rotting Touch** (30): foes within 2 rot 4 s; he drinks part | **Devour** (40): eats a body that fell beside him in the last 10 s: heals 20% and grows +10% max health for the fight (up to 3 times). Passive adds: rot spreads to neighbours when its host dies | Plague Tide |
| 27 | Rifle Bot | Ranged: **suppressor** | S | **Burst Fire** (30): three rounds at the weakest in reach | **Suppressing Fire** (45): 3 s of fire on a 3-wide lane: foes in it are slowed 40% and their skills stop charging | Overclock |
| 28 | Mercenary | **Bounty hunter / executioner** | S | **Bounty Hunt** (30): slips beside the strongest foe, cuts nearly double | **Mark for Coin** (40): marks the strongest foe 8 s: every hero deals 15% more to it; if it dies marked he heals 20% and his stamina fills | Contract Killer |
| 29 | Mummy | Control: **puppeteer** | M | **Binding Wraps** (40): foes within 2 slowed 3 s | **Puppet Strings** (60): the hardest-hitting foe within 4 is bound 3 s: it walks to, and strikes, the foe the Mummy picks (the weakest one near it) | Curse of the Pharaoh *(tweaked: the two strongest foes are also puppets for 2 s)* |
| 30 | Buccaneer | **Gambler** | S | **Grappling Hook** (30): yanks a shooter in, cuts it, holds 1 s | **Roll the Bones** (40): two dice (skill stream): 2 to 4 a weak cut x1 and he is slowed; 5 to 9 x1.6; 10 to 11 x2.2 and bleed; doubles or 12 x3 and every ally hastened 3 s. Passive adds: a crit gives back 10 stamina | Keelhaul *(tweaked: each hooked foe's cut is a die, x1 to x3)* |
| 31 | Wolf Bard | Support: **songweaver** (aura) | M | **Dirge** (40): foes within 4 hurt a little, slowed 4 s | **Change the Tune** (55): switches his standing song (passive aura, 3 tiles: Dirge slows foes 15%, or Anthem: allies +10% attack) and doubles it for 6 s. Catchy Tune now gives +8 of the pool | Battle Hymn |
| 32 | Beastmaster | **Summoner: the pack** | S | **Call of the Wild** (35): a wolf answers (two at most) | **Sic 'Em** (40): every wolf leaps at the foe he marks (the weakest near them): +50% attack 4 s and a slowing bite; with no wolf, calls one | Hunt of the Pack |
| 33 | Kraken Mate | Tank: **tide-caller** (terrain) | S | **Undertow** (30): foes within 4 dragged a tile closer, slowed 2 s | **Flood** (45): the 3x3 round him turns to shallow water for 8 s (the board's own shallows: slows walkers; his Sea Legs ignore it) | Maelstrom |
| 34 | Lancer | **Momentum cavalry** | S | **Lance Charge** (30): charges 5 tiles for more than double, rides faster 3 s | **Wheel About** (40): rides 3 tiles clear of melee and gains full Momentum (passive adds: +10% to the next blow per tile ridden straight, up to +50%) | Charge of the Knights |
| 35 | Reaper | **Summoner: soul harvester** | S | **Reap** (30): cuts all within 3; under 30% take nearly triple | **Bound Soul** (40): the last foe that fell within 4 rises as a wraith on his side for 8 s at half its health and attack (a boss or elite gives only a wisp) | Harvest of Souls *(tweaked: each kill rises as a wraith for 5 s)* |
| 36 | Time Witch | Control: **time-bender** | M | **Temporal Surge** (45): allies within 3 hastened, foes within 4 slowed, 4 s | **Rewind** (65): the most hurt ally goes back 4 s: its health, its tile and its new ailments return to what they were | Time Stop |
| 37 | Arc Blade | **Capacitor** (absorb, release) | S | **Voltage Blink** (30): blinks into the thickest knot, discharges on the 3x3, holds 1 s | **Grounding** (40): releases what he stored (passive adds: 30% of damage taken is stored, up to 4x his attack) as a nova round him at x1.5, and heals 10% | Thunder Cascade |
| 38 | Dread Pirate | **Chain-reaction bomber** | S | **Broadside** (35): a ghost ship's broadside on a 3x3 | **Powder Keg** (45): rolls a keg to the thickest crowd; it bursts 1.2 s later on a 3x3 and sets off every powder barrel (the board's own) and keg within 2, chain after chain | Ghost Fleet *(tweaked: its shots set off barrels too)* |
| 39 | Siege Bot | Ranged: **siege mode** (stance turret) | S | **Shell Barrage** (35): a heavy shell on the thickest crowd within 7 | **Siege Mode** (40): anchors for 8 s: cannot move, +2 range, shells splash the 3x3, 25% faster; unanchors early only when a foe stands beside it | Orbital Strike |
| 40 | High Priestess | Healer: **resurrector** | M | **Holy Light** (45): heals and cleanses the worst hurt; those near it healed | **Guardian Angel** (65): the ally most at risk is watched 6 s: the first blow that would fell it leaves it at 1 health and heals it 30% | Resurrection |
| 41 | Queen Dragoon | **Jumper** (the dragoon's leap) | S | **Dragon Breath** (35): fire down the line with most foes | **Jump** (45): leaps out of the fight (cannot be targeted 1.5 s), lands on the thickest crowd: x2 on the target, x1 and a 0.5 s stun on the 3x3 | Inferno Breath |
| 42 | Juggernaut | Tank: **terrain shaper** | S | **Earthquake** (30): foes within 3 hurt, held 1.2 s | **Raise Rampart** (45): the 3 tiles in front of him rise a step for 10 s: a wall foes must climb or walk round, and high ground for the heroes behind it | Cataclysm |
| 43 | Great Sage | Support: **mana battery** | M | **Starfall** (50): stars on up to three crowds | **Font of Wisdom** (55): every ally within 4 gains 25 mana or 15 stamina | Astral Convergence *(tweaked: every ally's pool fills by half, plus the starlit shield)* |
| 44 | Demon Swordsman | **Blood pact** (pays health for power) | S | **Hellblade Sweep** (30): cuts all within 2, drinks a third | **Blood Price** (25 + 15% of his health): his next three blows deal 60% more and drink 30% | Demon Form |
| 45 | Tyrant | Support: **condemner** (focus fire) | M | **Judgement** (45): judgement on the toughest foe in reach and its 3x3 | **Condemn** (60): marks the toughest foe 6 s: heroes that can reach it go for it and deal 20% more; if it falls, every hero gains 10 of its pool | Reign of Terror |

Pool count: **17 mana** (Fire Wizard, Lightning Mage, Wanderer, Kitsune, Satyr, Gorgon, Paladin, Cleric, Druid, Warlock,
Illusionist, Mummy, Wolf Bard, Time Witch, High Priestess, Great Sage, Tyrant) and **28 stamina**. The rule: the holy,
mystic, arcane, caster and arcanist traits take mana, and so do the three spirit-magic heroes whose art casts (Kitsune,
Gorgon, Druid), the bard and the Mummy (his bindings are a curse). Everything else is martial.

New role lines for the bench card (`UnitDef.role`) follow the table's second column, e.g. Werewolf "Shifts between a
hunting wolf and a great brute", Reaper "Reaps the dying and raises them to fight for him".

## 7. Archetypes

At least one hero for each archetype the owner named, and more:

| Archetype | Hero | Why it fits |
| --- | --- | --- |
| **Summoner** (pack) | Beastmaster | Already calls wolves; now he commands them (Sic 'Em) as well as calling them |
| **Summoner** (dead) | Reaper | A ghost with a scythe: the souls he reaps get up and fight for him |
| **Shapeshifter** (two forms) | Werewolf | The art has a white and a black wolf (`werewolf_white`, `werewolf_black`): one per form |
| **Shapeshifter** (treeform) | Druid | Becomes the treant she already calls (the `cls_treant` sheets, graded) |
| **Shapeshifter** (mimic) | Kitsune | The fox spirit of folklore takes other shapes; she wears the strongest foe's sprite |
| **Puppeteer** | Mummy | Bandages as strings: he walks a bound foe into its friends |
| **Gambler** | Buccaneer | Pirate's dice; the luck is real (skill stream), the spread fixed and shown |
| **Alchemist** | Wanderer | A wandering mage with flasks: draughts for friends, firebrew for foes (no random pick: by need) |
| **Trickster / decoy** | Illusionist | Already leaves decoys; now she swaps a friend out for one |
| **Time-bender** | Time Witch | Haste and slow already; Rewind turns one ally's clock back |
| **Leech** | Warlock | Drinks already; Soul Siphon feeds what he drains to a friend |
| **Banner-bearer / aura** | Samurai Commander | Plants a real standard on the field that must be knocked down |
| **Songweaver / aura** | Wolf Bard | A standing song he switches, not a one-off cast |
| **Trapper** | Ranger | Snares, and now a field of caltrops |
| **Berserker** | Barbarian | Bloodrage already; Blood Fury pays health and cannot fall while it lasts |
| **Martyr / guardian** | Paladin | Takes his friends' wounds on himself, healing from what he blocks |
| **Mirror / reflect** | Yamabushi Tengu | A wind tengu turns arrows back on the shooter |
| **Chain-reaction bomber** | Dread Pirate | Powder kegs that set off the board's own powder barrels |
| **Healer through damage** | Cleric | A mace-carrying battle priest whose smites heal |
| **Blink assassin** | Kunoichi | Shadow step, then smoke and vanish |
| **Terrain shaper** | Juggernaut, Kraken Mate | A walking wall raises a rampart; the sea creature floods the ground |
| **Thief** | Karasu Tengu | The crow steals a foe's charge and shield |
| **Petrifier** | Gorgon | Stone foes that die stay as statues: walls made of foes |
| **Lure** | Satyr | Pied piper: pipes that gather foes for the area casters |
| **Capacitor** | Arc Blade | A machine that stores the blows it takes and lets them go |
| **Stance turret** | Siege Bot | Anchors into siege mode |
| **Jumper** | Queen Dragoon | The dragoon's leap, in the Final Fantasy way |
| **Blood pact** | Demon Swordsman | Pays health for power |
| **Condemner** | Tyrant | Names a foe for the whole party to bring down |
| **Mana battery** | Great Sage | Fills friends' pools |
| **Corpse-eater** | Shambler | Eats the fallen and grows |
| **Bounty hunter** | Mercenary | Marks a target and is paid for its death |
| **Parry duellist** | Samurai | Iaido and the parry stance (and a fix for his weak late-grade numbers) |
| **Combo striker** | Ninja Monk | Flow stacks from blows on one foe |
| **Momentum cavalry** | Lancer | Hits harder the further he rides straight |
| **Bulldozer** | Minotaur | Slams foes into walls and each other |
| **Pyromancer** | Fire Wizard | Fire that runs from foe to foe |
| **Storm marker** | Lightning Mage | Marks with lightning, then sets the marks off |

That is 30-odd distinct odd roles. **Coverage still holds:** tanks (Knight, Paladin, Juggernaut, Peasant, Kraken Mate,
Shambler, Yamabushi), healers (High Priestess, Cleric, Wanderer, Druid, Time Witch's Rewind), ranged damage (Archer,
Ranger, Gunslinger, Rifle Bot, Siege Bot, Fire Wizard, Lightning Mage, Great Sage, Warlock), control (Gorgon, Mummy,
Time Witch, Kitsune, Satyr, Juggernaut, Kraken Mate, Minotaur), support (Samurai Commander, Wolf Bard, Great Sage,
Satyr, Tyrant, Mercenary's mark), and melee damage (Samurai, Kunoichi, Werewolf, Barbarian, Lancer, Reaper,
Demon Swordsman, Dragoon, Mercenary, Ninja Monk, Arc Blade).

**Not equal, all useful.** Some are deliberately stronger in the right party: the Satyr's lure is weak alone and great
beside the Fire Wizard or Siege Bot; the Sage's battery does nothing for a party of stamina heroes but a lot for four
casters; the Paladin's vow is best with squishy back-liners. Section 9 says how the balance band could widen.

## 8. How the existing systems map over

- **Traits and synergies** (`traits.ts`). Unchanged as traits. The one effect that names the skill meter, `charge`
  ("skills charge faster with time"), becomes **pool refill** (same share). The Mystic trait's `mana` stays the king's
  mana. No hero changes traits.
- **Tier skills** (`tierSkills.ts`). **Kept.** Because every current skill stays, a tier skill keeps improving the skill it
  was written for, whichever slot it is now in (the Cleric's and Wanderer's ride on skill 2). Add one line at grade 3:
  the other skill costs 15% less. `mods` and `riders` work as now; riders fire on that skill's cast only. Echoes cost
  nothing, as now.
- **Last Oath combos** (`combos.ts`). Kept, same eight sets. The bar's "each skill they cast (10)" becomes "each 10 of
  pool they spend (+1.5)", so twice-as-frequent cheap stamina skills don't fill it faster. The Arcane Council's
  `{ k: 'charge', amount: 40 }` beat becomes "+40% of each ally's pool". Other beats unchanged.
- **FX-003 painted signatures.** All 90 hero skill and ultimate paintings stay on their skills (no skill is renamed). The
  45 new skills (43 skill 2s, plus Smite and Flask Toss) need signatures: about 20 reuse a close existing painting with a new
  release layout in `individualReleases.ts` (Smite on Judgement's light, Font of Wisdom on Battle Cry, Turning Wind on
  Wind Gust, Powder Keg on the powder-barrel blast, Jump on Dive, Spike Field on Snare Trap, Guardian Angel on Bulwark,
  Rewind on Time Stop, Overload on Static, Flood on Undertow); the rest get new cells in a ninth atlas (a follow-up FX
  task, FX-004, since painting is its own job). Until then a new skill plays its element's shared wind-up and ring, as
  every skill did before FX-003. Forms swap the unit's sheet (`Unit.form`), so no new art is needed for the Werewolf,
  Druid and Kitsune; the standard reuses the war-banner art; wraiths use the foe's own sheet with the ghost tint.
- **Talents** (`talents.ts`, `talentsDeep.ts`). Node ids unchanged (saves keep their points). `pow`, `dur`, `reach`,
  `extra`, `skillStun`, `skillSlow` apply to **both** skills; `castHeal`, `castShield`, `castHaste` fire on **skill 2
  and the ultimate only** (otherwise cheap stamina skills would double their worth); `refund` (charge back) becomes
  "this share of the skill's cost back"; `ultPow` and `ultRate` as now. The tier-2 nodes that name a hero's skill keep
  naming it (it still exists); about a dozen texts get "either skill" wording.
- **Gear** (`equipment.ts`, `equipFx.ts`). The `charge` stat ("a share faster skill charge") becomes "a share faster
  pool refill"; the Epic ability kind `charge` (gain charge on a trigger) gives that much of the pool; `mana` stays the
  king's. Nothing in `Meta.stash` changes shape.
- **Foes and bosses.** Untouched: they keep `KITS`, `CHARGE_MAX` and `gain`. The hero kits live in a separate table
  (`HERO_KITS` in `heroKits.ts`), looked up first for a hero; a boss that borrows a hero's skill object still gets the
  same `cast`.
- **Runs** (`run.ts`). `RunHero.charge` (skill charge kept between waves) is read as the pool's share in percent, so the
  saved 0 to 100 stays valid; `charge2` stays the ultimate's meter.

## 9. Impact

### Saves

Compatible, no version bump: `Meta.ultAuto?: boolean` is the one new field (missing = the default). Run, spire, Calamity
and Stand saves keep `charge`/`charge2` with a reading that accepts their old values. Talent node ids, tier data,
`combosSeen`, gear and shards are unchanged. A test loads a 0.169.0 save of each kind and plays a wave.

### Balance

Everything moves: skills fire more often, a second skill opens at level 10, and ultimates fire about four times as often
and by hand. The plan, in order, each step measured before the next:

1. **Level 1 parity, skill 1 only** (`test/hero-balance.test.ts`, 12,000 seeded fights, stage 5): tune each skill's
   `tune` knob and the pool constants so the roster sits where it does now. Target: total skill damage a fight within
   10% of today's.
2. **Level 10, both skills** (a new `hero-balance-kits.test.ts`): stage to be found where a level 10 team wins about half.
3. **Level 30, ultimates on auto** (`hero-balance-ultimates.test.ts`): re-tune each ultimate's `tuned.power` down for
   the faster meter (`tools/heroSweep.ts`'s damped search, as before).
4. **Armies** (`node tools/tries/run.mjs`, `npm run balance -- --no-tables --climb`): the nine armies' Normal at their
   levels (1, 8, 15, 22, 30, 38, 40, 46, 52, `army-curve.md`) within 0.5 mean tries of today; then Hard to Mythic
   (`--deep`). Knob order: the global `KIT_STRENGTH`, then army `start`.
5. **The Calamity** (`--calamity`): skill 2 opens at in-run level 10, mid-run; check the bosses' fights and the
   ascensions.
6. **The daily** (`dailyArmy`): check its ten waves at the levels players bring.
7. **The Last Stand** (`stand.ts`, `standAi.ts`): heroes guard posts, so blinks, jumps, Wheel About and Trade Places must
   respect the post leash; `stand.test.ts`, `stand-regression.test.ts`.
8. **The spire** (`--tower`) last.

Manual play is balanced at auto (the bot's play); a player who times ultimates well should do a little better, never
worse. **The band.** The owner's earlier rule is every hero within 4 points of the average; the owner now says heroes
need not be equal. Proposal: keep the test, widen it to 6 points (section 11 asks).

### Phase 2: the implementation plan

Ordered so each step builds, type-checks and passes its tests before the next.

1. **Kit data and types.** New `src/sim/heroKits.ts` (`HERO_RES`, `RES`, `HERO_KITS` with `skill`, `skill2`, `ultimate`,
   `passive`; costs, gaps, `when` checks, `tune`); `abilities.ts` (`Skill` gains `cost`, `gap`, `kind`, `emergency`,
   `tune`; `kitOf` looks up `HERO_KITS` for heroes); `units.ts` (role lines; summons: `wraith`, `standard`, `keg`).
   Tests: every hero has two skills and an ultimate, costs inside the bands, 17 mana and 28 stamina.
2. **The pool and the decision.** `battle.ts` (`Unit.res`, `resMax`, `lastHitAt`, `skillAt`; refill in `stepBattle`;
   gains in `hurt`/`settle`), `abilities.ts` (`tryCast` per section 3; foes keep the old path), `run.ts` (carry).
   Tests: `test/hero-resource.test.ts` (refill, focus, winded, gains, costs, gaps, level gates, holding).
3. **The ultimate meter and the order.** New `src/sim/orders.ts` (`orderUltimate`, `b.orders`, `b.log`), `battle.ts`
   (`autoUlt`, applying orders, the new meter gains), `abilities.ts` (`gain` split). Tests: `test/ult-orders.test.ts`
   (refusals, waiting, lapse, auto, replay equality, determinism).
4. **The new skills**, a few archetypes at a time, in `src/sim/kits/*.ts` (forms and sheet swaps; marks: charged,
   condemned, bounty; redirect; reflect; stored charge; flow; health history for Rewind; bodies for Devour and Bound
   Soul; statues; raised and flooded tiles as a timed overlay on `b.board`; the standard, kegs, wraiths). Tests: one file
   an archetype group (`test/kits-*.test.ts`), each skill doing what its line says, and determinism.
5. **The systems that read the meter.** `tierSkills.ts`, `talents.ts`/`talentsDeep.ts` (texts), `traits.ts` (`charge`),
   `equipment.ts`/`equipFx.ts`, `combos.ts`, `spells.ts` (Battle Cry fills pools), `bossPhases.ts` check, `standAi.ts`.
   Run their tests: `npm test -- tier talents traits equip combos spells stand`.
6. **The renderer.** `unitView.ts` (pool bar under the health bar, blue or gold; form sheets; raised and flooded tiles
   in `boardView.ts`), `fx.ts`/`skillFx.ts`/`abilityArt.ts`/`individualReleases.ts` (the reused signatures),
   `soundRules.ts` (cues for the new events).
7. **The HUD** (`main.ts`, `index.html`, the fight panel only): the hero bar, the Auto toggle, the compact spell cards
   (section 10), `Meta.ultAuto` in `meta.ts`, auto-replay forcing auto, the one-time tip. Check 393x852, 360x780 and
   412x915, reduced motion, and that a tap during the 0.1 s between ticks lands.
8. **Texts.** The hero sheet and dossier, the codex (`codex.ts`), the party picker's role lines. (Not the castle tab, the
   battle-picking menu tab or the army map: those belong to the owner's other AI.)
9. **Balance**, section 9's steps 1 to 8, with the tables written into this note.
10. **Hand-off.** Screenshots, `docs/notes/hero-kits.md` updated with what was built, the task board.

## 10. The HUD

See the mock-up. In the fight, the panel's bottom row (today five 32x35 bench chips) becomes the **hero bar**:

- five tiles (60x98 at 393 wide), one a hero, in the party's order; each with the **portrait** inside a round
  **ultimate meter** (a violet ring filling clockwise), the hero's **health** (thin green), its **pool** (blue for mana,
  gold for stamina, 7 px), and two **skill pips** (lit when that skill can be paid for; "10" while skill 2 is locked);
- **ready**: the ring turns gold, the tile glows and a "TAP" plate shows; a tap queues the ultimate (the ring spins
  while it waits); a lapse shakes the tile once. Below level 30 the ring is dark and a "Lv 30" plate sits on the portrait;
- a fallen hero's tile greys out (a heart revive lights it again);
- the **Auto** toggle is the sixth, narrower tile at the end of the row (on/off, with "ult" under it);
- the **king's row** stays above it: the king's mana bar (unchanged), and the three spell cards at half their height
  (icon left, name and cost right). The panel grows by about 50 px (from 137 to 188 at 393x852); the board's camera fit
  takes the difference. At 360 wide the tiles are 55 wide; at 412, 64.

Effects follow the owner's rule: a deliberate glow and pulse on a ready tile is fine; nothing flashes off and on, and
reduced motion turns the pulse into a steady glow.

## 11. Open questions for the owner

1. **Auto's default:** off (manual) when the first hero reaches level 30, as proposed, or on?
2. **The balance band:** keep every hero within 4 points of the average, or widen to 6 now that heroes need not be equal?
3. **Warlock as a summoner?** The owner named him; this design makes him the leech and gives the summoner role to the
   Beastmaster and the Reaper. Say if the Warlock should bind an imp instead.
4. **Ultimates by tap and Auto in the Last Stand and the Calamity:** same rules everywhere (proposed), or always auto in
   one of them?
5. **The ultimates' frequency:** about one per hero per wave, as proposed, or rarer and bigger?
6. **New art:** about 25 of the 45 new skills want new painted signatures (FX-004); are shared wind-ups acceptable until
   then?
7. **Terrain changes** (Rampart, Flood, statues) redraw board columns mid-fight; acceptable on a phone, or should they be
   painted marks only?

## Checks for phase 1

Documentation and images only. Runtime tests and builds were not needed for the change; `npm run web` was run once to
take the "before" screenshot of the current fight (wave 3 of the Orc Warband, Knight, Werewolf, Beastmaster, Fire
Wizard, Cleric, at 393x852), and the mock-up was painted over it with PIL.
