# Calamity overland map replacement — visual proposal

Owner: current Codex chat. Branch: `design/calamity-overland`, based on the new Calamity rules and new altar artwork.

The owner rejected the old floating-island map and explicitly requested an entirely new visual style. The replacement proposal is a hand-painted continuous cursed valley: forests, roads, water, ruined settlements and increasingly corrupted highlands, ending at a looming citadel. An emerald-and-gold header and encounter panel match the new altar direction.

Original generated art is saved in `src/art/calmap-overland/`: the 1024×1536 landscape, a 1254×1254 transparent atlas with nine landmark types, measured frames and provenance. Source images remain unchanged and originals are retained in `/workspace/generated_images`. Credits are recorded.

The separate interactive prototype is `docs/samples/calamity-overland/proposal.html`. It uses the actual first-region graph from a seed-14 new Calamity run, saved as `route.json`, with new landscape positions, curved roads, landmark selection, available/unreached styling, a gold party standard and a persistent encounter panel. Travel in this visual prototype simulates completing a location to demonstrate movement and newly available routes; it does not run battles or write game saves. Production integration must use the simulation's travel/encounter callbacks instead.

The browser-rendered proposal passed at 393×852, 360×780 and 412×915: no page errors or horizontal overflow, travel action visible, selection and simulated travel functioning, unreached travel disabled. Preview rendering embedded the fixed local image/font assets, blocked network requests and used no server. Reduced motion is supported. Screenshots are saved beside the prototype.

AGENTS.md requires: “For visual work, show a visual proposal and confirm the direction before substantial implementation.” An asynchronous visual-direction question is pending. The production map renderer and simulation have not been changed. After confirmation, replace the floating-island renderer, retain route/save compatibility and the three-region structure, provide appropriate later-region art, bundle/copy all new loaded assets for offline support, and run typecheck/build, affected simulation tests and the three portrait checks.

Typecheck and web build passed. Simulation tests were not rerun because production simulation and rendering code are unchanged.

No version bump, merge or deployment.

**Removed (CAL-SANCTUARY integration):** the owner chose the Rift Sanctuary over this proposal and asked for its unused art to go. `src/art/calmap-overland/`, the interactive `proposal.html` and its `route.json` were deleted; the screenshots stay here as design history, and git history keeps the rest.
