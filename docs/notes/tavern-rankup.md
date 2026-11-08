# TAVERN-RANKUP: upgrades marked in the tavern, and a quick way to take them

The owner: "Heroes on the tavern screen should show if they have an upgrade available. There should be a quick way to rank up
a character rather than clicking it and upgrading, then backing out, finding the next one, clicking in. It takes too long."

## What counts as an upgrade

The two steps the game already calls "Rank up" and waits on the player's tap for (the Heroes tab's dot, `readyToRise`):

- **A rank** its shards have earned (`sim/rankUp.ts`: `nextRank`, `rankUp`). Nothing is used up; the shards earned it.
- **An awakening step** at the top rank (`sim/awaken.ts`: `awakenPlan`, `awaken`), paid with shards and its class's rift ore.

Levels (tomes), talents and gear are not marked: they are spent choices, not a step that waits. No rule is new.

## The pure helper: `src/sim/upgradesReady.ts`

- `upgradeOf(m, kind)`: the next step (`rank` or `awaken`, the rank or step it reaches, `can`, the shards, the ore and its cost).
  An awakening whose shards are ready but whose ores are short is returned with `can: false`, so the list can say what is missing.
- `upgradeReady(m, kind)`: the gold chevron (the same answer as `readyToRise`; a test checks every hero).
- `upgradeList(m, kinds)`: the list's rows, ready ones first, in roster order.
- `nextUpgradeKind(m, kinds, current)`: the hero sheet's hop (round the roster, never itself, null when no other is ready).
- `takeUpgrade(m, kind)`: one step through `rankUp` or `awaken`.
- `upgradeAll(m, kinds)` / `planUpgradeAll`: every step that can be taken, hero by hero in roster order, each as far as it goes
  (several ranks, then an awakening); heroes of one class share its ore, so the first in the order is paid first. The plan runs
  the same on a JSON copy for the confirm's totals.
- Tests: `test/upgrades-ready.test.ts`.

## The page

- **Tavern** (`src/tavern.ts`): a hero with a step ready wears a gold chevron badge over their head (13 room pixels, drawn once a
  scale; it bobs a pixel up and down on a slow sine, held still with reduced motion; never blinks). A hero with a quest "!" (or
  tick) too shows both side by side, the "!" left, the chevron right. A marked hero gives off no passing emote or activity bubble,
  as a quest mark already did. Tapping the chevron opens that hero's Rank up card at once (`openRankUp`); tapping the hero is
  their sheet as before. The set is worked out on each `update(meta)`.
- **Upgrades button** in the tavern's top-right column (Quests, Upgrades, Trophies, All heroes), shown only while a hero is
  ready, with the count.
- **The quick list** (`src/rankUpList.ts`, `openUpgrades`): a row per hero (portrait, name, stars and gems, the step, its cost,
  one button). A tap takes the step; the row changes in place (the next step, "Short of ore", or "✓ Done") and the sheet's own
  flourish (`playAwakenShow`) plays over its portrait, shortened by CSS. "Upgrade all (N)" asks first with the totals ("4 heroes:
  5 ranks and 1 awakening. Uses 6 shards, 10 Windglass."), then takes them all, flourishes staggered 140 ms. A tap on a portrait
  opens that hero's sheet. Closing refreshes the home screen. A first awakening tells the page (`tellAwakened`, a small export in
  `awakenView.ts`) so its cinematic plays as it does from the card.
- **Hero sheet** (`src/menuHeroes.ts`): "Next upgrade ›" in the toolbar hops to the next hero with a step ready (through the page's
  own pick where there is one, so the tavern remembers the hero; the party's sheet redraws itself). The strip's portraits and the
  Rank up badge wear the chevron; the badge says "Awaken" when that is the step.
- **All heroes** cards and the **party's** hero cards (by the "i" that opens the sheet) wear the chevron.
- CSS: `src/rankUps.css` (in `build.mjs`'s list).

## Checks

`tools/tavern-rankup/shots.mjs [port] [WxH]` takes `docs/samples/rankup-*.png`.
