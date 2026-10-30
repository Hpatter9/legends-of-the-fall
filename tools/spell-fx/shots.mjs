// RPG-SPELLS painted effects, sessions B, D, E, F and G (docs/notes/spell-art-bde.md): screenshots of the painted moves in real fights. Each
// shot starts an army fight with a party round the hero, keeps that hero's pool (or its ultimate's meter) full until it casts the move
// asked for, then holds the fight still a moment later, the camera on the caster and the foes it struck. The auras are raised on a hero
// through the toolkit (`window.__toolkit.raiseAura`), so the page draws them as it draws any aura. After `npm run web`:
//   node tools/spell-fx/shots.mjs                 every shot at 393x852
//   ONLY=hex,flood SIZES=393x852,360x780 node tools/spell-fx/shots.mjs
//   PICK=auras,r PREFIX=spell-repaint-after node tools/spell-fx/shots.mjs    the auras and the repainted moves, named for before/after
// Pictures: docs/samples/spell-art-bde-<shot>-<size>.png, and each group side by side in docs/samples/spell-art-bde-<group>.png
// (python3 with Pillow joins them).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 8671);
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const SIZES = (process.env.SIZES ?? '393x852').split(',').map((s) => s.split('x').map(Number));
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let errors = 0;
const FILL = ['knight', 'juggernaut', 'cleric', 'archer', 'paladin'];

/** The moves: `key` the skill's fixed key, `ult` when it is the hero's ultimate, `s1` when it is skill 1 (skill 2 goes first when both
 *  can), `hold` ms after the cast to freeze it. */
