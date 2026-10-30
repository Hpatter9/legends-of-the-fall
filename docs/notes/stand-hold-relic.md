# Holding the line pays a relic (STAND-HOLD-RELIC)

Two owner decisions on the Last Stand's retreat (`docs/notes/stand-retreat.md`). Branch `claude/stand-hold-relic`.

## A relic for holding

- Holding one more wave at an act's end (`holdTheLine`) used to pay `holdGold(n)` only. Won, it now also gives the run one relic, free.
- `holdRelic(run, n)` (`src/sim/stand.ts`): one of `ALL_RELIC_IDS` the run does not own (the same pool as the break's offers; never a
  legendary), drawn from its own side stream `mixSeed(seed, 0x401e, n)` (the hold wave's spec is `0x401d`, the offers `0x57a7`), so no other
  draw changes. It is drawn when the bonus wave is cleared, from the relics owned then (one bought during the wave is never given twice).
- Every relic owned: no relic, and the purse is doubled instead (`holdPurse(run, n)`: `{ gold, relic }`).
- The relic is applied as a bought one is: `buyRelic` and `clearHold` share `takeRelic` (the team bonus, hp and attack rising at once by the
  difference, mana, traits). If the break's offer (drawn as the act's last wave was cleared) holds the same relic, it is taken off the offer.
- Lost holds (the king falls) and falling back pay no relic.
- `StandRun.heldRelics` (optional) lists the relics holding paid; `StandSummary.heldRelics` (optional) counts them. `loadStand` drops junk in
  the field; saves from before have none and load as ever.

## Shown

- The choice card: "Hold it for +64 gold and a relic, then fall back." (`purseLine`: "+128 gold" when every relic is owned).
- The `choice` note carries `relic`; the `held` note carries the relic's id. The held plate reads "+64 GOLD AND A RELIC · THE LINE HELD", and
  a plate under the banner (`.stGain`, `GAIN_MS` 4.2 s, in the choice card's colours) shows the relic's icon (`relicIcon`, the existing art),
  "A RELIC FOR HOLDING", its name and what it does. It stays while the retreat banner and walk play; it rises in and fades (no animation with
  reduced motion; it is simply there, then gone).
- The end card has a Relics row: "5 (2 for holding the line)".

## The camp's line for a Last Stand run

- The camp's Continue button resumes the ordinary run only; a Last Stand run left mid-way is continued from the Last Stand's plate, whose
  line was "Wave 6 · continue". It now names the room: "Wave 6 · Library · continue", "Wave 18 · Throne Room · continue"
  (`standContinueLine(run)`, pure, `ROOM_NAMES[..].short` of `hallNow(run)`; the `slotInfo` hook in `main.ts` adds " · continue" as the other
  modes' plates do: "Floor 7 · continue", "Map 1/6 · continue").
- A run saved at the choice after wave 5 reads "Wave 6 · Courtyard": the room it is still in.

## Balance

Measured with `npm run stand-balance -- --levels 1,10,20,30,60,100 --attempts 30 --hold`, before and after; the table is in
`docs/notes/stand-retreat.md` (Balance). The relic moves the means by 0.6 waves or less, within noise: holding is still not worth it for
mid parties (levels 20 to 60 lose about a wave on average against falling back at once), and remains a strong party's bet. Prices, the
offers and the waves are unchanged.

## Checks

- `test/stand-retreat.test.ts`: a won hold pays the side stream's relic (owned, counted in `heldRelics` and the summary, off the offer,
  working as a bought one), the same twice; none for a lost hold or a fall back; every relic owned pays twice the gold; the choice note; an
  old save without the field loads and is paid; the camp line for each room.
- `tools/stand/hold-relic-shots.mjs [port]`: the choice card at 393x852, 360x780 and 412x915, the relic announced as the hold is won, and the
  camp's Last Stand plate after leaving mid-run. `docs/samples/stand-hold-relic-*.png`.
