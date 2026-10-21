# Evolution (grades 2 and 3)

A hero that merges up a grade looks upgraded.

- `Boost.grade` (set by `gradeBoost`) reaches the battle's `Unit.grade` (only 2 or 3 is stored). The look reads it; no rule does.
- `UnitDef.forms` lists a sheet per grade; `formOf(def, grade)` picks it. Set for the knight (knight_1/2/3) and the samurai (samurai, samurai, samurai_commander).
- `unitView.ts`: grade 2 gets a richer colour (one `ColorMatrixFilter`, built once per sprite) and a soft silver halo; grade 3 a stronger, warm gold cast, a gold halo, rising sparkles and +8% size. `evolve()` plays a short ring and flare.
- Bench cards (`portrait(sheet, size, grade)`, `.card.g2/.g3` in `index.html`) show the form and colour with a silver or gold frame; a merge's new card flashes (`.evolve`).
- Merge moment: `main.ts` notes the roster ids a summon created above grade 1; their bench card flashes and, when placed, their board sprite bursts.
