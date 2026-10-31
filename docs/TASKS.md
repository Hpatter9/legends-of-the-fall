# Shared task board

Project: **Legend of the Last Keep**  
Initial coordination snapshot: 2026-10-26

This is the shared handoff board for Codex and Claude. It records known assignments, not live chat activity. Existing chats must read these instructions from their checked-out branch or receive a handoff; this file does not automatically notify them.

The manager maintains the integrated board. Workers propose their task updates in their own branches and return them in their handoff. Keep one owner per task; reconcile board changes when integrating work.

## Current owner requirements

- Intentional flashy effects are allowed. “No flashing” refers to textures disappearing or glitching off and on, not deliberate visual effects.
- Run tests for the changed behaviour and affected callers. Full suites and unrelated balance sweeps are not required; retain typecheck/build and affected portrait checks for implementation work. Documentation-only updates require diff, link and consistency review.

## Active work

### GUEST-HERO — A guest hero from the passing cart, a sixth on the field for one run; talent points marked in the tavern

- **Owner:** Claude worker. **Branch/worktree:** `claude/guest-hero`, `/home/user/lotf-guest` (from main 0.284.0).
- **Goal:** the owner's "Sometimes you can hire a new hero from the store you randomly come by ... allowed as the 6th on the field": the passing cart now and then offers a guest (a hero outside the party, 1.5 sellswords), who fights as a sixth beside the five for that run only (one at a time, one of each kept, no merge, no recycle, no lasting XP, a farewell at the run's end). And TALENT-ARROWS: the tavern's gold chevron, the Upgrades list ("Talent points: 2 to spend", Spend opens the tree) and Next upgrade › mark heroes with talent points to spend; Upgrade all leaves talents alone.
- **Scope:** new `src/sim/guest.ts`, `src/guest.css`, `test/guest-hero.test.ts`, `test/talent-arrows.test.ts`, `tools/guest-hero/`; `src/sim/run.ts`, `events.ts`, `market.ts`, `merge.ts`, `autoplay.ts`, `upgradesReady.ts`; hooks in `src/main.ts`, `src/events.ts`, `src/unitInfo.ts`, `src/home.ts`, `src/tavern.ts`, `src/party.ts`, `src/menuHeroes.ts`, `src/talentView.ts`, `src/rankUpList.ts`, `build.mjs`.
- **Status:** ready for review. [Note](notes/guest-hero.md) (with the measured lift and owner questions); screenshots `samples/guest-*.png`, `samples/talent-arrow-*.png`.

### ONE-OF-EACH — One unit of a hero on the battlefield at a time

- **Owner:** Claude worker. **Branch/worktree:** `claude/one-of-each`, `/home/user/lotf-one-each` (from main 0.272.0).
- **Goal:** the owner's "we should only allow one unit of a hero on the battlefield at a time": a second hero of a kind is refused on the field and in the squad (copies wait on the bench to merge), a bench copy swaps in on its twin's tile, the bench marks a copy "On field", the greedy player and auto-place pick one of each, old saves send the extra copy back to the bench.
- **Scope:** `placeBlock`/`twinOf` in `src/sim/battle.ts`; `squadTwin`/`canJoin` in `src/sim/run.ts` (and its callers in `climb.ts`, `mystery.ts`, `tower.ts`); `pickSquad`/`autoDeploy`/`oneOfEach` in `src/sim/autoplay.ts`; new `src/sim/oneEach.ts`, `src/oneEachNote.ts`, `src/oneEach.css`; hooks in `src/main.ts`, `src/render/boardView.ts`, `build.mjs`; new `tools/one-of-each/`, `test/one-of-each.test.ts`; fixtures moved to the rule (listed in the note).
- **Status:** ready for review; the owner's three answers done (new saves left hard; the daily and Mythic retuned; the mirror's clone stands in for its original). [Note](notes/one-of-each.md); screenshots `samples/one-of-each-*.png`.
### HORN-GIFT — The War Horn given at the first binding

- **Owner:** Claude worker. **Branch/worktree:** `claude/horn-gift`, `/home/user/lotf-horngift` (from main 0.277.0, with `claude/cinematic-reveal-vault` merged).
- **Goal:** the owner's "The Eidolon horn should be given to the player after earning an Eidolon, as part of the story": no horn anywhere (and no fill) before an Eidolon is bound; Askel's binding hands it over full, with two story beats and a "Received: The War Horn" end card.
- **Scope:** `src/sim/warHorn.ts` (`hornHeld`, `addHorn`, `bindEidolon`), `src/sim/eidolonChainData.ts` (the beats), `src/sim/sceneKit.ts` + `sceneReveal.ts` (the `horn` reveal), `src/eidolonBinding.ts`, `src/eidolonChains.css`, `src/eidolonCall.ts`, `src/eidolons.css`, `src/home.ts`, `src/revealCard.ts`, `src/reveal.css`; `test/horn-gift.test.ts`, `tools/horn-gift/shots.mjs`.
- **Status:** ready for review. [Note](notes/horn-gift.md); screenshots `samples/horn-gift-*.png`.
### GUARDIAN-PULSE — The corrupted guardian's pulse comes from the guardian itself

