# ART-003 — Four adult seductress redesigns

Owner approved the four-panel proposal and requested implementation for all four heroes. Branch: `art/seductress-four`; worktree: `/workspace/legends-of-the-fall`.

Kitsune, Gorgon, Illusionist and Time Witch now use original generated costume redesigns in both front and rear sheets. Their existing IDs, statistics, skills, save keys, grade scales and four-direction mirroring are retained. Illusionist decoys automatically share the new art. Each facing retains four idle, eight walk/slither, four attack, four hurt, four death and four casting frames, with matched dimensions and hard alpha.

The final designs are more restrained than the approved concept after the image service rejected the first animation request. Kitsune has a crimson wrap dress and fox tail; Gorgon has gold/emerald armour and her serpent body; Illusionist has a fitted violet stage costume and mirror; Time Witch has an indigo gown and hourglass staff. The smaller game sprites simplify the concept's ornamental details.

`tools/seductress/pack.py` extracts and packs the generated sources without procedural costume painting. It selects intact source poses for clipped Kitsune/Illusionist idle headwear and repeats a rear Kitsune casting pose where the final source pose turns forward. The packing report records those selections. Raw intermediates remain ignored locally; source hashes, packing tool, credits, concept and review evidence are retained. See `tools/seductress/README.md` for the brief and commands.

Validation: typecheck, web build and the three affected test files (`resonance-facing`, `hero-art`, `hero-kits-looks`) passed. Existing asset validation passed 2,800 cells across 50 front/rear pairs: bounds, hard alpha, eight distinct walking frames and no outstanding final death-silhouette reviews. All four front animation contact sheets were inspected. Browser checks passed at 393×852, 360×780 and 412×915 with four portraits and 160 facing/walk-frame checks at each size, no page/console errors, reduced motion, and offline reload at 393. Results are in `docs/samples/seductress/browser/checks.json`; phone portrait, battle, party and reduced-motion screenshots are saved alongside it. Offline reload is checked at 393 pixels. Real-phone performance is unmeasured.

No merge, version bump or deployment performed. Changes are ready for owner review.
