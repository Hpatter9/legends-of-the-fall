# The Last Hold and the War's end: art prompts

Phase 5 of the Assault (`docs/notes/assault-5.md`) needs no new art to play. The War's-end scene plays on the Last Hold's land's painted
backdrop, with the warchief's and the party's own sheets. The Council board's end card uses the Council backdrop and the fallen lord's
portrait. One optional painting would give the end its own look on the Council board: the Council's hall with its seats burning. Until it
lands, the board keeps today's Council backdrop (`src/art/dynasty/council-backdrop.webp`).

## The Council's seats burn

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its villains are the Dark Council: a warchief, four captains and eight lieutenants who sit in a
torchlit war hall. The player has just stormed the last of the Council's strongholds, and the War is over. This painting is shown
behind the Council board once the War has ended.

Rules for this task:
- Branch: art/assault-war-end. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/expansion/council-fallen-backdrop.png. Change no other file.
- Pull request into main titled "Art: the Council's seats burn". In the body, name the file and describe the picture in one line.
- No text, letters, numbers, logos, frames, watermarks or signatures. Original work only.

Open these files first and match them:
- art-source/expansion/council-backdrop.png: the Council's hall as the board shows it today. Paint the SAME hall, from the same
  viewpoint and with the same layout (the warchief's high seat at the top, the captains' and lieutenants' seats below it), so the two
  read as the same place before and after.
- src/art/dynasty/houses-backdrop.webp: the game's painted menu backdrops, for the brushwork and the palette.

The picture: 1024 x 1536 px, upright, an opaque painted background (not transparent). The hall after the fall. The warchief's high
seat is cracked and empty, its war banner torn and smouldering. Every seat below is empty and burning with low orange flames; some
are overturned. Embers drift up through the smoke towards a broken roof, where cold grey dawn light falls through the gap onto the
floor. A dropped horned helm lies on the steps before the high seat. No figures anywhere. Keep the middle of the picture, from about
a fifth of the way down to four fifths, darker and calm: the board's words and portraits sit over it.

Style: detailed painted fantasy art, exactly like council-backdrop.png: dark weathered stone and timber, aged brass, deep crimson
cloth, warm firelight against cool shadow. It must read clearly at a third of this size on a phone.
```

When it lands, `tools/dynasty-art/import.py` brings it down as the Council backdrop is (`src/art/dynasty/council-fallen-backdrop.webp`).
`menuBackdrop` then shows it on the Council board when `War.end` is set, and `CREDITS.md` credits it beside the Council backdrop.
