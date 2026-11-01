// The Eidolons' trials (EIDOLON-TRIAL, `docs/notes/eidolon-chain-2.md`): the owner's call that chains 2 to 6 end with a fight against the
// Eidolon itself before the binding. Once the three pieces are found the Eidolon tests the keep ("You have the pieces. Do you have the
// nerve?"): a quest battle of the chain's own, the Eidolon the boss, drawn large in its own art. Win it and the binding plays at once; lose it
// and the trial waits in the quest log's Eidolons tab, as any quest battle does.
//
// A trial is one piece of data (`TrialDef`): the boss (its fighter, as a foe of `foes.ts`), its kit (a summoning skill and a passive, read
// by `abilities.ts`), its great attacks (`bossAttacks.ts` signatures), the form it takes at half health (`bossPhases.ts`), the arena (the
// land, the waves, its strength, the cast) and the words (the part in the log, the lines before and after). The tables those files keep
// take each trial in from here, so chains 3 to 6 each add one entry to `TRIALS` and nothing else changes. A chain whose `trial` flag is set
// but has no entry here ends at the binding, as before.
//
// Pure data: no Pixi, no DOM, and only types imported (every table reads this file, so it must not read them).

import type { Area } from './board';
import type { Wave } from './armies';
import type { CastSlot } from './questBattles';
import type { Signature } from './bossAttacks';
import type { PhaseKit } from './bossPhases';
import type { Passive } from './abilities';
import type { UnitDef } from './units';

/** The Eidolon's own skill in its trial: it calls fighters of a kind to its side (`n` a cast, at most `most` standing and `limit` a fight). */
export interface TrialSummon {
  name: string;
  text: string;
  kind: string;
  n: number;
  most: number;
  limit: number;
}

export interface TrialDef {
  /** The trial's quest battle (a chain battle: `chainBattleData.ts` builds it from here). */
  id: string;
  /** The chain it ends (`eidolonChainData.ts`). */
  chain: string;
  /** The Eidolon as a fighter (a foe, its sheet its own art); `title` is the intro card's line under its name. */
  boss: UnitDef & { title: string };
  /** Its skill (a summoning) and its passive. */
  kit: { skill: TrialSummon; passive: Passive };
  /** Its great attacks (one or two; a boss with two alternates them). */
  signatures: readonly Signature[];
  /** What it becomes when its health first falls to half. */
  phase: PhaseKit;
  /** The arena: its land, its waves (the last the Eidolon's), how strong (`like`, `ease`, and `lift` on the Eidolon alone), the cast. */
  land: Area;
  waves: readonly Wave[];
  like: { army: string; wave: number };
  ease: number;
  lift: { hp: number; atk: number };
  cast: readonly CastSlot[];
  blurb: string;
  /** The part in the log (`title`: "The Trial"), the goal in words, and the Eidolon's words as it begins. */
  part: { title: string; text: string; begin: string };
  /** The story: the place, the Eidolon's challenge, a hero's answer, and the words after the win. */
  lines: { place: string; challenge: string[]; answer: string; after: string; afterHero: string };
}

/* ------------------------------------------------------------------ Nivra, the Rime Wyrm (chain 2) */

