# Tavern life: art (52 images)

For Antigravity, working in the repo hpatter9/legends-of-the-fall.

The Heroes tab is a side-view pixel-art tavern, three rooms wide (the bar room, the hearth hall and the games room), where every hero
the player owns spends the evening at a spot of their own. Each hero now does one fixed thing there, chosen for their character: drinks
at the bar, plays darts, sings on the stage, arm-wrestles, dozes, reads... Today these are faked with the heroes' battle sprites and a
few small props. This brief asks for the real thing: **one activity sheet for each of the 45 heroes**, **Gwen Tallow, the tavern
keeper, standing behind the bar**, and **six small props**.

**The rule for everything here:** original art for this game, not based on any other game.

## What to do

1. **Paint each image below** and save it at `art-source/tavern-life/<folder>/<key>.png` (each section names its folder: `heroes`,
   `keeper` or `props`).
2. **Make one commit** on a new branch **`art/tavern-life`**, branched from `main`. Change only files in `art-source/tavern-life/`.
3. **Open a pull request** into `main`, titled **"Tavern life art"**. Don't merge it, and don't change any game code, `CREDITS.md` or
   `package.json`. The director brings the art into the game (`python3 tools/tavern-life/bring.py`, which checks and shrinks each
   picture into `src/art/tavern/life/`; the game picks every one up by its name with no code change) and merges.

## The look

- **Pixel art in the heroes' own style.** Each hero must be instantly recognisable as the same character as their battle sprite:
  the same design, colours, armour, hair, weapon and proportions. Every hero's battle sheet is in the repo (named below, under
  "Look"); copy the character from its idle row. Clean pixel clusters, a 1 px dark outline, no blur, no soft brushwork, no
  anti-aliased edges against the background.
- **The tavern's light**: warm firelight and lamplight from above and from the hearths: amber highlights, deep brown shadows. See
  `src/art/tavern/` (the walls, the bar, the chairs, stools and benches) for the room's palette and scale.
- **Seen from the side**, like the tavern and the battle sprites: a straight side view, the figure turned a little towards the viewer.
- **Transparent background** everywhere: no floor, no shadow under the feet (the game draws it), no text.

## The sheets (every hero sheet, and Gwen's)

- **Square cells of 256 x 256 px**, in rows, on a transparent background. The four corner pixels of every cell must be clear.
- **The figure faces right.** The game turns it round for heroes who face left.
- **Size and baseline:** a hero standing upright is **192 px from the top of the head to the soles of the feet**, the feet resting on
  a line **16 px above the cell's bottom edge**, centred across the cell. A seated hero is shorter, of course; the seat stands on the
  same line. Keep the scale the same in every frame and every row (no zooming), and the feet (or the seat) on the same line.
- **Frames run left to right**; a row has **4 to 8 frames**, and the first empty cell ends it (rows may differ in length; the sheet is
  as wide as its longest row). Each row should loop smoothly back to its first frame.
- **The seat is painted in the sheet** for a seated hero: the chair, bar stool or bench named for them, side on, in the tavern's own
  style (match `src/art/tavern/chair.png`, `stool.png` and `bench.png`, scaled up to the figure). The game then draws no seat of its
  own under them.
- **Props in the hands are painted in the sheet** (the tankard, the cards, the book, the instrument, the dart before it is thrown).
  Things that leave the hand (a thrown dart in flight, notes in the air, steam, z's) are drawn by the game: leave them out.

## A. The heroes (`heroes`, 45 images)

**Each sheet is two rows**: row 1 the **loop** (the steady activity), row 2 the **beat** (the occasional action that breaks it, played
once every few seconds). The heroes are grouped by activity below; under each heading is what the two rows show, then each hero with
their seat, why they do this, and the battle sheet to copy their look from. Partners (the arm-wrestle, a teller and the listeners) are
painted separately, each facing right; the game puts them face to face.

### Drinking (4)

- **Row 1, the loop** (4 to 8 frames, plays round and round): holding a tankard at the chest, breathing, a small sway.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): raises the tankard to the mouth, a long swig, lowers it with a contented sigh.

