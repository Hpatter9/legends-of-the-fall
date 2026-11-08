# Bench marks (BENCH-MARKS)

Three small owner asks.

## The rank stars on the bench cards

"The stars need to be resized on the unit pictures at the bottom." After a wave was won (the "Wave 12 of 15 won" card with its
level-ups), each bench card showed a huge orange eight-point star over the face and another spilling below the card. These were
the card's own rank stars (`.benchGrade`, one `COMBAT_ART.star` picture a rank): their 10px size was set only while deploying
(`body[data-phase='deploy']` in `src/paintedDeployment.css`), so in the after-wave phase they drew at the art's full size. Not a
duplicate: a rank-2 hero has two stars, so it showed two bursts. The size now holds in every phase (`#bench .benchGrade img`).
The fight's slim strip still hides them (`battleUi.css`).

## One mark on the Heroes tab

"The heroes button at the bottom has multiple little marks. They only need one if there's something to do in there." The camp's
Heroes tab could wear three at once: the red upgrade count (`i.badge`), the gold quest "!" (`i.qbadge`) and Hester's coin
(`i.sbadge`, warm gold, or violet for the Gloaming Dealer). `heroesTabMark` (`src/heroesTabMark.ts`, pure, tested in
`test/heroes-tab-mark.test.ts`) picks one, the most pressing, or none:

1. upgrades ready (a rank-up, merge or awakening): the red count;
2. a quest to take or hand in: the gold "!";
3. a trader at Hester's stall: the coin in the trader's colour;
4. new stock at the stall: the plain gold coin.

`home.ts` draws only what it picks; the tab's spoken label still lists everything. Inside the tavern, the stall's own dot on the
Hearth's name is unchanged.

## New art gets a ChatGPT prompt

A standing owner rule, added to CLAUDE.md and AGENTS.md (the same words in both): art the packs and `src/art/` don't have gets a
ChatGPT image prompt in `docs/notes/<topic>-art-prompts.md`, and the director is told, rather than code-drawn art.

## Checks

`tools/bench-marks/shots.mjs` (after `npm run web`) wins a wave and shoots the bench in the after-wave phase (three rank-2 heroes, two rank-1), then the camp's
Heroes tab, at 393x852, 360x780 and 412x915, into `docs/samples/bench-marks/`; it fails if a star is wider than 12px or below
its card, or the tab shows more than one mark.
