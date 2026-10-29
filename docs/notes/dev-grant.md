# Developer grant and the chaos level

## Developer grant (the owner's testing tool)

Settings has a **Developer** row (`devRow` in `src/settings.ts`) with four buttons: +100 crowns, +1000 crowns, +100 shards,
+1000 shards. The page holds the meta, so `main.ts` registers the handler (`onDevGrant`); the rule is `devGrant(m, what, n)` in
`src/sim/devGrant.ts`:

- **Crowns** are added to `Meta.crowns`.
- **Shards** go to every hero through `giveShards`:
  - an owned hero gets rank shards, and any past its cap become crowns, as a pull's do;
  - a hero not owned gets unlock shards, and joins once it has enough;
  - content heroes still join only on their milestones.

The row's hint then says what was given. The game saves at once and redraws the home screen. Test: `test/dev-grant.test.ts`.

## Chaos twists from ascension 3

The owner's call on PR #157's open question: the chaos twists (Rolling Gales, Hot Coals) begin at ascension 3 (`CHAOS_ASC` in
`src/sim/ascension.ts`). `ascRules` now sets `chaosMutators` from that level, and level 3's line says so.

That makes level 3 the one ascension level that adds two rules; `test/ascension.test.ts` allows that for `CHAOS_ASC` only.

Unchanged at the owner's call:
- the creative encounters' share of the plainer mystery floors (`CREATIVE_SHARE`, 0.4);
- the Trickster, Yokai and Guardian milestones at three heroes (#155).
