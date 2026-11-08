# Cozy tavern hero paintings

Owner requested new hero paintings for the tavern, approximately two spots per hero, matching the cozy concept. This extends the completed, uncommitted `design/painted-tavern` implementation; existing work is preserved.

Proposal: two reusable inward-facing seated variants per hero, compatible with five room positions. Using only two fixed exclusive seats for each hero would risk collisions for arbitrary strongest-five combinations. Each hero instead gets a left-facing and right-facing resting painting that can occupy a compatible foreground or rear position. The room keeps two foreground armchairs and three rear seats, with shared tables layered separately. Every selected hero must remain seated exactly once and tappable; selection stays on existing dossier Power.

The first generated studies show Kwame with a mug in two relaxed poses, and Ravi reading/drinking tea. Existing character illustrations supplied the identity references; the approved green/brass tavern concept supplied the material and lighting reference. Chairs and personal props belong to each cutout. A separate five-hero room concept adds Kenji, Natsu and Ayame in relaxed poses, using their current character references. It illustrates composition; it is not an implemented screenshot or a runtime painting with fixed guests.

Sources retained:

- `art-source/tavern/pose-proposal/kwame-ravi-two-poses.png`: four transparent pose studies, two per hero. Production packing, edge padding and alpha review remain to be done.
- `art-source/tavern/pose-proposal/five-hero-room-concept.png`: integrated room concept, five distinct guests and cozy furniture.

The owner approved this proposal before the production pass below. The initial proposal changed no executable code; runtime tests were not rerun at that stage. Generated images, documentation and diff consistency were reviewed before production.

## Approved production and integration

Owner approved the proposal, requested building the scene then working on the UI, and confirmed continuing. Production is now implemented on the same branch, preserving the previous tavern work.

- Painted all 54 hero identities with two distinct inward-facing resting poses each: 108 transparent guest paintings, including their own chairs and personal props. Nine ordered source sheets, transparency corrections and Harrow's skeletal identity correction are retained. Existing battle sprites and roster illustrations are unchanged.
- Updated the empty room from the approved five-hero concept, preserving the perspective and cozy hearth. Added two painted table layers to sit in front of the rear guests and between the foreground chairs.
- `TAVERN_SEATS` assigns the strongest two guests to the foreground armchairs and the remaining three to the rear seats. Every hero has artwork for every compatible seat through its two pose variants, so arbitrary strongest-five combinations cannot compete for a fixed seat. Selection remains based on existing dossier Power and refreshes with the home screen. There is no random selection, simulation change or new save data.
- `tools/tavern/pack.py` reproduces the runtime cutouts, source-box manifest, alpha cleanup, consistent scale and padding. `tools/tavern/review.py` validates transparency/padding and renders nine labelled contact sheets; every source/result was visually reviewed. Runtime guest/table art totals approximately 7.5 MiB. All 110 WebPs and the room background are copied and precached by `build.mjs`.
- The subsequent UI pass adds accessible **Your heroes / Tavern services** tabs, preserving the existing full roster, hero sheets and service handlers. Tabs support arrows, Home and End with selected-state and panel relationships. Names remain available in the list and accessible button labels; only intentional hover/keyboard focus shows name chips over the room. Upgrade controls use the shared painted gold star, labelled per hero. Panels, controls and icons reuse #425's materials.

Validation: production build and typecheck pass; all five focused test files pass (`tavern-company`, power callers and `ui-standard`). Export validation passes for all 108 paintings. The browser pass before the final UI refinements passed all 49 checks at 393×852, 360×780 and 412×915, including reduced motion, offline, dynamic strength changes, fewer-than-five ownership, all 108 decoded/precached assets, five-seat creature composition, roster, dossiers and service interactions. The final UI pass passed all 55 browser checks at the three portrait sizes, including keyboard tab selection, services-panel visibility and the earlier interaction/art/offline coverage. Final human and creature compositions, both UI sections and the three phone sizes were visually reviewed. No page errors or horizontal overflow observed.

Actual implementation screenshots use isolated sample saves, not the owner's live heroes: `docs/samples/painted-tavern-{393,360,412}.png`, `painted-tavern-creatures-393.png` and `painted-tavern-services-393.png`. No merge, deployment or version change. No remaining known art coverage gap; future newly added heroes need two tavern paintings, and the coverage test will flag missing files.


## Authorised release

Owner requested merging. Integrated current main 0.390.0 (`60244c86`), resolving only duplicated build CSS and task-board context while retaining the tavern additions. Prepared release 0.391.0 with matching Updates entry. The existing Pages workflow publishes main; release validation and PR result follow.

Release validation passed on the integrated 0.391.0 build: typecheck, production web build and six focused test files (including release notes); all 21 fresh 393px release browser checks passed, with zero page errors, all 108 paintings decoded/precached and offline room/guest loading confirmed. Original three-size/reduced-motion coverage remains the 55-check pass above.

PR #426 reached main during release preparation, taking 0.391.0. Integrated `c0c9d244`, retaining all ten hero remakes and their release notes; only the competing Updates entry needed resolution. Tavern release advances to 0.392.0 under [PR #427](https://github.com/Hpatter9/legends-of-the-fall/pull/427).

Final 0.392.0 validation after integrating the hero remakes: typecheck and web build pass; all seven focused test files pass, including hero art and Updates; all 21 repeated release browser/offline checks pass with zero page errors. Release PR: [#427](https://github.com/Hpatter9/legends-of-the-fall/pull/427), owner-authorised for merge.
