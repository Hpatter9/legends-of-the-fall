# Skills, effects and the heroes' movement in the Assault (ASSAULT-SKILLS, ASSAULT-AI)

**Withdrawn before release (RELEASE-TRIM, [release-trim.md](release-trim.md)):** the Assault and everything here that only it used are gone from the game; this note is kept as the record of what was built. The nine hold sheets (`src/art/assault/`) stay, as every battlefield's floor and set pieces.

Two asks from the owner, on one branch (`claude/assault-skills`):

- "skills and effects should be used and visible in the assaults";
- "the assaults don't seem to have good AI in them. my guys were pretty dumb": the heroes bunched up and got stuck.

Both turned on the same code: the field's `lead` hook (`src/sim/assault/assault.ts`), which runs a hero's orders before its own mind.

## The audit (before)

Measured by playing whole assaults (the dev trial's "As expected" force, the balance party, Auto) and tallying the battle's events, and by
reading the field's code paths.

- **The sim.** The heroes kept their whole minds: their kits fired (6 to 122 skills a battle each, with heals, dashes, blinks, areas, auras,
  marks and revives), their pools ticked, and Auto fired their ultimates (3 to 17 each a battle). But the `lead` hook acted before the
  hero's mind whenever it was marching, holding with no foe in reach, battering a gate or falling back, and returned before `tryCast`. A
  hero sat on a full ultimate for up to 60% of its time alive (the Archer: 413 s of 677 s). Auto never cast the king's spells in an
  assault, though an ordinary fight's Auto does (AUTO-CAST).
- **The renderer.** `fieldView.ts` drew a fighter's idle, walk, attack, hurt and dead frames, a hit spark and a flying arrow (from a fixed
  offset), at Near only. A casting hero stood idle. Nothing else showed: no skill, ultimate, heal, aura, dash, area or king's spell.

## What changed

### The sim

- **A hero casts from its own kit before its orders walk it on** (`lead`, `castsFirst`): a skill, a heal, a guard or its ultimate, each
  only with something to do within its sight, through the same `tryCast` as any fight. Never on a fall back, a flank's run round, or with
  a powder keg in its platoon's arms.
- **Auto casts the king's spells** (`AssaultInput.spells`, `autoSpellsOf`): the save's equipped spells, when it lets Auto cast them
  (`spellAutoSaved`), while the platoons are on Auto, through the ordinary fight's `autoCast`. With Auto off, none. The ultimates were and
  stay automatic in an assault (the page's gem also fires one by hand).
- Deterministic: no new randomness; the replay and determinism tests pass.

### The heroes' movement (ASSAULT-AI)

The tracker, `node tools/assault-ai/run.mjs`, plays every hold's conquest and looks at each hero each tick:

- STILL: standing with a foe within six tiles but none in its reach;
- BLOCKED: standing with three or more of its own round it and no foe in reach;
- LOOPING: twelve steps or more in six seconds, ending within two tiles of where it was;
- QUEUE: our fighters standing near a gate's front or the middle of an approach's way with no foe in reach;
- NEVER: heroes that never struck, cast or were struck.

(The first cut counted a hero between two blows as standing still: an attack's recovery runs past its swing. STILL and BLOCKED count only
heroes not fighting anyone.)

Where the heroes stood, by the reason the code gave for the wait (temporary counters, since removed):

- at their order point with foes just beyond their reach and leash;
- waiting up to three seconds for their soldiers to catch up, even with foes close, or in a press where the soldiers could not reach them;
- their walk failing in a crowd: the field's walk treated every friend's tile as a wall, but for the hero's own soldiers;
- the battle's own "close in on the nearest" walk, which on the field simply waited behind a friend (the ordinary fight's place-swap is
  off on the field).

The rules, each with a staged test in `test/assault-ai.test.ts`:

- **Flow round friends.** A leader's bounded walk (`walkNear`'s new `extra` cost) walks through its own side at a price (`FRIEND_COST`, 3):
  round a crowd where it can, through it where it cannot. A friend there makes way (they change places, `makesWay`): a soldier of any
  platoon, or an idle hero; never one mid-step, swinging or casting, nor the ram.
