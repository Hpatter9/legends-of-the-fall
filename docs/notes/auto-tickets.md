# Auto runs limited to ten a day (auto tickets)

The owner's ask: unlimited auto-replay was free crowns. Auto-replay (see `auto-play.md`) now spends a ticket per run, and
there are `AUTO_TICKETS` (10) a day, refilled when the phone's date changes (`todayKey()`). Fighting an army by hand, on
x3 or not, is never limited.

- `src/sim/autoReplay.ts`: `AUTO_TICKETS`, `ticketsLeft(m, date)`, `spendTicket(m, date)` (false and nothing spent when
  none are left), `readTickets` (the save check). `startAuto` takes an optional date and refuses a count above the tickets
  left. A new end, `'tickets'`, stops a replay that runs out (only possible if tickets were spent elsewhere meanwhile).
- `Meta.autoTickets?: { day, used }`: optional, so saves from before start the day full.
- `src/main.ts`: `beginAuto` spends the first run's ticket, `autoTick` one as each later run starts; a stopped or lost
  replay keeps the runs not yet begun.
- `src/armiesView.ts`: the Runs counts above what is left are greyed out, the count picked is cut to the largest one left,
  and a line reads "Auto runs left today: n/10 · more at midnight". With none left the button reads "No auto runs left"
  and is disabled (turning Auto off fights by hand as before).
- Tests in `test/autoplay.test.ts`.
