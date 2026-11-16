// CC0-SOUNDS: downloads every pack `sources.mjs` names from OpenGameArt into out/cc0-sounds/cache/<pack>/ and unpacks it (zip with
// `unzip`, 7z with `7z` or Python's py7zr). A pack already there is left alone. Nothing here ships; render.mjs reads the cache.
//
//   node tools/cc0-sounds/fetch.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { FILES_AT, PACKS } from './sources.mjs';

export const CACHE = 'out/cc0-sounds/cache';

/** The single file of a pack that is one sound (not an archive), where render.mjs finds it. */
export const singleOf = (key) => `${CACHE}/${key}/${decodeURIComponent(PACKS[key].file)}`;

function unpack(archive, into) {
  if (archive.endsWith('.zip')) return execFileSync('unzip', ['-qq', '-o', archive, '-d', into]);
  try {
    execFileSync('7z', ['x', '-y', `-o${into}`, archive], { stdio: 'ignore' });
  } catch {
    execFileSync('python3', ['-I', '-c', 'import py7zr,sys;py7zr.SevenZipFile(sys.argv[1]).extractall(sys.argv[2])', archive, into]);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [key, p] of Object.entries(PACKS)) {
    const dir = `${CACHE}/${key}`;
    const name = decodeURIComponent(p.file);
    if (existsSync(`${dir}/.done`)) continue;
    mkdirSync(dir, { recursive: true });
    const res = await fetch(FILES_AT + p.file);
    if (!res.ok) throw new Error(`${key}: ${res.status} for ${p.file}`);
    writeFileSync(`${dir}/${name}`, Buffer.from(await res.arrayBuffer()));
    if (/\.(zip|7z)$/.test(name)) unpack(`${dir}/${name}`, dir);
    writeFileSync(`${dir}/.done`, '');
    console.log(`${key}: ${name}`);
  }
}
