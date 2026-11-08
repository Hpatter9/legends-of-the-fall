// Transcode the image generator's transparent originals for the offline gallery.
// node tools/anime-heroes/pack.cjs [hero ids...]
// node tools/anime-heroes/pack.cjs --from art-source/heroes-20 [hero ids...]
//   (the twenty heroes' paintings, docs/notes/twenty-heroes-art-prompts.md: <id>.png the scene, <id>-cutout.png the cutout and
//   awakened/<id>.png the awakened figure, in the folder given; every id in it when none is named)
// The outputs are main's: the scene 1024 x 1536 at most, the cutout 640 x 960 at most (0.346.0), the awakened figure 596 x 560, as WebP.
// A cutout's and an awakened figure's soft matting inside the figure is made solid (alpha 145 or more to 255), as 0.346.0 cleaned the 45.
const fs = require('node:fs');
const sharp = require('sharp');
const args = process.argv.slice(2);
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : undefined;
const selected = new Set(args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--from'));
const out = 'src/art/heroes';
fs.mkdirSync(out, { recursive: true });

/** A transparent original resized to fit `w` x `h`, its interior matting made solid, as WebP. */
async function solid(file, w, h, to) {
  const { data, info } = await sharp(file).ensureAlpha().resize({ width: w, height: h, fit: 'inside', withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) if (data[i] >= 145) data[i] = 255;
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 85, alphaQuality: 100, effort: 4 }).toFile(to);
}

async function fromFolder() {
  const ids = selected.size ? [...selected] : fs.readdirSync(from).filter(f => f.endsWith('-cutout.png')).map(f => f.slice(0, -'-cutout.png'.length));
  for (const id of ids.sort()) {
    const scene = `${from}/${id}.png`;
    const cutout = `${from}/${id}-cutout.png`;
    const awakened = `${from}/awakened/${id}.png`;
    for (const f of [scene, cutout]) if (!fs.existsSync(f)) throw new Error(`Missing: ${f}`);
    if (!(await sharp(cutout).metadata()).hasAlpha) throw new Error(`The cutout needs transparency: ${id}`);
    await sharp(scene).resize({ width: 1024, height: 1536, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, effort: 4 }).toFile(`${out}/${id}.webp`);
    await solid(cutout, 640, 960, `${out}/${id}-portrait.webp`);
    if (fs.existsSync(awakened)) {
      if (!(await sharp(awakened).metadata()).hasAlpha) throw new Error(`The awakened figure needs transparency: ${id}`);
      await solid(awakened, 596, 560, `${out}/awakened-${id}.webp`);
    }
    console.log(id, fs.existsSync(awakened) ? '(scene, cutout, awakened)' : '(scene, cutout)');
  }
}

async function fromCatalogue() {
  const catalogue = require('./catalogue.json');
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
}

(from ? fromFolder() : fromCatalogue()).catch(error => { console.error(error); process.exitCode = 1; });
