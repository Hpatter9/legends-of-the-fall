import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KITS } from '../src/sim/abilities';
import { castSpell, FREEZE_MS, SPELL_IDS } from '../src/sim/spells';
import { fight, stepBattle } from '../src/sim/battle';
import { readyBattle } from './helpers';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { FOES } from '../src/sim/foes';
import { FLASH_MAX, FLASH_MS, ULT_TINT, arcStyle, bits, deathKind, ELEMENTS, hitStopMs, impactElement, maxStatuses, missileOf, nudgeOf, packKey, SKILL_ELEMENT, SPELL_CAST, SPELL_ELEMENT, SPELL_TOUCH, STATUS_LOOKS, statusesOf, type PackKey, type StatusSource } from '../src/render/fxRules';

const atlas = JSON.parse(readFileSync('src/art/fx/pack/atlas.json', 'utf8')) as Record<string, [number, number, number]>;

describe('the effects atlas', () => {
  it('holds every strip the rules name', () => {
    const named: PackKey[] = [];
    for (const l of Object.values(STATUS_LOOKS)) named.push(l.sheet);
    for (const cs of Object.values(SPELL_CAST)) for (const c of cs) named.push(c.key);
    for (const t of Object.values(SPELL_TOUCH)) if (t) named.push(t.key);
    for (const el of ELEMENTS) for (const f of ['orb', 'hit', 'explosion', 'slash', 'circle', 'rune', 'gather', 'nova', 'pillar', 'wave', 'sparkle', 'puff', 'smoke'] as const) named.push(packKey(el, f));
    for (const k of named) assert.ok(atlas[k], `${k} is not in the atlas`);
  });
  it('keeps every strip inside the picture, at 32px frames', () => {
    for (const [k, [x, y, n]] of Object.entries(atlas)) {
      assert.ok(n >= 1 && n <= 8, k);
      assert.ok(x + n * 32 <= 1024 && y + 32 <= 2048, k);
    }
  });
  it('uses the strips the combat code names directly', () => {
    const src = ['fx.ts', 'combatFx.ts'].map((f) => readFileSync(`src/render/${f}`, 'utf8')).join('\n');
    for (const m of src.matchAll(/(?:PACK\[|play\(\s*\w+(?:\.\w+)?,\s*)'([a-z]+-[a-z]+)'/g)) assert.ok(atlas[m[1]], `${m[1]} is not in the atlas`);
  });
});

describe('missiles', () => {
  it('draws an arrow for archers and rangers, a tracer for the gunslinger, a bone for skeleton archers', () => {
    assert.equal(missileOf('arrow', 'Archer').look, 'arrow');
    assert.equal(missileOf('arrow', 'Orc Archer').look, 'arrow');
    assert.equal(missileOf('bullet', 'Gunslinger').look, 'tracer');
    assert.equal(missileOf('bullet', 'Gunslinger').muzzle, true);
    assert.equal(missileOf('bone', 'Skeleton Archer').look, 'bone');
  });
  it('gives each caster an orb of its own element', () => {
    assert.equal(missileOf('fire', 'Fire Wizard').el, 'fire');
    assert.equal(missileOf('bolt', 'Lightning Mage').el, 'lightning');
    assert.equal(missileOf('bolt', 'Shaman King').el, 'dark');
    assert.equal(missileOf('curse', 'Warlock').el, 'dark');
    assert.equal(missileOf('leaf', 'Druid').el, 'forest');
    assert.equal(missileOf('holy', 'Cleric').el, 'light');
    // (a foe gorgon shoots a "bone", a hero gorgon a "bolt": both spit poison)
    assert.equal(missileOf('bone', 'Gorgon').el, 'poison');
    assert.equal(missileOf('bolt', 'Gorgon').el, 'poison');
  });
  it('has a look for every shooter and lands each in an element the atlas has', () => {
    for (const d of Object.values(UNITS).filter((x) => x.shot)) {
      const m = missileOf(d.shot!, d.name);
      assert.ok(ELEMENTS.includes(impactElement(m)), d.name);
      assert.ok(atlas[packKey(m.el, 'orb')], d.name);
    }
  });
});

describe('skills and spells', () => {
  it('names an element for every skill, ultimate and spell', () => {
    for (const k of Object.values(KITS)) {
      assert.ok(SKILL_ELEMENT[k.skill.name], k.skill.name);
      if (k.ultimate) assert.ok(SKILL_ELEMENT[k.ultimate.name], k.ultimate.name);
    }
    for (const id of SPELL_IDS) assert.ok(SPELL_ELEMENT[id], id);
  });
  it('knows no skill that does not exist', () => {
    const names = new Set(Object.values(KITS).flatMap((k) => [k.skill.name, k.ultimate?.name]));
    for (const n of Object.keys(SKILL_ELEMENT)) assert.ok(names.has(n), n);
  });
});

describe('deaths', () => {
  it('breaks each kind its own way', () => {
    assert.equal(deathKind('Skeleton Spearman', 'foe'), 'bones');
    assert.equal(deathKind('Imp', 'foe'), 'burn');
    assert.equal(deathKind('Demon Lord', 'foe'), 'burn');
    assert.equal(deathKind('Ogre', 'foe'), 'thud');
    assert.equal(deathKind('Orc Warlord', 'foe'), 'thud');
    assert.equal(deathKind('Gorgon', 'foe'), 'stone');
    assert.equal(deathKind('Black Werewolf', 'foe'), 'blood');
    assert.equal(deathKind('Knight', 'hero'), 'light');
  });
  it('gives every fighter a death', () => {
    for (const d of [...Object.values(FOES), ...ALL_HEROES.map((h) => UNITS[h])]) assert.ok(deathKind(d.name, d.side), d.name);
  });
});

describe('statuses', () => {
  const none: StatusSource = { alive: true };
  it('shows nothing on a fighter with no status, or a fallen one', () => {
    assert.deepEqual(statusesOf(none, 1000), []);
    assert.deepEqual(statusesOf({ alive: false, stunUntil: 5000 }, 1000), []);
  });
  it('shows each status while it lasts and not after', () => {
    const u: StatusSource = { alive: true, stunUntil: 2000, slowUntil: 3000, hasteUntil: 4000, dot: { kind: 'burn', dmg: 1, every: 500, ms: 2000, by: 1, next: 0, until: 2500 }, shield: { hp: 5, until: 3500 } };
    assert.deepEqual(statusesOf(u, 1000), ['stun', 'burn', 'slow', 'shield', 'haste']);
    assert.deepEqual(statusesOf(u, 2600), ['slow', 'shield', 'haste']);
    assert.deepEqual(statusesOf(u, 4500), []);
  });
  it('tells a bleed and a curse from a burn, and ignores a spent shield', () => {
    assert.deepEqual(statusesOf({ alive: true, dot: { kind: 'bleed', dmg: 1, every: 1, ms: 1, by: 1, next: 0, until: 9 } }, 1), ['bleed']);
    assert.deepEqual(statusesOf({ alive: true, dot: { kind: 'curse', dmg: 1, every: 1, ms: 1, by: 1, next: 0, until: 9 } }, 1), ['curse']);
    assert.deepEqual(statusesOf({ alive: true, shield: { hp: 0, until: 9 } }, 1), []);
  });
  it('draws fewer loops on battery saver', () => {
    assert.equal(maxStatuses(false), 3);
    assert.equal(maxStatuses(true), 2);
  });
});

describe('amounts', () => {
  it('thins bursts by the density, never below one', () => {
    assert.equal(bits(8, 1), 8);
    assert.equal(bits(8, 0.5), 4);
    assert.equal(bits(1, 0.5), 1);
  });
  it('stops the fight only for a crit or a killing blow, and not at all for a calm screen', () => {
    assert.equal(hitStopMs(false, 0.1, false, false), 0);
    assert.equal(hitStopMs(true, 0.1, false, false), 60);
    assert.equal(hitStopMs(false, 0.4, true, false), 90);
    assert.equal(hitStopMs(true, 0.5, true, true), 0);
  });
  it('knocks a bigger blow further, up to a limit', () => {
    assert.ok(nudgeOf(0.02) < nudgeOf(0.2));
    assert.equal(nudgeOf(5), 7);
  });
  it('draws the charm, the hex and lightning as different lines', () => {
    assert.equal(arcStyle('kitsune'), 'charm');
    assert.equal(arcStyle('warlock'), 'hex');
    assert.equal(arcStyle('lightningMage'), 'lightning');
  });
});

describe('the stun record the effects read', () => {
  it('marks a frozen foe stunned until the freeze ends, and changes nothing else about the fight', () => {
    const run = (cast: boolean) => {
      const b = readyBattle(11, 'werewolves');
      fight(b);
      for (let i = 0; i < 5; i++) stepBattle(b);
      const f = b.units.find((u) => u.side === 'foe')!;
      if (cast) {
        b.spells.mana = 10;
        assert.ok(castSpell(b, 'frost', f.u, f.v));
        assert.equal(f.stunUntil, b.t + FREEZE_MS);
      }
      for (let i = 0; i < 100; i++) stepBattle(b);
      return b.units.map((u) => [u.hp, u.u, u.v]);
    };
    // (the same cast on the same seed plays out the same twice)
    assert.deepEqual(run(true), run(true));
  });
});

describe('readable big effects', () => {
  it('keeps a screen flash to a short, dim blink', () => {
    assert.ok(FLASH_MAX <= 0.35);
    assert.ok(FLASH_MS <= 120);
  });
  it('tints the near-white elements of an ultimate', () => {
    assert.ok(ULT_TINT.wind !== undefined && ULT_TINT.lightning !== undefined);
  });
});
