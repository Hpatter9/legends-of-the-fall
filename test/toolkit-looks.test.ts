// The movement toolkit's placeholder looks (RPG-SPELLS batch 1, docs/notes/spells-b01.md): every wall, aura and move is drawn with
// a strip the Pixel Effects pack really has, so nothing shows up blank until the painted effects arrive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOVE_LOOKS, WALL_LOOKS, auraLook, type Look } from '../src/render/toolkitLooks';

const atlas = JSON.parse(readFileSync('src/art/fx/pack/atlas.json', 'utf8'));
const names = new Set(Object.keys(atlas.frames ?? atlas));

test('every wall, aura and move look names a strip the pack has', () => {
  const looks: Look[] = [...Object.values(WALL_LOOKS), ...Object.values(MOVE_LOOKS), ...['protection', 'rot', 'storm', 'mana font', 'mist', 'daggers', 'slow', 'circle of death', 'spikes', 'anything'].map(auraLook)];
  for (const l of looks) for (const k of [l.once, l.loop]) if (k) assert.ok(names.has(k), `${k} is in the pack`);
  for (const kind of ['stone', 'ice', 'thorns', 'light', 'fire', 'wind'] as const) assert.ok(WALL_LOOKS[kind].loop || WALL_LOOKS[kind].prop, `${kind} stands as something`);
});
