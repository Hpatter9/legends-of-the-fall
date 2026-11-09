# The Assault, phase 3: veterans, the Drill Yard and the Iron Gate duel

Built on phase 2 (`docs/notes/assault-2.md`), on `claude/assault-2`. The director scoped this round to three of the design's phase-3 items
(`docs/design/assault-mode.md` on `claude/assault-design`, sections 4.2, 6.3 and 10): the Elite tricks, the design's "Barracks", and the
Vain captain's duel at the Iron Gate. The warchief's flight, the taunts as heroes approach, the News's conquest lines and the holds' codex
pages are still to come.

## Veterans: every kind's Elite trick (`assault.ts`, `troops.ts`, `battle.ts`)

An Elite (six marks or more) already had its trick half again as strong (`ELITE_TRICK`, x1.5) for seven kinds since phase 1. The other
two now have it as well, and the Skirmishers' flank is sharpened:

- **Gunners**: their shot ignores half again as much armour (3 becomes 4.5; `fieldHooks.pierce`).
- **Battlemages**: their fire lands on the foes beside the target half again as hard (`fieldHooks.splash`, a new field hook read in
  `battle.ts` behind `b.field` only, so no other fight changes).
- **Skirmishers**: their trick is a step round to a foe's side, with no number to raise, so an Elite's blow from a foe's side or back lands
  a fifth harder instead (`TRICKS.flank`). A Recruit's flank is the step alone, as before.

## The Drill Yard (`sim/castle.ts`, `sim/rooms.ts`, `economy.ts`, `castle.ts`)

The design's 6.3 called it "the Barracks", but the castle already has a Barracks (+6% hp for every hero), and saves have bought it. The
director's call (option a): a new building named the **Drill Yard**, with the old Barracks left exactly as it is.

- It is a room building like the Smithy or the Watchtower, with two levels on the room buildings' cost curve (500 and 1,500 crowns) and
  the builders' usual times (one minute, then five).
- Each level opens a room: the **Blooded Drill** (new recruits join Blooded, one mark: +8% health and attack) and the **Veteran Drill**
  (they join as Veterans, three marks: +16%).
- `recruitMarks(castle)` is the one rule. `buyRecruit` (and `fillRanks` through it) enlists at that rank, and a soldier who has earned
  more keeps his marks.
- The muster's host line says so ("the Drill Yard sends them Blooded").
- On the castle page it has its own chamber card. Its painting is a stand-in (the castle's weapon rack) until the picture in
  `docs/notes/assault-3-art-prompts.md` lands.
- A castle saved before it reads exactly as it did: no Drill Yard, recruits as Recruits.

## The Iron Gate duel (`src/sim/assault/gateDuel.ts`, `src/gateDuelView.ts`)

- **The call.** A Council captain with the Vain weakness posted at the Iron Gate calls out a champion as the first of our heroes comes
  within twelve tiles of his post. The challenge is open: the king names the champion on the card (a standard ornate card in the run
  duel's look, the battle held while it is open), or refuses. Left unanswered, it lapses after twenty seconds. Auto names its strongest
  hero at once.
- **The ring.** A 5 x 5 ring is staked out on the open ground before the gate: the nearest level, open spot outside the wall, off the
  board's middle (`ringSpot`).
  - Its border is made solid for the duel (the Orc sheet's stakes are drawn on it), so every walker goes round, by the same tile change
    and sector rebuild that a breach uses.
  - The champion and the captain are set inside, and anyone else standing there is moved out.
  - The battle carries on round it. The two leave the field's buckets and `around`'s cut, so nobody outside sees them, and they see
    only each other.
- **The captain fights as he is.** A run's duel cuts its nemesis (a wave's wall is built for five heroes), but the hold's officers
  already stand at the army's share of a wave foe. As Vain, he takes a tenth more in the ring.
- **The outcomes.** Sixty seconds:
  - **Won** (he falls): his band routs, and every hero of ours heals a fifth.
  - **Lost** (the champion falls): the champion rises at the rally flag as any fallen hero does, and the captain goes back to his post,
    his health as before the ring, by the share he kept.
  - **Time**: as lost, but the champion stands.
  - **Refused**: he is Mocking for the battle (+5% to his blows).
- **The page.**
  - A clock tag shows while it is fought ("Duel · Kwame vs Grashnak · 0:42"), and each turn of it has a toast.
  - The worker's mirror takes the stakes' tiles.
  - The bench stages one with `__benchWorks('duel')`, and shows the card with `__benchWorks('card')`.

**The balance.** Forty heroes as champion against a Vain Orc captain, each fight played out in the ring:

| | won | lost | time |
| --- | --- | --- | --- |
| level 55 | 26 | 10 | 4 |
| level 75 | 30 | 7 | 3 |

That is about two in three at 55 and three in four at 75, inside the run duels' band. A captain at a share was measured too (35% health
and 55% attack: 39 of 40 won, so no contest), as were harder blows (x1.2 or x1.4: 45% to 70% won).

## Tests

- `assault-elite`: the pierce and the splash at x1.5 for an Elite, and as before for a Recruit; an Elite skirmisher's back blow x1.2.
- `assault-drill`: two levels, built like a room building; recruits by level; the old Barracks untouched; an older castle reads as it
  did.
- `assault-duel`:
  - the call, Vain only;
  - the ring off the middle, before the gate: the two in it, nobody else, its stakes solid, the two out of the buckets;
  - a duel fought to its end with no outsider's blow on the two, and the stakes down after;
  - won, timed out, refused or lapsed, and Auto.

## Screenshots

`docs/samples/assault-3/`:

- the duel in its ring (393);
- the challenge card (360, 393, 412);
- the Drill Yard's card (360, 393, 412);
- the muster's host line (393).
