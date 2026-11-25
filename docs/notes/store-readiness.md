# Store readiness (Google Play first; the App Store at the end)

The owner's ask: release the game to the app store soon, without running into many issues. This is an audit of the Android app
(`docs/notes/android-app.md`: Capacitor wrapping `out/web`, built by `.github/workflows/android.yml`) against Google Play's rules, made on
0.590.0 (branch `claude/store-ready`), 14 November 2026. Each item is **pass**, **fail** or **owner action**. "Fixed" marks what this
branch changed.

## The short version

**Fails (each blocks a Play release):**

1. **Size.** The release AAB is **318 MB compressed**; Play's limit for the base module is **200 MB**. Play rejects the upload. Plan below.
2. **In-app credits** (now done on `claude/store-credits`: Settings, Credits, `docs/notes/store-credits.md`). Several licences (CC-BY 3.0/4.0 music and DawnLike tiles, the LPC sprite's CC-BY-SA) need attribution where players
   can see it. The app's About row says "every source is named in the game's credits list", but no such list is in the app. (CREDITS.md
   is in a private repo.)
3. **Unknown-licence assets ship.** The Golem Forge golems and the Druid's treant (batareya's pack), Duchess the goat and the
   Beastmaster's wolves (whtdragon's RPG Maker MV animals), and eight recorded combat sounds (PR #150, source not recorded). CREDITS.md
   itself says "check the author's terms before any public release". (LICENCE-REPLACE: the owner's answer was "Replace them"; the
   sounds are replaced by the game's own synth, and the art is being repainted: `docs/notes/licence-replace.md`.)

**Fixed on this branch:** target API 36 (it was 35, and Play has refused 35 for new apps and updates since 31 August 2026; the
extension window closed 1 November); the update check is off in a Play build (`--store play`); the save is now backed up and moves to a
new phone; the app is marked a game so Android 16 keeps it upright on tablets.

**Owner actions:** a Play developer account and its **12-tester, 14-day closed test** (required of new personal accounts before
production); enrol in Play App Signing with the existing release key as the upload key; a privacy policy URL (draft in
`docs/store/privacy-policy.html`); the Data safety, content rating and target audience forms (answers below); the listing (draft text,
screenshots and a feature graphic below); exclude low-memory phones in the device catalogue.

**Verdict:** not ready to submit today, but close. The Android project itself is in good shape (one permission, portrait, release key
in use, no cleartext, phone Back handled). Three things stand between this and a Play release: the size (a day or two of build work,
with a clear route), the in-app credits screen (a small UI job), and the owner settling the four unknown-licence assets (decide, or
replace them). The account's 14-day closed test can start on an internal build while those are done, so it does not have to add to the
wait.

## 1. Package format and size

| Item | Result |
| --- | --- |
| Format: Play needs an Android App Bundle (AAB) for new apps | **owner action**: the workflow builds only an APK (`assembleRelease`). `bundleRelease` works: it was built here (below). A Play job needs a step that builds the AAB with the `--store play` web build. |
| Base module ≤ 200 MB compressed | **fail**: 318 MB |

Measured here (Android SDK 35/36, the project's own Gradle, debug-signed, nothing published): `npm run web`, `cap sync android`,
`./gradlew bundleRelease assembleRelease`.

| What | Size |
| --- | --- |
| `out/web` without source maps (the maps are kept out of the APK by `ignoreAssetsPattern`) | 371 MB raw |
| `app-release.aab` | 318.3 MB; entries compressed: assets 314.8 MB, code 2.4 MB |
| `app-release.apk` | 318.7 MB |
| `game.js` | 208 MB raw, 154 MB compressed: 1,140 pictures inlined as base64 data URLs (194 MB of PNG, 8 MB of WebP) |
| the files beside it | awakened 43 MB, heroes 42 MB, ui 39 MB, assault 11 MB, fx 9 MB, audio 5 MB, eidolons 5 MB (all PNG/WebP/Opus: they do not compress further) |

So the download is about 318 MB however it is packed; to fit the base module the pictures must either leave it or shrink by over a third.

(Play's limits, from the Play Console Help page "Maximum size limits": 200 MB for the base module's compressed download, far more for
asset packs, about 1.5 GB each and several GB in all. support.google.com could not be reached from this machine, so confirm the current
figures there.)

### The options

| Option | Saves (base module) | Effort | Risk |
| --- | --- | --- | --- |
| **A. Play Asset Delivery: an install-time asset pack** holding the web files (`assets/public/...`) | all of it: the base drops to about 3 MB; the pack is about 315 MB | about a day: a Gradle `com.android.asset-pack` module (`assetPack { packName = "web"; dynamicDelivery { deliveryType = "install-time" } }`), `assetPacks = [":web"]` in the app, a build step that moves the synced files into it | Low to medium. Install-time packs arrive with the app and are read through the same `AssetManager` Capacitor's local server uses, so the page should not notice; this must be proved with `bundletool build-apks --local-testing` and an internal-testing install. A plain `assembleRelease` APK would then lack the files: build the GitHub release's APK from the AAB instead (`bundletool build-apks --mode=universal`). |
| B. Re-encode the pictures | measured on samples: the 40 largest PNGs (79 MB) are 23 MB as WebP quality 90 (−71%); pixel-art sheets lose 22–26% as lossless WebP | 1–2 days, and the owner's eye on the paintings | Medium: lossy WebP must not touch the pixel-art sprites (hard edges and exact palettes); an art-by-art list is needed. Likely lands near 200 MB, not safely under. |
| C. Move the data URLs out of `game.js` into files | nothing in download size (deflate already undoes base64's third) | half a day: esbuild's `file` loader, and the build lists the emitted files in the service worker's `FILES` from its metafile | Low. Its real gain is **memory and start-up**: a 208 MB script is parsed and held by the WebView's renderer, on top of every decoded picture. That is the most likely cause of crashes on 3–4 GB phones, which Play's vitals count against the listing. |
| D. Audio | 5 MB in all | — | Not worth doing for size. |
| E. Drop unused assets | unknown | a script that lists every file under `src/art` no import or URL reaches | Low; worth a look once, small gains likely. |

**Recommendation: A, then C, then B.** A is the only one that gets under the limit by a wide margin on its own, and it changes nothing
in the game. C should follow at once for stability on low-memory phones (not for size). B is worth doing later to cut the 318 MB download
for players on mobile data, picture by picture with the owner.

**A separate size job should do:** (1) the asset-pack module and the build step, proved with bundletool local testing; (2) the workflow's
Play path: `npm run web:play`, `cap sync`, `bundleRelease`, the AAB as the job's output (and the GitHub APK as the AAB's universal APK, so
both are signed by the same key and carry the same files); (3) the data URLs to files (C). Re-encoding (B) is its own art job.

## 2. The Android project

| Item | Result |
| --- | --- |
| targetSdkVersion | **pass (fixed)**: 36. Play: "Starting August 31 2026: new apps and app updates must target Android 16 (API level 36) or higher" (developer.android.com, Target API level requirements); 35 would be refused. compileSdk 36 too; the AAB and APK build. AGP 8.7.2 warns it was tested up to 35: upgrading Capacitor to 8 (AGP 8.13, SDK 36) would clear it and is worth a job of its own. |
| What API 36 changes for us | Predictive back: the phone-back handler uses `OnBackPressedDispatcher`, which keeps working. Edge-to-edge was already enforced at 35; the page pads with `safe-area-inset`. Large screens (600 dp and up) ignore the orientation lock, except for games: **fixed** with `android:appCategory="game"`. To check on the phone: Back on each screen, and the bars and notch. |
| minSdk | **pass**: 23 (Android 6), Capacitor 7's floor. The bundle is ES2022 and needs a WebView from about Chrome 94; Android 7+ updates its WebView from Play, so in practice only never-updated phones fall short. |
| App id | **pass**: `com.hpatter9.lastkeep`. It is permanent on Play once uploaded. |
| versionCode | **pass**: `major*1000000 + minor*1000 + patch` (0.590.0 → 590000), always rising, far below Play's 2,100,000,000 cap. Each upload needs a new one; a daily build fits. |
| Release signing | **pass**: the workflow's latest build (run 232, 0.579.0) logged "Signing with the release key": the four secrets are set. It still falls back to the debug key silently when they are missing; a Play job should fail instead. |
| Play App Signing | **owner action**: new apps must use it. When enrolling, **choose to upload the existing release key** (Play Console offers a tool for exporting it) rather than letting Google make a new one: then the Play build and the GitHub APK carry the same signature, and the owner's installed app can be updated from Play without uninstalling (which would lose the save). Keep the keystore backed up. |
| Permissions | **pass**: `INTERNET`, and since IAP `com.android.vending.BILLING` (Play Billing, brought in by the RevenueCat plugin; `docs/notes/iap.md`). The Play build talks only to Google Play and RevenueCat, for the Shop. |
| Cleartext traffic | **pass**: not allowed (the default at target 28+; `allowMixedContent: false`). |
| Backups | **pass (fixed)**: `allowBackup` was false, so a new phone or a reinstall lost the save. Now on, limited to the page's own storage (`app_webview/.../Local Storage/` and `IndexedDB/`) by `res/xml/data_extraction_rules.xml` (Android 12+) and `backup_rules.xml` (older). **To check on the phone**: `adb shell bmgr backupnow com.hpatter9.lastkeep`, uninstall, reinstall, and see the save come back. |
| Exported components | **pass**: the launcher activity (must be), the FileProvider (not exported), androidx's profile installer receiver (guarded by the DUMP permission). |
| Adaptive icon | **owner action (minor)**: the launcher icon is a plain PNG per density with no `mipmap-anydpi-v26` adaptive icon, so Android 8+ launchers sit it on a white plate. Needs a foreground layer of the icon art and a background colour. |
| Splash | **pass**: black with the icon (`Theme.SplashScreen`). |
| Orientation | **pass**: portrait in the manifest, now kept on large screens too (above); the page also asks a sideways phone to turn upright (`#turnUp`). |
| Immersive | **pass**: bars hidden, shown for a moment by a swipe (`MainActivity.hideBars`). |
| Back button | **pass**: goes to the page (`window.__phoneBack`, `docs/notes/phone-back.md`) and never closes the game. |
| Low-memory phones | **owner action**: `largeHeap` only helps Java, not the WebView. With a 208 MB script (above, option C), phones under about 4 GB of memory are at risk. Until C lands, exclude devices under 4 GB in Play Console, Device catalogue, and watch Android vitals during the closed test. |

## 3. Policies

| Item | Result |
| --- | --- |
| Free currency in the Developer page | **pass (fixed on `claude/store-dev-page`)**: a store's build has no Developer page (`docs/notes/store-dev-page.md`); the web and the GitHub app keep it for testing. |
| Self-updating | **pass (fixed)**: `src/appUpdate.ts` fetched `api.github.com/.../releases/latest` once at start (app only) and, when a newer tag existed, Settings, About showed "Update available" with a link to the GitHub release page (it never downloaded or installed anything itself). Play's Device and Network Abuse policy forbids an app updating itself, or getting updates, outside Play, and a link to an APK page is close enough to be rejected. Now `node build.mjs --store play` (`npm run web:play`) defines `__STORE__ = 'play'` and `checkAppUpdate` asks only when `updateCheckOn(store, inApp())`: the GitHub release's app, as before. Tested in `test/app-update.test.ts`. |
| Privacy policy | **owner action**: a URL is required for every app. Draft: `docs/store/privacy-policy.html` (fill in the date and a contact address, then host it on Pages: build.mjs would copy it to `out/web`). |
| What the game collects | **Changed by IAP** (section 7): the Play build sends purchase data and a random app user ID to RevenueCat. Otherwise nothing: saves and the Diagnostics list stay on the device; no analytics, ads or accounts; the fonts are bundled. |
| Data safety form | **owner action**: the answers changed with IAP; see section 7. |
| Ads | **No ads.** Declare "No" under App content, Ads. |
| In-app purchases | **Yes, since IAP** (section 7): stones, crowns, a starter pack, bundles and cosmetics, through Google Play Billing (RevenueCat). Only the Play build sells; free earn rates are unchanged. |
| The summon (draws) | **pass, with IAP**: stones and crowns can now be bought, so a stone's summon and the chest shop's chests are paid random items under Play's rule. The odds are published before purchase: the Odds button in the Summoning Sanctum lists every outcome's exact chance, worked out from the draw's own rules (`docs/notes/iap.md`). Everything sold for money directly has fixed contents. |
| Content rating (IARC questionnaire) | **owner action**. Category: Game. Violence: yes, fantasy combat between pixel-art figures, not realistic, against humans and monsters; small stylised blood puffs in some hit effects. Fear: dark fantasy (undead, demons), no horror. Sexuality: no. Language: mild ("hell" twice in quest text). Controlled substances: references to alcohol (a tavern, ale, wine, a drunk), none used for gain. Gambling: no real-money gambling, no simulated casino games. Users interact: no. Shares location: no. Digital purchases: **yes** (in-app purchases); **random items purchasable: yes** (stones and crowns buy random summons and chests; odds shown). Expect about PEGI 7–12, ESRB Everyone 10+ to Teen. |
| Target audience | **owner action**: choose **13 and over** (13–15, 16–17, 18+). Choosing under 13 brings the Families policy and its extra reviews; nothing in the game is made for children. |
| Other names in the listing | Do not name other games ("King God Castle style", "FF Tactics") in the store text: Play's metadata policy treats it as impersonation or keyword spam. The drafts below do not. |

## 4. Credits and licences

| Source | Licence | Store distribution | Result |
| --- | --- | --- | --- |
| Craftpix free packs (most sprites, backdrops, tiles) | Craftpix free licence: use in commercial games allowed, raw files may not be redistributed | allowed; files are cut and bundled, not offered as a pack | **pass** |
| 5000 Pixel Effects (blueberry) | games, commercial included; credit appreciated | allowed | **pass** |
| DawnLike (DragonDePlatino): items, relic and equipment icons | CC-BY 4.0 | allowed **with attribution** | **fail until the in-app credits exist** |
| Music by Matthew Pablo (CC-BY 3.0) and Alexandr Zhelanov (CC-BY 4.0) | CC-BY | allowed **with attribution** | **fail until the in-app credits exist** |
| Music by nene, cynicmusic, Cleyton Kauffman, others | CC0 | allowed | **pass** |
| Universal LPC Spritesheet (Gwen behind the bar, `src/art/quests/gwen.png`, still bundled) | CC-BY-SA 3.0 / GPL 3.0 (dual) | allowed under CC-BY-SA: credit the LPC authors, and that one derived sprite stays CC-BY-SA | **owner action**: credit it in the app, or replace the placeholder (it was meant to be) |
| Fonts (Pixelify Sans, Press Start 2P, Cinzel Decorative, Alegreya Sans) | SIL OFL 1.1 | bundling allowed | **pass** (the licence text should travel with them: one line and a link in the credits) |
| Golems and elementals (batareya): golems and the treant | no licence file in the pack | unknown | **fail / owner action**: find the author's terms or replace |
| whtdragon's RPG Maker MV animals: Duchess and the wolves | no licence file | unknown; RPG Maker resources are often limited to games made with RPG Maker | **fail / owner action**: check the terms or replace |
| Eight recorded combat sounds (PR #150, "given as CC0") | source not recorded | unknown | **pass** (LICENCE-REPLACE): removed; the game's own synthesised cues play in their place, as loud |
| Pixel Champions v3 (no licence file) | — | — | **pass**: no longer in the game (no `pc_*` sheet is in `src/art/units`) |
| Art made with image models (OpenAI, Gemini, Dreamina, PixelLab) | the services' terms | generally allowed for the account holder; PixelLab and Dreamina tie commercial rights to the plan | **owner action**: confirm the plans used allow commercial use |

**In-app credits screen:** there is none (Settings, About has one summary sentence). A small job should add a Credits page (the
standard ornate menu) listing at least every CC-BY / CC-BY-SA author with the work, licence and a link, and the fonts' OFL.

## 5. Store listing

Proposed pictures, taken from the built game by `node tools/store-ready/shots.mjs` (in `docs/store/`):

- `icon-512.png`: 512 x 512, 32-bit PNG (the game's icon). **pass**
- `feature-graphic.png`: 1024 x 500, the war camp's painting with the title. A stand-in: a painted one would be better.
- `phone-1-battle.png` to `phone-7-fight.png`: 1080 x 1920 (9:16; Play takes 320–3840 px with sides at most 2:1, and wants 1080 px or
  more on a game's screenshots to show them large). The camp, the tavern, the summoning sanctum, the keep, the War Room, a deploy and a
  boss fight. Taken in a desktop browser at 360 x 640; the fight is small at that size, so a fight shot from the phone itself would be
  stronger. The version line shows top right; crop or hide it if wanted.

**Title (30):** Legends of the Last Keep

**Short description (80):** Place five heroes on a hilly battlefield, then watch them fight a dark war.

**Full description (draft):**

> Five heroes. One keep. A war that never ends.
>
> Legends of the Last Keep is a tactical auto-battler set in a dark fantasy world. Place five heroes on a battlefield of hills,
> rivers and ruins, where high ground hits harder and a blow from behind hits hardest, then watch them fight on their own in real time.
>
> - Collect dozens of heroes, each with their own skills, talents, gear and an ultimate to unlock.
> - March on armies across seventeen lands, from frozen snowfields to burning ashlands, each with its own ground and hazards.
> - Call on six Eidolons, ancient spirits of fire, ice, stone, storm, light and shadow.
> - Face foes who remember you: a nemesis who beat you once will return with a grudge and a new name.
> - Hold the Last Stand against endless waves, take on the daily battle, and build up your keep.
> - Plays fully offline. No ads. Optional purchases; everything can be earned by playing.

**Contains in-app purchases:** yes (Play adds the label once in-app products are set up; declare it in the listing).

**Category:** Game, Strategy. **Tags:** Strategy, Auto battler, Tactics, Fantasy, Pixel art, Offline, Single player.
Contact email and website: the owner's.

## 6. Stability

**No Android emulator could run here** (the machine has no `/dev/kvm`, which the emulator needs), so nothing was run on Android. The
APK and AAB were built and their manifests read; the rest was checked in Chromium at 393 x 852 as a stand-in, which shares the page but
not the WebView, Capacitor or the system:

| Check | Result |
| --- | --- |
| Cold start, fresh install | the starter pick shows; no page errors (Chromium) |
| Fresh-install save | picking a pack writes `legends.meta`; a second start keeps it (Chromium) |
| Killing mid-fight | the page closed during a wave; on reopening, the camp shows "Continue wave 1/15" and no errors (Chromium) |
| Backgrounding and resume | the page hidden and shown again; no errors (Chromium) |
| Offline start | starts from the service worker's cache (Chromium; the app skips the worker and reads its bundled files) |
| Rotate | portrait in the manifest and on large screens (the build); not run on a device |
| Crash logs | none to read without a device |

**On the phone, before submitting:** install the closed-test build from Play and run that list for real (cold start on a phone that
has never had the game, airplane mode, rotate, home and back, swipe it away mid-fight, Back on each screen, a backup and restore). Then
watch Android vitals (crashes, ANRs, and "renderer gone" crashes on low-memory phones) through the 14-day test.

## The Google Play account (owner)

- A developer account (one-time fee), with identity checks.
- **New personal accounts must run a closed test with at least 12 testers opted in for 14 days in a row before they can apply for
  production.** Start this early: it can run on today's build while the size and credits work is done.
- Fill in App content (privacy policy, ads, Data safety, content rating, target audience) and the store listing as above.
- Google is also bringing in developer verification for apps installed outside Play on certified Android phones (from 2026 in some
  countries, more widely later): the GitHub APK's package name and key will need registering then too.

## An Apple App Store release would additionally need

- **Capacitor iOS**: `npx cap add ios`, an `ios/` project beside `android/`. Portrait lock, the status bar and the full-screen view are
  set again there; the phone-back handling does not apply.
- **A Mac with Xcode** (the version Apple currently requires for uploads); iOS apps can only be built and signed there (or on a hosted
  Mac in CI, which costs minutes).
- **An Apple Developer Program membership** (yearly fee), certificates and a provisioning profile, an App Store Connect listing, and
  TestFlight for testing.
- **Review rules for web-wrapped games**: guideline 4.2 (minimum functionality) turns away apps that are just a website; a full offline
  game with its files bundled is acceptable. Guideline 2.5.2 forbids downloading code that changes the app, so the iOS build must also
  skip the update check (the same flag, e.g. `--store appstore`). The privacy "nutrition label" would be "Data Not Collected". Odds rules
  for random rewards again apply only to paid ones.
- **Memory is the real risk on iPhone**: WKWebView's content process is killed sooner than Android's when memory runs short, so the
  208 MB script (option C) matters even more there.
- Size: iOS apps may be up to 4 GB, so the asset pack work is not needed for Apple, but the download-size prompts for mobile data are.

**Advice:** release on Play first (the owner plays on Android, and the account and its 14-day test are the long pole); look at Apple
once the Play build is stable and option C has landed.

## What ran

- `npm run typecheck`; `npm test -- app-update store-ready` (7 pass); `npm run web`, and `node build.mjs --store play` (the built
  `game.js` carries `"play"` and the update check returns at once).
- With the Android SDK fetched into scratch: `cap sync android`, `./gradlew bundleRelease assembleRelease` at target 35, then at 36
  (both build). Sizes from the AAB's own entries; the merged manifest read with `aapt2`.
- `node tools/store-ready/shots.mjs` and the Chromium stand-in checks above.
- Not run: anything on an Android device or emulator; `bundletool` (not run here).

## 7. In-app purchases (IAP, `docs/notes/iap.md`)

The Play build sells summoning stones, crowns, a one-time starter pack, bundles and (once their art lands) cosmetics, through Google Play
Billing with RevenueCat. The web page and the GitHub release's app have no Shop.

### Data safety (Play Console, App content, Data safety): the new answers

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (Google Play and RevenueCat use HTTPS) |
| Do you provide a way for users to request that their data is deleted? | **Yes**: by email to the contact address (we ask RevenueCat to delete the app user ID's records) |
| **Financial info: Purchase history** | **Collected**, not shared (RevenueCat is a service provider processing it for us, which Play does not count as sharing). Processed ephemerally: no. Required: yes, for purchases. Purpose: **App functionality** (delivering and restoring purchases) and **Analytics** (sales totals in RevenueCat's dashboard). |
| **App info and performance / Device or other IDs** | **Device or other IDs: collected**: RevenueCat's random app user ID for the install. Not shared. Purpose: App functionality. |
| Payment info (card numbers) | **Not collected by the app**: Google Play handles payment. |
| Personal info (name, email), location, contacts, photos, messages, health, web history | Not collected. |
| App activity, crash logs, diagnostics | Not collected (the Diagnostics list stays on the device). |

Confirm against RevenueCat's own Data safety guidance for the SDK version shipped (`@revenuecat/purchases-capacitor` 11.3.3, purchases-hybrid-common 17.55),
as it may list further device data its SDK sends.

### Privacy policy

`docs/store/privacy-policy.html` now says what RevenueCat and Google receive for a purchase, why, and how to ask for deletion; the
network section says the Play build talks to Google Play and RevenueCat for the Shop. Fill in the date and contact, then host it.

### Content rating (IARC)

Answer **yes** to "Does the app allow users to purchase digital goods?" and **yes** to "random items purchasable" (loot-box style:
stones and crowns, which can be bought, pay for random summons and the chest shop's random chests). Expect the rating's descriptors to add
"In-Game Purchases (Includes Random Items)" (ESRB) / "In-game purchases (includes random items)" (PEGI).

### The listing

Declare "Contains in-app purchases" (Play shows the label on the listing). The full description's last line now reads "Optional purchases;
everything can be earned by playing."

### Countries that restrict paid random items

Belgium's gaming authority treats paid loot boxes as gambling (2018), so paid random summons there risk enforcement: **the owner's call is
to exclude Belgium** in Play Console's country targeting (Production, Countries / regions). **The Netherlands is worth checking**: its courts
overturned the 2019 loot-box finding in 2022, but the government has said it wants a ban; review before launch. Others to watch (none bans
them outright today): China and South Korea require published odds (the Odds sheet does), Japan forbids "complete gacha" (we have none),
Australia now rates games with paid random items M or higher (from September 2024), and the UK and the EU have guidance but no ban.

### The owner's action list (Play Console and RevenueCat)

1. **Play Console, Monetise, Products, In-app products**: create each product with the exact ID, name, description and price in
   `docs/notes/iap.md`: `stones_pouch`, `stones_satchel`, `stones_coffer`, `stones_hoard`, `crowns_purse`, `crowns_chest`, `crowns_vault`,
   `starter_pack`, `bundle_recruit`, `bundle_warlord`, and the cosmetics on sale (COSMETICS, `docs/notes/cosmetics.md`),
   each a one-time (non-consumable) product: `look_starfall` $3.99, `look_duchess_regalia` $1.99, `look_duchess_knight` $1.99,
   `look_duchess_lantern` $1.99 and `bundle_wardrobe` $3.99. **Not yet:** `ruler_ember` and `ruler_starlit` ($6.99 each) wait for their
   Crown Terrace and throne art (`docs/notes/cosmetics-art-prompts.md`); make them when they are on sale. An app needs the BILLING permission in an uploaded build before products can be made: upload a Play AAB to internal testing first. Activate each product.
2. **Play Console, Setup, API access**: link a Google Cloud project and make a **service account** with the Play Console permissions
   RevenueCat lists (View app information, View financial data, Manage orders and subscriptions); download its JSON key.
3. **RevenueCat**: make a project and an Android app with package `com.hpatter9.lastkeep`; upload the service account JSON; turn on
   Google's Real-time developer notifications (RevenueCat gives the Pub/Sub topic). Import the products. Mark the stones, crowns and bundles
   **consumable** and the starter pack and cosmetics **non-consumable**.
4. **RevenueCat entitlements**: make `starter`, `duchess_regalia`, `duchess_knight`, `duchess_lantern`, `ruler_ember`, `ruler_starlit` and
   `starfall_summons`; attach `starter_pack` to `starter`, each cosmetic product to its own, and `bundle_wardrobe` to all three Duchess
   entitlements. (No offering is needed: the game asks for products by ID.)
5. **The API key**: copy RevenueCat's **public Android SDK key** (it starts `goog_`) into a GitHub repository secret named
   `REVENUECAT_ANDROID_KEY` (Settings, Secrets and variables, Actions). The workflow's Play bundle step passes it to the build. Never commit it.
6. **Licence testers**: Play Console, Setup, License testing: add the testers' Google accounts (and the owner's), with "RESPOND_NORMALLY",
   so their purchases are free test purchases. Testers install from the internal or closed testing track (not a sideloaded APK) for
   Billing to work. In RevenueCat these show as sandbox purchases.
7. **Country targeting**: exclude Belgium; review the Netherlands (above).
8. **Forms**: Data safety, content rating and the listing's "Contains in-app purchases", as above; the privacy policy hosted with its new text.
9. **Before release, on a phone from the test track**: buy one of each kind with a licence tester; force-close the app during a purchase
   and reopen (it should arrive with "A purchase from before has arrived"); "Start over" and Restore (cosmetics back, consumables not); a
   second phone on the same Google account and Restore; airplane mode (the Shop says it needs a connection, the game plays).

