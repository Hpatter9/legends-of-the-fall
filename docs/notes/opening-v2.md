# The opening, version 2 ("The Road Begins")

The opening (`opening` in `src/sim/sceneScripts.ts`) is rebuilt from the owner's revised spec. Id, music (`opening`), trio
(`OPENING_TRIO`: knight, samurai, archer) and moment (`starter`) are unchanged.

## What it is now
Seven shots, all on one backdrop (`highlands`, the pass over the warcamp), so nothing pops between places:
1. The Outer Marches: title card, rumble, two narrator lines (the stakes).
2. The three defenders walk on (front, striker, back), each in their own voice: gritty, cynical, economical.
3. The ruler arrives with the court goat; the ruler translates her "Baaaah." into a tactical truth.
4. The placing, told in the story: the ruler directs from the rear while the three hold the point (no tutorial narrator).
5. The warlord crashes in (low angle, smash cut, shake, boom), the three turn to face him.
6. Snap zoom on the archer: "That one is roughly the size of a tavern."
7. Pull out to the line: "Steel ready." / "Brace the line!" / "Place your champions." into gameplay.

Run time: about 64 s as written (`sceneSeconds`), about 66 s measured start to end in a headless browser at 393x852. Pacing is the
default line length plus short beats on the shots that need one (the narrator's last line, the goat, the warlord's hold of 2 s).
`test/cinematics.test.ts` now allows the opening 50 to 70 s (every other scene stays 10 to 40).

## Substitutions (where the spec used something the engine lacks, or needed a change)
- `ots` for shot 4 and the other framings, moves and cuts all exist in `sceneKit.ts`; nothing was missing. The director still
  cuts to a speaker's portrait for a line when a shot has no `angle` (shots 2, 3, 6), as it does for every scene.
- "Your majesty" became "majesty" (it fits any ruler; `rulerWords` in `src/rulerRules.ts` only swaps king/queen words and has no
  title helper). "Kings are not aerodynamically designed" became "Rulers are not aerodynamically designed". The king's name in the
  box is the chosen ruler's.
- Shot 3 uses `say('king', ..., 'shout')` for the opening order. Line beats (`beat`) are used for pauses; the spec's "hold 0.5"
  became `hold: 2` so the warlord's entrance lands.
- The warlord stays a black silhouette (`shade`), as the spec says; he is partly off the right edge in the closing wide shot.
- Test changes: Duchess's line may be "Baaaah." as well as "Mehh." (`cinematics.test.ts`); `scene-fixes.test.ts` finds the
  king's shot by "from the rear" and not "That is you".

## Director's fixes after review (merged with 0.326.0, Iron Stag the default ruler)
- Shot 4 is a still wide two-shot (cam x 183) with the ruler and the knight both in view; the over-the-shoulder framing held the
  knight's portrait through the ruler's lines. The speaker box shows the chosen ruler's name (Iron Stag by default).
- Shot 7 is a still wide shot (cam x 250) and the warlord walks in to x 322, so all three defenders and the warlord are in the
  picture for the handover (visible width at this zoom is only about 200 stage px).
- The warlord is no longer a black `shade` silhouette (it read as a blob): he is drawn in full, under the shot's `darken`.

## Frames
`docs/samples/opening-v2-1.png` to `-8.png` (393x852).
