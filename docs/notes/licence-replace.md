# Replacing the unknown-licence assets (LICENCE-REPLACE)

The store audit ([store-readiness.md](store-readiness.md)) found three sets of assets whose licence could not be confirmed. The owner's
answer was "Replace them".

## The eight recorded combat sounds: done

PR #150 had added eight recorded sounds as base64 in `src/render/combatAudioBank.ts` (99 KB), "given as CC0" with no source:

- sword and blunt hits;
- a shield block;
- a crit;
- a bowstring;
- an arrow hit;
- a death;
- an explosion.

They are removed. The first choice was a CC0 pack (Kenney, OpenGameArt), but neither site, nor GitHub, could be reached from the
build environment. So, as the director allowed, every one is now the game's own synthesis. Each cue that used a recording already had
its synthesised version written under it (the recording played instead when it had loaded). That version now always plays, original to
the game.

**Loudness.** Each synthesised cue was rendered both ways in Chromium (an `OfflineAudioContext` with the real `CueSynth`) and measured
on the EBU R128 meter (ffmpeg's `ebur128`, momentary maximum). These are one-shots of under a second, so the maximum 400 ms loudness
stands in for the -18 LUFS integrated measure the music uses. Each cue is then raised or lowered to its recording's loudness by
`SYNTH_LEVEL` in `audioProcessors.ts`, applied in `CueSynth.play`. Peaks are held to 1.5, under the master's limiter (the recordings
peaked at up to 1.22). After the change:

| Cue | Recorded | Synthesised now | Level |
| --- | --- | --- | --- |
| hitLight | -25.4 | -26.2 | x2.72 |
| hitSword | -19.7 | -20.1 | x1.82 |
| hitHeavy | -15.5 | -16.8 | x2.64 |
| hitBone | -18.8 | -20.3 | x3.87 |
| hitFist | -17.9 | -18.8 | x3.59 |
| hitSpear | -21.8 | -22.2 | x2.16 |
| crit | -14.9 | -16.6 | x1.24 (held by the peak) |
| block | -20.6 | -20.6 | x0.92 |
| bow | -23.1 | -23.7 | x3.02 |
| arrowHit | -28.4 | -28.2 | x1.45 |
| boom | -18.0 | -18.1 | x1.23 |
| fireBoom | -19.2 | -19.3 | x1.11 |
| deathBones | -19.7 | -20.2 | x2.95 |
| deathThud | -17.8 | -17.9 | x1.45 |
| deathStone | -18.0 | -18.4 | x2.11 |
| deathBlood | -18.7 | -19.4 | x2.57 |

All are within 1.7 dB of the recording. A few cues use random noise, so each render differs by a few tenths. The page's script is about
99 KB smaller.

**Credits.**
- CREDITS.md now says the effects are all synthesised, and why the recordings went.
- The Credits page drops the "Eight recorded combat sounds… unconfirmed" entry.
- `test/store-credits.test.ts` now checks that no recorded combat sounds are listed, the owner's changed requirement.

## The art: prompts written, waiting for the owner

[licence-replace-art-prompts.md](licence-replace-art-prompts.md) is one batch prompt for the 16 sheets, on `art/licence-replace`, with
ChatGPT opening the PR:

- batareya's six golems, the treant, the wraith and the decoy;
- whtdragon's wolves and wild dogs;
- Duchess's walking sheet and her fighting sheet, which holds the PixelLab headbutt and fall made from the old goat.

Each keeps its sheet's exact canvas and grid, so the swap is file for file. Duchess keeps her proportions and the points her three
costumes are drawn at.

When the PR lands, the builder will:
- copy the 16 files over the old ones and cut `goat-half.png` from the new `goat.png`;
- regenerate the reach table (`tools/emit-points/reach.py`);
- photograph each in place;
- take the "licence unconfirmed" marks off in CREDITS.md and on the Credits page, crediting the sheets as original art made for the game.

Not in this set: `hk_ghost.png` (the Wraith unit and the Assault's Grave Wraith). CREDITS.md never names a pack for it and the credits
builder did not flag it, but its credit line should be checked.
