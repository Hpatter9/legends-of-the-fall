// Ancient rumours surface only after endgame deeds. Their names/rewards never
// identify the recruit. Taken parts and successful trials use existing quest saves.
import type { Goal, GiverId, Need, QuestDef } from './questData';
import type { QuestBattle } from './questBattles';
import type { Area } from './board';
import { MYTHIC_KINDS } from './mythicRules';
import { shoot, tell, wide, type Scene } from './sceneKit';

interface Legend {
  kind: string; giver: GiverId; title: string; land: Area;
  needs: Need; clues: [string, string]; text: [string, string]; goals: [Goal, Goal];
  foes: string[]; boss: string; titleBoss: string; rules?: QuestBattle['rules'];
}
const proven = (army: string): Need => ({ kind: 'all', of: [{ kind: 'armies', n: 7 }, { kind: 'army', army }, { kind: 'tier', tier: 3 }, { kind: 'level', n: 75 }] });
const legends: Legend[] = [
  { kind: 'vael', giver: 'herald', title: 'A Shadow Facing Dawn', land: 'ruins', needs: proven('infernal'),
    clues: ['Three crowns carved into fallen stones. Their shadows point towards a throne that is absent from every map.', 'The pieces fit, but the crown will not shine. Its inscription says: bring victory, leave the spoils.'],
    text: ['Win 12 Infernal Host waves on Legendary or harder without a Mythic', 'Defeat 3 Legendary or harder army bosses without a king’s spell or a Mythic'],
    goals: [{ kind: 'wavesWon', n: 12, army: 'infernal', tier: 3, without: MYTHIC_KINDS }, { kind: 'bossDown', n: 3, mode: 'army', tier: 3, noSpells: true, without: MYTHIC_KINDS }],
    foes: ['hellDemon', 'hellImp', 'hellDemon', 'magmaGolem'], boss: 'The Crown Without Dawn', titleBoss: 'Who Commands the Black Sun' },
  { kind: 'astrax', giver: 'archivist', title: 'The Star That Fell Upwards', land: 'crystal',
    needs: { kind: 'all', of: [{ kind: 'armies', n: 7 }, { kind: 'ascension', n: 2 }, { kind: 'level', n: 75 }] },
    clues: ['Three crater sketches have the same constellation. Each shows one star that no longer exists.', 'The fragments form an observatory lens. Through it, an island hangs where that missing light should be.'],
    text: ['Defeat 6 Calamity guardians on map four or later without a Mythic', 'Clear 2 Calamities without spending a heart or using a Mythic'],
    goals: [{ kind: 'calGuardian', n: 6, map: 4, without: MYTHIC_KINDS }, { kind: 'calClear', n: 2, noHeart: true, without: MYTHIC_KINDS }],
    foes: ['crystalGolem', 'hellDemon', 'yokaiSeer', 'magmaGolem'], boss: 'The Heart of the Fallen Sky', titleBoss: 'The Last Light', rules: { noHearts: true } },
  { kind: 'ilyra', giver: 'sexton', title: 'The Funeral Nobody Finished', land: 'graveyard', needs: proven('undead'),
    clues: ['Every memorial names the fallen. Five have a blank line, and a white flower that never wilts.', 'The blank lines belong to people who returned. Their unfinished rite asks you to bring everyone home.'],
    text: ['Win 15 Undead Legion waves on Elite or harder with no hero falling and no Mythic', 'Win 5 Elite or harder army boss waves with no hero falling and no Mythic'],
    goals: [{ kind: 'wavesWon', n: 15, army: 'undead', tier: 2, flawless: true, without: MYTHIC_KINDS }, { kind: 'bossDown', n: 5, mode: 'army', tier: 2, flawless: true, without: MYTHIC_KINDS }],
    foes: ['boneCaptain', 'skeleton', 'boneVolley', 'spearman'], boss: 'The Unfinished Farewell', titleBoss: 'Whom Death Could Not Keep', rules: { protect: { kind: 'guestPilgrim', hp: 30 }, noHearts: true } },
  { kind: 'orrun', giver: 'shepherd', title: 'Roots Beneath the Stone', land: 'forest', needs: proven('wildwood'),
    clues: ['Roots have broken through a shrine floor. They grow towards five weathered stones, all far from any living tree.', 'Each restored stone answers with a heartbeat. Something beneath the forest is waiting for the last one.'],
    text: ['Win 15 Wildwood waves on Elite or harder without a Mythic', 'Defeat 5 Elite or harder army bosses with no hero falling and no Mythic'],
    goals: [{ kind: 'wavesWon', n: 15, army: 'wildwood', tier: 2, without: MYTHIC_KINDS }, { kind: 'bossDown', n: 5, mode: 'army', tier: 2, flawless: true, without: MYTHIC_KINDS }],
    foes: ['skeleton', 'packRed', 'hellImp', 'packWhite'], boss: 'The Heart Beneath the Roots', titleBoss: 'Older Than the First Forest', rules: { noHearts: true } },
  { kind: 'nyxara', giver: 'clock', title: 'The Room Behind Tomorrow', land: 'temple',
    needs: { kind: 'all', of: [{ kind: 'ascension', n: 3 }, { kind: 'bestiary', share: 0.75 }, { kind: 'level', n: 80 }] },
    clues: ['A cracked mirror shows the same room in three different ruins. In each reflection, the clock has one more hand.', 'The reflections line up. Behind the glass, five silhouettes move a moment before you do.'],
    text: ['Defeat 8 Calamity guardians on map five or later without a Mythic', 'Win 6 Legendary or harder army boss waves without ultimates or a Mythic'],
    goals: [{ kind: 'calGuardian', n: 8, map: 5, without: MYTHIC_KINDS }, { kind: 'bossDown', n: 6, mode: 'army', tier: 3, noUlts: true, without: MYTHIC_KINDS }],
    foes: ['yokaiSeer', 'mazeGorgon2', 'hellDemon', 'yokaiWitch'], boss: 'The Unwritten Queen', titleBoss: 'Keeper of the Other Ending', rules: { noHearts: true } },
];
export const MYTHIC_QUESTS: readonly QuestDef[] = legends.flatMap(l => {
  const part = (i: 0 | 1): QuestDef => ({
    id: `mythic-${l.kind}-${i ? 'rite' : 'trace'}`, title: `${l.title}, ${i ? 'II: The Rite' : 'I: A Trace'}`,
    giver: l.giver, needs: l.needs, ...(i ? { after: `mythic-${l.kind}-trace` } : {}),
    text: l.text[i], offer: [l.clues[i]], going: l.clues[i], done: [i ? 'The last sign answers. A path opens where there was only stone.' : 'The traces agree. There is more to this than an old tale.'],
    goal: l.goals[i], reward: { crowns: 1200, stones: 5 }, mood: 'eerie', length: 'chain', stars: 5,
  });
  return [part(0), part(1), {
    id: `mythic-${l.kind}-trial`, title: `${l.title}, III: Beyond the Veil`, giver: l.giver, needs: l.needs,
    after: `mythic-${l.kind}-rite`, text: `Win the hidden trial ${l.title} without a Mythic`,
    offer: ['The path is open. A legend waits beyond it. Bring your own strength: no Mythic may cross this threshold.'],
    going: 'The trial remains open. A failed attempt takes nothing from you.',
    done: ['The ancient presence bows its head. Your company will never be the same.'],
    goal: { kind: 'battle', n: 1, battle: `mythic-${l.kind}` },
    reward: { hero: { kind: l.kind, tease: 'an ancient legend joins your company', instead: { crowns: 3000, stones: 10 } } },
    mood: 'eerie', length: 'chain', stars: 5,
  } satisfies QuestDef];
});
function scene(l: Legend, after: boolean): Scene {
  return {
    id: `mythic-${l.kind}${after ? '-after' : '-before'}`, title: l.title, blurb: l.clues[0],
    moment: { kind: 'questBattle', battle: `mythic-${l.kind}` }, music: 'solemn', out: 'fade',
    cast: { presence: { role: `unit:${l.kind}`, x: 350, facing: 'left', shade: !after, name: after ? l.boss : 'An ancient presence' } },
    shots: [{ look: l.land, cam: wide(320, 205), ...shoot('wide', undefined, 'pushIn'), fx: ['fadeIn'], hold: 2, lines: [tell(after ? 'The trial is over. A power thought lost to the world chooses to walk beside you.' : l.clues[1])] }],
  };
}
export const MYTHIC_BATTLES: readonly QuestBattle[] = legends.map(l => ({
  id: `mythic-${l.kind}`, title: l.title, blurb: 'An ancient trial beyond the veil. No Mythic may fight here.',
  land: l.land, like: { army: 'infernal', wave: 15 }, ease: 1, bossLift: { hp: 1.15, atk: 1.05 },
  cast: [], noMythics: true, rules: l.rules ?? { noHearts: true },
  waves: [
    { foes: l.foes.slice(0, 3) },
    { foes: [...l.foes] },
    { foes: [...l.foes, l.foes[0]] },
    { foes: [`trial_${l.kind}`, ...l.foes.slice(0, 3)], boss: 'final' },
  ],
  boss: { name: l.boss, title: l.titleBoss }, before: () => scene(l, false), after: () => scene(l, true),
}));
