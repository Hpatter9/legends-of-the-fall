# CINE-1110: the next scenes from the backlog's Cinematics list

Branch `claude/cinematics-1110`. The director's ask: build the next scenes on the Cinematics list with the existing scene player, skipping
every Calamity scene (the Calamity and the Last Stand are hidden, `src/sim/hiddenModes.ts`; nothing is unhidden). Four were asked for. All
four already existed in some form on main (the backlog's list predates them); the director's call: fill in the form cut-in, add the
armies' first bosses, and leave the first clear and the first loss as they are.

## What the player sees

1. **A boss's second form** (`form:<boss>`, `sceneFamilies.ts` `formScene`). The cut-in that already ran on a phase change (a slow beat from
   below, then the boss's words tilted) now has a **title card**: the boss's name over its new form's name ("Orc Warlord" over "The Warlord
   Unchained", "Demon Lord" over "Clause Nine"), with the **flash** and a **roar** (the boss's growl, the `bossSlash` cue, now a scene cue)
   as the light breaks. About 3.5 s; the fight is held and a tap or Skip ends it (as before). **Any boss that changes form** has one now: the
   nine army bosses, the Eidolons (their new form named by their first rage, "The Long Winter" ...), the Calamity's six (kept, hidden with
   the Calamity), and the **Warchief** of the Dark Council, who changes form on any fighter's look (`CHIEF_PHASE`). His cut-in,
   `form:warchief`, is one for every warchief: drawn as the warchief himself with his own name and in his land in the fight
   (`warchiefForm`, built by `main.ts` `filmFor`), and as an orc chieftain in the Scenes list. With **Auto on or cinematics off**, the phase
   banner (the quick one, as for ultimates) is all that shows; it shows under the cut-in too, as before. It plays once a save per boss, as
   the owner asked ("Boss cinematics only need to play once"); every later change of form is the banner.
2. **The first army cleared** (`clear:orcs`): left as it is on main (the director: the owner has seen and kept it). Every army already
   has its first-clear scene there (`clear:<army>`, nine).
3. **Each army's first boss** (new family, `boss:<army>`, `src/sim/firstBossScenes.ts`, nine). The first time each army sends a boss at the
   keep (its mid-boss: wave 8, the Wildwood's Thorn Warden at wave 5), a film of its own in place of the plain boss arrival: the army's land
   with the narrator's line as two of the party come on, the boss from below through a smash cut with its **name and title on a card** and
   one of its wave's escort, its boast tilted, a hero's answer in close, a smash cut into the fight. 12 to 16 s; the `sceneBoss` sting; the
   fight's music goes on. The armies' last bosses keep their march (`intro:<army>`) and their arrival. Codex: "The armies' first bosses".
   With cinematics off the boss card plays as before and the film is marked seen, so the Scenes list can play it.
4. **The first loss** (`firstLoss`): left as it is on main (the director: the owner has seen and kept it).

Every scene plays once, follows the Cinematics setting and reduced motion (the player's own rules: no moves, cross-fades, whole lines),
and is in the codex's Scenes list. Art: only what the game has (the land backdrops, the fighters' sheets, the painted portraits, the
goat). No painting was missing, so there is no art-prompt file.

## Code

- `src/sim/sceneFamilies.ts`: `Form.form` (the new form's name), `formScene` exported with a name and look, `WARCHIEF_FORM`,
  `warchiefForm`; `FAMILY_NAMES.firstBoss`.
- `src/sim/firstBossScenes.ts`: the nine first-boss films, `firstBossArmy`, `FIRST_BOSS_OF`.
- `src/sim/sceneKit.ts`: the moment `armyBoss`; the scene cues `bossSlash`, `bossImpact`. `sceneRules.ts` `momentText`.
- `src/sim/sceneScripts.ts`: the family gathered.
- `src/main.ts`: `startPhase` queues `form:warchief` for a boss with no form of its own (`chiefForm`, `filmFor`); `startIntro` plays an
  army's first boss's film in place of the arrival.
- `docs/lines/new-lines.json`: the new scenes and the forms' new titles (`test/new-lines.test.ts`).

## Checks

- `test/cinematics-1110.test.ts`: every form cut-in (and the warchief's) has its title card, flash and roar, and lasts 2 to 5 s; the
  warchief's is drawn as the warchief with his name and land; each army's first boss is the first of its waves (`bossesOf`), has its film
  in its land, named on a card, 10 to 16 s, once, in the Scenes list.
- The existing cinematics, cine-shots, scenes, scene-fixes, scene-reveal and new-lines tests pass.
- Frames at 393x852, 360x780 and 412x915: `docs/samples/cinematics-1110/` (made with `tools/cinematics/cine-strips.mjs` and
  `cine-strip.py`; the script also checks for page errors, sideways overflow, Skip and the held finger).

## Decisions

- The form cut-in plays once a save per boss (the director, after the owner's earlier word); repeats are the banner.
