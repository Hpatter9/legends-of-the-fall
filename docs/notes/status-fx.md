# Ailments: damage and status effects (STATUS-FX)

The owner's ask: **"I want to add in damage effects, like frozen, burning, poisoned, etc."** Their answers: eleven
effects (Burning, Poisoned, Frozen, Bleeding, Chilled, Shocked, Stunned, Weakened, Cursed, Silenced, Feared); all four
sources (heroes by element, foes, terrain, the king's spells with a cleanse); the full look (an effect on the body, a
small icon over the head, damage numbers in the effect's colour); resists by type, bosses taking shorter effects. Then:
**"I'll have ChatGPT do the artwork for the effects"**, so the art sits behind one seam with a brief to paint from.

**Status: phase A (design and mock-ups) done; waiting for the owner's answers.** Branch `claude/status-fx`, worktree
`/home/user/status-fx`, from main 0.213.0. Nothing in the fight's rules has changed yet: the mock-ups are drawn by a
prototype on a real fight held still. The art seam is built and tested (placeholder pack strips today). Phase B, the
rules, waits for the answers below.

The game calls them **ailments** in code (`AilmentKey`) to keep them apart from the existing renderer `StatusKey`
(which also covers buffs: shield, haste, rally); the game's text calls them by their names ("Burning", "Frozen").

## Mock-ups (real in-game screenshots, 393x852)

| Picture | What it shows |
| --- | --- |
| [status-fx-fight.png](../samples/status-fx-fight.png) | A fight with several ailments at once: a foe burning and poisoned (orange 18, green 11), a frozen foe in its ice crust (a white 64 blow), heroes bleeding and weakened (red 9), shocked and stunned (yellow 27), chilled, cursed and silenced (violet 14), and feared. The chips over the heads show every ailment held. |
| [status-fx-contact.png](../samples/status-fx-contact.png) | Close-ups of all eleven body effects, each on a hero (top) and a foe (bottom). |
| [status-fx-shatter.png](../samples/status-fx-shatter.png) | The frozen shatter: a frozen foe takes a heavy blow, the crust bursts, "SHATTER 186" in ice white; beside it, another foe still frozen. |
| [status-fx-immune.png](../samples/status-fx-immune.png) | A foe resisting: the fire-proof one shows "Immune" over a crossed-out flame chip (its blow still lands, white 31), beside one that burns (orange 18). |

The art is **placeholder** (the 5000 Pixel Effects pack's strips): it shows placement, size, motion and colour, not the
final look, which ChatGPT will paint from [status-fx-art-brief.md](status-fx-art-brief.md). No PixelLab generations
were used. Made by `node tools/status-fx/shots.mjs` then `python3 tools/status-fx/sheet.py` (after `npm run web`).

## 1. One status model

Today the ailments are scattered: `Unit.dot` (one damage-over-time: `bleed`, `burn` or `curse`), `stunUntil` (the
look) with `busyUntil` (the hold), `slowUntil`, `weakUntil`, `brittleUntil`, `chilled` (the frost set's first blow),
`kx.stone`, kit marks, `zones` (burning ground, caltrops). A new dot overwrites the old one, so a bleeding foe set
alight stops bleeding.

**Phase B adds one list per fighter**, `Unit.ail?: Ailment[]` (optional: older saves and tests read as before), in a
new pure module `src/sim/ailments.ts`:

```ts
interface Ailment {
  kind: AilmentKey;     // burn, poison, freeze, bleed, chill, shock, stun, weak, curse, silence, fear
  until: number;        // when it ends (b.t)
  by: number;           // the unit that laid it (its kills, XP and drain count for it)
  dmg?: number;         // per tick, for the ones that hurt
  next?: number;        // the next tick
  stacks?: number;      // poison only
}
```

- **One entry per kind.** Re-applying refreshes it (the longer time, the stronger tick), except poison, which stacks.
  Different kinds stand together: a foe can bleed, burn and be poisoned at once.
- **One way in:** `applyAilment(b, to, kind, ms, opts, out)` checks resists, the boss rules and diminishing returns,
  then sets the entry and emits `{ kind: 'ailment', to, what, ms }` (or `{ kind: 'immune', to, what }`). Every source
  (kits, foes, terrain, spells, relics, talents, equipment) calls it.
- **One tick:** `tickAilments(b, out)` replaces the `dot` block in `tickStatus` (`abilities.ts`).
- **Wrapping, not breaking:** the old timers stay as the things the AI and the looks already read, written by
  `applyAilment`: freeze and stun still set `busyUntil` and `stunUntil`; chill sets `slowUntil`; weak keeps the Hex's
  `weakUntil` revert; freeze sets `brittleUntil`. So the AI, `standAi.ts`, the kits' checks ("every stunned or slowed
  foe" for the Gorgon's Stone Garden) and the existing looks keep working unchanged. `Unit.dot` is read once and folded
  into the list if a unit carries one (a battle made by older code), then never written again. `kx.stone` (the
  Gorgon's statues) stays its own thing: it is a stun with its own look.
- **Buffs stay where they are** (haste, rally, guard, shield, banner, charm, hide): they are not ailments.
- **Saves:** fights are not saved mid-battle (the Last Stand saves its run between waves), so no save carries the new
  list. No save version changes.
- **Replays:** an auto-replay is the seed plus the orders. A replay recorded before phase B and played after it would
  play out differently; the replay log is per fight and not kept across versions, so nothing old is replayed.
- **Determinism:** chance rolls for the new ailments use their own side stream, `new Rng(mixSeed(b.seed, 0x5fa1))`
  (made once per battle), so a fight where no new ailment fires plays exactly as before.
- **Phase B in two steps:** first the existing effects move into the list **with the same numbers** (a test plays
  fixed seeds of every mode and checks the event logs are identical before and after); then the new sources come in,
  behind a switch `AILMENTS_ON` so the balance tools can measure with and without.

## 2. The eleven ailments

Times are at level 1 and are scaled by `durOf` (the caster's skill duration) as today. Tick numbers use the ailment's
colour (section 7). "Cleanse" means the king's Cleanse, the Cleric's Benediction and Divine Intervention, the
Priestess's Holy Light and Resurrection, the Time Witch's Rewind and a shrine's tile. All eleven are cleansed by them.

| Ailment | What it does | Numbers (proposed) | Stacking | Interactions |
| --- | --- | --- | --- | --- |
| **Burning** | Fire damage over time. | A tick every 0.5s for 3s; a tick is 12% of the burner's attack (the Fire Wizard's Cinders keeps its own 3 a tick). | Refreshes, keeps the stronger tick. | Puts out a **chill**. **Thaws a freeze** (the freeze ends, no shatter; the fire hits once, and the burn is not set). Put out by stepping into **shallow or deep water**, or a Flood tile. Fire-proof foes are immune. |
| **Poisoned** | Damage that stacks and cuts healing. | A tick every 1s for 5s; each stack ticks 4% of the poisoner's attack (min 2). Each stack cuts healing received by 10%. | Up to 5 stacks; a new stack refreshes the time. | Healing cut applies to every heal (skills, regen, leech, shrines, the king's Heal). |
| **Frozen** | Can't act, takes extra damage, shatters. | Held 1.5s (the king's Frost Nova 2s, Deep Freeze 4s as now). Takes x1.3 from every blow (`BRITTLE_MULT`, as Deep Freeze now). | Does not stack; a new freeze refreshes. | **Shatter:** a heavy blow (a crit, a skill hit, or a blow of 15% of its health or more) ends the freeze and deals 50% of the blow again as ice damage, capped at 20% of its health (bosses 6%). **Fire thaws it** (above). Ends into **Chilled** for 2s. |
| **Bleeding** | Damage over time, worse while moving. | A tick every 0.5s for 3s, as now (4 a tick from crits; talents and relics as now). A tick taken while it is walking a step deals **double**. | Refreshes, keeps the stronger tick. | Undead, golems and machines don't bleed. |
| **Chilled** | Slowed. | Moves and attacks 30% slower for 3s (the king's Frost Nova keeps its 50%). | Refreshes. **Three chills within 4s freeze** it for 1.2s. | Burning puts it out. All the slows in the game (Dirge, Binding Wraps, Undertow, Spike Field, Suppressing Fire, Whip Crack) become Chilled in the rules; only frost sources build towards a freeze (question 2). |
| **Shocked** | Lightning that jumps to a neighbour. | For 3s, every 1s a spark jumps from it to the nearest fighter **of its own side** within 2 tiles: 15% of the shocker's attack, and that one is shocked for 1.5s (a spark never jumps back to where it came from, and a shock passed on does not pass on again). | Refreshes. | **Water:** a shocked fighter standing in water sparks to **every** fighter of its side in water within 3 tiles. The Kraken's Flood and the river layouts become lightning traps. Machines take the sparks at x1.5. |
| **Stunned** | Can't act. | As each source has it today (Shield Bash 1.5s, Thousand Fists 1.5s, Gore Charge 1.5s, Earthquake 1.2s...). | Refreshes (the longer). | The same as now; now it also goes through resists and the boss rules. |
| **Weakened** | Attack cut. | Attack −25% for 4s (the Hex's cut stays as it is). | Refreshes. | — |
| **Cursed** | Healing turned to harm. | For 4s, half of any healing it receives is dealt to it as damage instead, and the other half is lost. The Hex keeps its burn-and-drain as Cursed's tick. | Refreshes. | Holy heroes (Paladin, Cleric, Priestess) take it for half as long. Turns the foes' own healing (the Demon Lord's regrowth, the Lich King's drain, the Shaman King's mending) against them. |
| **Silenced** | No skills. | 3s: no skill or ultimate can be cast; its meters keep filling and its blows carry on. | Refreshes. | A queued ultimate order waits until it ends (it does not lapse while silenced). |
| **Feared** | Runs away briefly. | 1.5s: it walks away from the nearest foe and does not strike; it does not run off the board or into deep water. | Refreshes (the longer). | Undead, golems and machines are fearless. The Samurai Commander's War Banner and the king's Battle Cry end it for the heroes in reach. |

## 3. Who lays them

### Heroes, by element (the 45 heroes)

Heroes that already lay an effect keep it, moved into the model. New riders are small, on a skill (not every blow), so
each hero's power changes little; the knob is the chance and the time.

| Element / trait | Heroes and what they lay |
| --- | --- |
| **Fire: burns** | **Fire Wizard** (Cinders on every blow, as now; Meteor and Armageddon leave burning ground, as now; Wildfire spreads it); **Queen Dragoon** (Dragon Breath and Inferno Breath set alight, as now); **Wanderer** (the firebrew burns); **Dread Pirate** (Powder Keg and the barrels burn); **Great Sage** (Starfall: no change, it is starlight) |
| **Ice: chills or freezes** | No hero is an ice caster today. **Time Witch**'s slows (Temporal Surge) become Chilled; her Time Stop stays its own hold (a stun). Ice comes mostly from the king's spells, the frost relic set and the Kraken (below). (Question 3: a frost hero later?) |
| **Water** | **Kraken Mate**: Undertow and Maelstrom chill; Flood tiles put out burning and make shock spread. |
| **Lightning: shocks** | **Lightning Mage** (Chain Lightning and Thunderstorm shock; Overload's discharge counts its Charged marks as now); **Arc Blade** (Voltage Blink and Thunder Cascade shock); **Static** passives (arcs) stay as they are |
| **Poison** | **Shambler** (Rotting Touch and Plague Tide poison, 2 stacks; was a curse-dot); **Ranger** (Spike Field bleeds as now; the Poisoned Tips talent poisons instead of bleeding); **Mummy**'s Curse of the Pharaoh keeps its curse |
| **Blades: bleed** | **Samurai** and **Mercenary** (Keen Edge and Hired Blade crits bleed, as now); **Werewolf** (the Hunter's bites bleed, as now); **Barbarian** (Whirlwind bleeds); **Kunoichi** (Shadow Step's backstab bleeds); **Buccaneer** (Roll the Bones 10–11 bleeds, as now); **Demon Swordsman** (Hellblade Sweep bleeds) |
| **Dark: curses** | **Warlock** (Hex and Soul Harvest: Cursed, with the burn-and-drain they have now); **Mummy** (Curse of the Pharaoh: Cursed and Chilled); **Shambler**'s Plague Tide (Cursed) |
| **Stun** (moved in, unchanged) | Knight (Shield Bash), Ninja Monk, Minotaur, Juggernaut (held), Arc Blade, Gorgon (stun, and stone), Ranger's snares and net, Buccaneer's hooks, Peasant's braced pikes |
| **Weaken** | **Wolf Bard**'s Dirge song weakens foes near him; **Tyrant**'s Condemn weakens the marked foe |
| **Silence** | **Rifle Bot**'s Suppressing Fire (its "skill stops charging" becomes Silenced); **Ninja Monk**'s Stillness Palm; **Karasu**'s Pilfer (1.5s) |
| **Fear** | **Reaper**: Harvest of Souls fears the foes it does not reap (1.5s); **Werewolf**: Full Moon's howl fears foes within 2; **Tyrant**'s Judgement (1s) |
| No new ailment | Knight's guard, Peasant, Archer (Pinning Shot stays a pin), Kitsune (charm), Yamabushi (wind), Satyr, Samurai Commander, Paladin, Cleric, Druid, Illusionist, Gunslinger, Beastmaster (Whip Crack chills), Lancer, Siege Bot, Priestess, Duchess |

### Foes

| Foes | What they lay |
| --- | --- |
| Imps, Demons, Hell Imps and Demons, Magma Golem, Devil Leader, Nine-Tailed Fox, Cindra, the Forge Titan | **Burning** (Hellborn, Molten Skin, Hellfire, Foxfire as now; the Forge Titan's hammer burns) |
| Skeletons, Bone Archers, Skeleton Marksmen, the Bone Captain | **Poisoned** on 1 blow in 5 (grave-rot), 1 stack |
| Lich King | Soul Nova **freezes** (as now, 1.8s), his bolts **chill** |
| Crystal Golem, Sapphire Colossus | Shard Burst and Shard Storm **freeze** (they hold heroes still now; the hold becomes a freeze, so it can shatter) |
| Fox Witch, Nyssa | Hex: **Cursed**; Nyssa's Venom **poisons** (2 stacks) instead of a curse-dot |
| Calamity's Vorgrath and Karnok (Blight) | **Poisoned** (instead of their curse-dot) |
| Werewolves of the pack, the Alpha, Orc Warlord, Gorrak | **Bleeding** (Ravage bites; Brutal crits as now) |
| Shaman King | Bolts **shock** |
| Oni King | Kanabo Smash **stuns**; a roar that **fears** heroes within 2 (1s), once a fight |
| Gorgons, the Gorgon Queen, Sethra | Petrifying Gaze stuns, as now |
| Ogres, Horned Ogre, Thrum | Horned Shove: no change |

## 4. Terrain

| Ground | Ailment |
| --- | --- |
| **Lava** | Ending a step on it sets the walker **Burning** (3s), in place of half of `LAVA_BURN` (so lava hurts about as much as now). Standing in it keeps `LAVA_STAND`. |
| **Hot coals** (Calamity chaos) | **Burning**, weaker (1.5s). |
| **Swamp water** (shallows in the swamp land) | A step ending in it adds 1 **Poison** stack. Other lands' shallows do not poison. |
| **Ice** | A fighter that stands still on ice (striking or held) is **Chilled** for 1s, renewed each second; walking over it is still quicker, as now. |
| **Shallow and deep water**, the Kraken's Flood | **Put out Burning** on entering. **Shocked** sparks spread through it (section 2). |
| **A shrine** | Cleanses whoever stands on it each second, as well as mending. |
| **Burning ground** (meteor zones), **caltrops** | Burning and Chilled-plus-Bleeding, through the model. |
| **The army road's hazards** (`hazards.ts`) | Lava flares set **Burning**; steam geysers **put out** burning; grasping hands **Chill** (they slow now). |

## 5. The king's spells

| Spell | Ailment |
| --- | --- |
| **Meteor**, **Starfall** (Meteor Shower) | Meteor sets every foe struck **Burning** and leaves burning ground, as now. Starfall: no change. |
| **Frost Nova** | Every foe in the 3x3 **Frozen** for 2s, then **Chilled** to 6s (as now, through the model, so it can shatter). |
| **Deep Freeze** | The sturdiest foe **Frozen** 4s (x1.3 from every blow, as now) and it **shatters** on a heavy blow. |
| **Chain Lightning** | Every foe the bolt reaches is **Shocked**. |
| **Poison Cloud** | Each bite adds a **Poison** stack (it bites today without one). |
| **Hex** | **Cursed** and **Weakened**. |
| **Earthquake** | No new ailment (its hold stays a stun for low foes). |
| **Battle Cry** | Ends **Feared** on every hero. |
| **Cleanse** (exists) | Every hero in the 3x3 loses all ailments, heals 15% (as now), and is **warded** for 2s: no new ailment lands on it (question 6). |

## 6. Resists

Each foe kind and each hero has a short list of what it shrugs off; a blocked ailment shows **"Immune"** over a
crossed-out chip (no damage number changes: the blow itself still lands). A pure table in `src/sim/ailmentResists.ts`,
read by `applyAilment`.

| Type | Immune to | Takes for half as long |
| --- | --- | --- |
| **Fire beings**: Imps, Demons, the Demon Lord, the Devil Leader, the Magma Golem, the Forge Titan, Cindra, the Nine-Tailed Fox; the Queen Dragoon (Dragon Scales) | Burning | Chilled, Frozen |
| **Undead**: skeletons, the Bone Captain, the Lich King, wraiths; the Shambler, Mummy, Reaper and Dread Pirate | Poisoned, Bleeding, Feared | — |
| **Golems** (stone, iron, crystal, magma, the Colossus, the Titan) | Poisoned, Bleeding, Feared | Stunned |
| **Machines**: Rifle Bot, Siege Bot, Arc Blade, Juggernaut | Poisoned, Bleeding, Feared | — (but Shocked sparks hit them x1.5) |
| **Frost creatures**: the Crystal Golem, the Sapphire Colossus, the Lich King, the White Werewolf | Frozen, Chilled | — |
| **Holy**: Paladin, Cleric, Priestess | — | Cursed, Feared |
| **Treants** and the Druid's Treeform | Bleeding | — (they burn for 1.5x as long) |
| Summoned decoys and the Commander's Standard | everything (they are not alive) | — |

**Bosses** (any `isBoss` foe, the Calamity's bosses, and a mid-boss of an army band):

- Every ailment lasts **half as long** on a boss; damage ticks are unchanged (a burn still burns).
- **Hard control** (Frozen, Stunned, Feared, Silenced, and the existing charm and pins) has **diminishing returns**:
  the first lasts its half time, a second within 10s of the first lasts a quarter, a third an eighth, then the boss is
  **immune to hard control for 10s** ("Immune" shows). The ladder resets 10s after the last one ends.
- A boss **cannot be Feared** at all (it would make boss fights silly), and a frozen boss **shatters** for 6% of its
  health at most.
- The Last Stand's king is never given an ailment by his own side (he is the objective).

## 7. How it shows

The prototype draws all of this today; phase B moves it into the real renderer.

- **Body effect** (`src/render/statusStyles.ts`): each ailment is a few parts placed like the class auras' parts:
  **ground** (a ring or pool under the feet, behind), **back** (behind the body), **front** (over the body, kept open),
  **halo** (just over the head), **motes** (small pieces drifting round it) and, for the freeze only, a one-off
  **burst** (the shatter). The fighter is tinted by its first ailment (orange burning, pale green poisoned, ice blue
  frozen...). The two most recent ailments draw their parts; the rest show as chips only.
- **Icons:** a row of small round chips just over the health bar, one per ailment held (up to four), each a dark disc
  with the ailment's coloured rim and its icon. They replace today's single badge over the left shoulder.
- **Numbers** (`fx.ts`, `number`): a damage tick is drawn in its ailment's colour, at the small size: burning orange
  `#ff9a3c`, poison green `#8fe05a`, frozen ice `#9fe6ff`, bleeding red `#ff5a4e`, shock yellow `#fff27a`, curse violet
  `#c07aff`. A shatter is a big ice-white `#bff0ff` number under "SHATTER". "Immune" is a pale word with the crossed
  chip. Blows stay white (gold for heavy) as now; the hero-hurt red stays for ordinary blows on heroes.
- **The art seam** (as the class auras): every part's frames come from `src/art/fx/status/atlas.png` with its JSON map
  (`statusArt.ts`), so painted sheets drop in with no code change. `tools/status-fx/status-sheets.py` builds it from
  the pack (today), `tools/status-fx/import-status-art.py` from painted sheets; the brief is
  [status-fx-art-brief.md](status-fx-art-brief.md).
- **Sound** (phase B): a soft cue per ailment as it lands (sizzle, bubble, crack, shatter), through `soundRules.ts`.

## 8. Reduced motion and battery saver

- **Reduced motion:** every part holds its first frame and stays put (motes stop where they are); nothing blinks off.
  The shatter's burst shows one still frame that fades out over 0.4s instead of flying apart. The chips never move.
  Numbers rise as they do now.
- **Battery saver:** one ailment's body parts per fighter instead of two, and the parts marked † in the table are left
  out (every ailment keeps at least one part: a test checks it). Chips and numbers stay (they are the information).
  Damage-over-time numbers on the saver are summed and shown once a second rather than every tick.
- **No allocation per frame:** the parts' sprites are made when an ailment lands and reused; they only change frame and
  position after that (the prototype rebuilds on a change, which is fine for mock-ups only).
- **No flashing:** parts loop smoothly; a shatter is a one-off burst; nothing disappears and comes back.

## 9. Balance

More damage and more control change fights, so phase B is measured against every guard the game has:

1. **Step one keeps every number.** Moving today's effects into the model changes no outcome: the replay test (fixed
   seeds for an army wave, a daily, the spire, the Calamity and a Last Stand wave, event logs equal) proves it before
   anything new goes in.
2. **New riders are small and tuned by one table.** Each new source has a chance and a time in one data table
   (`ailmentSources.ts`). The aim is that ailments add about 3 to 6% to a hero's damage and that no hero gains more than
   about 3 points of win rate from its rider; the riders go mostly on skills (which come round every few seconds), not
   on every blow.
3. **The hero parity test** (`hero-balance.test.ts`: every hero within 6 points of the roster average) and
   `hero-balance-ultimates.test.ts` run with `AILMENTS_ON`. A hero that moves out of band is tuned by its rider's chance
   first, then by its `TUNE1`/`TUNE2` knob in `kits/table.ts` (the existing knob), never by loosening the test.
4. **The army pace** (`army-pace.test.ts`, `npm run balance -- --no-tables --deep`): the foes' new ailments make waves
   harder and the heroes' make them easier; the two are set to roughly cancel, then the foes' chances are tuned until
   each tier's clear rate is back inside its target band.
5. **The Last Stand pace** (`stand.test.ts`, `npm run stand-balance`): the Stand's long fights let poison and burning
   stack up more; its foes' rider chances carry a Stand multiplier (as `ULT_FILL.STAND` does for the meter) if the pace
   drifts.
6. **The daily rates** (`npm run daily-rate`, `daily.test.ts`): checked last; the daily's boss of the day falls under
   the boss rules.
7. **Bosses** keep their walls: half-length ailments, diminishing control and a capped shatter mean the boss stages and
   the Calamity's bosses are not trivialised by stacking control.

If an existing test's target has to move because the owner's new rule changes a fight (for example, the Shambler's rot
becoming poison), the change is named in the phase B note with the before and after numbers.

## 10. Questions for the owner (each with my recommendation)

1. **The numbers in section 2** (burn 3s at 12% of attack a tick; poison 5 stacks, each −10% healing; frozen 1.5s,
   x1.3 damage, shatter for half the blow capped at 20% of health; bleed doubled while walking; chill −30%; shock sparks
   once a second; weak −25%; curse turns half of healing into harm; silence 3s; fear 1.5s)? *Recommend: yes, as a
   starting point the balance pass tunes.*
2. **Every slow becomes Chilled?** The game has many slows (Dirge, wraps, undertow, caltrops, suppressing fire, whip
   crack). *Recommend: yes, one "Chilled" ailment and look for all of them, but only frost sources (the king's frost,
   the Lich King, frost golems, the frost relics) build up to a freeze.*
3. **A frost hero?** No hero lays ice today; the ice comes from the king's spells, foes and relics. *Recommend: not in
   this task; the system makes one easy to add later.*
4. **Cursed, healing turned to harm:** fully reversed is very strong against the heroes (the Fox Witch and Nyssa hex
   heroes). *Recommend: half the healing turned to harm, the other half lost, 4s.*
5. **Bosses:** half-length ailments, diminishing returns on hard control (1/2, 1/4, 1/8, then 10s immune), never
   feared, shatter capped at 6%. *Recommend: as written.*
6. **Cleanse also wards** the heroes for 2s, so it is worth casting before a big curse or a freeze lands? *Recommend:
   yes.*
7. **The chips replace the single shoulder badge** (which shows haste and charm too today)? *Recommend: yes, chips for
   ailments only; haste and charm keep their body looks (the wind and the heart) and lose the badge.*
8. **Poison from skeletons** (1 blow in 5) makes the undead army a little harder. *Recommend: yes, with the army pace
   re-tuned.*
9. **Swamp water poisons; ice chills only those standing still on it** (walking over ice stays quick, as now).
   *Recommend: yes.*
10. **The art:** the placeholders stay in the game until the painted sheets come; the brief asks for 35 parts in 11
    sheets at 256px cells. *Recommend: phase B ships with the placeholders, and the painted art drops in with one command
    whenever it is ready.*

## Files (phase A)

- `src/render/statusStyles.ts`: the look table (`STATUS_STYLES`, `AILMENTS`, `STATUS_KEYS`, `IMMUNE_COLOUR`,
  `SHATTER_COLOUR`, `maxBodyFx`, `MAX_CHIPS`). Pure.
- `src/render/statusArt.ts`: the atlas (`STATUS_CELL`, `STATUS_PIXEL`, `statusFrames`, `loadStatusArt`).
- `src/render/statusMock.ts`: the prototype (`statusMockHook`, `window.__statusMock`); nothing calls it but the
  console and the shot script. Phase B replaces it.
- `src/render/unitView.ts`: one line at the end of `UnitSprite.update` (the prototype's hook) and its import.
- `src/art/fx/status/atlas.png` + `atlas.json`: the placeholder atlas (35 parts, 33 pack strips, 19 KB; credited with
  the rest of the 5000 Pixel Effects pack).
- `tools/status-fx/status-pack.json` (the key-to-strip map, in the importer's order), `status-sheets.py`,
  `import-status-art.py`, `shots.mjs`, `sheet.py`.
- `test/status-fx-art.test.ts`: every ailment has a body part, an icon and (for the damaging ones) a distinct number
  colour; the saver keeps a part of each; the atlas has every key; the importer's order is the table's.
- `docs/samples/status-fx-*.png`: the four mock-ups.
