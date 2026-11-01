import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallOutcome, MAX_RETRIES, newRun, retryWave } from '../src/sim/run';
import { loadMeta, newMeta, pickStarter, saveMeta } from '../src/sim/meta';
import { cardDue, cardKey, dueScene, lossMoments, markCard, markSeen } from '../src/sim/sceneRules';
import { SCENES, SCENE_ORDER, type Moment } from '../src/sim/sceneScripts';
import { grantContent } from '../src/sim/contentHeroes';
import { MODE_NEED } from '../src/sim/modeUnlock';

// The cinematic fixes (docs/notes/scenes-fixes.md): the first-loss scene only on a final defeat, boss scenes and cards once a save, the king
// always the player (never Duchess), the Calamity's scenes after it opens, and the Last Stand and the Calamity told without towers.

const picked = (seed = 31) => {
  const m = newMeta(seed);
  pickStarter(m, 0);
  return m;
};
const linesOf = (id: string): string[] => SCENES[id].shots.flatMap((s) => [s.caption ?? '', ...(s.lines ?? []).map((l) => l.text)]).concat(SCENES[id].title, SCENES[id].blurb);
const store = () => {
  const d: Record<string, string> = {};
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v) };
};

test('the first-loss scene comes only with a real defeat: not on a fall a heart revives', () => {
  const r = newRun(41);
  assert.equal(fallOutcome(r), 'heart');
  assert.deepEqual(lossMoments(fallOutcome(r)), [], 'a heart left: no loss scene');
  for (let i = 0; i < MAX_RETRIES; i++) retryWave(r);
  assert.equal(fallOutcome(r), 'end');
  assert.deepEqual(lossMoments(fallOutcome(r)), [{ kind: 'firstLoss' }], 'no heart left: the loss is real');
});

test('every boss and herald scene plays once a save: seen, it is not due again (new runs, retries and days alike)', () => {
  const m = picked();
  m.opened = ['calamity'];
  const bossy = new Set<Moment['kind']>(['calOpen', 'calBoss', 'calVictory', 'bossForm', 'dailyBoss', 'elite', 'mythic', 'ascension', 'armyClear', 'spire']);
  let n = 0;
  for (const id of SCENE_ORDER) {
    const mo = SCENES[id].moment;
    if (!bossy.has(mo.kind)) continue;
    assert.equal(dueScene(m, mo), id, id);
    markSeen(m, id);
    assert.equal(dueScene(m, mo), null, `${id} plays once`);
    assert.ok(!SCENES[id].again, `${id} is not a repeat`);
    n++;
  }
  assert.ok(n > 30);
  // (the seen list survives a reload)
  const s = store();
  saveMeta(m, s);
  const back = loadMeta(1, s);
  for (const id of SCENE_ORDER) if (bossy.has(SCENES[id].moment.kind)) assert.equal(dueScene(back, SCENES[id].moment), null, id);
});

test('a boss’s card (the slam-down ribbon) shows once a save for each boss or named elite, and is kept across a reload', () => {
  const m = picked();
  const k = cardKey('orcWarlord');
  assert.equal(cardDue(m, k), true);
  markCard(m, k);
  markCard(m, k);
  assert.equal(cardDue(m, k), false);
  assert.equal(cardDue(m, cardKey('lichKing')), true, 'another boss has its own');
  assert.equal(cardKey('orcGrunt', 'eliteGorrak'), 'elite:eliteGorrak');
  assert.deepEqual(m.bossCards, ['orcWarlord']);
  const s = store();
  saveMeta(m, s);
  assert.deepEqual(loadMeta(1, s).bossCards, ['orcWarlord']);
  // (an old save has none, and junk is dropped)
  saveMeta({ ...m, bossCards: undefined }, s);
  assert.equal(loadMeta(1, s).bossCards, undefined);
  saveMeta({ ...m, bossCards: [3, 'orcWarlord', 'orcWarlord', null] as unknown as string[] }, s);
  assert.deepEqual(loadMeta(1, s).bossCards, ['orcWarlord']);
});

