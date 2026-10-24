# New lines (the writer's rewrite)

The owner had a writer rewrite the game's dialogue and humour, and add more of it. The writer's file is
`docs/lines/gemini-lines.json` (kept as it came); `docs/lines/lines-before.json` is the export it was written from.
`docs/lines/new-lines.json` is the same file after the fixes below, and it is the source of the words now in the code.
The game never loads the JSON: the strings are TypeScript in each file's own style, and `test/new-lines.test.ts` holds
the code and `new-lines.json` equal (every hero quip, tip, grumble, story, lore line and every scene's title, blurb,
captions and lines), so an edit made in one place and not the other fails. `tools/validate-lines.py docs/lines/new-lines.json
docs/lines/lines-before.json` shows no line over its limit (its American-spelling list still flags "fall", "mom" and "catalogued":
they are not American).

## What went where

| Words | File |
|---|---|
| Hero quips (3 for each of 8 moments), banter (5 pairs a trait), Duchess, loading tips, grumbles, recaps, results, achievement asides | `src/quipData.ts` |
| The king's lines and the Last Stand foes' lines | `src/quipData.ts` (`KING_LINES`, `STAND_FOE_LINES`) |
| Hero stories, foe lore | `src/sim/codexLore.ts` |
| The opening and Gorvak | `src/sim/sceneScripts.ts` (and the ten heroes earned in play: `EARNED`) |
| The other heralds, the end, the first loss, the firsts | `src/sim/sceneEvents.ts` |
| Army clears, awakenings, castle builds, tower floors, second forms, Last Oaths | `src/sim/sceneFamilies.ts` (each family's table now carries its own title, blurb and lines; the awakening has a line pair for each of the 45 heroes and one shared closing line; the spire scenes share the goat line) |
| The bosses' second-form words | `src/sim/bossPhases.ts` (`PHASE2`; a test holds them equal to the scenes) |

## What was changed from the writer's text

Counts are strings that differ from `gemini-lines.json` (615 in all, of about 2,570).

- **Awakening, not Ascension.** All 45 awaken scenes: titles ("Knight: Awakening"), the shared blurb, the caption ("Awakening"). The Calamity's
  own Ascension scene (`ascensionOne`, "Ascension I") and the dragoon's "ascension three" are about the Calamity's levels and stay.
  Priestess's "Ascended" quip became "Went up". A test checks that no awaken scene says "ascen".
- **Length.** About 100 lines were over their limit (54 quips, 19 grumbles, 16 recap and result lines, 7 king lines, a caption, an award line):
  all trimmed with the joke kept. Scene lines had one rule beyond the owner's 110: `test/cinematics.test.ts` holds every scene line to 100
  characters and every scene to 10-40 seconds (a line takes 1.6 s and 0.05 s a character), and the writer's heralds ran 41 to 51 seconds. Nine scenes
  (opening, Gorvak and the other five heralds, the Calamity's end, the first loss) and six of the earned heroes' reveals (14 s at most) were tightened
  to fit; their jokes are kept, the padding is not. The caption for the Night Parade's clear ("Yokai Night Parade cleared", 26) is "Night Parade cleared".
- **Mild swearing.** "Oh, bugger" (peasant) is "Oh, bother"; "bloody" in the buccaneer's story is gone; "poor sod" is "poor soul".
- **No modern references.** About 60 lines. Computer and machine talk (firmware, "turning me off and on again", reboot, backup battery, capacitors,
  quantum entanglement, arc reactor, defibrillated, kilovolts, hologram, forcefield, "Overclocked"), office and shop talk (team-building, petty cash,
  five-star review, loyalty card, deductible, claim, waiting-room music, memo, brochure, interview, canteen, clipboard, customer service
  and "press one", performance review, dental cover, bank holiday, weekend penalty rate, trade union, casual agency workers), and other things out of
  place (plasterboard, iodine, "hangry", spoilers, double-espresso, "Mayday", "flak", cockpit, runway, "Drakarys", a band named after a real one,
  jazz and polka, peer review, "temp", "edgy", "icebreaker", "taken the wheel"). The Lich King's phone-queue scene is now a queue for reincarnation.
  "Health and safety" (a grumble) stays: it is the one anachronism that reads as a joke in a fantasy voice. "Pension", "percent" and "tenure"
  stay too: the old text already used them and they are old words.
- **Made-up names.** Colin, Derek, Arthur, Julian, Brenda, Algernon and Greg are gone from lines said by whoever is in the party (the writer
  had named heroes, escorts and the peasant's cousin). Animals keep their names (the dragoon's Barnaby; the beastmaster's wolf is now Brutus so two
  heroes do not share one; the lancer's Buttercup).
- **Spelling.** centre, sulphur, civilised, itemised, "Momma" -> "Mother", "CALibre" -> "CALIBRE", straight quotes and apostrophes throughout,
  no em dashes (7 lines), no markdown ("*Zap*" -> "Zap!"); the robots (rifleBot, siegeBot, the machine banter) and Gorvak are in capitals (a test).
  Typos found on the way: "anhors d'oeuvre", "hisshoes", "mehex", "teeth!Wait", "REQURING", "ABIUNDS", "ERRECT", "klanten", "flawaround", "Tis".
- **Duchess** says only Mehh and Nom (the brackets say what she means): "Nom. Pardon me." and "Meh. Sorry." now have the words in brackets. Every
  Duchess line in the scenes is "Mehh." (a test).
- **Tone.** Gorvak is back to "HALT! NONE PASS THE ASHEN ROAD!", "AND?!" (the writer's "AND WHAT OF IT?!" is long for a shout) and "THAT IS AN
  UNLICENSED GOAT!"; the first scenes got their short, sharp lines back where the writer's were three times the length.
- **Loading tips.** All 30 were checked against the rules and rewritten from facts that are in the code (see the list in the report): the two the
  director named were false ("clearing a wave fills the party's ultimate meters" and "upgrading the treasury makes coins multiply"), and so were the
  ones about healers, golems, undead rising, beasts' attack speed, demons' summoning, daily bosses changing at sunrise, the blacksmith, archers' priority and bosses' sweeps.
  The level at which ultimates unlock is 30 (`ULT_LEVEL`); `CLAUDE.md` still says 15.

## The new moments (renderer only; the sim stays pure)

- `render/quipRules.ts` (pure): `QuipKind` has `levelUp`, `ultimate`, `revived`, `lowHp`. All go through the one `QuipBox`, so the gap (5 s), the
  scene cap (5) and the settings' "Hero quips" switch apply. Each has a chance (levelUp 0.4, ultimate 0.15, revived 1, lowHp 0.6); levelUp, ultimate and
  lowHp are capped at 2 a scene and revived at 1; a hero's lowHp comes once a scene; revived may speak inside the gap (like a win or a loss). The line is
  one of the three, picked from the same side stream of the save's seed (`0x71b5`), so a seed gives the same words. `ultimatesCast` and `closeCalls` (a
  hero left alive under 25% of their health) read a tick's events.
- **Fights** (`main.ts`, `sayMoments`): an ultimate cast and a close call, never while a Last Oath is going off or its cut-in is up (the check is the
  tick's `comboCast` and `sceneHold`, and the cut-in hides any bubble), and not in an auto-replay.
- **Revived**: when a heart has burnt and the wave starts again (`stepRevive`, after `begin`), one hero of the party says one line; the foes'
  grumble is skipped for that restart.
- **Level-ups**: the Last Stand's `levelup` notes (the page's `takeNotes`); the ordinary fight has no level-up event (levels come after a fight), so
  only the Last Stand.
- **The king** (`standView.ts`): `KING_LINES`, over the king's head in the same bubble: `waveStart` (0.6) and `bossWave` (always) as a wave begins (a new
  scene for the talking), `hurt` on a hit on him (0.5, two a wave at most, 12 s apart), `lowHp` once a wave when he is under 30%, `waveCleared` (0.4), `fallen`
  (always) as the run ends.
- **A foe from an edge** (`STAND_FOE_LINES`): 5.2 s into a wave (after the king's bubble has gone and the first foes are in), one grumble (0.5; 0.9 on a boss
  wave) from the on-screen foe farthest from the king.
- Hero ultimates and close calls are also heard in the Last Stand.

## Checks

`npm run typecheck`, `npm test`, `npm run web`, and `node tools/new-lines/shots.mjs` (Chromium on software GL, 393x852, no page errors; saves
`docs/samples/new-lines-*.png`: the loading tip, a fight's quip, the revive, the king and a foe in the Last Stand, the awakening scene and Gorvak's).
