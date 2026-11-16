# Squads that move as one, the river, and foes who come to you (ASSAULT-SQUADS)

The owner, on 0.609: "The assault still doesn't play well. The hero and its troops form a group so they need to travel closely together.
The troops always get stuck before crossing the river. The enemies in the area should be coming to the heroes if they're within
distance." Three fixes, in that order, on `claude/assault-squads`; the rules are in `src/sim/assault/assault.ts` (the squads),
`platoons.ts` (the march formation) and `holdMind.ts` (the foes); the tests are `test/assault-squads.test.ts`.

## Why the troops stuck at the river (the cause)

Read off the tracker's maps of every hold (`tools/assault-ai/track.ts`), not guessed:

1. **The troops steered straight at their formation slots.** A soldier's slot is laid round its hero; when the hero stepped onto a bridge
   or ford, the slots swung out over the water and the soldiers pushed greedily at them, so they piled up on the bank next to the water
   with no step that brought them nearer. They asked for a bounded walk only after `STUCK_MS`, and that walk went to the slot as well,
   which was often in deep water.
2. **The hero did not wait.** It waited at most three seconds for stragglers, and not at all once any foe was in sight, so on every hold
   it was over the river and away while half its troops were still on the near bank (squads strung out 46 to 68% of their time).
3. **The Dragoon's jump.** The hero walked with its own jump (9 for the flier), so it took ledges and banks its Lancers could not climb.
4. **Squads cut through each other at a bridge.** Two or three squads pushed into the same one-tile bridge from both ends of its mouth
   (Bloodtusk's Old Bridge, the Den's), so neither got through.

Every crossing on every hold is reachable for a soldier (checked tile by tile), so no map was wrong.

## What changed

### Squads move as one

- **The squad walks with its weakest member's legs** (`squadJump`, `squadPace`): the hero's walk uses the lowest jump in its squad, and
  out of a fight the hero steps no faster than its slowest troop (never on a charge or a fall back).
- **A straggler is waited for** (`straggling`, `SQUAD_STRAGGLE` = 5 tiles): the hero stops while any troop is more than five tiles away
  and is not itself fighting, for up to `WAIT_MAX` (5 s), and no longer gives up just because a foe is in sight; it walks on only with a
  foe within its reach plus `SQUAD_FIGHT` (2) or a crowd round it.
- **A straggler walks the hero's trail, not across country** (`followTrail`, `TRAIL_MAX` = 40 steps kept, `TRAIL_AHEAD` = 3): a troop
  more than five tiles off finds the nearest tile the hero walked and follows the trail forward, so it goes over the same bridge, ford or
  stair the hero did.
- **The march is drawn in** (`slotAt(..., march)`, `MARCH_CLOSE` = 0.7): out of a fight the formation stands at 70% of its spacing; with
  a foe near, it opens out to its full width (the troops fan out on the old short leash), and falls back in when the fight is done.
- **In a narrow way the troops file** (the old `fileSlot`), and re-form on the far side when the slots open up again.

### The river

- The trail and the squad's jump take the soldiers over the crossing the hero used (causes 1 and 3), and the wait (cause 2) re-forms
  them on the far bank.
- **A turn at a narrow way** (`waitsTurn`, `TURN_MOUTH` = 2, `TURN_NEAR` = 6, `TURN_MAX` = 8 s): a hero at the mouth of a narrow way
  waits while another squad's fighter is in it nearby, so squads go over a bridge one after another instead of jamming it (cause 4).
  The wait is skipped with a foe in reach and gives up after eight seconds.

### Foes come to you

- **The garrison's posts out in the fields** (camps, guards and bands by the road; `zone === 'fields'`) wake to a squad within `AGGRO`
  (14 tiles of their home, up from the old `WAKE` of 8) and charge it, and keep hunting it up to `FIELD_HUNT` (22) from home before they
  go back to their post.
- **A call for help:** a post that wakes wakes the sleeping posts within `CALL` (12) of it, as before.
- **Gate and wall defenders, the keep and the throne keep their old radii** (`aggroOf`, `huntOf`): they hold their posts.
- 14 was tuned on the tracker: at 10 most camps were still walked into; at 18 two or three camps at once poured into the first squad
  on the bigger holds.

