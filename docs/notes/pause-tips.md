# PAUSE-TIPS: a pause button, and the unlock tutorials

The owner: "I want a pause button, and more tutorial explanations. A popup that pauses the game when you start a wave but now you have
auto merge unlocked, so it explains that kind of thing."

## The pause

- **The medallion** (`#pause`, `src/pauseTips.css`) sits on the fight's top bar between Settings and the speed. It shows in a fight only
  (`body[data-phase='fight']`); the deploy, the march and the results have no clock to stop. Its picture is a stand-in made from the
  speed medallion's own rim and face (`src/art/ui/buttons/pause.webp`); the prompt for the painted one is `pause-tips-art-prompts.md`.
  Four medallions leave the gold little room on a phone, so in a fight up to 430 px wide they are 40 px (not 44) with a 3 px gap, the
  gold and the clock 14 px, and the gold is cut short with an ellipsis rather than run under the clock (checked with 1240 gold at 360,
  393 and 412).
- **Paused** (`Game.pauseFight` in `src/main.ts`): `frame()` returns straight after its bookkeeping, so the renderer stops stepping the
  battle (the sim is never touched: `stepBattle` is simply not called), and every show stands where it is: an ultimate's moment, an
  Eidolon's call, a boss's cut-in, a duel's ring, the effects, the sprites and the camera all move on the frame's `dt`, which is not given.
  The picture is still drawn, at 12 frames a second (`PAUSED_FPS`), and `body.gamePaused` stops the page's own CSS animations under the
  card. The sound's clock is suspended (`holdSound` in `render/sound.ts`): the music, the beds and every cue hold where they are and
  carry on from there; a tap on the card does not start the clock again (the first-tap `unlock` checks the hold).
- **The card** is the standard ornate menu (`fightPause`): "Paused", the fight's time, Settings, and Resume. There is no retreat from an
  ordinary fight in the game, so none was added. No tap outside the card resumes; Escape and the phone's Back are Resume. Settings closes
  the card without resuming and the card comes back as Settings closes.
- **Everywhere a fight is fought on the board**: an army's waves, a duel (the walk-in and the ring), the daily, a quest battle. The
  Assault's field has had its own pause (`assaultScene.ts`); it now stops the sound too, and pauses on its own when the page is hidden.
- **The page hidden** (the phone locked, another app) pauses a fight, and it stays paused on return until Resume is tapped. That card is
  one the game raised, so it has the popup guard's deaf moment. An auto-replay is not paused by a hidden page: it carries on by itself on
  return as it always has (its banner still reads "Paused" while hidden).
- **The loop watch** (FREEZE-FIX, WAVE-DELAY): `loopCure` takes `paused`. A paused fight is never loaded again (that would bring the wave
  back from its start and lose the pause). Its picture still turns, so it is not seen as stopped; were its loop to stop, it is only
  started again, however often, and a drawing that keeps faulting is built afresh once, then left for the Resume. Resuming counts the
  watch from that moment. `test/pause-tips.test.ts` holds the rule.

## The unlock tutorials

Rules: `src/tutorialRules.ts` (pure); cards and the page: `src/tutorialView.ts`.

- **At a wave's start.** As a wave's fight begins (`begin()`), the tutorials open and unseen are taken, in the table's order, at most
  two (`WAVE_CAP`); the rest wait for the next wave. They are shown before the fight's first tick, once nothing else has the screen (no
  ultimate, call, cut-in, boss's card, intro or duel walk-in), the fight held (`paused = 'tips'`) until the last is closed. Two queued
  read "1 of 2" and "Got it · next". An auto-replay shows none: they wait for a wave fought by hand.
- **On a page.** The tavern's, the Recruit tab's, the Dark Council's and the War Room's own come the first time that page is opened with
  them due (`offerPageTutorials`, from `home.ts`).
- **Once a save.** What has been seen is `Meta.tutorials` (optional; a save without it loads as before). Each card is a standard ornate
  menu the game raised, so it has the popup guard's moment and no tap outside closes it.
- **UNLOCK-ONCE.** The deploy helpers (Auto merge, Auto place, Rune Auto) were told by a toast; their tutorial's card is now their one
  announcer (`UNLOCK_TELLS.helper = 'tutorial'`). The toast is kept only for a helper whose tutorial was already seen.
- **Veterans.** A save's first load with this version (no `Meta.tutorials`) marks everything it already has open as seen, except the two
  newer than their unlock: **the pause** (new in this version) and **the trait perks** (their tiers at two, three and four heroes came long
  after a veteran first fielded a pair). A new save (no army beaten, no star, no stone pulled) has nothing marked.
- **Settings › Tutorials** (a sheet, like the Credits page): every explanation, grouped "In battle" and "Around the keep", each with what
  opens it, the unseen marked "not yet met"; a tap reads it again. **Show tips again** makes every tutorial and every first-run tip due
  again.
- Left to their own announcers, and not given a tutorial: the first rune (the first-run tip `runes` already explains it), the ten lives
  (the tip `retry`), the Last Stand and the Calamity (hidden), quests, the shop, gear and relics (no unlock: met from the first run).

## Every tutorial

