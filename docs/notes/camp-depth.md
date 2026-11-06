# Camp depth: the stall behind the heroes

The owner: "The shop and sign should be behind the heroes. Like they're all there together on the cliff."

Hester's Stall (`#hmStall`: the stall's picture, her painted sign, the trader mark and the new-stock dot) is a DOM button laid over the
camp's canvas, so until now it covered every hero, the fire and Duchess near it (the hero at the left end of the line stood hidden behind
it). Now the camp draws in two layers (`src/camp.ts`):

- **The scene canvas** (`.cpRoom`): the painted overlook, the army, the tower's life, the fire's glow, and whatever stands behind the
  stall's foot.
- **Hester's Stall** sits on it.
- **The front ground** (`.cpRoom.cpFront`): a second canvas the same size, over the stall. Everything in the depth-sorted list (heroes, the
  fire, Duchess) whose feet are nearer than the stall's foot (`places.stall.foot`) is drawn here, with the sparks and the emote bubbles.
  The fire's glow is added over this layer too, cut to the shapes drawn on it, so heroes by the fire are lit as before and the stall is not
  lit twice.

The other places, the stash, the Daily button and "the enemy below" plate come after the front canvas in the DOM (the plate now has
`z-index: 2` in the battle camp, as the slots do), so they all stay over the heroes, as before. The bottom bar is outside the scene.

The stall is set a little further back and smaller (`STALL` in `src/render/overlookLayout.ts`: 100 x 92 with a 32 plate, foot
`heroY - 0.105h`, was 108 x 100 / 34 at `heroY - 0.075h`), which lifts the sign clear of the campfire.

**Taps.** The front canvas takes no taps (`pointer-events: none`), so the whole stall stays one tap box. A hero standing in front of the
stall gets the tap only on his own body (about his figure's height, 0.3 of it each side of his middle); anywhere else on the stall, sign
and marks included, opens the stall. A keyboard press always opens the stall. Checked in the browser at all three sizes: a tap on the
wizard over the stall picks the wizard; taps on the stall's picture and its sign open the stall.

**Checks.** `test/overlook.test.ts` checks every hero and the fire stand in front of the stall's foot and that the stall stays on the
ledge. Shots (`tools/camp/depth-shots.mjs`, `TAG=before|after`, `VISITOR=1` for a trader in camp) are in `docs/samples/camp-depth/` at
393x852, 360x780 and 412x915, with five heroes, with and without the Gloaming Dealer.
