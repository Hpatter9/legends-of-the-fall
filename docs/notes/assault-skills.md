# Skills, effects and the heroes' movement in the Assault (ASSAULT-SKILLS, ASSAULT-AI)

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

COUNTERS_TABLE

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

BALANCE_TABLE

## Photographs

`docs/samples/assault-skills/` at 393 x 852, each with a 2x crop of its middle:

PHOTOS

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
