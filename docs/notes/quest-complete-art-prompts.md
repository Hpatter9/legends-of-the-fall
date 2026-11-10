# Quest complete: prompts for its art (QUEST-COMPLETE)

The Quest complete card ([quest-complete.md](quest-complete.md)) is built from art the game already has, with three stand-ins:

| Where | Stand-in now | The piece asked for | Final size |
| --- | --- | --- | --- |
| The card's head, over "Quest complete" | The standard menu's battle crest (`ui/battle-crest.png`) | A wax seal on a ribbon: a quest closed | 256 x 128 |
| A keepsake's row in the rewards | The trophy medal (`ICONS.trophy`) | A keepsake on a nail | 96 x 96 |
| "The stranger joins your company" row | The Heroes tab's medal (`ICONS.heroes`) | A hooded figure in a doorway, unnamed | 96 x 96 |

Paste each fenced prompt into ChatGPT (with its image tool). Each paints one PNG on the branch **`art/quest-complete`**, under
`art-source/quest-complete/`. Once they are merged, the builder copies them to `src/art/ui/quest-complete/`, credits them in
`CREDITS.md`, and points `questComplete.ts` at them (`rewardPicture`, and a rule for `#questComplete .omCrest`).

## The seal

```
Repository: hpatter9/legends-of-the-fall. Branch: art/quest-complete, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/quest-complete/seal.png. Change nothing else: no code, no notes, no version.

Paint a header ornament for the "Quest complete" card of Legends of the Last Keep, a dark gothic fantasy auto-battler played upright
on a phone. Canvas 1024 x 512 pixels, transparent background, the art centred with a little clear space all round.

The piece: a round seal of deep red wax, pressed with a castle keep's crest (a single tower with a pennant), sitting on the middle of
a short forest-green silk ribbon whose two ends fall away left and right and end in swallow-tail cuts. A thin rim of aged brass
filigree curls out from behind the seal on each side, tapering to a point, so the whole reads as one wide, low ornament.

Style: hand-painted, rich and slightly matte, like the game's other menu art: warm brass with dark recesses, candle-lit from the upper
left, soft painterly edges, no outlines, no pixel art. Study art-source/ui/buttons/plates-frames.png and src/art/ui/battle-crest.png in
the repository and match their brass, their greens and their light. No letters, numbers or words anywhere. Nothing may touch the
canvas edge. It must stay readable when shown 128 pixels wide.
```

## The keepsake

```
Repository: hpatter9/legends-of-the-fall. Branch: art/quest-complete, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/quest-complete/keepsake.png. Change nothing else: no code, no notes, no version.

Paint a small icon for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Canvas 512 x 512
pixels, transparent background, the subject filling about four fifths of the canvas and centred.

The subject: a keepsake hung on a tavern wall: one iron nail, a loop of twine, and hanging from it a small worn brass token the size
of a coin with a notch in its edge and a simple knot stamped on it. It stands for any memento a grateful villager might give (a
wheel-spoke, a ledger, a set of manacles): keep it plain and general, a token and not a particular object.

Style: hand-painted, rich and slightly matte, like the game's round menu medals: warm brass with dark recesses, candle-lit from the
upper left, soft painterly edges, no outlines, no pixel art. Study art-source/ui/buttons/actions.png in the repository and match its
medals' brass and light. No letters, numbers or words. Nothing may touch the canvas edge. It must stay readable at 36 pixels.
```

## A hero joins

```
Repository: hpatter9/legends-of-the-fall. Branch: art/quest-complete, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/quest-complete/hero-joins.png. Change nothing else: no code, no notes, no version.

Paint a small icon for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Canvas 512 x 512
pixels, transparent background, the subject filling about four fifths of the canvas and centred.

The subject: a hooded, cloaked figure seen from the chest up, standing in a lit tavern doorway, the face lost in the hood's shadow so
that nobody could say who it is, man or woman, young or old. Warm firelight from inside rims one shoulder and the edge of the hood in
gold. A round brass ring frames the figure, like the game's menu medals. It stands for "a stranger joins your company" before the
player learns who: it must give nothing away, so no weapon, no emblem, no colour of any one hero.

Style: hand-painted, rich and slightly matte, like the game's round menu medals: warm brass with dark recesses, candle-lit, soft
painterly edges, no outlines, no pixel art. Study art-source/ui/buttons/actions.png in the repository and match its medals' brass and
light. No letters, numbers or words. Nothing may touch the canvas edge. It must stay readable at 36 pixels.
```
