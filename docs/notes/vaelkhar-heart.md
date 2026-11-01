# Vaelkhar's Heart, given back for a gift

The owner's answer on the Storied relic "Vaelkhar's Heart" ("He would like it back"): **"Give it back for a gift."** Built on the end of
[eidolon-chain-6.md](eidolon-chain-6.md); rules in `src/sim/vaelkharHeart.ts`, test `test/vaelkhar-heart.test.ts`.

## What counts as holding it

Relics live only in runs (`run.relics`); the save never kept them. So the save now remembers one fact, `Meta.eidolons.heart`
(`'held'` or `'returned'`, read and kept by `readEidolons`, junk dropped; saves from before have none):

- **'held'** is noted when the player has ever held the Heart: from every settled fight (`settleRun` reads the run's relics), and, at the
  moment Vaelkhar is bound, from the runs saved in the page's slots (`legends.run`, `.tower`, `.calamity`, `.questRun`), so a run still going,
  never settled, counts too. I chose "has ever held it" over "holds it now" because a relic is gone when its run ends, and a player who found the
  Heart last week should not be punished for a run that ended since.
- **'returned'** is set by `bindChain` when Vaelkhar is bound with it held. Once; a return is never undone.

## The binding

With the Heart held, the page plays his binding with two extra beats before the seal (`withHeart`): Vaelkhar, dry and gracious, takes it back
("A heart is no use in a drawer. Keep the use of it until your run is out, and take this in its place. A dragon pays his debts."), and a line
tells the gift. The Heart itself is not removed from a run: a relic is a loan for the length of a run, and he lets the run keep it to its end.
A save that never held it sees his binding exactly as before.

## The gift (modest, and the horn's)

When Vaelkhar answers the War Horn, his drain gives **30%** of the damage the heroes deal back as health, not 25% (`DRAIN_GIFT` 0.05, passed to
the fight as `armEidolon(..., { drainBonus })` from `eidolonCall.ts`, read by `tickEidolon`). Nothing else in the fight changes, and a save without
the gift fights as it did. The Eidolon's card still says 25% (its base); the gift is told in the binding.

## Checks

`test/vaelkhar-heart.test.ts` (4): the Heart noted from a settled run and from a saved slot (a slot that will not read is skipped, once only);
the binding with it returns it and the gift is the horn's, once, while a save without it is unchanged; the gift in a fight (a hero who dealt 400
heals 120 rather than 100); and the save. `typecheck`, `eidolon*` and `vaelkhar-heart` tests, the full `npm test`, `npm run web`.

## Left open

- The Eidolon's card (Pact Gallery) still reads 25%; a line there once the gift is given would need the card to know the save.
- A Calamity run is the only place the Heart is found (the Eidolons' and Storied relics come from the tower's altar and the Calamity); if the
  Heart ever drops to the keep itself, `noteHeart` is the one place to call.
