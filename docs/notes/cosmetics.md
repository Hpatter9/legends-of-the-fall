# Wearable cosmetics (COSMETICS)

The owner: make the Shop's cosmetics wearable, so they can be sold. A look is sold only once it can be chosen, worn and seen. Ownership is
the store's (RevenueCat's entitlements, cached on the device under `legends.purchases`, restored on a new phone or after Start over).
Turning a look off is always possible. Nothing changes a stat.

## On sale now

| Product | Entitlement | What the player gets |
| --- | --- | --- |
| `look_starfall` ($3.99) | `starfall_summons` | Starfall summons: the summoning cards' back and a burst of violet and gold stars |

**Waiting on art ("Coming soon", not sold):**
- Duchess's three costumes (`look_duchess_regalia`, `look_duchess_knight`, `look_duchess_lantern`) and `bundle_wardrobe`. A first version
  laid small pieces cut from the round-2 costume art over her frames; **the owner turned it down** ("they look bad and must be redrawn").
  They are to be redrawn as whole dressed sheets of her (below).
- `ruler_ember` and `ruler_starlit`: round 2 painted their action atlases, but a ruler also needs its Crown Terrace figure, its domain
  painting and a throne; the prompts are in `docs/notes/cosmetics-art-prompts.md`.

## Duchess's costumes: ready for whole dressed sheets

- **`DRESSED`** (`src/render/duchessRules.ts`): per bought costume, the redrawn art as whole sheets of Duchess wearing it, swapped in for
  hers, never laid over her: `walk` (her walking strip in `goat.png`'s layout, 288 x 48: three frames facing left, three facing right; the
  tavern's half size is cut from it), `battle` (her battle sheet in `duchess_goat.png`'s layout, 512 x 640, 128 px cells: walk, headbutt,
  idle, hurt, fall), and `terrace` (true when the Crown Terrace's eight poses are in `src/art/crown-terrace/` as `duchess-<costume>-0.webp`
  to `-7.webp`, the layout of her `duchess-0` to `-7`). Empty today.
- **Swapped in where she is drawn** (`duchessDress.ts`): the camp and her fight card (`walkArt`), the tavern (`walkArt(…, true)`, half
  size), the Crown Terrace (`terracePoses`), the cutscenes (`dressWalk`) and the fight (`dressBattle`, from `sheets.ts` as it loads
  `duchess_goat`, again when the costume changes, `redressDuchess`). **A sheet not there, or one that fails to load, falls back to her plain
  sheet**; nothing is drawn over her for a bought costume.
- **To wire the redrawn art:** put the files in `src/art/duchess/dressed/` (`<costume>-walk.png`, `<costume>-battle.png`) and the terrace
  poses in `src/art/crown-terrace/`, import the two sheets in `duchessRules.ts` and fill `DRESSED`, e.g.
  `regalia: { walk: regaliaWalk, battle: regaliaBattle, terrace: true }`. When a costume has all three (`fullyDressed`), set its product
  `ready: true` (and the wardrobe's once all three are), and the tests follow.
- **The anchoring** (`tools/cosmetics/costumes.py`) stays as a reference: it finds her head (horn top, face front) and body (rump, hooves) in
  every frame of both sheets and lays the round-2 pieces there, into `out/costume-preview/` (not shipped), a guide for where a redrawn
  costume sits frame by frame.
- **Chosen** in Settings, Ruler and Duchess, "Duchess costume": a bought costume is listed once owned, or while the Shop sells it (so none is
  listed today), "In the Shop" while not owned; a tap on her in the tavern cycles through the costumes she has. **None** is always there.
- **Worn only while hers** (`wornCostume`): a refunded costume comes off by itself.
- The free costumes (the tin crown, the wizard hat, the quiver) are still drawn over her walking strip in code; their painted versions are
  round 4's (`docs/notes/art-remaining-wiring.md` on `claude/art-remaining`), and can come as dressed sheets the same way.

## Starfall summons

- `tools/cosmetics/starfall.py` cuts `starfall_cardback.png` and `starfall_burst.png` (eight frames) into `src/art/starfall/`.
- `src/starfall.ts`: every summoning card shows the Starfall back before it turns (`tarotBack`), and its painted burst goes off as a card turns, in place of
  the classic flourish and within the card's own bounds (`cardFlourish`) and as a new hero arrives (`firstReveal`, its arrival). None of the burst under reduced motion.
- Chosen in Settings, Ruler and Duchess, "Summoning look": Classic or Starfall. Classic is always there; Starfall is greyed until it is owned.

## The Shop

- Starfall has `ready: true` in `PRODUCTS`; the rest are "Coming soon". An owned look reads "Owned · wear it in Settings, Ruler and Duchess", and a purchase's
  card offers **Wear it now** (the wardrobe puts on the regalia first).
- `docs/notes/store-readiness.md` §7: only `look_starfall` is made in Play Console now; the rest when each is on sale.

## Checked

- `test/cosmetics.test.ts`: each costume is owned by its entitlement alone (never by play), worn only while owned and taken off by a refund;
  none always there; the Shop's products and the game read the same entitlements; a costume is sold only once it is fully dressed (none
  today), Starfall is; nothing sold gives a stat; a costume with no dressed sheet is drawn in her plain sheets, and the cut-down overlays
  are gone; the fight never reads a costume. `test/iap.test.ts`: only Starfall of the cosmetics on sale.
- `node tools/cosmetics/shots.mjs` (after `npm run web`): the Settings page and the costume picker (owned and not), a ten-summon in Starfall
  and in Classic, a new hero's Starfall arrival, the Shop's cosmetics at the three sizes, and a purchase of Starfall with "Wear it now"
  (Starfall on after it). Pictures in `docs/samples/cosmetics/`.
