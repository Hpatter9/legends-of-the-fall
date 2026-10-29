# RPG spells for every hero (design, for the owner to approve)

> **Status: design only.** Nothing in the game has changed yet. Once the owner approves (or changes) what is below, it is built in
> the batches at the end, each measured for balance before the next.

The owner's ask: "Do any of the heros have a revive spell? I really want the skills to feel like typical rpg spells and skills. Or
even spells and skills pulled from bauldures gate 4. There are so many options to pull from to make the game feel unique and
amazing". The owner chose: rework all 45 heroes; every healer can revive; new looks and sounds for the signature spells later.

Today only one hero can raise the fallen: the High Priestess's ultimate, Resurrection (level 30). A few talents and the Phoenix
Feather let a hero get up once when it would fall, but no healer can raise a friend who is already down.

## 1. The approach

**Rename, retheme, and nudge only a few rules.** Every hero keeps its two skills, its ultimate and what each one does, so each hero
plays the same part in a fight and the balance stays almost where it is. Each skill gets the name of the classic RPG spell or
martial move it already plays like (the Fire Wizard's Meteor is a Fireball; the Paladin's Martyr's Vow is Warding Bond; the High
Priestess's Guardian Angel is Death Ward). Where the classic spell does a little more than the skill does now, the skill gains that
small piece (Divine Smite gains its smite; Second Wind heals). That adds up to:

- **93 of the 135 skills get a new name.** The other **42 keep their name** because it is already a classic of the genre (Whirlwind,
  Smoke Bomb, Mirror Image, Chain Lightning, Time Stop, Iaido...). They still get the new look and sound.
- **Every healer can revive** (section 2): the Cleric, the High Priestess, the Wanderer and the Druid.
- **Five small rule nudges** to existing skills (each named where it comes up, and listed in section 9).
- **Two new mechanics:** a revive on a healer's skill 2, and Mass Polymorph (the Kitsune's new ultimate).
- **One change behind the scenes:** each skill gets a fixed key that never changes, so that renaming it does not break its painting,
  sound, ailment rider or AI check (section 8).

