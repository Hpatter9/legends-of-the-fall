# Ultimate showcases (ULT-SHOW): the design, and the pilot

The owner: "I want the first time ultimate use to be more special. It runs for 4-6 seconds and shows more. Like the ninja, Ayame: hers says
she teleports and slashes people. I want the battle to pause while she does hers by actually teleporting to each of her foes and slashing
them quickly, disappearing in a puff of smoke each time. They all should have a version like this where they actually do what the skill
says. We can get more animations as necessary. After the first one, it can be the short version like we have now, but maybe every 10th use
does the long one still, with an option in the settings for shorter ultimates / the number of times before you see the long one again."
And: "Ultimates, Eidolon summons and future special attacks always play at x1 speed - unless it's the shortened version."

Branch `claude/ult-showcase`. This note is the design for all 45 and the record of the pilot (Ayame, the Wizard, the Beastmaster), which is
built and playing in the game.

## What plays

An ultimate fires. Its **opening** is as before (ULT-CUTIN and ULT-EPIC: the band with the hero's art and the ultimate's name, the board
dimmed round the caster, the camera leaning in; 1.15 s). On a **long** use the **showcase** follows: the fight stays held and the hero is
seen doing what the ultimate's words say, with the real sprites on the real board, about 2.5 to 4 s. Then the **blow lands** (the
ULT-EPIC freeze, burst, flash and shake), and the fight carries on as it does now. Opening, showcase and fade together run **4.6 to 6 s**
(tested). A tap skips it, as a tap skips the moment now.

On a **short** use nothing changes: the opening and the blow, or the quick banner when Full ultimate scenes is off or Auto is on.

## The pause is presentation only

The sim is not changed by one line. The ultimate is cast on the tick it fires, exactly as in the short version: its blows land, its foes
fall, its wolves are on the board. The page holds the fight (as the opening already does: `UltQueue.holdsBattle`) and the showcase reads
**that tick's own events** to stage the real sprites over what the sim says (`UnitSprite.stage`):

- `blink` events give each hop of a teleport slash (from, to), and the `hit` after each the foe it cut (`readCast`);
- `area` events give the tiles a salvo is aimed at (the meteors' crowds);
- the fighters that appeared on the tick with the caster as owner are what it called up (the wolves).

The caster is posed at each hop in turn, a foe stands as it stood until its cut and then reels, a wolf is hidden until it runs in. When the
showcase ends the stages are dropped and everything is drawn as the sim says, which is where the showcase left it (Ayame ends on the tile
the sim put her on: tested). The cast's own effects (its numbers, its streaks) are hidden while it plays and show as it ends, so every foe
she cut reels and shows its number at once: the "already cut" beat. So a fight comes out exactly as with the short version, and the
deterministic sim, its tests and the balance are untouched.

## The x1 rule

An ultimate's full moment (the opening, the showcase, and the live part of a delayed or lingering one under the dim) and an Eidolon's full
call always run at x1, whatever the fight's speed (`momentSpeed`, in the main fight and the Last Stand). The short versions keep the speed.
The same rule is there for any future special attack: it only has to say it is playing.

## When the long version plays, the settings, and what is saved

- **First use** of each hero's ultimate: the showcase, always (unless Shorter ultimates is on).
- Then **every Nth use** after it: with N = 10, the 1st, 11th, 21st... (`showDue`).
- Only with **Full ultimate scenes** on and **Auto** off: Auto's ultimates are always short (the owner's earlier call, 0.257).
- Settings, Gameplay: **Shorter ultimates** (off by default; on: never a showcase, the first use included) and **Showcase again**:
  First / 5th / 10th (default) / 20th.
- Saved: `Meta.ultSeen`, a count per hero kind of the full moments the player has seen of its ultimate (only heroes with a showcase are
  counted, so a hero whose showcase comes in a later batch still gets its "first"). The settings are in `legends.settings`.

## The pilot (built)

