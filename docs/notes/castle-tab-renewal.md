# Castle tab renewal

The owner requested the whole tab be redone after seeing the 0.439.0 hall update, specifically criticising the layout. This is a new full-page design task, beyond the previously approved hall.

## Current problems

- Tall courtyard with eleven densely labelled hotspots consumes most of the scroll before the hall appears.
- Separate Codex strip, page header, courtyard, bonuses header, six framed badges and hall heading repeat visual chrome.
- Building level, affordability and construction status are scattered across the picture; prominent unbuilt ghosts compete with completed buildings.
- The hall feels appended to the bottom rather than a central castle feature.

## Approved direction

A compact shared Keep header with rank and Codex/Trophies utilities, followed by two clear internal views: Throne Hall and Buildings. Keep the five global navigation tabs unchanged.

Throne Hall gives the live ruler, four guards and Duchess a prominent painted scene, then a compact construction status card and a restrained six-bonus summary. Buildings uses readable full-width upgrade rows: building image, name/level, concise current benefit and clear next-step status. A tap opens the standard ornate card. All eleven sites remain available; active work stays visible. No costs, levels, timings or save rules change.

A two-screen concept shows both views together. This is a visual proposal, not an implemented screenshot. Owner approved this concept and requested plenty of animation so the scene feels alive.

Concept retained at `art-source/castle-tab-renewal/layout-concept.png`. It proposes the entire tab hierarchy, not just hall artwork. The production implementation now follows this hierarchy and uses live game characters over the retained hall painting. Screenshots under `docs/samples/castle-tab-renewal/` show the implemented game, distinct from the concept.


## Implementation

- `src/castle.ts`: shared Keep header and rank bar; compact Codex (including claim badge) and Trophies utilities; accessible Throne Hall / Buildings tabs with arrow/Home/End navigation. The old tall courtyard and separate Codex strip are removed from the open tab.
- Hall: taller 800×540 canvas, with live character drawing and pointer coordinates sharing one floor offset. Ruler, four strongest heroes, trophy rack and Duchess remain interactive. Compact building-progress card and six-bonus table sit beneath the scene.
- Buildings: every one of the eleven sites has a full-width row showing its painting, name, level, benefit, next cost and status. Affordable, poor, unbuilt, maximum-level, currently building and builders-busy states use the existing rules. The whole row opens the standard ornate card before any crowns are spent. Built Chapels now open their upgrade card rather than leaving for the Spells tab.
- Art: twelve new opaque building/construction scene tiles, packed from `art-source/castle-tab-renewal/building-scenes.png` by `tools/castle-tab-renewal/pack.py`. Production files use the existing `castleArt` manifest, URL copy and service-worker cache. Building cards and completion popups pick up the paintings too. Existing pixel assets remain available to older callers.
- `src/castleTab.ts`: DOM-free presentation functions for order, benefits, build states and progress. It reads the existing simulation; no costs, build durations, upgrade effects or save keys change.
- `src/home.ts`: hook up the compact Codex, preserve claim badges, open Chapel upgrade cards and refresh resources after a Duchess treat.

## Animation

Two painted flame regions move independently, with animated fire strips, flickering warm light, rising embers and smoke. Both crimson banners sway; cool window light and drifting dust fill the side aisles. The ruler breathes, four guards idle and take turns making occasional salutes, and Duchess wanders, grazes, inspects guards, nests and hops when tapped. Building starts trigger the hall celebration; construction progress has a slow light sweep.

The hall stops painting continuous frames while the Buildings view is selected. Reduced motion holds flames, cloth, light, sprites and wandering still; deliberate taps still work. Battery saver uses the existing reduced ambient plan and suppresses automatic guard flourishes. Switching internal views clears a lingering hall speech bubble so it does not cover the ledger.

The retained eight-second browser recording, `docs/samples/castle-tab-renewal/hall-motion.webm`, shows actual implementation motion.

## Save repair

The old haystack reward wrote a separate parsed copy of the save while leaving the home screen's live meta unchanged. A later upgrade save could overwrite the daily treat or reward. The hall now updates its live meta and refreshes the resource header after persisting the reward. Browser coverage claims the treat, pays for a later Chapel upgrade and reloads offline, checking the daily claim survives both saves.

## Validation

- `npm run typecheck` and `npm run web` pass.
- `npm test -- castle rulers duchess rooms ui-standard ambient painted-buttons`: all 119 affected tests pass, including three new presentation regressions for site completeness, build states/affordability and correctly clamped progress (including Chapel timing).
- `node tools/castle-tab-renewal/checks.mjs`: portrait browser evidence at 393×852, 360×780 and 412×915 (last reduced motion). The script tests real visible motion versus a still reduced-motion canvas, ruler and guard taps, Duchess hop/treat, all eleven building cards, ticking construction timers, keyboard tabs, trophies and portrait fit. The 393px scenario additionally completes a build, checks poor/full/affordable states, pays for a built Chapel's next level, checks the treat is preserved, then reloads offline and decodes all building paintings.
- The old `node tools/castle/royal-hall-checks.mjs` entry point forwards to the replacement coverage. Older courtyard shot scripts remain historical tools for the retired layout.

Final three-size browser results and PR link are recorded on the task board before handoff. The owner authorised finishing and merging the Castle rework earlier in this chat, then corrected its scope to the whole tab and approved this full design. Main 0.440.0 was integrated cleanly, preserving the new Drill Yard and hold art. Release 0.442.0 is prepared with matching Updates and lock metadata; final release browser validation and the merge follow.


Final validation: all three portrait runs and visual reviews passed; the integrated 0.440.0 code passed typecheck/build and all 119 affected tests. The final 393px release run passed every interaction, build-state, paid-upgrade and offline test, with zero page errors. Its refreshed screenshots and recording were captured on the prepared 0.441.0 build. A concurrent documentation-only art-prompt release then took 0.441.0; its prompt edits and release note are preserved, and this Castle release is 0.442.0. Only documentation and release metadata changed after the browser pass; web build and release-note validation are repeated for the final version.
