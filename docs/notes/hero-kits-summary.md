# Hero kits: the short version (COMBAT-002, design awaiting your approval)

The full design is in [`hero-kits.md`](hero-kits.md); the HUD mock-up is
[`hero-kits-hud-mock.png`](../samples/hero-kits-hud-mock.png). Nothing in the game has changed yet.

## How it works, in plain words

- **Every hero has one pool.** Spell-casters (holy, mystic, arcane and spirit heroes: 17 of them) use **mana**, a big
  blue pool of 100 that refills slowly, faster still while nobody is hitting them. Fighters (the other 28) use
  **stamina**, a small gold pool of 60 that refills quickly and also when they are hit. Stamina heroes use cheaper
  skills about every 5 seconds; mana heroes cast bigger spells about every 9.
- **Two skills cost the pool.** Skill 1 from level 1, skill 2 from level 10. The hero casts them on its own, choosing
  sensible targets: heals go to the most hurt, blasts to the biggest crowd. A hero holds back skill 1 when its better
  skill 2 is nearly affordable.
- **The ultimate is yours.** It opens at level 30 and fills a separate ring round the hero's portrait as the hero deals
  and takes damage: about 20 seconds of fighting, so about once a wave. When it is full the portrait in the new bar at
  the bottom of the screen glows; tap it to fire. An **Auto** switch at the end of the bar fires them for you.
  Auto-replay and the game's own test runs always use Auto.
- **The king's spells stay** as they are, just above the hero bar, with their cards half as tall.
- **Every current skill and ultimate stays**, so its painted effect and its tier 2 and 3 upgrades carry on. Each hero
  gains one new skill, and a few ultimates gain a twist.

## Ten of the reworked heroes

1. **Werewolf, shapeshifter.** Shifts between a quick white hunting wolf whose bites bleed and a great black brute that
   shrugs off blows and hits everything round it. Full Moon is both at once.
2. **Druid, shapeshifter.** Still calls her treant, and can now *become* one for 8 seconds: tougher, and the foes beside
   her must strike her.
3. **Kitsune, shapeshifter.** Takes the shape of the strongest foe on the field, with its looks, its reach and its attack.
4. **Beastmaster, summoner.** Calls wolves, then sets the whole pack on one foe.
5. **Reaper, summoner.** The foes he reaps rise as wraiths and fight for him for a while.
6. **Mummy, puppeteer.** Binds the hardest-hitting foe in his bandages and walks it into its own friends.
7. **Buccaneer, gambler.** Rolls two dice: a feeble cut on a bad roll, a triple-strength blow and haste for everyone
   on doubles.
8. **Time Witch, time-bender.** Rewinds a badly hurt friend four seconds: its health and its place come back.
9. **Paladin, martyr.** Takes half the wounds of every friend near him on himself, healing from what his shield blocks.
10. **Dread Pirate, chain-reaction bomber.** Rolls powder kegs that set off the battlefield's own powder barrels, one
    after another.

Others: the Juggernaut raises a rampart out of the ground, the Kraken Mate floods it, the Gorgon's stone foes stay
on as statues, the Yamabushi blows arrows back at the archers, the Great Sage refills friends' mana, the Tyrant
condemns a foe for the whole party, the Satyr pipes foes into a huddle for the mages.

## Questions for you

Auto on or off by default; whether heroes may now be a little further apart in strength; whether the Warlock should
summon an imp; ultimates by tap in the Last Stand and the Calamity too; how often ultimates should fire; and whether
plain effects are fine for the new skills until their own paintings are made. Details in section 11 of the design.