- **Owner:** Claude worker. **Branch/worktree:** `claude/guardian-pulse`, `/home/user/lotf-guardpulse` (from `claude/altar-clear`, main 0.280.0 merged in).
- **Goal:** the owner's pick from ALTAR-CLEAR's suggestions: the Calamity pulse comes from the guardian (centred on it, ending when it falls), not the first foe in the list. Numbers unchanged.
- **Scope:** `src/sim/riftBattle.ts` (`riftGuardian`), `src/sim/battle.ts` (`riftGuardian?` field), `src/altarHud.ts`, `src/sim/altarWords.ts`, `test/rift.test.ts`, new `tools/guardian-pulse/shots.mjs`.
- **Status:** ready for review. [Note](notes/altar-clear.md#guardian-pulse-the-guardians-pulse-comes-from-the-guardian-itself); screenshots `samples/guardian-pulse-*.png`.

### ALTAR-CLEAR — The Calamity's altar made clear

- **Owner:** Claude worker. **Branch/worktree:** `claude/altar-clear`, `/home/user/lotf-altar` (from `claude/calamity-hub`, main 0.276.0 merged in).
- **Goal:** the owner's "The altar isn't clear enough in how it works in the game": each altar choice in numbers from the rules, consecrate against corrupt side by side, what comes next and why the rift waits; an ⓘ explainer (shown once by itself); a "Your altar" summary; "Altar 1 of 3" labels on the map; the pulse shown in a fight. No rule changed.
- **Scope:** new `src/sim/altarRules.ts`, `src/sim/altarWords.ts`, `src/altarHelp.ts`, `src/altarHud.ts`, `src/altarClear.css`, `test/altar-words.test.ts`, `tools/altar-clear/shots.mjs`; `src/sim/rift.ts`, `src/sim/riftBattle.ts`, `src/sim/tower.ts` (constants named, values unchanged; optional `Rift.corrupted`), `src/towerView.ts` (`altarCard`), `src/sanctuaryView.ts`, one hook in `src/main.ts`, `build.mjs` (the CSS).
- **Status:** ready for review. [Note](notes/altar-clear.md) (with suggested rule changes, not made); screenshots `samples/altar-clear-*.png`.

### JRPG-RECAP — A JRPG results screen at a run's end; the simple card between waves

- **Owner:** Claude worker. **Branch/worktree:** `claude/jrpg-recap`, `/home/user/lotf-recap` (from main 0.273.0).
- **Goal:** the owner's ask: "A more typical JRPG end-of-fight recap. With a level up showing what stats went up and how much, and so on. Redo the recap entirely."
- **Scope:** new `src/sim/jrpgRecap.ts`, `src/jrpgRecapView.ts`, `src/jrpgResults.ts`, `src/jrpgRecap.css`, `test/jrpg-recap.test.ts`, `tools/jrpg-recap/shots.mjs`; `src/sim/runRecap.ts` (optional `xpAt`, `noteXpStart`); hooks in `src/main.ts` (settle, refresh, the result's tap, `stepPassing`), `src/index.html` (`#jrHead`, `#jrBody`), `src/recapView.ts` (the run recap's top), `src/standView.ts` (the Last Stand's end card), `src/waveCardView.ts` (`gainIcon` exported), `build.mjs` (the stylesheet). No save version or version change.
- **Status:** ready for review. [Note](notes/jrpg-recap.md); screenshots `samples/jrpg-recap-*.png`. The owner's answer: between waves stays the simple short card (now with quest lines), leaving by itself; the results screen is only at a run's end (the end recap, a spire/Calamity/quest run's last fight, the Last Stand's end card).

### REVEAL-VAULT — A film's end card for what it revealed

- **Owner:** Claude worker. **Branch/worktree:** `claude/cinematic-reveal-vault`, `/home/user/lotf-reveal` (from main 0.273.0).
- **Goal:** the owner's "at the end of a cinematic, if it was revealing something, it should come up at the end to show what happened or was unlocked" (seen on the Calamity's opening) (the vault part was withdrawn: the owner meant the altar).
- **Scope:** new `src/sim/sceneReveal.ts`, `src/revealCard.ts`, `src/reveal.css`, `tools/reveal-vault/shots.mjs`, `test/scene-reveal.test.ts`, `test/vault-words.test.ts`; `Scene.reveal` and its type in `sceneKit.ts`; the `reveal` field on five films (`sceneEvents.ts`, `sceneFamilies.ts`); hooks in `src/main.ts` (`playDue`, `playScene`, `armyWon`), `src/home.ts` (`enterCalamity`, the Treasury's sheet), `src/castle.ts` (the Treasury's card), `build.mjs` (the CSS). No sim rule, save or version change.
- **Status:** ready for review. [Note](notes/cinematic-reveal-vault.md); screenshots `samples/reveal-*.png`.
### CALAMITY-HUB — The living Rift Sanctuary: the rift walk-in and the walk back out

- **Owner:** Claude worker. **Branch/worktree:** `claude/calamity-hub`, `/home/user/lotf-calhub` (from main 0.274.0).
- **Goal:** the owner's "make the main room in the Calamity more alive ... that rift is the middle one they walk into, in a bright flash that zooms in and fades back in to the next battleground", and the walk out of the portal after a win with the cards rising one by one.
- **Scope:** new `src/hubMotion.ts`, `test/calamity-hub.test.ts`, `tools/calamity/hub-shots.mjs`; `src/sanctuaryView.ts`, `src/sanctuary.css`. No sim change.
- **Status:** ready for review. [Note](notes/calamity-hub.md); screenshots `samples/calhub-*.png`.

### TAVERN-RANKUP — Upgrades marked in the tavern, and a quick way to take them

- **Owner:** Claude worker. **Branch/worktree:** `claude/tavern-rankup`, `/home/user/lotf-rankup` (from main 0.273.0).
- **Goal:** the owner's "heroes on the tavern screen should show if they have an upgrade available", and a quick way to rank up without opening each hero: a gold chevron over each ready hero, an Upgrades list with one-tap rows and "Upgrade all", and "Next upgrade ›" on the hero sheet.
- **Scope:** new `src/sim/upgradesReady.ts`, `src/rankUpList.ts`, `src/rankUps.css`, `test/upgrades-ready.test.ts`, `tools/tavern-rankup/`; hooks in `src/tavern.ts` (the chevron, the button), `src/home.ts`, `src/menuHeroes.ts` (the hop, strip, roster), `src/party.ts` (the card's chevron), `src/awakenView.ts` (`tellAwakened`), `build.mjs` (the CSS). No rule, save or version change.
- **Status:** ready for review. [Note](notes/tavern-rankup.md); screenshots `samples/rankup-*.png`.

### REVEAL-VAULT — A film's end card for what it revealed

- **Owner:** Claude worker. **Branch/worktree:** `claude/cinematic-reveal-vault`, `/home/user/lotf-reveal` (from main 0.273.0).
- **Goal:** the owner's "at the end of a cinematic, if it was revealing something, it should come up at the end to show what happened or was unlocked" (seen on the Calamity's opening) (the vault part was withdrawn: the owner meant the altar).
- **Scope:** new `src/sim/sceneReveal.ts`, `src/revealCard.ts`, `src/reveal.css`, `tools/reveal-vault/shots.mjs`, `test/scene-reveal.test.ts`, `test/vault-words.test.ts`; `Scene.reveal` and its type in `sceneKit.ts`; the `reveal` field on five films (`sceneEvents.ts`, `sceneFamilies.ts`); hooks in `src/main.ts` (`playDue`, `playScene`, `armyWon`), `src/home.ts` (`enterCalamity`, the Treasury's sheet), `src/castle.ts` (the Treasury's card), `build.mjs` (the CSS). No sim rule, save or version change.
- **Status:** ready for review. [Note](notes/cinematic-reveal-vault.md); screenshots `samples/reveal-*.png`.

### CINE-001 — Movie-like cinematics: shot language, every story scene

- **Owner:** Claude worker. **Branch/worktree:** `claude/cinematics`, `/home/user/lotf-cine` (from main 0.271.0).
- **Goal:** the owner's "make the cinematics more epic, and movie-like. Different camera angles, close-ups, lines", for all story scenes.
- **Scope:** new `src/sim/cineDirector.ts`, `src/sim/cineMoments.ts`, `src/render/cineShots.ts`, `test/cine-shots.test.ts`, `tools/cinematics/cine-strips.mjs`, `cine-strip.py`; the player `src/render/sceneView.ts`, the clock's previews `sceneClock.ts`, `src/cinematics.css`; the kit and scene data (`sceneKit.ts`, `sceneScripts.ts`, `sceneEvents.ts`, `sceneFamilies.ts`, `sceneRules.ts`, `questBattleData.ts`); nine cinematic cues in `soundRules.ts`/`audioProcessors.ts`; hooks in `src/main.ts` (army intros, boss arrivals, previews) and `src/standView.ts` (act cards). Not the War Horn files (`ultMoment.ts`, `ultEpicRules.ts`, `bossMoment.ts`, the fight HUD). No sim rule, save or version change.
- **Status:** ready for review. [Note](notes/cinematics.md) (CINE-001 section); strips `samples/cine-*.png`.

### BOSS-BIG — Bosses with huge attacks, and counterplay

- **Owner:** Claude worker. **Branch/worktree:** `claude/boss-big-attacks`, `/home/user/lotf-boss-big` (from main 0.263.0; main 0.267.0 merged in).
- **Goal:** the owner's ask ("bosses need bigger attacks and to feel more powerful"), decided as harder with counterplay: every boss's one or two telegraphed signature attacks, the heroes stepping off the marks, the king's spells answering, a red and black cut-in, the ultimate-epic blow; then re-tuned so the armies stay winnable.
- **Scope:** new `src/sim/bossAttacks.ts`, `src/bossBigRules.ts`, `src/bossMoment.ts`, `src/bossBig.css`, `src/render/bossFx.ts`, `tools/boss-big/`, `test/boss-big*.test.ts`; hooks in `src/sim/battle.ts`, `src/render/fx.ts`, `src/main.ts`, `build.mjs`, `src/render/soundRules.ts`, `src/render/audioProcessors.ts`, `tools/audio-mix/targets.mjs`; the identity tests switch it off; a crash guard in `src/sim/toolkit/auras.ts`.
- **Status:** ready for review. [Note](notes/boss-big-attacks.md); screenshots `samples/boss-big-*.png`.

### GEAR-ICONS — The painted equipment icons in the game

- **Owner:** Claude worker. **Branch/worktree:** `claude/gear-icons-painted`, `/home/user/lotf-gear-icons` (from main 0.263.0, main 0.267.0 merged).
- **Goal:** the owner's painted equipment icons (PR #242's `art-source/gear/`, with the five frames and five wear pieces from PR #241) shown wherever equipment is drawn today, in place of the 16px DawnLike tiles: the grade's frame and glow round the standard painting for Common to Legendary, the Mythic painting for Mythic.
- **Allowed files or systems:** `art-source/gear/`, new `src/art/gear/`, new `src/gearIcons.ts`, `itemIcon` in `src/equipView.ts`, `src/equip.css`, one rule in `src/battleReports.css`, the atlas copy in `build.mjs`, new `tools/gear/`, `CREDITS.md`, `docs/notes/gear-icons.md`, `docs/samples/gear-icons-*.png`. No sim, save or version change.
- **Status:** done, ready for review. Handoff: [note](notes/gear-icons.md).

### TAVERN-LIFE — Every hero's own place and activity in the tavern

- **Owner:** Claude worker. **Branch/worktree:** `claude/tavern-life`, `/home/user/lotf-tavern-life` (from main 0.263.0).
- **Goal:** the owner's ask: each hero in the tavern gets a proper animation at a fixed spot of their own (idling, sitting, darts, singing, drinking...), not random; Gwen added to the next art prompt.
- **Scope:** new `src/render/tavernLife.ts`, `src/tavernLifeDraw.ts`, `src/art/tavern/life/`, `tools/tavern-life/`, `test/tavern-life.test.ts`, `docs/notes/tavern-art-prompt.md`; spots reassigned in `src/render/tavernSpots.ts`; hooks in `src/tavern.ts`; `CREDITS.md`.
- **Status:** ready for review. [Note](notes/tavern-life.md); [art prompt](notes/tavern-art-prompt.md) (52 images); screenshots `samples/tavern-life-*.png`.
### UNIT-INFO — Hold a unit between waves for its skills and stats

- **Owner:** Claude worker. **Branch/worktree:** `claude/unit-info`, `/home/user/lotf-unit-info` (from main 0.263.0, main 0.267.0 merged).
- **Goal:** the owner's "click and hold on a unit in between waves to get a run-down on skills and stats": a press-and-hold (400 ms, a ring under the finger; a move lets it go as a drag) on any unit on the board, a bench card or a Last Stand tray card, in a deploy or a Stand break, opens a read-only card of its stats, traits, equipment, skills (locked ones marked), a boss's second form and a foe's tips.
- **Scope:** new `src/unitInfoRules.ts`, `src/unitInfo.ts`, `src/unitInfo.css`, `test/unit-info.test.ts`, `tools/unit-info/`; small hooks in `src/main.ts`, `src/standView.ts`, `build.mjs` (the CSS).
- **Status:** ready for review. [Note](notes/unit-info.md); screenshots `samples/unit-info-*.png`.

### EIDOLON-CHAINS — Quests batch 5: Askel's chain, end to end

- **Owner:** Claude worker. **Branch/worktree:** `claude/eidolon-chain-1`, `/home/user/lotf-chain1` (from main 0.272.0).
- **Goal:** batch 5 of the approved quests and Eidolons design, for Askel the Cinderhound (the easiest Eidolon now): the Summoner's prologue after the Orc Warband falls, three easy parts (levels 5 to 12; no trial) with their pieces and piece cards, the chain's own quest battle (The Kennel Fires), the quest log's Eidolons tab, the binding ceremony at the Summoner (Askel bound and chosen), the Pact Gallery (from the Sanctum and the camp's horn card); the rails for chains 2 to 6 (data shape, one chain at a time, what opens each).
- **Scope:** new `src/sim/eidolonChains.ts`, `src/sim/eidolonChainData.ts`, `src/sim/chainBattleData.ts`, `src/eidolonChainView.ts`, `src/eidolonBinding.ts`, `src/eidolonChains.css`, `tools/eidolon-chains/`, `test/eidolon-chains.test.ts`; hooks in `src/sim/quests.ts` (the chain state in `readQuests`), `src/sim/questBattles.ts` (the chains' battles by id), `src/sim/questRun.ts` (`canFightBattle`), `src/sim/modes.ts` and `src/standView.ts` (`noteChains`), `src/sim/sceneKit.ts`/`sceneRules.ts` (the `eidolon` moment), `src/questLog.ts` (the tab), `src/hall.ts` (the plaque, the gallery button), `src/home.ts`, `src/main.ts` (the story, the piece card, a ticker fix), `src/eidolonCall.ts` (the gallery button), `build.mjs` (the CSS), `tools/quest-battles/rate.ts`; one test updated in `test/quests.test.ts`.
- **Status:** ready for review. [Note](notes/eidolon-chains.md); screenshots `samples/eidolon-chain1-*.png`.

### EIDOLONS — Quests batches 3 and 4: the War Horn and the Eidolon's call

- **Owner:** Claude worker. **Branch/worktree:** `claude/war-horn`, `/home/user/lotf-horn` (from main 0.271.0; `art/eidolons-dreamina` and `art/eidolons-1` merged in).
- **Goal:** batches 3 and 4 of the approved quests and Eidolons design: the War Horn (fills to 1000 across fights, saved, waits when full, empties when blown), one Eidolon chosen, `callEidolon` through the sim's orders (the strike's shares and each Eidolon's rider; once a fight; never by Auto), the horn in the fight and at the camp, and the call's cinematic (the director's later ask: shots, close-ups and lines); the six painted figures and cards imported.
- **Scope:** new `src/sim/eidolons.ts`, `src/sim/warHorn.ts`, `src/sim/hornFill.ts`, `src/eidolonRules.ts`, `src/eidolonCall.ts`, `src/eidolons.css`, `src/art/eidolons/`, `tools/eidolons/import.py`, `tools/eidolons/shots.mjs`, `test/eidolons.test.ts`, `test/eidolon-moment.test.ts`; hooks in `src/sim/battle.ts` (the event, `b.eidolon`, the riders' tick), `src/sim/orders.ts` (the order), `src/sim/meta.ts` (`eidolons?`), `src/sim/waveCard.ts` / `src/waveCardView.ts` (the horn's line), `src/fightHudRules.ts`, `src/render/fx.ts` (`hitStop`), `src/main.ts`, `src/standView.ts`, `src/home.ts` (`onTopBar`), `src/settings.ts` (`eidolonFull`), `tools/autoplay.ts` / `tools/balance.ts` (`--eidolon`), `build.mjs`, `CREDITS.md`.
- **Status:** ready for review. No Eidolon is bound in normal play until the chains (batch 5+); `?eidolons=all` is a hidden dev flag. [Note](notes/eidolons.md); screenshots `samples/eidolon-*.png`.

### QUEST-BATTLES — Quests batch 2: quest battles

- **Owner:** Claude worker. **Branch/worktree:** `claude/quest-battles`, `/home/user/lotf-quests3` (from main 0.270.0).
- **Goal:** batch 2 of the approved quests and Eidolons design: quest battles with a required cast (offered only once the cast is owned), RunMode `quest`, `questArmy`, its own run slot (`legends.questRun`), the locked party slots and deploy, the story before and the beat after, Try again, replays; eleven battles (the two patron battles, the design's worked examples and the batch 1b ideas), each opened by a quest from a fitting giver.
- **Scope:** new `src/sim/questBattles.ts`, `src/sim/questBattleData.ts`, `src/sim/questRun.ts`, `src/sim/questData/battles.ts`, `src/questBattles.css`, `tools/quest-battles/`, `test/quest-battles.test.ts`; hooks in `src/sim/run.ts` (the mode, `waveArmyOf`, the slot, Duchess, recycle, no road events), `src/sim/quests.ts` (the `battle` goal, the owner's rule, `tries`/`won`/`told`), `src/sim/questData.ts`, `src/sim/modes.ts` (`settleRun`), `src/sim/sceneKit.ts` / `sceneRules.ts` (a `questBattle` moment, `CastMember.name`), `src/settings.ts` (Start over wipes the slot), `src/main.ts`, `src/party.ts`, `src/questLog.ts`, `src/questCard.ts`, `src/home.ts`, `src/index.html` (`#qbLeave`), `build.mjs` (the CSS), `package.json` (`quest-rate`); one test updated for the new requirement (`quests-content`: the hundred uniques counted apart from the eleven battle quests).
- **Status:** ready for review. [Note](notes/quest-battles.md); screenshots `samples/quest-battles-*.png`.

### QUESTS-1B — Quests batch 1b: repeats, drops, 100 unique and 30 repeatable quests

- **Owner:** Claude worker. **Branch/worktree:** `claude/quests-content`, `/home/user/lotf-quests2` (from `claude/quests-1`, with main 0.263.0 merged).
- **Goal:** the owner's decisions: quests repeat (a cooldown), a quest taken can be dropped, and 100 unique and 30 repeatable quests, varied in goal, story and reward, across every giver (Gwen, the board's notices, the four passersby, the heroes as patrons, the ruler's Royal charges, spoils, the rift's voice, Duchess), each with a path to the player.
- **Scope:** `src/sim/quests.ts`, `src/sim/questData.ts`, new `src/sim/questData/*.ts`, `src/questLog.ts`, `src/questCard.ts`, `src/questArt.ts`, `src/quests.css`, `src/art/quests/` (three faces), `tools/quests/`, `test/quests.test.ts`, new `test/quests-content.test.ts`; small hooks in `src/sim/modes.ts` (`settleRun`'s tallies and the after-fight offers), `src/sim/stand.ts` (`holds`), `src/standView.ts`, `src/main.ts` (the ultimates tally, a toast), `src/home.ts`, `src/tavern.ts` (the patrons' and Duchess's "!"); `test/summon-stones.test.ts` (quests may pay shards: the owner's ask).
- **Status:** ready for review. [Note](notes/quests.md) (batch 1b); screenshots `samples/quests-2-*.png`.

### QUESTS-1 — Quests batch 1: the tavern and the first quests

- **Owner:** Claude worker. **Branch/worktree:** `claude/quests-1`, `/home/user/lotf-quests1` (from main 0.262.0, with `claude/quests-design` merged).
- **Goal:** batch 1 of the approved quests and Eidolons design: the Heroes tab opens the tavern; All heroes, Quests and the gold "!"; the quest rules and saves; the log (Active, Board, Done; the Eidolons tab's place kept); Gwen Tallow and the quest board (pack placeholders); six ordinary quests; the tracked chip.
- **Scope:** new `src/sim/quests.ts`, `src/sim/questData.ts`, `src/questLog.ts`, `src/questCard.ts`, `src/questArt.ts`, `src/quests.css`, `src/art/quests/`, `tools/quests/`, `test/quests.test.ts`; hooks in `src/sim/modes.ts` (`settleRun`), `src/sim/meta.ts`, `src/home.ts`, `src/tavern.ts`, `src/standView.ts`, `src/main.ts`, `build.mjs` (the CSS); `CREDITS.md`.
- **Status:** ready for review. [Note](notes/quests.md); screenshots `samples/quests-1-*.png`.

### QUESTS-SUMMONS — Design: quests, the tavern, quest battles and six great summons

- **Owner:** Claude worker. **Branch/worktree:** `claude/quests-design`, `/home/user/lotf-quest-design` (from main 0.262.0).
- **Goal:** the owner's asks: great summons (a gauge filled across fights by boss waves, called by hand, never by Auto), earned by multi-part quest chains bound by the Summoner; an RPG quest system with many givers; the tavern made the quests' hub again; quest battles with a required cast; summons 2 to 6 ending in a fight against the being, the six ordered by difficulty.
- **Scope:** design only: `docs/notes/quests-summons-design.md`, concept mock-ups `docs/samples/quests-design-*.png` (`docs/samples/quests-design/mock.html`). No game code.
- **Status:** ready for the owner's review; seven open questions at the end of the note, each with a recommended answer. [Note](notes/quests-summons-design.md).

### BATTLE-HUD — The fight's hero rows and spell orbs; ULT-CUTIN — an ultimate's moment

- **Owner:** Claude worker. **Branch/worktree:** `claude/battle-hud-final`, `/home/user/lotf-hud` (from main 0.254.0).
- **Goal:** the owner's pick of the mock-ups (B's hero rows, C's spell orbs) made the fight screen everywhere, replacing the hero bar; then the owner's ask that an ultimate feel special: the fight pauses for a slash cut-in of the hero's art and the ultimate's name with the board dimmed round the caster, resuming at once for a lingering one, with a Settings toggle for a short version (no pause).
- **Scope:** new `src/fightHud.ts`/`.css`, `src/fightHudRules.ts`, `src/ultMoment.ts`, `src/ultMomentRules.ts`; hooks in `src/main.ts`, `src/standView.ts`; `src/index.html` (the spells' home), `src/settings.ts` (`ultFull`); the old hero bar and its CSS removed; tests `test/fight-hud.test.ts`, `test/ult-moment.test.ts`; `tools/battle-hud/shots.mjs`.
- **Status:** ready for review. [Note](notes/battle-hud.md); screenshots `samples/battle-hud-final-*.png`, `samples/ult-cutin-*.png`.

### ULT-EPIC — An ultimate's payoff

- **Owner:** Claude worker. **Branch/worktree:** `claude/ult-epic`, `/home/user/lotf-ult-epic` (from main 0.258.0, with `art/ult-kit` and main 0.259.0 merged).
- **Goal:** the owner-approved plan after the director's capture of ULT-CUTIN: the ultimate's own effects about twice the size, a huge burst of its element and a 0.15 s hit-stop and shake on the blow, the dim lifted over the whole effect and eased off as it lands, a moving banner (speed lines, drift, a stamped name), slash and impact stings, a short camera lean; the owner's painted kit (13 sheets, session `u-ultimate`) imported and used, with fallbacks.
- **Scope:** new `src/ultEpicRules.ts`, `test/ult-epic.test.ts`, `tools/ult-epic/`; `src/ultMoment.ts`, `src/ultMomentRules.ts`, `src/fightHud.css`; small hooks in `src/render/fx.ts`, `particles.ts`, `spellArt.ts`, `src/main.ts`, `src/standView.ts`; two cues in `soundRules.ts`/`audioProcessors.ts`; `tools/spell-fx/spell-parts.json`, `spell-fixes.json`, the `u-ultimate` atlas and its `index.json` entry only.
- **Status:** ready for review. [Note](notes/ult-epic.md); before/after `samples/ult-epic-before-393.png`, `samples/ult-epic-after-393.png`. One sheet worth repainting: `ult-speedlines` (its middle glow is a blob that beads when tiled).

### RPG-SPELLS B7 — The monster heroes

- **Owner:** Claude. **Branch/worktree:** `claude/spells-b7`, `/home/user/spells-b7`.
- **Authorisation:** owner approved design v2 (Mass Polymorph approved); batch 7 as briefed.
- **Scope:** Kitsune, Karasu Tengu, Yamabushi Tengu, Werewolf, Minotaur, Satyr, Gorgon, Shambler, Mummy and Kraken Mate kits on the toolkit (Mass Polymorph, Alter Self, Swoop, Cloud of Daggers, Gust of Wind, Wind Wall, Tempest, Pounce, the howl, the goring launches, Contagion, Plague Tide's burrow, Hold Person, the sand-wind, Grasping Tentacles, Tidal Wave), renames and tiers; the foes that borrow them keep the old moves. Wrap-up in `docs/notes/rpg-spells.md`.
- **Status:** ready for review. Parity: none beyond 6 at levels 1, 10 and 30 (at 30 only the Cleric beyond 4, +4.2); the Last Stand, Calamity, daily and armies exactly as main. Full `npm test` passes; screenshots `docs/samples/spells-b7-*`. [Notes](notes/spells-b7.md), [wrap-up](notes/rpg-spells.md). Next: batch 8 (paintings and sounds, as sessions B and D–G land) and batch 9 (the full rebalance).

### RPG-SPELLS B6 — The casters

- **Owner:** Claude. **Branch/worktree:** `claude/spells-b6`, `/home/user/spells-b6`.
- **Authorisation:** owner approved design v2; batch 6 as briefed.
- **Scope:** Fire Wizard, Lightning Mage, Warlock, Great Sage, Time Witch and Illusionist kits on the toolkit (Wall of Fire, Meteor Swarm's throws, Storm Surge's blink, Call Lightning, Eldritch Blast's shove, Circle of Death, Font of Magic, Transposition), renames and tiers.
- **Status:** ready for review. Parity: none beyond 6 at levels 1, 10 and 30 (none beyond 4 at 30); the Lightning Mage +5.5 → +3.5 at level 10; the daily as main, the Last Stand within about half a wave, the Calamity a little lower (1.41 maps, 1.47 on main). Full `npm test` passes; screenshots `docs/samples/spells-b6-*`. [Notes](notes/spells-b6.md). Next: batch 7, the monsters.

### RPG-SPELLS B5 — The ranged heroes and summoners

- **Owner:** Claude. **Branch/worktree:** `claude/spells-b5`, `/home/user/spells-b5`.
- **Authorisation:** owner approved design v2; batch 5 as briefed.
- **Scope:** Archer, Ranger, Gunslinger, Rifle Bot, Siege Bot, Dread Pirate, Beastmaster and Reaper kits on the toolkit (the leap back, the roll, the jets, blasts that throw, leaping wolves, the Reaper's drag), renames and tiers.
- **Status:** ready for review. Parity: none beyond 6 at levels 1, 10 and 30 (none beyond 4 at 30); the Siege Bot and Dread Pirate nearer the middle than on main; the Last Stand, Calamity, daily and armies as main. Full `npm test` passes; screenshots `docs/samples/spells-b5-*`. [Notes](notes/spells-b5.md). Next: the rest of design v2.

### RPG-SPELLS B4 — The melee heroes

- **Owner:** Claude. **Branch/worktree:** `claude/spells-b4`, `/home/user/spells-b4`.
- **Authorisation:** owner approved design v2; batch 4 as briefed.
- **Scope:** Samurai, Kunoichi, Ninja Monk, Barbarian, Mercenary, Lancer, Arc Blade, Demon Swordsman, Buccaneer and Queen Dragoon kits on the toolkit (blinks, leaps, launches, the Cavalry Charge, the Lightning Storm, the chains, the burning line), renames and tiers.
- **Status:** ready for review. Parity: none beyond 6 at levels 1, 10 and 30 (none beyond 4 at 30); the Last Stand and the Calamity as main. Full `npm test` passes; screenshots `docs/samples/spells-b4-*`. [Notes](notes/spells-b4.md). Next: batch 5, ranged and summoners.

### RPG-SPELLS B3 — The tanks and supports

- **Owner:** Claude. **Branch/worktree:** `claude/spells-b3`, `/home/user/spells-b3`.
- **Authorisation:** owner approved design v2; batch 3 as briefed.
- **Scope:** Knight, Paladin, Peasant, Juggernaut, Samurai Commander, Wolf Bard and Tyrant kits on the toolkit (Shield Rush, Divine Smite, Aura of Protection, Spear Wall, Seismic Slam, Tunnel Strike, Bane, the ultimates' additions), renames and tiers.
- **Status:** ready for review. Parity: none beyond 6 at levels 1, 10 and 30; Last Stand within half a wave of main to level 60. Full `npm test` passes; screenshots `docs/samples/spells-b3-*`. [Notes](notes/spells-b3.md). Next: batch 4, melee.

### RPG-SPELLS B2 — The healers and the revive

- **Owner:** Claude. **Branch/worktree:** `claude/spells-b2`, `/home/user/spells-b2`.
- **Authorisation:** owner approved design v2 and its revive rules; batch 2 as briefed.
- **Scope:** the Cleric, High Priestess, Wanderer and Druid kits (Spirit Guardians, Healing Mist, Mass Resurrection with its Wall of Light, Wall of Thorns, renames and tiers); the revive face on skill 2; placeholder looks.
- **Status:** ready for review. Parity: none beyond 6 at levels 1, 10 and 30; the healers within 4.5. Full `npm test` passes; screenshots `docs/samples/spells-b2-*`. [Notes](notes/spells-b2.md). Next: batch 3, tanks and supports.

### STAND-RETREAT — The Last Stand falls back room by room

- **Owner:** Claude worker. **Branch/worktree:** `claude/stand-retreat`, `/home/user/stand-retreat`.
- **Authorisation:** the owner approved the design: a fixed retreat (courtyard, library, chapel, throne room, five waves an act), a hold-the-line choice at each act's end, the retreat beat with auto-arranged posts, the room reached as a record, one music hook.
- **Scope:** `src/sim/standActs.ts` (new), `stand.ts`, `standAi.ts` (the last foes break off), `standHalls.ts` (the throne room's name), one optional field each in `battle.ts` (`StandMode.flee`) and `meta.ts` (`standAct`); `standView.ts`, `render/standHall.ts` (door, cave-in, the king's walk, enthroned in the throne room), `standRetreatLines.ts`, `render/standMusic.ts` (new), `stand.css`, one line in `home.ts`; the door art; `tools/stand-balance.ts` (`--hold`), `tools/stand/retreat-shots.mjs`; tests.
- **Status:** ready for review. Medians unchanged when falling back; holding reported separately. Typecheck, full `npm test` (1680, 0 failures), `npm run web`, browser checks at 393×852, 360×780 and 412×915 with no page errors. [Note](notes/stand-retreat.md); screenshots `samples/stand-retreat-*.png`. No merge or version bump.

### STAND-HOLD-RELIC — Holding the line pays a relic; the camp names the room

- **Owner:** Claude worker. **Branch/worktree:** `claude/stand-hold-relic`, `/home/user/lotf-stand-hold`.
- **Authorisation:** the owner's two decisions: a held wave pays gold and a relic; the Last Stand's continue line names the wave and room.
- **Scope:** `src/sim/stand.ts` (`holdRelic`, `holdPurse`, `purseLine`, `takeRelic` shared with `buyRelic`, `heldRelics`, `standContinueLine`), `standView.ts` (choice card wording, the relic plate, the end card's Relics row), `stand.css`, one line in `main.ts` (`slotInfo`); `tools/stand/hold-relic-shots.mjs`; `test/stand-retreat.test.ts`.
- **Status:** ready for review. Holding still costs mid parties about as much as before (within noise; see the note). Typecheck, full `npm test` (1680, 0 failures), `npm run web`, browser checks at 393×852, 360×780 and 412×915 with no page errors. [Note](notes/stand-hold-relic.md); screenshots `samples/stand-hold-relic-*.png`. No merge or version bump.

### SPELL-ART-REPAINT-2 — The owner's 17 round-two spell repaints imported

- **Owner:** Claude worker. **Branch/worktree:** `claude/spell-art-repaint-2`, `/home/user/lotf-repaint2`.
- **Scope:** merges `art/spell-fx-repaint-2` (#234); the B, E, G and U atlases and `index.json`; `tools/spell-fx/spell-fixes.json` (the keg's fix dropped). No game code changed.
- **Status:** ready for review. All 144 sheets pass; eight atlases 3.39 MB of the 5 MB cap at 96 px; the untouched rows checked identical. Typecheck, `npm test -- spell-fx ult`, full `npm test`, `npm run web`, before/after pictures at 393x852 with no page errors. [Note](notes/spell-art-repaint.md) ("Round 2", with what is still bad: the storm cloud, Call of the Wild's wolf, Reign of Terror's and Pipes' impacts); screenshots `samples/spell-repaint2-*.png`. No merge or version bump.

### SPELL-ART-REPAINT — The owner's 26 repainted spell sheets imported

- **Owner:** Claude worker. **Branch/worktree:** `claude/spell-art-repaint`, `/home/user/lotf-repaint`.
- **Scope:** merges `art/spell-fx-repaint` (#230); the B, E, F and G atlases and `index.json`; `tools/spell-fx/spell-fixes.json` (two fixes dropped, the keg's changed); the Aura of Protection's alpha back to normal (`AURA_ALPHA_OF` in `movePaints.ts`); `tools/spell-fx/shots.mjs` (the repainted moves, `PICK`, `PREFIX`). No sim changes.
- **Status:** ready for review. All 131 sheets pass; seven atlases 3.05 MB of the 5 MB cap at 96 px. Typecheck, `npm test -- spell-fx`, full `npm test` (1680, 0 failures), `npm run web`, before/after fight shots at 393x852 with no page errors. [Note](notes/spell-art-repaint.md) (with what still needs repainting); screenshots `samples/spell-repaint-*.png`. No merge or version bump.

### SPELL-ART-BDE — The painted spell effects, sessions B, D, E, F and G

- **Owner:** Claude worker. **Branch/worktree:** `claude/spell-art-bde`, `/home/user/lotf-art-bde`.
- **Scope:** merges `art/spell-fx` (#222, B), `art/spell-fx-d` (#223), `art/spell-fx-e` (#225), `art/spell-fx-f` (#226), `art/spell-fx-g` (#227); the atlases and `index.json`; import fixes (`tools/spell-fx/spell-fixes.json`, the importer's `frames`/`fade`); `src/render/movePaints.ts` (new); painted auras, moves, throws, stands and the snare in `fx.ts`; `auraLook` fixes; `spellLooks.ts` footed parts; `test/spell-fx.test.ts`; `tools/spell-fx/shots.mjs` (new); one credit line for all sessions in `CREDITS.md`; the art table in `notes/rpg-spells.md`. No sim changes.
- **Status:** ready for review. All 131 sheets pass and are drawn; seven atlases 2.80 MB of the 5 MB cap at 96 px. Typecheck, full `npm test` (1680, 0 failures), `npm run web`, real-fight contact sheets at 393x852 with no page errors. [Note](notes/spell-art-bde.md) (with the list to repaint); screenshots `samples/spell-art-bde-*.png`. No merge or version bump.

### SPELL-ART — The painted spell effects brought into the game (sessions A and C)

- **Owner:** Claude worker. **Branch/worktree:** `claude/spell-art`, `/home/user/spell-art`.
- **Scope:** merges `art/spell-fx` (#210) and `art/spell-fx-c` (#211); `tools/spell-fx/import-spell-art.py` and `spell-parts.json` (all 131 sheets of the brief); `src/art/fx/spells/` (the atlases and `index.json`); `src/render/spellLooks.ts`, `spellArt.ts` (new); the painted keys in `toolkitLooks.ts`; painted drawing helpers in `fx.ts`; a `half` option in `particles.ts`; `build.mjs` (service worker); `PREFIX` in `tools/spells/shots.mjs`; `test/spell-fx.test.ts`. No sim changes.
- **Status:** ready for review. All 25 sheets pass the format check; atlases 780 KB + 447 KB (1.20 MB of the 5 MB cap). Typecheck, full `npm test` (1599, 0 failures), `npm run web`, staged shots at 393x852 (and the launch at 360x780, 412x915) with no page errors. [Note](notes/spell-art.md); screenshots `samples/spell-art-*.png`. No merge or version bump.

### RPG-SPELLS-ART-C — Painted healers and revives

- **Owner:** current Codex chat. **Branch/worktree:** `art/spell-fx-c`, `/workspace/legends-of-the-fall`.
- **Scope:** Session C: ten healer/revive source sheets, packing/checks, credits and handoff; no runtime or Session A changes.
- **Completion:** generate and inspect all ten sheets, verify 256 px cells/frame counts/transparency, open a separate PR.
- **Status:** ready for source-art review: ten sheets / 19 rows / 128 frames, retained originals, crop layouts, reproducible packing/checks, preview and credits. Source checker, typecheck and web build pass. [Handoff](notes/spell-fx-art-c.md). Final fade-outs, loop continuity and live integration remain for review; no runtime changes, merge or version bump. Follows Session A PR #210. Imported and wired through SPELL-ART (`claude/spell-art`).

**ART-ASCEND / Upgraded hero forms and combat tier auras** — Owner: current Codex chat. Branch: `art/ascended-hero-forms`, worktree: `/workspace/legends-of-the-fall`. Goal: permanent upgraded hero artwork at Awakening (called ascension in the conversation), with existing class auras repurposed for combat grades on either form. Status: owner approved legendary upgraded gear and glowing mage eyes; requested compact silhouettes rather than broad bodies/capes. Owner authorised implementation. Implemented and validated; ready for owner review. All 49 hero/transformation forms, 98 sheets and 30 heritage gallery assets are imported; Knight and Paladin are distinct. Main 0.243.0 is integrated. Typecheck/build, 178 affected tests, all 2,744 animation cells, three phone sizes, first/second awakening, tier auras, transformations, Last Stand, reduced motion, fresh-save lazy loading/persistence and offline reload passed with no browser errors. No merge to main or deployment. Allowed scope: concept art and proposal notes initially; after visual approval, hero form assets, render mappings, combat aura selection, associated tests, offline packaging and credits. Preserve simulation values, hero identities, save keys and unrelated artwork. Completion: approved three-hero sample, then all 45 forms with required facings/actions, tier effects, typecheck/build and relevant portrait/offline checks. Combat mapping: grade 1 none, grade 2 existing light aura, grades 3–4 existing strong aura (tier 4 retains its other flourishes); independent of permanent awakening. Handoff: [proposal](notes/ascended-hero-forms.md). Draft PR: [#208](https://github.com/Hpatter9/legends-of-the-fall/pull/208).

### RPG-SPELLS-ART — Painted movement effects

- **Owner:** current Codex chat. **Branch/worktree:** `art/spell-fx`, `/workspace/legends-of-the-fall`.
- **Scope:** Session A painted source sheets, asset credits and handoff; no runtime changes.
- **Completion:** inspect generated art, check grid/transparency, open a PR; record any missing sheets and importer dependency honestly.
- **Status:** Session A ready for source-art review: 15 sheets / 36 rows, retained originals, reproducible 256 px packing, credits and structural checks. All sheets pass the source checker; typecheck and web build pass. [Handoff](notes/spell-fx-art.md). Sessions B–G (116 sheets), importer/runtime integration and live checks remain; review beam seams and loops at integration. No merge or version bump. Imported and wired through SPELL-ART (`claude/spell-art`).

### DARK-WAVE — Some waves, the screen darkens

- **Owner:** Claude worker. **Branch/worktree:** `claude/dark-wave`, `/home/user/dark-wave`.
- **Cause:** the fight's weather is rolled per board, so about one wave in eight is night: a flat deep-blue tint at 0.36 over the whole screen took about 30% of the light off the board (rain, about one in eight too, took 15%). No dim was left on or stacking.
- **Fix:** flat tints capped at 0.15 (night 0.14, rain 0.1, ash and embers 0.08); night's mood moves to darkened edges (a vignette clear over the board). A dim from a fall is lifted when a heart burns and the wave starts again.
- **Status:** ready for review. Typecheck, full `npm test` (1680, 0 failures), `npm run web`, browser checks at 393×852, 360×780 and 412×915 with no page errors. [Note](notes/dark-wave.md); [before](samples/dark-wave-before-393x852.png); [after](samples/dark-wave-after-393x852.png). No merge or version bump.
### RPG-SPELLS B0/B1 — Fixed skill keys and the movement toolkit

- **Owner:** Claude. **Branch/worktree:** `claude/spells-b01`, `/home/user/spells-b01`.
- **Authorisation:** owner approved design v2 (`docs/notes/rpg-spells-design.md`) and said build; batches 0 and 1 first.
- **Scope:** skill keys (`keyOf`, `skillShown`, foes' own copies); the toolkit in `src/sim/toolkit/` (move rule, charge, teleport, pull, shove/launch, burrow, six walls, auras, swap, AI choices, boss rules) with placeholder looks. No hero uses it yet.
- **Status:** ready for review. Every fight hashes as on main (`test/spells-identity.test.ts`); full `npm test` passes; staged screenshots in `docs/samples/spells-b01-*`. [Notes](notes/spells-b01.md). Next: batch 2, healers and the revive.

### CAL-SANCTUARY — Portal expeditions and destination arenas

- **Owner:** current Codex chat. **Branch/worktree:** `feat/rift-sanctuary`, `/workspace/legends-of-the-fall`.
- **Authorisation:** owner approved the Rift Sanctuary concept and encounter loop; requested complete destination scenery, distinct battle environments and the established ornate UI.
- **Scope:** new-run portal expedition rules, sanctuary and location UI/art, destination battle boards/backdrops, saved progression and legacy compatibility. Preserve altar/combat/reward systems unless needed for the approved expedition loop.
- **Completion:** three destination previews, explicit enter/return flow, recruitment and growth, region guardians, altar-influenced worlds, complete themed arenas with arrival portal; deterministic regression coverage, typecheck/build, three portrait sizes, offline and resume checks, credits and handoff. No merge/deployment/version bump.
- **Integration:** merged with main up to 0.229.0 (short card, per-hero region and end detail, battle music, hero names, no merging kept); full `npm test` passes; [notes](notes/rift-sanctuary.md#brought-up-to-main-02290).
- **Status:** implemented and ready for review. Typecheck/build and thirteen affected test files passed; the separate difficulty checks also passed. Live portal/battle/altar/recruit/offline flows passed at 393×852, 360×780 and 412×915; all six arenas captured at every size. Shop/rest actions, guardian → offering → recap → next region, a full company, interrupted crossing/reload and existing graph-save compatibility passed with no page errors. [Handoff](notes/rift-sanctuary.md); [live sanctuary](samples/rift-sanctuary/sanctuary-393.png); [battle example](samples/rift-sanctuary/arena-rootbound-393.png). No merge or deployment.


### CAL-MAP-LIVE — Dungeon map and arrival portal

- **Owner:** current Codex chat. **Branch / worktree:** `feat/calamity-dungeon-map`, `/workspace/legends-of-the-fall`.
- **Authorisation:** owner approved the dungeon-floor proposal and requested a visible portal that brings the heroes into the Calamity. No further visual approval needed within this direction.
- **Scope:** replace the live Calamity map renderer, layout and navigation UI; original arrival-portal artwork, hero arrival/movement, existing route/encounter/save callbacks, offline assets, affected tests and portrait checks. Also integrate the previously requested altar artwork/style that the owner preferred. Preserve combat, altar choices, run rewards, legacy save keys and other modes.
- **Completion:** portal present at every region entrance, starter emerges there on a fresh arrival, real reachable-room navigation and battles/shops/recruits, safe revisiting including portal, reload/mid-walk compatibility, reduced motion, offline reload and all three phone sizes verified.
- **Status:** implemented; ready for review. Typecheck/build, seven affected test files, three-size live encounter/altar/offline checks and focused portal/travel/modal recovery checks passed. [Handoff](notes/calamity-dungeon-live.md); [arrival preview](samples/calamity-dungeon-live/arrival-393.png). No merge or deployment.


### CAL-MAP-RIFT — Research-led dungeon floor

- **Owner:** current Codex chat. **Branch / worktree:** `design/calamity-dungeon-floor`, `/workspace/legends-of-the-fall`.
- **Goal:** research King God Castle Great Rift and retry the map around its exploration flow.
- **Scope:** sourced design notes, original encounter symbols and an interactive room/corridor prototype with starter movement, directional controls, revisiting and clear room types. Preserve ornate styling and three-region Calamity rules.
- **Completion:** research cited, new example rendered at all three phone sizes, movement/selection/revisit checks, saved handoff for visual review before live integration.
- **Status:** research documented and cited; original encounter-symbol atlas and interactive chamber/corridor prototype completed. Browser checks passed at 393×852, 360×780 and 412×915 for movement, revisiting, keyboard, tap entry, unreached-room blocking, 44px arrow targets and no errors/overflow. Typecheck/build passed. Owner approved the direction; live integration is complete under CAL-MAP-LIVE. [Handoff](notes/calamity-dungeon-floor.md); [revised example](samples/calamity-dungeon/proposal-393.png). Supersedes the scenic overworld proposal as the active direction.


### CAL-MAP-NEW — Replace the Calamity map

- **Owner:** current Codex chat. **Branch / worktree:** `design/calamity-overland`, `/workspace/legends-of-the-fall`.
- **Goal:** owner rejected the old floating-island map and requested an entirely new visual style.
- **Scope:** original continuous-landscape map art, a playable visual prototype with ornate UI, readable routes and distinct encounter landmarks; integrate after the visual-direction check required above. Preserve the new three-region run and altar mechanics.
- **Completion:** new map look reviewed, then production renderer replacement, existing save/route behaviour retained, portrait/accessibility/offline checks and affected tests.
- **Status:** new landscape and nine landmark assets generated; interactive proposal uses the real first-region route graph. Browser checks passed at all three phone sizes, including selection, simulated travel and unreached-route locking. Typecheck/build passed. Superseded by the approved dungeon-floor direction and CAL-MAP-LIVE implementation. [Handoff](notes/calamity-overland.md); [new map preview](samples/calamity-overland/proposal-393.png).


### ALTAR-UI — Ornate altar sanctuary

- **Owner:** current Codex chat. **Branch / worktree:** `design/altar-sanctuary`, `/workspace/legends-of-the-fall`.
- **Scope:** altar presentation and ritual effects; owner subsequently requested original generated altar assets, now saved with provenance and credits. Preserve altar rules, choices, run progression, saves and other screens.
- **Completion:** visual direction reviewed before integration; accessible portrait UI at all three phone sizes, reduced motion, offline support, typecheck/build and affected checks.
- **Status:** visual proposal rendered and checked at 393×852, 360×780 and 412×915; no page errors or horizontal overflow, ritual actions fit. Owner requested new assets: nine transparent altar/crest/ritual motifs and a sanctuary backdrop are generated, saved and shown in an updated preview. Typecheck/build and offline prototype checks at all three sizes passed. Production UI integration is complete under CAL-MAP-LIVE. [Handoff](notes/altar-sanctuary.md); [new-art preview](samples/altar-sanctuary/generated-393.png).


### CAL-RIFT — Starter-led altar runs

- **Owner:** current Codex chat. **Branch / worktree:** `feat/calamity-altar-runs`, `/workspace/legends-of-the-fall`.
- **Scope:** new Calamity runs, tracked starter growth, three altar slots, corruption, combat integration, existing map/picker UI, tests and handoff. Existing saved runs, unrelated modes and artwork preserved.
- **Completion:** playable solo opening, recruits, three regions, starter evolutions and altar choices with visible consequences; deterministic regression tests, typecheck/build and portrait checks.
- **Status:** implemented; typecheck/build, Calamity playthrough checks, new rift regression coverage and affected callers passed. Browser checks passed at 393×852, 360×780 and 412×915: opening victory, patron, corruption, offering, commandment and reforge; no page errors or horizontal overflow; offline reload retained choices at every size. Handoff: [starter-led altar runs](notes/calamity-altar-runs.md). No merge or deployment requested.
**SUMMON-ARRIVAL / Hero arrival showcase** — Owner: Codex. Branch: `design/hero-arrival-showcase`, worktree: `/workspace/legends-of-the-fall`. Scope: first-time reveal presentation, foreground sprite attack then idle, existing artwork, affected visual checks and notes. Owner approved the visual concept and requested the sprite in front performing a small attack then idling. Completion: stronger charge/impact/payoff, one attack then idle, skip/queue/save/reduced-motion/offline preserved, typecheck/build, affected tests and all three portrait sizes. Status: implemented and validated; ready for owner review. Typecheck/build, four affected test files, all three portrait sizes, reduced motion, varied heroes, a real stone summon and offline reload passed with no page errors. [Handoff](notes/summon-arrival.md), [implemented preview](samples/summon-arrival/revealed-393.png). PR: [#193](https://github.com/Hpatter9/legends-of-the-fall/pull/193). Latest main integrated; no merge to main or deployment.

**STAND-005 / Room artwork replacement** — Owner: current art chat. Branch: `art/stand-room-depth`, worktree: `/workspace/legends-of-the-fall`. Scope: Last Stand renderer, new generated production artwork, selected-ruler integration, ruler self-defence in `standAi.ts`/`units.ts`, affected tests, art credits, visual tooling and notes. Owner rejected the coarse reused assets and explicitly requested new artwork matching the ornate concept, retaining the central king and combat layout. Completion: new room assets visibly integrated in four rooms, selected castle king reused, stable depth sorting, reduced motion, typecheck/build, affected tests and three portrait sizes. Status: artwork and standing ruler defence complete. The selected ruler stands before a separate rear throne and strikes adjacent foes without chasing. Typecheck/build, eight affected test files, the finishing-blow check, three portrait sizes, reduced motion, the current nine ruler choices and event-driven melee pass. No page errors. PR: [#178](https://github.com/Hpatter9/legends-of-the-fall/pull/178), ready for review; main 0.213.0 integrated, retaining its default King and picker. No release or deployment. Handoff: [room artwork](notes/stand-room-depth.md).

### HERITAGE-LOOKS — A varied cast: re-toned hero sprites, every hero named, a prompt for new paintings

- **Goal:** the owner's asks: "Is there a way to add more ethnicity to the game" (skin-tone variety on the heroes' sprites and portraits, and new painted artwork from a ChatGPT prompt; "just want more cultures represented") and "I also want to give all the heroes names. So they feel more unique and less generic".
- **Status:** done on the branch; not merged. Part 2 (the paintings) waits for the owner to run the prompt.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/heritage-looks`, `/home/user/heritage-looks` (from main 0.222.0, main 0.224.0 merged in); PR none.
- **Allowed files or systems:** new `src/sim/heroLooks.ts`, `src/sim/heroNames.ts`, `src/art/units/*_{deep,brown,tan,olive}.png`, `tools/heritage/`; the generated `src/render/resonanceArt.ts` (regenerated) and its generator `tools/resonance/apply.cjs` (`--art-only`, the re-toned map), `tools/resonance/atlas.cjs` (`sharp` loaded lazily); `test/heritage-looks.test.ts`; name hooks (display only) in `menuHeroes.ts`, `heroArtwork.ts`/`.css`, `heroBar.ts`, `gacha.ts`, `summonTarot.ts`, `hall.ts`, `codexView.ts`, `starter.ts`, `rankUpView.ts`, `party.ts`, `recapView.ts` (two names), `main.ts` (four names); `.gitignore` (the paintings' originals); `CREDITS.md`; `docs/notes/heritage-looks.md`, `docs/notes/heritage-art-prompt.md`, `docs/samples/heritage-*.png`.
- **Completion criteria:** about half the human heroes in a non-light look, spread over roles and both starter packs, skin (and two heroes' hair) recoloured pixel-exact with the source sheets kept; every hero a short unique name shown as "Name · Class" where heroes are presented and alone on the hero bar; the art prompt with the exact file spec and an import script; typecheck, affected and full tests, web build; 393x852, 360x780, 412x915 with names fitting.
- **Validation and handoff:** [notes](notes/heritage-looks.md), [art prompt](notes/heritage-art-prompt.md).

### FX-CLEAR — Effects see-through over fighters; skill 2 pip greyed until it opens

- **Goal:** the owner's asks: "Some of the effects cover the heroes too much, make them more opaque." (the fighters should show through) and "The 10 can be removed and the second box can be greyed out till unlock."
- **Status:** done on the branch; not merged.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/fx-clear`, `/home/user/fx-clear` (from main 0.220.0); PR none.
- **Allowed files or systems:** new `src/render/overFighter.ts`; small hooks in `src/render/fx.ts` (`anim`, `overBody`, the particles' `cover`), `src/render/particles.ts` (`cover`), `src/render/statusStyles.ts` (`OVER_BODY`, `partAlpha`, two front parts' size), `src/render/ailmentLayer.ts`; `src/heroBar.ts`, `src/battleUi.css` (`.hbPips b.shut`); `test/fx-clear.test.ts`; new `tools/fx-clear/shots.mjs`; `docs/notes/fx-clear.md`, `docs/notes/hero-kits.md`, `docs/samples/fx-clear-*.png`.
- **Completion criteria:** effects over a fighter thinned by named constants (`OVER_FIGHTER_ALPHA` 0.6, `OVER_FIGHTER_STATUS_ALPHA` 0.7) and still visible, ground and back layers unchanged, no blinking, reduced motion kept; pip 2 reads "2" and is greyed while locked; typecheck, affected and full tests, web build; 393x852, 360x780, 412x915.
- **Validation and handoff:** [notes](notes/fx-clear.md).

### MID-EVENTS — A market on the passing cart; twelve more events between waves

- **Goal:** the owner's ask: "More mid battle events or more in depth ones. Like the passing cart only has two items? ... Let's add some more for a unique experience."
- **Status:** done on the branch; not merged.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/mid-events`, `/home/user/mid-events` (from main 0.232.0); PR none.
- **Allowed files or systems:** `src/sim/midEvents.ts`, `src/sim/market.ts` (new), `src/sim/events.ts` (road draw, market, new effects), `src/sim/run.ts` (optional `Buff.twist`, `Run.road`, `gearStage`, the twist in `startStage`), `src/sim/autoplay.ts` (no-leave cards), `src/events.ts` (icons, buys), small hooks in `src/main.ts` (`afterEvent`, `placeSquad`, the banner) and `src/twistView.ts` (`twistIcon`); `test/midEvents.test.ts`, the `daily` hash of `test/fixtures/ailment-logs.json`; `tools/mid-events/`; `docs/notes/mid-events.md`.
- **Completion criteria:** the cart sells 5-6 wares with limited buys and a rummage; 12 road events and 2 follow-ups with real choices, weighted by army and land, no repeats; deterministic side streams; old saves load; daily and army pace unchanged; typecheck, full tests, web build; three portrait sizes.
- **Validation and handoff:** [notes](notes/mid-events.md).
### RECAP-REVEAL — Every item on the wave card; no spoils in the end recap; earned heroes walk in

- **Goal:** the owner's asks: "The wave recap should show all items gained, spoils don't really matter if they leave" and "When a hero is obtained through a task, they shouldn't act like they came from the summoner. They can have a similar reveal, but not from the summoner."
- **Status:** done on the branch; not merged.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/recap-reveal`, `/home/user/recap-reveal` (from main 0.233.0, merged up to 0.235.0); PR none.
- **Allowed files or systems:** new `src/sim/waveGains.ts`, `src/sim/heroArrival.ts`, `src/earnedArrival.ts`, `test/recap-reveal.test.ts`, `tools/recap-reveal/shots.mjs`; `src/sim/waveCard.ts` (optional `gains`), `src/waveCardView.ts` (the chips), `src/recapView.ts` and `src/towerView.ts` (spoils lists removed), `src/sim/runRecap.ts` (comment), `src/render/revealSprite.ts` (optional walk), `src/summonTarot.ts` (`queueReveal` picks the arrival), small hooks in `src/main.ts` (snapshot before the settlement, gains on the card), `src/battleReports.css`; `docs/notes/recap-reveal.md`.
- **Completion criteria:** the short card lists every item a wave gained, grouped, with icons, without covering most of the board; the end recap and the spire's summary drop the run-only spoils; the ten milestone heroes arrive at the keep's overlook with their deed named and no summoner, keeping the queue, skip guard, seen flag and reduced motion; typecheck, affected and full tests, web build; three portrait sizes in Chromium.
- **Validation and handoff:** [notes](notes/recap-reveal.md).

### WAVE-RECAP-2 — The short card for the spire and the Calamity; their detail in their summaries

- **Goal:** the owner's answer: "Yeah, give them the same treatment" (the short, see-through card between spire floors and Calamity fights, the detail moved to their end summaries).
- **Status:** done on the branch; not merged.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/wave-recap-2`, `/home/user/wave-recap-2` (from main 0.223.0); PR none.
- **Allowed files or systems:** `src/sim/runRecap.ts` (`recapSince`, `closeMapLeg`), `src/sim/tower.ts` (optional `MapRecap.detail`, `TowerState.recapAt`), `src/sim/waveCard.ts` (`towerHeadline`), `src/recapView.ts` (`recapDetail`), `src/towerView.ts` (summaries, victory, map recap), small hooks in `src/main.ts` (settle, `passOn`; the old per-fight table and XP cards removed), `src/battleReports.css`; `test/wave-recap.test.ts`; `tools/wave-recap/` (saves, tower shots); `docs/notes/wave-recap-2.md`.
- **Completion criteria:** every spire floor and Calamity fight shows the short card (see-through, leaving by itself after a win); their summaries, the Calamity's victory and map recaps carry the per-hero detail and a fight-by-fight strip; typecheck, affected and full tests, web build; three portrait sizes in Chromium.
- **Validation and handoff:** [notes](notes/wave-recap-2.md).

### WAVE-RECAP — A short, see-through card between waves; the detail kept for the end recap

- **Goal:** the owner's asks: "Let's do a shorter recap of a wave and keep most of the info for the end of the battle" and "Make the between wave recap see through and have it show while the units travel to the next wave".
- **Status:** done on the branch; not merged.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/wave-recap`, `/home/user/wave-recap` (from main 0.220.0); PR none.
- **Allowed files or systems:** new `src/sim/waveCard.ts`, `src/waveCardView.ts`, `test/wave-recap.test.ts`, `tools/wave-recap/shots.mjs`; `src/sim/runRecap.ts` (optional `waves`, `found`, `noteWave`, `heartsBurned`); `src/recapView.ts` (wave-by-wave strip, spoils, hearts burned); small hooks in `src/main.ts` (settle, refresh's result block, `stepPassing`); `src/index.html` (`#waveNotes`); `src/battleReports.css`; `tools/battle-ui/report-shots.mjs` (the wave-victory step); `docs/notes/wave-recap.md`.
- **Completion criteria:** a won wave with more to come shows a short, see-through card over the march that leaves by itself; the last card (a loss with no hearts, a cleared run) is short and leads to the full recap, which totals the performance, XP, levels, pay and finds and adds a wave-by-wave strip; the spire and the Calamity unchanged; typecheck, affected and full tests, web build; three portrait sizes in Chromium.
- **Validation and handoff:** [notes](notes/wave-recap.md).

### SPELL-SFX — Sound effects for the king's spells

- **Goal:** the owner's ask: "Need to add sound effects for the king spells".
- **Status:** done on the branch; not merged.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/spell-sfx`, `/home/user/spell-sfx` (from main 0.218.0); PR none.
- **Allowed files or systems:** new `tools/spell-sfx/` (kit, sounds, render, probe), new `src/sfx/*.opus`, new `src/render/spellSfx.ts`, `spellBank.ts`, `spellSfxManifest.ts`; small hooks in `src/render/sound.ts` (`playEvents`' top, `unlock`), `soundRules.ts` (two mix cues, `spellCues` exported, the meteor's doubled fall), `audioRules.ts` (the pan of a spell cast on no tile), `audioProcessors.ts` (two cue names), `build.mjs` (copies `src/sfx`), `src/standView.ts` (the extra cast chime); `test/spell-sfx.test.ts`; `CREDITS.md`; `docs/notes/spell-sfx.md`.
- **Completion criteria:** every spell its own cast and effect sound, timed to its look, on the effects bus, panned, muted with the rest, offline, with the synthesised cues as the fallback; typecheck, affected and full tests, web build; every spell cast once in Chromium.
- **Validation and handoff:** [notes](notes/spell-sfx.md).

### TIER-PROMISES — The tier skills do what their words say

- **Goal:** the owner's answer to RANK4-SKILLS' questions 2 and 3, "Make them work": every tier 2, 3 and 4 skill does what its description promises.
- **Status:** done on the branch; waiting for the owner.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/tier-promises`, `/home/user/tier-promises` (from main 0.221.0); PR none.
- **Allowed files or systems:** `src/sim/tierSkills.ts` (cast modifiers on the improved skill, `ON_CAST`; a few entries' modifiers and words), `src/sim/abilities.ts` (`followUp` makes one follow-up for each `extra`; a volley's and a judgement's `reach` widens its patch, `landArea`'s `r`), `src/sim/battle.ts` (`Pending.r`, the `area` event's `r`), `src/render/fx.ts` (a wider patch drawn), tests (`tier-skills`, the `ailments-identical` fixture's `army` and `daily`), `docs/notes/tier-promises.md`. Not `GRADE_MULT`, the merging or the economy (`claude/merge-two`).
- **Completion criteria:** every tier skill's words true in the fight; grade 2 to 4 steps and parity measured before and after at levels 1 and 30; typecheck, full tests, web build.
- **Validation and handoff:** [notes](notes/tier-promises.md).

### RANK4-SKILLS — A fourth tier skill for every hero

- **Goal:** the owner's ask, with heroes going to four ranks (two of a kind merge; `claude/merge-two`): "A new rank-4 skill each": every hero a fourth version of its skill with its own name, as tiers 2 and 3 have.
- **Status:** done on the branch; waiting for the owner.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/rank4-skills`, `/home/user/rank4-skills` (from main 0.218.0); PR none.
- **Allowed files or systems:** `src/sim/tierSkills.ts` (the tier 4 entries, `TOP_TIER`, the `cleanse` rider), `src/codexView.ts` and `src/menuHeroes.ts` (a "Tier 4" line), `tools/balance.ts` (`--tier-cap`), new `tools/rank4/`, `tools/fxlab/audit.ts` (a Tier 4 column), `test/tier-skills.test.ts`, `docs/notes/rank4-skills.md`, `docs/samples/rank4-skills-*.png`. Not `run.ts`'s merging, `MAX_GRADE`, `GRADE_MULT` or the merge UI.
- **Completion criteria:** 45 named tier 4 skills a step past tier 3; grade 4 and up casts them whatever `MAX_GRADE` is; grade 3 fights unchanged; parity of the tier 4 skills measured; typecheck, full tests, web build; the hero card at three sizes.
- **Validation and handoff:** [notes](notes/rank4-skills.md).
### AURA-ART — Generated painted ascension effects

- **Owner:** Codex. **Branch / worktree:** `art/painted-ascension-auras`, `/workspace/legends-of-the-fall`.
- **Goal:** replace outdated pixel aura assets with generated painted effects for all 13 classes and both ascension levels.
- **Scope:** aura source artwork, shipped atlas/import tooling as needed, credits, visual evidence and handoff. Preserve class identities, placement, gameplay, saves, reduced motion and offline support.
- **Status:** implemented and validated; ready for review. Owner approved the generated painted proposal. No merge or deployment requested.
- **Completion:** approved visual direction, all 80 aura parts replaced, typecheck/build and aura tests pass, affected screens reviewed at three portrait sizes.
- **Validation:** typecheck, web build and all four affected test files passed. All 480 frames audited; all 13 classes at both steps checked in Pixi. Camp/roster/dossier and representative battle fixtures passed at all three portrait sizes, reduced motion and battery saver, with zero page errors. Offline reload passed at 393×852.
- **Handoff:** [painted ascension auras](notes/painted-ascension-auras.md), [all-class comparison](samples/painted-auras/all-classes.jpg).

### STARTER-KING — Two fixed starter packs of simple heroes; the classic king is the default ruler

- **Goal:** the owner's asks: "The 3 starter packs should be reduced to 2 starter packs that are always the same and are simple characters."; "The default king should be the stereotypical man king."; and (added) "The animations for the kings on the throne is weird. The thrones move around too much. Make them stable and give them a simple idle animation."
- **Status:** done; released as 0.212.0 (a saved Iron Stag never picked moves to The King, the director's call on the owner's intent).
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/starter-king`, `/home/user/starter-king` (from main 0.208.0); PR none.
- **Allowed files or systems:** `src/sim/starter.ts` (`FIXED_PACKS`, `readStarter`), `src/sim/meta.ts` (two calls), `src/starter.ts` (the pick screen), `src/rulerRules.ts`, `src/rulerUrls.ts`, `src/render/rulerArt.ts` (throne cells, the seated breath), `src/render/standHall.ts` (the seated texture), `src/settings.ts` (picker wording, The King's portrait), new `src/art/rulers/the_king.png` and `tools/rulers/the-king.py`, `tools/rulers/check.mjs`, new `tools/rulers/seat-strip.mjs` and `seat-montage.py`, new `tools/starter-packs/`; tests `test/starter.test.ts`, `test/rulers.test.ts`, `test/settings.test.ts`, `test/hero-shards.test.ts`, `test/new-heroes.test.ts`; `CREDITS.md`, `CLAUDE.md` (one line), `docs/notes/no-rarity.md` (a pointer), `docs/notes/starter-king.md`, `docs/samples/starter-king-*.png`, `docs/samples/ruler*-the_king-*.png`.
- **Completion criteria:** two fixed packs (front-liner, striker, back-liner each, named, with chips) about equal on the first army at level 1; old saves safe (picked keeps its heroes; mid-pick moves to the two); The King a ninth ruler and the default, working in the castle, Last Stand, cinematics and picker; every ruler's throne still when seated, with a gentle idle; typecheck, affected and full tests, web build; 393x852, 360x780, 412x915.
- **Validation and handoff:** [notes](notes/starter-king.md).

### KING-ART — Eight player rulers and action animations

- **Owner:** Codex. **Branch / worktree:** `design/king-artwork`, `/workspace/legends-of-the-fall`.
- **Goal:** redo the player's ruler everywhere, with proper action animations and eight Settings options: five sexy adult women and three adult men, with completely varied styles.
- **Status:** owner approved the personality roster and authorised implementation. Implemented on the branch; owner requested [PR #165](https://github.com/Hpatter9/legends-of-the-fall/pull/165) for Claude to merge. Latest main (0.200.0) integrated; PR not merged or deployed.
- **Scope:** eight rulers' artwork, saved ruler settings choice, matching ruler titles/pronouns, castle throne drawing, Last Stand king rendering/event hooks, cinematic ruler rendering, associated asset metadata, credits, checks and notes. Enemy kings and simulation rules excluded.
- **Completion:** approved consistent seated/standing design; distinct action animations driven by events; reduced motion and offline support preserved; typecheck, web build, affected tests and three portrait sizes checked.
- **Validation:** typecheck and web build passed; eight affected test files passed; final browser checks at 393×852, 360×780 and 412×915 passed with no page errors, including all eight appearances, saved selection, action completion, reduced motion and offline reload.
- **Handoff:** [ruler artwork and validation](notes/king-artwork.md), [Settings preview](samples/rulers-settings-393x852.png).

**ART-003 / Four seductress redesigns** — Owner: current Codex chat. Branch/worktree: `art/seductress-four`, `/workspace/legends-of-the-fall`. Scope: approved adult Kitsune, Gorgon, Illusionist and Time Witch costume redesigns; their front/rear animation assets, packaging evidence and credits. Preserve identities and combat. Completion: all four designs applied, complete animations/facings, asset validation, typecheck/build, affected tests and three phone sizes reviewed. Status: implemented and validated; ready for owner review. Typecheck/build, three affected test files, 2,800 asset-cell checks, and browser checks at all three phone sizes passed, including offline reload at 393. Handoff: [notes](notes/seductress-four.md); [implemented preview](samples/seductress/packed-preview.png). No merge or deployment requested.

**ART-004 / Anime hero gallery** — Owner: current Codex chat. Branch: `art/anime-hero-gallery`, worktree: `/workspace/legends-of-the-fall`. Scope: generated anime cutouts for all 45 collectible heroes, roster/detail presentation and accessible full-art viewer, build/offline asset handling, credits and visual checks. Kitsune, Gorgon, Illusionist and Time Witch follow the owner’s supplied redesign concept; other heroes retain identities and colours. Direction confirmed by owner on 2026-10-28. Preserve battle sprites, simulation and saves. Completion: all 45 artworks available, overview cutouts open full artwork, typecheck/build and affected portrait/offline checks pass. Status: implemented and validated; ready for owner review. All 45 scenes and transparent cutouts shipped (90 offline assets). Typecheck/build, five affected test files, all 45 hero viewers, all three phone sizes, existing dossier flows and offline reload passed. [Handoff](notes/anime-hero-gallery.md), [all scenes](samples/anime-heroes/scenes-contact.jpg). Owner requested PR: [#169](https://github.com/Hpatter9/legends-of-the-fall/pull/169).

**ART-002 / Resonance full roster** — Owner: current Codex art chat. Branch: `art/resonance-roster`, worktree: `/workspace/legends-of-the-fall`, based on the approved ART-001 pilot. Scope: all 43 remaining collectible heroes, animation sheets and necessary hero-form render mappings, size bands, asset credits, art tooling and portrait/battle evidence. Preserve combat rules, save keys, hero identities, enemies and unrelated UI work. Owner extended scope to four isometric facings and visibly grounded walking cycles. Completion: all 45 heroes use front/rear facings mirrored left/right, walking is reviewed as a loop with alternating footfalls, required animations and transformations remain available, typecheck/build/affected tests and all three phone sizes pass. Status: implemented and validated; ready for owner review. All 11 affected test files, typecheck/build, 2,800 asset-cell checks and three phone sizes pass; offline reload passes. Handoff: [notes](notes/resonance-roster.md). No merge or release requested.
**SUMMON-TAROT / Shards as tarot cards, every hero's first-time reveal; joins always get their unlock scene** — Owner: Claude. Branch/worktree: `claude/summon-tarot`, `/home/user/summon-tarot`. The owner: shards as tarot cards rather than the hero's figure, and an exciting reveal the first time a hero is seen; and a bug report: a join should always play the unlock scene. Phase A mock-ups approved with every recommendation (silhouette face; the tarot reveal is the whole unlock scene, no hall ritual; five to a row, turning by themselves; every hero incl. earned in play, starters and old saves' heroes seen; the PixelLab frame; rank shards as cards). Scope: `src/summonTarot.ts` (new), `src/gacha.ts`, `src/home.ts`, `src/main.ts` (earned reveal, old hook removed), `src/sim/heroesSeen.ts` (new) and the optional `Meta.heroesSeen` in `src/sim/meta.ts`, art `src/art/tarot/arcana.png` and `src/art/ui/tarot-frame.png`, credits, `test/heroes-seen.test.ts`, `tools/summon-tarot/`. Status: **done; owner approved and released as 0.210.0**. The skip-fix half shipped in 0.207.0; the tarot path also closes a lost reveal when a pull or Continue interrupted a batch. Validation: typecheck, web build, affected tests, full suite, `join-show.mjs` (every join path, nothing left unseen) and `shots.mjs` at 393x852, 360x780, 412x915 and reduced motion with no page errors. See [handoff](notes/summon-tarot.md), [screens](samples/summon-tarot-sheet.png).

### HEROBAR-LOCK — No "Lv 30" or ultimate ring on the hero bar until the ultimate unlocks

- **Goal:** the owner's ask: "In the battle screen, the units have LV 30 on them in the bottom section if they don't have the ultimate yet and that doesn't need to be there. The bar for the ultimate doesn't need to exist until they have it unlocked."
- **Status:** done; released as 0.211.0.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/herobar-lock`, `/home/user/herobar-lock` (from main 0.209.0); PR none.
- **Allowed files or systems:** `src/heroBar.ts`, `src/battleUi.css` (`.hb.locked`), `src/standView.ts` (the pause sheet's ultimate line), `tools/kits/shots.mjs` (its locked check now expects no plate and no ring), new `tools/herobar-lock/shots.mjs`; `docs/notes/herobar-lock.md`, `docs/samples/herobar-lock-*.png`. Not the sim or the ultimate's charge rate.
- **Completion criteria:** a locked hero's tile shows no "Lv 30", no ring and no dimming, with the portrait filling the ring's place (no gap); an unlocked one unchanged; ordinary fights, the daily, the Calamity and the Last Stand; typecheck, tests, web build; 393x852, 360x780, 412x915.
- **Validation and handoff:** [notes](notes/herobar-lock.md).

### OPTIONS-MENU — Settings in submenus; Updates and notes

- **Goal:** the owner's asks: "Let's add an updates and notes section in the options. This will show what was changed in the last updates so I can look back at what's new and what version they came out. Keep it summarised." and "We should probably condense the options menu into more menus."
- **Status:** done; ready for review.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/options-menu`, `/home/user/options-menu` (from main 0.233.0); PR none.
- **Allowed files or systems:** `src/settings.ts` (the submenus, the updates page, the gears' dot), new `src/updates.ts`, new `src/settingsMenu.css` (and its line in `build.mjs`), one line in `src/main.ts`, new `test/updates.test.ts`, the ruler sheet's step in `tools/rulers/check.mjs`, `tools/settings-menus/shots.mjs`, `tools/stand/depth-shots.mjs`; `CLAUDE.md` (one line), `docs/notes/options-menu.md`, `docs/samples/options-menu-*.png`.
- **Completion criteria:** eight submenus with a back button; every setting saved under the same keys; the releases newest first from 0.189.0 with the older ranges folded; a test that the newest entry is package.json's version; a "New" dot until the page is seen; typecheck, full tests, web build; 393x852, 360x780, 412x915.
- **Validation and handoff:** [notes](notes/options-menu.md).

### SETTINGS-MENUS — The ruler picker and stones in the developer row

- **Goal:** the owner's asks: "The rulers in the settings menu should be a menu that opens up after clicking on it." and "I also want the developer menu to have stones as an option too."
- **Status:** done; released as 0.205.0.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/settings-menus`, `/home/user/settings-menus` (from main 0.204.0); PR none.
- **Allowed files or systems:** new `src/settingsPicker.ts`; `src/settings.ts` (ruler, Duchess costume and developer rows), the ruler/picker styles in `src/keepKingdom.css`, `src/sim/devGrant.ts`, `test/dev-grant.test.ts`, `tools/rulers/check.mjs` (opens the sheet), new `tools/settings-menus/shots.mjs`; `docs/notes/settings-menus.md`, `docs/samples/settings-menus-*.png`.
- **Completion criteria:** one compact Ruler row opening a sheet of the eight that saves to the same setting and always closes (pick, ✕, backdrop, Escape, Settings' Close; `[hidden]` respected); the Duchess costume the same way; +100 and +1000 stones in the developer row, six buttons fitting at 360; tests extended; typecheck, full tests, web build; 393x852, 360x780, 412x915.
- **Validation and handoff:** [notes](notes/settings-menus.md).

### DEPLOY-ZOOM — Each wave's deploy zooms in on the placement rows; Auto merge and Auto place are earned

- **Goal:** the owner's asks: "At the beginning of every wave, zoom in on the hero placement box for easy placement." and "Actually, let's have the auto merge unlock after defeating the second army, and auto place unlock after defeating the 4th army."
- **Status:** done on the branch; ready for review. Not merged.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/deploy-zoom`, `/home/user/deploy-zoom` (from main 0.233.0); PR none.
- **Allowed files or systems:** new `src/render/deployCam.ts`, `src/sim/featureUnlocks.ts`, `tools/deploy-zoom/`; small hooks in `src/main.ts` (deploy camera, the two buttons' gates, the notice), `src/sim/meta.ts` (`featuresTold`), `src/achievementsView.ts` (`toastLines`), `src/pixel.css` (`#auto[hidden]`), `src/tips.ts`; tests `test/deployCam.test.ts`, `test/featureUnlocks.test.ts`.
- **Completion criteria:** the deploy eases in on the placement rows at every wave (a cut with reduced motion), the camera stays free, Fight! eases back to the fight framing; Auto merge after army 2 and Auto place after army 4, told once; typecheck, full tests, web build; shots at 393x852, 360x780 and 412x915 with no page errors.
- **Validation and handoff:** [notes](notes/deploy-zoom.md).

### MERGE-TWO — Two to merge, merged by the player, an Auto merge button, four ranks

- **Goal:** the owner's ask: "I want the heroes to only need two to merge and upgrade. And I don't want them to auto upgrade so there's more for the player to do. But I want an auto merge button added. Then there will be 4 ranks now. Instead of the three we had before. With the 4th rank being harder to get to." (1+1→2, 2+2→3, 3+3→4; drag to merge, ready heroes marked; Auto merge cascades and stops.)
- **Status:** done on the branch; ready for review. Not merged.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/merge-two`, `/home/user/merge-two` (from main 0.218.0); PR none.
- **Allowed files or systems:** new `src/sim/merge.ts`; `src/sim/run.ts` (grades, hire block, `paidOf`), `src/sim/climb.ts`, `src/sim/units.ts` (`formOf`), `src/sim/tower.ts` (`TOWER_GROWTH`), `src/sim/modes.ts` (`DAILY_ANSWER.ult`), `src/sim/autoplay.ts`; the page's bench, drag, Auto merge button and rank-4 look (`src/main.ts`, `src/index.html`, `src/pixel.css`, `src/battleUi.css`, `src/heroBar.ts`, `src/render/boardView.ts`, `unitView.ts`, `sheets.ts`, `fx.ts`, `spectacle.ts`); tips and lines; `tools/autoplay.ts`, `tools/balance.ts`, new `tools/merge-two/`; the merge tests, `test/armies.test.ts` (one level) and the ailment-log fixture. Not `tierSkills.ts` (rank-4 skills are `claude/rank4-skills`), not the music or sound rules.
- **Completion criteria:** two-to-merge by hand and by the button, no merging on a hire, a full bench refuses a hire, rank 4 with its own look and step; the army pace, daily and spire kept near main (before/after table in the note); typecheck, full tests, web build; drag-merge and Auto merge at 393x852, 360x780 and 412x915 with no page errors.
- **Validation and handoff:** [notes](notes/merge-two.md).

### LATE-RETUNE — The late armies tougher again after two of a kind merging

- **Goal:** the owner's "harder late game": the late armies (Infernal Host, Yokai, Golem Forge, the first army's Mythic) take about the tries they took on 0.218.0, before MERGE-TWO, through the armies' own strength; the order kept (Infernal just before the first army's 11 stars, Yokai and Golems after); the grade-4 Tyrant (level 1) and Juggernaut (level 30) brought in; the start, the daily, the Last Stand and grade-1 parity kept.
- **Branch / worktree / PR:** `claude/late-retune`, `/home/user/late-retune`; PR none.
- **Allowed files or systems:** `src/sim/armies.ts` (the three late armies' `start`, Yokai bosses, `tierLift`), `src/sim/tiers.ts` (Mythic `answer`), `src/sim/tierSkills.ts` (the Tyrant's and Juggernaut's tier 4 only), `tools/army-pace/`, `tools/merge-two/`, `tools/balance.ts` (a comment), `docs/notes/late-retune.md`.
- **Status:** done on the branch; before/after tables in the note. Then tuned again with hearts (the owner's "Yes, tune with hearts"): the Infernal Host `start` 12.5, the Yokai 14.2, the Golem Forge 14.6, their `tierLift` raised to keep each tier over the one below, measured with `HEARTS=1`. Typecheck, full tests, web build.
- **Validation and handoff:** [notes](notes/late-retune.md).

### ARMY-PACE — Getting to the harder armies is harder

- **Goal:** the owner's ask: "Make it so getting to harder armies is harder. The final armies probably won't be clearable before the player clears all 15 stars on the first army." (an army holds 11 stars in the code; taken as all 11, Mythic included).
- **Status:** done; released as 0.208.0.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/army-pace`, `/home/user/army-pace` (main 0.204.0 merged in); PR none.
- **Allowed files or systems:** `src/sim/armies.ts` (the last five armies' `start`, `level`, new `tierLift` and `xpStart`, `waveBoost`, `armyXpShare`), `src/main.ts` (one multiplier on a fight's XP), `tools/army-pace/`, `tools/levelPace.ts`, `tools/unlockPace.ts` (the model's clear days), tests `test/army-pace.test.ts`, `test/armies.test.ts`, `docs/notes/army-pace.md`, `docs/samples/army-pace-*.png`. Not the unlocks, the first four armies, Mythic, the other modes.
- **Completion criteria:** the Golem Forge and the Yokai not clearable on Normal before a typical player has the first army's 11 stars, the Infernal Host about then, the middle armies ramping; the first army as it was; the harder tiers above Normal; XP, ore and Calamity pace checked; typecheck, affected and full tests, web build; the armies screen at the three sizes.
- **Validation:** see the handoff's tables and tests.
- **Handoff:** [notes](notes/army-pace.md).

### FIGHT-FIXES — Boss in the arena's middle, a free fight camera, heroes get up on a revive, the trophy wall closes

- **Goal:** four of the owner's fixes: "The bosses should stand in the middle of the boss arena."; "Don't lock camera in each wave. Allow free movement and zooming during the wave."; "The units get up off the ground, not a new spawn look, when a heart is burnt for another try."; "Trophy wall comes up and locks castle screen."
- **Status:** done; released as 0.201.0. The four armies the boss move shifted (undead, wildwood, labyrinth, golems) are retuned by ARMY-PACE.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/fight-fixes`, `/home/user/fight-fixes` (from main 0.200.0); PR none.
- **Allowed files or systems:** new `src/sim/arenaDeploy.ts`, `src/render/fightCam.ts`; hooks in `src/sim/battle.ts` (`startBattle`'s foe placement), `src/sim/board.ts` (optional `Board.arenaMid`), `src/sim/scenario.ts` (one line), `src/main.ts` (camera input, revive), `src/render/unitView.ts` (`getUp`), `src/trophyWall.css`, `src/castle.ts` (`drawVfx` index guard); tests `test/arena-boss.test.ts`, `test/fight-cam.test.ts`, `test/trophy-wall-hidden.test.ts`; `tools/fight-fixes/shots.mjs`; `docs/notes/fight-fixes.md`, `docs/samples/fight-fixes-*.png`.
- **Completion criteria:** every army's mid and final boss starts in its arena's middle with its band round it, tested; pan, pinch and wheel during a wave, kept until the next wave's deploy; fallen heroes get up (dead row reversed), reduced motion stands at once; the trophy wall opens only when asked and always closes, castle and tavern; typecheck, affected and full tests, web build; 393x852, 360x780, 412x915.
- **Validation:** see the handoff's "Checks". The boss move shifts some armies' tries (the handoff's table); `start` values not retuned (army difficulty is another task's).
- **Handoff:** [notes](notes/fight-fixes.md).

### WORLD-ROAD — Army road, boss arenas and the living land

- **Goal:** the owner's asks: army battle maps follow a realistic path (a winding road 6 to 9 tiles wide with themed scenery beside it that walkers cannot enter, not a full 14x18 slab), each army's boss waves (8 and 15; the Wildwood's 5, 10 and 15) fought in its own themed arena, and (phase B) a living environment: hazards that act on both sides, running water and waterfalls, pack walls and set pieces at the tiles' angle, ambient life.
- **Status:** done; owner approved and released as 0.187.0 (castle gate sprite removed at the owner's ask).
- **Owner:** Claude (the WORLD army map is normally the other AI's area; the owner assigned this one to Claude).
- **Branch / worktree / PR:** `claude/army-road`, `/home/user/army-road` (main 0.186.0 merged in); PR none.
- **Allowed files or systems:** `src/sim/scenario.ts`, `src/sim/armyRoad.ts`, `src/sim/hazards.ts`, `src/sim/board.ts` (optional `Tile.scene`, `paved`, `ring`, `stream`; `Board.pieces`, `hazards`, `flow`, `falls`; scenery not `standable`), `src/sim/battle.ts` (the `hazard` event and its tick), `src/sim/armies.ts` (seven Normal `start` values), `src/render/boardView.ts`, `columnTextures.ts`, `roadArt.ts`, `roadAtlas.ts`, `hazardLooks.ts`, `fx.ts` (hazard tells and strikes), `soundRules.ts` (their cues), `weatherRules.ts`/`weatherView.ts` (ambient motes on the road), `src/main.ts` (two calls), `src/art/road/`, tests `test/army-road.test.ts`, `test/army-hazards.test.ts`, `test/world-001-scenario.test.ts`, `tools/army-road/`, `docs/notes/army-road.md`, `docs/samples/army-road-*.png`, `CREDITS.md`. Other modes' boards untouched.
- **Completion criteria:** road and arenas per the owner's answers; hazards deterministic on their own side stream, both sides, each rule tested; rings and set pieces from pack art at the tiles' angle, credited; water flows and pours off open edges; ambient life respecting reduced motion and battery saver; every walkable tile reachable and every survivor able to walk on to the next section; armies within noise of main at their recommended levels; typecheck, affected tests and the full suite, web build; 393x852, 360x780 and 412x915 checks.
- **Validation:** see the handoff's "Checks run for phase B".
- **Handoff:** [notes](notes/army-road.md), [phase B sheet](samples/army-road-after-sheet.png), [phase A mock-ups](samples/army-road-mock-sheet.png).

### ARMY-DROPS — Rare hero shards and XP tomes from army waves

- **Goal:** the owner's ask: "I want shards and tomes to be able to drop from armies too. It's just much much rarer."
- **Status:** implemented; ready for review. No merge, deployment or version bump.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/army-drops`, `/home/user/army-drops`; PR none.
- **Allowed files or systems:** new `src/sim/armyDrops.ts`, `test/army-drops.test.ts`, `tools/army-drops/shots.mjs`; small hooks in `src/main.ts` (the wave's settle, the card, the recap, the auto summary), `src/sim/waveCard.ts` (`drops`, the `drop` note), `src/waveCardView.ts`, `src/sim/autoReplay.ts` (`totals.drops`), `src/battleReports.css`; `tools/unlockPace.ts` (`--nodrops`, `--droprate`); `test/summon-stones.test.ts` (the giveShards callers, a rule the owner's ask changed); `docs/notes/army-drops.md`, `docs/samples/army-drops-*.png`.
- **Completion criteria:** a side stream per run seed and wave (no fight draws, no rerolls by retrying), armies only, banked on the win, shown on the card and the recap's spoils and the auto summary; rates tested; the pace re-run; typecheck, full tests, web build, three portrait sizes.
- **Handoff:** [notes](notes/army-drops.md).

### AWAKEN-MATS — Awakening materials from the armies and the Calamity

- **Goal:** the owner's ask: a hero's awakening needs materials, one kind per class trait; the owner's answers: different armies drop different ores, the Calamity (by map) the richest source, 10 and 20 a step on top of the shards, difficult; small trickles from a first Mythic clear, Last Stand records and gold chests; old saves paid a Rift Cache a Calamity clear (up to five); the pouch on the Calamity's start and the awakening panel; ores on the army result screen and card.
- **Status:** done; owner approved and released as 0.191.0.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/awaken-mats`, `/home/user/awaken-mats` (main 0.189.0 merged in); PR none.
- **Allowed files or systems:** new `src/sim/awakenMats.ts`, `src/oreView.ts`, `src/ores.css`, `src/art/ui/ore/`; hooks in `src/sim/awaken.ts`, `meta.ts` (optional `Meta.ores`, `Meta.caches`), `tower.ts` (`finishTower` drops, `settleCalamity`), `calReward.ts`, `armyStars.ts` (chest ores, `sumLoot`), `stand.ts` (`settleStand`), `autoReplay.ts` (totals); the page: `awakenView.ts`, `rankUpView.ts`, `menuHeroes.ts`, `calClear.ts`, `calamityView.ts` (the pouch), `towerView.ts` (the loss summary), `armiesView.ts` (the card's row), `chestStash.ts`, `standView.ts`, `main.ts` (the army result and auto summary), `index.html` (`#oreDrop`), `build.mjs` (the CSS); `tools/unlockPace.ts` (`--awaken`), `tools/awaken/ore-icons.py`, `mats-shots.mjs`, `mats-sheet.py`, `mats-mock*.{mjs,py}`; tests `test/awaken-mats.test.ts`, `test/awaken.test.ts`, `test/rankUp.test.ts`; `CREDITS.md`; `docs/notes/awaken-mats.md`, `docs/samples/awaken-mats-*.png`. Not the Calamity map itself (`claude/cal-void`), the dailies (`claude/daily-builds`), the castle tab or the WORLD army map.
- **Completion criteria:** the ores in the meta (optional, old saves load and keep their awakened heroes, back pay once); every drop deterministic on its own side stream, every rule tested; 10 / 20 a step; the pouch, panel, recap, victory, loss summary, army card and result, chests and the Last Stand's end card; pack icons credited; pace re-run; typecheck, affected and full tests, web build; 393x852, 360x780 and 412x915.
- **Validation (phase B):** see the handoff's checks.
- **Handoff:** `docs/notes/awaken-mats.md`; pictures `docs/samples/awaken-mats-sheet.png`, `-360-sheet.png`, `-412-sheet.png` and the single shots; phase A mock-ups `docs/samples/awaken-mats-mock-*.png`.

### DUCHESS-FIGHTS — Duchess joins a fight

- **Goal:** the owner's ask: one fight in 1000, Duchess the court goat joins on the player's side as a level-100 goat (a real fighter), a short card says so, and a cinematic plays the first time only.
- **Status:** done; owner approved and released as 0.196.0 (owner's phase A answers: no turning her away; the cinematic on her first real fight under its own trigger; a true level 100; armies, daily and practice, old tower runs, Calamity, not the Last Stand, auto-replay without the cinematic; Her Grace's Favour; PixelLab for her missing poses, four generations at most).
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/duchess-fights`, `/home/user/duchess-fights` (main 0.190.0 merged in); PR none.
- **Allowed files or systems:** new `src/sim/duchessFight.ts`, `src/duchessFightView.ts`, `src/duchessFightLines.ts`, `src/art/units/duchess_goat.png`, `tools/duchess/`, `test/duchess-fights.test.ts`; hooks in `src/sim/battle.ts`, `run.ts` (`startStage`'s wish), `units.ts`, `achievements.ts`, the scene files (`sceneEvents.ts`, `sceneKit.ts`, `sceneRules.ts`, `sceneScripts.ts`: the scene's id and moment), `src/render/sheets.ts`, `src/art/units/sheets.json`, `src/duchess.ts` (`stayAway` only), `src/main.ts`, `src/quipData.ts` (the achievement's aside), `docs/lines/new-lines.json`, `test/cinematics.test.ts` (the firsts list), `tools/cinematics/flow5.mjs`, `CREDITS.md`. Not Duchess's tap, trinkets or hats (the other AI's), not `render/duchessRules.ts`, not the Last Stand.
- **Completion criteria:** met: the roll on the fight's seed only; she joins at level 100 with her kit in the agreed modes; the cinematic once on her first real fight; the card clear of bubbles and the panel; her lines; the achievement; her sheet with PixelLab headbutt and fall, credited; `?duchess=1`; tests; three phone sizes.
- **Validation (phase B):** typecheck passed; `npm test -- duchess-fights achievements new-lines scene cinemat quips` passed; full `npm test` 1287 of 1287; `npm run web` built; `tools/duchess/shots.mjs` at 393x852, 360x780 and 412x915: she joins at level 100, the card shows above the panel with no bubble over it, her bubble shows, no page errors, no sideways overflow. PixelLab: 4 generations (balance 20.75 to 16.75).
- **Handoff:** [notes](notes/duchess-fights.md); [screens](samples/duchess-fights-screens.png), [her sheet](samples/duchess-fights-sheet.png); phase A [mock-ups](samples/duchess-fights-mock-sheet.png).

### DAILY-BUILDS — Varied dailies: build themes and synergies

- **Goal:** the owner's ask: make the dailies varied, showing builds and synergies; each day pushes a different team idea, shown up front, and rewards trying it.
- **Status:** done; owner approved and released as 0.197.0. The owner answered phase A: reward the build (a third chest star), the day's heroes lent to everyone, a seeded shuffled order (no repeat within 14 days, no two days running with a host or land, tomorrow not shown), a fixed boss per theme, eight foes in the Swarm. Live from 26 October 2026.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/daily-builds`, `/home/user/daily-builds` (main 0.190.0 merged in); PR none.
- **Allowed files or systems:** new `src/sim/dailyThemes.ts`, `src/themeView.ts`, `test/daily-builds.test.ts`, `tools/daily-builds/`; small hooks in `src/sim/daily.ts`, `dailySeed.ts`, `modes.ts`, `run.ts` (`runTheme`, `startStage`, `noteFight`, `Run.themeMet`, the daily mode's `theme`), `battle.ts` (`Stage.featured`, `applyTraits`), `meta.ts` and `armyStars.ts` (the third star's clamp), `src/dailyView.ts`, `src/home.ts`, `src/main.ts`, `src/daily.css`; `docs/notes/daily-builds.md`, `docs/samples/daily-builds-*.png`. Not the twists' table, the traits' numbers, the armies or the Auto formation.
- **Completion criteria:** 18 themes in a seeded shuffle from the date, the same for everyone, no repeat within 14 days across block edges, no two days running with a host or land; dates before the switch and runs begun before it play as before; each theme's twist, pool, featured boost and goal tested; each theme near the others' clear rate from a fresh save; theme on the camp board, the start card and the deploy screen at 393x852, 360x780 and 412x915; typecheck, affected and full tests, web build.
- **Validation:** see the handoff's checks: typecheck, `npm test -- daily-builds daily modes armyStars meta ...` and the full `npm test`, `npm run web`; screens at the three sizes with no page errors or overflow; `themeRate` (40 dates a theme) before and after tuning; `swarmPerf` with 8 and 10 foes.
- **Handoff:** [notes](notes/daily-builds.md), [sheet](samples/daily-builds-sheet.png), phase A [mock-ups](samples/daily-builds-mock-sheet.png).

### STATUS-FX — Damage and status effects (ailments)

- **Goal:** the owner's ask: "I want to add in damage effects, like frozen, burning, poisoned, etc." Eleven ailments (Burning, Poisoned, Frozen, Bleeding, Chilled, Shocked, Stunned, Weakened, Cursed, Silenced, Feared) from heroes by element, foes, terrain and the king's spells (with a cleanse); a body effect, an icon over the head and coloured numbers; resists by type, shorter on bosses. The owner will have ChatGPT paint the art, so it sits behind one atlas seam with a brief.
- **Status:** phase B done on the branch, ready for review (phase A's design approved with every recommendation). Ships with the placeholder atlas; the painted sheets drop in with `tools/status-fx/import-status-art.py`.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/status-fx`, `/home/user/status-fx` (from main 0.213.0); PR none (not asked).
- **Allowed files or systems:** new `src/sim/ailments.ts`, `ailmentSources.ts`, `ailmentKeys.ts`, `src/render/ailmentLayer.ts`, `statusStyles.ts`, `statusArt.ts`, `src/art/fx/status/`, `tools/status-fx/`; hooks in `battle.ts`, `abilities.ts`, `spells.ts`, `hazards.ts`, `orders.ts`, `ultimates.ts`, `combos.ts`, `duoCombos.ts`, `equipFx.ts`, `tierSkills.ts`, `duchessBleat.ts`, `stand.ts`, `kits/*.ts`, `unitView.ts`, `fx.ts`, `fxRules.ts`, `soundRules.ts`, `chainView.ts`; tuning in `armies.ts` (Infernal `start`), `calamity.ts` (`bossHp`), `modes.ts` (`DAILY_ANSWER.ult`), `stand.ts` (late and deep growth), `ultimates.ts` (Plague Tide); tests; `CREDITS.md`; `docs/notes/status-fx*.md`; `docs/samples/status-fx-*.png`. No save or version change.
- **Completion criteria:** one model, identical to main with the new rules off (fixed-seed event-log test); the eleven ailments with resists, the boss rules and every source; the look with reduced motion and battery saver; parity, the army pace, the Last Stand, the daily and the Calamity within bounds; screens at 393x852, 360x780 and 412x915 and one with reduced motion; typecheck, full tests, web build.
- **Validation:** typecheck passed; full `npm test` 1404 of 1404 passed (new `ailments.test.ts` 14, `ailments-identical.test.ts` 1); `npm run web` built; `tools/status-fx/shots.mjs` at 393x852 (and reduced motion), 360x780 and 412x915 with no page errors; balance before and after in the note: parity none beyond 6 at levels 1 and 30, Last Stand 3/9/11/15/20/24, daily 68%/72% (levelled) and 70% (fresh), Calamity 91/85/63/54/52/14%, Infernal 7 tries at 55, Yokai 14.5 and Golems 11 at 65.
- **Limits:** the Yokai Night Parade comes a little later than on main (14.5 tries at level 65, was 8.1; its measure is noisy); the Last Stand at level 1 has a median of wave 3 (mean 3.4, was 3.6); real-phone frame rate not measured.
- **Handoff:** [notes](notes/status-fx.md), [art brief](notes/status-fx-art-brief.md); pictures `docs/samples/status-fx-fight-*.png`, `-shatter-393x852.png`, `-immune-393x852.png`, phase A's `-contact.png`.

### AWAKEN-002 — Class auras for awakened heroes

- **Goal:** the owner's ask: drop the awakened recolour; an awakened hero wears an aura at step 1 (rank 5) and a stronger, bigger one at step 2 (rank 6), its style set by the hero's class trait (not the origin), wherever an awakened hero is drawn.
- **Status:** done; owner approved and released as 0.188.0 (Calamity fights keep no aura: the owner's call). Earlier: phase A approved by the owner (look suits; Werewolf red sheet dropped; rank 4 keeps its gold glow and outline, awakened steps take the class colour; art behind one seam with a painted-art brief; camp included). Phase B done on the branch, ready for review.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/awaken-auras`, `/home/user/awaken-auras` (main 0.186.0 merged in); PR none yet (not asked).
- **Allowed files or systems:** the awakened look (`src/render/awakenLook.ts`, `awakenRig.ts`, new `auraStyles.ts`, `auraPlace.ts`, `auraArt.ts`, `awakenAura.ts`, `auraCanvas.ts`, `figureShare` in `sheets.ts`), `unitView.ts`, `fx.ts` (loader), `sceneView.ts`, `menuHeroes.ts`, `rankUpView.ts`, `awakenView.ts`, `awaken.css`, `partyScene.ts`, `party.ts` (one call), `tavern.ts`, `camp.ts`, `hall.ts`, `calMap.ts`, the aura atlas in `src/art/fx/aura/`, `tools/awaken/`, `test/awaken*.test.ts`, `CREDITS.md`, `docs/notes/awaken-auras*.md`, `docs/samples/awaken-auras-*.png`. Not the castle tab, the battle-picking menu tab, the WORLD army map or the Last Stand files; no simulation, save or version change.
- **Completion criteria:** no recolour anywhere; every class trait has its own step 1 and step 2 aura from pack art, credited, behind one atlas seam with a painted-art brief; the aura shows in fights, the Last Stand, the cinematics, the camp, the tavern, the summoning hall, the Calamity map, the war council, the roster, the dossier, the Rank up card and the awakening panel and burst; reduced motion holds it still and visible; battery saver thins it; no allocation per frame; typecheck, web build, affected and full tests, and the screens at 393x852, 360x780 and 412x915.
- **Validation (phase B):** typecheck passed; `npm run web` built; full `npm test` 1252 of 1252 passed (including `test/awaken-auras.test.ts`, 4 tests, and the updated look test in `test/awaken.test.ts`); `tools/awaken/aura-places.mjs` captured every place at 393x852, 360x780 and 412x915, and reduced motion and battery saver at 393x852, with no page errors; the painted-art importer tried with stand-in sheets. Frame rate on a real phone not measured.
- **Limits:** Calamity fights show no aura because the Calamity is a local run that reads nothing of the meta, awakening included (unchanged rule); the summoning hall never summons an awakened hero in play (drawn if one ever comes out).
- **Handoff:** `docs/notes/awaken-auras.md`, `docs/notes/awaken-auras-art-brief.md`; pictures `docs/samples/awaken-auras-places.png`, `-closeups.png`, `-sizes.png`, `-calm.png` (and the phase A mock-ups).

**STAND-004 / Idle heroes help in the Last Stand** — the owner: "When all the units are on the map and heroes aren't engaged with them, they need to go help in the last stand."

- **Status:** done; released as 0.204.0 (the inner ring stays as the king's guard; one helper sets off at a time).
- **Owner:** Claude. **Branch / worktree:** `claude/stand-help`, `/home/user/stand-help` (from main 0.200.0). PR: none.
- **Scope:** new `src/sim/standHelp.ts`; hooks in `src/sim/stand.ts` (`stepStand`, `beginWave`, `clearWave`, the pace levers), `standAi.ts` (`huntDecide`'s focus, `helpWalk`), `battle.ts` (`StandMode.help`); `src/standView.ts` (the helper's pointer); `test/stand-help.test.ts`, the leash test in `test/stand.test.ts`; `tools/stand/help-shots.mjs`; `docs/notes/stand-help.md`, `docs/samples/stand-help-*.png`.
- **Completion criteria:** once a wave is all in, a hero with nothing in its zone leaves to help and returns when called back, the fight is won or the wave ends; the inner ring and at least two heroes stay, tanks last, one setting off at a time; deterministic and tested; the pace re-tuned to about 4, 9, 10, 14, 20, 25; typecheck, web build, the stand tests and the full suite; screens at 393x852, 360x780 and 412x915.
- **Validation:** typecheck passed; `npm test -- stand` (49) and the full `npm test` (1352 of 1352) passed; `npm run web` built; `npm run stand-balance` (30 runs a level) 4/9/10/14/20/25 against the targets 4/9/10/14/20/25 (main was 4/9/11/15/20/26; helping with the old levers 4/10/11/17/23/28); `tools/stand/help-shots.mjs` at 393x852, 360x780 and 412x915 with no page errors.
- **Handoff:** [notes](notes/stand-help.md).

**STAND-003 / Last Stand overhaul** — the owner's ten asks: a castle interior with breached walls and the king on his throne, a dignified king, far less shake, a free camera, ways to find the heroes, a better deploy step, varied halls, the last foes hunted down, a pause with the heroes' stats, and heroes who stay dead.

- **Status:** done; owner approved and released as 0.189.0 (crowns per wave unchanged for the owner's own test). Phase B: the castle's four rooms (walls, breaches, pillars, cover, the 5x5 dais with the castle's enthroned king), the Keep & Kingdom brass, the deploy tray with swaps and Auto-place, the finding aids, the brass pause sheet and end card, the pace retuned to the agreed targets with the pay unchanged. main 0.186.0 merged in.
- **Owner:** Claude. **Branch / worktree:** `claude/stand-overhaul`, `/home/user/stand-overhaul` (from main 0.174.0). PR: none yet.
- **Scope:** the Last Stand only: `src/sim/stand.ts`, `standAi.ts`, `standField.ts`, new `standSheet.ts`, the Last Stand hooks in `battle.ts` (`StandMode`), `spells.ts` and `ultimates.ts` (no raising in the Last Stand); `src/standView.ts`, `src/stand.css`, `src/heroBar.ts`, `src/render/fx.ts` (`still`), new `src/render/standCam.ts`; the Last Stand's art and credits; `tools/stand/`, `tools/stand-balance.ts`; `test/stand*.test.ts`; `docs/notes/stand-overhaul.md`, `last-stand.md`. Not the castle tab, the battle-picking tab or the WORLD army map.
- **Completion criteria:** phase A: less shake, the free camera, the hunt, the pause (logic) and the fallen staying down built and tested; the balance re-measured; mock-ups of the castle halls and king, the deploy and unit aids, and the pause panel; questions put to the owner. Phase B (after approval): the castle halls (at least four layouts from the seed, breaches on different walls), the new king, the deploy tray, the unit aids and the pause panel built to the approved look; the balance re-tuned; typecheck, web build, `npm test -- stand`, screenshots at 393x852, 360x780 and 412x915 with reduced motion; old saves load.
- **Validation (phase A):** see the handoff.
- **Validation (phase B):** typecheck; `npm test -- stand` (the stand files) and the full `npm test`; `npm run web`; `tools/stand/smoke.mjs`; `tools/stand/overhaul.mjs` (camera, pause) and `tools/stand/overhaul-shots.mjs` at 393x852, 360x780, 412x915 and reduced motion; `npm run stand-balance` 4/9/11/15/20/26 against 4/9/10/14/20/25. Results in the handoff.
- **Handoff:** [notes](notes/stand-overhaul.md); mock-ups `docs/samples/stand-overhaul-mock-*.png`.

**ART-001 / Resonance hero pilot** — Owner: current Codex art chat. Branch: `art/resonance-heroes`, worktree: `/workspace/legends-of-the-fall`. Owner accepted the implemented appearance and requested integration. Scope: Knight and Archer sprite sheets, their render mappings/scales, art credits, validation tools and evidence. Current main 0.179.0 integrated, preserving newer hero kits, roles, maps and battle command HUD. Status: implementation accepted, ready for the owner's merge through [PR #144](https://github.com/Hpatter9/legends-of-the-fall/pull/144); 48 animation cells installed, typecheck/build and four affected test files passed, actual roster/dossier/deploy/combat checks passed at all three portrait sizes with zero page errors. Source atlases and preview preserved. Version/deployment remain with the director at merge time. See [handoff](notes/resonance-heroes.md).

### CHEST-001 — XP tomes and Open all

- **Goal:** the owner's two asks: XP tomes (small, medium, large) as a chest drop, read to one hero of the player's choice from the hero's page; and an Open all for the chests waiting on the cart, with one combined summary.
- **Status:** done: owner accepted release 0.178.0 (large tome 20,000 XP; overflow at the cap lost with a warning).
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/chest-extras`, `/home/user/chest-extras` (from main 0.174.0); PR none yet.
- **Allowed files or systems:** `src/sim/tomes.ts` (new), `src/sim/{armyStars,chestShop,meta}.ts` (the loot roll, `openAll`, `sumLoot`, `Meta.tomes`), `src/{chestStash,shopView,menuHeroes,tomeView,tomeArt}.ts`, `src/tomes.css`, `build.mjs` (the CSS list), the tome icons in `src/art/ui/`, `tools/tome-icons.py`, `tools/{unlockPace,levelPace}.ts` (tome reporting), `tools/ui/chest-extras-shots.mjs`, tests, `CREDITS.md`. Not the castle tab, the battle-picking tab, the WORLD army map or the Last Stand files.
- **Completion criteria:** tomes drop deterministically on top of every stash and shop chest's stones and gear (shop prices unchanged); `Meta.tomes` optional and old saves load; "Use tome" on the hero page with the level-up feedback, capped at `MAX_LEVEL`; Open all identical to opening one by one, with a summary; pack art credited; pace reported; tests; screenshots at 393x852.
- **Validation:** typecheck passed; `npm run web` built; `npm test -- chest summon-stones levels meta armyStars daily stand tower modes equipment hero-shards calMapRewards progression awaken shards unlock achievements codex` (252) and `npm test -- armies battle-flow calamity elites equip-best gear-sets mystery recycle no-flicker` (134) passed, including the 9 new tests in `test/chest-extras.test.ts`; `npm run unlock-pace` and `npm run level-pace` (with and without `--tomes`, 10 seeds); browser screenshots at 393x852 (`docs/samples/chest-extras-*.png`), also checked at 360x780 and 412x915 with no page errors.
- **Handoff:** `docs/notes/chest-extras.md`. For the owner: the large tome's size, losing the overflow at the cap, and the drop table.

**FX-002 / Tactile & Visual Juice (Game Feel)** — ready for review: hit-stop, camera micro-thud, dynamic victory poses, and Defeated Boss Trophy Wall.

- **Goal:** implement "Tactile & Visual Juice" combat feel improvements: subtle 2-frame hit-stop and localized camera micro-thud on lethal backstabs, critical hits, and King's Meteor impact; dynamic surviving hero victory poses (Knight salutes/plants shield, Peasant collapses in exhausted relief, Wizard adjusts hat, Duchess hops onto a rock); Defeated Boss Trophy Wall in Tavern and Castle Hall with humorous defeat blurbs.
- **Status:** implemented on branch `feat/combat-juice-and-trophies`, tested and ready for review.
- **Owner:** Claude / Antigravity. **Branch:** `feat/combat-juice-and-trophies`.
- **Scope:** rendering and effects (`src/render/fxRules.ts`, `src/render/fx.ts`, `src/render/unitView.ts`, `src/render/soundRules.ts`); mascot victory celebration (`src/duchess.ts`, `src/quipData.ts`, `src/quips.ts`); fight loop orchestration (`src/main.ts`); Defeated Boss Trophy Wall (`src/trophyWall.ts`, `src/trophyWall.css`, `src/tavern.ts`, `src/castle.ts`, `build.mjs`); tests (`test/tactile-juice.test.ts`); documentation (`docs/notes/tactile-juice.md`).
- **Completion criteria:** 2-frame hit-stop and localized camera micro-thud active for lethal backstabs, crits, and meteor; calm/reduced-motion strictly respected; surviving heroes strike distinct victory poses; Duchess performs victory hop; Trophy Wall displays Calamity and Spire bosses with unlock state and humorous defeat blurbs; typecheck, web build, and targeted unit tests pass; portrait viewport checks verified.
- **Validation:** `npm run typecheck` passed (0 errors); `npm run web` built successfully; `npm test -- tactile-juice` and `npm test -- combat-fx` passed (25/25); portrait viewport checks passed at 360×780, 393×852, and 412×915.
- **Handoff:** [tactile-juice notes](notes/tactile-juice.md).


**COMBAT-002 / Hero kits, mana and manual ultimates** — done: owner accepted release 0.172.0.

- **Goal:** every hero gets a mana or stamina pool, two skills that cost it (level 1 and level 10), and an ultimate (level 30) the player fires by tapping its portrait in a new hero bar, with an Auto toggle; all 45 heroes reworked into far more varied roles (summoners, shapeshifters and many odd archetypes), no new heroes.
- **Status:** phase 1 (design) approved with the owner's five answers; phase 2 (implementation) done on the branch, ready for review.
- **Owner:** Claude. **Branch / worktree:** `claude/hero-kits`, `/home/user/hero-kits`. PR: none yet.
- **Scope:** the battle simulation's hero kits, pool, ultimate meter and a queued ultimate command (`src/sim/abilities.ts`, `ultimates.ts`, `tierSkills.ts`, `combos.ts`, `traits.ts`, `talents.ts`, `units.ts`, `battle.ts`, new `heroKits.ts`, `orders.ts`, `kits/`); the fight HUD (fight panel in `src/main.ts`, `src/index.html`); unit and effect rendering; hero texts; balance retune. Not the castle tab, the battle-picking menu tab or the army battle map (WORLD-001).
- **Completion criteria:** owner approves the design; then all 45 kits implemented as approved; resource, order/replay and kit tests added; typecheck, web build and affected tests pass; the hero bar checked at 393×852, 360×780 and 412×915 with reduced motion; hero, army, Calamity, daily, Last Stand and spire balance re-measured and recorded; old saves load and play.
- **Validation (phase 1):** documentation and images only; `npm run web` run once to capture the current fight screen.
- **Validation (phase 2):** typecheck and web build pass; full `npm test` after merging `origin/main`: 1176 of 1176 pass. `tools/kits/shots.mjs`: all checks ok, no page errors at 393×852, 360×780, 412×915, reduced motion, Last Stand and Calamity. Hero parity within 6 (L1 worst +5.3, L30 worst +5.8); armies 2.1–2.8 tries at their levels; Calamity 92/79/65/51/47/15; daily 73%/55%; Last Stand medians 4, 10, 12, 20, 22, 40. Before/after tables in the note.
- **Handoff:** [design and build notes](notes/hero-kits.md), [owner summary](notes/hero-kits-summary.md), screenshots `docs/samples/hero-kits-*.png`, [HUD mock-up](samples/hero-kits-hud-mock.png), [current HUD](samples/hero-kits-hud-before.png).

WORLD-126 rendering checkpoint ready for review; rare warm-tail stability remains open. WORLD-001 per-army map design awaits owner confirmation before implementation.

- Owner: current WORLD continuation chat, confirmed by owner on 2026-10-27.
- Branch/worktree/PR: `codex/world-001`, `/workspace/world-001`, PR #124; owner authorised bump/merge as 0.169.0.
- Scope: column texture ownership/reuse, reproducible cold/warm and pixel/lifecycle checks; then per-army terrain maps using owner-requested 14×18 dimensions. Nine-theme visual proposal and section/progression clarification are with the owner. Drowned Temple must end on a central lake island.
- Completion: measured baseline/candidate, exact pixels, bounded cache and cleanup, required tests/build and portrait/offline checks; report unmet gates honestly.
- Reserved: Party/Keep and SIM #122 remain separate. Owner authorised the release bump and merge on 2026-10-28; wider WORLD map design remains separate.
- Recovery: published head `7426ac5a` recovered; prior unpublished candidate and temporary outputs absent. Reimplemented from #126 handoff.
- Validation: typecheck and web build passed; full suite passed 106 files, zero failures/skips (429.58s); five ownership cases and 3,634 strict pixel comparisons passed. Median cold stalls reduced 83.7%, but rare warm-tail stalls remain unresolved. Real progression, 24 rebuild/theme cycles, late-save resume, drag-pan, lazy pan-back and offline reload passed at 360×780, 393×852 and 412×915 with zero page errors. See `docs/notes/world-126.md`.


**SCENES-002 / Cinematic fixes** — the owner's five asks about the cinematics. Owner: Claude. Branch/worktree: `claude/scenes-fixes`, `/home/user/scenes-fixes` (from main 0.170.0). Scope: the scene data and rules (`src/sim/sceneScripts.ts`, `sceneEvents.ts`, `sceneFamilies.ts`, `sceneKit.ts`, `sceneRules.ts`), the scene trigger points and the boss card in `src/main.ts`, `Meta.bossCards` (optional) in `src/sim/meta.ts`, the Dread Pirate and Tyrant milestone in `src/sim/contentHeroes.ts`, one result line in `src/quipData.ts`, `docs/lines/new-lines.json`, the affected tests, `tools/cinematics/fixes.mjs`, `docs/notes/scenes-fixes.md` and `docs/samples/scenes-fixes-*.png`; not battle.ts, abilities, the fight HUD (`claude/hero-kits`), the WORLD map or the castle tab; Duchess's fight behaviour unchanged. Completion: (1) the first-loss scene only on a final defeat (no heart left); (2) every boss and herald introduction, the form cut-ins and the boss card once a save; (3) the king always the player and Duchess never framed as the king, with the king shown in the king shots; (4) the Calamity's scenes only once it unlocks, its reveal a scene of its own; (5) the Last Stand milestones told as the breach and the throne room, the Calamity as a portal to the void, no tower words; scene lines ≤100, captions ≤24 and scene lengths within the cinematics test; typecheck, affected tests, web build and a 393x852 browser check. Status: **ready for review**. Validation: typecheck and web build passed; 182 tests in the affected files (scene, cinematic, new-lines, quips, stand, heart, hero-shards, achievements, meta, codex, content, save, unlock, modes) passed, none failed; `tools/cinematics/fixes.mjs` passed all five browser checks at 393x852 with no page errors (screenshots `docs/samples/scenes-fixes-*.png`). Not checked at 360x780 or 412x915; the full suite was not run. See [handoff](notes/scenes-fixes.md).

**UX-002 / Home and loss fixes, menu flicker** — Status: done: owner accepted release 0.174.0. Owner: Claude. Branch: `claude/ux-fixes` (from main 0.170.0); PR none yet. Goal: the owner's three asks: don't name the current army every time the game opens; after a real defeat, a short "How to come back stronger" card with tailored pointers; find and fix textures that vanish or blink in the menus and camp. Scope: the Battle page's army ribbon (`src/home.ts`, new `src/armyShown.ts`, one key added to `SAVE_KEYS` in `src/settings.ts`); the loss card (new pure `src/sim/comeback.ts`, `src/recapView.ts`, the recap call in `src/main.ts`, `Home.goTo`, styles in `src/pixel.css`); menu and camp flicker (`src/home.ts` refresh, `src/camp.ts`/`src/main.ts` launch wait, `src/tavern.ts` still picture, decode-ready menu pictures in `src/menuHeroes.ts`, `src/talentView.ts`, `src/equipView.ts`); tests `test/comeback.test.ts`, `test/army-shown.test.ts`; tools in `tools/ux-fixes/`; screenshots `docs/samples/ux-fixes-*.png`; note `docs/notes/ux-fixes.md`. Reserved, not touched: the castle tab and WORLD army map (other AI; castle flicker reported only), hero combat and fight HUD (`claude/hero-kits`), cinematics (`claude/scenes-fixes`); no save version, Meta field or version bump. Completion: the ribbon shows only for a newly current army; the card shows 2-4 save-drawn pointers with working buttons on a real defeat only (not on a heart revive or auto-replay); flicker measured before/after with causes fixed; typecheck, affected tests, web build and three portrait sizes pass. Validation and handoff: [notes](notes/ux-fixes.md).

**STAND-002 / Last Stand harder** — the owner asked for a harder Last Stand. Owner: Claude. Branch: `claude/stand-harder`. Scope: the Last Stand's own sim and numbers only (`src/sim/stand.ts`, the stand tools, `test/stand.test.ts`, `docs/notes/last-stand.md`); no castle, battle-tab, army-map, `meta.ts` or summoning files. Completion: greedy medians near about 4-5, 9-10, 14, 18-20, 26-28 and 35-40 at hero levels 1, 10, 20, 30, 60 and 100 (30 runs a row); crowns per run at the target wave about the same as before; typecheck, web build, stand tests and `tools/stand/smoke.mjs` pass. Status: done on the branch, awaiting review; level 30 runs a little high (22). See [handoff](notes/last-stand.md).

**UI-005 / Party war council** — owner accepted the implementation and authorised version bump and merge as 0.166.0. Typecheck/build and 20 affected tests passed; three portrait sizes, all 45 heroes, draft/save, search/filters, starter/empty states, reduced motion and static texture checks validated. Selected portrait row subsequently simplified into a compact, numbered company roll at the owner’s request; tap-to-remove and hold-for-details retained. Initial banner-row concept rejected. Direction: five selected units in action poses fighting a creature horde, with elaborate ornament and deliberate spell effects. Owner: Codex. Branch: `design/party-war-council`, worktree `/workspace/legends-of-the-fall`; [PR #134](https://github.com/Hpatter9/legends-of-the-fall/pull/134). Scope: party picker (`src/party.ts`, `src/partyScene.ts`, party markup in `src/index.html` and styles in `src/keepKingdom.css`), related screenshots and notes; preserve simulation, save format and existing hero dossiers. Goal: ornate, exciting party selection with useful role coverage and synergy guidance. Completion: owner approves concept, implementation passes typecheck, affected tests and build and 393×852, 360×780, 412×915 review. Intentional glows and flourishes are allowed; disappearing textures or glitchy on/off flashing are defects. Implementation uses existing attack sprites, horde sprites, effect strips, brass frame and cached scenery; no simulation or save changes. See [implementation and validation](notes/party-war-council.md).


UI-003 accepted by the owner for release 0.164.0 and GitHub merge. Implementation, portrait validation and release integration checks passed on `design/hero-detail-dossier`; submission through a pull request to main is authorised. FX-001, UI-002, HEART-001 and DIALOGUE-001 remain intact. See [handoff](notes/hero-detail-dossier.md).

UI-004 (Summoning Sanctum) is accepted by the owner for release 0.165.0 and GitHub merge. Owner: Codex; branch `design/summoning-sanctum`, worktree `/workspace/legends-of-the-fall`; PR pending. Scope: ornate chamber, new-hero celebrations, quiet shard tarot cards, supporting artwork, release metadata and validation. Main 0.164.0 is integrated, preserving the released combat and hero dossier work. Typecheck, release build, 16 targeted tests and the three-size result browser suite passed; ready for the authorised PR merge. See [handoff](notes/summoning-sanctum.md).

The summon task was initially labelled UI-003 before fetching concurrent main updates; UI-003 already identifies the released hero dossier, so the summon task is now UI-004. Prior completed work is retained below.

## UI-001 manager takeover — 2026-10-26

The owner stopped the previous UI chat and transferred the intact branch and PR to this manager. The owner chose Keep & Kingdom (stone, brass, green), authorised layout/navigation redesign, and prioritised hero roster and equipment after comparing two visual concepts. Ask clarifying questions at the start of future tasks and provide visual proposals for visual work.

Checkout and dependency installation now work in the manager environment. Earlier proxy errors were overcome with sandboxed network access; the dependency cache was moved to a writable workspace directory. The hero roster/equipment redesign and shared theme are implemented. Typecheck and web build pass; all 103 test files pass. Browser hero/equipment checks and combat/offline smoke checks pass at all three portrait sizes. All 17 land fits were checked at 393×852. See [implementation and validation](notes/tactical-command-ui.md). The director integrated the manager setup from main, resolved overlapping coordination files, and bumped the working-branch version to 0.158.0 under the merge-time rule. The owner approved the actual visuals and requested the merge. Release version: 0.159.0. A full manual pass across modes and progression states remains a documented follow-up; automated smoke checks are not an exhaustive playthrough. The following is the earlier handoff, retained as history.

## Earlier UI-001 handoff — 2026-10-26

Owner relayed the UI chat's report. GitHub confirms PR #118 is open and draft. This is a recorded handoff, not a new validation run.

- **Changes in reported session:** none; inspected PR and instructions.
- **Blocker:** clone failed because the UI environment could not connect to its network proxy; retry was interrupted. Cause and recovery remain unverified.
- **Checks:** typecheck, tests, web build, and browser checks have not run.
- **Next work:** obtain a checkout on the existing branch; audit and complete the UI; inspect 393×852, 360×780, and 412×915 portrait sizes; check deployment, battles, hero management, navigation, overlays, save loading, and offline play; fix failures and rerun checks.
- **Release gate:** update the UI notes, board handoff, and PR with actual results. Keep PR #118 draft until validation and visual review are complete. Its reservation remains in place while blocked.
- **Reference:** [recorded handoff](notes/ui-coordination-handoff.md).

### SUMMON-002 — Summoning stones economy

- **Goal:** crowns buy chests; chests (and every other shard source) give summoning stones; a stone is one shard, one in 100 a whole unowned hero; the roster grows about half as fast. Owner's follow-up: silver chests hold 8 stones and gold 15; codex milestones pay 1 stone and achievements 2 (3 or 5 for the big ones); each codex entry pays 1 stone the first time it is discovered (old saves only for entries discovered from now on); the late pace is fine as it is; the 10-stone gift, daily stock and rising price stay.
- **Status:** done: owner accepted and authorised release 0.171.0.
- **Owner:** Claude
- **Branch / worktree / PR:** `claude/summon-stones`
- **Allowed files or systems:** `src/sim/{meta,unlock,unlockRules,armyStars,calReward,chestShop,codex,achievements}.ts`, `src/{gacha,hall,shopView,home,calClear,codexView,achievementsView}.ts`, tests, `tools/unlockPace.ts`. Minimal: `main.ts`, `index.html`. Not the castle or battle tabs, nor WORLD files.
- **Completion criteria:** stones, shop, sources, old-save grant, tests, pace about 2x slower; owner approves the UI.
- **Validation:** typecheck passed; `npm test -- summon-stones achievements codex hero-shards meta armyStars daily calMapRewards awaken shards new-lines starter unlock modes` (162 tests, with the entry stones) and `npm test -- stand` (29, after the merge) passed; `npm run web` built; `npm run unlock-pace -- --seeds 30` re-run (table in the handoff); chest shop re-shot at 393x852 with `tools/ui/summon-stones-shots.mjs`, and the achievements and codex pages checked at 393x852. Not re-checked this round: 360x780 and 412x915.
- **Handoff:** `docs/notes/summon-stones.md`.

## Completed work

| ID | Task | Result | Reference |
| --- | --- | --- | --- |
| FIXES3 | The old map over the new one; a brisk, even walk between waves; the Paladin's colours | Done, awaiting review: the Calamity's map (z-index 5) was left open under any home-screen opening but its own buttons, so every mode begun after drew under it; `TowerView.dismiss()` shuts it when a fight is made, the Last Stand opens or the home screen shows (`tools/fixes3/maps.mjs` checks the switches). Every hero walks to the next section at 230 ms a tile over the fewest tiles, climbs free (`WALK_STEP_MS`, `walkAcross`). The Paladin's plain sheets are made from his awakened ones, gold to steel, his head and the shield's gold sign kept (`tools/paladin/plain.py`). Typecheck, full suite, build, browser checks | [Note](notes/fixes3.md), branch `claude/fixes-map-walk-paladin` |
| KNIGHT-SPRITE | Kwame's plain battle sprite to look like his awakened form, the same man in plainer gear | Done, awaiting review: the plain front and back sheets are the awakened sheets frame for frame, gold to steel, the red cape and green inlays to dark blue cloth, the blade's blue core to steel, the shield's lion to a plain steel cross (`tools/knight/plain.py`); the soldier sheets take the awakened 152 x 116 grid with the same figure height; the `_deep` copies match, and the heritage tool skips him. Typecheck, affected tests, full suite, build, in-game shots at 393x852 | [Note](notes/knight-sprite.md), branch `claude/knight-sprite` |
| AUDIO-THEME | Battle music that is unique, catchy, ours: one main theme, the same tune in each army's own dress | Done, awaiting review: an original JRPG-style main theme (`tools/epic-music/theme.mjs`) and an arranger; 12 battle tracks on it (general `battle` for the daily, Last Stand, spire and field fights; nine army tracks; `boss` in fragments; `calbattle`), each a 4-bar intro then a 40-bar seamless loop; the victory fanfare, the triumph bed and the camp re-arranged on the theme; `trackOfRun` gives each army its own track at every tier; `battle2`/`battle3` removed. Audio 5.87 → 7.66 MB. Typecheck, affected tests, full suite, build, every new file decoded in Chromium; examples for the owner to listen to before merging | [Note](notes/music-theme.md), branch `claude/music-theme` |
| BENCH-TITLES | Pull a hero back to the bench more easily; every hero a longer title | Done on the branch, awaiting review: the whole bottom panel (and a little above it) is the drop area for a placed hero, outlined while it is dragged and lit with "Return to bench" over it; a quick flick down counts; drag-merge still wins over a matching card. Every hero (45) has a unique epithet (`HERO_NAMES[k].title`), "Name, Title" (`heroTitle`) in the dossier, the reveals, the codex, the artwork viewer and the recap's MVP; the short name stays in the small boxes; the old "Name · Class" label is `heroClassLabel`. Typecheck, affected tests, full suite 1493/1493, build, three phone sizes | [Note](notes/bench-titles.md), branch `claude/bench-titles` |
| AUDIO-BATTLE | Battle music stays on and steady through a battle; victory music when it is won | Done, awaiting review: one track a battle (`trackOfRun`, kept wave to wave, boss waves included; no drop to the deploy track between waves, no sting between waves); the tension low-pass, swell, pace and rumble removed; a won battle ends on the victory fanfare leading into the triumph loop at a lower bed under the results until they are left; defeat sting as before. Typecheck, 37 affected tests, full suite 1415/1415, build, an army's last two waves played at x2 in Chromium at 393x852 | [Note](notes/battle-music.md), branch `claude/battle-music` |
| MUSIC-CAMP | No battle or victory music at the camp (the owner: "Music sounds like it runs from the fights into the main screen after") | Done, awaiting review: the camp, its tabs and the maps always play their own music; a fight running on behind the home screen keeps its battle for the way back but is not heard at the camp, and one ending there rings no sting; a board replaced mid-fight lets the old battle go. Pure rules and tests in `battleMusic.ts`; page probe `tools/music-camp/probe.mjs` | [Note](notes/battle-music.md#off-the-board-no-battle-music-at-the-camp), branch `claude/music-camp-fix` |
| AUDIO-MIX | Music and effects matched in volume (the owner's ask) | Done on the branch, not merged: the page's own output measured in Chromium (LUFS, BS.1770) and levelled: every music file trimmed to its place (menus -28, battle -30.5, scenes -27; the files spread over 10 LU before), battle music 7 LU under the fight's sounds (0 to 4 LU before), every cue and king's spell normalised in its family, the effects bus 0.35 to 0.49; the limiter reached in no measured fight. Typecheck, affected and full tests, build | [Note](notes/audio-mix.md), branch `claude/audio-mix` |
| ULT-CHARGE | Ultimates used once or twice a battle | Released as 0.213.0 (owner: keep ultimates at full strength, answer with tougher foes): the meter starts each fight 60 full and fills about 2.5x as fast, ultimates at full strength (none weaker than main), parity by meter speed at stage 78 (spread 5.7); the extra power answered by tougher foes only where ultimates are open: the five late armies' Normal `start` and `tierLift`, Legendary x2.8 and Mythic x2.6 (`Tier.answer`, XP taken back out), the Last Stand's late climb, the Calamity's last map, the daily for levelled saves. Army pace, first-army stars, Stand, Calamity and daily back near main; full suite 1377/1377, build, three phone sizes | [Note](notes/ult-charge.md), branch `claude/ult-charge` |
| AUDIO-150 | Recorded combat sounds and a quieter, cleaner battle mix | Released as 0.186.0; the sounds' source (given as CC0) still needs naming in CREDITS.md | PR #150 |
| AUDIO-147 | Battle music opens on the combat downbeat; the camp's theme plays across all home tabs | Released as 0.184.0; the loop start was moved to 5.68 s (bar 4) so the loop stays whole bars and joins on the beat | PR #147 |
| UI-CASTLE-1 | Remove the corner relic emblems from the castle's building cards | Owner asked; released as 0.183.0; castle tests, build, fresh/old-save and Last Stand smoke passed | branch `claude/castle-card-corners`, screenshot `samples/castle-no-corner-emblems-393x852.png` |
| SIM-001 | No phantom hit effects; no credit for terrain self-damage | Merged with main 0.181.0 (hero-kit after-blow effects also wait for a landed blow) and released as 0.182.0; full suite, build, fresh/old-save and Last Stand smoke passed | [PR #122](https://github.com/Hpatter9/legends-of-the-fall/pull/122), [handoff](notes/sim-001.md) |
| FIX-177 | Unblock the publish after the winding maps | Owner asked; armies keep one land on the winding maps, three tests moved to the 14x18 army board, Undead Normal start 1.52; full suite 1220/1220, build, fresh/old-save and Last Stand smoke passed; release 0.180.0 (0.179.0 was also used by PR #143, merged just before) | [Note](notes/fix-177-tests.md), branch `claude/fix-177-tests` |
| CHEST-001 | XP tomes and Open all | Owner accepted release 0.178.0; tomes 250/5,000/20,000 XP from every stash and shop chest, Open all equal to one-by-one; typecheck, build, fresh/old-save and Last Stand smoke passed; full suite 1216/1220, the 4 failures also fail on main 0.177.0 (winding battle maps), not from this change | [Handoff](notes/chest-extras.md), branch `claude/chest-extras` |
| UI-006 | Cliffside battle overlook with nine army-dependent bases and distant Calamity | Owner authorised release 0.175.0 and PR merge; typecheck/build, 85 targeted tests, all nine camps at three portrait sizes and offline switching passed | [PR #139](https://github.com/Hpatter9/legends-of-the-fall/pull/139), [implementation and screenshots](notes/battle-overlook.md) |


| UX-002 | Home and loss fixes, menu flicker | Owner accepted release 0.174.0; army ribbon only when new, come-back-stronger card after a final defeat (summon tip updated for summoning stones at merge), menu and camp flicker fixes; 1194 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/ux-fixes.md), branch `claude/ux-fixes` |
| SCENES-002 | Cinematic fixes | Owner accepted release 0.173.0; loss scene only on a final defeat, boss scenes once, the king is the player, Calamity scenes gated and retold as a portal, Last Stand milestones retold; 1183 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/scenes-fixes.md), branch `claude/scenes-fixes` |
| COMBAT-002 | Hero kits, mana and manual ultimates | Owner accepted release 0.172.0; all 45 heroes reworked, tap-to-fire ultimates with Auto; 1176 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/hero-kits.md), branch `claude/hero-kits` |
| SUMMON-002 | Summoning stones economy | Owner accepted release 0.171.0; roster about 2x slower to the 20th hero, 1.5-1.7x late; typecheck, 1150 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/summon-stones.md), branch `claude/summon-stones` |
| STAND-002 | Last Stand made harder | Owner accepted release 0.170.0; greedy median waves 4/10/13/22/26/35 at levels 1/10/20/30/60/100, pay within about 9% of before; typecheck, 1133 tests, build, fresh/old-save and Last Stand smoke passed | [Handoff](notes/last-stand.md) (section "Making it harder"), branch `claude/stand-harder` |
| FX-003 | Individual painted signatures for 129 base abilities | Owner accepted release 0.168.0 and merge through PR #135; 84 integration tests, all five emitted-material browser cases and offline launch passed | [PR #135](https://github.com/Hpatter9/legends-of-the-fall/pull/135), [handoff and scope](notes/individual-ability-effects.md) |
| FX-002 | Cinematic battle-effects remake | Accepted with FX-003 for release 0.168.0; main 0.167.0 audio/courtyard updates preserved, release checks passed | [PR #135](https://github.com/Hpatter9/legends-of-the-fall/pull/135), [handoff](notes/battle-effects-remake.md) |
| UI-005 | Cinematic party war council and compact company roll | Owner accepted and authorised release 0.166.0 and merge; typecheck/build, 20 affected tests, all three portrait sizes and all 45 hero tableaux passed on the integrated release | [PR #134](https://github.com/Hpatter9/legends-of-the-fall/pull/134), [handoff](notes/party-war-council.md) |
| UI-004 | Ornate summoning sanctum and differentiated hero/shard reveals | Owner accepted and authorised release 0.165.0 and merge; implementation, full suite and portrait/offline checks passed; release integration checks passed | [Handoff](notes/summoning-sanctum.md), branch `design/summoning-sanctum` |
| UI-003 | Ornate hero dossiers and animated portrait scenery | Owner accepted the implementation and authorised release 0.164.0 and GitHub merge; all 103 tests and three portrait sizes validated | [Handoff](notes/hero-detail-dossier.md), branch `design/hero-detail-dossier` |
| FX-001 | Combat animation polish | Done; owner accepted effects and authorised release 0.163.0 and GitHub merge; 104 implementation test files, 10 integration test files, typecheck, build and five browser cases passed | [PR #131](https://github.com/Hpatter9/legends-of-the-fall/pull/131), [handoff](notes/combat-animation-polish.md) |
| UI-002 | Ornate company character cards | Done; owner accepted the implementation and authorised release 0.162.0 and GitHub merge; full test set and three portrait sizes validated | [Implementation and release handoff](notes/character-card-flair.md), branch `design/character-card-flair-mockup` |
| HEART-001 | Hearts revive fallen heroes in the existing fight | Done; owner authorised merge into `work`, release 0.161.0; 103 test files, typecheck, build and portrait checks passed | [Handoff](notes/heart-resume.md) |
| DIALOGUE-001 | Roughly 90% fewer fight conversation bubbles | Owner accepted and authorised merge, release 0.160.0; typecheck, build and dialogue tests pass; full suite stopped after 50 passes and 53 cancellations | [Handoff](notes/fight-bubbles.md), branch `reduce-fight-bubbles` |
| UI-001 | Keep & Kingdom hero roster, equipment and shared styling | Done; owner accepted the result and authorised merge, release 0.159.0 | [PR #118](https://github.com/Hpatter9/legends-of-the-fall/pull/118), [validation and screenshots](notes/tactical-command-ui.md) |
| SETUP-001 | Shared Codex instructions and task board | Done; merged at owner's request, version 0.157.0 | [PR #119](https://github.com/Hpatter9/legends-of-the-fall/pull/119), [setup note](notes/manager-setup.md) |

## SIM-001 implementation assignment

- **ID / title:** SIM-001 — effective hits and environmental kill credit (#121).
- **Status:** ready for Game Director review; not merged.
- **Owner:** Codex implementation chat.
- **Branch / worktree / PR:** `codex/sim-001`, `/workspace/legends-of-the-fall`; [PR #122](https://github.com/Hpatter9/legends-of-the-fall/pull/122).
- **Allowed scope:** simulation damage settlement, pure combat statistics, regression tests, this board and `docs/notes/sim-001.md`.
- **Reserved:** UI-001's completed work and ownership history are preserved; no UI changes in SIM-001. No UI, input, renderer, charm targeting or RNG isolation changes.
- **Completion criteria:** reproduce failures first; minimally fix post-hit effects and environmental credit; cover cancelled/dead/shielded hits and genuine kills; run typecheck, tests and web build; open an unmerged PR and report in #121.

- **Validation:** typecheck passed; full `npm test` passed (104 test files); final 19 focused regressions and `npm test -- sim-001` passed; web build and diff checks passed.
- **Integration:** current main UI release retained unchanged; typecheck, focused tests and web build also passed against 0.159.0.
- **Handoff:** `docs/notes/sim-001.md`; genuine combat credit and participation/victory XP retained; no implementation blockers. Director reviews shield rider interpretation and handles merge/versioning.

## Ready queue

No additional development tasks have been assigned. Do not invent feature work or start broad refactors. The next task should come from the owner's goal or a specifically authorised investigation.

## Task template

- **ID / title:**
- **Goal:** observable player outcome or question to answer.
- **Status:** ready / in progress / blocked / ready for review / done.
- **Owner:**
- **Branch / worktree / PR:**
- **Allowed files or systems:**
- **Dependencies / reserved files:**
- **Completion criteria:**
- **Validation:** commands actually run, results, and any manual checks.
- **Handoff:** commit or PR, note path, remaining issues.

## Handoff for the existing UI chat

The earlier UI chat stopped work and handed ownership to the manager. UI-001 is accepted and can be archived by the owner. Do not resume that branch without a new assignment. The manager cannot archive app chats directly.

## Returning work to Claude or Codex

Give the next chat the task ID, branch or PR, relevant docs/notes file, checks already run, and remaining work. Repository files provide shared context; chats do not automatically share conversation history or local changes.

## Completion

Mark a task ready for review after implementation and validation. Mark it done only after the owner merges or explicitly accepts the result. Retain a short completed entry with its PR and handoff note.


## WORLD rendering release — 0.169.0

Owner authorised bump and merge of PR #124 on 2026-10-28. Latest main 0.168.0 is integrated, preserving its UI, combat effects, heart-revive behaviour, credits and task history. WORLD remains opt-in at 12×16; the 14×18 per-army maps are still proposals. Rare warm-tail stalls and real-device performance remain open in #126; the broader map initiative remains open in #123. See [rendering handoff](notes/world-126.md).

Release integration validation for 0.169.0: typecheck/build and 48 affected tests passed; release progression/resume/pan/offline lifecycle checks passed all three portrait sizes with zero page errors. Original army/large-field compatibility smoke passed. Evidence: `docs/samples/world-169-lifecycle.json`, `world-169-compatibility.json` and the corresponding screenshots. Owner accepted the rendering checkpoint; broader maps and warm-tail/device investigation remain open.

## UI-006 — Battle command screen — merged

- Owner: Codex; branch `design/battle-command-ui`, worktree `/workspace/legends-of-the-fall`.
- Owner accepted the toned-down ornate battle treatment and requested merging on 2026-10-28.
- Merged through [PR #143](https://github.com/Hpatter9/legends-of-the-fall/pull/143) as **0.179.0**, preserving concurrent main 0.178.0, XP tomes/chest actions, renderer updates and manual ultimate controls.
- Typecheck, web build, battle-flow/hero-kit look/save tests and three-size live-browser checks passed. Spell arm/cancel, drag preview/cast and ultimate Auto passed with no page errors or horizontal page overflow. Reduced-motion captures reviewed.
- [Handoff](notes/battle-command-ui.md). Wider battle screens continue in UI-007 below.

## UI-007 — Battle reports and remaining combat screens

- Owner: Codex; branch `design/battle-reports`, worktree `/workspace/legends-of-the-fall`.
- Owner authorised extending the accepted battle UI across all battle screens, including after-action recaps, after requesting the HUD merge on 2026-10-28.
- UI-006 merged as 0.179.0 through [PR #143](https://github.com/Hpatter9/legends-of-the-fall/pull/143).
- Scope: wave victory/defeat, XP/performance and full run recaps, replay summary, between-fight equipment/events, Tower/Calamity report cards and Last Stand HUD/end cards; preserve existing gameplay handlers, rewards, comeback actions, maps and saves.
- Completion: actual result-to-recap navigation, fixtures for report variants, three portrait sizes and reduced motion; typecheck, build and relevant tests; screenshots for owner review. No further merge/deployment assumed.

UI-007 implementation and validation are complete; ready for owner visual review. Scope includes wave results, after-action recaps, daily/replay/Tower/Calamity summaries, between-fight cards and Last Stand. Typecheck/build and the three matching affected test files passed; daily/old-save fixtures and a real service-worker offline reload passed. See [handoff](notes/battle-reports.md). Follow-up visuals await owner acceptance; no new release bump or merge.

UI-007 final browser evidence: all 23 report/flow checks completed at each of 393×852, 360×780 and 412×915, with zero page errors and no horizontal overflow. Daily/old-save fixtures and real service-worker offline reload also passed. Outcome simulations are temporary review fixtures where noted; full campaigns were not replayed.

UI-007 final integration: owner requested completion after subsequent updates. Main 0.188.0 (`decef2e9`) merged cleanly; new army roads/hazards, awakening auras, spell sources and combat audio retained. Finishing as release 0.189.0 after integrated checks.

UI-007 release 0.189.0 integrated validation passed: typecheck/build; eight affected test files; all 23 report/flow checks at all three portrait sizes; daily/old-save variants; service-worker offline reload/recap; final-facts/action-button checks. Evidence refreshed on main 0.188.0 plus this pass. Ready for the requested completion merge.

UI-007 integrated STAND-003 main 0.189.0 before merging. Older Last Stand style overrides removed so its new castle-room HUD, pause and end cards remain intact. Release updated to 0.190.0.

UI-007 final 0.190.0 validation complete: current Last Stand Auto, pause/resume, end navigation and reduced motion passed at all three portrait sizes, with zero page errors. Duplicate crest/style overrides removed and edge-arrow paint contained. Typecheck/build and eight matching affected test files passed. PR #154 ready for completion merge.

## LOAD-001 — Illustrated loading screen

- Owner: current Codex chat. Branch: `design/loading-refresh`; worktree: `/workspace/legends-of-the-fall`.
- Owner approved the generated moonlit keep concept and requested movement and liveliness. Follow-up approved: crowned king centrally surrounded by an archer, paladin and fire wizard in defensive guard poses.
- Scope: loading artwork, loading-only markup/styles, build embedding, credits and visual evidence. Preserve startup behaviour, saves, gameplay and offline caching.
- Completion: approved artwork with drifting mist/embers, subtle depth and beacon glow; reduced motion; typecheck/build and three portrait sizes, startup and offline checks.
- Status: approved king-and-guard artwork applied and validated; owner requested [PR #179](https://github.com/Hpatter9/legends-of-the-fall/pull/179) for Claude. Current main integration is required (GitHub reports merge conflicts). Typecheck/build, all three portrait sizes, moving layers, reduced motion, seeded startup and real service-worker offline reload passed again; zero page errors. Handoff: [loading refresh](notes/loading-refresh.md). Screenshots and results: `docs/samples/loading/`. No merge or deployment performed.

## SUMMONER-ACTIVE — Animated ceremonial summoner

- Owner: Codex; branch `art/animated-summoner`, worktree `/workspace/legends-of-the-fall`.
- Scope: chamber artwork, separate summoner actor with idle/cast/eye-shield poses, new-recruit chamber reveal, relevant checks and credits. Shard tarot rewards, simulation and saves preserved.
- Direction: owner approved current appearance with idle, summoning, and shielding eyes against the bright hero arrival.
- Completion: three poses integrated with reveal timing and reduced motion. Typecheck/build, four affected test files and browser checks at all three portrait sizes plus reduced motion passed. Status: ready for owner review. [Handoff](notes/animated-summoner.md).