- **Re-path and break the jam.** A walk that finds no step drops its kept path and searches afresh; after two in a row (`JAM_FAILS`) the
  leader side-steps to the free tile nearest its mark, even one no nearer (`sideStep`); and with a foe close by (its reach and
  `HAND_OVER`, 2) it lets its own mind take the moment instead of waiting on a shut way.
- **Spread round a target.** The battle's "close in" fallback goes by the field's own walk (`FieldHooks.closeIn`), round and through
  friends, so a hero finds another free tile to strike from instead of waiting behind the one in its way.
- **Squeeze through in order.** A platoon keeps its leader's last twelve tiles (`noteTrail`). In a narrow way (fewer than `NARROW_UNDER`,
  14, of the 24 tiles round can be stood on: a bridge, a gap, a gate's mouth) its soldiers walk in file on that trail (`fileSlot`), each
  as far back as its slot, instead of reaching for formation places in the water. At the Howling Den's rope bridge the mean of ours
  standing idle there fell from 36 to 9 in one fight, and the fight took 2:16 in place of 5:57.
- **No waiting for stragglers when it matters** (`waitsForStragglers`): not with a foe within 12 (`STRAGGLE_FOE`), nor with three or more of
  its own pressing round it.
- **Melee heroes take on a foe a little further off; shooters hold back** (`pointReach`): at its point a melee hero engages a foe two tiles
  beyond its reach and leash; a shooter only what it can nearly shoot, and a shooter never pushes in onto a tile beside a foe.

**The counters** (`node tools/assault-ai/run.mjs --seeds 8`, every hold's conquest, "As expected", Auto; main 0.603.0 against this branch with
its casting and movement, both at the 0.602.0 shares; STILL, BLOCKED and LOOPING are shares of the heroes' time alive, QUEUE the mean
standing near a chokepoint, NEVER of 40 heroes a hold):

| Hold | Still: main → now | Blocked | Looping | Queue | Never |
| --- | --- | --- | --- | --- | --- |
| Bloodtusk Hold | 10.4% → 6.1% | 5.0% → 1.1% | 0.6% → 0.9% | 2.2 → 3.8 | 0 → 0 |
| Barrow Necropolis | 7.5% → 5.5% | 5.9% → 2.3% | 0.2% → 0.3% | 2.9 → 2.9 | 0 → 0 |
| Howling Den | 12.0% → 6.5% | 11.3% → 5.1% | 0.2% → 0.3% | 5.3 → 7.6 | 0 → 0 |
| Elder Root | 9.7% → 8.2% | 6.4% → 5.7% | 0.4% → 0.2% | 4.3 → 8.3 | 0 → 1 |
| Heart of the Maze | 6.9% → 4.5% | 6.3% → 1.9% | 0.1% → 0.4% | 1.3 → 1.9 | 0 → 0 |
| Bonefire Crag | 9.4% → 7.2% | 7.6% → 9.4% | 0.3% → 0.5% | 4.3 → 8.0 | 0 → 0 |
| Brimstone Gate | 5.1% → 7.4% | 9.0% → 4.0% | 0.2% → 0.2% | 3.6 → 6.4 | 0 → 0 |
| Moonlit Shrine | 10.1% → 4.5% | 4.5% → 1.6% | 0.2% → 0.6% | 0.8 → 2.2 | 0 → 0 |
| Iron Foundry | 11.0% → 8.2% | 9.6% → 7.1% | 0.1% → 0.1% | 3.8 → 6.6 | 0 → 0 |
| All | 9.6% → 6.6% | 7.6% → 4.5% | 0.3% → 0.4% | 3.2 → 5.4 | 0 → 1 of 360 |

Standing still with foes near falls by about a third, and standing boxed in by our own by about two fifths, though not at every hold:
Brimstone Gate's STILL rose (5.1% → 7.4%) as its BLOCKED fell. Looping was rare and stays
so. The QUEUE goes up: part of it is the file now waiting its turn at a bridge or a gap (switching the file off makes BLOCKED nearly double,
9.3%, the Den 19%, with 5 heroes never fighting), and part is that more of the host reaches the chokepoints sooner and together; the
battles are quicker for it (Bloodtusk 6:29 → 4:29, the Den 5:18 → 2:53). Bonefire Crag's BLOCKED did not come down, and one Elder Root hero
in 40 never fought. One hold's chokepoint, the Den's rope bridge, in one fight: the mean of ours standing there 36 → 9, and the fight 5:57 →
2:16.

