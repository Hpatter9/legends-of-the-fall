# Battle sound

Sound for the combat effects listed in `combat-fx.md`. Everything is **synthesised in code** with Web Audio (tones and
filtered noise, as in `sound.md`), so there are no new files: nothing to add to the offline `FILES` list in `build.mjs`
and nothing to credit. The music is unchanged (`town`, `battle`, `boss` tracks); see "Music" below for what is new.

## Where it lives

- `src/render/soundRules.ts` (pure, tested in `test/battle-sound.test.ts`): `cuesFor(battle, event)` says which sounds an
  event calls for (with a delay and a gain), `CUES` is each sound's mixing entry, `Mixer` does the mixing, `weightOf` sorts
  weapons by weight, `intensityOf` rates how tense a fight is.
- `src/render/sound.ts`: the synthesis (`SOUNDS`, one function per sound), the music, `playEvents(battle, events, speed)`.
- Hook: the one call in `src/main.ts`'s fight loop, now `playEvents(b, events, this.speed)`. The sim is untouched and the
  sounds read the same events the effects do.

## Mixing

- **Cooldown per sound** (`gap`, real ms; stretched by half per speed step, so ×2 does not just double the noise).
- **Voice limit**: each sound holds some voices (`weight`) for as long as it rings (`ms`); the limit is 14 at once. Priority 0
  sounds (swings, misses, arrow whooshes) are dropped once the mix is 65% full, priority 1 when full, priority 2 get 50%
  headroom, priority 3 (ultimates, boss skills, meteor, stingers) always play.
- **Random pitch** of up to ±7% per play, applied to every tone and filter, so repeats do not grate.
- **Quieter at ×2**: gain is divided by 1 + 0.4 per extra speed step (about 0.71 at ×2).
- **Mute and volumes**: unchanged. The mute button zeroes the master gain, and a muted page skips the synthesis entirely
  (less CPU). The effects slider still scales the effects bus. Audio only starts on the first pointer-down.
- **CPU**: a sound is a few oscillators or noise bursts that stop themselves; one shared noise buffer.

## The sounds

| Group | Sounds (cue) | Played for |
| --- | --- | --- |
| Swings | `swingLight`, `swingSword`, `swingHeavy`, `swingSpear`, `swingFist` | the `swing` event, by weapon weight (ogre, brute, minotaur, warlord, boar, werewolf, barbarian: heavy; monk: fist; peasant, spearman, yamabushi, cleric: spear; kunoichi, karasu, kitsune, imp, illusionist: light; the rest sword) |
| Hits | `hitLight`, `hitSword`, `hitHeavy` (thud), `hitBone` (clack), `hitFist`, `hitSpear` | a blow landing, by the attacker's weight |
| Crit | `crit` (low boom + bright ring, on top of the hit) | a heavy blow (crit or from height) |
| Block | `block` (a clang) | a blow into a raised guard |
| Miss | `miss` (a soft whiff) | `dodge` |
| Bow | `bow` (twang), `arrowFly` (whoosh), `arrowHit` (thunk) | archer, ranger, orc archer |
| Gun | `gun` (bang), `shell` (tinkle 260 ms later), `bulletHit` (ping) | gunslinger |
| Thrown | `throwBone` (whirring swish), `boneClatter` on landing | skeleton archer's bone (nothing else is thrown; see `combat-fx.md`) |
| Fire | `fireWhoosh`, `fireBoom` | fire orbs and their landing, fire skills, burning ground and burn ticks (quiet) |
| Frost | `frostCrack`, `frostShatter` | the king's Frost Nova (crack, then shatter 160 ms later) |
| Lightning | `crackle`, `thunder` | bolts, Chain Lightning (`arc`), Smite's thunder |
| Holy | `holyChime` | holy skills and shots, Smite, Resurrect |
| Shadow | `shadowHum` | curses, Hex, Fox Charm, gaze, a curse tick |
| Poison | `poisonHiss` | gorgon spit, Poison Cloud |
| Nature | `rustle` | leaves, Call Treant, Pipes of Pan |
| Wind / earth | `windGust`, `earthRumble` | wind skills and Haste; Earthquake and earth skills |
| Meteor | `meteorFall` (a falling whistle) then `fireBoom` + `thunder` when it lands (`ms` after the event) | the Meteor skill and the king's spell |
| Volley | `arrowRain`, then `arrowHit` | Volley |
| Help | `heal` (shimmer), `shieldHum`, `horn` (banner, Rally), `pipes` (Satyr's song) | heals, shields, banners |
| Moves | `dash`, `blink`, `trap` | dash, blink, a trap going off |
| Ultimates | `ultimate` (deep hit, rising chord, rush, cymbal wash) | a Mythic's second skill |
| Bosses | `bossSkill` (low growl) on top of the skill's element | a foe of 400+ health casting |
| Deaths | `deathBones` (clatter), `deathBurn` (a demon's burning roar), `deathThud` (ogre and the big brutes), `deathStone`, `deathBlood`, `deathLight` (a hero's soft chime) | by `deathKind`, the same as the effect; a boss's is louder |
| Stingers | `victory`, `defeat` | the `end` event |
| The page | `tap`, `summon`, `merge`, `star`, `levelUp`, `boom` | as before |

## Music

`battle.ogg` and `boss.ogg` play as before. They now **intensify**: `intensityOf` takes the thinner side's share still
standing; from 75% down to 15% the track plays up to 8% quicker (pitch kept) and a third louder, easing in over about a
second. It resets at the start and end of a fight.

## Checked

`npm run typecheck`, `npm test` (new: `test/battle-sound.test.ts`: cooldown, voice limit and priority, pitch range, ×2 hush and
gap, weapon weights, every cue has a mixing entry over a whole fight, the meteor's fall-then-boom order, the tension curve),
`npm run web`. A test page can set `window.__sfxLog = []` and every sound that plays is pushed on it; four real-time fights in
headless Chromium (393x852) logged, for example, the mixed party against skeletons at ×1: 112 sounds
(`earthRumble shieldHum arrowRain arrowHit windGust gun fireWhoosh meteorFall fireBoom thunder … deathBones …
swingHeavy hitBone swingSword hitHeavy … bow arrowFly block … victory`), and a ×2 fight against ogres: 58 sounds
including `ultimate`, `crit`, `hitFist`, `deathThud`, `deathBurn`. I cannot listen, so the balance of the levels is for the
owner's ears; the levels are the numbers in `SOUNDS` and the `gain` in `CUES`.
