# Battle command UI — UI-006

Owner: Codex. Branch: `design/battle-command-ui`. Worktree: `/workspace/legends-of-the-fall`.

The owner rejected the initial subtle deployment restyle, requested excitement and flair, then authorised implementing a restrained version of the ornate battle concept. This pass targets deployment and live combat, with final owner visual acceptance pending.

## Implementation

- Compact original crossed-sword/lion crest beneath the status bar, brass edging and an emerald stone command deck.
- Living company moved above spells, in existing brass portrait frames with clear green health bars. Wider parties scroll horizontally.
- Larger spell icons with distinct warm, green and icy accents; mana reservoir, armed state and dim/cooldown treatment retain real gameplay state.
- Deployment cards and Fight action use matching materials. Other screens, simulation, saves and targeting handlers are unchanged.
- `src/battleCommand.css` loads after the shared Keep & Kingdom theme. Existing art is reused except the credited transparent crest. The build automatically copies every UI PNG and includes it in the service-worker cache list, including `ui/battle-crest.png`.

## Review and verification

- `npm run typecheck` passed.
- `npm run web` passed, including the final crest asset; cache-list inclusion inspected.
- `tools/battle-ui/command-shots.mjs` captures real built-game deployment/live combat/reduced-motion screenshots at 393×852, 360×780 and 412×915. The helper uses Playwright request routing for local build files rather than an HTTP listener, and the installed Chromium.
- Browser interaction results are in `docs/samples/battle-command-checks.json`: spell sizing, horizontal page overflow, spell arming/cancellation, drag preview and real cast, plus page errors.
- Simulation tests were not run: this change contains styling/art and build concatenation only. Full service-worker offline reload is not exercised by the route-served browser helper.

Screenshots: `docs/samples/battle-command-live-{393,360,412}.png`, with corresponding deployment/reduced-motion and cooldown evidence. Early `battle-command-proposal.png` is the rejected proposal, retained separately from the implementation.

Browser checks passed at all three sizes: no page errors or horizontal page overflow; spell arming, cancellation, drag preview and casting passed. Live combat and reduced-motion captures inspected. A random cutscene obscured the initial 360px deployment capture; that capture was repeated after skipping the scene.

Owner accepted the live battle treatment and authorised merging on 2026-10-28. Integrated main 0.175.0, preserving manual ultimate rings/resource bars/Auto controls; release version 0.179.0. Release validation and PR merge recorded below.

Release integration: main advanced to 0.178.0 while PR #143 was prepared. Integrated those changes, preserving XP tomes, chest actions and renderer updates; resolved only version conflicts. Final release is 0.179.0. Three-size live-browser spell and Auto checks passed; initial browser rerun was interrupted by a random cinematic, so the review helper now disables cinematics explicitly. Casting checks hold the simulation still and verify both mana spend and cooldown.
