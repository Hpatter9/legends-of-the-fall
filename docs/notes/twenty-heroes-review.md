# Twenty heroes: do they fit the house style?

The owner's question: "Do the new heroes fit in with the style we've set up? Skills, stats, and such?" This is a review of the twenty
coming heroes on `claude/twenty-heroes` (`kits/vampires.ts`, `wave2.ts`, `wave3.ts`, `wave4.ts`, `COMING_*` in `units.ts`, `stats.ts`,
`traits.ts`, `combos.ts`), measured against the 45 heroes (`kits/table.ts`, `kits/third.ts`, `ultimates.ts`, `stats.ts`) and the design notes
([skills-overhaul-design.md](skills-overhaul-design.md), [skills-4.md](skills-4.md), [rpg-stats-design.md](rpg-stats-design.md),
[twenty-heroes.md](twenty-heroes.md), [twenty-heroes-audit.md](twenty-heroes-audit.md)). It is a report only: no game code was changed.

**Short answer:** the themes, names and words fit well, and every skill sits inside its class's cost, cooldown and cast-time ranges (the
coming tests hold that). But as a set they are **stronger, faster and busier than the roster**, they **drop the jab** that the third
skill was added for, and they **repeat a handful of moves** (rescue guards, pull-in ultimates, walls) many times over. Two pairs need a
rework rather than numbers: the Blood Gargoyle and the Bell Warden are nearly the same hero, and the Seraph is far beyond the band even
with her passive taken away.

## The top issues

1. **They are too strong at every level, not only at level 1.** The hero sweep with the twenty in the teams (`COMING=1`, 8,000 fights a
   level, the tests' stages; table below): 15 of the 20 are more than 6 points over the roster's average at level 1, 14 at level 10 and
   15 at level 30, and the roster's own average win rate rises from about 54% to 72% (level 1), 81% (level 10) and 80% (level 30) when
   they share its teams. Taking their passives away (`p` 0) brings level 1 mostly into the band, as [twenty-heroes.md](twenty-heroes.md)
   found, **but barely changes level 30** (13 still beyond 6): there the excess is skill 2, skill 3 and the ultimates at the untuned
   defaults (`COMING_TUNE` 1 and 0.8, the branch's ultimate knobs). Tuning the passives alone will not do.
2. **Their unit stats creep above their classes.** 11 of the 20 deal more damage a second (attack / time between blows) than any roster
   hero of their class, and 15 of the 20 walk faster than every roster hero of their class (the roster's ranged heroes all walk at 700 ms
   or slower; the new ones at 580 to 680). The worst: the Nightstalker (40 a second against the assassins' 28 to 32.5), the Dhampir (23.7
   against the gunners' 15 to 20.8), the Seraph (17.1 against the guardians' 10 to 15.5) and the Hemomancer (20.7 against the casters'
   10 to 19.4). Details in the stats section.
3. **Their passives do two or three things; the roster's do one.** Of the 45, 37 passives have a single effect (the Archer's has none),
   and the seven with two are mostly a small pair (block and its heal, block and a switch). Of the 20, 19 have two or three, and four
   have three (Granite Hide: block, block heal and shot armour; Half-Blood Hunter, Bedrock Stance and Chill-Iron Barbs), often at or above the roster's top number (the Seraph's halo
   0.12 against the Priestess's 0.08, the Sphinx's aura 0.02 against the Cleric's 0.015). Several copy a roster passive whole: the Sea
   Reaver's Undying Tide is the Dread Pirate's Deathless (0.35) plus half the Barbarian's Bloodrage; the War Drummer's and the
   Astrologer's "every 3s a friend gains 18 charge" are the same line, and both are the Wolf Bard's Catchy Tune (16 every 3.5s).
   **Fix: one effect each, at roster numbers**, and no two passives alike.
4. **Slot 3 has lost its jab.** The design gave every hero a third skill so it had "the cheap, fast move the kits lacked": the roster's
   slot 3 is 32 jabs, 10 guards and 3 utilities. The twenty's slot 3 is **1 jab** (the Vampire Lord's), 6 guards, **10 utilities and 3
   heavies** (the Banneret, Falconer and Harpooner; no roster hero has a heavy in slot 3). So from level 20 they get a second big
   cooldown instead of something to do between the big ones, which also feeds issue 1 at level 30. **Fix:** give most of them a jab in
   slot 3 (a x0.8 to x0.9 poke with one small rider), and move the utility or heavy it replaces into slot 2 where the kit has room.
