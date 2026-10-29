// Transcode the image generator's transparent originals for the offline gallery.
// node tools/anime-heroes/pack.cjs [hero ids...]
const fs = require('node:fs');
const sharp = require('sharp');
const catalogue = require('./catalogue.json');
const selected = new Set(process.argv.slice(2));
const out = 'src/art/heroes';
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const hero of catalogue.filter(h => !selected.size || selected.has(h.id))) {
    const source = `tools/anime-heroes/source/${hero.id}.png`;
    if (!fs.existsSync(source)) throw new Error(`Missing original: ${hero.id}`);
    const scene = `tools/anime-heroes/scenes/${hero.id}.png`;
    if (!fs.existsSync(scene)) throw new Error(`Missing full scene: ${hero.id}`);
    const metadata = await sharp(source).metadata();
    if (!metadata.hasAlpha) throw new Error(`Artwork needs transparency: ${hero.id}`);
    await sharp(scene).resize({ width: 1024, height: 1536, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, effort: 4 }).toFile(`${out}/${hero.id}.webp`);
    await sharp(source).resize({ width: 320, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, alphaQuality: 100, effort: 4 }).toFile(`${out}/${hero.id}-portrait.webp`);
    console.log(hero.id);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
