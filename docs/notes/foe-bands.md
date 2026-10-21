## Foe bands

Five bands of foes a fight can meet, on top of the skeletons: werewolves, minotaurs, gorgons, satyrs and a mixed band.
The heroes and the board are unchanged.

**The data** (`src/sim/foes.ts`): `FOES` holds the new foe kinds, one per sprite (three werewolves, three minotaurs,
three gorgons, three satyrs). Each kind's stats come from its role: werewolves are fast (`moveMs` 380, jump 3);
minotaurs are tanky and heavy (hp 360, def 9, slow blows); gorgons shoot from range 4 with `shot: 'bone'`;
satyrs are middling melee. `FOE_BANDS` lists the five foes of each band by id. The skeleton band moved here
from `units.ts` as `FOE_BANDS.skeletons`, unchanged. `units.ts` spreads `FOES` into `UNITS`.

**The sprites** (`src/render/sheets.ts`): each sheet's `scale` is set so `figure * scale` is about 46 px, the height of
the skeletons, so every foe stands about as tall as the others.

**The fight**: `startBattle(seed, band = 'skeletons')` deploys the band's foes; the default keeps existing fights
the same. The page (`src/main.ts`) picks the band from `?band=`, which holds for the visit; otherwise each New board
takes the next band in turn.

**Balance** (`readyBattle` with all five heroes, seeds 1 to 40; the heroes' win rate):

| Band | Heroes win |
| --- | --- |
| skeletons | 26 of 40 (65%) |
| werewolves | 26 of 40 (65%) |
| minotaurs | 21 of 40 (52.5%) |
| gorgons | 30 of 40 (75%) |
| satyrs | 23 of 40 (57.5%) |
| mixed | 32 of 40 (80%) |

The test asserts 20 to 80% for each band. `mixed` sits on the upper edge; it was tuned once by swapping one of its
foes, and the stats were only nudged a few times, so these numbers are not tuned finely.
