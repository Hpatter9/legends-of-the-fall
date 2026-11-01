# STATS batch 5: saves

The fifth batch of the owner-approved D&D stats design ([rpg-stats-design.md](rpg-stats-design.md), section 14 batch 5, section 3.3, and the
owner's answers of 31 October 2026: a successful save halves the effect; foes use the same rules, with Legendary Resistance for the bosses).
Built on batch 4 ([stats-4.md](stats-4.md)), released to main as 0.323.0 and merged in; every number below is measured against that code.

## What it does

- **Skill DCs and the six saves** (`src/sim/saves.ts`). When a fighter lays an ailment, a charm, a shove or a drag on a fighter of the other
  side, or a blast lands on it, the target rolls d20 + its save against the layer's skill DC (8 + proficiency + its casting ability). A
  hero's save is its modifier, + proficiency in its calling's two trained saves; a foe's comes from its family block (`foeStatsOf`).
- **Which save** (`SAVE_OF`, the design's table): STR against shoves, drags and weakening; DEX against blasts; CON against poison, bleeding,
  burning, chill and freezing, shock and stuns; INT against silence; WIS against fear and charm; CHA against curses.
- **A save halves it** (`SAVE_SHARE`): half the time of an ailment or a hold (`gate` in `ailments.ts`, and `charmFor`), half the damage of a
  blast (`landArea`: volleys and meteors), a shove or a drag a tile shorter (`toolkit/move.ts`, and the old shoves of `kits/common.ts`: the
  Shield Bash, the Bull Rush, Duchess's Headbutt). A launch is a throw, not a shove, and is not saved.
- **Who lays it.** An ailment that names its layer (a blow's rider, a zone, a trap, a talent or gear proc) is saved against that fighter's DC;
  one a skill lays without naming it is saved against the caster's (`ailCtx.by`, set by `powered` while a skill is cast). Nothing laid by no
  fighter is saved against: the land and its hazards, the king's spells, the combos and the Eidolons. A fighter never saves against its own
  side.
- **"Saved"** on the fight's numbers (`src/render/fx.ts`): the "Immune" pop's look and colour, the word "Saved", with the ailment's chip (not
  crossed out: it still takes hold, for half as long); a saved blast, shove or charm shows the word alone.
- **The shoves' contest** (`shoveTiles`, `CONTEST_GAP` 2): a shover whose STR modifier is 2 or more above the target's moves it a tile
  further, 2 or more below a tile less; then the target's STR save takes a tile off. A shove left with no tile does not move it (and a Bull
  Rush that moves it nowhere does not stun it: it was shaken off, not stopped).
- **Legendary Resistance.** A boss (a boss kind, or a band's leader drawn bigger: `ailBoss`) makes no saving throw: its save is its old
  ladder, unchanged (`AIL.BOSS_SHARE` and `hardGate`), and its shoves its old halving. The unit card names it among a boss's traits:
  "Legendary Resistance · hard control fades faster, and three in a row it shrugs off" (`LEGENDARY_RESISTANCE`, `unitInfoRules.ts`).
- **The fit** (`saveFit`, as the blows' `blowFit`). So that this batch moves no mode before the joint rebalance, a lay is lengthened (a blast
  strengthened) by what the saves take off on average, measured for the ordinary hero (the roster's mean at level 1). A hero's own DC and
  saves show; a foe's family block is fitted out, so it changes how often a foe saves and is saved against, not how long its ailments last
  on average. So against a brute (CON +5 trained) a hero's stun that is not saved lasts about 1.45 times its written time and a saved one
  about 0.7 times; against a frail caster nearer the written time either way.
- **The foes stay matched** to the heroes' growth (the owner's rule from batch 4): a foe's DC rises by as much as the placed heroes' save in
  that ability has grown since level 1, its saves by as much as their DC has, and its STR for the contest by as much as their STR modifier
  has (`matchOf`, kept exact: a part of a point is a whole one that part of the time, its own hash of the moment).
- **The page**: `LIVE.shove` is on, and STR's tap line says "shoves further, resists shoves" (the climb, Athletics, waits for batch 6, so
  "climbs higher" is gone from the line). The DC and saves lines were already shown.
- **A switch** (`SAVES.on`, on in the game): off, a fight plays batch 4's rules exactly (no save, no fit, no contest), for measuring.

## The heroes lifted and trimmed (the owner's rule: by their own kit)

At level 30 the saves put two heroes out of the band and one on its edge; only their ultimates' strength (`TUNE` in `ultimates.ts`, from
level 30) moved, so level 1 is untouched:

- **Warlock** 0.929 → 1.0 (−6.5 before; the Circle of Death's curse and burn are CHA and CON saves, and his robes give poor saves of his own);
- **Time Witch** 0.735 → 0.85 (−6.8 before; Time Stop's hold is a CON save);
- **Minotaur** 2.983 → 2.7 (+6.0 before).

### Parity (12,000 random teams; `test/hero-balance*.test.ts`, the band is 6)

| | Batch 4 | This batch |
| --- | --- | --- |
| Level 1 (stage 5): spread | +5.6 to −4.5 | +5.5 to −4.5 (Arc Blade, Yamabushi) |
| Level 1: the average team wins | 54.6% | 53.3% |
| Level 30 (stage 78), before the lifts | +5.3 to −4.8 | +6.0 to −6.8 (Minotaur; Time Witch −6.8, Warlock −6.5) |
| Level 30, after | | +5.8 to −5.3 (Werewolf, Kraken) |
| Level 30: the average team wins | 60.1% | 58.8% |

## The numbers against batch 4 (main 0.323.0; the same seeded tools, both trees run side by side)

| What | Batch 4 | This batch |
| --- | --- | --- |
| Armies, single tries, 96 saves (clear, waves of 15): Undead 8 | 5%, 10.3 | 4%, 10.1 |
| Beasts 15 | 56%, 10.5 | 58%, 10.7 |
| Wildwood 22 | 80%, 12.7 | 76%, 12.2 |
| Labyrinth 30 | 19%, 4.0 | 18%, 3.6 |
| Ogres 38 (96 saves; 288 saves) | 9%, 3.8; 8%, 3.4 | 3%, 3.4; 6%, 3.4 |
| Golems 52 | 0%, 4.9 | 0%, 4.9 |
| Orcs Legendary 55 | 84%, 14.8 | 77%, 14.8 |
| The Orc Warlord at level 1, 96 tries | 19 (20%) | 23 (24%) |
| A fresh party's first wave, 96 saves | none lost | 1 lost (save 8) |
| Daily, 120 dates, fresh save (with hearts / none) | 83% / 64% | 83% / 63% |
| Daily, 168 dates (the test's own play) | 139 | 140 |
| Last Stand, 40 runs, median wave at 1 / 10 / 30 (mean) | 4 / 9 / 15 (3.7, 8.7, 15.9) | 4 / 9 / 15 (3.9, 8.6, 15.5) |
| Calamity, 100 runs, mean maps (map 2 / map 3) | 1.90 (81% / 9%) | 1.89 (81% / 8%) |
| Spire, 96 runs, mean floors, castle full / none | 87.6 / 82.0 | 89.3 / 82.7 |

(The armies' and spire's cells are `SAVES=96 node tools/merge-two/run.mjs`, batch 4's yardstick; batch 4's tree gives its note's numbers
exactly. The run of this batch's cells was taken before the three ultimates above moved; they touch only those three heroes at level 30.)

Watch items for the joint rebalance: the Legendary Orcs at 55 (77% against 84%; the mean waves did not move) and the first wave (below).

## Tests

- **`test/stats-saves.test.ts`** (new, 9 tests): the DC and the saves; **a CON 20 hero shakes off poison more often than a CON 12 one** (the
  Knight at level 20 against the Wizard at level 1, a skeleton's grave-rot: each at the d20's odds, and a real lay saved is half as long and
  says "Saved"); the fit (the ordinary hero takes a foe's ailment as long as before, on average); the foes matched; **a saved shove is a
  tile shorter**, and the contest a tile either way; a saved blast deals half; **bosses as before** (with the saves on and off a boss's
  holds and poison last the same, and it never shows "Saved"); the same moment gives the same save and a fight replays the same; STR's line.
- **The kit-rule tests stage each skill's written numbers** (stunned 3s, shoved 2 tiles): the saves are held off in them (`SAVES.on =
  false`) and staged in `stats-saves` instead, as batch 4's toolkit tests stage the move rule: `toolkit`, `mages`, `melee`, `monster-heroes`,
  `monsters`, `ranged`, `relics-3`, `skill3`, `tanks`, `ultimates`, and one test each in `new-heroes` (Thousand Fists) and `skill-levels`
  (the Level 5 probe). Those files' balance sweeps keep the saves on.
- `stats-blow`: the match carries the DC, the saves and STR.
- **Pinned to windows at the measured rate** (noise on a fixed sample, confirmed on a larger one; bars unchanged):
  - the daily (`daily`): over 168 dates 140 clears here and 139 on batch 4 (83%); the first 56 read 48 (86%, over the 85% bar); dates 113 to
    168 read 47 on both;
  - the Orc Warlord wall at level 1 (`armies`): 23 and 19 of 96 (24% and 20%); tries 16 to 23 read 3 here; tries 40 to 47 read 2 on both;
  - the first wave won every time (`armies`): seeds 1 to 24 include save 8, which loses its first wave here. A fresh party loses the first
    wave rarely on both codes: save 8 over 300 fight seeds loses 3 here and 1 on batch 4 (all checks together, 4 of 396 against 1 of 396).
    Seeds 25 to 48 win all 24 on both. **A watch item.**
- **Re-recorded:** every identity scenario (`spells-identity`, `ailments-identical`) and the Last Stand's pinned ordinary fights
  (`stand-regression`): a save rolls in every fight with an ailment, a shove or a blast.

## Determinism and saves

A save's d20 is a hash of the fight's seed, the moment, the pair and the thing saved against (`SAVE_SALT`), never a draw from `b.rng` or
`b.skillRng`; a fight replays from its seed, placing and orders (a test). Nothing new is saved: the match lives on the fight's `blowMatch`.

## Checks

`npm run typecheck` clean. The full `npm test`: see the report. `npm run web` built. The renderer change is a label over a fighter in the
"Immune" pop's style; no phone screenshots (a save can't be set up on demand in the page).

## Open for the owner

1. **The save fit** (`saveFit`): a lay not saved lasts longer than written and a saved one half that, so the average is as before for the
   ordinary hero. Recommended: keep it until the joint rebalance, which can let the saves shorten control on purpose with the modes retuned.
2. **Bosses make no saves**: their Legendary Resistance (the old ladder) is their save, so they behave as before. The design also gives them
   every save trained; recommended: leave that with the bosses' blocks for the joint rebalance (`BOSS_BLOCK`).
3. **What does not save**: the land, the king's spells, the combos and the Eidolons; and launches (a throw). Recommended as is: none has a
   caster with a DC, and the Eidolons' strike never rolled.
4. **Blasts**: only the volleys and meteors (`landArea`) take a DEX save in this batch; the Wall of Fire, the kegs, the breaths and the other
   splashes do not yet. Recommended: bring them in with batch 6, measured one at a time.
5. **Batch 4's own flags**: the page's `LIVE.crit`, `initiative` and `blowSpeed` are still off, though batch 4 made those effects real.
   Recommended: switch them on (a one-line change and the page test); left for the director, as they are not this batch's.
6. **The watch items**: the first wave (1 in about 100 lost against 1 in 400), and the Legendary Orcs at 55.
