// What the heroes say: a short line in each hero's own voice for being hired (or picked), first placed on the board, a win and
// a loss, and a little banter between heroes who share a trait. Plain data in the game's voice (British spelling, gently funny,
// never mean). Which line is said, and how often, is `render/quipRules.ts`; the speech bubble is `quipView.ts`.

export type QuipKind = 'hired' | 'placed' | 'won' | 'lost';

export type HeroQuips = Record<QuipKind, string>;

export const HERO_QUIPS: Record<string, HeroQuips> = {
  knight: { hired: 'Sworn to the line, and to a reasonable lunch hour.', placed: 'I shall stand here. Do ask the enemy to come to me.', won: 'The line held. I never doubted it. A little.', lost: 'The line... bent. Purely as a matter of geometry.' },
  samurai: { hired: 'One blade, and no small talk.', placed: 'I have chosen my tile. It is a fine tile.', won: 'Quietly done. Quietly pleased.', lost: 'A poor day. I shall think on it, loudly, later.' },
  kunoichi: { hired: 'You will not see me arrive. Too late, you already have.', placed: 'Roofs would be better. This will do.', won: 'Was I even here? Yes. Pay me.', lost: 'That was never in my plan. I shall blame the plan.' },
  archer: { hired: 'I can hit a pigeon at forty paces. The pigeons know.', placed: 'High ground, please. Arrows like a view.', won: 'Every shot a good one. Several, anyway.', lost: 'I ran out of arrows. And excuses.' },
  wizard: { hired: 'Fire is a very good argument. I shall make it often.', placed: 'Stand back. Further. Further than that.', won: 'Somebody check the grass. For smouldering.', lost: 'Mild setback. Several things are on fire, mostly me.' },
  ninjaMonk: { hired: 'My hands are enough. My feet are better.', placed: 'Breathe in. Breathe out. Hit.', won: 'Be calm. Be smug. But calm.', lost: 'The way is long. Today it was also bruising.' },
  peasant: { hired: 'Oh! Me? I only came about the pitchfork.', placed: 'Right then. Stand here and look brave. Got it.', won: 'We did it! Can I tell my mum?', lost: 'Well. At least the crops are doing well.' },
  lightningMage: { hired: 'Static is my love language.', placed: 'Anyone wearing metal, I am sorry in advance.', won: 'Shocking. Truly. I am sorry.', lost: 'I felt a certain... lack of spark.' },
  wanderer: { hired: 'I was only passing through. Fine. For a while.', placed: 'I shall mend whoever looks most hurt. Or most dramatic.', won: 'Everyone is mostly in one piece. Hurrah for mostly.', lost: 'I walk on. It is, after all, what I do.' },
  kitsune: { hired: 'You hired me, you think. How kind to let you think so.', placed: 'Do try to keep up. Nine tails, one rule: no.', won: 'Charming. In the proper, tail-flicking sense.', lost: 'I let them win. Yes. Entirely on purpose.' },
  karasu: { hired: 'I have been watching you for some time. Hello.', placed: 'Air is nicer than ground. I shall be above it all.', won: 'From up here you looked rather good.', lost: 'I fell? No. I descended with feeling.' },
  yamabushi: { hired: 'The mountain sends its regards, and a stiff breeze.', placed: 'A little wind. Mind the ledges.', won: 'The wind carried it. As it does.', lost: 'Even the wind has days like this.' },
  werewolf: { hired: 'Please do not mention the moon. It makes me jumpy.', placed: 'I am calm. I am calm. Is that squeaking a squirrel?', won: 'Good game. Please leave the bones.', lost: 'I got a bit... distracted. By a squirrel.' },
  minotaur: { hired: 'I am very good at corridors. Lead on.', placed: 'Left, right, left. Charge. Easy.', won: 'Straight through. I like a straight line.', lost: 'It was a maze. It is always a maze.' },
  satyr: { hired: 'A job and a party! You are my favourite already.', placed: 'Keep the tune going. The tune is important.', won: 'Another round on the house, I think!', lost: 'Right, so, nobody tell the others I tripped.' },
  gorgon: { hired: 'Do please look me in the eye. Go on. I insist.', placed: 'Hair is behaving today. For a given value of behaving.', won: 'They stood so still. Such good listeners.', lost: 'No one looked. Honestly. It is very rude.' },
  samuraiCommander: { hired: 'I bring a banner, a plan and a very firm handshake.', placed: 'Hold the banner high. It is not for show. It is a bit for show.', won: 'A fine day for the banner. Note it down.', lost: 'The plan failed. The banner is blameless.' },
  paladin: { hired: 'Light be with us. And snacks, if available.', placed: 'Let them come at me. I shall be very noble about it.', won: 'Justice, served. With no sauce.', lost: 'A test of faith. A rather long one.' },
  cleric: { hired: 'I do the mending. You do the getting hurt. Lovely.', placed: 'Everyone stay within shouting distance, please.', won: 'Nobody died. I shall allow a small hum.', lost: 'I shall pray. And then lie down.' },
  druid: { hired: 'The trees say you are acceptable. They said it rudely.', placed: 'This tile is lovely. Mind the acorns.', won: 'The forest approves. Mostly. It sulks, sometimes.', lost: 'A bad season. Spring will come. It has a duty.' },
  barbarian: { hired: 'Pay me in meat. And gold. Mostly meat.', placed: 'Where is the fighting? I can hear it, nearly.', won: 'More! Is there more? Oh. Well. A nap, then.', lost: 'Ow. Not that I mind. Ow.' },
  ranger: { hired: 'I set traps and I keep quiet. Mind where you stand.', placed: 'Do not step there. No. There. Oh, never mind.', won: 'They walked right into it. They always do.', lost: 'Someone sprang my trap. I shall find out who. It was me.' },
  warlock: { hired: 'We shall get on so well. Provided you read the contract.', placed: 'A little curse here, a little curse there.', won: 'The pact is... satisfied. For now.', lost: 'Terms were not met. I intend to complain upstairs.' },
  illusionist: { hired: 'I am delighted to be here. Which one, you ask?', placed: 'There are three of me. One is real. Mostly.', won: 'Applause is optional. I took it anyway.', lost: 'That was a trick, surely. It was not mine.' },
  gunslinger: { hired: 'Name your target. Mind the ringing in your ears.', placed: 'One shot. I like to make it count, and to say so.', won: 'Holster it. Fine work. Quite.', lost: 'Missed. I shall blame the wind. And the sun.' },
  shambler: { hired: 'Hrrngh. ...Pleased to meet you. Hrrngh.', placed: 'Hrrngh. Mind the arm. It does drop off.', won: 'Hrrngh. Good. Hrrngh. Brains optional.', lost: 'Hrrngh. I shall reattach and carry on.' },
  rifleBot: { hired: 'BEEP. Unit ready. Please do not feed it water.', placed: 'DEPLOYING. SCANNING FOR RUDE PEOPLE.', won: 'TARGETS: REDUCED. MORALE: ADEQUATE.', lost: 'ERROR. TOO MUCH HIT. REBOOTING.' },
  mercenary: { hired: 'I do not choose a side. I choose a fee.', placed: 'Where is the biggest one? Point me at it.', won: 'The bounty is mine. The invoice is in the post.', lost: 'I was not paid enough for that. Or at all.' },
  mummy: { hired: 'Four thousand years of experience. No references.', placed: 'Bandages tight. Dignity, mostly intact.', won: 'It was a good dig. I mean fight.', lost: 'I shall go and lie down in a very old box.' },
  buccaneer: { hired: 'A fine crew! A fine hat! Only the pay is lacking.', placed: 'Hook ready. Port side, if there is a port.', won: 'Plunder! Of a sort. Of a very small sort.', lost: 'Abandon ship! ...Wait, we are on land.' },
  wolfBard: { hired: 'I know a song about this. It is a long one.', placed: 'A little dirge to set the mood. Or the pace.', won: 'I shall make a ballad of it. A short one. Fine, long.', lost: 'This verse is about losing. Hum along.' },
  beastmaster: { hired: 'The wolves like you. I would take that as a compliment.', placed: 'Sit. Stay. Good boy. Not you, sir.', won: 'Good wolves. Biscuits all round.', lost: 'Not the wolves\' fault. It was the leash. Mine.' },
  kraken: { hired: 'Sea legs, tentacles and a very firm grip.', placed: 'Not a drop of water in sight. I shall improvise.', won: 'Down in one. Like a good pint.', lost: 'Dragged under. Which, to be fair, is my line.' },
  lancer: { hired: 'On a good horse I can charge a mountain. On foot, a hill.', placed: 'Clear the lane, please. I shall be quick.', won: 'A clean pass. The horse nods. The horse is not here.', lost: 'I bent the lance. And my pride. And a nearby fence.' },
  reaper: { hired: 'Do not worry. I am only here to help. Eventually.', placed: 'Hovering is a very good use of one\'s time.', won: 'I only collected what was due. Gently.', lost: 'Even I take a day off. This is it.' },
  timeWitch: { hired: 'I knew you would hire me. Last Tuesday.', placed: 'Take your time. I have all of it, and then some.', won: 'Right on time. Of course. I saw to it.', lost: 'I shall try that again. Back a minute. No, two.' },
  arcBlade: { hired: 'Blink and you will miss me. Please do blink.', placed: 'Charging. Charging. Charged. Hello.', won: 'Sparks everywhere. Mind the carpet.', lost: 'A short circuit. A short, humiliating circuit.' },
  dreadPirate: { hired: 'Men have crossed oceans to avoid me. You hired me. Brave.', placed: 'Broadsides to the left! ...What do you mean, no ship?', won: 'The seas are ours. Never mind the seas. The field.', lost: 'I have been dead before. It was dull. This is not.' },
  siegeBot: { hired: 'LOADING. LOADING. LOADED. LOADING AGAIN.', placed: 'SHELLS: PLENTIFUL. TACT: NOT INCLUDED.', won: 'RUBBLE ACHIEVED. SATISFACTION: HIGH.', lost: 'TOO MUCH WALL AFTER ALL. SORRY.' },
  priestess: { hired: 'May grace walk with you. And the occasional miracle.', placed: 'A little light for the room. Thank you for standing in it.', won: 'The light provides. I merely carry it. Gracefully.', lost: 'Grace is patient. I am working on it.' },
  dragoon: { hired: 'A queen of the sky, at your service. Mind the heels.', placed: 'High above, if you please. Fire on the left.', won: 'A queenly finish. Take notes.', lost: 'It was windy. Do not look at me like that.' },
  juggernaut: { hired: 'I am not fast. I am not subtle. I am here.', placed: 'Do mind your toes. I do not.', won: 'The ground will remember this. Eventually.', lost: 'Fell over. It takes a while. Please be patient.' },
  sage: { hired: 'I have read everything. Ask me anything. Not that.', placed: 'The stars suggest here. The stars are rarely wrong.', won: 'Predicted, naturally. By me, in a footnote.', lost: 'An error. A tiny one. Perhaps in the footnote.' },
  demonSwordsman: { hired: 'The blade is hungry. Do ignore the muttering.', placed: 'Quiet, you. We have guests.', won: 'Fed. For now. It has stopped sulking.', lost: 'The demon is sulking. So am I. Let us not discuss it.' },
  tyrant: { hired: 'Kneel. Or sit. Sitting is permitted. Today.', placed: 'This tile is hereby mine. Do not argue.', won: 'Justice has been done. Mine. Do applaud.', lost: 'I shall have someone sent to bed without supper. Possibly a goat.' },
};

