# Quests, the tavern and the six great summons (design)

> **A design for the owner to approve.** No game code has been changed. Everything below is a proposal: the numbers are a first
> tuning to be measured once it is built. The open questions are at the end, each with a recommended answer.

The owner's asks, in short:

1. **Great summons**: six great beings of our own, each one huge attack across the whole board, stronger than any ultimate. A
   **summon gauge**, saved with progress, fills **across fights** ("about 10 boss waves") and waits, full, until the player calls
   it, in any mode. Calling empties it. **Auto never calls it.** It wipes ordinary foes, takes about half a boss's health, and gets
   a bigger cinematic than an ultimate's moment.
2. **Quests**: "an RPG feel ... with quests. Bring back the tavern ... Quests can be gained from the tavern, passersby, the king,
   completing army battles, calamity, lots of different ways." The summons come from **multi-part quests**, and their pieces are
   then **put together by the Summoner**.
3. **Quest battles** (the director's follow-up ask): a quest can open "custom battles that have certain people required to be used,
   as long as I have them, with a small story for the quest to make sense."
4. **Fight the summon to win it** (the owner's later decisions): "Maybe all but the first one should be a fight against the summon as
   the last step to gaining it", and "The first one should be the easiest." So summons 2 to 6 each end their chain with a quest battle
   against the great being itself; summon 1 has none. The six are ordered by difficulty, each with its point in the game.

Contents:

- [The player's experience](#the-players-experience) (a walk-through)
- [The tavern brought back](#the-tavern-brought-back)
- [Quests: the system](#quests-the-system)
- [Quest battles](#quest-battles)
- [The great summons: the system](#the-great-summons-the-system)
- [The six great summons](#the-six-great-summons) (with their chains)
- [A first set of ordinary quests](#a-first-set-of-ordinary-quests)
- [Rewards](#rewards)
- [Balance numbers](#balance-numbers)
- [Saves and determinism](#saves-and-determinism)
- [Screens at 393x852](#screens-at-393x852)
- [What each part touches](#what-each-part-touches)
- [Build plan](#build-plan)
- [The art list (for Antigravity)](#the-art-list-for-antigravity)
- [Open questions](#open-questions)

Concept mock-ups (not the game): `docs/samples/quests-design-*.png`, drawn from `docs/samples/quests-design/mock.html`.

---

## The player's experience

### 1. A quest at the tavern

The player has just beaten the Orc Warband for the first time. A gold "!" sits on the **Heroes** tab. Tapping it now opens the
**tavern** itself, not the hero list (today the tab opens the roster over the tavern: `home.ts` `show()` calls `openRoster()`).

Behind the bar stands **Gwen Tallow, the keeper**, polishing a mug, with a "!" bubble over her head. On the wall beside the bar hangs
the **quest board**, two papers pinned to it. Kenji (the Samurai) sits at the bar with a "!" too: a hero with something to ask.

The player taps Gwen. A small speech card rises from the bottom (the quip style the game already uses, but held until tapped):

> **Gwen Tallow:** "Orc-blood on your boots and you still came in through the front door. Good. There's a carter on the north road,
> says his wagons keep losing their wheels to *something* in the Orc camp. Pays in crowns. Interested?"
>
> [ Take it on ] [ Not now ]

"Take it on" puts **The Carter's Wheels** in the quest log: *Win 3 waves of the Orc Warband with Kwame on the field. 0/3.* A slim
**quest chip** now shows on the Battle tab's command bar ("Carter's Wheels 0/3"), so the player sees it while picking a fight.

Three army waves later, the chip fills and a toast reads "Quest done: The Carter's Wheels. Return to the tavern." Back at the tavern
Gwen's bubble is a gold tick; a tap pays it (120 crowns, 2 summoning stones) with one line from her.

### 2. The Summoner's calling (a chain begins)

The same first Orc clear also lights the **Recruit** tab. In the Summoning Sanctum the Summoner looks up from the altar:

> **The Summoner:** "Did you feel it, when the Warlord fell? Heat, under the ground, like a hearth breathing. Something old is
> stirring. Something that once answered this keep's call."

A short scene plays (the cinematic engine's letterbox and typed lines, about 20 seconds, skippable): the Sanctum's altar, six dark
sockets around its rim, one of them glowing ember-red. This is the prologue of the first great summon's chain, **The Ember
Matron**. The quest log gains a second tab, **Great Summons**, with one card: a silhouette of a winged shape in a fire-red frame, three
empty piece slots, and Part 1 of 3: *Beat the Orc Warlord with Ravi on the field.*

From now on the **summon sigil** (the gauge) exists: a ring beside the stones in the top bar reads "Sigil 0/1000". It fills from now
on, so by the time a summon is bound it is already partway full.

### 3. Doing the chain

The parts lead the player across the game's modes, each with a beat of story. The first chain is the gentle one: three parts, all
within reach of a party around level 5 to 12:

- **Part 1, an army fight.** The Warlord falls with Ravi on the field; the victory card adds a piece card: *the Kiln-Heart*, a stone
  still warm in the Warlord's belt-pouch. Ravi says his line ("It's humming. Stones shouldn't hum.").
- **Part 2, a quest battle.** *The Kiln Road*: a one-off fight on a lava field with its own story, three waves and a boss of its own
  (the Ash Warden). Ravi must fight in it (or Kwame, if Ravi is not recruited). A short scene before it explains why; a beat after.
  It gives *the Ash Feather*.
- **Part 3, the daily.** Clear any daily: a pedlar on the road sells "a lucky crown" that is plainly made of cinders, and smoking.

Each part shows in the Great Summons tab as a slot filling with its piece's picture.

The later chains are longer and harder, and **each ends in a fight against the great being itself** (from the second on): the being
stands on the board as a huge boss with its own moves and phases, and only when it is beaten does it consent to be bound.

### 4. Binding at the Summoner

With all three pieces, the Sanctum's altar glows and its button reads **Bind the Ember Matron**. The ceremony uses the Sanctum's own
ritual (the casting priest, the beam, the eye-shield pose from `animated-summoner.md`) at a larger scale: the pieces float to the
points of the altar, the circle catches fire, and **Ossery, the Ember Matron** rises behind the altar, a painted figure filling
the screen, wings of smoke, a crown of cinders. Her name stamps in; she speaks one line; the card says *Bound. She will answer the
sigil when it is full.* She now stands in the Sanctum's **Pact Gallery** (a row of six alcoves, one lit).

### 5. Filling the sigil

Every boss wave won adds to the sigil: an army's mid-boss or last boss, the daily's two bosses, a Calamity guardian, a Last Stand
boss wave (at half). The wave recap shows it: "+100 sigil · 640/1000". About ten boss waves fill it: five army runs, or a few days of
play. Full, the ring burns gold and the recap says: *The sigil is full. A great summon will answer your call.* It waits, full, for as
long as the player likes; boss waves won meanwhile add nothing.

### 6. Calling it

In the next hard fight (say the Undead Legion's Lich King, wave 15), the **sigil orb** sits at the left end of the spell orbs row,
burning gold and slowly turning. Auto is on; the heroes fight on their own; the sigil is never touched by Auto. The Lich King's
skeleton wall is grinding the party down. The player taps the sigil:

- The fight holds. A small picker shows the bound summons as cards (only Ossery so far; with several, the last one called is first).
  "Call Ossery, the Ember Matron?" [ Call ] [ Not now ].
- **Call.** The cinematic (about 5 seconds; a tap skips after the first second, except the first time each summon is called): the
  board darkens to near-black, a summoning circle draws itself across the board, the sky tears open in fire, and Ossery descends,
  huge, the camera pulling back to fit her; her name and **Hearthbreak** stamp across the screen; she opens her wings and a wall of fire
  rolls across the whole board. A heavy hit-stop and shake.
- The board returns: every skeleton is ash, the Lich King has lost about half his health, the far half of the board burns for a few
  seconds and the heroes glow warm (more attack for ten seconds). The fight resumes. The sigil is empty.

That is the loop: quests give stories, rewards and the summons; boss waves fill the sigil; the player chooses the one moment in a few
days of play when the great being answers.

---

## The tavern brought back

Today: the Heroes tab's page is the tavern (`src/tavern.ts`: three rooms you pan, every owned hero idling at a spot of their own,
Duchess, the trophy wall), but `Home.show('heroes')` opens the roster sheet over it at once, so the tavern is never seen unless the
roster is closed. The castle's tavern building also leads to the Heroes tab (`home.ts` around line 147).

The change:

- **The Heroes tab opens the tavern.** `show()` stops calling `openRoster()`. The tavern's **Roster** button stays (renamed **All
  heroes** for clarity) and opens the list exactly as now; `goTo` with a hero (the comeback pointers) still opens that hero's sheet.
  The tab's red badge (a rank or awakening ready) stays, and a gold "!" badge is added when a quest waits to be taken or handed in.
- **The keeper.** Behind the bar in the bar room stands **Gwen Tallow**, an original tavern keeper (new pixel sprite, in the tavern's
  side-view style: idle, wiping a mug, talking). A tap opens her card: the quests she offers, the ones to hand in, a line of gossip.
  She is the tavern's voice: dry, warm, a little nosy.
- **The quest board.** A noticeboard prop on the bar room's wall, left of the bar, with up to three papers pinned on it (one per
  quest on offer). A tap opens the **quest log** on its **Board** tab.
- **Patrons with something to ask.** An owned hero idling in the tavern can carry a "!" bubble (the tavern's emote bubbles already
  include "!"). A tap on that hero opens their quest card first (with "Open their sheet" below it), not the hero sheet. At most two
  heroes carry a "!" at a time.
- **A Quests button** joins the tavern's Roster and Trophies buttons: it opens the quest log on its Active tab.
- **Duchess** keeps wandering the tavern; now and then (one of her quests on offer) she carries a "!" too.

Nothing else in the tavern changes: the panning, the three rooms, the heroes' spots and idles, the trophy wall.

---

## Quests: the system

### What a quest is

A **quest** has a giver, a short story, one **goal** the game can track, a reward, and a hand-in. A **chain** is a list of
quest **parts** done in order; each part has its own goal, its own beat of story, and (for a summon chain) a **piece**.

```ts
// src/sim/questData.ts (pure data)
interface QuestDef {
  id: string;
  title: string;                 // "The Carter's Wheels"
  giver: Giver;                  // who offers it and takes it back
  /** When it may be offered (an army cleared, a mode open, a hero owned, a day's draw). */
  needs?: Need;
  /** The words: the offer, the line while it is going, the hand-in. */
  offer: Line[]; going?: Line; done: Line[];
  goal: Goal;
  reward: Reward;
  /** A quest battle this quest opens (its goal is then { kind: 'battle', id }). */
  battle?: string;
  /** Kept in the log at most this many days (none: never expires). Ordinary quests only. */
  days?: number;
}
interface ChainDef { id: string; title: string; giver: Giver; needs: Need; prologue: string /* scene id */; parts: PartDef[]; summon?: string }
interface PartDef { goal: Goal; piece?: string; beat: Line[]; reward?: Reward; battle?: string }
```

### Who gives quests (the givers)

| Giver | Where | What they give | How often |
| --- | --- | --- | --- |
| **Gwen Tallow**, the keeper | the tavern, behind the bar | ordinary quests (errands, bounties, wagers); one summon chain | the board holds up to 3 offers; one new offer a day (the phone's date) |
| **Patrons** (owned heroes) | the tavern, a hero with "!" | a hero's own quest, often a quest battle with that hero and a friend | at most 2 patrons at a time, a new one every 2 days |
| **Passersby** | the Battle tab's cliff ledge: a figure walks across the overlook (a pedlar, a pilgrim, a royal messenger, a frost-bitten hunter) | small quests and one summon chain | one passerby a day, while the Battle tab shows; gone at midnight if not tapped |
| **The ruler** | the Castle tab's throne (the chosen ruler, `rulerRules.ts`) | **Royal charges**: bigger, slower quests in the ruler's own voice ("By my word: ..."); one summon chain | one charge a week (7 days) |
| **After an army battle** | the victory card of an army's last boss (or a mid-boss) | a "spoils" quest: a map, a captive, a strange trinket found on the boss | about 1 in 3 boss wins (side stream), at most 1 waiting |
| **The Calamity** | a rift voice at a sanctuary altar or a mystery crossing | eerie quests; one summon chain | when a guardian falls, about 1 in 2 |
| **Duchess** | camp, castle or tavern, a goat with "!" | silly quests (she ate a map; she wants a hat) | at most one at a time, after her haystack treat |
| **The Summoner** | the Recruit tab's Sanctum | the first summon chain; every binding | by progress only |

All offers are drawn by the simulation's rules from a side stream of the save's seed and the date (see
[determinism](#saves-and-determinism)), so they are the same on a reload and never reroll.

### Goals the game can track

Every goal is something the game already settles after a fight or a run (`settleRun` in `modes.ts`, `settleStand`, the Calamity's
settle, `settleDaily`) or a tap on a place. Progress is counted in one pure function, `noteQuests(m, ctx)`, called beside
`checkAchievements` with the same context (`AchievementCtx`: the finished `Battle`, won or lost, the stage, the stars, the run, the
meta) plus the fight's `FightStats` tally and the mode.

| Goal kind | Means | Read from |
| --- | --- | --- |
| `bossDown` | fell a named boss (optionally on a tier, in a mode) | the won boss wave (`isBossRun`, `bossOf`), the Calamity guardian, the daily boss |
| `wavesWon` | win N waves (an army, a mode, any) | each settled won fight |
| `clearArmy` | clear an army (optionally on a tier) | `settleArmyRun` / `armyCleared`, `tierCleared` |
| `with` (a rider on any fight goal) | ... with hero X (or any of a list, or N of a trait) on the field | `battle.units` (heroes placed), `traitsOf` |
| `flawless` (a rider) | ... with no hero falling | the fight's falls (as the Flawless achievement reads them) |
| `quick` (a rider) | ... within N seconds | `battle.t` |
| `standing` (a rider) | ... with N heroes standing at the end | the living heroes |
| `tally` | deal / heal / take N, or N kills, across fights (optionally by one hero or trait) | `FightStats` (`dealt`, `healed`, `taken`, `kills`) |
| `ults` | fire N ultimates (optionally one hero's) | the fight's `skill` events of an ultimate (`ultimateOf`) |
| `spells` | cast the king's spells N times (or one spell), or win without one | the fight's `spell` events |
| `combo` | set off N duo combos | `duoCombo` events (`noteCombos`) |
| `mvp` | hero X is the MVP of N wins | `mvpOf` |
| `clearDaily` | clear N dailies (first plays only) | `settleDaily` |
| `standWave`, `standRoom`, `holdLine` | reach wave N of the Last Stand, reach a room (act), hold the line at an act's end | `settleStand`, `Meta.standAct`, `holdTheLine` |
| `calGuardian`, `calClear` | fell the Calamity's region guardian N, clear it whole (optionally on an ascension) | the Calamity's settle, `ascCleared` |
| `battle` | win quest battle X | the quest battle's settle |
| `visit` | take something to someone (the Summoner, the keeper, the ruler) | a tap on that place, from the quest card |
| `duchess` | Duchess's lucky bleat, her haystack | the existing Duchess flags |

A goal that counts across fights keeps its count in the save (`progress`). A goal that needs one fight to do everything ("beat the
Lich King with Selam on the field, flawless") is met by one settled fight. Losing never takes progress away.

### The quest log

A sheet over the home screen (the hero sheet's `#hmSheet`, so it opens and closes the same way), with four tabs:

- **Active**: the ordinary quests taken (at most **3** at a time) and each chain's current part. Each row: the giver's face, the
  title, the goal in plain words, a bar ("2/3"), and a **Track** pin. A done quest shows a gold "Hand in" button.
- **Board**: the quests on offer from every giver, so nothing is missed: "Gwen Tallow · The Carter's Wheels · 120 crowns" [Take].
  An offer that needs a hero the player does not own is not shown (see [quest battles](#quest-battles)).
- **Great Summons**: six cards, one a summon: the being's silhouette (its painted card once bound), its element, the piece slots, the
  current part, and its story so far (the beats already seen, each tappable to read again). A chain not open yet shows only "Something
  sleeps here" and when it opens ("after the Beast Packs").
- **Done**: the quests finished, newest first, each with its lines to read again.

The **tracked quest** (one, the player's pin; else the newest) shows as a slim chip on the Battle tab's command bar, above Party /
Battle! / Continue ("Carter's Wheels 2/3"); a tap opens the log. In a fight it shows nothing (the fight screen is full).

### Handing in

A done ordinary quest is handed in by a tap (on the giver, or Hand in in the log); the reward is paid then, as achievements are
claimed. A chain's part is paid **at once** when its goal is met (its piece card shows on the victory card or recap), since the next
part should begin straight away.

### Story beats and voice

- **Offers and hand-ins** are short speech cards: the giver's portrait, their name, one to three lines (the quip style, held until
  tapped). Heroes speak in their own voices (`heroSays` lines are the model), the ruler in the chosen ruler's voice (`kingSays`,
  `rulerSpeech.ts`), Duchess in her bleats and asides (`goatSays`).
- **A chain's prologue and its binding** are full scenes in the cinematic engine (`sceneKit.ts`: `say`, `tell`, `wide`, the cast by
  role), 20 to 40 seconds, skippable, kept in the codex's Scenes list to watch again.
- **A part's beat** is a piece card (the piece's picture, its name, two lines) on the victory card or the recap.
- **Quest battles** get a short scene before and a beat after ([below](#quest-battles)).

---

## Quest battles

A quest (or a chain's part) can open a **one-off battle of its own**: its own land and layout, its own waves and foes, often a boss of
its own, a short story, and a **required cast**: one to three named heroes who must fight in it. The rest of the party is the
player's own choice.

### What one is

```ts
// src/sim/questBattles.ts
interface QuestBattle {
  id: string;
  title: string;                 // "The Kiln Road"
  land: Area;                    // one of the seventeen lands
  layout?: LayoutId;             // a battlefield shape (river, pass, ruined fort ...); else picked by land and seed
  waves: readonly Wave[];        // 1 to 5 waves (the armies' `Wave`: foes by id, `boss: 'mid' | 'final'`)
  /** How strong it is: the foes' strength of this army's Normal at this wave (so it matches the part of the game it sits in). */
  like: { army: string; wave: number };
  boss?: BossStats & { name: string; title: string; look: string };   // a unique boss: a name and title on an existing foe's look
  /** The required cast: each slot is a hero, with stand-ins that may take the part (a chain's battle only). */
  required: readonly { hero: string; standIns?: readonly string[] }[];
  before: string;                // scene id: the story before
  after: Line[];                 // the beat after a win
  /** Duchess on the field (she already joins fights: `duchessFight.ts`). */
  duchess?: boolean;
  /** A trial against a great being (the last part of chains 2 to 6): the being is the boss, with its own kit and phases. */
  being?: string;
}
```

**The trials (a fight against the great being).** From the second chain on, a chain's last part is a quest battle whose boss is the
great being itself (`being` set). It is the same machinery as any quest battle, with these extras:

- **The being on the board**: one fighter in `UNITS` per being (`gsHrimvald` and so on, a boss in `isBoss`, not in the meta's
  `BOSS_IDS`), standing at the back centre of the board on a raised platform (as the Calamity's guardians stand in their arena), drawn
  about three times a fighter's size (`calBossBoost`'s way, larger). It is one tile in the simulation, like every boss.
- **Its own kit**: three or four moves made from the existing toolkit (zones, freezes, shoves, walls, chains, summoned adds,
  terrain changes), two **phases** (`bossPhases.ts`: it turns at 60% and 30%, each turn with a short cut-in of its painted figure and a
  new move), and an **enrage** after 120 s so no trial lasts for ever.
- **Its strength** follows the chain's point in the game (`like`, the army and tier whose last boss it is measured against), so each
  trial is a real test there: about **2 to 4 tries** for a party at the chain's expected level, as the armies' Normal is tuned
  (`difficulty.md`). Measured with `npm run balance -- --trial <id>`.
- **One wave**: the being and, in its phases, the adds it calls. The hearts work as in any quest battle.
- **A great summon against a great being** takes only **25%** of the being's health (they are of a kind), so a bound summon helps but
  cannot carry a trial.
- **Won**: the being kneels (a short scene), and its last piece is its **pact** ("the Stag's Consent"); the Summoner then binds it.
- **Lost**: no penalty; Try again, free, with a new seed. Its scene before plays once.

It runs as a run of its own: `RunMode` gains `{ kind: 'quest'; quest: string }`, and `waveArmyOf(run)` returns an `Army`-shaped
object built from the battle (`questArmy(id)`), exactly as the daily does (`dailyArmy(date)`): the wave boosts, the boss, its intro
card, the long map between waves, "Wave 2/3", the walk across and the hearts all come from the armies' own code. `armyOfRun` still
means a real army only, so a quest battle keeps no army record and no stars.

### The required cast

- **The party screen** (`src/party.ts`) opens in start mode with the required heroes already in their slots, each in a gold frame
  with a small padlock and a "Quest" ribbon; a tap on them does nothing but a nudge and "Kenji must fight in this one". The other
  slots are free, filled at first from the player's saved party (without repeats). Start stays disabled until the party is full, as
  now.
- **The run** starts with each required hero **already on the bench**, free, at grade 1 (they are owned heroes, at their lasting
  level, rank and gear, as in any army run). The rest of the gold is the armies' usual start (`ARMY_START_GOLD`, the price of two
  hires); summons draw from the party as ever.
- **The deploy screen**: a required hero's bench tile and board figure wear the gold frame and padlock. **Fight!** is disabled until
  every required hero is on the board, and reads "Place Kenji to begin" meanwhile. A required hero can be moved on the board and
  merged with a copy of itself, but not dragged back to the bench once the fight has begun (it can be between waves).
- **Stand-ins** (a chain's battle only): when the player owns none of a slot's heroes but owns a stand-in, the stand-in fills the
  slot, and the scene's lines are written for "whoever fills the slot" (the cast's role is the slot, as scenes already cast
  `party:0`). Every chain slot lists stand-ins from **both** starter packs (`FIXED_PACKS`: Kwame, Kenji, Natsu / Minh, Ayame, Ravi) or
  a content hero the chain's own opening guarantees, so **no summon chain can be blocked by the luck of the summoning stones**.

### When the heroes are not owned (the recommendation)

- **An ordinary quest battle** (a patron's, Gwen's) is **only offered when the player owns its heroes**: the owner's own words, "as
  long as I have them". It never shows greyed, so the board is never full of things the player cannot do. It may be offered later,
  once they are owned.
- **A chain's quest battle** always shows (the chain must not stall), with the slot's hero or a stand-in. If somehow neither is owned,
  the part shows greyed: "Needs Ravi or Kwame: recruit one to take this on", and the rest of the log goes on.

### Retries, hearts, rewards

- **Hearts**: the armies' two hearts (`MAX_RETRIES`, the heart resume): a lost wave spends one and the fight resumes.
- **Losing** ends the attempt with no penalty. The quest stays; **Try again** is always there, free, with a new seed for the next
  try (`tries` is counted in the save).
- **Rewards** are paid on the first win: the quest's own reward (or the chain's piece), the fights' XP as in any army run, the
  sigil's share for a boss wave. No chest, gold or crowns per wave beyond the quest's reward, so it is not a farm.
- **Replays**: once won, a quest battle can be replayed from the Done tab for practice (no reward, no sigil).
- **Saving**: a quest battle has its own run slot (`legends.questRun`), so starting one never ends an army run that is saved, and an
  army run never ends a quest battle. One quest battle at a time.

### Where they are launched

From the quest's card in the log (Active tab: "Fight: The Kiln Road"), or from its giver in the tavern. Both open the party screen
in start mode with the cast locked in, then the story scene, then the deploy. The scene plays the first time only (a "Story" link on
the card plays it again).

### Worked examples

The heroes below are real (`ALL_HEROES`, names and titles from `heroNames.ts`).

**1. The Kiln Road** (the Ember Matron's part 2). *Required: Ravi, Kindler of Pyres (the Wizard); stand-in Kwame, Shield of the Dawn.*
Land: the lava field; three waves of the Infernal Host's imps and demons at the strength of the Orc Warband's wave 10; boss **the Ash
Warden** (a demon's look, drawn big; it spawns burning ground).

> *Before.* The Summoner: "The stone from the Warlord's pouch is cooling. Its other half went south, along the old kiln road, carried
> by things that like the heat." · Ravi: "Then we follow the heat. I've been chasing fire my whole life; it's about time it led
> somewhere." · Duchess: "Mehh." (She refuses to come. Her hooves are not for lava.)
>
> *After.* Ravi lifts a feather of grey ash that does not crumble: "The Ash Feather. Still warm. She's close, whatever she is."

**2. The Frozen Meadow** (the Winter Stag's part 2). *Required: Vuk, Hunter of the Full Moon (the Werewolf); and Itzel, Caller of the
Grey Pack (the Beastmaster) or Inti, Warden of the Snares (the Ranger); stand-ins Natsu or Ayame.* Land: the snow field; four waves of
the Beast Packs' wolves turned white with frost; boss **the Rime Alpha** (the Alpha Wolf's look, frost-tinted; it slows the heroes it
bites).

> *Before.* The hunter at the camp: "The pack that hunts the meadow isn't a pack any more. They run with frost on their backs, and
> they're following something. Something with antlers taller than a tree." · Vuk: "Wolves don't follow. Wolves lead. Unless something
> bigger has taken the lead." · Itzel: "Then we ask the pack what it's following. Politely, if we can."
>
> *After.* A bell of clear ice lies where the Rime Alpha fell. Vuk sniffs it and sneezes: "Smells of winter. The old kind."

**3. Under the Courtyard** (the Sleeping Hill's part 2). *Required: Kwame, Shield of the Dawn (the Knight) or Minh, Banner of the
Commons (the Peasant); and Asterion, Horn of the Labyrinth (the Minotaur) or Kerem, the Marching Wall (the Juggernaut); stand-ins
Kenji or Ayame. Duchess fights too.* Land: a cave (dark stone, the Golem Forge's earth); three waves of stone and iron golems that rise
out of the floor; boss **the Mortar Warden** (a stone golem's look, huge; it walls tiles off).

> *Before.* Duchess has dug a hole in the courtyard. It is a large hole. It goes down. · Kwame: "Your Majesty, the goat has found a
> staircase." · The ruler: "Then follow the goat. She has never once been wrong about where the food is." · Asterion: "Tunnels. At
> last, somewhere that feels like home."
>
> *After.* The Mortar Warden crumbles to reveal a fist of stone the size of a cart, its knuckles carved with the keep's own crest.
> Kwame: "The keep was built on something. Someone, perhaps."

**4. Two Blades on the Bridge** (an ordinary patron quest, Kenji's). *Required: Kenji, Sword of the Eastern Sea (the Samurai) and
Hideo, Holder of the Bridge (the Samurai Commander).* Offered only to a player who owns both (Hideo joins on the Yokai Night Parade's
Elite clear). Land: the river layout, one bridge; three waves of the Yokai Night Parade's foxes and crows; boss **the Bridge Oni** (the
Oni King's look, smaller). Reward: 400 crowns, a silver chest, +50 sigil.

> *Before (Kenji, at the bar, "!").* Kenji: "There is a bridge in the east where I lost a duel when I was young. Hideo held that
> bridge for a season. I would like to stand on it again, beside him, and not lose." · Hideo: "You were very young. And very loud."
>
> *After.* Hideo: "Better. Much quieter." · Kenji bows, and buys the next round at the tavern.

**5. The Winter Stag** (the Winter Stag's last part: a trial against the being). *Required: Vuk, Hunter of the Full Moon; the other
four are free.* Land: the snow field, a frozen lake in the middle (ice tiles: `board.ts` already has them). Strength: the Wildwood's
last boss on Normal (a party around level 22 to 28). Boss: **Hrimvald, the Winter Stag**, alone at first.

- *Its moves*: **Stamp** (a 3x3 of ice under the heroes there, frozen 1.5 s), **Antler Sweep** (shoves the front row back one tile),
  **Breath of Winter** (a cone that slows by 30% for 4 s).
- *At 60%*: it calls two frost wolves (the Beast Packs' white wolf, frost-tinted) and the lake spreads one ring of ice.
- *At 30%*: **The Long Frost** in small: every hero is slowed by 20% until the end, and it stamps twice as often.

> *Before.* The lake is silent. Snow falls only in a circle round something enormous standing on the far shore. · Vuk, very quietly:
> "It's been watching us since the meadow." · The Stag lowers its antlers. · The ruler: "It wants to know if we are worth answering.
> Show it."
>
> *After.* Hrimvald kneels in the snow, and the frost round it softens to a mist. A long low call, like ice breaking on a lake. Vuk:
> "It says yes." *The Stag's Consent: take it to the Summoner.*

---

## The great summons: the system

### The sigil (the gauge)

- **One gauge for the save**, `GAUGE_FULL` 1000, kept in the meta (`Meta.summons.gauge`). It opens with the first summon chain begun
  and fills from then on (before any summon is bound, so the first call comes soon after the first binding).
- **It fills across fights** by the rules in [balance](#balance-numbers): chiefly **+100 for each boss wave won** (about ten boss
  waves fill it). Lost fights add nothing. A fight in which a summon was called adds nothing to the sigil.
- **Full, it waits** for as long as the player likes. Gains while full are lost (the recap says "full").
- **The player calls it, by hand, in any fight of any mode** (army, daily, Last Stand, Calamity, quest battles). Calling empties it to
  0. **Auto never calls it**: the page's Auto, the bot (`autoplay.ts`), the auto-replay and the balance tools never touch it. A player
  may still tap it by hand while Auto is on.
- **At most one call a fight** (the Last Stand's whole run is one fight, so one call a run). A call can only be made while the fight
  is on (not in deploy, not between waves, not in the Last Stand's retreat or choice).

### Which summon answers

Every bound summon can answer. On a tap of the full sigil the player picks one in a small picker (cards of the bound summons, the
last one called first, each with its element and its rider in one line). With one bound, the picker is a single confirm. No setting,
no slot to manage: the choice is made at the moment it matters.

### The attack (the same strength for all six; each its own rider)

Called, a summon strikes **the whole board** at once:

| Struck | Takes |
| --- | --- |
| Every ordinary foe (field foes, a summoner's adds, the Last Stand's foes in the room) | its whole health: it falls |
| An elite (the armies' tier elites, the Calamity's elites and mini-bosses) and every mid-boss | **65%** of its full health |
| A final boss (an army's last, the daily's boss of the day, a Last Stand boss wave's boss, a quest battle's boss) | **45%** of its full health |
| A Calamity guardian | **40%** of its full health |

- A boss already under its share falls. A boss pushed past its phase line (`bossPhases.ts`) enters its phase as usual.
- It cannot be dodged or blocked and ignores shields and defence (it is a set share, not a blow), so it is as strong at level 1 in the
  Calamity as at level 100 in an army's Mythic tier.
- Foes still to come (the Last Stand's queue, a wave's later spawns) are not touched.
- Then the summon's **rider**, different for each (see [the six](#the-six-great-summons)): burning ground, a freeze, ultimates
  charged, the fallen raised, stone skin, a drain. The rider is what makes the choice matter.

For comparison: an ultimate at full strength deals about 1 to 3 times a hero's attack to an area (`ultimates.ts`, `tuned.power`); the
summon ends every ordinary foe on the board and takes nearly half a boss's life. It is the strongest thing in the game, and it comes
once every few days of play.

### How it goes through the simulation

- **The fight knows the summons it may call.** When the page starts a fight with a full sigil, it puts the bound summons on the stage
  (`Stage.greatSummons?: string[]`, optional); `fight()` copies them into the battle (`b.great = { can: [...], called?: id }`).
- **`callSummon(b, id)`** (`src/sim/greatSummon.ts`) is the only way in, like `castSpell`: it refuses (false, nothing changes) unless
  the fight is on, the summon is in `b.great.can`, and none was called this fight. It goes through the order queue (`orders.ts`), so
  a fight replays from its seed, its placing and its orders, as now.
- On the next tick it resolves at once: the damage above (as `hit` events with `by: 0` and a `great: true` flag, as the king's meteor
  shows `by: 0`), the rider (as zones, statuses or heals through the existing rules), and a `greatSummon` event for the page.
  Anything chosen at random in it (which tiles burn) comes from its own side stream, `mixSeed(b.seed, GREAT_SALT, b.t)`.
- **The meta is emptied by the page** the moment the order is accepted (`spendSigil(m)`, saved at once), so quitting mid-fight
  cannot keep a full sigil and a dead boss.

### The cinematic (the ultimate's moment, larger)

Built on `ultMoment.ts` / `ultMomentRules.ts` / `ultEpicRules.ts` (the hold, the dim, the hit-stop, the shake, the stings, the
painted-part fallbacks) as a new moment kind, `great`, with its own timings (`GREAT_MOMENT` in a new `greatMomentRules.ts`):

| Beat | Time (s) | What shows |
| --- | --- | --- |
| Hold | 0.0 | the fight holds (`holdsBattle`); the board dims to 90% (the ultimate's dim is lighter); the music ducks (`duck`) and a deep sting |
| Circle | 0.3 | a summoning circle of the summon's element draws itself across the whole board (a ground loop, 2:1) with runes |
| Arrival | 0.9 | the sky tears in the summon's element; the being's **painted figure** rises or descends, filling about 80% of the screen's height; the camera pulls back (`ZOOM` 0.85, the opposite of the ultimate's lean in); letterbox bars slide in |
| Name | 2.0 | the name and title stamp in (the ultimate's stamp, bigger), then the attack's name |
| Strike | 2.8 | the full-board attack sheet; a 0.25 s hit-stop (the ultimate's is 0.15), a full shake, an eased flash of the element, the heaviest sting |
| Aftermath | 3.6 | the board shows through: the foes' falls and numbers play, the rider's ground and glows appear, the figure fades up and out |
| Resume | 4.6 | the dim lifts (eased), the bars slide out, the fight runs again |

- **The first call of each summon always plays in full.** After that a tap skips once the first second has passed, and a Settings
  switch ("Great summons: full / short") gives a short version of about 1.8 s (circle, figure, strike, no letterbox), like the
  ultimate's `ultFull`.
- **Reduced motion**: no shake, no sweeps; the figure and the name fade in and out, held still; the strike is a cross-fade.
- **Battery saver**: fewer particles, the same beats.
- It never changes the battle: the page holds the steps and plays the events the sim already resolved.

### Binding at the Summoner

- In the Sanctum (the Recruit tab), a new **Pact Gallery** button beside the Chest shop: six alcoves, the bound beings standing in
  theirs, the rest dark with their pieces counted ("3 of 4 pieces"). A tap on a bound one shows its card (element, attack, rider, its
  story) and **Watch the binding** again.
- **Bind** shows on the Sanctum's main view when a chain's last piece is in. The ceremony is the Sanctum's ritual (the priest's cast
  pose, the beam, the eye-shield pose), with the pieces flying to the altar and the being rising behind it in its painted figure, the
  name stamped, its first line, and "Bound". It is a scene in the cinematic engine, kept in the codex's Scenes list.
- Binding pays no crowns: the summon is the reward. The first binding also teaches the sigil (one tip: "Boss waves fill the sigil.
  Full, tap it in any fight to call a great summon.").

### Where the sigil shows

- **Camp and every home tab**: a ring chip in the top bar beside the stones (`#hmSigil`: the ring filling clockwise, "640/1000" or
  "Full"), shown once the first chain has begun. A tap opens the Pact Gallery.
- **In a fight**: the **sigil orb** at the left end of the spell orbs row (`#hudSpells`: today the mana box, an orb per spell and the
  Auto switch), a little bigger than a spell orb. Not full: a dim ring, the fill as an arc, no tap. Full (and a summon bound): it burns
  in gold with slowly turning runes (a steady glow, no blinking: the owner's no-flashing rule) and a tap opens the picker (the fight
  holds while it is open, as the skill sheet holds it). After the call, it is an empty ring until the next fight.
- **The wave recap and the victory card**: "+100 sigil · 740/1000" on a boss wave; "The sigil is full" when it fills.

---

## The six great summons

Original beings, named and drawn for this game: the six old guardians who once answered the Last Keep's call, scattered when the
Calamity broke their pacts. None is named or drawn after another game's summons.

**Ordered by difficulty** (the owner: "The first one should be the easiest"). The first is a gentle introduction soon after the first
army; each later one asks more: a longer chain, harder modes and tiers, higher levels, and from the second on a **trial**, a fight
against the being itself, as the last part. The army levels below are each army's Normal level (`armies.ts`: the Orc Warband 1, the
Undead Legion 8, the Beast Packs 15, the Wildwood 22, the Labyrinth 35, the Ogre Clans 45, the Infernal Host 58, the Yokai Night
Parade 65, the Golem Forge 74; Hard is about level 45, Elite about 60, `difficulty.md`).

| # | Name | Element | Opens | Giver | Parts | Expected to be bound | Its trial |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Ossery, the Ember Matron** | fire | the Orc Warband cleared | the Summoner | 3 | around the Undead Legion (levels 5 to 12), the first week | none |
| 2 | **Hrimvald, the Winter Stag** | ice | the Beast Packs cleared | a passing hunter | 4 | around the Wildwood (levels 20 to 28) | as the Wildwood's last boss on Normal |
| 3 | **Solenne, the Last Lantern** | light | the Wildwood cleared | Gwen Tallow | 5 | the Labyrinth to the Ogre Clans (levels 35 to 45) | as the Ogre Clans' last boss on Normal |
| 4 | **Caeldra, the Storm Heron** | lightning | the Labyrinth cleared | the ruler (a Royal charge) | 5 | the Infernal Host (levels 50 to 60) | as the Infernal Host's last boss on Normal |
| 5 | **Grundmor, the Sleeping Hill** | earth | the Infernal Host cleared | Duchess | 5 | the Golem Forge and the Hard tiers (levels 65 to 75) | as the Golem Forge's last boss on Normal |
| 6 | **Velmoth, the Hollow Moon Moth** | dark | the Calamity cleared once | a rift voice | 5 | the Elite tiers (levels 80 to 95) | as the Golem Forge's last boss on Elite |

A part that needs a mode not yet open (the Last Stand opens at 12 army stars, the Calamity at 16) says so: "Opens with the Last
Stand (12 army stars)". The chains can be worked on side by side; each one's parts go in order. Every summon strikes with the same
strength ([the attack](#the-attack-the-same-strength-for-all-six-each-its-own-rider)): the later ones are not stronger, only harder to
win, and their riders are the more powerful ones.

### 1. Ossery, the Ember Matron (fire): the gentle introduction

*Look*: a vast salamander-mother of cooling basalt, cracks of magma glowing along her body, wings of rolling smoke, a crown of
floating cinders, eyes like kiln-mouths. Warm, ancient, maternal and terrible.

*Attack*: **Hearthbreak**. She rises from a crack behind the foes, spreads her wings over the board and breathes a wall of fire across
it, back to front.
*Rider*: the foes' half of the board burns for 6 s (the burning ground zone, foes only); the heroes are "warmed", +15% attack for 10 s.

*Chain* (the Summoner; prologue "The Hearth Below"; 3 parts, no trial):

| Part | Goal | Beat | Piece |
| --- | --- | --- | --- |
| 1 | Beat the Orc Warlord with Ravi or Kwame on the field | the Warlord carried a stone that still hums | the Kiln-Heart |
| 2 | Quest battle **The Kiln Road** ([above](#worked-examples)), at the Orc Warband's late strength | the Ash Warden guarded a feather that will not burn | the Ash Feather |
| 3 | Clear any daily | a pedlar sells "a lucky crown" that is plainly made of cinders, and smoking | the Cinder Crown |

Binding line: *"Little keep. You grew. Call, and I will warm you."* She comes to the call because the keep's hearth kept burning: she
asks no test of it.

### 2. Hrimvald, the Winter Stag (ice)

*Look*: a colossal white stag, its antlers two glaciers branching into the sky, frost-fog pouring from its nostrils, a mane of icicles,
blue-white eyes; snow falls only round it.

*Attack*: **The Long Frost**. It stamps once and a wave of ice rolls out across the whole board.
*Rider*: every foe left is frozen for 5 s (a boss is slowed by half for 6 s instead).

*Chain* (a frost-bitten hunter passing the camp; prologue "Tracks in the Snow"; 4 parts):

| Part | Goal | Beat | Piece |
| --- | --- | --- | --- |
| 1 | Win 5 waves of the Beast Packs with Vuk on the field | Vuk keeps finding antler-marks on trees taller than towers | the Antler Shard |
| 2 | Quest battle **The Frozen Meadow** ([above](#worked-examples)) | the Rime Alpha wore a bell of clear ice | the Rime Bell |
| 3 | Reach wave 10 of the Last Stand | in the library's window the frost draws a stag's head, and stays | the Frost Window |
| 4 | **Trial: The Winter Stag** ([worked example 5](#worked-examples)): Vuk must fight | it kneels in the snow | the Stag's Consent |

Binding line: a long low call, like ice breaking on a lake. (It does not speak. Vuk: "It says it's glad. I think.")

### 3. Solenne, the Last Lantern (light)

*Look*: a towering figure of stained glass and white flame, robed in light, a great lantern held in both hands whose glow throws
the colours of chapel windows across the ground; a quiet, mournful face. Kind, solemn.

*Attack*: **Dawnward**. She lifts the lantern and the night of the board breaks: a sunrise sweeps across from her, searing every foe.
*Rider*: every fallen hero rises at 60% health; every hero is healed to full, cleansed of ailments and shielded for 3 s. (The Last
Stand's king is healed 30% too.)

*Chain* (Gwen Tallow; the lantern over the bar that never goes out; prologue "The Lamp Over the Bar"; 5 parts):

| Part | Goal | Beat | Piece |
| --- | --- | --- | --- |
| 1 | Beat the Lich King on Hard with Selam, Linnea or Karim on the field (stand-ins Kwame, Minh) | the lich's crown held a wick that would not char | the Wick |
| 2 | Heal 20,000 health in fights, in any mode | Gwen: "My lamp's brighter. You've been doing good work, haven't you?" | the Oil of Mercy |
| 3 | Quest battle **Vigil at the Chapel**: Karim (stand-ins Kwame, Minh) and Selam or Linnea (stand-ins Natsu, Ravi) hold the chapel against four waves of the dead | the dead came for the chapel's last glass; it held | the Glass |
| 4 | Reach the chapel in the Last Stand (act III) | the chapel's candle lights itself as the king walks in | the Flame |
| 5 | **Trial: The Last Lantern**: Selam or Linnea must fight (stand-ins Natsu, Ravi) | she lowers the lantern and weeps light | the Lantern's Vow |

*Her trial* (the chapel at night; as the Ogre Clans' last boss on Normal): she sets **lanterns** on three tiles that heal her and her
lantern-bearers while they burn (the heroes must put them out: a lantern is a small foe); **Mercy's Wall**, a shield on herself every
15 s that must be broken; **Judgement**, a beam down a column. *At 60%* two lantern-bearers (the cleric-like foes) rise; *at 30%* she
raises any bearer that fell, once. A test of burst damage and of choosing targets.

Binding line: *"I kept a light for you all this while. I did not know your name. I know it now."*

### 4. Caeldra, the Storm Heron (lightning)

*Look*: a heron made of thunderhead, wingspan the width of the sky, legs like lightning-rods, a beak of white light, feathers of
rain; small storms crackle in its wake.

*Attack*: **Heronstrike**. It folds its wings and dives; hundreds of bolts fall across the board as it passes.
*Rider*: every hero's ultimate meter gains half its fill (those below level 30 gain skill charge instead), and the king gains 5 mana.

*Chain* (the ruler's Royal charge; prologue "By Royal Word"; 5 parts):

| Part | Goal | Beat | Piece |
| --- | --- | --- | --- |
| 1 | Beat the Shaman King (the Ogre Clans' mid-boss) with Kazan or Kurogane on the field (stand-ins Ayame, Natsu) | the tengu know of a heron that fishes in clouds | the Heron's Eye |
| 2 | Quest battle **The Bell Tower in the Storm**: Malia (stand-ins Kenji, Ravi) and Minjun (stand-ins Natsu, Ayame) climb a tower in the rain against the Golem Forge's iron golems | the tower's bell is a lump of stormglass | the Stormglass |
| 3 | Reach wave 20 of the Last Stand | the library holds the old pact, copied out by a careful hand | the Rain-Oath |
| 4 | Fell the Calamity's first guardian | a feather of blue fire, caught in the rift's wind | the Thunder Quill |
| 5 | **Trial: The Storm Heron**: Malia must fight (stand-ins Kenji, Ravi) | it lands on the tower's top and bows its head | the Storm's Word |

*Its trial* (the bell tower's roof, a high platform with drops: `height.md`; as the Infernal Host's last boss on Normal): **Chain
Bolt** jumps through the back row; **Dive**, a line attack down a whole column (it leaves its post and lands at the far end);
**Thunderhead**, a cloud zone that drains 20 ultimate charge from each hero in it. *At 60%* the storm breaks: a bolt falls every 3 s
on a tile marked a second before (chosen by its side stream). *At 30%* it dives twice in a row. A test of spreading out and of
ultimate timing.

Binding line: *"Tell your ruler: a promise kept is louder than thunder."*

### 5. Grundmor, the Sleeping Hill (earth)

*Look*: a giant of the keep's own stone and the hill beneath it: grass and old walls on its shoulders, a face of weathered rock with
moss for brows, eyes of amber, roots for a beard; the keep's crest carved into its fist. Slow and enormous.

*Attack*: **The Keep Stands**. It rises out of the ground behind the heroes and brings its fist down on the far side of the board;
the quake runs through every foe.
*Rider*: the heroes take half damage for 10 s ("stone skin"); a boss is stunned for 2 s. (In the Last Stand, the room's broken walls
mend.)

*Chain* (Duchess; she keeps digging in the courtyard; prologue "The Goat Who Dug"; 5 parts):

| Part | Goal | Beat | Piece |
| --- | --- | --- | --- |
| 1 | Beat the Minotaur Champion on Hard with Kwame or Minh on the field | under the Labyrinth's floor, the maze's stones remember an older wall | the Hill's Knuckle |
| 2 | Quest battle **Under the Courtyard** ([above](#worked-examples)) | a fist of stone with the keep's crest | the Hill's Heart |
| 3 | Reach the throne room in the Last Stand (act IV) | under the throne, a word carved into the foundation stone | the Waking Word |
| 4 | Fell the Calamity's second guardian | the rift's floor is the same stone as the keep's | the Rift Stone |
| 5 | **Trial: The Sleeping Hill**: Kwame or Minh must fight; Duchess fights too | it settles back into the ground, one eye open | the Hill's Leave |

*Its trial* (the keep's courtyard, the hill rising under it; as the Golem Forge's last boss on Normal): **Rise**, the board's middle
lifts a level (a terrain change, as the layouts' heights), splitting the party; **Wall of Old Stone**, a line of wall tiles that the
heroes must break or walk round; **Quake**, every hero on the ground stunned 1 s, every 12 s. *At 60%* it throws boulders at the back
row. *At 30%* it calls two stone golems out of the walls. A test of a party that can fight split.

Binding line: *"I am the floor you stand on. I have always been holding you up. Now I will stand."* (Duchess eats a bit of its moss.)

### 6. Velmoth, the Hollow Moon Moth (dark): the hardest

*Look*: a moth the size of the night, wings dark as a starless sky with two pale moons for eye-spots, a body of soft grey fur
dusted with silver, antennae like crescent blades; where its wings pass, light goes out.

*Attack*: **Eclipse Wing**. Its wings close over the board; for a heartbeat everything is night, then a silver wind cuts through.
*Rider*: every boss and elite loses its shields and its boons; for 10 s the heroes drain 25% of the damage they deal as health.

*Chain* (a voice in the rift; prologue "The Moth at the Window"; 5 parts):

| Part | Goal | Beat | Piece |
| --- | --- | --- | --- |
| 1 | Quest battle **The Night Market**: Vesper (stand-ins Ravi, Kenji) and Luana or Kohaku (stand-ins Ayame, Natsu) at a market of masks where nothing is what it seems | a mask-seller who was a moth all along | the Dark Thread |
| 2 | Beat the Oni King on Elite | the Oni's lantern held a hollow moon | the Moon's Hollow |
| 3 | Clear the daily without casting a king's spell | "Lights out, little keep." | the Last Lamp |
| 4 | Clear the Calamity at ascension 1 or higher | in the rift's heart, its name, written in dust | the Moth's Name |
| 5 | **Trial: The Hollow Moon Moth**: Vesper must fight (stand-ins Ravi, Kenji) | it folds its wings and the stars come back | the Moon's Bargain |

*Its trial* (the rift at night, the board half dark; as the Golem Forge's last boss on Elite): **Moth Dust**, a cloud that blinds (a
third of blows miss) for 5 s; **Eye-Spots**, the two moons on its wings fix on the two strongest heroes and slow them; **Lights Out**,
every hero loses their boons. *At 60%* a swarm of moths (small fast foes) every 20 s. *At 30%* **Eclipse**: the board goes dark, the
heroes' reach is one tile less, and it strikes twice as often. A long, hard fight: the last test of the game's quests.

Binding line: *"Every light goes out in the end. I will choose which."*

---

## A first set of ordinary quests

Fourteen, across the givers. "Needs" is when it may be offered.

| Quest | Giver | Needs | Goal | Reward |
| --- | --- | --- | --- | --- |
| **The Carter's Wheels** | Gwen Tallow | Orcs cleared | Win 3 waves of the Orc Warband with Kwame (or any front-liner) on the field | 120 crowns, 2 stones |
| **A Round for the House** | Gwen Tallow | any | Win 10 waves, any mode | 150 crowns, a bronze chest |
| **The Bone Collector** | Gwen Tallow | Undead cleared | Fell 60 skeletons (any mode) | 200 crowns, 3 stones |
| **Quiet Hands** | Gwen Tallow | 2 armies cleared | Win a boss wave flawless (no hero falls) | 250 crowns, a silver chest |
| **Two Blades on the Bridge** (quest battle) | Kenji (patron) | owns Kenji and Hideo | [worked example 4](#worked-examples) | 400 crowns, a silver chest, +50 sigil |
| **The Captain's Wager** (quest battle) | Tiago (patron) | owns Tiago and Harrow | Win **Salt and Cannon** (a sea-cliff fight against drowned pirates) with Tiago and Harrow | 350 crowns, an awakening cache |
| **Show Me Your Fire** | Ravi (patron) | owns Ravi, level 30 | Fire Ravi's ultimate 5 times | a tome, 150 crowns |
| **Fresh Bread for the Front** | a pedlar (passerby) | any | Clear today's daily | 3 stones |
| **The Pilgrim's Road** | a pilgrim (passerby) | Wildwood cleared | Win 3 waves of the Wildwood with a healer on the field | 200 crowns, ores |
| **Word from the Capital** | a royal messenger (passerby) | castle open | Set off 3 duo combos | 180 crowns, 2 stones |
| **By My Word: the Banners** | the ruler (Royal charge) | 3 armies cleared | Clear any army on Hard | 600 crowns, a gold chest |
| **By My Word: the Long Night** | the ruler (Royal charge) | Last Stand open | Reach wave 20 of the Last Stand | 500 crowns, 5 stones, +100 sigil |
| **The Warlord's Map** (spoils) | after an army's last boss | that boss beaten | Clear the next army's wave 8 | 250 crowns, a silver chest |
| **What the Rift Wants** | a rift voice (Calamity) | Calamity open | Win a Calamity crossing with an elite | 300 crowns, ores |
| **Duchess's Hat Emergency** | Duchess | her haystack found once | Win 5 fights with Duchess on the field | a new Duchess hat (a fourth cosmetic) |

The tables above are the first pass; the data files make adding more cheap (the goal kinds are shared).

---

## Rewards

From what the game already pays, so no new currency:

- **Crowns** and **summoning stones** (as achievements and the codex pay them).
- **Chests**: bronze, silver or gold, put in the stash on the cart (`stash`), opened as now.
- **Awakening ores and caches**, **tomes** (`tomes.ts`).
- **Sigil**: +50 or +100 for some quests (a small share; the sigil still fills mainly from boss waves).
- **Cosmetics**: a Duchess hat; a tavern trophy (a quest's keepsake hung on the trophy wall: the Carter's wheel, the Bridge Oni's
  mask).
- **The great summons**, from the chains, and each chain's parts pay a little too (a bronze chest for each part, a gold one on
  binding).

Pace guide: an ordinary quest pays about what an achievement does (100 to 600 crowns, 2 to 5 stones); a Royal charge about a
daily's chest plus; nothing pays like a first army clear, so quests add to the main road rather than replacing it.

---

## Balance numbers

### The sigil's fill (`GAUGE_FULL` 1000)

| Source | Adds | Note |
| --- | --- | --- |
| An army's boss wave won (mid-boss or last boss, any tier), by hand | **100** | 2 a run (the Wildwood 3): a run is 200 to 300 |
| The same, in an auto-replay | **25** | auto runs are 10 a day (`AUTO_TICKETS`); at 100 each they would fill it twice a day |
| The daily's two boss waves (the mid-boss and the boss of the day), first play of the date | **100** each | a practice replay adds nothing |
| A Last Stand boss wave (every 5th wave) | **50** each, at most **200** a run | a strong Stand reaches wave 30 or more: 6+ boss waves |
| A Calamity guardian | **100** each (3 a run) | |
| A Calamity elite or mini-boss | **25** | |
| A quest battle's boss | **100** | first win only |
| A trial won (a great being beaten) | **150** | first win only |
| Some quests' rewards | **50** to **100** | |
| A lost fight, a fight in which a summon was called, gains while full | 0 | |

**What that means**: ten boss waves by hand fill it. A player who plays two or three army runs and the daily each day fills it about
every day and a half; a lighter player (one run, the daily) every three or four days. Auto-replay alone (ten tickets, 20 boss waves at
25) takes two days. That is "very rare and special" while still being seen.

### The strike

| Struck | Share of full health | Lever |
| --- | --- | --- |
| Ordinary foes | 100% (they fall) | `GREAT.FIELD` |
| Elites and mid-bosses | 65% | `GREAT.ELITE` |
| Final bosses (army, daily, Last Stand, quest battle) | 45% | `GREAT.BOSS` |
| Calamity guardians | 40% | `GREAT.GUARDIAN` |

### By mode

| Mode | What it does there | Why |
| --- | --- | --- |
| **Army** | as above, once a fight | the main stage; a summon can carry a party through a wall boss once, and the next try is without it |
| **Daily** | as above; the day's record counts it | the owner's "any mode"; the daily is one try a day, so a call there is a real choice |
| **Last Stand** | once a run (one long fight); the room's foes fall, the queue does not | the queue keeps coming, so it buys breathing room, not a win |
| **Calamity** | as above, guardians at 40% | the guardians are the run's walls (16% of greedy-bot runs clear it whole); 40% keeps ascension meaningful |
| **Quest battles** | as above | |
| **Trials** (a great being) | the being takes 25%; its adds fall | a bound summon helps but cannot carry the test of the next |
| **The spire** | the old tower now opens as the Last Stand (`onTower` opens `openStand`); if a spire mode returns, it is as an army | |

### The trials

| Trial | Measured as | For a party at | Target |
| --- | --- | --- | --- |
| The Winter Stag | the Wildwood's last boss, Normal | levels 22 to 28 | 2 to 4 tries |
| The Last Lantern | the Ogre Clans' last boss, Normal | levels 40 to 48 | 2 to 4 tries |
| The Storm Heron | the Infernal Host's last boss, Normal | levels 55 to 62 | 2 to 4 tries |
| The Sleeping Hill | the Golem Forge's last boss, Normal | levels 70 to 78 | 3 to 5 tries |
| The Hollow Moon Moth | the Golem Forge's last boss, Elite | levels 85 to 95 | 3 to 6 tries |

A trial's health and attack are set as an army's bosses are (`BossStats` at wave 1's strength, times that army's wave-15
multiplier), then tuned by `npm run balance -- --trial <id>` to the tries above, with the same greedy bot and talents as the armies'
tables.

The balance tool (`npm run balance`) gets a `--summon <wave>` flag to model a call at a wave, so the walls can be checked with and
without. The bot never calls one by default, so every existing balance table stays as it is.

---

## Saves and determinism

### Saves (`legends.*`, all new fields optional)

- `legends.meta` gains:
  - `quests?: { active: { id: string; progress: number; took: number }[]; offers: { id: string; giver: string; day: number }[];
    done: string[]; chains: Record<string, { part: number; progress: number }>; pieces: string[]; tracked?: string; tries?:
    Record<string, number>; day?: number }`
  - `summons?: { gauge: number; bound: string[]; last?: string; calls?: number; seenFull?: string[] }`
- A new run slot, `legends.questRun`, for a quest battle going (the army run's `legends.run` is untouched).
- `RunMode` gains `{ kind: 'quest'; quest: string }`; only a quest run has it.
- **Old saves**: no `quests`, no `summons`: they load as nothing begun. On the first load after the update, the givers' "needs" are
  checked against what the save has already done, so a save that has cleared the Orc Warband is offered the Ember Matron's chain at
  once (with its prologue), and Gwen's first quests. Nothing is back-paid.
- The save version is not bumped.

### Determinism

- **Offers** are drawn by `offersFor(m, day)` from `mixSeed(m.seed, QUEST_SALT, day, giverIndex)`, the day being the page's date
  key (`todayKey()`) passed in, as the daily and the auto tickets do. The same save on the same day sees the same offers; taking or
  passing on one changes nothing else.
- **A quest battle's fight** has its own seed: `mixSeed(m.seed, QB_SALT, hashOf(id), tries)`. Its board, layout and foes come from
  that, as an army run's do.
- **The spoils and rift offers** after a fight use `mixSeed(run.seed, SPOILS_SALT, stage)`, never the fight's own stream.
- **The summon's strike** goes through `callSummon` as an order, and anything random in its rider uses `mixSeed(b.seed, GREAT_SALT,
  b.t)`. Nothing new draws from `b.rng` or `b.skillRng`, so every existing fight plays out exactly as before.
- **Quest progress** is counted by a pure function from the settled fight; the renderer never writes it.

---

## Screens at 393x852

All text 12 px or more, no bold under 12 px, as the menus are now; nothing sideways.

- **Heroes tab (the tavern)**: the tavern as now, opening on the bar room. Top right the three buttons: **Quests** (with a gold dot
  when something waits), **Trophies**, **All heroes**. Gwen behind the bar, the quest board on the wall to her left, a "!" over her
  or a patron. (Mock: `quests-design-tavern-393.png`.)
- **A giver's card**: a card rising from the bottom over the lower third: portrait (64 px), name, one to three lines typed out, and
  the buttons (Take it on / Not now, or Hand in, or Fight). A tap outside closes it.
- **The quest log**: the hero sheet's panel, full height under the top bar; tabs Active / Board / Great Summons / Done as a row of
  pills; rows 64 px. (Mock: `quests-design-log-393.png`.)
- **Great Summons tab**: six cards in a column, each 96 px: the being's card art or silhouette, name and element, four or five piece
  slots, the current part's goal and bar.
- **Battle tab**: the tracked-quest chip (28 px tall) sits above the command bar, on the scene's foot, clear of the plaques.
- **Party screen (a quest battle)**: the locked slots in a gold frame with a padlock and a "Quest" ribbon; a line above the slots:
  "The Kiln Road · Ravi must fight". (Mock: `quests-design-party-393.png`.)
- **Deploy**: the required heroes' gold frame on the bench and the board; Fight! reads "Place Ravi to begin" until they are placed.
- **Fight**: the sigil orb at the left of the spells row, 44 px (spell orbs are about 36). Full: gold ring, turning runes. The picker:
  a sheet from the bottom with a card per bound summon (art, name, element, rider in one line) and Call. (Mock:
  `quests-design-fight-393.png`.)
- **The Sanctum**: a **Pact Gallery** button beside Chest shop; the gallery is a column of six alcoves; **Bind** replaces the summon
  buttons' row while a chain is ready to bind.
- **Top bar**: the sigil ring chip (28 px) beside the stones chip, "640" under it, or "Full" in gold.

---

## What each part touches

| Part | New files | Hooks in shared files |
| --- | --- | --- |
| Quest rules | `src/sim/quests.ts` (offers, take, `noteQuests`, hand in, chains), `src/sim/questData.ts` (quests, chains, lines), `test/quests.test.ts` | one call each in `settleRun` (`modes.ts`), `settleStand` (`stand.ts`), the Calamity's settle, `settleDaily`; `meta.ts` (two optional fields, `loadMeta` reads them) |
| Quest battles | `src/sim/questBattles.ts` (`questArmy`, `questRun`), `test/quest-battles.test.ts` | `run.ts` (`RunMode` kind `quest`, `waveArmyOf`); `party.ts` (locked slots); `main.ts` (start, the run slot, Fight! check); `benchDrop.ts` (no bench once begun) |
| The tavern | `src/questLog.ts`, `src/questCard.ts`, `src/quests.css`; keeper and board art | `home.ts` (the Heroes tab opens the tavern; the badge; the chip on the Battle tab); `tavern.ts` (the keeper, the board, the "!" patrons, the Quests button); `render/tavernSpots.ts` (the keeper's and the board's spots) |
| Passersby, ruler, Duchess, rift | `src/passerby.ts` | `camp.ts` (a walking figure), `castle.ts` (the throne's tap), `render/duchessRules.ts` ("!"), `calamityView.ts` / `sanctuaryView.ts` (the rift voice) |
| Great summon rules | `src/sim/greatSummon.ts` (`callSummon`, the strike, riders, `GREAT`), `src/sim/sigil.ts` (fill, spend), `test/great-summon.test.ts`, `test/sigil.test.ts` | `battle.ts` (`Stage.greatSummons`, `b.great`, one branch in the order step); `orders.ts` (the order); `tools/autoplay.ts` / balance (`--summon`) |
| The cinematic | `src/greatMoment.ts`, `src/greatMomentRules.ts`, `test/great-moment.test.ts` | `ultMoment.ts` (shares the hold and the stamp), `render/fx.ts` (the full-board sheet), `fightHud.ts` (the sigil orb, the picker), `soundRules.ts` (three stings), `settings.ts` (`greatFull`) |
| The Summoner | `src/pactGallery.ts`, binding scenes in `sim/sceneFamilies.ts` | `hall.ts` (the Bind button and the gallery button) |
| The trials | `src/sim/greatBeings.ts` (the five beings' kits, phases, stats), `test/great-beings.test.ts` | `units.ts` / `foes.ts` (five boss fighters), `bossPhases.ts` (their turns), `render/sheets.ts` (their sheets), the boss intro card (the painted figure) |
| Records | | `updates.ts` (the director's release entry), `CREDITS.md`, `build.mjs` `FILES` (the painted figures load by URL) |

---

## Build plan

Each batch is shippable on its own and keeps every existing fight the same.

1. **The tavern and the first quests.** The Heroes tab opens the tavern; All heroes, Quests and the badge; the quest rules and saves
   (`quests.ts`, the goal kinds, `noteQuests` hooks, old saves); the quest log (Active, Board, Done); Gwen with placeholder art (a
   pack sprite) and the quest board; six of Gwen's and the passersby's ordinary quests; the tracked chip. *Tests: offers, goals, saves,
   determinism.*
2. **Quest battles.** `RunMode` `quest`, `questArmy`, its own run slot, the locked party slots and deploy, the scene before and the
   beat after, Try again, replays; the two patron battles (*Two Blades on the Bridge*, *The Captain's Wager*). *Tests: the cast rule,
   the stand-ins, the run slot, seeds.*
3. **The great summon in the simulation.** The sigil (fill rules, spend), `callSummon` through the orders, the strike and the six
   riders, the bot never calling it, `--summon` in the balance tool. Placeholder look (the pack's big bursts, a dark silhouette).
   *Tests: shares per foe kind, once a fight, Auto never calls, determinism, the sigil's fill per mode.*
4. **The call on the page.** The sigil orb and picker in the fight HUD, the top bar ring, the recap lines, the full cinematic on the
   ultimate's machinery with the placeholder art, the Settings switch, reduced motion. Browser checks at 393x852, 360x780 and 412x915.
5. **The first chain, end to end.** The Ember Matron: the Summoner's prologue, the three parts (with *The Kiln Road*), the piece cards,
   the binding ceremony and the Pact Gallery. This is the point to put it in the owner's hands.
6. **The trials.** The being as a boss fighter (`UNITS`, `isBoss`), its kit and phases, the raised platform, the 25% rule, the kneel
   scene, `--trial` in the balance tool; the Winter Stag first, with a placeholder sheet (a pack boss tinted).
7. **The other four chains** in order of difficulty (the Lantern, the Heron, the Hill, the Moth), each with its quest battles and its
   trial.
8. **The other givers**: the ruler's charges, the after-battle spoils, the rift voice, Duchess's quests, the patrons' "!".
9. **The painted art**: the importer brings in Antigravity's sheets ([below](#the-art-list-for-antigravity)); the placeholders go.

---

## The art list (for Antigravity)

In the format of `rpg-spells-art-prompt.md`: one PNG per key, saved as `art-source/great-summons/<folder>/<key>.png`, brought in by
an importer (batch 8) that checks the grid, the transparent corners and the rows, and packs one atlas a session into
`src/art/fx/summons/`. Until then the game uses placeholders under the same keys. Credit line in `CREDITS.md`: "Great summons
(`src/art/fx/summons/`, `src/art/summons/`): original painted art made for this game."

**The rule for every sheet and figure:** an original being of this game. **Not based on, and not resembling, any other game's
summon**, nor any named creature from another franchise.

### The shared opening for the figures (paste first)

> Cinematic hand-painted fantasy illustration in the painted style of a high-end mobile RPG's character art: soft painterly
> brushwork, rich luminous colour, strong silhouette, dramatic rim light. A single colossal mythic being on a fully transparent
> background, seen from slightly below to feel enormous, whole body in frame with an 6% clear margin. No ground, no background, no
> text, no frame. Original design for this game only, not based on any existing game's creature.

### Session S1: the figures (`s1-figures`, 12 images)

For each summon: **`<id>-figure`** (1024 x 1536, portrait): the full figure in its striking pose, for the cinematic and the binding.
**`<id>-card`** (512 x 512): the face and shoulders in a calm pose, for the picker, the Pact Gallery and the Great Summons tab.

- **ossery** (fire, `#ff8a2a` with `#fff0a0`, `#d03a10`): a vast salamander-mother of cooling black basalt, magma glowing in the cracks,
  wings of rolling smoke spread wide, a crown of floating cinders, kiln-mouth eyes; the figure rears up, wings open, mouth glowing.
- **solenne** (light, `#ffd36a` with `#fff6d0`): a towering woman of stained glass and white flame, robes of light, a great lantern held
  in both hands casting chapel-window colours, a quiet sorrowful face; the figure lifts the lantern high.
- **hrimvald** (ice, `#7fd4ff` with `#e8f8ff`, `#2a6aa8`): a colossal white stag, antlers like two branching glaciers, frost-fog from its
  nostrils, an icicle mane, blue-white eyes, snow falling round it; the figure rears, one hoof raised to stamp.
- **caeldra** (lightning, `#77cfff` with `#fff27a`): a heron made of thunderhead cloud, enormous wingspan, legs like lightning-rods, a
  beak of white light, rain-feathers; the figure folds its wings into a dive, bolts trailing.
- **grundmor** (earth, `#9a8a78` with `#d8c49a`, `#4a3e34`, moss green): a giant of hill and old castle stone, grass and broken walls on its
  shoulders, a rock face with moss brows and amber eyes, a beard of roots, a fortress crest carved into one fist; the figure rises from
  the ground, fist raised.
- **velmoth** (dark, `#3a1050` with `#b060ff`, silver `#e0e0f0`): a moth as wide as the night sky, wings dark and starless with two pale
  moons for eye-spots, a body of soft grey fur dusted with silver, crescent-blade antennae; the figure spreads its wings wide.

### Session S2: the effects (`s2-effects`, 21 sheets)

Paste the spell brief's shared opening (`rpg-spells-art-prompt.md`), then these (its parts and its format: 256 x 256 cells, one row a
part):

- **gs-circle** (neutral gold, tinted per summon in the game): 1) `ground` (6, 8 tiles): a vast summoning circle of runes drawing
  itself, flattened 2:1, seamless loop of turning runes; 2) `impact` (6, 8): the circle flaring and breaking apart into light.
- **gs-tear** (neutral white-violet, tinted): 1) `cast` (8, 4): the sky tearing open, a rift of light with ragged edges, from a thin
  line to a wide gash; 2) `impact` (6, 4): the tear closing to nothing.
- **gs-motes** (neutral): 1) `motes` (6, 0.5): one mote of power for the gathering and the aftermath.
- For each summon, three sheets, in its palette:
  - **gs-`<id>`-sweep**: 1) `beam` (6, 8 long, 2 tall): one segment of the attack sweeping across the board (Ossery a wall of fire; Solenne
    a band of sunrise; Hrimvald a rolling wave of ice; Caeldra a curtain of bolts; Grundmor a running quake with flying rock; Velmoth a
    cutting silver wind through darkness), seamless left and right, tiled across the board.
  - **gs-`<id>`-impact**: 1) `impact` (8, 1.6): the attack on one foe (scorch, sear, freeze-burst, bolt, crushing rock, a silver
    slash), from flash to wisps.
  - **gs-`<id>`-linger**: 1) `ground` (6, 1): the rider on a tile, flattened 2:1, seamless loop (burning ground; light pooling;
    frost-crust; crackling static; cracked stone; a silver mist); 2) `motes` (6, 0.5): its mote on the heroes (embers; light; snow;
    sparks; dust; silver flecks).

### Session S3: the small pictures (`s3-icons`, 38 images)

- **The 27 pieces**, one 128 x 128 icon each, painted as a precious object on a transparent ground: the Kiln-Heart, the Ash Feather,
  the Cinder Crown; the Antler Shard, the Rime Bell, the Frost Window (a pane with a frost stag), the Stag's Consent (a ring of ice);
  the Wick, the Oil of Mercy, the Glass, the Flame, the Lantern's Vow (a ribbon with a seal); the Heron's Eye, the Stormglass, the
  Rain-Oath (a scroll), the Thunder Quill, the Storm's Word (a sealed letter crackling); the Hill's Knuckle, the Hill's Heart, the
  Waking Word (a carved stone), the Rift Stone, the Hill's Leave (a moss-grown key); the Dark Thread, the Moon's Hollow, the Last
  Lamp, the Moth's Name (dust in a vial), the Moon's Bargain (a silver scale).
- **The sigil** (4 images, 256 x 256): the empty ring, the ring a quarter-lit (the game draws the fill as an arc over it), the ring
  full with gold runes, and the rune band alone (the game turns it).
- **The quest giver portraits** (5 images, 256 x 256, painted busts to match the hero portraits): Gwen Tallow (a broad-shouldered
  keeper in her fifties, rolled sleeves, a leather apron, grey braid, a knowing half-smile, a mug in hand), the pedlar, the pilgrim,
  the royal messenger, the frost-bitten hunter.
- **The quest board paper** (2 images, 192 x 256): a pinned notice, and the same with a gold seal (a chain's part).

### Session S4: the beings as bosses (`s4-bosses`, 10 sheets): summons 2 to 6

The trials put the being on the board as a fighter, so each of Hrimvald, Solenne, Caeldra, Grundmor and Velmoth needs a **battle sheet**
in the fighters' format (`src/art/units/sheets.json`: one row an action, frames left to right, facing right). Ossery has no trial and
no sheet.

- **One PNG a being**, `gsb-<id>.png`: a grid of **square 256 x 256 cells**, fully transparent background, the figure seen from the
  side and a little above (the fighters' angle on the board), **facing right**, feet (or lowest point) on the cell's bottom edge at the
  same spot in every frame, the figure filling about 90% of the cell's height (the game draws it about three fighters tall).
- **Rows, in order**: 1) `idle` (6, a slow breathing loop); 2) `walk` (6: a stride, a hover or a glide; it moves little); 3) `attack`
  (6: its basic blow); 4) `attack2` (6: its signature move: the Stamp, Judgement, the Dive, the Quake, Moth Dust); 5) `cast` (6:
  calling adds or a zone); 6) `hurt` (3); 7) `phase` (8, once: the turn at 60% and 30%: it rears, flares its element, and settles
  back); 8) `dead` (8, once: not a death: it **kneels** or folds its wings and bows, ending still and whole, never vanishing).
- In the same painted style and colours as its figure (S1), with a darker outline so it reads on the sunny board; no glow that fills
  the cell.
- The importer cuts each to the sheet format (`w`, `h`, `rows`, `counts`, `figure`, `facesRight`) and adds it to `sheets.json`. Until
  then each being borrows a pack boss's sheet tinted in its colours (the Alpha Wolf for the Stag, the High Priestess's for the Lantern, a
  tengu for the Heron, the Forge Titan for the Hill, the Gorgon Queen for the Moth).
- Each trial's moves use the being's S2 sheets (its sweep, impact and linger) in small, plus one sheet each for its own moves:
  **gsb-`<id>`-moves**: 1) `impact` (6, 1.4): the signature move on a tile; 2) `ground` (6, 1): its zone (Hrimvald's ice, Solenne's
  lantern pool, Caeldra's storm cloud, Grundmor's rising stone, Velmoth's moth dust), flattened 2:1, a seamless loop.
- The boss intro card and the phase cut-ins use the S1 figure: no extra painting.

### Pixel art in the tavern and the camp (from the packs first)

The owner prefers the packs. Before painting, look in `chronos-assets` for: a tavern keeper (the ninja pack's Peasant, LPC villagers),
a noticeboard (the village tileset), and the passersby (LPC, Tiny RPG). Only if no pack sprite fits: **gwen-sprite** in the tavern's
side-view pixel style at its scale (about 48 px tall): idle (4 frames), wipe a mug (6), talk (4); **quest-board** (64 x 64, one
frame); and the four passersby walking (6 frames each) in the camp's isometric style.

---

## Open questions

1. **The sigil and auto-replay.** Should a boss wave in an auto-replay add to the sigil? *Recommended: yes, at a quarter (25 instead
   of 100)*, so the ten daily auto tickets cannot fill it twice a day but auto play still moves it.
2. **The strike's shares.** Ordinary foes fall; elites and mid-bosses lose 65%; final bosses 45%; Calamity guardians 40%. *Recommended:
   as written*; the owner may want the guardians at 45% too (simpler, one rule for every boss).
3. **The heroes not owned.** For an ordinary quest battle: *recommended: not offered until its heroes are owned* (the owner's "as long
   as I have them"). For a summon chain's battle: *recommended: stand-ins from both starter packs*, so a chain is never blocked; the
   story lines are written for whoever fills the slot.
4. **How many quests at once.** *Recommended: at most 3 ordinary quests taken, plus each open chain's part*, and an ordinary quest
   offer lasts 3 days on the board (the chains and Royal charges never expire).
5. **The daily's record.** A summon called in the daily counts towards the day's best as any other play. *Recommended: yes*, the
   owner's "any mode"; the daily is one try a day, so it is a real choice to spend the sigil there.
6. **Gwen Tallow.** A new character for the keeper (name, look and voice above). *Recommended: yes, as written*, with a pack sprite in
   the tavern and a painted portrait for her cards; or the owner may prefer an existing figure behind the bar.
7. **A great summon in a trial.** May the player call a bound summon against a great being? *Recommended: yes, but the being takes
   only 25%* (its adds fall as usual), so the summons already won help with the next trial without carrying it.

## The owner's decisions (after the first draft)

- **The name:** the great summons are **Eidolons**.
- **The gauge is a War Horn** (replacing "the sigil"): a carved ivory horn bound in iron and gold that fills with light; calling the
  Eidolon is blowing the horn. It shows in a fight beside the spell orbs and at the camp.
- **Filling:** 1000 to fill. A boss wave adds 100 (about ten boss waves). **Ordinary foes also count: 100 ordinary foes slain add a
  tenth (1 each).** Auto-replay adds **half** (boss waves 50, foes 0.5).
- **Strike shares kept:** ordinary foes fall; elites and mid-bosses 65%; last bosses 45%; Calamity guardians 40%.
- **Quests that need a particular hero don't show until that hero is owned** (every quest, not only ordinary ones). The Eidolon
  chains therefore only ever ask for heroes from the two starter packs (or none), so no chain can stall.
- **One Eidolon chain at a time**, and **one Eidolon chosen** to answer the horn. Choosing another keeps the horn's fill (one shared
  horn; it never refills or empties on a switch).
- A horn blown in the daily counts towards the day's best. Gwen Tallow is the new keeper. A bound Eidolon may be called in a fight
  against another being, which takes 25%.
- **The six Eidolons' designs are being workshopped** (five ideas each were offered); the art for their figures, effects and boss
  sheets waits on that choice. Part 1 of the art (the horn, the calling's effects, the givers, the board) is asked for now.
