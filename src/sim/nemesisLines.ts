// The Nemesis War, phase 3: the taunts (`docs/design/legends-expansion.md`, section 2.9; `docs/notes/nemesis-3.md`). A nemesis's taunt is
// not written for it: it is assembled from its memory (who it slew, maimed or escaped, who humiliated it, the trophies it carries, the
// Avengers and the hero it dreads on the board, its seat), from templates by trigger, in its army's voice. The orcs are gruff, the dead cold,
// the beasts snarl, the wildwood is fey, the labyrinth proud, the ogres dim, the infernal grand, the yokai speak in riddles and the golems
// formally. A hero the taunt names answers from the right, in a line of its own. This is the first batch: two lines for each trigger in each
// voice, and two replies for each hero; more follow for the owner to read. The heir's Blood Grudge trigger comes with the Dynasties (phase 6).
//
// The templates fill from `{name}` (its own name), `{hero}` (the hero it names), `{kind}` (that hero's calling, "Knight"), `{trophy}` (the
// piece it took: weapon, shield, helm, charm) and `{fallen}` (the hero it slew, whom the Avenger avenges). Pure data: no Pixi, no DOM.

/** What a taunt is about, in the order a nemesis reaches for them (the most personal first). */
export type TauntTrigger = 'trophy' | 'humiliated' | 'avenger' | 'slew' | 'dread' | 'maimed' | 'escaped' | 'warchief' | 'meet';
export const TRIGGERS: readonly TauntTrigger[] = ['trophy', 'humiliated', 'avenger', 'slew', 'dread', 'maimed', 'escaped', 'warchief', 'meet'];

/** The armies' voices (one each). */
export type Voice = 'orcs' | 'undead' | 'beasts' | 'wildwood' | 'labyrinth' | 'ogres' | 'infernal' | 'yokai' | 'golems';
export const VOICES: readonly Voice[] = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];

