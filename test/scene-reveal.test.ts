import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, SCENE_ORDER } from '../src/sim/sceneScripts';
import { revealCard, revealOf } from '../src/sim/sceneReveal';
import { newMeta, type Meta } from '../src/sim/meta';
import { ARMIES } from '../src/sim/armies';
import { ALL_HEROES } from '../src/sim/units';
import { EIDOLON_IDS } from '../src/sim/eidolons';

const fresh = (): Meta => newMeta(7);

test('the Calamity opening ends on its card once the Calamity is open, and not before', () => {
  const m = fresh();
  assert.equal(revealOf('calamityOpens', m), null);
  m.opened = ['calamity'];
  const c = revealOf('calamityOpens', m)!;
  assert.equal(c.label, 'Unlocked');
  assert.equal(c.name, 'The Calamity');
  assert.match(c.where, /Battle tab/);
  assert.deepEqual(c.go?.to, { to: 'calamity' });
  assert.equal(c.art.kind, 'portal');
});

test("an army's last-stand film reveals the army it opens, only when the save has it open", () => {
  const m = fresh();
  assert.equal(revealOf(`clear:${ARMIES[0].id}`, m), null);
  m.opened = [ARMIES[1].id];
  const c = revealOf(`clear:${ARMIES[0].id}`, m)!;
  assert.equal(c.key, `army:${ARMIES[1].id}`);
  assert.equal(c.name, ARMIES[1].name);
  assert.deepEqual(c.go?.to, { to: 'armies', army: ARMIES[1].id });
  // (the last army opens none)
  assert.equal(revealOf(`clear:${ARMIES[ARMIES.length - 1].id}`, { ...m, opened: ARMIES.map((a) => a.id) }), null);
});

test("the Calamity's end reveals Ascension after a first clear", () => {
  const m = fresh();
  assert.equal(revealOf('calamityEnds', m), null);
  (m as { calamity?: unknown }).calamity = { clears: 1, best: 6 };
  const c = revealOf('calamityEnds', m)!;
  assert.equal(c.name, 'Ascension 1');
  assert.match(c.line, /crowns x1\.2/);
});

test('a castle film reveals its building once raised; the chapel reveals the spellbook', () => {
  const m = fresh();
  assert.equal(revealOf('castle:treasury', m), null);
  m.castle.treasury = 1;
  const t = revealOf('castle:treasury', m)!;
  assert.equal(t.label, 'Built');
  assert.match(t.line, /\+10 gold/);
  assert.deepEqual(t.go?.to, { to: 'castle' });
  assert.equal(revealOf('castle:chapel', m), null);
  m.chapel = true;
  const ch = revealOf('castle:chapel', m)!;
  assert.equal(ch.name, 'The Spellbook');
  assert.deepEqual(ch.go?.to, { to: 'spells' });
});

test("an awakening film reveals the hero's passive, with no button (the awakening panel is already open)", () => {
  const kind = ALL_HEROES[0];
  const m = fresh();
  assert.equal(revealOf(`awaken:${kind}`, m), null);
  m.awakened = { [kind]: 1 };
  const c = revealOf(`awaken:${kind}`, m)!;
  assert.equal(c.label, 'Awakened');
  assert.deepEqual(c.art, { kind: 'hero', hero: kind, step: 1 });
  assert.equal(c.go, undefined);
});

test('an Eidolon reveal (for the quest chains) shows only once it is bound', () => {
  const id = EIDOLON_IDS[0];
  const m = fresh();
  assert.equal(revealCard({ kind: 'eidolon', id }, m), null);
  m.eidolons = { horn: 0, bound: [id] };
  assert.equal(revealCard({ kind: 'eidolon', id }, m)?.label, 'Bound');
});

test('films that reveal nothing end as before; every reveal names a known thing', () => {
  const m = fresh();
  for (const id of ['opening', 'gorvak', 'firstLoss', 'elite', 'mythic', `intro:${ARMIES[0].id}`]) if (SCENES[id]) assert.equal(revealOf(id, m), null, id);
  // (a save with everything open: every film that names a reveal gives a full card)
  const all = fresh();
  all.opened = ['calamity', ...ARMIES.map((a) => a.id)];
  (all as { calamity?: unknown }).calamity = { clears: 1, best: 6 };
  for (const k of Object.keys(all.castle)) (all.castle as Record<string, number>)[k] = 1;
  all.chapel = true;
  all.awakened = Object.fromEntries(ALL_HEROES.map((k) => [k, 1]));
  let n = 0;
  for (const id of SCENE_ORDER) {
    const s = SCENES[id];
    if (!s.reveal) continue;
    if (s.reveal.kind === 'nextArmy' && s.reveal.after === ARMIES[ARMIES.length - 1].id) continue;
    const c = revealOf(id, all);
    assert.ok(c, id);
    assert.ok(c.name && c.line && c.where, id);
    n++;
  }
  assert.ok(n >= 20, `${n} films reveal something`);
});
