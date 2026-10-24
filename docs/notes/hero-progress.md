# Hero progress: ranks, talents and summons

## Ranking up is the player's choice
- Shards are earned as before. `rankOf` is the rank the shards have **earned**; `takenRank` (`Meta.ranked`) is the rank the player has **taken** with a tap. Hp, attack, stars and the look follow the rank taken (`heroRank`). `sim/rankUp.ts` has the rules (`rankPlan`, `rankUp`, `readyToRise`).
- A hero with a rank waiting (or, at the top rank, an awakening it can pay for) shows a **Rank up** badge on its sheet and roster card, and the Heroes tab lights. The badge opens `rankUpView.ts`: what was earned, hp and attack before and after, the look before and after when it changes (awakening recolours), and Rank up / Back. The Awakening panel's button opens the same card.
- **Old saves:** a save with no `ranked` is read with the ranks it had; shards beyond them wait for the tap. A new save starts with `ranked: {}`. `startedMeta` (tests and tools) has none, so every earned rank counts there and the balance tools are unchanged.
- **RANK_MULT 1.05 to 1.08** (max rank: x1.22 to x1.36 hp and attack; awakening stays 1.08 a step, so it is no longer a bigger jump than a rank). Parity: every hero shares the one multiplier, so no hero gains on another. The armies' tiers are calibrated on fresh saves (rank 0), so their tries do not move; for a player who has taken ranks they ease by about the rank bonus (`npm run balance -- --no-tables --deep --force-rank4` is the control). Shards, pulls and the unlock pace are untouched (`unlock-pace` models shards, not strength).
- Tests changed on purpose: `levels.test.ts` read 1.05 as a literal (now `RANK_MULT`); `cinematics.test.ts` split the length rule (chapters 20 to 40 s, reveals 5 to 14 s) and limits the Duchess rule to chapters. New: `test/rankUp.test.ts`, `test/talentGlyph.test.ts`, three cases in `cinematics.test.ts`.

## Earned heroes
The ten content heroes each have a short reveal (`earned:<kind>` in `sceneScripts.ts`, about 9 s, one flash): a silhouette comes on in the dark, then the hero steps into the light and speaks. It plays once, after the result's recap closes (`main.ts` `revealEarned`), and the codex's Scenes list can replay it. New `hide` act in the scene clock.

## Talent tree
- A tap on a tile opens a box over the page (`talentView.ts`): picture, name, tier and cost, text, then **Learn** (spends the point) or **Back**; a locked tile says why. It used to open a card at the foot of a tall tree, out of sight.
- Icons are generic by kind of effect (`sim/talentGlyph.ts`: sword attack, armour defence, heart life, eye crit, boot move speed, cross healing, pickaxe execute, and so on): 37 glyphs for 720 talents, generated with PixelLab at 32x32 (`tools/pixellab/talents/gen.py`), drawn at 2x. About 90 generations were used (38 glyphs x 2 seeds, a few retries, 6 for the halo and mirror redo; the mirror and ward were not used). `docs/samples/hero-progress-talents-*.png` shows them; the old equipment tiles are still in `src/art/equip` (the nodes keep their `icon` field).

## Summons
- The show reran only for pulls started in the hall; a pull from the card reveal screen skipped it, and the hall had to be woken again after each show. Now `SummoningHall.play` wakes the hall itself, and the reveal's own pull buttons close it and run the same path (`Home.summon`). Checked: three pulls in a row, one from the reveal, each with cinematic and show.
- **Summoning cinematic**: cut by the owner's call (see `cinematics.md`); a pull goes straight to the hall's show and the cards.

## For the owner
1. RANK_MULT 1.08 (1.10 would make top rank x1.46); say if you want it different.
2. The cinematic plays on every pull. A setting to turn it off is easy to add.
3. The earned reveals play after the result's recap, not over the fight.
4. The first summon cinematic uses the dungeon backdrop (no hall backdrop in the cutscene player).

## Cinematics: the director's follow-up
- **The opening plays before the starter pick**, cast with a fixed trio (`OPENING_TRIO`: Knight, Samurai, Archer; Duchess keeps her beat), then the pick follows (`main.ts`).
- **Setting "Cinematics"** (on by default, `settings.ts`). Off, no scene starts by itself (opening, boss arrival, earned reveals, the summoning), but each is still marked seen, so the codex's Scenes list can play it. Every scene keeps its Skip button (64x44 at top right; checked at 360 wide: `docs/samples/hero-progress-opening-360.png`).
- **Music hook:** `Scene.music` names a score; `ScenePlayer` calls `sound.ts`'s `playScene(id)` when the scene starts and `endScene()` when it ends or is skipped. `playScene`/`endScene` are already on main (audio, 0.136.0), so no stub was needed. Set so far: opening `opening`, Gorvak `gorvak`, earned reveals `triumph`; the summoning has none (the hall has its own sounds).
- Check: `node tools/ui/hero-progress-cine.mjs`.
