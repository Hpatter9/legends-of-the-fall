// RPG-SPELLS painted effects (docs/notes/spell-art.md): the manifest the importer reads (tools/spell-fx/spell-parts.json), the
// atlases it packs (src/art/fx/spells/), and the toolkit's painted looks. Every manifest entry of a painted session names a real
// sheet with its rows, every packed part is one the manifest lists, the atlases are there and within the 5 MB cap, and the service
// worker keeps them for offline play.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { MOVE_LOOKS, PAINT, WALL_LOOKS, auraLook } from '../src/render/toolkitLooks';
import { SPELL_SESSIONS, footed, spellAnchorY, spellKeys, spellPart, spellScale } from '../src/render/spellLooks';
import { TW } from '../src/render/iso';
import { AREA_PAINT, MOVE_PAINT, movePaintParts } from '../src/render/movePaints';

type Row = [string, 'once' | 'loop', number, number, number];
const manifest = JSON.parse(readFileSync('tools/spell-fx/spell-parts.json', 'utf8')) as Record<string, unknown>;
const SRC_CELL = manifest.cell as number;
const sessions = Object.fromEntries(Object.entries(manifest).filter(([k]) => k !== '_' && k !== 'cell')) as Record<string, Record<string, Row[]>>;
const PARTS = new Set(['cast', 'travel', 'beam', 'impact', 'ground', 'rise', 'stand', 'break', 'motes', 'trail']);
const rowsOf = (key: string): Row[] | undefined => Object.values(sessions).find((s) => key in s)?.[key];
const inManifest = (partKey: string): boolean => {
  const dot = partKey.lastIndexOf('.');
  return !!rowsOf(partKey.slice(0, dot))?.some((r) => r[0] === partKey.slice(dot + 1));
};

