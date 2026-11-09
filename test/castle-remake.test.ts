// CASTLE-REMAKE (docs/notes/castle-remake.md): the courtyard's places, the plaques' words, and the wiring of the owner's paintings by name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BUILDING_IDS, ROOM_BUILDING_IDS, siteTop, type SiteId } from '../src/sim/castle';
import { CASTLE_ART_NAMES, KEEP_SPOT, PLOTS, castleArtUrl, isPainted, plaqueState } from '../src/castleArt';
import { SCENE_ART, SCENE_LIFE } from '../src/render/ambientScenes';

test('every castle site has exactly one plot on the courtyard, inside the painting, none on another', () => {
  const sites: SiteId[] = [...BUILDING_IDS, ...ROOM_BUILDING_IDS, 'chapel'];
  assert.deepEqual(PLOTS.map((p) => p.id).sort(), [...sites].sort());
  for (const p of PLOTS) {
    assert.ok(p.x - p.w / 2 >= 0 && p.x + p.w / 2 <= 1, `${p.id} is across the painting`);
    assert.ok(p.y > KEEP_SPOT.y + KEEP_SPOT.h / 2 - 0.05 && p.y < 0.85, `${p.id} stands between the keep and the gate`);
  }
  for (const a of PLOTS) for (const b of PLOTS) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= 0.25 || Math.abs(a.y - b.y) >= 0.15, `${a.id} and ${b.id} are apart`);
  // (drawn back to front: the nearer buildings over the farther)
  for (let i = 1; i < PLOTS.length; i++) assert.ok(PLOTS[i].y >= PLOTS[i - 1].y);
});

test('the prompt asks for a plot at every point the page lays a building on', () => {
  const prompt = readFileSync('docs/notes/castle-remake-art-prompts.md', 'utf8');
  for (const p of PLOTS) assert.ok(prompt.includes(`(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`), `${p.id}'s plot (${p.x}, ${p.y}) is in the prompt`);
  for (const f of ['courtyard.png', 'buildings-a.png', 'buildings-b.png', 'throne-hall.png']) assert.ok(prompt.includes(`art-source/castle-remake/${f}`));
});

test('the paintings are wired by name: the cutter names only known pictures, the stand-ins and the manifest are there, the build serves them', () => {
  const cut = readFileSync('tools/castle-remake/cut.py', 'utf8');
  const named = [...cut.matchAll(/'([A-Za-z-]+)'/g)].map((m) => m[1]).filter((n) => (CASTLE_ART_NAMES as readonly string[]).includes(n));
  assert.deepEqual([...new Set(named)].sort(), [...CASTLE_ART_NAMES].sort(), 'the cutter writes every picture the page names');
  for (const n of ['courtyard', 'throne-hall'] as const) assert.ok(existsSync(`src/art/castle-remake/${n}.webp`), `${n} has a file (a stand-in at least)`);
  const manifest = JSON.parse(readFileSync('src/art/castle-remake/manifest.json', 'utf8')) as { painted: string[] };
  for (const n of manifest.painted) {
    assert.ok((CASTLE_ART_NAMES as readonly string[]).includes(n), `${n} is a known picture`);
    assert.ok(existsSync(`src/art/castle-remake/${n}.webp`), `${n}'s painting is there`);
  }
  for (const n of CASTLE_ART_NAMES) assert.equal(isPainted(n), manifest.painted.includes(n));
  assert.equal(castleArtUrl('treasury'), 'ui/castle/treasury.webp');
  const build = readFileSync('build.mjs', 'utf8');
  assert.ok(build.includes("readdirSync('src/art/castle-remake')") && build.includes('UI_FILES.push(`ui/castle/${f}`)'), 'copied and cached for offline');
  assert.equal(SCENE_ART.courtyard, 'src/art/castle-remake/courtyard.webp');
  assert.ok(SCENE_LIFE.courtyard.lights.length > 0 && SCENE_LIFE.courtyard.regions.length > 0, 'the courtyard lives');
});

test('a plaque says what the place is doing', () => {
  assert.deepEqual(plaqueState(0, 5, 60, 100, false, false, ''), { line: 'Build · 60', ready: true, site: true, working: false, full: false });
  assert.equal(plaqueState(0, 5, 60, 10, false, false, '').ready, false, 'too dear');
  assert.equal(plaqueState(2, 5, 200, 999, false, true, '').ready, false, 'the builders are elsewhere');
  assert.equal(plaqueState(2, 5, 200, 999, false, false, '').line, 'Lv 2/5 · ▲');
  assert.equal(plaqueState(2, 5, 200, 10, false, false, '').line, 'Lv 2/5');
  assert.deepEqual(plaqueState(3, 5, 320, 999, true, false, '4:05'), { line: '4:05', ready: false, site: true, working: true, full: false });
  assert.equal(plaqueState(siteTop('treasury'), 5, null, 999, false, false, '').line, 'Lv 5 · Full');
});