test('the king is the player: a shot about the king shows the king, never Duchess, and nothing calls her a sovereign', () => {
  const kingly = /\b(king|majesty|sovereign|sire|crown)\b|that is you/i;
  for (const id of SCENE_ORDER) {
    const sc = SCENES[id];
    const goat = Object.entries(sc.cast).find(([, c]) => c.role === 'duchess')?.[0];
    for (const s of sc.shots) {
      const on = [s.cam.on ?? []].flat();
      const kingLines = (s.lines ?? []).filter((l) => kingly.test(l.text) && !/not the king/.test(l.text) && l.who !== 'king');
      // (a line about the king, said in a close shot on the goat, would read as if she were the king)
      if (goat && on.includes(goat)) assert.deepEqual(kingLines.filter((l) => !/\bsire\b/.test(l.text)), [], `${id}: a king line on Duchess`);
    }
    for (const t of linesOf(id)) assert.ok(!/sovereign goat|goat.*\b(is|was) the king\b|duchess.*\b(is|was) the king\b/i.test(t), `${id}: ${t}`);
  }
  // (the opening's shot of the king giving his orders shows the king, drawn from the Last Stand's king; the goat shares only the shot where she is named as Her Grace)
  const shot = SCENES.opening.shots.find((s) => s.lines?.some((l) => /from the rear/.test(l.text)))!;
  assert.ok([shot.cam.on].flat().includes('king'));
  assert.ok(!(shot.acts ?? []).some((a) => a.who === 'duchess'));
  assert.equal(SCENES.opening.cast.king.role, 'unit:standKing');
});

test('the Calamity’s scenes wait for it to open; the opening has no Calamity in it; the reveal comes when it opens', () => {
  const m = picked();
  const cal = SCENE_ORDER.filter((id) => SCENES[id].calamity);
  assert.deepEqual(cal, ['gorvak', 'calamityOpens', 'thornWarden', 'malphas', 'hrungar', 'vorgrath', 'karnok', 'calamityEnds', 'ascensionOne']);
  for (const id of cal) assert.equal(dueScene(m, SCENES[id].moment), null, `${id} waits for the Calamity`);
  for (const t of linesOf('opening')) assert.ok(!/calamity|herald|portal/i.test(t), t);
  assert.ok(!Object.values(SCENES.opening.cast).some((c) => c.role.startsWith('unit:calBoss')), 'no herald in the opening');
  // (opened by the stars, or held open by an old save)
  m.opened = ['calamity'];
  assert.equal(dueScene(m, { kind: 'calOpen' }), 'calamityOpens');
  for (const id of cal) assert.equal(dueScene(m, SCENES[id].moment), id);
  markSeen(m, 'calamityOpens');
  assert.equal(dueScene(m, { kind: 'calOpen' }), null, 'once');
  assert.ok(MODE_NEED.calamity > 0);
});

test('the Last Stand and the Calamity are told without towers: a breach, a throne room, a portal and the void', () => {
  const towerish = /\b(tower|towers|floor|floors|storey|storeys|stair|stairs|staircase|climb|climbed|spire|spiral|landing|landings)\b/i;
  const told = [...SCENE_ORDER.filter((id) => SCENES[id].calamity || id.startsWith('spire:') || id.startsWith('earned:'))];
  for (const id of told) for (const t of linesOf(id)) assert.ok(!towerish.test(t), `${id}: ${t}`);
  assert.deepEqual(['spire:10', 'spire:25', 'spire:50'].map((id) => SCENES[id].title), ['Wave 10: The Breach Widens', 'Wave 25: The Throne Room', 'Wave 50: The Last Stand']);
  for (const id of ['spire:10', 'spire:25', 'spire:50']) assert.ok(Object.values(SCENES[id].cast).some((c) => c.role === 'unit:standKing'), `${id}: the king is there`);
  assert.ok(linesOf('calamityOpens').some((t) => /portal/.test(t)) && linesOf('calamityOpens').some((t) => /void/.test(t)));
  assert.ok(linesOf('calamityEnds').some((t) => /portal/.test(t)));
});

test('no hero joins at the Last Stand’s waves now (an old save’s tower floors neither): the Dread Pirate and the Tyrant come by tales', () => {
  const m = picked(43);
  // (SECRET-HEROES and HERO-TALES-2: wave 20 brought the Dread Pirate and wave 40 the Tyrant; A Sellsword in Chains and The Second Throne do now)
  m.stand = 40;
  assert.deepEqual(grantContent(m), []);
  const old = picked(44);
  old.tower = 40;
  assert.deepEqual(grantContent(old), []);
});
