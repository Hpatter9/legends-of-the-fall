# Sprite-matched Calamity herald portraits

The owner approved the three-character proposal (`proposal.png`): Gorvak, Thorn Warden and Malphas. `final-three.png` completes Hrungar, Vorgrath and Karnok in the same style. The six idle reference crops and labelled contact sheet are retained in `references/`, taken from the actual current sprite sheets without modifying them.

Identity mapping: Gorvak is the horned iron-armoured orc warlord; Thorn Warden is the muscular green forest beast with violet/blue mushrooms; Malphas is the black-armoured winged demon knight; Hrungar is the horned brown ogre; Vorgrath is the lean red devil in dark teal armour; Karnok is the boar-headed warlord in green armour. Trophy lore supplements the sprite references but does not replace them.

`python3 tools/herald-art/import.py` crops each of the three equal panels per sheet and exports six 512px WebP busts plus six 256px upper head/shoulder crops. Sources use charcoal backgrounds matching the other painted portraits. All files are bundled into offline-cached game.js.

Paintings appear in the standard boss introduction card and discovered herald codex entries. Other bosses retain their sprite art; unknown codex heralds retain their concealed sprite presentation. Cinematic scenes, battle sheets, statistics and boss rules remain unchanged.
