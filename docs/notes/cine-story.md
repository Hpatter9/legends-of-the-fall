# The story cinematics, redone in the opening's style (CINE-STORY)

The owner liked the new opening (`opening-v2.md`) and asked for the other story cinematics to follow it. This note lists every story
scene, says what each one became, and records the rules they now keep. The Eidolon chains and the opening are another worker's; the
castle buildings' scenes are being turned into a popup elsewhere and were not touched.

## The rules (from the opening)
1. **One backdrop per scene.** Only the first shot names a land; nothing pops between places (a test holds it: `looksOf` in
   `test/cinematics.test.ts`).
2. **Distinct voices.** Each speaker keeps their own register (the heralds' bluster, the underlings' deadpan, the guard's grit, Duchess's
   "Mehh."/"Baaaah.", the ruler's economy).
3. **No fourth wall, no tutorial.** Nothing says "that is you", "the king only watches" or names a button; the story is told in the world.
4. **A beat structure.** Set the place (narrator, a heroes' walk-on), the arrival (a low angle, a title card or a hold), the clash (one
   conversation), the button (a line or a narrator closer that hands off).
5. **Each speaker on their own lines.** A conversation is one shot with several lines and no authored angle, so the director cuts to
   whoever speaks; a tight wide two-shot is used only where everyone speaking is inside the visible ~200 stage px.
6. **Foes drawn in full.** No foe is a black silhouette (`shade`). The one exception is a hero a hero tale keeps secret ("The stranger").
7. **The ruler is the chosen ruler.** Wherever the ruler stands they are `unit:standKing` (the player's pick, Iron Stag by default), and
   speak in the same economical voice; no line tells the player what the ruler is for.

## Every story scene, and what was done
| Group | Scenes | What changed |
|---|---|---|
| Calamity opens | `calamityOpens` | One backdrop (the pass under the tear, was shrine > highlands > volcano); the ruler and Duchess come on and send one hero through; "That is you, choosing" gone; the last shot is the first herald arriving from below. |
| Heralds | `gorvak` (in `sceneScripts.ts`), `thornWarden`, `malphas`, `hrungar`, `vorgrath`, `karnok` | Arrivals are low-angle smash cuts the director covers; each exchange is cut speaker by speaker; "Behold the Nth herald" stagey closers became in-world ribbon gags. |
| Calamity ends | `calamityEnds` | One backdrop (was volcano > highlands); the portal's sigh and the finch are said, not cut to; the ruler (not "the king was thanked for placing everyone") closes it with Duchess's meteor. |
| First loss | `firstLoss` | The guard bicker in a wide two-shot; the ruler owns the broken line, Duchess admits the hedge was hers; no "the king ... was quietly blamed" narration. |
| Firsts | `eliteMet`, `ascensionOne`, `dailyBoss`, `mythicOpens`, `duchessJoins` | Same story and gags; arrivals low-angle, exchanges split per speaker, one backdrop (they already had one). |
| Armies on the march | `intro:<army>` (9) | The two defenders now hold the road from the first shot; the warlord, his escort and a hero trade lines as one conversation. |
| Armies' last stands | `clear:<army>` (9) | Audited: single backdrop, the boss in full, speakers split by the director, in-world; kept. |
| Last Stand milestones | `spire:10`, `spire:25`, `spire:50` | The ruler arrives in the second shot so the guard's talk of him is said with him there; each closes on a narrator button. |
| Awakenings | `awaken:<hero>` (45) | The closing narrator status line ("has awakened") became an in-world beat after Duchess. |
| Hero tales (quest battles) | `qb-moonFold`, `qb-chainsTide`, `qb-ironMarch`, `qb-thirteenthBell`, `qb-debtCollectors`, `qb-hundredLanterns`, `qb-theAppeal`, `qb-hourOutOfPlace`, `qb-scorchedEyrie`, `qb-starHearted` (each with its After) | Audited: in-world, one backdrop, the tale's hero stays "The stranger" (the secret the hand-in reveals). Unchanged. |
| Lost techniques | `qb-emptyDojo`, `qb-unwrittenLibrary`, `qb-matinsChapel`, `qb-snowDen` (each with its After) | Foes no longer silhouettes (the Last Master, the Index). |
| Quest battles | `qb-bridgeBlades`, `qb-saltAndCannon`, `qb-kilnRoad`, `qb-frozenMeadow`, `qb-underCourtyard`, `qb-cellarTenant`, `qb-sweptFloor`, `qb-theAudit`, `qb-recitalNight`, `qb-karnoksDoor`, `qb-wolfDen` (each with its After) | Foes no longer silhouettes (the Ash Warden, the tenant, the conductor, the door, the Mortar Warden); Duchess's "(she goes first)" asides moved to the narrator; "Your Majesty" to "Majesty". |
| Left short (functional) | `arrive:<boss>`, `act:<n>`, `form:<boss>`, `earned:<hero>`, the Last Oaths (`oath:`, `oathcut:`) | Not story scenes; they already keep one backdrop, show the speaker and draw foes in full (an `earned` reveal's silhouette is the hero, not a foe). |
| Not touched | `opening`, the Eidolon chains (`eidolon*`), `castle:<site>` | Another worker's. |

## Tests
- `test/cinematics.test.ts` gains two: a story scene (and every quest, tale and lost-technique story) keeps one backdrop, and only
  "The stranger" may be a silhouette; no story line speaks to the player ("tap", "button", "that is you", ...).
- Scenes stay 10 to 40 s (the events were trimmed to fit: Malphas, Karnok, Vorgrath, the first loss and the Calamity's end are about 36
  to 40 s as written).
- `test/new-lines.test.ts` pins every scene's lines to `docs/lines/new-lines.json`: the 71 scenes whose words changed (the events, the army intros, the 45 awakenings' closing line, the three Last Stand milestones) were regenerated into it. No other test pinned an old line.

## Frames
`docs/samples/cine-story-*.png` (393x852): `calamity-opens`, `first-loss`, `herald`, `army-intro`, `last-stand`, `elite`.