const NIVRA_TRIAL: TrialDef = {
  id: 'nivraTrial',
  chain: 'nivra',
  boss: {
    id: 'nivraWyrm',
    name: 'Nivra',
    title: 'The Rime Wyrm, Who Tests the Keep',
    side: 'foe',
    sheet: 'eidolon_nivra',
    scale: 0.62,
    hp: 1800,
    atk: 50,
    def: 11,
    range: 2,
    moveMs: 900,
    atkMs: 1400,
    jump: 3,
    role: 'Frost breath down a row, ice armour, a pack of frost wolves',
  },
  kit: {
    skill: { name: 'Call of the Mere', text: 'Two frost wolves run out of the snow to her side (four at most, six in a fight)', kind: 'packWhite', n: 2, most: 4, limit: 6 },
    passive: { name: 'Rime Scales', text: 'Blows from the front lose a fifth, and her blows chill', block: 0.2, slow: 1500 },
  },
  signatures: [
    { key: 'rimeBreath', name: 'Rime Breath', rage: 'The Long Winter', el: 'ice', shape: { kind: 'row', w: 1 }, power: 1.7, rider: 'freeze' },
    { key: 'glassTomb', name: 'Glass Tomb', rage: 'The Mere Closes', el: 'ice', shape: { kind: 'ring', r0: 1, r: 2 }, power: 1.4, rider: 'chill' },
  ],
  phase: {
    line: 'THE ICE REMEMBERS. SO DO I. COME, MY WOLVES!',
    atk: 1.15,
    shield: 0.18,
    adds: { kind: 'packWhite', n: 2 },
    passive: { block: 0.35, thorns: 0.2 },
  },
  land: 'snow',
  waves: [
    { foes: ['packWhite', 'crystalGolem', 'packWhite', 'crystalGolem'] },
    { foes: ['nivraWyrm', 'packWhite', 'packWhite'], boss: 'final' },
  ],
  like: { army: 'beasts', wave: 13 },
  ease: 0.97,
  lift: { hp: 1, atk: 1 },
  // (Ayame or Kenji, as at the Glass Mere; any starter hero stands in)
  cast: [{ heroes: ['kunoichi', 'samurai'], standIns: ['knight', 'peasant', 'archer', 'wizard'] }],
  blurb: 'Nivra has woken. Before she answers the horn, she wants to see what blows it.',
  part: {
    title: 'The Trial',
    text: 'Win the trial against Nivra herself on the Glass Mere (Ayame or Kenji fights; any starter hero may stand in)',
    begin: 'You have the pieces. Do you have the nerve? Come back to the mere, little keep, and show me.',
  },
  lines: {
    place: 'The Glass Mere again. The ice is broken open in the middle, and the water under it is moving.',
    challenge: ['So. The little fires who knocked on my door.', 'You have the pieces. Do you have the nerve?'],
    answer: 'We came all this way. We are not going home cold.',
    after: 'Good. The pack ran from me. You stood. Take me to your Summoner, little keep: I will answer your horn.',
    afterHero: 'She is laughing. I think. It sounds like a lake cracking.',
  },
};


/* ------------------------------------------------------------------ Aurelan, the Lion of Dawn (chain 3, `docs/notes/eidolon-chain-3.md`) */

const AURELAN_TRIAL: TrialDef = {
  id: 'aurelanTrial',
  chain: 'aurelan',
  boss: {
    id: 'aurelanLion',
    name: 'Aurelan',
    title: 'The Lion of Dawn, Who Tests the Keep',
    side: 'foe',
    sheet: 'eidolon_aurelan',
    scale: 0.6,
    hp: 1800,
    atk: 52,
    def: 9,
    range: 1,
    moveMs: 650,
    atkMs: 1200,
    jump: 4,
    role: 'Lances of light on a column, a roaring that stuns the front rank, a dome of dawn',
  },
  kit: {
    skill: { name: 'The Pride Answers', text: "Two of the grove's satyrs run to the Lion's side, sworn to the dawn (four at most, six in a fight)", kind: 'groveSatyr1', n: 2, most: 4, limit: 6 },
    passive: { name: 'Dome of Dawn', text: 'A radiant dome stands round him: blows from the front lose a quarter', block: 0.25 },
  },
  signatures: [
    { key: 'dawnLances', name: 'Lances of Dawn', rage: 'The Sun Comes Down', el: 'light', shape: { kind: 'rain', n: 3 }, power: 1.5, rider: 'burn' },
    { key: 'dawnRoar', name: 'Dawnbreak Roar', rage: 'Dawnbreak Unending', el: 'light', shape: { kind: 'row', w: 1 }, power: 1.4, rider: 'stun' },
  ],
  phase: {
    line: 'THE DAWN IS HERE. STAND IN MY LIGHT, IF YOU CAN!',
    atk: 1.2,
    heal: 0.08,
    shield: 0.2,
    haste: 6000,
    adds: { kind: 'groveSatyr1', n: 2 },
    passive: { block: 0.35 },
  },
  land: 'highlands',
  waves: [
    { foes: ['groveSatyr1', 'groveSatyr2', 'groveSatyr3', 'groveSatyr1'] },
    { foes: ['aurelanLion', 'groveSatyr2', 'groveSatyr3'], boss: 'final' },
  ],
  like: { army: 'wildwood', wave: 13 },
  ease: 0.68,
  lift: { hp: 1, atk: 1 },
  // (Kwame or Minh, one from each starter pack; any starter hero stands in)
  cast: [{ heroes: ['knight', 'peasant'], standIns: ['samurai', 'kunoichi', 'archer', 'wizard'] }],
  blurb: 'Aurelan stands on the hill at the edge of dawn. Before he answers the horn, he wants to see what blows it.',
  part: {
    title: 'The Trial',
    text: 'Win the trial against Aurelan himself on the Dawn Hill (Kwame or Minh fights; any starter hero may stand in)',
    begin: 'You have the pieces. Do you have the light? Come up the hill before sunrise, little keep, and stand in mine.',
  },
  lines: {
    place: 'The hill above the Sanctum, an hour before sunrise. The east is grey, and something large and gold is waiting in it.',
    challenge: ['So. The little keep that lit a lamp against the dark.', 'You have the pieces. Do you have the light?'],
    answer: 'We have been standing in the dark a long time. Show us the dawn.',
    after: 'Good. Night is long, and you outlasted it. Take me to your Summoner, little keep: I will answer your horn.',
    afterHero: 'The sun comes up behind him. He looks pleased, and slightly smug about it.',
  },
};

