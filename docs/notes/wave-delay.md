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

### The second report: stops of 2 to 6 s with Auto on

The owner, with Auto ULT on: "The delay is 2-6 seconds", "usually the start of a wave, the end of a wave, and sometimes just on
regular skill use". With Auto on nothing holds the fight (above), so these are the page's main thread stopped, which a clock stepped
by hand cannot see. `tools/wave-delay/profile.mjs` plays waves on a real clock with the CPU throttled six times and takes a CPU
profile across each moment (`node build.mjs --plain --out out/web-plain` keeps the functions' names). On main 0.537.0:

| Moment | Longest single task at 6x | What ran |
| --- | --- | --- |
| A wave's end, before the result shows | 1.13 to 1.39 s, every wave | the march's next section built: about ninety columns, each painted on a canvas of its own (`refresh` > `startWalk` > `ChainView.begin` > `BoardView.build` > `paintColumn`) |
| The result tapped, the next board built | 1.76 to 2.11 s, every wave | the same board painted again for the fight, and the old one again to bake it into the scenery (`newBattle` > `build`, `retire` > `bake`) |
| In the fight | tasks of 0.2 to 0.6 s back to back | a quarter of all script time was one read of the window's width (`viewW`, each frame in the camera), which makes the browser lay the whole page out; the hero rows written every frame; the popup guard reading every popup's computed style every frame |
| A skill's cast | a layout of the whole page, twice | the hero row's flash restarted by asking the row its width, and the banner measuring the panel |

A phone slower than six times this machine turns the first two into the owner's 2 to 6 s. The JS heap sits at 450 to 510 MB from
the start (game.js is 208 MB: the art is in it as data URLs, as it was at 0.492) and did not climb over three waves.

What was changed:

- **A board's columns are painted once.** The painted columns of three boards are kept (`COLUMN_ROOM` in
  `src/render/boardWarmRules.ts`: 640 entries, 16 MB; it was 256 and 4 MB, not two boards' worth, so the second board was never
  kept and every build painted it afresh). The board built for the march is found again by the fight's build and by the bake.
- **The next board is painted ahead** (`BoardView.prewarm`, `pumpWarm`; `ChainView.prewarm`; asked by `main.ts` as a wave is won):
  a few columns a frame (`warmMore`: four at least, more while the frame has 10 ms to give) through the two seconds the falls play
  out, so the march's build finds them there.
- **And through the fight itself** (`warmNow`, `WARM.FIGHT_*`): from a second and a half into a fight the next board is painted a
  tile a frame (2 ms of a frame, or a twentieth of a frame already long), so on a phone it is all there long before the wave ends
  and the falls' two seconds have nothing left to do. On the throttled test machine a fight has too few frames for that, so the
  measured wave's end did not fall further (0.6 to 0.8 s); what is left in that task is the result itself and the march.
- **The window's size is kept** (`src/viewport.ts`), read again when the window changes, not every frame.
- **The hero rows, the clock and the goat's place are written or measured only when they change** (`fightHud.ts` `setText`,
  `setWidth`, `setAttr`; `main.ts`): writing the same words again still made the browser lay the page out.
- **A cast no longer lays the page out**: the row's flash is begun again on the next frame (`again`), and the banner uses the
  panel's place as last measured (twice a second at most).
- **The popup guard looks the page over only when a change could have shown or hidden a popup** (`popupGuard.ts`), not on every
  class changed by a fight.

After, the same profile (three runs of three waves; the machine is noisy):

| Moment | Longest single task at 6x, before | After |
| --- | --- | --- |
| A wave's end, before the result shows | 1.13 to 1.39 s | 0.48 to 1.03 s |
| The result tapped, the next board built | 1.76 to 2.11 s | 0.39 to 0.92 s |
| Script time in forced layout in a fight window of about 7 s | 1.8 to 1.9 s | 0.3 to 0.4 s |

What this machine cannot show: the fight's own frames. Its software renderer keeps the script "busy" nine tenths of the time
whatever the page does, so the tasks of 0.2 to 0.5 s in a fight read the same before and after, and one task of about a second in
each fight is still there (a picture handed to the graphics card on its first use; with the painted spell sheets now kept ready it
should be rarer, but that is not measured). The Diagnostics page is how the owner's phone will say.

