// FOE-STYLES (`docs/notes/foe-styles.md`): every foe fights its own way. The common foes (the field bands', the Orc Warband's and the Undead
// Legion's) have no skill, only a passive and a way of moving (`Passive.move`, `foeStyles.ts`); the armies' own kinds from the Beast Packs
// on, and the elites (`eliteFoes.ts`), have a skill on top, each borrowed from a hero or a boss under a name of its own (its key kept, so its
// look, sound and rider are the borrowed one's). No two foes share a kit (`test/foe-styles.test.ts`). The bosses keep their own kits
// (`abilities.ts`) and signatures (`bossAttacks.ts`).
//
// The table `KITS` is passed in (this file cannot import it): the armies take their copies before the monster heroes' skills are reworked.

import { CHARGE_MAX, keyOf, NO_SKILL, type Dot, type Kit, type Passive, type Skill } from './abilities';
import { pounce } from './kits/monsters';

// (the riders grow with the foe's attack: a share of it every half second; a bleed and a burn are refreshed by the next blow, poison stacks)
const BLEED = { dot: 'bleed', share: 0.04, ms: 2000 } as const;
const BURN = { dot: 'burn', share: 0.04, ms: 2000 } as const;
const POISON = { dot: 'poison', share: 0.02, ms: 2500 } as const;
const BRUTAL: Dot = { kind: 'bleed', dmg: 4, every: 500, ms: 3000 };

/** A common foe: no skill, a passive and a way of moving. */
const plain = (passive: Passive): Kit => ({ skill: NO_SKILL, passive });
/** A skill borrowed under a name of its own; its key (look, sound, rider) is the borrowed one's. */
const as = (s: Skill, name: string, text: string, more: Partial<Skill> = {}): Skill => ({ ...s, key: keyOf(s), name, text, need: CHARGE_MAX, ...more });

