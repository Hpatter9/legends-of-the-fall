# Wearable cosmetics (COSMETICS)

The owner: make the Shop's cosmetics wearable, so they can be sold. A look is sold only once it can be chosen, worn and seen. Ownership is
the store's (RevenueCat's entitlements, cached on the device under `legends.purchases`, restored on a new phone or after Start over).
Turning a look off is always possible. Nothing changes a stat.

## On sale now

| Product | Entitlement | What the player gets |
| --- | --- | --- |
| `look_duchess_regalia` ($1.99) | `duchess_regalia` | Duchess's Royal Regalia: an ermine cape on her back and a jewelled crown |
| `look_duchess_knight` ($1.99) | `duchess_knight` | Duchess's Little Knight: a plumed steel helm |
| `look_duchess_lantern` ($1.99) | `duchess_lantern` | Duchess's Lantern: a brass lantern hung from her horns |
| `bundle_wardrobe` ($3.99) | all three | all three costumes |
| `look_starfall` ($3.99) | `starfall_summons` | Starfall summons: the summoning cards' back and a burst of violet and gold stars |

**Waiting on art:** `ruler_ember` and `ruler_starlit` stay "Coming soon" (not on sale). Round 2 painted their action atlases, but a ruler
also needs its Crown Terrace figure, its domain painting and a throne; the prompts are in `docs/notes/cosmetics-art-prompts.md`.

## Duchess's costumes

- **The pieces** (`tools/cosmetics/costumes.py`, from `art-source/round2/costume_*.png`): the regalia's crown and its cape cut apart, the
  knight's helm, the lantern; each scaled down to her own size on its own painted palette (so the crown stays gold, its highlight kept)
  with a hard alpha cut (no halo), drawn facing right and mirrored for left.
- **Anchored per frame.** The tool finds her head in each frame (the top of her horns, and the front of her face under them) and lays the
  crown, the helm and the lantern there; the cape is anchored to her body (her rump and her hooves), so it stays on her back when her head
  goes down to butt. Two overlay sheets, on her sheets' own grids:
  - `src/art/duchess/costumes-walk.png` (96 x 144: a row a costume, a column a facing) over her walking strip, drawn by
    `drawDuchessCosmetic` wherever she walks: the camp, the tavern, the castle, her card when she joins a fight; and baked into her
    cutscene strip (`dressWalk`, `duchessDress.ts`, for `sceneView.ts`).
  - `src/art/duchess/costumes-battle.png` (her battle sheet again, once a costume) over her battle sheet (`dressBattle`, used by
    `sheets.ts` when it loads `duchess_goat`; made again when the costume changes, `redressDuchess`). Her two fall frames are left bare.
- **Chosen** in Settings, Ruler and Duchess, "Duchess costume" (the picker lists a bought costume where the Shop sells it or once it is owned;
  "In the Shop" while not owned), or by tapping her in the tavern (it cycles through the costumes she has). **None** is always there.
- **Worn only while hers** (`wornCostume`): a refunded costume comes off by itself.

### Adding a costume's painted overlay (round 4: the tin crown, the wizard hat, the quiver)

The anchoring is general: `tools/cosmetics/costumes.py` finds her head (horn top, face front) and her body (rump, hooves) in every frame of
both sheets, and lays a costume's pieces at offsets from those. To add one: give it its pieces in `pieces()` and its anchors in `dress()`,
add its name to `COSTUMES`, and add it to `OVERLAY_COSTUMES` (`duchessRules.ts`) in the same row order (a test holds them together). Its
code drawing in `drawDuchessCosmetic` is then never reached (an overlay costume is drawn from the sheet first) and can go. It is drawn
everywhere the three are, the fight included; a free one keeps its own unlock rule (no entitlement).

## Starfall summons

- `tools/cosmetics/starfall.py` cuts `starfall_cardback.png` and `starfall_burst.png` (eight frames) into `src/art/starfall/`.
- `src/starfall.ts`: every summoning card shows the Starfall back before it turns (`tarotBack`), and its painted burst goes off as a card turns, in place of
  the classic flourish and within the card's own bounds (`cardFlourish`) and as a new hero arrives (`firstReveal`, its arrival). None of the burst under reduced motion.
- Chosen in Settings, Ruler and Duchess, "Summoning look": Classic or Starfall. Classic is always there; Starfall is greyed until it is owned.

## The Shop

- The five on sale have `ready: true` in `PRODUCTS`. An owned look reads "Owned · wear it in Settings, Ruler and Duchess", and a purchase's
  card offers **Wear it now** (the wardrobe puts on the regalia first).
- `docs/notes/store-readiness.md` §7 lists the product IDs to make in Play Console now, and the two to make later.

## Checked

- `test/cosmetics.test.ts`: each costume is owned by its entitlement alone (never by play), worn only while owned and taken off by a refund;
  none always there; the Shop's products and the game read the same entitlements; nothing sold gives a stat; the overlays sit on her sheets'
  own grids; the fight never reads a costume. `test/iap.test.ts`: the five on sale, the two rulers still "Coming soon".
- `node tools/cosmetics/shots.mjs` (after `npm run web`): each costume in the camp and the tavern, her dressed walking strip and battle sheet
  drawn large, the Settings page and the picker (owned and not), a ten-summon in Starfall and in Classic, a new hero's Starfall arrival,
  and the Shop's cosmetics (at the three sizes), a purchase's "Wear it now" (and the helm on after it). Pictures in `docs/samples/cosmetics/`.
