import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
export async function openBrowser(root, port = 8192) {
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? '/opt/codex/cua_node/lib/node_modules/playwright');
  root = resolve(root);
  const types = {html:'text/html',js:'text/javascript',png:'image/png',css:'text/css',woff2:'font/woff2',opus:'audio/ogg'};
  const server = createServer((q,r) => {
    const path = resolve(root, '.' + (q.url.split('?')[0] === '/' ? '/index.html' : q.url.split('?')[0]));
    if (!path.startsWith(root + sep) || !existsSync(path)) { r.writeHead(404); r.end(); return; }
    r.setHeader('content-type', types[path.split('.').pop()] ?? 'application/octet-stream'); r.end(readFileSync(path));
  }).listen(port, '127.0.0.1');
  await new Promise((ok, fail) => { server.once('listening',ok); server.once('error',fail); });
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  } catch (e) { server.close(); throw e; }
  return { browser, url:`http://localhost:${port}`, close:async () => { await browser.close(); await new Promise(ok => server.close(ok)); } };
}