- `heroes/archer.png`: **Natsu, Eye of the High Crags** (the Archer), sitting on a tall bar stool with a red cushion (painted in the sheet). Natsu at the bar: "a hill, a quiver and a quiet afternoon" is a tankard on a stool. Look: `src/art/units/hero_samurai_archer.png` (idle row).
- `heroes/ranger.png`: **Inti, Warden of the Snares** (the Ranger), standing. Inti standing by the benches: the warden of the snares has a quiet pint. Look: `src/art/units/hero_res_ranger.png` (idle row).
- `heroes/kraken.png`: **Skerry, Child of the Undertow** (the Kraken Mate), standing. Skerry by the wall: a child of the undertow drinks like the sea. Look: `src/art/units/hero_res_kraken.png` (idle row).
- `heroes/dreadPirate.png`: **Harrow, Twice-Drowned Captain** (the Dread Pirate), standing. Harrow under the dartboard: the twice-drowned captain keeps the score with a tankard. Look: `src/art/units/hero_res_dread_pirate.png` (idle row).

### A hot cup (3)

- **Row 1, the loop** (4 to 8 frames, plays round and round): both hands round a steaming cup held at the chest.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): blows on it and takes a careful sip.

- `heroes/knight.png`: **Kwame, Shield of the Dawn** (the Knight), sitting on a tall bar stool with a red cushion (painted in the sheet). Kwame at the bar: sworn to "a sensible four o'clock tea", so a steaming cup, not ale. Look: `src/art/units/hero_soldier.png` (idle row).
- `heroes/druid.png`: **Isla, Voice of the Old Oaks** (the Druid), sitting on a wooden tavern chair (painted in the sheet). Isla at the left round table: an herbal brew, steaming, for the voice of the old oaks. Look: `src/art/units/hero_res_druid.png` (idle row).
- `heroes/priestess.png`: **Linnea, Halo of the Undying** (the High Priestess), sitting on a tall bar stool with a red cushion (painted in the sheet). Linnea on the second table's stool: a quiet cup, keeping an eye on the sleeper. Look: `src/art/units/hero_res_priestess.png` (idle row).

### Eating (4)

- **Row 1, the loop** (4 to 8 frames, plays round and round): chewing, a bite of food in hand.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): takes a big bite.

- `heroes/peasant.png`: **Minh, Banner of the Commons** (the Peasant), standing. Minh at the end of the bar, standing: a militiaman's supper eaten on his feet. Look: `src/art/units/hero_res_peasant.png` (idle row).
- `heroes/werewolf.png`: **Vuk, Hunter of the Full Moon** (the Werewolf), standing. Vuk standing between the tables: the hunter gnaws a joint of meat. Look: `src/art/units/hero_res_werewolf.png` (idle row).
- `heroes/paladin.png`: **Karim, Bearer of Wounds** (the Paladin), sitting on a wooden tavern chair (painted in the sheet). Karim at the long table: the bearer of wounds eats a proper meal to mend. Look: `src/art/units/hero_res_paladin.png` (idle row).
- `heroes/juggernaut.png`: **Kerem, the Marching Wall** (the Juggernaut), sitting on a wooden tavern chair (painted in the sheet). Kerem at the second card table: the marching wall needs feeding. Look: `src/art/units/hero_res_juggernaut.png` (idle row).

### Sharpening or cleaning a weapon (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): the weapon across the lap or held low, a whetstone or rag drawn along it.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): holds the weapon up to the light and checks the edge.

- `heroes/samurai.png`: **Kenji, Sword of the Eastern Sea** (the Samurai), sitting on a tall bar stool with a red cushion (painted in the sheet). Kenji at the bar: "one blade, one oath": he tends the blade, not the drink. Look: `src/art/units/hero_res_samurai.png` (idle row).
- `heroes/gunslinger.png`: **Maeve, Deadeye of the Marches** (the Gunslinger), sitting on a low wooden bench (painted in the sheet; show only the part under them). Maeve on the right bench: a deadeye cleans her pistols before anything else. The light or spark is a bright gold glint. Look: `src/art/units/hero_res_gunslinger.png` (idle row).

### Flipping a coin (1)

- **Row 1, the loop** (4 to 8 frames, plays round and round): idle, a coin in the fingers.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): flicks the coin up with the thumb and catches it.

- `heroes/kunoichi.png`: **Ayame, Smoke on the Rooftops** (the Kunoichi), sitting on a tall bar stool with a red cushion (painted in the sheet). Ayame at the bar: paid up front, so she flips the coin she was paid. Look: `src/art/units/hero_res_kunoichi.png` (idle row).

### A little magic (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): one palm open and up, a small light dancing over it, idly watched.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): closes the hand on the light and opens it again: the light changes shape.