/* ------------------------------------------------------------------ Voltara, the Copper Goddess (chain 4, `docs/notes/eidolon-chain-4.md`) */

const VOLTARA_TRIAL: TrialDef = {
  id: 'voltaraTrial',
  chain: 'voltara',
  boss: {
    id: 'voltaraGoddess',
    name: 'Voltara',
    title: 'The Copper Goddess, Who Tests the Keep',
    side: 'foe',
    sheet: 'eidolon_voltara',
    scale: 0.6,
    hp: 1700,
    atk: 50,
    def: 8,
    range: 4,
    moveMs: 750,
    atkMs: 1150,
    jump: 4,
    shot: 'bolt',
    role: 'A chain of lightning that leaps hero to hero, a storm that strikes where it has marked, a ring of copper that turns shots aside',
  },
  kit: {
    skill: { name: 'Copper Sentries', text: "Two crystal golems, wired to her coil, step out of the storm to her side (three at most, five in a fight)", kind: 'crystalGolem', n: 2, most: 3, limit: 5 },
    passive: { name: 'Copper Ring', text: 'A ring of copper turns shots aside (they lose 40%), and her blows may arc to a second hero beside the first', scales: 0.4, arc: 0.5 },
  },
  signatures: [
    { key: 'chainArc', name: 'Chain Lightning', rage: 'The Arc Unbroken', el: 'lightning', shape: { kind: 'line', len: 8, w: 1 }, power: 1.45, rider: 'stun' },
    { key: 'stormMark', name: 'Marked Storm', rage: 'The Sky Falls In', el: 'lightning', shape: { kind: 'rain', n: 4 }, power: 1.3, rider: 'burn' },
  ],
  phase: {
    line: 'OVERCHARGED! LET THE WHOLE SKY IN!',
    atk: 1.25,
    heal: 0.06,
    shield: 0.2,
    haste: 7000,
    adds: { kind: 'crystalGolem', n: 1 },
    passive: { scales: 0.55, arc: 0.8 },
  },
  land: 'crystal',
  waves: [
    { foes: ['mazeGorgon1', 'mazeMino1', 'mazeGorgon2', 'mazeMino2'] },
    { foes: ['voltaraGoddess', 'mazeGorgon3', 'mazeMino3'], boss: 'final' },
  ],
  like: { army: 'labyrinth', wave: 13 },
  ease: 0.6,
  lift: { hp: 1, atk: 1 },
  // (Kwame or Minh, one from each starter pack; any starter hero stands in)
  cast: [{ heroes: ['knight', 'peasant'], standIns: ['samurai', 'kunoichi', 'archer', 'wizard'] }],
  blurb: 'Voltara hangs over the Lightning Heights with the storm held in her hands. Before she takes a roof, she wants to see who built it.',
  part: {
    title: 'The Trial',
    text: 'Win the trial against Voltara herself on the Lightning Heights (Kwame or Minh fights; any starter hero may stand in)',
    begin: 'You have the coil, the clock and the glass. Now stand under the open sky and show me you can bear a house worth sheltering in.',
  },
  lines: {
    place: 'The Lightning Heights above the keep, where the crystals hum and the sky is the colour of a bruise. Something bright hangs in the middle of it, turning slowly.',
    challenge: ['So. A roof, and a door, and a very small keep underneath.', 'You have the coil, the clock and the glass. Do you have the nerve to be struck?'],
    answer: 'Strike, then. We have a rod, and a very good ceiling.',
    after: 'A door that held. Three hundred years I have been looking, and it was a keep. Take me to your Summoner, little roof: I will answer your horn.',
    afterHero: 'She comes down out of the storm and the clouds break, all at once, into a very ordinary and welcome rain.',
  },
};

