# SUMMON-ART: the summons drawn in their own sprites

The owner: "Redraw or use different sprites for the summon." (the units heroes call up in a fight.) Looks only: no rule, stat or
`UNITS` entry changed (`UNITS.wolf.sheet` is still `wolf_grey`, as `test/tier-skills.test.ts` pins), so fights play out the same.

## What was wrong (`docs/samples/summon-art-before.png`)

| Summon | Caller | Before | The trouble |
| --- | --- | --- | --- |
| Wolf | Beastmaster | `wolf_grey` (`wolf_black` at tier 3) | A stocky pup; its four walking frames and four bites were nearly the same picture, its fall a turned frame |
| Dire Wolf | Beastmaster (tier 3) | `wolf_black` at 0.85 | The same pup, black and blown up: big chunky pixels |
| Treant | Druid | `hero_res_treant` (by grade) | The Druid's own Wild Shape form: a summoned treant looked like a second Druid |
| Wraith | Reaper | the fallen foe's own sheet, tinted blue | A skeleton or orc in blue: read as a foe |
| Standard | Samurai Commander | the castle banner (25x79, one still picture) | Tiny, no animation at all (no fall, no flinch) |
| Decoy | Illusionist | `hero_res_illusionist` at 0.44 | A small copy of the Illusionist: a second hero on the field |

## What they are now (`docs/samples/summon-art-after.png`, the same sheet)

| Summon | Sheet | Source |
| --- | --- | --- |
| Wolf | `summon_wolf`, `summon_wolf_white` at tier 3 | whtdragon's MV wild dogs (grey, white): a lean wolf with a real trot, doubled by whole pixels |
| Dire Wolf | `summon_direwolf` | the black wild dog, drawn bigger |
| Treant | `cls_treant`, `cls_treant_2`, `cls_treant_3` by grade | the Druid's older mossy treants, already in the game and no longer her own shape |
| Wraith | `summon_wraith` | batareya's blue spirit (Golems and elementals, figure 13); it no longer takes the fallen foe's look |
| Standard | `summon_standard` | the war camp's standard without its sand plot, pennants stirring |
| Decoy | `summon_decoy` | batareya's violet crystal figure (figure 33): a mirage of glass |

Every sheet has walk, attack, idle, hurt and dead rows (the treants: walk, attack, idle, dead). `tools/summon-art/cut.py ../chronos-assets`
cuts them (whole-pixel moves only: the wolves' bite is a crouch and a lunge with the head raised, their fall the body sunk with its legs
folded away; the wraith and decoy come apart pixel by pixel; the standard keels over).

**Reading as an ally:** each summon stands in a small ring of its caller's element colour (`summonMark`, the caller's `auraOf` colour),
and wears no class aura of its own (the fiery aura a tier 3 summon wore hid it). The wraith and decoy are drawn a little see-through
(0.88, 0.85). None of the sheets is a hero's or a foe's (the test checks).

## The code

- `src/render/summonArt.ts` (pure): `SUMMON_LOOKS` (each summon's sheets by grade, scale, caller, alpha), `summonSheet`, `summonMark`,
  `SUMMON_SHEETS`.
- `src/render/sheets.ts`: the new sheets imported (bundled as data URLs, so nothing new for the service worker) and loaded with the rest.
- `src/render/unitView.ts`: a summon takes its sheet and scale from `summonArt.ts`, keeps its own look (a kit's borrowed look is
  ignored for it), its ring under it, no class aura; the castle-banner override and the wraith's tint and fade are gone.
- `test/summon-art.test.ts`: every called-up kind has a look, a caller and a mark; the sheets exist with their rows and are no hero's or
  foe's; the grade forms.
- `tools/summon-art/contact.py before|after` (the review sheets), `tools/summon-art/shots.mjs` (a fight with the five callers and their
  summons set out: `docs/samples/summon-art-fight-393.png`, `-360.png`, `-412.png`, close crops in `summon-art-fight-closeups.png`).

Not changed: the Duchess and the Last Stand's king (summon-flagged but not called up), the foes' summons (imps, skeletons).

## Questions for the owner

- The wolves come from the same RPG Maker animal pack as before (now its leaner wild dogs, with a real trot); no pack has a
  side-view wolf drawn at the heroes' detail. If they still look too plain, a generated wolf sheet would be the next step.
- The decoy is now a violet glass figure rather than a copy of the Illusionist. If a mirror image of her was wanted (only shimmering),
  say so and it can be her sheet drawn see-through and tinted instead.
