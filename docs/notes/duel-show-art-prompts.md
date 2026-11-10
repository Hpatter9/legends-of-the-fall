# Duel show: prompts for the art it borrows

**Landed** (`art/duel-show`): the five pieces are the bar now ([ui-art-wire.md](ui-art-wire.md)).

The duel's one tug-of-war bar (`docs/notes/duel-show.md`, `src/duelShow.css`) is framed for now by the painted plaque
(`ui/buttons/plaque.webp`, `pbPlaque`), the closest piece of the HUD kit. Its track, its two fills, the meeting point's knot and the two
face rings are drawn in CSS. The prompts below are for the pieces that would replace them. Each stands alone: paste everything inside its
fence into a new Codex conversation. Nothing is imported by ChatGPT: the builder imports the PNGs afterwards, credits them in `CREDITS.md`
and adds them to the service worker's list.

## 1. The tug-of-war bar's frame and its parts

```text
Repository: hpatter9/legends-of-the-fall. Make a branch art/duel-show from main. Add the PNGs below under art-source/duel-show/ only,
nothing else, and open one pull request titled "Art: the duel's tug-of-war bar".

The game: Legends of the Last Keep, a dark gothic fantasy auto-battler played on an upright phone. Its HUD is painted: aged brass and
gold frames with dark green-black enamel, small rivets, a soft inner bevel, crisp edges that read at 1x on a phone. Match the existing
painted plaque and boss bar (warm brass #dbc18b highlights, dark #1a140e insides). No text anywhere. Every PNG has a transparent
background and is drawn at 2x the size it is shown.

The piece: a single wide bar across the top of the screen during a one-on-one duel. The player's champion's round portrait sits at its
left end and the challenger's at its right; between them a long track that fills green from the left and red from the right, the two
fills meeting at a sliding point.

1. duel-bar-frame.png, 760 x 112 px: the whole frame, empty inside. A long brass frame with a round socket at each end (each 84 px
   across, a little larger than the bar's height, standing proud of it), joined by the bar's frame. The left socket's rim is touched
   with green enamel, the right socket's with red. Inside the frame, between the sockets: a recessed channel 520 x 26 px, its floor
   transparent (the fills are drawn under it). The channel's ends meet the sockets cleanly. The frame must nine-slice: keep the middle
   220 px of the channel's top and bottom edges plain and even, with no ornament, so it can stretch.
2. duel-bar-fill-green.png, 64 x 26 px: the champion's fill, a tile that repeats from left to right: bright leaf green at the top fading to
   deep forest green, a fine highlight along its top edge, no ends.
3. duel-bar-fill-red.png, 64 x 26 px: the challenger's fill, the same in blood red: bright scarlet at the top to deep crimson.
4. duel-bar-knot.png, 28 x 44 px: the meeting point, a small gilded knot of rope or a brass clasp standing taller than the channel, lit
   from within, its centre on the canvas's centre.
5. duel-bar-flare.png, 160 x 112 px: a burst of gold light to lay over the knot when the bar swings hard: soft, additive-looking glow
   with a few sharp sparks, brightest at the centre, fading to nothing at the edges.
```
