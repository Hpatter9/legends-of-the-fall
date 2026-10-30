## ULT-EPIC: an ultimate's payoff

Branch `claude/ult-epic` (from main 0.258.0; main 0.259.0 merged in). The director captured eight ultimates in the real game after ULT-CUTIN (docs/notes/battle-hud.md)
and found the opening good but the payoff flat: after the banner the ultimate played the same effect as a normal skill at normal size on a
board still dark but for a ~200 px pool round the caster, the banner held still like a title card, and nothing marked the blow landing. The
owner approved a plan; this is all of it, with the owner's painted kit. Before and after, at 393x852: `docs/samples/ult-epic-before-393.png`
(150, 700, 1250, 1450, 1800, 2400 ms) and `docs/samples/ult-epic-after-393.png` (150, 700, 1160 (the freeze), 1450, 1800, 2400 ms), for
Issen, Holy Nova, Stampede, Meteor Swarm, Maelstrom and Call Lightning. Also: the banner mid-motion (`ult-epic-banner-393.png`,
`ult-epic-banner-maelstrom-393.png`), the blow (`ult-epic-impact-393.png`, `ult-epic-impact-holy-nova-393.png`,
`ult-epic-after-impact-maelstrom-393.png`), `ult-epic-360.png`, `ult-epic-412.png`, `ult-epic-reduced-393.png`, `ult-epic-saver-393.png`.

### What the moment does now (full setting, Auto off: `fullScene`; Auto and the short banner are unchanged)

