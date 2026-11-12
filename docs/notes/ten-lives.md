# Ten lives (TEN-LIVES)

The owner's words: "I want to change the hearts system a little. I want it to be more of a 10 lives system. When a hero dies in battle
after some time passes, the hero revives and uses a life. Let's try 5 seconds and see how well that works. If everyone dies it revives
everyone and continues the fight using up that many lives."

Branch `claude/ten-lives`. The rule is in `src/sim/lives.ts` (pure, with tests in `test/ten-lives.test.ts`); the run's count is in
`src/sim/run.ts`.

## How the hearts worked before

- **The rule** (`run.ts`): a run could retry `MAX_RETRIES` = 2 times (`retriesLeft`, `canRetry`, `retryWave`, `fallOutcome`). Armies, the
  daily, the Muster and quest battles had them; the tower and the Calamity did not (they fail their own way); the Last Stand and the
  Assault are not runs of this kind.
- **In a fight** (`battle.ts` `reviveParty`, `main.ts` `beginRevive`, `docs/notes/heart-revive.md`, `heart-resume.md`): nothing happened
  while heroes fell one by one. Only when the fight was **lost** (every hero down, or the two-minute clock run out) did a heart burn: a
  flame over the heart in the top bar, a line, and then every fallen hero stood up **at full health** in the same fight (foes, clock and
  charges as they were; a clock run out got another two minutes). The run was paid `retryGold`, one Hire's price.
- **The top bar** (`#lives`, `drawLives`): two heart icons, grey once spent; a cursed march's badge beside them.
- **Between waves** (`wounds.ts`): after a won wave each hero still down stands again at half health for the next wave ("Back on their
  feet" on the wave card, `risenLine`); those standing are whole.
- **Heroes' and relics' own revives** (unchanged): the four healers' revive (`kits/revive.ts`: 30% health, once a wave a hero, two a
  wave), Mass Resurrection (`ultimates.ts`), the rising feather and other gear (`equipFx.ts`), the Ferryman's Coat and Dawnbringer
  (`setPowers.ts`), a relic's rise (`relicFight.ts`), the undying pirate, the Chapel's Last Rites (`chapelRooms.ts`: the first hero to
  fall rises after 10 s at 15%), an Eidolon's and a king's spell's raise.
- **Things that gave or took a heart**: the road event "A crown in the reeds" (a great relic for a heart), "The refugees remember" (a
  burnt heart back), a **cursed march** (one heart instead of two, `march.ts` `heartsLost`), quest battles with `noHearts` (no retry at
  all), the Chapel's **Vigil** (how the party rises when a heart burns: shielded, swift or cleansed), the **Legend Oath** (a heart's burn
  counted a fall for each hero down).
- **Things that counted hearts**: an army's second star ("Clear without using a heart"), the daily's bonus star ("No heart spent"), some
  27 quests with `noHeart`, the wave card ("A heart burned · 1 left"), the recap ("Hearts burned"), the end-of-fight music (no defeat sting
  on a fall a heart revives), the first-loss scene (only with no heart left).
- **The duel waves**: a duel lost was never fought again by a heart; the wave was then fought as usual.

## The rule now

Each number is a named constant in `src/sim/lives.ts`.

