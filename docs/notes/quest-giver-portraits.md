# Painted quest-giver portraits

Owner approved the Oswy, Mother Teal and Pim concept. Branch: `art/quest-giver-portraits`; worktree: `/workspace/legends-of-the-fall`.

Fifteen distinct painted portraits now serve the shared giver card and quest log. The five campaign/proving givers no longer borrow another person's face; the ten hero-tale tellers replace LPC portrait composites. Established hair, clothing, skin tones and occupational cues come from the original teller definitions. Portraits use the existing smooth painted rendering class.

Source sheets, the approved proposal, mapping and crop instructions are retained in `art-source/quest-givers/`. Run `python3 tools/quest-givers/import.py` to rebuild 256px portraits and the contact sheet (including 40px samples). All images are bundled as data URLs in existing offline-cached game.js. No extra runtime URL is introduced.

`tools/quest-givers/checks.mjs` injects controlled fixtures for the real quest card and log; fixtures are excluded from game.js. Each viewport checks fifteen distinct decoded painted portraits and card horizontal bounds, then the fifteen painted log rows. Screenshots are controlled fixtures, not a campaign playthrough.

Validation: typecheck and web build passed. Browser checks passed at 393×852, 360×780 and 412×915: all 45 giver-card captures, three log checks, fifteen distinct portraits, successful image decoding and no page or console errors. Results: `docs/samples/quest-givers/browser-results.json`. No simulation rules changed, so simulation tests were not required. Sources, credits, mappings and diff reviewed. No version change, push, merge or deployment.

[Contact sheet](../samples/quest-givers/contact.png) · [Oswy card](../samples/quest-givers/card-oswy-393.png).
