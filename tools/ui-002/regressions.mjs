// Run the existing Keep & Kingdom hero/equipment/navigation checks against this build without modifying those checks.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const require=createRequire(import.meta.url);
const modulePath=require.resolve(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.argv[2]||'out/web');const port=Number(process.env.UI_CHECK_PORT||8206);
mkdirSync('out',{recursive:true});
const shim=resolve('out/ui-002-playwright.cjs');
writeFileSync(shim,`const p = require(${JSON.stringify(modulePath)});\nmodule.exports = { ...p, chromium: { launch: (options) => p.chromium.launch({ ...options, ${process.env.CHROMIUM_PATH?`executablePath: ${JSON.stringify(process.env.CHROMIUM_PATH)}`:''} }) } };\n`);
const server=createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const p=resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!p.startsWith(root+'/')||!existsSync(p)){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2','.opus':'audio/ogg'})[extname(p)]||'application/octet-stream');res.end(readFileSync(p));});
await new Promise(done=>server.listen(port,'127.0.0.1',done));
try{
 process.env.PLAYWRIGHT_MODULE=shim;process.env.GAME_URL=`http://localhost:${port}`;process.env.UI_SAMPLES=process.env.UI_SAMPLES||'out/ui-002-regressions';
 await import('../keep-kingdom-checks.mjs');
}finally{await new Promise(done=>server.close(done));}
