# Five Mythic heroes

Owner approved Vael, Astrax, Ilyra, Orrun and Nyxara, their portraits and secret Legendary-Pokémon-like acquisition, then explicitly required battle sprites to match the current game. Branch: `feature/mythic-heroes`; worktree: `/workspace/legends-of-the-fall`. Owner subsequently authorised release integration as 0.395.0.

## Playable result

Five additional heroes bring the live catalogue from 54 to 59. Each has a painted portrait, front/rear pixel battle animations (56 drawn poses each), three skills, a level-30 ultimate, a full talent tree, equipment/stat profiles and awakening passives. Ten resting tavern cutouts prevent missing art when they enter the strongest company. Source paintings and generated atlases are retained under `art-source/mythics/`; [sprite lineup](../samples/mythics/lineup.png) and [packing report](../samples/mythics/packing.json) show production poses. The first smooth sprite studies were superseded by pixel sheets referenced directly from the existing hero-remake lineup.

`mythicRules.ts` is the shared catalogue and one-per-squad rule. It applies to saved party validation, manual party selection, run squad changes, Auto recommendations/selection, guests, battlefield placement, and both Last Stand selection paths. Extra Mythics are retained in the collection/bench, and a malformed saved party keeps its first Mythic. Secret trials refuse Mythics at both quest-run creation and deploy readiness. They never enter ordinary pulls, shard-unlock pools, random guests, or Calamity hire pools.

`mythicCombat.ts` implements:

- Vael: six successful blows earn totality, armour piercing and shields; cleaves, protection, interruption and a battlefield-wide execution ultimate.
- Astrax: consumes active enemy shields into up to three stars, spends them on breath, and leaves burning constellations through Heavenfall.
- Ilyra: earns mercy through combat, heals and cleanses, and once per battle holds living allies at one health for five seconds before a healing surge. Does not resurrect fallen allies.
- Orrun: stores actual health damage, plants a stationary three-tile sanctuary with damage reduction, and converts wounds into shields. Bosses resist binding roots.
- Nyxara: interruption fulfils a foretelling mark and reduces the marked foe's damage; snapshots restore living allies' health and unoccupied positions without refunding resources or undoing enemy damage. Rewrite's talent bonuses improve charge frequency because remembered health is exact.

No new randomness is introduced. Optional state is battle-local and serialisable. New skill names have distinct keys, explicit existing painted icons and tinted signature effects, so they do not inherit older skills' ailment riders accidentally.

## Secret progression (spoilers)

Discovery uses the existing quest board, tavern tellers and campaign records, rather than inventing an explorable overworld. Each three-part chain opens only after demanding endgame deeds, gives vague narrative traces, asks for two preparation objectives without a Mythic, then opens a four-wave trial with the legend's own battle art. The hidden heroes remain `???` with no portrait or kit until earned. Started progress and completed parts use existing quest saves; failures can be retried without losing the chain, and final hand-in grants the hero exactly once. Load recovery handles a completed final quest. First acquisition starts at level 30 so the full kit is immediately available; existing ownership/XP is never reset.

- Vael: seven armies, Infernal Host cleared, a Legendary clear and a level-75 hero; Legendary Infernal waves, then spell-free Legendary bosses.
- Astrax: seven armies, ascension 2 and level 75; deep guardians, then two heart-free Calamity clears.
- Ilyra: seven armies, Undead Legion cleared, a Legendary clear and level 75; flawless Elite Legion waves and flawless Elite bosses; her trial protects a pilgrim.
- Orrun: seven armies, Wildwood cleared, a Legendary clear and level 75; Elite Wildwood waves and flawless Elite bosses.
- Nyxara: ascension 3, 75% bestiary and level 80; deepest guardians and Legendary bosses without ultimates.

The boss opponents are trial aspects: their large-area ultimate attack power is tempered against the army boss multiplier, while recruited heroes retain full strength. The pilgrim has endgame-appropriate health. A bounded three-seed sample with ordinary rank-5 heroes, maximum castle, level-20 Legendary equipment, Auto talents, mastered skills and the default Steel-school Auto spells reaches wins on all five trials at level 90: Vael 2/3, the others 3/3. This establishes reachability, not a general win-rate guarantee. Full sample: [trials.json](../samples/mythics/trials.json). Bare builds were unsuccessful and were used to diagnose the original over-tuning.

Mythics use the existing origins/classes for useful squad synergies. The old two-to-five membership tests still cover the entire ordinary roster and the twenty-hero expansion; Mythics are checked under their separate one-per-squad constraint. The catalogue-count assertion now expects 59. Conditional kit test fixtures supply shields, stored wounds and memories rather than bypassing cast requirements.

## Validation and review

- `npm run typecheck`, `npm run web` and `git diff --check`.
- 169 focused tests covering Mythics, hero art/titles/kits, secrets, ordinary one-of-each, recommendations, quest battles/rules/stars, stats, talents, tavern company, traits, awakening and ores.
- `python3 tools/mythics/validate.py`: ten sheets, 280 complete frames, eight unique strides per facing, hard alpha, safe cell margins, separate rear views, horizontal final corpses and ten transparent tavern cutouts.
- `node tools/mythics/checks.mjs`: 393×852, 360×780 and 412×915; five dossiers and 800 facing/frame checks per size (15 dossiers / 2,400 checks including comparison heroes), genuine combat, party-rule feedback and reduced motion. Controlled service-worker offline reload and decoding of all five portraits at 393. Zero page/console errors after the tavern art was integrated. [Browser results](../samples/mythics/browser/checks.json).

Portraits and tavern variants are automatically copied and precached by the existing build loops; pixel sheets are bundled through `render/mythicArt.ts`. The shared hero packer's new optional alpha threshold defaults to its old value; only the new tavern export uses the firmer threshold to exclude diffuse shadows.

Scope limits: no new overworld interaction engine or custom musical compositions; effects, audio and ornate menus reuse the game's existing systems. Awakening passives/stats work, but Mythics keep their approved base portraits/sprites and normal combat-grade auras at both awakening steps; separate upgraded equipment paintings are not part of this pass. Trial difficulty needs real-player feedback across more squads and gear combinations.

Status: ready for owner review. Local changes remain on the feature branch; owner/director handles release integration.

## Owner-authorised release

Owner requested merge. Main 0.394.0 (`dd312e0c`) is integrated, preserving its portraits, trophies, encounter art and Nemesis symbols. The only conflict was appended credits; both sets are retained. Preparing release 0.395.0 with a matching Updates entry. Integrated typecheck/build, all 173 focused tests (including release notes), sprite validation and the refreshed three-size browser review are required before the requested merge.

Release compatibility review also filled the codex stories/anonymous trial entries, earned reveal scenes, ultimate showcases/cast effects and legacy tavern spots. The ordinary-hero balancing pool and stat-average budget now explicitly exclude Mythics, preserving both historical battle fingerprint suites unchanged; Mythics retain their separately tested power budget and squad limit. Catalogue assertions and legacy room capacity account for 59 heroes; deferred awakening tests exercise the real base-art fallback for Mythics.

Final compatibility validation: 218 selected catalogue/art/awakening/quest/ultimate/stat tests passed, including `ailments-identical` and `spells-identity`, with zero failures. The earlier 173 release-focused checks passed after main integration. An exploratory all-file run was stopped when it reached expensive balance sweeps and superseded pre-fix fixtures; it is not claimed as a full-suite pass. Targeted catalogues and unchanged-fight fingerprints were rerun successfully after the fixes. Main's workflow runs its full suite before publishing.