**The names.** They come from the vocabulary that D&D and most RPGs share (Fireball, Magic Missile, Cure Wounds, Revivify, Hold
Person, Bane, Hunter's Mark, Sneak Attack, Flurry of Blows, Rage, Wild Shape...). No name is unique to Baldur's Gate or to any one
game, so the Dragoon's "Jump" becomes Dragon Dive and the Buccaneer's "Roll the Bones" becomes Loaded Dice. Each hero keeps its
fantasy: the Samurai keeps sword techniques, the monsters keep monstrous attacks, the bots keep tech. British spelling throughout.

**Clashes with the king's spells** (`src/sim/spells.ts`). Hero skills that are now called Meteor, Earthquake, Smite and Hex are
renamed (to Fireball, Earth Tremor, Guiding Bolt and Eldritch Blast), so each of those names belongs to the king alone. Two hero names
stay close to a king's spell, and each plays differently:
- The Lightning Mage's **Chain Lightning** starts from her target, runs through up to five foes and marks them Charged. The king's
  Chain Lightning is cast on a tapped 3x3 and jumps three times.
- The High Priestess's **Resurrection** (her revive) is cast on its own, raises the nearest fallen hero at 30% health and can be cast
  once in 30 s. The king's **Resurrect** raises a fallen hero in a tapped 3x3 at half health.

## 2. The revive (the rules)

**Who:** the four healers: the Cleric (**Revivify**), the High Priestess (**Resurrection**), the Wanderer (**Elixir of Life**) and the
Druid (**Reincarnate**). The High Priestess's ultimate becomes **Mass Resurrection** and raises up to three.

**On which skill:** skill 2, from level 10, as a **second face** of that skill. Skill 2 keeps its usual effect (Prayer of Healing,
Death Ward, Healing Mist, Wild Shape). When a placed hero lies fallen and the healer's revive is ready, the healer casts skill 2 as
its revive instead. That way no healer loses a skill, the healer's own pool pays for the revive, and in fights where nobody falls,
skill 2 is still useful. The skill's pip on the hero bar shows an ankh while the revive face is ready and someone is down.

**The rules:**

| Rule | Value | Why |
| --- | --- | --- |
| Opens at | Level 10, with skill 2 | Early fights (the first army, the starter packs) keep their losses |
| Cost | Skill 2's cost + 20 (80 of the 100 mana) | One revive empties most of the pool, so the healer stops healing for a while |
| Cast | 1.2 s, cannot be cut short; the healer's turn is spent | It can be seen coming, and it costs the team the healer's heals |
| Whom | The fallen placed hero nearest the healer, anywhere on the field (ties: the one that fell first, then the lower id) | Deterministic, and no walking to a body |
| Health | Rises at **30%** of its health, cleansed | Back in the fight, but fragile |
| Pool and meter | Its pool starts at its fight-start amount; its ultimate meter is emptied | A raised hero does not come back with a ready ultimate |
| Getting up | Busy and cannot be targeted for 1 s while it gets up (the heart revive's `getUp` animation, `RISE_MS` 720 ms, with a little to spare) | It is not cut down again while it rises |
| Cooldown | **30 s** for each healer's revive face (its own clock), ready at the start of a fight | About once in an ordinary wave, twice in a long boss fight |
| Once per ally per wave | A hero raised once in a wave (by any healer's skill or by Mass Resurrection) stays down if it falls again | A loss still costs |
| Team cap | At most **2 skill revives a wave** across all healers; Mass Resurrection is outside the cap, but each ally can still be raised only once a wave | Two healers cannot keep a team standing for ever |
| Never | Summons, wraiths, the Standard, the Duchess or the Last Stand's king; nobody when the fight is already lost (no healer stands) | |
| The meter | Health given back by a revive does not fill the healer's ultimate meter | The High Priestess cannot use revives to charge Mass Resurrection |
| The Last Stand | **No revives** there, as now (the fallen stay down for the run, STAND-003). Neither the revive face nor Mass Resurrection raises anyone; the pip shows no ankh | The owner made the Last Stand a run that wears down. *A question for the owner (section 10).* |

**How it fits with what is already there:**
- **Get-up animation:** the sim pushes a new `revive` event (`by`, `to`, `hp`), as well as the usual `heal` for the number. The page
  plays the same `getUp()` as the heart revive, with the healer's own light on top (section 6). Another worker is redoing the revive
  look now; the revive event is the hook for theirs.
- **Things that stop a death** (the Phoenix Feather relic, a rising feather, the talents' "rises at 30%", the Dread Pirate's
  Deathless, Death Ward, Rage) are unchanged. They stop a fall, and do not count as a revive.
- **A heart's revive** (`reviveParty`, when the whole party has fallen) is unchanged, and does not reset the once-a-wave marks.
- **Waves:** an army wave, a daily wave, a spire floor and a Calamity fight are each their own battle, so "a wave" is that battle (a
  `raised` set on the battle; new fields are optional, so old saves load).
- **The AI:** the revive face is an emergency (`Slot.emergency`): it goes before anything but a queued ultimate, as the heals do
  now.
- **Determinism:** no randomness. The target is chosen in a fixed order, and the cooldown and marks are plain numbers on the healer
  and the battle.

**Asked for, and the reason for each limit:** revives should be common for healers without making losses trivial. A team with a
healer gets about one second chance a wave, at 30% health. It can never undo the same fall twice, and two healers cannot chain
revives past two.

## 3. The heroes

How to read the tables: **1** is skill 1 (from level 1), **2** is skill 2 (from level 10), **U** is the ultimate (level 30).
"(kept)" means the name is already a classic and stays. "Was" gives today's name. Unless a row says otherwise, what a skill does is
exactly what it does today, and its cost, gap and strength (`TUNE1`/`TUNE2`/ult `TUNE`) are unchanged. *Nudge* marks a rule change
and *New* marks a new mechanic. Stamina (st) and mana are each hero's pool. A gap is the shortest time between two casts (mana 5 s
and stamina 3 s, unless one is given).

**Tier skills** (grade 2, 3 and 4) improve skill 1, except for the Cleric and the Wanderer, where they improve skill 2 (their old
skill). Each hero's line gives the tier names: renamed where the old names spoke of the old skill, kept where they still fit.

### 3.1 Tanks

| Hero | | New name (was) | Inspiration | What it does | Cost |
| --- | --- | --- | --- | --- | --- |
| **Kwame · Knight** | 1 | **Shield Wall** (kept) | the fighter's guard | The foes near him turn on him, and he takes half damage for 4 s; cast at once when he falls under 30% | 30 st, 11 s |
| | 2 | **Second Wind** (Shield Bash) | the fighter's Second Wind | The strongest foe beside him is bashed (stunned 1.5 s, shoved a tile) and he catches his breath: *Nudge:* heals 12% of his health | 40 st |
| | U | **Indomitable** (Last Bastion) | the fighter who will not fall | Every foe within 5 must go for him for 6 s; he takes half damage, and a shield of a quarter of his health forms | meter |
| | T | Tiers kept: Iron Wall · Fortress · Unbreakable Bastion | | | |
| **Karim · Paladin** | 1 | **Divine Smite** (Holy Challenge) | the paladin's smite | *Nudge:* a radiant blow on the foe before him (about 1.2x attack; undead and fiends take half as much again). Then, as now, the foes within 3 must attack him for 3 s, and the allies beside him are healed | 40 mana |
| | 2 | **Warding Bond** (Martyr's Vow) | the spell that shares wounds | For 5 s, half of what his friends within 3 would take is dealt to him instead | 60 mana |
| | U | **Holy Nova** (Divine Aegis) | a burst of holy light | The foes within 4 are struck and must go for him for 5 s; the allies near him are healed and shielded | meter |
| | T | Searing Smite · Blinding Smite · Banishing Smite (were Righteous Challenge · Crusader's Oath · Holy Vanguard) | | | |
| **Minh · Peasant** | 1 | **Phalanx** (Hold the Line) | the shield formation | Allies within 2 take half damage for 3 s | 30 st |
| | 2 | **Spear Wall** (Brace Spears) | pikes set against a charge | Pikes on the three tiles in front of him for 5 s: a foe that steps on one is struck and stopped | 40 st |
| | U | **Call to Arms** (Mass Muster) | the village rises | Every ally closes ranks and takes half damage for 6 s, and a sixth of their health comes back | meter |
| | T | Tight Phalanx · Shield Phalanx · Uprising (were Hold Harder · Rally the Village · Uprising) | | | |
| **Kerem · Juggernaut** | 1 | **Earth Tremor** (Earthquake) | the earth spell (renamed: Earthquake is the king's) | Every foe within 3 is hurt and held still for 1.2 s | 30 st |
| | 2 | **Wall of Stone** (Raise Rampart) | the classic wall spell | The three tiles in front of him rise into a wall for 10 s that foes must walk round; the foes beside it are struck and held | 45 st |
| | U | **Fissure** (Cataclysm) | the ground torn open | The ground splits: every foe within 6 is hurt hard (2.2x) and held still for 2 s | meter |
| | T | Greater Tremor · Seismic Wave · Earthshatter (were Heavier Quake · Titan Quake · Earthshatter) | | | |

### 3.2 Melee

| Hero | | New name (was) | Inspiration | What it does | Cost |
| --- | --- | --- | --- | --- | --- |
| **Kenji · Samurai** | 1 | **Iaido** (kept) | the quick-draw cut | Dashes up to 4 tiles in a line, cutting every foe on it | 30 st |
| | 2 | **Riposte** (Parry Stance) | the parry and answer | For 2.5 s, every melee blow on him is parried and answered with a cut | 40 st |
| | U | **Issen** (Heaven-Splitting Cut) | the "one cut" of the sword saints | Dashes up to 7 tiles in a line, cutting every foe on it with a huge blow (3x) | meter |
| | T | Tiers kept: Twin Iaido · Moon Cut · Sword Saint | | | |
| **Ayame · Kunoichi** | 1 | **Sneak Attack** (Shadow Step) | the rogue's strike from behind | Slips behind the weakest foe and backstabs it; it bleeds | 25 st |
| | 2 | **Smoke Bomb** (kept) | | She cannot be targeted for 2 s; foes in the smoke miss half their blows for 3 s, and her next blow crits; cast at once when she is in trouble | 40 st |
| | U | **Assassinate** (Shadow Dance) | the assassin's work | Slips behind the four weakest foes in turn and backstabs each (1.4x); each bleeds | meter |
| | T | Tiers kept: Fading Step · Thousand Shadows · Night Without End | | | |
| **Jiro · Ninja Monk** | 1 | **Flurry of Blows** (Thousand Fists) | the monk's flurry | Three quick strikes on one foe, who is stunned for 1.5 s | 25 st |
| | 2 | **Quivering Palm** (Stillness Palm) | the monk's deadly touch | Spends his Flow (a stack for each blow on the same foe, up to five) in one palm; the foe loses skill charge and is silenced for 2 s | 40 st |
| | U | **Hundred-Hand Strike** (Hundred Fists) | the hundred-hand technique | Five blows on each of the three nearest foes, and each is stunned for 1.2 s | meter |
| | T | Swift Flurry · Flurry of the Tiger · Endless Flurry (were Fourth Fist · Fifth Fist · Hundred Fists) | | | |
| **Eirik · Barbarian** | 1 | **Whirlwind** (kept) | | Cuts every foe in the 3x3 around him; they bleed | 30 st |
| | 2 | **Rage** (Blood Fury) | the barbarian's Rage | Paid with a tenth of his health: for 4 s his blows come 30% faster and drink an eighth, and he cannot fall below 1 health | 25 st + 10% health, 14 s |
| | U | **Berserker Rage** (Bloodlust) | the berserker's frenzy | A whirl of blows round him; he drinks a third of what they deal and runs fast for 5 s | meter |
| | T | Tiers kept: Wide Whirl · Cyclone · Worldbreaker | | | |
| **Kian · Mercenary** | 1 | **Ambush** (Bounty Hunt) | the hired blade's strike | Slips beside the strongest foe and cuts it for nearly double | 30 st |
| | 2 | **Hunter's Mark** (Mark for Coin) | the hunter's quarry spell | Throws a blade at the strongest foe and marks it for 10 s: every hero deals a quarter more to it; if it dies marked he heals and his stamina fills | 40 st |
| | U | **Killing Spree** (Contract Killer) | a run of kills | Slips beside the three hardest-hitting foes in turn and cuts each hard (2.1x) | meter |
| | T | Deadly Ambush · Ambush from the Shadows · King's Ransom (were Bigger Bounty · Gold Rush · King's Ransom) | | | |
| **Bataar · Lancer** | 1 | **Charge** (Lance Charge) | the cavalry charge | Charges up to 5 tiles at a foe for more than double, then rides faster for 3 s | 30 st |
| | 2 | **Disengage** (Wheel About) | pulling clear of the melee | Rides up to 3 tiles clear of the melee and gains full Momentum (his next blow +50%) | 40 st |
| | U | **Cavalry Charge** (Charge of the Knights) | the great charge | A long charge for a huge blow, and the riders near him gallop faster for 4 s | meter |
| | T | Tiers kept: Longer Charge · Knight's Charge · Thunder of Hooves | | | |
| **Minjun · Arc Blade** | 1 | **Thunder Step** (Voltage Blink) | the teleport with a thunderclap | Blinks beside the thickest knot of foes and discharges: the 3x3 is hurt, shocked and held for 1 s | 30 st |
| | 2 | **Thunderwave** (Grounding) | the wave of thunder | Lets go what he stored (30% of the damage he took) as a wave round him, and heals a tenth; *Nudge:* the foes beside him are shoved back a tile (the Wind Gust's shove) | 40 st |
| | U | **Lightning Storm** (Thunder Cascade) | the storm called down | Lightning leaps to every foe within 6, hurting and stunning each for 1.4 s | meter |
| | T | Thunder Stride · Storm Step · Tempest Step (were Live Wire · Storm Blink · Tempest Blade) | | | |
| **Aram · Demon Swordsman** | 1 | **Cleave** (Hellblade Sweep) | the great cleaving blow | Cuts every foe within 2; they bleed, and he drinks a third of what it deals | 30 st |
| | 2 | **Blood Pact** (Blood Price) | the pact paid in blood | Paid with 15% of his health: his next three blows deal 60% more and drink 30% | 25 st + 15% health, 8 s |
| | U | **Metamorphosis** (Demon Form) | the change into a demon | For 7 s he hits half as hard again, and a fifth of his health comes back | meter |
| | T | Great Cleave · Infernal Cleave · Hellblade (were Wider Sweep · Demon Sweep · Hellblade) | | | |
| **Tiago · Buccaneer** | 1 | **Grappling Hook** (kept) | | Yanks the nearest shooter (or foe) in beside him, cuts it and holds it for 1 s | 30 st |
| | 2 | **Loaded Dice** (Roll the Bones) | the gambler's dice | Two dice: 2-4, a weak cut and he is slowed; 5-9, x1.6; 10-11, x2.2 and a bleed; doubles or 12, x3 and every friend hastened | 40 st, 10 s |
| | U | **Keelhaul** (kept) | | Hooks the three nearest shooters (or foes) in beside him; each cut is a roll of the die (x1 to x3), and each is held 1.5 s | meter |
| | T | Tiers kept: Longer Hook · Boarding Party · Sack of the Coast | | | |
| **Tiziri · Queen Dragoon** | 1 | **Dragon Breath** (kept) | | Fire down the line with the most foes, hurting each and setting it alight | 35 st |
| | 2 | **Dragon Dive** (Jump) | the dragoon's leap (renamed: "Jump" is one game's own) | She leaps out of the fight and lands on the thickest crowd: double on her mark, and the 3x3 struck and held | 45 st |
| | U | **Inferno Breath** (kept) | | Fire down the longest line of foes, up to 8 tiles, burning each for 5 s | meter |
| | T | Tiers kept: Longer Breath · Dragonfire · Wyrmqueen's Breath | | | |

### 3.3 Ranged

| Hero | | New name (was) | Inspiration | What it does | Cost |
| --- | --- | --- | --- | --- | --- |
| **Natsu · Archer** | 1 | **Volley** (kept) | | Arrows rain on a 3x3 | 30 st |
| | 2 | **Aimed Shot** (Pinning Shot) | the sniper's careful shot | The farthest foe in reach is pinned for 2 s and takes a quarter more from shots for 4 s | 40 st |
| | U | **Hail of Arrows** (Arrow Storm) | the sky full of arrows | Five volleys fall on separate crowds across the field (1.6x each) | meter |
| | T | Tiers kept: Double Volley · Rain of Arrows · Sky Darkened | | | |
| **Inti · Ranger** | 1 | **Snare** (Snare Trap) | the hunter's snare | Lays two traps on the tiles foes will step on; the first to spring one is hurt and held for 2 s | 30 st, 9 s |
| | 2 | **Spike Growth** (Spike Field) | the field of thorns | Caltrops on the 3x3 round the nearest foe for 6 s: whoever stands in it is slowed and bleeds | 45 st |
| | U | **Entangle** (Hunter's Net) | the vines that hold | Vines hurt every foe in sight within 8 and hold each for 2.2 s; each takes a third more from every blow for 6 s | meter |
| | T | Tiers kept: Third Snare · Fourth Snare · Hunter's Maze | | | |
| **Maeve · Gunslinger** | 1 | **Piercing Shot** (Dead Eye) | the shot through the line | One slug through every foe in a line, for more than double | 35 st |
| | 2 | **Fan the Hammer** (kept) | | Three fast shots at the nearest foe in reach, then a long reload | 45 st |
| | U | **High Noon** (kept) | | Six shots at the hardest-hitting foes in reach (2.6x each) | meter |
| | T | Steady Aim · Through and Through · Lightning Draw (were Long Eye · Dead Eye Deluxe · High Noon) | | | |
| **Rook-7 · Rifle Bot** | 1 | **Rapid Shot** (Burst Fire) | the rapid-fire feat | Three rapid shots at the weakest foe in reach | 30 st |
| | 2 | **Suppressing Fire** (kept) | | Fire on the three-wide lane with most foes: each is struck, slowed for 3 s and silenced for 2 s, and its skill stops charging | 45 st |
| | U | **Overclock** (kept) | | Hits half as hard again and shoots faster for 7 s, and fires four shots at the weakest foe | meter |
| | T | Tiers kept: Fourth Round · Full Magazine · Bullet Storm | | | |
| **Bastion · Siege Bot** | 1 | **Bombard** (Shell Barrage) | the siege engine's bombardment | A heavy shell bursts on the thickest crowd within 7 | 35 st |
| | 2 | **Siege Mode** (kept) | | Anchors for 8 s: cannot walk, reaches two further, and its shells splash and come faster | 40 st |
| | U | **Orbital Strike** (kept) | | A great shell on the thickest crowd, and a second on the same spot a moment after | meter |
| | T | Tiers kept: Heavier Shell · Twin Shells · Siege Breaker | | | |
| **Harrow · Dread Pirate** | 1 | **Cannonade** (Broadside) | the ghost ship's guns | A ghost ship's guns fall on a 3x3 | 35 st |
| | 2 | **Powder Keg** (kept) | | Rolls a keg to the thickest crowd; it bursts on a 3x3, sets the foes alight, and sets off every powder barrel and keg within 2 | 45 st |
| | U | **Ghost Fleet** (kept) | | Three broadsides from the ghost fleet fall on separate crowds and set off the powder barrels there | meter |
| | T | Double Cannonade · Ghost Armada · The Drowned Fleet (were Double Broadside · Ghost Armada · The Drowned Fleet) | | | |

### 3.4 Casters

| Hero | | New name (was) | Inspiration | What it does | Cost |
| --- | --- | --- | --- | --- | --- |
| **Ravi · Fire Wizard** | 1 | **Fireball** (Meteor) | the classic Fireball (renamed: Meteor is the king's) | A ball of fire flies to the thickest 3x3 and bursts, leaving it burning | 50 mana, 7 s |
| | 2 | **Conflagration** (Wildfire) | the fire that spreads | Every burning foe erupts: its 3x3 is hurt and set alight, so fire runs through a pack | 55 mana |
| | U | **Meteor Swarm** (Armageddon) | the great meteor spell | Three meteors fall on separate crowds (2.6x each), each leaving the ground burning | meter |
| | T | Greater Fireball · Delayed Blast Fireball · Fireball Barrage (were Twin Meteor · Meteor Shower · Cataclysm; Meteor Shower is a king's spell) | | | |
| **Malia · Lightning Mage** | 1 | **Chain Lightning** (kept) | | A bolt jumps through up to five foes, weaker each time; each is Charged and shocked (plays differently from the king's) | 45 mana |
| | 2 | **Storm Surge** (Overload) | the gathered storm let go | Every Charged foe discharges: hurt, stunned for 0.8 s, and the bolt arcs to a foe beside it | 55 mana |
| | U | **Call Lightning** (Thunderstorm) | the storm called down | Bolts strike the six toughest foes within 8, each stunned for 0.8 s | meter |
| | T | Tiers kept: Forked Chain · Storm Chain · Thunder Throne | | | |
| **Zofia · Warlock** | 1 | **Eldritch Blast** (Hex) | the warlock's beams of dark force (Hex is the king's) | Three beams of dark force at the three toughest foes in reach; each is hexed and burns for 5 s, and he drinks 60% of it | 45 mana |
| | 2 | **Drain Life** (Soul Siphon) | the life-drinking channel | Channels 2 s on the weakest foe in reach, draining it; what he drains heals his most hurt friend | 60 mana |
| | U | **Circle of Death** (Soul Harvest) | the ring of necrotic death | Every foe within 7 is cursed and burns for 6 s; he drinks from each | meter |
| | T | Agonising Blast · Eldritch Barrage · Abyssal Blast (were Deep Hex · Doom · Abyssal Doom) | | | |
| **Seydou · Great Sage** | 1 | **Magic Missile** (Starfall) | the wizard's first spell | Three darts of force streak to up to three separate crowds and burst there (the damage and timing of Starfall; the look changes from falling stars to darts) | 50 mana |
| | 2 | **Font of Magic** (Font of Wisdom) | the sorcerer's font | Every friend within 4 gains 25 mana or 15 stamina | 55 mana, 8 s |
| | U | **Arcane Surge** (Astral Convergence) | raw magic poured out | Every ally's pool fills by half, and an arcane shield forms round it for 4 s | meter |
| | T | Empowered Missile · Twinned Missile · Missile Storm (were Fourth Star · Constellation · Heavens Unbound) | | | |
| **Adaeze · Time Witch** | 1 | **Slow** (Temporal Surge) | the Slow spell, with a haste for her friends | The foes within 4 are slowed for 4 s, and her friends within 3 are hastened for 4 s | 45 mana, 9 s |
| | 2 | **Rewind** (kept) | | The friend that lost most in the last 4 s goes back: its health, its tile, and its new ailments gone | 60 mana, 10 s |
| | U | **Time Stop** (kept) | | Every foe within 8 is stopped where it stands for 2.6 s, while her friends are hastened for 5 s | meter |
| | T | Mass Slow · Time Loop · Eternity (were Longer Surge · Time Loop · Eternity) | | | |
| **Luana · Illusionist** | 1 | **Mirror Image** (kept) | | Slips away, leaving two decoys that draw the foes nearby for 3 s; cast at once when she is in trouble | 50 mana, 14 s |
| | 2 | **Dimension Door** (Trade Places) | the door that takes a friend along | The friend in most trouble steps through a door to a safe tile, and a decoy takes its place | 70 mana, 15 s |
| | U | **Hall of Mirrors** (kept) | | Four decoys appear round her, and every foe within 6 turns on them for 4.5 s | meter |
| | T | Tiers kept: Longer Mirage · Hall of Illusions · Infinite Reflections | | | |

### 3.5 Healers (each has the revive of section 2 on skill 2)

| Hero | | New name (was) | Inspiration | What it does | Cost |
| --- | --- | --- | --- | --- | --- |
| **Selam · Cleric** | 1 | **Guiding Bolt** (Smite) | the cleric's bolt of light (Smite is the king's) | A bolt of holy light at a foe in reach; her friends within 2 of it are healed by what it dealt | 40 mana |
| | 2 | **Prayer of Healing** (Benediction) | the healing prayer | Cleanses every ally and heals them each second for 5 s (when some are hurt); cast at once when a friend is under 35% | 60 mana |
| | 2R | **Revivify** (*New*) | the revive spell | The revive face (section 2): the nearest fallen hero rises at 30% health | 80 mana, 30 s |
| | U | **Mass Heal** (Divine Intervention) | the great heal | Every ally is cleansed, healed, shielded and mended over 5 s | meter |
| | T | On Prayer of Healing: Greater Prayer · Prayer of Miracles · Saint's Prayer (were Warm Benediction · Miracle · Saint's Grace) | | | |
| **Linnea · High Priestess** | 1 | **Cure Wounds** (Holy Light) | the classic healing spell | A great light heals the worst hurt ally and cleanses it; allies near it are healed too; cast at once when a friend is under 35% | 45 mana |
| | 2 | **Death Ward** (Guardian Angel) | the ward against death | The friend most at risk is watched for 4 s: the first blow that would fell it leaves it at 1 health and heals it 30% | 60 mana, 12 s |
| | 2R | **Resurrection** (*New*) | the raising of the dead | The revive face: the nearest fallen hero rises at 30% health (it plays differently from the king's Resurrect, section 1) | 80 mana, 30 s |
| | U | **Mass Resurrection** (Resurrection) | the raising of many | *Nudge:* up to **three** fallen heroes (was two) rise with **40%** of their health (was 50%), and every ally is healed and cleansed. Each ally only once a wave; none in the Last Stand | meter |
| | T | Greater Cure Wounds · Mass Cure Wounds · Celestial Choir (were Brighter Light · Holy Radiance · Celestial Choir) | | | |
| **Rhys · Wanderer** | 1 | **Healing Draught** (Flask Toss) | the alchemist's potions | A healing draught (a quarter of its health) for a badly hurt friend; with none, Alchemist's Fire on the thickest 3x3 | 40 mana, 7 s |
| | 2 | **Healing Mist** (Sanctuary) | the alchemist's healing vapour | Heals every ally and shields them for 2 s (when some are hurt); cast at once when a friend is under 35% | 60 mana |
| | 2R | **Elixir of Life** (*New*) | the alchemist's great work | The revive face: a vial poured on the nearest fallen hero, who rises at 30% health | 80 mana, 30 s |
| | U | **Panacea** (Dawn Light) | the cure for all ills | Heals every ally, shields them for 3 s and hastens them for 4 s | meter |
| | T | On Healing Mist: Brighter Mist · Radiant Mist · Pilgrim's Dawn (were Brighter Sanctuary · Radiant Sanctuary · Pilgrim's Dawn) | | | |
| **Isla · Druid** | 1 | **Conjure Treant** (Call Treant) | the druid's summoning | A treant rises beside her and fights for her (one at a time) | 50 mana |
| | 2 | **Wild Shape** (Treeform) | the druid's change of shape | For 6 s she becomes a treant: a third more health, more defence, and the foes beside her must strike her; she heals 15% after | 60 mana, 12 s |
| | 2R | **Reincarnate** (*New*) | the soul given a new body | The revive face: the nearest fallen hero rises at 30% health, wreathed in leaves | 80 mana, 30 s |
| | U | **Tranquility** (Heart of the Grove) | the grove's great healing | Two treants rise at her side, and every ally is healed | meter |
| | T | Tiers kept: Grove · Ancient Grove · World Tree | | | |

### 3.6 Supports

| Hero | | New name (was) | Inspiration | What it does | Cost |
| --- | --- | --- | --- | --- | --- |
| **Hideo · Samurai Commander** | 1 | **War Banner** (kept) | | Raises the attack of the allies within 3 by a quarter for 6 s | 30 st, 11 s |
| | 2 | **Plant the Standard** (kept) | | Plants a standard for 10 s: friends within 2 of it take a tenth less and hit a tenth harder while it stands | 45 st |
| | U | **Rallying Cry** (Rally Cry) | the commander's rallying cry | The war banner flies over every ally: attack up a quarter for 9 s, and a quarter of their health back | meter |
| | T | Tiers kept: Higher Banner · Grand Standard · Shogun's Standard | | | |
| **Lovell · Wolf Bard** | 1 | **Vicious Mockery** (Dirge) | the bard's cutting words | His mocking verse hurts every foe within 4 a little, slows them for 4 s and weakens them for 3 s | 40 mana |
| | 2 | **Bardic Inspiration** (Change the Tune) | the bard's inspiration | Switches his standing song (the Dirge weakens the foes near him, the Anthem lifts the friends near him) and doubles it for 6 s | 55 mana |
| | U | **Battle Hymn** (kept) | | Allies are hastened and rallied (attack up a quarter) for 6 s; every foe within 7 is slowed | meter |
| | T | Cutting Mockery · Chorus · Moonlit Chorus (were Louder Dirge · Chorus · Moonlit Chorus) | | | |
| **Edmund · Tyrant** | 1 | **Judgement** (kept) | | A judgement falls on the toughest foe in reach and the 3x3 round it | 45 mana |
| | 2 | **Bane** (Condemn) | the curse that weakens | Marks the toughest foe for 6 s: every hero goes for it and deals 20% more; *Nudge:* it and the two foes nearest it are weakened for 4 s (Condemn weakens only the one); if it falls, every hero gains pool | 60 mana, 10 s |
| | U | **Reign of Terror** (kept) | | Every foe within 6 is hurt, slowed for 5 s and frightened; every ally is rallied: attack up a quarter for 7 s | meter |
| | T | Tiers kept: Twin Verdicts · Tyrant's Decree · The Iron Throne | | | |

### 3.7 Summoners

| Hero | | New name (was) | Inspiration | What it does | Cost |
| --- | --- | --- | --- | --- | --- |
| **Itzel · Beastmaster** | 1 | **Summon Beast** (Call of the Wild) | the summoning of a beast | A wolf answers her call and fights for her (two at most stand at once) | 35 st |
| | 2 | **Pack Tactics** (Sic 'Em) | the pack that hunts as one | Every wolf of hers leaps at the foe she marks: struck and slowed, and the wolves hit a quarter harder for 4 s; with none, one answers | 40 st, 9 s |
| | U | **Conjure Animals** (Hunt of the Pack) | the great summoning | Four wolves answer her call at once | meter |
| | T | Tiers kept: Pair of Wolves · Pack Leader · Lord of the Wild Hunt | | | |
| **Vesper · Reaper** | 1 | **Reap** (kept) | | Cuts every foe within 3; a foe under 30% health takes nearly triple | 30 st |
| | 2 | **Animate Dead** (Bound Soul) | the necromancer's raising | The last foe that fell near him rises as a wraith on his side for 8 s, at half its health and attack | 40 st |
| | U | **Harvest of Souls** (kept) | | Every foe within 5 is cut; those under a third of their health are reaped for far more; each kill feeds him and rises as a wraith for 5 s | meter |
| | T | Keener Scythe · Soul Scythe · Grim Harvest (were Keener Scythe · Soul Scythe · Harvest of Souls, the ultimate's name) | | | |

### 3.8 Monsters and spirits

| Hero | | New name (was) | Inspiration | What it does | Cost |
| --- | --- | --- | --- | --- | --- |
| **Kohaku · Kitsune** | 1 | **Charm Monster** (Fox Charm) | the charming spell | The strongest foe nearby fights its own side for 3.5 s | 45 mana |
| | 2 | **Alter Self** (Fox Guise) | taking another's shape | For 5 s she takes the shape of the strongest foe in sight: its looks, reach and attack; foes pick her last | 60 mana, 12 s |
| | U | **Mass Polymorph** (Nine-Tailed Dream) | turning foes into beasts | *New:* the three strongest foes in sight become little foxes for 4 s: they strike at a fifth of their attack, cannot cast, and move slowly. A boss keeps its own shape, and gets only the weakening and the silence, for the boss rule's half time | meter |
| | T | Tiers kept: Lingering Charm · Hundred Fox Fires · Nine-Tailed Inferno | | | |
| **Kurogane · Karasu Tengu** | 1 | **Swoop** (Dive) | the flier's swoop | Drops beside a shooter (else the weakest foe) and strikes it for double | 30 st |
| | 2 | **Pilfer** (kept) | | Dives on the foe with the fullest skill meter, steals half its charge and any shield, and silences it for 1.5 s; friends near him gain pool | 40 st |
| | U | **Cloud of Daggers** (Feather Storm) | the cloud of spinning blades | A whirling cloud of razor feathers falls on the thickest knot of foes, for more than double | meter |
| | T | Swift Swoop · Storm Swoop · Tengu King's Descent (were Swift Dive · Storm Dive · Tengu King's Descent) | | | |
| **Kazan · Yamabushi Tengu** | 1 | **Gust of Wind** (Wind Gust) | the wind spell | The foes within 2 are hurt and shoved back a tile, with fall damage if it drops them 2 or more | 30 st |
| | 2 | **Wind Wall** (Turning Wind) | the wall of wind that turns arrows | The foes beside him are shoved back; for 4 s, shots aimed at friends within 2 of him are blown back at the shooter for half | 40 st |
| | U | **Tempest** (kept) | | A great gale: every foe within 4 is hurt hard, shoved back and stunned for 1.5 s | meter |
| | T | Tiers kept: Stronger Gust · Hurricane · Wrath of the Mountain | | | |
| **Vuk · Werewolf** | 1 | **Rend** (Ravage) | the beast's tearing bite | Bites the weakest foe in reach for double, healing him half of what it deals | 25 st |
| | 2 | **Shapechange** (Shift) | the change of form | Changes form: the Hunter (quicker, bites bleed) or the Brute (takes a quarter less, blows splash); the Brute when badly hurt or crowded | 40 st |
| | U | **Full Moon** (kept) | | Both forms at once for 7 s, a quarter of his health back, and the foes near him frightened | meter |
| | T | Savage Rend · Blood Moon · Alpha's Howl (were Savage Ravage · Blood Moon · Alpha's Howl) | | | |
| **Asterion · Minotaur** | 1 | **Gore Charge** (kept) | | Charges up to 4 tiles in a line at a foe, hits it for double, knocks it back and stuns it for 1.5 s | 35 st |
| | 2 | **Bull Rush** (kept) | | Every foe beside him is struck and shoved two tiles; one that hits something is stunned for 1.5 s | 45 st |
| | U | **Stampede** (kept) | | Up to three charges in a row, each at the weakest foe in line, shoving and stunning | meter |
| | T | Tiers kept: Heavier Charge · Rampage · Lord of the Labyrinth | | | |
| **Dorion · Satyr** | 1 | **Pipes of Pan** (kept) | | Hastens the allies within 3, and him, for 4 s | 40 mana, 9 s |
| | 2 | **Irresistible Dance** (Pied Piper) | the dance no one can resist | The foes within 4 dance toward one spot ahead of him for 2 s, bunched and not striking | 60 mana |
| | U | **Bacchanal** (kept) | | Allies are hastened for 6 s, mended over time, and their skills surge | meter |
| | T | Livelier Pipes · Pan's Frenzy · Pan's Revel (were Livelier Pipes · Pan's Frenzy · Bacchanal, the ultimate's name) | | | |
| **Xanthe · Gorgon** | 1 | **Petrifying Gaze** (kept) | | Stiffens the strongest foe she sees within 5: it takes a blow and is stunned for 3 s | 45 mana |
| | 2 | **Flesh to Stone** (Stone Garden) | the petrifying spell | Every stunned or slowed foe within 5 turns to stone for 2 s; one that dies as stone stays as a statue | 60 mana |
| | U | **Gaze of Medusa** (Stone Curse) | the gorgon of myth | Every foe in sight within 6 is hurt and turned to stone for 2.5 s | meter |
| | T | Tiers kept: Deeper Gaze · Medusa's Glare · Gorgon Queen's Gaze | | | |
| **Hobb · Shambler** | 1 | **Contagion** (Rotting Touch) | the disease spell | Every foe within 2 rots for 4 s, and he drinks part of it | 30 st |
| | 2 | **Devour** (kept) | | Eats a body that fell near him: heals a fifth and grows a tenth bigger for the fight (three times at most) | 40 st |
| | U | **Plague Tide** (kept) | | A wave of rot leaves every foe within 5 cursed for 7 s (their healing turns to harm); he drinks from them | meter |
| | T | Tiers kept: Thicker Rot · Plague · Black Death | | | |
| **Seneb · Mummy** | 1 | **Hold Person** (Binding Wraps) | the spell that holds a foe still | Bandages lash every foe within 2 and slow it for 3 s; *Nudge:* the hardest-hitting of them is held still for 1.5 s | 40 mana |
| | 2 | **Dominate Monster** (Puppet Strings) | the spell that takes a foe's will | The hardest-hitting foe within 4 is bound for 3 s: it walks to, and strikes, its own side | 60 mana |
| | U | **Curse of the Pharaoh** (kept) | | Every foe within 5 is cursed and slowed for 6 s, the Mummy is shielded, and the two strongest foes are his puppets for 2 s | meter |
| | T | Tiers kept: Tighter Wraps · Pharaoh's Wraps · Eternal Tomb | | | |
| **Skerry · Kraken Mate** | 1 | **Grasping Tentacles** (Undertow) | the tentacles that drag | Tentacles drag every foe within 4 a tile closer; each is hurt and slowed for 2 s | 30 st |
| | 2 | **Tidal Wave** (Flood) | the wave spell | The 3x3 round him turns to shallow water for 8 s, and the foes in it are slowed | 45 st |
| | U | **Maelstrom** (kept) | | A whirlpool drags every foe within 6 toward him, hurts and slows it | meter |
| | T | Longer Tentacles · Maelstrom Tide · Abyssal Maw (were Stronger Undertow · Maelstrom Tide · Abyssal Maw) | | | |

**Foes that borrow a hero's skill** (the Skeleton Archers' Volley, the Orc Chieftain's and Bone Captain's War Banner, the maze
gorgons, the Gorgon Queen's Stone Curse, the Minotaur Champion, the yokai, the Iron Golem's Shield Wall, the fox that borrows the
Kitsune's ultimate) **keep their old names and rules**. Each gets its own copy of the skill (as the Yokai Seer's Possession already
does), so a foe's skill is not renamed with the hero's, and the Kitsune's charm ultimate stays with the fox that uses it.

**Passives** (Evasion, Bloodrage, Keen Edge...) are not part of this rework; most already have classic names. *A question for the
owner (section 10).*

## 4. Spells from the list not used, and why

- **Ice Knife, Cone of Cold, Frost Nova:** no hero has frost (the king's spells do). They are left for a future frost hero.
- **Counterspell:** it would need a reaction (a hero acting in the moment a foe starts a cast). Silences already do that job: the
  Ninja Monk's Quivering Palm, the Rifle Bot's Suppressing Fire and the Karasu's Pilfer. It is left for later.
- **Sleep, Hypnotic Pattern:** these would need a hold that breaks when the foe is struck, which is a new ailment. Irresistible
  Dance, Hold Person and Time Stop already cover it.
- **Misty Step, Shield of Faith, Sanctuary, Spirit Guardians, Turn Undead, Action Surge, Wall of Fire:** each would need a hero's
  skill to change what it does, not just its name. They are good choices for a later pass or for new heroes.
- **Haste, Heal, Smite, Hex, Meteor, Earthquake, Resurrect:** these belong to the king's spells, so no hero takes them as they are.

## 5. Summary of the counts

| | Count |
| --- | --- |
| Heroes | 45 |
| Skills and ultimates | 135 (93 renamed, 42 kept) |
| Revive faces | 4 (Revivify, Resurrection, Elixir of Life, Reincarnate) + Mass Resurrection |
| Rule nudges to existing skills | 5 (Second Wind's heal, Divine Smite's blow, Thunderwave's shove, Bane's spread, Hold Person's hold) + Mass Resurrection's three at 40% |
| New mechanics | 2 (the revive face on skill 2; Mass Polymorph) |
| Changes behind the scenes | 1 (each skill's fixed key) |
| Tier names renamed | 23 heroes' tier lines |

## 6. Effects and sounds (a later build step)

### 6.1 What each signature spell needs

"Atlas" is a painted cell in `src/art/fx/abilities/atlas-*.png`, played through `signatures.ts`. A renamed skill keeps its present
cell under its fixed key, so nothing breaks; the cell is listed only where the new name needs a new look. "Pack" is a strip in
`src/art/fx/pack/atlas.png` (the element strips: fire, ice, lightning, light, dark, earth, wind, water, poison, blood, moon, star,
forest). "Render" is a new pair of sound files (`cast-` and `fx-`) from `tools/spell-sfx/`, which today renders only the king's
spells. "Cue" is one of the existing synthesised element cues (what every hero skill plays now).

| Spell (hero) | Visual | Sound |
| --- | --- | --- |
| **Revivify** (Cleric) | **New** atlas cell: a golden ankh of light over the body, a column rising (with `pillar_light`) | **Render:** a heartbeat, a rising choir chord, a bell |
| **Resurrection** (Priestess) | **New** cell: white wings of light folding round the body | **Render:** a choir rising to a major chord, a harp, a bell (a different note from the king's Resurrect) |
| **Mass Resurrection** (Priestess U) | Atlas: today's Resurrection cell, with a light column on each one raised | **Render:** the Resurrection's choir, fuller, with a bell for each one raised |
| **Elixir of Life** (Wanderer) | **New** cell: a glowing vial pouring a green-gold spiral | **Render:** a cork pop, a bubbling pour, a bright chime |
| **Reincarnate** (Druid) | **New** cell: a ring of leaves and roots rising, a sapling of light | **Render:** creaking wood, wooden chimes, a flute rising |
| **Fireball** (Fire Wizard) | Pack `fire-orb` flying, then the atlas's present Meteor burst; **new** cell for the bead of fire in flight | **Render:** a whoosh, a roar of flame, a deep boom |
| **Meteor Swarm** (Fire Wizard U) | Atlas: the present Armageddon cell | **Render:** rushing falls, three blasts, a long rumble |
| **Magic Missile** (Great Sage) | **New** cell: three violet darts of force with trails; pack `star-hit` where they burst | **Render:** three bright zips, each with a crisp pop |
| **Eldritch Blast** (Warlock) | **New** cell: a crackling beam of violet-black force; pack `dark-hit` | **Render:** a low hum swelling, a crack, a hollow boom |
| **Circle of Death** (Warlock U) | Pack `dark-nova` ring over the atlas's Soul Harvest cell | **Render:** a low choir falling, a ring of whispers |
| **Call Lightning** (Lightning Mage U) | Atlas: the present Thunderstorm cell, with pack `lightning-strike` on each foe | **Render:** thunder building, six cracks |
| **Chain Lightning** (Lightning Mage) | Atlas: present cell | Cue for now; the king's `fx-chain-hop` file can be shared for the hops |
| **Divine Smite** (Paladin) | **New** cell: a sword wreathed in gold light striking down; pack `light-strike` | **Render:** a steel ring, a bell, a crack of light |
| **Warding Bond** (Paladin) | **New** cell: a golden chain of light between the Paladin and each friend | **Render:** a soft chain chime, a held hum |
| **Death Ward** (Priestess) | Pack `light-shield` ring on the friend; a small ankh when it saves the friend | **Render:** a glassy shell closing; a bell when it saves |
| **Cure Wounds** (Priestess) | Atlas: the present Holy Light cell | **Render:** a warm chord, a sparkle |
| **Mass Heal** (Cleric U) | Atlas: the present Divine Intervention cell | **Render:** a full choir, a bell |
| **Wild Shape** (Druid) | Atlas: the present Treeform/Call Treant look | Cue (earth) |
| **Hunter's Mark** (Mercenary) | **New** small cell: a red crosshair-rune hung over the foe while it is marked | **Render:** a bowstring twang and a sharp ping |
| **Bane** (Tyrant) | **New** small cell: a dark-red crown-rune over the marked foe; pack `blood-status` on the two weakened foes | **Render:** a low gong, a sour chord |
| **Mass Polymorph** (Kitsune U) | Pack `moon-puff` (a puff of smoke) and a fox sprite from the packs (DawnLike's or the Craftpix critters) for each foe changed; **new** only if no pack fox fits | **Render:** a magic pop and a silly little yip |
| **Cloud of Daggers** (Karasu U) | **New** cell: a whirling cloud of black feather-blades | **Render:** a whirring of steel, many small cuts |
| **Wind Wall** (Yamabushi) | Pack `wind-shield` ring with `wind-wave` | **Render:** a howling gust that holds, a deflecting whoosh |
| **Thunderwave** (Arc Blade) | Pack `lightning-nova` ring (light blue) | **Render:** a deep thunderclap and a short boom |
| **Thunder Step** (Arc Blade) | Atlas: the present Voltage Blink cell | Cue (lightning) |
| **Riposte** (Samurai) | Pack `wind-slash` on each answered blow | **Render:** a steel clash and a quick cut |
| **Issen** (Samurai U) | Atlas: the present Heaven-Splitting Cut cell | **Render:** a breath held, silence, one ringing cut |
| **Flurry of Blows** (Ninja Monk) | Atlas: the present Thousand Fists cell | **Render:** rapid thuds and a final crack |
| **Quivering Palm** (Ninja Monk) | Pack `light-gather` drawn into the palm, then `light-nova` | **Render:** a low resonant thrum, a pulse |
| **Rage** (Barbarian) | Pack `blood-aura` on him | **Render:** a roar and a war drum |
| **Dimension Door** (Illusionist) | **New** cell: a violet doorway of light opening and closing | **Render:** a door creak of magic, a swoosh |
| **Time Stop** (Time Witch U) | Atlas: present cell | **Render:** a clock ticking, then stopping dead; a reversed swell when it ends |
| **Slow** (Time Witch) | Atlas: the present Temporal Surge cell | **Render:** ticks slowing, a falling tone |
| **Flesh to Stone** (Gorgon) | Atlas: the present Stone Curse cell, greyed | **Render:** stone cracking and grinding |
| **Vicious Mockery** (Wolf Bard) | Pack `dark-puff` motes from his mouth | **Render:** a jeering trill on a reed |
| **Bardic Inspiration** (Wolf Bard) | Pack `star-sparkle` round each friend | **Render:** a lute flourish |
| **Spike Growth** (Ranger) | The present spike field | Cue (earth) |
| **Entangle** (Ranger U) | Atlas: the present Hunter's Net cell; pack `forest-spikes` | **Render:** creaking vines, a snap |
| **Animate Dead** (Reaper) | Pack `dark-gather` on the corpse, then the wraith | **Render:** a moan rising, a chill wind |
| **Hold Person** (Mummy) | Pack `dark-status` ring on the held foe | Cue (dark) |
| **Dominate Monster** (Mummy) | The present Puppet Strings look | Cue (dark) |

Every other renamed skill keeps its present look and plays its element's cue. They can come up for paintings later, as the FX-004
list in `hero-kits.md` already plans.

### 6.2 The new art, for one image prompt

Fourteen new cells for a **tenth atlas** (`atlas-9.png`, 768 x 768, a 4 x 4 grid of 192 px cells, in the style of the other nine:
painted pixel-art effects on a transparent background, a bright core and a soft glow, read clearly at 64 px on a phone):

1. Revivify: a golden ankh of light hanging over a fallen body, a pillar of light rising through it.
2. Resurrection: two great wings of white light folding round a figure as it rises.
3. Elixir of Life: a glowing glass vial pouring a spiral of green-gold light.
4. Reincarnate: a ring of leaves and roots rising, with a sapling of light at its heart.
5. Fireball: a bead of roaring fire with a short flame tail, in flight.
6. Magic Missile: three violet darts of force with bright trails, fanned out.
7. Eldritch Blast: a crackling beam of violet-black force, with eldritch runes along it.
8. Divine Smite: a sword wreathed in golden light, striking downward.
9. Warding Bond: a short golden chain of light with a glowing shield-rune link.
10. Hunter's Mark: a red crosshair rune with four arrow-points (it hangs over the foe while it is marked).
11. Bane: a dark-red cracked crown rune (it hangs over the foe while it is marked).
12. Cloud of Daggers: a whirling cloud of black feather-blades.
13. Dimension Door: a violet doorway outlined in light, half open on darkness.
14. Mass Polymorph (only if no pack fox fits): a small, round orange fox in a puff of pink smoke.

Two cells are left for a later pass. Each new cell is added to `catalogue.json` under the skill's fixed key (`skill:<key>`).

### 6.3 The sounds `tools/spell-sfx/` would render

About **30 pairs** (`cast-hero-<key>` 1.1 s, `fx-hero-<key>` 1 to 3 s): the 4 revives and Mass Resurrection, Fireball, Meteor
Swarm, Magic Missile, Eldritch Blast, Circle of Death, Call Lightning, Divine Smite, Warding Bond, Death Ward, Cure Wounds, Mass
Heal, Hunter's Mark, Bane, Mass Polymorph, Cloud of Daggers, Wind Wall, Thunderwave, Riposte, Issen, Flurry of Blows, Quivering
Palm, Rage, Dimension Door, Time Stop, Slow, Flesh to Stone, Vicious Mockery, Bardic Inspiration, Entangle, Animate Dead. Each is
built from the kit's layers in the same way as the king's spells, on its element's note, with its own touch.

At the sizes of the king's files (5 to 22 KB each), that comes to about **0.6 to 0.8 MB**. Every file the page loads by URL must go
in the service worker's `FILES` list (`build.mjs`), or the game breaks offline. `spellSfx.ts` would learn to plan a hero skill's
cast and effect as it does a king's spell. A hero's skill would play its rendered pair in place of its element cue, and would fall
back to the cue where no pair exists.

## 7. The balance plan

**The bar:** every hero within 6 points of the roster average at level 1 (stage 5) and at level 30 (stage 39)
(`test/hero-balance.test.ts`, `test/hero-balance-ultimates.test.ts`). Each batch aims for 4 points, to leave room for the batches
after it. Level 10 (stage 24) is also checked, because the revive opens there.

**Why it stays close:** 128 of the 135 skills change only their name (or nothing at all). The fights are seeded, so a rename-only batch gives the
same numbers as before, fight for fight. Each batch shows that: the sweep's table must not change for its rename-only heroes.

**What gets measured:**
- **Parity:** `node tools/kits/tune.mjs` (12,000 fights at level 1 and level 30) after every batch, for every hero, not just the
  batch's. A nudge is brought back into the band by its hero's `TUNE1`/`TUNE2`/ult `TUNE`, never by loosening the test.
- **The revive** (batch 1) changes losses everywhere, so it is also measured on: the armies on Normal (`tools/curve/run.mjs`; the
  target is still 2 to 3.5 tries), the daily (`tools/dailyRate.mjs --days 60`), the Calamity (`tools/balance.mjs --calamity`), and
  the Last Stand (which must not move, since nobody rises there). If a healer goes past +6, the revive's cost or cooldown is
  raised first (cost 80 to 90, cooldown 30 s to 40 s), before its everyday skills are touched. A team with two healers is checked
  on its own.
- **Tests added:** each revive rule (whom it raises, 30% health, the 30 s cooldown, once per ally per wave, the cap of 2, none in
  the Last Stand, summons never, the meter not filled by it, determinism: the same fight replayed tick for tick); Mass Resurrection
  raises three at 40%; Mass Polymorph (the look, a fifth attack, no casts, the boss rule); each nudge; every hero skill's fixed key
  has a signature, an element, a release and, where it had one, its rider and its skill-2 check; the foes' borrowed skills keep
  their old names.

**The batches** (each is a branch of its own, measured and noted in `docs/notes/`, before the next starts):

| Batch | What | Heroes |
| --- | --- | --- |
| 0 | **Fixed skill keys.** Each `Skill` gets a `key` (today's name), and every table that looks a skill up by name (`signatures.ts`, `skillFx.ts`, `fxRules.ts`, `individualReleases.ts`, `kitLooks.ts`, `ailmentSources.ts`, `kits/when.ts`, `talentsDeep.ts`, `catalogue.json`, the tests) reads the key. The foes get their own copies of borrowed skills. No name changes yet; the sweep must be identical. | none |
| 1 | **The healers and the revive:** the revive face, the `revive` event, the hero bar's ankh, Mass Resurrection | Cleric, High Priestess, Wanderer, Druid (4) |
| 2 | **Tanks and supports**, with the Second Wind, Divine Smite and Bane nudges | Knight, Paladin, Peasant, Juggernaut, Samurai Commander, Wolf Bard, Tyrant (7) |
| 3 | **Melee**, with the Thunderwave nudge | Samurai, Kunoichi, Ninja Monk, Barbarian, Mercenary, Lancer, Arc Blade, Demon Swordsman, Buccaneer, Queen Dragoon (10) |
| 4 | **Ranged and summoners** | Archer, Ranger, Gunslinger, Rifle Bot, Siege Bot, Dread Pirate, Beastmaster, Reaper (8) |
| 5 | **Casters** | Fire Wizard, Lightning Mage, Warlock, Great Sage, Time Witch, Illusionist (6) |
| 6 | **Monsters**, with Mass Polymorph and the Hold Person nudge | Kitsune, Karasu, Yamabushi, Werewolf, Minotaur, Satyr, Gorgon, Shambler, Mummy, Kraken Mate (10) |
| 7 | **Looks and sounds:** the art prompt's 14 cells into `atlas-9`, the ~30 rendered pairs, `spellSfx.ts` for heroes, the `FILES` list, phone checks at 393x852, 360x780 and 412x915 | all |

Each batch renames its heroes' skills, ultimates and tier names, along with the texts that quote them (the talents' "Shield Wall
reaches...", the codex, the hero card, the tips). It adds that batch's tests, runs `npm run typecheck`, the affected tests, the full
`npm test` and `npm run web`, and writes its note.

## 8. The change behind the scenes: fixed skill keys

Today a skill's `name` is both what the player reads and the key that about ten tables look it up by: its painting, its element and
sound, its release, its kit look, its ailment rider, its skill-2 check, its talents and its tests. Renaming 93 skills in all those
places at once would be easy to get wrong and hard to check. So batch 0 gives every `Skill` a `key`, which is today's name and never
changes. Every lookup reads `key`, and only the text on screen reads `name`. A test then makes sure every hero skill's key is found
in each table. Saves hold no skill names (orders and logs use unit ids), so old saves load as they are.

## 9. New mechanics and nudges, with how each stays deterministic

| | What | How |
| --- | --- | --- |
| *New* | **The revive face** on a healer's skill 2 | `Slot.revive?` (cost, cooldown, share). `castHero` checks it as an emergency before the other skills. The healer's `ks.atRev`, the battle's optional `raised` set and `revives` count, the target chosen in a fixed order, a `revive` event. No randomness. |
| *New* | **Mass Polymorph** | Built from what exists: `weakFor` (attack to a fifth), `silenceFor`, `chillFor`, and `setLook` to a fox sheet (as Alter Self changes looks), for 4 s, on the three strongest foes in sight (sorted by attack, then id). A boss keeps its look and has the half time. No randomness. |
| *Nudge* | Second Wind heals 12% | `mendUnit` on himself after the bash. |
| *Nudge* | Divine Smite strikes first | `hurt` on the foe in front at 1.2x (`resistOf` tells undead and fiends apart for the half again), then Holy Challenge as now. |
| *Nudge* | Thunderwave shoves | The Wind Gust's shove on the foes beside him after the nova. |
| *Nudge* | Bane weakens three | `weakFor` on the two foes nearest the marked one (sorted by distance, then id). |
| *Nudge* | Hold Person holds one | `stunFor` 1.5 s on the hardest-hitting foe the wraps catch (by attack, then id); the boss rule applies. |
| *Nudge* | Mass Resurrection: three at 40% | Two numbers in `resurrection` (`ultimates.ts`), plus the once-a-wave marks. |

## 10. Questions for the owner

1. **The Last Stand:** should the healers' revives work there? The design keeps today's rule (the fallen stay down for the run).
   Another option: one revive a wave there.
2. **The Paladin:** is he a healer for the revive (a Lay on Hands that can raise the fallen)? The design says no: he is a tank.
3. **The revive's numbers:** 30% health, a 30 s cooldown, once per ally per wave, and at most 2 skill revives a wave. Are these right?
4. **Mass Polymorph** replaces the Kitsune's charm ultimate. Is that all right, or should she keep it as "Mass Charm"?
5. **Passives:** should they be renamed too? The design leaves them alone.
6. **The kept names:** are you happy for 42 classics (Whirlwind, Smoke Bomb, Time Stop...) to keep their names and only get the
   new look and sound?
