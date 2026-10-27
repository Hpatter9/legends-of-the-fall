# Hero detail dossier

UI-003, branch `design/hero-detail-dossier`, owner: current Codex chat. Status: owner accepted and authorised release 0.164.0 and GitHub merge.

The owner approved the visual concept and requested implementation. Hero details now use the company roster’s antique brass surround, a larger animated pixel fighter in a class-coloured forest shrine, an engraved power panel, illustrated stat tiles and combat trait chips. Overview, Progression, Equipment and Skills are four distinct, keyboard-accessible tabs. Tabs stay visible while scrolling. Hero switching preserves the selected tab.

Progression has connected rank markers and framed awakening/talent panels. Equipment retains its existing controls, with more substantial item frames. Active, tier, ultimate and passive skills have individual cards with existing talent emblems; locked ultimates retain their actual unlock level. The Overview shortcut opens Skills. Hero names wrap, and locked heroes retain their existing recruitment information.

All artwork and fonts are existing credited assets. The brass frame and forest are already cached offline; imported icons are bundled into game.js. No new URL assets, save fields, simulation rules, version changes, merge or deployment.

## Validation

- `npm run typecheck`: passed on final source.
- `npm run web`: passed on final source.
- `npm test`: all 103 test files passed; zero failures, cancellations or skipped files.
- Browser checks passed at 360×780, 393×852 and 412×915 with zero page errors. Checked all four panels, width fit, equipment equip/unequip, opening talent trees, locked heroes and ultimate labels, keyboard tab wrap, Skills shortcut, class styling, tab retention when switching heroes, long names, reduced motion and returning to the roster. [Results](../samples/hero-dossier-checks.json).
- Visually inspected real browser screenshots at all three portrait sizes, including the detail header, overview, skills, progression, equipment and talent tree. Fixed a lower portrait-frame overlap during review.
- `git diff --check`: passed.

The browser fixture uses a session-only inventory and levelled Knight. It is not an exhaustive progression playthrough. An additional rank-ready/fully-awakened fixture check was interrupted before execution when the environment restarted; the passing final checks above and their screenshots were recovered intact. No implementation changes followed those passing checks.

## Real browser screenshots

Portraits: [360px](../samples/hero-dossier-portrait-360.png), [393px](../samples/hero-dossier-portrait-393.png), [412px](../samples/hero-dossier-portrait-412.png).

Panels at 393px: [Overview](../samples/hero-dossier-overview-393.png), [Progression](../samples/hero-dossier-progression-393.png), [Equipment](../samples/hero-dossier-equipment-393.png), [Skills](../samples/hero-dossier-skills-393.png), [talent tree](../samples/hero-dossier-talents-393.png), [locked hero](../samples/hero-dossier-locked-393.png), [long name](../samples/hero-dossier-long-name-393.png).

## Handoff

Files: `src/menuHeroes.ts`, scoped additions in `src/keepKingdom.css`, `tools/hero-detail-checks.mjs`, this note, task board and saved screenshots/results. Changes remain uncommitted on the dedicated branch; no PR created. Owner review and any merge/release remain outstanding.

Reproduce after building and serving `out/web` on port 8000: `node tools/hero-detail-checks.mjs`. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` for the installed browser tooling; `GAME_URL` and `UI_SAMPLES` optionally select the server and output folder. Current environment used `/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright` and `/usr/bin/chromium`.


## Animated portrait interior

The owner requested a flashier, optionally moving background inside the gold trim. The interior now reuses the forest backdrop under class-coloured magical light rays and gently drifting golden motes. The atmosphere spans the portrait, rank and level area; a dark text backing preserves readability. The clipped decorative layer cannot intercept input. Both effects animate transforms at steady opacity and colour, respecting the existing no-flashing rule, and stop with reduced motion. No new assets or offline cache entries are needed.

Validation after the refinement: typecheck and web build passed; all 103 test files passed with zero failures, cancellations or skipped files. Updated browser checks passed at all three portrait sizes, confirming the animation advances, containment inside the frame, non-interception of controls, and both effects stopping with reduced motion, alongside the existing interaction checks. The initial animation assertion sampled before the browser rendered; capturing a starting frame before measuring resolved the check without changing the implementation. The old preview server also required replacement after the environment restart. `git diff --check` passed.

Updated real browser screenshots: [360px](../samples/hero-atmosphere-360.png), [393px](../samples/hero-atmosphere-393.png), [412px](../samples/hero-atmosphere-412.png). [Browser results](../samples/hero-atmosphere-checks.json). Still uncommitted on `design/hero-detail-dossier`; no merge or deployment performed.


## Release 0.164.0

The owner accepted the animated portrait scenery and requested the version bump and merge. Implementation was saved in `004f9e6a`. Main had advanced to 0.163.0 with combat animation polish; it was integrated in `27953041`, preserving all incoming renderer changes and resolving only the task-board conflict. Package and root lockfile versions are now 0.164.0.

Integration validation: typecheck and the release web build passed; incoming motion and no-flicker tests both passed. The complete 103-file suite and all three portrait browser checks passed on the final hero implementation before integration; the integration changed no hero UI source. No tests or assertions were skipped or loosened.

The release is submitted through a pull request to main, as authorised. The main-branch Pages workflow builds, tests and publishes after merge. The earlier “uncommitted” and “no merge authorised” handoff entries above describe their earlier review stage and are superseded by this release authorisation.
