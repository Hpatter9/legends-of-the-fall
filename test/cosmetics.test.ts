import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DUCHESS_COSMETICS, hasOverlay, OVERLAY_COSTUMES, PAID_COSTUMES, wornCostume } from '../src/render/duchessRules';
import { entitledHere, OWNED_KEY, ownedFrom, PRODUCTS, productById } from '../src/iapRules';

// (a stand-in for the page's storage: what the store last said is owned, under OWNED_KEY)
const own = (ents: string[]): void => {
  const data: Record<string, string> = { [OWNED_KEY]: JSON.stringify(ownedFrom(ents)) };
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};
const none = (): void => void delete (globalThis as { localStorage?: unknown }).localStorage;

/** A PNG's width and height, read from its header. */
const size = (path: string): [number, number] => {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

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

test('the Shop sells each costume, the wardrobe and Starfall against the very entitlements the game reads', () => {
  const ents = new Set(DUCHESS_COSMETICS.flatMap((c) => (c.entitlement ? [c.entitlement] : [])));
  for (const id of ['look_duchess_regalia', 'look_duchess_knight', 'look_duchess_lantern']) {
    const p = productById(id)!;
    assert.ok(p.ready, id);
    assert.equal(p.entitlements!.length, 1);
    assert.ok(ents.has(p.entitlements![0]), id);
  }
  assert.deepEqual([...productById('bundle_wardrobe')!.entitlements!].sort(), [...ents].sort());
  assert.deepEqual(productById('look_starfall')!.entitlements, ['starfall_summons']);
  assert.match(readFileSync('src/starfall.ts', 'utf8'), /STARFALL_ENTITLEMENT = 'starfall_summons'/);
  // (nothing sold changes a stat: a cosmetic gives no stones, crowns or tomes)
  for (const p of PRODUCTS.filter((x) => x.kind === 'cosmetic')) assert.ok(!p.stones && !p.crowns && !p.tomes, p.id);
  // (the rulers wait for their art)
  assert.equal(productById('ruler_ember')!.ready, false);
  assert.equal(productById('ruler_starlit')!.ready, false);
});

test('the costume overlays are on her sheets’ own grids', () => {
  // (her walking strip: 48 px frames; a row a costume, a column a facing)
  assert.deepEqual(size('src/art/duchess/costumes-walk.png'), [96, 48 * OVERLAY_COSTUMES.length]);
  // (her battle sheet: the whole sheet again for each costume)
  const [w, h] = size('src/art/units/duchess_goat.png');
  assert.deepEqual(size('src/art/duchess/costumes-battle.png'), [w, h * OVERLAY_COSTUMES.length]);
  // (the tool's rows are the game's, in the same order)
  assert.match(readFileSync('tools/cosmetics/costumes.py', 'utf8'), new RegExp(`COSTUMES = \\[${OVERLAY_COSTUMES.map((c) => `'${c}'`).join(', ')}\\]`));
  assert.ok(hasOverlay('lantern') && !hasOverlay('crown'));
  for (const c of PAID_COSTUMES) assert.ok(hasOverlay(c), c);
});

test('costumes are looks only: nothing in the fight reads them', () => {
  const battle = readFileSync('src/sim/battle.ts', 'utf8') + readFileSync('src/sim/duchessFight.ts', 'utf8');
  assert.ok(!/duchessHat|costume|starfall/i.test(battle));
});
