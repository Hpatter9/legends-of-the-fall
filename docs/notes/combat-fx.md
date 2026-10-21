# Combat effects (the "use all the effects we can" pass)

The owner's ask: arrows flying, spells flying, explosions, everything to make combat interesting. This note has the audit
(what each action showed before this pass and what it shows now), what was added, the rules it keeps, and how it was
checked.

## A bug found first: the effects layer was being destroyed

`BoardView.build` (run at the start of every fight) empties the board's root and **destroys** what it held, and the
effects layer (`Fx.root`) was a child of that root. So on the build before this pass, `fx.root` was already destroyed once
the first battle was made: no shot, spark, number, puff or flash drawn anywhere in a fight (the sim and the sounds were
fine). `BoardView` now has a `keep` list of layers that outlive a rebuild (`fx.dimLayer`, `fx.root`, set in `src/main.ts`).
Everything in the "before" column below is what the code *meant* to show; it only reached the screen after this fix.

A second find of the same kind: a fighter a skill calls up mid-fight (Call Treant, Summon Imps, Mirror Image's decoys) was
added to the sim but never given a sprite, so it fought unseen. The fight loop in `src/main.ts` now calls `syncSprites`
when the unit count changes, and the new sprite arrives with `Fx.summoned` (a circle, pillar and nova of its element).

## Audit

"Before" is the effect code on `main` (`fx.ts`, `skillFx.ts`, `unitView.ts`) once the layer bug above is fixed.

### Heroes (25), each at all three grades

Grades 1 to 3 change only the sheet, the halo and the sparkles (`unitView.ts`); the attack, the skill and every effect
below are the same at each grade.

| Hero | Attack | Before | Now |
| --- | --- | --- | --- |
| Knight, Samurai, Kunoichi, Barbarian, Paladin, Illusionist, Satyr, Minotaur, Werewolf, Kitsune, Karasu, Yamabushi, Samurai Commander | melee blow | one slash arc by weapon name, an impact spark scaled by the blow, a dust puff | the same, plus a knock (the struck is nudged along the blow), blood or bone chips off the struck, a cross flash and a 60 ms hit-stop on a crit, a harder one on a killing blow |
| Peasant | spear, reach 2 | the slash only | the slash and a spear shaft that thrusts out two thirds of the way and snaps back |
| Ninja Monk | fists | slash arc | as melee (the fists' flurry is the Thousand Fists skill, below) |
| Archer, Ranger | arrow | an arrow sprite on an arc, a faint glint trail, a puff | the arrow turned to its heading with a glint trail, a wind spark and dust where it bites, the shooter kicks back a little |
| Gunslinger | bullet | a tiny arrow, no flash | a muzzle flash and smoke at the gun, a bright tracer streak (no arc), a fire spark and puff where it lands, recoil |
| Fire Wizard, Wanderer | fire | a flame sprite and flame puffs, a puff | a fire orb with a flame trail, a flash where it leaves, a fire explosion, embers and smoke where it lands (bigger for the splash) |
| Lightning Mage | bolt | the same blue flame sprite as every other bolt | a lightning orb with a spark trail, a crack, a lightning strike and sparks where it lands |
| Warlock | curse | a violet-tinted flame | a shadow orb with a smoke trail, a shadow burst and a smoke puff |
| Druid | leaf | a green-tinted flame | a spinning forest orb with leaf motes, a forest burst, falling leaves |
| Gorgon | bolt | a blue flame | a poison orb with a green trail, a poison burst and a cloud that lingers over the struck |
| Cleric | melee (heals by passive) | none for the mend | a green ring rises round the healed and a thread of light runs from the healer to them |

### Foes (the 19 plain kinds) and the 9 bosses

| Foe | Attack | Before | Now |
| --- | --- | --- | --- |
| Skeleton, Skeleton Spearman | sword, spear | slash, spark; the spearman nothing extra | as melee heroes; the spearman thrusts; skeleton blows knock bone chips |
| Skeleton Archer | bone arrow | a bone sprite on an arc | the bone tumbles as it flies with a faint dark trail and bone chips where it lands |
| Orc Archer | arrow | as the archer's | as the archer's |
| Werewolf (3), Satyr (3), Minotaur (3), Orc Grunt, Orc Brute, Imp, Demon, Ogre | melee | slash and spark | melee as above (knock, chips) |
| Gorgon (3) | "bone" shot | a bone sprite | a poison orb like the hero gorgon |
| Orc Warlord, Demon Lord, Horned Ogre, Forest Boss (3), Boar King, Devil Leader | melee and a skill | slash; the skill's cast and hit sheets; a camera zoom and rumble in the intro (`src/main.ts`) | the same, plus an entrance on the fight's first tick (a dark rune, a shock ring, a pillar, smoke and embers, a rumble) and a boss's skill winds up in a big rune with a ring at its end and a rumble |
| Shaman King | bolt, wards its own | a blue flame | a shadow orb with a trail; its skill winds up like the other bosses' |

### Skills and ultimates (`SKILL_FX`, kits in `abilities.ts`)

Every skill had a cast sheet, a hit sheet or both. They now also wind up and burst in their own element (`SKILL_ELEMENT`
in `fxRules.ts`): a circle under the caster and motes gathering on it for the whole cast time (`castMs`), and an
element burst on each foe struck. Mythic ultimates add a big rune and pillar during the wind-up, a screen dim, a flash,
and at the end of the wind-up a nova, a ground wave, a second flash and a hard shake.

| Skill | Element | Before | Now (on top of the before) |
| --- | --- | --- | --- |
| Shield Wall, Hold the Line | earth | earth shield ring, ice shield | earth wind-up; the guard's ring stays while it lasts |
| Iaido, Shadow Step, Dive, Gore Charge | wind, dark | moon slash, dark circle, dust streak | wind-up; dust kicked up along the run and a wind slash at its end |
| Volley | wind | arrows rain from the sky, wind burst | each arrow lands in a spark and a puff |
| Meteor (and the wizard's) | fire | a fireball falling, a fire explosion | a fire orb with a flame and smoke tail, its shadow swelling on the ground, then a big explosion, a fire nova and ring, rubble, smoke columns, a scorched crater that cools, a flash and a hard shake |
| Thousand Fists, Tusk Flurry, Ravage, Whirlwind | light, blood | burst per strike | element burst per strike; the stunned show circling stars |
| Chain Lightning | lightning | a straight jagged line | a flickering bolt in a glow with a fork and a crack at each end |
| Sanctuary, Benediction, Spirit Ward, Holy Challenge, Rally Cry, War Banner | light | gather, nova, circle | light wind-up; the shield's bubble stays on the shielded |
| Fox Charm, Hex, Nine-Tailed Dream | dark | a lightning-looking line | a wavy pink thread with hearts (charm) or violet with smoke (hex), not lightning |
| Call Treant, Summon Imps, Mirror Image | forest, fire, dark | a burst under the caster (and the called-up fighter had no sprite at all, see below) | wind-up circle, and the called-up fighter now gets a sprite with a circle, pillar and nova under it |
| Snare Trap | earth | a ring on the tile and a burst when sprung | the same |
| Wind Gust, Tempest, Feather Storm | wind, blood | burst and vortex | wind-up rune; Tempest and Feather Storm are ultimates (dim, flash, nova) |
| Pipes of Pan, Petrifying Gaze, Stone Curse, Dead Eye, Ground Slam, Horned Shove | various | cast and hit sheets | element wind-up; a gaze marks the foe with a ring and "Petrified" |

### The king's spells (`SPELL_FX`, `spells.ts`)

| Spell | Before | Now |
| --- | --- | --- |
| Heal | gold light gathers up each hero; green sparkles and "+n" | the same, a green ring rises round each, a circle on the tapped tile |
| Meteor | as the wizard's skill | as the wizard's skill |
| Haste | gold wind vortex on each; "Haste" | a wind circle and vortex on the tile; a wind nova on each; the hasted trail gold dust and a wind loop while it lasts |
| Shield | earth shield on each | a light circle and nova; a shield bubble that stays on each until it breaks or ends |
| Smite | light nova on the foe | a pillar of light, a nova, a flash and a shake |
| Chain Lightning | straight lines | flickering bolts with cracks at each foe |
| Poison Cloud | a green glow over the 3x3 | a circle and burst, then green smoke and bubbles boil up from the tiles for as long as it lingers |
| Frost Nova | an ice-shield on each foe | a circle, nova and ring, ice spikes rise on each tile, an ice shatter on each foe, and ice bubbles on them while slowed |
| Rally | gold burst on each | a fire nova and a fire aura on each, and a fire aura loop while it lasts |
| Earthquake | an earth explosion on each hit foe | a long shake, and the earth hit on each foe |
| Resurrect | light gather | a pillar of light and a rune where the fallen rises |

### Statuses (`STATUS_LOOKS`, drawn in `unitView.ts`; the badge icon stays)

| Status | Before | Now (a loop on the fighter while it lasts; at most three, two on battery saver) |
| --- | --- | --- |
| Burn | a hot tint, a burn spark per tick, a badge | a licking flame at the feet |
| Bleed | a red tint, a badge | rising blood bubbles |
| Curse (Warlock's hex) | a violet puff per tick | a dark aura |
| Slow (frost) | a frosty tint, ice puffs, a badge | rising ice bubbles |
| Stun, hold, petrify, freeze | nothing (the sim had no field) | three stars circling the head, from the new `stunUntil` record |
| Shield | nothing | a translucent light bubble |
| Haste | gold dust trail, a badge | a wind loop |
| Rally, War banner, Frenzy, Cleric's blessing | nothing | a fire aura, a gold aura, a blood aura, green motes |
| Guard (Shield Wall) | an earth ring | unchanged |
| Charm | a heart badge | unchanged |

### Deaths (`deathKind` in `fxRules.ts`)

| Kind | Before | Now |
| --- | --- | --- |
| Skeletons | five bones and a puff | seven bones tumbling, a puff of dust and shadow |
| Imps, demons, devils | smoke | a fire burst, flames and smoke rising, embers, and the body goes dark as it burns away |
| Ogres, minotaurs, boars, brutes, warlords, forest bosses | a blood puff | a ring of dust pushed out along the ground, rubble, a small shake |
| Gorgon | a blood puff | stone chips and dust, the body turning grey |
| Other foes | a blood puff | blood, drops, a splash |
| Heroes | a white puff | motes of light rising |
| Killed by burning, bleeding, poison or a meteor | no death effect at all (a gap) | the same effects as any death |
| A boss | blood and fire explosions, smoke, a slow beat | unchanged |

## What was added

- `src/render/fxRules.ts` (pure, tested): the missile each shot draws (`missileOf`), the elements of the skills and the
  spells, `deathKind`, the status loops (`statusesOf`, `STATUS_LOOKS`), the tether style (`arcStyle`), the spells'
  cast and touch strips, `bits`, `hitStopMs`, `nudgeOf`.
- `src/render/fxSheets.ts` and `src/art/fx/pack/atlas.png` + `atlas.json`: one atlas of 225 strips of 32px frames, cut from
  the Pixel Effects pack by `tools/fx-atlas.py` (183 KB, bundled into `game.js` as a data URL, so nothing new for the
  service worker's file list). Ten elements (fire, ice, lightning, light, dark, forest, poison, earth, wind, blood) each
  have orb, hit, explosion, slash, circle, rune, shield, status, gather, nova, cross, puff, smoke, sparkle, aura,
  vortex, pillar, strike, spikes, wave and flame; star, water and moon have a few. Credited in `CREDITS.md`.
- `src/render/combatFx.ts`: `impactBurst` (an element's landing), `deathBurst`, `windUp`, `bossEntrance`, all through the
  pooled `Particles`.
- `src/render/fx.ts`: the shot rewrite (turned to heading, orb, tracer, trails, muzzle flash, recoil), the spear thrust,
  tethers, the meteor's fall and crater, the spells' casts, skills' wind-ups, ultimates (dim, flash, nova), the boss's
  entrance, the dust trail of a dash, hit-stop and the dim layer.
- `src/render/unitView.ts`: the status loops, the stun stars, the knock (`nudge`), the burn-away and stone tints on a fallen
  fighter.
- `src/render/particles.ts`: `prio` bursts (a death or explosion is let through a cap 30% fuller than the small bits).
- The sim: one pure record, `Unit.stunUntil` (set where `busyUntil` is set by a stun, hold, petrify or freeze). It is read
  only by the renderer, changes no outcome, and no test needed changing.

## Rules kept

- The renderer reads the battle and changes nothing in it. `src/sim/` gained only `stunUntil`.
- Phone performance: every new burst goes through the pooled `Particles` (capped at 200, 110 on battery saver, which also
  halves each burst's count through `bits` and draws two status loops instead of three). Projectiles and a few
  one-off layers (a tracer, the meteor's crater) are single sprites or Graphics made per event, a handful at a time.
- Reduced motion (the device's `prefers-reduced-motion`) and the Screen shake setting both turn off the shake, the
  flashes, the dim and the hit-stop (`Fx.calm`). Damage numbers still follow their own setting.
- Pixel look: nearest-neighbour filtering (set globally in `main.ts`) and the pack's frames used as they are. The sheets'
  sizes follow the fighters' heights, so a few scales are not whole numbers; the world is zoomed by the camera
  anyway, so whole-number scales on the sprites would not keep pixels square.
- Deterministic sim: the renderer's randomness (`Math.random` for jitter) stays in the renderer.

## Not done

- Thrown axes and spears: no hero or foe throws one (the sim has only arrows, bones, bullets and bolts); the spear's thrust
  is the closest thing.

## How it was checked

`npm run typecheck`, `npm test` (new: `test/combat-fx.test.ts`, which also checks that every strip the code names is in
the atlas), `npm run web`, then the lab: `node tools/fxlab/shots.mjs [scenario | all | perf]` builds `tools/fxlab/lab.ts`,
loads it into the built page, swaps in a chosen battle and steps it by hand, taking nine frames at 393x852 and 852x393
into `docs/samples/combat-fx-<scenario>-<upright|sideways>.png` (the lab is a dev tool, not shipped).

## Frame time

Measured with `node tools/fxlab/shots.mjs perf`: ten heroes against the "mixed" band at 393x852, skills charged, then the king's
frost, meteor, chain lightning and poison cast one after another, in headless Chromium on a software renderer (SwiftShader,
no GPU, so far slower than a phone's). Average frame time over 2.5 to 3 s: plain fight 45 ms (worst 117), frost 42 ms
(worst 67), meteor 37 ms (worst 50), chain 33 ms (worst 50), poison 38 ms (worst 67). That is a CPU-rasterised lower bound
on speed; the numbers are for comparing changes, not a phone's frame rate. Live particles stay under the 200 cap (130% for
big bursts).