/** A PNG's width and height, from its header. */
const pngSize = (path: string): [number, number] => {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
/** A WebP's canvas size, from its header (lossy, lossless or extended). */
const webpSize = (path: string): [number, number] => {
  const b = readFileSync(path);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
};

test('the manifest lists the brief: 131 sheets, 258 rows, each row a known part with a sane range and size', () => {
  let sheets = 0;
  let rows = 0;
  for (const keys of Object.values(sessions))
    for (const [key, rs] of Object.entries(keys)) {
      sheets++;
      rows += rs.length;
      assert.ok(rs.length >= 1, `${key} has rows`);
      assert.equal(new Set(rs.map((r) => r[0])).size, rs.length, `${key}: no part twice`);
      for (const [part, kind, lo, hi, size] of rs) {
        assert.ok(PARTS.has(part), `${key}.${part} is a part the brief knows`);
        assert.ok(kind === 'once' || kind === 'loop', `${key}.${part} plays once or loops`);
        assert.ok(lo >= 1 && lo <= hi && hi <= 8, `${key}.${part}: ${lo} to ${hi} frames`);
        assert.ok(size > 0 && size <= 8, `${key}.${part}: ${size} tiles`);
      }
    }
  assert.equal(sheets, 131);
  assert.equal(rows, 258);
  assert.equal(SRC_CELL, 256);
});

test('every manifest entry of a painted session names a real sheet with one 256 px row a part', () => {
  let painted = 0;
  for (const [session, keys] of Object.entries(sessions)) {
    if (!existsSync(`art-source/spell-fx/${session}`)) continue;
    painted++;
    for (const [key, rs] of Object.entries(keys)) {
      const path = `art-source/spell-fx/${session}/${key}.png`;
      assert.ok(existsSync(path), `${path} is there`);
      const [w, h] = pngSize(path);
      assert.equal(h, rs.length * SRC_CELL, `${key}: ${rs.length} rows of ${SRC_CELL} px`);
      assert.equal(w % SRC_CELL, 0, `${key}: whole cells across`);
    }
  }
  assert.ok(painted >= 2, 'sessions A and C are painted');
});

test('every packed part is in the manifest, within its frames, and laid out inside its atlas without overlaps', () => {
  for (const [session, m] of Object.entries(SPELL_SESSIONS)) {
    assert.ok(session in sessions, `${session} is a session`);
    const used = new Set<string>();
    for (const [key, [col, row, n, size, loop, foot]] of Object.entries(m.parts)) {
      assert.ok(inManifest(key), `${key} is in the manifest`);
      const r = rowsOf(key.slice(0, key.lastIndexOf('.')))!.find((x) => x[0] === key.slice(key.lastIndexOf('.') + 1))!;
      assert.ok(n >= r[2] && n <= r[3], `${key}: ${n} frames`);
      assert.equal(size, r[4], `${key}: its size`);
      assert.equal(loop === 1, r[1] === 'loop', `${key}: once or loop`);
      assert.ok(foot > 0 && foot <= 1, `${key}: its foot in the cell`);
      assert.ok(col + n <= 16, `${key}: not split across rows`);
      assert.ok((row + 1) * m.cell <= m.h && (col + n) * m.cell <= m.w, `${key}: inside the atlas`);
      for (let i = 0; i < n; i++) {
        const c = `${col + i},${row}`;
        assert.ok(!used.has(c), `${key}: cell ${c} is its own`);
        used.add(c);
      }
    }
  }
});

test('the atlases are there, the size the map says, and within the 5 MB cap', () => {
  let total = 0;
  assert.ok(Object.keys(SPELL_SESSIONS).length >= 2, 'sessions A and C are packed');
  for (const [session, m] of Object.entries(SPELL_SESSIONS)) {
    const path = `src/art/fx/spells/${session}.webp`;
    assert.ok(existsSync(path), `${path} is there`);
    assert.deepEqual(webpSize(path), [m.w, m.h], `${session}: its size`);
    assert.equal(statSync(path).size, m.bytes, `${session}: the map is of this atlas`);
    assert.equal(m.cell, 96);
    total += m.bytes;
  }
  assert.ok(total <= 5 * 1024 * 1024, `${total} bytes in all`);
});

test('the service worker keeps the atlases (they load by URL), and the page loads them from where the build puts them', () => {
  const build = readFileSync('build.mjs', 'utf8');
  assert.match(build, /copyFileSync\(`src\/art\/fx\/spells\/\$\{f\}`, `\$\{out\}\/fx\/spells\/\$\{f\}`\)/);
  assert.match(build.slice(build.indexOf('const FILES = ')), /SPELL_ART_FILES/);
  assert.match(readFileSync('src/render/spellArt.ts', 'utf8'), /`fx\/spells\/\$\{session\}\.webp`/);
});

test('every painted look the toolkit asks for is a part the manifest lists; session A covers the moves and the walls', () => {
  for (const key of [...Object.values(MOVE_LOOKS).map((l) => l.paint), ...Object.values(PAINT)]) {
    assert.ok(inManifest(key), `${key} is in the manifest`);
    assert.ok(spellPart(key), `${key} is painted (session A)`);
  }
  for (const look of Object.values(WALL_LOOKS)) {
    assert.ok(look.paint && inManifest(`${look.paint}.stand`), `${look.paint} stands`);
    assert.ok(spellPart(`${look.paint}.stand`), `${look.paint} is painted`);
  }
  for (const what of ['protection', 'rot', 'storm', 'mana font', 'mist', 'spirit guardians', 'daggers', 'slow', 'spikes', 'anthem', 'anything'])
    assert.ok(inManifest(`${auraLook(what).paint}.ground`), `${what}: its aura sheet has a ground`);
});

test('a painted part is drawn at its brief size, by its foot when it grows from the ground', () => {
  assert.ok(spellKeys().includes('revivify.impact'), 'session C is loaded by key');
  assert.equal(spellScale('launch.impact'), (1.6 * TW) / 96);
  assert.equal(spellScale('wall-stone.stand', 2), (1 * TW * 2) / 96);
  assert.ok(footed('wall-ice.rise') && footed('launch.impact') && footed('revivify.impact'));
  assert.ok(!footed('slam.impact') && !footed('pull.beam') && !footed('death-ward.stand'));
  assert.equal(spellAnchorY('slam.impact'), 0.5);
  assert.ok(spellAnchorY('wall-fire.stand') > 0.8);
  // (fireball.travel was the example until session D was painted; session F is not yet)
  assert.equal(spellPart('aimed-shot.travel'), undefined, 'an unpainted part is not there (its placeholder stays)');
});

test('sessions B, D and E: every part the moves ask for is in the manifest and painted, of the right kind', () => {
  for (const key of movePaintParts()) {
    assert.ok(inManifest(key), `${key} is in the manifest`);
    assert.ok(spellPart(key), `${key} is painted`);
  }
  for (const [name, m] of Object.entries(MOVE_PAINT)) {
    if (m.stand) assert.ok(spellPart(m.stand.part)!.loop, `${name}: its stand loops`);
    if (m.beam) assert.ok(m.beam.endsWith('.beam'), `${name}: its beam is a beam`);
    if (m.trail) assert.ok(m.trail.endsWith('.trail'), `${name}: its trail is a trail`);
  }
  for (const a of Object.values(AREA_PAINT)) assert.ok(a.travel.endsWith('.travel') && spellPart(a.travel)!.loop, `${a.travel} flies in a loop`);
  // (every aura the sim raises has a painted sheet; "Protection" is not the rot, and the circle of death is session D's)
  for (const what of ['Aura of Protection', 'Indomitable', 'Spirit Guardians', 'Healing Mist', 'storm cloud', 'circle of death', 'font of magic', 'contagion rot', 'cloud of daggers']) {
    const sheet = auraLook(what).paint;
    assert.ok(sheet && spellPart(`${sheet}.ground`), `${what}: painted (${sheet})`);
  }
  assert.equal(auraLook('Aura of Protection').paint, 'aura-protection');
  assert.equal(auraLook('contagion rot').paint, 'aura-rot');
  assert.equal(auraLook('circle of death').paint, 'circle-of-death');
  assert.ok(auraLook('storm cloud').hang);
  for (const s of ['b-auras', 'd-casters', 'e-moves']) assert.ok(SPELL_SESSIONS[s], `${s} is packed`);
});

test('the import fixes name real parts, keep within the brief, and no loop is packed from an empty frame', () => {
  const fixes = JSON.parse(readFileSync('tools/spell-fx/spell-fixes.json', 'utf8')) as Record<string, { frames?: number[] }>;
  for (const [key, fix] of Object.entries(fixes)) {
    if (key === '_') continue;
    const dot = key.lastIndexOf('.');
    const row = rowsOf(key.slice(0, dot))?.find((r) => r[0] === key.slice(dot + 1));
    assert.ok(row, `${key} is in the manifest`);
    assert.ok(fix.frames && fix.frames.length >= row![2] && fix.frames.length <= row![3], `${key}: ${fix.frames?.length} frames in range`);
    assert.equal(spellPart(key)?.frames, fix.frames!.length, `${key} is packed as fixed`);
  }
});
