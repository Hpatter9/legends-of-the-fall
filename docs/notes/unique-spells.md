# Unique spells

The owner's ask: "No characters should use the same animations for spells. It should all look unique." Every hero's skill and
ultimate now has a look of its own, and so does each foe's; a tier skill's ring is its hero skill's look again.

## What was wrong (the audit)

Before, `skillFx.ts` gave each skill a `cast` and a `hit` sheet from 22 shared Pixel Effects strips, often with only a tint to
tell them apart (`darkCircle` in five colours; `earthWave` for the Minotaur, the Juggernaut, the Ogre and the Golem). The wind-up
and the closing ring came from the skill's *element* alone (`windUp`, `ringOut`, the ultimate's nova), so two fire skills or two
dark ultimates were the same picture. In the table below 82 of the 90 hero skills and ultimates shared a cast sheet with another;
the rest had no cast sheet at all.

Sound was already one cue per element (`soundRules.ts`); it is untouched (another worker owns the audio).

## What it is now

- `src/render/signatures.ts` (pure data, no Pixi): `SIGNATURES[skillName]` is `{ wind, cast, hit }`, each a short list of
  steps. A step is a *shape*, a *strip*, a size, a count, a tint and a delay. The first `cast` step is the skill's **lead**.
- `src/render/signatureFx.ts`: plays the steps through the pooled `Particles` (capped, thinned by the battery saver, one
  sprite from the pool per bit, nothing new per frame). It is told where the caster, the foes nearest it and its friends are
  drawn, and which way the nearest foe lies, so a beam goes at the foe, rain falls on the foes, a heal falls on the allies.
- `fx.ts` uses it where a skill has a signature (the old `SKILL_FX` and the element's wind-up stay as the fallback for any
  skill without one). Ultimates keep their dimming, camera push, one-shot flash (0.35 alpha, 110 ms), freeze frame and slow
  motion; only the shared nova, wave and pillar are gone, replaced by the hero's own finale, drawn 1.45x the size of a skill.
- Shapes (25): ring, ripple, pillar, pillars, drop, rain, meteor, beam, orbit, spiral, spray, slashX, sweep, cleave, spikes,
  fan, cone, dome, inward, draw, chain, dash, barrier, flare, barrage (and `pop`, a hit on the body).
- Strips: the atlas's 225 Pixel Effects strips (every element in every family: slash, spikes, vortex, pillar, strike, cross...)
  and the Kitsune's hearts, the arrow sprite, and **twelve new props generated with PixelLab** (`src/art/fx/props.png`: a crow
  feather, a gold coin, a music note, a bandage, a fist, a ghost, an anchor, a cannonball, a leaf, a paw, a scythe, a banner;
  credited in `CREDITS.md`, made by `tools/fxlab/genprops.py`). They are thrown by the skills that fit them (Feather Storm,
  Contract Killer, Pipes of Pan, Binding Wraps, Harvest of Souls, Reap, Keelhaul, Broadside, Hunt of the Pack, War Banner,
  Thousand Fists, Heart of the Grove, Dirge, Bounty Hunt, Call of the Wild).
- No sheet from the other packs was copied: the Pixel Effects atlas already has every shape wanted, and the props covered what
  it has not.

### Hero casting

A sheet with a cast row plays it (`attack2`, `defend`); the table in the code's kits already did, bar three that did not:
the **Kraken Mate** (Undertow, Maelstrom), the **Juggernaut** (Earthquake) and the **Oni King** (Kanabo Smash) had a second
row and played the plain attack; they play it now. The other sheets have no cast row, so a cast on those now gathers itself on
the first frames of the swing, rises three pixels, and strikes the rest as the skill goes off (`unitView.ts`), rather than
playing the same swing as a blow.

### Tier skills

`tierRing(skillName, reach, tier3)` replays the hero skill's *lead* (its shape, strip and tint) at the tier's reach; tier 3
adds a second, smaller one a beat later. So a tier skill belongs to its hero's family, and since the leads are unique across
heroes, no two heroes share a tier ring either. Foes with no signature keep the element's wave.

### The rule, and the test

