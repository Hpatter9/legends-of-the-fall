# Ornate altar sanctuary — visual proposal

Branch: `design/altar-sanctuary`, based on the implemented starter-led Calamity run. Owner: current Codex chat.

The owner's requested direction is flashy, exciting and ornate, keeping the game's established UI. The proposal uses the existing gilded emerald/brass frame, castle shrine and relic icons. It retains the three altar slots and patron choices, shows the starter's growth, and pairs gold consecration with crimson corruption. Planned presentation includes shrine glow, floating sigils, drifting sparks and a ritual burst, with reduced-motion support.

The proposal is separate from the production game: `docs/samples/altar-sanctuary/proposal.html`. Browser-rendered screenshots are `proposal-393.png`, `proposal-360.png` and `proposal-412.png` in that directory. Those are concept screens, not screenshots of an integrated game change.

The prototype rendered at 393×852, 360×780 and 412×915 with no page errors, no horizontal overflow and both ritual actions inside the viewport. Rendering used a fixed list of embedded local art/fonts, blocked network requests and no server. Automatic approval review rejected the initial preview server because of its listening scope; the offline render succeeded. The production game files, simulation rules, save format and asset inventory are unchanged. No runtime build or simulation tests were needed for this proposal-only change.

Visual review is pending under AGENTS.md: “For visual work, show a visual proposal and confirm the direction before substantial implementation.” After confirmation, integrate into `TowerView.altarCard`, scope styling to the altar screen, keep simulation calls unchanged, and verify every altar step, review/reforge states, keyboard navigation, reduced motion, portrait sizes and offline reload. Run typecheck, build and affected checks then.

No merge, version bump or deployment.
