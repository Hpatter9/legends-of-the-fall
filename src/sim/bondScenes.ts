// The bond scenes (DEPTH-BUILD, docs/notes/depth-design.md section 4): a kindred pair's short scene at bond levels 1, 3 and 5, played the
// next time the player is at the camp or the castle. Drafted in batches of ten for the owner to read (Q4.2), in the cinematic style of the
// opening (docs/notes/opening-v2.md): a held wide shot on one backdrop, the two walking on, three to six lines in their own voices, and a
// closer framing for the last word. Batches 1 to 4: every kindred pair's and every rivalry's first scene (bond level 1). Pure data: no Pixi, no DOM.

import { shoot, wide, say, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import { bondKey, levelOf, type BondMeta } from './bonds';

interface BondDraft {
  a: string;
  b: string;
  level: 1 | 3 | 5;
  title: string;
  blurb: string;
  look: Area;
  /** The lines, each `a` or `b` speaking (the first stands left, the second right). */
  lines: ['a' | 'b', string][];
}

const D = (a: string, b: string, level: 1 | 3 | 5, title: string, look: Area, blurb: string, lines: ['a' | 'b', string][]): BondDraft => ({ a, b, level, title, look, blurb, lines });

/** Batch 1: the first ten kindred pairs, bond level 1. */
const DRAFTS: readonly BondDraft[] = [
  D('knight', 'peasant', 1, 'Margaret', 'plains', 'The knight finds the peasant holding the line with a spear older than both of them.', [
    ['a', 'You held the left flank with a boar spear older than I am.'],
    ['b', 'It was my gran\'s, sir. She called it Margaret.'],
    ['a', 'Next time, take a new one from the rack.'],
    ['b', 'And leave Margaret behind? She has seen off three wolves and a tax man.'],
    ['a', 'Margaret. Very well. Margaret stands with us.'],
  ]),
  D('samurai', 'kunoichi', 1, 'Two Kinds of Quiet', 'shrine', 'A sword drawn in the open and a blade that never is.', [
    ['a', 'You struck from behind him. There is no honour in that.'],
    ['b', 'He had a hundred friends. I had you. I did the arithmetic.'],
    ['a', '...The arithmetic was sound.'],
    ['b', 'Then face them in the open, and I will see to the honour of their backs.'],
  ]),
  D('archer', 'lightningMage', 1, 'Who Hit It First', 'highlands', 'An argument over a felled ogre that neither will give up.', [
    ['b', 'My bolt dropped it. You saw the smoke.'],
    ['a', 'My arrow was in its eye before your smoke had an opinion.'],
    ['b', 'Shall we count it as half each?'],
    ['a', 'I will count it as mine, and you may count the smoke.'],
  ]),
  D('wizard', 'wanderer', 1, 'A Map With No Edges', 'autumn', 'The wizard asks the wanderer where the road goes.', [
    ['a', 'Where were you before the Keep, traveller?'],
    ['b', 'Walking. Before that, walking somewhere else.'],
    ['a', 'And where will you go when this is done?'],
    ['b', 'Wherever the road wants. It has never once asked my opinion.'],
    ['a', 'A sensible road. Mine only ever led to libraries.'],
  ]),
  D('paladin', 'cleric', 1, 'The Same Hymn', 'temple', 'Two of the faithful, one with a shield and one with a prayer.', [
    ['b', 'You sang the dawn hymn as you charged. Off key.'],
    ['a', 'The foe did not seem to mind.'],
    ['b', 'The foe was not standing beside you.'],
    ['a', 'Then stand beside me again tomorrow, and correct me.'],
  ]),
  D('werewolf', 'barbarian', 1, 'Who Howled', 'forest', 'Two who fight like storms compare their storms.', [
    ['b', 'You howled at the moon mid-fight. I respect that.'],
    ['a', 'It was a sunny afternoon.'],
    ['b', 'Then you howled at the sun. Even better.'],
    ['a', 'You are the first who has not run from the howling.'],
    ['b', 'Run? I was howling too. You just could not hear me.'],
  ]),
  D('rifleBot', 'siegeBot', 1, 'Calibration', 'forge', 'Two machines compare how they keep count.', [
    ['a', 'Shots fired: forty-one. Shots landed: forty-one.'],
    ['b', 'Walls flattened: three. Walls intended: two.'],
    ['a', 'Query: the third wall?'],
    ['b', 'It was in the way of the second wall. Logged as a bonus.'],
  ]),
  D('kitsune', 'karasu', 1, 'Feathers and Foxfire', 'shrine', 'The fox spirit and the crow tengu, old neighbours on the mountain.', [
    ['b', 'You stole my feathers for a disguise, eighty years ago.'],
    ['a', 'Seventy. And I gave them back.'],
    ['b', 'You gave back different feathers.'],
    ['a', 'Better feathers. You have looked very dashing since.'],
  ]),
  D('knight', 'paladin', 1, 'Oaths, Compared', 'warcamp', 'Two sworn swords measure their oaths over the campfire.', [
    ['a', 'Whom did you swear to, before the Keep?'],
    ['b', 'To the light, to the weak, and to rising before dawn.'],
    ['a', 'I swore to a king who is dust now.'],
    ['b', 'Then swear to the one who stands here. I will hold you to it.'],
  ]),
  D('archer', 'ranger', 1, 'Fletching', 'forest', 'Two bow hands trade arrows and insults.', [
    ['b', 'Your fletching is crooked. Goose feathers?'],
    ['a', 'Duck. The geese would not volunteer.'],
    ['b', 'Here. Try one of mine. Hawk.'],
    ['a', 'It flies straight. Annoyingly straight.'],
    ['b', 'Keep it. I want to see you miss with it.'],
  ]),
  // (batch 2: the next ten pairs, bond level 1)
  D('ninjaMonk', 'yamabushi', 1, 'The Mountain Path', 'highlands', 'Two who train on mountains argue about which mountain.', [
    ['b', 'You walk the path as if the stones owe you money.'],
    ['a', 'They do. I climbed them every morning for twelve years.'],
    ['b', 'I was born on mine. It still pushes me off.'],
    ['a', 'Then we have both been taught by rocks. Shall we teach these orcs?'],
  ]),
  D('samurai', 'samuraiCommander', 1, 'The Old Banner', 'warcamp', 'A swordsman and the commander whose banner he once followed.', [
    ['b', 'I know that guard. You stood in my third rank at the river.'],
    ['a', 'Second rank, my lord. The third ran.'],
    ['b', 'Then stand in my first, if you will have it.'],
    ['a', 'I will have it. Mind you keep up.'],
  ]),
  D('cleric', 'priestess', 1, 'Two Prayers', 'temple', 'A village cleric and a temple priestess find they pray to the same dawn.', [
    ['b', 'You pray quickly. In the temple we take an hour.'],
    ['a', 'In the village we have about a minute before the roof leaks.'],
    ['b', 'Then teach me the minute, and I will teach you the hour.'],
    ['a', 'Agreed. The hour first, though. My knees need the rest.'],
  ]),
  D('druid', 'satyr', 1, 'The Grove Song', 'forest', 'The druid tends the grove; the satyr plays to it.', [
    ['b', 'The trees grow better when I play.'],
    ['a', 'The trees grow better when you stop stepping on the saplings.'],
    ['b', 'Both can be true.'],
    ['a', 'Play, then. Softly. And off the seedbed.'],
  ]),
  D('druid', 'wolfBard', 1, 'A Song for the Wood', 'autumn', 'A bard writes a ballad; the druid has notes.', [
    ['b', 'I have written a song about you. Forty verses.'],
    ['a', 'I have only done three things worth singing.'],
    ['b', 'The other thirty-seven are about your beard.'],
    ['a', 'Sing the three. The beard can speak for itself.'],
  ]),
  D('werewolf', 'wolfBard', 1, 'Full Moon Ballad', 'graveyard', 'The bard wants the true story of the howling; the werewolf would rather not.', [
    ['b', 'Is it true the moon calls to you?'],
    ['a', 'It calls. I do not always answer.'],
    ['b', 'May I put that in a song?'],
    ['a', 'If it rhymes with anything, I will howl at you.'],
  ]),
  D('beastmaster', 'minotaur', 1, 'Not a Pet', 'ruins', 'The beastmaster offers the minotaur a treat. A mistake, nearly.', [
    ['a', 'Easy, big fellow. I have a carrot.'],
    ['b', 'I am not a fellow you feed carrots.'],
    ['a', 'My apologies. Would you like the bread?'],
    ['b', '...The bread, yes. Thank you.'],
  ]),
  D('gorgon', 'minotaur', 1, 'The Labyrinth Remembers', 'temple', 'Two exiles of the old labyrinth meet by daylight.', [
    ['a', 'You were the one in the east wing. The one who wept at night.'],
    ['b', 'And you sang to the statues. I heard you through the walls.'],
    ['a', 'They were good listeners.'],
    ['b', 'So am I. And I do not turn to stone.'],
  ]),
  D('kraken', 'buccaneer', 1, 'Old Sea Debts', 'oasis', 'The buccaneer once sank a ship. The kraken was under it.', [
    ['b', 'You look like a beastie that ate my second ship.'],
    ['a', 'I did not eat it. I sat on it. You were in my bay.'],
    ['b', 'Fair. The bay is lovely.'],
    ['a', 'It is. Fight beside me and I will show you the wrecks.'],
  ]),
  D('buccaneer', 'dreadPirate', 1, 'Two Flags', 'desert', 'A buccaneer and a dread pirate compare the trade.', [
    ['a', 'You hang a black flag. I hang a cheerful one.'],
    ['b', 'Mine makes merchants surrender.'],
    ['a', 'Mine makes them laugh. They surrender anyway, and offer tea.'],
    ['b', 'Tea. I may need a new flag.'],
  ]),
  // (batch 3: rivalries settled. A rival pair reaches bond level 1 only when it settles, so its level-1 scene is the settling scene)
  D('samuraiCommander', 'mercenary', 1, 'Paid in Respect', 'warcamp', 'The commander and the sellsword, after ten battles side by side.', [
    ['a', 'You fight for coin. I have said it before, and with less kindness.'],
    ['b', 'And you fight for a banner that burned. We are both fools.'],
    ['a', 'Ten battles. You never once broke the line.'],
    ['b', 'Nobody paid me to. Call that one free.'],
  ]),
  D('wizard', 'warlock', 1, 'Two Kinds of Fire', 'crystal', 'The scholar and the pact-maker, out of arguments at last.', [
    ['a', 'I still say your power is borrowed.'],
    ['b', 'And yours is copied out of books. Borrowed from the dead.'],
    ['a', '...That is fair, actually.'],
    ['b', 'Ten fights, and we are still alive. Let us call it a draw.'],
  ]),
  D('paladin', 'demonSwordsman', 1, 'The Sword Remembers', 'volcano', 'A holy knight and a cursed blade, with nothing left to prove.', [
    ['a', 'I watched your blade. It hungers.'],
    ['b', 'It does. I have not fed it once since we met.'],
    ['a', 'Ten battles, and you held it back each time.'],
    ['b', 'Stand beside me and I will keep holding.'],
  ]),
  D('priestess', 'reaper', 1, 'The Last Rites', 'graveyard', 'The priestess of the living and the reaper of the dead, sharing a vigil.', [
    ['b', 'You pray over every one I take.'],
    ['a', 'Someone ought to.'],
    ['b', 'Then pray loudly. I would like them to hear it on the way.'],
    ['a', 'I will. And you will take them gently.'],
  ]),
  D('knight', 'tyrant', 1, 'An Oath and a Crown', 'ruins', 'The knight of a dead king and a would-be king, after ten fights.', [
    ['b', 'Kneel, and you could have a place at my court.'],
    ['a', 'I knelt once. The king is dust.'],
    ['b', 'Then stand. I find I prefer you standing, beside me.'],
    ['a', 'For now. Watch your crown.'],
  ]),
  D('ranger', 'werewolf', 1, 'The Hunter and the Hunted', 'forest', 'The ranger once hunted wolves for coin.', [
    ['a', 'I hunted your kind once. For a silver a pelt.'],
    ['b', 'I know. I followed you for a week. You never saw me.'],
    ['a', 'Why did you not strike?'],
    ['b', 'You left the cubs. I remembered that.'],
  ]),
  D('dreadPirate', 'lancer', 1, 'Boarding the Charge', 'oasis', 'A pirate and a cavalry lancer find they like the same thing: speed.', [
    ['a', 'You charge like a ship running before a gale.'],
    ['b', 'And you board like cavalry. No manners, all momentum.'],
    ['a', 'Ten fights. I have not once had to save you.'],
    ['b', 'Nine. I counted the bridge.'],
  ]),
  D('gunslinger', 'arcBlade', 1, 'Quickest Draw', 'desert', 'Two duellists, done with counting who is faster.', [
    ['a', 'I am still faster.'],
    ['b', 'You are louder. That is not the same.'],
    ['a', 'Ten fights, and neither of us dead.'],
    ['b', 'Then we draw together, and the foe can count.'],
  ]),
  D('cleric', 'mummy', 1, 'Unquiet Rest', 'dungeon', 'The cleric who lays the dead to rest, and a dead man who would not stay laid.', [
    ['a', 'Every prayer I know says you should be in the ground.'],
    ['b', 'I tried it. It was very dull.'],
    ['a', 'Ten fights. You saved me twice.'],
    ['b', 'Then pray for me once. I would like to hear how it goes.'],
  ]),
  D('timeWitch', 'illusionist', 1, 'Seen It Before', 'temple', 'One sees what will be; the other, what is not there.', [
    ['a', 'I saw this conversation coming.'],
    ['b', 'Did you? Or did I make you think you did?'],
    ['a', '...I hate that I cannot tell.'],
    ['b', 'Good. Ten fights, and I finally have you guessing.'],
  ]),
  // (batch 4: the last twenty kindred pairs, bond level 1)
  D('mummy', 'shambler', 1, 'Old Bones', 'graveyard', 'Two who should be dead compare notes on not being.', [
    ['a', 'You are falling apart.'],
    ['b', 'You are held together with bandages.'],
    ['a', 'Linen. Very good linen. Three thousand years old.'],
    ['b', 'Lend me a strip. My arm keeps wandering off.'],
  ]),
  D('reaper', 'demonSwordsman', 1, 'Two Edges', 'volcano', 'The reaper and the cursed swordsman, both carrying blades that want more.', [
    ['b', 'Your scythe sings too.'],
    ['a', 'It hums. Only when someone is close to the end.'],
    ['b', 'Mine screams. All the time.'],
    ['a', 'Then stand by me. Mine is quieter company.'],
  ]),
  D('timeWitch', 'sage', 1, 'The Long View', 'temple', 'The witch who sees ahead and the sage who has seen a great deal behind.', [
    ['a', 'I have seen how this war ends.'],
    ['b', 'And?'],
    ['a', 'I am not allowed to say. It would spoil it.'],
    ['b', 'At my age, nothing spoils. Tell me over tea.'],
  ]),
  D('illusionist', 'wizard', 1, 'Real Fire', 'crystal', 'The wizard wants to know whether the illusionist\'s fire is real.', [
    ['b', 'Your fireball. Was it real?'],
    ['a', 'The orc thought so. He ran into a river.'],
    ['b', 'That is not an answer.'],
    ['a', 'It is the only one that matters.'],
  ]),
  D('warlock', 'tyrant', 1, 'Terms of Service', 'ruins', 'Two who know the price of power haggle over it.', [
    ['b', 'Your patron. What does it ask of you?'],
    ['a', 'A tithe. A little of my shadow each year.'],
    ['b', 'Mine asks for a kingdom.'],
    ['a', 'Then you have a worse contract than I do.'],
  ]),
  D('gunslinger', 'rifleBot', 1, 'Trick Shots', 'desert', 'A gunslinger and a machine that never misses.', [
    ['a', 'Bet you cannot shoot a coin out of the air.'],
    ['b', 'Query: which face of the coin?'],
    ['a', '...You are no fun at all.'],
    ['b', 'Fun: not calibrated. Accuracy: one hundred percent.'],
  ]),
  D('lancer', 'dragoon', 1, 'Up and Through', 'highlands', 'One charges along the ground, the other comes down from the sky.', [
    ['a', 'I go through them.'],
    ['b', 'I go over them, then down on them.'],
    ['a', 'Then they will not know which way to look.'],
    ['b', 'Exactly. Count to three, then charge.'],
  ]),
  D('juggernaut', 'siegeBot', 1, 'Walls', 'forge', 'Two who knock down walls for a living.', [
    ['a', 'I knocked down a wall today.'],
    ['b', 'Walls flattened today: four.'],
    ['a', 'Mine was a big wall.'],
    ['b', 'Then we share the record. Proposal: more walls.'],
  ]),
  D('kunoichi', 'ninjaMonk', 1, 'Quiet Feet', 'shrine', 'Two who move without a sound, trying to catch each other out.', [
    ['b', 'You were behind me just now.'],
    ['a', 'I was. You turned before I reached you.'],
    ['b', 'Your breath. You hold it before you strike.'],
    ['a', 'Then I will learn to breathe. Teach me.'],
  ]),
  D('peasant', 'ranger', 1, 'Snares and Supper', 'plains', 'The peasant and the ranger set snares and swap recipes.', [
    ['a', 'You set a snare like my old dad.'],
    ['b', 'He knew his work, then.'],
    ['a', 'He caught the bailiff once. By the ankle.'],
    ['b', 'Then he knew it very well indeed.'],
  ]),
  D('sage', 'priestess', 1, 'The Old Texts', 'temple', 'The sage reads the temple\'s oldest scrolls to the priestess.', [
    ['b', 'You read that prayer as if you wrote it.'],
    ['a', 'I copied it, when I was a boy. Badly.'],
    ['b', 'There is a mistake in the third line. We sing it every morning.'],
    ['a', 'Keep it. It sounds better wrong.'],
  ]),
  D('kitsune', 'yamabushi', 1, 'Fox on the Mountain', 'snow', 'The tengu once chased the fox off his mountain.', [
    ['b', 'You stole my rice cakes. Every winter.'],
    ['a', 'You left them out. On a rock. In the snow.'],
    ['b', 'For the mountain spirits!'],
    ['a', 'I am a mountain spirit. Ask anyone.'],
  ]),
  D('arcBlade', 'lightningMage', 1, 'Spark', 'crystal', 'A blade that carries lightning, and the mage who throws it.', [
    ['b', 'Your sword crackles. Who taught you?'],
    ['a', 'Nobody. I was struck while holding it.'],
    ['b', 'That is how I learnt too.'],
    ['a', 'Then we were taught by the same storm.'],
  ]),
  D('mercenary', 'gunslinger', 1, 'Rates', 'warcamp', 'Two hired hands compare what they charge.', [
    ['a', 'What does the crown pay you?'],
    ['b', 'Two crowns a day and all the beans I can eat.'],
    ['a', 'I get three, and no beans.'],
    ['b', 'Then the beans are worth a crown. Good to know.'],
  ]),
  D('paladin', 'lancer', 1, 'The Charge', 'plains', 'The paladin and the lancer, side by side before a charge.', [
    ['b', 'You ride well, for a man in that much armour.'],
    ['a', 'The horse is blessed. Mostly with patience.'],
    ['b', 'On my mark, then. Light and lance.'],
    ['a', 'Light and lance. I like that.'],
  ]),
  D('barbarian', 'juggernaut', 1, 'Bigger', 'snow', 'Two very large people meet. Measuring follows.', [
    ['a', 'I am bigger than you.'],
    ['b', 'You are not.'],
    ['a', 'Stand back to back. Duchess will judge.'],
    ['b', '...The goat has eaten the measuring string.'],
  ]),
  D('wanderer', 'sage', 1, 'Roads and Books', 'autumn', 'The wanderer has walked every road the sage has only read about.', [
    ['b', 'Is it true the eastern road ends in a sea of glass?'],
    ['a', 'It ends in a puddle. A large, shiny puddle.'],
    ['b', 'Three books say a sea.'],
    ['a', 'The people who wrote them never walked there.'],
  ]),
  D('beastmaster', 'ranger', 1, 'Tracks', 'forest', 'Two who read the forest floor disagree about what passed.', [
    ['a', 'A bear. Three days ago.'],
    ['b', 'A badger. Yesterday. A very confident badger.'],
    ['a', 'Badgers do not walk like that.'],
    ['b', 'This one does. I have met it.'],
  ]),
  D('karasu', 'yamabushi', 1, 'Two Tengu', 'snow', 'A crow tengu and a mountain monk who follows the tengu way.', [
    ['b', 'I have studied the tengu way for twenty years.'],
    ['a', 'And you still cannot fly.'],
    ['b', 'The way is not about flying.'],
    ['a', 'It is a little bit about flying.'],
  ]),
  D('druid', 'kitsune', 1, 'The Fox in the Grove', 'forest', 'The druid finds the fox spirit napping in the sacred grove.', [
    ['a', 'This grove is sacred.'],
    ['b', 'So am I. We get on very well.'],
    ['a', 'You are sleeping on the altar.'],
    ['b', 'It is a very comfortable altar.'],
  ]),
  // (batch 4: the last five rivalries settled)
  D('dragoon', 'kraken', 1, 'Sky and Sea', 'oasis', 'The dragoon falls from the sky; the kraken rises from the deep.', [
    ['a', 'You pulled me under, the first time we met.'],
    ['b', 'You landed on my head.'],
    ['a', 'Ten fights since. Not once on your head.'],
    ['b', 'Not once under. We are learning.'],
  ]),
  D('samurai', 'ninjaMonk', 1, 'The Open Hand', 'shrine', 'The swordsman and the monk who fights unarmed.', [
    ['a', 'A sword is a promise. You carry none.'],
    ['b', 'My hands are my promise. They are always with me.'],
    ['a', 'Ten fights, and you never once fell behind.'],
    ['b', 'Nor you. Shall we call it an even match?'],
  ]),
  D('barbarian', 'minotaur', 1, 'Horns and Axes', 'ruins', 'Two charging brutes, at last on the same side of the charge.', [
    ['a', 'I still say I hit harder.'],
    ['b', 'And I still say you hit the wall.'],
    ['a', 'Ten fights, and you never once trampled me.'],
    ['b', 'You never once axed me. A friendship, then.'],
  ]),
  D('satyr', 'shambler', 1, 'The Dance', 'swamp', 'The satyr has been trying to teach the shambler to dance.', [
    ['a', 'Left foot. No, the other left foot.'],
    ['b', 'It fell off.'],
    ['a', 'Then hop. Ten fights, and you never missed a beat in battle.'],
    ['b', 'Battle has a better rhythm.'],
  ]),
  D('juggernaut', 'rifleBot', 1, 'Covering Fire', 'forge', 'The juggernaut walks in front; the rifle bot shoots past him.', [
    ['b', 'Shots that passed within an inch of you: three hundred.'],
    ['a', 'And hit me?'],
    ['b', 'None. Trust: increasing.'],
    ['a', 'Then keep shooting. I will keep walking.'],
  ]),
  // (batch 5: bond level 3, "Sworn", for the first ten kindred pairs)
  D('knight', 'peasant', 3, 'Squire Margaret', 'plains', 'The knight offers the peasant a title. The peasant has questions.', [
    ['a', 'Kneel. I mean to make you my squire.'],
    ['b', 'Do I get a horse?'],
    ['a', 'You get a shield, a duty, and my trust.'],
    ['b', 'And Margaret? Does she get a title?'],
    ['a', 'Dame Margaret. Rise, both of you.'],
  ]),
  D('samurai', 'kunoichi', 3, 'The Shadow at His Back', 'shrine', 'The samurai asks the kunoichi to guard the one place he cannot see.', [
    ['a', 'In every duel I face forward. My back is always open.'],
    ['b', 'I had noticed. So had three assassins.'],
    ['a', 'Then guard it. I ask it as a friend.'],
    ['b', 'Already done. They will not try a fourth time.'],
  ]),
  D('archer', 'lightningMage', 3, 'Storm Arrow', 'highlands', 'The archer and the mage make one shot together.', [
    ['b', 'Hold still. I will put a spark in the arrowhead.'],
    ['a', 'If this explodes in my hand, I am haunting you.'],
    ['b', 'It will explode in the ogre. Probably.'],
    ['a', 'Probably. Fine. Loose on three.'],
  ]),
  D('wizard', 'wanderer', 3, 'The Last Page', 'autumn', 'The wizard has started writing down the wanderer\'s roads.', [
    ['b', 'You are writing a book about me?'],
    ['a', 'About the roads. You are only in the margins.'],
    ['b', 'Leave room at the end. I am not done walking.'],
    ['a', 'I left a hundred blank pages. Do not make me need more.'],
  ]),
  D('paladin', 'cleric', 3, 'One Shield, One Prayer', 'temple', 'The paladin and the cleric swear to hold the line together.', [
    ['b', 'When you fall, I will be there to raise you.'],
    ['a', 'And when you are struck, I will be there first.'],
    ['b', 'Then we are sworn. Shield and prayer.'],
    ['a', 'Shield and prayer. Sing it off key, for luck.'],
  ]),
  D('werewolf', 'barbarian', 3, 'The Pack of Two', 'forest', 'The werewolf asks the barbarian to run with him under the full moon.', [
    ['a', 'Tonight is a full moon. I lose myself.'],
    ['b', 'Then I will be there to find you.'],
    ['a', 'I might bite.'],
    ['b', 'I bite back. That is what a pack is.'],
  ]),
  D('rifleBot', 'siegeBot', 3, 'Linked Systems', 'forge', 'Two machines share their targeting.', [
    ['a', 'Proposal: link our targeting.'],
    ['b', 'Risk: you would see what I see.'],
    ['a', 'Acceptable. You would see what I see.'],
    ['b', 'Linked. Warning: you see a great many walls.'],
  ]),
  D('kitsune', 'karasu', 3, 'A Feather Returned', 'shrine', 'The fox finally gives back the crow\'s real feathers.', [
    ['a', 'Here. Your feathers. The real ones. I kept them.'],
    ['b', 'For seventy years?'],
    ['a', 'Eighty. I was waiting for you to forgive me.'],
    ['b', 'I forgave you in the first week. I just liked the new ones.'],
  ]),
  D('knight', 'paladin', 3, 'A New Oath', 'warcamp', 'The knight swears himself to the Keep, with the paladin as witness.', [
    ['b', 'You said you swore to a king who is dust.'],
    ['a', 'I did. Tonight I swear again, to the Keep and those inside it.'],
    ['b', 'Then I witness it, under the light.'],
    ['a', 'And if I break it?'],
    ['b', 'Then I will be there to help you mend it.'],
  ]),
  D('archer', 'ranger', 3, 'The Shared Quiver', 'forest', 'The two bow hands start filling one quiver.', [
    ['b', 'You are using my hawk-feathered arrows.'],
    ['a', 'You said to miss with them. I have not missed yet.'],
    ['b', 'Then keep them. We will share one quiver.'],
    ['a', 'Half duck, half hawk. They will never know what hit them.'],
  ]),
];

/** A scene's id: "bond:knight|peasant:1". */
export const bondSceneId = (key: string, level: number): string => `bond:${key}:${level}`;

function sceneOf(d: BondDraft): Scene {
  const key = bondKey(d.a, d.b);
  const lines = d.lines.map(([who, text]) => say(who, text));
  const split = Math.max(1, lines.length - 1);
  const shots: Shot[] = [
    { look: d.look, cam: wide(288, 205), ...shoot('wide', undefined, 'still', 'fade'), caption: d.title, acts: [{ who: 'a', enter: 250, from: 120 }, { who: 'b', enter: 330, from: 460 }], lines: lines.slice(0, split) },
    { look: d.look, cam: wide(290, 215, 1.25), ...shoot('two', undefined, 'pushIn'), lines: lines.slice(split), hold: 1 },
  ];
  return {
    id: bondSceneId(key, d.level),
    title: d.title,
    blurb: d.blurb,
    moment: { kind: 'bond', pair: key, level: d.level },
    family: 'bond',
    music: 'solemn',
    cast: { a: { role: `unit:${d.a}`, x: 250, facing: 'right', hidden: true }, b: { role: `unit:${d.b}`, x: 330, facing: 'left', hidden: true } },
    shots,
  };
}

export const BOND_SCENES: readonly Scene[] = DRAFTS.map(sceneOf);

/** The bond scenes now due: a pair's scene for a level it has reached, not yet seen. The page plays one at the camp or the castle. */
export function bondScenesDue(m: BondMeta & { seenScenes?: readonly string[] }, seen: (id: string) => boolean): string[] {
  return BOND_SCENES.filter((s) => s.moment.kind === 'bond' && levelOf(m, s.moment.pair) >= s.moment.level && !seen(s.id)).map((s) => s.id);
}