- `heroes/wizard.png`: **Ravi, Kindler of Pyres** (the Fire Wizard), sitting on a tall bar stool with a red cushion (painted in the sheet). Ravi at the bar: a pyromancer keeping a little flame alive on his palm. The light or spark is a small flame. Look: `src/art/units/hero_res_wizard.png` (idle row).
- `heroes/illusionist.png`: **Luana, Weaver of Mirrors** (the Illusionist), sitting on a low wooden bench (painted in the sheet; show only the part under them). Luana on the left bench: the weaver of mirrors makes little lights for the room. The light or spark is a twinkling violet star-light. Look: `src/art/units/hero_res_illusionist.png` (idle row).

### Playing darts (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): standing side on to the board, weighing a dart, taking aim.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): the throw: arm back, snap forward, follow through.

- `heroes/lancer.png`: **Bataar, Thunder of the Steppe** (the Lancer), standing. Bataar at the line: a lancer throws the dart like a lance. Look: `src/art/units/hero_res_lancer.png` (idle row).
- `heroes/dragoon.png`: **Tiziri, Crowned Wyvern Rider** (the Queen Dragoon), standing. Tiziri at the line behind him: the wyvern rider throws in turn with Bataar. Look: `src/art/units/hero_res_dragoon.png` (idle row).

### Singing on the stage (1)

- **Row 1, the loop** (4 to 8 frames, plays round and round): playing the instrument and singing, swaying to the tune.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): a big flourish: head back on a high note.

- `heroes/wolfBard.png`: **Lovell, Wolfsbane Bard** (the Wolf Bard), standing. Lovell on the stage: the wolfsbane bard sings for the house. Plays the lute he carries in battle. Look: `src/art/units/hero_res_wolf_bard.png` (idle row).

### Playing an instrument (1)

- **Row 1, the loop** (4 to 8 frames, plays round and round): playing, tapping a foot.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): a trill, the instrument lifted.

- `heroes/satyr.png`: **Dorion, Piper of the Revel** (the Satyr), sitting on a wooden tavern chair (painted in the sheet). Dorion at the left round table: the piper of the revel never stops playing. Holds shepherd's pipes. Look: `src/art/units/hero_res_satyr.png` (idle row).

### Dancing (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): a stepping jig on the spot to the bard's beat.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): a spin.

- `heroes/beastmaster.png`: **Itzel, Caller of the Grey Pack** (the Beastmaster), standing. Itzel by the stage: the caller of the grey pack dances like the pack runs. Look: `src/art/units/hero_res_beastmaster.png` (idle row).
- `heroes/timeWitch.png`: **Adaeze, Starlit Hourglass** (the Time Witch), standing. Adaeze before the stage: she dances, a beat ahead of the tune. Look: `src/art/units/hero_res_time_witch.png` (idle row).

### Cheering the bard (1)

- **Row 1, the loop** (4 to 8 frames, plays round and round): clapping along, nodding to the beat.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): a fist (or tankard) raised with a cheer.

- `heroes/arcBlade.png`: **Minjun, Spark-Forged Blade** (the Arc Blade), standing. Minjun beside the stage: the spark-forged blade claps and cheers the bard. Look: `src/art/units/hero_res_arc_blade.png` (idle row).

### Playing cards (3)

- **Row 1, the loop** (4 to 8 frames, plays round and round): a hand of cards held in a fan, studying it.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): slaps a card down on the table.

- `heroes/sage.png`: **Seydou, Reader of the Stars** (the Great Sage), sitting on a wooden tavern chair (painted in the sheet). Seydou at the first card table: the reader of the stars counts every card. Look: `src/art/units/hero_res_sage.png` (idle row).
- `heroes/demonSwordsman.png`: **Aram, Host of the Hungry Steel** (the Demon Swordsman), sitting on a wooden tavern chair (painted in the sheet). Aram at the first card table: a blood-pact man plays for stakes. Look: `src/art/units/hero_res_demon_swordsman.png` (idle row).
- `heroes/tyrant.png`: **Edmund, the Unbending Verdict** (the Tyrant), sitting on a tall bar stool with a red cushion (painted in the sheet). Edmund on the first table's stool: the unbending verdict plays a hard hand. Look: `src/art/units/hero_res_tyrant.png` (idle row).

### Telling a story (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): talking with the hands, leaning in.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): the big moment: arms flung wide.

- `heroes/lightningMage.png`: **Malia, Herald of the Storm** (the Lightning Mage), sitting on a wooden tavern chair (painted in the sheet). Malia at the round table: the herald of the storm tells the table a storm story. Look: `src/art/units/hero_res_lightning_mage.png` (idle row).
- `heroes/samuraiCommander.png`: **Hideo, Holder of the Bridge** (the Samurai Commander), sitting on a wooden tavern chair (painted in the sheet). Hideo at the right round table: the holder of the bridge tells of the bridge. Look: `src/art/units/hero_res_samurai_commander.png` (idle row).

