# RPG spells and battlefield moves for every hero (design v2, for the owner to approve)

> **Status: design only.** Nothing in the game has changed. v1 (the renames, the revive) was read by the owner, who approved the
> revive rules, Mass Polymorph and "the Paladin is not a reviver", and asked to go deeper: "Go deeper. I want to see more movement
> abilities. Like a charge, teleport slash, pull an enemy in, an explosion or move that sends foes flying, a dig under the ground and
> pop up at the opponent doing damage and sending them flying. Walls, auras, teleports... Full rebalance. Prioritise using the
> ChatGPT effects visuals." This v2 answers that. The painting brief is [rpg-spells-art-prompt.md](rpg-spells-art-prompt.md).

## 1. The approach

- **A movement and battlefield toolkit** (section 3): eight shared mechanics (charge, teleport, pull, knockback and launch, burrow,
  walls, auras, swap), each written once in the sim with exact rules for walls, edges, units, heights, pits, water, lava, ice, barrels
  and bosses. Every hero skill that moves something calls the toolkit, so every hero's moves follow the same rules.
- **Every one of the 45 heroes gets at least one movement or battlefield move** that fits its fantasy (section 4). Many kits are
  genuinely reworked, not just renamed: the Juggernaut slams foes into the air and tunnels under them; the Kunoichi blinks from
  throat to throat; the Kraken drags a shooter into its arms and walls the field with a frozen wave; the Cleric walks in a ring of
  guardian spirits.
