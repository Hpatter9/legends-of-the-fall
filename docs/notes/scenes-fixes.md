# Cinematic fixes (SCENES-002)

Five asks from the owner about the cinematics (`docs/notes/cinematics.md`), done on `claude/scenes-fixes`. Seen scenes are still kept in
`Meta.scenes`, and every scene id is unchanged (the Last Stand's are still `spire:10`, `spire:25`, `spire:50`), so a save's seen list
still matches. One optional field is new: `Meta.bossCards`.

## 1. The losing scene only on a real defeat

"The losing cinematic should only play if the team is defeated and has no hearts left." The first-loss scene (`firstLoss`, "A Matter of
Geometry") used to be queued as soon as a fight was lost, before a heart revived the party in the same fight (HEART-001).

- `lossMoments(outcome)` (`sim/sceneRules.ts`) gives the moments a fall brings: none when `fallOutcome(run)` is `'heart'`, the first-loss
  moment when it is `'end'` (no heart left, or a mode with no hearts: the Calamity).
- `main.ts` `refresh` asks it while no revive is under way, and only marks the loss as handled when the outcome is final. So a party that
  falls three times and burns two hearts sees the scene on the third fall, not the first.

## 2. Boss scenes once a save

"Boss cinematics only need to play once." Every boss and herald scene already played once a save through `Meta.scenes`
(`dueScene`); two things still came back:

- **A boss changing form** (`form:<boss>`, 15 cut-ins) had `again: true` and played on every fight. It now plays once a save for each
  boss, like the rest. (This undoes the earlier "every time" choice in `cinematics.md`, decision 2: the owner's new word wins.) Only the
  short Last Oath (`oathcut:*`) still repeats.
- **A boss's card** (the dim, the portrait and the name on a ribbon slamming down as a boss or named elite's fight begins, `startIntro`
  in `main.ts`) was remembered only for the page's life and by run seed and stage, so it came back on every new run, every daily and
  after every reload. It now plays once a save for each boss: `cardKey(boss, elite?)` (`elite:<id>` for a named elite, else the boss's
  fighter id), `cardDue`, `markCard` and `readCards` in `sceneRules.ts`, kept in the optional `Meta.bossCards` (a save from before has
  none; junk is dropped). The boss bar still names the boss during the fight.

Scenes due only once: the heralds (`calBoss` 1 to 6), the Calamity's reveal and end, the daily's boss, the first elite, Mythic,
Ascension 1, the armies' last stands, the Last Stand's milestones and the forms. The test walks every one of them.

## 3. The king is always the player

"Duchess isn't the king." The player is the king of the Last Keep. Duchess is the court goat, "Her Grace", and never the king. The scene
kit can show the king: the Last Stand's king is a fighter (`unit:standKing`, its sheet `stand_king.png`), so it stands in the scenes
that talk about him.

| Where | Before | After |
| --- | --- | --- |
| The opening, "The Crown" shot | "The sovereign places the heroes. That is you." as Duchess walks in; she says "Mehh." in the same shot | The king walks in: "The king of the Last Keep places the heroes. That is you." Duchess has her own shot after it: "Duchess, the court goat: Her Grace, not the king. She disagrees." |
| The first loss | "Perhaps try the eastern flank tomorrow, majesty." said in a close shot on Duchess | The king walks in for that shot; Duchess comes on in the last, wide shot |
| The Calamity's end | "The king was thanked ..." over a wide shot of the heroes and the goat | The king walks in, and the shot is on him and the hero |
| Duchess in a fight | "Does she fight for the crown, or ..." | "Does she fight for your side, or ..." (the hero still answers "That is Her Grace the Duchess.") |
| A win's result line | "High praise indeed from a sovereign goat." | "High praise indeed from the court goat." |

The other words were checked (the quips, the tips, the results, the codex lore, the king's Last Stand lines, the foes' lines): the rest call the
player the king (the heroes' "majesty") and Duchess a goat. `docs/lines/new-lines.json` was brought in step (`test/new-lines.test.ts`).

## 4. The Calamity's scenes wait for the Calamity

"The Calamity cut scene shouldn't appear till the Calamity unlocks." The opening used to say what the Calamity is and end on its first
herald (Gorvak, in shadow) on the road, before the player had any way to the Calamity (`MODE_NEED.calamity`, 16 army stars).

**Chosen: the reveal moved to a scene of its own.** The opening keeps no Calamity at all. Its threat is the armies, the game's first
mode: "Every army in the land is marching on the Last Keep. Some brought packed lunches." It ends on the first army's warlord in shadow:
"The first army was on the road."

- **A Hole in the Sky** (`calamityOpens`, moment `calOpen`): the Calamity's reveal. It is queued after any fight's result once
  `modeOpen(meta, 'calamity')` is true (so it plays the moment the stars open it), and again on the way into the Calamity if it has not
  played yet (cinematics off at the time, or an old save that opened the Calamity before this scene existed).
- `Scene.calamity` marks a scene of the Calamity's story; `dueScene` skips one while the Calamity is shut. Marked: Gorvak, the reveal, the
  five other heralds, the Calamity's end and Ascension 1. (They come only in a Calamity run anyway; the mark keeps it so.)

## 5. No towers: a breach, a throne room, a portal and the void

### The Last Stand's milestones (waves 10, 25 and 50)

The old tower's floors (`spire:*`, "the endless spire", storeys, spiral steps) are now the Last Stand's own story: the castle's walls are
breached, and the guard falls back to keep the king at his throne. Each is three shots (the narrator over a backdrop, the two heroes, the
king). Duchess is no longer in them; the king is. `STANDS` in `sceneFamilies.ts`; the Scenes list calls the family "The Last Stand's
milestones".

| Wave | Title | Backdrop | The narrator | The king |
| --- | --- | --- | --- | --- |
| 10 | Wave 10: The Breach Widens | warcamp | "Ten waves in, the outer wall gave a long groan and then a short, decisive crumble." | "I shall walk, thank you. Briskly. With dignity. Mostly briskly." |
| 25 | Wave 25: The Throne Room | dungeon | "Twenty-five waves. The guard has fallen back to the throne room, and the doors are thin." | "I have been sitting on it all along. You simply never noticed." |
| 50 | Wave 50: The Last Stand | shrine | "Fifty waves round the throne. Out in the land, the bards have begun the song already." | "Whatever comes through that door, the Last Keep stands while you do." |

Before, floor 10: "The spire reveals its tenth landing. The interior is alarmingly larger than the exterior."

### The Calamity: a portal ripped open

The Calamity is a portal that ripped open over the keep; an invasion pours out of it, and the heroes go through to stop it. Beyond the
portal lies the void (so the story fits the coming map: a small map in a void dimension with paths branching four ways). The heralds lead
the invasion; Karnok holds its gate at the void's heart. The shots and the jokes are kept; the place lines change.

| Scene | Before | After |
| --- | --- | --- |
| The reveal (new) | (in the opening) "Beyond the last milestone, an ancient evil woke in a foul temper." | "One quiet night, the sky over the keep ripped open like a cheap tent." / "Through the tear: a portal. Beyond it, the void. Out of it, an invasion." / "Beyond the portal, six heralds lead the invasion. Together they are the Calamity." |
| Gorvak | "The meadow road runs through soot, and something sits in it." | "Past the portal lies the void, with a road of soot and something on it." |
| The Thorn Warden | "The second map is all hedge, the grudge-holding sort." | "Deeper into the void, the way is all hedge, the grudge-holding sort." |
| Malphas | "Beneath the roots: a court, torches, and a long agenda." | "Further in, the void keeps a court, torches, and a long agenda." |
| Hrungar | "The pass is blocked by ..." | "A pass through the void is blocked by ..." |
| Vorgrath | "The fifth realm is sulphur and cinder ..." | "The void's fifth reach is sulphur and cinder ..." |
| Karnok | "The sixth map is the world's rim. The clouds look bruised." | "At the heart of the void, the invasion's own gate. The clouds look bruised." |
| The Calamity's end | "The red sky cleared to a pleasant blue. A finch piped up." | "Back home, the portal sighed and sealed shut. A finch piped up." (blurb: "the portal seals itself") |
| Ascension 1 | "The Calamity handles defeat poorly. It took its grievances away to brood upon them." | "The portal has torn open again. The Calamity handles defeat very poorly." |

### The heroes earned at the Last Stand

The Dread Pirate and the Tyrant were earned by "20 / 40 floors of the endless tower" (`Meta.tower`), which no longer grows: the Last
Stand records `Meta.stand`. They now join at **wave 20 and 40 of the Last Stand** (`contentHeroes.ts`: the higher of `stand` and an old
save's `tower`, as the `tower20` achievement already counts), and their reveals say so: "Twenty waves held at the Last Stand. A corsair
crew came ashore to see who was holding." / "Forty waves round one throne. Then a second throne arrived, with a tyrant on it."
(`docs/notes/hero-shards.md`'s table still names the old floors.)

## Tests and checks

- `test/scene-fixes.test.ts`: the loss moments by outcome; every boss and herald scene due once and still seen after a reload; the boss
  card once for each boss, kept and read back; no king line in a shot on the goat and nothing calling her a sovereign, and the opening's
  "That is you" shot on the king; the Calamity's scenes shut until it opens and the opening free of it; no tower words in the Last Stand,
  Calamity or earned scenes; the Dread Pirate and the Tyrant by Last Stand wave.
- `test/cinematics.test.ts`: the forms are once-a-save cut-ins; the Calamity is opened where its scenes are expected; the opening casts the
  king and the warlord. `test/hero-shards.test.ts`: the Tyrant's new line.
- `tools/cinematics/fixes.mjs` walks the four checks in the real page at 393x852 (screenshots `docs/samples/scenes-fixes-*.png`).

Checks run: `npm run typecheck`; `npm test -- scene cinematic new-lines quips stand heart hero-shards achievements meta codex content save unlock
modes` (182 passed, none failed); `npm run web`; `node tools/cinematics/fixes.mjs` (all five checks passed, no page errors). Not run: the full
suite, and the 360x780 and 412x915 sizes.

## Left as it was

- No throne room backdrop exists among the areas, so wave 25 uses the dark `dungeon` backdrop (a cave). The castle tab paints its own throne room,
  but that is not a scene backdrop.
- In the Calamity's end, the fallen Karnok still lies on the stage in the "back home" shot (as before this change).
