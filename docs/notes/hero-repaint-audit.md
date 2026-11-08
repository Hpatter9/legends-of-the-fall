# Hero repaint face audit

This records the initial audit, before implementation. The owner subsequently approved [complete remakes](hero-sprite-remakes.md) of all ten automatic repaints; that handoff describes the current assets.

Audit only, requested by the owner; no production sprites or code changed. Owner: Codex. Branch: `audit/hero-repaint-faces`; worktree: `/workspace/legends-of-the-fall`. Completion: identify the repaint set, inspect current frame contact sheets and show comparisons before repairs.

## History and scope

Twelve heroes are in `HERO_LOOKS`. Ten still use automatic skin repainting: Fire Wizard, Cleric, Ranger, Illusionist, Buccaneer, Time Witch, Queen Dragoon, Great Sage, Peasant and Lightning Mage. Knight and Paladin now use plain versions of their awakened artwork, already drawn in their tones; the bundled tone copies equal those plain sheets.

The original pass shipped in 0.227.0 (`9f5f0066`). Its narrow mask left pale highlights and warm shadows mixed into the new skin colours. The cleanup in 0.329.0 (`b6462042`) expanded the mask, but conspicuous pale facial pixels remain. See [the earlier diagnosis](heritage-faces.md). Historical comparison caveat: `tools/heritage/faces.py` currently sets `OLD_COMMIT` to `HEAD`, so its middle column is mislabelled as 0.227.0. This audit compares actual current assets with their current source assets.

## Current findings

Frame numbers are one-based. These are enlarged asset inspections, not browser screenshots.

| Hero | Finding | Repair priority |
| --- | --- | --- |
| Selam / Cleric | Pale patch below the visible eye in walk frame 5 interrupts the deep face, making the sequence uneven. | High |
| Tiago / Buccaneer | Pale cheek/mouth specks, especially idle frame 3; uneven highlights in attack poses. Previous audit also records shirt-cuff tint spill. | High |
| Ravi / Fire Wizard | Pale cheek patch in walk frame 3 beside newly brown skin. | High |
| Luana / Illusionist | Face and eyes lose definition across idle/walk poses; primarily shading/contrast. | Medium |
| Adaeze / Time Witch | Features merge into the deep face under the hat; primarily shading/contrast. | Medium |
| Minh / Peasant | Pale mouth/chin region in walk frame 6; some is original expression/highlight, so needs careful feature-preserving review. | Medium |
| Tiziri / Queen Dragoon | Comparatively consistent in the current overview. Earlier audit records pale-mauve cheek leftovers in side-on attack; targeted follow-up, not a newly confirmed major defect. | Low |
| Inti / Ranger | Face comparatively consistent; earlier audit records a pink bow-hand knuckle, a separate hand detail. | Low |
| Malia / Lightning Mage | Face comparatively consistent, blue eyes and white hair distinct. | No major facial defect identified |
| Seydou / Great Sage | Face comparatively consistent, beard and eyes readable. | No major facial defect identified |
| Kwame / Knight; Karim / Paladin | Replacement plain artwork already uses intended skin. Current idle previews inspected; existing tests check replacement layout and copies. | Already replaced |

## Evidence and checks

- [Source/current face comparisons](../samples/hero-repaint-audit/comparisons.png): selected poses from eight heroes.
- [Cleric walk, source/current](../samples/hero-repaint-audit/cleric-walk.gif).
- Generated and inspected front-frame head/torso contact sheets for all ten automatic repaints and a rear-frame overview. Some raised-weapon/fallen poses extend beyond the head crops; this is not a complete runtime playback review.
- Pixel check: all twelve heroes' 24 source/repaint front/rear pairs preserve dimensions and alpha, covering 672 declared frames. Cleric's rear intentionally uses the unchanged source. This rules out repaint-induced transparency/sheet-size changes, not runtime timing defects.
- `npm test -- heritage-looks knight-sprite paladin-sprite`: seven tests passed.
- Build/typecheck and browser checks not run: executable code and production assets unchanged. No repairs, merge or deployment.

Recommended order: Cleric, Buccaneer, Fire Wizard; then Illusionist, Time Witch and Peasant. Preserve intended skin tones, eyes, mouths, outlines and expressions. Show corrected comparisons before changing production assets.
