# The other eleven of the twenty join the roster

The recipe of [heroes-join.md](heroes-join.md), followed again: the eleven heroes whose battle sheets are now painted join the roster. They are
the Banneret (Isolde), Astral Sphinx (Nenet), Mirage Dancer (Zahara), Plague Doctor (Corvus), Bombardier (Soren), Astrologer (Cyra), Inquisitor
(Soraya), Seraph (Gabriela), Corsair Surgeon (Tariq), Harpooner (Siku) and Sea Reaver (Nakoa). All twenty are in `ALL_HEROES` now and
`COMING_HEROES` is empty; the roster is 70 heroes (65 ordinary, 5 Mythic). Background: [twenty-heroes.md](twenty-heroes.md).

## Sheets

`python3 tools/heroes-20/pack-sheets.py` packed each hero's plain front and back (awakened forms stay deferred: all eleven are in
`AWAKENED_SHEETS_LATER`; the stray awakened frames some heroes have were left alone, the packer skips an incomplete form). Each sheet was checked
by eye on its `--found` image: pose order, a flat dead pose, the walk alternating, and a back that is a true back view. All eleven passed, so none
was held back. The sheets are `src/art/units/hero_res_<id>[_back].png`, laid out in `sheets.json` and imported in `src/render/sheets.ts`; the contact
images are in `docs/samples/heroes-20/`.

## What moved

- Rows left the coming tables for the roster's, as before: `HERO_NAMES`, `HERO_STORY`, `HERO_QUIPS`, `ROWS` (scores), `TREES`, `DEEP_KITS`,
  `PASSIVES`, `HERO_TRAITS` and `PERKS`; they are in `ALL_HEROES`. The empty `COMING_*` tables and the coming machinery (`comingKits`, the `?? COMING_x`
  lookups) are left as they are: they are harmless and the next hero could use them.
- New tables for them: heir names (`heirNames.ts`), story ages (`dynastyWords.ts`), nemesis taunts, awakening lines (`sceneFamilies.ts`, and the scenes
  in `docs/lines/new-lines.json`, with their quips and stories), the book each reads (`bookData.ts`), starter classes, face boxes (`heroFaceRules.ts`,
  framed by eye on the portraits and the awakened figures), ultimate showcases (`ultShowRules.ts`), the tavern (a spot each, `tavernSpots.ts`; an activity
  each, `tavernLife.ts`; a place and a label each, `tavernActivities.json`), and chip names for the skills that are not one short word.
- **Painted leads.** Skill 1 and the ultimate of each have their own painting from the move sheets (PR #361): twenty-two frames cut by
  `tools/heroes-20/import-ability-icons-2.py` into cells 10 to 15 of `atlas-11` and all of the new `atlas-12`, each with its own signature (a lead strip
  no other skill uses: `signatures.ts`), release (`individualReleases.ts`), element and skill effect. Skills 2 and 3 borrow a look (`kitLooks.ts`).
  Combat icons (`combatIconRules.ts`) use the existing painted motifs.
- **Tavern figures.** There is no painted activity art for them yet, so `<id>-activity.webp`, `-left` and `-right` are their standing cutouts set on a
  384 x 440 canvas (`tools/heroes-20/tavern-guests.py`), as the Mythics' activity paintings are.
- Heritage: the Astral Sphinx and the Seraph are in `NOT_HUMAN` (a star-lioness, an angel).
- `tools/kits/tune.ts`: the Mythics are no longer in its average (the sweep never fields them, so their zero win rate made every lift wrong).

## Balance

The 6-point bar is unchanged. With the eleven in, the roster average moved and a few older heroes fell out of the band; their knobs were nudged,
the new heroes' own numbers were left as tuned: Mummy skill 1 (`TUNE1`) 1.003 to 1.5, and at level 30 Knight's ultimate power 0.512 to 0.36, Wanderer's
meter rate 0.37 to 0.55, Priestess's power 0.371 to 0.5 and Tyrant's 1.187 to 1.05. The worst hero is now 5.8 points from the average at level 30 (the
Wizard) and 5.5 at level 1 (the Beastmaster). The skill 1 and ultimate tables are measured with `node tools/kits/tune.mjs state.json <level> <stage> 12000`.

## Tests changed (owner-approved requirement)

Count ripples: 59 heroes became 70 (`cinematics`, `more-heroes`, `stats`, `ultimates`); 21 mana and 38 stamina heroes became 27 and 43 (`hero-kits`);
the tavern's per-room spread 20/20/19 became 24/23/23 (`tavern`); 136 skills and ultimates with painted artwork became 158, and 171 painted leads 193
(`individual-ability-fx`); the Beast trait has a fifth member, the Astral Sphinx (`monster-heroes`); a pull's 54,000 draws and a chest's 4,500 runs now
scale with the roster, a thousand and a hundred a hero (`meta`, `armyStars`); the shard test's "30 heroes owned" is 37 of the 55 pullable, the same two
thirds as before (`hero-shards`).

Judgement calls, each for the owner to overrule:
- `heritage-looks`: the "a third of the people re-toned" share is judged over the heroes drawn before the twenty, since the new heroes were painted
  in their own heritage tones from the start (re-toning three of them was the alternative).
- `heroes-seen`: the shard race tops the shard up to one short each pull, since every other hero that joins raises the need and the old 400-pull race
  could no longer be won among 55 pullable heroes.
- `hero-kits-all`: the cast scene sets a caster to 30% health when its skill needs an emergency (the Astrologer's Retrograde Orbit).
- `stand-retreat`: seed 1 now falls before the fourth room, so the scene is staged from seed 3, which reaches it (as it was re-staged from 21 to 1 before).
- Batch tests 2, 3 and 4 say the heroes have joined instead of waiting (`wave2-kits`, `wave3-kits`, `wave4-kits`).

Baselines re-recorded from the tests' own output: the `ailment-logs.json` and `spells-identity.json` hashes, `nemesis-regression`'s pins and
`stats-power`'s mean power by level (the mean over the ordinary heroes ran 1.4% over the old one at level 1). No test was deleted or loosened beyond
these.
