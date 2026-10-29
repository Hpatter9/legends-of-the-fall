// Render and exercise the separate dungeon-map proposal entirely offline.
// (Playwright and Chromium from wherever this machine keeps them: see browser.mjs)
const { chromium } = require((() => { for (const p of [process.env.PLAYWRIGHT_DIR, '/opt/codex/cua_node/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) { try { if (p) return require.resolve(p); } catch {} } return 'playwright'; })());
const { readFileSync } = require('node:fs');
const root = require('node:path').resolve(__dirname, '../..');
const assets = ['calmap-dungeon/encounters','stand/floor1','stand/walltop','units/hero_soldier','tower/torch'];
let html = readFileSync(root + '/docs/samples/calamity-dungeon/proposal.html', 'utf8');
// (the encounter symbols ship as WebP since CAL-SANCTUARY's integration; the proposal names the old PNG)
const { existsSync } = require('node:fs');
for (const name of assets) {
  const webp = existsSync(root + '/src/art/' + name + '.webp');
  html = html.replaceAll('/src/art/' + name + '.png', `data:image/${webp ? 'webp' : 'png'};base64,` + readFileSync(root + '/src/art/' + name + (webp ? '.webp' : '.png')).toString('base64'));
}
for (const font of ['cinzel-decorative-latin-700-normal','alegreya-sans-latin-400-normal','alegreya-sans-latin-700-normal']) html = html.replaceAll('/out/web/fonts/' + font + '.woff2','data:font/woff2;base64,' + readFileSync(root+'/out/web/fonts/'+font+'.woff2').toString('base64'));
(async()=>{
 const browser = await chromium.launch({ executablePath:[process.env.CHROMIUM,'/usr/bin/chromium','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean).find((p)=>require('node:fs').existsSync(p)),headless:true,args:['--no-sandbox'] });
 try {
  for(const [width,height] of [[393,852],[360,780],[412,915]]) {
   const page = await browser.newPage({ viewport:{width,height},reducedMotion:'reduce' });
   await page.route('**/*',r=>r.abort());
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:root+'/docs/samples/calamity-dungeon/proposal-'+width+'.png'});
   const layout = await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,actionsVisible:document.querySelector('.controlPanel').getBoundingClientRect().bottom<=innerHeight,arrowTargets:[...document.querySelectorAll('.dpad button')].every(b=>b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44)}));
   if(layout.overflow||!layout.actionsVisible||!layout.arrowTargets)throw Error(JSON.stringify(layout));
   await page.getByRole('button',{name:'Move north',exact:true}).click();
   if(!await page.locator('[data-id="battle"]').evaluate(e=>e.classList.contains('current')))throw Error('North movement failed');
   await page.getByRole('button',{name:'Move south',exact:true}).click();
   if(!await page.locator('[data-id="start"]').evaluate(e=>e.classList.contains('current')))throw Error('Revisit failed');
   await page.keyboard.press('ArrowRight');
   if(!await page.locator('[data-id="east"]').evaluate(e=>e.classList.contains('current')))throw Error('Keyboard movement failed');
   await page.locator('[data-id="boss"]').click();
   if(!await page.locator('.enter').isDisabled())throw Error('Unreached boss should be disabled');
   await page.locator('[data-id="fight2"]').click();await page.locator('.enter').click();
   if(!await page.locator('[data-id="fight2"]').evaluate(e=>e.classList.contains('current')))throw Error('Tap travel failed');
   if(errors.length)throw Error(errors.join('; '));
   console.log(JSON.stringify({width,height,layout,checks:'north/south, revisiting, keyboard, unreachable boss, tap travel',errors}));
   await page.screenshot({path:root+'/docs/samples/calamity-dungeon/exploring-'+width+'.png'});
   await page.close();
  }
 }finally{await browser.close()}
})();
