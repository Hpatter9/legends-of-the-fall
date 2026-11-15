// The Nemesis War, phase 3: the taunts (`docs/design/legends-expansion.md`, section 2.9; `docs/notes/nemesis-3.md`). A nemesis's taunt is
// not written for it: it is assembled from its memory (who it slew, maimed or escaped, who humiliated it, the trophies it carries, the
// Avengers and the hero it dreads on the board, its seat), from templates by trigger, in its army's voice. The orcs are gruff, the dead cold,
// the beasts snarl, the wildwood is fey, the labyrinth proud, the ogres dim, the infernal grand, the yokai speak in riddles and the golems
// formally. A hero the taunt names answers from the right, in a line of its own. This is the first batch: two lines for each trigger in each
// voice, and two replies for each hero; more follow for the owner to read.
//
// The templates fill from `{name}` (its own name), `{hero}` (the hero it names), `{kind}` (that hero's calling, "Knight"), `{trophy}` (the
// piece it took: weapon, shield, helm, charm) and `{fallen}` (the hero it slew, whom the Avenger avenges). Pure data: no Pixi, no DOM.

import type { MomentKind } from './nemesisMoments';

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
  vampireLord: ['Your blood is already mine, {name}.', 'I have outlived better than you, {name}.'],
  hemomancer: ['Drink deep, {name}. It is your own.', 'The chalice is thirsty, {name}.'],
  nightstalker: ['Look up, {name}.', 'The dark has been behind you all along, {name}.'],
  bloodGargoyle: ['Stone does not tire, {name}.', 'I have watched you coming for an hour, {name}.'],
  dhampir: ['Silver for you, {name}.', 'I was raised to hunt your kind, {name}.'],
  warDrummer: ['Hear that, {name}? That is your last beat.', 'The drum calls, {name}, and you answer.'],
  geomancer: ['The ground remembers you, {name}.', 'The mountain has decided, {name}.'],
  bellWarden: ['The bell tolls for you, {name}.', 'Be still, {name}, and be sanctified.'],
  falconer: ['She has your scent, {name}.', 'Run, {name}. The falcon enjoys a chase.'],
  banneret: ['Kneel to the standard, {name}.', 'My banner has not fallen yet, {name}, and nor shall I.'],
  astralSphinx: ['Answer me, {name}, or be answered.', 'The stars have written your riddle, {name}, and its answer is silence.'],
  mirageDancer: ['Which of us is real, {name}? Choose before it matters.', 'The sand forgets every dancer, {name}. It will remember you.'],
  plagueDoctor: ['A little ash for the sickness, {name}.', 'Do not breathe deeply, {name}. It only helps me.'],
  bombardier: ['Duck, {name}. Or do not; I like the noise either way.', 'Short fuse, {name}, and a long way down.'],
  astrologer: ['Your stars have fallen out, {name}.', 'I have read your chart, {name}. It ends tonight.'],
  inquisitor: ['The scales are even, {name}, and you stand on the wrong pan.', 'Judged by the sun, {name}, and found wanting.'],
  seraph: ['I was sent for you, {name}.', 'Look up, {name}. Mercy is a long way up.'],
  corsairSurgeon: ['Hold still, {name}. It will hurt me less.', 'I patch up crews, {name}. You are not one.'],
  harpooner: ['The line is out, {name}.', 'I have hauled bigger things from deeper water, {name}.'],
  seaReaver: ['The tide takes everything, {name}.', 'Your hull is already breaking, {name}.'],
  // (the five Mythics, docs/notes/mythic-heroes.md)
  vael: ['Kneel, {name}. Or be made to.', 'I have outlasted kingdoms, {name}. I shall outlast you.'],
  astrax: ['Look up, {name}. That light is the last thing you will see.', 'I swallowed a dying star, {name}. You are a smaller meal.'],
  ilyra: ['Not one of mine falls to you, {name}.', 'I came back from the grave for this, {name}. You will not send me back.'],
  orrun: ['Strike the roots, {name}. They have weathered worse.', 'I stood before the first forest, {name}. I will stand after you.'],
  nyxara: ['I have read your ending, {name}. It is short.', 'Every future I keep has you losing, {name}.'],
};