| Hero | Ultimate | The showcase | Length |
|---|---|---|---|
| **Ayame**, the Kunoichi | Assassinate: "she slips behind the four weakest foes in turn and backstabs each" | She vanishes in a puff of smoke (the painted blink and dark smoke), appears behind the first foe, cuts it (the painted teleport slash and its crossed cut, a spray, a jolt of the screen, a sword's swing and hit), vanishes again; four times. The camera follows her. She stands where the last fell; then all four reel at once. | 3.3 s |
| **Ravi**, the Wizard (a caster) | Meteor Swarm: "three meteors fall on separate crowds" | He raises his staff in a burning circle; a circle of fire marks each crowd in turn with a rumble; the meteors are seen high in the clouds over each mark. The fight runs on at x1 under the dim and the sim's own meteors come down. | 2.8 s (and the fall) |
| **Itzel**, the Beastmaster (a summoner) | Conjure Animals: "four wolves answer his call" | He sounds his horn and a ring of green goes out; one after another the four wolves bound in from the edge of the field to the tiles they stand on, dust where each lands. | 3.0 s |

Captures: `docs/samples/ult-showcase-*.mp4` (393 x 852, x1, the whole moment) and `docs/samples/ult-showcase-strip.jpg` (the three side
by side). `tools/ult-show/shots.mjs` records them on a fixed clock.

## Batch 1 (built): the blades that move

The owner approved the design and the director's answers to the questions (below). The plan became a **track of keys per fighter**
(`Key`: a tile, an offset, a row and how far through it, seen or not, facing, gliding to the next key with an arc), so a style is a few
lines of keys and each hero is data (`SHOWCASES`: its style, element, words and timings). New styles and what they read from the cast:

| Style | Reads | Heroes | What we see |
|---|---|---|---|
| blinks | `blink` and the blow after each | Mercenary, Arc Blade | as Ayame's, in blood red and in lightning (Arc Blade's last hop takes him home) |
| line | `dash` and the blows after each | Samurai, Lancer, Minotaur | the wind-up, the run along the line (a flash for the Samurai, a gallop for the Lancer, three charges for the Minotaur); the foes reel as it reaches them, or for the Samurai all split once he has sheathed |
| leap | the caster's `launch` | Barbarian | a crouch, a high leap across the field, the crash: cracked ground, dust, the shake, the crowd thrown back |
| blows | the blows on each foe, counted | Ninja Monk | a blur of blows on each foe in turn, a spark at every one, the last throwing it |
| hooks | `arc` to a foe the cast moved | Buccaneer | the hook thrown out, the foe reeled in to his feet, the cut |

