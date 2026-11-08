# Council and manuscript integration

`manuscript.png` is the owner-approved original OpenAI-generated painted Lost Techniques proposal. It becomes a 256px quest portrait. The shared quest face helper continues to show a speaking hero's own portrait when the quest has a `hero`; only anonymous Lost Techniques use this manuscript.

Council source art remains in `art-source/expansion/nemesis-icons.png` with its original credits. `python3 tools/council-art/import.py` imports unchanged 128px cells and builds a 24px preview. Cell indices are absolute in a 12-column grid; the last two cells of row 2 are blank, so the third row starts at index 24.

News events use indices: slain 0; recruit 12; promotion 13; feud 14; betrayal 15; feast 16; trial 17; oath 18; desertion 19; fled 20; cheated death 21; humiliated 24; vengeance 25; reclaimed 26; duel 28. The War Trophy token is 29. Unrelated traits, the return/fist symbol at 27 and shield overlay at 30 are outside this pass.

Claim/crowned reuse the already commissioned warchief badge; named and muster reuse the painted Book of Names and war drum. Their own labels continue to distinguish events. No new art is generated for these existing icons. Pixel icons retain nearest-neighbour rendering; painted relics and manuscript use smooth sampling. All images are bundled into existing offline-cached game.js.
