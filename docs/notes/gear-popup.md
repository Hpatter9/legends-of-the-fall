# GEAR-POPUP — a plate over a hero whose gear changed

The owner: "When equipping new gear on a hero, show a popup that fades after presenting its info. It will show what their stats went up to
and what their new power level is."

## What shows

A small plate in the HERO-RISE plates' dress (dark wood in a brass rim, `docs/notes/hero-rise.md`), for each hero a change of gear touched:

- the hero's name;
- each number that changed, old → new with its change: green with ▲ when it rose, red with ▼ when it fell, so a worse piece says so
  ("HP 1,705 → 1,577 ▼128", "Dodge 0% → 3.4% ▲3.4%"); health, attack, armour, crit, dodge, attack and move speed, range, regen, charge and
  resist, only those that moved;
- the Power, old → new with its change, in gold ("Power 3,702 → 3,606 ▼96").

When several heroes change at once (Equip all heroes, Equip best taking from others, the run's Equip best), each plate is short: the changes on
one line ("HP ▲175, ATK ▲2, Range ▲2") and the Power line. The plates are laid with `layPlates` so none covers another; one with no room
left is not queued: the last plate shown says "and N more heroes changed".

It comes in, holds about 1.8 s and fades (2.3 s in all); with reduced motion it only fades. **Any tap anywhere takes every plate away**, and
the tap still does what it does (the plates take no taps; the dismissal listens on the way down), so equipping several pieces quickly never
waits: each change replaces the last plate with its own.

## Where

| Change | Where | The plate stands |
| --- | --- | --- |
| Equip, Swap (a piece another hero wore changes that hero too), Unequip | the hero page's Equipment tab (`equipView.ts`) | over the top of the gear panel, clear of the slots' pieces and the buttons below |
| Equip best (this hero, or every hero when taking from others), Equip all heroes | the same | the same, one plate a hero touched, laid one under another |
| Repair, Patch | the same (a slot's picker) | the same |
| Repair, Repair all, Patch, Reforge, a glyph, Clear | Hester's stall (`stallView.ts`), for a piece a hero wears | over that hero's row |
| Equip best, a run's piece put on or taken off, a find put on or taken off | the run's gear between waves (`events.ts`) | over the hero's picture in the hero row |

A run's hero is read from the boost the run fights it with (the page's `boostFor`: its run gear, finds and lasting kit), so its Power is the
run's; a hero of the save is read as its card reads it. **Not covered:** combining spares (it never uses a worn piece, so no hero changes),
runes (a rune run's tray and the rune bench are their own system), and a guest (it fights in its own kit).

## How

- `src/gearRules.ts` (pure, tested): `heroGearShot(meta, kind)` reads a hero with the same boost `kindPower` and `heroFigures` use (its
  rank, level and `heroStats`: equipment, talents, runes and the Hall), `shotOfBoost(kind, boost)` reads one from any boost (a run's);
  `gearDiff(before, after)` gives the lines (a number counts as changed only when its written value moved), `gearWords` the lines in words,
  `touched` the heroes a change touches.
- `src/gearPlates.ts`: `watchGear(kinds, shot)` takes the heroes before a change; its `show(at)` puts up the plates after it, two frames on,
  where the redrawn screen says each hero is. `clearGear` takes them away. Styled in `fightHud.css` (`.gpPlate`).
- Nothing new in the sim: the plates read the save and the run, never write.
- Tests: `test/gear-popup.test.ts` (only changed numbers, the signs, the Power's change, an unequip all ▼, a mix of up and down, the read
  matching the card's own numbers, the save untouched).
- Photographs: `tools/gear-popup/shots.mjs` writes `docs/samples/gear-popup-{equip,swap,all}-{393,360,412}.png` (an equip with a gain, a
  swap with ups and downs, Equip all heroes) and checks that no plate overlaps another, covers what was tapped or leaves the screen, and that
  a tap clears them.
