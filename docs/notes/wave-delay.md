## WAVE-DELAY: what stops a fight in the middle of a wave

Branch `claude/freeze-fix` (restarted from main 0.536.0; the director calls the task `claude/wave-delay`). The owner, after the
wave-end freeze was fixed (0.525.0): "There is still a lot of delay in the combat waves. It seems to be more often for a shorter
delay. The same as before but during waves now too."

### What was measured

`node tools/wave-delay/delays.mjs` plays whole runs the way a player does (five heroes past level 30, stages 6 to 19, nothing
forced: charge and mana fill as they do in play) and keeps every stretch of a fight in which the battle's clock does not move for
250 ms or more, with what was holding it. Ten waves each, on main 0.536.0, the page's clock stepped in 33 ms frames:

| Cause | Auto both on, x1 | Auto, x2 | By hand, x1 | By hand, x2 |
| --- | --- | --- | --- | --- |
| An ultimate's full show holding the fight | never | never | 2.8 a wave, 4.7 s typical, 4.9 s worst | 2.9 a wave, 4.7 s, 5.6 s worst |
| The "boss's fall" slow beat (the fight at a third of its speed for 0.7 s) | 4.9 a wave | there, under 250 ms a tick | 4.8 a wave | 2.7 a wave |
| The moment's own slow beat after the blow | never | never | 0.2 a wave, 0.7 s | 0.3 a wave, 0.6 s |
| A boss changing form (the sim's own pause) | 0.1 a wave, 1.6 s | 0.1 a wave, 0.9 s | none seen | 0.1 a wave, 1.2 s |
| The effects' hit-stop on a kill | 0.1 a wave, 0.26 s | none | 0.1 a wave | 0.2 a wave |
| A second ultimate's short banner, a king's spell, a film, a sheet | never | never | never | never |
| The battle's clock against the fight's real time | 109 s of 131 s | 126 s in 78 s (x1.6) | 131 s of 283 s | 158 s in 246 s |

- **By hand, the shows are the delay.** About three full shows a wave, each holding the fight for 4.7 s: half of the fight's time
  at x1, and the fight is held to x1 for 70% of an x2 fight. Since 0.525.0 they no longer pile up at the wave's end (one show at a
  time, none outliving the fight); they come one after another through the wave, which is "more often for a shorter delay, during
  waves now too". This is the owner's own ask (every ultimate fired by hand plays its show), so it is not changed here: the
  numbers are for the director to put to them.
- **On Auto, two things slowed the fight that were not meant to**, both old code that grows with the stage:
  the slow moment for "a boss's fall" was given to every foe of 400 health or more, which past the early stages is every ordinary
  foe (about five a wave, 3.5 s of slow motion a wave); and every ultimate's short version landed its nova in 0.45 s of slow motion
  and a 70 ms freeze. Between them an Auto fight lost a sixth of its time.
- **Auto ultimates do not go through a holding path**, and a second ultimate's short banner holds nothing: checked, none in 40
  waves.

### Pictures handed to the graphics card in the middle of a fight

With every frame drawn and each hand-over timed (`--work`), the large pictures that went to the graphics card mid-fight on main
were: the king's spells' atlas (2041x2022, on the first spell cast), the glow atlas (2048x1319), four painted spell sheets
(1536 px wide), each on the frame it was first drawn; and Pixi takes back whatever has not been drawn for a minute, so each comes
again. The glow atlas and the painted sheets are image elements, which the browser decodes again in full on each hand-over: the
200 ms stop at a phone's speed measured in FREEZE-FIX. The ultimates' own atlases (0.519.0's loader) were not the trouble: nothing
was released in a fight and at most 21 MB of them were on the card. The frame times themselves cannot be trusted on this machine
(the software renderer stalls for seconds with nothing to hand over), so how long each of these lasts on a phone is not known
beyond that measure.

### The fix

- **The slow moment for a fall is a boss's alone** (`fallSlowMs` in `src/render/fxRules.ts`, asked by `fx.ts`): any other big foe
  keeps its burst, its flash and its shake. None with the screen kept still (it used to slow the fight even then).
- **An ultimate's short version never slows or stops the fight** (`ultCastBeat`): it keeps its flash, its shake, its dim and the
  camera's lean; the slow beat and the freeze are the full moment's.
- **The large sheets a fight draws from are kept ready** (`src/render/texReadyRules.ts`, `texReady.ts`; `readyStep` each frame in
  `main.ts`): the king's spells' and the ground loops' atlases, the glows, and each painted spell sheet once a part of it has been
  asked for this visit. One a frame at most is handed to the graphics card, during the deploy as a rule; and while a fight is on
  they are not taken back. So a sheet goes up in the middle of a fight once a visit at most (a painted sheet's first use), not once
  a minute. In the BLENDER-FX loader's files this is two lines of `blenderFxArt.ts` (`keepReady` for the glow pages and for a core
  page as it is held); its budget and its book are untouched, and the ultimates' atlases are left to it.

Nothing under `src/sim` changed.

### After

| | Auto, x1 | Auto, x2 | By hand, x1 | By hand, x2 |
| --- | --- | --- | --- | --- |
| Stops of 250 ms or more a wave, shows apart | 0.1 (a boss's form) | 0.1 (a boss's form) | 1.7 (the full moment's own beat) | 1.3 |
| The battle's clock against the fight's real time | 141 s of 148 s | 131 s in 67 s (x1.96) | 134 s of 286 s | 112 s in 190 s |
| Full shows a wave | none | none | 3.0, 4.7 s each | 2.5, 4.6 s each |

Pictures handed over mid-fight, six Auto waves from a fresh page: before, 22.7 M px, the king's spells' atlas and the glow atlas
among them; after, 14.5 M px, neither among them (they went up in the deploy). What is left is each painted spell sheet's first
use of the visit, and the heroes' own small sheets. Keeping all ten painted sheets on the card from the start would end those too,
at 92 MB of graphics memory held whether a party uses them or not; not done.

### The tests

`test/wave-delay.test.ts`: the fall's slow moment (a boss's alone, none when calm); the short version's beat (none) and the full
moment's; the kept sheets (one a frame, in order, held while a fight is on).

### Still the owner's to say

- Whether a full show by hand should hold the fight for less: for the wind-up only (about 1.5 s) with the strike played live, or
  in full only for a hero's first ultimate of a wave. As it stands the shows take half of a hand-played fight.
- A boss changing form pauses the fight for 0.9 to 1.6 s (the simulation's own rule, once a boss's wave): left as it is.