### The renderer

`src/render/fieldFx.ts`, with its rules in `fieldFxRules.ts`, draws the frame's skills, ultimates, heals, revives, auras, dashes, areas and
king's spells with the ordinary fight's own effects:

- the particle pool (`particles.ts`);
- the wind-ups and element bursts (`combatFx.ts`, the pack sheets);
- each skill's own painting (`abilityArt.ts`);
- the Blender clips (`vfxArt.ts`).

On the field:

- **The cast pose.** A casting fighter gathers itself on its attack row's first frames, rising a little, and strikes as the skill goes off
  (`castPose`, the ordinary fight's `unitView.ts` rule).
- **Shots leave from the emit points** (the bow hand, the staff's tip: `emitRules.ts`).
- **An ultimate.** Its element's wind-up round the caster, then its painting, a nova and a ring. Its name rises over the caster (one label a
  caster, three at most).
- **The camera's glance.** The camera glances at an ultimate of ours when the player's hands have been still a while and no platoon is
  followed (`glanceAt`; never with reduced motion; once in five seconds at most).
- **Levels of detail and caps** (`FIELD_FX`). Near shows effects whole, Mid a simpler version (one burst, no wind-up), Far none. At most 10
  effects begin a frame at Near and 4 at Mid, the heaviest first (an ultimate, a king's spell, a hero's skill, a heal), then the nearest
  the screen's middle. At most 120 bits are alive at Near and 40 at Mid.
- **Reduced motion** keeps the effects steady (the pool's `calm`).

**The cost** (`node tools/assault-skills/bench.mjs`): the Assault bench at 393 x 852 with the CPU slowed four times, the fight under way;
`&fx=0` draws no effects, `&fxstress=1` fires every hero's ultimate and a heal every frame, so the effects stand at their caps throughout.

| | Near work ms / frame (mean) | Mid work ms / frame |
| --- | --- | --- |
| no effects (`fx=0`) | 22.5 to 23.8 | 24.2 to 27.2 |
| as they come | 22.1 to 24.4 | 23.0 to 24.8 |
| at their caps (`fxstress`) | 26.8 (139 to 155 bits alive) | 30.1 (about 20 bits) |

In play the effects cost nothing measurable; at their caps, about 3 ms a frame at Near and 5 at Mid. (The bench's own page throws
"Cannot read properties of null (reading 'set')" when a fight ends and it starts the next: one frame draws the view it has just destroyed.
It is on main too and touches only the bench page.)

## The balance

Skills cast on the march, the king's spells on Auto, and the heroes no longer standing in jams made every hold easy again: at the 0.602.0
shares, every conquest measured was won every time. The shares (`HOLD_SHARE`, `LAST_SHARE`, `RESTORM_SHARE` in `garrison.ts`) are set again
with the dev trial's force (`node tools/assault-dev/run.mjs`, "As expected", the balance party, Auto), back to the 0.602.0 band of about
72 to 84% wins, the Last Hold at the low end of it.

**After** (32 seeds a cell, the final shares; the 0.602.0 table, for the force before these changes, is in `assault-retune.md`):

| Hold | Conquest | The Last Hold | Regrouped |
| --- | --- | --- | --- |
| Bloodtusk Hold | 78%, 78% host lost | 66%, 78% | 84%, 74% |
| Barrow Necropolis | 88%, 80% | 66%, 86% | 88%, 77% |
| Howling Den | 84%, 81% | 66%, 78% | 81%, 75% |
| Elder Root | 91%, 70% | 66%, 68% | 75%, 75% |
| Heart of the Maze | 88%, 89% | 72%, 83% | 81%, 83% |
| Bonefire Crag | 81%, 68% | 69%, 63% | 84%, 65% |
| Brimstone Gate | 72%, 81% | 66%, 81% | 84%, 82% |
| Moonlit Shrine | 88%, 84% | 69%, 85% | 81%, 88% |
| Iron Foundry | 84%, 65% | 72%, 77% | 84%, 70% |

The Last Hold is now the hardest at every hold (66 to 72%). The conquests run 72 to 91% and the Warband regrouped 75 to 88%. Over the
band: the Elder Root's conquest (91%) and five cells at 88% (the Necropolis and Maze conquests, the Necropolis regrouped, the Shrine's
conquest, and the Shrine regrouped at 88% host lost). The table moved 10 to 20 points between runs of the same values at these seeds, and
the Elder Root's conquest stayed at 91% through a nudge, so I stopped there. The battles are longer than at 0.602.0 (5 to 9 minutes of
battle time, from 3 to 9): the shares rose 1.4 to 2 times, so there is more garrison to cut through.

