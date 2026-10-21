# The party

The party is the deck: before a run the player picks the hero kinds its summons draw from. It is saved in the meta
(`party`, `src/sim/meta.ts`) and a run's pool is set from it (`run.pool`), so the summons and the run's two starting
heroes come only from the party.

- **Rules** (`meta.ts`): `PARTY_SIZE` is five, or fewer while fewer heroes are unlocked (`partySlots`). `setParty`
  takes exactly that many different unlocked kinds, or changes nothing. A new meta takes the first five; a save from
  before parties gets the first five unlocked; a saved party keeps only unlocked kinds, once each, at most five.
- **Runs** (`run.ts`, `modes.ts`): `newRun` takes the party as its pool. The ordinary run and the endless tower draw
  from the party. The daily challenge keeps its fixed five.
- **The screen** (`src/party.ts`, markup and a CSS block in `index.html`): five slots at the top (tap one to take its
  hero out), the traits the party would wake (`countTraits`, the same rule as a fight's team), a scrollable grid of the
  unlocked heroes (tap to add or take out), then the locked heroes shaded at the end. A long press, or the small i,
  opens the hero's sheet (role, skill, passive; `drawHeroSheet` from `menuHeroes.ts`).
- **Where it opens**: Battle! / New run (before a run starts) opens it in start mode, and Start run begins the run. The
  Battle page's Party button opens it in edit mode (Done saves; a run going on draws from the new party from then on).
  Back throws the draft away. Start and Done stay disabled until the party is full.
- Changing the party does not change a run's roster: the heroes already owned stay; only the summons from now on draw
  from the new party.

Tests: `test/party.test.ts` (saved, summons only from the party, defaults, old saves), and the tower test in
`test/modes.test.ts` now draws from the party.