- **The opening (1.15 s, the battle held).** The band slashes in and keeps moving: speed lines rush through it (CSS lines in the element's
  colour, or the painted kit's), bright streaks run along its top and bottom edges, the band slides one way (`umSlide`) while the hero's art
  drifts the other (`umArt`), and the name is stamped in (scale 2.4 to 0.9 to 1, with a white glow that settles). Power gathers on the hero
  under it (`Fx.ultGather`: the kit's gathering, else the element's wind-up from the pack) on the moment's own effects layer, which runs while
  the fight's effects are held. The page camera leans in on the hero (`UltMoments.focus`, 1.3 over the view the follow camera holds) and a
  sting sounds (`ultSlash`). The band slashes away 260 ms before the opening ends, so the blow lands on an open board.
- **The blow (`UltQueue.strike`).** For an instant or lingering ultimate as the opening ends; for a delayed one (a salvo in the air) when the
  page sees its first blow land (`UltQueue.land`, from `note`), or as its wait ends if it never does. The fight and every effect freeze for
  0.15 s of real time (`HIT_STOP_MS`, the queue's `stopLeft`: `holdsBattle` true, `runsEffects` false), on the first, white-hot frame of a
  huge burst of the element on each one struck (`Fx.ultImpact`: up to five, two on battery saver; else on the area's tiles, else on the hero),
  with a shock ring and the pack's nova over it; a flash of the element's colour round the blow eases in and out once (`.umFlash`, 0.55 s, a
  CSS one-shot); a heavy sting (`ultImpact`); and a hard shake as the freeze lets go (the fight's trauma, so none when shake is off or motion
  is reduced). The camera's lean ends and the follow eases back to exactly the view it held (the fight has not moved).
- **The effects.** While its moment plays, the ultimate's own effects (events by the caster on its cast tick, and its salvo's blows while it is
  waited for: `Fx.epic`, set by `UltMoments.note`) are drawn about twice the size: every particle and pack strip (`Particles.boost`, with
  their drift and growth), the painted parts played once (`paintOnce` goes through the particles), the strips `anim` draws, and beams 1.6
  times thicker. A layer already huge only grows to 300 world px across (`boostedScale`), so the old ultimate nova does not turn into a haze.
  Fields, ground loops, auras and walls keep their size (it is the ground they really cover); so do the words. Effects scheduled for later
  (`later`) keep the scale they were scheduled with. Another hero's skill on the same tick is unchanged, and so is every normal skill. The
  old short-version touches (the Pixi dim and the camera push in `skillName`) are left out of the full moment, which has its own.
- **The light.** The dim is a canvas now (`.umDim`, drawn at half resolution): dark but for soft pools over the caster, each one the
  ultimate struck or helped, and each tile it worked on (an area's centre, a dash's ends, a zone, its terrain), with a softer light over all
  of them together when they spread (`litPools`), so a wide effect is never hidden. The pools follow the fighters as the camera moves. As
  the blow lands the dim eases from full to 30 % over 0.42 s (`liftedDim`, a smoothstep, never a step), and the fade takes it out from there.
- **Length.** `IMPACT_MS` went from 850 to 700 ms, so an instant ultimate's whole moment with the 150 ms freeze is the same 2.45 s as before.
  A tap still skips (and drops the freeze).
- **Reduced motion**: no shake, no zoom, no freeze; the band and the lines stand still and fade in and out; the flash is a soft 0.3 fade.
  **Battery saver**: two bursts at most, and the particle density and cap as usual. **No flashing**: nothing that loops changes brightness
  (the lines' and edges' loops move their position only; `test/no-flicker.test.ts` passes); the flash and the name's glow are one-shots.
- **The Last Stand** gets all of it but the zoom (its camera is its own, `standCam.ts`); its `Fx` stays `still`, so no shake there either.

### The painted kit (session `u-ultimate`), imported

The owner's 13 painted sheets (PR #231, branch `art/ult-kit`, merged here) are in `art-source/spell-fx/u-ultimate/`: `ult-speedlines`
(`beam`, 6 frames, a loop), `ult-edge` (`beam`, 4), `ult-gather` (`cast`, 8, once) and `ult-burst-<element>` (`impact`, once, 4 tiles) for the
ten elements. They are in `tools/spell-fx/spell-parts.json` under `u-ultimate` (`import-spell-art.py --check`: 13 of 13 pass) and packed
into `src/art/fx/spells/u-ultimate.webp` (1536x672, 229 KB; all the atlases 3.28 MB of the 5 MB cap with main 0.259.0's repaints) with its entry in `index.json`. Only
that session was added: every other atlas is byte for byte as on main and their `index.json` entries are unchanged (another worker is
importing repaints of b, e, f and g). `build.mjs` already copies every atlas and lists it in the service worker. Contact sheet of the
sources: `docs/samples/ult-epic-kit-contact.png` (the coverage of each frame in yellow); in fights: `docs/samples/ult-epic-after-393.png`,
`docs/samples/ult-epic-kit-elements-393.png` (dark, blood, forest, lightning, fire).

The game uses it with no code of its own: the bursts and the gathering through `spellFrames` (`burstPart`: the kit's burst, else the
fallback), the band's speed lines and edges on a canvas (`.umKit`, drawn from the atlas's picture, `spellImage`, tiled and scrolled, tinted
to the element) in place of the CSS lines.

**The honest look at each sheet.**
- *The bursts (ten)*: strong and clear on dark boards (the dark one's violet rim reads well); each grows from a seed to a dome with a 2:1 shock
  ring, then dies to faint wisps. Frames 7 and 8 of every sheet are all but empty (under 1 % of the cell), and frame 1 is a small seed (7 %).
  The game holds a burst's first frame through the 0.15 s freeze, so a fix in `tools/spell-fx/spell-fixes.json` plays frames 2 to 7
  (`[1, 2, 3, 4, 5, 6]`): the freeze shows the bloom, and it still ends on faint wisps. At their peak they fill 43 to 54 % of the cell.
- *The gathering*: motes and a tightening ring at the feet over four sparse frames (3 to 7 %), building to a flare in the last; it plays over
  the opening (1.15 s, 8 frames) as painted. Good.
- *The edge*: seamless (left and right columns match within 0.4 of 255), steady (frames differ by about 2): it reads as a glowing wavy line.
  Its sparks hardly move between frames, so the scrolling gives it its motion.
- *The speed lines*: seamless (within 1.4) and steady (no frame fades), but each cell has one big soft white blob in its middle, so tiled
  along the band it is a row of beads rather than one streak. In the band, scrolled and tinted behind the art, the beads blur into a bright
  central streak and it works; held still (reduced motion) the beads show. **Worth repainting**: the middle glow as one even horizontal
  band running out of both edges (seamless like the lines), not a blob. (Repainted so in round 2: [spell-art-repaint.md](spell-art-repaint.md), "Round 2".)
- **Poison** was not seen in a fight (the Gorgon's test fight ended before her ultimate); its sheet looks right on the contact sheet.

**Fallbacks kept** for a missing atlas (an old build, or the session left out): the burst falls back to the strongest painted burst the game
has for the element (`FALLBACK_BURST`: Meteor Swarm's for fire, Thunderwave's for lightning, Holy Nova's for light, Circle of Death's for dark,
Spike Growth's for the forest, Plague Tide's for poison, Seismic Slam's for earth, Whirlwind's for wind, Reap's for blood) drawn about 3
tiles across, or the pack's element burst at 3.2 times for ice; the band's lines are CSS. **A missing atlas costs nothing**: the atlases are
loaded from `index.json`'s sessions only, so no request is made for one that is not there (the capture tool counts 404s: none, with and
without the kit).

### Files

- `src/ultEpicRules.ts` (pure): `ULT_EPIC` (scale 2, beam 1.6, the 300 px cap, hit-stop 150 ms, zoom 1.3, lift to 0.3 over 420 ms, shake
  0.75, five bursts or two, the pools' radii), `KIT_SESSION`, `KIT`, `burstKey`, `FALLBACK_BURST`, `burstPart`, `ultScale`, `boostedScale`,
  `epicEvent`, `ultTargets`, `burstSpots`, `litPools`, `liftedDim`, `ultZoom`.
- `src/ultMomentRules.ts`: the queue's freeze and blow (`strikes`, `stopLeft`, `since`, `calm`, `strike`, `land`), the lifted `dim`,
  `IMPACT_MS` 700; a moment carries its element and what it touched (`el`, `targets`, `landing`).
- `src/ultMoment.ts`: the dim canvas, the moving band and the kit canvas, the gathering, the impact (bursts, flash, sting), `focus`; new
  options `tile` and `fx`.
- `src/render/fx.ts`: `epic`, `setEpic`, the `moment` layer, `stepMoment`, `ultGather`, `ultImpact`, the boost in `anim`, `later` and
  `paintBeam`. `src/render/particles.ts`: `boost`. `src/render/spellArt.ts`: `spellImage`.
- `src/render/soundRules.ts`, `src/render/audioProcessors.ts`: the `ultSlash` and `ultImpact` cues, measured with `tools/audio-mix/measure.mjs`
  and set to their targets in `tools/audio-mix/targets.mjs`: the slash -22.4 LUFS momentary (gain 2.49), the impact -18.2 with its peak at
  -3.1 dBFS and nothing over the limiter (gain 1; the ultimate's own cue is -16), so the blow sits just under the cast.
- `src/main.ts`: the moment's anchors through the world's own scale (`toClient`, so the light stays on the fighters while zoomed), `tile`,
  `fx`, and the camera's lean (`ultm.focus`). `src/standView.ts`: `tile`, `fx`.
- `src/fightHud.css`: the moving band, the lines, the edges, the flash, reduced motion.
- `tools/spell-fx/spell-parts.json` (the kit), `tools/spell-fx/spell-fixes.json` (the bursts' frames), `tools/spell-fx/import-spell-art.py` (its
  docstring); `art-source/spell-fx/u-ultimate/` (the owner's sheets), `src/art/fx/spells/u-ultimate.webp`, `index.json` (the session added).
- Tests: `test/ult-epic.test.ts` (new); `test/ult-moment.test.ts` (the freeze after the opening, the lifted dim in the fade, the length with
  the freeze); `test/spell-fx.test.ts` (the manifest's count: 144 sheets, 271 rows with the kit).
- Screenshots: `tools/ult-epic/shots.mjs` (its own clock: the Pixi ticker stopped and the page's frame stepped by hand, the CSS animations
  moved with it, so every run takes the same pictures) and `tools/ult-epic/strips.py`.
