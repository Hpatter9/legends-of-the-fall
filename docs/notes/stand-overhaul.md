# Last Stand overhaul (STAND-003)

The owner's ten asks for the Last Stand: a story (the inside of a castle whose walls are breached, the guard falling back to the king at his
throne), a dignified king, far less shake, a free camera, better ways to find the heroes and to set them out, varied halls, the last foes of a
wave hunted down, a pause with the heroes' stats, and heroes who stay dead. Two phases: **A** (this note so far) builds the rules and shows a
visual proposal; **B** builds the look once the owner approves it.

## Phase A: the rules (built)

| Ask | What changed | Where |
| --- | --- | --- |
| 3. Less shake | The Last Stand's `Fx` is `still`: the blows shake nothing. A boss's blow on a hero or the king nudges the field down at most `NUDGE_PX` (2 px) for `NUDGE_MS` (160 ms); none at all under reduced motion or with shake off in the settings (`Fx.calm()`). Flashes, slow motion and the other effects are as they were. | `src/render/standCam.ts` (`bossHit`, `nudgeOffset`), `src/render/fx.ts` (`still`), `src/standView.ts` |
| 4. Free camera | The camera no longer follows the fight (`follow` is gone). It starts on the king; one finger pans, two pinch (whole-pixel steps as before), a mouse wheel steps the zoom; a resize keeps it where it is. A crown button under the top bar, right, eases it back to the king. | `src/standView.ts` (`centreOnKing`, `.stCentre`), `src/stand.css` |
| 8. The hunt | When no foes are still to come and `HUNT_AT` (2) or fewer stand, `Battle.stand.hunt` is set and the leashes are lifted: each hero (skills cast freely too) strikes the weakest foe in reach, else walks to the nearest foe by a walk bounded to the gap between them plus 4 (`huntDecide`). It ends with the wave; in the break the heroes walk home by the usual stray rule. A `hunt` note goes to the page. | `src/sim/stand.ts` (`HUNT_AT`), `src/sim/standAi.ts` (`huntDecide`), `src/sim/battle.ts` (`StandMode.hunt`) |
| 9. Pause (logic, plain panel) | A Pause button (top left) stops the run's stepping (`paused`), and a plain sheet lists the king and every hero; Resume carries on. The sheet's data is `standSheet(s)`: per hero its level (and run levels), health, pool (mana or stamina), attack, defence, kills, both skills (cost, open, payable now) and the ultimate (opens at, meter, ready); fallen heroes are marked. Kills are now counted per hero (`StandHero.kills`, summons' kills credited to their caller). The styled panel is phase B. | `src/sim/standSheet.ts`, `src/sim/stand.ts`, `src/standView.ts` (`setPaused`, `drawSheet`, `sheet`) |
| 10. The fallen stay down | `clearWave` no longer raises the fallen (`RISE_SHARE` is gone). A hero whose unit falls is marked `StandHero.fallen` at once (`markFallen`, a `fallen` note): no wave XP or kill XP, no levels (`levelBlock` says `none`, `weakestHero` skips it), no new post, and a run built again from its save leaves it off the field. Neither the king's Resurrect (`fallenIn` finds nobody when `b.stand` is set; its card is dimmed) nor the High Priestess's Resurrection raises anyone in the Last Stand. Death-preventing effects (the Phoenix Feather relic, a rising feather, undying, a guardian angel) still work: they stop a death, they do not raise the dead. The run goes on while the king lives, with no heroes at all if it comes to that. Old saves (no `fallen`) load with everyone standing. | `src/sim/stand.ts`, `src/sim/spells.ts`, `src/sim/ultimates.ts`, `src/standView.ts` |

Tests: `test/stand-overhaul.test.ts` (the hunt: lifted leash, finished wave, walk home; it waits for the last `HUNT_AT`; determinism with
hunts; the fallen: no rising, XP, levels or posts; the save; Resurrect and Resurrection; a run with no heroes; the pause sheet).
`test/stand.test.ts`: "the fallen rise" became "the fallen stay down" (the owner's change), and the leash test lets a hero be past its leash
while a hunt is on and for up to 40 s after it while it walks home (it must get back).

Browser check: `node tools/stand/overhaul.mjs` (after `npm run web`): at 393x852, 360x780 and 412x915 a drag pans the camera and it stays put for
6 s, the crown button goes back to the king, Pause stops the battle clock and lists eight heroes, Resume runs it again, no page errors.

### Balance with the fallen staying down

`node tools/stand-balance.mjs --levels 1,10,20,30,60,100 --attempts 30` (the greedy buyer, eight heroes, nothing worn, no castle). The wave the
king fell in, median (mean, min-max):

| Hero level | Target | Before (main 0.174) | Now (fallen stay down, the hunt) |
| --- | --- | --- | --- |
| 1 | about 4 | 4 (4.0, 3-4) | 4 (3.8, 3-4) |
| 10 | about 10 | 9 (9.4, 9-10) | 9 (8.7, 7-10) |
| 20 | about 13 | 12 (11.5, 9-14) | 10 (10.5, 9-12) |
| 30 | about 22 | 20 (22.9, 14-45) | 14 (14.9, 12-21) |
| 60 | about 26 | 21 (25.1, 13-66) | 20 (21.4, 13-92) |
| 100 | about 35 | 40 (43.2, 19-89) | 25 (38.8, 15-86) |

As expected the middle and late rows drop (a run now wears down: every hero lost is lost for good); level 30 falls most (a party at the edge of
its ultimates loses its first heroes on the wave-15 and wave-20 bosses). Re-tuning is phase B's (levers: `CLEAR_HEAL`, `WAVE_GROWTH_LATE`,
`bossShare`, the level price, or a way to replace the fallen: a question for the owner).

## Phase A: the visual proposal (mock-ups, not built)

Screens at 393x852, each labelled MOCK-UP. They are the real renderer with the proposed pack art swapped in for one throwaway build
(`tools/stand/mock/prep.py` cuts the pieces, `build.mjs` builds, `shots.mjs` lays a hall onto the field by hand and puts the proposed page
pieces over it):

- `docs/samples/stand-overhaul-mock-hall.png`: the great hall (two colonnades, a breach north and one east with rubble, the dais with the red
  carpet, the new king on his throne), mid-wave, zoomed out.
- `docs/samples/stand-overhaul-mock-chapel.png`: the chapel (a ring of pillars, raised carpeted galleries round the nave for height, breaches
  west and south).
- `docs/samples/stand-overhaul-mock-library.png`: the library (bookcase rows as cover, three breaches).
- `docs/samples/stand-overhaul-mock-king.png`: the king today, the proposed king on his throne, and a second choice, at four times.
- `docs/samples/stand-overhaul-mock-deploy.png`: deploy: the roster tray (posted heroes dimmed), the post tiles (faint where a post may go,
  gold rims on taken posts, glowing suggested posts from `ringPlan`), a hero dragged to its post, Auto-place, Clear, Begin.
- `docs/samples/stand-overhaul-mock-units.png`: finding the heroes: a coloured ring under each hero, the matching rim on its hero-bar
  portrait, a tapped portrait panning the camera to its hero (pulse rings), an arrow with a portrait at the screen's rim for a hero off the
  screen, red framed bars on every foe.
- `docs/samples/stand-overhaul-mock-pause.png`: the pause sheet: the king (health, wave, gold), then two cards a row, one per hero (portrait,
  level, health and pool bars, attack, defence, kills, both skills with their cost, lit when payable, and the ultimate's meter or "Ready"; a
  fallen hero greyed), and Resume.

The layouts proposed for phase B (picked from the seed, each with its own pillar, cover and breach pattern; the breaches open on different
walls, so the waves come from different sides): **great hall**, **chapel**, **library**, **courtyard** (open sky, flagstones and grass, a
fountain or well as cover; not mocked: it needs a grass floor). The walls run round the field's edge; the foes come in only by the breaches
(the edge tiles that are not wall), and `waveEdges` would choose among the hall's breaches instead of the four edges.

### Pack files to use

- **Floor:** `assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/walls_floor.png`, the two 32 px flagstones at
  (0, 336) and (176, 336), laid 2x2 into a tile top.
- **Walls' and steps' faces, pillars, wall tops:** the same sheet's dressed stone (16, 248, 48x20 for the face; 16, 244, 32x32 for the tops).
- **The dais's carpet (and the chapel's galleries):** `DawnLike/Objects/Decor0.png`, the red rug at (8, 232), 32x32.
- **Rubble at the breaches:** `assets/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/PNG/Objects_separately/Ruin_shadow1_3.png`
  and `Ruin_shadow1_4.png` (fallen stones, a broken wall stub); `Ruin_shadow1_5.png` for small pieces.
