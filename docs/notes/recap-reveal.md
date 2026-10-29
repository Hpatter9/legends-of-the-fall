# Every item on the wave card; no spoils in the end recap; earned heroes walk in — RECAP-REVEAL

Owner: Claude. Branch: `claude/recap-reveal` (from main 0.233.0).

The owner's asks: "The wave recap should show all items gained, spoils don't really matter if they leave", and "When a hero is
obtained through a task, they shouldn't act like they came from the summoner. They can have a similar reveal, but not from the
summoner."

## The wave card lists everything gained

`src/sim/waveGains.ts` (pure) works out what a wave brought in by comparing the save and the run before the wave is settled
(`snapGains`, taken in `main.ts` just before `noteFight`) with after (`gainsSince`, when the card's moments are gathered). So any
drop that lands in one of the counted places shows, whichever system paid it:

- heroes who joined (`Meta.unlocked`) and recruits added to the run's roster;
- chests added to the stash (`Meta.stash`, by kind: bronze, silver, gold, mythic, daily);
- lasting equipment (`Meta.equipment`, with its rarity) and the run's gear (`Run.items`; its tier 1 to 3 reads as Common, Rare,
  Epic);
- relics (`Run.relics`);
- unlock shards (`Meta.unlock`, only a rise: a hero who joins has its shards taken off) and rank shards (`Meta.shards`);
- XP tomes by size (`Meta.tomes`) and summoning stones (`Meta.stones`);
- a Calamity's ores kept on the run (`run.tower.ores`).

The army's rift ores and caches are left out: the card's own ore row (`#oreDrop`) already shows them. Gold and crowns stay in the
pay line. Two of the same thing are one entry, ×2 (`gainText`: "Steel Blade (Rare) ×2", "Silver chest", "3 Hexquartz",
"Reaper joins"), in the order new heroes, chests, equipment, gear, relics, unlock shards, shards, tomes, stones, ores.

`WaveMoments.gains` (optional) carries them to the card. `waveNotes` then drops the `run.found` lines the gains already show
(`otherFinds`: the gear, relic and ore lines, and the gold lines the pay line has), so a relic choice waiting on the map still gets
its line and nothing is said twice. Without `gains` (an older caller) every line is kept as before.

`src/waveCardView.ts` draws them as small chips above the one-liners, each with the packs' icon: the hero's face, the gear's and
relics' icons (`render/items.ts`), the equipment's framed icon, the chest's picture at half size, the tome, the stone and the ore.
Rarity colours the chip's rim. Many chips wrap, and past three rows (86px) the row scrolls within the card, so the card keeps to the
top of the screen at 393x852. They fade in one by one; with reduced motion they are there at once.

## The end recap keeps only what lasts

`recapDetail` (`src/recapView.ts`) no longer has the **Spoils found** list (and its `noSpoils` option is gone), and the spire's
summary no longer lists "Equipment found" (`towerView.ts`): the run's gear and relics leave with the run. The recap still shows
crowns, chests, the XP and levels gained, the wave strip and the company's work; the spire's and the Calamity's summaries keep
their chests and rift ores. `RunRecap.found` is still written (`noteWave`, capped at `RECAP_FOUND`) so saves and other branches
that write it carry on; nothing shows it now.

## An earned hero walks in

`src/sim/heroArrival.ts` (pure): `arrivalOf(kind, pulled)` is `'earned'` for the ten heroes earned by a milestone
(`contentHeroes.ts`) unless they come out of a pull, and `deedLine(kind)` names the deed ("Earned: clear the Undead Legion on
Hard").

`src/earnedArrival.ts` is their first reveal: no summoner and no chamber. The keep's overlook at dusk (the camp's own painting,
`art/camp/overlook.png`) with the deed in a banner at the top; the hero walks in along the rampart (its battle sprite's walk frames:
`revealSprite` takes `{ walk: true }` and a `walk()` that loops them; the summoning reveal does not ask and plays as before), then
its painted art rises behind it as it plants its feet and strikes once (the dust ring, the `eliteSting` cue); the plate gives "A new
ally rides in", the name, the class title, the role and "Joins your company". Beats `ARRIVAL_BEATS` (0, 0.6, 2.3, 3.1 s).

It keeps the summoning reveal's manners: the same queue (`queueReveal` in `summonTarot.ts` picks the arrival by `arrivalOf`, so a
milestone's join after a fight and `revealUnseen` for a missed one both walk in), the skip guard (`SKIP_GUARD_MS`), a tap to the
end and a tap to close, the hero marked seen and saved on the close, the music ducked while it shows, and with reduced motion a calm
fade with no walk (`CALM_ARRIVAL_BEATS`). Summoned heroes keep the summoner. The earned cinematic (`sceneScripts.ts`) is unchanged
and still plays first when cinematics are on.

## Checks

- `npm run typecheck`, `npm run web`.
- `npm test -- recap-reveal wave-recap`: `test/recap-reveal.test.ts` is new (no gains for a quiet wave; every kind grouped and
  ordered, ores row and spending left out; the found lines the gains cover are dropped and the rest kept; a settled boss gear;
  the arrival rule and deed lines for all ten). `test/wave-recap.test.ts` is unchanged and passes.
- Full `npm test`: see the handoff.
- `tools/recap-reveal/shots.mjs` (Chromium, the built game, a real Undead Legion run): a won wave whose settlement pays a cursed
  path's gear and two charms, a hero joining, two chests, shards, tomes and a stone (the save's drops added as the wave settles,
  standing in for the systems that pay them); the defeat and the end recap (no spoils heading); the Reaper's arrival through the
  reveal queue mid-walk and at its end, the guard and the seen flag, then the calm version. At 393x852, 360x780 and 412x915.
  Screenshots `docs/samples/recap-reveal-*.png`, results `recap-reveal-checks.json`.
