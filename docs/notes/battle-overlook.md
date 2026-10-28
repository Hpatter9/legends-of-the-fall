# Battle cliffside overlook — 0.172.0

UI-006, owner: Codex. Branch: `design/battle-overlook`, worktree: `/workspace/legends-of-the-fall`. The owner approved the cliffside concept and distant Calamity, then requested distinct army-dependent camps and explicitly authorised the version bump and PR merge. Implementation and release validation are complete; GitHub PR integration follows.

The Battle tab now looks down from a rocky command ledge into the current army's base. The selected party appears as interactive, animated game sprites, alongside the campfire, war table, supplies, earned chests and Duchess. A floating shattered Calamity citadel looms beyond the valley: a silhouette and star requirement while locked, violet rift and the existing Calamity entry flow once accessible.

## Nine army bases

Each army selects its own original painted landscape, not just a tint on the same field:

| Army | Scenery |
| --- | --- |
| Orc Warband | Red-hide siege tents, spiked palisades, watchtowers and siege supplies |
| Undead Legion | Graveyard, crypts, mausoleums, broken fencing and ghost flames |
| Beast army | Snowy hunting grounds, caves, giant bones and fur shelters |
| Wildwood | Elder-tree stronghold, root bridges, lanterns and druid circles |
| Labyrinth | Interlocking stone maze, blind alleys and a minotaur temple |
| Ogre Clans | Giant hide lodges, bone gates, cauldrons and clan fires |
| Infernal Host | Basalt fortress, lava channels, summoning grounds and demon gates |
| Yokai Night Parade | Haunted shrine, torii gates, pagodas, spirit lights and lantern paths |
| Golem Forge | Furnace halls, cranes, ore tracks, assembly yards and crystal conduits |

Three atlases contain three equal horizontal scenes each. The renderer blends the selected panel into the shared valley with mist at its edges; the original cliff, sky and Calamity stay in place. Each camp has its own 8–12 decorative occupants and boss position. The creatures and boss come from that army's actual wave roster. This replaces the earlier identical 96-person parade formations. Painting, masks, positions and small rigs are prepared outside the animation loop.

The active saved army takes priority over the next unbeaten unlocked army, preserving the existing selection rule. Daily challenge and Last Stand have dedicated plaques below the company. The army plaque and painted war table open the party. Earned chests stay accessible by the supplies; the command bar shows real star/wave progress, Choose your battle, Party and Continue when appropriate. Existing mode unlocks and saved-run access remain authoritative.

Reduced motion freezes the decorative scene. Battery saver retains its frame cap; the scene stops under other tabs or hero sheets. The four environment images are imported as bundled data URLs inside `game.js`, which the existing service worker caches. No new externally loaded artwork, simulation changes or save-key changes are introduced. Art credits are in `CREDITS.md`.

## Validation

On the integrated release based on main `7e8e9a0f` (0.171.0):

- `npm run typecheck` — passed.
- `npm test -- overlook camp armyStars modes party summon-stones` — **66 tests passed**, zero failures. Coverage includes per-army scenery selection and occupant positions, real field-creature selection, portrait control separation, army chest rewards, existing modes/party behaviour and summoning-stone integration.
- `npm run web` — passed at version **0.172.0**.
- `node tools/ui/battle-overlook-check.mjs` — passed at **393×852, 360×780 and 412×915**, DPR 2. All nine camp panel IDs and actual background pixel hashes differ. Saved-run army priority, all boss/crew rigs, small occupant groups, locked/open Calamity and Last Stand, Daily, party selection, army selection, hero taps, unobstructed controls, reduced-motion stability, opaque scene frames, saver mode and tab lifecycle passed with no page errors.
- A real service-worker-controlled reload with networking disabled passed, followed by switching through **all nine camp paintings offline**. The script uses `localhost` for this because the existing service-worker registration is restricted to HTTPS or that hostname.
- Actual game screenshots inspected for all nine camps, including the graveyard and maze at the smallest phone size. The comparison sheet below contains crops of real browser captures, not a concept render. Camp silhouettes, scenery differences, blending, labels, hero feet and foreground control clearance were reviewed.
- `git diff --check` — passed.

Main's world-rendering, harder Last Stand and summoning-stone changes are retained. Only credit/task-board conflicts needed manual reconciliation; both sides' records and credits were preserved. Package and lockfile are bumped together to 0.172.0. The temporary Claude-transfer material was removed from the release tree after the owner resumed this task; the actual source artwork remains in the repository.

## Actual browser images

- [All nine camps](../samples/battle-overlook-camps.png)
- [393×852](../samples/battle-overlook-393.png), [360×780](../samples/battle-overlook-360.png), [412×915](../samples/battle-overlook-412.png)
- [Undead graveyard](../samples/battle-overlook-undead.png), [360px](../samples/battle-overlook-undead-360.png), [412px](../samples/battle-overlook-undead-412.png)
- [Labyrinth](../samples/battle-overlook-labyrinth.png), [360px](../samples/battle-overlook-labyrinth-360.png), [412px](../samples/battle-overlook-labyrinth-412.png)
- [Locked Calamity](../samples/battle-overlook-locked-393.png)
- [Offline launch](../samples/battle-overlook-offline.png)

Changed systems: `src/camp.ts`, `src/render/overlookLayout.ts`, `src/campPlaces.css`, small Battle-tab edits in `src/home.ts`, environment artwork, credits, targeted checks and release metadata. Existing war-camp geometry helpers remain for reference. The owner can archive this task chat after release; the agent cannot archive it.
