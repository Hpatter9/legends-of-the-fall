// PLAY-SIZE C (docs/notes/play-size.md): a PNG as lossless WebP, for the build. The PNGs in src/art stay as they are; the build writes
// the WebP in their place in out/web. Lossless with `exact` keeps every pixel's colour and alpha, those of fully see-through pixels
// too, and each new encoding is decoded again and compared with the PNG before it is used: a picture that does not come back the same
// fails the build. Results are kept in node_modules/.cache/lossless-webp by the PNG's content, so a picture is encoded once.
//
// The owner's call (2026-11-14): lossless only (paintings' lossy compression is for the owner to judge later); the UI frames the CSS
// names stay PNG. In Chromium a soft edge can differ by at most 1/255 on screen (its PNG and WebP decoders round differently when
// they premultiply alpha); `tools/play-size/webp-browser.mjs` measures that.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// (the encoder's settings are part of the cache's key: change them and every picture is encoded and checked afresh)
const OPTIONS = { lossless: true, exact: true, effort: 4 };
const KEY = `v1-libwebp${sharp.versions.webp}-${JSON.stringify(OPTIONS)}`;
const CACHE = 'node_modules/.cache/lossless-webp';

/** Both pictures decoded to 8-bit RGBA: the same size and every byte the same. */
export async function samePixels(a, b) {
  const raw = (buf) => sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [x, y] = await Promise.all([raw(a), raw(b)]);
  return x.info.width === y.info.width && x.info.height === y.info.height && x.info.channels === y.info.channels && x.data.equals(y.data);
}

const pending = new Map();

/**
 * The PNG as lossless WebP, checked pixel for pixel; or null when the WebP would be no smaller (the PNG is kept), unless `always`
 * (a picture whose URL names .webp must have one). Throws if the WebP does not decode to the PNG's pixels.
 */
export function losslessWebp(png, { always = false } = {}) {
  const id = createHash('sha256').update(KEY).update(png).digest('hex');
  const key = `${id}:${always}`;
  if (!pending.has(key)) pending.set(key, encode(png, id, always));
  return pending.get(key);
}

async function encode(png, id, always) {
  const file = join(CACHE, `${id}.webp`);
  let webp;
  if (existsSync(file)) webp = readFileSync(file);
  else {
    webp = await sharp(png).webp(OPTIONS).toBuffer();
    if (!(await samePixels(png, webp))) throw new Error('lossless WebP did not decode to the same pixels as its PNG');
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, webp);
  }
  return always || webp.length < png.length ? webp : null;
}
