// INT-386: opens each of the ten dialogs of PR #386 on its own over the built page, for screenshots (tools/int-386/shots.mjs).
// Bundled by the shot script against whichever tree is being shot (main, the PR, the integration), so it uses only exports all three have.
import { askAuto } from '../../src/autoAsk';
import { showAltarHelp } from '../../src/altarHelp';
import { showBuilt } from '../../src/builtCard';
import { openRelicCard } from '../../src/relicCard';
import { openTomeSheet } from '../../src/tomeView';
import { drawTalents } from '../../src/talentView';
import { openStall } from '../../src/stallView';
import { openUpgrades } from '../../src/rankUpList';
import { openHeroArtwork } from '../../src/heroArtwork';
import { UnitInfoCard } from '../../src/unitInfo';
import { portrait } from '../../src/render/sheets';
import { UNITS } from '../../src/sim/units';

const meta = () => (window as any).__game.meta;
const host = (cls: string): HTMLElement => {
  const h = document.createElement('div');
  h.className = cls;
  h.style.cssText = 'position:fixed;inset:0;z-index:80';
  document.body.append(h);
  return h;
};

(window as any).__int386 = {
  autoAsk: () => askAuto(meta(), 'The Orc Warband · Tale 3', () => {}),
  talents: () => {
    const h = host('int386Talents');
    h.style.background = '#111';
    h.append(drawTalents(meta(), 'knight', () => {}, true));
    (h.querySelector('.tNode.available, .tNode') as HTMLElement)?.click();
  },
  unitInfo: () => {
    const card = new UnitInfoCard();
    card.open({
      kind: 'hero', sheet: UNITS.knight.sheet, name: 'Knight', title: 'Shield of the Dawn', sub: 'Hero · Guardian', level: 32, grade: 3, awaken: 1,
      hp: '1978/1978', hpShare: 1, stats: [['Attack', '84'], ['Armour', '22'], ['Speed', '1.0'], ['Range', '1']],
      traits: [{ name: 'Bulwark', text: 'takes 15% less damage from the front' }], gear: ['Iron sword (Lv 12)', 'Tower shield (Lv 10)'],
      moves: [{ label: 'Skill', name: 'Shield Bash', text: 'Stuns the foe in front for 1.5 s.', rows: [['Charge', '6 hits']], tiers: [], locked: false } as any],
      phase: [], tips: [], lore: 'A knight of the old keep.',
    } as any, portrait(UNITS.knight.sheet, 48));
  },
  tome: () => openTomeSheet(meta(), 'knight', () => {}),
  relic: () => openRelicCard({ relics: ['phoenix', 'luckyCoin'], gold: 120 }, 'phoenix'),
  stall: () => {
    openStall(meta(), () => {}, 'books');
    setTimeout(() => (document.querySelector('#stall .hsWare, #stall [class*="hsCard"], #stall .hsGrid > *') as HTMLElement)?.click(), 300);
  },
  altar: () => showAltarHelp(host('riftAltar')),
  built: () => showBuilt('treasury' as any, 3),
  upgrades: () => {
    openUpgrades(meta(), meta().unlocked, () => {}, () => {}, () => {});
    setTimeout(() => (document.querySelector('.ulAll:not(:disabled)') as HTMLElement ?? document.querySelector('.ulAuto') as HTMLElement)?.click(), 300);
  },
  artwork: () => openHeroArtwork('knight', document.body),
};
