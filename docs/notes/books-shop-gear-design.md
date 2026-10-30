# Skill books, Hester's stall, and gear that wears out (design)

> **A design for the owner to approve.** No game code has changed. The numbers are a first tuning and get measured once it is
> built. The open questions are at the end, each with a recommended answer. (Updated for the owner's later rule that gear found in battle is kept:
> [Gear found in battle comes home](#gear-found-in-battle-comes-home).) The painting briefs are the skill-books-and-shop set
> already sent (book covers, study and mastery icons, Hester, the caravan master, the Gloaming Dealer, the stall, shelves, tags,
> seals, the coin purse) and [gear-art-prompt.md](gear-art-prompt.md) (the equipment icons, grade frames, wear, repair and selling
> pieces).

The owner's asks, in short:

1. **Skill books**: "add skill books that allow heroes to learn and replace their skills. Bought from the store, or better ones
   are found in quests. Make them feel whole and real." The owner's decisions: a book can replace **either skill slot** (never the
   ultimate); learning takes **study**, not an instant; a hero reads **only the kinds suited to its calling**; books cost **crowns
   only** for now; the shop is a **new stall at the camp** that opens its own menu, with a close-up of the stall.
2. **The shop**: a merchant with a face and a voice; shelves of skill books, gear, XP tomes and the chest shop moved in; a daily
   stock from the save's seed (never rerolled), limited copies; standing with the merchant that opens better shelves; visiting
   traders; selling things back for crowns.
3. **Gear durability**: "If gear is going to be purchasable, it needs to be able to break. So it can either be replaced or be
   repaired. Only being damaged while getting used."
4. **Selling gear**: "This means gear should be sellable too for crowns."
5. **New equipment looks**, painted by Antigravity: [gear-art-prompt.md](gear-art-prompt.md).
6. **Gear found in battle is kept**: "Now gear gained in battle should carry over and be kept."

Contents:

- [The player's experience](#the-players-experience) (six walk-throughs)
- [Hester's stall: the system](#hesters-stall-the-system)
- [Skill books: the system](#skill-books-the-system)
- [The books](#the-books) (the kinds, who reads what, the catalogue, the lost techniques)
- [Gear wear and repair: the system](#gear-wear-and-repair-the-system)
- [Gear found in battle comes home](#gear-found-in-battle-comes-home)
- [Selling](#selling)
- [Screens at 393x852](#screens-at-393x852)
- [Balance numbers](#balance-numbers)
- [Saves and determinism](#saves-and-determinism)
- [What each part touches](#what-each-part-touches)
- [Build plan](#build-plan)
- [Open questions](#open-questions)

---

## The player's experience

### 1. Visiting the stall

Back at the camp after a run, there is something new by the fire: a little timber stall with a green and cream striped awning,
shelves of books and bottles, a lantern swinging. Its plate reads **Hester's Stall · new stock** with a gold dot (the stock changed
at midnight). A tap, and the camera closes in: the screen becomes the stall itself. Wooden shelves fill the top of the screen and
**Hester Vane** leans in from the left, spectacles pushed up into her hair:

> *Hester:* "Morning, Your Majesty. Fresh off the cart: two manuals, a pretty little ring, and a gold chest I'd sell my own mother
> for. Well. Rent her."

Under her, a row of tabs (**Books**, **Gear**, **Tomes**, **Chests**, **Sell**, **Repair**) and, under those, the shelf of the
tab chosen: items standing on painted wood, each with a paper price tag. Two copies of a book are marked "2 left". A seal of plain
red wax by her name shows the player's **standing**: a known face. Spend enough here and she trusts the player with the better
shelf (gold-inlaid wood, velvet lining) and her rarer stock. On the seventh day a big laughing man in desert silks is standing beside
her: **Rustam Saffar**, the caravan master, and a **Caravan** tab has appeared for the day.

### 2. Buying and studying a book

The Books shelf has a squat leather manual with a stamped fist on it. A tap brings its page up from the bottom: the cover large,
**Notes on the Whirling Step**, *Common Manual*, and its history in italics:

> *"Copied out by a barbarian's daughter who could not read, from a man who could not write. It works anyway."*

Under it: the skill it teaches (**Whirlwind**: cuts every foe in the 3x3 around the hero), **Study: 5 fights**, and a strip of the
heroes who could read it, owned ones lit (the fighters who use stamina), the ones who already know it greyed with "knows it". The
price tag reads 350. **Buy** and the book is the player's (Hester: "Mind the spine. It bites.").

On Kwame's sheet, the **Skill book** panel shows his two skills in two slots and, below, **Read a book**. He opens it and starts on
the manual. His portrait now wears a small open book and a candle, and the sheet says **Studying: Whirlwind · 5 fights left**. He
fights as before; after each wave he fought in, one fewer. On the recap after the run: "Kwame: Whirlwind, 2 fights left". Two waves
later the recap has a card of its own: the book's emblem rising from its pages, **Kwame learned Whirlwind**.

### 3. Choosing his skills

Kwame's skill book now lists three skills: Shield Wall and Shield Rush (his own) and Whirlwind (learned, one bronze star). He taps
skill slot 1, picks Whirlwind, and the slot changes; Shield Wall stays in the book, greyed, "not in use". He can swap back any
time at the camp, for free, as often as he likes; nothing is ever forgotten. In a fight he casts Whirlwind from his stamina, and
with use it grows: after 30 casts its star turns silver (stronger, cheaper), after 100 gold.

### 4. A piece of gear wearing out, and being mended

Kenji's Runed Blade has a slim bar under its icon. It began full (44 of 44) and drops by one for every wave he fights in. At 11 it
turns amber, and a small cracked-shield badge sits on the icon and on his portrait in the party screen. Before the next run the
party screen says, in an amber strip above Start: **"2 pieces worn · Repair all · 31"**. The player ignores it and goes.

In wave 9 of the Undead Legion the blade reaches nothing. Between waves a line appears: **"Kenji's Runed Blade broke."** The icon
greys under a web of cracks and a red snapped-sword badge; from the next wave it gives him nothing at all (no attack, no crit, no
ability), though he still holds it. Nothing is destroyed.

Back at camp the stall's **Repair** tab lists it first: the hero's face, the blade, the empty red bar, **Repair · 13**. A tap: the
hammer and anvil ring, a gleam runs along the blade and the bar fills. (A worn piece can also be repaired from the hero's own
equipment panel, at the same price.) **Repair all** at the top mends everything the heroes wear in one go.

### 5. Selling the spares

The bag is full of Common pieces from bronze chests. On the **Sell** tab Hester's line changes: "Let's see what the cat dragged
in." The spare pieces are listed (never the ones worn), each with its condition and its price. **Sell all Commons · 9 pieces · 48**
clears them. An Epic Frostbrand asks first: a small card with the coin purse, **"Sell Frostbrand (Epic, Lv 12) for 41?"**,
Sell / Keep. If the player regrets it, it is on the **Sold today** shelf at the bottom until midnight, to buy back at exactly what
Hester paid.

### 6. Gear found in a run comes home

Mid-run, a boss drops a blade. Its card reads **Frostbrand** (the painted icon), **+16% attack**, and under it, "Comes home as Frostbrand
(Rare)". Kenji wears it for the rest of the run. When the run ends, the result card has a row, **Brought home**: the Frostbrand, a
Leather Jerkin and a Lucky Charm, each in its grade frame, and a small button, **Sell the Commons · 5**. Back at camp the Frostbrand
is in the stash at full durability, ready to wear for good.

---

## Hester's stall: the system

### Where it is

A new **place** at the camp (`campSpots.ts` `places`, beside the Tower, the Daily board and the Calamity portal): the stall
picture (`stall/shop-stall`, about 384 px painted, drawn at the camp's scale) on the right of the fire, between the fire and the
Daily board, with a name plate under it (the places' 108 x 52 plate: "Hester's Stall" / "new stock" / "Caravan today" / "Gloaming
Dealer"). The tap box covers picture and plate (at least 96 x 96 scene pixels; the places' test checks plates stay on screen and
apart). A gold dot when the stock is new today and has not been looked at. Placeholder until the painting lands: a pack market
stall (the Knights' or the Orcs' stall already cut for the camp).

The **Recruit tab's "Chest shop" button stays** as a shortcut: it opens the stall on its Chests tab.

### The merchant

**Hester Vane**: sharp-eyed, in her forties, green velvet coat and brass buttons, a ledger under her arm, spectacles in auburn
curls. Dry, warm, shrewd; she likes the player and likes their crowns more. She speaks one line each time the stall opens and on
each tab, drawn from a small set by a side stream of the day (so a line is the same on a reload), and a line on a big purchase, a
sale, a repair, a new standing. A few:

- Opening: "Morning, Your Majesty. Don't touch the ones that hum." · "Everything's genuine. Mostly." · "Back again? I'll put the
  kettle on."
- Books: "Every one of these was somebody's whole life. Mind the margins." · "Read it twice. Fight with it once."
- Gear: "Swords, sir, ma'am, Majesty. Sharp end goes at the enemy."
- Repair: "Who've you been hitting with this?" · "Good as new. Better, actually. Don't tell the smith."
- Sell: "Let's see what the cat dragged in." · "I'll give you a fair price. Fair for me."
- Standing 2: "You're good for it. I'll show you the back shelf." Standing 3: "Between friends, then. Come and see what I don't
  put out."

### The shelves and the daily stock

The stock is drawn once a day from `mixSeed(m.seed, STALL_SALT, day)` (the day is the page's `todayKey()`, passed in, as the daily
and the auto tickets do), so the same save sees the same shelves all day and a reload never rerolls them. Each ware on a shelf has
**a number of copies**; buying the last shows the sold-out ribbon.

| Tab | What | Copies a day | Standing |
| --- | --- | --- | --- |
| **Books** | 2 Common books, plus 1 Uncommon at standing 2 and a second Uncommon at standing 3 | 1 each (a Common may come as 2) | Common at 1 |
| **Gear** | 3 pieces, one a slot: Common or Rare at standing 1; one of the three Epic at standing 2; one Legendary at standing 3 | 1 each | see left |
| **Tomes** | small XP tomes; a medium at standing 2; a large at standing 3 | 3 small, 1 medium, 1 large | see left |
| **Chests** | the chest shop exactly as now (`chestShop.ts`: bronze, silver, gold, the same prices, stock and contents) | as now | 1 |
| **Sell** | the player's spare gear and spare books ([Selling](#selling)), and the Sold today shelf | | 1 |
| **Repair** | everything worn or broken, worn pieces first ([Repair](#repair)) | | 1 |

- **Books on the shelf** are drawn only from kinds that at least one owned hero can read, and never one that every owned reader
  already knows, so the shelf is never all dead stock.
- **Gear on the shelf** is rolled with `rollEquipment` at the stall's grade and an item level of `1 + 3 x` the furthest army cleared
  (`shopArmyIndex`, as the gear balance tool assumes), so the stall keeps up with the save.
- The chest shop keeps its own state (`Meta.shop`) and its own stream; nothing about it changes but where it opens.

### Standing

Standing is how much Hester trusts the player: the crowns **spent** at the stall (buying and repairing; selling and buying back do
not count), kept as `Meta.stall.spent`.

| Standing | Seal | Spent | Opens |
| --- | --- | --- | --- |
| 1, **A known face** | `standing-1` (plain red wax) | 0 | Common books, Common and Rare gear, small tomes, the chests, selling, repairs |
| 2, **A valued customer** | `standing-2` (red wax, silver ring) | 4,000 | the better shelf (`shelf-rare`): Uncommon books, an Epic piece of gear, a medium tome; the caravan's Rare book |
| 3, **A trusted friend** | `standing-3` (gold wax, a jewel) | 20,000 | a second Uncommon book, a Legendary piece, a large tome; Hester's own quest (the fifth lost technique, later) |

Reaching a standing plays a short beat: the seal stamped on the ribbon, Hester's line, and the new shelf sliding in.

### Visiting traders

- **Rustam Saffar, the caravan master** comes **one day a week**, the save's own caravan day (`mixSeed(m.seed, CARAVAN_SALT) % 7`
  as a weekday, so different saves meet him on different days). A **Caravan** tab joins the row for that day, with his portrait and
  his lines ("Saffron, silk, steel, and a book that walked here on its own, my friend!"). He sells **one Rare book** (standing 2),
  **two Epic pieces** (one at standing 1, one at standing 2) and an **awakening ore bundle** (`awakenMats.ts`). Drawn from
  `mixSeed(m.seed, CARAVAN_SALT, week)`.
- **The Gloaming Dealer** appears for the rest of the day **after a Calamity guardian falls** (the Calamity's settle sets
  `Meta.stall.gloaming = day`). A hooded figure in grey and violet; a **Gloaming** tab, its shelf darker. Few words ("You came back
  from the rift. Most don't. Buy something to remember it by."). He sells **one universal Rare book**, **one Legendary piece** at
  twice the stall's price, and, the first time, a **chained page**: the opening of the Grimoire's lost technique
  ([below](#the-lost-techniques)). Drawn from `mixSeed(m.seed, GLOAMING_SALT, guardiansFelled)`.

---

## Skill books: the system

### What a book is

A **book** teaches one skill. It has a cover (its kind and rarity), a title, a line of history, the skill, and a study length.

```ts
// src/sim/bookData.ts (pure data)
type BookKind = 'manual' | 'grimoire' | 'hymnal' | 'bestiary' | 'universal';
type BookRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
interface BookDef {
  id: string;            // 'whirlingStep'
  title: string;         // 'Notes on the Whirling Step'
  kind: BookKind;
  rarity: BookRarity;
  history: string;       // the line in italics
  skill: Skill;          // the same Skill object a hero kit uses (its cast, painting and key)
  /** Its strength (times the reader's attack, as a kit slot's `tune`) and its cost as a share of the reader's pool. */
  tune: number; cost: number;
  /** A legendary's quest chain (`questData.ts`). */
  quest?: string;
}
```

Books in the bag are counts (`Meta.books`: `bookId -> copies`). Reading one uses it up.

### Who reads what

The owner's rule: only the kinds suited to a hero's calling. Each hero reads **one kind, plus the universal books**:

| Kind | Who | The heroes |
| --- | --- | --- |
| **Manual** (stamina skills) | fighters who use stamina, not monsters (22) | Knight, Samurai, Kunoichi, Archer, Peasant, Ninja Monk, Samurai Commander, Barbarian, Ranger, Gunslinger, Rifle Bot, Mercenary, Buccaneer, Beastmaster, Lancer, Reaper, Arc Blade, Dread Pirate, Siege Bot, Queen Dragoon, Juggernaut, Demon Swordsman |
| **Grimoire** (mana spells) | casters who use mana, not healers or monsters (5) | Fire Wizard, Lightning Mage, Warlock, Illusionist, Tyrant |
| **Hymnal** (healing and support) | the healers and supports (8) | Cleric, High Priestess, Wanderer, Druid, Paladin, Wolf Bard, Time Witch, Great Sage |
| **Bestiary** (monster moves) | the monster heroes (10) | Kitsune, Karasu Tengu, Yamabushi Tengu, Werewolf, Minotaur, Satyr, Gorgon, Shambler, Mummy, Kraken Mate |
| **Universal** | everyone | |

A book's cost is a share of the reader's own pool (`cost` 0.5 is half a pool: 30 stamina or 50 mana), so a Hymnal or Bestiary skill
works on a mana hero and a stamina hero alike. The list lives in one table (`READS` in `bookData.ts`), so it is one line to change.

### Study

- A hero reads a book from its sheet (**Read a book**: the unread books it can read). Reading starts **study**: `Meta.study[kind] =
  { book, done }` (fights studied so far). One book at a time for each hero; a hero can stop and pick it up again later (the progress is kept with the
  book's id), or change books (the first book goes back to the bag, unspent, with its progress kept).
- **One fight is one wave the hero fought in** (placed on the board when the wave settles, won or lost), in any mode: the armies,
  auto-replay, the daily, the tower, the Calamity, the Last Stand, quest battles. Counted in the same settle step as XP.
- **Lengths**: Common 5, Uncommon 8, Rare 12, Legendary 20 fights (`STUDY`), less with the library.
- **The library** (the castle's Library, now "+6% XP from every fight; study goes faster, and more heroes can study at once"):
  each level cuts study by 8% (rounded up, at least 1), and **students** (heroes studying at once) are 1 with no library, 2 from
  level 1, 3 from level 3, 4 at level 5.
- **Done**: the skill joins the hero's skill book (`Meta.learned[kind]`), and a "learned" card plays on the next recap.
- A hero cannot read a book whose skill it already knows (its own two, or one learned). The shelf and the picker say "knows it".

### The hero's skill book and the two slots

- Each hero kind has a **skill book** of every skill it knows: its own two and every one it learned. **Nothing is ever deleted.**
- It **chooses two to use**: `Meta.loadout[kind] = [slot1, slot2]`, each `'own1'`, `'own2'` or a book id; missing means its own
  two, so every hero plays as now until the player changes it.
- **Either slot** takes any known skill (the owner's decision 1). Slot 2 still opens at level 10, the ultimate is never touched.
  The same skill cannot sit in both.
- **Swapping is free, at camp, any time** (not in a fight or between a run's waves: the run takes a snapshot when it starts, as it
  does for the castle).
- **What stays tied to the hero's own skills:** the **tier 2 and 3** versions (`tierSkills.ts`) upgrade only the hero's own skill 1;
  a book skill in slot 1 has no tier versions (its mastery is its growth). A healer's **revive face** belongs to its own skill 2:
  swapping that skill out loses the revive, and the picker says so in plain words ("Selam can raise the fallen only with Prayer of
  Healing in use"). Talents and gear that act on "skill 2" act on whatever is in slot 2.

### Mastery

- Every **learned** skill has a rank of 1 to 3 (bronze, silver, gold stars: `study/mastery-1..3`), from its casts by that hero
  (counted at settle from the fight's `skill` events): **rank 2 at 30 casts, rank 3 at 100**.
- Rank 2: **+8% strength, 10% cheaper**. Rank 3: **+15% strength, 20% cheaper**.
- A hero's own two skills keep the growth they have (levels, tiers, talents); see [open question 1](#open-questions).

### In a fight

`boostOf` gains the kind's loadout: `Boost.kit?: { s1?: Slot; s2?: Slot }`, built from the book's `Skill`, `tune` (with mastery),
and `cost` times the hero's pool. `addUnit` uses it in place of the kit's slot. A hero with no loadout gets no `Boost.kit` and fights
exactly as now (a test hashes fights against main). The AI (`castHero`) is unchanged: it reads each slot's own checks. Nothing
draws from any stream.

---

## The books

### The four kinds and their look

- **Manual**: steel grey and leather brown, a sword or fist emblem. Fighters' techniques.
- **Grimoire**: deep violet and blue, an arcane sigil. Spells.
- **Hymnal**: white and gold, a sun or dove. Prayers and songs.
- **Bestiary**: blood red and dark green, hide-bound, a claw or fang. A beast's moves, learned from the beast.
- **Universal**: amber and bronze, a compass rose. Anyone's.

Covers: `books/<kind>-common`, `-rare`, `-legendary`, and `universal-rare`, `universal-legendary`. An **Uncommon** book uses its
kind's common cover in a blue frame; the frames follow the gear's grade frames (Common grey, Uncommon blue `frame-rare`, Rare
violet `frame-epic`, Legendary gold `frame-legendary`), so books and gear speak one colour language.

### The first catalogue

Each book teaches an existing kit skill (the same cast, painting and rules), at its own strength. A hero who already has the skill
as its own cannot read it.

| Book | Kind | Rarity | Teaches (from) | History | Study | Price |
| --- | --- | --- | --- | --- | --- | --- |
| Notes on the Whirling Step | Manual | Common | Whirlwind (Barbarian) | Copied out by a barbarian's daughter who could not read, from a man who could not write. It works anyway. | 5 | 350 |
| The Shieldwall Drill | Manual | Common | Shield Rush (Knight) | The drill book of the Dawn Watch, every page stamped "do not lend". It was lent. | 5 | 350 |
| A Boatswain's Hook | Manual | Common | Grappling Hook (Buccaneer) | Half a sea chart, half a knot book; the knots are the useful half. | 5 | 350 |
| The Bounty Ledger | Manual | Uncommon | Hunter's Mark (Mercenary) | A hunter's accounts: names, prices, and a neat line through each. | 8 | 900 |
| A Trapper's Almanac | Manual | Uncommon | Spike Growth (Ranger) | Where the deer walk, when the frost comes, and where to leave the iron. | 8 | 900 |
| The Riverbank Iaido | Manual | Rare | Iaido (Samurai) | Twelve pages, one cut. A swordsman by a river wrote it over forty years. | 12 | (found) |
| First Fires | Grimoire | Common | Fireball (Fire Wizard) | Every apprentice's first spellbook, its corners singed by every apprentice. | 5 | 350 |
| Of Forked Skies | Grimoire | Uncommon | Chain Lightning (Lightning Mage) | Written in a tower struck nine times. The author was in it for six. | 8 | 900 |
| The Pact Primer | Grimoire | Uncommon | Eldritch Blast (Warlock) | It asks for a signature on the first page. Don't. | 8 | 900 |
| The Burning Wall | Grimoire | Rare | Wall of Fire (Fire Wizard) | The siege notes of a mage who held a gate alone for a night. | 12 | (found) |
| Morning Prayers | Hymnal | Common | Prayer of Healing (Cleric; the revive face stays with the Cleric) | A village chapel's hymnal, the hymns for wounds marked with ribbons. | 5 | 350 |
| The Warden's Psalter | Hymnal | Uncommon | Aura of Protection (Paladin) | Sung by the order's wardens on the walls at night, so the walls would hear. | 8 | 900 |
| Last Rites, Unsaid | Hymnal | Rare | Death Ward (High Priestess) | A priest's book of the prayers for the dying, with one prayer crossed out and a better one written in. | 12 | (found) |
| What the Mountain Breathes | Bestiary | Common | Wind Gust (Yamabushi Tengu) | A tengu's tally of the winds on one mountain, in feathers stuck to the page. | 5 | 350 |
| Tidepool Notes | Bestiary | Uncommon | Undertow (Kraken Mate) | Water-stained, and still damp. It always is. | 8 | 900 |
| The Labyrinth's Lesson | Bestiary | Uncommon | Bull Rush (Minotaur) | Hoof-prints, mostly, in a careful order. | 8 | 900 |
| The Gorgon's Mirror | Bestiary | Rare | Flesh to Stone (Gorgon) | Read it in a mirror. The scholar who didn't is the bookend. | 12 | (found) |
| The Illusionist's Pocketbook | Universal | Rare | Mirror Image (Illusionist) | There are two of these. Or one. It depends who's looking. | 12 | (found) |
| A Well of Stars | Universal | Rare | Font of Magic (Great Sage) | A sage's diary of the nights the sky gave more than it took. | 12 | (found) |

Prices are at the first army and grow with the save (see [Balance](#balance-numbers)). **Rare books are found**: in gold chests
(15%) and silver chests (5%), drawn from the chest's own book stream (`BOOK_SALT`, after everything else, so no chest's other
contents change); one on the first clear of each army's tier from Hard up; and the caravan's one a week.

### The lost techniques

Legendary books are **never sold**. Each is the end of its own quest chain (`questData.ts`, in the quests design's machinery: the
givers, the log, the goals and the quest battles with a required hero), and the chain's last part is a quest battle. Following the
owner's rule for quests, a chain that needs a hero is only offered once that hero is owned. A lost technique is about **10% above**
the kits' band (see Balance), and takes 20 fights to study. Each has a skill of its own, built from the movement toolkit.

1. **The Ninefold Cut** (Manual). *"The Bridge School taught one cut for nine hundred years. Its last student kept the book and lost
   the school."*
   - **The skill**: blinks from foe to foe, up to four in turn (the nearest unstruck foe each time, within 3), cutting each; the last
     cut is double and bleeds. Toolkit: `charge` (`route: 'leap'`) chained, the blink look.
   - **The chain** (giver: **Kenji**, at the tavern, with a "!"; needs Kenji owned and level 30): (1) win 15 waves with Kenji on the
     field and never falling; (2) take the torn scroll to Hester (a `visit`: she reads its maker's mark and names the school); (3)
     quest battle **The Empty Dojo**, Kenji required: a ruined hall on the hill layout, three waves of yokai, the boss **the Last
     Master**, a pale samurai ghost (the Samurai Commander's look, ghost-tinted) who blinks between his students.
   - *After.* The ghost sheathes his sword and bows. "Nine hundred years, and I finally lost." Kenji keeps the book.
2. **Words of Unmaking** (Grimoire). *"A page from a book that was never written, in a library that was never built. It is very
   heavy."*
   - **The skill**: a line of void 4 tiles long across the thickest lane for 4 s: foes in it lose their shields and good effects, are
     slowed, and take a quarter more from spells while marked. Toolkit: a wall (`walls`) that blocks nothing, with the mark.
   - **The chain** (giver: **the Gloaming Dealer**, his chained page): (1) win a Calamity crossing with a Grimoire reader on the
     field; (2) fell a Calamity guardian; (3) quest battle **The Unwritten Library**, Ravi (the Fire Wizard) required: a dark arena
     of shelves, two waves of the rift's things, the boss **the Index**, a floating book-golem that walls tiles off.
   - *After.* Ravi: "It's blank. Every page." He turns it over. "No. It's just written on the other side of something."
3. **The Hymn of the Long Dawn** (Hymnal). *"Sung once, at a siege that should have been lost. Nobody wrote down the tune; the
   wounded remembered it."*
   - **The skill**: for 4 s every ally within 3 heals each second and cannot fall below 1 health; once a wave. Toolkit: an `aura`.
   - **The chain** (giver: **the ruler**, a Royal charge; needs a Hymnal reader owned): (1) heal 20,000 across fights with Hymnal
     readers; (2) reach the chapel in the Last Stand's retreat; (3) quest battle **Matins at the Chapel**, Selam (the Cleric) or,
     not owned, Linnea (the High Priestess) required: the chapel at dawn, four waves of the Undead Legion, no boss but a last wave
     that never stops until the sun is up (survive 60 s).
   - *After.* The ruler: "You sang it." Selam: "We didn't know the words. The wounded did."
4. **The Old Hunger** (Bestiary). *"Not a book. A hide, scratched with claws, rolled and tied. Whatever wrote it was very hungry and
   very patient."*
   - **The skill**: leaps on the hardest-hitting foe within 5, pins it for 2 s, shoves every other foe within 2 two tiles away, and
     heals 8% for each foe struck. Toolkit: `charge` (`'leap'`), `displace` (`shove`).
   - **The chain** (giver: **a frost-bitten hunter**, a passerby; needs a monster hero owned): (1) fell 40 beasts of the Beast Packs;
     (2) win 5 Wildwood waves with a monster hero on the field; (3) quest battle **The Den Beneath the Snow**, Vuk (the Werewolf)
     required: the snow field, three waves of frost wolves, the boss **the Grandmother Wolf**, huge and white, who calls her pack.
   - *After.* The hunter, a long way off: "She's let you have it, then. Don't waste it."
5. *(Later.)* **The Keeper's Last Lesson** (Universal): Hester's own quest at standing 3, the stall's oldest book.

---

## Gear wear and repair: the system

### What wears, and when

Gear wears **only when it is used in a fight** (the owner's rule), counted when a wave settles:

- every piece worn by a hero **placed on the board** loses **1 point** for the wave, won or lost;
- a hero who **falls** in the wave loses **1 more on its armour** (the knock);
- **auto-replay** waves wear at **half** (`AUTO_WEAR` 0.5, kept as a fraction in the save), as the War Horn fills at half;
- heroes left on the bench, in the party but not placed, and a hero not in the run lose nothing.

**Why waves, not blows or swings.** Blows taken vary five times over between a Knight in front and a healer at the back, so the
Knight's armour would break in a few waves while the back row's lasted for ever; swings punish fast attackers for being fast. A
wave is the same for every hero, so a piece's durability reads plainly as "about 40 waves", and the fall makes losing hurt a
little more, as it should.

### Durability, by grade

`maxDurability = DUR[rarity] + item level` (Common 30, Rare 40, Epic 55, Legendary 70, Mythic 90; so 31 to 110). A better piece
lasts longer and costs more to mend. Stored as **wear** (points lost: `Equipment.wear?`), so a missing value is a full piece and the
numbers can be retuned without touching saves.

### What happens as it wears

| State | Durability | What it gives | Shown |
| --- | --- | --- | --- |
| Good | above 25% | everything | the bar, green |
| **Worn** | 25% or less | everything | the bar amber, the `badge-worn` on the icon and on the hero's portrait, the `wear-worn` overlay |
| **Broken** | 0 | **nothing**: no main stats, no ability, no set count | the bar empty red, `badge-broken`, the `wear-broken` overlay over a greyed icon |

Nothing is ever destroyed by wear (see [open question 6](#open-questions) for a gradual loss, recommended against). A broken piece
can still be repaired, sold (cheaply), combined, or swapped off.

**Breaking in a run.** The run's boost is read each time a hero is placed, so a piece that breaks counts from the next wave. The
between-waves line says so ("Kenji's Runed Blade broke"). No repair in the middle of a run in the first batches ([open question
5](#open-questions)).

### Repair

- **Where**: the stall's **Repair** tab (everything worn or broken, those worn by heroes in the saved party first, then the rest
  worn by heroes, then spares), and a **Repair** button in a hero's equipment picker for that piece. Same price both ways.
- **Cost**: by points missing, `REPAIR[rarity] x (1 + 0.04 x (level - 1)) x points` (Common 0.2, Rare 0.25, Epic 0.35, Legendary 0.45,
  Mythic 0.55 a point), rounded up, at least 1; less with the castle's **Armoury** (4% a level, [open question
  4](#open-questions)). A repair always mends to full.
- **Repair all**: everything worn by any hero, one price, one tap (no confirm under 500 crowns; a confirm above).
- **Before a run**: the party screen shows an amber strip when a party hero wears a worn or broken piece: "2 pieces worn, 1 broken ·
  Repair all · 120" (a tap repairs the party's pieces). Start is never blocked.
- **Auto-replay**: the auto-replay card shows the same strip before it starts. Under auto, a piece that breaks just stops counting
  (the recap lists "broke during auto: Runed Blade"); auto does not spend crowns by itself.
- **Combining** three pieces makes a new piece at full durability (the parts' wear is lost), so broken spares still have a use.
- **Replacing**: buy a new piece at the stall, or wear another; "Equip best" (`bestFor`) skips broken pieces and scores worn ones as
  usual.

### Old saves

Every piece in an old save has no `wear`, so it is **full**. Nothing changes for a fight until a piece has worn out.

---

## Gear found in battle comes home

The owner's rule: "Now gear gained in battle should carry over and be kept." Today a run hands out its own simple gear (`gear.ts`: a
weapon, an armour and a charm in three tiers, from boss stages, events, mystery rooms and the passing cart), which is lost when the
run ends.

### The recommendation: keep the run's gear as it plays, and bring it home as real pieces

- **In the run nothing changes**: the pieces drop, upgrade (events, mystery rooms), move between heroes and are worn exactly as now
  (`equipBestRun`, the tiers' +8% a tier), so every run, event and balance table plays out the same.
- **Each in-run piece is already a real piece in waiting.** Its lasting **base** is fixed the moment it drops, from its id:
  `carryBase(run.seed, gear)` draws one of the slot's 20 bases from `mixSeed(run.seed, CARRY_SALT, gear.id)` (weapon to weapon,
  armour to armour, charm to trinket). An upgrade keeps the id, so it keeps the base. **The run shows it by that base's name and
  icon** ("Frostbrand", the painted icon) with its in-run numbers ("+16% attack"), so what the player sees in the run is what goes
  home. (So the in-run gear needs no icons of its own: section F of the art prompt is dropped.)
- **When the run ends** (won, lost, or given up; any mode that hands out in-run gear: armies, the daily, the tower, the Calamity, quest
  battles), the pieces it **ended with** (worn by its heroes or in its pack) come home. A piece sold or lost in a merge during the run
  does not.
- **How many**: the **best 3** (by tier, then the latest found) for a run played by hand, the **best 1** for an auto-replay run. The
  rest stay with the run, as now. (Why a cap: a long run can end with 8 or 9 pieces, and ten auto runs a day would pour 80 pieces
  into the stash.)
- **Grade** from the in-run tier and the army's tier:

  | In-run tier | Grade at home | On Elite and above |
  | --- | --- | --- |
  | 1 (Iron Blade, Leather Coat, Jade Charm) | Common | Rare |
  | 2 | Rare | Epic |
  | 3 | Rare; Epic one time in six (the same stream) | Epic; Legendary one time in six |

  Never Mythic: Mythic stays a chest's and a combine's prize.
- **Item level** as the stall's: `1 + 3 x` the furthest army cleared, at most 20.
- **Full durability**: a piece brought home has no wear.
- **Automatic**: they go straight to the stash, no choice to make at the run's end (the run's end is already busy, and auto-replay
  has nobody to ask). The run-end card shows them, and offers to sell the Commons there and then.

The other way (the owner may prefer it, [open question 7](#open-questions)): **replace the in-run gear with real pieces** that drop in
the run and are worn at once, lasting stats and all. It is simpler to explain, but every event, mystery room and cart that hands out
or upgrades in-run gear would have to be redone, every run's balance would move (a lasting Legendary is worth more than an in-run
tier 3), and a run could be won or lost on what the stash already holds. Recommended against.

### The stash and what happens when it is full

- The stash (every spare piece: `spareEquipment`) holds **150 pieces** (`STASH_MAX`); the equipment panel and the stall's Sell tab
  show "112 / 150".
- Pieces that come home to a full stash wait **on the cart** (the camp's cart, beside the chests): up to **20** more, with a red
  "full" tag on the cart and the stall's Sell tab ("Your stash is full: 6 pieces wait on the cart"). Selling or combining makes room,
  and the cart's pieces move in at once, best first.
- Past that, the lowest-graded of the new pieces are **sold for their price** and the run-end card says so ("Stash full: 3 Commons
  sold for 15 crowns"), so nothing found is ever lost for nothing.
- Pieces a hero is wearing never count against the stash; old saves above 150 keep everything (nothing new comes home until there is room).

### The run's end

The result card (and the auto-replay recap) gains a **Brought home** row: up to three icons in their grade frames, "Frostbrand (Rare,
Lv 13)", a tap for the piece's card (stats, the base's ability at Epic and up, its set); and, when any are Common, **Sell the Commons ·
10**. In auto-replay the recap lists each run's piece. Mid-run, a piece's card says "Comes home as Frostbrand (Rare)" when the run's
best three would include it.

### The economy with more gear coming in

- **How much comes in**: a hand-played army run ends with about 3 to 6 pieces, so 3 come home; a late day of ten auto runs and a few
  by hand brings about **20 pieces a day**, mostly Rare (a few Epic, Legendary only on Elite and up).
- **What selling them adds**: about 12 to 30 crowns each, so about **300 to 400 crowns a day** late (about 5% of a late day's
  7,000), and 30 to 60 a day early. The loop rules are untouched: found gear is free, so selling it is income, not a loop; the stall's
  prices, repairs and buy-back are unchanged.
- **What it does to the other sources**: the chests' gear stays as it is (they are the way to Legendary and Mythic). The stall's gear
  shelf is still worth it: it is the only way to pick a base and a grade. Combining gets busier (three Rares of a base make an Epic),
  which is the intended road to the better grades.
- **Upkeep is unchanged**: only worn pieces wear, and a party wears 15 whatever is in the stash.

### Old saves

Nothing is back-paid for runs already over. A run saved mid-way (`legends.run`) brings its pieces home when it ends, its bases drawn
from their ids as for any run. `Meta.cart?: Equipment[]` (the overflow) is optional.

---

## Selling

### What can be sold

- **Any spare piece of gear** (not worn by a hero; a locked id is never offered). **Selling replaces Salvage**: the equipment
  panel's Salvage button becomes **Sell** and pays the same as salvage did for a full piece, so nothing a player knows gets worse.
- **Spare books** (unread copies): Common and Uncommon at 20% of the shelf price, Rare at 400. **Legendary books cannot be sold**
  (a quest's prize).
- XP tomes, chests and summoning stones cannot be sold (they are the currencies' own sinks).

### The price

`sell = (SELL[rarity] + level - 1) x condition`, rounded down, at least 1 (`SELL` = today's `SALVAGE_CROWNS`: Common 5, Rare 12,
Epic 30, Legendary 70, Mythic 150).

- **Condition**: `0.8 + 0.2 x (durability left / max)`: a full piece sells for its whole price, a worn one for about 85%, a broken one
  for **80%**. The gap is kept small on purpose: it must always be less than a repair costs, so mending a piece only to sell it
  never pays (see the next table).
- **The base** does not change the price: the 60 bases are balanced against each other, so none is worth more. A set piece carries
  no premium. Gear has no enchanting or awakening of its own today; if that comes, a piece sells for a quarter more of what the
  enchanting cost.

### Confirms, bulk-selling, and mistakes

- **Confirm**: selling an Epic or better piece, or the last piece of a base the player owns, asks first (a small card with the coin
  purse and the price: Sell / Keep). Common and Rare sell with one tap.
- **Bulk**: **Sell all Commons** (the count and the total on the button, one confirm); a second **Sell all Rares** shows once the
  player has 10 or more spare Rares. Neither ever sells a worn piece, a locked piece, the last of a base, or a piece of a set a
  hero wears.
- **Mistakes**: the **Sold today** shelf at the bottom of the Sell tab keeps the last 10 pieces sold today (with their wear) until
  midnight, to **buy back at exactly the price paid**. Buying back does not count for standing.

### No crowns loop

The stall must never pay out more than it takes in for the same thing. The rules that make sure:

| Loop | Why it fails |
| --- | --- |
| Buy at the stall, sell back | the stall's buy price is 16 to 21 times the sell price at item level 1 (Common 80 against 5, Legendary 1,500 against 70), and never under 5 times at level 20 |
| Repair, then sell for more | repairing raises the sell price by at most a fifth, and a repair to full always costs more than that (a broken Mythic Lv 20 sells for 135 and for 169 mended, a gain of 34; the repair is 107. A broken Common Lv 1: 4 and 5, a gain of 1; the repair is 7) |
| Combine bought pieces, sell the result | three Commons sell for 15, a Rare for 12; three bought Commons cost 240, a Rare at the stall 200 |
| Sell, buy back, repeat for standing | buying back is at the price paid and counts for nothing |
| Chest gear sold for crowns | as salvage pays today: unchanged |

A test checks the first three inequalities for every grade and level, so a later retune cannot open a loop.

---

## Screens at 393x852

All text 12 px or more and never bold under 12 px, as the menus are now; everything upright; safe areas kept.

### The camp

The stall stands right of the fire, between the fire and the Daily board, its plate below it ("Hester's Stall" / "new stock"),
the gold dot on the plate when the stock is new. It does not cover the party's spots or the war table (checked at 360, 393 and 412
wide, as the places are).

### The stall's menu (a full-screen view, `#stall`)

```
+-----------------------------------------+  0
| <  Hester's Stall        [seal]  12,480 c|  48 px: back, title (24 px display), standing seal 32 px, the purse
+-----------------------------------------+
|                                         |
|  [Hester's bust,   "Morning, Your       |  240 px: the close-up. The painted shelf (shelf, or shelf-rare at
|   180 px, bottom   Majesty. Don't touch  |  standing 2+) fills it; Hester's bust stands at the left, cut off at
|   left]            the ones that hum."  |  the bottom; her line in a speech card at the right, typed out, 12 px.
|                                         |  The caravan master or the Dealer stands at the right on their day.
+-----------------------------------------+  288
| Books Gear Tomes Chests Sell Repair (Car)|  44 px: tab pills, an icon over a 12 px label, a gold dot on a tab
+-----------------------------------------+  with something new; the row scrolls sideways when a trader adds a 7th
|  +-------+ +-------+ +-------+          |
|  | cover | | cover | | cover |          |  The shelf of the tab: a 3-column grid of wares, each 116 x 156:
|  | 72 px | | 72 px | | 72 px |          |  the art (72 px) in its grade frame, its name (two lines at most),
|  |  name | |  name | |  name |          |  the price tag (price-tag art with the price written on it), and
|  | [350] | | [900] | | [SOLD]|          |  "2 left" or the sold-out ribbon. The wares stand on painted
|  +-------+ +-------+ +-------+          |  shelf planks; the area scrolls under the tabs.
|  ...                                    |
+-----------------------------------------+  852 (minus the safe area)
```

- **A ware's page** (a sheet from the bottom, up to 70% of the height): the art at 128 px, the name (24 px), the grade and kind, then
  - a book: its history (italic), the skill it teaches in plain words, "Study: 5 fights" (with the library's cut shown), the
    readers' strip (owned readers' portraits at 32 px, lit; "knows it" over those who do; a line "No hero of yours can read
    Grimoires yet" when none);
  - a piece of gear: its stats against what each owned hero of its calling wears (the picker's green and red), its durability, its
    ability or "Epic and up: ...";
  - a tome or a chest: what it holds, as now;
  - **Buy · 350** (48 px tall, the shop's button), greyed with the reason ("Needs 120 more crowns", "Sold out", "Standing 2").
- **Sell tab**: filter pills (All · Common · Rare · Epic+ · Books), rows of 64 px (icon in its frame with the wear badge, name and
  level, condition "Worn · 8/44", the price and Sell). At the bottom of the list, **Sell all Commons · 9 · 48** and then the **Sold
  today** shelf (a single row of icons with their buy-back prices, the `buy-back` sign).
- **Repair tab**: **Repair all · 340** at the top (the `repair-all` icon); rows of 64 px: the wearer's face (32 px), the piece, its
  bar, **Repair · 13** (the `repair` icon). A repaired row plays the `repaired` gleam and slides away. Empty: Hester, "Nothing's
  broken. Go and break something."
- **Caravan / Gloaming**: the same shelf view, with the trader's portrait in the close-up and their line.
- Reduced motion: no typing-out, no slides; the gleam is shown still.

### The hero sheet

- **Skill book** panel (under the skills, above the equipment): two slot cards (Skill 1, Skill 2, each 64 px: the skill's icon,
  name, "own" or the book's cover in small, mastery stars) and a tap opens the **picker**: every known skill, own ones first, a
  learned one with its stars and its casts to the next ("Whirlwind · 12/30 to silver"), and **Use as skill 1 / 2**. Under the slots:
  **Studying: Whirlwind · 3 fights left** (the `study/studying` icon and a bar), or **Read a book** (a list of the unread books this
  hero can read; a student cap reached says "The library has room for 2 students: Kwame and Ayame are reading").
- **Equipment** panel: a durability bar (4 px) under each slot's icon, the badges, and **Repair · 13** in the picker for a worn
  piece; **Salvage** becomes **Sell**.

### Elsewhere

- **Party screen**: the amber strip above Start when party gear is worn or broken; the badges on the heroes' portraits.
- **Between waves**: "Kenji's Runed Blade broke" in the wave card's notes.
- **The recap**: lines "Kwame: Whirlwind, 2 fights left"; a "learned" card (the `study/learned` art and the skill's name); "Runed
  Blade is worn"; "broke during auto".

Mock-ups: none with this note (the layout above is exact enough to build from; the first build batch will screenshot the real
screen at 393x852, 360x780 and 412x915).

---

## Balance numbers

### Book skills (the kits' band)

- A book skill's `tune` is set so that a hero using it in either slot stays in the kits' parity band (none beyond 6 points of the
  average at levels 1, 10 and 30, as the RPG-SPELLS batches measured), for **every** hero who can read it. Measured with a new
  `--books` switch on `npm run balance -- --heroes-only` (each reader with each book in slot 1 and in slot 2) and a test like
  `hero-balance.test.ts` for the catalogue.
- A **lost technique** may stand up to **2 points above** the hero's own best loadout (about 10% stronger), no more.
- **Mastery** at rank 3 (+15%, 20% cheaper) is counted inside the band for Common to Rare books (they are tuned so rank 3 is the
  band's top), and inside the 2 points for the lost techniques.

### Study lengths

| Rarity | Fights (waves) | With a level 5 library (-40%) | About |
| --- | --- | --- | --- |
| Common | 5 | 3 | a third of an army run |
| Uncommon | 8 | 5 | half a run |
| Rare | 12 | 8 | most of a run |
| Legendary | 20 | 12 | a run and a bit |

### Prices (crowns)

Books grow with the save (`x (1 + 0.25 x` the furthest army cleared's index`)`, rounded to 10), because crowns come in far faster
late than early; gear grows with its item level (`x (1 + 0.04 x (level - 1))`, the level being `1 + 3 x` that index, at most 20).
The daily stock, not the price, is what holds things back (as for the chests).

| Ware | At army 1 | At army 9 (x3) |
| --- | --- | --- |
| Common book | 350 | 1,050 |
| Uncommon book | 900 | 2,700 |
| Common / Rare gear | 80 / 200 (Lv 1) | 140 / 350 (Lv 20) |
| Epic / Legendary gear | 600 / 1,500 (Lv 1) | 1,060 / 2,640 (Lv 20) |
| Small / medium / large tome | 150 / 2,000 / 7,000 | not scaled (a tome's XP is fixed) |
| Chests | as now (`shopPrice`) | as now |

For scale: a first army's first clear pays about 320 crowns, the last's about 4,200; ten auto runs of the last army about 6,400 a
day. A common book is about one army's first clear early on, and a small part of a late day.

### Durability, repair and selling

| Grade | Durability (Lv 1 / Lv 20) | Repair a point | Full repair, Lv 1 / Lv 20 | Sell, full / broken (Lv 1) | Stall price (Lv 1) |
| --- | --- | --- | --- | --- | --- |
| Common | 31 / 50 | 0.2 | 7 / 18 | 5 / 4 | 80 |
| Rare | 41 / 60 | 0.25 | 11 / 27 | 12 / 9 | 200 |
| Epic | 56 / 75 | 0.35 | 20 / 47 | 30 / 24 | 600 |
| Legendary | 71 / 90 | 0.45 | 32 / 72 | 70 / 56 | 1,500 |
| Mythic | 91 / 110 | 0.55 | 51 / 107 | 150 / 120 | not sold |

**The upkeep it makes** (15 pieces on a party of five):

- **Early** (Common and Rare pieces, about 30 waves a day): each piece loses about 30 a day, so a whole party's upkeep is about
  **120 crowns a day**, about a sixth of what that player earns. A Common piece lasts about a day of play.
- **Late** (Legendary and Mythic at item level 20, 10 auto runs and some play by hand, about 150 auto waves and 30 by hand): each
  piece loses about 105 a day, so a Mythic needs a full repair about once a day; the party's upkeep is about **1,200 to 1,500 a day**
  of about 7,000 earned, again a sixth to a fifth.
- **Target: upkeep a sixth to a fifth of a player's crowns**, real but never crippling, and never forcing a choice between repairs
  and the next chest. `npm run gear-balance -- --wear` (a new switch: a month of a modelled player) reports it; the numbers above
  are the knobs (`DUR`, `REPAIR`, `AUTO_WEAR`; `SELL` and the condition's 0.8 stay put, for the loop test).
- Fights are untouched until a piece breaks, and a broken piece only takes away what it gave: the gear balance table's strengths
  are unchanged.

---

## Saves and determinism

### Saves (`legends.*`, every new field optional)

- `Equipment.wear?: number` (points lost; missing is full).
- `Meta.books?: Record<string, number>` (unread copies), `Meta.learned?: Record<string, string[]>` (book ids a kind has learned),
  `Meta.study?: Record<string, { book: string; done: number }>` (fights studied of the book in hand; `paused?: Record<string, Record<string,
  number>>` keeps progress of a book put down), `Meta.loadout?: Record<string, [string, string]>`, `Meta.mastery?: Record<string,
  Record<string, number>>` (casts).
- `Meta.stall?: { day: number; sold: Record<string, number>; spent: number; seenDay?: number; soldToday?: { item: Equipment; price:
  number }[]; gloaming?: number; guardians?: number }`.
- `Meta.shop` (the chest shop's) is kept as it is. `Meta.cart?: Equipment[]` (pieces brought home to a full stash).
- Read functions drop nonsense (an unknown book, a loadout naming a skill the kind does not know, a skill in both slots, wear above
  the maximum), as `readEquipment` does. **Old saves** load with nothing read, nothing studied, full gear and standing 1; nothing
  is back-paid. The save version is not bumped.
- A run's snapshot (`newRun`) takes the loadout as it takes the castle, so a saved run plays on with the skills it started with.

### Determinism

- The stall's stock: `mixSeed(m.seed, STALL_SALT, day)`; the caravan: `mixSeed(m.seed, CARAVAN_SALT, week)`; the Dealer:
  `mixSeed(m.seed, GLOAMING_SALT, guardians)`; Hester's line: `mixSeed(m.seed, STALL_SALT, day, tab)`. The day comes in from the
  page (`todayKey()`), never read by the sim.
- Gear brought home: its base from `mixSeed(run.seed, CARRY_SALT, gear.id)` (fixed at the drop, shown in the run), its grade's
  one-in-six from the same stream; the run's own draws are untouched.
- Rare books in chests: drawn last from their own stream (`mixSeed(chestSeed, BOOK_SALT)`), so every chest's crowns, stones, gear and
  tomes roll exactly as before.
- Wear, study and mastery are counted by pure functions from the settled fight (its placed heroes, falls and `skill` events); the
  renderer never writes them.
- In a fight, book skills and broken pieces change only the boost a hero is placed with. Nothing new draws from `b.rng` or
  `b.skillRng`; a hero with no loadout and no worn-out piece fights exactly as on main (a test hashes it).

---

## What each part touches

| Part | New files | Hooks in shared files |
| --- | --- | --- |
| The stall's rules | `src/sim/stall.ts` (stock, standing, buy, traders, lines), `test/stall.test.ts` | `meta.ts` (`stall`), `chestShop.ts` (unchanged rules; the stall calls them) |
| The stall's page | `src/stallView.ts`, `src/stall.css`, the stall art | `camp.ts` / `render/campSpots.ts` (the place), `home.ts` (the plate), `shopView.ts` (Recruit's button opens the stall's Chests tab), `build.mjs` (`FILES` if the paintings load by URL) |
| Wear and repair | `src/sim/wear.ts` (`wearAfterWave`, `repairCost`, `repair`, `repairAll`, states), `test/wear.test.ts` | `equipment.ts` (`Equipment.wear`, `equipStats` skips broken, `combineItems` fresh, `bestFor`), the settle functions (`settleRun` in `modes.ts`, `settleStand`, the Calamity's, `settleDaily`, auto-replay), `castle.ts` (the Armoury's line) |
| Gear brought home | `src/sim/carryHome.ts` (`carryBase`, `carryGrade`, `bringHome`, the stash and the cart), `test/carry-home.test.ts` | the run's end in `modes.ts` (`settleRun`) and auto-replay; the in-run gear's card and the pack (the base's name and icon, display only); the result card and recap (Brought home); `camp.ts` (the cart's full tag) |
| Selling | in `src/sim/stall.ts` (`sellPrice`, `sell`, `sellAll`, `buyBack`), `test/sell.test.ts` (the loop inequalities) | `equipment.ts` (`salvageItem` becomes `sellItem`, the same crowns at full), `equipView.ts` (Sell, Repair, the bar, badges) |
| Skill books | `src/sim/books.ts` (read, study, learn, loadout, mastery), `src/sim/bookData.ts` (the catalogue, `READS`), `test/books.test.ts`, `test/book-balance.test.ts` | `run.ts` (`boostOf`: `Boost.kit`), `battle.ts` (`addUnit` uses `Boost.kit`), `heroKits.ts` (a slot from a book), `castle.ts` (the Library's line, `studyCut`, `students`), `armyStars.ts` (a rare book, its own stream), `tools/balance` (`--books`) |
| Books on the page | `src/skillBookView.ts` | `heroSheet` (the Skill book panel), `recapView.ts` (study lines, the learned card), `party.ts` (the worn strip) |
| Lost techniques | four skills in `src/sim/kits/lost.ts`, four chains in `questData.ts`, four quest battles in `questBattles.ts` | the quests' machinery (claude/quests-1 and its batch 2) |
| Records | | `updates.ts` (the director's entry), `CREDITS.md` (the paintings) |

---

## Build plan

Each batch ships on its own and keeps every existing fight the same.

1. **The stall.** The place at the camp (placeholder pack stall, Hester's placeholder portrait), the full-screen menu with the
   close-up, the tabs, the Chests tab (the chest shop moved in, the Recruit button pointing at it), standing (counted, the seals),
   Hester's lines. *Tests: standing, the stall opens the chest shop's own rules. Shots at three sizes.*
2. **Selling.** Sell replaces Salvage (same crowns at full), the Sell tab, bulk, confirms, the Sold today shelf. *Tests: prices, no
   loop, buy-back.*
3. **Wear and repair.** `wear`, the states, the settle hooks (half under auto, the fall's knock), the Repair tab and the picker's
   button, badges and bars, the party strip, the between-waves line, combining fresh, old saves full. *Tests: wear by mode, broken
   gives nothing, unworn fights hash as main, repair costs, `gear-balance --wear`.*
4. **Gear brought home.** `carryBase` shown in the run, the best 3 (1 under auto) home at the run's end, grades and levels, the
   stash cap and the cart, the Brought home row. *Tests: bases fixed by id, upgrades keep the base, the caps, the overflow sold,
   every run's own draws unchanged.*
5. **The gear and tomes shelves.** Daily stock, copies, standing gates. *Tests: same stock on a reload, gates.*
6. **Skill books in the simulation.** The catalogue (Common to Rare), `READS`, study (fights, the library), the loadout and
   `Boost.kit`, mastery; `--books` in the balance tool and the catalogue tuned into the band. *Tests: study, slots, the revive rule,
   parity, a fight with no loadout hashing as main.*
7. **Books on the page.** The Books shelf, the hero sheet's Skill book panel and picker, the study badge, the recap lines and the
   learned card. Shots at three sizes.
8. **Found books and the caravan.** Rare books in chests and tier clears (own stream), Rustam's weekly day.
9. **The Gloaming Dealer and the lost techniques.** The Dealer after a guardian; the four techniques' skills and chains, with their
   quest battles (needs the quests' batch 2, quest battles).
10. **The painted art.** The importer brings in the books-and-shop set and the gear icons; the placeholders and the 16 px icons go (the in-run gear then shows its base's painted icon too).

---

## Open questions

1. **Mastery on a hero's own skills.** Should a hero's own two skills also earn mastery stars? *Recommended: no, learned skills only*;
   the own skills already grow with tiers and talents, and giving all 90 a free +15% would shift every army's balance.
2. **Healers and Grimoires.** Only five heroes read Grimoires. Should the mana healers and supports (the Hymnal's eight) also read
   them? *Recommended: no, one kind each plus the universal books*, which keeps each kind's flavour; widen it later if the Grimoire
   shelf feels thin.
3. **Auto-replay wear.** *Recommended: half a point a wave*, like the War Horn's half fill, so ten auto runs a day wear gear without
   eating it.
4. **The Armoury and repairs.** *Recommended: each Armoury level takes 4% off repairs* (up to 28% at level 7), so a castle that
   already builds the Armoury feels it at the stall. (Its +5% attack stays.)
5. **Repairs in a run.** *Recommended: not for now.* Later, the passing cart between waves (`market.ts`) could sell a whetstone (a
   quarter of a piece's durability back, for run gold) if long Last Stand runs break too much.
6. **Gradual loss while worn.** *Recommended: none*: full strength until broken, with the amber warning at 25%, so wear is a clear
   choice to make rather than an invisible tax.
7. **Gear found in a run.** *Recommended: keep the run's own gear as it plays, and bring the run's best 3 home (1 from an auto run) as
   real pieces of the base each showed in the run* (Common to Rare, Epic and up on Elite and above). The other way, real pieces
   dropping and worn in the run itself, would mean redoing every event that hands out run gear and rebalancing every run.