### Listening to a story (3)

- **Row 1, the loop** (4 to 8 frames, plays round and round): leaning on the table, chin on a hand, rapt.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): sits back in surprise, or laughs.

- `heroes/wanderer.png`: **Rhys, Brewer of the Long Road** (the Wanderer), sitting on a wooden tavern chair (painted in the sheet). Rhys at the round table: a road-worn brewer, happy to listen to Malia. With **Malia** (`lightningMage`). Look: `src/art/units/hero_res_wanderer.png` (idle row).
- `heroes/kitsune.png`: **Kohaku, Amber Fox of Many Faces** (the Kitsune), sitting on a tall bar stool with a red cushion (painted in the sheet). Kohaku on the right table's stool: the fox listens, ears up, all mischief. With **Hideo** (`samuraiCommander`). Look: `src/art/units/hero_res_kitsune.png` (idle row).
- `heroes/gorgon.png`: **Xanthe, Lady of the Stone Gaze** (the Gorgon), sitting on a tall bar stool with a red cushion (painted in the sheet). Xanthe on the stool at the round table: rapt, and nobody turns to stone. With **Malia** (`lightningMage`). Look: `src/art/units/hero_res_gorgon.png` (idle row).

### Reading (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): an open book held up, eyes moving.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): turns a page.

- `heroes/cleric.png`: **Selam, Lantern of Mercy** (the Cleric), sitting on a wooden tavern chair (painted in the sheet). Selam at the long table: the lantern of mercy reads her prayer book. Look: `src/art/units/hero_res_cleric.png` (idle row).
- `heroes/warlock.png`: **Zofia, Black-Pact Warlock** (the Warlock), sitting on a tall bar stool with a red cushion (painted in the sheet). Zofia on the left table's stool: the black-pact warlock reads her dark book. Look: `src/art/units/hero_res_warlock.png` (idle row).

### Dozing (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): slumped, head nodding, slow breathing.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): a snore and a start, then settles again.

- `heroes/shambler.png`: **Hobb, the Unburied** (the Shambler), sitting on a wooden tavern chair (painted in the sheet). Hobb at the right round table: the unburied nods off through Hideo's war story. Look: `src/art/units/hero_res_shambler.png` (idle row).
- `heroes/siegeBot.png`: **Bastion, Clocktower Cannon** (the Siege Bot), sitting on a wooden tavern chair (painted in the sheet). Bastion at the second card table: the clocktower cannon powered down for the night. Look: `src/art/units/hero_res_siege_bot.png` (idle row).

### Meditating (1)

- **Row 1, the loop** (4 to 8 frames, plays round and round): still, eyes closed, hands together, slow breathing.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): one long out-breath.

- `heroes/ninjaMonk.png`: **Jiro, Fist of the Quiet Vow** (the Ninja Monk), sitting on a wooden tavern chair (painted in the sheet). Jiro in the chair by the little hearth: the fist of the quiet vow, sitting still. Look: `src/art/units/hero_res_ninja_monk.png` (idle row).

### Warming by the fire (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): hands held out to the fire, rubbing them now and then.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): rubs the hands together hard and blows on them.

- `heroes/yamabushi.png`: **Kazan, Master of the Gale** (the Yamabushi Tengu), sitting on a tall bar stool with a red cushion (painted in the sheet). Kazan on the stool by the little hearth: a mountain hermit warming his hands. Look: `src/art/units/hero_res_yamabushi.png` (idle row).
- `heroes/mummy.png`: **Seneb, Binder of the Sands** (the Mummy), standing. Seneb at the fire: three thousand years in a cold tomb, so the hands go to the flames. Look: `src/art/units/hero_res_mummy.png` (idle row).

### Leaning, arms crossed (3)

- **Row 1, the loop** (4 to 8 frames, plays round and round): arms crossed, weight on one leg, watching the room.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): a slow look round and back.

- `heroes/karasu.png`: **Kurogane, Iron-Beaked Raider** (the Karasu Tengu), standing. Kurogane standing in the middle: the raider leans and eyes everyone's purse. Look: `src/art/units/hero_res_karasu.png` (idle row).
- `heroes/mercenary.png`: **Kian, Bane of the Mighty** (the Mercenary), standing. Kian at the fire: a bounty hunter leans with his arms crossed and watches the room. Look: `src/art/units/hero_res_mercenary.png` (idle row).
- `heroes/reaper.png`: **Vesper, Keeper of the Last Hour** (the Reaper), standing. Vesper in the far corner: the keeper of the last hour leans and waits, as reapers do. Look: `src/art/units/hero_res_reaper.png` (idle row).

