// The quest battles of the first six long campaigns (QUESTS-3, `../questData/campaigns1.ts`): four finales that carry a rule of their own.
// - **The Tide at the Bell** (the Drowned Bell): hold the shore until the clock runs out (`survive`; no boss to fell).
// - **The Thirteenth Door** (the Thirteen Keys): bring the freed prisoner through (`protect`).
// - **The Cub in the Den** (Red Harvest): fell the pack and spare the white cub (`spare`).
// - **The Furnace Race** (the Iron Choir): fell the Titan before the furnace cools (`race`).
// Same shape as `../questBattleData.ts`. The cinematics use only narration and heroes (no giver's face). Pure data.

import { close, say, shoot, tell, wide } from '../sceneKit';
import type { QuestBattle } from '../questBattles';
import { card, foe, hero, story } from '../questBattleData';

export const CAMPAIGNS1_BATTLES: readonly QuestBattle[] = [
  {
    id: 'drownedBellTide',
    title: 'The Tide at the Bell',
    blurb: 'Kwame and Ravi hold the lake shore while the drowned crew climbs out on the spring tide.',
    land: 'swamp',
    like: { army: 'undead', wave: 12 },
    ease: 1.6,
    cast: [{ heroes: ['knight'] }, { heroes: ['wizard'] }],
    rules: { survive: 90 },
    waves: [
      { foes: ['skeleton', 'spearman', 'boneVolley', 'skeleton'] },
      { foes: ['spearman', 'boneVolley', 'skeleton', 'spearman', 'boneVolley'] },
      { foes: ['skeleton', 'spearman', 'skeleton', 'boneVolley', 'spearman', 'skeleton'] },
    ],
    before: () =>
      story('drownedBellTide', 'The Tide at the Bell', 'swamp', { kwame: hero('knight', 230), ravi: hero('wizard', 196), crew: foe('skeleton', 420, 1.3, { name: 'The Drowned Crew', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'The lake shore, at the turn of the tide', lines: [tell('Every lamp in the village is lit. The water is nearer than it was a minute ago.')] },
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'We need not win. We need only be here when it turns.')] },
        { cam: close('ravi'), ...shoot('close', 'ravi', 'still'), lines: [say('ravi', 'I can do ninety seconds of anything. Mostly of this.')] },
        { cam: wide(420, 205), ...shoot('low', 'crew', 'pushIn', 'smash'), acts: [{ who: 'crew', enter: 420, from: 'right' }], cue: 'boom', fx: ['shake'], lines: [tell('The bell rings thirteen, under the water, and the shore begins to move.')] },
      ]),
    after: () =>
      story('drownedBellTideAfter', 'The Tide at the Bell', 'swamp', { kwame: hero('knight', 260), ravi: hero('wizard', 226) }, [
        { cam: close('ravi'), ...shoot('close', 'ravi', 'pushIn'), lines: [say('ravi', 'It has turned. I feel I should clap.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), hold: 1.4, lines: [tell('The water goes out, and takes the bell with it, ringing once, very softly.')] },
      ]),
  },
  {
    id: 'thirteenthDoor',
    title: 'The Thirteenth Door',
    blurb: 'Kwame leads the gaoler\'s last prisoner up the stair, with the warden of the maze at their heels.',
    land: 'dungeon',
    like: { army: 'labyrinth', wave: 12 },
    ease: 0.4,
    cast: [{ heroes: ['knight'] }],
    rules: { protect: { kind: 'guestPrisoner', hp: 1.2 } },
    waves: [
      { foes: ['mazeMino1', 'mazeGorgon1', 'mazeMino2'] },
      { foes: ['mazeGorgon2', 'mazeMino3', 'mazeMino1', 'mazeGorgon3'] },
      { foes: ['minotaurChampion', 'mazeMino2', 'mazeGorgon2', 'mazeMino3'], boss: 'final' },
    ],
    boss: { name: 'The Last Warden', title: 'Keeper of the Thirteenth Door' },
    before: () =>
      story('thirteenthDoor', 'The Thirteenth Door', 'dungeon', { kwame: hero('knight', 230), warden: foe('minotaurChampion', 430, 1.3, { name: 'The Last Warden', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'darken'], caption: 'The lowest cell', lines: [tell('Thirteen keys, thirteen turns, and the last door swings out on a stranger in the dark.')] },
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'Stay behind my shield. Whatever comes up that stair, comes through me.')] },
        { cam: wide(430, 205), ...shoot('low', 'warden', 'pushIn', 'smash'), acts: [{ who: 'warden', enter: 430, from: 'right' }], cue: 'earthRumble', fx: ['rumble'], title: card('The Last Warden', 'Keeper of the Thirteenth Door'), lines: [tell('Something with horns has been sat on that stair for a very long time.')] },
        { cam: close('kwame'), ...shoot('extreme', 'kwame', 'still'), lines: [say('kwame', 'Then it has had a long rest.', 'whisper')] },
      ]),
    after: () =>
      story('thirteenthDoorAfter', 'The Thirteenth Door', 'dungeon', { kwame: hero('knight', 260) }, [
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'Daylight at the top of the stair. Mind the step.')] },
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pullOut', 'dissolve'), hold: 1.3, lines: [tell('The prisoner blinks at the sun, and does not look back.')] },
      ]),
  },
  {
    id: 'harvestCubDen',
    title: 'The Cub in the Den',
    blurb: 'Natsu finds the pack\'s den, a white cub at its heart, and must fell the wolves round it without harming the child.',
    land: 'autumn',
    like: { army: 'beasts', wave: 13 },
    ease: 0.4,
    cast: [{ heroes: ['archer'] }],
    rules: { spare: 'packWhite' },
    waves: [
      { foes: ['packBlack', 'packRed', 'packBlack'] },
      { foes: ['packRed', 'packBlack', 'packRed', 'packBlack'] },
      { foes: ['alphaWolf', 'packWhite', 'packBlack', 'packRed'], boss: 'final' },
    ],
    boss: { name: 'The Den Mother', title: 'Who Guards the Last Cub' },
    before: () =>
      story('harvestCubDen', 'The Cub in the Den', 'autumn', { natsu: hero('archer', 230), mother: foe('alphaWolf', 420, 1.3, { name: 'The Den Mother', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), rays: true, caption: 'Behind the ridge', lines: [tell('Red leaves, a hollow in the hill, and something small and white asleep in the middle of it.')] },
        { cam: close('natsu'), ...shoot('close', 'natsu', 'pushIn'), lines: [say('natsu', 'The cub is not the quarry. Every arrow goes round it.')] },
        { cam: wide(420, 205), ...shoot('low', 'mother', 'pushIn', 'smash'), acts: [{ who: 'mother', enter: 420, from: 'right' }], cue: 'earthRumble', fx: ['shake'], title: card('The Den Mother', 'Who Guards the Last Cub'), hold: 1.2 },
        { cam: close('natsu'), ...shoot('extreme', 'natsu', 'still'), lines: [say('natsu', 'I know. I know. I will be careful.', 'whisper')] },
      ]),
    after: () =>
      story('harvestCubDenAfter', 'The Cub in the Den', 'autumn', { natsu: hero('archer', 260) }, [
        { cam: close('natsu'), ...shoot('close', 'natsu', 'pushIn'), lines: [say('natsu', 'Up you come. Nobody here means you harm.')] },
        { cam: wide(330, 200), ...shoot('wide', undefined, 'pullOut', 'dissolve'), rays: true, hold: 1.2, lines: [tell('The cub yawns, shows every tooth it has, and goes back to sleep in her arms.')] },
      ]),
  },
  {
    id: 'ironFurnaceRace',
    title: 'The Furnace Race',
    blurb: 'Kwame and Ravi have until the furnace cools to fell the Forge Titan and its choir.',
    land: 'forge',
    like: { army: 'golems', wave: 10 },
    ease: 0.9,
    cast: [{ heroes: ['knight'] }, { heroes: ['wizard'] }],
    rules: { race: 210 },
    waves: [
      { foes: ['stoneGolem', 'ironGolem', 'crystalGolem'] },
      { foes: ['magmaGolem', 'ironGolem', 'stoneGolem', 'crystalGolem'] },
      { foes: ['forgeTitan', 'ironGolem', 'magmaGolem', 'crystalGolem'], boss: 'final' },
    ],
    boss: { name: 'The Titan of the Choir', title: 'Keeper of the Last Furnace' },
    before: () =>
      story('ironFurnaceRace', 'The Furnace Race', 'forge', { kwame: hero('knight', 230), ravi: hero('wizard', 196), titan: foe('forgeTitan', 430, 1.3, { name: 'The Titan of the Choir', hidden: true }) }, [
        { cam: wide(300, 205), ...shoot('wide', undefined, 'pan'), fx: ['fadeIn', 'rumble'], caption: 'The last furnace', lines: [tell('The glow in the great hearth is shrinking. When it dies, the iron sets, and the choir with it.')] },
        { cam: close('ravi'), ...shoot('close', 'ravi', 'pushIn'), lines: [say('ravi', 'So, fast. I can do fast. I have never once been accused of patience.')] },
        { cam: wide(430, 205), ...shoot('low', 'titan', 'pushIn', 'smash'), acts: [{ who: 'titan', enter: 430, from: 'right' }], cue: 'boom', fx: ['shake'], title: card('The Titan of the Choir', 'Keeper of the Last Furnace'), lines: [tell('It sings one long, low note, and the floor sings it back.')] },
        { cam: close('kwame'), ...shoot('close', 'kwame', 'still'), lines: [say('kwame', 'Then we are on the clock. Shield up.')] },
      ]),
    after: () =>
      story('ironFurnaceRaceAfter', 'The Furnace Race', 'forge', { kwame: hero('knight', 260), ravi: hero('wizard', 226) }, [
        { cam: close('kwame'), ...shoot('close', 'kwame', 'pushIn'), lines: [say('kwame', 'The glow is steady. It is going out gently, not all at once.')] },
        { cam: wide(300, 205), ...shoot('high', undefined, 'pullOut', 'dissolve'), hold: 1.4, lines: [tell('One note hangs in the dark above the anvil, then the hall is quiet.')] },
      ]),
  },
];
