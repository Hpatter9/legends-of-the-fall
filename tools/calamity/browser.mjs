// Where these checks find Playwright and Chromium: either machine the game is worked on (the paths differ), or the
// environment's `PLAYWRIGHT_DIR` and `CHROMIUM`.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const playwrightFrom = [process.env.PLAYWRIGHT_DIR, import.meta.url, '/opt/codex/cua_node/lib/node_modules/', '/opt/node-tools/node_modules/'].filter(Boolean);
let found;
for (const from of playwrightFrom) {
  try {
    found = createRequire(from.endsWith('/') || from.startsWith('file:') ? from : `${from}/`)('playwright');
    break;
  } catch {}
}
if (!found) throw Error('Playwright not found: set PLAYWRIGHT_DIR');
export const { chromium } = found;
export const executablePath = [process.env.CHROMIUM, '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean).find((p) => existsSync(p));