/**
 * NEMESIS-DEPTH, idea 2: the taunts of remembered fights (`nemesisMoments.ts`), four to each moment in each voice. They fill from `{name}`,
 * `{hero}` and `{kind}` (the hero the moment is about), `{what}` (the skill's name, or the element: fire, frost, storm, venom) and `{land}`
 * (where it happened: "the highlands"). A moment about a hero on the board is reached for before an Avenger, a slaying, the Dread or a maiming;
 * one about no hero (the king's spell, an Eidolon, an element) before an escape. Pure data.
 */
export const MOMENT_TAUNTS: Readonly<Record<MomentKind, Readonly<Record<Voice, readonly string[]>>>> = {
  skill: {
    orcs: ['Your {what} hurt, {hero}. Then I got up.', 'I took your {what} in {land}, {hero}. Do it again. Harder.', 'Still got the mark of your {what}, {hero}. I show it off.', 'Is that {what} all you got, {hero}? I been waiting.'],
    undead: ['Your {what} broke three of my ribs, {hero}. I had spares.', 'I remember your {what}, {hero}. The dead remember everything.', 'In {land} you gave me your {what}, {hero}. I give you nothing back but the grave.', 'Your {what} could not finish me, {hero}. Nothing can.'],
    beasts: ['Your {what} bit deep, {hero}. I bite deeper.', 'I smell your {what} coming, {hero}. I learned the smell in {land}.', 'You hurt me with your {what}, {hero}. Prey does not do that twice.', 'I licked the wound your {what} left, {hero}. It healed hungry.'],
    wildwood: ['Your {what} cut me to the heartwood, {hero}. Heartwood grows back.', 'In {land} your {what} found me, {hero}. Today the brambles find you.', 'I pressed your {what} between my leaves, {hero}, to remember it by.', 'Such a pretty {what}, {hero}. It will look lovely on your grave.'],
    labyrinth: ['I have studied your {what}, {hero}, as one studies a door. I know its hinges.', 'Your {what} shook my halls in {land}, {hero}. My halls still stand.', 'A {kind}’s {what}. I have had it carved over my gate, so I never forget.', 'You struck me with your {what}, {hero}. I mapped every inch of it.'],
    ogres: ['Your {what} make me go ow, {hero}! Me no forget ow!', 'That {what} thing! Do not do the {what} thing, {hero}!', 'Me still got lump from your {what}, {hero}. Lump angry.', 'You do {what} in {land}. Me do smash here. Fair.'],
    infernal: ['Your {what} singed my soul, {hero}. I have been savouring it.', 'I bore your {what} in {land}, {hero}, and I grew stronger in the fire of it.', 'Show me your {what} again, {hero}. I want to watch it fail.', 'A {kind}’s {what}: a spark against the abyss.'],
    yokai: ['What hurts once and tickles twice? Your {what}, {hero}.', 'I keep your {what} in a paper lantern, {hero}. It flickers when you are near.', 'In {land} your {what} split me in two, {hero}. Which of me are you talking to?', 'A riddle, {hero}: what does a {what} do to mist?'],
    golems: ['Damage log: {what}, source {hero}. Countermeasure: installed.', 'Your {what} in {land} has been analysed, {hero}. Do not expect it to work.', 'Recorded: {hero}’s {what}. Plating reinforced.', 'Impact signature {what} recognised. Proceeding with confidence.'],
  },
  brink: {
    orcs: ['You had me on my knees, {hero}. You should have finished it.', 'One more swing and I was dead, {hero}. You missed it.', 'In {land} you left me breathing, {hero}. Worst mistake you ever made.', 'I was nearly dead. Now I am nearly angry.'],
    undead: ['You brought me to the edge of the grave, {hero}. I know it well. I came back.', 'A breath from oblivion, {hero}. I did not take it.', 'In {land} I lay a thread from the end, {hero}. The thread held.', 'You almost unmade me, {hero}. Almost is a long word.'],
    beasts: ['I was bleeding out in {land}, {hero}. I crawled away. I crawled back.', 'You left me on the edge, {hero}. The edge is where I hunt.', 'Nearly dead, {hero}. Never so hungry.', 'A wounded beast is the worst kind, {hero}. You made me this.'],
    wildwood: ['You cut me down to a stump, {hero}. Stumps sprout.', 'One leaf left on me in {land}, {hero}. It was enough.', 'You nearly felled me, {hero}. The forest held its breath. Then it breathed again.', 'So close, {hero}. I felt your axe on my last ring.'],
    labyrinth: ['You stood at the very heart of me, {hero}, and turned back. Pity.', 'One step from victory in {land}, {hero}. My maze has many last steps.', 'You almost had me, {hero}. Almost is where my halls keep their dead.', 'I was a single breath from ruin. I have rebuilt from less.'],
    ogres: ['Me almost dead! Me very cross about that!', 'You nearly squash me, {hero}! Me no like nearly!', 'In {land} me lie down a long time. Me get up now.', 'Me only had one bit of health left. Me use it to come back.'],
    infernal: ['You left me an ember, {hero}. Embers start fires.', 'I clung to existence by a thread in {land}, {hero}. I am woven of such threads.', 'So close to my end, {hero}. You will not come so close again.', 'You had me broken, {hero}. Broken things have sharp edges.'],
    yokai: ['What is almost nothing but still laughs? Me, in {land}.', 'You blew out all my lanterns but one, {hero}.', 'A whisper from death, {hero}, and the whisper was mine.', 'Nearly gone, {hero}. Nearly is my favourite place.'],
    golems: ['Integrity at four per cent in {land}. Integrity restored. Grudge retained.', 'Near-total failure logged, {hero}. Cause: you. Remedy: you.', 'Survival probability was low, {hero}. I exceeded it.', 'Critical damage, {hero}, but not critical enough.'],
  },
  thrown: {
    orcs: ['You threw me off a cliff, {hero}. I climbed back up just to hit you.', 'I fell a long way in {land}. Long way to think about you.', 'Throw me again, {hero}. I land on my head. It is the hard bit.', 'Last time I went flying. This time you do.'],
    undead: ['You cast me down in {land}, {hero}. The dead are used to falling.', 'I fell, {hero}. I lay at the bottom with the bones. They told me to come back.', 'Throw me where you like, {hero}. I always walk back.', 'You hurled me from the heights. Now I bring the depths to you.'],
    beasts: ['You knocked me off my feet, {hero}. I have four. I got up faster.', 'I tumbled down the rocks in {land}, {hero}. I came up with your scent.', 'Push me again, {hero}. See what I take with me.', 'You threw me, {hero}. I landed hunting.'],
    wildwood: ['You flung me from the bough, {hero}. Leaves always find the ground again.', 'I fell like autumn in {land}, {hero}. Spring is here now.', 'You tossed me down the bank, {hero}, into the brambles. They are my friends.', 'Down I went, {hero}, and the roots caught me.'],
    labyrinth: ['You hurled me into my own pit, {hero}. I know the way out of every pit I dug.', 'A fall in {land}, {hero}. I have redesigned the stairs since.', 'You threw me down, {hero}. The lower halls are where I keep my best ideas.', 'I have counted the steps you knocked me down. All of them. Twice.'],
    ogres: ['You push me off big hill, {hero}! Me roll and roll!', 'Me fall down in {land}! Everybody laugh! Me no laugh.', 'You throw me, {hero}? Me throw you! Further!', 'Me land on rock. Rock broke. Me fine. You next.'],
    infernal: ['You cast me down in {land}, {hero}. I have fallen from far greater heights than yours.', 'You threw me into the dark, {hero}. I was born there.', 'Hurl me again, {hero}. Every fall brings me closer to the pit, and the pit is mine.', 'I fell, {hero}. Thrones are built on such falls.'],
    yokai: ['What falls without breaking? A fox in {land}. Ask {hero}.', 'You tossed me like a paper lantern, {hero}. Lanterns float.', 'Down and down I went, {hero}, and then I was behind you.', 'Push a ghost off a cliff, {hero}, and see where it lands.'],
    golems: ['Unscheduled descent in {land}, cause {hero}. Gyroscopes upgraded.', 'Fall recorded: several levels. Repaired. Retaliation pending.', 'Ballistic event, {hero}. My turn to calculate yours.', 'Displacement by {hero} logged. Anchor bolts installed.'],
  },
  kingSpell: {
    orcs: ['Your king threw magic at me in {land}. Tell him to come down and fight.', 'The little king’s spell stung. Tell him I said thanks.', 'Your king hides behind his spells. I will drag him out.', 'Magic from the sky, eh? I punched the sky. It stopped.'],
    undead: ['Your king’s spell found me in {land}. I have been dead too long for it to matter.', 'Tell your king his magic is fading, like everything.', 'The king cast at me from afar. Afraid to look on what he fights?', 'Your king’s fire was brief. I am not.'],
    beasts: ['The sky bit me in {land}. Your king’s doing. I will bite him back.', 'Your king throws lightning like a coward throws stones.', 'I smelled the king’s magic on the wind. I will follow it home.', 'Your king hurt me from far away. I am coming close.'],
    wildwood: ['Your king rained his spells on my glade in {land}. The glade remembers.', 'A crown that throws spells is still only a crown, little ones.', 'Your king’s magic scorched my bark. I will grow a ring around it.', 'Tell your king the wood heard him. The wood is listening still.'],
    labyrinth: ['Your king’s spell struck my halls in {land}. I have since put a roof over them.', 'A king who fights from the walls has never walked a maze.', 'I have catalogued your king’s spells. Every one of them has a counter in my halls.', 'Your king cast blind into my corridors. He will not find me so easily again.'],
    ogres: ['Your king make sky hurt me! Me no like sky now!', 'Who throw magic in {land}? Your king? Me eat him.', 'Magic go boom on me. Me go boom on you.', 'Tell king me coming. Me hungry for king.'],
    infernal: ['Your king’s spell in {land}, a candle held to a furnace.', 'I tasted your king’s magic. Thin. Mortal. Delicious.', 'Tell your king I bear his spell like a brand. I will return it with interest.', 'A king who casts from safety knows nothing of fire.'],
    yokai: ['What falls from the sky but cannot see? Your king’s spell in {land}.', 'Your king cast a spell at a shadow. The shadow cast one back.', 'The king’s magic burned my tails. I have more tails.', 'Tell your king the fox remembers who threw the stars.'],
    golems: ['Arcane impact in {land}, source: the king. Shielding updated.', 'Royal magic recorded. Resistance compiled.', 'Your king’s spell was inefficient. I have corrected for it.', 'External arcane interference logged. Origin: crown. Response: queued.'],
  },
  eidolon: {
    orcs: ['You called a god on me in {land}. I was still standing after. Think on that.', 'Your big glowing friend hit hard. I hit harder.', 'Call your god again. I want another go.', 'I got hit by a god and lived. What have you done today?'],
    undead: ['You summoned a god against me in {land}. Gods die too. I have met them.', 'Your Eidolon burned like a sun. Suns go out.', 'I have outlived gods, little heroes. I will outlive yours.', 'The sky opened and I did not fall. You should have stopped then.'],
    beasts: ['The sky-beast struck me in {land}. I am the bigger beast.', 'You called something huge. I did not run. Remember that.', 'Your god-thing hurt me. I hunt gods now.', 'I stood under the Eidolon’s strike and howled back.'],
    wildwood: ['You tore the sky open over my wood in {land}. The wood has not forgiven the sky.', 'A god came down to fell me. I bent like a willow, and stood.', 'Your Eidolon scorched every leaf on me. The leaves came back thorns.', 'Call down your god again, little ones. The roots are deeper now.'],
    labyrinth: ['A god walked my halls in {land} and found no centre. Neither will you.', 'Your Eidolon shook my foundations. I have dug them deeper.', 'I survived a god in my own corridors. You are merely mortals.', 'You needed a god against me. What will you need today?'],
    ogres: ['Big shiny thing hit me in {land}! Me hit it back! Me think!', 'You bring big god friend? Me bring big club. Same.', 'Me got squashed by god. Me still here. God gone.', 'Do sky thing again! Me ready this time!'],
    infernal: ['You called a god against me in {land}. I have served worse masters.', 'Your Eidolon’s light, how quaint. I was burning before it was born.', 'Summon your little god. {name} awaits it.', 'I have looked into an Eidolon’s eye and smiled. Look into mine.'],
    yokai: ['What came from the sky and left without me? Your god, in {land}.', 'You tore the heavens for one fox. Flattering.', 'The Eidolon struck, and I was already elsewhere. Mostly.', 'Call your god, heroes. I have a riddle for it.'],
    golems: ['Eidolon-class strike survived in {land}. Armour rated accordingly.', 'Divine impact logged. Divinity: overrated.', 'Your summoned entity caused damage. Damage repaired. Entity noted.', 'Eidolon strike recorded. Repeat strikes will be less effective.'],
  },
  element: {
    orcs: ['Your {what} got me in {land}. Look, I kept the scars.', 'I been through your {what}. Bring more.', 'A bit of {what}? I bathe in worse.', 'Last time you got me with {what}. This time I got thicker skin.'],
    undead: ['Your {what} ate at me in {land}. There is little left to eat.', 'I remember your {what}, how it crept into my bones.', 'Your {what} cannot kill what is already dead. You tried.', 'The {what} you laid on me lingers still. So do I.'],
    beasts: ['Your {what} burned my hide in {land}. My hide grew back tougher.', 'I smell {what} on you. I remember that smell.', 'You poured {what} on me. I shook it off. I shake you off next.', 'The {what} hurt. Pain makes me fast.'],
    wildwood: ['Your {what} withered half my leaves in {land}. The other half is sharp.', 'I wear the scars of your {what}, little ones, like autumn wears red.', 'The {what} you brought into my wood still lingers. The wood is angry.', 'Bring your {what} again. I have grown a bark for it.'],
    labyrinth: ['Your {what} filled my halls in {land}. I have since built drains.', 'I know the taste of your {what} now. I have designed around it.', 'The {what} you set loose in my maze got lost. As will you.', 'Every wall of mine still bears the mark of your {what}. A lesson, carved.'],
    ogres: ['Your {what} make me all funny in {land}! Me no like funny!', 'Ow, {what}! Me remember ow!', 'You do {what} again, me do angry again.', 'The {what} hurt my belly. Now me hungry AND hurt.'],
    infernal: ['Your {what} in {land}, a mortal trick. I have learned it.', 'You scarred me with {what}. I wear it like a crown.', 'I drank your {what} and found it wanting.', 'More {what}, heroes. I am curious how much you have.'],
    yokai: ['What wears your {what} like a coat and smiles? I do, since {land}.', 'Your {what} left a mark on my mask. I painted over it.', 'A riddle: what is {what} to a ghost?', 'You poured {what} on mist in {land}. How did that go?'],
    golems: ['Elemental damage: {what}, {land}. Insulation installed.', 'Your {what} corroded seven plates. Plates replaced, grudge retained.', 'Exposure to {what} recorded. Tolerance increased.', 'Analysis complete: {what}. Effectiveness against me: decreasing.'],
  },
};