const MOVES = [
  // (session D)
  { shot: 'fireball', def: 'wizard', key: 'Meteor', hold: 520 },
  { shot: 'meteor-swarm', def: 'wizard', key: 'Armageddon', ult: true, hold: 900 },
  { shot: 'magic-missile', def: 'sage', key: 'Starfall', hold: 450 },
  { shot: 'eldritch-blast', def: 'warlock', key: 'Hex', s1: true, hold: 450 },
  { shot: 'drain-life', def: 'warlock', key: 'Soul Siphon', hold: 900 },
  { shot: 'circle-of-death', def: 'warlock', key: 'Soul Harvest', ult: true, hold: 1200 },
  { shot: 'time-stop', def: 'timeWitch', key: 'Time Stop', ult: true, hold: 1300 },
  { shot: 'slow-field', def: 'timeWitch', key: 'Temporal Surge', s1: true, hold: 900 },
  { shot: 'bane', def: 'tyrant', key: 'Condemn', hold: 900 },
  { shot: 'hunters-mark', def: 'mercenary', key: 'Mark for Coin', hold: 900 },
  // (session E)
  { shot: 'issen', def: 'samurai', key: 'Heaven-Splitting Cut', ult: true, hold: 260 },
  { shot: 'rage', def: 'barbarian', key: 'Blood Fury', hold: 900 },
  { shot: 'cleave', def: 'demonSwordsman', key: 'Hellblade Sweep', hold: 520 },
  { shot: 'seismic-slam', def: 'juggernaut', key: 'Earthquake', hold: 380 },
  { shot: 'dragon-dive', def: 'dragoon', key: 'Jump', hold: 560 },
  { shot: 'grappling-hook', def: 'buccaneer', key: 'Grappling Hook', hold: 420 },
  { shot: 'powder-keg', def: 'dreadPirate', key: 'Powder Keg', hold: 900 },
  { shot: 'tidal-wave', def: 'kraken', key: 'Flood', hold: 420 },
  { shot: 'tentacles', def: 'kraken', key: 'Undertow', hold: 520 },
  { shot: 'pounce', def: 'werewolf', key: 'Ravage', hold: 300 },
  { shot: 'flurry', def: 'ninjaMonk', key: 'Thousand Fists', s1: true, hold: 300 },
  { shot: 'thunderwave', def: 'arcBlade', key: 'Grounding', hold: 300 },
  // (session F)
  { shot: 'aimed-shot', def: 'archer', key: 'Pinning Shot', hold: 220 },
  { shot: 'volley', def: 'archer', key: 'Volley', s1: true, hold: 700 },
  { shot: 'bombard', def: 'siegeBot', key: 'Shell Barrage', s1: true, hold: 500 },
  { shot: 'dragon-breath', def: 'dragoon', key: 'Dragon Breath', hold: 400 },
  { shot: 'divine-smite', def: 'paladin', key: 'Holy Challenge', s1: true, hold: 380 },
  { shot: 'entangle', def: 'ranger', key: "Hunter's Net", ult: true, hold: 700 },
  { shot: 'snare', def: 'ranger', key: 'Snare Trap', hold: 700 },
  { shot: 'whirlwind', def: 'barbarian', key: 'Whirlwind', hold: 400 },
  // (session G)
  { shot: 'chain-lightning', def: 'lightningMage', key: 'Chain Lightning', s1: true, hold: 350 },
  { shot: 'judgement', def: 'tyrant', key: 'Judgement', hold: 500 },
  { shot: 'plague-tide', def: 'shambler', key: 'Plague Tide', ult: true, hold: 700 },
  { shot: 'tempest', def: 'yamabushi', key: 'Tempest', ult: true, hold: 700 },
  { shot: 'gaze', def: 'gorgon', key: 'Petrifying Gaze', s1: true, hold: 400 },
  { shot: 'war-banner', def: 'samuraiCommander', key: 'War Banner', hold: 700 },
  { shot: 'panacea', def: 'wanderer', key: 'Dawn Light', ult: true, hold: 600 },
  { shot: 'swoop', def: 'karasu', key: 'Dive', s1: true, hold: 220 },
  // (the repainted sheets, docs/notes/spell-art-repaint.md: only with ONLY=..., or PICK=r; `group` names their contact sheet)
  { shot: 'gore', def: 'minotaur', key: 'Gore Charge', hold: 300, group: 'r' },
  { shot: 'iaido', def: 'samurai', key: 'Iaido', hold: 260, group: 'r' },
  { shot: 'metamorphosis', def: 'demonSwordsman', key: 'Demon Form', ult: true, hold: 350, group: 'r' },
  { shot: 'rapid-shot', def: 'rifleBot', key: 'Burst Fire', hold: 250, group: 'r' },
  { shot: 'conjure-treant', def: 'druid', key: 'Call Treant', hold: 350, group: 'r' },
  { shot: 'wild-shape', def: 'druid', key: 'Treeform', s1: true, hold: 350, group: 'r' },
  { shot: 'summon-beast', def: 'beastmaster', key: 'Call of the Wild', hold: 350, group: 'r' },
  { shot: 'mirror-image', def: 'illusionist', key: 'Mirror Image', hold: 300, group: 'r' },
  { shot: 'plant-standard', def: 'samuraiCommander', key: 'Plant the Standard', s1: true, hold: 350, group: 'r' },
  { shot: 'pilfer', def: 'karasu', key: 'Pilfer', s1: true, hold: 300, group: 'r' },
  { shot: 'pipes', def: 'satyr', key: 'Pipes of Pan', hold: 700, group: 'r' },
  { shot: 'irresistible-dance', def: 'satyr', key: 'Pied Piper', s1: true, hold: 700, group: 'r' },
  { shot: 'battle-hymn', def: 'wolfBard', key: 'Battle Hymn', ult: true, hold: 700, group: 'r' },
  { shot: 'stone-curse', def: 'gorgon', key: 'Stone Curse', ult: true, hold: 700, group: 'r' },
  { shot: 'reign-of-terror', def: 'tyrant', key: 'Reign of Terror', ult: true, hold: 700, group: 'r' },
];
/** The auras, raised through the toolkit on the paladin (`what` is the sim's name for each). */
const AURAS = [
  ['protection', 'Aura of Protection', 3], ['guardians', 'Spirit Guardians', 2], ['rot', 'contagion rot', 2], ['storm', 'storm cloud', 6],
  ['font', 'font of magic', 3], ['mist', 'Healing Mist', 2], ['daggers', 'cloud of daggers', 1], ['circle', 'circle of death', 2],
];

