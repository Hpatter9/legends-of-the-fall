// Controlled fixtures for the shipping quest card and log; excluded from game.js.
import { openGiverCard, closeGiverCard } from '../../src/questCard';
import { drawQuestLog } from '../../src/questLog';
import { startedMeta } from '../../src/sim/meta';
import { QUESTS } from '../../src/sim/questData';
import { blankQuests } from '../../src/sim/quests';
import { FACES } from '../../src/questArt';
const ids = ['oswy', 'teal', 'pim', 'widow', 'sorrel', 'shepherd', 'gaoler', 'smith', 'sexton', 'pawnbroker', 'lantern', 'herald', 'clock', 'falconer', 'archivist'];
const m = startedMeta(7);
m.quests = blankQuests();
m.quests.offers = ids.map(giver => ({ id: QUESTS.find(q => q.giver === giver)!.id, giver, day: 20261107 }));
(window as any).__questPortraits = {
  ids,
  distinct: new Set(ids.map(id => FACES[id as keyof typeof FACES])).size,
  card(id: string) {
    document.querySelector('#portraitLog')?.remove();
    const home = document.getElementById('home')!;
    home.hidden = false;
    openGiverCard(m, id, { changed() {}, openLog() {} });
  },
  log() {
    closeGiverCard();
    document.querySelector('#portraitLog')?.remove();
    const box = document.createElement('div');
    box.id = 'portraitLog';
    document.body.append(box);
    drawQuestLog(box, m, 'board', { close() {}, changed() {} });
    Object.assign(box.style, { position: 'fixed', inset: '0', zIndex: '99999', maxHeight: '100dvh' });
  },
};