| Hold | `HOLD_SHARE` 0.602.0 → now | `LAST_SHARE` | `RESTORM_SHARE` |
| --- | --- | --- | --- |
| Bloodtusk Hold | 0.248 → 0.4811 | 2.63 → 1.976 | 2.188 → 1.675 |
| Barrow Necropolis | 0.2598 → 0.4442 | 2.097 → 1.705 | 1.872 → 1.578 |
| Howling Den | 0.322 → 0.4969 | 1.984 → 1.864 | 1.522 → 1.463 |
| Elder Root | 0.1995 → 0.3883 | 1.922 → 1.777 | 1.668 → 1.465 |
| Heart of the Maze | 0.2062 → 0.4289 | 1.553 → 1.237 | 0.909 → 0.743 |
| Bonefire Crag | 0.285 → 0.5039 | 1.836 → 1.35 | 1.015 → 0.896 |
| Brimstone Gate | 0.27 → 0.4771 | 1.33 → 1.057 | 0.873 → 0.675 |
| Moonlit Shrine | 0.168 → 0.2667 | 1.16 → 1.027 | 0.958 → 0.995 |
| Iron Foundry | 0.31 → 0.4352 | 0.919 → 0.852 | 1.056 → 0.93 |

## Photographs

`docs/samples/assault-skills/` at 393 x 852, each with a 2x crop of its middle:

- `skills-before`: main, the Wizard's platoon marching into the fight: no effect of any kind;
- `skills-after-ultimate`: the Wizard's Meteor Swarm winding up (the fire ring and glow round it, the caster rising), its name over it;
- `skills-after-strike`: the moment after, the meteors' impacts landing up the field;
- `skills-after-gem`: an ultimate fired by hand from the portrait's gem;
- `choke-before-1`, `-2` and `choke-after-1`, `-2`: the Howling Den's rope bridge at the same moments of the march (about 0:15 and 0:21
  of the battle's clock). On main the host bunches on the near bank at the bridge's foot and is still bunched six seconds on; now the
  platoons file over it, the Wizard's ultimate going off as it crosses, and are up on the far bank by the second photograph.

## Files

- `src/sim/assault/assault.ts`: `castsFirst`, the movement rules (`FRIEND_COST`, `JAM_FAILS`, `sideStep`, `makesWay`, `pointReach`,
  `waitsForStragglers`, `noteTrail`, `narrowAt`, `fileSlot`, the `closeIn` hook); `platoons.ts`: `autoSpellsOf`; `assaultMode.ts`: the input's
  spells; `field.ts`: `fails`; `holdTypes.ts`: `spells`, `trail`; `garrison.ts`: the shares; `src/sim/path.ts`: `walkNear`'s `extra`;
  `src/sim/battle.ts`: `FieldHooks.closeIn`.
- `src/render/fieldFx.ts`, `fieldFxRules.ts`; `fieldView.ts` (the effects, the cast pose, the emit points); `assaultScene.ts` (the events, the
  glance); `assaultBench.ts` (`&fx=0`, `&fxstress=1`).
- Tests: `test/assault-skills.test.ts`, `test/assault-skills-fx.test.ts`, `test/assault-ai.test.ts`; `assault-works` reads the hold's own
  share (since ASSAULT-RETUNE no longer the default).
- Tools: `tools/assault-ai/run.mjs` (the tracker), `tools/assault-ai/choke.mjs` (the chokepoint's photographs),
  `tools/assault-skills/bench.mjs` (the cost), `tools/assault-skills/shots.mjs` (the battle's photographs).
