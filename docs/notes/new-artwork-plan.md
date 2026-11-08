# Next original artwork plan

This is a proposal after the 0.393.0 art release, not new implementation. Preserve the recently merged battle UI, ten portrait-led hero sprite remakes and 54 seated tavern heroes. The 48 painted relics, completed equipment, quest-givers, trophy wall and newly connected dynasty/Council art do not need regenerating.

| Order | Batch | Deliverables | Why |
|---|---|---|---|
| 1 | Complete Nemesis trait symbols | 12 new transparent 128px symbols, readable at 28px | The twelve commissioned symbols now work, but twelve remaining modelled traits still have text alone. This finishes that visual vocabulary. |
| 2 | Road encounter illustrations | 8 painted landscape vignettes | Give recurring choices their own story identity beyond the current item/reward icons. |
| 3 | Calamity herald portraits | 6 painted busts, with square face crops | Give the six named heralds distinct painted identities alongside their existing battle sprites and newly mounted trophies. |

## Batch 1 — remaining Nemesis traits

Six defences: Fireproof (flame striking a shield), Rime-hardened (ice-coated armour), Venom-blooded (sealed green vial), Thick-hided (leather with a turned blade), Grounded (lightning drawn into an earth spike), Fearless (steady eye facing a spectral shape).

Four Banes: martial (crossed blades), arcane (broken crystal wand), devout (cracked sun medallion), wild (clawed leaf). Each needs its own silhouette as well as colour.

Two deeds: Elusive (footprints dissolving into smoke), Legend-slayer (broken laurel over a blade). Match the existing gothic pixel symbols and hard alpha, retaining labels and explanations. Show only learned traits. The first proposal should compare Fireproof, one Bane and Elusive at actual 28px size.

## Batch 2 — road encounters

Eight scenes drawn from the existing `src/sim/midEvents.ts` encounters: the wounded scout; the Pale Lady's shrine; deserters at a fire; the bone-dice countess; the wandering healer; the crossroads forge; the crown in the reeds; the refugee caravan.

Use 768×432 painted scenes with simple compositions and no text. Important figures/objects remain in the central safe area; dark lower edges leave room for the existing card layout. Show the Pale Lady, forge and caravan first. Reuse the shrine illustration for the Lady's return only if its tone fits. The existing traveller portraits remain separate assets. Before shipping, preview a compact illustration treatment in the standard ornate choice card at 360×780, keeping all decisions and costs accessible without excessive scrolling.

## Batch 3 — six Calamity heralds

Gorvak the Ashen, the Thorn Warden, Malphas, Hrungar the Mountain, Vorgrath the Hellbringer and Karnok the Calamity. Reference their actual current battle sheets and trophy lore so the painted identity matches what players fight. Do not derive a new creature identity from a name alone. Start with a contact sheet of their existing sprites and a three-portrait proposal before generating all six.

Use 512px bust paintings with clean silhouettes and square face crops. Target the existing boss card and codex; reveal/taunt use is optional after checking crop and timing. Preserve current sprites and combat rules.

## Workflow and acceptance

Complete one batch at a time. Show a small visual proposal, confirm direction per AGENTS.md, then generate, import and review at shipping size. Retain source art, mapping and credits. Bundle images or explicitly precache every new URL. Keep rules/saves unchanged; use typecheck/build, relevant tests and the three required portrait sizes for integration. Costs and generation budget remain unknown until the source brief is approved. No new art generation is authorised by this planning document itself.
