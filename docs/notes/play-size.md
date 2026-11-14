# Play size (PLAY-SIZE)

The release bundle was 318 MB, and Google Play refuses a bundle whose base module is over 200 MB to download
(`docs/notes/store-readiness.md`, section 1). This job follows that audit's plan: **A**, the web files in a Play asset pack;
**B**, the pictures out of `game.js` into files of their own; **C**, only a measure of what re-encoding the paintings would save.

## A. The web files in an install-time asset pack

### What is where

- `android/web/build.gradle`: a `com.android.asset-pack` module, pack name `web`, delivery **install-time**. Its files are
  `android/web/src/main/assets/public/...` (not committed: `android/.gitignore`).
- `android/settings.gradle` includes `:web`; `android/app/build.gradle` names it (`assetPacks = [":web"]`). An APK build
  (`assembleRelease`, `cap run`) ignores asset packs, so the plain APK is built exactly as before.
- `tools/play-size/pack.mjs` moves what `cap sync android` copied into the app module (`app/src/main/assets/public`) into the
  pack, and drops the source maps (as the app's `ignoreAssetsPattern` drops them from an APK). `--back` moves them back.
- `tools/play-size/sizes.mjs <aab> <bundletool.jar>`: bundletool's own reading of the downloads (base, pack, whole install),
  and a universal APK set; it fails if the base module is over 200 MB.
- `.github/workflows/android.yml`: after the APK, the same job builds the Play bundle (`npm run web:play`, `cap sync`,
  `pack.mjs`, `bundleRelease`), checks its sizes with bundletool, and attaches `legends-of-the-last-keep-<version>.aab` to the
  release beside the APK. With no release key it skips the bundle with a warning (a debug-signed bundle could never be uploaded)
  and releases the APK alone. Not run from this branch.

The Play build by hand:

```bash
npm run web:play && npx cap sync android && node tools/play-size/pack.mjs
(cd android && ./gradlew bundleRelease)
node tools/play-size/sizes.mjs android/app/build/outputs/bundle/release/app-release.aab bundletool-all-1.18.1.jar
node tools/play-size/pack.mjs --back   # before a plain APK build or `cap run` from the same tree (or just `cap sync` again)
```

### Why the page does not notice

Capacitor's local server reads every page file through the app's `AssetManager`:
`AndroidProtocolHandler.openAsset` is `context.getAssets().open(path, ACCESS_STREAMING)`, and `WebViewLocalServer` serves
`public/<path>` with it (the plugin lists in `JSExport` use `getAssets().list` the same way). An install-time asset pack is
installed with the app as one more split APK, and Android merges every installed split's `assets/` into the one
`AssetManager` the app's context hands out; Google's Play Asset Delivery guide says install-time packs are read with the
`AssetManager` API, at the same paths, with no Play Core library. The bundle confirms the layout:

- the pack's manifest is `<dist:module dist:type="asset-pack"> <dist:fusing dist:include="true"/> <dist:install-time/>`;
- the bundle has `web/assets/public/...` (1,453 files) and no `base/assets/public` at all; `base/assets` keeps only
  `capacitor.config.json` and `capacitor.plugins.json`;
- `bundletool build-apks --local-testing` makes `splits/base-master.apk` (3 MB) and `asset-slices/web-master.apk`;
- the universal APK bundletool fuses from it has the files back at `assets/public/...` (`index.html`, `game.js`, 1,453 in all),
  the exact paths the plain APK has them at.

What could not be shown here is the running app: **no Android emulator can run on this machine** (no `/dev/kvm`, and the
emulator needs it), so neither the split install nor a page load from the pack was seen on Android.

### The GitHub APK: kept as the plain APK, not the bundle's universal APK

The audit suggested building the GitHub release's APK as the bundle's universal APK. It stays the plain `assembleRelease` APK
instead, because:

- the two are different web builds on purpose: the GitHub APK looks for updates on GitHub, which the Play build (`--store play`)
  must not (Play's policy, `src/appUpdate.ts`), so a universal APK of the Play bundle would lose the "Update available" row;
- the plain APK is unchanged, byte for byte the same layout as before, so updates over the owner's installed app behave as now;
- the bundle's universal APK is bigger (374 MB against 319 MB): the pack's files are stored uncompressed in it.

Both are signed with the same release key (the same four secrets).

### Sizes (0.590.0 + the store fixes, debug-signed here)

| What | Before | After A |
| --- | --- | --- |
| `game.js` | 208.0 MB | 208.0 MB (unchanged by A) |
| `app-release.aab` | 318.3 MB | 318.3 MB |
| base module, download (bundletool `get-size`, largest device) | 317.8 MB | **2.9 MB** |
| `web` asset pack, download | — | 314.9 MB |
| whole install, download | 317.8 MB | 317.8 MB |
| universal APK (from the bundle) | 318.8 MB | 374.3 MB |
| plain APK (`assembleRelease`, the GitHub one) | 318.7 MB | 318.7 MB |

The pack is well inside Play's asset-pack limits (an install-time pack may be far larger: the Play Console Help page "Maximum
size limits", which could not be reached from here, so confirm the figures there). On the phone the pack's files are stored
uncompressed (bundletool's default for asset packs), so the installed app takes about 375 MB against 319 MB now; only
`game.js` compresses, and B takes most of that away.

### What the owner must check on a phone (internal testing)

1. Upload `legends-of-the-last-keep-<version>.aab` to Play Console, Testing, **Internal testing**. The upload must pass with no
   size error; App bundle explorer should show the base module at about 3 MB and an install-time asset pack `web`.
2. Before installing: if Play App Signing uses a different key from the GitHub APK's, Play cannot install over the GitHub app.
   Uninstall it first (this loses the save), or enrol with the existing release key (the audit's advice) so it updates in place.
3. Install from the internal-test link, then, with the phone online once and then in airplane mode:
   - a cold start shows the loading picture, then the camp (or the starter pick on a fresh install), with the fonts;
   - the paintings: the camp, a hero's portrait and full art, the summoning (its Blender show), an Eidolon's card and calling;
   - music and sounds play; a whole fight, with an ultimate and a king's spell;
   - the Assault opens (its own worker file, `assault-worker.js`);
   - Settings, About has **no** "Update available" row (the Play build never looks).
4. Settings, Apps, the game, Storage: about 375 MB (see above).
5. Leave it a day, then update to the next internal build: the save must stay.

### What ran (A)

- `npm run web:play`, `cap sync android`, `pack.mjs`, `./gradlew bundleRelease` (Android SDK 36 and build-tools 35 fetched into
  scratch; Maven Central answered 429 here, so Gradle read it through Google's mirror with a local init script, not committed).
- The workflow's order in one tree: `npm run web`, `cap sync`, `assembleRelease` (the APK: 1,453 files in `assets/public`, the
  non-Play `game.js`), then the Play bundle: no `base/assets/public` was left from the APK build's outputs, and the bundle's
  `game.js` is the Play build's.
- bundletool 1.18.1: `build-apks --local-testing`, `build-apks --mode=universal`, `get-size total` (whole and `--modules=base`),
  `dump manifest --module=web`; `aapt2 dump badging` on the universal APK (target 36, `INTERNET` only).
- As a fresh checkout has it (no `android/web/src` at all): `assembleRelease` builds the same 318.7 MB APK; `pack.mjs --back`
  moves the files back.
- The workflow file was parsed as YAML; it was **not run**.

## B. The pictures out of `game.js`

### What changed

`build.mjs` has an esbuild plugin, `artFiles`. A PNG or WebP the code imports that is **16 KB or more** (`SMALL_ART`) is written
beside `game.js` as its own file, `art/<folder>/<name>-<hash>.<ext>` (the folder under `src/art/`, the name carrying the content's
hash), and the import's value is that file's relative URL in place of a `data:` URL. Smaller pictures (the icons) stay inside
`game.js` as data URLs, as every picture did before, so nothing small waits on a request. The plugin reads the build's metafile when
it ends and writes the service worker then, with every emitted picture in `FILES` (`ART_FILES`), in a plain build and on each
rebuild of `npm run dev`. The assault worker imports no pictures and is untouched. No game code changed.

Why it is safe without touching the loaders: no code reads a picture's value as a data URL (nothing tests for `data:`, decodes base64
or uses its length); every use goes through `loadImage`/`warmImage`, `new Image()`, Pixi's `Texture.from` of a loaded image, or a
CSS `url()`, all of which take a same-origin URL just as well, and asynchronously in both cases. So texReady's kept sheets, the
off-thread decodes, the soft canvases and the atlas budget see the same images, only fetched instead of inlined. The files' names
are plain (letters, digits, `_`, `-`, `/`, `.`), so unquoted CSS `url()`s are safe.

- 416 files, 149.6 MB, each byte-for-byte the same as its source in `src/art/` (checked); 723 icons (2.5 MB) stay inline.
- `test/play-size.test.ts` holds the rules: the size threshold, hashed names, `ART_FILES` in `FILES`, and A's wiring.
- `tools/play-size/compare.mjs --before <dir> --after <dir>` measures two builds side by side (below).

### Measured (0.591.0 against the same with B; Chromium at 393x852, the CPU throttled 4x, software rendering)

| | Before | After B |
| --- | --- | --- |
| `game.js` | 208.0 MB | **8.6 MB** |
| `out/web` without source maps | 371 MB | 311 MB (the base64 third is gone) |
| start to the camp (the loading screen gone: the game's first frame), 3 runs | 68.1, 67.0, 72.5 s | **51.3, 50.1, 51.0 s** |
| the page's renderer process memory, settled at the camp, 3 runs | 1,588, 1,558, 1,617 MB | **1,104, 1,091, 1,105 MB** |
| JS heap used, settled | 43 MB | 24 MB |

(The software renderer makes every start slow on this machine; the 17 s and 480 MB saved are what to read, not the totals. The memory
saved is the 208 MB script held as source plus its strings: on a 3 to 4 GB phone that is the margin the audit worried about.)

**The same look.** Every home tab, the spellbook, the War Room, a deploy (the same run seed) and a fight a few seconds in, with
reduced motion, photographed in both builds and compared pixel by pixel: 0.14% differs on each, which is the version line top right
(it names the commit); a first run with the same commit on both showed 0.00% on every screen but the fight (0.18%, the fight's own
timing). No page errors, no failed requests, no broken `<img>` in either.

**Offline.** One online visit: the service worker's cache held all 1,867 files in `FILES` (0 missing). Then the network cut and the
page loaded again: the same tour, 0 page errors, 0 failed requests, 0 broken pictures. (The app does not use the service worker; it
reads the same files from its assets, A above.)

**A fight's stalls** (`tools/wave-delay/delays.mjs --real --cpu 4 --waves 4 --configs auto1,hand1`, run twice each way, in both
orders). Frames over 100 ms per second of fight:

| | Auto | By hand |
| --- | --- | --- |
| before | 4.65, 4.24 | 4.56, 4.62 |
| after | 4.93, 4.61 | 4.40, 4.45 |

No difference beyond the run-to-run spread; the worst frames are about the same (1.1 to 1.5 s, the first frame of a fight handing
its pictures to the graphics card, in both). Stops of 250 ms or more are the ultimates' showcases by hand, as designed. The one
"error" in each Auto run is the browser's benign ResizeObserver notice, in both builds.

**Freeze-fix soak** (`tools/freeze-fix/soak.mjs --minutes 20`, four modes, faults on): 36 fights, every wave's end showed something
(1.25 s at the middle, 2.0 s at the worst, none over 8 s); the 4 flags are that same ResizeObserver notice; no page errors.
**March-stays film** (`tools/march-stays/film.mjs`, CPU 4x): 4 hand-overs all held, 4 deploys and fight starts all drawn, no dead
sprite, no page errors.

### Sizes with B (0.594.0)

| What | After A | After A and B |
| --- | --- | --- |
| `game.js` | 208.0 MB | 8.6 MB |
| `app-release.aab` | 318.3 MB | 316.6 MB |
| base module, download | 2.9 MB | 2.9 MB |
| `web` asset pack, download | 314.9 MB | 313.1 MB |
| whole install, download | 317.8 MB | 316.0 MB |
| universal APK (from the bundle) | 374.3 MB | 324.6 MB |
| plain APK (the GitHub one) | 318.7 MB | 318.2 MB |

As the audit said, B saves almost nothing in download (deflate already undid base64); what it saves is on the phone: the pack's files
are stored uncompressed, so the installed app is about 50 MB smaller, and the WebView no longer parses and holds a 208 MB script.

## C. Re-encoding the PNGs as WebP (measured, not done)

`python3 tools/play-size/webp-estimate.py out/web` encodes every shipped PNG in memory (no file changed). A PNG with more than 4,096
colours in a sample is counted a "painting", the rest "pixel art"; the split is rough (a Blender effect sheet with soft edges counts
as a painting, and some sheets of many-coloured sprites may too), so the owner's eye decides each.

| | PNGs | Now | Lossy WebP q90 | Lossless WebP |
| --- | --- | --- | --- | --- |
| paintings | 346 | 185.4 MB | 50.1 MB (−73%) | 140.9 MB (−24%) |
| pixel art | 325 | 15.6 MB | 9.0 MB (−42%) | 5.9 MB (−62%) |

Paintings lossy and pixel art lossless: 201.0 MB of PNG becomes 56.0 MB (−72%), about 145 MB off the 316 MB download. All lossless
(safe for every picture): about 55 MB off. The audit's sample (−71% on the 40 largest) holds across the whole set. The WebP files
already shipped were not measured.

### What ran (B and C)

- `npm run typecheck`; the full `npm test` (3,404 pass, 0 fail) on 0.594.0 with B; `npm test -- play-size painted-buttons blender-fx
  epic-music`; `npm run web`, `npm run web:play`, and `npm run dev` (it serves the art files and lists all 416 in `sw.js`).
- `tools/play-size/compare.mjs` (3 start runs each, the screens, offline), `tools/wave-delay/delays.mjs` (twice each way),
  `tools/freeze-fix/soak.mjs --minutes 20 --waves 40`, `tools/march-stays/film.mjs`.
- `cap sync`, `assembleRelease`, `pack.mjs`, `bundleRelease`, `sizes.mjs` (bundletool 1.18.1) at 0.594.0.
- `tools/play-size/webp-estimate.py`.
- Not run: anything on an Android device or emulator (no `/dev/kvm` here), so the memory and start-up gain in the app's WebView is
  inferred from Chromium, not measured. **On the phone**, after B: the internal-test checklist under A, plus Settings, Diagnostics
  after a few waves (the stops it lists), and the app's storage (about 325 MB, against about 375 MB with A alone).
