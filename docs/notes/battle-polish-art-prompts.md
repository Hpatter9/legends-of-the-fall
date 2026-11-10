# BATTLE-POLISH: art prompts

The fight's Auto split into two buttons (docs/notes/battle-polish.md). Auto spells keeps the painted `autocast` / `autocast-lit` pair. Auto
ultimates borrows the painted `ultimate` medallion, dimmed by CSS while off and given a gold glow while on; a painted off and lit pair of
its own would match the spells' button. Until it lands the CSS stand-in is used. **Landed** (`art/battle-polish`, UI-ART-WIRE):
`auto-ult.webp` and `auto-ult-lit.webp` are the button's off and on states now ([ui-art-wire.md](ui-art-wire.md)).

```
For the repo hpatter9/legends-of-the-fall, branch art/battle-polish: paint two round button medallions for a phone fantasy auto-battler's
fight HUD, saved as art-source/ui/buttons/auto-ult.png and art-source/ui/buttons/auto-ult-lit.png. Each is 256x256 px on a transparent
background. Match the existing autocast pair (a riveted brass ring round a dark inset disc, painted, warm gold metal, soft top-left light):
in the middle, a gold eight-pointed star burst with a small flame at its heart (the hero's ultimate), circled by two curved arrows (it
repeats on its own). auto-ult.png: the inset dark iron grey and the star dull brass, as an "off" state. auto-ult-lit.png: the inset deep
crimson, the star bright gold with a warm inner glow, as an "on" state. No text, no drop shadow outside the ring; the ring fills the canvas
to within 6 px of its edge. Painterly, crisp at 48 px on screen.
```
