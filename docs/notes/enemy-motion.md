# Enemy idle and recoil expansion

Owner approved the Orc Grunt motion proposal. Branch: `art/enemy-motion`, based on the completed gear-art branch.

Nine existing sheets now have a four-frame breathing loop and three dedicated hurt poses: Orc Grunt, Orc Archer, Orc Brute,
Orc Warlord, Demon, Demon Lord, Imp, Ogre and Horned Ogre. The idle loop takes 1.2 seconds and is staggered by unit ID.
Reduced motion holds its standing pose. Existing action and recoil timing is unchanged; a hurt reaction lasts the existing
240ms. Other characters keep their existing idle timing.

The approved style was extended using each original idle figure as the reference. The packer uses a single scale per character,
nearest-neighbour sampling, hard alpha and colours from the original sheet. Feet retain their original baseline. Small amounts
of transparent padding were added where required, with original figure heights and simulation scales unchanged.

Original walk, attack and death pixels are preserved exactly, verified by the packer after padding. All previous physical rows
remain in their original order, and hurt is appended. No stats, AI, save keys, simulation rules, offline loading paths or version
changed. The original nine sheets and their layouts are retained in `art-source/enemy-motion/originals/`; generated clips and
reference crops are retained alongside them. Original asset credits still apply.

## Reproduction and checks

- `python3 tools/enemy-motion/pack.py`: rebuilds the sheets, verifies original action pixels, writes the packing report and contact sheet.
- `python3 tools/enemy-motion/preview.py`: assembles the preview from shipping sprites at their battle proportions.
- `npm run typecheck` and `npm run web`: passed.
- `npm test -- enemy-motion motion hero-art summon-art no-flicker`: all 12 tests passed, no skips.
- `node tools/enemy-motion/checks.mjs`: all four browser cases passed, at 393×852, 360×780, 412×915, and reduced motion at 393×852.

The browser fixture uses actual unit sprites on a controlled board. It samples all four idle frames and all three hurt frames,
checks that textures stay on one loaded source, checks visibility, verifies that reduced motion holds the idle, and compares
battle state before and after rendering. No page or console errors were recorded. The screenshot fixture's missing terrain
decoration field was corrected during validation; no shipping terrain code changed. These are controlled renderer checks,
not a full campaign playthrough. No full test suite or balance sweep was required.

[Animation preview](../samples/enemy-motion/roster-motion.gif) · [Original/new contact sheet](../samples/enemy-motion/contact.png) ·
[Battle idle](../samples/enemy-motion/idle-393.png) · [Battle recoil](../samples/enemy-motion/hurt-393.png) ·
[Browser results](../samples/enemy-motion/browser-results.json).

## Handoff

Complete locally; no merge, push, deployment or version bump. The preceding gear-art commit is included in this branch.
The three campfire travellers remain the next art pass. Treant hurt clips, older unused class sheets, expedition pennants,
provisions art and richer painted spell sequences remain separate backlog work.
