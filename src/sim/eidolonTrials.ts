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

/** Every trial written, one a chain (chains 5 and 6 add theirs here). */
export const TRIALS: readonly TrialDef[] = [NIVRA_TRIAL, AURELAN_TRIAL, VOLTARA_TRIAL];

const BY_CHAIN = new Map(TRIALS.map((t) => [t.chain, t]));
/** A chain's trial, if one is written. */
export const trialOfChainId = (chain: string): TrialDef | undefined => BY_CHAIN.get(chain);
/** The trial a battle is, if it is one. */
export const trialOfBattle = (battle: string): TrialDef | undefined => TRIALS.find((t) => t.id === battle);
