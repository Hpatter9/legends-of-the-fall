# The run

`src/sim/run.ts` holds a run: gold, the stage, a roster of owned heroes (kind and grade 1-3, each with its own id) and
the squad (at most five roster ids that fight). It is pure; the page saves it to `localStorage` under `legends.run`.

- **Summon** costs 30 gold, 5 more each time; the kind is drawn from `mixSeed(seed, 0x5033, nextId)`. A run starts with
  70 gold and two free grade-1 heroes (already in the squad).
- **Merge**: the third hero of a kind and grade makes one of the next grade at once, taking the squad place of the oldest.
- **Grade** multiplies hp and attack by 1.6 per grade above the first. A hero's skills scale with its attack.
- **Stages**: stage n meets the n-th band in turn; its foes are `FOE_START` (55%) of their stats at stage 1 and gain 20% of
  that for each stage after (`stageBoost`); every 5th stage the first foe is a boss (drawn x1.5). The bosses are the walls of a run: the first (stage 5, the
  orc warlord) has six times the hp and three times the attack of its kind, and each later boss is stronger than the last
  (`foes.ts`). A win pays 20 + 6n gold (+30 on a boss stage); a loss ends the run.
- **battle.ts** changes: `Unit.power`, `tag` and `size`; `addUnit`, `place`, `unplace`, `canPlace` take an optional
  boost and roster `tag` (so two knights can fight side by side); `startBattle` takes a `Stage` for the foes. Attack
  reads through `atkOf`. Calls without the new arguments behave as before.
- The page: gold and stage in the top bar, a Summon button beside Fight!, the roster as the bench (stars per card; the
  bench scrolls when there are many), and Next stage / New run on the result screen.