/**
 * NEMESIS-DEPTH, idea 4: the hunt's taunts (`hunt.ts`). `quarry`: it knows it is hunted, as the wave opens; `lived`: at the meeting after it
 * outlived a hunt. They fill from `{name}` alone. Reached for before anything else.
 */
export type HuntTrigger = 'quarry' | 'lived';
export const HUNT_TAUNTS: Readonly<Record<HuntTrigger, Readonly<Record<Voice, readonly string[]>>>> = {
  quarry: {
    orcs: ['Heard you put a price on my head. Come and collect.', 'You are hunting me? Good. Saves me looking for you.'],
    undead: ['You hunt the dead? We are very good at waiting.', 'I heard the hunting horns. I have heard them for a hundred years.'],
    beasts: ['You hunt me? I was born hunted. I grew teeth.', 'I smell the hunt on you. I smell fear under it.'],
    wildwood: ['A hunt, in my wood? The wood hunts back.', 'Follow my trail, little hunters. It leads into the briars.'],
    labyrinth: ['You hunt me in my own halls? Every corridor is mine.', 'Seek me, then. I have built a hundred ways to be lost.'],
    ogres: ['You hunt me? Me hunt you! Me better at it!', 'Me hear you looking for me. Me right here. Hello.'],
    infernal: ['You set a price on me? I have bought and sold kings.', 'Hunt me, then. The hunter becomes the kindling.'],
    yokai: ['What is hunted and laughing? Guess before you find me.', 'You followed the lanterns. They were mine.'],
    golems: ['Hunt directive detected. Counter-directive engaged.', 'You have designated me a target. Reciprocating.'],
  },
  lived: {
    orcs: ['You hunted me, and here I am. Who is the prey now?', 'Wasted your trophies on me, eh? Ha!'],
    undead: ['You hunted me and found only a grave. Not mine.', 'Your hunt failed. The dead are patient; the living are not.'],
    beasts: ['You hunted me and lost the trail. I never lose yours.', 'The hunt is over, and I am still running. Now I run at you.'],
    wildwood: ['Your hunt ended in the thorns, and I walked out of them laughing.', 'You hunted me through my own wood. How did that go?'],
    labyrinth: ['You hunted me through my halls and found the way out instead. Shame.', 'A failed hunt is a lesson. Did you learn it?'],
    ogres: ['You no catch me last time! Me hide behind tree! Big tree!', 'Hunt me again! Me like it! Me win!'],
    infernal: ['You paid to hunt me, and I am still here. A poor bargain.', 'Your hunt failed. I let you live to remember it.'],
    yokai: ['You hunted a fox and caught your own tail.', 'What did the hunt catch? Nothing at all. That was me.'],
    golems: ['Previous hunt: failed. Probability of success: lower.', 'Hunt record retrieved: you lost. Repeating?'],
  },
};