`test/signatures.test.ts`: every hero and foe skill has a signature; every strip it names exists; **no two heroes lead with the
same strip**; no two heroes' casts share a layer (same shape, strip and colour); no foe leads with a hero's strip or copies a
hero's cast; a skill and its ultimate lead differently, the ultimate with at least as many layers; a tier ring is its skill's
lead; sizes and counts are sane; the props picture is as wide as its names.

## Seeing it

`node tools/fxlab/unique.mjs [hero,hero | all]` (after `npm run web`) plays every hero's skill and then its ultimate on the real
page at 393x852 and saves eight frames of each, `docs/samples/unique-spells/<hero>-skill.png` and `<hero>-ult.png` (and a
`.peak.png` of the biggest frame). `python3 -I tools/fxlab/contact.py` lays the peaks of all of them side by side:
`contact-skills.png` and `contact-ults.png`, so no two can hide as alike. `tools/fxlab/audit.ts` writes the audit table below.

## Before / after audit

| Hero | Spell | Before (cast / hit) | Shared before? | After (cast layers: shape:strip tint) |
|---|---|---|---|---|
| Knight | skill: Shield Wall | earthShield / — | **same as** Last Bastion | barrier:earth-shield + ring:earth-wave |
| Knight | ultimate: Last Bastion | earthShield / — | **same as** Shield Wall | pillars:earth-pillar #ffd27a + ripple:earth-wave #ffd27a + flare:earth-nova |
| Samurai | skill: Iaido | moonSlash / moonSlash | **same as** Heaven-Splitting Cut | slashX:moon-slash + dash:wind-puff |
| Samurai | ultimate: Heaven-Splitting Cut | moonSlash / moonSlash | **same as** Iaido | cleave:light-slash #dff4ff + ripple:light-wave + flare:light-nova |
| Kunoichi | skill: Shadow Step | darkCircle #b08af0 / darkSlash | **same as** Shadow Dance | dash:dark-smoke + pop:dark-puff |
| Kunoichi | ultimate: Shadow Dance | darkCircle #b08af0 / darkSlash | **same as** Shadow Step | orbit:dark-slash + sweep:dark-wave + ring:dark-circle |
| Archer | skill: Volley | — / windBurst | no cast sheet (a hit sheet only) | beam:arrow + pop:wind-hit |
| Archer | ultimate: Arrow Storm | windVortex #ffe27a / windBurst | same sheet as Feather Storm, Tempest, Whirlwind…, other tint | rain:wind-strike #ffe27a + rain:arrow + ring:wind-wave |
| Fire Wizard | skill: Meteor | fireCircle / fireExplosion | **same as** Armageddon | meteor:fire-orb + ring:fire-wave |
| Fire Wizard | ultimate: Armageddon | fireCircle / fireExplosion | **same as** Meteor | rain:fire-strike + ripple:fire-wave + spray:fire-sparkle |
| Ninja Monk | skill: Thousand Fists | — / whiteBurst | no cast sheet (a hit sheet only) | barrage:fist + barrage:light-hit |
| Ninja Monk | ultimate: Hundred Fists | whiteBurst / whiteBurst | same sheet as Mirror Image, Hall of Mirrors, other tint | barrage:star-hit #ffd27a + flare:light-explosion + ripple:fire-wave #ffd27a |
| Peasant | skill: Hold the Line | iceShield / — | same sheet as Mass Muster, other tint | spikes:wind-spikes #e8d8a0 + ring:earth-circle |
| Peasant | ultimate: Mass Muster | iceShield #e8d8a0 / — | same sheet as Hold the Line, other tint | inward:earth-gather + ripple:earth-wave #e8d8a0 + barrier:wind-shield #e8d8a0 |
| Lightning Mage | skill: Chain Lightning | lightningBurst / lightningStrike | **same as** Thunderstorm, Voltage Blink, Thunder Cascade | chain:lightning-strike + flare:lightning-hit |
| Lightning Mage | ultimate: Thunderstorm | lightningBurst / lightningStrike | **same as** Chain Lightning, Voltage Blink, Thunder Cascade | rain:lightning-orb + ripple:lightning-wave + flare:lightning-nova |
| Wanderer | skill: Sanctuary | lightNova / — | same sheet as Dawn Light, Astral Convergence, other tint | ring:light-rune + spiral:light-sparkle |
| Wanderer | ultimate: Dawn Light | lightNova #fff2a0 / — | same sheet as Sanctuary, Astral Convergence, other tint | fan:light-pillar #fff2a0 + flare:light-nova #fff2a0 + pillar:light-gather |
| Kitsune | skill: Fox Charm | pinkHeart / — | **same as** Nine-Tailed Dream | spiral:pinkHeart + ring:dark-circle #ff9ad8 |
| Kitsune | ultimate: Nine-Tailed Dream | pinkHeart / pinkHeart | **same as** Fox Charm | fan:fire-flame #b08aff + inward:pinkHeart + ripple:dark-wave #ff9ad8 |
| Karasu Tengu | skill: Dive | — / earthBurst | no cast sheet (a hit sheet only) | meteor:dark-strike #9a8ab0 + dash:dark-puff |
| Karasu Tengu | ultimate: Feather Storm | windVortex #ff5a6a / windBurst #ff8a8a | same sheet as Arrow Storm, Tempest, Whirlwind…, other tint | spray:feather + spray:dark-puff #403048 + spray:blood-sparkle + ripple:wind-wave |
| Yamabushi Tengu | skill: Wind Gust | windWave / windBurst | same sheet as Keelhaul, other tint | beam:wind-wave + pop:wind-puff |
| Yamabushi Tengu | ultimate: Tempest | windVortex / windBurst | same sheet as Arrow Storm, Feather Storm, Whirlwind…, other tint | spiral:wind-vortex #8fe0ff + rain:lightning-strike #a8e4ff + ripple:wind-wave #8fe0ff |
| Paladin | skill: Holy Challenge | lightCircle #ffe27a / — | **same as** Divine Aegis, Starfall | ripple:light-wave #ffe27a + draw:light-sparkle #ffe27a |
| Paladin | ultimate: Divine Aegis | lightCircle #ffe27a / lightNova | **same as** Holy Challenge, Starfall | barrier:light-shield #fff2a0 + pillar:light-pillar #fff2a0 + ripple:light-nova #ffe27a |
| Cleric | skill: Benediction | lightGather / — | **same as** Divine Intervention, Holy Light | rain:light-sparkle + ring:light-circle |
| Cleric | ultimate: Divine Intervention | lightGather / lightNova | **same as** Benediction, Holy Light | orbit:light-gather + pillar:light-status + flare:light-aura |
| Druid | skill: Call Treant | earthBurst #8aff5a / — | **same as** Heart of the Grove | spikes:forest-spikes + ring:forest-wave |
| Druid | ultimate: Heart of the Grove | earthBurst #8aff5a / — | **same as** Call Treant | pillars:forest-pillar + spiral:leaf + spiral:forest-sparkle + ripple:forest-wave |
| Barbarian | skill: Whirlwind | windVortex #ff9a6a / bloodExplosion | **same as** Bloodlust | sweep:blood-slash + ring:blood-wave |
| Barbarian | ultimate: Bloodlust | windVortex #ff9a6a / bloodExplosion | **same as** Whirlwind | spray:blood-hit + flare:blood-nova + ripple:blood-wave |
| Ranger | skill: Snare Trap | — / earthBurst | no cast sheet (a hit sheet only) | ring:forest-rune + pillar:forest-puff |
| Ranger | ultimate: Hunter's Net | earthBurst #b0d890 / earthBurst #b0d890 | same sheet as Call Treant, Heart of the Grove, Call of the Wild…, other tint | drop:forest-cross #b0d890 + ring:forest-circle |
| Warlock | skill: Hex | darkCircle #b06aff / darkSlash | **same as** Soul Harvest, Reign of Terror | ring:dark-rune #b06aff + pillar:dark-status #b06aff |
| Warlock | ultimate: Soul Harvest | darkCircle #b06aff / darkSlash #b06aff | **same as** Hex, Reign of Terror | draw:dark-orb #9a4aff + flare:dark-gather + ripple:dark-wave #9a4aff |
| Illusionist | skill: Mirror Image | whiteBurst #d8b0ff / — | **same as** Hall of Mirrors | barrier:dark-shield #d8b0ff + pop:moon-hit #d8b0ff |
| Illusionist | ultimate: Hall of Mirrors | whiteBurst #d8b0ff / — | **same as** Mirror Image | orbit:moon-orb #d8b0ff + ripple:moon-explosion #d8b0ff + flare:dark-nova #d8b0ff |
| Gunslinger | skill: Dead Eye | — / whiteBurst | no cast sheet (a hit sheet only) | beam:fire-hit #ffe27a + drop:fire-cross |
| Gunslinger | ultimate: High Noon | goldBurst / whiteBurst | **same as** War Banner, Rally Cry | drop:fire-cross #ffd24a + flare:fire-nova #ffd24a + ripple:fire-wave #ffd24a |
| Shambler | skill: Rotting Touch | darkCircle #8aff5a / darkSlash #8aff5a | **same as** Plague Tide | spray:poison-puff + pop:poison-explosion |
| Shambler | ultimate: Plague Tide | darkCircle #8aff5a / darkSlash #8aff5a | **same as** Rotting Touch | ripple:poison-wave + spray:poison-smoke + pillar:poison-flame |
| Rifle Bot | skill: Burst Fire | — / whiteBurst | no cast sheet (a hit sheet only) | barrage:wind-hit #ffe27a + beam:wind-orb #ffe27a |
| Rifle Bot | ultimate: Overclock | lightningBurst #9ad0ff / whiteBurst | same sheet as Chain Lightning, Thunderstorm, Voltage Blink…, other tint | dome:lightning-aura #9ad0ff + ripple:lightning-circle #9ad0ff + spray:lightning-sparkle #9ad0ff |
| Mercenary | skill: Bounty Hunt | darkCircle #ffd24a / goldBurst | **same as** Contract Killer | drop:blood-cross + spray:coin |
| Mercenary | ultimate: Contract Killer | darkCircle #ffd24a / goldBurst | **same as** Bounty Hunt | barrage:coin + barrage:star-explosion #ffd24a + drop:blood-slash #ffd24a + ripple:blood-wave #ffd24a |
| Mummy | skill: Binding Wraps | earthShield #e8d8a0 / whiteBurst #e8d8a0 | same sheet as Shield Wall, Last Bastion, other tint | spiral:bandage + spiral:wind-sparkle #e8d8a0 + ring:earth-rune #e8d8a0 |
| Mummy | ultimate: Curse of the Pharaoh | darkCircle #e8d8a0 / darkSlash #e8d8a0 | same sheet as Shadow Step, Shadow Dance, Hex…, other tint | ripple:earth-circle #e8d070 + pillar:earth-smoke #e8d8a0 + flare:dark-nova #e8d070 |
| Buccaneer | skill: Grappling Hook | — / darkSlash | no cast sheet (a hit sheet only) | beam:ice-slash #b0c0d0 + draw:ice-puff |
| Buccaneer | ultimate: Keelhaul | windWave #5ab8d8 / darkSlash | same sheet as Wind Gust, other tint | rain:anchor + rain:water-explosion + ripple:ice-wave #5ab8d8 + spray:water-sparkle |
| Wolf Bard | skill: Dirge | lightGather #9ad0ff / iceShield | **same as** Battle Hymn | orbit:ice-sparkle #9ad0ff + orbit:note #9ad0ff + ring:ice-circle |
| Wolf Bard | ultimate: Battle Hymn | lightGather #9ad0ff / iceShield | **same as** Dirge | ripple:ice-wave #9ad0ff + spiral:light-sparkle #9ad0ff + flare:ice-nova |
| Beastmaster | skill: Call of the Wild | earthBurst #ffb07a / — | **same as** Hunt of the Pack | pillars:forest-circle #ffb07a + fan:paw + ring:earth-wave #ffb07a |
| Beastmaster | ultimate: Hunt of the Pack | earthBurst #ffb07a / — | **same as** Call of the Wild | beam:paw + beam:forest-slash #ffb07a + fan:forest-aura #ffb07a + ripple:forest-wave #ffb07a |
| Kraken Mate | skill: Undertow | windVortex #5ab8d8 / windBurst #5ab8d8 | **same as** Maelstrom | draw:water-orb #5ab8d8 + ring:ice-circle #5ab8d8 |
| Kraken Mate | ultimate: Maelstrom | windVortex #5ab8d8 / windBurst #5ab8d8 | **same as** Undertow | spiral:ice-vortex #5ab8d8 + draw:water-orb + ripple:ice-nova #5ab8d8 |
| Lancer | skill: Lance Charge | earthWave #ffd0a0 / earthBurst | **same as** Charge of the Knights | dash:earth-puff #ffd0a0 + pop:earth-hit #ffd0a0 |
| Lancer | ultimate: Charge of the Knights | earthWave #ffd0a0 / earthBurst | **same as** Lance Charge | beam:star-slash #ffd0a0 + fan:earth-hit #ffd0a0 + ripple:earth-wave #ffd0a0 |
| Reaper | skill: Reap | darkCircle #6a70ff / darkSlash | **same as** Harvest of Souls | sweep:scythe + sweep:water-slash #6a70ff + ring:dark-wave #6a70ff |
| Reaper | ultimate: Harvest of Souls | darkCircle #6a70ff / darkSlash #6a70ff | **same as** Reap | draw:skull + draw:ice-orb #8ab0ff + pillar:dark-pillar #6a70ff + ripple:dark-wave #6a70ff |
| Time Witch | skill: Temporal Surge | lightCircle #ff9ad8 / iceShield #ff9ad8 | **same as** Time Stop | ripple:light-circle #ff9ad8 + spiral:light-sparkle #ff9ad8 |
| Time Witch | ultimate: Time Stop | lightCircle #ff9ad8 / iceShield #ff9ad8 | **same as** Temporal Surge | ring:light-cross #ff9ad8 + ripple:light-rune #ff9ad8 + orbit:light-orb #ff9ad8 |
| Arc Blade | skill: Voltage Blink | lightningBurst / lightningStrike | **same as** Chain Lightning, Thunderstorm, Thunder Cascade | dash:lightning-puff #bfe6ff + pop:lightning-nova |
| Arc Blade | ultimate: Thunder Cascade | lightningBurst / lightningStrike | **same as** Chain Lightning, Thunderstorm, Voltage Blink | pillars:lightning-pillar #b06aff + chain:lightning-strike #d8b0ff + ripple:lightning-wave #b06aff |
| Dread Pirate | skill: Broadside | — / fireExplosion #9ad0b0 | no cast sheet (a hit sheet only) | fan:cannonball + fan:fire-smoke + barrage:fire-explosion #9ad0b0 |
| Dread Pirate | ultimate: Ghost Fleet | darkCircle #9ad0b0 / fireExplosion #9ad0b0 | same sheet as Shadow Step, Shadow Dance, Hex…, other tint | beam:poison-flame #9ad0b0 + rain:poison-orb #9ad0b0 + ripple:poison-wave #9ad0b0 |
| Siege Bot | skill: Shell Barrage | earthWave #b0b8d0 / fireExplosion | **same as** Orbital Strike | meteor:wind-orb #b0b8d0 + ring:wind-wave #b0b8d0 |
| Siege Bot | ultimate: Orbital Strike | earthWave #b0b8d0 / fireExplosion | **same as** Shell Barrage | pillar:fire-pillar #ffe0c0 + ripple:fire-wave #b0b8d0 + drop:wind-cross #b0b8d0 |
| High Priestess | skill: Holy Light | lightGather / lightNova | **same as** Benediction, Divine Intervention | beam:light-orb + pop:light-explosion |
| High Priestess | ultimate: Resurrection | lightGather #fff2a0 / — | same sheet as Benediction, Divine Intervention, Holy Light…, other tint | spiral:light-status + pillar:light-flame #fff2a0 + ripple:light-wave #fff2a0 |
| Queen Dragoon | skill: Dragon Breath | fireCircle #d890ff / fireExplosion | **same as** Inferno Breath | cone:fire-puff #d890ff + pop:fire-explosion #d890ff |
| Queen Dragoon | ultimate: Inferno Breath | fireCircle #d890ff / fireExplosion | **same as** Dragon Breath | cone:fire-explosion #d890ff + cone:fire-flame + ripple:fire-wave #d890ff |
| Juggernaut | skill: Earthquake | earthWave / earthExplosion | **same as** Cataclysm, Gore Charge | ripple:earth-wave + spray:earth-puff |
| Juggernaut | ultimate: Cataclysm | earthWave / earthExplosion | **same as** Earthquake, Gore Charge | spikes:earth-spikes + rain:earth-orb + ripple:earth-nova |
| Great Sage | skill: Starfall | lightCircle #ffe27a / goldBurst | **same as** Holy Challenge, Divine Aegis | rain:star-orb #ffe27a + ring:light-circle #ffe27a |
| Great Sage | ultimate: Astral Convergence | lightNova #ffe27a / goldBurst | same sheet as Sanctuary, Dawn Light, other tint | inward:star-sparkle #ffe27a + flare:star-explosion + ripple:light-nova #aab8ff |
| Demon Swordsman | skill: Hellblade Sweep | darkSlash #ff6a6a / bloodExplosion | same sheet as Ravage, other tint | sweep:fire-slash #ff4a4a + ring:blood-circle |
| Demon Swordsman | ultimate: Demon Form | darkCircle #ff4a4a / — | **same as** Judgement | pillar:dark-pillar #ff4a4a + spray:fire-sparkle #ff4a4a + flare:fire-nova #ff4a4a |
| Tyrant | skill: Judgement | darkCircle #ff4a4a / darkSlash #ff6a6a | **same as** Demon Form | drop:dark-cross #ff4a4a + ring:dark-rune #ff4a4a |
| Tyrant | ultimate: Reign of Terror | darkCircle #b06aff / darkSlash #b06aff | **same as** Hex, Soul Harvest | pillars:dark-vortex #b06aff + flare:dark-aura + ripple:dark-nova #b06aff |
| Werewolf | skill: Ravage | darkSlash / bloodExplosion | same sheet as Hellblade Sweep, other tint | slashX:wind-slash #ffd0d0 + pop:blood-puff |
| Werewolf | ultimate: Full Moon | lightCircle #aab8ff / bloodExplosion | same sheet as Holy Challenge, Divine Aegis, Starfall…, other tint | flare:moon-explosion #aab8ff + spray:moon-sparkle #aab8ff + ripple:moon-slash #aab8ff |
| Minotaur | skill: Gore Charge | earthWave / earthBurst | **same as** Earthquake, Cataclysm | beam:earth-hit #ffb080 + pop:earth-explosion #ffb080 |
| Minotaur | ultimate: Stampede | earthWave #ffb080 / earthBurst | same sheet as Lance Charge, Charge of the Knights, Shell Barrage…, other tint | cone:earth-smoke #ffb080 + spikes:earth-spikes #ffb080 + ripple:earth-wave #ffb080 |
| Satyr | skill: Pipes of Pan | lightGather #ffd27a / — | **same as** Bacchanal | spiral:note + spiral:forest-sparkle #ffd27a + ring:forest-nova #ffd27a |
| Satyr | ultimate: Bacchanal | lightGather #ffd27a / — | **same as** Pipes of Pan | ripple:forest-nova #ffd27a + rain:forest-orb #ffd27a + flare:forest-status #ffd27a |
| Gorgon | skill: Petrifying Gaze | darkCircle #9be07a / — | **same as** Stone Curse | beam:poison-orb + ring:poison-rune |
| Gorgon | ultimate: Stone Curse | darkCircle #9be07a / whiteBurst #b0c0a0 | **same as** Petrifying Gaze | ring:poison-rune #b0c0a0 + rain:earth-puff #b0b6a6 + ripple:poison-wave #b0c0a0 |
| Samurai Commander | skill: War Banner | goldBurst / — | **same as** High Noon, Rally Cry | barrier:banner + dome:light-aura #ffd24a + ring:light-wave #ffd24a |
| Samurai Commander | ultimate: Rally Cry | goldBurst / — | **same as** High Noon, War Banner | ripple:fire-nova #ffd27a + dome:fire-aura #ffd27a + spray:light-sparkle #ffd27a |

