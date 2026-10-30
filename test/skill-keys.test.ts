// RPG-SPELLS batch 0 (docs/notes/spells-b01.md): every skill has a fixed key that its look, element and `skill` event go by, so a
// later batch can rename a hero's skill without breaking any of them; and foes that borrow a hero's skill have their own copy of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARGE_MAX, KITS, keyOf, type Skill } from '../src/sim/abilities';
import { HERO_KITS, skillShown } from '../src/sim/heroKits';
import { ALL_HEROES } from '../src/sim/units';
import { kitSignature } from '../src/render/kitLooks';
import { SKILL_ELEMENT } from '../src/render/fxRules';
import { kitElement } from '../src/render/kitLooks';
import { fight, place, startBattle, stepBattle, type BattleEvent } from '../src/sim/battle';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';

const heroSkills = (kind: string): Skill[] => {
  const hk = HERO_KITS()[kind];
  return [hk.s1.skill, hk.s2.skill, KITS[kind].ultimate!];
};

test('a skill with no key of its own is keyed by its name; a renamed skill keeps its old key (RPG-SPELLS batch 2: the healers)', () => {
  for (const kind of ALL_HEROES) for (const s of heroSkills(kind)) assert.equal(keyOf(s), s.key ?? s.name, `${kind}: ${s.name}`);
  const keyed = (kind: string) => heroSkills(kind).map((s) => `${s.name}=${keyOf(s)}`);
  assert.deepEqual(keyed('cleric'), ['Guiding Bolt=Smite', 'Prayer of Healing=Benediction', 'Spirit Guardians=Divine Intervention']);
  assert.deepEqual(keyed('priestess'), ['Cure Wounds=Holy Light', 'Death Ward=Guardian Angel', 'Mass Resurrection=Resurrection']);
  assert.deepEqual(keyed('wanderer'), ['Healing Draught=Flask Toss', 'Healing Mist=Sanctuary', 'Panacea=Dawn Light']);
  assert.deepEqual(keyed('druid'), ['Conjure Treant=Call Treant', 'Wild Shape=Treeform', 'Wall of Thorns=Heart of the Grove']);
});

test("every hero's two skills and ultimate find a look and an element by their key", () => {
  for (const kind of ALL_HEROES)
    for (const s of heroSkills(kind)) {
      const key = keyOf(s);
      assert.ok(kitSignature(key), `${kind}: ${key} has a look`);
      assert.ok(SKILL_ELEMENT[key] ?? kitElement(key), `${kind}: ${key} has an element`);
    }
});

test("a foe that borrows a hero's skill or ultimate has its own copy, with the same key and cast", () => {
  const hero = new Set<Skill>(ALL_HEROES.flatMap((k) => [KITS[k].skill, KITS[k].ultimate!]));
  const heroes = new Set(ALL_HEROES);
  let borrowed = 0;
  for (const [id, k] of Object.entries(KITS)) {
    if (heroes.has(id)) continue;
    assert.ok(!hero.has(k.skill), `${id}'s skill is its own object`);
    if (k.ultimate) assert.ok(!hero.has(k.ultimate), `${id}'s ultimate is its own object`);
    const from = ALL_HEROES.find((h) => KITS[h].skill.cast === k.skill.cast && keyOf(KITS[h].skill) === keyOf(k.skill));
    if (from) borrowed++;
  }
  assert.ok(borrowed >= 10, `the borrowed skills keep their hero's key and cast (${borrowed})`);
});

test("a renamed skill keeps its key: its event carries the key, and the words shown are the caster's own name for it", () => {
  const b = startBattle(5, 'skeletons');
  for (let v = b.board.d - DEPLOY_ROWS, done = false; v < b.board.d && !done; v++)
    for (let u = 0; u < b.board.w && !done; u++) if (standable(tileAt(b.board, u, v))) done = place(b, 'wizard', u, v);
  const me = b.units.find((u) => u.def === 'wizard')!;
  const old = KITS.wizard.skill;
  me.kit = { ...KITS.wizard, skill: { ...old, key: keyOf(old), name: 'Fireball' } };
  assert.equal(skillShown(me, 'Meteor'), 'Fireball');
  assert.equal(skillShown(me, 'Something Else'), 'Something Else');
  fight(b);
  me.charge = CHARGE_MAX;
  const seen: BattleEvent[] = [];
  for (let i = 0; i < 400 && b.phase === 'fight'; i++) seen.push(...stepBattle(b));
  const cast = seen.find((e) => e.kind === 'skill' && e.by === me.id);
  assert.ok(cast && cast.kind === 'skill', 'the wizard cast its skill');
  if (cast?.kind === 'skill') assert.equal(cast.name, 'Meteor');
});