5. **The same few moves, many times over** (details per hero below):
   - **Five "rescue a friend" guards** with the same trigger (`friendInDanger`: a friend under 40% with a foe beside it) and the same
     shape (go to it or swap with it, shield it): Wing Buffet, Rampart Drop, Sanctuary Vault, Constellation Swap and Grappling Extraction.
     The roster's rescue guards are each their own mechanism (the Paladin's Warding Bond, the Rifle Bot's drone, the Sage's ward).
   - **Five pull-in ultimates** (Exsanguinate, Celestial Convergence, Supernova Alignment, Solar Tribunal, Leviathan Line), all the
     Kraken's Maelstrom with extras; **three teleport-slash ultimates** (Red Eclipse, Midnight Hunt, Dance of Seven Mirages) beside the
     roster's Assassinate, Lightning Storm and Killing Spree; **three line-dash skill 1s** (Crimson Lunge, Whirling Veils, Breaker Rush)
     beside the Samurai's.
   - **Walls on 11 of the 20** (a Wall of Light on four: Banneret, Dhampir, Inquisitor, Seraph; stone, ice, fire, thorns and wind on the
     rest). In the roster walls are a signature of a few (the Wizard, the Druid, the Sage's Mass Resurrection).
   - **Auras** (`raiseAura`) on eleven skills and ultimates, three of which refill friends' pools.
6. **Every trait ends with five heroes.** When the fifteen non-Vampires join, every origin and class has exactly five members (the
   branch's design). The director's decision 2 kept "every other trait keeps main's rules", and main's rule is two to four heroes a
   trait (`traits.test.ts`); four-hero tiers (Wild +12% attack, Undead +14% health, Caster, Assassin and others) also get easier to
   reach with more members to draw on. **This needs the owner's word before batch 2 joins**: either accept five-hero traits for all
   (and retune the 4 tiers), or move some of the fifteen to other traits.
7. **The Vampire origin and the Crimson Court are the strongest of their kind**, and they stack on the same five heroes (below).
8. **A few names borrow or clash.** "Nightstalker" is a Dota 2 hero's name (Night Stalker, also a winged night hunter);
   "Exsanguinate" is a World of Warcraft rogue talent; "Midnight Hunt" is a Magic: The Gathering set. "Crimson" is on two Vampire skills,
   the Vampire Oath and the Corsair Surgeon's ultimate (a pirate). Spelling is British throughout the words the player sees, and every
   pronoun matches the canon's sexes.

## Measured: lift over the roster's average win rate (points)

The hero sweep (`tools/heroSweep.ts`) through the tuner (`tools/kits/tune.mjs`, no `--apply`) with `COMING=1`, 8,000 fights each, at the
balance tests' stages (level 1 stage 5, level 10 stage 24, level 30 stage 92). The roster's band is 6 points. "No passive" is the same
sweep with every coming passive's knob at 0 (`p` 0, a scratch state file; nothing committed).

| Hero | Level 1 | Level 10 | Level 30 | Level 1, no passive | Level 30, no passive |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vampire Lord | +11.2 | +6.2 | +13.6 | +3.8 | +14.9 |
| Hemomancer | +6.3 | +7.6 | +9.6 | -7.9 | +9.5 |
| Nightstalker | +9.5 | +9.4 | +8.6 | +2.8 | +7.0 |
| Blood Gargoyle | +9.3 | +15.1 | +6.2 | +5.8 | +3.7 |
| Dhampir | +9.5 | +10.6 | +5.0 | +6.5 | +2.3 |
| War Drummer | 0.0 | +1.7 | +10.7 | -2.4 | +11.5 |
| Banneret | +6.8 | +3.5 | +11.0 | +4.8 | +10.3 |
| Geomancer | -2.1 | -0.6 | +0.6 | -4.3 | -0.5 |
| Bell Warden | +10.4 | +7.1 | +14.9 | +3.6 | +12.3 |
| Falconer | +12.1 | +8.8 | +11.5 | +5.5 | +8.2 |
| Astral Sphinx | +12.9 | +9.0 | +6.5 | +3.5 | +2.8 |
| Mirage Dancer | +9.5 | +8.1 | +11.4 | -3.7 | +8.7 |
| Plague Doctor | +13.8 | +8.2 | +6.8 | -2.2 | +6.8 |
| Bombardier | +8.9 | +6.5 | +13.5 | +5.7 | +14.7 |
| Astrologer | +0.8 | +0.4 | +3.4 | -4.3 | +1.6 |
| Inquisitor | +3.2 | -2.5 | +7.0 | -3.2 | +8.1 |
| Seraph | **+22.4** | **+15.2** | **+17.3** | **+13.8** | **+15.8** |
| Corsair Surgeon | +5.5 | +4.6 | +8.6 | -7.5 | +4.2 |
| Harpooner | +11.3 | +7.1 | +2.5 | +3.7 | -1.1 |
| Sea Reaver | +14.0 | +10.2 | -0.7 | +1.8 | **-11.8** |
| Roster average win rate | 71.8% | 81.5% | 80.0% | 59.0% | 75.4% |

Read with care: with the twenty in the pool the teams are a third new heroes, so the roster's average they are measured against is
itself lifted; a lift here is "better than the roster's heroes in the same teams". What it shows: only the Geomancer and the Astrologer
are at parity throughout; the Hemomancer and the Corsair Surgeon are carried by their passives (under the band without them); the Sea
Reaver's late game is all passive (his Undying Tide); the Seraph is out of the band whatever is removed.

## The stats: where each new hero sits in its class

Each value against the range of the roster heroes of the same class (hp, attack, defence, range, walk and blow times in ms, and damage a
second = attack x 1000 / blow time). Only the values outside the range are listed.

| Hero (class, roster peers) | Outside its class's range |
| --- | --- |
| Vampire Lord (blade, 4) | damage 28.9 a second (blades 21 to 28) |
| Hemomancer (caster, 4) | walks 680 (casters 700 to 800); damage 20.7 (10 to 19.4) |
| Nightstalker (assassin, 4) | attack 28 (23 to 26); blows every 700 (750 to 850); walks 380 (400 to 560); damage **40** (28.2 to 32.5) |
| Blood Gargoyle (bulwark, 2) | attack 20 (both 19); flies, the only flying tank |
| Dhampir (gunner, 2) | walks 580 (700 to 900); damage 23.7 (15 to 20.8) |
| War Drummer (support, 3) | hp 248 (182 to 247); defence 6 (3 to 5) |
| Banneret (warden, 4) | defence 8 (3 to 7); walks 660 (700 to 900) |
| Geomancer (bulwark, 2) | hp 295 (297 to 350); attack 21 (19); range 2 with a shot (both bulwarks melee) |
| Bell Warden (bulwark, 2) | attack 20 (19) |
| Falconer (marksman, 4) | walks 600 (650 to 700) |
| Astral Sphinx (beast, 4) | none; but flies and shoots, the only beast that does both |
| Mirage Dancer (trickster, 4) | none |
| Plague Doctor (arcanist, 2) | attack 26 (28 to 29); defence 4 (2 to 3); walks 660 (700); blows every 1450 (1500 to 1600) |
| Bombardier (gunner, 2) | walks 680 (700 to 900) |
| Astrologer (arcanist, 2) | hp 184 (188 to 204); attack 30 (28 to 29); walks 680 (700); damage 19.4 (18.1 to 18.7) |
| Inquisitor (arcanist, 2) | defence 5 (2 to 3); walks 640 (700); blows every 1400 (1500 to 1600); damage 20 (18.1 to 18.7) |
| Seraph (guardian, 4) | attack 18 (11 to 17); walks 500 (650 to 760); blows every 1050 (1100 to 1200); damage 17.1 (10 to 15.5); flies |
| Corsair Surgeon (support, 3) | walks 600 (620 to 700) |
| Harpooner (gunner, 2) | walks 620 (700 to 900); damage 21.5 (15 to 20.8) |
| Sea Reaver (vanguard, 4) | attack 25 (21 to 24); damage 27.8 (17.5 to 26.7) |

- **The D&D rows are sound**: every one is the standard array with its +2 and +1 (each a permutation of 17, 15, 13, 12, 10, 8), with a
  blow and casting ability that fit the calling. Three small oddities: the Bell Warden is a "Monk (bell guardian)" in heavy armour (the
  roster's monks wear `monk`); the Harpooner fights from 4 tiles on STR (every roster shooter uses DEX or its casting score; thrown
  harpoons make it defensible, but say so in the row's comment); the Seraph's row is the Paladin's with DEX and INT swapped.
- **Fliers double**: the roster has three (Karasu, Reaper, Dragoon); the twenty add four (Nightstalker, Blood Gargoyle, Astral Sphinx,
  Seraph). A flying bulwark and a flying healer are new shapes; flight lets them leave the line they are meant to hold.
- **Fix for all:** bring each value inside its class's range unless the kit needs the exception, and say why in a comment when it does
  (the roster's notes do: "a sniper", "a wall of a man"). Walking speed first: 580 to 680 for shooters is a quiet, big lift.

## Kit shape against the roster's conventions

- **Classes, costs, cooldowns, cast times**: all in range; heavy dearest and jab cheapest; demand within 1.4 to 3.5 of income
  (`test/comingKits.ts` checks these, and the 53 tests of `vampire*`, `wave2-kits`, `wave3-kits`, `wave4-kits` and `coming-page` pass).
- **Skill 1 as the cadence strike**: all twenty open on a strike (the roster has nine utility or guard openers, so this is tidier than
  the roster, not a fault). Cooldowns 7 s (the Falconer 6 s), at the slow end of the roster's 5 to 9 s, where its 6 s is commonest.
- **Heavies**: the roster's heavies are always skill 2. Three of the twenty put theirs in slot 3 (above).
- **Guards**: a guard's own cast checks its trigger, as `kits/third.ts`'s do. Good. The sameness is the issue (issue 5).
- **Revives on skill 2**: the Seraph's and the Corsair Surgeon's are, as main's are. Good. With them the healers go from four to six,
  and three more of the twenty heal on a skill (the Hemomancer, the Plague Doctor, the Inquisitor) on top of three mending passives; with
  the Vampires' leech the set leans hard on sustain.
- **Ultimates' scale**: the roster's ultimates do one or two things ("Six shots at the hardest-hitting foes in reach", "A whirlpool drags
  every foe within 6 tiles toward him, hurts and slows it"). Most of the twenty's do three or four: the Oriflamme of the Keep leaps,
  heals every friend a fifth, and raises an aura with four effects; Red Eclipse slashes five, bleeds, curses and raises an aura. The
  healers' ultimates also fill fast for what they do: the Corsair Surgeon's Crimson Dispensary (every friend mended a quarter, plus an
  aura) at rate 0.9, where the roster's Panacea and Mass Resurrection run at 0.37 and 0.38. **Fix:** one headline effect and at most one
  rider each; the healers' rates near the roster healers'.

## The twenty

| Hero | Role | Verdict | Fixes |
| --- | --- | --- | --- |
| **Vampire Lord** (blade) | Blood duellist, clear | Small fixes | Mist Step is far too much for a jab (a 5-tile blink, x1.65, a bleed and 3 s of haste for 10 SP every 4 s): make it a x0.9 cut with a bleed, or a strike. Noble Thirst: keep the leech (at 0.12, the Demon Swordsman's 0.08 to the Kitsune's 0.25), drop the crit (the Samurai's Keen Edge). Damage 28.9 a second to 28 or under. Red Eclipse: drop the curse or the aura. |
| **Hemomancer** (caster) | Blood weaver, clear | Small fixes | Her passive carries her (-7.9 without it): keep Chalice Overflow's mend, drop its leech. Walk 700, damage under 19.4. Exsanguinate is a pull-in plus a team heal of 22% (Maelstrom plus Panacea): pick one; rename it (a WoW talent's name), e.g. "Blood Tithe". |
| **Nightstalker** (assassin) | Winged back-line hunter, clear | **Rework** | Stats: attack 28, blows every 700 and walking 380 make 40 damage a second, a quarter above the best assassin; bring all three into range. Midnight Hunt is the Kunoichi's Assassinate (the four weakest, in turn): give it its own shape, e.g. a carry-off (Abduct's idea, grown). Rename the hero (Dota 2's Night Stalker) and the ultimate (an MTG set), e.g. "Crypt Wing" / "Belfry Swoop". |
| **Blood Gargoyle** (bulwark) | Stone sentinel | **Rework** | Nearly the Bell Warden: both leap-slam on skill 1 with a 3x3 and a landing stun (Gargoyle Crash, Bronze Slam), both have a rescue guard on the same trigger, both block from the front and heal from it, both leap into the crowd and stun on their ultimate; both 325 to 332 hp, defence 9. Keep the Gargoyle's granite (Stone Slumber, the wall) and make him the immovable one: no flight, or flight only on the ultimate. Granite Hide: one effect. |
| **Dhampir** (gunner) | Silver-bolt hunter, clear | Small fixes | Damage 23.7 a second to 20.8 or under, walk 700. Half-Blood Hunter: one of pierce, far or leech. Consecrated Trap's Wall of Light is the fourth of its kind: keep the snare, drop the wall. |
| **War Drummer** (support) | Taiko rally, clear | Small fixes | Rhythm of War is the Astrologer's passive word for word and the Wolf Bard's in all but numbers: give it its own (e.g. friends within 2 act 5% faster). Hp 247, defence 5. Two utilities in slots 2 and 3: one should be a jab (a drum strike). "Storm of Ten Thousand Drums" (27 letters) is the longest name in the game; check it on the 360 px fight sheet or shorten ("Ten Thousand Drums"). |
| **Banneret** (warden) | Standard-bearer, clear | Small fixes | Defence 8 to 7, walk 700. Phalanx Sweep is a heavy in slot 3 (no roster hero has one): make slot 3 a jab. Rampart Drop is the third rescue guard on the same trigger. Shield-Sister is the Priestess's Halo plus the Peasant's Strength in Numbers: keep one. The Oriflamme does five things: trim to a heal and one aura effect. |
| **Geomancer** (bulwark) | Stone shaper; reads as a controller more than a tank | Small fixes | The only one at parity throughout: keep the numbers. A bulwark with a 2-tile bolt shot and three control skills is a caster's kit; either make her melee (range 1, no shot) so she holds the line, or give one skill a tank's job (a taunt or a ward). Her wall and the Blood Gargoyle's both stone. |
| **Bell Warden** (bulwark) | Bronze keeper | **Rework** | See the Blood Gargoyle: rework one of the two. Keep the Warden's bell (the toll's silence, the knell) and the swap, and make him the sound and stillness hero: a toll that silences on skill 1 rather than a leap-slam. Temple Bronze is the Paladin's Blessed Bulwark at higher numbers. Calling "Monk" with heavy armour: `monk` armour or another calling. |
| **Falconer** (marksman) | Hawker, clear | Small fixes | Talon Snare (heavy) in slot 3: make slot 3 a jab. Wind-Borne Sight has the Ranger's far bonus at 0.25 (his is 0.15) and a crit: keep one. Walk 650. |
| **Astral Sphinx** (beast) | Riddler and saviour; two jobs | Small fixes | Flies and shoots, slips 12% and heals the friends near her: choose (drop the aura, or the dodge). Constellation Swap is a rescue guard on the same trigger again; Celestial Convergence another pull-in. A riddle that confuses (a charm, a silence) fits her better than a pull. |
| **Mirage Dancer** (trickster) | Dune dancer, clear | Small fixes | Whirling Veils is the third line dash; Sirocco Leap's Wind Wall is the Ninja Monk's; her mirages are the Illusionist's decoys. Keep the mirage swap (Dune Swap) as her signature and change skill 1 (a spin on the spot). Desert Shimmer: one of dodge or crit. |
| **Plague Doctor** (arcanist) | Ash apothecary, clear | Small fixes | +13.8 at level 1 is the passive (mend every 3 s and cursing shots): keep one. Attack 28, defence 3, walk 700, blows 1500. Quarantine Line is another wall. |
| **Bombardier** (gunner) | Rocket-jumping shell-lobber, clear | Small fixes | Carpet Bombardment's rate (already noted in twenty-heroes.md) and the name, a modern war term: "Powder Rain" or "Shell Storm". Walk 700. Firebomb Line is another wall; Blast Jump as the guard was the right call. |
| **Astrologer** (royal arcanist) | Star-keeper, clear | Fits (small fixes) | Near parity. Her passive is the War Drummer's (above): give her the far bonus only. Attack 28 to 29, hp 188. Starlight Bridge refills pools, as two other new auras do. |
| **Inquisitor** (arcanist) | Sun-judge, clear | Small fixes | +7 at level 30. Defence 3, walk 700, blows 1500. Blazing Edict is a Wall of Light: give it a judge's job instead (a mark that makes a foe take more). Chains of Judgement and Judgement of Dusk share a word. |
| **Seraph** (guardian) | Winged healer and reviver | **Rework** | The furthest from the band at every level, still +13.8 with no passive (Halo Dive shields the friends round her and stuns, and neither scales with the skill's strength). A melee, flying, fast (walk 500), hard-hitting (attack 18) reviver in a tank's class: pick a lane. Either a guardian (keep the dive and the halo, move the revive and the heals out) or a healer (range 2 or 3, walk 700, attack 13 to 15). Reliquary Halo is the Priestess's Halo at 0.12 plus the Cleric's Grace: one, at 0.08. |
| **Corsair Surgeon** (pirate support) | Ship's surgeon, clear | Small fixes | Field Sawbones (mend 0.7 every 2.5 s, the Wanderer's kind) carries him (-7.5 without it); keep it and drop the dodge, then lift his skills. Crimson Dispensary: rename (a Vampire word; "Rum Ration"?) and slow its rate to the roster healers' (0.4). Walk 620. |
| **Harpooner** (pirate gunner) | Whaler, clear | Small fixes | Whaler's Reel (heavy) in slot 3: a jab instead. Chill-Iron Barbs has three effects: keep the slow. Damage 21.5 to 20.8 or under, walk 700. Floe Slide and Leviathan Line both raise ice walls. Note the STR blow at range. |
| **Sea Reaver** (pirate vanguard) | Hull-breaker, clear | Small fixes | Undying Tide is the Dread Pirate's Deathless plus half the Barbarian's Bloodrage: keep the rage, drop the undying (he is +14 at level 1 and -11.8 at level 30 without it). Attack 24. Breaker Rush is the third line dash: an anchor throw would be his own. |

Verdicts: **3 fit or nearly** (the Astrologer; the Geomancer's numbers), **13 small fixes**, **4 reworks** (the Nightstalker, the Seraph,
and one of the Blood Gargoyle and Bell Warden pair, written as both until one is chosen).

## The Vampire origin and the Crimson Court

**The tiers.** The roster's origins give one small thing at 2 and a bigger one at 4 (Wild +5% / +12% attack, Undead +6% / +14% health,
Machine +3% / +10% attack and 3% guard, Royal +2% attack and 3% health / +6% each). The Vampire origin:

| Need | Vampire | The roster's best at that count |
| --- | --- | --- |
| 2 | leech 6% for every hero | +5% attack (Wild), +8% health (Holy) |
| 4 | leech 12%, +6% attack | +12% attack (Wild), +14% health (Undead), +14% crit (Frontier) |
| 5 | leech 18%, **+14% attack**, the bat swarm | (no 5 tier) |

- The 2 and 4 tiers are in line (leech is worth about what the others' 2 tiers are; the 4 tier is +6% attack plus sustain, beside Wild's
  +12%). **The 5 tier is the strongest bonus any trait gives**: more attack than any origin's top tier, plus 18% leech for the whole
  team on top of the Vampires' own leeching passives (the Vampire Lord drinks 36% with it), plus a once-a-fight save.
- **It stacks with the Oath.** The five Vampires are both the 5 tier and the Crimson Court, so one team takes both. No roster Oath
  team gets a trait tier as large (the Holy Order is three Holy, the 2 tier's +8% health). Suggest a 5 tier of leech 15% and +10%
  attack, or keep the 5 tier and trim the Court.
- **Wording**: in the house style ("Blows leech 6% of the damage dealt as health"), good. The 5 tier's line is long for the trait
  sheet; "Blows leech 18%, +14% attack; once a fight a Vampire brought low bursts into bats" reads as the others do.

**The Crimson Court** (`bloodCourt`, Eternal Eclipse): hurt 0.65, a bleed of 0.055 for 4 s, the five mend a quarter, every ally hastened
4 s. That is the Shadow Clan's Thousand Cuts (0.77, the same bleed, haste 5 s) plus a heal five times the Dread Court's (0.05). Among the
eight it is near the top for damage and for healing at once, and it has four beats where the damage Oaths have three. **Suggest:**
`mendFive` 0.1 (or drop the haste), and a tone of its own when it gets its look. Names: "The Crimson Court" beside "The Dread Court"
is two Courts in a list of nine, sharing the `dark` tone, and "Eternal Eclipse" echoes the Vampire Lord's Red Eclipse; something like
"The Blood Moon" (move "Eclipse") or "The Night Kin" would sit apart.

## Wording

- **Tone and spelling**: the skill and role lines match the roster's plain, present-tense style ("Leaps up to 3 tiles and slams his
  bronze bell down: ..."), with British spelling in all the player's words; the pronouns match the canon's sexes for all twenty. One
  code comment says "magnetizes his crag-staff" for the Geomancer (`kits/wave2.ts`, `lodestonePull`): "magnetises her".
- **Borrowed or risky names**: Nightstalker (Dota 2's Night Stalker), Exsanguinate (a WoW rogue talent), Midnight Hunt (an MTG set).
  The D&D-flavoured names (Mist Step, after Misty Step) are in the house style, as the roster's Call Lightning and Spirit Guardians are.
  Carmilla (Le Fanu, 1872) and Vladislav are public-domain echoes, as intended.
- **Repeated words**: Crimson (Lunge, Mist, Court, and the Surgeon's Dispensary), Midnight (Hunt, Knell), Judgement (Chains of, of
  Dusk), Dusk (Dive, Judgement of), Sanctuary (Vault, Wings), Halo and Reliquary (Halo Dive, Reliquary Halo, Reliquary Grace; the
  Priestess's passive is Halo). Spreading them would help the codex read as twenty heroes, not five families.
- **Tone**: "Carpet Bombardment" is the one name from modern war; "Storm of Ten Thousand Drums" the one that may not fit the chips.

## What ran

- `npm test -- vampire wave2-kits wave3-kits wave4-kits coming-page`: 53 tests, all pass.
- The sweeps above (`COMING=1 PARTS=4 node tools/kits/tune.mjs <state> <level> <stage> 8000`, an empty state and one with every coming
  `p` at 0, both in the scratchpad), no `--apply`, nothing in the repository changed.
- A scratch script over `UNITS`, `HERO_KITS()`/`comingHeroKits()`, `KITS`/`comingKits()` and `profileOf` for the stat and slot tables.
- No typecheck or build: this change is this note only.
