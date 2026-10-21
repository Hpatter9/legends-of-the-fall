// Builds the class heroes' sheets from the layered Himeko Sutori sprites in ../chronos-assets (a dev tool, run by hand:
// `node tools/compose-class-heroes.cjs [id ...]`; it needs Playwright's Chromium). Adapted from Chronos's
// tools/compose-sheets.cjs: each hero is a body template with an outfit, a helm and a weapon laid on it, cut from the pack's
// 128px grid (8 poses across; the right-facing row is the third), cropped to the figure with its feet on the bottom edge.
// It writes src/art/units/<id>.png and adds each sheet's layout to src/art/units/sheets.json.

const fs = require('fs');
const path = require('path');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const ASSETS = process.env.ASSETS || path.join(__dirname, '../../chronos-assets');
const OUT = path.join(__dirname, '../src/art/units');
const ROW = 2;
// poses (columns): stand, two steps, the arm raised, the lunge, two casting poses and the kneel
const MELEE = { walk: [1, 0, 2, 0], attack: [3, 4], idle: [0], hurt: [7], dead: [7] };
const CASTER = { ...MELEE, attack2: [5, 6] };
const ROWS = ['walk', 'attack', 'idle', 'hurt', 'dead', 'attack2', 'defend'];
// a hero's sheet: its layers, bottom first
const hk = (id, poses, layers) => ({ id, poses, layers });
const SPECS = [
  hk('cls_paladin_1', MELEE, ['Template_Male.png', 'Paladin_01_Initiate_Male.png', 'Paladin_top_male.png', 'Shield/Shield_HeaterSm_Male.png', 'Sword_01_Arming_Male.png']),
  hk('cls_paladin_2', MELEE, ['Template_Male.png', 'Paladin_03_Crusader_Male.png', 'Paladin_top_male.png', 'Shield/Shield_05_Guardian_Male.png', 'Sword_02_Broad_Male.png']),
  hk('cls_paladin_3', MELEE, ['Template_Male.png', 'Paladin_06_Divine_Male.png', 'Paladin_top_male.png', 'Helm/Helm_Armet_Male.png', 'Shield/Shield_06_SunCrest_Male.png', 'Sword_05_Mithril_Male.png']),
  hk('cls_cleric_1', CASTER, ['Template_Male.png', 'Cleric_01_Initiate_Male.png', 'Cleric_01_Initiate_Male_Top.png', 'Hammer_01_Mace_Male.png']),
  hk('cls_cleric_2', CASTER, ['Template_Male.png', 'Cleric_03_Disciple_Male.png', 'Cleric_03_Disciple_Male_Top.png', 'Staff_03_OliveBlessed_Male.png']),
  hk('cls_cleric_3', CASTER, ['Template_Male.png', 'Cleric_06_Holy_Male.png', 'Cleric_06_Holy_Male_Top.png', 'Helm/Helm_Miter_Male.png', 'Staff_05_Radiant_Male.png']),
  hk('cls_druid_1', CASTER, ['Template_Female_Tan.png', 'Druid_01_Forest_Female.png', 'Staff_Gnarled_Female.png']),
  hk('cls_druid_2', CASTER, ['Template_Female_Tan.png', 'Druid_04_Lunar_Female.png', 'Helm/Helm_AntlerCrown_Female.png', 'Staff_GnarledVenerable_Female.png']),
  hk('cls_druid_3', CASTER, ['Template_Female_Tan.png', 'Druid_06_Living_Female.png', 'Helm/Helm_AntlerCrown_Female.png', 'Staff_GnarledVenerable_Female.png']),
  hk('cls_barbarian_1', MELEE, ['Template_Male_Tan.png', 'Barbarian_01_Nomad_Male.png', 'Axe_01_Handaxe_Male.png']),
  hk('cls_barbarian_2', MELEE, ['Template_Male_Tan.png', 'Barbarian_03_Raider_Male.png', 'Barbarian_03_Raider_Male_Top.png', 'Axe_02_Obsidian_Male.png']),
  hk('cls_barbarian_3', MELEE, ['Template_Male_Tan.png', 'Barbarian_06_Raging_Male.png', 'Barbarian_06_Raging_Male_Top.png', 'Helm/Helm_Horned_Male.png', 'Greataxe_06_Executioner_Male.png']),
  hk('cls_ranger_1', MELEE, ['Template_Female.png', 'Ranger_01_Vest_Female.png', 'Bow_01_Short_Female.png']),
  hk('cls_ranger_2', MELEE, ['Template_Female.png', 'Ranger_03_RangerGear_Female.png', 'Helm/Helm_HoodGreen_Female.png', 'Bow_04_Ranger_Female.png']),
  hk('cls_ranger_3', MELEE, ['Template_Female.png', 'Ranger_06_ForestLord_Female.png', 'Helm/Helm_HoodGreen_Female.png', 'Bow_05_ForestMaster_Female.png']),
  hk('cls_warlock_1', CASTER, ['Template_Male_Dark.png', 'Warlock_01_Velvet_Male.png', 'Wand_03_Thorn_Male.png']),
  hk('cls_warlock_2', CASTER, ['Template_Male_Dark.png', 'Warlock_03_Starry_Male.png', 'Helm/Helm_CultistHood_Male.png', 'Wand_04_Bone_Male.png']),
  hk('cls_warlock_3', CASTER, ['Template_Male_Dark.png', 'Warlock_06_Demonlord_Male.png', 'Warlock_06_Demonlord_Male_top.png', 'Helm/Helm_Horned_Male.png', 'Wand_05_Starfire_Male.png']),
  hk('cls_illusionist_1', CASTER, ['Template_Female_Dark.png', 'Illusion_01_Waistcoat_Female.png', 'Wand_01_Oak_Female.png']),
  hk('cls_illusionist_2', CASTER, ['Template_Female_Dark.png', 'Illusion_03_Tuxedo_Female.png', 'Helm/Helm_TopHat_Female.png', 'Wand_02_Yew_Female.png']),
  hk('cls_illusionist_3', CASTER, ['Template_Female_Dark.png', 'Illusion_06_Misdirection_Female.png', 'Helm/Helm_Domino_Female.png', 'Helm/Helm_TopHat_Female.png', 'Wand_05_Starfire_Female.png']),
  hk('cls_gunslinger_1', MELEE, ['Template_Male_Tan.png', 'Gun_01_Vest_Male.png', 'Pistol_02_Flintlock_Male.png']),
  hk('cls_gunslinger_2', MELEE, ['Template_Male_Tan.png', 'Gun_03_Gear_Male.png', 'Helm/Helm_Gunslinger_Male.png', 'Gun_03_Arquebus_Male.png']),
  hk('cls_gunslinger_3', MELEE, ['Template_Male_Tan.png', 'Gun_06_Royal_Male.png', 'Helm/Helm_MusketeerHat_Male.png', 'Gun_06_ShoulderCannon_Male.png']),
  // the Druid's treant: one still picture from the golems pack (it stands and sways in the game)
  { id: 'cls_treant', still: 'Golems and elementals (pack by batareya)/21.png' },
];
const only = process.argv.slice(2);
const b64 = (f) => {
  const file = path.join(ASSETS, f);
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
  return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
};