| constant | value | what |
|---|---|---|
| `LIVES` | 10 | the lives a run starts with, shared by the party |
| `REVIVE_MS` | 5000 | how long a fallen hero lies before a life raises it (the fight's own time: the same at every game speed, held while a show holds the fight) |
| `REVIVE_HP` | 0.5 | the share of its health it stands up with |
| `REVIVE_SAFE_MS` | 1000 | it cannot be targeted or hurt, nor act, this long after rising |
| `HEART_LIVES` | 5 | what one old heart is worth (things that gave or took a heart; an old save's burnt hearts) |
| `TIMEOUT_LIVES` | 3 | what the clock running out costs, for another two minutes |
| `FALL_GOLD_FALLS` | 2 | how many party falls a run pay a Hire's gold |

1. A run has ten lives. The top bar shows the heart (the same art) and the number left, amber at three or fewer, grey at none. Ten pips do
   not fit beside the gold at 360 wide, so it is the icon and the number.
2. A hero that falls lies five seconds of the fight's time, then, if a life is left, stands up on its own tile (the nearest free standable
   tile if another fighter has taken it) at half health, cleansed of its ailments, safe for a second; one life is spent. Its skill and
   ultimate charge are kept. A gold ring with the seconds left counts down over where it lies, and its row in the party panel says
   "♥ 4s".
3. Every hero down at once: nobody waits. They all rise there and then, a life each, in the party's order (the order placed). With fewer
   lives than fallen heroes, as many rise as there are lives. A line says "The whole party fell · 5 lives spent, 4 left. The party
   rises." The fight is never paused for any of this.
4. With no life left the fallen stay down for the wave (no countdown is shown), and a party all down with no life left has lost the wave
   and the run, exactly as a lost run was.
5. Deterministic: the timer is the fight's clock, the order the party's, no randomness, no new stream. A fight without lives
   (`Battle.lives` unset) plays tick for tick as before: every recorded scenario but the daily's kept its hash.

## What I decided, thing by thing

- **Between waves: kept.** A hero still down when a wave is won stands at half for the next ("Back on their feet"), spending no life. A
  hero a life raised stands at the wave's end, so it is not wounded.
- **Heroes', relics' and the Chapel's own revives: kept, and spend no life.** Whichever comes first raises the hero; the other then has
  nothing to do. Summons and foes use no lives.
- **Modes.** The same rule in armies, the daily, the Muster, quest battles and on boss waves. **A duel's ring has no lives**: the duellist
  does not rise, and a duel lost is not fought again (as before); the wave after it has the run's lives. **The tower and the Calamity, the
  Last Stand and the Assault are unchanged**: they never had hearts and fail their own way. *This differs from "the same rule everywhere";
  see the questions below.*
- **A quest battle with "no hearts"** has no lives at all: the fallen stay down and a party all down has lost, as before.
- **The clock running out** used to burn a heart for two more minutes. It now costs three lives (or what is left) for two more minutes;
  with none, the wave is lost.
- **A party fall pays a Hire's gold**, as a burnt heart did, for the run's first two falls only. A single hero rising pays nothing, so the
  run's gold is as it was.
- **"No heart" stars and quests** ask what they always really asked: the whole party never down at once, nor the clock run out
  (`partyFalls`). An army's second star reads "Clear without the whole party falling", the daily's "The whole party never fell", and the
  quests' words were changed to match. Their difficulty is the same event as before, so no reward was retuned.
- **"No hero falling" (flawless) and the tallies**: a hero a life raised fell, though it stands at the end (`Unit.lifeRises`).
- **The road events**: the crown drinks five lives (or what is left; with none it curses the road as before); the refugees give back
  up to five spent lives.
- **A cursed march** has five lives instead of ten.
- **The Chapel's Vigil** gives its gift to each hero a life raises (it was the party a heart raised). "Cleansed" now does nothing more
  than a life's rise already does.
- **The Legend Oath**: each rise a life gives a hero counts a fall, as a heart's burn did. With lives a hero rises far more often than a
  heart burned, so the Oath is harsher than it was.
- **Old saves and a run in progress**: nothing is rewritten. A run's burnt hearts (`run.retries`) are read as five lives each: none burnt
  is ten lives, one is five, both is none (a cursed run's single heart, burnt, is none). They still count as party falls for the stars.
  New runs write `run.lives` (lives spent) and `run.falls`.
- **The balance tools' bot** plays without lives unless `LIVES=1`, as it always played without hearts ("a lost wave ends the try"), so
  every figure in the other notes and every band the tests hold is unchanged.

## The numbers

`node tools/ten-lives/run.mjs tiers|first|daily`: the same saves and seeds played three ways from one build. "No retries" is what the
other balance tools measure; "hearts" is the old rule as the page really played it (the party raised whole in the same fight, twice);
"lives" is the new rule. The player is the army-pace bot (the recruits' five at the level shown, talents, gear, the castle of that level,
Auto casting), one try a fresh save, 24 saves a cell.

TIERS_TABLE

Reading it: the lives clear about as often as the hearts did. They are a little weaker where a party is slowly worn down (the first
army at level 1: 96% to 75%) and a little stronger where a fight is lost by one sudden wipe late on (the late armies' top tiers). Hero
deaths a run are about the same; a cleared run spends from none to nine lives. "Lost the run" is how often a run ends by running out.

**The first hour** (a new save's three starter heroes on the Orc Warband, 40 saves, up to 12 tries):

FIRST_TABLE

`node tools/first-hour/pace.mjs` (which plays without retries) gives 2.2 and 1.8 tries to the first clear as before; with `LIVES=1` it
gives 1.3 and 1.1.

**The daily** (60 dates, a fresh save each):

DAILY_TABLE

## Tests touched, and why

- `test/ten-lives.test.ts`: new. The timer, the safe moment, a taken tile, the all-down rise, the shortfall, running out, a fight with no
  lives, the clock, a healer's revive and a summon, the Vigil, determinism, the run's count, old saves, the gold, each mode, the road
  events, the Oath.
- `test/heart-revive.test.ts`: removed; it tested the rule this replaces, and each of its cases has its match above.
- `test/battle-flow.test.ts`, `daily.test.ts`, `march.test.ts`, `midEvents.test.ts`, `chapel-rooms.test.ts`, `oath.test.ts`,
  `duel.test.ts`, `scene-fixes.test.ts`, `battle-music.test.ts`: the same things asked of lives that were asked of hearts.
- `test/eidolon-chain-4/5/6.test.ts`, `eidolon-trial.test.ts`: their helper's retry loop went (a fall is raised inside the fight now);
  what they assert did not change.
- `test/wave-recap.test.ts`, `quest-complete.test.ts`, `quest-rules.test.ts`, `docs/lines/new-lines.json`: the words.
- `test/fixtures/spells-identity.json`, `test/fixtures/ailment-logs.json`: the `daily` scenario re-recorded (it is the one played with
  the hearts, which are lives now). Every other scenario kept its hash.
- `test/daily.test.ts`, the greedy player's clear rate: the band was 50 to 85%, measured by the bot's old model of the hearts, which
  fought a lost wave again from its start. The page raised the party inside the same fight, and so do the lives: the band is now 90% or
  more, the measured rate (see the daily's table). The daily's foes were not touched.

## Checked

`npm run typecheck`, `npm run web`, the full `npm test` on the pushed commit (figures in the hand-off). `node tools/ten-lives/shots.mjs`
plays a real army run in the built page at 393x852, 360x780 and 412x915 with no page errors: the top bar, a hero down with its countdown,
the hero risen, the party all down and raised, the wave card ("6 lives spent · 4 left"), the last life gone, the wave lost, the recap;
and a revive that falls due as three ultimates fire with their full show (the show plays, the hero rises, the fight goes on).
Screenshots: `docs/samples/ten-lives-{hud,down,risen,all-down,card,deploy,none-left,lost,recap}-{393x852,360x780,412x915}.png`.

The older capture scripts that forced a loss by setting `run.retries` now also empty the fight's lives; a few that waited for
`run.retries === 1` describe the old flow and were left as they are.

## For the owner to decide

1. **Five seconds**: is it the right wait? It is `REVIVE_MS`; half health is `REVIVE_HP`.
2. **The Calamity, the Last Stand and the Assault** have no lives, as they had no hearts. Should any of them?
3. **The second star and the "no heart" quests** now read "without the whole party falling". The other reading is "with N lives or more
   left", which is easier to see in the top bar but would change how hard those stars are.
4. **The clock running out costs three lives.** A heart was half the run's retries; three of ten is kinder.
5. **The crown costs five lives and a cursed march has five** (a heart's worth each). Too dear, now that lives are spent one by one?
6. **The Legend Oath** counts every rise a fall, so it is harsher than before. Should only a party fall count, as a heart's burn did?
7. **The Vigil's "Cleansed"** is now what every rise does. It wants a new gift.
8. **The first army at level 1** is the one place the lives are clearly harder than the hearts (a new save's first try: 78% to 73% and
   95% to 88% by pack; the level-1 recruits' five 96% to 75%). Nothing was retuned.