/** NEMESIS-DEPTH, idea 5: a nemesis that has studied a hero on the board says so (`{hero}`, `{kind}`), two lines a voice. Reached for after a
 *  remembered moment about a hero on the board, before a humiliation. */
export const STUDY_TAUNTS: Readonly<Record<Voice, readonly string[]>> = {
  orcs: ['I been watching you, {hero}. I know your tricks now.', 'Same moves as last time, {hero}? I am ready for them.'],
  undead: ['I have studied you in the dark, {hero}. Every motion.', 'You repeat yourself, {hero}. The dead notice such things.'],
  beasts: ['I know how you strike, {hero}. I know where to step.', 'Your scent, your swing, your tricks. I learned them all, {hero}.'],
  wildwood: ['I watched you from the boughs, {hero}. I know your every step.', 'The wood has learned your rhythm, {hero}. Dance a new one.'],
  labyrinth: ['I have mapped your every move, {hero}, as I map my halls.', 'A {kind} is a puzzle, {hero}, and I have solved you.'],
  ogres: ['Me watch you lots, {hero}! Me know your hitty thing!', 'You do same thing every time, {hero}. Me remember. Me clever.'],
  infernal: ['I have studied you, {hero}, as one studies a candle before snuffing it.', 'Your tricks are known to me, {hero}. Show me something new.'],
  yokai: ['What knows your next move before you do, {hero}?', 'I have watched you in a hundred mirrors, {hero}.'],
  golems: ['Combat pattern {hero}: recorded. Countermeasures: active.', 'Analysis of {hero}: complete. Predictability: high.'],
};
