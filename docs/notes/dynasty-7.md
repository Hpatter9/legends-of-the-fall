# Dynasties, phase 7: the Legend Oath and the Shades

Phase 7 of the expansion in `docs/design/legends-expansion.md` (section 9, "Phase 7: The Legend Oath and the Shades"), built to sections
3.4, 3.6, 3.7, 5.2, 7 and 8 of the design, on phase 6's heirs and the Mantle (`docs/notes/dynasty-6.md`). The owner's answers hold: **the
Oath is sworn per run, on Hard or harder**; **the bearer can die, but the progress never does**; **the fallen become Shades on the War
Horn**.

Phase 7's list is:

- the Oath's toggle on the March orders;
- slain bearers, by the Oath's two rules;
- a trained heir taking up the mantle at once, or the mourning and the foundling heir;
- the Shades on the War Horn: their strike, their riders, their slayer, their short call;
- the Shade honour wired to its horn call, greyed until a Shade can answer;
- the tavern's ghosts (pale at the fallen's place with a candle, then by the hearth);
- Legend renown, the Legend title and its gold frame, and the Legend-slayers;
- the Oath's pay;
- the Houses' "The fallen" filter, and the fallen on the family tree (the candle, the slayer's chip).

The Calamity Rises (phases 8 to 10) are not touched.

**The promise holds: no power is lost.** Every lasting thing stays keyed by the hero's kind: XP and level, ranks, awakening, talents,
books, gear and skill use. A slain bearer is a person; the kind is the slot, and nothing of it is touched. A test slays a bearer and finds
every one of those fields unchanged, byte for byte.

## What it plays as

### Swearing the Oath (`src/sim/oath.ts`, `src/marchCard.ts`)

- **The March orders** gain a section, **The Legend Oath** ("this run only"): **No Oath** or **Swear the Oath**. The War Council's line
  says "the Legend Oath" when it is sworn.
