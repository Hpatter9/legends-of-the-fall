# HUD-FACES — the heroes' painted faces in the fight's stat views

The owner: "Let's use the character arts' faces in the battles for their images during a wave, when it shows all their stats."

## What shows a face

Wherever a hero's picture sits beside its stats during a wave, the pixel sprite portrait gives way to the hero's painted art, cut to its face:

- the fight HUD's hero rows (`fightHud.ts`): the ordinary fight's five, the Last Stand's eight and a Calamity fight's ten (the compact rows of two
  columns), all through the same row builder;
- the unit info card (press and hold a hero; `main.ts` and `standView.ts` `openInfo`);
- the Last Stand's paused sheet (its round pictures beside the bars, Atk, Def and Kills).

An awakened hero shows its awakened painting's face (`heroes/awakened-<kind>.webp`; in the HUD the same step its sprite took, `equipmentStep`
or `u.awaken`); the rest show the plain art's half-length portrait (`heroes/<kind>-portrait.webp`). Summons (a unit with an `owner`), guests,
foes and anything without a face box keep their sprite portrait. The skill cast banner keeps its pixel portrait (an ultimate's already shows the
painting). The deploy tray's cards and the rim arrows show no stats and are unchanged.

## How

- `src/heroFaceRules.ts` (pure, tested): `HUD_FACES`, each hero's face box in both paintings: `[cx, cy, side]`, the centre as shares of the
  picture's width and height and the square's side as a share of its width. `faceBox(kind, awakened)`, `faceUrl`, `hasFace`, and `faceRect`
  (the box in pixels, kept inside the picture). The boxes were framed by eye against `docs/samples/hud-faces-sheet.png` (each hero plain and
  awakened, at 88 pixels and at the HUD's 34).
- `src/heroFace.ts`: `heroFace(kind, awakened, px, fallback)` returns a canvas `px` square (72 for a row, 96 for the info card, 64 for the
  sheet, about twice the size it is drawn). Each painting is loaded once (`pictures`), each face is cut and scaled down once a size (`crops`),
  and later rows copy the cached crop. Until the painting has loaded, or if it fails, the canvas shows the sprite portrait. No new files: the
  paintings are already copied by `build.mjs` and listed for the service worker (`HERO_ART_FILES`), so it plays offline.
- `fightHud.css`: `:is(.fhPic, .uiCard, .stSheetHead) canvas.heroFace` is drawn smooth (the sprites stay pixelated). The rows keep their size.

## Checks

- `test/hud-faces.test.ts`: every hero has a box in both paintings, each painting exists, every box lies inside its picture (sizes read from
  the WebP headers) with at least 48 pixels of painting to scale down, non-heroes have none, and `faceRect` clamps.
- `tools/hud-faces/shots.mjs` (a copy of the battle-HUD shot tool with these scenes): `ROOT=out/web node tools/hud-faces/shots.mjs [prefix]`
  writes `docs/samples/<prefix>-{fight,awake,info,calamity,stand,standsheet}-<w>.png` at 393, 360 and 412 wide and counts the faces drawn.
  `hud-faces-before-*` are the same scenes before the change (393 wide).

## RECAP-SPOILS: the final recap's spoils page and the heroes' art

The owner: "I want a gear, items, and money gained screen as part of the final battle recap. And I want to use the character art on that
screen for the heroes." Then: "Gold doesn't matter at the end since it is only for the waves, so it can be left off", "No need for the final
recap to have the individual wave best heroes and stars listed" and "Summons don't need to show on the battle recap as heroes."

- **The spoils page** (`jrpgRecapView.ts`, `JrData.spoils`): its own step of the results screen, after the company's XP and level-ups and the
  MVP, before the lines and buttons, headed "Spoils of the run", in three groups: **Money** (crowns, the replay's share noted, and summoning
  stones, counted up with their icons; no run gold), **Gear** (each piece with its painted icon, its name in its rarity's colour and where it
  went: "Worn by Kenji", "In the run's pack", "To the armoury"; two columns past six pieces) and **Items** (heroes joining, chests, relics,
  unlock shards, shards, tomes, rift ores as chips). Nothing found shows "Nothing found this time." A big haul arrives within two seconds;
  a tap (or Skip) runs every count to its end; reduced motion shows the end at once. The old Spoils section (gold, crowns, chests counted;
  the fight's items) is replaced by it on every final screen, so nothing shows twice.
- **Where it shows:** the run's end recap (army runs, the daily, endless: `runResult`), a run-ending fight's own results screen (a spire's or
  Calamity's last fight, a quest battle: `fightResult`, the whole run's spoils) and the Last Stand's end card (its chests, equipment, rift
  ores and relics moved from the card's fact rows onto the page; waves cleared, foes felled and heroes held stay). The card between waves
  keeps its gold line and chips as they were.
- **The run's gains**: `src/sim/runSpoils.ts` (pure, tested in `test/recap-spoils.test.ts`): `noteSpoils` adds each wave's `gainsSince`
  (`waveGains.ts`, unfiltered) to `RunRecap.spoils` (optional; an older save shows what it gains from then on; at most `SPOILS_KEPT`, 120
  lines; hires are not spoils), `spoilsOf` sorts them into the groups, `gearWhere`, `standSpoilGains` (the Stand's summary as gains, its
  equipment names matched to the newest pieces for rarity and icon). Hooked in `main.ts` where the wave card is built.
- **The heroes' art:** the results rows, the run recap's Company performance rows and the Stand's eight show the painted face (`heroFace`,
  112 or 96 pixels, the awakened form's once awakened, the sprite until it loads or for one without a painting). The MVP gets a bigger piece:
  head and shoulders from the painting in a 68 x 88 frame (`heroBust`, cut by `bustRect` round the face box: about twice the face across,
  from just above it; `mvpArt`), the sprite if it fails.
- **No wave strip:** `recapDetail`'s `strip` is optional; the run's end recap (`recapView.ts`) passes none, so each wave's stars and best hero
  are no longer listed (the run's result and MVP stay). The spire's and the Calamity's summaries (`towerView.ts`) keep their floor-by-floor
  and fight-by-fight strips (a question for the owner). `tools/jrpg-recap/shots.mjs` asserted the strip; it now asserts it is gone.
- **Summons are not heroes:** `fieldedHero` / `recapKind` (`fightStats.ts`): a unit with an `owner` or a `summon` kind (wolves, treants,
  wraiths, the standard, decoys, the Duchess, the king) gets no stats row (`startStats`), so no row on any recap and never the MVP
  (`mvpOf`, `mvpKind` skips an older save's summon rows too). What a summon does was and is credited to its caller (`tally`), so a summoner's
  MVP total counts its summons' damage. Guests are fielded heroes and still show. Eidolons strike as no unit (`by` 0) and count for no one.
- Screenshots: `tools/recap-spoils/shots.mjs` → `docs/samples/recap-spoils-*.png` (the between-waves card and its big haul, the run recap
  and its spoils page, a spire's last fight, the Stand's eight and their spoils).
