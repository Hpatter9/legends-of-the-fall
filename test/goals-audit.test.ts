// The goals audit (GOALS-AUDIT, `docs/notes/goals-audit.md`): every goal a player can be given is proved doable under the rules as they now
// stand. One of each hero on the field (`oneEach.ts`), a field of five (the Calamity's no guest), heroes earned in play kept secret
// (`secretHeroes.ts`), no tier skills. A goal that needs more different heroes than the field holds, than a trait has, or that names a hero
// that does not exist, a combo of the wrong size, a fight rider that cannot be met together, or words for what was taken out of the game,
// fails here, so a later change cannot break one silently. Pure data checks: no Pixi, no DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS } from '../src/sim/achievements';
import { ARMIES } from '../src/sim/armies';
import { CAL_MAPS } from '../src/sim/calamity';
import { COMBOS } from '../src/sim/combos';
import { DAILY_THEMES, SWARM_MAX, themeGoalText, themePool } from '../src/sim/dailyThemes';
import { CHAINS } from '../src/sim/eidolonChainData';
import { questBattleById } from '../src/sim/questBattles';
import { QUESTS, type Goal, type With } from '../src/sim/questData';
import { RELIC_IDS } from '../src/sim/relics';
import { SQUAD } from '../src/sim/run';
import { CONTENT_KINDS } from '../src/sim/unlockRules';
import { TALE_HEROES } from '../src/sim/secretHeroes';
import { ACT_HALLS } from '../src/sim/standActs';
import { HERO_TRAITS, membersOf, TRAITS } from '../src/sim/traits';
import { FOES } from '../src/sim/foes';
import { ALL_HEROES, UNITS } from '../src/sim/units';

/** The most different heroes any fight fields at once (the five; a guest is a sixth in armies and dailies only). */
const FIELD = SQUAD;
const fits = (w: With, k: string): boolean => !!w.heroes?.includes(k) || !!w.traits?.some((t) => HERO_TRAITS[k]?.includes(t));
/** The kinds that fit a rider. */
const fitting = (w: With): string[] => ALL_HEROES.filter((k) => fits(w, k));

/** What is wrong with a goal, if anything (the same checks for a quest, a chain part and a tale). */
function problems(goal: Goal): string[] {
  const g = goal as Goal & Record<string, any>;
  const out: string[] = [];
  const all: string[] = g.all ?? [];
  if (new Set(all).size !== all.length) out.push('names a hero twice (one of each on the field)');
  if (all.length > FIELD) out.push(`needs ${all.length} different heroes on a field of ${FIELD}`);
  for (const k of all) if (!UNITS[k]) out.push(`hero ${k} does not exist`);
  if (g.most !== undefined && g.most < all.length) out.push('"at most" fewer heroes than it must field together');
  if (g.most !== undefined && g.most < 1) out.push('fields at most no hero');
  if (g.only) {
    const fit = fitting(g.only);
    if (!fit.length) out.push('"only" matches no hero');
    for (const k of all) if (!fits(g.only, k)) out.push(`must field ${k}, but "only" bars it`);
  }
  if (g.with && !fitting(g.with).length) out.push('"with" matches no hero');
  if (g.by && !fitting(g.by).length) out.push('"by" matches no hero');
  if (g.with && g.only && !fitting(g.with).some((k) => fits(g.only, k))) out.push('"with" and "only" share no hero');
  for (const t of [...(g.with?.traits ?? []), ...(g.only?.traits ?? []), ...(g.by?.traits ?? [])]) if (!membersOf(t).length) out.push(`trait ${t} has no heroes`);
  // a five-hero combo needs its five different heroes together, so nothing may keep the field below five or bar one of them
  if (g.kind === 'teamCombo') {
    if (g.combo) {
      const c = COMBOS.find((x) => x.id === g.combo);
      if (!c) out.push(`combo ${g.combo} does not exist`);
      else {
        if (new Set(c.heroes).size !== 5) out.push('its combo does not have five different heroes');
        if (g.most !== undefined && g.most < 5) out.push('a five-hero combo with fewer than five fielded');
        if (g.only) for (const k of c.heroes) if (!fits(g.only, k)) out.push(`combo hero ${k} barred by "only"`);
      }
    } else if (g.most !== undefined && g.most < 5) out.push('a five-hero combo with fewer than five fielded');
  }
  if (g.kind === 'calGuardian' && g.map !== undefined && !(g.map >= 1 && g.map <= CAL_MAPS)) out.push(`Calamity map ${g.map} is out of 1 to ${CAL_MAPS}`);
  if (g.kind === 'standRoom' && !(g.n >= 1 && g.n <= ACT_HALLS.length)) out.push(`Last Stand act ${g.n} is out of 1 to ${ACT_HALLS.length}`);
  if (g.kind === 'holdLine' && g.n < 1) out.push('holds the line no times');
  if (g.kind === 'battle' && !questBattleById(g.battle)) out.push(`quest battle ${g.battle} does not exist`);
  if (g.army && !ARMIES.some((a) => a.id === g.army)) out.push(`army ${g.army} does not exist`);
  if (g.army && g.stage !== undefined) {
    const a = ARMIES.find((x) => x.id === g.army);
    if (a && g.stage > a.waves.length) out.push(`wave ${g.stage} of an army of ${a.waves.length}`);
  }
  if (!(g.n >= 1)) out.push('asks for none');
  return out;
}

