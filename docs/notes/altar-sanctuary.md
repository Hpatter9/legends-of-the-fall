# Ornate altar sanctuary — visual proposal

Branch: `design/altar-sanctuary`, based on the implemented starter-led Calamity run. Owner: current Codex chat.

The owner's requested direction is flashy, exciting and ornate, keeping the game's established UI. The proposal uses the existing gilded emerald/brass frame, castle shrine and relic icons. It retains the three altar slots and patron choices, shows the starter's growth, and pairs gold consecration with crimson corruption. Planned presentation includes shrine glow, floating sigils, drifting sparks and a ritual burst, with reduced-motion support.

The proposal is separate from the production game: `docs/samples/altar-sanctuary/proposal.html`. Browser-rendered screenshots are `proposal-393.png`, `proposal-360.png` and `proposal-412.png` in that directory. Those are concept screens, not screenshots of an integrated game change.

The prototype rendered at 393×852, 360×780 and 412×915 with no page errors, no horizontal overflow and both ritual actions inside the viewport. Rendering used a fixed list of embedded local art/fonts, blocked network requests and no server. Automatic approval review rejected the initial preview server because of its listening scope; the offline render succeeded. The production game files, simulation rules, save format and asset inventory are unchanged. No runtime build or simulation tests were needed for this proposal-only change.

Visual review is pending under AGENTS.md: “For visual work, show a visual proposal and confirm the direction before substantial implementation.” After confirmation, integrate into `TowerView.altarCard`, scope styling to the altar screen, keep simulation calls unchanged, and verify every altar step, review/reforge states, keyboard navigation, reduced motion, portrait sizes and offline reload. Run typecheck, build and affected checks then.

No merge, version bump or deployment.

## New assets requested by the owner

Generated a new transparent patron atlas and matching portrait sanctuary backdrop. The atlas holds nine motifs: three complete patron altars, three crests, a shared pedestal and two ritual seals. The measured source dimensions are 1254×1254 (RGBA, with true transparency) and 1024×1536 (RGB). `src/art/altar/manifest.json` records unequal row heights so callers can display each asset cleanly without assuming an exact uniform grid. PNGs are copied unchanged and original generation files remain in `/workspace/generated_images`; provenance and credits are recorded.

`docs/samples/altar-sanctuary/generated-assets-preview.html` is a separate prototype using the new background, altar and crest art. It renders the atlas through view boxes without modifying its pixels. The existing proposal and production UI are preserved.

New-art preview checks passed at 393×852, 360×780 and 412×915: no page errors or horizontal overflow; both ritual buttons remained visible; every patron selection and the corruption preview responded. Typecheck and web build passed. No simulation rules changed, so simulation tests were not rerun. Generated images are not yet imported by production UI; integration must bundle them or explicitly cache any URL-loaded assets for offline play.
