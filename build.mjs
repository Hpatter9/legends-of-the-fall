// Builds the phone version into out/web: the game bundle, the page, the app's manifest and icons, and a service
// worker so it plays offline once loaded (what GitHub Pages serves).
//
//   npm run web     build once
//   npm run dev     build, then serve out/web and rebuild on every change (http://localhost:8000)
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const serve = process.argv.includes('--serve');
// (`--board 7x9` builds with the old board size, to compare against the usual one)
const boardArg = process.argv.indexOf('--board') >= 0 ? process.argv[process.argv.indexOf('--board') + 1] : null;
const out = process.argv.indexOf('--out') >= 0 ? process.argv[process.argv.indexOf('--out') + 1] : 'out/web';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
let commit = 'dev';
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a checkout */
}
const version = `${pkg.version} · ${commit}${serve ? ' · dev-' + Math.floor(Date.now() / 1000) : ''}`;

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
  // (the large paintings are WebP, data URLs as the PNGs are: bundled, so offline needs nothing in FILES)
  loader: { '.png': 'dataurl', '.webp': 'dataurl' },
  define: { __GAME_VERSION__: JSON.stringify(version), ...(boardArg ? { __BOARD__: JSON.stringify(boardArg) } : {}) },
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
  ['pixelify-sans', 'pixelify-sans-latin-400-normal.woff2'],
  ['pixelify-sans', 'pixelify-sans-latin-700-normal.woff2'],
];
mkdirSync(`${out}/fonts`, { recursive: true });
for (const [pkgName, f] of FONTS) copyFileSync(`node_modules/@fontsource/${pkgName}/files/${f}`, `${out}/fonts/${f}`);
// (the pixel UI's frames, as files the CSS 9-slices by URL: ui/<name>.png; the tab icons are bundled into game.js instead)
const UI_FILES = [];
mkdirSync(`${out}/ui`, { recursive: true });
for (const f of readdirSync('src/art/ui').filter((f) => f.endsWith('.png') && !f.startsWith('tab-'))) {
  copyFileSync(`src/art/ui/${f}`, `${out}/ui/${f}`);
  UI_FILES.push(`ui/${f}`);
}
// (the epic music: rendered offline by tools/epic-music/ into src/audio/*.opus, served as audio/<name>.opus and cached by the service
// worker with everything else, so it plays offline; the old synthesised tracks (src/render/musicBake.ts) are the fallback if a browser cannot decode them)
const AUDIO_FILES = [];
mkdirSync(`${out}/audio`, { recursive: true });
for (const f of readdirSync('src/audio').filter((f) => f.endsWith('.opus'))) {
  copyFileSync(`src/audio/${f}`, `${out}/audio/${f}`);
  AUDIO_FILES.push(`audio/${f}`);
}
// (the king's spells' sounds: rendered offline by tools/spell-sfx/ into src/sfx/*.opus, served as sfx/<name>.opus and cached with the
// music; `spellBank.ts` loads them, and the old synthesised cues stand in if a browser cannot decode them)
mkdirSync(`${out}/sfx`, { recursive: true });
for (const f of readdirSync('src/sfx').filter((f) => f.endsWith('.opus'))) {
  copyFileSync(`src/sfx/${f}`, `${out}/sfx/${f}`);
  AUDIO_FILES.push(`sfx/${f}`);
}
// Full art and smaller menu cutouts are separate files, all retained for offline play.
const HERO_ART_FILES = [];
// Awakened animation sheets stay outside the script: heroes and previews load
// only the art they use, while the service worker keeps all forms for flights.
const AWAKENED_ART_FILES = [];
mkdirSync(`${out}/awakened`, { recursive: true });
for (const f of readdirSync('src/art/awakened').filter(f => f.endsWith('.png'))) {
  copyFileSync(`src/art/awakened/${f}`, `${out}/awakened/${f}`);
  AWAKENED_ART_FILES.push(`awakened/${f}`);
}
mkdirSync(`${out}/heroes`, { recursive: true });
for (const f of readdirSync('src/art/heroes').filter(f => f.endsWith('.webp'))) {
  copyFileSync(`src/art/heroes/${f}`, `${out}/heroes/${f}`);
  HERO_ART_FILES.push(`heroes/${f}`);
}
// (RPG-SPELLS: the painted spell effects' atlases, one a session (tools/spell-fx/import-spell-art.py), load by URL when a fight
// first needs them, so game.js stays small; the service worker keeps them all for offline play)
const SPELL_ART_FILES = [];
mkdirSync(`${out}/fx/spells`, { recursive: true });
for (const f of readdirSync('src/art/fx/spells').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/fx/spells/${f}`, `${out}/fx/spells/${f}`);
  SPELL_ART_FILES.push(`fx/spells/${f}`);
}
// (GEAR-ICONS: the painted equipment icons' atlases (tools/gear/import-gear-icons.py) load by URL, so game.js stays small; the
// service worker keeps them for offline play)
const GEAR_ART_FILES = [];
mkdirSync(`${out}/gear`, { recursive: true });
for (const f of readdirSync('src/art/gear').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/gear/${f}`, `${out}/gear/${f}`);
  GEAR_ART_FILES.push(`gear/${f}`);
}
// (the loading illustration is embedded in the cached page, so it appears before game.js and works offline)
const dataUrl = (f) => `data:image/${f.endsWith('.webp') ? 'webp' : 'png'};base64,${readFileSync(f).toString('base64')}`;
const LOADING_ART = { __LD_KEEP__: 'src/art/loading/last-keep.webp' };
const withLoadingArt = (html) => Object.entries(LOADING_ART).reduce((h, [k, f]) => h.replaceAll(k, () => dataUrl(f)), html);
const writeIndexHtml = () => {
  writeFileSync(
    `${out}/index.html`,
    withLoadingArt(
      readFileSync('src/index.html', 'utf8')
        .replace(
          '/*__PIXEL_CSS__*/',
          () =>
            readFileSync('src/tokens.css', 'utf8') +
            readFileSync('src/pixel.css', 'utf8') +
            readFileSync('src/equip.css', 'utf8') +
            readFileSync('src/rogue.css', 'utf8') +
            readFileSync('src/twists.css', 'utf8') +
            readFileSync('src/eliteSets.css', 'utf8') +
            readFileSync('src/talents.css', 'utf8') +
            readFileSync('src/codex.css', 'utf8') +
            readFileSync('src/awaken.css', 'utf8') +
            readFileSync('src/calmap.css', 'utf8') +
            readFileSync('src/dungeonMap.css', 'utf8') +
            readFileSync('src/sanctuary.css', 'utf8') +
            readFileSync('src/campPlaces.css', 'utf8') +
            readFileSync('src/daily.css', 'utf8') +
            readFileSync('src/cinematics.css', 'utf8') +
            readFileSync('src/stone.css', 'utf8') +
            readFileSync('src/levels.css', 'utf8') +
            readFileSync('src/battleUi.css', 'utf8') +
            readFileSync('src/stand.css', 'utf8') +
            readFileSync('src/tomes.css', 'utf8') +
            readFileSync('src/ores.css', 'utf8') +
            readFileSync('src/quests.css', 'utf8'),
        )
        .replace('/*__KEEP_KINGDOM_CSS__*/', () => readFileSync('src/keepKingdom.css', 'utf8') + readFileSync('src/battleCommand.css', 'utf8') + readFileSync('src/fightHud.css', 'utf8') + readFileSync('src/battleReports.css', 'utf8') + readFileSync('src/trophyWall.css', 'utf8') + readFileSync('src/heroArtwork.css', 'utf8') + readFileSync('src/settingsMenu.css', 'utf8'))
        .replace('__VERSION__', version),
    ),
  );
};
writeIndexHtml();
writeFileSync(
  `${out}/manifest.webmanifest`,
  JSON.stringify(
    {
      name: pkg.productName,
      short_name: 'Legends',
      start_url: '.',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#11151b',
      theme_color: '#171c23',
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
const FILES = ['.', 'index.html', 'game.js', 'bg1.png', 'bg2.png', 'bg3.png', 'bg4.png', 'bg5.png', ${AREA_BGS.map((f) => `'${f}'`).join(', ')}, 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', ${FONTS.map(([, f]) => `'fonts/${f}'`).join(', ')}, ${UI_FILES.map((f) => `'${f}'`).join(', ')}, ${AUDIO_FILES.map((f) => `'${f}'`).join(', ')}, ${HERO_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${AWAKENED_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${SPELL_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${GEAR_ART_FILES.map((f) => `'${f}'`).join(', ')}];
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
