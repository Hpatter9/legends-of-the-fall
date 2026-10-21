// Builds the phone version into out/web: the game bundle, the page, the app's manifest and icons, and a service
// worker so it plays offline once loaded (what GitHub Pages serves).
//
//   npm run web     build once
//   npm run dev     build, then serve out/web and rebuild on every change (http://localhost:8000)
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
// (the other areas' backdrops, as files too: areas/<area>/bgN.png)
const AREA_BGS = [];
for (const area of readdirSync('src/art/areas', { withFileTypes: true }).filter((d) => d.isDirectory())) {
  mkdirSync(`${out}/areas/${area.name}`, { recursive: true });
  for (const f of readdirSync(`src/art/areas/${area.name}`).filter((f) => /^bg\d\.png$/.test(f))) {
    copyFileSync(`src/art/areas/${area.name}/${f}`, `${out}/areas/${area.name}/${f}`);
    AREA_BGS.push(`areas/${area.name}/${f}`);
  }
}
// (the fonts, from @fontsource: files too, so the service worker keeps them for offline)
const FONTS = [
  ['cinzel-decorative', 'cinzel-decorative-latin-700-normal.woff2'],
  ['cinzel-decorative', 'cinzel-decorative-latin-900-normal.woff2'],
  ['alegreya-sans', 'alegreya-sans-latin-400-normal.woff2'],
  ['alegreya-sans', 'alegreya-sans-latin-700-normal.woff2'],
  ['press-start-2p', 'press-start-2p-latin-400-normal.woff2'],
];
mkdirSync(`${out}/fonts`, { recursive: true });
for (const [pkgName, f] of FONTS) copyFileSync(`node_modules/@fontsource/${pkgName}/files/${f}`, `${out}/fonts/${f}`);
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
const FILES = ['.', 'index.html', 'game.js', 'bg1.png', 'bg2.png', 'bg3.png', 'bg4.png', 'bg5.png', ${AREA_BGS.map((f) => `'${f}'`).join(', ')}, 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', ${AUDIO.map((f) => `'${f}'`).join(', ')}, ${FONTS.map(([, f]) => `'fonts/${f}'`).join(', ')}];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
// (network first, but a connection that hangs, like a plane's, gives up after a few seconds and the saved copy is used;
// a page asked for with ?seed= or ?band= is the same page)
const fromCache = (req) => caches.match(req, { ignoreSearch: true });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  const net = fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  });
  const slow = new Promise((ok) => setTimeout(ok, 4000)).then(fromCache);
  e.respondWith(Promise.race([net.catch(() => fromCache(e.request)), slow.then((r) => r || net)]).then((r) => r || fromCache(e.request)));
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
