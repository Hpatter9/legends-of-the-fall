# HERO-RISE — a plate over each hero who rose

The owner: "when doing the auto upgrade, there should be a small bar over them that shows what stats went up, and then what skills were
earned on a skill up."

## What shows

A small plate over each hero who rose, dark wood in a brass rim (the fight rows' dress), with a little pointer down at the hero:

- its name, and its new level or stars ("Level 33", "★★", "Rank 4");
- the numbers that went up, in green, on one line: "+695 HP, +18 ATK, +3 pool" (and DEF, crit and dodge when they rise);
- each skill earned, in gold with its painted icon: "New: Fire Bolt" (a level that opens a slot or the ultimate), "Shield Wall Lv 3" (a skill's
  level by use, in pale blue);
- the talents and abilities gained, on one line: "New: Tempered Steel, Sturdy Greaves +4 more".

It rises in, stays about two seconds and fades (2.6 s in all; with reduced motion it only fades). It never takes a tap. A hero with nothing
risen gets no plate.

**Several heroes at once** (Auto merge, "Upgrade all", "Auto all talents", a wave's level-ups): the plates come in 160 ms apart and are laid so
none covers another (`layPlates`): a plate that would cover one already laid is lifted above it; near the top of the screen it is stacked
downward under the others instead; one with no room either way waits for the next round, which comes in where the first was once it has gone.
So a long list (eight heroes learning their trees) shows four plates, then the next four.

## Where

| Rise | By | The plate stands over |
| --- | --- | --- |
| A merge in a deploy | Auto merge (`#mergeAll`), or by hand (a drag or tap onto its match) | the hero on the board, or its card on the bench |
| A wave won: levels, and skills levelled by use | the fight's XP and use points | each hero where it stands on the board at the wave's end |
| Ranks and awakenings | the tavern's Upgrades list: "Upgrade all" and each row's button | the hero's row |
| Talents | the Upgrades list's "Auto all talents" | the hero's talent row |
| A rank or an awakening | a hero page's Rank up / Awaken card (the dossier, the camp's chevron, the awaken panel) | the middle of the page, where the card stood |

Not covered: a level gained from an XP tome on the hero page, the Last Stand's bought levels and the Calamity's own levels (runs with levels of
their own; `run.local` is skipped at the wave's end), and talents picked one by one in the tree. Each could take a plate the same way if the owner wants.

## How

- `src/riseRules.ts` (pure, tested): `shotOfUnit` reads a hero from a unit as the fight would make it (health, attack, defence, its pool's top,
  the crit and dodge its gear and talents add, its open skills with their levels, its ultimate, its talents' and abilities' names); `shotOfHero` makes that unit
  for a hero of the save on a scratch battle (`previewUnit`: the save and the battle are left as they were); `riseOf(before, after)` gives the
  lines; `plateLines` groups them; `layPlates` lays a crowd. The before is taken just before the step (`rosterShots` in `main.ts` before
  `merge`/`autoMerge`; `shotOfHero` before `gainXp`, `upgradeAll`, `takeUpgrade`, `autoSpendAll`, `rankUp`, `awaken`) and the after just
  after, so the plate says exactly what the step changed.
- `src/risePlates.ts`: `showRises` puts the plates on the page (`.rsLayer`, styled in `fightHud.css`), `clearRises` takes them off (going home).
- Tests: `test/hero-rise.test.ts` (the lines, a merge's stars, the level that opens a skill, a rank on the save read without writing to it,
  the crowd's layout and its rounds, the talents grouped and counted once).
- Photographs: `tools/hero-rise/shots.mjs` writes `docs/samples/hero-rise-{merge,wave,upgrade-all,talents,rank}-{393,360,412}.png`.