## Measured

`node tools/assault-ai/run.mjs` (whole conquests by Auto, the dev trial's "As expected" force, eight seeds a hold), extended with:
**spread** (the mean distance of a squad's troops from their hero), **strung** (the share of time a squad has a troop more than five
tiles off), **sqStuck** (a squad's time with nobody able to step, deliberate waits excluded), **gather** (the time a hero waits for its
squad or its turn), and **cross** (each squad's time from first reaching the river band to its hero and troops all over it, and how many
made it).

| | before (0.609) | after |
|---|---|---|
| Spread (tiles), by hold | 10.1 to 16.0 | 4.4 to 8.4 |
| Strung out | 46 to 68% of the time | 15 to 33% |
| Squads over the river whole | 190 of 360 | 285 of 360 |

Crossing time (seconds, mean of the squads that made it):

| hold | before | after |
|---|---|---|
| orcs | 98 | 63 |
| undead | 88 | 68 |
| beasts | 87 | 99 |
| wildwood | 89 | 81 |
| labyrinth | 74 | 43 |
| ogres | 190 | 198 |
| infernal | 59 | 69 |
| yokai | 61 | 47 |
| golems | 126 | 87 |

Before, "crossing" counted squads that crossed in pieces; after, it is the whole squad, so the slower holds (beasts, infernal) are
squads waiting for their last troops, not troops stuck. **Bonefire Crag (ogres)** is the map's limit: five squads go through a one-tile
gap behind its bridge, one at a time, which is slow by design; its "blocked" share (about 18%) is mostly squads gathered tight and
waiting their turn.

## Balance

With the camps charging, Auto's wins on Try an Assault ("As expected", the balance party) moved a long way from the 72 to 91% they
stood at: the ogres' hold fell to 38%, the orcs' to 50%; the yokai's rose. The holds' shares (`HOLD_SHARE`, `LAST_SHARE`, `RESTORM_SHARE`
in `garrison.ts`) were retuned in three passes: a sweep at 0.7, 0.85 and 1 of the old shares (8 seeds), a logistic fit per storming, then
two passes of smaller steps at 24 and 32 seeds, the last only on the stormings still outside the mark.

The result (32 seeds each; the aim is about 72 to 84%, the Last Hold at the low end):

| hold | hold | Last Hold | Warband regrouped |
|---|---|---|---|
| orcs | 84% | 81% | 81% |
| undead | 69% | 81% | 84% |
| beasts | 94% | 81% | 69% |
| wildwood | 81% | 75% | 72% |
| labyrinth | 72% | 72% | 75% |
| ogres | 50% | 75% | 75% |
| infernal | 78% | 69% | 81% |
| yokai | 84% | 75% | 53% |
| golems | 78% | 81% | 78% |

24 of the 27 within 69 to 84%. At 32 seeds a storming's win rate still swings by about eight points, and near the mark it moved more
with the seeds than with a 5% change of share (the beasts' hold went from 66 to 94% with its share cut 5%; the yokai's Warband from 94
to 53% with its share raised 6%), so the three outside are left where they are rather than chased. **Bonefire Crag's hold (the ogres)**
stays at 50 to 67% whatever its share (from 0.50 down to 0.29 of the old one) with only about a third of the host lost: it is lost to the
map's one-tile gap and the time, not to the garrison's strength; a wider gap there is a map change for the owner to decide.

## Pictures (393 x 852)

`docs/samples/assault-squads/`, Bloodtusk's Old Bridge, the Knight's squad, Auto:

- `1-bridge-crossing.png` (and `-x2`): the Knight and the Samurai on the bridge, their troops filing onto it, the other squads waiting
  their turn on the near bank, close round their heroes.
- `2-far-bank-reform.png`: the Knight's squad over and re-forming on the far bank; the camp beyond is on its way.
- `3-camp-charges.png` (and `-x2`): "A captain sallies at Kenji": the camp has left its fire and charges the squad as it lands.
