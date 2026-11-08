# Painted mounted boss trophies

Owner-approved original generated art: `approved-proposal.png` establishes the carved dark oak shield, worn brass fittings, blank nameplate and candlelit painted materials.

Sources use three equal columns in reading order:

- `calamity.png` (two rows): Gorvak, Thorn Warden, Malphas, Hrungar, Vorgrath, Karnok.
- `champions-1.png` (two rows): Lich King, Oni King, Demon Lord, Sapphire Colossus, Forge Titan, Gorgon Queen.
- `champions-2.png` (three rows): Orc Warlord, Minotaur Champion, Nine-Tails, Bone Captain, Horned Ogre, Shaman King, empty locked mount; final two cells unused.

Run `python3 tools/trophies/import.py` to crop full cells, downsample to 256px WebP and rebuild the review contact sheet. The final sheet's dimensions do not divide evenly by three; rounded shared boundaries preserve every source pixel without gaps. No background removal or recolouring is applied. The charcoal surrounds deliberately remain part of each painting.

`src/trophyArt.ts` bundles all images into game.js, which is already offline cached. Locked entries use the empty mount. The legacy emoji data remains for compatibility, but the wall and details render paintings. Existing boss unlock and save rules are unchanged.