async function open(w, h, party) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, xp]) => {
    if (sessionStorage.getItem('bde-set')) return;
    sessionStorage.setItem('bde-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, ultFull: false }));
  }, [party, xpAt(30)]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 400000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'undead' }, stage: 2, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, party);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
  // (the foes made tough, so the wave lasts until the move is caught; the painted atlases load behind the game meanwhile)
  await page.evaluate(() => { for (const f of window.__game.b.units) if (f.side === 'foe') { f.maxHp *= 30; f.hp = f.maxHp; } });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

const made = {};
const keep = (group, path) => (made[group] ??= []).push(path);
const ONLY = process.env.ONLY?.split(',');
const PICK = process.env.PICK?.split(',');
// (a shot's group: a move's own `group` (the repaint's 'r'), 'auras', or 'old' for the rest; the 'r' moves are shot only when asked for)
const groupOf = (k) => MOVES.find((m) => m.shot === k)?.group ?? (AURAS.some((a) => a[0] === k) ? 'auras' : 'old');
const want = (k) => (ONLY ? ONLY.includes(k) : PICK ? PICK.includes(groupOf(k)) : groupOf(k) !== 'r');
/** The pictures' name: docs/samples/<PREFIX>-<shot>-<size>.png (spell-art-bde unless PREFIX says otherwise, e.g. for before and after). */
const PREFIX = process.env.PREFIX ?? 'spell-art-bde';