/* ------------------------------------------------------------------ Gorm, the Quarry Titan (chain 5, `docs/notes/eidolon-chain-5.md`) */

const GORM_TRIAL: TrialDef = {
  id: 'gormTrial',
  chain: 'gorm',
  boss: {
    id: 'gormTitan',
    name: 'Gorm',
    title: 'The Quarry Titan, Who Tests the Keep',
    side: 'foe',
    sheet: 'eidolon_gorm',
    scale: 0.66,
    hp: 2600,
    atk: 55,
    def: 16,
    range: 1,
    moveMs: 1000,
    atkMs: 1500,
    jump: 2,
    role: 'A landslide that clears the ground round him, pillars that rise where he has marked, a hide of granite that cannot be shoved',
  },
  kit: {
    skill: { name: 'Stone Raises Stone', text: 'Two stone golems peel off the quarry wall to his side (four at most, six in a fight)', kind: 'stoneGolem', n: 2, most: 4, limit: 6 },
    passive: { name: 'Granite Hide', text: 'Blows from the front lose a third, he cannot be shoved, and what strikes him in melee takes a tenth back', block: 0.33, steady: true, thorns: 0.1 },
  },
  signatures: [
    { key: 'landslide', name: 'Landslide', rage: 'The Hill Comes Down', el: 'earth', shape: { kind: 'ring', r0: 1, r: 3 }, power: 1.45, rider: 'shove' },
    { key: 'risingPillars', name: 'Rising Pillars', rage: 'The Whole Quarry', el: 'earth', shape: { kind: 'rain', n: 4 }, power: 1.35, rider: 'stun' },
  ],
  phase: {
    line: 'I WAS THE HILL. I AM STILL THE HILL. MIND YOUR FEET!',
    atk: 1.2,
    heal: 0.05,
    shield: 0.25,
    adds: { kind: 'stoneGolem', n: 2 },
    passive: { block: 0.45, thorns: 0.2 },
  },
  land: 'ruins',
  waves: [
    { foes: ['stoneGolem', 'ironGolem', 'magmaGolem', 'stoneGolem'] },
    { foes: ['gormTitan', 'stoneGolem', 'ironGolem'], boss: 'final' },
  ],
  like: { army: 'infernal', wave: 13 },
  ease: 0.27,
  lift: { hp: 1, atk: 1 },
  // (Kwame or Minh, one from each starter pack; any starter hero stands in)
  cast: [{ heroes: ['knight', 'peasant'], standIns: ['samurai', 'kunoichi', 'archer', 'wizard'] }],
  blurb: 'Gorm lies in the Old Quarry, half hill and half titan. Before he gets up, he wants to see whether the keep he built is still standing.',
  part: {
    title: 'The Trial',
    text: 'Win the trial against Gorm himself in the Old Quarry (Kwame or Minh fights; any starter hero may stand in)',
    begin: 'You have the flake, the mark and the stone. Now come down to the quarry, little keep, and let me see whether I built you well.',
  },
  lines: {
    place: 'The Old Quarry, a mile below the keep: grey walls cut in great steps, moss on every ledge. A part of the hillside stands up and turns round.',
    challenge: ['So. Somebody has been knocking on my foundations.', 'You have the flake, the mark and the stone. Do you have the weight?'],
    answer: 'We have lived on you for three hundred years. We would like to know whether we may go on.',
    after: 'Hm. It held. I built it well, and I never said. Take me to your Summoner, little keep: I will answer your horn.',
    afterHero: 'He sits down on the quarry floor, very carefully, and the whole valley feels it. He looks, if a hill can look, rather pleased.',
  },
};

/* ------------------------------------------------------------------ Vaelkhar, the Dragon King (chain 6, `docs/notes/eidolon-chain-6.md`) */

