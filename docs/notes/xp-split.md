# The kill-XP split

The owner: "The heroes in a fight should get more of an XP split, with the killing hero still getting more, but this way they can
level up a little faster when there's already a powerful hero in the party."

## The rule

`fightXp` (`src/sim/levels.ts`) used to pay each kill's XP (`killXp`, in `Unit.slain`) wholly to the hero that landed the blow. Now
each kill is split:

- the killer keeps `KILL_KEEP` (half) of it;
- the other half goes into the fight's kill pool, shared evenly by **every hero that fought**: the killer too, a hero that fell (it
  keeps what it earned, as before), and a guest (whose share then stays on the guest, `splitGuestXp`, as before). A fighter a hero's
  skill called up adds its kills to its caller's, as before; it takes no share of its own, and nor does a fighter the king's spell
  called up.

So in a party of five a killer keeps 50% + 10% = 60% of its kill and each of the other four gets 10%. A lone hero gets all of its own.
The damage (1 per 40), healing (1 per 40), taking-part (5) and win (5) XP are each hero's own as before. `killShares(b, keep)` gives
each fighter's kill XP by unit id; `fightXp(b, rate, keep)` takes the share to keep as a third argument (`KILL_KEEP` by default; 1 is
the old rule, for the tools). Deterministic: it only re-divides the counters the fight already keeps.

**The XP a fight pays in all does not move** (only who gets it): the shares add up to the kills exactly, and only each hero's rounding
can differ (half an XP a hero at most). Every mode that pays lasting XP through `fightXp` gets it: the armies, auto-replays (the same
path), the daily, the quests. The bench XP (`benchXp`, a tenth of the fighters' mean) is unchanged, as the mean is. The spire and the
Calamity, which pay their own heroes their run XP hero by hero (`fightXpByHero` in `climb.ts`), split the kills the same way (the owner's
answer: keep half, and share in the spire and the Calamity too); their `CLIMB_XP` / `CALAMITY_XP` rates and the Library apply on top as
before. The Last Stand keeps its own sharing (`stand.ts`).

## Measured (`node tools/xp-split/split.mjs`)

**A level-5 hero beside a level-30 carry** (the recruits' party: an archer carry at 30, the weak hero at 5, the other three at 15;
army runs on Normal, the XP added after each fight as the game does, 8 seeds). Before is `keep` 1, after is 0.5:

| weak hero, army | weak XP a run, before → after | carry XP a run | weak level after 1 run / 3 runs, before → after |
|---|---|---|---|
| knight, Orc Warband | 244 → 533 (x2.2) | 2,097 → 1,641 | 5.1 / 7.3 → 6.0 / 9.1 |
| knight, Undead Legion | 370 → 927 (x2.5) | 4,229 → 3,055 | 5.8 / 8.3 → 7.0 / 10.9 |
| warlock, Orc Warband | 627 → 753 (+20%) | 2,063 → 1,624 | 6.6 / 9.3 → 6.6 / 9.9 |
| warlock, Undead Legion | 1,337 → 1,565 (+17%) | 3,985 → 2,999 | 8.0 / 12.0 → 8.5 / 13.0 |

A weak front-liner (who rarely lands a blow) earns two to two and a half times as much and is two levels further after three runs; a
weak striker, who still lands some kills, gains less. The carry still earns about three times the weak one. The party's XP a run is the
same (4,602 / 4,603 on the Orc Warband; the Undead Legion's moves a little, 8,509 / 8,489, only because the weak hero, levelling faster,
changes the later fights).

Lower keeps were tried (the weak knight on the Undead Legion: 0.4 gives 1,042 XP a run and level 11.3 after three, 0.3 gives 1,148 and 11.8);
the half the brief started from already gives a clear lift, so `KILL_KEEP` stays 0.5.

**A party of equals** (the pace tool's measuring party: level 100, every talent, a maxed castle; one run of every army on Normal and Elite,
8 seeds): each hero's XP over the party mean.

| keep | knight | paladin | archer | warlock | cleric | party XP a run |
|---|---|---|---|---|---|---|
| 1 (before) | 0.19 | 0.26 | 2.34 | 1.56 | 0.65 | 74,252 |
| 0.5 (now) | 0.52 | 0.58 | 1.77 | 1.31 | 0.81 | 74,252 |
| 0.4 | 0.59 | 0.65 | 1.66 | 1.26 | 0.84 | 74,252 |
| 0.3 | 0.66 | 0.71 | 1.54 | 1.21 | 0.87 | 74,252 |

The party's total is unchanged to the XP; the spread narrows (the archer, the top earner, from 2.3 to 1.8 times the mean; the knight
from a fifth to a half).

## The level pace (`npm run level-pace`)

The pace tool pays its favourite `--fav` (1.3) times the party mean a run. The mean does not move, so with the same assumption the
table is the same as before. But a favourite who out-earns the mean by taking kills now has a smaller edge: the measured edges above
shrink to a little over half (the archer's +134% to +77%, the warlock's +56% to +31%), so a 1.3x favourite is about 1.17x now.

| level | favourite 1.3x (as before; the same with or without the split) | favourite 1.17x (its edge shrunk as measured) |
|---|---|---|
| 30 | day 4 | day 5 |
| 40 | 29 | 31 |
| 50 | 54 | 58 |
| 60 | 73 | 77 |
| 70 | 91 | 98 |
| 80 | 115 | 123 |
| 90 | 137 | 148 |
| 100 | 162 | 172 |

(20 seeds. The 1.3x column is today's main as it stands; `level-100.md`'s older table, 58 and 181, is from before later changes to the armies.)
So the overall pace barely moves: level 50 about four days later (still about two months), level 100 about ten days later (still under
six months), and only for a favourite that earned its lead by taking the kills; the party as a whole, the bench (level 30 on day 22) and
anyone not the top killer level as fast or faster.

## Tests

`test/xp-split.test.ts` (also for `fightXpByHero`, at the spire's and the Calamity's rates): the killer gets more than any other fighter, and a fighter that made no kill (a fallen one too) gets the
pool's share; the old rule is `keep` 1; a lone hero gets all its kills; a hero's called-up fighters' kills count as its own and a
summon takes no share; in real fights (three seeds) the totals are the old ones within the rounding, every fighter gets a share, the
top killer gets the most kill XP, and a fight pays the same each time it is played. `test/levels.test.ts` is unchanged (its tests
are of one hero, or of every hero's XP rising with a win). Re-recorded, as this means to move them: the `daily` scenario of
`test/fixtures/spells-identity.json` (`732fc0e7` to `a0ef0c21`) and of `test/fixtures/ailment-logs.json` (`a9f7845a` to `a507c266`). That
scenario's greedy player adds each fight's XP to its heroes as it goes, so the split changes which hero levels when and so its later
fights. Then, with the spire and the Calamity on the split, the `tower` scenario of both (`37ff85dc` to `59e4b158`; `8461d5ef` to
`e8d8ecb0`), whose run heroes level from their own XP fight by fight. Every other scenario kept its hash, `calamity` included (its
recorded floors end before the split changes any hero's level). The spire's and the Calamity's own tests (`tower`, `calamity`, `calExplore`,
`calRoster`, `calLand`, `calMapRewards`, `calamity-hub`, `calamity-zones`, `rift`) pass unchanged: none of them pins a level or an XP sum
that the split moves (the Calamity's "pays more than the spire" test is a ratio, which holds). I did not re-run a spire or Calamity
pace sweep: their totals per fight are the same, only the spread between the heroes narrows.
