# Art cleanup: foes and hero animation (art-cleanup)

Art only. No stats, kits or sim changes: `sheet` and `scale` fields only (`src/sim/foes.ts`, and the hero Satyr's `scale` in `units.ts`).

## Foes remade (21 sprites)

Made with the method in `hero-art.md`: a base from `/generate-with-style-v2` (Craftpix Minotaur, Samurai Commander and Orc Warlord frames as
style references, 128 px; 80 px for the satyrs with Knight and Kunoichi), then clips from `/animate-with-text-v3`. Native pixels, hard alpha,
the last death frame is the idle figure turned 90 degrees (`lie.py`, which now also takes sheet names as arguments). Tools: `tools/pixellab/foes/`
(`spec.py` prompts, `gen.py`, `build.sh`, `finish.py`), `tools/art-cleanup/shots.mjs`.

- **Forest bosses:** Thorn Warden (a green thorn-vined beast with glowing mushroom caps and a blue tail), Wood Raider (a masked hatchet raider with
  purple gems), Grove Spearlord (a crowned bronze forest king with an orange-gem spear).
- **Top-down bosses:** Boar King, Devil Leader (hellfire in hand), Shaman King (bone-skull helm, green-flame skull staff).
- **Golems:** stone, iron, crystal, magma, Sapphire Colossus, Forge Titan. Colours and themes kept.
- **Grove Satyrs 1-3** (found in the lineup, `art-cleanup-satyrs-*.png`): the old ones were thin chibi figures. The hero Satyr shares `satyr_2`, so its `scale` moved
  0.57 -> 0.76 to stay in the medium band (`test/hero-art.test.ts`).
- Rows: walk (8 frames), attack, idle, hurt, dead (+ the lying frame). The old golems moved a pixel at a time; the walk and hurt of every foe come from
  stronger prompts at 8 and 6 frames (a 4-frame take barely strode). The page shows 3 hurt frames, so the 6-frame flinch is sampled as frames 1, 3, 5 (`cut.py`).
- Scales keep each foe's old world height for golems and satyrs; the six bosses now stand 54-60 px like the Orc Warlord and Lich King (Thorn 0.45, Raider 0.49,
  Spearlord 0.48, Boar 0.51, Devil 0.54, Shaman 0.5); Sapphire 0.61 and Forge 0.62 keep their old ~77 px.
- **Calamity bosses** reuse these looks and follow automatically (calBoss2 = Thorn Warden, calBoss5 = Devil Leader, calBoss6 = Boar King). calBoss6 has its own
  `scale: 0.62` override in `calamityBosses.ts`, which I left alone (another worker edits that line): it now draws the Boar King at about 73 px, bigger than before (53); drop it
  to about 0.585 if the old size is wanted.
- Checked: boss cards (`art-cleanup-card-*-393.png`, `wholeFigure` fits), fights (`art-cleanup-fight-*-393.png`), the Orc Warlord / Lich King / Minotaur lineup
  (`art-cleanup-proto.png`, `art-cleanup-foes-before/after.png`).
- Other foes that still look odd: none clearly; the werewolf packs, gorgons and tengu are Craftpix. The Skeleton Warrior is a bit small beside the new bosses but matches.

## Hero walk and hurt polish (16 heroes)

`tools/pixellab/heroes/polish.py`: the animator's first frame is each hero's own idle frame from the sheet (the base figure never changes). Two takes (seeds 3, 5) of
a stronger walk (8 frames: exaggerated stride, bobbing, swinging arms) and hurt (6 frames: body jolts back, head snaps, knees buckle). `score.py` rates motion and colour
drift; the better take per hero was chosen by motion with drift under 5 (Shambler and Priestess hurt take 5 drifted, so take 3), and checked by eye
(`strips.py`, `anim_strip.py`). `polish.py patch` swaps only the walk and hurt rows into `hero_<id>.png`: frames are moved, never resampled; a cell grows (padded evenly) if a stride or recoil
leaves it. Walk is now 8 frames (`perRow` 8), hurt 3 (the page shows 3). Attack, idle, dead and every base figure are untouched. All 16 sheets already had a hurt row.
No attack clip needed a re-roll. Samples: `art-cleanup-anim-{a,b,c,d}.png` (before and after rows).

## Cost

Balance 2377.75 at the start (not the 3190 of the brief), 1807.75 after: **570 generations used**: foes 12 + 3 bases and ~200 for their clips, the strong walk and hurt retakes
for 12 foes (54), 16 heroes x 2 takes x 2 clips (about 190), satyrs about 80 (the numbers are balance readings, which lag a little). Above the floor of 1,200 about 600 remain.
Clips cost about 2 generations at 8 frames, far under the 11 once estimated.