const VAELKHAR_TRIAL: TrialDef = {
  id: 'vaelkharTrial',
  chain: 'vaelkhar',
  boss: {
    id: 'vaelkharKing',
    name: 'Vaelkhar',
    title: 'The Dragon King, Who Tests the Keep',
    side: 'foe',
    sheet: 'eidolon_vaelkhar',
    scale: 0.7,
    hp: 3000,
    atk: 60,
    def: 14,
    range: 3,
    moveMs: 700,
    atkMs: 1150,
    jump: 5,
    shot: 'curse',
    role: 'A torrent of black fire down a whole line, a void that drags heroes in, scales that turn shots aside and drink what they stop',
  },
  kit: {
    skill: { name: 'The Court of Night', text: 'Two demons of his court step out of the dark to his side (three at most, five in a fight)', kind: 'hellDemon', n: 2, most: 3, limit: 5 },
    passive: { name: 'Doom Scales', text: 'Blows from the front lose a quarter, shots lose a third, and he heals a fifth of the damage he deals', block: 0.25, scales: 0.33, leech: 0.2 },
  },
  signatures: [
    { key: 'voidfire', name: 'Voidfire', rage: 'Torrent of Night', el: 'dark', shape: { kind: 'line', len: 9, w: 2 }, power: 1.6, rider: 'curse' },
    { key: 'voidCollapse', name: 'The Void Collapses', rage: 'Crown of Night', el: 'dark', shape: { kind: 'pull', reach: 6, drag: 2, r: 2 }, power: 1.5, rider: 'stun' },
  ],
  phase: {
    line: 'KNEEL, LITTLE KING. THEN STAND, AND WATCH!',
    atk: 1.3,
    heal: 0.08,
    shield: 0.25,
    haste: 8000,
    adds: { kind: 'hellDemon', n: 2 },
    passive: { block: 0.35, scales: 0.5, leech: 0.35 },
  },
  land: 'volcano',
  waves: [
    { foes: ['hellImp', 'hellDemon', 'hellImp', 'hellDemon'] },
    { foes: ['vaelkharKing', 'hellDemon', 'hellImp', 'hellDemon'], boss: 'final' },
  ],
  like: { army: 'golems', wave: 13 },
  ease: 0.215,
  lift: { hp: 1, atk: 1 },
  // (Kwame or Minh, one from each starter pack; any starter hero stands in)
  cast: [{ heroes: ['knight', 'peasant'], standIns: ['samurai', 'kunoichi', 'archer', 'wizard'] }],
  blurb: 'Vaelkhar hangs above the Black Summit with the sun put out behind him. Before he takes his seat, he wants to see who keeps the door.',
  part: {
    title: 'The Trial',
    text: 'Win the trial against Vaelkhar himself on the Black Summit (Kwame or Minh fights; any starter hero may stand in)',
    begin: 'You have the scale, the letter and the tine. Now come up to the Black Summit, little keep, and show me what keeps my door.',
  },
  lines: {
    place: 'The Black Summit above the rift, where the sun has been put out like a candle. A halo of violet fire hangs in the dark, and under it, something very large unfolds its wings.',
    challenge: ['So. The little keep that dusted my things.', 'You have the scale, the letter and the tine. Do you have the crown?'],
    answer: 'We shut your last door, and came back for the next. Kneel? We would rather stand, and watch.',
    after: 'Hm. A king is tested by those who keep his door, and the door held. Take me to your Summoner, little keep: I will answer your horn.',
    afterHero: 'He folds his wings, one at a time, like putting away a very large umbrella, and the sun comes back on behind him with a faint, embarrassed click.',
  },
};

/** Every trial written, one a chain. */
export const TRIALS: readonly TrialDef[] = [NIVRA_TRIAL, AURELAN_TRIAL, VOLTARA_TRIAL, GORM_TRIAL, VAELKHAR_TRIAL];

const BY_CHAIN = new Map(TRIALS.map((t) => [t.chain, t]));
/** A chain's trial, if one is written. */
export const trialOfChainId = (chain: string): TrialDef | undefined => BY_CHAIN.get(chain);
/** The trial a battle is, if it is one. */
export const trialOfBattle = (battle: string): TrialDef | undefined => TRIALS.find((t) => t.id === battle);
