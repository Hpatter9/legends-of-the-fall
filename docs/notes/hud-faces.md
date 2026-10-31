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
