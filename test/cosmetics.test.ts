import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

/** A PNG's width and height, read from its header. */
const size = (path: string): [number, number] => {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
import { DRESSED, dressedOf, dressedTerrace, DUCHESS_COSMETICS, fullyDressed, PAID_COSTUMES, wornCostume } from '../src/render/duchessRules';
import { entitledHere, OWNED_KEY, ownedFrom, PRODUCTS, productById } from '../src/iapRules';

// (a stand-in for the page's storage: what the store last said is owned, under OWNED_KEY)
const own = (ents: string[]): void => {
  const data: Record<string, string> = { [OWNED_KEY]: JSON.stringify(ownedFrom(ents)) };
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};
const none = (): void => void delete (globalThis as { localStorage?: unknown }).localStorage;


test('each bought costume is owned by its entitlement alone, never by play', () => {
  for (const id of PAID_COSTUMES) {
    const c = DUCHESS_COSMETICS.find((x) => x.id === id)!;
    assert.ok(c.entitlement, id);
    none();
    assert.equal(c.unlocked({ duchessTaps: 999, duchessLucky: true, duchessHay: true }), false, id);
    own([c.entitlement!]);
    assert.equal(c.unlocked(), true, id);
  }
  // (the free ones keep their rules)
  none();
  assert.equal(DUCHESS_COSMETICS.find((c) => c.id === 'crown')!.unlocked({ duchessTaps: 5 }), true);
  assert.equal(DUCHESS_COSMETICS.find((c) => c.id === 'crown')!.entitlement, undefined);
});

test('a costume is worn only while it is hers: a refund takes it off by itself; none is always there', () => {
  own(['duchess_knight']);
  assert.equal(wornCostume('knight'), 'knight');
  assert.equal(wornCostume('regalia'), 'none');
  own([]);
  assert.equal(wornCostume('knight'), 'none');
  assert.equal(wornCostume('none'), 'none');
  // (the free ones as before: chosen is worn)
  assert.equal(wornCostume('wizard'), 'wizard');
  none();
  assert.equal(entitledHere('duchess_knight'), false);
  assert.ok(DUCHESS_COSMETICS.some((c) => c.id === 'none' && c.unlocked()));
});

test('the Shop sells Starfall; Duchess’s costumes and her wardrobe wait, Coming soon, for their redrawn sheets', () => {
  const ents = new Set(DUCHESS_COSMETICS.flatMap((c) => (c.entitlement ? [c.entitlement] : [])));
  for (const id of ['look_duchess_regalia', 'look_duchess_knight', 'look_duchess_lantern']) {
    const p = productById(id)!;
    assert.equal(p.entitlements!.length, 1);
    assert.ok(ents.has(p.entitlements![0]), id);
  }
  assert.deepEqual([...productById('bundle_wardrobe')!.entitlements!].sort(), [...ents].sort());
  // (a costume is sold only when every place she is drawn has its dressed sheet: the owner turned the cut-down overlays down)
  for (const c of PAID_COSTUMES) assert.equal(productById(`look_duchess_${c}`)!.ready, fullyDressed(c), c);
  assert.equal(productById('bundle_wardrobe')!.ready, PAID_COSTUMES.every(fullyDressed));
  assert.equal(productById('look_starfall')!.ready, true);
  assert.deepEqual(productById('look_starfall')!.entitlements, ['starfall_summons']);
  assert.match(readFileSync('src/starfall.ts', 'utf8'), /STARFALL_ENTITLEMENT = 'starfall_summons'/);
  // (nothing sold changes a stat: a cosmetic gives no stones, crowns or tomes)
  for (const p of PRODUCTS.filter((x) => x.kind === 'cosmetic')) assert.ok(!p.stones && !p.crowns && !p.tomes, p.id);
  // (the rulers wait for their art)
  assert.equal(productById('ruler_ember')!.ready, false);
  assert.equal(productById('ruler_starlit')!.ready, false);
});

test('a costume with no dressed sheet is drawn in her plain sheets: nothing is laid over her', () => {
  for (const c of PAID_COSTUMES) {
    assert.equal(dressedOf(c, 'walk'), DRESSED[c]?.walk);
    assert.equal(dressedOf(c, 'battle'), DRESSED[c]?.battle);
    if (!DRESSED[c]) {
      assert.equal(dressedOf(c, 'walk'), undefined);
      assert.equal(dressedTerrace(c), false);
    }
  }
  // (the free costumes have no dressed sheets: they are still drawn over her walking strip)
  assert.equal(dressedOf('crown', 'walk'), undefined);
  assert.equal(dressedOf('none', 'battle'), undefined);
  // (the cut-down overlays are gone from the game)
  assert.ok(!existsSync('src/art/duchess/costumes-walk.png') && !existsSync('src/art/duchess/costumes-battle.png'));
});

test('the Knight is whole dressed sheets on her own sheets\u2019 layouts, and is sold; the Regalia and the Lantern wait for theirs', () => {
  assert.ok(DRESSED.knight?.walk && DRESSED.knight?.battle);
  assert.deepEqual(size('src/art/duchess/duchess_knight_walk.png'), size('src/art/duchess/goat.png'));
  assert.deepEqual(size('src/art/duchess/duchess_knight.png'), size('src/art/units/duchess_goat.png'));
  assert.ok(fullyDressed('knight') && productById('look_duchess_knight')!.ready);
  for (const c of ['regalia', 'lantern'] as const) assert.ok(!fullyDressed(c) && !productById(`look_duchess_${c}`)!.ready, c);
  assert.equal(productById('bundle_wardrobe')!.ready, false);
});

test('costumes are looks only: nothing in the fight reads them', () => {
  const battle = readFileSync('src/sim/battle.ts', 'utf8') + readFileSync('src/sim/duchessFight.ts', 'utf8');
  assert.ok(!/duchessHat|costume|starfall/i.test(battle));
});
