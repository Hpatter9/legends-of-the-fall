# Tactics mid-fight, and the hero Overview's stats

Two of the owner's asks in one branch: a tactics button on the fight screen that changes the tactic mid-fight, and a fix for the hero
Overview, which no longer showed a hero's proper stats.

## 1. The tactics button

The owner's words: "the tactics should be a button to the side under auto. When you click it, it cycles to the next tactic. That way you
can change tactics mid fight. And remove it from the bottom of the screen. There should be a small word that pops up under it when it changes
though so it's clear what mode you're in."

### The sim (`src/sim/tactics.ts`, `src/sim/orders.ts`)

- **`orderTactic(b, to)`**: the mid-fight change. Like every tap (the ultimates, the War Horn, the old Charge!) it is queued and applied at
  the start of the next tick (`applyOrders` calls `applyTactic`), and kept in the fight's log as `{ kind: 'tactic', to }`, so a fight
  replays (`replayLog`). It is refused before the fight (there `setTactic` picks), in the Last Stand (which takes no tactic), and to the
  tactic already playing. `fightTactic(b)` is the tactic as the player sees it: a change waiting for the next tick, else the one playing.
  `TACTIC_CYCLE` and `nextTactic`: Advance together, Hold the line, Charge, and back.
- **What a change does**, read from where the heroes stand at that tick:
  - **Advance together** and **Hold the line** form the line again from the living heroes: the front-liners are the line, the others
    (under Hold, everyone) are held behind it until it meets the foe, a foe comes beside them, or the cap passes. The caps (6 s, 10 s) now
    count from the change (`TacticState.since`; unset in a fight never changed, so every old fight and record plays as before). A held hero
    already past its row waits where it stands. Under Advance with no front-liner standing, nobody is held.
  - **Charge** lets everyone go.
- **Charge's edge, kept sensible mid-fight**: the edge (20% quicker march for 6 s, each hero's first landed blow on a shooter +60%) comes
  **once a fight**, and only when the charge lets a **held** party go before the line met the foe, which is exactly when the old Charge!
  call gave it (or from the start, under Charge). Called once the fight is joined, Charge only unleashes the party, with no edge. Setting
  Advance or Hold after charging ends a running edge (`TacticState.edgeOff`), and a second Charge later gives none, so cycling round cannot
  farm it.
