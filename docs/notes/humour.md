# Humour and Duchess

The owner's ask: more character and life, humour, "maybe even bringing Duchess over from Chronos". There was no
`docs/backlog.md` in the repo to take items off, so nothing was removed there.

## Duchess the goat

- Her sheet is Chronos's cutscene goat (`src/art/duchess/goat.png`, 48-pixel frames: three steps walking left, three
  right), copied as it is; credit in `CREDITS.md` (whtdragon's RPG Maker MV white goat, same licence note as Chronos).
- Her behaviour is pure (`src/render/duchessRules.ts`, tested in `test/duchess.test.ts`): she grazes (a one-pixel chew
  bob), ambles, now and then walks up to a hero and nibbles, and when tapped hops once (450 ms, 9 px) and says "Mehh.".
  A tap during a hop is ignored. Under reduced motion she stands still but still hops. Nothing blinks or flashes.
- Where she lives:
  - **The camp** (`camp.ts`): drawn inside the scene, sorted by her feet, on a strip in front of the heroes, clear of the
    buttons. She nibbles at heroes and says "Nom." now and then (her own remarks wait 9 s between them).
  - **The tavern** (`tavern.ts`): wanders the hearth hall's floor.
  - **The fight** (`duchess.ts`, `PageGoat`): sits above the panel's left edge; bleats at a big hit, a boss's card and a
    wipe. Only her own 48 px takes a tap.
- Her bubble is cream-coloured; tapping her always answers, even with quips off.

## Hero quips

- `src/quipData.ts`: four lines for each of the 45 heroes (hired or picked, first placed, won, lost), in their own voice,
  and banter lines for 25 traits (two heroes sharing a trait trade a line at the end of a fight).
- `src/render/quipRules.ts` (pure, `test/quips.test.ts`): `QuipBox` rate-limits them: at most one bubble per 5 s, five per
  scene, a hero's "first placed" once per scene, a win or loss may speak inside the gap, and each moment has a chance
  (0.5 to 0.9). Picks come from a side stream of the save's seed (`mixSeed(seed, 0x71b5)`), never the fight's stream.
- `src/quipView.ts`: the bubble (one at a time, 12 px, the Stone tokens, fades in and out once, never takes a tap).
  `src/quips.ts` glues rules, words and bubble together for the pages.
- Shown: when a pack is picked, a hero is hired, a hero is first placed, a fight ends (and as banter).
- **Settings:** "Hero quips" (on by default; `Settings.quips`, saves stay compatible: a missing flag means on).

## Funny text (meaning kept, jokes added)

- Foes grumble at the start of a fight about staffing and pay ("Management says we are fully staffed. There are four of
  us."), likelier when the band is three or fewer. Same quip rate limit, once a scene.
- A dry line under the result's numbers (`#joke`), and under the run recap's title. Chosen from the run's seed, so a
  given fight always says the same thing.
- Loading screen: a joke tip at the foot (`.ldTip`); the list is `LOADING_TIPS`.
- An aside under each achievement (`AWARD_JOKES`), the event cards' intro lines (shrine, merchant, chest, ...) and the
  castle buildings' blurbs.

## Checks

`npm run typecheck`, `npm test`, `npm run web`; screenshots at 393x852, 360x780 and 412x915 in `docs/notes/humour/`.

## For the owner to decide

- In the tavern Duchess is drawn at the camp's size, which makes her as tall as a hero there; a smaller goat would need a
  half-size cut of her sheet.
- Whether the foes' grumbles and the heroes' ending lines should also appear on auto-replay runs (they do not: auto runs
  stay quiet).
