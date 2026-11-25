# NATSU-FIX: Natsu's painting with both legs

The owner: Natsu's full painting showed only one leg. ChatGPT repainted it (PR #687, `art-source/fix/natsu-archer.png`, 1024 x 2048,
opaque). In that repaint the bow is lowered and she reaches back for an arrow (0.621).

**NATSU-ACTION** (the owner's second repaint, the `art/natsu-fix` branch's "Paint Natsu in a new action pose", for PR #691): she stands
at full draw, bow raised, the arrow pointing LEFT, both legs planted, a torii shrine behind her. Her painting is re-cut from it in the
same way. Her facing matters nowhere it is shown:
- the viewer, the tarot reveal and the arrival show the painting as it is;
- their own facing-right figure is her battle sprite, drawn separately below it;
- nothing mirrors the painting.

So nothing is mirrored. The pictures (`node tools/natsu-fix/shots.mjs`) are `natsu-painting.png`, `natsu-tarot.png`,
`natsu-arrival.png` and `natsu-card.png`.

## What changed

- **`src/art/heroes/archer.webp`** (re-cut again from the action pose): her full painting, shown by "View full artwork" on her hero card, the summoning's tarot reveal
  and an earned hero's arrival. It is re-cut from the new picture as the whole figure, at 512 x 1024 and WebP quality 88, as before.
  - The old painting was the whole figure too. Her face lands in the same column and about 35 px higher at that size.
  - Zooming in to put the face exactly where it was would crop her legs off again, which is the fault this fixes, so it is not zoomed.
  - At 393 x 852 the painting fits the viewer with both legs and her feet in frame (`docs/samples/natsu-fix/natsu-painting.png`,
    `node tools/natsu-fix/shots.mjs`).

## What did not change

- **`src/art/heroes/archer-portrait.webp`**: her standing cut-out on a transparent background (480 x 960). It is used by:
  - the hero card;
  - the roster;
  - the court;
  - the faces (`heroFaceRules.ts` records where her face is in it);
  - the cut-ins.

  The cut-out already showed both legs. The new painting is opaque, and nothing here can lift her cleanly off its background: the other
  heroes' cut-outs were painted on transparent backgrounds. So the cut-out keeps her old drawing pose for now
  (`docs/samples/natsu-fix/natsu-card.png`). The prompt below asks for the new pose as a cut-out. When it lands:
  - cut it like the others (`tools/heritage/import-art.py`: fitted inside 640 x 960, then to 480 x 960, quality 94);
  - re-measure her face in `heroFaceRules.ts` (`archer.art`).
- **The Crown Terrace figure and the tavern's two Natsus** are drawings of their own, not crops of the painting, so they stay as they
  are.

## The prompt for her cut-out

```text
Repository: hpatter9/legends-of-the-fall. Branch: art/natsu-cutout, from the latest main (create it). Add exactly one file,
art-source/fix/natsu-archer-cutout.png, and nothing else. Open one pull request into main titled "Art: Natsu's cut-out", and say there
that the image is original work made for this game.

Paint Natsu, the Archer of Legends of the Last Keep, alone on a fully TRANSPARENT background (real alpha, no checkerboard, no scenery,
no ground, no shadow). She is in exactly the pose, outfit, colours and painted style of art-source/fix/natsu-archer.png:
- standing with both legs clearly drawn;
- the bow lowered in her left hand;
- her right hand reaching back to the quiver for an arrow;
- the red and gold samurai armour with its crescent helm crest, and her long dark hair blowing.

The whole figure is in frame, from the crest of her helm to her feet, centred, filling the height.
(Since NATSU-ACTION the pose is her action pose instead: at full draw, bow raised, the arrow pointing left, both legs planted, as in
the newest art-source/fix/natsu-archer.png. The owner's own prompt follows that file.)
The canvas is 1024 x 1536 (2:3, upright). No text, letters, logos or signatures.
Match: art-source/fix/natsu-archer.png (her pose and look) and src/art/heroes/knight-portrait.webp and samurai-portrait.webp (how the
other heroes' cut-outs are framed: the whole figure, cleanly edged, on transparency).
```