- **The library's shelves:** `DawnLike/Objects/Decor0.png`, the bookcases at (32, 64) and (64, 64).
- **The throne:** `DawnLike/Objects/Decor0.png` at (96, 112), 16x16 (four times up).
- **The king:** the Himeko Sutori paper doll (as the heroes): `Template_Male.png`, `Mage_05_ArcaneRegalia_Male.png`,
  `Facial Hair/BeardWhite.png`, `Helm/Helm_Crown_Male.png`, `Staff_05_Radiant_Male.png`, cut by `tools/compose-class-heroes.cjs` as
  `stand_king` is today (the choice: `Plate_06_Lordly_Male.png` and its top kept, `BeardBrown`, the same staff).
- **More props for phase B:** the dungeon pack's `Objects.png` (barrels, crates, chests, tables) and DawnLike's candelabra and banners.

### Questions for the owner

1. **The king:** the robed king with the orb sceptre (proposed) or the armoured one with a sceptre? He has no seated pose in the pack: he
   stands before the throne. The DawnLike throne is 16 px art and chunkier than the heroes; the castle tab's own `src/art/throne/king_throne.png`
   (a king on a throne in the heroes' style) has no recorded pack source in CREDITS, so I did not use it: may it be used, or should it stay out?
2. **Layouts:** great hall, chapel, library and courtyard: are these the four, and should a layout ever repeat in a row?
3. **The backdrop** behind the field (the mock-ups show the dungeon land's cave): a dark castle backdrop, or the ruins' sky over a roofless hall?
4. **Balance:** with the fallen staying down the middle rows fall well short of the target (level 30: 14 against 22). Re-tune the waves to the
   old targets, or set new, lower targets now that a run wears down? And should the run offer any way to replace a fallen hero (for example
   a recruit bought at a break), or is the loss final for the whole run as asked?
5. **The hunt:** the last 2 foes (with none still to come) lift every leash. Is 2 right, and should the healers stay at their posts?
6. **Deploy:** the eight start in the tray (nothing placed until Auto-place or a drag), or start placed by the ring plan (as today) with the tray
   used to swap?
7. **Shake:** no shake at all except a 2 px nudge on a boss's blow: enough, or none at all?
