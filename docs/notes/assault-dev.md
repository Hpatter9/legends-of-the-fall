# Try an Assault (ASSAULT-DEV)

The owner's ask: "one thing i havent tested is the final assault on the army camp. make it so i can try them all in a developer mode with
leveled units so it's accurate".

**Settings › Developer › Try an Assault** opens a picker (the standard ornate menu, `src/devAssaultView.ts`). Pick:

- **the storming**: Conquest (a hold's first storming, at its tenth star), **The Last Hold** (every other hold fallen, the whole Council on
  its walls, its fall ends the War) or **Regrouped** (the Warband regrouped: a conquered hold again, at Mythic);
- **the strength**: As expected, Strong or Weak;
- **the heroes**: your party (when it has five; else the balance party stands in), the balance party (Knight, Samurai, Archer, Wizard,
  Dragoon: the party every hold was tuned with) or the recruits (Knight, Paladin, Archer, Warlock, Cleric);
- **the hold**: all nine, each row showing the force it would field ("Lv 55 · rank 4 · castle 24 · Recruits").

**Storm it** goes to that hold's real muster (its war plan, siege works and all), the real battle, and the real end screen, win or lose. A
won Last Hold plays the War's end scene from the trial's own ending. **Back** on the end screen (or the muster) returns to Settings'
Developer page; on a loss **Storm again** starts the same trial afresh.

## Nothing carries over

The trial is fought on a deep copy of the save (`trialMeta` in `src/sim/assault/devTrial.ts`), in memory:

- the muster, the battle and the result get a save hook that does nothing (`Home.openTrial`);
- no snapshot of the battle is kept for a resume, and none is cleared (`SceneHooks.trial`, `AssaultSim.start({ trial })`, the worker's
  `start` message): a real assault under way keeps its own;
- the result page says so: "A developer's trial: all of this is shown, none of it recorded";
- so no crowns, shards, XP, soldiers, conquests, war progress, Council deaths, nemesis records, trophies or News reach the save.

`test/assault-dev.test.ts` plays a Last Hold to its end, settles it on the copy, and checks the save is byte for byte what it was.
`tools/assault-dev/shots.mjs` does the same in the browser: the local-storage save before and after, and no snapshot left in IndexedDB.

**Where it can be opened.** Only from the home screen: from a fight's Settings the button says "Open Settings from the home screen to try
an Assault: a run is under way" (a run under the page would be left running beneath it).

**Release builds.** The Developer page has no rule that hides it: it shows in every build, the phone's included, as the grants always
have. Try an Assault sits on it under the grants.

## The force, from the game's own paces

