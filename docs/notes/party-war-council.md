# Party war council

UI-005, owner Codex, branch `design/party-war-council`. The owner approved the cinematic direction and authorised implementation. The owner accepted the implementation and authorised the version bump and merge.

## Implemented

The party picker now shows its actual selected heroes together in attack poses, surrounded by a monster horde, frozen weapon sweeps and class-appropriate spell effects. A storm-lit ruin backdrop, existing brass frame, green pennants, class lighting and gently drifting embers surround the scene. The static tableau recomposes only when the selected party changes; searching or filtering does not replace it. A compact company roll connects each hero to its scene silhouette with numbered diamond seals and engraved nameplates, without repeating the portraits. Tapping removes a hero; holding opens their dossier. Three-hero starter parties and empty drafts have their own valid states.

Role coverage and a collapsible trait panel use the existing `roleOf` and `countTraits` rules. Reinforcements have search, role filters, chosen indicators and existing hero dossiers. Unknown locked hero names stay hidden during search. The battle/save action remains visible while the content scrolls, and reopening the picker starts at the scene. Back discards the draft; saving commits through the original party rules.

Changed runtime files: `src/party.ts`, new `src/partyScene.ts`, party markup in `src/index.html`, and scoped styles in `src/keepKingdom.css`. Existing sprites, effect strips, scenery and frame art retain their credits. All scene URL assets are already in the service worker cache list; sprites/effects are bundled. No simulation, save format, version or asset-credit changes. The implemented art is the game's pixel sprites, rather than the painted figures in the generated concept.

## Validation

- `npm run typecheck` and `npm run web`: passed.
- `npm test -- party suggest traits no-flicker`: 20 tests passed across four affected files. No full suite or unrelated balance sweeps.
- Chromium checks at 393×852, 360×780 and 412×915: party changes, full/incomplete button state, search/no results, role filtering, auto-pick, expandable bonds, discard/save and callback, starter/empty party states, no horizontal overflow, reduced motion, and no page errors.
- All 45 available heroes rendered in tableau drafts; locked hero dossiers still open. The tableau's image remains identical across idle frames and changes when the party changes. This verifies the static scene surface, not every possible GPU/device condition.
- Existing offline cache entries verified for the brass frame, ruins and warcamp scenery; no new resource URLs. This is a cache-list check, not a new full offline playthrough.
- `git diff --check` passed. Reproducible browser checks: `python tools/ui/party-cinematic-check.py` with the built game served on port 8000 (or use `--url` / `--chromium`).

Actual browser screenshots: [393px scene](../samples/party-cinematic-393.png), [360px](../samples/party-cinematic-360.png), [412px](../samples/party-cinematic-412.png), [reinforcements](../samples/party-cinematic-roster-393.png).

## Proposal history and owner requirements

The owner rejected the [initial browser concept](../samples/party-war-council-concept-393.png) as insufficiently flashy or ornate, then approved the [generated cinematic concept](../samples/party-cinematic-concept.png): five heroes fighting a creature horde in distinct action poses. The generated concept is art direction, not a screenshot of implemented gameplay. [Original picker](../samples/party-before-393.png).

Intentional flashy effects are allowed; ‘no flashing’ means textures disappearing completely or glitching off and on. Reduced-motion support remains. Test only affected behaviour and callers; full suites are not required. These requirements are recorded in `AGENTS.md`, `CLAUDE.md` and the task board.

## Company roll refinement

The owner found the selected portrait row redundant beneath the scene and authorised a simpler or more ornate treatment at our discretion. Replaced the portrait mini-cards with one compact brass-lined company roll: numbered diamond seals, hero names, small remove marks, and matching empty recruitment places. Existing tap-to-remove and hold-for-details controls are retained. The row is about 29px shorter, giving reinforcements more room without shrinking touch targets below its 53px height. No new art, rules or saved fields.

Refinement validation: typecheck and web build passed; all eight party tests passed. The browser check now asserts the company roll has no duplicate canvases and that holding a selected name opens details without removing it. Updated screenshots cover all three required portrait sizes.

## Release 0.166.0

The owner requested the version bump and merge. Implementation was preserved in `60043cc2`. Main 0.165.0 adds the Summoning Sanctum; it is integrated with all incoming runtime changes retained. Only `docs/TASKS.md` needed conflict resolution; both handoffs are retained. The party task is now UI-005 because incoming main uses UI-004 for the sanctum. Earlier proposal references to UI-004 describe the pre-integration assignment.

Package and root lockfile versions are bumped to 0.166.0 for this release. Release integration validation and GitHub merge are in progress.