A foe the cast moved (thrown, shoved, hooked) is staged where it stood and flies to where the sim put it (`launch` says from where; a hook
or a shove is read from the foe's step begun on that tick). A showcase plays at least 2.5 s (its last pose held), and a long chain of hops
is quickened to fit, so every one is 4 to 6 s with its opening and fade (tested for all eleven).

## Frames to generate (the OpenAI image account is out of credits until tomorrow)

Everything above is built from what is in the game. These would make it read better, made as the art plan says:

| For | Frames |
|---|---|
| Buccaneer | a six-sided die rolling and its six faces (to roll over each cut); a grappling hook and its rope |
| Samurai | an iaido crouch (hand on the hilt) and a sheathe (the blade going home) |
| Arc Blade | his body as lightning (a bright silhouette strip) for the hops |
| Barbarian | a mid-air frame, axe overhead |
| Ninja Monk | a flurry frame (many fists, after-images) |
| Minotaur | a head-down charge |
| Lancer | a lowered-lance gallop |
| Wizard | a falling meteor with its trail (the pack's orb stands in) |
| Beastmaster | the horn raised to his lips |
| Kunoichi | a kneeling finish, blade sheathed |

## Every hero, from its ultimate's own words (the plan for the other 34)

Each takes one of a few **styles** (the staging code is shared, the beats per hero), so a batch is mostly data plus art.

| Batch | Style | Hero: what we see |
|---|---|---|
| Pilot | blinks | **Kunoichi** (above) |
| Pilot | sky | **Wizard** (above) |
| Pilot | pack | **Beastmaster** (above) |
| 1 | blinks | **Mercenary**: steps out of the dark beside each of the three hardest hitters, one heavy cut each |
| 1 | blinks | **Arc Blade**: becomes a bolt that zig-zags through up to six foes, each lit, then snaps back to where he started |
| 1 | line | **Samurai**: crouches, the screen goes still, one flash of a dash along the line, sheathes; every foe on it splits a beat later |
| 1 | line | **Lancer**: rides the whole line, each foe flung aside as he passes; the riders near him spur on |
| 1 | line | **Minotaur**: three charges in a row, the camera chasing, each foe launched |
| 1 | leap | **Barbarian**: a huge leap (his shadow growing under the crowd), a crash, the 3x3 thrown out |
| 1 | blows | **Ninja Monk**: a blur of fists on each of three foes in turn, a count of blows, the last throws each away |
| 1 | hooks | **Buccaneer**: three hooks thrown out and three foes reeled in; a die rolls over each cut |
| 2 | sky | **Archer**: she looses into the sky; five volleys darken it and fall crowd by crowd |
| 2 | sky | **Dread Pirate**: the ghost fleet sails out of the fog at the board's edge and fires three broadsides |
| 2 | sky | **Siege Bot**: a targeting ring locks on, the shell whistles down, a second follows |
| 2 | sky | **Lightning Mage**: the storm cloud gathers over her and rolls out; the first bolt picks its foe |
| 2 | shots | **Gunslinger**: the clock strikes noon, she draws, six shots fan out one by one |
| 2 | shots | **Rifle Bot**: jets up to the high ground, glows as it overclocks, four shots |
| 2 | line | **Dragoon**: rears back and breathes fire down the longest line of foes |
| 2 | burst | **Ranger**: the net of vines flung out over everyone in sight, snapping tight |
| 3 | burst | **Knight**: plants his shield; every foe within 5 is dragged round to face him; the shield's light closes over him |
| 3 | burst | **Paladin**: kneels, a holy nova rings out, the foes turn to him and the allies glow |
| 3 | burst | **Yamabushi**: a gale gathers in his hands and throws every foe near him up and away |
| 3 | burst | **Gorgon**: her eyes open; stone spreads up each foe in sight, one by one |
| 3 | burst | **Juggernaut**: a stamp, the ground splits outward, the rock spires rise |
| 3 | burst | **Kraken**: the whirlpool opens and drags the foes round and in |
| 3 | burst | **Mummy**: the sand-wind drags them in; the two strongest are pulled up on strings |
| 3 | burst | **Warlock**: the circle of death rings out, curses on each foe, the drink drawn back to him |
| 3 | burst | **Tyrant**: a roar; the foes cower and slow, his allies stand taller |
| 3 | burst | **Shambler**: he sinks into the grave-earth and bursts out in the crowd, the rot rolling out |
| 3 | burst | **Reaper**: the scythe's sweep drags them in and cuts; the reaped rise as wraiths |
| 4 | pack | **Druid**: the thorn hedge grows across the foes' way and two treants rise at her side |
| 4 | pack | **Illusionist**: four mirror copies of her step out; the foes turn to them |
| 4 | pack | **Priestess**: light falls on the fallen and they rise, then the Wall of Light |
| 4 | change | **Werewolf**: the moon fills, he changes, a howl that frightens the foes near him |
| 4 | change | **Demon Swordsman**: chains of hellfire drag three foes in, then his demon form |
| 4 | change | **Kitsune**: fox fire spins round the three strongest foes and they shrink to little foxes |
| 4 | burst | **Karasu Tengu**: the razor feathers whirl into a cloud over the knot of foes |
| 4 | burst | **Time Witch**: a clock face spreads over the field and the foes freeze mid-step, colour drained |
| 5 | bless | **Wanderer**: a dawn light runs from ally to ally, each healed and shielded |
| 5 | bless | **Satyr**: the pipes play and the allies dance faster, notes rising |
| 5 | bless | **Samurai Commander**: the war banner goes up, the melee allies charge |
| 5 | bless | **Sage**: arcane threads to every ally, each pool filling, each shield forming |
| 5 | bless | **Cleric**: the spirits come one by one and circle her |
| 5 | bless | **Peasant**: the allies close ranks round him and he leads the charge |
| 5 | bless | **Wolf Bard**: the opening chord's shove, then the hymn's notes over every ally |

Each batch: the hero's beats as data in `SHOWCASES` (style and timings), any new style's poses in `posesAt` and beats in `fx.showBeat`,
a test that reads a real cast, captures at the three phone sizes, and the art below.

## The art plan

- **First the packs** (`hpatter9/chronos-assets`) and what is already in the game: the painted toolkit (blink, teleport slash, dash, shove,
  pull), the 131 painted spell sheets, the pack's elements (circle, rune, nova, wave, pillar, orb, smoke, puff), and the fighters' own
  sheets (walk, attack, attack2, hurt, cast). The pilot uses only these.
- **Then extra frames from the OpenAI image API**, through the connected `api.openai.com` (the key is injected; nothing to configure), for
  what no pack has: e.g. a clock face for the Time Witch, a ghost ship for the Dread Pirate, chains of hellfire, a die. Made as sheets on a
  plain key colour at the game's pixel scale, cut and keyed by a tool in `tools/ult-show/` (as `tools/eidolon-call-2/cut_askel.py` did
  for Askel), copied into `src/art/`, credited in `CREDITS.md` as generated, and listed in the service worker if loaded by URL.
- New sprite rows a hero lacks (a sheathe, a horn raised, a howl) are made the same way only where its sheet has nothing close.

## The code

- `src/ultShowRules.ts` (pure, tested in `test/ult-show.test.ts`): `SHOWCASES`, `showDue`, `wantsShow`, `momentSpeed`, `readCast`,
  `planShow`, `posesAt`, `seenOf` / `noteSeen`.
- `src/ultShow.ts`: plays a plan: the beats' effects and sounds, the staged poses.
- `src/ultMomentRules.ts`: the queue's `show` phase (held, its effects frozen, the blow at its end; `showT`).
- `src/ultMoment.ts`: picks the long version, counts the use, stages through the opening and the showcase, the camera's follow, and hides
  the ordinary effects meanwhile (`Fx.hush`).
- `src/render/unitView.ts`: `UnitSprite.stage`. `src/render/fx.ts`: `showBeat`, on the moment's own layer.
- `src/main.ts`, `src/standView.ts`: the x1 rule, the save's count. `src/eidolonCall.ts`: `long`.
- `src/settings.ts`: Shorter ultimates, Showcase again. `src/sim/meta.ts`: `ultSeen`.

## The owner's answers

1. "Every 10th" is the 1st, 11th, 21st... (as built).
2. A showcase is skippable by a tap, the first included.
3. Auto keeps the short version.
4. The Wizard's meteors keep falling live at x1 after the showcase.
5. Batch 1 and then the rest go ahead; the OpenAI image API for frames no pack has (out of credits until tomorrow: the list above).
