// Draws every scene's masks, lights and boxes over its painting, to check they sit where they should:
//   node tools/alive/masks.mjs <out dir>      (pictures named <scene>.png)
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'out/alive-masks';
mkdirSync(out, { recursive: true });
const r = await esbuild.build({ entryPoints: ['src/render/ambientScenes.ts'], bundle: true, write: false, format: 'cjs', platform: 'node' });
const mod = { exports: {} };
new Function('module', 'exports', r.outputFiles[0].text)(mod, mod.exports);
const { SCENE_LIFE, SCENE_ART } = mod.exports;
writeFileSync(`${out}/scenes.json`, JSON.stringify({ life: SCENE_LIFE, art: SCENE_ART }));
execFileSync('python3', ['tools/alive/masks.py', `${out}/scenes.json`, out], { stdio: 'inherit' });
