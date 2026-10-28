// The cinematics made once for many: the first clear of each army (nine), a hero awakening (all 45), a castle build (each building), the Last Stand's milestone waves, and a
// boss changing form (a cut-in of a few seconds, the first time each boss does). Each family is one shape filled in from a table, so a new
// army, hero or building is a row, not a script. Pure data; it imports only the kit, the fighters' table and the lore
// (not the armies or the battle, which load this file's way round).

import { say, tell, wide, close, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import { ALL_HEROES, UNITS } from './units';

/* ------------------------------------------------------------ the first clear of each army */

interface ArmyClear {
  army: string;
  name: string;
  area: Area;
  /** The scene's title and blurb, and its first shot's caption when "<name> cleared" is too long for it. */
  title: string;
  blurb: string;
  cap?: string;
  /** The army's last boss, and one of its escort (fighter ids). */
  boss: string;
  escort: string;
  /** What the narrator says as the boss kneels, the boss's last words, the escort's remark, the heroes' gloat, the closing line. */
  setup: string;
  last: string;
  remark: string;
  gloat: [string, string];
  tail: string;
}

const CLEARS: ArmyClear[] = [
  {
    army: 'orcs', name: 'Orc Warband', area: 'warcamp', boss: 'orcWarlord', escort: 'orcGrunt',
    title: 'Orc Warband: Routed',
    blurb: 'The Orc Warlord takes a knee to catch his breath and lodge an administrative complaint.',
    setup: 'The Orc Warlord dropped onto one knee, the traditional tribal gesture meaning \'mild setback\'.',
    last: 'THIS ENGAGEMENT IS VOID! TAKE DOWN THAT STATEMENT IN THE CHRONICLES!',
    remark: 'Who has the quill, boss? Someone took it to draw on the wall.',
    gloat: ['He will require a remarkably large scroll to list all the grievances.', 'Shall we inform his dear mother, or will the surviving grunts draft the letter?'],
    tail: 'The remaining orcs held a brief symposium on maternal correspondence. The heroes waited politely.',
  },
  {
    army: 'undead', name: 'Undead Legion', area: 'graveyard', boss: 'lichKing', escort: 'skeleton',
    title: 'Undead Legion: Taking a Number',
    blurb: 'The Lich King falls apart with poise, and joins the queue for reincarnation.',
    setup: 'The Lich King collapsed into a tidy pile of bleached calcium with immense theatrical dignity.',
    last: 'DEATH IS MERELY A PAUSE! ...HOLD ON, I AM FOURTH IN THE QUEUE FOR REINCARNATION.',
    remark: 'Please take a number, your majesty.',
    gloat: ['I always assumed the underworld ran more smoothly.', 'Is it bad form to leave a skeleton waiting in the queue?'],
    tail: 'The bony cohort filed quietly back into their crypts. Several noted their upcoming appointments.',
  },
  {
    army: 'beasts', name: 'Beast Packs', area: 'plains', boss: 'boarKing', escort: 'wolfWhite',
    title: 'Beast Packs: Dispersed',
    blurb: 'The Boar King examines the clover very closely, insisting he was never actually felled.',
    setup: 'The Boar King does not fall. He merely undertook an urgent, horizontal inspection of the moss.',
    last: 'A MONARCH OF THE TUSK NEVER FALLS! HE MERELY... INSPECTS THE SOIL!',
    remark: 'The pack has several pressing concerns about the inspection, sire.',
    gloat: ['Sit. Lie down. Good boar. Stay right there until morning.', 'He is an exceptionally bulky pig to look so deeply heartbroken over a skirmish.'],
    tail: 'The pack drifted off across the heather, casting rather embarrassed glances over their shoulders.',
  },
  {
    army: 'wildwood', name: 'The Wildwood', area: 'forest', boss: 'forestBoss3', escort: 'groveSatyr1',
    title: 'The Wildwood: Trimmed',
    blurb: 'The Spearlord leans heavily upon his shaft, which was not designed for structural support.',
    setup: 'The Grove Spearlord leaned heavily upon his ash lance, bending it in an undignified arch.',
    last: 'THE SACRED TIMBER WILL HEAR OF THIS INDIGNITY!',
    remark: 'The sacred timber is away at a canopy meeting. May I take a message?',
    gloat: ['Inform the grove we pinned a polite eviction notice to the nearest birch.', 'It truly was an exceptionally picturesque thicket before we trampled it.'],
    tail: 'Deep within the grove, an ancient elder tree took offence. The leaves rustled in bitter agreement.',
  },
  {
    army: 'labyrinth', name: 'The Labyrinth', area: 'temple', boss: 'minotaurChampion', escort: 'mazeMino1',
    title: 'The Labyrinth: Solved',
    blurb: 'The Minotaur Champion takes a seat in the centre of his puzzle, thoroughly outmanoeuvred.',
    setup: 'The Minotaur Champion sat heavily upon the flagstones of his puzzle, puffing through his nose.',
    last: 'THE LABYRINTH... YOU SIMPLY WALKED STRAIGHT DOWN THE CORRIDOR!',
    remark: 'We did put up several helpful arrows, boss. For the travellers.',
    gloat: ['The wooden arrows did say \'This Way to the Minotaur\', to be fair.', 'We felt it would have been terribly rude to wander into the dead ends on purpose.'],
    tail: 'The maze was gifted a brand-new sign: \'Under New Management, Currently Strolling in Circles\'.',
  },
  {
    army: 'ogres', name: 'Ogre Clans', area: 'highlands', boss: 'hornedOgre', escort: 'clanOgre',
    title: 'Ogre Clans: Luncheon',
    blurb: 'The Horned Ogre sways like a collapsing haystack and calls a recess for broth.',
    setup: 'The Horned Ogre wobbled twice, pondered the merits of standing, and chose to sit with a thud.',
    last: 'THE CRAG DOES NOT CRUMBLE... WAIT, WHO BROUGHT THE COLD PIES?',
    remark: 'It is mutton broth today, chief. We had a rather heated shouting match about it.',
    gloat: ['I propose we declare an armistice in the interest of personal nourishment.', 'The smell of mutton broth was remarkably distracting throughout the second phase.'],
    tail: 'The ogres adjourned for luncheon. The deliberations extended well into the following Thursday.',
  },
  {
    army: 'infernal', name: 'Infernal Host', area: 'volcano', boss: 'demonLord', escort: 'hellImp',
    title: 'Infernal Host: Appealed',
    blurb: 'The Demon Lord is vanquished, but relies on a technical loophole in the small print.',
    setup: 'The Demon Lord was soundly thrashed, but the sort of thrashed that arrives with a receipt.',
    last: 'THIS SETBACK IS TEMPORARY! MY CONTRACT COVERS THREE SEPARATE RESURRECTIONS!',
    remark: 'Paragraph nine says the guarantee excludes damage by righteous paladins, sire.',
    gloat: ['Always consult a certified notary before signing contracts in brimstone.', 'He always seemed far too fond of reading the microscopic annotations.'],
    tail: 'The imps lodged a formal appeal. It was stamped, countersigned, and cast into the molten basalt.',
  },
  {
    army: 'yokai', name: 'Yokai Night Parade', area: 'shrine', boss: 'oniKing', escort: 'yokaiFox',
    title: 'Night Parade: Concluded',
    blurb: 'The Oni King strikes his sacred thunder drum once, discovering an absence of mallets.',
    setup: 'The Oni King hoisted his great thunder drum, struck it with flourish, and produced only a squeak.',
    last: 'THE CELESTIAL DRUM... HAS BEEN DEPRIVED OF ITS SACRED MALLETS!',
    remark: 'We loaned them to the tengu scouts to crack walnuts, your majesty.',
    gloat: ['A musical instrument is only as fearsome as its percussive accessories.', 'The lanterns were delightfully festive, but the performance has definitely drawn to a close.'],
    tail: 'The midnight parade packed its paper lanterns and set off down the mountain path, humming softly.',
  },
  {
    army: 'golems', name: 'Golem Forge', area: 'forge', boss: 'forgeTitan', escort: 'stoneGolem',
    title: 'Golem Forge: Cooling',
    blurb: 'The Forge Titan halts with a heavy groan, resembling a kettle cooling on the range.',
    setup: 'The Forge Titan seized up with a grinding screech, then came to a gentle halt like an iron stove.',
    last: 'FORGE... COOLING. PLEASE DO NOT TOUCH. STILL HOT.',
    remark: 'He is quite serious, you know. You will blister your leather gauntlets.',
    gloat: ['We shall allow the ironwork to reach a sensible room temperature, then.', 'Watch the molten cinder on the grass. And mind your boot soles, everyone.'],
    tail: 'The stone sentinels stood frozen. It was unclear whether this was grief or the fire going out.',
  },
];

const clearScene = (c: ArmyClear): Scene => ({
  id: `clear:${c.army}`,
  title: c.title,
  blurb: c.blurb,
  moment: { kind: 'armyClear', army: c.army },
  family: 'clear',
  cast: {
    boss: { role: `unit:${c.boss}`, x: 400, facing: 'left', scale: 1.5 },
    escort: { role: `unit:${c.escort}`, x: 480, facing: 'left', hidden: true },
    hero: { role: 'party:0', x: 280, facing: 'right', hidden: true },
    mate: { role: 'party:1', x: 240, facing: 'right', hidden: true },
    duchess: { role: 'duchess', x: 190, facing: 'right', hidden: true },
  },
  shots: [
    {
      look: c.area,
      cam: close(['hero', 'boss'], 1),
      fx: ['fadeIn', 'darken'],
      caption: c.cap ?? `${c.name} cleared`,
      acts: [{ who: 'hero', enter: 280, from: 200 }, { who: 'mate', enter: 240, from: 160 }, { who: 'boss', pose: 'hurt' }],
      lines: [tell(c.setup), say('boss', c.last, 'shout')],
    },
    {
      cam: close(['boss', 'escort'], 1.5),
      acts: [{ who: 'escort', enter: 480, from: 575 }],
      fx: ['rumble'],
      lines: [say('escort', c.remark)],
    },
    {
      cam: close(['hero', 'mate', 'duchess'], 1.5),
      acts: [{ who: 'duchess', enter: 190, from: 90, line: 2 }, { who: 'hero', pose: 'strike', line: 0 }],
      lines: [say('hero', c.gloat[0]), say('mate', c.gloat[1]), say('duchess', 'Mehh.')],
    },
    {
      cam: wide(330, 205),
      acts: [{ who: 'boss', pose: 'down' }],
      fx: ['fadeOut'],
      cue: 'boom',
      lines: [tell(c.tail)],
    },
  ],
});

/* ------------------------------------------------------------ a hero awakened */

/** What each hero says as they awaken: the narrator's line about them, then their own words. */
const AWAKE_LINES: Readonly<Record<string, readonly [string, string]>> = {
  knight: ['Sir Aldric held the outer gate for forty winters without questioning the king.', 'I feel three inches taller, and my pauldron seems to have doubled in acreage.'],
  samurai: ['He crossed the eastern strait bearing a single cold katana and a sacred vow.', 'The blade hums with cold fire. I shall attempt not to smile; it ruins my mystique.'],
  kunoichi: ['Moonlit slates and a whisper of wind are all she requires to work.', 'Now with forty percent more theatrical smoke and thirty percent less visibility.'],
  archer: ['He tracked quarry through the frozen passes where one high arrow outmatches three.', 'I believe I can now strike a copper farthing balanced on a badger\'s ear.'],
  wizard: ['His maiden spark flattened a barn; his second demolished the royal aviary.', 'Splendid! The flames are now violet, which usually denotes severe collateral damage.'],
  peasant: ['A rusty pitchfork, iron resolve, and twelve neighbours who all chose today.', 'Look at that! My pitchfork\'s got three shiny prongs and zero rust!'],
  ninjaMonk: ['He swore a solemn oath against cold steel, then swore an equal vow to triumph.', 'My fists are legally classified as battering rams now. Very tranquil.'],
  wanderer: ['She strolled off the king\'s highway at dusk and declined to name her birthplace.', 'A pleasant tingling in the fingertips. And my boots have stopped leaking.'],
  lightningMage: ['Thunderheads dog his wanderings, and neither storm nor scholar knows who leads.', 'Stand back! I am currently emitting enough static to power a small loom!'],
  kitsune: ['A cunning vixen spirit who learned kindness, and then learned to exploit it.', 'Ten out of ten for illumination, though it has made my fur dreadfully poofy.'],
  karasu: ['A winged spirit of the mountain crags, slow to wrath and delighted to dive.', 'Caw! Wingspan expanded, talons freshly whetted, ready to plunge!'],
  yamabushi: ['He meditated in a gale so biting it chiselled stone contours into his marrow.', 'The mountain breath roars in my lungs. Hold tightly to your headgear, lads.'],
  werewolf: ['The maiden full moon was forgiving; the second tore his breeches to rags.', 'A magnificent tingling behind the ears! Who wants to go for a brisk rampage?!'],
  minotaur: ['He navigated the labyrinth by the simple expedient of demolishing the masonry.', 'Horns are pointier! Forehead feels even more suitable for demolition!'],
  satyr: ['He pipes at rustic nuptials, and at border skirmishes when the coin is heavier.', 'A fresh set of brass reeds! Prepare yourselves for an ear-splitting jig!'],
  gorgon: ['She keeps her veil secure in town, unveiling only when pressed by rudeness.', 'The serpents are positively glowing. Do please avert your tender eyes, darlings.'],
  samuraiCommander: ['He defended a stone span with a hundred stalwarts against a thousand.', 'A taller staff! A stiffer weave! The regiment will rally in spotless order!'],
  paladin: ['He took the sacred mantle amidst the carnage and has fought the carnage since.', 'Radiant righteousness achieved! You may wish to don smoked spectacles!'],
  cleric: ['She asks no foolish questions of the wounded, inquiring only regarding tea.', 'The celestial light is lovely, but who is going to scrub the scorched floor?'],
  druid: ['The gnarled oaks obey her command whenever she remembers to ask politely.', 'Roots deepening, briars sharpening! Even the dandelion greens look ferocious!'],
  barbarian: ['He battles as though every fresh laceration were an affectionate promise.', 'AXE IS HEAVIER! VEINS ARE WIDER! VOCABULARY UNCHANGED!'],
  ranger: ['She conceals her spring snares in the dark and looses her shafts at daybreak.', 'Snares reset with tempered steel. Mind where you place your clumsy boots.'],
  warlock: ['He signed an eldritch document without bothering to read the fine print.', 'Clause nine unlocked! My patron sends his regards and a slightly hotter curse.'],
  illusionist: ['There is a phantom before you, another behind, and a third slipping off.', 'Now you see three of me, all exquisitely coiffed and equally lethal.'],
  gunslinger: ['A deliberate trigger pull, extraordinary reach, and not a grain wasted.', 'Rifling tightened, hammer polished. First one to blink gets ventilated.'],
  shambler: ['He cannot recall the details of his passing, and feels no urge to investigate.', 'Hrrngh. Fresh stitching on the elbow. Hrrngh. Very sprightly.'],
  rifleBot: ['Assembled for an ancient crusade that ended before its boiler was stoked.', 'NEW COGS FITTED. FIRING SPEED: INDISCREET.'],
  mercenary: ['He takes up arms for coin, though he harbours rigid professional standards.', 'My rates just doubled. You get what you pay for, majesty.'],
  mummy: ['Swaddled in three centuries of dry linen and an unresolved personal grudge.', 'Re-wound in finest ceremonial damask. Do try not to snag the trailing edge.'],
  buccaneer: ['She snags a backline shooter with a wink and cuts him down before it fades.', 'Shinier cutlass, wider hat, and double the swashbuckling swagger!'],
  wolfBard: ['A mournful dirge for the dying and a brisk jig for his companions.', 'A mournful minor key with seventy percent more baritone resonance! Awoo!'],
  beastmaster: ['The grey timber wolves answered her copper whistle and never departed.', 'The pack smells the blood of heroes. Heel, boys, until the horn sounds.'],
  kraken: ['He sailed with the great beast until it grew weary and coughed him ashore.', 'The abyssal depths surge within me! Anyone fancy a salt-water bath?'],
  lancer: ['A levelled spear, iron stirrups, and a destrier that ignores the king.', 'Spurs polished to a blinding glare! Clear the lane, you rabble on foot!'],
  reaper: ['Death is an administrative trade like any other, and she works the late watch.', 'The ledgers have been checked. Several names have moved up the queue.'],
  timeWitch: ['She cradles an unseen hourglass whose sands run backward on command.', 'I already enjoyed this promotion three minutes ago. Still quite nice, though.'],
  arcBlade: ['A clockwork champion built to blink into the press and discharge a thunderbolt.', 'Coils humming fit to split an oak! Mind the metal!'],
  dreadPirate: ['Drowned twice over, and bored to tears by the clammy repetition.', 'Risen with a fresh broadside in the spectral cannons! Anchors aweigh!'],
  siegeBot: ['Constructed to level granite curtain walls with mechanical indifference.', 'MORTAR BORE INCREASED BY FOUR INCHES. DAMAGE ASSURED.'],
  priestess: ['The radiant halo is functional; she knits deep hurts and raises bastions.', 'The aura expands! Stand within the golden circle and be preserved.'],
  dragoon: ['The wyvern queen sports her own iron diadem and never loses her stirrups.', 'Barnaby has sprouted crimson scales! Clear the skies or be roasted medium!'],
  juggernaut: ['A castle rampart that grew weary of stationary life and learned to march.', 'Mortar reinforced with enchanted lime. I am now officially a mountain range.'],
  sage: ['He contemplated the heavens so long the constellations began taking notes.', 'The cosmos has yielded another footnote! Highly destructive, and cited.'],
  demonSwordsman: ['He drinks what he cleaves, and the fiend bound in the iron drinks him.', 'The blade is howling with glee. Do ignore the ominous reddish vapour.'],
  tyrant: ['He governs by iron decree, shattering the insolent and rallying the ranks.', 'My imperial authority is officially doubled! Kneel with greater enthusiasm!'],
};

const AWAKE_AREAS: Area[] = ['highlands', 'forest', 'snow', 'desert', 'volcano', 'dungeon'];

const awakenScene = (kind: string, i: number): Scene => ({
  id: `awaken:${kind}`,
  title: `${UNITS[kind].name}: Awakening`,
  blurb: 'A hero awakens: radiant light, a heightened presence and a dry observation.',
  moment: { kind: 'awaken', hero: kind },
  family: 'awaken',
  cast: {
    hero: { role: `unit:${kind}`, x: 285, facing: 'right', hidden: true },
    duchess: { role: 'duchess', x: 215, facing: 'right', hidden: true },
  },
  shots: [
    {
      look: AWAKE_AREAS[i % AWAKE_AREAS.length],
      cam: close('hero', 1.5),
      fx: ['fadeIn', 'darken'],
      caption: 'Awakening',
      acts: [{ who: 'hero', enter: 285, from: 215 }],
      lines: [tell(AWAKE_LINES[kind][0])],
    },
    {
      cam: close('hero', 2),
      fx: ['glow', 'flash'],
      cue: 'boom',
      acts: [{ who: 'hero', look: 1 }, { who: 'hero', pose: 'cast' }],
      lines: [say('hero', AWAKE_LINES[kind][1])],
    },
    {
      cam: close(['hero', 'duchess'], 1.5),
      fx: ['glow'],
      acts: [{ who: 'hero', look: 1 }, { who: 'duchess', enter: 215, from: 130 }],
      lines: [tell('{hero} has awakened. The heightened splendour is quite blinding.'), say('duchess', 'Mehh.')],
    },
  ],
});

/* ------------------------------------------------------------ a castle build */

interface Build {
  site: string;
  name: string;
  /** The scene's title, blurb and caption. */
  title: string;
  blurb: string;
  cap: string;
  /** The narrator on the finished building, and the mason's remark. */
  built: string;
  done: string;
  /** The roof argument: the sawyer, the mason, the sawyer. */
  roof: [string, string, string];
  /** The closing line, before Duchess. */
  joke: string;
}

const BUILDS: Build[] = [
  {
    site: 'treasury', name: 'Treasury',
    title: 'The Vault Arises',
    blurb: 'The master builders complete the Treasury and enter into an intricate debate concerning the rafters.',
    cap: 'Treasury built',
    built: 'Following an immense quantity of percussive carpentry, the Treasury finally stood upright.',
    done: 'Right then, that is the royal strongbox completed to the plans.',
    roof: ['The ridge beam has a noticeable fourteen-degree list to port.', 'It is not a flaw, it is an architectural flourish representing fiscal agility.', 'It is an architectural funnel directing rainwater straight into the sovereign\'s coin bags.'],
    joke: 'The crowns were counted three times. The total grew by forty pence on the third attempt.',
  },
  {
    site: 'barracks', name: 'Barracks',
    title: 'The Bunks Arranged',
    blurb: 'The builders complete the Barracks and begin an exhaustive inquest regarding the timber quality.',
    cap: 'Barracks raised',
    built: 'After three solid weeks of energetic sawing, the new barracks was declared habitable.',
    done: 'There we are! Bunks for thirty heroes, provided they sleep on their sides.',
    roof: ['You have constructed the front door three inches narrower than the knight\'s shoulders.', 'It encourages graceful posture and discourages unannounced loitering.', 'It ensures the barbarian will inevitably remove the entire jamb with his hip.'],
    joke: 'Sufficient lodging exists for everyone, provided none of the occupants harbour conflicting grudges.',
  },
  {
    site: 'armoury', name: 'Armoury',
    title: 'The Racks Assembled',
    blurb: 'The builders finish the Armoury and immediately disagree on the structural integrity of the roof.',
    cap: 'Armoury built',
    built: 'With a final deafening salvo of mallet blows, the new armoury annex was proudly erected.',
    done: 'Behold! Every halberd, broadsword, and buckler now possesses an assigned peg.',
    roof: ['The western rafter groans whenever a brisk westerly breeze touches the shingles.', 'That is the natural flexibility of seasoned highland pine, you uncultured apprentice.', 'That is the sound of eighty square yards of slate preparing to descend upon the claymores.'],
    joke: 'Every peg has been meticulously labelled. Unfortunately, the labels were hung upon a single hook.',
  },
  {
    site: 'mageTower', name: 'Mage Tower',
    title: 'The Spire Completed',
    blurb: 'The craftsmen complete the Mage Tower and wonder why the stairs spiral counter-clockwise.',
    cap: 'Tower raised',
    built: 'After the scaffolding collapsed twice, the arcane spire finally reached the clouds.',
    done: 'That is the wizard\'s aerie finished. Try not to touch the glowing masonry.',
    roof: ['The pinnacle appears to be three yards further east than the foundations.', 'It leans into the astral prevailing winds! It is deeply sophisticated engineering!', 'It looks like an exceptionally confused stone parsnip trying to climb into the sky.'],
    joke: 'The spire stands considerably taller than the blueprints indicated. The masonry blamed the clouds.',
  },
  {
    site: 'stable', name: 'Stable',
    title: 'The Stalls Partitioned',
    blurb: 'The carpenters finish the Stable, and Duchess conducts a rigorous architectural inspection.',
    cap: 'Stable built',
    built: 'Following substantial excavation of old manure, the expanded stables were pronounced complete.',
    done: 'Stalls for six heavy chargers and adequate loft space for thirty bales of sweet meadow hay.',
    roof: ['The manger partition has been installed back to front.', 'The horses will simply have to learn to turn their heads the other direction while chewing.', 'The horses will chew through your pine divider before midday tomorrow.'],
    joke: 'Duchess completed an exhaustive walk-through and formally approved the quality of the latch timber.',
  },
  {
    site: 'library', name: 'Library',
    title: 'The Shelves Plumbed',
    blurb: 'The stonemasons finish the Library and immediately dispute how much noise is permitted.',
    cap: 'Library raised',
    built: 'With the final oak shelves dovetailed into place, the Great Library welcomed the royal tomes.',
    done: 'A sanctuary of profound learning, perfectly plumb and reasonably dust-resistant.',
    roof: ['The skylight is situated directly above the ancient illuminated manuscripts.', 'Natural illumination is paramount for close scholarly perusal!', 'The first autumn downpour will reduce the royal history to soggy blue porridge.'],
    joke: 'Strict silence is politely requested throughout the archives. The recommendation is utterly ignored.',
  },
  {
    site: 'chapel', name: 'Chapel',
    title: 'The Belfry Mounted',
    blurb: 'The master builders complete the Chapel and critique the acoustics of the new chime.',
    cap: 'Chapel raised',
    built: 'After careful placement of the stained glass, the castle chapel stood consecrated and serene.',
    done: 'That is the sanctuary complete. Pews are sanded smooth, with minimal splinters.',
    roof: ['The bellrope hangs directly across the central aisle at eye level.', 'It ensures the congregation remains alert and appropriately humble during the entrance hymn.', 'It ensures the paladin will bang his head every Sunday morning without fail.'],
    joke: 'A modest brass bell has been suspended. Its tone is small, but remarkably persistent.',
  },
];

const buildScene = (b: Build): Scene => ({
  id: `castle:${b.site}`,
  title: b.title,
  blurb: b.blurb,
  moment: { kind: 'castle', site: b.site },
  family: 'castle',
  cast: {
    mason: { role: 'unit:peasant', x: 250, facing: 'right', hidden: true },
    sawyer: { role: 'unit:peasant', x: 310, facing: 'left', hidden: true },
    duchess: { role: 'duchess', x: 360, facing: 'left', hidden: true },
  },
  shots: [
    {
      look: 'highlands',
      cam: wide(290, 205),
      fx: ['fadeIn'],
      caption: b.cap,
      acts: [{ who: 'mason', enter: 250, from: 150 }, { who: 'sawyer', enter: 310, from: 440 }],
      lines: [tell(b.built), say('mason', b.done)],
    },
    {
      cam: close(['mason', 'sawyer'], 1.5),
      lines: [say('sawyer', b.roof[0]), say('mason', b.roof[1]), say('sawyer', b.roof[2])],
    },
    {
      cam: close(['sawyer', 'duchess'], 1.5),
      acts: [{ who: 'duchess', enter: 360, from: 450 }],
      lines: [tell(b.joke), say('duchess', 'Mehh.')],
    },
  ],
});

/* ------------------------------------------------------------ the Last Stand's milestone waves */

// (the old endless tower's milestones, `spire:<n>`, play in the Last Stand at waves 10, 25 and 50: the ids and the moment are kept, so a
// save's seen scenes still match. The story is the Last Stand's: the castle's walls are breached, and the guard falls back to keep the king
// at his throne. The king is the player; he stands in the last shot of each.)
const STANDS: { wave: number; look: Area; title: string; blurb: string; lines: [string, string, string, string] }[] = [
  { wave: 10, look: 'warcamp', title: 'The Breach Widens', blurb: 'Ten waves in, the outer wall gives way, and the guard falls back towards the king.', lines: ['Ten waves in, the outer wall gave a long groan and then a short, decisive crumble.', 'The breach is getting wider. I preferred it as a crack.', 'Fall back to the inner yard. Bring the king, and the biscuits.', 'I shall walk, thank you. Briskly. With dignity. Mostly briskly.'] },
  { wave: 25, look: 'dungeon', title: 'The Throne Room', blurb: 'Twenty-five waves, and the guard makes its stand round the king at his throne.', lines: ['Twenty-five waves. The guard has fallen back to the throne room, and the doors are thin.', 'Nobody gets past this rug. It is an heirloom.', 'Majesty, do sit on the throne. It is the one spot we can defend.', 'I have been sitting on it all along. You simply never noticed.'] },
  { wave: 50, look: 'shrine', title: 'The Last Stand', blurb: 'Fifty waves round the throne, and the bards are already arguing over the song.', lines: ['Fifty waves round the throne. Out in the land, the bards have begun the song already.', 'They say no guard ever held a throne room this long.', 'They also say we are nine feet tall. Let them.', 'Whatever comes through that door, the Last Keep stands while you do.'] },
];

const standScene = (f: (typeof STANDS)[number]): Scene => ({
  id: `spire:${f.wave}`,
  title: `Wave ${f.wave}: ${f.title}`,
  blurb: f.blurb,
  moment: { kind: 'spire', floor: f.wave },
  family: 'spire',
  cast: {
    hero: { role: 'hero', x: 290, facing: 'right', hidden: true },
    mate: { role: 'party:1', x: 250, facing: 'right', hidden: true },
    king: { role: 'unit:standKing', x: 195, facing: 'right', hidden: true, scale: 1.2 },
  },
  shots: [
    {
      look: f.look,
      cam: wide(270, 195),
      to: wide(270, 215),
      fx: ['fadeIn', 'darken', 'rumble'],
      cue: 'earthRumble',
      caption: `Wave ${f.wave}`,
      acts: [{ who: 'hero', enter: 290, from: 200 }, { who: 'mate', enter: 250, from: 160 }],
      lines: [tell(f.lines[0])],
    },
    {
      cam: close(['hero', 'mate'], 1.5),
      lines: [say('hero', f.lines[1]), say('mate', f.lines[2])],
    },
    {
      cam: close(['king', 'mate'], 1.5),
      acts: [{ who: 'king', enter: 195, from: 100 }],
      lines: [say('king', f.lines[3])],
    },
  ],
});

/* ------------------------------------------------------------ a boss changes form */

interface Form {
  boss: string;
  area: Area;
  /** The words of the boss's second form: the same as `PHASE2` in `bossPhases.ts` (a test holds them equal). */
  line: string;
}

const FORMS: Form[] = [
  { boss: 'orcWarlord', area: 'warcamp', line: 'WAAAGH! ENOUGH SKULKING! BRING DOWN THE PALISADE!' },
  { boss: 'lichKing', area: 'graveyard', line: 'Rise, my shattered retainers! Rest is forbidden!' },
  { boss: 'boarKing', area: 'plains', line: 'OUT OF MY WAY, TWO-LEGGED ACORNS!' },
  { boss: 'forestBoss3', area: 'forest', line: 'The ancient timber awakes! Taste the briar\'s edge!' },
  { boss: 'minotaurChampion', area: 'temple', line: 'The labyrinth shuts behind you! All exits are bricked!' },
  { boss: 'hornedOgre', area: 'highlands', line: 'THE CRAG DOES NOT CRUMBLE! TASTE THE BOULDER!' },
  { boss: 'demonLord', area: 'volcano', line: 'Burn, impudent mortals! Clause nine is invoked!' },
  { boss: 'oniKing', area: 'shrine', line: 'HEAR THE ROAR OF THE MIDNIGHT THUNDER DRUM!' },
  { boss: 'forgeTitan', area: 'forge', line: 'THE FURNACE RUNS WHITE-HOT! HAMMERS DESCEND!' },
  { boss: 'calBoss1', area: 'volcano', line: 'THE EMBERS FLARE! BURN TO ASH AND SLAG!' },
  { boss: 'calBoss2', area: 'forest', line: 'THE BRIAR AWAKES! THORNS BURST FROM THE MOSS!' },
  { boss: 'calBoss3', area: 'dungeon', line: 'ASSEMBLE, MY LEGIONS! THE COURT IS CONVENED!' },
  { boss: 'calBoss4', area: 'snow', line: 'THE CRAG STRIDES FORWARD! BRACE FOR IMPACT!' },
  { boss: 'calBoss5', area: 'desert', line: 'FEAST UPON THE WRATH OF THE FINAL CINDER!' },
  { boss: 'calBoss6', area: 'volcano', line: 'THERE IS NO HORIZON BEYOND MY STRIDE!' },
];

/** The beat before a boss's new form, slowed to half pace, then its words. About three seconds all told; the page holds the fight meanwhile. Once a save for each boss (the owner: "Boss cinematics only need to play once"). */
const SLOW_BEAT = 0.7;

const formScene = (f: Form): Scene => ({
  id: `form:${f.boss}`,
  title: `${UNITS[f.boss].name}: Second Form`,
  blurb: 'A formidable boss assumes its second phase with explosive slow-motion fury.',
  moment: { kind: 'bossForm', boss: f.boss },
  family: 'form',
  short: true,
  cast: { boss: { role: `unit:${f.boss}`, x: 290, facing: 'left', scale: 1.6 } },
  shots: [
    { look: f.area, cam: close('boss', 1.5), to: close('boss', 2), acts: [{ who: 'boss', pose: 'hurt' }], fx: ['darken'], cue: 'boom', hold: SLOW_BEAT, slow: 0.5 },
    { cam: close('boss', 2), acts: [{ who: 'boss', pose: 'cast' }], fx: ['flash', 'glow'], lines: [say('boss', f.line, 'shout')] },
  ],
});

/* ------------------------------------------------------------ the Last Oath: a set of five's mega move */

interface Oath {
  /** The set's id in `combos.ts` and its name (a test holds them equal). */
  set: string;
  name: string;
  area: Area;
  /** The caption of the first shot, and the full scene's blurb. */
  cap: string;
  blurb: string;
  /** One line from each of the five, in the order of the set's heroes, and one the five say together. */
  oaths: [string, string, string, string, string];
  shared: string;
}

const OATHS: Oath[] = [
  { set: 'holyOrder', name: 'The Holy Order', area: 'highlands', cap: 'Holy Order · Oath', blurb: 'The five holy champions unleash their ultimate covenant, each swearing in solemn unison.',
    oaths: ['I stand before the breach once more. Mind the shield.', 'I swear upon the altar, and I mean every syllable.', 'I swear to mend the fallen, though I do it with a sigh.', 'The celestial light endures! Stand in its warmth!', 'I was merely strolling past. Very well, let us scrap.'],
    shared: 'By sacred radiance and stout shield, we stand as one!' },
  { set: 'arcaneCouncil', name: 'The Arcane Council', area: 'dungeon', cap: 'Arcane · Last Oath', blurb: 'The Arcane Council invoke their grand synthesis, with appropriately volatile results.',
    oaths: ['I swear upon the flame! Nothing is currently melting!', 'I swear with a thunderclap! Rubber soles on, everyone!', 'I swear by the stars! The sums have been checked twice!', 'I swear upon the dark contract! Terms and conditions apply!', 'I swore this identical oath next Tuesday! Keep up!'],
    shared: 'By star, storm, and eldritch fire, the cosmos bends!' },
  { set: 'shadowClan', name: 'The Shadow Clan', area: 'forest', cap: 'Shadow Clan · Oath', blurb: 'The Shadow Clan strike from the mist, swearing their silent covenant.',
    oaths: ['My cold steel bears witness. Silence falls.', 'You will neither see me arrive nor hear me swear.', 'I take this solemn pledge. No blades required.', 'Caw! That signifies hearty feathered agreement!', 'I swear upon the contract, provided the fee is paid.'],
    shared: 'Unseen in darkness, unbroken in resolve, we strike together!' },
  { set: 'fleet', name: 'The Black Fleet', area: 'snow', cap: 'Black Fleet · Oath', blurb: 'The buccaneers and sea-dogs declare their sovereign covenant on dry land.',
    oaths: ['Yo ho, you landlubbers! The tide answers our call!', 'I swear upon the plume of my finest feathered tricorn!', 'Aye! By the salt spray and the roaring undertow!', 'OATH LOADED. BROADSIDE PRIMED.', 'I swear! Make it snappy, the tide waits for no man!'],
    shared: 'One flag, one broadside, and no quarter given!' },
  { set: 'wildHunt', name: 'The Wild Hunt', area: 'forest', cap: 'Wild Hunt · Oath', blurb: 'The wild beasts and wardens howl their ancestral promise to the moon.',
    oaths: ['The timber pack roars beside me! The hunt begins!', 'Awoooo! Indeed, that constitutes a binding oath!', 'I swear by ancient roots and the bitter winter frost!', 'I swear upon the hunter\'s notch. Steady and quiet.', 'I swear, and here is a jaunty four-part ballad to prove it!'],
    shared: 'One pack, one fang, one relentless pursuit across the heather!' },
  { set: 'nightParade', name: 'The Night Parade', area: 'forest', cap: 'Night Parade · Oath', blurb: 'The mountain spirits and yokai assemble under glowing lanterns to unleash their pact.',
    oaths: ['I swear upon nine velvet tails. Mischief is guaranteed.', 'I swear upon the crags! Mind the descending gale!', 'Look me in the eye. I swear, and stone endures.', 'I swear upon the sacred flutes! Pass the rice wine!', 'I swear! Or perhaps I am a charming illusion? Guess!'],
    shared: 'A hundred lanterns, a thousand spirits, one midnight parade!' },
  { set: 'ironVanguard', name: 'The Iron Vanguard', area: 'highlands', cap: 'Vanguard · Oath', blurb: 'The heavy bulwarks plant their shields and swear an immovable oath of iron.',
    oaths: ['I swear upon the granite! Nothing budges this line!', 'I swear upon my horns! Straight through the centre!', 'Couched and ready! Point first into the fray!', 'I SWEAR AT AN ALARMINGLY DEAFENING VOLUME!', 'By imperial decree, the line holds! Forward, dogs!'],
    shared: 'Shoulder to iron shoulder, we break the oncoming storm!' },
  { set: 'dreadCourt', name: 'The Dread Court', area: 'dungeon', cap: 'Dread Court · Oath', blurb: 'The tyrants and denizens of the crypt swear their final, binding court verdict.',
    oaths: ['I swear! The sentence is passed without appeal!', 'I swear! The harvest is long overdue on this field!', 'I swear! Purgatory is shockingly overbooked today!', 'Hrrngh. Sworn upon my spare tibia. Hrrngh.', 'I swore this covenant three dynasties ago. Still applies.'],
    shared: 'The court convenes, the ledgers open, and the sentence falls!' },
];

/** The five, in a line-up: the cast of both versions (the page fills them with the five who cast the move). */
const FIVE = ['a', 'b', 'c', 'd', 'e'] as const;
const lineUp = (): Scene['cast'] => Object.fromEntries(FIVE.map((k, i) => [k, { role: `party:${i}` as const, x: 224 + i * 28, facing: 'right' as const }]));
const OATH_SECS = 1.8;

/** The fuller version, the first time a set fires: the line-up, then a line from each of the five (about ten seconds). */
const oathScene = (o: Oath): Scene => ({
  id: `oath:${o.set}`,
  title: `${o.name}: Last Oath`,
  blurb: o.blurb,
  moment: { kind: 'combo', set: o.set },
  family: 'oath',
  cast: lineUp(),
  shots: [
    { look: o.area, cam: wide(280, 205, 1), fx: ['fadeIn', 'darken'], caption: o.cap, cue: 'boom', hold: 1.2 },
    ...FIVE.map((k, i): Shot => ({
      cam: close(k, 1.5),
      acts: [{ who: k, pose: 'cast' }],
      lines: [{ who: k, text: o.oaths[i], secs: OATH_SECS }],
    })),
  ],
});

/** The short version, every later time: the line-up and the five swearing as one (about three seconds). The fight is held while it plays. */
const oathCut = (o: Oath): Scene => ({
  id: `oathcut:${o.set}`,
  title: `${o.name}: Last Oath (short)`,
  blurb: 'The five swear their Last Oath as one, in a few seconds.',
  moment: { kind: 'comboCut', set: o.set },
  family: 'oathcut',
  short: true,
  again: true,
  cast: lineUp(),
  shots: [
    { look: o.area, cam: wide(280, 205, 1), fx: ['darken'], caption: o.cap, hold: 1.2 },
    { cam: wide(280, 205, 1), to: wide(280, 200, 1.5), acts: FIVE.map((k) => ({ who: k, pose: 'cast' as const })), fx: ['flash', 'glow'], lines: [{ who: 'c', text: o.shared, secs: OATH_SECS }] },
  ],
});

/* ------------------------------------------------------------ the lot */

export const FAMILY_SCENES: Scene[] = [
  ...CLEARS.map(clearScene),
  ...ALL_HEROES.map((k, i) => awakenScene(k, i)),
  ...BUILDS.map(buildScene),
  ...STANDS.map(standScene),
  ...FORMS.map(formScene),
  ...OATHS.map(oathScene),
  ...OATHS.map(oathCut),
];

/** The sets' oaths, for the test that holds them to `combos.ts`. */
export const OATH_SETS: readonly { set: string; name: string }[] = OATHS;

/** The names of the families, for the Scenes list. */
export const FAMILY_NAMES: Record<string, string> = {
  clear: 'The armies’ last stands',
  awaken: 'Awakenings',
  earned: 'Heroes earned',
  castle: 'The castle going up',
  spire: 'The Last Stand’s milestones',
  form: 'Bosses changing form',
  oath: 'The Last Oaths',
  oathcut: 'The Last Oaths, in short',
};
