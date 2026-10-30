// The mix's targets, in LUFS at the page's output with both sliders at 100 %, and the gains that reach them. `measure.mjs` meters
// the page; `node tools/audio-mix/targets.mjs <measured.json>` reads its JSON and prints, for every track, cue and spell, the gain
// that would bring it to its target (its present gain times the gap), for `audioMix.ts`, `soundRules.ts` (`CUES`) and
// `spellSfx.ts` (`SPELL_TRIM`). A loop is aimed by its integrated loudness, a short sound by its loudest 400 ms (momentary max).
//
// The relationships (docs/notes/audio-mix.md):
// - a fight's sounds together sit about -23.5 LUFS; the battle music 7 LU under them (-30.5), the boss's and the Calamity's too;
// - the menus' and maps' music a little louder (-28), the cinematics' scores louder again (-27): nothing is fighting them;
// - a plain blow about -26 momentary, a crit or a heavy blow a few LU over, a death -23, the shots and skills' voices -27 to -29;
// - the big moments (an ultimate, a king's spell) just above the fight's loudest moments: -16 to -15 momentary; the victory
//   fanfare a touch over the fight's own loudness;
// - the taps and chimes of the menus -40 (a tap) to -26 (a three-piece set), clear over the menu music but never a jolt.
import { readFileSync } from 'node:fs';

export const MUSIC_TARGET = {
  battle: -30.5, boss: -30, calbattle: -30,
  // (the armies' own battle tracks: the main theme in each army's dress)
  orcs: -30.5, undead: -30.5, beasts: -30.5, wildwood: -30.5, labyrinth: -30.5, ogres: -30.5, infernal: -30.5, yokai: -30.5, golems: -30.5,
  camp: -28, tavern: -28, deploy: -28, tower: -28, calmap: -28, triumph: -28,
  opening: -27, gorvak: -27, herald2: -27, herald3: -27, herald4: -27, herald5: -27, herald6: -27, comic: -27, solemn: -27, spire: -27,
  // (the stings, by integrated loudness: the fanfare a touch over the fight, the fall's sting a little under it)
  victory: -23.5, defeat: -25.5,
};

/** Each cue's momentary-max target. The quick swings the fight mutes (`cuesFor`) are left as they are. */
export const CUE_TARGET = {
  // the page's own (ui) and the summoning show
  tap: -40, summon: -28, merge: -27, coin: -30, star: -30, levelUp: -26, coinRecycle: -30, coinClaim: -28, sparkle: -31,
  autoStart: -32, autoStop: -32, autoDone: -29, setChime2: -28, setChime3: -26,
  riseSummon: -27, stingSummon: -22, slam: -25,
  // the stingers of the tower, the Stand and the scenes
  victory: -24, defeat: -25, steps: -34, twistCurse: -27, twistBlessing: -27, eliteSting: -23, standBoss: -23, kingHit: -27,
  sceneBoss: -22, sceneVictory: -22, skill: -30, spell: -30,
  // blows
  swingHeavy: -30, hitLight: -28, hitSword: -26, hitHeavy: -23, hitBone: -26, hitFist: -26, hitSpear: -26, crit: -20, block: -25, miss: -39,
  // shots
  bow: -28, arrowFly: -39, arrowHit: -27, gun: -26, shell: -37, bulletHit: -27, throwBone: -32, boneClatter: -28,
  // the elements and the skills' voices
  fireWhoosh: -29, fireBoom: -23, frostCrack: -27, frostShatter: -27, crackle: -28, thunder: -23, holyChime: -27, shadowHum: -27,
  poisonHiss: -28, rustle: -31, windGust: -31, earthRumble: -24, meteorFall: -27, arrowRain: -29, boom: -22,
  heal: -28, shieldHum: -29, horn: -27, pipes: -29, dash: -33, blink: -29, trap: -27,
  // big moments
  ultimate: -16, bossSkill: -20, ultSlash: -22, ultImpact: -18,
  // deaths
  deathBones: -23, deathBurn: -23, deathThud: -23, deathStone: -23, deathBlood: -23, deathLight: -24,
};

/** A king's spell, cast and effect together: just above the fight's loudest moments. */
export const SPELL_TARGET = -15;

const round = (g) => +(g >= 1 ? g.toFixed(2) : g.toPrecision(2));
const toward = (gain, measured, target) => round(gain * 10 ** ((target - measured) / 20));

if (process.argv[2]) {
  const m = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  // (the gains in force when it was measured, which `measure.mjs` keeps in its JSON)
  const { TRACK_GAIN, CUES, SPELL_TRIM } = m.gains;
  const cur = (t, k) => t[k] ?? 1;
  if (m.music) {
    console.log('TRACK_GAIN:');
    for (const [k, t] of Object.entries(MUSIC_TARGET)) if (m.music[k]) console.log(`  ${k}: ${toward(cur(TRACK_GAIN, k), m.music[k].lufs, t)},`);
  }
  if (m.cues) {
    console.log('CUES gains:');
    for (const [k, t] of Object.entries(CUE_TARGET)) console.log(`  ${k}: ${CUES[k]} -> ${toward(CUES[k], m.cues[k].mMax, t)}`);
  }
  if (m.spells) {
    console.log('SPELL_TRIM:');
    for (const [k, s] of Object.entries(m.spells)) console.log(`  ${k}: ${toward(cur(SPELL_TRIM, k), s.mMax, SPELL_TARGET)},`);
  }
}