/** Banter between two heroes sharing a trait: the first line is said by one, the second by the other. Keyed by trait id. */
export const BANTER: Record<string, readonly (readonly [string, string])[]> = {
  samurai: [['Honour first.', 'Lunch first. Then honour.']],
  mystic: [['Did you feel that? A disturbance in the weave.', 'That was lunch, I am afraid.']],
  yokai: [['Do you hear the old songs?', 'I hear mostly your stomach.']],
  knightly: [['Shield up, friend.', 'Shield up, friend. And do straighten your plume.']],
  guardian: [['I have your back.', 'Please move it. I need the space.']],
  blade: [['Mine is sharper.', 'Mine has a longer name.']],
  marksman: [['Three tiles left. Two up.', 'I know. I already shot it. Keep up.']],
  caster: [['Careful with that one.', 'I am always careful. The grass disagrees.']],
  holy: [['Blessings upon the line.', 'And upon the snacks.']],
  wild: [['Smell that? Rain, and trouble.', 'Rain, trouble, and your socks.']],
  arcane: [['The charm is subtle.', 'The charm is on fire.']],
  frontier: [['Quiet out here.', 'Too quiet. Say it. Go on.']],
  warden: [['I will keep watch.', 'You said that last time and fell asleep.']],
  trickster: [['Which of us is the real one?', 'Neither. We agreed. Do keep up.']],
  beast: [['Did you hear that growl?', 'That was me. I am hungry.']],
  undead: [['I feel rather... rested.', 'Do you? I am quite stiff. Years of it.']],
  machine: [['SYSTEM CHECK: OK.', 'SYSTEM CHECK: THAT WAS RUDE. BUT OK.']],
  royal: [['A crown is a heavy thing.', 'So is the hat. Hush.']],
  pirate: [['Where be the loot?', 'Where be the sea? That is my question.']],
  gunner: [['Reloading.', 'Do take your time. I shall wait. Loudly.']],
  assassin: [['I was here first.', 'No you were not. I was here quieter.']],
  support: [['Everyone well?', 'Better now you ask. Do carry on.']],
  vanguard: [['I will go first.', 'Of course you will. After me.']],
  arcanist: [['The theory is sound.', 'The theory is on fire.']],
  bulwark: [['I stand fast.', 'I stand fastest. Somewhat.']],
};