for (const [w, h] of SIZES) {
  const size = `${w}x${h}`;
  for (const m of MOVES) {
    if (!want(m.shot)) continue;
    const party = [m.def, ...FILL.filter((k) => k !== m.def)].slice(0, 5);
    const { ctx, page } = await open(w, h, party);
    // (the move's cast is caught as the page shows it: the fight is held `hold` ms later, the camera between the caster and what it struck)
    await page.evaluate((m) => {
      const g = window.__game;
      window.__caught = null;
      const show = g.fx.show.bind(g.fx);
      g.fx.show = (b, events) => {
        show(b, events);
        if (window.__caught) return;
        const e = events.find((x) => x.kind === 'skill' && x.name === m.key);
        if (!e) return;
        const me = g.sprites.get(e.by);
        const ids = events.filter((x) => (x.kind === 'hit' || x.kind === 'mark') && x.by === e.by).map((x) => x.to).concat(events.filter((x) => x.kind === 'arc' && x.from === e.by).map((x) => x.to));
        const areas = events.filter((x) => x.kind === 'area' && x.by === e.by);
        const at = ids.map((id) => g.sprites.get(id)).filter(Boolean);
        let fx = me.x, fy = me.y;
        if (at.length) { fx = (me.x + at[0].x) / 2; fy = (me.y + at[0].y) / 2; }
        else if (areas.length) { const s = g.b.units.find((x) => x.alive && x.side === 'foe' && Math.abs(x.u - areas[0].u) <= 1 && Math.abs(x.v - areas[0].v) <= 1); const t = s && g.sprites.get(s.id); if (t) { fx = (me.x + t.x) / 2; fy = (me.y + t.y) / 2; } }
        // (held there every frame: the fight's own camera would ease back)
        const pin = () => { if (window.__held) return; g.manualCam = true; g.tx = g.cx = fx; g.ty = g.cy = fy - 30; g.zoom = g.tzoom = 1.9; requestAnimationFrame(pin); };
        pin();
        g.speed = 1;
        window.__caught = { t: b.t, struck: ids.length, areas: areas.length };
        setTimeout(() => { g.sceneHold++; window.__held = true; }, m.hold);
      };
      window.__held = false;
      g.speed = 2;
    }, m);
    const got = await page.waitForFunction((m) => {
      const g = window.__game;
      if (window.__held) return true;
      if (window.__caught) return false;
      if (g.b.phase === 'deploy') document.getElementById('fight')?.click();
      const k = g.b.units.find((x) => x.def === m.def && x.alive && x.side === 'hero');
      if (!k) return false;
      if (m.ult) {
        if ((k.charge2 ?? 0) < 100) { k.charge2 = 100; k.ultOrder = g.b.t; }
      } else {
        k.charge = 100;
        // (a hero casts skill 2 first when it can: for a skill 1, skill 2 is kept waiting on its gap)
        k.ks ??= {};
        delete k.ks.at1;
        delete k.ks.idle2;
        if (m.s1) k.ks.at2 = g.b.t;
        else delete k.ks.at2;
      }
      return false;
    }, m, { timeout: 60000, polling: 'raf' }).then(() => true).catch(() => false);
    // (and which painted sheets are on the screen as it is held, by atlas)
    const note = await page.evaluate(() => {
      const seen = {};
      const walk = (c) => { for (const k of c.children ?? []) { const src = k.texture?.source?.resource?.src ?? k.texture?.source?.resource?.currentSrc ?? ''; const m = /fx\/spells\/([a-z-]+)\.webp/.exec(src); if (m && k.visible !== false) seen[m[1]] = (seen[m[1]] ?? 0) + 1; walk(k); } };
      walk(window.__game.fx.root);
      return JSON.stringify({ ...window.__caught, painted: seen });
    });
    await page.waitForTimeout(400);
    const path = `docs/samples/${PREFIX}-${m.shot}-${size}.png`;
    await page.screenshot({ path });
    console.log(size, m.shot, got ? 'cast' : 'NOT CAST', note);
    if (got) keep(`${m.group ? m.group : MOVES.indexOf(m) < 10 ? 'd' : MOVES.indexOf(m) < 22 ? 'e' : MOVES.indexOf(m) < 30 ? 'f' : 'g'}-${size}`, path);
    await ctx.close();
  }
  for (const [shot, what, reach] of AURAS) {
    if (!want(shot)) continue;
    const { ctx, page } = await open(w, h, FILL);
    await page.waitForTimeout(800);
    await page.evaluate(([what, reach]) => {
      const g = window.__game;
      const me = g.b.units.find((x) => x.alive && x.side === 'hero' && x.def === 'paladin') ?? g.b.units.find((x) => x.alive && x.side === 'hero');
      const out = [];
      window.__toolkit.raiseAura(g.b, me, { what, reach, ms: 30000, every: 1000 }, out);
      g.fx.show(g.b, out);
      const s = g.sprites.get(me.id);
      const pin = () => { if (g.sceneHold) return; g.manualCam = true; g.tx = g.cx = s.x; g.ty = g.cy = s.y - (what === 'storm cloud' ? 70 : 20); g.zoom = g.tzoom = 1.6; requestAnimationFrame(pin); };
      pin();
    }, [what, reach]);
    await page.waitForTimeout(1400);
    await page.evaluate(() => { window.__game.sceneHold++; });
    await page.waitForTimeout(300);
    const path = `docs/samples/${PREFIX}-aura-${shot}-${size}.png`;
    await page.screenshot({ path });
    console.log(size, 'aura', shot);
    keep(`auras-${size}`, path);
    await ctx.close();
  }
}
// (each group side by side, half size, four to a row)
for (const [group, paths] of process.env.NOJOIN ? [] : Object.entries(made)) {
  const script = `import sys\nfrom PIL import Image\nps=sys.argv[2:]\nims=[Image.open(p).convert('RGB') for p in ps]\nw,h=ims[0].size\nw2,h2=w//2,h//2\ncols=min(4,len(ims))\nrows=(len(ims)+cols-1)//cols\nout=Image.new('RGB',(cols*w2,rows*h2),(16,16,20))\nfor i,im in enumerate(ims): out.paste(im.resize((w2,h2)),((i%cols)*w2,(i//cols)*h2))\nout.save(sys.argv[1])\n`;
  writeFileSync('out/join.py', script);
  execFileSync('python3', ['out/join.py', `docs/samples/${PREFIX}-${group}.png`, ...paths]);
  console.log('joined', group, paths.length);
}
console.log('page errors:', errors);
await browser.close();
srv.close();
process.exit(errors ? 1 : 0);
