# The roster's Sort and Filter, and the War Council's pack (HEROES-FILTER)

Two asks from the owner, built as two commits on `claude/heroes-filter`. The pack's tab has an art prompt too (the last one in the prompts file).

## 1. Sort and Filter on the Heroes screen

The owner: "Need a filter and sort button for the heroes screen."

The Heroes screen is the roster ("All heroes" in the tavern; `drawRoster` in `src/menuHeroes.ts`). Under its search box there are now
two painted plate buttons, **Sort** and **Filter** (`plateButton` from `src/paintedButton.ts`), each opening a standard ornate sheet
(`src/heroFilterView.ts`, built with `ornateMenu`). A tap in a sheet changes the list at once, under the sheet.

- **Sort by:** the keep's order (the default, the list as it always was), level, rank (then shards), name, class, newest joined, power
  (the card's Power number, `kindPower`), and ready to upgrade first. Each has two ways round, worded for the sort ("Highest first" and
  "Lowest first", "A to Z" and "Z to A", "Newest first" and "Oldest first"). Ties fall to the keep's order either way round.
- **Filter by**, several at once: owned or not yet owned; in the party or not; upgrade ready (a rank, an awakening or talent points: the
  gold chevron's own rule, `markReady`); Mythic; the class on the hero's card (Guardian, Fighter, Shooter, Mage, Support: `CLASS_OF`); and
  the party role (Front-liner, Striker, Back-liner, Support: `roleOf`, the War Council's own); and the traits (`TRAITS`: Samurai,
  Mystic, Guardian, Blade and the rest). Every group chosen must hold; within classes, roles or traits, any one of
  those chosen. The Filter button wears a count seal, and the sheet says how many heroes the choice leaves.
- **What is not offered,** because the hero data has nothing for it: elements and favourites. The Mythic filter and each trait are
  offered only once the save may name a hero that has it, so the sheet gives no secret away.
- **The list's head** says what is on ("Sorted by level · 2 filters · 9 found") with a one-tap **Clear**. An empty result shows "No hero
  answers that call..." and a Clear button.
- **Search by name** was already there ("Find a hero"); it now runs through the same rules, and Clear empties it too. It fits at 360.
- **Remembered:** the choice is saved with the settings (`Settings.roster`, an optional field; old saves have none, and a bad one is
  dropped by `cleanView`). The search text is not kept.
- **Secret heroes stay hidden.** A hero the save may not name ("???") keeps its own place and order whatever the sort; a name search never
  finds it; a filter by class, trait, Mythic or upgrade leaves it out, so no filter can tell what it is. "Not yet owned" and "Not in the
  party" still show it, as they give nothing away. Heroes whose shards are not begun are still only counted, as before.

The rules are pure, in `src/heroFilterRules.ts` (`rosterRows`, `passes`, `sortRows`, `viewRows`, `viewLine`, `cleanView`), tested by
`test/heroes-filter.test.ts`.

**The party picker shares it (round 2).** The War Council's "Reinforcements" grid (`src/party.ts`) is drawn from the same rules and
wears the same two buttons and head line (`rosterTools` in `heroFilterView.ts`, used by both screens), reading and keeping the one
saved choice. Its old role chips (All, Front-liner, Striker, Back-liner, Support) are gone; so that nothing was lost, the party roles
(`roleOf`) are a filter group of their own, "Party role", on both screens. There, "In the party" means the draft being picked, a search
also finds the bearer who takes the field, and the unlocked heroes still come first with the locked shaded after them.

**Art.** Sort wears the painted down-chevron glyph and Filter the Auto-pick medallion as stand-ins; the prompts for a sort and a filter
medallion are in [heroes-filter-art-prompts.md](heroes-filter-art-prompts.md).

Shots (`node tools/heroes-filter/shots.mjs <label> [scene ...]`, at 393, 360 and 412): `docs/samples/heroes-filter/before-roster-<w>.png`
and `after-<scene>-<w>.png` for roster, roster-sort, roster-filter, roster-sorted, roster-filtered and roster-empty.

## 2. The Satchel and the Plan in a drawer (the War Council's pack)

The owner: "The satchel and plan should be on a different screen in the party formation screen. Maybe a button or a slide out menu."

The War Council (`src/party.ts`) carried the Satchel (the remedies a run takes) and the Plan (the March orders button) in its footer,
over the start button; with both showing, the footer took about 340 px of an 852 px screen. They are now in **the supplies**, a drawer that
slides out from the right edge (`src/partyPack.ts`). **I chose the drawer**, not two buttons: it fits at all three sizes (316 px wide
at 360, 349 at 393, 350 at 412, with a strip of the page left in sight), and one pull tab costs the page less room than two buttons.

- **The pull tab** ("Supplies"; round 2: the owner found "Pack" misleading on a button before, so the tab, the spoken names and the
  two lines elsewhere say Supplies; "pack" survives only in the code's names) sits on the page's right edge over the company's painting: the painted plaque with a chevron, the rune
  bench's pull bar's kin, and it lands by that bar's rules (`benchSideRules.ts`: a tap opens it, a pull follows the finger, past a third
  of the way or a flick lands it, anything shorter springs back). While the drawer is out the tab rides the drawer's edge; a tap or a
  pull to the right puts it away, and so do Close, a tap on the page beside it, Escape and the phone's Back. Its touch area is 48 px
  wide. Reduced motion moves it at once. The keyboard's arrows, Enter and Space work.
- **The drawer** is a standard ornate menu of a new kind, `kind: 'side'` (`.omSide` in `ornateMenus.css`; `ornateMenu.ts` now has
  card, sheet, drawer and side). Two painted tab plates inside: **Satchel** (each remedy with its picture, how many are packed and
  owned, what it does, the painted minus and plus, now 44 px, and Auto's switch as the painted switch with its hint as a line) and
  **Plan** (the orders set, one to a line, and "Change the orders", which opens the March orders sheet exactly as before).
- **The mark.** The pull tab wears the red pip (and lights its plaque) while the satchel could take more (room left and a remedy owned
  that is not packed, one Elixir at most) or the plan is not yet chosen. Round 2: that is only until the orders are first changed from
  the plain default (`Settings.planChosen`, set once and kept); after that a plain march is a choice and the Plan is not marked again. The tab inside the drawer that wants attention wears the pip too, and the drawer opens on it.
- **The one line on the page.** Over the start button: "Satchel 2/5 · Plan: Plain march · Shielded · by the War Camp" on a painted
  plate (it trims with an ellipsis; a tap opens the drawer too). The satchel's room is five, so the line says "/5".
- **Nothing about what they do changed.** The satchel's pick is still `pickSatchel` and `satchelFor` (`sim/remedies.ts`), saved as it
  is tapped; the orders are still `openMarchOrders` and `ordersOf` (`marchCard.ts`), and March starts the run with them. Checked in the
  page: orders set through the drawer are the run's orders, and a remedy added is in the saved pick.
- **Who sees it.** As before, the satchel shows once a remedy is owned (or Auto's switch is on) and the orders once one is open. A
  save with neither sees no tab and no line. With only one of them, the other tab says why it is empty. A quest battle and "edit the
  company" have no orders, as before.
- **The room gained.** The footer is now the status line, the pack's line and the start button (about 110 px at 393). The page's body
  has the rest: the company's painting, the roll, the bonds and the head of the reinforcements are in view at once without a scroll.
  Round 2: the company's five are now proper cards in the roll (the hero's portrait, name and level; an empty place a dashed ring),
  112 px tall where they were a 53 px strip of names.
- **Back.** The drawer is an `.omVeil`, so `BACK_LAYERS` already closes it through its footer's Close; the March orders sheet opened
  from it closes first, then the drawer, then the War Council. No tip pointed at the Satchel or the Plan on this page (`tips.ts`); the
  two lines that named "the party screen" for packing remedies (Hester's remedy sheet and the rune tray's empty pocket) now name the
  War Council's Supplies tab.

The pure rules are in `src/partyPackRules.ts` (`packShown`, `packLine`, `packMarks`, `satchelCanFill`, `planWaits`, `firstTab`),
tested in `test/heroes-filter.test.ts`. The older shot tools that pressed `#ptOrders` or scrolled to `#ptSatchel` open the drawer first
now (`tools/ui-consistency/shots.mjs`, `tools/dynasty/shots7.mjs`, `tools/gear-build/rune-shots.mjs`).

Shots: `before-party-<w>.png`, `before-party-foot-<w>.png`, and `after-party-<w>.png`, `after-party-foot-<w>.png`,
`after-party-satchel-<w>.png`, `after-party-plan-<w>.png` at 393, 360 and 412.

## What ran

Round 1: `npm run typecheck`, the full `npm test` (3,120 tests, none failing), `npm run web`, and `node tools/heroes-filter/shots.mjs`
at 393x852, 360x780 and 412x915. The drawer's tap, pull, spring back, phone Back, orders and satchel pick were driven in the built page
at 360.

Round 2 (after merging main at 0.480.0): typecheck, the full suite (3,121 tests, none failing) and the build again, and the shots again with two new scenes
(`after-party-grid-<w>.png`, `after-party-grid-filtered-<w>.png`). The three older shot tools were re-run and all work with the drawer:
`tools/ui-consistency/shots.mjs` (party, party-orders, march-orders, march-orders-set, at 393), `tools/gear-build/rune-shots.mjs` (all
three sizes) and `tools/dynasty/shots7.mjs march` (all three sizes); none raised a page error. Their shots that show the party page or
the drawer were kept as re-shot (`docs/samples/gear-build-satchel-*`, `docs/samples/dynasty-7/march-*` and `party-*`); the rune shots
they also rewrite were put back, as nothing in them changed. What they turned up: the pack's line wore the satchel's medallion even
with no satchel (it wears the orders' then, now), and `party-oath` now shows the Oath in the drawer's Plan, which is where it is named.

## Left for the owner

- The pull tab is where it was (the director's call). When the Reinforcements are scrolled up under it, it covers the right edge of the
  third column; the Sort and Filter head line keeps its Clear button clear of it.