### Rolling dice (1)

- **Row 1, the loop** (4 to 8 frames, plays round and round): shaking dice in a loose fist.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): throws them and leans to see.

- `heroes/buccaneer.png`: **Tiago, Hook of the Salt Isles** (the Buccaneer), standing. Tiago at the fire: the gambler rolls his dice on the hearthstone. Look: `src/art/units/hero_res_buccaneer.png` (idle row).

### Tinkering (1)

- **Row 1, the loop** (4 to 8 frames, plays round and round): fiddling with a joint or the weapon's workings, a tool in hand.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): a spark jumps; shakes the hand.

- `heroes/rifleBot.png`: **Rook-7, Brass Sentinel** (the Rifle Bot), standing. Rook-7 at the fire: the brass sentinel tends his workings by the warmth. The light or spark is a yellow electric spark. Look: `src/art/units/hero_res_rifle_bot.png` (idle row).

### Arm-wrestling (2)

- **Row 1, the loop** (4 to 8 frames, plays round and round): elbow on the table, hands locked with the rival, straining.
- **Row 2, the beat** (4 to 8 frames, plays once every few seconds): nearly wins, the arms tip, then back to the middle.

- `heroes/minotaur.png`: **Asterion, Horn of the Labyrinth** (the Minotaur), sitting on a tall bar stool with a red cushion (painted in the sheet). Asterion on the other front stool: the only one in the house who can match Eirik. With **Eirik** (`barbarian`). Look: `src/art/units/hero_res_minotaur.png` (idle row).
- `heroes/barbarian.png`: **Eirik, Red Axe of the North** (the Barbarian), sitting on a tall bar stool with a red cushion (painted in the sheet). Eirik on the front stool of the long table: the red axe arm-wrestles the minotaur. With **Asterion** (`minotaur`). Look: `src/art/units/hero_res_barbarian.png` (idle row).

## B. The keeper (`keeper`, 1 image)

- `keeper/gwen.png`: **Gwen Tallow**, who keeps the tavern and hands out its quests, standing behind the bar (the bar hides her
  below the hips, but paint the whole figure). Match her painted portrait, `art-source/eidolons/givers/gwen-tallow.png` on the branch
  `origin/art/eidolons-1`: a woman in her fifties, broad-shouldered, her sleeves rolled up, a brown leather apron over a russet dress
  with a cream collar, a long grey braid, a warm half-smile, a pewter mug. The same pixel style, scale and baseline as the heroes
  (192 px tall standing), 256 px cells, facing right, **three rows**:
  - **Row 1, idle** (4 to 6 frames): standing easy at the bar, a cloth over her shoulder, breathing, a glance about the room.
  - **Row 2, wipe** (6 to 8 frames): polishing a pewter mug with the cloth, turning it in her hands, holding it up to the light.
  - **Row 3, talk** (4 to 6 frames): leaning on the bar towards the viewer, one hand open in a "have I got a job for you" gesture
    (it plays when the player taps her for a quest).

## C. The props (`props`, 6 images)

Small single objects, **64 x 64 px**, transparent background, the object centred and filling most of the picture, in the same pixel
style (they are shown at 16 px, so: a bold, simple shape, a dark outline, two or three tones). They stand in where the game draws a
prop itself (in the hands of a hero who has no sheet yet, and anything that leaves the hand).

- `props/tankard.png`: a wooden tankard with iron bands and a handle, foaming ale on top; handle on the right.
- `props/cup.png`: a small cream earthenware cup of tea, with no steam (the game adds the steam).
- `props/dart.png`: a single dart pointing right: a steel point, a wooden shaft, red feather flights.
- `props/cards.png`: one playing card, face up, upright, a red mark on a cream face, a dark border.
- `props/dice.png`: one bone-white die with dark pips, seen a little from above.
- `props/coin.png`: one gold coin, face on, with a simple stamped crown.

## Checks before the pull request

- 45 files in `heroes/`, one in `keeper/`, six in `props/`, named exactly as above (52 images).
- Every hero and Gwen: cells of exactly 256 x 256 px, two rows (three for Gwen), 4 to 8 frames in each row, corners clear, the figure
  facing right, 192 px tall standing, the feet or the seat on the line 16 px above the cell's bottom.
- Every hero looks like their battle sprite.
- `python3 tools/tavern-life/bring.py --check` lists no faults.
