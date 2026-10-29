// Present actual browser captures together; no generated concept art is used here.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const rooms = [['hall', 'GREAT HALL'], ['chapel', 'CHAPEL'], ['library', 'LIBRARY'], ['courtyard', 'COURTYARD']];
  const panels = rooms.map(([kind, label]) => `<section><h2>${label}</h2><img src="data:image/png;base64,${readFileSync(`docs/samples/stand-depth-${kind}-393x852.png`).toString('base64')}"></section>`).join('');
  await page.setContent(`<html><style>
    * {box-sizing:border-box} body {margin:0;background:#080c11;color:#d9ba79;font-family:Georgia,serif}
    h1 {margin:0;height:40px;text-align:center;font-size:21px;line-height:40px;letter-spacing:4px}
    main {display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:0 12px}
    section {min-width:0} h2 {height:26px;margin:0;text-align:center;font-size:15px;line-height:26px;letter-spacing:3px}
    img {display:block;width:100%;height:auto;border:1px solid #6e5a37}
  </style><body><h1>LAST STAND · IN-GAME ARTWORK</h1><main>${panels}</main></body></html>`);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  await page.screenshot({ path: 'docs/samples/stand-depth-preview.png' });
} finally { await browser.close(); }