// Words for what is gone: tier skills (ranks no longer upgrade skills), a fielded pair of one hero, merging what stands on the field.
const GONE = /tier skill|skill tier|rank(?:s|ed)? (?:up )?(?:a |the )?skill|upgrade[sd]? (?:a |the |its |their )?skills?|two (?:of the same|\w+) on the field|duplicate|a second (?:copy|\w+) on the field|merge[sd]? (?:a )?(?:fielded|field)/i;

test('every daily theme\'s goal can be met by the starting five, with different heroes, in the field', () => {
  for (const t of DAILY_THEMES) {
    const five = t.five.filter((k) => HERO_TRAITS[k]?.includes(t.trait));
    assert.ok(t.need >= 2 && t.need <= FIELD, `${t.id}: need ${t.need} is out of 2 to ${FIELD}`);
    // (a Hire draws at random from the pool, so no goal leans on one: the five alone must meet it)
    assert.ok(five.length >= t.need, `${t.id}: the five hold ${five.length} ${t.trait} heroes, the goal needs ${t.need}`);
    assert.equal(new Set(t.five).size, 5, `${t.id}: the five are five different heroes`);
    assert.equal(new Set(themePool(t)).size, themePool(t).length, `${t.id}: no hero twice in the pool`);
    for (const k of themePool(t)) assert.ok(UNITS[k] && ALL_HEROES.includes(k), `${t.id}: ${k} is a hero`);
    assert.ok(membersOf(t.trait).length >= t.need, `${t.id}: the trait has enough heroes`);
    assert.ok(SWARM_MAX >= 1);
    assert.ok(!GONE.test(`${t.name} ${t.idea} ${themeGoalText(t)}`), `${t.id}: words for what is gone`);
  }
});

test('no daily theme\'s words name a secret hero (the day brings its heroes; the words never give them away)', () => {
  for (const t of DAILY_THEMES) {
    const words = `${t.name} ${t.idea} ${themeGoalText(t)}`;
    for (const k of TALE_HEROES) assert.ok(!words.includes(UNITS[k].name), `${t.id} names ${UNITS[k].name}`);
  }
});

test('every quest goal is doable: heroes that exist, a field that holds them, riders that can be met together', () => {
  const bad: string[] = [];
  for (const q of QUESTS) for (const p of problems(q.goal)) bad.push(`${q.id}: ${p}`);
  assert.deepEqual(bad, []);
});

test('every Eidolon chain part\'s goal is doable too', () => {
  const bad: string[] = [];
  for (const c of CHAINS) for (const p of c.parts) for (const w of problems(p.goal)) bad.push(`${c.id}/${p.id}: ${w}`);
  assert.deepEqual(bad, []);
});

test('a quest that names a secret hero asks for it, so it is offered only to a save that has the hero', () => {
  const asks = (q: (typeof QUESTS)[number], k: string): boolean => {
    const g = q.goal as Goal & Record<string, any>;
    const w = [g.with, g.only, g.by].filter(Boolean) as With[];
    return q.hero === k || (g.all ?? []).includes(k) || w.some((x) => x.heroes?.includes(k)) || q.reward.shards?.kind === k;
  };
  const bad: string[] = [];
  for (const q of QUESTS) {
    if (q.giver === 'tale' || (['shepherd', 'gaoler', 'smith', 'sexton', 'pawnbroker', 'lantern', 'herald', 'clock', 'falconer', 'archivist'] as string[]).includes(q.giver)) continue;
    // (a foe may share a hero's word, like the Alpha Werewolf: take the foes' names out first)
    let words = [q.title, q.text, q.going, ...q.offer, ...q.done].join(' ');
    for (const f of Object.values(FOES)) if (f.name) words = words.split(f.name).join('');
    for (const k of CONTENT_KINDS) if (words.includes(UNITS[k].name) && !asks(q, k)) bad.push(`${q.id} names ${UNITS[k].name} without asking for them`);
  }
  assert.deepEqual(bad, []);
});

test('no quest, chain part or achievement is worded for what the game no longer has', () => {
  const bad: string[] = [];
  for (const q of QUESTS) if (GONE.test(`${q.title} ${q.text} ${q.going}`)) bad.push(q.id);
  for (const c of CHAINS) for (const p of c.parts) if (GONE.test(`${p.title} ${p.text}`)) bad.push(`${c.id}/${p.id}`);
  for (const a of ACHIEVEMENTS) if (GONE.test(`${a.name} ${a.text}`)) bad.push(a.id);
  assert.deepEqual(bad, []);
});

test('the achievements that lean on the rules still can be met', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  // (Relic Hoarder: five relics in one run, so at least five relics in the game)
  assert.ok(RELIC_IDS.length >= 5);
  // (Yokai Only: a hero or more, all of them Yokai)
  assert.ok(membersOf('yokai').length >= 1);
  // (Full Roster counts the secret heroes, who are earned in the tavern's tales)
  assert.equal(TALE_HEROES.length, CONTENT_KINDS.length);
  for (const a of ACHIEVEMENTS) assert.ok(a.crowns > 0, a.id);
  for (const id of Object.keys(TRAITS)) assert.ok(membersOf(id).length >= 1, `trait ${id} has a member`);
});
