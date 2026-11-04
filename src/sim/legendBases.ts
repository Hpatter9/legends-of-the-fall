// The named legends (SEVEN-SLOT GEAR batch 2, docs/notes/gear-runes-design.md section 3): 21 fixed pieces, three a slot, each with its
// own name, story and power. A legend is always Legendary, never rolled, bought, combined or sold, and a save holds one copy of each
// (`legends.ts` says where each is found and how its renown grows). Its main stats scale like any new base's; `flat` is added as it is;
// its power is run by `setPowers.ts`. The words are drafts the owner approved; any can be renamed. Pure data: no Pixi, no DOM.

import type { EquipBase, EquipSlot, Main } from './equipBases';

export interface LegendDef {
  /** The power's id (`setPowers.ts`) and its name. */
  power: string;
  powerName: string;
  /** What the power does, at strength 1 (the numbers scale with renown). */
  text: string;
  /** Stats added as they are, not scaled by grade or level. */
  flat?: Main;
  /** The story: the first verse, then those that open at 25, 100 and 300 waves of renown. */
  verses: readonly [string, string, string, string];
  /** Where it is found, in words. */
  source: string;
}

type Legend = EquipBase & { legend: LegendDef };
const L = (id: string, name: string, slot: EquipSlot, main: Main, legend: LegendDef): Legend => ({
  id,
  name,
  mythic: name,
  slot,
  icon: id,
  main,
  // (a legend's power is its signature: the ability field only names it, and it never fires as an ability)
  ability: { id: `legend_${id}`, name: legend.powerName, trig: 'start', kind: 'revive' },
  legend,
});