| Id | Title | Where | Opens at | Text |
| --- | --- | --- | --- | --- |
| `pause` | Pause the fight | wave | Your first army beaten | The pause button beside the speed holds the fight where it stands. Nothing moves until you tap Resume, and the fight pauses by itself if you leave the game. |
| `autoMerge` | Auto merge unlocked | wave | The second army beaten | Tap Auto merge on the deploy screen to merge every ready pair at once. Two heroes of the same kind and grade still make one of the next grade, up to grade four. |
| `traitPerks` | Trait perks | wave | Your first army beaten | Heroes who share a trait fight better together. Two, three and four of a trait on the board each open a stronger tier. Tap a trait chip on the deploy row to read its perks. |
| `spellSlots` | A second spell slot | wave | 3 army stars | Army stars open more of your king's spell slots: four in all. Each slot holds a spell to cast in the fight; the Spell switch casts them for you. |
| `daily` | The daily battle | wave | Your first army beaten | Each day the camp has a battle of ten waves that ends with the boss of the day. Every player meets the same day. Find it on the Battle tab. |
| `eidolons` | The Eidolons | wave | Your first army beaten | A summoner waits in the Recruit tab with a pact to fulfil. Finish its chain of tasks and an Eidolon is bound to you: a great being your War Horn can call into a fight. |
| `castle` | The Castle opens | wave | 6 army stars | The Castle tab is open: raise buildings that strengthen every run. A build takes real time and goes on while the game is closed; the builders do one at a time. |
| `autoRunes` | Rune Auto unlocked | wave | 6 army stars | On the rune bench, Auto sets your runes into your heroes and merges the spares with one tap. Drag a rune by hand whenever you would rather choose. |
| `nemesis` | The Nemesis War | wave | The second army beaten | The foe remembers you now. A captain who beats your heroes, or escapes them, earns a name and climbs the Dark Council. Meet them again and they will be stronger, and they will know you. |
| `chapel` | The Chapel | wave | 10 army stars | The Chapel can be raised in the Castle now. Once it stands, the Spells tab opens: choose your king's spells and rank them up. |
| `talents` | Talent points | wave | A hero at level 3 | A hero earns a talent point every few levels. Spend them on the hero's tree, on its Progression page in the tavern, to change how it fights. |
| `secondSkill` | A second skill | wave | A hero at level 10 | A hero at level 10 opens a second skill, and at level 20 a third. They cast on their own in the fight; their levels grow the more they are used. |
| `duels` | Duels | wave | A nemesis met twice | A nemesis you have met twice may call one of your heroes out. Accept and the two fight alone in a ring for a minute: win and the nemesis falls for good and its wave breaks; lose and it fights the wave stronger. |
| `warHorn` | The War Horn | wave | Your first Eidolon bound | An Eidolon is bound to you, and the War Horn sits by the board. It fills as the fight goes on: when it glows, tap it to call your Eidolon's strike. |
| `ultimates` | Ultimates | wave | A hero at level 30 | A hero at level 30 has its ultimate. Its portrait glows when the ultimate is ready: tap it to fire, or let Auto ultimates fire them for you. |
| `autoPlace` | Auto place unlocked | wave | The fourth army beaten | Tap Auto on the deploy screen to set your heroes out in one go. They stand in the formation you picked; move any of them by hand after. |
| `tavern` | The tavern | page: tavern | The Heroes tab first opened | Your heroes rest here between battles. Tap one for its sheet: its gear, skills, talents and rank. Hester's shop, the quests and Upgrade all are here too. |
| `summoning` | Summoning | page: recruit | The Recruit tab first opened | Summoning stones call heroes: each stone gives a shard of one. Enough shards and a new hero joins you, or one you have ranks up. Stones come from chests, quests and army stars. |
| `council` | The Dark Council | page: council | The Council first opened | Every nemesis you have made sits on the Council, under its warchief. Between your runs they scheme, rise and fall. Tap one to read what it remembers of you. |
| `hunts` | Hunts | page: council | Two War Trophies | Two War Trophies buy a hunt: mark a nemesis on the Council as your quarry. It waits in its army's next run. Slay it for a bounty; meet it and let it live, and the hunt fails. |
| `spare` | Spare or slay | page: council | A nemesis kneels | A beaten nemesis may kneel before you. Slay it and it falls for good. Spare it and it serves as your Informant for five runs, telling the secrets of its old masters. |
| `tiers` | Harder tiers | page: armies | Three stars on an army | Three stars on an army open its Hard tier; more stars open Elite, Legendary and Mythic. Each tier is for stronger heroes, and pays better. |
| `assault` | Assaults | page: armies | Ten stars on an army | Ten stars on an army open the Assault on its hold. Lead your heroes and their troops across a great field, storm the gates and bring down the hold's lord. |

## Checks

- `npm run typecheck`; `npm test -- pause-tips unlock-tell featureUnlocks rune-bench loop popup-guard ui-standard store-dev settings tips first-hour unlock home`.
- `ROOT=out/web node tools/pause-tips/shots.mjs` at 393x852, 360x780 and 412x915: the medallion mid-fight, the paused card (the battle's
  clock checked still under it, through Settings and back, for five seconds of the loop watch, and after the page is hidden and shown), an
  unlock card at a wave's start (Auto merge), two queued, and the Tutorials page. Shots in `docs/samples/pause-tips/`.