(async () => {
  const manifestPath = path.join(OUT, 'sheets.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  for (const spec of SPECS) {
    if (only.length && !only.includes(spec.id)) continue;
    const job = spec.still ? { still: b64(spec.still) } : { layers: spec.layers.map(b64), poses: spec.poses };
    const out = await page.evaluate(
      async ({ job, ROWS, ROW }) => {
        const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
        const frames = {};
        if (job.still) {
          const im = await load(job.still);
          const c = document.createElement('canvas');
          c.width = im.width;
          c.height = im.height;
          c.getContext('2d').drawImage(im, 0, 0);
          frames.idle = [c];
        } else {
          const ims = [];
          for (const u of job.layers) ims.push(await load(u));
          for (const r of ROWS) {
            if (!job.poses[r]) continue;
            frames[r] = job.poses[r].map((col) => {
              const c = document.createElement('canvas');
              c.width = c.height = 128;
              const g = c.getContext('2d');
              g.imageSmoothingEnabled = false;
              for (const im of ims) g.drawImage(im, col * 128, ROW * 128, 128, 128, 0, 0, 128, 128);
              return c;
            });
          }
        }
        // the union of the opaque pixels, centred on the idle frame's weight, so the figure stays put as it swings
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (const r of Object.keys(frames))
          for (const c of frames[r]) {
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            for (let y = 0; y < c.height; y++)
              for (let x = 0; x < c.width; x++)
                if (d[(y * c.width + x) * 4 + 3] > 24) (x < x0 && (x0 = x)), (x > x1 && (x1 = x)), (y < y0 && (y0 = y)), (y > y1 && (y1 = y));
          }
        const idle = frames.idle[0];
        const d = idle.getContext('2d').getImageData(0, 0, idle.width, idle.height).data;
        let sum = 0, mass = 0, top = 1e9, foot = -1;
        for (let y = 0; y < idle.height; y++)
          for (let x = 0; x < idle.width; x++) {
            const a = d[(y * idle.width + x) * 4 + 3];
            if (a > 24) (sum += x * a), (mass += a), (y < top && (top = y)), (y > foot && (foot = y));
          }
        const cx = Math.round(sum / Math.max(1, mass));
        const half = Math.max(cx - x0, x1 - cx) + 1;
        const fw = half * 2;
        const fh = y1 - y0 + 2;
        const perRow = Math.max(...Object.values(frames).map((l) => l.length));
        const order = ROWS.filter((r) => frames[r]);
        const sheet = document.createElement('canvas');
        sheet.width = fw * perRow;
        sheet.height = fh * order.length;
        const g = sheet.getContext('2d');
        order.forEach((r, ri) => frames[r].forEach((c, i) => g.drawImage(c, cx - half, y0, fw, fh, i * fw, ri * fh, fw, fh)));
        const counts = Object.fromEntries(order.map((r) => [r, frames[r].length]));
        return { png: sheet.toDataURL('image/png'), w: fw, h: fh, perRow, rows: order, counts, figure: foot - top + 1 };
      },
      { job, ROWS, ROW },
    );
    fs.writeFileSync(path.join(OUT, spec.id + '.png'), Buffer.from(out.png.split(',')[1], 'base64'));
    manifest[spec.id] = { w: out.w, h: out.h, perRow: out.perRow, rows: out.rows, counts: out.counts, figure: out.figure, facesRight: true };
    console.log(spec.id, `${out.w}x${out.h}`, 'figure', out.figure);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  await browser.close();
})();