- **Classic RPG names** throughout, from the vocabulary D&D and most RPGs share (Wall of Fire, Spirit Guardians, Thunderwave,
  Misty Step, Dimension Door, Hunter's Mark...). No name is unique to one game. British spelling.
- **The revive** (section 2), as approved.
- **Painted effects first** (section 6): every move gets its own ChatGPT-painted strips (cast, travel, impact, the lingering wall or
  aura): **131 painted sheets** in seven painting sessions, the 62 for the toolkit and the signature moves first. Pack strips and the
  present atlas are only placeholders until the paintings land.
- **A full rebalance** (section 7), in batches, each measured at levels 1, 10 and 30, and on the armies, the daily, the Calamity and
  the Last Stand.
- **Kept from v1:** the fixed skill keys as batch 0 (section 8), the revive design, the tier 2/3/4 names (renamed again where skill 1
  changed).

## 2. The revive (approved)

**Who:** the four healers: the Cleric (**Revivify**), the High Priestess (**Resurrection**), the Wanderer (**Elixir of Life**) and the
Druid (**Reincarnate**). Not the Paladin. The High Priestess's ultimate is **Mass Resurrection**.

**Where:** a second face of skill 2, from level 10. Skill 2 keeps its usual effect. When a placed hero lies fallen and the healer's
revive is ready, the healer casts skill 2 as its revive instead (an emergency: before anything but a queued ultimate). Skill 2's pip
on the hero bar shows an ankh while the revive face is ready and someone is down.

| Rule | Value |
| --- | --- |
| Opens at | Level 10, with skill 2 |
| Cost | Skill 2's cost + 20 (80 of the 100 mana) |
| Cast | 1.2 s, cannot be cut short |
| Whom | The fallen placed hero nearest the healer, anywhere on the field (ties: the one that fell first, then the lower id) |
| Health | Rises at **30%** of its health, cleansed |
| Pool and meter | Its pool starts at its fight-start amount; its ultimate meter is emptied |
| Getting up | Busy and cannot be targeted for 1 s while it gets up (the heart revive's `getUp`, `RISE_MS` 720 ms) |
| Cooldown | **30 s** for each healer (its own clock), ready at the start of a fight |
| Once per ally per wave | A hero raised once in a wave (by a skill or by Mass Resurrection) stays down if it falls again |
| Team cap | At most **2 skill revives a wave**; Mass Resurrection is outside the cap, but the once-per-ally rule still holds |
| Never | Summons, wraiths, the Standard, the Duchess, the Last Stand's king; nobody once the fight is lost |
| The meter | Health given back by a revive does not fill the healer's ultimate meter |
| The Last Stand | **None**, as now: neither the revive face nor Mass Resurrection raises anyone there |
| Mass Resurrection | Up to **three** fallen rise at **40%**, every ally is healed and cleansed, and a Wall of Light (section 3.6) rises between the foes and the risen for 5 s |

Unchanged: things that stop a death (the Phoenix Feather, a rising feather, the talents' "rises at 30%", Deathless, Death Ward, Rage)
and a heart's revive. The sim pushes a `revive` event (`by`, `to`, `hp`) and the usual `heal`; the page plays `getUp()` with the
healer's own painted revive on top. No randomness: the target is chosen in a fixed order; the cooldown and marks are plain numbers.

## 3. The movement and battlefield toolkit (the new mechanics)

All of it runs in the sim on the 100 ms tick, on the grid (`W` x `D`), with heights, `canStep`, `walkFrom`, `standable`, `solid`,
`sightClear` and occupancy (`unitAt`). A move is **resolved at once, in the tick it is cast** (positions change at once; the fighter's
`step` and a new event tell the page how to animate it), so a fight never waits on the page and replays tick for tick. Nothing here
draws randomness: every choice is a fixed order (a score, then distance, then id). New state is optional (`Battle.walls?`,
`Battle.auras?`, `Unit.burrow?`, `Battle.raised?`), so old saves load.

### 3.0 The shared rules: moving a fighter that does not move itself

One function, `displace(b, by, f, path, how)`, moves a fighter along tiles. `how` is `shove` (pushed along the ground, tile by tile),
`drag` (pulled along the ground) or `launch` (thrown through the air). It checks each tile in turn:

| Next tile is... | Shove / drag (along the ground) | Launch (through the air) |
| --- | --- | --- |
| Free and standable | Moves on | Flies over it |
| Another fighter (either side) | **Stops; collision:** both take 0.25x the mover's caster's attack; nobody else is moved (no chains) | Flies over it |
| Solid (a boulder, a ruined wall, a raised wall of section 3.6), or the board's **edge** | **Stops; slam:** 0.4x attack, +0.1x for each tile it did not get to travel, and **stunned 0.8 s** | The flight ends on the last free tile before it, with the slam |
| A climb higher than 1 level (shove) / higher than its own `jump` (drag) | Stops; slam (a cliff is a wall) | Flies over anything up to 2 levels above where it took off; higher counts as solid |
| A drop of 2 levels or more (a ledge, a pit) | Moves on and **falls:** `FALL_DMG` (10) for each level dropped (as Wind Gust does now) | Fall damage from the take-off height to the landing |
| Deep water (`ground: 'deep'`) | Stops at the bank (a fighter on foot cannot stand there); no slam | Lands on the last standable tile before it |
| Lava | Moves on; set **burning** at once (`burnFor`, 3 s), and the lava's flares go on as now | Lands; burning at once |
| Ice | Slides **one tile further** (always: the walkers' 50% slide is for walking, a push always slides) | Lands and slides one tile |
| A powder barrel | Stops; the barrel **goes off** (the barrel blast that exists now) and the fighter takes the slam | Ends before it; the barrel goes off |

- **The landing of a launch** must be free and standable. If the aimed tile is not, it is the nearest free standable tile before it
  along the line, back towards the take-off; if there is none, it comes down where it took off. A launched fighter is airborne for
  `LAUNCH_MS` (450 ms + 60 ms a tile): it cannot act and cannot be struck by melee (shots and spells still hit it). On landing it is
  **stunned 0.6 s** (the hard-control rules apply), takes any fall damage, and the slam if it ended against something.
- **Direction.** A shove or launch goes straight away from the source (the caster or the blast's centre): the grid way `wayTo` gives
  (the longer axis). A drag goes straight towards the caster, and stops on the tile next to it. When one cast moves several fighters,
  they are moved in order: the farthest from the source first for shoves and launches (so the near ones are not blocked by those
  behind), the nearest first for drags. Ties go by id.
- **Fliers** (the Karasu, the Reaper, the Dragoon, flying foes) are moved like the rest, but take no fall damage and are never slammed
  by a climb or drop.
- **Who can be moved.** `Kit.passive.steady` (Reinforced Chassis, Living Rampart, Stand Firm, Iron Throne...) is never moved, as now.
  The Standard, decoys and the Last Stand's king are never moved. **Bosses** (`ailBoss`: a boss kind, a Calamity boss, a band's leader
  drawn bigger): shoves and drags are **half as far** (rounded down, at least 1); a **launch becomes a one-tile shove**; they are never
  swapped or teleported; the stun of a slam or a landing follows the boss rules (half as long, diminishing returns, immune after the
  fourth). Fighters drawn bigger than one tile (`size > 1`) are treated as bosses.
- **Heroes are never moved by their friends' shoves and launches** (no friendly fire); only a swap (3.8) and the Commander's charge
  move friends, on purpose.
- **Events:** `{kind:'shove', to, path, ms}`, `{kind:'launch', to, from, land, ms, peak}`, `{kind:'slam', to, at, what: 'wall' | 'unit'
  | 'edge' | 'barrel' | 'cliff'}`, `{kind:'fall', to, levels}`. The page draws a shove as a quick slide with dust, a launch as an arc
  (a parabola on the iso grid with the fighter's shadow left on the ground), and a slam with a crack and a small shake.

### 3.1 Charge and dash

`charge(b, me, o)`: the charger moves up to `o.tiles` to reach a target and strikes it. It generalises today's `chargeAt` (Gore Charge,
Lance Charge), `iaido` and `blinkStrike`.

- **`o.route: 'line'`** (today's charges): straight along one of the four ways, stopping at the first foe (struck), at a tile it cannot
  stand on, or at a climb over its `jump`. **`'path'`**: along `walkFrom`'s cheapest walk round others, up to `o.tiles` steps, to the
  free tile beside the target. **`'leap'`** (a jump in an arc, like a launch): to a free tile beside the target, over fighters and up to
  2 levels of climb.
- **`o.through`** (Iaido, Cavalry Charge): it runs through the foes on the line, striking each (`o.mult`), and needs only its end tile
  free.
- **On arrival:** the blow `o.mult` (the height and facing bonus `blowMult` applies: a charge downhill hits harder), then the
  optional rider: shove `o.shove` tiles, launch `o.launch` tiles, a stun, haste for the charger, or a 3x3 splash on landing (`o.land`).
- **Event:** `dash` (as now) or `launch` for a leap.
- **The AI:** of the foes it can reach, score each: the blow's damage, +50% for a shooter or caster (`range >= 2`), +30% for the
  target's lowest health share, +1 blow for each foe a through-charge also hits; −50% when the end tile has 3 or more foes beside it
  and the charger is under 40% health. It picks the best score (ties: nearer, then id) and holds the charge if no foe is in reach.

### 3.2 Teleport and blink

`blink(b, me, to)`: the caster vanishes and appears on a free standable tile at once, ignoring heights, units and walls between.
It is never onto deep water, a wall, a tile off the board or a tile in a Wall of Light of the other side.

- **To a tile** (Misty Step, the escapes): the free tile within `n` that is farthest from the foes (the sum of distances to the three
  nearest), then higher ground, then nearer, then index.
- **Behind a target** (Sneak Attack, Swoop, Ambush): the tile on the far side of the target from the caster's side (the side its
  `facing` turns away from); if that is taken, any free tile beside the target, the one farthest from the target's friends first.
  Today's `blinkStrike` already does a simpler form.
- **Teleport slash** (Assassinate, Killing Spree, Lightning Storm): up to `k` foes in turn, each chosen by the skill's order (weakest,
  hardest-hitting...), each within `reach` of the last; the caster appears behind each and strikes `o.mult`, each foe once. It ends
  behind the last (or, with `o.home`, back where it started). Between hops it cannot be targeted (`hideUntil`, as Smoke Bomb).
- **Event:** `blink` (as now: `from`, `to`), one per hop, `ms` apart (120 ms) for the page's streaks.
- **The AI:** escapes when its health is under 30% and two or more foes are beside it, or a shooter has a foe beside it. Strikes go for
  the skill's chosen order.

### 3.3 Pull

`pull(b, me, f, n)`: drags a foe up to `n` tiles straight towards the caster (3.0's `drag` rules), stopping on the tile beside it or at
an obstacle. A drag up a climb higher than the foe's own `jump` stops there and slams it; a drag down 2 levels or more drops it with
fall damage. Today's `drag` (Undertow, Maelstrom) and Grappling Hook are the simple form.

- **The AI:** pull a **back-line** foe (a shooter or caster at range 3 or more), the hardest-hitting first; never a foe that is
  already beside a hero; a boss only when nothing else is in reach. With a pull of 1 for many foes (Grasping Tentacles), pull when
  three or more are in reach.

### 3.4 Knockback (shove) and launch

`shove(b, me, f, n)` pushes a foe up to `n` tiles straight away, along the ground. `launch(b, me, f, n)` throws it `n` tiles in an
arc (3.0 for both). Today's Wind Gust, Bull Rush and Shield Bash are shoves of 1 or 2.

- **What makes a good shove or launch** (the AI's score for each foe it would move, summed over the foes): the hit itself; **+1 blow**
  for a slam (into a wall, a unit, the edge or a barrel); **+1 blow** for each 2 levels of fall (off a ledge, into a pit); **+1 blow**
  for landing on lava; **+0.5** for each foe moved away from a hero shooter or caster beside it; **−1** for a foe sent towards a hero's
  back line (a caster behind the foe). It casts the shove or launch only when the score beats a plain hit by half, and picks the
  direction or crowd with the best score.
- **Explosions that send foes flying** (Powder Keg, Bombard, Orbital Strike, Fireball's ultimate, Seismic Slam) launch from the
  blast's centre outward.

### 3.5 Burrow

`burrow(b, me, o)`: the caster digs down and comes up under a foe.

1. **Down** (the cast): it is underground for `o.ms` (800 ms + 100 ms a tile travelled): it cannot act, cannot be targeted or struck
   (`hideUntil`), and its ailments keep ticking. Its tile is free while it is gone. Event: `burrow` (`phase: 'down'`, `u`, `v`, `ms`),
   then `burrow` (`phase: 'move'`, the tunnel's path for the page's moving mound).
2. **The target** is chosen as it goes down: the foe within `o.reach` (5 or 6) with the most foes beside it (back-line foes counted
   twice), ties by distance then id. A pending event (`b.pending`, the way meteors fall now) brings it up.
3. **Up:** at the target's tile *at that moment*, if the target still stands within `o.reach + 2`; else at the nearest foe within
   `o.reach`; else where it went down. The foe on that tile is struck `o.mult` and **launched** `o.launch` tiles (away from where the
   caster went down); the caster takes its tile. Every other foe beside it takes `o.splash` and is shoved 1 tile outward.
   Event: `burrow` (`phase: 'up'`).
4. It cannot come up on deep water, a wall, or a tile in the other side's Wall of Light (the nearest free tile beside instead). A
   **boss** at the eruption is not launched (a one-tile shove, by 3.0), and takes the strike.

**The AI:** it burrows when the best target is out of the caster's walking reach this second, or is a back-line shooter, or has three
or more foes beside it; never when the caster is the last hero standing.

### 3.6 Walls

`raiseWall(b, me, tiles, kind, ms)` lays timed terrain (it extends today's `layTerrain`, which already lays the Juggernaut's rampart,
the Kraken's flood and the Gorgon's statues). A wall tile goes back to what it was when its time runs out (or when it is broken).

| Kind | Blocks walking | Blocks shots and sight | When touched | Breaks |
| --- | --- | --- | --- | --- |
| **Stone** (Wall of Stone, the Fissure's spires) | Everyone | Yes (as a ruined wall, `WALL_TOP`) | — | Only by time |
| **Ice** (the frozen Tidal Wave) | Everyone | No (it is clear) | A foe beside it is **chilled** each second | A launch or shove that slams a fighter into it shatters that tile (the slam still lands) |
| **Thorns** (Wall of Thorns, Spear Wall's stakes) | Everyone | No | A foe that ends a second beside it takes 0.3x the caster's attack and **bleeds** 3 s | Only by time |
| **Light** (the Wall of Light) | **The other side only:** the caster's side walks through it | The other side's shots (theirs stop at it; the heroes' pass) | A foe that ends a second beside it takes 0.2x, holy | Only by time |
| **Fire** (Wall of Fire) | Nobody: it can be walked through | No | A foe in it or walking through it **burns** (0.3x a second, as `burnFor`), and it re-lights each second it stands there | Only by time |
| **Wind** (Wind Wall) | Nobody | **Shots only** (arrows, bolts, bullets aimed through it fly back at the shooter for half, as Turning Wind does now) | — | Only by time |

- **Where:** only on free standable tiles with no fighter, barrel or wall. The **side-aware walls** (light) need `canStep` and
  `sightClear` to know the walker's side; `b.walls` holds `{i, kind, side, until, by}`, and `walkFrom` and the shot checks read it.
- **Never seal anyone in:** before a wall is laid, a flood fill checks that every fighter on both sides can still reach at least one
  foe by walking (the way `boardOk` checks a board). Any tile that would break that is left out. A wall never covers a deploy tile in
  the Last Stand's dais.
- **The AI chooses the line:**
  - **Choke** (Wall of Stone, Wall of Thorns, Wall of Light): take the hero most at risk (a back-line hero whose nearest foe is within
    3, else the lowest health share). Take the crowd's centre (the mean tile of the foes within 5 of it). Lay the line of 3 (or 4)
    across the way between them, two tiles from the hero, at right angles to that way. Cast only when it would cover the walk of two
    or more foes (their `walkFrom` path to the hero crosses it).
  - **Lane** (Wall of Fire): along the line the most foes are walking (their next three steps), 4 tiles.
  - **Shield** (Wind Wall): in front of the friends a foe shooter is aiming at.
- **Events:** `terrain` (as now) with the new kinds, `ms`, and the side; `wallBreak` (`u`, `v`) when an ice tile shatters.

### 3.7 Auras

`aura(b, me, o)`: a lasting area round the caster (it moves with it) or on a tile, for `o.ms`, that acts every `o.every` (500 ms or
1000 ms). Today's standing songs, the Standard, Halo, Grace and Mountain Breath are the same idea; the new auras run through one
table, `b.auras`, ticked in `kitTick`.

- **Fields:** `at` ('self' or a tile), `reach` (Manhattan tiles), `ms`, `every`, and for **allies** inside: `guard` (a share less damage
  taken), `atk` (attack up), `heal` (a share of max health each tick), `ward` (shrug off the next ailment once), `pool` (mana or
  stamina each tick); for **foes** inside: `dmg` (a share of the caster's attack each tick, `src: 'skill'`), `slow`, an ailment (burn,
  poison, curse, bleed, shock).
- **Stacking:** the same aura from the same caster refreshes its time; two different auras both work; the same guard from two casters
  counts once, the stronger.
- **An aura ends** when its time runs out or its caster falls (a tile aura stays until its time ends).
- **The AI:** cast when two or more allies (a buff) or foes (a harm) are within reach, or at once at a fight's start for the
  lasting buffs (the aura's own check).
- **Event:** `aura` (`by`, `at`, `reach`, `what`, `ms`); the page draws its painted ground loop and motes (section 6) for the time it
  lasts.

### 3.8 Swap places

`swap(b, me, x, y)`: two fighters change tiles at once, ignoring the ground between. Both must be on standable tiles each could stand
on (a fighter on foot never lands on deep water: a flier swapped there keeps flying). Never a boss, a `size > 1` fighter, the Standard
or the Last Stand's king. A swap of a foe needs that foe within the skill's reach and in sight.

- **The AI:** rescue: the friend in most trouble (under 35% health with two or more foes beside it) with the caster (Transposition),
  or with the healthiest friend within 5.
- **Event:** `swap` (`a`, `b`); the page plays the painted swirl at both ends.

### 3.9 Rules that apply to all of it

- **Line of sight:** blinks, swaps and pulls need sight (`sightClear`), except where a skill says "anywhere".
- **Hard control and bosses:** the stuns from slams, landings, eruptions and walls are hard control: half time and diminishing
  returns on bosses, as `gate` does now.
- **Talents:** `reach` adds tiles to charges, pulls, shoves, walls and auras; `dur` lengthens walls and auras; `extra` adds a target
  to a teleport slash.
- **Combos and the king's spells** are unchanged; Earthquake (the king's) hurts foes on low ground, and a foe launched into a pit is
  on low ground.
- **Performance:** walls and auras are a few entries a fight; the flood fill runs only when a wall is laid. No per-tick allocation.

## 4. The heroes

How to read the tables: **1** is skill 1 (from level 1), **2** is skill 2 (from level 10), **U** is the ultimate (level 30), **T** is
the tier 2 · 3 · 4 names (they improve skill 1, except for the Cleric and the Wanderer, whose tier skills improve skill 2). The tags
say which toolkit part a move uses: **[Charge] [Blink] [Slash]** (a teleport slash), **[Pull] [Shove] [Launch] [Burrow] [Wall]
[Aura] [Swap]**. "x1.6" means 1.6 times the caster's attack. The cost is in the hero's pool (st = stamina, out of 60; mana, out of
100), then the gap (the shortest time between casts; mana 5 s, stamina 3 s unless given). "Visual" names the painted sheet of
section 6 (the art brief's key); "Sound" is the rendered pair from `tools/spell-sfx/` (`cast-` and `fx-`), or a toolkit sound (`mv-`).
The strengths are the starting numbers; each batch tunes them (section 7).

### 4.1 Tanks

| Hero | | Name [toolkit] | What it does | Cost | Visual · Sound |
| --- | --- | --- | --- | --- | --- |
| **Kwame · Knight** | 1 | **Shield Wall** | The foes within 2 turn on him, and he takes half damage for 4 s; cast at once when he falls under 30% | 30 st, 11 s | aura-protection (gold, small) · `shield-wall` |
| | 2 | **Shield Rush** [Charge] [Shove] | Charges up to 3 tiles in a line at a foe, bashes it (x1.2, stunned 1 s) and drives it 2 tiles back (a slam into a wall or a friend of its own hits again) | 40 st, 8 s | dash, shove · `mv-dash`, `mv-shove` |
| | U | **Indomitable** [Aura] | Every foe within 5 must go for him for 6 s; he takes half damage, a shield of a quarter of his health forms, and an Aura of Protection (allies within 2 take 20% less) holds for 6 s | meter | aura-protection · `indomitable` |
| | T | Iron Wall · Fortress · Unbreakable Bastion | | | |
| **Karim · Paladin** | 1 | **Divine Smite** | A radiant blow on the foe before him (x1.2; undead and fiends take half as much again); then the foes within 3 must attack him for 3 s, and the allies beside him are healed | 40 mana | divine-smite · `divine-smite` |
| | 2 | **Aura of Protection** [Aura] | For 8 s, the allies within 2 of him take 15% less and heal 1% of their health a second, and each shrugs off the next ailment once | 60 mana, 12 s | aura-protection · `aura-protection` |
| | U | **Holy Nova** | The foes within 4 are struck (x1.2) and must go for him for 5 s; the allies near him are healed and shielded | meter | holy-nova · `holy-nova` |
| | T | Searing Smite · Blinding Smite · Banishing Smite | | | |
| **Minh · Peasant** | 1 | **Phalanx** | Allies within 2 take half damage for 3 s | 30 st | phalanx · `mv-wall-stone` (soft) |
| | 2 | **Spear Wall** [Wall: thorns] | A line of sharpened stakes, 3 tiles across his front, for 6 s: foes cannot walk through it, and a foe beside a stake at the end of a second is pricked (x0.3) and bleeds | 40 st, 9 s | wall-thorns (stakes) · `mv-wall-thorns` |
| | U | **Call to Arms** [Charge] | Every ally closes ranks and takes half damage for 6 s, a sixth of their health comes back, and he leads a charge: up to 3 tiles at the nearest foe, x1.5 | meter | call-to-arms, dash · `call-to-arms` |
| | T | Tight Phalanx · Shield Phalanx · Uprising | | | |
| **Kerem · Juggernaut** | 1 | **Seismic Slam** [Launch] | Slams the ground: the foes beside him are **launched 2 tiles** away; every foe within 3 is hurt (x0.8) and held 0.8 s | 30 st | seismic-slam, launch · `seismic-slam` |
| | 2 | **Tunnel Strike** [Burrow] [Launch] | Drills into the ground and comes up under the foe within 6 with most foes round it: x1.6 to it and it is **launched 2 tiles**; the foes beside it take x0.6 and are shoved a tile | 45 st, 10 s | burrow · `mv-burrow-down`, `mv-burrow-up` |
| | U | **Fissure** [Wall: stone] | The ground splits: every foe within 6 is hurt hard (x2.2) and held 2 s, and three rock spires rise where the rift is widest (stone wall tiles, 6 s, laid by the choke rule) | meter | fissure, wall-stone · `fissure` |
| | T | Heavier Slam · Seismic Wave · Earthshatter | | | |

### 4.2 Melee

| Hero | | Name [toolkit] | What it does | Cost | Visual · Sound |
| --- | --- | --- | --- | --- | --- |
| **Kenji · Samurai** | 1 | **Iaido** [Charge: through] | Dashes up to 4 tiles in a line, cutting every foe on it (x1.6) | 30 st | iaido + dash · `iaido` |
| | 2 | **Riposte** | For 2.5 s every melee blow on him is parried and answered with a cut | 40 st | riposte · `riposte` |
| | U | **Issen** [Charge: through] | "The one cut": dashes up to 7 tiles in a line, cutting every foe on it (x3) | meter | issen · `issen` |
| | T | Twin Iaido · Moon Cut · Sword Saint | | | |
| **Ayame · Kunoichi** | 1 | **Sneak Attack** [Blink] | Blinks behind the weakest foe within 5 and backstabs it (x1.8, bleeds) | 25 st | blink, sneak-attack · `mv-blink`, `sneak-attack` |
| | 2 | **Smoke Bomb** [Blink] | Smoke on her tile: foes in it miss half their blows for 3 s; she blinks up to 3 tiles to the safest free tile and cannot be targeted for 2 s; her next blow crits. Cast at once when she is in trouble | 40 st | smoke-bomb, blink · `smoke-bomb` |
| | U | **Assassinate** [Slash] | A teleport slash through the four weakest foes within 6 in turn (x1.4 each, bleeds), ending behind the last | meter | teleport-slash · `mv-slash` x4 |
| | T | Fading Step · Thousand Shadows · Night Without End | | | |
| **Jiro · Ninja Monk** | 1 | **Flurry of Blows** | Three quick strikes on one foe, who is stunned for 1.5 s | 25 st | flurry · `flurry` |
| | 2 | **Quivering Palm** [Charge: leap] | Step of the Wind: leaps up to 4 tiles to the foe with the fullest skill meter and strikes with the palm, spending his Flow (up to five stacks: x0.6 a stack); the foe loses its skill charge and is silenced 2 s | 40 st, 8 s | quivering-palm · `quivering-palm` |
| | U | **Hundred-Hand Strike** [Launch] | Five blows on each of the three nearest foes, each stunned 1.2 s; the last blow on each **launches** it 2 tiles | meter | flurry, launch · `hundred-hand` |
| | T | Swift Flurry · Flurry of the Tiger · Endless Flurry | | | |
| **Eirik · Barbarian** | 1 | **Whirlwind** | Cuts every foe in the 3x3 around him; they bleed | 30 st | whirlwind · `whirlwind` |
| | 2 | **Rage** | Paid with a tenth of his health: for 4 s his blows come 30% faster and drink an eighth, and he cannot fall below 1 health | 25 st + 10% health, 14 s | rage · `rage` |
| | U | **Berserker Leap** [Charge: leap] [Shove] | Leaps up to 4 tiles onto the thickest crowd; the 3x3 is struck (x1.8) and the ring round it shoved a tile out; then a whirl of blows for 5 s in which he drinks a third of what he deals and runs fast | meter | berserker-leap, launch · `berserker-leap` |
| | T | Wide Whirl · Cyclone · Worldbreaker | | | |
| **Kian · Mercenary** | 1 | **Ambush** [Blink] | Blinks behind the strongest foe within 5 and cuts it (x1.9) | 30 st | blink · `mv-blink`, `ambush` |
| | 2 | **Hunter's Mark** | Throws a blade at the strongest foe and marks it for 10 s: every hero deals a quarter more to it; if it dies marked he heals and his stamina fills | 40 st | hunters-mark · `hunters-mark` |
| | U | **Killing Spree** [Slash] | A teleport slash through the three hardest-hitting foes within 7 (x2.1 each) | meter | teleport-slash (gold) · `mv-slash` x3 |
| | T | Deadly Ambush · Ambush from the Shadows · King's Ransom | | | |
| **Bataar · Lancer** | 1 | **Charge** [Charge: line] | Charges up to 5 tiles at a foe (x2.2), then rides faster for 3 s | 30 st | dash (lance) · `mv-charge` |
| | 2 | **Disengage** [Charge: path] | Rides up to 3 tiles clear of the melee and gains full Momentum (his next blow +50%) | 40 st | dash · `mv-dash` |
| | U | **Cavalry Charge** [Charge: through] [Shove] | Rides up to 7 tiles in a line through every foe on it: each is struck (x1.8) and thrown a tile aside; the riders near him gallop faster for 4 s | meter | cavalry-charge, dash · `cavalry-charge` |
| | T | Longer Charge · Knight's Charge · Thunder of Hooves | | | |
| **Minjun · Arc Blade** | 1 | **Thunder Step** [Blink] | Blinks beside the thickest knot of foes within 5 and discharges: the 3x3 is hurt, shocked and held 1 s | 30 st | thunder-step · `thunder-step` |
| | 2 | **Thunderwave** [Shove] | Lets go what he stored (30% of the damage he took) as a wave round him, heals a tenth, and **shoves** the foes within 2 two tiles back | 40 st | thunderwave · `thunderwave` |
| | U | **Lightning Storm** [Slash] | Becomes lightning: a teleport slash through up to six foes within 6 (x1.3 each), each shocked and stunned 1.4 s, then back where he started | meter | lightning-storm, teleport-slash (blue) · `lightning-storm` |
| | T | Thunder Stride · Storm Step · Tempest Step | | | |
| **Aram · Demon Swordsman** | 1 | **Cleave** | Cuts every foe within 2; they bleed, and he drinks a third of what it deals | 30 st | cleave · `cleave` |
| | 2 | **Blood Pact** | Paid with 15% of his health: his next three blows deal 60% more and drink 30% | 25 st + 15% health, 8 s | blood-pact · `blood-pact` |
| | U | **Metamorphosis** [Pull] | Chains of hellfire drag the three nearest foes within 4 to him; for 7 s he hits half as hard again, and a fifth of his health comes back | meter | metamorphosis, pull (hellfire chain) · `metamorphosis` |
| | T | Great Cleave · Infernal Cleave · Hellblade | | | |
| **Tiago · Buccaneer** | 1 | **Grappling Hook** [Pull] | Yanks the nearest shooter (else foe) within 5 in beside him, cuts it and holds it 1 s | 30 st | grappling-hook · `grappling-hook` |
| | 2 | **Loaded Dice** | Two dice: 2-4, a weak cut and he is slowed; 5-9, x1.6; 10-11, x2.2 and a bleed; doubles or 12, x3 and every friend hastened | 40 st, 10 s | loaded-dice · `loaded-dice` |
| | U | **Keelhaul** [Pull] | Hooks the three nearest shooters (or foes) within 6 in beside him; each cut is a roll of the die (x1 to x3), and each is held 1.5 s | meter | grappling-hook x3 · `keelhaul` |
| | T | Longer Hook · Boarding Party · Sack of the Coast | | | |
| **Tiziri · Queen Dragoon** | 1 | **Dragon Breath** | Fire down the line with the most foes, up to 4 tiles: each is hurt and set alight | 35 st | dragon-breath · `dragon-breath` |
| | 2 | **Dragon Dive** [Charge: leap] [Launch] | Leaps out of the fight and lands on the thickest crowd within 6: double on her mark, and the 3x3 is struck, held 0.6 s and **launched** a tile outward | 45 st | dragon-dive, launch · `dragon-dive` |
| | U | **Inferno Breath** | Fire down the longest line of foes, up to 8 tiles, burning each for 5 s; the line stays alight for 4 s (a fire wall, section 3.6) | meter | dragon-breath (big), wall-fire · `inferno-breath` |
| | T | Longer Breath · Dragonfire · Wyrmqueen's Breath | | | |

### 4.3 Ranged

| Hero | | Name [toolkit] | What it does | Cost | Visual · Sound |
| --- | --- | --- | --- | --- | --- |
| **Natsu · Archer** | 1 | **Volley** | Arrows rain on a 3x3 | 30 st | volley · `volley` |
| | 2 | **Aimed Shot** [Charge: leap] | If a foe is beside her she first leaps 2 tiles back (to higher ground if she can); then the farthest foe in reach is pinned 2 s and takes a quarter more from shots for 4 s | 40 st | aimed-shot · `aimed-shot` |
| | U | **Hail of Arrows** | Five volleys fall on separate crowds across the field (x1.6 each) | meter | volley x5 · `hail-of-arrows` |
| | T | Double Volley · Rain of Arrows · Sky Darkened | | | |
| **Inti · Ranger** | 1 | **Snare** | Lays two traps on the tiles foes will step on; the first to spring one is hurt and held 2 s | 30 st, 9 s | snare · `snare` |
| | 2 | **Spike Growth** [Aura: tile] | Thorns on the 3x3 round the nearest foe for 6 s: whoever stands in it is slowed and bleeds | 45 st | spike-growth · `spike-growth` |
| | U | **Entangle** | Vines hurt every foe in sight within 8 and hold each 2.2 s; each takes a third more from every blow for 6 s | meter | entangle · `entangle` |
| | T | Third Snare · Fourth Snare · Hunter's Maze | | | |
| **Maeve · Gunslinger** | 1 | **Piercing Shot** | One slug through every foe in a line, for more than double | 35 st | piercing-shot · `piercing-shot` |
| | 2 | **Fan the Hammer** [Charge: path] | If a foe is within 2 she first rolls 2 tiles away from it; then three fast shots at the nearest foe in reach, and a long reload | 45 st | fan-the-hammer · `fan-the-hammer` |
| | U | **High Noon** | Six shots at the hardest-hitting foes in reach (x2.6 each) | meter | high-noon · `high-noon` |
| | T | Steady Aim · Through and Through · Lightning Draw | | | |
| **Rook-7 · Rifle Bot** | 1 | **Rapid Shot** | Three rapid shots at the weakest foe in reach | 30 st | rapid-shot · `rapid-shot` |
| | 2 | **Suppressing Fire** [Aura: lane] | Fire on the three-wide lane with most foes: each is struck, slowed 3 s and silenced 2 s, and its skill stops charging | 45 st | suppressing-fire · `suppressing-fire` |
| | U | **Overclock** [Blink] | Jets 3 tiles to the highest free tile within 4, then hits half as hard again and shoots faster for 7 s, and fires four shots at the weakest foe | meter | overclock, dash (jet) · `overclock` |
| | T | Fourth Round · Full Magazine · Bullet Storm | | | |
| **Bastion · Siege Bot** | 1 | **Bombard** [Launch] | A heavy shell bursts on the thickest crowd within 7; the foe at its heart is **launched** 2 tiles and the rest of the 3x3 shoved a tile out | 35 st | bombard, launch · `bombard` |
| | 2 | **Siege Mode** | Anchors for 8 s: cannot walk, reaches two further, and its shells splash and come faster | 40 st | siege-mode · `siege-mode` |
| | U | **Orbital Strike** [Launch] | A great shell on the thickest crowd, and a second on the same spot a moment after; every foe in the 3x3 is **launched** 2 tiles outward by the first | meter | orbital-strike, launch · `orbital-strike` |
| | T | Heavier Shell · Twin Shells · Siege Breaker | | | |
| **Harrow · Dread Pirate** | 1 | **Cannonade** | A ghost ship's guns fall on a 3x3 | 35 st | cannonade · `cannonade` |
| | 2 | **Powder Keg** [Launch] | Rolls a keg to the thickest crowd; it blows: the 3x3 is hurt and set alight and **launched** a tile outward (2 tiles at its heart), and every powder barrel and keg within 2 goes off | 45 st | keg-blast, launch · `powder-keg` |
| | U | **Ghost Fleet** | Three broadsides from the ghost fleet fall on separate crowds and set off the powder barrels there | meter | cannonade x3 · `ghost-fleet` |
| | T | Double Cannonade · Ghost Armada · The Drowned Fleet | | | |

### 4.4 Casters

| Hero | | Name [toolkit] | What it does | Cost | Visual · Sound |
| --- | --- | --- | --- | --- | --- |
| **Ravi · Fire Wizard** | 1 | **Fireball** | A ball of fire flies to the thickest 3x3 and bursts, leaving it burning | 50 mana, 7 s | fireball · `fireball` |
| | 2 | **Wall of Fire** [Wall: fire] | A wall of fire 4 tiles long across the lane the most foes are walking, for 6 s: a foe in it or crossing it burns (x0.3 a second) | 55 mana, 10 s | wall-fire · `wall-of-fire` |
| | U | **Meteor Swarm** [Launch] | Three meteors fall on separate crowds (x2.6 each), each leaving the ground burning; the foe at each heart is **launched** a tile | meter | meteor-swarm, launch · `meteor-swarm` |
| | T | Greater Fireball · Delayed Blast Fireball · Fireball Barrage | | | |
| **Malia · Lightning Mage** | 1 | **Chain Lightning** | A bolt jumps through up to five foes, weaker each time; each is Charged and shocked (it starts from her target, unlike the king's) | 45 mana | chain-lightning · `chain-lightning` |
| | 2 | **Storm Surge** [Blink] | If a foe is beside her she first blinks 3 tiles to the safest tile; then every Charged foe discharges: hurt, stunned 0.8 s, and the bolt arcs to a foe beside it | 55 mana | storm-surge, blink · `storm-surge` |
| | U | **Call Lightning** [Aura] | A storm cloud gathers over her for 6 s: each second a bolt strikes the toughest foe within 6 of her (x1.4, stunned 0.8 s, Charged) | meter | storm-cloud · `call-lightning` |
| | T | Forked Chain · Storm Chain · Thunder Throne | | | |
| **Zofia · Warlock** | 1 | **Eldritch Blast** [Shove] | Three beams of dark force at the three toughest foes in reach; each is hexed (burns 5 s, he drinks 60%) and **shoved** a tile back | 45 mana | eldritch-blast · `eldritch-blast` |
| | 2 | **Drain Life** | Channels 2 s on the weakest foe in reach, draining it; what he drains heals his most hurt friend | 60 mana | drain-life · `drain-life` |
| | U | **Circle of Death** [Aura] | Every foe within 7 is cursed and burns for 6 s, and a ring of death holds round him for 6 s: a foe within 2 takes x0.4 a second and he drinks a third | meter | circle-of-death · `circle-of-death` |
| | T | Agonising Blast · Eldritch Barrage · Abyssal Blast | | | |
| **Seydou · Great Sage** | 1 | **Magic Missile** | Three darts of force streak to up to three separate crowds and burst (each a 3x3) | 50 mana | magic-missile · `magic-missile` |
| | 2 | **Font of Magic** [Aura: tile] | A font of magic rises on his tile for 8 s: friends within 3 of it gain 4 mana or 2 stamina a second | 55 mana, 10 s | mana-font · `font-of-magic` |
| | U | **Arcane Surge** | Every ally's pool fills by half, and an arcane shield forms round each for 4 s | meter | arcane-surge · `arcane-surge` |
| | T | Empowered Missile · Twinned Missile · Missile Storm | | | |
| **Adaeze · Time Witch** | 1 | **Slow** [Aura] | A slowing field round her for 4 s: foes within 4 are slowed, and her friends within 3 are hastened | 45 mana, 9 s | slow-field · `slow` |
| | 2 | **Rewind** [Blink] | The friend that lost most in the last 4 s goes back: its health, its tile (a blink), and its new ailments gone | 60 mana, 10 s | rewind · `rewind` |
| | U | **Time Stop** | Every foe within 8 is stopped where it stands for 2.6 s, while her friends are hastened for 5 s | meter | time-stop · `time-stop` |
| | T | Mass Slow · Time Loop · Eternity | | | |
| **Luana · Illusionist** | 1 | **Mirror Image** [Blink] | Blinks up to 3 tiles away, leaving two decoys that draw the foes nearby for 3 s; cast at once when she is in trouble | 50 mana, 14 s | mirror-image, blink · `mirror-image` |
| | 2 | **Transposition** [Swap] | She and the friend in most trouble within 5 change places, and a decoy springs up beside the friend; foes that were striking the friend now face her (she slips a quarter of blows) | 70 mana, 15 s | swap · `mv-swap` |
| | U | **Hall of Mirrors** | Four decoys appear round her, and every foe within 6 turns on them for 4.5 s | meter | hall-of-mirrors · `hall-of-mirrors` |
| | T | Longer Mirage · Hall of Illusions · Infinite Reflections | | | |

### 4.5 Healers (each has the revive of section 2 on skill 2: "2R")

| Hero | | Name [toolkit] | What it does | Cost | Visual · Sound |
| --- | --- | --- | --- | --- | --- |
| **Selam · Cleric** | 1 | **Guiding Bolt** | A bolt of holy light at a foe in reach; her friends within 2 of it are healed by what it dealt | 40 mana | guiding-bolt · `guiding-bolt` |
| | 2 | **Prayer of Healing** | Cleanses every ally and heals them each second for 5 s (when some are hurt); cast at once when a friend is under 35% | 60 mana | prayer · `prayer-of-healing` |
| | 2R | **Revivify** | The revive face | 80 mana, 30 s | revivify · `revivify` |
| | U | **Spirit Guardians** [Aura] | Spirits circle her for 8 s (reach 2): foes inside take x0.35 a second and are slowed; allies inside heal 2% of their health a second and are cleansed once | meter | spirit-guardians · `spirit-guardians` |
| | T | Greater Prayer · Prayer of Miracles · Saint's Prayer (on Prayer of Healing) | | | |
| **Linnea · High Priestess** | 1 | **Cure Wounds** | A great light heals the worst hurt ally and cleanses it; allies near it are healed too; cast at once when a friend is under 35% | 45 mana | cure-wounds · `cure-wounds` |
| | 2 | **Death Ward** | The friend most at risk is warded for 4 s: the first blow that would fell it leaves it at 1 health and heals it 30% | 60 mana, 12 s | death-ward · `death-ward` |
| | 2R | **Resurrection** | The revive face (it plays differently from the king's Resurrect: it is cast on its own, on the nearest fallen) | 80 mana, 30 s | resurrection · `resurrection` |
| | U | **Mass Resurrection** [Wall: light] | Up to three fallen rise at 40%, every ally is healed and cleansed, and a Wall of Light (3 tiles, 5 s, by the choke rule) rises between the foes and the risen | meter | mass-resurrection, wall-light · `mass-resurrection` |
| | T | Greater Cure Wounds · Mass Cure Wounds · Celestial Choir | | | |
| **Rhys · Wanderer** | 1 | **Healing Draught** | A healing draught (a quarter of its health) for a badly hurt friend; with none, Alchemist's Fire on the thickest 3x3 (burning) | 40 mana, 7 s | healing-draught · `healing-draught` |
| | 2 | **Healing Mist** [Aura] | A healing mist round him for 5 s (reach 2): allies inside heal 3% of their health a second and are shielded for 2 s on the first tick (when some are hurt); cast at once when a friend is under 35% | 60 mana | healing-mist · `healing-mist` |
| | 2R | **Elixir of Life** | The revive face | 80 mana, 30 s | elixir · `elixir-of-life` |
| | U | **Panacea** | Heals every ally, shields them for 3 s and hastens them for 4 s | meter | panacea · `panacea` |
| | T | Brighter Mist · Radiant Mist · Pilgrim's Dawn (on Healing Mist) | | | |
| **Isla · Druid** | 1 | **Conjure Treant** | A treant rises beside her and fights for her (one at a time) | 50 mana | conjure-treant · `conjure-treant` |
| | 2 | **Wild Shape** | For 6 s she becomes a treant: a third more health, more defence, and the foes beside her must strike her; she heals 15% after | 60 mana, 12 s | wild-shape · `wild-shape` |
| | 2R | **Reincarnate** | The revive face | 80 mana, 30 s | reincarnate · `reincarnate` |
| | U | **Wall of Thorns** [Wall: thorns] | A hedge of thorns 4 tiles long rises across the foes' nearest approach for 8 s (the choke rule), two treants rise at her side, and every ally is healed (x4) | meter | wall-thorns, conjure-treant · `wall-of-thorns` |
| | T | Grove · Ancient Grove · World Tree | | | |

### 4.6 Supports

| Hero | | Name [toolkit] | What it does | Cost | Visual · Sound |
| --- | --- | --- | --- | --- | --- |
| **Hideo · Samurai Commander** | 1 | **War Banner** [Aura] | Raises the attack of the allies within 3 by a quarter for 6 s | 30 st, 11 s | war-banner · `war-banner` |
| | 2 | **Plant the Standard** [Aura: tile] | Plants a standard for 10 s: friends within 2 of it take a tenth less and hit a tenth harder while it stands | 45 st | plant-standard · `plant-standard` |
| | U | **Rallying Cry** [Charge] | Attack up a quarter for 9 s and a quarter of their health back for every ally; and every melee ally within 4 charges up to 2 tiles at its nearest foe (x1.2) | meter | rallying-cry, dash · `rallying-cry` |
| | T | Higher Banner · Grand Standard · Shogun's Standard | | | |
| **Lovell · Wolf Bard** | 1 | **Vicious Mockery** | His mocking verse hurts every foe within 4 a little, slows them for 4 s and weakens them for 3 s | 40 mana | mockery · `vicious-mockery` |
| | 2 | **Bardic Inspiration** [Aura] | Switches his standing song (the Dirge weakens the foes near him, the Anthem lifts the friends near him) and doubles it for 6 s | 55 mana | bardic-notes · `bardic-inspiration` |
| | U | **Battle Hymn** [Shove] | The opening chord is a thunderclap that **shoves** the foes within 2 two tiles back; then allies are hastened and rallied (attack up a quarter) for 6 s, and every foe within 7 is slowed | meter | battle-hymn, shove · `battle-hymn` |
| | T | Cutting Mockery · Chorus · Moonlit Chorus | | | |
| **Edmund · Tyrant** | 1 | **Judgement** | A judgement falls on the toughest foe in reach and the 3x3 round it | 45 mana | judgement · `judgement` |
| | 2 | **Bane** [Pull] | Iron chains drag the toughest foe within 6 up to 3 tiles towards him and mark it for 6 s: every hero goes for it and deals 20% more; it and the two foes nearest it are weakened 4 s; if it falls, every hero gains pool | 60 mana, 10 s | bane-mark, pull (iron chain) · `bane` |
| | U | **Reign of Terror** | Every foe within 6 is hurt, slowed for 5 s and frightened; every ally is rallied: attack up a quarter for 7 s | meter | reign-of-terror · `reign-of-terror` |
| | T | Twin Verdicts · Tyrant's Decree · The Iron Throne | | | |

### 4.7 Summoners

| Hero | | Name [toolkit] | What it does | Cost | Visual · Sound |
| --- | --- | --- | --- | --- | --- |
| **Itzel · Beastmaster** | 1 | **Summon Beast** | A wolf answers her call and fights for her (two at most stand at once) | 35 st | summon-beast · `summon-beast` |
| | 2 | **Pack Tactics** [Charge: leap] | Every wolf of hers leaps (up to 4 tiles) at the foe she marks: struck and slowed, and the wolves hit a quarter harder for 4 s; with none, one answers | 40 st, 9 s | dash (paws), hunters-mark (green) · `pack-tactics` |
| | U | **Conjure Animals** | Four wolves answer her call at once | meter | summon-beast x4 · `conjure-animals` |
| | T | Pair of Wolves · Pack Leader · Lord of the Wild Hunt | | | |
| **Vesper · Reaper** | 1 | **Reap** | Cuts every foe within 3; a foe under 30% health takes nearly triple | 30 st | reap · `reap` |
| | 2 | **Animate Dead** | The last foe that fell near him rises as a wraith on his side for 8 s, at half its health and attack | 40 st | animate-dead · `animate-dead` |
| | U | **Harvest of Souls** [Pull] | The scythe's sweep drags every foe within 5 a tile towards him, then cuts them all; those under a third of their health are reaped for far more; each kill feeds him and rises as a wraith for 5 s | meter | harvest, pull (spectral) · `harvest-of-souls` |
| | T | Keener Scythe · Soul Scythe · Grim Harvest | | | |

### 4.8 Monsters and spirits

| Hero | | Name [toolkit] | What it does | Cost | Visual · Sound |
| --- | --- | --- | --- | --- | --- |
| **Kohaku · Kitsune** | 1 | **Charm Monster** | The strongest foe nearby fights its own side for 3.5 s | 45 mana | charm · `charm-monster` |
| | 2 | **Alter Self** [Blink] | Blinks in fox-fire beside the strongest foe in sight and takes its shape for 5 s: its looks, reach and attack; foes pick her last | 60 mana, 12 s | alter-self, blink (fox-fire) · `alter-self` |
| | U | **Mass Polymorph** | The three strongest foes in sight become little foxes for 4 s: a fifth of their attack, no casts, slowed. A boss keeps its own shape and gets only the weakening and the silence, for the boss rule's half time | meter | polymorph · `mass-polymorph` |
| | T | Lingering Charm · Hundred Fox Fires · Nine-Tailed Inferno | | | |
| **Kurogane · Karasu Tengu** | 1 | **Swoop** [Blink] | Drops behind a shooter (else the weakest foe) within 6 and strikes it for double | 30 st | swoop · `swoop` |
| | 2 | **Pilfer** [Blink] | Dives on the foe with the fullest skill meter, steals half its charge and any shield, and silences it 1.5 s; friends near him gain pool | 40 st | pilfer · `pilfer` |
| | U | **Cloud of Daggers** [Aura: tile] | A whirling cloud of razor feathers hangs on the thickest knot of foes for 4 s (3x3): a foe inside takes x0.8 a second and bleeds | meter | cloud-of-daggers · `cloud-of-daggers` |
| | T | Swift Swoop · Storm Swoop · Tengu King's Descent | | | |
| **Kazan · Yamabushi Tengu** | 1 | **Gust of Wind** [Shove] | The foes within 2 are hurt (x0.9) and **shoved 2 tiles** back | 30 st | gust · `gust-of-wind` |
| | 2 | **Wind Wall** [Wall: wind] | A wall of wind 3 tiles long in front of the friends a shooter is aiming at, for 4 s: shots through it fly back at the shooter for half | 40 st | wall-wind · `wind-wall` |
| | U | **Tempest** [Launch] | A great gale: every foe within 4 is hurt hard (x1.8), **launched** 2 tiles and stunned 1.5 s | meter | tempest, launch · `tempest` |
| | T | Stronger Gust · Hurricane · Wrath of the Mountain | | | |
| **Vuk · Werewolf** | 1 | **Pounce** [Charge: leap] | Leaps up to 4 tiles onto the weakest foe and bites it for double, healing him half of what it deals | 25 st | pounce · `pounce` |
| | 2 | **Shapechange** | Changes form: the Hunter (quicker, bites bleed) or the Brute (takes a quarter less, blows splash); the Brute when badly hurt or crowded | 40 st | shapechange · `shapechange` |
| | U | **Full Moon** | Both forms at once for 7 s, a quarter of his health back, and a howl: the foes within 3 are frightened (they run from him) | meter | full-moon · `full-moon` |
| | T | Savage Pounce · Blood Moon · Alpha's Howl | | | |
| **Asterion · Minotaur** | 1 | **Gore Charge** [Charge: line] [Launch] | Charges up to 4 tiles in a line at a foe, gores it for double and **launches** it 2 tiles; it is stunned 1.5 s on landing | 35 st | gore, launch · `gore-charge` |
| | 2 | **Bull Rush** [Shove] | Every foe beside him is struck and **shoved 2 tiles**; one that slams into something is stunned 1.5 s | 45 st | shove · `bull-rush` |
| | U | **Stampede** [Charge: line] [Launch] | Up to three charges in a row, each at the weakest foe in line; each foe struck is launched 2 tiles | meter | gore, dash · `stampede` |
| | T | Heavier Charge · Rampage · Lord of the Labyrinth | | | |
| **Dorion · Satyr** | 1 | **Pipes of Pan** [Aura] | Hastens the allies within 3, and him, for 4 s | 40 mana, 9 s | pipes · `pipes-of-pan` |
| | 2 | **Irresistible Dance** [Pull] | The foes within 4 dance towards one spot ahead of him for 2 s (each dragged up to 2 tiles), bunched and not striking | 60 mana | irresistible-dance · `irresistible-dance` |
| | U | **Bacchanal** [Aura] | Allies are hastened for 6 s, mended over time, and their skills surge | meter | bacchanal · `bacchanal` |
| | T | Livelier Pipes · Pan's Frenzy · Pan's Revel | | | |
| **Xanthe · Gorgon** | 1 | **Petrifying Gaze** | Stiffens the strongest foe she sees within 5: it takes a blow and is stunned for 3 s | 45 mana | gaze · `petrifying-gaze` |
| | 2 | **Flesh to Stone** [Wall: stone] | Every stunned or slowed foe within 5 turns to stone for 2 s; one that dies as stone stays as a statue (a stone wall tile, as now) | 60 mana | flesh-to-stone · `flesh-to-stone` |
| | U | **Gaze of Medusa** | Every foe in sight within 6 is hurt and turned to stone for 2.5 s | meter | stone-curse · `gaze-of-medusa` |
| | T | Deeper Gaze · Medusa's Glare · Gorgon Queen's Gaze | | | |
| **Hobb · Shambler** | 1 | **Contagion** [Aura] | A cloud of rot hangs round him for 6 s (reach 2): foes inside rot each second (the curse's harm), and he drinks part of it | 30 st, 8 s | aura-rot · `contagion` |
| | 2 | **Devour** | Eats a body that fell near him: heals a fifth and grows a tenth bigger for the fight (three times at most) | 40 st | devour · `devour` |
| | U | **Plague Tide** [Burrow] [Launch] | He sinks into the grave-earth and bursts out in the thickest crowd within 6: the foe there is launched 2 tiles, and the wave of rot from there leaves every foe within 5 cursed for 7 s; he drinks from them | meter | burrow (rot), plague-tide · `plague-tide` |
| | T | Thicker Rot · Plague · Black Death | | | |
| **Seneb · Mummy** | 1 | **Hold Person** | Bandages lash every foe within 2 and slow it 3 s; the hardest-hitting of them is held still 1.5 s | 40 mana | hold-person · `hold-person` |
| | 2 | **Dominate Monster** | The hardest-hitting foe within 4 is bound for 3 s: it walks to, and strikes, its own side | 60 mana | dominate · `dominate-monster` |
| | U | **Curse of the Pharaoh** [Pull] | A sand-wind drags every foe within 5 a tile towards him; each is cursed and slowed 6 s, he is shielded, and the two strongest are his puppets for 2 s | meter | pharaoh, pull (sand) · `curse-of-the-pharaoh` |
| | T | Tighter Wraps · Pharaoh's Wraps · Eternal Tomb | | | |
| **Skerry · Kraken Mate** | 1 | **Grasping Tentacles** [Pull] | Tentacles drag every foe within 4 a tile closer (hurt, slowed 2 s); the farthest shooter among them is dragged all the way to him | 30 st | tentacles · `grasping-tentacles` |
| | 2 | **Tidal Wave** [Shove] [Wall: ice] | A wave rolls from him across the three-wide lane with most foes, hurting and **shoving** each 2 tiles; where it breaks it freezes into a Wall of Ice (3 tiles, 6 s) | 45 st, 9 s | tidal-wave, wall-ice · `tidal-wave` |
| | U | **Maelstrom** [Pull] | A whirlpool drags every foe within 6 up to 2 tiles towards him, hurts and slows it | meter | maelstrom, pull (water) · `maelstrom` |
| | T | Longer Tentacles · Maelstrom Tide · Abyssal Maw | | | |

**Foes that borrow a hero's skill** (the Skeleton Archers' Volley, the Orc Chieftain's and Bone Captain's War Banner, the maze gorgons
and the Gorgon Queen, the Minotaur Champion, the yokai, the Iron Golem's Shield Wall, the fox that borrows the Kitsune's ultimate)
keep their old names and rules through their own copies, so reworking a hero never changes a foe. **Passives** are unchanged.

### 4.9 How the moves spread

| Toolkit part | Heroes using it |
| --- | --- |
| Charge / dash / leap | Knight, Peasant, Samurai, Ninja Monk, Barbarian, Lancer (3), Queen Dragoon, Archer, Gunslinger, Samurai Commander, Beastmaster, Werewolf, Minotaur (2) |
| Blink / teleport | Kunoichi (2), Mercenary, Arc Blade, Lightning Mage, Rifle Bot, Time Witch, Illusionist, Kitsune, Karasu (2) |
| Teleport slash | Kunoichi, Mercenary, Arc Blade |
| Pull | Demon Swordsman, Buccaneer (2), Tyrant, Reaper, Satyr, Mummy, Kraken Mate (2) |
| Shove | Knight, Arc Blade, Barbarian, Lancer, Warlock, Wolf Bard, Yamabushi, Minotaur, Kraken Mate |
| Launch | Juggernaut (2), Ninja Monk, Queen Dragoon, Siege Bot (2), Dread Pirate, Fire Wizard, Yamabushi, Minotaur (2), Shambler |
| Burrow | Juggernaut, Shambler |
| Walls | Peasant (thorns), Juggernaut (stone), Queen Dragoon and Fire Wizard (fire), High Priestess (light), Druid (thorns), Yamabushi (wind), Gorgon (stone statues), Kraken Mate (ice) |
| Auras | Knight, Paladin, Ranger, Rifle Bot, Lightning Mage, Warlock, Great Sage, Time Witch, Cleric, Wanderer, Samurai Commander (2), Wolf Bard, Karasu, Satyr (2), Shambler |
| Swap | Illusionist |

Every hero has at least one. The ones whose only battlefield move is an aura or a timed field (the Paladin, the Ranger, the Great Sage,
the Wanderer, the Satyr's pipes) are the supports and healers, whose fantasy is to hold ground, not to rush about.

## 5. What changed from v1, at a glance

- **Reworked skills:** Shield Rush (was Second Wind), Aura of Protection (was Warding Bond), Spear Wall as a wall, Seismic Slam and
  Tunnel Strike (were Earth Tremor and Wall of Stone), Smoke Bomb's blink, Quivering Palm's leap, Berserker Leap, Thunderwave's
  2-tile shove, Lightning Storm as a teleport slash, Metamorphosis's chains, Cavalry Charge's trample, Dragon Dive's launch, Inferno
  Breath's fire line, Aimed Shot's leap, Fan the Hammer's roll, Overclock's jets, Bombard, Orbital Strike and Powder Keg launching,
  Wall of Fire (was Conflagration), Meteor Swarm's launch, Storm Surge's blink, Call Lightning as a storm, Eldritch Blast's shove,
  Circle of Death's ring, Font of Magic as a font, Slow as a field, Mirror Image's blink, Transposition (was Dimension Door), Spirit
  Guardians (was Mass Heal), Healing Mist as an aura, Mass Resurrection's Wall of Light, Wall of Thorns (was Tranquility), Call to
  Arms's charge, Rallying Cry's charge, Battle Hymn's thunderclap, Bane's chains, Pack Tactics's leaps, Harvest of Souls's pull,
  Alter Self's blink, Cloud of Daggers as a lasting cloud, Gust of Wind's 2 tiles, Wind Wall as a wall, Tempest's launch, Pounce
  (was Rend), Gore Charge's and Stampede's launches, Bull Rush's slams, Irresistible Dance's drag, Contagion as an aura, Plague Tide's
  burrow, Curse of the Pharaoh's sand-wind, Grasping Tentacles' long drag, Tidal Wave's shove and ice wall, Maelstrom's 2 tiles.
- **New tier names** where skill 1 changed: the Juggernaut (Heavier Slam · Seismic Wave · Earthshatter) and the Werewolf (Savage
  Pounce · Blood Moon · Alpha's Howl). The rest are as v1.
- **Spells v1 left out and now used:** Wall of Fire, Spirit Guardians, Aura of Protection, Thunderwave (and its shove), Misty
  Step (as the escapes' blink, not a name).

## 6. Effects and sounds: painted first

The owner: "Prioritise using the ChatGPT effects visuals." So every signature move's look is **painted**, in strips the game plays
frame by frame (the way the ailments' painted atlas works, STATUS-FX), and the present atlas cells and pack strips are kept only as
placeholders until the paintings arrive and as the battery-saver fallback.

### 6.1 The parts an effect can have

| Part | Where it plays | Frames | Loop or once |
| --- | --- | --- | --- |
| `cast` | On the caster as it casts | 6 to 8 | once |
| `travel` | Flying from caster to target (a projectile, a dart, a hook), painted **pointing right**; the game turns it along its path | 4 to 6 | loop |
| `beam` | A segment the game tiles along a line (a beam, a chain, a tether), painted **horizontal**, seamless left to right | 4 to 6 | loop |
| `impact` | Where it lands or strikes | 6 to 8 | once |
| `ground` | On the ground (a ring, a field, a rune), already flattened about 2:1 | 6 | loop |
| `rise` / `stand` / `break` | A wall tile coming up, standing, and going (or shattering) | 6 / 6 / 6 | once / loop / once |
| `motes` | Small pieces the game scatters or circles (spirits, notes, feathers) | 6 | loop |
| `trail` | Left along a dash or a flight | 6 | once |

### 6.2 The 131 painted sheets, in seven painting sessions

Every key in the Visual column of section 4 is a painted sheet. The full list, with each sheet's rows, sizes and palette, is in the art
brief. In short:

| Session | Sheets | What |
| --- | --- | --- |
| **A. The toolkit** (shared by every hero that moves) | 15 | dash, blink, teleport-slash, pull, shove, launch, slam, burrow, swap, wall-stone, wall-ice, wall-thorns, wall-light, wall-fire, wall-wind |
| **B. Auras and fields** | 10 | aura-protection, spirit-guardians, aura-rot, storm-cloud, mana-font, healing-mist, cloud-of-daggers, slow-field, spike-growth, bardic-notes |
| **C. Healers and revives** | 10 | revivify, resurrection, elixir, reincarnate, mass-resurrection, guiding-bolt, prayer, cure-wounds, death-ward, healing-draught |
| **D. Casters' spells** | 12 | fireball, meteor-swarm, magic-missile, eldritch-blast, drain-life, circle-of-death, thunderwave, time-stop, polymorph, hunters-mark, bane-mark, mockery |
| **E. Martial and monster moves** | 15 | issen, sneak-attack, flurry, quivering-palm, berserker-leap, rage, cleave, riposte, grappling-hook, dragon-dive, seismic-slam, pounce, tentacles, tidal-wave, keg-blast |
| **F. More martial and ranged moves** | 30 | the tanks', blades' and shooters' other moves (Divine Smite, Holy Nova, Iaido, Volley, Bombard, Orbital Strike, Fissure...) |
| **G. More spells and monster moves** | 39 | the casters', healers', callers' and monsters' other moves (Chain Lightning, Judgement, Tempest, Maelstrom, Full Moon...) |

A to E (62 sheets) are the priority: they cover every new mechanic and the signature spells. F and G replace the remaining FX-003 cells
with painted strips, so that in the end every move is painted. Until a sheet lands, its move plays its present FX-003 cell or a pack strip.

### 6.3 How the paintings come in

- **ChatGPT paints the sheets** from [rpg-spells-art-prompt.md](rpg-spells-art-prompt.md), one session at a time, and puts them in
  `art-source/spell-fx/<session>/<effect>.png`, in a pull request from the branch **`art/spell-fx`**.
- **The importer** (`tools/spell-fx/import-spell-art.py`, built in batch 1, modelled on `tools/status-fx/import-status-art.py`)
  reads the manifest `tools/spell-fx/spell-parts.json` (every effect, its rows in order, each row's kind and frame range), checks every
  sheet, scales the cells to the shipping size and packs one atlas a session: `src/art/fx/spells/<session>.webp` and `<session>.json`
  (`{"cell": 96, "parts": {"<effect>.<part>": [column, row, frames]}}`).
- **Placeholders:** `tools/spell-fx/spell-sheets.py` builds the same atlases from the pack strips (as `status-sheets.py` does), so the
  code can be built and tested before the paintings arrive; the import then swaps the art in with no code change.
- **Offline and size:** the seven atlases load by URL and are added to the service worker's `FILES` list (`build.mjs`), or the game
  breaks offline. The seven atlases come to about **4 to 5 MB** (WebP at 96 px cells; about 1,560 frames); the importer reports the
  size and stops above 5 MB, and the cell can drop to 80 px.
- **Played by** a new `src/render/spellArt.ts` (the frames) and the toolkit's events in `fx.ts`; reduced motion holds each part's first
  frame (nothing blinks off), battery saver drops the motes and trails.

### 6.4 Sounds

Rendered by `tools/spell-fx`'s sister, `tools/spell-sfx/` (which today renders the king's spells), in the same way, from its layers:

- **The toolkit (`mv-`)**, one short file each (0.3 to 1 s, 3 to 8 KB): `mv-dash`, `mv-charge` (hooves), `mv-blink`, `mv-slash`,
  `mv-pull` (a chain's rattle and a yank), `mv-shove` (a whump), `mv-launch` (a whoosh up), `mv-land` (a thud), `mv-slam` (a crunch),
  `mv-fall` (a falling whistle), `mv-burrow-down` (digging), `mv-burrow-up` (an eruption of earth), `mv-swap` (a shimmer at both ends),
  `mv-wall-stone`, `mv-wall-ice`, `mv-wall-thorns`, `mv-wall-light`, `mv-wall-fire`, `mv-wall-wind`, `mv-wall-break`, and an aura hum
  for each aura that loops quietly while it lasts (`mv-aura-holy`, `-spirit`, `-rot`, `-storm`, `-arcane`, `-mist`, `-feathers`).
  About 27 files, 0.15 MB.
- **The signature pairs** (`cast-hero-<key>`, `fx-hero-<key>`): the four revives and Mass Resurrection, and every move on the
  priority list (sessions A to E): about 60 pairs, 0.6 to 0.9 MB. The rest keep their element cues.
- All are listed in `FILES`. `spellSfx.ts` learns to plan a hero's skill as it plans a king's spell; a skill with no rendered pair keeps
  its element cue.

## 7. The full rebalance plan

**The bar** (the owner's): every hero within 6 points of the roster average at level 1 (stage 5) and level 30 (stage 39)
(`test/hero-balance.test.ts`, `test/hero-balance-ultimates.test.ts`), aiming for 4 in each batch to leave room. Level 10 (stage 24) is
measured too (the revive and skill 2 open there). The armies on Normal clear in 2 to 3.5 tries at their level; the Calamity's map
shares stay near 90/81/56/45/40/20; the daily near 73% / 55%; the Last Stand at its STAND-003 targets.

**What is measured, every batch** (each tool is the game's own, seeded):

| What | Tool |
| --- | --- |
| Parity at 1, 10 and 30 | `node tools/kits/tune.mjs` (12,000 fights; all 45 heroes, not only the batch's) |
| The armies | `SAVES=32 node tools/curve/run.mjs cell ...` |
| The daily | `node tools/dailyRate.mjs --days 60` |
| The Calamity | `node tools/balance.mjs --no-tables --calamity --attempts 150` |
| The Last Stand | `node tools/stand-balance.mjs --levels 1,10,20,30,60,100 --attempts 60` |
| Fight length and speed | the sweep's mean fight time; the sim's time per fight (walls and auras must not slow it by more than 5%) |

**What to tune first**, in this order, and never by loosening a test:
1. The move's strength (its `TUNE1`, `TUNE2` or ultimate `power`), for damage moves.
2. Its cost and gap, for moves whose worth is what they do (walls, auras, swaps, pulls).
3. Its distances and times (tiles shoved, wall length and time, aura reach), last, because they change how it feels.
4. Only when the roster as a whole has moved: the armies' `start`, `CAL_SCALE` and `DAILY_START`, as COMBAT-002 did.

**The batches** (each a branch of its own, measured and noted in `docs/notes/` before the next):

| Batch | What | Heroes |
| --- | --- | --- |
| 0 | **Fixed skill keys** (section 8); foes get their own copies of borrowed skills. The sweep must be identical. | none |
| 1 | **The toolkit:** `displace`, `charge`, `blink`, `pull`, `shove`, `launch`, `burrow`, walls, auras, swap, their events, the AI's scores, the boss rules, the flood fill; tests for every rule in section 3; the importer and the placeholder atlases; the page draws the new events with the placeholders. No hero uses it yet, so the sweep must be identical. | none |
| 2 | **Healers and the revive:** the revive face, Mass Resurrection and its Wall of Light, Spirit Guardians, Healing Mist | Cleric, High Priestess, Wanderer, Druid (4) |
| 3 | **Tanks and supports** | Knight, Paladin, Peasant, Juggernaut, Samurai Commander, Wolf Bard, Tyrant (7) |
| 4 | **Melee** | Samurai, Kunoichi, Ninja Monk, Barbarian, Mercenary, Lancer, Arc Blade, Demon Swordsman, Buccaneer, Queen Dragoon (10) |
| 5 | **Ranged and summoners** | Archer, Ranger, Gunslinger, Rifle Bot, Siege Bot, Dread Pirate, Beastmaster, Reaper (8) |
| 6 | **Casters** | Fire Wizard, Lightning Mage, Warlock, Great Sage, Time Witch, Illusionist (6) |
| 7 | **Monsters**, with Mass Polymorph | Kitsune, Karasu, Yamabushi, Werewolf, Minotaur, Satyr, Gorgon, Shambler, Mummy, Kraken Mate (10) |
| 8 | **The paintings and sounds:** import each session's sheets as the art PRs land (any time after batch 1), the ~87 sound files, `FILES`, phone checks at 393x852, 360x780 and 412x915, reduced motion and battery saver | all |
| 9 | **The full rebalance:** everything measured together; the global knobs (step 4 above) if the roster moved; the Last Stand and the daily re-checked | all |

Each hero batch renames and reworks its heroes' skills, ultimates and tier names, along with the texts that quote them (the talents, the
codex, the hero card, the tips), adds tests (each reworked move does what its row says; the AI casts it in the case it is for: a pull
on a back-line shooter, a wall across a choke, a launch off a ledge), and runs `npm run typecheck`, the affected tests, the full
`npm test` and `npm run web`.

## 8. Fixed skill keys (batch 0, from v1)

Today a skill's `name` is both what the player reads and the key about ten tables look it up by (`signatures.ts`, `skillFx.ts`,
`fxRules.ts`, `individualReleases.ts`, `kitLooks.ts`, `ailmentSources.ts`, `kits/when.ts`, `talentsDeep.ts`, `catalogue.json`, the tests).
Batch 0 gives every `Skill` a `key` (today's name, never changed); every lookup reads `key`, and only the screen reads `name`. A test
checks that every hero skill's key is found in each table. Saves hold no skill names, so old saves load as they are.

## 9. Questions for the owner

1. **Burrow:** the design gives it to the Juggernaut (a drill) and the Shambler (rising from the grave). Should the Werewolf burrow too?
   The design gives him a leaping Pounce instead.
2. **Frost:** no hero casts frost, so the one ice wall is the Kraken Mate's frozen Tidal Wave. Should a hero take frost (say, the Time
   Witch's Slow as a frost field), or wait for a frost hero?
3. **Trades:** to make room for movement, the Knight's Second Wind becomes Shield Rush, the Paladin's Warding Bond becomes Aura of
   Protection, and the Cleric's team-wide ultimate heal becomes Spirit Guardians, a ring round her. Are those trades all right?
4. **Moving friends:** only the Illusionist's swap and the Commander's charge move heroes; nothing a hero casts shoves or launches a
   friend. Is that what you want?
5. **Download size:** the paintings and sounds add about 5 to 6 MB to the first download (cached for offline play). Is that all right?
