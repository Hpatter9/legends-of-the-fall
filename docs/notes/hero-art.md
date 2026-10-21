# Hero and foe art (PixelLab), phase 1 samples

Samples of AI-generated side-view pixel art meant to replace the paper-doll class heroes and foes.
Comparison: docs/samples/hero-art-phase1.png (Paladin, Warlock, Orc Grunt, then Knight, Samurai,
Fire Wizard, Werewolf at in-game scale; new figures scaled so figure*scale is about 46).

Method: /generate-with-style-v2 with Craftpix frames (Knight, Fire Wizard idle, padded to 80x80) as
style references returns 9 candidates; one is picked, then /animate-with-text-v3 makes idle (4+1 frames),
walk (8+1) and attack (6+1) from it, transparent background.
Generations: balance 4189.75 before, 3922.75 after.