/** Duchess's own lines, said by her or about her. She has opinions, and she eats things she shouldn't. */
export const DUCHESS_LINES = {
  /** When she is tapped. */
  tap: ['Mehh.', 'Mehh.', 'Mehh!', 'Mehh. (Rude.)'],
  /** When she nibbles at a hero. */
  nibble: ['Nom.', 'Nom nom.', 'Mehh. (Tasty.)', 'Nom. Pardon me.'],
  /** When something big happens in a fight. */
  bigHit: ['Mehh!', 'MEHH!'],
  boss: ['Meh... meh... mehhh.', 'Mehh?!'],
  wipe: ['Mehh...', 'Meh. Sorry.'],
  /** Things she has eaten, for the loading tips and the camp. */
  ate: ['a map', 'a boot', 'the quartermaster\'s list', 'a spare bowstring', 'half a banner', 'a very important letter', 'a bar of soap (she regrets it)', 'the peace treaty'],
} as const;

/** Funny loading tips. Each keeps its meaning (they are tips), and adds a joke. */
export const LOADING_TIPS: readonly string[] = [
  'Tip: high ground hits harder. Duchess has been telling everyone, for years. Nobody listens to the goat.',
  'Tip: blows from behind hit hardest. Politeness is for the front.',
  'Tip: three of the same hero merge into a stronger one. Do not try this with goats.',
  'Tip: skills fire on their own when the gold bar fills. Heroes love a full bar. Duchess prefers a full trough.',
  'Tip: recycle heroes you do not need. They are told it is a promotion.',
  'Tip: the foes are always short-staffed. They will tell you, at length, when you meet them.',
  'Tip: Duchess ate the map. Navigation is now by instinct.',
  'Tip: spells run on the king\'s mana, not gold. The mana fills as the fight goes on. Duchess has asked to be paid in it.',
  'Tip: a fight lost is a lesson learned. A fight lost twice is a lesson, and a stern note.',
  'Tip: stars are earned by clearing armies. Duchess is still counting hers, and has eaten two.',
];

