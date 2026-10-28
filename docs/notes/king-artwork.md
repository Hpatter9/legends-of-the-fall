# Eight player rulers

Owner: Codex. Branch: `design/king-artwork`. Worktree: `/workspace/legends-of-the-fall`.

The owner approved the eight personality concepts and authorised implementation. The roster is implemented on the branch. The owner requested [PR #165](https://github.com/Hpatter9/legends-of-the-fall/pull/165) for Claude to merge; the PR remains unmerged and no deployment has been performed. The feature version bump is left to Claude at merge time.

## Result

Settings now opens with eight illustrated ruler choices, saved by stable character ID in the existing `legends.settings` object. Existing or invalid choices default to Iron Stag. The choice updates the castle throne, Last Stand and cinematics. It does not alter battle rules, progression, existing simulation IDs or run saves. The roster has five adult women and three adult men:

| Ruler | Personality | Visible details |
| --- | --- | --- |
| Sun Viper | The Seductress | Serpent tattoos, fan, gold chains, teal silks |
| Frost Witch | The Scholar | Glasses, annotated spellbook, silver script |
| Ash Empress | The Conqueror | Flame tattoos, piercings, ember axe |
| Rose Duchess | The Schemer | Pearls, rose tattoo, secret letters |
| Moon Oracle | The Dreamer | Crescent tattoos, moonstones, cards |
| Iron Stag | The Veteran | Scars, keepsake, steel armour and crimson cloak |
| Storm Corsair | The Rogue | Compass tattoos, rings, lucky coin |
| Gilded Necromancer | The Eccentric | Linked earrings, runes, spectral companion |

Each ruler has 32 frames: four each for idle, walk, strike, cast, hurt, fall, seated idle and seated command. Cinematics distinguish spells from strikes, time ruler actions from their beginning, and hold the final fallen frame. Castle interactions play a command gesture. Last Stand triggers casting on successful spell input, hurt on incoming hits, command on wave clear and death when health reaches zero. An empty throne remains behind the ruler during standing reactions and death. Reduced motion selects stable, meaningful poses, including the final fallen pose.

Last Stand quips retain their existing timing/chance rules, with personal lines for the seven new personalities; Iron Stag keeps the original king lines. Player titles, relevant pronouns, subtitles, captions, scene descriptions and accessibility labels match the selected ruler. Named enemy kings are unchanged. Castle frame deltas are clamped to zero on resume, fixing a negative VFX index caught by browser checks.

## Files and art

- `src/rulerRules.ts`: roster, validated identity lookup, action frame timing and player-title wording.
- `src/rulerUrls.ts`, `src/render/rulerArt.ts`, `src/art/rulers/`: shared bundled artwork, Canvas/Pixi drawing and provenance. The PNG data URLs travel inside `game.js`, already cached by the existing service worker.
- `src/settings.ts`, `src/keepKingdom.css`: saved illustrated selector with pressed state and keyboard focus.
- `src/castle.ts`, `src/render/standHall.ts`, `src/standView.ts`, `src/render/sceneView.ts`: live artwork and actions.
- `src/rulerSpeech.ts`, `src/quips.ts`, `src/codexView.ts`, `src/home.ts`, `src/tips.ts`: ruler presentation and personal reactions.
- `tools/rulers/prepare.sh`, `bounds.mjs`: mechanical slicing/padding of generated source atlases, finding quiet alpha seams so variable row heights do not crop crowns. Originals are preserved in the generation workspace; the included runtime atlases need no preparation step to build.
- `tools/rulers/check.mjs`: portrait browser checks using installed Playwright and Chromium. `test/rulers.test.ts` and `test/settings.test.ts` cover identity fallback, roster composition, one-shot completion, reduced motion and avoiding enemy-title replacement.

Original artwork was generated with OpenAI image generation from the approved concept board, with credits in `CREDITS.md` and source names in `src/art/rulers/provenance.json`. Tiny jewellery and tattoos naturally lose detail at gameplay scale; the large silhouettes, palettes and signature objects distinguish rulers there.

## Validation

- `npm run typecheck`: passed.
- `npm run web`: passed.
- `npm test -- rulers settings cinematics scenes quips stand`: passed all eight affected test files, no failures.
- Browser checks on 393×852, 360×780 and 412×915 passed for saved selection, all eight live castle appearances, cinematics, Last Stand actions and final fallen pose. 360×780 uses reduced motion. No page errors in the completed first run.
- Final `node tools/rulers/check.mjs`: passed all three sizes with no page errors. Verified all eight castle choices at each size, all eight cinematic/Last Stand appearances at 393×852, representative appearances at the other sizes, explicit cinematic strike/cast/hurt/death completion, Last Stand cast/hurt recovery and held death, saved selection after reload, and offline reload with all eight choices available.
- `git diff --check`: passed. `bash -n tools/rulers/prepare.sh`: passed.

Screenshots: `docs/samples/rulers-settings-<size>.png`, `ruler-<id>-<size>.png`, `ruler-scene-<id>-<size>.png`, `ruler-stand-<id>-<size>.png`, and `ruler-stand-fallen-<size>.png`. All eight appearances were captured at 393×852; Sun Viper is the representative on the other sizes.

Approved concept: [eight personalities](../samples/ruler-roster-personalities.png). Earlier concepts retained for history: [original roster](../samples/ruler-roster-proposal.png), [king](../samples/king-artwork-proposal.png), [first queen](../samples/queen-artwork-proposal.png), [revised queen](../samples/queen-artwork-proposal-v2.png).

## PR integration handoff

PR #165 targets `main`. Integrated `origin/main` at `c21e6038` (0.200.0), resolving the task-board, Settings and sprite-loader conflicts. Preserved Duchess cosmetic settings, developer settings and the required-sheet/rear-view loader alongside ruler loading. Removed a duplicate settings import introduced by the automatic castle merge. Typecheck, web build and all eight affected test files passed after integration. Refreshed portrait screenshots are included; the post-integration browser result is recorded below.

Post-integration `node tools/rulers/check.mjs`: passed at all three phone sizes with no page errors. Offline reload, persisted ruler selection, all eight appearances, cinematic one-shot completion, Last Stand reactions and reduced motion passed. `git diff origin/main --check` also passed.
