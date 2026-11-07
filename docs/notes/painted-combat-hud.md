# Painted combat HUD — first working pass

Owner approved the ornate painted battle concept after choosing to retain the existing hero roster. This pass implements combat controls; subsequent popup, report and deployment/icon passes are linked below.

Branch: `design/painted-combat-hud`. Worktree: `/workspace/legends-of-the-fall`.

## Implementation

- Original painted brass-and-green-leather panel, brown leather skill inset, circular spell socket, portrait frame and ruby heart. Full sources live in `art-source/ui/painted-combat/`; `bash tools/painted-combat/import.sh` reproduces runtime crops with ImageMagick.
- `src/paintedCombat.css` applies the skin after the existing styles. The normal five-hero rows retain their established 46px height and 44px skill touch targets. Two-skill kits use two columns; three-skill kits retain all three, and parties over five keep the compact two-column HUD.
- `src/combatSkillArt.ts` supplies painted icons for the starting company's signature skills, plus healing and arcane artwork. Skills without a specific painting retain the existing effect-atlas icon. Hero faces reuse the game's painted crops.
- Health/resource fills, costs, cooldowns, skill sheets, ultimate readiness, Auto and tactic handlers remain live. Simulation, saves, roster and version unchanged.
- New PNGs are copied and precached by the existing `UI_FILES` build loop. Imported skill icons and heart are additionally bundled. Credits updated.
- Existing menu builder preserved; this pass does not introduce new menu components.

## Validation

Typecheck, web build and all 21 affected tests (`fight-hud`, `hud-faces`, `tactic-cycle`) passed. The browser pass completed 63 checks across 393×852, 360×780 and 412×915, with zero page errors or horizontal overflow. The five-hero skill controls retain 44px touch height. The space between the command bar and bottom panel measures 518px, 446px and 581px respectively. The hanging crest and spell orbs are separated.

The spell test initially clicked Rally, a whole-party spell that casts immediately; it now selects a tile-targeted starter spell for arm/cancel. No gameplay fix was needed.

Final evidence: `docs/samples/painted-combat-painted-<width>.png`, `painted-combat-skill-<width>.png`, `painted-combat-spell-armed-<width>.png`, `painted-combat-reduced-<width>.png`, `painted-combat-ten-hero-fixture-<width>.png`, and `painted-combat-checks-<width>.json`. Offline reload evidence is `painted-combat-offline-393.png`.

Browser tool: `node tools/battle-hud/shots.mjs painted-combat painted`. It verifies geometry, control interactions and reduced motion at 393×852, 360×780 and 412×915. Ten-hero screenshots use a labelled presentation fixture made from actual unit data; they do not claim a naturally played Calamity run. The 393px check additionally verifies asset caching and a real offline reload.

Baseline: `docs/samples/painted-combat-before-fight-393.png`, captured from this checkout before applying the skin. Generated concepts are design references, not browser evidence.

## Remaining work

The continued popup pass is documented in [painted battle popups](painted-battle-popups.md). Boss/cast banners and battle results are documented in [painted battle reports](painted-battle-reports.md). Deployment chrome and current skill coverage are completed in [deployment and combat icons](painted-deployment-icons.md). No merge, PR or deployment performed in this pass.