/** Lines for the other side of the screen: foes with staffing problems, a running joke. Said at the start of a fight, one a time, in the foes' own words. */
export const FOE_GRUMBLES: readonly string[] = [
  'Management says we are "fully staffed." There are four of us.',
  'The pay is dreadful. The hat is worse.',
  'I was told this was a holiday posting.',
  'Another one. No one asked us. Nobody ever asks us.',
  'I have not had a day off since the last war.',
  'There were three more of us last week. They quit.',
  'My contract says "a bit of light skulking."',
  'Can we not do this before lunch? There are, apparently, no lunches.',
  'I want to speak to whoever is in charge. Oh, it is him. Never mind.',
  'We are a warband. It says so on the door. The door is also gone.',
];

/** Dry lines for the recap, under the title. Chosen by how the run went, never hiding the facts under them. */
export const RECAP_WIN: readonly string[] = [
  'The foes are filing a complaint. It has been ignored.',
  'Duchess watched all of it. She is, for once, impressed.',
  'A fine day. The tavern has already heard three versions.',
  'The rest of the world has been told. Mostly by Duchess.',
];
export const RECAP_LOSS: readonly string[] = [
  'Duchess has seen worse. She has eaten worse.',
  'There is always another go. The foes are tired already, for one.',
  'A learning experience. Frankly, a bit of a long one.',
  'The heroes would like it noted that the foes cheated. They did not. It was noted anyway.',
];

