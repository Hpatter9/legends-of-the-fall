## More foes and real bosses

Three new bands of ordinary foes (orcs, demons, ogres), and a real boss on every fifth stage in place of the old
boss boost.

**The data** (`src/sim/foes.ts`): new kinds with their sprites from `src/art/units/hk_*.png` and the forest, boar,
devil and shaman sheets, each scaled so `figure * scale` is about 46 px like the other foes. Orc grunts, archers and
brutes; imps, demons and ogres. The bosses: Orc Warlord, Demon Lord, Horned Ogre, three Forest Bosses, Boar King,
Devil Leader and Shaman King, each with boss stats (hp 350 to 700, more attack than its kind). `BOSS_IDS` lists them.

**The bands**: `FOE_BANDS` holds every band by name, as before. `FIELD_BANDS` are the ordinary bands in turn
(the six old ones, then orcs, demons and ogres). `BOSS_BANDS` are the bosses in turn, one per boss stage; each boss
band's first foe is its boss, with four escorts from a matching band (the warlord with orcs, the demon lord and the
devil leader with imps and demons, the horned ogre with ogres and imps, the boar king with minotaurs, the shaman king
with skeletons, the forest bosses with satyrs, werewolves and gorgons).

**The bosses' skills** (`src/sim/abilities.ts`): a boss has a kit like a hero's and fires its skill when its charge
fills (it charges as the heroes do, a little faster). Ground Slam (the warlord) lands on the 3x3 around the hero
crowd; Summon Imps (the demon lord) calls two imps beside it once it has none left; Hellfire (the devil leader) is a
meteor; Horned Shove (the horned ogre) is the wind gust; Tusk Flurry (the boar king) is Thousand Fists; Spirit Ward
(the shaman king) is Hold the Line for its own foes. The forest bosses have no skill.

**The stage** (`src/sim/run.ts`): `BOSS` is now only a size, 1.5, so a boss is drawn half as big again; its kind
carries its own stats. `bandFor` gives a boss stage the next boss band, and any other stage the next field band.
`stageBoost` still grows every foe's hp and attack by stage.

**Balance** (`readyBattle`, all five heroes, seeds 1 to 40; the heroes' win rate, the test wants 8 to 32 of 40):

| Band | Heroes win |
| --- | --- |
| orcs | 27 of 40 |
| demons | 29 of 40 |
| ogres | 26 of 40 |
| warlord (boss) | 15 of 40 |
| demonLord (boss) | 17 of 40 |
| hornedOgre (boss) | 15 of 40 |
| forestBoss1 | 19 of 40 |
| forestBoss2 | 19 of 40 |
| forestBoss3 | 21 of 40 |
| boarKing | 9 of 40 |
| devilLeader | 11 of 40 |
| shamanKing | 12 of 40 |

These are the bare bands. A real stage also boosts every foe by its stage (1.12 per stage after the first). With the
five starting heroes, on the same seeds, stage 1 is won 30 of 40, stage 2 6 of 40, and stage 3 on is not won at all.
That curve is the same on the commit before this one (it is the heroes' squad, not these foes), so it is left alone.

**Tests** (`test/bosses.test.ts`): each new band starts five foes; each boss band leads with exactly one boss, and each
boss stage meets exactly one boss drawn at 1.5; each boss with a skill fires it when charged; a Demon Lord summons only
when it has no imps left; the Warlord's slam lands on the heroes beside it. `test/foes.test.ts` already checks every
band's win rate and that each band's fight ends.

**Not done**: the forest, boar, devil and shaman sheets are drawn facing left (`facesRight: false` in
`sheets.json`), but `unitView.ts` flips a foe by its facing and assumes the sheets face right, so those four look
reversed half the time. The page's "next board" rotation (`main.ts`) walks `FOE_BANDS`, so it now reaches the boss
bands too; that is for the owner to decide.