- **The old Charge! call** (`orderCharge`, `canCharge`, the log's `charge` entry) is kept in the sim, untouched, so saved logs and the
  tests that use it play as before; the page no longer calls it.

### The page (`src/tacticsView.ts`, `src/tactics.css`, `src/main.ts`)

- **The button** (`#tacticBtn`): in the spell row, directly under the Auto switch at its right end, 52 x 52 px. (Since COMBAT-HUD it sits at
  the right just above the hero rows, its word to its left: [combat-hud.md](combat-hud.md).) It shows "TACTIC" and the
  tactic's icon (a pennant for Advance, a shield for Hold, crossed blades for Charge; Charge's is red, Hold's blue). Each tap sends
  `orderTactic` for the next tactic in the cycle. It is in every fight but the Last Stand.
- **The word** (`#tacticWord`): under the button after each tap, the mode's short name ("Advance", "Hold", "Charge") in light text on a
  dark plate. It rises in, stays readable for about a second, then fades (1.6 s in all). With reduced motion it shows still and goes, with no
  movement or fade. It never takes a tap, and it is a polite live region for screen readers.
- **Remembering**: each tap keeps the pick in the save at once (`pickTactic`, `Meta.tactics`, per army or mode as before), so the next fight
  of that army or mode begins with it (`begin` still calls `setTactic`).
- **The Charge! button is gone**: Charge is one of the cycle's three, and choosing it while the party is held does what Charge! did, edge
  and all. From Advance it is two taps (Advance, Hold, Charge, the order the owner gave).
- **The prep screen's chip and its sheet are gone** from the bottom row (Hire, Pack, Auto, Home are left).
- **Formations** lived in that sheet. They now have a small **Formation button** of their own at the right of the board on the prep screen,
  under the top bar (`#formBtn`, at least 64 x 44 px), shown only once the formations are open (with Auto place, as before). It reads the
  shape the heroes stand in ("Formation / Wall", or "Loose"); a tap opens the same bottom sheet of the four shapes, and a tap on one sets the
  placed heroes out in it.
- **The advice line** that the old sheet showed ("They shoot: charge...") went with the sheet; `sim/tacticAdvice.ts` and its test are kept
  for a later home. A question for the owner, below.

### Shots

`node tools/tactics/shots.mjs` after `npm run web`, into `docs/samples/tactics-overview/`: `tactics-deploy-*` (the Formation button),
`tactics-forms-*` (its sheet), `tactics-arranged-*`, `tactics-fight-*` (the fight's start, the button under Auto), `tactics-cycled-*` (a tap:
"Hold" under the button), `tactics-mid-*` (four seconds on, a second tap: "Charge"), at 393x852, 360x780 and 412x915.

### Tests

`test/tactic-cycle.test.ts` (new, 7): the cycle's order; a change refused before the fight, in the Last Stand and to the same tactic; a
change waits for the next tick but shows at once, then holds the party; Charge mid-fight lets a held party go with the edge, which ends on
Advance and is not given twice; Charge after the line met gives no edge; Hold set mid-fight counts its cap from the change; a fight with
changes is deterministic, replays from its log, and differs from one without.

## 2. The hero Overview's stats

### What was wrong

Opened in the built game at 393x852 (a Knight at level 32, rank 2, with the best gear equipped from the Equipment tab), and compared with
main (0.364.0) and with 0.348.0's commit:

- **Health, Attack and Armour left out the gear, runes and talents' shares.** The Overview read 1504 / 47 / 10 with or without the gear,
  while the Hero power beside it rose from 3,377 to 4,472 and the hero fights with 1758 health, 52 attack and 11.4 armour (`addUnit`,
  `defenceOf`). The sheet's numbers came from `fightFigures` (the level's and rank's boost and the six scores' shares) and the kind's bare
  armour; the gear's `hp`, `atk` and `def` were never added. This has been so since the figures were written (0.330.0's rank-up scores; the
  sheet before that left them out too), so 0.348.0 shows the same wrong numbers.
- **0.356.0's UX fixes (finding #17) folded the ability scores, AC, to hit, skill DC, crit, saves and speeds under a closed "Details"**,
  so the Overview led with only those three wrong numbers, each stretched across the panel in a box of its own (its three-up row stacks, as
  the UX note says). In 0.348.0 the whole scores panel was up front.
- 0.349.0's ornate menus and the D&D stat lines (`statLines.ts`) do not change the numbers.

### The fix

- **`heroFigures(meta, kind)`** (`src/sim/power.ts`): a hero's health, attack and armour as a fight outside a run gives them, its level,
  rank, scores and the shares and armour its equipment, runes and talents add (`heroStats`), the same reads `addUnit` and `defenceOf` make.
  (A run's own boosts, the castle's and a wave's, come on top in the fight; they are not the hero's own.) Armour from gear comes in
  fractions, so it shows to a tenth ("11.4"). The three follow an equip or a talent learned, as the power and the speeds already did.
- **The Overview leads with the stats again**: the Hero power, then the ability scores panel with Health, Attack and Armour at its head and
  AC, to hit, skill DC, crit, initiative, saves and the next improvement, as before 0.356.0. Only the range and the speeds stay folded
  ("Details: range and speeds").
- Test: `test/hero-figures.test.ts` (new, 2): the Overview's figures are a placed hero's own (`maxHp`, its attack, `defenceOf`) with gear
  worn; gear raises them above the bare figures, and with nothing worn they agree with `fightFigures`.
- Shots: `docs/samples/tactics-overview/overview-before-*.png` (main) and `overview-after-*.png`, at 393x852, 360x780 and 412x915.

## Questions for the owner

1. The old tactic sheet showed a line of advice against the wave's foes ("They shoot: charge"). Bring it back somewhere (say, under the
   Fight! button, or as the first word the tactic button shows), or leave it out?
2. The fight starts with the tactic last chosen for that army or mode, and it can only be changed once the fight has begun. Should the button
   also show (and cycle) on the prep screen, before Fight!?