/** The banner lines under a result: one dry line to go with the numbers. */
export const RESULT_WIN: readonly string[] = [
  'The foes will be missed. By their employers, mostly.',
  'Good work. Do wipe your boots.',
  'Cheers all round. Duchess had a nibble of the winning flag.',
  'Standing, mostly. That is how it is counted.',
];
export const RESULT_LOSS: readonly string[] = [
  'Everyone is in a heap, and no one is to blame. The heap blames itself.',
  'It is only a setback. A very large, embarrassing setback.',
  'Heroes fall. Goats, notably, do not.',
  'You may now say you meant to do that.',
];

/** A dry aside for each achievement, shown under its real name and text (so the meaning stays). */
export const AWARD_JOKES: Record<string, string> = {
  firstWin: 'Duchess ate the first bit of the flag.',
  flawless: 'Nobody fell over, not even on purpose.',
  perfect: 'The stars wish to be paid in apples.',
  stage10: 'Ten! The foes are short-staffed by now.',
  stage20: 'The foes have asked for a union meeting.',
  stage30: 'Thirty. The foes have started hiring temps.',
  yokaiOnly: 'No humans. Strictly a coincidence. A strict one.',
  threeStar: 'Three of a kind. It is not poker. It is a bit like poker.',
  relics5: 'Your pockets clink. Your heroes asked you to stop.',
  level10: 'Ten levels of wisdom, and still no tea.',
  level30: 'Thirty levels. The hat has grown with them.',
  level50: 'Fifty. The tavern has named a stool after them.',
  level100: 'A hundred levels. Duchess remains unimpressed.',
  allHeroes: 'The tavern is, frankly, full. The goat has a stool.',
  bosses: 'The bosses are not, strictly, allowed to be upset.',
  stars50: 'Stars, collected. Dusting, not included.',
  daily1000: 'Five dailies cleared. The foes have started setting an alarm for you.',
  daily: 'Same time tomorrow? The foes are free.',
  tower1: 'Up the stairs, round and round. Mind the goat.',
  tower20: 'Twenty floors. The lift is still not in.',
  recruiter: 'You have hired heroes. Duchess was not consulted.',
};
