# Ailments: damage and status effects (STATUS-FX)

The owner's ask: **"I want to add in damage effects, like frozen, burning, poisoned, etc."** Their answers: eleven
effects (Burning, Poisoned, Frozen, Bleeding, Chilled, Shocked, Stunned, Weakened, Cursed, Silenced, Feared); all four
sources (heroes by element, foes, terrain, the king's spells with a cleanse); the full look (an effect on the body, a
small icon over the head, damage numbers in the effect's colour); resists by type, bosses taking shorter effects. Then:
**"I'll have ChatGPT do the artwork for the effects"**, so the art sits behind one seam with a brief to paint from.
Phase A's design was approved with every recommendation ("go with yours").

**Status: phase B done on the branch, ready for review.** Branch `claude/status-fx`, worktree `/home/user/status-fx`,
from main 0.213.0 (main had not moved). The art is the placeholder atlas; ChatGPT's painted sheets drop in with the
importer ([art brief](status-fx-art-brief.md)).

The code calls them **ailments** (`AilmentKey`); the game's text calls them by their names ("Burning", "Frozen").

## Screenshots (real army fights, the ailments as the game lays them)

| Picture | What it shows |
| --- | --- |
| [status-fx-fight-393x852.png](../samples/status-fx-fight-393x852.png) (also [360x780](../samples/status-fx-fight-360x780.png), [412x915](../samples/status-fx-fight-412x915.png)) | The Infernal Host, wave 5, against a level-30 Fire Wizard, Lightning Mage, Samurai, Warlock and Shambler: demons shocked (sparks, chips), imps cursed, heroes set burning by the imps' Hellborn, "Immune" over a fire-proof imp, the numbers in each ailment's colour. |
| [status-fx-fight-393x852-calm.png](../samples/status-fx-fight-393x852-calm.png) | The same with reduced motion: every part on its first frame, nothing moving or blinking. |
| [status-fx-shatter-393x852.png](../samples/status-fx-shatter-393x852.png) | The Ogre Clans: Frost Nova and Deep Freeze freeze the ogres (the ice crust), and a heavy blow shatters one: the burst of shards, "SHATTER" and the ice-white number. |
| [status-fx-immune-393x852.png](../samples/status-fx-immune-393x852.png) | The Infernal Host: the Fire Wizard's fire does not take on an imp, so "Immune" over a crossed-out flame chip. |
| [status-fx-contact.png](../samples/status-fx-contact.png) | Phase A's contact sheet of all eleven body effects (the same parts and atlas the game now draws). |

`npm run web && node tools/status-fx/shots.mjs` makes them (the party set on the page, the spells cast by tapping the
board as a player does, the fight held still at the moment).

## 1. The model (`src/sim/ailments.ts`)

- **One list per fighter**, `Unit.ail?: Ailment[]` (optional: older saves and battles read as before). An entry is
  `{ kind, until, by, dmg?, every?, next?, ms?, stacks?, relay?, from? }`. Each kind has one way in: `setDot` (the damage
  kinds, given as the old `Unit.dot` was set), `burnFor`, `poisonFor`, `bleedFor`, `curseFor`, `stunFor`, `freezeFor`,
  `chillFor`, `charmFor`, `weakFor`, `silenceFor`, `fearFor`, `shockFor`; one tick, `tickAilments` (where the old damage
  over time ticked in `tickStatus`); one `cleanse`, a `ward`, `putOut`, `unfear`.
- **Wrapped, not replaced:** a hold still sets `busyUntil` and `stunUntil`, a chill `slowUntil`, a weakening
  `weakUntil` (and the Hex's attack cut), a freeze `brittleUntil`. The AI, the Last Stand's AI, the kits' checks and
  the old looks read them as before. All 58 places in the sim that wrote those timers now call the functions above.
  `Unit.dot` is kept only as a field an old caller or a test may set: the model folds it into the list when it next
  reads the fighter (`ailmentsOf`).
- **`AILMENT_SWITCH.on`** (a dev safety, on in the game). Off, every function does exactly what the old code did (one
  damage over time, the holds and slows as they were). **Step one's proof:** `test/ailments-identical.test.ts` plays
  seeded fights of every mode (80 field fights at level 1 and 80 at level 30, every boss band, the armies' own foes,
  every king's spell cast, five lands, four army runs, a daily, the spire, a Last Stand and a Calamity), and with the
  switch off their event logs and end states hash exactly as on main before the change
  (`test/fixtures/ailment-logs.json`, recorded on main's rules, `tools/status-fx/logs.mjs`). The few foe strengths the
  balance pass moved afterwards are put back to main's inside that test.
- **Determinism:** the one new chance (a skeleton's grave-rot) hashes the moment (`mixSeed(b.seed, 0x5fa1, t, ids)`), so
  the fight's own stream does not move. Nothing new is saved; no save version changes.
- **Events:** a hit carries `ail` (the ailment it came from, or `shatter`); new events `immune` and `shatter`; an `arc`
  carries `ail: 'shock'` for a spark. The page reads these; the hash leaves them out.

## 2. The eleven, as built

| Ailment | Rule | Numbers |
| --- | --- | --- |
| **Burning** | Ticks; stands beside the other damage kinds; laid again keeps the stronger tick and later end. Puts out a chill; **thaws a freeze** instead of taking; put out by water, a Flood tile or a steam geyser. | The new burns: 12% of the burner's attack every 0.5 s for 3 s. The old ones (Cinders, Wildfire, Dragon Breath, meteors' ground, relics) keep their numbers. |
| **Poisoned** | Stacks to 5, ticks for each stack; each stack cuts healing received by 10%. | 4% of the poisoner's attack a stack (at least 2) every 1 s for 5 s. |
| **Frozen** | Held, brittle (x1.3 from every blow), puts out burning; ends into a 2 s chill. **Shatters** under a heavy blow (a crit, a skill hit, or 15% of its health): the freeze ends and the blow lands again for half, capped at 20% of its health (a boss 6%). | Frost Nova 2 s, Deep Freeze 4 s, Soul Nova 1.8 s, Shard Burst 1.2 s; three frost chills within 4 s freeze for 1.2 s. |
| **Bleeding** | Ticks; a tick taken while walking a step is doubled. | As each source had it (crits 4 a tick); the new bleeds 6–10% of attack. |
| **Chilled** | Slowed (every slow in the game is a chill now). Only frost (the king's Frost Nova, the Lich King's blows, the frost relics) counts towards a freeze. | The game's own slow (`SLOW_MULT`, half speed), not the 30% first proposed: the slows keep their tuned worth. |
| **Shocked** | Every second a spark jumps to the nearest fighter of its own side within 2 (to every one of its side in the same water, within 3), which is shocked 1.5 s and does not pass it on. Machines take sparks x1.5. | 15% of the shocker's attack a spark, 3 s. |
| **Stunned** | As each source had it; now through resists and the boss rules. | — |
| **Weakened** | Attack cut by the Hex's 30% (`HEX_MULT`), put back when it ends. | 3–4 s. |
| **Cursed** | Half of any healing it receives is dealt to it as harm, the rest lost. The Hex's and the Warlock's curses keep their tick and drain. | 4 s (the curses' own lengths). |
| **Silenced** | No skill or ultimate; meters keep filling; a queued ultimate waits rather than lapses. | 1.5–2 s from the heroes. |
| **Feared** | Steps away from the nearest foe and strikes nobody. Battle Cry ends it on the heroes. | 0.7–1.5 s. |

A cleanse (the king's Cleanse, Benediction, Divine Intervention, Holy Light, Resurrection, Rewind, a shrine's tile, the
equipment's) takes every ailment. The king's Cleanse also **wards** the heroes for 2 s: nothing new takes hold.

## 3. Sources

**Riders on skills** (`src/sim/ailmentSources.ts`, the one balance table; every foe the caster struck takes it once):
Flask Toss, Powder Keg, Forge Hammer burn; Chain Lightning, Thunderstorm, Voltage Blink, Thunder Cascade shock;
Whirlwind, Bloodlust, Hellblade Sweep (8%) and Shadow Step, Shadow Dance (6%) bleed; Dirge (3 s) and Condemn (4 s) weaken;
Suppressing Fire, Stillness Palm (2 s) and Pilfer (1.5 s) silence; Harvest of Souls (0.7 s), Full Moon (1.2 s), Reign of
Terror (1.5 s) and the Oni King's Kanabo Smash (1 s) frighten. The old riders moved in unchanged (Cinders, Wildfire,
Dragon Breath, crits' bleeds, the Hunter's bites, the Hex, Soul Harvest, Plague Tide, the relics, the equipment).

**Foes' blows** (`blowRiders`): skeletons, spearmen, bone archers, marksmen and the Bone Captain poison one blow in five;
the Lich King's blows chill (frost); the Shaman King's shock; the Forge Titan's burn; the werewolf packs and the Alpha
bleed. Nyssa's Venom and the Calamity's Blight poison instead of cursing. The crystal golems' Shard Burst and Storm and the
Lich King's Soul Nova freeze. The Ranger's Poisoned Tips talent poisons instead of bleeding.

**The ground:** lava sets the walker burning (its step's sear halved, `LAVA_BURN`); hot coals burn a little; water and
Flood tiles put fire out, and in the swamp they poison; standing still on ice chills (walking over it is still quick); a
shrine cleanses; the army road's lava flares burn, its steam geysers put fire out, its grasping hands chill.

**The king's spells:** a Meteor burns what it strikes (not the shower's stars); Frost Nova freezes 2 s then chills to 6 s
(frost); Deep Freeze freezes 4 s and can shatter; Chain Lightning shocks each it reaches; each Poison Cloud bite adds a
stack; the Hex curses as well as weakening; Battle Cry ends fear; Cleanse wards. The spells lay ailments with an attack of
50 (`KING_ATK`).

**Changed from the design:** the Shambler's Rotting Touch stays a curse (with the curse's new healing-to-harm), not poison:
as poison the dead and the golems shrugged it off and the Shambler fell 7 points behind the roster at level 1. Fear went
on Reign of Terror (the Tyrant's ultimate) rather than Judgement, and on Harvest of Souls for 0.7 s (at 1.5 s the Reaper
was 13 points above the roster).

## 4. Resists and bosses (`resistOf`, `gate`)

| Type | Immune | Half as long |
| --- | --- | --- |
| Fire beings (imps, demons, the Demon Lord, Devil Leader, Magma Golem, Forge Titan, Cindra, Vexor, the Nine-Tailed Fox, the fiery Calamity bosses, the Queen Dragoon) | Burning | Chilled, Frozen |
| Undead (skeletons, the Bone Captain, the Lich King, wraiths, the Hollow Knight; the Shambler, Mummy, Reaper, Dread Pirate) | Poisoned, Bleeding, Feared | — |
| Golems (all, the Colossus, the Titan, the Iron Warden) | Poisoned, Bleeding, Feared | Stunned |
| Machines (Rifle Bot, Siege Bot, Arc Blade, Juggernaut) | Poisoned, Bleeding, Feared | (sparks x1.5) |
| Frost creatures (the crystal golems, the Colossus, the Lich King, the white werewolves) | Frozen, Chilled | — |
| Holy (Paladin, Cleric, Priestess) | — | Cursed, Feared |
| Treants | Bleeding | (burn x1.5) |
| Decoys, the Standard, the Last Stand's king | everything | — |

**Bosses** (a boss kind, a Calamity boss, or a band's leader drawn bigger): every ailment half as long; never feared; hard
control (frozen, stunned, silenced, charmed) with diminishing returns: the first half, a second within 10 s a quarter, a
third an eighth, then immune to it for 10 s; a shatter takes at most 6% of its health. A shrugged-off ailment shows
"Immune".

## 5. The look (`src/render/ailmentLayer.ts`, `statusStyles.ts`, `statusArt.ts`, `fx.ts`)

- **Body:** the parts of the two latest ailments (ground and back behind the fighter; front, halo and motes in front),
  placed and sized by `statusStyles.ts`, framed from the atlas `src/art/fx/status/atlas.png` + `atlas.json`. The fighter
  takes the tint of its latest ailment that has one. They replace the old ailment loops (flames, frost bubbles, the
  stun's drawn stars); the buffs' loops (shield, haste, rally, banner, frenzy, regen) stay.
- **Chips:** a row of round chips just over the health bar, one per ailment (up to four), each a dark disc with its
  colour's rim and its icon. They replace the shoulder badge, which now shows only a charm's heart (a haste keeps its
  wind loop).
- **Numbers:** an ailment's ticks and riders in its colour (burning `#ff9a3c`, poison `#8fe05a`, frozen `#9fe6ff`,
  bleeding `#ff5a4e`, shock `#fff27a`, curse `#c07aff`); a shatter bigger and ice-white `#bff0ff` under "SHATTER" with the
  burst of shards; "Immune" with the crossed-out chip. A spark draws as a lightning arc.
- **Sound:** a shatter has its own crack; poison hisses and sparks crackle softly; curses hum and fire whooshes as before.
- **Reduced motion:** every part holds its first frame and stays put; the shatter is one still frame fading. Nothing
  blinks off. **Battery saver:** one ailment's parts per fighter, the parts marked † in the brief left out (every
  ailment keeps one), chips and numbers kept. **No allocation per frame:** the parts are made when what a fighter shows
  changes, then only re-framed and moved. **Offline:** the atlas (19 KB) is bundled into `game.js`.
- **Painted art:** the art seam, the importer and the prompts are in the [art brief](status-fx-art-brief.md).

## 6. Balance (before: main 0.213.0; after: this branch)

Measured with `sh tools/status-fx/measure.sh <dir>` on both (each part is the game's own tool, seeded): parity
`tools/kits/tune.mjs` (12000 fights), the Last Stand `stand-balance` (16 runs a level), the daily `ult-charge/run.mjs
--only daily` (60 dates for the levelled save) and `dailyRate` (60 dates, fresh save), the Calamity `balance --calamity`
(100 runs), the armies `army-pace/run.mjs normal|stars` (8 saves).

| Measure | Before | After | Target |
| --- | --- | --- | --- |
| Parity, level 1 (stage 5) | average 53.1%, none beyond 6, 3 beyond 4 | 53.2%, none beyond 6, 3 beyond 4 (knight 3.9, Commander 4.9, Illusionist -4.7, as before) | every hero within 6 |
| Parity, level 30 (stage 78) | 49.7%, none beyond 6, none beyond 4 | 51.6%, none beyond 6, none beyond 4 (spread 6.9) | every hero within 6 |
| Last Stand median wave, levels 1/10/20/30/60/100 | 4/10/11/16/20/25 | 3/9/11/15/20/24 (means 3.4/9.3/10.6/16.1/19.5/25.4) | about 4/9/10/14/20/25 |
| Daily, levelled save, level 30 / 50 (60 dates) | 70% / 75% | 68% / 72% | about 66–75% |
| Daily, fresh save, with hearts / without | 73% / 55% | 70% / 50% | about 66–75% with hearts |
| Calamity, maps felled 1–6 | 91/79/65/51/51/16% | 91/85/63/54/52/14% | as before |
| Army Normal, tries: Infernal at 45/55/65 | 15.0/6.5/1.6 | 10.5/7.0/1.9 | just before the first army's stars (55–65) |
| Yokai at 55/65/75 | 25.8/8.1/3.6 | 23.1/14.5/2.1 | after the stars |
| Golems at 55/65/75 | 26/11.3/4.1 | 26/11.1/3.4 | after the stars |
| The first army's stars, level 55 / 65 (Legendary, Mythic tries; saves with all 11) | 2.4, 17.1, 3 of 8 / 1.6, 6.4, 8 of 8 | 2.5, 12.8, 6 of 8 / 1.8, 6.0, 8 of 8 | about 55–65 |

So the ARMY-PACE target holds: a typical player has the first army's 11 stars between levels 55 and 65; the Infernal Host
comes just before (7 tries at 55), the Yokai Night Parade (14.5 at 65) and the Golem Forge (11 at 65) after. The Yokai
comes a little later than on main (its army is boss-heavy, and the boss rules weigh on a level-65 party's control; the
tool's eight saves at the cliff near its `start` swing from 6 to 17 tries, so its `start` was left as it was).

**What was retuned (none of it a test loosened):**

| Knob | Was | Now | Why |
| --- | --- | --- | --- |
| Harvest of Souls fear | (1.5 s designed) | 0.7 s | the Reaper was 13 points above the roster at level 30 |
| Shadow Step / Shadow Dance bleed | (10% designed) | 6% | the Kunoichi 4.3 above |
| Rotting Touch | (poison designed) | a curse, as on main | section 3 |
| Plague Tide `tuned.power` (`ultimates.ts`) | 0.99 | 0.9 | its curse now turns the foes' healing to harm: the Shambler was 5.0 above at level 30 (now about +1) |
| Infernal Host Normal `start` (`armies.ts`) | 10 | 9.4 | the boss rules and the fire-proof imps made it 11.5 tries at 55; kept above the Ogre Clans' 9.3 |
| Calamity `CAL_SCALE.bossHp` (`calamity.ts`) | 1 | 0.75 | the boss rules took 8–11 points off maps 3–6 |
| Last Stand `WAVE_GROWTH_LATE` / `WAVE_GROWTH_DEEP` (`stand.ts`) | 0.2 / 0.29 | 0.26 / 0.24 | the heroes' ailments carried a level-30 party to wave 19 |
| Daily `DAILY_ANSWER.ult` (`modes.ts`) | 0.17 | 0.15 | the boss of the day under the boss rules took a levelled save to 60–62% |

## Tests

- New `test/ailments.test.ts` (14): side by side, poison stacks and healing cut, the curse, the freeze and its shatter,
  thawing, frost building to a freeze, sparks and water, resists, the boss rules and their ladder, silence and fear, the
  cleanse, ward and Battle Cry, the ground, the grave-rot's determinism and the riders, the king's spells.
- New `test/ailments-identical.test.ts`: step one's proof (above).
- `test/status-fx-art.test.ts` (phase A): every ailment has a body part, an icon and its colour; the atlas has every key in
  the importer's order.
- **Changed for the new rules (none loosened):** `abilities.test.ts`, `more-heroes.test.ts`, `class-heroes.test.ts`,
  `combos.test.ts`, `elites.test.ts`, `spells-more.test.ts`, `talents.test.ts` read the damage over time through
  `dotOf` (the list) rather than `Unit.dot`; Keen Edge's target is an orc (the undead do not bleed); the Demon Form test
  wards its hero against the skeleton's grave-rot (it is about the form); Deep Freeze's x1.3 is checked with a light blow
  (a heavy one now shatters); lava's step sears half and sets burning (`areas.test.ts`); the buff loops and the ailments
  are read apart (`combat-fx.test.ts`, `shownAilments`); `stand-regression.test.ts` pins ordinary fights under the rules
  it was pinned on (the ailments off); `hero-kits-all.test.ts`'s long fight has band health 100 (was 80; the ailments'
  burns and bleeds ended it before two heroes cast their second skill: main itself sat at the threshold, 35 of 45).

## Files

- Sim: new `src/sim/ailments.ts`, `ailmentSources.ts`, `ailmentKeys.ts`; hooks in `battle.ts` (`battleTap`, the step,
  `hurt`'s shatter, the ground, fear), `abilities.ts`, `spells.ts`, `hazards.ts`, `orders.ts`, `ultimates.ts`, `combos.ts`,
  `duoCombos.ts`, `equipFx.ts`, `tierSkills.ts`, `duchessBleat.ts`, `stand.ts`, `kits/*.ts`; tuning in `armies.ts`,
  `calamity.ts`, `modes.ts`, `stand.ts`, `ultimates.ts`.
- Page: new `src/render/ailmentLayer.ts`; `statusStyles.ts`, `statusArt.ts`, `unitView.ts`, `fx.ts`, `fxRules.ts`,
  `soundRules.ts`, `chainView.ts`. The phase A prototype (`statusMock.ts`, `window.__statusMock`) is gone.
- Tools: `tools/status-fx/` (`logs.ts`/`logs.mjs` the fingerprints, `measure.sh` the balance, `shots.mjs` the pictures,
  `status-sheets.py` and `import-status-art.py` the atlas, `status-pack.json`).
