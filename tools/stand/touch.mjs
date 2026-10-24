// A check of the Last Stand's touch: pick and drag a hero, pan, pinch (synthetic pointer events on the page's input layer).
import { serve, launch, boot, enter } from './lib.mjs';
const server = serve();
const browser = await launch();
const { page, errors } = await boot(browser, 393, 852, 20, 8139, 3);
await enter(page);
const state = () => page.evaluate(() => { const st = window.__game.stand; const s = st.state; return { cx: Math.round(st.cx), cy: Math.round(st.cy), scale: st.tscale, posts: s.run.heroes.map((h) => h.post && h.post.join(',')), picked: st.picked, info: !document.querySelector('.stInfo').hidden }; });
const fire = (type, id, x, y) => page.evaluate(([type, id, x, y]) => { const e = new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: id === 1 }); document.querySelector('.stInput').dispatchEvent(e); }, [type, id, x, y]);
const heroXY = () => page.evaluate(() => { const st = window.__game.stand; const s = st.state; const u = s.b.units.find((u) => u.def === 'knight'); const sp = st.sprites.get(u.id); return [sp.x * st.world.scale.x + st.world.x, (sp.y - sp.tall / 2) * st.world.scale.y + st.world.y]; });
console.log('start', JSON.stringify(await state()));
let [hx, hy] = await heroXY();
await fire('pointerdown', 1, hx, hy); await fire('pointerup', 1, hx, hy);
console.log('tapped hero', JSON.stringify(await state()));
// tap a tile to move the picked hero
await fire('pointerdown', 1, hx + 70, hy + 60); await fire('pointerup', 1, hx + 70, hy + 60);
console.log('tapped tile', JSON.stringify(await state()));
[hx, hy] = await heroXY();
await fire('pointerdown', 1, hx, hy); await fire('pointermove', 1, hx - 40, hy + 20); await fire('pointermove', 1, hx - 80, hy + 40); await fire('pointerup', 1, hx - 80, hy + 40);
console.log('dragged hero', JSON.stringify(await state()));
await fire('pointerdown', 1, 330, 480); await fire('pointermove', 1, 230, 430); await fire('pointermove', 1, 190, 400); await fire('pointerup', 1, 190, 400);
console.log('panned', JSON.stringify(await state()));
await fire('pointerdown', 1, 150, 400); await fire('pointerdown', 2, 250, 400); await fire('pointermove', 2, 330, 400); await fire('pointerup', 2, 330, 400); await fire('pointerup', 1, 150, 400);
console.log('pinched', JSON.stringify(await state()));
await page.screenshot({ path: 'out/shots/stand-touch.png' });
console.log('errors', errors);
await browser.close();
server.close();
