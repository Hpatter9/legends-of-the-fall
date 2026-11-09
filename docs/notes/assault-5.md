# The Assault, phase 5: the Last Hold and the War's end

Phase 5 of `docs/design/assault-mode.md` (on `claude/assault-design`): whichever hold stands last is where the warchief makes his last
stand with every Council member left, and its fall ends the Dark Council with a scene. The War's record and the codex note the ending.
The new game-plus seed is left out (the owner is asked first), and the Last Stand and the Calamity stay hidden as they are, not folded in.

The rules are in `src/sim/assault/lastHold.ts`; the tests in `test/assault-last-hold.test.ts`.

## The Last Hold

- **Which hold.** `isLastHold(m, army)`: the army has a hold, it still stands, and every other army's hold is conquered. All nine armies
  have holds now, so the last of them is always one, whichever order the player takes them in.
- **The whole Council defends it.** `assaultInput` gives it every member left but the warchief (`lastCouncil`): of any army, and those away
  licking their wounds too (the last stand calls everyone home). The input says `last: true`.
  - The mightiest take the posts' officers' places, as at any hold (`councilPlaces`: six lieutenants' posts, the gates' and the throne's
    captains).
  - The rest (with a full Council, the two weakest lieutenants) stand at the throne beside the lord, in the first of its rank and file's
    places (`sparesOf`, `buildGarrison`). They take places rather than adding to them, so the garrison keeps its numbers; and they are put
    in after the garrison's own draw, so every other hold's fight plays out exactly as before.
- **The warchief cannot flee it.** He holds the throne, as at every hold (Q1), and there is nowhere left to ride (`strongestHold` finds
  none), so the flight of phase 3 never comes up.
- **The muster says so**: "The Last Hold" over the hold's name, and "<the warchief> makes his last stand · the whole Council, N strong,
  defends · its fall ends the War". The scouts' report lists every member, those at the throne among them.
- **The codex's hold page** calls a standing Last Hold so: "It is the Last Hold: the whole Dark Council stands here, and its fall ends the
  War".
- **Not the Warband regrouped.** A conquered hold stormed again at Mythic is never the Last Hold.

## The War's end

When the Last Hold falls (its first conquest), `settleAssault` settles the War as after any conquering attempt (`noteWar`: the members
slain there die for good, no cheating death), and then `endWar`:

- writes `War.end`: the day and war turn, the army, the lord who held the throne (his name, his fighter, whether he sat as warchief), the
  members slain at the Last Hold (mightiest first), those who lived (scattered), and the assaults it took;
- clears the Council's seats: no members, no claim to the empty seat, no one away, no Muster to call;
- writes the News: "<hold> falls, the last hold standing. <lord> made his last stand there, and N of the Council fell with him"; "N of the
  Council live through it, and are scattered to the wilds"; "The Dark Council is broken. Its seats burn, and the War is over".