/** The taunts: trigger -> voice -> lines. */
export const TAUNTS: Readonly<Record<TauntTrigger, Readonly<Record<Voice, readonly string[]>>>> = {
  trophy: {
    orcs: ['I wear your {trophy} now, {hero}. Fits me better.', 'Come and take your {trophy} back, {hero}. I dare you.'],
    undead: ['Your {trophy} is cold now, {hero}. Like everything I keep.', 'I keep your {trophy} in the dark, {hero}. It misses you.'],
    beasts: ['Smell that, {hero}? Your {trophy}. I sleep on it.', 'I chewed your {trophy}, {hero}. You next.'],
    wildwood: ['The roots have grown through your {trophy}, {hero}.', 'Your {trophy} hangs in my bower, {hero}, with the bones.'],
    labyrinth: ['Your {trophy} adorns my hall, {hero}. Tribute, of a sort.', 'A {kind}’s {trophy} on my wall. The finest piece I own.'],
    ogres: ['This your {trophy}, {hero}? Is mine now. Mine.', 'Me use your {trophy} for picking teeth, {hero}.'],
    infernal: ['Your {trophy} burns on my altar, {hero}. Beautifully.', 'I have melted greater {trophy}s than yours, {hero}. I kept this one.'],
    yokai: ['What has a {kind}’s {trophy} and a {kind}’s shame? I do, {hero}.', 'Your {trophy} is lantern-lit tonight, {hero}. Guess where.'],
    golems: ['Item logged: one {trophy}, property of {hero}. Not returned.', 'Your {trophy} is catalogued, {hero}. Claim denied.'],
  },
  humiliated: {
    orcs: ['You shamed me, {hero}. Nobody shames me twice.', 'They laughed at me in camp, {hero}. They stopped. You will too.'],
    undead: ['You made me crawl, {hero}. I have had a long time to remember it.', 'I do not forgive, {hero}. I have no heart to do it with.'],
    beasts: ['You made me run, {hero}. Now I hunt.', 'I licked my wounds, {hero}. Now I lick my teeth.'],
    wildwood: ['You turned me out of my own wood, {hero}. The wood remembers.', 'I hid in the briars, {hero}, and the briars taught me spite.'],
    labyrinth: ['You made a fool of me before my own walls, {hero}. Never again.', 'I fled once, {hero}. I have built a maze around the memory.'],
    ogres: ['You hit me lots, {hero}. Me remember. Me not good at remembering.', 'You make me cry, {hero}. Now me make you cry.'],
    infernal: ['You humbled me, {hero}. That debt is paid in ash.', 'I crawled from your field, {hero}. I crawled from worse fires.'],
    yokai: ['What runs and returns, {hero}? Ask the fox you shamed.', 'You laughed as I fled, {hero}. Do you hear me laughing now?'],
    golems: ['Error recorded: defeat by {hero}. Correction scheduled.', 'Repairs complete, {hero}. Grievance retained.'],
  },
  avenger: {
    orcs: ['Here for {fallen}, {hero}? Lie down next to them.', 'I broke {fallen}, {hero}. You are smaller.'],
    undead: ['{fallen} called for you as they fell, {hero}. You came too late.', 'Come for {fallen}, {hero}? Then join them.'],
    beasts: ['{fallen} tasted good, {hero}. You smell the same.', 'I bit {fallen}, {hero}. Your turn to bleed.'],
    wildwood: ['{fallen}’s blood is in my roots, {hero}. Shall I water them again?', 'You grieve for {fallen}, {hero}. How sweetly it hangs on you.'],
    labyrinth: ['Avenge {fallen}, {hero}? Many have tried my walls.', 'Your {fallen} died lost, {hero}. So will you.'],
    ogres: ['Me smash {fallen}. Me smash you, {hero}. Easy.', 'You friend of {fallen}? {fallen} was squishy.'],
    infernal: ['{fallen} is ash, {hero}, and ash does not grieve.', 'You carry {fallen}’s memory, {hero}. I carry their scream.'],
    yokai: ['What weeps for {fallen} and will weep again, {hero}?', 'I took {fallen} at dusk, {hero}. The dusk is coming.'],
    golems: ['Target {fallen}: terminated. New target: {hero}.', 'Your grief for {fallen} is noted, {hero}. It changes nothing.'],
  },
  slew: {
    orcs: ['I put you down once, {hero}. Stay down this time.', 'Back again, {hero}? I liked killing you.'],
    undead: ['I remember how you fell, {hero}. Every moment of it.', 'You died well, {hero}. Die again for me.'],
    beasts: ['I brought you down, {hero}. Prey stays prey.', 'You fell to my teeth, {hero}. I still taste you.'],
    wildwood: ['I laid you in the leaves, {hero}. The leaves want you back.', 'The wood took you once, {hero}. It is patient.'],
    labyrinth: ['You fell in my halls, {hero}. Your shade still wanders them.', 'A {kind} died at my feet. Shall I make it two?'],
    ogres: ['Me squash you before, {hero}. Me squash you again.', 'You! Me remember you! You went flat!'],
    infernal: ['I burned you once, {hero}. I keep the ashes warm.', 'You knelt in my fire, {hero}. Kneel again.'],
    yokai: ['What falls twice and never learns? A {kind} named {hero}.', 'I counted your last breaths, {hero}. I lost count. Shall we begin?'],
    golems: ['Record: {hero}, destroyed. Repeating procedure.', 'Previous outcome: {hero} fell. Expected outcome: unchanged.'],
  },
  dread: {
    orcs: ['You, {hero}. You hurt me. Not again.', 'Keep that {kind} away from me! I mean it, {hero}!'],
    undead: ['You, {hero}. You are the one I do not sleep for.', 'I know your hand, {hero}. I have felt it in my bones.'],
    beasts: ['That one. {hero}. I smell your blade on my scars.', 'Not the {kind}. Not again.'],
    wildwood: ['Ah, {hero}, the axe the forest fears. Come no closer.', 'Your light burns me, {hero}. Stay in the dark with me.'],
    labyrinth: ['{hero}. The one who found the way through me.', 'Stand aside, {hero}. I will not be undone by a {kind} twice.'],
    ogres: ['Not you, {hero}. You hit hard. Me no like.', 'Ow. Me remember you, {hero}. Ow.'],
    infernal: ['You, {hero}, are a splinter in my soul.', 'Of all your kind, {hero}, you alone make me careful.'],
    yokai: ['What does the fox fear? A {kind} named {hero}.', 'You see me too well, {hero}. Look away.'],
    golems: ['Threat assessment: {hero}, critical. Proceeding regardless.', 'Warning: {hero} detected. Damage memory reloaded.'],
  },
  maimed: {
    orcs: ['I opened you up last time, {hero}. Finish the job today.', 'How are the scars, {hero}? I gave you good ones.'],
    undead: ['You still limp, {hero}. I can hear it.', 'I left my mark on you, {hero}. Shall I sign it?'],
    beasts: ['I tore you, {hero}. I want the rest.', 'You bled for me, {hero}. Bleed some more.'],
    wildwood: ['Your wounds healed crooked, {hero}. I made sure of it.', 'The thorns I left in you, {hero}, still grow.'],
    labyrinth: ['I broke you on my stones, {hero}. They want another try.', 'You left my maze in pieces, {hero}. Your pieces.'],
    ogres: ['Me hit you good last time, {hero}! You go "oof"!', 'You still sore, {hero}? Me make it sorer.'],
    infernal: ['I scarred your soul, {hero}. The body was a courtesy.', 'Your burns are still fresh, {hero}. How fortunate.'],
    yokai: ['What bleeds and does not die? You did, {hero}. Shall we see if it is a habit?', 'I wrote my name on you, {hero}. In red.'],
    golems: ['Prior damage to {hero}: substantial. Continuing.', 'Injury pattern on {hero} confirmed. Resuming.'],
  },
  escaped: {
    orcs: ['You let me walk away. Big mistake.', 'Missed me last time. You will miss me again.'],
    undead: ['You could not hold me. Nothing holds the dead.', 'I slipped away. I always do.'],
    beasts: ['You lost my trail. I never lost yours.', 'Run me down? You tried.'],
    wildwood: ['I melted into the green, and you never saw.', 'You chased a shadow. I was laughing in the boughs.'],
    labyrinth: ['You never find the way out of me. Nobody does.', 'I left by a door you did not know was there.'],
    ogres: ['Me ran away! Ha! Me good at running!', 'You no catch me! Me fast! Ish!'],
    infernal: ['I walked out of your fire. Shall I do it again?', 'You thought you had me. Many have.'],
    yokai: ['What cannot be caught but always comes back?', 'You grasped at me and held only mist.'],
    golems: ['Retreat executed successfully. Return executed successfully.', 'Escape probability: high. Recalculating yours.'],
  },
  warchief: {
    orcs: ['I am the Warchief! Every orc in the world answers to me!', 'Bow to the Warchief, or be buried under him!'],
    undead: ['I rule the Council of the dead. Kneel, and join it.', 'The Warchief does not die. The Warchief waits.'],
    beasts: ['I lead the pack of packs. Run, little things.', 'The whole hunt follows me. You are the hunted.'],
    wildwood: ['The Council crowns me in thorns. Come, kiss the crown.', 'Every leaf and fang of the War is mine.'],
    labyrinth: ['I am the heart of the maze. All roads end at me.', 'The Warchief has no exit. Neither do you.'],
    ogres: ['Me Warchief! Me biggest! Me hungriest!', 'Everybody listen to me now! Even you!'],
    infernal: ['I sit the Warchief’s throne, and it is lined with heroes.', 'The Dark Council bends the knee to me. So will you.'],
    yokai: ['What wears a crown of lanterns and never sleeps? Your Warchief.', 'Thirteen seats, one master. Guess which, little heroes.'],
    golems: ['Rank: Warchief. Authority: total. Your compliance: required.', 'Command protocol active. All units obey. You are a unit.'],
  },
  meet: {
    orcs: ['Fresh meat! Line up, I will get to all of you.', 'Nobody told me you were so small.'],
    undead: ['Another band of the living. How brief you all are.', 'I have buried better than you.'],
    beasts: ['New smells. New prey.', 'The hunt begins. You are slow.'],
    wildwood: ['Visitors, in my wood? How rude. How delicious.', 'Mind the roots, little heroes. They bite.'],
    labyrinth: ['Welcome to my halls. Few leave them.', 'You have come a long way to die so close to home.'],
    ogres: ['Ooh. Little people. Me hungry.', 'Who you? Me smash you. Then ask.'],
    infernal: ['Mortals, at my threshold. How charming.', 'You stand before a power older than your Keep.'],
    yokai: ['What has five heads and no sense? Your party.', 'A riddle: what walks in, and is carried out?'],
    golems: ['Intruders detected. Initiating removal.', 'Greetings. Your attendance is noted. Your departure is scheduled.'],
  },
};

