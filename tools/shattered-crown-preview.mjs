// Build first. Render the actual loading CSS as a portable HTML and ten-second clip.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const samples = 'docs/samples/shattered-crown';
const source = readFileSync('out/web/index.html', 'utf8');
const start = source.indexOf('  /* The Shattered Crown:');
const end = source.indexOf('\n', source.indexOf('  @media (prefers-reduced-motion: reduce) { #loading', start));
const css = source.slice(start, end);
const html = source.slice(source.indexOf('<div id="loading"'), source.indexOf('\n<div id="turnUp"'));
const preview = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Shattered Crown — animated preview</title><style>*{box-sizing:border-box}html,body{margin:0;height:100%;background:#171614}body{max-width:480px;margin:auto;transform:translateZ(0)}' + css + '</style>' + html + '</html>';
mkdirSync(samples, {recursive:true});
writeFileSync(`${samples}/preview.html`, preview);
const frames = mkdtempSync(join(tmpdir(), 'crown-frames-'));
const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  const context = await browser.newContext({viewport:{width:393,height:852}});
  const page = await context.newPage();
  await page.setContent(preview);
  await page.evaluate(async () => {
    for (const e of document.querySelectorAll('.ldArt, .ldClouds, .ldCrownMask')) {
      const style = getComputedStyle(e);
      const url = (e.classList.contains('ldCrownMask') ? style.maskImage : style.backgroundImage).slice(5,-2);
      const im = new Image(); im.src = url; await im.decode();
    }
    document.getAnimations().forEach(a => a.pause());
  });
  for (let i=0; i<80; i++) {
    await page.evaluate(t => document.getAnimations().forEach(a => a.currentTime=t), i*125);
    await page.screenshot({path:join(frames, `frame-${String(i).padStart(3,'0')}.png`)});
  }
} finally { await browser.close(); }
try {
  const input = ['-y','-loglevel','error','-framerate','8','-i',join(frames,'frame-%03d.png')];
  execFileSync('ffmpeg',[...input,'-vf','scale=394:852','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',`${samples}/preview.mp4`]);
  copyFileSync(`${samples}/preview.mp4`, `${samples}/snowfall-preview.mp4`);
  execFileSync('ffmpeg',[...input,'-filter_complex','[0:v]split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer',`${samples}/preview.gif`]);
} finally { rmSync(frames,{recursive:true,force:true}); }
console.log('Updated standalone HTML, MP4 and GIF previews.');
