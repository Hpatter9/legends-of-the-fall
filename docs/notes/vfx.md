# Fight effects (the "add effects to everything" pass)

What the fight shows now, and where it lives:

- **Melee**: a `swing` plays a slash across the target, drawn from the attacker's weapon by name (`slashOf` in
  `src/render/vfxRules.ts`: heavy arc for clubs and brutes, wind for spears and staves, dark for claws and daggers,
  bright for swords). A hit's spark grows with the blow's share of the target's health. A raised guard turns a blow aside:
  a light burst and a "Block". A dodge puts a whoosh across the dodger beside the "Miss".
- **Projectiles**: arrows leave a faint glint trail, fire and bolts leave flame puffs, and each lands in a puff.
- **Walking** (`scan`/`walk` in `src/render/fx.ts`, once per tick): a dust puff at each step's foot; ripples and a
  splash on shallows; a fire puff on lava; ice puffs on ice; snow and sand puffs in those areas; a landing puff after a
  drop of two steps or more. Flyers gust their wings every 0.9 s and hover (the body bobs over a smaller shadow).
- **Terrain, a few at a time**: ripples on the shallows, embers and a glow over lava, snow flakes and sand drifting.
- **Deaths**: skeletons scatter bones, demons puff out smoke, the rest bleed a puff. A boss death adds a fire burst, smoke
  and a slow beat (`timeScale`, 35% speed for 700 ms of wall time, read in `src/main.ts`).
- **Status** (`drawBadge` in `src/render/unitView.ts`): one small looping icon over the left shoulder, the first that
  holds: burning, bleeding, charmed (heart), hasted (wind). A raised guard is wrapped in the earth shield's ring. The sim
  has no "slowed" status, so none is shown; that needs a sim rule first.
- **Heals**: four green sparkles rise a moment apart, under the "+n".
- **Evolve**: a light pillar rises over the hero for the burst (`drawPillar`).
- **Board and page**: a hero set down on a tile puffs dust (`landing`); a summoned card springs in with a ring of light
  (`summonBurst` in `src/render/uiFx.ts`); on the result screen the gold flies to the top bar and the crowns rise off each
  earned star, which twinkles; buttons press in to 94%.

Settings and speed: the shake and numbers settings are unchanged. Battery saver halves how many puffs are asked for and
caps the live ones at 110 (200 normally), in `particleBudget`. Sprites are pooled in `src/render/particles.ts`.

Not done: the level-up pillar (only evolve has one), a "slowed" status (no sim rule), and the king's spells, which were
left to the other worker.

Tests: `test/vfx.test.ts` (the slash choice and the saver's budget). The rendering needs Pixi, so it is checked by eye at
393x852 (`npm run web`, then a Playwright capture of a fight).
