# Getting Legends of the Last Keep into Google Play and the App Store

**Not legal, tax or financial advice.** This is a practical plan from what is known today (October 2026). Fees, store rules and tax rules change, so every
number below should be re-checked on the store's own page when you act. The places a lawyer or an accountant should look are marked **[LAWYER]** and **[ACCOUNTANT]**.
It assumes you are an individual in the US (say if not; the tax and VAT notes change). The companion file `licences.md` lists the asset risks.

## 1. The short version

1. Fix the three legal blockers first (Duchess's goat, the golems, the credits screen). Cost: a few hours and a few PixelLab credits.
2. Clear the name "Legends of the Last Keep" (the old name, "Legends of the Fall", was a famous 1994 film; the rename removes that problem). A first web search found no identical title, but the app stores could not be searched from here and nothing official was checked: see 5.5.
3. Wrap the web app with **Capacitor** for both stores (one codebase, one purchase plugin). A Trusted Web Activity is the cheaper path on Android only.
4. Sell it as **free to download, one purchase to unlock the full game, plus optional cosmetic/supporter packs**. No pay-to-win, no random paid pulls, no forced ads.
5. Put a privacy policy online, fill the data-safety and privacy forms ("no data collected"), do the age-rating questionnaires, upload, test with 12 people, release.

## 2. Wrapping the PWA

The build is already a self-contained static folder (`out/web`: `index.html`, `game.js`, art, fonts and music; no server, no network calls; saves in `localStorage`).
That is the ideal case for a wrapper.

### Google Play

| | Trusted Web Activity (Bubblewrap) | Capacitor |
|---|---|---|
| What it is | Chrome opens your hosted PWA full-screen, with no address bar | Your files are bundled inside an Android app and shown in a WebView |
| Runs offline | Yes, through the service worker (the game already caches everything) | Yes, files are in the app (no service worker needed) |
| Needs a host | Yes: the GitHub Pages site must stay up, with `assetlinks.json` proving you own it | No |
| Purchases | Play Billing through the browser's Digital Goods API (Chrome only, limited and fiddly) | A plugin (RevenueCat, or `cordova-plugin-purchase`) using the normal Play Billing library |
| Save safety | Chrome site data; the user clearing Chrome data wipes it | App storage; same issue, so export/cloud saves matter (section 6) |
| Verdict | Fastest to a first Play listing; weaker for payments | **Recommended**: same project can also build the iOS app |

Bubblewrap is the command-line tool that makes the TWA Android project from `manifest.webmanifest`; it needs Node, a JDK and the Android SDK.
**Both** routes ship an Android App Bundle (`.aab`) signed with a key you must back up (Play App Signing keeps Google's copy).

### Apple

- Capacitor is the practical way: `npx cap add ios`, copy `out/web` into it, open in Xcode.
- **You need Apple's tools to build and submit**: a Mac (a used Mac mini is enough), **or** a cloud Mac build service (GitHub Actions macOS runners, Codemagic, Ionic Appflow, Bitrise). A cloud route avoids buying a Mac, but you still need an Apple Developer account and a test device (or TestFlight on your own iPhone).
- **Apple's rule on web wrappers (Guideline 4.2, Minimum Functionality).** Apps that are just a website in a frame get rejected. Ours is not a website: it is a full game that works offline with its own content, so it should pass. Still, make the app feel native: portrait lock, haptics on hits (Capacitor Haptics), the splash/loading screen, proper safe-areas, working in airplane mode, no browser chrome, no "install this PWA" prompt. Describe the offline play and local content in the review notes. Expect one rejection round as normal.
- Do **not** load the game from a live web URL inside the app; bundle the files. (Bundling also keeps it working on planes.)
- Bundled-in-app changes need a new store release; the PWA can still auto-update on the web.
- The service worker should only register on `https:` (as `main.ts` already does) and is not needed inside Capacitor.

### Cost of each path (rough)
Capacitor project setup: a day or two for the first build, plus a week of polish. Bubblewrap: an afternoon. Recommendation: Capacitor, with the PWA kept alive on GitHub Pages as the free web version (also useful for the landing page and for testers).

## 3. Accounts, costs and business set-up

| Item | Cost (verify) | Notes |
|---|---|---|
| Google Play Console | **US$25, once** | Personal accounts created after Nov 2023 must run a **closed test with at least 12 testers for 14 days in a row** before they can apply for production. Plan for it (friends, family, a Discord). Organisation accounts skip that but need a D-U-N-S number |
| Apple Developer Program | **US$99 per year** | Individual or organisation. An individual account lists **your legal name** as the seller; an organisation lists the company name but needs a D-U-N-S number (free, a few weeks) |
| Apple Small Business Program | Free to join | Cuts Apple's commission to **15%** while proceeds are under US$1m a year. Apply the first year; it is automatic only for brand-new developers, so confirm |
| Google service fee | 15% on the first US$1m a year, then 30% | Check current schedule |
| Domain, privacy-policy page, support email | ~US$15 a year, GitHub Pages hosts the page free | A real support email address is required by both stores |
| RevenueCat (purchase plugin service) | Free up to a monthly-revenue threshold, then a percentage | Optional but saves much work; alternatively the open-source `cordova-plugin-purchase` |
| Mac / cloud build | Free-tier CI minutes, or a used Mac mini | Only if you go with iOS |

**Business set-up [ACCOUNTANT / LAWYER].** You can start as a **sole proprietor** (no company, income on your personal tax return, your name and home address may appear on the store listing; Apple and Google make you show a contact address for paid apps in some regions, use a PO box or a virtual address). An **LLC** costs a state fee, separates personal and business liability (matters if someone sues over the name or an asset), gets a business bank account, and lets the store show a company name. Ask an accountant: when to form one, estimated quarterly tax, W-9/W-8 forms for Google and Apple payouts, and the home-office/asset deductions. **Apple and Google act as the seller of record and collect and remit sales tax/VAT in most countries**, which removes a big job; you still owe income tax on the payouts. Also ask whether you must report anything under any gambling-style rules (see loot boxes, section 5).

## 4. Making money: the options

All stores require their own billing for digital goods inside the app (Google Play Billing; Apple In-App Purchase). You may not route players to a web checkout from inside the app except where recent rulings or regional laws allow it (the US and EU rules have changed in 2025; **check the current guideline wording**). The commission is 15% under the small-business programs, 30% above.

| Model | Pros | Cons | Fit for this game |
|---|---|---|---|
| **A. Premium price** (pay to download, e.g. $4.99-$7.99) | Simplest; no billing code beyond the store's; no ads, no friction; fits "plays on planes" | Many people never try paid mobile games; almost no discovery; needs reviews to launch; each refund is a lost sale | Good only if you can market it |
| **B. Free + one-time "Full game" unlock** (first ~act free) | A free try lowers the barrier; one clear price; no pay-to-win (the *game* is unlocked, not power); easy to explain to the stores | Needs a proper demo cut-off and a "restore purchase" button; you decide what's free | **Best base** |
| **C. Cosmetic in-app purchases** (hero skins, board themes, castle looks, avatar frames) | No power sold, so no fairness problem; can come later; players who love the art pay | Needs new art for every item (the game has no skin system yet); low conversion without a big audience | Good second layer |
| **D. Supporter pack** ("buy the dev a coffee", one or three tiers, perhaps a name in the credits, a cosmetic goat hat for Duchess) | Cheap to build; goodwill; no balance impact | Small revenue; the stores require it to give *something* in-app | Good complement to B |
| **E. Rewarded ads only** (watch an ad for a bonus) | Free for the player; revenue scales with players | Needs an ad SDK (network, tracking, consent screens, bigger privacy forms); breaks the offline/plane promise; ad revenue is tiny unless tens of thousands play daily; ad quality can hurt the brand; stricter rules for anything child-attractive | Not recommended |
| F. Selling random hero pulls / chests for money (the usual gacha) | Highest revenue in the genre | **Do not.** It is pay-to-win in effect; stores demand odds disclosure (Apple 3.1.1 and Google's policy); some countries restrict or ban paid loot boxes (Belgium, the Netherlands, others); Apple/Google teams scrutinise them; bad press | Avoid |

**Where the game stands today.** Heroes come from earned shards, milestones and a starter pick (`docs/notes/hero-shards.md`, `no-rarity.md`), with every hero as strong as another, so nothing in the economy forces a purchase. Keep it that way. Shards and "summoning" that come only from play are fine; just never sell them.

### Recommendation

1. **Launch: Free download, one "Full game" unlock (around $4.99-$6.99)**, with the cut-off after the first land or the first N tower floors/armies (decide with playtests). Buying never changes how strong a hero is; it opens modes, lands and the daily.
2. **Add a Supporter pack ($2.99 / $9.99)** that gives a credits mention and a purely cosmetic perk.
3. **Later: cosmetic packs** once there is an audience (skins, themes, Duchess's wardrobe).
4. **No ads, no random paid pulls, no timers or energy walls.** If you want ads one day, make them a clearly optional extra with a plain "no ads" unlock.

Reasoning: a solo-made offline game gets its money from a fair price and goodwill, not from a funnel. It keeps the privacy forms trivial, keeps the review risk low, and respects "no pay-to-win".
Refunds: both stores refund easily; add "Restore purchases" and keep the purchase check offline (cached entitlement) so the game still works in airplane mode.

## 5. Legal checklist

### 5.1 Assets and credits **[LAWYER]**
Do the fixes in `licences.md`: replace or clear Duchess (R1), clear the golems and treant (R2), redraw the Craftpix-derived icon (R3), ship the credits (R4). Keep dated copies of each licence page. A lawyer should read `licences.md` once, especially rows 13-15 (AI-made art, which the stores ask you to disclose).

### 5.2 Privacy policy and the data forms
- Both stores require a **privacy policy URL**, even for an app that collects nothing. Host a one-page file on GitHub Pages or your domain.
- Today the game makes **no network calls** and stores saves, settings and tips in `localStorage` only (no accounts, no analytics, no ads). The policy can say exactly that, and say that purchases are handled by Apple/Google (and RevenueCat if used).
- Google **Data safety form**: "no data collected, no data shared" is honest *while that is true*. Re-answer it if you add cloud save, a crash reporter, analytics or ads.
- Apple **App Privacy ("nutrition labels")**: "Data Not Collected". Same rule.
- If you ever add an ad SDK or analytics, the forms, the policy, an EU consent screen (UMP/ATT on iOS) and possibly children's-privacy law (COPPA, GDPR-K) all get bigger. That is one more reason to skip ads.
- Include a contact email, a "delete your data" line (clear the save in Settings; there is no server copy), and an effective date.

### 5.3 Age ratings
- Google Play uses the **IARC questionnaire** (one set of answers gives ESRB/PEGI/USK etc.). Apple has its own age-rating questionnaire (updated in 2025 with new age bands).
- Answer truthfully: stylised fantasy violence (sword and magic fights, skeletons, a "blood" strip effect), no gambling, no real-money random items (if you follow section 4), no user-generated content, no chat. Expect roughly **ESRB E10+ / PEGI 7-12 / Apple 9+**. Do not claim "Made for Kids" unless you accept the extra rules.
- The game has a "gacha"/summon screen. If it spends only earned currency it is not gambling, but say so in the answers.

### 5.4 Terms
- Apple's standard EULA applies unless you add your own; a one-screen **Terms of Use** on the website (no warranty, licence to play, purchases via store, no cheating-related claims) is good practice. **[LAWYER]** for the wording, including limits of liability and the governing law.
- Keep a dated copy of the policy and terms; link both from the store listing and from Settings.

### 5.5 The name, trademarks and listing text **[LAWYER]**
- **History.** The game was called "Legends of the Fall", the title of Jim Harrison's 1979 novella and the 1994 TriStar film; that was the main trademark worry and the rename to **Legends of the Last Keep** (0.134.0) answers it. "Fall" is gone, but "Legends of ..." is a very common game-title opening, so the new name's strength rests on "Last Keep".
- **What a first search found (web search only, 23 Oct 2026; not a clearance).** No game or mark called exactly "Legends of the Last Keep". Near names exist: **Last Keep** (an itch.io tower-defence game by papayaah, "guard the last keep from undead waves", the closest in theme), **The Lost Keep** (Nordlys Studios, itch.io, 2022), **Legend of Keepers** (Goblinz, Steam/Switch, 2021), **Keep the Keep** (Steam), **The Last Keeper** (Steam demo), **Ages of Mages: The Last Keeper**. A search of the UK trademark journals turned up no "Last Keep" mark. **Not checked, because the tools could not reach them:** the Google Play and App Store listings themselves, the USPTO and EUIPO databases (use TSDR/Trademark Search, EUIPO eSearch plus, WIPO Global Brand Database), Steam's full catalogue.
- **To do before art or marketing is built around the name:** search the app stores yourself (Google Play, App Store, on a phone, for "Legends of the Last Keep", "Last Keep", "Last Keeper", "Keep Legends"), run the three trademark databases for "LAST KEEP" and "LEGENDS OF THE LAST KEEP" in classes 9 (downloadable games), 41 (online games) and 28, and check domains and social handles. A trademark lawyer's one-hour consult with the search results is enough; they can also say whether to register your own mark (US, about $350 per class filing fee; check).
- **Risk read.** "Last Keep" is a descriptive-ish phrase for a castle game, so a clash is likely to be with a small indie title, not a big rights holder. The nearest, itch.io's "Last Keep", is a different genre and not on the stores, so it is a low conflict, but a lawyer should say so. Keep the full title "Legends of the Last Keep" in the listing; do not shorten the store name to "Last Keep".
- **Fall-back names** if the search finds a problem: keep a distinctive suffix ("Legends of the Last Keep: <word>") or pick a wholly new title. A package/bundle id (`com.<you>.<name>`) is set once and cannot change after release, so choose it after clearance.

### 5.5a Renaming the repo and the web address without losing saves
Saves live in `localStorage` (keys `legends.meta`, `legends.run`, `legends.tower`, `legends.calamity`, `legends.tips`, ... see `SAVE_KEYS` in `src/settings.ts`), and browsers tie that storage to the **origin** (scheme + host + port), not the page. The repo is `hpatter9/legends-of-the-fall` and GitHub Pages serves it at `hpatter9.github.io/legends-of-the-fall/`, so:
- Renaming the repo changes the path only. `hpatter9.github.io` stays the same origin, so **saves survive** a rename (GitHub keeps a redirect for the repo, not for the Pages path; the new Pages path will be new). But a new *path* under the same origin is **still the same origin**, so storage is shared, which is good and also means two paths share one save.
- Moving to a **new host** (a custom domain such as `lastkeep.example`, or another user/org's `github.io`) is a **new origin: players start empty.** If you will ever do this, do it once, early, before the stores.
- **Recommendation.** Do not rename the repo or move the web address for the sake of the name. The store apps do not show the URL, and the repo name is invisible to players. If you want a custom domain for the privacy-policy page and marketing (you will), put it on a *different* address and leave the game's address alone, or move once with the migration below.
- **If you do move the origin, do both of these:**
  1. Ship the **Export/Import save** (section 6) *before* moving, so anyone can carry a save across by hand.
  2. Leave a one-time **migration page** at the old address: on load it reads every `SAVE_KEYS` key, then sends the JSON to the new address (open `https://new-origin/?import=<code>` with a compressed base64 code, or use `window.open` + `postMessage` to a page on the new origin, which checks the sender's origin and writes the keys). Keep the old page up for months. The new page should offer "import" if it finds a code and its own save is empty (never overwrite a non-empty save without asking).
- The **store apps** (Capacitor) have their own storage, separate from the web version; the web and app saves will not match unless you add cloud save or an import. Say so in the listing and the Credits/Settings text.
- **Do not mention other games by name** in the title, subtitle, description, keywords or screenshots. In-store text like "a King God Castle style auto-battler" is trademark use that both stores reject (Google's metadata policy, Apple 2.3.7). Describe the game instead: "a tactical auto-battler: place five heroes on a hill-and-pit grid and watch them fight; collect, upgrade and awaken heroes." Same for tags and the privacy page.
- Check that character names (Duchess, class names, hero names) and the "Chronos" crossover mentions do not collide with someone else's marks.

### 5.6 Other store policy points
- AI-generated content disclosure (Google Play and Apple ask); see `licences.md` R6.
- Loot boxes: if you ever sell random items, disclose odds; do not sell them.
- Subscriptions: none, so no subscription rules.
- Target API level (Google) and Xcode/iOS SDK minimums (Apple) rise every year; build with current tools.
- Export compliance (Apple): the app uses only standard HTTPS/OS encryption, answer "uses only exempt encryption".

## 6. What the game itself needs before release

| Item | Why | Notes |
|---|---|---|
| **Save export/import and cloud save** | `localStorage` in a WebView can be cleared by the OS, a reinstall or "clear data"; a long idle game is exactly what players hate to lose | At minimum: Export save (copy a text code or share a file) and Import. Better: Google Play Games saved games and iCloud key-value storage through a Capacitor plugin. Store the save in app storage (Capacitor Preferences/Filesystem) rather than only `localStorage` |
| **In-game Credits screen** (titled "Legends of the Last Keep") | CC-BY 4.0 (DawnLike), Himeko Sutori and unTied Games require visible credit; OFL texts; good manners for Craftpix, blueberry, Tiny RPG Music, PixelLab disclosure | Link it from Settings and the title screen; scrollable; plain text. Source list: `licences.md` |
| **Privacy policy and Terms links** in Settings | Both stores | One tap to the web page |
| **Remove or gate debug hooks** | `window.__game` (`main.ts:330`), the `?seed=` query (`main.ts:209`, gives test pages and skips the starter pick), scene jump helpers | Build a release flag in `build.mjs` that drops them; don't ship `game.js.map` (7 MB) |
| **Purchase layer** | Billing, "Restore purchases", offline entitlement cache, a way to *test* purchases (Google internal test track; Apple Sandbox) | Gate content by entitlement, never touch combat numbers |
| **Capacitor shell fixes** | Android back button, portrait lock, status-bar and safe-area handling, pause/resume of audio when the app goes to the background, no service-worker registration in the app, haptics | The page already uses `env(safe-area-inset-*)` |
| **App icon and splash** | Needs an original icon at 1024x1024 (Apple) and 512x512 (Google), plus adaptive-icon layers | Not from a Craftpix background (see `licences.md`) |
| **Store assets** | Screenshots: phone portrait for each store (several shots, 1080x1920-class sizes; Apple wants specific device sizes), a 1024x500 feature graphic (Google), a short description (80 chars) and a long one, a short trailer is optional | Take them from the 393x852/412x915 layouts with the real game; no mention of other games |
| **Size** | The web folder is about 31 MB (19 MB `game.js`, 7 MB source map, 5.5 MB music); fine for both stores | Dropping the map saves 7 MB |
| **Support page** | Email and an FAQ | |
| **Crash visibility** | Without an SDK you see only the stores' own crash reports (Play Console vitals, App Store Connect) | Acceptable at launch, no privacy cost |
| **Localisation** | Optional. The text is British English; store listings in other languages can wait | |

## 7. The order to do it in

1. **Decide the name** (section 5.5); have it searched. Everything else (icon, package id, listing) depends on it.
2. **Clear the assets** (`licences.md`): Duchess, golems/treant, icon; dated licence copies saved.
3. **Build the release features**: Credits screen, save export/import, privacy/terms links, debug hooks removed, release build flag.
4. **Write the privacy policy and terms** (lawyer reviews); publish them on a stable URL; set up the support email.
5. **Open the accounts**: Google Play Console ($25) first (the 14-day test clock is the long pole). Apple Developer ($99/yr) when the iOS build is close. Decide sole proprietor or LLC with an accountant before accepting money. Apply to Apple's Small Business Program.
6. **Add Capacitor** and get an Android build running on a real phone; add the purchase plugin and the Full-game unlock; test on the Play internal test track.
7. **Closed test on Google Play**: invite 12+ testers, keep them 14 days in a row, collect feedback, fix bugs. Meanwhile build and test the iOS app via TestFlight (cloud Mac or a Mac).
8. **Fill in the store pages**: listing text (no other game names), screenshots, feature graphic, icon, IARC questionnaire, Data safety form, App Privacy labels, AI-content answers, age rating, price/IAP products.
9. **Submit**: Apple review (usually 1-2 days, expect one rejection round, answer politely with a note on offline play and content), Google production release (staged rollout to 10-20% first).
10. **After launch**: watch crash reports and reviews, ship a patch within a week, then consider cosmetic packs, new lands, and a web (PWA) version that stays free.

## 8. Open questions for the owner

- Which country are you based in? (It changes the tax and VAT notes and whether an LLC helps.)
- Should the free part be one land, a number of tower floors, or time-limited? (A game-design call that affects conversion.)
- Is Chronos (`hpatter9/little-town`) going to ship too? Then asset rights and the account name should be one arrangement.
- Will you do the app-store and trademark searches on "Legends of the Last Keep" yourself (a phone and ten minutes) and send me the hits? The web tools here could not reach the stores or the trademark databases.
- Do you want a custom domain for the privacy page? (It should not be the game's own address; see 5.5a.)