export const LEGEND_LIST: readonly Legend[] = [
  // ---- the head ----
  L('crownLastKing', 'Crown of the Last King', 'head', { hp: 0.06, def: 0.5 }, {
    power: 'lastKing', powerName: 'The King Stands', text: 'Allies within 2 tiles take 6% less from blows; when the wearer falls, every ally is rallied (+25% attack) for 6s',
    verses: ['Worn by the keep’s last king the night the walls held. It has never been cleaned.', 'The dents are in the shape of the blows he did not step back from.', 'Some nights the crown is warm, as if a head had only just left it.', 'They say the walls will hold as long as somebody wears it. Nobody has tested that.'],
    source: 'The Golem Forge’s first Mythic clear',
  }),
  L('maskLaughingFox', 'Mask of the Laughing Fox', 'head', { crit: 0.05, dodge: 0.03 }, {
    power: 'laughingFox', powerName: 'Fox’s Jest', text: 'At the start the wearer and the nearest ally are unseen for 3s; a blow from unseen deals 50% more',
    verses: ['A trickster’s mask that laughs on its own when a lie is told near it.', 'It laughs less around children, and never at the dying.', 'Once it laughed at a king for an hour. He abdicated.', 'The fox who wore it first is still looking for it. It is in no hurry.'],
    source: 'The quest “The Oni King’s Mask”',
  }),
  L('helmSevenWinters', 'Helm of Seven Winters', 'head', { hp: 0.06, resist: 0.08 }, {
    power: 'sevenWinters', powerName: 'Seven Winters', text: 'The wearer cannot be slowed or frozen; foes that strike it are chilled for 1.5s',
    verses: ['Forged in a winter that lasted seven years. The steel is still cold.', 'Frost forms on it in high summer, and the smith who made it never smiled again.', 'Each winter is a ring in the steel. There is room for an eighth.', 'When the eighth winter comes, the helm will know first.'],
    source: 'The spire’s act 7 guardian',
  }),
  // ---- the torso ----
  L('ferrymansCoat', 'The Ferryman’s Coat', 'torso', { hp: 0.1, dodge: 0.03 }, {
    power: 'ferryman', powerName: 'Not Today', text: 'Once a fight the wearer refuses death and stands at 30% hp, unseen for 2s',
    verses: ['The ferryman took coins from the dead. This is what he wore while he waited.', 'The pockets are full of coins nobody came back for.', 'The hem is wet, always, with water from no river in this world.', 'He will want it back one day. He can wait. He is good at waiting.'],
    source: 'The Calamity’s third map boss',
  }),
  L('wyrmhideVaelkhar', 'Wyrmhide of Vaelkhar', 'torso', { hp: 0.12, def: 0.8 }, {
    power: 'wyrmhide', powerName: 'Wyrm’s Warmth', text: 'Burning heals the wearer instead of hurting it', flat: { def: 1.5 },
    verses: ['Cut from the great wyrm’s own scales after its fall. It is warm to the touch.', 'The scales still turn towards fire, as a flower turns to the sun.', 'In the cold it breathes, very slowly. Nobody likes to mention it.', 'Vaelkhar is gone. Something of him is not.'],
    source: 'Vaelkhar’s heart, the first time it is held',
  }),
  L('aegisOdile', 'Aegis of Saint Odile', 'torso', { hp: 0.1, def: 0.9 }, {
    power: 'aegisOdile', powerName: 'Saint’s Burden', text: 'The wearer takes a third of every blow aimed at the weakest ally',
    verses: ['A nun held a bridge alone in this mail for a day and a night.', 'The rings she lost that night were never replaced. The gaps are holy now.', 'Pilgrims touch it for luck. It does not bring luck. It brings company.', 'The bridge fell long ago. She did not.'],
    source: 'A Mythic clear of the Undead Legion',
  }),
  // ---- the right hand ----
  L('lastLight', 'Last Light', 'main', { atk: 0.1, crit: 0.03 }, {
    power: 'lastLight', powerName: 'Ember Kept', text: 'Each kill makes the wearer’s skill ready at once',
    verses: ['A lantern-blade carried out of the first keep as it burned. It has never gone out.', 'It burns brighter near the dark, and dimmer near the proud.', 'Rain hisses on it and gives up.', 'When the last keep burns, this will be the light they carry out.'],
    source: 'The Infernal Host’s first Legendary clear',
  }),
  L('gravesong', 'Gravesong', 'main', { atk: 0.11, hp: 0.03 }, {
    power: 'gravesong', powerName: 'Gravesong', text: 'Kills heal 6% hp and add +2% attack for the fight (to 10 stacks)',
    verses: ['A scythe that hums the names of everyone it has cut. It is a long song.', 'Sometimes it hums a name you have not killed yet.', 'The song has a chorus now. The chorus is getting louder.', 'One day it will sing its wielder’s name, and finish.'],
    source: 'The Last Stand, wave 40',
  }),
  L('widowsBow', 'The Widow’s Bow', 'main', { atk: 0.09, range: 1, crit: 0.03 }, {
    power: 'widowsBow', powerName: 'Never Misses Him', text: 'The first blow each fight on the strongest foe deals 50% more',
    verses: ['Strung with her husband’s hair after the wars took him. It never misses his killers.', 'She is old now, and draws it only on his day.', 'The string has not grown grey.', 'It is still looking for the last of them.'],
    source: 'A 30-day streak of daily clears',
  }),
  // ---- the left hand ----
  L('shieldHundredNames', 'Shield of a Hundred Names', 'off', { def: 1, hp: 0.05 }, {
    power: 'hundredNames', powerName: 'A Hundred Names', text: 'Every 4th blow taken is turned aside, and each one turned gives a shield of 5% of max hp',
    verses: ['Every soldier who carried it carved a name. There is room for one more.', 'The oldest names are worn smooth by the hands of the newest.', 'Read aloud, the names take an hour. Nobody has skipped one.', 'The last name is not carved yet. Whoever carries it now knows whose it will be.'],
    source: 'The Ogres’ first Hard clear',
  }),
  L('unwrittenBook', 'The Unwritten Book', 'off', { charge: 0.1, resist: 0.04 }, {
    power: 'unwrittenBook', powerName: 'Unwritten', text: 'Every skill the wearer casts fills 10% of its ultimate',
    verses: ['Its pages are blank until a hero reads them in battle.', 'What it writes cannot be read twice. It writes the next page instead.', 'Somewhere in the middle it has begun to write about you.', 'The last page is already full. Nobody has turned to it.'],
    source: 'The quest “Words of Unmaking, III: The Unwritten Library”',
  }),
  L('bellOfEnding', 'Bell of Ending', 'off', { resist: 0.06, hp: 0.04 }, {
    power: 'bellOfEnding', powerName: 'The Last Bell', text: 'Once a fight, when every foe left is under 30% hp, each is stunned for 2s',
    verses: ['Rung once at the end of every war. Nobody wants to be the one to ring it.', 'It has a crack. It was rung once too early.', 'The clapper is wrapped in cloth, so that it rings only when it means it.', 'There will be one more ringing. Then the bell can rest.'],
    source: 'The Yokai Night Parade’s first Mythic clear',
  }),
  // ---- the feet ----
  L('sevenLeagueBoots', 'Seven-League Boots', 'feet', { moveSpeed: 0.08, jump: 1 }, {
    power: 'sevenLeague', powerName: 'Seven Leagues', text: 'At the start the wearer leaps up to 4 tiles towards the nearest foe', flat: { moveSpeed: 0.2 },
    verses: ['The cobbler made them for a giant and forgot to tell the boots.', 'Walk carefully in them. One wrong step and you are in another county.', 'The soles have never worn through. The roads have.', 'Somewhere a giant is barefoot, and still looking.'],
    source: 'The spire’s act 4 guardian',
  }),
  L('ashwalkerSabatons', 'Ashwalker Sabatons', 'feet', { def: 0.6, resist: 0.06 }, {
    power: 'ashwalker', powerName: 'Ashwalker', text: 'The wearer cannot be set burning, and the foes beside it catch fire',
    verses: ['Worn across the burning plain and back. The soles are still smoking.', 'Every step leaves a footprint of ash that takes a week to cool.', 'They were made for a march, not for a walk. They do not walk.', 'The plain is still burning. The boots remember the way.'],
    source: 'The Calamity, cleared whole with an ascension',
  }),
  L('moonSlippers', 'Slippers of the Moon Court', 'feet', { dodge: 0.05, moveSpeed: 0.04 }, {
    power: 'moonSlippers', powerName: 'Moon Dance', text: 'A dodged blow gives 6 skill charge', flat: { dodge: 0.08 },
    verses: ['Dance slippers from a court that only meets at full moon.', 'They are never dusty. They are never quite still.', 'Hester swears she did not steal them. Hester is lying.', 'The court still meets. There is an empty place in the dance.'],
    source: 'Hester’s standing 3 (she finds them, once)',
  }),
  // ---- the belt ----
  L('girdleGiantKing', 'Girdle of the Giant-King', 'belt', { hp: 0.08, atk: 0.03 }, {
    power: 'giantKing', powerName: 'Unmoved', text: 'The wearer cannot be stunned', flat: { hp: 0.12 },
    verses: ['A belt from a king who wrestled mountains. It has to be taken in a long way.', 'The buckle is a mountain he won. The mountain was not consulted.', 'It has never been unbuckled in battle. It has never needed to be.', 'The mountains still remember him. They do not miss him.'],
    source: 'The Beast Packs’ first Legendary clear',
  }),
  L('rookBandolier', 'Captain Rook’s Bandolier', 'belt', { atkSpeed: 0.05, atk: 0.03 }, {
    power: 'rookBandolier', powerName: 'Six Debts', text: 'Every 6th blow fires a free shot at the furthest foe for 80% of attack',
    verses: ['A pirate’s bandolier with six pockets and six debts.', 'Two of the debts are paid. The other four have interest.', 'One pocket holds a letter that has never been opened.', 'Rook is long dead. The debts are not.'],
    source: 'The tale “A Sellsword in Chains, III: The Tide in the Moat”',
  }),
  L('pilgrimsCord', 'The Pilgrim’s Cord', 'belt', { hp: 0.06, regen: 0.004 }, {
    power: 'pilgrimsCord', powerName: 'Every Shrine', text: 'Remedies heal 50% more on the wearer', flat: { regen: 0.005 },
    verses: ['Knotted once for every shrine a pilgrim walked to.', 'Each knot is tied differently. None of them have come loose.', 'The pilgrim never said what she prayed for. The cord does not say either.', 'There is one knot left untied, for the shrine at the end of the road.'],
    source: 'The first hero to fight 100 waves',
  }),
  // ---- the accessory ----
  L('ringReturning', 'Ring of Returning', 'acc', { hp: 0.05, regen: 0.002 }, {
    power: 'ringReturning', powerName: 'Always Home', text: 'A fallen wearer comes back after a won wave at full health, not half',
    verses: ['Whoever wears it always comes home. Nobody knows who made it.', 'It has been lost eleven times. It has been found eleven times.', 'Once it came home without its wearer. It did not like that.', 'It will bring you home. It does not promise when.'],
    source: 'The Wildwood’s first Mythic clear',
  }),
  L('timeHourglass', 'Time Witch’s Hourglass', 'acc', { charge: 0.08, atkSpeed: 0.03 }, {
    power: 'hourglass', powerName: 'Upward Sand', text: 'Once a fight, below half hp, the wearer’s skill is ready again at once',
    verses: ['It runs upwards. Do not ask her about it.', 'Turn it over and it still runs upwards. That is the worrying part.', 'The sand is from a beach that has not formed yet.', 'When it runs out, she says, everything starts again. She will not say what “everything” means.'],
    source: 'The tale “Yesterday’s Visitor, II: The Hour Out of Place”',
  }),
  L('gorgonEye', 'Eye of the Gorgon', 'acc', { def: 0.4, resist: 0.05 }, {
    power: 'gorgonEye', powerName: 'Stone Gaze', text: 'A foe striking the wearer in melee is turned to stone for 1s, a quarter of the time',
    verses: ['Still looking. Keep it in the box.', 'The box has a hinge of stone. It was not made that way.', 'It blinks, sometimes. Nobody has seen it blink.', 'It is looking for its other eye. Do not help it.'],
    source: 'The Labyrinth’s first Mythic clear',
  }),
];
