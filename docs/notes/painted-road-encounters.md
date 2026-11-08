# Painted road encounters

Branch `art/road-encounters`, worktree `/workspace/legends-of-the-fall`, retaining the completed trait-art commit. Owner approved the Pale Lady / forge / caravan visual proposal; five further scenes follow that style.

Eight original 768×432 paintings now appear on the corresponding existing road event cards, mapped by stable EventKind. Compact panels retain the complete image and keep all existing text, option icons, labels, prices, disabled states and choice handlers. Unillustrated cards and post-choice Continue retain their prior presentation. Lady collection and refugee return receive no mismatched illustration. Illustrated cards use border-box sizing within the existing scroll container and options keep at least 44px height.

No simulation, event rewards, RNG, save fields or version changed. Paintings are bundled data URLs in already offline-cached game.js. Source sheets, importer, credits and contact sheet are retained. Review: [eight paintings](../samples/road-art/contact.png).

Typecheck and web build passed. Ten event tests and eight ornate-menu tests passed; an additional five existing army-road tests also ran and passed. Browser checks passed at 393×852, 360×780 and 412×915: all eight paintings decoded, labels/text/costs preserved, every option reachable with at least 44px height, leave/Continue working, insufficient-gold options disabled, follow-ups unillustrated and rendering left the run unchanged. No page or console errors. Results: `docs/samples/road-art/browser-results.json`. Fixtures use actual army road cards and the shipping Events component, checking all eight images at each phone size, labels/text/prices against the generated cards, option reachability, leave/Continue, insufficient-gold disabled states, follow-up fallback and unchanged run state while rendering. Fixtures are excluded from game.js and never saved.

No push, merge or deployment. Calamity herald portraits remain the next separate planned batch.
