# Shared task board

Project: **Legend of the Last Keep**  
Initial coordination snapshot: 2026-10-26

This is the shared handoff board for Codex and Claude. It records known assignments, not live chat activity. Existing chats must read these instructions from their checked-out branch or receive a handoff; this file does not automatically notify them.

The manager maintains the integrated board. Workers propose their task updates in their own branches and return them in their handoff. Keep one owner per task; reconcile board changes when integrating work.

## Current owner requirements

- Intentional flashy effects are allowed. “No flashing” refers to textures disappearing or glitching off and on, not deliberate visual effects.
- Run tests for the changed behaviour and affected callers. Full suites and unrelated balance sweeps are not required; retain typecheck/build and affected portrait checks for implementation work. Documentation-only updates require diff, link and consistency review.

## Active work

### WORLD-ROAD — Army road, boss arenas and the living land

- **Goal:** the owner's asks: army battle maps follow a realistic path (a winding road 6 to 9 tiles wide with themed scenery beside it that walkers cannot enter, not a full 14x18 slab), each army's boss waves (8 and 15; the Wildwood's 5, 10 and 15) fought in its own themed arena, and (phase B) a living environment: hazards that act on both sides, running water and waterfalls, pack walls and set pieces at the tiles' angle, ambient life.
- **Status:** phase A approved by the owner (seven answers); phase B done on the branch, ready for review.
- **Owner:** Claude (the WORLD army map is normally the other AI's area; the owner assigned this one to Claude).
- **Branch / worktree / PR:** `claude/army-road`, `/home/user/army-road` (main 0.186.0 merged in); PR none.
- **Allowed files or systems:** `src/sim/scenario.ts`, `src/sim/armyRoad.ts`, `src/sim/hazards.ts`, `src/sim/board.ts` (optional `Tile.scene`, `paved`, `ring`, `stream`; `Board.pieces`, `hazards`, `flow`, `falls`; scenery not `standable`), `src/sim/battle.ts` (the `hazard` event and its tick), `src/sim/armies.ts` (seven Normal `start` values), `src/render/boardView.ts`, `columnTextures.ts`, `roadArt.ts`, `roadAtlas.ts`, `hazardLooks.ts`, `fx.ts` (hazard tells and strikes), `soundRules.ts` (their cues), `weatherRules.ts`/`weatherView.ts` (ambient motes on the road), `src/main.ts` (two calls), `src/art/road/`, tests `test/army-road.test.ts`, `test/army-hazards.test.ts`, `test/world-001-scenario.test.ts`, `tools/army-road/`, `docs/notes/army-road.md`, `docs/samples/army-road-*.png`, `CREDITS.md`. Other modes' boards untouched.
- **Completion criteria:** road and arenas per the owner's answers; hazards deterministic on their own side stream, both sides, each rule tested; rings and set pieces from pack art at the tiles' angle, credited; water flows and pours off open edges; ambient life respecting reduced motion and battery saver; every walkable tile reachable and every survivor able to walk on to the next section; armies within noise of main at their recommended levels; typecheck, affected tests and the full suite, web build; 393x852, 360x780 and 412x915 checks.
- **Validation:** see the handoff's "Checks run for phase B".
- **Handoff:** [notes](notes/army-road.md), [phase B sheet](samples/army-road-after-sheet.png), [phase A mock-ups](samples/army-road-mock-sheet.png).

### CHEST-001 — XP tomes and Open all

- **Goal:** the owner's two asks: XP tomes (small, medium, large) as a chest drop, read to one hero of the player's choice from the hero's page; and an Open all for the chests waiting on the cart, with one combined summary.
- **Status:** done: owner accepted release 0.178.0 (large tome 20,000 XP; overflow at the cap lost with a warning).
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/chest-extras`, `/home/user/chest-extras` (from main 0.174.0); PR none yet.
- **Allowed files or systems:** `src/sim/tomes.ts` (new), `src/sim/{armyStars,chestShop,meta}.ts` (the loot roll, `openAll`, `sumLoot`, `Meta.tomes`), `src/{chestStash,shopView,menuHeroes,tomeView,tomeArt}.ts`, `src/tomes.css`, `build.mjs` (the CSS list), the tome icons in `src/art/ui/`, `tools/tome-icons.py`, `tools/{unlockPace,levelPace}.ts` (tome reporting), `tools/ui/chest-extras-shots.mjs`, tests, `CREDITS.md`. Not the castle tab, the battle-picking tab, the WORLD army map or the Last Stand files.
- **Completion criteria:** tomes drop deterministically on top of every stash and shop chest's stones and gear (shop prices unchanged); `Meta.tomes` optional and old saves load; "Use tome" on the hero page with the level-up feedback, capped at `MAX_LEVEL`; Open all identical to opening one by one, with a summary; pack art credited; pace reported; tests; screenshots at 393x852.
- **Validation:** typecheck passed; `npm run web` built; `npm test -- chest summon-stones levels meta armyStars daily stand tower modes equipment hero-shards calMapRewards progression awaken shards unlock achievements codex` (252) and `npm test -- armies battle-flow calamity elites equip-best gear-sets mystery recycle no-flicker` (134) passed, including the 9 new tests in `test/chest-extras.test.ts`; `npm run unlock-pace` and `npm run level-pace` (with and without `--tomes`, 10 seeds); browser screenshots at 393x852 (`docs/samples/chest-extras-*.png`), also checked at 360x780 and 412x915 with no page errors.
- **Handoff:** `docs/notes/chest-extras.md`. For the owner: the large tome's size, losing the overflow at the cap, and the drop table.


**COMBAT-002 / Hero kits, mana and manual ultimates** — done: owner accepted release 0.172.0.

- **Goal:** every hero gets a mana or stamina pool, two skills that cost it (level 1 and level 10), and an ultimate (level 30) the player fires by tapping its portrait in a new hero bar, with an Auto toggle; all 45 heroes reworked into far more varied roles (summoners, shapeshifters and many odd archetypes), no new heroes.
- **Status:** phase 1 (design) approved with the owner's five answers; phase 2 (implementation) done on the branch, ready for review.
- **Owner:** Claude. **Branch / worktree:** `claude/hero-kits`, `/home/user/hero-kits`. PR: none yet.
- **Scope:** the battle simulation's hero kits, pool, ultimate meter and a queued ultimate command (`src/sim/abilities.ts`, `ultimates.ts`, `tierSkills.ts`, `combos.ts`, `traits.ts`, `talents.ts`, `units.ts`, `battle.ts`, new `heroKits.ts`, `orders.ts`, `kits/`); the fight HUD (fight panel in `src/main.ts`, `src/index.html`); unit and effect rendering; hero texts; balance retune. Not the castle tab, the battle-picking menu tab or the army battle map (WORLD-001).
- **Completion criteria:** owner approves the design; then all 45 kits implemented as approved; resource, order/replay and kit tests added; typecheck, web build and affected tests pass; the hero bar checked at 393×852, 360×780 and 412×915 with reduced motion; hero, army, Calamity, daily, Last Stand and spire balance re-measured and recorded; old saves load and play.
- **Validation (phase 1):** documentation and images only; `npm run web` run once to capture the current fight screen.
- **Validation (phase 2):** typecheck and web build pass; full `npm test` after merging `origin/main`: 1176 of 1176 pass. `tools/kits/shots.mjs`: all checks ok, no page errors at 393×852, 360×780, 412×915, reduced motion, Last Stand and Calamity. Hero parity within 6 (L1 worst +5.3, L30 worst +5.8); armies 2.1–2.8 tries at their levels; Calamity 92/79/65/51/47/15; daily 73%/55%; Last Stand medians 4, 10, 12, 20, 22, 40. Before/after tables in the note.
- **Handoff:** [design and build notes](notes/hero-kits.md), [owner summary](notes/hero-kits-summary.md), screenshots `docs/samples/hero-kits-*.png`, [HUD mock-up](samples/hero-kits-hud-mock.png), [current HUD](samples/hero-kits-hud-before.png).

WORLD-126 rendering checkpoint ready for review; rare warm-tail stability remains open. WORLD-001 per-army map design awaits owner confirmation before implementation.

- Owner: current WORLD continuation chat, confirmed by owner on 2026-10-27.
- Branch/worktree/PR: `codex/world-001`, `/workspace/world-001`, PR #124; owner authorised bump/merge as 0.169.0.
- Scope: column texture ownership/reuse, reproducible cold/warm and pixel/lifecycle checks; then per-army terrain maps using owner-requested 14×18 dimensions. Nine-theme visual proposal and section/progression clarification are with the owner. Drowned Temple must end on a central lake island.
- Completion: measured baseline/candidate, exact pixels, bounded cache and cleanup, required tests/build and portrait/offline checks; report unmet gates honestly.
- Reserved: Party/Keep and SIM #122 remain separate. Owner authorised the release bump and merge on 2026-10-28; wider WORLD map design remains separate.
- Recovery: published head `7426ac5a` recovered; prior unpublished candidate and temporary outputs absent. Reimplemented from #126 handoff.
- Validation: typecheck and web build passed; full suite passed 106 files, zero failures/skips (429.58s); five ownership cases and 3,634 strict pixel comparisons passed. Median cold stalls reduced 83.7%, but rare warm-tail stalls remain unresolved. Real progression, 24 rebuild/theme cycles, late-save resume, drag-pan, lazy pan-back and offline reload passed at 360×780, 393×852 and 412×915 with zero page errors. See `docs/notes/world-126.md`.


**SCENES-002 / Cinematic fixes** — the owner's five asks about the cinematics. Owner: Claude. Branch/worktree: `claude/scenes-fixes`, `/home/user/scenes-fixes` (from main 0.170.0). Scope: the scene data and rules (`src/sim/sceneScripts.ts`, `sceneEvents.ts`, `sceneFamilies.ts`, `sceneKit.ts`, `sceneRules.ts`), the scene trigger points and the boss card in `src/main.ts`, `Meta.bossCards` (optional) in `src/sim/meta.ts`, the Dread Pirate and Tyrant milestone in `src/sim/contentHeroes.ts`, one result line in `src/quipData.ts`, `docs/lines/new-lines.json`, the affected tests, `tools/cinematics/fixes.mjs`, `docs/notes/scenes-fixes.md` and `docs/samples/scenes-fixes-*.png`; not battle.ts, abilities, the fight HUD (`claude/hero-kits`), the WORLD map or the castle tab; Duchess's fight behaviour unchanged. Completion: (1) the first-loss scene only on a final defeat (no heart left); (2) every boss and herald introduction, the form cut-ins and the boss card once a save; (3) the king always the player and Duchess never framed as the king, with the king shown in the king shots; (4) the Calamity's scenes only once it unlocks, its reveal a scene of its own; (5) the Last Stand milestones told as the breach and the throne room, the Calamity as a portal to the void, no tower words; scene lines ≤100, captions ≤24 and scene lengths within the cinematics test; typecheck, affected tests, web build and a 393x852 browser check. Status: **ready for review**. Validation: typecheck and web build passed; 182 tests in the affected files (scene, cinematic, new-lines, quips, stand, heart, hero-shards, achievements, meta, codex, content, save, unlock, modes) passed, none failed; `tools/cinematics/fixes.mjs` passed all five browser checks at 393x852 with no page errors (screenshots `docs/samples/scenes-fixes-*.png`). Not checked at 360x780 or 412x915; the full suite was not run. See [handoff](notes/scenes-fixes.md).

**UX-002 / Home and loss fixes, menu flicker** — Status: done: owner accepted release 0.174.0. Owner: Claude. Branch: `claude/ux-fixes` (from main 0.170.0); PR none yet. Goal: the owner's three asks: don't name the current army every time the game opens; after a real defeat, a short "How to come back stronger" card with tailored pointers; find and fix textures that vanish or blink in the menus and camp. Scope: the Battle page's army ribbon (`src/home.ts`, new `src/armyShown.ts`, one key added to `SAVE_KEYS` in `src/settings.ts`); the loss card (new pure `src/sim/comeback.ts`, `src/recapView.ts`, the recap call in `src/main.ts`, `Home.goTo`, styles in `src/pixel.css`); menu and camp flicker (`src/home.ts` refresh, `src/camp.ts`/`src/main.ts` launch wait, `src/tavern.ts` still picture, decode-ready menu pictures in `src/menuHeroes.ts`, `src/talentView.ts`, `src/equipView.ts`); tests `test/comeback.test.ts`, `test/army-shown.test.ts`; tools in `tools/ux-fixes/`; screenshots `docs/samples/ux-fixes-*.png`; note `docs/notes/ux-fixes.md`. Reserved, not touched: the castle tab and WORLD army map (other AI; castle flicker reported only), hero combat and fight HUD (`claude/hero-kits`), cinematics (`claude/scenes-fixes`); no save version, Meta field or version bump. Completion: the ribbon shows only for a newly current army; the card shows 2-4 save-drawn pointers with working buttons on a real defeat only (not on a heart revive or auto-replay); flicker measured before/after with causes fixed; typecheck, affected tests, web build and three portrait sizes pass. Validation and handoff: [notes](notes/ux-fixes.md).

**STAND-002 / Last Stand harder** — the owner asked for a harder Last Stand. Owner: Claude. Branch: `claude/stand-harder`. Scope: the Last Stand's own sim and numbers only (`src/sim/stand.ts`, the stand tools, `test/stand.test.ts`, `docs/notes/last-stand.md`); no castle, battle-tab, army-map, `meta.ts` or summoning files. Completion: greedy medians near about 4-5, 9-10, 14, 18-20, 26-28 and 35-40 at hero levels 1, 10, 20, 30, 60 and 100 (30 runs a row); crowns per run at the target wave about the same as before; typecheck, web build, stand tests and `tools/stand/smoke.mjs` pass. Status: done on the branch, awaiting review; level 30 runs a little high (22). See [handoff](notes/last-stand.md).

**UI-005 / Party war council** — owner accepted the implementation and authorised version bump and merge as 0.166.0. Typecheck/build and 20 affected tests passed; three portrait sizes, all 45 heroes, draft/save, search/filters, starter/empty states, reduced motion and static texture checks validated. Selected portrait row subsequently simplified into a compact, numbered company roll at the owner’s request; tap-to-remove and hold-for-details retained. Initial banner-row concept rejected. Direction: five selected units in action poses fighting a creature horde, with elaborate ornament and deliberate spell effects. Owner: Codex. Branch: `design/party-war-council`, worktree `/workspace/legends-of-the-fall`; [PR #134](https://github.com/Hpatter9/legends-of-the-fall/pull/134). Scope: party picker (`src/party.ts`, `src/partyScene.ts`, party markup in `src/index.html` and styles in `src/keepKingdom.css`), related screenshots and notes; preserve simulation, save format and existing hero dossiers. Goal: ornate, exciting party selection with useful role coverage and synergy guidance. Completion: owner approves concept, implementation passes typecheck, affected tests and build and 393×852, 360×780, 412×915 review. Intentional glows and flourishes are allowed; disappearing textures or glitchy on/off flashing are defects. Implementation uses existing attack sprites, horde sprites, effect strips, brass frame and cached scenery; no simulation or save changes. See [implementation and validation](notes/party-war-council.md).


UI-003 accepted by the owner for release 0.164.0 and GitHub merge. Implementation, portrait validation and release integration checks passed on `design/hero-detail-dossier`; submission through a pull request to main is authorised. FX-001, UI-002, HEART-001 and DIALOGUE-001 remain intact. See [handoff](notes/hero-detail-dossier.md).

UI-004 (Summoning Sanctum) is accepted by the owner for release 0.165.0 and GitHub merge. Owner: Codex; branch `design/summoning-sanctum`, worktree `/workspace/legends-of-the-fall`; PR pending. Scope: ornate chamber, new-hero celebrations, quiet shard tarot cards, supporting artwork, release metadata and validation. Main 0.164.0 is integrated, preserving the released combat and hero dossier work. Typecheck, release build, 16 targeted tests and the three-size result browser suite passed; ready for the authorised PR merge. See [handoff](notes/summoning-sanctum.md).

The summon task was initially labelled UI-003 before fetching concurrent main updates; UI-003 already identifies the released hero dossier, so the summon task is now UI-004. Prior completed work is retained below.

## UI-001 manager takeover — 2026-10-26

The owner stopped the previous UI chat and transferred the intact branch and PR to this manager. The owner chose Keep & Kingdom (stone, brass, green), authorised layout/navigation redesign, and prioritised hero roster and equipment after comparing two visual concepts. Ask clarifying questions at the start of future tasks and provide visual proposals for visual work.

Checkout and dependency installation now work in the manager environment. Earlier proxy errors were overcome with sandboxed network access; the dependency cache was moved to a writable workspace directory. The hero roster/equipment redesign and shared theme are implemented. Typecheck and web build pass; all 103 test files pass. Browser hero/equipment checks and combat/offline smoke checks pass at all three portrait sizes. All 17 land fits were checked at 393×852. See [implementation and validation](notes/tactical-command-ui.md). The director integrated the manager setup from main, resolved overlapping coordination files, and bumped the working-branch version to 0.158.0 under the merge-time rule. The owner approved the actual visuals and requested the merge. Release version: 0.159.0. A full manual pass across modes and progression states remains a documented follow-up; automated smoke checks are not an exhaustive playthrough. The following is the earlier handoff, retained as history.

## Earlier UI-001 handoff — 2026-10-26

Owner relayed the UI chat's report. GitHub confirms PR #118 is open and draft. This is a recorded handoff, not a new validation run.

- **Changes in reported session:** none; inspected PR and instructions.
- **Blocker:** clone failed because the UI environment could not connect to its network proxy; retry was interrupted. Cause and recovery remain unverified.
- **Checks:** typecheck, tests, web build, and browser checks have not run.
- **Next work:** obtain a checkout on the existing branch; audit and complete the UI; inspect 393×852, 360×780, and 412×915 portrait sizes; check deployment, battles, hero management, navigation, overlays, save loading, and offline play; fix failures and rerun checks.
- **Release gate:** update the UI notes, board handoff, and PR with actual results. Keep PR #118 draft until validation and visual review are complete. Its reservation remains in place while blocked.
- **Reference:** [recorded handoff](notes/ui-coordination-handoff.md).

### SUMMON-002 — Summoning stones economy

- **Goal:** crowns buy chests; chests (and every other shard source) give summoning stones; a stone is one shard, one in 100 a whole unowned hero; the roster grows about half as fast. Owner's follow-up: silver chests hold 8 stones and gold 15; codex milestones pay 1 stone and achievements 2 (3 or 5 for the big ones); each codex entry pays 1 stone the first time it is discovered (old saves only for entries discovered from now on); the late pace is fine as it is; the 10-stone gift, daily stock and rising price stay.
- **Status:** done: owner accepted and authorised release 0.171.0.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/summon-stones`
- **Allowed files or systems:** `src/sim/{meta,unlock,unlockRules,armyStars,calReward,chestShop,codex,achievements}.ts`, `src/{gacha,hall,shopView,home,calClear,codexView,achievementsView}.ts`, tests, `tools/unlockPace.ts`. Minimal: `main.ts`, `index.html`. Not the castle or battle tabs, nor WORLD files.
- **Completion criteria:** stones, shop, sources, old-save grant, tests, pace about 2x slower; owner approves the UI.
- **Validation:** typecheck passed; `npm test -- summon-stones achievements codex hero-shards meta armyStars daily calMapRewards awaken shards new-lines starter unlock modes` (162 tests, with the entry stones) and `npm test -- stand` (29, after the merge) passed; `npm run web` built; `npm run unlock-pace -- --seeds 30` re-run (table in the handoff); chest shop re-shot at 393x852 with `tools/ui/summon-stones-shots.mjs`, and the achievements and codex pages checked at 393x852. Not re-checked this round: 360x780 and 412x915.
- **Handoff:** `docs/notes/summon-stones.md`.

## Completed work

| ID | Task | Result | Reference |
| --- | --- | --- | --- |
| AUDIO-150 | Recorded combat sounds and a quieter, cleaner battle mix | Released as 0.186.0; the sounds' source (given as CC0) still needs naming in CREDITS.md | PR #150 |
| AUDIO-147 | Battle music opens on the combat downbeat; the camp's theme plays across all home tabs | Released as 0.184.0; the loop start was moved to 5.68 s (bar 4) so the loop stays whole bars and joins on the beat | PR #147 |
| UI-CASTLE-1 | Remove the corner relic emblems from the castle's building cards | Owner asked; released as 0.183.0; castle tests, build, fresh/old-save and Last Stand smoke passed | branch `claude/castle-card-corners`, screenshot `samples/castle-no-corner-emblems-393x852.png` |
| SIM-001 | No phantom hit effects; no credit for terrain self-damage | Merged with main 0.181.0 (hero-kit after-blow effects also wait for a landed blow) and released as 0.182.0; full suite, build, fresh/old-save and Last Stand smoke passed | [PR #122](https://github.com/Hpatter9/legends-of-the-fall/pull/122), [handoff](notes/sim-001.md) |
| FIX-177 | Unblock the publish after the winding maps | Owner asked; armies keep one land on the winding maps, three tests moved to the 14x18 army board, Undead Normal start 1.52; full suite 1220/1220, build, fresh/old-save and Last Stand smoke passed; release 0.180.0 (0.179.0 was also used by PR #143, merged just before) | [Note](notes/fix-177-tests.md), branch `claude/fix-177-tests` |
| CHEST-001 | XP tomes and Open all | Owner accepted release 0.178.0; tomes 250/5,000/20,000 XP from every stash and shop chest, Open all equal to one-by-one; typecheck, build, fresh/old-save and Last Stand smoke passed; full suite 1216/1220, the 4 failures also fail on main 0.177.0 (winding battle maps), not from this change | [Handoff](notes/chest-extras.md), branch `claude/chest-extras` |
| UI-006 | Cliffside battle overlook with nine army-dependent bases and distant Calamity | Owner authorised release 0.175.0 and PR merge; typecheck/build, 85 targeted tests, all nine camps at three portrait sizes and offline switching passed | [PR #139](https://github.com/Hpatter9/legends-of-the-fall/pull/139), [implementation and screenshots](notes/battle-overlook.md) |


| UX-002 | Home and loss fixes, menu flicker | Owner accepted release 0.174.0; army ribbon only when new, come-back-stronger card after a final defeat (summon tip updated for summoning stones at merge), menu and camp flicker fixes; 1194 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/ux-fixes.md), branch `claude/ux-fixes` |
| SCENES-002 | Cinematic fixes | Owner accepted release 0.173.0; loss scene only on a final defeat, boss scenes once, the king is the player, Calamity scenes gated and retold as a portal, Last Stand milestones retold; 1183 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/scenes-fixes.md), branch `claude/scenes-fixes` |
| COMBAT-002 | Hero kits, mana and manual ultimates | Owner accepted release 0.172.0; all 45 heroes reworked, tap-to-fire ultimates with Auto; 1176 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/hero-kits.md), branch `claude/hero-kits` |
| SUMMON-002 | Summoning stones economy | Owner accepted release 0.171.0; roster about 2x slower to the 20th hero, 1.5-1.7x late; typecheck, 1150 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/summon-stones.md), branch `claude/summon-stones` |
| STAND-002 | Last Stand made harder | Owner accepted release 0.170.0; greedy median waves 4/10/13/22/26/35 at levels 1/10/20/30/60/100, pay within about 9% of before; typecheck, 1133 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/last-stand.md) (section "Making it harder"), branch `claude/stand-harder` |
| FX-003 | Individual painted signatures for 129 base abilities | Owner accepted release 0.168.0 and merge through PR #135; 84 integration tests, all five emitted-material browser cases and offline launch passed | [PR #135](https://github.com/Hpatter9/legends-of-the-fall/pull/135), [handoff and scope](notes/individual-ability-effects.md) |
| FX-002 | Cinematic battle-effects remake | Accepted with FX-003 for release 0.168.0; main 0.167.0 audio/courtyard updates preserved, release checks passed | [PR #135](https://github.com/Hpatter9/legends-of-the-fall/pull/135), [handoff](notes/battle-effects-remake.md) |
| UI-005 | Cinematic party war council and compact company roll | Owner accepted and authorised release 0.166.0 and merge; typecheck/build, 20 affected tests, all three portrait sizes and all 45 hero tableaux passed on the integrated release | [PR #134](https://github.com/Hpatter9/legends-of-the-fall/pull/134), [handoff](notes/party-war-council.md) |
| UI-004 | Ornate summoning sanctum and differentiated hero/shard reveals | Owner accepted and authorised release 0.165.0 and merge; implementation, full suite and portrait/offline checks passed; release integration checks passed | [Handoff](notes/summoning-sanctum.md), branch `design/summoning-sanctum` |
| UI-003 | Ornate hero dossiers and animated portrait scenery | Owner accepted the implementation and authorised release 0.164.0 and GitHub merge; all 103 tests and three portrait sizes validated | [Handoff](notes/hero-detail-dossier.md), branch `design/hero-detail-dossier` |
| FX-001 | Combat animation polish | Done; owner accepted effects and authorised release 0.163.0 and GitHub merge; 104 implementation test files, 10 integration test files, typecheck, build and five browser cases passed | [PR #131](https://github.com/Hpatter9/legends-of-the-fall/pull/131), [handoff](notes/combat-animation-polish.md) |
| UI-002 | Ornate company character cards | Done; owner accepted the implementation and authorised release 0.162.0 and GitHub merge; full test set and three portrait sizes validated | [Implementation and release handoff](notes/character-card-flair.md), branch `design/character-card-flair-mockup` |
| HEART-001 | Hearts revive fallen heroes in the existing fight | Done; owner authorised merge into `work`, release 0.161.0; 103 test files, typecheck, build and portrait checks passed | [Handoff](notes/heart-resume.md) |
| DIALOGUE-001 | Roughly 90% fewer fight conversation bubbles | Owner accepted and authorised merge, release 0.160.0; typecheck, build and dialogue tests pass; full suite stopped after 50 passes and 53 cancellations | [Handoff](notes/fight-bubbles.md), branch `reduce-fight-bubbles` |
| UI-001 | Keep & Kingdom hero roster, equipment and shared styling | Done; owner accepted the result and authorised merge, release 0.159.0 | [PR #118](https://github.com/Hpatter9/legends-of-the-fall/pull/118), [validation and screenshots](notes/tactical-command-ui.md) |
| SETUP-001 | Shared Codex instructions and task board | Done; merged at owner's request, version 0.157.0 | [PR #119](https://github.com/Hpatter9/legends-of-the-fall/pull/119), [setup note](notes/manager-setup.md) |

## SIM-001 implementation assignment

- **ID / title:** SIM-001 — effective hits and environmental kill credit (#121).
- **Status:** ready for Game Director review; not merged.
- **Owner:** Codex implementation chat.
- **Branch / worktree / PR:** `codex/sim-001`, `/workspace/legends-of-the-fall`; [PR #122](https://github.com/Hpatter9/legends-of-the-fall/pull/122).
- **Allowed scope:** simulation damage settlement, pure combat statistics, regression tests, this board and `docs/notes/sim-001.md`.
- **Reserved:** UI-001's completed work and ownership history are preserved; no UI changes in SIM-001. No UI, input, renderer, charm targeting or RNG isolation changes.
- **Completion criteria:** reproduce failures first; minimally fix post-hit effects and environmental credit; cover cancelled/dead/shielded hits and genuine kills; run typecheck, tests and web build; open an unmerged PR and report in #121.

- **Validation:** typecheck passed; full `npm test` passed (104 test files); final 19 focused regressions and `npm test -- sim-001` passed; web build and diff checks passed.
- **Integration:** current main UI release retained unchanged; typecheck, focused tests and web build also passed against 0.159.0.
- **Handoff:** `docs/notes/sim-001.md`; genuine combat credit and participation/victory XP retained; no implementation blockers. Director reviews shield rider interpretation and handles merge/versioning.

## Ready queue

No additional development tasks have been assigned. Do not invent feature work or start broad refactors. The next task should come from the owner's goal or a specifically authorised investigation.

## Task template

- **ID / title:**
- **Goal:** observable player outcome or question to answer.
- **Status:** ready / in progress / blocked / ready for review / done.
- **Owner:**
- **Branch / worktree / PR:**
- **Allowed files or systems:**
- **Dependencies / reserved files:**
- **Completion criteria:**
- **Validation:** commands actually run, results, and any manual checks.
- **Handoff:** commit or PR, note path, remaining issues.

## Handoff for the existing UI chat

The earlier UI chat stopped work and handed ownership to the manager. UI-001 is accepted and can be archived by the owner. Do not resume that branch without a new assignment. The manager cannot archive app chats directly.

## Returning work to Claude or Codex

Give the next chat the task ID, branch or PR, relevant docs/notes file, checks already run, and remaining work. Repository files provide shared context; chats do not automatically share conversation history or local changes.

## Completion

Mark a task ready for review after implementation and validation. Mark it done only after the owner merges or explicitly accepts the result. Retain a short completed entry with its PR and handoff note.


## WORLD rendering release — 0.169.0

Owner authorised bump and merge of PR #124 on 2026-10-28. Latest main 0.168.0 is integrated, preserving its UI, combat effects, heart-revive behaviour, credits and task history. WORLD remains opt-in at 12×16; the 14×18 per-army maps are still proposals. Rare warm-tail stalls and real-device performance remain open in #126; the broader map initiative remains open in #123. See [rendering handoff](notes/world-126.md).

Release integration validation for 0.169.0: typecheck/build and 48 affected tests passed; release progression/resume/pan/offline lifecycle checks passed all three portrait sizes with zero page errors. Original army/large-field compatibility smoke passed. Evidence: `docs/samples/world-169-lifecycle.json`, `world-169-compatibility.json` and the corresponding screenshots. Owner accepted the rendering checkpoint; broader maps and warm-tail/device investigation remain open.

## UI-006 — Battle command screen

- Owner: Codex; branch `design/battle-command-ui`, worktree `/workspace/legends-of-the-fall`.
- Scope: deployment/live-combat HUD, spell and bench styling, bounded markup/build changes, browser evidence and notes. Simulation, maps, save format and other screens remain outside scope.
- Direction: owner rejected subtle restyling, then authorised trying a toned-down ornate battle concept in the game on 2026-10-28.
- Completion: implemented live-game review at 393×852, 360×780 and 412×915; typecheck, web build and affected interaction checks; preserve spell targeting, cooldowns and reduced motion. Final visual acceptance pending.

UI-006 implementation is ready for visual review. Typecheck and web build passed; three-size live combat checks passed with no page errors or page overflow, including spell selection/cancellation and drag-to-cast. Existing offline UI asset enumeration includes the new crest. Full offline reload was not run. See [handoff](notes/battle-command-ui.md). No merge, release bump or deployment.

UI-006 owner accepted and authorised merge as 0.176.0. Main 0.175.0 integrated; manual ultimate controls retained and styled. Typecheck, targeted battle-flow/hero-kit visual and save tests, and release web build passed. Three-size release browser recheck is being completed before PR merge.

UI-006 release updated to 0.179.0 after integrating concurrent main 0.178.0. PR #143; version-only conflicts resolved. Three-size release checks passed for spell arm/cancel, drag preview/cast and ultimate Auto, with no page errors or horizontal page overflow.
