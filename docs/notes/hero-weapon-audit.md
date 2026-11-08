# Painted hero weapon audit

Historical audit: the owner subsequently requested and authorised the [painted illustration repairs](hero-weapon-fixes.md), now implemented separately from the sprite findings below.

Owner: Codex. Branch: `audit/painted-hero-weapons`; worktree: `/workspace/legends-of-the-fall`. Scope: audit and evidence only. No production artwork or game code changed.

## Painted illustration follow-up

The owner clarified the target was the painted illustrations. The earlier contact-sheet screening missed issues; its absence of definite findings must not be treated as a clean bill of health. Production images remain unchanged.

Inspected 30 standard illustrations individually at source detail, concentrating on weapon users: Peasant, Queen Dragoon, Mercenary, Lancer, Knight, Arc Blade, Samurai, Samurai Commander, Demon Swordsman, Vampire Lord, Barbarian, Minotaur, Archer, Ranger, Falconer, Dhampir, Gunslinger, Harpooner, Buccaneer, Dread Pirate, Kraken, Sea Reaver, Inquisitor, Seraph, Banneret, Bell Warden, War Drummer, Reaper, Kunoichi and Karasu.

| Illustration | Finding / judgement |
| --- | --- |
| `peasant.webp` | High priority: long wooden spear visibly bows between the lower left end and upper right head. This is likely the spear user the owner recalled; the identity is not confirmed. |
| `mercenary.webp` | Blade and handle axes change at the guard; the blade also has a gently bowed profile. Clean up the entire sword as one coherent straight broadsword. Earlier statement that the blade was simply straight was too categorical. |
| `harpooner.webp` | High priority: the stowed harpoon shaft curves markedly around the body rather than reading as a rigid pole. |
| `samuraiCommander.webp` | High priority: exposed blade hangs diagonally from the waist with neither a visible scabbard nor a hand holding its grip. |
| `samurai.webp` | Secondary: two guard-like discs and the hand positions make the katana hilt construction ambiguous. The blade curve itself is appropriate for a katana. |
| `ranger.webp` | Secondary: upper bowstring is not visibly connected from the draw hand to the upper tip against the clear background; lower segment is present. |
| `lancer.webp` | No clear bent pole found in the painted illustration; do not transfer the separate sprite finding to this image. |

[Painted illustration crops](../samples/hero-weapon-audit/painted-findings.jpg), taken directly from source artwork; no corrections applied. Full-roster overview was already inspected in the first pass, but this detailed follow-up covers the 30 listed illustrations, not every anatomical detail of all 65.

## Earlier battle-sprite repair targets

Frame numbers are one-based; sheet row names come from `src/art/units/sheets.json`.

| Hero | Asset / frame | Finding |
| --- | --- | --- |
| Mercenary | `hero_res_mercenary.png`, attack frame 2 (physical row 4, column 2) | Overhead blade bows along its length, unlike the straight idle sword. Straighten the blade axis and keep the hilt, guard and tip aligned. Other thrust frames also change blade proportions; review the complete sequence when repairing. |
| Lancer | `hero_res_lancer.png`, idle frame 3 (physical row 1, column 3) | Spearhead points down across the horse while the visible rear shaft retains its rising diagonal. The segments do not convincingly form one rigid shaft. Redraw as one straight pole through the grip. |

[Enlarged source comparison](../samples/hero-weapon-audit/findings.png). This is an inspection montage of existing assets, not a correction proposal or browser screenshot.

## Broader review and limits

- Visually screened all 65 standard full illustrations and 65 awakened menu images in contact sheets. Standard Mercenary blade is straight; hilt/guard alignment could be cleaner. Standard Lancer spear appears straight. No additional definite malformed weapon was established in this overview pass.
- Screened eight representative front poses per sheet across 56 base `hero_res_*` sheets, including summon forms. This is sampling, not approval of every animation frame, every rear view, heritage variant or awakened sheet.
- Also inspected the complete front and rear sheets for Mercenary and Lancer. The two front frames above are the clearest repair targets.
- Curved cutlasses, katanas, bows and scythes were treated as intended designs, not automatically flagged as errors.
- The hero is named Lancer in the roster. `spearman` is the Skeleton Spearman enemy; whether the owner also meant that enemy remains unknown.

## Handoff

Recommended next step: prepare a visual correction proposal for the two confirmed frames, then repair matching front/rear and awakened poses as necessary after direction is confirmed under AGENTS.md. Preserve character identity, kit, sprite packing and offline assets.

Validation: inspected source images and frame metadata, and checked the documentation diff and evidence link. No runtime tests/build: executable code and production art are unchanged. No merge or deployment.

## Continued review — remaining 35 full paintings

After the owner asked to continue, inspected each remaining standard scene individually at source resolution: Astral Sphinx, Astrologer, Beastmaster, Blood Gargoyle, Bombardier, Cleric, Corsair Surgeon, Druid, Geomancer, Gorgon, Hemomancer, Illusionist, Juggernaut, Kitsune, Lightning Mage, Mirage Dancer, Mummy, Nightstalker, Ninja Monk, Paladin, Plague Doctor, Priestess, Rifle Bot, Great Sage, Satyr, Shambler, Siege Bot, Time Witch, Tyrant, Wanderer, Warlock, Werewolf, Fire Wizard, Wolf Bard and Yamabushi.

This completes individual inspection of all 65 standard full illustrations, across the earlier 30 and these 35. Checked visible weapon continuity, grip/support, limb and hand connections, and whether curves fit the weapon design. No additional definite weapon-construction defect was established in these remaining scenes. Gnarled wooden staffs, curved blades, flexible ropes and fantasy anatomy were treated as design choices where coherent. This is a visual judgement, not a guarantee that every small detail is flawless.

Also re-inspected the current second-pass Mercenary and Peasant full scenes. They remain the replacements described in [the repair handoff](hero-weapon-fixes.md). No further production assets changed in this continuation. This completion covers standard full scenes; detailed individual review of every menu cutout and awakened image is not claimed.

Validation for this continuation: documentation diff/link consistency and `git diff --check`; no runtime checks repeated because only audit notes and task status changed.
