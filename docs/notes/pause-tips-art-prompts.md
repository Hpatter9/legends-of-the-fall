# Prompts for PAUSE-TIPS's art (the pause medallion)

The owner's rule: new art is painted from ChatGPT image prompts, never drawn in code; a plain stand-in is fine until it lands. The pause
button needs one picture the painted medallions do not have.

| Picture | Saved as | Stand-in now | Wired in |
| --- | --- | --- | --- |
| The pause medallion | `src/art/ui/buttons/pause.webp` (96 x 96, cut from the source like its neighbours) | the speed medallion's own rim and face with its chevron painted out and two gold bars set in (made from `speed-1.webp`) | `#top #pause` in `src/pauseTips.css` |

```text
Repository hpatter9/legends-of-the-fall, branch art/pause-tips. Save as art-source/pause-tips/pause-medallion.png, a 512 x 512 canvas with a
transparent background. Paint one round UI medallion button for the mobile fantasy auto-battler Legends of the Last Keep, matching its
existing painted medallions exactly (the speed, sound and settings buttons): a thick polished brass rim with eight small round rivets set
evenly round it, a soft dark drop shadow, and a slate-green face with a faint worn texture and a gentle vignette. In the middle of the face,
the pause symbol: two upright, rounded gold bars side by side, embossed like the speed button's gold chevron, lit from the top left with a
warm highlight and a darker lower edge. Painterly, crisp edges, no text, no letters, no background, centred, filling about 90% of the canvas.
```