- **The painted spell sheets are kept ready** as well (all ten, up to 1536 x 3744 px: 92 MB on the graphics card while a fight is
  on): each is handed over in a deploy, one a frame, never in a fight (`mayWarm`), where before it was decoded in full on the frame
  a skill first drew from it.

### The Diagnostics page

Settings, Diagnostics (`src/diagRules.ts`, `src/diag.ts`, a page of `settings.ts`): every gap of half a second or more between two
frames is kept (when, how long, the fight's phase, and what the page had just begun: "the next board built", "a fight begun",
"the result worked out and shown", "the first use of <skill>"), the last thirty, in `localStorage` (`legends.diag`), newest first,
with Copy and Clear. A gap of a minute or more is the phone left alone, not kept; the page hidden or at rest on the home screen
starts the count afresh. It costs two comparisons a frame.

### The app's first Diagnostics copy (0.544.0, a Galaxy S24 Ultra, WebView 157, pixel ratio 3.75)

"the next board built" was ONE gap of 7.0 and 10.5 s in the app, where the same phone's browser is fine and this machine at a
sixth of its speed takes 0.4 to 2 s. That is not the processor: something in that task is far slower in a WebView. Nothing here
can run one, so what follows is reasoned from the code, not measured.

- **Every canvas the board is painted on is now a software canvas** (`src/render/softCanvas.ts`, `SOFT`, in `boardView.ts`,
  `floorArt.ts`, `sheets.ts`, `boardLife.ts`: the columns, the floor pieces cut for them, the scratch canvas, the portraits, the
  field's lights). A board is about ninety columns, each painted by several `drawImage` calls from other canvases and then handed
  to WebGL. Where a browser keeps a canvas on the graphics card, each of those is a read-back from the card; `willReadFrequently`
  keeps the canvas in ordinary memory in every browser. This is the most likely cause that the code shows, and the least risky
  change.
- Checked and left: the bake and the rim are drawn at a resolution of 1 (0.5 for a large field), not at the screen's pixel ratio;
  nothing in the board's build is sized by `devicePixelRatio` (the game's own canvas is capped at 3).
- **The log now says which part of a stop was long** (`diagStep`, `diagTimed` in `diag.ts`; `stepsText` in `diagRules.ts`): for
  the frame of a stop, each part's time and count, the longest first: columns painted and columns found in the cache, the board
  laid, the old board drawn into one picture (with its size), the rim drawn, the field's life, the fighters made, the page laid
  out, the page refreshed (bench, portraits), pictures handed to the graphics card (every `texImage2D`, timed), a kept sheet
  handed over. So the next copy names the culprit whether or not the change above was it.
- **"not known" says what came before**: the last three things the page began and how long before the stop each was. New names:
  "the march begun", "a kept sheet handed to the graphics card".

Seen on this machine with the new log: a kept sheet handed over in a deploy is itself a stop of half a second to a second and a
half under the software renderer. It is in the deploy by design (not in the fight), but if the app's log shows a run of them at
the first deploy, they should be handed over more slowly or decoded as bitmaps first.

### The tests

`test/wave-delay.test.ts`: the fall's slow moment (a boss's alone, none when calm); the short version's beat (none) and the full
moment's; the kept sheets (one a frame, in order, held while a fight is on); painting ahead (a few tiles a frame at least); the
columns' room (three boards kept, and the old room shown to paint the second again); the stops' log (what is kept, the newest
thirty, what the page was doing, stored and read back).

### Settled by the owner

- Ultimates fired by hand keep holding the fight for the full show (about 4.7 s each). Not changed.
- The fall's slow moment is for bosses only; the wave's last foe has none.
- A boss changing form pauses the fight for 0.9 to 1.6 s (the simulation's own rule, once a boss's wave): left as it is.

### The installed app (0.539: still slow there, where the browser is not)

The Diagnostics page's log now begins with where the game is running: the installed app or a browser (`inApp()`), the WebView's
own user agent, the device's memory and cores as it tells them, the JS heap and its limit where readable, the screen. Copy works in
the app too: the browser's clipboard first, a selected text box copied the old way where that is refused, and "Select the text
below" if both fail (the list can be selected by hand).

What the code shows:

- The app is the same page, served from the APK's assets by Capacitor (`capacitor.config.json`: `webDir: out/web`), with no service
  worker (`main.ts` registers none when `inApp()`).
- `game.js` is 208 MB and goes into the APK as an ordinary asset. `android/app/build.gradle` names no extension to store
  uncompressed, so it is deflated in the APK and inflated through the asset loader each time the app starts; its 19 MB source map
  is packed too. That is the start, not a fight.
- The manifest named neither hardware acceleration nor a large heap, and `MainActivity.java` set nothing on the WebView.

What is a guess (nothing here can run a WebView):

- A WebView keeps no compiled-code cache for a script it is handed through the asset loader, so every function is compiled the
  first time it is called, each time the app is opened: the first use of a skill, the first wave's end, the first board. A browser
  keeps that cache between visits. This would fit "the app is slow where the browser is not" best.
- A WebView's renderer has less graphics and tile memory than a browser's, against a JS heap of 450 to 510 MB; and it may be set
  back in priority by the system.
- The art decoded from data URLs on first use is the same in both, but slower where the rest is.

Changed on the app's side (small, and not built or run here: the Android build is the workflow's):

- `MainActivity.java`: the WebView's renderer is kept at the app's own priority (`setRendererPriorityPolicy(IMPORTANT, false)`,
  Android 8 and later).
- `AndroidManifest.xml`: `android:hardwareAccelerated="true"` (the default, now said) and `android:largeHeap="true"`.

- `android/app/build.gradle`: the page's source map (`*.map`, 19 MB the app never reads) is left out of the APK's assets. It was
  never in the web build's service worker list.

Not changed: storing `game.js` uncompressed in the APK (a larger download for a quicker start), until the owner's Diagnostics copy
is in.


### The lock (0.548.0): the fight's rows up, no battlefield, and it never moved on

The owner, on the app at 0.548.0: the next board built in 0.5 to 1.9 s (the soft canvases worked), then the game locked: the
fight's rows, the spell orbs and the clock at 0:00 up, the whole battlefield missing (only the painted backdrop behind the canvas),
and nothing moved again. The last line of the stops' log was the board's build, from the cache.

**Not reproduced** in a browser (eight waves on a real clock, with Pixi's own idle-texture sweep set to 1.5 s, played well). What
is reasoned from the code: the page's canvas is see-through over a DOM backdrop, so a canvas that is cleared and never drawn again
shows exactly that; the clock at 0:00 means the fight's step never ran either; and Pixi's ticker stops for good when a listener
throws. The game's own frame was caught, but Pixi's drawing was its own listener on the same ticker and was not: one throw in a
drawing (a texture that is no longer alive, or a context lost and given back inside the 4 s the reload waits) ends every frame
after it. The reload's "never twice in a minute" would also have refused a second reload.

What was done, as belts, since the cause is reasoned and not seen:

- **The drawing is guarded** (`main.ts`): Pixi's own render listener is taken off the ticker and the game's, in a try, put in its
  place at the same priority. A fault is counted and the loop goes on.
- **The loop is watched from outside it** (`src/loopRules.ts`, `loopCure`; `Game.watchLoop` on a timer of its own, once a second):
  a loop that has not turned for 2.5 s while the page is shown and the game is not at rest is started again (three times, then the
  page is loaded again); sixty frames or drawings at fault in a row have the board built afresh with the column cache forgotten
  (`BoardView.forget`), and if that does not cure it the page is loaded again into the same run and wave, by the context's rule
  (only in a fight or a deploy: `reloadSafe`). A watch that comes late itself means the whole page was held, and is not counted.
  Each cure is written to Settings, Diagnostics with the phase, the fight's time, the faults and whether the context was there.
- **The column cache never hands out a dead texture** (`ColumnTextures.acquire`'s `alive`; `BoardView.column` checks the texture
  and its source): one found dead is forgotten, counted (`stats.dead`) and painted afresh.
- **The reload after a lost context** may come again after 15 s, not a minute (`CTX.AGAIN_MS`).

Checked in a browser by force: the ticker stopped mid-fight was started again within 3 s and the fight went on; a drawing made to
throw 75 frames running had the board built afresh after 60 (640 kept columns down to the 215 in use) and drew again, the fight
never stopping; neither raised a page error. `test/wave-delay.test.ts` holds the rule and the cache's safety.
