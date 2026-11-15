// Controlled previews of the shipping menus for docs/notes/art-wire-5.md; never saved or included in game.js.
import { meta as warMeta } from '../nemesis/saves3';
import { openNemesisBoard, openNemesisCard } from '../../src/nemesisView';
import { NEMESIS_TRAIT_ICON } from '../../src/nemesisTraitArt';
import { NEWS_ICON } from '../../src/councilArt';
import { drawEquipment } from '../../src/equipView';
import { TauntCuts } from '../../src/tauntCut';
import { loadSheets } from '../../src/render/sheets';
import { newsWord } from '../../src/sim/council';
import type { NewsKind } from '../../src/sim/nemesis';
const war = warMeta();
const date = new Date();
const day = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
// (every News kind once, and the seats' scars one to three, so each frame shows)
const kinds = Object.keys(NEWS_ICON) as NewsKind[];
war.war!.news = kinds.map((kind, i) => ({ kind, turn: 48 - i, text: war.war!.news.find((n) => n.kind === kind)?.text ?? `${newsWord(kind)} is recorded in the Council's ledger.` }));
war.war!.members.forEach((n, i) => (n.scars = i % 4));
const known = Object.keys(NEMESIS_TRAIT_ICON).filter((k) => !k.includes(':') && !['fireproof', 'rime', 'venom', 'thick', 'grounded', 'fearless', 'elusive'].includes(k));
let cuts: TauntCuts | null = null;
const clean = () => {
  cuts?.clear();
  document.querySelectorAll('.omVeil').forEach((e) => e.dispatchEvent(new Event('omclose')));
  document.querySelector('#awGear')?.remove();
};
(window as any).__artWire5 = {
  ready: loadSheets(),
  board(tab: 'news' | 'spoils' | 'council') { clean(); openNemesisBoard(war, { hunt() {}, save() {}, day }, tab); },
  traits(group: number) {
    clean();
    const n = { ...war.war!.members[0], scars: group + 1, traits: known.slice(group * 3, group * 3 + 3), weak: [], known: known.slice(group * 3, group * 3 + 3) };
    openNemesisCard(war, n);
  },
  taunt(scars: number) {
    clean();
    cuts ??= new TauntCuts();
    const n = war.war!.members[1];
    cuts.add([{ id: n.id, base: n.base, name: n.name, rank: n.rank, might: n.might, scars, trigger: 'meet', line: 'Your blood will water my banner.', first: true, vain: false }], 'full');
    cuts.frame(16, false);
  },
  gear() {
    clean();
    const box = document.createElement('div');
    box.id = 'awGear';
    Object.assign(box.style, { position: 'fixed', inset: '0', zIndex: '99999', overflow: 'auto', background: '#14110f', padding: '12px' });
    box.append(drawEquipment(war, 'knight'));
    document.body.append(box);
    (box.querySelector('.eqSlot.at-main') as HTMLElement).click();
  },
};