| What | Where it comes from |
| --- | --- |
| Level | Conquest: the hold's mark (`HOLD_MARK`, the level a player has at the army's tenth star, and the level its share was tuned at). The Last Hold: 100, since every other hold falls first and three of them have a mark of 100. Regrouped: 100 (Mythic is meant for 85 to 100, and `assault-2.md` measured the re-storm as "a level-100 fight"). |
| Rank | The day that level comes on, by the level pace (`level-100.md`), then the party's rank on that day, by the unlock pace's new `--ranks` report (`node tools/unlockPace.mjs --seeds 8 --days 200 --ranks`: the five best-ranked heroes' mean whole rank). Rank 4 at the marks 55 to 69, awakened I from 76. |
| Talents | Every row the level opens, the first of each pair (as `tools/army-pace` and `npm run balance -- --talents` learn them). |
| Skills | Mastered (every skill at Level 5 from hero level 40, `tools/skills/mastery.ts`). |
| Castle | The castle a climb has at that level (`castleAt`, copied from `tools/army-pace/pace.ts`). |
| Host | Ten to a platoon, at the rank the Drill Yard sends recruits. |
| Council | A full one, as the Last Hold's balance fields it: a warchief at Might 8, captains 6, 5, 5, 4, lieutenants 4, 3, 3, 3, 2, 2, 2, 1, recruited by the Council's own rules on a side stream (`TRIAL_SALT`). At a Conquest only that army's members stand at the hold (and the warchief on the throne), as in play. |
| Spells | The save's own loadout, with the slots its stars would open. |
| Crowns | 5000, for the siege works. |
| Not modelled | Gear and runes (no tool models a save's lasting gear by level, and every hold was tuned bare): the trial's heroes go bare. |

**Strong** reads the model ten levels up (at the cap, a rank higher instead), with a full castle and a Veteran host; **Weak** ten levels down.

## The first balance read

`node tools/assault-dev/run.mjs --seeds 4` starts every storming as the dev entry does (`trialMeta`, the muster's default plan,
`assaultInput`, `startAssault`), plays it out by Auto and settles it on the copy. "As expected", the balance party, 4 seeds each (2026-11-14):

| Hold | Conquest | The Last Hold | Regrouped |
| --- | --- | --- | --- |
| Bloodtusk Hold (Lv 55 / 100 / 100) | 4/4 won, 32% host lost, 1:24 to 2:46 | 4/4, 14%, 1:08 to 1:39 | 4/4, 11%, 1:12 to 1:42 |
| Barrow Necropolis (62) | 4/4, 10%, 0:56 to 2:25 | 4/4, 4%, 0:55 to 1:16 | 4/4, 15%, 0:57 to 1:27 |
| Howling Den (69) | 4/4, 15%, 1:00 to 1:49 | 4/4, 1%, 1:03 to 1:28 | 4/4, 7%, 1:25 to 1:35 |
| Elder Root (76) | 4/4, 4%, 1:01 to 1:15 | 4/4, 2%, 0:51 to 1:35 | 4/4, 3%, 1:12 to 1:24 |
| Heart of the Maze (89) | 4/4, 23%, 1:05 to 2:54 | 4/4, 10%, 1:10 to 1:21 | 4/4, 40%, 1:13 to 4:23 |
| Bonefire Crag (99) | 4/4, 2%, 1:06 to 1:32 | 4/4, 0%, 0:57 to 1:30 | 4/4, 4%, 1:09 to 1:30 |
| Brimstone Gate (100) | 4/4, 3%, 0:57 to 1:24 | 4/4, 3%, 1:00 to 1:23 | 4/4, 6%, 0:57 to 1:31 |
| Moonlit Shrine (100) | 4/4, 23%, 1:07 to 1:41 | 4/4, 14%, 0:58 to 1:39 | 4/4, 23%, 1:14 to 1:30 |
| Iron Foundry (100) | 4/4, 2%, 0:59 to 1:43 | 4/4, 9%, 1:12 to 1:37 | 4/4, 7%, 1:06 to 1:32 |

(The time is battle time; the limit is 12:00.) Every storming is won, most in under two minutes with under a fifth of the host lost; the
tool flags 22 of the 27 "trivial?" (every win, under 20% lost). None is unwinnable. At **Weak** (ten levels down) all 108 are won but one
(the Elder Root regrouped lost 1 of 4), with Bloodtusk Hold, the Necropolis and the Den losing 41 to 54% of the host.

**Why: the holds were tuned for a bare party.** The hold tables (`npm run balance -- --assault`) field the level alone: rank 0, no talents,
skills at Level 1, a full castle. The trial's force has the rank, talents and skills a player of that level really has. The tool's
ablations show it (4 seeds, Conquest, Auto):

| | Bloodtusk | Necropolis | Maze | Foundry |
| --- | --- | --- | --- | --- |
| The trial's force | 100%, 32% lost | 100%, 10% | 100%, 23% | 100%, 2% |
| `--bare --max-castle` (the hold balance's party) | 75%, 79% | 50%, 74% | 50%, 86% | 75%, 87% |
| `--no-talents` | 75%, 62% | 100%, 19% | 100%, 47% | 100%, 48% |
| `--rank 0` | 75%, 67% | 100%, 42% | 100%, 56% | 100%, 15% |
| `--no-skills` | 100%, 29% | 100%, 19% | 100%, 39% | 100%, 11% |

So the bare party reproduces the holds' own targets (Auto about 50 to 75%), which says the trial plays the same fight; talents and ranks are
each worth most of the gap. **For the director and the owner:** if the holds should be a fight for the player who reaches them, their shares
(`HOLD_SHARE`, `LAST_SHARE`, and the Mythic re-storm) want measuring again with this force (`--talents` and ranks in the hold table, or this
tool), not the bare one. Nothing was retuned here.

## Files

- `src/sim/assault/devTrial.ts`: the force (`trialForce`, `expectedLevel`, `rankAtLevel`, `castleAtLevel`), the throwaway copy
  (`trialMeta`), the picker's lines.
- `src/devAssaultView.ts`: the picker. `src/settings.ts`: the Try an Assault row (`onDevAssault`, `openSettings('dev')`).
- `src/main.ts` `tryAssault` (public: `__game.tryAssault({ army, kind, strength, heroes })`), `src/home.ts` `openTrial`.
- `src/assaultScene.ts`, `src/assaultSim.ts`, `src/assaultWorker.ts`: a trial keeps no snapshot. `src/assaultView.ts`: the result's trial
  line and "Storm again".
- `tools/unlockPace.ts`: the `--ranks` report. `tools/assault-dev/run.mjs`: the auto-play of every storming (`--strength`, `--heroes`,
  `--seeds`, `--only`, `--kinds`, `--tactical`; ablations `--bare`, `--no-talents`, `--no-skills`, `--rank N`, `--max-castle`).
  `tools/assault-dev/shots.mjs`: the photographs and the browser's save check.
- `test/assault-dev.test.ts`.
- Photographs: `docs/samples/assault-dev/` at 393x852, 360x780 and 412x915: `dev-` (the Developer page), `picker-` and `picker-holds-`,
  `muster-` (the Last Hold's), `progress-` (the battle on Auto), `end-` (the end screen), `warend-` and `warend-2-` (the War's end scene),
  `back-` (Settings again).
