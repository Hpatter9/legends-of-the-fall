// Controlled fixtures using shipping menus. Excluded from game.js and never saved.
import { meta } from '../nemesis/saves3';
import { openNemesisBoard } from '../../src/nemesisView';
import { NEWS_ICON, TROPHY_ICON } from '../../src/councilArt';
import { openGiverCard, closeGiverCard } from '../../src/questCard';
import { drawQuestLog } from '../../src/questLog';
import { QUESTS } from '../../src/sim/questData';
import { blankQuests } from '../../src/sim/quests';
import { newsWord } from '../../src/sim/council';
import type { NewsKind } from '../../src/sim/nemesis';
const m = meta();
const kinds = Object.keys(NEWS_ICON) as NewsKind[];
const examples: Partial<Record<NewsKind, string>> = {
  recruit: 'A new lieutenant takes a seat in the Dark Council.',
  promotion: 'A lieutenant rises to the rank of captain.',
  feast: 'The captains hold a feast beneath their war banners.',
  oath: 'Two rivals swear a blood-oath before the Council.',
  muster: 'The Warchief calls the captains to the Muster.',
};
m.war!.news = kinds.map((kind,i) => ({ kind, turn: 48-i, text: examples[kind] ?? m.war!.news.find(n => n.kind === kind)?.text ?? `${newsWord(kind)} is recorded in the Council's ledger.` }));
m.quests = blankQuests();
const q = QUESTS.find(q => q.giver === 'lost' && !q.hero)!;
m.quests.offers = [{id:q.id,giver:'lost',day:20261108}];
const clean = () => {
  closeGiverCard();
  document.querySelector('#nemesisBoard')?.dispatchEvent(new Event('omclose'));
  document.querySelector('#manuscriptLog')?.remove();
};
(window as any).__councilArt = {
  kinds,
  sources: NEWS_ICON,
  trophy: TROPHY_ICON,
  board(tab: 'news' | 'spoils' | 'council') {
    clean();
    openNemesisBoard(m, {hunt() {}, save() {}, day:20261108},tab);
  },
  manuscript(log = false) {
    clean();
    document.getElementById('home')!.hidden = false;
    if (!log) openGiverCard(m,'lost',{changed() {},openLog() {}});
    else {
      const box=document.createElement('div');
      box.id='manuscriptLog';
      document.body.append(box);
      drawQuestLog(box,m,'board',{close() {},changed() {}});
      Object.assign(box.style,{position:'fixed',inset:'0',zIndex:'99999',maxHeight:'100dvh'});
    }
  },
};
