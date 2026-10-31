# Auto-spend for talent points (TALENT-AUTO)

The owner's ask: "We need an auto-spend for a hero's talent points."

## How it chooses (`src/sim/talentAuto.ts`)

`autoPlan(meta, kind)` gives the nodes to learn, in order, for the hero's free points; it changes nothing. Each node is scored for
the hero's calling (`DEEP_KITS` in `talentsDeep.ts`): what it gives is sorted into four leanings (guard: health, defence, dodge,
blocks, thorns, shields, a revive; harm: attack, crits, attack speed, the skill's and ultimate's strength, bleeds, bursts, rage;
mend: regen, healing, leech, healing auras; aid: charge, haste, reach, longer skills, slows and holds, rallies, stealth), each
counted in about a first-row node's worth, and each leaning is weighed for the calling (`CALLING_LEANS`: a bulwark values guard
most, a duelist, berserker, marksman or archmage harm, a healer mending, a support aid). Of each pair the better-scored node is the
one considered. Then, of every set of nodes the free points can reach under the tree's own rules (every step is tried with
`learn` on a copy of the hero's talents, so prerequisites, rows, pairs, level gates and costs are `talents.ts`'s, never copied),
the plan is the one that spends the most points; of those, the one that goes deepest down the tree (towards the capstones rather
than spreading thin); of those, the best score; a last tie falls to the earlier node ids. It is learned along the path: the best two
of the first row, then a row at a time down to the deepest, then the rest of the first row. No randomness: the same meta gives the
same plan. A point is only left over when nothing it could buy is open yet (the next row costs more, or waits for a level).

So with four points and nothing learned a hero takes two stat nodes and a second-row node rather than all four stat nodes; a knight's
two cheapest picks are Tempered Steel and Sturdy Greaves (hp, defence) where a samurai's are Whetstone and Calm Mind (attack, crit);
the knight's deep rows go Iron Resolve, Last Stand, Immortal Bastion.

`autoSpend` learns a plan through `learn`; `autoPlanAll` / `autoSpendAll` do every hero of a list with something to learn.

## Where it is

- **The talent tree** (`src/talentView.ts`): "Auto: spend N points" under the heading, only when the free points can learn
  something now. It opens the same box as a node's (`.tModal` / `.tBox`): "Learns 4 talents for 7 of your 7 points", the nodes in
  order with their pictures, row and cost, any points kept for the next row, and Confirm (learns them one by one with `learn` and
  saves, as tapping each would) or Cancel.
- **The Upgrades list** (`src/rankUpList.ts`): "Auto all talents (N)" under "Upgrade all" when any hero has points to spend (gold
  when nothing else is ready). It opens the list's own confirm (`.ulAsk`) with each hero, "7 of 7 points" and the picks in order;
  "Spend all" learns them and saves, and the talent rows turn to "all spent". "Upgrade all" still never spends talents.

## Checks

- `test/talent-auto.test.ts` (`npm test -- talent-auto`): across every hero, thirteen levels from 1 to 100, 0 to 3 shard points and
  hand-made partial trees (some with the "worse" of a pair taken), every pick is learnable when its turn comes, planning changes
  nothing, the spend equals the most any legal order could spend (a brute-force walk of every node) and leaves nothing learnable,
  the same meta gives the same plan, the path order, and the calling fit (bulwarks' pair picks lean more to guard than duelists',
  duelists' more to harm, healers' more to mending).
- `tools/talent-auto/shots.mjs` (after `npm run web`): the list, its Auto all confirm, the knight's tree with Auto, its box and the
  tree after Confirm, then Spend all, at 393x852, 360x780 and 412x915, checking the boxes sit inside the screen and the points are
  spent. Samples: `docs/samples/talent-auto-*.png` (every screen at 393x852; the two confirms at the other sizes).
