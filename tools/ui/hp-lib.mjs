// The hero-progress screenshots' shared bits: the audit's server and save, with this container's Chromium.
import { createRequire } from 'node:module';
export { serve, HEROES, saveScript } from '../audit/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
export const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
