# Trait badges

The owner asked for the party screen to show which synergies a party makes and how to set up a group better.

- `src/traitBadge.ts`: the one badge every screen draws. Origins are round, classes are shields; 24px (20px on the deploy chips and fight plates, which keep their sizes), 12px text in the body font, never bold, no motion.
- `src/traitColours.ts`: each trait's fill and ink, as steps of the Stone and Iron ramps. Unique within a kind, and every pair reads at 4.5:1 or better (`test/trait-badges.test.ts` checks both).
- `src/traitHelp.ts`: `raisedBy(picked, kind)` (which traits a hero would wake or lift a tier, for the "+" corner) and `pipsOf`.
- Party screen: a hero card shows its badges, with a "+" on a trait the hero would wake or raise given the picks so far (not shown when the party is full). The trait panel is one row per trait (active first): badge, name, pips toward the next tier, and the effect. It is capped at 108px and scrolls. Tap a badge anywhere to light the heroes that carry the trait and fade the rest; tap it again or tap anywhere else to clear. A long press on a card still opens the hero's details.
- Deploy chips (`.trait` in `main.ts`) and the fight's synergy column (`synergyView.ts`) use the same badge.
