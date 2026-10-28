# Individual ability effects (FX-003)

The owner asked whether FX-002 made every skill and spell visually unique. The earlier pass covered them all but reused 32 painted shapes. The owner then explicitly requested a separate recognisable signature for every ability, beyond colour or size changes. This continues the already-approved cinematic fantasy direction on `design/battle-effects-remake`, worktree `/workspace/legends-of-the-fall`, owner Codex. The owner subsequently accepted the implementation and authorised release 0.168.0 and merge; see the release section below.

## Individual artwork and choreography

The complete catalogue contains **129 individual lead paintings**: 90 hero skills/ultimates, 18 additional named enemy abilities and 21 king's spells. Identically named hero and king magic have separate source cells, including Meteor, Chain Lightning, Hex, Earthquake and Starfall/Meteor Shower. Units that share the same named skill intentionally share its signature.

The manifest in `src/art/fx/abilities/catalogue.json` records the authored motif and atlas/cell for each ability. Eight 4×4 atlases and a final single painting provide the source art. Shipping sheets are 768px (192px per cell), with the final painting at 256px; the runtime prepares reusable 128px materials and releases its references to the decoded sheets. All source artwork is bundled into the offline-cached `game.js`.

`abilityArt.ts` resolves individual art independently of the old strip vocabulary. The first cast and first hit layer of every skill signature select that art. `individualReleases.ts` gives all 108 named skills explicit layouts suited to the complete paintings, with fewer copies than the old primitive particle arrangements. For example, Shield Wall forms a short row of interlocking shields and Last Bastion forms one broad luminous fortress. Ordinary supporting motes, ground waves and character sprites remain shared for consistency.

`spellSignatures.ts` supplies separate artwork and a different release shape for each of the 21 king's spells. Spell release locations use the recipients already present in the event batch where available, including single-target effects. Royal meteor/shower area events select their own artwork independently of hero meteors; both flight and landing retain that identity. Non-fire royal hits no longer receive the old generic fire-explosion overlay. Royal poison ticks keep a small version of Poison Cloud's own motif.

Material motion remains continuous and follows the battle clock. Individual comets/feathers point along their trajectory rather than tumbling. Chains stretch along the connection instead of scaling a square painting to the entire link distance. Reduced motion and battery-saver density/caps remain supported. The loader removes tiny detached peripheral fragments from neighbouring atlas cells while retaining central details, nearby sparks and substantial separate shapes; cell edges stay feathered.

The audit also found and fixed the earlier loader's handling of `moon`, `star` and `water`. These supporting elements have proper palettes and shapes now; coverage checks all 225 names in the actual material catalogue, rather than only the original ten base elements.

No simulation, save, balance, sound or player-facing ability descriptions changed. Existing signature props, functional status markers and tactical tile highlights remain reusable supporting elements. This is individual lead artwork and staged choreography, not a claim that every supporting particle is exclusive to one ability.

## Validation and review

- `npm run typecheck` and `npm run web` passed.
- `npm test -- individual-ability cinematic-fx signatures skill-fx combat-fx spectacle vfx motion no-flicker` passed: **53 tests across nine files**. Coverage checks the complete live skill/spell catalogue, different actual source cells, no tint-only individual leads, 21 different royal release shapes, valid transparent shipping sheets, all supporting palettes and removal of neighbouring-cell fragments.
- `tools/fxlab/ability-checks.mjs` exercises all 129 IDs through the real renderer at 393×852, 360×780 and 412×915, plus reduced motion and battery saver at 393×852. It inspects the material actually emitted by each release, checking 128px sources, 32px logical size, linear filtering, visible artwork, transparent edges, unique pixel hashes, unchanged battle state and cleanup. Representative battlefield captures compare Shield Wall/Last Bastion, Benediction/Holy Light, Heal/Renewal, Frost Nova/Deep Freeze and the hero/king Meteors. Screenshots advance in 20ms steps so newly born effects are captured at the intended time.
- The existing cinematic browser suite passed all five cases during this pass, including 90 actual hero skill/ultimate cues and all king spells; the 393×852 case passed again after the royal-hit routing changes. The existing polish browser suite passed all five cases, preserving dash silhouette counts, density, battle-state isolation and cleanup.
- The offline check passed after a fresh service-worker cache and disconnected reload; both an individual hero Meteor and the king's individual Heal artwork remained available. No page errors were reported.
- Reviewed all nine contact sheets and representative battlefield captures at the three required portrait sizes. The gallery also ranks the closest greyscale silhouettes for side-by-side inspection, ignoring colour so a palette swap cannot stand in for a different shape. These are controlled renderer checks, not an exhaustive playthrough or a physical-phone performance measurement.

Final browser report and review artifacts are linked below.


## Review files and handoff

[Battlefield comparison](../samples/individual-ability-battles.png). The contact sheets show **actual textures captured from live renderer emissions**, rather than concept paintings or merely the source-file list:

- [Abilities 1–16](../samples/individual-abilities-01.png)
- [Abilities 17–32](../samples/individual-abilities-02.png)
- [Abilities 33–48](../samples/individual-abilities-03.png)
- [Abilities 49–64](../samples/individual-abilities-04.png)
- [Abilities 65–80](../samples/individual-abilities-05.png)
- [Abilities 81–96](../samples/individual-abilities-06.png)
- [Abilities 97–112](../samples/individual-abilities-07.png)
- [Abilities 113–128](../samples/individual-abilities-08.png)
- [Ability 129](../samples/individual-abilities-09.png)

[Individual material audit](../samples/individual-ability-checks.json), [offline result](../samples/individual-ability-offline.json), [closest greyscale silhouettes](../samples/individual-ability-closest.png).

Use `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright` in this environment, with the production `out/web` served at localhost:8000. `FX_CASE` selects a single case for the browser scripts. `python3 tools/fxlab/ability-gallery.py` builds the contact sheets and comparison from the captured emitted materials. `import-ability-art.py` takes the nine generated source PNG paths in atlas order and prepares shipping sheets.

Scope of the artwork count: the 108 named cast abilities in `KITS` plus 21 king spells. Tier upgrades retain and strengthen their parent skill's visual family; functional status markers, supporting sparks and combo choreography remain shared supporting systems. Ready for owner visual review; the final reports and comparison files are saved. The implementation handoff preceded release; the owner has since authorised the bump and merge recorded below.

## Release 0.168.0

The owner accepted the implementation and requested the version bump and merge. Integrated main 0.167.0, preserving its epic audio overhaul and royal citadel courtyard. Only CREDITS.md conflicted; the upstream credits were retained with both effects artwork sections appended. Release version: 0.168.0 in package.json and package-lock.json. Release integration validation passed: typecheck, production build, 84 focused effects/audio tests, all five individual-ability browser cases (three portrait sizes, reduced motion and battery saver) and offline reload. All 129 emitted materials remained distinct, with unchanged battle state and cleanup. No simulation or sound changes were introduced by this effects release. Pull-request submission and the authorised merge follow these checks.
