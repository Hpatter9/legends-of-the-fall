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
