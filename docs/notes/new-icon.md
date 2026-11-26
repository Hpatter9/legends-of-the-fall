# NEW-ICON: the game's new icon

The owner's new icon (PR #706, `art-source/icon/`) is a cracked gold crown over a black keep on its crag, against a crimson-to-black sky.
`python3 tools/icon/build.py` makes every size from the two layers. It does not use `icon-full.png`, because the emblem there fills only
about 42% of the canvas and is tiny at 48 px.

## How the icon is built

- **The full icon:** the sky with the emblem scaled to 64% of the icon's width. It sits centred and 2% high, because the keep's base is
  heavy.
- **The adaptive foreground** (Android 8 and later): the emblem scaled so that every drawn pixel lies inside the 66% safe circle (57% of
  the layer's width). The sky is its background layer.

## Files

- **Android, at every density (mdpi to xxxhdpi):**
  - `ic_launcher.png`: the square full icon, 48 dp;
  - `ic_launcher_round.png`: the full icon cut to a circle;
  - `ic_launcher_foreground.png` and `ic_launcher_background.png`: the adaptive layers, 108 dp.
- **Android, `mipmap-anydpi-v26/`:**
  - `ic_launcher.xml` and `ic_launcher_round.xml`, the adaptive icon;
  - its `monochrome` layer is the foreground, whose shape Android 13 themed icons use.
- **The web:**
  - `src/art/icon-192.png` and `icon-512.png`; the page's favicon is `icon-192.png`;
  - `src/art/icon-maskable-512.png`, which keeps the emblem inside the safe circle. It is new, so it is named in the manifest with
    `purpose: "maskable"` and in the service worker's `FILES` (`build.mjs`).
- **Google Play:** `docs/store/icon-512.png`, opaque 32-bit RGBA.

## Preview

`docs/samples/new-icon/preview.png` shows the old icon and the new one at 512, 192, 96, 48 and 36 px, and cropped to a circle, a
squircle and a rounded square.