82 of 90 hero skills and ultimates shared a look before (the same cast sheet, or the same sheet with another tint). After: 0 share a lead strip.

### Tier skills

| Hero | Tier 2 | Tier 3 | Ring (the hero skill's lead, again) |
|---|---|---|---|
| Knight | Iron Wall | Fortress | barrier:earth-shield |
| Samurai | Twin Iaido | Moon Cut | slashX:moon-slash |
| Kunoichi | Fading Step | Thousand Shadows | dash:dark-smoke |
| Archer | Double Volley | Rain of Arrows | beam:arrow |
| Fire Wizard | Twin Meteor | Meteor Shower | meteor:fire-orb |
| Ninja Monk | Fourth Fist | Fifth Fist | barrage:fist |
| Peasant | Hold Harder | Rally the Village | spikes:wind-spikes #e8d8a0 |
| Lightning Mage | Forked Chain | Storm Chain | chain:lightning-strike |
| Wanderer | Brighter Sanctuary | Radiant Sanctuary | ring:light-rune |
| Kitsune | Lingering Charm | Hundred Fox Fires | spiral:pinkHeart |
| Karasu Tengu | Swift Dive | Storm Dive | meteor:dark-strike #9a8ab0 |
| Yamabushi Tengu | Stronger Gust | Hurricane | beam:wind-wave |
| Paladin | Righteous Challenge | Crusader's Oath | ripple:light-wave #ffe27a |
| Cleric | Warm Benediction | Miracle | rain:light-sparkle |
| Druid | Grove | Ancient Grove | spikes:forest-spikes |
| Barbarian | Wide Whirl | Cyclone | sweep:blood-slash |
| Ranger | Third Snare | Fourth Snare | ring:forest-rune |
| Warlock | Deep Hex | Doom | ring:dark-rune #b06aff |
| Illusionist | Longer Mirage | Hall of Illusions | barrier:dark-shield #d8b0ff |
| Gunslinger | Long Eye | Dead Eye Deluxe | beam:fire-hit #ffe27a |
| Shambler | Thicker Rot | Plague | spray:poison-puff |
| Rifle Bot | Fourth Round | Full Magazine | barrage:wind-hit #ffe27a |
| Mercenary | Bigger Bounty | Gold Rush | drop:blood-cross |
| Mummy | Tighter Wraps | Pharaoh's Wraps | spiral:bandage |
| Buccaneer | Longer Hook | Boarding Party | beam:ice-slash #b0c0d0 |
| Wolf Bard | Louder Dirge | Chorus | orbit:ice-sparkle #9ad0ff |
| Beastmaster | Pair of Wolves | Pack Leader | pillars:forest-circle #ffb07a |
| Kraken Mate | Stronger Undertow | Maelstrom Tide | draw:water-orb #5ab8d8 |
| Lancer | Longer Charge | Knight's Charge | dash:earth-puff #ffd0a0 |
| Reaper | Keener Scythe | Soul Scythe | sweep:scythe |
| Time Witch | Longer Surge | Time Loop | ripple:light-circle #ff9ad8 |
| Arc Blade | Live Wire | Storm Blink | dash:lightning-puff #bfe6ff |
| Dread Pirate | Double Broadside | Ghost Armada | fan:cannonball |
| Siege Bot | Heavier Shell | Twin Shells | meteor:wind-orb #b0b8d0 |
| High Priestess | Brighter Light | Holy Radiance | beam:light-orb |
| Queen Dragoon | Longer Breath | Dragonfire | cone:fire-puff #d890ff |
| Juggernaut | Heavier Quake | Titan Quake | ripple:earth-wave |
| Great Sage | Fourth Star | Constellation | rain:star-orb #ffe27a |
| Demon Swordsman | Wider Sweep | Demon Sweep | sweep:fire-slash #ff4a4a |
| Tyrant | Twin Verdicts | Tyrant's Decree | drop:dark-cross #ff4a4a |
| Werewolf | Savage Ravage | Blood Moon | slashX:wind-slash #ffd0d0 |
| Minotaur | Heavier Charge | Rampage | beam:earth-hit #ffb080 |
| Satyr | Livelier Pipes | Pan's Frenzy | spiral:note |
| Gorgon | Deeper Gaze | Medusa's Glare | beam:poison-orb |
| Samurai Commander | Higher Banner | Grand Standard | barrier:banner |

## Checked

`npm run typecheck`, `npm test` (all pass), `npm run web`; `node tools/fxlab/play.mjs` plays nine fights covering the whole
roster with skills and ultimates charged (every hero's skill and ultimate went off) with no page errors, at 393x852. The frame
time that script prints (about 68 ms) is the headless browser's software renderer, not a phone; the effects add no per-frame
allocation (the pool's sprites are reused) and sit under the particle cap (200, 260 for the big moments; battery saver halves both
and the counts).