- **It opens with the save's first Passing of the Mantle** (`oathOpen`: a bearer of a later generation that is not a cadet). Before that,
  the section is not shown. Once open, the card shows for every army run so the Oath can be seen: on Normal it is locked ("Hard or harder
  only").
- **Per run** (`Run.oath`). The next run marches free of it unless it is sworn again. **Auto never swears it**: the auto-replay marches
  plain, as it always has.

### Slain, not fallen (`settleOath`, `noteOathFalls`)

Under the Oath a hero is **slain** when:

1. **it falls a second time in the run**; or
2. **it falls in a wave that is then lost**.

A fall is counted when a heart burns (the party rises, but each of the fallen has fallen once) and at the wave's end. A wave lost at its
end slays every hero who fell in it, those who fell before a heart burned among them. Only the run's own heroes count: never a guest, a
Calamity clone or a summon.

**A slain hero's kind sits out the rest of the run** (`canJoin` refuses it, it leaves the squad, and no hire draws it). The run goes on as
normal for the rest of the party.

### What dies is the person (`slayBearer`)

The bearer who dies is the one fielded for the kind: the current bearer, or an elder the banner fielded in the heir's place.

- **An elder fielded and slain** falls (it leaves the Hall or the Elders' table as it would for another honour). The heir still holds the
  House: nothing else changes.
- **The current bearer slain, with a trained heir:** the heir takes up the mantle **at once** (`passMantle` with the elder fallen; the
  first candidate, with the partner's birthright; no heirloom is chosen, since nobody is there to hand it on). The heir bears a **Blood
  Grudge** on the slayer while it lives (+15%, phase 6's).
- **The current bearer slain, with no trained heir:** the House **mourns for 3 real days** (`Line.mourning`, a day number). The kind cannot
  march in the armies (`armyParty`; the party picker says "In mourning · 2d"). Its ghost keeps its tavern seat with a candle. Then
  (`settleMourning`, on the camp's visit):
  - a trained heir takes up the mantle, if one finished training in the meantime;
  - else a **foundling heir**: a generation on, no birthright, the first name of the kind's bank not yet borne (no draw), and a Blood
    Grudge on the slayer while it lives.
  - An heir still in training trains on, for the foundling to pass the mantle to later. No training is lost.
- **The slayer** is read from the War's tally of the fight (the foe whose `slewIds` hold the hero), and is a living nemesis: one already
  named, or one the fight named for that very slaying. The fallen bearer keeps its id and its full name as it was then ("Slain by Gash,
  Minh's Bane · still living").

### The Shades on the War Horn (`src/sim/eidolons.ts`, `src/sim/warHorn.ts`, `src/shadeView.ts`, `src/eidolonCall.ts`)

- **Who is a Shade:** every bearer fallen under the Oath, and every elder honoured as a Shade (kind level 100), in `shadesOf`.
- **The same horn, once a fight:** a Shade is chosen on the War Horn's card to answer **in the Eidolon's place** (`EidolonMeta.shade`,
  "kind:index"). The horn must be full, as for an Eidolon. Choosing an Eidolon again sends the Shade back.
- **Greyed until it can answer** (`whyNoShade`, `whyShadeHonour`): the War Horn must be held (an Eidolon bound), and an honoured Shade's kind
  must stand at level 100. The Shade honour on the honour card, and "A Shade" on a fallen bearer's card, are greyed with that reason.
- **The strike** (`SHADE`), a set share of full health that cannot be dodged, as an Eidolon's:

  | Struck | A Shade | An Eidolon (for comparison) |
  |---|---|---|
  | An ordinary foe | 60% | 100% |
  | An elite or a mid-boss | 35% | 65% |
  | A last boss (or a guardian, or a being in its trial) | 20% | 45% (40%, 25%) |
  | **The Shade's slayer** | **60%**, and it cannot cheat death that fight | — |

  "Cannot cheat death" means both ways: in the fight, its Survivor or Stitched stand is refused (`UnitNem.doomed`); after it, the
  Council's cheating death passes it by (it joins the `avenged` set, as a Vengeance slaying does).
- **The rider, by the calling** (`SHADE_RIDER`):
  - **martial:** the party +20% attack for 8 s;
  - **arcane:** every ultimate meter +25% (the skill meter below level 30);
  - **devout:** every hero healed 30% of its health and cleansed;
  - **wild:** the party hasted for 6 s.

  The riders' times are lengthened by the herald and the bound echo, as an Eidolon's are.
- **Auto never calls it.** Only the player's tap does, through the sim's own order (`orderEidolon` with `SHADE_ID`). A call is logged and
  replays from the log.
- **The short call:** the hero's own portrait rises over the board in a spectral tint and fades (1.9 s), with "Kenji's Shade" and its gift.
  It is a CSS filter and fade on the existing portrait: no new art. It holds nothing (the strike lands on the next tick as the fight runs
  on). Reduced motion: a still fade.
- **The Shades' card** (the standard ornate menu, "Close") opens from the War Horn's card's new "The Shades (n)" button. It lists every
  Shade, its House, its slayer and its gift, and "The Eidolon answers" to send a chosen one back.

### The tavern's ghosts (`src/paintedTavern.ts`)

Main's painted tavern (five guests, the strongest heroes) replaced the side-view tavern while this phase was built, so the ghosts were
moved onto it in the merge:

- **While the House mourns** (its current bearer slain), its hero, if it is among the five guests, sits at its own place **pale and
  translucent** (a steady low opacity and a grey, never a flicker), at its painted activity, with **a candle** by it (the painted fallen
  icon, steady).
- **By the hearth** stand, still and pale and not tappable, a House in mourning whose hero is not among the guests, and the **fallen elders
  whose Houses have a bearer again** (the design's "corner seat of the Hearth Hall"): three places beside the fireplace.

### Legend renown and the Legend-slayers

- **Renown:** an Oath run cleared gives **each bearer of the run** who lived +1 (`Bearer.legend`). **Three Oath clears make a Legend**: a
  memory line, "A Legend of the Oath" on the tree, and a **gold frame** on the House's picker and the bearer's row and card (steady).
- **A Legend-slayer:** the nemesis that slays a Legend gains **+2 Might** (to 10 at most) and carries the bearer's name in its epithet
  ("Gash, Kwame-Killer"). A line in its memory and the War's News tell it.

### The Oath pays

- **×1.3 crowns** on each wave's pay (`oathCrowns`, after the March orders' `marchCrowns`) and **×1.3 XP** (`oathPay` in the page's XP
  rate). The design wrote ×1.5; it measured 1.41× to 1.52× against the design's own bar of "under 1.3×" (below), so it is ×1.3, the
  director's recommendation while the owner's answer is pending (`OATH.PAY`, one number to change).
- **+1 War Trophy a wave won**, inside the War's daily cap of 12.
- **Legend renown** at a clear (above).

### The Houses (`src/housesView.ts`)

- **The filter** is All · With heirs · Veterans · Elders · **The fallen** (three across, two rows). "The fallen" is a line with a bearer
  slain under the Oath, or in mourning.
- **The picker:** a fallen current bearer says "In mourning" (or "Fallen"), its portrait pale; a Legend's House wears the gold frame.
- **A line's page:** a fallen bearer has the candle, "Fallen under the Oath: a Shade on the War Horn", the mourning's days left, and the
  **slayer's chip** ("Slain by Gash, Minh's Bane · still living"; a tap opens the nemesis's card while it lives). Renown and the Legend show
  on the bearer's row; a foundling says so.
- **A bearer's card** gains **The Legend Oath**: renown or the Legend; for the fallen, who slew it (and the Blood Grudge still on it), "A
  Shade" (greyed until the horn is held), and the mourning.

## Save data and migration

```ts
interface Bearer { …phase 6…; slainBy?: number; slayer?: string; legend?: number; foundling?: true }
interface Line { …phase 6…; mourning?: number }             // a day number (`dayNumber`)
interface Run { …; oath?: true; slain?: number[]; oathFalls?: Record<string, number>; oathWave?: number[] }
interface EidolonMeta { …; shade?: string }                // "kind:index"
```

- **Every new field is optional.** A phase 6 save reads exactly as it did.
- **The readers** drop what they do not know: a mourning on a line whose current bearer has not fallen; a renown below 1 (and whole numbers
  only); a Shade choice that is not "kind:index" (and a well-formed one that names no Shade is ignored where it is used, `shadeChosen`).
- Phase 7 draws nothing at all: who falls is read from the fight, the slayer from the War's tally, and the foundling's name is the first
  free one of its bank.

## Determinism and old fights

- **A fight without a Shade called plays exactly as before.** The Oath never changes a fight: it reads it afterwards. A Shade armed but not
  called is a no-op (a test plays the same seed armed and unarmed and compares every hit). `battle.ts`, `armies.ts`, `ailments.ts` and
  `blow.ts` do not import `oath.ts` (a test checks).
- The fight hooks are behind a call: the Shade's strike runs only when `b.eidolon.shade` is set and called; `UnitNem.doomed` is set only by
  it; the Council's extra "cannot cheat death" reads only a called Shade.
- `oath.ts` and `shadeView.ts`'s rules use no clock, DOM or `Math.random`: the page passes `now` and the day key.
- The identity and regression fixtures hold (`nemesis-regression`, `stand-regression`, `spells-identity`, `ailments-identical`), in the
  full suite below.

## The numbers

The balance bar is no army's mean tries rising by more than 1.

- **The fights** (`npm run balance -- --no-tables --deep --levels 30,60 --attempts 6 --only orcs,undead,beasts --talents`) give phase 6's
  table digit for digit: on Legendary at level 30, Orc Warband 1.7, Undead Legion 2.0, Beast Packs 5.3; at 60, 1.0, 1.0, 1.3; everything on
  Elite 1.0. The Oath does not touch a fight, and the Shade is never called by a bot unless told to.
- **The Shade against an Eidolon** (the existing flag, `--eidolon 15:shade` against `--eidolon 15:askel`: called as the last boss's wave
  begins, every attempt; Legendary at level 30, 6 saves a cell):

  | Legendary, Lv 30 | No call | A Shade (martial) | Askel, an Eidolon |
  |---|---|---|---|
  | Orc Warband | 1.7 | 1.2 | 1.0 |
  | Undead Legion | 2.0 | 2.5 | 1.2 |
  | Beast Packs | 5.3 | 3.7 | 2.5 |
  | Elite: all three | 1.0 | 1.0 | 1.0 |

  The Shade sits between no call and an Eidolon on the Orc Warband and the Beast Packs, as a lesser Eidolon should. On the Undead Legion
  it measured +0.5 (three more tries over six saves): the Shade takes a fifth of the Lich King and leaves his escort standing at 40%, so
  the fight runs on with a changed course, and six saves a cell cannot tell that from noise. It is inside the bar of +1; I did not run more
  saves to settle it.

- **The Oath's pay against its risk** (the new `node tools/dynasty/oathPay.mjs`: the greedy bot's army runs for 14 days, 4 runs a day,
  Orc Warband, Undead Legion and Beast Packs in turn, the recruits' party at the level; every wave under the Oath settled as the page
  settles it, a slain hero leaving its run and its House mourning three days; no hearts, as every figure in the notes):

  | Level · tier | No Oath: crowns a day | clears a day | ×1.5 (as designed): crowns a day | ratio | **×1.3 (now): crowns a day** | clears a day | slain a day | **ratio** |
  |---|---|---|---|---|---|---|---|---|
  | 60 · Hard | 709 | 4.0 | 1,074 | 1.52× | 926 | 4.0 | 0.1 | **1.31×** |
  | 65 · Elite | 986 | 3.5 | 1,399 | 1.42× | 1,203 | 2.9 | 1.5 | **1.22×** |
  | 90 · Legendary | 203 | 0.0 | 287 | 1.41× | 247 | 0.0 | 1.8 | **1.22×** |

  (4 saves a cell, the same saves and seeds both times.) As designed (×1.5) it was over the design's bar of 1.3× everywhere. At ×1.3 it
  is 1.22× on Elite and Legendary, where the bot loses heroes (one and a half to two a day) and runs. On Hard at level 60, where the Oath
  first opens, the bot almost never loses a hero, so the Oath is its full pay: 1.31× (1.306), the bar itself: the extra is each wave’s crowns
  rounded to a whole crown.

## Art

Phase 7 uses existing art only, bundled into game.js, so the service worker's list does not change:

- the fallen's candle: main's painted **fallen** fate icon (`FATE_ICON.fallen` in `dynastyArt.ts`), on the Houses, the slayer's chip and
  the tavern's mourning seat. (The branch first used the ember brand item icon; the painted set arrived on main and replaced it in the
  merge.)
- the Legend: a steady gold frame. Main's painted **legend** symbol (`LEGEND_ICON`) is re-exported from `housesView.ts`, ready for the
  tree, but not drawn yet;
- the Oath on the March orders: the "✠" glyph, as the other orders use glyphs;
- a Shade's look: the hero's own portrait (the call) and sprite (the tavern) with a spectral tint and fade, as the design asks.

Images that could still be made, as ChatGPT prompts:

1. **The Legend Oath's seal** (for the March orders' row): "A 32x32 pixel-art icon on a transparent background for a dark fantasy game:
   a wax seal pressed with a skull over crossed swords, deep red wax with a gold rim, a short torn ribbon beneath, 1 px dark outline, no
   text."
2. **The Shade's mark** (for the Shades' card and the horn): "A 24x24 pixel-art icon on a transparent background for a dark fantasy
   game: a pale spectral hooded figure fading into wisps at the bottom, cold blue-white glow inside the hood, 1 px dark outline, no text."
3. **A Legend's gold frame for the family tree's portraits** (if the owner wants more than the steady gold border): "A square ornate
   portrait frame for a dark fantasy pixel-art game, 72x72 pixels, transparent centre 64x64, bright gold filigree with a small laurel at
   the top, 1 px dark outline, no text."

Each would be credited in `CREDITS.md` when it is made.

## Questions for the owner

1. **The Oath's pay.** As the design wrote it (×1.5) it measured 1.52× on Hard at level 60 (where the Oath opens, and the bot almost never
   loses a hero), 1.42× on Elite at 65 and 1.41× on Legendary at 90, against the design's "under 1.3×". It is ×1.3 now, the director's
   recommendation (measured below). Is ×1.3 right, or should it be paid by tier (×1.2 on Hard, ×1.35 on Elite, ×1.5 on Legendary and
   Mythic), or open on Elite or harder only?
2. **Leaving mid-fight.** A run is saved as each wave begins, so closing the page during a wave and coming back plays the wave again, and a
   death under the Oath can be dodged that way (as a lost heart can be today). Should an Oath run save its falls as they happen, so a wave
   left part-way counts as lost?
3. **The heir at once.** A bearer slain with a trained heir hands the mantle over at once: the first candidate (the partner's birthright),
   no heirloom chosen. Should the player choose the candidate and the heirloom at the next visit instead, with the House in mourning until
   then?
4. **A duel lost under the Oath.** The champion of a lost duel is wounded (at half), not fallen, so it does not count towards the Oath. Is
   that right, or should a duel lost count as a fall?
5. **The ghosts by the hearth.** There are three places by the painted tavern's fireplace; a fourth ghost is not drawn (the Houses in
   mourning come first, then the fallen elders in the Houses' order). Should the newest take the places, or should there be more?

## Tools

- **The screenshots:** `node tools/dynasty/shots7.mjs [scene ...]` (after `npm run web`) writes `docs/samples/dynasty-7/` at 393x852,
  360x780 and 412x915. Its saves are in `tools/dynasty/saves7.ts`. The script fails if any page scrolls sideways. The scenes:
  - the Houses' "The fallen", and All with the Legend's frame;
  - Kenji's House in mourning (the candle, the slayer's chip), and his card (the Oath's section);
  - the knight's heir's House with its Legend's frame;
  - the March orders with the Oath sworn on Hard, and locked on Normal; the War Council's line with the Oath, and the party picker's
    mourning;
  - the War Horn's card and the Shades' card;
  - the honour card with the Shade greyed (no horn held), and a fallen bearer's card with its Shade greyed;
  - the painted tavern's ghosts: Kenji pale at his place with the candle, and Kohaku by the hearth;
  - a deploy under the Oath, Kenji's Shade called (its short call), and the board after its strike.
- **`npm run balance -- … --eidolon <wave>:shade[-<calling>]`** calls a Shade in place of an Eidolon (`tools/autoplay.ts`).
- **`node tools/dynasty/oathPay.mjs [--saves 6] [--runs 4] [--cells 60:1,65:2,90:3] [--only …]`** measures the Oath's pay against its risk.

## Checks

- `npm run typecheck`: clean. `npm run web`: built.
- **Merged with main at 0.399.0** (`git merge origin/main`; main's version of the phase 6 files, with phase 7 laid on top).
- **The full `npm test`, after the merge:** 2,739 tests, all passing (before the merge, 2,651: 2,636 at phase 6, with 14 new in
  `oath.test.ts` and 1 more in `ui-standard`), the identity and regression fixtures among them (`nemesis-regression`, `stand-regression`, `spells-identity`, `ailments-identical`).
  - `test/oath.test.ts` (14 new tests) covers:
    - swearing the Oath: the first Passing of the Mantle, Hard or harder, per run, never by auto;
    - slain only under the Oath and only by its two rules (a second fall in the run, a fall in a wave lost), the heart's burn counting;
    - the progress intact (XP, gear, shards, stars, talents, books, skill use, awakening, the party), the kind sitting out the run;
    - a trained heir at once, with the Blood Grudge on the slayer;
    - the 3-day mourning, the foundling and its grudge, the armies' party while it lasts;
    - an elder fielded and slain;
    - Legend renown, the Legend, and the Legend-slayer's +2 Might and epithet;
    - the Oath's pay (crowns, the War Trophy inside the daily cap);
    - the Shade's strike (60, 35 and 20%), its slayer's 60% and no cheating death;
    - the four riders;
    - the Shade replaying from its log, never called headless, and a fight armed but not called playing as before;
    - the Shades on the horn: greyed until the horn is held, chosen and sent back, the honoured Shade;
    - the readers;
    - no fight file reading the Oath.
  - `test/ui-standard.test.ts` gains a test that the Shades' card is a standard menu that says Close, the Houses filter has "The fallen",
    and the March orders carry the Oath in a standard section.
- **The combat HUD probe** (`node tools/combat-hud/probe.mjs`), run before and again after the merge: 100 cases at 393x852, 360x780, 412x915, 360x640 and 393x852 with a notch (an army's five and the Calamity's eight; start, mid-fight, boss waves with 2 to 4 spells and the War Horn, the tactic tap, an ultimate, the duel), **0 overlaps**. The Shade's short call is a passing overlay over the board, as the ultimate's words are.
- **The balance:** above. The deep table is phase 6's digit for digit.
- **The screenshots:** `docs/samples/dynasty-7/`, 54 shots (after the merge) at 393x852, 360x780 and 412x915, with no page scrolling sideways.
