// Builds the phone version into out/web: the game bundle, the page, the app's manifest and icons, and a service
// worker so it plays offline once loaded (what GitHub Pages serves).
//
//   npm run web     build once
//   npm run dev     build, then serve out/web and rebuild on every change (http://localhost:8000)
import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const serve = process.argv.includes('--serve');
// (`--board 7x9` builds with the old board size, to compare against the usual one)
const boardArg = process.argv.indexOf('--board') >= 0 ? process.argv[process.argv.indexOf('--board') + 1] : null;
const out = process.argv.indexOf('--out') >= 0 ? process.argv[process.argv.indexOf('--out') + 1] : 'out/web';
// (STORE-READY: `--store play` builds the Google Play version, which never looks for updates outside Play: `src/appUpdate.ts`,
//  `docs/notes/store-readiness.md`. With no flag the build is the web page and the GitHub release's app, as before)
const storeArg = process.argv.indexOf('--store') >= 0 ? process.argv[process.argv.indexOf('--store') + 1] : '';
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

// (UI-STANDARD: the painted tactic icons, once drawn (docs/notes/ui-standard.md): src/art/ui/tactics/<id>.png, or the art branch's
//  art-source/ui/tactics/<id>.png until they are copied in. Each found is served as ui/tactics/<id>.png and cached; the button shows it in
//  place of its drawn icon. None found: the drawn icons, as now)
const TACTIC_IDS = ['advance', 'hold', 'charge'];
const tacticArt = (id) => [`src/art/ui/tactics/${id}.png`, `art-source/ui/tactics/${id}.png`].find((p) => existsSync(p));
const TACTIC_ART = TACTIC_IDS.filter((id) => tacticArt(id));
const options = {
  entryPoints: ['src/main.ts'],
  outfile: `${out}/game.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  // (`--plain`: names kept as written, for reading a CPU profile: `tools/wave-delay/profile.mjs`)
  minify: !serve && !process.argv.includes('--plain'),
  sourcemap: true,
  logLevel: 'warning',
  // (PLAY-SIZE: a picture imported by the code is a file beside game.js (`art/<folder>/<name>-<hash>.<ext>`, listed in the service
  //  worker's FILES from the build's own record) unless it is under SMALL_ART, which stays inside game.js as a data URL, as every
  //  picture once did: `artFiles` below. The loader here is only the fallback for anything the plugin does not see)
  loader: { '.png': 'dataurl', '.webp': 'dataurl' },
  assetNames: '[dir]/[name]-[hash]',
  metafile: true,
  define: { __GAME_VERSION__: JSON.stringify(version), __TACTIC_ART__: JSON.stringify(TACTIC_ART), __STORE__: JSON.stringify(storeArg), ...(boardArg ? { __BOARD__: JSON.stringify(boardArg) } : {}) },
};

// (PLAY-SIZE, docs/notes/play-size.md: game.js held every picture the code imports as base64, 208 MB of script that the page, and the
//  app's WebView, parsed and kept in memory from the start. Each picture of SMALL_ART or more is now its own file, fetched when first
//  drawn, as the paintings in the folders below always were; the small icons stay inline, so nothing small waits on a request. The
//  files' names carry their content's hash, so a changed picture is a new file, and the service worker lists every one
//  (`ART_FILES`, from the build's metafile) for offline play)
const SMALL_ART = 16 * 1024;
let ART_FILES = [];
const artFiles = {
  name: 'art-files',
  setup(build) {
    build.onLoad({ filter: /\.(png|webp)$/ }, (args) => {
      const contents = readFileSync(args.path);
      return { contents, loader: contents.length < SMALL_ART ? 'dataurl' : 'file' };
    });
    build.onEnd((result) => {
      if (!result.metafile) return;
      ART_FILES = Object.keys(result.metafile.outputs)
        .filter((f) => /\.(png|webp)$/.test(f))
        .map((f) => f.slice(out.length + 1))
        .sort();
      writeServiceWorker();
    });
  },
};
options.plugins = [artFiles];

// (the Assault's simulation in a Web Worker, phase 2: its own small bundle beside game.js, `src/assaultWorker.ts`; it imports no pictures)
const workerOptions = { ...options, plugins: [], metafile: false, entryPoints: ['src/assaultWorker.ts'], outfile: `${out}/assault-worker.js` };

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
// Crown Terrace: eight ruler environments and independent landmark stages, all available offline.
mkdirSync(`${out}/ui/crown-terrace`, { recursive: true });
for (const f of readdirSync('src/art/crown-terrace').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/crown-terrace/${f}`, `${out}/ui/crown-terrace/${f}`);
  UI_FILES.push(`ui/crown-terrace/${f}`);
}
mkdirSync(`${out}/ui`, { recursive: true });
for (const f of readdirSync('src/art/ui').filter((f) => f.endsWith('.png') && !f.startsWith('tab-'))) {
  copyFileSync(`src/art/ui/${f}`, `${out}/ui/${f}`);
  UI_FILES.push(`ui/${f}`);
}
// (PAINTED-BUTTONS: the owner's painted medallions and plates, cut by tools/painted-buttons/cut.py: ui/buttons/<name>.webp, cached for offline)
mkdirSync(`${out}/ui/buttons`, { recursive: true });
for (const f of readdirSync('src/art/ui/buttons').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/ui/buttons/${f}`, `${out}/ui/buttons/${f}`);
  UI_FILES.push(`ui/buttons/${f}`);
}
// (RELEASE-ART: the release audit's pieces the CSS lays by URL (the speech bubble, the fight HUD's hero row, the codex's unmet tile, the
// achievement medal, the Assault's and the Nemesis board's icons): ui/release/<name>.webp, cached for offline)
mkdirSync(`${out}/ui/release`, { recursive: true });
for (const f of readdirSync('src/art/ui/release').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/ui/release/${f}`, `${out}/ui/release/${f}`);
  UI_FILES.push(`ui/release/${f}`);
}
// (RUNE-BENCH-LOOK: the owner's rune bench paintings once they land, imported by tools/rune-bench/import-art.py: ui/rune-bench/<name>.webp)
if (existsSync('src/art/ui/rune-bench')) {
  mkdirSync(`${out}/ui/rune-bench`, { recursive: true });
  for (const f of readdirSync('src/art/ui/rune-bench').filter((f) => f.endsWith('.webp'))) {
    copyFileSync(`src/art/ui/rune-bench/${f}`, `${out}/ui/rune-bench/${f}`);
    UI_FILES.push(`ui/rune-bench/${f}`);
  }
}
// (CASTLE-REMAKE: the castle's paintings, cut by tools/castle-remake/cut.py (stand-ins until the owner's art lands): ui/castle/<name>.webp,
//  cached for offline; src/castleArt.ts names them)
mkdirSync(`${out}/ui/castle`, { recursive: true });
for (const f of readdirSync('src/art/castle-remake').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/castle-remake/${f}`, `${out}/ui/castle/${f}`);
  UI_FILES.push(`ui/castle/${f}`);
}
if (TACTIC_ART.length) mkdirSync(`${out}/ui/tactics`, { recursive: true });
// Tavern activity paintings are separate from battle/roster illustrations.
mkdirSync(`${out}/ui/tavern`, { recursive: true });
for (const f of readdirSync('src/art/tavern/guests').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/tavern/guests/${f}`, `${out}/ui/tavern/${f}`);
  UI_FILES.push(`ui/tavern/${f}`);
}
for (const id of TACTIC_ART) {
  copyFileSync(tacticArt(id), `${out}/ui/tactics/${id}.png`);
  UI_FILES.push(`ui/tactics/${id}.png`);
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
// (the Assault's holds' own art, phase 1b: `tools/assault/cut-sheets.py` cuts them into src/art/assault/<army>/; loaded by URL when an
// assault first opens, so game.js stays small; the service worker keeps them for offline play)
const ASSAULT_ART_FILES = [];
for (const army of readdirSync('src/art/assault')) {
  mkdirSync(`${out}/assault/${army}`, { recursive: true });
  for (const f of readdirSync(`src/art/assault/${army}`).filter((f) => f.endsWith('.webp'))) {
    copyFileSync(`src/art/assault/${army}/${f}`, `${out}/assault/${army}/${f}`);
    ASSAULT_ART_FILES.push(`assault/${army}/${f}`);
  }
}
// (RPG-SPELLS: the painted spell effects' atlases, one a session (tools/spell-fx/import-spell-art.py), load by URL when a fight
// first needs them, so game.js stays small; the service worker keeps them all for offline play)
const SPELL_ART_FILES = [];
mkdirSync(`${out}/fx/spells`, { recursive: true });
for (const f of readdirSync('src/art/fx/spells').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/fx/spells/${f}`, `${out}/fx/spells/${f}`);
  SPELL_ART_FILES.push(`fx/spells/${f}`);
}
// (BLENDER-FX: the Blender-rendered effect sheets (tools/blender-fx/build.py: hard pixel atlases and small soft glow atlases) load by URL
// behind the game, so game.js stays small; the service worker keeps them for offline play)
const BLENDER_FX_FILES = [];
mkdirSync(`${out}/fx/blender`, { recursive: true });
for (const f of readdirSync('src/art/fx/blender').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/fx/blender/${f}`, `${out}/fx/blender/${f}`);
  BLENDER_FX_FILES.push(`fx/blender/${f}`);
}
// (SUMMON-SHOW: the summoning's show, rendered in Blender (tools/blender-fx/summon/), loads by URL as the sanctum opens; the service worker
// keeps it for offline play)
const SUMMON_FX_FILES = [];
mkdirSync(`${out}/fx/summon`, { recursive: true });
for (const f of readdirSync('src/art/fx/summon').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/fx/summon/${f}`, `${out}/fx/summon/${f}`);
  SUMMON_FX_FILES.push(`fx/summon/${f}`);
}
// (EIDOLONS: the six Eidolons' figures and cards, the War Horn and the calling's sheets (tools/eidolons/import.py) load by URL, so game.js
// stays small; the service worker keeps them for offline play)
const EIDOLON_ART_FILES = [];
mkdirSync(`${out}/eidolons`, { recursive: true });
for (const f of readdirSync('src/art/eidolons').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/eidolons/${f}`, `${out}/eidolons/${f}`);
  EIDOLON_ART_FILES.push(`eidolons/${f}`);
}
// (EIDOLON-FX: the strikes' effect strips, tools/eidolon-fx/cut_fx.py)
mkdirSync(`${out}/eidolons/fx`, { recursive: true });
for (const f of readdirSync('src/art/eidolons/fx').filter((f) => f.endsWith('.webp') || f.endsWith('.png'))) {
  copyFileSync(`src/art/eidolons/fx/${f}`, `${out}/eidolons/fx/${f}`);
  EIDOLON_ART_FILES.push(`eidolons/fx/${f}`);
}
// (GEAR-ICONS: the painted equipment icons' atlases (tools/gear/import-gear-icons.py) load by URL, so game.js stays small; the
// service worker keeps them for offline play)
const GEAR_ART_FILES = [];
mkdirSync(`${out}/gear`, { recursive: true });
for (const f of readdirSync('src/art/gear').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/gear/${f}`, `${out}/gear/${f}`);
  GEAR_ART_FILES.push(`gear/${f}`);
}
// (SHOP-BOOKS-GEAR: Hester's Stall and the skill books' paintings (tools/shop/import-shop-art.py), by URL and kept for offline play)
mkdirSync(`${out}/shop`, { recursive: true });
for (const f of readdirSync('src/art/shop').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/shop/${f}`, `${out}/shop/${f}`);
  GEAR_ART_FILES.push(`shop/${f}`);
}
// (INT-341: the relics' painted icons (tools/relics/import-relic-icons.py), by URL and kept for offline play)
mkdirSync(`${out}/relics`, { recursive: true });
for (const f of readdirSync('src/art/relics').filter((f) => f.endsWith('.webp'))) {
  copyFileSync(`src/art/relics/${f}`, `${out}/relics/${f}`);
  GEAR_ART_FILES.push(`relics/${f}`);
}
// (the loading illustration is embedded in the cached page, so it appears before game.js and works offline)
const dataUrl = (f) => `data:image/${f.endsWith('.webp') ? 'webp' : 'png'};base64,${readFileSync(f).toString('base64')}`;
const LOADING_ART = {
  // (RELEASE-ART: the keep under its two crowns, painted for the game in its own style, art-source/release/loading.png; the old
  // poster's crown mask and cloud layer were cut to its picture and are retired with it)
  __LD_KEEP__: 'src/art/loading/release-poster.webp',
};
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
            readFileSync('src/altarClear.css', 'utf8') +
            readFileSync('src/campPlaces.css', 'utf8') +
            readFileSync('src/daily.css', 'utf8') +
            readFileSync('src/cinematics.css', 'utf8') +
            readFileSync('src/reveal.css', 'utf8') +
            readFileSync('src/stone.css', 'utf8') +
            readFileSync('src/levels.css', 'utf8') +
            readFileSync('src/battleUi.css', 'utf8') +
            readFileSync('src/stand.css', 'utf8') +
            readFileSync('src/tomes.css', 'utf8') +
            readFileSync('src/rankUps.css', 'utf8') +
            readFileSync('src/ores.css', 'utf8') +
            readFileSync('src/quests.css', 'utf8') +
            readFileSync('src/eidolons.css', 'utf8') +
            readFileSync('src/eidolonChains.css', 'utf8') +
            readFileSync('src/stall.css', 'utf8'),
        )
        .replace('/*__KEEP_KINGDOM_CSS__*/', () => readFileSync('src/keepKingdom.css', 'utf8') + readFileSync('src/battleCommand.css', 'utf8') + readFileSync('src/fightHud.css', 'utf8') + readFileSync('src/unitInfo.css', 'utf8') + readFileSync('src/battleReports.css', 'utf8') + readFileSync('src/jrpgRecap.css', 'utf8') + readFileSync('src/trophyWall.css', 'utf8') + readFileSync('src/heroArtwork.css', 'utf8') + readFileSync('src/settingsMenu.css', 'utf8') + readFileSync('src/bossBig.css', 'utf8') + readFileSync('src/questBattles.css', 'utf8') + readFileSync('src/oneEach.css', 'utf8') + readFileSync('src/easyMerge.css', 'utf8') + readFileSync('src/guest.css', 'utf8') + readFileSync('src/secret.css', 'utf8') + readFileSync('src/relicCard.css', 'utf8') + readFileSync('src/stats.css', 'utf8') + readFileSync('src/tactics.css', 'utf8') + readFileSync('src/ornateMenus.css', 'utf8') + readFileSync('src/nemesis.css', 'utf8') + readFileSync('src/houses.css', 'utf8') + readFileSync('src/paintedCombat.css', 'utf8') + readFileSync('src/paintedBattlePopups.css', 'utf8') + readFileSync('src/paintedBattleReports.css', 'utf8') + readFileSync('src/paintedDeployment.css', 'utf8') + readFileSync('src/runeBench.css', 'utf8') + readFileSync('src/runeBenchArt.css', 'utf8') + readFileSync('src/paintedTavern.css', 'utf8') + readFileSync('src/paintedSpells.css', 'utf8') + readFileSync('src/alive.css', 'utf8') + readFileSync('src/castleRemake.css', 'utf8') + readFileSync('src/duelShow.css', 'utf8') + readFileSync('src/warRoom.css', 'utf8') + readFileSync('src/paintedButtonsSlices.css', 'utf8') + readFileSync('src/paintedButtons.css', 'utf8'))
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
// (network first, so a new version shows as soon as it's online; the cache only when offline. Written once game.js is built, when
//  the pictures it left as files are known: `artFiles` above)
const writeServiceWorker = () => writeFileSync(
  `${out}/sw.js`,
  `const CACHE = 'legends-${version}';
const FILES = ['.', 'index.html', 'game.js', 'assault-worker.js', 'bg1.png', 'bg2.png', 'bg3.png', 'bg4.png', 'bg5.png', ${AREA_BGS.map((f) => `'${f}'`).join(', ')}, 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', ${FONTS.map(([, f]) => `'fonts/${f}'`).join(', ')}, ${UI_FILES.map((f) => `'${f}'`).join(', ')}, ${AUDIO_FILES.map((f) => `'${f}'`).join(', ')}, ${HERO_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${AWAKENED_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${SPELL_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${BLENDER_FX_FILES.map((f) => `'${f}'`).join(', ')}, ${SUMMON_FX_FILES.map((f) => `'${f}'`).join(', ')}, ${GEAR_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${EIDOLON_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${ASSAULT_ART_FILES.map((f) => `'${f}'`).join(', ')}, ${ART_FILES.map((f) => `'${f}'`).join(', ')}];
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
  await (await esbuild.context(workerOptions)).watch();
  const { port } = await ctx.serve({ servedir: out, port: 8000 });
  console.log(`Serving ${out} at http://localhost:${port}`);
} else {
  await esbuild.build(options);
  await esbuild.build(workerOptions);
  console.log(`Built ${out} (version ${version}${storeArg ? `, for the ${storeArg} store` : ''})`);
}
