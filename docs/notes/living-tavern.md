# Living tavern

Owner approved the natural bar/table/hearth concept, then requested gentle animation and individual hero activities rather than two shared pose templates. Branch `design/living-tavern`, workspace `/workspace/legends-of-the-fall`. No merge, deployment or version bump authorised.

The strongest-five selection still uses dossier Power. Each of the 54 heroes now has an individual activity specification (`src/render/tavernActivities.json`); source briefs and hero identities are recorded in `art-source/tavern/living/activities.json`. Activities include music, games, meals, meditation, prayer, reading, gear maintenance, companion care and personal crafts. `tavernPlaces` assigns five distinct gathering places, favouring a hero's preferred place and the two sides of the games table, with stable ties. Images remain individually tappable and refreshes reuse their nodes.

The approved concept and new empty room, separate keeper and table layers are retained under `art-source/tavern/living/`. `python tools/tavern/living-pack.py` exports padded 384×440 activity cutouts and prop layers, then imports the room. Original seated sheets remain archived and unmodified. Earlier two-template studies generated during this chat were superseded by the owner's clarification and are not used.

Motion is subtle CSS breathing, conversation/listening leans, musical sway and sleeping rhythm, with staggered phases, dice, steam and warm hearth light. These are gentle movements of painted layers, not fully articulated frame-by-frame arm animations. Motion pauses via the home scene lifecycle and document visibility. Reduced motion removes animations and steam; battery saver pauses motion. Gwen's painting opens her existing dialogue. Existing hero management and service panels are retained.

Validation complete: `npm run typecheck`, `npm run web`, and all 30 tests from `npm test -- tavern-company power ui-standard` passed. `living-review.py` validated all 54 unique exports for dimensions and transparent padding. All 82 browser checks passed at 393×852, 360×780 and 412×915: all five guest taps and Gwen, full roster and services, changing strengths and fewer owned heroes, all artwork decoding/precaching, real motion advancing and pause/resume, reduced motion at 412, offline reload at 393, no errors or horizontal overflow. The two reused painted dice also appear in the generated offline cache. All three portrait screenshots, the creature composition and full 54-hero contact sheet were visually reviewed.

Actual app screenshots are `docs/samples/living-tavern-{393,360,412}.png`, plus the creature/services views. `docs/samples/living-tavern-activities.jpg` shows all individual activities. `docs/samples/living-tavern-motion.webm` records the implemented scene with an isolated sample save. These are implementation captures, not the original concept or the owner's live save.

Limitations: one bespoke activity illustration per hero, animated through subtle painted-layer movement and ambient effects; fully articulated hand/face frame animation is not included. Battery-saver pause and resume were also exercised through the real Settings control. Original armchair sources remain archived. Ready for owner review; no merge, deployment or version bump.

## Review preparation

User requested continuing after implementation. Committed the revision and integrated main through `dd312e0c` (0.394.0) into the feature branch, retaining both sides of the credits and task-board additions. No production code conflicts. Typecheck/build and the 30 focused tests pass on the integrated build. All 82 repeated three-size browser checks pass, including the added Settings battery-saver checks. Draft review: [PR #430](https://github.com/Hpatter9/legends-of-the-fall/pull/430); merge into main and deployment remain unrequested.

## Keeper placement and shadow correction

Owner's preview review found Gwen covering Ayame and rectangular shadows around the heroes. The character hit buttons inherited the global menu button box-shadow. Scene guest/keeper targets now explicitly clear button backgrounds, border images, shadows and filters in normal, hover and pressed states; intentional illustration silhouette shadows remain. Pressing a character also preserves its placement transform.

Gwen is positioned farther behind the counter, below the guest drawing order. A noninteractive clipped copy of the existing room image puts the actual bar in front of her lower body, while Ayame and other bar guests remain in front. No generated art or extra download is needed for the counter layer. Screenshots and the recording are refreshed.

Typecheck, production build and 13 focused tavern/menu tests passed. All 88 browser follow-up checks passed at all three portrait sizes, including offline, reduced motion, every guest/Gwen tap and Settings battery saver. All three refreshed screenshots were visually reviewed. New checks cover unframed/shadow-free character targets and keeper/counter/guest depth ordering at each phone size. One first-run reload waited past the default load-event timeout; reload now uses the same DOM-ready/app-ready approach as initial navigation and still requires every offline scene image to decode.

## Authorised release

Owner requested merging once wrapped up. Integrated main through `0d0b9790` (0.395.0), preserving the hero weapon/portrait repairs; no conflicts. Prepared 0.396.0 with matching player-facing Updates entry dated 2026-11-08. Final release validation passed: typecheck, production build, all 34 focused tavern/power/menu/update tests and all 36 repeated 393px browser checks, including corrected layering, shadow-free targets, battery saver and offline reload. The earlier 88-check three-size pass remains valid for the unchanged scene layout. Release PR #430 is owner-authorised for merge.
