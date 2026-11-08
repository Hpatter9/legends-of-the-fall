# Run gear, the small extras (RUN-GEAR-2)

The four small things `run-gear.md` left for later, all on the page; no fight, balance or save change (the identity fixtures did not move).

- **The pack line.** Between waves the short card says "A find waits in the pack" (or "n finds wait in the pack") when a found piece of a real-gear run is worn by no hero (`spareFinds`). `WaveMoments.waiting`, note kind `pack`. Not shown in an auto-replay.
- **The cart's red "Full" tag.** The camp's chest cart (`chestStash.ts`) wears a red tag when the stash is full (`stashFull`: spare pieces at `STASH_MAX`), the moment finds from runs start to wait on the cart. It shows even with no chests.
- **The stash count.** "Stash n / 150" under All sets and Combine on a hero's equipment panel (`stashCount`), red and "· full" at the cap.
- **The auto-replay recap's finds.** `AutoTotals.finds` collects each run's `FoundHome.pieces` (kept to `FINDS_KEPT`, 60); the recap card shows the best six in their grade frames with a "+n" chip (`foundList` in `foundRow.ts`).

New read-only helpers: `stashCount`, `stashFull` (`sim/equipment.ts`). Test: `test/run-gear-2.test.ts`. Shots: `node tools/run-gear/shots2.mjs` writes `docs/samples/run-gear-2-{cart,equip,wave,auto}[-360x780|-412x915].png`. `window.__waveNotes` is a screenshot hook like `__settleFinds`.
