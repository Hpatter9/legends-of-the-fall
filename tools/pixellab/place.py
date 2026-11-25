"""Lays each picked icons.py candidate where the game loads it (PIXELLAB-ART). The picks are made by eye on candidates.py's board; a
missing candidate is skipped and said.

  python3 tools/pixellab/place.py
"""
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PICKS = {
    # id: (candidate, where it goes)
    'council_hunt': ('cand03', 'src/art/council/hunt.png'),
    'council_plot': ('cand00', 'src/art/council/plot.png'),
    'council_spared': ('cand01', 'src/art/council/spared.png'),
    'hunted_mark': ('cand00', 'src/art/nemesis-traits/hunted.png'),
    'temper_brute': ('cand01', 'src/art/nemesis-traits/temper-brute.png'),
    'temper_schemer': ('cand02', 'src/art/nemesis-traits/temper-schemer.png'),
    'temper_glory': ('cand00', 'src/art/nemesis-traits/temper-glory.png'),
    'temper_coward': ('cand02', 'src/art/nemesis-traits/temper-coward.png'),
    'temper_zealot': ('cand00', 'src/art/nemesis-traits/temper-zealot.png'),
    'temper_oathbound': ('cand00', 'src/art/nemesis-traits/temper-oathbound.png'),
    'temper_trickster': ('cand00', 'src/art/nemesis-traits/temper-trickster.png'),
    'temper_veteran': ('cand01', 'src/art/nemesis-traits/temper-veteran.png'),
    'weak_dread': ('cand02', 'src/art/nemesis-traits/weak-dread.png'),
    'weak_fire': ('cand00', 'src/art/nemesis-traits/weak-fire.png'),
    'weak_frost': ('cand01', 'src/art/nemesis-traits/weak-frost.png'),
    'weak_storm': ('cand02', 'src/art/nemesis-traits/weak-storm.png'),
    'weak_venom': ('cand02', 'src/art/nemesis-traits/weak-venom.png'),
    'weak_heights': ('cand02', 'src/art/nemesis-traits/weak-heights.png'),
    'weak_glutton': ('cand01', 'src/art/nemesis-traits/weak-glutton.png'),
    'weak_craven': ('cand00', 'src/art/nemesis-traits/weak-craven.png'),
    'weak_vain': ('cand03', 'src/art/nemesis-traits/weak-vain.png'),
    'calmap_floor': ('cand00', 'src/art/calmap-dungeon/floor.png'),
    'calmap_walltop': ('cand00', 'src/art/calmap-dungeon/walltop.png'),
    'quest_duchess': ('cand00', 'src/art/quests/duchess-face.png'),
    'quest_spoils': ('cand00', 'src/art/quests/spoils-face.png'),
    'quest_rift': ('cand03', 'src/art/quests/rift-face.png'),
}

if __name__ == '__main__':
    for i, (cand, dest) in PICKS.items():
        src = os.path.join(ROOT, 'art-source/pixellab/icons', i, cand + '.png')
        if not os.path.exists(src):
            print('not yet:', i); continue
        Image.open(src).convert('RGBA').save(os.path.join(ROOT, dest), optimize=True)
    print('placed')