After that the Council takes no more turns (`councilTurn` returns null), recruits no one (`recruit`), and no fight births a nemesis
(`noteNemesis`). The War Trophies held can still be spent in the Spoils; the Fallen keep the slain (the warchief among them, and his Head
among the Warchief's Heads); the News keeps the War's story. The save keeps the ending (`readWar` reads `end`).

**Design call (mine, to confirm):** the members who live through the Last Hold are scattered, not kept. The design says the seats burn and
the War ends, so the Council board has no one left to show; they are named in the ending ("Scattered") instead. If the owner wants a
new game-plus seed later, the scattered are the natural seed of the next Council.

### Where it shows

- **The result page**: "The War is won" over "<hold> falls, and the Dark Council with it", with the News lines under The Council.
- **The Council board** (`nemesisView.ts`): in place of the seats, "The War is over": the fallen lord's portrait and title ("the last
  Warchief of the Dark Council"), the War's end in a line, "Slain at the Last Hold" and "Scattered". The board's line reads "The War is over
  · it ended on war turn N", and the camp's plate "The Dark Council · broken".
- **The codex's hold page**: the record ends with the War's end in a line ("The War ended at Iron Foundry, the Last Hold, in 3 assaults:
  Vorga the Skullsplitter fell on its throne with 4 of the Council"), and its lord's line says who held its throne to the end.

### The scene

`src/sim/warEndScene.ts`: "The War's End", built from the War's own ending, so the warchief the player fought is the one who falls (his
fighter and his name), on the Last Hold's land's painted backdrop. It plays once, the next time the camp opens after the War ends (with
the bond, Vengeance and heir scenes, `main.ts` `onOpened`), and the codex's Scenes list plays it again. Before any War has ended the list's
copy has a stand-in Orc Warlord. It is made with the cinematics kit (`sceneKit.ts`): five shots, the lord's last shout, the blow, the
party taking stock with Duchess, the war drums falling silent; about 37 seconds.

No new art is needed to play it. One optional painting, the Council's hall with its seats burning, would give the board's end card its
own backdrop: `docs/notes/assault-5-art-prompts.md`.

## The balance

The Last Hold is tuned against the same targets as every hold (Auto about 50%, Tactical 75 to 90%, Siege 85 to 90%) at the hold's own mark
(`HOLD_MARK`), with a full Council defending: `npm run balance -- --assault <army> --last --seeds 32` fields a warchief at Might 8, four
captains (Might 6, 5, 5, 4) and eight lieutenants (4, 3, 3, 3, 2, 2, 2, 1), born of the elites of every army, with no traits (the table
measures the Council's weight, not its luck).

The Council does not weigh the same at every hold. Its members are elites and escorts, with plainer kits than a hold's own nameless officers
(an Ogre Shaman King, a Devil Leader, a Bone Captain), and the warchief replaces the hold's own lord. At some holds a full Council made the
fight easier, at others harder. So the Last Hold's garrison stands at its own share of the hold's share, by army (`LAST_SHARE`):

Measured with `--last --seeds 32` at each hold's mark (Auto / Tactical / Siege wins; the first column is the table with no factor):

| Hold | Mark | x1 | `LAST_SHARE` | Auto | Tactical | Siege |
| --- | --- | --- | --- | --- | --- | --- |
| Bloodtusk Hold (Orcs) | 55 | 28 / 84 / 59 | 0.95 | 63% | 100% | 91% |
| Barrow Necropolis (Undead) | 62 | 88 / 97 / 97 | 1.12 | 50% | 84% | 91% |
| Howling Den (Beasts) | 69 | 53 / 34 / 34 | 0.9 | 72% | 53% | 44% |
| Elder Root (Wildwood) | 76 | 78 / 72 / 75 | 0.97 | 78% | 81% | 84% |
| Heart of the Maze (Labyrinth) | 89 | 13 / 94 / 94 | 0.88 | 47% | 100% | 91% |
| Bonefire Crag (Ogres) | 99 | 97 / 97 / 100 | 1.45 | 88% | 81% | 75% |
| Brimstone Gate (Infernal) | 100 | 94 / 97 / 100 | 1.25 | 78% | 75% | 75% |
| Moonlit Shrine (Yokai) | 100 | 16 / 88 / 78 | 0.91 | 44% | 97% | 88% |
| Iron Foundry (Golems) | 100 | 50 / 63 / 31 | 0.9 | 72% | 81% | 75% |

**What it does not reach.** The table is noisy (the same factor swung 10 to 20 points between sweeps; Ogres at x1.5 came out easier
than at x1.4), so I stopped after four sweeps. The misses:

- **The Howling Den** is the one real miss: Tactical and Siege trail Auto at every factor tried (x0.75 to x1). It draws no bows, so
  Auto's huddle (the Auto lever) keeps the host together, while Tactical's single crossing meets the whole Council at the throne. A
  lower factor lifts all three together; at x0.85 they were 84 / 81 / 75.
- **Auto runs high** at Bonefire Crag, Brimstone Gate, Elder Root and the Iron Foundry (72 to 88%), where a factor hard enough to bring it
  to 50 sinks Tactical and Siege below their range. I kept Tactical and Siege on target and let Auto sit high.
- **Tactical runs at 97 to 100%** at Bloodtusk Hold, the Heart of the Maze and the Moonlit Shrine, as it does at those holds outside the
  Last Hold.