/** Each hero's two replies (in their own voice, as `quipData.ts`'s): the first when the taunt is plain, the second when it is personal (a
 *  hero it slew, maimed or humiliated by, its trophy, an Avenger, its Dread). They fill from `{name}`, the nemesis's own name. */
export const REPLIES: Readonly<Record<string, readonly [string, string]>> = {
  knight: ['My shield has heard worse, {name}.', 'Then this time I will not fall, {name}.'],
  samurai: ['Words are dust, {name}. Draw.', 'I carry that debt on my blade, {name}. I settle it now.'],
  kunoichi: ['You will not hear me coming, {name}.', 'I have waited in the dark for you, {name}.'],
  archer: ['Keep talking, {name}. It helps me aim.', 'One arrow, {name}. That is all I kept for you.'],
  wizard: ['I have a fire for every word, {name}.', 'Burn, {name}. This time it holds.'],
  peasant: ['I have mucked out worse than you, {name}.', 'Margaret remembers you, {name}. So do I.'],
  ninjaMonk: ['Silence, {name}. Then stillness.', 'My vow has room for one exception, {name}.'],
  wanderer: ['The road has bigger mouths than yours, {name}.', 'I brewed something special for you, {name}.'],
  lightningMage: ['The storm does not argue, {name}.', 'Every bolt today has your name on it, {name}.'],
  kitsune: ['Which of my faces are you talking to, {name}?', 'I am smiling, {name}. That should frighten you.'],
  karasu: ['Caw, {name}. That means “no”.', 'I have plucked prouder birds than you, {name}.'],
  yamabushi: ['The mountain wind laughs at you, {name}.', 'The gale has come for you, {name}.'],
  werewolf: ['The moon is up, {name}. So is my blood.', 'I have your scent, {name}. You do not get away.'],
  minotaur: ['I was born in a labyrinth, {name}. I know every turn.', 'My horns remember you, {name}.'],
  satyr: ['Shall I play you a dirge, {name}?', 'This tune is just for you, {name}. It is short.'],
  gorgon: ['Look at me when you say that, {name}.', 'You will make a fine statue, {name}.'],
  samuraiCommander: ['The bridge holds, {name}. It always holds.', 'My men fell to you, {name}. You will fall to me.'],
  paladin: ['I bear every wound for a reason, {name}.', 'You gave me this scar, {name}. I return it.'],
  cleric: ['I pray for you, {name}. Not for long.', 'Even my mercy has its end, {name}.'],
  druid: ['The old oaks have heard of you, {name}. They are not impressed.', 'The forest gives me leave, {name}.'],
  barbarian: ['Shout louder, {name}! My axe is deaf!', 'Ha! I have been waiting for you, {name}!'],
  ranger: ['You walked into my snare already, {name}.', 'I tracked you here, {name}. It ends here.'],
  warlock: ['My pact is hungrier than you, {name}.', 'I have promised your soul to someone, {name}.'],
  illusionist: ['Which one of me are you threatening, {name}?', 'You will not see the real me until it is over, {name}.'],
  gunslinger: ['Talk is cheap, {name}. Lead is cheaper.', 'Six shots, {name}. All yours.'],
  shambler: ['I have been dead longer than you, {name}.', 'You put me in the ground, {name}. I climbed out.'],
  rifleBot: ['Target acquired: {name}.', 'Grievance file on {name}: open. Closing now.'],
  mercenary: ['Your bounty pays well, {name}.', 'This one I would do for free, {name}.'],
  mummy: ['The sands have buried kings, {name}.', 'I will wrap you up and lose you, {name}.'],
  buccaneer: ['Bigger fish than you, {name}.', 'I will hook you this time, {name}.'],
  wolfBard: ['I shall make a song of your end, {name}.', 'The last verse is yours, {name}. Listen.'],
  beastmaster: ['My pack has your scent, {name}.', 'Go, my wolves. That is the one.'],
  kraken: ['The deep is patient, {name}.', 'I will drag you under, {name}.'],
  lancer: ['The steppe has trampled bigger, {name}.', 'Lance down, {name}. Charge!'],
  reaper: ['Your hour is marked, {name}.', 'I came early for you, {name}.'],
  timeWitch: ['I have seen how this ends, {name}.', 'I wound the clock back for you, {name}.'],
  arcBlade: ['My blade hums for you, {name}.', 'The spark remembers you, {name}.'],
  dreadPirate: ['I have drowned twice, {name}. You do not scare me.', 'You will walk my plank, {name}.'],
  siegeBot: ['Range found: {name}.', 'Walls fell for less, {name}.'],
  priestess: ['The light finds even you, {name}.', 'I will not raise you when you fall, {name}.'],
  dragoon: ['From up here you look very small, {name}.', 'My wyvern remembers your face, {name}.'],
  juggernaut: ['I do not stop, {name}.', 'Stand there, {name}. I am coming through you.'],
  sage: ['The stars did not mention you, {name}.', 'Your star goes out tonight, {name}.'],
  demonSwordsman: ['My steel is hungry, {name}.', 'The blade asked for you by name, {name}.'],
  tyrant: ['I sentence you, {name}.', 'Your verdict was written long ago, {name}.'],
};
