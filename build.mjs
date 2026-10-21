// Builds the phone version into out/web: the game bundle, the page, the app's manifest and icons, and a service
// worker so it plays offline once loaded (what GitHub Pages serves).
//
//   npm run web     build once
//   npm run dev     build, then serve out/web and rebuild on every change (http://localhost:8000)
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const serve = process.argv.includes('--serve');
const out = 'out/web';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
let commit = 'dev';
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a checkout */
}
const version = `${pkg.version} · ${commit}`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const options = {
  entryPoints: ['src/main.ts'],
  outfile: `${out}/game.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: !serve,
  sourcemap: true,
  logLevel: 'warning',
  loader: { '.png': 'dataurl' },
  define: { __GAME_VERSION__: JSON.stringify(version) },
};

copyFileSync('src/art/icon-192.png', `${out}/icon-192.png`);
copyFileSync('src/art/icon-512.png', `${out}/icon-512.png`);
for (let k = 1; k <= 5; k++) copyFileSync(`src/art/backdrop/m1_${k}.png`, `${out}/bg${k}.png`);
// (the music: played as files, so the service worker keeps them for offline too)
const AUDIO = ['town.ogg', 'battle.ogg', 'boss.ogg'];
for (const f of AUDIO) copyFileSync(`src/audio/${f}`, `${out}/${f}`);
writeFileSync(`${out}/index.html`, readFileSync('src/index.html', 'utf8').replace('__VERSION__', version));
writeFileSync(
  `${out}/manifest.webmanifest`,
  JSON.stringify(
    {
      name: pkg.productName,
      short_name: 'Legends',
      start_url: '.',
      display: 'standalone',
      orientation: 'any',
      background_color: '#1c1410',
      theme_color: '#3a2218',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  ),
);
// (network first, so a new version shows as soon as it's online; the cache only when offline)
writeFileSync(
  `${out}/sw.js`,
  `const CACHE = 'legends-${version}';
const FILES = ['.', 'index.html', 'game.js', 'bg1.png', 'bg2.png', 'bg3.png', 'bg4.png', 'bg5.png', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', ${AUDIO.map((f) => `'${f}'`).join(', ')}];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
`,
);

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: out, port: 8000 });
  console.log(`Serving ${out} at http://localhost:${port}`);
} else {
  await esbuild.build(options);
  console.log(`Built ${out} (version ${version})`);
}