/** The common foes' and the armies' kinds' kits (the bosses' are in `abilities.ts`). */
export function foeKits(k: Record<string, Kit>): Record<string, Kit> {
  return {
    // ---- the Orc Warband (and the orc band) ----
    orcGrunt: plain({ name: 'Warband', text: 'Takes 6% less from each friend beside it (up to three): grunts fight shoulder to shoulder', huddle: 0.06 }),
    orcArcher: plain({ name: 'Fire Arrows', text: 'Its arrows set the hero alight, and it backs off from a blade to keep shooting', rider: BURN, move: 'kite' }),
    orcBrute: plain({ name: 'Bull Rush', text: 'Three steps in a row end in a blow half as hard again', move: 'charge' }),

    // ---- the Undead Legion (and the skeleton band) ----
    skeleton: plain({ name: 'Bone Shield', text: 'Blows from the front lose an eighth; it keeps by the archers and strikes whoever strikes them', block: 0.12, move: 'guard' }),
    spearman: plain({ name: 'Long Spear', text: 'Its spear point finds the gaps in armour (it ignores 2 defence), and it steps back from a blade to keep its reach', pierce: 2, move: 'kite' }),
    boneArcher: plain({ name: 'Hollow Draw', text: 'Arrows deal a fifth more to heroes 4 or more tiles away, and it backs off from a blade', far: 0.2, move: 'kite' }),
    boneVolley: { skill: k.archer.skill, passive: { name: 'Dead Aim', text: 'Arrows ignore 2 defence', pierce: 2 } },

    // ---- the Beast Packs (and the werewolf band) ----
    wolfBlack: plain({ name: 'Pack Hunter', text: 'Bites a tenth harder for each packmate beside its prey (up to three), and goes round to a hero\'s side', gang: 0.1, move: 'flank' }),
    wolfRed: plain({ name: 'Rending Bite', text: 'Its bites make the hero bleed, and it makes for the shooters first', rider: BLEED, move: 'hunt' }),
    wolfWhite: plain({ name: 'Ghost Pelt', text: 'Slips 15% of blows, and goes round to a hero\'s side', dodge: 0.15, move: 'flank' }),
    packBlack: { skill: k.werewolf.skill, passive: { ...k.werewolf.passive, text: `${k.werewolf.passive.text}; it goes round to a hero's side`, move: 'flank' } },
    packRed: {
      skill: as(k.wolfBard.skill, 'Blood Howl', 'A howl that hurts every hero within 4 tiles a little, slows them for 4s and weakens them'),
      passive: { name: 'Blood Scent', text: 'Bites a tenth harder for each packmate beside its prey (up to three), and makes for the shooters first', gang: 0.1, move: 'hunt' },
    },
    packWhite: {
      skill: as(k.werewolf.skill, 'Moon Pounce', 'Leaps up to 4 tiles onto the weakest hero and bites it for double, healing half of what it deals', { cast: pounce(k.werewolf.skill.cast) }),
      passive: { name: 'Ghost Pelt', text: 'Slips 15% of blows, and goes round to a hero\'s side', dodge: 0.15, move: 'flank' },
    },

    // ---- the Wildwood (and the satyr band) ----
    satyr1: plain({ name: 'Sure Hooves', text: 'Climbs ledges at no extra cost, and goes round to a hero\'s side', sure: true, move: 'flank' }),
    satyr2: plain({ name: 'Wild Revel', text: 'Friends within 2 tiles (and it) heal 1% of their health each second; it keeps by the hurt', aura: 0.01, move: 'guard' }),
    satyr3: plain({ name: 'Nimble', text: 'Slips a fifth of blows, and darts for the shooters first', dodge: 0.2, move: 'hunt' }),
    groveSatyr1: { skill: k.satyr.skill, passive: { ...k.satyr.passive, text: 'Climbs ledges at no extra cost, and goes round to a hero\'s side', move: 'flank' } },
    groveSatyr2: {
      skill: as(k.wanderer.skill, 'Grove Wine', 'A heady mist hangs round it for 5s: friends within 2 are guarded for 2s at once and heal each second', { dealt: 5, taken: 5, perSec: 3 }),
      passive: { name: 'Wild Revel', text: 'Friends within 2 tiles (and it) heal 1% of their health each second; it keeps by the hurt', aura: 0.01, move: 'guard' },
    },
    groveSatyr3: {
      skill: as(k.ranger.skill, 'Briar Snare', 'Lays two thorn snares on the tiles heroes will step on; the first to spring one is hurt and held for 2s'),
      passive: { name: 'Nimble', text: 'Slips a fifth of blows, and darts for the shooters first', dodge: 0.2, move: 'hunt' },
    },

    // ---- the Labyrinth (and the minotaur and gorgon bands) ----
    minotaur1: plain({ name: 'Bull Rush', text: 'Three steps in a row end in a blow half as hard again; it cannot be knocked back', steady: true, move: 'charge' }),
    minotaur2: plain({ name: 'Gore Rage', text: 'Hits up to half again as hard as its health falls, and three steps in a row end in a blow half as hard again', rage: 0.5, move: 'charge' }),
    minotaur3: plain({ name: 'Maze Wall', text: 'Blows from the front lose a fifth and it cannot be knocked back; it keeps by its friends', block: 0.2, steady: true, move: 'guard' }),
    gorgon1: plain({ name: 'Stony Glare', text: 'Its shots slow the hero for 1.2s, and it backs off from a blade', slow: 1200, move: 'kite' }),
    gorgon2: plain({ name: 'Venom Fangs', text: 'Its shots poison the hero, and it backs off from a blade', rider: POISON, move: 'kite' }),
    gorgon3: plain({ name: 'Serpent Eye', text: 'Its shots deal 30% more to shooters, and it makes for them first', prey: 1.3, move: 'hunt' }),
    mazeMino1: { skill: k.minotaur.skill, passive: { ...k.minotaur.passive, text: 'Blows deal a quarter more to a foe under half health, and three steps in a row end in a blow half as hard again', finish: { under: 0.5, mult: 1.25 }, move: 'charge' } },
    mazeMino2: {
      skill: as(k.barbarian.skill, 'Maze Cleave', 'Its axe cuts every hero in the 3x3 around it, and they bleed'),
      passive: { name: 'Gore Rage', text: 'Hits up to 40% harder as its health falls, and goes round to a hero\'s side', rage: 0.4, move: 'flank' },
    },
    mazeMino3: {
      skill: as(k.peasant.skill, 'Labyrinth Bellow', 'A bellow that steels its friends within 2 tiles: they take half damage for 3s'),
      passive: { name: 'Maze Wall', text: 'Blows from the front lose a quarter and it cannot be knocked back; it keeps by its friends', block: 0.25, steady: true, move: 'guard' },
    },
    mazeGorgon1: { skill: k.gorgon.skill, passive: { ...k.gorgon.passive, text: 'Takes a fifth less from shots, and backs off from a blade', move: 'kite' } },
    mazeGorgon2: {
      skill: as(k.archer.skill, 'Venom Rain', 'Spits venom over a 3x3 of tiles'),
      passive: { name: 'Venom Fangs', text: 'Its shots poison the hero, and it backs off from a blade', rider: POISON, move: 'kite' },
    },
    mazeGorgon3: {
      skill: as(k.buccaneer.skill, 'Serpent Lash', 'Its snakes yank the nearest shooter (else hero) in beside it, bite it and hold it for 1s'),
      passive: { name: 'Serpent Eye', text: 'Its shots deal 30% more to shooters, and it makes for them first', prey: 1.3, move: 'hunt' },
    },

    // ---- the Ogre Clans (and the ogre band) ----
    ogre: plain({ name: 'Great Club', text: 'Its club also hits the hero behind for 60%, and it cannot be knocked back', through: 0.6, steady: true }),
    clanOgre: {
      skill: as(k.barbarian.skill, 'Club Sweep', 'Its club sweeps every hero in the 3x3 around it, and they bleed'),
      passive: { name: 'Hide Like Bark', text: 'Heals 1% of its health each second, and it cannot be knocked back', regen: 0.01, steady: true },
    },
    clanBrute: {
      skill: as(k.ninjaMonk.skill, 'Skull Bash', 'Three heavy blows on one hero, who is stunned for 1.5s'),
      passive: { name: 'Brutal Rush', text: '15% of blows crit for x1.6 and make the hero bleed, and three steps in a row end in a blow half as hard again', crit: { chance: 0.15, mult: 1.6, bleed: BRUTAL }, move: 'charge' },
    },

    // ---- the Infernal Host (and the demon band) ----
    imp: plain({ name: 'Hellspark', text: 'Its claws set the hero alight, and it goes round to a hero\'s side', rider: BURN, move: 'flank' }),
    demon: plain({ name: 'Soul Hunger', text: 'Drinks 15% of what its blows deal, and flies at the shooters first', leech: 0.15, move: 'hunt' }),
    hellImp: { skill: as(k.boarKing.skill, 'Pitchfork Flurry', 'Three quick jabs on one hero, who is stunned for 1.5s'), passive: { ...k.devilLeader.passive, name: 'Hellspark', text: 'Its blows set the hero alight, and it goes round to a hero\'s side', move: 'flank' } },
    hellDemon: { skill: k.devilLeader.skill, passive: { name: 'Brimstone Wings', text: 'Its blows set the hero alight and it drinks 12% of what they deal; it flies at the shooters first', ignite: k.devilLeader.passive.ignite, leech: 0.12, move: 'hunt' } },

    // ---- the Yokai Night Parade ----
    yokaiFox: { skill: k.illusionist.skill, passive: { name: 'Fox Guile', text: 'Slips 20% of blows, and goes round to a hero\'s side', dodge: 0.2, move: 'flank' } },
    yokaiWitch: { skill: k.yokaiWitch.skill, passive: { ...k.yokaiWitch.passive, text: 'Heals for a sixth of the damage its blows deal, and backs off from a blade', move: 'kite' } },
    yokaiCrow: { skill: k.karasu.skill, passive: { ...k.karasu.passive, text: 'Blows deal 50% more to shooters, and it flies at them first', move: 'hunt' } },
    yokaiSeer: { skill: k.yokaiSeer.skill, passive: { ...k.yokaiSeer.passive, text: 'Blows deal 30% more to shooters, and it flies at them first', move: 'hunt' } },
    yokaiMonk: { skill: k.yamabushi.skill, passive: { ...k.yamabushi.passive, text: 'Heals 2% of his health each second, and keeps by his friends', move: 'guard' } },

    // ---- the Golem Forge ----
    ironGolem: { skill: k.knight.skill, passive: { ...k.ironGolem.passive, text: 'Blows from the front lose a third and it cannot be knocked back; it keeps by its friends', move: 'guard' } },
  };
}
